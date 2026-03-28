# Opleverdossier — Stichting Asha Laptopbeheersysteem

**Versie:** v1.0.0
**Datum oplevering:** 2026-03-28
**Opgesteld door:** _______________

---

## Projectoverzicht

Het laptopbeheersysteem van Stichting Asha is een webapplicatie voor het beheren van laptopleningen aan activiteiten. Het systeem ondersteunt drie rollen (Eigenaar, Helpdesk, Beheerder) en bevat AI-ondersteuning voor informatievragen.

**Productie-URL:** _______________
**Repository:** https://github.com/hotdogsauce/LaptopBeheersysteemStichtingAsha
**Eindrelease:** v1.0.0

---

## Inhoudsopgave dossier

### 1. Technische documentatie

| Document | Bestand | Beschrijving |
|----------|---------|--------------|
| Architectuuroverzicht | [Architectuuroverzicht.md](Architectuuroverzicht.md) | Stack, datamodel, Docker, AI, security |
| Runbook | [Runbook.md](Runbook.md) | Starten, stoppen, debuggen, logs |
| Deployment guide | [Deployment-guide.md](Deployment-guide.md) | Lokaal + Railway/Vercel deploy |
| CHANGELOG | [CHANGELOG.md](CHANGELOG.md) | Alle wijzigingen per versie |

### 2. Gebruikersdocumentatie

| Document | Bestand | Beschrijving |
|----------|---------|--------------|
| Gebruikershandleiding | [Gebruikershandleiding.md](Gebruikershandleiding.md) | Handleiding per rol |
| AI gebruikershandleiding | [AI-gebruikershandleiding.md](AI-gebruikershandleiding.md) | Specifiek voor AI assistent |

### 3. Testformulieren

| Sprint | Bestand | Status |
|--------|---------|--------|
| Sprint 5 | [Testformulier-Sprint5.md](Testformulier-Sprint5.md) | Afgerond |
| Sprint 6 | [Testformulier-Sprint6.md](Testformulier-Sprint6.md) | Afgerond |
| Sprint 7 | [Testformulier-Sprint7.md](Testformulier-Sprint7.md) | Afgerond |
| Sprint 8 (UAT) | [Acceptatietestformulier-Sprint8.md](Acceptatietestformulier-Sprint8.md) | In te vullen |

### 4. Acceptatie

| Document | Bestand |
|----------|---------|
| Acceptatietestformulier | [Acceptatietestformulier-Sprint8.md](Acceptatietestformulier-Sprint8.md) |

---

## Geïmplementeerde use cases

| Use case | Sprint | Status |
|----------|--------|--------|
| UC-01: Laptop reserveren | 4 | ✅ Opgeleverd |
| UC-02: Storing melden en oplossen | 5 | ✅ Opgeleverd |
| UC-03: Laptop uit beheer nemen | 5 | ✅ Opgeleverd |
| UC-04: Controle na gebruik (checklist) | 5 | ✅ Opgeleverd |
| UC-05: Software aanvraag | 5 | ✅ Opgeleverd |
| UC-06: AI ondersteuning | 6 | ✅ Opgeleverd |

---

## Testresultaten

| Test | Aantal | Resultaat |
|------|--------|-----------|
| Automatische tests (Vitest) | 69 | ✅ 69/69 geslaagd |
| CI pipeline (GitHub Actions) | — | ✅ Groen |
| Gebruikersacceptatietest | 5 scenario's | In te vullen |

---

## Bekende beperkingen (backlog fase 2)

- Geen e-mailnotificaties bij statuswijzigingen
- Geen inlogscherm / echte authenticatie (nu via dropdown)
- Geen exportfunctie voor rapportages
- Rate limiting AI is in-memory (herstart reset teller)

---

## Overdracht

Het systeem draait volledig automatisch. Bij vragen of problemen:
1. Raadpleeg [Runbook.md](Runbook.md)
2. Bekijk de logs in Railway dashboard
3. Controleer CI status op GitHub Actions
