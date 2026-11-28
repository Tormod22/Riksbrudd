// ut6-spioner: test av spill/spion.js (spioner blant søkerne, innsyn, oppdage, avhør, sparken, falske opplysninger, egne spioner),
// krokene i rekruttering.js, spionens virkning i rival.js og rivalenes kjøp med ekte penger i bors.js.
// Kjør: node pipeline/fliser/test_spion.js   (SELVTEST=1 legger inn en feil med vilje: innsynet forsvinner aldri)
const SP = require('../../site/dovre-fliser/spill/spion.js');
const R = SP.REGLER;
let feil = 0, n = 0; const ok = (v, t) => { n++; if (!v) { feil++; console.log('FEIL: ' + t); } };
const rFast = v => () => v;
if (process.env.SELVTEST) { const g = SP.spark; SP.spark = (S, pid) => { const s = SP.spionFor(S, pid); const r = g(S, pid); if (s) S.inne.push(s); return r; }; }

// ---------- søkerne ----------
ok(Math.abs(SP.søkerSjanse(1) - R.søker.grunn) < 1e-9, 'lik verdi gir grunnsjansen');
ok(SP.søkerSjanse(2) > SP.søkerSjanse(1.2) && SP.søkerSjanse(10) === Math.min(R.søker.maks, R.søker.grunn + R.søker.foran * R.søker.foranTak), 'mer foran = større sjanse, med tak');
ok(SP.søkerSjanse(.5) === R.søker.grunn, 'bak gir ikke mer');
{ const S = SP.ny(); const x = SP.velgSender(S, { blå: 30e6, rød: 10e6, grønn: 20e6 }, rFast(0));
  ok(x && x.side === 'rød', 'den som ligger lengst bak sender spionen: ' + JSON.stringify(x));
  ok(SP.velgSender(S, { blå: 30e6, rød: 10e6, grønn: 20e6 }, rFast(.99)) === null, 'ingen spion når terningen sier nei');
  SP.inn(S, 5, 'rød', 0); const y = SP.velgSender(S, { blå: 30e6, rød: 10e6, grønn: 20e6 }, rFast(0)); ok(y && y.side === 'grønn', 'høyst én spion per rival');
  SP.inn(S, 6, 'grønn', 0); ok(SP.velgSender(S, { blå: 30e6, rød: 1, grønn: 1 }, rFast(0)) === null, 'begge har spion: ingen flere'); }
ok(SP.tvil({ spion: { side: 'rød' } }, true, rFast(.5)) === true && SP.tvil({ spion: { side: 'rød' } }, false, rFast(0)) === false, 'merket krever god vakt');
ok(SP.tvil({}, true, rFast(.5)) === false && SP.tvil({}, true, rFast(.01)) === true, 'ærlige søkere får merket sjelden');

// ---------- innsyn ----------
{ const S = SP.ny(); ok(!SP.innsyn(S, 'rød') && SP.virkning(S, 'rød').sabotasje === 1, 'uten spion: ingen innsyn');
  SP.inn(S, 7, 'rød', 100, { tvil: true }); ok(SP.innsyn(S, 'rød') && !SP.innsyn(S, 'grønn'), 'en spion gir rivalen innsyn');
  const v = SP.virkning(S, 'rød'); ok(v.leir && v.kontrakt > 1 && v.sabotasje > 1 && v.stopp < 1 && v.skade > 1, 'virkningen: ' + JSON.stringify(v));
  ok(SP.mistanke(S, 7) === R.søker.tvilMistanke, 'ansatt tross merket: mistanke fra start');
  const sp = SP.spark(S, 7); ok(sp.spion && sp.side === 'rød' && !SP.innsyn(S, 'rød') && SP.mistanke(S, 7) === 0, 'sparken fjerner innsynet');
  ok(SP.spark(S, 99).spion === false && SP.spark(S, 99).moral === R.spark.uskyldig, 'en uskyldig som får sparken: moralen faller'); }

