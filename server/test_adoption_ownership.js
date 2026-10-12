import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Pet from './models/Pet.js';
import AdoptionListing from './models/AdoptionListing.js';
import AdoptionApplication from './models/AdoptionApplication.js';
import HealthRecord from './models/HealthRecord.js';
import MedicalDocument from './models/MedicalDocument.js';
import generateToken from './utils/generateToken.js';
import { migrateApprovedAdoption } from './utils/adoptionMigration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000';

const runAdoptionOwnershipTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 10C ADOPTION OWNERSHIP & HISTORY TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];
  const createdPetIds = [];
  const createdListingIds = [];
  const createdApplicationIds = [];
  const createdHealthRecordIds = [];
  const createdMedicalDocIds = [];

  try {
    console.log('\n[Init] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    const timestamp = Date.now();

    // 1. Create User A (Shelter / Original Owner)
    const userA = await User.create({
      fullName: 'Shelter Sarah',
      email: `sarah_${timestamp}@petly.com`,
      phone: '+919876543290',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userA._id);
    const tokenA = generateToken(userA._id);

    // 2. Create User B (Adopter)
    const userB = await User.create({
      fullName: 'Adopter Alex',
      email: `alex_${timestamp}@petly.com`,
      phone: '+919876543291',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userB._id);
    const tokenB = generateToken(userB._id);

    // 3. Create Pet owned by User A
    const pet = await Pet.create({
      name: `Koda_${timestamp}`,
      species: 'Dog',
      breed: 'Siberian Husky',
      age: 2,
      gender: 'Male',
      weight: 22,
      description: 'Energetic and playful husky.',
      healthStatus: 'Healthy',
      themeColor: 'blue',
      isAdoptable: true,
      owner: userA._id,
    });
    createdPetIds.push(pet._id);

    // 4. Create AdoptionListing for Pet
    const listing = await AdoptionListing.create({
      pet: pet._id,
      shelter: userA._id,
      title: `Adopt Koda - ${timestamp}`,
      description: 'Looking for a loving active family.',
      adoptionFee: 50,
      status: 'available',
    });
    createdListingIds.push(listing._id);

    // 5. Create Pre-Adoption HealthRecord created by User A
    const preHealthRecord = await HealthRecord.create({
      pet: pet._id,
      owner: userA._id,
      type: 'vaccination',
      title: 'Initial Rabies Vaccine',
      description: 'First annual dose administered by Shelter Sarah',
      date: new Date('2025-01-15'),
      status: 'completed',
    });
    createdHealthRecordIds.push(preHealthRecord._id);

    // 6. Create Pre-Adoption MedicalDocument created by User A
    const preMedicalDoc = await MedicalDocument.create({
      pet: pet._id,
      owner: userA._id,
      title: 'Rabies Certificate 2025',
      category: 'vaccine_certificate',
      s3Key: `documents/${userA._id}/rabies_cert_${timestamp}.pdf`,
      originalName: 'rabies_cert.pdf',
      contentType: 'application/pdf',
      size: 10240,
      notes: 'Signed by Dr. Clark',
    });
    createdMedicalDocIds.push(preMedicalDoc._id);

    // 7. Create AdoptionApplication by User B
    const application = await AdoptionApplication.create({
      applicant: userB._id,
      listing: listing._id,
      pet: pet._id,
      shelter: userA._id,
      status: 'pending',
      livingSituation: 'Spacious home with fenced yard',
      experience: 'Experienced husky owner',
      phone: '+919876543291',
    });
    createdApplicationIds.push(application._id);

    console.log(`✅ Test entities initialized (Pet: ${pet.name}, Shelter: User A, Adopter: User B).`);

    // ==========================================
    // TEST 1: Approve Adoption Application
    // ==========================================
    console.log('\n[Test 1] User A approves adoption application for User B...');
    const resApprove = await fetch(`${API_BASE}/api/adoption/applications/${application._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'approved', notes: 'Approved for loving home' }),
    });
    const dataApprove = await resApprove.json();

    if (resApprove.status !== 200 || !dataApprove.success) {
      throw new Error(`Test 1 Failed: Approval returned status ${resApprove.status}: ${dataApprove.message}`);
    }

    // Verify Pet state in database
    const dbPet = await Pet.findById(pet._id);
    if (!dbPet) throw new Error('Test 1 Failed: Pet document missing in database.');
    if (dbPet._id.toString() !== pet._id.toString()) throw new Error('Test 1 Failed: Pet _id was not preserved.');
    if (dbPet.owner.toString() !== userB._id.toString()) throw new Error(`Test 1 Failed: Pet owner not transferred to Adopter. Expected ${userB._id}, got ${dbPet.owner}`);
    if (dbPet.adoptionStatus !== 'ADOPTED') throw new Error(`Test 1 Failed: adoptionStatus not ADOPTED, got: ${dbPet.adoptionStatus}`);
    if (dbPet.isAdoptable !== false) throw new Error('Test 1 Failed: isAdoptable was not set to false.');
    if (dbPet.originalOwner.toString() !== userA._id.toString()) throw new Error(`Test 1 Failed: originalOwner not preserved. Expected ${userA._id}, got ${dbPet.originalOwner}`);
    if (!dbPet.preAdoptionSnapshot || dbPet.preAdoptionSnapshot.name !== pet.name) throw new Error('Test 1 Failed: preAdoptionSnapshot not captured correctly.');
    if (!Array.isArray(dbPet.adoptionHistory) || dbPet.adoptionHistory.length !== 1) throw new Error('Test 1 Failed: adoptionHistory entry not created.');

    // Verify AdoptionApplication & Listing preserved
    const dbApp = await AdoptionApplication.findById(application._id);
    if (!dbApp || dbApp.status !== 'approved') throw new Error('Test 1 Failed: AdoptionApplication was not preserved with status approved.');
    const dbListing = await AdoptionListing.findById(listing._id);
    if (!dbListing || dbListing.status !== 'adopted') throw new Error('Test 1 Failed: AdoptionListing was not updated to adopted.');

    // Verify pre-adoption records tagged as historical
    const dbPreHealth = await HealthRecord.findById(preHealthRecord._id);
    if (!dbPreHealth.isHistorical) throw new Error('Test 1 Failed: Pre-adoption HealthRecord was not tagged isHistorical: true.');
    if (dbPreHealth.preAdoptionOwner?.toString() !== userA._id.toString()) throw new Error('Test 1 Failed: preAdoptionOwner not set on HealthRecord.');

    const dbPreDoc = await MedicalDocument.findById(preMedicalDoc._id);
    if (!dbPreDoc.isHistorical) throw new Error('Test 1 Failed: Pre-adoption MedicalDocument was not tagged isHistorical: true.');
    if (dbPreDoc.preAdoptionOwner?.toString() !== userA._id.toString()) throw new Error('Test 1 Failed: preAdoptionOwner not set on MedicalDocument.');

    console.log('✅ Test 1 Passed: Ownership transferred to User B, same Pet _id preserved, pre-adoption snapshot recorded, historical records tagged.');

    // ==========================================
    // TEST 2: Idempotency (Repeat Approval)
    // ==========================================
    console.log('\n[Test 2] Testing idempotency of adoption approval...');
    const resIdempotent = await fetch(`${API_BASE}/api/adoption/applications/${application._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    const dataIdempotent = await resIdempotent.json();
    if (resIdempotent.status !== 200) throw new Error(`Test 2 Failed: Repeat approval returned status ${resIdempotent.status}`);

    const dbPetIdempotent = await Pet.findById(pet._id);
    if (dbPetIdempotent.adoptionHistory.length !== 1) {
      throw new Error(`Test 2 Failed: adoptionHistory duplicated. Expected 1 entry, got ${dbPetIdempotent.adoptionHistory.length}`);
    }
    if (dbPetIdempotent.originalOwner.toString() !== userA._id.toString()) {
      throw new Error('Test 2 Failed: originalOwner overwritten on duplicate approval.');
    }
    console.log('✅ Test 2 Passed: Repeat approval is idempotent; no duplicate history entries or overwritten snapshots.');

    // ==========================================
    // TEST 3: Previous Owner cannot modify or delete Pet
    // ==========================================
    console.log('\n[Test 3] Verifying previous owner (User A) is blocked from editing or deleting adopted Pet...');
    const resPrevEdit = await fetch(`${API_BASE}/api/pets/${pet._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: 'TamperedName' }),
    });
    if (resPrevEdit.status !== 403) {
      throw new Error(`Test 3 Failed: Previous owner edit expected 403, got ${resPrevEdit.status}`);
    }

    const resPrevDelete = await fetch(`${API_BASE}/api/pets/${pet._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    if (resPrevDelete.status !== 403) {
      throw new Error(`Test 3 Failed: Previous owner delete expected 403, got ${resPrevDelete.status}`);
    }
    console.log('✅ Test 3 Passed: Previous owner cannot modify (403) or delete (403) the adopted pet.');

    // ==========================================
    // TEST 4: Previous Owner cannot add or modify pet records
    // ==========================================
    console.log('\n[Test 4] Verifying previous owner cannot add or modify health/medical records for adopted pet...');
    const resPrevAddHealth = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        pet: pet._id,
        type: 'weight',
        title: 'Unauthorized Weight',
        value: '25',
      }),
    });
    if (resPrevAddHealth.status !== 403) {
      throw new Error(`Test 4 Failed: Previous owner add health expected 403, got ${resPrevAddHealth.status}`);
    }

    const resPrevEditHealth = await fetch(`${API_BASE}/api/health/${preHealthRecord._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ title: 'Tampered Vaccine' }),
    });
    if (resPrevEditHealth.status !== 403) {
      throw new Error(`Test 4 Failed: Previous owner modify historical health record expected 403, got ${resPrevEditHealth.status}`);
    }

    const resPrevDeleteHealth = await fetch(`${API_BASE}/api/health/${preHealthRecord._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    if (resPrevDeleteHealth.status !== 403) {
      throw new Error(`Test 4 Failed: Previous owner delete historical health record expected 403, got ${resPrevDeleteHealth.status}`);
    }

    const resPrevDeleteDoc = await fetch(`${API_BASE}/api/documents/${preMedicalDoc._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    if (resPrevDeleteDoc.status !== 403) {
      throw new Error(`Test 4 Failed: Previous owner delete historical document expected 403, got ${resPrevDeleteDoc.status}`);
    }
    console.log('✅ Test 4 Passed: Previous owner cannot add or modify/delete historical health/medical records (all 403).');

    // ==========================================
    // TEST 5: Adopter can VIEW pre-adoption HealthRecords and MedicalDocuments
    // ==========================================
    console.log('\n[Test 5] Verifying adopter (User B) can view pre-adoption health and medical records...');
    const resAdopterHealthList = await fetch(`${API_BASE}/api/health?pet=${pet._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const dataAdopterHealthList = await resAdopterHealthList.json();
    if (resAdopterHealthList.status !== 200 || !dataAdopterHealthList.success) {
      throw new Error(`Test 5 Failed: Adopter failed to fetch health records list: ${dataAdopterHealthList.message}`);
    }
    const foundHistoricalHealth = dataAdopterHealthList.records.find(r => r._id.toString() === preHealthRecord._id.toString());
    if (!foundHistoricalHealth || !foundHistoricalHealth.isHistorical) {
      throw new Error('Test 5 Failed: Pre-adoption health record not found in adopter list or missing isHistorical: true.');
    }

    const resAdopterSingleHealth = await fetch(`${API_BASE}/api/health/${preHealthRecord._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (resAdopterSingleHealth.status !== 200) {
      throw new Error(`Test 5 Failed: Adopter view single health record returned ${resAdopterSingleHealth.status}`);
    }

    const resAdopterDocList = await fetch(`${API_BASE}/api/documents?pet=${pet._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const dataAdopterDocList = await resAdopterDocList.json();
    if (resAdopterDocList.status !== 200 || !dataAdopterDocList.success) {
      throw new Error(`Test 5 Failed: Adopter failed to fetch medical documents list: ${dataAdopterDocList.message}`);
    }
    const foundHistoricalDoc = dataAdopterDocList.documents.find(d => d._id.toString() === preMedicalDoc._id.toString());
    if (!foundHistoricalDoc || !foundHistoricalDoc.isHistorical) {
      throw new Error('Test 5 Failed: Pre-adoption medical document not found in adopter list or missing isHistorical: true.');
    }

    console.log('✅ Test 5 Passed: Adopter can view pre-adoption HealthRecords and MedicalDocuments with isHistorical flag.');

    // ==========================================
    // TEST 6: Adopter CANNOT edit or delete historical records
    // ==========================================
    console.log('\n[Test 6] Verifying adopter CANNOT edit or delete pre-adoption historical records...');
    const resAdopterEditHistorical = await fetch(`${API_BASE}/api/health/${preHealthRecord._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ title: 'Adopter Changed Historical' }),
    });
    if (resAdopterEditHistorical.status !== 403) {
      throw new Error(`Test 6 Failed: Adopter editing historical record expected 403, got ${resAdopterEditHistorical.status}`);
    }

    const resAdopterDeleteHistorical = await fetch(`${API_BASE}/api/health/${preHealthRecord._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (resAdopterDeleteHistorical.status !== 403) {
      throw new Error(`Test 6 Failed: Adopter deleting historical record expected 403, got ${resAdopterDeleteHistorical.status}`);
    }

    const resAdopterDeleteDoc = await fetch(`${API_BASE}/api/documents/${preMedicalDoc._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (resAdopterDeleteDoc.status !== 403) {
      throw new Error(`Test 6 Failed: Adopter deleting historical document expected 403, got ${resAdopterDeleteDoc.status}`);
    }
    console.log('✅ Test 6 Passed: Adopter cannot edit or delete pre-adoption historical records (all 403).');

    // ==========================================
    // TEST 7: Adopter CAN edit current Pet details
    // ==========================================
    console.log('\n[Test 7] Verifying adopter CAN edit current pet details...');
    const resAdopterEditPet = await fetch(`${API_BASE}/api/pets/${pet._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        weight: 24.5,
        color: 'Silver & White',
        description: 'Happy husky settled into new home.',
      }),
    });
    const dataAdopterEditPet = await resAdopterEditPet.json();
    if (resAdopterEditPet.status !== 200 || !dataAdopterEditPet.success) {
      throw new Error(`Test 7 Failed: Adopter edit pet returned ${resAdopterEditPet.status}: ${dataAdopterEditPet.message}`);
    }

    const dbPetUpdated = await Pet.findById(pet._id);
    if (dbPetUpdated.weight !== 24.5 || dbPetUpdated.color !== 'Silver & White') {
      throw new Error('Test 7 Failed: Updated fields were not persisted.');
    }
    console.log('✅ Test 7 Passed: Adopter successfully edited current pet details (weight: 24.5 kg, color: Silver & White).');

    // ==========================================
    // TEST 8: Adopter CAN add new HealthRecords and MedicalDocuments
    // ==========================================
    console.log('\n[Test 8] Verifying adopter can add new HealthRecords and MedicalDocuments...');
    const resNewHealth = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        pet: pet._id,
        type: 'weight',
        title: 'Home Weight Check',
        value: '24.5',
        date: new Date().toISOString(),
      }),
    });
    const dataNewHealth = await resNewHealth.json();
    if (resNewHealth.status !== 201 || !dataNewHealth.success) {
      throw new Error(`Test 8 Failed: Adopter adding health record returned ${resNewHealth.status}: ${dataNewHealth.message}`);
    }
    createdHealthRecordIds.push(dataNewHealth.healthRecord._id);
    if (dataNewHealth.healthRecord.isHistorical === true) {
      throw new Error('Test 8 Failed: New health record should have isHistorical: false.');
    }

    const resNewDoc = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        pet: pet._id,
        title: 'Adopter New Vet Checkup',
        category: 'prescription',
        s3Key: `documents/${userB._id}/new_checkup_${timestamp}.pdf`,
        originalName: 'new_checkup.pdf',
        contentType: 'application/pdf',
        size: 5120,
      }),
    });
    const dataNewDoc = await resNewDoc.json();
    if (resNewDoc.status !== 201 || !dataNewDoc.success) {
      throw new Error(`Test 8 Failed: Adopter adding document returned ${resNewDoc.status}: ${dataNewDoc.message}`);
    }
    createdMedicalDocIds.push(dataNewDoc.document._id);
    if (dataNewDoc.document.isHistorical === true) {
      throw new Error('Test 8 Failed: New document should have isHistorical: false.');
    }

    // Adopter can delete their OWN new record
    const resDeleteOwnHealth = await fetch(`${API_BASE}/api/health/${dataNewHealth.healthRecord._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (resDeleteOwnHealth.status !== 200) {
      throw new Error(`Test 8 Failed: Adopter deleting own new record returned ${resDeleteOwnHealth.status}`);
    }

    console.log('✅ Test 8 Passed: Adopter can add new HealthRecords and MedicalDocuments, and delete their own new records.');

    // ==========================================
    // TEST 9: Migration of Pre-Approved Legacy Adoption (Fluffy Case)
    // ==========================================
    console.log('\n[Test 9] Verifying migration of already-approved legacy adoption...');
    // 1. Create Shelter Charlie (User C) and Adopter Dana (User D)
    const userC = await User.create({
      fullName: 'Shelter Charlie',
      email: `charlie_${timestamp}@petly.com`,
      phone: '+919876543292',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userC._id);
    const tokenC = generateToken(userC._id);

    const userD = await User.create({
      fullName: 'Adopter Dana',
      email: `dana_${timestamp}@petly.com`,
      phone: '+919876543293',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userD._id);
    const tokenD = generateToken(userD._id);

    // 2. Create Pet owned by User C before Phase 10C
    const petLegacy = await Pet.create({
      name: `LegacyFluffy_${timestamp}`,
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Female',
      weight: 18.5,
      description: 'Pre-migration friendly rescue pet.',
      healthStatus: 'Healthy',
      themeColor: 'purple',
      isAdoptable: false, // Old controller set this to false upon approval
      owner: userC._id,   // Old controller did NOT transfer owner
    });
    createdPetIds.push(petLegacy._id);

    // 3. Pre-migration HealthRecord & MedicalDoc
    const legacyHealth = await HealthRecord.create({
      pet: petLegacy._id,
      owner: userC._id,
      type: 'vaccination',
      title: 'Legacy DHPP Vaccine',
      description: 'Administered before Phase 10C',
      date: new Date('2024-11-10'),
      isHistorical: false,
    });
    createdHealthRecordIds.push(legacyHealth._id);

    const legacyDoc = await MedicalDocument.create({
      pet: petLegacy._id,
      owner: userC._id,
      title: 'Legacy Deworming Certificate',
      category: 'vaccine_certificate',
      s3Key: `documents/${userC._id}/legacy_cert_${timestamp}.pdf`,
      originalName: 'deworming.pdf',
      contentType: 'application/pdf',
      size: 1024,
      isHistorical: false,
    });
    createdMedicalDocIds.push(legacyDoc._id);

    // 4. Listing and approved application
    const legacyListing = await AdoptionListing.create({
      pet: petLegacy._id,
      shelter: userC._id,
      title: `Adopt Legacy Pet - ${timestamp}`,
      description: 'Already adopted listing',
      adoptionFee: 0,
      status: 'adopted',
    });
    createdListingIds.push(legacyListing._id);

    const legacyApplication = await AdoptionApplication.create({
      pet: petLegacy._id,
      applicant: userD._id,
      shelter: userC._id,
      listing: legacyListing._id,
      fullName: 'Adopter Dana',
      email: userD.email,
      phone: userD.phone,
      address: '100 Rescue Way',
      housingType: 'House',
      hasYard: true,
      ownOrRent: 'Own',
      landlordApproval: true,
      hasOtherPets: false,
      experienceDescription: 'Lifelong pet owner',
      hoursAlonePerDay: 2,
      emergencyCarePlan: 'Family vet nearby',
      status: 'approved',
    });
    createdApplicationIds.push(legacyApplication._id);

    // Verify pre-migration state is unmigrated
    if (petLegacy.owner.toString() !== userC._id.toString()) {
      throw new Error('Test 9 Failed: Pet should initially be owned by Shelter Charlie.');
    }
    if (petLegacy.adoptionStatus === 'ADOPTED') {
      throw new Error('Test 9 Failed: Pet should not have adoptionStatus: ADOPTED before migration.');
    }

    // 5. Execute Migration
    const migrationResult = await migrateApprovedAdoption(petLegacy._id);
    if (!migrationResult.success) {
      throw new Error('Test 9 Failed: migrateApprovedAdoption returned false.');
    }

    // 6. Verify MongoDB record after migration
    const petMigrated = await Pet.findById(petLegacy._id);
    if (petMigrated.owner.toString() !== userD._id.toString()) {
      throw new Error(`Test 9 Failed: Pet owner was not transferred to Adopter Dana (${userD._id}). Got: ${petMigrated.owner}`);
    }
    if (petMigrated.adoptionStatus !== 'ADOPTED') {
      throw new Error(`Test 9 Failed: Pet adoptionStatus is ${petMigrated.adoptionStatus}, expected ADOPTED.`);
    }
    if (petMigrated.originalOwner.toString() !== userC._id.toString()) {
      throw new Error(`Test 9 Failed: Pet originalOwner should be Shelter Charlie (${userC._id}).`);
    }
    if (!petMigrated.preAdoptionSnapshot || petMigrated.preAdoptionSnapshot.breed !== 'Golden Retriever') {
      throw new Error('Test 9 Failed: Pre-adoption snapshot was not properly captured.');
    }
    if (!petMigrated.adoptionHistory || petMigrated.adoptionHistory.length !== 1) {
      throw new Error(`Test 9 Failed: adoptionHistory count is ${petMigrated.adoptionHistory?.length}, expected 1.`);
    }

    // Verify historical records tagging
    const healthAfterMig = await HealthRecord.findById(legacyHealth._id);
    if (!healthAfterMig.isHistorical || healthAfterMig.preAdoptionOwner.toString() !== userC._id.toString()) {
      throw new Error('Test 9 Failed: Pre-adoption health record was not tagged as historical.');
    }
    const docAfterMig = await MedicalDocument.findById(legacyDoc._id);
    if (!docAfterMig.isHistorical || docAfterMig.preAdoptionOwner.toString() !== userC._id.toString()) {
      throw new Error('Test 9 Failed: Pre-adoption medical document was not tagged as historical.');
    }

    // 7. Verify Idempotency of Migration
    const secondMigResult = await migrateApprovedAdoption(petLegacy._id);
    const petAfterSecondMig = await Pet.findById(petLegacy._id);
    if (petAfterSecondMig.adoptionHistory.length !== 1) {
      throw new Error(`Test 9 Failed: Second migration duplicated history entries (${petAfterSecondMig.adoptionHistory.length}).`);
    }
    if (petAfterSecondMig.originalOwner.toString() !== userC._id.toString()) {
      throw new Error('Test 9 Failed: Second migration altered originalOwner.');
    }

    // 8. Verify API Authorization:
    // Original owner (User C) CANNOT edit pet
    const resOrigEdit = await fetch(`${API_BASE}/api/pets/${petLegacy._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({ description: 'Hacked description' }),
    });
    if (resOrigEdit.status !== 403) {
      throw new Error(`Test 9 Failed: Original owner edit should be 403, got ${resOrigEdit.status}`);
    }

    // Original owner (User C) CANNOT delete pet
    const resOrigDelete = await fetch(`${API_BASE}/api/pets/${petLegacy._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    if (resOrigDelete.status !== 403) {
      throw new Error(`Test 9 Failed: Original owner delete should be 403, got ${resOrigDelete.status}`);
    }

    // Original owner (User C) CANNOT add health records to adopted pet
    const resOrigAddHealth = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({
        pet: petLegacy._id,
        type: 'general',
        title: 'Unauthorized Vet Checkup',
        date: new Date().toISOString(),
      }),
    });
    if (resOrigAddHealth.status !== 403) {
      throw new Error(`Test 9 Failed: Original owner adding health record should be 403, got ${resOrigAddHealth.status}`);
    }

    // Original owner (User C) CANNOT add medical documents to adopted pet
    const resOrigAddDoc = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenC}` },
      body: JSON.stringify({
        pet: petLegacy._id,
        title: 'Unauthorized Document',
        category: 'prescription',
        s3Key: `documents/${userC._id}/unauth.pdf`,
        originalName: 'unauth.pdf',
        contentType: 'application/pdf',
        size: 500,
      }),
    });
    if (resOrigAddDoc.status !== 403) {
      throw new Error(`Test 9 Failed: Original owner adding document should be 403, got ${resOrigAddDoc.status}`);
    }

    // Original owner My Pets (GET /api/pets) must NOT contain the migrated pet
    const resOrigPets = await fetch(`${API_BASE}/api/pets`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const dataOrigPets = await resOrigPets.json();
    const origHasPet = dataOrigPets.pets?.some(p => p._id.toString() === petLegacy._id.toString());
    if (origHasPet) {
      throw new Error('Test 9 Failed: Migrated pet still appears in original owner My Pets.');
    }

    // Adopter Dana My Pets (GET /api/pets) MUST contain the migrated pet with adoptionStatus === 'ADOPTED'
    const resAdopterPets = await fetch(`${API_BASE}/api/pets`, {
      headers: { Authorization: `Bearer ${tokenD}` },
    });
    const dataAdopterPets = await resAdopterPets.json();
    const adopterPet = dataAdopterPets.pets?.find(p => p._id.toString() === petLegacy._id.toString());
    if (!adopterPet) {
      throw new Error('Test 9 Failed: Migrated pet does not appear in adopter Dana My Pets.');
    }
    if (adopterPet.adoptionStatus !== 'ADOPTED') {
      throw new Error(`Test 9 Failed: Adopter pet adoptionStatus is ${adopterPet.adoptionStatus}, expected ADOPTED.`);
    }

    // Adopter Dana CAN edit current pet details
    const resAdopterEdit = await fetch(`${API_BASE}/api/pets/${petLegacy._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenD}` },
      body: JSON.stringify({ weight: 19.2, description: 'Living happily in new forever home!' }),
    });
    if (resAdopterEdit.status !== 200) {
      throw new Error(`Test 9 Failed: Adopter edit current pet details returned ${resAdopterEdit.status}`);
    }

    // Adopter Dana CAN view historical pre-adoption health records
    const resLegacyViewHealth = await fetch(`${API_BASE}/api/health?pet=${petLegacy._id}`, {
      headers: { Authorization: `Bearer ${tokenD}` },
    });
    const dataLegacyViewHealth = await resLegacyViewHealth.json();
    const histRecord = dataLegacyViewHealth.records?.find(h => h._id.toString() === legacyHealth._id.toString());
    if (!histRecord) {
      throw new Error('Test 9 Failed: Adopter cannot view historical pre-adoption health record.');
    }
    if (!histRecord.isHistorical) {
      throw new Error('Test 9 Failed: Historical record returned isHistorical != true.');
    }

    // Adopter Dana CANNOT edit historical pre-adoption health records
    const resLegacyEditHist = await fetch(`${API_BASE}/api/health/${legacyHealth._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenD}` },
      body: JSON.stringify({ title: 'Modified Historical Title' }),
    });
    if (resLegacyEditHist.status !== 403) {
      throw new Error(`Test 9 Failed: Adopter editing historical health record should return 403, got ${resLegacyEditHist.status}`);
    }

    // Adopter Dana CANNOT delete historical pre-adoption health records
    const resLegacyDeleteHist = await fetch(`${API_BASE}/api/health/${legacyHealth._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenD}` },
    });
    if (resLegacyDeleteHist.status !== 403) {
      throw new Error(`Test 9 Failed: Adopter deleting historical health record should return 403, got ${resLegacyDeleteHist.status}`);
    }

    // Adopter Dana CANNOT delete historical pre-adoption medical document
    const resLegacyDeleteDoc = await fetch(`${API_BASE}/api/documents/${legacyDoc._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenD}` },
    });
    if (resLegacyDeleteDoc.status !== 403) {
      throw new Error(`Test 9 Failed: Adopter deleting historical medical doc should return 403, got ${resLegacyDeleteDoc.status}`);
    }

    console.log('✅ Test 9 Passed: Legacy pre-approved adoption migrated successfully, idempotently, with full authorization checks.');

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 10C ADOPTION OWNERSHIP TESTS PASSED!');
    console.log('====================================================');
  } finally {
    console.log('\n[Cleanup] Cleaning up temporary test data...');
    if (createdHealthRecordIds.length > 0) {
      await HealthRecord.deleteMany({ _id: { $in: createdHealthRecordIds } }).catch(() => {});
    }
    if (createdMedicalDocIds.length > 0) {
      await MedicalDocument.deleteMany({ _id: { $in: createdMedicalDocIds } }).catch(() => {});
    }
    if (createdApplicationIds.length > 0) {
      await AdoptionApplication.deleteMany({ _id: { $in: createdApplicationIds } }).catch(() => {});
    }
    if (createdListingIds.length > 0) {
      await AdoptionListing.deleteMany({ _id: { $in: createdListingIds } }).catch(() => {});
    }
    if (createdPetIds.length > 0) {
      await Pet.deleteMany({ _id: { $in: createdPetIds } }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } }).catch(() => {});
    }
    console.log('🧹 Cleaned up temporary test users, pets, listings, applications, records, and documents.');
    await mongoose.disconnect().catch(() => {});
  }
};

runAdoptionOwnershipTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Test Suite Failed with error:', err);
    process.exit(1);
  });
