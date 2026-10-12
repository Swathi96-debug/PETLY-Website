import Pet from '../models/Pet.js';
import HealthRecord from '../models/HealthRecord.js';
import MedicalDocument from '../models/MedicalDocument.js';
import AdoptionListing from '../models/AdoptionListing.js';
import AdoptionApplication from '../models/AdoptionApplication.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import ServiceBooking from '../models/ServiceBooking.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { generatePresignedUrl } from '../utils/s3Uploader.js';
import { isValidObjectId } from '../utils/validateObjectId.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.6-flash';
const DEFAULT_TERTIARY_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_QUATERNARY_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_QUINARY_MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_GEMINI_CHAIN = [
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_TERTIARY_MODEL,
  DEFAULT_QUATERNARY_MODEL,
  DEFAULT_QUINARY_MODEL,
];

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~15MB binary

/**
 * Builds the pet-safety system instruction with verified MongoDB pet context if provided.
 */
const buildSystemInstruction = (pet) => {
  let prompt = `You are PETLY AI, a compassionate, reliable, and knowledgeable pet-care assistant.

Core Safety & Operating Guidelines:
1. Provide general, educational, and practical pet-care guidance regarding nutrition, daily wellness, grooming, behavior, and positive training.
2. You are NOT a veterinarian. You cannot diagnose medical conditions, interpret complex clinical symptoms, or prescribe medication.
3. For any emergencies, trauma, toxic ingestion (e.g., chocolate, grapes, xylitol), labored breathing, collapse, severe pain, or acute distress, you MUST explicitly urge the owner to contact an emergency veterinarian or animal poison control immediately.
4. Never claim to diagnose specific diseases or guarantee clinical outcomes.
5. Never invent or hallucinate pet medical history.
6. Keep guidance actionable, empathetic, pet-safe, well-structured, and concise. Avoid unnecessary filler or excessively long walls of text.

Medical & Multimodal Media Guidelines:
1. When analyzing uploaded images, videos, or documents, clearly distinguish visible observations from a veterinary diagnosis.
2. Describe visible physical characteristics, posture, visible skin/coat traits, movement, or document text accurately.
3. NEVER present image or video observations as a definitive veterinary diagnosis.
4. If anything in an image, video, document, or query appears abnormal, painful, or unhealthy, recommend consulting a licensed veterinarian.
5. Do not fabricate clinical certainty from images or videos.

PETLY Data Access:
You have read-only tools to retrieve the authenticated user's PETLY records (their pets, health records, medical documents, orders, bookings, adoption applications, quiz history, community posts, notifications, and store/adoption listings). Call tools when relevant to answer accurately. Never invent user data.`;

  if (pet) {
    const ageStr = pet.age ? `${pet.age} year${pet.age > 1 ? 's' : ''} old` : 'Unknown';
    const weightStr = pet.weight ? `${pet.weight} kg` : 'Unknown';
    const allergiesStr = (Array.isArray(pet.allergies) && pet.allergies.length > 0)
      ? pet.allergies.join(', ')
      : (typeof pet.allergies === 'string' && pet.allergies.trim()) ? pet.allergies : 'None recorded';
    const conditionsStr = (Array.isArray(pet.medicalConditions) && pet.medicalConditions.length > 0)
      ? pet.medicalConditions.join(', ')
      : (typeof pet.medicalConditions === 'string' && pet.medicalConditions.trim()) ? pet.medicalConditions : 'None recorded';

    prompt += `\n\nVerified Pet Profile Context (from PETLY database):
- Name: ${pet.name}
- Species: ${pet.species}
- Breed: ${pet.breed || 'Unknown'}
- Age: ${ageStr}
- Gender: ${pet.gender || 'Unknown'}
- Weight: ${weightStr}
- Health Status: ${pet.healthStatus || 'Healthy'}
- Known Allergies: ${allergiesStr}
- Known Medical Conditions: ${conditionsStr}

Always take ${pet.name}'s species, breed traits, age, weight, and allergies into account when providing advice.`;
  }

  return prompt;
};

/**
 * Function Declarations for Gemini Tool Calling
 */
