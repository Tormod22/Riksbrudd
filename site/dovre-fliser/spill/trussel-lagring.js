/* Riksbrudd – LAGRING AV ET ANGREP SOM ER I GANG (runde 5, 18.–19. nov, pakke «balanse»). Gjennomspillingen fant: «last på nytt
 * midt i et angrep fjerner røverne» (lagring.js lagrer ikke røverlagene, og spillet-visning.js lot da bølgen begynne på nytt).
 * Nå lagres røverlagene – hvor de er, mennene og helsa, bølgenummeret, hvor lenge de har vært inne i leiren og hva de har tatt – og
 * kommer tilbake når siden lastes på nytt. Angrepet fortsetter der det var.
 * Reglene øverst er uten DOM (Node: require('./trussel-lagring'); nettleser: globalThis.TrusselLagring) – test_trussel_lagring.js.
 * Visningen nederst lagrer hvert femte sekund og når siden skjules eller lukkes; spillet-visning.js start() spør
 * TrusselLagring.tilbake(bølge) før den ellers lar bølgen begynne på nytt (som før, når lagringen mangler eller ikke stemmer).
 * localStorage «riksbrudd-angrep» = { leir: 'x,y', d: { versjon, aktiv (bølgen), tid, lag: [...] } } – per leir, som resten.
 */
