#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"

if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL initdb is required for the Mission Pass database integration test." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/basedare-mission-pass-db.XXXXXX")"
PGDATA="$TMP_DIR/postgres"
PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
DB_NAME="basedare_mission_pass_test"

cleanup() {
  if [[ -f "$PGDATA/postmaster.pid" ]]; then
    pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

initdb -A trust -U postgres -D "$PGDATA" >/dev/null
pg_ctl -D "$PGDATA" -o "-F -h 127.0.0.1 -p $PORT" -w start >/dev/null
createdb -h 127.0.0.1 -p "$PORT" -U postgres "$DB_NAME"
psql -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;' \
  >/dev/null

export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/$DB_NAME"
export DIRECT_URL="$DATABASE_URL"
export MISSION_PASS_HMAC_SECRET="mission-pass-db-integration-secret-2026"
export NEXT_PUBLIC_APP_URL="https://www.basedare.xyz"

cd "$ROOT_DIR"
./node_modules/.bin/prisma migrate deploy
TS_NODE_TRANSPILE_ONLY=true \
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node \
  -r ./scripts/register-test-server-only.cjs \
  -r ts-node/register \
  scripts/mission-pass-db-integration.ts
