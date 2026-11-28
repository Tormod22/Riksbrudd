// Test for spill/baering.js (maskinene trenger folk på riktig plass, fase F3): node pipeline/fliser/test_baering.js
const S = '../../site/dovre-fliser/spill/';
const Leir = require(S + 'leir.js'), Vei = require(S + 'vei.js'), FG = require(S + 'folkgang.js'), PR = require(S + 'produksjon.js');
const VL = require(S + 'varelager.js'), BR = require(S + 'baering.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const nf = v => (Math.round(v * 100) / 100).toString().replace('.', ',');

// ---------- prøveleiren: et sagbruk, et lagertelt «avst» m unna, n folk på maskin ----------
function leir(o = {}) {
  const L = Leir.ny(), mx = 1000, my = 2000; let id = 1;
  const legg = (type, x, y, ret = 0) => { const b = { id: id++, type, x: mx + x, y: my + y, ret, nivå: 1, hp: 1, igjen: 0, totalt: 60, nr: id, arbeid: null }; L.bygg.push(b); return b; };
  const sag = legg('sagbruk', 0, 0);
  const tlt = o.utenTelt ? null : legg('lagertelt', 24, (o.avst || 30) * (o.side || 1));
  L.neste = id; L.nesteJobb = id;
  for (const k of Object.keys(L.lager)) L.lager[k] = 0; L.lager.tømmer = o.tømmer == null ? 40 : o.tømmer;
  const F = { personer: [], moral: 70, mat: 100, sist: {}, tempoF: 1 };
  for (let i = 0; i < (o.n || 4); i++) { const ferd = { maskin: 1 }; F.personer.push({ id: i + 1, navn: 'Person ' + (i + 1), oppgave: 'maskin', helse: 1, ferd, lojal: .7, seng: true }); }
  const V = VL.ny(); VL.avstem(Leir, L, V);
  return { L, F, V, sag, tlt, midte: { x: mx + 20, y: my }, K: Vei.lag({ leir: L, start: [mx + 20, my - 20] }) };
}
// kjør sek sekunder i steg på dt: gangen, bæringen og maskinene (Produksjon i spillminutter); gir P og B
function kjør(T, sek, o = {}) {
  const dt = o.dt || 5, G = T.G || (T.G = FG.ny()), B = T.B || (T.B = BR.ny()), P = T.P || (T.P = PR.ny()), A = BR.lager(Leir, T.L, T.V, VL, T.midte);
  const hva = o.hva || (() => 'arbeid');
  for (let t = 0; t < sek; t += dt) {
    FG.steg(G, { F: T.F, L: T.L, leir: T.midte, kart: T.K, hva, mål: (p, h) => BR.mål(B, T.L, p, h) }, dt);
    BR.steg(B, { F: T.F, L: T.L, G, A, hva, kraftPerson: o.kp || (() => 1), status: P.status }, dt);
    if (o.hver) o.hver(t);
    PR.steg(P, T.L, dt / 60, { mating: B.m, kraftPer: B.kraftPer, mangler: new Set() });
  }
  return { P, B, G };
}

// ---------- 1. plassene ligger utenfor bygget og kan nås ----------
{ const T = leir(), Pl = BR.plasser(T.sag), h = Leir.hjørner(T.sag);
  const inni = (x, y) => { let inn = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) if ((h[i][1] > y) !== (h[j][1] > y) && x < (h[j][0] - h[i][0]) * (y - h[i][1]) / (h[j][1] - h[i][1]) + h[i][0]) inn = !inn; return inn; };
  const alle = [Pl.inn, Pl.ut, ...Pl.bruks];
  ok(Pl.bruks.length === 3 && alle.every(q => !inni(q.x, q.y)), 'sagbruket har innmating, utmating og 3 bruksplasser utenfor bygget');
  ok(alle.every(q => Vei.kanNå({ x: q.x, y: q.y }, { kart: T.K }).ok), 'alle plassene kan nås fra leiren');
  ok(Math.hypot(Pl.inn.x - Pl.ut.x, Pl.inn.y - Pl.ut.y) > 8, 'innmating og utmating i hver sin ende');
}
// ---------- 2. saga står med «venter på tømmer» til en bærer har båret tømmer inn; operatørene må stå på plass ----------
{ const T = leir({ n: 4 }); let førsteInn = null, gikkFør = false, opIkkeFram = null;
  kjør(T, 900, { hver: t => { const Bf = T.B.m[T.sag.id]; if (førsteInn === null && Bf && (Bf.inn.tømmer || 0) > 0) førsteInn = t;
    const s = T.P.status[T.sag.id]; if (s && s.går && førsteInn === null) gikkFør = true;
    if (opIkkeFram === null && t < 6) opIkkeFram = { kraft: T.B.kraftPer[T.sag.id] || 0, tekst: s ? s.tekst : '' }; } });
  ok(opIkkeFram && opIkkeFram.kraft === 0, 'i starten står ingen på bruksplassen: arbeidskraften er 0 (' + JSON.stringify(opIkkeFram) + ')');
  ok(!gikkFør && førsteInn !== null, `saga gikk ikke før tømmer var båret inn (første last etter ${førsteInn} s)`);
  const s = T.P.status[T.sag.id];
  ok(T.P.laget.tre > .15, `etter 15 min har saga laget ${nf(T.P.laget.tre)} m³ planker (${s.tekst})`);
  ok((T.B.påPlass[T.sag.id] || 0) >= 1, 'minst én operatør står på bruksplassen: ' + T.B.påPlass[T.sag.id]);
  ok(T.B.stat.turer >= 2 && T.B.stat.sek > 0, `bærerne har gått ${T.B.stat.turer} turer (${nf(T.B.stat.m3)} m³)`);
  // uten operatører på plass går den ikke: alle på fri
  const T2 = leir({ n: 4 }); T2.F.personer.forEach(p => { p.oppgave = 'fri'; });
  T2.B = BR.ny(); T2.B.m[T2.sag.id] = { inn: { tømmer: 4 }, ut: {} };
  kjør(T2, 300);
  ok(!(T2.P.laget.tre > 0) && /venter på folk/.test(T2.P.status[T2.sag.id].tekst), 'tømmer i innmatingen, men ingen operatører: «' + T2.P.status[T2.sag.id].tekst + '»');
  // varene i matingen er ikke i lageret: summen lager + mating + båret er lik det som var der minus det saga brukte
  const sum = T.L.lager.tømmer + (T.B.m[T.sag.id].inn.tømmer || 0) + Object.values(T.B.bær).filter(o => o.vare === 'tømmer').reduce((a, o) => a + o.m, 0);
  ok(Math.abs(sum + (T.P.brukt.tømmer || 0) - 40) < 1e-3, `tømmeret stemmer: lager + mating + båret + brukt = ${nf(sum + (T.P.brukt.tømmer || 0))} av 40`);
  ok(VL.avvik(T.L, T.V).length === 0, 'enhetene i varelageret stemmer med tallene: ' + JSON.stringify(VL.avvik(T.L, T.V)));
}
// ---------- 3. utmatingen full stopper saga ----------
{ const T = leir({ n: 3 }); T.B = BR.ny(); T.B.m[T.sag.id] = { inn: { tømmer: 4 }, ut: { tre: 2.4, flis: 1.6 } };
  // lageret er fullt for planker og flis: ingen kan bære ut
  T.L.lager.tre = Leir.lagerplass(T.L); T.L.lager.flis = Leir.lagerplass(T.L); VL.avstem(Leir, T.L, T.V);
  kjør(T, 300);
  const s = T.P.status[T.sag.id];
  ok(!s.går && s.grunn === 'fullt' && /utmatingen full/.test(s.tekst), 'utmatingen full og lageret fullt: «' + s.tekst + '»');
  ok((T.B.jobber || []).some(j => j.retning === 'ut' && j.blokk === 'lageret er fullt'), 'bærejobben sier hvorfor: ' + BR.linjer(T.B).join(' | '));
  ok(T.P.sto.fullt > 0, 'tida telles som «fullt»: ' + nf(T.P.sto.fullt) + ' t');
  // lageret får plass: bærerne tømmer utmatingen og saga går igjen
  T.L.lager.tre = 0; T.L.lager.flis = 0; VL.avstem(Leir, T.L, T.V); kjør(T, 600);
  ok(T.P.status[T.sag.id].går || T.P.laget.tre > 0, 'med plass i lageret går saga igjen: «' + T.P.status[T.sag.id].tekst + '», laget ' + nf(T.P.laget.tre || 0));
}
// ---------- 4. bæreren finner en ny haug når den første forsvinner ----------
{ const T = leir({ n: 5, tømmer: 8 }); let stjålet = null;
  kjør(T, 400, { hver: () => { if (stjålet) return; const o = Object.values(T.B.bær).find(q => q.retning === 'inn' && q.fase === 'hent' && q.enhet != null);
    if (o) { const u = VL.finn(T.V, o.enhet); if (u) { stjålet = u.id; VL.stjel(Leir, T.L, T.V, { tømmer: u.m }, true);
      // stjel tar fra det som ligger ute; ligger enheten inne, tas den med brann i stedet
      if (VL.finn(T.V, u.id)) VL.brann(Leir, T.L, T.V, () => true, q => (q.id === u.id ? { x: 0, y: 0 } : null)); } } } });
  ok(stjålet !== null && !VL.finn(T.V, stjålet), 'en reservert tømmerhaug forsvant (stjålet/brent)');
  ok(T.B.nyFunnet >= 1, `bæreren fant en ny haug (${T.B.nyFunnet} gang)`);
  ok(T.B.stat.turer >= 1, 'bæringen fortsatte: ' + T.B.stat.turer + ' turer');
}
// ---------- 5. tempoet: kort vei gir mer enn lang vei; full drift med kort vei er nær det gamle ----------
{ const tid = 3 * 3600;
  const prøv = o => { const T = leir({ tømmer: 80, ...o }); kjør(T, tid, { dt: 5, kp: o.kp ? () => o.kp : null }); return { tre: T.P.laget.tre || 0, sek: T.B.stat.sek, gå: T.B.stat.gåSek, turer: T.B.stat.turer, hjelp: T.B.stat.hjelp }; };
  const T0 = leir({ tømmer: 80 }), P0 = PR.ny(); for (let t = 0; t < tid; t += 60) PR.steg(P0, T0.L, 1, { kraft: 5, mangler: new Set() });
  const gammel = P0.laget.tre;
  // a) fem folk: tre operatører og to bærere
  const kort = prøv({ n: 5, avst: 22 });
  console.log(`     3 timer, 5 folk: gammel ${nf(gammel)} m³, kort vei ${nf(kort.tre)} m³ (${kort.turer} turer, ${nf(kort.gå / 3600)} t gange)`);
  ok(kort.tre >= gammel * .85, `kort vei og nok bærere gir omtrent det samme som før (${Math.round(100 * kort.tre / gammel)} % av ${nf(gammel)} m³ – tapet er oppstarten)`);
  // b) én operatør som arbeider for tre (døgnplanens tetthet, arbeidskraft 3) og ingen bærer: hen bærer selv når saga står,
  //    og da betyr veien mye
  const k3 = prøv({ n: 1, kp: 3, avst: 22 }), l3 = prøv({ n: 1, kp: 3, avst: 160 });
  console.log(`     3 timer, 1 operatør uten bærer: kort vei ${nf(k3.tre)} m³ (${k3.hjelp} turer båret av operatørene), lang vei ${nf(l3.tre)} m³ (${l3.hjelp})`);
  ok(k3.hjelp > 0 && k3.tre > l3.tre * 1.15, `uten bærere: kort vei gir mer enn lang vei (${nf(k3.tre)} mot ${nf(l3.tre)} m³)`);
  // c) én bærer langt unna rekker ikke: fire folk, 30 m mot 420 m
  const k4 = prøv({ n: 4, avst: 30 }), l4 = prøv({ n: 4, avst: 420 });
  console.log(`     3 timer, 4 folk (1 bærer): 30 m ${nf(k4.tre)} m³, 420 m ${nf(l4.tre)} m³ (${nf(l4.gå / 3600)} t gange)`);
  ok(k4.tre > l4.tre * 1.04, `én bærer: kort vei gir mer enn lang vei (${nf(k4.tre)} mot ${nf(l4.tre)} m³)`);
}
// ---------- 6. opplæring: operatøren blir sakte bedre ----------
{ const T = leir({ n: 4, tømmer: 80 }); const før = T.F.personer.map(p => p.ferd.maskin);
  kjør(T, 6 * 3600, { dt: 10 });
  const etter = T.F.personer.map(p => p.ferd.maskin), opp = etter.map((v, i) => v - før[i]);
  ok(Math.max(...opp) > 0 && Math.max(...opp) < .05, 'operatøren ble litt bedre på 6 timer: +' + nf(Math.max(...opp)));
}
// ---------- 7. døgnplanen av: tøm() legger alt tilbake i lageret ----------
{ const T = leir({ n: 4 }); kjør(T, 600); const A = BR.lager(Leir, T.L, T.V, VL, T.midte);
  const iMating = (T.B.m[T.sag.id].inn.tømmer || 0) + Object.values(T.B.bær).reduce((a, o) => a + (o.m || 0), 0), før = T.L.lager.tømmer + T.L.lager.tre + T.L.lager.flis;
  const ut = BR.tøm(T.B, A), lagt = Object.values(ut).reduce((a, m) => a + m, 0);
  ok(Object.keys(T.B.bær).length === 0 && Object.values(T.B.m).every(Bf => !Object.values(Bf.inn).some(m => m > 0) && !Object.values(Bf.ut).some(m => m > 0)), 'tøm(): ingen oppdrag og tom mating');
  ok(Math.abs(T.L.lager.tømmer + T.L.lager.tre + T.L.lager.flis - før - lagt) < 1e-3 && lagt >= iMating - 1e-3, `alt ble lagt tilbake i lageret (${nf(lagt)} m³)`);
  ok(T.V.e.every(u => !u.r), 'ingen reservasjoner igjen');
  ok(VL.avvik(T.L, T.V).length === 0, 'enhetene stemmer etter tøm()');
}
// ---------- 8. uten varelager (bare tall) og lagring ----------
{ const T = leir({ n: 4 }); T.V = null; const G = FG.ny(), B = BR.ny(), P = PR.ny(), A = BR.lager(Leir, T.L, null, null, T.midte);
  for (let t = 0; t < 900; t += 5) { FG.steg(G, { F: T.F, L: T.L, leir: T.midte, kart: T.K, hva: () => 'arbeid', mål: (p, h) => BR.mål(B, T.L, p, h) }, 5);
    BR.steg(B, { F: T.F, L: T.L, G, A, status: P.status }, 5); PR.steg(P, T.L, 5 / 60, { mating: B.m, kraftPer: B.kraftPer, mangler: new Set() }); }
  ok(P.laget.tre > 0, 'uten varelageret bærer de fra lagerteltet likevel: ' + nf(P.laget.tre) + ' m³ planker');
  const J = JSON.parse(JSON.stringify(BR.tilJSON(B))), B2 = BR.fraJSON(J);
  ok(JSON.stringify(B2.m) === JSON.stringify(B.m) && Object.keys(B2.bær).length === Object.keys(B.bær).length && B2.stat.turer === B.stat.turer, 'lagret og lest: likt');
  ok(Object.keys(BR.fraJSON({ versjon: 9 }).m).length === 0 && BR.fraJSON(null).stat.turer === 0, 'ukjent lagring gir tom tilstand');
}
// ---------- 9. produksjon uten mating er som før ----------
{ const T = leir({ n: 4 }), P1 = PR.ny(), L1 = JSON.parse(JSON.stringify(T.L));
  for (let i = 0; i < 60; i++) PR.steg(P1, L1, 1, { kraft: 4, mangler: new Set() });
  ok(Math.abs(P1.laget.tre - 1.1) < 1e-6 && Math.abs(L1.lager.tømmer - 38) < 1e-6, 'uten mating: 2 m³ tømmer -> 1,1 m³ planker på en time, rett i lageret');
  ok(/tom for tømmer/.test(PR.grunnTekst('tom', 'sagbruk')) && /venter på tømmer/.test(PR.grunnTekst('tom', 'sagbruk', true)) && PR.grunnTekst('ødelagt', 'sagbruk', true) === 'i stykker', 'grunntekstene for begge måtene');
}

