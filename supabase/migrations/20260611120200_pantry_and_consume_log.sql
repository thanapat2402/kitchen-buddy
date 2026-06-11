-- Kitchen Buddy: pantry_items + consume_log
--
-- pantry_items.qty_state is intentionally coarse (product design rule #2:
-- never grams or precise counts). expiry_date is normally derived from
-- catalog_items.default_shelf_life_days at insert time by the client/edge
-- function, but stored on the row so it survives catalog edits and supports
-- free-text items.

create type public.pantry_qty_state as enum ('full', 'half', 'out');
create type public.pantry_item_status as enum ('active', 'consumed', 'expired', 'discarded');
create type public.consume_action as enum ('consumed', 'discarded');

-- ---------------------------------------------------------------------------
-- pantry_items
-- ---------------------------------------------------------------------------
create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete restrict,
  free_text_name text,
  qty_state public.pantry_qty_state not null default 'full',
  note text,
  expiry_date date,
  status public.pantry_item_status not null default 'active',
  added_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exactly one of catalog_item_id / free_text_name must be set.
  constraint pantry_items_item_ref_xor check (
    (catalog_item_id is not null and free_text_name is null)
    or (catalog_item_id is null and free_text_name is not null)
  ),
  constraint pantry_items_free_text_not_blank check (
    free_text_name is null or btrim(free_text_name) <> ''
  )
);

comment on table public.pantry_items is
  'Household inventory. Quantities are coarse (full/half/out) per product design rule #2.';
comment on column public.pantry_items.qty_state is
  'Coarse quantity: full = มี, half = เหลือครึ่ง, out = หมด. Never grams/precise counts.';
comment on column public.pantry_items.note is
  'Optional free-text detail (e.g. "ซองเปิดแล้ว"), since qty_state alone is intentionally coarse.';
comment on column public.pantry_items.status is
  'active = in pantry; consumed/discarded/expired set via the cook-tonight or pantry UI, always paired with a consume_log row (see trigger pantry_items_log_status_change).';

create index pantry_items_household_status_expiry_idx
  on public.pantry_items (household_id, status, expiry_date);

create index pantry_items_catalog_item_id_idx
  on public.pantry_items (catalog_item_id)
  where catalog_item_id is not null;

create trigger pantry_items_set_updated_at
  before update on public.pantry_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- consume_log
--
-- Records consumed/discarded transitions. This feeds the "used before
-- expiry" stat: a row where logged_at::date <= pantry_items.expiry_date (at
-- the time of logging) counts as "used in time".
-- ---------------------------------------------------------------------------
create table public.consume_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_item_id uuid not null references public.pantry_items(id) on delete cascade,
  action public.consume_action not null,
  -- Snapshot of expiry_date at the time of logging, so the "used before
  -- expiry" stat remains correct even if pantry_items is later edited/purged.
  expiry_date_snapshot date,
  logged_by uuid references public.app_users(id) on delete set null,
  logged_at timestamptz not null default now()
);

comment on table public.consume_log is
  'Audit trail of consumed/discarded pantry items. Feeds the "used before expiry" stat. Rows are written automatically by the pantry_items_log_status_change trigger.';

create index consume_log_household_logged_at_idx
  on public.consume_log (household_id, logged_at desc);

create index consume_log_pantry_item_id_idx
  on public.consume_log (pantry_item_id);

-- ---------------------------------------------------------------------------
-- Trigger: pantry_items status -> consume_log
--
-- Convention: any status flip from 'active' to 'consumed' or 'discarded'
-- (the only flips a normal user action should ever cause) automatically
-- writes a consume_log row. This is enforced here (not just documented)
-- because consume_log is the data source for the "used before expiry" stat
-- and for auto-decrementing on "ทำแล้ว ✓" — it must never be skippable by a
-- client that forgets to call a separate endpoint.
--
-- 'expired' transitions (set by a future scheduled job, not a user action)
-- intentionally do NOT write a consume_log row: "expired" is not a consume
-- action, it's an absence of one.
-- ---------------------------------------------------------------------------
create or replace function public.log_pantry_item_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status = 'active' and new.status in ('consumed', 'discarded') then
    insert into public.consume_log (
      household_id, pantry_item_id, action, expiry_date_snapshot, logged_by
    ) values (
      new.household_id,
      new.id,
      new.status::text::public.consume_action,
      new.expiry_date,
      coalesce(auth.uid(), new.added_by)
    );
  end if;

  return new;
end;
$$;

comment on function public.log_pantry_item_status_change() is
  'Writes a consume_log row whenever a pantry_item transitions active -> consumed|discarded. SECURITY DEFINER so the insert succeeds under RLS regardless of caller.';

create trigger pantry_items_log_status_change
  after update of status on public.pantry_items
  for each row execute function public.log_pantry_item_status_change();

-- ---------------------------------------------------------------------------
-- RLS: pantry_items
-- ---------------------------------------------------------------------------
alter table public.pantry_items enable row level security;

create policy pantry_items_select_member
  on public.pantry_items for select
  to authenticated
  using (public.is_household_member(household_id));

create policy pantry_items_insert_member
  on public.pantry_items for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy pantry_items_update_member
  on public.pantry_items for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy pantry_items_delete_member
  on public.pantry_items for delete
  to authenticated
  using (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- RLS: consume_log
--
-- Read-only for members (it's an audit trail written by the trigger above).
-- No insert/update/delete policies for authenticated: rows are created only
-- via the SECURITY DEFINER trigger function.
-- ---------------------------------------------------------------------------
alter table public.consume_log enable row level security;

create policy consume_log_select_member
  on public.consume_log for select
  to authenticated
  using (public.is_household_member(household_id));
