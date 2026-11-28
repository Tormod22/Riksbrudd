'use strict';
/* FABRIKKBYGG – visningen (28. nov, ut10-fabrikkbygg). Reglene: spill/fabrikkbygg.js (window.Fabrikkbygg).
 *  - Plantegningen (Se inn) av et industribygg får raden «Ta i bruk som fabrikk (pris, tid)» – eller hvorfor det ikke går (bransjen har
 *    ingen maskiner, for langt fra leiren). Gjennom kommandolaget (KOMMANDO type «fabrikkbygg»). Når bygget er vårt: maskinene og om de går.
 *  - Maskinene blir bygg i leiren (L.bygg, type fb_<maskin>) ved møblene i huset; byggelaget setter dem i stand (jobb), så går de med de
 *    vanlige reglene (produksjon.js / baering.js): folk på «Maskiner», strøm fra leiren, råvaren og varene bæres fra og til lageret.
 *  - Kartet: «Din fabrikk · Sagbruk» over bygget og en prikk per maskin (grønn = går, gul = står). Fanen Produksjon: «Fabrikkbygg» med
 *    bygget, bransjen, maskinene, folkene og hvorfor de står. Fiender som angriper leiren skader maskinene som andre bygg (leir-visning.js).
 *  - 3D: maskinene beveger seg og lager lyd når de går (Maskiner.LIV for fb_<maskin>, spill/maskiner-visning.js).
 *  - Lagres per leir i «riksbrudd-fabrikkbygg» (hvilke hus som er fabrikker); maskinene selv lagres med leiren («riksbrudd-k2»).
 * window.FabrikkbyggSpill (tilstand, ta, slipp, html, kjør, lagre, lesInn, NØKKEL).
 */
