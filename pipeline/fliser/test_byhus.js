// Test av byhusreglene (site/dovre-fliser/spill/byhus.js): fasader, etasjer, farger og tak for større bygg i byene.
// Kjør: node pipeline/fliser/test_byhus.js
const B = require('../../site/dovre-fliser/spill/byhus.js');
let feil = 0;
const sjekk = (ok, tekst) => { if (!ok) feil++; console.log(`${ok ? 'ok  ' : 'FEIL'} ${tekst}`); };
const tell = (kl, h, A, tett, enkel = true, n = 3000) => { const c = {}; for (let i = 1; i <= n; i++) { const s = B.stil(kl, 10, i, h, A, tett, enkel); const k = s ? s.fasade : 'ingen'; c[k] = (c[k] || 0) + 1 / n; } return c; };
const pst = c => Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v * 100)} %`).join(', ');

const by = tell('leil', 18, 600, 60);
sjekk(Object.keys(by).length >= 5 && by.murgard > .3 && by.murgard < .6, 'bygårder i sentrum: minst fem fasadetyper, mest murgård – ' + pst(by));
const forstad = tell('leil', 12, 600, 8);
sjekk(!forstad.murgard && forstad.leil > .3, 'blokk utenfor byen: ingen murgård, mest balkongblokk – ' + pst(forstad));
const høy = tell('kontor', 45, 1500, 60);
sjekk(høy.plate > .55 && !høy.murgard, 'høyhus: plate/glass, ikke murgård – ' + pst(høy));
sjekk(B.stil('hus', 0, 5, 6, 120, 60, true) === null && B.stil('industri', 6, 5, 10, 900, 60, true) === null, 'småhus og industri berøres ikke');
const lavButikk = B.stil('butikk', 7, 5, 4, 900, 60, true), butikk = B.stil('butikk', 7, 5, 14, 900, 60, true);
sjekk(lavButikk === null && butikk && butikk.gate, 'lav butikk som før; butikk i bygård får butikkfront i 1. etasje');
sjekk(JSON.stringify(B.stil('leil', 10, 1234, 18, 600, 60, true)) === JSON.stringify(B.stil('leil', 10, 1234, 18, 600, 60, true)), 'samme bygg gir samme svar');

// etasjene passer høyden: (etasjer · etasjehøyde) + evt. butikketasje ≈ h
let verst = 0;
for (let i = 1; i < 2000; i++) { const h = 7.5 + (i % 40) * .7, s = B.stil(i % 2 ? 'leil' : 'kontor', 10, i, h, 500, 50, true); if (!s) continue;
  const eh = B.MÅL[s.fasade][1], sum = s.etasjer * eh + (s.gate ? B.MÅL.gate[1] : 0) + .5; verst = Math.max(verst, Math.abs(sum - h) / eh); }
sjekk(verst <= .55, `etasjene passer høyden (største avvik ${verst.toFixed(2)} etasje)`);

// dempede farger: ingen knallsterke, ingen blåaktige vegger (natt3d.js tenner blåaktige piksler som vinduer)
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
let metning = 0, blå = 0;
for (const [n, l] of Object.entries(B.FARGER)) for (const h of l) { const [r, g, b] = hex(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b); metning = Math.max(metning, mx ? (mx - mn) / mx : 0); if (b - r > .02) blå++; }
sjekk(metning < .5, `fasadefargene er dempede (høyeste metning ${metning.toFixed(2)})`);
sjekk(blå === 0, 'ingen blåaktige veggfarger');

// tak: valm/mansard bare på eldre bygårder i byen med enkelt omriss; grønne tak bare på flate tak
let tak = { valm: 0, mansard: 0, null: 0 }, feilTak = 0, grønt = 0;
for (let i = 1; i < 3000; i++) { const s = B.stil('leil', 10, i, 16, 700, 60, true); if (!s) continue; tak[s.tak] = (tak[s.tak] || 0) + 1;
  if (s.tak && !['murgard', 'tegl'].includes(s.fasade)) feilTak++; if (s.grønt) { grønt++; if (s.tak) feilTak++; }
  const s2 = B.stil('leil', 10, i, 16, 700, 60, false); if (s2 && s2.tak) feilTak++; const s3 = B.stil('leil', 10, i, 16, 700, 5, true); if (s3 && s3.tak) feilTak++; }
sjekk(tak.valm > 200 && tak.mansard > 150 && feilTak === 0, `bygårdstak: valm ${tak.valm}, mansard ${tak.mansard}, flatt ${tak.null}; feil ${feilTak}`);
sjekk(grønt > 50, `noen grønne tak (${grønt})`);

// takhusene ligger inne på taket
let utenfor = 0, antall = 0;
for (let i = 1; i < 1000; i++) { const lu = 10 + (i % 30), lv = 8 + (i % 13); for (const q of B.takhus(i, lu, lv, lu * lv)) { antall++; if (Math.abs(q.du) + q.w > lu / 2 + .01 || Math.abs(q.dv) + q.d > lv / 2 + .01) utenfor++; } }
sjekk(antall > 1000 && utenfor === 0, `takhus inne på taket (${antall} takhus, ${utenfor} utenfor)`);
sjekk(B.takhus(1, 8, 8, 64).length === 0, 'ingen takhus på små tak');

// (runde 15) hvitmalte trehus og teglrøde tak i tette strøk, færre på landet; bare for småhus
const andel = (fn, tett) => { let n = 0; for (let i = 1; i <= 4000; i++) if (fn('hus', i, tett)) n++; return n / 4000; };
const hBy = andel(B.husFarge, 50), hLand = andel(B.husFarge, 0), tBy = andel(B.husTak, 50), tLand = andel(B.husTak, 0);
sjekk(hBy > .7 && hBy < .86 && hLand > .3 && hLand < .46, `hvite trehus: by ${hBy.toFixed(2)}, land ${hLand.toFixed(2)}`);
sjekk(tBy > .42 && tBy < .58 && tLand < .2, `teglrøde tak: by ${tBy.toFixed(2)}, land ${tLand.toFixed(2)}`);
sjekk(B.husFarge('leil', 3, 50) === null && B.husTak('kontor', 3, 50) === null && B.husFarge('hytte', 3, 50) === null, 'bare småhus («hus») får hvit farge/teglrødt tak');
let hvitFeil = 0; for (let i = 1; i < 500; i++) { const f = B.husFarge('hus', i, 50); if (f && !(f[0] > .88 && f[1] > .86 && f[2] > .83)) hvitFeil++; }
sjekk(hvitFeil === 0, 'de hvite fargene er hvite');
// steinkirker: store kirker er murt, små er trekirker
let små = 0; for (let i = 1; i < 500; i++) if (B.steinKirke(150, i)) små++;
sjekk(B.steinKirke(1500, 7) && B.steinKirke(800, 9) && små === 0, `steinkirker: store ja, små nei (${små} små i stein)`);
// takvinkler: kirken brattest, hytta slakere enn huset
const tv = n => Math.atan(B.TAKVINKEL[n][0]) * 180 / Math.PI;
sjekk(tv('kirke') > 48 && tv('hus') > 38 && tv('hus') < 42 && tv('hytte') < tv('hus') && tv('låve') < tv('hus'), `takvinkler: kirke ${tv('kirke').toFixed(0)}°, hus ${tv('hus').toFixed(0)}°, hytte ${tv('hytte').toFixed(0)}°, låve ${tv('låve').toFixed(0)}°`);
// helsebygg: sykehjem får mest «pleie» (altaner), legevakt plate/kontor/tegl; teksturene finnes i MÅL og FASADER
const tellH = (kl) => { const c = {}; for (let i = 1; i < 2000; i++) { const s = B.stil(kl, 15, i, 9, 1200, 20, true); c[s ? s.fasade : 'ingen'] = (c[s ? s.fasade : 'ingen'] || 0) + 1; } return c; };
const sh = tellH("sykehjem"), lv = tellH("legevakt");
sjekk(sh.pleie > 1200 && !sh.ingen && !lv.ingen && !lv.pleie, `sykehjem ${JSON.stringify(sh)}, legevakt ${JSON.stringify(lv)}`);
sjekk(['stein', 'pleie'].every(n => B.MÅL[n] && B.FARGER[n] && B.FASADER.includes(n)), 'stein og pleie har mål, farger og står i FASADER');
// bensinstasjoner: E-veg stor, bygda automat, tettsted vanlig – i rimelige andeler
const bt = (k, by) => { const c = { automat: 0, vanlig: 0, stor: 0 }; for (let i = 0; i < 3000; i++) c[B.bensinType(k, by, i * 37.3, i * 91.7)]++; return c; };
const bE = bt('E', false), bK = bt('K', false), bBy = bt('F', true);
sjekk(bE.stor > 2100 && bE.automat === 0 && bK.automat > 1800 && bK.stor === 0 && bBy.vanlig > 1900 && bBy.stor === 0, `bensin: E ${JSON.stringify(bE)}, K ${JSON.stringify(bK)}, tettsted ${JSON.stringify(bBy)}`);
sjekk(B.bensinType('R', true, 10, 20) === B.bensinType('R', true, 10, 20), 'samme stasjon får samme type');

console.log(feil ? `\n${feil} FEIL` : '\nAlt ok');
process.exit(feil ? 1 : 0);