// ---------- oppdage ----------
{ const S = SP.ny(); SP.inn(S, 1, 'rød', 0); const ctx = { pider: [1, 2, 3], kamera: { antall: 1, smart: false, folk: 1 } };
  const H = SP.natt(S, ctx, rFast(.1)); ok(H.some(h => h.pid === 1 && h.type === 'sett' && !h.uskyldig), 'kameravakta ser spionen ved lageret om natta');
  ok(SP.mistanke(S, 1) === R.oppdag.sett, 'det gir mistanke');
  const S2 = SP.ny(); SP.inn(S2, 1, 'rød', 0); const H2 = SP.natt(S2, { pider: [1, 2], kamera: { antall: 0 } }, rFast(.1));
  ok(!H2.length, 'uten kameraer og vakt ser ingen noe');
  const S3 = SP.ny(); SP.inn(S3, 1, 'rød', 0); for (let i = 0; i < 2; i++) SP.natt(S3, ctx, rFast(.1)); ok(SP.mistenkt(S3, 1), 'to netter = mistenkt (over terskelen)');
  const S4 = SP.ny(); SP.inn(S4, 1, 'rød', 0); SP.natt(S4, { pider: [1, 2], kamera: { antall: 0 }, leder: { pid: 2, ledelse: 1.45 } }, rFast(.1));
  ok(SP.mistanke(S4, 1) === R.oppdag.lederSett, 'leirsjefen fatter mistanke');
  const S5 = SP.ny(); SP.natt(S5, { pider: [1, 2], kamera: { antall: 2, smart: true } }, rFast(.01)); ok(Object.keys(S5.mistanke).length === 1, 'falske syn finnes (sjeldne)');
  const S6 = SP.ny(); SP.leggMistanke(S6, 2, 10, 'x'); SP.natt(S6, { pider: [2] }, rFast(.9)); ok(SP.mistanke(S6, 2) === 10 - R.oppdag.glemmer, 'mistanke uten ny næring svinner');
  SP.natt(S6, { pider: [] }, rFast(.9)); ok(!S6.mistanke['2'], 'mistanken om en som er borte, glemmes'); }

// ---------- avhør ----------
{ const S = SP.ny(); SP.inn(S, 1, 'grønn', 0); SP.leggMistanke(S, 1, 60, 'kamera');
  ok(SP.startAvhør(S, 1, 100).til === 100 + R.avhør.timer * 60 && SP.startAvhør(S, 1, 100).feil, 'avhøret tar tid og kan ikke startes to ganger');
  const r = SP.avhørFerdig(S, 1, rFast(.1)); ok(r.spion && r.avslørt && SP.spionFor(S, 1).avslørt && S.avslørt === 1, 'avhøret avslører spionen');
  const S2 = SP.ny(); SP.inn(S2, 1, 'grønn', 0); SP.startAvhør(S2, 1, 0); const r2 = SP.avhørFerdig(S2, 1, rFast(.99)); ok(r2.spion && !r2.avslørt, 'avhøret kan mislykkes');
  ok(SP.avhørFerdig(SP.ny(), 3, rFast(.99), .7) && true, 'avhør uten mistanke tåles');
  const S3 = SP.ny(); SP.leggMistanke(S3, 4, 60, 'kamera'); SP.startAvhør(S3, 4, 0); const r3 = SP.avhørFerdig(S3, 4, rFast(.1));
  ok(r3.uskyldig && r3.moral < 0 && r3.lojal < 0 && !S3.mistanke['4'], 'en uskyldig: moral og lojalitet ned, mistanken borte');
  // en dyktig avhører avslører oftere
  const p = l => { let a = 0; for (let i = 0; i < 200; i++) { const T = SP.ny(); SP.inn(T, 1, 'rød', 0); if (SP.avhørFerdig(T, 1, rFast(i / 200), l).avslørt) a++; } return a; };
  ok(p(1.45) > p(.9), 'en dyktig leirsjef avslører oftere'); }

