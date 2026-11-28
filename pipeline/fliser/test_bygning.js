// Test for spill/bygning.js (byggemodellen, fase B0): node pipeline/fliser/test_bygning.js  (standard: 448 prøvehus; FULL=1: alle 2128)
const B = require('../../site/dovre-fliser/spill/bygning.js'), I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const FORMER = { rekt: (w, h) => rekt(w, h), L: (w, h) => [[0, 0], [w, 0], [w, h * .5], [w * .5, h * .5], [w * .5, h], [0, h]], skjev: (w, h) => [[0, 0], [w, 1.5], [w - 1, h + 1], [-1, h - .5]],
  T: (w, h) => [[0, 0], [w, 0], [w, h * .45], [w * .65, h * .45], [w * .65, h], [w * .35, h], [w * .35, h * .45], [0, h * .45]] };
const STOR = /industri|lager|hangar|terminal|skole|sykehus|kirke|butikk|låve/;
const avstKant = (P, x, y) => { let d = Infinity; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; d = Math.min(d, B.avstSeg(x, y, a[0], a[1], b[0], b[1])); } return d; };
const tall = (o, sti = '') => { if (typeof o === 'number') return Number.isFinite(o) ? [] : [sti]; if (!o || typeof o !== 'object') return []; return Object.entries(o).flatMap(([k, v]) => tall(v, sti + '.' + k)); };

// ---------- etasjer fra høyden (kapittel 5.3) ----------
{ const hus9 = B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' }), t = B.telle(hus9);
  ok(t.etasjer === 2 && t.loft, 'hus 9 m med saltak: to etasjer og loft (' + t.etasjer + ', loft ' + t.loft + ', vegg ' + hus9.høyde.vegg + ' m, møne ' + hus9.høyde.møne + ' m)');
  const hus6 = B.fraKart(rekt(10, 8), { i: 77, kl: 'hus', h: 6, tak: 'saltak' }); ok(B.telle(hus6).etasjer === 1 && B.telle(hus6).loft, 'hus 6 m med saltak: én etasje og loft');
  const by = B.fraKart(rekt(24, 13), { i: 5, kl: 'leil', h: 18, tak: 'flatt' }); ok(B.telle(by).etasjer === 6 && !B.telle(by).loft, 'bygård 18 m med flatt tak: seks etasjer (' + B.telle(by).etasjer + ')');
  // bygården: trapperom i midten og en leilighet på hver side (med kjøkken), trappene i trapperommet
  const e2 = by.etasjer.find(e => e.n === 2), kj = by.kjerne;
  ok(kj && e2.rom.some(r => r.rolle === 'trapperom') && e2.rom.filter(r => r.rolle === 'kjøkken').length === 2 && e2.åpninger.filter(o => o.leilighet).length === 2,
    'bygård: trapperom i midten, to leiligheter med kjøkken og dør til trapperommet i hver etasje (' + e2.rom.map(r => r.rolle).join(', ') + ')');
  ok(kj && by.trapper.filter(t => t.fra > 0).every(t => B.trappP(t).every(p => p[0] * by.akse.ux + p[1] * by.akse.uy > kj.c0 - .01 && p[0] * by.akse.ux + p[1] * by.akse.uy < kj.c1 + .01)), 'bygård: trappene står i trapperommet');
  const kontor = B.fraKart(rekt(30, 14), { i: 6, kl: 'kontor', h: 13, tak: 'flatt' }); ok(B.telle(kontor).etasjer === 4, 'kontor 13 m (3,2 m per etasje): fire etasjer (' + B.telle(kontor).etasjer + ')');
  const hall = B.fraKart(rekt(40, 25), { i: 7, kl: 'industri', h: 12 }); ok(B.telle(hall).etasjer === 1 && hall.etasjer[0].takhøyde > 8, 'industrihall 12 m: én etasje i full høyde (' + hall.etasjer[0].takhøyde + ' m)');
  const butikk = B.fraKart(rekt(20, 14), { i: 8, kl: 'butikk', h: 11, tak: 'flatt' }); ok(B.telle(butikk).etasjer === 3 && butikk.etasjer.find(e => e.n === 2).rom.some(r => /soverom|stue|bad/.test(r.rolle)), 'butikk 11 m: butikk nede og leiligheter i to etasjer over');
  const høy = B.fraKart(rekt(20, 14), { i: 9, kl: 'leil', h: 60, tak: 'flatt' }), åpne = høy.etasjer.filter(e => !e.stengt && !e.kjeller);
  ok(B.telle(høy).etasjer === 22 && åpne.length === 7 && åpne.map(e => e.n).join() === '1,2,3,4,5,6,22', 'høyhus 60 m: 22 etasjer, bare 1–6 og den øverste har innhold (' + åpne.map(e => e.n).join(',') + ')');
  ok(høy.etasjer.filter(e => e.stengt).every(e => e.rom.length === 1 && e.møbler.length === 0), 'høyhus: de stengte etasjene er tomme');
  const typ = B.fraKart(rekt(10, 8), { i: 81234, t: 0, h: 9 }); ok(typ.kl === 'hus', 'klassen fra OSM-typen (t 0 = bolig): ' + typ.kl);
  ok(B.fraKart(rekt(12, 9), { i: 3, kl: 'hus', h: 6, tak: 'flatt' }).etasjer.every(e => !e.loft), 'flatt tak: ikke noe loft');
}