(function () {
  const FB = window.Fabrikkbygg; if (!FB || typeof document === 'undefined') return;
  FB.registrer(window.Leir);
  const NØKKEL = 'riksbrudd-fabrikkbygg', TEGNET = { n: 0 };
  const leirXY = () => { const s = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return s && s.leir ? { x: s.leir.x, y: s.leir.y } : null; };
  const leirId = () => { const l = leirXY(); return l ? Math.round(l.x) + ',' + Math.round(l.y) : ''; };
  let D = FB.nyLogg('');
  function lesInn() { try { D = FB.lesLogg(localStorage.getItem(NØKKEL), leirId()); } catch (e) { D = FB.nyLogg(leirId()); } }
  function lagre() { D.leir = leirId(); try { localStorage.setItem(NØKKEL, JSON.stringify(D)); } catch (e) { /* sperret */ } }
  const L = () => { try { return window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null; } catch (e) { return null; } };
  const kroner = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const P2 = () => window.Plantegning2D || null;
  const midt = Pv => { let x = 0, y = 0; for (const p of Pv) { x += p[0]; y += p[1]; } return [x / Pv.length, y / Pv.length]; };
  const areal = Pv => { let A = 0; for (let k = 0; k < Pv.length; k++) { const a = Pv[k], b = Pv[(k + 1) % Pv.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A) / 2; };
  // bransjen for et hus i plantegningen: fra modellens hall (samme som linja i plantegningen), ellers Industri.forHus
  function bransje(h) {
    const I = window.Industri; if (!I || !h) return 0;
    try { const F = h.m && window.Plantegning ? Plantegning.figur(h.m, 1) : null; if (F) for (const r of F.rom) for (const t of I.ALLE) if (I.IND[t].hall === r.rolle) return t; } catch (e) { /* uten modell */ }
    try { const f = I.forHus && I.forHus(h.e, h.Pv); return f ? f.ind : 0; } catch (e) { return 0; }
  }
  const industriBygg = h => !!h && h.e && (h.e.t === 6 || h.e.t === 12 || (h.info && (h.info.kl === 'industri' || h.info.kl === 'lager')));
  // møblene i huset i kartets meter (modellen står i husets egne akser fra h.o)
  function møbler(h) { const ut = []; try { const F = Plantegning.figur(h.m, 1), [ox, oy] = h.o || [0, 0];
    for (const q of F.møbler) { const [a, b, c] = q.P; ut.push({ type: q.type, x: ox + (a[0] + c[0]) / 2, y: oy + (a[1] + c[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }); } } catch (e) { /* uten modell */ } return ut; }
  function vurder(i) {
    const h = P2() && P2().hus(i); if (!h) return { feil: 'Bygget er ikke lastet.' }; const l = leirXY(); if (!l) return { feil: 'Ingen leir ennå.' };
    const c = midt(h.Pv), ind = bransje(h), A = h.A || areal(h.Pv);
    const v = FB.kanTa({ ind, avstand: Math.hypot(c[0] - l.x, c[1] - l.y), alt: !!D.hus[i], revet: !!(window.HUS_BORT && HUS_BORT.has(+i)) });
    return { h, c, ind, A, v, mt: FB.maskinerFor(ind, A), I: FB.istand(FB.maskinerFor(ind, A)) };
  }
  // i testene settes maskinene i stand straks (ingenting skjer av seg selv); FabrikkbyggSpill.test = true gir den vanlige jobben
  const straks = () => !!navigator.webdriver && api.test !== true;
  function ta(i) {
    const V = vurder(i); if (V.feil) return { feil: V.feil }; if (!V.v.ok) return { feil: V.v.feil };
    const l = L(); if (!l) return { feil: 'Leiren finnes ikke.' };
    if (V.I.kr > 0 && !(window.OppstartSpill && OppstartSpill.betal(V.I.kr))) return { feil: `Ikke nok penger til å sette maskinene i stand (${kroner(V.I.kr)}).` };
    const id0 = Math.max(0, ...l.bygg.map(b => b.id)) + 1, B = FB.lagBygg({ ind: V.ind, areal: V.A, møbler: møbler(V.h), c: V.c, hus: +i, id0, straks: straks() });
    l.bygg.push(...B); const I = window.Industri;
    D.hus[i] = { ind: V.ind, maskiner: B.map(b => b.id), navn: I ? I.tekst(V.ind, 'Fabrikk') : 'Fabrikk', c: V.c.map(Math.round), tid: typeof tid !== 'undefined' ? tid : 0 };
    lagre(); if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (typeof skitten !== 'undefined') skitten = true;
    const navn = B.map(b => FB.NAVN[Leir.BYGG[b.type].maskinType] || b.type).join(' og ').toLowerCase();
    return `Bygget er tatt i bruk som fabrikk: ${navn}. Istandsetting ${kroner(V.I.kr)}` + (B.some(b => b.igjen > 0) ? ` – byggelaget setter maskinene i stand (ca. ${String(V.I.timer).replace('.', ',')} t arbeid).` : '.') + ' Sett folk på «Maskiner».';
  }
  function slipp(i) { const o = D.hus[i]; if (!o) return { feil: 'Bygget er ikke en fabrikk.' }; const l = L();
    if (l) for (let k = l.bygg.length - 1; k >= 0; k--) if (l.bygg[k].fabrikk === +i) l.bygg.splice(k, 1);
    delete D.hus[i]; lagre(); if (window.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (typeof skitten !== 'undefined') skitten = true; return 'Fabrikken er gitt opp – maskinene står igjen i bygget.'; }
  // kommandolaget
  function registrer() { const K = window.Kommando; if (!K || !K.registrer) return false;
    if (!K.finnes('fabrikkbygg')) K.registrer('fabrikkbygg', { leir: true,
      sjekk: k => { if (k.slipp) return D.hus[k.hus] ? null : 'Bygget er ikke en fabrikk.'; const V = vurder(k.hus); if (V.feil) return V.feil; if (!V.v.ok) return V.v.feil;
        const sp = window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null; return sp && sp.penger < V.I.kr ? `Ikke nok penger til å sette maskinene i stand (${kroner(V.I.kr)}).` : null; },
      utfør: k => (k.slipp ? slipp(k.hus) : ta(k.hus)), beskriv: k => (k.slipp ? 'gir opp en fabrikk' : 'tar et industribygg i bruk som fabrikk') });
    return true; }
  const kjør = k => { registrer(); const r = window.KOMMANDO ? KOMMANDO(k) : window.Kommando ? Kommando.utfør(k, {}) : { ok: false, feil: 'Kommandolaget mangler.' };
    if (typeof logg === 'function') logg(r.ok ? (typeof r.svar === 'string' ? r.svar : (r.svar && r.svar.tekst) || 'OK.') : r.feil); return r; };

  // status per maskin (fra produksjon-visning.js)
  const status = id => { try { const s = window.ProduksjonSpill && ProduksjonSpill.status ? ProduksjonSpill.status()[id] : null; return s || null; } catch (e) { return null; } };
  function maskinTekst(id) { const l = L(), b = l && l.bygg.find(q => q.id === id); if (!b) return null; const B = Leir.BYGG[b.type], navn = FB.NAVN[B.maskinType] || B.navn;
    if (b.igjen > 0) return { navn, tekst: `settes i stand (${Math.round(Leir.framdrift ? Leir.framdrift(b) * 100 : 0)} %)`, går: false };
    const s = status(id); return { navn, tekst: s ? (s.går ? 'går' : s.tekst || 'står') : 'venter', går: !!(s && s.går), folk: s ? s.folk : 0, b }; }

  // ---------- plantegningen: raden ----------
  (window.PLAN2D_RAD = window.PLAN2D_RAD || []).push((h, n) => {
    if (!h || n !== 1 || !industriBygg(h)) return '';
    const o = D.hus[h.i];
    if (o) { const M = o.maskiner.map(maskinTekst).filter(Boolean);
      return `<div class="rad" id="fbrad"><b>Din fabrikk</b><small>${esc(M.map(m => `${m.navn}: ${m.tekst}`).join(' · ') || 'maskinene er borte')}</small><button type="button" data-fb="slipp" data-hus="${h.i}">Gi opp fabrikken</button></div>`; }
    const V = vurder(h.i); if (V.feil) return '';
    if (!V.v.ok) return `<div class="rad" id="fbrad"><small>${esc(V.v.feil)}</small></div>`;
    const navn = V.mt.map(m => FB.NAVN[m]).join(' og ').toLowerCase();
    return `<div class="rad" id="fbrad"><button type="button" data-fb="ta" data-hus="${h.i}" title="Maskinene (${esc(navn)}) settes i stand og kobles til leirens strøm. Sett folk på «Maskiner».">Ta i bruk som fabrikk: ${esc(navn)} (${kroner(V.I.kr)}, ${String(V.I.timer).replace('.', ',')} t)</button></div>`;
  });
  document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-fb]'); if (!t) return; e.preventDefault(); e.stopPropagation();
    kjør(t.dataset.fb === 'slipp' ? { type: 'fabrikkbygg', hus: +t.dataset.hus, slipp: true } : { type: 'fabrikkbygg', hus: +t.dataset.hus }); if (typeof skitten !== 'undefined') skitten = true; }, true);

  // ---------- kartet: «Din fabrikk» og en prikk per maskin ----------
  if (typeof KROKER !== 'undefined') KROKER.tegn.push((g, vx0, vy1) => {
    const ider = Object.keys(D.hus); if (!ider.length || typeof kam === 'undefined' || kam.m > 30) return; const m = kam.m, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m;
    g.save(); g.font = '600 12px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center';
    for (const i of ider) { const o = D.hus[i]; if (!o.c) continue; const x = sx(o.c[0]), y = sy(o.c[1]); if (x < -80 || y < -40 || x > g.canvas.width + 80 || y > g.canvas.height + 40) continue;
      const M = o.maskiner.map(maskinTekst).filter(Boolean), går = M.some(q => q.går), t = 'Din fabrikk · ' + (M[0] ? M[0].navn : '');
      const ty = window.Etikett ? Etikett.tekst(g, t, x, y - 14, -1, 2) : y - 14; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, x, ty); g.fillStyle = '#f0d79a'; g.fillText(t, x, ty);
      M.forEach((q, k) => { g.beginPath(); g.arc(x - (M.length - 1) * 6 + k * 12, ty + 7, 3.5, 0, 6.283); g.fillStyle = q.går ? '#6fbf73' : q.b && q.b.igjen > 0 ? '#9a8f78' : '#e8b04a'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 1; g.stroke(); });
      void går; TEGNET.n++; }
    g.restore(); });

  // ---------- fanen Produksjon: «Fabrikkbygg» ----------
  function html() {
    const ider = Object.keys(D.hus); if (!ider.length) return ''; const I = window.Industri;
    let s = '<h3>Fabrikkbygg</h3>';
    for (const i of ider) { const o = D.hus[i], M = o.maskiner.map(maskinTekst).filter(Boolean);
      s += `<div class="rad fabrikkbygg" data-fbhus="${i}"><b>${esc(o.navn || (I ? I.tekst(o.ind, 'Fabrikk') : 'Fabrikk'))}</b><small>${o.c ? `${Math.round(Math.hypot(o.c[0] - (leirXY() || { x: 0 }).x, o.c[1] - (leirXY() || { y: 0 }).y))} m fra leiren · ` : ''}` +
        esc(M.map(m => `${m.navn}: ${m.tekst}` + (m.folk ? ` (${String(Math.round(m.folk * 10) / 10).replace('.', ',')} folk)` : '')).join(' · ')) + '</small></div>'; }
    return s;
  }
  if (window.ProduksjonSpill && ProduksjonSpill.html && !ProduksjonSpill.html.fabrikkbygg) { const før = ProduksjonSpill.html; ProduksjonSpill.html = (...a) => før(...a) + html(); ProduksjonSpill.html.fabrikkbygg = true; }

  // revne hus: fabrikken forsvinner
  setInterval(() => { try { if (!window.HUS_BORT) return; for (const i of Object.keys(D.hus)) if (HUS_BORT.has(+i)) { slipp(i); if (typeof logg === 'function') logg('Fabrikkbygget er revet – maskinene er borte.'); } } catch (e) { /* neste gang */ } }, 2000);
  // ny leir / lagret spill: les inn på nytt
  window.addEventListener('riksbrudd-spill', () => { lesInn(); });
  lesInn();
  const api = { test: false, tegnet: () => TEGNET.n, tilstand: () => D, ta, slipp, vurder, html, kjør, registrer, lagre, lesInn, NØKKEL, bransje };
  window.FabrikkbyggSpill = api;
})();
