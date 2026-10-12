import mongoose from 'mongoose';
import AdoptionListing from '../models/AdoptionListing.js';
import AdoptionApplication from '../models/AdoptionApplication.js';
import Pet from '../models/Pet.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import HealthRecord from '../models/HealthRecord.js';
import MedicalDocument from '../models/MedicalDocument.js';
import { isValidObjectId } from '../utils/validateObjectId.js';
import { generatePresignedUrl } from '../utils/s3Uploader.js';
import { isS3Configured } from '../config/s3.js';

const DEMO_ADOPTION_DATA = [
  {
    pet: {
      name: 'Kaito',
      species: 'Dog',
      breed: 'Shiba Inu',
      age: 2,
      gender: 'Male',
      weight: 10,
      description: 'Kaito is an alert, spirited Shiba Inu who loves brisk morning walks and puzzle toys. He is crate-trained, house-broken, and walks beautifully on a leash. He thrives in a calm household that appreciates an independent, loyal canine spirit.',
      themeColor: 'orange',
      healthStatus: 'Healthy',
      color: 'Red Sesame',
    },
    listing: {
      title: 'Kaito — Spirited Cyber Ward Shiba Inu Companion',
      description: 'Kaito is an alert, spirited Shiba Inu who loves brisk morning walks and puzzle toys. He is crate-trained, house-broken, and walks beautifully on a leash. He thrives in a calm household that appreciates an independent, loyal canine spirit with patience and gentle positive reinforcement.',
      adoptionFee: 120,
      requirements: ['Fenced yard preferred', 'Adult-only or older teens household', 'Experience with primitive dog breeds'],
      location: 'Neo-Kyoto Cyber Ward',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Luna',
      species: 'Cat',
      breed: 'Silver Bengal',
      age: 3,
      gender: 'Female',
      weight: 4.2,
      description: 'Luna is a graceful, inquisitive Silver Bengal with striking rosettes and emerald green eyes. She enjoys perched vantage points, feather wands, and evening lap cuddles.',
      themeColor: 'purple',
      healthStatus: 'Healthy',
      color: 'Silver Rosetted',
      photoKey: 'cat.jpg',
    },
    listing: {
      title: 'Luna — Graceful Silver Bengal Looking for Forever Home',
      description: 'Luna is a graceful, inquisitive Silver Bengal with striking rosettes and emerald green eyes. She enjoys perched vantage points, feather wands, and gentle evening lap cuddles. Luna is microchipped, fully vaccinated, and ready to brighten a loving, dedicated home.',
      adoptionFee: 85,
      requirements: ['Indoor-only home', 'Cat tree or vertical perches', 'Interactive daily playtime'],
      location: 'Neo-Kyoto High-Line',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Barnaby',
      species: 'Rabbit',
      breed: 'Holland Lop',
      age: 1,
      gender: 'Male',
      weight: 1.8,
      description: 'Barnaby is a gentle, velvet-eared Holland Lop bunny who loves crunchy orchard hay, fresh mint leaves, and soft forehead pets.',
      themeColor: 'emerald',
      healthStatus: 'Healthy',
      color: 'Broken Tortoise',
    },
    listing: {
      title: 'Barnaby — Gentle Holland Lop Bunny',
      description: 'Barnaby is a gentle, velvet-eared Holland Lop bunny who loves crunchy orchard hay, fresh mint leaves, and soft forehead pets. He is litterbox trained and gets along wonderfully in quiet, peaceful living environments.',
      adoptionFee: 45,
      requirements: ['Spacious indoor enclosure or free-roam setup', 'Bunny-proofed electrical cords', 'Daily timothy hay and fresh greens'],
      location: 'Aurora Biodome District',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Zephyr',
      species: 'Bird',
      breed: 'Turquoise Cockatiel',
      age: 2,
      gender: 'Male',
      weight: 0.09,
      description: 'Zephyr is a cheerful, whistle-loving cockatiel with sunny crest feathers. He can whistle short melodic tunes, steps onto hands willingly, and loves foraging trays with safe seeds.',
      themeColor: 'cyan',
      healthStatus: 'Healthy',
      color: 'Turquoise Pearl',
      photoKey: 'Bird (1).jpg',
    },
    listing: {
      title: 'Zephyr — Musical & Friendly Cockatiel',
      description: 'Zephyr is a cheerful, whistle-loving cockatiel with sunny crest feathers. He can whistle short melodic tunes, steps onto hands willingly, and loves foraging trays with sunflower seeds and dried papaya treats.',
      adoptionFee: 60,
      requirements: ['Minimum 24x24 inch flight cage', 'Strictly no non-stick cookware or aerosol usage', 'Daily supervised out-of-cage time'],
      location: 'Sky-Harbor Aviary',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Nova',
      species: 'Dog',
      breed: 'Siberian Husky',
      age: 4,
      gender: 'Female',
      weight: 22,
      description: 'Nova is a regal, high-energy Siberian Husky with ice-blue eyes and an adventurous heart. She loves trail hikes, agility training, and cooling off on cool tile floors.',
      themeColor: 'blue',
      healthStatus: 'Healthy',
      color: 'Silver & White',
    },
    listing: {
      title: 'Nova — Adventurous Trail-Ready Siberian Husky',
      description: 'Nova is a regal, high-energy Siberian Husky with ice-blue eyes and an adventurous heart. She loves trail hikes, agility training, and cooling off on cool tile floors. Nova has undergone basic obedience training and is eager to bond with an active human companion.',
      adoptionFee: 150,
      requirements: ['Secure 6-foot fenced yard', 'Active outdoor lifestyle', 'No small pocket pets in household'],
      location: 'Frost Peak Sanctuary',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Mochi',
      species: 'Cat',
      breed: 'Scottish Fold',
      age: 1,
      gender: 'Male',
      weight: 3.8,
      description: 'Mochi is a sweet, owl-eyed Scottish Fold who communicates with gentle trills. He is fond of soft plush blankets, automated laser toys, and relaxing quietly beside your workstation.',
      themeColor: 'pink',
      healthStatus: 'Healthy',
      color: 'Cream Tabby',
    },
    listing: {
      title: 'Mochi — Affectionate Scottish Fold Companion',
      description: 'Mochi is a sweet, owl-eyed Scottish Fold who communicates with gentle trills. He is fond of soft plush blankets, automated laser toys, and relaxing quietly beside your workstation while you work.',
      adoptionFee: 95,
      requirements: ['Indoor-only home', 'Regular gentle grooming', 'Veterinary joint care checkups'],
      location: 'Silicon Oasis Quarter',
      status: 'available',
    },
  },
  {
    pet: {
      name: 'Atlas',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Male',
      weight: 31,
      description: 'Atlas is a joyful, affectionate Golden Retriever who believes everyone he meets is his new best friend. He loves tennis balls, lake swimming, and gentle hugs.',
      themeColor: 'amber',
      healthStatus: 'Healthy',
      color: 'Honey Gold',
    },
    listing: {
      title: 'Atlas — Gentle & Loving Family Golden Retriever',
      description: 'Atlas is a joyful, affectionate Golden Retriever who believes everyone he meets is his new best friend. He loves tennis balls, lake swimming, and gentle hugs. Perfect for families looking for a gentle, loyal, and devoted companion.',
      adoptionFee: 140,
      requirements: ['Daily walks and playtime', 'Loving family environment', 'Committed to regular grooming'],
      location: 'Emerald Valley District',
      status: 'available',
    },
  },
];

