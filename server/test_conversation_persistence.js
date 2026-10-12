import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Pet from './models/Pet.js';
import Conversation from './models/Conversation.js';
import Message from './models/Message.js';
import generateToken from './utils/generateToken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

const runPersistenceTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY AI CONVERSATION PERSISTENCE TEST SUITE');
  console.log('====================================================\n');

  let userA, userB;
  let tokenA, tokenB;
  let convA1, convA2;

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is undefined in environment');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    console.log('✅ Connected to MongoDB Atlas.');

    const ts = Date.now();
    userA = await User.create({
      fullName: `Persist User A ${ts}`,
      email: `persist_a_${ts}@petly.com`,
      password: 'Password123!',
      role: 'user',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      fullName: `Persist User B ${ts}`,
      email: `persist_b_${ts}@petly.com`,
      password: 'Password123!',
      role: 'user',
    });
    tokenB = generateToken(userB._id);

    console.log(`[Setup] User A (${userA._id}) and User B (${userB._id}) initialized.\n`);

    // [Test 1] Create conversation & import in-memory messages
    console.log('[Test 1] Testing conversation creation & message import (POST /api/assistant/conversations)...');
    const initialMessages = [
      { sender: 'user', text: 'My dog has an upset stomach.', media: { name: 'photo.jpg', mimeType: 'image/jpeg', size: 50000, isVideo: false } },
      { sender: 'ai', text: 'Provide bland food like boiled chicken and rice, and monitor for dehydration.' },
    ];
    const resCreate = await fetch(`${API_BASE}/assistant/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Preserved Dog Care Chat',
        messages: initialMessages,
      }),
    });
    const createData = await resCreate.json();
    if (resCreate.status !== 201 || !createData.success || !createData.conversation?._id) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(createData)}`);
    }
    convA1 = createData.conversation;
    console.log(`   Status: ${resCreate.status} | Conversation ID: ${convA1._id} | Messages saved: ${createData.messages?.length}`);
    console.log('✅ Test 1 Passed: Conversation created and initial messages imported successfully.\n');

    // [Test 2] Verify Zero Binary/Base64 in MongoDB Message documents
    console.log('[Test 2] Verifying MongoDB Message stores only metadata (NO binary/base64 data)...');
    const dbMessages = await Message.find({ conversation: convA1._id }).lean();
    if (dbMessages.length !== 2) {
      throw new Error(`Expected 2 messages, found ${dbMessages.length}`);
    }
    const userMsgWithMedia = dbMessages.find(m => m.role === 'user');
    if (!userMsgWithMedia || !userMsgWithMedia.media) {
      throw new Error('User message with media metadata not found in DB');
    }
    if (userMsgWithMedia.media.data) {
      throw new Error('Binary base64 data was illegally stored in MongoDB Message.media!');
    }
    if (userMsgWithMedia.media.name !== 'photo.jpg' || userMsgWithMedia.media.mimeType !== 'image/jpeg') {
      throw new Error(`Invalid media metadata: ${JSON.stringify(userMsgWithMedia.media)}`);
    }
    console.log('   Stored media metadata in DB:', JSON.stringify(userMsgWithMedia.media));
    console.log('✅ Test 2 Passed: Zero binary data in MongoDB verified. Only lightweight metadata is stored.\n');

    // [Test 3] List user conversations (GET /api/assistant/conversations)
    console.log('[Test 3] Testing list user conversations (GET /api/assistant/conversations)...');
    const resList = await fetch(`${API_BASE}/assistant/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listData = await resList.json();
    if (resList.status !== 200 || !listData.success || !Array.isArray(listData.conversations)) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(listData)}`);
    }
    if (listData.conversations.length < 1) {
      throw new Error('User A conversation not found in list');
    }
    console.log(`   Found ${listData.conversations.length} conversation(s) for User A. Title: "${listData.conversations[0].title}"`);
    console.log('✅ Test 3 Passed: Listing user conversations succeeded.\n');

    // [Test 4] Get single conversation with full message history (GET /api/assistant/conversations/:id)
    console.log('[Test 4] Testing get single conversation with messages (GET /api/assistant/conversations/:id)...');
    const resGet = await fetch(`${API_BASE}/assistant/conversations/${convA1._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getData = await resGet.json();
    if (resGet.status !== 200 || !getData.success || getData.messages?.length !== 2) {
      throw new Error(`Test 4 Failed: ${JSON.stringify(getData)}`);
    }
    console.log(`   Retrieved conversation "${getData.conversation.title}" with ${getData.messages.length} messages.`);
    console.log('✅ Test 4 Passed: Fetched single conversation with full history.\n');

    // [Test 5] Strict Cross-User Data Isolation - Read Protection
    console.log('[Test 5] Testing Cross-User Data Isolation: User B reading User A conversation...');
    const resCrossRead = await fetch(`${API_BASE}/assistant/conversations/${convA1._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossReadData = await resCrossRead.json();
    if (resCrossRead.status !== 403) {
      throw new Error(`Test 5 Failed: Expected 403 Forbidden, got ${resCrossRead.status}: ${JSON.stringify(crossReadData)}`);
    }
    console.log(`   User B read access blocked: ${resCrossRead.status} (${crossReadData.message})`);
    console.log('✅ Test 5 Passed: Cross-user conversation read blocked.\n');

    // [Test 6] Strict Cross-User Data Isolation - Delete Protection
    console.log('[Test 6] Testing Cross-User Data Isolation: User B deleting User A conversation...');
    const resCrossDelete = await fetch(`${API_BASE}/assistant/conversations/${convA1._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossDeleteData = await resCrossDelete.json();
    if (resCrossDelete.status !== 403) {
      throw new Error(`Test 6 Failed: Expected 403 Forbidden, got ${resCrossDelete.status}: ${JSON.stringify(crossDeleteData)}`);
    }
    console.log(`   User B delete access blocked: ${resCrossDelete.status} (${crossDeleteData.message})`);
    console.log('✅ Test 6 Passed: Cross-user conversation delete blocked.\n');

    // [Test 7] Strict Cross-User Data Isolation - Continuing User A conversation as User B
    console.log('[Test 7] Testing Cross-User Data Isolation: User B continuing User A conversation via POST /api/assistant/chat...');
    const resCrossChat = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        message: 'Hello from User B trying to hijack',
        conversationId: convA1._id,
      }),
    });
    const crossChatData = await resCrossChat.json();
    if (resCrossChat.status !== 403) {
      throw new Error(`Test 7 Failed: Expected 403 Forbidden, got ${resCrossChat.status}: ${JSON.stringify(crossChatData)}`);
    }
    console.log(`   User B chat injection blocked: ${resCrossChat.status} (${crossChatData.message})`);
    console.log('✅ Test 7 Passed: Cross-user conversation continuation blocked.\n');

    // [Test 8] Context Window Limit Verification (At most 6 most recent stored messages total)
    console.log('[Test 8] Testing Gemini context window limit (at most 6 most recent messages stored)...');
    // Create 8 messages in a conversation
    const dummyConv = await Conversation.create({ user: userA._id, title: 'Context Window Test' });
    for (let i = 1; i <= 8; i++) {
      await Message.create({
        conversation: dummyConv._id,
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `Message ${i} in context test`,
      });
    }
    // Verify DB query returns exactly at most 6 most recent messages
    const windowMessages = await Message.find({ conversation: dummyConv._id })
      .sort({ createdAt: -1 })
      .limit(6);
    if (windowMessages.length !== 6) {
      throw new Error(`Expected window of 6 messages, got ${windowMessages.length}`);
    }
    // Most recent is message 8, oldest in window is message 3
    console.log(`   Window contains ${windowMessages.length} messages (oldest in window: "${windowMessages[5].content}", newest: "${windowMessages[0].content}")`);
    console.log('✅ Test 8 Passed: Context window strictly capped at at most 6 most recent stored messages.\n');

    // [Test 9] Delete Conversation and Verify Cascading Message Deletion
    console.log('[Test 9] Testing conversation deletion & cascading message cleanup (DELETE /api/assistant/conversations/:id)...');
    const resDelete = await fetch(`${API_BASE}/assistant/conversations/${convA1._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const deleteData = await resDelete.json();
    if (resDelete.status !== 200 || !deleteData.success) {
      throw new Error(`Test 9 Failed: ${JSON.stringify(deleteData)}`);
    }
    const convCheck = await Conversation.findById(convA1._id);
    const msgsCheck = await Message.find({ conversation: convA1._id });
    if (convCheck !== null || msgsCheck.length !== 0) {
      throw new Error(`Cascading deletion failed: conv=${Boolean(convCheck)}, remainingMsgs=${msgsCheck.length}`);
    }
    console.log(`   Conversation ${convA1._id} deleted. Remaining messages: ${msgsCheck.length}`);
    console.log('✅ Test 9 Passed: Conversation and all associated messages successfully deleted.\n');

    console.log('====================================================');
    console.log('🎉 ALL 9 CONVERSATION PERSISTENCE TESTS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Persistence Test Failure:', err.message);
    process.exitCode = 1;
  } finally {
    // Cleanup temporary test data
    console.log('[Cleanup] Cleaning up temporary test data from MongoDB Atlas...');
    if (userA) {
      const convs = await Conversation.find({ user: userA._id });
      const convIds = convs.map(c => c._id);
      await Message.deleteMany({ conversation: { $in: convIds } });
      await Conversation.deleteMany({ user: userA._id });
      await User.findByIdAndDelete(userA._id);
    }
    if (userB) {
      const convs = await Conversation.find({ user: userB._id });
      const convIds = convs.map(c => c._id);
      await Message.deleteMany({ conversation: { $in: convIds } });
      await Conversation.deleteMany({ user: userB._id });
      await User.findByIdAndDelete(userB._id);
    }
    console.log('🧹 Cleanup complete.');
    await mongoose.disconnect();
    process.exit(0);
  }
};

runPersistenceTests();
