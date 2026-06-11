# Kitchen Buddy

Personal-use LINE Mini App (LIFF): "คืนนี้ทำอะไรดี" — AI cook-tonight suggestions from the household pantry, prioritizing soonest-to-expire ingredients. Owner: Thanapat (solo dev, 6–10 hrs/week). **Goal: personal tool, not a business.** Budget ≈ $0/month at personal scale.

## Stack (decided by /cto board 2026-06-11 — do not relitigate without a new decision record)

- **Frontend:** React + TypeScript + Vite + TailwindCSS, LIFF SDK (`@line/liff`). Must support a mock mode (fake LINE user) when `VITE_LIFF_ID` is unset so local dev needs no LINE account.
- **Backend:** Supabase only — Postgres + RLS + Edge Functions + pg_cron. No separate server.
- **AI:** single LLM call (Claude Haiku-class) per suggestion; pantry-hash cache + nightly precompute. NO RAG, NO embeddings, NO nutrition DB.
- **Notifications:** LINE Messaging API push. ONE digest per user per day, sent only on days something is near expiry. Never per-item pushes. (LINE Notify is discontinued — do not use it.)
- **Auth:** LINE Login via LIFF `id_token` → edge function verifies with LINE, maps line_user_id → stable user uuid, mints a Supabase-compatible JWT so `auth.uid()` and RLS enforce household isolation. Frontend talks to Postgres through supabase-js with that JWT.

## Product design rules

1. Any user action that takes >10 seconds per item gets cut or automated (default expiry from catalog shelf-life, not manual entry).
2. Quantities are coarse: มี / เหลือครึ่ง / หมด. Never grams or precise counts.
3. "ทำแล้ว ✓" on a suggested recipe auto-decrements its ingredients — cooking IS the consumption log. This is the core anti-truth-decay mechanism; protect it.
4. Barcode scanning is CUT (thin Thai SKU coverage). Ingredient entry = curated Thai-staples quick-pick grid (~100 items) + free text.
5. UI language: Thai.

## Data model (7 tables)

`households`, `household_members` (line_user_id, role), `catalog_items` (name_th, category, default_shelf_life_days, is_seed), `pantry_items` (household_id, catalog_item_id|free_text_name, qty coarse, expiry_date, status active|consumed|expired|discarded), `consume_log` (action consumed|discarded — feeds the "used before expiry" stat), `ai_suggestions` (pantry_hash cache), `notification_log` (dedupe + send audit).

RLS: row visible iff requester is a member of the household — use a SECURITY DEFINER helper for the membership check, don't inline the subquery in every policy.

## Directory ownership (parallel agents)

- `supabase/**` → backend territory
- everything else (`src/`, `package.json`, vite config, `index.html`) → frontend territory

## Known risks (from the decision record)

- LINE id_token → Supabase JWT bridge is the highest-bug-density area; test the join-household flow hard.
- LINE OA free message quota must be respected — digest design (one message, only-when-needed) is what keeps cost at ฿0.
