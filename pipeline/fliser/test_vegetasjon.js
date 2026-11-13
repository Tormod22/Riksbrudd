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
// høyden: full vekst opp til tregrensen, glisnere oppover, ingenting i ura høyt til fjells (12. nov: eng med geitrams 1670 moh. ved Snøhetta)
sjekk(V.vekst(.6) === 1 && V.vekst(1) === 1 && V.vekst(1.17) > .3 && V.vekst(1.17) < .7 && V.vekst(1.35) === 0 && V.vekst(1669 / V.tregrense(6924288)) === 0,
  'vekst: 1 under tregrensen, halvveis i lavfjellet, 0 fra 1,35 × tregrensen (Snøhetta 1669 moh.)');
sjekk(V.stedIHøyden('eng', .8) === 'eng' && V.stedIHøyden('veikant', 1.2) === 'hei' && V.blomst(V.stedIHøyden('veikant', 1.2), 'sommer', .99) !== 'geitrams',
  'over tregrensen: fjellhei (ingen geitrams) uansett hva kartet viser');
// nøyaktig avstand til veg og fortau (12. nov: blomster på fortauet – vegmasken er for grov i store utsnitt)
{ const P = []; for (let x = -50; x <= 50; x += 2.5) P.push([x, 0, 0]);
  const by = V.vegRute([{ k: 'K', P, by: true }]), land = V.vegRute([{ k: 'K', P, by: false }]);
  sjekk(by(0, 0) && by(10, 2.7) && by(-20, -4.6) && by(49, 5.1), 'tettsted: kjørebanen og fortauet (til 5,25 m fra midten) er veg');
  sjekk(!by(0, 5.6) && !by(30, -7) && !by(0, 40) && !by(500, 500), 'tettsted: 5,6 m fra midten og lenger ut er ikke veg');
  sjekk(land(0, 3.4) && !land(0, 3.8), 'utenfor tettsted: kjørebanen og skulderen (til 3,55 m)');
  sjekk(by(0, 5.5, .3) && !by(0, 5.5), 'ekstra margin legges til');
  let feilTreff = 0; for (let k = 0; k < 2000; k++) { const x = -48 + (k * 37 % 96), y = -9 + (k * 53 % 180) / 10, fasit = Math.abs(y) < 5.25; if (by(x, y) !== fasit) feilTreff++; }
  sjekk(feilTreff === 0, 'vegRute stemmer med avstanden til midtlinja i 2000 punkter');
  const skrå = V.vegRute([{ k: 'E', P: [[0, 0], [100, 100]], by: false }]);
  sjekk(skrå(50, 50) && skrå(52, 47) && !skrå(60, 50) && !skrå(-10, -10), 'skrå veg med ett langt ledd');
  sjekk(V.vegRute([])(0, 0) === false && V.vegRute(null)(0, 0) === false, 'ingen veger: aldri veg'); }
console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
