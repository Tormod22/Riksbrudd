'use strict';
/* LYD I 2D (28. nov, fase Ø4 i docs/plan-selskap-okonomi.md, kapittel 15 punkt 5): spill/lyd.js laget bare lyd i 3D, så kritikerne hørte
 * aldri noe – og hele spillet skal kunne spilles i 2D. Denne fila lager lydene i kartet, alt i koden (Web Audio, ingen lydfiler), dempet:
 *  - radio: kort sprak + pip når et av dine lag melder i loggen; et annet sprak (pip først) når du gir en ordre; bare sus uten kontakt;
 *  - alarm ved angrep (hendelsen «riksbrudd-hendelse» med type «alarm»: røverbølgen, forsvaret, krigen) – to toner noen få ganger, aldri i loop;
 *  - kassaapparat når penger kommer inn (kontrakt levert, avtale betalt, salg), et dempet «klunk» ved store utgifter;
 *  - maskinene i leiren når kartet er zoomet inn på leiren: saga (spill/produksjon.js), aggregatet, fyrkjelen – stille når de står;
 *  - telefonen ringer når et viktig kort kommer: «Storlia Tømmer har hørt om dere», en by som ber om hjelp («riksbrudd-by-ber»), og
 *    senere investorer o.l. (hendelsen «riksbrudd-telefon»);
 *  - en svak bakgrunn i 2D etter været: vind og regn lavt, torden langt unna – så kartet ikke er dødt.
 * ☰ → Bilde og lyd: «Lyd» (av/på, som før), «Kartlyd» og «Meldingslyd» (Av / Lav / Middels / Høy, localStorage «riksbrudd-lydnivå»).
 * Nettleseren slipper lyden fram først etter et trykk eller en tast (spill/lyd.js starter motoren da).
 * Reglene (når hvilken lyd, hvor ofte høyst) står øverst uten DOM: Lyd2d.* – test: node pipeline/fliser/test_lyd2d.js.
 * Visningen nederst: Lyd2d.sjekk() (kanaler, nivåer, siste lyder) og Lyd2d.hør(navn) brukes av vakta (pipeline/fliser/vakter/ut3-lyd.js).
 * Lyden endrer aldri spillet. Uten AudioContext (eller før første trykk) regnes og føres lydene likevel, men spilles ikke.
 */
