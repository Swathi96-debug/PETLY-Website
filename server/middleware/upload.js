import multer from 'multer';

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_VIDEO_TYPES];

// Size Limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_FILE_SIZE = MAX_VIDEO_SIZE; // 25 MB maximum overall limit for multer

// Memory storage keeps file buffers in memory for direct stream to S3
const storage = multer.memoryStorage();

// File filter checks MIME type
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(new Error('No file attached'), false);
  }

  const mime = file.mimetype.toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(mime)) {
    cb(null, true);
  } else {
    const err = new Error(
      `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP images, MP4, WEBM videos, and PDF documents.`
    );
    err.code = 'UNSUPPORTED_FILE_TYPE';
    cb(err, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Single file upload per request
  },
  fileFilter,
});

/**
 * Middleware wrapper for multer single file upload that handles errors
 * cleanly and enforces category-specific size constraints and empty file checks.
 */
export const handleSingleUpload = (fieldName = 'file') => {
  const multerUpload = upload.single(fieldName);

  return (req, res, next) => {
    multerUpload(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum allowed size is 10 MB for documents and 5 MB for images.',
          });
        }
        if (err.code === 'UNSUPPORTED_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing file upload.',
        });
      }

      // Check if file was provided
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `No file provided. Please attach a file under the '${fieldName}' form field.`,
        });
      }

      // Prevent empty uploads
      if (!req.file.buffer || req.file.buffer.length === 0 || req.file.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'The uploaded file is empty.',
        });
      }

      // Enforce image-specific 5MB limit
      const mime = req.file.mimetype.toLowerCase();
      if (ALLOWED_IMAGE_TYPES.includes(mime) && req.file.size > MAX_IMAGE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Image file exceeds the 5 MB limit. Provided: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB.`,
        });
      }

      // Enforce video-specific 25MB limit
      if (ALLOWED_VIDEO_TYPES.includes(mime) && req.file.size > MAX_VIDEO_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Video file exceeds the 25 MB limit. Provided: ${(req.file.size / (1024 * 1024)).toFixed(2)} MB.`,
        });
      }

      next();
    });
  };
};

/**
 * Optional upload middleware: Processes multipart/form-data if present,
 * but allows application/json payloads to pass through without requiring a file.
 */
export const handleOptionalUpload = (fieldName = 'file') => {
  const singleHandler = handleSingleUpload(fieldName);

  return (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return singleHandler(req, res, next);
    }
    next();
  };
};

export default handleSingleUpload;