const assistantTools = [
  {
    functionDeclarations: [
      {
        name: 'getMyPets',
        description: "Retrieve all pets owned by the authenticated user, including name, species, breed, age, gender, weight, allergies, medical conditions, and health status.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getMyHealthRecords',
        description: "Retrieve the authenticated user's pet health records, including vaccinations, medications, appointments, weight history, and medical notes.",
        parameters: {
          type: 'OBJECT',
          properties: {
            petName: {
              type: 'STRING',
              description: 'Optional name of the pet to filter health records for.',
            },
            recordType: {
              type: 'STRING',
              description: 'Optional category (general, vaccination, medication, appointment, weight, diagnosis, other).',
            },
          },
        },
      },
      {
        name: 'getMyMedicalDocuments',
        description: "Retrieve medical document metadata for the authenticated user's pets with temporary secure presigned view URLs.",
        parameters: {
          type: 'OBJECT',
          properties: {
            petName: {
              type: 'STRING',
              description: 'Optional name of the pet to filter documents for.',
            },
            category: {
              type: 'STRING',
              description: 'Optional document category (lab_result, prescription, vaccine_certificate, xray, insurance, other).',
            },
          },
        },
      },
      {
        name: 'getMyOrders',
        description: "Retrieve the authenticated user's PETLY store order history, order items, prices, status, and purchase dates.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getMyBookings',
        description: "Retrieve the authenticated user's service bookings (veterinary, grooming, training, etc.), date, time, status, and associated pet.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getMyAdoptionApplications',
        description: "Retrieve the authenticated user's adoption applications and their current statuses.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getAvailableAdoptionListings',
        description: "Browse available pets for adoption listed on PETLY.",
        parameters: {
          type: 'OBJECT',
          properties: {
            species: {
              type: 'STRING',
              description: 'Optional filter by species (e.g. Dog, Cat).',
            },
            breed: {
              type: 'STRING',
              description: 'Optional filter by breed.',
            },
          },
        },
      },
      {
        name: 'getStoreProducts',
        description: "Browse or search products available in the PETLY store.",
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Search query for product name or description.',
            },
            category: {
              type: 'STRING',
              description: 'Product category.',
            },
          },
        },
      },
      {
        name: 'getMyQuizAttempts',
        description: "Retrieve the authenticated user's pet care quiz history, attempts, scores, and performance.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getMyCommunityActivity',
        description: "Retrieve the authenticated user's own community posts and comments.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'getMyNotifications',
        description: "Retrieve the authenticated user's recent PETLY notifications.",
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
    ],
  },
];

/**
 * Secure Read-Only PETLY Tool Execution Handlers
 * Strictly executes using req.user._id to prevent cross-user data access.
 */
