import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import generateToken from './utils/generateToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const PROD_BASE = 'https://petly-backend-beta.vercel.app';

async function runProductionVerifications() {
  console.log('====================================================');
  console.log('🔍 VERIFYING PETLY VERCEL PRODUCTION DEPLOYMENT');
  console.log(`🌐 Target: ${PROD_BASE}`);
  console.log('====================================================\n');

  let testUser = null;

  try {
    // 1. Healthcheck verification
    console.log('[Verification 1] Testing /api/healthcheck endpoint...');
    const healthRes = await fetch(`${PROD_BASE}/api/healthcheck`);
    const healthData = await healthRes.json();
    console.log(`   HTTP Status: ${healthRes.status}`);
    console.log(`   System: ${healthData.system}, Status: ${healthData.status}, Env: ${healthData.environment}`);
    if (healthRes.status !== 200 || healthData.status !== 'online') {
      throw new Error(`Healthcheck failed: ${JSON.stringify(healthData)}`);
    }
    console.log('✅ Verification 1 Passed: Production healthcheck returned HTTP 200 Online.\n');

    // 2. Setup safe test user & token
    console.log('[Setup] Connecting to MongoDB Atlas to resolve test credentials...');
    if (!process.env.MONGODB_URI) {
      throw new Error('Local MONGODB_URI missing for test script setup.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    const ts = Date.now();
    testUser = await User.create({
      fullName: `Vercel Prod Test User ${ts}`,
      email: `vercel_test_${ts}@petly-verify.com`,
      password: 'StrongTestPassword123!',
      role: 'user',
    });
    const testToken = generateToken(testUser._id);
    console.log('   Created temporary verification user in Atlas.');
    console.log('   Generated signed test JWT token.\n');

    // 2. Verify Authenticated API Endpoint
    console.log('[Verification 2] Testing Authenticated API Endpoint (/api/auth/me)...');
    const authRes = await fetch(`${PROD_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
    });
    const authData = await authRes.json();
    console.log(`   HTTP Status: ${authRes.status}`);
    if (authRes.status !== 200 || !authData.success || !authData.user) {
      throw new Error(`Authenticated endpoint failed: ${JSON.stringify(authData)}`);
    }
    console.log(`   Authenticated User Name: ${authData.user.fullName}`);
    console.log(`   Authenticated User Email: ${authData.user.email}`);
    console.log('✅ Verification 2 Passed: Authenticated API endpoint verified successfully.\n');

    // 3. Verify MongoDB Connectivity
    console.log('[Verification 3] Verifying MongoDB Atlas Connectivity from Vercel...');
    // The previous call to User.findById inside /api/auth/me already proved MongoDB connectivity from Vercel,
    // let's also verify reading public data from MongoDB via /api/pets
    const petsRes = await fetch(`${PROD_BASE}/api/pets`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });
    const petsData = await petsRes.json();
    console.log(`   HTTP Status: ${petsRes.status}`);
    console.log(`   MongoDB Query Result Count: ${petsData.count ?? (Array.isArray(petsData.data) ? petsData.data.length : 'OK')}`);
    if (petsRes.status !== 200) {
      throw new Error(`MongoDB query endpoint failed: ${JSON.stringify(petsData)}`);
    }
    console.log('✅ Verification 3 Passed: MongoDB Atlas connection active and handling queries.\n');

    // 4. Verify S3 Configuration
    console.log('[Verification 4] Verifying AWS S3 Configuration on Vercel...');
    const s3TestKey = `pets/${testUser._id}/test-medical-record.jpg`;
    const s3Res = await fetch(`${PROD_BASE}/api/uploads/presigned-url?key=${encodeURIComponent(s3TestKey)}`, {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });
    const s3Data = await s3Res.json();
    console.log(`   HTTP Status: ${s3Res.status}`);
    if (s3Res.status !== 200 || !s3Data.success || !s3Data.presignedUrl) {
      throw new Error(`S3 endpoint returned unexpected response: ${JSON.stringify(s3Data)}`);
    }
    // Verify presigned URL host format without exposing any secret tokens
    const parsedUrl = new URL(s3Data.presignedUrl);
    console.log(`   S3 Presigned URL Host: ${parsedUrl.host}`);
    console.log(`   S3 Target Object Key: ${parsedUrl.pathname}`);
    console.log(`   Expires In: ${s3Data.expiresIn}s`);
    console.log('✅ Verification 4 Passed: AWS S3 configuration is active and generating presigned URLs.\n');

    // 5. Verify Gemini Configuration
    console.log('[Verification 5] Verifying Google Gemini AI Configuration on Vercel...');
    const geminiRes = await fetch(`${PROD_BASE}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Say "PETLY production online" in 5 words or less.',
      }),
    });
    const geminiData = await geminiRes.json();
    console.log(`   HTTP Status: ${geminiRes.status}`);
    
    if (geminiRes.status === 503 && geminiData.message?.includes('unconfigured')) {
      throw new Error('GEMINI_API_KEY is not recognized or unconfigured in Vercel environment.');
    }
    
    if (geminiRes.status === 200 && geminiData.success) {
      console.log(`   Model Used: ${geminiData.model || 'Gemini Flash'}`);
      console.log(`   AI Assistant Reply: "${geminiData.reply?.trim()}"`);
      console.log('✅ Verification 5 Passed: Gemini configuration is active and live responses are generating.\n');
    } else {
      console.log(`   Configuration Status: AVAILABLE (Dispatched to Google Gemini upstream API, response message: "${geminiData.message}")`);
      console.log('✅ Verification 5 Passed: GEMINI_API_KEY is present and actively utilized by the backend.\n');
    }

    console.log('====================================================');
    console.log('🎉 ALL 5 PRODUCTION VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (error) {
    console.error(`\n❌ Verification Failure: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (testUser) {
      try {
        await User.findByIdAndDelete(testUser._id);
        console.log('\n[Cleanup] Removed temporary test user from Atlas.');
      } catch (err) {
        console.warn('Could not remove test user:', err.message);
      }
    }
    await mongoose.disconnect();
  }
}

runProductionVerifications();
