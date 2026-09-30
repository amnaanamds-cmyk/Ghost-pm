#!/bin/sh
set -e
# Apply pending migrations before starting (idempotent). Set SKIP_MIGRATIONS=1 to manage them yourself.
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  prisma migrate deploy --schema ./prisma/schema.prisma
fi
exec "$@"
