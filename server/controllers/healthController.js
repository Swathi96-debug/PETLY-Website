import HealthRecord, { HEALTH_RECORD_TYPES } from '../models/HealthRecord.js';
import Pet from '../models/Pet.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

// @desc    Create health record for a pet
// @route   POST /api/health
// @access  Private
export const createHealthRecord = async (req, res, next) => {
  try {
    const { pet: petId, type, title, description, date, value, status, notes } = req.body;

    if (!petId || !isValidObjectId(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pet ID is required.',
      });
    }

    if (!type || !HEALTH_RECORD_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing health category. Allowed: ${HEALTH_RECORD_TYPES.join(', ')}`,
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for health record.',
      });
    }

    // Verify referenced pet exists and is owned by authenticated user
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
        message: 'Access denied: You can only add health records for your own pets.',
      });
    }

    let recordDate = date;
    let recordStatus = status || 'completed';

    if (typeof date === 'string') {
      const trimmedDate = date.trim().toLowerCase();
      if (['completed', 'scheduled', 'upcoming', 'overdue', 'ongoing'].includes(trimmedDate)) {
        if (!status) recordStatus = trimmedDate;
        recordDate = new Date();
      } else {
        const parsed = new Date(date);
        recordDate = isNaN(parsed.getTime()) ? new Date() : parsed;
      }
    } else if (!date) {
      recordDate = new Date();
    }

    const healthRecord = await HealthRecord.create({
      pet: pet._id,
      owner: req.user._id,
      type,
      title,
      description: description || notes || '',
      date: recordDate,
      value: value || '',
      status: recordStatus,
      notes: notes || description || '',
    });

    res.status(201).json({
      success: true,
      message: 'Health record created successfully.',
      healthRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get health records (optionally filtered by pet)
// @route   GET /api/health
// @access  Private
export const getHealthRecords = async (req, res, next) => {
  try {
    const { pet: petId, type } = req.query;
    const filter = {};

    if (petId) {
      if (!isValidObjectId(petId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pet ID in query.',
        });
      }

      // Check pet ownership
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
      // Find all records for pets owned by current user (including historical records for adopted pets)
      if (req.user.role !== 'admin') {
        const userPetIds = await Pet.find({ owner: req.user._id }).distinct('_id');
        filter.$or = [{ owner: req.user._id }, { pet: { $in: userPetIds } }];
      }
    }

    if (type) {
      filter.type = type;
    }

    const records = await HealthRecord.find(filter)
      .populate('pet', 'name species breed')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single health record by ID
// @route   GET /api/health/:id
// @access  Private
export const getHealthRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Health Record ID: ${id}`,
      });
    }

    const record = await HealthRecord.findById(id).populate('pet', 'name species breed owner');
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found.',
      });
    }

    const pet = await Pet.findById(record.pet);
    const isCurrentPetOwner = pet && pet.owner.toString() === req.user._id.toString();
    const isRecordCreator = record.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isCurrentPetOwner && !isRecordCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this health record.',
      });
    }

    res.status(200).json({
      success: true,
      record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update health record
// @route   PUT /api/health/:id
// @access  Private
export const updateHealthRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Health Record ID: ${id}`,
      });
    }

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found.',
      });
    }

    // Historical records are protected from any modifications
    if (record.isHistorical) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Historical pre-adoption health records cannot be modified.',
      });
    }

    const pet = await Pet.findById(record.pet);
    const isCurrentPetOwner = pet && pet.owner.toString() === req.user._id.toString();
    const isRecordCreator = record.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Must be current pet owner AND creator of record (or admin)
    if ((!isCurrentPetOwner || !isRecordCreator) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only modify health records for your own current pets.',
      });
    }

    const allowedFields = ['type', 'title', 'description', 'date', 'value', 'status', 'notes'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'date') {
          const rawDate = req.body[field];
          if (typeof rawDate === 'string' && ['completed', 'scheduled', 'upcoming', 'overdue', 'ongoing'].includes(rawDate.trim().toLowerCase())) {
            record.status = rawDate.trim().toLowerCase();
          } else {
            const parsed = new Date(rawDate);
            if (!isNaN(parsed.getTime())) {
              record.date = parsed;
            }
          }
        } else {
          record[field] = req.body[field];
        }
      }
    });

    const updated = await record.save();

    res.status(200).json({
      success: true,
      message: 'Health record updated successfully.',
      record: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete health record
// @route   DELETE /api/health/:id
// @access  Private
export const deleteHealthRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Health Record ID: ${id}`,
      });
    }

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Health record not found.',
      });
    }

    // Historical records are protected from deletion
    if (record.isHistorical) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Historical pre-adoption health records cannot be deleted.',
      });
    }

    const pet = await Pet.findById(record.pet);
    const isCurrentPetOwner = pet && pet.owner.toString() === req.user._id.toString();
    const isRecordCreator = record.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Must be current pet owner AND creator of record (or admin)
    if ((!isCurrentPetOwner || !isRecordCreator) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete health records for your own current pets.',
      });
    }

    await HealthRecord.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Health record deleted successfully.',
      recordId: id,
    });
  } catch (error) {
    next(error);
  }
};
