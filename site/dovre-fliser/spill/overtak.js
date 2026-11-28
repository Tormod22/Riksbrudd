/* OVERTAK – ta over et hus i kartet (fase B7 i docs/plan-selskap-okonomi.md, kapittel 5.4 «Ta over et hus»; 28. nov, ut5-kampvegger).
 * Regler uten DOM (Node: require('./overtak'); nettleser: window.Overtak). Visningen: spill/husvern-visning.js (huspanelet,
 * plantegningen, kartet, Leir.plasser og lagerplassen).
 *  - Et hus innen REGLER.maksAvstand fra leiren kan tas over og brukes som utpost, lager, verksted eller kaserne.
 *  - Sengene i modellen (seng, køyeseng, dobbeltseng, sykeseng) teller som plasser i leiren; som kaserne også madrasser på gulvet.
 *  - Rom merket lager (lager, bod, garasje, kjeller …) gir lagerplass som rommene i byggesettet (m³ per m²); brukt som lager teller alle rom.
 *  - Endringene i huset (riving, nye åpninger, barrikader) går som før gjennom husendring – modellen regnes ut på nytt med dem.
 * Lagring i visningen: localStorage «riksbrudd-overtak» = { v: 1, leir: 'x,y', hus: { [husnr]: { bruk, tid, senger, lager, navn } } } per leir.
 * Alle tallene her er Claudes forslag (REGLER).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // så langt fra leirens midte et hus kan tas over (meter; samme som hogst og riving)
    maksAvstand: 3000,
    // senger per møbel
    seng: { seng: 1, sykeseng: 1, dobbeltseng: 2, køyeseng: 2 },
    // som kaserne: madrasser på gulvet, én per så mange m² i rom uten senger (ikke bad, kjøkken, gang, trapperom)
    kaserneM2: 8,
    // lagerplass per m² gulv: i rom merket lager, og i alle rom når huset brukes som lager (som byggesettets lagerrom: 0,6)
    lagerM2: .6,
  };
  const BRUK = {
    utpost: { navn: 'Utpost', tekst: 'et sted å holde og forsvare – sengene teller i leiren' },
    lager: { navn: 'Lager', tekst: 'alle rommene er lagerplass' },
    verksted: { navn: 'Verksted', tekst: 'sengene og lagerrommene teller; verkstedet er et sted å bygge om' },
    kaserne: { navn: 'Kaserne', tekst: 'senger og madrasser i alle rommene' },
  };
  const LAGERROM = /lager|bod|garasje|kjeller|tilflukt|fyrrom|loft|låve|uthus/;
  const IKKE_SOVE = /bad|vask|dusj|toalett|kjøkken|gang|trapp|fyrrom|wc/;
  const brukbar = e => e && e.tilstand !== 'revet' && !e.stengt;
  const dekkeHelt = (e, r) => { const f = e.dekke && e.dekke.felt ? e.dekke.felt.find(q => q.rom === r.id) : null; return !f || (f.tilstand !== 'revet' && f.tilstand !== 'rast'); };
  // sengene i huset (bare hele møbler i etasjer som står)
  function senger(m, bruk) {
    if (!m || !m.etasjer) return 0; let n = 0, madrass = 0;
    for (const e of m.etasjer) { if (!brukbar(e)) continue;
      for (const q of e.møbler || []) if (q.tilstand === 'hel' && REGLER.seng[q.type]) n += REGLER.seng[q.type];
      if (bruk === 'kaserne') for (const r of e.rom || []) { if (!dekkeHelt(e, r) || IKKE_SOVE.test(r.rolle || '')) continue;
        const harSeng = (e.møbler || []).some(q => q.tilstand === 'hel' && REGLER.seng[q.type] && inni(r.P, q.x, q.y)); if (!harSeng) madrass += Math.floor((r.areal || 0) / REGLER.kaserneM2); } }
    return n + madrass;
  }
  // lagerplass (m³) i huset
  function lager(m, bruk) {
    if (!m || !m.etasjer) return 0; let A = 0;
    for (const e of m.etasjer) { if (!brukbar(e)) continue; for (const r of e.rom || []) { if (!dekkeHelt(e, r)) continue; if (bruk === 'lager' || LAGERROM.test(r.rolle || '') || (e.kjeller && bruk !== 'kaserne')) A += r.areal || 0; } }
    return Math.round(A * REGLER.lagerM2 * 10) / 10;
  }
  function inni(P, x, y) { if (!P) return false; let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inn = !inn; return inn; }
  // kan huset tas over? avstand = meter fra leiren
  function kanTaOver(avstand, o = {}) {
    if (o.revet) return { ok: false, feil: 'Huset er revet.' };
    if (o.alt) return { ok: false, feil: 'Huset er alt en del av leiren.' };
    if (!(avstand <= REGLER.maksAvstand)) return { ok: false, feil: `Huset er for langt fra leiren (${(avstand / 1000).toFixed(1).replace('.', ',')} km – høyst ${REGLER.maksAvstand / 1000} km).` };
    return { ok: true };
  }
  // summen for alle overtatte hus: { senger, lager, antall }
  function sum(hus) { const u = { senger: 0, lager: 0, antall: 0 }; for (const k of Object.keys(hus || {})) { const h = hus[k]; if (!h) continue; u.antall++; u.senger += +h.senger || 0; u.lager += +h.lager || 0; } u.lager = Math.round(u.lager * 10) / 10; return u; }
  function nyLogg(leir) { return { v: 1, leir: leir || '', hus: {} }; }
  function lesLogg(tekst, leir) { try { const d = JSON.parse(tekst || 'null'); if (d && d.v === 1 && d.leir === (leir || '') && d.hus && typeof d.hus === 'object') return d; } catch (e) { /* ødelagt: start på nytt */ } return nyLogg(leir); }
  const api = { REGLER, BRUK, senger, lager, kanTaOver, sum, nyLogg, lesLogg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Overtak = api;
})(typeof window !== 'undefined' ? window : globalThis);
