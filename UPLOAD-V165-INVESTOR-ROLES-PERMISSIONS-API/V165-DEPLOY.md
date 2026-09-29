# V165 deployment order

1. Upload this API folder to GitHub and deploy it on Render.
2. Confirm the Render deployment succeeds.
3. Upload the matching web folder to Cloudflare.

No database migration is required for V165 because investor permissions are stored in the existing JSONB permissions field.
