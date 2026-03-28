# Changelog

Alle noemenswaardige wijzigingen worden gedocumenteerd in dit bestand.
Format gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

---

## [0.4.0] - 2026-03-28

### Toegevoegd

#### Docker
- `apps/api/Dockerfile` — node:20-slim, non-root (`USER node`), OpenSSL, Prisma generate
- `apps/web/Dockerfile` — multi-stage build (deps → builder → runner), non-root user `nextjs`
- `docker-compose.yml` — volledig herschreven met security hardening:
  - `db`: alleen intern bereikbaar (geen publieke port), healthcheck, volume persistentie
  - `api`: `no-new-privileges`, `read_only: true`, `tmpfs /tmp`, healthcheck op `/health`
  - `web`: `no-new-privileges`, `read_only: true`, depends on api healthcheck
  - Twee gescheiden netwerken: `backend` (db↔api) en `frontend` (api↔web)
- `.env.example` — template met alle vereiste variabelen
- `apps/api/.dockerignore` en `apps/web/.dockerignore`

#### CI/CD
- `.github/workflows/ci.yml` — GitHub Actions pipeline:
  - PostgreSQL service container voor integratietests
  - Prisma migrate + alle 69 tests
  - Next.js build verificatie
  - Triggered op push/PR naar main

#### Hardening
- `apps/api/src/utils.ts` — `checkAiRateLimit` (10 req/min per user) + `logAudit` (JSON naar stdout)
- Rate limiting toegevoegd aan `askAI` resolver
- Audit logging voor: `reservation_reviewed`, `software_request_reviewed`, `laptop_status_changed`, `ai_question`
- `/health` GET endpoint — controleert DB bereikbaarheid, retourneert JSON status
- `maskedErrors: true` — geen stacktraces naar gebruikers
- `PORT` instelbaar via environment variable

#### Next.js
- `output: 'standalone'` in `next.config.ts` voor Docker-compatibele build

#### Documentatie
- `Runbook.md` — starten, stoppen, debuggen, logs, healthcheck
- `Deployment-guide.md` — lokaal Docker + Railway/Vercel productie
- `Testformulier-Sprint7.md` — 19 testcases

### Testresultaat
- 7 testbestanden, **69 tests**, 69 geslaagd, 0 mislukt

---

## [0.3.0] - 2026-03-28

### Toegevoegd

#### UC-06: AI ondersteuning
- `askAI(question: String!): String!` mutation — alle rollen kunnen vragen stellen in natuurlijke taal
- `apps/api/src/ai/aiService.ts` — rolgebaseerde contextophaling via Prisma + Claude API aanroep
  - ADMIN: alle laptops, openstaande reserveringen, open storingen, openstaande softwareaanvragen
  - OWNER: eigen reserveringen + beschikbare activiteiten
  - HELPDESK: open storingen + IN_CONTROL laptops
- Systeemsinstruct verbiedt de AI expliciet beslissingen te nemen of data te wijzigen
- Inputvalidatie: lege vraag geblokkeerd, maximaal 500 tekens
- Frontend pagina: `/ai` (ADMIN, OWNER, HELPDESK) met vraagveld en antwoordweergave
- Navigatie: "AI assistent" toegevoegd aan zijmenu voor alle drie rollen
- 11 nieuwe tests in `uc06-ai.test.ts` (7 business rules + 3 negatief + 4 functioneel + 2 regressie)
- `@anthropic-ai/sdk` toegevoegd als dependency (model: claude-opus-4-6)
- `AI-gebruikershandleiding.md` — uitleg per rol met voorbeeldvragen en beperkingen
- `Testformulier-Sprint6.md` — 14 testcases (5 functioneel, 6 negatief, 3 regressie)

### Gewijzigd
- `typeDefs.ts` — `askAI` mutation toegevoegd onder Sprint 6
- `resolvers.ts` — `askAI` resolver met `requireRole` + inputvalidatie + aiService call
- `components/Layout.tsx` — "AI assistent" nav-item voor ADMIN, OWNER en HELPDESK

