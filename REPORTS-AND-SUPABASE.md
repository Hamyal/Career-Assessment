# Report & Supabase — After Completion

## If you see "Submit failed"

The app **always saves your responses to Supabase** first (user, session, 54 response rows). Then it generates the PDF and uploads it. If something after that fails (PDF, storage, email), you still get a **success** screen with your **participant code** — use it later to look up your report.

Common causes of a **500 "Submit failed"** (before the change above) or of **report not ready**:

1. **Missing Supabase env** — In `.env.local` set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. **Tables missing** — Run the Supabase migrations so `users`, `sessions`, `responses` exist (see `supabase/schema.sql` and `supabase/migrations/`).
3. **Storage bucket "reports" missing** — In Supabase Dashboard → Storage, create a **public** bucket named **`reports`**. PDFs are uploaded there.
4. **"column sessions.participant_code does not exist"** (or chat_messages) — Your `sessions` table was created before these columns were added. In Supabase Dashboard → **SQL Editor**, run the script **`supabase/add-missing-session-columns.sql`** (or run the same SQL: add columns `participant_code text unique` and `chat_messages jsonb` to `public.sessions`), then click **Retry** on the admin page.
5. **Required question empty** — Ensure required questions (name, high school date, email, industry, career paragraph, location) are filled. For high school date, pick an option or type in "Other".

After fixing env/tables/bucket, run the assessment again or use **Retry submission** / **Retry report only** on the error screen.

**Admin shows "Failed to load sessions"?** The admin page now shows the real error from the server (e.g. missing key, table not found). Fix the same items above: add `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, then run `supabase/schema.sql` (and migrations if needed) so `users`, `sessions`, and `responses` exist. Click **Retry** on the admin page after fixing.

---

## What happens after the assessment

1. **User finishes all 54 questions** → The app auto-submits (when valid email is present).
2. **Backend (`/api/submit`)**:
   - Validates the payload (email, 54 responses, required answers).
   - Runs the scoring engine (archetype + stress).
   - **Stores in Supabase:**
     - **`users`** — get or create user by email.
     - **`sessions`** — one row per submission: `user_id`, `email`, `trait_vector`, `final_score`, `pdf_url`, `participant_code`, `chat_messages`.
     - **`responses`** — one row per question (54 rows per session): `session_id`, `question_id`, `selected_options`, `custom_text`.
   - Generates the **PowerPrint™ PDF** report.
   - Uploads the PDF to storage (Supabase Storage or configured provider).
   - Updates the session with `pdf_url`.
   - Sends thank-you email (if Resend is configured) with report link.
3. **Frontend** shows the **completion screen**:
   - “Mission accomplished” + participant code.
   - **“Your report is ready”** + **Download your PowerPrint™ report (PDF)** link.
   - Participant code hint: “Save this code to look up your report later (stored securely).”

So the **report is shown** (download link) and **all data is stored in Supabase** (sessions, responses, users, PDF in storage).

---

## Lookup report later

- **By participant code:** `GET /api/lookup?code=XXXXXX` returns `pdf_url`, masked email, chat_messages, etc.
- The **Lookup** UI (e.g. home or `/lookup`) lets users enter their code to fetch the report link again.

---

## How to test (full flow)

1. **Env (Supabase + optional email)**  
   Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `RESEND_API_KEY`, `EMAIL_FROM` for thank-you email.

2. **Supabase**  
   - Create project and run migrations (see project docs) so `users`, `sessions`, `responses` (and storage bucket if used) exist.

3. **Run the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3006 (or the port shown). Go to **/assessment**.

4. **Complete the assessment**  
   Answer all questions (use Skip for optional photo/LinkedIn if you want). At the end you should see:
   - Completion message and participant code.
   - **“Your report is ready”** and **Download your PowerPrint™ report (PDF)**.

5. **Check Supabase**  
   - **Table Editor:** `sessions` (new row with `participant_code`, `pdf_url`, `trait_vector`, `final_score`, `chat_messages`), `responses` (54 rows for that session), `users` (user by email).
   - **Storage:** PDF file for that session (if storage is configured).

6. **Lookup**  
   Call `GET /api/lookup?code=YOUR_CODE` or use the lookup page; you should get `pdf_url` and report details.

---

## Tests

```bash
npm test
```

- **Submit validation:** payload shape, 54 responses, required text (Q1,2,4,6,7,9), option limits.
- **Scoring engine:** trait and stress scoring.
- **Public APIs / auth / question integrity:** as defined in the test suite.

All passing = validation, scoring, and core logic are good; Supabase and PDF generation require real env and DB.

---

## Build

```bash
npm run build
```

Use this to confirm the app (including report + Supabase flow) compiles and is ready to run or deploy.
