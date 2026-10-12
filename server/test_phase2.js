import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import generateToken from './utils/generateToken.js';
import uploadRoutes from './routes/uploadRoutes.js';
import {
  generateS3Key,
  sanitizeFilename,
  isValidCategory,
  verifyKeyOwnership,
  CATEGORY_PREFIX_MAP,
  uploadToS3,
  generatePresignedUrl,
  deleteS3Object,
} from './utils/s3Uploader.js';
import { isS3Configured, getBucketName } from './config/s3.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase2Tests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 2 AWS S3 FILE UPLOAD TEST SUITE');
  console.log('====================================================');

  const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v] || process.env[v].trim() === '');

  // 1. Check AWS Environment Variables
  console.log('\n[1/10] Verifying AWS S3 Environment Configuration...');
  console.log(`  - AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  console.log(`  - AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || 'NOT SET'}`);
  console.log(`  - AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured (***)' : 'EMPTY / NOT SET'}`);
  console.log(`  - AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Configured (***)' : 'EMPTY / NOT SET'}`);

  const s3Ready = missingEnvVars.length === 0;
  if (s3Ready) {
    console.log('  ✅ AWS S3 Environment Variables: FULLY CONFIGURED');
  } else {
    console.log(`  ⚠️  AWS S3 Variables Pending: [${missingEnvVars.join(', ')}]`);
    console.log('  ℹ️  Live S3 upload/delete requires setting these in server/.env.');
    console.log('  ℹ️  All validation, security, category, auth, ownership, and key generation tests will still run.');
  }

  // Connect to MongoDB Atlas to create test users
  console.log('\n[2/10] Connecting to Database for Auth Verification...');
  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);
  console.log('  ✅ Connected to MongoDB Atlas');

  // Create two test users for ownership verification
  const timestamp = Date.now();
  const testUserA = await User.create({
    fullName: 'Upload Tester User A',
    email: `upload_test_a_${timestamp}@petly.com`,
    password: 'Password123!',
    role: 'user',
  });
  const tokenA = generateToken(testUserA._id);

  const testUserB = await User.create({
    fullName: 'Upload Tester User B',
    email: `upload_test_b_${timestamp}@petly.com`,
    password: 'Password123!',
    role: 'user',
  });
  const tokenB = generateToken(testUserB._id);

  console.log(`  ✅ Created Test User A (${testUserA._id}) and Test User B (${testUserB._id})`);

  // Start temporary Express test server
  const app = express();
  app.use(express.json());
  app.use('/api/uploads', uploadRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/uploads`;
  console.log(`  ✅ Temporary Test Server running on port ${port}`);

  let allPassed = true;

  try {
    // 3. Test Authentication Enforcement
    console.log('\n[3/10] Testing Authentication Enforcement on /api/uploads...');
    const unauthUploadRes = await fetch(baseUrl, {
      method: 'POST',
      body: new FormData(), // No auth header
    });
    const unauthUploadData = await unauthUploadRes.json();
    const isUnauthBlocked = unauthUploadRes.status === 401 && unauthUploadData.success === false;
    console.log(`  - Upload without Bearer token returns 401: ${isUnauthBlocked ? 'PASS' : 'FAIL'}`);
    if (!isUnauthBlocked) allPassed = false;

    const unauthDeleteRes = await fetch(baseUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'pets/someuser/test.png' }),
    });
    const isUnauthDeleteBlocked = unauthDeleteRes.status === 401;
    console.log(`  - Delete without Bearer token returns 401: ${isUnauthDeleteBlocked ? 'PASS' : 'FAIL'}`);
    if (!isUnauthDeleteBlocked) allPassed = false;

    // 4. Test Category Whitelist & Path Traversal Prevention
    console.log('\n[4/10] Testing Category Whitelist & Path Traversal Prevention...');
    const validCats = Object.keys(CATEGORY_PREFIX_MAP);
    console.log(`  - Allowed Categories: [${validCats.join(', ')}]`);

    const invalidCatCheck = !isValidCategory('arbitrary_folder') && !isValidCategory('../../etc') && !isValidCategory('');
    console.log(`  - Rejection of invalid categories: ${invalidCatCheck ? 'PASS' : 'FAIL'}`);
    if (!invalidCatCheck) allPassed = false;

    // Attempt upload with invalid category via API
    const invalidCatForm = new FormData();
    const dummyPng = new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' });
    invalidCatForm.append('file', dummyPng, 'sample.png');
    invalidCatForm.append('type', 'malicious/traversal');

    const invalidCatRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: invalidCatForm,
    });
    const invalidCatData = await invalidCatRes.json();
    // Should be 400 Bad Request (or 503 if S3 unconfigured)
    const isInvalidCatBlocked = invalidCatRes.status === 400 || (invalidCatRes.status === 503 && !s3Ready);
    console.log(`  - API blocked invalid category request: ${isInvalidCatBlocked ? 'PASS' : 'FAIL'} (${invalidCatRes.status})`);
    if (!isInvalidCatBlocked) allPassed = false;

    // 5. Test File Type Validation (MIME Filter)
    console.log('\n[5/10] Testing File Type Validation (MIME Filtering)...');
    const badTypeForm = new FormData();
    const fakeExe = new Blob([Buffer.from('MZ...fake executable content')], { type: 'application/x-msdownload' });
    badTypeForm.append('file', fakeExe, 'virus.exe');
    badTypeForm.append('type', 'pet');

    const badTypeRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: badTypeForm,
    });
    const badTypeData = await badTypeRes.json();
    const isBadTypeBlocked = badTypeRes.status === 400 && badTypeData.message.includes('Unsupported file type');
    console.log(`  - Rejection of executable/unsupported MIME (.exe): ${isBadTypeBlocked ? 'PASS' : 'FAIL'}`);
    if (!isBadTypeBlocked) allPassed = false;

    // 6. Test File Size Limits & Empty File Handling
    console.log('\n[6/10] Testing File Size Limits & Empty File Handling...');
    const emptyForm = new FormData();
    const emptyBlob = new Blob([], { type: 'image/png' });
    emptyForm.append('file', emptyBlob, 'empty.png');
    emptyForm.append('type', 'avatar');

    const emptyRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: emptyForm,
    });
    const emptyData = await emptyRes.json();
    const isEmptyBlocked = emptyRes.status === 400;
    console.log(`  - Rejection of empty file (0 bytes): ${isEmptyBlocked ? 'PASS' : 'FAIL'}`);
    if (!isEmptyBlocked) allPassed = false;

    // Test oversized image (>5MB)
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
    const oversizedForm = new FormData();
    oversizedForm.append('file', new Blob([oversizedBuffer], { type: 'image/jpeg' }), 'huge.jpg');
    oversizedForm.append('type', 'pet');

    const oversizedRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: oversizedForm,
    });
    const oversizedData = await oversizedRes.json();
    const isOversizedBlocked = oversizedRes.status === 400 && oversizedData.message.includes('exceeds the 5 MB limit');
    console.log(`  - Rejection of oversized image (>5MB): ${isOversizedBlocked ? 'PASS' : 'FAIL'}`);
    if (!isOversizedBlocked) allPassed = false;

    // 7. Test S3 Object Key Generation & Sanitization
    console.log('\n[7/10] Testing S3 Key Generation & Path Sanitization...');
    const testKey = generateS3Key({
      category: 'pet',
      userId: testUserA._id.toString(),
      originalName: '../../Secret Folder/My Puppy (Photo)!?.png',
    });
    console.log(`  - Generated Key: ${testKey}`);
    const keyStructureValid =
      testKey.startsWith(`pets/${testUserA._id.toString()}/`) &&
      !testKey.includes('..') &&
      !testKey.includes('Secret Folder') &&
      testKey.endsWith('.png');
    console.log(`  - Key structure matches 'pets/<userId>/<uuid>-<sanitized>.png': ${keyStructureValid ? 'PASS' : 'FAIL'}`);
    if (!keyStructureValid) allPassed = false;

    // 8. Test Ownership-Enforced Deletion
    console.log('\n[8/10] Testing Ownership Enforcement on Delete (/api/uploads)...');
    const userAKey = `pets/${testUserA._id.toString()}/12345-mycat.png`;
    const userBKey = `pets/${testUserB._id.toString()}/67890-doggo.png`;

    const userAOwnsHis = verifyKeyOwnership(userAKey, testUserA._id.toString(), 'user');
    const userBOwnsHis = verifyKeyOwnership(userBKey, testUserB._id.toString(), 'user');
    const userACannotAccessB = !verifyKeyOwnership(userBKey, testUserA._id.toString(), 'user');
    const adminCanAccessAll = verifyKeyOwnership(userAKey, 'anyAdminId', 'admin');

    console.log(`  - User A ownership of User A key: ${userAOwnsHis ? 'PASS' : 'FAIL'}`);
    console.log(`  - User B ownership of User B key: ${userBOwnsHis ? 'PASS' : 'FAIL'}`);
    console.log(`  - User A blocked from User B key (Cross-Tenant Prevention): ${userACannotAccessB ? 'PASS' : 'FAIL'}`);
    console.log(`  - Admin role has full access: ${adminCanAccessAll ? 'PASS' : 'FAIL'}`);

    // Verify via DELETE endpoint as User A targeting User B's key
    const crossDeleteRes = await fetch(baseUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ key: userBKey }),
    });
    const crossDeleteData = await crossDeleteRes.json();
    const isCrossDeleteForbidden = crossDeleteRes.status === 403;
    console.log(`  - API returns 403 Forbidden on unauthorized file deletion: ${isCrossDeleteForbidden ? 'PASS' : 'FAIL'}`);
    if (!isCrossDeleteForbidden) allPassed = false;

    // 9. Live S3 Upload, Presigned URL, and Delete (if configured) or Mock/Configuration Guard Verification
    console.log('\n[9/10] Testing S3 Storage Operations & Presigned URLs...');
    if (s3Ready) {
      console.log('  Testing live AWS S3 integration...');
      const validForm = new FormData();
      const tinyJpg = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])], {
        type: 'image/jpeg',
      });
      validForm.append('file', tinyJpg, 'test_pet.jpg');
      validForm.append('type', 'pet');

      const liveUploadRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: validForm,
      });
      const liveUploadData = await liveUploadRes.json();

      if (liveUploadRes.status === 201 && liveUploadData.success) {
        console.log(`  ✅ Live Upload Succeeded! Key: ${liveUploadData.file.key}`);
        console.log(`  - S3 Object URL: ${liveUploadData.file.url}`);

        // Test presigned URL generation
        const presignedRes = await fetch(`${baseUrl}/presigned-url?key=${encodeURIComponent(liveUploadData.file.key)}`, {
          headers: { Authorization: `Bearer ${tokenA}` },
        });
        const presignedData = await presignedRes.json();
        console.log(`  - Presigned URL Generated: ${presignedData.success ? 'PASS' : 'FAIL'}`);
        if (presignedData.presignedUrl) {
          console.log(`  - Signed URL begins with: ${presignedData.presignedUrl.substring(0, 50)}...`);
        }

        // Test Live Deletion
        const liveDeleteRes = await fetch(baseUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenA}`,
          },
          body: JSON.stringify({ key: liveUploadData.file.key }),
        });
        const liveDeleteData = await liveDeleteRes.json();
        console.log(`  - Live S3 Deletion: ${liveDeleteData.success ? 'PASS' : 'FAIL'}`);
      } else {
        console.log(`  ❌ Live Upload Failed (${liveUploadRes.status}): ${liveUploadData.message}`);
        allPassed = false;
      }
    } else {
      console.log('  ℹ️  AWS S3 is currently in template mode in server/.env.');
      // Verify graceful 503 response when S3 is called without credentials
      const validForm = new FormData();
      const tinyJpg = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])], {
        type: 'image/jpeg',
      });
      validForm.append('file', tinyJpg, 'test_pet.jpg');
      validForm.append('type', 'pet');

      const unconfiguredRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: validForm,
      });
      const unconfiguredData = await unconfiguredRes.json();
      const is503Handled = unconfiguredRes.status === 503 && unconfiguredData.message.includes('Cloud storage service is not configured');
      console.log(`  - Unconfigured AWS environment returns graceful HTTP 503: ${is503Handled ? 'PASS' : 'FAIL'}`);
      if (!is503Handled) allPassed = false;
    }

    // 10. Test Credential Privacy & Leak Prevention
    console.log('\n[10/10] Verifying No AWS Credentials Leaked in Responses...');
    const sensitiveStrings = [
      process.env.AWS_SECRET_ACCESS_KEY,
      process.env.AWS_ACCESS_KEY_ID,
      process.env.JWT_SECRET,
    ].filter(Boolean);

    let leaksFound = false;
    // Inspect invalid category response, empty response, unauth response
    const responsesToCheck = [
      JSON.stringify(unauthUploadData),
      JSON.stringify(invalidCatData),
      JSON.stringify(badTypeData),
      JSON.stringify(emptyData),
      JSON.stringify(crossDeleteData),
    ];

    for (const secret of sensitiveStrings) {
      for (const resText of responsesToCheck) {
        if (resText.includes(secret)) {
          leaksFound = true;
          break;
        }
      }
    }
    console.log(`  - No AWS Secret / Access Key leaked in API responses: ${!leaksFound ? 'PASS' : 'FAIL'}`);
    if (leaksFound) allPassed = false;

    // Cleanup test users from DB
    console.log('\n🧹 Cleaning up test users from database...');
    await User.findByIdAndDelete(testUserA._id);
    await User.findByIdAndDelete(testUserB._id);
    console.log('  ✅ Cleaned up test users');

    // Close server & Mongo connection
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();

    console.log('\n====================================================');
    if (allPassed) {
      console.log('🎉 ALL PHASE 2 SECURITY & UPLOAD SPECIFICATIONS PASSED!');
    } else {
      console.error('❌ SOME PHASE 2 TESTS FAILED.');
    }
    console.log('====================================================');

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Test Suite Aborted with Exception: ${error.message}`);
    console.error(error.stack);
    if (testUserA?._id) await User.findByIdAndDelete(testUserA._id).catch(() => {});
    if (testUserB?._id) await User.findByIdAndDelete(testUserB._id).catch(() => {});
    await mongoose.disconnect().catch(() => {});
    server.close();
    process.exit(1);
  }
};

runPhase2Tests();
