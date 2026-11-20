// Test: navn i kartet uten NVDB-sjargong (site/dovre-fliser/spill/kartnavn.js). Kjør: node pipeline/fliser/test_kartnavn.js
const K = require('../../site/dovre-fliser/spill/kartnavn.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const T = [
  ['tunnel', 'Fodnestunnelen hovedløp', 'Fodnestunnelen'], ['tunnel', 'Lærdalstunnelen hovedløp', 'Lærdalstunnelen'],
  ['tunnel', 'Breimsfjelltunnelen 2 hovedløp', 'Breimsfjelltunnelen 2'], ['tunnel', 'Eidsvågtunnelen løp mot Bergen', 'Eidsvågtunnelen'],
  ['tunnel', 'Baneheia hovedløp mot Stavanger', 'Baneheia'], ['tunnel', 'Brekketunnelen nordgående', 'Brekketunnelen'],
  ['tunnel', 'Smiehagen tunnel løp mot Gøteborg', 'Smiehagen tunnel'], ['tunnel', 'Karmøytunnelen, Håvik løp', 'Karmøytunnelen'],
  ['tunnel', 'Vesttunnelen Kjørbo-arm mot E18 Oslo', 'Vesttunnelen'], ['tunnel', 'Knappetunnelen rampe 41 mot Straume', 'Knappetunnelen'],
  ['tunnel', 'Opera Festning pårampe fra Dr. Mauds gt til Stockholm', 'Opera Festning'], ['tunnel', 'Kongsbergtunnelenløp', 'Kongsbergtunnelen'],
  ['tunnel', 'Skjoldnestunnelen_løp_mot_nord', 'Skjoldnestunnelen'], ['tunnel', 'Forbordsfjelltunnelen - Nordgående løp', 'Forbordsfjelltunnelen'],
  ['tunnel', 'Ellingsøytunnelen sekundær- og fellesløp', 'Ellingsøytunnelen'], ['tunnel', 'Værnestunnelen S løp mot Steinkjer', 'Værnestunnelen'],
  ['tunnel', 'Island miljøtunnel nordgående', 'Island miljøtunnel'], ['tunnel', 'Baneheia, Rampe fra Oslo mot Eg', 'Baneheia'],
  ['tunnel', 'Streketunnelen nytt løp', 'Streketunnelen'], ['tunnel', 'Oddernes vestgående', 'Oddernes'],
  // urørt: ekte navn med «nord», «vest» osv. inne i ordet, og navn uten tillegg
  ['tunnel', 'Nordkapptunnelen', 'Nordkapptunnelen'], ['tunnel', 'Vesttunnelen', 'Vesttunnelen'], ['tunnel', 'Gudvangatunnelen', 'Gudvangatunnelen'],
  ['tunnel', 'Løpstunnelen', 'Løpstunnelen'],
  // bruer: «Flomløp» og «Rampebru» er ekte navn
  ['bru', 'Åbrua Flomløp', 'Åbrua Flomløp'], ['bru', 'Mesna Rampebru', 'Mesna Rampebru'], ['bru', 'Baserud sørgående', 'Baserud'],
  ['bru', 'Torsbuåsen nordgående-utløp', 'Torsbuåsen'], ['bru', 'Tag vestgående bru', 'Tag bru'], ['bru', 'Holt bru sørgående', 'Holt bru'], ['bru', 'Sørlibrua ramper', 'Sørlibrua'], ['bru', 'Tvetenveien X E6, Rampe 32', 'Tvetenveien X E6'],
  // andre lag røres ikke
  ['tettsted', 'Lærdalsøyri', 'Lærdalsøyri'], ['kraft', 'Aurland 1', 'Aurland 1'],
];
for (const [lag, inn, ut] of T) { const v = K.vis(lag, inn); ok(v === ut, `${lag}: «${inn}» -> «${v}»`); }
const e = { navn: 'Fodnestunnelen hovedløp' }; K.rens('tunnel', e);
ok(e.navn === 'Fodnestunnelen' && e.nvdbNavn === 'Fodnestunnelen hovedløp', 'rens husker NVDB-navnet');
const e2 = { navn: 'Lærdalstunnelen' }; K.rens('tunnel', e2); ok(e2.navn === 'Lærdalstunnelen' && !('nvdbNavn' in e2), 'rens rører ikke rene navn');
ok(K.vis('tunnel', null) === null && K.vis('tunnel', '') === '', 'tomme navn tåles');
process.exit(feil ? 1 : 0);