// ---------- falske opplysninger ----------
{ const S = SP.ny(); SP.inn(S, 1, 'rød', 0); ok(SP.kanFalsk(S, 1, 0), 'bare en avslørt spion kan brukes');
  SP.spionFor(S, 1).avslørt = true; const L = { x: 1000, y: 2000 };
  const f = SP.falsk(S, 1, 'sted', 5000, rFast(.9), { leir: L }); ok(f.punkt && Math.hypot(f.punkt.x - L.x, f.punkt.y - L.y) >= R.falsk.avstand[0] - 1 && !f.brent, 'falskt sted: ' + JSON.stringify(f));
  ok(SP.falskSted(S, 'rød', 5100) && !SP.falskSted(S, 'rød', 5000 + R.falsk.timer * 60 + 1) && !SP.falskSted(S, 'grønn', 5100), 'det falske stedet varer en stund');
  ok(!SP.innsyn(S, 'rød'), 'en vendt spion gir ikke innsyn');
  ok(SP.kanFalsk(S, 1, 5100), 'pause mellom de falske opplysningene');
  const g = SP.falsk(S, 1, 'kontrakt', 5000 + R.falsk.pause * 1440, rFast(.1)); ok(g.tap === R.falsk.tap && g.brent && !SP.spionFor(S, 1), 'falsk kontrakt, og spionen kan bli brent'); }

// ---------- porten ----------
{ const S = SP.ny(); SP.inn(S, 1, 'rød', 0); ok(SP.port(S, 'rød', 1, rFast(.1)) === true && SP.port(S, 'rød', 1, rFast(.1)) === false, 'porten åpnes én gang per angrep');
  ok(SP.port(S, 'grønn', 1, rFast(.1)) === false, 'ingen spion fra den siden: porten holder'); }

// ---------- egne spioner ----------
{ ok(SP.egnethet({ egen: ['modig', 'nattmenneske'] }) > SP.egnethet({}) && SP.egnethet({ egen: ['pratsom', 'redd'] }) < SP.egnethet({}), 'egnetheten etter egenskapene');
  const S = SP.ny(), p = { id: 9, navn: 'Kari Haugen', egen: ['modig'] };
  ok(SP.send(S, p, 'rød', 0).ok && S.ute.rød && S.ute.rød.p.navn === 'Kari Haugen', 'en egen spion er sendt');
  ok(SP.kanSende(S, p, 'rød') && SP.kanSende(S, { id: 1, karakter: true }, 'grønn'), 'høyst én per rival, og ikke deg selv');
  const s1 = SP.sabotér(S, 'rød', true, 2000, rFast(.9)); ok(s1.mål === 'sag' && s1.skade === R.egen.sag && !s1.avslørt, 'sabotasje av sagbruket');
  ok(SP.sabotér(S, 'rød', true, 2100, rFast(.9)).feil, 'sabotasje høyst en gang i døgnet');
  ok(SP.sabotér(S, 'rød', false, 2000 + 1440, rFast(.9)).mål === 'lager', 'uten sagbruk: et lager');
  const s3 = SP.sabotér(S, 'rød', true, 2000 + 2880, rFast(.01)); ok(s3.avslørt && !S.ute.rød && S.tapt === 1, 'sabotasjen kan avsløre spionen');
  SP.send(S, p, 'grønn', 0); ok(SP.egenDøgn(S, rFast(.99)).length === 0 && S.ute.grønn, 'de fleste døgn går bra');
  const H = SP.egenDøgn(S, rFast(.001)); ok(H.length === 1 && H[0].type === 'avslørt' && !S.ute.grønn, 'en egen spion kan bli avslørt');
  SP.send(S, p, 'rød', 0); ok(SP.hjem(S, 'rød').p.id === 9 && !S.ute.rød, 'spionen hentes hjem'); }

