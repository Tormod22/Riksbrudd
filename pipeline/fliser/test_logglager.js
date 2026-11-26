// Test for spill/logglager.js (loggen lagres per leir og oppsummeres når spillet åpnes igjen): node pipeline/fliser/test_logglager.js
'use strict';
const LL = require('../../site/dovre-fliser/spill/logglager.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const leir = '196400,6898900';
let L = LL.tom(leir);
for (let i = 0; i < 130; i++) LL.legg(L, 'Melding nr ' + i, i * 2);
ok(L.linjer.length === LL.REGLER.maks && L.linjer[0][1] === 'Melding nr 30', 'høyst 100 linjer, de eldste går ut');
LL.legg(L, 'Kamp om Bryne (×2)', 300, true); LL.legg(L, 'Kamp om Bryne (×3)', 301, true);
ok(L.linjer.filter(q => /Bryne/.test(q[1])).length === 1, 'sammenslått melding (×n) erstatter den forrige linja');
// lagres og leses, en ny økt
LL.legg(L, 'Vaktlaget er sendt mot tankbilen (1,2 km).', 590); LL.legg(L, 'Det klarner opp.', 594);
const t = LL.pakk(L), M = LL.les(t, leir); M.økt += 1;
ok(M.linjer.length === L.linjer.length, 'leses inn igjen for samme leir');
ok(LL.les(t, '1,2').linjer.length === 0 && LL.les('{ødelagt', leir).linjer.length === 0, 'annen leir eller ødelagt tekst gir tom logg');
const o = LL.oppsummer(M);
ok(o && o.viktige[0].tekst.startsWith('Vaktlaget er sendt') && !o.viktige.some(v => /klarner/.test(v.tekst)), 'oppsummeringen: viktige meldinger, nyeste øverst, uten vær');
ok(o.til.dag === 1 && o.til.klokke === '15:54' && LL.tittel(o).startsWith('dag 1'), 'klokkeslett: tid 594 = dag 1 kl. 15:54');
ok(LL.når(1440).dag === 2 && LL.når(1440).klokke === '06:00', 'tid 1440 = dag 2 kl. 06:00');
LL.legg(M, 'Ny melding i denne økta', 600); ok(LL.oppsummer(M).alle === LL.REGLER.maks - 1, 'oppsummeringen gjelder forrige økt (den nye meldingen telles ikke)');
ok(LL.oppsummer(LL.tom(leir)) === null, 'ingen tidligere meldinger: ingen oppsummering');
// RUNDE 14 (kritiker I og J)
{ let A = LL.tom(leir);
  LL.legg(A, 'Farten er senket til 10×: et bygg er ferdig.', 10); LL.legg(A, 'Kampen om leiren er i gang – røverne angriper.', 20); LL.legg(A, 'Brakke er ferdig.', 25);
  LL.legg(A, 'Hogstlaget fant skog.', 26); LL.legg(A, 'Røysland er vårt.', 30); LL.legg(A, 'Bølge 1 er slått tilbake.', 40); LL.legg(A, 'Ola Moen falt i kampen.', 45);
  LL.legg(A, 'Dieseltank er ferdig.', 50); LL.legg(A, 'Aggregat er bestilt.', 55); LL.legg(A, 'Mats Li snakker om å dra sin vei. – betal en bonus.', 60);
  A = LL.les(LL.pakk(A), leir); A.økt += 1; const o = LL.oppsummer(A);
  ok(o && !o.viktige.some(v => /Farten/.test(v.tekst)), '«Farten er senket» er aldri med');
  ok(o.viktige.some(v => /Røysland er vårt/.test(v.tekst)) && o.viktige.some(v => /falt/.test(v.tekst)) && o.viktige.some(v => /bonus/.test(v.tekst)), 'tettsted, tap og valg prioriteres');
  ok(o.viktige.findIndex(v => /Kampen om leiren/.test(v.tekst)) < o.viktige.findIndex(v => /slått tilbake/.test(v.tekst)), 'eldste melding først');
  ok(o.antall === o.viktige.length && o.antall <= LL.REGLER.viktigeMaks, 'tallet = antall viste linjer');
  // F5 rett etter F5: økta før har ingen meldinger -> ingen boks
  const B = LL.les(LL.pakk(A), leir); B.økt += 1; ok(LL.oppsummer(B) === null, 'F5 rett etter F5 gir ingen velkomst');
  // ingen tid har gått i forrige økt
  let C = LL.tom(leir); LL.legg(C, 'Røysland er vårt.', 0); LL.legg(C, 'Ola falt.', 0); C = LL.les(LL.pakk(C), leir); C.økt += 1; ok(LL.oppsummer(C) === null, 'ingen velkomst når ingen tid har gått (06:00–06:00)'); }
// (løkka r1, kritiker J: velkomsten viste dag 1 12:50–13:12 da spillet sto på 16:34) bare det siste som skjedde, med klokkeslett
{ let A = LL.tom(leir); LL.legg(A, 'Brakke er bestilt.', 400); LL.legg(A, 'Ola Moen falt i kampen.', 412); LL.legg(A, 'Hogstlaget fant skog.', 420);
  A = LL.les(LL.pakk(A), leir); A.økt += 1; const o = LL.oppsummer(A, LL.REGLER, 634);
  ok(o && o.stille && o.antall === 1 && /falt/.test(o.viktige[0].tekst) && o.viktige[0].klokke === '12:52' && o.nå.klokke === '16:34', 'gamle meldinger: bare den siste viktige, og klokka spillet står på (' + (o && o.nå.klokke) + ')');
  let B = LL.tom(leir); LL.legg(B, 'Brakke er bestilt.', 100); LL.legg(B, 'Ola Moen falt i kampen.', 560); LL.legg(B, 'Vaktlaget er sendt mot Otta.', 600);
  B = LL.les(LL.pakk(B), leir); B.økt += 1; const p = LL.oppsummer(B, LL.REGLER, 634);
  ok(p && !p.stille && p.antall === 2 && !p.viktige.some(v => /Brakke/.test(v.tekst)), 'bare meldingene fra de siste ' + LL.REGLER.nylig + ' minuttene før lagringen'); }
// (R2-løkka) en levert kontrakt er viktig nok til velkomsten
{ let A = LL.tom(leir); LL.legg(A, 'Røverne angriper leiren fra nord!', 1500); LL.legg(A, 'Kontrakt levert: Eskorter tankbilen. Kommunen betalte 2,7 mill. kr.', 1800);
  A = LL.les(LL.pakk(A), leir); A.økt += 1; const o = LL.oppsummer(A, LL.REGLER, 1820);
  ok(o && o.viktige.some(v => /Kontrakt levert/.test(v.tekst)), 'velkomsten tar med en levert kontrakt'); }
{ const D = require('../../site/dovre-fliser/spill/loggdemp.js').lag();
  ok(D.vurder('Spillform: Vanlig · Hold byen.', [], 0, true) === null && D.vurder('Ravnsund (rød) holder til i Rognan, 8 km nord for leiren.', [], 0, true) === null && D.vurder('Velkommen tilbake, Ivar. Har har 3 mill. kr i kassa.', [], 0, true) === null, 'omlasting: innledningen skrives ikke i loggen');
  ok(!!D.vurder('Spillform: Vanlig · Hold byen.', [], 0, false), 'nytt spill: innledningen skrives'); }
console.log(feil ? `${feil} FEIL` : 'Alle testene for logglager.js er ok'); process.exit(feil ? 1 : 0);
