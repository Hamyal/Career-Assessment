-- Career Assessment — tables for Supabase
-- Run in SQL Editor in Supabase Dashboard, or via Supabase CLI.

-- Users (simple; can later link to Supabase Auth)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Sessions (one per completed assessment)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  trait_vector jsonb not null default '{}',
  final_score jsonb not null default '{}',
  pdf_url text,
  participant_code text unique,
  chat_messages jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_created_at on public.sessions(created_at desc);
create index if not exists idx_sessions_email on public.sessions(email);
create index if not exists idx_sessions_participant_code on public.sessions(participant_code) where participant_code is not null;

-- Responses (one row per question per session)
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_id int not null,
  selected_options text[] not null default '{}',
  custom_text text,
  created_at timestamptz not null default now(),
  unique(session_id, question_id)
);

create index if not exists idx_responses_session_id on public.responses(session_id);

-- RLS: only server (service_role) can access; anon has no policies so no access
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.responses enable row level security;

-- No policies for anon = anon cannot read/write. Service role bypasses RLS and has full access.
