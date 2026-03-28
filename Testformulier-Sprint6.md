# Testformulier Sprint 6 — AI Ondersteuning

**Project:** Stichting Asha Laptopbeheersysteem
**Sprint:** 6
**Use Case:** UC-06 AI vraagfunctie
**Tester:** _______________
**Datum:** _______________
**Versie:** v0.3.0

---

## Testomgeving

| Item | Waarde |
|------|--------|
| API URL | `https://laptopbeheersysteemstichtingasha-production.up.railway.app/graphql` |
| Frontend URL | Vercel (productie) |
| Model | `claude-opus-4-6` |
| ANTHROPIC_API_KEY | Geconfigureerd als Railway environment variable |

---

## Functionele tests

### F-01: ADMIN stelt een geldige vraag

**Precondities:** Gebruiker met rol ADMIN is geselecteerd
**Stappen:**
1. Navigeer naar AI assistent
2. Typ: "Hoeveel laptops zijn momenteel beschikbaar?"
3. Klik op Vraag stellen

**Verwacht resultaat:** Antwoord toont het aantal beschikbare laptops op basis van actuele data
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### F-02: OWNER stelt een geldige vraag

**Precondities:** Gebruiker met rol OWNER is geselecteerd
**Stappen:**
1. Navigeer naar AI assistent
2. Typ: "Welke reserveringen heb ik aangevraagd?"
3. Klik op Vraag stellen

**Verwacht resultaat:** Antwoord toont de reserveringen van de ingelogde OWNER
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### F-03: HELPDESK stelt een geldige vraag

**Precondities:** Gebruiker met rol HELPDESK is geselecteerd
**Stappen:**
1. Navigeer naar AI assistent
2. Typ: "Zijn er open storingen?"
3. Klik op Vraag stellen

**Verwacht resultaat:** Antwoord toont de open storingen of meldt dat er geen zijn
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### F-04: Antwoord is gebaseerd op actuele data

**Precondities:** Er is minstens één laptop met status AVAILABLE
**Stappen:**
1. Selecteer een ADMIN gebruiker
2. Stel de vraag: "Welke laptops zijn beschikbaar?"
3. Vergelijk het antwoord met de lijst in Overzicht

**Verwacht resultaat:** De AI noemt laptops die ook in het Overzicht staan
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### F-05: Nieuwe vraag knop werkt

**Precondities:** Er is een antwoord zichtbaar
**Stappen:**
1. Klik op Nieuwe vraag

**Verwacht resultaat:** Antwoord verdwijnt, tekstveld wordt leeg
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

## Negatieve tests

### N-01: Geen gebruiker geselecteerd

**Precondities:** Geen gebruiker geselecteerd (lege selector)
**Stappen:**
1. Navigeer naar AI assistent

**Verwacht resultaat:** Leeg-state zichtbaar met instructie om een gebruiker te selecteren. Knop Vraag stellen is niet beschikbaar.
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### N-02: Lege vraag ingediend

**Precondities:** ADMIN geselecteerd
**Stappen:**
1. Laat het tekstveld leeg
2. Klik op Vraag stellen (of gebruik Enter)

**Verwacht resultaat:** Foutmelding "Voer een vraag in." — geen API call
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### N-03: Vraag langer dan 500 tekens

**Precondities:** ADMIN geselecteerd
**Stappen:**
1. Typ een vraag van meer dan 500 tekens
2. Klik op Vraag stellen

**Verwacht resultaat:** Foutmelding "Vraag mag maximaal 500 tekens bevatten."
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### N-04: AI weigert beslissing te nemen

**Precondities:** ADMIN geselecteerd
**Stappen:**
1. Stel de vraag: "Keur de reservering van de eerste aanvrager goed"
2. Lees het antwoord

**Verwacht resultaat:** AI geeft aan dat het geen beslissingen kan nemen en verwijst door
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### N-05: AI verzint geen informatie bij onduidelijke vraag

**Precondities:** HELPDESK geselecteerd
**Stappen:**
1. Stel een willekeurige onzinnige vraag: "xkjhalksjdhf"

**Verwacht resultaat:** AI geeft toe dat het de vraag niet begrijpt of dat de informatie niet beschikbaar is
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### N-06: OWNER krijgt geen ADMIN-data

**Precondities:** OWNER geselecteerd
**Stappen:**
1. Stel de vraag: "Geef een overzicht van alle laptops in het systeem"
2. Controleer of het antwoord enkel eigen reserveringsdata bevat

**Verwacht resultaat:** AI antwoordt alleen op basis van OWNER-contextdata (eigen reserveringen, activiteiten) — geen volledige laptoplijst
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

## Regressietests

### R-01: Bestaande pagina's werken nog

**Stappen:**
1. Navigeer naar Overzicht, Reserveringen, Beheer, Storingen, Controle

**Verwacht resultaat:** Alle pagina's laden correct, geen fouten in de console
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### R-02: Navigatie toont AI assistent voor alle rollen

**Stappen:**
1. Selecteer ADMIN → controleer zijmenu
2. Selecteer OWNER → controleer zijmenu
3. Selecteer HELPDESK → controleer zijmenu

**Verwacht resultaat:** "AI assistent" staat bij alle drie de rollen in het zijmenu
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Opmerking:** _______________

---

### R-03: Alle 69 tests slagen

**Stappen:**
1. Voer uit: `cd apps/api && npm test`

**Verwacht resultaat:** 7 testbestanden, 69 tests, alles geslaagd
**Resultaat:** ☐ Geslaagd ☐ Mislukt
**Output:** _______________

---

## Testresultaat samenvatting

| Categorie | Totaal | Geslaagd | Mislukt |
|-----------|--------|----------|---------|
| Functioneel | 5 | ___ | ___ |
| Negatief | 6 | ___ | ___ |
| Regressie | 3 | ___ | ___ |
| **Totaal** | **14** | **___** | **___** |

**Eindoordeel:** ☐ Goedgekeurd ☐ Afgekeurd
**Handtekening tester:** _______________
