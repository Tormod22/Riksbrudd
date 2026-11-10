/* Vær og årstider: regler uten DOM (Node: require('./vaer'); nettleser: globalThis.Vaer).
 * Årstiden velges i ☰ (sommer ved start). Været skifter av seg selv hver 1–4 spilltime etter årstidens sannsynligheter,
 * eller låses i menyen. Været gir sikt (faktor på lagenes siktvidde), dis (faktor på 3D-disen), skydekke og nedbør.
 * Snø på bakken over en snøgrense som følger årstiden; i snøvær faller snøgrensen ned i dalen. Tallene er forslag.
 */
(function (rot) {
  'use strict';
  // regn/snø: nedbør (0–1), vind: ekstra vind (m/s), dt: tåke i dalbunnen om morgenen (faktor), dh: tåke i dalen hele dagen
  const VÆR = {
    klart: { navn: 'Klart', sikt: 1, dis: 1, sky: .1, nedbør: null, vind: 0, dt: 1, dh: 0 },
    skyet: { navn: 'Skyet', sikt: .95, dis: .75, sky: .8, nedbør: null, vind: 1.5, dt: .6, dh: 0 },
    regn: { navn: 'Regn', sikt: .7, dis: .4, sky: 1, nedbør: 'regn', vind: 4, dt: .2, dh: 0 },
    snø: { navn: 'Snø', sikt: .55, dis: .3, sky: 1, nedbør: 'snø', vind: 3, dt: 0, dh: 0 },
    tåke: { navn: 'Tåke', sikt: .3, dis: .1, sky: .6, nedbør: null, vind: -2, dt: 1, dh: .85 },
    // storm (12. nov, brukeren: «legg til bølger, vind og tåke»): kuling med regn (snø om vinteren), store bølger og skum på sjøen
    storm: { navn: 'Storm', sikt: .6, dis: .45, sky: 1, nedbør: 'regn', vind: 10, dt: 0, dh: 0 },
  };
  // dag: dagen i året spillet går på; snøgrense i moh.; temp: [natt, dag] i dalen (Dombås, ca. 650 moh.); vær: sannsynligheter;
  // fukt: hvor lett det blir morgentåke i dalen; nordlys: andelen klare netter med nordlys
  const ÅRSTIDER = {
    vinter: { navn: 'Vinter', dag: 31, snøgrense: -1000, høst: 0, temp: [-16, -6], fukt: .3, nordlys: .4, vær: { klart: .28, skyet: .3, snø: .3, tåke: .07, storm: .05 } },
    vår: { navn: 'Vår', dag: 125, snøgrense: 1050, høst: 0, temp: [-2, 9], fukt: .55, nordlys: .2, vær: { klart: .35, skyet: .35, regn: .15, snø: .07, tåke: .08 } },
    sommer: { navn: 'Sommer', dag: 200, snøgrense: 1900, høst: 0, temp: [6, 18], fukt: .4, nordlys: 0, vær: { klart: .45, skyet: .3, regn: .18, tåke: .07 } },
    høst: { navn: 'Høst', dag: 268, snøgrense: 1350, høst: 1, temp: [0, 10], fukt: .85, nordlys: .3, vær: { klart: .27, skyet: .33, regn: .2, snø: .03, tåke: .1, storm: .07 } },
  };
  const REKKE = ['sommer', 'høst', 'vinter', 'vår'], VÆRREKKE = ['auto', 'klart', 'skyet', 'regn', 'snø', 'tåke', 'storm'];
  const FELT = ['sikt', 'dis', 'sky', 'regn', 'snø', 'vind', 'dt', 'dh'];

  // fra: verdiene været skifter fra (blandet), start/varighet: overgangen i spillminutter; styrke: hvor kraftig været er (torden ved kraftig regn)
  function ny(årstid = 'sommer') { return { årstid, vær: 'klart', låst: null, til: 120, fra: null, start: 0, varighet: 0, styrke: .6, våt: 0, sistT: null }; }
  function trekk(vekter, r) { let s = 0; for (const [k, v] of Object.entries(vekter)) { s += v; if (r < s) return k; } return Object.keys(vekter)[0]; }
  const glatt = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const trinn = (a, b, x) => glatt((x - a) / (b - a));
  // Verdiene for én værtype i årstiden (om sommeren faller snøen som regn i dalen)
  function verdier(S, vær) {
    const V = VÆR[vær], å = ÅRSTIDER[S.årstid]; let regn = V.nedbør === 'regn' ? 1 : 0, snø = V.nedbør === 'snø' ? 1 : 0;
    if (snø && å.snøgrense > 700) { snø = 0; regn = 1; }
    if (regn && vær === 'storm' && å.snøgrense < 0) { regn = 0; snø = 1; }
    return { sikt: V.sikt, dis: V.dis, sky: V.sky, regn, snø, vind: V.vind, dt: V.dt, dh: V.dh };
  }
  // Blandingen ved spillminutt t: myk overgang (glatt kurve) fra de gamle verdiene til det nye været over S.varighet minutter.
  function blandet(S, t) {
    const mål = verdier(S, S.vær); if (!S.fra || !S.varighet || t == null) return mål;
    const k = glatt((t - S.start) / S.varighet); if (k >= 1) return mål;
    const ut = {}; for (const f of FELT) ut[f] = S.fra[f] + (mål[f] - S.fra[f]) * k; return ut;
  }
  function skift(S, nytt, t, varighet) { S.fra = t == null ? null : blandet(S, t); S.start = t || 0; S.varighet = varighet; S.vær = nytt; }
  // Ett steg: t i spillminutter. Gir true når været skiftet. Bakken blir våt i regnet (ca. 25 min) og tørker sakte (ca. 2,5 t).
  function steg(S, t, rnd = Math.random) {
    const dt = S.sistT == null ? 0 : Math.max(0, Math.min(600, t - S.sistT)); S.sistT = t;
    const b = blandet(S, t), mål = b.regn * (.55 + .45 * S.styrke);
    S.våt = S.våt < mål ? Math.min(mål, S.våt + dt / 25) : Math.max(mål, S.våt - dt / 150);
    if (S.låst) { if (S.vær === S.låst) return false; skift(S, S.låst, t, 0); return true; }
    if (t < S.til) return false;
    S.til = t + 60 + rnd() * 180; const nytt = trekk(ÅRSTIDER[S.årstid].vær, rnd());
    if (nytt === S.vær) return false;
    skift(S, nytt, t, 45 + rnd() * 45); S.styrke = .35 + rnd() * .65; return true;
  }
  function settÅrstid(S, å, t) { S.årstid = å; S.fra = null; if (!S.låst) { const v = ÅRSTIDER[å].vær; if (!v[S.vær]) { S.vær = 'skyet'; } S.til = t + 30; } }
  // Låst vær fra menyen kommer med en gang (visningen glatter det over noen sekunder)
  function låsVær(S, v) { S.låst = v === 'auto' ? null : v; if (S.låst) { S.vær = S.låst; S.fra = null; } }
  // Høyden over horisonten (grader) for deklinasjon dekl (grader) og timevinkel ω (timer fra sør) på bredde 62,1° N (Dombås)
  function høyde(dekl, ω, bredde = 62.1) {
    const δ = dekl * Math.PI / 180, φ = bredde * Math.PI / 180, w = ω * 15 * Math.PI / 180;
    return Math.asin(Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(w)) * 180 / Math.PI;
  }
  const deklinasjon = dag => 23.44 * Math.sin(2 * Math.PI * (284 + dag) / 365);
  // Solhøyden i grader (bredde 62,1° N = Dombås), dag i året og klokketime (lokal soltid ~ klokka − 0,6 t om sommeren).
  function solHøyde(dag, time, bredde = 62.1) { return høyde(deklinasjon(dag), time - 12.6 - (dag > 85 && dag < 302 ? 1 : 0), bredde); }
  // Månefasen 0–1 (0 = ny, 0,5 = full) for dag i året og klokketime i år 2023 (spillet foregår i 2023). Kjent nymåne 6. jan. 2000 18:14 UTC.
  function måneFase(dag, time = 12, år = 2023) {
    const jd = 2451544.5 + (Date.UTC(år, 0, 1) - Date.UTC(2000, 0, 1)) / 864e5 + (dag - 1) + (time - 1) / 24;
    return (((jd - 2451550.26) / 29.530588853) % 1 + 1) % 1;
  }
  // Månen: fasen, hvor mye av skiva som lyser (0–1), høyden (grader) og hvor mange timer den ligger etter sola på himmelen.
  // Forenklet: månen står fase · 360° øst for sola langs ekliptikken (deklinasjonen som sola har fase · ett år senere).
  function måne(dag, time, år = 2023) {
    const fase = måneFase(dag, time, år), lys = (1 - Math.cos(2 * Math.PI * fase)) / 2, etter = fase * 24.84;
    return { fase, lys, etter, høyde: høyde(deklinasjon(dag + fase * 365.25), time - etter - 12.6 - (dag > 85 && dag < 302 ? 1 : 0)) };
  }
  // Hvor mørkt det er (0 dag – 1 natt) etter solhøyden: overgangen går fra 4° over til 8° under horisonten.
  const mørke = e => trinn(4, -8, e);
  // Andelen lyse vinduer om kvelden og natta (folk legger seg, noen står tidlig opp)
  function vinduAndel(time) {
    const h = ((time % 24) + 24) % 24;
    if (h >= 15 && h < 22.5) return .5; if (h >= 22.5) return .5 - .3 * (h - 22.5) / 1.5;
    if (h < 1.5) return .2 - .08 * h / 1.5; if (h < 5) return .1; if (h < 7.5) return .1 + .3 * (h - 5) / 2.5; return .4 - .3 * Math.min(1, (h - 7.5) / 2);
  }
  // fast tilfeldig tall 0–1 per heltall (samme natt gir samme svar)
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // Nordlys (0–1): bare noen klare netter i den mørke årstiden, sterkest rundt kl. 23
  function nordlys(årstid, dagNr, time, e, sky) {
    const å = ÅRSTIDER[årstid]; if (!å.nordlys || hash(dagNr * 3 + REKKE.indexOf(årstid)) > å.nordlys) return 0;
    const fra23 = Math.abs((((time - 23) % 24) + 36) % 24 - 12);
    return (.55 + .45 * hash(dagNr + 99)) * (1 - trinn(1.5, 4.5, fra23)) * trinn(-8, -14, e) * (1 - trinn(.35, .75, sky));
  }
  // Vinden (m/s, retningen den blåser MOT som vinkel i kartet: 0 = øst, π/2 = nord) skifter sakte med tiden og etter været
  function vind(t, ekstra) {
    const fart = Math.max(.3, 2.6 + 1.8 * Math.sin(t / 377) + .9 * Math.sin(t / 131 + 1) + ekstra);
    return { fart, retning: .45 + .7 * Math.sin(t / 911) + .3 * Math.sin(t / 263 + 2) };
  }
  // Det som visningen trenger: sikt, dis, sky, nedbør, snøgrense (moh.), høstfarge (0–1), temperatur i dalen (°C). Med t (spillminutter)
  // blandes været mykt mellom to værtyper; ellers verdiene til været slik det står nå.
  function tilstand(S, time, t) {
    const V = VÆR[S.vær], Å = ÅRSTIDER[S.årstid], b = blandet(S, t);
    const nedbør = b.regn >= .5 ? 'regn' : b.snø >= .5 ? 'snø' : null, snøgrense = Å.snøgrense + (Math.min(Å.snøgrense, 300) - Å.snøgrense) * b.snø;
    const døgn = .5 - .5 * Math.cos((time - 3) / 24 * 2 * Math.PI), temp = Math.round(Å.temp[0] + (Å.temp[1] - Å.temp[0]) * døgn - 2 * trinn(.6, .8, b.sky));
    const dagNr = t == null ? 0 : Math.floor((6 + t / 60) / 24), morgen = trinn(3, 5, time) * (1 - trinn(8.5, 11, time));
    const dalTåke = Math.min(1, Math.max(b.dh, morgen * Å.fukt * b.dt * 1.15));
    const torden = b.regn * (S.styrke > .72 ? 1 : 0) * ({ sommer: 1, høst: .5, vår: .3 }[S.årstid] || 0);
    return { vær: S.vær, navn: V.navn, årstid: S.årstid, årstidNavn: Å.navn, dag: Å.dag, dato: Å.dag + dagNr, dagNr, sikt: b.sikt, dis: b.dis, sky: b.sky, nedbør,
      regn: b.regn, snø: b.snø, snøgrense, høst: Å.høst, temp, vind: vind(t || 0, b.vind), våt: S.våt || 0, dalTåke, torden, styrke: S.styrke };
  }
  const api = { VÆR, ÅRSTIDER, REKKE, VÆRREKKE, ny, steg, settÅrstid, låsVær, solHøyde, tilstand, blandet, måneFase, måne, mørke, vinduAndel, nordlys, vind, trinn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Vaer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