export const ensureDemoAdoptionListings = async () => {
  try {
    let shelterUser = await User.findOne({ email: 'sanctuary@petly.io' });
    if (!shelterUser) {
      shelterUser = await User.create({
        fullName: 'Neo-Kyoto Pet Sanctuary',
        email: 'sanctuary@petly.io',
        password: 'Password123!',
        role: 'shelter',
        phone: '+1 (555) 019-2834',
        bio: 'Premier cyber-sanctuary dedicated to pet rescue, rehabilitation, and compassionate rehoming.',
        shelterDetails: {
          shelterName: 'Neo-Kyoto Pet Sanctuary',
          address: '742 Cyber Park Boulevard, Sector 4',
          licenseNumber: 'SANCT-2049-PETLY',
          website: 'https://petly.io/sanctuary',
        },
      });
    }

    for (const item of DEMO_ADOPTION_DATA) {
      const existing = await AdoptionListing.findOne({
        shelter: shelterUser._id,
        title: item.listing.title,
      });

      if (!existing) {
        const pet = await Pet.create({
          ...item.pet,
          owner: shelterUser._id,
          isAdoptable: true,
        });

        await AdoptionListing.create({
          ...item.listing,
          pet: pet._id,
          shelter: shelterUser._id,
        });
      } else if (item.pet.photoKey) {
        // Idempotently update pet's photoKey if configured and not yet updated
        await Pet.updateOne(
          { _id: existing.pet, photoKey: { $ne: item.pet.photoKey } },
          { $set: { photoKey: item.pet.photoKey } }
        );
      }
    }
  } catch (err) {
    console.warn('[AdoptionController] ensureDemoAdoptionListings warning:', err.message);
  }
};

