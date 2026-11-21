/* Riksbrudd – KAMPENE TIL LAGENE DINE (runde 13, 21. nov, kritiker G og H).
 * G (telefon): «En hel tropp døde i "nøytrale" Lærdalsøyri uten at spolingen stoppet, uten kampmelding og uten forklaring.»
 * H (PC): «Lag uten radiokontakt sloss i timevis uten at jeg ser noe. Farten ble senket til 1× "Et lag er i ildkamp" over ti ganger,
 *  lagene vises ikke i kartet, og banneret har ingen Vis-knapp.»
 * Nå er hver kamp ÉN hendelse: første skudd eller første tap for et eget lag starter en kamp, og den er over når det har vært stille i
 * REGLER.slutt spillminutter. Når kampen starter: én linje i loggen og hendelsen «kontakt» med stedet (flyt.js stopper ⏭ / setter 1×
 * én gang og gir kortet «Vis»), f.eks. «⚔ Speidertropp 1 er i kamp med bygdevernet i Lærdalsøyri (7 mann)». Lag uten radiokontakt får
 * et kampmerke i kartet der kampen er (kontrollrommet viser laget på siste kjente posisjon). De som faller, får årsaken i loggen
 * («… falt for bygdevernet i Vikeså»). Kampen om leiren meldes av forsvar-visning.js og telles ikke her.
 * Reglene øverst er uten DOM (Node: require('./forsvar-kamp'); nettleser: globalThis.KampVarsel) – test_forsvar_kamp.js.
 * Visningen nederst: window.KampSpill. Ikke av seg selv i testene (navigator.webdriver) uten KampSpill.test = true.
 */