const executeTool = async (name, args, userId) => {
  try {
    switch (name) {
      case 'getMyPets': {
        const pets = await Pet.find({ owner: userId }).lean();
        return {
          count: pets.length,
          pets: pets.map((p) => ({
            id: p._id,
            name: p.name,
            species: p.species,
            breed: p.breed || 'Unknown',
            age: p.age,
            dob: p.dob,
            gender: p.gender,
            weight: p.weight,
            height: p.height,
            temperature: p.temperature,
            physicalColor: p.physicalColor,
            themeColor: p.themeColor,
            allergies: p.allergies || [],
            medicalConditions: p.medicalConditions || [],
            healthStatus: p.healthStatus,
            adoptionStatus: p.adoptionStatus,
            notes: p.notes,
          })),
        };
      }

      case 'getMyHealthRecords': {
        const userPets = await Pet.find({ owner: userId }).select('_id name').lean();
        const userPetIds = userPets.map((p) => p._id);
        const petMap = Object.fromEntries(userPets.map((p) => [p._id.toString(), p.name]));

        const query = {
          $or: [{ owner: userId }, { pet: { $in: userPetIds } }],
        };

        if (args.petName && typeof args.petName === 'string') {
          const matchedPet = userPets.find((p) => p.name.toLowerCase() === args.petName.trim().toLowerCase());
          if (matchedPet) {
            query.pet = matchedPet._id;
          }
        }

        if (args.recordType && typeof args.recordType === 'string') {
          query.type = args.recordType.trim().toLowerCase();
        }

        const records = await HealthRecord.find(query).sort({ date: -1 }).limit(20).lean();

        return {
          count: records.length,
          records: records.map((r) => ({
            id: r._id,
            petName: petMap[r.pet?.toString()] || 'Pet',
            type: r.type,
            title: r.title,
            description: r.description,
            date: r.date,
            value: r.value,
            status: r.status,
            notes: r.notes,
          })),
        };
      }

      case 'getMyMedicalDocuments': {
        const userPets = await Pet.find({ owner: userId }).select('_id name').lean();
        const userPetIds = userPets.map((p) => p._id);
        const petMap = Object.fromEntries(userPets.map((p) => [p._id.toString(), p.name]));

        const query = {
          $or: [{ owner: userId }, { pet: { $in: userPetIds } }],
        };

        if (args.petName && typeof args.petName === 'string') {
          const matchedPet = userPets.find((p) => p.name.toLowerCase() === args.petName.trim().toLowerCase());
          if (matchedPet) {
            query.pet = matchedPet._id;
          }
        }

        if (args.category && typeof args.category === 'string') {
          query.category = args.category.trim().toLowerCase();
        }

        const docs = await MedicalDocument.find(query).sort({ createdAt: -1 }).limit(15).lean();

        const docsWithUrls = await Promise.all(
          docs.map(async (doc) => {
            let presignedUrl = null;
            if (doc.s3Key) {
              try {
                presignedUrl = await generatePresignedUrl(doc.s3Key, 900); // 15-min temporary URL
              } catch {
                presignedUrl = null;
              }
            }
            return {
              id: doc._id,
              petName: petMap[doc.pet?.toString()] || 'Pet',
              title: doc.title,
              category: doc.category,
              originalName: doc.originalName,
              contentType: doc.contentType,
              size: doc.size,
              notes: doc.notes,
              presignedUrl,
              createdAt: doc.createdAt,
            };
          })
        );

        return {
          count: docsWithUrls.length,
          documents: docsWithUrls,
        };
      }

      case 'getMyOrders': {
        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
        return {
          count: orders.length,
          orders: orders.map((o) => ({
            id: o._id,
            totalAmount: o.totalAmount,
            status: o.status,
            createdAt: o.createdAt,
            items: (o.items || []).map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          })),
        };
      }

      case 'getMyBookings': {
        const bookings = await ServiceBooking.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
        return {
          count: bookings.length,
          bookings: bookings.map((b) => ({
            id: b._id,
            serviceName: b.serviceName,
            providerName: b.providerName,
            category: b.category,
            petName: b.petName,
            date: b.date,
            time: b.time,
            status: b.status,
            notes: b.notes,
          })),
        };
      }

      case 'getMyAdoptionApplications': {
        const apps = await AdoptionApplication.find({ applicant: userId })
          .populate('pet', 'name species breed')
          .populate('listing', 'title')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        return {
          count: apps.length,
          applications: apps.map((a) => ({
            id: a._id,
            petName: a.pet?.name || 'Pet',
            species: a.pet?.species,
            listingTitle: a.listing?.title,
            status: a.status,
            livingSituation: a.livingSituation,
            experience: a.experience,
            createdAt: a.createdAt,
          })),
        };
      }

      case 'getAvailableAdoptionListings': {
        const query = { status: 'available' };
        if (args.species && typeof args.species === 'string') {
          query.species = new RegExp(args.species.trim(), 'i');
        }
        if (args.breed && typeof args.breed === 'string') {
          query.breed = new RegExp(args.breed.trim(), 'i');
        }

        const listings = await AdoptionListing.find(query).limit(10).lean();
        return {
          count: listings.length,
          listings: listings.map((l) => ({
            id: l._id,
            title: l.title,
            species: l.species,
            breed: l.breed,
            age: l.age,
            gender: l.gender,
            description: l.description,
            location: l.location,
          })),
        };
      }

      case 'getStoreProducts': {
        const query = {};
        if (args.category && typeof args.category === 'string') {
          query.category = new RegExp(args.category.trim(), 'i');
        }
        if (args.query && typeof args.query === 'string') {
          query.$or = [
            { name: new RegExp(args.query.trim(), 'i') },
            { description: new RegExp(args.query.trim(), 'i') },
          ];
        }

        const products = await Product.find(query).limit(10).lean();
        return {
          count: products.length,
          products: products.map((p) => ({
            id: p._id,
            name: p.name,
            price: p.price,
            category: p.category,
            stock: p.stock,
            description: p.description,
          })),
        };
      }

      case 'getMyQuizAttempts': {
        const attempts = await QuizAttempt.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
        return {
          count: attempts.length,
          attempts: attempts.map((a) => ({
            id: a._id,
            category: a.category,
            score: a.score,
            totalQuestions: a.totalQuestions,
            percentage: a.percentage,
            createdAt: a.createdAt,
          })),
        };
      }

      case 'getMyCommunityActivity': {
        const [posts, comments] = await Promise.all([
          Post.find({ author: userId }).sort({ createdAt: -1 }).limit(5).lean(),
          Comment.find({ author: userId }).sort({ createdAt: -1 }).limit(5).lean(),
        ]);

        return {
          postsCount: posts.length,
          posts: posts.map((p) => ({
            id: p._id,
            content: p.content,
            category: p.category,
            createdAt: p.createdAt,
            likesCount: p.likes ? p.likes.length : 0,
          })),
          commentsCount: comments.length,
          comments: comments.map((c) => ({
            id: c._id,
            content: c.content,
            createdAt: c.createdAt,
          })),
        };
      }

      case 'getMyNotifications': {
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(10).lean();
        return {
          count: notifications.length,
          notifications: notifications.map((n) => ({
            id: n._id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
          })),
        };
      }

      default:
        return { error: `Tool ${name} not recognized.` };
    }
  } catch (err) {
    return { error: `Failed to execute tool ${name}: ${err.message}` };
  }
};