// ---------- tusenvis av prøvehus ----------
const KART = Object.keys(I.KLASSE).filter(k => !I.KLASSE[k].leir), N = process.env.FULL ? 38 : 8;
const prøve = []; let nr = 0, tid = 0, tidBolig = 0, nBolig = 0, krasj = 0; const krasjL = [];
for (const kl of KART) for (const [fn, f] of Object.entries(FORMER)) for (let k = 0; k < N; k++) {
  const stor = STOR.test(kl), w = (stor ? 12 : 6) + (k * 4.3) % (stor ? 45 : 14), d = (stor ? 9 : 5) + (k * 2.9) % (stor ? 24 : 8), v = k * .53 + .2;
  const P = f(w, d).map(([x, y]) => [x * Math.cos(v) - y * Math.sin(v) + 300, x * Math.sin(v) + y * Math.cos(v) + 120]);
  // høyder fra lave hus til høyhus (hvert 9. bygg i de store klassene)
  const h = kl === 'uthus' || kl === 'hytte' ? 3 + (k * 1.3) % 6 : k % 9 === 8 && /leil|kontor/.test(kl) ? 30 + (k * 3.1) % 40 : 3.5 + (k * 1.7) % 16;
  const info = { i: 7000 + nr * 37, kl, h, tett: (k * 7) % 40 }; nr++;
  const t0 = process.hrtime.bigint(); let m = null;
  try { m = B.fraKart(P, info); } catch (e) { krasj++; krasjL.push(kl + '/' + fn + ': ' + e.message); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6; tid += ms; if (/hus|leil|hytte/.test(kl)) { tidBolig += ms; nBolig++; }
  if (m) prøve.push({ kl, fn, w, d, h, P, info, m, ms });
}
ok(krasj === 0, nr + ' prøvehus (' + KART.length + ' klasser × 4 former × ' + N + ' størrelser og høyder) – ingen krasjer ' + krasjL.slice(0, 3).join('; '));
const snitt = tid / nr, maks = Math.max(...prøve.map(p => p.ms));
console.log('     tid: ' + snitt.toFixed(1) + ' ms per hus i snitt, boliger ' + (tidBolig / nBolig).toFixed(1) + ' ms, lengste ' + maks.toFixed(0) + ' ms');
ok(snitt < 120, 'fraKart er raskt nok til ~10 hus mens du går (snitt ' + snitt.toFixed(1) + ' ms, under 120)');

{ // ren JSON, ingen NaN/uendelig
  let galt = 0, ikkeJson = 0; for (const { m } of prøve) { if (tall(m).length) galt++; const s = JSON.stringify(m); if (JSON.stringify(JSON.parse(s)) !== s) ikkeJson++; }
  ok(galt === 0 && ikkeJson === 0, 'modellen er ren JSON uten NaN (' + galt + ' med rare tall, ' + ikkeJson + ' ikke JSON)');
}
{ // antall etasjer stemmer med høyden
  let galt = 0; const L = [];
  for (const { kl, m } of prøve) { const vanlige = m.etasjer.filter(e => !e.loft && !e.kjeller), sum = vanlige.reduce((a, e) => a + e.høyde, 0), et = B.REGLER.etasje[kl] || 2.7, første = B.REGLER.førsteEtasje[kl] || et;
    const hall = !!B.REGLER.hall[kl], ventet = hall ? 1 : m.høyde.vegg < første ? 1 : 1 + Math.floor((m.høyde.vegg - første) / (B.REGLER.etasje[B.REGLER.oppe[kl]] || et) + .02);
    if (vanlige.length !== ventet || Math.abs(sum - m.høyde.vegg) > .06 || vanlige.some((e, k) => e.z !== +(vanlige.slice(0, k).reduce((a, q) => a + q.høyde, 0)).toFixed(2) && Math.abs(e.z - vanlige.slice(0, k).reduce((a, q) => a + q.høyde, 0)) > .03)) { galt++; L.push(kl + ' ' + m.høyde.vegg + ': ' + vanlige.length + '/' + ventet); } }
  ok(galt === 0, 'antall etasjer = veggens høyde / etasjehøyden, avrundet ned, og etasjene fyller veggen (' + galt + ' feil ' + L.slice(0, 3).join(', ') + ')');
  const loftFeil = prøve.filter(({ m }) => m.etasjer.some(e => e.loft) && !(m.tak.form !== 'flatt' && m.høyde.møne >= B.REGLER.loftMin)).length;
  ok(loftFeil === 0, 'loft bare under saltak/valm med mønet minst 2,2 m over loftsgulvet (' + loftFeil + ')');
  const n = prøve.length, med = k => prøve.filter(({ m }) => m.etasjer.some(e => e[k])).length;
  console.log('     ' + med('loft') + ' av ' + n + ' har loft, ' + med('kjeller') + ' kjeller, ' + prøve.filter(({ m }) => B.telle(m).etasjer > 1).length + ' flere etasjer, ' + med('stengt') + ' høyhus med stengte etasjer');
  ok(med('loft') > 50 && med('kjeller') > 50, 'noen har loft og noen kjeller');
}
{ // alle rom nås fra en dør i 1. etasje og via trappene i de andre
  let galt = 0, rom = 0; const L = [];
  for (const { kl, fn, m } of prøve) for (const q of B.nås(m)) { rom += q.rom; if (q.uten.length || (q.rom && !q.kilder)) { galt++; L.push(kl + '/' + fn + ' etasje ' + q.n + ': ' + q.uten.length + ' av ' + q.rom); } }
  ok(galt === 0, rom + ' rom i alle etasjene: alle nås fra ytterdøra via dører og trapper (' + galt + ' etasjer med rom som ikke nås ' + L.slice(0, 4).join('; ') + ')');
}
{ // trappene: én mellom hver etasje som har innhold, inne i omrisset, med hull i dekket over
  let mangler = 0, ute = 0, uhull = 0, stige = 0, rett = 0, usikker = 0;
  for (const { m } of prøve) { const ns = m.etasjer.map(e => e.n);
    for (let k = 0; k < ns.length - 1; k++) { const t = m.trapper.filter(q => q.fra === ns[k] && q.til === ns[k + 1]); if (t.length !== 1) mangler++; }
    for (const t of m.trapper) { if (t.usikker) usikker++; if (t.form === 'stige') stige++; else rett++; if (!B.trappP(t).every(p => B.inni(m.P, p[0], p[1]))) ute++;
      if (!t.antatt && !m.etasjer.find(e => e.n === t.til).dekke.hull.length) uhull++; } }
  ok(mangler === 0 && usikker === 0, 'en trapp mellom hver etasje (' + mangler + ' mangler, ' + usikker + ' nødløsninger)');
  ok(ute === 0 && uhull === 0, 'trappene står inne i bygget og har hull i dekket over (' + ute + ' ute, ' + uhull + ' uten hull)');
  console.log('     trapper: ' + rett + ' rette, ' + stige + ' stiger (loftsluke eller trangt)');
}
{ // ingen vegger utenfor omrisset, åpningene ligger i veggen og ikke oppå hverandre
  let ute = 0, åpGalt = 0, over = 0;
  for (const { m } of prøve) for (const e of m.etasjer) { for (const w of e.vegger) { const mx = (w.a[0] + w.b[0]) / 2, my = (w.a[1] + w.b[1]) / 2;
      if ([w.a, w.b, [mx, my]].some(p => !B.inni(m.P, p[0], p[1]) && avstKant(m.P, p[0], p[1]) > .06)) ute++; }
    for (const o of e.åpninger) { const w = e.vegger[o.vegg], L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (!w || o.t - o.b / 2 < -.05 || o.t + o.b / 2 > L + .05) åpGalt++;
      if (e.åpninger.some(q => q !== o && q.vegg === o.vegg && Math.abs(q.t - o.t) < (q.b + o.b) / 2 - .05)) over++; } }
  ok(ute === 0, 'ingen vegger utenfor omrisset (' + ute + ')');
  ok(åpGalt === 0 && over === 0, 'dører og vinduer ligger i veggen sin og ikke oppå hverandre (' + åpGalt + ' utenfor, ' + over + ' overlapp)');
}
{ // bærende vegger: ytterveggene, og innvendige vegger så dekkene holder; huset står som bygget (ingen ras uten endringer)
  let ytterIkke = 0, raser = 0, flere = 0, medInne = 0;
  for (const { m } of prøve) { for (const e of m.etasjer) for (const w of e.vegger) if (w.type === 'ytter' && !w.bærende) ytterIkke++;
    if (B.telle(m).etasjer > 1) { flere++; if (m.etasjer.some(e => e.vegger.some(w => w.type === 'skille' && w.bærende))) medInne++; }
    if (B.ras(B.kopi(m)).length) raser++; }
  ok(ytterIkke === 0, 'alle yttervegger er bærende (' + ytterIkke + ')');
  ok(medInne >= flere * .5, medInne + ' av ' + flere + ' hus med flere etasjer har bærende innervegger');
  ok(raser === 0, 'ingen hus raser av seg selv (' + raser + ')');
}
{ // samme hus gir samme modell
  let ulik = 0; for (const p of prøve.filter((_, k) => k % 7 === 0)) if (JSON.stringify(B.fraKart(p.P, p.info)) !== JSON.stringify(p.m)) ulik++;
  ok(ulik === 0, 'samme hus gir alltid samme modell (' + ulik + ' ulike)');
  const a = B.fraKart(rekt(10, 8), { i: 1, kl: 'hus', h: 9 }), b = B.fraKart(rekt(10, 8), { i: 2, kl: 'hus', h: 9 });
  ok(JSON.stringify(a.etasjer[0].rom) !== JSON.stringify(b.etasjer[0].rom) || JSON.stringify(a.etasjer[0].møbler) !== JSON.stringify(b.etasjer[0].møbler), 'to hus med samme omriss, men ulikt nummer, er ulike');
  // 1. etasje er planen fra interior.js (samme rom, døråpninger og møbler)
  const P = rekt(11, 8), d = B.finnDør(P, 'hus'), pl = I.plan(P, { i: 42, kl: 'hus', h: 6, dør: d }), m = B.fraKart(P, { i: 42, kl: 'hus', h: 6 }), e1 = m.etasjer.find(e => e.n === 1);
  ok(e1.rom.length === pl.rom.filter(r => r.andel > .15).length && e1.rom.map(r => r.rolle).join() === pl.rom.filter(r => r.andel > .15).map(r => r.rolle).join(), '1. etasje har rommene fra interior.js (' + e1.rom.map(r => r.rolle).join(', ') + ')');
  ok(e1.møbler.length <= pl.møbler.length && e1.møbler.length >= pl.møbler.length - 4, '1. etasje har møblene fra interior.js (' + e1.møbler.length + ' av ' + pl.møbler.length + '; trappa kan ta noen)');
  ok(e1.åpninger.filter(o => o.type === 'dør' && e1.vegger[o.vegg].type === 'skille').length === pl.dører.length, 'døråpningene fra interior.js er åpninger i skilleveggene (' + pl.dører.length + ')');
  // interior.js er uendret etterpå
  ok(!I.ROMSETT.bygning_oppe && I.TYPER.hus.romsett === 'bolig', 'interior.js er uendret etter fraKart');
  const to = B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' }), e2 = to.etasjer.find(e => e.n === 2);
  ok(e2.rom.some(r => r.rolle === 'soverom') && !e2.rom.some(r => r.rolle === 'kjøkken' || r.rolle === 'vindfang'), 'bolig: soverom oppe, ikke kjøkken og vindfang (' + e2.rom.map(r => r.rolle).join(', ') + ')');
  ok(!e2.åpninger.some(o => o.type === 'dør' && e2.vegger[o.vegg].type === 'ytter'), '2. etasje har ingen ytterdør (vindu over døra)');
}

// ---------- endringer og ras (kapittel 5.4) ----------
{ const m0 = B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' }), m = B.kopi(m0), e1 = m.etasjer.find(e => e.n === 1);
  const lett = e1.vegger.find(w => w.type === 'skille' && !w.bærende), s1 = B.endre(m, { e: 1, del: 'vegg', id: lett.id, gjør: 'riv' });
  ok(s1.ok && !s1.ras.length && s1.materialer.tre > 0 && !s1.advarsel, 'riv en lett skillevegg: ingen ras, gir ' + s1.materialer.tre + ' m³ tre (' + s1.timer + ' t)');
  ok(B.tekst({ e: 1, del: 'vegg', id: 7, gjør: 'riv' }, 81234) === 'hus 81234, etasje 1, vegg 7: revet', 'endringsloggen i tekst: «' + B.tekst({ e: 1, del: 'vegg', id: 7, gjør: 'riv' }, 81234) + '»');
  ok(m.endringer.length === 1 && m.etasjer.find(e => e.n === 1).vegger[lett.id].tilstand === 'revet', 'endringen er logget og veggen er revet (nummeret beholdes)');
  const igjen = B.endre(m, { e: 1, del: 'vegg', id: lett.id, gjør: 'riv' }); ok(!igjen.ok && igjen.feil, 'en revet vegg kan ikke rives igjen: ' + igjen.feil);
  // ny åpning i bærende vegg krever bjelke
  const ytter = e1.vegger.find(w => w.type === 'ytter' && Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) > 7), frie = t => !e1.åpninger.some(o => o.vegg === ytter.id && Math.abs(o.t - t) < o.b / 2 + .8);
  let t0 = 1; while (t0 < 9 && !frie(t0)) t0 += .25;
  const u1 = B.endre(m, { e: 1, del: 'åpning', gjør: 'ny', vegg: ytter.id, t: t0, type: 'vindu', b: 1 });
  ok(!u1.ok && /bjelke/.test(u1.feil), 'nytt vindu i bærende vegg uten bjelke avvises: ' + u1.feil);
  const u2 = B.endre(m, { e: 1, del: 'åpning', gjør: 'ny', vegg: ytter.id, t: t0, type: 'vindu', b: 1, bjelke: true });
  ok(u2.ok && e1.åpninger[u2.id].bjelke && e1.åpninger[u2.id].type === 'vindu', 'med bjelke går det (nytt vindu ' + u2.id + ')');
  const u3 = B.endre(m, { e: 1, del: 'åpning', gjør: 'ny', vegg: ytter.id, t: t0 + .2, type: 'vindu', b: 1, bjelke: true }); ok(!u3.ok, 'to åpninger oppå hverandre avvises: ' + u3.feil);
  // barrikadere hoveddøra: 1. etasje har ingen vei inn lenger
  const dør = e1.åpninger.find(o => o.inngang === 'hoved'), b1 = B.endre(m, { e: 1, del: 'åpning', id: dør.id, gjør: 'barrikader' });
  ok(b1.ok && dør.sperre === 'planker', 'barrikader hoveddøra');
  const inn = B.nås(m).find(q => q.n === 1); ok(inn.kilder === B.nås(m0).find(q => q.n === 1).kilder - 1, 'en barrikadert dør er ikke lenger en vei inn (' + inn.kilder + ' innganger igjen)');
  // vurder endrer ingenting
  const før = JSON.stringify(m), v = B.vurder(m, { e: 1, del: 'vegg', id: e1.vegger.find(w => w.type === 'ytter').id, gjør: 'riv' });
  ok(JSON.stringify(m) === før && v.ok && v.advarsel, 'vurder() sier hva som skjer uten å endre (' + v.advarsel + ', ' + v.ras.length + ' deler raser)');
  // riv en yttervegg: veggen over raser med, og det gir materialer
  const yid = e1.vegger.find(w => w.type === 'ytter').id, r1 = B.endre(m, { e: 1, del: 'vegg', id: yid, gjør: 'riv' });
  ok(r1.ok && r1.ras.some(q => q.e === 2 && q.del === 'vegg'), 'riv en yttervegg i 1. etasje: ytterveggen over raser (' + r1.ras.length + ' deler: ' + r1.ras.slice(0, 4).map(q => q.del + ' ' + q.e + ':' + q.id).join(', ') + ')');
  // medEndringer gir det samme som å gjøre endringene én og én
  const mm = B.medEndringer(m0, m.endringer); delete mm.svar;
  ok(JSON.stringify(mm) === JSON.stringify(m), 'medEndringer(fraKart(...), logg) gir det endrede bygget (' + m.endringer.length + ' endringer lagret)');
  ok(JSON.stringify(m.endringer).length < 600, 'bare endringene lagres (' + JSON.stringify(m.endringer).length + ' tegn mot ' + JSON.stringify(m).length + ' for hele modellen)');
  // etasjene rives ovenfra
  const m2 = B.kopi(m0), f1 = B.endre(m2, { e: 1, del: 'etasje', gjør: 'riv' }); ok(!f1.ok && /over/.test(f1.feil), 'riv 1. etasje mens 2. står: ' + f1.feil);
  const lo = m2.etasjer.find(e => e.loft); if (lo) ok(B.endre(m2, { e: lo.n, del: 'etasje', gjør: 'riv' }).ok, 'loftet rives først (taket med)');
  const f2 = B.endre(m2, { e: 2, del: 'etasje', gjør: 'riv' }); ok(f2.ok && Object.values(f2.materialer).some(v => v > 0) && m2.tak.felt.every(f => f.tilstand === 'revet'), 'så 2. etasje: gir ' + JSON.stringify(f2.materialer));
}
{ // bærende innervegger: riv dem i et bredt hus, og dekket over raser; med bjelke først holder det
  let prøvd = 0, rast = 0, holdt = 0, enkelt = 0;
  for (const p of prøve) { const m = p.m; if (prøvd >= 40 || B.telle(m).etasjer < 2 || m.akse.v1 - m.akse.v0 < 9) continue;
    const e1 = m.etasjer.find(e => e.n === 1), bær = e1.vegger.filter(w => w.type === 'skille' && w.bærende); if (!bær.length) continue; prøvd++;
    const a = B.kopi(m); let ras = []; for (const w of bær) ras = ras.concat(B.endre(a, { e: 1, del: 'vegg', id: w.id, gjør: 'riv' }).ras); if (ras.some(q => q.e === 2 && q.del === 'dekke')) rast++;
    // én bærende vegg som gir ras alene: med en bjelke først (langs veggen, til noe som står på tvers) raser ingenting
    const w = bær.find(w => B.vurder(m, { e: 1, del: 'vegg', id: w.id, gjør: 'riv' }).ras.some(q => q.del === 'dekke'));
    if (w) { enkelt++; const b = B.kopi(m); B.endre(b, { e: 1, del: 'bjelke', gjør: 'ny', vegg: w.id }); if (!B.endre(b, { e: 1, del: 'vegg', id: w.id, gjør: 'riv' }).ras.length) holdt++; } }
  ok(prøvd >= 10 && rast >= prøvd * .6, 'riv de bærende innerveggene i ' + prøvd + ' brede hus: dekket over raser i ' + rast);
  ok(enkelt >= 5 && holdt === enkelt, 'en bærende vegg som gir ras alene: med en bjelke først raser ingenting (' + holdt + ' av ' + enkelt + ')');
}
{ // et dekke som raser tar møblene med seg, og taket raser når ytterveggene i øverste etasje er borte
  const m = B.kopi(B.fraKart(rekt(14, 11), { i: 31, kl: 'leil', h: 6, tak: 'flatt' })), e1 = m.etasjer.find(e => e.n === 1);
  let ras = []; for (const w of e1.vegger) if (w.bærende && w.type !== 'ytter') ras = ras.concat(B.endre(m, { e: 1, del: 'vegg', id: w.id, gjør: 'riv' }).ras);
  for (const w of e1.vegger.filter(w => w.type === 'ytter').slice(0, 2)) ras = ras.concat(B.endre(m, { e: 1, del: 'vegg', id: w.id, gjør: 'riv' }).ras);
  ok(ras.some(q => q.del === 'tak'), 'leilighetsbygg i én etasje: river du bærende vegger, raser taket (' + ras.filter(q => q.del === 'tak').length + ' takfelt)');
  const m2 = B.kopi(B.fraKart(rekt(10, 8), { i: 81234, kl: 'hus', h: 9, tak: 'saltak' })), e2 = m2.etasjer.find(e => e.n === 2), r = e2.dekke.felt[0];
  const s = B.endre(m2, { e: 2, del: 'dekke', id: r.id, gjør: 'riv' }); ok(s.ok && s.materialer.tre > 0 && e2.dekke.felt[0].tilstand === 'revet', 'riv dekket under et rom i 2. etasje: gir tre, møblene der går i stykker (' + s.ras.length + ')');
}

