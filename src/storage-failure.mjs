// Never return provider text: it may contain object paths or credentials.
export function storageFailureCode(status,body){
 const text=[body?.code,body?.error,body?.message].filter(v=>typeof v==='string').join(' ').toLowerCase();
 const kinds=[
  ['INVALID_KEY',/invalid.?api.?key|invalid.?jwt|invalid.?signature|invalid compact jws|jwt.*(?:expired|malformed)|no api key|unauthorized/],
  ['BUCKET_NOT_FOUND',/bucket.*(?:not found|does not exist)/],
  ['ACCESS_DENIED',/row.level security|permission denied|access denied/],
  ['MIME_REJECTED',/mime|content.type.*not.*(?:allow|support)/],
  ['SIZE_REJECTED',/exceed.*size|too large|maximum.*size/],
 ];
 const kind=kinds.find(([,pattern])=>pattern.test(text))?.[0]||'UNCLASSIFIED';
 const safeStatus=Number.isInteger(status)&&status>=400&&status<=599?status:500;
 return `PRIVATE_STORAGE_UPLOAD_FAILED_${safeStatus}_${kind}`;
}
