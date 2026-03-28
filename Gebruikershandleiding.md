# Gebruikershandleiding — Stichting Asha Laptopbeheersysteem

## Inleiding

Het laptopbeheersysteem van Stichting Asha is een webapplicatie voor het beheren van laptops die worden uitgeleend aan activiteiten. Het systeem heeft drie rollen met elk hun eigen taken.

---

## Inloggen

Er is geen inlogformulier. Selecteer je gebruiker via het dropdownmenu rechtsboven in de navigatiebalk. Hierna verschijnt je persoonlijk menu in de zijbalk.

---

## Rol: Eigenaar activiteit

### Laptop reserveren

1. Klik op **Aanvragen** in het zijmenu.
2. Kies een activiteit uit de lijst.
3. Vul een startdatum in (minimaal 2 dagen in de toekomst).
4. Vul een einddatum in.
5. Klik op **Aanvraag indienen**.

Je aanvraag heeft nu status **Aangevraagd**. Je ontvangt geen e-mail — controleer de status zelf via **Aanvragen**.

### Software aanvragen

1. Ga naar **Software** in het zijmenu.
2. Kies een activiteit en vul de naam van de benodigde software in.
3. Voeg eventueel een toelichting toe.
4. Klik op **Aanvraag indienen**.

Let op: software aanvragen moet minimaal 2 dagen voor de startdatum van de activiteit.

### AI assistent

Stel vragen over je reserveringen via de **AI assistent** pagina. Zie [AI-gebruikershandleiding.md](AI-gebruikershandleiding.md) voor details.

---

## Rol: Helpdesk

### Laptopoverzicht en status wijzigen

1. Ga naar **Overzicht**.
2. Zoek de betreffende laptop op.
3. Klik op **Wijzig** om de status aan te passen.

Toegestane statusovergangen:
- GERESERVEERD → IN GEBRUIK of BESCHIKBAAR
- IN GEBRUIK → IN CONTROLE
- IN CONTROLE → BESCHIKBAAR, DEFECT of VERMIST

### Storing melden

1. Ga naar **Storingen**.
2. Selecteer de laptop waarop de storing is geconstateerd.
3. Beschrijf de storing zo duidelijk mogelijk.
4. Klik op **Storing melden**.

De laptop krijgt automatisch status **DEFECT**.

### Storing oplossen

1. Ga naar **Storingen** → sectie **Open storingen**.
2. Klik op **Oplossen** naast de betreffende storing.
3. Beschrijf de uitgevoerde oplossing.
4. Klik op **Opslaan**.

De laptop gaat automatisch naar status **IN CONTROLE**.

### Controle na gebruik (checklist)

1. Ga naar **Controle**.
2. Selecteer een laptop met status **IN CONTROLE**.
3. Doorloop de 5 checkpunten eerlijk.
4. Klik op **Indienen**.

- Alles OK → laptop wordt **BESCHIKBAAR**
- Één punt mislukt → laptop wordt **DEFECT** (nieuwe storing aanmaken)

---

## Rol: Beheerder

### Reserveringen beoordelen

1. Ga naar **Reserveringen**.
2. Open een openstaande aanvraag.
3. Keur goed of af. Bij afwijzing is een reden verplicht.

### Laptop toevoegen

1. Ga naar **Overzicht**.
2. Klik op **+ Laptop toevoegen**.
3. Vul merk/type en eventuele specificaties in.
4. Geef aan of de laptop VGA en/of HDMI heeft.
5. Klik op **Aanmaken**.

### Laptop uit beheer nemen

1. Ga naar **Beheer**.
2. Klik op **Uit beheer** naast de betreffende laptop.
3. Vul een reden in (verplicht).
4. Klik op **Bevestig: uit beheer nemen**.

Let op: laptops met status GERESERVEERD of IN GEBRUIK kunnen niet uit beheer worden genomen.

### Software aanvragen beoordelen

1. Ga naar **Software**.
2. Bekijk de openstaande aanvragen.
3. Keur goed of af. Bij afwijzing is een reden verplicht.

---

## Donkere modus

Klik op het kleine rondje rechtsboven naast de gebruikersselector om te wisselen tussen licht en donker thema. De voorkeur wordt onthouden.

---

## Foutmeldingen

| Foutmelding | Oorzaak | Oplossing |
|-------------|---------|-----------|
| Selecteer een gebruiker | Geen gebruiker geselecteerd | Kies een gebruiker via dropdown |
| Reservering moet minimaal 2 dagen van tevoren | Startdatum te vroeg | Kies een latere datum |
| Merk/type is verplicht | Leeg formulier | Vul het veld in |
| Toegang geweigerd | Verkeerde rol voor deze actie | Schakel naar de juiste gebruiker |
| Te veel AI-verzoeken | Meer dan 10 AI vragen per minuut | Wacht een minuut |
