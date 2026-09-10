import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
const client = await pool.connect();
try {
  const directory = new URL('../migrations/', import.meta.url);
  const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  await client.query('SELECT pg_advisory_lock($1)', [734251]);
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  for (const migration of migrations) {
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [migration]);
    if (applied.rowCount) continue;
    await client.query('BEGIN');
    try {
      await client.query(await readFile(new URL(migration, directory), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [migration]);
      await client.query('COMMIT');
      console.log(`Migration completed: ${migration}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
}
finally {
  await client.query('SELECT pg_advisory_unlock($1)', [734251]).catch(() => {});
  client.release();
  await pool.end();
}
