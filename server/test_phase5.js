import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import petRoutes from './routes/petRoutes.js';
import adoptionRoutes from './routes/adoptionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import User from './models/User.js';
import Pet from './models/Pet.js';
import AdoptionListing from './models/AdoptionListing.js';
import AdoptionApplication from './models/AdoptionApplication.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase5Tests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 5 ADOPTION & APPLICATIONS VERIFICATION');
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

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
  }

  // 1. Connect to MongoDB Atlas
  console.log('[1/8] Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  assert(mongoose.connection.readyState === 1, 'MongoDB Atlas connected');

  // 2. Mount ephemeral server with Auth, Pets, Adoption, and Uploads
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/pets', petRoutes);
  app.use('/api/adoption', adoptionRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  - Test server mounted at ${baseUrl}\n`);

  const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const testStamp = Date.now();
  const userAEmail = `adopt_user_a_${testStamp}@petly.com`;
  const userBEmail = `adopt_user_b_${testStamp}@petly.com`;
  const password = 'StrongPassword123!';

  let tokenA = null;
  let tokenB = null;
  let userAId = null;
  let userBId = null;
  let petAId = null;
  let listingId = null;
  let applicationId = null;

  try {
    // 3. Setup Test Identities
    console.log('[2/8] Setting up Test Identities (User A & User B)...');
    const signupA = await apiCall('/auth/signup', 'POST', {
      fullName: 'Sanctuary Owner User A',
      email: userAEmail,
      password,
    });
    assert(signupA.status === 201, 'Created User A (Sanctuary Owner)');
    tokenA = signupA.data.token;
    userAId = signupA.data.user._id;

    const signupB = await apiCall('/auth/signup', 'POST', {
      fullName: 'Prospective Adopter User B',
      email: userBEmail,
      password,
    });
    assert(signupB.status === 201, 'Created User B (Adopter)');
    tokenB = signupB.data.token;
    userBId = signupB.data.user._id;

    // Create a pet for User A
    const petRes = await apiCall('/pets', 'POST', {
      name: 'Shadow',
      species: 'Dog',
      breed: 'Siberian Husky',
      age: 2,
      gender: 'Male',
      weight: 24,
      themeColor: 'blue',
      description: 'Energetic and friendly rescue husky looking for an active guardian.',
      photoKey: `adoption/${userAId}/husky.jpg`,
    }, tokenA);
    assert(petRes.status === 201, 'Created Pet (Shadow) for User A');
    petAId = petRes.data.pet._id;

    // 4. Adoption Listing Creation & Pet Ownership Enforcement
    console.log('\n[3/8] Testing Adoption Listing Creation & Pet Ownership Security...');
    // User B tries to create listing for User A's pet -> MUST FAIL with 403
    const hijackListing = await apiCall('/adoption', 'POST', {
      pet: petAId,
      title: 'Unauthorized listing attempt by User B',
      description: 'This must be blocked',
      adoptionFee: 100,
    }, tokenB);
    assert(hijackListing.status === 403, 'Cross-user listing creation blocked with 403 Forbidden');

    // User A creates listing for their own pet -> SUCСEEDS with 201
    const createListing = await apiCall('/adoption', 'POST', {
      pet: petAId,
      title: 'Shadow The Friendly Siberian Husky',
      description: 'Well-trained, vaccinated, loves snow and long walks in the park.',
      adoptionFee: 120,
      requirements: ['Fenced backyard', 'Daily exercise', 'Experienced guardian'],
      location: 'Northern Sanctuary, WA',
    }, tokenA);
    assert(createListing.status === 201, 'Owner User A created adoption listing');
    assert(createListing.data.listing?.title === 'Shadow The Friendly Siberian Husky', 'Listing title preserved');
    assert(createListing.data.listing?.status === 'available', 'Listing status initialized as available');
    listingId = createListing.data.listing?._id;

    // Verify pet was marked isAdoptable in database
    const updatedPet = await Pet.findById(petAId);
    assert(updatedPet.isAdoptable === true, 'Pet automatically marked isAdoptable in MongoDB');

    // Prevent duplicate active listing for same pet
    const dupListing = await apiCall('/adoption', 'POST', {
      pet: petAId,
      title: 'Duplicate listing attempt',
      description: 'Should fail',
    }, tokenA);
    assert(dupListing.status === 400, 'Duplicate active listing for same pet rejected with 400');

    // 5. Adoption Listing Browsing & Retrieval
    console.log('\n[4/8] Testing Adoption Listing Retrieval & Species Filtering...');
    const allListings = await apiCall('/adoption', 'GET');
    assert(allListings.status === 200, 'Public GET /api/adoption returns 200 OK');
    assert(Array.isArray(allListings.data.listings), 'Adoption listings returned as array');
    const found = allListings.data.listings.find(l => l._id === listingId);
    assert(found !== undefined, 'Created listing appears in global adoption directory');
    assert(found.pet?.name === 'Shadow', 'Listing includes populated pet details');
    assert(found.shelter?.fullName === 'Sanctuary Owner User A', 'Listing includes populated shelter owner details');

    // Single listing by ID
    const singleListing = await apiCall(`/adoption/${listingId}`, 'GET');
    assert(singleListing.status === 200, 'GET /api/adoption/:id returns single listing');
    assert(singleListing.data.listing?.pet?.name === 'Shadow', 'Single listing populated pet verified');

    // 6. Adoption Listing Modification & Delete Protection
    console.log('\n[5/8] Testing Adoption Listing Update & User Isolation...');
    // User B tries to update User A's listing -> MUST FAIL with 403
    const unauthorizedUpdate = await apiCall(`/adoption/${listingId}`, 'PUT', {
      title: 'Malicious title change',
    }, tokenB);
    assert(unauthorizedUpdate.status === 403, 'Cross-user listing update rejected with 403 Forbidden');

    // User A updates their own listing -> SUCCEEDS with 200
    const ownerUpdate = await apiCall(`/adoption/${listingId}`, 'PUT', {
      title: 'Shadow The Champion Husky (Updated)',
      adoptionFee: 150,
      location: 'Seattle Sanctuary, WA',
    }, tokenA);
    assert(ownerUpdate.status === 200, 'Owner updated adoption listing successfully');
    assert(ownerUpdate.data.listing?.title.includes('Updated'), 'Updated listing title persisted in MongoDB');
    assert(ownerUpdate.data.listing?.adoptionFee === 150, 'Updated adoption fee persisted');

    // 7. Adoption Application Flow & Restrictions
    console.log('\n[6/8] Testing Adoption Application Flow & Status Validation...');
    // Owner cannot apply to their own listing
    const ownerApply = await apiCall(`/adoption/${listingId}/apply`, 'POST', {
      livingSituation: 'My own sanctuary',
      experience: 'Owner',
    }, tokenA);
    assert(ownerApply.status === 400, 'Owner blocked from applying to their own listing (400)');

    // User B applies to User A's listing
    const applyRes = await apiCall(`/adoption/${listingId}/apply`, 'POST', {
      livingSituation: 'Spacious suburban home with fully fenced half-acre yard',
      experience: 'Owned northern breeds for 8 years',
      phone: '+1 555-0199',
      notes: 'Available for sanctuary visit this Saturday afternoon.',
    }, tokenB);
    assert(applyRes.status === 201, 'User B submitted adoption application');
    assert(applyRes.data.application?.status === 'pending', 'Application status initialized as pending');
    applicationId = applyRes.data.application?._id;

    // User B tries duplicate active application -> MUST FAIL with 400
    const dupApply = await apiCall(`/adoption/${listingId}/apply`, 'POST', {
      livingSituation: 'Another application',
    }, tokenB);
    assert(dupApply.status === 400, 'Duplicate active application rejected with 400 Bad Request');

    // 8. Application Privacy, Review & Status Workflow
    console.log('\n[7/8] Testing Application Privacy & Owner Review Workflow...');
    // User B checks My Applications
    const myAppsB = await apiCall('/adoption/applications/my', 'GET', null, tokenB);
    assert(myAppsB.status === 200, 'User B retrieved submitted applications');
    assert(myAppsB.data.applications.some(a => a._id === applicationId), 'User B application appears in My Applications');

    // User B tests the route alias /my-applications
    const aliasAppsB = await apiCall('/adoption/my-applications', 'GET', null, tokenB);
    assert(aliasAppsB.status === 200, 'Route alias /my-applications returns 200');

    // User A checks My Applications -> MUST NOT see User B's application
    const myAppsA = await apiCall('/adoption/applications/my', 'GET', null, tokenA);
    assert(myAppsA.status === 200, 'User A retrieved submitted applications');
    assert(!myAppsA.data.applications.some(a => a._id === applicationId), 'User A CANNOT see User B applications (Privacy verified)');

    // User B tries to view applications for listing -> MUST FAIL with 403
    const unauthListingApps = await apiCall(`/adoption/${listingId}/applications`, 'GET', null, tokenB);
    assert(unauthListingApps.status === 403, 'Non-owner blocked from viewing listing applications (403)');

    // User A (Owner) views applications for their listing -> SUCCEEDS
    const ownerListingApps = await apiCall(`/adoption/${listingId}/applications`, 'GET', null, tokenA);
    assert(ownerListingApps.status === 200, 'Owner retrieved applications for their listing');
    assert(ownerListingApps.data.applications.some(a => a._id === applicationId), 'Owner sees applicant details');

    // Applicant (User B) attempts to approve their own application -> MUST FAIL with 403
    const selfApprove = await apiCall(`/adoption/applications/${applicationId}`, 'PUT', {
      status: 'approved',
    }, tokenB);
    assert(selfApprove.status === 403, 'Applicant blocked from self-approving application (403)');

    // Owner (User A) approves the application -> SUCCEEDS with 200
    const ownerApprove = await apiCall(`/adoption/applications/${applicationId}`, 'PUT', {
      status: 'approved',
      notes: 'Approved after verification of living situation.',
    }, tokenA);
    assert(ownerApprove.status === 200, 'Owner approved adoption application');
    assert(ownerApprove.data.application?.status === 'approved', 'Application status updated to approved');

    // Verify listing status transitioned to 'adopted' and pet isAdoptable reset to false
    const adoptedListing = await AdoptionListing.findById(listingId);
    assert(adoptedListing.status === 'adopted', 'Listing automatically transitioned to adopted status');
    const adoptedPet = await Pet.findById(petAId);
    assert(adoptedPet.isAdoptable === false, 'Pet isAdoptable flag reset to false upon adoption approval');

    // 9. Deletion Authorization & Cleanup
    console.log('\n[8/8] Testing Deletion Security & Cleanup...');
    // User B tries to delete User A's listing -> MUST FAIL with 403
    const unauthDelete = await apiCall(`/adoption/${listingId}`, 'DELETE', null, tokenB);
    assert(unauthDelete.status === 403, 'Cross-user listing deletion blocked with 403 Forbidden');

    // User A deletes their listing -> SUCCEEDS
    const ownerDelete = await apiCall(`/adoption/${listingId}`, 'DELETE', null, tokenA);
    assert(ownerDelete.status === 200, 'Owner deleted adoption listing successfully');

    // Verify deleted listing returns 404
    const deletedFetch = await apiCall(`/adoption/${listingId}`, 'GET');
    assert(deletedFetch.status === 404, 'Deleted listing returns 404 Not Found');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 5 ADOPTION TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    console.log('🧹 Cleaning up test artifacts from MongoDB Atlas...');
    if (listingId) await AdoptionListing.findByIdAndDelete(listingId).catch(() => {});
    if (applicationId) await AdoptionApplication.findByIdAndDelete(applicationId).catch(() => {});
    if (petAId) await Pet.findByIdAndDelete(petAId).catch(() => {});
    if (userAId) await User.findByIdAndDelete(userAId).catch(() => {});
    if (userBId) await User.findByIdAndDelete(userBId).catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('  ✅ Ephemeral test server closed & MongoDB disconnected.\n');
  }
};

runPhase5Tests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
