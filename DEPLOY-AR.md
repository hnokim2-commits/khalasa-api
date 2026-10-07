# V243 — النسخ الاحتياطي التلقائي المشفر

ارفع الملفات الثلاثة إلى مساراتها نفسها في مستودع API:

- `src/server.mjs`
- `src/automated-backup.mjs`
- `migrations/0066_automated_backup_records.sql`

يعتمد التشغيل على متغيرات Render الحالية:

- `BACKUP_ENABLED=true`
- `BACKUP_INTERVAL_HOURS=24`
- `BACKUP_EMAIL_TO`
- `BACKUP_ENCRYPTION_PASSPHRASE`
- `RESEND_API_KEY`
- `BACKUP_EMAIL_FROM` أو `OTP_EMAIL_FROM`

يبدأ أول فحص بعد دقيقتين من تشغيل الخدمة. تُشفّر النسخة بـ AES-256-GCM، ثم تُفك وتُفحص آليًا قبل إرسالها كمرفق إلى البريد المحدد. يسجل النظام النجاح أو الفشل في قاعدة البيانات ويعرض أحدث نسخة تلقائية أو يدوية في لوحة المراقبة.

لا ترفع ملفات `.kbackup` أو كلمات التشفير إلى GitHub.
