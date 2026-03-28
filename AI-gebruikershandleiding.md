# AI Gebruikershandleiding — Stichting Asha Laptopbeheersysteem

## Wat is de AI assistent?

De AI assistent is een hulpfunctie in het laptopbeheersysteem waarmee je vragen kunt stellen over de huidige staat van het systeem. De AI geeft antwoorden op basis van actuele gegevens die horen bij jouw rol.

---

## Hoe gebruik je de AI assistent?

1. **Selecteer een gebruiker** via de navigatiebalk bovenaan.
2. Klik op **AI assistent** in het zijmenu.
3. Typ je vraag in het tekstveld (maximaal 500 tekens).
4. Druk op **Enter** of klik op **Vraag stellen**.
5. Wacht een moment — de AI verwerkt je vraag.
6. Lees het antwoord in het antwoordvak.
7. Klik op **Nieuwe vraag** om een volgende vraag te stellen.

---

## Wat kun je vragen per rol?

### Beheerder (ADMIN)
De AI heeft toegang tot:
- Alle laptops en hun status
- Openstaande reserveringsaanvragen
- Open storingen
- Openstaande softwareaanvragen

Voorbeeldvragen:
- "Hoeveel laptops zijn momenteel beschikbaar?"
- "Zijn er openstaande reserveringsaanvragen?"
- "Welke laptops zijn defect?"
- "Zijn er open softwareaanvragen?"

### Eigenaar activiteit (OWNER)
De AI heeft toegang tot:
- Jouw eigen reserveringen
- Beschikbare activiteiten

Voorbeeldvragen:
- "Welke reserveringen heb ik aangevraagd?"
- "Wat is de status van mijn reservering?"
- "Welke activiteiten zijn er beschikbaar?"

### Helpdesk (HELPDESK)
De AI heeft toegang tot:
- Open (onopgeloste) storingen
- Laptops met status IN_CONTROL

Voorbeeldvragen:
- "Zijn er open storingen?"
- "Welke laptops moeten worden gecontroleerd?"
- "Wie heeft welke storing gemeld?"

---

## Beperkingen van de AI

| Beperking | Uitleg |
|-----------|--------|
| Geen beslissingen | De AI kan reserveringen niet goedkeuren of afwijzen. Gebruik hiervoor de pagina Reserveringen. |
| Geen datawijzigingen | De AI kan geen laptops aanmaken, statussen wijzigen of aanvragen verwerken. |
| Alleen eigen data | De AI ziet alleen data die past bij jouw rol. |
| Maximaal 500 tekens | Vragen zijn beperkt tot 500 tekens. |
| Geen fabricatie | Als informatie niet beschikbaar is, zegt de AI dat eerlijk. |

---

## Veelgestelde vragen

**Kan de AI mijn reservering goedkeuren?**
Nee. De AI kan uitsluitend informatie geven. Reserveringen beoordelen doe je via de pagina Reserveringen (ADMIN).

**Wat als de AI het antwoord niet weet?**
De AI geeft dan eerlijk aan dat de informatie niet beschikbaar is in de contextdata.

**Zijn mijn vragen privé?**
De vragen worden verwerkt via de Anthropic API. De AI ontvangt uitsluitend de contextdata die hoort bij jouw rol — nooit data van andere rollen.

**Wat betekent "AI verwerkt je vraag..."?**
De vraag wordt verstuurd naar het systeem. Dit duurt gemiddeld 2–5 seconden.

---

## Technische achtergrond

De AI assistent werkt als volgt:
1. Je stelt een vraag via de interface.
2. Het systeem bepaalt jouw rol via de geselecteerde gebruiker.
3. Relevante systeemdata wordt opgehaald via Prisma (zelfde autorisatielaag als de GraphQL API).
4. De vraag + contextdata wordt naar Claude (Anthropic) gestuurd met een systeemsinstruct die fabricatie en beslissingen verbiedt.
5. Het antwoord wordt weergegeven in de interface.

**Model:** Claude Opus 4.6 (`claude-opus-4-6`)
