import {
  generateS3Key,
  uploadToS3,
  deleteS3Object,
  generatePresignedUrl,
  isValidCategory,
  verifyKeyOwnership,
  CATEGORY_PREFIX_MAP,
} from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';

/**
 * @desc    Upload file to AWS S3
 * @route   POST /api/uploads
 * @access  Private
 */
export const uploadFile = async (req, res, next) => {
  try {
    // 1. Ensure user identity exists
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User identity missing from request.',
      });
    }

    // 2. Validate category
    const category = (req.body.type || req.query.type || '').trim().toLowerCase();
    if (!isValidCategory(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid upload category '${category}'. Allowed categories: ${Object.keys(CATEGORY_PREFIX_MAP).join(', ')}`,
      });
    }

    // 3. Ensure file exists from multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided for upload.',
      });
    }

    // 4. Check AWS S3 configuration
    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud storage service is not configured. Please verify server AWS environment variables.',
      });
    }

    const s3Key = generateS3Key({
      category,
      userId: userId.toString(),
      originalName: req.file.originalname,
    });

    // 5. Upload to S3 (Private by default)
    const uploadResult = await uploadToS3({
      buffer: req.file.buffer,
      key: s3Key,
      contentType: req.file.mimetype,
    });

    // Construct standard S3 direct reference URL
    const s3Url = `https://${uploadResult.bucket}.s3.${uploadResult.region}.amazonaws.com/${uploadResult.key}`;
    const presignedUrl = await generatePresignedUrl(uploadResult.key, 3600);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        key: uploadResult.key,
        url: s3Url,
        presignedUrl,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('[S3 Upload Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file to cloud storage.',
    });
  }
};

/**
 * @desc    Generate a secure time-limited presigned URL for private file access
 * @route   GET /api/uploads/presigned-url
 * @access  Private
 */
export const getPresignedUrlController = async (req, res, next) => {
  try {
    const key = (req.query.key || '').trim();
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'S3 object key is required as query parameter "key".',
      });
    }

    // Enforce key ownership
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const userRole = req.user?.role || 'user';
    const isOwner = verifyKeyOwnership(key, userId, userRole, true);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this file.',
      });
    }

    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud storage service is not configured.',
      });
    }

    const expiresIn = parseInt(req.query.expiresIn, 10) || 3600; // default 1 hour
    const presignedUrl = await generatePresignedUrl(key, expiresIn);

    return res.status(200).json({
      success: true,
      key,
      presignedUrl,
      expiresIn,
    });
  } catch (error) {
    console.error('[Presigned URL Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate signed URL.',
    });
  }
};

/**
 * @desc    Delete a file from AWS S3 with ownership validation
 * @route   DELETE /api/uploads
 * @access  Private
 */
export const deleteFile = async (req, res, next) => {
  try {
    const key = (req.body.key || req.query.key || '').trim();
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'S3 object key is required in request body or query parameter "key".',
      });
    }

    // Strict ownership validation: Authenticated user cannot delete other users' files
    const userId = req.user?._id?.toString() || req.user?.id?.toString();
    const userRole = req.user?.role || 'user';
    const isOwner = verifyKeyOwnership(key, userId, userRole);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this file.',
      });
    }

    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud storage service is not configured.',
      });
    }

    await deleteS3Object(key);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      key,
    });
  } catch (error) {
    console.error('[S3 Delete Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file from cloud storage.',
    });
  }
};
