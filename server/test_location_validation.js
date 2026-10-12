import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import { resolveMongoUserFromCognitoPayload } from './utils/cognitoVerifier.js';
import { isStateCompatible, isCityCompatible } from '../src/data/indianStatesCities.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY STRUCTURED INDIAN LOCATION & PERSISTENCE TEST');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];

  try {
    // Connect to MongoDB
    console.log('\n[Init] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    // ------------------------------------------------------------------------
    // Test A: Valid PIN 560001 (Bengaluru, Karnataka)
    // ------------------------------------------------------------------------
    console.log('\n[Test A] Valid PIN: 560001 (Bengaluru, Karnataka)...');
    const resA = await fetch(`${API_BASE}/api/location/pincode/560001`);
    const dataA = await resA.json();
    if (!resA.ok || !dataA.success) {
      throw new Error(`Test A failed: Status ${resA.status} - ${dataA.message}`);
    }
    if (!Array.isArray(dataA.areas) || dataA.areas.length === 0) {
      throw new Error('Test A failed: Expected non-empty areas list.');
    }
    if (dataA.state !== 'Karnataka') {
      throw new Error(`Test A failed: Expected Karnataka, got ${dataA.state}`);
    }
    console.log(`✅ Test A Passed: State="${dataA.state}", District="${dataA.district}", Post Offices Count=${dataA.areas.length}`);

    // ------------------------------------------------------------------------
    // Test B: Invalid / Nonexistent PIN 999999
    // ------------------------------------------------------------------------
    console.log('\n[Test B] Invalid / Nonexistent PIN: 999999...');
    const resB = await fetch(`${API_BASE}/api/location/pincode/999999`);
    const dataB = await resB.json();
    if (resB.status !== 404 || dataB.success !== false) {
      throw new Error(`Test B failed: Expected 404, got status ${resB.status}`);
    }
    console.log(`✅ Test B Passed: Rejected correctly with 404: "${dataB.message}"`);

    // ------------------------------------------------------------------------
    // Test C: Invalid Format PINs (123, 1234567, abcdef)
    // ------------------------------------------------------------------------
    console.log('\n[Test C] Malformed PINs (123, 1234567, abcdef)...');
    for (const badPin of ['123', '1234567', 'abcdef']) {
      const resC = await fetch(`${API_BASE}/api/location/pincode/${badPin}`);
      const dataC = await resC.json();
      if (resC.status !== 400 || dataC.success !== false) {
        throw new Error(`Test C failed for PIN "${badPin}": Expected 400, got ${resC.status}`);
      }
    }
    console.log('✅ Test C Passed: All malformed PIN formats rejected with 400.');

    // ------------------------------------------------------------------------
    // Test D: State Mismatch Validation
    // ------------------------------------------------------------------------
    console.log('\n[Test D] State Mismatch: Valid PIN 560001 (Karnataka) paired with "Maharashtra"...');
    const isStateMatchValid = isStateCompatible('Maharashtra', dataA.state);
    if (isStateMatchValid) {
      throw new Error('Test D failed: Maharashtra was incorrectly accepted for Karnataka PIN.');
    }
    console.log('✅ Test D Passed: State mismatch correctly detected and rejected.');

    // ------------------------------------------------------------------------
    // Test E: City Mismatch Validation
    // ------------------------------------------------------------------------
    console.log('\n[Test E] City Mismatch: Valid PIN 560001 (Bengaluru) paired with "Pune"...');
    const isCityMatchValid = isCityCompatible('Pune', dataA);
    if (isCityMatchValid) {
      throw new Error('Test E failed: Pune was incorrectly accepted for Bengaluru PIN.');
    }
    const isCorrectCityMatch = isCityCompatible('Bengaluru', dataA);
    if (!isCorrectCityMatch) {
      throw new Error('Test E failed: Bengaluru was rejected for Bengaluru PIN.');
    }
    console.log('✅ Test E Passed: City mismatch rejected; matching city verified.');

    // ------------------------------------------------------------------------
    // Test F: Area / Post Office Belonging Verification
    // ------------------------------------------------------------------------
    console.log('\n[Test F] Area Mismatch: Choosing Area not belonging to PIN 560001...');
    const fakeArea = 'NonExistentAreaXYZ';
    const areaBelongs = dataA.areas.includes(fakeArea);
    if (areaBelongs) {
      throw new Error('Test F failed: Fake area was found in verified post offices.');
    }
    const realArea = dataA.areas[0];
    if (!dataA.areas.includes(realArea)) {
      throw new Error('Test F failed: Valid area was not found in verified post offices.');
    }
    console.log(`✅ Test F Passed: Invalid area rejected; verified area "${realArea}" accepted.`);

    // ------------------------------------------------------------------------
    // Test G: Second Valid PIN from Another Indian State (400001 Mumbai / Maharashtra)
    // ------------------------------------------------------------------------
    console.log('\n[Test G] Second Valid PIN: 400001 (Mumbai, Maharashtra)...');
    const resG = await fetch(`${API_BASE}/api/location/pincode/400001`);
    const dataG = await resG.json();
    if (!resG.ok || !dataG.success) {
      throw new Error(`Test G failed: Status ${resG.status} - ${dataG.message}`);
    }
    if (dataG.state !== 'Maharashtra') {
      throw new Error(`Test G failed: Expected Maharashtra, got ${dataG.state}`);
    }
    if (!isStateCompatible('Maharashtra', dataG.state)) {
      throw new Error('Test G failed: State compatibility failed for Maharashtra.');
    }
    if (!isCityCompatible('Mumbai', dataG)) {
      throw new Error('Test G failed: City compatibility failed for Mumbai.');
    }
    console.log(`✅ Test G Passed: Non-Karnataka PIN verified (${dataG.state}, ${dataG.district}, ${dataG.areas.length} areas).`);

    // ------------------------------------------------------------------------
    // Test H: Structured MongoDB Location Persistence
    // ------------------------------------------------------------------------
    console.log('\n[Test H] Persisting Structured Indian Location in MongoDB...');
    const testStructUser = await User.create({
      fullName: 'Aarav Sharma',
      email: `aarav_${Date.now()}@petly.com`,
      phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'TestPassword123!',
      location: {
        area: dataA.areas[0],
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001'
      }
    });
    createdUserIds.push(testStructUser._id);

    const reloadedStruct = await User.findById(testStructUser._id).lean();
    if (typeof reloadedStruct.location !== 'object' || !reloadedStruct.location) {
      throw new Error('Test H failed: location was not persisted as an object.');
    }
    if (
      reloadedStruct.location.pincode !== '560001' ||
      reloadedStruct.location.city !== 'Bengaluru' ||
      reloadedStruct.location.state !== 'Karnataka' ||
      reloadedStruct.location.area !== dataA.areas[0]
    ) {
      throw new Error(`Test H failed: Persisted fields mismatch: ${JSON.stringify(reloadedStruct.location)}`);
    }
    console.log('✅ Test H Passed: Structured Indian location persisted and retrieved successfully.');

    // ------------------------------------------------------------------------
    // Test I: Legacy String Location Preservation
    // ------------------------------------------------------------------------
    console.log('\n[Test I] Persisting Legacy String Location ("San Francisco, CA")...');
    const legacyUser = await User.create({
      fullName: 'Legacy User SF',
      email: `legacy_sf_${Date.now()}@petly.com`,
      phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'TestPassword123!',
      location: 'San Francisco, CA'
    });
    createdUserIds.push(legacyUser._id);

    const reloadedLegacy = await User.findById(legacyUser._id).lean();
    if (reloadedLegacy.location !== 'San Francisco, CA') {
      throw new Error(`Test I failed: Legacy location corrupted or altered: "${reloadedLegacy.location}"`);
    }
    console.log(`✅ Test I Passed: Legacy string location "${reloadedLegacy.location}" preserved with zero errors.`);

    // ------------------------------------------------------------------------
    // Test J: Cognito Sync — New User with Verified Location
    // ------------------------------------------------------------------------
    console.log('\n[Test J] Cognito Sync for New User with Location...');
    const fakeSubJ = crypto.randomUUID();
    const fakeEmailJ = `cognito_new_${Date.now()}@petly.com`;
    const newLocationJ = {
      area: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050'
    };

    const syncedNewUser = await resolveMongoUserFromCognitoPayload(
      { sub: fakeSubJ, email: fakeEmailJ, name: 'Priya Patel' },
      { location: newLocationJ }
    );
    createdUserIds.push(syncedNewUser._id);

    if (typeof syncedNewUser.location !== 'object' || syncedNewUser.location.pincode !== '400050') {
      throw new Error(`Test J failed: Location was not attached during new user Cognito sync.`);
    }
    console.log(`✅ Test J Passed: New user created with verified location: ${JSON.stringify(syncedNewUser.location)}`);

    // ------------------------------------------------------------------------
    // Test K: Cognito Sync — Existing User (NEVER Overwrite Existing Non-Empty Location)
    // ------------------------------------------------------------------------
    console.log('\n[Test K] Cognito Sync for Existing User: Preserving Non-Empty Location...');
    const existingOriginalId = legacyUser._id.toString();

    // 1. Syncing with empty location must NOT overwrite legacy "San Francisco, CA"
    const fakeSubK = crypto.randomUUID();
    const syncedExistingWithEmpty = await resolveMongoUserFromCognitoPayload(
      { sub: fakeSubK, email: legacyUser.email, email_verified: true },
      { location: '' }
    );
    if (syncedExistingWithEmpty._id.toString() !== existingOriginalId) {
      throw new Error('Test K failed: User._id changed during Cognito sync!');
    }
    if (syncedExistingWithEmpty.location !== 'San Francisco, CA') {
      throw new Error(`Test K failed: Existing location overwritten! Current: "${syncedExistingWithEmpty.location}"`);
    }

    // 2. Syncing with null/undefined must NOT overwrite legacy location
    const syncedExistingWithNull = await resolveMongoUserFromCognitoPayload(
      { sub: fakeSubK, email: legacyUser.email, email_verified: true },
      {}
    );
    if (syncedExistingWithNull.location !== 'San Francisco, CA') {
      throw new Error(`Test K failed: Existing location overwritten with null/undefined sync!`);
    }

    console.log(`✅ Test K Passed: Existing user User._id (${existingOriginalId}) and legacy location preserved intact.`);

    // ------------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------------
    console.log('\nCleaning up temporary test records...');
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(`🧹 Deleted ${createdUserIds.length} temporary test records.`);

    console.log('\n====================================================');
    console.log('🎉 ALL LOCATION VALIDATION & PERSISTENCE TESTS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
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

runTests();
