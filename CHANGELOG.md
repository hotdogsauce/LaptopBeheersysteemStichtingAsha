# Changelog

Alle noemenswaardige wijzigingen worden gedocumenteerd in dit bestand.
Format gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/).

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
