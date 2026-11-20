/* Riksbrudd – LUT OG BEHOLDERE, visningen (window.LutSpill). Reglene: spill/lut.js (alle tall er Claudes forslag).
 * Brukeren 18. nov kveld: «Legg også til at en kan finne lut inni hus …» og «Jeg ønsker liksom inventar systemet til project zomboid».
 *  BEHOLDERNE: mens du går inne i et bygg, kommer «Åpne kjøleskapet (E)» når du står ved et møbel det kan ligge noe i. Lutpanelet
 *   (#lutpanel) har det du bærer til venstre og beholderne innen rekkevidde til høyre, med en fane per beholder og «Gulvet».
 *   Trykk en ting og så den andre siden for å flytte (telefon), eller dra og slipp (mus). Høyreklikk / hold inne gir valgene i feltet
 *   under: Spis, Drikk, Utstyr, Ta på, Legg fra deg, Flytt til …, Bruk, Lad, Gi til leiren. Tab åpner panelet når du går (bare Gulvet ute).
 *  DET DU BÆRER er sekken i spill/utstyr.js (I.ting og beltet I.våpen = hurtigplassene 1–4). Her kommer sekken på ryggen (S.rygg),
 *   datoene for fersk mat (S.dato), og vekta/plassen (Utstyr.krok): lommene + sekken gir plass, for tungt gjør deg treg (gange.js)
 *   og fortere sliten (karakter.js), svært tungt = ingen løping.
 *  LAGRING per leir i «riksbrudd-lut»: beholdere som er endret (S.b), haugene på gulvet (S.gulv), sekken på ryggen og datoene.
 *  Lastes rett etter leting-visning.js – før utstyr.js, så tingene legges inn i Utstyr.TING når siden er lest (DOMContentLoaded)
 *  og senest når spillet starter (lytteren her kommer før sekkens egen).
 */
