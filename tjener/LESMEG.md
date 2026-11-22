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

1. Åpne spillet i nettleseren og velg å være vert.
2. I det svarte vinduet står nå en **kode** (seks tegn) og en **invitasjonslenke**.
3. Send lenken til vennene dine (melding, Discord, e-post …). De trykker på den og er med.

Du kan også se alt på statussiden: <http://localhost:8787/>.

## 5. Avslutte

Trykk **Ctrl+C** i det svarte vinduet (eller lukk det). Verden lagres først. Neste gang du starter og er vert
med samme kode, fortsetter verden der den slapp – tiden som har gått, regnes fram.

## Godt å vite

- Verdenene ligger i mappa `verdener` ved siden av programmet (`KODE.json`, og forrige utgave som `KODE.bak.json`).
  Ta gjerne en kopi av mappa av og til.
- Tunneladressen skifter hver gang du starter. Send en ny lenke til vennene da.
- Når PC-en er av eller sover, står verden stille.
- Annen port: åpne et kommandovindu i mappa og skriv `node riksbrudd-tjener.js --port 8788 --tunnel`.
