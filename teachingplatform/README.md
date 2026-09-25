# Lesson Portal

A single-teacher lesson platform built with React, Vite, Tailwind CSS, Supabase, and Bunny Stream. Students redeem a one-time code, which is bound to a device fingerprint. The production session token lives only in an `httpOnly` cookie.

## Local preview

```bash
npm install
npm run dev
```

Without `VITE_API_BASE_URL`, the UI runs in demo mode (student code `LESSON26`, teacher password `teacher`).

## Bunny Stream setup

1. In Bunny.net, create a **Stream Video Library** and note its Library ID and library API key.
2. In that library's security settings, enable **Token Authentication**. Copy its token security key as `BUNNY_STREAM_SIGNING_KEY`. Keep it private.
3. Set allowed referrers to your deployed frontend hostname (and localhost during development). Copy the exact CDN hostname shown on the library API screen into `BUNNY_STREAM_CDN_HOST` (hostname only, without `https://`).
4. Upload videos from `/admin`. Bunny assigns each video a GUID; the app stores that GUID in the existing `lessons.video_id` column. Allow Bunny time to encode each new upload before playback.

The app signs HLS playlist URLs server-side for 12 minutes. The browser receives only that short-lived signed URL and loads it through hls.js (or native HLS where available). A visible student name, redemption code, and local timestamp are overlaid and repositioned every 30 seconds. This is a deterrent, not DRM; screen recording remains possible.

## Supabase setup

Install the Supabase CLI, authenticate, and link the project. Then run:

```bash
supabase db push
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
supabase secrets set BUNNY_STREAM_LIBRARY_ID=YOUR_LIBRARY_ID
supabase secrets set BUNNY_STREAM_CDN_HOST=YOUR_CDN_HOST
supabase secrets set BUNNY_STREAM_API_KEY=YOUR_LIBRARY_API_KEY
supabase secrets set BUNNY_STREAM_SIGNING_KEY=YOUR_TOKEN_SECURITY_KEY
supabase secrets set ADMIN_PASSWORD=YOUR_LONG_ADMIN_PASSWORD
supabase secrets set ALLOWED_ORIGIN=https://YOUR_FRONTEND_DOMAIN
supabase functions deploy api --no-verify-jwt
```

Copy `.env.example` to `.env.local` and set only `VITE_API_BASE_URL` for the frontend. Bunny and Supabase service secrets belong only in Supabase Function secrets, never Vite variables. Do not put real keys in `.env.example`.

## Security model

- Database schema, RLS, code redemption, device lock, PDFs, questions, and progress are unchanged.
- The Edge Function validates the hashed session token and device fingerprint before creating playback URLs.
- Bunny token authentication uses a 12-minute expiry. HLS requests use the signed playlist URL; token authentication must be enabled in the Bunny library.
- PDFs remain in the private `lesson-pdfs` bucket and use five-minute signed URLs.
- Right-click, selection, printing, common devtools shortcuts, and visible developer-tools playback remain browser deterrents. Bunny Stream does not prevent screen recording.

## Test end to end

1. Deploy the API with the Bunny secrets above and set `VITE_API_BASE_URL` in `.env.local`.
2. Sign into `/admin`, create a lesson, select a small MP4 plus its PDF, and submit. The admin request creates a Bunny video then uploads its file; the returned GUID is saved with the lesson.
3. Wait for Bunny encoding to finish, generate/redeem a student code, and open that lesson.
4. Press Play. Confirm HLS playback starts and the visible name/code/time watermark shifts after 30 seconds. Refresh playback to check that a new short-lived URL is issued.

## Upload size note

Admin uploads are proxied through the Supabase Edge Function so the Bunny API key never reaches the browser. Supabase Edge Functions impose request-size and execution limits, so the existing 5 GB browser selection limit is not a guarantee that a 5 GB proxied upload will complete. For large production lessons, use a dedicated resumable upload service or Bunny-compatible TUS flow that issues narrowly scoped upload authorization without exposing the library API key. Small test uploads should work through the current Edge Function path.

## Project structure

```text
src/                       React student and teacher routes
supabase/migrations/        Existing schema and policies
supabase/functions/api/    Session, lesson, progress, admin, PDF, Bunny video API
supabase/functions/_shared/ Cookie, CORS, hashing, auth helpers
```

Before launch, upload lesson videos and PDFs, generate the first code batch in `/admin`, and rotate any staging secrets.
