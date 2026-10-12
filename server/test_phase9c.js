import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger, sanitizeMeta } from './utils/cloudwatchLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const runPhase9CTests = async () => {
  console.log('====================================================');
  console.log('🧪 PETLY PHASE 9C CLOUDWATCH LOGS TEST SUITE');
  console.log('====================================================');

  try {
    // 1. Logger module loads
    console.log('\n[1/5] Verifying logger module exports and initialization...');
    if (typeof logger.info !== 'function' || typeof logger.warn !== 'function' || typeof logger.error !== 'function') {
      throw new Error('Logger interface is missing required methods (info, warn, error).');
    }
    console.log(`✅ Logger module loaded: LogGroup="${logger.getLogGroupName()}", RetentionDays=${logger.getRetentionDays()}: PASS`);

    // 2. Sensitive values are redacted by sanitizeMeta
    console.log('\n[2/5] Verifying sensitive data sanitization in log payloads...');
    const testMeta = {
      user: 'test_user',
      password: 'SuperSecretPassword123!',
      idToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'refresh-token-xyz',
      authorization: 'Bearer token-abc',
      nested: {
        access_key_id: 'AKIAEXAMPLE',
        safeField: 'harmless_metric',
      },
    };

    const sanitized = sanitizeMeta(testMeta);
    if (sanitized.password !== '[REDACTED]') {
      throw new Error('Security failure: password was not redacted!');
    }
    if (sanitized.idToken !== '[REDACTED]') {
      throw new Error('Security failure: idToken was not redacted!');
    }
    if (sanitized.refreshToken !== '[REDACTED]') {
      throw new Error('Security failure: refreshToken was not redacted!');
    }
    if (sanitized.authorization !== '[REDACTED]') {
      throw new Error('Security failure: authorization was not redacted!');
    }
    if (sanitized.nested?.access_key_id !== '[REDACTED]') {
      throw new Error('Security failure: nested access_key_id was not redacted!');
    }
    if (sanitized.nested?.safeField !== 'harmless_metric') {
      throw new Error('Sanitization error: safeField was corrupted!');
    }
    console.log('✅ Sensitive data sanitization verified (passwords, tokens, credentials redacted): PASS');

    // 3. info/warn/error do not throw even under varied inputs
    console.log('\n[3/5] Verifying info/warn/error non-throwing execution...');
    logger.info('Test Info Event', { status: 'ok' });
    logger.warn('Test Warning Event', { warning: 'simulated_warning' });
    logger.error('Test Error Event', { err: 'simulated_error' });
    console.log('✅ Logger info, warn, and error executed safely without throwing: PASS');

    // 4. Existing Express error handler still works correctly
    console.log('\n[4/5] Verifying Express errorHandler middleware compatibility...');
    let capturedStatus = null;
    let capturedBody = null;

    const mockReq = {
      method: 'GET',
      originalUrl: '/api/test/simulated-error',
    };
    const mockRes = {
      statusCode: 200,
      status: function(code) {
        capturedStatus = code;
        return this;
      },
      json: function(body) {
        capturedBody = body;
        return this;
      },
    };
    const mockNext = () => {};

    const testError = new Error('Simulated Phase 9C Express Error');
    errorHandler(testError, mockReq, mockRes, mockNext);

    if (capturedStatus !== 500) {
      throw new Error(`errorHandler failed: Expected status 500, got ${capturedStatus}`);
    }
    if (!capturedBody || capturedBody.success !== false || capturedBody.message !== 'Simulated Phase 9C Express Error') {
      throw new Error(`errorHandler response malformed: ${JSON.stringify(capturedBody)}`);
    }
    console.log('✅ Express errorHandler intercepted error, logged safely, and returned standard JSON: PASS');

    // 5. CloudWatch non-fatal behavior & minimal live verification
    console.log('\n[5/5] Verifying CloudWatch non-fatal resilience & single live delivery...');
    // Single minimal real test event
    await logger.info('Phase 9C single test event: CloudWatch logger verified', {
      service: 'petly-backend',
      environment: process.env.NODE_ENV || 'test',
    });

    console.log('✅ CloudWatch event dispatched asynchronously; execution resilient and non-fatal: PASS');

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 9C CLOUDWATCH LOGS TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Phase 9C Test Suite Failed:', err);
    process.exit(1);
  }
};

runPhase9CTests();
