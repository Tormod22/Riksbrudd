// Test for spill/folkgang.js (folk som går i leiren, fase F2): node pipeline/fliser/test_folkgang.js
const S = '../../site/dovre-fliser/spill/';
const Leir = require(S + 'leir.js'), FR = require(S + 'folk.js'), Vei = require(S + 'vei.js'), BS = require(S + 'byggesett.js');
const Jobber = require(S + 'jobber.js'), FG = require(S + 'folkgang.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const KL = h => ((h - 6 + 24) % 24) * 60;
const ms = f => { const t = process.hrtime.bigint(); const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6]; };

// ---------- prøveleirer ----------
const OPPG = ['bygg', 'bygg', 'vakt', 'kjøkken', 'verksted', 'overvåking', 'bygg', 'fri', 'maskin', 'stell'];
function leir(n, o = {}) {
  const L = Leir.ny(), mx = 1000, my = 2000; let id = 1;
  const legg = (type, x, y, ret = 0, ferdig = true) => { const b = { id: id++, type, x: mx + x, y: my + y, ret, nivå: 1, hp: 1, igjen: ferdig ? 0 : 120, totalt: 120, nr: id, arbeid: null }; L.bygg.push(b); return b; };
  // senger: 8 per brakke på nivå 1
  const nb = Math.ceil(n / 8); for (let k = 0; k < nb; k++) legg('brakke', -40 + (k % 6) * 16, 25 + Math.floor(k / 6) * 16, 0);
  legg('kjøkken', 20, -20); legg('vakttårn', 45, 0); legg('verksted', -25, -25); legg('kontrollrom', 0, -35); legg('sagbruk', 40, -40); legg('sykestue', -45, 0);
  const tomt = o.byggeplass !== false ? legg('brakke', 30, 30, 0, false) : null;
  L.neste = id; L.nesteJobb = id;
  const F = { personer: [], moral: 70, mat: 100, sist: {}, tempoF: 1 };
  for (let i = 0; i < n; i++) { const ferd = {}; for (const q of FR.OPPGAVER) ferd[q] = 1; F.personer.push({ id: i + 1, navn: 'Person ' + (i + 1), oppgave: o.alle || OPPG[i % OPPG.length], helse: 1, ferd, lojal: .7, seng: true }); }
  L.folk = F;
  return { L, F, midte: { x: mx, y: my }, tomt };
}
const kartFor = P => Vei.lag({ leir: P.L, start: [P.midte.x, P.midte.y] });
// gå i dt-steg (sekunder) til tiden er gått
function kjør(G, ctx, sek, dt = .25) { for (let t = 0; t < sek; t += dt) FG.steg(G, ctx, dt); return G; }

