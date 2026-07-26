#!/bin/sh
set -e

echo "[entrypoint] Veritabanı bekleniyor..."
# pg_isready libpq bağlantı dizesini kullanır; Prisma'ya özel "?schema=..." ekini ayıkla.
DB_WAIT_URL="${DATABASE_URL%%\?*}"
until pg_isready -d "$DB_WAIT_URL" >/dev/null 2>&1; do
  sleep 1
done

echo "[entrypoint] Migration uygulanıyor (prisma migrate deploy)..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Seed (idempotent) çalıştırılıyor..."
  node dist-tools/seed.js || echo "[entrypoint] Seed atlandı/hata (yoksayıldı)."
fi

echo "[entrypoint] Uygulama başlatılıyor..."
exec node dist/main.js
