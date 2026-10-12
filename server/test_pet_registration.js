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

const runPetRegistrationTest = async () => {
  console.log('====================================================');
  console.log('🧪 PET REGISTRATION & PERSISTENCE FOCUSED TEST');
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

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/pets', petRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const testServer = http.createServer(app);
  let userToken = null;
  let userId = null;
  let createdPetId = null;

  try {
    // 1. Connect MongoDB
    console.log('[1/7] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected');

    await new Promise((resolve) => testServer.listen(0, resolve));
    const port = testServer.address().port;
    const BASE_URL = `http://127.0.0.1:${port}/api`;
    console.log(`  - Ephemeral test server mounted at ${BASE_URL}\n`);

    // Helper HTTP client
    const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
      const headers = {};
      if (body) headers['Content-Type'] = 'application/json';
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    };

    // 2. Setup Test User
    console.log('[2/7] Authenticating Test User...');
    const signupRes = await apiCall('/auth/signup', 'POST', {
      fullName: 'Registration Tester',
      email: `reg_tester_${Date.now()}@petly.com`,
      password: 'Password123!',
      city: 'Bengaluru',
      state: 'Karnataka',
    });
    assert(signupRes.status === 201 && signupRes.data.token, 'Test user registered with JWT');
    userToken = signupRes.data.token;
    userId = signupRes.data.user?.id || signupRes.data.user?._id;

    // 3. Create Pet with All Required Fields
    console.log('\n[3/7] Testing Pet Creation with all registration fields...');
    const petPayload = {
      name: 'Goldie',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 2,
      gender: 'Female',
      weight: 24,
      temperature: '101.5°F',
      height: '55 cm',
      color: 'golden brown',
      themeColor: 'golden brown',
      dob: '2023-04-15',
      adoptionDate: '2023-08-20',
      allergies: ['Allergic to citrus perfume'],
      medicalConditions: ['a test condition'],
      description: 'Test companion notes and description',
    };

    const createRes = await apiCall('/pets', 'POST', petPayload, userToken);
    assert(createRes.status === 201, 'Pet created via POST /api/pets (201)');
    assert(createRes.data.success === true, 'API response reports success: true');

    const createdPet = createRes.data.pet;
    createdPetId = createdPet._id;
    assert(createdPet.temperature === '101.5°F', `API response returned temperature: "${createdPet.temperature}"`);
    assert(createdPet.height === '55 cm', `API response returned height: "${createdPet.height}"`);
    assert(createdPet.themeColor === 'golden brown', `API response preserved themeColor: "${createdPet.themeColor}"`);
    assert(createdPet.dob === '2023-04-15', `API response returned dob: "${createdPet.dob}"`);
    assert(createdPet.adoptionDate === '2023-08-20', `API response returned adoptionDate: "${createdPet.adoptionDate}"`);
    assert(
      Array.isArray(createdPet.allergies) && createdPet.allergies.includes('Allergic to citrus perfume'),
      `API response returned allergies: ${JSON.stringify(createdPet.allergies)}`
    );
    assert(
      Array.isArray(createdPet.medicalConditions) && createdPet.medicalConditions.includes('a test condition'),
      `API response returned medicalConditions: ${JSON.stringify(createdPet.medicalConditions)}`
    );

    // 4. Verify Directly in MongoDB Document
    console.log('\n[4/7] Direct MongoDB Document Verification...');
    const rawPetInDb = await Pet.findById(createdPetId).lean();
    assert(Boolean(rawPetInDb), 'Pet document found in MongoDB database');
    assert(rawPetInDb.temperature === '101.5°F', `Raw MongoDB temperature === "101.5°F" (found: "${rawPetInDb.temperature}")`);
    assert(rawPetInDb.height === '55 cm', `Raw MongoDB height === "55 cm" (found: "${rawPetInDb.height}")`);
    assert(rawPetInDb.themeColor === 'golden brown', `Raw MongoDB themeColor === "golden brown" NOT "orange" (found: "${rawPetInDb.themeColor}")`);
    assert(rawPetInDb.color === 'golden brown', `Raw MongoDB color === "golden brown" (found: "${rawPetInDb.color}")`);
    assert(rawPetInDb.dob === '2023-04-15', `Raw MongoDB dob === "2023-04-15" (found: "${rawPetInDb.dob}")`);
    assert(rawPetInDb.adoptionDate === '2023-08-20', `Raw MongoDB adoptionDate === "2023-08-20" (found: "${rawPetInDb.adoptionDate}")`);
    assert(
      Array.isArray(rawPetInDb.allergies) && rawPetInDb.allergies.includes('Allergic to citrus perfume'),
      `Raw MongoDB allergies stored as array containing "Allergic to citrus perfume"`
    );
    assert(
      Array.isArray(rawPetInDb.medicalConditions) && rawPetInDb.medicalConditions.includes('a test condition'),
      `Raw MongoDB medicalConditions stored as array containing "a test condition"`
    );

    // 5. Verify Update Persists Structured Fields
    console.log('\n[5/7] Testing Pet UPDATE (PUT /api/pets/:id)...');
    const updatePayload = {
      temperature: '102.2°F',
      height: '58 cm',
      color: 'golden brown',
      allergies: ['Allergic to citrus perfume', 'Wheat allergy'],
      medicalConditions: ['a test condition', 'Ear sensitivity'],
    };

    const updateRes = await apiCall(`/pets/${createdPetId}`, 'PUT', updatePayload, userToken);
    assert(updateRes.status === 200, 'Pet updated via PUT /api/pets/:id (200)');

    const updatedDb = await Pet.findById(createdPetId).lean();
    assert(updatedDb.temperature === '102.2°F', `Updated temperature persisted: "${updatedDb.temperature}"`);
    assert(updatedDb.height === '58 cm', `Updated height persisted: "${updatedDb.height}"`);
    assert(updatedDb.allergies.length === 2, `Updated allergies count: ${updatedDb.allergies.length}`);
    assert(updatedDb.medicalConditions.length === 2, `Updated conditions count: ${updatedDb.medicalConditions.length}`);

    // 6. Verify Fetch After Refresh (GET /api/pets and GET /api/pets/:id)
    console.log('\n[6/7] Testing Fetch / Re-read Flow...');
    const listRes = await apiCall('/pets', 'GET', null, userToken);
    assert(listRes.status === 200 && Array.isArray(listRes.data.pets), 'GET /api/pets returns list of pets');
    const fetchedPet = listRes.data.pets.find((p) => p._id === createdPetId);
    assert(Boolean(fetchedPet), 'Created pet present in pet list');
    assert(fetchedPet.temperature === '102.2°F', 'Fetched pet displays persisted temperature');
    assert(fetchedPet.height === '58 cm', 'Fetched pet displays persisted height');
    assert(fetchedPet.themeColor === 'golden brown', 'Fetched pet displays persisted themeColor');

    // 7. Verify Backward Compatibility with Fluffy
    console.log('\n[7/7] Backward Compatibility Verification for Fluffy...');
    const fluffy = await Pet.findOne({ name: 'Fluffy' }).lean();
    assert(Boolean(fluffy), 'Fluffy pet record exists in database');
    assert(Boolean(fluffy.photoKey), `Fluffy photoKey preserved: "${fluffy.photoKey}"`);
    assert(Boolean(fluffy.description), `Fluffy description preserved`);

    // Cleanup created test pet and test user
    await Pet.findByIdAndDelete(createdPetId);
    await User.findByIdAndDelete(userId);
    console.log('\n🧹 Cleaned up registration test pet and user (Fluffy left untouched).');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PET REGISTRATION TESTS PASSED!`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    testServer.close();
    await mongoose.disconnect();
  }
};

runPetRegistrationTest();
