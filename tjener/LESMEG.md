# Riksbrudd-tjeneren – spill med venner fra din egen PC

Med dette lille programmet blir PC-en din «vert» for en felles Riksbrudd-verden. Du og opptil fire venner
spiller i nettleseren på riksbrudd.vercel.app som vanlig – PC-en din holder styr på verden og lagrer den.

## 1. Installer Node.js (én gang)

1. Gå til <https://nodejs.org/> og last ned **LTS**-utgaven for Windows.
2. Kjør installasjonen og trykk «Next» på alt. Du trenger ikke krysse av for noe ekstra.

## 2. Hent cloudflared (valgfritt, men anbefalt)

Uten dette kan bare folk på samme nett (samme hus/wifi) bli med. Med det får du en lenke som virker overalt,
også på iPhone.

1. Søk etter «cloudflared download» og gå til Cloudflares egen side.
2. Last ned Windows-fila (`cloudflared-windows-amd64.exe`).
3. Gi den nytt navn til `cloudflared.exe` og legg den i **samme mappe** som `start-tjener.bat`.

Det koster ingenting og krever ingen konto.

## 3. Start tjeneren

Dobbeltklikk på **`start-tjener.bat`**. Et svart vindu åpnes og skriver blant annet:

    Riksbrudd-tjeneren kjører på port 8787
    Tunnelen er klar: https://noe-tilfeldig.trycloudflare.com

La vinduet stå åpent så lenge dere spiller. Windows kan spørre om brannmuren – trykk «Tillat».

## 4. Lag verden og inviter

1. Når tunnelen er klar, åpner tjeneren spillet i nettleseren av seg selv med en **vertslenke** (den står også i det svarte
   vinduet: `https://riksbrudd.vercel.app/norge#vert=…`). Panelet «Spill sammen» er åpent med riktig adresse – skriv navnet ditt
   og trykk **Åpne en ny verden**. (Har du startet et nytt spill, lag karakter og leir først, og åpne så vertslenken igjen.)
2. Uten tunnel: ☰ → **Spill sammen**, skriv `ws://localhost:8787` i «Tjeneren». Edge/Chrome kan spørre om siden får bruke
   «enheter på det lokale nettverket» – trykk **Tillat**. Noen nettlesere avviser dette helt; bruk da tunnelen.
3. Panelet viser en **kode** (seks tegn) og en **invitasjonslenke**. Trykk «Kopier lenken».
4. Send lenken til vennene dine (melding, Discord, e-post …). De trykker på den, skriver navnet sitt og trykker «Bli med».
5. Gi vennene lag: velg et av lagene dine, og trykk «Styres av» i lagpanelet til navnet deres står der. De kan da sende
   laget på marsj. Du styrer tiden (pause og fart) for alle.

Du kan også se alt på statussiden: <http://localhost:8787/>.

## 5. Avslutte

Trykk **Ctrl+C** i det svarte vinduet (eller lukk det). Verden lagres først. Neste gang du starter tjeneren og åpner
spillet, åpnes verden igjen av seg selv (eller trykk «Åpne verden … igjen»), og tiden som har gått, regnes fram.

## Godt å vite

- Verdenene ligger i mappa `verdener` ved siden av programmet (`KODE.json`, og forrige utgave som `KODE.bak.json`).
  Ta gjerne en kopi av mappa av og til.
- Tunneladressen skifter hver gang du starter. Send en ny lenke til vennene da.
- Når PC-en er av eller sover, står verden stille.
- Annen port: åpne et kommandovindu i mappa og skriv `node riksbrudd-tjener.js --port 8788 --tunnel`.
- Dette er første utgave (M2a): det er nettleseren din som regner verden, så hold spillet åpent mens dere spiller. Vennene
  kan foreløpig bare gi marsjordre til lagene du gir dem, og de ser din leir som et merke i kartet. Se docs/plan-flerspiller.md.
