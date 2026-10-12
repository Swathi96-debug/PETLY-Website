import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import generateToken from './utils/generateToken.js';
import { cognitoConfig, isCognitoConfigured } from './config/cognito.js';
import { getCognitoJwks, verifyCognitoToken, resolveMongoUserFromCognitoPayload } from './utils/cognitoVerifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const runPhase9BTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 9B COGNITO AUTH INTEGRATION TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[1/9] Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri);
    console.log(`✅ Connected successfully to Host: ${conn.connection.host} | Database: ${conn.connection.name}`);

    // 2. Verify Cognito Configuration & JWKS Connectivity
    console.log('\n[2/9] Verifying Cognito Configuration & Live JWKS Endpoint...');
    if (!isCognitoConfigured()) {
      throw new Error('Cognito configuration missing in server/.env');
    }
    console.log(`📌 User Pool ID: ${cognitoConfig.maskedUserPoolId}`);
    console.log(`📌 Client ID: ${cognitoConfig.maskedClientId}`);

    const jwks = await getCognitoJwks();
    if (!jwks || !jwks.keys || jwks.keys.length === 0) {
      throw new Error('Could not fetch Cognito JWKS keys.');
    }
    console.log(`✅ Cognito JWKS fetched successfully! Public keys count: ${jwks.keys.length}: PASS`);

    // 3. Verify Cognito sub -> MongoDB User Linking & Preservation of User._id
    console.log('\n[3/9] Verifying Cognito sub -> MongoDB User linking and _id preservation...');
    const timestamp = Date.now();
    const existingLegacyUser = await User.create({
      fullName: 'Dr. Sarah Smith',
      email: `sarah_legacy_${timestamp}@petly.com`,
      phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'ExistingSecurePassword123!',
      role: 'shelter',
      bio: 'Lifelong animal rescue coordinator',
    });
    createdUserIds.push(existingLegacyUser._id);
    const originalId = existingLegacyUser._id.toString();

    // Simulate Cognito authenticated token payload with verified email
    const cognitoSub1 = `c09n1t0-sub-test-${timestamp}-1`;
    const verifiedEmailPayload = {
      sub: cognitoSub1,
      email: existingLegacyUser.email,
      email_verified: true,
      name: 'Dr. Sarah Smith',
      token_use: 'id',
    };

    const linkedUser = await resolveMongoUserFromCognitoPayload(verifiedEmailPayload);
    console.log(`✅ User linked successfully.`);
    console.log(`   Original MongoDB _id: ${originalId}`);
    console.log(`   Resolved MongoDB _id: ${linkedUser._id.toString()}`);
    console.log(`   cognitoSub: ${linkedUser.cognitoSub}`);

    if (linkedUser._id.toString() !== originalId) {
      throw new Error(`CRITICAL: MongoDB User._id was altered during Cognito linking!`);
    }
    if (linkedUser.role !== 'shelter' || linkedUser.bio !== 'Lifelong animal rescue coordinator') {
      throw new Error(`CRITICAL: User attributes were lost during Cognito linking!`);
    }
    console.log('✅ User._id and all existing profile fields preserved: PASS');

    // 4. Verify Duplicate cognitoSub Prevention
    console.log('\n[4/9] Verifying duplicate cognitoSub rejection...');
    let duplicateRejected = false;
    try {
      await User.create({
        fullName: 'Impersonator',
        email: `impersonator_${timestamp}@petly.com`,
        password: 'Password123!',
        cognitoSub: cognitoSub1, // Trying to steal sub1
      });
    } catch (err) {
      if (err.code === 11000 || err.message.includes('duplicate key')) {
        duplicateRejected = true;
      }
    }
    console.log(`✅ Duplicate cognitoSub rejected by database constraint: ${duplicateRejected ? 'PASS' : 'FAIL'}`);
    if (!duplicateRejected) throw new Error('Duplicate cognitoSub was allowed!');

    // 5. Verify Unverified Email / Phone Linking Rejection
    console.log('\n[5/9] Verifying unverified email/phone linking rejection...');
    const unverifiedSub = `c09n1t0-unverified-${timestamp}`;
    const unverifiedPayload = {
      sub: unverifiedSub,
      email: existingLegacyUser.email,
      email_verified: false, // Unverified!
      token_use: 'id',
    };

    let unverifiedRejected = false;
    try {
      await resolveMongoUserFromCognitoPayload(unverifiedPayload);
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('not verified in Cognito')) {
        unverifiedRejected = true;
      }
    }
    console.log(`✅ Unverified email was rejected from hijacking existing user: ${unverifiedRejected ? 'PASS' : 'FAIL'}`);
    if (!unverifiedRejected) {
      throw new Error('SECURITY VIOLATION: Unverified email was not rejected!');
    }

    // 6. Verify Identity Conflict Detection (Verified Email vs Verified Phone)
    console.log('\n[6/9] Verifying identity conflict detection (email vs phone pointing to different users)...');
    const userA = await User.create({
      fullName: 'User Alpha',
      email: `alpha_${timestamp}@petly.com`,
      phone: `+9191111${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password123!',
    });
    createdUserIds.push(userA._id);

    const userB = await User.create({
      fullName: 'User Beta',
      email: `beta_${timestamp}@petly.com`,
      phone: `+9192222${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password123!',
    });
    createdUserIds.push(userB._id);

    const conflictingPayload = {
      sub: `c09n1t0-conflict-${timestamp}`,
      email: userA.email,
      email_verified: true,
      phone_number: userB.phone, // Belongs to user B!
      phone_number_verified: true,
      token_use: 'id',
    };

    let conflictCaught = false;
    try {
      await resolveMongoUserFromCognitoPayload(conflictingPayload);
    } catch (err) {
      if (err.statusCode === 409 || err.message.includes('Identity conflict')) {
        conflictCaught = true;
      }
    }
    console.log(`✅ Identity conflict between verified email and phone detected & rejected: ${conflictCaught ? 'PASS' : 'FAIL'}`);
    if (!conflictCaught) throw new Error('Identity conflict was not rejected!');

    // 7. Verify Invalid Token Rejection
    console.log('\n[7/9] Verifying invalid Cognito token rejection...');
    const fakeToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImZha2UifQ.eyJzdWIiOiIxMjM0NSIsImlzcyI6Imh0dHBzOi8vZmFrZS5jb20ifQ.ZmFrZXNpZ25hdHVyZQ';
    let fakeRejected = false;
    try {
      await verifyCognitoToken(fakeToken);
    } catch (err) {
      fakeRejected = true;
    }
    console.log(`✅ Invalid / forged token rejection: ${fakeRejected ? 'PASS' : 'FAIL'}`);
    if (!fakeRejected) throw new Error('Forged token was accepted!');

    // 8. Verify Legacy JWT Authentication Regression
    console.log('\n[8/9] Verifying legacy JWT regression compatibility...');
    const legacyToken = generateToken(existingLegacyUser._id);
    const decoded = jwtDecode(legacyToken);
    if (decoded.id !== existingLegacyUser._id.toString()) {
      throw new Error('Legacy token payload does not match User._id');
    }
    console.log(`✅ Legacy JWT issued and verified with User._id payload: PASS`);

    // 9. Verify Cognito Password Flow Separation (Legacy Password Integrity)
    console.log('\n[9/9] Verifying Cognito password flow separation & legacy password preservation...');
    const reloadedLegacyUser = await User.findById(existingLegacyUser._id).select('+password');
    const isOriginalPasswordMatch = await reloadedLegacyUser.matchPassword('ExistingSecurePassword123!');
    if (!isOriginalPasswordMatch) {
      throw new Error('CRITICAL: Legacy password hash in MongoDB was corrupted or altered!');
    }
    console.log('✅ Legacy MongoDB bcrypt password hash is completely preserved and unaffected: PASS');

    // Cleanup
    console.log('\nCleaning up test records from MongoDB Atlas...');
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(`🧹 Deleted ${createdUserIds.length} test records: PASS`);

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 9B COGNITO INTEGRATION TESTS PASSED!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ Phase 9B Test Suite Failed:', error);
    if (createdUserIds.length > 0) {
      try {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        console.log('🧹 Cleaned up temporary test records.');
      } catch {}
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

const jwtDecode = (token) => {
  const parts = token.split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
};

runPhase9BTests();
