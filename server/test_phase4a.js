import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import User from './models/User.js';
import Pet from './models/Pet.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase4ATests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 4A FRONTEND-BACKEND INTEGRATION TEST');
  console.log('       (Authentication + Pet CRUD Verification)     ');
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
  console.log('[1/8] Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected');

  // 2. Setup Ephemeral Server with Auth & Pet routes
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/pets', petRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  - Test server mounted at ${baseUrl}\n`);

  // Helper HTTP client
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
  const userAEmail = `user_a_${testStamp}@petly.com`;
  const userBEmail = `user_b_${testStamp}@petly.com`;
  const password = 'StrongPassword123!';

  let tokenA = null;
  let tokenB = null;
  let userAId = null;
  let userBId = null;
  let createdPetId = null;

  try {
    // 3. Test Signup API
    console.log('[2/8] Testing Frontend Authentication Flow: Signup...');
    const signupRes = await apiCall('/auth/signup', 'POST', {
      fullName: 'Integration User A',
      email: userAEmail,
      password,
      city: 'Bengaluru',
      state: 'Karnataka',
    });
    if (signupRes.status !== 201) {
      console.error('  DEBUG signupRes:', signupRes.status, signupRes.data);
    }
    assert(signupRes.status === 201 && signupRes.data.token, 'Signup returns HTTP 201 and JWT token');
    tokenA = signupRes.data.token;
    userAId = signupRes.data.user?.id || signupRes.data.user?._id;
    assert(userAId, 'User object with ID returned from signup');

    // Create User B for multi-tenant isolation testing
    const signupB = await apiCall('/auth/signup', 'POST', {
      fullName: 'Integration User B',
      email: userBEmail,
      password,
    });
    tokenB = signupB.data.token;
    userBId = signupB.data.user?.id || signupB.data.user?._id;

    // 4. Test Login API
    console.log('\n[3/8] Testing Frontend Authentication Flow: Login...');
    const invalidLogin = await apiCall('/auth/login', 'POST', {
      email: userAEmail,
      password: 'WrongPassword!',
    });
    assert(invalidLogin.status === 401, 'Invalid password rejected with 401 Unauthorized');

    const validLogin = await apiCall('/auth/login', 'POST', {
      email: userAEmail,
      password,
    });
    assert(validLogin.status === 200 && validLogin.data.token, 'Valid credentials return HTTP 200 and new JWT token');

    // 5. Test Current User Session Validation (GET /api/auth/me)
    console.log('\n[4/8] Testing Session Verification (GET /api/auth/me)...');
    const meNoToken = await apiCall('/auth/me', 'GET');
    assert(meNoToken.status === 401, 'Unauthenticated request to /auth/me rejected with 401');

    const meWithToken = await apiCall('/auth/me', 'GET', null, tokenA);
    assert(meWithToken.status === 200 && meWithToken.data.user.email === userAEmail, 'Session verified and user profile returned');

    // 6. Test Pet Creation (POST /api/pets)
    console.log('\n[5/8] Testing Pet CRUD: CREATE (POST /api/pets)...');
    const newPet = {
      name: 'Rusty',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 2,
      gender: 'Male',
      weight: 28.5,
      healthStatus: 'Active',
      description: 'Energetic and loves fetch in the park.',
      photoUrl: 'https://petly-cloud-storage-2026.s3.ap-south-1.amazonaws.com/pets/mock-s3-key.jpg',
      photoKey: 'pets/test/mock-s3-key.jpg',
    };
    const createRes = await apiCall('/pets', 'POST', newPet, tokenA);
    assert(createRes.status === 201 && createRes.data.pet, 'Pet created in MongoDB with HTTP 201');
    createdPetId = createRes.data.pet._id;
    assert(createdPetId, `Pet ID assigned: ${createdPetId}`);
    assert(createRes.data.pet.name === 'Rusty', 'Pet name matches input data');
    assert(createRes.data.pet.photoKey === newPet.photoKey, 'S3 photoKey correctly preserved');

    // 7. Test Pet Listing & Detail (GET /api/pets & GET /api/pets/:id)
    console.log('\n[6/8] Testing Pet CRUD: READ (List & Detail)...');
    const listRes = await apiCall('/pets', 'GET', null, tokenA);
    assert(listRes.status === 200 && Array.isArray(listRes.data.pets), 'Pet list returns array of pets');
    assert(listRes.data.pets.some((p) => p._id === createdPetId), 'Created pet appears in user pet list');

    const detailRes = await apiCall(`/pets/${createdPetId}`, 'GET', null, tokenA);
    assert(detailRes.status === 200 && detailRes.data.pet._id === createdPetId, 'Pet detail route (/pet/:id) retrieves full record');

    // 8. Test Pet Update & Authorization (PUT /api/pets/:id)
    console.log('\n[7/8] Testing Pet CRUD: UPDATE & Authorization...');
    const userBUpdate = await apiCall(`/pets/${createdPetId}`, 'PUT', { name: 'Hacked Name' }, tokenB);
    assert(userBUpdate.status === 403, 'Cross-user pet modification blocked with 403 Forbidden');

    const ownerUpdate = await apiCall(
      `/pets/${createdPetId}`,
      'PUT',
      { weight: 29.2, healthStatus: 'Fit & Healthy' },
      tokenA
    );
    assert(ownerUpdate.status === 200, 'Owner pet update returns HTTP 200');
    assert(ownerUpdate.data.pet.weight === 29.2, 'Updated weight correctly saved in database');
    assert(ownerUpdate.data.pet.healthStatus === 'Fit & Healthy', 'Updated health status correctly saved');

    // 9. Test Pet Deletion (DELETE /api/pets/:id)
    console.log('\n[8/8] Testing Pet CRUD: DELETE & Cleanup...');
    const userBDelete = await apiCall(`/pets/${createdPetId}`, 'DELETE', null, tokenB);
    assert(userBDelete.status === 403, 'Cross-user pet deletion blocked with 403 Forbidden');

    const ownerDelete = await apiCall(`/pets/${createdPetId}`, 'DELETE', null, tokenA);
    assert(ownerDelete.status === 200, 'Owner pet deletion returns HTTP 200');

    const verifyDeleted = await apiCall(`/pets/${createdPetId}`, 'GET', null, tokenA);
    assert(verifyDeleted.status === 404, 'Deleted pet returns HTTP 404 Not Found');
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test artifacts from MongoDB Atlas...');
    if (userAId) await User.findByIdAndDelete(userAId);
    if (userBId) await User.findByIdAndDelete(userBId);
    if (createdPetId) await Pet.findByIdAndDelete(createdPetId);
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('  ✅ Ephemeral test server closed & MongoDB disconnected.');
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} PHASE 4A TESTS COMPLETED SUCCESSFULLY!`);
  console.log('====================================================\n');
};

runPhase4ATests().catch((err) => {
  console.error('\n❌ Phase 4A Test failed:', err);
  process.exit(1);
});
