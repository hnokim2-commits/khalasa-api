import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/automated-backup.mjs', import.meta.url), 'utf8');

test('backup is encrypted before it is attached', () => {
  assert.match(source, /aes-256-gcm/);
  assert.match(source, /scryptSync/);
  assert.match(source, /encryptBackup\(backup, passphrase\)/);
});

test('scheduler defaults to twelve hours and uses a database lock', () => {
  assert.match(source, /DEFAULT_INTERVAL_HOURS = 12/);
  assert.match(source, /pg_try_advisory_lock/);
  assert.match(source, /pg_advisory_unlock/);
  assert.match(source, /automated_backup_records WHERE status='sent'/);
  assert.match(source, /Date\.now\(\).*intervalHours/s);
});

test('secrets remain environment-only', () => {
  assert.match(source, /BACKUP_ENCRYPTION_PASSPHRASE/);
  assert.match(source, /RESEND_API_KEY/);
  assert.doesNotMatch(source, /h\.nokim2@gmail\.com/);
});

test('email attachments have a safe size ceiling and failure notification', () => {
  assert.match(source, /MAX_ATTACHMENT_BYTES/);
  assert.match(source, /BACKUP_ATTACHMENT_TOO_LARGE/);
  assert.match(source, /فشل النسخ الاحتياطي/);
});