(function (rot) {
  'use strict';
  // Claudes forslag:
  const REGLER = {
    slutt: 30,        // spillminutter uten skudd eller tap før kampen regnes som over
    nærBy: 3000,      // meter: et tettsted så nær kalles «ved X»; lenger unna sier stedet retning og avstand fra leiren
    leirKamp: 700,    // meter: et eget lag så nær leiren mens leiren angripes = kampen om leiren (forsvar-visning.js melder den)
    merke: 120,       // spillminutter kampmerket står etter at kampen er over når laget ikke har kontakt (så du ser hvor det skjedde)
    // meter: et tap uten skudd (bygdevern, artilleri, miner …) regnes som kamp bare når det er bygdevern der eller en fiende så nær –
    // ellers er det noe annet (flom, ras, ulykke) og meldes av den som gjorde skaden
    tapFiende: 2500,
  };
  // steg(K, aktiv, t, x, y): K = kampen som pågår (eller null), aktiv = skudd eller tap nå. Gir { K, ny, over }:
  // ny = en kamp begynte nå, over = kampen som nettopp sluttet (stille i R.slutt minutter)
  function steg(K, aktiv, t, x, y, R = REGLER) {
    let over = null;
    if (K && t - K.sist > R.slutt) { over = K; K = null; }
    if (!aktiv) return { K, ny: false, over };
    if (!K) return { K: { start: t, sist: t, x, y, tap: 0, falne: 0 }, ny: true, over };
    K.sist = t; return { K, ny: false, over };
  }
  const km = m => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m / 10) * 10 + ' m');
  // stedet: { by (navn), inne (i tettstedet), meter (fra leiren), retning } -> «i Lærdalsøyri», «ved Vikeså», «3,2 km sørvest for leiren»
  function stedTekst(o) {
    if (!o) return '';
    if (o.by) return (o.inne ? 'i ' : 'ved ') + o.by;
    if (Number.isFinite(o.meter) && o.retning) return `${km(o.meter)} ${o.retning} for leiren`;
    return '';
  }
  // fienden: { bygdevern, raid, fraksjon (navn), navn } -> «bygdevernet», «røverne», «Kystalliansen», «en fiende dere ikke ser»
  function fiendeTekst(f) {
    if (!f) return 'en fiende dere ikke ser';
    if (f.bygdevern) return 'bygdevernet';
    if (f.raid) return 'røverne';
    if (f.fraksjon) return f.fraksjon;
    return f.navn || 'en fiende dere ikke ser';
  }
  // meldingen når kampen begynner. o: { lag, fiende (tekst), sted (tekst), mann (fiendens antall), kontakt (false = ingen radiokontakt) }
  function tekst(o) {
    let t = `⚔ ${o.lag} er i kamp med ${o.fiende}`;
    if (o.sted) t += ' ' + o.sted;
    if (o.mann > 0) t += ` (${o.mann} mann)`;
    if (o.kontakt === false) t += ' – ingen radiokontakt: du ser bare siste kjente posisjon';
    return t;
  }
  // årsaken når noen faller: «falt for bygdevernet i Vikeså»
  const årsak = (fiende, sted) => `falt for ${fiende}${sted ? ' ' + sted : ''}`;
  // loggteksten fra FolkRegler.falneTekst («Oddvar Aasen (Vaktlaget) er falt.») med årsaken: «Oddvar Aasen (Vaktlaget) falt for …»
  function medÅrsak(t, å) { if (!t || !å) return t; return /(er|har) falt\.$/.test(t) ? t.replace(/(er|har) falt\.$/, å + '.') : t; }
  // oppsummeringen når kampen er over: «Kampen i Vikeså er over: Speidertropp 1 mistet 2 mann (falt for bygdevernet).»
  function sluttTekst(o) {
    const hvor = o.sted ? ` ${o.sted}` : '';
    if (o.slåttUt) return `Kampen${hvor} er over: ${o.lag} er slått ut${o.falne ? ` – ${o.falne} falt for ${o.fiende}` : ''}.`;
    if (o.falne) return `Kampen${hvor} er over: ${o.lag} mistet ${o.falne} mann (${årsak(o.fiende, '').replace(/ $/, '')}).`;
    return `Kampen${hvor} er over: ${o.lag} er ikke i ildkamp lenger.`;
  }
  const api = { REGLER, steg, stedTekst, fiendeTekst, tekst, årsak, medÅrsak, sluttTekst, km };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.KampVarsel = api;
  if (typeof document === 'undefined' || typeof KROKER === 'undefined') return;

  // ================= visningen =================
  const KV = api, R = REGLER;
  const auto = () => !navigator.webdriver || !!(rot.KampSpill && KampSpill.test);
  const leir = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  const kamper = new Map();   // lag -> kampen ({ start, sist, x, y, fiende, sted, mann, tap, falne, leir, meldt })
  const hp = new WeakMap();   // lag -> [helsa til hver mann sist vi så]
  const ferdige = [];         // de siste kampene som er over (for oppsummeringer): { lag, fiende, sted, falne, slått, tid }
  const egne = () => ENHETER.filter(s => s.side === 'blå' && !s.karakter && !s.leirvakt && Array.isArray(s.menn));
  const skjult = s => KROKER.skjul.some(f => f(s));
  const byer = () => (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [];
  const fraksjon = side => (rot.Fraksjoner && Fraksjoner.FRAKSJONER[side] ? Fraksjoner.FRAKSJONER[side].navn : null);
  const friske = e => (Array.isArray(e.menn) ? e.menn.filter(m => m.hp > 0).length : 0);
  // tettstedet laget står i (eller nærmeste innen R.nærBy)
  function stedFor(x, y) {
    let best = null, bd = Infinity;
    for (const by of byer()) { if (!by || !by.e || !by.bb) continue;
      if (x > by.bb[0] && x < by.bb[2] && y > by.bb[1] && y < by.bb[3] && rot.Garnison && Garnison.inni(by, x, y)) return { by: by.e.navn, inne: true, o: by };
      const cx = (by.bb[0] + by.bb[2]) / 2, cy = (by.bb[1] + by.bb[3]) / 2, d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = by; } }
    if (best && bd <= R.nærBy) return { by: best.e.navn, inne: false, o: best };
    const L = leir(); if (!L || !rot.Forsvar) return null;
    return { meter: Math.hypot(x - L.x, y - L.y), retning: Forsvar.retning(Math.atan2(y - L.y, x - L.x)) };
  }
  // hvem laget sloss med: de som skyter på det eller som det skyter på (nærmeste), ellers bygdevernet i et tettsted ingen eier
  function fiendeFor(s, sted) {
    const mot = ENHETER.filter(e => e.side !== 'blå' && Array.isArray(e.menn) && ((e.skyterPå && e.skyterPå.has(s)) || (s.skyterPå && s.skyterPå.has(e))));
    if (mot.length) { mot.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y)); const e = mot[0];
      const f = { raid: !!(e.raid || e.post), fraksjon: e.raid || e.post ? null : fraksjon(e.side), navn: e.navn };
      // angriper: fienden hører til angrepet på leiren (forsvar-visning.js melder kampene innen 3 km fra leiren selv)
      const A = rot.ForsvarSpill && ForsvarSpill.angrep ? ForsvarSpill.angrep() : null;
      return { tekst: KV.fiendeTekst(f), mann: mot.filter(q => q.side === e.side).reduce((a, q) => a + friske(q), 0), angriper: !!(A && A.lag.some(q => mot.includes(q))) }; }
    const KT = rot.KrigSpill && KrigSpill.T ? KrigSpill.T() : null;
    if (sted && sted.inne && sted.o && KT && KT.vern && KT.vern[sted.o.e.id] > 0) return { tekst: 'bygdevernet', mann: Math.round(KT.vern[sted.o.e.id]) };
    // ingen skyter: den nærmeste fienden innen R.tapFiende (artilleri, bakhold, miner)
    const nær = ENHETER.filter(e => e.side !== 'blå' && Array.isArray(e.menn) && levende(e) && Math.hypot(e.x - s.x, e.y - s.y) <= R.tapFiende).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (nær) return { tekst: KV.fiendeTekst({ raid: !!(nær.raid || nær.post), fraksjon: nær.raid || nær.post ? null : fraksjon(nær.side), navn: nær.navn }), mann: friske(nær), gjett: true };
    return { tekst: KV.fiendeTekst(null), mann: 0, ingen: true };
  }
  const hend = (type, tekst, x, y) => { try { rot.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type, tekst, x, y } })); } catch (e) { /* eldre nettlesere */ } };
  // kampen om leiren: leiren angripes (ForsvarSpill.angrep) og laget står nær leiren
  function omLeiren(s) { const L = leir(); return !!(L && rot.ForsvarSpill && ForsvarSpill.angrep && ForsvarSpill.angrep() && Math.hypot(s.x - L.x, s.y - L.y) <= R.leirKamp); }

  let sistSjekk = 0;
  function sjekk() {
    for (const s of egne()) {
      const nå = s.menn.map(m => (Number.isFinite(m.hp) ? m.hp : 1)), før = hp.get(s); hp.set(s, nå);
      let tap = 0, døde = []; if (før && før.length === nå.length) for (let i = 0; i < nå.length; i++) { if (nå[i] < før[i] - 1e-6) { tap++; if (nå[i] <= 0 && før[i] > 0) døde.push(s.menn[i]); } }
      const skyter = !!(s.skyterPå && [...s.skyterPå].some(e => e && e.side !== 'blå')), beskutt = ENHETER.some(e => e.side !== 'blå' && e.skyterPå && e.skyterPå.has(s));
      // et tap uten skudd teller bare når det har en kjent fiende (bygdevern eller en fiende nær) – ikke flom, ras eller ulykker
      const tapKamp = tap > 0 && (kamper.has(s) || !fiendeFor(s, stedFor(s.x, s.y)).ingen);
      const aktiv = (skyter || beskutt || tapKamp) && levendeLag(s, før);
      const r = KV.steg(kamper.get(s) || null, aktiv, tid, s.x, s.y);
      if (r.over) avslutt(s, r.over);
      if (r.K) kamper.set(s, r.K); else kamper.delete(s);
      const K = r.K; if (!K) continue;
      if (r.ny) start(s, K);
      if (tap) { K.tap += tap; K.falne += døde.length; for (const m of døde) if (!m.årsak) m.årsak = KV.årsak(K.fiende || KV.fiendeTekst(null), K.sted); }
    }
    // lag som er borte (slått ut og tatt bort): kampen er over
    for (const [s, K] of kamper) if (!ENHETER.includes(s)) { avslutt(s, K); kamper.delete(s); }
  }
  // (et lag som var i live sist og nå er helt borte, teller med: tapet er den siste kampen)
  const levendeLag = (s, før) => levende(s) || !!(før && før.some(h => h > 0));
  function start(s, K) {
    const st = stedFor(K.x, K.y), f = fiendeFor(s, st); K.fiende = f.tekst; K.mann = f.mann; K.sted = KV.stedTekst(st); const L = leir(); K.leir = omLeiren(s) || !!(f.angriper && L && Math.hypot(s.x - L.x, s.y - L.y) <= (rot.Forsvar ? Forsvar.R.hent : 3000));
    if (K.leir || !auto()) return;
    K.meldt = true; const kontakt = !skjult(s);
    const t = KV.tekst({ lag: s.navn, fiende: K.fiende, sted: K.sted, mann: K.mann, kontakt });
    logg(t + '.'); hend('kontakt', t, K.x, K.y); skitten = true;
  }
  function avslutt(s, K) {
    ferdige.push({ lag: s.navn, fiende: K.fiende, sted: K.sted, falne: K.falne, start: K.start, slutt: K.sist, slått: !levende(s), leir: K.leir, meldt: !!K.meldt, x: K.x, y: K.y, kontakt: !skjult(s) });
    if (ferdige.length > 20) ferdige.shift();
    if (!K.meldt || !auto()) return;
    logg(KV.sluttTekst({ lag: s.navn, fiende: K.fiende, sted: K.sted, falne: K.falne, slåttUt: !levende(s) })); skitten = true;
  }
  KROKER.sim.push(() => { const n = performance.now(); if (n - sistSjekk < 100) return; sistSjekk = n; if (typeof ENHETER === 'undefined') return; sjekk(); });

  // ---------- årsaken i loggen når noen faller (folk-visning.js skriver linja med FolkRegler.falneTekst) ----------
  function kobleFalne() { const FR = rot.FolkRegler; if (!FR || !FR.falneTekst || FR.falneTekst.kamp) return;
    const orig = FR.falneTekst, ny = function (navn, lag) { const t = orig.apply(this, arguments);
      const s = typeof ENHETER !== 'undefined' ? ENHETER.find(e => e.side === 'blå' && e.navn === lag) : null; if (!s || !Array.isArray(navn)) return t;
      // (falne() i folk-visning.js kan komme før kampen her har merket mannen – da gjelder kampen laget er i)
      if (!kamper.get(s)) sjekk();
      const K = kamper.get(s), åK = K && K.fiende ? KV.årsak(K.fiende, K.sted) : null;
      const å = navn.map(n => { const m = s.menn.find(q => q.navn === n); if (m && !m.årsak && åK) m.årsak = åK; return m && m.årsak; }); return å.length && å[0] && å.every(x => x === å[0]) ? KV.medÅrsak(t, å[0]) : t; };
    ny.kamp = true; FR.falneTekst = ny; }
  kobleFalne(); rot.addEventListener('riksbrudd-spill', () => setTimeout(kobleFalne, 0));

  // ---------- kartet: kampmerket ved lag du ikke ser ----------
  // Bare kamper som er meldt (ikke i testene uten KampSpill.test). Lag med radiokontakt har alt ringen «I ildkamp» (forsvar-visning.js). Uten kontakt tegnes laget «sist meldt» av kontrollrommet, og her
  // står et kampmerke (to sverd) der kampen er, med navnet og hvor lenge siden det ble hørt skudd.
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!kamper.size && !ferdige.length) return; const m = kam.m, nå = performance.now(), puls = .55 + .45 * Math.sin(nå / 170);
    const liste = [];
    for (const [s, K] of kamper) if (K.meldt && skjult(s)) liste.push({ x: K.x, y: K.y, navn: s.navn, aktiv: true, sist: K.sist });
    for (const f of ferdige) if (f.meldt && !f.kontakt && tid - f.slutt <= R.merke && tid >= f.slutt && !liste.some(q => q.navn === f.lag)) liste.push({ x: f.x, y: f.y, navn: f.lag, aktiv: false, sist: f.slutt, slått: f.slått });
    if (!liste.length) return; g.save();
    for (const q of liste) { const x = (q.x - vx0) / m, y = (vy1 - q.y) / m; if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) continue;
      const r = 13; g.globalAlpha = q.aktiv ? 1 : .7; g.fillStyle = 'rgba(42,18,13,.88)'; g.strokeStyle = q.aktiv ? `rgba(240,110,80,${.55 + .4 * puls})` : 'rgba(200,150,120,.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r + (q.aktiv ? 3 * puls : 0), 0, 6.283); g.fill(); g.stroke();
      // to sverd i kryss
      g.strokeStyle = '#ffd2b8'; g.lineWidth = 2; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x - 6 * sx, y + 6); g.lineTo(x + 6 * sx, y - 6); g.moveTo(x - 4 * sx - 2.5, y + 4 - 2.5 * sx); g.lineTo(x - 4 * sx + 2.5, y + 4 + 2.5 * sx); g.stroke(); }
      const min = Math.max(0, Math.round(tid - q.sist)), t = `${q.navn} · ${q.aktiv ? 'kamp, ingen kontakt' : q.slått ? 'slått ut her' : 'kamp her'}${min >= 2 ? ` · skudd for ${min} min siden` : ''}`;
      g.font = '600 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(30,12,8,.92)';
      const ty = rot.Etikett ? Etikett.tekst(g, t, x, y + r + 14, 1, Etikett.REGLER && Etikett.REGLER.prio ? Etikett.REGLER.prio.viktig : undefined) : y + r + 14;
      g.strokeText(t, x, ty); g.fillStyle = '#ffb49a'; g.fillText(t, x, ty); }
    g.restore(); if (liste.some(q => q.aktiv)) skitten = true; });

  rot.KampSpill = { test: false, kamper: () => [...kamper].map(([s, K]) => ({ lag: s.navn, ...K })), ferdige: () => ferdige.slice(), sjekk, stedFor, fiendeFor,
    nullstill: () => { kamper.clear(); ferdige.length = 0; } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
