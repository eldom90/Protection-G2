# Zaštita poruka (demo za Even Realities G2)

Demo aplikacija: na telefonu se poruke vide samo kao šifra, a na naočalama kao čitljiv tekst. Tastatura na telefonu nema oznaka na tipkama; pravi raspored slova vidi se samo u naočalama i mijenja se nakon svake poslane poruke.

Ovo je **demo**. Sagovornik ("Kontakt A") je simuliran, a ključ za šifrovanje se pravi iznova pri svakom pokretanju. Nije namijenjeno za stvarne povjerljive poruke.

U folderu `docs` su snimci ekrana kako aplikacija treba izgledati.

---

## 1. Šta vam treba (jednom)

1. **Node.js**, verzija 20 ili novija. Preuzmite "LTS" verziju sa https://nodejs.org i instalirajte (sve opcije ostavite kako jesu).
2. **VS Code** sa https://code.visualstudio.com (ako ga već nemate).

Provjera: otvorite terminal i upišite `node -v`. Treba se pojaviti broj verzije, npr. `v22.x.x`.

## 2. Otvaranje projekta u VS Code

1. Raspakujte zip fajl (desni klik, "Extract All" / "Raspakuj sve").
2. U VS Code: **File > Open Folder** i izaberite folder `zastita-g2`.
3. Ako VS Code pita "Do you trust the authors?", kliknite **Yes, I trust the authors**.
4. Otvorite terminal u VS Code: meni **Terminal > New Terminal** (ili Ctrl + `).

## 3. Instalacija (jednom)

U terminal upišite i pritisnite Enter:

```
npm install
```

Traje minut ili dva. Upozorenja (žuti tekst) su normalna; bitno je da na kraju nema crvenog "ERR".

## 4. Pokretanje

**Korak A, pokrenite aplikaciju.** U terminal upišite:

```
npm run dev
```

Ostavite ovaj terminal otvoren. Aplikacija radi dok je on otvoren (zaustavlja se sa Ctrl + C).

Brza provjera: otvorite http://localhost:5173 u pregledniku (Chrome, Edge). Vidjet ćete telefon i ispod njega zelenu simulaciju ekrana naočala.

**Korak B, pokrenite zvanični simulator naočala.** Otvorite **drugi** terminal (ikona "+" u panelu terminala) i upišite:

```
npm run simulator
```

Otvara se prozor Even simulatora: telefon (vaša aplikacija) i ekran naočala.

## 5. Kako se koristi

- Kliknite tipke na telefonu. Slovo koje ste pritisnuli istakne se u naočalama (veliko slovo), a tekst koji pišete vidite samo u naočalama.
- Dok držite tipku, slovo ispod prsta je u naočalama označeno uglastim zagradama, npr. `[k]`. Slovo se upisuje kad pustite tipku.
- **⇧** daje veliko slovo. Jedan dodir: samo sljedeće slovo je veliko. Drugi dodir (⇪): sva slova su velika. Treći dodir: isključeno. Prvo slovo poruke i slovo poslije `.`, `?`, `!` su automatski velika.
- **123** prebacuje na brojeve i znakove (i oni su izmiješani i vide se samo u naočalama). **ABC** vraća na slova.
- **č ć š ž đ:** držite tipku slova c, s, z ili d. Iznad tastature se otvori prozor sa 3 polja, a u naočalama piše šta je u kojem polju (npr. `c   č   ć`). Prevucite prst na željeno polje i pustite, ili pustite pa dodirnite polje. Prozor se otvara na svakom slovu (ne samo na c, s, z, d), da posmatrač ne može po tome pogoditi koja je tipka koje slovo.
- **Pošalji** šalje poruku. Raspored tipki se odmah izmiješa. Nakon dvije sekunde stiže odgovor, koji je na telefonu šifra, a u naočalama čitljiv tekst.
- Dugme **Zaštita uključena / isključena** gore desno prikazuje kako bi izgledalo bez zaštite (korisno za demo, da se vidi razlika).
- Na naočalama (u simulatoru): **dvostruki klik** sakriva i ponovo prikazuje sadržaj, **gore / dolje** listaju starije poruke.

## 6. Snimanje demo videa (60 do 90 sekundi)

- **Windows 11:** Snipping Tool (Win + Shift + S), izaberite snimanje videa i označite prozor simulatora.
- **Windows 10:** Win + Alt + R (Xbox Game Bar).
- **Mac:** Cmd + Shift + 5.

Prijedlog toka videa:
1. Isključite zaštitu: pokažite da se na telefonu vidi sve što pišete.
2. Uključite zaštitu: telefon prikazuje samo šifru i prazne tipke.
3. Napišite kratku poruku i pokažite da je u naočalama čitljiva.
4. Pošaljite je i pokažite kako se raspored tipki promijenio.
5. Pokažite odgovor koji stiže: šifra na telefonu, tekst u naočalama.
6. Dvostruki klik: sadržaj na naočalama nestaje.

## 7. Testiranje na pravim naočalama (kasnije)

Treba vam Even Realities aplikacija na telefonu, uparene G2 naočale i pristup Even Hub programu za programere (detalji: https://hub.evenrealities.com). Telefon i računar moraju biti na istoj Wi-Fi mreži.

1. Pokrenite `npm run dev`.
2. U drugom terminalu: `npm run qr`.
3. QR kod skenirajte u Even aplikaciji.

## 8. Česti problemi

| Problem | Rješenje |
| --- | --- |
| `npm` nije prepoznat | Node.js nije instaliran ili treba restartovati VS Code nakon instalacije. |
| Simulator se ne otvara | Provjerite da `npm run dev` radi u prvom terminalu, pa ponovo `npm run simulator`. |
| Port 5173 je zauzet | Zatvorite druge terminale u kojima radi `npm run dev`. |
| Kvadratići umjesto č ć š ž đ na naočalama | U `src/config.ts` postavite `ASCII_FALLBACK = true`. |

## 9. Šta je gdje

| Fajl | Namjena |
| --- | --- |
| `src/config.ts` | Ime sagovornika, simulirani odgovori, osnovna podešavanja. Ovdje mijenjate tekstove. |
| `src/main.ts` | Logika aplikacije: tastatura, slanje, prikaz na telefonu. |
| `src/glasses.ts` | Sve što ide na naočale. Kasnije se ovdje dodaju druge naočale (npr. Meta). |
| `src/crypto.ts` | Šifrovanje poruka (tweetnacl) i miješanje tastature. |
| `src/style.css` | Izgled ekrana telefona. |
| `app.json` | Podaci o aplikaciji za Even Hub. `package_id` je privremen i treba ga promijeniti prije objave. |

## 10. Prije pravog proizvoda

- Prava razmjena poruka između dva telefona (server, nalozi).
- Razmjena ključeva preko provjerenog protokola (npr. Signal protokol) umjesto jednog ključa po sesiji.
- Nezavisna sigurnosna revizija.
- Provjera pravnih obaveza (zaštita podataka, enkripcija) sa pravnikom.
