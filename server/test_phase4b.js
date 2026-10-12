import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import User from './models/User.js';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';
import MedicalDocument from './models/MedicalDocument.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase4BTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 4B HEALTH & MEDICAL DOCUMENTS TEST');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, desc) => {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  };

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
  }

  // 1. Connect to MongoDB
  console.log('[1/7] Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected');

  // 2. Setup Ephemeral Server with Auth, Pets, Health, and Documents routes
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/pets', petRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/documents', documentRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  - Test server mounted at ${baseUrl}\n`);

  const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const testStamp = Date.now();
  const userAEmail = `health_user_a_${testStamp}@petly.com`;
  const userBEmail = `health_user_b_${testStamp}@petly.com`;
  const password = 'StrongPassword123!';

  let tokenA = null;
  let tokenB = null;
  let userAId = null;
  let userBId = null;
  let petAId = null;
  let healthRecordId = null;
  let documentId = null;

  try {
    // 3. Create Test Users & Pet
    console.log('[2/7] Setting up Test Identities & Pet...');
    const signupA = await apiCall('/auth/signup', 'POST', {
      fullName: 'Health Test User A',
      email: userAEmail,
      password,
    });
    assert(signupA.status === 201, 'Created User A for Health tests');
    tokenA = signupA.data.token;
    userAId = signupA.data.user._id;

    const signupB = await apiCall('/auth/signup', 'POST', {
      fullName: 'Health Test User B',
      email: userBEmail,
      password,
    });
    assert(signupB.status === 201, 'Created User B for unauthorized cross-tenant checks');
    tokenB = signupB.data.token;
    userBId = signupB.data.user._id;

    const petRes = await apiCall(
      '/pets',
      'POST',
      {
        name: 'Apollo',
        species: 'Dog',
        breed: 'Husky',
        age: 3,
        gender: 'Male',
        weight: 24.5,
      },
      tokenA
    );
    assert(petRes.status === 201, 'Created Apollo (Pet for User A)');
    petAId = petRes.data.pet._id;

    // 4. Test Health Record Creation with Canonical Enums
    console.log('\n[3/7] Testing Health Record CREATE (Canonical Enums)...');
    
    // Test canonical types: weight, vaccination, medication, appointment
    const weightRec = await apiCall(
      '/health',
      'POST',
      {
        pet: petAId,
        type: 'weight',
        title: 'Monthly Weight Check',
        value: '24.5',
      },
      tokenA
    );
    const wData = weightRec.data.healthRecord || weightRec.data.record;
    assert(weightRec.status === 201 && wData?.type === 'weight', 'Weight record created with type="weight"');

    const vaccineRec = await apiCall(
      '/health',
      'POST',
      {
        pet: petAId,
        type: 'vaccination',
        title: 'Rabies Booster',
        status: 'completed',
      },
      tokenA
    );
    const vData = vaccineRec.data.healthRecord || vaccineRec.data.record;
    assert(vaccineRec.status === 201 && vData?.type === 'vaccination', 'Vaccination record created with type="vaccination"');
    healthRecordId = vData._id;

    const medRec = await apiCall(
      '/health',
      'POST',
      {
        pet: petAId,
        type: 'medication',
        title: 'Heartgard Plus',
        value: '1 chewable tablet',
        status: 'ongoing',
      },
      tokenA
    );
    const mData = medRec.data.healthRecord || medRec.data.record;
    assert(medRec.status === 201 && mData?.type === 'medication', 'Medication record created with type="medication"');

    const apptRec = await apiCall(
      '/health',
      'POST',
      {
        pet: petAId,
        type: 'appointment',
        title: 'Annual Physical & Dental Examination',
        status: 'scheduled',
      },
      tokenA
    );
    const aData = apptRec.data.healthRecord || apptRec.data.record;
    assert(apptRec.status === 201 && aData?.type === 'appointment', 'Appointment record created with type="appointment"');

    // 5. Test Health Record READ, UPDATE, and DELETE
    console.log('\n[4/7] Testing Health Record READ, UPDATE & Ownership Enforcement...');
    const listHealth = await apiCall(`/health?pet=${petAId}`, 'GET', null, tokenA);
    assert(listHealth.status === 200 && listHealth.data.records.length >= 4, 'Retrieved health records for Apollo');

    // Cross-tenant protection: User B cannot add record to User A's pet
    const userBAdd = await apiCall(
      '/health',
      'POST',
      {
        pet: petAId,
        type: 'general',
        title: 'Illegal Record by User B',
      },
      tokenB
    );
    assert(userBAdd.status === 403, 'Cross-user health record creation blocked (403)');

    // User B cannot read User A pet records
    const userBRead = await apiCall(`/health?pet=${petAId}`, 'GET', null, tokenB);
    assert(userBRead.status === 403, 'Cross-user health record retrieval blocked (403)');

    // Owner updates record
    const updateRec = await apiCall(
      `/health/${healthRecordId}`,
      'PUT',
      { title: 'Rabies 3-Year Booster', notes: 'Given by Dr. Smith' },
      tokenA
    );
    assert(updateRec.status === 200 && updateRec.data.record.title === 'Rabies 3-Year Booster', 'Owner updated health record');

    // 6. Test Medical Document Upload & S3 Registration
    console.log('\n[5/7] Testing Medical Document Registration & S3 Vault...');
    const docPayload = {
      pet: petAId,
      title: 'Blood Chemistry Panel Q2 2026',
      category: 'lab_result',
      notes: 'All liver and kidney enzymes in normal range.',
      s3Key: `documents/${userAId}/test-lab-result.pdf`,
      originalName: 'apollo-lab-result.pdf',
      contentType: 'application/pdf',
      size: 1048576,
    };
    const docRes = await apiCall('/documents', 'POST', docPayload, tokenA);
    assert(docRes.status === 201 && docRes.data.document, 'Medical document registered in MongoDB');
    documentId = docRes.data.document._id;
    assert(docRes.data.document.s3Key === docPayload.s3Key, 'S3 key safely stored in document record');

    // Cross-tenant document upload protection
    const userBDoc = await apiCall(
      '/documents',
      'POST',
      { ...docPayload, pet: petAId },
      tokenB
    );
    assert(userBDoc.status === 403, 'Cross-user medical document upload blocked (403)');

    // 7. Test Medical Document Presigned URL Generation
    console.log('\n[6/7] Testing Secure S3 Presigned URL Generation...');
    // User B blocked from getting presigned URL for User A's document
    const userBUrl = await apiCall(`/documents/${documentId}/presigned-url`, 'GET', null, tokenB);
    assert(userBUrl.status === 403, 'Cross-user document presigned URL access blocked (403)');

    // Owner retrieves presigned URL
    const ownerUrl = await apiCall(`/documents/${documentId}/presigned-url`, 'GET', null, tokenA);
    assert(ownerUrl.status === 200 && ownerUrl.data.presignedUrl, 'Owner received secure time-limited presigned URL');
    assert(ownerUrl.data.presignedUrl.includes('X-Amz-Signature') || ownerUrl.data.presignedUrl.includes('amazonaws.com'), 'Valid S3 presigned URL format confirmed');

    // 8. Test Medical Document & Health Record Deletion
    console.log('\n[7/7] Testing Deletion & Cleanup Verification...');
    // User B blocked from deleting User A's document
    const userBDelDoc = await apiCall(`/documents/${documentId}`, 'DELETE', null, tokenB);
    assert(userBDelDoc.status === 403, 'Cross-user document deletion blocked (403)');

    // Owner deletes document
    const ownerDelDoc = await apiCall(`/documents/${documentId}`, 'DELETE', null, tokenA);
    assert(ownerDelDoc.status === 200, 'Owner safely deleted medical document');

    // Owner deletes health record
    const ownerDelHealth = await apiCall(`/health/${healthRecordId}`, 'DELETE', null, tokenA);
    assert(ownerDelHealth.status === 200, 'Owner safely deleted health record');

    const checkDelHealth = await apiCall(`/health/${healthRecordId}`, 'GET', null, tokenA);
    assert(checkDelHealth.status === 404, 'Deleted health record returns 404');
  } finally {
    console.log('\n🧹 Cleaning up test artifacts from MongoDB Atlas...');
    if (healthRecordId) await HealthRecord.findByIdAndDelete(healthRecordId);
    if (documentId) await MedicalDocument.findByIdAndDelete(documentId);
    if (petAId) await Pet.findByIdAndDelete(petAId);
    if (userAId) await User.findByIdAndDelete(userAId);
    if (userBId) await User.findByIdAndDelete(userBId);
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('  ✅ Ephemeral test server closed & MongoDB disconnected.');
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} PHASE 4B TESTS COMPLETED SUCCESSFULLY!`);
  console.log('====================================================\n');
};

runPhase4BTests().catch((err) => {
  console.error('\n❌ Phase 4B Test failed:', err);
  process.exit(1);
});
