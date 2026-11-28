// Test av spill/eksport.js (ut4-eksport, fase Ø6): eksportordre, havn og skip, grensa (Grensevakta og smugling), eurokreditt.
// Kjør: node pipeline/fliser/test_eksport.js
'use strict';
const assert = require('assert');
const E = require('../../site/dovre-fliser/spill/eksport.js');
const RG = require('../../site/dovre-fliser/spill/riksgrense.js');
let n = 0; const ok = (v, t) => { assert.ok(v, t); n++; };
const R = E.REGLER;

// når ordrene kommer
ok(!E.åpen({ trinn: 2, havner: 0, grenser: 0 }) && E.åpen({ trinn: 3 }) && E.åpen({ trinn: 1, havner: 1 }) && E.åpen({ trinn: 1, grenser: 2 }), 'åpen: trinn 3 eller havn/grense');
{ const S = E.ny(); ok(E.morgen(S, 0, { åpen: false, rand: () => 0 }).length === 0, 'ingen ordre før det er åpent');
  const n1 = E.morgen(S, 0, { åpen: true, rand: E.lagRand(5) }); ok(S.tilbud.length <= 1, 'høyst én ny ordre om morgenen');
  for (let d = 1; d < 20; d++) E.morgen(S, d * 1440 - 1, { åpen: true, rand: E.lagRand(d) }); ok(S.tilbud.length <= R.maksTilbud, 'høyst maksTilbud åpne');
  ok(S.tilbud.every(k => k.utløper > 19 * 1440 - 1 - 1e-9), 'gamle tilbud går ut'); void n1; }

// ordren: planker og tømmer først, pris høyere og mer stabil enn hjemme
{ const S = E.ny(), ordre = Array.from({ length: 200 }, (_, i) => E.lagOrdre(S, 0, { rand: E.lagRand(i + 1) }));
  ok(ordre.every(k => k.vare === 'tre' || k.vare === 'tømmer'), 'først bare planker og tømmer');
  const pl = ordre.filter(k => k.vare === 'tre' && k.vei === 'sjø').map(k => k.prisEk);
  ok(Math.min(...pl) >= R.VARER.tre.ek * (1 - R.svingning / 2) * .99 && Math.max(...pl) <= R.VARER.tre.ek * (1 + R.svingning / 2) * 1.01, 'prisen svinger høyst ±4 % (rykte 50)');
  ok(R.VARER.tre.ek * R.kurs > 20000 * 1.25, 'planker ute betaler mer enn en levering hjemme (1,25 × 20 000 kr)');
  ok(ordre.every(k => k.mengde >= R.VARER[k.vare].steg && k.mengde <= R.VARER[k.vare].mengde[1]), 'mengden innenfor spennet');
  ok(ordre.filter(k => k.vei === 'grense').every(k => k.mengde <= (R.VARER[k.vare].mengde[0] + R.VARER[k.vare].mengde[1]) / 2), 'grenseordre er mindre');
  ok(/Hamburg|Rotterdam|Aberdeen|Gdańsk|Göteborg/.test(ordre.find(k => k.vei === 'sjø').tittel), 'tittel: ' + ordre.find(k => k.vei === 'sjø').tittel);
  const små = Array.from({ length: 50 }, (_, i) => E.lagOrdre(S, 0, { rand: E.lagRand(i + 900), vei: 'sjø', størst: R.havn.middels }));
  ok(små.every(k => E.plass(k.vare, k.mengde) <= R.havn.middels), 'middels havn: ordren passer i skipet');
  S.sum.levert = 3; const senere = new Set(Array.from({ length: 300 }, (_, i) => E.lagOrdre(S, 0, { rand: E.lagRand(i + 3000) }).vare));
  ok(senere.has('ved') && senere.has('stål') && senere.has('diesel'), 'etter to leverte kommer ved, stål og diesel'); }

