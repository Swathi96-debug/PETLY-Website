export const PRODUCTS_DATA = [
  // FOOD
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
    description: 'Timothy hay based pellets enriched with Vitamin C for optimal digestive health.',
    frequentlyBought: ['b1']
  },
  
  // TOYS
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

  // GROOMING
  { 
    id: 'g1', category: 'grooming', name: 'Self-Cleaning Slicker Brush', brand: 'GroomMaster', price: 22.95, rating: 4.9, reviews: 1560, image: '🪄',
    description: 'Remove undercoat effortlessly with the push of a button. Gentle on skin, tough on tangles.',
    frequentlyBought: ['f1', 'g2']
  },

  // HEALTH
  { 
    id: 'h1', category: 'health', name: 'Probiotic Joint Chews', brand: 'VetVibe', price: 34.00, rating: 5.0, reviews: 410, image: '💊',
    description: 'Advanced Glucosamine and Chondroitin complex for senior dogs or active breeds.',
    frequentlyBought: ['f1']
  },

  // BEDS
  { 
    id: 'b1', category: 'beds', name: 'Orthopedic Calming Cloud', brand: 'DreamTail', price: 110.00, rating: 4.9, reviews: 2100, image: '🛌',
    description: 'Memory foam base with raised edges for anxiety relief. Machine-washable cover.',
    frequentlyBought: ['t1']
  },

  // ACCESSORIES
  { 
    id: 'a1', category: 'accessories', name: 'GPS Smart Collar V2', brand: 'TrackPet', price: 149.00, rating: 4.4, reviews: 300, image: '🛰️',
    description: 'Real-time positioning and health monitoring. 30-day battery life. Waterproof.',
    frequentlyBought: ['f1', 'h1']
  }
];
