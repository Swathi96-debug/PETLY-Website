import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { AI_KNOWLEDGE_BASE, DEFAULT_AI_RESPONSE } from '../data/aiKnowledge';
import { petsAPI, healthAPI, documentsAPI, adoptionAPI, communityAPI, quizAPI, storeAPI, servicesAPI } from '../services/api';

const EcosystemContext = createContext();

const loadJSON = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeWishlistCollection = (stored) => {
  if (!Array.isArray(stored)) return [];
  return stored.map((item) => {
    if (typeof item === 'string') return { userId: 'guest', id: item };
    if (item && typeof item === 'object') return { userId: item.userId || 'guest', ...item };
    return null;
  }).filter(Boolean);
};

const normalizeHealthCollection = (stored, fallback) => {
  if (!Array.isArray(stored)) return fallback;
  return stored.map((item) => {
    if (item && typeof item === 'object') {
      return { userId: item.userId || 'guest', ...item };
    }
    return null;
  }).filter(Boolean);
};

export const VALID_THEMES = ['purple', 'blue', 'green', 'pink', 'orange', 'cyan', 'yellow', 'red'];

export const mapCommunityCategory = (cat) => {
  if (!cat) return 'General';
  return String(cat).trim();
};

export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return 'Recently';
  const now = Date.now();
  const date = new Date(dateInput).getTime();
  if (isNaN(date)) return 'Recently';
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateInput).toLocaleDateString();
};

export const normalizeThemeColor = (theme, petName = '', fallbackIndex = 0) => {
  const t = String(theme || '').trim().toLowerCase();
  if (VALID_THEMES.includes(t)) return t;
  const lowerName = String(petName || '').toLowerCase();
  if (lowerName === 'luna') return 'purple';
  if (lowerName === 'fluffy') return 'orange';
  if (lowerName === 'bailey') return 'pink';
  if (lowerName === 'max') return 'blue';
  if (lowerName === 'bluey') return 'green';
  return VALID_THEMES[fallbackIndex % VALID_THEMES.length] || 'orange';
};

const normalizePetRegistry = (pets = []) => {
  return (Array.isArray(pets) ? pets : []).map((pet, index) => ({
    ...pet,
    themeColor: normalizeThemeColor(pet.themeColor, pet.name, index),
    temperature: pet.temperature ? (String(pet.temperature).includes('°') ? pet.temperature : `${pet.temperature}°F`) : '100.8°F',
    status: pet.status || 'Healthy',
    healthScore: pet.healthScore || 90,
    medicalHistory: pet.medicalHistory || 'Routine wellness monitoring',
    notes: pet.notes || 'Stable and monitored regularly.'
  }));
};

const isPlaceholderProfileValue = (value, field) => {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim();

  switch (field) {
    case 'temperature':
      return ['100.8°F', '100.8', '101.2°F', '101.0°F'].includes(normalized);
    case 'healthStatus':
      return ['Healthy', 'Calm', 'Fit', 'Stable', 'Good'].includes(normalized);
    case 'notes':
      return normalized === 'Stable and monitored regularly.';
    case 'medicalHistory':
      return normalized === 'Routine wellness monitoring';
    case 'vaccinationRegistry':
      return Array.isArray(value) && value.some((item) => ['Core Vaccine', 'Booster'].includes(item?.name));
    case 'activeMedications':
      return Array.isArray(value) && value.some((item) => ['Joint Support', 'Medication'].includes(item?.name));
    case 'healthMilestones':
      return Array.isArray(value) && value.some((item) => ['Wellness Check', 'Diet Adjustment'].includes(item?.title));
    case 'healthTimeline':
      return Array.isArray(value) && value.some((item) => ['Initial Checkup', 'Medication Started'].includes(item?.title));
    case 'vetVisits':
      return Array.isArray(value) && value.some((item) => item?.title === 'Routine Checkup');
    case 'upcomingAppointments':
      return Array.isArray(value) && value.some((item) => item?.title === 'Vaccination Follow-up');
    default:
      return false;
  }
};

const getDefaultPetHealthSeed = (pet, index = 0) => {
  const name = pet?.name || `Pet ${index + 1}`;
  const species = String(pet?.species || 'Pet').toLowerCase();
  const breed = pet?.breed || 'Mixed';
  const parsedWeight = Number.parseFloat(pet?.weight);
  const baseWeight = Number.isFinite(parsedWeight) ? parsedWeight : 18 + index * 4.5;
  const dob = pet?.dob ? new Date(pet.dob) : null;
  const ageYears = (() => {
    if (pet?.age && Number.isFinite(Number(pet.age))) return Number(Number(pet.age).toFixed(1));
    if (dob && !Number.isNaN(dob.getTime())) {
      const ageMs = Date.now() - dob.getTime();
      return Number(Math.max(0.5, Math.min(15, ageMs / (1000 * 60 * 60 * 24 * 365.25))).toFixed(1));
    }
    return Number((1 + index * 0.7).toFixed(1));
  })();
  const speciesProfile = species.includes('rabbit')
    ? { baseTemp: 102.1, vaccines: ['RHDV2', 'Myxomatosis', 'Booster'], medication: 'Digestive Support', status: 'Fit', icon: 'stethoscope' }
    : species.includes('cat')
      ? { baseTemp: 100.4, vaccines: ['Rabies', 'FVRCP', 'FeLV'], medication: 'Hairball Control', status: 'Calm', icon: 'pill' }
      : { baseTemp: 100.8, vaccines: ['Rabies', 'DHPP', 'Lyme'], medication: 'Joint Support', status: 'Healthy', icon: 'syringe' };
  const seedOffset = index * 0.15 + ageYears * 0.03 + (baseWeight < 8 ? 0.1 : 0.0);
  const baseTemp = Number((speciesProfile.baseTemp + seedOffset).toFixed(1));
  const formatDate = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };
  const weightHistory = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, monthIndex) => ({
    month,
    weight: Number((baseWeight + monthIndex * 0.35 + (index % 2 === 0 ? 0.1 : 0.2) + (ageYears > 5 ? 0.05 : 0.0)).toFixed(1))
  }));
  const vaccinationRegistry = [
    { name: speciesProfile.vaccines[0], date: formatDate(-180 + index * 5), dueDate: formatDate(30 + index * 6), status: index % 3 === 0 ? 'completed' : 'upcoming', veterinarian: 'Dr. Rivera' },
    { name: speciesProfile.vaccines[1], date: formatDate(-90 + index * 4), dueDate: formatDate(90 + index * 5), status: index % 4 === 0 ? 'overdue' : 'completed', veterinarian: 'Dr. Rivera' },
    { name: speciesProfile.vaccines[2], date: formatDate(-20 + index * 3), dueDate: formatDate(120 + index * 4), status: index % 2 === 0 ? 'upcoming' : 'completed', veterinarian: 'Dr. Rivera' }
  ];
  const healthStatus = ageYears > 8 ? 'Senior Care' : ageYears > 3 ? 'Active' : 'Healthy';
  const medicationStatus = String(pet?.healthStatus || healthStatus).toLowerCase();
  const isSenior = medicationStatus.includes('senior') || ageYears >= 8;
  const isPuppy = ageYears <= 1 || medicationStatus.includes('puppy');
  const isLargeBreed = /(great dane|mastiff|german shepherd|saint bernard|doberman|golden retriever|labrador|bernese|newfoundland|ridgeback|husky|alaskan|boxer|rottweiler|shepherd|hound)/i.test(breed);
  const isPoorHealth = /(poor|ill|critical|sick|injured|senior|care)/i.test(medicationStatus);
  const medicationSeed = ((pet?.id ? String(pet.id) : `${index}`)).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index * 17 + Math.round(baseWeight * 3) + Math.round(ageYears * 7);
  const medicationPool = [
    'Joint Support',
    'Heartworm Prevention',
    'Allergy Relief',
    'Omega-3 Supplement',
    'Dental Care',
    'Skin & Coat Supplement',
    'Vitamin Supplement',
    'Probiotic',
    'Pain Relief',
    'Ear Infection Drops',
    'Liver Support',
    'Flea & Tick Prevention'
  ];
  const preferredMedications = [];
  if (isSenior || isLargeBreed) preferredMedications.push('Joint Support');
  if (isLargeBreed) preferredMedications.push('Omega-3 Supplement');
  if (isPuppy) preferredMedications.push('Vitamin Supplement', 'Probiotic');
  if (isPoorHealth) preferredMedications.push('Pain Relief', 'Liver Support');
  const medicationCount = isPoorHealth ? 2 : (medicationSeed % 3 === 0 ? 2 : 1);
  const primaryMedication = medicationPool[index % medicationPool.length];
  const selectedMedicationNames = medicationCount === 2
    ? [primaryMedication, medicationPool[(index + 1) % medicationPool.length]]
    : [primaryMedication];
  const activeMedications = selectedMedicationNames.map((name, medIndex) => ({
    name,
    dosage: baseWeight < 8 ? '1 chew' : baseWeight < 20 ? '1 tablet' : '1 capsule',
    frequency: medIndex === 0 && isSenior ? 'Every other day' : isPuppy ? 'Daily' : 'Daily',
    purpose: `${breed} wellness support`,
    startDate: formatDate(-60 + index * 4 + medIndex * 7),
    endDate: formatDate(60 + index * 5 + medIndex * 6)
  }));
  const medicalHistory = `${name} is a ${ageYears.toFixed(1)}-year-old ${breed} ${species.includes('rabbit') ? 'rabbit' : species.includes('cat') ? 'cat' : 'dog'} with steady, individualized care and a ${baseWeight < 8 ? 'small' : baseWeight < 20 ? 'medium' : 'large'} frame.`;
  const healthMilestones = [
    { title: `${name} Wellness Visit`, date: formatDate(-120 + index * 3), category: 'health', achieved: true, description: `${name} completed a routine wellness assessment.` },
    { title: `${speciesProfile.status} Routine Check`, date: formatDate(-30 + index * 2), category: 'care', achieved: index % 2 === 0, description: `Tracked ${name}'s ${speciesProfile.status.toLowerCase()} progress.` }
  ];
  const healthTimeline = [
    { type: 'exam', title: `${name} First Checkup`, date: formatDate(-180 + index * 2), icon: 'stethoscope', color: index % 2 === 0 ? 'blue' : 'purple', completed: true },
    { type: 'medication', title: `${speciesProfile.medication} Started`, date: formatDate(-60 + index * 3), icon: speciesProfile.icon, color: index % 2 === 0 ? 'green' : 'orange', completed: true },
    { type: 'vaccine', title: `${vaccinationRegistry[0].name} Recorded`, date: formatDate(-20 + index * 2), icon: 'syringe', color: 'green', completed: index % 2 === 0 }
  ];
  const vetVisits = [
    { title: `${name} Routine Exam`, date: formatDate(-90 + index * 2), veterinarian: 'Dr. Rivera' },
    { title: `${name} Follow-up`, date: formatDate(30 + index * 4), veterinarian: 'Dr. Patel' }
  ];
  const upcomingAppointments = [
    { title: `${name} Vaccine Review`, date: formatDate(45 + index * 7), provider: 'Dr. Rivera' },
    { title: `${name} Nutrition Check`, date: formatDate(75 + index * 5), provider: 'Dr. Patel' }
  ];
const noteTemplates = [
  `${name} enjoys daily walks.`,
  `${name} responds well to routine care.`,
  `${name} maintains a healthy appetite.`,
  `${name} is making excellent progress.`,
  `${name} is healthy and playful.`,
  `${name} remains in excellent condition.`
];

const notes = noteTemplates[index % noteTemplates.length];
  const seed = {
    temperature: `${baseTemp.toFixed(1)}°F`,
    weightHistory,
    vaccinationRegistry,
    activeMedications,
    medicalHistory,
    healthMilestones,
    healthTimeline,
    vetVisits,
    upcomingAppointments,
    healthStatus,
    notes
  };
  console.log('Generating profile for', pet?.name, pet?.id);
  console.log(seed);
  return seed;
};

