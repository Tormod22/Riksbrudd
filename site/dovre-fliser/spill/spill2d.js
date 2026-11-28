/* SPILL I 2D (brukeren 26. nov: «Jeg ønsker at det skal være mulig å spille det bare i 2D, og så kan folk spille litt i 3D om de ønsker»).
 * Alt som før bare gikk når du gikk selv i 3D, har her en vei i kartet. Karakteren din (laget med s.karakter) står for deg:
 *  - HUS: trykk på et bygg i kartet -> «Let gjennom huset»: karakteren går dit (samme reise som «Gå inn i huset», Gange.reis), leter
 *    (Leting.tid sekunder, som i 3D) og funnet går samme vei som i 3D (LeteSpill.ferdig med { X, Y, i2d }). Ved huset også «Sikre huset»
 *    (OverlevSpill.sikre2d), «Hvil» og «Hent det som ligger igjen».
 *  - KARAKTEREN i kartet (lagpanelet): «Sett ut snarefelle», «Sjekk fella», «Sov her» (ute eller i et sikret hus) og «Hvil».
 *  - TELLERNE: meterne karakteren går i kartet teller som «gått» i historien (EventyrSpill.leggTil) og gir utholdenhet; fiender
 *    karakterlaget slår ut i kampen i kartet teller som «felt» (KROKER.salve). Målene «Gå selv», «Gå inn i et hus» og opplæringens
 *    «Gå ut i verden» nås også i kartet (Spill2D.reist / LeteSpill.antall).
 *  - 3D-VISNING av/på i ☰ (Bilde og lyd; localStorage «riksbrudd-uten3d»): av = 3D-knappen er borte, three.js lastes ikke i bakgrunnen,
 *    og alt som ville åpnet 3D (gå inn i huset, kameraene, kontrollrommets feeds) sier i stedet at 3D er slått av.
 * Reglene øverst er uten DOM (Node: require('./spill2d'); test_spill2d.js). Tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const REGLER = {
    nær: 30,           // m fra husets midte: karakteren står ved huset
    gåttMaks: 4000,    // et hopp lenger enn dette på ett sekund er en flytting (ny leir, lasting), ikke gange
    gåttMin: .5,
    utholdenhet: 40,   // meter per poeng utholdenhet (i 3D: løping gir et poeng per 12 m)
    reist: 50,         // meter karakteren må ha gått i kartet før målet «Gå selv» er nådd
  };
  // byggets klasse (samme regel som hus3d i index.html: type t, grunnflate A, høyde h)
  const klasse = (t, A, h) => t === 10 ? (A < 150 && h < 9 ? 'hus' : 'leil') : t === 0 ? (h >= 10 || A > 350 ? 'leil' : 'hus') : t === 1 ? 'uthus' : t === 6 ? 'industri'
    : t === 7 ? 'butikk' : t === 8 ? 'kirke' : t === 9 || t === 3 ? 'skole' : t === 4 ? 'låve' : t === 11 ? 'hytte'
    : t === 12 ? 'lager' : t === 13 ? 'sykehus' : t === 14 ? (h <= 16 && A > 1500 ? 'hangar' : 'terminal') : t === 15 ? 'sykehjem' : t === 16 ? 'legevakt'
    : t === 2 ? (h <= 11 && A > 700 ? 'industri' : h <= 9 ? 'butikk' : 'kontor') : (A < 60 ? 'uthus' : 'hus');
  const areal = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const midt = P => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
  // meterne fra forrige plass som teller som gange (0 når det er et hopp eller nesten stillstand)
  const gått = (a, b) => { if (!a || !b) return 0; const d = Math.hypot(b.x - a.x, b.y - a.y); return d >= REGLER.gåttMin && d <= REGLER.gåttMaks ? d : 0; };
  const lesAv = v => v === '1' || v === 'true';
  const Spill2D = { REGLER, klasse, areal, midt, gått, lesAv };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = Spill2D; return; }
  rot.Spill2D = Spill2D;

  // ---------- 3D av/på ----------
  const NØKKEL = 'riksbrudd-uten3d';
  let uten3d = false; try { uten3d = lesAv(localStorage.getItem(NØKKEL)); } catch (e) { /* sperret */ }
  rot.UTEN_3D = uten3d;
  const css = document.createElement('style');
  css.textContent = `body.uten3d #v3d, body.uten3d #gaaknapp, body.uten3d #gaainnknapp, body.uten3d [data-k="3d"]{ display:none !important; }
#hus2d{ display:flex; flex-wrap:wrap; gap:6px; flex:1 0 100%; margin:4px 0 0; } #hus2d button{ min-height:36px; } #hus2d small{ flex:1 0 100%; color:#b9ab8a; }
#let2d{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(120px + env(safe-area-inset-bottom,0px)); z-index:8; display:none; width:min(360px,90vw); box-sizing:border-box; padding:8px 12px;
  background:rgba(28,23,15,.95); border:1px solid #c9b26a; color:#f0e2b0; font-size:15px; } #let2d.på{ display:block; } #let2d .gang{ height:5px; background:rgba(231,220,195,.15); margin:6px 0 2px; } #let2d .gang i{ display:block; height:100%; width:0; background:#c9b26a; }
#let2d button{ float:right; margin:-2px 0 0 8px; min-height:30px; padding:2px 12px; background:#2a2318; border:1px solid #6b5a36; color:#f0e2b0; font:inherit; font-size:14px; cursor:pointer; }
@media (max-width:700px){ #let2d{ left:12px; right:76px; transform:none; width:auto; bottom:calc(150px + env(safe-area-inset-bottom,0px)); font-size:14px; } }`;
  document.head.appendChild(css);
  const settKropp = () => document.body.classList.toggle('uten3d', uten3d);
  if (document.body) settKropp(); else document.addEventListener('DOMContentLoaded', settKropp);
  function sett3d(av) {
    uten3d = !!av; rot.UTEN_3D = uten3d; try { localStorage.setItem(NØKKEL, uten3d ? '1' : '0'); } catch (e) { /* sperret */ } settKropp(); merk();
    if (uten3d && typeof på3d !== 'undefined' && på3d && typeof rot.slå3d === 'function') rot.slå3d(false);
    if (typeof logg === 'function') logg(uten3d ? '3D er slått av: du spiller i kartet. Slå det på igjen i ☰ → Bilde og lyd → 3D-visning.' : '3D er slått på igjen (knappen «3D» øverst).');
    if (!uten3d && typeof lastThree === 'function') lastThree().catch(() => {});
  }
  // alt som åpner 3D, går gjennom slå3d: med 3D av sier den fra i stedet
  const slå0 = rot.slå3d;
  if (typeof slå0 === 'function') rot.slå3d = function (på, ...r) { if (på && uten3d) { if (typeof logg === 'function') logg('3D er slått av (☰ → Bilde og lyd → 3D-visning). Alt kan gjøres i kartet.'); return Promise.resolve(false); } return slå0.call(this, på, ...r); };
  const knapp3d = document.createElement('button'); knapp3d.id = 'vis-3d'; knapp3d.type = 'button'; knapp3d.textContent = '3D-visning'; knapp3d.title = 'Av: du spiller bare i kartet (2D), og 3D lastes ikke';
  function merk() { knapp3d.classList.toggle('av', uten3d); knapp3d.setAttribute('aria-pressed', String(!uten3d)); }
  knapp3d.addEventListener('click', () => sett3d(!uten3d)); merk();
  { const m = document.getElementById('lagmeny'); if (m) m.appendChild(knapp3d); }

  // ---------- hjelpere ----------
  const karakter = () => (typeof ENHETER !== 'undefined' ? ENHETER.find(e => e.karakter && (typeof levende !== 'function' || levende(e))) : null);
  const går3d = () => typeof R3 !== 'undefined' && !!(R3 && R3.fot) && typeof på3d !== 'undefined' && på3d;
  const kn = (tekst, fn, id) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = tekst; if (id) b.id = id; b.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); }; return b; };
  const lukkPanel = () => { const l = document.getElementById('lukk'); if (l && document.getElementById('panel') && document.getElementById('panel').classList.contains('på')) l.click(); };
  const S = { reist: 0, leir: '' };
  const NØKKEL_S = 'riksbrudd-spill2d';
  const leirId = () => { const s = rot.OppstartSpill && OppstartSpill.tilstand(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  function last() { const id = leirId(); try { const d = JSON.parse(localStorage.getItem(NØKKEL_S) || 'null'); S.reist = d && d.leir === id ? +d.reist || 0 : 0; } catch (e) { S.reist = 0; } S.leir = id; }
  const lagre = () => { try { localStorage.setItem(NØKKEL_S, JSON.stringify({ leir: S.leir, reist: Math.round(S.reist) })); } catch (e) { /* sperret */ } };
  rot.addEventListener('riksbrudd-spill', () => setTimeout(last, 0));

  // ---------- leting, sikring og henting fra kartet ----------
  let jobb = null; const kort = document.createElement('div'); kort.id = 'let2d'; kort.setAttribute('role', 'status'); document.body.appendChild(kort);
  function husFra(b) { const P = b.P.map(p => [p[0], p[1]]), e = (b.o && b.o.e) || {}, A = areal(P), [X, Y] = midt(P); P.bygg = { i: e.i, kl: klasse(e.t, A, e.h || 6), h: e.h }; return { P, X, Y, i: e.i, kl: P.bygg.kl, A }; }
  const ved = (h, k) => !!k && Math.hypot(h.X - k.x, h.Y - k.y) <= REGLER.nær + Math.sqrt(h.A) / 2;
  // gå til huset (reisen i gange.js), så gjør fn der
  function gåTil(h, fn, tittel) {
    const k = karakter(), G = rot.Gaavalg; if (!k || !G || !rot.Gange) return false;
    if (k.ombord) { logg('Gå av kjøretøyet først.'); return false; }
    if (ved(h, k)) { fn(); return true; }
    const [tx, ty] = G.utenfor(h.P, k.x, k.y, G.REGLER.inn.ute), d = Math.hypot(tx - k.x, ty - k.y);
    if (G.valg(d).type === 'forLangt') { logg(`Det er ${(d / 1000).toFixed(1).replace('.', ',')} km dit – for langt å gå i ett strekk. Send karakteren nærmere først.`); return false; }
    lukkPanel(); Gange.reis(k, tx, ty, G.reiseMin(d), fn, tittel || 'Du går til huset …'); return true;
  }
  function let2d(h) {
    if (jobb) return false; const L = rot.LeteSpill; if (!L) return false;
    // (B2, ut3-etasjer) står karakteren i en annen etasje i huset, letes det der (spill/etasjer-visning.js)
    { const E2 = rot.Etasjer2D, hh = E2 && E2.husAv(h.i), n = hh ? E2.etasjeI(hh) : 1; if (n !== 1) return E2.let2d(hh, n); }
    const sek = (rot.Leting ? Leting.tid(h.A) : 8) * (rot.OverlevSpill ? OverlevSpill.letetid() : 1);
    jobb = { h, start: performance.now(), sek }; vis(); return true;
  }
  function vis() {
    if (!jobb) { kort.classList.remove('på'); return; }
    const k = karakter(), a = (performance.now() - jobb.start) / (jobb.sek * 1000);
    if (!k || !ved(jobb.h, k)) { jobb = null; kort.classList.remove('på'); logg('Letingen ble avbrutt – karakteren gikk fra huset.'); return; }
    if (a >= 1) { const h = jobb.h; jobb = null; kort.classList.remove('på'); LeteSpill.ferdig(h.P, { X: h.X, Y: h.Y, i2d: true }); if (typeof skitten !== 'undefined') skitten = true; return; }
    const navn = { hus: 'boligen', hytte: 'hytta', leil: 'leilighetsbygget', butikk: 'butikken', industri: 'industribygget', lager: 'lageret', låve: 'låven', uthus: 'uthuset', skole: 'skolen', sykehus: 'sykehuset', kontor: 'kontorbygget', kirke: 'kirka' }[jobb.h.kl] || 'huset';
    kort.replaceChildren(kn('Avbryt', () => { jobb = null; kort.classList.remove('på'); }), document.createTextNode(`Leter gjennom ${navn} … ${Math.ceil(jobb.sek * (1 - a))} s`));
    const g = document.createElement('div'); g.className = 'gang'; const i = document.createElement('i'); i.style.width = Math.round(a * 100) + '%'; g.append(i); kort.append(g); kort.classList.add('på');
    requestAnimationFrame(() => setTimeout(vis, 120));
  }
  // knappene for bygget i panelet (etter «Gå inn i huset» fra gange.js)
  async function husKnapper(X, Y) {
    const H = document.getElementById('handl'); if (!H || typeof finnBygg !== 'function' || !rot.LeteSpill) return; const b = await finnBygg(X, Y); if (!b || !b.o || !b.P || !b.o.e || b.o.e.i == null) return;
    const h = husFra(b), k = karakter(), gammel = document.getElementById('hus2d'); if (gammel) gammel.remove(); if (!k) return;
    // runde bygg har ingen innside (som i gange.js)
    let O = 0; for (let a = 0, j = h.P.length - 1; a < h.P.length; j = a++) O += Math.hypot(h.P[a][0] - h.P[j][0], h.P[a][1] - h.P[j][1]); if (O > 0 && 4 * Math.PI * h.A / (O * O) > .85) return;
    const rad = document.createElement('div'), nær = ved(h, k), G = rot.Gaavalg, d = Math.hypot(h.X - k.x, h.Y - k.y), tur = G && !nær ? ` (${G.tidTekst(G.valg(d).min || G.reiseMin(d))} til fots)` : '';
    rad.id = 'hus2d'; const lett = LeteSpill.lett().has(h.i), P = h.P, tf = rot.OverlevSpill && OverlevSpill.tilflukt ? OverlevSpill.tilflukt(h.i) : null;
    if (!lett) rad.append(kn('Let gjennom huset' + tur, () => gåTil(h, () => let2d(h), 'Du går til huset for å lete …'), 'let2dknapp'));
    else if (LeteSpill.plassTil(LeteSpill.restAv(P))) rad.append(kn('Hent det som ligger igjen' + tur, () => gåTil(h, () => LeteSpill.hent(P, { i2d: true })), 'hent2dknapp'));
    if (rot.OverlevSpill && OverlevSpill.sikre2d) {
      if (!tf) rad.append(kn('Sikre huset (3 m³ tre)' + tur, () => gåTil(h, () => { OverlevSpill.sikre2d({ i: h.i, x: h.X, y: h.Y, kl: h.kl }); }), 'sikre2dknapp'));
      else { rad.append(kn('Hvil her' + tur, () => gåTil(h, () => OverlevSpill.hvil(h.i)), 'hvil2dknapp'));
        if (rot.EventyrSpill && EventyrSpill.sov2d) rad.append(kn('Sov her' + tur, () => gåTil(h, () => EventyrSpill.sov2d()), 'sov2dknapp')); } }
    const lapp = document.createElement('small'); lapp.textContent = lett ? 'Gjennomsøkt.' + (tf ? ' Sikret tilfluktssted.' : '') : 'Karakteren din går dit i kartet og leter – du trenger ikke 3D.'; rad.append(lapp);
    H.append(rad);
  }
  const visBygg0 = typeof rot.visByggVed === 'function' ? rot.visByggVed : null;
  if (visBygg0) rot.visByggVed = async function (X, Y) { const ok = await visBygg0(X, Y); if (ok) { try { await husKnapper(X, Y); } catch (e) { console.warn('hus i 2D:', e); } } return ok; };

  // ---------- karakteren i kartet: feller, søvn ----------
  if (typeof KROKER !== 'undefined' && KROKER.lagKnapper) KROKER.lagKnapper.push((s, H) => {
    if (!s.karakter || s.side !== 'blå' || !rot.EventyrSpill || !EventyrSpill.karPos) return; const p = EventyrSpill.karPos(); if (!p) return;
    const sl = rot.OppstartSpill && OppstartSpill.tilstand(), iLeir = !!(sl && sl.leir && Math.hypot(p.x - sl.leir.x, p.y - sl.leir.y) < 150);
    const nr = EventyrSpill.nærFelle(p);
    if (nr >= 0) H.appendChild(kn('Sjekk fella', () => { EventyrSpill.sjekkFelle(nr); }, 'felle2dsjekk'));
    else if (EventyrSpill.harFelle() && !iLeir) H.appendChild(kn('Sett ut snarefelle', async () => { const skog = await skogVed(p.x, p.y); EventyrSpill.settFelle({ x: p.x, y: p.y, skog }); }, 'felle2dknapp'));
    if (!iLeir && !EventyrSpill.sover()) H.appendChild(kn(EventyrSpill.tilflukt2d() ? 'Sov i tilfluktsstedet' : 'Sov her', () => EventyrSpill.sov2d(), 'sov2dkar'));
  });
  // skog der fella settes (fangsten er bedre i skog): kartets terrengklasse 2 i 32 m-rutene når de er lastet
  async function skogVed(x, y) { try { if (typeof lagVindu !== 'function' || !rot.Terreng) return false; const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false), [i, j] = Terreng.rute(v, x, y);
    return i >= 0 && j >= 0 && i < v.w && j < v.h && v.K[j * v.w + i] === 2; } catch (e) { return false; } }

  // ---------- tellerne: gange og felte i kartet ----------
  let sist = null;
  setInterval(() => {
    const k = karakter(); if (!k || k.ombord || går3d() || !S.leir) { sist = k && !går3d() ? { x: k.x, y: k.y } : null; return; }
    const nå = { x: k.x, y: k.y }, d = gått(sist, nå); sist = nå; if (!d) return;
    if (rot.EventyrSpill && EventyrSpill.leggTil) EventyrSpill.leggTil('gått', d);
    if (rot.OverlevSpill && OverlevSpill.øk) OverlevSpill.øk('utholdenhet', d / REGLER.utholdenhet);
    const før = S.reist; S.reist += d; if (før < REGLER.reist && S.reist >= REGLER.reist && rot.MaalSpill) MaalSpill.sjekk(false);
    if (Math.floor(S.reist / 200) > Math.floor(før / 200)) lagre();
  }, 1000);
  // KROKER.salve: karakterlaget skyter på et lag -> de som faller, teller som «felt» (høyst én per salve: karakteren er én mann)
  const salver = [];
  if (typeof KROKER !== 'undefined') {
    (KROKER.salve = KROKER.salve || []).push((a, b) => { if (a && a.karakter && b && b.side !== 'blå' && b.menn) salver.push({ b, før: b.menn.filter(m => m.hp > 0).length }); return 0; });
    KROKER.sim.push(salveSteg);
  }
  function salveSteg() { let n0 = 0; while (salver.length) { const v = salver.shift(), n = v.før - v.b.menn.filter(m => m.hp > 0).length; if (n > 0 && rot.EventyrSpill && EventyrSpill.felt) { n0++; EventyrSpill.felt(); if (rot.OverlevSpill && OverlevSpill.øk) OverlevSpill.øk('skyting', 6); } } return n0; }

  Object.assign(Spill2D, { uten3d: () => uten3d, sett3d, reist: () => S.reist, harReist: () => S.reist >= REGLER.reist, let2d, gåTil, husFra, salveSteg, salver: () => salver, jobb: () => jobb, karakter, lagre, last, S });
})(typeof window !== 'undefined' ? window : globalThis);