### Testresultaat
- 7 testbestanden, **69 tests**, 69 geslaagd, 0 mislukt

---

## [0.2.0] - 2026-03-27

### Toegevoegd

#### UC-02: Storing melden en oplossen
- `reportIssue` mutation — HELPDESK meldt storing met verplichte omschrijving; laptop → DEFECT
- `resolveIssue` mutation — HELPDESK sluit storing af met verplichte oplossingsnotitie; laptop → IN_CONTROL
- `openIssues` en `issuesByLaptop` queries
- Prisma model: `Issue`
- Frontend pagina: `/storingen` (HELPDESK)
- 6 business rule tests + 1 E2E test

#### UC-04: Controle na gebruik (checklist)
- `submitChecklist` mutation — HELPDESK doorloopt 5-item checklist voor IN_CONTROL laptop
  - Alles OK → AVAILABLE; één item mislukt → DEFECT
- `checklistsByLaptop` query
- Prisma model: `ChecklistReport`
- Frontend pagina: `/controle` (HELPDESK) met interactieve checklist
- 6 business rule tests + 1 E2E test

#### UC-03: Laptop uit beheer nemen
- `decommissionLaptop` mutation — ADMIN neemt laptop definitief uit beheer met verplichte reden
  - Geblokkeerd voor RESERVED/IN_USE laptops (verwijderverbod)
  - Aangemaakt `DecommissionLog` voor audittrail
- `decommissionedLaptops` en `decommissionLog` queries
- Prisma model: `DecommissionLog`
- Frontend pagina: `/beheer` (ADMIN) met bevestigingsflow
- 6 business rule tests + 1 E2E test

#### UC-05: Software aanvraag
- `requestSoftware` mutation — OWNER vraagt software aan per activiteit
  - Minimaal 2 dagen voor startdatum activiteit
- `reviewSoftwareRequest` mutation — ADMIN keurt goed of af (reden verplicht bij afwijzing)
- `pendingSoftwareRequests` en `mySoftwareRequests` queries
- Prisma model: `SoftwareRequest` met enum `SoftwareRequestStatus`
- Frontend pagina: `/software` (OWNER + ADMIN)
- 6 business rule tests + 1 E2E test

#### Overige
- Navigatiemenu in laptopoverzicht — rolgebaseerde links naar alle processen
- GraphQL queries `users` en `activities` (Sprint 4 backfill)

### Gewijzigd
- `schema.prisma` — 4 nieuwe modellen, 1 nieuw enum
- `typeDefs.ts` — 4 nieuwe types, 10 nieuwe queries, 6 nieuwe mutations
- `resolvers.ts` — alle nieuwe mutations met business rule afdwinging
- `index.tsx` — rolgebaseerde navigatie uitgebreid

---

## [0.1.0] - 2026-03-27

### Toegevoegd

#### UC-01: Laptop reserveren (Sprint 4 MVP)
- GraphQL schema met alle types, queries en mutations uit het contract
- Prisma modellen: User, Laptop, Activity, Reservation
- Rolgebaseerde autorisatie via `x-user-id` header (OWNER, ADMIN, HELPDESK)
- Statusovergangen centraal gecontroleerd (`checkTransition`)
- Seed data: 5 laptops, 3 gebruikers, 1 activiteit
- 6 business rule tests + 1 E2E test UC-01

#### Frontend MVP
- `/` — laptopoverzicht met statusbadges, laptop aanmaken (ADMIN/HELPDESK), status wijzigen (HELPDESK)
- `/reserveringen` — ADMIN beoordeelt aanvragen
- `/aanvragen` — OWNER vraagt laptops aan, ziet eigen aanvragen

#### Infra
- Docker Compose met PostgreSQL (poort 5433)
- Railway deployment (backend + database)
- Vercel deployment (frontend)
