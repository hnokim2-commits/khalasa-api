import crypto from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCK_ID = 170012;
const DEFAULT_INTERVAL_HOURS = 12;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function quoteIdentifier(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function filenameTimestamp() { return new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-'); }

async function migrationSnapshot() {
  const directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  return Promise.all(names.map(async name => ({ name, sql: await readFile(join(directory, name), 'utf8') })));
}

async function collectDatabase(client) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const tableResult = await client.query(`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename`);
    const tables = [];
    for (const { tablename } of tableResult.rows) {
      const columns = await client.query(`SELECT column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [tablename]);
      const rows = await client.query(`SELECT * FROM public.${quoteIdentifier(tablename)}`);
      tables.push({ name: tablename, columns: columns.rows, rows: rows.rows });
    }
    await client.query('COMMIT');
    return { format: 'khalasa-automated-backup', version: 1, createdAt: new Date().toISOString(), database: 'public', migrations: await migrationSnapshot(), tables };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

function encryptBackup(backup, passphrase) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(backup))), cipher.final()]);
  const envelope = Buffer.from(JSON.stringify({ format: 'khalasa-encrypted-backup', version: 1, algorithm: 'aes-256-gcm+scrypt', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') }));
  return { envelope, sha256: crypto.createHash('sha256').update(envelope).digest('hex') };
}

function verifyEncryptedBackup(envelope, passphrase, expected) {
  const parsed = JSON.parse(envelope.toString('utf8'));
  if (parsed.format !== 'khalasa-encrypted-backup' || parsed.algorithm !== 'aes-256-gcm+scrypt') throw new Error('BACKUP_ENVELOPE_INVALID');
  const salt = Buffer.from(parsed.salt, 'base64'), iv = Buffer.from(parsed.iv, 'base64'), tag = Buffer.from(parsed.tag, 'base64'), ciphertext = Buffer.from(parsed.data, 'base64');
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || !ciphertext.length) throw new Error('BACKUP_ENVELOPE_INVALID');
  const key = crypto.scryptSync(passphrase, salt, 32), decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const restored = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'));
  const expectedRows = expected.tables.reduce((sum, table) => sum + table.rows.length, 0);
  const restoredRows = restored.tables?.reduce((sum, table) => sum + (Array.isArray(table.rows) ? table.rows.length : 0), 0);
  if (restored.format !== 'khalasa-automated-backup' || restored.version !== 1 || !Array.isArray(restored.tables) || !Array.isArray(restored.migrations) || restored.tables.length !== expected.tables.length || restoredRows !== expectedRows || restored.createdAt !== expected.createdAt) throw new Error('BACKUP_INTEGRITY_MISMATCH');
  return { tablesCount: restored.tables.length, rowsCount: restoredRows, migrationsCount: restored.migrations.length };
}

async function sendEmail({ to, from, apiKey, subject, html, attachment, filename, idempotencyKey }) {
  const body = { from, to: [to], subject, html };
  if (attachment) body.attachments = [{ filename, content: attachment.toString('base64'), content_type: 'application/octet-stream' }];
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}`, 'idempotency-key': idempotencyKey }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`BACKUP_EMAIL_FAILED_${response.status}`);
}

export function startAutomatedBackups(pool) {
  if (process.env.BACKUP_ENABLED !== 'true') return console.log('Automated backup scheduler is disabled');
  const recipient = String(process.env.BACKUP_EMAIL_TO || '').trim();
  const sender = String(process.env.BACKUP_EMAIL_FROM || process.env.OTP_EMAIL_FROM || '').trim();
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const passphrase = String(process.env.BACKUP_ENCRYPTION_PASSPHRASE || '');
  const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS || DEFAULT_INTERVAL_HOURS);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !sender || !apiKey || passphrase.length < 12 || !Number.isFinite(intervalHours) || intervalHours < 1) {
    console.error('Automated backups are enabled but configuration is incomplete');
    return;
  }

  let running = false;
  const execute = async () => {
    if (running) return;
    running = true;
    const client = await pool.connect();
    let locked = false;
    try {
      locked = (await client.query('SELECT pg_try_advisory_lock($1) locked', [LOCK_ID])).rows[0].locked;
      if (!locked) return;
      const recent = await client.query(`SELECT created_at FROM automated_backup_records WHERE status='sent' ORDER BY created_at DESC LIMIT 1`);
      if (recent.rowCount && Date.now() - new Date(recent.rows[0].created_at).getTime() < intervalHours * 60 * 60 * 1000) return;
      const backup = await collectDatabase(client);
      const { envelope, sha256 } = encryptBackup(backup, passphrase);
      if (envelope.length > MAX_ATTACHMENT_BYTES) throw new Error('BACKUP_ATTACHMENT_TOO_LARGE');
      const verification = verifyEncryptedBackup(envelope, passphrase, backup);
      const filename = `khalasa-${filenameTimestamp()}.kbackup`;
      await sendEmail({ to: recipient, from: sender, apiKey, subject: 'نسخة خالصة الاحتياطية المشفرة', html: `<div dir="rtl"><h2>اكتملت النسخة الاحتياطية</h2><p>تم اختبار سلامة النسخة آليًا قبل الإرسال.</p><p>الملف مشفر ولا يمكن فتحه دون كلمة التشفير.</p><p>الجداول: ${verification.tablesCount} — الصفوف: ${verification.rowsCount} — ملفات الترحيل: ${verification.migrationsCount}</p><p>SHA-256: <code>${sha256}</code></p></div>`, attachment: envelope, filename, idempotencyKey: `khalasa-backup/${filename}` });
      await client.query(`INSERT INTO automated_backup_records(backup_name,tables_count,rows_count,backup_size_bytes,sha256,status,recipient,integrity_verified,integrity_verified_at) VALUES($1,$2,$3,$4,$5,'sent',$6,true,now())`, [filename, verification.tablesCount, verification.rowsCount, envelope.length, sha256, recipient]);
      console.log(`Encrypted backup emailed: ${filename}`);
    } catch (error) {
      console.error('Automated backup failed', error.message);
      await client.query(`INSERT INTO automated_backup_records(status,recipient,error_code) VALUES('failed',$1,$2)`, [recipient, String(error.message).slice(0, 120)]).catch(() => {});
      await sendEmail({ to: recipient, from: sender, apiKey, subject: 'تنبيه: فشل النسخ الاحتياطي لخالصة', html: '<div dir="rtl"><h2>تعذر إنشاء النسخة الاحتياطية الدورية</h2><p>راجع سجلات خدمة API وإعدادات قاعدة البيانات والبريد.</p></div>', idempotencyKey: `khalasa-backup-failure/${new Date().toISOString().slice(0, 13)}` }).catch(() => {});
    } finally {
      if (locked) await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
      client.release();
      running = false;
    }
  };

  setTimeout(execute, 2 * 60 * 1000).unref();
  setInterval(execute, intervalHours * 60 * 60 * 1000).unref();
  console.log(`Automated encrypted backup scheduled every ${intervalHours} hours`);
}
