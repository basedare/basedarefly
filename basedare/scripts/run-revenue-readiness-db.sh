#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_TMP="$(mktemp -d "${TMPDIR:-/tmp}/basedare-revenue-db.XXXXXX")"
TASK_PGDATA="$TASK_TMP/postgres"
TASK_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    print(s.getsockname()[1])
PY
)"
TASK_DB="basedare_revenue_readiness_$(date +%s)"
cleanup() { pg_ctl -D "$TASK_PGDATA" -m fast -w stop >/dev/null 2>&1 || true; rm -rf "$TASK_TMP"; }
trap cleanup EXIT
initdb -A trust -U postgres -D "$TASK_PGDATA" >/dev/null
pg_ctl -D "$TASK_PGDATA" -o "-F -h 127.0.0.1 -p $TASK_PORT" -w start >/dev/null
createdb -h 127.0.0.1 -p "$TASK_PORT" -U postgres "$TASK_DB"
export DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PORT/$TASK_DB"
export DIRECT_URL="$DATABASE_URL"
# Ensure this harness cannot contact real customers or send any transaction.
export TELEGRAM_BOT_TOKEN='' TELEGRAM_ADMIN_CHAT_ID='' TELEGRAM_SIGNAL_CHAT_ID='' TELEGRAM_PUBLIC_CHAT_ID=''
export VAPID_PRIVATE_KEY='' WEB_PUSH_VAPID_PRIVATE_KEY='' RESEND_API_KEY='' REFEREE_HOT_WALLET_PRIVATE_KEY=''
export SIMULATE_BOUNTIES=true NEXT_PUBLIC_SIMULATE_BOUNTIES=true NEXT_PUBLIC_NETWORK=testnet
cd "$ROOT_DIR"
# Current-schema integration is separate from historical migration replay.
./node_modules/.bin/prisma db push --skip-generate >/dev/null
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; DROP TABLE "ContentRightsAcceptance"; ALTER TABLE "Dare" DROP COLUMN "contentSubmittedAt";' >/dev/null
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260921100000_content_rights_acceptance/migration.sql >/dev/null
TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/revenue-readiness-db.ts
