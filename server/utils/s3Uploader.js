import path from 'path';
import crypto from 'crypto';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getBucketName } from '../config/s3.js';

// Category to S3 Folder/Prefix Whitelist Mapping
export const CATEGORY_PREFIX_MAP = {
  pet: 'pets/',
  avatar: 'avatars/',
  adoption: 'adoption/',
  document: 'documents/',
  post: 'posts/',
  product: 'products/',
  service: 'services/',
};

/**
 * Validates if the given category is allowed.
 * @param {string} category 
 * @returns {boolean}
 */
export const isValidCategory = (category) => {
  return Boolean(category && CATEGORY_PREFIX_MAP[category.toLowerCase()]);
};

/**
 * Sanitizes a filename to prevent path traversal and collision vulnerabilities.
 * Strips path separators, replaces non-alphanumeric chars (except dash, underscore, dot).
 * @param {string} originalName 
 * @returns {string}
 */
export const sanitizeFilename = (originalName) => {
  if (!originalName || typeof originalName !== 'string') {
    return 'file';
  }
  const basename = path.basename(originalName);
  const ext = path.extname(basename);
  const nameWithoutExt = path.basename(basename, ext);
  
  // Replace spaces and special characters with hyphens
  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file';

  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${cleanName}${cleanExt}`;
};

/**
 * Generates a safe, unique S3 object key structured as:
 * <folder>/<userId>/<timestamp>-<randomHex>-<sanitizedFilename>
 * 
 * @param {Object} options
 * @param {string} options.category - pet, avatar, adoption, document, post, product
 * @param {string} options.userId - authenticated user ID
 * @param {string} options.originalName - original client filename
 * @returns {string} S3 Object Key
 */
export const generateS3Key = ({ category, userId, originalName }) => {
  const cat = (category || '').toLowerCase();
  const prefix = CATEGORY_PREFIX_MAP[cat];
  if (!prefix) {
    throw new Error(`Invalid upload category '${category}'. Allowed categories: ${Object.keys(CATEGORY_PREFIX_MAP).join(', ')}`);
  }

  if (!userId) {
    throw new Error('User ID is required to construct user-scoped S3 key');
  }

  // Ensure userId has no path traversal characters
  const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanFilename = sanitizeFilename(originalName);
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

  return `${prefix}${cleanUserId}/${uniqueId}-${cleanFilename}`;
};

/**
 * Verifies if an authenticated user owns the given S3 key.
 * Allows access if:
 * 1. User has 'admin' role
 * 2. Key path format starts with <category>/<userId>/
 * 
 * @param {string} key 
 * @param {string} userId 
 * @param {string} userRole 
 * @returns {boolean}
 */
export const verifyKeyOwnership = (key, userId, userRole = 'user', allowPublicView = false) => {
  if (!key || typeof key !== 'string') return false;
  if (userRole === 'admin') return true;

  // Root-level demo images whitelist
  if (allowPublicView && ['cat.jpg', 'bird.jpg', 'dog.jpg', 'bed.jpg', 'carrot.jpg', 'sarah miller.jpg'].includes(key)) {
    return true;
  }

  if (!userId) return false;
  const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '');

  // Keys are formatted as: <prefix>/<userId>/...
  const parts = key.split('/');
  if (parts.length < 3) return false;

  const keyCategory = parts[0];
  const keyUserId = parts[1];

  // Verify prefix is valid
  const validPrefixes = Object.values(CATEGORY_PREFIX_MAP).map(p => p.replace('/', ''));
  if (!validPrefixes.includes(keyCategory)) return false;

  if (allowPublicView && ['posts', 'adoption', 'avatars', 'products'].includes(keyCategory)) {
    return true;
  }

  return keyUserId === cleanUserId;
};

/**
 * Uploads a buffer directly to S3 with private-by-default access.
 * 
 * @param {Object} params
 * @param {Buffer} params.buffer - file buffer from multer memoryStorage
 * @param {string} params.key - S3 object key
 * @param {string} params.contentType - MIME type
 * @returns {Promise<{ key: string, bucket: string, region: string }>}
 */
export const uploadToS3 = async ({ buffer, key, contentType }) => {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Private by default - do NOT use ACL: 'public-read'
  });

  await s3.send(command);

  return {
    key,
    bucket,
    region: process.env.AWS_REGION || 'us-east-1',
  };
};

/**
 * Generates a time-limited presigned URL for secure access to private S3 files.
 * Critical for private medical files, health logs, and documents.
 * 
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL lifetime in seconds (default 3600 = 1 hr)
 * @returns {Promise<string>} Presigned URL
 */
export const generatePresignedUrl = async (key, expiresIn = 3600) => {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
};

/**
 * Deletes an object from S3 by key.
 * 
 * @param {string} key - S3 object key
 * @returns {Promise<{ success: boolean, key: string }>}
 */
export const deleteS3Object = async (key) => {
  const s3 = getS3Client();
  const bucket = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);

  return {
    success: true,
    key,
  };
};
