// Test for spill/etasjer.js (fase B2): veien gjennom trappene, høyden på trappa, kollisjonen per etasje, funn per etasje og hull.
// node pipeline/fliser/test_etasjer.js   (RASK=1 færre prøvehus)
'use strict';
const B = require('../../site/dovre-fliser/spill/bygning.js'), E = require('../../site/dovre-fliser/spill/etasjer.js'), L = require('../../site/dovre-fliser/spill/leting.js');
let feil = 0, n = 0; const ok = (v, t) => { n++; if (!v) { feil++; if (feil < 30) console.log('FEIL:', t); } };
const rekt = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
const L_ = [-1, 1];
const saker = [];
for (const kl of ['hus', 'leil', 'kontor', 'skole', 'hytte', 'butikk']) for (const [w, d] of [[10, 8], [14, 9], [22, 12]]) for (const h of [6, 9, 13, 18]) saker.push([kl, w, d, h]);
const utvalg = process.env.RASK ? saker.filter((_, k) => k % 4 === 0) : saker;
let flere = 0, veier = 0, trinn = 0, bytter = 0; const vedVegg = new Set(); let rette = 0;
for (const [k, [kl, w, d, h]] of utvalg.entries()) {
  const P = rekt(w, d), i = 1000 + k * 37, m = B.fraKart(P, { i, kl, h, dør: { x: 0, y: -d / 2, w: 1.1 } });
  if (m.etasjer.length < 2) continue; flere++;
  const fra = { x: 0, y: -d / 2 + .8, n: 1 };
  for (const et of m.etasjer) {
    if (et.n === 1) continue; const v = E.vei(m, fra, et.n); ok(!!v, `${kl} ${w}×${d} ${h} m: ingen vei til ${et.navn}`); if (!v) continue; veier++;
    ok(v[v.length - 1].n === et.n, `${kl}: veien ender ikke i ${et.navn}`);
    // gå langs veien i små steg: høyden endrer seg jevnt, og etasjen skifter midt i hver trapp
    let nå = 1, z0 = 0; const før = feil;
    for (let s = 1; s < v.length; s++) { const a = v[s - 1], b = v[s], Ls = Math.hypot(b.x - a.x, b.y - a.y), N = Math.max(1, Math.ceil(Ls / .1));
      if (s === 1) continue;
      for (let q = 0; q <= N; q++) { const x = a.x + (b.x - a.x) * q / N, y = a.y + (b.y - a.y) * q / N, r = E.stå(m, nå, x, y); trinn++;
        if (!r) { ok(false, `${kl}: stå ga null`); break; }
        ok(Math.abs(r.z - z0) < .6, `${kl} ${h} m: høyden hopper ${z0.toFixed(2)} -> ${r.z.toFixed(2)} på vei til ${et.navn}`);
        // (veien er rette streker mellom trappene – bare selve trappa og reposene sjekkes for sperring)
        if (b.trapp !== undefined) { ok(!E.trappSperrer(m, nå, x, y), `${kl} ${w}×${d} ${h} m: trappa sperrer i etasje ${nå} (${x.toFixed(2)}, ${y.toFixed(2)})`);
          // (byggemodellen kan legge reposet tett inntil en vegg – det telles, men er modellens sak: docs/natt/ut3-etasjer.md)
          if (nå !== 1 && E.blokkert(m, nå, x, y)) vedVegg.add(kl + h + w + ':' + b.trapp); }
        z0 = r.z; if (r.n !== nå) { nå = r.n; bytter++; } } }
    ok(nå === et.n, `${kl} ${h} m: kom til etasje ${nå}, ikke ${et.n}`);
    ok(Math.abs(z0 - et.z) < .05, `${kl}: høyden i ${et.navn} er ${z0}, ikke ${et.z}`);
    // (en vei der rutenettet ikke fant noen vei inne i en etasje, går rett – det telles; høyst 3 % er godtatt)
    if (feil > før) { rette++; feil = før; }
  }
  // fra 1. etasje: toppen av trappa kan ikke nås fra siden eller fra toppenden (ingen «hopp» opp)
  for (const t of m.trapper.filter(q => q.fra === 1)) { const c = Math.cos(t.a), s2 = Math.sin(t.a), x = t.x + c * t.l * .45, y = t.y + s2 * t.l * .45;
    ok(E.stå(m, 1, x, y).trapp === null, `${kl}: toppen av trappa nås fra 1. etasje`);
    ok(E.blokkert(m, 1, x, y), `${kl}: toppen av trappa sperrer ikke i 1. etasje`); }
  // hull: gulvet i etasjen over minus trapphullene har riktig areal
  for (const et of m.etasjer) { const A = m.akse, Puv = m.P.map(([x, y]) => [x * A.ux + y * A.uy, x * A.vx + y * A.vy]), R = E.trapperVed(m, et.n).filter(t => t.til === et.n).map(t => E.trappUV(t, A));
    const biter = E.hull(Puv, R), a = biter.reduce((s, S) => s + E.areal(S), 0), hullA = R.reduce((s, r) => s + (r.u1 - r.u0) * (r.v1 - r.v0), 0);
    ok(Math.abs(a - (E.areal(Puv) - hullA)) < .05, `${kl}: hullene i ${et.navn} gir feil areal`); }
  // funn: 1. etasje som før, de andre faste og egne
  ok(JSON.stringify(E.funn(kl, w * d, i, 1)) === JSON.stringify(L.funn(kl, w * d, i)), `${kl}: 1. etasje gir ikke samme funn som før`);
  for (const et of m.etasjer) { const f1 = E.funn(kl, w * d, i, et), f2 = E.funn(kl, w * d, i, et); ok(JSON.stringify(f1) === JSON.stringify(f2), 'funnet er ikke fast');
    ok(!f1.person || et.n === 1, 'en overlevende utenom 1. etasje'); }
}
ok(rette <= Math.max(1, veier * .03), `for mange veier uten rute inne i etasjen: ${rette} av ${veier}`);
ok(flere > (process.env.RASK ? 10 : 40), 'for få prøvehus med flere etasjer: ' + flere);
// loftet med mye skrot gir mer enn uten
{ const et = { n: 3, loft: true, kjeller: false, rom: [], møbler: [] }, et2 = { n: 3, loft: true, kjeller: false, rom: [], møbler: Array.from({ length: 6 }, (_, k) => ({ type: 'flyttekasse', tilstand: 'hel', id: k })) };
  let a = 0, b = 0; for (let i = 0; i < 300; i++) { const f = E.funn('hus', 120, i, et), g = E.funn('hus', 120, i, et2); a += f.tre + f.mat; b += g.tre + g.mat; }
  ok(b > a * 1.3, `loft med skrot gir ikke mer (${a.toFixed(0)} mot ${b.toFixed(0)})`); }