const normalizePetHealthProfile = (profile = {}, pet = {}, index = 0) => {
  const seed = getDefaultPetHealthSeed(pet, index);
  return {
    ...seed,
    temperature: isPlaceholderProfileValue(profile?.temperature, 'temperature') ? seed.temperature : (profile?.temperature ?? seed.temperature),
    healthStatus: isPlaceholderProfileValue(profile?.healthStatus, 'healthStatus') ? seed.healthStatus : (profile?.healthStatus ?? seed.healthStatus),
    notes: isPlaceholderProfileValue(profile?.notes, 'notes') ? seed.notes : (profile?.notes ?? seed.notes),
    medicalHistory: isPlaceholderProfileValue(profile?.medicalHistory, 'medicalHistory') ? seed.medicalHistory : (profile?.medicalHistory ?? seed.medicalHistory),
    vetVisits: isPlaceholderProfileValue(profile?.vetVisits, 'vetVisits') ? seed.vetVisits : (Array.isArray(profile?.vetVisits) ? profile.vetVisits : seed.vetVisits),
    upcomingAppointments: isPlaceholderProfileValue(profile?.upcomingAppointments, 'upcomingAppointments') ? seed.upcomingAppointments : (Array.isArray(profile?.upcomingAppointments) ? profile.upcomingAppointments : seed.upcomingAppointments),
    weightHistory: Array.isArray(profile?.weightHistory) ? profile.weightHistory : seed.weightHistory,
    vaccinationRegistry: isPlaceholderProfileValue(profile?.vaccinationRegistry, 'vaccinationRegistry') ? seed.vaccinationRegistry : (Array.isArray(profile?.vaccinationRegistry) ? profile.vaccinationRegistry : seed.vaccinationRegistry),
    activeMedications: isPlaceholderProfileValue(profile?.activeMedications, 'activeMedications') ? seed.activeMedications : (Array.isArray(profile?.activeMedications) ? profile.activeMedications : seed.activeMedications),
    healthMilestones: isPlaceholderProfileValue(profile?.healthMilestones, 'healthMilestones') ? seed.healthMilestones : (Array.isArray(profile?.healthMilestones) ? profile.healthMilestones : seed.healthMilestones),
    healthTimeline: isPlaceholderProfileValue(profile?.healthTimeline, 'healthTimeline') ? seed.healthTimeline : (Array.isArray(profile?.healthTimeline) ? profile.healthTimeline : seed.healthTimeline)
  };
};

const buildPetHealthProfiles = (pets = [], existingProfiles = {}) => {
  return pets.reduce((acc, pet, index) => {
    if (!pet?.id) return acc;
    acc[pet.id] = normalizePetHealthProfile(existingProfiles[pet.id], pet, index);
    return acc;
  }, {});
};

const migratePetHealthProfiles = (pets = [], existingProfiles = {}) => {
  const nextProfiles = { ...(existingProfiles && typeof existingProfiles === 'object' && !Array.isArray(existingProfiles) ? existingProfiles : {}) };
  let changed = false;

  pets.forEach((pet, index) => {
    if (!pet?.id) return;
    const existingProfile = nextProfiles[pet.id];
    const migratedProfile = normalizePetHealthProfile(existingProfile, pet, index);
    nextProfiles[pet.id] = migratedProfile;
    if (!existingProfile || typeof existingProfile !== 'object' || Array.isArray(existingProfile)) {
      changed = true;
    } else {
      const existingSignature = JSON.stringify(existingProfile);
      const migratedSignature = JSON.stringify(migratedProfile);
      if (existingSignature !== migratedSignature) {
        changed = true;
      }
    }
  });

  return changed ? nextProfiles : existingProfiles;
};

const initialCommunityPosts = [
  {
    id: 1,
    authorId: 'system',
    author: 'Sarah_Petly',
    communityId: 'dogs',
    title: 'My Golden Retriever learned to Fetch!',
    body: 'He is finally doing it! After 3 weeks of training.',
    votes: 1240,
    likedBy: [],
    comments: 2,
    savedBy: [],
    date: '2h ago',
    pinned: true,
    commentsList: [
      { id: 1, author: 'Guardian1', text: 'Wow, congratulations! How did you do it?', date: '1h ago' },
      { id: 2, author: 'VetExpert', text: 'Retrieving is great mental stimulation for Goldens!', date: '30m ago' }
    ]
  },
  {
    id: 2,
    authorId: 'system',
    author: 'Mike_Cats',
    communityId: 'cats',
    title: 'New Organic Cat Treats Review',
    body: 'The cats absolutely love the new salmon crunchies.',
    votes: 890,
    likedBy: [],
    comments: 1,
    savedBy: [],
    date: '4h ago',
    pinned: false,
    commentsList: [
      { id: 1, author: 'Jane_CatParent', text: 'Which brand is it? I want to get some.', date: '2h ago' }
    ]
  }
];

const initialMessages = [
  {
    id: 1,
    userId: 'guest',
    user: { name: 'Oliver & Mochi', avatar: '🐱', online: true },
    lastMessage: 'He really loved the kibble you recommended!',
    time: '2m ago',
    unread: true,
    messages: [
      { id: 1, text: 'Hey! How is Mochi doing with the new diet?', sender: 'me', time: '10:00 AM' },
      { id: 2, text: 'He really loved the kibble you recommended!', sender: 'them', time: '10:05 AM' }
    ]
  },
  {
    id: 2,
    userId: 'guest',
    user: { name: 'Dr. Emily (Vet)', avatar: '👩‍⚕️', online: false },
    lastMessage: 'The lab results look optimal. Wellness confirmed.',
    time: '1h ago',
    unread: false,
    messages: [
      { id: 1, text: 'Hello doctor, any updates on the results?', sender: 'me', time: 'Yesterday' },
      { id: 2, text: 'The lab results look optimal. Wellness confirmed.', sender: 'them', time: '9:00 AM' }
    ]
  }
];