// ---------- lagring ----------
{ const S = SP.ny(); SP.inn(S, 1, 'rød', 3); SP.leggMistanke(S, 2, 40, 'x'); SP.send(S, { id: 3, navn: 'A' }, 'grønn', 0); S.falsk.rød = { x: 1, y: 2, til: 9 };
  const T = SP.fraJSON(JSON.parse(JSON.stringify(S))); ok(T.inne.length === 1 && T.mistanke['2'].m === 40 && T.ute.grønn.p.navn === 'A' && T.falsk.rød.til === 9, 'tilstanden lagres og leses');
  ok(SP.fraJSON(null) === null && SP.fraJSON({ inne: [{ pid: 1, side: 'blå' }] }).inne.length === 0, 'ugyldig lagring avvises'); }

// ---------- kommandoene ----------
{ const reg = {}, K = { registrer: (navn, o) => { reg[navn] = o; } }, S = SP.ny(), F = { personer: [{ id: 1, navn: 'Ola' }] }; let kalt = '';
  SP.registrerKommandoer(K, { tilstand: () => S, folk: () => F, nå: () => 0, rett: { avhør: () => { kalt = 'avhør'; return {}; }, spark() {}, falsk() {}, send() {}, hjem() {}, sabotér() {} } });
  ok(['spionAvhør', 'spionSpark', 'spionFalsk', 'spionSend', 'spionHjem', 'spionSabotér'].every(k => reg[k] && reg[k].leir), 'seks kommandoer');
  ok(reg.spionAvhør.sjekk({ person: 2 }, {}) && !reg.spionAvhør.sjekk({ person: 1 }, {}), 'avhør av en som ikke finnes avvises');
  reg.spionAvhør.utfør({ person: 1 }, {}); ok(kalt === 'avhør', 'utfør kaller den rette funksjonen');
  ok(reg.spionFalsk.sjekk({ person: 1, hva: 'sted' }, {}), 'falske opplysninger uten avslørt spion avvises');
  ok(reg.spionSend.sjekk({ person: 1, rival: 'blå' }, {}) && !reg.spionSend.sjekk({ person: 1, rival: 'rød' }, {}), 'send: ukjent rival avvises');
  ok(JSON.parse(JSON.stringify({ type: 'spionFalsk', person: 1, hva: 'sted' })).hva === 'sted', 'kommandoene kan sendes som JSON'); }

// ---------- rekruttering.js: krokene ----------
{ const RK = require('../../site/dovre-fliser/spill/rekruttering.js'), FR = require('../../site/dovre-fliser/spill/folk.js'), LB = require('../../site/dovre-fliser/spill/leir.js');
  const F = FR.ny(7), L = LB.ny ? LB.ny() : { bygg: [], lager: {} }, Sr = RK.ny(5);
  const uten = RK.morgen(RK.ny(5), FR.ny(7), 0, { rykte: 90 }, RK.rng(RK.ny(5)));
  RK.nySøker = s => { s.spion = { side: 'rød' }; };
  const u = RK.morgen(Sr, F, 0, { rykte: 90 }, RK.rng(Sr)); ok(u.nye.length > 0 && u.nye.every(s => s.spion), 'kroken nySøker merker søkerne');
  ok(JSON.stringify(uten.nye.map(s => s.navn)) === JSON.stringify(u.nye.map(s => s.navn)), 'kroken endrer ikke tilfeldighetene i rekrutteringen');
  let fikk = null; RK.ansattKrok = (s, p) => { fikk = { s, p }; };
  const r = RK.ansett(Sr, F, L, u.nye.find(s => !s.bud) ? u.nye.find(s => !s.bud).id : u.nye[0].id, () => true, { byOver: !u.nye.find(s => !s.bud), valg: { ekstraSenger: 99 } });
  ok(!r.feil, 'ansett: ' + r.feil); ok(fikk && fikk.s.spion && fikk.p.id === r.person.id, 'kroken ansattKrok får søkeren og personen');
  RK.nySøker = null; RK.ansattKrok = null; }

