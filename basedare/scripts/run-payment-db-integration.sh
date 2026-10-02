#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:$PATH"

if ! command -v initdb >/dev/null 2>&1; then
  echo "PostgreSQL initdb is required for the Payment database integration test." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/basedare-payment-db.XXXXXX")"
PGDATA="$TMP_DIR/postgres"
PORT="$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)"
DB_NAME="basedare_payment_test"

cleanup() {
  if [[ -n "${CHAIN_PID:-}" ]]; then kill "$CHAIN_PID" 2>/dev/null || true; fi
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

export NEXT_PUBLIC_APP_URL="https://www.basedare.xyz"

cd "$ROOT_DIR"
./node_modules/.bin/prisma migrate deploy >/dev/null
CHAIN_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')"
export PAYMENT_TEST_RPC="http://127.0.0.1:$CHAIN_PORT"
./node_modules/.bin/hardhat compile >/dev/null
./node_modules/.bin/hardhat node --hostname 127.0.0.1 --port "$CHAIN_PORT" >"$TMP_DIR/chain.log" 2>&1 &
CHAIN_PID=$!
for i in {1..30}; do
  if curl -sf -X POST -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' "$PAYMENT_TEST_RPC" >/dev/null; then break; fi
  sleep 1
done
TS_NODE_TRANSPILE_ONLY=true \
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' \
  node \
  -r ./scripts/register-test-server-only.cjs \
  -r ts-node/register \
  scripts/payment-db-integration.ts
