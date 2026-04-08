-- Run this in Supabase Dashboard → SQL Editor if you see
-- "column sessions.participant_code does not exist" (or chat_messages).
-- Adds participant_code and chat_messages to existing sessions table.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS participant_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS chat_messages jsonb;

CREATE INDEX IF NOT EXISTS idx_sessions_participant_code
  ON public.sessions(participant_code) WHERE participant_code IS NOT NULL;
