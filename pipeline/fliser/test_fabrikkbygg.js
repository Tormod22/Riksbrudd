// Test for spill/fabrikkbygg.js (ta et industribygg i kartet i bruk som fabrikk, ut10-fabrikkbygg). Kjør: node pipeline/fliser/test_fabrikkbygg.js
'use strict';
const path = require('path');
const SP = path.join(__dirname, '../../site/dovre-fliser/spill');
const Leir = require(SP + '/leir.js'); globalThis.Leir = Leir;
const PR = require(SP + '/produksjon.js'); globalThis.Produksjon = PR;
const FB = require(SP + '/fabrikkbygg.js'), I = require(SP + '/industri.js'), BR = require(SP + '/baering.js');
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
const nær = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// 1) typene: alle maskiner i MASKINER finnes som fabrikkbygg i Leir.BYGG og som regler i produksjon.js
ok(FB.registrer(Leir), 'registrer(Leir)');
for (const [ind, ms] of Object.entries(FB.MASKINER)) for (const mt of ms) { const B = Leir.BYGG[FB.typeFor(mt)];
  ok(B && B.del && B.maskin && B.maskinType === mt && PR.REGLER.maskiner[mt] && B.kw === -PR.REGLER.maskiner[mt].kw, `${I.navn(+ind)}: ${FB.typeFor(mt)} er en maskin (${B && B.kw} kW)`); }
// bransjene uten regel: forklart, og ingen bransje er glemt
ok(I.ALLE.every(t => FB.MASKINER[t] || FB.UTEN[t]), 'hver bransje har enten maskiner eller en forklaring (lager/verksted)');
ok(Object.keys(FB.MASKINER).every(t => I.IND[t].prod === undefined || FB.MASKINER[t].includes(I.IND[t].prod)), 'maskinene stemmer med Industri.IND[t].prod');
// 2) kanTa
ok(FB.kanTa({ ind: 1, avstand: 900 }).ok, 'sagbruk 900 m fra leiren kan tas');
ok(!FB.kanTa({ ind: 1, avstand: 2500 }).ok && /for langt/.test(FB.kanTa({ ind: 1, avstand: 2500 }).feil), 'for langt unna: ' + FB.kanTa({ ind: 1, avstand: 2500 }).feil);
ok(!FB.kanTa({ ind: 13, avstand: 100 }).ok && /lager eller verksted/.test(FB.kanTa({ ind: 13, avstand: 100 }).feil), 'bryggeri: ' + FB.kanTa({ ind: 13, avstand: 100 }).feil);
ok(!FB.kanTa({ ind: 1, avstand: 100, alt: true }).ok && !FB.kanTa({ ind: 1, avstand: 100, revet: true }).ok, 'alt fabrikk / revet avvises');
// 3) maskinene og istandsettingen
ok(FB.maskinerFor(1, 300).join() === 'sagbruk' && FB.maskinerFor(1, 800).join() === 'sagbruk,flishogger' && FB.maskinerFor(13, 800).length === 0, 'lite sagbruk: saga, stort: saga + flishogger, bryggeri: ingen');
{ const a = FB.istand(['sagbruk']), b = FB.istand(['sagbruk', 'flishogger']); ok(a.kr < Leir.BYGG.sagbruk.pris && b.kr > a.kr && a.timer > 0 && b.timer > a.timer, `istandsetting: ${a.kr / 1e6} mill./${a.timer} t (nytt sagbruk ${Leir.BYGG.sagbruk.pris / 1e6} mill.), to maskiner ${b.kr / 1e6} mill./${b.timer} t`); }
// 4) byggene står der møblene står
{ const møbler = [{ type: 'tømmerstabel', x: 10, y: 10, a: 0 }, { type: 'sagbenk', x: 20, y: 12, a: 1.57 }, { type: 'flishogger', x: 30, y: 12, a: 0 }];
  const B = FB.lagBygg({ ind: 1, areal: 800, møbler, c: [25, 15], hus: 77, id0: 500 });
  ok(B.length === 2 && B[0].type === 'fb_sagbruk' && B[0].x === 20 && B[0].ret === 1.57 && B[1].type === 'fb_flishogger' && B[1].x === 30 && B.every(b => b.fabrikk === 77 && b.igjen > 0), 'lagBygg: saga ved sagbenken, flishoggeren ved sin modell, istandsetting som jobb: ' + JSON.stringify(B.map(b => [b.type, b.x, b.igjen])));
  const C = FB.lagBygg({ ind: 5, areal: 200, møbler: [], c: [5, 6], hus: 1, id0: 9, straks: true }); ok(C.length === 1 && C[0].x === 5 && C[0].y === 6 && C[0].igjen === 0, 'uten møblene: midt i bygget'); }
