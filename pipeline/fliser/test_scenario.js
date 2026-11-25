// Test av reglene i spill/scenario.js og krigsmålene i spill/maal.js. Kjør: node pipeline/fliser/test_scenario.js
const S = require('../../site/dovre-fliser/spill/scenario.js'), M = require('../../site/dovre-fliser/spill/maal.js'), D = require('../../site/dovre-fliser/spill/spillet.js').Deling;
let feil = 0; const ok = (v, t) => { console.log((v ? 'ok   ' : 'FEIL ') + t); if (!v) feil++; };
// valgene
let r = S.regler({});
ok(r.vanskelighet === 'vanlig' && r.faktor.penger === 1 && r.faktor.fiende === 1 && r.faktor.røvere === 1 && !r.scenario && !r.har('ingenRadio'), 'uten valg: vanlig');
r = S.regler({ vanskelighet: 'hard', utfordringer: ['tomKasse', 'ingenRadio', 'tull', 'ingenRadio'], scenario: 'hold', styrke: 2 });
ok(r.utfordringer.join() === 'tomKasse,ingenRadio' && r.har('ingenRadio') && Math.abs(r.faktor.penger - .06) < 1e-9 && Math.abs(r.faktor.fiende - 1.8) < 1e-9 && r.scenario === 'hold', 'hard med utfordringer, ukjente og doble tas bort');
ok(S.regler({ vanskelighet: 'lett' }).faktor.fiende < 1 && S.regler({ scenario: 'finnes ikke' }).scenario === null, 'lett og ukjent scenario');
ok(/Hard/.test(S.beskriv(r)) && /Ingen radio/.test(S.beskriv(r)) && /Hold byen/.test(S.beskriv(r)), 'beskrivelsen');
// scenariet «hold»
const T = o => ({ tid: 0, egne: 0, holder: () => false, mål: 'by1', folk: 10, andel: 0, leirTapt: false, ...o });
let st = {};
ok(S.vurder('hold', T({}), st).status === 'pågår', 'hold: pågår');
S.vurder('hold', T({ tid: 1000, holder: id => id === 'by1' }), st); ok(st.holdtFra === 1000, 'hold: klokka starter når byen er din');
ok(S.vurder('hold', T({ tid: 1000 + 2 * 1440, holder: () => true }), st).status === 'pågår', 'hold: to døgn er ikke nok');
S.vurder('hold', T({ tid: 4000 }), st); ok(st.holdtFra === null, 'hold: mister du byen, begynner tellingen på nytt');
// runde 14: navnet i teksten, 24 timer = 1,0, eieren ukjent etter omlasting nullstiller ikke, tapt by gir mistetVed
{ const st2 = {}; ok(/^Ta Røysland \(Ravnsunds, 9 km NV\)/.test(S.vurder('hold', T({ målNavn: 'Røysland', målOm: 'Ravnsunds, 9 km NV' }), st2).tekst), 'hold: byen navngis');
  S.vurder('hold', T({ tid: 600, holder: () => true, målNavn: 'Røysland' }), st2); ok(/Du holder Røysland: 1,0 av 3 døgn/.test(S.vurder('hold', T({ tid: 600 + 1440, holder: () => true, målNavn: 'Røysland' }), st2).tekst), 'hold: 24 t = 1,0 av 3 døgn');
  S.vurder('hold', T({ tid: 2400, holder: () => false, mistet: () => false }), st2); ok(st2.holdtFra === 600, 'hold: ukjent eier (etter omlasting) nullstiller ikke');
  S.vurder('hold', T({ tid: 2500, holder: () => false, mistet: () => true }), st2); ok(st2.holdtFra === null && st2.mistetVed === 2500 && st2.mistetMeldt === false, 'hold: tapt by nullstiller og huskes for meldingen'); }