// sjøveien: havn, skipet, betalingen
{ const S = E.ny(); const k = E.lagOrdre(S, 0, { rand: E.lagRand(7), vei: 'sjø', vare: 'tre' }); S.tilbud.push(k);
  ok(/liten kai/.test(E.ta(S, k.id, { slag: 'havn', navn: 'Brygga', størrelse: 'liten' }, 0).feil), 'liten kai tar ingen skip');
  const stor = { slag: 'havn', id: 1, navn: 'Ålesund', x: 0, y: 0, størrelse: 'stor', avtale: true };
  if (E.plass(k.vare, k.mengde) > R.havn.middels) ok(/for liten/.test(E.ta(S, k.id, { ...stor, størrelse: 'middels' }, 0).feil), 'middels havn for liten for stor last');
  ok(/grensestasjon/.test(E.utFeil({ ...k, vei: 'grense' }, stor)), 'grenseordre trenger grensestasjon');
  ok(E.ta(S, k.id, stor, 0).ok && S.aktive.length === 1 && k.frist === k.døgn * 1440, 'tatt med frist');
  E.iHavn(k, k.mengde / 2); ok(E.steg(S, 60, { rand: () => .99 }).length === 0 && !k.skip, 'halv last: intet skip');
  ok(E.iHavn(k, k.mengde) === k.mengde / 2, 'iHavn tar bare resten');
  const h1 = E.steg(S, 120, { rand: () => .99 }); ok(h1[0].type === 'skipBestilt' && k.skip.ankommer > 120, 'skipet bestilles når alt er på kaia');
  ok(/kommer om/.test(E.status(k, 120)), 'status: ' + E.status(k, 120));
  const h2 = E.steg(S, k.skip.ankommer, { rand: () => .99 }); ok(h2.some(h => h.type === 'skipKom') && k.skip.ved, 'skipet ligger ved kaia');
  const h3 = E.steg(S, k.skip.går, { rand: () => .99 }); ok(h3[0].type === 'levert' && S.ek === k.betaling && S.sum.levert === 1 && k.status === 'levert', 'skipet går: betalt i eurokreditt');
  ok(S.rykte === R.rykte.start + R.rykte.levert, 'ryktet ute stiger'); }

// pirater: større sjanse uten avtale
{ const kjør = avtale => { let tapt = 0; for (let i = 0; i < 2000; i++) { const S = E.ny(), k = E.lagOrdre(S, 0, { rand: E.lagRand(i + 1), vei: 'sjø', vare: 'tømmer', størst: 400 }); S.tilbud.push(k);
    E.ta(S, k.id, { slag: 'havn', navn: 'H', størrelse: 'stor', avtale }, 0); E.iHavn(k, k.mengde); const r = E.lagRand(i * 7 + 3);
    E.steg(S, 1, { rand: r }); E.steg(S, k.skip.ankommer, { rand: r }); if (E.steg(S, k.skip.går, { rand: r }).some(h => h.type === 'tapt')) tapt++; } return tapt / 2000; };
  const med = kjør(true), uten = kjør(false); ok(Math.abs(med - R.pirat.avtale) < .015 && Math.abs(uten - R.pirat.uten) < .02 && uten > med, `pirater: med avtale ${med}, uten ${uten}`); }

// fristen: ute, varene på kaia kan hentes hjem, ryktet faller; et skip ved kaia får gå
{ const S = E.ny(), k = E.lagOrdre(S, 0, { rand: E.lagRand(9), vei: 'sjø', vare: 'tre', størst: 400 }); S.tilbud.push(k); E.ta(S, k.id, { slag: 'havn', navn: 'H', størrelse: 'stor' }, 0);
  E.iHavn(k, 10); const h = E.steg(S, k.frist + 1, {}); ok(h[0].type === 'utløpt' && h[0].tilbake === 10 && S.rykte === R.rykte.start + R.rykte.utløpt && S.ek === 0, 'utløpt');
  const k2 = E.lagOrdre(S, 0, { rand: E.lagRand(10), vei: 'sjø', vare: 'tre', størst: 400 }); S.tilbud.push(k2); E.ta(S, k2.id, { slag: 'havn', navn: 'H', størrelse: 'stor', avtale: true }, 0);
  E.iHavn(k2, k2.mengde); E.steg(S, k2.frist - 1000, { rand: () => .99 }); E.steg(S, k2.skip.ankommer, { rand: () => .99 });
  const g = E.steg(S, k2.frist + 10, { rand: () => .99 }); ok(k2.skip.går > k2.frist || g.some(x => x.type === 'levert'), 'skip ved kaia regnes ikke som for sent');
  ok(E.avbryt(S, 'e999').feil, 'avbryt ukjent'); }