// 5) i leiren: istandsettingen er en jobb for byggelaget; ferdig går maskinen med de vanlige reglene (folk, råvare, lager)
{ const L = Leir.ny(); const B = FB.lagBygg({ ind: 1, areal: 300, møbler: [], c: [200, 300], hus: 5, id0: 100 }); L.bygg.push(...B);
  ok(Leir.jobber(L).some(j => j.b.id === 100), 'istandsettingen står i jobblista');
  ok(!PR.maskinene(L).length, 'før istandsettingen er ferdig går den ikke');
  B[0].igjen = 0; L.lager.tømmer = 10; const P = PR.ny(), s = PR.steg(P, L, 60, { kraft: 3 }).status[100];
  ok(s && s.går && nær(L.lager.tre, 1.1) && nær(L.lager.tømmer, 8), `saga i fabrikkbygget: ${s && s.tekst}, planker ${L.lager.tre}, tømmer ${L.lager.tømmer}`);
  const s2 = PR.steg(PR.ny(), L, 60, { kraft: 0 }).status[100]; ok(s2 && !s2.går && s2.grunn === 'folk', 'uten folk: «' + (s2 && s2.tekst) + '»');
  // strømmen: saga trekker fra leirens nett som en vanlig maskin
  const st = Leir.steg(L, 1, 1); ok(st && st.behov >= 15 && st.mangler.has(100), `strømmen: leiren må gi ${st && st.behov} kW, og uten aggregat mangler saga strøm`);
  // bærerne og operatørene: plassene ligger rundt maskinen
  const pl = BR.plasser(B[0]); ok(pl && pl.bruks.length === 3 && pl.bruks.every(q => Math.hypot(q.x - 200, q.y - 300) < 8), 'bruksplassene ved saga: ' + JSON.stringify(pl.bruks.map(q => [Math.round(q.x), Math.round(q.y)]))); }
// 6) alle fabrikkmaskinene lager det de skal (en time, nok råvare og folk)
for (const [ind, ms] of Object.entries(FB.MASKINER)) for (const mt of ms) { const R = PR.REGLER.maskiner[mt], L = Leir.ny(), b = FB.lagBygg({ ind: +ind, areal: 900, møbler: [], c: [0, 0], hus: 1, id0: 1, straks: true }).find(q => q.type === FB.typeFor(mt));
  L.bygg.push(b); for (const v of Object.keys(R.inn[0] || {})) L.lager[v] = 50; const s = PR.steg(PR.ny(), L, 60, { kraft: R.folk + 1 }).status[b.id];
  ok(s && s.går, `${FB.typeFor(mt)} går med råvare og folk (${s && s.tekst})`); }
// 7) lagringen per leir
{ const d = FB.nyLogg('1,2'); d.hus[5] = { ind: 1, maskiner: [100] }; const t = JSON.stringify(d); ok(FB.lesLogg(t, '1,2').hus[5].maskiner[0] === 100 && !FB.lesLogg(t, '9,9').hus[5] && !Object.keys(FB.lesLogg('søppel', '1,2').hus).length, 'lagring: bare for samme leir, tåler søppel'); }
console.log(feil ? feil + ' FEIL' : 'alle testene for fabrikkbygg er ok'); process.exit(feil ? 1 : 0);
