'use strict';
// Navnene på lag, kjøretøy, basen og leiren skal ikke ligge oppå hverandre (feiljakten 12. nov: ved leiren sto fem navn i én klump).
// Regler uten DOM (test: pipeline/fliser/test_etikett.js). Hver ramme: Etikett.nullstill(), og så spør hver tegner
// Etikett.plass(x, y, bredde, retning) om hvor navnet skal stå. Er plassen tatt, flyttes navnet en linje om gangen
// oppover (retning −1, navn over symbolet) eller nedover (retning 1, navn under symbolet) til det er ledig.
//
// RUNDE 6 (19. nov, kritikken: «Leiren til …» under flagget, «Kari (deg)» oppå «Vaktlaget», røvernes merke gjemt under egne
// navn, og på /norge en lang søyle av navn langt nord for symbolene): navnene SAMLES i rammen og plasseres til slutt, viktigst
// først – fiender, så det valgte, egne lag, kjøretøy og til sist bygg og steder. Et navn prøver plassen sin, en eller to linjer
// unna, ved siden av merket og på andre siden av merket; finnes ingen ledig plass, skjules det (de viktigste står likevel).
// Merkene (Merker.tegn, leirens flagg, basen …) meldes inn som hindringer, så navnene går utenom dem: merkene ligger øverst.
// Slik virker det for tegnerne: Etikett.tekst(g, t, x, y, retning) svarer NaN mens rammen pågår (nullstill() … tegnAlle(g)),
// og tegnerens egne strokeText/fillText(t, x, NaN) fanges opp (farge, skrift, strek) i stedet for å tegnes. tegnAlle(g) plasserer
// og tegner alt, og så det som skal ligge øverst (Etikett.øverst(fn): fiendens merker). Utenfor en ramme virker tekst() som før.
(function (rot) {
  const LINJE = 15, MAKS = 30, tatt = [];
  // Claudes forslag (runde 6): prioritetene og hvor langt et navn kan flyttes før det skjules
  const REGLER = {
    prio: { fiende: 6, valgt: 5, viktig: 4.5, egne: 3, by: 3.5, kjøretøy: 2, leir: 2.5, sted: 1, kart: .5 },
    // navn med minst denne prioriteten skjules aldri: finnes ingen ledig plass, står de der de skulle (over kartnavnene)
    tving: 4,
    // høyst så mange linjer opp eller ned fra plassen sin
    linjer: 2,
    // (runde 8) så mange linjer til (opp eller ned) et viktig navn prøver før det slås sammen med navnet det ville ligget oppå
    ekstra: 3,
    // luft mellom et navn og et merke ved siden av (px)
    side: 6,
    // skjulte lag/kjøretøy innen så mange punkter fra et navn som står, telles som «+3» etter det
    klynge: 30,
    // tall i navn: en skrift der 0 ikke ser ut som o (Cormorant Garamond har gammeldagse tall)
    tallSkrift: '"Times New Roman", Times, "Liberation Serif", "Noto Serif", "DejaVu Serif", serif', tallSkala: .94,
    // (runde 12, kritikk E: «Helikopter», «Feltbil», «hogst 0 %» sto i grå sans midt blant navnene i antikva) all tekst i 2D-kartet
    // skrives i kartets skrift: sans-serif byttes mens rammen tegnes, litt større (Cormorant er lavere) og minst halvfet
    kartSkrift: '"Cormorant Garamond", Georgia, serif', sansSkala: 1.15, sansVekt: 600,
    // (runde 13, kritikk G: «Speidertropp 1», «Gunn Kritiker (deg)» og «1. lastebilkolonne» oppå hverandre ved leiren) lag og kjøretøy
    // med merket innen r punkter fra leiren får én lapp («Leiren: 3 lag ›») når minst min av dem står der; lappen står dy under leiren
    samle: { r: 56, min: 2, dy: 47 },
  };
  // (MAKS var 12: med lag og kjøretøy tett samlet ved leiren, sett langt ute, fikk ikke det 13. og 14. navnet plass – 13. nov)
  // rammen rundt en tekst med midten i x og grunnlinja i y (13 px skrift): litt luft på sidene
  const ramme = (x, y, w, h) => [x - w / 2 - 3, y - h + 3, w + 6, h];
  const over = (r, q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3];
  const kolliderer = r => tatt.some(q => over(r, q));
  // utsatt modus: kø = navnene i denne rammen, hindre = merkene, topp = det som tegnes etter navnene
  const kø = [], hindre = [], topp = [], regler = [], vist = [];
  let aktiv = false, samleS = null, samlet = null;
  function nullstill() { tatt.length = 0; kø.length = 0; hindre.length = 0; topp.length = 0; vist.length = 0; aktiv = true; samleS = null; samlet = null; }
  // (runde 13) samleSted(S): i denne rammen samles lag og kjøretøy ved S = { x, y, hvem(t) -> 'lag' | 'kjøretøy' | null, tekst(n) }
  // (skjermpunkter; n = { lag, kjøretøy, alle }) i én lapp. Settes av spill/kartlapper.js hver ramme; nullstill() tar det bort.
  function samleSted(S) { if (aktiv) samleS = S || null; }
  // plass(x, y, w, retning, h): y-en teksten skal tegnes i. Plassen blir merket som tatt.
  function plass(x, y, w, retning = -1, h = LINJE) {
    let r = ramme(x, y, w, h), yy = y;
    for (let i = 0; i < MAKS && kolliderer(r); i++) { yy += (retning < 0 ? -1 : 1) * h; r = ramme(x, yy, w, h); }
    tatt.push(r); return yy;
  }
  // merk(r): en ramme [x, y, bredde, høyde] som alt er tegnet av andre (navnene på infrastrukturen, tegnEtiketter i index.html), så
  // navnene på lag, kjøretøy og olje ikke legges oppå dem (feiljakten 12. nov: «STURE», «MONGSTAD» og «500 t olje» i én klump)
  function merk(r) { tatt.push([r[0], r[1], r[2], r[3]]); if (aktiv) hindre.push({ r: [r[0], r[1], r[2], r[3]], prio: REGLER.prio.kart, tekst: true }); }
  // hinder(x0, y0, w, h): et merke (symbol, flagg) som navnene skal gå utenom
  function hinder(x0, y0, w, h) { if (aktiv && isFinite(x0) && isFinite(y0)) hindre.push({ r: [x0, y0, w, h], prio: 9, tekst: false }); }
  // regel(fn): fn(tekst) svarer false (skjul navnet), et tall (prioriteten) eller undefined (som før). Gjelder alle rammer.
  function regel(fn) { regler.push(fn); }
  function vurder(t) { for (const f of regler) { let v; try { v = f(t); } catch (e) { v = undefined; } if (v === false || typeof v === 'number') return v; } return undefined; }

  // ---------- plasseringen (ren regel, testes i Node) ----------
  // lapper: [{ t, x, y, w, h, retning, prio, nr }], hindringer: [{ r, prio, tekst }]. Setter vis, px, py og tvunget på hver lapp.
  function kandidater(L, R) { const d = L.retning < 0 ? -1 : 1, h = L.h || LINJE, ut = [[L.x, L.y]];
    for (let k = 1; k <= R.linjer; k++) ut.push([L.x, L.y + d * k * h]);
    // ved siden av merket: merket står ca. 16 px under (over) et navn over (under) det
    const my = L.y - d * 12, sx = L.w / 2 + 14 + R.side; ut.push([L.x + sx, my], [L.x - sx, my]);
    // på andre siden av merket
    ut.push([L.x, L.y - d * (2 * 16 + h - 6)], [L.x, L.y - d * (2 * 16 + 2 * h - 6)]);
    return ut; }
  function plasser(lapper, hindringer, R = REGLER) {
    const rek = lapper.slice().sort((a, b) => b.prio - a.prio || a.nr - b.nr), satt = [];
    const ledig = (r, utenTekst, minPrio) => !satt.some(q => over(r, q.ramme)) && !hindringer.some(o => (!utenTekst || !o.tekst) && over(r, o.r));
    for (const L of rek) { L.vis = false; L.tvunget = false; L.sammen = null; const K = kandidater(L, R), h = L.h || LINJE;
      let funnet = null;
      for (const [x, y] of K) { const r = ramme(x, y, L.w, h); if (ledig(r, false)) { funnet = [x, y, r]; break; } }
      // de viktigste kan stå oppå kartnavnene (byer, bruer), men ikke oppå merker eller andre lag
      if (!funnet && L.prio >= R.tving) for (const [x, y] of K) { const r = ramme(x, y, L.w, h); if (ledig(r, true)) { funnet = [x, y, r]; break; } }
      // (runde 8, krig: to fiendelag nær hverandre fikk lappene oppå hverandre) et viktig navn som ikke får plass: prøv flere linjer opp og ned;
      // ligger det fortsatt oppå et annet navn, slås det sammen med det («+1» etter navnet som står) i stedet for å legges oppå
      if (!funnet && L.prio >= R.tving) for (let k = R.linjer + 1; k <= R.linjer + R.ekstra && !funnet; k++) for (const d of [L.retning < 0 ? -1 : 1, L.retning < 0 ? 1 : -1]) { const y = L.y + d * k * h, r = ramme(L.x, y, L.w, h); if (ledig(r, true)) { funnet = [L.x, y, r]; break; } }
      if (!funnet && L.prio >= R.tving) { const r0 = ramme(L.x, L.y, L.w, h), q = satt.find(o => over(r0, o.ramme)); if (q) { L.sammen = q; continue; } funnet = [L.x, L.y, r0]; L.tvunget = true; }
      if (!funnet) continue;
      L.vis = true; L.px = funnet[0]; L.py = funnet[1]; L.ramme = funnet[2]; satt.push(L); }
    // skjulte navn rett ved et navn som står (samme sted på skjermen, langt ute): «+3» etter det, så du vet at det er flere der
    // (bare lag og kjøretøy – ikke tettsteder, leiren, bygg og steder)
    const P = R.prio, enhet = p => p === P.kjøretøy || p === P.egne || p === P.valgt || p === P.fiende;
    for (const L of satt) L.flere = 0;
    for (const L of lapper) { if (L.vis) continue; if (L.sammen) { L.sammen.flere++; continue; } if (!enhet(L.prio)) continue; let best = null, bd = R.klynge;
      for (const q of satt) { if (!enhet(q.prio)) continue; const d = Math.hypot(q.x - L.x, (q.y + q.retning * 16) - (L.y + L.retning * 16)); if (d < bd) { bd = d; best = q; } }
      if (best) best.flere++; }
    return lapper; }

  // (runde 13) samle(lapper, S): lag og kjøretøy med merket (ca. 14 punkter under/over navnet) innen REGLER.samle.r fra S. Er de minst
  // REGLER.samle.min, merkes de L.samlet = true (vises ikke) og svaret er { inne, n } (n = { lag, kjøretøy, alle }); ellers null.
  function samle(lapper, S, R = REGLER) {
    if (!S || !isFinite(S.x) || !isFinite(S.y) || typeof S.hvem !== 'function') return null; const inne = [], n = { lag: 0, kjøretøy: 0, alle: 0 };
    for (const L of lapper) { let typ = null; try { typ = S.hvem(L.t); } catch (e) { typ = null; } if (typ !== 'lag' && typ !== 'kjøretøy') continue;
      const d = L.retning < 0 ? -1 : 1; if (Math.hypot(L.x - S.x, L.y - d * 14 - S.y) > (S.r || R.samle.r)) continue; inne.push(L); n[typ]++; n.alle++; }
    if (n.alle < R.samle.min) return null; for (const L of inne) L.samlet = true; return { inne, n }; }
  const samleTekst = n => 'Leiren: ' + [n.lag ? n.lag + ' lag' : '', n.kjøretøy ? n.kjøretøy + ' kjøretøy' : ''].filter(Boolean).join(', ') + ' ›';

  // ---------- tegnerne: tekst() fanger navnet, og strokeText/fillText(t, x, NaN) gir fargene ----------
  function pakkInn(g) { if (!g || g.__etikett) return; g.__etikett = true; const f0 = g.fillText, s0 = g.strokeText;
    g.fillText = function (t, x, y, mw) { const L = this.__etikettSiste; if (y !== y && L && L.t === String(t)) { L.fyll = this.fillStyle; L.font = this.font; L.align = this.textAlign; L.baseline = this.textBaseline; L.alpha = this.globalAlpha; return; }
      return arguments.length > 3 ? f0.call(this, t, x, y, mw) : f0.call(this, t, x, y); };
    g.strokeText = function (t, x, y, mw) { const L = this.__etikettSiste; if (y !== y && L && L.t === String(t)) { L.strek = this.strokeStyle; L.bredde = this.lineWidth; L.font = this.font; L.align = this.textAlign; L.baseline = this.textBaseline; return; }
      return arguments.length > 3 ? s0.call(this, t, x, y, mw) : s0.call(this, t, x, y); };
    g.__etikettF = f0; g.__etikettS = s0; }
  // tekst(g, t, x, y, retning, prio): måler teksten med skriften som er satt i g, og gir y-en den skal tegnes i (NaN i en ramme:
  // navnet tegnes av tegnAlle)
  function tekst(g, t, x, y, retning, prio) {
    const v = vurder(String(t));
    if (!aktiv || !g || typeof g.measureText !== 'function') { if (v === false) return NaN; return plass(x, y, g.measureText(t).width, retning); }
    if (v === false || !isFinite(x) || !isFinite(y)) return NaN;
    pakkInn(g); const P = REGLER.prio, L = { t: String(t), x, y, w: g.measureText(t).width, h: LINJE, retning: retning < 0 ? -1 : 1, nr: kø.length,
      prio: typeof v === 'number' ? v : typeof prio === 'number' ? prio : retning < 0 ? P.kjøretøy : P.sted,
      font: g.font, align: g.textAlign, baseline: g.textBaseline, alpha: g.globalAlpha, fyll: null, strek: null, bredde: 3 };
    kø.push(L); g.__etikettSiste = L; return NaN;
  }
  // ---------- én skrift i kartet (runde 12) ----------
  // kartFont(font): «11px sans-serif» -> «600 12.7px "Cormorant Garamond", Georgia, serif»; andre skrifter som før (ren regel, testes)
  const SANS = /(^|[\s,])(sans-serif|Arial|Helvetica|system-ui|-apple-system|"?Segoe UI"?)\s*(,|$)/i, fontLager = new Map();
  function kartFont(font, R = REGLER) { const f = String(font); if (!SANS.test(f) || /Cormorant|serif\s*$/i.test(f.replace(/sans-serif/ig, ''))) return f;
    if (fontLager.has(f)) return fontLager.get(f);
    const m = f.match(/^\s*(.*?)\s*(\d+(?:\.\d+)?)px(?:\/\S+)?\s+(.+)$/); if (!m) return f;
    let stil = m[1].replace(/\b(normal|lighter)\b/ig, '').trim(); const vekt = stil.match(/\b(bold|bolder|[1-9]00)\b/i);
    if (!vekt) stil = (stil + ' ' + R.sansVekt).trim(); else if (/^[1-5]00$/.test(vekt[1])) stil = stil.replace(vekt[1], String(R.sansVekt));
    const ut = `${stil} ${Math.round(+m[2] * R.sansSkala * 10) / 10}px ${R.kartSkrift}`; if (fontLager.size < 200) fontLager.set(f, ut); return ut; }
  // skrift(g): kartets lerret får en font-egenskap som bytter sans-serif med kartets skrift MENS en ramme pågår (nullstill … tegnAlle);
  // tegnHud og alt utenom rammen er som før
  function skrift(g) { if (!g || g.__skrift) return; let o = Object.getPrototypeOf(g), D = null; while (o && !(D = Object.getOwnPropertyDescriptor(o, 'font'))) o = Object.getPrototypeOf(o);
    if (!D || !D.set || !D.get) return; g.__skrift = true;
    Object.defineProperty(g, 'font', { configurable: true, get() { return D.get.call(this); }, set(v) { D.set.call(this, aktiv ? kartFont(v) : v); } }); }
  // øverst(fn): tegnes etter navnene (fiendens merker skal alltid synes)
  function øverst(fn) { if (aktiv) topp.push(fn); else fn(); }
  // TALL: skriv sifrene i en skrift med vanlige tall (0 ikke som o, 1 ikke som I) når navnet bruker Cormorant Garamond
  const harTall = t => /\d/.test(t);
  function tallFont(font) { return font.replace(/(\d+(?:\.\d+)?)px\s+.*$/, (s, px) => `${Math.round(px * REGLER.tallSkala * 10) / 10}px ${REGLER.tallSkrift}`); }
  function skriv(g, L, x, y, fyll) {
    const f0 = g.__etikettF || g.fillText, s0 = g.__etikettS || g.strokeText, tegn = fyll ? f0 : s0;
    if (!harTall(L.t) || !/Cormorant/i.test(L.font || '')) { tegn.call(g, L.t, x, y); return; }
    const deler = L.t.split(/(\d+(?:[.,]\d+)*)/).filter(Boolean), fonter = deler.map(d => (/^\d/.test(d) ? tallFont(L.font) : L.font));
    const bredder = deler.map((d, i) => { g.font = fonter[i]; return g.measureText(d).width; }), sum = bredder.reduce((a, b) => a + b, 0);
    let x0 = L.align === 'center' ? x - sum / 2 : L.align === 'right' || L.align === 'end' ? x - sum : x; const a0 = g.textAlign; g.textAlign = 'left';
    deler.forEach((d, i) => { g.font = fonter[i]; tegn.call(g, d, x0, y); x0 += bredder[i]; }); g.textAlign = a0; g.font = L.font; }
  // skrivTekst(g, t, x, y, fyll): som fillText (fyll) / strokeText, men sifrene i en skrift med vanlige tall (for tekst utenom køen)
  function skrivTekst(g, t, x, y, fyll) { skriv(g, { t: String(t), font: g.font, align: g.textAlign }, x, y, fyll); }
  // tegnAlle(g, fortsett): plasserer og tegner navnene i køen (de minst viktige først, så de viktigste ligger øverst), og så det som
  // skal ligge øverst. fortsett = true: rammen er ikke ferdig (byggevisningen tegner navn i to omganger)
  function tegnAlle(g, fortsett) {
    // navn som tegneren aldri tegnet (ingen farge fanget), tas ut
    for (let i = kø.length - 1; i >= 0; i--) if (!kø[i].fyll && !kø[i].strek && g) kø.splice(i, 1);
    // (runde 13) lag og kjøretøy ved leiren blir én lapp (samleSted)
    if (samleS && kø.length) { const s = samle(kø, samleS); if (s) { const f = s.inne[0], t = typeof samleS.tekst === 'function' ? samleS.tekst(s.n) : samleTekst(s.n);
      for (let i = kø.length - 1; i >= 0; i--) if (kø[i].samlet) kø.splice(i, 1);
      let w = t.length * 6.5; if (g && g.measureText) { const f0 = g.font; g.font = f.font; w = g.measureText(t).width; g.font = f0; }
      const L = { t, x: samleS.x, y: samleS.y + REGLER.samle.dy, w, h: LINJE, retning: 1, prio: REGLER.prio.egne, nr: -1, font: f.font, align: 'center', baseline: 'alphabetic', alpha: 1,
        fyll: '#f0d79a', strek: f.strek || 'rgba(20,16,10,.85)', bredde: f.bredde || 3, samling: true };
      kø.push(L); samlet = { L, n: s.n, navn: s.inne.map(q => q.t) }; } samleS = null; }
    if (kø.length) { plasser(kø, hindre.concat(vist.map(L => ({ r: L.ramme, prio: L.prio, tekst: false })))); const rek = kø.filter(L => L.vis).sort((a, b) => a.prio - b.prio || a.nr - b.nr);
      if (g) { g.save(); for (const L of rek) { g.font = L.font; g.textAlign = L.align || 'center'; g.textBaseline = L.baseline || 'alphabetic'; g.globalAlpha = L.alpha == null ? 1 : L.alpha;
        if (L.strek) { g.lineWidth = L.bredde || 3; g.lineJoin = 'round'; g.strokeStyle = L.strek; skriv(g, L, L.px, L.py, false); }
        g.fillStyle = L.fyll || '#e7dcc3'; skriv(g, L, L.px, L.py, true);
        if (L.flere > 0) { const t = '+' + L.flere, x0 = L.align === 'center' ? L.px + L.w / 2 + 4 : L.px + L.w + 4; g.save(); g.textAlign = 'left'; g.font = '600 11px ' + REGLER.tallSkrift; g.globalAlpha = .85;
          g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; (g.__etikettS || g.strokeText).call(g, t, x0, L.py); g.fillStyle = '#f0d79a'; (g.__etikettF || g.fillText).call(g, t, x0, L.py); g.restore(); } } g.restore(); }
      for (const L of rek) { vist.push(L); tatt.push(L.ramme); }
      kø.length = 0; }
    if (g) g.__etikettSiste = null;
    const T = topp.splice(0); for (const f of T) { try { f(); } catch (e) { /* et merke som ikke kan tegnes, hoppes over */ } }
    if (!fortsett) aktiv = false; }
  // overlapp(): antall par av navn som fortsatt ligger oppå hverandre i denne rammen (0 når alt fikk plass) – for vakten i sjekk.js.
  // Utsatt modus: navn som er tegnet, mot hverandre og mot kartnavnene (de viktigste som står oppå et kartnavn med vilje, telles ikke).
  function overlapp() { let n = 0;
    if (vist.length) { for (let i = 0; i < vist.length; i++) { for (let j = i + 1; j < vist.length; j++) if (over(vist[i].ramme, vist[j].ramme)) n++;
      if (!vist[i].tvunget && vist[i].prio < REGLER.tving) for (const o of hindre) if (o.tekst && over(vist[i].ramme, o.r)) n++; } return n; }
    for (let i = 0; i < tatt.length; i++) for (let j = i + 1; j < tatt.length; j++) { const r = tatt[i], q = tatt[j];
      if (r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]) n++; } return n; }
  // for vakten: navnene som ble tegnet i siste ramme ({ t, x, y, prio }) og merkene
  const tegnet = () => vist.map(L => ({ t: L.t, x: L.px, y: L.py, prio: L.prio, flere: L.flere || 0, ramme: L.ramme.slice() }));
  // (runde 13) den samlede lappen i siste ramme: { t, ramme, n, navn } – eller null (ikke samlet, eller den fikk ikke plass)
  const samling = () => (samlet && samlet.L.vis && samlet.L.ramme ? { t: samlet.L.t, ramme: samlet.L.ramme.slice(), n: { ...samlet.n }, navn: samlet.navn.slice() } : null);
  const E = { nullstill, plass, merk, tekst, kartFont, skrift, hinder, regel, øverst, tegnAlle, skrivTekst, plasser, kandidater, ramme, tegnet, samleSted, samle, samleTekst, samling, hindringer: () => hindre.map(o => o.r.slice()),
    aktiv: () => aktiv, antall: () => tatt.length, overlapp, LINJE, MAKS, REGLER };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else { rot.Etikett = E;
    // hovedkartets lerret (index.html: <canvas id="c">) – samme kontekst som ctx i index.html
    try { const c = typeof document !== 'undefined' && document.getElementById('c'); if (c && c.getContext) skrift(c.getContext('2d')); } catch (e) { /* uten lerret */ } }
})(typeof window !== 'undefined' ? window : globalThis);
