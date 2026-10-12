import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import ServiceProvider from '../models/ServiceProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const DEMO_PRODUCTS = [
  { 
    id: 'f1', category: 'food', name: 'Ultra-Grain Puppy Kibble', brand: 'NutraCore', price: 54.99, rating: 4.8, reviews: 1240, image: '🍗',
    description: 'High-protein formula specifically designed for growing puppies. Contains real chicken and essential DHA.',
    frequentlyBought: ['t1', 'h1']
  },
  { 
    id: 'f2', category: 'food', name: 'Organic Salmon Cat Feast', brand: 'OceanBites', price: 29.50, rating: 4.9, reviews: 850, image: '🐟',
    description: 'Gently steamed wild salmon with organic spinach. No fillers, just pure feline joy.',
    frequentlyBought: ['h2', 'a1']
  },
  { 
    id: 'f3', category: 'food', name: 'Royal Rabbit Pellets', brand: 'BunnyChef', price: 15.99, rating: 4.5, reviews: 110, image: '🥕',
    imageKey: 'carrot.jpg',
    description: 'Timothy hay based pellets enriched with Vitamin C for optimal digestive health.',
    frequentlyBought: ['b1']
  },
  { 
    id: 't1', category: 'toys', name: 'Indestructible Squeak Bone', brand: 'ToughPaws', price: 18.00, rating: 4.7, reviews: 3400, image: '🦴',
    description: 'Military-grade rubber that survives even the most aggressive chewers. Smells like bacon.',
    frequentlyBought: ['f1']
  },
  { 
    id: 't2', category: 'toys', name: 'Interactive Laser Tower', brand: 'SmartPet', price: 39.99, rating: 4.6, reviews: 920, image: '🚨',
    description: 'Automatic laser rotation with 3 speeds. Keeps your cat active while you are away.',
    frequentlyBought: ['f2', 'b2']
  },
  { 
    id: 'g1', category: 'grooming', name: 'Self-Cleaning Slicker Brush', brand: 'GroomMaster', price: 22.95, rating: 4.9, reviews: 1560, image: '🪄',
    description: 'Remove undercoat effortlessly with the push of a button. Gentle on skin, tough on tangles.',
    frequentlyBought: ['f1', 'g2']
  },
  { 
    id: 'h1', category: 'health', name: 'Probiotic Joint Chews', brand: 'VetVibe', price: 34.00, rating: 5.0, reviews: 410, image: '💊',
    description: 'Advanced Glucosamine and Chondroitin complex for senior dogs or active breeds.',
    frequentlyBought: ['f1']
  },
  { 
    id: 'b1', category: 'beds', name: 'Orthopedic Calming Cloud', brand: 'DreamTail', price: 110.00, rating: 4.9, reviews: 2100, image: '🛌',
    imageKey: 'bed.jpg',
    description: 'Memory foam base with raised edges for anxiety relief. Machine-washable cover.',
    frequentlyBought: ['t1']
  },
  { 
    id: 'a1', category: 'accessories', name: 'GPS Smart Collar V2', brand: 'TrackPet', price: 149.00, rating: 4.4, reviews: 300, image: '🛰️',
    description: 'Real-time positioning and health monitoring. 30-day battery life. Waterproof.',
    frequentlyBought: ['f1', 'h1']
  }
];

export const DEMO_SERVICES = {
  veterinary: [
    { id: 'v1', name: 'Dr. Sarah Miller', exp: '12 Years', rating: 4.9, reviews: 156, price: 80, image: '👩‍⚕️', bio: 'Specialist in feline medicine and neural biometric assessment.' },
    { id: 'v2', name: 'Petly Medical Hub', exp: 'Institutional', rating: 4.8, reviews: 1240, price: 65, image: '🏥', bio: 'Full-service veterinary facility with 24/7 autonomous support.' }
  ],
  grooming: [
    { id: 'g1', name: 'Elite Pet Spa', rating: 4.9, reviews: 850, price: 45, image: '🛁', bio: 'Premium styling and hypoallergenic neural bathing.' },
    { id: 'g2', name: 'Marcus Grooming', rating: 4.7, reviews: 310, price: 35, image: '✂️', bio: 'Specialist in show-level coat maintenance.' }
  ],
  walking: [
    { id: 'w1', name: 'Neo-Walkers', rating: 4.6, reviews: 450, price: 20, image: '🦮', bio: 'GPS-tracked high-impact exercise sessions.' }
  ],
  boarding: [
    { id: 'b1', name: 'Cloud 9 Sanctuary', rating: 5.0, reviews: 120, price: 120, image: '🏨', bio: 'Luxury climate-controlled suites with 24/7 monitoring.' }
  ],
  training: [
    { id: 't1', name: 'Command Center', rating: 4.9, reviews: 280, price: 95, image: '🎓', bio: 'Behavioral modification and advanced skill acquisition.' }
  ],
  daycare: [
    { id: 'd1', name: 'The Bark Park', rating: 4.8, reviews: 900, price: 40, image: '🏡', bio: 'Socialization and play in a safe, monitored unit.' }
  ],
  emergency: [
    { id: 'e1', name: 'Rapid Response Vet', rating: 5.0, reviews: 2100, price: 200, image: '🚑', bio: 'Instant dispatch for critical biometric stabilization.' }
  ],
  photography: [
    { id: 'p1', name: 'Petly Lens', rating: 5.0, reviews: 45, price: 150, image: '📸', bio: 'High-end portraiture for the modern pet influencer.' }
  ],
  transportation: [
    { id: 'tr1', name: 'Pet Transit Pro', rating: 4.7, reviews: 140, price: 55, image: '🚐', bio: 'Safe, climate-controlled transport between units.' }
  ]
};

export async function seedStoreAndServices() {
  console.log('[Seed] Starting Store and Services data migration...');

  // 1. Seed Products
  let productsUpdated = 0;
  for (const item of DEMO_PRODUCTS) {
    await Product.findOneAndUpdate(
      { demoId: item.id },
      {
        $set: {
          demoId: item.id,
          name: item.name,
          category: item.category,
          brand: item.brand,
          price: item.price,
          rating: item.rating,
          reviewsCount: item.reviews,
          image: item.image,
          imageKey: item.imageKey || '',
          description: item.description,
          frequentlyBought: item.frequentlyBought
        },
        $setOnInsert: {
          stock: 50
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    productsUpdated++;
  }
  console.log(`[Seed] Successfully processed ${productsUpdated} products.`);

  // 2. Seed Service Providers
  let providersUpdated = 0;
  for (const [category, list] of Object.entries(DEMO_SERVICES)) {
    for (const item of list) {
      await ServiceProvider.findOneAndUpdate(
        { demoId: item.id },
        {
          $set: {
            demoId: item.id,
            name: item.name,
            category: category,
            exp: item.exp || '5+ Years',
            rating: item.rating,
            reviewsCount: item.reviews,
            price: item.price,
            image: item.image,
            bio: item.bio,
            description: item.bio,
            isActive: true,
            availability: [
              { dayOfWeek: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
              { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
              { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
              { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
              { dayOfWeek: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
              { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '15:00', isAvailable: true }
            ]
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      providersUpdated++;
    }
  }
  console.log(`[Seed] Successfully processed ${providersUpdated} service providers.`);

  return { productsUpdated, providersUpdated };
}

// Standalone execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Seed] MONGODB_URI not found in environment');
    process.exit(1);
  }
  mongoose.connect(uri)
    .then(async () => {
      await seedStoreAndServices();
      console.log('[Seed] Migration completed successfully.');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Migration error:', err);
      process.exit(1);
    });
}
