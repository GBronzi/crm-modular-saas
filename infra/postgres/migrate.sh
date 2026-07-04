#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 -h postgres -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for file in /migrations/*.sql; do
  filename="$(basename "$file")"
  applied="$(psql -At -h postgres -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -c "SELECT 1 FROM schema_migrations WHERE filename = '$filename'")"
  if [ "$applied" = "1" ]; then
    echo "Skipping $filename"
    continue
  fi

  echo "Applying $filename"
  psql -v ON_ERROR_STOP=1 -h postgres -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -f "$file"
  psql -v ON_ERROR_STOP=1 -h postgres -U "$POSTGRES_ADMIN_USER" -d "$POSTGRES_DB" -c "INSERT INTO schema_migrations(filename) VALUES ('$filename')"
done

