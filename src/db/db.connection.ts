import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';  // <-- Import your schema

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:false
  
});
console.log('Database URL:', process.env.DATABASE_URL);

// Event listeners for connection status
pool.on('connect', () => {
  console.log('✅ Database connected successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Pass schema to drizzle so it knows your tables
export const db = drizzle(pool, { schema });