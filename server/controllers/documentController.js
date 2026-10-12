import MedicalDocument from '../models/MedicalDocument.js';
import Pet from '../models/Pet.js';
import {
  generateS3Key,
  uploadToS3,
  deleteS3Object,
  generatePresignedUrl,
} from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

// @desc    Upload & register a medical document
// @route   POST /api/documents
// @access  Private
export const uploadMedicalDocument = async (req, res, next) => {
  try {
    const petId = req.body.pet || req.body.petId;
    const title = req.body.title;
    const category = req.body.category || 'other';
    const notes = req.body.notes || '';

    if (!petId || !isValidObjectId(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pet ID is required.',
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Document title is required.',
      });
    }

    // Verify referenced pet belongs to authenticated user
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Referenced pet not found.',
      });
    }

    const isOwner = pet.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only upload medical documents for your own pets.',
      });
    }

    let s3Key = req.body.s3Key;
    let originalName = req.body.originalName;
    let contentType = req.body.contentType;
    let size = req.body.size;

    // Case 1: File provided via multipart/form-data
    if (req.file) {
      if (!isS3Configured()) {
        return res.status(503).json({
          success: false,
          message: 'Cloud storage service is not configured. Verify AWS credentials in server/.env.',
        });
      }

      s3Key = generateS3Key({
        category: 'document',
        userId: req.user._id.toString(),
        originalName: req.file.originalname,
      });

      await uploadToS3({
        buffer: req.file.buffer,
        key: s3Key,
        contentType: req.file.mimetype,
      });

      originalName = req.file.originalname;
      contentType = req.file.mimetype;
      size = req.file.size;
    } else if (!s3Key) {
      // Case 2: Neither file nor existing s3Key supplied
      return res.status(400).json({
        success: false,
        message: 'Please attach a document file or provide a valid s3Key reference.',
      });
    }

    const doc = await MedicalDocument.create({
      pet: pet._id,
      owner: req.user._id,
      title,
      category,
      s3Key,
      originalName: originalName || 'document.pdf',
      contentType: contentType || 'application/pdf',
      size: size || 0,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Medical document uploaded and registered successfully.',
      document: doc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all medical documents for a pet
// @route   GET /api/documents
// @access  Private
export const getMedicalDocuments = async (req, res, next) => {
  try {
    const petId = req.query.pet || req.query.petId;
    const filter = {};

    if (petId) {
      if (!isValidObjectId(petId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pet ID.',
        });
      }

      const pet = await Pet.findById(petId);
      if (!pet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found.',
        });
      }

      const isOwner = pet.owner.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this pet.',
        });
      }

      filter.pet = petId;
    } else {
      if (req.user.role !== 'admin') {
        const userPetIds = await Pet.find({ owner: req.user._id }).distinct('_id');
        filter.$or = [{ owner: req.user._id }, { pet: { $in: userPetIds } }];
      }
    }

    const documents = await MedicalDocument.find(filter)
      .populate('pet', 'name species breed')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get presigned view URL for a private medical document
// @route   GET /api/documents/:id/presigned-url
// @access  Private
export const getDocumentPresignedUrl = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Document ID: ${id}`,
      });
    }

    const doc = await MedicalDocument.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Medical document not found.',
      });
    }

    // Ownership check: allow current pet owner, document creator, or admin
    const pet = await Pet.findById(doc.pet);
    const isCurrentPetOwner = pet && pet.owner.toString() === req.user._id.toString();
    const isDocCreator = doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isCurrentPetOwner && !isDocCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this medical document.',
      });
    }

    if (!isS3Configured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud storage is not configured.',
      });
    }

    const expiresIn = parseInt(req.query.expiresIn, 10) || 3600; // default 1 hour
    const presignedUrl = await generatePresignedUrl(doc.s3Key, expiresIn);

    res.status(200).json({
      success: true,
      documentId: id,
      s3Key: doc.s3Key,
      presignedUrl,
      expiresIn,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete medical document (Safe sequencing: S3 object -> MongoDB record)
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteMedicalDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Document ID: ${id}`,
      });
    }

    const doc = await MedicalDocument.findById(id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Medical document not found.',
      });
    }

    // Step 1: Historical records protection
    if (doc.isHistorical) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Historical pre-adoption medical documents cannot be deleted.',
      });
    }

    // Step 2: Verify Ownership (must be current pet owner AND document creator, or admin)
    const pet = await Pet.findById(doc.pet);
    const isCurrentPetOwner = pet && pet.owner.toString() === req.user._id.toString();
    const isDocCreator = doc.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if ((!isCurrentPetOwner || !isDocCreator) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete medical documents for your own current pets.',
      });
    }

    // Step 2: Delete S3 object safely if S3 is configured
    if (isS3Configured() && doc.s3Key) {
      try {
        await deleteS3Object(doc.s3Key);
      } catch (s3Error) {
        // If object was already removed or missing in S3, proceed; otherwise report failure
        if (s3Error.name !== 'NoSuchKey') {
          console.error('[Document Delete S3 Error]:', s3Error.message);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete file from cloud storage. Database record was preserved.',
          });
        }
      }
    }

    // Step 3: Delete MongoDB record
    await MedicalDocument.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Medical document and associated cloud storage removed successfully.',
      documentId: id,
    });
  } catch (error) {
    next(error);
  }
};
