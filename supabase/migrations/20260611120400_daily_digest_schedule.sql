-- Kitchen Buddy: pg_cron schedule for the daily-digest edge function
--
-- IMPORTANT — manual project setup required (cannot be done from a
-- migration): in the Supabase dashboard, enable the "pg_cron" and "pg_net"
-- extensions for this project (Database > Extensions). This migration
-- assumes both are available; if pg_cron/pg_net are not installed, the
-- `create extension` statements below will fail and this migration should
-- be re-run after enabling them.
--
-- The schedule below calls the daily-digest edge function once per day at
-- 17:00 Asia/Bangkok (UTC+7, no DST) = 10:00 UTC.
--
-- The edge function is invoked over HTTPS via pg_net using the project's
-- service_role key, which is required so the function can bypass RLS to
-- read across all households and write notification_log rows.
--
-- Two placeholders MUST be replaced after `supabase db push`, by running the
-- block at the bottom of this file manually in the SQL editor (or via psql)
-- with real values:
--   <PROJECT_REF>            e.g. abcdefghijklmnop
--   <SERVICE_ROLE_KEY>        the project's service_role API key
--
-- We do not bake real secrets into a migration file (migrations are
-- versioned and may be world-readable in this repo). See SETUP.md for the
-- exact one-time command to run after deploy.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Placeholder schedule using a non-functional URL/key so `supabase db push`
-- succeeds on a fresh project without manual edits. Re-run the
-- `select cron.alter_job(...)` block in SETUP.md after deploy to point this
-- at the real project URL and service_role key.
select
  cron.schedule(
    'kitchen-buddy-daily-digest',
    '0 10 * * *', -- 10:00 UTC = 17:00 Asia/Bangkok
    $$
    select net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := '{}'::jsonb
    );
    $$
  )
where not exists (
  select 1 from cron.job where jobname = 'kitchen-buddy-daily-digest'
);
