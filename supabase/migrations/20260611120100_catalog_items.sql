-- Kitchen Buddy: catalog_items
--
-- A curated list of ~100 Thai pantry staples used to power the quick-pick
-- ingredient grid (CLAUDE.md product rule #4: no barcode scanning). World
-- readable so the picker works for everyone; writes restricted to
-- service_role (seed data + future admin curation).

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name_th text not null,
  name_en text,
  category text not null,
  default_shelf_life_days integer not null check (default_shelf_life_days > 0),
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.catalog_items is
  'Curated Thai staple ingredients for the quick-pick grid. World-readable, write-restricted.';
comment on column public.catalog_items.category is
  'Free-text category label, e.g. เนื้อสัตว์ / ผัก / ของแห้ง / เครื่องปรุง / นม-ไข่ / ของแช่แข็ง.';
comment on column public.catalog_items.default_shelf_life_days is
  'Used to auto-fill expiry_date on pantry_items per product design rule #1 (no manual entry of dates).';
comment on column public.catalog_items.is_seed is
  'true for items shipped via supabase/seed.sql; lets future curation tooling distinguish seed vs user-contributed rows.';

create index catalog_items_category_idx on public.catalog_items(category);

create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: catalog_items — world-readable, write restricted to service_role
-- ---------------------------------------------------------------------------
alter table public.catalog_items enable row level security;

create policy catalog_items_select_all
  on public.catalog_items for select
  to authenticated, anon
  using (true);

-- No insert/update/delete policies for authenticated/anon: only service_role
-- (which bypasses RLS) can write. This keeps the catalog curated.
