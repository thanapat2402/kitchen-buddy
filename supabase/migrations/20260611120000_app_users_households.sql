-- Kitchen Buddy: core identity + household tables
--
-- app_users is the auth root: it maps a stable LINE user id to the uuid that
-- becomes auth.uid() inside the Supabase JWT minted by the line-auth edge
-- function. Every other table that needs to know "who" ultimately points
-- back to app_users.id (directly or via household_members).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- app_users
-- ---------------------------------------------------------------------------
create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  display_name text,
  picture_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_users is
  'Auth root. Maps a LINE user id to the stable uuid used as auth.uid() / JWT sub.';

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'บ้านของฉัน',
  created_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------------------
create type public.household_role as enum ('owner', 'member');

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  role public.household_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_id_idx on public.household_members(user_id);
create index household_members_household_id_idx on public.household_members(household_id);

-- ---------------------------------------------------------------------------
-- updated_at helper trigger (reused by later migrations too)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_users_set_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helper: is the current JWT subject a member of household?
--
-- SECURITY DEFINER + a pinned search_path is required so this function can
-- read household_members regardless of the calling role's RLS, while not
-- being hijackable via a malicious search_path (CVE-style search_path
-- attacks on SECURITY DEFINER functions).
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
  );
$$;

comment on function public.is_household_member(uuid) is
  'RLS helper: true iff auth.uid() is a member of the given household. SECURITY DEFINER with pinned search_path.';

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: app_users
-- A user may see/update only their own row. Inserts happen via service_role
-- in the line-auth edge function (auto-provisioning), so no insert policy
-- for authenticated.
-- ---------------------------------------------------------------------------
alter table public.app_users enable row level security;

create policy app_users_select_self
  on public.app_users for select
  to authenticated
  using (id = auth.uid());

create policy app_users_update_self
  on public.app_users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: households
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;

create policy households_select_member
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

create policy households_update_member
  on public.households for update
  to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- Household creation happens via the line-auth edge function (service_role)
-- during auto-provisioning. No insert/delete policy for authenticated for
-- now; revisit when an "invite/create another household" flow ships.

-- ---------------------------------------------------------------------------
-- RLS: household_members
-- ---------------------------------------------------------------------------
alter table public.household_members enable row level security;

create policy household_members_select_member
  on public.household_members for select
  to authenticated
  using (public.is_household_member(household_id));

-- Membership changes (invite/join/leave) are out of scope for this MVP and
-- are performed via service_role (edge functions) when implemented.