export const EcosystemProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = (user?._id || user?.id)?.toString() || 'guest';

  // MongoDB Pet state (Phase 4A)
  const [mongoPets, setMongoPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState(null);

  const fetchPets = useCallback(async () => {
    if (!user) {
      setMongoPets([]);
      return;
    }
    setPetsLoading(true);
    setPetsError(null);
    try {
      const response = await petsAPI.getAll();
      if (response.success && Array.isArray(response.pets)) {
        setMongoPets(response.pets);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load pets:', err.message);
      setPetsError(err.message || 'Failed to load companions from server.');
    } finally {
      setPetsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  // MongoDB Health & Documents state (Phase 4B)
  const isValidMongoId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  const [mongoHealthRecords, setMongoHealthRecords] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  const [mongoDocuments, setMongoDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState(null);

  const fetchHealthRecords = useCallback(async (petId) => {
    if (!user) {
      setMongoHealthRecords([]);
      return;
    }
    setHealthLoading(true);
    setHealthError(null);
    try {
      const query = petId && isValidMongoId(petId) ? `pet=${petId}` : '';
      const response = await healthAPI.getAll(query);
      if (response.success && Array.isArray(response.records)) {
        setMongoHealthRecords(response.records);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load health records:', err.message);
      setHealthError(err.message || 'Failed to load health records from server.');
    } finally {
      setHealthLoading(false);
    }
  }, [user]);

  const fetchMedicalDocuments = useCallback(async (petId) => {
    if (!user) {
      setMongoDocuments([]);
      return;
    }
    setDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const query = petId && isValidMongoId(petId) ? `pet=${petId}` : '';
      const response = await documentsAPI.getAll(query);
      if (response.success && Array.isArray(response.documents)) {
        setMongoDocuments(response.documents);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load medical documents:', err.message);
      setDocumentsError(err.message || 'Failed to load medical documents from server.');
    } finally {
      setDocumentsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchHealthRecords();
      fetchMedicalDocuments();
    }
  }, [user, fetchHealthRecords, fetchMedicalDocuments]);

  // MongoDB Adoption & Applications state (Phase 5)
  const [mongoAdoptionListings, setMongoAdoptionListings] = useState([]);
  const [adoptionListingsLoading, setAdoptionListingsLoading] = useState(false);
  const [adoptionListingsError, setAdoptionListingsError] = useState(null);

  const [myApplications, setMyApplications] = useState([]);
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(false);
  const [myApplicationsError, setMyApplicationsError] = useState(null);

  const fetchAdoptionListings = useCallback(async (filterQuery = '') => {
    setAdoptionListingsLoading(true);
    setAdoptionListingsError(null);
    try {
      const response = await adoptionAPI.getAll(filterQuery);
      if (response.success && Array.isArray(response.listings)) {
        setMongoAdoptionListings(response.listings);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load adoption listings:', err.message);
      setAdoptionListingsError(err.message || 'Failed to load adoption listings from server.');
    } finally {
      setAdoptionListingsLoading(false);
    }
  }, []);

  const fetchMyApplications = useCallback(async () => {
    if (!user) {
      setMyApplications([]);
      return;
    }
    setMyApplicationsLoading(true);
    setMyApplicationsError(null);
    try {
      const response = await adoptionAPI.getMyApplications();
      if (response.success && Array.isArray(response.applications)) {
        setMyApplications(response.applications);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load user applications:', err.message);
      setMyApplicationsError(err.message || 'Failed to load applications from server.');
    } finally {
      setMyApplicationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAdoptionListings();
    if (user) {
      fetchMyApplications();
    }
  }, [user, fetchAdoptionListings, fetchMyApplications]);

  // MongoDB Community Posts state (Phase 6)
  const [mongoCommunityPosts, setMongoCommunityPosts] = useState([]);
  const [communityPostsLoading, setCommunityPostsLoading] = useState(false);
  const [communityPostsError, setCommunityPostsError] = useState(null);

  const fetchCommunityPosts = useCallback(async (filterQuery = '') => {
    setCommunityPostsLoading(true);
    setCommunityPostsError(null);
    try {
      const response = await communityAPI.getPosts(filterQuery);
      if (response.success && Array.isArray(response.posts)) {
        setMongoCommunityPosts(response.posts);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load community posts:', err.message);
      setCommunityPostsError(err.message || 'Failed to load community posts from server.');
    } finally {
      setCommunityPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunityPosts();
  }, [fetchCommunityPosts]);

  // MongoDB Quiz Attempts state (Phase 7)
  const [mongoQuizAttempts, setMongoQuizAttempts] = useState([]);
  const [quizAttemptsLoading, setQuizAttemptsLoading] = useState(false);
  const [quizAttemptsError, setQuizAttemptsError] = useState(null);

  const fetchMyQuizAttempts = useCallback(async () => {
    if (!user) {
      setMongoQuizAttempts([]);
      return;
    }
    setQuizAttemptsLoading(true);
    setQuizAttemptsError(null);
    try {
      const response = await quizAPI.getMyAttempts();
      if (response.success && Array.isArray(response.attempts)) {
        setMongoQuizAttempts(response.attempts);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load quiz attempts:', err.message);
      setQuizAttemptsError(err.message || 'Failed to load quiz attempts.');
    } finally {
      setQuizAttemptsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyQuizAttempts();
    } else {
      setMongoQuizAttempts([]);
    }
  }, [user, fetchMyQuizAttempts]);

  // MongoDB Companion Matches state (Phase 7 Extension)
  const [companionMatches, setCompanionMatches] = useState([]);
  const [companionMatchesLoading, setCompanionMatchesLoading] = useState(false);
  const [companionMatchesError, setCompanionMatchesError] = useState(null);

  const fetchMyCompanionMatches = useCallback(async () => {
    if (!user) {
      setCompanionMatches([]);
      return;
    }
    setCompanionMatchesLoading(true);
    setCompanionMatchesError(null);
    try {
      const response = await quizAPI.getMyCompanionMatches();
      if (response.success && Array.isArray(response.matches)) {
        setCompanionMatches(response.matches);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load companion matches:', err.message);
      setCompanionMatchesError(err.message || 'Failed to load companion matches.');
    } finally {
      setCompanionMatchesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyCompanionMatches();
    } else {
      setCompanionMatches([]);
    }
  }, [user, fetchMyCompanionMatches]);

  const saveCompanionMatch = async (matchData) => {
    if (user) {
      const response = await quizAPI.saveCompanionMatch(matchData);
      if (response.success && response.match) {
        setCompanionMatches((prev) => [response.match, ...prev]);
        return response.match;
      }
      throw new Error(response.message || 'Failed to save companion match');
    } else {
      // Guest local fallback
      const localMatch = {
        _id: `comp-match-${Date.now()}`,
        id: `comp-match-${Date.now()}`,
        answers: matchData.answers || {},
        primaryRecommendation: matchData.primaryRecommendation,
        compatibilityScore: matchData.compatibilityScore || matchData.primaryRecommendation?.score || 0,
        alternativeRankings: matchData.alternativeRankings || [],
        allMatches: matchData.allMatches || [],
        createdAt: new Date().toISOString(),
      };
      setCompanionMatches((prev) => [localMatch, ...prev]);
      return localMatch;
    }
  };

  const getCompanionMatchDetails = async (id) => {
    return quizAPI.getCompanionMatchById(id);
  };

  // ==========================================
  // MONGODB STORE DATA (PHASE 8B)
  // ==========================================
  const [storeProducts, setStoreProducts] = useState([]);
  const [storeProductsLoading, setStoreProductsLoading] = useState(true);
  const [storeProductsError, setStoreProductsError] = useState(null);

  const fetchStoreProducts = useCallback(async (params = '') => {
    setStoreProductsLoading(true);
    setStoreProductsError(null);
    try {
      const response = await storeAPI.getProducts(params);
      const list = response.products || (Array.isArray(response) ? response : []);
      setStoreProducts(list);
      return list;
    } catch (err) {
      console.error('[EcosystemContext] Failed to load store products:', err.message);
      setStoreProductsError(err.message || 'Failed to load products.');
      return [];
    } finally {
      setStoreProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreProducts();
  }, [fetchStoreProducts]);

  // MongoDB Wishlist State
  const [mongoWishlist, setMongoWishlist] = useState([]);
  const [mongoWishlistPets, setMongoWishlistPets] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setMongoWishlist([]);
      setMongoWishlistPets([]);
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await storeAPI.getWishlist();
      if (res.success) {
        if (Array.isArray(res.wishlist)) {
          setMongoWishlist(res.wishlist);
        }
        if (Array.isArray(res.wishlistPets)) {
          setMongoWishlistPets(res.wishlistPets);
        }
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load wishlist:', err.message);
    } finally {
      setWishlistLoading(false);
    }
  }, [user]);

  // MongoDB Cart State
  const [mongoCart, setMongoCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setMongoCart([]);
      return;
    }
    setCartLoading(true);
    try {
      const res = await storeAPI.getCart();
      if (res.success && Array.isArray(res.cart)) {
        setMongoCart(res.cart);
      }
    } catch (err) {
      console.error('[EcosystemContext] Failed to load cart:', err.message);
    } finally {
      setCartLoading(false);
    }
  }, [user]);

  // MongoDB Orders State
  const [storeOrders, setStoreOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // MongoDB Service Providers State (public — always load)
  const [mongoServiceProviders, setMongoServiceProviders] = useState([]);
  const [serviceProvidersLoading, setServiceProvidersLoading] = useState(false);

  // MongoDB Service Bookings State (private — auth only)
  const [mongoServiceBookings, setMongoServiceBookings] = useState([]);
  const [serviceBookingsLoading, setServiceBookingsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setStoreOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await storeAPI.getOrders();
      const list = res.orders || (Array.isArray(res) ? res : []);
      setStoreOrders(list);
    } catch (err) {
      console.error('[EcosystemContext] Failed to load orders:', err.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  const fetchServiceProviders = useCallback(async (category = '') => {
    setServiceProvidersLoading(true);
    try {
      const params = category && category !== 'all' ? `category=${encodeURIComponent(category)}` : '';
      const res = await servicesAPI.getProviders(params);
      setMongoServiceProviders(res.providers || []);
    } catch (err) {
      console.error('[EcosystemContext] Failed to load service providers:', err.message);
    } finally {
      setServiceProvidersLoading(false);
    }
  }, []);

  const fetchServiceBookings = useCallback(async () => {
    if (!user) {
      setMongoServiceBookings([]);
      return;
    }
    setServiceBookingsLoading(true);
    try {
      const res = await servicesAPI.getBookings();
      setMongoServiceBookings(res.bookings || []);
    } catch (err) {
      console.error('[EcosystemContext] Failed to load service bookings:', err.message);
    } finally {
      setServiceBookingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Service providers are public — always load them
    fetchServiceProviders();
  }, [fetchServiceProviders]);

  useEffect(() => {
    if (user) {
      fetchWishlist();
      fetchCart();
      fetchOrders();
      fetchServiceBookings();
    } else {
      setMongoWishlist([]);
      setMongoWishlistPets([]);
      setMongoCart([]);
      setStoreOrders([]);
      setMongoServiceBookings([]);
    }
  }, [user, fetchWishlist, fetchCart, fetchOrders, fetchServiceBookings]);

  const [cart, setCart] = useState(() => loadJSON('petly_cart', []));
  const [wishlistPets, setWishlistPets] = useState(() => normalizeWishlistCollection(loadJSON('petly_wishlist_pets', [])));
  const [wishlistProducts, setWishlistProducts] = useState(() => normalizeWishlistCollection(loadJSON('petly_wishlist_products', [])));
  const [weightHistory, setWeightHistory] = useState(() => normalizeHealthCollection(loadJSON('petly_health_weight', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', month: 'Jan', weight: 20.1 },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', month: 'Feb', weight: 20.8 },
    { id: 3, userId: 'guest', petId: 'guest_pet_1', month: 'Mar', weight: 21.2 },
    { id: 4, userId: 'guest', petId: 'guest_pet_1', month: 'Apr', weight: 21.9 },
    { id: 5, userId: 'guest', petId: 'guest_pet_1', month: 'May', weight: 22.3 },
    { id: 6, userId: 'guest', petId: 'guest_pet_1', month: 'Jun', weight: 22.8 },
    { id: 7, userId: 'guest', petId: 'guest_pet_2', month: 'Jan', weight: 4.4 },
    { id: 8, userId: 'guest', petId: 'guest_pet_2', month: 'Feb', weight: 4.5 },
    { id: 9, userId: 'guest', petId: 'guest_pet_2', month: 'Mar', weight: 4.6 },
    { id: 10, userId: 'guest', petId: 'guest_pet_2', month: 'Apr', weight: 4.8 },
    { id: 11, userId: 'guest', petId: 'guest_pet_2', month: 'May', weight: 5.0 },
    { id: 12, userId: 'guest', petId: 'guest_pet_2', month: 'Jun', weight: 5.2 },
    { id: 13, userId: 'guest', petId: 'guest_pet_3', month: 'Jan', weight: 1.6 },
    { id: 14, userId: 'guest', petId: 'guest_pet_3', month: 'Feb', weight: 1.7 },
    { id: 15, userId: 'guest', petId: 'guest_pet_3', month: 'Mar', weight: 1.8 },
    { id: 16, userId: 'guest', petId: 'guest_pet_3', month: 'Apr', weight: 1.9 },
    { id: 17, userId: 'guest', petId: 'guest_pet_3', month: 'May', weight: 2.0 },
    { id: 18, userId: 'guest', petId: 'guest_pet_3', month: 'Jun', weight: 2.1 }
  ])));
  const [vaccines, setVaccines] = useState(() => normalizeHealthCollection(loadJSON('petly_health_vaccines', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', name: 'DHPP', date: '2026-01-10', status: 'completed' },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', name: 'Rabies', date: '2026-02-15', status: 'completed' },
    { id: 3, userId: 'guest', petId: 'guest_pet_1', name: 'Bordetella', date: '2026-03-30', status: 'completed' },
    { id: 4, userId: 'guest', petId: 'guest_pet_1', name: 'Leptospirosis', date: '2026-04-20', status: 'completed' },
    { id: 5, userId: 'guest', petId: 'guest_pet_1', name: 'Lyme', date: '2026-05-12', status: 'completed' },
    { id: 6, userId: 'guest', petId: 'guest_pet_1', name: 'Canine Influenza', date: 'Due in 30 days', status: 'upcoming' },
    { id: 7, userId: 'guest', petId: 'guest_pet_2', name: 'FVRCP', date: '2026-01-15', status: 'completed' },
    { id: 8, userId: 'guest', petId: 'guest_pet_2', name: 'Rabies', date: '2026-02-20', status: 'completed' },
    { id: 9, userId: 'guest', petId: 'guest_pet_2', name: 'FeLV', date: '2026-03-18', status: 'completed' },
    { id: 10, userId: 'guest', petId: 'guest_pet_2', name: 'Booster', date: 'Due in 20 days', status: 'upcoming' },
    { id: 11, userId: 'guest', petId: 'guest_pet_3', name: 'RHDV2', date: '2026-01-05', status: 'completed' },
    { id: 12, userId: 'guest', petId: 'guest_pet_3', name: 'Myxomatosis', date: '2026-02-10', status: 'completed' },
    { id: 13, userId: 'guest', petId: 'guest_pet_3', name: 'Booster', date: 'Due in 45 days', status: 'upcoming' }
  ])));
  const [timeline, setTimeline] = useState(() => normalizeHealthCollection(loadJSON('petly_health_timeline', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', type: 'birth', title: 'Birth Day', date: '2023-06-24', icon: 'baby', color: 'orange', completed: true },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', type: 'vaccine', title: 'DHPP Vaccine', date: '2026-01-10', icon: 'syringe', color: 'green', completed: true },
    { id: 3, userId: 'guest', petId: 'guest_pet_1', type: 'vaccine', title: 'Rabies Vaccine', date: '2026-02-15', icon: 'syringe', color: 'green', completed: true },
    { id: 4, userId: 'guest', petId: 'guest_pet_1', type: 'exam', title: 'Annual Wellness Exam', date: '2026-05-01', icon: 'stethoscope', color: 'blue', completed: true },
    { id: 5, userId: 'guest', petId: 'guest_pet_1', type: 'exam', title: 'Dental Checkup', date: '2026-06-01', icon: 'stethoscope', color: 'purple', completed: true },
    { id: 6, userId: 'guest', petId: 'guest_pet_1', type: 'vaccine', title: 'Canine Influenza Booster', date: 'Due in 14 days', icon: 'syringe', color: 'orange' },
    { id: 7, userId: 'guest', petId: 'guest_pet_1', type: 'exam', title: 'Grooming Session', date: 'Due in 21 days', icon: 'clock', color: 'orange' },
    { id: 8, userId: 'guest', petId: 'guest_pet_2', type: 'birth', title: 'Birth Day', date: '2024-06-24', icon: 'baby', color: 'purple', completed: true },
    { id: 9, userId: 'guest', petId: 'guest_pet_2', type: 'exam', title: 'Grooming Check', date: '2026-05-15', icon: 'stethoscope', color: 'purple', completed: true },
    { id: 10, userId: 'guest', petId: 'guest_pet_2', type: 'exam', title: 'Annual Wellness Exam', date: '2026-06-10', icon: 'stethoscope', color: 'blue', completed: true },
    { id: 11, userId: 'guest', petId: 'guest_pet_2', type: 'vaccine', title: 'Booster Vaccine', date: 'Due in 20 days', icon: 'syringe', color: 'purple' },
    { id: 12, userId: 'guest', petId: 'guest_pet_2', type: 'exam', title: 'Grooming Session', date: 'Due in 10 days', icon: 'clock', color: 'purple' },
    { id: 13, userId: 'guest', petId: 'guest_pet_3', type: 'birth', title: 'Birth Day', date: '2025-06-24', icon: 'baby', color: 'blue', completed: true },
    { id: 14, userId: 'guest', petId: 'guest_pet_3', type: 'exam', title: 'Routine Rabbit Wellness Exam', date: '2026-05-20', icon: 'stethoscope', color: 'blue', completed: true },
    { id: 15, userId: 'guest', petId: 'guest_pet_3', type: 'vaccine', title: 'Rabbit Booster', date: 'Due in 45 days', icon: 'syringe', color: 'blue' }
  ])));
  const [medications, setMedications] = useState(() => normalizeHealthCollection(loadJSON('petly_health_medications', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', name: 'Omega-3 Supplement', dose: '1 Capsule', frequency: 'Daily', next: 'July 1st' },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', name: 'Joint Support Tablet', dose: '1 Tablet', frequency: 'Daily', next: 'June 30th' },
    { id: 3, userId: 'guest', petId: 'guest_pet_2', name: 'Hairball Control Supplement', dose: '1 Chew', frequency: 'Daily', next: 'July 2nd' },
    { id: 4, userId: 'guest', petId: 'guest_pet_3', name: 'Vitamin Supplement', dose: '1 Drop', frequency: 'Daily', next: 'July 1st' }
  ])));
  const [milestones, setMilestones] = useState(() => normalizeHealthCollection(loadJSON('petly_milestones', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', title: 'Adoption Day', date: '2025-10-12', category: 'adoption', achieved: true, description: 'Welcome home' },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', title: 'First Vet Visit', date: '2025-11-01', category: 'vet', achieved: true, description: 'Initial health check' },
    { id: 3, userId: 'guest', petId: 'guest_pet_1', title: 'First Vaccination', date: '2025-12-01', category: 'health', achieved: true, description: 'First vaccination complete' },
    { id: 4, userId: 'guest', petId: 'guest_pet_1', title: 'Training Completed', date: '2026-03-01', category: 'training', achieved: true, description: 'Training goals reached' },
    { id: 5, userId: 'guest', petId: 'guest_pet_1', title: 'First Birthday', date: '2026-04-02', category: 'life', achieved: true, description: 'Celebrated first birthday' },
    { id: 6, userId: 'guest', petId: 'guest_pet_1', title: 'Healthy Weight Achieved', date: '2026-06-15', category: 'health', achieved: true, description: 'Reached target weight' },
    { id: 7, userId: 'guest', petId: 'guest_pet_2', title: 'Adoption Day', date: '2025-11-15', category: 'adoption', achieved: true, description: 'Welcome home' },
    { id: 8, userId: 'guest', petId: 'guest_pet_2', title: 'First Grooming', date: '2025-12-05', category: 'grooming', achieved: true, description: 'First grooming completed' },
    { id: 9, userId: 'guest', petId: 'guest_pet_2', title: 'First Vaccination', date: '2026-01-20', category: 'health', achieved: true, description: 'First vaccination complete' },
    { id: 10, userId: 'guest', petId: 'guest_pet_2', title: 'Birthday Celebration', date: '2026-06-20', category: 'life', achieved: true, description: 'Second birthday milestone' },
    { id: 11, userId: 'guest', petId: 'guest_pet_2', title: 'Socialization Milestone', date: '2026-05-08', category: 'training', achieved: true, description: 'Socialized with new friends' },
    { id: 12, userId: 'guest', petId: 'guest_pet_3', title: 'Adoption Day', date: '2025-12-01', category: 'adoption', achieved: true, description: 'Welcome home' },
    { id: 13, userId: 'guest', petId: 'guest_pet_3', title: 'First Vet Visit', date: '2026-01-20', category: 'vet', achieved: true, description: 'First rabbit wellness check' },
    { id: 14, userId: 'guest', petId: 'guest_pet_3', title: 'Healthy Weight Reached', date: '2026-06-10', category: 'health', achieved: true, description: 'Reached ideal weight' },
    { id: 15, userId: 'guest', petId: 'guest_pet_3', title: 'First Birthday', date: '2026-05-05', category: 'life', achieved: true, description: 'First birthday celebration' }
  ])));
  const [adoptions, setAdoptions] = useState(() => normalizePetRegistry(loadJSON('petly_adoptions', [
    {
      id: 'guest_pet_1',
      userId: 'guest',
      name: 'Max',
      species: 'Dog',
      breed: 'Golden Retriever',
      gender: 'Male',
      dob: '2023-06-24',
      weight: '22.8',
      height: '58cm',
      color: 'Golden',
      adoptionDate: '2025-10-12',
      image: '🐶',
      status: 'Healthy',
      healthScore: 94,
      temperature: '101.5°F',
      themeColor: 'orange'
    },
    {
      id: 'guest_pet_2',
      userId: 'guest',
      name: 'Luna',
      species: 'Cat',
      breed: 'Persian',
      gender: 'Female',
      dob: '2024-06-24',
      weight: '5.2',
      height: '26cm',
      color: 'Cream',
      adoptionDate: '2025-11-15',
      image: '🐱',
      status: 'Calm',
      healthScore: 88,
      temperature: '100.8°F',
      themeColor: 'purple'
    },
    {
      id: 'guest_pet_3',
      userId: 'guest',
      name: 'Coco',
      species: 'Rabbit',
      breed: 'Holland Lop',
      gender: 'Male',
      dob: '2025-06-24',
      weight: '2.1',
      height: '22cm',
      color: 'Brown',
      adoptionDate: '2025-12-01',
      image: '🐰',
      status: 'Fit',
      healthScore: 91,
      temperature: '102.1°F',
      themeColor: 'blue'
    }
  ])));
  const [petHealthProfiles, setPetHealthProfiles] = useState(() => {
    const storedProfiles = loadJSON('petly_health_profiles', {});
    const normalizedProfiles = storedProfiles && typeof storedProfiles === 'object' && !Array.isArray(storedProfiles)
      ? storedProfiles
      : {};
    return buildPetHealthProfiles(adoptions, normalizedProfiles);
  });
  const [bookings, setBookings] = useState(() => loadJSON('petly_bookings', [
    { id: 1, userId: 'guest', petId: 'guest_pet_1', service: 'Vaccine Booster', provider: 'Pet Care Clinic', date: '2026-07-08', time: '10:00 AM', status: 'Confirmed' },
    { id: 2, userId: 'guest', petId: 'guest_pet_1', service: 'Grooming Session', provider: 'Paw Spa', date: '2026-07-15', time: '09:00 AM', status: 'Confirmed' },
    { id: 3, userId: 'guest', petId: 'guest_pet_2', service: 'Booster Vaccine', provider: 'Cat Care Center', date: '2026-07-04', time: '11:30 AM', status: 'Confirmed' },
    { id: 4, userId: 'guest', petId: 'guest_pet_2', service: 'Grooming Session', provider: 'Feline Groomers', date: '2026-06-30', time: '02:00 PM', status: 'Confirmed' },
    { id: 5, userId: 'guest', petId: 'guest_pet_3', service: 'Vaccine Booster', provider: 'Rabbit Wellness Clinic', date: '2026-08-08', time: '10:00 AM', status: 'Confirmed' }
  ]));
  const [quizHistory, setQuizHistory] = useState(() => loadJSON('petly_quiz_history', []));
  const [communityPosts, setCommunityPosts] = useState(() => loadJSON('petly_community_posts', initialCommunityPosts));
  const [communities, setCommunities] = useState(() => loadJSON('petly_comm_list', [
    { id: 'dogs', name: 'Dogs', slug: 'dogs', icon: '🐕', members: '1.2m', adminId: 'system', isBuiltIn: true },
    { id: 'cats', name: 'Cats', slug: 'cats', icon: '🐈', members: '980k', adminId: 'system', isBuiltIn: true },
    { id: 'birds', name: 'Birds', slug: 'birds', icon: '🦜', members: '120k', adminId: 'system', isBuiltIn: true },
    { id: 'rescue', name: 'Pet Rescue Stories', slug: 'rescue', icon: '❤️', members: '450k', adminId: 'system', isBuiltIn: true },
    { id: 'health', name: 'Pet Health', slug: 'health', icon: '🏥', members: '310k', adminId: 'system', isBuiltIn: true },
    { id: 'training', name: 'Pet Training', slug: 'training', icon: '🎓', members: '280k', adminId: 'system', isBuiltIn: true }
  ]));
  const [messages, setMessages] = useState(() => loadJSON('petly_messages', initialMessages));
  const [aiConversations, setAIConversations] = useState(() => loadJSON('petly_ai_conversations', []));
  const [activeAIConversationId, setActiveAIConversationId] = useState(() => loadJSON('petly_ai_current_conversation', null));
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('petly_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('petly_wishlist_pets', JSON.stringify(wishlistPets));
  }, [wishlistPets]);

  useEffect(() => {
    localStorage.setItem('petly_wishlist_products', JSON.stringify(wishlistProducts));
  }, [wishlistProducts]);

  useEffect(() => {
    localStorage.setItem('petly_health_weight', JSON.stringify(weightHistory));
  }, [weightHistory]);

  useEffect(() => {
    localStorage.setItem('petly_health_vaccines', JSON.stringify(vaccines));
  }, [vaccines]);

  useEffect(() => {
    localStorage.setItem('petly_health_timeline', JSON.stringify(timeline));
  }, [timeline]);

  useEffect(() => {
    localStorage.setItem('petly_health_medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('petly_milestones', JSON.stringify(milestones));
  }, [milestones]);

  useEffect(() => {
    localStorage.setItem('petly_adoptions', JSON.stringify(adoptions));
  }, [adoptions]);

  useEffect(() => {
    localStorage.setItem('petly_health_profiles', JSON.stringify(petHealthProfiles));
  }, [petHealthProfiles]);

  useEffect(() => {
    setPetHealthProfiles((prev) => {
      const previousProfiles = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
      const nextProfiles = migratePetHealthProfiles(adoptions, previousProfiles);
      return nextProfiles;
    });
  }, [adoptions, userId]);

  // Migrate legacy health records without petId to associate with a pet
  useEffect(() => {
    if (user || !adoptions || adoptions.length === 0) return;
    const primaryPetId = adoptions[0].id;
    let changed = false;

    const ensurePetId = (items, setter) => {
      const updated = items.map((it) => {
        if (!it.petId) {
          changed = true;
          return { ...it, petId: primaryPetId };
        }
        return it;
      });
      if (changed) setter(updated);
    };

    // Only run if there are legacy items without petId
    if (weightHistory.some(i => !i.petId)) ensurePetId(weightHistory, setWeightHistory);
    changed = false;
    if (vaccines.some(i => !i.petId)) ensurePetId(vaccines, setVaccines);
    changed = false;
    if (timeline.some(i => !i.petId)) ensurePetId(timeline, setTimeline);
    changed = false;
    if (medications.some(i => !i.petId)) ensurePetId(medications, setMedications);
    changed = false;
    if (milestones.some(i => !i.petId)) ensurePetId(milestones, setMilestones);
    changed = false;
    if (bookings.some(i => !i.petId)) ensurePetId(bookings, setBookings);
  }, [adoptions, user]);

  useEffect(() => {
    localStorage.setItem('petly_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('petly_quiz_history', JSON.stringify(quizHistory));
  }, [quizHistory]);

  useEffect(() => {
    localStorage.setItem('petly_community_posts', JSON.stringify(communityPosts));
  }, [communityPosts]);

  useEffect(() => {
    localStorage.setItem('petly_comm_list', JSON.stringify(communities));
  }, [communities]);

  useEffect(() => {
    localStorage.setItem('petly_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('petly_ai_conversations', JSON.stringify(aiConversations));
  }, [aiConversations]);

  useEffect(() => {
    localStorage.setItem('petly_ai_current_conversation', JSON.stringify(activeAIConversationId));
  }, [activeAIConversationId]);

  const currentCart = user
    ? mongoCart.map((item) => {
        const prod = item.product || {};
        return {
          id: prod._id || prod.id || item._id,
          _id: prod._id || item._id,
          productId: prod._id || prod.id,
          product: prod,
          name: prod.name || 'Petly Supply',
          brand: prod.brand || 'PETLY',
          category: prod.category || 'General',
          price: typeof prod.price === 'number' ? prod.price : 0,
          image: prod.image || '📦',
          imageKey: prod.imageKey || '',
          stock: prod.stock ?? 50,
          quantity: item.quantity || 1,
          userId,
        };
      })
    : cart.filter((item) => item.userId === userId);

  const currentWishlistPets = user
    ? Array.from(new Set(mongoWishlistPets.map((id) => String(id)).filter(Boolean)))
    : wishlistPets.filter((item) => item.userId === userId).map((item) => String(item.id));
  const currentWishlistProducts = user
    ? Array.from(new Set([
        ...mongoWishlist.map((p) => p?._id?.toString()).filter(Boolean),
        ...mongoWishlist.map((p) => p?.demoId).filter(Boolean),
        ...mongoWishlist.map((p) => p?.id).filter(Boolean),
      ]))
    : wishlistProducts.filter((item) => item.userId === userId).map((item) => String(item.id));
  const currentBookings = bookings.filter((item) => item.userId === userId);
  const currentAdoptions = user
    ? mongoPets.map((p, idx) => ({
        ...p,
        id: p._id,
        _id: p._id,
        userId,
        name: p.name,
        species: p.species,
        breed: p.breed,
        gender: p.gender,
        weight: p.weight,
        image: p.photoUrl || (p.species?.toLowerCase() === 'cat' ? '🐱' : p.species?.toLowerCase() === 'rabbit' ? '🐰' : '🐶'),
        status: p.healthStatus || 'Healthy',
        temperature: p.temperature ? (String(p.temperature).includes('°') ? p.temperature : `${p.temperature}°F`) : '101.2°F',
        height: p.height || '',
        color: p.color || '',
        themeColor: normalizeThemeColor(p.themeColor, p.name, idx),
        dob: p.dob || '',
        adoptionDate: p.adoptionDate || '',
        allergies: p.allergies || [],
        medicalConditions: p.medicalConditions || [],
        healthScore: p.healthScore || 92,
      }))
    : adoptions.filter((item) => item.userId === 'guest');
  const currentQuizHistory = quizHistory.filter((item) => item.userId === userId);
  const currentWeightHistory = (() => {
    const personal = weightHistory.filter((item) => item.userId === userId);
    return personal.length ? personal : weightHistory.filter((item) => item.userId === 'guest');
  })();
  const currentVaccines = (() => {
    if (user) {
      return mongoHealthRecords
        .filter((r) => r.type === 'vaccination')
        .map((r) => ({
          id: r._id,
          _id: r._id,
          petId: String(r.pet?._id || r.pet?.id || r.pet || ''),
          petName: r.pet?.name || '',
          name: r.title || 'Vaccine',
          date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '',
          status: r.status || 'completed',
          notes: r.notes || r.description || '',
        }));
    }
    const personal = vaccines.filter((item) => item.userId === userId);
    return personal.length ? personal : vaccines.filter((item) => item.userId === 'guest');
  })();
  const currentTimeline = (() => {
    if (user) {
      return mongoHealthRecords.map((r) => {
        let icon = 'clock';
        let color = 'blue';
        if (r.type === 'vaccination') {
          icon = 'syringe';
          color = r.status === 'completed' ? 'green' : 'orange';
        } else if (r.type === 'medication') {
          icon = 'pill';
          color = 'purple';
        } else if (r.type === 'appointment') {
          icon = 'stethoscope';
          color = 'blue';
        } else if (r.type === 'weight') {
          icon = 'clock';
          color = 'orange';
        }
        return {
          id: r._id,
          _id: r._id,
          petId: String(r.pet?._id || r.pet?.id || r.pet || ''),
          petName: r.pet?.name || '',
          title: r.title || (r.type === 'weight' ? `Weight: ${r.value} kg` : 'Health Event'),
          date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '',
          icon,
          color,
          completed: r.status === 'completed',
          status: r.status || (r.completed ? 'completed' : 'scheduled'),
          notes: r.notes || r.description || '',
          description: r.notes || r.description || '',
        };
      });
    }
    const personal = timeline.filter((item) => item.userId === userId);
    return personal.length ? personal : timeline.filter((item) => item.userId === 'guest');
  })();
  const currentMedications = (() => {
    if (user) {
      return mongoHealthRecords
        .filter((r) => r.type === 'medication' && (r.status === 'ongoing' || r.status === 'active' || !r.status))
        .map((r) => {
          const parts = (r.description || '').split('|');
          const freqPart = parts[0]?.trim() || (r.notes?.includes('Daily') ? 'Daily' : 'Daily');
          const nextPart = r.description?.includes('Next:')
            ? r.description.split('Next:')[1]?.trim()
            : (r.notes?.includes('Next:') ? r.notes.split('Next:')[1]?.trim() : (r.next || 'Ongoing'));
          return {
            id: r._id,
            _id: r._id,
            petId: String(r.pet?._id || r.pet?.id || r.pet || ''),
            petName: r.pet?.name || '',
            name: r.title || 'Medication',
            dose: r.value || r.dose || '1 dose',
            frequency: freqPart,
            next: nextPart,
            status: r.status || 'ongoing',
            notes: r.notes || r.description || '',
          };
        });
    }
    const personal = medications.filter((item) => item.userId === userId);
    return personal.length ? personal : medications.filter((item) => item.userId === 'guest');
  })();
  const currentMilestones = (() => {
    if (user) {
      return mongoHealthRecords
        .filter((r) => {
          if (r.type === 'vaccination' || r.type === 'weight' || r.type === 'medication') return false;
          if (r.type === 'appointment') return r.status === 'completed';
          return true;
        })
        .map((r) => ({
          id: r._id,
          _id: r._id,
          petId: String(r.pet?._id || r.pet?.id || r.pet || ''),
          petName: r.pet?.name || '',
          title: r.title || 'Health Milestone',
          date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '—',
          category: r.type === 'appointment' ? 'vet' : 'health',
          achieved: r.status === 'completed' || Boolean(r.achieved),
          status: r.status || 'completed',
          description: r.notes || r.description || '',
          notes: r.notes || r.description || '',
        }));
    }
    const personal = milestones.filter((item) => item.userId === userId);
    return personal.length ? personal : milestones.filter((item) => item.userId === 'guest');
  })();
  const userMessages = messages.filter((item) => item.userId === userId);
  const userConversations = aiConversations.filter((item) => item.userId === userId);

  const resolveProductId = useCallback((idOrProduct) => {
    if (!idOrProduct) return null;
    if (typeof idOrProduct === 'object') {
      return idOrProduct._id || idOrProduct.id;
    }
    const id = String(idOrProduct);
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      return id;
    }
    const match = storeProducts.find((p) => p.demoId === id || p.id === id);
    return match?._id || id;
  }, [storeProducts]);

  const cartTotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = currentCart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = async (product, quantity = 1) => {
    const targetId = resolveProductId(product);
    if (!targetId) return { success: false, message: 'Invalid product' };

    if (product.stock !== undefined && product.stock <= 0) {
      return { success: false, message: 'Product is currently out of stock.' };
    }

    if (user) {
      try {
        const res = await storeAPI.addToCart(targetId, quantity);
        if (res.success && Array.isArray(res.cart)) {
          setMongoCart(res.cart);
          return { success: true };
        }
      } catch (err) {
        console.error('[EcosystemContext] addToCart error:', err.message);
        return { success: false, message: err.message };
      }
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.userId === userId && item.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.userId === userId && item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { ...product, quantity, userId, id: product.id || targetId }];
      });
      return { success: true };
    }
  };

  const removeFromCart = async (id) => {
    const targetId = resolveProductId(id);
    if (user) {
      try {
        const res = await storeAPI.removeFromCart(targetId);
        if (res.success && Array.isArray(res.cart)) {
          setMongoCart(res.cart);
        }
      } catch (err) {
        console.error('[EcosystemContext] removeFromCart error:', err.message);
      }
    } else {
      setCart((prev) => prev.filter((item) => !(item.userId === userId && (item.id === id || item._id === id))));
    }
  };

  const updateCartQuantity = async (id, quantity) => {
    const targetId = resolveProductId(id);
    if (quantity <= 0) {
      return await removeFromCart(id);
    }
    if (user) {
      try {
        const res = await storeAPI.updateCartQuantity(targetId, quantity);
        if (res.success && Array.isArray(res.cart)) {
          setMongoCart(res.cart);
        }
      } catch (err) {
        console.error('[EcosystemContext] updateCartQuantity error:', err.message);
      }
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.userId === userId && (item.id === id || item._id === id)
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const clearCart = async () => {
    if (user) {
      try {
        await storeAPI.clearCart();
        setMongoCart([]);
      } catch (err) {
        console.error('[EcosystemContext] clearCart error:', err.message);
      }
    } else {
      setCart((prev) => prev.filter((item) => item.userId !== userId));
    }
  };

  const toggleWishlistPet = async (id) => {
    if (!id) return;
    const cleanId = String(id).trim();
    if (user) {
      try {
        const res = await storeAPI.toggleWishlistPet(cleanId);
        if (res.success && Array.isArray(res.wishlistPets)) {
          setMongoWishlistPets(res.wishlistPets);
        } else {
          await fetchWishlist();
        }
      } catch (err) {
        console.error('[EcosystemContext] toggleWishlistPet error:', err.message);
      }
    } else {
      setWishlistPets((prev) => {
        const exists = prev.some((item) => String(item.userId) === String(userId) && String(item.id) === cleanId);
        if (exists) {
          return prev.filter((item) => !(String(item.userId) === String(userId) && String(item.id) === cleanId));
        }
        return [
          ...prev.filter((item) => !(String(item.id) === cleanId && String(item.userId || userId) === String(userId))),
          { userId, id: cleanId }
        ];
      });
    }
  };

  const removeFromWishlistPet = async (id) => {
    if (!id) return;
    const cleanId = String(id).trim();
    if (user) {
      try {
        const res = await storeAPI.removeFromWishlistPet(cleanId);
        if (res.success && Array.isArray(res.wishlistPets)) {
          setMongoWishlistPets(res.wishlistPets);
        } else {
          await fetchWishlist();
        }
      } catch (err) {
        console.error('[EcosystemContext] removeFromWishlistPet error:', err.message);
      }
    }
    setWishlistPets((prev) =>
      prev.filter((item) => !(String(item.userId) === String(userId) && String(item.id) === cleanId))
    );
  };

  const removeFromWishlistProduct = async (id) => {
    if (!id) return;
    const targetId = resolveProductId(id);
    const cleanId = String(id).trim();
    const cleanTargetId = targetId ? String(targetId).trim() : null;

    if (user && targetId) {
      try {
        const res = await storeAPI.removeFromWishlist(targetId);
        if (res.success && Array.isArray(res.wishlist)) {
          setMongoWishlist(res.wishlist);
        } else {
          await fetchWishlist();
        }
      } catch (err) {
        console.error('[EcosystemContext] removeFromWishlistProduct error:', err.message);
      }
    }
    setWishlistProducts((prev) =>
      prev.filter((item) => !(String(item.userId) === String(userId) && (String(item.id) === cleanId || (cleanTargetId && String(item.id) === cleanTargetId))))
    );
  };

  const toggleWishlistProduct = async (id) => {
    if (!id) return;
    const targetId = resolveProductId(id);
    if (user && targetId) {
      try {
        const res = await storeAPI.toggleWishlist(targetId);
        if (res.success) {
          if (Array.isArray(res.wishlist)) {
            setMongoWishlist(res.wishlist);
          } else {
            await fetchWishlist();
          }
          return { success: true, isAdded: res.isAdded };
        }
      } catch (err) {
        console.error('[EcosystemContext] toggleWishlistProduct error:', err.message);
      }
    } else {
      const cleanId = String(id).trim();
      setWishlistProducts((prev) => {
        const exists = prev.some((item) => String(item.userId) === String(userId) && String(item.id) === cleanId);
        if (exists) {
          return prev.filter((item) => !(String(item.userId) === String(userId) && String(item.id) === cleanId));
        }
        return [
          ...prev.filter((item) => !(String(item.id) === cleanId && String(item.userId || userId) === String(userId))),
          { userId, id: cleanId }
        ];
      });
    }
  };

  const createOrder = async (orderPayload) => {
    if (!user) {
      return { success: false, message: 'Please sign in to complete your checkout.' };
    }
    try {
      const res = await storeAPI.createOrder(orderPayload);
      if (res.success || res.order) {
        await fetchCart();
        await fetchOrders();
        return { success: true, order: res.order || res };
      }
      return { success: false, message: res.message || 'Failed to place order.' };
    } catch (err) {
      console.error('[EcosystemContext] createOrder error:', err.message);
      return { success: false, message: err.message };
    }
  };

  const cancelOrder = async (orderId) => {
    if (!user) return { success: false, message: 'Please sign in.' };
    try {
      const res = await storeAPI.cancelOrder(orderId);
      if (res.success) {
        await fetchOrders();
        return { success: true, order: res.order };
      }
      return { success: false, message: res.message || 'Failed to cancel order.' };
    } catch (err) {
      console.error('[EcosystemContext] cancelOrder error:', err.message);
      return { success: false, message: err.message };
    }
  };

  const createServiceBooking = async (bookingPayload) => {
    if (!user) return { success: false, message: 'Please sign in to book a service.' };
    try {
      const res = await servicesAPI.createBooking(bookingPayload);
      if (res.success && res.booking) {
        await fetchServiceBookings();
        return { success: true, booking: res.booking };
      }
      return { success: false, message: res.message || 'Failed to create booking.' };
    } catch (err) {
      console.error('[EcosystemContext] createServiceBooking error:', err.message);
      return { success: false, message: err.message };
    }
  };

  const cancelServiceBooking = async (bookingId) => {
    if (!user) return { success: false, message: 'Please sign in.' };
    try {
      const res = await servicesAPI.cancelBooking(bookingId);
      if (res.success) {
        await fetchServiceBookings();
        return { success: true };
      }
      return { success: false, message: res.message || 'Failed to cancel booking.' };
    } catch (err) {
      console.error('[EcosystemContext] cancelServiceBooking error:', err.message);
      return { success: false, message: err.message };
    }
  };

  const addWeightRecord = (newVal, petId = null) => {
    const newRecord = {
      id: Date.now(),
      userId,
      petId,
      month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date()),
      weight: parseFloat(newVal),
    };
    setWeightHistory((prev) => [...prev, newRecord]);
  };

  const addVaccinationRecord = (name, date, status, petId = null) => {
    const newVax = {
      id: Date.now(),
      userId,
      petId,
      name,
      date,
      status,
    };
    setVaccines((prev) => [...prev, newVax]);

    addTimelineRecord(
      'vaccine',
      name,
      status === 'completed' ? date : `Due ${date}`,
      'syringe',
      status === 'completed' ? 'green' : status === 'overdue' ? 'orange' : 'blue',
      status === 'completed',
      petId
    );
  };

  const addTimelineRecord = (type, title, date, icon = 'clock', color = 'blue', completed = false, petId = null) => {
    const newEvent = {
      id: Date.now(),
      userId,
      petId,
      type,
      title,
      date,
      icon,
      color,
      completed,
    };
    setTimeline((prev) => [...prev, newEvent]);
  };

  const addMedicationRecord = (name, dose, frequency, next, petId = null) => {
    const newMed = { id: Date.now(), userId, petId, name, dose, frequency, next };
    setMedications((prev) => [...prev, newMed]);

    addTimelineRecord('medication', `Started Med: ${name}`, `Next: ${next}`, 'pill', 'purple', true, petId);
  };

  const addMilestone = ({ title, date = null, category = 'custom', description = '', achieved = false, petId = null }) => {
    const newMilestone = { id: Date.now(), userId, petId, title, date, category, description, achieved };
    setMilestones((prev) => [...prev, newMilestone]);
    return newMilestone;
  };

  const toggleMilestoneAchieved = (id) => {
    setMilestones((prev) => prev.map(m => m.id === id ? { ...m, achieved: !m.achieved } : m));
  };

  const updateMilestone = (id, updates) => {
    setMilestones((prev) => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMilestone = (id) => {
    setMilestones((prev) => prev.filter(m => m.id !== id));
  };

  const addAdoptionRequest = (request) => {
    const pet = normalizePetRegistry([{ ...request, userId, id: Date.now() }])[0];
    const petIndex = adoptions.length;
    setAdoptions((prev) => [...prev, pet]);
    setPetHealthProfiles((prev) => ({ ...prev, [pet.id]: normalizePetHealthProfile(prev[pet.id], pet, petIndex) }));

    const seed = getDefaultPetHealthSeed(pet, petIndex);
    const petId = pet.id;
    if (pet.weight) {
      const wh = { id: Date.now() + 1, userId, petId, month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date()), weight: parseFloat(pet.weight) };
      setWeightHistory((prev) => [...prev, wh]);
    }
    setVaccines((prev) => [...prev, ...seed.vaccinationRegistry.map((item, index) => ({ id: Date.now() + 100 + index, userId, petId, ...item }))]);
    setTimeline((prev) => [...prev, ...seed.healthTimeline.map((item, index) => ({ id: Date.now() + 200 + index, userId, petId, ...item }))]);
    setMedications((prev) => [...prev, ...seed.activeMedications.map((item, index) => ({ id: Date.now() + 300 + index, userId, petId, ...item }))]);
    setMilestones((prev) => [...prev, ...seed.healthMilestones.map((item, index) => ({ id: Date.now() + 400 + index, userId, petId, ...item }))]);
  };

  // MongoDB Pet CRUD Functions (Phase 4A)
  const createPet = async (petData) => {
    setPetsError(null);
    try {
      const response = await petsAPI.create({
        name: petData.name,
        species: petData.species,
        breed: petData.breed || 'Mixed',
        age: petData.age !== undefined ? Number(petData.age) : 1,
        gender: petData.gender || 'Unknown',
        weight: petData.weight !== undefined ? Number(petData.weight) : 0,
        description: petData.description || petData.medicalNotes || '',
        temperature: petData.temperature || '',
        height: petData.height || '',
        color: petData.color || '',
        themeColor: petData.themeColor ? String(petData.themeColor).trim().toLowerCase() : 'orange',
        dob: petData.dob || '',
        adoptionDate: petData.adoptionDate || '',
        allergies: petData.allergies || [],
        medicalConditions: petData.medicalConditions || [],
        photoKey: petData.photoKey || '',
        photoUrl: petData.photoUrl || petData.photo || petData.image || '',
        healthStatus: petData.healthStatus || petData.status || 'Healthy',
        isAdoptable: Boolean(petData.isAdoptable),
      });

      if (response.success && response.pet) {
        setMongoPets((prev) => [response.pet, ...prev]);
        return response.pet;
      }
    } catch (err) {
      setPetsError(err.message || 'Failed to create pet');
      throw err;
    }
  };

  const updatePet = async (id, updateData) => {
    setPetsError(null);
    try {
      const response = await petsAPI.update(id, updateData);
      if (response.success && response.pet) {
        setMongoPets((prev) =>
          prev.map((p) => (p._id === id || p.id === id ? response.pet : p))
        );
        return response.pet;
      }
    } catch (err) {
      setPetsError(err.message || 'Failed to update pet');
      throw err;
    }
  };

  const deletePet = async (id) => {
    setPetsError(null);
    try {
      const response = await petsAPI.delete(id);
      if (response.success) {
        setMongoPets((prev) => prev.filter((p) => p._id !== id && p.id !== id));
        return true;
      }
    } catch (err) {
      setPetsError(err.message || 'Failed to delete pet');
      throw err;
    }
  };

  // MongoDB Health Record CRUD (Phase 4B)
  const createHealthRecord = async (recordData) => {
    setHealthError(null);
    try {
      if (user && isValidMongoId(recordData.pet)) {
        const response = await healthAPI.create(recordData);
        const rec = response.record || response.healthRecord;
        if (response.success && rec) {
          setMongoHealthRecords((prev) => [rec, ...prev]);
          return rec;
        }
      } else {
        // Fallback for demo/guest mode
        if (recordData.type === 'weight') {
          addWeightRecord({
            petId: recordData.pet,
            month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(recordData.date || Date.now())),
            weight: parseFloat(recordData.value) || 0,
          });
        } else if (recordData.type === 'vaccination') {
          addVaccinationRecord({
            petId: recordData.pet,
            name: recordData.title,
            date: recordData.date || new Date().toISOString().split('T')[0],
            status: recordData.status || 'completed',
          });
        } else if (recordData.type === 'medication') {
          addMedicationRecord({
            petId: recordData.pet,
            name: recordData.title,
            dose: recordData.value || '',
            frequency: 'Daily',
            next: '',
          });
        } else {
          addTimelineRecord({
            petId: recordData.pet,
            title: recordData.title,
            date: recordData.date || new Date().toISOString().split('T')[0],
            notes: recordData.notes || recordData.description || '',
            icon: 'stethoscope',
            color: 'blue',
            category: 'vet',
            achieved: true,
          });
        }
        return { ...recordData, id: Date.now() };
      }
    } catch (err) {
      setHealthError(err.message || 'Failed to create health record');
      throw err;
    }
  };

  const updateHealthRecord = async (id, updateData) => {
    setHealthError(null);
    try {
      if (user && isValidMongoId(id)) {
        const response = await healthAPI.update(id, updateData);
        if (response.success && response.record) {
          setMongoHealthRecords((prev) =>
            prev.map((r) => (r._id === id || r.id === id ? response.record : r))
          );
          return response.record;
        }
      }
    } catch (err) {
      setHealthError(err.message || 'Failed to update health record');
      throw err;
    }
  };

  const deleteHealthRecord = async (id) => {
    setHealthError(null);
    try {
      if (user && isValidMongoId(id)) {
        const response = await healthAPI.delete(id);
        if (response.success) {
          setMongoHealthRecords((prev) => prev.filter((r) => r._id !== id && r.id !== id));
          return true;
        }
      }
    } catch (err) {
      setHealthError(err.message || 'Failed to delete health record');
      throw err;
    }
  };

  // MongoDB Medical Documents (Phase 4B - S3 Vault)
  const uploadMedicalDocument = async (formDataOrData) => {
    setDocumentsError(null);
    try {
      const response = await documentsAPI.upload(formDataOrData);
      if (response.success && response.document) {
        setMongoDocuments((prev) => [response.document, ...prev]);
        return response.document;
      }
    } catch (err) {
      setDocumentsError(err.message || 'Failed to upload medical document');
      throw err;
    }
  };

  const deleteMedicalDocument = async (id) => {
    setDocumentsError(null);
    try {
      const response = await documentsAPI.delete(id);
      if (response.success) {
        setMongoDocuments((prev) => prev.filter((d) => d._id !== id && d.id !== id));
        return true;
      }
    } catch (err) {
      setDocumentsError(err.message || 'Failed to delete medical document');
      throw err;
    }
  };

  const getDocumentPresignedUrl = async (id) => {
    const response = await documentsAPI.getPresignedUrl(id);
    if (response.success && response.presignedUrl) {
      return response.presignedUrl;
    }
    throw new Error(response.message || 'Failed to get document download URL');
  };

  // MongoDB Adoption Listings & Applications CRUD (Phase 5)
  const createAdoptionListing = async (listingData) => {
    setAdoptionListingsError(null);
    try {
      const response = await adoptionAPI.create(listingData);
      if (response.success && response.listing) {
        await fetchAdoptionListings();
        return response.listing;
      }
      throw new Error(response.message || 'Failed to create adoption listing');
    } catch (err) {
      setAdoptionListingsError(err.message || 'Failed to create adoption listing');
      throw err;
    }
  };

  const updateAdoptionListing = async (id, listingData) => {
    setAdoptionListingsError(null);
    try {
      const response = await adoptionAPI.update(id, listingData);
      if (response.success && response.listing) {
        await fetchAdoptionListings();
        return response.listing;
      }
      throw new Error(response.message || 'Failed to update adoption listing');
    } catch (err) {
      setAdoptionListingsError(err.message || 'Failed to update adoption listing');
      throw err;
    }
  };

  const deleteAdoptionListing = async (id) => {
    setAdoptionListingsError(null);
    try {
      const response = await adoptionAPI.delete(id);
      if (response.success) {
        setMongoAdoptionListings((prev) => prev.filter((l) => l._id !== id));
        return true;
      }
      throw new Error(response.message || 'Failed to delete adoption listing');
    } catch (err) {
      setAdoptionListingsError(err.message || 'Failed to delete adoption listing');
      throw err;
    }
  };

  const applyForAdoption = async (listingId, applicationData) => {
    setMyApplicationsError(null);
    try {
      const response = await adoptionAPI.apply(listingId, applicationData);
      if (response.success && response.application) {
        await fetchMyApplications();
        await fetchAdoptionListings();
        return response.application;
      }
      throw new Error(response.message || 'Failed to submit adoption application');
    } catch (err) {
      setMyApplicationsError(err.message || 'Failed to submit adoption application');
      throw err;
    }
  };

  const withdrawApplication = async (appId) => {
    setMyApplicationsError(null);
    try {
      const response = await adoptionAPI.updateApplicationStatus(appId, { status: 'withdrawn' });
      if (response.success) {
        await fetchMyApplications();
        return true;
      }
      throw new Error(response.message || 'Failed to withdraw application');
    } catch (err) {
      setMyApplicationsError(err.message || 'Failed to withdraw application');
      throw err;
    }
  };

  const deleteApplication = async (appId) => {
    setMyApplicationsError(null);
    try {
      const response = await adoptionAPI.deleteApplication(appId);
      if (response.success) {
        setMyApplications((prev) => prev.filter((a) => a._id !== appId));
        return true;
      }
      throw new Error(response.message || 'Failed to delete application');
    } catch (err) {
      setMyApplicationsError(err.message || 'Failed to delete application');
      throw err;
    }
  };

  const getListingApplications = async (listingId) => {
    const response = await adoptionAPI.getListingApplications(listingId);
    if (response.success && Array.isArray(response.applications)) {
      return response.applications;
    }
    throw new Error(response.message || 'Failed to fetch listing applications');
  };

  const updateApplicationStatus = async (appId, status, notes) => {
    const response = await adoptionAPI.updateApplicationStatus(appId, { status, notes });
    if (response.success && response.application) {
      await fetchAdoptionListings();
      return response.application;
    }
    throw new Error(response.message || 'Failed to update application status');
  };

  // Add an existing pet to the user's ecosystem
  const addExistingPet = async (petData) => {
    if (user) {
      const createdPet = await createPet({
        ...petData,
        temperature: petData.temperature || '',
        height: petData.height || '',
        color: petData.color || '',
        themeColor: petData.themeColor ? String(petData.themeColor).trim().toLowerCase() : 'orange',
        dob: petData.dob || '',
        adoptionDate: petData.adoptionDate || '',
        allergies: petData.allergies || [],
        medicalConditions: petData.medicalConditions || [],
        description: petData.medicalNotes || petData.description || '',
      });

      if (createdPet?._id) {
        const vaccineEntries = Array.isArray(petData.vaccines)
          ? petData.vaccines.filter(Boolean)
          : (petData.vaccines || '').split(/\n|,/).map((entry) => entry.trim()).filter(Boolean);
        for (const vax of vaccineEntries) {
          try {
            await createHealthRecord({
              pet: createdPet._id,
              type: 'vaccination',
              title: vax,
              status: 'completed',
              date: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Initial vaccine creation notice:', e.message);
          }
        }

        const medicationEntries = Array.isArray(petData.medications)
          ? petData.medications.filter(Boolean)
          : (petData.medications || '').split(/\n|,/).map((entry) => entry.trim()).filter(Boolean);
        for (const med of medicationEntries) {
          try {
            await createHealthRecord({
              pet: createdPet._id,
              type: 'medication',
              title: med,
              value: 'As directed',
              description: 'Daily',
              status: 'ongoing',
              date: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Initial medication creation notice:', e.message);
          }
        }
      }

      return createdPet;
    }

    const id = `pet_${Date.now()}`;
    const pet = normalizePetRegistry([{ id, userId, ...petData }])[0];
    const petIndex = adoptions.length;
    setAdoptions((prev) => [...prev, pet]);
    setPetHealthProfiles((prev) => ({ ...prev, [pet.id]: normalizePetHealthProfile(prev[pet.id], pet, petIndex) }));

    const seed = getDefaultPetHealthSeed(pet, petIndex);
    const petId = pet.id;
    const vaccineEntries = Array.isArray(petData.vaccines)
      ? petData.vaccines.filter(Boolean)
      : (petData.vaccines || '').split(/\n|,/).map((entry) => entry.trim()).filter(Boolean);
    const medicationEntries = Array.isArray(petData.medications)
      ? petData.medications.filter(Boolean)
      : (petData.medications || '').split(/\n|,/).map((entry) => entry.trim()).filter(Boolean);

    if (pet.weight) {
      const wh = { id: Date.now() + 1, userId, petId, month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date()), weight: parseFloat(pet.weight) };
      setWeightHistory((prev) => [...prev, wh]);
    }

    if (vaccineEntries.length) {
      setVaccines((prev) => [...prev, ...vaccineEntries.map((entry, index) => ({ id: Date.now() + 100 + index, userId, petId, name: entry, date: new Date().toISOString().split('T')[0], status: 'completed', veterinarian: 'Dr. Rivera' }))]);
    } else {
      setVaccines((prev) => [...prev, ...seed.vaccinationRegistry.map((item, index) => ({ id: Date.now() + 100 + index, userId, petId, ...item }))]);
    }

    setTimeline((prev) => [...prev, ...seed.healthTimeline.map((item, index) => ({ id: Date.now() + 200 + index, userId, petId, ...item }))]);

    if (medicationEntries.length) {
      setMedications((prev) => [...prev, ...medicationEntries.map((entry, index) => ({ id: Date.now() + 300 + index, userId, petId, name: entry, dosage: 'As directed', frequency: 'Daily', purpose: petData.medicalNotes || 'Routine care', startDate: new Date().toISOString().split('T')[0], endDate: '' }))]);
    } else {
      setMedications((prev) => [...prev, ...seed.activeMedications.map((item, index) => ({ id: Date.now() + 300 + index, userId, petId, ...item }))]);
    }

    const milestone = { id: Date.now() + 400, userId, petId, title: 'Registered in PETLY', date: new Date().toISOString().split('T')[0], category: 'life', achieved: true, description: petData.medicalNotes || 'Pet profile created' };
    setMilestones((prev) => [...prev, milestone]);

    return pet;
  };

  const addBooking = (booking) => {
    setBookings((prev) => [...prev, { ...booking, userId, id: Date.now() }]);
  };

  const addQuizResult = (result) => {
    setQuizHistory((prev) => [{ ...result, userId, id: Date.now() }, ...prev]);
  };

  // Normalize MongoDB posts to match frontend UI contract
  const normalizedMongoPosts = useMemo(() => {
    if (!Array.isArray(mongoCommunityPosts)) return [];
    return mongoCommunityPosts.map((post) => {
      let title = '';
      let body = post.content || '';
      if (post.content && post.content.includes('\n\n')) {
        const parts = post.content.split('\n\n');
        title = parts[0];
        body = parts.slice(1).join('\n\n');
      } else if (post.content && post.content.includes('\n')) {
        const parts = post.content.split('\n');
        title = parts[0];
        body = parts.slice(1).join('\n');
      } else {
        title = post.content || (post.mediaKey ? 'Media Post' : 'Community Update');
      }

      const isUpvoted = Array.isArray(post.likes) && post.likes.some(
        (l) => (l?._id || l)?.toString() === userId
      );
      const isDownvoted = Array.isArray(post.downvotes) && post.downvotes.some(
        (l) => (l?._id || l)?.toString() === userId
      );
      const userVote = isUpvoted ? 1 : (isDownvoted ? -1 : 0);

      const upCount = post.likesCount !== undefined ? post.likesCount : (post.likes?.length || 0);
      const downCount = post.downvotesCount !== undefined ? post.downvotesCount : (post.downvotes?.length || 0);
      const netVotes = upCount - downCount;

      const isSaved = Array.isArray(post.savedBy) && post.savedBy.some(
        (s) => (s?._id || s)?.toString() === userId
      );

      const resolvedMediaType = post.mediaType || (post.mediaKey?.match(/\.(mp4|webm)$/i) ? 'video' : (post.mediaKey ? 'image' : ''));

      return {
        id: post._id,
        _id: post._id,
        authorId: (post.author?._id || post.author)?.toString(),
        author: post.author?.fullName || 'Petly Guardian',
        authorRole: post.author?.role || 'user',
        authorAvatar: post.author?.avatarUrl || '',
        communityId: (post.category || 'General').toLowerCase().replace(/\s+/g, '-'),
        category: post.category || 'General',
        title,
        body,
        content: post.content || '',
        mediaKey: post.mediaKey || '',
        mediaType: resolvedMediaType,
        mediaUrl: post.mediaUrl || '',
        votes: netVotes,
        userVote,
        isLiked: isUpvoted,
        likesCount: upCount,
        downvotesCount: downCount,
        likedBy: Array.isArray(post.likes) ? post.likes.map((l) => (l?._id || l)?.toString()) : [],
        comments: post.commentsCount || 0,
        commentsCount: post.commentsCount || 0,
        commentsList: post.commentsList || [],
        savedBy: Array.isArray(post.savedBy) ? post.savedBy.map((s) => (s?._id || s)?.toString()) : [],
        isSaved,
        date: post.createdAt ? formatRelativeTime(post.createdAt) : 'Recently',
        createdAt: post.createdAt,
        pinned: Boolean(post.pinned),
        rawPost: post,
      };
    });
  }, [mongoCommunityPosts, userId]);

  const activeCommunityPosts = normalizedMongoPosts.length > 0 ? normalizedMongoPosts : (user ? [] : communityPosts);

  const createCommunityPost = async ({ title, body, content, communityId, category, mediaKey, mediaType }) => {
    const fullContent = (title && body) ? `${title}\n\n${body}` : (content || title || body || '');
    const finalCategory = (category || 'General').trim();

    let resolvedMediaType = (mediaType || '').trim();
    if (!resolvedMediaType && mediaKey) {
      resolvedMediaType = mediaKey.match(/\.(mp4|webm)$/i) ? 'video' : 'image';
    }

    if (user) {
      setCommunityPostsError(null);
      try {
        const response = await communityAPI.createPost({
          content: fullContent,
          category: finalCategory,
          mediaKey: mediaKey || '',
          mediaType: resolvedMediaType,
        });
        if (response.success && response.post) {
          await fetchCommunityPosts();
          return response.post;
        }
        throw new Error(response.message || 'Failed to create post');
      } catch (err) {
        setCommunityPostsError(err.message || 'Failed to create post');
        throw err;
      }
    } else {
      const newPost = {
        id: Date.now(),
        authorId: userId || 'guest',
        author: user?.fullName || 'Anonymous',
        communityId: (finalCategory || communityId || 'dogs').toLowerCase().replace(/\s+/g, '-'),
        category: finalCategory || 'General',
        title: title || 'Community Update',
        body: body || content || '',
        mediaKey: mediaKey || '',
        mediaType: resolvedMediaType,
        mediaUrl: '',
        votes: 0,
        userVote: 0,
        likedBy: [],
        comments: 0,
        savedBy: [],
        isSaved: false,
        date: 'Just now',
        pinned: false,
        commentsList: []
      };
      setCommunityPosts((prev) => [newPost, ...prev]);
      return newPost;
    }
  };

  const updateCommunityPost = async (id, { title, body, content, category, mediaKey, mediaType }) => {
    const fullContent = (title && body) ? `${title}\n\n${body}` : (content || title || body || '');

    if (user) {
      setCommunityPostsError(null);
      try {
        const updatePayload = { content: fullContent };
        if (category) updatePayload.category = category.trim();
        if (mediaKey !== undefined) updatePayload.mediaKey = mediaKey;
        if (mediaType !== undefined) updatePayload.mediaType = mediaType;
        const response = await communityAPI.updatePost(id, updatePayload);
        if (response.success && response.post) {
          await fetchCommunityPosts();
          return response.post;
        }
        throw new Error(response.message || 'Failed to update post');
      } catch (err) {
        setCommunityPostsError(err.message || 'Failed to update post');
        throw err;
      }
    } else {
      setCommunityPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title: title || p.title, body: body || p.body } : p))
      );
    }
  };

  const deleteCommunityPost = async (id) => {
    if (user) {
      setCommunityPostsError(null);
      try {
        const response = await communityAPI.deletePost(id);
        if (response.success) {
          setMongoCommunityPosts((prev) => prev.filter((p) => p._id !== id));
          return true;
        }
        throw new Error(response.message || 'Failed to delete post');
      } catch (err) {
        setCommunityPostsError(err.message || 'Failed to delete post');
        throw err;
      }
    } else {
      setCommunityPosts((prev) => prev.filter((post) => post.id !== id && post._id !== id));
    }
  };

  const toggleVotePost = async (postId, type = 'up') => {
    if (user) {
      try {
        const response = await communityAPI.toggleVote(postId, type);
        if (response.success) {
          setMongoCommunityPosts((prev) =>
            prev.map((post) => {
              if (post._id !== postId) return post;
              const userIdStr = userId?.toString();
              let nextLikes = Array.isArray(post.likes) ? post.likes.map((l) => (l?._id || l)?.toString()) : [];
              let nextDownvotes = Array.isArray(post.downvotes) ? post.downvotes.map((d) => (d?._id || d)?.toString()) : [];

              if (response.userVote === 1) {
                if (!nextLikes.includes(userIdStr)) nextLikes.push(userIdStr);
                nextDownvotes = nextDownvotes.filter((id) => id !== userIdStr);
              } else if (response.userVote === -1) {
                if (!nextDownvotes.includes(userIdStr)) nextDownvotes.push(userIdStr);
                nextLikes = nextLikes.filter((id) => id !== userIdStr);
              } else {
                nextLikes = nextLikes.filter((id) => id !== userIdStr);
                nextDownvotes = nextDownvotes.filter((id) => id !== userIdStr);
              }

              return {
                ...post,
                likes: nextLikes,
                downvotes: nextDownvotes,
                likesCount: response.likesCount !== undefined ? response.likesCount : nextLikes.length,
                downvotesCount: response.downvotesCount !== undefined ? response.downvotesCount : nextDownvotes.length,
              };
            })
          );
          return response;
        }
      } catch (err) {
        console.error('[EcosystemContext] Vote toggle failed:', err.message);
        throw err;
      }
    } else {
      setCommunityPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const currentVote = post.userVote || 0;
          let newVote = 0;
          if (type === 'up') {
            newVote = currentVote === 1 ? 0 : 1;
          } else {
            newVote = currentVote === -1 ? 0 : -1;
          }
          const netDiff = newVote - currentVote;
          return {
            ...post,
            userVote: newVote,
            votes: (post.votes || 0) + netDiff,
            likedBy: newVote === 1 ? [...new Set([...(post.likedBy || []), userId || 'guest'])] : (post.likedBy || []).filter(u => u !== (userId || 'guest')),
          };
        })
      );
    }
  };

  const toggleSavePost = async (postId) => {
    if (user) {
      try {
        const response = await communityAPI.toggleSave(postId);
        if (response.success) {
          setMongoCommunityPosts((prev) =>
            prev.map((post) => {
              if (post._id !== postId) return post;
              const userIdStr = userId?.toString();
              const currentSaved = Array.isArray(post.savedBy) ? post.savedBy.map((s) => (s?._id || s)?.toString()) : [];
              const nextSaved = response.saved
                ? (currentSaved.includes(userIdStr) ? currentSaved : [...currentSaved, userIdStr])
                : currentSaved.filter((id) => id !== userIdStr);
              return {
                ...post,
                savedBy: nextSaved,
              };
            })
          );
          return response;
        }
      } catch (err) {
        console.error('[EcosystemContext] Save toggle failed:', err.message);
        throw err;
      }
    } else {
      setCommunityPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const uId = userId || 'guest';
          const isCurrentlySaved = (post.savedBy || []).includes(uId);
          const nextSaved = isCurrentlySaved
            ? (post.savedBy || []).filter(u => u !== uId)
            : [...(post.savedBy || []), uId];
          return {
            ...post,
            savedBy: nextSaved,
            isSaved: !isCurrentlySaved,
          };
        })
      );
    }
  };

  const addCommentToPost = async (postId, commentText) => {
    if (!commentText || !commentText.trim()) return;

    if (user) {
      try {
        const response = await communityAPI.addComment(postId, { content: commentText.trim() });
        if (response.success && response.comment) {
          setMongoCommunityPosts((prev) =>
            prev.map((p) => (p._id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p))
          );
          return response.comment;
        }
        throw new Error(response.message || 'Failed to add comment');
      } catch (err) {
        console.error('[EcosystemContext] Add comment failed:', err.message);
        throw err;
      }
    } else {
      setCommunityPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: post.comments + 1,
            commentsList: [
              ...post.commentsList,
              {
                id: Date.now(),
                author: user?.fullName || 'Anonymous',
                text: commentText,
                date: 'Just now'
              }
            ]
          };
        })
      );
    }
  };

  const fetchPostComments = async (postId) => {
    try {
      const response = await communityAPI.getComments(postId);
      if (response.success && Array.isArray(response.comments)) {
        return response.comments;
      }
      return [];
    } catch (err) {
      console.error('[EcosystemContext] Fetch comments failed:', err.message);
      return [];
    }
  };

  const updateComment = async (commentId, content) => {
    const response = await communityAPI.updateComment(commentId, { content });
    if (response.success && response.comment) {
      return response.comment;
    }
    throw new Error(response.message || 'Failed to update comment');
  };

  const deleteComment = async (commentId, postId) => {
    const response = await communityAPI.deleteComment(commentId);
    if (response.success) {
      if (postId) {
        setMongoCommunityPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, commentsCount: Math.max((p.commentsCount || 1) - 1, 0) } : p))
        );
      }
      return true;
    }
    throw new Error(response.message || 'Failed to delete comment');
  };

  const togglePinPost = (postId) => {
    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, pinned: !post.pinned } : post
      )
    );
  };

  const fetchSocieties = useCallback(async () => {
    try {
      const response = await communityAPI.getSocieties();
      if (response.success && Array.isArray(response.societies)) {
        setCommunities(response.societies);
        try {
          localStorage.setItem('petly_comm_list', JSON.stringify(response.societies));
        } catch {}
      }
    } catch (err) {
      console.warn('[EcosystemContext] fetchSocieties notice:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  const createSociety = async ({ name, icon }) => {
    if (user) {
      const res = await communityAPI.createSociety({ name, icon });
      if (res.success && res.society) {
        setCommunities((prev) => {
          const next = [...prev, res.society];
          try {
            localStorage.setItem('petly_comm_list', JSON.stringify(next));
          } catch {}
          return next;
        });
        return res.society;
      }
      throw new Error(res.message || 'Failed to create society');
    } else {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const localSociety = {
        id: `society-${Date.now()}`,
        name,
        slug,
        icon: icon || '🐾',
        members: '1',
        adminId: userId || 'guest',
        isBuiltIn: false,
      };
      setCommunities((prev) => {
        const next = [...prev, localSociety];
        try {
          localStorage.setItem('petly_comm_list', JSON.stringify(next));
        } catch {}
        return next;
      });
      return localSociety;
    }
  };

  const deleteSociety = async (societyId, societyName) => {
    const isMongoId = Boolean(societyId && /^[0-9a-fA-F]{24}$/.test(String(societyId)));
    if (user && isMongoId) {
      const res = await communityAPI.deleteSociety(societyId);
      if (res.success) {
        setCommunities((prev) => {
          const next = prev.filter((s) => s.id !== societyId && s._id !== societyId);
          try {
            localStorage.setItem('petly_comm_list', JSON.stringify(next));
          } catch {}
          return next;
        });
        // Reassign posts in state
        setMongoCommunityPosts((prev) =>
          prev.map((p) => (p.category?.toLowerCase() === societyName?.toLowerCase() ? { ...p, category: 'General' } : p))
        );
        // Refresh posts from server to sync reassigned posts
        await fetchCommunityPosts();
        return res;
      }
      throw new Error(res.message || 'Failed to delete society');
    } else {
      // Local/guest fallback
      setCommunities((prev) => {
        const next = prev.filter((s) => s.id !== societyId && s._id !== societyId);
        try {
          localStorage.setItem('petly_comm_list', JSON.stringify(next));
        } catch {}
        return next;
      });
      setCommunityPosts((prev) =>
        prev.map((p) => (p.category?.toLowerCase() === societyName?.toLowerCase() ? { ...p, category: 'General' } : p))
      );
      return { success: true };
    }
  };

  const addMessageToConversation = (conversationId, message) => {
    setMessages((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessage: message.text,
              time: message.time,
              unread: message.sender !== 'me'
            }
          : conversation
      )
    );
  };

  const createMessageConversation = (conversation) => {
    setMessages((prev) => [...prev, conversation]);
  };

  const createAIConversation = () => {
    const newConv = {
      id: Date.now(),
      userId,
      title: 'Pet Care Inquiry',
      messages: [
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'Hello! I am PETLY AI. How can I assist your pet today?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    setAIConversations((prev) => [newConv, ...prev]);
    setActiveAIConversationId(newConv.id);
    return newConv;
  };

  const appendAIMessage = (conversationId, message) => {
    setAIConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    );
  };

  const currentAIConversation = userConversations.find(
    (conversation) => conversation.id === activeAIConversationId
  );

  const ensureActiveAIConversation = () => {
    if (currentAIConversation) return;
    if (userConversations.length > 0) {
      setActiveAIConversationId(userConversations[0].id);
      return;
    }
    createAIConversation();
  };

  useEffect(() => {
    if (!activeAIConversationId) {
      ensureActiveAIConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, aiConversations]);

  const submitQuizAttempt = async (attemptData) => {
    if (user) {
      const response = await quizAPI.submitAttempt(attemptData);
      if (response.success && response.attempt) {
        setMongoQuizAttempts((prev) => [response.attempt, ...prev]);
        return response.attempt;
      }
      throw new Error(response.message || 'Failed to submit quiz attempt');
    } else {
      // Guest local attempt fallback
      const localAttempt = {
        _id: `attempt-${Date.now()}`,
        id: `attempt-${Date.now()}`,
        category: attemptData.category || 'General',
        score: attemptData.score || 0,
        totalQuestions: attemptData.totalQuestions || attemptData.answers?.length || 1,
        percentage: attemptData.percentage || 0,
        answers: attemptData.answers || [],
        createdAt: new Date().toISOString(),
      };
      setQuizHistory((prev) => [localAttempt, ...(prev || [])]);
      return localAttempt;
    }
  };

  const fetchQuizQuestions = async (params = '') => {
    return quizAPI.getQuestions(params);
  };

  const createQuizQuestion = async (data) => {
    return quizAPI.createQuestion(data);
  };

  const updateQuizQuestion = async (id, data) => {
    return quizAPI.updateQuestion(id, data);
  };

  const deleteQuizQuestion = async (id) => {
    return quizAPI.deleteQuestion(id);
  };

  const getQuizAttemptDetails = async (id) => {
    return quizAPI.getAttemptById(id);
  };

  return (
    <EcosystemContext.Provider
      value={{
        cart: currentCart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartCount,
        wishlistPets: currentWishlistPets,
        wishlistProducts: currentWishlistProducts,
        toggleWishlistPet,
        toggleWishlistProduct,
        removeFromWishlistPet,
        removeFromWishlistProduct,
        weightHistory: currentWeightHistory,
        vaccines: currentVaccines,
        timeline: currentTimeline,
        medications: currentMedications,
        addWeightRecord,
        addVaccinationRecord,
        addTimelineRecord,
        addMedicationRecord,
        adoptions: currentAdoptions,
        addAdoptionRequest,
        petHealthProfiles,
        bookings: currentBookings,
        addBooking,
        quizHistory: currentQuizHistory,
        addQuizResult,
        communityPosts: activeCommunityPosts,
        mongoCommunityPosts,
        communityPostsLoading,
        communityPostsError,
        fetchCommunityPosts,
        communities,
        setCommunities,
        fetchSocieties,
        createSociety,
        deleteSociety,
        createCommunityPost,
        updateCommunityPost,
        deleteCommunityPost,
        toggleVotePost,
        toggleLikePost: toggleVotePost,
        addCommentToPost,
        fetchPostComments,
        updateComment,
        deleteComment,
        toggleSavePost,
        togglePinPost,
        messages: userMessages,
        addMessageToConversation,
        createMessageConversation,
        aiConversations: userConversations,
        currentAIConversation,
        createAIConversation,
        appendAIMessage,
        milestones: currentMilestones,
        addMilestone,
        addExistingPet,
        toggleMilestoneAchieved,
        updateMilestone,
        removeMilestone,
        setActiveAIConversationId,
        isCartOpen,
        setIsCartOpen,
        // MongoDB Pet CRUD (Phase 4A)
        pets: currentAdoptions,
        mongoPets,
        petsLoading,
        petsError,
        fetchPets,
        createPet,
        updatePet,
        deletePet,
        // MongoDB Health & Documents (Phase 4B)
        mongoHealthRecords,
        healthRecords: mongoHealthRecords,
        healthLoading,
        healthError,
        fetchHealthRecords,
        createHealthRecord,
        updateHealthRecord,
        deleteHealthRecord,
        mongoDocuments,
        documents: mongoDocuments,
        documentsLoading,
        documentsError,
        fetchMedicalDocuments,
        uploadMedicalDocument,
        deleteMedicalDocument,
        getDocumentPresignedUrl,
        // MongoDB Adoption Listings & Applications (Phase 5)
        mongoAdoptionListings,
        adoptionListings: mongoAdoptionListings,
        adoptionListingsLoading,
        adoptionListingsError,
        fetchAdoptionListings,
        createAdoptionListing,
        updateAdoptionListing,
        deleteAdoptionListing,
        myApplications,
        myApplicationsLoading,
        myApplicationsError,
        fetchMyApplications,
        applyForAdoption,
        withdrawApplication,
        deleteApplication,
        getListingApplications,
        updateApplicationStatus,
        // MongoDB Quiz & Assessment (Phase 7)
        mongoQuizAttempts,
        quizAttempts: mongoQuizAttempts,
        quizAttemptsLoading,
        quizAttemptsError,
        fetchMyQuizAttempts,
        submitQuizAttempt,
        fetchQuizQuestions,
        createQuizQuestion,
        updateQuizQuestion,
        deleteQuizQuestion,
        getQuizAttemptDetails,
        // Companion Match Persistence (Phase 7 Extension)
        companionMatches,
        companionMatchesLoading,
        companionMatchesError,
        fetchMyCompanionMatches,
        saveCompanionMatch,
        getCompanionMatchDetails,
        // MongoDB Store & Orders (Phase 8)
        products: storeProducts,
        storeProducts,
        storeProductsLoading,
        storeProductsError,
        fetchStoreProducts,
        mongoWishlist,
        mongoWishlistPets,
        wishlistLoading,
        fetchWishlist,
        mongoCart,
        cartLoading,
        fetchCart,
        orders: storeOrders,
        storeOrders,
        ordersLoading,
        fetchOrders,
        createOrder,
        cancelOrder,
        // Services (Phase 8C)
        serviceProviders: mongoServiceProviders,
        serviceProvidersLoading,
        fetchServiceProviders,
        serviceBookings: mongoServiceBookings,
        serviceBookingsLoading,
        fetchServiceBookings,
        createServiceBooking,
        cancelServiceBooking,
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
};

export const useEcosystem = () => useContext(EcosystemContext);
