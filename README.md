# MassCom (Supabase Migration)

This app now uses Supabase for:
- authentication (email/password + Google OAuth)
- templates and media storage (image/video/pdf)
- recipients
- campaign queue
- logs and retry tracking
- admin controls for user activation, limits, and WhatsApp instance assignment
- API key registry for Evolution API access

WhatsApp instance operations run through Evolution API.

## Setup

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` (required for admin management screens)
   - optional fallback vars: `VITE_EVOLUTION_BASE_URL`, `VITE_EVOLUTION_API_KEY`
3. In Supabase SQL Editor, run:
   - `supabase/schema.sql`
4. In Supabase Auth settings:
   - enable Email provider
   - enable Google provider
   - set redirect URL to your app URL (e.g. `http://localhost:3000`)
5. Run app:
   `npm run dev`
