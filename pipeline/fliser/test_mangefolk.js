// Test for fase F5 «mange folk og utposter»: spill/utpost.js, spill/trafikkart.js og ordre/utpost/reise i spill/folkgang.js.
// node pipeline/fliser/test_mangefolk.js
const S = '../../site/dovre-fliser/spill/';
const Leir = require(S + 'leir.js'), FR = require(S + 'folk.js'), Vei = require(S + 'vei.js'), Jobber = require(S + 'jobber.js');
const FG = require(S + 'folkgang.js'), UR = require(S + 'utpost.js'), TK = require(S + 'trafikkart.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const KL = h => ((h - 6 + 24) % 24) * 60;
const ms = f => { const t = process.hrtime.bigint(); const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6]; };

// ---------- prøveleir (som test_folkgang.js) ----------
const OPPG = ['bygg', 'bygg', 'vakt', 'kjøkken', 'verksted', 'overvåking', 'bygg', 'fri', 'maskin', 'stell'];
function leir(n, o = {}) {
  const L = Leir.ny(), mx = 1000, my = 2000; let id = 1;
  const legg = (type, x, y, ret = 0, ferdig = true) => { const b = { id: id++, type, x: mx + x, y: my + y, ret, nivå: 1, hp: 1, igjen: ferdig ? 0 : 120, totalt: 120, nr: id, arbeid: null }; L.bygg.push(b); return b; };
  const nb = Math.ceil(n / 8); for (let k = 0; k < nb; k++) legg('brakke', -40 + (k % 6) * 16, 25 + Math.floor(k / 6) * 16, 0);
  legg('kjøkken', 20, -20); legg('vakttårn', 45, 0); legg('verksted', -25, -25); legg('kontrollrom', 0, -35); legg('sagbruk', 40, -40); legg('sykestue', -45, 0);
  legg('brakke', 30, 30, 0, false); L.neste = id; L.nesteJobb = id;
  const F = { personer: [], moral: 70, mat: 100, sist: {}, tempoF: 1 };
  for (let i = 0; i < n; i++) { const ferd = {}; for (const q of FR.OPPGAVER) ferd[q] = 1; F.personer.push({ id: i + 1, navn: 'Person ' + (i + 1), oppgave: o.alle || OPPG[i % OPPG.length], helse: 1, ferd, lojal: .7, seng: true }); }
  L.folk = F; return { L, F, midte: { x: mx, y: my } };
}
const kartFor = P => Vei.lag({ leir: P.L, start: [P.midte.x, P.midte.y] });
function kjør(G, ctx, sek, dt = .25) { for (let t = 0; t < sek; t += dt) { if (ctx.klokke) ctx.tid = ctx.klokke(t); FG.steg(G, ctx, dt); } return G; }

