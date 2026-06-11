-- Kitchen Buddy: ai_suggestions + notification_log
--
-- ai_suggestions caches the "คืนนี้ทำอะไรดี" LLM output keyed by a hash of
-- the household's current pantry state (pantry_hash), so repeated visits on
-- an unchanged pantry don't re-call the LLM (CLAUDE.md: pantry-hash cache +
-- nightly precompute, single Haiku-class call). The AI-suggestion feature
-- itself is implemented in a later leg; this migration only lays down the
-- table + indexes + RLS so that leg has a stable schema to build on.

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_hash text not null,
  suggestions jsonb not null,
  model text,
  generated_at timestamptz not null default now(),
  expires_at timestamptz
);

comment on table public.ai_suggestions is
  'Pantry-hash-keyed cache of "คืนนี้ทำอะไรดี" suggestions. One LLM call per (household, pantry_hash); reused until the pantry changes or expires_at passes.';
comment on column public.ai_suggestions.pantry_hash is
  'Deterministic hash of the household''s active pantry_items (ids + qty_state + expiry buckets). Cache key.';
comment on column public.ai_suggestions.suggestions is
  'Raw LLM output: array of suggested dishes with ingredient/expiry references. Shape defined by the AI-suggestion leg.';

-- Most recent suggestion for a household's current pantry state.
create unique index ai_suggestions_household_pantry_hash_idx
  on public.ai_suggestions (household_id, pantry_hash);

create index ai_suggestions_household_generated_at_idx
  on public.ai_suggestions (household_id, generated_at desc);

alter table public.ai_suggestions enable row level security;

create policy ai_suggestions_select_member
  on public.ai_suggestions for select
  to authenticated
  using (public.is_household_member(household_id));

-- Writes happen via service_role (edge function that calls the LLM), so no
-- insert/update/delete policy for authenticated.

-- ---------------------------------------------------------------------------
-- notification_log
--
-- Audit + dedupe for the daily LINE digest (CLAUDE.md: ONE digest per user
-- per day, only on days something is near expiry; never per-item pushes).
-- ---------------------------------------------------------------------------
create type public.notification_kind as enum ('daily_digest');
create type public.notification_status as enum ('sent', 'failed');

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  kind public.notification_kind not null default 'daily_digest',
  sent_date date not null default current_date,
  status public.notification_status not null default 'sent',
  item_count integer,
  error_message text,
  created_at timestamptz not null default now(),

  -- Dedupe: never two digests to the same user on the same calendar day.
  constraint notification_log_one_per_user_per_day
    unique (user_id, kind, sent_date)
);

comment on table public.notification_log is
  'Audit + dedupe for LINE push notifications. Unique (user_id, kind, sent_date) enforces "one digest per user per day".';

create index notification_log_household_sent_date_idx
  on public.notification_log (household_id, sent_date desc);

alter table public.notification_log enable row level security;

create policy notification_log_select_member
  on public.notification_log for select
  to authenticated
  using (public.is_household_member(household_id));

-- Writes happen via service_role (daily-digest edge function) only.
