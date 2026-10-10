# Deeb Center website

The public React site is the Deeb Center download landing page. Student and teacher platform screens are bundled into the Flutter desktop and mobile apps under `D:\Teachingplatform\Teachingplatform_flutter\platform_ui`; changing this landing page does not change those app screens.

## Local preview

```bash
npm ci
npm run dev
```

## Downloads

Windows preview installer: public/downloads/DeebCenter-Setup-2.0.2-x64.exe (version 2.0.2, 28 MB).

The Android preview is served from `public/downloads/DeebCenter-Android-2.0.2-preview.apk`. The Android preview card links to the current version (2.0.2) and shows its size.

## API routing for the apps

The Flutter apps use a loopback server for their bundled UI and forward same-origin `/api` requests through the existing Vercel API route. Keep the `/api/(.*)` rewrite in `vercel.json`; it forwards requests to the existing Supabase Edge Function. The catch-all rewrite serves the public landing page for website paths, so old platform paths no longer render the student or teacher UI.

## Supabase API deployment

Install the Supabase CLI, authenticate, and link the existing project. Then run:

```bash
supabase db push
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set BUNNY_STREAM_LIBRARY_ID=YOUR_LIBRARY_ID
supabase secrets set BUNNY_STREAM_CDN_HOST=YOUR_CDN_HOST
supabase secrets set BUNNY_STREAM_API_KEY=YOUR_LIBRARY_API_KEY
supabase secrets set BUNNY_STREAM_SIGNING_KEY=YOUR_TOKEN_SECURITY_KEY
supabase secrets set FORENSIC_WATERMARK_SECRET=YOUR_RANDOM_WATERMARK_SECRET
supabase secrets set ADMIN_PASSWORD=YOUR_LONG_ADMIN_PASSWORD
supabase secrets set ALLOWED_ORIGIN=https://teaching-platform-one.vercel.app
supabase functions deploy api --no-verify-jwt
```

Keep Supabase service-role and Bunny secrets in Supabase Function secrets only. Never put them in Vite variables, `public/`, or the Flutter app.

## Backend notes

- Student code redemption and device binding, teacher operations, course and lesson data, progress, PDFs, and Bunny Stream playback remain in the existing Supabase Edge Function and database.
- The API validates the hashed session token and device fingerprint before allowing protected operations or issuing media URLs.
- Bunny playback URLs expire after 12 minutes; private PDF links expire after five minutes.
- The app uses native platform capture protection where supported. These controls depend on the operating system and capture method and cannot prevent external cameras or every recording tool.

## Project structure

```text
src/                       Public React download landing page
public/downloads/           User-facing desktop installer download
supabase/migrations/        Existing database schema and policies
supabase/functions/api/    Existing student and teacher API
supabase/functions/_shared/ Cookie, CORS, hashing, and auth helpers
```