st = {}; S.vurder('hold', T({ tid: 100, holder: () => true }), st); let v = S.vurder('hold', T({ tid: 100 + 3 * 1440, holder: () => true }), st);
ok(v.status === 'vunnet' && st.ferdig === 'vunnet' && S.vurder('hold', T({ tid: 99999 }), st).status === 'vunnet', 'hold: tre døgn = vunnet, og det står');
st = {}; ok(S.vurder('hold', T({ tid: 8 * 1440 }), st).status === 'tapt', 'hold: fristen ute = tapt');
// runde 12: med motangrep må det slås tilbake
st = {}; S.vurder('hold', T({ tid: 100, holder: () => true, angrep: { slått: false } }), st); v = S.vurder('hold', T({ tid: 100 + 3.2 * 1440, holder: () => true, angrep: { slått: false, pågår: true } }), st);
ok(v.status === 'pågår' && /Motangrepet er i gang/.test(v.tekst), 'hold: tre døgn uten å slå motangrepet er ikke nok');
v = S.vurder('hold', T({ tid: 100 + 3.4 * 1440, holder: () => true, angrep: { slått: true } }), st); ok(v.status === 'vunnet' && /slo tilbake/.test(v.tekst), 'hold: motangrepet slått = vunnet');
st = {}; S.vurder('hold', T({ tid: 100, holder: () => true, angrep: { ingen: true } }), st); ok(S.vurder('hold', T({ tid: 100 + 3 * 1440, holder: () => true, angrep: { ingen: true } }), st).status === 'vunnet', 'hold: ingen motstander igjen = vunnet');
{ const o = S.oppsummering({ start: { penger: 40e6, tid: 0 }, falne: 2, sårede: 3, maksByer: 2, hendelser: [{ t: 100, tekst: 'Tok Svorkmo', vekt: 3 }, { t: 50, tekst: 'Liten ting', vekt: 1 }, { t: 3000, tekst: 'Slo tilbake motangrepet', vekt: 3 }] }, { tid: 4.5 * 1440, penger: 17e6, byer: 1, folk: 9 }, 2);
  ok(o.tall.length === 5 && o.tall[0][1] === '4,5' && /−23 mill/.test(o.tall[3][1]) && o.hendelser.length === 2 && /^Dag 1: Tok Svorkmo/.test(o.hendelser[0]) && /^Dag 3: Slo/.test(o.hendelser[1]), 'oppsummering: tall og de viktigste hendelsene i tidsrekkefølge'); }
