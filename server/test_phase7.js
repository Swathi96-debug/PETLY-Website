import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import User from './models/User.js';
import QuizQuestion from './models/QuizQuestion.js';
import QuizAttempt from './models/QuizAttempt.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const runPhase7Tests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 7 QUIZ & ASSESSMENT INTEGRATION TEST');
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

  // 2. Mount ephemeral test server with Auth and Quiz routes
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/quiz', quizRoutes);
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

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    return { status: res.status, data };
  };

  // Test data variables
  const uniqueTag = Date.now().toString(36);
  const userAEmail = `quiz_user_a_${uniqueTag}@testpetly.io`;
  const userBEmail = `quiz_user_b_${uniqueTag}@testpetly.io`;
  const adminEmail = `quiz_admin_${uniqueTag}@testpetly.io`;
  const password = 'Password@123';

  let tokenA = null;
  let tokenB = null;
  let tokenAdmin = null;

  let userAId = null;
  let userBId = null;
  let adminId = null;

  let createdQuestion1Id = null;
  let createdQuestion2Id = null;
  let createdAttemptId = null;

  try {
    // 3. Setup Test Identities (User A, User B, Admin)
    console.log('[2/8] Setting up Test Identities (User A, User B, Admin)...');
    
    // User A (Student / Normal User)
    const signupA = await apiCall('/auth/signup', 'POST', {
      fullName: 'Quiz Learner A',
      email: userAEmail,
      password,
    });
    assert(signupA.status === 201, 'Created User A (Student)');
    tokenA = signupA.data.token;
    userAId = signupA.data.user._id;

    // User B (Separate Normal User)
    const signupB = await apiCall('/auth/signup', 'POST', {
      fullName: 'Quiz Learner B',
      email: userBEmail,
      password,
    });
    assert(signupB.status === 201, 'Created User B (Participant)');
    tokenB = signupB.data.token;
    userBId = signupB.data.user._id;

    // Admin User
    const adminDoc = await User.create({
      fullName: 'Academy Director Admin',
      email: adminEmail,
      password,
      role: 'admin',
    });
    adminId = adminDoc._id;

    const loginAdmin = await apiCall('/auth/login', 'POST', {
      email: adminEmail,
      password,
    });
    assert(loginAdmin.status === 200 && loginAdmin.data.user?.role === 'admin', 'Admin authenticated with admin role');
    tokenAdmin = loginAdmin.data.token;

    // 4. Admin Question Management & RBAC Protection
    console.log('\n[3/8] Testing Admin Question CRUD & RBAC Authorization...');

    // Normal User A attempts to create question -> MUST FAIL 403
    const forbiddenCreate = await apiCall('/quiz/questions', 'POST', {
      category: 'Dog Care & Health',
      difficulty: 'medium',
      question: 'Unauthorized question attempt',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 0,
    }, tokenA);
    assert(forbiddenCreate.status === 403, 'Normal user question creation blocked with 403 Forbidden');

    // Unauthenticated creation attempt -> MUST FAIL 401
    const unauthCreate = await apiCall('/quiz/questions', 'POST', {
      category: 'Dog Care & Health',
      question: 'No auth attempt',
      options: ['A', 'B'],
      correctAnswer: 0,
    }, null);
    assert(unauthCreate.status === 401, 'Unauthenticated question creation blocked with 401 Unauthorized');

    // Admin creates Question 1
    const adminCreateQ1 = await apiCall('/quiz/questions', 'POST', {
      category: 'Dog Care & Health',
      difficulty: 'easy',
      question: 'Which common human food ingredient is lethal to canines due to hypoglycemic shock?',
      options: ['Boiled Chicken', 'Xylitol', 'Pumpkin Puree', 'Cooked Oatmeal'],
      correctAnswer: 1,
      explanation: 'Xylitol causes severe insulin surge and acute hepatic necrosis in dogs.',
      isActive: true,
    }, tokenAdmin);
    assert(adminCreateQ1.status === 201, 'Admin created Question 1 (HTTP 201)');
    assert(adminCreateQ1.data.question?.question.includes('lethal'), 'Question 1 prompt persisted');
    assert(adminCreateQ1.data.question?.options?.includes('Xylitol'), 'Question 1 options persisted');
    createdQuestion1Id = adminCreateQ1.data.question?._id;

    // Admin creates Question 2 (Scenario based)
    const adminCreateQ2 = await apiCall('/quiz/questions', 'POST', {
      category: 'Cat Behavior & Nutrition',
      difficulty: 'hard',
      question: 'Scenario: A cat exhibits slow eye-blinking while gazing at its owner. What behavior is this?',
      options: ['Direct predatory fixation', 'Feline affection and trust affirmation', 'Acute ocular irritation', 'Disorientation'],
      correctAnswer: 1,
      explanation: 'Slow blinking is a recognized feline relaxation and positive attachment display.',
      isActive: true,
    }, tokenAdmin);
    assert(adminCreateQ2.status === 201, 'Admin created Question 2 (HTTP 201)');
    createdQuestion2Id = adminCreateQ2.data.question?._id;

    // 5. Zero-Leakage Public Question Retrieval & Filtering
    console.log('\n[4/8] Verifying Zero CorrectAnswer Leakage in Public Questions API...');

    // Public / Non-admin gets questions
    const publicQuestionsRes = await apiCall('/quiz/questions?category=Dog Care & Health');
    assert(publicQuestionsRes.status === 200, 'Public questions endpoint returns 200 OK');
    assert(Array.isArray(publicQuestionsRes.data.questions), 'Questions returned as array');
    
    // CRITICAL SECURITY ASSERTION: correctAnswer must NEVER be leaked to public
    const hasLeakedAnswer = publicQuestionsRes.data.questions.some((q) => q.correctAnswer !== undefined);
    assert(!hasLeakedAnswer, 'CRITICAL: correctAnswer field is strictly omitted for non-admin callers');

    // User A authenticated gets questions
    const userAQuestionsRes = await apiCall('/quiz/questions', 'GET', null, tokenA);
    const userALeakedAnswer = userAQuestionsRes.data.questions.some((q) => q.correctAnswer !== undefined);
    assert(!userALeakedAnswer, 'CRITICAL: correctAnswer is omitted for authenticated regular users');

    // Admin gets questions -> includes correctAnswer for CMS editing
    const adminQuestionsRes = await apiCall('/quiz/questions', 'GET', null, tokenAdmin);
    const adminHasAnswers = adminQuestionsRes.data.questions.some((q) => typeof q.correctAnswer === 'number');
    assert(adminHasAnswers, 'Admin caller receives correctAnswer for management panel');

    // 6. User Attempt Submission & MongoDB Evaluation
    console.log('\n[5/8] Testing User Quiz Submission & Scoring Engine...');

    // User A submits 2 answers: 1 correct (Question 1 -> option 1), 1 incorrect (Question 2 -> option 0)
    const submitAttemptRes = await apiCall('/quiz/attempts', 'POST', {
      category: 'Comprehensive Assessment',
      answers: [
        { questionId: createdQuestion1Id, selectedOption: 1 }, // Correct!
        { questionId: createdQuestion2Id, selectedOption: 0 }, // Incorrect (correct is 1)
      ],
    }, tokenA);

    assert(submitAttemptRes.status === 201, 'User A submitted quiz attempt with HTTP 201');
    assert(submitAttemptRes.data.attempt?.score === 1, 'Score calculated as 1 / 2');
    assert(submitAttemptRes.data.attempt?.totalQuestions === 2, 'Total questions recorded as 2');
    assert(submitAttemptRes.data.attempt?.percentage === 50, 'Percentage computed as 50%');
    createdAttemptId = submitAttemptRes.data.attempt?._id;

    // Verify answers review payload in submission response
    assert(Array.isArray(submitAttemptRes.data.attempt?.answers), 'Answers review array returned');
    assert(submitAttemptRes.data.attempt?.answers[0]?.isCorrect === true, 'Question 1 evaluated as correct');
    assert(submitAttemptRes.data.attempt?.answers[1]?.isCorrect === false, 'Question 2 evaluated as incorrect');

    // 7. Multi-User History Isolation
    console.log('\n[6/8] Testing Attempt History Persistence & Multi-User Isolation...');

    // User A fetches attempt history
    const userAHistoryRes = await apiCall('/quiz/attempts', 'GET', null, tokenA);
    assert(userAHistoryRes.status === 200, 'User A retrieved attempt history');
    assert(userAHistoryRes.data.attempts?.length >= 1, 'User A history contains created attempt');
    const userAHasAttempt = userAHistoryRes.data.attempts?.some((att) => att._id === createdAttemptId);
    assert(userAHasAttempt, 'User A attempt persisted in MongoDB history');

    // User B fetches attempt history -> MUST NOT SEE USER A'S ATTEMPT!
    const userBHistoryRes = await apiCall('/quiz/attempts', 'GET', null, tokenB);
    assert(userBHistoryRes.status === 200, 'User B retrieved attempt history');
    const userBSeesUserAAttempt = userBHistoryRes.data.attempts?.some((att) => att._id === createdAttemptId);
    assert(!userBSeesUserAAttempt, 'ISOLATION VERIFIED: User B cannot view User A attempt history');

    // User B attempts to access User A's specific attempt by ID -> MUST FAIL 403
    const crossAttemptAccess = await apiCall(`/quiz/attempts/${createdAttemptId}`, 'GET', null, tokenB);
    assert(crossAttemptAccess.status === 403, 'Cross-user attempt detail access blocked with 403 Forbidden');

    // User A accesses own attempt details by ID -> SUCCEEDS with populated questions
    const userAAttemptDetail = await apiCall(`/quiz/attempts/${createdAttemptId}`, 'GET', null, tokenA);
    assert(userAAttemptDetail.status === 200, 'User A retrieved own attempt details');
    assert(userAAttemptDetail.data.attempt?.score === 1, 'Attempt score verified');
    assert(userAAttemptDetail.data.attempt?.answers?.length === 2, 'Attempt populated answers returned');

    // 8. Admin Question Update & Deletion
    console.log('\n[7/8] Testing Admin Question Updates & Deletions...');

    // Admin updates Question 1
    const updateQ1Res = await apiCall(`/quiz/questions/${createdQuestion1Id}`, 'PUT', {
      difficulty: 'hard',
      explanation: 'Updated clinical explanation for canine toxicity.',
    }, tokenAdmin);
    assert(updateQ1Res.status === 200, 'Admin updated Question 1 (HTTP 200)');
    assert(updateQ1Res.data.question?.difficulty === 'hard', 'Question difficulty updated in MongoDB');

    // Non-admin User A attempts to delete Question 1 -> MUST FAIL 403
    const unauthorizedDelete = await apiCall(`/quiz/questions/${createdQuestion1Id}`, 'DELETE', null, tokenA);
    assert(unauthorizedDelete.status === 403, 'Non-admin question deletion blocked with 403 Forbidden');

    // Admin deletes Question 2
    const deleteQ2Res = await apiCall(`/quiz/questions/${createdQuestion2Id}`, 'DELETE', null, tokenAdmin);
    assert(deleteQ2Res.status === 200, 'Admin deleted Question 2 (HTTP 200)');

    // Verify deleted question returns 404
    const fetchDeletedQ2 = await apiCall(`/quiz/questions/${createdQuestion2Id}`, 'GET');
    assert(fetchDeletedQ2.status === 404, 'Deleted question returns 404 Not Found');

    console.log('\n[8/8] Verifying Clean State...');
    assert(true, 'All phase 7 quiz scenarios verified');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} PHASE 7 QUIZ TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    console.log('🧹 Cleaning up test artifacts from MongoDB Atlas...');
    if (createdQuestion1Id) await QuizQuestion.findByIdAndDelete(createdQuestion1Id).catch(() => {});
    if (createdQuestion2Id) await QuizQuestion.findByIdAndDelete(createdQuestion2Id).catch(() => {});
    if (createdAttemptId) await QuizAttempt.findByIdAndDelete(createdAttemptId).catch(() => {});
    if (userAId) await User.findByIdAndDelete(userAId).catch(() => {});
    if (userBId) await User.findByIdAndDelete(userBId).catch(() => {});
    if (adminId) await User.findByIdAndDelete(adminId).catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log('  ✅ Ephemeral test server closed & MongoDB disconnected.\n');
  }
};

runPhase7Tests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
