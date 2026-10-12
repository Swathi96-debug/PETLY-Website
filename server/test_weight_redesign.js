import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runRedesignTests() {
  console.log('====================================================');
  console.log('🧪 WEIGHT PULSE / WELLNESS PROGRESSION YEAR TEST');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Register test user
  const email = `weightyear_${Date.now()}@petly.com`;
  const registerRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Year Tester',
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

  // 2. Create Pet A (Fluffy) and Pet B (Apollo)
  const petARes = await fetch(`${BASE_URL}/pets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Fluffy',
      species: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Male',
    }),
  });
  const petAData = await petARes.json();
  const petAId = petAData.pet._id;

  const petBRes = await fetch(`${BASE_URL}/pets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Apollo',
      species: 'dog',
      breed: 'Husky',
      age: 4,
      gender: 'Male',
    }),
  });
  const petBData = await petBRes.json();
  const petBId = petBData.pet._id;

  console.log(`Created Pet A (Fluffy: ${petAId}) and Pet B (Apollo: ${petBId})`);

  // Helper to post weight record
  const addWeight = async (petId, dateStr, weightVal) => {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        pet: petId,
        type: 'weight',
        title: 'Weight Measurement',
        value: String(weightVal),
        date: new Date(dateStr).toISOString(),
      }),
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Add weight failed: ${JSON.stringify(data)}`);
    return data.healthRecord;
  };

  // 3. Populate test records
  console.log('\nPopulating test records across 2025 and 2026...');
  const r2026_07 = await addWeight(petAId, '2026-07-20', '6.8');
  const r2026_08 = await addWeight(petAId, '2026-08-20', '7.2');
  const r2026_09 = await addWeight(petAId, '2026-09-20', '7.5');
  const r2025_09 = await addWeight(petAId, '2025-09-20', '6.5');
  const rPetB_09 = await addWeight(petBId, '2026-09-20', '15.0');

  // 4. Verify MongoDB Persistence
  const flufRecords = await HealthRecord.find({ pet: petAId, type: 'weight' }).sort({ date: 1, createdAt: 1 });
  console.log(`\nVerified ${flufRecords.length} records in MongoDB for Fluffy:`);
  for (const r of flufRecords) {
    console.log(`  - [${r.date.toISOString().split('T')[0]}] ${r.value} kg (ID: ${r._id})`);
  }
  if (flufRecords.length !== 4) throw new Error(`Expected 4 records for Fluffy, found ${flufRecords.length}`);

  // 5. Test Year-based grouping logic
  const groupWeightByYearAndMonth = (records, year) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = {};
    months.forEach(m => result[m] = null);
    
    // Filter strictly by year
    const yearRecords = records.filter(r => {
      const d = new Date(r.date || r.createdAt);
      return d.getUTCFullYear() === year;
    });

    // Group by month, picking latest measurement in month
    yearRecords.forEach(r => {
      const d = new Date(r.date || r.createdAt);
      const m = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(d);
      result[m] = parseFloat(r.value);
    });

    return result;
  };

  const data2025 = groupWeightByYearAndMonth(flufRecords, 2025);
  const data2026 = groupWeightByYearAndMonth(flufRecords, 2026);

  console.log('\n--- 2025 Chart Projection for Fluffy ---');
  console.log('Sep 2025:', data2025['Sep'], 'kg (Expected: 6.5)');
  if (data2025['Sep'] !== 6.5) throw new Error(`Expected 2025 Sep to be 6.5, got ${data2025['Sep']}`);
  if (data2025['Jul'] !== null || data2025['Aug'] !== null) {
    throw new Error('2025 has non-null points for months without 2025 records!');
  }

  console.log('\n--- 2026 Chart Projection for Fluffy ---');
  console.log('Jul 2026:', data2026['Jul'], 'kg (Expected: 6.8)');
  console.log('Aug 2026:', data2026['Aug'], 'kg (Expected: 7.2)');
  console.log('Sep 2026:', data2026['Sep'], 'kg (Expected: 7.5)');
  if (data2026['Jul'] !== 6.8 || data2026['Aug'] !== 7.2 || data2026['Sep'] !== 7.5) {
    throw new Error('2026 points mismatch expected 6.8, 7.2, 7.5');
  }

  // 6. Test updating September 2026 to 8.0 kg
  console.log('\nAdding updated measurement for September 2026 (8.0 kg)...');
  const r2026_09_updated = await addWeight(petAId, '2026-09-21', '8.0');

  const flufUpdated = await HealthRecord.find({ pet: petAId, type: 'weight' }).sort({ date: 1, createdAt: 1 });
  const data2026_updated = groupWeightByYearAndMonth(flufUpdated, 2026);
  const data2025_untouched = groupWeightByYearAndMonth(flufUpdated, 2025);

  console.log('Sep 2026 updated value:', data2026_updated['Sep'], 'kg (Expected: 8.0)');
  console.log('Sep 2025 untouched value:', data2025_untouched['Sep'], 'kg (Expected: 6.5)');

  if (data2026_updated['Sep'] !== 8.0) throw new Error(`Expected Sep 2026 to be 8.0, got ${data2026_updated['Sep']}`);
  if (data2025_untouched['Sep'] !== 6.5) throw new Error(`Expected Sep 2025 to remain 6.5, got ${data2025_untouched['Sep']}`);

  // 7. Verify Selected Pet Isolation
  const apolloRecords = await HealthRecord.find({ pet: petBId, type: 'weight' });
  const apollo2026 = groupWeightByYearAndMonth(apolloRecords, 2026);
  console.log('\n--- Pet Isolation Check ---');
  console.log('Fluffy latest 2026 Sep:', data2026_updated['Sep'], 'kg');
  console.log('Apollo latest 2026 Sep:', apollo2026['Sep'], 'kg (Expected: 15.0)');
  if (apollo2026['Sep'] !== 15.0) throw new Error('Apollo weight leaked or wrong');

  // 8. Verify Latest Weight
  const allPetARecords = [...flufUpdated].sort((a, b) => {
    const timeA = new Date(a.date || a.createdAt).getTime();
    const timeB = new Date(b.date || b.createdAt).getTime();
    return timeA - timeB;
  });
  const latestWeightFluffy = allPetARecords[allPetARecords.length - 1].value;
  console.log('\nLatest overall weight for Fluffy:', latestWeightFluffy, 'kg (Expected: 8.0)');
  if (parseFloat(latestWeightFluffy) !== 8.0) throw new Error('Latest weight is not 8.0 kg');

  // 9. Cleanup
  await HealthRecord.deleteMany({ pet: { $in: [petAId, petBId] } });
  await Pet.deleteMany({ _id: { $in: [petAId, petBId] } });
  await User.findByIdAndDelete(registerData.user._id);
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('✅ ALL YEAR-BASED WEIGHT & PROGRESSION CHECKS PASSED!');
  console.log('====================================================');
}

runRedesignTests().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
