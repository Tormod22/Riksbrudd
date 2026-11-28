/* Riksbrudd – SKAPENE I LEIRENS EGNE BYGG, VISNINGEN (28. nov, ut10-skap). Reglene: spill/leirskap.js og spill/tinglager.js (plassene).
 *  - 3D (Gå): står du ved et skap i et leirbygg (kjøleskap, garderobe, kommode, medisinskap …), kommer knappen «Åpne kjøleskapet (E)».
 *    E / knappen åpner Lageret-panelet på skapets plass (ta med i sekken, flytt, bruk), og døra/lokket står åpent i 3D med tingene som ligger der
 *    (spill/hyller-visning.js skapÅpent -> window.MØBEL_ÅPEN -> interior3d.js). Lukker du panelet (eller trykker E igjen), lukkes døra.
 *  - 2D: zoomet inn (under 0,5 m per punkt) tegnes skapene i leirbyggene som små merker, og trykk på et skap åpner Lageret på plassen.
 *  window.LeirskapSpill: nærmeste(), åpne(pid), skap2d() (skapene i kartets meter), plan(b).
 */
(function () {
  'use strict';
  const S = window.Leirskap, I = window.Interior; if (!S || !I) return;
  // Claudes forslag
  const REGLER = { nær: 1.25, visM: .5, merkeM: .2, trykk: .8 };
  const TS = () => window.TinglagerSpill, L = () => window.LeirSpill && LeirSpill.tilstand();
  const r3 = () => (typeof R3 !== 'undefined' && R3 ? R3 : null);
  const går = () => { const R = r3(); return !!(R && R.fot && typeof på3d !== 'undefined' && på3d && !(window.KjorSpill && KjorSpill.fører && KjorSpill.fører())); };
  const bestemt = n => { const t = (n || '').replace(/ \(.*\)$/, '').replace(/ \d+$/, '').toLowerCase(); return /skap$|boks$/.test(t) ? t + 'et' : /e$/.test(t) ? t + 'n' : t + 'en'; };

  // skapene i et plan: [{ m, pid, k }] (møblene i planens rekkefølge, flyttede hoppes over – som lutens nøkler)
  function skapIPlan(b, pl) { const tel = {}, ut = []; if (!b || !pl || !pl.møbler) return ut;
    for (const m of pl.møbler) { if (m.flyttet) continue; const k = tel[m.type] = (tel[m.type] || 0) + 1; const pid = S.finn(b, m.type, k - 1); if (pid) ut.push({ m, pid, k: k - 1 }); } return ut; }

  // ---------- 3D: skapet du står ved ----------
  function nærmeste() {
    if (!går() || !window.Interior3d) return null; const R = r3(), x = R.bane.x, y = R.bane.y, P = Interior3d.inne(x, y); if (!P || !P.leir || !P.inne || !P.bygg) return null;
    const Ls = L(), b = Ls && Ls.bygg.find(q => 9000000 + q.id === P.bygg.i); if (!b) return null; let best = null;
    for (const q of skapIPlan(b, P.inne)) { const av = Math.max(0, Math.hypot(q.m.x - x, q.m.y - y) - Math.max(q.m.b, q.m.d) / 2); if (av <= REGLER.nær && (!best || av < best.av)) best = { ...q, av, b }; }
    if (!best) return null; const P2 = TS() && TS().plasser ? TS().plasser().find(p => p.id === best.pid) : null; if (!P2) return null; best.navn = P2.navn; return best;
  }
  function åpne(pid) { const T = TS(); if (!T || !T.åpne) return false; if (document.pointerLockElement) document.exitPointerLock(); T.åpne(true, pid); return true; }
  function lukk() { const T = TS(); if (T && T.åpne) T.åpne(false, null); }
  const knapp = document.createElement('button'); knapp.id = 'skapknapp'; knapp.type = 'button'; document.body.appendChild(knapp);
  const css = document.createElement('style');
  css.textContent = '#skapknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(200px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:200px; min-height:42px; padding:6px 18px; background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; }'
    + ' #skapknapp.på{ display:block; } body.kort #skapknapp{ bottom:calc(330px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:170px; } body.skapnær #lutknapp{ display:none; }';
  document.head.appendChild(css);
  const grov = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  let her = null;
  function oppdater() { const T = TS(), åpen = T && T.erÅpen && T.erÅpen(); her = !åpen ? nærmeste() : null;
    // (lutens knapp for en hylle ved siden av skjules imens, så E ikke står på to knapper)
    document.body.classList.toggle('skapnær', !!her);
    if (!her) { knapp.classList.remove('på'); return; } const t = `Åpne ${bestemt(her.navn)}${grov() ? '' : ' (E)'}`; if (knapp.textContent !== t) knapp.textContent = t; knapp.classList.add('på'); }
  setInterval(oppdater, 250);
  knapp.addEventListener('click', e => { e.preventDefault(); const q = her || nærmeste(); if (q) { åpne(q.pid); oppdater(); } });
  // E: åpne skapet du står ved, eller lukk det som er åpent (i fangstfasen, før luten og andre taster)
  window.addEventListener('keydown', e => { if ((e.key !== 'e' && e.key !== 'E') || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    const T = TS(), pid = T && T.plass && T.plass();
    if (pid && S.les(pid) && T.erÅpen && T.erÅpen()) { e.preventDefault(); e.stopImmediatePropagation(); lukk(); return; }
    if (!går()) return; const q = nærmeste(); if (!q) return; e.preventDefault(); e.stopImmediatePropagation(); åpne(q.pid); oppdater(); }, true);

  // ---------- 2D: skapene i leirbyggene (planen regnet i kartets meter, som interior3d.js leirbygg gjør i 3D) ----------
  const planer = new Map();
  function plan(b) { const LB = window.Interior3d && Interior3d.LEIRBYGG, T = LB && LB[b.type]; if (!T) return null;
    const nøkkel = [b.id, Math.round(b.x * 10), Math.round(b.y * 10), (b.ret || 0).toFixed(3), b.nivå || 1].join(':'); const h = planer.get(b.id); if (h && h.nøkkel === nøkkel) return h.pl;
    const k = 1 + ((b.nivå || 1) - 1) * .08, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), pk = (lx, ly) => [b.x + (lx * c - ly * s) * k, b.y + (lx * s + ly * c) * k];
    const [x0, x1, y0, y1] = T.r, P = [pk(x0, y0), pk(x1, y0), pk(x1, y1), pk(x0, y1)], d = pk(T.dør[0], T.dør[1]);
    const dør = T.side === 'y+' ? { x: d[0], y: d[1], ux: -c, uy: -s, w: T.w } : { x: d[0], y: d[1], ux: -s, uy: c, w: T.w };
    let pl = null; try { pl = I.plan(P, { i: 9000000 + b.id, kl: T.kl, h: T.H, dør, senger: b.type === 'brakke' && window.Leir && Leir.BYGG.brakke.nivå ? Leir.BYGG.brakke.nivå.plasser[(b.nivå || 1) - 1] : 0 }); } catch (e) { pl = null; }
    planer.set(b.id, { nøkkel, pl }); return pl; }
  // alle skapene i leirbyggene i kartets meter: [{ x, y, a, b, d, type, pid, bygg }]
  function skap2d() { const Ls = L(), ut = []; if (!Ls) return ut;
    for (const b of Ls.bygg) { if (!S.SKAP[b.type] || !(window.Leir && Leir.ferdig(b))) continue; const pl = plan(b); for (const q of skapIPlan(b, pl)) ut.push({ x: q.m.x, y: q.m.y, a: q.m.a, b: q.m.b, d: q.m.d, type: q.m.type, pid: q.pid, bygg: b }); }
    return ut; }
  const BOKSTAV = { kjøleskap: 'K', overskap: 'O', garderobe: 'G', skap: 'S', kommode: 'Ko', skoskap: 'Sk', medisinskap: '+', arkivskap: 'A', verktøyvogn: 'V', tønne: 'T' };
  if (typeof KROKER !== 'undefined') {
    KROKER.tegn.push((g, vx0, vy1) => { if (typeof kam === 'undefined' || kam.m > REGLER.merkeM) return; const m = kam.m, T = TS(), åpen = T && T.plass && T.plass();
      for (const q of skap2d()) { const X = (q.x - vx0) / m, Y = (vy1 - q.y) / m; g.save(); g.translate(X, Y); g.rotate(-q.a); const w = q.b / m, h = q.d / m;
        g.fillStyle = q.pid === åpen ? 'rgba(232,196,106,.9)' : 'rgba(46,40,30,.85)'; g.fillRect(-w / 2, -h / 2, w, h); g.strokeStyle = 'rgba(232,210,150,.8)'; g.lineWidth = 1; g.strokeRect(-w / 2 + .5, -h / 2 + .5, w - 1, h - 1);
        const t = BOKSTAV[q.type]; if (t && Math.min(w, h) > 9) { g.rotate(q.a); g.fillStyle = q.pid === åpen ? '#2a2016' : '#f0e2b0'; g.font = `600 ${Math.min(14, Math.round(Math.min(w, h) * .6))}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, .5); }
        g.restore(); } });
    { const f = KROKER.tegn[KROKER.tegn.length - 1]; f.over = true; f.bygg = true; }
    KROKER.trykk.unshift((X, Y) => { if (typeof kam === 'undefined' || kam.m > REGLER.visM || (typeof på3d !== 'undefined' && på3d)) return false;
      if (window.LeirSpill && LeirSpill.plassering && LeirSpill.plassering()) return false; if (window.Byggesett && Byggesett.tilstand && Byggesett.tilstand().åpen) return false;
      let best = null; for (const q of skap2d()) { const av = Math.max(0, Math.hypot(q.x - X, q.y - Y) - Math.max(q.b, q.d) / 2); if (av <= REGLER.trykk && (!best || av < best.av)) best = { ...q, av }; }
      if (!best) return false; åpne(best.pid); return true; });
  }
  window.LeirskapSpill = { REGLER, nærmeste, åpne, lukk, skap2d, plan, skapIPlan, oppdater };
})();
