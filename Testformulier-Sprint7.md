# Testformulier Sprint 7 — Hardening, Docker & Deploy

**Project:** Stichting Asha Laptopbeheersysteem
**Sprint:** 7
**Tester:** _______________
**Datum:** _______________
**Versie:** v0.4.0

---

## A. Regressie & AI-tests

| ID | Suite | Resultaat | Bewijs | Opmerking |
|----|-------|-----------|--------|-----------|
| T7-REG | Regressie Sprint 4+5 (53 tests) | ☐ Pass ☐ Fail | CI link / `npm test` output | |
| T7-AI | AI-tests Sprint 6 (16 tests) | ☐ Pass ☐ Fail | CI link / `npm test` output | |

**Totaal: 69 tests, verwacht: 69 Pass**

---

## B. End-to-end tests (hoofdprocessen)

| ID | Proces | Scenario | Resultaat | Bewijs |
|----|--------|----------|-----------|--------|
| T7-E2E-01 | UC-01 Reserveren | OWNER vraagt aan → ADMIN keurt goed → HELPDESK wijst laptop toe | ☐ Pass ☐ Fail | |
| T7-E2E-02 | UC-02 Storing | HELPDESK meldt storing → laptop DEFECT → HELPDESK lost op → IN_CONTROL | ☐ Pass ☐ Fail | |
| T7-E2E-03 | UC-06 AI | ADMIN stelt vraag → antwoord ontvangen binnen 10s | ☐ Pass ☐ Fail | |

---

## C. Security/validatie checks

| ID | Check | Stappen | Verwacht | Resultaat | Bewijs |
|----|-------|---------|----------|-----------|--------|
| T7-SEC-01 | Secrets niet in repo | `git log --all -- .env` en `git grep GROQ_API_KEY` | Geen secrets gevonden | ☐ Pass ☐ Fail | |
| T7-SEC-02 | Autorisatie werkt | Stuur `askAI` mutation zonder `x-user-id` header | Error: "Niet ingelogd." | ☐ Pass ☐ Fail | |
| T7-SEC-03 | Inputvalidatie | Stuur `askAI` met lege vraag | Error: "Vraag mag niet leeg zijn." | ☐ Pass ☐ Fail | |
| T7-SEC-04 | AI rate limit | Stuur 11 `askAI` verzoeken in 1 minuut met zelfde user | 11e verzoek geeft fout "Te veel AI-verzoeken" | ☐ Pass ☐ Fail | |

---

## D. Docker security checks

| ID | Check | Stappen | Verwacht | Resultaat | Bewijs |
|----|-------|---------|----------|-----------|--------|
| T7-DKR-SEC-01 | Non-root (api) | `docker compose exec api whoami` | `node` (niet root) | ☐ Pass ☐ Fail | |
| T7-DKR-SEC-02 | no-new-privileges | `grep no-new-privileges docker-compose.yml` | Aanwezig voor api en web | ☐ Pass ☐ Fail | |
| T7-DKR-SEC-03 | DB niet publiek | `docker compose ps` → controleer db ports kolom | Geen `0.0.0.0:5432` mapping | ☐ Pass ☐ Fail | |
| T7-DKR-SEC-04 | Read-only containers | `docker inspect asha-api-1 \| grep ReadonlyRootfs` | `true` | ☐ Pass ☐ Fail | |
| T7-DKR-SEC-05 | Image hygiene | Controleer `FROM` in Dockerfiles en `.dockerignore` aanwezig | Gepinde images, .env uitgesloten | ☐ Pass ☐ Fail | |

---

## E. Docker & deploy checks

| ID | Check | Stappen | Verwacht | Resultaat | Bewijs |
|----|-------|---------|----------|-----------|--------|
| T7-DKR-01 | Compose start | `docker compose up --build` | api, web, db alle `Up` | ☐ Pass ☐ Fail | |
| T7-DKR-02 | Health endpoint | `curl http://localhost:4000/health` | `{"status":"ok","db":"ok"}` | ☐ Pass ☐ Fail | |
| T7-DKR-03 | Persistente DB | `docker compose restart` → open frontend | Data nog aanwezig | ☐ Pass ☐ Fail | |
| T7-DPLY-01 | Internet bereikbaar | Open productie-URL in browser | Systeem laadt, gebruikers zichtbaar | ☐ Pass ☐ Fail | |
| T7-CI-01 | CI pipeline groen | Push naar main → GitHub Actions | Alle jobs groen | ☐ Pass ☐ Fail | CI link: |

---

## F. Bevindingen & fixes

**Top defects:**
-
-

**Fixes (commit):**
-

**Open punten:**
-

---

## Testresultaat samenvatting

| Categorie | Totaal | Pass | Fail |
|-----------|--------|------|------|
| Regressie & AI | 2 | | |
| End-to-end | 3 | | |
| Security | 4 | | |
| Docker security | 5 | | |
| Docker & deploy | 5 | | |
| **Totaal** | **19** | | |

**Eindoordeel:** ☐ Goedgekeurd ☐ Afgekeurd
**Handtekening tester:** _______________
