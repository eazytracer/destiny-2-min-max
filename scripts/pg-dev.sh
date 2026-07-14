#!/usr/bin/env bash
# Local PostgreSQL cluster for development — no Docker required.
# Uses the postgres 16 server binaries and a data dir under the repo (.pgdata,
# git-ignored). Listens on 127.0.0.1:5432 with a "synergy" database.
#
#   scripts/pg-dev.sh up      # init (first run), start, ensure db exists
#   scripts/pg-dev.sh down    # stop
#   scripts/pg-dev.sh status  # is it running?
set -euo pipefail

# Resolve the postgres server binaries. Honour an explicit PGBIN, otherwise
# pick the highest-numbered version installed under /usr/lib/postgresql
# (Debian/Ubuntu layout), falling back to whatever is on PATH.
if [ -z "${PGBIN:-}" ]; then
  for d in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V -r); do
    if [ -x "$d/pg_ctl" ]; then PGBIN="$d"; break; fi
  done
  PGBIN="${PGBIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || echo /usr/bin/pg_ctl)")}"
fi
PGDATA="${PGDATA:-$(cd "$(dirname "$0")/.." && pwd)/.pgdata}"
PGPORT="${PGPORT:-5432}"
PGHOST="127.0.0.1"
DBNAME="${DBNAME:-synergy}"
LOG="$PGDATA/server.log"

up() {
  if [ ! -d "$PGDATA/base" ]; then
    echo "→ Initialising cluster at $PGDATA"
    "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
    # Bind to localhost only; keep the socket inside the data dir so no
    # privileged directory (/var/run/postgresql) is required.
    echo "listen_addresses = '127.0.0.1'" >>"$PGDATA/postgresql.conf"
    echo "port = $PGPORT" >>"$PGDATA/postgresql.conf"
    echo "unix_socket_directories = '$PGDATA'" >>"$PGDATA/postgresql.conf"
  fi

  if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "→ Postgres already running"
  else
    echo "→ Starting Postgres on $PGHOST:$PGPORT"
    "$PGBIN/pg_ctl" -D "$PGDATA" -l "$LOG" -o "-p $PGPORT" -w start
  fi

  # Ensure the app database exists.
  if ! "$PGBIN/psql" -h "$PGHOST" -p "$PGPORT" -U postgres -lqt \
    | cut -d'|' -f1 | grep -qw "$DBNAME"; then
    echo "→ Creating database '$DBNAME'"
    "$PGBIN/createdb" -h "$PGHOST" -p "$PGPORT" -U postgres "$DBNAME"
  fi
  echo "✓ ready: postgres://postgres:postgres@$PGHOST:$PGPORT/$DBNAME"
}

down() {
  if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    "$PGBIN/pg_ctl" -D "$PGDATA" -w stop
    echo "✓ stopped"
  else
    echo "→ not running"
  fi
}

status() {
  "$PGBIN/pg_ctl" -D "$PGDATA" status || true
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  status) status ;;
  *) echo "usage: $0 {up|down|status}" >&2; exit 1 ;;
esac