// ---------- 1. utpostreglene ----------
{ const U = UR.ny(), m = { x: 1000, y: 2000 };
  ok(UR.lag(U, 1100, 2000, 'Nær', { leir: m }).feil, 'en utpost kan ikke ligge nærmere enn 500 m');
  const u = UR.lag(U, 6000, 2000, 'Gården', { leir: m }); ok(u && u.id === 1 && u.navn === 'Gården', 'utposten lages 5 km unna');
  ok(UR.tildel(U, 7, 1).utpost === u && UR.hvor(U, 7) === u, 'person 7 sendes til utposten');
  UR.tildel(U, 8, 1); u.senger = 1; ok(UR.seng(u, 7) && !UR.seng(u, 8) && UR.sengerIBruk(U) === 1, 'én seng: den første får den, den andre sover ute');
  UR.tildel(U, 7, null); ok(!UR.hvor(U, 7) && u.folk.length === 1, 'hjem igjen: ute av utposten');
  ok(Math.abs(UR.reisetid(u, m) - 5000 / 1.3) < 1, 'reisetida er avstand / fart (' + Math.round(UR.reisetid(u, m)) + ' s)');
  // frakt fra leiren tar arbeidstid; lokal mat koster og gir rasjonene tilbake
  const r1 = UR.steg(U, { 1: { her: 1, reiser: 0, arbeider: 1, arbeidSek: 3600, reiseSek: 0 } }, 3600, { leir: m });
  ok(u.timer.arbeid > .9 && u.timer.arbeid < 1 && u.timer.frakt > 0 && r1.kr === 0, `mat fra leiren: 1 time arbeid minus frakt (${u.timer.arbeid.toFixed(3)} t, frakt ${u.timer.frakt.toFixed(3)} t)`);
  u.mat = 'lokal'; const r2 = UR.steg(U, { 1: { her: 1, reiser: 0, arbeider: 1, arbeidSek: 86400, reiseSek: 0 } }, 86400, { leir: m });
  ok(Math.abs(r2.rasjoner - 1) < 1e-6 && Math.abs(r2.kr - 4500) < 1, `lokal mat: 1 rasjon per døgn for 4 500 kr (${r2.kr})`);
  const J = JSON.parse(JSON.stringify(U)), U2 = UR.fraJSON(J); ok(U2.liste.length === 1 && U2.liste[0].folk.length === 1 && U2.neste === 2, 'lagres og leses');
  ok(/5 km fra leiren/.test(UR.tekst(u, m)), 'tekst: ' + UR.tekst(u, m));
}
// ---------- 2. en person i utposten reiser dit med reisetid og bidrar først når hen er framme ----------
{ const P = leir(10), K = kartFor(P), G = FG.ny(), J = Jobber.ny(), U = UR.ny(); const u = UR.lag(U, P.midte.x + 4000, P.midte.y, 'Utpost Gården', { leir: P.midte });
  const vakt = P.F.personer.find(p => p.oppgave === 'vakt'); UR.tildel(U, vakt.id, u.id);
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva, utpost: p => { const q = UR.hvor(U, p.id); return q ? { ...q, seng: pp => UR.seng(q, pp.id) } : null; } };
  kjør(G, ctx, 60); let s = G.pers[vakt.id];
  ok(s.utpost === u.id && !s.framme && s.reise && /reiser til Utpost Gården/.test(FG.tekst(G, vakt)), 'etter 1 min: på reise – ' + FG.tekst(G, vakt));
  ok(G.ute[u.id] && G.ute[u.id].reiser === 1 && G.ute[u.id].arbeidSek === 0, 'utposten: én på vei, ingen arbeidstid ennå');
  // halvveis (ca. 25 min): ennå ikke framme
  kjør(G, ctx, 1500, 5); ok(!G.pers[vakt.id].framme, 'etter 26 min (reisetid ca. 51 min): fortsatt på vei');
  kjør(G, ctx, 1700, 5); s = G.pers[vakt.id];
  ok(s.framme && Math.hypot(s.x - u.x, s.y - u.y) < 12 && /holder vakt ved utposten/.test(FG.tekst(G, vakt)), 'etter 54 min: framme i utposten – ' + FG.tekst(G, vakt));
  let sek = 0; for (let k = 0; k < 20; k++) { FG.steg(G, ctx, 5); sek += G.ute[u.id].arbeidSek; }
  ok(Math.abs(sek - 100) < 1e-6, 'framme: arbeidstida telles i utposten (' + sek + ' s av 100)');
  ok(FG.stedF(G, P.F, 'vakt') === 0, 'leirens vakt: den i utposten teller ikke som framme i leiren (stedF ' + FG.stedF(G, P.F, 'vakt') + ')');
  // om natta sover hen i utposten (seng: ingen -> «sover ute ved utposten»)
  const ctx2 = { ...ctx, hva: () => 'søvn' }; kjør(G, ctx2, 20); ok(/sover ute ved utposten/.test(FG.tekst(G, vakt)) && G.pers[vakt.id].framme, 'natt uten seng: ' + FG.tekst(G, vakt));
  u.senger = 2; kjør(G, ctx2, 20); ok(/sover i utposten/.test(FG.tekst(G, vakt)), 'med seng: ' + FG.tekst(G, vakt));
  // hjem igjen: reiser tilbake (ingen veisøk på 4 km)
  UR.tildel(U, vakt.id, null); kjør(G, ctx, 10); s = G.pers[vakt.id]; ok(s.utpost === null && s.reise && !s.framme, 'hjem igjen: reiser tilbake – ' + FG.tekst(G, vakt));
}
// ---------- 3. ORDRE «Gå hit»: personen går dit, er framme, og jobbtavla tar over igjen ----------
{ const P = leir(10), K = kartFor(P), G = FG.ny(), J = Jobber.ny();
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva };
  kjør(G, ctx, 90); const p = P.F.personer.find(q => q.oppgave === 'verksted'), før = G.pers[p.id].mål.k;
  ok(G.pers[p.id].framme, 'verkstedmannen står på verkstedet først');
  const mål = { x: P.midte.x - 10, y: P.midte.y + 8 }; FG.gi(G, p.id, { type: 'gå', ...mål });
  kjør(G, ctx, 1); ok(G.pers[p.id].mål.ordre && !G.pers[p.id].framme && FG.stedF(G, P.F, 'verksted') === 0, 'på ordre: går dit og bidrar ikke på verkstedet imens');
  let h = []; for (let t = 0; t < 120 && !h.some(e => e.type === 'framme'); t += .25) { FG.steg(G, ctx, .25); h = h.concat(FG.hendelser(G)); }
  const fr = h.find(e => e.type === 'framme' && e.id === p.id); ok(!!fr, 'hendelsen «framme» kommer');
  ok(fr && !G.ordre[p.id], 'ordren er tatt bort når hen er framme');
  const s = G.pers[p.id]; ok(Math.hypot(s.x - mål.x, s.y - mål.y) < 2.5, 'hen står der spilleren pekte (' + Math.hypot(s.x - mål.x, s.y - mål.y).toFixed(1) + ' m)');
  kjør(G, ctx, 1); ok(G.pers[p.id].mål.k === før && !G.pers[p.id].mål.ordre, 'jobbtavla tar over igjen: på vei til verkstedet (' + FG.tekst(G, p) + ')');
  kjør(G, ctx, 90); ok(G.pers[p.id].framme && FG.stedF(G, P.F, 'verksted') === 1, 'og er framme på verkstedet igjen');
  // til et sted ingen kan nå (inne i en brakke): ordren gir «står fast»
  const b = P.L.bygg.find(q => q.type === 'brakke'); FG.gi(G, p.id, { type: 'gå', x: b.x, y: b.y });
  let h2 = []; for (let t = 0; t < 30; t += .25) { FG.steg(G, ctx, .25); h2 = h2.concat(FG.hendelser(G)); }
  ok(h2.some(e => e.type === 'fast' || e.type === 'framme') && !G.ordre[p.id], 'ordre til et sted inne i et bygg: avsluttes (' + h2.map(e => e.type + (e.grunn ? ' ' + e.grunn : '')).join(', ') + ')');
}
// ---------- 4. ORDRE «Gjør dette nå»: arbeid nå også om natta, til tida er ute ----------
{ const P = leir(10), K = kartFor(P), G = FG.ny(), J = Jobber.ny(); let tid = 1000;
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(23)).hva, tid };
  const p = P.F.personer.find(q => q.oppgave === 'verksted'); kjør(G, ctx, 60);
  ok(G.pers[p.id].hva === 'søvn', 'kl. 23 sover verkstedmannen');
  FG.gi(G, p.id, { type: 'gjør', oppgave: 'verksted', til: tid + 60 }); kjør(G, ctx, 90);
  ok(G.pers[p.id].hva === 'arbeid' && G.pers[p.id].framme && /arbeider i verkstedet/.test(FG.tekst(G, p)), '«Gjør dette nå»: arbeider om natta – ' + FG.tekst(G, p));
  ctx.tid = tid + 61; FG.steg(G, ctx, .25); const h = FG.hendelser(G);
  ok(h.some(e => e.type === 'ferdig' && e.id === p.id) && !G.ordre[p.id], 'når tida er ute: «ferdig», og ordren er borte');
  kjør(G, ctx, 2); ok(G.pers[p.id].hva === 'søvn', 'døgnplanen tar over igjen: går og legger seg');
}
// ---------- 5. trafikkartet ----------
{ const T = TK.ny({ x: 0, y: 0 });
  ok(TK.legg(T, 5, 5, 2, 0) && !TK.legg(T, 5000, 0, 2, 0), 'punkter i leiren telles, langt unna ikke');
  for (let k = 0; k < 10; k++) TK.legg(T, 20, 20, 2, 10); const o = TK.oversikt(T);
  ok(o.meter === 22 && Math.hypot(o.rute.x - 22, o.rute.y - 22) < 3, 'oversikten: 22 m, mest ved (20, 20)');
  TK.legg(T, -50, 0, 1, 250); ok(TK.oversikt(T).meter === 23, 'ny bøtte: det gamle står (siste døgn)');
  TK.legg(T, -50, 0, 1, 1440 + 5); ok(TK.oversikt(T).meter === 2, 'etter ett døgn: den første bøtta er tømt');
  TK.legg(T, 0, 0, 1, 1440 * 5); ok(TK.oversikt(T).meter === 1, 'langt fram i tid: alt gammelt er borte');
  ok(TK.farge(1, 10)[3] < TK.farge(10, 10)[3] && TK.farge(0, 10) === null, 'fargen er sterkere der det er gått mer');
  // med gangen: summen i kartet er det folk har gått inne i ruta
  const P = leir(20), K = kartFor(P), G = FG.ny(), J = Jobber.ny(), T2 = TK.ny(P.midte);
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva, spor: (x, y, m) => TK.legg(T2, x, y, m, 100) };
  kjør(G, ctx, 120); const gått = Object.values(G.pers).reduce((a, s) => a + s.gått, 0), i = TK.oversikt(T2).meter;
  ok(i > gått * .9 && i <= gått + 1e-6, `trafikkartet har ${i.toFixed(0)} av ${gått.toFixed(0)} m gått`);
  ok(TK.topp(T2).length >= 1, 'de mest brukte stedene: ' + TK.topp(T2).map(q => Math.round(q.meter) + ' m').join(', '));
}
// ---------- 6. 50, 100 og 200 folk med jobbtavla, utposten og trafikkartet: tida per oppdatering ----------
for (const n of [50, 100, 200]) {
  const P = leir(n), K = kartFor(P), G = FG.ny(), J = Jobber.ny(), U = UR.ny(), T = TK.ny(P.midte); const u = UR.lag(U, P.midte.x + 5000, P.midte.y, 'Ute', { leir: P.midte });
  for (const p of P.F.personer.slice(0, Math.round(n / 10))) UR.tildel(U, p.id, u.id);
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva, spor: (x, y, m) => TK.legg(T, x, y, m, 100),
    utpost: p => { const q = UR.hvor(U, p.id); return q ? { ...q, seng: pp => UR.seng(q, pp.id) } : null; } };
  kjør(G, ctx, 5); let sum = 0, maks = 0;
  for (let k = 0; k < 400; k++) { const [, m] = ms(() => { FG.steg(G, ctx, .25); UR.steg(U, G.ute, .25, { leir: P.midte }); }); sum += m; maks = Math.max(maks, m); }
  const [, fm] = ms(() => { for (let k = 0; k < 10; k++) Jobber.fordel(P.F, J, Jobber.lag(P.F, P.L, {})); });
  console.log(`     ${n} folk: snitt ${(sum / 400).toFixed(3)} ms per oppdatering (gang + utpost + trafikk), lengste ${maks.toFixed(1)} ms, jobbtavla fordeler på ${(fm / 10).toFixed(2)} ms`);
  ok(sum / 400 < 3, `${n} folk: under 3 ms per oppdatering (${(sum / 400).toFixed(3)})`);
}
console.log(feil ? `${feil} FEIL` : 'Alle testene for mange folk og utposter er ok'); process.exit(feil ? 1 : 0);
