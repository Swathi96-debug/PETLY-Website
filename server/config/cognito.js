import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env explicitly regardless of execution cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also load root .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback default
dotenv.config();

/**
 * Helper to mask sensitive identifiers in log outputs
 */
export const maskValue = (val) => {
  if (!val || typeof val !== 'string') return '(Not configured)';
  if (val.length <= 8) return '****';
  return `${val.slice(0, 4)}****${val.slice(-4)}`;
};

/**
 * AWS Cognito Configuration with dynamic getters to prevent ES Module hoisting/eval issues
 */
export const cognitoConfig = {
  get region() {
    return process.env.AWS_REGION || process.env.VITE_COGNITO_REGION || 'ap-south-1';
  },
  get userPoolId() {
    return process.env.COGNITO_USER_POOL_ID || process.env.VITE_COGNITO_USER_POOL_ID || '';
  },
  get clientId() {
    return process.env.COGNITO_CLIENT_ID || process.env.VITE_COGNITO_CLIENT_ID || '';
  },
  get maskedUserPoolId() {
    return maskValue(this.userPoolId);
  },
  get maskedClientId() {
    return maskValue(this.clientId);
  },
};

/**
 * Validates whether Cognito environment variables are configured.
 */
export const isCognitoConfigured = () => {
  return Boolean(cognitoConfig.userPoolId && cognitoConfig.clientId);
};

/**
 * Password Policy Specification for PETLY Cognito User Pool:
 * - Minimum length: 8
 * - Require lowercase: true
 * - Require uppercase: true
 * - Require numbers: true
 * - Require symbols: true
 * - Temporary password validity: 7 days
 */
export const COGNITO_PASSWORD_POLICY = {
  minimumLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSymbols: true,
  tempPasswordValidityDays: 7,
};

/**
 * Cognito User Pool Attribute & Authentication Specification:
 * - Sign-in identifiers: email and phone_number enabled
 * - Username sign-in: disabled
 * - MFA: disabled (OFF)
 * - Public SPA Client: enabled
 * - Client Secret: disabled (NO secret for browser/SPA security)
 * - Verification methods: email and phone verification enabled
 */
export const COGNITO_ATTRIBUTES_SPEC = {
  signInIdentifiers: ['email', 'phone_number'],
  usernameSignIn: false,
  requiredAttributes: ['email'],
  optionalAttributes: ['phone_number', 'name'],
  mfaConfiguration: 'OFF',
  clientType: 'public_spa',
  clientSecret: false,
  verificationMethods: {
    email: true,
    phone: true,
  },
};

export default cognitoConfig;
