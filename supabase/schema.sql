create extension if not exists pgcrypto;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  email text default '',
  notes text default '',
  status text not null default 'active',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists coach_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  title text,
  mode text not null default 'analysis',
  status text not null default 'draft',
  visit_number integer not null default 1,
  transcript_text text not null default '',
  transcript_json jsonb not null default '[]'::jsonb,
  analysis_json jsonb not null default '{}'::jsonb,
  report_id uuid,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audio_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coach_sessions(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  file_path text not null,
  source text not null default 'recorded',
  transcript_text text default '',
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references coach_sessions(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  overall_score integer not null,
  grade text not null,
  master_copy_version text,
  master_copy_hash text,
  report_json jsonb not null,
  report_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coach_sessions_customer_id on coach_sessions(customer_id, created_at desc);
create index if not exists idx_audio_assets_session_id on audio_assets(session_id, created_at asc);
create index if not exists idx_reports_customer_id on reports(customer_id, created_at desc);

comment on table coach_sessions is 'My Coach visit sessions. report_id is populated after analysis completes.';
comment on table audio_assets is 'Audio file metadata. file_path stores the Supabase Storage object path.';
comment on table reports is 'Final Groq coaching report per completed session.';

insert into storage.buckets (id, name, public)
values ('my-coach-audio', 'my-coach-audio', false)
on conflict (id) do nothing;

-- Backend uploads should use a server-side secret key.
-- Prefer SUPABASE_SECRET_KEY. Legacy SUPABASE_SERVICE_ROLE_KEY is supported as a fallback.
