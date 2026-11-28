/* FABRIKKEN – visningen (28. nov, fase B5 i docs/plan-selskap-okonomi.md, kapittel 5.6). Reglene: spill/fabrikk.js (+ maskinene som deler i
 * spill/byggesett.js). Lastes rett etter byggesett.js-visningen og fabrikk.js.
 *  - Byggesettet (fanen «Maskiner») spør FabrikkSpill.sjekkForslag: en maskin uten vei til bruksplassen avvises, «ikke under tak» er en advarsel.
 *  - 2D: maskinene, lampene og hyllene i plantegningen (tegnDel – kalles fra byggesett-visning.js), og zoomet inn: bruksplassene som ringer,
 *    innmating/utmating, lysets rekkevidde og FLYTPILA (grønn med «+15 % flyt» når rekkefølgen er riktig, oransje når den går baklengs).
 *  - 3D: enkle kasser i byggesettets nett (bygg3d – kalles fra byggesett-visning.js).
 *  - Produksjonen: ProduksjonSpill.steg får hallens faktorer (FabrikkSpill.ctx: fart og slitasje per maskin, høvel og sag i samme rom).
 *  - Leir-menyen (fanen Bygg): «Fabrikk» – rommene med maskiner, strømmen per rom (maskiner og lamper), flyt, lys, tak og varme.
 * Ingen lagring: alt regnes ut av leirens bygg. Tallene er Claudes forslag (Fabrikk.REGLER).
 */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.Fabrikk || !window.ByggesettRegler || !window.Leir) return;
  const FB = window.Fabrikk, BS = window.ByggesettRegler, LB = window.Leir, U = BS.U, D = BS.DELER;
  const L = () => (window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null);
  const nf = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');
  // maskinene får strøm etter de andre byggene (som maskin-byggene i Leir.PRIORITET)
  if (Array.isArray(LB.PRIORITET)) for (const t of ['bs_vedkløyver_1', 'bs_høvel_1', 'bs_sagbenk_1']) if (!LB.PRIORITET.includes(t)) LB.PRIORITET.push(t);
  if (window.Produksjon && Produksjon.alias) Produksjon.alias();

  // ---------- hallen (huskes til byggene endres, høyst hvert 1,5 s) ----------
  let H = new Map(), Hnøkkel = '', Htid = 0;
  const nøkkel = l => l.bygg.length + ':' + l.bygg.reduce((s, b) => s + (b.bs ? (b.igjen > 0 ? 1 : 2) * (b.id % 97 + 1) : 0), 0) + ':' + JSON.stringify(l.romBruk || {});
  function hall(l = L()) { if (!l) return new Map(); const k = nøkkel(l), nå = performance.now();
    if (k !== Hnøkkel || nå - Htid > 1500) { Hnøkkel = k; Htid = nå; try { H = FB.hall(l); } catch (e) { H = new Map(); } } return H; }
  const time = () => (typeof tid !== 'undefined' && typeof TIME !== 'undefined' ? (6 + tid / TIME) % 24 : 12);
  const vinter = () => !!(window.VAER && VAER.årstid === 'vinter');
  const mangler = () => (window.LeirSpill && LeirSpill.siste && LeirSpill.siste() && LeirSpill.siste().mangler) || new Set();
  const lampeVirker = l => { const M = mangler(); return id => { const b = l.bygg.find(q => q.id === id); return !!b && LB.virker(b) && !b.av && !M.has(id); }; };
  // faktorene til Produksjon.steg (status = forrige steg, for fyrkjelen)
  let sistF = null;
  function ctx(l, status) { const Hh = hall(l); if (!Hh.size) { sistF = null; return {}; } sistF = FB.faktorer(l, Hh, { time: time(), vinter: vinter(), virker: lampeVirker(l), status }); return sistF; }
  // én linje om maskinen i hallen (fanen Produksjon, byggpanelet): «Fabrikk · flyt +15 % · lys · under tak»
  function tekst(id) { const l = L(); if (!l) return ''; const I = hall(l).get(id); if (!I) return '';
    const F = (sistF && sistF.del[id]) || FB.faktorer(l, new Map([[id, I]]), { time: time(), vinter: vinter(), virker: lampeVirker(l) }).del[id];
    const deler = [I.romNavn || 'ute (ikke i et lukket rom)'];
    deler.push(I.flyt > 1 ? `flyt +${Math.round((I.flyt - 1) * 100)} %` : I.flyt < 1 ? `hulter til bulter −${Math.round((1 - I.flyt) * 100)} %` : 'flyt: ' + (I.flytTekst || 'som vanlig'));
    deler.push(F.lys < 1 ? 'mørkt (−40 %)' : F.lampe ? 'lys på' : 'dagslys'); deler.push(I.tak ? 'under tak' : 'uten tak – slites dobbelt'); if (F.varme < 1) deler.push('kaldt (−20 %)');
    return deler.join(' · '); }

  // ---------- byggesettet: sjekk av en ny maskin ----------
  function sjekkForslag(alle, forslag, o, l) {
    const ok = forslag.filter(q => !q.feil && q.d && BS.kat(q.d) === 'maskin'); if (!ok.length) return;
    const S = window.OppstartSpill && OppstartSpill.tilstand(), st = S && S.leir ? [S.leir.x, S.leir.y] : [o.ox, o.oy];
    for (const q of ok) {
      const d = { ...q.d, id: q.d.id || 'ny', ferdig: true }, deler = alle.filter(a => a.id !== q.bytt).map(a => ({ ...a, ferdig: true })).concat([d]), m = BS.midt(o, d);
      const a = FB.sjekkNy(deler, d); if (a.advarsel) q.advarsel = a.advarsel;
      // varselet før kjøpet (Produksjon.driftVarsel, ut4-balanse2): rekker kassa etter kjøpet?
      if (Array.isArray(window.BYGG_VARSEL)) for (const f of BYGG_VARSEL) { try { const K = LB.kostnad(d.type), v = f(d.type, { kost: K.pris + (LB.manglerPris ? LB.manglerPris(l, K.mat) : 0) });
        if (v && v.tekst) { q.advarsel = [q.advarsel, v.tekst].filter(Boolean).join(' '); break; } } catch (e) { /* uten varsel */ } }
      if (!window.Vei) continue;
      try { const K = Vei.lag({ deler, leir: l, opphav: o, start: st, prøve: true }), P = FB.plasser({ type: d.type, x: m.x, y: m.y, ret: m.ret });
        const r = P.bruks.map(p => Vei.kanNå({ x: p.x, y: p.y, e: (d.n || 0) + 1, bruksplass: true }, { kart: K })), feil = r.find(x => !x.ok);
        if (feil) q.feil = `Ingen vei til bruksplassen (${feil.grunn || 'sperret'}) – sett inn en dør eller port, eller flytt maskinen.`;
      } catch (e) { /* uten vei: ingen sjekk */ }
    }
  }

  // ---------- 2D ----------
  const FARGE = { sagbruk: '#5d6569', høvel: '#6a6f58', vedkløyver: '#6e5a45', fyrkjele: '#59413a', hylle: '#7b6a4c', pall: '#8d7149', lampe: '#f1d27a' };
  function rute(d, o, sx, sy) { const R = BS.ruter(d), i0 = Math.min(...R.map(c => c[0])), j0 = Math.min(...R.map(c => c[1])), i1 = Math.max(...R.map(c => c[0])) + 1, j1 = Math.max(...R.map(c => c[1])) + 1;
    return { x: sx(o.ox + i0 * U), y: sy(o.oy + j1 * U), w: sx(o.ox + i1 * U) - sx(o.ox + i0 * U), h: sy(o.oy + j0 * U) - sy(o.oy + j1 * U) }; }
  const RET = [[1, 0], [0, -1], [-1, 0], [0, 1]];   // flytretningen på skjermen (y ned)
  function pil(g, x0, y0, x1, y1, w) { const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - w * Math.cos(a - .5), y1 - w * Math.sin(a - .5)); g.lineTo(x1 - w * Math.cos(a + .5), y1 - w * Math.sin(a + .5)); g.closePath(); g.fill(); }
  function tegnDel(g, d, o, sx, sy, m, skisse) {
    const T = D[d.type], K = T.kat;
    if (K === 'lampe') { const p = BS.midt(o, d), r = Math.max(2.5, .22 / m); g.fillStyle = skisse || FARGE.lampe; g.beginPath(); g.arc(sx(p.x), sy(p.y), r, 0, 6.283); g.fill();
      if (!skisse) { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.stroke(); } return; }
    const b = rute(d, o, sx, sy), mt = T.maskin || (T.grunn === 'bs_pall' ? 'pall' : 'hylle');
    g.fillStyle = skisse || FARGE[mt] || '#5d6569'; g.fillRect(b.x, b.y, b.w, b.h); if (skisse) return;
    g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, [dx, dy] = RET[(d.r || 0) & 3], lang = (d.r || 0) % 2 ? b.h : b.w, tvers = (d.r || 0) % 2 ? b.w : b.h;
    g.strokeStyle = 'rgba(230,225,210,.55)'; g.fillStyle = 'rgba(230,225,210,.55)';
    if (K === 'lager') { g.lineWidth = 1; const n = Math.max(1, Math.round(lang / Math.max(6, 1.2 / m))); for (let k = 1; k < n; k++) { const f = k / n - .5; g.beginPath(); g.moveTo(cx + dx * lang * f - dy * tvers * .45, cy + dy * lang * f + dx * tvers * .45); g.lineTo(cx + dx * lang * f + dy * tvers * .45, cy + dy * lang * f - dx * tvers * .45); g.stroke(); } return; }
    // maskinen: bordet langs flyten, og et tegn midt på (sagblad, valser, kile, flamme)
    if (lang > 14) { g.lineWidth = Math.max(1, tvers * .12); g.beginPath(); g.moveTo(cx - dx * lang * .45, cy - dy * lang * .45); g.lineTo(cx + dx * lang * .45, cy + dy * lang * .45); g.stroke(); }
    const r = Math.min(tvers, lang) * .3;
    if (mt === 'sagbruk') { g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fillStyle = '#c9cfd2'; g.fill(); g.strokeStyle = '#2c3033'; g.stroke(); }
    else if (mt === 'høvel') { g.fillStyle = '#c9c2a5'; for (const f of [-.2, .2]) { g.beginPath(); g.arc(cx + dx * lang * f, cy + dy * lang * f, r * .7, 0, 6.283); g.fill(); } }
    else if (mt === 'vedkløyver') { g.fillStyle = '#d8c7a6'; g.beginPath(); g.moveTo(cx + dx * r, cy + dy * r); g.lineTo(cx - dx * r - dy * r * .8, cy - dy * r + dx * r * .8); g.lineTo(cx - dx * r + dy * r * .8, cy - dy * r - dx * r * .8); g.closePath(); g.fill(); }
    else if (mt === 'fyrkjele') { g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fillStyle = '#d07a3a'; g.fill(); }
    // retningen (innmating -> utmating): en liten pil i enden
    if (lang > 18) { g.fillStyle = 'rgba(240,215,154,.85)'; g.strokeStyle = 'rgba(240,215,154,.85)'; g.lineWidth = 1.5; pil(g, cx + dx * lang * .2, cy + dy * lang * .2, cx + dx * lang * .42, cy + dy * lang * .42, Math.max(4, tvers * .18)); }
  }
  // plassene, lyset og flytpila (zoomet inn: under 0,35 m per punkt)
  if (typeof KROKER !== 'undefined') { KROKER.tegn.push((g, vx0, vy1) => {
    const l = L(); if (!l || typeof kam === 'undefined' || kam.m > .35) return; const Hh = hall(l); if (!Hh.size) return;
    const m = kam.m, sx = x => (x - vx0) / m, sy = y => (vy1 - y) / m, st = (window.ProduksjonSpill && ProduksjonSpill.status ? ProduksjonSpill.status() : {}) || {}, Mt = window.BaeringSpill;
    g.save(); g.lineWidth = 1.5; g.font = '11px sans-serif'; g.textAlign = 'center';
    for (const [id, I] of Hh) { const b = l.bygg.find(q => q.id === id); if (!b) continue; const P = FB.plasser(b), s = st[id];
      // flytpila: port inn -> sag -> (høvel) -> port ut
      if (I.flytPunkter && I.flyt !== 1) { const ok = I.flyt > 1; g.strokeStyle = ok ? 'rgba(120,205,110,.85)' : 'rgba(232,163,90,.85)'; g.fillStyle = g.strokeStyle; g.lineWidth = 2.2; g.setLineDash(ok ? [] : [6, 4]);
        const Q = I.flytPunkter; for (let k = 1; k < Q.length; k++) pil(g, sx(Q[k - 1].x), sy(Q[k - 1].y), sx(Q[k].x), sy(Q[k].y), 7); g.setLineDash([]);
        const t = ok ? `+${Math.round((I.flyt - 1) * 100)} % flyt` : `hulter til bulter −${Math.round((1 - I.flyt) * 100)} %`;
        // teksten midt på saga, på siden uten bruksplasser (venstre for flyten)
        const mx = sx((Q[1].x + Q[2].x) / 2), my = sy((Q[1].y + Q[2].y) / 2), vx = sx(Q[2].x) - sx(Q[1].x), vy = sy(Q[2].y) - sy(Q[1].y), vl = Math.hypot(vx, vy) || 1, ut = (LB.BYGG[b.type].maskinDel.b * U / 2) / m + 10;
        const tx = mx + vy / vl * ut, ty = my - vx / vl * ut; g.save(); g.textAlign = vy / vl > .3 ? 'left' : vy / vl < -.3 ? 'right' : 'center'; g.font = 'bold 12px sans-serif';
        g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(t, tx, ty + 4); g.fillText(t, tx, ty + 4); g.restore(); }
      // innmating og utmating: stiplede ruter; bruksplassene: oransje ringer
      g.setLineDash([3, 3]); g.strokeStyle = 'rgba(240,215,154,.8)'; g.lineWidth = 1.2; const r = U / 2 / m;
      // (med bæringen på tegner baering-visning.js feltene med mengdene – da ikke her)
      if (!(Mt && Mt.aktiv && Mt.aktiv())) for (const [p, t] of [[P.inn, 'inn'], [P.ut, 'ut']]) { if (!p || (t === 'inn' && FB.mtype(b.type) === 'høvel')) continue; g.strokeRect(sx(p.x) - r, sy(p.y) - r, 2 * r, 2 * r); if (r > 9) { g.fillStyle = 'rgba(240,215,154,.9)'; g.fillText(t, sx(p.x), sy(p.y) + 4); } }
      g.setLineDash([]);
      for (const p of P.bruks) { g.beginPath(); g.arc(sx(p.x), sy(p.y), Math.max(3, r * .7), 0, 6.283); g.strokeStyle = s && s.går ? '#f0a050' : 'rgba(240,160,80,.7)'; g.stroke(); }
      // grunnen når den ikke har full fart (mørkt, kaldt, uten tak)
      const F = sistF && sistF.del[id]; if (F && F.tekster.length && r > 6) { const t = F.tekster.filter(x => !/flyt|hulter/.test(x))[0]; if (t) { g.fillStyle = '#e8a35a'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, sx(b.x), sy(b.y) + 4 + 14); g.fillText(t, sx(b.x), sy(b.y) + 18); } } }
    // lysets rekkevidde når byggesettet er åpent
    if (window.Byggesett && Byggesett.tilstand && Byggesett.tilstand().åpen) for (const b of l.bygg) { const T = LB.BYGG[b.type]; if (!T || !T.lampe) continue; g.beginPath(); g.arc(sx(b.x), sy(b.y), T.lampe / m, 0, 6.283); g.fillStyle = 'rgba(241,210,122,.06)'; g.fill(); g.strokeStyle = 'rgba(241,210,122,.25)'; g.lineWidth = 1; g.stroke(); }
    g.restore(); });
    KROKER.tegn[KROKER.tegn.length - 1].bygg = true; }

  // ---------- 3D: enkle kasser ----------
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const F3 = { stål: hex('#646b70'), mørk: hex('#3a3e41'), blad: hex('#c9cfd2'), tre: hex('#9a7a52'), kjele: hex('#6d4a3d'), gul: hex('#e8c45a'), lampe: hex('#f4e6b0'), grønn: hex('#566048') };
  function bygg3d(Bg, d, T, z0, f, o) {
    const { boks, z3, gx, gy } = Bg, K = T.kat, z = z3(z0 + (d.n || 0) * BS.H), R = BS.ruter(d), i0 = Math.min(...R.map(c => c[0])), j0 = Math.min(...R.map(c => c[1]));
    const [w, h] = K === 'lampe' ? [1, 1] : BS.fotRuter(d), cx = gx + (i0 + w / 2) * U, cy = gy + (j0 + h / 2) * U, langsX = (d.r || 0) % 2 === 0, ux = langsX ? 1 : 0, uy = langsX ? 0 : 1, l = (langsX ? w : h) * U, b = (langsX ? h : w) * U;
    const s = Math.max(.15, f), mt = T.maskin;
    if (K === 'lampe') { boks('farge', F3.lampe, cx, cy, 1, 0, .25, .25, z + 2.75, z + 2.85); boks('farge', F3.mørk, cx, cy, 1, 0, .04, .04, z + 2.85, z + 3); return; }
    if (K === 'lager') { const hy = T.grunn === 'bs_hylle' ? 2.2 : .5; boks('farge', T.grunn === 'bs_hylle' ? F3.stål : F3.tre, cx, cy, ux, uy, l - .1, b - .15, z, z + hy * s);
      if (T.grunn === 'bs_hylle') for (const q of [.7, 1.45]) boks('farge', F3.tre, cx, cy, ux, uy, l - .2, b - .05, z + q * s, z + (q + .35) * s); return; }
    if (mt === 'sagbruk') { boks('farge', F3.stål, cx, cy, ux, uy, l - .3, 1.3, z, z + .85 * s); boks('farge', F3.mørk, cx, cy, ux, uy, 1.6, b - .4, z, z + 1.9 * s); boks('farge', F3.blad, cx, cy, ux, uy, 1.2, .05, z + .85, z + .85 + 1.1 * s);
      for (const q of [-.38, .38]) boks('farge', F3.gul, cx + ux * l * q, cy + uy * l * q, ux, uy, .4, 1.4, z + .85 * s, z + .95 * s); return; }
    if (mt === 'høvel') { boks('farge', F3.grønn, cx, cy, ux, uy, l - .4, b - .5, z, z + 1.1 * s); boks('farge', F3.mørk, cx, cy, ux, uy, 1.2, b - .3, z + 1.1 * s, z + 1.5 * s); return; }
    if (mt === 'vedkløyver') { boks('farge', F3.tre, cx, cy, ux, uy, l - .3, b - .6, z, z + .7 * s); boks('farge', F3.stål, cx, cy, ux, uy, .3, .3, z + .7 * s, z + 1.9 * s); return; }
    if (mt === 'fyrkjele') { boks('farge', F3.kjele, cx, cy, ux, uy, l - .5, b - .5, z, z + 2 * s); boks('farge', F3.mørk, cx + ux * l * .3, cy + uy * l * .3, ux, uy, .4, .4, z + 2 * s, z + 4 * s); return; }
    boks('farge', F3.stål, cx, cy, ux, uy, l - .2, b - .2, z, z + 1.2 * s);
  }

  // ---------- Leir-menyen (fanen Bygg): rommene med maskiner ----------
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el }) => {
    const l = L(); if (!l) return; const Hh = hall(l); if (!Hh.size) return;
    const R = BS.rom(BS.fraLeir(l, LB), l.romBruk), M = mangler();
    hode.append(el('h3', { 'data-fane': 'bygg' }, 'Fabrikk'));
    const rom = new Map(); for (const I of Hh.values()) { const k = I.rom || 'ute:' + I.id; if (!rom.has(k)) rom.set(k, []); rom.get(k).push(I); }
    for (const [k, liste] of rom) { const r = R.find(q => q.nøkkel === k), lamper = r ? r.lamper || [] : [];
      const kw = liste.reduce((s, I) => s - (LB.BYGG[I.type].kw || 0), 0) + lamper.reduce((s, id) => { const b = l.bygg.find(q => q.id === id); return s - (b ? LB.BYGG[b.type].kw || 0 : 0); }, 0);
      const uten = liste.filter(I => M.has(I.id)).length;
      const boks = el('div', { klasse: 'fabrikkrom' }, el('b', {}, (r ? r.navn : 'Ute') + (r ? ` (${nf(r.areal, 0)} m²)` : '')),
        el('small', {}, `Strøm: ${nf(kw)} kW (${liste.length} ${liste.length === 1 ? 'maskin' : 'maskiner'}, ${lamper.length} lys)` + (uten ? ` – ${uten} uten strøm` : '')));
      for (const I of liste) boks.append(el('small', {}, `${LB.BYGG[I.type].navn}: ${tekst(I.id)}`));
      hode.append(boks); }
  });
  const css = document.createElement('style');
  css.textContent = '#leirmeny .fabrikkrom{ margin:4px 0 6px; } #leirmeny .fabrikkrom small{ display:block; color:var(--ink-dim); font-size:12px; line-height:1.3; }';
  document.head.appendChild(css);

  window.FabrikkSpill = { hall, ctx, tekst, sjekkForslag, tegnDel, bygg3d, faktorer: () => sistF };
})();
