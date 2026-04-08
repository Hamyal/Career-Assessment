-- Run this in Supabase → SQL Editor to add a test user and 3 sample sessions.
-- Then reload your Admin page.

-- 1. Insert a test user and get their id
INSERT INTO public.users (email)
VALUES ('test@example.com')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert sessions using that user's id
INSERT INTO public.sessions (user_id, email, trait_vector, final_score, pdf_url)
SELECT u.id, 'test@example.com', '{"decoder":10,"signal":14,"bridge":8,"heartbeat":6}'::jsonb,
  '{"primary_type":"signal","secondary_type":"decoder","is_blended":false,"archetype_scores":{"decoder":10,"signal":14,"bridge":8,"heartbeat":6},"stress_profile":{},"lowest_domain":"heartbeat"}'::jsonb,
  NULL
FROM public.users u WHERE u.email = 'test@example.com';

INSERT INTO public.sessions (user_id, email, trait_vector, final_score, pdf_url)
SELECT u.id, 'sample@test.com', '{"decoder":12,"signal":10,"bridge":16,"heartbeat":4}'::jsonb,
  '{"primary_type":"bridge","secondary_type":"decoder","is_blended":true,"archetype_scores":{"decoder":12,"signal":10,"bridge":16,"heartbeat":4},"stress_profile":{"flight":2},"lowest_domain":"heartbeat"}'::jsonb,
  NULL
FROM public.users u WHERE u.email = 'test@example.com';

INSERT INTO public.sessions (user_id, email, trait_vector, final_score, pdf_url)
SELECT u.id, 'another@example.com', '{"decoder":8,"signal":18,"bridge":6,"heartbeat":10}'::jsonb,
  '{"primary_type":"signal","secondary_type":"heartbeat","is_blended":false,"archetype_scores":{"decoder":8,"signal":18,"bridge":6,"heartbeat":10},"stress_profile":{},"lowest_domain":"bridge"}'::jsonb,
  NULL
FROM public.users u WHERE u.email = 'test@example.com';