// de andre
ok(S.vurder('tre', T({ egne: 3, tid: 100 }), {}).status === 'vunnet' && S.vurder('tre', T({ egne: 2, tid: 5 * 1440 }), {}).status === 'tapt', 'tre på fem døgn');
ok(S.vurder('overlev', T({ tid: 7 * 1440 }), {}).status === 'vunnet' && S.vurder('overlev', T({ tid: 100, folk: 4 }), {}).status === 'tapt' && S.vurder('overlev', T({ tid: 100, leirTapt: true }), {}).status === 'tapt', 'sju døgn');
ok(S.vurder('lyn', T({ andel: .61, tid: 3000 }), {}).status === 'vunnet' && S.vurder('lyn', T({ andel: .5, tid: 3000 }), {}).igjen === 10 * 1440 - 3000, 'lynkrig');
ok(S.fristTekst(1500) === '1 døgn 1 t igjen' && S.fristTekst(125) === '2 t 5 min igjen', 'fristTekst');
// tap av leiren
const leir = { x: 0, y: 0 };
ok(S.truet(leir, [{ x: 100, y: 0 }], []) && !S.truet(leir, [{ x: 100, y: 0 }], [{ x: 300, y: 0 }]) && !S.truet(leir, [{ x: 200, y: 0 }], []), 'truet: fiende i leiren og ingen egne nær');
const F0 = S.REGLER.tap.fred; st = {}; ok(!S.tapSteg(st, true, F0 + 10) && !S.tapSteg(st, true, F0 + 60) && S.tapSteg(st, true, F0 + 100), 'tapt etter 90 minutter');
st = {}; S.tapSteg(st, true, F0 + 10); S.tapSteg(st, false, F0 + 50); ok(st.fra === null && !S.tapSteg(st, true, F0 + 120), 'tellingen nulles når fienden er borte');
st = {}; ok(F0 === 2880 && !S.tapSteg(st, true, 10) && !S.tapSteg(st, true, 2000) && st.fra === null, 'de to første døgnene kan ikke leiren tapes');
let u = S.utpost(leir, [{ x: 100, y: 0 }], []); ok(u.x === -4000 && u.y === 0, 'utposten ligger 4 km bort fra fienden');
u = S.utpost(leir, [], [{ x: 500, y: 0, navn: 'For nær' }, { x: 3000, y: 0, navn: 'Vik' }, { x: 9000, y: 0, navn: 'Langt' }]); ok(u.navn === 'Vik', 'utposten: nærmeste egne tettsted (ikke det som ligger i leiren)');
const e = S.etterTap(80e6, 10); ok(e.penger === 40e6 && e.folk === 7 && S.etterTap(1, 2).folk === 2 && S.etterTap(1, 4).folk === 3, 'det som er igjen etter tapet');
// etterspill
const liste = []; ok(S.leggTil(liste, S.bilde(0, [{ id: 'a', eier: 'blå' }, { id: 'b', eier: null }], [{ x: 1.4, y: 2.6, side: 'rød' }])) && !S.leggTil(liste, S.bilde(100, [], [])) && S.leggTil(liste, S.bilde(180, [{ id: 'a', eier: 'rød' }], [])), 'et bilde hver tredje time');
ok(S.eierI(liste[0], 'a') === 'blå' && S.eierI(liste[0], 'b') === null && S.eierI(liste[1], 'a') === 'rød' && liste[0].l[0].join() === '1,3,r' && S.stillingVed(liste[0]).blå === 1, 'bildet husker eierne og lagene');
const lang = []; for (let i = 0; i < 600; i++) S.leggTil(lang, S.bilde(i * 180, [], []));
ok(lang.length <= S.REGLER.etterspill.maks && lang[0].t === 0 && lang[lang.length - 1].t === 599 * 180 && lang.every((b, i) => !i || b.t > lang[i - 1].t), 'over taket tynnes de eldste (' + lang.length + ' bilder)');
// ukas oppdrag
const uk = S.uke(new Date(2026, 10, 18)); ok(uk.år === 2026 && uk.uke === 47 && S.uke(new Date(2027, 0, 1)).uke === 53 && S.uke(new Date(2024, 11, 30)).uke === 1, 'ukenummer (ISO)');
const o = S.ukasOppdrag(uk), o2 = S.ukasOppdrag({ år: 2026, uke: 47 }); ok(JSON.stringify(o) === JSON.stringify(o2) && o.tekst && o.mål > 0 && o.dager > 0, 'samme uke gir samme oppdrag: ' + o.tekst);
const typer = new Set(); for (let i = 1; i <= 52; i++) typer.add(S.ukasOppdrag({ år: 2026, uke: i }).type); ok(typer.size >= 3, 'ukene varierer (' + [...typer].join(', ') + ')');
const ot = { år: 2026, uke: 1, type: 'tettsteder', mål: 2, dager: 3, tekst: 'Ta 2', enhet: 'tettsteder', lavest: false }, T0 = { tid: 0, penger: 100e6, tettsteder: 1, bygg: 0, folk: 10 };
let us = S.ukeStatus(ot, T0, { ...T0, tid: 1440, tettsteder: 2 }); ok(us.verdi === 1 && !us.ferdig && us.igjen === 2 * 1440, 'uke: underveis');
us = S.ukeStatus(ot, T0, { ...T0, tid: 2000, tettsteder: 3 }); ok(us.klart && us.ferdig, 'uke: klart');
ok(!S.ukeStatus(ot, T0, { ...T0, tid: 3 * 1440, tettsteder: 2 }).klart && S.ukeStatus(ot, T0, { ...T0, tid: 3 * 1440 }).ferdig, 'uke: fristen ute');
const os = { ...ot, type: 'spar', mål: 10, lavest: true, enhet: 'mill. kr brukt' };
ok(!S.ukeStatus(os, T0, { ...T0, tid: 100, penger: 99e6 }).ferdig && S.ukeStatus(os, T0, { ...T0, tid: 3 * 1440, penger: 95e6 }).klart && !S.ukeStatus(os, T0, { ...T0, tid: 3 * 1440, penger: 80e6 }).klart, 'uke: sparing avgjøres ved fristen');
const kode = S.ukeKode(ot, 'Dovre Frie!', us), les = S.lesUkeKode(kode); ok(les && les.uke === 1 && les.klart && les.verdi === 2 && les.navn === 'DovreFrie', 'koden kan leses: ' + kode);
ok(S.lesUkeKode(kode.replace('-K-', '-I-')) === null && S.lesUkeKode('tull') === null, 'en endret kode avvises');
ok(S.ukeBedre(ot, { klart: true, verdi: 2, dager: 2 }, { klart: true, verdi: 2, dager: 3 }) && S.ukeBedre(os, { klart: true, verdi: 3, dager: 3 }, { klart: true, verdi: 5, dager: 3 }), 'hvem er best');
ok(/Kode: RB-/.test(S.ukeTekst(ot, 'Dovre', us)), 'teksten som deles har koden');
// krigsmålene åpner etter de fire første kapitlene
const ferdige = new Set(), krig = { garnison: 1, tettsteder: 3, andel: .7, vunnet: true };
ok(M.vurder(krig, ferdige).every(id => !/^krig/.test(id)) && M.stilling(ferdige).alle === M.GRUNN.length && !M.stilling(ferdige).krigÅpen, 'krigsmålene telles ikke før leiren står (' + M.GRUNN.length + ' mål)');
for (const m of M.GRUNN) ferdige.add(m.id);
ok(M.stilling(ferdige).krigÅpen && M.stilling(ferdige).alle === M.ALLE.length && M.stilling(ferdige).neste.id === 'krig1', 'når grunnmålene er nådd: ' + M.ALLE.length + ' mål, neste er krigen');
ok(M.vurder(krig, ferdige).sort().join() === 'krig1,krig3,krig30,krigseier' && M.stilling(ferdige).kapittel === -1, 'krigsmålene nås');
// vennens stilling i delingskoden
const k1 = D.kode('Vik', '#aa3300', { x: 100, y: 200 }, [], { byer: ['12', 34], andel: 22.4, dag: 5 }), d1 = D.les(k1), d0 = D.les(D.kode('Vik', '#aa3300', { x: 100, y: 200 }, []));
ok(d1.stilling.byer.join() === '12,34' && d1.stilling.andel === 22 && d1.stilling.dag === 5 && d0.stilling === null && d0.x === 100, 'delingskoden har stillingen (og gamle koder virker)');
// runde 4: etterspillet med bygg, kjøretøy, kampsteder og tall
{ const ekstra = (bygg, kamp) => ({ bygg, kj: [{ x: 10.4, y: 20, side: 'blå', type: 'lastebil' }, { x: 5, y: 5, side: 'rød', type: 'stridsvogn' }], kamp, tall: { p: 4e7, f: 9, m: 20, l: 3, k: 1, b: bygg.length } });
  const B1 = [{ x: 1, y: 2, type: 'brakke' }, { x: 30, y: 2, type: 'aggregat' }], B2 = B1.concat([{ x: 60, y: 9, type: 'kjøkken' }]);
  const b1 = S.bilde(0, [], [], S.REGLER.etterspill, ekstra(B1, [{ x: 100, y: 100, n: 2 }, { x: 300, y: 50, n: 9 }]));
  ok(b1.b.length === 2 && b1.b[0][2] === 'brakke' && b1.k[0][0] === 10 && b1.k[1][2] === 'r' && b1.k[1][3] === 'stridsvogn' && b1.s[0][2] === 9 && b1.n.m === 20, 'bildet har bygg, kjøretøy (med side og type), kampsteder (flest skudd først) og tallene');
  const L = []; S.leggTil(L, b1); const b2 = S.bilde(200, [], [], S.REGLER.etterspill, ekstra(B1, [])); S.leggTil(L, b2); const b3 = S.bilde(400, [], [], S.REGLER.etterspill, ekstra(B2, [])); S.leggTil(L, b3);
  ok(L[0].b && !L[1].b && L[2].b && S.byggI(L, 1).length === 2 && S.byggI(L, 2).length === 3 && !L[1].s, 'like bygg lagres ikke på nytt, men leses fra bildet før; ingen kamp gir ingen kampsteder');
  const R = { ...S.REGLER.etterspill, maks: 6 }, L2 = []; for (let i = 0; i < 9; i++) S.leggTil(L2, S.bilde(i * 200, [], [], R, ekstra(i === 0 ? B1 : i === 5 ? B2 : B1, [])), R);
  ok(L2.length <= 7 && L2.every((q, i) => S.byggI(L2, i).length >= 2), 'når de eldste bildene tynnes ut, har alle bildene fortsatt byggene sine');
  const gml = S.bilde(0, [{ id: 'a', eier: 'blå' }], [{ x: 1, y: 1, side: 'blå' }]); ok(!gml.b && !gml.k && !gml.s && !gml.n && S.byggI([gml], 0).length === 0, 'bilder uten det nye (gamle lagrede) virker som før');
  const K = new Map(); S.kampsted(K, 10, 10); S.kampsted(K, 200, 240); S.kampsted(K, 260, 10); ok(K.size === 2 && [...K.values()].find(q => q.n === 2).x === 125, 'ildvekslinger i samme rute på 250 m telles sammen'); }
console.log(feil ? feil + ' FEIL' : 'alle scenariotestene ok'); process.exit(feil ? 1 : 0);
