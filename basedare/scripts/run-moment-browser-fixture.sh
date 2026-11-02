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
if ! pg_ctl -D "$TASK_PGDATA" -o "-F -h 127.0.0.1 -p $TASK_PORT -k $TASK_DIR" -l "$TASK_DIR/server.log" -w start >/dev/null; then
  cat "$TASK_DIR/server.log" >&2
  exit 1
fi
createdb -h 127.0.0.1 -p "$TASK_PORT" -U postgres basedare_moment_browser_test
export DATABASE_URL="postgresql://postgres@127.0.0.1:$TASK_PORT/basedare_moment_browser_test"
export DIRECT_URL="$DATABASE_URL"
export MISSION_PASS_HMAC_SECRET="local-browser-fixture-hmac-secret-2026"
export ADMIN_SECRET="local-browser-fixture-admin-secret-2026"
export PINATA_JWT=""
# Enable link-only rehearsal explicitly at invocation; public/default runs are paused.
export MOMENT_SUBMISSIONS_ENABLED="${MOMENT_SUBMISSIONS_ENABLED:-false}"
export MOMENT_ORIGINAL_MEDIA_ENABLED=false
export TELEGRAM_BOT_TOKEN='' TELEGRAM_ADMIN_CHAT_ID='' TELEGRAM_SIGNAL_CHAT_ID='' TELEGRAM_PUBLIC_CHAT_ID=''
export VAPID_PRIVATE_KEY='' WEB_PUSH_VAPID_PRIVATE_KEY='' RESEND_API_KEY='' REFEREE_HOT_WALLET_PRIVATE_KEY=''
export NEXTAUTH_SECRET="local-browser-fixture-nextauth-secret-2026"
# This rehearsal signs with real fixture EOAs. Refuse remote RPC access so viem
# uses its cryptographic ECDSA fallback; this does not test smart-wallet RPCs.
export BASE_SEPOLIA_RPC_URL="http://127.0.0.1:9" BASE_MAINNET_RPC_URL="http://127.0.0.1:9"
# Explicit, local-only optional email UI rehearsal. No provider credential or real recipient.
if [[ "${LOCAL_RETENTION_BROWSER_FIXTURE:-false}" == 'true' ]]; then
  export RESEND_API_KEY='fixture-only' RETENTION_FROM_EMAIL='updates@example.test'
  export RETENTION_SECRET='local-browser-retention-secret-at-least-32-chars'
  export RESEND_WEBHOOK_SECRET='whsec_Zml4dHVyZS1vbmx5LXdlYmhvb2stc2VjcmV0'
  export RETENTION_EMAIL_ENABLED=true RETENTION_SEND_ENABLED=false
  export RETENTION_FIXTURE_OUTBOX="$TASK_DIR/retention-outbox.jsonl"
  export NODE_OPTIONS="--require=$PWD/scripts/retention-browser-outbox.cjs"
  echo "Local-only stub outbox: $RETENTION_FIXTURE_OUTBOX"
fi
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c 'CREATE ROLE service_role NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;' >/dev/null
./node_modules/.bin/prisma migrate deploy >/dev/null
TS_NODE_TRANSPILE_ONLY=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' node -r ./scripts/register-test-server-only.cjs -r ts-node/register scripts/moment-browser-fixture.ts
./node_modules/.bin/next start --port 3217
