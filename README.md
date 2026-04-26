# Career Assessment — Full-Screen Conversational App

Structured psychometric engine + clean UI + controlled AI narrative + branded PDF.

## Rules

- **Scoring = Deterministic** (no AI). See `src/lib/scoring/`.
- **AI = Language layer only** (narrative from structured JSON).
- **Backend = Brain** (validation, scoring, storage).

## Quick start

```bash
npm install
npm run dev    # Next.js app
npm test       # Scoring engine tests
```
### Run on Windows

- **Double-click:** `run.bat` — installs dependencies and starts the dev server at http://localhost:3000
- **PowerShell:** `.\run.ps1` (dev) or `.\run.ps1 -Production` (build + production server)
- **Or:** `npm install` then `npm run dev`

#### Open on mobile (same Wi‑Fi)

Run the LAN-enabled dev server:

```bash
npm run dev:server
```

Then open `http://<YOUR-PC-IP>:3000` on your phone (get your PC IP with `ipconfig` on Windows).


## Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Schemas

- **UserResponsePayload** — what frontend sends (email, 54 responses, optional file URLs).
- **TraitVector** — decoder / signal / bridge / heartbeat scores.
- **FinalScoringOutput** — primary_type, secondary_type, is_blended, archetype_scores, stress_profile, lowest_domain.

## Supabase setup

1. Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vehfmzyhwzhkxjzchepp.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key from Dashboard → API
   - `SUPABASE_SERVICE_ROLE_KEY` = service role key (server-only)
2. In Supabase Dashboard → SQL Editor, run `supabase/schema.sql` to create `users`, `sessions`, `responses`.

## Question bank

- **54 questions** from Question Bank.docx: `src/questions/question-list.ts` (UI text, multi_select, required) and `src/questions/index.ts` (option → archetype + stress for questions 10–52).
- Only responses for questions **10–52** are used for trait scoring; 1–9 and 53–54 are info/upload.

## Next steps

1. Build conversational UI (one question at a time, progress bar, max 2 multi-select).
2. Add API route `POST /api/submit` (validate → score → store via `lib/db`).
3. Add Supabase Storage for resume/photo uploads.
4. Add AI narrative + PDF template + email.
