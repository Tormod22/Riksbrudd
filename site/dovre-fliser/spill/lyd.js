'use strict';
// LYD I 3D (12. nov, brukeren: «fortsett å forbedre»): spillet hadde ingen lyd. Alt lages i nettleseren med Web Audio (ingen lydfiler):
// vind (sterkere i kast og høyt oppe, plystring i storm), bølger og brenninger ved sjøen (skvulp ved innsjøer), regn, torden etter lynet,
// fuglesang om dagen i skog og kratt (ikke om vinteren eller i regn), måker ved sjøen, bylyd (dur av trafikk) nær husene, og fottrinn når du
// går (grus/asfalt knaser, gress er mykt, snø knirker). Bare i 3D; ☰ «Lyd» slår av/på (localStorage «riksbrudd-lyd»). Nettleseren tillater
// lyd først etter et trykk eller en tast, så lyden starter da.
// Reglene (hvor sterk hver lyd er) står øverst uten DOM: Lyd.nivåer(t) – test: node pipeline/fliser/test_lyd.js.
(function (rot) {
  const trinn = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  // t: { vind (m/s), høyde (m over bakken), hav (0–1 andel sjø nær), innsjø (0–1), regn (0–1), snø (0–1), mørke (0–1), årstid, skog (0–1), by (0–1) }
  function nivåer(t) {
    const oppe = trinn(20, 400, t.høyde || 0), stille = 1 - Math.max(t.regn || 0, (t.snø || 0) * .6);
    const v = t.vind || 0, vind = Math.min(1, .05 + trinn(.5, 16, v) * .8 + oppe * .2);
    const vinter = t.årstid === 'vinter', dag = 1 - trinn(.25, .7, t.mørke || 0);
    // inne i et hus (t.inne, spill/interior3d.js) er alt utenfra dempet; regnet høres på taket
    const ute = t.inne ? .25 : 1;
    return {
      vind: vind * ute, plyst: trinn(10, 20, v) * (.6 + .4 * oppe),
      // bølger: høres bare nær sjøen og lavt, sterkere når det blåser
      hav: ute * (t.hav || 0) * (1 - trinn(60, 400, t.høyde || 0)) * (.35 + .65 * trinn(1, 14, v)),
      innsjø: ute * (t.innsjø || 0) * (1 - trinn(30, 200, t.høyde || 0)) * (.25 + .35 * trinn(1, 10, v)),
      // (R18-F) tettstedene er tomme etter kollapsen (t.tomt): bare et svakt sus igjen av bylyden
      regn: (t.inne ? .6 : 1) * (t.regn || 0) * (1 - oppe * .5), by: ute * (t.by || 0) * (1 - oppe) * (.5 + .5 * dag) * (t.tomt ? .15 : 1),
      // (R18-F) vind i et knust vindu i et forlatt hus (t.glipe): en svak tone som stiger med vinden
      glipe: t.inne && t.glipe ? trinn(2, 14, v) : 0,
      // fugler: om dagen, ikke om vinteren, ikke i regn/sterk vind, mest i skog og kratt
      fugler: vinter ? 0 : (t.inne ? .12 : 1) * dag * stille * (1 - trinn(8, 14, v)) * (1 - oppe) * (.25 + .75 * Math.max(t.skog || 0, (1 - (t.by || 0)) * .4)) * (t.årstid === 'høst' ? .4 : 1),
      måker: ute * dag * (t.hav || 0) * (1 - oppe) * (1 - trinn(10, 16, v)) * (vinter ? .5 : 1),
    };
  }
  // fottrinn: underlaget gir lyden; takten etter farten (gå ca. 1,8 skritt/s, løp ca. 2,8)
  function skritt(fart) { return fart < .35 ? 0 : Math.min(3.2, 1.2 + fart * .32); }
  const Lyd = { nivåer, skritt, trinn };
  if (typeof module !== 'undefined') { module.exports = Lyd; return; }
  rot.Lyd = Lyd;

  // ---------- lydmotoren ----------
  // (Ø4, 28. nov) hoved = alt (☰ «Lyd» av/på, stille når fanen er skjult); ut = 3D-lydene rundt kameraet (av i 2D). Lydene i 2D
  // (spill/lyd2d.js) har egne kanaler inn i hoved – se Lyd.motor().
  let ac = null, hoved = null, ut = null, måler = null, kan = {}, støy = null, brun = null, på = true, startet = false;
  try { på = localStorage.getItem('riksbrudd-lyd') !== 'av'; } catch (e) { /* privat vindu */ }
  function lagStøy(brunt) {
    const n = ac.sampleRate * 4, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let s = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brunt) { s = (s + .02 * w) / 1.02; d[i] = s * 3.5; } else d[i] = w; }
    return b;
  }
  // en vedvarende kanal: støy -> filter -> forsterker (0 til å begynne med)
  function kanal(navn, type, frekv, Q, brunt) {
    const k = ac.createBufferSource(); k.buffer = brunt ? brun : støy; k.loop = true; k.loopStart = Math.random() * 2;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekv; f.Q.value = Q;
    const g = ac.createGain(); g.gain.value = 0; k.connect(f); f.connect(g); g.connect(ut); k.start(0, Math.random() * 3);
    kan[navn] = { f, g };
  }
  function start() {
    if (startet) { if (ac && ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    startet = true; hoved = ac.createGain(); hoved.gain.value = på ? 1 : 0; hoved.connect(ac.destination);
    ut = ac.createGain(); ut.gain.value = typeof på3d !== 'undefined' && på3d ? 1 : 0; ut.connect(hoved);
    // måler (testene leser lydstyrken med Lyd.sjekk().rms) – på hovedkanalen, så den måler både 3D og 2D
    måler = ac.createAnalyser(); måler.fftSize = 2048; hoved.connect(måler);
    støy = lagStøy(false); brun = lagStøy(true);
    kanal('vind', 'bandpass', 420, .7); kanal('plyst', 'bandpass', 1300, 9); kanal('hav', 'lowpass', 520, .5, true); kanal('bølge', 'lowpass', 900, .4);
    kanal('glipe', 'bandpass', 950, 11); kanal('innsjø', 'bandpass', 700, 1.2); kanal('regn', 'highpass', 1800, .3); kanal('regnLav', 'lowpass', 900, .4); kanal('by', 'lowpass', 160, .6, true);
  }
  // korte lyder: støyslag (fottrinn, torden) og fløytetoner (fugler, måker)
  let sistInne = null;
  function slag(t0, varighet, type, frekv, Q, styrke, brunt, opp) {
    const k = ac.createBufferSource(); k.buffer = brunt ? brun : støy; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekv; f.Q.value = Q;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(styrke, t0 + (opp || .006)); g.gain.exponentialRampToValueAtTime(.0005, t0 + varighet);
    k.connect(f); f.connect(g); g.connect(ut); k.start(t0, Math.random() * 3); k.stop(t0 + varighet + .05); return f;
  }
  function tone(t0, varighet, f0, f1, styrke, form) {
    const o = ac.createOscillator(); o.type = form || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + varighet);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(styrke, t0 + .012); g.gain.exponentialRampToValueAtTime(.0005, t0 + varighet);
    let siste = g; if (form === 'sawtooth') { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; g.connect(lp); siste = lp; }
    o.connect(g); siste.connect(ut); o.start(t0); o.stop(t0 + varighet + .05);
  }
  // fuglesang: tre slags «fugler» (fløytende trost, tittende meis, trillende småfugl), plassert litt til venstre/høyre er unødvendig
  function fugl(t0, s) {
    const art = Math.random();
    if (art < .35) { let t = t0; const n = 3 + Math.floor(Math.random() * 4), b = 1800 + Math.random() * 900; for (let i = 0; i < n; i++) { const a = b * (1 + (Math.random() - .5) * .5); tone(t, .12 + Math.random() * .12, a, a * (.8 + Math.random() * .5), s * .5); t += .15 + Math.random() * .12; } }
    else if (art < .7) { let t = t0; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { tone(t, .07, 5200, 4600, s * .35); tone(t + .1, .09, 3900, 3700, s * .35); t += .28; } }
    else { let t = t0; const n = 8 + Math.floor(Math.random() * 10), a = 3500 + Math.random() * 1500; for (let i = 0; i < n; i++) { tone(t, .04, a, a * 1.15, s * .25); t += .055; } }
  }
  function måke(t0, s) { let t = t0; const n = 2 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) { tone(t, .22, 1100, 750, s * .3, 'sawtooth'); t += .26 + Math.random() * .1; } }
  function torden(t0, s) {
    slag(t0, .35, 'bandpass', 900, .8, s * .5); const f = slag(t0 + .05, 4.5 + Math.random() * 2, 'lowpass', 220, .7, s * 1.4, true, .25);
    f.frequency.setValueAtTime(260, t0); f.frequency.exponentialRampToValueAtTime(70, t0 + 5);
  }
  function fottrinn(t0, und, s) {
    if (und === 'grus') { slag(t0, .11, 'bandpass', 2600 + Math.random() * 900, .9, s * .55); slag(t0 + .02, .08, 'highpass', 4500, .5, s * .25); }
    else if (und === 'snø') { slag(t0, .16, 'bandpass', 1500 + Math.random() * 400, 2.5, s * .5); }
    else if (und === 'asfalt') slag(t0, .07, 'lowpass', 900, .7, s * .55);
    // gulv inne: en dump lyd med litt klang, og et lite klikk fra hælen
    else if (und === 'gulv') { slag(t0, .1, 'lowpass', 340 + Math.random() * 120, 1.6, s * .6); slag(t0 + .01, .03, 'bandpass', 1900, 1.2, s * .12); }
    else slag(t0, .13, 'lowpass', 650 + Math.random() * 300, .6, s * .45);
  }

  // ---------- omgivelsene rundt kameraet (fra utsnittet; vannet leses én gang per utsnitt) ----------
  let vann = null, vannU = null;
  function lesVann(u) {
    vannU = u; vann = null; if (!u.vann || !u.vann.getContext) return;
    const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(u.vann, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data; vann = new Uint8Array(n * n); for (let k = 0; k < n * n; k++) vann[k] = d[k * 4] > 127 ? 1 : 0;
  }
  const RING = []; for (let r of [25, 60, 110, 170]) for (let k = 0; k < 12; k++) RING.push([Math.cos(k / 12 * 6.283) * r, Math.sin(k / 12 * 6.283) * r, r]);
  function omgivelser(R) {
    const u = R.ut, c = R.cam.position; if (vannU !== u) lesVann(u);
    let hav = 0, innsjø = 0, skog = 0, by = 0, nS = 0, n = 0;
    const B = u.bunn;
    for (const [dx, dy, r] of RING) { const x = c.x + dx, y = c.y + dy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) continue; n++;
      const vekt = r < 70 ? 1 : .6;
      if (vann) { const i = Math.floor((x + u.S) / (2 * u.S) * 128), j = Math.floor((u.S - y) / (2 * u.S) * 128);
        if (i >= 0 && j >= 0 && i < 128 && j < 128 && vann[j * 128 + i]) { if (hoyde3d(x + u.cx, y + u.cy, u) < 1.2) hav += vekt; else innsjø += vekt; } }
      if (B) { const i = Math.floor((x + u.S) / (2 * u.S) * B.W), j = Math.floor((u.S - y) / (2 * u.S) * B.W); if (i >= 0 && j >= 0 && i < B.W && j < B.W && B.gress[j * B.W + i] === 2) skog += vekt; }
      if (r <= 110 && u.hus && typeof nærHus === 'function') { nS++; if (nærHus(u, x, y)) by++; } }
    n = Math.max(1, n);
    return { hav: Math.min(1, hav / n * 2.2), innsjø: Math.min(1, innsjø / n * 2.2), skog: Math.min(1, skog / n * 1.6), by: nS ? Math.min(1, by / nS * 3) : 0 };
  }

  // ---------- hver ramme ----------
  // (R18-F) FORLATTE STEDER: inne i et forlatt hus – stillhet, knirk, en klokke som tikker, et rør som drypper (Spor.lydInne per hus);
  // ute i et tomt tettsted – ingen bylyd, en hund som gjør langt unna, en dør som slår i vinden. Diskret: lave nivåer, sjeldne lyder.
  let nesteKnirk = 0, nesteTikk = 0, nesteDrypp = 0, nesteHund = 0, nesteDør = 0, husLyd = null, husFor = null;
  function knirk(t0, s) { tone(t0, .45 + Math.random() * .4, 210 + Math.random() * 90, 150 + Math.random() * 40, s * .02, 'sawtooth'); slag(t0 + .05, .3, 'bandpass', 600, 4, s * .05); }
  function tikk(t0, s) { slag(t0, .015, 'highpass', 3500, .7, s * .05); }
  function drypp(t0, s) { tone(t0, .08, 1500 + Math.random() * 500, 650, s * .03); }
  function hund(t0, s) { let t = t0; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { tone(t, .13, 480 + Math.random() * 60, 300, s * .02, 'sawtooth'); slag(t, .12, 'lowpass', 700, 1, s * .04); t += .32 + Math.random() * .25; } }
  function dørSlag(t0, s) { slag(t0, .3, 'lowpass', 170, 1.3, s * .18, true); slag(t0 + .02, .07, 'bandpass', 900, 1.2, s * .05); }
  let sistMål = 0, om = { hav: 0, innsjø: 0, skog: 0, by: 0 }, nesteFugl = 0, nesteMåke = 0, sistLyn = 0, sistPos = null, steg = 0, sistT = 0, bølgeFase = 0;
  const NV = {};
  KROKER.ramme3d.push(R => {
    if (!startet || !ac || !R.ut) return;
    const nå = ac.currentTime, t = performance.now() / 1000, dt = Math.min(.2, t - (sistT || t)); sistT = t;
    const V = window.VAER || {}, VI = window.Vind3d ? Vind3d.VIND : { fart: 3 }, c = R.cam.position, u = R.ut;
    if (t - sistMål > .5) { sistMål = t; om = omgivelser(R); }
    const høyde = c.z - ((hoyde3d(c.x + u.cx, c.y + u.cy, u) - u.h0) * R.EX);
    const huset = R.fot && window.Interior3d ? Interior3d.inne(c.x, c.y) : null;
    if (huset !== husFor) { husFor = huset; husLyd = huset && !huset.leir && huset.bygg && window.Spor ? Spor.lydInne(huset.bygg.kl, huset.bygg.i) : null; }
    const N = nivåer({ vind: VI.fart, høyde, hav: om.hav, innsjø: om.innsjø, regn: V.regn || 0, snø: V.snø || 0, mørke: window.NATT ? NATT.mørke : 0, årstid: V.årstid, skog: om.skog, by: om.by, inne: !!huset, tomt: !!window.Spor, glipe: !!(husLyd && husLyd.glipe) });
    Object.assign(NV, N, { omgivelser: om, høyde });
    const sett = (k, v, tid) => kan[k].g.gain.setTargetAtTime(v, nå, tid || .4);
    sett('vind', N.vind * .32); kan.vind.f.frequency.setTargetAtTime(280 + 500 * Math.min(1, (VI.fart || 0) / 16) * (VI.kast || 1), nå, .6);
    sett('plyst', N.plyst * .05); kan.plyst.f.frequency.setTargetAtTime(1100 + 500 * (VI.kast || 1), nå, .8);
    // bølgene kommer inn i drag: en langsom puls (ca. 6–9 s) med brenning på toppen
    bølgeFase += dt * 2 * Math.PI / (9 - Math.min(3, (VI.fart || 0) / 4)); const puls = Math.pow(.5 + .5 * Math.sin(bølgeFase), 2.2);
    sett('hav', N.hav * (.25 + .35 * puls), .3); sett('bølge', N.hav * .22 * puls, .25); sett('innsjø', N.innsjø * (.05 + .05 * Math.sin(t * 2.3) ** 2), .2);
    sett('regn', N.regn * .16); sett('regnLav', N.regn * .1); sett('by', N.by * .22); sett('glipe', N.glipe * .03, .8); kan.glipe.f.frequency.setTargetAtTime(850 + 300 * (VI.kast || 1), nå, 1.2);
    // (R18-F) lydene i forlatte hus og tomme tettsteder
    if (husLyd) { if (nå > nesteKnirk) { if (nesteKnirk) knirk(nå + .05, 1); nesteKnirk = nå + husLyd.knirk[0] + Math.random() * (husLyd.knirk[1] - husLyd.knirk[0]); }
      if (husLyd.klokke && nå > nesteTikk) { tikk(nå + .02, 1); nesteTikk = Math.max(nå, nesteTikk) + 1; }
      if (husLyd.drypp && nå > nesteDrypp) { drypp(nå + .02, 1); nesteDrypp = nå + 1.4 + Math.random() * 2.6; } NV.inneLyd = husLyd; }
    else { nesteKnirk = nå + 6; NV.inneLyd = null;
      if (R.fot && om.by > .25 && window.Spor) { const SL = Spor.REGLER.lyd;
        if (nå > nesteHund) { if (nesteHund) { hund(nå + .05, 1); NV.hund = (NV.hund || 0) + 1; } nesteHund = nå + SL.hund[0] + Math.random() * (SL.hund[1] - SL.hund[0]); }
        if ((VI.fart || 0) > SL.dørVind && nå > nesteDør) { if (nesteDør) { dørSlag(nå + .05, 1); NV.dørSlag = (NV.dørSlag || 0) + 1; } nesteDør = nå + SL.dør[0] + Math.random() * (SL.dør[1] - SL.dør[0]); } } }
    if (N.fugler > .02 && nå > nesteFugl) { fugl(nå + .05, Math.min(1, N.fugler) * .5); nesteFugl = nå + (2 + Math.random() * 7) / (.3 + N.fugler); }
    if (N.måker > .05 && nå > nesteMåke) { måke(nå + .05, N.måker * .5); nesteMåke = nå + 6 + Math.random() * 18; }
    // torden 1–5 s etter lynet (lyden går 340 m/s)
    const lyn = window.NATT ? NATT.lyn : 0; if (lyn > .8 && t - sistLyn > 1) { sistLyn = t; torden(nå + 1 + Math.random() * 4, .6); }
    // fottrinn når du går
    if (R.fot && sistPos) { const fart = Math.hypot(c.x - sistPos.x, c.y - sistPos.y) / Math.max(.001, dt), takt = skritt(fart);
      if (takt) { steg += dt * takt; if (steg >= 1) { steg -= 1; const x = c.x, y = c.y;
        const inne = window.Interior3d && Interior3d.inne(x, y);
        const und = inne ? 'gulv' : V.årstid === 'vinter' || (V.snøgrense != null && V.snøgrense < c.z + u.h0) ? 'snø' : u.påVeg && u.påVeg(x, y) ? (u.vegType ? u.vegType(x, y) : 'grus') : 'gress';
        fottrinn(nå + .01, und, Math.min(1, .5 + fart * .1)); NV.sisteSkritt = und; } } else steg = .7; }
    // døra: en liten knirk og et dunk når du går inn i eller ut av et hus
    { const inneNå = !!(R.fot && window.Interior3d && Interior3d.inne(c.x, c.y)); if (sistInne !== null && inneNå !== sistInne) { tone(nå + .01, .22, 420, 300, .035, 'triangle'); slag(nå + .2, .12, 'lowpass', 260, 1.4, .3, true); NV.dør = (NV.dør || 0) + 1; } sistInne = R.fot ? inneNå : null; }
    sistPos = { x: c.x, y: c.y };
  });
  // 2D: lyden tones ned (spillet viser kartet), og den hviler når fanen er skjult
  setInterval(() => { if (!ac || !ut) return; hoved.gain.setTargetAtTime(på && !document.hidden ? 1 : 0, ac.currentTime, .3);
    ut.gain.setTargetAtTime(typeof på3d !== 'undefined' && på3d ? 1 : 0, ac.currentTime, .3); }, 250);
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, () => { if (på) start(); }, { passive: true });

  // ☰ «Lyd»
  const b = document.createElement('button'); b.id = 'vis-lyd';
  const settKnapp = () => { b.textContent = 'Lyd'; b.classList.toggle('av', !på); b.setAttribute('aria-pressed', String(på)); };
  b.onclick = () => { på = !på; try { localStorage.setItem('riksbrudd-lyd', på ? 'på' : 'av'); } catch (e) { /* privat vindu */ } if (på) start(); settKnapp(); };
  settKnapp(); const lm = document.getElementById('lagmeny'); if (lm) lm.appendChild(b);
  Lyd.start = start;
  // (Ø4) lydmotoren for lydene i 2D (spill/lyd2d.js): null før nettleseren har sluppet lyden fram (første trykk)
  Lyd.motor = () => (startet && ac && hoved ? { ac, hoved, støy, brun } : null);
  Lyd.på = () => på;
  const rms = () => { if (!måler) return 0; const d = new Float32Array(måler.fftSize); måler.getFloatTimeDomainData(d); let q = 0, m = 0; for (const v of d) { q += v * v; m = Math.max(m, Math.abs(v)); } return { rms: Math.sqrt(q / d.length), topp: m }; };
  Lyd.sjekk = () => ({ ...rms(), startet, tilstand: ac ? ac.state : null, kanaler: Object.keys(kan).length, på, nivå: { ...NV } });
})(typeof globalThis !== 'undefined' ? globalThis : this);
