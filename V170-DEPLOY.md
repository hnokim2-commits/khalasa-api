# نشر V170

ارفع محتويات هذا المجلد فوق مستودع API ثم أضف متغيرات Render التالية دون إرسال قيمها في المحادثة:

```text
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=12
BACKUP_EMAIL_TO=h.nokim2@gmail.com
BACKUP_EMAIL_FROM=Khalasa <backup@your-verified-domain.example>
BACKUP_ENCRYPTION_PASSPHRASE=(كلمة قوية لا تقل عن 12 حرفًا)
```

يستخدم النظام `RESEND_API_KEY` الموجود بالفعل. يمكن حذف `BACKUP_EMAIL_FROM` إذا كان `OTP_EMAIL_FROM` عنوان إرسال موثقًا ومناسبًا.

احتفظ بكلمة التشفير في مدير كلمات مرور منفصل؛ لا تُرسلها بالبريد ولا تضعها في GitHub.
