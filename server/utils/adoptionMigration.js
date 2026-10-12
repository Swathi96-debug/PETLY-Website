import Pet from '../models/Pet.js';
import AdoptionApplication from '../models/AdoptionApplication.js';
import AdoptionListing from '../models/AdoptionListing.js';
import HealthRecord from '../models/HealthRecord.js';
import MedicalDocument from '../models/MedicalDocument.js';

/**
 * Reconciles or migrates an approved adoption into the Phase 10C ownership model.
 * If the pet is already transferred and records are tagged, this is idempotent.
 *
 * @param {string|mongoose.Types.ObjectId} petId
 * @returns {Promise<Object>} Migration result summary
 */
export const migrateApprovedAdoption = async (petId) => {
  const pet = await Pet.findById(petId);
  if (!pet) {
    throw new Error(`Pet ${petId} not found`);
  }

  const application = await AdoptionApplication.findOne({ pet: petId, status: 'approved' });
  if (!application) {
    throw new Error(`No approved adoption application found for pet ${petId}`);
  }

  const adopterId = application.applicant;
  const currentOwnerId = pet.owner;
  const originalOwnerId = pet.originalOwner || currentOwnerId;

  // Build snapshot if not already present
  if (!pet.preAdoptionSnapshot) {
    pet.preAdoptionSnapshot = {
      originalOwner: originalOwnerId,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      weight: pet.weight,
      temperature: pet.temperature,
      height: pet.height,
      color: pet.color,
      themeColor: pet.themeColor,
      dob: pet.dob,
      description: pet.description,
      photoKey: pet.photoKey,
      photoUrl: pet.photoUrl,
      healthStatus: pet.healthStatus,
      allergies: [...(pet.allergies || [])],
      medicalConditions: [...(pet.medicalConditions || [])],
      adoptionDate: pet.adoptionDate,
      applicationId: application._id,
      listingId: application.listing,
      adoptedAt: application.updatedAt || application.createdAt || new Date(),
      adopter: adopterId,
    };
  }

  if (!pet.originalOwner) {
    pet.originalOwner = originalOwnerId;
  }

  if (!pet.adoptionHistory || pet.adoptionHistory.length === 0) {
    pet.adoptionHistory = [{
      previousOwner: originalOwnerId,
      newOwner: adopterId,
      application: application._id,
      listing: application.listing,
      date: application.updatedAt || application.createdAt || new Date(),
      snapshot: pet.preAdoptionSnapshot,
    }];
  }

  // Transfer pet ownership
  pet.owner = adopterId;
  pet.adoptionStatus = 'ADOPTED';
  pet.isAdoptable = false;
  await pet.save();

  // Ensure listing is marked adopted
  if (application.listing) {
    await AdoptionListing.findByIdAndUpdate(application.listing, { status: 'adopted' });
  }

  // Tag pre-adoption health records
  const healthRes = await HealthRecord.updateMany(
    { pet: pet._id, isHistorical: { $ne: true } },
    { $set: { isHistorical: true, preAdoptionOwner: originalOwnerId } }
  );

  // Tag pre-adoption medical documents
  const docRes = await MedicalDocument.updateMany(
    { pet: pet._id, isHistorical: { $ne: true } },
    { $set: { isHistorical: true, preAdoptionOwner: originalOwnerId } }
  );

  return {
    success: true,
    petId: pet._id.toString(),
    adopterId: adopterId.toString(),
    originalOwnerId: originalOwnerId.toString(),
    healthRecordsTagged: healthRes.modifiedCount,
    medicalDocsTagged: docRes.modifiedCount,
  };
};

/**
 * Reconciles all pets that have an approved AdoptionApplication
 * but whose owner has not yet been transferred to the applicant.
 */
export const reconcileAllApprovedAdoptions = async () => {
  const approvedApps = await AdoptionApplication.find({ status: 'approved' }).populate('pet');
  let migratedCount = 0;

  for (const app of approvedApps) {
    if (!app.pet) continue;
    const pet = app.pet;
    const needsMigration =
      pet.owner?.toString() !== app.applicant?.toString() ||
      pet.adoptionStatus !== 'ADOPTED' ||
      !pet.originalOwner;

    if (needsMigration) {
      await migrateApprovedAdoption(pet._id);
      migratedCount++;
    }
  }

  return { checked: approvedApps.length, migrated: migratedCount };
};