(function (rot) {
  const trinn = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  // REGLER – alt er Claudes forslag
  const REGLER = {
    // korteste tid (sekunder, ekte tid) mellom to like lyder
    minst: { radio: 2.5, ordre: 1.2, stille: 5, alarm: 75, kasse: 5, klunk: 4, telefon: 25, torden: 25 },
    // en radiomelding rett etter en ordre (laget svarer «planlegger rute», «marsj 3 km») høres ikke – ordrelyden er nok
    radioEtterOrdre: 3,
    // høyst så mange radio-, ordre- og pengelyder til sammen per minutt (alarm og telefon telles ikke)
    perMinutt: 10,
    // alarmen: høyst så mange ganger i et vindu (sekunder) – et langt angrep sender mange varsler, sirenen skal ikke gå hele tiden
    alarmVindu: [3, 900],
    // penger: inn fra dette beløpet gir kassaapparat, ut fra dette beløpet gir et klunk (lønn og vedlikehold hver spilltime er mindre)
    kasseFra: 20000, klunkFra: 250000,
    // nivåtrinnene (lydstyrke) og standardvalget
    trinn: { av: 0, lav: .4, middels: .7, høy: 1 },
    trinnNavn: { av: 'Av', lav: 'Lav', middels: 'Middels', høy: 'Høy' },
    rekke: ['av', 'lav', 'middels', 'høy'],
    standard: { kart: 'lav', meld: 'middels' },
    // maskinene høres når kartet er zoomet inn (kam.m meter per punkt): fullt under «helt», borte over «borte», og leiren er nær midten
    // av skjermen (avstand i punkter delt på den lengste skjermsiden: fullt under .3, borte over .8)
    maskin: { helt: 1.5, borte: 5, midtFull: .3, midtBorte: .8 },
    // bakgrunnen i 2D: hvor sterk (0–1) vind og regn høyst blir (kanalene er i tillegg lave i motoren)
    bakgrunn: { vind: .6, regn: .7 },
  };

  // Hvilket av dine lag som melder i loggen: navnet loggteksten begynner med (det lengste, så «Lag 10» ikke blir «Lag 1»),
  // fulgt av mellomrom, kolon eller komma. navn: navnene på dine lag. Gir navnet eller null.
  function lagIMelding(tekst, navn) {
    const t = String(tekst || ''); let best = null;
    for (const n of navn || []) { if (!n || !t.startsWith(n)) continue; const c = t.charAt(n.length); if (c !== ' ' && c !== ':' && c !== ',') continue; if (!best || n.length > best.length) best = n; }
    return best;
  }
  // Hva en loggmelding gir: 'ordre' (en ordre er gitt: «Lag 1: planlegger rute …»), 'stille' (ingen radiokontakt – bare sus),
  // 'radio' (et lag melder), eller null (meldinger som ikke er fra dine lag)
  const ORDRE = [/^: planlegger rute/, /^: kjører /, /^ kjører (til|mot) /];
  function meldingLyd(tekst, navn) {
    const n = lagIMelding(tekst, navn); if (!n) return null; const rest = String(tekst).slice(n.length);
    if (/ingen radiokontakt/i.test(rest)) return 'stille';
    if (ORDRE.some(re => re.test(rest))) return 'ordre';
    return 'radio';
  }
  // Penger: endringen i kassa ved én betaling (kr > 0 inn, < 0 ut) -> 'kasse', 'klunk' eller null
  function pengeLyd(kr, R = REGLER) { return kr >= R.kasseFra ? 'kasse' : kr <= -R.klunkFra ? 'klunk' : null; }
  // Får lyden spilles nå? nå: sekunder (ekte tid); sist: { navn: sekunder } for forrige gang; hist: tidene for lydene som telles per minutt.
  // Gir { ok, grunn }.
  const TELLES = ['radio', 'ordre', 'stille', 'kasse', 'klunk'];
  function tillat(navn, nå, sist, hist, R = REGLER) {
    const m = R.minst[navn]; if (m === undefined) return { ok: false, grunn: 'ukjent lyd' };
    if (sist[navn] !== undefined && nå - sist[navn] < m) return { ok: false, grunn: 'for kort tid siden' };
    if ((navn === 'radio' || navn === 'stille') && sist.ordre !== undefined && nå - sist.ordre < R.radioEtterOrdre) return { ok: false, grunn: 'svar på ordren' };
    if (TELLES.includes(navn) && (hist || []).filter(t => nå - t < 60).length >= R.perMinutt) return { ok: false, grunn: 'for mange lyder siste minutt' };
    if (navn === 'alarm' && (sist.alarmer || []).filter(t => nå - t < R.alarmVindu[1]).length >= R.alarmVindu[0]) return { ok: false, grunn: 'alarmen har gått nok' };
    return { ok: true, grunn: '' };
  }
  // Hvor tydelig maskinene i leiren høres (0–1): m = kam.m, d = avstanden fra skjermens midte til leiren i punkter, side = lengste skjermside
  function maskinNær(m, d, side, R = REGLER.maskin) {
    if (!(m > 0) || !(side > 0) || !Number.isFinite(d)) return 0;
    return (1 - trinn(R.helt, R.borte, m)) * (1 - trinn(R.midtFull, R.midtBorte, d / side));
  }
  // Maskinene som går: bygg [{ type }] og hvilke som går -> { sag, agg, kjele } (antall, høyst 3 regnes)
  function maskiner(bygg, går) {
    const ut = { sag: 0, agg: 0, kjele: 0 };
    for (const b of bygg || []) { if (!går(b)) continue; const k = b.type === 'sagbruk' ? 'sag' : b.type === 'aggregat' ? 'agg' : b.type === 'fyrkjele' ? 'kjele' : null; if (k) ut[k] = Math.min(3, ut[k] + 1); }
    return ut;
  }
  // Bakgrunnen i 2D (0–1) etter været: { vind (m/s), regn (0–1), snø (0–1), i3d } -> { vind, regn }. I 3D tar spill/lyd.js over.
  function bakgrunn(v, R = REGLER.bakgrunn) {
    if (!v || v.i3d) return { vind: 0, regn: 0 };
    const vind = (.15 + .85 * trinn(1, 16, v.vind || 0)) * R.vind, regn = Math.min(1, (v.regn || 0) + (v.snø || 0) * .15) * R.regn;
    return { vind: Math.min(1, vind * (1 - (v.regn || 0) * .3)), regn };
  }
  // Neste trinn i rekka (Av -> Lav -> Middels -> Høy -> Av)
  const nesteTrinn = (t, R = REGLER) => R.rekke[(Math.max(0, R.rekke.indexOf(t)) + 1) % R.rekke.length];
  const gyldigTrinn = (t, std, R = REGLER) => (R.rekke.includes(t) ? t : std);
  const Lyd2d = { REGLER, trinn, lagIMelding, meldingLyd, pengeLyd, tillat, maskinNær, maskiner, bakgrunn, nesteTrinn, gyldigTrinn };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Lyd2d; return; }
  rot.Lyd2d = Lyd2d;
  if (typeof document === 'undefined') return;

  // ================= visningen =================
  const NØKKEL = 'riksbrudd-lydnivå';
  let valg = { ...REGLER.standard };
  try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); if (d) valg = { kart: gyldigTrinn(d.kart, REGLER.standard.kart), meld: gyldigTrinn(d.meld, REGLER.standard.meld) }; } catch (e) { /* privat vindu */ }
  const lagreValg = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(valg)); } catch (e) { /* privat vindu */ } };
  const sek = () => performance.now() / 1000;
  const sist = {}, hist = [], siste = [], teller = {};
  const NV = { bakgrunn: { vind: 0, regn: 0 }, maskiner: { sag: 0, agg: 0, kjele: 0 }, nær: 0 };

  // ---------- lydene (fungerer i både AudioContext og OfflineAudioContext; dest = kanalen de går til) ----------
  const STØY = new WeakMap();
  function støyFor(ac, brunt) {
    let s = STØY.get(ac); if (!s) { s = {}; STØY.set(ac, s); }
    const k = brunt ? 'brun' : 'hvit'; if (s[k]) return s[k];
    const M = rot.Lyd && Lyd.motor && Lyd.motor(); if (M && M.ac === ac && M.støy && M.brun) return (s[k] = brunt ? M.brun : M.støy);
    const n = Math.floor(ac.sampleRate * 2), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let v = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brunt) { v = (v + .02 * w) / 1.02; d[i] = v * 3.5; } else d[i] = w; }
    return (s[k] = b);
  }
  function slag(ac, dest, t0, varighet, type, frekv, Q, styrke, brunt, opp) {
    const k = ac.createBufferSource(); k.buffer = støyFor(ac, brunt); const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekv; f.Q.value = Q;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(styrke, t0 + (opp || .006)); g.gain.exponentialRampToValueAtTime(.0005, t0 + varighet);
    k.connect(f); f.connect(g); g.connect(dest); k.start(t0, Math.random() * 1.5); k.stop(t0 + varighet + .05); return { f, g };
  }
  function tone(ac, dest, t0, varighet, f0, f1, styrke, form, opp) {
    const o = ac.createOscillator(); o.type = form || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + varighet);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(styrke, t0 + (opp || .01)); g.gain.exponentialRampToValueAtTime(.0005, t0 + varighet);
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + varighet + .05); return g;
  }
  // sprak: et bånd av støy (radioens 300–3000 Hz) som hakker (små slag tett i tett)
  function sprak(ac, dest, t0, varighet, s, frekv) {
    slag(ac, dest, t0, varighet, 'bandpass', frekv || 1700, .8, s * .35, false, .004);
    for (let t = t0; t < t0 + varighet; t += .018 + Math.random() * .03) slag(ac, dest, t, .02, 'bandpass', 2400 + Math.random() * 1400, 1.5, s * (.15 + Math.random() * .35));
  }
  const LYDER = {
    // et lag melder: sprak, så et lite «pip» (melding slutt)
    radio(ac, d, t0) { sprak(ac, d, t0, .2, .8); tone(ac, d, t0 + .22, .09, 1250, 1250, .07, 'sine'); },
    // du gir en ordre: to korte pip (sender), så et kortere og lysere sprak
    ordre(ac, d, t0) { tone(ac, d, t0, .06, 980, 980, .06, 'sine'); tone(ac, d, t0 + .08, .07, 1470, 1470, .06, 'sine'); sprak(ac, d, t0 + .17, .12, .6, 2300); },
    // ingen radiokontakt: bare et lavt sus
    stille(ac, d, t0) { slag(ac, d, t0, .55, 'bandpass', 1500, .5, .12, false, .05); },
    // alarm: to toner (lav, høy) tre ganger – rolig men tydelig, ca. 2,6 s, og ikke på nytt før REGLER.minst.alarm
    alarm(ac, d, t0) { for (let i = 0; i < 3; i++) { const t = t0 + i * .86; tone(ac, d, t, .38, 620, 620, .11, 'triangle', .04); tone(ac, d, t + .4, .42, 830, 830, .11, 'triangle', .04); } },
    // kassaapparat: et klikk fra skuffen, så to bjelletoner og noen små mynter
    kasse(ac, d, t0) { slag(ac, d, t0, .05, 'bandpass', 3200, 2, .18); slag(ac, d, t0 + .06, .12, 'lowpass', 500, 1, .18, true);
      tone(ac, d, t0 + .1, .7, 2093, 2093, .07, 'triangle'); tone(ac, d, t0 + .1, .5, 3136, 3136, .035, 'sine'); tone(ac, d, t0 + .22, .6, 2637, 2637, .05, 'triangle');
      for (let i = 0; i < 4; i++) tone(ac, d, t0 + .3 + i * .07 + Math.random() * .03, .12, 4200 + Math.random() * 1600, 3900, .025, 'sine'); },
    // store utgifter: et dempet klunk (som en tung skuff som lukkes)
    klunk(ac, d, t0) { slag(ac, d, t0, .28, 'lowpass', 190, 1.2, .5, true); tone(ac, d, t0, .22, 95, 52, .16, 'sine'); slag(ac, d, t0 + .01, .05, 'bandpass', 900, 1.5, .06); },
    // telefonen: gammel ringeklokke, to ring (hver 0,4 s med en hammer på 20 Hz), så stille
    telefon(ac, d, t0) { for (const t of [t0, t0 + .6]) { for (let k = 0; k < 8; k++) { tone(ac, d, t + k * .05, .06, 1180, 1180, .045, 'triangle', .004); tone(ac, d, t + k * .05 + .025, .06, 1420, 1420, .035, 'triangle', .004); } } },
    // torden langt unna (2D-bakgrunnen): lavt rumle
    torden(ac, d, t0) { const s = slag(ac, d, t0, 4 + Math.random() * 2, 'lowpass', 180, .7, .5, true, .5); s.f.frequency.setValueAtTime(200, t0); s.f.frequency.exponentialRampToValueAtTime(60, t0 + 5); },
  };
  // hvilken kanal hver lyd går i: meldinger eller kartet
  const KANAL = { radio: 'meld', ordre: 'meld', stille: 'meld', alarm: 'meld', kasse: 'meld', klunk: 'meld', telefon: 'meld', torden: 'kart' };

  // ---------- motoren: to kanaler (kart, meldinger) inn i lyd.js sin hovedkanal ----------
  let M = null, kanKart = null, kanMeld = null, vedv = null;
  function motor() {
    if (M) return M; const L = rot.Lyd && Lyd.motor && Lyd.motor(); if (!L) return null;
    const ac = L.ac; kanKart = ac.createGain(); kanMeld = ac.createGain(); kanKart.gain.value = REGLER.trinn[valg.kart]; kanMeld.gain.value = REGLER.trinn[valg.meld];
    kanKart.connect(L.hoved); kanMeld.connect(L.hoved);
    // de vedvarende lydene i kartet: støy/toner -> filter -> forsterker (0 til å begynne med)
    const lag = (type, frekv, Q, brunt) => { const k = ac.createBufferSource(); k.buffer = støyFor(ac, brunt); k.loop = true; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = frekv; f.Q.value = Q;
      const g = ac.createGain(); g.gain.value = 0; k.connect(f); f.connect(g); g.connect(kanKart); k.start(0, Math.random() * 1.5); return { f, g }; };
    const osc = (form, frekv, lp) => { const o = ac.createOscillator(); o.type = form; o.frequency.value = frekv; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      const g = ac.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(kanKart); o.start(); return { o, f, g }; };
    vedv = {
      vind: lag('bandpass', 380, .6), regn: lag('highpass', 1600, .3),
      // saga: et skrikende bånd og en motor; aggregatet: en dur (50 Hz) med litt støy; fyrkjelen: et rumle (sprakene kommer som slag)
      sagBånd: lag('bandpass', 2300, 3), sagMotor: osc('sawtooth', 118, 600),
      aggDur: osc('square', 50, 180), aggStøy: lag('lowpass', 260, .8, true),
      kjele: lag('lowpass', 320, .6, true),
    };
    M = { ac, L }; return M;
  }
  // spill en kort lyd: føres alltid (Lyd2d.sjekk), spilles bare når motoren finnes og lyden er på
  function hør(navn, o = {}) {
    const nå = sek(), t = o.tving ? { ok: true, grunn: '' } : tillat(navn, nå, sist, hist);
    if (!t.ok) { siste.unshift({ navn, t: +nå.toFixed(2), spilt: false, grunn: t.grunn, hva: o.hva || '' }); siste.length = Math.min(siste.length, 30); return false; }
    sist[navn] = nå; if (navn === 'alarm') { sist.alarmer = (sist.alarmer || []).filter(t => nå - t < REGLER.alarmVindu[1]); sist.alarmer.push(nå); }
    if (TELLES.includes(navn)) { hist.push(nå); while (hist.length && nå - hist[0] > 60) hist.shift(); }
    teller[navn] = (teller[navn] || 0) + 1;
    const m = motor(), kan = KANAL[navn] === 'kart' ? kanKart : kanMeld, dempet = !(m && Lyd.på() && REGLER.trinn[valg[KANAL[navn]]] > 0 && !document.hidden);
    if (m && LYDER[navn] && !dempet) { try { LYDER[navn](m.ac, kan, m.ac.currentTime + .02); } catch (e) { /* lyden skal aldri stoppe spillet */ } }
    const grunn = !m ? 'lyden er ikke startet (venter på et trykk)' : dempet ? 'dempet' : m.ac.state !== 'running' ? 'nettleseren holder lyden igjen' : '';
    siste.unshift({ navn, t: +nå.toFixed(2), spilt: !grunn, grunn, hva: o.hva || '' }); siste.length = Math.min(siste.length, 30);
    return true;
  }

  // ---------- hendelsene ----------
  const egneNavn = () => (typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s && s.side === 'blå' && !s.ai && !s.karakter && s.navn).map(s => s.navn) : []);
  // loggen: logg(tekst) pakkes inn én gang (også av andre moduler – flaggene følger med)
  if (typeof rot.logg === 'function' && !rot.logg.lyd) {
    const før = rot.logg;
    const ny = function (t) { const a = typeof loggLinjer !== 'undefined' ? loggLinjer[0] : undefined; const r = før.apply(this, arguments);
      try { const b = typeof loggLinjer !== 'undefined' ? loggLinjer[0] : t; if (b !== a || typeof loggLinjer === 'undefined') { const l = meldingLyd(t, egneNavn()); if (l) hør(l, { hva: String(t).slice(0, 80) }); } } catch (e) { /* lyden skal aldri stoppe loggen */ }
      return r; };
    for (const k of Object.keys(før)) ny[k] = før[k]; ny.lyd = true; rot.logg = ny;
  }
  window.addEventListener('riksbrudd-hendelse', e => { const d = e.detail || {}; if (d.type === 'alarm') hør('alarm', { hva: String(d.tekst || '').slice(0, 80) }); });
  window.addEventListener('riksbrudd-by-ber', e => hør('telefon', { hva: (e.detail && e.detail.tekst) || 'en by ber om hjelp' }));
  // senere kort (investor, firma …): window.dispatchEvent(new CustomEvent('riksbrudd-telefon', { detail: { tekst } }))
  window.addEventListener('riksbrudd-telefon', e => hør('telefon', { hva: (e.detail && e.detail.tekst) || 'telefon' }));
  // Storlia-kortet (spill/selskapspanel.js legger #storliakort rett i body)
  new MutationObserver(liste => { for (const m of liste) for (const n of m.addedNodes) if (n.id === 'storliakort') hør('telefon', { hva: 'Storlia Tømmer' }); }).observe(document.body || document.documentElement, { childList: true });
  // pengene: OppstartSpill.gi/betal pakkes inn én gang når spillet er klart – FØR dagboka i spill/penger-visning.js (den pakker dem inn
  // etter et setTimeout og leser kallstakken etter at kallet er gjort; ligger denne innpakningen ytterst, blir alt «annet» i dagboka)
  let koblet = false;
  function kobleKasse() {
    const O = rot.OppstartSpill; if (koblet || !O || !O.gi || !O.betal) return; koblet = true;
    const kassa = () => { const s = O.tilstand && O.tilstand(); return s && Number.isFinite(s.penger) ? s.penger : 0; };
    const pakk = f0 => { const f = function () { const a = kassa(), r = f0.apply(this, arguments); try { const l = pengeLyd(kassa() - a); if (l) hør(l, { hva: Math.round(kassa() - a) + ' kr' }); } catch (e) { /* ingen lyd */ } return r; };
      for (const k of Object.keys(f0)) f[k] = f0[k]; f.lyd = true; return f; };
    O.gi = pakk(O.gi); O.betal = pakk(O.betal);
  }
  window.addEventListener('riksbrudd-spill', kobleKasse);

  // ---------- hvert kvarter sekund: bakgrunnen og maskinene ----------
  let tordenNeste = 0, kjeleNeste = 0;
  function steg() {
    const i3d = typeof på3d !== 'undefined' && på3d, V = rot.VAER || {};
    NV.bakgrunn = bakgrunn({ vind: V.vind && Number.isFinite(V.vind.fart) ? V.vind.fart : 3, regn: V.regn || 0, snø: V.snø || 0, i3d });
    // maskinene: bare når kartet er zoomet inn på leiren (i 2D)
    let nær = 0, mk = { sag: 0, agg: 0, kjele: 0 };
    const S = rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand();
    if (!i3d && S && S.leir && typeof kam !== 'undefined') {
      nær = maskinNær(kam.m, Math.hypot(S.leir.x - kam.x, S.leir.y - kam.y) / kam.m, Math.max(innerWidth, innerHeight));
      if (nær > 0) { const L = rot.LeirSpill && LeirSpill.tilstand && LeirSpill.tilstand(), ps = rot.ProduksjonSpill && ProduksjonSpill.siste ? ProduksjonSpill.siste() : null, ls = rot.LeirSpill && LeirSpill.siste ? LeirSpill.siste() : null;
        const går = b => b.type === 'aggregat' ? !!(ls && ls.agg > 0 && (!rot.Leir || !Leir.virker || Leir.virker(b))) : !!(ps && ps.status && ps.status[b.id] && ps.status[b.id].går);
        mk = maskiner(L ? L.bygg : [], går); }
      // vakta kan late som maskiner går (Lyd2d.test.maskiner = { sag, kjele }) – leiren har ingen sag ved start
      if (nær > 0 && Lyd2d.test && Lyd2d.test.maskiner) for (const k of Object.keys(mk)) mk[k] = Math.max(mk[k], Lyd2d.test.maskiner[k] || 0);
    }
    NV.nær = nær; NV.maskiner = mk;
    const m = M || motor(); if (!m) return;
    const ac = m.ac, nå = ac.currentTime, sett = (k, v, tid) => vedv[k].g.gain.setTargetAtTime(v, nå, tid || .5);
    kanKart.gain.setTargetAtTime(REGLER.trinn[valg.kart], nå, .2); kanMeld.gain.setTargetAtTime(REGLER.trinn[valg.meld], nå, .2);
    const B = NV.bakgrunn, vf = V.vind && Number.isFinite(V.vind.fart) ? V.vind.fart : 3;
    sett('vind', B.vind * .14, 1.2); vedv.vind.f.frequency.setTargetAtTime(260 + 380 * Math.min(1, vf / 16) + 60 * Math.sin(nå * .4), nå, 1.5); sett('regn', B.regn * .09, 1.2);
    // saga: lyden stiger og synker (en stokk om gangen, ca. 5 s), aggregatet durer jevnt, fyrkjelen rumler og spraker
    const sag = mk.sag ? nær * Math.min(1, .7 + .15 * mk.sag) : 0, kutt = .55 + .45 * Math.max(0, Math.sin(nå * 2 * Math.PI / 5));
    sett('sagBånd', sag * .045 * kutt, .25); sett('sagMotor', sag * .035, .4); vedv.sagMotor.o.frequency.setTargetAtTime(110 + 22 * kutt, nå, .3);
    const agg = mk.agg ? nær * Math.min(1, .7 + .15 * mk.agg) : 0; sett('aggDur', agg * .05); sett('aggStøy', agg * .05);
    const kj = mk.kjele ? nær * Math.min(1, .7 + .15 * mk.kjele) : 0; sett('kjele', kj * .07, .8);
    if (kj > .05 && nå > kjeleNeste) { kjeleNeste = nå + .4 + Math.random() * 1.6; if (Lyd.på()) slag(ac, kanKart, nå + .02, .05, 'bandpass', 1800 + Math.random() * 1500, 1.2, kj * .06); }
    // torden langt unna i 2D når været har torden
    if (!i3d && (V.torden || 0) > .2 && nå > tordenNeste) { if (tordenNeste) hør('torden'); tordenNeste = nå + 25 + Math.random() * 50; }
  }
  setInterval(steg, 250);

  // ---------- ☰ «Kartlyd» og «Meldingslyd» (meny.js sorterer dem inn under «Bilde og lyd», rett etter «Lyd») ----------
  const knapper = {};
  function knapp(hva, tittel, navn) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'lyd-' + hva; b.title = tittel;
    const tekst = () => `${navn}: ${REGLER.trinnNavn[valg[hva]]}`;
    b.textContent = tekst();
    b.onclick = () => { valg[hva] = nesteTrinn(valg[hva]); lagreValg(); const v = b.querySelector('.verdi'); if (v) v.textContent = REGLER.trinnNavn[valg[hva]]; else b.textContent = tekst();
      if (rot.Lyd && Lyd.start && Lyd.på()) Lyd.start(); if (hva === 'meld' && valg.meld !== 'av') setTimeout(() => hør('radio', { tving: true, hva: 'prøvelyd' }), 60); };
    knapper[hva] = b; const lm = document.getElementById('lagmeny'); if (lm) lm.appendChild(b);
  }
  knapp('kart', 'Vind, regn og maskinene i leiren når du zoomer inn', 'Kartlyd');
  knapp('meld', 'Radio, alarm, kassaapparat og telefon', 'Meldingslyd');
  // meny.js (lastes senere) har en liste over hva som står i hver gruppe; legg de to valgene inn rett etter «Lyd» og sorter på nytt
  window.addEventListener('DOMContentLoaded', () => { const Me = rot.Meny; if (!Me || !Me.GRUPPER) return; const g = Me.GRUPPER.find(x => x[0] === 'Bilde og lyd'); if (!g || g[2].includes('Kartlyd')) return;
    const i = g[2].indexOf('Lyd'); g[2].splice(i < 0 ? g[2].length : i + 1, 0, 'Kartlyd', 'Meldingslyd'); try { Me.ordne(); } catch (e) { /* menyen virker uten */ } });

  // ---------- for vaktene ----------
  // måle(navn): lager lyden i en OfflineAudioContext (uten høyttaler) og gir rms og toppen – viser at lyden faktisk har lyd i seg
  async function måle(navn, sekunder = 3) {
    const OAC = rot.OfflineAudioContext || rot.webkitOfflineAudioContext; if (!OAC || !LYDER[navn]) return null;
    const ac = new OAC(1, Math.floor(22050 * sekunder), 22050); LYDER[navn](ac, ac.destination, .02); const b = await ac.startRendering(), d = b.getChannelData(0);
    let q = 0, t = 0; for (const v of d) { q += v * v; t = Math.max(t, Math.abs(v)); } return { rms: Math.sqrt(q / d.length), topp: t };
  }
  const gain = g => (g ? +g.gain.value.toFixed(3) : null);
  Lyd2d.sjekk = () => ({ startet: !!M, på: !!(rot.Lyd && Lyd.på && Lyd.på()), valg: { ...valg }, kanaler: M ? { kart: gain(kanKart), meld: gain(kanMeld), vedvarende: Object.keys(vedv).length } : null,
    nivå: { bakgrunn: { ...NV.bakgrunn }, maskiner: { ...NV.maskiner }, nær: +NV.nær.toFixed(3), lyd: vedv ? Object.fromEntries(Object.entries(vedv).map(([k, v]) => [k, gain(v.g)])) : null },
    siste: siste.slice(0, 12), teller: { ...teller }, knapper: Object.keys(knapper).filter(k => knapper[k].isConnected) });
  Lyd2d.hør = hør; Lyd2d.måle = måle; Lyd2d.steg = steg; Lyd2d.LYDER = Object.keys(LYDER); Lyd2d.velg = (hva, t) => { if (!REGLER.rekke.includes(t) || !(hva in valg)) return false; valg[hva] = t; lagreValg(); const b = knapper[hva], v = b && b.querySelector('.verdi'); if (v) v.textContent = REGLER.trinnNavn[t]; else if (b) b.textContent = `${hva === 'kart' ? 'Kartlyd' : 'Meldingslyd'}: ${REGLER.trinnNavn[t]}`; return true; };
  // glem når lydene sist ble spilt (vakta kan prøve flere lyder etter hverandre)
  Lyd2d.nullstill = () => { for (const k of Object.keys(sist)) delete sist[k]; hist.length = 0; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
