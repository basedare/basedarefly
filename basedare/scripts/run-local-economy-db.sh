#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_TMP="$(mktemp -d "${TMPDIR:-/tmp}/basedare-economy.XXXXXX")"
TASK_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as s:
 s.bind(('127.0.0.1',0)); print(s.getsockname()[1])
PY
)"
cleanup() { pg_ctl -D "$TASK_TMP/postgres" -m fast -w stop >/dev/null 2>&1 || true; rm -rf "$TASK_TMP"; }
trap cleanup EXIT
initdb -A trust -U postgres -D "$TASK_TMP/postgres" >/dev/null
pg_ctl -D "$TASK_TMP/postgres" -o "-F -h 127.0.0.1 -p $TASK_PORT -k $TASK_TMP" -l "$TASK_TMP/log" -w start >/dev/null
createdb -h 127.0.0.1 -p "$TASK_PORT" -U postgres basedare_economy_test
export DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PORT/basedare_economy_test" DIRECT_URL="postgresql://postgres@127.0.0.1:$TASK_PORT/basedare_economy_test"
export TELEGRAM_BOT_TOKEN='' TELEGRAM_ADMIN_CHAT_ID='' VAPID_PRIVATE_KEY='' WEB_PUSH_VAPID_PRIVATE_KEY='' RESEND_API_KEY='' REFEREE_HOT_WALLET_PRIVATE_KEY=''
export SIMULATE_BOUNTIES=true NEXT_PUBLIC_SIMULATE_BOUNTIES=true NEXT_PUBLIC_NETWORK=testnet
cd "$TASK_ROOT"
# Replay the real history including RLS. A second deploy must do no work.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;' >/dev/null
mkdir -p "$TASK_TMP/legacy/migrations"
cp prisma/schema.prisma "$TASK_TMP/legacy/schema.prisma"
if [[ -f prisma/migrations/migration_lock.toml ]]; then cp prisma/migrations/migration_lock.toml "$TASK_TMP/legacy/migrations/"; fi
for task_migration in prisma/migrations/*/; do
  if [[ "$task_migration" != *20261123090000_living_economy_sessions* ]]; then cp -R "${task_migration%/}" "$TASK_TMP/legacy/migrations/"; fi
done
./node_modules/.bin/prisma migrate deploy --schema "$TASK_TMP/legacy/schema.prisma"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "Venue" (id, slug, name, latitude, longitude, "updatedAt") VALUES ('economy-legacy-place', 'economy-legacy-place', 'Legacy migration fixture', 9.79,126.15,NOW());
INSERT INTO "Meetup" (id, "creatorBaretagId", title, type, "placeLabel", "approxLat", "approxLng", "startTime") VALUES ('economy-legacy-meetup','legacy-person','Existing meetup','jam','Existing place',9.79,126.15,NOW());
INSERT INTO "MeetupRsvp" (id,"meetupId","baretagId") VALUES ('economy-legacy-rsvp','economy-legacy-meetup','legacy-person');
SQL
# Fault injection proves the additive migration can be rolled back atomically.
if psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f prisma/migrations/20261123090000_living_economy_sessions/migration.sql -c 'SELECT 1/0;' > "$TASK_TMP/expected-failure.log" 2>&1; then
  echo 'Fault injection unexpectedly succeeded'; exit 1
fi
if [[ "$(psql "$DATABASE_URL" -At -c "SELECT count(*) FROM information_schema.tables WHERE table_name='LocalNode'")" != 0 ]]; then echo 'Partial migration survived rollback'; exit 1; fi
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma migrate deploy
TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/local-economy-db-check.ts