// ---------- byggesettet som samme modell ----------
{ const BS = require('../../site/dovre-fliser/spill/byggesett.js');
  const deler = BS.husDeler('brakke', 0, 0).map((d, k) => Object.assign({ id: 'd' + k, n: d.n !== undefined ? d.n : BS.DELER[d.type].kat === 'tak' ? 1 : 0 }, d));
  const m = B.fraByggesett(deler, { ox: 1000, oy: 2000 }), e = m && m.etasjer[0];
  ok(m && m.kilde === 'byggesett' && m.etasjer.length === 1, 'brakka fra byggesettet blir én etasje');
  ok(e && e.vegger.length === 14 && e.vegger.every(w => w.type === 'ytter' && w.bærende), 'brakka (4 × 3 ruter): 14 yttervegger (' + (e && e.vegger.length) + ')');
  ok(e && e.åpninger.filter(o => o.type === 'dør').length === 1 && e.åpninger.filter(o => o.type === 'vindu').length >= 2, 'dør og vinduer fra delene (' + (e && e.åpninger.map(o => o.type).join(',')) + ')');
  ok(e && e.rom.length === 1 && e.rom[0].areal > 60 && m.tak.form === 'saltak' && m.tak.felt.length === 12, 'ett rom fra byggesett.js (' + (e && e.rom[0] && e.rom[0].areal) + ' m²) og saltak');
  ok(B.nås(m)[0].uten.length === 0, 'rommet i brakka nås fra døra');
  ok(JSON.stringify(JSON.parse(JSON.stringify(m))) === JSON.stringify(m), 'byggesett-modellen er ren JSON');
  // to etasjer: gulv i 2. etasje og vegger over
  const to = deler.concat(BS.husDeler('bunker', 0, 0).filter(d => BS.DELER[d.type].kat === 'vegg').map((d, k) => Object.assign({}, d, { id: 'o' + k, n: 1, type: 'bs_vegg_tre' })))
    .concat([{ id: 'g2', type: 'bs_tregulv', i: 0, j: 0, a: null, n: 1 }]);
  const m2 = B.fraByggesett(to, { ox: 0, oy: 0 }); ok(m2.etasjer.length === 2 && m2.trapper.length === 1 && m2.trapper[0].antatt, 'to etasjer i byggesettet: trappa antas inne (som i byggesett.js)');
  ok(B.fraByggesett([], {}) === null, 'ingen deler: ingen modell');
}

console.log(feil ? `\n${feil} FEIL` : '\nAlle tester bestått');
process.exit(feil ? 1 : 0);
