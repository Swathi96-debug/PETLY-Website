import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runWeightTest() {
  console.log('--- STARTING WEIGHT RECORD & WEIGHT PULSE VERIFICATION ---');

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Authenticate user
  const email = `weighttest_${Date.now()}@petly.com`;
  const registerRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Weight Tester',
      email,
      password: 'Password123!',
      role: 'pet_parent',
    }),
  });
  const registerData = await registerRes.json();
  const token = registerData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Create Pet
  const petRes = await fetch(`${BASE_URL}/pets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'WeightPulse Pet',
      species: 'dog',
      breed: 'Labrador',
      age: 2,
      gender: 'Male',
    }),
  });
  const petData = await petRes.json();
  const petId = petData.pet?._id || petData.pet?.id;
  console.log('Created test pet:', petId);

  // 3. Post the three weight records
  const recordsToCreate = [
    { date: '2026-07-20', weight: '6.8' },
    { date: '2026-08-20', weight: '7.2' },
    { date: '2026-09-20', weight: '7.5' },
  ];

  const createdIds = [];
  for (const r of recordsToCreate) {
    console.log(`Saving weight record: Date ${r.date} -> ${r.weight} kg...`);
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        pet: petId,
        type: 'weight',
        title: 'Weight Measurement',
        value: r.weight,
        date: new Date(r.date).toISOString(),
      }),
    });
    const data = await res.json();
    if (res.status !== 201) {
      throw new Error(`Failed to save weight record: ${JSON.stringify(data)}`);
    }
    createdIds.push(data.healthRecord._id);
  }

  // 4. Verify MongoDB directly
  console.log('\n--- VERIFYING IN MONGODB ---');
  const dbRecords = await HealthRecord.find({ _id: { $in: createdIds } }).sort({ date: 1 });
  console.log(`Found ${dbRecords.length} records in MongoDB:`);
  
  for (const rec of dbRecords) {
    const dStr = rec.date.toISOString().split('T')[0];
    console.log(`- Date: ${dStr}, Value: ${rec.value} kg, Type: ${rec.type}`);
  }

  if (dbRecords.length !== 3) {
    throw new Error(`Expected 3 records in MongoDB, found ${dbRecords.length}`);
  }

  // Check months & values
  const monthNames = dbRecords.map(r => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(r.date));
  console.log('Recorded months:', monthNames);
  if (monthNames[0] !== 'Jul' || monthNames[1] !== 'Aug' || monthNames[2] !== 'Sep') {
    throw new Error(`Month mapping mismatch: ${JSON.stringify(monthNames)}`);
  }

  if (dbRecords[0].value !== '6.8' || dbRecords[1].value !== '7.2' || dbRecords[2].value !== '7.5') {
    throw new Error('Weight values do not match expected 6.8, 7.2, 7.5');
  }

  // 5. Verify Latest Weight calculation
  const latestDbRecord = dbRecords[dbRecords.length - 1];
  console.log(`Current/latest weight: ${latestDbRecord.value} kg (from ${latestDbRecord.date.toISOString().split('T')[0]})`);
  if (parseFloat(latestDbRecord.value) !== 7.5) {
    throw new Error(`Expected latest weight to be 7.5 kg, got ${latestDbRecord.value}`);
  }

  // Cleanup
  await HealthRecord.deleteMany({ _id: { $in: createdIds } });
  await Pet.findByIdAndDelete(petId);
  await User.findOneAndDelete({ email });
  await mongoose.disconnect();

  console.log('\n✅ ALL WEIGHT PULSE AND PERSISTENCE VERIFICATIONS PASSED!');
}

runWeightTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