// ==========================================
// CONVERSATION CRUD CONTROLLERS
// ==========================================

// @desc    Create a new conversation or import existing in-memory messages
// @route   POST /api/assistant/conversations
// @access  Private
export const createConversation = async (req, res) => {
  try {
    const { title, petId, messages } = req.body;

    let verifiedPet = null;
    if (petId) {
      if (!isValidObjectId(petId)) {
        return res.status(400).json({ success: false, message: `Invalid pet ID: ${petId}` });
      }
      verifiedPet = await Pet.findOne({ _id: petId, owner: req.user._id });
    }

    const conversation = await Conversation.create({
      user: req.user._id,
      title: title ? title.slice(0, 120) : 'New Conversation',
      pet: verifiedPet ? verifiedPet._id : null,
    });

    // If initial messages were passed (e.g. migrating in-memory chat)
    const savedMessages = [];
    if (Array.isArray(messages) && messages.length > 0) {
      for (const msg of messages) {
        const role = msg.role === 'user' || msg.sender === 'user' ? 'user' : 'assistant';
        const content = msg.content || msg.text || '';
        if (!content && !msg.media) continue;

        let mediaMeta = undefined;
        if (msg.media) {
          mediaMeta = {
            name: msg.media.name || 'attachment',
            mimeType: msg.media.mimeType || 'application/octet-stream',
            size: msg.media.size || 0,
            isVideo: Boolean(msg.media.isVideo),
          };
        }

        const saved = await Message.create({
          conversation: conversation._id,
          role,
          content: content || (mediaMeta ? 'Media attachment' : ''),
          media: mediaMeta,
          createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        });
        savedMessages.push(saved);
      }
    }

    return res.status(201).json({
      success: true,
      conversation,
      messages: savedMessages,
    });
  } catch (err) {
    console.error('[Create Conversation Error]', err);
    return res.status(500).json({ success: false, message: 'Server error creating conversation.' });
  }
};

// @desc    Get all conversations for the authenticated user
// @route   GET /api/assistant/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('pet', 'name species breed')
      .lean();

    // Attach last message preview for each conversation
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const lastMsg = await Message.findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .lean();
        return {
          ...conv,
          lastMessage: lastMsg
            ? {
                role: lastMsg.role,
                content: lastMsg.content,
                createdAt: lastMsg.createdAt,
                hasMedia: Boolean(lastMsg.media),
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      conversations: conversationsWithPreview,
    });
  } catch (err) {
    console.error('[Get Conversations Error]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching conversations.' });
  }
};

// @desc    Get a single conversation and its messages
// @route   GET /api/assistant/conversations/:id
// @access  Private
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: `Invalid conversation ID: ${id}` });
    }

    const conversation = await Conversation.findById(id).populate('pet', 'name species breed');
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Strict user isolation check
    if (conversation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this conversation.' });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (err) {
    console.error('[Get Conversation Error]', err);
    return res.status(500).json({ success: false, message: 'Server error fetching conversation.' });
  }
};

