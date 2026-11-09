/* Vær og årstider: regler uten DOM (Node: require('./vaer'); nettleser: globalThis.Vaer).
 * Årstiden velges i ☰ (sommer ved start). Været skifter av seg selv hver 1–4 spilltime etter årstidens sannsynligheter,
 * eller låses i menyen. Været gir sikt (faktor på lagenes siktvidde), dis (faktor på 3D-disen), skydekke og nedbør.
 * Snø på bakken over en snøgrense som følger årstiden; i snøvær faller snøgrensen ned i dalen. Tallene er forslag.
 */
(function (rot) {
  'use strict';
  const VÆR = {
    klart: { navn: 'Klart', sikt: 1, dis: 1, sky: .1, nedbør: null },
    skyet: { navn: 'Skyet', sikt: .95, dis: .75, sky: .8, nedbør: null },
    regn: { navn: 'Regn', sikt: .7, dis: .4, sky: 1, nedbør: 'regn' },
    snø: { navn: 'Snø', sikt: .55, dis: .3, sky: 1, nedbør: 'snø' },
    tåke: { navn: 'Tåke', sikt: .3, dis: .1, sky: .6, nedbør: null },
  };
  // dag: dagen i året spillet går på; snøgrense i moh.; temp: [natt, dag] i dalen (Dombås, ca. 650 moh.); vær: sannsynligheter
  const ÅRSTIDER = {
    vinter: { navn: 'Vinter', dag: 31, snøgrense: -1000, høst: 0, temp: [-16, -6], vær: { klart: .3, skyet: .3, snø: .32, tåke: .08 } },
    vår: { navn: 'Vår', dag: 125, snøgrense: 1050, høst: 0, temp: [-2, 9], vær: { klart: .35, skyet: .35, regn: .15, snø: .07, tåke: .08 } },
    sommer: { navn: 'Sommer', dag: 200, snøgrense: 1900, høst: 0, temp: [6, 18], vær: { klart: .45, skyet: .3, regn: .18, tåke: .07 } },
    høst: { navn: 'Høst', dag: 268, snøgrense: 1350, høst: 1, temp: [0, 10], vær: { klart: .3, skyet: .35, regn: .22, snø: .03, tåke: .1 } },
  };
  const REKKE = ['sommer', 'høst', 'vinter', 'vår'], VÆRREKKE = ['auto', 'klart', 'skyet', 'regn', 'snø', 'tåke'];

  function ny(årstid = 'sommer') { return { årstid, vær: 'klart', låst: null, til: 120 }; }
  function trekk(vekter, r) { let s = 0; for (const [k, v] of Object.entries(vekter)) { s += v; if (r < s) return k; } return Object.keys(vekter)[0]; }
  // Ett steg: t i spillminutter. Gir true når været skiftet.
  function steg(S, t, rnd = Math.random) {
    if (S.låst) { if (S.vær === S.låst) return false; S.vær = S.låst; return true; }
    if (t < S.til) return false;
    S.til = t + 60 + rnd() * 180; const nytt = trekk(ÅRSTIDER[S.årstid].vær, rnd());
    if (nytt === S.vær) return false; S.vær = nytt; return true;
  }
  function settÅrstid(S, å, t) { S.årstid = å; if (!S.låst) { const v = ÅRSTIDER[å].vær; if (!v[S.vær]) { S.vær = 'skyet'; } S.til = t + 30; } }
  function låsVær(S, v) { S.låst = v === 'auto' ? null : v; if (S.låst) S.vær = S.låst; }
  // Solhøyden i grader (bredde 62,1° N = Dombås), dag i året og klokketime (lokal soltid ~ klokka − 0,6 t om sommeren).
  function solHøyde(dag, time, bredde = 62.1) {
    const dekl = 23.44 * Math.sin(2 * Math.PI * (284 + dag) / 365) * Math.PI / 180, φ = bredde * Math.PI / 180, ω = (time - 12.6 - (dag > 85 && dag < 302 ? 1 : 0)) * 15 * Math.PI / 180;
    return Math.asin(Math.sin(φ) * Math.sin(dekl) + Math.cos(φ) * Math.cos(dekl) * Math.cos(ω)) * 180 / Math.PI;
  }
  // Det som visningen trenger: sikt, dis, sky, nedbør, snøgrense (moh.), høstfarge (0–1), temperatur i dalen (°C)
  function tilstand(S, time) {
    const V = VÆR[S.vær], Å = ÅRSTIDER[S.årstid];
    let nedbør = V.nedbør, snøgrense = Å.snøgrense;
    if (nedbør === 'snø' && snøgrense > 700) nedbør = 'regn';   // sommer: snøen faller bare på fjellet, i dalen regner det
    if (nedbør === 'snø') snøgrense = Math.min(snøgrense, 300);
    const døgn = .5 - .5 * Math.cos((time - 3) / 24 * 2 * Math.PI), temp = Math.round(Å.temp[0] + (Å.temp[1] - Å.temp[0]) * døgn - (V.sky > .7 ? 2 : 0));
    return { vær: S.vær, navn: V.navn, årstid: S.årstid, årstidNavn: Å.navn, dag: Å.dag, sikt: V.sikt, dis: V.dis, sky: V.sky, nedbør, snøgrense, høst: Å.høst, temp };
  }
  const api = { VÆR, ÅRSTIDER, REKKE, VÆRREKKE, ny, steg, settÅrstid, låsVær, solHøyde, tilstand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Vaer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
