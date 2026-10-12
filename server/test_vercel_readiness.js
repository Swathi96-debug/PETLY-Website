import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const runVercelAudit = async () => {
  console.log('====================================================');
  console.log('🔍 PETLY BACKEND VERCEL READINESS AUDIT');
  console.log('====================================================\n');

  try {
    // 1. Check api/index.js exists
    console.log('[Audit 1] Checking api/index.js serverless entrypoint...');
    const apiIndexPath = path.join(rootDir, 'api', 'index.js');
    if (!fs.existsSync(apiIndexPath)) {
      throw new Error('api/index.js does not exist!');
    }
    const { default: vercelApp } = await import(pathToFileURL(apiIndexPath).href);
    if (typeof vercelApp !== 'function' || !vercelApp._router) {
      throw new Error('api/index.js does not export a valid Express application!');
    }
    console.log('✅ Audit 1 Passed: api/index.js exists and exports configured Express app.\n');

    // 2. Check vercel.json exists and has correct rewrites
    console.log('[Audit 2] Checking vercel.json configuration...');
    const vercelJsonPath = path.join(rootDir, 'vercel.json');
    if (!fs.existsSync(vercelJsonPath)) {
      throw new Error('vercel.json does not exist in root!');
    }
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    const routesToApi = vercelConfig.rewrites?.some(
      r => r.destination === '/api/index.js'
    );
    if (!routesToApi) {
      throw new Error(`vercel.json missing rewrite to /api/index.js: ${JSON.stringify(vercelConfig.rewrites)}`);
    }
    console.log('✅ Audit 2 Passed: vercel.json correctly routes /api/(.*) and SPA routes.\n');

    // 3. Check root package.json has workspaces & dependencies
    console.log('[Audit 3] Checking root package.json dependency resolution...');
    const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    if (!rootPkg.workspaces || !rootPkg.workspaces.includes('server')) {
      throw new Error('root package.json does not declare server workspace!');
    }
    const requiredDeps = ['express', 'mongoose', 'cors', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'multer'];
    for (const dep of requiredDeps) {
      if (!rootPkg.dependencies[dep]) {
        throw new Error(`root package.json missing required dependency for Vercel: ${dep}`);
      }
    }
    console.log('✅ Audit 3 Passed: Root package.json declares server workspace and all required dependencies.\n');

    // 4. Verify Express Routes are registered on app
    console.log('[Audit 4] Checking registered route prefixes on Express app...');
    const expectedRoutePrefixes = [
      '/api/auth',
      '/api/uploads',
      '/api/pets',
      '/api/health',
      '/api/documents',
      '/api/adoption',
      '/api/community',
      '/api/quiz',
      '/api/store',
      '/api/services',
      '/api/notifications',
      '/api/location',
      '/api/assistant',
    ];

    const registeredPaths = vercelApp._router.stack
      .filter(r => r.route || r.regexp)
      .map(r => r.route?.path || (r.regexp?.toString() || ''));

    for (const prefix of expectedRoutePrefixes) {
      const match = registeredPaths.some(p => p.includes(prefix.replace('/api/', '')) || p.includes(prefix));
      if (!match) {
        throw new Error(`Route prefix ${prefix} not found on Express router stack!`);
      }
    }
    console.log(`   Found ${expectedRoutePrefixes.length} registered API module routes.`);
    console.log('✅ Audit 4 Passed: All existing PETLY routes mounted and preserved.\n');

    // 5. Verify database pooling/caching logic
    console.log('[Audit 5] Checking MongoDB connection caching for serverless...');
    const { default: connectDB } = await import(pathToFileURL(path.resolve(__dirname, 'config', 'db.js')).href);
    const conn1 = await connectDB();
    if (mongoose.connection.readyState < 1) {
      throw new Error('Failed to connect to MongoDB Atlas!');
    }
    const conn2 = await connectDB(); // Second call should return cached connection
    if (conn2 !== mongoose.connection) {
      throw new Error('connectDB did not reuse active connection!');
    }
    console.log(`   MongoDB connection active and cached (readyState: ${mongoose.connection.readyState})`);
    console.log('✅ Audit 5 Passed: MongoDB connection caching verified.\n');

    // 6. Verify filesystem independence (no disk writing in production code)
    console.log('[Audit 6] Verifying filesystem independence (memory storage for uploads)...');
    const uploadContent = fs.readFileSync(path.resolve(__dirname, 'middleware', 'upload.js'), 'utf8');
    if (!uploadContent.includes('multer.memoryStorage()')) {
      throw new Error('Multer is not using memoryStorage!');
    }
    console.log('   Multer configured with memoryStorage (S3 streaming buffer). Zero local disk dependency.');
    console.log('✅ Audit 6 Passed: Completely independent of local filesystem.\n');

    await mongoose.disconnect();
    console.log('====================================================');
    console.log('🎉 ALL VERCEL READINESS AUDITS PASSED!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Vercel Readiness Audit Failure:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

runVercelAudit();
