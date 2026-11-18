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
  const BRANNER = window.BRANNER = [], BRENT = window.BRENT = [];
  window.VERDEN_SONER = () => V.soner.map(s => ({ type: s.type, x: s.x, y: s.y, r: s.r, til: s.til }));
  const tall = (n, d = 0) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: d }).format(n);

  // ---------- lagring per leir ----------
  function lagre() { skittenLagring = false; if (!klar) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, ...V })); } catch (e) { /* fullt eller sperret */ } }
  function start() {
    const S = spill(); if (!S || !S.leir) return; leirId = Math.round(S.leir.x) + ',' + Math.round(S.leir.y); let d = null;
    try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    V = d && d.leir === leirId ? W.fraJSON(d) : W.ny(); klar = true; sistT = null; sistTime = null; stengt.clear(); brannLister(); skitten = true;
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
      let f = W.marsjFaktor(v, res(h)); const so = W.iSone(V, mx, my); if (so) f *= so.type === 'flom' ? R.regn.vasser : R.regn.rasFart;
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
  const nøkkel = v => (v.snø > .5 ? 's' : '') + (v.vær === 'storm' ? 'k' : '') + Math.round(v.snøgrense / 50) + '|' + V.soner.length;
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
  function kuldeTime(v, timer) {
    const l = leir(), L = LL();
    for (const s of ENHETER) {
      if (s.side !== 'blå' || !levende(s) || s.leirvakt) continue;
      const ute = !(l && Math.hypot(s.x - l.x, s.y - l.y) < R.kulde.læ) && !s.ombord && !iBy(s.x, s.y), h = moh(s.x, s.y);
      const t = W.tempVed(v, h == null ? leirMoh() : h), før = V.kulde[s.navn] || 0, n = W.kuldeSteg(V, s.navn, timer, t, ute), nå = V.kulde[s.navn] || 0, varsel = R.kulde.timerFør * .6;
      if (før < varsel && nå >= varsel && !n) logg(`${s.navn} begynner å fryse (${Math.round(t)} °C). Få dem til leiren eller inn i et tettsted før noen får frostskader.`);
      if (!n) continue;
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
  const stengt = new Map();
  async function stengVeger(s) {
    if (stengt.has(s.id)) return; let g = window.VEGNETT;
    // vegnettet er stort: i testene hentes det ikke bare for dette
    if (!g) { if (navigator.webdriver || !window.lastVegnett) return; try { g = await lastVegnett(); } catch (e) { return; } }
    if (stengt.has(s.id) || !V.soner.includes(s)) return; const lenker = []; stengt.set(s.id, lenker);
    const pkt = [[s.x, s.y]]; if (s.r > 120) for (let a = 0; a < 8; a++) pkt.push([s.x + Math.cos(a * Math.PI / 4) * s.r * .6, s.y + Math.sin(a * Math.PI / 4) * s.r * .6]);
    for (const p of pkt) { const n = g.naermeste(p, Math.max(120, s.r * .5)); if (n === -1) continue; const q = g.punkt(n); if (Math.hypot(q[0] - s.x, q[1] - s.y) > s.r) continue;
      for (const e of g.lenkerVed(n)) if (!g.lenke(e).sperret) { g.sperr(e); lenker.push(e); } }
    if (!lenker.length) return; const sett = new Set(lenker);
    for (const k of KJORETOY) { if (!k.sti || !Kjoretoy.lenkerIgjen(k).some(e => sett.has(e))) continue; const P = k.sti.P, r = Kjoretoy.planlegg(k, g, [P[P.length - 2], P[P.length - 1]]);
      if (r.feil) { Kjoretoy.stopp(k); k.oppdrag = null; logg(`${k.navn}: vegen er stengt av ${s.type === 'ras' ? 'raset' : 'flommen'}, og det finnes ingen omkjøring.`); } else if (!k.side || k.side === 'blå') logg(`${k.navn} kjører om ${s.type === 'ras' ? 'raset' : 'flommen'}.`); }
  }
  function åpneVeger(s) { const g = window.VEGNETT, l = stengt.get(s.id); stengt.delete(s.id); if (g && l) for (const e of l) if (!g._sperretAv || !g._sperretAv.has(e)) g.åpne(e); }
  function nySone(type, x, y, r, navn) {
    const s = W.nySone(V, type, x, y, r, tid, navn); stengVeger(s).catch(e => console.error(e)); skitten = true; endret();
    for (const e of ENHETER) if (e.side === 'blå' && levende(e) && W.iSone(V, e.x, e.y) === s && type === 'ras') { const ut = Terreng.fordelTreff(e.menn, 1, rng); logg(`${e.navn} ble tatt av raset: ${ut.map(([m, t]) => `${m.navn} ${t}`).join(', ')}.`); e.siktSkitten = true; }
    return s;
  }
  function flom(x, y, orden, navn) { const s = nySone('flom', x, y, W.flomRadius(V, orden || 3), navn); logg(`Flom: ${navn || 'elva'} går over sine bredder ${stedTekst(x, y)}. Det er tungt å ta seg fram der i ${R.regn.flomTimer} timer, og vegene er stengt.`); return s; }
  function ras(x, y) { const s = nySone('ras', x, y, R.regn.rasRadius); logg(`Ras: lia har gått ${stedTekst(x, y)}. Vegen der er stengt i ${R.regn.rasTimer} timer.`); return s; }
  async function finnFlomsted() {
    const l = leir(); if (!l || !window.BEKKER || !BEKKER.hent) return null; const D = 12000; let biter = [];
    try { biter = await BEKKER.hent([l.x - D, l.y - D, l.x + D, l.y + D], [0, 1]); } catch (e) { return null; }
    const kand = []; for (const b of biter) for (const ln of (b && b.linjer) || []) if (ln.orden >= 3 && ln.P.length > 1) { const p = ln.P[Math.floor(Math.random() * ln.P.length)]; if (Math.hypot(p[0] - l.x, p[1] - l.y) < D && !W.iSone(V, p[0], p[1])) kand.push({ x: p[0], y: p[1], orden: ln.orden, navn: ln.navn }); }
    return kand.length ? kand[Math.floor(Math.random() * kand.length)] : null;
  }
  async function finnRassted() {
    const l = leir(); if (!l) return null; const g = window.VEGNETT;
    for (let t = 0; t < 40; t++) {
      const a = Math.random() * 6.283, d = 800 + Math.random() * 11000; let x = l.x + Math.cos(a) * d, y = l.y + Math.sin(a) * d;
      if (g) { const n = g.naermeste([x, y], 1500); if (n === -1) continue; [x, y] = g.punkt(n); }
      const p = await punktA(x, y); if (!p || p.h == null || p.k === 3 || W.iSone(V, x, y) || Math.hypot(x - l.x, y - l.y) < 300) continue; let bratt = 0;
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

  // ---------- 35 brann ----------
  function brannLister() {
    const L = W.brannListe(V.brann); BRANNER.length = 0; BRENT.length = 0; for (const c of L.brenner) BRANNER.push(c); for (const c of L.brent) BRENT.push(c);
    try { window.dispatchEvent(new Event('riksbrudd-brann')); } catch (e) { /* eldre nettleser */ }
  }
  const brennbar = (x, y) => { const p = punkt(x, y), v = vær(); if (!p || p.h == null) return 0; if (v && p.h > v.snøgrense) return 0; return R.brennbar[p.k] || 0; };
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
    const r = W.brannSteg(V.brann, tid, dt, { ...v, regn: Math.max(v.regn || 0, v.snø || 0) }, W.brannfare(V, v), brennbar); if (r.nye || r.ut) { brannLister(); skitten = true; endret(); }
    if (r.ut && !Object.keys(V.brann.celler).length) logg(`Brannen har sloknet. ${tall(BRENT.length * R.brann.rute * R.brann.rute / 1e4)} dekar er brent.`);
  }
  function brannSkade() {
    for (const s of ENHETER) { if (!levende(s) || !W.brenner(V.brann, s.x, s.y)) continue; const ut = Terreng.fordelTreff(s.menn, R.brann.treff, rng); s.siktSkitten = true;
      if (s.side === 'blå') logg(`${s.navn} står i brannen: ${ut.map(([m, t]) => `${m.navn} ${t}`).join(', ')}. Få dem ut!`); if (valgt === s) visPanel(); }
    const L = LL(); if (L && window.Leir) for (const b of L.bygg.slice()) { if (!(b.hp > 0) || !W.brenner(V.brann, b.x, b.y)) continue; const r = Leir.skad(L, b.id, Math.max(1, b.hp * R.brann.bygg)); logg(`Brannen tar ${(Leir.BYGG[b.type] || {}).navn || 'et bygg'} i leiren${r && r.ødelagt ? ' – det er ødelagt' : ''}.`); }
  }

  // ---------- 36 funn ----------
  function sjekkFunn() {
    const ser = []; for (const s of ENHETER) if (s.side === 'blå' && levende(s)) ser.push([s.x, s.y, s.navn]);
    const Q = typeof R3 !== 'undefined' ? R3 : null, kr = Q && Q.fot && Q.ut && window.Gange && Gange.kropp && Gange.kropp(); if (kr) ser.push([Q.ut.cx + kr.x, Q.ut.cy + kr.y, 'Du', true]);
    for (const [x, y, navn, selv] of ser) for (const f of W.funnNær(x, y, R.funn.ser)) {
      if (V.funn.tatt[f.id]) continue;
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
  const funnVed = s => W.funnNær(s.x, s.y, R.funn.tar).find(f => V.funn.sett[f.id] && !V.funn.tatt[f.id]) || null;

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
        if (t) { const mat = Math.round((R.kjøtt[t.art] || 0) * (t.ung ? .5 : 1)), F = FF(), navn = (window.Dyr && Dyr.ARTER[t.art] ? Dyr.ARTER[t.art].navn : t.art).toLowerCase();
          // (pakka «karakter») langt fra leiren bærer du kjøttet selv: EventyrSpill.felteDyr svarer true når det er lagt i sekken
          if (window.EventyrSpill && EventyrSpill.felteDyr && EventyrSpill.felteDyr(mat, navn, t.avst)) continue;
          if (F) F.mat += mat;
          logg(`Du felte en ${navn} på ${Math.round(t.avst)} m: ${mat} rasjoner kjøtt til leiren.`); } }
      // skudd i knusktørr skog kan tenne (ikke av seg selv i testene)
      else if (auto() && v && W.brannfare(V, v) >= .6 && Math.random() < .004) tenn(b.x, b.y, 'Skuddvekslingen').catch(() => {});
    }
  }

  // ---------- 34 åker ----------
  function ryddÅker() { const p = R.åker.rydd; if (V.åker.mål + R.åker.ryddMål > R.åker.maks) return { feil: `Dere kan ikke drive mer enn ${R.åker.maks} mål.` }; if (!OppstartSpill.betal(p)) return { feil: 'Ikke nok penger.' }; W.ryddÅker(V); endret(); logg(`Ny åker ryddet ved leiren: ${V.åker.mål} mål i alt. Så om våren.`); return { ok: true }; }
  function så() { const v = vær(), å = v ? v.årstid : 'sommer', pris = V.åker.mål * R.åker.såkorn; if (å === 'vår' && V.åker.mål && !V.åker.sådd && spill().penger < pris) return { feil: 'Ikke nok penger til såkorn.' };
    const r = W.så(V, å); if (r.feil) return r; OppstartSpill.betal(r.pris); endret(); logg(`Åkeren er sådd (${V.åker.mål} mål). Høstes til høsten.`); return r; }
  function åkerSteg(v, dt) { const r = W.åkerSteg(V, dt / 1440, v.årstid); if (r.mat != null) { const F = FF(); if (F) F.mat += r.mat; endret(); logg(r.mat ? `Innhøsting: åkeren ga ${tall(r.mat)} rasjoner${r.andel < 1 ? ' (kornet rakk ikke å bli modent)' : ''}.` : 'Åkeren ga ingenting i år.'); } else if (r.tapt) { endret(); logg('Avlinga frøs bort: det ble vinter før dere fikk høstet.'); } }

  // ---------- 37 radio ----------
  const harRadio = () => { const L = LL(); return !!(L && window.Leir && L.bygg.some(b => (b.type === 'radiomast' || b.type === 'kontrollrom') && Leir.virker(b))); };
  function sanne(v) {
    const ut = [], l = leir(); if (!l) return ut;
    for (const s of V.soner) ut.push(s.type === 'ras' ? `Vegmelding: ras ${stedTekst(s.x, s.y)}, vegen er stengt.` : `Flomvarsel: vannet står høyt ${stedTekst(s.x, s.y)}.`);
    if (BRANNER.length) ut.push(`Brannvakta: det brenner ${stedTekst(BRANNER[0].x, BRANNER[0].y)}.`);
    if (v) { if (W.brannfare(V, v) >= 1) ut.push('Værmelding: knusktørt i skogen – stor brannfare.'); if (W.flomfare(V) >= 1) ut.push('Værmelding: mye regn – elvene kan gå over.');
      if (v.temp <= R.kulde.grense) ut.push(`Værmelding: sprengkulde, ${Math.round(v.temp)} grader i dalen.`); if (W.isBærer(V)) ut.push('Melding fra fiskere: isen på vannene bærer.'); }
    for (const f of W.funnNær(l.x, l.y, 9000)) if (!V.funn.tatt[f.id] && !V.funn.sett[f.id]) { ut.push(`Rykte: det skal ligge noe (${f.navn.toLowerCase()}) ${stedTekst(f.x, f.y)}.`); if (ut.length > 8) break; }
    for (const b of byer()) { const e = eier(b.id); if (e && e !== 'blå' && Math.hypot(b.x - l.x, b.y - l.y) < 60000 && window.Fraksjoner && Fraksjoner.FRAKSJONER[e]) ut.push(`Melding: ${Fraksjoner.FRAKSJONER[e].navn} holder ${b.navn}.`); }
    return ut;
  }
  function radioNå() { const v = vær(), l = leir(), steder = l ? byer().filter(b => Math.hypot(b.x - l.x, b.y - l.y) < 80000).map(b => b.navn) : []; const m = W.radioInn(V, W.radioMelding(sanne(v), steder, Math.random), tid, Math.random); endret(); logg('Radio: ' + m.tekst); return m; }

  // ---------- 38 tog ----------
  // stasjonsbyene i spillkartet, de nærmeste leiren først
  function stasjoner() { const l = leir(), d = b => (l ? Math.hypot(b.x - l.x, b.y - l.y) : 0);
    return byer().filter(b => W.erStasjon(b.navn) && (!window.OMRÅDE_OK || OMRÅDE_OK(b.x, b.y))).sort((a, b) => d(a) - d(b)).map(b => ({ id: b.id, navn: b.navn, x: b.x, y: b.y, eier: eier(b.id) })); }
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
      else { const fikk = gi(h.last); logg(`Tog på ${n}: ` + (fikk.length ? fikk.join(', ') + ' til leiren.' : 'lasten fikk ikke plass i leiren.')); } }
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
    for (const s of W.ryddSoner(V, tid)) { åpneVeger(s); skitten = true; endret(); logg(s.type === 'ras' ? `Raset ${stedTekst(s.x, s.y)} er ryddet. Vegen er åpen.` : `Flommen ${stedTekst(s.x, s.y)} har trukket seg tilbake.`); }
    for (const s of V.soner) if (!stengt.has(s.id) && window.VEGNETT) stengVeger(s).catch(() => {});
    if (sistBrann == null || tid - sistBrann >= 10 || tid < sistBrann) { const d = sistBrann == null || tid < sistBrann ? 10 : Math.min(60, tid - sistBrann); sistBrann = tid; brannSteg(v, d); }
    if (BRANNER.length && (sistSkade == null || tid - sistSkade >= 30 || tid < sistSkade)) { sistSkade = tid; brannSkade(); }
    if (!auto()) { if (window.VERDEN_IS) isSteg(); return; }
    // det som skjer av seg selv (ikke i testene)
    W.steg(V, dt, v); if (dt) endret(); isSteg(); marsjSteg(v); snøVeg(v); sjekkFunn();
    const time = Math.floor(tid / 60);
    if (sistTime == null) sistTime = time;
    if (time !== sistTime) { const timer = Math.min(6, Math.max(1, time - sistTime)); sistTime = time; kuldeTime(v, timer); regnHendelse().catch(e => console.error(e));
      if (v.torden > 0 && W.brannfare(V, v) > .4 && Math.random() < .05) { const l = leir(); if (l) { const a = Math.random() * 6.283, d = 1000 + Math.random() * 7000; tenn(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, 'Lynet').catch(() => {}); } }
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
    const so = W.iSone(V, s.x, s.y, 'ras'); if (so && s.ingeniør && so.til - tid > R.regn.ryddTimer * 60) { const b = knapp(`Rydd raset (${R.regn.ryddTimer} t)`, false, () => { so.til = tid + R.regn.ryddTimer * 60; endret(); logg(`${s.navn} rydder raset: vegen er åpen om ${R.regn.ryddTimer} timer.`); visPanel(); }); b.id = 'ryddknapp'; H.appendChild(b); }
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
    // flom og ras
    for (const s of V.soner) { if (!inne(s.x, s.y, s.r / m + 20)) continue; const rr = Math.max(5, s.r / m), flom = s.type === 'flom';
      g.beginPath(); g.arc(sx(s.x), sy(s.y), rr, 0, 6.283); g.fillStyle = flom ? 'rgba(74,127,176,.42)' : 'rgba(120,92,60,.5)'; g.fill(); g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = flom ? '#a9c6df' : '#d9b98a'; g.stroke(); g.setLineDash([]);
      g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.fillStyle = flom ? '#d5e6f5' : '#f0dcc0'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; const t = flom ? 'flom' : 'ras'; g.strokeText(t, sx(s.x), sy(s.y) + 4); g.fillText(t, sx(s.x), sy(s.y) + 4); }
    // funn som er sett, men ikke undersøkt
    if (m < 120) { const B = R.funn.blokk, x0 = vx0, x1 = vx0 + VW * m, y1 = vy1, y0 = vy1 - VH * m;
      for (const id of Object.keys(V.funn.sett)) { if (V.funn.tatt[id]) continue; const [bx, by] = id.split(',').map(Number); if ((bx + 1) * B < x0 || bx * B > x1 || (by + 1) * B < y0 || by * B > y1) continue; const f = W.funnIBlokk(bx, by); if (!f) continue;
        const a = sx(f.x), b = sy(f.y); g.beginPath(); g.moveTo(a, b - 7); g.lineTo(a + 7, b); g.lineTo(a, b + 7); g.lineTo(a - 7, b); g.closePath(); g.fillStyle = '#e2c15a'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#1b1a17'; g.stroke();
        g.fillStyle = '#1b1a17'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('?', a, b + 3.5);
        if (m < 25) { g.font = 'italic 12px "Cormorant Garamond",serif'; g.fillStyle = '#f1e2a8'; g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 3; g.strokeText(f.navn, a, b + 20); g.fillText(f.navn, a, b + 20); } } }
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
    for (const id of Object.keys(V.funn.sett)) { if (V.funn.tatt[id]) continue; const [bx, by] = id.split(',').map(Number), f = W.funnIBlokk(bx, by), q = f && proj(f.x, f.y); if (!q) continue; g.fillStyle = '#f1e2a8'; g.fillText('◆ ' + f.navn, q[0], q[1]); }
    g.restore();
  });

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
    ut.push(`<p>${Å.mål ? `${Å.mål} mål ved leiren. ` + (Å.sådd ? `Sådd – ${Å.grodd >= R.åker.modning ? 'kornet er modent' : `modent om ${tall(Math.max(0, R.åker.modning - Å.grodd), 1)} døgn`}; høstes når det blir høst (ca. ${tall(Å.mål * R.åker.perMål * Math.min(1, Å.grodd / R.åker.modning))} rasjoner nå).` : v.årstid === 'vår' ? 'Ikke sådd ennå.' : 'Ligger brakk – det sås om våren.') : 'Dere har ingen åker. En åker gir mye mat på én gang om høsten.'}</p>`);
    ut.push(`<button data-gjør="rydd" ${Å.mål + R.åker.ryddMål > R.åker.maks ? 'disabled' : ''}>Rydd ${R.åker.ryddMål} mål åker (${tall(R.åker.rydd / 1e6, 1)} mill. kr)</button>`);
    if (Å.mål && !Å.sådd) ut.push(`<button data-gjør="så" ${v.årstid === 'vår' ? '' : 'disabled'}>Så (${tall(Å.mål * R.åker.såkorn / 1e6, 2)} mill. kr i såkorn)</button>`);
    // jakt
    ut.push(`<h3>Jakt</h3><p>Rein i fjellet (over 1100 moh.) og elg i skogen. Velg et lag som står i ro der, og trykk «Jakt på …». Går du selv og skyter et dyr i 3D, får leiren kjøttet.</p>`);
    const jeger = ENHETER.filter(s => s.jakt && s.side === 'blå'); if (jeger.length) ut.push('<p>' + jeger.map(s => `${esc(s.navn)}: ${tall(Math.max(0, (s.jakt.til - tid) / 60), 1)} t igjen`).join('<br>') + '</p>');
    // brann, flom, ras
    if (BRANNER.length || BRENT.length || V.soner.length) { ut.push('<h3>Brann, flom og ras</h3>');
      if (BRANNER.length) ut.push(`<p>Det brenner ${esc(stedTekst(BRANNER[0].x, BRANNER[0].y))} (${BRANNER.length} ruter).</p>`); if (BRENT.length) ut.push(`<p><small>Brent mark: ${tall(BRENT.length * R.brann.rute * R.brann.rute / 1e4)} dekar.</small></p>`);
      for (const s of V.soner) ut.push(`<p>${s.type === 'ras' ? 'Ras' : 'Flom'} ${esc(stedTekst(s.x, s.y))} – ${tall(Math.max(0, (s.til - tid) / 60), 1)} t igjen. <button data-gjør="se" data-x="${s.x}" data-y="${s.y}">Vis</button></p>`); }
    // funn
    const funn = Object.keys(V.funn.sett).filter(id => !V.funn.tatt[id]).map(id => { const [bx, by] = id.split(',').map(Number); return W.funnIBlokk(bx, by); }).filter(Boolean);
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
    else if (hva === 'rydd') r = ryddÅker(); else if (hva === 'så') r = så(); else if (hva === 'tog') r = togStart(valgA, valgB);
    else if (hva === 'se') { if (typeof på3d !== 'undefined' && på3d) slå3d(false); kam.x = +b.dataset.x; kam.y = +b.dataset.y; if (kam.m > 12) kam.m = 12; skitten = true; }
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

  Object.assign(api, { tilstand: () => V, vis, erÅpen: () => åpen, linjer, lagre, start, tenn, flom, ras, undersøk, funnVed, startJakt, viltHer, ryddÅker, så, radioNå, harRadio, togStart, stasjoner, settAuto,
    punkt: punktA, tilpassSti, marsjSteg, kuldeTime, brannSteg: d => { const v = vær(); if (v) brannSteg(v, d); }, brannSkade, sjekkFunn, jaktSteg, togSteg, isSteg, regnHendelse, finnFlomsted, finnRassted,
    // for vakta: tøm alt som ligger i kartet (brann, soner) uten å røre funn, åker og tog
    ryddKart() { for (const s of V.soner) åpneVeger(s); V.soner = []; V.brann = W.nyBrann(); brannLister(); skitten = true; endret(); } });
  window.VerdenSpill = api;
})();
