/* Riksbrudd – BYGGEVISNING i 2D (16. nov, brukeren: «gjør 2D-kameravisningen enda bedre når du bygger»).
 * Mens du plasserer et bygg, planlegger eller har byggesettet åpent i 2D-kartet:
 *  - kartet, lagene og navnene dempes (et mørkt slør), og byggene tegnes oppå – tegnerekkefølgen byttes i index.html (f.bygg = true
 *    på tegnekrokene som hører til byggingen);
 *  - rutenett fra leirens midte (2,5 m helt nær, ellers 10 m eller 50 m) og sirkelen for «fri reise» (Leir.REGLER.reise.fri);
 *  - skissen får mål på sidene, en pil på forsiden (døra), avstand til nærmeste nabo og til leiren, og gjerder får lengden;
 *  - bygg med rekkevidde (RING) viser sirkelen – også de som alt står, så du ser hva som er dekket;
 *  - kameraet går selv inn på leiren når du begynner å bygge og er zoomet for langt ut (eller leiren er utenfor bildet).
 * Reglene (ramme, rutesteg, tekster) ligger øverst uten DOM og testes i pipeline/fliser/test_byggevisning.js.
 */
(function (rot) {
  'use strict';
  // rekkevidde i meter og hva den betyr (tallene står i folk.js og leir.js; kameramasten bruker nivået sitt)
  const RING = { vakttårn: [150, 'vaktene dekker'], sykestue: [150, 'sårede leges'], sandsekkvoll: [15, 'dekning'], kameramast: [300, 'kamera'], radiomast: [15000, 'feltradio'] };
  // (17. nov, brukeren: «når en trykker på radiomasten, bør det gå an å se rekkevidden visuelt») radiomastens sirkel er så langt
  // feltradioene når: mastens nivå (15/25/40 km) når den virker og har strøm, ellers leirens radio uten mast (8 km).
  function radioRekkevidde(b) { const K = rot.Kontrollrom, uten = K ? K.LEIR.uten : 8000, s = rot.LeirSpill && LeirSpill.siste && LeirSpill.siste(), strøm = !(s && s.mangler && s.mangler.has(b.id));
    return LB.virker(b) && strøm && !b.av ? Math.max(uten, LB.effekt(b).rekkevidde || 0) : uten; }
  // rutenettets steg i meter etter målestokken (meter per punkt): 2,5 m helt nær, så 10 m og 50 m; ingen ruter langt ute
  const rutesteg = m => (m <= .18 ? 2.5 : m <= .7 ? 10 : m <= 3 ? 50 : 0);
  // Kameraet for bygging: rammen rundt leirens midte og byggene (+ luft), aldri nærmere enn KAMERA.nærmest og aldri lenger ute enn
  // KAMERA.lengst m per punkt. Gir null når kameraet alt er bra (høyst KAMERA.godNok m per punkt og leiren i bildet).
  // (runde 13, kritikk H: «når du velger et bygg, zoomer kartet til 20 m og grunnen blir uskarp og brun» – før 0,2–0,6 og 0,8)
  // Claudes forslag: 0,5–0,9 m per punkt (ca. 50–100 m-målestokk), og zoomen beholdes fra 1,2 m per punkt og nærmere
  const KAMERA = { nærmest: .5, lengst: .9, godNok: 1.2 };
  function ramme(kam, VW, VH, leir, bygg, luft = 45, friH = VH - 200) {
    let x0 = leir.x - luft, x1 = leir.x + luft, y0 = leir.y - luft, y1 = leir.y + luft;
    for (const b of bygg) { if (Math.hypot(b.x - leir.x, b.y - leir.y) > 400) continue; x0 = Math.min(x0, b.x - luft); x1 = Math.max(x1, b.x + luft); y0 = Math.min(y0, b.y - luft); y1 = Math.max(y1, b.y + luft); }
    const iBildet = Math.abs(leir.x - kam.x) < VW * kam.m / 2 && Math.abs(leir.y - kam.y) < VH * kam.m / 2;
    if (iBildet && kam.m <= KAMERA.godNok) return null;
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, m: Math.max(KAMERA.nærmest, Math.min(KAMERA.lengst, Math.max((x1 - x0) / VW, (y1 - y0) / Math.max(120, friH)))) };
  }
  const tall = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const meter = v => (v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + ' km' : v >= 100 ? Math.round(v) + ' m' : String(Math.round(v * 10) / 10).replace('.', ',') + ' m');
  const lengde = P => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; };
  const api = { RING, KAMERA, rutesteg, ramme, meter, lengde };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- visningen ----------
  const LB = rot.Leir; let forrige = false, anim = null;
  const bsÅpen = () => !!(rot.Byggesett && Byggesett.tilstand && Byggesett.tilstand().åpen);
  const på = () => typeof på3d !== 'undefined' && !på3d && !!rot.LeirSpill && !!LeirSpill.tilstand() && (!!LeirSpill.plassering() || !!LeirSpill.planModus() || bsÅpen());
  const leir = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  // kameraet glir inn på leiren (0,45 s); et trykk eller rullehjulet avbryter
  function gåInn() { const S = leir(), L = LeirSpill.tilstand(); if (!S) return false; // det frie feltet: mellom knappene øverst og banneret nederst (banneret vokser når skissen er satt – regn med en tredel på telefon)
    const F = fri(), y1 = Math.min(F.y1, VH * (document.body.classList.contains('kort') ? .62 : .8)), mål = ramme(kam, VW, VH, S, L.bygg.filter(b => b.x !== undefined), 30, y1 - F.y0); if (!mål) return false;
    mål.y += ((F.y0 + y1) / 2 - VH / 2) * mål.m;
    const fra = { x: kam.x, y: kam.y, m: kam.m }, t0 = performance.now(); anim = { mål };
    const steg = () => { if (!anim || anim.mål !== mål) return; const a = Math.min(1, (performance.now() - t0) / 450), e = 1 - Math.pow(1 - a, 3);
      kam.x = fra.x + (mål.x - fra.x) * e; kam.y = fra.y + (mål.y - fra.y) * e; kam.m = Math.exp(Math.log(fra.m) + (Math.log(mål.m) - Math.log(fra.m)) * e); skitten = true;
      if (a < 1) requestAnimationFrame(steg); else anim = null; };
    requestAnimationFrame(steg); return true; }
  // SKISSEN SKAL SYNES: ligger den under banneret nederst (telefon) eller utenfor bildet, flyttes kartet så den står i det frie feltet
  function fri() { const b = [document.getElementById('byggvalg'), document.getElementById('byggesett')].find(q => q && q.offsetHeight), r = b ? b.getBoundingClientRect() : null, topp = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topp')) || 58) + 50;
    return { y0: topp, y1: r && r.top > topp + 80 ? r.top - 30 : VH - 40, x0: 30, x1: VW - 30 }; }
  function skissepunkt() { const p = LeirSpill.plassering(); if (p) return p.mal || p.svever || p.x === null || p.x === undefined ? null : p;
    // byggesettet: midten av forslaget (delene som er pekt ut, men ikke bestilt)
    if (!bsÅpen() || !rot.ByggesettRegler) return null; const F = Byggesett.forslag(), o = LeirSpill.tilstand().byggesett; if (!F || !F.length || !o) return null;
    let x = 0, y = 0, n = 0; for (const f of F) { if (!f.d) continue; const q = ByggesettRegler.midt(o, f.d); if (q.x === q.x && q.y === q.y) { x += q.x; y += q.y; n++; } } return n ? { x: x / n, y: y / n } : null; }
  function visSkisse() { const p = skissepunkt(); if (!p || anim || !(p.x === p.x && p.y === p.y)) return false;
    const F = fri(), x = (p.x - (kam.x - VW * kam.m / 2)) / kam.m, y = ((kam.y + VH * kam.m / 2) - p.y) / kam.m; if (x >= F.x0 && x <= F.x1 && y >= F.y0 && y <= F.y1) return false;
    const tx = Math.max(F.x0 + 40, Math.min(F.x1 - 40, x)), ty = Math.max(F.y0 + 40, Math.min(F.y1 - 40, y)), mål = { x: kam.x + (x - tx) * kam.m, y: kam.y - (y - ty) * kam.m, m: kam.m };
    const fra = { x: kam.x, y: kam.y }, t0 = performance.now(); anim = { mål };
    const steg = () => { if (!anim || anim.mål !== mål) return; const a = Math.min(1, (performance.now() - t0) / 300), e = 1 - Math.pow(1 - a, 3); kam.x = fra.x + (mål.x - fra.x) * e; kam.y = fra.y + (mål.y - fra.y) * e; skitten = true; if (a < 1) requestAnimationFrame(steg); else anim = null; };
    requestAnimationFrame(steg); return true; }
  let pekerNede = false;
  for (const h of ['pointerdown', 'wheel', 'touchstart']) window.addEventListener(h, () => { anim = null; if (h !== 'wheel') pekerNede = true; }, { passive: true, capture: true });
  for (const h of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) window.addEventListener(h, () => { pekerNede = false; }, { passive: true, capture: true });
  // på små skjermer tar loggen og banneret mye plass: loggen skjules mens du bygger, og knappene i banneret er mindre
  { const css = document.createElement('style'); css.textContent = 'body.bygger2d.kort #logg{ display:none; } body.bygger2d.kort #byggvalg button{ padding:5px 9px; font-size:14px; min-height:36px; }'; document.head.appendChild(css); }
  // Overgangen til bygging. I de automatiske testene flyttes ikke kameraet av seg selv; vakten slår det på med test-bryteren.
  setInterval(() => { const nå = på(); if (nå !== forrige) { forrige = nå; document.body.classList.toggle('bygger2d', nå); skitten = true; if (nå && (!navigator.webdriver || api.test)) gåInn(); }
    if (nå && !pekerNede && (!navigator.webdriver || api.test)) visSkisse(); }, 150);

  // MED MUS: skissen følger pekeren til første trykk setter den fast (da ser du omrisset og om plassen er lovlig før du trykker).
  // Bare vanlige bygg (ikke gjerder og maler), ikke mens du drar kartet, og høyst ti ganger i sekundet.
  { const cv = document.getElementById('c'); let sist = 0, venter = false;
    if (cv) cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || e.buttons || !på()) return; const p = LeirSpill.plassering(); if (!p || p.mal || LB.BYGG[p.type].linje) return;
      if (p.x !== null && p.x !== undefined && !p.svever) return; const nå = performance.now(); if (venter || nå - sist < 100) return; sist = nå;
      const r = cv.getBoundingClientRect(), X = kam.x + (e.clientX - r.left - VW / 2) * kam.m, Y = kam.y - (e.clientY - r.top - VH / 2) * kam.m;
      p.rx = p.x = X; p.ry = p.y = Y; p.svever = true; venter = true; Promise.resolve(LeirSpill.prøv()).catch(() => {}).then(() => { venter = false; }); }); }
  // TASTER (etter mønster fra spill med gode byggesystemer): piltastene dytter skissen ett rutesteg (Shift: en halv meter),
  // Shift+Enter bygger og fortsetter med samme bygg, og Q på et valgt bygg plukker det opp: samme type og retning som ny skisse.
  window.addEventListener('keydown', e => {
    if (typeof på3d === 'undefined' || på3d || !rot.LeirSpill || !LeirSpill.tilstand() || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.ctrlKey || e.metaKey || e.altKey) return;
    const p = LeirSpill.plassering(), k = e.key, PIL = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (p && PIL[k] && !p.mal && !LB.BYGG[p.type].linje && p.x !== null && p.x !== undefined) { const d = e.shiftKey ? .5 : 2.5;
      p.rx = (p.svever || p.rx === undefined ? p.x : p.rx) + PIL[k][0] * d; p.ry = (p.svever || p.ry === undefined ? p.y : p.ry) + PIL[k][1] * d; p.x = p.rx; p.y = p.ry; p.svever = false; LeirSpill.prøv(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (p && k === 'Enter' && e.shiftKey) { const f = LeirSpill.fortsett(); LeirSpill.fortsett(true); Promise.resolve(LeirSpill.bekreft()).catch(() => {}).then(() => LeirSpill.fortsett(f)); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (!p && (k === 'q' || k === 'Q')) { const id = LeirSpill.valgt(), b = id && LeirSpill.tilstand().bygg.find(q => q.id === id), B = b && LB.BYGG[b.type]; if (!b || B.linje || B.del) return;
      LeirSpill.startPlassering(b.type, null, { ret: b.ret || 0 }); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // Et valgt bygg med rekkevidde viser sirkelen sin også utenom byggingen
  KROKER.tegn.push((g, vx0, vy1) => { if (på() || !rot.LeirSpill || !LeirSpill.tilstand()) return; const id = LeirSpill.valgt(), b = id && LeirSpill.tilstand().bygg.find(q => q.id === id); if (!b || !RING[b.type]) return;
    const radio = b.type === 'radiomast', m = kam.m, r = radio ? radioRekkevidde(b) : (b.type === 'kameramast' ? LB.effekt(b).rekkevidde || RING[b.type][0] : RING[b.type][0]), x = (b.x - vx0) / m, y = (vy1 - b.y) / m, rp = r / m; if (rp < 8 || (!radio && rp > 4000)) return;
    if (radio) { g.save(); const K = rot.Kontrollrom, hånd = K ? K.RADIO.hånd.meter : 3000, full = r > (K ? K.LEIR.uten : 8000), farge = full ? '127,209,122' : '232,164,106', inne = Math.hypot(VW / 2 - x, VH / 2 - y) + Math.hypot(VW, VH) / 2 < rp;
      // sirkelen er større enn skjermen når du står inne i leiren: da tegnes den ikke (knappen «Vis rekkevidden» i byggpanelet zoomer ut)
      if (!inne) { g.beginPath(); g.arc(x, y, rp, 0, 6.283); g.fillStyle = `rgba(${farge},.06)`; g.fill(); g.strokeStyle = `rgba(${farge},.9)`; g.lineWidth = 2; g.stroke(); skrift(g, `feltradio ${meter(r)}` + (full ? '' : ' (masten virker ikke)'), x, Math.max(120, y - rp), full ? '#bfe6b4' : '#f0c8a0'); }
      const hp = hånd / m; if (hp > 8 && hp < 6000) { g.beginPath(); g.arc(x, y, hp, 0, 6.283); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(231,220,195,.7)'; g.lineWidth = 1.2; g.stroke(); g.setLineDash([]); if (hp > 40 && y - hp > 100) skrift(g, `håndradio ${meter(hånd)}`, x, y - hp); }
      g.restore(); return; }
    g.save(); g.beginPath(); g.arc(x, y, rp, 0, 6.283); g.fillStyle = 'rgba(127,209,122,.07)'; g.fill(); g.strokeStyle = 'rgba(127,209,122,.8)'; g.lineWidth = 1.4; g.stroke(); if (rp > 40) skrift(g, `${RING[b.type][1]} ${meter(r)}`, x, y - rp, '#bfe6b4'); g.restore(); });

  let førRadio = null;
  // «Vis rekkevidden»: zoom ut så hele sirkelen synes rundt masten; samme knapp går tilbake dit du var
  function visRekkevidde(b) { if (førRadio) { kam.x = førRadio.x; kam.y = førRadio.y; kam.m = førRadio.m; førRadio = null; skitten = true; return false; }
    førRadio = { x: kam.x, y: kam.y, m: kam.m }; const r = radioRekkevidde(b); kam.x = b.x; kam.y = b.y; kam.m = r * 2.35 / Math.max(200, Math.min(VW, VH - 160)); skitten = true; return true; }
  const skrift = (g, t, x, y, farge = '#f0e2b0') => { g.font = '600 12.5px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const w = g.measureText(t).width + 8;
    g.fillStyle = 'rgba(16,14,10,.82)'; g.fillRect(x - w / 2, y - 8, w, 16); g.fillStyle = farge; if (rot.Etikett) Etikett.skrivTekst(g, t, x, y + .5, true); else g.fillText(t, x, y + .5); g.textBaseline = 'alphabetic'; };

  // UNDER byggene: sløret, rutenettet og sirkelen for fri reise
  function under(g, vx0, vy1) {
    const m = kam.m, S = leir(), sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m;
    g.save(); g.fillStyle = 'rgba(12,16,20,.42)'; g.fillRect(0, 0, VW, VH);
    // byggesettet har sitt eget rutenett (2,4 m fra L.byggesett): da vises det, så rutene stemmer med veggene
    const bs = bsÅpen() && LeirSpill.tilstand().byggesett, O = bs ? { x: bs.ox, y: bs.oy } : S, steg = rutesteg(m) * (bs ? .96 : 1);
    if (O && steg) { const gx0 = vx0, gx1 = vx0 + VW * m, gy1 = vy1, gy0 = vy1 - VH * m, i0 = Math.ceil((gx0 - O.x) / steg), i1 = Math.floor((gx1 - O.x) / steg), j0 = Math.ceil((gy0 - O.y) / steg), j1 = Math.floor((gy1 - O.y) / steg);
      if (i1 - i0 < 400 && j1 - j0 < 400) { g.lineWidth = 1;
        for (const sterk of [false, true]) { g.strokeStyle = sterk ? 'rgba(240,226,176,.15)' : 'rgba(240,226,176,.055)'; g.beginPath();
          for (let i = i0; i <= i1; i++) if ((i % 5 === 0) === sterk) { const x = Math.round(sx(O.x + i * steg)) + .5; g.moveTo(x, 0); g.lineTo(x, VH); }
          for (let j = j0; j <= j1; j++) if ((j % 5 === 0) === sterk) { const y = Math.round(sy(O.y + j * steg)) + .5; g.moveTo(0, y); g.lineTo(VW, y); }
          g.stroke(); } } }
    if (S && LB.REGLER && LB.REGLER.reise) { const r = LB.REGLER.reise.fri / m, x = sx(S.x), y = sy(S.y);
      if (r > 30 && r < 6000 && x > -r && y > -r && x < VW + r && y < VH + r) { g.strokeStyle = 'rgba(240,215,154,.4)'; g.lineWidth = 1.2; g.setLineDash([8, 6]); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.stroke(); g.setLineDash([]);
        const ty = y - r; if (ty > 60 && ty < VH - 20) skrift(g, `uten reisetid innen ${LB.REGLER.reise.fri} m`, x, ty, 'rgba(240,215,154,.85)'); } }
    g.restore();
  }

  // OPPÅ byggene: rekkevidder, mål, forside, avstander
  function over(g, vx0, vy1) {
    const m = kam.m, L = LeirSpill.tilstand(), p = LeirSpill.plassering(), S = leir(), sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m; if (!L) return;
    g.save();
    const ring = (b, sterk) => { const R0 = RING[b.type]; if (!R0) return; let r = R0[0]; if (b.type === 'kameramast' && b.id !== undefined) r = LB.effekt(b).rekkevidde || r; const x = sx(b.x), y = sy(b.y), rp = r / m; if (rp < 6 || x < -rp || y < -rp || x > VW + rp || y > VH + rp) return;
      g.beginPath(); g.arc(x, y, rp, 0, 6.283); g.fillStyle = sterk ? 'rgba(127,209,122,.10)' : 'rgba(127,209,122,.05)'; g.fill(); g.strokeStyle = sterk ? 'rgba(127,209,122,.85)' : 'rgba(127,209,122,.4)'; g.lineWidth = sterk ? 1.6 : 1; g.setLineDash(sterk ? [] : [4, 4]); g.stroke(); g.setLineDash([]);
      if (sterk && rp > 40) skrift(g, `${R0[1]} ${meter(r)}`, x, y - rp, '#bfe6b4'); };
    // nøkkeltall under navnet på hvert bygg når du er nær nok: strøm, senger, lager, diesel – og rødt når bygget står uten strøm
    if (m < .45) { const uten = LeirSpill.siste() && LeirSpill.siste().mangler; g.font = '600 12px "Cormorant Garamond", serif'; g.textAlign = 'center';
      // (runde 7) tallene går under navnene som alt står (Etikett.tegnet) og under hverandre, ikke oppå dem
      const opptatt = window.Etikett && Etikett.tegnet ? Etikett.tegnet().map(n => n.ramme) : [], over2 = (r, q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3];
      for (const b of L.bygg) { const B = LB.BYGG[b.type]; if (B.linje || B.del || !LB.ferdig(b)) continue; const x = sx(b.x), y = sy(b.y); if (x < 0 || y < 0 || x > VW || y > VH) continue;
        const e = LB.effekt(b), d = []; if (uten && uten.has(b.id)) d.push('uten strøm'); else if (e.kw > 0) d.push('+' + tall(e.kw) + ' kW'); else if (e.kw < 0) d.push('−' + tall(-e.kw) + ' kW');
        if (e.plasser) d.push(e.plasser + ' senger'); if (e.lager) d.push('lager ' + e.lager); if (e.liter) d.push(tall(e.liter) + ' l'); if (!d.length) continue;
        // RUNDE 6 (kritikken: «Brakke −1 kW · 8 senger» lå oppå bygget og så ut som en feil): tallene står under byggets omriss, ikke oppå taket
        let yb = y + 18; try { const H = LB.hjørner(b); if (H && H.length) yb = Math.max(...H.map(q => sy(q[1]))) + 13; } catch (e) { yb = y + 18; }
        const t = d.join(' · '), tw = g.measureText(t).width + 4; for (let k = 0; k < 3; k++) { const r = [x - tw / 2, yb - 10, tw, 13]; if (!opptatt.some(q => q && over2(r, q))) break; yb += 13; }
        opptatt.push([x - tw / 2, yb - 10, tw, 13]); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.fillStyle = uten && uten.has(b.id) ? '#f0a090' : '#d8cfae'; if (rot.Etikett) { Etikett.skrivTekst(g, t, x, yb, false); Etikett.skrivTekst(g, t, x, yb, true); } else { g.strokeText(t, x, yb); g.fillText(t, x, yb); } } }
    const type = p && !p.mal ? p.type : null;
    if (type && RING[type]) for (const b of L.bygg) if (b.type === type && b.id !== p.flytt) ring(b, false);
    if (p && !p.mal) { const B = LB.BYGG[p.type];
      if (B.linje) { const P = p.punkter || []; if (P.length > 1) { const q = P[P.length - 1]; skrift(g, `${B.navn.toLowerCase()} ${meter(lengde(p.lukket ? [...P, P[0]] : P))}`, sx(q[0]), sy(q[1]) - 16); } }
      else if (p.x !== null && p.x !== undefined) { const b = { type: p.type, x: p.x, y: p.y, ret: p.ret || 0 }, H = LB.hjørner(b).map(([x, y]) => [sx(x), sy(y)]), c = Math.cos(b.ret), s = Math.sin(b.ret), [x0, x1, y0, y1] = B.fot;
        ring(b, true);
        // mål på to sider (utenfor skissen), når bygget er stort nok på skjermen
        if ((x1 - x0) / m > 26 || (y1 - y0) / m > 26) { const mx = sx(p.x), my = sy(p.y), ut = (a, q, t) => { const ex = (a[0] + q[0]) / 2, ey = (a[1] + q[1]) / 2, d = Math.hypot(ex - mx, ey - my) || 1; skrift(g, t, ex + (ex - mx) / d * 14, ey + (ey - my) / d * 14); };
          ut(H[0], H[1], meter(x1 - x0)); ut(H[3], H[0], meter(y1 - y0)); }
        // forsiden (+x i modellen, der døra er): en liten pil ut fra veggen
        { const fx = p.x + c * x1, fy = p.y + s * x1, ax = sx(fx), ay = sy(fy), ux = c, uy = -s, l = Math.max(10, Math.min(22, 3 / m));
          g.strokeStyle = g.fillStyle = '#f0d79a'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + ux * l, ay + uy * l); g.stroke();
          g.beginPath(); g.moveTo(ax + ux * (l + 6), ay + uy * (l + 6)); g.lineTo(ax + ux * l - uy * 4.5, ay + uy * l + ux * 4.5); g.lineTo(ax + ux * l + uy * 4.5, ay + uy * l - ux * 4.5); g.closePath(); g.fill(); }
        // avstand til nærmeste nabo: stiplet strek mellom midtpunktene med avstanden mellom veggene
        if (p.nabo && p.avstand !== null && p.avstand !== undefined && p.nabo.x !== undefined) { const nx = sx(p.nabo.x), ny = sy(p.nabo.y), mx = sx(p.x), my = sy(p.y);
          g.strokeStyle = 'rgba(240,215,154,.7)'; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(mx, my); g.lineTo(nx, ny); g.stroke(); g.setLineDash([]);
          if (Math.hypot(nx - mx, ny - my) > 50) skrift(g, meter(p.avstand), (mx + nx) / 2, (my + ny) / 2); }
        // hvorfor plassen ikke går, står ved skissen (rødt alene forklarer ingenting)
        if (p.feil && p.feil !== 'Sjekker kartet …') skrift(g, p.feil, sx(p.x), Math.min(...H.map(h => h[1])) - 16, '#f0a090');
        // langt fra leiren: avstanden (byggelaget må reise)
        if (S) { const d = Math.hypot(p.x - S.x, p.y - S.y); if (LB.REGLER && d > LB.REGLER.reise.fri) skrift(g, `${meter(d)} fra leiren`, sx(p.x), Math.max(...H.map(h => h[1])) + 16, '#e8c27a'); } } }
    g.restore();
  }
  api.på = på; api.under = under; api.over = over; api.gåInn = gåInn; api.visSkisse = visSkisse; api.fri = fri; api.anim = () => !!anim; api.visRekkevidde = visRekkevidde; api.radioRekkevidde = radioRekkevidde; api.radioZoom = () => !!førRadio;
  rot.BYGGEVISNING = api;
})(typeof window !== 'undefined' ? window : globalThis);
