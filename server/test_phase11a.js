import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Pet from './models/Pet.js';
import generateToken from './utils/generateToken.js';
import { chatWithAssistant } from './controllers/assistantController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000';

const runPhase11aTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 11A GEMINI BACKEND INTEGRATION TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];
  const createdPetIds = [];

  try {
    console.log('\n[Init] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    const timestamp = Date.now();

    // 1. Create User A (Primary Tester)
    const userA = await User.create({
      fullName: 'Aisha Patel',
      email: `aisha_${timestamp}@petly.com`,
      phone: '+919876543401',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userA._id);
    const tokenA = generateToken(userA._id);

    // 2. Create User B (Secondary User)
    const userB = await User.create({
      fullName: 'Vikram Singh',
      email: `vikram_${timestamp}@petly.com`,
      phone: '+919876543402',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userB._id);
    const tokenB = generateToken(userB._id);

    // 3. Create Pet A owned by User A
    const petA = await Pet.create({
      name: `Simba_${timestamp}`,
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Male',
      weight: 28.5,
      allergies: ['Chicken', 'Wheat'],
      medicalConditions: ['Sensitive Stomach'],
      healthStatus: 'Healthy',
      themeColor: 'orange',
      isAdoptable: false,
      owner: userA._id,
    });
    createdPetIds.push(petA._id);

    // 4. Create Pet B owned by User B
    const petB = await Pet.create({
      name: `Luna_${timestamp}`,
      species: 'Cat',
      breed: 'Persian',
      age: 2,
      gender: 'Female',
      weight: 4.2,
      allergies: [],
      medicalConditions: [],
      healthStatus: 'Healthy',
      themeColor: 'purple',
      isAdoptable: false,
      owner: userB._id,
    });
    createdPetIds.push(petB._id);

    console.log('✅ Setup complete: Test users and pets created in MongoDB.');

    // ==========================================
    // TEST 1: Unauthenticated request rejected (401)
    // ==========================================
    console.log('\n[Test 1] Testing unauthenticated request to /api/assistant/chat...');
    const resUnauth = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello AI' }),
    });
    if (resUnauth.status !== 401) {
      throw new Error(`Test 1 Failed: Expected 401 Unauthorized, got ${resUnauth.status}`);
    }
    console.log('✅ Test 1 Passed: Unauthenticated request correctly rejected with 401.');

    // ==========================================
    // TEST 2: Missing or empty message rejected (400)
    // ==========================================
    console.log('\n[Test 2] Testing missing/empty message rejection...');
    const resEmpty1 = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    });
    if (resEmpty1.status !== 400) {
      throw new Error(`Test 2 Failed: Expected 400 for empty body, got ${resEmpty1.status}`);
    }

    const resEmpty2 = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ message: '     ' }),
    });
    if (resEmpty2.status !== 400) {
      throw new Error(`Test 2 Failed: Expected 400 for whitespace message, got ${resEmpty2.status}`);
    }
    console.log('✅ Test 2 Passed: Missing and whitespace messages correctly rejected with 400.');

    // ==========================================
    // TEST 3: Invalid petId format rejected (400)
    // ==========================================
    console.log('\n[Test 3] Testing invalid petId format rejection...');
    const resInvalidPet = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        message: 'What should I feed my dog?',
        petId: 'not-a-valid-id-12345',
      }),
    });
    if (resInvalidPet.status !== 400) {
      throw new Error(`Test 3 Failed: Expected 400 for invalid petId format, got ${resInvalidPet.status}`);
    }
    console.log('✅ Test 3 Passed: Invalid petId format correctly rejected with 400.');

    // ==========================================
    // TEST 4: Pet belonging to another user rejected (403)
    // ==========================================
    console.log('\n[Test 4] Testing pet ownership authorization (User A sending User B pet)...');
    const resCrossPet = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        message: 'Can this pet eat strawberries?',
        petId: petB._id.toString(), // belongs to User B!
      }),
    });
    if (resCrossPet.status !== 403) {
      throw new Error(`Test 4 Failed: Expected 403 Forbidden for cross-user pet, got ${resCrossPet.status}`);
    }
    const dataCrossPet = await resCrossPet.json();
    if (!dataCrossPet.message.includes('Access denied')) {
      throw new Error(`Test 4 Failed: Expected access denied message, got: ${dataCrossPet.message}`);
    }
    console.log('✅ Test 4 Passed: Pet belonging to another user correctly rejected with 403.');

    // ==========================================
    // TEST 5: Missing GEMINI_API_KEY handled cleanly (503)
    // ==========================================
    console.log('\n[Test 5] Testing clean handling when GEMINI_API_KEY is unconfigured...');
    // Helper to simulate request with mock controller execution
    const mockReqMissingKey = {
      body: { message: 'General pet care query' },
      user: { _id: userA._id },
    };
    let mockStatusMissingKey = 0;
    let mockDataMissingKey = {};
    const mockResMissingKey = {
      status: (s) => { mockStatusMissingKey = s; return mockResMissingKey; },
      json: (d) => { mockDataMissingKey = d; return mockResMissingKey; },
    };

    const savedKey = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = '';
      await chatWithAssistant(mockReqMissingKey, mockResMissingKey);
      if (mockStatusMissingKey !== 503) {
        throw new Error(`Test 5 Failed: Expected 503 for missing key, got ${mockStatusMissingKey}`);
      }
      if (!mockDataMissingKey.message || !mockDataMissingKey.message.includes('unconfigured')) {
        throw new Error(`Test 5 Failed: Unexpected error message: ${mockDataMissingKey.message}`);
      }
      console.log('✅ Test 5 Passed: Missing GEMINI_API_KEY returned clean 503 service unavailable response.');
    } finally {
      process.env.GEMINI_API_KEY = savedKey;
    }

    // ==========================================
    // TEST 6: Gemini / network failure handled cleanly (502/504)
    // ==========================================
    console.log('\n[Test 6] Testing clean handling of Gemini API or network errors...');
    const originalFetch = globalThis.fetch;
    try {
      // Mock network error
      globalThis.fetch = async () => {
        throw new Error('Simulated network connection reset');
      };

      const mockReqErr = {
        body: { message: 'Can my dog eat apples?' },
        user: { _id: userA._id },
      };
      let mockStatusErr = 0;
      let mockDataErr = {};
      const mockResErr = {
        status: (s) => { mockStatusErr = s; return mockResErr; },
        json: (d) => { mockDataErr = d; return mockResErr; },
      };

      process.env.GEMINI_API_KEY = 'test_key_placeholder';
      await chatWithAssistant(mockReqErr, mockResErr);

      if (mockStatusErr !== 502) {
        throw new Error(`Test 6 Failed: Expected 502 Bad Gateway for network error, got ${mockStatusErr}`);
      }
      if (JSON.stringify(mockDataErr).includes('test_key_placeholder')) {
        throw new Error('Test 6 Failed: Sensitive API key leaked in error output!');
      }
      console.log('✅ Test 6 Passed: Network failure handled cleanly with 502 without leaking secrets.');
    } finally {
      globalThis.fetch = originalFetch;
      process.env.GEMINI_API_KEY = savedKey;
    }

    // ==========================================
    // TEST 7: Owned pet context is accepted & verified from MongoDB
    // ==========================================
    console.log('\n[Test 7] Verifying owned pet context loading from MongoDB...');
    let capturedRequestBody = null;
    const originalFetch2 = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: `Yes, ${petA.name} can eat sliced apples in moderation. Since ${petA.name} is a 3-year-old Golden Retriever with sensitive stomach, remove all seeds and cores first. Note: Consult your vet if you notice any adverse reaction.`,
                    },
                  ],
                },
              },
            ],
          }),
        };
      };

      const mockReqPet = {
        body: {
          message: `Can ${petA.name} eat apples?`,
          petId: petA._id.toString(),
        },
        user: { _id: userA._id },
      };
      let mockStatusPet = 0;
      let mockDataPet = {};
      const mockResPet = {
        status: (s) => { mockStatusPet = s; return mockResPet; },
        json: (d) => { mockDataPet = d; return mockResPet; },
      };

      process.env.GEMINI_API_KEY = 'mock_valid_key';
      await chatWithAssistant(mockReqPet, mockResPet);

      if (mockStatusPet !== 200 || !mockDataPet.success || !mockDataPet.reply) {
        throw new Error(`Test 7 Failed: Expected 200 success with reply, got status ${mockStatusPet}: ${JSON.stringify(mockDataPet)}`);
      }

      // Verify system prompt contained verified MongoDB pet details
      const systemText = capturedRequestBody.systemInstruction?.parts?.[0]?.text || '';
      if (!systemText.includes(petA.name)) {
        throw new Error(`Test 7 Failed: System instruction missing pet name (${petA.name})`);
      }
      if (!systemText.includes('Golden Retriever')) {
        throw new Error('Test 7 Failed: System instruction missing pet breed (Golden Retriever)');
      }
      if (!systemText.includes('Chicken') || !systemText.includes('Sensitive Stomach')) {
        throw new Error('Test 7 Failed: System instruction missing pet allergies or medical conditions');
      }
      if (!systemText.includes('28.5 kg')) {
        throw new Error('Test 7 Failed: System instruction missing pet weight');
      }
      console.log('✅ Test 7 Passed: Verified MongoDB pet context correctly incorporated into Gemini prompt.');

      // ==========================================
      // TEST 8: Authenticated request succeeds with a valid Gemini response
      // ==========================================
      console.log('\n[Test 8] Testing authenticated request succeeds with valid response format...');
      const mockReqGeneral = {
        body: { message: 'What are safe fruits for dogs to eat?' },
        user: { _id: userA._id },
      };
      let mockStatusGen = 0;
      let mockDataGen = {};
      const mockResGen = {
        status: (s) => { mockStatusGen = s; return mockResGen; },
        json: (d) => { mockDataGen = d; return mockResGen; },
      };

      await chatWithAssistant(mockReqGeneral, mockResGen);

      if (mockStatusGen !== 200 || !mockDataGen.success || typeof mockDataGen.reply !== 'string' || !mockDataGen.reply.trim()) {
        throw new Error(`Test 8 Failed: Expected 200 with non-empty string reply, got ${mockStatusGen}: ${JSON.stringify(mockDataGen)}`);
      }
      console.log('   Sample Assistant Reply (snippet):', mockDataGen.reply.slice(0, 100) + '...');
      console.log('✅ Test 8 Passed: Successfully returned valid Gemini response { success: true, reply: "..." }.');
    } finally {
      globalThis.fetch = originalFetch2;
      process.env.GEMINI_API_KEY = savedKey;
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 11A GEMINI BACKEND INTEGRATION TESTS PASSED!');
    console.log('====================================================');
  } finally {
    console.log('\n[Cleanup] Cleaning up temporary test data...');
    if (createdPetIds.length > 0) {
      await Pet.deleteMany({ _id: { $in: createdPetIds } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } }).catch(() => {});
    }
    console.log('🧹 Cleaned up temporary test users and pets.');
    await mongoose.disconnect().catch(() => {});
  }
};

runPhase11aTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err.message);
    process.exit(1);
  });
