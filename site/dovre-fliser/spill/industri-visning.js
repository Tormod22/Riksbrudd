'use strict';
/* INDUSTRIEN I BYGGENE – visningen (28. nov, ut8-industri). Reglene: spill/industri.js (window.Industri).
 *  - Industri.omgivelser(info): det spillet vet om stedet rundt et bygg (info.X/Y = midten i kartets meter): meter til nærmeste
 *    oljeterminal på land (INFRA.olje type 3), kraftverk (INFRA.kraft), kai/havn (INFRA.ferjekai og kaiene fra spill/kaier.js),
 *    om bygget ligger i et fiskevær (lite tettsted ved sjøen), høyden over havet og helningen rundt (hoydeVed). Svaret huskes per
 *    bygg når kartdataene er lest, så 2D og 3D gir samme industritype.
 *  - Industri.panelNavn(e, P): navnet i huspanelet («Industri – fiskeforedling»), og Industri.panelHint(e) (anslått eller fra dataene).
 *  - Plantegningen får en linje med industritypen og de viktigste maskinene (window.PLAN2D_RAD).
 * window.IndustriSpill (cache, tøm, omgivelser, prøv).
 */
(function () {
  const I = window.Industri; if (!I || typeof document === 'undefined') return;
  if (window.Interior) I.koble(window.Interior);
  const R = I.REGLER, CACHE = new Map();
  const infra = () => (typeof INFRA !== 'undefined' && INFRA) || null;
  const pkt = o => (o && o.deler && o.deler[0] ? { x: o.deler[0][0], y: o.deler[0][1] } : null);
  function nærmest(liste, x, y, filter) { let d = Infinity; for (const o of liste || []) { if (filter && !filter(o)) continue; const p = pkt(o); if (p) d = Math.min(d, Math.hypot(p.x - x, p.y - y)); } return d; }
  // (ut9-industri2) høyden fra en ferdig kartflis på HVILKET SOM HELST nivå (finest først). hoydeVed leser bare flisene på nivået kartet
  // står på nå – rett etter en zoom (oppstarten går inn på leiren) er de ikke laget ennå, og da manglet høyden (vakta ut8-industri feilet
  // på PC med «omgivelsene ved leiren mangler høyde»).
  function høydeFlis(X, Y) {
    if (typeof FERDIG === 'undefined' || typeof span !== 'function' || typeof res !== 'function' || typeof G === 'undefined' || !G) return null;
    for (let z = 17; z >= 0; z--) { const s = span(z), x = Math.floor((X - G.x0) / s), y = Math.floor((G.y0 - Y) / s), t = FERDIG.get(z + '/' + x + '/' + y);
      if (!t || !t.E) continue; const px = Math.floor((X - (G.x0 + x * s)) / res(z)), py = Math.floor(((G.y0 - y * s) - Y) / res(z)), v = t.E[(py + 1) * (G.T + 2) + px + 1];
      if (v === v && Number.isFinite(v)) return v; }
    return null;
  }
  // høyden: kartflisene i 2D (hoydeVed, ellers et annet nivå), ellers 3D-utsnittet (hoyde3d) når 3D er åpent
  const høyde = (x, y) => { try { let v = typeof hoydeVed === 'function' ? hoydeVed(x, y) : null;
    if (!Number.isFinite(v)) v = høydeFlis(x, y);
    if (!Number.isFinite(v) && typeof hoyde3d === 'function' && typeof R3 !== 'undefined' && R3 && R3.ut) { const u = R3.ut; if (Math.abs(x - u.cx) < u.S && Math.abs(y - u.cy) < u.S) v = hoyde3d(x, y, u); }
    return Number.isFinite(v) ? v : null; } catch (e) { return null; } };
  // Omgivelsene rundt (X, Y). null når stedet ikke er kjent (bygget mangler X/Y).
  function omgivelser(info) {
    if (!info || !Number.isFinite(info.X) || !Number.isFinite(info.Y)) return null;
    const nøkkel = Number.isFinite(info.i) ? info.i | 0 : null; if (nøkkel !== null && CACHE.has(nøkkel)) return CACHE.get(nøkkel);
    // rundes til 10 m, så 2D (plantegningen) og 3D (hus3d) regner fra samme punkt
    const x = Math.round(info.X / 10) * 10, y = Math.round(info.Y / 10) * 10, F = infra(), o = {};
    if (F) {
      o.olje = nærmest(F.olje, x, y, q => q.e && q.e.type === 3); o.kraft = nærmest(F.kraft, x, y); o.kai = nærmest(F.ferjekai, x, y);
      // fiskevær: et lite tettsted innen 3 km som ligger lavt (ved sjøen)
      let fv = false; for (const by of F.tettsted || []) { const b = by.bb; if (!b) continue; const mx = (b[0] + b[2]) / 2, my = (b[1] + b[3]) / 2;
        if (Math.hypot(mx - x, my - y) > 3000 || !((by.e && by.e.folk) < R.fiskevær.folk)) continue; const h = høyde(mx, my); if (h !== null && h < R.fiskevær.moh) { fv = true; break; } }
      o.fiskevær = fv;
    }
    try { const K = window.KaierSpill && KaierSpill.data(); if (K && window.Kaier) { const f = Kaier.nær(K, x, y, R.kai.middels, i => K.t[i] >= 2 || K.l[i] >= 30); if (f) o.kai = Math.min(o.kai === undefined ? Infinity : o.kai, f.d); } } catch (e) { /* uten kaier */ }
    const h0 = høyde(x, y); if (h0 !== null) o.moh = h0;
    // helningen: største høydeforskjell til fire punkter 80 m unna
    if (h0 !== null) { let d = 0; for (const [dx, dy] of [[80, 0], [-80, 0], [0, 80], [0, -80]]) { const h = høyde(x + dx, y + dy); if (h !== null) d = Math.max(d, Math.abs(h - h0)); } o.bratt = d / 80; }
    // (ut9-industri2) STABILT: svaret huskes første gang infrastrukturen er lest – også uten høyden (da anslås typen uten høyde og
    // helning). Samme bygg får altså samme type i plantegningen, huspanelet og 3D, og den skifter ikke når flere kartfliser er lest.
    // (Før ble svaret bare husket med høyden, og en plantegning laget før høyden var lest kunne vise en annen type enn panelet etterpå.)
    // Også uten infrastruktur (de første sekundene, eller når den ikke kan hentes) huskes svaret – ellers kunne typen skifte når den kom.
    o.utenHøyde = h0 === null; o.utenInfra = !F; if (nøkkel !== null) CACHE.set(nøkkel, o);
    return o;
  }
  I.omgivelser = omgivelser;

  // ---------- huspanelet ----------
  const erIndustri = (t, A, h) => t === 6 || (t === 2 && (h || 6) <= 11 && A > 700);
  const tett = i => { try { return typeof TETT !== 'undefined' && TETT.get ? TETT.get(i) || 0 : 0; } catch (e) { return 0; } };
  function midt(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; }
  function arealAv(P) { let A = 0; for (let k = 0; k < P.length; k++) { const a = P[k], b = P[(k + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A) / 2; }
  // industritypen for et bygg fra husdataene (e = egenskapene, P = omrisset i kartets meter)
  function forHus(e, P) {
    const A = P ? arealAv(P) : 0, [X, Y] = P ? midt(P) : [NaN, NaN], h = e.h || 6;
    const ind = erIndustri(e.t, A, h) ? I.forInfo({ i: e.i, ind: e.ind, t: e.t, h, areal: A, tett: tett(e.i), X, Y }) : e.ind > 0 && I.IND[e.ind] ? e.ind : 0;
    return { ind, kjent: e.ind > 0 && !!I.IND[e.ind], lager: e.t === 12 };
  }
  const BASE = { 1: 'Garasje eller uthus', 2: 'Næringsbygg', 4: 'Landbruksbygg', 5: 'Bygg', 6: 'Industri', 12: 'Lager' };
  // navnet i huspanelet: «Industri – fiskeforedling», «Lager – fiskeforedling», «Garasje eller uthus – kraft og energi» (null = som før)
  function panelNavn(e, P) {
    if (!e) return null; const f = forHus(e, P);
    if (!f.ind) return e.t === 6 ? 'Industri' : null;
    if (f.lager && f.ind === 11) return 'Lager og logistikk';
    const base = erIndustri(e.t, P ? arealAv(P) : 0, e.h) ? 'Industri' : BASE[e.t]; return base ? I.tekst(f.ind, base) : null;
  }
  function panelHint(e, P) { if (!e) return ''; const f = forHus(e, P); if (!f.ind) return ''; return f.kjent ? ' Industritypen er fra kartdataene.' : ' Industritypen er anslått ut fra stedet (havn, oljeanlegg, kraftverk, fjell, skog).'; }
  I.panelNavn = panelNavn; I.panelHint = panelHint; I.forHus = forHus;

  // ---------- plantegningen: linja med industritypen og maskinene ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  (window.PLAN2D_RAD = window.PLAN2D_RAD || []).push((h, n) => {
    if (!h || !h.info || (h.info.kl !== 'industri' && h.info.kl !== 'lager') || n !== 1) return '';
    // samme regel som interiøret (Industri.koble): lageret er et industrilokale bare når dataene sier hvilken industri
    const dInd = h.e && h.e.ind > 0 ? h.e.ind : h.info.ind;
    // (ut9-maskiner2) typen fra hallen i den ferdige modellen når den finnes – anslaget fra omgivelsene kan ha endret seg siden modellen ble
    // laget (før kartdataene var lest), og da sto det «fiskeforedling» over en mathall (Egersund på /rogaland)
    let fraModell = 0; try { const F = h.m && window.Plantegning ? Plantegning.figur(h.m, 1) : null; if (F) for (const r of F.rom) { for (const t of I.ALLE) if (I.IND[t].hall === r.rolle) { fraModell = t; break; } if (fraModell) break; } } catch (e) { /* uten modell */ }
    const ind = fraModell || (h.info.kl === 'lager' ? (dInd > 0 && dInd !== 11 && I.IND[dInd] ? dInd : 11) : I.forInfo(Object.assign({}, h.info, { ind: dInd })));
    const navn = h.info.kl === 'lager' && ind === 11 ? 'Lager og logistikk' : I.tekst(ind, h.info.kl === 'lager' ? 'Lager' : 'Industri');
    const ting = [...new Set(I.innredning(ind).filter(x => x.rom === 'hall').map(x => x.navn.toLowerCase()))].slice(0, 4).join(', ');
    // navnet står alltid (også på telefon, der plantegningen skjuler <small>); maskinene bare på større skjermer
    const anslått = dInd > 0 || I.kjent(h.info) || h.info.kl === 'lager' ? '' : ' (anslått)';
    return `<div class="rad"><span id="plan2dind" style="font-size:.92em;color:var(--ink-dim,#b9ab8a)">${esc(navn)}${anslått}</span>${ting ? '<small> · ' + esc(ting) + '</small>' : ''}</div>`;
  });

  window.IndustriSpill = { cache: CACHE, tøm: () => CACHE.clear(), omgivelser, forHus, panelNavn };
})();
