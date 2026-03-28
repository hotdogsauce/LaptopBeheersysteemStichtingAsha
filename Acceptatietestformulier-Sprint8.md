# Acceptatietestformulier Sprint 8

**Project:** Stichting Asha Laptopbeheersysteem
**Sprint:** 8 (eindoplevering)
**Versie (tag):** v1.0.0
**Datum test:** _______________
**Testomgeving (URL):** _______________
**Deelnemers:** _______________

---

## Acceptatiescenario's

### UAT-01 — UC-01: Laptop reserveren (Eigenaar)

**Rol:** Eigenaar activiteit
**Stappen:**
1. Selecteer een gebruiker met rol **Eigenaar activiteit**
2. Ga naar **Aanvragen**
3. Kies een activiteit, vul een startdatum in (minimaal 2 dagen in de toekomst) en einddatum
4. Klik op **Aanvraag indienen**
5. Selecteer een gebruiker met rol **Beheerder**
6. Ga naar **Reserveringen** — de aanvraag is zichtbaar
7. Keur de aanvraag goed
8. Selecteer een gebruiker met rol **Helpdesk**
9. Ga naar **Overzicht** — wijs een beschikbare laptop toe via **Wijzig**

**Verwacht resultaat:** Aanvraag doorloopt de volledige keten: REQUESTED → APPROVED → laptop RESERVED

| Stap | Resultaat | Opmerking |
|------|-----------|-----------|
| Eigenaar dient aanvraag in | ☐ Akkoord ☐ Afgekeurd | |
| Aanvraag zichtbaar bij beheerder | ☐ Akkoord ☐ Afgekeurd | |
| Beheerder keurt goed | ☐ Akkoord ☐ Afgekeurd | |
| Helpdesk wijst laptop toe | ☐ Akkoord ☐ Afgekeurd | |

**Scenario eindoordeel:** ☐ Akkoord ☐ Afgekeurd

---

### UAT-02 — Storing melden en oplossen (Helpdesk)

**Rol:** Helpdesk
**Stappen:**
1. Selecteer een gebruiker met rol **Helpdesk**
2. Ga naar **Storingen**
3. Meld een storing voor een beschikbare laptop met een omschrijving
4. Controleer of de laptop status DEFECT is geworden in het Overzicht
5. Los de storing op met een oplossingsnotitie
6. Controleer of de laptop naar IN_CONTROL is gegaan

**Verwacht resultaat:** Storing gemeld → laptop DEFECT → storing opgelost → laptop IN_CONTROL

| Stap | Resultaat | Opmerking |
|------|-----------|-----------|
| Storing melden werkt | ☐ Akkoord ☐ Afgekeurd | |
| Laptop status wordt DEFECT | ☐ Akkoord ☐ Afgekeurd | |
| Storing oplossen werkt | ☐ Akkoord ☐ Afgekeurd | |
| Laptop wordt IN_CONTROL | ☐ Akkoord ☐ Afgekeurd | |

**Scenario eindoordeel:** ☐ Akkoord ☐ Afgekeurd

---

### UAT-03 — Laptop uit beheer nemen (Beheerder)

**Rol:** Beheerder
**Stappen:**
1. Selecteer een gebruiker met rol **Beheerder**
2. Ga naar **Beheer**
3. Kies een actieve laptop die niet RESERVED of IN_USE is
4. Klik op **Uit beheer** en vul een reden in
5. Bevestig de actie
6. Controleer dat de laptop verschijnt in de lijst "Uit beheer genomen"

**Verwacht resultaat:** Laptop krijgt status OUT_OF_SERVICE en is niet meer beschikbaar

| Stap | Resultaat | Opmerking |
|------|-----------|-----------|
| Uit beheer knop zichtbaar | ☐ Akkoord ☐ Afgekeurd | |
| Reden verplicht (leeg = fout) | ☐ Akkoord ☐ Afgekeurd | |
| Laptop wordt OUT_OF_SERVICE | ☐ Akkoord ☐ Afgekeurd | |
| Laptop in lijst uit-beheer | ☐ Akkoord ☐ Afgekeurd | |

**Scenario eindoordeel:** ☐ Akkoord ☐ Afgekeurd

---

### UAT-04 — AI ondersteuning (alle rollen)

**Stappen:**
1. Selecteer een gebruiker met rol **Beheerder**
2. Ga naar **AI assistent**
3. Stel de vraag: "Hoeveel laptops zijn beschikbaar?"
4. Controleer of het antwoord klopt met de lijst in Overzicht
5. Stel de vraag: "Keur de eerste reservering goed"
6. Controleer dat de AI dit weigert en doorverwijst

**Verwacht resultaat:** AI geeft feitelijk antwoord op informatievragen; weigert beslissingen te nemen

| Stap | Resultaat | Opmerking |
|------|-----------|-----------|
| Informatievraag beantwoord | ☐ Akkoord ☐ Afgekeurd | |
| Beslissingsvraag geweigerd | ☐ Akkoord ☐ Afgekeurd | |
| Antwoord klopt met werkelijkheid | ☐ Akkoord ☐ Afgekeurd | |

**Scenario eindoordeel:** ☐ Akkoord ☐ Afgekeurd

---

### UAT-05 — Rolbeperkingen (beveiliging)

**Stappen:**
1. Selecteer een **Eigenaar** — controleer dat Beheer en Storingen niet zichtbaar zijn
2. Selecteer een **Helpdesk** — controleer dat Reserveringen niet zichtbaar is
3. Probeer als Eigenaar naar `/beheer` te navigeren — verwacht: foutmelding "alleen beheerders"

**Verwacht resultaat:** Elke rol ziet alleen wat hij mag zien

| Stap | Resultaat | Opmerking |
|------|-----------|-----------|
| Eigenaar heeft beperkt menu | ☐ Akkoord ☐ Afgekeurd | |
| Helpdesk heeft beperkt menu | ☐ Akkoord ☐ Afgekeurd | |
| Directe URL-toegang geblokkeerd | ☐ Akkoord ☐ Afgekeurd | |

**Scenario eindoordeel:** ☐ Akkoord ☐ Afgekeurd

---

## Acceptatiebesluit

☐ **Geaccepteerd zonder voorbehoud**
☐ **Geaccepteerd met opmerkingen** (zie hieronder)
☐ **Niet geaccepteerd** (zie opmerkingen)

**Opmerkingen:**

_______________________________________________________________

_______________________________________________________________

**Naam en akkoord product owner:** _______________________________________________________________

**Datum:** _______________________________________________________________

---

## Backlog fase 2 (niet-kritieke wensen)

Wensen die buiten de MVP-scope vallen en eventueel in een volgende fase kunnen worden opgepakt:

| # | Wens | Prioriteit |
|---|------|-----------|
| 1 | | |
| 2 | | |
| 3 | | |