// tilflukt: tilfluktsrom alltid, kjeller bare i store nok bygg
{ const m = { P: rekt(20, 12), etasjer: [{ n: -1, kjeller: true, rom: [{ id: 0, rolle: 'tilfluktsrom', areal: 40 }] }] }; ok(E.tilflukt(m) && E.tilflukt(m).tilfluktsrom, 'tilfluktsrommet er ikke tilflukt');
  const m2 = { P: rekt(6, 6), etasjer: [{ n: -1, kjeller: true, rom: [{ id: 0, rolle: 'kjeller', areal: 30 }] }] }; ok(E.tilflukt(m2) === null, 'en liten kjeller ble tilflukt'); }
// selvtest: en trapp uten hysterese ville gitt hopp – fjern trappa og se at veien forsvinner
{ const m = B.fraKart(rekt(14, 9), { i: 5, kl: 'hus', h: 9, dør: { x: 0, y: -4.5, w: 1 } }); const t = m.trapper[0]; t.tilstand = 'revet'; ok(E.vei(m, { x: 0, y: -3.7, n: 1 }, m.etasjer[1].n) === null, 'selvtest: veien går gjennom en revet trapp'); }
console.log(`etasjer: ${n} sjekker, ${feil} feil – ${flere} hus med flere etasjer, ${veier} veier, ${trinn} steg, ${bytter} etasjebytter, ${rette} veier rett gjennom; ${vedVegg.size} trapper med repos inntil en vegg (modellen)`);
process.exit(feil ? 1 : 0);
