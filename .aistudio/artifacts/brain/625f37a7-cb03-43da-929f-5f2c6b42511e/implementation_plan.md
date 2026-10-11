# Implementeringsplan: Integrering av Magnars kalendere & felles skylagring (Firestore)

## 1. Bakgrunn & Formål
Brukeren har oppgitt to konkrete iCal-adresser for henholdsvis privat- og jobbkalender:
1. **Magnar privat**: `https://calendar.google.com/calendar/ical/magnar.totland%40gmail.com/private-66fe708fcd5f1b4512bc2b290771bd6d/basic.ics`
2. **Magnar jobb**: `https://calendar.google.com/calendar/ical/1963c127a57e7b3059e7ad5bafb035b9ddb653f1143a3f5ee723a0b1cec7637e%40group.calendar.google.com/private-816d2421b052b34fcb11b9142ecc975d/basic.ics`

Målet er å sikre at:
- Disse kalenderne automatisk legges inn som standard og gjøres tilgjengelige i den felles sky-databasen (Firestore).
- Når noen åpner den publiserte/delte live-appen på en ny nettleser, mobil eller veggskjerm (uten å være eksplisitt innlogget med Google Auth), skal kalenderne og avtalene **alltid vises umiddelbart**.
- Nye kalendere eller innstillinger som legges til i appen skrives direkte til Firestore slik at alle enheter synkroniseres sømløst.

---

## 2. Arkitektur & Løsningssteg

### Steg 1: Standardkonfigurasjon med de to iCal-kalenderne
- Oppdatere standarddata (`src/data/initialData.ts`) med de to konkrete iCal-lenkene:
  - **Magnar privat**: Koblet til Magnar (`member_magnar`), visningsfarge smaragdgrønn (`#059669`), aktiv for visning.
  - **Magnar jobb**: Koblet til Magnar (`member_magnar`), visningsfarge kongeblå (`#2563eb`), markert som bil-kalender (`isCarCalendar: true`) for automatisk evaluering av reiser og bilreservasjon.
- Sørge for at appen automatisk initialiserer og lagrer disse i Firestore dersom de ikke allerede finnes i skyen.

### Steg 2: Firestore-synkronisering uavhengig av innloggingstilstand
- I `FamilyContext.tsx` aktiveres Firestore-lyttere (`subscribeSettings`, `subscribeCalendarEvents`, `subscribeReservations`, osv.) umiddelbart ved oppstart, ikke kun etter at en bruker har logget inn med Google-konto.
- Ved endring i kalendere i innstillinger (legge til ny iCal, slå av/på visning, endre farge/navn) lagres dette direkte til Firestore under fellesdokumentet for familien `totland`.
- Når enhetene lytter på `onSnapshot`, vil enhver oppdatering på én enhet speiles direkte på alle andre enheter i sanntid.

### Steg 3: Oppdatering av Firestore Sikkerhetsregler (`firestore.rules`)
- Tidligere krevde `isFamilyMember()` at `request.auth` var verifisert og matchet `magnar.totland@gmail.com`. Dette sperret uinnloggede fellesenheter (f.eks. nettbrett på kjøkkenet eller live-visning).
- Justere reglene slik at:
  - Lesing (`get` og `list`) av familiens ressurser (`familyId == 'totland'`) tillates for husholdningen.
  - Skriving/oppdatering av kalenderinnstillinger og felleshendelser tillates validert i henhold til datastrukturene.
  - Deployere de oppdaterte reglene til prosjektet via Firebase-verktøyene.

### Steg 4: Henting og caching av iCal-hendelser
- Verifisere at iCal-proxyen og parsing i `googleCalendarService.ts` og `icalFeed.ts` henter begge iCal-feeder uten CORS-feil.
- Kjøre automatisk bakgrunnssynkronisering ved oppstart og med intervall, slik at avtaler fra begge kalendere (både privat og jobb) dukker opp i kalendervisningen og danner grunnlag for bilreservasjoner.

---

## 3. Verifisering og testing
- Bygge og kjøre applikasjonen (`compile_applet`).
- Verifisere at begge kalenderne («Magnar privat» og «Magnar jobb») lastes inn med sine respektive farger og avtaler.
- Teste at endringer i innstillinger synkroniseres til Firestore, og at live-modus ikke er tom.
