#!/usr/bin/env bash
# Disposable local-only fixture. No authentication bypass; sign-in stays real.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"
TASK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/basedare-moment-browser.XXXXXX")"
TASK_PGDATA="$TASK_DIR/postgres"
TASK_PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
cleanup() { pg_ctl -D "$TASK_PGDATA" -m fast -w stop >/dev/null 2>&1 || true; rm -rf "$TASK_DIR"; }
trap cleanup EXIT
initdb -A trust -U postgres -D "$TASK_PGDATA" >/dev/null
pg_ctl -D "$TASK_PGDATA" -o "-F -h 127.0.0.1 -p $TASK_PORT" -w start >/dev/null
createdb -h 127.0.0.1 -p "$TASK_PORT" -U postgres basedare_moment_browser_test
export DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PORT/basedare_moment_browser_test"
export DIRECT_URL="$DATABASE_URL"
export MISSION_PASS_HMAC_SECRET="local-browser-fixture-hmac-secret-2026"
export ADMIN_SECRET="local-browser-fixture-admin-secret-2026"
export PINATA_JWT=""
export NEXTAUTH_SECRET="local-browser-fixture-nextauth-secret-2026"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;' >/dev/null
./node_modules/.bin/prisma migrate deploy >/dev/null
TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/moment-browser-fixture.ts
./node_modules/.bin/next start --port 3217