// ---------- 1. en person med jobb går til arbeidsplassen og er framme først der ----------
{ const P = leir(10), K = kartFor(P), G = FG.ny(), J = Jobber.ny();
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva };
  FG.steg(G, ctx, .25);
  const vakt = P.F.personer.find(p => p.oppgave === 'vakt'), s = G.pers[vakt.id];
  ok(s && s.mål && s.mål.navn === 'vakttårnet' && !s.framme, 'vakta skal til vakttårnet og er ikke framme med en gang (' + (s && s.mål && s.mål.navn) + ')');
  ok(FG.stedF(G, P.F, 'vakt') === 0, 'vakta bidrar ikke før hen er framme (stedF ' + FG.stedF(G, P.F, 'vakt') + ')');
  kjør(G, ctx, 90);
  ok(G.pers[vakt.id].framme && FG.stedF(G, P.F, 'vakt') === 1, 'etter 90 s er vakta framme (' + FG.tekst(G, vakt) + ')');
  const bygger = P.F.personer.find(p => p.oppgave === 'bygg'), sb = G.pers[bygger.id];
  ok(sb.framme && sb.mål.navn === 'byggeplassen' && Math.hypot(sb.x - P.tomt.x, sb.y - P.tomt.y) < 8, 'byggeren står ved byggeplassen (' + FG.tekst(G, bygger) + ')');
  // veien går rundt byggene, ikke gjennom dem
  const inni = (b, x, y) => { const h = Leir.hjørner(b); let inn = false; for (let i = 0, j = h.length - 1; i < h.length; j = i++) if ((h[i][1] > y) !== (h[j][1] > y) && x < (h[j][0] - h[i][0]) * (y - h[i][1]) / (h[j][1] - h[i][1]) + h[i][0]) inn = !inn; return inn; };
  let gjennom = 0; for (const p of P.F.personer) { const q = G.pers[p.id]; for (const b of P.L.bygg) if (inni(b, q.x, q.y)) gjennom++; }
  ok(gjennom === 0, 'ingen står inne i et bygg (hindringene) etter 90 s: ' + gjennom);
  const alle = FG.oversikt(G); ok(alle.framme === alle.n && alle.fast === 0, 'alle ti er framme etter 90 s: ' + JSON.stringify(alle));
  // tekstene
  ok(/^går til|bygger|står vakt|lager mat|kjører|arbeider|ser gjennom|steller|har fri/.test(FG.tekst(G, bygger)), 'tekst: «' + FG.tekst(G, bygger) + '»');
}
// ---------- 2. om natta går folk til senga, til middag til kjøkkenet ----------
{ const P = leir(10), K = kartFor(P), G = FG.ny(), J = Jobber.ny(); let kl = KL(23);
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, kl).hva };
  kjør(G, ctx, 120);
  const sover = P.F.personer.filter(p => G.pers[p.id].hva === 'søvn'), iSeng = sover.filter(p => G.pers[p.id].framme && /senga/.test(G.pers[p.id].mål.navn));
  ok(sover.length >= 5 && iSeng.length === sover.length, `kl. 23: ${sover.length} sover, ${iSeng.length} av dem i senga (${sover.map(p => FG.tekst(G, p)).slice(0, 2).join('; ')})`);
  ok(sover.every(p => G.pers[p.id].inne === 'brakke'), 'de som sover, er inne i brakka');
  // hver sin seng: ikke flere i en brakke enn den har senger
  const per = {}; for (const p of sover) { const k = G.pers[p.id].mål.k; per[k] = (per[k] || 0) + 1; } ok(Object.values(per).every(v => v <= 8), 'ikke flere enn 8 i hver brakke: ' + JSON.stringify(per));
  kl = KL(17.5); kjør(G, ctx, 120);
  const spiser = P.F.personer.filter(p => G.pers[p.id].hva === 'mat');
  ok(spiser.length > 0 && spiser.every(p => G.pers[p.id].mål.navn === 'kjøkkenet'), `kl. 17:30: ${spiser.length} spiser på kjøkkenet`);
  kl = KL(19); kjør(G, ctx, 60);
  const fri = P.F.personer.filter(p => G.pers[p.id].hva === 'fri'); ok(fri.length > 0 && fri.every(p => G.pers[p.id].mål.navn === 'bålet'), `kl. 19: ${fri.length} har fri ved bålet`);
  // uten senger sover de ute
  const P2 = leir(10); P2.L.bygg = P2.L.bygg.filter(b => b.type !== 'brakke'); const G2 = FG.ny();
  FG.steg(G2, { F: P2.F, L: P2.L, leir: P2.midte, kart: kartFor(P2), hva: () => 'søvn' }, .25);
  ok(/sover ute/.test(FG.tekst(G2, P2.F.personer[0])), 'uten brakke: «' + FG.tekst(G2, P2.F.personer[0]) + '»');
}
// ---------- 3. står fast: et verksted inne i et rom uten dør gir «ingen vei» ----------
{ const P = leir(10), G = FG.ny();
  const vk = P.L.bygg.find(b => b.type === 'verksted'), o = { ox: P.midte.x, oy: P.midte.y }; P.L.byggesett = o;
  // en palisade rundt verkstedet (ingen port)
  let id = 500; for (const q of BS.rad(o, 'bs_palisade', [vk.x - 16, vk.y - 16], [vk.x + 16, vk.y + 16])) P.L.bygg.push({ id: id++, type: 'bs_palisade', x: vk.x, y: vk.y, bs: { i: q.i, j: q.j, a: q.a, n: 0 }, igjen: 0, hp: 1, nivå: 1, nr: id });
  const K = kartFor(P), ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: () => 'arbeid' };
  kjør(G, ctx, 60);
  const v = P.F.personer.find(p => p.oppgave === 'verksted'), s = G.pers[v.id];
  ok(s.fast && /ingen dør|ingen vei/.test(s.fast) && !s.framme, 'verkstedet bak vegger uten dør: står fast («' + s.fast + '»)');
  ok(FG.stedF(G, P.F, 'verksted') === 0, 'den som står fast, bidrar ikke (stedF 0)');
  const f = FG.fast(G, P.F); ok(f.length === 1 && f[0].type === 'verksted' && f[0].navn.length === 1, 'fast(): ' + JSON.stringify(f));
  ok(/står fast – kommer ikke til verkstedet/.test(FG.tekst(G, v)), 'tekst: «' + FG.tekst(G, v) + '»');
  // river en bit av palisaden: da kommer hen fram
  const ps = P.L.bygg.filter(b => b.type === 'bs_palisade' && b.bs.a === 'y'), iMin = Math.min(...ps.map(q => q.bs.i)), vest = ps.filter(q => q.bs.i === iMin).sort((a, b) => a.bs.j - b.bs.j);
  for (const w of vest.slice(Math.floor(vest.length / 2) - 1, Math.floor(vest.length / 2) + 1)) P.L.bygg.splice(P.L.bygg.indexOf(w), 1); const K2 = kartFor(P); ctx.kart = K2; kjør(G, ctx, 120);
  ok(!G.pers[v.id].fast && G.pers[v.id].framme, 'med en åpning i palisaden: framme (' + FG.tekst(G, v) + ')');
}
// ---------- 4. arbeidet: folk.js-tempoet følger «framme» (kroken stedF), byggetiden før og etter ----------
{ const tider = {};
  for (const variant of ['før', 'døgn', 'døgn+gange']) {
    const P = leir(10, { alle: 'bygg' }), K = kartFor(P), G = FG.ny(), J = Jobber.ny();
    // byggeplassen 120 m fra leiren (lang vei = mindre arbeid)
    const tomt = P.tomt; tomt.x = P.midte.x + 120; tomt.igjen = 240; tomt.totalt = 240;
    let t = KL(8);
    FR.døgnF = variant === 'før' ? null : (F, o) => Jobber.faktor(J, F, o, t);
    FR.stedF = variant === 'døgn+gange' ? (F, o) => FG.stedF(G, F, o) : null;
    const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => (variant === 'før' ? 'arbeid' : Jobber.nå(J, P.F, p, t).hva) };
    let min = 0; const dtMin = .25 / 60 * 8;
    while (tomt.igjen > 0 && min < 48 * 60) { FG.steg(G, ctx, dtMin * 60); Leir.steg(P.L, dtMin, 1); t += dtMin; min += dtMin; }
    tider[variant] = Math.round(min / 6) / 10;
  }
  FR.døgnF = null; FR.stedF = null;
  console.log('     byggetid for en brakke (4 t arbeid) 120 m unna, bestilt kl. 08 (timer):', JSON.stringify(tider));
  ok(tider['døgn+gange'] >= tider['døgn'] && tider['døgn+gange'] < tider['døgn'] * 1.15, 'gangen gjør byggingen litt tregere (lang vei), men ikke mye: ' + tider['døgn'] + ' -> ' + tider['døgn+gange'] + ' t');
  // uten kroken (døgnplanen av, testene) er tempoet som før
  const P = leir(4, { alle: 'bygg' }); ok(FR.tempo(P.F, 'bygg') > 0 && FR.stedF === null, 'uten stedF-kroken: tempoet som før (' + FR.tempo(P.F, 'bygg').toFixed(2) + ')');
  const G = FG.ny(); FG.steg(G, { F: P.F, L: P.L, leir: P.midte, kart: kartFor(P), hva: () => 'arbeid' }, .25); FR.stedF = (F, o) => FG.stedF(G, F, o);
  ok(FR.tempo(P.F, 'bygg') === 0, 'med kroken og ingen framme: tempo 0'); FR.stedF = null;
}
// ---------- 5. 10, 50 og 200 folk: ms per oppdatering, alle kommer fram ----------
for (const n of [10, 50, 200]) {
  const P = leir(n), [K, kms] = ms(() => kartFor(P)), G = FG.ny(), J = Jobber.ny();
  const ctx = { F: P.F, L: P.L, leir: P.midte, kart: K, hva: p => Jobber.nå(J, P.F, p, KL(9)).hva };
  const [, første] = ms(() => FG.steg(G, ctx, .25));
  let sum = 0, maks = 0; for (let k = 0; k < 480; k++) { const [, m] = ms(() => FG.steg(G, ctx, .25)); sum += m; maks = Math.max(maks, m); }
  const o = FG.oversikt(G);
  console.log(`     ${n} folk: kartet ${kms.toFixed(1)} ms, første oppdatering ${første.toFixed(1)} ms, snitt ${(sum / 480).toFixed(2)} ms, lengste ${maks.toFixed(1)} ms – ${JSON.stringify(o)}`);
  ok(o.framme + o.fast === n && o.fast === 0, `${n} folk: alle er framme etter 2 min (${o.framme} framme, ${o.fast} fast)`);
  ok(sum / 480 < (n >= 200 ? 6 : 3), `${n} folk: snitt under ${n >= 200 ? 6 : 3} ms per oppdatering (${(sum / 480).toFixed(2)})`);
  // om natta (ny plan for alle): første oppdatering med nye veier
  const ctx2 = { ...ctx, hva: () => 'søvn' }; const [, natt] = ms(() => FG.steg(G, ctx2, .25)); kjør(G, ctx2, 150);
  const o2 = FG.oversikt(G); console.log(`     ${n} folk om natta: ny plan for alle ${natt.toFixed(1)} ms – ${JSON.stringify(o2)}`);
  ok(o2.framme === n, `${n} folk: alle i senga etter 2,5 min (${o2.framme})`);
}
// ---------- 6. byggesettets egne rom med senger: folk sover der ----------
{ const P = leir(3, { byggeplass: false }); P.L.bygg = P.L.bygg.filter(b => b.type !== 'brakke'); const o = { ox: P.midte.x, oy: P.midte.y }; P.L.byggesett = o;
  let nr = 900; const deler = BS.husForslag([], 'brakke', 4, 4, 0).filter(q => !q.feil).map(q => q.d);
  for (const d of deler) P.L.bygg.push({ id: nr++, type: d.type, x: o.ox + d.i * BS.G, y: o.oy + d.j * BS.G, bs: { i: d.i, j: d.j, a: d.a, n: d.n }, igjen: 0, hp: 1, nivå: 1, nr });
  const rom = BS.rom(BS.fraLeir(P.L, Leir)); const G = FG.ny(), ctx = { F: P.F, L: P.L, leir: P.midte, kart: kartFor(P), hva: () => 'søvn' }; kjør(G, ctx, 120);
  const s = G.pers[1];
  ok(rom.some(r => r.senger > 0) && s.framme && /egenbygde/.test(s.mål.navn), 'senga i det egenbygde huset: ' + FG.tekst(G, P.F.personer[0]) + ' (' + rom.map(r => r.navn + ' ' + r.senger).join(', ') + ')');
}
console.log(feil ? `${feil} FEIL` : 'Alle testene for folkgang.js er ok');
process.exit(feil ? 1 : 0);
