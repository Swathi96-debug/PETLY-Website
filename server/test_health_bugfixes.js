import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING FOCUSED HEALTHHUB BUGFIX TESTS ---');
  
  // 1. Connect directly to MongoDB to verify persistence
  await mongoose.connect(process.env.MONGODB_URI);

  // Find or create test user
  const email = `healthtest_${Date.now()}@petly.com`;
  const registerRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Health Tester',
      email,
      password: 'Password123!',
      role: 'pet_parent',
    }),
  });
  const registerData = await registerRes.json();
  if (!registerData.token) {
    throw new Error('Failed to register test user: ' + JSON.stringify(registerData));
  }
  const token = registerData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Create test pet
  const petRes = await fetch(`${BASE_URL}/pets`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Fluffy Tester',
      species: 'dog',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Male',
    }),
  });
  const petData = await petRes.json();
  const petId = petData.pet?._id || petData.pet?.id;
  if (!petId) {
    throw new Error('Failed to create test pet: ' + JSON.stringify(petData));
  }
  console.log(`Created test pet with ID: ${petId}`);

  // TEST 1: Vaccination Upcoming
  console.log('\nTesting Vaccine Upcoming: Rabies Booster, 2027-09-08, status: upcoming...');
  const vaxUpcomingRes = await fetch(`${BASE_URL}/health`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      pet: petId,
      type: 'vaccination',
      title: 'Rabies Booster',
      date: '2027-09-08',
      status: 'upcoming',
    }),
  });
  const vaxUpcomingData = await vaxUpcomingRes.json();
  if (vaxUpcomingRes.status !== 201) {
    throw new Error(`Vaccine Upcoming failed with status ${vaxUpcomingRes.status}: ${JSON.stringify(vaxUpcomingData)}`);
  }
  const vaxUpcomingId = vaxUpcomingData.healthRecord._id;
  console.log('API response status 201:', vaxUpcomingData.healthRecord.title, 'Status:', vaxUpcomingData.healthRecord.status);

  // TEST 2: Vaccination Overdue
  console.log('\nTesting Vaccine Overdue: DHPP Booster, 2025-09-08, status: overdue...');
  const vaxOverdueRes = await fetch(`${BASE_URL}/health`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      pet: petId,
      type: 'vaccination',
      title: 'DHPP Booster',
      date: '2025-09-08',
      status: 'overdue',
    }),
  });
  const vaxOverdueData = await vaxOverdueRes.json();
  if (vaxOverdueRes.status !== 201) {
    throw new Error(`Vaccine Overdue failed with status ${vaxOverdueRes.status}: ${JSON.stringify(vaxOverdueData)}`);
  }
  const vaxOverdueId = vaxOverdueData.healthRecord._id;
  console.log('API response status 201:', vaxOverdueData.healthRecord.title, 'Status:', vaxOverdueData.healthRecord.status);

  // TEST 3: Milestone Completed
  console.log('\nTesting Milestone Completed: Wellness Exam, 2026-09-20, status: completed, notes: Very good...');
  const milestoneRes = await fetch(`${BASE_URL}/health`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      pet: petId,
      type: 'appointment',
      title: 'Wellness Exam',
      date: '2026-09-20',
      status: 'completed',
      notes: 'Very good',
    }),
  });
  const milestoneData = await milestoneRes.json();
  if (milestoneRes.status !== 201) {
    throw new Error(`Milestone failed with status ${milestoneRes.status}: ${JSON.stringify(milestoneData)}`);
  }
  const milestoneId = milestoneData.healthRecord._id;
  console.log('API response status 201:', milestoneData.healthRecord.title, 'Status:', milestoneData.healthRecord.status);

  // VERIFY PERSISTENCE IN MONGODB
  console.log('\n--- VERIFYING PERSISTENCE DIRECTLY IN MONGODB ---');
  const dbVaxUpcoming = await HealthRecord.findById(vaxUpcomingId);
  const dbVaxOverdue = await HealthRecord.findById(vaxOverdueId);
  const dbMilestone = await HealthRecord.findById(milestoneId);

  console.log('MongoDB Vax Upcoming:', {
    title: dbVaxUpcoming.title,
    date: dbVaxUpcoming.date.toISOString().split('T')[0],
    status: dbVaxUpcoming.status,
  });
  if (dbVaxUpcoming.title !== 'Rabies Booster' || dbVaxUpcoming.status !== 'upcoming') {
    throw new Error('MongoDB verification failed for Vax Upcoming');
  }

  console.log('MongoDB Vax Overdue:', {
    title: dbVaxOverdue.title,
    date: dbVaxOverdue.date.toISOString().split('T')[0],
    status: dbVaxOverdue.status,
  });
  if (dbVaxOverdue.title !== 'DHPP Booster' || dbVaxOverdue.status !== 'overdue') {
    throw new Error('MongoDB verification failed for Vax Overdue');
  }

  console.log('MongoDB Milestone:', {
    title: dbMilestone.title,
    date: dbMilestone.date.toISOString().split('T')[0],
    status: dbMilestone.status,
    notes: dbMilestone.notes,
  });
  if (
    dbMilestone.title !== 'Wellness Exam' ||
    dbMilestone.date.toISOString().split('T')[0] !== '2026-09-20' ||
    dbMilestone.status !== 'completed' ||
    dbMilestone.notes !== 'Very good'
  ) {
    throw new Error('MongoDB verification failed for Milestone Completed');
  }

  // Cleanup test records
  await HealthRecord.deleteMany({ _id: { $in: [vaxUpcomingId, vaxOverdueId, milestoneId] } });
  await Pet.findByIdAndDelete(petId);
  await User.findOneAndDelete({ email });
  await mongoose.disconnect();

  console.log('\n✅ ALL FOCUSED TESTS PASSED AND PERSISTENCE VERIFIED IN MONGODB!');
}

runTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
