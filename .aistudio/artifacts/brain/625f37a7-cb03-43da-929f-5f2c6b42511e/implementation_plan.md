# Obligatorisk Google-innlogging og Tilgangskontroll for iPhone

Sikre familiens fellesløsning mot innsyn fra utenforstående ved å innføre en dedikert påloggingsport med Google Auth på iPhone og mobile enheter, der kun forhåndsgodkjente Google-kontoer (med `magnar.totland@gmail.com` som standard) får tilgang til kalendere, bilreservasjoner og oppgaver.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Bekreftede valg fra intervjufasen:**
> - **Obligatorisk innlogging:** Appen krever fullført Google-innlogging før data, kalendere eller menyer vises på iPhone. Uautoriserte gjester eller fremmede får ikke innsyn i noen personlige detaljer.
> - **Godkjente kontoer:** Kun Google-kontoer som er eksplisitt godkjent av familien i innstillingene får adgang. Standard administratorkonto settes til `magnar.totland@gmail.com`.
> - **Enkel administrasjon:** Voksne/administratorer kan legge til og fjerne godkjente familiemedlemmer og e-postadresser direkte under *Innstillinger → Tilgang & Sikkerhet*.

---

### 1. Overview & Core Concept

- **Hva løsningen gjør:** Når appen åpnes på en iPhone eller nettleser der brukeren ikke er autentisert, møtes brukeren av en ren, berøringsvennlig velkomst- og sikkerhetsskjerm med «Logg inn med Google». Når brukeren logger inn, sjekkes e-postadressen mot familiens godkjente liste. Dersom kontoen er godkjent, åpnes dashbordet sømløst. Er kontoen ukjent, stoppes tilgangen og det vises en forklarende melding med mulighet til å bytte konto eller kontakte familieadmin.
- **Målgruppe:** Magnar og familiens medlemmer på personlige iPhones, iPader og fellesenheter.
- **Hovedverdi:** 100 % beskyttelse av personlige avtaler, jobbkalendere og bilbookinger mot uønsket innsyn, samtidig som innloggingen bevares i nettlesersesjonen slik at man slipper å logge inn på nytt ved hver app-åpning.

---

### 2. User Experience & Visual Design

#### A. Brukerflyt ved første gangs bruk på iPhone
1. **Første gangs åpning (Uinnlogget tilstand):**
   - Brukeren ser en ren, innbydende velkomstskjerm: *Totland Familieportal* med subtil undertittel *«Sikker tilgang for familien»*.
   - Ingen kalenderdata, personnavn eller avtaler lastes eller vises i bakgrunnen.
   - En tydelig, 48px høy Google-innloggingsknapp med offisiell Google-logo og teksten *«Fortsett med Google»*.
   - Trygg og tydelig sikkerhetsinfo: *«Kun forhåndsgodkjente Google-kontoer har tilgang til familiens kalendere og data.»*
2. **Innloggingsprosess:**
   - Brukeren trykker knappen. Google-kontovelgeren åpnes.
   - Ved vellykket innlogging verifiseres `user.email`.
   - Hvis godkjent (f.eks. `magnar.totland@gmail.com`): Umiddelbar overgang med myk animasjon til dashbordet. Innloggingsstatus lagres i Firebase Auth og lokal tilstand.
   - Hvis ikke godkjent: Tydelig informasjonskort: *«Kontoen din ([epost]) er ikke registrert i familiens tilgangsliste. Be Magnar legge deg til i innstillingene.»* med knapp for *«Prøv en annen Google-konto»*.
3. **Senere besøk:**
   - Firebase Auth husker sesjonen automatisk (persistent login på iPhone Safari / PWA). Brukeren slipper å logge inn hver gang de åpner appen.
   - Brukerens avatar og e-post vises diskré i toppmenyen med enkel mulighet for utlogging.

#### B. Administrasjon i Innstillinger (*Tilgang og Sikkerhet*)
- Ny fane/seksjon i innstillingspanelet: **Godkjente Google-kontoer for familien**.
- Viser liste over aktive, godkjente e-postadresser:
  - `magnar.totland@gmail.com` (Admin / Eier)
  - Mulighet til å legge til nye e-postadresser (f.eks. ektefelle, barn) med ett klikk.
  - Sletteknapp for å fjerne tilgang umiddelbart dersom en enhet mistes eller tilgang skal trekkes tilbake.

