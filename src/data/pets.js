export const PETS_DATA = [
  // DOGS (20)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `dog-${i}`,
    type: 'dog',
    name: ['Buddy', 'Luna', 'Max', 'Bella', 'Charlie', 'Daisy', 'Cooper', 'Lucy', 'Milo', 'Bailey'][i % 10] + (i > 9 ? ' II' : ''),
    breed: ['Golden Retriever', 'German Shepherd', 'Poodle', 'French Bulldog', 'Beagle', 'Rottweiler', 'Dachshund', 'Yorkshire Terrier', 'Boxer', 'Siberian Husky'][i % 10],
    age: (i % 8) + 1 + ' years',
    gender: i % 2 === 0 ? 'Male' : 'Female',
    location: 'Central Park Shelter, NY',
    shelter: 'The Petly Haven',
    price: 150,
    vaccinated: true,
    medical: 'Up to date on all shots. Healthy heart.',
    personality: 'Friendly, active, and great with kids.',
    story: 'Rescued from a local street. He has transformation from a shy puppy to a confident family dog.',
    image: '🐕'
  })),
  // CATS (20)
  ...Array.from({ length: 20 }).map((_, i) => ({
    id: `cat-${i}`,
    type: 'cat',
    name: ['Oliver', 'Mochi', 'Leo', 'Nala', 'Simba', 'Chloe', 'Tigger', 'Misty', 'Jasper', 'Cleo'][i % 10] + (i > 9 ? ' II' : ''),
    breed: ['Persian', 'Maine Coon', 'Siamese', 'Ragdoll', 'Bengal', 'Sphynx', 'British Shorthair', 'Abyssinian', 'Scottish Fold', 'Birman'][i % 10],
    age: (i % 5) + 1 + ' years',
    gender: i % 2 === 0 ? 'Male' : 'Female',
    location: 'Sunset Meows, CA',
    shelter: 'Kitten Kingdom',
    price: 80,
    vaccinated: true,
    medical: 'Spayed/Neutered. No genetic issues.',
    personality: 'Calm, affectionate, and independent.',
    story: 'Found in a cozy library. She loves books and warm laps.',
    image: '🐈'
  })),
  // BIRDS (10)
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `bird-${i}`,
    type: 'bird',
    name: ['Rio', 'Sky', 'Kiwi', 'Sunny', 'Peaches'][i % 5],
    breed: ['Budgie', 'Cockatiel', 'Lovebird', 'Parrotlet', 'Canary'][i % 5],
    age: '2 years',
    gender: i % 2 === 0 ? 'Male' : 'Female',
    location: 'Cloud Wings, FL',
    shelter: 'Tropical Avian Center',
    vaccinated: true,
    medical: 'Wings clipped, feather health perfect.',
    personality: 'Social, likes to whistle.',
    story: 'Born in our sanctuary. Looking for a high-ceiling home.',
    image: '🦜'
  })),
  // RABBITS (10)
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `rabbit-${i}`,
    type: 'rabbit',
    name: ['Bugs', 'Thumper', 'Bunny', 'Daisy'][i % 4],
    breed: ['Holland Lop', 'Mini Rex', 'Netherland Dwarf', 'Flemish Giant'][i % 4],
    age: '1 year',
    gender: 'Female',
    location: 'Green Meadows, OR',
    shelter: 'Hop Haven',
    price: 40,
    vaccinated: true,
    medical: 'Sensitive digestion, requires fresh hay daily.',
    personality: 'Quiet but curious.',
    story: 'Surrendered due to move. High-energy jumper.',
    image: '🐇'
  })),
  // EXOTIC (5)
  ...Array.from({ length: 5 }).map((_, i) => ({
    id: `exotic-${i}`,
    type: 'exotic',
    name: ['Spike', 'Rex', 'Ziggy', 'Iggy', 'Draco'][i % 5],
    breed: ['Bearded Dragon', 'Leopard Gecko', 'Chameleon', 'Axolotl', 'Sugar Glider'][i % 5],
    age: '3 years',
    gender: 'Unknown',
    location: 'Nature Hub, AZ',
    shelter: 'Exotic Rescue',
    vaccinated: false,
    medical: 'Requires specific heat and humidity levels.',
    personality: 'Unique, observe-only companion.',
    story: 'Rescued from an unqualified owner. Thriving now.',
    image: '🦎'
  }))
];
