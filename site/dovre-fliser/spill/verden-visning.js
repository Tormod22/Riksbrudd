'use strict';
// VERDEN SOM GJØR NOE i kartet (regler: spill/verden.js; natt til 18. nov, pakke «verden»).
// Vinter (snø bremser marsj, kolonner står fast på fjellet i snøvær, isen bærer, kulde tærer), flom og ras etter mye regn, jakt (du selv
// og jaktlag), åker (så om våren, høst om høsten), brann som sprer seg, funn i terrenget, radiomeldinger og tog.
// Panelet «Verden» (#verdenpanel) åpnes fra kommandolinja nederst, fra Leir-menyen (fanen Mål) eller ved å trykke på værflisa øverst.
// I TESTENE (navigator.webdriver) SKJER INGENTING AV SEG SELV: VerdenSpill.test = true slår det på. Det spilleren selv gjør
// (tenne på, jakte, så, undersøke funn, sette tog i gang) virker alltid.
// FOR ANDRE MODULER (pakka «natur» tegner brannen i 3D):
//   window.BRANNER = [{ x, y, r, fra, til }]  ruter som brenner nå: midten i kartmeter, r = halve rutebredden (32 m), spillminutter
//   window.BRENT   = [{ x, y, r, t }]         ruter som har brent ut (t = spillminuttet det sloknet)
//   Hendelsen «riksbrudd-brann» på window sendes hver gang listene er endret (listene er de samme objektene hele tiden).
//   window.VERDEN_SONER() = [{ type: 'flom' | 'ras', x, y, r, til }], window.VERDEN_IS = true når isen bærer.
(function () {
  const W = Verden, R = W.REGLER, NØKKEL = 'riksbrudd-natur', api = { test: false };
  let V = W.ny(), leirId = '', klar = false, sistT = null, sistTime = null, sistBrann = null, sistSkade = null, skittenLagring = false, åpen = false, sistHtml = '';
  const auto = () => !navigator.webdriver || api.test;
  const spill = () => window.OppstartSpill && OppstartSpill.tilstand();
  const leir = () => { const S = spill(); return S && S.leir ? S.leir : null; };
  const LL = () => (window.LeirSpill && LeirSpill.tilstand()) || null;
  const FF = () => (window.FolkSpill && FolkSpill.tilstand()) || null;
  const vær = () => { const v = window.VAER; return v ? (v.regel || v) : null; };
  const rng = Terreng.frø(1814);
  // ÅKEREN SOM BYGG (runde 4): legges inn i Leir.BYGG slik overlev.js legger inn brønnen (leir.js er ikke endret). Ingen modell i
  // leir-visning.js (den setter byggene flatt på det høyeste punktet) – åkeren følger terrenget og tegnes her, i 2D og 3D.
  const ÅB = R.åkerBygg;
  if (window.Leir && !Leir.BYGG.åker) Leir.BYGG.åker = { navn: `Åker (${ÅB.mål} mål)`, pris: R.åker.rydd * ÅB.mål / R.åker.ryddMål, tid: ÅB.tid, kw: 0, modell: 'åker', fot: [-ÅB.bredde / 2, ÅB.bredde / 2, -ÅB.lengde / 2, ÅB.lengde / 2], mat: {}, åker: true,
    tekst: 'Pløyd jord: så om våren og høst om høsten (panelet «Verden»). Tørt korn brenner lett.' };
  if (window.Ikoner && Ikoner.BYGG && !Ikoner.BYGG.åker) Ikoner.BYGG.åker = 'blad';
  const BRANNER = window.BRANNER = [], BRENT = window.BRENT = [];
  window.VERDEN_SONER = () => V.soner.map(s => ({ type: s.type, x: s.x, y: s.y, r: s.r, til: s.til }));
  // (runde 4) er (x, y) i en sone? Flommer følger dalen (flomfeltet), så sirkelen over er bare en grov ramme rundt dem.
  window.VERDEN_I_SONE = (x, y, type) => { const s = iSoneV(x, y, type); return s ? { type: s.type, x: s.x, y: s.y, r: s.r, til: s.til } : null; };
  const tall = (n, d = 0) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: d }).format(n);

  // ---------- lagring per leir ----------
  function lagre() { skittenLagring = false; if (!klar) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...V })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null;
    try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    V = d && d.leir === leirId ? W.fraJSON(d) : W.ny(); klar = true; sistT = null; sistTime = null; stengt.clear(); brannLister(); skitten = true;
    if (window.Dyr3d && Dyr3d.settFelte) Dyr3d.settFelte(V.jakt.felt || []);
    feltFor.clear(); feltVenter.clear(); for (const s of V.soner) if (s.type === 'flom' && s.kilde) lagFlomfelt(s);
  }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  window.addEventListener('pagehide', () => { if (skittenLagring) lagre(); });
  setInterval(() => { if (skittenLagring) lagre(); }, 5000);
  const endret = () => { skittenLagring = true; };

  // ---------- terrenget: høyde og klasse der vi trenger det (vinduer fra lagVindu, husket) ----------
  const vinduer = [], venter = new Map();
  function vinduFor(x, y) { for (const v of vinduer) if (x >= v.x0 && x < v.x0 + v.w * v.r && y <= v.y0 && y > v.y0 - v.h * v.r) return v; return null; }
  function hentVindu(x, y) {
    const k = Math.floor(x / 2000) + ',' + Math.floor(y / 2000); if (venter.has(k)) return venter.get(k);
    const p = lagVindu([x - 40, y - 40, x + 40, y + 40], false).then(v => { if (v && v.w && !vinduFor(x, y)) { vinduer.push(v); if (vinduer.length > 24) vinduer.shift(); } venter.delete(k); return v; })
      .catch(() => { setTimeout(() => venter.delete(k), 5000); return null; });
    venter.set(k, p); return p;
  }
  const les = (v, x, y) => { const [i, j] = Terreng.rute(v, x, y), q = j * v.w + i, h = v.H[q]; return { h: h === h ? h : null, k: v.K[q] }; };
  // straks: det vi vet nå (null når kartet der ikke er hentet – det bestilles)
  function punkt(x, y) { const v = vinduFor(x, y); if (!v) { hentVindu(x, y); return null; } return les(v, x, y); }
  async function punktA(x, y) { let v = vinduFor(x, y); if (!v) { await hentVindu(x, y); v = vinduFor(x, y); } return v ? les(v, x, y) : null; }
  function moh(x, y) { const h = hoydeVed(x, y); if (h != null) return h; const p = punkt(x, y); return p ? p.h : null; }
  const leirMoh = () => { const l = leir(); const h = l ? moh(l.x, l.y) : null; return h == null ? R.temp.dal : h; };

  // ---------- tettsteder ----------
  let byListe = null, byAntall = -1;
  function byer() {
    const alle = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted; if (!alle) return [];
    if (byListe && byAntall === alle.length) return byListe; byAntall = alle.length;
    byListe = alle.map(by => { let p = null; try { p = typeof navnP === 'function' ? navnP(by) : null; } catch (e) { p = null; }
      const x = p && isFinite(p[0]) ? p[0] : (by.bb[0] + by.bb[2]) / 2, y = p && isFinite(p[1]) ? p[1] : (by.bb[1] + by.bb[3]) / 2; return { id: by.e.id, navn: by.e.navn, x, y, ref: by }; });
    return byListe;
  }
  const eier = id => { try { return Garnison.tilstand(TETTSTEDER, id).eier; } catch (e) { return null; } };
  function iBy(x, y) { for (const b of byer()) { const bb = b.ref.bb; if (bb && (x < bb[0] || y < bb[1] || x > bb[2] || y > bb[3])) continue; try { if (Garnison.inni(b.ref, x, y)) return b; } catch (e) { /* uten omriss */ } } return null; }
  function nærmesteBy(x, y) { let best = null, bd = Infinity; for (const b of byer()) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; best = b; } } return best ? { ...best, avst: bd } : null; }
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // «2 km nord for Dombås» / «3 km vest for leiren»
  function stedTekst(x, y) {
    const b = nærmesteBy(x, y), l = leir(), dl = l ? Math.hypot(x - l.x, y - l.y) : Infinity;
    if (b && b.avst < dl) return b.avst < 600 ? 'ved ' + b.navn : `${tall(b.avst / 1000, 1)} km ${retning(x - b.x, y - b.y)} for ${b.navn}`;
    if (l) return dl < 400 ? 'ved leiren' : `${tall(dl / 1000, 1)} km ${retning(x - l.x, y - l.y)} for leiren`;
    return 'i terrenget';
  }

  // ---------- det leiren får ----------
  function gi(g) {
    const L = LL(), F = FF(), fikk = [];
    for (const m of ['tre', 'betong', 'stål']) if (g[m] > 0 && L && window.Leir) { const n = Leir.leggInn(L, m, g[m]); if (n > 0) fikk.push(`${tall(n)} ${m}`); }
    if (g.drivstoff > 0 && L && window.Leir) { const d = Math.min(Math.max(0, Leir.kapasitet(L) - (L.drivstoff || 0)), g.drivstoff); if (d > 0) { L.drivstoff = (L.drivstoff || 0) + d; fikk.push(`${tall(d)} l diesel`); } }
    if (g.mat > 0 && F) { F.mat += g.mat; fikk.push(`${tall(g.mat)} rasjoner`); }
    if (g.kr > 0 && window.OppstartSpill) { OppstartSpill.gi(g.kr); fikk.push(`${tall(g.kr / 1e6, 1)} mill. kr`); }
    return fikk;
  }

  // ---------- 31 vinter: marsjen, isen, kulda ----------
  // Stien til et lag får tiden per stykke delt på faktoren der (snø, snøvær, flom, ras). Regnes alltid fra den opprinnelige tiden.
  function tilpassSti(s, v) {
    if (s._vSti !== s.sti) { s._vSti = s.sti; s._vOrig = Array.from(s.steg || []); s._vForsøk = 0; s._vMeldt = false; }
    const O = s._vOrig; if (!O || !O.length) return; let minst = 1, sum = 0, ukjent = false; const res = l => l == null ? leirMoh() : l;
    for (let k = 0; k < s.sti.length - 1; k++) {
      const mx = (s.sti[k][0] + s.sti[k + 1][0]) / 2, my = (s.sti[k][1] + s.sti[k + 1][1]) / 2, h = moh(mx, my); if (h == null) ukjent = true;
      let f = W.marsjFaktor(v, res(h)); const so = iSoneV(mx, my); if (so) f *= so.type === 'flom' ? R.regn.vasser : R.regn.rasFart;
      if (k >= s.seg) { s.steg[k] = (O[k] || 1e-9) / f; sum += s.steg[k] * (k === s.seg ? 1 - (s.prog || 0) : 1); minst = Math.min(minst, f); }
    }
    // uten snø, flom og ras står marsjen som den var
    if (minst < 1 || s._vEndret) { s.timerIgjen = sum; s._vEndret = minst < 1; }
    s.verdenF = minst; s._vNøkkel = nøkkel(v);
    if (minst < 1 && !s._vMeldt && s.side === 'blå' && klar) { s._vMeldt = true; const hva = V.soner.length && !(W.marsjFaktor(v, leirMoh()) < 1) && !(v.snø > .5) ? 'flom eller ras på ruta' : 'snø';
      logg(`${s.navn}: tungt føre (${hva}) – marsjen tar ca. ${tall(Math.max(0, s.timerIgjen), 1)} t.`); if (valgt === s) visPanel(); }
    // høyder som ikke var hentet ennå: prøv igjen noen ganger
    if (ukjent && s._vForsøk++ < 6) s._vNøkkel = null;
  }
  const nøkkel = v => (v.snø > .5 ? 's' : '') + (v.vær === 'storm' ? 'k' : '') + Math.round(v.snøgrense / 50) + '|' + V.soner.length + '|' + feltFor.size;
  function marsjSteg(v) {
    for (const s of ENHETER) {
      if (!s.sti || !s.steg) { if (s._vSti) { s._vSti = null; s._vOrig = null; s.verdenF = 1; } continue; }
      if (s._vSti !== s.sti || s._vNøkkel !== nøkkel(v)) tilpassSti(s, v);
    }
  }
  function isSteg() { const is = auto() && W.isBærer(V); if (!!window.VERDEN_IS !== is) { window.VERDEN_IS = is; Terreng.fart.is = is ? R.is.fart : 0; if (klar) logg(is ? 'Isen på vannene bærer nå: lagene kan gå over.' : 'Isen er ikke trygg lenger.'); } }
  // kolonner på fjellet i snøvær blir stående (ikke de som kjører faste oppdrag for økonomien)
  function snøVeg(v) {
    if (!(v.snø > .5) || typeof KJORETOY === 'undefined' || !window.Kjoretoy) return;
    for (const k of KJORETOY) { if (!k.sti || k.oppdrag || (k.side && k.side !== 'blå')) continue; const h = moh(k.x, k.y); if (h == null || !W.vegStengt(v, h)) continue;
      Kjoretoy.stopp(k); logg(`${k.navn} står fast i snøen på fjellet (${Math.round(h)} moh.). Vent til snøværet gir seg.`); skitten = true; }
  }
  // SNØ STENGER HØYE VEGLENKER (runde 4): mens det snør (og «brøyt» timer etter), er veglenker over fjellgrensen/snøgrensen stengt.
  // Høyden regnes bare der det trengs: når en rute bes om (Kjoretoy.planlegg pakkes inn – lenker vi alt vet er for høye, er ikke lov)
  // og for lenkene på rutene til kolonner som kjører (høydene hentes da). Lenkene vi finner, sperres i vegnettet og åpnes igjen etterpå.
  const snøLenker = new Set(), lenkeH = new Map();
  let snøGrense = null, sistSnø = -1e9, sistSnøSjekk = -1e9;
  // høyden på et punkt uten å hente noe (null = ukjent)
  function mohKjent(x, y) { let h = null; try { h = hoydeVed(x, y); } catch (e) { h = null; } if (h != null) return h; const v = vinduFor(x, y); return v ? les(v, x, y).h : null; }
  // TUNNELER stenges ikke av snø: midten av en tunnel ligger under fjellet (terrenget over den er høyt). En lenke er en tunnel når midten
  // ligger innen 30 m av en tunnel i INFRA.tunnel, eller når den er nesten rett (geometrien under 6 % lengre enn luftlinja) og midten
  // ligger over 50 m høyere enn begge endene (Claudes forslag). Da teller bare endene (portalene).
  let tunListe = null, tunAntall = -1;
  function tunneler() {
    const T = typeof INFRA !== 'undefined' && INFRA && INFRA.tunnel; if (!T) return []; if (tunListe && tunAntall === T.length) return tunListe; tunAntall = T.length; tunListe = [];
    for (const o of T) for (const d of o.deler || []) { const P = Array.isArray(d[0]) ? d : []; if (!P.length) for (let i = 0; i + 1 < d.length; i += 2) P.push([d[i], d[i + 1]]); if (P.length < 2) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } tunListe.push({ P, bb: [x0, y0, x1, y1] }); }
    return tunListe;
  }
  const nærTunnel = (x, y, tol = 30) => tunneler().some(t => x >= t.bb[0] - tol && x <= t.bb[2] + tol && y >= t.bb[1] - tol && y <= t.bb[3] + tol && t.P.some((p, i) => i && avstSeg(x, y, t.P[i - 1][0], t.P[i - 1][1], p[0], p[1]) <= tol));
  // høydene langs lenken: start, midten og slutt (husket når alle tre er kjent). hent = be om kartet der det mangler.
  function lenkeHøyder(g, e, hent) {
    if (lenkeH.has(e)) return lenkeH.get(e); let L; try { L = g.linje(e); } catch (er) { return []; }
    const pkt = [L[0], L[L.length >> 1], L[L.length - 1]], hs = pkt.map(p => hent ? moh(p[0], p[1]) : mohKjent(p[0], p[1]));
    let geo = 0; for (let i = 1; i < L.length; i++) geo += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); const rett = geo < 1.06 * Math.hypot(L[L.length - 1][0] - L[0][0], L[L.length - 1][1] - L[0][1]);
    if (nærTunnel(pkt[1][0], pkt[1][1]) || (rett && hs.every(h => h != null) && hs[1] > Math.max(hs[0], hs[2]) + 50)) hs.splice(1, 1);
    if (hs.every(h => h != null)) { lenkeH.set(e, hs); if (lenkeH.size > 20000) lenkeH.delete(lenkeH.keys().next().value); } return hs;
  }
  // pakk inn rutesøket: når snøen stenger, er lenker over grensen ikke lov (bare de vi kjenner høyden til)
  (function pakkPlanlegg() {
    if (!window.Kjoretoy || Kjoretoy.planlegg.verden) return; const før = Kjoretoy.planlegg;
    const ny = function (kj, graf, mål, valg = {}) {
      if (snøGrense == null || !graf || !graf.linje) return før.call(this, kj, graf, mål, valg);
      const t0 = valg.tillat, grense = snøGrense;
      return før.call(this, kj, graf, mål, { ...valg, tillat: l => (!t0 || t0(l)) && !snøLenker.has(l.id) && !W.lenkeStengt(grense, lenkeHøyder(graf, l.id, false)) });
    };
    ny.verden = true; Kjoretoy.planlegg = ny;
  })();
  function åpneSnø() { const g = window.VEGNETT, flom = new Set(); for (const l of stengt.values()) for (const e of l) flom.add(e);
    if (g) for (const e of snøLenker) if (!(g._sperretAv && g._sperretAv.has(e)) && !flom.has(e)) g.åpne(e); snøLenker.clear(); }
  // kolonnene som kjører: ligger det en stengt lenke foran dem? Da sperres den, og de kjører om – eller blir stående.
  function snøRuter() {
    const g = window.VEGNETT; if (!g || snøGrense == null || typeof KJORETOY === 'undefined') return 0; let n = 0;
    for (const k of KJORETOY) { if (!k.sti) continue; let lenker; try { lenker = Kjoretoy.lenkerIgjen(k); } catch (e) { continue; }
      const høye = lenker.filter(e => !snøLenker.has(e) && W.lenkeStengt(snøGrense, lenkeHøyder(g, e, true)));
      if (!høye.length) continue; n++; for (const e of høye) { snøLenker.add(e); g.sperr(e); }
      const P = k.sti.P, r = Kjoretoy.planlegg(k, g, [P[P.length - 2], P[P.length - 1]]), egen = !k.side || k.side === 'blå';
      if (r.feil) { Kjoretoy.stopp(k); k.oppdrag = null; if (egen) logg(`${k.navn}: snøen har stengt fjellvegen (over ${tall(snøGrense)} moh.), og det finnes ingen omkjøring. Kolonnen venter til vegen er brøytet.`); }
      else if (egen) logg(`${k.navn} kjører om: vegen over ${tall(snøGrense)} moh. er stengt av snø.`);
      skitten = true; }
    return n;
  }
  function snøVegSteg(v) {
    if (v.snø > .5) sistSnø = tid; const g = W.snøVegGrense(v, (tid - sistSnø) / 60);
    if (g !== snøGrense) { const før = snøGrense; snøGrense = g; lenkeH.clear();
      if (g == null) { åpneSnø(); if (klar) logg('Fjellvegene er brøytet og åpne igjen.'); }
      else { if (før != null) åpneSnø(); sistSnøSjekk = -1e9; if (klar && før == null) logg(`Snøværet stenger vegene over ${tall(g)} moh. Kolonner som skal over fjellet, kjører om eller venter.`); } }
    if (g != null && (tid - sistSnøSjekk >= R.snø.sjekk || tid < sistSnøSjekk)) { sistSnøSjekk = tid; snøRuter(); }
  }
  function kuldeTime(v, timer) {
    const l = leir(), L = LL();
    for (const s of ENHETER) {
      if (!levende(s) || s.leirvakt) continue;
      // fiendens lag fryser også (runde 4): ute = ikke i et tettsted og ikke om bord; de har ingen leir å gå til
      const egen = s.side === 'blå', id = egen ? s.navn : s.side + ':' + s.navn;
      const ute = !(egen && l && Math.hypot(s.x - l.x, s.y - l.y) < R.kulde.læ) && !s.ombord && !iBy(s.x, s.y), h = moh(s.x, s.y);
      const t = W.tempVed(v, h == null ? leirMoh() : h), før = V.kulde[id] || 0, n = W.kuldeSteg(V, id, timer, t, ute), nå = V.kulde[id] || 0, varsel = R.kulde.timerFør * .6;
      if (egen && før < varsel && nå >= varsel && !n) logg(`${s.navn} begynner å fryse (${Math.round(t)} °C). Få dem til leiren eller inn i et tettsted før noen får frostskader.`);
      if (!n) continue;
      if (!egen) { for (let i = 0; i < n; i++) { const friske = s.menn.filter(m => m.hp >= 1); if (!friske.length) break; friske[Math.floor(rng() * friske.length)].hp = .5; }
        s.siktSkitten = true; if (s.menn[s.leder] && s.menn[s.leder].hp < 1) { const ny = s.menn.findIndex(q => q.hp >= 1); if (ny >= 0) s.leder = ny; }
        if (typeof synlig === 'function' && synlig(s)) logg(`${s.navn} (fienden) fryser ute i ${Math.round(t)} °C og har fått frostskader.`); endret(); continue; }
      // kulda sårer, men dreper ikke: en frisk mann blir såret
      const ut = []; for (let i = 0; i < n; i++) { const friske = s.menn.filter(m => m.hp >= 1); if (!friske.length) break; const m = friske[Math.floor(rng() * friske.length)]; m.hp = .5; ut.push(m.navn); }
      if (!ut.length) continue; s.siktSkitten = true;
      logg(`${s.navn} fryser ute i ${Math.round(t)} °C: ${ut.join(', ')} har fått frostskader. Få dem til leiren eller inn i et tettsted.`);
      if (s.menn[s.leder] && s.menn[s.leder].hp < 1) { const ny = s.menn.findIndex(q => q.hp >= 1); if (ny >= 0) s.leder = ny; }
      if (valgt === s) visPanel(); endret();
    }
    // leiren fyrer mer i sprengkulde
    const ved = W.vedEkstra(v.temp, timer / 24);
    if (ved > 0 && L && L.lager && FF() && FF().personer && FF().personer.length) { const før = L.lager.tre || 0; L.lager.tre = Math.max(0, før - ved); if (før > 0 && L.lager.tre <= 0) logg('Kulda har brukt opp veden i leiren. Hogg eller kjøp tre.'); }
  }

  // ---------- 32 flom og ras ----------
  // FLOM ETTER REGN I FLOMFELTET (runde 4): vannet følger dalen nedover fra elva (Flom.flomvei/flomfelt i spill/flom.js med
  // REGLER.regnflom), ikke en sirkel. Feltet ligger i minnet (feltFor: sone-id -> felt, null = kunne ikke lages: sirkel som før) og
  // regnes ut på nytt etter innlasting fra s.kilde = [x, y]. Flommer uten kilde (gamle lagrede spill) er sirkler.
  const feltFor = new Map(), feltVenter = new Map();
  function lagFlomfelt(s) {
    if (feltFor.has(s.id)) return Promise.resolve(feltFor.get(s.id)); if (feltVenter.has(s.id)) return feltVenter.get(s.id);
    const p = (async () => {
      if (!window.Flom || !s.kilde || typeof lagVindu !== 'function') return null; const [x, y] = s.kilde, F = R.regnflom, D = F.lengde + F.bredde + 300;
      const v = await lagVindu([x - D, y - D, x + D, y + D], false); if (!v || !v.w) return null;
      const sti = Flom.flomvei(v, x, y, F); if (!sti.length) return null; const { maske, antall, flate } = Flom.flomfelt(v, sti, F); if (!antall) return null;
      let i0 = v.w, j0 = v.h, i1 = -1, j1 = -1; for (let j = 0; j < v.h; j++) for (let i = 0; i < v.w; i++) if (maske[j * v.w + i]) { if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j; }
      const w = i1 - i0 + 1, h = j1 - j0 + 1, m = new Uint8Array(w * h), dyp = new Float32Array(w * h), c = lerret(w, h), g = c.getContext('2d'), im = g.createImageData(w, h); let sx = 0, sy = 0, n = 0;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = (j0 + j) * v.w + i0 + i; if (!maske[q]) continue; m[j * w + i] = 1; dyp[j * w + i] = Math.max(0, flate[q] - v.H[q]);
        const k = (j * w + i) * 4; im.data[k] = 74; im.data[k + 1] = 127; im.data[k + 2] = 176; im.data[k + 3] = 255; sx += i; sy += j; n++; }
      g.putImageData(im, 0, 0); const c4 = lerret(w * 4, h * 4), g4 = c4.getContext('2d'); g4.imageSmoothingEnabled = true; if ('filter' in g4) g4.filter = 'blur(3px)'; g4.drawImage(c, 0, 0, w * 4, h * 4);
      const felt = { x0: v.x0 + i0 * v.r, y0: v.y0 - j0 * v.r, r: v.r, w, h, maske: m, dyp, c: c4, antall };
      // midten (navnet i kartet) og en radius som dekker feltet (det andre moduler ser i VERDEN_SONER)
      const mx = felt.x0 + (sx / n + .5) * v.r, my = felt.y0 - (sy / n + .5) * v.r; let rr = 0; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (m[j * w + i]) rr = Math.max(rr, Math.hypot(felt.x0 + (i + .5) * v.r - mx, felt.y0 - (j + .5) * v.r - my));
      if (V.soner.includes(s)) { s.x = Math.round(mx); s.y = Math.round(my); s.r = Math.round(rr + v.r / 2); endret(); }
      return felt; })().catch(e => { console.error(e); return null; }).then(f => { feltFor.set(s.id, f); feltVenter.delete(s.id); skitten = true; return f; });
    feltVenter.set(s.id, p); return p;
  }
  // Er (x, y) i en sone? Som Verden.iSone, men flommer med felt bruker feltet
  function iSoneV(x, y, type) { for (const s of V.soner) { if (type && s.type !== type) continue; const f = s.type === 'flom' ? feltFor.get(s.id) : null; if (f ? Flom.iFlom(f, x, y) : Math.hypot(s.x - x, s.y - y) <= s.r) return s; } return null; }
  const stengt = new Map();
  async function stengVeger(s) {
    if (stengt.has(s.id)) return; if (s.type === 'flom' && s.kilde && !feltFor.has(s.id)) { await lagFlomfelt(s); if (stengt.has(s.id)) return; }
    const felt = s.type === 'flom' ? feltFor.get(s.id) : null; let g = window.VEGNETT;
    // vegnettet er stort: i testene hentes det ikke bare for dette
    if (!g) { if (navigator.webdriver || !window.lastVegnett) return; try { g = await lastVegnett(); } catch (e) { return; } }
    if (stengt.has(s.id) || !V.soner.includes(s)) return; const lenker = []; stengt.set(s.id, lenker);
    const pkt = [[s.x, s.y]]; if (felt) { pkt.length = 0; for (let j = 0; j < felt.h; j += 2) for (let i = 0; i < felt.w; i += 2) if (felt.maske[j * felt.w + i]) pkt.push([felt.x0 + (i + .5) * felt.r, felt.y0 - (j + .5) * felt.r]); }
    else if (s.r > 120) for (let a = 0; a < 8; a++) pkt.push([s.x + Math.cos(a * Math.PI / 4) * s.r * .6, s.y + Math.sin(a * Math.PI / 4) * s.r * .6]);
    for (const p of pkt) { const n = g.naermeste(p, felt ? felt.r * 1.5 : Math.max(120, s.r * .5)); if (n === -1) continue; const q = g.punkt(n); if (felt ? !Flom.iFlom(felt, q[0], q[1]) : Math.hypot(q[0] - s.x, q[1] - s.y) > s.r) continue;
      for (const e of g.lenkerVed(n)) if (!g.lenke(e).sperret) { g.sperr(e); lenker.push(e); } }
    if (!lenker.length) return; const sett = new Set(lenker);
    for (const k of KJORETOY) { if (!k.sti || !Kjoretoy.lenkerIgjen(k).some(e => sett.has(e))) continue; const P = k.sti.P, r = Kjoretoy.planlegg(k, g, [P[P.length - 2], P[P.length - 1]]);
      if (r.feil) { Kjoretoy.stopp(k); k.oppdrag = null; logg(`${k.navn}: vegen er stengt av ${s.type === 'ras' ? 'raset' : 'flommen'}, og det finnes ingen omkjøring.`); } else if (!k.side || k.side === 'blå') logg(`${k.navn} kjører om ${s.type === 'ras' ? 'raset' : 'flommen'}.`); }
  }
  function åpneVeger(s) { const g = window.VEGNETT, l = stengt.get(s.id); stengt.delete(s.id); if (g && l) for (const e of l) if (!g._sperretAv || !g._sperretAv.has(e)) g.åpne(e); }
  function nySone(type, x, y, r, navn, kilde) {
    const s = W.nySone(V, type, x, y, r, tid, navn); if (kilde) s.kilde = kilde; stengVeger(s).catch(e => console.error(e)); skitten = true; endret();
    for (const e of ENHETER) if (e.side === 'blå' && levende(e) && iSoneV(e.x, e.y) === s && type === 'ras') { const ut = Terreng.fordelTreff(e.menn, 1, rng); logg(`${e.navn} ble tatt av raset: ${ut.map(([m, t]) => `${m.navn} ${t}`).join(', ')}.`); e.siktSkitten = true; }
    return s;
  }
  function flom(x, y, orden, navn) { const s = nySone('flom', x, y, W.flomRadius(V, orden || 3), navn, [Math.round(x), Math.round(y)]); logg(`Flom: ${navn || 'elva'} går over sine bredder ${stedTekst(x, y)}. Det er tungt å ta seg fram der i ${R.regn.flomTimer} timer, og vegene er stengt.`); window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'natur', tekst: 'flom ' + stedTekst(x, y) } })); return s; }
  function ras(x, y) { const s = nySone('ras', x, y, R.regn.rasRadius); logg(`Ras: lia har gått ${stedTekst(x, y)}. Vegen der er stengt i ${R.regn.rasTimer} timer.`); window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'natur', tekst: 'ras ' + stedTekst(x, y) } })); return s; }
  async function finnFlomsted() {
    const l = leir(); if (!l || !window.BEKKER || !BEKKER.hent) return null; const D = 12000; let biter = [];
    try { biter = await BEKKER.hent([l.x - D, l.y - D, l.x + D, l.y + D], [0, 1]); } catch (e) { return null; }
    const kand = []; for (const b of biter) for (const ln of (b && b.linjer) || []) if (ln.orden >= 3 && ln.P.length > 1) { const p = ln.P[Math.floor(Math.random() * ln.P.length)]; if (Math.hypot(p[0] - l.x, p[1] - l.y) < D && !iSoneV(p[0], p[1])) kand.push({ x: p[0], y: p[1], orden: ln.orden, navn: ln.navn }); }
    return kand.length ? kand[Math.floor(Math.random() * kand.length)] : null;
  }
  async function finnRassted() {
    const l = leir(); if (!l) return null; const g = window.VEGNETT;
    for (let t = 0; t < 40; t++) {
      const a = Math.random() * 6.283, d = 800 + Math.random() * 11000; let x = l.x + Math.cos(a) * d, y = l.y + Math.sin(a) * d;
      if (g) { const n = g.naermeste([x, y], 1500); if (n === -1) continue; [x, y] = g.punkt(n); }
      const p = await punktA(x, y); if (!p || p.h == null || p.k === 3 || iSoneV(x, y) || Math.hypot(x - l.x, y - l.y) < 300) continue; let bratt = 0;
      for (const [dx, dy] of [[96, 0], [-96, 0], [0, 96], [0, -96]]) { const q = await punktA(x + dx, y + dy); if (q && q.h != null) bratt = Math.max(bratt, (q.h - p.h) / 96); }
      if (bratt >= R.regn.bratt) return { x, y };
    }
    return null;
  }
  async function regnHendelse() {
    const hva = W.trekkHendelse(V, 1, Math.random); if (!hva) return;
    if (hva === 'ras') { const p = await finnRassted(); if (p) { ras(p.x, p.y); return; } }
    const p = await finnFlomsted(); if (p) flom(p.x, p.y, p.orden, p.navn);
  }

  // ---------- isen på innsjøene (runde 4) ----------
  // Islagte innsjøer stenger båter. Pakka «sjo» kan spørre window.Verden.islagt(x, y) (kartets meter): true når vannet der er en
  // innsjø (vannflate over 1 moh., ikke sjøen) og kulda har lagt is (Verden.REGLER.is.båt døgngrader). Svarer false til kartet der er
  // hentet (det bestilles da). I testene (navigator.webdriver) legger isen seg ikke av seg selv.
  function islagt(x, y) { if (!klar) return false; const p = punkt(x, y); return !!p && W.islagtVann(V, p.h, p.k); }
  W.islagt = islagt;

  // ---------- 35 brann ----------
  function brannLister() {
    const L = W.brannListe(V.brann); BRANNER.length = 0; BRENT.length = 0; for (const c of L.brenner) BRANNER.push(c); for (const c of L.brent) BRENT.push(c);
    try { window.dispatchEvent(new Event('riksbrudd-brann')); } catch (e) { /* eldre nettleser */ }
  }
  // BRANN I LEIREN (balansen 18. nov, Claudes forslag; gjennomspillingen: én sabotasje og en skuddveksling i tørt vær, og brannen tok
  // vakttårn, brakke, dieseltank og kontrollrom på en time). LEIRBRANN.grus: inne i leiren (innen grusR m fra midten) er det grusplass,
  // og brannen sprer seg bare med denne andelen; folk hjemme på «vakt» eller «bygg» slokker ruter innen slokkR m – hver person
  // slokker med sjansen perPerson per 10 spillminutter (høyst maks); byggene tar skade bygg (andel av full helse) per 30 min.
  const LEIRBRANN = { grusR: 70, grus: .25, slokkR: 150, perPerson: .12, maks: .7, bygg: .12 };
  const iLeiren = (x, y, r) => { const l = leir(); return !!l && Math.hypot(x - l.x, y - l.y) < r; };
  const brennbar = (x, y) => { const p = punkt(x, y), v = vær(); if (!p || p.h == null) return 0; if (v && p.h > v.snøgrense) return 0;
    // åkeren (runde 4): modent korn tar lett fyr, bar jord nesten ikke
    const å = åkerVed(x, y); if (å) return W.åkerBrennbar(stykkeSådd(å), V.åker.grodd / R.åker.modning, v ? v.årstid : 'sommer');
    return (R.brennbar[p.k] || 0) * (iLeiren(x, y, LEIRBRANN.grusR) ? LEIRBRANN.grus : 1); };
  // brenner det i åkerstykket? (midten og hjørnene – stykket er større enn ei brannrute)
  const stykkeBrenner = b => [[b.x, b.y], ...Leir.hjørner(b)].some(([x, y]) => W.brenner(V.brann, x, y));
  const slokkere = () => { const F = window.FolkSpill && FolkSpill.tilstand(); return F && F.personer ? F.personer.filter(p => (p.oppgave === 'vakt' || p.oppgave === 'bygg') && !(p.helse < .4) && !p.syk).length : 0; };
  let leirBrannMeldt = false;
  // folk hjemme slokker; første rute som brenner i leiren varsles og stopper spolingen
  function slokkILeiren(dt) {
    const l = leir(), C = V.brann.celler; if (!l || !C) return 0; const r = R.brann.rute; let ute = 0, iLeir = 0;
    const p = 1 - Math.pow(1 - Math.min(LEIRBRANN.maks, LEIRBRANN.perPerson * slokkere()), dt / 10);
    for (const k of Object.keys(C)) { const [i, j] = k.split(',').map(Number), x = (i + .5) * r, y = (j + .5) * r; if (Math.hypot(x - l.x, y - l.y) >= LEIRBRANN.slokkR) continue;
      iLeir++; if (Math.random() < p) { delete C[k]; V.brann.brent[k] = Math.round(tid); ute++; } }
    if (iLeir && !leirBrannMeldt) { leirBrannMeldt = true; const n = slokkere();
      logg(`Brann i leiren! ${n ? `${n} på vakt og bygg prøver å slokke.` : 'Ingen er hjemme på vakt eller bygg til å slokke – sett folk på det under Folk.'}`);
      try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'brann', tekst: 'brann i leiren' } })); } catch (e) { /* eldre nettleser */ } }
    if (!iLeir && leirBrannMeldt) { leirBrannMeldt = false; logg('Brannen i leiren er slukket.'); }
    return ute;
  }
  // Tenn på ved (x, y). Gir { ok } eller { feil }. tving = også når det er for vått til at den sprer seg.
  async function tenn(x, y, hvem, tving) {
    const v = vær(), fare = v ? W.brannfare(V, v) : 0; if (!tving && fare <= 0) return { feil: 'Det er for vått til at det tar fyr.' };
    await punktA(x, y); if (!(brennbar(x, y) > 0)) return { feil: 'Her er det ingenting som brenner.' };
    if (!W.tenn(V.brann, x, y, tid)) return { feil: 'Her har det alt brent.' };
    brannLister(); skitten = true; endret(); sistBrann = tid; logg(`${hvem || 'Det'} har tent på ${stedTekst(x, y)}. Brannen sprer seg med vinden så lenge det er tørt.`); return { ok: true };
  }
  function brannSteg(v, dt) {
    if (!BRANNER.length && !Object.keys(V.brann.celler).length) return;
    // snøvær slokker som regn
    const r = W.brannSteg(V.brann, tid, dt, { ...v, regn: Math.max(v.regn || 0, v.snø || 0) }, W.brannfare(V, v), brennbar); r.ut += slokkILeiren(dt); if (r.nye || r.ut) { brannLister(); skitten = true; endret(); }
    if (r.ut && !Object.keys(V.brann.celler).length) logg(`Brannen har sloknet. ${tall(BRENT.length * R.brann.rute * R.brann.rute / 1e4)} dekar er brent.`);
  }
  function brannSkade() {
    for (const s of ENHETER) { if (!levende(s) || !W.brenner(V.brann, s.x, s.y)) continue; const ut = Terreng.fordelTreff(s.menn, R.brann.treff, rng); s.siktSkitten = true;
      if (s.side === 'blå') logg(`${s.navn} står i brannen: ${ut.map(([m, t]) => `${m.navn} ${t}`).join(', ')}. Få dem ut!`); if (valgt === s) visPanel(); }
    const L = LL(); if (L && window.Leir) for (const b of L.bygg.slice()) {
      // åkeren brenner fortere enn bygg, og avlinga i det som brant, er tapt (stykket teller mindre ved høsting)
      if (b.type === 'åker') { if (!(b.hp > 0) || !stykkeBrenner(b)) continue; const r = Leir.skad(L, b.id, ÅB.brann.skade); syncÅker();
        logg(r && r.ødelagt ? `Åkeren er brent ned${stykkeSådd(b) ? ', og avlinga der er tapt' : ''}.` : `Brannen herjer åkeren (${Math.round((r ? r.hp : 0) * 100)} % igjen).`); continue; }
      if (!(b.hp > 0) || !W.brenner(V.brann, b.x, b.y)) continue; const r = Leir.skad(L, b.id, LEIRBRANN.bygg), navn = (Leir.BYGG[b.type] || {}).navn || 'Et bygg'; logg(r && r.ødelagt ? `Brannen har ødelagt ${navn.toLowerCase()} i leiren.` : `Brannen skader ${navn.toLowerCase()} i leiren (${Math.round((r ? r.hp : 0) * 100)} % igjen) – folk på vakt og bygg slokker.`); }
  }

  // ---------- 36 funn ----------
  // Et funn i tettbebyggelse eller vann flyttes til nærmeste åpne sted (runde 4). Stedet finnes én gang per funn (terrenget er fast):
  // id -> [x, y] (flyttet) | true (ligger der det ligger) | 'venter'. funnI/funnNær gir funnene med det stedet.
  const funnFlytt = new Map();
  function funnI(bx, by) { const f = W.funnIBlokk(bx, by); if (!f) return null; const q = funnFlytt.get(f.id); if (Array.isArray(q)) { f.x = q[0]; f.y = q[1]; f.flyttet = true; } return f; }
  function funnNær(x, y, r) { const ut = []; for (const f0 of W.funnNær(x, y, r + R.funn.flytt.maks)) { const [bx, by] = f0.id.split(',').map(Number), f = funnI(bx, by); if (f && Math.hypot(f.x - x, f.y - y) <= r) ut.push(f); } return ut; }
  const funnKlar = f => { const q = funnFlytt.get(f.id); return q === true || Array.isArray(q); };
  async function plasserFunn(f) {
    if (funnFlytt.has(f.id)) return funnFlytt.get(f.id); funnFlytt.set(f.id, 'venter');
    try { for (const [x, y] of W.funnKandidater(f.x, f.y, f.frø)) { const p = await punktA(x, y); if (p && p.h != null && W.åpentFunnSted(p.k)) { const ny = x === f.x && y === f.y ? true : [Math.round(x), Math.round(y)]; funnFlytt.set(f.id, ny); skitten = true; return ny; } } }
    catch (e) { /* kartet svarte ikke: prøv igjen senere */ funnFlytt.delete(f.id); return null; }
    funnFlytt.set(f.id, true); return true;
  }
  function sjekkFunn() {
    const ser = []; for (const s of ENHETER) if (s.side === 'blå' && levende(s)) ser.push([s.x, s.y, s.navn]);
    const Q = typeof R3 !== 'undefined' ? R3 : null, kr = Q && Q.fot && Q.ut && window.Gange && Gange.kropp && Gange.kropp(); if (kr) ser.push([Q.ut.cx + kr.x, Q.ut.cy + kr.y, 'Du', true]);
    for (const [x, y, navn, selv] of ser) for (const f0 of W.funnNær(x, y, R.funn.ser + R.funn.flytt.maks)) {
      if (V.funn.tatt[f0.id]) continue; if (!funnKlar(f0)) { if (!funnFlytt.has(f0.id)) plasserFunn(f0); continue; }
      const f = funnI(...f0.id.split(',').map(Number)); if (Math.hypot(f.x - x, f.y - y) > R.funn.ser) continue;
      if (!V.funn.sett[f.id]) { const p = punkt(f.x, f.y); if (!p) continue; if (p.h == null || p.k === 3) { V.funn.tatt[f.id] = 1; endret(); continue; }
        V.funn.sett[f.id] = 1; endret(); skitten = true; logg(`${navn} ser noe ${stedTekst(f.x, f.y)}: ${f.navn.toLowerCase()}. Send et lag dit og undersøk.`); }
      if (selv && Math.hypot(f.x - x, f.y - y) < 25) undersøk(null, f);
    }
  }
  function undersøk(s, f) {
    if (V.funn.tatt[f.id]) return null; const i = W.innhold(f); V.funn.tatt[f.id] = 1; V.funn.sett[f.id] = 1; endret(); skitten = true;
    const fikk = gi(i.gi), hvem = s ? s.navn : 'Du';
    if (i.hendelse === 'bakhold' && s) { const ut = Terreng.fordelTreff(s.menn, 1, rng); s.siktSkitten = true; logg(`${hvem} undersøker ${f.navn.toLowerCase()}: det var en felle! ${ut.map(([m, t]) => `${m.navn} ${t}`).join(', ')}.` + (fikk.length ? ` De fikk med seg ${fikk.join(', ')}.` : '')); }
    else logg(`${hvem} undersøker ${f.navn.toLowerCase()}: ` + (i.hendelse ? i.tekst : fikk.length ? `fant ${fikk.join(', ')} – sendt til leiren.` : 'det var noe der, men leiren har ikke plass til det.'));
    if (s && valgt === s) visPanel(); return i;
  }
  const funnVed = s => funnNær(s.x, s.y, R.funn.tar).find(f => V.funn.sett[f.id] && !V.funn.tatt[f.id]) || null;

  // ---------- 33 jakt ----------
  function viltHer(s) { const p = s.her && s.her.h === s.her.h ? s.her : punkt(s.x, s.y); return p ? W.vilt(p.h, p.k) : null; }
  function startJakt(s) {
    const art = viltHer(s); if (!art) return { feil: 'Det er ikke vilt her.' }; if (W.jaktHviler(V, s.x, s.y, tid)) return { feil: 'Viltet her er skremt. Prøv et annet sted, eller vent noen døgn.' };
    s.sti = null; s.jakt = { art, til: tid + R.jakt.timer * 60, x: s.x, y: s.y }; logg(`${s.navn} går på ${art === 'rein' ? 'reinsjakt' : 'elgjakt'} (${R.jakt.timer} timer).`); return { ok: true };
  }
  function jaktSteg() {
    for (const s of ENHETER) { const j = s.jakt; if (!j) continue;
      if (!levende(s) || Math.hypot(s.x - j.x, s.y - j.y) > 150) { s.jakt = null; if (s.side === 'blå') logg(`${s.navn} avbrøt jakta.`); continue; }
      if (tid < j.til) continue; s.jakt = null;
      const u = W.jaktUtbytte(V, j.art, s.menn.filter(m => m.hp >= 1).length, s.x, s.y, tid, Math.random); endret(); const F = FF(); if (F && u.mat) F.mat += u.mat;
      logg(u.dyr ? `${s.navn} felte ${u.dyr} ${j.art === 'rein' ? 'rein' : 'elg'}: ${u.mat} rasjoner kjøtt til leiren.` : `${s.navn} kom tomhendt fra jakta.`); if (valgt === s) visPanel(); }
  }
  // du selv: skuddene dine står i SKUDD (a = der du står, b = 80 m fram); dyrene finnes i 3D (spill/dyr3d.js)
  const settSkudd = new WeakSet();
  function egneSkudd(v) {
    if (typeof SKUDD === 'undefined') return;
    for (const sk of SKUDD) { if (settSkudd.has(sk)) continue; settSkudd.add(sk); const a = sk.a, b = sk.b; if (!a || !b) continue;
      const selv = !a.menn && a.side === 'blå' && Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - 80) < 1;
      if (selv && window.Dyr3d && Dyr3d.fell) { const fx = (b.x - a.x) / 80, fy = (b.y - a.y) / 80, t = Dyr3d.fell(a.x, a.y, fx, fy, W.sikt);
        // felte dyr huskes per leir (runde 4): de kommer ikke tilbake når 3D-utsnittet bygges på nytt
        if (t && t.nøkkel) { const L = V.jakt.felt = V.jakt.felt || []; if (!L.includes(t.nøkkel)) L.push(t.nøkkel); if (L.length > R.jakt.huskFelt) L.splice(0, L.length - R.jakt.huskFelt); endret(); }
        if (t) { const mat = Math.round((R.kjøtt[t.art] || 0) * (t.ung ? .5 : 1)), F = FF(), navn = (window.Dyr && Dyr.ARTER[t.art] ? Dyr.ARTER[t.art].navn : t.art).toLowerCase();
          // (pakka «karakter») langt fra leiren bærer du kjøttet selv: EventyrSpill.felteDyr svarer true når det er lagt i sekken
          if (window.EventyrSpill && EventyrSpill.felteDyr && EventyrSpill.felteDyr(mat, navn, t.avst)) continue;
          if (F) F.mat += mat;
          logg(`Du felte en ${navn} på ${Math.round(t.avst)} m: ${mat} rasjoner kjøtt til leiren.`); } }
      // skudd i knusktørr skog kan tenne (ikke av seg selv i testene)
      else if (auto() && v && W.brannfare(V, v) >= .6 && Math.random() < R.brann.skudd) tenn(b.x, b.y, 'Skuddvekslingen').catch(() => {});
    }
  }

  // ---------- 34 åker ----------
  // åkerstykkene i leiren (bygg av typen «åker»), de ferdige, og hvilket stykke (x, y) ligger i
  const åkerStykker = () => { const L = LL(); return L && L.bygg ? L.bygg.filter(b => b.type === 'åker') : []; };
  const ferdigeÅkre = () => åkerStykker().filter(b => window.Leir && Leir.ferdig(b));
  function iStykke(b, x, y) { const c = Math.cos(-(b.ret || 0)), sn = Math.sin(-(b.ret || 0)), dx = x - b.x, dy = y - b.y, lx = dx * c - dy * sn, ly = dx * sn + dy * c, f = Leir.BYGG.åker.fot; return lx >= f[0] && lx <= f[1] && ly >= f[2] && ly <= f[3]; }
  const åkerVed = (x, y) => ferdigeÅkre().find(b => iStykke(b, x, y)) || null;
  // mål i alt: det som ble ryddet før (uten bygg) + åkerstykkene (et brent stykke teller mindre)
  function syncÅker() { const Å = V.åker; if (Å.ryddet == null) Å.ryddet = Å.mål || 0; const m = W.åkerMål(Å.ryddet, ferdigeÅkre()); if (m !== Å.mål) { Å.mål = m; endret(); skitten = true; } return m; }
  // det som ble sådd: stykkene som var ferdige da det ble sådd (Å.sådde = id-ene), og det gamle ryddede
  const sådMål = () => { const Å = V.åker; return Å.sådde ? W.åkerMål(Å.ryddet, ferdigeÅkre().filter(b => Å.sådde.includes(b.id))) : Å.mål; };
  const stykkeSådd = b => !!V.åker.sådd && (!V.åker.sådde || V.åker.sådde.includes(b.id));
  function anleggÅker() { if (!window.LeirSpill || !LeirSpill.startPlassering) return { feil: 'Leiren er ikke klar.' }; vis(false); LeirSpill.startPlassering('åker', null, {}); logg(`Velg hvor åkeren (${ÅB.mål} mål, ${ÅB.bredde} × ${ÅB.lengde} m) skal ligge. Et byggelag rydder og pløyer den.`); return { ok: true }; }
  // Åkeren får et fast sted ved leiren første gang: helst dyrket mark, ellers åpen mark – ikke vann, tettbebyggelse eller bratt li.
  async function åkerSted() {
    const l = leir(); if (!l) return null; let reserve = null;
    for (const r of [220, 300, 380, 460]) for (let a = 0; a < 12; a++) { const x = l.x + Math.cos(a * Math.PI / 6 + r) * r, y = l.y + Math.sin(a * Math.PI / 6 + r) * r, p = await punktA(x, y);
      if (!p || p.h == null || p.k === 3 || p.k === 7 || p.k === 4) continue; const q = await punktA(x + 64, y), q2 = await punktA(x, y + 64);
      if (!q || !q2 || q.h == null || q2.h == null || Math.abs(q.h - p.h) > 12 || Math.abs(q2.h - p.h) > 12 || q.k === 3 || q2.k === 3) continue;
      if (p.k === 5) return { x: Math.round(x), y: Math.round(y) }; if (!reserve || (p.k === 2 && reserve.k !== 2)) reserve = { x: Math.round(x), y: Math.round(y), k: p.k }; }
    return reserve ? { x: reserve.x, y: reserve.y } : { x: Math.round(l.x + 250), y: Math.round(l.y) };
  }
  async function ryddÅker() {
    const p = R.åker.rydd; if (V.åker.mål + R.åker.ryddMål > R.åker.maks) return { feil: `Dere kan ikke drive mer enn ${R.åker.maks} mål.` }; if (spill().penger < p) return { feil: 'Ikke nok penger.' };
    if (V.åker.x == null) { const st = await åkerSted(); if (!st) return { feil: 'Fant ikke plass til en åker.' }; V.åker.x = st.x; V.åker.y = st.y; }
    if (!OppstartSpill.betal(p)) return { feil: 'Ikke nok penger.' }; syncÅker(); W.ryddÅker(V); V.åker.ryddet = (V.åker.ryddet || 0) + R.åker.ryddMål; endret(); skitten = true; logg(`Ny åker ryddet ${stedTekst(V.åker.x, V.åker.y)}: ${V.åker.mål} mål i alt. Så om våren. Åkeren trenger ${W.åkerBehov(V.åker.mål)} av folkene på «fri».`); return { ok: true };
  }
  // Folk: én på «fri» per 40 mål. Færre = kornet gror saktere. Uten Folk-modulen (eller i en tom leir uten folk-system) som før.
  function åkerFolk() { const behov = W.åkerBehov(V.åker.mål); if (!window.Folk || !FF() || !behov) return { behov, har: behov, andel: 1 }; let har = 0; try { har = Folk.arbeidere('fri') || 0; } catch (e) { har = 0; } return { behov, har, andel: Math.min(1, har / behov) }; }
  function så() { syncÅker(); const v = vær(), å = v ? v.årstid : 'sommer', pris = V.åker.mål * R.åker.såkorn; if (å === 'vår' && V.åker.mål && !V.åker.sådd && spill().penger < pris) return { feil: 'Ikke nok penger til såkorn.' };
    syncÅker(); const r = W.så(V, å); if (r.feil) return r; V.åker.sådde = ferdigeÅkre().map(b => b.id); OppstartSpill.betal(r.pris); endret(); skitten = true; logg(`Åkeren er sådd (${V.åker.mål} mål). Høstes til høsten.`); return r; }
  function åkerSteg(v, dt) { const alle = syncÅker(); if (!V.åker.sådd) return; V.åker.mål = sådMål(); let r; try { r = W.åkerSteg(V, dt / 1440, v.årstid, åkerFolk().andel); } finally { V.åker.mål = alle; } if (!V.åker.sådd) V.åker.sådde = null; if (r.mat != null) { const F = FF(); if (F) F.mat += r.mat; endret(); logg(r.mat ? `Innhøsting: åkeren ga ${tall(r.mat)} rasjoner${r.andel < 1 ? ' (kornet rakk ikke å bli modent)' : ''}.` : 'Åkeren ga ingenting i år.'); } else if (r.tapt) { endret(); logg('Avlinga frøs bort: det ble vinter før dere fikk høstet.'); } }

  // ---------- 37 radio ----------
  const harRadio = () => { if (window.SPILLREGLER && SPILLREGLER.har('ingenRadio')) return false; const L = LL(); return !!(L && window.Leir && L.bygg.some(b => (b.type === 'radiomast' || b.type === 'kontrollrom') && Leir.virker(b))); };
  function sanne(v) {
    const ut = [], l = leir(); if (!l) return ut;
    for (const s of V.soner) ut.push(s.type === 'ras' ? `Vegmelding: ras ${stedTekst(s.x, s.y)}, vegen er stengt.` : `Flomvarsel: vannet står høyt ${stedTekst(s.x, s.y)}.`);
    if (BRANNER.length) ut.push(`Brannvakta: det brenner ${stedTekst(BRANNER[0].x, BRANNER[0].y)}.`);
    if (v) { if (W.brannfare(V, v) >= 1) ut.push('Værmelding: knusktørt i skogen – stor brannfare.'); if (W.flomfare(V) >= 1) ut.push('Værmelding: mye regn – elvene kan gå over.');
      if (v.temp <= R.kulde.grense) ut.push(`Værmelding: sprengkulde, ${Math.round(v.temp)} grader i dalen.`); if (W.isBærer(V)) ut.push('Melding fra fiskere: isen på vannene bærer.'); }
    for (const f of funnNær(l.x, l.y, 9000)) if (!V.funn.tatt[f.id] && !V.funn.sett[f.id]) { ut.push(`Rykte: det skal ligge noe (${f.navn.toLowerCase()}) ${stedTekst(f.x, f.y)}.`); if (ut.length > 8) break; }
    for (const b of byer()) { const e = eier(b.id); if (e && e !== 'blå' && Math.hypot(b.x - l.x, b.y - l.y) < 60000 && window.Fraksjoner && Fraksjoner.FRAKSJONER[e]) ut.push(`Melding: ${Fraksjoner.FRAKSJONER[e].navn} holder ${b.navn}.`); }
    return ut;
  }
  function radioNå() { const v = vær(), l = leir(), steder = l ? byer().filter(b => Math.hypot(b.x - l.x, b.y - l.y) < 80000).map(b => b.navn) : []; const m = W.radioInn(V, W.radioMelding(sanne(v), steder, Math.random), tid, Math.random); endret(); logg('Radio: ' + m.tekst); return m; }

  // ---------- 38 tog ----------
  // Har tettstedet jernbanespor innen 1 km? Leses fra jernbanen i kartet (utveg-flisene, laget «bane», z9). spor: id -> true | false |
  // null (spurt, venter) | 'ukjent' (ingen data der). Uten svar gjelder navnelista i reglene (Verden.STASJONER).
  const spor = new Map();
  const avstSeg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); };
  function sjekkSpor(b) {
    if (spor.has(b.id) || typeof LAGFILER === 'undefined' || !LAGFILER || !LAGFILER.utveg || typeof hentFlis !== 'function') return;
    const z = 9, sp = span(z), d = R.tog.nærSpor, bb = b.ref.bb || [b.x, b.y, b.x, b.y], [x0, y0, x1, y1] = flisområde([Math.min(bb[0], b.x - d), Math.min(bb[1], b.y - d), Math.max(bb[2], b.x + d), Math.max(bb[3], b.y + d)], z), fl = []; spor.set(b.id, null);
    // sporet går gjennom tettstedet (et punkt på sporet ligger inne i omrisset), eller innen 1 km fra navnet
    const iByen = (X, Y) => { if (X < bb[0] || Y < bb[1] || X > bb[2] || Y > bb[3]) return false; try { return Garnison.inni(b.ref, X, Y); } catch (e) { return false; } };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fl.push(Promise.resolve(hentFlis('utveg', z, x, y)).then(t => [x, y, t]));
    Promise.all(fl).then(F => { let nær = false, data = false;
      for (const [x, y, t] of F) { if (!t) continue; data = true; if (!t.bane || nær) continue; const mx = G.x0 + x * sp, my = G.y0 - y * sp, e = t.bane.ext || 4096;
        for (const o of t.bane.obj) { for (const del of o.deler) { for (let i = 1; i < del.length && !nær; i++) { const ax = mx + del[i - 1][0] / e * sp, ay = my - del[i - 1][1] / e * sp, cx = mx + del[i][0] / e * sp, cy = my - del[i][1] / e * sp; if (avstSeg(b.x, b.y, ax, ay, cx, cy) < d || iByen(cx, cy) || iByen((ax + cx) / 2, (ay + cy) / 2)) nær = true; } if (nær) break; } if (nær) break; } }
      spor.set(b.id, data ? nær : 'ukjent'); sistHtml = ''; }).catch(() => spor.set(b.id, 'ukjent'));
  }
  // stasjonsbyene i spillkartet (høyst 150 km fra leiren), de nærmeste først
  function stasjoner() { const l = leir(), d = b => (l ? Math.hypot(b.x - l.x, b.y - l.y) : 0), ut = [];
    for (const b of byer().filter(b => (!window.OMRÅDE_OK || OMRÅDE_OK(b.x, b.y)) && d(b) < 150000).sort((a, b) => d(a) - d(b)).slice(0, 80)) { sjekkSpor(b); const st = spor.get(b.id);
      if (st === true || (st !== false && W.erStasjon(b.navn))) ut.push({ id: b.id, navn: b.navn, x: b.x, y: b.y, eier: eier(b.id), stasjon: st === true ? true : null }); }
    return ut; }
  function togStart(idA, idB) {
    const S = stasjoner(), a = S.find(s => String(s.id) === String(idA)), b = S.find(s => String(s.id) === String(idB)), p = W.togPlan(a, b); if (p.feil) return p;
    const L = LL(); if (!L || (L.lager.stål || 0) < p.stål) return { feil: `Dere trenger ${p.stål} stål til skinner og sviller.` }; if (spill().penger < p.pris) return { feil: 'Ikke nok penger.' };
    const r = W.togStart(V, a, b, tid); if (r.feil) return r; OppstartSpill.betal(p.pris); L.lager.stål -= p.stål; endret(); skitten = true;
    logg(`Banen ${a.navn}–${b.navn} (${tall(p.km, 1)} km) settes i stand: klar om ${p.timer} timer.`); return r;
  }
  function togSteg() {
    for (const h of W.togSteg(V, tid, eier)) { const n = `${h.s.navnA}–${h.s.navnB}`; endret();
      if (h.åpnet) logg(`Banen ${n} er åpen. Første tog kommer om ${R.tog.mellom} timer.`);
      else if (!h.last) logg(`Toget på ${n} kom ikke fram: dere holder ikke begge stasjonene.`);
      else { const fikk = gi(h.last); window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'tog', tekst: 'toget på ' + n + ' er framme' } })); logg(`Tog på ${n}: ` + (fikk.length ? fikk.join(', ') + ' til leiren.' : 'lasten fikk ikke plass i leiren.')); } }
  }

  // ---------- årstidene av seg selv (valgfritt, slås på i panelet) ----------
  function autoÅrstid() {
    const å = W.årstidNå(V, tid), VS = window.VaerSpill; if (!å || !VS || VS.S.årstid === å) return;
    Vaer.settÅrstid(VS.S, å, tid); VS.oppdater(`Det er blitt ${Vaer.ÅRSTIDER[å].navn.toLowerCase()}.`);
  }
  function settAuto(på) { const VS = window.VaerSpill; V.auto = { på: !!på, start: tid, fra: VS ? VS.S.årstid : 'sommer' }; endret(); }

  // ---------- klokka ----------
  KROKER.sim.push(() => {
    if (!klar) return; if (sistT != null && tid - sistT < 1 && tid >= sistT) return; const dt = sistT == null || tid < sistT ? 0 : Math.min(240, tid - sistT); sistT = tid;
    const v = vær(); if (!v) return;
    egneSkudd(v); jaktSteg(); togSteg(); autoÅrstid(); åkerSteg(v, dt);
    for (const s of W.ryddSoner(V, tid)) { åpneVeger(s); feltFor.delete(s.id); skitten = true; endret(); logg(s.type === 'ras' ? `Raset ${stedTekst(s.x, s.y)} er ryddet. Vegen er åpen.` : `Flommen ${stedTekst(s.x, s.y)} har trukket seg tilbake.`); }
    for (const s of V.soner) if (!stengt.has(s.id) && window.VEGNETT) stengVeger(s).catch(() => {});
    if (sistBrann == null || tid - sistBrann >= 10 || tid < sistBrann) { const d = sistBrann == null || tid < sistBrann ? 10 : Math.min(60, tid - sistBrann); sistBrann = tid; brannSteg(v, d); }
    if (BRANNER.length && (sistSkade == null || tid - sistSkade >= 30 || tid < sistSkade)) { sistSkade = tid; brannSkade(); }
    if (!auto()) { if (window.VERDEN_IS) isSteg(); return; }
    // det som skjer av seg selv (ikke i testene)
    W.steg(V, dt, v); if (dt) endret(); isSteg(); marsjSteg(v); snøVeg(v); snøVegSteg(v); sjekkFunn();
    const time = Math.floor(tid / 60);
    if (sistTime == null) sistTime = time;
    if (time !== sistTime) { const timer = Math.min(6, Math.max(1, time - sistTime)); sistTime = time; kuldeTime(v, timer); regnHendelse().catch(e => console.error(e));
      // lynet tenner når det er knusktørt (tørken, ikke regnet som nettopp har begynt, avgjør) og det er torden eller tunge skyer
      if (v.årstid !== 'vinter' && V.tørke >= (R.tørke.fra + R.tørke.full) / 2 && (v.torden > 0 || v.sky > .7) && Math.random() < 1 - Math.pow(1 - R.brann.lyn, timer)) { const l = leir(); if (l) { const a = Math.random() * 6.283, d = 1000 + Math.random() * 7000; tenn(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, 'Lynet', true).catch(() => {}); } }
      if (harRadio() && tid >= V.radio.neste) radioNå();
      visForhold(); }
  });

  // ---------- lagpanelet ----------
  KROKER.lagTekst.push(s => {
    if (s.jakt) return `på jakt, ${tall(Math.max(0, (s.jakt.til - tid) / 60), 1)} t igjen`;
    const ut = []; if (s.sti && s.verdenF < 1) ut.push(`tungt føre: marsj −${Math.round((1 - s.verdenF) * 100)} %`);
    if (s.side === 'blå' && (V.kulde[s.navn] || 0) > R.kulde.timerFør * .6) ut.push('fryser');
    return ut.join(' · ') || null;
  });
  KROKER.lagKnapper.push((s, H) => {
    if (s.side !== 'blå' || s.ombord || !klar) return;
    const f = funnVed(s); if (f) { const b = knapp(`Undersøk ${f.navn.toLowerCase()}`, false, () => { undersøk(s, f); }); b.id = 'funnknapp'; H.appendChild(b); }
    // ingeniørene rydder et ras på noen timer
    const so = iSoneV(s.x, s.y, 'ras'); if (so && s.ingeniør && so.til - tid > R.regn.ryddTimer * 60) { const b = knapp(`Rydd raset (${R.regn.ryddTimer} t)`, false, () => { so.til = tid + R.regn.ryddTimer * 60; endret(); logg(`${s.navn} rydder raset: vegen er åpen om ${R.regn.ryddTimer} timer.`); visPanel(); }); b.id = 'ryddknapp'; H.appendChild(b); }
    if (s.karakter) return;
    if (s.jakt) { const b = knapp('Avbryt jakta', true, () => { s.jakt = null; logg(`${s.navn} avbrøt jakta.`); visPanel(); }); b.id = 'jaktknapp'; H.appendChild(b); }
    else { const art = viltHer(s); if (art && !s.sti) { const hviler = W.jaktHviler(V, s.x, s.y, tid), b = knapp(hviler ? 'Viltet her er skremt' : `Jakt på ${art} (${R.jakt.timer} t)`, false, () => { const r = startJakt(s); if (r.feil) logg(s.navn + ': ' + r.feil); visPanel(); });
      b.id = 'jaktknapp'; b.title = `Laget jakter her i ${R.jakt.timer} timer. Kjøttet går til leiren. Gir de ordre imens, avbrytes jakta.`; H.appendChild(b); } }
    const v = vær(); if (v && W.brannfare(V, v) > 0) { const b = knapp('Tenn på her', false, () => { tenn(s.x, s.y, s.navn).then(r => { if (r.feil) logg(s.navn + ': ' + r.feil); }); }); b.id = 'tennknapp'; b.title = 'Setter fyr på skogen eller marka der laget står. Brannen går med vinden og slokner i regn. Flytt laget etterpå!'; H.appendChild(b); }
  });

  // ---------- kartet ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!klar) return; const m = kam.m, sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, r = R.brann.rute, inne = (x, y, d) => { const a = sx(x), b = sy(y); return a > -d && b > -d && a < VW + d && b < VH + d; };
    g.save();
    // brent mark og brann
    if (BRENT.length || BRANNER.length) { const px = Math.max(1.5, r / m), d = px;
      g.fillStyle = 'rgba(28,24,20,.55)'; for (const c of BRENT) if (inne(c.x, c.y, d)) g.fillRect(sx(c.x - c.r), sy(c.y + c.r), px, px);
      const blaff = .6 + .25 * Math.sin(performance.now() / 180);
      for (const c of BRANNER) if (inne(c.x, c.y, d)) { g.fillStyle = `rgba(255,${90 + Math.round(110 * W.hash(Math.round(c.x * 3 + c.y * 7 + performance.now() / 500)))},20,${blaff})`; g.fillRect(sx(c.x - c.r), sy(c.y + c.r), px, px); }
      if (BRANNER.length && m > 6) { let x = 0, y = 0; for (const c of BRANNER) { x += c.x; y += c.y; } x /= BRANNER.length; y /= BRANNER.length; g.font = 'bold 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#ffb347'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 3; g.strokeText('BRANN', sx(x), sy(y) - 8); g.fillText('BRANN', sx(x), sy(y) - 8); }
    }
    // åkeren ved leiren: brun pløyd jord, grønn når det gror, gul når kornet er modent
    const Å = V.åker, mod = Math.min(1, Å.grodd / R.åker.modning), vinter = vær() && vær().årstid === 'vinter';
    // åkerstykkene (bygg): pløyd jord, grønt som gror, gult når det er modent, svart der det har brent; furer langs den lange siden
    for (const b of åkerStykker()) { const P = Leir.hjørner(b).map(([x, y]) => [sx(x), sy(y)]); if (P.every(([x, y]) => x < -50 || y < -50 || x > VW + 50 || y > VH + 50)) continue;
      const fer = Leir.ferdig(b), sådd = fer && stykkeSådd(b), k = W.korn(sådd, mod).farge, svidd = 1 - .75 * (1 - Math.max(0, Math.min(1, b.hp == null ? 1 : b.hp))), hvit = vinter ? .55 : 0;
      const c = k.map(v => Math.round(255 * (v * svidd * (1 - hvit) + .93 * hvit)));
      g.beginPath(); g.moveTo(...P[0]); for (const q of P.slice(1)) g.lineTo(...q); g.closePath(); g.globalAlpha = fer ? .92 : .35 + .5 * Leir.framdrift(b); g.fillStyle = `rgb(${c.join(',')})`; g.fill(); g.globalAlpha = 1;
      const l01 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l12 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
      if (Math.min(l01, l12) > 14) { const [a0, a1, b0, b1] = l01 >= l12 ? [P[0], P[1], P[3], P[2]] : [P[1], P[2], P[0], P[3]], n = Math.max(4, Math.min(60, Math.round(Math.min(l01, l12) / 3)));
        g.beginPath(); for (let i = 1; i < n; i++) { const t = i / n; g.moveTo(a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t); g.lineTo(a1[0] + (b1[0] - a1[0]) * t, a1[1] + (b1[1] - a1[1]) * t); } g.lineWidth = 1; g.strokeStyle = 'rgba(40,30,18,.3)'; g.stroke(); }
      g.beginPath(); g.moveTo(...P[0]); for (const q of P.slice(1)) g.lineTo(...q); g.closePath(); g.lineWidth = 1.3; g.setLineDash(fer ? [] : [6, 5]); g.strokeStyle = 'rgba(40,30,18,.75)'; g.stroke(); g.setLineDash([]);
      if (m < 2.5) { const t = `Åker · ${ÅB.mål} mål` + (!fer ? ` · ${Math.round(Leir.framdrift(b) * 100)} %` : sådd ? (mod >= 1 ? ' · modent' : ' · gror') : '') + (b.hp < 1 ? ` · ${Math.round(b.hp * 100)} % igjen` : '');
        g.font = 'italic 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#f1e2a8'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText(t, sx(b.x), sy(b.y) + 4); g.fillText(t, sx(b.x), sy(b.y) + 4); } }
    // det som ble ryddet før åkeren ble et bygg (gamle lagrede spill)
    if (Å.ryddet > 0 && Å.x != null) { const side = W.åkerSide(Å.ryddet), px = side / m;
      if (px > 3 && inne(Å.x, Å.y, px)) { const x0 = sx(Å.x - side / 2), y0 = sy(Å.y + side / 2);
        g.fillStyle = !Å.sådd ? 'rgba(104,82,56,.82)' : mod >= 1 ? 'rgba(206,172,74,.85)' : `rgba(${Math.round(104 - 20 * mod)},${Math.round(98 + 50 * mod)},${Math.round(56 - 6 * mod)},.85)`; g.fillRect(x0, y0, px, px);
        if (px > 24) { g.beginPath(); const n = Math.max(4, Math.min(40, Math.round(side / 6))); for (let i = 1; i < n; i++) { g.moveTo(x0, y0 + px * i / n); g.lineTo(x0 + px, y0 + px * i / n); } g.lineWidth = 1; g.strokeStyle = 'rgba(40,30,18,.28)'; g.stroke(); }
        g.lineWidth = 1.2; g.strokeStyle = 'rgba(40,30,18,.7)'; g.strokeRect(x0, y0, px, px);
        if (m < 8) { const t = `Åker · ${Å.ryddet} mål` + (Å.sådd ? (mod >= 1 ? ' · modent' : ' · gror') : ''); g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#f1e2a8'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText(t, x0 + px / 2, y0 - 5); g.fillText(t, x0 + px / 2, y0 - 5); } } }
    // flom og ras
    for (const s of V.soner) { if (!inne(s.x, s.y, s.r / m + 20)) continue; const rr = Math.max(5, s.r / m), flom = s.type === 'flom', felt = flom ? feltFor.get(s.id) : null;
      // flom i flomfeltet: vannet langs dalbunnen (mykt blått bilde); ellers en sirkel som før
      if (felt) { g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = .6; g.drawImage(felt.c, sx(felt.x0), sy(felt.y0), felt.w * felt.r / m, felt.h * felt.r / m); g.restore(); }
      else { g.beginPath(); g.arc(sx(s.x), sy(s.y), rr, 0, 6.283); g.fillStyle = flom ? 'rgba(74,127,176,.42)' : 'rgba(120,92,60,.5)'; g.fill(); g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = flom ? '#a9c6df' : '#d9b98a'; g.stroke(); g.setLineDash([]); }
      g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = flom ? '#d5e6f5' : '#f0dcc0'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; const t = flom ? 'flom' : 'ras'; g.strokeText(t, sx(s.x), sy(s.y) + 4); g.fillText(t, sx(s.x), sy(s.y) + 4); }
    // funn som er sett, men ikke undersøkt
    if (m < 120) { const B = R.funn.blokk, x0 = vx0, x1 = vx0 + VW * m, y1 = vy1, y0 = vy1 - VH * m;
      for (const id of Object.keys(V.funn.sett)) { if (V.funn.tatt[id]) continue; const [bx, by] = id.split(',').map(Number); const fl = R.funn.flytt.maks; if ((bx + 1) * B + fl < x0 || bx * B - fl > x1 || (by + 1) * B + fl < y0 || by * B - fl > y1) continue; const f = funnI(bx, by); if (!f) continue;
        const a = sx(f.x), b = sy(f.y); g.beginPath(); g.moveTo(a, b - 7); g.lineTo(a + 7, b); g.lineTo(a, b + 7); g.lineTo(a - 7, b); g.closePath(); g.fillStyle = '#e2c15a'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1b1a17'; g.stroke();
        g.fillStyle = '#1b1a17'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('?', a, b + 3.5);
        if (m < 25) { g.font = 'italic 12px "Cormorant Garamond",serif'; g.fillStyle = '#f1e2a8'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText(f.navn, a, b + 20); g.fillText(f.navn, a, b + 20); } } }
    // veglenker som snøen har stengt (runde 4): stiplet hvitt over vegen, og «stengt (snø)» når du er nær nok
    if (snøLenker.size && window.VEGNETT && m < 60) { const gr = window.VEGNETT; g.setLineDash([6, 5]); g.lineWidth = 3; g.strokeStyle = 'rgba(235,242,250,.9)'; let tekst = null;
      for (const e of snøLenker) { let Lp; try { Lp = gr.linje(e); } catch (er) { continue; } if (!Lp.some(p => inne(p[0], p[1], 20))) continue;
        g.beginPath(); Lp.forEach((p, i) => (i ? g.lineTo(sx(p[0]), sy(p[1])) : g.moveTo(sx(p[0]), sy(p[1])))); g.stroke(); if (!tekst) tekst = Lp[Lp.length >> 1]; }
      g.setLineDash([]); if (tekst && m < 20) { g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#eef4fa'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText('stengt (snø)', sx(tekst[0]), sy(tekst[1]) - 8); g.fillText('stengt (snø)', sx(tekst[0]), sy(tekst[1]) - 8); } }
    // jaktlag
    for (const s of ENHETER) if (s.jakt && s.side === 'blå' && inne(s.x, s.y, 30)) { g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = '#e8e0cc'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText('på jakt', sx(s.x), sy(s.y) - 22); g.fillText('på jakt', sx(s.x), sy(s.y) - 22); }
    // tog
    if (V.tog.length) { const B = byer(); for (const t of V.tog) { const a = B.find(b => b.id === t.a), b = B.find(q => q.id === t.b); if (!a || !b) continue;
      g.beginPath(); g.moveTo(sx(a.x), sy(a.y)); g.lineTo(sx(b.x), sy(b.y)); g.lineWidth = 3; g.strokeStyle = tid >= t.klar ? 'rgba(30,26,22,.85)' : 'rgba(30,26,22,.45)'; g.stroke(); g.setLineDash([8, 8]); g.lineWidth = 1.2; g.strokeStyle = '#e8e0cc'; g.stroke(); g.setLineDash([]);
      if (tid >= t.klar) { const k = 1 - Math.max(0, Math.min(1, (t.neste - tid) / (R.tog.mellom * 60))), x = sx(a.x + (b.x - a.x) * k), y = sy(a.y + (b.y - a.y) * k); g.fillStyle = '#e8e0cc'; g.fillRect(x - 6, y - 3, 12, 6); g.strokeStyle = '#1b1a17'; g.strokeRect(x - 6, y - 3, 12, 6); } } }
    g.restore();
  });
  // brannen blaffer: tegn kartet på nytt et par ganger i sekundet mens det brenner
  setInterval(() => { if (BRANNER.length && typeof på3d !== 'undefined' && !på3d) skitten = true; }, 400);
  KROKER.tegn3d.push((g, proj) => {
    if (!klar) return; g.save(); g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center';
    if (BRANNER.length) { let x = 0, y = 0; for (const c of BRANNER) { x += c.x; y += c.y; } const q = proj(x / BRANNER.length, y / BRANNER.length); if (q) { g.fillStyle = '#ffb347'; g.fillText('BRANN', q[0], q[1]); } }
    for (const s of V.soner) { const q = proj(s.x, s.y); if (!q) continue; g.fillStyle = s.type === 'flom' ? '#a9c6df' : '#e3c9a0'; g.fillText(s.type === 'flom' ? 'flom' : 'ras – vegen stengt', q[0], q[1]); }
    for (const id of Object.keys(V.funn.sett)) { if (V.funn.tatt[id]) continue; const [bx, by] = id.split(',').map(Number), f = funnI(bx, by), q = f && proj(f.x, f.y); if (!q) continue; g.fillStyle = '#f1e2a8'; g.fillText('◆ ' + f.navn, q[0], q[1]); }
    g.restore();
  });

  // ---------- 3D: flammer og røyk, steinur der raset gikk, vannflate ved flom, vrak og kasser der det er funn ----------
  // Enkelt og billig: Points for flammer/røyk, instansnett for stein og kasser. Ingen egne lys. Brent bakke tegner pakka «natur» (BRENT).
  let D3 = null, MAT3 = null, sist3d = 0;
  function mat3() {
    if (MAT3) return MAT3; const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); const tex = new THREE.CanvasTexture(c);
    MAT3 = { tex, glød: new THREE.PointsMaterial({ size: 85, map: tex, color: 0xff5a14, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
      flamme: new THREE.PointsMaterial({ size: 20, map: tex, color: 0xff7a22, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
      røyk: new THREE.PointsMaterial({ size: 120, map: tex, color: 0x5a554f, transparent: true, opacity: .42, depthWrite: false, sizeAttenuation: true }),
      stein: new THREE.MeshLambertMaterial({ color: 0x7c756c }), kasse: new THREE.MeshLambertMaterial({ color: 0xffffff }),
      vann: new THREE.MeshBasicMaterial({ color: 0x55707c, transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide }),
      // åkeren: jord og korn med hjørnefarger (runde 4)
      åker: new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }) };
    return MAT3;
  }
  function fjern3d(R) { if (!D3) return; if (R && R.scene) R.scene.remove(D3.gruppe); D3.gruppe.traverse(o => { if (o.geometry) o.geometry.dispose(); }); D3 = null; }
  // åkerstykkene i 3D endrer seg med framdrift, brann, såing, veksten (i tideler) og årstiden
  const åkerNøkkel = () => { const st = åkerStykker(); if (!st.length) return ''; const v = vær(); return st.map(b => b.id + ':' + Math.round((b.hp == null ? 1 : b.hp) * 10) + ':' + Math.round(Leir.framdrift(b) * 10) + ':' + (stykkeSådd(b) ? 1 : 0)).join(',') + '|' + Math.round(Math.min(1, V.åker.grodd / R.åker.modning) * 10) + (v ? v.årstid : ''); };
  const nøkkel3d = u => åkerNøkkel() + '|' + BRANNER.length + ':' + (BRANNER[0] ? BRANNER[0].x + ',' + BRANNER[BRANNER.length - 1].y : '') + '|' + V.soner.map(s => s.id + (feltFor.get(s.id) ? 'f' : '')).join(',') + '|' + Object.keys(V.funn.sett).filter(id => !V.funn.tatt[id]).join(';') + '|' + u.cx + ',' + u.cy + ',' + u.S;
  // FUNN I 3D (runde 4): kasser, sekker, tønner, telt, vrak og fly av fire former (ett instansnett per form, hjørnefarger per del).
  // Del: [form, lengde, bredde, høyde, x, y, z (over bakken), vridning (rad), farge, helling om y, helling om x (rad)]. Former: kasse, tønne (stående
  // sylinder), sekk (flattrykt kule) og telt (trekantet prisme langs y). Alle mål i meter, fronten mot +x.
  const KASSE = 0x7a5a36, KASSE2 = 0x8a6a40, GRØNN = 0x4f5a3a, TØNNE = 0x3d5a44, TØNNE2 = 0x7a3a2a, SEKK = 0xb8a27a, SEKK2 = 0x8c7b58, RUST = 0x6a4030;
  const FUNN3D = {
    vrak: [['kasse', 4.2, 1.8, .9, 0, 0, .35, 0, RUST, .04], ['kasse', 2, 1.6, .7, -.5, 0, 1.25, 0, 0x3b302a, .04], ['tønne', .7, .7, .3, 1.35, 1.2, .35, 0, 0x1c1a18, 0, 1.57], ['tønne', .7, .7, .3, 1.35, -1.1, .35, 0, 0x1c1a18, 0, 1.57],
      ['tønne', .7, .7, .3, -1.35, 1.2, .35, 0, 0x1c1a18, 0, 1.57], ['tønne', .7, .7, .3, -1.3, -1.25, .3, .4, 0x1c1a18, .2, 1.4], ['tønne', .6, .6, .9, 3.2, 1.6, 0, 0, TØNNE2, 0], ['kasse', .6, .5, .4, 2.8, -1.5, 0, .5, KASSE, 0]],
    depot: [['kasse', 1.2, .8, .7, 0, 0, 0, 0, KASSE, 0], ['kasse', 1.2, .8, .7, 0, .85, 0, .05, KASSE2, 0], ['kasse', 1.2, .8, .7, .1, .4, .7, -.08, GRØNN, 0], ['kasse', .8, .6, .5, 1.4, .1, 0, .6, GRØNN, 0],
      ['tønne', .6, .6, .9, -1.1, -.3, 0, 0, TØNNE, 0], ['tønne', .6, .6, .9, -1.1, .4, 0, 0, TØNNE, 0], ['tønne', .6, .6, .9, -1.75, .05, 0, 0, TØNNE2, 0],
      ['sekk', .9, .55, .4, 1.3, 1.2, 0, .3, SEKK, 0], ['sekk', .9, .55, .4, 1.5, 1.75, 0, -.2, SEKK2, 0], ['kasse', 2.6, 3, .05, 0, .3, 1.45, 0, 0x55603e, .25]],
    leir: [['telt', 2.4, 3.2, 1.5, 0, 0, 0, 0, 0x6c6f4e, 0], ['telt', 2, 2.8, 1.3, 3.6, 1.6, 0, .5, 0x7a6e52, 0], ['kasse', .25, .25, .25, 1.8, -2, 0, 0, 0x2a2622, 0],
      ['tønne', .9, .9, .12, 1.8, -2.1, 0, 0, 0x3a3631, 0], ['sekk', .8, .5, .35, -1.6, -1, 0, .7, SEKK, 0], ['sekk', .8, .5, .35, -1.7, -1.6, 0, .1, SEKK2, 0], ['kasse', .9, .6, .5, .9, 2.3, 0, .3, KASSE, 0], ['tønne', .55, .55, .85, -1.2, 1.9, 0, 0, TØNNE, 0]],
    fly: [['tønne', 1.4, 1.4, 8, 0, 0, .7, 0, 0xd8d6cf, 1.57], ['kasse', 1.6, 9.5, .2, .6, 0, 1, 0, 0xc9c7c0, .05], ['kasse', 1, 3, .18, -3.7, 0, 1.15, 0, 0xc9c7c0, 0], ['kasse', 1.1, .18, 1.4, -3.7, 0, 1.2, 0, 0xb24a3a, 0],
      ['kasse', .8, .7, .6, 2.6, 2.6, 0, .7, KASSE, 0], ['kasse', .8, .7, .6, -1.8, -3, 0, .2, KASSE2, 0], ['sekk', .8, .5, .35, 3.4, -1.8, 0, .4, SEKK, 0]],
  };
  const FORMER = ['kasse', 'tønne', 'sekk', 'telt'];
  function formGeo(navn) {
    let g;
    if (navn === 'kasse') g = new THREE.BoxGeometry(1, 1, 1);
    else if (navn === 'tønne') { g = new THREE.CylinderGeometry(.5, .5, 1, 12); g.rotateX(Math.PI / 2); }
    else if (navn === 'sekk') { g = new THREE.SphereGeometry(.5, 8, 5); }
    // (en sylinder med tre sider langs y har mønet opp og en flat side ned: et telt)
    else g = new THREE.CylinderGeometry(.6, .6, 1, 3);
    // origo midt på bunnen (sekken litt ned i bakken)
    g.computeBoundingBox(); g.translate(0, 0, -g.boundingBox.min.z - (navn === 'sekk' ? .15 : 0)); return g;
  }
  function lag3d(R) {
    const u = R.ut, M = mat3(), gr = new THREE.Group(), EX = R.EX || 1, inne = (X, Y, d = 0) => Math.abs(X - u.cx) < u.S - d && Math.abs(Y - u.cy) < u.S - d, z = (X, Y) => (hoyde3d(X, Y, u) - u.h0) * EX;
    D3 = { u, gruppe: gr, nøkkel: nøkkel3d(u), flammer: null }; gr.userData.kilde = 'verden-visning.js';
    // flammer og røyk i rutene som brenner
    const celler = BRANNER.filter(c => inne(c.x, c.y, 40));
    if (celler.length) { const per = Math.max(2, Math.min(9, Math.floor(2600 / celler.length))), n = celler.length * per, pos = new Float32Array(n * 3), bunn = new Float32Array(n), fase = new Float32Array(n), rp = new Float32Array(celler.length * 3), rb = new Float32Array(celler.length); let k = 0;
      celler.forEach((c, ci) => { for (let i = 0; i < per; i++, k++) { const X = c.x + (W.hash(k * 3 + 1) - .5) * 2 * c.r, Y = c.y + (W.hash(k * 3 + 2) - .5) * 2 * c.r; pos[k * 3] = X - u.cx; pos[k * 3 + 1] = Y - u.cy; bunn[k] = z(X, Y); fase[k] = W.hash(k * 3 + 3); }
        rp[ci * 3] = c.x - u.cx; rp[ci * 3 + 1] = c.y - u.cy; rb[ci] = z(c.x, c.y); });
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const f = new THREE.Points(fg, M.flamme); f.frustumCulled = false; gr.add(f);
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); const r = new THREE.Points(rg, M.røyk); r.frustumCulled = false; gr.add(r);
      // gløden ligger i ro på bakken (samme punkter som røyken starter i)
      const gp = new Float32Array(rp); for (let i = 0; i < rb.length; i++) gp[i * 3 + 2] = rb[i] + 4; const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); const gl = new THREE.Points(gg, M.glød); gl.frustumCulled = false; gr.add(gl);
      D3.flammer = { f, bunn, fase, r, rb }; }
    // ras: steinur
    const ras = V.soner.filter(s => s.type === 'ras' && inne(s.x, s.y, s.r));
    if (ras.length) { const per = 46, m = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M.stein, ras.length * per), o = new THREE.Object3D(); let k = 0;
      for (const s of ras) for (let i = 0; i < per; i++, k++) { const a = W.hash(s.id * 97 + i * 3) * 6.283, d = Math.sqrt(W.hash(s.id * 97 + i * 3 + 1)) * s.r * .55, X = s.x + Math.cos(a) * d, Y = s.y + Math.sin(a) * d, st = .7 + W.hash(s.id * 97 + i * 3 + 2) * 3.2;
        o.position.set(X - u.cx, Y - u.cy, z(X, Y) + st * .3); o.rotation.set(a, a * 2, a * 3); o.scale.set(st, st * (.7 + .5 * W.hash(i)), st * .7); o.updateMatrix(); m.setMatrixAt(k, o.matrix); }
      m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; gr.add(m); }
    // flom i flomfeltet: vannet ligger i dalbunnen og følger terrenget (0,3–1,2 m over bakken, dypest der feltet er dypest)
    for (const s of V.soner) { const f = s.type === 'flom' ? feltFor.get(s.id) : null; if (!f) continue; const m = flomNett(f, z); if (m) gr.add(m); }
    // flom uten felt (gamle lagrede spill): en vannflate litt over det laveste punktet
    for (const s of V.soner) { if (s.type !== 'flom' || feltFor.get(s.id) || !inne(s.x, s.y, s.r)) continue; let lav = z(s.x, s.y); for (let a = 0; a < 8; a++) lav = Math.min(lav, z(s.x + Math.cos(a * .785) * s.r * .5, s.y + Math.sin(a * .785) * s.r * .5));
      const v = new THREE.Mesh(new THREE.CircleGeometry(s.r, 40), M.vann); v.position.set(s.x - u.cx, s.y - u.cy, lav + 1.6 * EX); v.renderOrder = 2; gr.add(v); }
    // funn: vrak, depoter, forlatte leirer og fly – kasser, tønner, sekker og telt der funnet ligger (hver del på bakken der den står)
    const funn = Object.keys(V.funn.sett).filter(id => !V.funn.tatt[id]).map(id => { const [bx, by] = id.split(',').map(Number); return funnI(bx, by); }).filter(f => f && inne(f.x, f.y, 20));
    if (funn.length) { const ant = {}; for (const f of funn) for (const d of FUNN3D[f.type]) ant[d[0]] = (ant[d[0]] || 0) + 1;
      const nett = {}, k = {}, o = new THREE.Object3D(), c = new THREE.Color();
      for (const navn of FORMER) if (ant[navn]) { nett[navn] = new THREE.InstancedMesh(formGeo(navn), M.kasse, ant[navn]); k[navn] = 0; }
      for (const f of funn) { const a = W.hash(f.frø) * 6.283, cs = Math.cos(a), sn = Math.sin(a);
        for (const [form, l, b, h, dx, dy, dz, vri, farge, hell, hellX] of FUNN3D[f.type]) { const X = f.x + dx * cs - dy * sn, Y = f.y + dx * sn + dy * cs, m = nett[form];
          o.position.set(X - u.cx, Y - u.cy, z(X, Y) + dz); o.rotation.set(hellX || 0, hell || 0, a + vri, 'ZYX'); o.scale.set(l, b, h); o.updateMatrix(); m.setMatrixAt(k[form], o.matrix);
          const lys = .88 + .24 * W.hash(f.frø + k[form] * 13); m.setColorAt(k[form], c.setHex(farge).multiplyScalar(lys)); k[form]++; } }
      for (const m of Object.values(nett)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.frustumCulled = false; m.userData.funn = true; gr.add(m); } }
    // åkerstykkene: jord som følger terrenget, og kornet i rader langs den lange siden (rygger som vokser med årstiden)
    for (const b of åkerStykker()) { if (!inne(b.x, b.y, 60)) continue; const m = åkerNett(b, z); if (m) gr.add(m); }
    if (gr.children.length) R.scene.add(gr); else D3.tom = true;
  }
  // vannet i et flomfelt: et rutenett med felles hjørner (høyden = bakken + snittet av dybden i rutene rundt hjørnet)
  function flomNett(f, z) {
    const u = D3.u, inne = (X, Y) => Math.abs(X - u.cx) < u.S - 4 && Math.abs(Y - u.cy) < u.S - 4, hj = new Map(), pos = [], idx = [];
    const hjørne = (i, j) => { const k = j * (f.w + 1) + i; if (hj.has(k)) return hj.get(k); let d = 0, n = 0;
      for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < f.w && b < f.h && f.maske[b * f.w + a]) { d += f.dyp[b * f.w + a]; n++; }
      // hjørner i kanten av feltet ligger under bakken, så vannkanten skjærer terrenget (ikke trappetrinn langs rutenettet)
      const X = f.x0 + i * f.r, Y = f.y0 - j * f.r, dz = n === 4 ? .3 + .9 * Math.min(1, d / n / 2.5) : n >= 2 ? -.4 : -1.5; pos.push(X - u.cx, Y - u.cy, z(X, Y) + dz); hj.set(k, pos.length / 3 - 1); return pos.length / 3 - 1; };
    for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) { if (!f.maske[j * f.w + i]) continue; const X = f.x0 + (i + .5) * f.r, Y = f.y0 - (j + .5) * f.r; if (!inne(X, Y)) continue;
      const a = hjørne(i, j), b = hjørne(i + 1, j), c = hjørne(i + 1, j + 1), d = hjørne(i, j + 1); idx.push(a, d, c, a, c, b); }
    if (!idx.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, mat3().vann); m.renderOrder = 2; m.userData.flom = true; return m;
  }
  // ett nett per åkerstykke: jorda (ruter på 5 m) og radene (to skrå flater per stykke på 5 m), alt i lokale meter på utsnittet
  function åkerNett(b, z) {
    const f = Leir.BYGG.åker.fot, c = Math.cos(b.ret || 0), sn = Math.sin(b.ret || 0), u = D3.u, v = vær(), vinter = v && v.årstid === 'vinter';
    const XY = (lx, ly) => [b.x + lx * c - ly * sn, b.y + lx * sn + ly * c], pos = [], col = [];
    const fer = Leir.ferdig(b), andel = fer ? 1 : Math.max(0, Leir.framdrift(b)); if (andel <= .02) return null;
    const sådd = fer && stykkeSådd(b), K = W.korn(sådd, Math.min(1, V.åker.grodd / R.åker.modning)), svidd = 1 - .8 * (1 - Math.max(0, Math.min(1, b.hp == null ? 1 : b.hp)));
    const farge = (k, lys = 1) => { const q = vinter ? [.9, .91, .93] : k; return [q[0] * svidd * lys, q[1] * svidd * lys, q[2] * svidd * lys]; };
    const jord = farge([.36, .28, .19]), y1 = f[2] + (f[3] - f[2]) * andel, steg = 5, nx = Math.max(1, Math.round((f[1] - f[0]) / steg)), ny = Math.max(1, Math.round((y1 - f[2]) / steg));
    const P = (lx, ly, dz = 0) => { const [X, Y] = XY(lx, ly); return [X - u.cx, Y - u.cy, z(X, Y) + .06 + dz]; };
    const tri = (a, b2, c2, ka, kb, kc) => { pos.push(...a, ...b2, ...c2); col.push(...ka, ...(kb || ka), ...(kc || ka)); };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x0 = f[0] + (f[1] - f[0]) * i / nx, x1 = f[0] + (f[1] - f[0]) * (i + 1) / nx, ya = f[2] + (y1 - f[2]) * j / ny, yb = f[2] + (y1 - f[2]) * (j + 1) / ny;
      const a = P(x0, ya), b2 = P(x1, ya), c2 = P(x1, yb), d = P(x0, yb); tri(a, b2, c2, jord); tri(a, c2, d, jord); }
    // radene: furer (lave rygger) når åkeren er bar, kornet når den er sådd; snø om vinteren legger alt flatt og hvitt
    if (!vinter) { const rad = 1.25, h = sådd ? K.h : .12, topp = farge(sådd ? K.farge : [.45, .35, .24]), bunn = farge(sådd ? K.farge : [.3, .23, .16], sådd ? .62 : 1), n = Math.floor((f[1] - f[0]) / rad);
      for (let r = 0; r < n; r++) { const lx = f[0] + (r + .5) * rad;
        for (let j = 0; j < ny; j++) { const ya = f[2] + (y1 - f[2]) * j / ny, yb = f[2] + (y1 - f[2]) * (j + 1) / ny;
          const ta = P(lx, ya, h), tb = P(lx, yb, h), va = P(lx - rad * .45, ya), vb = P(lx - rad * .45, yb), ha = P(lx + rad * .45, ya), hb = P(lx + rad * .45, yb);
          tri(va, vb, tb, bunn, bunn, topp); tri(va, tb, ta, bunn, topp, topp); tri(ha, ta, tb, bunn, topp, topp); tri(ha, tb, hb, bunn, topp, bunn); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat3().åker); m.userData.åker = b.id; m.frustumCulled = true; g.computeBoundingSphere(); return m;
  }
  KROKER.ramme3d.push(R => {
    if (!klar || !R.ut || typeof THREE === 'undefined') return; const nå = performance.now();
    if (D3 && D3.u !== R.ut) fjern3d(R);
    if (nå - sist3d > 500) { sist3d = nå; const harNoe = BRANNER.length || V.soner.length || Object.keys(V.funn.sett).some(id => !V.funn.tatt[id]) || åkerStykker().length;
      if (D3 && D3.nøkkel !== nøkkel3d(R.ut)) fjern3d(R); if (!D3 && harNoe) lag3d(R); }
    const F = D3 && D3.flammer; if (!F) return;
    // flammene stiger og blaffer, røyken driver med vinden
    const p = F.f.geometry.attributes.position.array, t = nå / 1000; for (let k = 0; k < F.bunn.length; k++) p[k * 3 + 2] = F.bunn[k] + 2 + ((t * .9 + F.fase[k]) % 1) * 14;
    F.f.geometry.attributes.position.needsUpdate = true;
    const v = vær(), vx = v && v.vind ? Math.cos(v.vind.retning) * v.vind.fart : 0, vy = v && v.vind ? Math.sin(v.vind.retning) * v.vind.fart : 0, q = F.r.geometry.attributes.position.array;
    for (let i = 0; i < F.rb.length; i++) { const f = (t * .12 + W.hash(i + 5)) % 1; q[i * 3 + 2] = F.rb[i] + 20 + f * 110; }
    F.r.geometry.attributes.position.needsUpdate = true; F.r.position.set(vx * 3, vy * 3, 0);
  });
  KROKER.sett3d.push((u, R) => { fjern3d(R); });

  // ---------- værflisa: følgene av været ----------
  function linjer() { const v = vær(); return v ? W.forhold(V, v, { moh: leirMoh() }) : []; }
  function visForhold() {
    const el = document.getElementById('sVaer'), v = vær(); if (!el || !v) return; const d = el.parentNode, t = `${v.navn || ''}, ${v.temp} °C – ${linjer().join(' · ')}. Trykk for mer.`;
    if (d.title !== t) d.title = t; if (!d.dataset.verden) { d.dataset.verden = '1'; d.style.cursor = 'pointer'; d.addEventListener('click', () => vis(!åpen)); }
  }

  // ---------- panelet ----------
  const st = document.createElement('style');
  st.textContent = `#verdenpanel{position:fixed;right:12px;top:calc(var(--topp,44px) + 10px);width:min(380px,calc(100vw - 24px));max-height:calc(100vh - var(--topp,44px) - 90px);overflow:auto;z-index:60;display:none;
    background:rgba(24,22,19,.96);color:#e8e0cc;border:1px solid #5b5446;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.5);padding:12px 14px;font:15px/1.35 "Cormorant Garamond",Georgia,serif}
    #verdenpanel.på{display:block}#verdenpanel h2{margin:0 0 6px;font:22px "IM Fell English",Georgia,serif}#verdenpanel h3{margin:12px 0 4px;font-size:16px;border-top:1px solid #4a4438;padding-top:8px;color:#d8c690}
    #verdenpanel ul{margin:2px 0;padding-left:18px}#verdenpanel p{margin:3px 0}#verdenpanel small{color:#a9a08c}#verdenpanel button{font:inherit;margin:3px 4px 3px 0;padding:4px 10px;background:#3a352b;color:#e8e0cc;border:1px solid #6b6352;border-radius:5px;cursor:pointer}
    #verdenpanel button:disabled{opacity:.45;cursor:default}#verdenpanel select{font:inherit;background:#2a2620;color:#e8e0cc;border:1px solid #6b6352;border-radius:4px;max-width:150px}
    #verdenpanel .lukk{position:absolute;right:8px;top:6px;margin:0}#verdenpanel .usikker{color:#cdbf9a;font-style:italic}body.foto #verdenpanel{display:none}
    @media (max-width:700px){#verdenpanel{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:62vh}}`;
  document.head.appendChild(st);
  const P = document.createElement('div'); P.id = 'verdenpanel'; document.body.appendChild(P);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let valgA = '', valgB = '', beskjed = '';
  function html() {
    const v = vær(), S = spill(), ut = ['<button class="lukk" data-gjør="lukk" title="Lukk">×</button><h2>Verden rundt dere</h2>']; if (!v || !S) return ut.join('');
    ut.push(`<p><b>${esc(v.navn || '')}, ${v.temp} °C, ${esc((v.årstidNavn || '').toLowerCase())}</b></p><ul>` + linjer().map(l => `<li>${esc(l)}</li>`).join('') + '</ul>');
    ut.push(`<p><small>Is ${Math.round(Math.min(1, V.frost / R.is.bærer) * 100)} % · regn siste tid ${tall(V.regn, 1)} · tørke ${tall(V.tørke, 1)} døgn</small></p>`);
    ut.push(`<p><button data-gjør="auto">${V.auto.på ? 'Årstidene går av seg selv: på' : 'Årstidene går av seg selv: av'}</button><br><small>${V.auto.på ? `Hver årstid varer ${R.årstid.døgn} døgn.` : 'Nå bytter du årstid selv i ☰-menyen.'}</small></p>`);
    if (beskjed) ut.push(`<p class="usikker">${esc(beskjed)}</p>`);
    // åker
    const Å = V.åker; ut.push('<h3>Åker</h3>');
    syncÅker(); const stykker = åkerStykker(), uferdige = stykker.filter(b => !Leir.ferdig(b)).length;
    ut.push(`<p>${Å.mål ? `${tall(Å.mål, 1)} mål ved leiren. ` + (Å.sådd ? `Sådd – ${Å.grodd >= R.åker.modning ? 'kornet er modent' : `modent om ${tall(Math.max(0, R.åker.modning - Å.grodd), 1)} døgn`}; høstes når det blir høst (ca. ${tall(Å.mål * R.åker.perMål * Math.min(1, Å.grodd / R.åker.modning))} rasjoner nå).` : v.årstid === 'vår' ? 'Ikke sådd ennå.' : 'Ligger brakk – det sås om våren.') : 'Dere har ingen åker. En åker gir mye mat på én gang om høsten.'}</p>`);
    if (uferdige) ut.push(`<p><small>${uferdige} åkerstykke${uferdige > 1 ? 'r' : ''} ryddes og pløyes av byggelagene.</small></p>`);
    const vis0 = stykker[0] || (Å.x != null ? Å : null);
    if (Å.mål) { const f = åkerFolk(); ut.push(`<p><small>Folk: åkeren trenger ${f.behov} på «fri» i Folk-panelet, dere har ${f.har}.${f.andel < 1 ? (f.andel > 0 ? ` Kornet gror ${Math.round(f.andel * 100)} % så fort som det kunne.` : ' Ingen steller åkeren: kornet gror ikke.') : ''}${vis0 ? ` <button data-gjør="se" data-x="${Math.round(vis0.x)}" data-y="${Math.round(vis0.y)}">Vis åkeren</button>` : ''}</small></p>`); }
    if (Å.sådd && Å.sådde && stykker.some(b => Leir.ferdig(b) && !Å.sådde.includes(b.id))) ut.push('<p><small>Åkerstykker som ble ferdige etter såinga, sås neste vår.</small></p>');
    ut.push(`<button data-gjør="anlegg" ${Å.mål + ÅB.mål > R.åker.maks ? 'disabled' : ''}>Anlegg en åker (${ÅB.mål} mål, ${tall(Leir.BYGG.åker.pris / 1e6, 2)} mill. kr)</button><br><small>Åkeren er et bygg i leiren: velg stedet, så rydder et byggelag den. Den kan brenne når kornet er tørt.</small><br>`);
    if (Å.mål && !Å.sådd) ut.push(`<button data-gjør="så" ${v.årstid === 'vår' ? '' : 'disabled'}>Så (${tall(Å.mål * R.åker.såkorn / 1e6, 2)} mill. kr i såkorn)</button>`);
    // jakt
    ut.push(`<h3>Jakt</h3><p>Rein i fjellet (over 1100 moh.) og elg i skogen. Velg et lag som står i ro der, og trykk «Jakt på …». Går du selv og skyter et dyr i 3D, får leiren kjøttet.</p>`);
    const jeger = ENHETER.filter(s => s.jakt && s.side === 'blå'); if (jeger.length) ut.push('<p>' + jeger.map(s => `${esc(s.navn)}: ${tall(Math.max(0, (s.jakt.til - tid) / 60), 1)} t igjen`).join('<br>') + '</p>');
    // brann, flom, ras
    if (BRANNER.length || BRENT.length || V.soner.length) { ut.push('<h3>Brann, flom og ras</h3>');
      if (BRANNER.length) ut.push(`<p>Det brenner ${esc(stedTekst(BRANNER[0].x, BRANNER[0].y))} (${BRANNER.length} ruter).</p>`); if (BRENT.length) ut.push(`<p><small>Brent mark: ${tall(BRENT.length * R.brann.rute * R.brann.rute / 1e4)} dekar.</small></p>`);
      for (const s of V.soner) ut.push(`<p>${s.type === 'ras' ? 'Ras' : 'Flom'} ${esc(stedTekst(s.x, s.y))} – ${tall(Math.max(0, (s.til - tid) / 60), 1)} t igjen. <button data-gjør="se" data-x="${s.x}" data-y="${s.y}">Vis</button></p>`); }
    // funn
    const funn = Object.keys(V.funn.sett).filter(id => !V.funn.tatt[id]).map(id => { const [bx, by] = id.split(',').map(Number); return funnI(bx, by); }).filter(Boolean);
    ut.push('<h3>Funn i terrenget</h3>' + (funn.length ? funn.map(f => `<p>${esc(f.navn)} ${esc(stedTekst(f.x, f.y))} <button data-gjør="se" data-x="${f.x}" data-y="${f.y}">Vis</button></p>`).join('') + '<p><small>Send et lag helt bort (80 m) og trykk «Undersøk» i lagpanelet.</small></p>'
      : `<p><small>Vrak, depoter og forlatte leirer ligger rundt i terrenget. Lagene melder fra når de ser noe (innen ${R.funn.ser} m). Undersøkt: ${Object.keys(V.funn.tatt).filter(id => V.funn.sett[id]).length}.</small></p>`));
    // radio
    ut.push('<h3>Radio</h3>'); if (!harRadio()) ut.push('<p><small>Bygg en radiomast eller et kontrollrom for å høre hva som sendes i regionen.</small></p>');
    else if (!V.radio.liste.length) ut.push('<p><small>Stille på båndet. Meldingene kommer med noen timers mellomrom.</small></p>');
    else ut.push('<ul>' + V.radio.liste.map(m => `<li>${esc(m.tekst)} <small>(${tall(Math.max(0, (tid - m.t) / 60), 0)} t siden)</small></li>`).join('') + '</ul><p><small>Ikke alt som sendes, er sant.</small></p>');
    // tog
    const St = stasjoner(), mine = St.filter(s => s.eier === 'blå'); ut.push('<h3>Tog</h3>');
    for (const t of V.tog) ut.push(`<p>${esc(t.navnA)}–${esc(t.navnB)} (${tall(t.km, 1)} km): ` + (tid < t.klar ? `settes i stand, ${tall((t.klar - tid) / 60, 1)} t igjen` : `neste tog om ${tall(Math.max(0, (t.neste - tid) / 60), 1)} t`) + '</p>');
    if (mine.length < 2) ut.push(`<p><small>Hold to tettsteder med jernbanestasjon, så kan dere sette banen mellom dem i stand og få en stor last hvert døgn. ${St.length ? 'Stasjoner her: ' + St.slice(0, 8).map(s => esc(s.navn) + (s.eier === 'blå' ? ' (deres)' : '')).join(', ') + '.' : 'Ingen stasjonsbyer i dette kartet.'}</small></p>`);
    else { const valg = (id, v0) => `<select data-velg="${id}">` + mine.map(s => `<option value="${esc(s.id)}" ${String(s.id) === String(v0) ? 'selected' : ''}>${esc(s.navn)}</option>`).join('') + '</select>';
      if (!mine.some(s => String(s.id) === String(valgA))) valgA = mine[0].id; if (!mine.some(s => String(s.id) === String(valgB)) || String(valgB) === String(valgA)) valgB = (mine.find(s => String(s.id) !== String(valgA)) || mine[1]).id;
      const p = W.togPlan(mine.find(s => String(s.id) === String(valgA)), mine.find(s => String(s.id) === String(valgB)));
      ut.push(`<p>${valg('a', valgA)} – ${valg('b', valgB)}</p><p><small>${p.feil ? esc(p.feil) : `${tall(p.km, 1)} km: ${tall(p.pris / 1e6, 1)} mill. kr, ${p.stål} stål, ${p.timer} timer. Så et tog hvert døgn med ${R.tog.last.tre} tre, ${R.tog.last.betong} betong, ${R.tog.last.stål} stål, ${tall(R.tog.last.drivstoff)} l diesel og ${R.tog.last.mat} rasjoner.`}</small></p><button data-gjør="tog" ${p.feil ? 'disabled' : ''}>Sett banen i stand</button>`); }
    return ut.join('');
  }
  function tegnPanel() { if (!åpen) return; if (typeof pekerNede === 'function' && pekerNede(P)) return; const h = html(); if (h !== sistHtml) { const topp = P.scrollTop; sistHtml = h; P.innerHTML = h; P.scrollTop = topp; } }
  function vis(på) { åpen = !!på && klar; P.classList.toggle('på', åpen); if (åpen) { beskjed = ''; sistHtml = ''; tegnPanel(); } }
  setInterval(tegnPanel, 1500);
  P.addEventListener('change', e => { const s = e.target.closest('select[data-velg]'); if (!s) return; if (s.dataset.velg === 'a') valgA = s.value; else valgB = s.value; sistHtml = ''; tegnPanel(); });
  P.addEventListener('click', e => {
    const b = e.target.closest('button[data-gjør]'); if (!b || b.disabled) return; const hva = b.dataset.gjør; let r = null;
    if (hva === 'lukk') { vis(false); return; }
    if (hva === 'auto') settAuto(!V.auto.på);
    else if (hva === 'rydd') { ryddÅker().then(q => { beskjed = q && q.feil ? q.feil : ''; sistHtml = ''; tegnPanel(); }); return; } else if (hva === 'anlegg') { r = anleggÅker(); if (r.ok) return; } else if (hva === 'så') r = så(); else if (hva === 'tog') r = togStart(valgA, valgB);
    else if (hva === 'se') { if (typeof på3d !== 'undefined' && på3d) slå3d(false); kam.x = +b.dataset.x; kam.y = +b.dataset.y; if (kam.m > 12) kam.m = 12; if (hva === 'se' && b.textContent === 'Vis åkeren' && kam.m > 2) kam.m = 2; skitten = true; }
    beskjed = r && r.feil ? r.feil : ''; sistHtml = ''; setTimeout(tegnPanel, 0);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) vis(false); });

  // kommandolinja nederst på PC (spillhud.js leser lista når den lastes) og Leir-menyen (fanen Mål)
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'verden', navn: 'Verden', tast: '', ikon: "<circle cx='12' cy='12' r='9'/><path d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'/>",
    fins: () => klar, på: () => åpen, trykk: () => vis(!åpen), tittel: 'Verden rundt dere: føre, is, flom, brann, åker, jakt, funn, radio og tog' });
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el }) => {
    if (!klar) return; hode.append(el('h3', { 'data-fane': 'mål' }, 'Vær og verden'));
    const b = el('button', { type: 'button', id: 'verdenknapp' }, 'Åpne «Verden rundt dere»'); b.onclick = () => vis(true);
    hode.append(el('p', { klasse: 'verdenlinje' }, linjer().join(' · ')), b);
  });
  setInterval(() => { if (klar) visForhold(); }, 3000);

  Object.assign(api, { tilstand: () => V, vis, erÅpen: () => åpen, linjer, lagre, start, tenn, flom, ras, islagt, iSoneV, lagFlomfelt, felt: id => feltFor.get(id), undersøk, funnVed, funnNær, funnI, plasserFunn, funnFlytt: () => funnFlytt, startJakt, viltHer, ryddÅker, anleggÅker, åkerStykker, åkerVed, syncÅker, så, radioNå, harRadio, togStart, stasjoner, settAuto,
    punkt: punktA, tilpassSti, marsjSteg, kuldeTime, snøVegSteg, snøRuter, snøTilbake() { åpneSnø(); snøGrense = null; sistSnø = -1e9; lenkeH.clear(); }, snøLenker: () => snøLenker, snøGrense: () => snøGrense, lenkeHøyder, brannSteg: d => { const v = vær(); if (v) brannSteg(v, d); }, brannSkade, sjekkFunn, jaktSteg, togSteg, isSteg, regnHendelse, finnFlomsted, finnRassted,
    // for vakta: tøm alt som ligger i kartet (brann, soner) uten å røre funn, åker og tog
    åkerFolk, spor: () => spor, D3: () => D3, LEIRBRANN, slokkILeiren, brennbar,
    ryddKart() { for (const s of V.soner) åpneVeger(s); V.soner = []; feltFor.clear(); feltVenter.clear(); åpneSnø(); V.brann = W.nyBrann(); brannLister(); skitten = true; endret(); } });
  window.VerdenSpill = api;
})();
