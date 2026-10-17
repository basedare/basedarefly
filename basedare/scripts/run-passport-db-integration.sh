#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"

if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL initdb is required for the Passport database integration test." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/basedare-passport-db.XXXXXX")"
PGDATA="$TMP_DIR/postgres"
PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
DB_NAME="basedare_passport_test"

cleanup() {
  if [[ -f "$PGDATA/postmaster.pid" ]]; then
    pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

initdb -A trust -U postgres -D "$PGDATA" >/dev/null
# Ubuntu's packaged server defaults to a system-owned socket directory.
# Keep every resource inside this disposable test directory on all platforms.
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
export MISSION_PASS_HMAC_SECRET="passport-db-integration-secret-2026"
export NEXT_PUBLIC_APP_URL="https://www.basedare.xyz"

cd "$ROOT_DIR"
./node_modules/.bin/prisma migrate deploy
psql -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -c 'DROP TABLE "AdventureJournal"; DELETE FROM "_prisma_migrations" WHERE migration_name = '\''20261017100000_private_adventure_journal'\'';' >/dev/null
node scripts/apply-private-journal-migration.mjs --apply
node scripts/apply-private-journal-migration.mjs --apply
TS_NODE_TRANSPILE_ONLY=true \
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node \
  -r ./scripts/register-test-server-only.cjs \
  -r ts-node/register \
  scripts/passport-db-integration.ts
