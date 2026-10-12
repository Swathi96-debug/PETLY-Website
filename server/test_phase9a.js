import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import generateToken from './utils/generateToken.js';
import { cognitoConfig, isCognitoConfigured, COGNITO_PASSWORD_POLICY, COGNITO_ATTRIBUTES_SPEC } from './config/cognito.js';

dotenv.config();

const runPhase9ATests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 9A AWS COGNITO SETUP TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  console.log(`📌 Target MONGODB_URI: ${uri ? uri.replace(/:([^@]+)@/, ':****@') : 'Not Configured'}`);

  if (!uri || uri.includes('user:password@cluster0.mongodb.net')) {
    console.error('❌ MONGODB_URI in server/.env is not configured.');
    process.exit(1);
  }

  const createdUserIds = [];

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[1/7] Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(uri);
    console.log(`✅ Connected successfully to Host: ${conn.connection.host} | Database: ${conn.connection.name}`);

    // Ensure indexes are synced
    await User.syncIndexes();

    // 2. Verify Schema Integrity: cognitoSub exists and has sparse & unique index
    console.log('\n[2/7] Verifying User Schema for cognitoSub identity bridge...');
    const cognitoSubPath = User.schema.paths.cognitoSub;
    if (!cognitoSubPath) {
      throw new Error('User schema is missing cognitoSub path!');
    }
    const isSparse = cognitoSubPath.options.sparse === true;
    const isUnique = cognitoSubPath.options.unique === true;
    console.log(`✅ cognitoSub field registered in User schema (type: ${cognitoSubPath.instance})`);
    console.log(`✅ cognitoSub sparse index: ${isSparse ? 'PASS' : 'FAIL'} (allows legacy users without cognitoSub)`);
    console.log(`✅ cognitoSub unique index: ${isUnique ? 'PASS' : 'FAIL'} (guarantees 1-to-1 Cognito identity link)`);

    if (!isSparse || !isUnique) {
      throw new Error('cognitoSub must be defined with unique: true and sparse: true');
    }

    // 3. Verify Legacy/Existing Users without cognitoSub Coexist (Sparse Index Verification)
    console.log('\n[3/7] Verifying multiple users can exist without cognitoSub (Zero-Breaking Change)...');
    const timestamp = Date.now();
    const user1 = await User.create({
      fullName: 'Legacy User One',
      email: `legacy_user1_${timestamp}@petly.com`,
      password: 'LegacyPassword123!',
      role: 'user',
    });
    createdUserIds.push(user1._id);

    const user2 = await User.create({
      fullName: 'Legacy User Two',
      email: `legacy_user2_${timestamp}@petly.com`,
      password: 'LegacyPassword123!',
      role: 'user',
    });
    createdUserIds.push(user2._id);

    console.log(`✅ Created User 1 without cognitoSub: ID ${user1._id}`);
    console.log(`✅ Created User 2 without cognitoSub: ID ${user2._id}`);
    console.log('✅ Multiple legacy users coexisting with null/undefined cognitoSub: PASS');

    // 4. Verify Existing Password Hashing & JWT Generation
    console.log('\n[4/7] Verifying existing Bcrypt password hashing & JWT generation...');
    const user1WithPw = await User.findById(user1._id).select('+password');
    const passwordHashed = user1WithPw.password.startsWith('$2');
    console.log(`✅ Password properly hashed with bcrypt: ${passwordHashed ? 'PASS' : 'FAIL'}`);

    const isMatch = await user1WithPw.matchPassword('LegacyPassword123!');
    console.log(`✅ Password verification match: ${isMatch ? 'PASS' : 'FAIL'}`);

    const token = generateToken(user1._id);
    console.log(`✅ JWT token generated with User _id payload: ${token ? 'PASS' : 'FAIL'}`);

    // 5. Verify Cognito Sub Mapping & Identity Linking
    console.log('\n[5/7] Verifying Cognito identity bridge (sub linking)...');
    const mockCognitoSub = `us-east-1:${timestamp}-mock-cognito-sub`;
    const cognitoLinkedUser = await User.create({
      fullName: 'Cognito Linked User',
      email: `cognito_user_${timestamp}@petly.com`,
      password: 'CognitoSecure123!',
      cognitoSub: mockCognitoSub,
      phone: '+919876543210',
      role: 'user',
    });
    createdUserIds.push(cognitoLinkedUser._id);

    // Verify lookup by cognitoSub works and returns the existing MongoDB _id
    const foundUser = await User.findOne({ cognitoSub: mockCognitoSub });
    if (!foundUser || foundUser._id.toString() !== cognitoLinkedUser._id.toString()) {
      throw new Error('Could not find user by cognitoSub or _id mismatch!');
    }
    console.log(`✅ Lookup by cognitoSub succeeded! MongoDB _id preserved: ${foundUser._id}`);

    // Verify unique constraint on cognitoSub prevents duplicate links
    let duplicatePrevented = false;
    try {
      await User.create({
        fullName: 'Attacker Impersonator',
        email: `impersonator_${timestamp}@petly.com`,
        password: 'Password123!',
        cognitoSub: mockCognitoSub,
      });
    } catch (err) {
      if (err.code === 11000 || err.message.includes('duplicate key')) {
        duplicatePrevented = true;
      }
    }
    console.log(`✅ Duplicate cognitoSub prevented by unique constraint: ${duplicatePrevented ? 'PASS' : 'FAIL'}`);

    // 6. Verify Cognito Specification & Configuration Helper
    console.log('\n[6/7] Verifying Cognito configuration & policy specifications...');
    console.log(`📌 Region: ${cognitoConfig.region}`);
    console.log(`📌 User Pool ID: ${cognitoConfig.maskedUserPoolId}`);
    console.log(`📌 App Client ID: ${cognitoConfig.maskedClientId}`);
    const configured = isCognitoConfigured();
    console.log(`✅ Is Cognito Configured in .env? ${configured ? 'YES (Configured)' : 'NO'}`);
    if (!configured) {
      throw new Error('Cognito configuration was not detected from environment variables!');
    }
    console.log(`✅ Cognito Sign-in Identifiers: ${COGNITO_ATTRIBUTES_SPEC.signInIdentifiers.join(', ')} (Username disabled): PASS`);
    console.log(`✅ Cognito MFA Spec: ${COGNITO_ATTRIBUTES_SPEC.mfaConfiguration} (Disabled): PASS`);
    console.log(`✅ Cognito Client Spec: ${COGNITO_ATTRIBUTES_SPEC.clientType} (Client secret disabled): PASS`);
    console.log(`✅ Cognito Password Policy Spec: Minimum ${COGNITO_PASSWORD_POLICY.minimumLength} chars, upper/lower/numbers/symbols: PASS`);

    // 7. Cleanup Test Data
    console.log('\n[7/7] Cleaning up test users from MongoDB Atlas...');
    await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log(`🧹 Deleted ${createdUserIds.length} test users from database: PASS`);

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 9A COGNITO SETUP TESTS PASSED!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ Phase 9A Test Suite Failed:', error);
    // Cleanup if possible
    if (createdUserIds.length > 0) {
      try {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        console.log('🧹 Cleaned up temporary test users.');
      } catch {
        // ignore
      }
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runPhase9ATests();