// grensa: Grensevakta per tur, smugling kan gi beslag
{ const S = E.ny(), k = E.lagOrdre(S, 0, { rand: E.lagRand(11), vei: 'grense', vare: 'tre' }); S.tilbud.push(k);
  ok(E.ta(S, k.id, { slag: 'grense', id: 'storlien', navn: 'Storlien', x: 1, y: 1 }, 0).ok, 'grenseordre tatt');
  ok(E.turPris(1) === R.grense.perTur && E.turPris(1.35) > E.turPris(1), 'turprisen følger inflasjonen');
  ok(E.overGrensa(S, k, 12, false, () => 0).levert === 12, 'med avtale: aldri beslag');
  const b = E.overGrensa(S, k, 12, true, () => 0); ok(b.beslag === 12 && b.levert === 0 && S.sum.beslag === 1 && S.rykte === R.rykte.start + R.rykte.beslag, 'smugling: beslag');
  ok(E.overGrensa(S, k, 12, true, () => .99).levert === 12, 'smugling: kom gjennom');
  E.overGrensa(S, k, k.mengde, false, () => .5); const h = E.steg(S, 100, {}); ok(h[0].type === 'levert' && S.ek === k.betaling, 'alt over grensa: betalt');
  let besl = 0; for (let i = 0; i < 4000; i++) { const S2 = E.ny(), q = { mengde: 10, levert: 0 }; if (E.overGrensa(S2, q, 10, true, E.lagRand(i + 1)).beslag) besl++; }
  ok(Math.abs(besl / 4000 - R.grense.beslag) < .03, 'beslag ca. ' + R.grense.beslag); }

// grensestasjonene ligger på riksgrensa
{ const G = RG.les(require('../../site/dovre-fliser/data/riksgrense.json'));
  for (const g of E.GRENSER) ok(Math.abs(RG.avstand(G, g.x, g.y)) < 50, `${g.navn} ligger på grensa (${Math.round(RG.avstand(G, g.x, g.y))} m)`);
  const nær = E.grenserNær(196400, 6898900); ok(nær.length >= 1 && nær[0].navn === 'Vauldalen', 'nærmeste fra Dovre: ' + (nær[0] || {}).navn);
  ok(E.grenserNær(196400, 6898900, 1000).length === 0, 'ingen innen 1 km'); }

// eurokreditt: veksling (kursen stiger med inflasjonen) og ting som bare finnes ute
{ const S = E.ny(); S.ek = 100;
  ok(E.kurs(1) === R.kurs && E.kurs(1.5) === 1.5 * R.kurs && E.kurs(.5) === R.kurs, 'kursen stiger med inflasjonen, aldri under start');
  const v = E.veksle(S, 40, 1.2); ok(v.kr === Math.round(40 * R.kurs * 1.2 * (1 - R.gebyr)) && S.ek === 60 && S.sum.vekslet === 40, 'veksle 40 til ' + v.kr);
  ok(E.veksle(S, 1000, 1).ek === 60 && S.ek === 0, 'veksler høyst det dere har'); ok(E.veksle(S, 10, 1).feil, 'ingenting å veksle');
  S.ek = 70; ok(E.kjøpUte(S, 'helideler').ok && S.lager.helideler === 1 && S.ek === 10, 'helikopterdeler'); ok(E.kjøpUte(S, 'radio').feil, 'for lite eurokreditt');
  ok(E.kjøpUte(S, 'tull').feil, 'ukjent vare'); ok(E.iKroner({ ek: 10 }, 1) === Math.round(10 * R.kurs * (1 - R.gebyr)), 'verdien i kroner');
  // eurokreditten holder verdien: 100 eurokreditt etter 30 døgn med 1 % inflasjon gir 1,35 × så mange kroner
  ok(E.veksle({ ek: 100, sum: { vekslet: 0, kr: 0 } }, 100, Math.pow(1.01, 30)).kr > 1.3 * 100 * R.kurs * (1 - R.gebyr), 'holder verdien mot inflasjonen'); }

// lagring
{ const S = E.ny(); S.ek = 12.5; S.grensevakt = true; const k = E.lagOrdre(S, 0, { rand: E.lagRand(3), vei: 'sjø', størst: 400 }); S.tilbud.push(k); E.ta(S, k.id, { slag: 'havn', navn: 'H', størrelse: 'stor' }, 0); E.iHavn(k, 5);
  const T = E.fraJSON(JSON.parse(JSON.stringify(E.tilJSON(S)))); ok(T.ek === 12.5 && T.grensevakt && T.aktive.length === 1 && T.aktive[0].iHavn === 5, 'lagret og lest');
  ok(E.fraJSON(null).ek === 0 && E.fraJSON({ versjon: 9 }).aktive.length === 0, 'tom/ukjent lagring'); }

console.log(`test_eksport: ${n} sjekker ok`);
