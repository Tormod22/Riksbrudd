// Test av vegetasjonsreglene (site/dovre-fliser/spill/vegetasjon.js): treslag etter høyde, helning, fukt og lyng, blomster etter sted og årstid.
// Kjør: node pipeline/fliser/test_vegetasjon.js
const V = require('../../site/dovre-fliser/spill/vegetasjon.js');
let feil = 0;
const sjekk = (ok, tekst) => { if (!ok) feil++; console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); };
// andel av hvert treslag over 2000 frø på et sted
const fordeling = p => { const n = {}; for (let i = 0; i < 2000; i++) { const k = V.treslag(p, (i + .5) / 2000); n[k] = (n[k] || 0) + 1 / 2000; } return n; };
const pst = n => Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)} %`).join(', ');

const tg = V.tregrense(6.89e6);
sjekk(Math.abs(tg - 1100) < 1 && V.tregrense(7.8e6) < 400 && V.tregrense(6.6e6) > 1150, `tregrensen: Dovre ${tg} m, Finnmark ${Math.round(V.tregrense(7.8e6))} m, sør ${Math.round(V.tregrense(6.6e6))} m`);
const dal = fordeling({ moh: 500, tg, helning: 3, vann: 300, myr: 0, hei: 0 });
sjekk(dal.gran > .4 && (dal.furu || 0) < .2, 'dalbunn (500 moh., flatt): mest gran – ' + pst(dal));
const tørt = fordeling({ moh: 600, tg, helning: 28, vann: 500, myr: 0, hei: .6 });
sjekk(tørt.furu > .45 && tørt.furu > (tørt.gran || 0) * 3, 'bratt lyngli: mest furu – ' + pst(tørt));
const høyt = fordeling({ moh: 1060, tg, helning: 6, vann: 500, myr: 0, hei: .2 });
sjekk(høyt.fjellbjørk > .55 && (høyt.gran || 0) < .02, 'ved tregrensen (1060 moh.): fjellbjørk, ingen gran – ' + pst(høyt));
const vått = fordeling({ moh: 550, tg, helning: 2, vann: 6, myr: .3, hei: 0 });
sjekk(vått.selje > .3 && (vått.furu || 0) < .1, 'ved elva: selje og vier – ' + pst(vått));
const blandet = fordeling({ moh: 700, tg, helning: 12, vann: 200, myr: 0, hei: .2 });
sjekk(Object.keys(blandet).length >= 6, `vanlig li: minst seks treslag (${Object.keys(blandet).length}) – ` + pst(blandet));
sjekk(V.treslag({ moh: 700, tg, helning: 12, vann: 200 }, .37) === V.treslag({ moh: 700, tg, helning: 12, vann: 200 }, .37), 'samme frø gir samme treslag');
sjekk(V.REKKE.every(k => V.TRESLAG[k].høyde > 0 && (V.TRESLAG[k].løv ? V.TRESLAG[k].høst : true)), 'alle treslag har høyde, løvtrærne har høstfarge');
// åpen mark
sjekk(V.åpenMark(2, .7, 500).some(([k]) => k === 'einer') && V.åpenMark(6, .6, 500).some(([k]) => k === 'selje') && V.åpenMark(2, 1.2, 500).length === 0,
  'åpen mark: einer på heia, vier på myra, ingenting høyt over tregrensen');
sjekk(V.åpenMark(5, .6, 8).some(([k]) => k === 'selje') && V.åpenMark(3, .6, 2).length === 0, 'vier langs vannkanten, ingenting i vannet');
// blomster
const tell = (sted, å) => { const n = {}; for (let i = 0; i < 1000; i++) { const b = V.blomst(sted, å, (i + .5) / 1000); if (b) n[b] = (n[b] || 0) + 1; } return n; };
sjekk(V.blomstring('vinter') === 0 && V.blomst('eng', 'vinter', .5) === null, 'ingen blomster om vinteren');
const eng = tell('eng', 'sommer'), hei = tell('hei', 'sommer'), veg = tell('veikant', 'sommer'), vår = tell('eng', 'vår');
sjekk(Object.keys(eng).length >= 5 && eng.smørblomst && eng.hvitkløver && !eng.røsslyng, 'enga om sommeren: ' + Object.keys(eng).join(', '));
sjekk(hei.røsslyng > 500 && !hei.smørblomst, 'heia: mest røsslyng – ' + JSON.stringify(hei));
sjekk(veg.geitrams > 100, 'langs vegen: geitrams – ' + JSON.stringify(veg));
sjekk(vår.løvetann > 400 && !vår.prestekrage, 'våren: løvetann, ikke prestekrage');
sjekk(V.BLOMSTREKKE.every(k => V.BLOMSTER[k].farge.length === 3), 'alle blomstene har farge');
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
