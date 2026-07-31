import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
try { await pool.query(await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8')); console.log('Migration completed.'); }
finally { await pool.end(); }
