# Riksbrudd – kontekst for Claude Code

Les HANDOFF.md først. Den oppsummerer hele samtalen som førte hit (7.–8. nov 2026),
alle designvalg og hvor ting ligger. docs/Riksbrudd-designdokument.pdf er designdokumentet.

Språk: svar og kommentarer på norsk. Stil: stil 1 (mørk, realistisk, 80-talls operasjonsrom, papirtekstur).
Alle kartdata skal være ekte og åpne (kilder listet i HANDOFF.md). Fraksjonene er oppdiktede.

Kjapp start:
- site/            ferdig statisk side (forside, /norge, /dovre). `vercel deploy --prod` fungerer rett i mappen.
- pipeline/norge/  build1986.py lager data/norge/map_1986.json fra 1986-kommunegrenser + SSB + valg.
- pipeline/dovre/  01–05 bygger testområdet (Landsat 5 1987, høyde, bygg, veg) -> dovre.html.
- Kjør alltid testene før publisering (de fanger runtime-feil), fra repo-roten:
  `node pipeline/norge/stubtest.js && node pipeline/dovre/stub.js && node pipeline/dovre/stub2.js`
  (leser site/norge og site/dovre; en annen HTML-fil kan gis som argument).
