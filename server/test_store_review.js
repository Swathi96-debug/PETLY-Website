import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Product from './models/Product.js';
import Review from './models/Review.js';
import generateToken from './utils/generateToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000';

const runStoreReviewTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 10A STORE REVIEW UPDATE TEST SUITE');
  console.log('====================================================');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined.');
    process.exit(1);
  }

  const createdUserIds = [];
  const createdProductIds = [];
  const createdReviewIds = [];

  try {
    // 1. Connect to MongoDB Atlas
    console.log('\n[Init] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas.');

    // Create 2 test users (User A: Reviewer, User B: Other User)
    const timestamp = Date.now();
    const userA = await User.create({
      fullName: 'Reviewer Alice',
      email: `alice_${timestamp}@petly.com`,
      phone: '+919876543210',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userA._id);
    const tokenA = generateToken(userA._id);

    const userB = await User.create({
      fullName: 'Intruder Bob',
      email: `bob_${timestamp}@petly.com`,
      phone: '+919876543211',
      password: 'SecurePassword123!',
      role: 'user',
    });
    createdUserIds.push(userB._id);
    const tokenB = generateToken(userB._id);

    // Create a test product
    const testProduct = await Product.create({
      name: `Test Eco Harness ${timestamp}`,
      description: 'Durable eco-friendly harness for medium dogs.',
      price: 49.99,
      category: 'accessories',
      species: ['dog'],
      stock: 50,
      rating: 5,
      reviewsCount: 0,
    });
    createdProductIds.push(testProduct._id);
    console.log(`✅ Test Product created: ID=${testProduct._id}, initial rating=${testProduct.rating}, reviewsCount=${testProduct.reviewsCount}`);

    // ------------------------------------------------------------------------
    // Test 1: Create Review (User A)
    // ------------------------------------------------------------------------
    console.log('\n[Test 1] User A creates a review (rating: 4, "Great harness, well built")...');
    const res1 = await fetch(`${API_BASE}/api/store/products/${testProduct._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        rating: 4,
        reviewText: 'Great harness, well built',
      }),
    });
    const data1 = await res1.json();
    if (res1.status !== 201 || !data1.success || !data1.review) {
      throw new Error(`Test 1 Failed: Status ${res1.status}, Message: ${data1.message}`);
    }
    const reviewId = data1.review._id;
    createdReviewIds.push(reviewId);

    const prodAfter1 = await Product.findById(testProduct._id);
    if (prodAfter1.reviewsCount !== 1 || prodAfter1.rating !== 4) {
      throw new Error(`Test 1 Failed: Product stats incorrect: rating=${prodAfter1.rating}, count=${prodAfter1.reviewsCount}`);
    }
    console.log(`✅ Test 1 Passed: Review created (${reviewId}), product rating=4, reviewsCount=1`);

    // ------------------------------------------------------------------------
    // Test 2: Duplicate Review Prevention
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] User A attempts to create a duplicate review on same product...');
    const res2 = await fetch(`${API_BASE}/api/store/products/${testProduct._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        rating: 5,
        reviewText: 'Another review attempt',
      }),
    });
    const data2 = await res2.json();
    if (res2.status !== 400 || data2.success !== false) {
      throw new Error(`Test 2 Failed: Expected 400 for duplicate review, got ${res2.status}`);
    }
    console.log(`✅ Test 2 Passed: Duplicate review rejected with 400: "${data2.message}"`);

    // ------------------------------------------------------------------------
    // Test 3: Unauthorized Update Attempt (User B tries to edit User A's review)
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] User B attempts unauthorized update of User A\'s review...');
    const res3 = await fetch(`${API_BASE}/api/store/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        rating: 1,
        reviewText: 'Malicious modification attempt',
      }),
    });
    const data3 = await res3.json();
    if (res3.status !== 403 || data3.success !== false) {
      throw new Error(`Test 3 Failed: Expected 403 for unauthorized review update, got ${res3.status}`);
    }
    console.log(`✅ Test 3 Passed: Unauthorized update rejected with 403: "${data3.message}"`);

    // ------------------------------------------------------------------------
    // Test 4: Validation on Update (Invalid rating or empty text)
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] User A sends invalid rating (6) and empty reviewText...');
    const res4a = await fetch(`${API_BASE}/api/store/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        rating: 6,
      }),
    });
    const data4a = await res4a.json();
    if (res4a.status !== 400) {
      throw new Error(`Test 4a Failed: Expected 400 for rating > 5, got ${res4a.status}`);
    }

    const res4b = await fetch(`${API_BASE}/api/store/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        reviewText: '   ',
      }),
    });
    const data4b = await res4b.json();
    if (res4b.status !== 400) {
      throw new Error(`Test 4b Failed: Expected 400 for empty reviewText, got ${res4b.status}`);
    }
    console.log('✅ Test 4 Passed: Invalid rating (>5) and empty review text rejected with 400.');

    // ------------------------------------------------------------------------
    // Test 5: Authorized Update Review (User A updates to rating: 5, "Updated: Best harness ever!")
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] User A updates their review (rating: 5, "Updated: Best harness ever!")...');
    const res5 = await fetch(`${API_BASE}/api/store/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        rating: 5,
        reviewText: 'Updated: Best harness ever!',
      }),
    });
    const data5 = await res5.json();
    if (res5.status !== 200 || !data5.success || !data5.review) {
      throw new Error(`Test 5 Failed: Status ${res5.status}, Message: ${data5.message}`);
    }
    if (data5.review._id.toString() !== reviewId.toString()) {
      throw new Error(`Test 5 Failed: Document _id changed! Expected ${reviewId}, got ${data5.review._id}`);
    }
    if (data5.review.rating !== 5 || data5.review.reviewText !== 'Updated: Best harness ever!') {
      throw new Error(`Test 5 Failed: Review content was not updated properly: ${JSON.stringify(data5.review)}`);
    }

    // Check product rating and reviewsCount in DB
    const prodAfter5 = await Product.findById(testProduct._id);
    if (prodAfter5.reviewsCount !== 1) {
      throw new Error(`Test 5 Failed: reviewsCount changed during update! Expected 1, got ${prodAfter5.reviewsCount}`);
    }
    if (prodAfter5.rating !== 5) {
      throw new Error(`Test 5 Failed: Product average rating was not recalculated! Expected 5, got ${prodAfter5.rating}`);
    }
    console.log(`✅ Test 5 Passed: SAME document (${reviewId}) updated. Product rating recalculated to 5.0, reviewsCount remains 1.`);

    // ------------------------------------------------------------------------
    // Test 6: Delete Review (User A deletes their review)
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] User A deletes their review...');
    const res6 = await fetch(`${API_BASE}/api/store/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    const data6 = await res6.json();
    if (res6.status !== 200 || !data6.success) {
      throw new Error(`Test 6 Failed: Status ${res6.status}, Message: ${data6.message}`);
    }

    const deletedReview = await Review.findById(reviewId);
    if (deletedReview) {
      throw new Error('Test 6 Failed: Review document still exists after delete!');
    }

    const prodAfter6 = await Product.findById(testProduct._id);
    if (prodAfter6.reviewsCount !== 0) {
      throw new Error(`Test 6 Failed: Product reviewsCount after deletion should be 0, got ${prodAfter6.reviewsCount}`);
    }
    console.log(`✅ Test 6 Passed: Review deleted successfully. Product reviewsCount updated to 0.`);

    // ------------------------------------------------------------------------
    // Cleanup
    // ------------------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up temporary test records...');
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await Product.deleteMany({ _id: { $in: createdProductIds } });
    await Review.deleteMany({ _id: { $in: createdReviewIds } });
    console.log(`🧹 Deleted test users, products, and reviews.`);

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 10A STORE REVIEW TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Phase 10A Test Suite Failed:', err);
    if (createdUserIds.length > 0) {
      try {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Product.deleteMany({ _id: { $in: createdProductIds } });
        await Review.deleteMany({ _id: { $in: createdReviewIds } });
      } catch {}
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runStoreReviewTests();
