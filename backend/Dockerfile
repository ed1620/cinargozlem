# ============ Builder ============
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Prisma engine openssl gerektirir
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build
# Seed'i bağımsız CJS olarak derle (runner'da ts-node'a gerek kalmadan çalışsın)
RUN npx tsc prisma/seed.ts --outDir dist-tools --module commonjs --target ES2021 \
    --esModuleInterop --skipLibCheck --resolveJsonModule

# ============ Runner ============
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# pg_dump-16 (yedekleme cron) + DejaVu font (Türkçe PDF) + openssl (prisma)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates gnupg wget fonts-dejavu-core \
    && install -d /usr/share/postgresql-common/pgdg \
    && wget -qO /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
    && apt-get purge -y wget gnupg && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Bağımlılıklar + üretilmiş Prisma client + derlenmiş kod
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-tools ./dist-tools
COPY prisma ./prisma
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh && mkdir -p storage/uploads storage/backups

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
