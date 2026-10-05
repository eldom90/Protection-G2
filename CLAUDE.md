# Kontekst projekta za AI asistenta

Demo "protection mode" aplikacija za Even Realities G2 (Even Hub plugin: Vite + TypeScript web app u WebView-u Even aplikacije).

- Telefon prikazuje poruke samo kao sifrat (tweetnacl secretbox, padding na 32 B); tastatura bez oznaka, raspored izmijesan i prikazan samo na naocalama, mijesa se nakon svake poruke.
- Tastatura: slova bez kvacica (QWERTZ, 10/9/7), Shift (once/lock, auto-veliko slovo), sloj "123" (takodje izmijesan), dugi pritisak otvara prozor sa uvijek 3 polja na fiksnom mjestu (č ć na c, š na s, ž na z, đ na d); prozor se otvara na svakom slovu da ne otkriva raspored.
- Naocale: 4 text containera na 576x288 (header, log, draft, keymap) u `src/glasses.ts`; azuriranje preko `textContainerUpgrade` samo za promijenjene dijelove. Dvostruki klik sakriva prikaz, scroll lista poruke.
- Poruke se cuvaju samo sifrovane; desifruju se pri renderovanju za naocale.
- `src/glasses.ts` je jedini sloj vezan za hardver (planirano: dodati Meta Ray-Ban Display).
- Bez bridge-a (obican preglednik) aplikacija prikazuje simulaciju ekrana naocala (#glassesPreview).
- Korisnik je pocetnik: objasnjenja i uputstva na bosanskom, korak po korak.
- Provjereno u evenhub-simulator 0.9.5 sa even_hub_sdk 0.0.16; dijakritici se prikazuju ispravno.
