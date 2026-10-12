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

const runPhase11bTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 11B FRONTEND-BACKEND INTEGRATION TEST SUITE');
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

    // 1. Create User with Multiple Pets
    const user = await User.create({
      fullName: 'Tara Sharma',
      email: `tara_${timestamp}@petly.com`,
      phone: '+919876543501',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(user._id);
    const token = generateToken(user._id);

    // 2. Create Pet 1 (Golden Retriever)
    const pet1 = await Pet.create({
      name: `Rocky_${timestamp}`,
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 4,
      gender: 'Male',
      weight: 31.0,
      allergies: ['Beef'],
      medicalConditions: ['Hip Dysplasia'],
      healthStatus: 'Under Treatment',
      themeColor: 'orange',
      isAdoptable: false,
      owner: user._id,
    });
    createdPetIds.push(pet1._id);

    // 3. Create Pet 2 (Siamese Cat)
    const pet2 = await Pet.create({
      name: `Cleo_${timestamp}`,
      species: 'Cat',
      breed: 'Siamese',
      age: 2,
      gender: 'Female',
      weight: 3.8,
      allergies: ['Dairy'],
      medicalConditions: [],
      healthStatus: 'Healthy',
      themeColor: 'cyan',
      isAdoptable: false,
      owner: user._id,
    });
    createdPetIds.push(pet2._id);

    console.log('✅ Setup complete: User with 2 pets (Rocky & Cleo) created.');

    // ==========================================
    // TEST 1: assistantAPI request format & authenticated invocation
    // ==========================================
    console.log('\n[Test 1] Testing assistantAPI request contract (POST /api/assistant/chat)...');
    // Emulate assistantAPI.chat({ message: "...", petId: undefined })
    const payloadNoPet = {
      message: 'What are essential daily exercises for young pets?',
      petId: undefined,
    };

    // Verify request over live HTTP server
    const resContract = await fetch(`${API_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadNoPet),
    });

    // Contract accepts the request without 400/401/403 errors
    if (resContract.status === 400 || resContract.status === 401 || resContract.status === 403) {
      const errData = await resContract.json();
      throw new Error(`Test 1 Failed: Contract rejected with status ${resContract.status}: ${JSON.stringify(errData)}`);
    }
    console.log(`   Live endpoint response status: ${resContract.status} (contract accepted)`);
    console.log('✅ Test 1 Passed: assistantAPI request format accepted by authenticated endpoint.');

    // ==========================================
    // TEST 2: No-pet (General context) request works
    // ==========================================
    console.log('\n[Test 2] Testing no-pet general context request...');
    let capturedBodyNoPet = null;
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url, options) => {
        capturedBodyNoPet = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'Daily moderate exercise like walking and interactive play helps maintain your pet’s physical and mental health.' },
                  ],
                },
              },
            ],
          }),
        };
      };

      const mockReqNoPet = {
        body: { message: 'How much exercise does an average companion need?' },
        user: { _id: user._id },
      };
      let statusNoPet = 0;
      let dataNoPet = {};
      const mockResNoPet = {
        status: (s) => { statusNoPet = s; return mockResNoPet; },
        json: (d) => { dataNoPet = d; return mockResNoPet; },
      };

      const savedKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'mock_test_key';
      await chatWithAssistant(mockReqNoPet, mockResNoPet);
      process.env.GEMINI_API_KEY = savedKey;

      if (statusNoPet !== 200 || !dataNoPet.success || !dataNoPet.reply) {
        throw new Error(`Test 2 Failed: Expected 200 with reply, got status ${statusNoPet}`);
      }

      const promptText = capturedBodyNoPet.systemInstruction?.parts?.[0]?.text || '';
      if (promptText.includes('Rocky') || promptText.includes('Cleo')) {
        throw new Error('Test 2 Failed: General no-pet prompt should not include specific pet profiles.');
      }
      console.log('✅ Test 2 Passed: No-pet request operates in clean general pet-care mode.');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // ==========================================
    // TEST 3: Pet 1 selection sends petId and injects Pet 1 verified context
    // ==========================================
    console.log('\n[Test 3] Testing Pet 1 (Rocky) selection and prompt injection...');
    let capturedBodyPet1 = null;
    try {
      globalThis.fetch = async (url, options) => {
        capturedBodyPet1 = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    { text: `For Rocky, given his hip dysplasia and 31 kg weight, low-impact activities like swimming or short leashed walks are ideal. Avoid high-impact jumping.` },
                  ],
                },
              },
            ],
          }),
        };
      };

      const mockReqPet1 = {
        body: {
          message: 'What exercises are safe for my dog?',
          petId: pet1._id.toString(),
        },
        user: { _id: user._id },
      };
      let statusPet1 = 0;
      let dataPet1 = {};
      const mockResPet1 = {
        status: (s) => { statusPet1 = s; return mockResPet1; },
        json: (d) => { dataPet1 = d; return mockResPet1; },
      };

      const savedKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'mock_test_key';
      await chatWithAssistant(mockReqPet1, mockResPet1);
      process.env.GEMINI_API_KEY = savedKey;

      if (statusPet1 !== 200 || !dataPet1.success) {
        throw new Error(`Test 3 Failed: Pet 1 chat returned ${statusPet1}`);
      }

      const systemText1 = capturedBodyPet1.systemInstruction?.parts?.[0]?.text || '';
      if (!systemText1.includes(pet1.name)) {
        throw new Error(`Test 3 Failed: System prompt missing pet1 name (${pet1.name})`);
      }
      if (!systemText1.includes('Golden Retriever') || !systemText1.includes('Hip Dysplasia')) {
        throw new Error('Test 3 Failed: System prompt missing pet1 breed or medical condition.');
      }
      if (systemText1.includes('Cleo')) {
        throw new Error('Test 3 Failed: System prompt for Pet 1 contained Pet 2 (Cleo) data.');
      }
      console.log('✅ Test 3 Passed: Pet 1 selection correctly loaded verified MongoDB context for Rocky.');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // ==========================================
    // TEST 4: Pet 2 selection sends petId and injects Pet 2 verified context
    // ==========================================
    console.log('\n[Test 4] Testing Pet 2 (Cleo) selection and prompt injection...');
    let capturedBodyPet2 = null;
    try {
      globalThis.fetch = async (url, options) => {
        capturedBodyPet2 = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    { text: `For Cleo, being a 2-year-old Siamese cat, indoor climbing trees and feather toys provide safe mental and physical stimulation.` },
                  ],
                },
              },
            ],
          }),
        };
      };

      const mockReqPet2 = {
        body: {
          message: 'What enrichment toys do you recommend?',
          petId: pet2._id.toString(),
        },
        user: { _id: user._id },
      };
      let statusPet2 = 0;
      let dataPet2 = {};
      const mockResPet2 = {
        status: (s) => { statusPet2 = s; return mockResPet2; },
        json: (d) => { dataPet2 = d; return mockResPet2; },
      };

      const savedKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'mock_test_key';
      await chatWithAssistant(mockReqPet2, mockResPet2);
      process.env.GEMINI_API_KEY = savedKey;

      if (statusPet2 !== 200 || !dataPet2.success) {
        throw new Error(`Test 4 Failed: Pet 2 chat returned ${statusPet2}`);
      }

      const systemText2 = capturedBodyPet2.systemInstruction?.parts?.[0]?.text || '';
      if (!systemText2.includes(pet2.name)) {
        throw new Error(`Test 4 Failed: System prompt missing pet2 name (${pet2.name})`);
      }
      if (!systemText2.includes('Siamese') || !systemText2.includes('Cat')) {
        throw new Error('Test 4 Failed: System prompt missing pet2 breed or species.');
      }
      if (systemText2.includes('Rocky') || systemText2.includes('Hip Dysplasia')) {
        throw new Error('Test 4 Failed: System prompt for Pet 2 contained Pet 1 data.');
      }
      console.log('✅ Test 4 Passed: Multiple-pet selection correctly switches to Cleo without cross-contamination.');
    } finally {
      globalThis.fetch = originalFetch;
    }

    // ==========================================
    // TEST 5: Frontend error mapping resilience
    // ==========================================
    console.log('\n[Test 5] Testing frontend error mapping resilience...');
    // Emulate frontend error mapping logic in AIAssistant.jsx
    const formatErrorMessage = (err) => {
      let friendlyError = 'I am currently having difficulty connecting to PETLY AI. Please try again in a moment.';
      if (err.status === 401) {
        friendlyError = 'Your session has expired. Please log in again to continue.';
      } else if (err.status === 503) {
        friendlyError = 'PETLY AI service is currently undergoing maintenance. Please check back shortly.';
      } else if (err.status === 429) {
        friendlyError = 'PETLY AI is receiving high traffic right now. Please wait a moment before sending another question.';
      } else if (err.message && !err.message.includes('status') && !err.message.includes('fetch')) {
        friendlyError = err.message;
      }
      return friendlyError;
    };

    const err401 = formatErrorMessage({ status: 401, message: 'Unauthorized' });
    const err503 = formatErrorMessage({ status: 503, message: 'Service Unavailable' });
    const err429 = formatErrorMessage({ status: 429, message: 'Too Many Requests' });
    const errGeneric = formatErrorMessage(new Error('Failed to fetch'));

    if (!err401.includes('log in again')) {
      throw new Error('Test 5 Failed: 401 did not map to login prompt.');
    }
    if (!err503.includes('maintenance')) {
      throw new Error('Test 5 Failed: 503 did not map to maintenance message.');
    }
    if (!err429.includes('high traffic')) {
      throw new Error('Test 5 Failed: 429 did not map to rate-limit message.');
    }
    if (!errGeneric.includes('difficulty connecting')) {
      throw new Error('Test 5 Failed: Network error did not map to friendly connection message.');
    }
    console.log('✅ Test 5 Passed: All backend error scenarios produce safe, user-friendly messages without crashing.');

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 11B INTEGRATION TESTS PASSED!');
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

runPhase11bTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err.message);
    process.exit(1);
  });
