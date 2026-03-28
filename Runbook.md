# Runbook — Stichting Asha Laptopbeheersysteem

## Snel starten (lokaal)

```bash
cp .env.example .env
# Vul GROQ_API_KEY in in .env
docker compose up --build
```

Systeem is bereikbaar op:
- Web: http://localhost:3000
- API: http://localhost:4000/graphql
- Health: http://localhost:4000/health

---

## Stoppen

```bash
docker compose down
```

Database data blijft bewaard in het `postgres_data` volume.

---

## Stoppen én data wissen

```bash
docker compose down -v
```

---

## Logs bekijken

```bash
# Alle services
docker compose logs -f

# Alleen API
docker compose logs -f api

# Alleen database
docker compose logs -f db
```

---

## Database migraties uitvoeren

```bash
docker compose exec api npx prisma migrate deploy
```

---

## Database seeden (testdata)

```bash
docker compose exec api npx prisma db seed
```

---

## Health check

```bash
curl http://localhost:4000/health
# Verwacht: {"status":"ok","db":"ok","ts":"..."}
```

---

## Container status inspecteren

```bash
docker compose ps
```

---

## Debuggen

### API reageert niet
1. `docker compose logs api` — zoek naar foutmeldingen
2. Controleer of `db` healthy is: `docker compose ps`
3. Controleer `DATABASE_URL` in `.env`

### Database verbindingsfout
1. `docker compose logs db`
2. Wacht 10-15 seconden na opstarten (healthcheck interval)
3. Voer uit: `docker compose restart api`

### AI antwoord mislukt
1. Controleer of `GROQ_API_KEY` correct is in `.env`
2. `docker compose logs api | grep ai_question`

---

## Productie (Railway)

| Service | Platform | URL |
|---------|----------|-----|
| API | Railway | `*.up.railway.app/graphql` |
| Web | Vercel | `*.vercel.app` |
| DB | Railway PostgreSQL | intern |

Environment variables staan in Railway dashboard onder de betreffende service.
