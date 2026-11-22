// Test av simuleringen (site/dovre-fliser/spill/simulering.js) uten nettleser: to lag (blå og rød) med ferdige ruter og et kunstig
// siktfelt, ett spilldøgn i små steg. Sjekker at lagene marsjerer, at kampen gir treff, at samme frø gir nøyaktig samme verden,
// og at modulen gir NØYAKTIG det samme som den gamle koden i index.html (en kopi av den står nederst som fasit).
// Kjør: node pipeline/fliser/test_simulering.js
const Terreng = require('../../site/dovre-fliser/terreng.js').Terreng;
const Tilfeldig = require('../../site/dovre-fliser/spill/tilfeldig.js');
const Simulering = require('../../site/dovre-fliser/spill/simulering.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

const ROLLER = ['lagfører', 'nestlagfører', 'skarpskytter', 'sanitet', 'radio', 'maskingevær', 'maskingevær', 'rifle', 'rifle', 'rifle', 'rifle', 'rifle'];
const nyttLag = (navn, x, y, side) => ({ navn, x, y, side, leder: 0, sti: null, steg: null, seg: 0, prog: 0, timerIgjen: 0, retning: 0,
  menn: ROLLER.map((rolle, i) => ({ navn: navn + ' ' + (i + 1), rolle, hp: 1 })), planlegger: false });
// rett rute fra laget til (X, Y) i stykker på 100 m, 4 km/t (steg = timer per stykke)
function rett(s, X, Y) {
  const d = Math.hypot(X - s.x, Y - s.y), n = Math.max(1, Math.ceil(d / 100)), sti = [], steg = [];
  for (let i = 0; i <= n; i++) sti.push([s.x + (X - s.x) * i / n, s.y + (Y - s.y) * i / n]);
  for (let i = 0; i < n; i++) steg.push(d / n / 1000 / 4);
  s.sti = sti; s.steg = steg; s.seg = 0; s.prog = 0; s.timerIgjen = d / 4000;
}
const PATRULJE = [[3000, 0], [3000, 1500], [4500, 1500], [4500, 0]];
const SIKT = 800;   // kunstig siktfelt: ser alt innen 800 m

// Lager en ny verden. lagSim(m) gir { steg, kamprunde } – enten modulen eller den gamle koden.
function verden(frø, lagSim) {
  const V = { tid: 0, logg: [], skudd: 0, ordre: 0, simKall: 0 };
  V.lag = [nyttLag('Blått lag', 0, 0, 'blå'), nyttLag('Rød patrulje', 3000, 0, 'rød')];
  const rng = Tilfeldig.lag(frø);
  const kroker = { sim: [dt => { V.simKall++; }], ild: [(a, b) => a.side === 'rød' ? .8 : 1.2], fart: [s => s.side === 'blå' ? 1.1 : 1] };
  const levende = s => s.menn.some(m => m.hp > 0);
  const ser = (s, X, Y) => Math.hypot(X - s.x, Y - s.y) < SIKT;
  const ordre = (s, X, Y) => { V.ordre++; rett(s, X, Y); };
  const m = { lag: () => V.lag, Terreng, kroker, rng, TIME: 60, hentTid: () => V.tid, settTid: t => { V.tid = t; },
    logg: t => V.logg.push(Math.round(V.tid) + ': ' + t), ordre, ser, synlig: e => e.side === 'blå' || V.lag.some(s => s.side === 'blå' && levende(s) && ser(s, e.x, e.y)), levende,
    patruljelag: () => V.lag[1], patruljeMål: (fi, nr) => Simulering.patruljeMål(fi, nr, PATRULJE, 30000), patruljeAntall: PATRULJE.length,
    skudd: () => { V.skudd++; } };
  V.sim = lagSim(m);
  rett(V.lag[0], 2600, 0);   // det blå laget går mot patruljen
  return V;
}
function kjør(V, minutter, dt) { const n = Math.round(minutter / dt); for (let i = 0; i < n; i++) V.sim.steg(dt); return V; }
const bilde = V => JSON.stringify({ tid: V.tid, lag: V.lag.map(s => ({ ...s, skyterPå: [...(s.skyterPå || [])].map(b => b.navn) })), logg: V.logg, skudd: V.skudd });

// --- marsjen alene: én time ved 4 km/t × 1,1 (fart-kroken) uten fiender i nærheten ---
{ const V = verden(1, Simulering.lag); V.lag[1].x = 1e6; V.lag[1].menn.forEach(m => { m.hp = 0; });
  kjør(V, 30, .1);
  ok(Math.abs(V.lag[0].x - 2200) < 1, 'blått lag har gått ca. 2,2 km på 30 min (4 km/t × 1,1): ' + V.lag[0].x.toFixed(1) + ' m');
  kjør(V, 30, .1);
  ok(V.lag[0].sti === null && V.lag[0].x === 2600, 'laget er framme og står ved målet');
  ok(V.logg.some(t => t.includes('Blått lag er framme.')), 'loggen sier «Blått lag er framme.»');
  ok(V.simKall === 600, 'KROKER.sim kalles én gang per steg (' + V.simKall + ')'); }

// --- et spilldøgn med kamp ---
const A = kjør(verden(42, Simulering.lag), 24 * 60, .1);
const ute = s => Terreng.uteAvKamp(s.menn);
ok(A.skudd > 0, 'kampen gir skudd (' + A.skudd + ')');
ok(ute(A.lag[0]) + ute(A.lag[1]) > 0, 'kampen gir treff (blå ute: ' + ute(A.lag[0]) + ', rød ute: ' + ute(A.lag[1]) + ')');
ok(A.logg.some(t => t.includes('skyter mot')), 'loggen melder at det blå laget skyter');
ok(A.ordre > 0, 'patruljen fikk ordre (' + A.ordre + ')');
ok(Math.abs(A.tid - 24 * 60) < 1e-6, 'klokka har gått ett døgn');

// --- samme frø gir nøyaktig samme verden, et annet frø en annen ---
const B = kjør(verden(42, Simulering.lag), 24 * 60, .1);
ok(bilde(A) === bilde(B), 'to kjøringer med samme frø gir nøyaktig samme verden (JSON av lagene, loggen og skuddene)');
const C = kjør(verden(7, Simulering.lag), 24 * 60, .1);
ok(bilde(A) !== bilde(C), 'et annet frø gir en annen kamp');

// --- tilstanden tåler JSON midt i kjøringen og fortsetter likt (lagene og tilfeldigheten lagres og leses) ---
{ const V1 = kjør(verden(42, Simulering.lag), 9 * 60, .1);
  ok(JSON.parse(JSON.stringify(V1.lag.map(s => ({ ...s, skyterPå: null })))).length === 2, 'lagene tåler JSON'); }

// --- fasit: den gamle koden fra index.html (før 22. nov) gir det samme som modulen ---
function gammel(m) {
  let patruljeNr = 0; const KRNG = m.rng, KROKER = m.kroker, TIME = m.TIME, logg = m.logg, ser = m.ser, synlig = m.synlig, levende = m.levende, ordre = m.ordre;
  const SKUDD = { push: () => m.skudd() };
  function kamprunde() {
    const ENHETER = m.lag();
    for (const a of ENHETER) {
      a.skyterPå = a.skyterPå || new Set(); const nå = new Set();
      if (!Terreng.slattUt(a.menn)) for (const b of ENHETER) {
        if (a.side === b.side || !levende(b)) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 1150 || (!ser(a, b.x, b.y) && !(d < 300 && false))) continue;
        const f = { målISkog: !!b.her && b.her.k === 1, målPåMarsj: !!b.sti, skytterPåMarsj: !!a.sti, høydefordel: a.her && b.her ? a.her.h - b.her.h : 0 };
        if (!a.menn.some(m => m.hp >= 1 && Terreng.treffsjanse(m.våpen || m.rolle, d, f) > 0)) continue;
        const ammo0 = a.ammo, ildf = KROKER.ild.reduce((v, h) => v * h(a, b), 1); if (ildf <= 0) { a.ammo = ammo0; continue; }
        let treff = Terreng.ildrunde(a.menn, d, f, KRNG);
        if (ildf < 1) { let t = 0; for (let i = 0; i < treff; i++) if (KRNG() < ildf) t++; treff = t; }
        else if (ildf > 1) { let t = treff; for (let i = 0; i < treff; i++) if (KRNG() < ildf - 1) t++; treff = t; }
        SKUDD.push({ a, b }); nå.add(b);
        if (!a.skyterPå.has(b)) { if (a.side === 'blå') logg(a.navn + ' skyter mot ' + (synlig(b) ? b.navn : 'fienden') + ' (' + Math.round(d) + ' m).'); else if (synlig(a)) logg(a.navn + ' åpner ild mot ' + b.navn + '.'); }
        if (!treff) continue;
        for (const [mm, hva] of Terreng.fordelTreff(b.menn, treff, KRNG)) if (b.side === 'blå') logg(mm.navn + ' (' + b.navn + ') er ' + hva + '.');
        if (b.side !== 'blå' && synlig(b)) logg(b.navn + ': ' + treff + ' treff.');
        if (b.menn[b.leder].hp < 1) { const ny = b.menn.findIndex(mm => mm.hp >= 1); if (ny >= 0) { b.leder = ny; if (b.side === 'blå') logg(b.menn[ny].navn + ' tar over som lagfører i ' + b.navn + '.'); } }
        if (Terreng.slattUt(b.menn) && !b.slattUtMeldt) { b.slattUtMeldt = true;
          logg(b.navn + ' er slått ut av kamp (' + Terreng.uteAvKamp(b.menn) + ' av 12 falt eller såret).');
          if (b.side !== 'blå') { const ang = Math.atan2(b.y - a.y, b.x - a.x); ordre(b, b.x + Math.cos(ang) * 3000, b.y + Math.sin(ang) * 3000, true); } }
      }
      a.skyterPå = nå;
    }
  }
  function steg(dt) {
    for (const f of KROKER.sim) f(dt);
    const før = m.hentTid(); m.settTid(før + dt); const tid = m.hentTid(); const fi = m.patruljelag(), ENHETER = m.lag();
    if (Math.floor(tid / Terreng.KAMPRUNDE_MIN) !== Math.floor(før / Terreng.KAMPRUNDE_MIN)) kamprunde();
    if (!Terreng.slattUt(fi.menn)) {
      const fiende = ENHETER.find(b => b.side === 'blå' && levende(b) && Math.hypot(b.x - fi.x, b.y - fi.y) < 900 && ser(fi, b.x, b.y));
      if (fiende) { if (fi.sti) { fi.sti = null; fi.siktSkitten = true; } fi.roligTil = tid + 30; }
      else if (!fi.sti && !fi.planlegger && tid > (fi.roligTil || 0)) { patruljeNr = (patruljeNr + 1) % PATRULJE.length; const pm = m.patruljeMål(fi, patruljeNr); if (pm) ordre(fi, pm[0], pm[1], true); }
    }
    for (const s of ENHETER) {
      if (!s.sti) continue;
      let igjen = dt / TIME * (KROKER.fart ? KROKER.fart.reduce((v, f) => v * f(s), 1) : 1); s.timerIgjen -= igjen;
      while (igjen > 0 && s.seg < s.sti.length - 1) {
        const [ax, ay] = s.sti[s.seg], [bx, by] = s.sti[s.seg + 1], t = s.steg[s.seg] || 1e-9, rest = (1 - s.prog) * t;
        s.retning = Math.atan2(by - ay, bx - ax);
        if (igjen >= rest) { igjen -= rest; s.seg++; s.prog = 0; s.x = bx; s.y = by; }
        else { s.prog += igjen / t; igjen = 0; s.x = ax + (bx - ax) * s.prog; s.y = ay + (by - ay) * s.prog; }
      }
      if (s.seg >= s.sti.length - 1) { s.sti = null; s.siktSkitten = true; if (s.side === 'blå') logg(s.navn + ' er framme.'); }
    }
  }
  return { steg, kamprunde };
}
for (const frø of [42, 7, 2026]) {
  const ny = kjør(verden(frø, Simulering.lag), 24 * 60, .1), gml = kjør(verden(frø, gammel), 24 * 60, .1);
  ok(bilde(ny) === bilde(gml), 'frø ' + frø + ': modulen gir nøyaktig det samme som den gamle koden i index.html (' + gml.skudd + ' skudd, ' + gml.logg.length + ' linjer i loggen)');
}
// ujevne steg (som løkka i siden: maks 0,1 og en rest)
{ const st = [.1, .1, .037, .1, .063, .02]; const kj = V => { for (let i = 0; i < 20000; i++) V.sim.steg(st[i % st.length]); return V; };
  ok(bilde(kj(verden(5, Simulering.lag))) === bilde(kj(verden(5, gammel))), 'ujevne steg: modulen og den gamle koden er like'); }

console.log(feil ? feil + ' FEIL' : 'alt ok');
process.exit(feil ? 1 : 0);
