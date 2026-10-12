import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Swathi/.gemini/antigravity/scratch/server/.env' });
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const prods = await db.collection('products').find({ imageKey: { $ne: '' } }).toArray();
console.log('Products with imageKeys:');
prods.forEach(p => console.log(' ', p.name, '|', p.imageKey));
// Also check serviceproviders
const providers = await db.collection('serviceproviders').find({ imageKey: { $ne: '' } }).toArray();
console.log('Providers with imageKeys:', providers.length);
// Check users for any uploaded items with product keys
const users = await db.collection('users').find({}).project({ fullName: 1, email: 1, _id: 1 }).limit(5).toArray();
console.log('Users:', users.map(u => u.fullName + ' ' + u._id));
await mongoose.disconnect();
