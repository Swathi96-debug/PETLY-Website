import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pet from './models/Pet.js';
import HealthRecord from './models/HealthRecord.js';

dotenv.config();

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);

  const pets = await Pet.find({});
  console.log('=== PETS IN DB ===');
  for (const p of pets) {
    console.log({
      id: p._id.toString(),
      name: p.name,
      owner: p.owner?.toString(),
      weight: p.weight,
      createdAt: p.createdAt
    });
  }

  const records = await HealthRecord.find({});
  console.log(`\n=== ALL HEALTH RECORDS IN DB (${records.length}) ===`);
  for (const r of records) {
    console.log({
      id: r._id.toString(),
      pet: r.pet?.toString(),
      type: r.type,
      title: r.title,
      value: r.value,
      date: r.date,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt
    });
  }

  await mongoose.disconnect();
}

audit().catch(console.error);
