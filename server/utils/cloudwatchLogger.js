import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  PutRetentionPolicyCommand
} from '@aws-sdk/client-cloudwatch-logs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Configuration
const region = process.env.AWS_REGION || 'ap-south-1';
const logGroupName = process.env.CLOUDWATCH_LOG_GROUP || '/petly/backend';
const retentionDays = parseInt(process.env.CLOUDWATCH_LOG_RETENTION_DAYS, 10) || 7;

// Predictable stream name: date-based stream per process startup
const dateStr = new Date().toISOString().split('T')[0];
const logStreamName = `backend-${dateStr}`;

// Safe keys that should never be redacted even if containing substrings
const SAFE_KEYS = new Set(['statuscode', 'status', 'pincode']);

// Sensitive keys to never log
const SENSITIVE_PATTERNS = [
  'password', 'passphrase', 'pwd', 'token', 'jwt', 'auth', 'authorization',
  'cookie', 'secret', 'verificationcode', 'resetcode', 'otp', 'accesskey',
  'secretkey', 'credential', 'medical', 'document'
];

/**
 * Strips and redacts sensitive data from log metadata
 */
export const sanitizeMeta = (data, depth = 0) => {
  if (data === undefined || data === null) return undefined;
  if (depth > 2) return '[MAX_DEPTH]';
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.slice(0, 10).map(item => sanitizeMeta(item, depth + 1));
  }

  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const normalizedKey = lowerKey.replace(/[^a-z0-9]/g, '');
    const isSafe = SAFE_KEYS.has(normalizedKey);
    const isSensitive = !isSafe && SENSITIVE_PATTERNS.some(pat => normalizedKey.includes(pat));

    if (isSensitive) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeMeta(val, depth + 1);
    } else {
      clean[key] = val;
    }
  }
  return clean;
};

// CloudWatch Client state
let cwClient = null;
let isInitialized = false;
let initPromise = null;
let cloudwatchAvailable = true;

/**
 * Safely initializes CloudWatch client, log group, retention, and stream
 */
const initCloudWatch = async () => {
  if (isInitialized || !cloudwatchAvailable) return;

  try {
    const clientConfig = { region };

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    cwClient = new CloudWatchLogsClient(clientConfig);

    // 1. Ensure Log Group exists
    try {
      await cwClient.send(new CreateLogGroupCommand({ logGroupName }));
    } catch (err) {
      if (err.name !== 'ResourceAlreadyExistsException') {
        // Non-fatal, might lack permissions or group already exists
      }
    }

    // 2. Put Retention Policy (approx 7 days)
    try {
      await cwClient.send(new PutRetentionPolicyCommand({
        logGroupName,
        retentionInDays: retentionDays,
      }));
    } catch (err) {
      // Non-fatal
    }

    // 3. Ensure Log Stream exists
    try {
      await cwClient.send(new CreateLogStreamCommand({
        logGroupName,
        logStreamName,
      }));
    } catch (err) {
      if (err.name !== 'ResourceAlreadyExistsException') {
        // Non-fatal
      }
    }

    isInitialized = true;
  } catch (err) {
    // Non-fatal: CloudWatch initialization failed
    cloudwatchAvailable = false;
  }
};

/**
 * Internal log dispatcher
 */
const dispatchLog = async (level, message, rawMeta = null) => {
  const timestamp = Date.now();
  const safeMeta = rawMeta ? sanitizeMeta(rawMeta) : undefined;

  // Local console output (always active)
  const prefix = `[${new Date(timestamp).toISOString()}] [${level.toUpperCase()}]`;
  const consolePayload = safeMeta ? `${message} ${JSON.stringify(safeMeta)}` : message;

  if (level === 'error') {
    console.error(`${prefix} ${consolePayload}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${consolePayload}`);
  } else {
    console.log(`${prefix} ${consolePayload}`);
  }

  // CloudWatch Logs push (asynchronous, completely non-fatal)
  if (!cloudwatchAvailable) return;

  try {
    if (!initPromise) {
      initPromise = initCloudWatch();
    }
    await initPromise;

    if (!isInitialized || !cwClient) return;

    const eventPayload = JSON.stringify({
      level,
      message,
      timestamp: new Date(timestamp).toISOString(),
      ...(safeMeta ? { meta: safeMeta } : {}),
    });

    await cwClient.send(new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [
        {
          message: eventPayload,
          timestamp,
        },
      ],
    }));
  } catch (err) {
    // Completely non-fatal: never throw from logger
  }
};

/**
 * Public Logger Interface
 */
export const logger = {
  info: (message, meta) => dispatchLog('info', message, meta),
  warn: (message, meta) => dispatchLog('warn', message, meta),
  error: (message, meta) => dispatchLog('error', message, meta),
  getLogGroupName: () => logGroupName,
  getLogStreamName: () => logStreamName,
  getRetentionDays: () => retentionDays,
  isAvailable: () => cloudwatchAvailable,
};

export default logger;
