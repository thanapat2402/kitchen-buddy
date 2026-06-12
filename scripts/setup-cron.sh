#!/usr/bin/env bash
# One-time: point the kitchen-buddy-daily-digest cron job at the real
# project URL + service_role key. Run from the repo root:
#   bash scripts/setup-cron.sh
# Requires: supabase CLI logged in, .env.local with SUPABASE_DB_PASSWORD.
set -euo pipefail

PROJECT_REF="vqkersqcyutjbqidmixo"
source .env.local

SERVICE_KEY=$(supabase projects api-keys --project-ref "$PROJECT_REF" | awk '/service_role/ {print $3}')
if [ -z "$SERVICE_KEY" ]; then echo "could not read service_role key"; exit 1; fi

psql "postgresql://postgres.${PROJECT_REF}:${SUPABASE_DB_PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" <<SQL
select cron.alter_job(
  (select jobid from cron.job where jobname = 'kitchen-buddy-daily-digest'),
  command := \$cmd\$
    select net.http_post(
      url := 'https://${PROJECT_REF}.supabase.co/functions/v1/daily-digest',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ${SERVICE_KEY}'
      ),
      body := '{}'::jsonb
    );
  \$cmd\$
);
select jobname, schedule, active from cron.job where jobname = 'kitchen-buddy-daily-digest';
SQL
echo "cron job updated."
