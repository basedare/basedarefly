#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"

if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL initdb is required for the Adventure sharing database integration test." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/basedare-adventure-sharing-db.XXXXXX")"
PGDATA="$TMP_DIR/postgres"
PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
DB_NAME="basedare_adventure_sharing_test"

cleanup() {
  if [[ -f "$PGDATA/postmaster.pid" ]]; then
    pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

initdb -A trust -U postgres -D "$PGDATA" >/dev/null
# Ubuntu's packaged server defaults to a system-owned socket directory.
if ! pg_ctl -D "$PGDATA" -o "-F -h 127.0.0.1 -p $PORT -k $TMP_DIR" -l "$TMP_DIR/server.log" -w start >/dev/null; then
  cat "$TMP_DIR/server.log" >&2
  exit 1
fi
createdb -h 127.0.0.1 -p "$PORT" -U postgres "$DB_NAME"
psql -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;' \
  >/dev/null

export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/$DB_NAME"
export DIRECT_URL="$DATABASE_URL"
export MISSION_PASS_HMAC_SECRET="adventure-sharing-db-integration-secret-2026"
export NEXT_PUBLIC_APP_URL="https://www.basedare.xyz"

cd "$ROOT_DIR"
# Exercise the forward migration over an actual legacy submission.
mkdir -p "$TMP_DIR/legacy/migrations"
cp prisma/schema.prisma "$TMP_DIR/legacy/schema.prisma"
if [[ -f prisma/migrations/migration_lock.toml ]]; then cp prisma/migrations/migration_lock.toml "$TMP_DIR/legacy/migrations/"; fi
for migration_dir in prisma/migrations/*/; do
  if [[ "$migration_dir" != *20261029100000_adventure_moments* ]]; then
    cp -R "${migration_dir%/}" "$TMP_DIR/legacy/migrations/"
  fi
done
./node_modules/.bin/prisma migrate deploy --schema "$TMP_DIR/legacy/schema.prisma"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "Venue" (id, slug, name, latitude, longitude, "updatedAt") VALUES ('legacy-fixture-venue', 'legacy-fixture', 'Legacy fixture only', 9.79, 126.15, NOW()); INSERT INTO "AdventureSubmission" (id, wallet, "activityId", "runId", "venueSlug", caption, hashtag, "mediaUrl", "mediaType", status, "publicConsentVersion", "updatedAt") VALUES ('legacy-fixture-row', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'postcard', 'legacy-fixture-run', 'legacy-fixture', 'Legacy fixture only', 'basedarepostcard', 'https://example.com/legacy.jpg', 'IMAGE', 'REJECTED', 'adventure-display-v1', NOW());
SQL
export LEGACY_MOMENT_CLIENT_DIR="$TMP_DIR/legacy-client"
./node_modules/.bin/prisma generate --schema scripts/fixtures/moment-legacy.prisma >/dev/null
compatibility_check() {
  NODE_PATH="$ROOT_DIR/node_modules" TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/moment-migration-compatibility-check.ts "$1"
}
compatibility_check before
pg_dump "$DATABASE_URL" --format=custom --file="$TMP_DIR/legacy.dump"
createdb -h 127.0.0.1 -p "$PORT" -U postgres "${DB_NAME}_restored"
pg_restore --dbname="postgresql://postgres@127.0.0.1:$PORT/${DB_NAME}_restored" --no-owner --exit-on-error "$TMP_DIR/legacy.dump"
DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/${DB_NAME}_restored" compatibility_check restored
RESTORED_URL="postgresql://postgres@127.0.0.1:$PORT/${DB_NAME}_restored"
# Rehearse the operator's transactional SQL + explicit migration-ledger registration.
# Inject a late error first: none of the ALTERs may survive the rolled-back transaction.
if psql "$RESTORED_URL" --single-transaction -v ON_ERROR_STOP=1 -f prisma/migrations/20261029100000_adventure_moments/migration.sql -c 'SELECT 1/0;' > "$TMP_DIR/expected-transaction-failure.log" 2>&1; then
  echo 'Fault-injected migration unexpectedly succeeded' >&2; exit 1
fi
DATABASE_URL="$RESTORED_URL" compatibility_check restored
if [[ "$(psql "$RESTORED_URL" -At -c "SELECT count(*) FROM information_schema.columns WHERE table_name='AdventureSubmission' AND column_name='socialUrl'")" != '0' ]]; then
  echo 'Failed transactional migration left new columns behind' >&2; exit 1
fi
PGOPTIONS='-c lock_timeout=5s -c statement_timeout=30s' psql "$RESTORED_URL" --single-transaction -v ON_ERROR_STOP=1 -f prisma/migrations/20261029100000_adventure_moments/migration.sql >/dev/null
DATABASE_URL="$RESTORED_URL" DIRECT_URL="$RESTORED_URL" ./node_modules/.bin/prisma migrate resolve --applied 20261029100000_adventure_moments >/dev/null
DATABASE_URL="$RESTORED_URL" compatibility_check after
./node_modules/.bin/prisma migrate deploy
# Prisma's migration runner, rather than raw ALTER replay, must be idempotent.
./node_modules/.bin/prisma migrate deploy
compatibility_check after
TS_NODE_TRANSPILE_ONLY=true \
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node \
  -r ./scripts/register-test-server-only.cjs \
  -r ts-node/register \
  scripts/adventure-sharing-db-integration.ts
TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/moment-motivation-db-check.ts
