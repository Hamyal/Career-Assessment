-- Run in Supabase → SQL Editor to clear the placeholder pdf_url so it shows as "—" in Admin
UPDATE public.sessions
SET pdf_url = NULL
WHERE pdf_url = 'https://example.com/report1.pdf';