(function (rot) {
  'use strict';
  const LB = typeof module !== 'undefined' && module.exports ? require('./lagring') : rot.Lagring;
  const VERSJON = 1;
  const tall = (v, reserve = 0) => (Number.isFinite(+v) ? +v : reserve), r1 = v => Math.round(v * 10) / 10;
  // Claudes forslag: lagre hvert femte sekund (som lagring.js), og les ikke et angrep som er eldre enn to spilldøgn – eller lagret mer
  // enn to spilltimer «etter» klokka (verden lagres også hvert femte sekund, og i 600× går det 50 spillminutter på fem sekunder;
  // er klokka langt bak, er det et nytt spill på samme sted)
  const REGLER = { hverMs: 5000, maksAlder: 2 * 1440, framtid: 120 };
  // det angrepet trenger ut over det Lagring.pakkLag tar med
  function pakkEn(e) {
    const d = LB.pakkLag(e);
    d.side = e.side || 'rød'; d.raid = Math.round(tall(e.raid, 0));
    if (e.fra && Number.isFinite(e.fra.x) && Number.isFinite(e.fra.y)) d.fra = { x: r1(e.fra.x), y: r1(e.fra.y) };
    if (e.inne) d.inne = r1(e.inne); if (e.trekker) d.trekker = true; if (e.flykter) d.flykter = true; if (e.venterNatt) d.venterNatt = true;
    if (e.trekkerFra !== undefined && e.trekkerFra !== null) d.trekkerFra = Math.round(tall(e.trekkerFra, 0));
    if (e.bytte) d.bytte = rensBytte(e.bytte);
    return d;
  }
  // byttet (Trussel.bytte): { penger, lager: { tre, betong, stål }, diesel, mat } – bare tall ≥ 0
  function rensBytte(b) {
    const ut = { penger: Math.max(0, Math.round(tall(b && b.penger, 0))), lager: {}, diesel: Math.max(0, r1(tall(b && b.diesel, 0))), mat: Math.max(0, r1(tall(b && b.mat, 0))) };
    if (b && b.lager && typeof b.lager === 'object') for (const [k, v] of Object.entries(b.lager)) if (/^[a-zæøå]+$/.test(k) && tall(v, 0) > 0) ut.lager[k] = r1(tall(v, 0));
    return ut;
  }
  // o: { aktiv (bølgen som pågår, 0 = ingen), tid, lag: [røverlagene – også de som går bort fra en bølge som er over] }
  function pakk(o) {
    return { versjon: VERSJON, aktiv: Math.max(0, Math.round(tall(o.aktiv, 0))), tid: Math.max(0, Math.round(tall(o.tid, 0))),
      lag: (o.lag || []).filter(e => e && e.navn && Array.isArray(e.menn) && Number.isFinite(e.x) && Number.isFinite(e.y)).map(pakkEn) };
  }
  // Leser lagringen for bølgen «aktiv». Ødelagt, ukjent versjon, en annen bølge, eller eldre enn REGLER.maksAlder (o.tid = klokka nå)
  // gir null. Lagene som hører til bølgen (raid === aktiv), og de som gikk bort fra en eldre bølge (raid < 0), kommer med.
  function fraJSON(t, aktiv, o = {}) {
    try { const d = typeof t === 'string' ? JSON.parse(t) : t; if (!d || d.versjon !== VERSJON || !(aktiv > 0) || d.aktiv !== aktiv) return null;
      if (Number.isFinite(o.tid) && Number.isFinite(d.tid) && (o.tid - d.tid > REGLER.maksAlder || d.tid - o.tid > REGLER.framtid)) return null;
      const lag = (Array.isArray(d.lag) ? d.lag : []).filter(q => q && typeof q.navn === 'string' && q.navn && Number.isFinite(q.x) && Number.isFinite(q.y) && Array.isArray(q.menn) && q.menn.length
        && Number.isFinite(q.raid) && (q.raid === aktiv || q.raid < 0) && typeof q.side === 'string' && q.side !== 'blå');
      if (!lag.some(q => q.raid === aktiv)) return null;
      return { aktiv, tid: tall(d.tid, 0), lag };
    } catch (e) { return null; }
  }
  // Setter et nytt lag (fra nyttLag) slik det ble lagret. Står stille til det får ordren på nytt (målLagret = målet for marsjen).
  function brukEn(s, d) {
    LB.brukLag(s, d);
    s.raid = Math.round(tall(d.raid, 0)); s.side = d.side;
    if (d.fra && Number.isFinite(d.fra.x) && Number.isFinite(d.fra.y)) s.fra = { x: d.fra.x, y: d.fra.y };
    s.inne = Math.max(0, tall(d.inne, 0)); s.trekker = !!d.trekker; s.flykter = !!d.flykter; s.venterNatt = !!d.venterNatt;
    if (d.trekkerFra !== undefined) s.trekkerFra = tall(d.trekkerFra, 0);
    if (d.bytte) s.bytte = rensBytte(d.bytte);
    return s;
  }
  const api = { VERSJON, REGLER, pakk, pakkEn, fraJSON, brukEn, rensBytte };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.TrusselLagring = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined' || !LB) return;

  // ---------- visningen ----------
  const NØKKEL = 'riksbrudd-angrep';
  const spill = () => rot.OppstartSpill && OppstartSpill.tilstand();
  const leirId = () => { const S = spill(); return S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : null; };
  const T = () => (rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null);
  let sist = 0, gjenopprettet = 0;
  function lagre() {
    const id = leirId(), t = T(); if (!id || !t) return false;
    const lag = ENHETER.filter(e => e.raid && e.side !== 'blå');
    try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: id, d: pakk({ aktiv: t.aktiv || 0, tid, lag }) })); return true; } catch (e) { return false; }
  }
  function lesLagret() { try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); return o && o.leir === leirId() ? o.d : null; } catch (e) { return null; } }
  // tilbake(aktiv): legger røverlagene i bølgen «aktiv» tilbake i ENHETER. Gir antallet lag i bølgen som kom tilbake (0 = ingenting lagret).
  function tilbake(aktiv) {
    const d = fraJSON(lesLagret(), aktiv, { tid: typeof tid === 'number' ? tid : undefined }); if (!d) return 0;
    const nye = [];
    for (const q of d.lag) { if (ENHETER.some(e => e.navn === q.navn && e.raid)) continue;
      const s = nyttLag(q.navn, q.x, q.y, q.side); brukEn(s, q); ENHETER.push(s); nye.push(s); }
    const n = nye.filter(s => s.raid === aktiv).length; gjenopprettet = n;
    // ordren på nytt når kartet rundt er lastet: de som trakk seg ut eller flyktet, går samme vei ut; de andre fortsetter mot leiren
    setTimeout(() => { const S = spill(); if (!S || !S.leir) return;
      for (const s of nye) { if (!ENHETER.includes(s) || !levende(s)) continue; const m = s.målLagret; delete s.målLagret;
        let X, Y; if ((s.trekker || s.flykter) && s.fra) { X = s.fra.x; Y = s.fra.y; } else if (m) { X = m[0]; Y = m[1]; } else { X = S.leir.x + (Math.random() - .5) * 80; Y = S.leir.y + (Math.random() - .5) * 80; }
        if (Math.hypot(X - s.x, Y - s.y) > 30) { try { const p = ordre(s, X, Y, true); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ruta finnes ikke ennå – angrepSteg sender dem på nytt */ } } }
      skitten = true; }, 1500);
    if (n && !navigator.webdriver) logg(`Angrepet fortsetter: ${n === 1 ? 'ett røverlag' : n + ' røverlag'} i bølge ${aktiv} er fortsatt ved leiren.`);
    skitten = true; return n;
  }
  // lagres hvert femte sekund mens spillet går, og når siden skjules eller lukkes
  KROKER.sim.push(() => { const nå = performance.now(); if (nå - sist < REGLER.hverMs) return; sist = nå; lagre(); });
  rot.addEventListener('pagehide', lagre);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') lagre(); });
  rot.TrusselLagringSpill = { NØKKEL, lagre, tilbake, lesLagret, gjenopprettet: () => gjenopprettet };
})(typeof globalThis !== 'undefined' ? globalThis : this);
