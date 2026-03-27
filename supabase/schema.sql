create extension if not exists "pgcrypto";

create type saved_status as enum ('new', 'processed', 'archived');
create type saved_purpose as enum (
  'read_later',
  'reread',
  'share',
  'sns_seed',
  'networking',
  'idea_bank',
  'learning',
  'other'
);
create type notification_preference as enum ('save_only', 'after_24h', 'weekly', 'monthly');
create type job_status as enum ('queued', 'running', 'completed', 'failed');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  role text not null,
  interest_areas text[] not null default '{}',
  preferred_languages text[] not null default '{"ja","en"}',
  notification_preference notification_preference not null default 'weekly',
  onboarding_step text not null default 'role',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists telegram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  telegram_chat_id text not null,
  telegram_username text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, telegram_chat_id)
);

create table if not exists raw_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  telegram_message_id text not null,
  telegram_chat_id text not null,
  raw_url text not null,
  capture_note text,
  received_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text unique not null,
  domain text not null,
  platform text,
  title text,
  author text,
  published_at timestamptz,
  og_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  language text,
  extracted_markdown text,
  summary text,
  rationale text,
  suggested_purposes saved_purpose[] not null default '{}',
  reread_score integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  raw_link_id uuid references raw_links(id) on delete set null,
  document_id uuid not null references documents(id) on delete cascade,
  status saved_status not null default 'new',
  suggested_purpose saved_purpose not null default 'read_later',
  reread_score integer not null default 0,
  user_memo text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_id)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists saved_item_tags (
  saved_item_id uuid not null references saved_items(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (saved_item_id, tag_id)
);

create table if not exists share_outputs (
  id uuid primary key default gen_random_uuid(),
  saved_item_id uuid not null references saved_items(id) on delete cascade,
  format text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  kind text not null,
  status job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_raw_links_user_received_at on raw_links(user_id, received_at desc);
create index if not exists idx_saved_items_user_created_at on saved_items(user_id, created_at desc);
create index if not exists idx_jobs_status_created_at on jobs(status, created_at desc);