#### C. Visuell stil og ergonomi for iPhone (Touch-first)
- **Tommelsone-optimalisert:** Hovedhandlingen for innlogging plasseres i den naturlige tommelsonen (nederste halvdel av skjermen) med solid berøringsflate (minst 48px høyde, god kontrast).
- **Rolig, nordisk estetikk:** Dyp skifergrå (`#0f172a`), myk hvit bakgrunn, varme aksenter og ingen forstyrrende AI-effekter eller overflødige pille-elementer.
- **Tydelige feilmeldinger:** Dersom Safari blokkerer popup eller nettverket er nede, gis umiddelbar og forståelig veiledning på norsk.

---

### 3. Key Product Decisions & Trade-Offs

- **Beslutning 1: Obligatorisk port for uautentiserte enheter fremfor kun advarsel**
  - *Valgt løsning:* Blokkerende sikkerhetsskjerm før noe innhold eller kalenderdata vises.
  - *Hvorfor:* Gir reell trygghet mot innsyn når lenken deles eller åpnes på ukjente enheter.
  - *Alternativ vurdert:* Valgfri innlogging eller bare skjul kalendere. Forkastet fordi brukeren eksplisitt ba om påkrevd innlogging for å hindre innsyn.
- **Beslutning 2: E-postbasert godkjenningsliste i familiens innstillinger**
  - *Valgt løsning:* `settings.allowedEmails` i familiens Firestore-dokument, med `magnar.totland@gmail.com` som initiell eier.
  - *Hvorfor:* Fleksibelt for Magnar å godkjenne nye enheter og familiemedlemmer uten å måtte konfigurere Firebase Console eller kode.
  - *Alternativ vurdert:* Kun låse til én hardkodet e-post. Forkastet for å støtte hele familien.
- **Beslutning 3: Sesjonspersistens i Firebase Auth**
  - *Valgt løsning:* Benytte standard `browserLocalPersistence` i Firebase Auth slik at iPhone og Safari husker påloggingen.
  - *Hvorfor:* Fantastisk hverdagsbruk – man logger inn én gang ved første gangs bruk, og slipper friksjon i hverdagen.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────────┐
│                       iPhone / Safari                       │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Uautentisert? ───► AuthGate / iPhoneLoginScreen     │   │
│   │                    • "Fortsett med Google"          │   │
│   │                    • Feilhåndtering & Safari popup  │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ signInWithGoogle()           │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Firebase Auth: Returnerer user.email                │   │
│   │ Sjekk: Er email i settings.allowedEmails?          │   │
│   │  ├── JA  ──► Lås opp FamilyContext & vis App        │   │
│   │  └── NEI ──► Vis "Ikke godkjent"-skjerm med loggut  │   │
│   └─────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Familiens Firestore & Innstillinger            │
│   • settings.allowedEmails: ['magnar.totland@gmail.com',...]│
│   • Admin kan legge til / fjerne adresser i AdminSettings   │
│   • Firestore Security Rules sikrer lesing/skriving         │
└─────────────────────────────────────────────────────────────┘
```

#### Nøkkelkomponenter og endringer:
1. **`src/components/AuthGate.tsx`**: Ny sikkerhetskomponent som omslutter appen eller vises når `firebaseUser` mangler eller ikke er autorisert.
2. **`src/types/index.ts` & `src/data/initialData.ts`**: Legge til `allowedEmails: string[]` i `HouseSettings` med `['magnar.totland@gmail.com']` som standard.
3. **`src/context/FamilyContext.tsx`**: Tilby `isEmailAuthorized`, `addAllowedEmail`, `removeAllowedEmail` og lytte på auth-tilstand.
4. **`src/components/AdminSettings.tsx`**: Legge til seksjon for administrasjon av godkjente Google-kontoer.
5. **`src/components/Header.tsx`**: Vise innlogget brukerprofil på mobil og desktop, med ren utloggingsknapp.
