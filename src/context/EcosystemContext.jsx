import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { AI_KNOWLEDGE_BASE, DEFAULT_AI_RESPONSE } from '../data/aiKnowledge';

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

const petThemePalette = ['blue', 'purple', 'green', 'orange', 'yellow'];

const getPetThemeColor = (pet, index = 0) => pet?.themeColor || petThemePalette[index % petThemePalette.length] || 'orange';

const normalizePetRegistry = (pets = []) => {
  return (Array.isArray(pets) ? pets : []).map((pet, index) => ({
    ...pet,
    themeColor: getPetThemeColor(pet, index),
    temperature: pet.temperature || '100.8°F',
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
  const userId = user?.id || 'guest';

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
    { id: 'dogs', name: 'Dogs', slug: 'dogs', icon: '🐕', members: '1.2m', adminId: 'system' },
    { id: 'cats', name: 'Cats', slug: 'cats', icon: '🐈', members: '980k', adminId: 'system' },
    { id: 'birds', name: 'Birds', slug: 'birds', icon: '🦜', members: '120k', adminId: 'system' },
    { id: 'rescue', name: 'Pet Rescue Stories', slug: 'rescue', icon: '❤️', members: '450k', adminId: 'system' },
    { id: 'health', name: 'Pet Health', slug: 'health', icon: '🏥', members: '310k', adminId: 'system' },
    { id: 'training', name: 'Pet Training', slug: 'training', icon: '🎓', members: '280k', adminId: 'system' }
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
    if (!adoptions || adoptions.length === 0) return;
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
  }, [adoptions]);

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

  const currentCart = cart.filter((item) => item.userId === userId);
  const currentWishlistPets = wishlistPets.filter((item) => item.userId === userId).map((item) => item.id);
  const currentWishlistProducts = wishlistProducts.filter((item) => item.userId === userId).map((item) => item.id);
  const currentAdoptions = adoptions.filter((item) => item.userId === userId);
  const currentBookings = bookings.filter((item) => item.userId === userId);
  const currentQuizHistory = quizHistory.filter((item) => item.userId === userId);
  const currentWeightHistory = (() => {
    const personal = weightHistory.filter((item) => item.userId === userId);
    return personal.length ? personal : weightHistory.filter((item) => item.userId === 'guest');
  })();
  const currentVaccines = (() => {
    const personal = vaccines.filter((item) => item.userId === userId);
    return personal.length ? personal : vaccines.filter((item) => item.userId === 'guest');
  })();
  const currentTimeline = (() => {
    const personal = timeline.filter((item) => item.userId === userId);
    return personal.length ? personal : timeline.filter((item) => item.userId === 'guest');
  })();
  const currentMedications = (() => {
    const personal = medications.filter((item) => item.userId === userId);
    return personal.length ? personal : medications.filter((item) => item.userId === 'guest');
  })();
  const currentMilestones = (() => {
    const personal = milestones.filter((item) => item.userId === userId);
    return personal.length ? personal : milestones.filter((item) => item.userId === 'guest');
  })();
  const userMessages = messages.filter((item) => item.userId === userId);
  const userConversations = aiConversations.filter((item) => item.userId === userId);

  const cartTotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = currentCart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.userId === userId && item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.userId === userId && item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, userId, id: product.id }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => !(item.userId === userId && item.id === id)));
  };

  const updateCartQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.userId === userId && item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCart((prev) => prev.filter((item) => item.userId !== userId));

  const toggleWishlistPet = (id) => {
    setWishlistPets((prev) => {
      const exists = prev.some((item) => item.userId === userId && item.id === id);
      if (exists) {
        return prev.filter((item) => !(item.userId === userId && item.id === id));
      }
      return [
        ...prev.filter((item) => !(item.id === id && !item.userId)),
        { userId, id }
      ];
    });
  };

  const toggleWishlistProduct = (id) => {
    setWishlistProducts((prev) => {
      const exists = prev.some((item) => item.userId === userId && item.id === id);
      if (exists) {
        return prev.filter((item) => !(item.userId === userId && item.id === id));
      }
      return [
        ...prev.filter((item) => !(item.id === id && !item.userId)),
        { userId, id }
      ];
    });
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

  // Add an existing pet to the user's ecosystem
  const addExistingPet = (petData) => {
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

  const createCommunityPost = ({ title, body, communityId }) => {
    const newPost = {
      id: Date.now(),
      authorId: userId || 'guest',
      author: user?.fullName || 'Anonymous',
      communityId,
      title,
      body,
      votes: 0,
      likedBy: [],
      comments: 0,
      savedBy: [],
      date: 'Just now',
      pinned: false,
      commentsList: []
    };
    setCommunityPosts((prev) => [newPost, ...prev]);
  };

  const addCommentToPost = (postId, commentText) => {
    if (!commentText.trim()) return;

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
  };

  const toggleSavePost = (postId) => {
    setCommunityPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const saved = post.savedBy.includes(userId);
        return {
          ...post,
          savedBy: saved ? post.savedBy.filter((id) => id !== userId) : [...post.savedBy, userId]
        };
      })
    );
  };

  const toggleVotePost = (postId, type) => {
    setCommunityPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        if (type === 'up') {
          return { ...post, votes: post.votes + 1, likedBy: [...new Set([...post.likedBy, userId])] };
        }
        return { ...post, votes: Math.max(post.votes - 1, 0) };
      })
    );
  };

  const deleteCommunityPost = (postId) => {
    setCommunityPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const togglePinPost = (postId) => {
    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, pinned: !post.pinned } : post
      )
    );
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
        communityPosts,
        communities,
        setCommunities,
        createCommunityPost,
        addCommentToPost,
        toggleSavePost,
        toggleVotePost,
        deleteCommunityPost,
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
        setIsCartOpen
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
};

export const useEcosystem = () => useContext(EcosystemContext);
