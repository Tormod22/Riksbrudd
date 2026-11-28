/* Riksbrudd – HVERDAGSLYD I LEIREN (ut9-liv2, 28. nov): hunden bjeffer av og til, hammerslag ved byggeplassen i arbeidstida og prat ved
 * kjøkkenet om kvelden. Laget med Web Audio som spill/lyd.js (ingen lydfiler) og koblet inn i lydmotoren derfra (Lyd.motor()):
 * ☰ «Lyd» slår det av, og det høres bare i 3D, dempet etter avstanden fra kameraet. Ingenting av dette påvirker spillet.
 * Reglene øverst uten DOM (test_leirlyd.js): når neste lyd kommer, hvor sterk den er på avstand, og i hvilke timer. Alle tall er Claudes forslag.
 * Tilfeldigheten er en egen frø-basert rekke (ikke Math.random).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // hver = sekunder mellom hver gang [minst, mest], timer = klokka [fra, til], maks = hørbar ut til så mange meter, styrke = topp (0–1)
    bjeff: { hver: [25, 70], timer: [6, 23], maks: 90, styrke: .07, ganger: [1, 3] },
    hammer: { hver: [5, 12], timer: [7, 17.5], maks: 110, styrke: .05, slag: [3, 6], takt: .9 },
    prat: { hver: [3, 8], timer: [17, 21.5], maks: 70, styrke: .035, lengde: [1.2, 2.8] },
  };
  const iTid = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);
  // frø-basert rekke (mulberry32), samme som spill/tilfeldig.js
  function rekke(frø) { let a = frø >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const mellom = ([a, b], r) => a + (b - a) * r();
  // når neste lyd av slaget k kommer (sekunder etter t)
  const neste = (k, t, r) => t + mellom(REGLER[k].hver, r);
  // er det tid for slaget k klokka h?
  const aktiv = (k, h) => iTid(h, REGLER[k].timer);
  // styrken på avstand d (meter): full nær, faller mot 0 ved maks
  const styrke = (k, d) => { const R = REGLER[k], q = Math.max(0, 1 - d / R.maks); return R.styrke * q * q; };
  const api = { REGLER, rekke, neste, aktiv, styrke, mellom };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Leirlyd = api;
  if (typeof window === 'undefined' || typeof KROKER === 'undefined') return;

  // ---------- lydene ----------
  const r = rekke(20261128);
  let ut = null, ac = null, når = { bjeff: 0, hammer: 0, prat: 0 }, antall = { bjeff: 0, hammer: 0, prat: 0 }, sist = { bjeff: 0, hammer: 0, prat: 0 };
  function kobl(M) { if (ac === M.ac && ut) return; ac = M.ac; ut = ac.createGain(); ut.gain.value = 0; ut.connect(M.hoved); når = { bjeff: ac.currentTime + 8, hammer: ac.currentTime + 2, prat: ac.currentTime + 1 }; }
  function støyslag(M, t0, varighet, type, frekv, Q, s) {
    const k = ac.createBufferSource(); k.buffer = M.støy; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekv; f.Q.value = Q;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(s, t0 + .006); g.gain.exponentialRampToValueAtTime(.0004, t0 + varighet);
    k.connect(f); f.connect(g); g.connect(ut); k.start(t0, r() * 3); k.stop(t0 + varighet + .05);
  }
  function tone(t0, varighet, f0, f1, s, form, lav) {
    const o = ac.createOscillator(); o.type = form; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + varighet);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(s, t0 + .01); g.gain.exponentialRampToValueAtTime(.0004, t0 + varighet);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lav || 2000; o.connect(lp); lp.connect(g); g.connect(ut); o.start(t0); o.stop(t0 + varighet + .05);
  }
  // en hund som bjeffer 1–3 ganger
  function bjeff(M, t0, s) { const n = Math.round(mellom(REGLER.bjeff.ganger, r)); for (let i = 0; i < n; i++) { const t = t0 + i * (.24 + r() * .1), f = 520 + r() * 160;
    tone(t, .13, f, f * .62, s, 'sawtooth', 1700); støyslag(M, t, .1, 'bandpass', 1000, 1.4, s * .7); } }
  // hammerslag: et skarpt slag og en dump klang, i en rekke
  function hammer(M, t0, s) { const n = Math.round(mellom(REGLER.hammer.slag, r)); for (let i = 0; i < n; i++) { const t = t0 + i * REGLER.hammer.takt * (.85 + r() * .3);
    støyslag(M, t, .06, 'bandpass', 2400 + r() * 600, 3, s); tone(t, .09, 190, 95, s * .8, 'sine'); } }
  // prat: korte stavelser (filtrert støy) i to stemmer, en setning på 1–3 sekunder
  function prat(M, t0, s) { let t = t0; const slutt = t0 + mellom(REGLER.prat.lengde, r), lys = r() < .5;
    while (t < slutt) { const d = .08 + r() * .13, f = (lys ? 480 : 300) + r() * 260; støyslag(M, t, d, 'bandpass', f, 5, s * (.6 + r() * .4)); t += d + .03 + r() * (r() < .15 ? .35 : .09); } }

  // ---------- hvor lydene kommer fra, og når ----------
  function steder() {
    const L = window.LeirSpill && LeirSpill.tilstand(), S = window.OppstartSpill && OppstartSpill.tilstand(), lr = S && S.leir; if (!L || !lr || !window.Leir) return null;
    const nær = L.bygg.filter(b => b.x !== undefined && Leir.BYGG[b.type] && !Leir.BYGG[b.type].linje && Math.hypot(b.x - lr.x, b.y - lr.y) < 200);
    const F = window.FolkSpill && FolkSpill.tilstand(), byggere = F ? F.personer.filter(p => p.oppgave === 'bygg' && !p.borte).length : 0;
    const plass = byggere ? nær.find(b => Leir.ferdig ? !Leir.ferdig(b) : b.igjen > 0) : null, kj = nær.find(b => b.type === 'kjøkken' && (Leir.ferdig ? Leir.ferdig(b) : !(b.igjen > 0)));
    const H = window.Leirliv3d ? Leirliv3d.hunder() : [];
    return { bjeff: H.length ? [H[0].x, H[0].y] : null, hammer: plass ? [plass.x, plass.y] : null, prat: kj ? [kj.x, kj.y] : [lr.x, lr.y] };
  }
  const SPILL = { bjeff, hammer, prat };
  KROKER.ramme3d.push(R => {
    const M = window.Lyd && Lyd.motor ? Lyd.motor() : null; if (!M || !R.ut || !R.cam) return; kobl(M);
    const vis = typeof på3d !== 'undefined' && på3d && !document.hidden && (!Lyd.på || Lyd.på()); ut.gain.setTargetAtTime(vis ? 1 : 0, ac.currentTime, .3); if (!vis) return;
    const nå = ac.currentTime, h = ((((6 + (typeof tid !== 'undefined' ? tid : 0) / 60) % 24) + 24) % 24), u = R.ut, cx = R.cam.position.x + u.cx, cy = R.cam.position.y + u.cy, cz = R.cam.position.z;
    let St = null;
    for (const k of ['bjeff', 'hammer', 'prat']) { if (nå < når[k]) continue; når[k] = neste(k, nå, r); if (!aktiv(k, h) || (typeof tempo !== 'undefined' && tempo <= 0)) continue;
      St = St || steder(); const p = St && St[k]; if (!p) continue; const d = Math.hypot(p[0] - cx, p[1] - cy, Math.max(0, cz - ((typeof hoyde3d === 'function' ? hoyde3d(p[0], p[1], u) : u.h0) - u.h0) * (R.EX || 1))), s = styrke(k, d); if (s < .0005) continue;
      SPILL[k](M, nå + .02, s); antall[k]++; sist[k] = d; }
  });
  window.LeirlydSpill = { antall: () => ({ ...antall }), sist: () => ({ ...sist }), steder, nullstill: () => { if (ac) når = { bjeff: ac.currentTime, hammer: ac.currentTime, prat: ac.currentTime }; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