// ---------- rival.js: spionens virkning ----------
{ const RV = require('../../site/dovre-fliser/spill/rival.js'), t = 10 * 1440;
  const v = RV.sabotasjeSjanse({ nå: t, sist: -1e9 }), m = RV.sabotasjeSjanse({ nå: t, sist: -1e9, spion: { sabotasje: R.innsyn.sabotasje } });
  ok(Math.abs(m - v * R.innsyn.sabotasje) < 1e-12, 'en spion gjør sabotasjen oftere');
  const mål = RV.sabotasjeMål([{ id: 1, type: 'a', hp: .5 }, { id: 2, type: 'b', hp: 1 }], { tre: 20 }, .9, { spion: { skade: R.innsyn.skade } });
  ok(mål.slag === 'maskin' && mål.id === 2 && mål.skade > RV.REGLER.sabotasje.maskinSkade, 'med spion: den heleste maskinen, hardere');
  ok(RV.sabotasjeMål([{ id: 1, type: 'a', hp: 1 }], { tre: 20 }, .9).slag === 'lager', 'uten spion som før'); }

// ---------- bors.js: rivalene kjøper med ekte penger ----------
{ const Bo = require('../../site/dovre-fliser/spill/bors.js'), B = Bo.ny({ x: 0, y: 0 });
  const firmaer = [{ navn: 'Storlia Tømmer' }, { navn: 'Dalsnes Kraftlag' }], kurs = { meg: 4e5, firma: { 'Storlia Tømmer': { kurs: 2e5 }, 'Dalsnes Kraftlag': { kurs: 2.2e5 } } };
  const r = Bo.rivalKjøp(B, 'rød', 2e6, kurs, { firmaer, r: rFast(.1) });
  ok(r.brukt > 0 && r.brukt <= 2e6 && r.hendelser[0].type === 'rivalKjøpFirma' && B.firmaer[r.hendelser[0].navn].rød === r.hendelser[0].n, 'ikke notert: rivalen kjøper i et firma for pengene sine: ' + JSON.stringify(r));
  ok(Math.abs(r.brukt - r.hendelser[0].n * kurs.firma[r.hendelser[0].navn].kurs) < 1, 'betalt = andeler × kurs');
  ok(Bo.rivalKjøp(B, 'rød', 1000, kurs, { firmaer, r: rFast(.1) }).brukt === 0, 'for lite penger: ingenting');
  B.meg.notert = true; B.meg.egne = 70; B.meg.fritt = 30; B.meg.stemning = .7;
  const r2 = Bo.rivalKjøp(B, 'grønn', 2e6, kurs, { firmaer, r: rFast(.1) });
  ok(r2.hendelser[0].type === 'rivalKjøpMeg' && B.meg.rival.grønn === r2.hendelser[0].n && r2.hendelser[0].n <= Bo.REGLER.rival.megKjøp[1] && Bo.sjekkSum(B), 'notert: rivalen kjøper i dere med pengene: ' + JSON.stringify(r2));
  // døgnet: med ekte rivaler kjøper børsen ikke tilfeldig selv
  const C = Bo.ny({ x: 0, y: 0 }); C.meg.notert = true; C.meg.egne = 60; C.meg.fritt = 40; let tilf = 0;
  for (let d = 1; d < 40; d++) { const H = Bo.døgn(C, { nå: d * 1440, rand: rFast(.01), kurs: { meg: 4e5 }, firmaer, ekteRivaler: true }); tilf += H.filter(h => /^rivalKjøp/.test(h.type)).length; }
  ok(tilf === 0 && C.meg.rival.rød === 0, 'ekteRivaler: ingen tilfeldige kjøp');
  const D = Bo.ny({ x: 0, y: 0 }); D.meg.notert = true; D.meg.egne = 60; D.meg.fritt = 40; let t2 = 0;
  for (let d = 1; d < 5; d++) t2 += Bo.døgn(D, { nå: d * 1440, rand: rFast(.01), kurs: { meg: 4e5 }, firmaer }).filter(h => /^rivalKjøp/.test(h.type)).length;
  ok(t2 > 0, 'uten RivalSpill: som før (tilfeldige kjøp)'); }

console.log(feil ? `test_spion: ${feil} av ${n} sjekker feilet` : `test_spion: ${n} sjekker ok`);
process.exit(feil ? 1 : 0);