// @desc    Delete a conversation and all its messages
// @route   DELETE /api/assistant/conversations/:id
// @access  Private
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: `Invalid conversation ID: ${id}` });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Strict user isolation check
    if (conversation.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this conversation.' });
    }

    // Delete messages associated with conversation
    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    return res.status(200).json({
      success: true,
      message: 'Conversation and all associated messages deleted successfully.',
    });
  } catch (err) {
    console.error('[Delete Conversation Error]', err);
    return res.status(500).json({ success: false, message: 'Server error deleting conversation.' });
  }
};

// @desc    Process chat query via Google Gemini AI
// @route   POST /api/assistant/chat
// @access  Private (Requires authentication)
export const chatWithAssistant = async (req, res) => {
  try {
    const { message, petId, media, conversationId } = req.body;

    // 1. Validate user message & media input
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (trimmedMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum allowable length of 2000 characters.',
      });
    }

    let mediaPart = null;
    if (media) {
      if (typeof media !== 'object' || !media.mimeType || !media.data) {
        return res.status(400).json({
          success: false,
          message: 'Invalid media attachment format. Must include mimeType and base64 data.',
        });
      }

      const mime = media.mimeType.toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported media type: ${media.mimeType}. Allowed formats: JPEG, PNG, WebP, GIF, MP4, QuickTime, WebM.`,
        });
      }

      const rawBase64 = String(media.data);
      const cleanBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');

      if (cleanBase64.length > MAX_BASE64_LENGTH) {
        return res.status(400).json({
          success: false,
          message: 'Attachment file size exceeds the 15MB limit.',
        });
      }

      mediaPart = {
        inlineData: {
          mimeType: mime,
          data: cleanBase64,
        },
      };
    }

    if (!trimmedMessage && !mediaPart) {
      return res.status(400).json({
        success: false,
        message: 'A valid message string or media attachment is required.',
      });
    }

    // Default prompt if user sends media without text
    const promptText = trimmedMessage ||
      'Please observe and describe what is visible in this uploaded pet/medical media. Detail visible characteristics, behaviors, physical traits, or document contents. Remember to clearly distinguish observations from veterinary diagnosis.';

    // 2. Validate and load verified Pet context from MongoDB if petId is provided
    let verifiedPet = null;
    if (petId) {
      if (!isValidObjectId(petId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid pet ID format: ${petId}`,
        });
      }

      verifiedPet = await Pet.findById(petId);
      if (!verifiedPet) {
        return res.status(404).json({
          success: false,
          message: 'Referenced pet not found.',
        });
      }

      // Ensure pet belongs to authenticated user
      if (verifiedPet.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this pet.',
        });
      }
    }

    // 3. Find or create persistent Conversation
    let conversation = null;
    if (conversationId) {
      if (!isValidObjectId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid conversation ID format: ${conversationId}`,
        });
      }

      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found.',
        });
      }

      if (conversation.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this conversation.',
        });
      }
    } else {
      let defaultTitle = 'New Conversation';
      if (trimmedMessage) {
        defaultTitle = trimmedMessage.length > 40 ? `${trimmedMessage.slice(0, 37)}...` : trimmedMessage;
      } else if (media) {
        defaultTitle = media.isVideo ? 'Video Observation' : 'Image Observation';
      }

      conversation = await Conversation.create({
        user: req.user._id,
        title: defaultTitle,
        pet: verifiedPet?._id || null,
      });
    }

    // 4. Verify Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.trim()) {
      return res.status(503).json({
        success: false,
        message: 'Gemini AI service is currently unconfigured. Please configure GEMINI_API_KEY.',
      });
    }

    // 5. Build prompt and system instructions
    const systemInstruction = buildSystemInstruction(verifiedPet);
    const primaryModel = process.env.GEMINI_PRIMARY_MODEL || process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
    const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

    // Load at most the most recent 6 stored messages total from this conversation
    const storedMessages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: -1 })
      .limit(6);
    storedMessages.reverse(); // Chronological order

    // Build Gemini history contents (alternating user/model, starting with user)
    const historyContents = [];
    for (const msg of storedMessages) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
      if (historyContents.length === 0 && geminiRole === 'model') {
        continue;
      }
      if (historyContents.length > 0 && historyContents[historyContents.length - 1].role === geminiRole) {
        historyContents[historyContents.length - 1].parts.push({ text: msg.content });
      } else {
        historyContents.push({
          role: geminiRole,
          parts: [{ text: msg.content }],
        });
      }
    }

    // Current user turn
    const userParts = [];
    if (mediaPart) {
      userParts.push(mediaPart);
    }
    userParts.push({ text: promptText });

    const userTurn = {
      role: 'user',
      parts: userParts,
    };

    let allContents = [];
    if (historyContents.length > 0 && historyContents[historyContents.length - 1].role === 'user') {
      const lastUser = historyContents.pop();
      lastUser.parts.push(...userParts);
      allContents = [...historyContents, lastUser];
    } else {
      allContents = [...historyContents, userTurn];
    }

    const initialRequestBody = {
      contents: allContents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      tools: assistantTools,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    };

    // Helper: Execute request to a Gemini model with optional retry on transient 503/504
    const executeModelRequest = async (targetModel, bodyPayload, maxAttempts = 1) => {
      let response = null;
      let networkErr = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s individual timeout

        try {
          response = await fetch(`${GEMINI_API_URL}/${targetModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          });
        } catch (err) {
          networkErr = err;
          clearTimeout(timeoutId);
          if (attempt < maxAttempts) {
            const delayMs = attempt * 1000;
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
          return { response: null, networkErr };
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.ok) {
          return { response, networkErr: null };
        }

        const isTransient = response.status === 503 || response.status === 504;
        if (isTransient && attempt < maxAttempts) {
          const delayMs = attempt * 1000;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        return { response, networkErr: null };
      }

      return { response, networkErr };
    };

    // Helper: Call primary model with fallback chain support
    const callGeminiWithFallback = async (bodyPayload) => {
      const modelChain = [
        process.env.GEMINI_PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL,
        process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL,
        process.env.GEMINI_TERTIARY_MODEL || DEFAULT_TERTIARY_MODEL,
        process.env.GEMINI_QUATERNARY_MODEL || DEFAULT_QUATERNARY_MODEL,
        process.env.GEMINI_QUINARY_MODEL || DEFAULT_QUINARY_MODEL,
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      let geminiResponse = null;
      let networkErr = null;
      let activeModel = modelChain[0];

      for (let i = 0; i < modelChain.length; i++) {
        activeModel = modelChain[i];
        const attempts = i === 0 ? 3 : 1;
        const result = await executeModelRequest(activeModel, bodyPayload, attempts);
        geminiResponse = result.response;
        networkErr = result.networkErr;

        if (geminiResponse && geminiResponse.ok) {
          return { geminiResponse, networkErr: null, activeModel };
        }

        const isExhaustedOrTransient =
          Boolean(networkErr) ||
          (geminiResponse && (geminiResponse.status === 429 || geminiResponse.status === 503 || geminiResponse.status === 504));

        if (!isExhaustedOrTransient) {
          // Client error (e.g. 400 Bad Request) - do not fallback
          break;
        }

        if (i < modelChain.length - 1) {
          console.warn(`[Gemini Fallback] Model (${activeModel}) unavailable (status: ${geminiResponse?.status || 'network'}). Attempting fallback to ${modelChain[i + 1]}...`);
        }
      }

      return { geminiResponse, networkErr, activeModel };
    };

    // 6. Turn 1: Send initial prompt & multimodal input
    const { geminiResponse, networkErr, activeModel } = await callGeminiWithFallback(initialRequestBody);

    // Handle network timeout or connection errors
    if (!geminiResponse && networkErr) {
      if (networkErr.name === 'AbortError') {
        return res.status(504).json({
          success: false,
          message: 'Gemini AI request timed out. Please try again.',
        });
      }
      return res.status(502).json({
        success: false,
        message: 'Network error communicating with Gemini AI service.',
      });
    }

    // 7. Handle non-200 responses from Gemini API
    if (!geminiResponse || !geminiResponse.ok) {
      let errorData = {};
      try {
        errorData = await geminiResponse?.json();
      } catch {
        errorData = {};
      }

      console.error('[Gemini API Error]', {
        status: geminiResponse?.status,
        statusText: geminiResponse?.statusText,
        error: errorData?.error?.message || 'Unknown API error',
      });

      if (geminiResponse?.status === 429) {
        return res.status(429).json({
          success: false,
          message: 'Gemini AI rate limit reached. Please wait a moment before trying again.',
        });
      }

      if (geminiResponse?.status === 503 || geminiResponse?.status === 504) {
        return res.status(503).json({
          success: false,
          message: 'PETLY AI is currently experiencing high demand. Please try again in a few moments.',
        });
      }

      if (geminiResponse?.status === 400) {
        const detailMsg = errorData?.error?.message || '';
        return res.status(400).json({
          success: false,
          message: detailMsg.includes('argument') || detailMsg.includes('data') || detailMsg.includes('decode')
            ? 'The attached media could not be processed by PETLY AI. Please ensure the file is a valid image or video.'
            : (detailMsg || 'Invalid request parameters.'),
        });
      }

      return res.status(502).json({
        success: false,
        message: 'Gemini AI service error. Please try again later.',
      });
    }

    // 8. Parse Turn 1 response
    const data = await geminiResponse.json();
    const candidate = data.candidates?.[0];
    const candidateParts = candidate?.content?.parts || [];

    // Check if Gemini requested any tool/function calls
    const functionCallPart = candidateParts.find((p) => p.functionCall);

    let finalReply = '';

    if (functionCallPart) {
      const { name: fnName, args: fnArgs } = functionCallPart.functionCall;
      // Execute the read-only PETLY tool under req.user._id (Strict User Data Isolation)
      const toolResult = await executeTool(fnName, fnArgs || {}, req.user._id);

      // Turn 2: Provide tool output back to Gemini
      // CRITICAL: candidate.content must be passed unmodified (with thoughtSignature) to satisfy Gemini schema
      const turn2Contents = [
        ...allContents,
        candidate.content,
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: fnName,
                response: {
                  result: toolResult,
                },
              },
            },
          ],
        },
      ];

      const turn2RequestBody = {
        contents: turn2Contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      };

      let turn2Result = await executeModelRequest(activeModel, turn2RequestBody, 2);
      if (!turn2Result.response || !turn2Result.response.ok) {
        turn2Result = await callGeminiWithFallback(turn2RequestBody);
      }
      const turn2Response = turn2Result.response || turn2Result.geminiResponse;
      if (turn2Response && turn2Response.ok) {
        const turn2Data = await turn2Response.json();
        const turn2Candidate = turn2Data.candidates?.[0];
        const turn2Parts = turn2Candidate?.content?.parts || [];
        finalReply = turn2Parts
          .map((p) => p.text || '')
          .join('')
          .trim();
      }
    }

    // If no tool call was made or turn 2 produced text, extract direct text from candidateParts
    if (!finalReply) {
      finalReply = candidateParts
        .map((p) => p.text || '')
        .join('')
        .trim();
    }

    if (!finalReply) {
      return res.status(502).json({
        success: false,
        message: 'Malformed response received from Gemini AI service.',
      });
    }

    // 9. Persist messages in MongoDB (User turn + Assistant reply)
    // CRITICAL: Media metadata ONLY — no large binary/base64 data stored in MongoDB!
    let savedMediaMetadata = undefined;
    if (media) {
      savedMediaMetadata = {
        name: media.name || 'attachment',
        mimeType: media.mimeType,
        size: media.size || 0,
        isVideo: Boolean(media.isVideo),
      };
    }

    await Message.create({
      conversation: conversation._id,
      role: 'user',
      content: promptText,
      media: savedMediaMetadata,
    });

    const savedAssistantMsg = await Message.create({
      conversation: conversation._id,
      role: 'assistant',
      content: finalReply,
    });

    conversation.updatedAt = new Date();
    if (!conversation.pet && verifiedPet) {
      conversation.pet = verifiedPet._id;
    }
    await conversation.save();

    return res.status(200).json({
      success: true,
      reply: finalReply,
      conversationId: conversation._id,
      messageId: savedAssistantMsg._id,
    });
  } catch (error) {
    console.error('[Assistant Controller Error]', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing AI assistant request.',
    });
  }
};

