import 'dotenv/config';
import crypto from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.KHALASA_BACKUP_DATABASE_URL;
const passphrase = process.env.KHALASA_BACKUP_PASSPHRASE;
if (!databaseUrl) throw new Error('KHALASA_BACKUP_DATABASE_URL is required');
if (!passphrase || passphrase.length < 12) throw new Error('Backup passphrase must contain at least 12 characters');

const projectRoot = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1))), '..');
const outputDirectory = resolve(projectRoot, '..', 'manual-backups');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: process.env.KHALASA_BACKUP_DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
  max: 1
});

function quoteIdentifier(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function timestamp() { return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-'); }

async function migrationSnapshot() {
  const directory = join(projectRoot, 'migrations');
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  return Promise.all(names.map(async name => ({ name, sql: await readFile(join(directory, name), 'utf8') })));
}

async function createBackup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tableResult = await client.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    const tables = [];
    for (const { tablename } of tableResult.rows) {
      const columns = await client.query(`
        SELECT column_name,data_type,udt_name,is_nullable,column_default
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position
      `, [tablename]);
      const rows = await client.query(`SELECT * FROM public.${quoteIdentifier(tablename)}`);
      tables.push({ name: tablename, columns: columns.rows, rows: rows.rows });
      process.stdout.write(`Backed up ${tablename}: ${rows.rowCount} rows\n`);
    }
    await client.query('COMMIT');
    return {
      format: 'khalasa-manual-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      database: 'public',
      migrations: await migrationSnapshot(),
      tables
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const backup = await createBackup();
const plaintext = Buffer.from(JSON.stringify(backup));
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.scryptSync(passphrase, salt, 32);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const envelope = {
  format: 'khalasa-encrypted-backup',
  version: 1,
  algorithm: 'aes-256-gcm+scrypt',
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  tag: cipher.getAuthTag().toString('base64'),
  data: ciphertext.toString('base64')
};
await mkdir(outputDirectory, { recursive: true });
const output = join(outputDirectory, `khalasa-${timestamp()}.kbackup`);
await writeFile(output, JSON.stringify(envelope), { flag: 'wx' });
process.stdout.write(`Encrypted backup created: ${basename(output)}\n`);
process.stdout.write(`Tables: ${backup.tables.length}; rows: ${backup.tables.reduce((sum, table) => sum + table.rows.length, 0)}\n`);
await pool.end();

