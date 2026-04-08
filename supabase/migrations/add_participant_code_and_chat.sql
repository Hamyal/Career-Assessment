-- Add participant_code and chat_messages for lookup and persistent chat memory
alter table public.sessions
  add column if not exists participant_code text unique,
  add column if not exists chat_messages jsonb;

create index if not exists idx_sessions_participant_code on public.sessions(participant_code) where participant_code is not null;

comment on column public.sessions.participant_code is 'Short code for participant to look up their report later';
comment on column public.sessions.chat_messages is 'Serialized chat messages for persistent memory (array of {role, content})';
