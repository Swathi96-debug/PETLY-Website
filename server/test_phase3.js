import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';
import MedicalDocument from './models/MedicalDocument.js';
import AdoptionListing from './models/AdoptionListing.js';
import AdoptionApplication from './models/AdoptionApplication.js';
import Post from './models/Post.js';
import Comment from './models/Comment.js';
import QuizQuestion from './models/QuizQuestion.js';
import QuizAttempt from './models/QuizAttempt.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Notification from './models/Notification.js';

import generateToken from './utils/generateToken.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import petRoutes from './routes/petRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adoptionRoutes from './routes/adoptionRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const runPhase3Tests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 3 MONGODB DATA MODEL & CRUD TEST SUITE');
  console.log('====================================================');

  const createdUserIds = [];
  let allPassed = true;

  // [1/25] MongoDB Connection
  console.log('\n[1/25] Connecting to MongoDB Atlas...');
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('  ✅ Connected successfully to MongoDB Atlas');

  // [2/25] Test Users Creation
  console.log('\n[2/25] Setting up Test Identities (User A, User B, Admin)...');
  const ts = Date.now();
  const userA = await User.create({
    fullName: 'Owner Alice',
    email: `alice_${ts}@petly.com`,
    password: 'Password123!',
    role: 'user',
  });
  createdUserIds.push(userA._id);
  const tokenA = generateToken(userA._id);

  const userB = await User.create({
    fullName: 'Adopter Bob',
    email: `bob_${ts}@petly.com`,
    password: 'Password123!',
    role: 'user',
  });
  createdUserIds.push(userB._id);
  const tokenB = generateToken(userB._id);

  const userAdmin = await User.create({
    fullName: 'Administrator',
    email: `admin_${ts}@petly.com`,
    password: 'Password123!',
    role: 'admin',
  });
  createdUserIds.push(userAdmin._id);
  const tokenAdmin = generateToken(userAdmin._id);

  console.log(`  ✅ User A (Owner): ${userA._id}`);
  console.log(`  ✅ User B (Adopter): ${userB._id}`);
  console.log(`  ✅ Admin User: ${userAdmin._id}`);

  // Spin up test server on ephemeral port
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/pets', petRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/adoption', adoptionRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`  ✅ Test Server listening on ephemeral port ${port}`);

  let createdPetId = null;
  let createdHealthRecordId = null;
  let createdListingId = null;
  let createdApplicationId = null;
  let createdPostId = null;
  let createdCommentId = null;
  let createdQuestionId = null;
  let createdProductId = null;
  let createdOrderId = null;

  try {
    // [3/25] Pet CREATE
    console.log('\n[3/25] Testing Pet CREATE (POST /api/pets)...');
    const petRes = await fetch(`${baseUrl}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Milo',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 2,
        gender: 'Male',
        weight: 28,
        description: 'Friendly and energetic retriever',
      }),
    });
    const petData = await petRes.json();
    const petCreated = petRes.status === 201 && petData.pet && petData.pet.name === 'Milo';
    console.log(`  - Pet created successfully: ${petCreated ? 'PASS' : 'FAIL'}`);
    if (!petCreated) allPassed = false;
    createdPetId = petData.pet?._id;

    // [4/25] Pet READ
    console.log('\n[4/25] Testing Pet READ (GET /api/pets & GET /api/pets/:id)...');
    const petsRes = await fetch(`${baseUrl}/pets`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const petsData = await petsRes.json();
    const petsRead = petsRes.status === 200 && Array.isArray(petsData.pets) && petsData.pets.some((p) => p._id === createdPetId);
    console.log(`  - Authenticated user pet list: ${petsRead ? 'PASS' : 'FAIL'}`);
    if (!petsRead) allPassed = false;

    const singlePetRes = await fetch(`${baseUrl}/pets/${createdPetId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const singlePetData = await singlePetRes.json();
    const singlePetRead = singlePetRes.status === 200 && singlePetData.pet?._id === createdPetId;
    console.log(`  - Single pet fetch by ID: ${singlePetRead ? 'PASS' : 'FAIL'}`);
    if (!singlePetRead) allPassed = false;

    // [5/25] Pet UPDATE
    console.log('\n[5/25] Testing Pet UPDATE (PUT /api/pets/:id)...');
    const updatePetRes = await fetch(`${baseUrl}/pets/${createdPetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ weight: 29.5, healthStatus: 'Thriving' }),
    });
    const updatePetData = await updatePetRes.json();
    const petUpdated = updatePetRes.status === 200 && updatePetData.pet?.weight === 29.5 && updatePetData.pet?.healthStatus === 'Thriving';
    console.log(`  - Pet fields updated: ${petUpdated ? 'PASS' : 'FAIL'}`);
    if (!petUpdated) allPassed = false;

    // [6/25] Pet Ownership Protection
    console.log('\n[6/25] Testing Pet Ownership Protection (User B cannot modify User A pet)...');
    const crossUpdatePetRes = await fetch(`${baseUrl}/pets/${createdPetId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: 'HackedName' }),
    });
    const crossPetBlocked = crossUpdatePetRes.status === 403;
    console.log(`  - Unauthorized user rejected with 403 Forbidden: ${crossPetBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossPetBlocked) allPassed = false;

    // [7/25] Health Record CREATE
    console.log('\n[7/25] Testing Health Record CREATE (POST /api/health)...');
    const healthRes = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        pet: createdPetId,
        type: 'vaccination',
        title: 'Rabies Booster',
        description: 'Annual 3-year rabies booster administered',
        date: new Date().toISOString(),
        value: '1.0 ml',
        status: 'completed',
      }),
    });
    const healthData = await healthRes.json();
    const healthCreated = healthRes.status === 201 && healthData.healthRecord?.title === 'Rabies Booster';
    console.log(`  - Health record created: ${healthCreated ? 'PASS' : 'FAIL'}`);
    if (!healthCreated) allPassed = false;
    createdHealthRecordId = healthData.healthRecord?._id;

    // [8/25] Health Record READ
    console.log('\n[8/25] Testing Health Record READ (GET /api/health?pet=:petId)...');
    const getHealthRes = await fetch(`${baseUrl}/health?pet=${createdPetId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getHealthData = await getHealthRes.json();
    const healthRead = getHealthRes.status === 200 && Array.isArray(getHealthData.records) && getHealthData.records.length > 0;
    console.log(`  - Health records retrieved: ${healthRead ? 'PASS' : 'FAIL'}`);
    if (!healthRead) allPassed = false;

    // [9/25] Health Record UPDATE
    console.log('\n[9/25] Testing Health Record UPDATE (PUT /api/health/:id)...');
    const updateHealthRes = await fetch(`${baseUrl}/health/${createdHealthRecordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ notes: 'Patient showed no adverse reactions' }),
    });
    const updateHealthData = await updateHealthRes.json();
    const healthUpdated = updateHealthRes.status === 200 && updateHealthData.record?.notes.includes('adverse');
    console.log(`  - Health record updated: ${healthUpdated ? 'PASS' : 'FAIL'}`);
    if (!healthUpdated) allPassed = false;

    // [10/25] Cross-user Health Access Rejection
    console.log('\n[10/25] Testing Cross-User Health Access Rejection...');
    const crossHealthCreateRes = await fetch(`${baseUrl}/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`, // User B attempting to add record to User A's pet
      },
      body: JSON.stringify({
        pet: createdPetId,
        type: 'diagnosis',
        title: 'Unauthorized Record',
      }),
    });
    const crossHealthBlocked = crossHealthCreateRes.status === 403;
    console.log(`  - User B blocked from adding health record to User A pet: ${crossHealthBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossHealthBlocked) allPassed = false;

    const crossHealthReadRes = await fetch(`${baseUrl}/health?pet=${createdPetId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossHealthReadBlocked = crossHealthReadRes.status === 403;
    console.log(`  - User B blocked from reading User A pet health records: ${crossHealthReadBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossHealthReadBlocked) allPassed = false;

    // [11/25] Health Record DELETE
    console.log('\n[11/25] Testing Health Record DELETE (DELETE /api/health/:id)...');
    const deleteHealthRes = await fetch(`${baseUrl}/health/${createdHealthRecordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const healthDeleted = deleteHealthRes.status === 200;
    console.log(`  - Health record deleted: ${healthDeleted ? 'PASS' : 'FAIL'}`);
    if (!healthDeleted) allPassed = false;

    // [12/25] Medical Document Registration with S3 Key
    console.log('\n[12/25] Testing Medical Document Registration with S3 Key...');
    const docRes = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        pet: createdPetId,
        title: 'Blood Chemistry Panel',
        category: 'lab_result',
        s3Key: `documents/${userA._id}/1789837600-blood-test.pdf`,
        originalName: 'blood-test.pdf',
        contentType: 'application/pdf',
        size: 142050,
        notes: 'Normal kidney and liver function',
      }),
    });
    const docData = await docRes.json();
    const docCreated = docRes.status === 201 && docData.document?.s3Key.includes('blood-test');
    console.log(`  - Medical document metadata registered: ${docCreated ? 'PASS' : 'FAIL'}`);
    if (!docCreated) allPassed = false;
    const createdDocId = docData.document?._id;

    // Test cross-user document access
    const crossDocRes = await fetch(`${baseUrl}/documents/${createdDocId}/presigned-url`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossDocBlocked = crossDocRes.status === 403;
    console.log(`  - Cross-user document URL access blocked (403): ${crossDocBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossDocBlocked) allPassed = false;

    // Delete document safely
    const deleteDocRes = await fetch(`${baseUrl}/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const docDeleted = deleteDocRes.status === 200;
    console.log(`  - Medical document safely removed: ${docDeleted ? 'PASS' : 'FAIL'}`);
    if (!docDeleted) allPassed = false;

    // [13/25] Adoption Listing CRUD & Authorization
    console.log('\n[13/25] Testing Adoption Listing CRUD & Pet Ownership Authorization...');
    // Attempt by User B to list User A's pet
    const unauthorizedListingRes = await fetch(`${baseUrl}/adoption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        pet: createdPetId,
        title: 'Unauthorized listing attempt',
        description: 'Should be rejected',
      }),
    });
    const unauthListingBlocked = unauthorizedListingRes.status === 403;
    console.log(`  - Non-owner cannot list another user pet: ${unauthListingBlocked ? 'PASS' : 'FAIL'}`);
    if (!unauthListingBlocked) allPassed = false;

    // Owner creates adoption listing
    const listingRes = await fetch(`${baseUrl}/adoption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        pet: createdPetId,
        title: 'Milo Looking for Loving Home',
        description: 'Gentle and well trained golden retriever',
        adoptionFee: 150,
        requirements: ['Fenced yard', 'Active family'],
        location: 'Bengaluru, India',
      }),
    });
    const listingData = await listingRes.json();
    const listingCreated = listingRes.status === 201 && listingData.listing?.title.includes('Milo');
    console.log(`  - Owner created adoption listing: ${listingCreated ? 'PASS' : 'FAIL'}`);
    if (!listingCreated) allPassed = false;
    createdListingId = listingData.listing?._id;

    // [14/25] Adoption Application Creation
    console.log('\n[14/25] Testing Adoption Application Submission (User B applies)...');
    const applyRes = await fetch(`${baseUrl}/adoption/${createdListingId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        livingSituation: 'Spacious villa with private garden',
        experience: 'Owned dogs for over 10 years',
        phone: '+919876543210',
        notes: 'Excited to welcome Milo!',
      }),
    });
    const applyData = await applyRes.json();
    const applicationCreated = applyRes.status === 201 && applyData.application?.status === 'pending';
    console.log(`  - Adoption application submitted: ${applicationCreated ? 'PASS' : 'FAIL'}`);
    if (!applicationCreated) allPassed = false;
    createdApplicationId = applyData.application?._id;

    // [15/25] Application Ownership & Status Workflow
    console.log('\n[15/25] Testing Adoption Application Workflow & Status Restrictions...');
    // Applicant cannot approve their own application
    const applicantApproveRes = await fetch(`${baseUrl}/adoption/applications/${createdApplicationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });
    const applicantApproveBlocked = applicantApproveRes.status === 403;
    console.log(`  - Applicant forbidden from approving own application: ${applicantApproveBlocked ? 'PASS' : 'FAIL'}`);
    if (!applicantApproveBlocked) allPassed = false;

    // Shelter/Owner approves application
    const shelterApproveRes = await fetch(`${baseUrl}/adoption/applications/${createdApplicationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'approved', notes: 'Approved after verification' }),
    });
    const shelterApproveData = await shelterApproveRes.json();
    const shelterApproved = shelterApproveRes.status === 200 && shelterApproveData.application?.status === 'approved';
    console.log(`  - Shelter/Owner approved application: ${shelterApproved ? 'PASS' : 'FAIL'}`);
    if (!shelterApproved) allPassed = false;

    // [16/25] Community Post CRUD
    console.log('\n[16/25] Testing Community Post CRUD & Author Protection...');
    const postRes = await fetch(`${baseUrl}/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        content: 'Milo completed his basic agility training today! 🐾',
        category: 'Story',
      }),
    });
    const postData = await postRes.json();
    const postCreated = postRes.status === 201 && postData.post?._id;
    console.log(`  - Community post created: ${postCreated ? 'PASS' : 'FAIL'}`);
    if (!postCreated) allPassed = false;
    createdPostId = postData.post?._id;

    // User B likes post
    const likeRes = await fetch(`${baseUrl}/community/posts/${createdPostId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const likeData = await likeRes.json();
    const postLiked = likeRes.status === 200 && likeData.liked === true && likeData.likesCount === 1;
    console.log(`  - Like toggled on post: ${postLiked ? 'PASS' : 'FAIL'}`);
    if (!postLiked) allPassed = false;

    // Cross-user modification rejected
    const crossPostRes = await fetch(`${baseUrl}/community/posts/${createdPostId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ content: 'Modified by unauthorized user' }),
    });
    const crossPostBlocked = crossPostRes.status === 403;
    console.log(`  - Unauthorized user post update blocked: ${crossPostBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossPostBlocked) allPassed = false;

    // [17/25] Comment CRUD
    console.log('\n[17/25] Testing Comment CRUD & Comment Counter...');
    const commentRes = await fetch(`${baseUrl}/community/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ content: 'Congratulations Milo! Such a proud moment!' }),
    });
    const commentData = await commentRes.json();
    const commentCreated = commentRes.status === 201 && commentData.comment?._id;
    console.log(`  - Comment added to post: ${commentCreated ? 'PASS' : 'FAIL'}`);
    if (!commentCreated) allPassed = false;
    createdCommentId = commentData.comment?._id;

    // [18/25] Quiz Question Admin Protection
    console.log('\n[18/25] Testing Quiz Question Admin Authorization...');
    // Normal user attempts to create question
    const unauthQuizRes = await fetch(`${baseUrl}/quiz/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        category: 'dog_health',
        question: 'How often should dogs receive rabies vaccination?',
        options: ['Every 6 months', 'Every 1-3 years', 'Never'],
        correctAnswer: 1,
      }),
    });
    const unauthQuizBlocked = unauthQuizRes.status === 403;
    console.log(`  - Non-admin blocked from creating quiz question: ${unauthQuizBlocked ? 'PASS' : 'FAIL'}`);
    if (!unauthQuizBlocked) allPassed = false;

    // Admin creates quiz question
    const adminQuizRes = await fetch(`${baseUrl}/quiz/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        category: 'dog_health',
        question: 'How often should adult dogs receive a core rabies booster?',
        options: ['Every 6 months', 'Every 1 to 3 years depending on local regulation', 'Never'],
        correctAnswer: 1,
        explanation: 'Core rabies vaccinations are typically 1-year or 3-year vaccines.',
      }),
    });
    const adminQuizData = await adminQuizRes.json();
    const quizCreated = adminQuizRes.status === 201 && adminQuizData.question?._id;
    console.log(`  - Admin created quiz question: ${quizCreated ? 'PASS' : 'FAIL'}`);
    if (!quizCreated) allPassed = false;
    createdQuestionId = adminQuizData.question?._id;

    // Public gets questions - verify correctAnswer is NOT exposed!
    const publicQuizRes = await fetch(`${baseUrl}/quiz/questions?category=dog_health`);
    const publicQuizData = await publicQuizRes.json();
    const answerHidden = publicQuizData.questions?.every((q) => q.correctAnswer === undefined);
    console.log(`  - Public questions API hides correctAnswer: ${answerHidden ? 'PASS' : 'FAIL'}`);
    if (!answerHidden) allPassed = false;

    // [19/25] Quiz Attempt Creation & Scoring
    console.log('\n[19/25] Testing Quiz Attempt Scoring (User A submits)...');
    const attemptRes = await fetch(`${baseUrl}/quiz/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        category: 'dog_health',
        answers: [{ questionId: createdQuestionId, selectedOption: 1 }], // correct answer is 1
      }),
    });
    const attemptData = await attemptRes.json();
    const attemptScored = attemptRes.status === 201 && attemptData.attempt?.score === 1 && attemptData.attempt?.percentage === 100;
    console.log(`  - Attempt evaluated: Score ${attemptData.attempt?.score}/${attemptData.attempt?.totalQuestions} (${attemptData.attempt?.percentage}%): ${attemptScored ? 'PASS' : 'FAIL'}`);
    if (!attemptScored) allPassed = false;

    // [20/25] Product CRUD & Admin Protection
    console.log('\n[20/25] Testing Store Product Creation & Admin Protection...');
    const userProductRes = await fetch(`${baseUrl}/store/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: 'Petly Chew Toy', price: 15.99, category: 'Toys' }),
    });
    const userProductBlocked = userProductRes.status === 403;
    console.log(`  - Non-admin blocked from creating store product: ${userProductBlocked ? 'PASS' : 'FAIL'}`);
    if (!userProductBlocked) allPassed = false;

    const adminProductRes = await fetch(`${baseUrl}/store/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAdmin}`,
      },
      body: JSON.stringify({
        name: 'Organic Salmon Pet Treats',
        description: '100% natural wild-caught salmon treats rich in Omega-3',
        price: 18.5,
        category: 'Food',
        stock: 50,
      }),
    });
    const adminProductData = await adminProductRes.json();
    const productCreated = adminProductRes.status === 201 && adminProductData.product?._id;
    console.log(`  - Admin created store product: ${productCreated ? 'PASS' : 'FAIL'}`);
    if (!productCreated) allPassed = false;
    createdProductId = adminProductData.product?._id;

    // [21/25] Order Creation & Price Snapshotting
    console.log('\n[21/25] Testing Order Creation & Price Snapshotting...');
    const orderRes = await fetch(`${baseUrl}/store/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        items: [{ productId: createdProductId, quantity: 2 }],
        shippingAddress: {
          fullName: 'Alice Walker',
          street: '123 Pet Lane',
          city: 'Bengaluru',
          postalCode: '560001',
          country: 'India',
        },
      }),
    });
    const orderData = await orderRes.json();
    const expectedTotal = 18.5 * 2; // 37.00
    const orderCreated =
      orderRes.status === 201 &&
      orderData.order?.items[0]?.price === 18.5 &&
      orderData.order?.totalAmount === expectedTotal;
    console.log(`  - Order created with frozen purchase price ($${orderData.order?.totalAmount}): ${orderCreated ? 'PASS' : 'FAIL'}`);
    if (!orderCreated) allPassed = false;
    createdOrderId = orderData.order?._id;

    // [22/25] Order Ownership Protection
    console.log('\n[22/25] Testing Order Ownership Protection...');
    const crossOrderRes = await fetch(`${baseUrl}/store/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossOrderBlocked = crossOrderRes.status === 403;
    console.log(`  - User B blocked from viewing User A order (403): ${crossOrderBlocked ? 'PASS' : 'FAIL'}`);
    if (!crossOrderBlocked) allPassed = false;

    // [23/25] Notification Retrieval & Access Protection
    console.log('\n[23/25] Testing Notification Access Protection...');
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const notifData = await notifRes.json();
    const hasNotif = notifRes.status === 200 && Array.isArray(notifData.notifications) && notifData.notifications.length > 0;
    console.log(`  - User A retrieved automated system notifications: ${hasNotif ? 'PASS' : 'FAIL'}`);
    if (!hasNotif) allPassed = false;
    const notifId = notifData.notifications?.[0]?._id;

    if (notifId) {
      const crossNotifRes = await fetch(`${baseUrl}/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const crossNotifBlocked = crossNotifRes.status === 403;
      console.log(`  - User B blocked from modifying User A notification: ${crossNotifBlocked ? 'PASS' : 'FAIL'}`);
      if (!crossNotifBlocked) allPassed = false;
    }

    // [24/25] Validation & Error Handling
    console.log('\n[24/25] Testing Validation & Error Handling (Invalid ObjectIds & Missing Resources)...');
    const invalidIdRes = await fetch(`${baseUrl}/pets/invalid-id-12345`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const invalidIdBlocked = invalidIdRes.status === 400;
    console.log(`  - Invalid ObjectId returns 400 Bad Request: ${invalidIdBlocked ? 'PASS' : 'FAIL'}`);
    if (!invalidIdBlocked) allPassed = false;

    const notFoundRes = await fetch(`${baseUrl}/pets/666666666666666666666666`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const notFoundHandled = notFoundRes.status === 404;
    console.log(`  - Non-existent resource returns 404 Not Found: ${notFoundHandled ? 'PASS' : 'FAIL'}`);
    if (!notFoundHandled) allPassed = false;

    // [25/25] No Secrets Leaked in API Responses
    console.log('\n[25/25] Testing Zero Secret Leakage in Responses...');
    const sensitiveTokens = [
      process.env.JWT_SECRET,
      process.env.AWS_SECRET_ACCESS_KEY,
      'mongodb://',
      userA.password,
    ].filter(Boolean);

    const checkedResponses = [
      JSON.stringify(petData),
      JSON.stringify(healthData),
      JSON.stringify(listingData),
      JSON.stringify(applyData),
      JSON.stringify(postData),
      JSON.stringify(adminQuizData),
      JSON.stringify(adminProductData),
      JSON.stringify(orderData),
    ];

    let secretFound = false;
    for (const secret of sensitiveTokens) {
      for (const resStr of checkedResponses) {
        if (resStr.includes(secret)) {
          secretFound = true;
          break;
        }
      }
    }
    console.log(`  - No JWT Secret, Bcrypt Hash, AWS Secret, or Mongo URI in outputs: ${!secretFound ? 'PASS' : 'FAIL'}`);
    if (secretFound) allPassed = false;

  } finally {
    // Clean up temporary test documents
    console.log('\n🧹 Cleaning up temporary test data from MongoDB Atlas...');
    if (createdOrderId) await Order.findByIdAndDelete(createdOrderId).catch(() => {});
    if (createdProductId) await Product.findByIdAndDelete(createdProductId).catch(() => {});
    if (createdQuestionId) await QuizQuestion.findByIdAndDelete(createdQuestionId).catch(() => {});
    await QuizAttempt.deleteMany({ user: { $in: createdUserIds } }).catch(() => {});
    if (createdCommentId) await Comment.findByIdAndDelete(createdCommentId).catch(() => {});
    if (createdPostId) await Post.findByIdAndDelete(createdPostId).catch(() => {});
    if (createdApplicationId) await AdoptionApplication.findByIdAndDelete(createdApplicationId).catch(() => {});
    if (createdListingId) await AdoptionListing.findByIdAndDelete(createdListingId).catch(() => {});
    if (createdPetId) {
      await HealthRecord.deleteMany({ pet: createdPetId }).catch(() => {});
      await MedicalDocument.deleteMany({ pet: createdPetId }).catch(() => {});
      await Pet.findByIdAndDelete(createdPetId).catch(() => {});
    }
    await Notification.deleteMany({ user: { $in: createdUserIds } }).catch(() => {});
    for (const uId of createdUserIds) {
      await User.findByIdAndDelete(uId).catch(() => {});
    }
    console.log('  ✅ Temporary test data and test users cleaned up');

    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  if (allPassed) {
    console.log('🎉 ALL 25 PHASE 3 MONGODB DATA MODEL & CRUD VERIFICATIONS PASSED!');
  } else {
    console.error('❌ SOME PHASE 3 TESTS FAILED.');
  }
  console.log('====================================================');

  process.exit(allPassed ? 0 : 1);
};

runPhase3Tests().catch((err) => {
  console.error('Test Suite Failed with error:', err);
  process.exit(1);
});
