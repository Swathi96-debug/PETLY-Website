import crypto from 'crypto';
import User from '../models/User.js';
import { cognitoConfig } from '../config/cognito.js';

let cachedJwks = null;
let lastJwksFetch = 0;
const JWKS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Fetch and cache Cognito JWKS
 */
export const getCognitoJwks = async (forceRefresh = false) => {
  const now = Date.now();
  if (cachedJwks && !forceRefresh && (now - lastJwksFetch) < JWKS_CACHE_TTL) {
    return cachedJwks;
  }

  const region = cognitoConfig.region;
  const userPoolId = cognitoConfig.userPoolId;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is not configured.');
  }

  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cognito JWKS from ${jwksUrl}: ${response.statusText}`);
  }

  const data = await response.json();
  cachedJwks = data;
  lastJwksFetch = now;
  return cachedJwks;
};

/**
 * Decode JWT without verifying signature
 */
export const decodeJwt = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  return { header, payload, parts };
};

/**
 * Verify Cognito RS256 JWT
 */
export const verifyCognitoToken = async (token) => {
  const { header, payload, parts } = decodeJwt(token);

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  const region = cognitoConfig.region;
  const userPoolId = cognitoConfig.userPoolId;
  const clientId = cognitoConfig.clientId;
  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  // 1. Verify Issuer
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Token issuer mismatch. Expected: ${expectedIssuer}, Got: ${payload.iss}`);
  }

  // 2. Verify Expiration
  const nowInSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowInSec) {
    throw new Error('Cognito token has expired.');
  }

  // 3. Verify Audience / Client ID
  if (payload.token_use === 'id') {
    if (payload.aud !== clientId) {
      throw new Error(`ID Token client audience mismatch. Expected: ${clientId}, Got: ${payload.aud}`);
    }
  } else if (payload.token_use === 'access') {
    if (payload.client_id !== clientId) {
      throw new Error(`Access Token client_id mismatch. Expected: ${clientId}, Got: ${payload.client_id}`);
    }
  } else {
    throw new Error(`Invalid token_use: ${payload.token_use}`);
  }

  // 4. Retrieve matching key from JWKS
  let jwks = await getCognitoJwks();
  let jwk = jwks.keys.find(k => k.kid === header.kid);

  if (!jwk) {
    // Key rotation check: refresh once
    jwks = await getCognitoJwks(true);
    jwk = jwks.keys.find(k => k.kid === header.kid);
    if (!jwk) {
      throw new Error(`Public key with kid '${header.kid}' not found in Cognito JWKS.`);
    }
  }

  // 5. Verify Cryptographic Signature
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], 'base64url');

  const isValid = crypto.verify('RSA-SHA256', Buffer.from(signingInput), publicKey, signature);
  if (!isValid) {
    throw new Error('Invalid Cognito token cryptographic signature.');
  }

  return payload;
};

/**
 * Resolve MongoDB User from validated Cognito payload
 * Implements strict, safe identity linking without password alteration:
 * - Direct lookup by cognitoSub
 * - Only link using verified email (email_verified === true) or verified phone (phone_number_verified === true)
 * - Detects and prevents conflicts if verified email and verified phone point to different users
 * - Preserves existing User._id and all existing relationships
 */
export const resolveMongoUserFromCognitoPayload = async (payload, options = {}) => {
  const cognitoSub = payload.sub;
  if (!cognitoSub) {
    throw new Error('Cognito token payload missing sub claim.');
  }

  // 1. Check if user is already linked by cognitoSub
  let user = await User.findOne({ cognitoSub });
  if (user) {
    // If user exists and has no location, but options.location is provided, safely attach it
    const hasExistingLoc = user.location && (
      typeof user.location === 'string'
        ? user.location.trim() !== ''
        : Boolean(user.location.city || user.location.state || user.location.pincode)
    );
    if (!hasExistingLoc && options.location) {
      user.location = options.location;
      await user.save();
    }
    return user;
  }

  // 2. Resolve verification status
  const isEmailVerified = payload.email && (payload.email_verified === true || payload.email_verified === 'true');
  const isPhoneVerified = payload.phone_number && (payload.phone_number_verified === true || payload.phone_number_verified === 'true');

  // Check for unverified collision with existing accounts
  if (payload.email && !isEmailVerified) {
    const unverifiedMatch = await User.findOne({ email: payload.email.toLowerCase() });
    if (unverifiedMatch) {
      const error = new Error('Cannot link account: Email address is registered with an existing PETLY user but is not verified in Cognito.');
      error.statusCode = 403;
      throw error;
    }
  }

  if (payload.phone_number && !isPhoneVerified) {
    const unverifiedPhoneMatch = await User.findOne({ phone: payload.phone_number });
    if (unverifiedPhoneMatch) {
      const error = new Error('Cannot link account: Phone number is registered with an existing PETLY user but is not verified in Cognito.');
      error.statusCode = 403;
      throw error;
    }
  }

  // 3. Resolve verified attributes
  let userByEmail = null;
  let userByPhone = null;

  if (isEmailVerified) {
    userByEmail = await User.findOne({ email: payload.email.toLowerCase() });
  }

  if (isPhoneVerified) {
    userByPhone = await User.findOne({ phone: payload.phone_number });
  }

  // 4. Conflict Detection
  if (userByEmail && userByPhone) {
    if (userByEmail._id.toString() !== userByPhone._id.toString()) {
      const error = new Error('Identity conflict: Verified email and verified phone number belong to two different PETLY accounts.');
      error.statusCode = 409;
      throw error;
    }
  }

  const existingCandidate = userByEmail || userByPhone;

  if (existingCandidate) {
    // Prevent overriding another user's link
    if (existingCandidate.cognitoSub && existingCandidate.cognitoSub !== cognitoSub) {
      const error = new Error('Identity conflict: Existing PETLY user is already linked to another Cognito identity.');
      error.statusCode = 409;
      throw error;
    }

    // Safely link the existing user
    existingCandidate.cognitoSub = cognitoSub;
    if (payload.name && (!existingCandidate.fullName || existingCandidate.fullName === '')) {
      existingCandidate.fullName = payload.name;
    }

    // Never overwrite an existing location! Only populate if completely empty
    const hasExistingLoc = existingCandidate.location && (
      typeof existingCandidate.location === 'string'
        ? existingCandidate.location.trim() !== ''
        : Boolean(existingCandidate.location.city || existingCandidate.location.state || existingCandidate.location.pincode)
    );
    if (!hasExistingLoc && options.location) {
      existingCandidate.location = options.location;
    }

    await existingCandidate.save();
    return existingCandidate;
  }

  // 5. Create new MongoDB User if no existing candidate
  const initialEmail = payload.email ? payload.email.toLowerCase() : `${cognitoSub}@cognito.petly.com`;
  const initialName = payload.name || payload['cognito:username'] || (payload.email ? payload.email.split('@')[0] : 'PETLY Member');
  const initialPhone = payload.phone_number || '';

  const newUser = await User.create({
    fullName: initialName,
    email: initialEmail,
    phone: initialPhone,
    cognitoSub,
    role: 'user',
    location: options.location || '',
    // Generate a secure random password satisfying schema constraints
    password: crypto.randomBytes(32).toString('hex') + 'A1!',
  });

  return newUser;
};