const resolvePetPhotos = async (petDoc) => {
  if (!petDoc) return petDoc;
  const pet = typeof petDoc.toObject === 'function' ? petDoc.toObject() : { ...petDoc };
  if (pet.photoKey && isS3Configured()) {
    try {
      pet.photoUrl = await generatePresignedUrl(pet.photoKey, 3600);
    } catch (e) {
      console.warn('[AdoptionController] Presigned URL resolution failed:', e.message);
    }
  }
  return pet;
};

// ==========================================
// ADOPTION LISTINGS
// ==========================================

// @desc    Create adoption listing
// @route   POST /api/adoption
// @access  Private (Pet owner, Shelter, or Admin)
export const createAdoptionListing = async (req, res, next) => {
  try {
    const { pet: petId, title, description, adoptionFee, requirements, location } = req.body;

    if (!petId || !isValidObjectId(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid pet ID is required.',
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required for adoption listing.',
      });
    }

    if (description && description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Listing description cannot exceed 2000 characters.',
      });
    }

    // Explicitly verify referenced pet belongs to authenticated user (or user is shelter/admin)
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Referenced pet not found.',
      });
    }

    const isPetOwner = pet.owner.toString() === req.user._id.toString();
    const isAdminOrShelter = req.user.role === 'admin' || req.user.role === 'shelter';
    if (!isPetOwner && !isAdminOrShelter) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot create an adoption listing for a pet you do not own.',
      });
    }

    // Check if pet already has an active listing
    const existingListing = await AdoptionListing.findOne({
      pet: petId,
      status: { $in: ['available', 'pending'] },
    });
    if (existingListing) {
      return res.status(400).json({
        success: false,
        message: 'This pet already has an active adoption listing.',
      });
    }

    // Mark pet as adoptable
    pet.isAdoptable = true;
    await pet.save();

    const listing = await AdoptionListing.create({
      pet: pet._id,
      shelter: req.user._id,
      title,
      description,
      adoptionFee: adoptionFee !== undefined ? adoptionFee : 0,
      requirements: Array.isArray(requirements) ? requirements : [],
      location: location || '',
      status: 'available',
    });

    res.status(201).json({
      success: true,
      message: 'Adoption listing created successfully.',
      listing,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all adoption listings (Public or filtered)
// @route   GET /api/adoption
// @access  Public / Private
export const getAdoptionListings = async (req, res, next) => {
  try {
    await ensureDemoAdoptionListings();

    const { status, shelter, species } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: 'withdrawn' }; // default: available & pending
    }

    if (shelter && isValidObjectId(shelter)) {
      filter.shelter = shelter;
    }

    let query = AdoptionListing.find(filter)
      .populate('pet', 'name species breed age gender photoKey photoUrl themeColor healthStatus')
      .populate('shelter', 'fullName email phone shelterDetails')
      .sort({ createdAt: -1 });

    const listings = await query;

    // Optional client filter by pet species
    const filteredListings = species
      ? listings.filter((l) => l.pet?.species?.toLowerCase() === species.toLowerCase())
      : listings;

    const resolvedListings = await Promise.all(
      filteredListings.map(async (listing) => {
        const l = typeof listing.toObject === 'function' ? listing.toObject() : { ...listing };
        if (l.pet) {
          l.pet = await resolvePetPhotos(l.pet);
        }
        return l;
      })
    );

    res.status(200).json({
      success: true,
      count: resolvedListings.length,
      listings: resolvedListings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single adoption listing by ID
// @route   GET /api/adoption/:id
// @access  Public / Private
export const getAdoptionListingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Listing ID: ${id}`,
      });
    }

    const listing = await AdoptionListing.findById(id)
      .populate('pet', 'name species breed age gender weight description photoKey photoUrl healthStatus')
      .populate('shelter', 'fullName email phone shelterDetails');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Adoption listing not found.',
      });
    }

    const listingObj = typeof listing.toObject === 'function' ? listing.toObject() : { ...listing };
    if (listingObj.pet) {
      listingObj.pet = await resolvePetPhotos(listingObj.pet);
    }

    res.status(200).json({
      success: true,
      listing: listingObj,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update adoption listing
// @route   PUT /api/adoption/:id
// @access  Private (Listing Owner / Shelter / Admin only)
export const updateAdoptionListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Listing ID: ${id}`,
      });
    }

    const listing = await AdoptionListing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Adoption listing not found.',
      });
    }

    // Explicit authorization check
    const isShelter = listing.shelter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isShelter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to modify this adoption listing.',
      });
    }

    if (req.body.description !== undefined && req.body.description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Listing description cannot exceed 2000 characters.',
      });
    }

    const allowedFields = ['title', 'description', 'adoptionFee', 'requirements', 'status', 'location'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    const updated = await listing.save();

    res.status(200).json({
      success: true,
      message: 'Adoption listing updated successfully.',
      listing: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete adoption listing
// @route   DELETE /api/adoption/:id
// @access  Private (Listing Owner / Shelter / Admin only)
export const deleteAdoptionListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Listing ID: ${id}`,
      });
    }

    const listing = await AdoptionListing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Adoption listing not found.',
      });
    }

    // Explicit authorization check
    const isShelter = listing.shelter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isShelter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to delete this adoption listing.',
      });
    }

    // Reset pet adoptable flag
    await Pet.findByIdAndUpdate(listing.pet, { isAdoptable: false });

    // Clean up applications
    await AdoptionApplication.deleteMany({ listing: listing._id });

    await AdoptionListing.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Adoption listing and associated applications removed successfully.',
      listingId: id,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADOPTION APPLICATIONS
// ==========================================

// @desc    Submit adoption application
// @route   POST /api/adoption/:listingId/apply
// @access  Private (Authenticated users)
export const applyForAdoption = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const { livingSituation, experience, phone, notes } = req.body;

    if (!isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Listing ID: ${listingId}`,
      });
    }

    const listing = await AdoptionListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Adoption listing not found.',
      });
    }

    if (listing.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `This listing is currently ${listing.status} and cannot receive new applications.`,
      });
    }

    // Shelter cannot apply to their own listing
    if (listing.shelter.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit an adoption application for your own listing.',
      });
    }

    // Check for existing pending application from this user
    const existingApp = await AdoptionApplication.findOne({
      listing: listing._id,
      applicant: req.user._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an active application for this pet.',
      });
    }

    const application = await AdoptionApplication.create({
      applicant: req.user._id,
      listing: listing._id,
      pet: listing.pet,
      shelter: listing.shelter,
      livingSituation: livingSituation || '',
      experience: experience || '',
      phone: phone || req.user.phone || '',
      notes: notes || '',
      status: 'pending',
    });

    // Notify the listing shelter
    await Notification.create({
      user: listing.shelter,
      type: 'adoption',
      title: 'New Adoption Application',
      message: `${req.user.fullName} applied to adopt for "${listing.title}".`,
      link: `/adopt`,
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Adoption application submitted successfully.',
      application,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get applications submitted by authenticated user
// @route   GET /api/adoption/applications
// @access  Private
export const getMyApplications = async (req, res, next) => {
  try {
    const applications = await AdoptionApplication.find({ applicant: req.user._id })
      .populate('listing', 'title status location adoptionFee')
      .populate('pet', 'name species breed photoKey photoUrl')
      .populate('shelter', 'fullName email')
      .sort({ createdAt: -1 });

    const resolvedApps = await Promise.all(
      applications.map(async (app) => {
        const a = typeof app.toObject === 'function' ? app.toObject() : { ...app };
        if (a.pet) {
          a.pet = await resolvePetPhotos(a.pet);
        }
        return a;
      })
    );

    res.status(200).json({
      success: true,
      count: resolvedApps.length,
      applications: resolvedApps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get applications received for a specific listing (Shelter / Admin only)
// @route   GET /api/adoption/:listingId/applications
// @access  Private (Listing Owner / Shelter / Admin)
export const getListingApplications = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    if (!isValidObjectId(listingId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Listing ID: ${listingId}`,
      });
    }

    const listing = await AdoptionListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Adoption listing not found.',
      });
    }

    // Verify authorized shelter/owner or admin
    const isShelter = listing.shelter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isShelter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view applications for your own listings.',
      });
    }

    const applications = await AdoptionApplication.find({ listing: listingId })
      .populate('applicant', 'fullName email phone bio')
      .populate('pet', 'name species breed photoKey photoUrl')
      .sort({ createdAt: -1 });

    const resolvedApps = await Promise.all(
      applications.map(async (app) => {
        const a = typeof app.toObject === 'function' ? app.toObject() : { ...app };
        if (a.pet) {
          a.pet = await resolvePetPhotos(a.pet);
        }
        return a;
      })
    );

    res.status(200).json({
      success: true,
      count: resolvedApps.length,
      applications: resolvedApps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status (Approve/Reject by shelter, or Withdraw by applicant)
// @route   PUT /api/adoption/applications/:id
// @access  Private
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Application ID: ${id}`,
      });
    }

    const application = await AdoptionApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Adoption application not found.',
      });
    }

    const isApplicant = application.applicant.toString() === req.user._id.toString();
    const isShelter = application.shelter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isShelter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to modify this application.',
      });
    }

    // Role-dependent state transitions
    if (isApplicant && !isShelter && !isAdmin) {
      // Applicant can ONLY withdraw
      if (status !== 'withdrawn') {
        return res.status(403).json({
          success: false,
          message: 'Applicants may only withdraw their own application.',
        });
      }
      application.status = 'withdrawn';
    } else {
      // Shelter or Admin can approve/reject/set status
      if (!['pending', 'approved', 'rejected', 'withdrawn'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid application status.',
        });
      }
      application.status = status;

      // If approved, transfer pet ownership and preserve pre-adoption snapshot idempotently
      if (status === 'approved') {
        const pet = await Pet.findById(application.pet);
        if (!pet) {
          return res.status(404).json({
            success: false,
            message: 'Referenced pet not found for adoption approval.',
          });
        }

        // Idempotency check: Has this adoption or pet already been approved / adopted?
        const isAlreadyAdopted = pet.adoptionStatus === 'ADOPTED';
        const isSameAdopter = pet.owner?.toString() === application.applicant.toString();

        if (isAlreadyAdopted && isSameAdopter) {
          // Idempotent retry: Application is already approved and pet already transferred to this adopter.
          // Do not re-transfer, do not create duplicate history entries, do not re-snapshot.
        } else if (isAlreadyAdopted && !isSameAdopter) {
          return res.status(400).json({
            success: false,
            message: 'This pet has already been adopted by another applicant.',
          });
        } else {
          // First-time adoption approval: execute atomic transfer
          const previousOwnerId = pet.owner;
          const adopterId = application.applicant;

          // Capture pre-adoption snapshot
          const snapshot = {
            originalOwner: pet.originalOwner || previousOwnerId,
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
            adoptedAt: new Date(),
            adopter: adopterId,
          };

          // Try transaction session for atomicity
          let session = null;
          let transactionSucceeded = false;
          try {
            session = await mongoose.startSession();
            session.startTransaction();

            // 1. Preserve originalOwner permanently if not set
            if (!pet.originalOwner) {
              pet.originalOwner = previousOwnerId;
            }
            if (!pet.preAdoptionSnapshot) {
              pet.preAdoptionSnapshot = snapshot;
            }
            if (!pet.adoptionHistory) {
              pet.adoptionHistory = [];
            }
            pet.adoptionHistory.push({
              previousOwner: previousOwnerId,
              newOwner: adopterId,
              application: application._id,
              listing: application.listing,
              date: new Date(),
              snapshot,
            });

            // 2. Transfer ownership to adopter
            pet.owner = adopterId;
            pet.adoptionStatus = 'ADOPTED';
            pet.isAdoptable = false;
            pet.adoptionDate = new Date().toISOString();
            await pet.save({ session });

            // 3. Update listing
            await AdoptionListing.findByIdAndUpdate(
              application.listing,
              { status: 'adopted' },
              { session }
            );

            // 4. Tag existing health records as historical
            await HealthRecord.updateMany(
              { pet: pet._id },
              { $set: { isHistorical: true, preAdoptionOwner: previousOwnerId } },
              { session }
            );

            // 5. Tag existing medical documents as historical
            await MedicalDocument.updateMany(
              { pet: pet._id },
              { $set: { isHistorical: true, preAdoptionOwner: previousOwnerId } },
              { session }
            );

            await session.commitTransaction();
            transactionSucceeded = true;
          } catch (txErr) {
            if (session) {
              await session.abortTransaction().catch(() => {});
            }
            console.warn('[AdoptionController] Transaction failed or unsupported, executing sequential fallback:', txErr.message);
          } finally {
            if (session) {
              session.endSession().catch(() => {});
            }
          }

          // Fallback if transactions unsupported in current MongoDB topology
          if (!transactionSucceeded) {
            if (!pet.originalOwner) pet.originalOwner = previousOwnerId;
            if (!pet.preAdoptionSnapshot) pet.preAdoptionSnapshot = snapshot;
            if (!pet.adoptionHistory) pet.adoptionHistory = [];
            pet.adoptionHistory.push({
              previousOwner: previousOwnerId,
              newOwner: adopterId,
              application: application._id,
              listing: application.listing,
              date: new Date(),
              snapshot,
            });
            pet.owner = adopterId;
            pet.adoptionStatus = 'ADOPTED';
            pet.isAdoptable = false;
            pet.adoptionDate = new Date().toISOString();
            await pet.save();

            await AdoptionListing.findByIdAndUpdate(application.listing, { status: 'adopted' });
            await HealthRecord.updateMany(
              { pet: pet._id },
              { $set: { isHistorical: true, preAdoptionOwner: previousOwnerId } }
            );
            await MedicalDocument.updateMany(
              { pet: pet._id },
              { $set: { isHistorical: true, preAdoptionOwner: previousOwnerId } }
            );
          }
        }
      }

      // Notify applicant
      await Notification.create({
        user: application.applicant,
        type: 'adoption',
        title: 'Adoption Application Update',
        message: `Your adoption application status is now: ${status.toUpperCase()}.`,
        link: `/adopt`,
      }).catch(() => {});
    }

    if (notes !== undefined) {
      application.notes = notes;
    }

    const updated = await application.save();

    res.status(200).json({
      success: true,
      message: `Application status updated to ${application.status}.`,
      application: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete adoption application
// @route   DELETE /api/adoption/applications/:id
// @access  Private (Applicant or Admin)
export const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid Application ID: ${id}`,
      });
    }

    const application = await AdoptionApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Adoption application not found.',
      });
    }

    const isApplicant = application.applicant.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isApplicant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own application.',
      });
    }

    await AdoptionApplication.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully.',
      applicationId: id,
    });
  } catch (error) {
    next(error);
  }
};
