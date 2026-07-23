#!/usr/bin/env bash
# Copies schema + data from the old DATABASE_URI (Neon) to the new
# NEW_DB_DATABASE_URL (production Postgres) via pg_dump/pg_restore.
#
# Usage:
#   ./scripts/migrate-database.sh          # dump, restore, verify
#   ./scripts/migrate-database.sh --dry-run # dump + connectivity checks only
#
# Requires: pg_dump, pg_restore, psql (matching or newer major version than
# both source and target servers) and DATABASE_URI / NEW_DB_DATABASE_URL set
# (e.g. via `set -a; source .env; set +a` before running).

set -euo pipefail

: "${DATABASE_URI:?DATABASE_URI is not set}"
: "${NEW_DB_DATABASE_URL:?NEW_DB_DATABASE_URL is not set}"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

DUMP_FILE="$(mktemp -t cecafa-db-dump).pgdump"
trap 'rm -f "$DUMP_FILE" "${DUMP_FILE%.pgdump}.sql"' EXIT

echo "==> Checking connectivity to source (DATABASE_URI)..."
psql "$DATABASE_URI" -At -c "select 1" >/dev/null

echo "==> Checking connectivity to target (NEW_DB_DATABASE_URL)..."
psql "$NEW_DB_DATABASE_URL" -At -c "select 1" >/dev/null

echo "==> Checking target database is empty (no public tables)..."
EXISTING_TABLES="$(psql "$NEW_DB_DATABASE_URL" -At -c "select count(*) from pg_tables where schemaname = 'public'")"
if [[ "$EXISTING_TABLES" -gt 0 ]]; then
  echo "REFUSING to proceed: target 'public' schema already has $EXISTING_TABLES table(s)." >&2
  echo "Inspect it manually — this script does not overwrite an existing target." >&2
  exit 1
fi

echo "==> Dumping source database (schema + data, custom format)..."
pg_dump "$DATABASE_URI" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

echo "==> Dump complete: $(du -h "$DUMP_FILE" | cut -f1)"

if $DRY_RUN; then
  echo "==> --dry-run: skipping restore. Dump left at $DUMP_FILE (not auto-deleted)."
  trap - EXIT
  exit 0
fi

echo "==> Restoring into target database..."
# pg_restore's plain-SQL header includes `SET transaction_timeout = 0;`,
# a GUC that only exists on Postgres 17+. If the target server is older,
# strip that one line before executing — everything else in the header
# (statement_timeout, client_encoding, etc.) is broadly compatible.
SQL_FILE="${DUMP_FILE%.pgdump}.sql"
pg_restore "$DUMP_FILE" --no-owner --no-privileges --file="$SQL_FILE"
sed -i '' '/^SET transaction_timeout/d' "$SQL_FILE"
psql "$NEW_DB_DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 --file="$SQL_FILE"

echo "==> Verifying row counts match between source and target..."
psql "$DATABASE_URI" -At -F'|' -c "
  select relname, n_live_tup from pg_stat_user_tables order by relname
" > /tmp/cecafa-src-counts.txt
psql "$NEW_DB_DATABASE_URL" -At -F'|' -c "
  select relname, n_live_tup from pg_stat_user_tables order by relname
" > /tmp/cecafa-dst-counts.txt

if diff -u /tmp/cecafa-src-counts.txt /tmp/cecafa-dst-counts.txt; then
  echo "==> Row counts match."
else
  echo "WARNING: row counts differ (see diff above) — inspect before cutting over." >&2
fi

echo "==> Done. Next: point the app at NEW_DB_DATABASE_URL and validate the app end-to-end."
