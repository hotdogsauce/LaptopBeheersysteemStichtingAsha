# Architectuuroverzicht — Stichting Asha Laptopbeheersysteem

## Systeemoverzicht

```
┌─────────────────────────────────────────────────────────┐
│                        Internet                         │
└────────────────┬──────────────────────┬─────────────────┘
                 │                      │
         ┌───────▼───────┐    ┌─────────▼────────┐
         │  Vercel (Web) │    │ Railway (API+DB)  │
         │  Next.js 15   │    │                  │
         │  Port 3000    │───▶│ GraphQL Yoga      │
         └───────────────┘    │ Port 4000         │
                              │       │           │
                              │  PostgreSQL 16    │
                              │  (intern)         │
                              └──────────────────┘
```

## Technische stack

| Laag | Technologie | Versie |
|------|-------------|--------|
| Frontend | Next.js (Pages Router) | 15 |
| Styling | Tailwind CSS + CSS custom properties | 4 |
| API | GraphQL Yoga | 5 |
| ORM | Prisma | 5.22 |
| Database | PostgreSQL | 16 |
| Runtime | Node.js | 20 |
| Taal | TypeScript | 5 |
| Tests | Vitest | 4 |
| AI model | Groq — LLaMA 3.3 70B Versatile | via API |

---

## Docker architectuur (lokaal)

```
docker-compose.yml
├── db (postgres:16-alpine)
│   ├── Intern netwerk: backend
│   ├── Geen publieke port (security)
│   ├── Volume: postgres_data (persistentie)
│   └── Healthcheck: pg_isready
│
├── api (node:20-slim)
│   ├── Netwerken: backend + frontend
│   ├── Port: 4000 (publiek)
│   ├── Non-root: USER node
│   ├── read_only: true + tmpfs /tmp
│   ├── no-new-privileges: true
│   └── Healthcheck: GET /health
│
└── web (node:20-slim, multi-stage)
    ├── Netwerk: frontend
    ├── Port: 3000 (publiek)
    ├── Non-root: USER nextjs
    ├── read_only: true + tmpfs /tmp
    └── no-new-privileges: true
```

---

## AI integratie (UC-06)

```
Gebruiker
   │ Stel vraag (max 500 tekens)
   ▼
GraphQL mutation: askAI(question)
   │
   ├── requireRole (ADMIN / OWNER / HELPDESK)
   ├── Rate limit check (10 req/min per user)
   ├── Audit log → stdout
   │
   ▼
aiService.fetchContext(userId, role)
   │ Haalt rolspecifieke data op via Prisma
   │
   ├── ADMIN: alle laptops + openstaande reserveringen
   │         + open storingen + openstaande softwareaanvragen
   ├── OWNER: eigen reserveringen + beschikbare activiteiten
   └── HELPDESK: open storingen + IN_CONTROL laptops
   │
   ▼
Groq API (llama-3.3-70b-versatile)
   │ System prompt: lees-only, geen beslissingen, geen fabricatie
   │ Context: Prisma-data als JSON
   │ Vraag: gebruikersvraag
   │
   ▼
Antwoord → gebruiker
```

---

## Datamodel

```
User (id, name, role, email)
  │
  ├── Reservation (requesterId, activityId, status, startDate, endDate)
  │     ├── Activity (id, title, software_benodigdheden, start_datum_tijd)
  │     ├── approver → User
  │     └── laptops ←→ Laptop (many-to-many)
  │
  ├── Issue (laptopId, reportedById, description, resolved, solution)
  │
  ├── ChecklistReport (laptopId, submittedById, 5 booleans, passed)
  │
  ├── DecommissionLog (laptopId, doneById, reden, datum)
  │
  └── SoftwareRequest (requesterId, activityId, title, status)

Laptop (id, merk_type, status, specificaties, heeft_vga, heeft_hdmi)
```

---

## Rolbevoegdheden

| Actie | OWNER | HELPDESK | ADMIN |
|-------|-------|----------|-------|
| Laptops bekijken | ✅ | ✅ | ✅ |
| Laptop aanmaken | ❌ | ✅ | ✅ |
| Reservering aanvragen | ✅ | ❌ | ❌ |
| Reservering beoordelen | ❌ | ❌ | ✅ |
| Laptop toewijzen | ❌ | ✅ | ❌ |
| Storing melden/oplossen | ❌ | ✅ | ❌ |
| Checklist indienen | ❌ | ✅ | ❌ |
| Laptop uit beheer | ❌ | ❌ | ✅ |
| Software aanvragen | ✅ | ❌ | ❌ |
| Software beoordelen | ❌ | ❌ | ✅ |
| AI assistent | ✅ | ✅ | ✅ |

---

## CI/CD pipeline

```
git push → GitHub
   │
   └── GitHub Actions (.github/workflows/ci.yml)
         ├── PostgreSQL service container (test-database)
         ├── npm ci
         ├── prisma generate + migrate deploy
         ├── vitest run (69 tests)
         └── next build
               │
               └── Groen → Railway herstart automatisch
                         → Vercel bouwt automatisch
```

---

## Security maatregelen

| Maatregel | Implementatie |
|-----------|---------------|
| Authenticatie | `x-user-id` header → Prisma user lookup |
| Autorisatie | `requireRole()` in elke resolver |
| Inputvalidatie | Per mutation (leeg, lengte, status) |
| Rate limiting | 10 AI-verzoeken/min per gebruiker (in-memory) |
| Secrets | `.env` niet in repo; Railway/Vercel environment vars |
| Stacktraces | `maskedErrors: true` in GraphQL Yoga |
| Audit logging | JSON naar stdout voor beslissingen en AI-vragen |
| Docker: non-root | `USER node` / `USER nextjs` in Dockerfiles |
| Docker: read-only | `read_only: true` + `tmpfs /tmp` |
| Docker: privileges | `no-new-privileges: true` |
| DB isolatie | Geen publieke port voor PostgreSQL |
