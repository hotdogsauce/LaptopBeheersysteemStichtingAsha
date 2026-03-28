# Deployment Guide — Stichting Asha Laptopbeheersysteem

## Architectuur

```
Internet
   │
   ├── Vercel (Web / Next.js)
   │     └── HTTPS, automatisch bij push naar main
   │
   └── Railway (API / GraphQL)
         ├── GraphQL Yoga op poort 4000
         └── PostgreSQL database (intern)
```

## Lokale Docker deploy (ontwikkeling)

### Vereisten
- Docker Desktop geïnstalleerd
- Git

### Stappen
```bash
git clone https://github.com/hotdogsauce/LaptopBeheersysteemStichtingAsha.git
cd LaptopBeheersysteemStichtingAsha
cp .env.example .env
# Vul GROQ_API_KEY in
docker compose up --build -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

Systeem draait op http://localhost:3000

---

## Productie deploy (Railway + Vercel)

### Railway (API)

1. Push naar `main` branch op GitHub
2. Railway detecteert automatisch de push en herstart de service
3. Migraties draaien automatisch als het start commando dit bevat

**Start commando Railway:**
```
npx prisma migrate deploy && npx prisma db seed --skip-seed && npx tsx src/index.ts
```

**Vereiste environment variables in Railway:**
| Variable | Waarde |
|----------|--------|
| `DATABASE_URL` | Automatisch door Railway PostgreSQL plugin |
| `GROQ_API_KEY` | `gsk_...` (uit Groq console) |

### Vercel (Web)

1. Vercel koppelt aan de GitHub repo
2. Bij elke push naar `main` bouwt Vercel automatisch
3. URL is stabiel (bijv. `asha-laptopbeheer.vercel.app`)

**Vereiste environment variables in Vercel:**
| Variable | Waarde |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://jouw-api.up.railway.app/graphql` |

---

## CI/CD pipeline

GitHub Actions (`.github/workflows/ci.yml`) draait bij elke push:
1. Installeert dependencies
2. Runt Prisma migraties op test-database
3. Runt alle 69 tests
4. Bouwt de Next.js frontend

**Deploy vindt pas plaats na groene CI.**

---

## Nieuwe versie uitbrengen

```bash
# 1. Zorg dat alle tests groen zijn
cd apps/api && npm test

# 2. Update CHANGELOG.md

# 3. Commit en tag
git add -A
git commit -m "feat: beschrijving van de wijziging"
git tag vX.Y.Z
git push && git push --tags
```

Railway en Vercel deployen automatisch na de push.

---

## Rollback

```bash
# Terugzetten naar vorige versie
git checkout vX.Y.Z
git push --force origin main
```

Of via Railway dashboard: klik op een eerdere deployment → **Redeploy**.
