-- Run this in Supabase → SQL Editor so the app can read sessions (e.g. with anon key).
-- This allows SELECT on sessions and users for any key. For production, use the service_role key instead and do not add this policy.

create policy "Allow read sessions for API"
  on public.sessions for select
  using (true);

create policy "Allow read users for API"
  on public.users for select
  using (true);