// ---------- 10. folk på «frakt» bærer for maskinene når de ikke har noe å bære fra hogstfeltene ----------
{ const T = leir({ n: 4 }); T.F.personer[3].oppgave = 'frakt'; const G = FG.ny(), B = BR.ny(), P = PR.ny(), A = BR.lager(Leir, T.L, T.V, VL, T.midte);
  let turerFrakt = 0;
  for (let t = 0; t < 900; t += 5) { FG.steg(G, { F: T.F, L: T.L, leir: T.midte, kart: T.K, hva: () => 'arbeid', mål: (p, h) => BR.mål(B, T.L, p, h) }, 5);
    BR.steg(B, { F: T.F, L: T.L, G, A, status: P.status, fraktLedig: true }, 5); if (B.bær[4]) turerFrakt++; PR.steg(P, T.L, 5 / 60, { mating: B.m, kraftPer: B.kraftPer, mangler: new Set() }); }
  ok(turerFrakt > 0, 'frakt-personen bar for saga (' + turerFrakt + ' steg med last eller på vei)');
  const B2 = BR.ny(), G2 = FG.ny(); for (let t = 0; t < 60; t += 5) { FG.steg(G2, { F: T.F, L: T.L, leir: T.midte, kart: T.K, hva: () => 'arbeid', mål: (p, h) => BR.mål(B2, T.L, p, h) }, 5); BR.steg(B2, { F: T.F, L: T.L, G: G2, A, fraktLedig: false }, 5); }
  ok(!B2.bær[4] && !(B2.rolle[4]), 'med noe å bære fra hogstfeltet bærer frakt-personen ikke for maskinene');
}
// selvtest: en feil med vilje (operatørene teller selv om de ikke står på plass) skal gi mer enn 0 i starten
{ const T = leir({ n: 4 }), G = FG.ny(), B = BR.ny(), A = BR.lager(Leir, T.L, T.V, VL, T.midte);
  FG.steg(G, { F: T.F, L: T.L, leir: T.midte, kart: T.K, hva: () => 'arbeid', mål: (p, h) => BR.mål(B, T.L, p, h) }, 1);
  for (const s of Object.values(G.pers)) s.ved = true;
  BR.steg(B, { F: T.F, L: T.L, G, A }, 1);
  ok((B.kraftPer[T.sag.id] || 0) === 0, 'selvtest: «ved» på feil mål teller ikke (nøkkelen må stemme)');
}
console.log(feil ? `${feil} FEIL` : 'Alle testene for baering.js er ok');
process.exit(feil ? 1 : 0);
