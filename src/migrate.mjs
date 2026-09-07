import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
try {
  const directory = new URL('../migrations/', import.meta.url);
  const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    await pool.query(await readFile(new URL(migration, directory), 'utf8'));
    console.log(`Migration completed: ${migration}`);
  }
}
finally { await pool.end(); }
