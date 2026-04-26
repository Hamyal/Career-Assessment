# Storage buckets (Supabase Dashboard → Storage)

## 1. `reports` (PDF reports)
- Name: **reports**
- **Public bucket**: Yes
- Submit API uploads each report as `reports/{session_id}.pdf`.

## 2. `uploads` (STEP 2.3 — resume & photo)
- Name: **uploads**
- **Public bucket**: Yes
- Paths: `uploads/photo/{uuid}{ext}`, `uploads/resume/{uuid}{ext}`
- Used for resume (Q53) and photo (Q5) file uploads.