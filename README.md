# Çınar Gözlem Kurumsal Yönetim Platformu (KG-KYP)

Tek çatı altında, tek girişli, modül bazlı yetkilendirmeye sahip kurumsal yönetim (ERP) platformu.
**DENİZLİ ÇINAR GÖZLEM ÖZEL EĞİTİM ve REHABİLİTASYON MERKEZİ** için geliştirilmektedir.

---

## 1. Mimari Özet

**Yaklaşım:** Clean Architecture / Modüler Monolit (mikroservise hazır bounded context'ler).

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + **TypeScript + NestJS** |
| ORM / DB | **Prisma** + **PostgreSQL** |
| Frontend | **React (TypeScript)** + Vite + Tailwind + özel UI kit (`components/ui`) + Zustand |
| Auth | JWT (access + refresh), argon2 parola hash |
| Yetkilendirme | Dinamik RBAC matrisi: `User → Role → Module → Action` |
| Arka plan işleri | **`@nestjs/schedule`** (cron) — uyarı motoru (08:00) + `pg_dump` yedekleme (09:00) |
| Dosya | **Yerel disk** (`multer`) — fiş, poliçe, öğrenci fotoğrafları (S3'e geçişe uygun) |
| PDF | Merkezi rapor servisi (`pdfkit`) — her raporun 1. sayfa üstünde kurum başlığı |
| Güvenlik | Hassas PII (TC, maaş, finans) AES‑256‑GCM ile şifreli; `helmet`, rate‑limit (`@nestjs/throttler`), tam audit log |

### Modüller (bounded contexts)
1. **auth** — Tek giriş, guard'lar, rol/oturum yönetimi, `/me` yetki uçları
2. **users** — RBAC matris yönetimi, rol + kullanıcı CRUD
3. **personnel** — Personel kartı, bordro, yıllık izin
4. **finance** — Gelir, gider, kategori, kasa/bakiye
5. **vehicles** — Araç, sigorta/kasko, muayene, akaryakıt, bakım
6. **students** — Öğrenci kartı, aylık aktivite, çoklu fotoğraf
7. **notifications** — Merkezi uyarı motoru (cron) + manuel tarama
8. **reports** — PDF üretimi (kurum başlıklı)
9. **dashboard** — Role göre özet metrikler

Ortak altyapı (`common/`): `prisma`, `crypto` (PII şifreleme), `backup` (09:00 cron), `uploads` (multer + statik sunum), `health` (`/api/health`), `guards`, `decorators`, `middleware` (audit + modül bağlamı), `dto`.

### Modüller arası entegrasyon (opsiyonel, konfigüre edilebilir)
- Maaş ödemesi → otomatik **gider** kaydı
- Akaryakıt / bakım / sigorta gideri → otomatik **gider** kaydı
- Öğrenci ödemesi → **gelir** kaydı ile ilişki
- Pasif personel/öğrenci → yeni maaş/izin/gelir kaydı engellenir

---

## 2. Uygulama Planı (Adımlar)

| Adım | İçerik | Durum |
|------|--------|-------|
| **1** | Prisma / PostgreSQL şeması (ilişkiler, RBAC tabloları, enum'lar) | ✅ `backend/prisma/schema.prisma` |
| **2** | RBAC Guard + Decorator + modül filtre middleware + JWT auth | ✅ `modules/auth`, `common/guards`, `common/middleware` |
| **3** | Uyarı motoru (15/7/1 gün) + 09:00 otomatik yedekleme cron | ✅ `modules/notifications`, `common/backup` |
| **4** | PDF servisi (kurum başlıklı) | ✅ `modules/reports` |
| **5** | Frontend: RBAC matris ekranı + dinamik Sidebar + Dashboard | ✅ `frontend/` (React+Vite+TS) |

---

## 3. Klasör Yapısı

```
cinargozlem/
├── docker-compose.yml            # db + backend + web (nginx)
├── .env.example                  # Compose secret şablonu
├── img/logo.png                  # Kurum logosu
├── backend/
│   ├── Dockerfile                # multi-stage; pg_dump-16 + DejaVu font
│   ├── docker-entrypoint.sh      # DB bekle → migrate deploy → seed → start
│   ├── prisma/
│   │   ├── schema.prisma         # Tüm veri modeli (23 model, 12 enum)
│   │   ├── seed.ts               # Idempotent seed (admin + roller)
│   │   └── sample-data.ts        # Demo veri (opsiyonel)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/             # Tek giriş, guard'lar, /me, permissions
│   │   │   ├── users/            # Rol + kullanıcı CRUD, RBAC matrisi
│   │   │   ├── personnel/        # Personel, bordro, izin
│   │   │   ├── finance/          # Gelir, gider, kategori, kasa, entegrasyon
│   │   │   ├── vehicles/         # Araç, sigorta, muayene, akaryakıt, bakım
│   │   │   ├── students/         # Öğrenci, aktivite, fotoğraf
│   │   │   ├── notifications/    # Merkezi uyarı motoru (cron)
│   │   │   ├── reports/          # PDF oluşturucu (kurum başlıklı)
│   │   │   └── dashboard/        # Özet metrikler
│   │   ├── common/
│   │   │   ├── prisma/           # PrismaService (bağlantı retry)
│   │   │   ├── crypto/           # AES-256-GCM PII şifreleme
│   │   │   ├── backup/           # 09:00 pg_dump cron
│   │   │   ├── uploads/          # multer + statik dosya sunumu
│   │   │   ├── health/           # GET /api/health
│   │   │   ├── decorators/       # @RequirePermission(), @Public(), @CurrentUser()
│   │   │   ├── guards/           # JwtAuthGuard + PermissionsGuard
│   │   │   ├── middleware/       # Audit log + modül bağlamı
│   │   │   └── dto/              # Ortak liste/sayfalama DTO'ları
│   │   ├── app.module.ts
│   │   └── main.ts               # helmet, trust proxy, statik /uploads, HOST bağlama
│   └── package.json
└── frontend/                     # React + Vite + TS + Tailwind
    ├── Dockerfile                # build → nginx
    ├── nginx.conf                # SPA + /api & /uploads proxy
    ├── public/logo.png
    └── src/
        ├── components/           # Layout, Sidebar (sürüklenebilir çekmece), Header,
        │                         #   ProtectedRoute, Can, ui/ (Button, Modal, DataTable,
        │                         #   PageSkeleton, SegmentedControl, LinkButton…)
        ├── modules/              # auth, dashboard, students, personnel,
        │                         #   finance, vehicles, notifications, reports, users
        ├── lib/                  # spring.ts — jest fiziği (yay, momentum, lastik direnç)
        ├── services/             # api (JWT+refresh), domain, rbac, dashboard
        ├── store/                # auth.store (Zustand) — yetki state
        └── types.ts              # ModuleCode/PermissionAction + modül meta
```

## Tamamlanma Durumu (Faz 2 — tam ERP)

| # | Alan | Durum |
|---|------|-------|
| 1 | Domain CRUD API (Personel, Finans, Araç, Öğrenci) | ✅ |
| 2 | Tüm frontend ekranları (liste + form + detay) | ✅ |
| 3 | Kullanıcı yönetimi (oluştur/rol ata/pasif/şifre) | ✅ |
| 4 | Dosya yükleme (multer) + statik sunum + silmede disk temizliği | ✅ |
| 5 | Entegrasyon: maaş/akaryakıt/bakım/sigorta→gider, öğrenci→gelir, pasif engeli | ✅ |
| 6 | Raporlar: aylık/yıllık öğrenci, kategori & ödeme dağılımı, araç geçmişi, litre/km, yıllık maaş | ✅ |
| 7 | Uyarı paneli, rapor ekranı, audit altyapısı | ✅ |
| 8 | helmet, rate-limit (throttler), unit testler (9/9) | ✅ |

## Dağıtım (Docker / Production)

Tek komutla tüm yığın (PostgreSQL + backend + nginx'li frontend) ayağa kalkar.

```bash
cp .env.example .env
# .env içindeki parola/secret değerlerini doldur:
#   openssl rand -hex 48     → JWT secret'lar
#   openssl rand -base64 32  → ENCRYPTION_KEY
docker compose up -d --build
```

- Uygulama: **http://localhost:8080** (`WEB_PORT` ile değiştirilebilir)
- İlk açılışta backend `prisma migrate deploy` + seed'i (admin kullanıcı) otomatik çalıştırır.
- Giriş: `admin` / `SEED_ADMIN_PASSWORD` (varsayılan `Admin1234!` — üretimde değiştirin).

**Yapı:**
| Servis | İmaj | Görev |
|--------|------|-------|
| `db` | postgres:16-alpine | Veritabanı (kalıcı `db-data` volume) |
| `backend` | multi-stage node:20 | NestJS API; içinde **pg_dump-16** (09:00 yedekleme) + **DejaVu font** (Türkçe PDF) |
| `web` | nginx:alpine | Derlenmiş SPA'yı sunar, `/api` ve `/uploads`'ı backend'e proxy'ler |

- Rate-limit için nginx arkasında gerçek IP (`trust proxy`) ayarlıdır.
- İlk kurulumdan sonra `SEED_ON_START=false` yapılabilir.

### Kalıcılık & Kurtarma (Persistence & Recovery)
- **Veritabanı kalıcılığı:** `db-data` **named volume** — container `stop`/`rm` edilse, hatta `docker compose down` yapılsa bile veri korunur. Yalnızca `docker compose down -v` (bilinçli) siler.
- **Dosya kalıcılığı:** Yüklenen fotoğraf/fişler ve günlük yedekler **host'a bind-mount** edilir (`./data/storage`) — dosyalara doğrudan diskten erişilebilir, kaybolmaz.
- **Çökme önleme (auto-recovery):** İki katmanlı:
  1. `db` healthcheck + `backend depends_on: service_healthy` → DB sağlıklı olmadan backend başlamaz.
  2. `PrismaService` açılışta bağlantıyı **N kez yeniden dener** (`DB_CONNECT_RETRIES`, varsayılan 30 × 3sn) — DB geç açılırsa/anlık koparsa uygulama çökmez, bekler ve bağlanır.
  3. `restart: unless-stopped` → beklenmedik durumda konteynerler otomatik yeniden başlar.
- **Sağlık ucu:** `GET /api/health` (kimlik/rate-limit dışı) DB'yi `SELECT 1` ile yoklar; backend Docker healthcheck bunu kullanır. `web`, backend sağlıklı olunca yayına alınır.
- **Idempotent seed:** Seed tüm kayıtları `upsert` ile ekler; her açılışta çalışsa da **tekrar tekrar üzerine yazmaz/çoğaltmaz**.

## Yerel Geliştirme (Docker'sız)

Docker yerine doğrudan çalıştırmak için (PostgreSQL yerelde kurulu olmalı):

**1) Backend**
```bash
cd backend
cp .env.example .env        # DATABASE_URL, JWT secret, ENCRYPTION_KEY doldurun
npm install
npx prisma migrate dev --name init
npm run db:seed             # admin + roller (idempotent)
npm run start:dev           # http://localhost:3000/api
```

**2) Frontend** (ayrı terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173 (API → :3000 proxy)
```

Giriş: `admin` / `SEED_ADMIN_PASSWORD` (varsayılan `Admin1234!`).

### Ağ arayüzü (`HOST`)

Backend'in hangi arayüze bağlanacağı `HOST` ile ayarlanır:

| Değer | Etki |
|-------|------|
| `0.0.0.0` (varsayılan) | Tüm arayüzler — **Docker için gerekli**, `web` konteyneri backend'e ancak böyle ulaşır |
| `127.0.0.1` | Yalnızca bu makine — API ağdan görünmez |

`backend/.env.example` `HOST=127.0.0.1` ile gelir, dolayısıyla yukarıdaki
`cp .env.example .env` adımından sonra yerel API zaten dışarı kapalıdır.
Compose tarafında bu değişken tanımlı değildir; backend varsayılanı olan
`0.0.0.0` geçerli kalır.

### Telefondan / başka cihazdan test

Arayüzü ağa açmak yeterlidir; backend'i açmaya gerek yoktur, çünkü Vite'ın
`/api` proxy'si geliştirme makinesinde çalışır:

```bash
cd frontend
npm run dev -- --host 0.0.0.0    # Network satırındaki adresi telefonda açın
```

`HOST=127.0.0.1` ayarlıysa API dışarıdan erişilemez, arayüz yine çalışır.
Bayrak komut satırında verildiği için kalıcı değildir — bayraksız yeniden
başlatmak normal (yalnızca localhost) haline döndürür.

> Not: PDF'lerde Türkçe karakterler için `backend/assets/fonts/` içine bir Unicode TTF
> (DejaVuSans) gerekir; Docker imajı bu fontu kendisi kurar.