(function (rot) {
  'use strict';
  const L = rot.Lut; if (!L || typeof document === 'undefined') return;
  const R = L.REGLER, G = L.GJENSTANDER, NØKKEL = 'riksbrudd-lut';
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const nå = () => (typeof tid !== 'undefined' ? tid : 0);
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (v === undefined || v === null || v === false) continue; if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, fn, a = {}) => { const b = el('button', { type: 'button', ...a }, tekst); b.onclick = e => { e.stopPropagation(); fn(e); }; return b; };
  const kg = v => L.tall(Math.round(v * 10) / 10) + ' kg';
  // berøringsskjerm: ingen tastaturhint («(E)», «(Tab)») – runde 12, kritiker E så «(Tab)» på telefonen
  const grovPek = () => !!((rot.matchMedia && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && rot.matchMedia && !matchMedia('(hover: hover)').matches));
  const ut = { test: false };

  // ---------- tingene inn i sekkens tabeller ----------
  // Jaktrifla: en boltrifle med fire skudd 7,62 mm (Claudes tall) – finnes i hus, kan ikke kjøpes
  const JAKTRIFLE = { navn: 'Jaktrifle', ammo: 'a762', magasin: 4, takt: 1.2, lade: 2.8, rekkevidde: 450, skade: .9, bredde: .8, hagl: 1, vekt: 3.6, pris: 0, selges: false, tekst: 'Boltrifle til elgjakt – presis, få skudd' };
  let registrert = false; const VEKT = {};
  function registrer() {
    if (registrert || !rot.Utstyr) return; registrert = true;
    if (!Utstyr.VÅPEN.jaktrifle) Utstyr.VÅPEN.jaktrifle = JAKTRIFLE;
    for (const [id, g] of Object.entries(G)) if (!g.finnes && !Utstyr.TING[id]) Utstyr.TING[id] = { navn: g.navn, enhet: g.enhet, vekt: g.vekt, pris: 0, pakke: 1, del: true, lut: true, ...(g.helse ? { helse: g.helse } : {}) };
    // alle våpen kan ligge i en beholder eller i sekken som en ting («v_hagle»), også de som ikke finnes i husene
    for (const [vid, V] of Object.entries(Utstyr.VÅPEN)) if (!Utstyr.TING['v_' + vid]) Utstyr.TING['v_' + vid] = { navn: V.navn, enhet: 'stk.', vekt: V.vekt, pris: 0, pakke: 1, del: true, lut: true };
    for (const [id, T] of Object.entries(Utstyr.TING)) VEKT[id] = T.vekt;
    Utstyr.krok = { maks, vekt, plassTil, våpenOk };
  }
  document.addEventListener('DOMContentLoaded', registrer);
  const vektAv = id => (VEKT[id] !== undefined ? VEKT[id] : rot.Utstyr && Utstyr.TING[id] ? (VEKT[id] = Utstyr.TING[id].vekt) : G[id] ? G[id].vekt : 0);
  const navn = id => ((rot.Utstyr && Utstyr.TING[id]) || G[id] || { navn: id }).navn;
  const våpenAv = id => (G[id] && G[id].våpen) || (/^v_/.test(id) && rot.Utstyr && Utstyr.VÅPEN[id.slice(2)] ? id.slice(2) : null);
  const kat = id => (G[id] ? G[id].kat : /^v_/.test(id) ? 'våpen' : rot.Utstyr && Utstyr.TING[id] && Utstyr.TING[id].enhet === 'skudd' ? 'ammo' : 'utstyr');

  // ---------- tilstanden ----------
  const nyS = () => ({ rygg: R.rygg, dato: {}, b: {}, gulv: [], strømAv: null, ran: {}, fylt: {} });
  let S = nyS(), leirId = '', klar = false, sistLagret = 0, endret = false;
  const lagreNå = () => { endret = false; sistLagret = performance.now(); try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } };
  const lagre = () => { endret = true; if (performance.now() - sistLagret > 800) lagreNå(); };
  setInterval(() => { if (endret) lagreNå(); }, 1500);
  rot.addEventListener('pagehide', () => { if (endret) lagreNå(); });
  function start() {
    registrer(); const O = rot.OppstartSpill && OppstartSpill.tilstand(); if (!O || !O.leir) return;
    leirId = Math.round(O.leir.x) + ',' + Math.round(O.leir.y); let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S = nyS(); if (d && d.leir === leirId && d.d) { const q = d.d; S.rygg = q.rygg === null ? null : G[q.rygg] && G[q.rygg].sekk ? q.rygg : R.rygg; S.dato = q.dato || {}; S.b = q.b || {}; S.gulv = Array.isArray(q.gulv) ? q.gulv : []; S.strømAv = q.strømAv === undefined ? null : q.strømAv; S.ran = q.ran && typeof q.ran === 'object' ? q.ran : {}; S.fylt = q.fylt && typeof q.fylt === 'object' ? q.fylt : {}; }
    minne.clear(); klar = true; åpne(false);
  }
  rot.addEventListener('riksbrudd-spill', () => { registrer(); setTimeout(start, 0); });

  // ---------- sekken: vekt og plass (Utstyr.krok) ----------
  const sekk = () => (rot.UtstyrSpill && UtstyrSpill.klar() ? UtstyrSpill.tilstand() : null);
  const tingKg = I => Object.entries(I.ting).reduce((s, [id, n]) => s + vektAv(id) * (n > 0 ? n : 0), 0);
  const våpenKg = I => I.våpen.reduce((s, v) => s + (Utstyr.VÅPEN[v.id] ? Utstyr.VÅPEN[v.id].vekt : 0), 0);
  // (et møbel du bærer – spill/mobler-visning.js – teller i vekta, men ikke i plassen)
  const møbelKg = () => (rot.MoblerSpill && MoblerSpill.kg ? MoblerSpill.kg() : 0);
  const bær = I => L.bæring({ våpenKg: våpenKg(I) + møbelKg(), tingKg: tingKg(I), rygg: S.rygg, ekstra: (rot.Utstyr && Utstyr.ekstraVekt) || 0 });
  function maks() { return R.bæreevne + ((rot.Utstyr && Utstyr.ekstraVekt) || 0); }
  function vekt(I) { return bær(I).vekt; }
  function plassTil(I, id) { const v = vektAv(id); if (!(v > 0)) return 0; const b = bær(I); return Math.max(0, Math.floor((b.plass - b.tingKg + 1e-9) / v)); }
  function våpenOk(I, V) { const b = bær(I); return b.vekt + V.vekt <= b.tak + 1e-9; }
  const bærer = () => { const I = sekk(); return I ? { t: I.ting, d: S.dato } : null; };
  const status = () => { const I = sekk(); return I ? bær(I) : null; };
  const lagreSekk = () => { if (rot.UtstyrSpill) { UtstyrSpill.lagre(); UtstyrSpill.vis(); } lagre(); };

  // ---------- beholderne ----------
  const minne = new Map();
  let helHus = null;
  // (runde 5) nær = en bolig nær leiren (aldri ransaket, noe nyttig i den første beholderen). Et bygg som er ransaket (S.ran), har mindre
  // i beholderne (de lagres da), og butikker og lagre fylles litt på igjen med tiden (S.fylt).
  const flyttetMøbel = nk => !!(rot.MoblerSpill && MoblerSpill.F && MoblerSpill.F()[nk]);
  const frøAv = nk => { let h = 7; for (let q = 0; q < nk.length; q++) h = (Math.imul(h, 31) + nk.charCodeAt(q)) | 0; return h; };
  function innholdAv(nk, kl, type, i, k, nær) {
    if (S.b[nk]) { påfyllHvis(nk, kl, type, i, k); return S.b[nk]; }
    if (!minne.has(nk)) { const B = L.innhold(kl, type, i, k, { nær: !!nær }), a = S.ran[i] || 0;
      if (a > 0 && !flyttetMøbel(nk)) { L.tøm(B, a, frøAv(nk)); S.b[nk] = B; if (R.påfyll.klasser[kl]) S.fylt[nk] = nå(); lagre(); return B; } minne.set(nk, B); }
    return minne.get(nk);
  }
  function påfyllHvis(nk, kl, type, i, k) { const P = R.påfyll; if (!P.klasser[kl] || flyttetMøbel(nk)) return; const f = S.fylt[nk], per = P.døgn * R.dag;
    if (f === undefined) { S.fylt[nk] = nå(); return; } const n = Math.floor((nå() - f) / per); if (n < 1) return;
    const D = L.BEHOLDERE[type]; if (!D) return; const ny = L.innhold(kl, type, i, (k | 0) + 1000 * (1 + Math.floor(nå() / per)));
    L.påfyll(S.b[nk], ny, Math.min(1, P.andel * n), D.kg, VEKT); S.fylt[nk] = nå(); if (S.ran[i]) S.ran[i] = Math.max(0, S.ran[i] - P.andel * n); lagre(); }
  // TØM (API til fiendens lag – pakka «krig» kan bruke det): et lag tømmer andelen av det som er igjen i bygget byggNr
  function tøm(byggNr, o = {}) { const andel = Math.max(0, Math.min(1, +o.andel || 0)); if (!andel) return 0; const før = S.ran[byggNr] || 0;
    S.ran[byggNr] = 1 - (1 - før) * (1 - andel); let n = 0;
    for (const nk of Object.keys(S.b)) if (nk.startsWith(byggNr + ':') && !flyttetMøbel(nk)) n += L.tøm(S.b[nk], andel, frøAv(nk) + Math.round(S.ran[byggNr] * 1000));
    for (const nk of [...minne.keys()]) if (nk.startsWith(byggNr + ':')) minne.delete(nk);
    lagre(); return n; }
  const ransaket = byggNr => (S.ran[byggNr] || 0) >= R.ran.tømt;
  // boliger nær leiren (P = omrisset i utsnittets meter; svaret huskes på omrisset)
  function nærLeir(P) { if (!P || P.leir) return false; if (P.nærLeir !== undefined) return P.nærLeir; const Q = r3(), O = rot.OppstartSpill && OppstartSpill.tilstand(); if (!Q || !Q.ut || !O || !O.leir) return false;
    let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x = x / P.length + Q.ut.cx; y = y / P.length + Q.ut.cy; return (P.nærLeir = Math.hypot(x - O.leir.x, y - O.leir.y) <= R.nærLeir); }
  // så lenge et kjøleskap har kulde (spillminutt): strømnettet i husene (spill/overlev.js), leirens egne bygg når de virker
  function strømTil(P) {
    if (P && P.leir) { const LS = rot.LeirSpill && LeirSpill.tilstand(), b = LS && LS.bygg.find(q => 9000000 + q.id === P.bygg.i); return b && rot.Leir && Leir.virker(b) && !b.av ? Infinity : -Infinity; }
    const O = rot.OverlevSpill, D = O && O.D && O.D(); if (!D || !D.strøm) return -Infinity;
    if (!D.strøm.nede) return Infinity; return S.strømAv !== null ? S.strømAv : Math.min(D.strøm.spill || 0, nå());
  }
  setInterval(() => { const O = rot.OverlevSpill, D = klar && O && O.D && O.D(); if (D && D.strøm && D.strøm.nede && S.strømAv === null) { S.strømAv = Math.min(D.strøm.spill || nå(), nå()); lagre(); } }, 3000);
  // beholderne i bygget du står i, med avstanden fra deg; nærmest først
  function beholdereHer() {
    const Q = r3(); if (!Q || !Q.fot || !rot.Interior3d) return { P: null, liste: [] };
    const x = Q.bane.x, y = Q.bane.y, P = Interior3d.inne(x, y); if (!P || !P.inne || !P.bygg) return { P, liste: [] };
    const kl = P.leir ? (L.LEIR[P.bygg.kl] ? P.bygg.kl : 'brakke') : P.bygg.kl, liste = [];
    // (runde 12) «Se i skapene» etter letingen: alle beholderne i bygget, ikke bare de innen rekkevidde (helHus = byggets nummer)
    const hel = helHus !== null && helHus === P.bygg.i;
    for (const b of L.beholdere(P.inne, P.bygg.i)) { const av = L.avstand(b.m, x, y); if (av > R.nær && !hel) continue; const nk = b.nk;
      liste.push({ nk, type: b.type, navn: b.navn, tittel: b.tittel, kg: b.kg, kald: !!b.kald, av, P, B: innholdAv(nk, P.leir ? 'brakke' : kl, b.type, P.bygg.i, b.k, nærLeir(P)), m: b.m }); }
    // (i hele huset: de med noe i først, så de tomme)
    if (hel) liste.sort((a, b) => (L.kg(a.B, VEKT) > 0 ? 0 : 1) - (L.kg(b.B, VEKT) > 0 ? 0 : 1) || a.av - b.av); else liste.sort((a, b) => a.av - b.av);
    // to like møbler får nummer i fanen («Reol 2»)
    const tel = {}; for (const c of liste) tel[c.tittel] = (tel[c.tittel] || 0) + 1; const nr = {}; for (const c of liste) if (tel[c.tittel] > 1) { nr[c.tittel] = (nr[c.tittel] || 0) + 1; c.fane = c.tittel + ' ' + nr[c.tittel]; } else c.fane = c.tittel;
    return { P, liste };
  }
  // GULVET: hauger i kartets meter (x, y). Den nærmeste innen R.gulvNær brukes, ellers en ny der du står (lagres først når noe legges der).
  function deg() { const Q = r3(); if (!Q || !Q.fot || !Q.ut) return null; return { x: Q.ut.cx + Q.bane.x, y: Q.ut.cy + Q.bane.y }; }
  function gulvHer(lag) {
    const p = deg(); if (!p) return null; let best = null, bd = R.gulvNær;
    for (const h of S.gulv) { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d <= bd) { bd = d; best = h; } }
    if (best) return best; const h = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, t: {}, d: {} }; if (lag) S.gulv.push(h); return h;
  }
  const gulvBeholder = () => { const h = gulvHer(false); return h ? { nk: 'gulv', type: 'gulv', navn: 'gulvet', tittel: 'Gulvet', fane: 'Gulvet', kg: Infinity, kald: false, B: h, haug: h } : null; };
  // et endret innhold lagres (en tom haug på gulvet tas bort)
  function endretInnhold(c) {
    if (!c) return;
    if (c.haug) { const tom = !Object.values(c.haug.t).some(n => n > 0); const i = S.gulv.indexOf(c.haug); if (tom && i >= 0) S.gulv.splice(i, 1); else if (!tom && i < 0) S.gulv.push(c.haug); if (S.gulv.length > 600) S.gulv.splice(0, S.gulv.length - 600); }
    else { delete S.b[c.nk]; S.b[c.nk] = c.B; minne.delete(c.nk); const k = Object.keys(S.b); if (k.length > R.lagres) for (const q of k.slice(0, k.length - R.lagres)) delete S.b[q]; }
    lagre();
  }
  const kaldAv = c => (c && c.kald ? strømTil(c.P) : undefined);
  const plassIgjen = c => (c.kg === Infinity ? undefined : Math.max(0, c.kg - L.kg(c.B, VEKT)));

  // ---------- å flytte ----------
  let melding = '', meldingTil = 0;
  const si = t => { melding = t; meldingTil = performance.now() + 4500; if (t) logg(t); };
  // fra beholderen c til deg (id = tingen, st = ferskheten, n = antall)
  function taFra(c, id, st, n) {
    const I = sekk(); if (!I || !c) return 0; const g = G[id], har = c.B.t[id] || 0; n = Math.min(n, har); if (!(n > 0)) return 0;
    // et våpen: i beltet når det er plass der, ellers i sekken
    const vid = våpenAv(id);
    if (vid && I.våpen.length < Utstyr.MAKS_VÅPEN) {
      const V = Utstyr.VÅPEN[vid]; if (!våpenOk(I, V)) { si('Du bærer for mye til å ta med ' + V.navn.toLowerCase() + '.'); return 0; }
      L.taUt(c.B, id, 1); I.våpen.push({ id: vid, mag: 0 }); endretInnhold(c); lagreSekk(); si(`${V.navn} i beltet (plass ${I.våpen.length}). Magasinet er tomt – lad med R.`); return 1; }
    // en sekk når du ikke har noen på ryggen: rett på ryggen
    if (g && g.sekk && !S.rygg) { L.taUt(c.B, id, 1); S.rygg = id; endretInnhold(c); lagreSekk(); si(`Du tar på deg ${g.navn.toLowerCase()}.`); return 1; }
    const plass = Math.max(0, bær(I).plass - bær(I).tingKg), fikk = L.flytt(c.B, bærer(), id, n, { nå: nå(), stadium: st || undefined, plass, vekter: VEKT, fraKald: kaldAv(c), erFraKald: !!c.kald });
    if (fikk) { endretInnhold(c); lagreSekk(); }
    if (fikk < n) si(fikk ? `Bare ${fikk} av ${n} fikk plass – sekken er full.` : `Ikke plass: ${navn(id).toLowerCase()} veier ${kg(vektAv(id))}, du har ${kg(plass)} ledig.`);
    return fikk;
  }
  // fra deg til beholderen c
  function leggI(c, id, st, n) {
    const I = sekk(); if (!I || !c) return 0; const fikk = L.flytt(bærer(), c.B, id, n, { nå: nå(), stadium: st || undefined, plass: plassIgjen(c), vekter: VEKT, tilKald: kaldAv(c), erTilKald: !!c.kald });
    if (fikk) { endretInnhold(c); lagreSekk(); }
    if (fikk < n) si(fikk ? `Bare ${fikk} av ${n} fikk plass i ${c.navn}.` : `${c.tittel} er full (${kg(c.kg)}).`);
    return fikk;
  }
  // et våpen fra beltet i beholderen: skuddene i magasinet blir med som ammunisjon
  function våpenTil(c, nr) {
    const I = sekk(); if (!I || !c || !I.våpen[nr]) return false; if (I.våpen.length <= 1) { si('Du må ha minst ett våpen i beltet.'); return false; }
    const v = I.våpen[nr], V = Utstyr.VÅPEN[v.id], id = 'v_' + v.id; if (!Utstyr.TING[id]) Utstyr.TING[id] = { navn: V.navn, enhet: 'stk.', vekt: V.vekt, pris: 0, pakke: 1, del: true, lut: true };
    VEKT[id] = Utstyr.TING[id].vekt; const plass = plassIgjen(c); if (plass !== undefined && plass < V.vekt + v.mag * vektAv(V.ammo)) { si(`${c.tittel} har ikke plass til ${V.navn.toLowerCase()}.`); return false; }
    I.våpen.splice(nr, 1); I.aktiv = Math.max(0, Math.min(I.aktiv > nr ? I.aktiv - 1 : I.aktiv, I.våpen.length - 1));
    c.B.t[id] = (c.B.t[id] || 0) + 1; if (v.mag > 0) c.B.t[V.ammo] = (c.B.t[V.ammo] || 0) + v.mag;
    endretInnhold(c); lagreSekk(); si(`${V.navn}${v.mag ? ` og ${v.mag} skudd` : ''} lagt i ${c.navn}.`); return true;
  }
  // et våpen fra beltet ned i sekken (som en ting)
  function våpenISekk(nr) {
    const I = sekk(); if (!I || !I.våpen[nr]) return false; if (I.våpen.length <= 1) { si('Du må ha minst ett våpen i beltet.'); return false; }
    const v = I.våpen[nr], V = Utstyr.VÅPEN[v.id], id = 'v_' + v.id; if (!Utstyr.TING[id]) Utstyr.TING[id] = { navn: V.navn, enhet: 'stk.', vekt: V.vekt, pris: 0, pakke: 1, del: true, lut: true };
    VEKT[id] = V.vekt; const b = bær(I); if (b.plass - b.tingKg < V.vekt + v.mag * vektAv(V.ammo) - 1e-9) { si('Ikke plass i sekken.'); return false; }
    I.våpen.splice(nr, 1); I.aktiv = Math.max(0, Math.min(I.aktiv > nr ? I.aktiv - 1 : I.aktiv, I.våpen.length - 1)); I.ting[id] = (I.ting[id] || 0) + 1; if (v.mag > 0) I.ting[V.ammo] = (I.ting[V.ammo] || 0) + v.mag;
    lagreSekk(); si(`${V.navn} lagt i sekken.`); return true;
  }
  // et våpen i sekken opp i beltet
  function tilBeltet(id) {
    const I = sekk(), vid = våpenAv(id); if (!I || !vid || !(I.ting[id] > 0)) return false; if (I.våpen.length >= Utstyr.MAKS_VÅPEN) { si(`Beltet er fullt (${Utstyr.MAKS_VÅPEN} våpen).`); return false; }
    const V = Utstyr.VÅPEN[vid]; I.ting[id]--; if (!I.ting[id]) delete I.ting[id]; I.våpen.push({ id: vid, mag: 0 }); lagreSekk(); si(`${V.navn} i beltet (plass ${I.våpen.length}).`); return true;
  }
  // sekken på ryggen: ta på (fra sekken eller en beholder) og ta av (til en beholder) – det du bærer, må få plass etterpå
  function taPå(id, c) {
    const I = sekk(), g = G[id]; if (!I || !g || !g.sekk) return false; const fra = c ? c.B : bærer(); if (!(fra.t[id] > 0)) return false;
    const gammel = S.rygg, nyPlass = R.lommer + g.sekk.plass, tKg = tingKg(I) - (c ? 0 : vektAv(id)) + (gammel && !c ? vektAv(gammel) : 0);
    if (tKg > nyPlass + 1e-9) { si(`Det du bærer, får ikke plass i ${g.navn.toLowerCase()}.`); return false; }
    if (gammel && c) { const p = plassIgjen(c); if (p !== undefined && p < vektAv(gammel) - vektAv(id) - 1e-9) { si(`${c.tittel} har ikke plass til den gamle sekken.`); return false; } }
    fra.t[id]--; if (!fra.t[id]) delete fra.t[id]; S.rygg = id;
    if (gammel) { const til = c ? c.B : bærer(); til.t[gammel] = (til.t[gammel] || 0) + 1; }
    if (c) endretInnhold(c); lagreSekk(); si(`Du har ${g.navn.toLowerCase()} på ryggen${gammel ? ` (${navn(gammel).toLowerCase()} ${c ? 'ligger i ' + c.navn : 'er i sekken'})` : ''}.`); return true;
  }
  function taAv(c) {
    const I = sekk(); if (!I || !S.rygg || !c) return false; if (tingKg(I) > R.lommer + 1e-9) { si(`Tøm sekken først: det du bærer (${kg(tingKg(I))}) får ikke plass i lommene (${kg(R.lommer)}).`); return false; }
    const p = plassIgjen(c); if (p !== undefined && p < vektAv(S.rygg) - 1e-9) { si(`${c.tittel} har ikke plass.`); return false; }
    const id = S.rygg; c.B.t[id] = (c.B.t[id] || 0) + 1; S.rygg = null; endretInnhold(c); lagreSekk(); si(`${navn(id)} lagt i ${c.navn}.`); return true;
  }

  // ---------- å spise, drikke og bruke ----------
  function spis(c, id, st) {
    const g = G[id], KS = rot.KarakterSpill, T = KS && KS.klar && KS.klar() && KS.T(); if (!g || !g.spis) return false; if (!T) { si('Du kan spise når du går selv.'); return false; }
    const B = c ? c.B : bærer(); if (!B || !(B.t[id] > 0)) return false;
    const f = L.måltid(id, st), b = T.behov; if ((f.sult <= 0 || b.sult > 96) && (f.tørst <= 0 || b.tørst > 96) && (f.søvn <= 0 || b.søvn > 96) && st !== 'råtten') { si(g.drikk ? 'Du er ikke tørst.' : 'Du er mett.'); return false; }
    const e = L.taUt(B, id, 1, { nå: nå(), stadium: st || undefined, kald: kaldAv(c), erKald: !!(c && c.kald) }); if (!e.length) return false;
    const K = rot.Karakter; for (const k of ['sult', 'tørst', 'søvn']) if (f[k]) K.fyll(b, k, f[k]);
    const H = rot.SpilletSpill && SpilletSpill.K && SpilletSpill.K(); if (f.helse && H) H.hp = Math.max(1, Math.min(100, H.hp + f.helse));
    if (c) endretInnhold(c); else lagreSekk(); if (KS.lagre) KS.lagre(); if (KS.vis) KS.vis(true);
    si(`${g.drikk ? 'Du drikker' : 'Du spiser'} ${g.navn.replace(/ \(.*\)$/, '').toLowerCase()}${st === 'råtten' ? ' – den var råtten, og du blir dårlig' : st === 'gammel' ? ' – den var ikke helt fersk' : ''}.`);
    return true;
  }
  function bruk(c, id) { const T = rot.Utstyr && Utstyr.TING[id]; if (!T || !T.helse) return false;
    if (!c) return rot.UtstyrSpill ? UtstyrSpill.helbred(id) : false;
    const H = rot.SpilletSpill && SpilletSpill.K && SpilletSpill.K(); if (!(c.B.t[id] > 0)) return false; L.taUt(c.B, id, 1); if (H) H.hp = Math.min(100, H.hp + T.helse); endretInnhold(c); si(`${T.navn} brukt${H ? `: helsa er ${Math.round(H.hp)} %` : ''}.`); return true; }
  // lad våpenet i beltet som bruker denne ammunisjonen (det i hånda først)
  function lad(id) { const I = sekk(); if (!I) return false; const rek = [I.aktiv, ...I.våpen.map((v, n) => n).filter(n => n !== I.aktiv)];
    for (const n of rek) { const v = I.våpen[n], V = v && Utstyr.VÅPEN[v.id]; if (V && V.ammo === id && v.mag < V.magasin) { const t = UtstyrSpill.lad(v); if (t) { if (rot.SpilletSpill && SpilletSpill.K) { const K = SpilletSpill.K(); if (K && n === I.aktiv) K.lader = performance.now() + V.lade * 1000; } si(`${V.navn} ladet (${v.mag} av ${V.magasin}).`); lagre(); return true; } } }
    si('Ingen våpen i beltet som trenger ' + navn(id).toLowerCase() + '.'); return false; }
  // mat til leirens matlager (når du er i leiren): blir rasjoner i FolkSpill
  const iLeiren = () => !!(rot.KarakterSpill && KarakterSpill.iLeiren && KarakterSpill.iLeiren());
  function tilLeiren(c, id, st) { const g = G[id], F = rot.FolkSpill && FolkSpill.tilstand(); if (!g || !g.rasjoner || !F || st === 'råtten') return false; if (!iLeiren()) { si('Du må være i leiren for å gi mat til folket.'); return false; }
    const B = c ? c.B : bærer(), e = L.taUt(B, id, Infinity, { nå: nå(), stadium: st || undefined, kald: kaldAv(c), erKald: !!(c && c.kald) }); if (!e.length) return false;
    const r = Math.round(e.length * g.rasjoner * 10) / 10; F.mat += r; if (rot.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (c) endretInnhold(c); else lagreSekk();
    si(`${e.length} × ${g.navn.toLowerCase()} gitt til leiren: ${L.tall(r)} rasjon${r === 1 ? '' : 'er'} i matlageret.`); return true; }

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#lutpanel{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 44px); z-index:12; display:none; width:min(900px,95vw); max-height:calc(100vh - var(--topp,58px) - 160px);
  flex-direction:column; padding:8px 10px 6px; background:#18140d; border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; box-sizing:border-box; user-select:none; -webkit-user-select:none; touch-action:manipulation; }
#lutpanel.på{ display:flex; } #lutpanel .topp{ display:flex; align-items:center; gap:8px; } #lutpanel .topp h2{ margin:0; font-size:18px; flex:1; }
#lutpanel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:32px; padding:2px 9px; font:inherit; font-size:13px; cursor:pointer; } #lutpanel button:disabled{ opacity:.45; }
#lutpanel .kol{ display:flex; gap:8px; min-height:0; flex:1; margin-top:6px; } #lutpanel .side{ flex:1; min-width:0; display:flex; flex-direction:column; border:1px solid #3a3224; background:rgba(0,0,0,.18); }
#lutpanel .side.mål{ outline:2px dashed #c9b26a; outline-offset:-3px; } #lutpanel .liste{ overflow:auto; flex:1; min-height:60px; padding:2px 6px 8px; -webkit-overflow-scrolling:touch; }
#lutpanel h3{ margin:4px 6px 2px; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); } #lutpanel h4{ margin:8px 0 2px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-dim,#a99); font-weight:600; }
#lutpanel .rad{ display:flex; align-items:center; gap:6px; padding:5px 6px; margin:1px 0; border:1px solid transparent; border-radius:3px; cursor:pointer; min-height:22px; }
#lutpanel .rad:hover{ background:rgba(201,178,106,.08); } #lutpanel .rad.valgt{ background:rgba(201,178,106,.22); border-color:#c9b26a; } #lutpanel .rad b{ flex:1; font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#lutpanel .rad small{ color:var(--ink-dim,#a99); white-space:nowrap; } #lutpanel .rad .st{ font-size:11px; padding:0 4px; border-radius:2px; } #lutpanel .rad .st.gammel{ background:#5a4a1c; color:#f0d79a; } #lutpanel .rad .st.råtten{ background:#5a2219; color:#f3b3a6; }
#lutpanel .rad .slag{ width:8px; height:8px; border-radius:50%; flex:none; } #lutpanel .utst b{ font-weight:400; } #lutpanel .utst i{ font-style:normal; color:var(--ink-dim,#a99); margin-right:4px; }
#lutpanel .maal{ margin:2px 6px; font-size:13px; } #lutpanel .maal .bar{ height:7px; background:#2e281e; margin:3px 0 1px; position:relative; } #lutpanel .maal .bar i{ position:absolute; left:0; top:0; bottom:0; background:#9fc46a; }
#lutpanel .maal .bar.tungt i{ background:#e0b24a; } #lutpanel .maal .bar.svært i{ background:#d0583f; } #lutpanel .maal .bar u{ position:absolute; top:-2px; bottom:-2px; width:2px; background:#e7dcc3; }
#lutpanel .maal small{ color:var(--ink-dim,#a99); display:block; } #lutpanel .maal .tung{ color:#e0b24a; } #lutpanel .maal .svært{ color:#f08a70; }
#lutpanel .faner{ display:flex; flex-wrap:wrap; gap:3px; padding:4px 4px 0; } #lutpanel .faner button{ min-height:28px; padding:1px 8px; font-size:12px; } #lutpanel .faner button.på{ background:#c9b26a; color:#1c170f; border-color:#c9b26a; }
@media (max-height:560px){ #lutpanel .faner{ flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden; flex:none; padding-bottom:3px; } #lutpanel .faner button{ flex:none; white-space:nowrap; } }
#lutpanel .info{ font-size:12px; color:var(--ink-dim,#a99); margin:3px 6px 0; } #lutpanel .tom{ color:var(--ink-dim,#a99); font-size:13px; padding:10px 6px; }
#lutpanel .bunn{ display:flex; gap:6px; padding:4px 6px 6px; } #lutpanel .bunn button{ flex:1; }
#lutpanel .detalj{ margin-top:6px; padding:6px 8px; border:1px solid #3a3224; background:rgba(0,0,0,.25); min-height:104px; max-height:34vh; overflow:auto; box-sizing:border-box; flex:none; } #lutpanel .detalj b{ font-size:15px; } #lutpanel .detalj p{ margin:2px 0 4px; font-size:13px; color:var(--ink-dim,#a99); }
#lutpanel .valg{ display:flex; flex-wrap:wrap; gap:4px; } #lutpanel .valg button.hoved{ border-color:#c9b26a; color:#f0e2b0; } #lutpanel .tips{ font-size:12px; color:var(--ink-dim,#a99); margin-top:4px; } #lutpanel .melding{ font-size:13px; color:#f0e2b0; margin-top:4px; }
#lutdra{ position:fixed; z-index:30; pointer-events:none; padding:4px 10px; background:rgba(28,23,15,.94); border:1px solid #c9b26a; color:#f0e2b0; font-size:14px; transform:translate(-50%,-130%); white-space:nowrap; }
#lutknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(200px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:200px; min-height:42px; padding:6px 18px; background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; }
#lutknapp.på{ display:block; } body.kort #lutknapp{ bottom:calc(330px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:170px; }
body.kort #lutpanel, body.smal #lutpanel{ left:4px; right:4px; transform:none; width:auto; top:calc(var(--topp,40px) + 4px); max-height:calc(100vh - var(--topp,40px) - 12px); padding:6px; font-size:13px; }
body.kort #lutpanel .rad, body.smal #lutpanel .rad{ padding:6px 4px; gap:4px; } body.kort #lutpanel .tips, body.smal #lutpanel .tips{ display:none; } body.kort #lutpanel h2, body.smal #lutpanel h2{ font-size:16px; }
body.kort #lutpanel .maal, body.smal #lutpanel .maal{ font-size:12px; margin:2px 4px; } body.kort #lutpanel .liste, body.smal #lutpanel .liste{ padding:2px 3px 6px; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'lutpanel', role: 'dialog', 'aria-label': 'Inventar og beholdere' }); document.body.appendChild(panel);
  const åpneKnapp = el('button', { id: 'lutknapp', type: 'button' }); document.body.appendChild(åpneKnapp);
  const FARGE = { våpen: '#c0c4c8', ammo: '#c9a24a', medisin: '#d0583f', mat: '#9fc46a', fersk: '#6fbf8a', drikke: '#6aa8d0', utstyr: '#a0907a', sekk: '#8c7ac0' };
  let åpen = false, fane = null, valgt = null, sistHtml = '', drar = null, sistListe = [];
  const nærmeste = () => { const h = beholdereHer(); return h.liste[0] || null; };
  function beholdereNå() { const h = beholdereHer(), g = gulvBeholder(); const liste = [...h.liste]; if (g) liste.push(g); sistListe = liste; return liste; }
  const aktiv = () => { const L2 = sistListe.length ? sistListe : beholdereNå(); return L2.find(c => c.nk === fane) || L2[0] || null; };

  // radene: [{ id, st, n, kg }] for en side
  const rader = (B, c) => L.stabler(B, nå(), kaldAv(c), { erKald: !!(c && c.kald), vekter: VEKT, navn, kat }).filter(r => r.id !== 'vann');
  const radEl = (side, r, c) => { const g = G[r.id], er = valgt && valgt.side === side && valgt.id === r.id && (valgt.st || null) === (r.st || null) && valgt.belte === undefined;
    return el('div', { klasse: 'rad' + (er ? ' valgt' : ''), 'data-side': side, 'data-id': r.id, 'data-st': r.st || '' }, el('span', { klasse: 'slag', style: `background:${FARGE[kat(r.id)] || '#888'}` }), el('b', {}, `${r.n} × ${navn(r.id)}`),
      r.st && r.st !== 'fersk' ? el('span', { klasse: 'st ' + r.st }, r.st) : '', el('small', {}, kg(r.kg))); };
  function venstre(I) {
    const b = bær(I), f = el('section', { klasse: 'side', 'data-side': 'deg' }), li = el('div', { klasse: 'liste' });
    const evne = b.evne, tung = b.tung, maksBar = Math.max(tung * 1.15, b.vekt), A = Utstyr.aktivt(I);
    f.append(el('h3', {}, 'Du bærer'), el('div', { klasse: 'maal' }, el('div', {}, `Vekt ${L.tall(Math.round(b.vekt * 10) / 10)} av ${L.tall(evne)} kg`, ' ', el('span', { klasse: b.status === 'lett' ? '' : b.status === 'tungt' ? 'tung' : 'svært' }, b.status === 'lett' ? '· lett' : b.status === 'tungt' ? '· tungt' : '· svært tungt')),
      el('div', { klasse: 'bar ' + b.status }, el('i', { style: `width:${Math.min(100, b.vekt / maksBar * 100)}%` }), el('u', { style: `left:${evne / maksBar * 100}%` }), el('u', { style: `left:${tung / maksBar * 100}%` })),
      el('small', {}, `Plass i lommer og sekk: ${L.tall(Math.round(b.tingKg * 10) / 10)} av ${L.tall(b.plass)} kg brukt (lommer ${L.tall(R.lommer)}${S.rygg ? ' + ' + navn(S.rygg).toLowerCase() + ' ' + L.tall(G[S.rygg].sekk.plass) : ''})${b.status !== 'lett' ? ' · ' + L.STATUS[b.status].replace(/^[^–]*– /, '') : ''}`)));
    li.append(el('h4', {}, 'Utstyrt'));
    li.append(el('div', { klasse: 'rad utst' + (valgt && valgt.utst === 'hånd' ? ' valgt' : ''), 'data-side': 'deg', 'data-utst': 'hånd', 'data-belte': String(I.aktiv) }, el('b', {}, el('i', {}, 'Hånd'), A.def.navn), el('small', {}, `${A.v.mag}/${A.def.magasin}`)));
    li.append(el('div', { klasse: 'rad utst' + (valgt && valgt.utst === 'rygg' ? ' valgt' : ''), 'data-side': 'deg', 'data-utst': 'rygg' }, el('b', {}, el('i', {}, 'Rygg'), S.rygg ? navn(S.rygg) : 'ingen sekk'), el('small', {}, S.rygg ? `+${L.tall(G[S.rygg].sekk.plass)} kg, −${Math.round(G[S.rygg].sekk.lettere * 100)} %` : 'bare lommene')));
    li.append(el('h4', {}, `Beltet (1–${Utstyr.MAKS_VÅPEN})`));
    I.våpen.forEach((v, n) => { const V = Utstyr.VÅPEN[v.id], er = valgt && valgt.side === 'deg' && valgt.belte === n && !valgt.utst;
      li.append(el('div', { klasse: 'rad' + (er ? ' valgt' : ''), 'data-side': 'deg', 'data-belte': String(n) }, el('span', { klasse: 'slag', style: `background:${FARGE.våpen}` }), el('b', {}, `${n + 1}. ${V.navn}${n === I.aktiv ? ' (i hånda)' : ''}`), el('small', {}, `${v.mag}/${V.magasin} · ${kg(V.vekt)}`))); });
    li.append(el('h4', {}, 'Lommer og sekk')); const rr = rader(bærer(), null); if (!rr.length) li.append(el('div', { klasse: 'tom' }, 'Tomt.')); for (const r of rr) li.append(radEl('deg', r, null));
    f.append(li); return f;
  }
  function høyre(liste, c) {
    const f = el('section', { klasse: 'side', 'data-side': 'der' }), fan = el('div', { klasse: 'faner' });
    for (const q of liste) { const b = el('button', { type: 'button', 'data-fane': q.nk, klasse: q === c ? 'på' : '' }, q.fane); fan.append(b); }
    f.append(el('h3', {}, 'Beholdere'), fan); const li = el('div', { klasse: 'liste' });
    if (c) { const k = L.kg(c.B, VEKT); f.append(el('div', { klasse: 'info' }, c.haug ? `Det som ligger på ${Interior3dInne() ? 'gulvet' : 'bakken'} der du står${k ? ' · ' + kg(k) : ''}` : `${c.tittel} · ${kg(k)} av ${kg(c.kg)}${c.kald ? (strømTil(c.P) > nå() ? ' · kaldt (strøm)' : ' · uten strøm') : ''}${c.P && c.P.bygg && ransaket(c.P.bygg.i) ? ' · huset er ransaket' : ''}`));
      const rr = rader(c.B, c); if (!rr.length) li.append(el('div', { klasse: 'tom' }, c.haug ? 'Ingenting her. Legg noe fra deg, så blir det liggende.' : 'Tomt.')); for (const r of rr) li.append(radEl('der', r, c)); }
    f.append(li); return f;
  }
  const Interior3dInne = () => { const Q = r3(); return !!(Q && Q.fot && rot.Interior3d && Interior3d.inne(Q.bane.x, Q.bane.y)); };
  // feltet med detaljer og valg for det som er valgt
  function detalj(I, c, liste) {
    const f = el('div', { klasse: 'detalj' }), v = valgt; if (!v) { f.append(el('div', { klasse: 'tips' }, 'Trykk en ting for å velge den, og trykk så på den andre siden for å flytte den. Med mus kan du dra og slippe, dobbeltklikke for å flytte og høyreklikke for valg. Tab lukker.')); return f; }
    const valg = el('div', { klasse: 'valg' }), andre = liste.filter(q => q !== c);
    if (v.utst === 'rygg') { f.append(el('b', {}, S.rygg ? navn(S.rygg) : 'Ingen sekk på ryggen'), el('p', {}, S.rygg ? `${G[S.rygg].tekst} Gir ${L.tall(G[S.rygg].sekk.plass)} kg plass, og vekten i den føles ${Math.round(G[S.rygg].sekk.lettere * 100)} % lettere.` : `Uten sekk har du bare lommene (${L.tall(R.lommer)} kg). Sekker finner du i hus.`));
      if (S.rygg && c) valg.append(knapp(c.haug ? 'Ta av (legg fra deg)' : `Ta av (i ${c.tittel.toLowerCase()})`, () => { taAv(c); vis(true); }, { 'data-valg': 'taav', klasse: 'hoved' })); f.append(valg); return f; }
    if (v.belte !== undefined) { const w = I.våpen[v.belte]; if (!w) { valgt = null; return detalj(I, c, liste); } const V = Utstyr.VÅPEN[w.id];
      f.append(el('b', {}, `${V.navn}${v.belte === I.aktiv ? ' (i hånda)' : ''}`), el('p', {}, `${V.tekst}. ${w.mag} av ${V.magasin} i magasinet, ${I.ting[V.ammo] || 0} ${navn(V.ammo)} i sekken. ${kg(V.vekt)}.`));
      if (v.belte !== I.aktiv) valg.append(knapp('Ta i hånda', () => { UtstyrSpill.velg(v.belte); valgt = { side: 'deg', belte: UtstyrSpill.tilstand().aktiv }; vis(true); }, { 'data-valg': 'hånd', klasse: 'hoved' }));
      if (w.mag < V.magasin && (I.ting[V.ammo] || 0) > 0) valg.append(knapp('Lad', () => { lad(V.ammo); vis(true); }, { 'data-valg': 'lad' }));
      valg.append(knapp('Legg i sekken', () => { if (våpenISekk(v.belte)) valgt = null; vis(true); }, { 'data-valg': 'isekk' }));
      if (c) valg.append(knapp(c.haug ? 'Legg fra deg' : `Legg i ${c.tittel.toLowerCase()}`, () => { if (våpenTil(c, v.belte)) valgt = null; vis(true); }, { 'data-valg': 'legg' }));
      for (const q of andre) valg.append(knapp(`Flytt til ${q.fane.toLowerCase()}`, () => { if (våpenTil(q, v.belte)) valgt = null; vis(true); }));
      f.append(valg); return f; }
    const id = v.id, g = G[id], T = Utstyr.TING[id] || g || {}, B = v.side === 'deg' ? bærer() : c && c.B; if (!B || !(B.t[id] > 0)) { valgt = null; return detalj(I, c, liste); }
    const n = L.stabler(B, nå(), v.side === 'der' ? kaldAv(c) : undefined, { erKald: v.side === 'der' && !!(c && c.kald), vekter: VEKT }).filter(r => r.id === id && (r.st || null) === (v.st || null)).reduce((s, r) => s + r.n, 0); if (!n) { valgt = null; return detalj(I, c, liste); }
    const fra = v.side === 'der' ? c : null, mf = g && g.spis ? L.måltid(id, v.st) : null;
    const virk = mf ? ['sult', 'tørst', 'søvn'].filter(k => mf[k]).map(k => `${{ sult: 'Mett', tørst: 'Tørst', søvn: 'Våken' }[k]} ${mf[k] > 0 ? '+' : ''}${mf[k]}`).concat(mf.helse ? [`Helse ${mf.helse}`] : []).join(' · ') + '.' : '';
    const ferskTekst = g && g.fersk ? (v.st === 'råtten' ? 'Råtten – gjør deg dårlig.' : v.st === 'gammel' ? `Gammel – metter mindre, råtten etter ca. ${g.fersk[1]} døgn.` : `Fersk – holder ca. ${g.fersk[0]} døgn${fra && fra.kald ? ' (lenger i kjøleskap med strøm)' : ''}.`) : g && (g.kat === 'mat' || g.kat === 'drikke') ? 'Holder lenge.' : '';
    f.append(el('b', {}, `${n} × ${T.navn || id}`), el('p', {}, [g && g.tekst, ferskTekst, virk, våpenAv(id) ? `Våpen: ${Utstyr.VÅPEN[våpenAv(id)].navn.toLowerCase()}, ${navn(Utstyr.VÅPEN[våpenAv(id)].ammo)}.` : '', g && g.sekk ? `Sekk: ${L.tall(g.sekk.plass)} kg plass, vekten føles ${Math.round(g.sekk.lettere * 100)} % lettere.` : '', `${kg(vektAv(id))} per ${T.enhet === 'skudd' ? 'skudd' : 'stk.'} · ${kg(vektAv(id) * n)} i alt.`].filter(Boolean).join(' ')));
    if (g && g.spis) valg.append(knapp(g.drikk ? 'Drikk' : 'Spis', () => { spis(fra, id, v.st); vis(true); }, { 'data-valg': 'spis', klasse: 'hoved' }));
    if (T.helse && !(g && g.spis)) valg.append(knapp('Bruk', () => { bruk(fra, id); vis(true); }, { 'data-valg': 'bruk', klasse: 'hoved' }));
    if (våpenAv(id)) valg.append(knapp('Utstyr (i beltet)', () => { if (fra) taFra(fra, id, null, 1); else tilBeltet(id); valgt = null; vis(true); }, { 'data-valg': 'utstyr', klasse: 'hoved' }));
    if (g && g.sekk) valg.append(knapp('Ta på', () => { if (taPå(id, fra)) valgt = null; vis(true); }, { 'data-valg': 'tapå', klasse: 'hoved' }));
    if (kat(id) === 'ammo' && v.side === 'deg') valg.append(knapp('Lad', () => { lad(id); vis(true); }, { 'data-valg': 'lad' }));
    // (runde 5) lommelykta og batteriene (spill/lykt.js)
    if (rot.LyktSpill && v.side === 'deg' && id === 'lommelykt') { valg.append(knapp(LyktSpill.på() ? 'Slå av' : 'Slå på', () => { LyktSpill.slå(); vis(true); }, { 'data-valg': 'lykt', klasse: 'hoved' }));
      if ((I.ting.batterier || 0) > 0 && LyktSpill.S().batteri < .999) valg.append(knapp('Bytt batterier', () => { LyktSpill.bytt(); vis(true); }, { 'data-valg': 'batteri' })); }
    if (rot.LyktSpill && v.side === 'deg' && id === 'batterier' && (I.ting.lommelykt || 0) > 0 && LyktSpill.S().batteri < .999) valg.append(knapp('Lad (i lykta)', () => { LyktSpill.bytt(); vis(true); }, { 'data-valg': 'batteri', klasse: 'hoved' }));
    if (g && g.rasjoner && v.st !== 'råtten' && iLeiren()) valg.append(knapp('Gi til leiren', () => { tilLeiren(fra, id, v.st); vis(true); }, { 'data-valg': 'leiren' }));
    if (v.side === 'deg') { if (c) { valg.append(knapp(c.haug ? 'Legg fra deg' : `Legg i ${c.tittel.toLowerCase()}`, () => { leggI(c, id, v.st, n); vis(true); }, { 'data-valg': 'legg' })); if (n > 1) valg.append(knapp('Én', () => { leggI(c, id, v.st, 1); vis(true); }, { 'data-valg': 'leggen' })); }
      for (const q of andre) valg.append(knapp(`Flytt til ${q.fane.toLowerCase()}`, () => { leggI(q, id, v.st, n); vis(true); })); }
    else { valg.append(knapp('Ta med', () => { taFra(c, id, v.st, n); vis(true); }, { 'data-valg': 'ta', klasse: (g && (g.spis || g.sekk)) || våpenAv(id) ? '' : 'hoved' })); if (n > 1) valg.append(knapp('Én', () => { taFra(c, id, v.st, 1); vis(true); }, { 'data-valg': 'taen' }));
      for (const q of andre) valg.append(knapp(`Flytt til ${q.fane.toLowerCase()}`, () => { const fikk = L.flytt(c.B, q.B, id, n, { nå: nå(), stadium: v.st || undefined, plass: plassIgjen(q), vekter: VEKT, fraKald: kaldAv(c), erFraKald: !!c.kald, tilKald: kaldAv(q), erTilKald: !!q.kald }); if (fikk) { endretInnhold(c); endretInnhold(q); } else si(`${q.tittel} er full.`); vis(true); })); }
    f.append(valg); return f;
  }
  function bygg() {
    const I = sekk(), f = el('div'); if (!I) return f; const liste = beholdereNå(), c = aktiv(); if (c) fane = c.nk;
    f.append(el('div', { klasse: 'topp' }, el('h2', {}, c && !c.haug ? `${c.tittel} og sekken` : 'Inventar'), knapp('×', () => åpne(false), { 'aria-label': 'Lukk', klasse: 'lukk' })));
    const kol = el('div', { klasse: 'kol' }), V = venstre(I), H = høyre(liste, c);
    V.append(el('div', { klasse: 'bunn' }, knapp('Legg alt ▸', () => leggAlt(), { 'data-alt': 'legg', disabled: !c || !Object.keys(I.ting).some(id => id !== 'vann' && I.ting[id] > 0) ? '' : null })));
    H.append(el('div', { klasse: 'bunn' }, knapp('◂ Ta alt', () => taAlt(), { 'data-alt': 'ta', disabled: !c || !Object.values(c.B.t).some(n => n > 0) ? '' : null })));
    kol.append(V, H); f.append(kol, detalj(I, c, liste)); if (melding && performance.now() < meldingTil) f.append(el('div', { klasse: 'melding' }, melding));
    return f;
  }
  function leggAlt() { const c = aktiv(), I = sekk(); if (!c || !I) return; let n = 0; for (const r of rader(bærer(), null)) n += leggI(c, r.id, r.st, r.n); if (n) si(`${n} ting lagt i ${c.navn}.`); valgt = null; vis(true); }
  function taAlt() { const c = aktiv(); if (!c) return; let n = 0, igjen = 0; for (const r of rader(c.B, c)) { const f = taFra(c, r.id, r.st, r.n); n += f; igjen += r.n - f; } melding = ''; si(igjen ? `Du tok med ${n} ting. ${igjen} fikk ikke plass.` : n ? `Du tok med alt (${n} ting).` : ''); valgt = null; vis(true); }
  function vis(tving) {
    if (!åpen) return; if (!tving && (drar || (rot.pekerNede && pekerNede(panel)))) return;
    const ny = bygg(), html = ny.innerHTML; if (!tving && html === sistHtml) return; sistHtml = html;
    const rulle = [...panel.querySelectorAll('.liste')].map(e => e.scrollTop); panel.replaceChildren(...ny.childNodes); panel.querySelectorAll('.liste').forEach((e, i) => { e.scrollTop = rulle[i] || 0; });
  }
  function åpne(v, nk) {
    const kan = !!v && klar && !!sekk(); if (!kan) helHus = null; åpen = kan; panel.classList.toggle('på', åpen); valgt = null; melding = '';
    if (åpen) { if (nk) fane = nk; if (document.pointerLockElement) document.exitPointerLock(); if (rot.UtstyrSpill && UtstyrSpill.erÅpen && UtstyrSpill.erÅpen()) UtstyrSpill.åpne(false); sistListe = []; sistHtml = ''; vis(true); }
    oppdaterKnapp(); return åpen;
  }

  // flytt det valgte til den andre siden
  function flyttValgt(til) {
    const v = valgt; if (!v || v.side === til) return; const I = sekk(), c = aktiv(); if (!I || !c) return;
    if (v.side === 'deg') { if (v.utst === 'rygg') taAv(c); else if (v.belte !== undefined) våpenTil(c, v.belte); else { const B = bærer(), n = L.stabler(B, nå()).filter(r => r.id === v.id && (r.st || null) === (v.st || null)).reduce((s, r) => s + r.n, 0); leggI(c, v.id, v.st, n); } }
    else { const n = rader(c.B, c).filter(r => r.id === v.id && (r.st || null) === (v.st || null)).reduce((s, r) => s + r.n, 0); taFra(c, v.id, v.st, n); }
    valgt = null; vis(true);
  }
  const radInfo = r => (r ? { side: r.getAttribute('data-side'), id: r.getAttribute('data-id') || undefined, st: r.getAttribute('data-st') || null, belte: r.hasAttribute('data-belte') && !r.hasAttribute('data-utst') ? +r.getAttribute('data-belte') : r.getAttribute('data-utst') === 'hånd' ? +r.getAttribute('data-belte') : undefined, utst: r.getAttribute('data-utst') || undefined } : null);
  const sammeValg = (a, b) => !!a && !!b && a.side === b.side && a.id === b.id && (a.st || null) === (b.st || null) && a.belte === b.belte && a.utst === b.utst;
  // (dobbelttrykk telles her: panelet tegnes på nytt etter første trykk, så nettleserens dblclick kommer ikke)
  let sistTrykk = null;
  function trykk(r, side) {
    if (valgt && side && valgt.side !== side) { sistTrykk = null; flyttValgt(side); return; }
    if (!r) { if (valgt) { valgt = null; vis(true); } return; }
    const q = radInfo(r); if (q.utst === 'hånd') q.utst = undefined; const t = performance.now();
    if (sistTrykk && sammeValg(sistTrykk.q, q) && t - sistTrykk.t < 420 && q.utst !== 'rygg') { sistTrykk = null; valgt = q; flyttValgt(q.side === 'deg' ? 'der' : 'deg'); return; }
    sistTrykk = { q, t }; valgt = sammeValg(valgt, q) ? null : q; vis(true);
  }
  // pekeren: trykk velger/flytter, dra og slipp flytter, hold inne (0,5 s) eller høyreklikk = velg og vis valgene
  let ned = null, holdT = 0;
  panel.addEventListener('pointerdown', e => { if (e.button > 0 || e.target.closest('button')) return; const r = e.target.closest('.rad'), s = e.target.closest('.side'); ned = { x: e.clientX, y: e.clientY, r, side: s && s.getAttribute('data-side'), id: e.pointerId, holdt: false };
    clearTimeout(holdT); if (r) holdT = setTimeout(() => { if (ned && !drar) { ned.holdt = true; const q = radInfo(r); if (q.utst === 'hånd') q.utst = undefined; valgt = q; vis(true); const d = panel.querySelector('.detalj'); if (d && d.scrollIntoView) d.scrollIntoView({ block: 'nearest' }); } }, 520); });
  rot.addEventListener('pointermove', e => { if (!ned || e.pointerId !== ned.id) return; if (!drar && ned.r && Math.hypot(e.clientX - ned.x, e.clientY - ned.y) > 9) { clearTimeout(holdT);
      const q = radInfo(ned.r); if (q.utst === 'hånd') q.utst = undefined; valgt = q; drar = el('div', { id: 'lutdra' }, ned.r.querySelector('b') ? ned.r.querySelector('b').textContent : ''); document.body.appendChild(drar); }
    if (drar) { drar.style.left = e.clientX + 'px'; drar.style.top = e.clientY + 'px'; const s = document.elementFromPoint(e.clientX, e.clientY), sd = s && s.closest && s.closest('#lutpanel .side'); panel.querySelectorAll('.side').forEach(q => q.classList.toggle('mål', q === sd && q.getAttribute('data-side') !== valgt.side)); } });
  rot.addEventListener('pointerup', e => { if (!ned || e.pointerId !== ned.id) return; clearTimeout(holdT); const n = ned; ned = null;
    if (drar) { drar.remove(); drar = null; const s = document.elementFromPoint(e.clientX, e.clientY), sd = s && s.closest && s.closest('#lutpanel .side'); panel.querySelectorAll('.side.mål').forEach(q => q.classList.remove('mål')); if (sd && sd.getAttribute('data-side') !== valgt.side) flyttValgt(sd.getAttribute('data-side')); else vis(true); return; }
    if (n.holdt || !(e.target instanceof Node) || !panel.contains(e.target) || (e.target.closest && e.target.closest('button'))) return; trykk(n.r, n.side); });
  rot.addEventListener('pointercancel', () => { clearTimeout(holdT); ned = null; if (drar) { drar.remove(); drar = null; vis(true); } });
  panel.addEventListener('contextmenu', e => { const r = e.target.closest('.rad'); if (!r) return; e.preventDefault(); const q = radInfo(r); if (q.utst === 'hånd') q.utst = undefined; valgt = q; vis(true); });
  panel.addEventListener('click', e => { const b = e.target.closest('[data-fane]'); if (b) { fane = b.getAttribute('data-fane'); valgt = valgt && valgt.side === 'der' ? null : valgt; vis(true); } });

  // ---------- knappen «Åpne kjøleskapet (E)», tastene og takten ----------
  const går = () => { const Q = r3(); return !!(Q && Q.fot && typeof på3d !== 'undefined' && på3d && !(rot.KjorSpill && KjorSpill.fører && KjorSpill.fører())); };
  let knappFor = null;
  function oppdaterKnapp() {
    const c = klar && går() && !åpen && !(rot.MoblerSpill && MoblerSpill.bærer && MoblerSpill.bærer()) ? nærmeste() : null; knappFor = c;
    if (!c) { åpneKnapp.classList.remove('på'); return; }
    const t = `Åpne ${c.navn}${grovPek() ? '' : ' (E)'}`; if (åpneKnapp.textContent !== t) åpneKnapp.textContent = t; åpneKnapp.classList.add('på');
  }
  åpneKnapp.addEventListener('click', e => { e.preventDefault(); const c = knappFor || nærmeste(); if (c) åpne(true, c.nk); });
  // E: åpne beholderen du står ved (eller lukk panelet); Tab: panelet med det som er her; Esc lukker
  rot.addEventListener('keydown', e => { if (!klar || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.ctrlKey || e.metaKey || e.altKey) return; const k = e.key;
    if (rot.MoblerSpill && MoblerSpill.bærer && MoblerSpill.bærer()) return;
    if ((k === 'e' || k === 'E') && (åpen || (går() && nærmeste()))) { e.preventDefault(); e.stopImmediatePropagation(); if (åpen) åpne(false); else { const c = nærmeste(); åpne(true, c && c.nk); } }
    else if (k === 'Tab' && (åpen || går())) { e.preventDefault(); åpne(!åpen); }
    else if (k === 'Escape' && åpen) { e.preventDefault(); e.stopImmediatePropagation(); åpne(false); } }, true);
  // (runde 12) går du ut av bygget, gjelder «hele huset» ikke lenger
  const iHelHus = () => { const Q = r3(), P = Q && Q.fot && rot.Interior3d ? Interior3d.inne(Q.bane.x, Q.bane.y) : null; return !!(P && P.bygg && P.bygg.i === helHus); };
  setInterval(() => { if (helHus !== null && !iHelHus()) helHus = null; oppdaterKnapp(); if (åpen) { if (!går() && !(typeof på3d !== 'undefined' && !på3d)) åpne(false); else { sistListe = []; vis(false); } } }, 400);

  // ---------- inn i sekken (#sekk, spill/utstyr.js) ----------
  // knapper på tingene i sekken: Spis/Drikk, Til beltet, Ta på (feltrasjonen og vannet har sine fra spill/eventyr-visning.js)
  function sekkKnapp(id) { if (klar && våpenAv(id)) return ['Til beltet', () => tilBeltet(id)]; const g = G[id]; if (!klar || !g || g.finnes) return null;
    if (g.spis) return [g.drikk ? 'Drikk' : 'Spis', () => { const B = bærer(), s = B && L.stabler(B, nå()).filter(r => r.id === id).sort((a, b) => ['fersk', 'gammel', 'råtten'].indexOf(a.st) - ['fersk', 'gammel', 'råtten'].indexOf(b.st))[0]; spis(null, id, s ? s.st : null); }];
    if (g.sekk) return ['Ta på', () => taPå(id, null)];
    if (id === 'lommelykt' && rot.LyktSpill) return [LyktSpill.på() ? 'Slå av' : 'Slå på', () => LyktSpill.slå()];
    if (id === 'batterier' && rot.LyktSpill && LyktSpill.har()) return ['Lad lykta', () => LyktSpill.bytt()];
    return null; }
  (rot.SEKK_TILLEGG = rot.SEKK_TILLEGG || []).push((p, e, kn) => { const I = sekk(); if (!klar || !I) return; const b = bær(I);
    p.append(e('h3', {}, 'Ryggen og plassen'), e('div', { klasse: 'rad' }, e('div', {}, e('b', {}, S.rygg ? navn(S.rygg) : 'Ingen sekk på ryggen'), e('small', {}, `Plass i lommer og sekk: ${L.tall(Math.round(b.tingKg * 10) / 10)} av ${L.tall(b.plass)} kg brukt · ${L.STATUS[b.status]}`), e('small', { style: 'display:block;opacity:.8;margin-top:2px' }, 'Vekt (øverst) er alt du bærer, også våpnene – plass er hvor mye lommene og sekken rommer.'))),
      kn('Inventar og beholdere' + (grovPek() ? '' : ' (Tab)'), () => åpne(true), { id: 'lutfrasekk' })); });

  // ---------- vekta virker på gangen (gange.js og karakter.js spør her) ----------
  // (bærer du et stort møbel i armene, går du tregere og kan ikke løpe – spill/mobler-visning.js)
  const M = () => (rot.MoblerSpill && MoblerSpill.bærer && MoblerSpill.bærer() ? MoblerSpill : null);
  const fart = () => { const b = klar && status(); return (b ? b.fart : 1) * (M() ? M().fart() : 1); };
  const kanLøpe = () => { const b = klar && status(); return (b ? b.kanLøpe : true) && !(M() && M().stor()); };
  const løp = () => { const b = klar && status(); return b ? b.løp : 1; };

  // ---------- 3D: tingene du ser i husene, og haugene på gulvet ----------
  // Det som ligger i benker, bord, hyller og garderober, står oppå møbelet (eller lener mot veggen ved garderoben, som våpen) – og
  // forsvinner når du tar det. Ett lite nett per bygg med hjørnefarger, lagt i interiørets egen liste (o.nett i spill/interior3d.js),
  // så det tas bort og frigjøres sammen med interiøret. Haugene på gulvet og bakken: ett nett for dem innen 120 m. Ingen lys.
  // møbler det står ting OPPÅ (andelen av møbelets høyde: hyllene har tingene på en hylle i midten)
  const OPPÅ = { kjøkkenbenk: 1, nattbord: 1, pult: 1, kateter: 1, tvbenk: 1, skranke: 1, kasse: 1, arbeidsbenk: 1, verktøyvogn: 1, arkivskap: 1, hylle: .5, bokhylle: .5, tønne: 1 };
  let mat3 = null, gulvMesh = null, gulvSig = '', sist3 = 0, forU3 = null; const sig3 = new Map();
  const farg3 = (g, c) => { const n = g.attributes.position.count, f = new Float32Array(n * 3); for (let q = 0; q < n; q++) f.set(c, q * 3); g.setAttribute('color', new THREE.BufferAttribute(f, 3)); return g; };
  const kloss = (d, x, y, z, sx, sy, sz, c) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(x, y, z + sz / 2); d.push(farg3(g, c)); };
  const rull = (d, x, y, z, r, h, c, seg = 8, ligg) => { const g = new THREE.CylinderGeometry(r, r, h, seg).toNonIndexed(); if (ligg) { g.rotateZ(Math.PI / 2); g.translate(x, y, z + r); } else { g.rotateX(Math.PI / 2); g.translate(x, y, z + h / 2); } d.push(farg3(g, c)); };
  const flaske = (d, r, h, c, kork) => { rull(d, 0, 0, 0, r, h * .72, c, 10); rull(d, 0, 0, h * .72, r * .45, h * .2, c, 8); rull(d, 0, 0, h * .92, r * .5, h * .08, kork, 8); };
  const boks = (d, c) => { rull(d, 0, 0, 0, .04, .1, c, 10); rull(d, 0, 0, .1, .041, .006, [.75, .76, .78], 10); };
  const eske = (d, sx, sy, sz, c, lapp) => { kloss(d, 0, 0, 0, sx, sy, sz, c); if (lapp) kloss(d, 0, sy / 2 + .001, sz * .3, sx * .7, .003, sz * .4, lapp); };
  // en sekk: hovedrom, lokk, lomme foran og to remmer bak
  const sekk3 = (d, b, t, h, c) => { const m = c.map(v => v * .75); kloss(d, 0, 0, 0, b, t, h, c); kloss(d, 0, 0, h, b * 1.04, t * 1.08, .06, m); kloss(d, 0, t / 2 + .03, h * .12, b * .7, .06, h * .35, m); for (const x of [-b * .28, b * .28]) kloss(d, x, -t / 2 - .01, h * .15, .05, .02, h * .75, [.1, .1, .1]); };
  // utseendet per ting (punkt i møbelets ramme: x langs bredden, y inn i rommet, z opp fra overflaten)
  const FORM = {
    brunost: d => { kloss(d, 0, 0, 0, .13, .09, .08, [.52, .28, .1]); kloss(d, 0, 0, .03, .135, .095, .025, [.75, .12, .1]); },
    gulost: d => kloss(d, 0, 0, 0, .14, .09, .07, [.95, .8, .32]), knekkebrød: d => eske(d, .25, .1, .06, [.82, .66, .4], [.85, .2, .15]),
    fiskeboller: d => boks(d, [.2, .35, .65]), lapskaus: d => boks(d, [.55, .3, .15]), pølseboks: d => boks(d, [.75, .2, .15]), makrell: d => kloss(d, 0, 0, 0, .1, .07, .025, [.85, .15, .12]),
    havregryn: d => eske(d, .14, .07, .2, [.85, .75, .5], [.3, .5, .2]), tørrfisk: d => kloss(d, 0, 0, 0, .35, .1, .03, [.8, .72, .55]), sjokolade: d => kloss(d, 0, 0, 0, .16, .08, .015, [.15, .2, .55]),
    kaffe: d => eske(d, .09, .07, .16, [.75, .15, .1], [.95, .9, .7]), rasjon: d => kloss(d, 0, 0, 0, .2, .12, .06, [.35, .38, .25]),
    melk: d => { kloss(d, 0, 0, 0, .07, .07, .19, [.95, .95, .95]); kloss(d, 0, 0, .19, .07, .02, .03, [.2, .4, .75]); }, grovbrød: d => kloss(d, 0, 0, 0, .22, .11, .1, [.45, .3, .15]),
    egg: d => kloss(d, 0, 0, 0, .15, .1, .06, [.7, .65, .55]), epler: d => rull(d, 0, 0, 0, .04, .07, [.7, .12, .1], 8), wienerpølser: d => kloss(d, 0, 0, 0, .18, .08, .03, [.85, .45, .35]),
    leverpostei: d => rull(d, 0, 0, 0, .045, .05, [.25, .45, .25], 10),
    saft: d => flaske(d, .045, .3, [.42, .05, .2], [.9, .9, .9]), saftbr: d => flaske(d, .045, .3, [.78, .12, .22], [.9, .9, .9]), flaskevann: d => flaske(d, .045, .33, [.72, .86, .95], [.2, .4, .8]),
    brus: d => flaske(d, .035, .23, [.15, .3, .15], [.85, .15, .1]),
    a762: d => eske(d, .11, .06, .05, [.28, .36, .22], [.9, .8, .3]), ahagl: d => eske(d, .12, .07, .06, [.65, .14, .12], [.95, .9, .8]), a9: d => eske(d, .09, .06, .04, [.2, .25, .35], [.9, .9, .9]), a556: d => eske(d, .1, .06, .05, [.3, .3, .2], [.9, .8, .3]),
    forbinding: d => { kloss(d, 0, 0, 0, .18, .12, .08, [.85, .15, .12]); kloss(d, 0, .061, .03, .06, .003, .02, [.95, .95, .95]); kloss(d, 0, .061, .02, .02, .003, .04, [.95, .95, .95]); },
    smertestillende: d => eske(d, .08, .03, .1, [.95, .95, .95], [.2, .45, .75]), lommelykt: d => rull(d, 0, 0, 0, .025, .2, [.15, .15, .17], 8, true), batterier: d => eske(d, .07, .02, .1, [.9, .55, .1], [.1, .1, .1]),
    tau: d => rull(d, 0, 0, 0, .1, .06, [.75, .65, .4], 12), verktøy: d => { kloss(d, 0, 0, 0, .45, .2, .2, [.75, .12, .1]); kloss(d, 0, 0, .2, .2, .03, .04, [.15, .15, .15]); },
    sovepose: d => rull(d, 0, 0, 0, .13, .4, [.25, .35, .55], 10, true), feltflaske: d => flaske(d, .05, .22, [.3, .36, .26], [.1, .1, .1]),
    handlenett: d => { kloss(d, 0, 0, 0, .3, .15, .25, [.2, .45, .25]); kloss(d, 0, 0, .25, .02, .12, .1, [.15, .3, .18]); }, skolesekk: d => sekk3(d, .28, .15, .38, [.2, .35, .65]), tursekk: d => sekk3(d, .32, .22, .55, [.55, .2, .12]), militærsekk: d => sekk3(d, .38, .25, .6, [.3, .34, .22]),
  };
  // et våpen som ligger (langs x): kolbe, kasse, løp; rifler i tre
  function våpen3(d, vid) { const V = rot.Utstyr && Utstyr.VÅPEN[vid], lang = vid === 'pistol' ? .22 : vid === 'mp' ? .6 : .95 + (V && V.rekkevidde > 400 ? .15 : 0), tre = /hagle|rifle/.test(vid), st = [.12, .12, .13], tr = [.38, .25, .14];
    kloss(d, -lang * .32, 0, 0, lang * .36, .045, .1, tre ? tr : st); kloss(d, 0, 0, .01, lang * .2, .04, .07, st); rull(d, lang * .28, 0, .03, .011, lang * .5, st, 6, true); if (vid === 'jaktrifle' || vid === 'rifle') rull(d, .02, 0, .085, .018, .26, [.08, .08, .09], 8, true); }
  function tingTil(d, id) { const vid = våpenAv(id); if (vid) { våpen3(d, vid); return; } (FORM[id] || (q => kloss(q, 0, 0, 0, .12, .08, .08, [.6, .55, .45])))(d); }
  // (20. nov natt, hakk) samme ting = samme geometri: hver ting lages én gang (samlet til ett stykke) og kopieres der den står,
  // i stedet for at alle klossene lages på nytt for hver melk og hver patroneske. Kopien dreies og flyttes som før.
  const MALER = new Map();
  function mal(nøkkel, lag) { let g = MALER.get(nøkkel); if (!g) { const d = []; lag(d); g = MODELLER.samle(d); for (const q of d) q.dispose(); MALER.set(nøkkel, g); } return g.clone(); }
  const tingMal = id => [mal('t:' + id, d => tingTil(d, id))], våpenMal = vid => [mal('v:' + vid, d => våpen3(d, vid))];
  // legg geometriene i d (laget i tingens ramme) inn i bygget: dreid a, flyttet til (x, y, z)
  const plasser = (ut, d, a, x, y, z, vipp) => { for (const g of d) { if (vipp) g.rotateY(vipp); g.rotateZ(a); g.translate(x, y, z); ut.push(g); } };
  // bakveggen bak et møbel: den siden (±dybden) som er sperret
  function bak(pl, m) { const c = Math.cos(m.a || 0), s = Math.sin(m.a || 0), nx = -s, ny = c, k = (m.d || .5) / 2 + .25; const B = rot.Interior && Interior.blokkert;
    const a1 = B ? B(pl, m.x + nx * k, m.y + ny * k) : false, a2 = B ? B(pl, m.x - nx * k, m.y - ny * k) : false; return a1 && !a2 ? 1 : a2 && !a1 ? -1 : 1; }
  // hva som vises i et bygg: [{ b, type, vis }] og en signatur (bygges bare på nytt når den endres)
  function visesI(pl) { const kl = L.LEIR[pl.kl] ? 'brakke' : pl.kl, liste = [], sig = [];
    for (const b of L.beholdere(pl)) { if (b.type !== 'skap' && !OPPÅ[b.type]) continue; const nk = b.nk, B = innholdAv(nk, kl, b.type, pl.i, b.k, nærLeir(pl.P)); if (!Object.keys(B.t).length) continue;
      const rr = L.stabler(B, nå(), undefined, { vekter: VEKT }), vis = b.type === 'skap' ? rr.filter(r => våpenAv(r.id)).slice(0, 2) : rr.slice(0, Math.max(1, Math.min(6, Math.floor((b.m.b || .6) / .22))));
      if (!vis.length) continue; liste.push({ b, vis }); sig.push(nk + ':' + vis.map(r => r.id + (r.n > 2 ? 2 : r.n)).join(',')); }
    return { liste, sig: sig.join('|') }; }
  function byggTing(pl, liste) {
    const ut = [];
    for (const { b, vis } of liste) { const m = b.m, ca = Math.cos(m.a || 0), sa = Math.sin(m.a || 0), bredde = m.b || .6;
      if (b.type === 'skap') { const sd = bak(pl, m), nx = -sa * sd, ny = ca * sd;
        vis.forEach((r, q) => { const side = q ? -1 : 1, px = m.x + ca * side * (bredde / 2 + .18) + nx * ((m.d || .58) / 2 - .05), py = m.y + sa * side * (bredde / 2 + .18) + ny * ((m.d || .58) / 2 - .05), d = våpenMal(våpenAv(r.id));
          // reist mot veggen: løpet opp, litt hellende inn mot veggen
          for (const g of d) { g.rotateY(-Math.PI / 2 + .14); g.rotateZ(Math.atan2(ny, nx)); g.translate(px, py, pl.gulv + .5); ut.push(g); } });
        continue; }
      const z = pl.gulv + (m.h || .9) * OPPÅ[b.type] + .005, steg = bredde / (vis.length + 1);
      vis.forEach((r, q) => { const t = -bredde / 2 + steg * (q + 1), n = Math.min(2, r.n); for (let e = 0; e < n; e++) { const d = tingMal(r.id); const off = e * .09, vri = L.hash(pl.i + q, e) * .6 - .3;
        plasser(ut, d, (m.a || 0) + vri, m.x + ca * (t + off * .5) - sa * (off - .04), m.y + sa * (t + off * .5) + ca * (off - .04), z); } }); }
    return ut;
  }
  function haugene(R, u) {
    const p0 = { x: u.cx + R.bane.x, y: u.cy + R.bane.y }, nær = S.gulv.filter(h => Math.hypot(h.x - p0.x, h.y - p0.y) < 120 && Object.values(h.t).some(n => n > 0)), ut = [];
    const sig = nær.map(h => `${h.x},${h.y}:${Object.entries(h.t).map(([a, b]) => a + b).join(',')}`).join('|'); if (sig === gulvSig && (gulvMesh || !nær.length)) return;
    gulvSig = sig; if (gulvMesh) { R.scene.remove(gulvMesh); gulvMesh.geometry.dispose(); gulvMesh = null; } if (!nær.length) return;
    const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX;
    for (const h of nær) { const x = h.x - u.cx, y = h.y - u.cy, z0 = rot.Interior3d ? Interior3d.høyde(x, y, terr) : null, z = z0 === null ? terr(x, y) : z0; let q = 0;
      for (const [id, n] of Object.entries(h.t)) { if (!(n > 0) || q >= 8) continue; const d = tingMal(id); const v = q * 2.4, rr = q ? .12 + q * .06 : 0; plasser(ut, d, L.hash(Math.round(h.x), q) * 6.28, x + Math.cos(v) * rr, y + Math.sin(v) * rr, z + .005); q++; } }
    if (!ut.length) return; if (!mat3) mat3 = new THREE.MeshLambertMaterial({ vertexColors: true });
    gulvMesh = new THREE.Mesh(MODELLER.samle(ut), mat3); gulvMesh.userData.lut = true; R.scene.add(gulvMesh); for (const g of ut) g.dispose();
  }
  function ramme3(R) {
    if (!klar || typeof THREE === 'undefined' || !rot.MODELLER || !R.ut || !rot.Interior3d) return;
    if (forU3 !== R.ut) { forU3 = R.ut; gulvSig = ''; if (gulvMesh) { if (gulvMesh.parent) gulvMesh.parent.remove(gulvMesh); gulvMesh.geometry.dispose(); gulvMesh = null; } }
    if (!R.fot) { if (gulvMesh) { R.scene.remove(gulvMesh); gulvMesh.geometry.dispose(); gulvMesh = null; gulvSig = ''; } return; }
    const t = performance.now(); if (t - sist3 < 300) return; sist3 = t;
    for (const o of Interior3d.aktive()) { if (!o.plan || !o.nett) continue; const { liste, sig } = visesI(o.plan); if (o.lutSig === sig) continue; o.lutSig = sig;
      const gammel = o.nett.find(m => m.userData && m.userData.lut); if (gammel) { R.scene.remove(gammel); gammel.geometry.dispose(); o.nett.splice(o.nett.indexOf(gammel), 1); }
      const ut = byggTing(o.plan, liste); if (!ut.length) continue; if (!mat3) mat3 = new THREE.MeshLambertMaterial({ vertexColors: true });
      const m = new THREE.Mesh(MODELLER.samle(ut), mat3); m.userData.lut = true; R.scene.add(m); o.nett.push(m); for (const g of ut) g.dispose();
      // (20. nov natt, hakk) har denne runden brukt over 4 ms, tas resten av husene i neste runde (300 ms senere)
      if (performance.now() - t > 4) break; }
    haugene(R, R.ut);
  }
  KROKER.ramme3d.push(ramme3);

  // ---------- møbler som løftes og settes ned (spill/mobler-visning.js) ----------
  // løft: innholdet i en beholder blir fast (S.b) og følger møbelet; fersk mat eldes som vanlig mens det bæres. Gir { kg } eller null.
  function løft(nk, P, type) { const D = L.BEHOLDERE[type]; if (!D) return { kg: 0 }; const [i, , k] = nk.split(':'), kl = P && P.leir ? 'brakke' : P && P.bygg ? P.bygg.kl : 'hus';
    const B = innholdAv(nk, kl, type, +i, +k, nærLeir(P)), kgInn = L.kg(B, VEKT); return { kg: kgInn, B }; }
  function tattOpp(nk, P, type) { const D = L.BEHOLDERE[type]; if (!D) return; const r = løft(nk, P, type), nåT = nå(), C = D.kald ? strømTil(P) : undefined;
    L.normaliser(r.B, nåT, !!D.kald); for (const [id, a] of Object.entries(r.B.d || {})) r.B.d[id] = a.map(e => nåT - L.alder(e, nåT, C));
    endretInnhold({ nk, B: r.B }); }
  // satt ned: i et kjøleskap teller kulden fra nå
  function sattNed(nk, type) { const D = L.BEHOLDERE[type], B = S.b[nk]; if (!D || !B) return; if (D.kald) { const nåT = nå(); for (const [id, a] of Object.entries(B.d || {})) B.d[id] = a.map(e => [L.alder(e, nåT), nåT]); } minne.delete(nk); lagre(); }

  // (runde 5) HUSENE LEVER: fiendelag og røvere nær et bygg i 3D-utsnittet tømmer det over tid (ikke av seg selv i testene: LutSpill.test)
  let ranAkk = 0, ranU = null, ranRute = null;
  const auto = () => !navigator.webdriver || ut.test;
  KROKER.sim.push(dt => { if (!klar || !auto() || !(dt > 0)) return; ranAkk += dt; if (ranAkk < R.ran.steg) return; const h = Math.min(ranAkk, 240) / 60; ranAkk = 0;
    const Q = r3(), u = Q && Q.ut; if (!u || !u.hus || !u.hus.omriss || typeof ENHETER === 'undefined') return;
    if (ranU !== u) { ranU = u; ranRute = new Map(); for (const P of u.hus.omriss) { if (!P || !P.bygg || P.leir || !P.length) continue; let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } x /= P.length; y /= P.length;
        const k = Math.floor(x / 100) + ',' + Math.floor(y / 100); if (!ranRute.has(k)) ranRute.set(k, []); ranRute.get(k).push([P.bygg.i, x, y]); } }
    const sett = new Set();
    for (const e of ENHETER) { if (e.side === 'blå' || (typeof levende === 'function' && !levende(e))) continue; const x = e.x - u.cx, y = e.y - u.cy; if (Math.abs(x) > u.S || Math.abs(y) > u.S) continue;
      for (let a = Math.floor(x / 100) - 1; a <= Math.floor(x / 100) + 1; a++) for (let c = Math.floor(y / 100) - 1; c <= Math.floor(y / 100) + 1; c++)
        for (const [i, bx, by] of ranRute.get(a + ',' + c) || []) { if (sett.has(i) || Math.hypot(bx - x, by - y) > R.ran.radius) continue; sett.add(i); const før = S.ran[i] || 0, ny = L.ransak(før, h); if (ny > før) tøm(i, { andel: (ny - før) / Math.max(1e-9, 1 - før) }); } }
  });

  Object.assign(ut, { tøm, ransaket, nærLeir, innholdAv, løft, tattOpp, sattNed, start, registrer, åpne, erÅpen: () => åpen, vis, klar: () => klar, S: () => S, bær: () => status(), fart, kanLøpe, løp, sekkKnapp,
    beholdere: () => beholdereNå(), nærmeste, aktiv, velgFane: nk => { fane = nk; vis(true); }, taFra, leggI, våpenTil, våpenISekk, tilBeltet, taPå, taAv, spis, bruk, lad, tilLeiren,
    gulv: () => S.gulv, strømTil, oppdaterKnapp, ramme3, gulvMesh: () => gulvMesh, tarE: () => åpen || (går() && !!nærmeste()), velg: q => { valgt = q; vis(true); }, flyttValgt, endretInnhold, lagreNå,
    // til vakten: glem det som er endret i beholderne for et bygg, og sett sekken på ryggen tilbake
    glemBygg: i => { for (const k of Object.keys(S.b)) if (k.startsWith(i + ':')) delete S.b[k]; for (const k of [...minne.keys()]) if (k.startsWith(i + ':')) minne.delete(k); lagre(); },
    settS: d => { S = { ...nyS(), ...d }; lagre(); },
    // (runde 12) «Se i skapene» fra letingen: panelet med alle beholderne i bygget du står i (null når det ikke er noen)
    åpneHele: () => { const Q = r3(), P = Q && Q.fot && rot.Interior3d ? Interior3d.inne(Q.bane.x, Q.bane.y) : null; if (!P || !P.inne || !P.bygg) return false; helHus = P.bygg.i; const h = beholdereHer(); if (!h.liste.length) { helHus = null; return false; } return åpne(true, h.liste[0].nk); },
    // hvor mange beholdere bygget har, og hvor mange av dem det ligger noe i (uten å åpne noe): { antall, medTing, kg }
    husOversikt: P => { if (!klar || !P || !P.inne || !P.bygg) return { antall: 0, medTing: 0, kg: 0 }; const kl = P.leir ? 'brakke' : P.bygg.kl; let antall = 0, medTing = 0, kgSum = 0;
      for (const b of L.beholdere(P.inne, P.bygg.i)) { antall++; const k = L.kg(innholdAv(b.nk, kl, b.type, P.bygg.i, b.k, nærLeir(P)), VEKT); if (k > 0) { medTing++; kgSum += k; } } return { antall, medTing, kg: Math.round(kgSum * 10) / 10 }; },
    helHus: () => helHus });
  rot.LutSpill = ut;
})(typeof window !== 'undefined' ? window : globalThis);
