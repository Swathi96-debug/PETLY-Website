import Pet from '../models/Pet.js';
import HealthRecord from '../models/HealthRecord.js';
import MedicalDocument from '../models/MedicalDocument.js';
import { deleteS3Object, generatePresignedUrl } from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

const normalizeStringArray = (val) => {
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
  if (typeof val === 'string' && val.trim()) return val.split(/\n|,/).map((v) => v.trim()).filter(Boolean);
  return [];
};

/**
 * Dynamically resolves time-limited presigned URLs for pets with private S3 photos.
 * Preserves stable photoKey and does not overwrite permanent storage in MongoDB.
 */
const resolvePetPresignedUrl = async (petDoc) => {
  if (!petDoc) return petDoc;
  const petObj = typeof petDoc.toObject === 'function' ? petDoc.toObject() : { ...petDoc };
  if (petObj.photoKey && isS3Configured()) {
    try {
      petObj.photoUrl = await generatePresignedUrl(petObj.photoKey, 3600);
    } catch (err) {
      console.warn(`[PetController] Could not generate presigned URL for pet ${petObj._id}:`, err.message);
    }
  }
  // Backward compatibility: Extract legacy allergies/conditions from description if structured fields are empty
  if ((!petObj.allergies || petObj.allergies.length === 0) && petObj.description) {
    const allergyMatch = petObj.description.match(/Allergies:\s*([^\n]+)/i);
    if (allergyMatch && allergyMatch[1]) {
      petObj.allergies = [allergyMatch[1].trim()];
    }
  }
  if ((!petObj.medicalConditions || petObj.medicalConditions.length === 0) && petObj.description) {
    const condMatch = petObj.description.match(/Conditions:\s*([^\n]+)/i);
    if (condMatch && condMatch[1]) {
      petObj.medicalConditions = [condMatch[1].trim()];
    }
  }
  return petObj;
};

// @desc    Create a new pet
// @route   POST /api/pets
// @access  Private
export const createPet = async (req, res, next) => {
  try {
    const {
      name,
      species,
      breed,
      age,
      gender,
      weight,
      temperature,
      height,
      color,
      themeColor,
      dob,
      adoptionDate,
      allergies,
      medicalConditions,
      description,
      photoKey,
      photoUrl,
      healthStatus,
      isAdoptable,
    } = req.body;

    if (!name || !species) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a pet name and species.',
      });
    }

    const VALID_THEMES = ['purple', 'blue', 'green', 'pink', 'orange', 'cyan', 'yellow', 'red'];
    const resolvedColor = color !== undefined ? String(color).trim() : '';
    const rawTheme = themeColor !== undefined ? String(themeColor).trim().toLowerCase() : '';
    const resolvedThemeColor = VALID_THEMES.includes(rawTheme) ? rawTheme : 'orange';

    // Explicitly enforce authenticated user as owner
    const pet = await Pet.create({
      name,
      species,
      breed: breed || 'Mixed',
      age: age !== undefined ? age : 1,
      gender: gender || 'Unknown',
      weight: weight !== undefined ? weight : 0,
      temperature: temperature !== undefined ? String(temperature).trim() : '',
      height: height !== undefined ? String(height).trim() : '',
      color: resolvedColor,
      themeColor: resolvedThemeColor,
      dob: dob !== undefined ? String(dob).trim() : '',
      adoptionDate: adoptionDate !== undefined ? String(adoptionDate).trim() : '',
      allergies: normalizeStringArray(allergies),
      medicalConditions: normalizeStringArray(medicalConditions),
      description: description || '',
      photoKey: photoKey || '',
      photoUrl: photoUrl || '',
      healthStatus: healthStatus || 'Healthy',
      isAdoptable: Boolean(isAdoptable),
      owner: req.user._id,
    });

    const resolvedPet = await resolvePetPresignedUrl(pet);

    res.status(201).json({
      success: true,
      message: 'Pet created successfully.',
      pet: resolvedPet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pets for authenticated user
// @route   GET /api/pets
// @access  Private
export const getPets = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'admin' && req.query.all === 'true') {
      // Admin requesting all pets in system
    } else {
      query.owner = req.user._id;
    }

    const pets = await Pet.find(query).sort({ createdAt: -1 });
    const resolvedPets = await Promise.all(pets.map(resolvePetPresignedUrl));

    res.status(200).json({
      success: true,
      count: resolvedPets.length,
      pets: resolvedPets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single pet by ID
// @route   GET /api/pets/:id
// @access  Private
export const getPetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Pet ID: ${id}`,
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found.',
      });
    }

    // Ownership check: allow current owner, original/previous owner (historical), admin, or adoptable pet
    const isOwner = pet.owner.toString() === req.user._id.toString();
    const isOriginalOwner = pet.originalOwner?.toString() === req.user._id.toString();
    const isInHistory = Array.isArray(pet.adoptionHistory) && pet.adoptionHistory.some(h => h.previousOwner?.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isOriginalOwner && !isInHistory && !isAdmin && !pet.isAdoptable) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this pet.',
      });
    }

    const resolvedPet = await resolvePetPresignedUrl(pet);

    res.status(200).json({
      success: true,
      pet: resolvedPet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update pet by ID
// @route   PUT /api/pets/:id
// @access  Private
export const updatePet = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Pet ID: ${id}`,
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found.',
      });
    }

    // Ownership check
    const isOwner = pet.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only modify your own pets.',
      });
    }

    // Allowed update fields (prevent changing owner)
    const allowedFields = [
      'name',
      'species',
      'breed',
      'age',
      'gender',
      'weight',
      'temperature',
      'height',
      'color',
      'themeColor',
      'dob',
      'adoptionDate',
      'allergies',
      'medicalConditions',
      'description',
      'photoKey',
      'photoUrl',
      'healthStatus',
      'isAdoptable',
    ];

    const VALID_THEMES = ['purple', 'blue', 'green', 'pink', 'orange', 'cyan', 'yellow', 'red'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'allergies' || field === 'medicalConditions') {
          pet[field] = normalizeStringArray(req.body[field]);
        } else if (field === 'themeColor') {
          const rawTheme = String(req.body[field]).trim().toLowerCase();
          if (VALID_THEMES.includes(rawTheme)) {
            pet.themeColor = rawTheme;
          }
        } else {
          pet[field] = req.body[field];
        }
      }
    });

    const updatedPet = await pet.save();
    const resolvedPet = await resolvePetPresignedUrl(updatedPet);

    res.status(200).json({
      success: true,
      message: 'Pet updated successfully.',
      pet: resolvedPet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete pet by ID
// @route   DELETE /api/pets/:id
// @access  Private
export const deletePet = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Pet ID: ${id}`,
      });
    }

    const pet = await Pet.findById(id);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Pet not found.',
      });
    }

    // Ownership check
    const isOwner = pet.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own pets.',
      });
    }

    // Clean up associated health records
    await HealthRecord.deleteMany({ pet: pet._id });

    // Clean up associated medical documents and their S3 objects safely
    const docs = await MedicalDocument.find({ pet: pet._id });
    for (const doc of docs) {
      if (doc.s3Key) {
        await deleteS3Object(doc.s3Key).catch(() => {});
      }
    }
    await MedicalDocument.deleteMany({ pet: pet._id });

    // Delete pet
    await Pet.findByIdAndDelete(pet._id);

    res.status(200).json({
      success: true,
      message: 'Pet and associated health records removed successfully.',
      petId: id,
    });
  } catch (error) {
    next(error);
  }
};
