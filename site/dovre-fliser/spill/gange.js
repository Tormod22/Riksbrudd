'use strict';
// Førsteperson i 3D: «Gå» (knapp øverst, bare i 3D) setter deg på bakken i øyehøyde der kameraet så, eller ved det valgte laget.
// Bevegelsen (spill/bevegelse.js, brukeren 11. nov: «bedre movement-system»): myk akselerasjon, løping med utholdenhet, huk, hopp,
// tregere i motbakke, stopp i bratte skråninger og ved vann, kroppen glir langs vegger og trær, og hodet gynger i takt med skrittene.
// PC: W/A/S/D eller piltastene, Shift løper, mellomrom hopper, C eller Ctrl går på huk. Klikk i bildet låser musa (se rundt uten å
// holde knappen inne); Esc slipper musa, Esc igjen (eller «Gå») flyr opp. Mobil: styrespak nede til venstre (helt ut = løp),
// dra ellers for å se rundt, knappene «Hopp» og «Huk» nede til høyre.
// Kroker i index.html: kamera3d() spør Gange.kamera når R3.fot er satt, og styringen i 3D sender pekerne hit først (Gange.peker).
(function () {
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);   // R3 er en let i index.html, ikke window.R3
  const taster = new Set(); let sist = 0, spak = null, se = null, lagret = null, kropp = null, hoppVent = false, mobilHuk = false, fov = 50, kroppU = null, hoppHoldt = false, hukHoldt = false, fører = null, ligger = false, vedKar = null;
  const knapp = document.createElement('button'); knapp.id = 'gaaknapp'; knapp.textContent = 'Gå'; knapp.title = 'Gå selv i førsteperson'; knapp.hidden = true;
  document.querySelector('.knapper').insertBefore(knapp, document.getElementById('meny'));
  setInterval(() => { knapp.hidden = !(typeof på3d !== 'undefined' && på3d); if (knapp.hidden && r3() && R3.fot) stopp(); if (knapp.hidden && valgÅpen() && !reise) lukkValg(); venteSteg(); dørKnapp(); kortVarsel(); pekerSteg(); innSteg(); }, 250);
  // (i testene – webdriver – starter knappen som før uten å spørre, utenom med Gange.test = true; sjekk.js trykker på «Gå»)
  knapp.onclick = () => (r3() && R3.fot ? stopp() : valgÅpen() ? lukkValg() : navigator.webdriver && window.Gange.test !== true ? start() : startValg());
  // knappene for hopp og huk på smale skjermer, valget «Hvor vil du gå?», døra og kortvarselet
  // (runde 8, kritikken: «angrepsbanneret dekker en tredjedel av bildet i førsteperson på telefon») – mens du går er banneret én linje:
  // hva som kommer og fra hvor, og «Forsvar leiren»; avstanden står bare på PC (kuttes med … når den er lang), «Vis» er borte.
  const css = document.createElement('style');
  css.textContent = `#gangeknapper{ position:fixed; right:70px; bottom:calc(40px + env(safe-area-inset-bottom,0px)); z-index:5; display:none; gap:10px; }
#gangeknapper.på{ display:flex; } #gangeknapper button{ width:64px; height:64px; border-radius:50%; border:2px solid rgba(231,220,195,.6); background:rgba(20,16,10,.55); color:#e7dcc3; font:600 15px sans-serif; touch-action:none; }
#gangeknapper button.på{ background:rgba(231,220,195,.35); }
#gaavalg{ position:fixed; left:50%; bottom:calc(118px + env(safe-area-inset-bottom,0px)); transform:translateX(-50%); z-index:14; display:none; width:min(380px,92vw); padding:14px 16px 12px; background:rgba(28,23,15,.96);
  border:1px solid #c9b26a; color:#e7dcc3; box-shadow:0 8px 30px rgba(0,0,0,.5); font-size:15px; }
#gaavalg.på{ display:block; } #gaavalg h3{ margin:0 0 4px; font-size:17px; color:#f0d79a; } #gaavalg p{ margin:0 0 8px; line-height:1.35; color:#d8ccb0; }
#gaavalg button{ display:block; width:100%; margin-top:7px; min-height:44px; padding:6px 10px; background:#2a2318; border:1px solid #6b5a36; color:#f0e2b0; font:inherit; font-size:15px; text-align:left; cursor:pointer; }
#gaavalg button.hoved{ border-color:#c9b26a; background:#3a2f1c; } #gaavalg button small{ display:block; color:#b9ab8a; font-size:12.5px; } #gaavalg .gang{ height:5px; background:rgba(231,220,195,.15); margin:8px 0 2px; }
#gaavalg .gang i{ display:block; height:100%; width:0; background:#c9b26a; }
#dorknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(204px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:150px; min-height:44px; padding:6px 18px;
  background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; touch-action:manipulation; }
#dorknapp.på{ display:block; } body.kort #dorknapp{ left:auto; right:8px; transform:none; bottom:calc(262px + env(safe-area-inset-bottom,0px)); min-width:0; padding:6px 14px; font-size:15px; }
#gaakort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 78px); z-index:12; display:none; max-width:min(420px,88vw); padding:5px 14px; background:rgba(28,23,15,.9);
  border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:14px; cursor:pointer; text-align:center; }
#gaakort.på{ display:block; } #gaakort small{ color:#b9ab8a; } body.kort #gaakort{ left:8px; transform:none; top:calc(var(--topp,58px) + 172px); max-width:56vw; font-size:13px; text-align:left; } body.foto #gaavalg, body.foto #dorknapp, body.foto #gaakort{ display:none !important; }
html body.gaar #alarm.på{ flex-wrap:nowrap; gap:8px; padding:3px 4px 3px 10px; font-size:13px; max-width:min(620px, calc(100vw - 16px)); }
html body.gaar #alarm > span:first-child{ flex:0 1 auto; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
html body.gaar #alarm > small, html body.gaar #alarm button.rolig:not(#opphevknapp){ display:none; }
html body.gaar #alarm button{ min-height:30px; padding:0 10px; font-size:13px; flex:none; }
html body.gaar.kort #alarm > span:first-child small{ display:none; } html body.gaar.kort #alarm.på{ top:calc(var(--topp,58px) + 56px); }
#gaavalg .gang.spol i{ transition:width .25s linear; }`;
  document.head.appendChild(css);
  const mk = document.createElement('div'); mk.id = 'gangeknapper'; const hb = document.createElement('button'), kb = document.createElement('button');
  hb.textContent = 'Hopp'; kb.textContent = 'Huk'; mk.append(kb, hb); document.body.appendChild(mk);
  hb.addEventListener('pointerdown', e => { e.preventDefault(); hoppVent = true; hoppHoldt = true; });
  kb.addEventListener('pointerdown', e => { e.preventDefault(); hukHoldt = true; if (fører) return; if (ligger) { ligger = false; mobilHuk = false; } else if (mobilHuk) { ligger = true; mobilHuk = false; } else mobilHuk = true; stillingKnapp(); });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave']) { hb.addEventListener(t, () => { hoppHoldt = false; }); kb.addEventListener(t, () => { hukHoldt = false; }); }
  const valgEl = document.createElement('div'); valgEl.id = 'gaavalg'; valgEl.setAttribute('role', 'dialog'); valgEl.setAttribute('aria-label', 'Hvor vil du gå?');
  const dørEl = document.createElement('button'); dørEl.id = 'dorknapp'; dørEl.type = 'button';
  const kortEl = document.createElement('button'); kortEl.id = 'gaakort'; kortEl.type = 'button'; document.body.append(valgEl, dørEl, kortEl);

  // Knappen nede til høyre viser det neste trykket gir: Huk -> Ligg -> Reis deg (natt til 18. nov: ny stilling «ligg» under huk)
  function stillingKnapp() { if (fører) return; kb.textContent = ligger ? 'Reis deg' : mobilHuk ? 'Ligg' : 'Huk'; kb.classList.toggle('på', mobilHuk || ligger); }
  function settLigg(v) { ligger = !!v; if (ligger) mobilHuk = false; stillingKnapp(); return ligger; }
  function start() {
    if (!r3() || !R3.ut) return;
    const b = R3.bane; lagret = { avst: b.avst, pitch: b.pitch, x: b.x, y: b.y };
    // (18. nov kveld, fra en gjennomspilling: «Gå» satte deg der kameraet tilfeldigvis så – det så ut som du teleporterte.) Nå: ved
    // siden av et valgt lag som før, ellers der karakteren din står (og karakteren følger deg mens du går), ellers der kameraet ser.
    const iU = p => !!p && Math.abs(p.x - R3.ut.cx) < R3.ut.S * .95 && Math.abs(p.y - R3.ut.cy) < R3.ut.S * .95;
    const kar = typeof ENHETER !== 'undefined' ? ENHETER.find(e => e.karakter && (typeof levende !== 'function' || levende(e))) : null; vedKar = null;
    if (valgt && !valgt.karakter && iU(valgt)) { b.x = valgt.x - R3.ut.cx + 3; b.y = valgt.y - R3.ut.cy - 3; }   // ved siden av laget
    else if (kar && iU(kar)) { b.x = kar.x - R3.ut.cx; b.y = kar.y - R3.ut.cy; vedKar = kar; kar.sti = null; }
    R3.fot = { a: b.yaw, pitch: -.05 }; b.avst = 1000;   // utsnittet rundt deg: ca. 3,4 km, skarpt kart nær
    const u = R3.ut; ledig(u, b); R3.fot.a = åpenRetning(b.x, b.y, R3.fot.a);
    kropp = Bevegelse.ny(b.x, b.y, hoyde3d(u.cx + b.x, u.cy + b.y) - u.h0);
    knapp.classList.add('på'); sist = performance.now(); mobilHuk = false; ligger = false; stillingKnapp(); mk.classList.toggle('på', VW < 900);
    if (!reise) lukkValg(); kortTilbake(); dørHjelp = null;
    logg(VW < 900 ? 'Du går selv: styrespaken nede til venstre (helt ut = løp), dra ellers for å se rundt, «Hopp» og «Huk» nede til høyre. «Gå» flyr opp.'
      : 'Du går selv: W/A/S/D, Shift løper, mellomrom hopper, C på huk, Z legger deg ned. Klikk i bildet for å styre med musa; Esc slipper musa, Esc igjen flyr opp.');
  }
  // Start med blikket mot åpent lende (15. nov: i Bergen startet «Gå» med nesa en meter fra en husvegg). Kursen er a, og du ser mot
  // (−sin a, cos a). Den retningen nærmest den du hadde som har minst 12 m fri sikt (ingen vegg eller stamme); ellers den med lengst fri sikt.
  function åpenRetning(x, y, a) {
    if (typeof hindring3d !== 'function') return a;
    const fri = v => { for (let d = 1; d <= 25; d += 1) if (hindring3d(x - Math.sin(v) * d, y + Math.cos(v) * d)) return d - 1; return 25; };
    let best = a, lengst = -1;
    for (let k = 0; k <= 8; k++) for (const s of k && k < 8 ? [1, -1] : [1]) { const v = a + s * k * Math.PI / 8, f = fri(v); if (f >= 12) return v; if (f > lengst) { lengst = f; best = v; } }
    return best;
  }
  // Start aldri inne i (eller tett inntil) et hus, et tre eller i vann: let utover i en spiral (høyst 60 m) til et sted der kroppen får plass
  function ledig(u, b) {
    const vann = vannVed(u), fri = (x, y) => !vann(x, y) && !(u.iElv && u.iElv(x, y)) && ![[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1]].some(([dx, dy]) => typeof hindring3d === 'function' && hindring3d(x + dx, y + dy));
    if (fri(b.x, b.y)) return;
    for (let r = 1; r <= 60; r++) for (let k = 0; k < 8 + r * 2; k++) { const v = k / (8 + r * 2) * 6.283, x = b.x + Math.cos(v) * r, y = b.y + Math.sin(v) * r; if (fri(x, y)) { b.x = x; b.y = y; return; } }
  }
  function stopp() {
    if (!r3() || !R3.fot) return; const b = R3.bane;
    if (fører && fører.ut) fører.ut();
    R3.fot = null; kropp = null; kroppU = null; vedKar = null; dørHjelp = null; dørEl.classList.remove('på'); kortEl.classList.remove('på');
    // fjellmarka rundt deg (spill/fjellmark3d.js) frigjøres straks du flyr opp
    if (window.Fjellmark && Fjellmark.bort && !(R3.bane && R3.bane.avst < 110)) Fjellmark.bort();
    // et kort som ventet mens du gikk, kommer nå
    if (kortVenter()) setTimeout(() => { if (!(r3() && R3.fot) && kortVenter()) Kortkø.nå(); }, 700);
    if (lagret) { b.avst = lagret.avst; b.pitch = lagret.pitch; } knapp.classList.remove('på'); spak = se = null; taster.clear(); mk.classList.remove('på');
    if (document.pointerLockElement) document.exitPointerLock();
    fov = 50; R3.cam.fov = 50; R3.cam.updateProjectionMatrix();
  }
  // ---------- «GÅ HIT» / «REIS HIT» (runde 6, 19. nov, kritikken) ----------
  // Kameraet ser langt fra karakteren din: velg mellom å reise dit (karakteren går dit, og spilltiden går så lenge turen tar) og å
  // gå der karakteren står. Regler og tall: spill/gaavalg.js. Gange.start() (testene) starter som før uten å spørre.
  const karakter = () => (typeof ENHETER !== 'undefined' ? ENHETER.find(e => e.karakter && (typeof levende !== 'function' || levende(e))) : null);
  const iUt = p => !!p && r3() && R3.ut && Math.abs(p.x - R3.ut.cx) < R3.ut.S * .95 && Math.abs(p.y - R3.ut.cy) < R3.ut.S * .95;
  let reise = null, venterKart = null;
  const valgÅpen = () => valgEl.classList.contains('på');
  // (runde 8) lukkes kortet mens kartet rundt deg bygges (Avbryt, Esc, «Gå» en gang til), går du ikke – og 3D tegnes igjen
  function lukkValg() { if (reise) return; valgEl.classList.remove('på'); valgEl.replaceChildren(); venterKart = null; if (venterUt) { venterUt = null; overlegg(true); } }
  function kn(tekst, liten, fn, hoved) { const b = document.createElement('button'); b.type = 'button'; if (hoved) b.className = 'hoved'; b.append(tekst); if (liten) { const sm = document.createElement('small'); sm.textContent = liten; b.append(sm); } b.onclick = fn; return b; }
  function startValg() {
    if (!r3() || !R3.ut) return; const G = window.Gaavalg, kar = karakter(), b = R3.bane, u = R3.ut;
    // et valgt lag: ved siden av laget som før; uten karakter (eller uten reglene): der kameraet ser
    if (!G || !kar || kar.ombord || (valgt && !valgt.karakter && iUt(valgt))) { start(); return; }
    const X = u.cx + b.x, Y = u.cy + b.y, d = Math.hypot(X - kar.x, Y - kar.y), v = G.valg(d);
    if (v.type === 'her') { klarGå(kar.x, kar.y, start); return; }
    const h = document.createElement('h3'), p = document.createElement('p'); h.textContent = 'Hvor vil du gå?';
    p.textContent = `Kameraet ser på et sted ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m'} fra deg.` + (v.type === 'forLangt' ? ' Det er for langt å gå i ett strekk – gå i etapper, eller send et lag med en ordre.' : '');
    const valg = [];
    // (runde 8) ser kameraet på et hus (dør innen 25 m fra midten av bildet): «Gå inn i huset» først
    const hus = v.type === 'spør' ? nærmesteInngang(b.x, b.y, 25) : null;
    if (hus) { const P = hus.P; let mx = 0, my = 0; for (const [x, y] of P) { mx += x; my += y; } mx = u.cx + mx / P.length; my = u.cy + my / P.length;
      const min = G.reiseMin(Math.hypot(mx - kar.x, my - kar.y));
      valg.push(kn(`Gå inn i huset (${G.tidTekst(min)} til fots)`, 'Du går dit, og du settes ved døra og går inn.', () => { lukkValg(); gåInn({ i: P.bygg.i, P: P.map(([x, y]) => [u.cx + x, u.cy + y]), mx, my }); }, true)); }
    if (v.type === 'spør') valg.push(kn(`Reis hit (${G.tidTekst(v.min)} til fots)`, 'Du går dit, og spilltiden går så lenge turen tar.', () => reis(kar, X, Y, v.min), !hus));
    valg.push(kn('Gå her, der du står', 'Start ved karakteren din' + (iUt(kar) ? '.' : ' (kameraet flyr dit først).'), () => gåHer(kar), v.type !== 'spør'));
    valg.push(kn('Avbryt', '', lukkValg));
    valgEl.replaceChildren(h, p, ...valg); valgEl.classList.add('på');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  // Gå der karakteren står (kartet rundt ham bygges først når det trengs – se klarGå)
  function gåHer(kar) { klarGå(kar.x, kar.y, () => { lukkValg(); start(); }); }
  function venteSteg() {
    if (venterKart && r3()) { const kar = venterKart; if (!R3.bygger && iUt(kar)) { lukkValg(); start(); } }
    utSteg();
  }
  // ---------- KARTET RUNDT DEG FØR DU GÅR (runde 8, kritikken: «siden svarte ikke på minutter» etter «Reis hit», og bildet frøs når
  // han snudde seg) ----------
  // Målt 20. nov (Dovre, programvare-grafikk): selve reisen tok 13 s, men så begynte du å gå i det gamle, grove utsnittet mens det nye
  // (ca. 3,4 km rundt deg) ble bygget i bakgrunnen – og hvert bilde i førsteperson tok flere sekunder å tegne, så byggingen kom bare
  // ett lite stykke fram per bilde. Det tok over ti minutter. Nå bygges kartet rundt stedet FØR du begynner å gå, og 3D tegnes ikke så
  // lenge (bildet står, kortet «Henter kartet rundt deg …» viser hva som skjer). Trengs ikke noe nytt utsnitt, går du med en gang.
  // (X, Y) i kartets meter. Utsnittet som trengs, er det tegn3d i index.html ville bygget for gange (avstand 1000 m).
  let venterUt = null;
  const GÅ_AVST = 1000;
  function trengerNytt(u, x, y) { if (typeof utsnittS !== 'function') return false; const S = utsnittS(GÅ_AVST); return Math.hypot(x, y) > u.S * .45 || S > u.S * 1.6 || S < u.S * .45; }
  function klarGå(X, Y, ferdig, tittel) {
    if (!r3() || !R3.ut) return; const u = R3.ut;
    if (!trengerNytt(u, X - u.cx, Y - u.cy) && !R3.bygger) { ferdig(); return; }
    // kameraet flyttes dit og ned, så tegn3d bygger akkurat det utsnittet gangen trenger (navnene i 3D skjules imens: bildet står stille)
    const b = R3.bane; b.x = X - u.cx; b.y = Y - u.cy; b.avst = GÅ_AVST;
    venterUt = { X, Y, ferdig, t0: performance.now() }; overlegg(false);
    const h = document.createElement('h3'), p = document.createElement('p'), gang = document.createElement('div'), i = document.createElement('i');
    h.textContent = tittel || 'Henter kartet rundt deg …'; p.textContent = 'Bildet står stille så lenge – da går det fortere.'; gang.className = 'gang'; gang.append(i);
    valgEl.replaceChildren(h, gang, p, kn('Avbryt', '', () => { venterUt = null; overlegg(true); lukkValg(); }));
    valgEl.classList.add('på'); venterUt.p = p; venterUt.i = i;
  }
  function utSteg() {
    const v = venterUt; if (!v) return; if (!r3() || !R3.ut || typeof på3d === 'undefined' || !på3d) { venterUt = null; overlegg(true); lukkValg(); return; }
    const u = R3.ut, s = (performance.now() - v.t0) / 1000;
    // kameraet holdes der utsnittet skal bygges (rulles det imens, ville tegn3d bygget et annet utsnitt, og du hadde ventet for alltid);
    // og etter vent sekunder går du uansett (byggingen fortsetter da mens du går, som før)
    const b = R3.bane; b.x = v.X - u.cx; b.y = v.Y - u.cy; b.avst = GÅ_AVST;
    if (s > Gaavalg.REGLER.inn.maksVent) { venterUt = null; overlegg(true); lukkValg(); logg('Kartet rundt deg bygges fortsatt – du går imens.'); v.ferdig(); return; }
    v.p.textContent = (R3.bygger && R3.steg ? R3.steg.charAt(0).toUpperCase() + R3.steg.slice(1) + ' … ' : 'Bygger … ') + Math.round(s) + ' s';
    v.i.style.width = Math.min(95, Math.round(100 * (1 - Math.exp(-s / 25)))) + '%';
    if (R3.bygger || trengerNytt(u, v.X - u.cx, v.Y - u.cy)) return;
    venterUt = null; overlegg(true); lukkValg(); v.ferdig();
  }
  // navnene og merkene i 3D (overlegget) av eller på
  function overlegg(på) { const o = document.getElementById('c3o'); if (o) o.style.visibility = på ? '' : 'hidden'; }
  // 3D tegnes ikke mens du reiser eller mens kartet rundt målet bygges: bildet står, og hovedtråden er fri
  // til spillet (sim) og byggingen. (KROKER.bilde3d: svarer kroken true, tegner ikke index.html bildet.)
  KROKER.bilde3d.unshift(() => !!venterUt || !!reise);
  // Fartsknappen som er valgt nå (sp0 = pause)
  const fartNå = () => { const b = document.querySelector('#sp0.på, #sp1.på, #sp2.på, #sp3.på, #sp4.på'); return b ? b.id : (typeof tempo !== 'undefined' && tempo === 0 ? 'sp0' : 'sp1'); };
  const klikk = id => { const e = document.getElementById(id); if (e) e.click(); };
  // Reisen: karakteren går i rett linje (omvegen er regnet inn i tiden) mens spillet spoles; framme starter du der.
  // (runde 8) ferdig(r) erstatter «start der du kom»; tittel står over framdriften. Virker også i 2D (fra «Gå inn i huset»).
  function reis(kar, X, Y, min, ferdig, tittel) {
    const G = window.Gaavalg, u = r3() && R3.ut && typeof på3d !== 'undefined' && på3d ? R3.ut : null, t = { x: X - (u ? u.cx : 0), y: Y - (u ? u.cy : 0) }; if (u) ledig(u, t);
    const fart = fartNå(), før = typeof fartFør !== 'undefined' ? fartFør : 'sp1';
    reise = { kar, fra: [kar.x, kar.y], til: [t.x + (u ? u.cx : 0), t.y + (u ? u.cy : 0)], t0: tid, min, fart, før, start: performance.now(), ferdig, bilder: 0, i3d: !!u };
    kar.sti = null; venterKart = null;
    // i kartet: vis både deg og målet
    if (!u && typeof kam !== 'undefined') { const [ax, ay] = reise.fra, [bx, by] = reise.til; kam.x = (ax + bx) / 2; kam.y = (ay + by) / 2; kam.m = Math.min(60, Math.max(kam.m, Math.hypot(bx - ax, by - ay) * 1.4 / Math.max(200, Math.min(VW, VH)))); skitten = true; }
    const h = document.createElement('h3'), p = document.createElement('p'), gang = document.createElement('div'), i = document.createElement('i');
    h.textContent = tittel || 'Du går dit …'; p.textContent = `0 av ${min} min`; gang.className = 'gang spol'; gang.append(i); valgEl.replaceChildren(h, gang, p); valgEl.classList.add('på'); reise.p = p; reise.i = i;
    klikk('sp4'); reise.tempo = typeof tempo !== 'undefined' ? tempo : G.REGLER.spol;
    reiseSteg();
  }
  function reiseSteg() {
    if (!reise) return; const r = reise, G = window.Gaavalg, kar = r.kar;
    const k = Math.max(0, Math.min(1, (tid - r.t0) / r.min));
    if (typeof levende === 'function' && !levende(kar)) { slutt(false, 'Reisen stoppet.'); return; }
    // (runde 8) karakteren flyttes, men siktfeltet regnes ikke på nytt hvert bilde (spilløkka gjør det når han har gått 150 m),
    // og i 2D følger kartet ham
    kar.sti = null; kar.x = r.fra[0] + (r.til[0] - r.fra[0]) * k; kar.y = r.fra[1] + (r.til[1] - r.fra[1]) * k;
    // (kartet flyttes bare når han er på vei ut av midten av bildet – å flytte det hvert bilde gjorde hvert bilde tungt)
    if (!r.i3d && typeof kam !== 'undefined') { if (Math.abs(kar.x - kam.x) > VW * kam.m * .3 || Math.abs(kar.y - kam.y) > VH * kam.m * .3) { kam.x = kar.x; kam.y = kar.y; } skitten = true; }
    const p = `${Math.round(k * r.min)} av ${r.min} min`; if (r.p.textContent !== p) r.p.textContent = p; r.i.style.width = Math.round(k * 100) + '%';
    // noe skjedde (spolingen ble senket av spillet: fienden i sikte, alarm …): stopp der du er kommet
    if (!r.tilbake && tempo !== r.tempo && tempo !== 0) { slutt(true, 'Reisen stoppet underveis – noe skjedde (se meldingene). Du går videre selv herfra.'); return; }
    // satt på pause underveis (av deg eller spillet) i over 2 s: stopp der du er kommet
    if (tempo === 0 && !r.tilbake) { if (!r.pauseFra) r.pauseFra = performance.now(); else if (performance.now() - r.pauseFra > 2000) { slutt(true, 'Reisen stoppet: spillet står på pause. Du går videre selv herfra.'); return; } } else r.pauseFra = 0;
    // framme: farten tilbake med en gang (før gikk 600× videre til kortet hadde stått i minVis sekunder – en tur på 2 min ble 15)
    if (k >= 1 && !r.tilbake) { r.tilbake = true; fartTilbake(r); r.tempo = tempo; }
    if (k >= 1 && performance.now() - r.start > G.REGLER.minVis * 1000) { slutt(true, null); return; }
    requestAnimationFrame(reiseSteg);
  }
  function slutt(gå, melding) {
    const r = reise; reise = null; if (!r) return;
    kar2sikt(r.kar);
    if (!r.tilbake) fartTilbake(r);
    lukkValg(); if (melding) logg(melding);
    if (!gå) return;
    // (runde 8) framme: det reisen skulle gjøre (gå inn i huset), ellers begynn å gå der du er – når kartet rundt deg er klart
    // (avbrutt underveis – melding satt –: du står der du kom, og går videre selv i 3D; i kartet skjer ikke mer)
    if (r.ferdig && !melding) { r.ferdig(r); return; }
    if (r3() && R3.ut && typeof på3d !== 'undefined' && på3d) klarGå(r.kar.x, r.kar.y, () => { start(); etterReise = performance.now(); });
  }
  // (runde 8) rett etter «Reis hit»: står det et hus nær, sier loggen én gang hvor inngangen er
  let etterReise = 0;
  // farten tilbake slik den var (også pausen)
  // (står spillet på pause nå – satt av noen andre underveis –, beholdes pausen, men ▶ går videre i farten du hadde, ikke 600×)
  function fartTilbake(r) {
    if (r.fart === 'sp0') { klikk(r.før); klikk('sp0'); }
    else if (tempo === 0) { try { fartFør = r.fart; } catch (e) { /* ingen fartsknapper */ } for (const id of ['sp1', 'sp2', 'sp3', 'sp4']) { const e = document.getElementById(id); if (e) e.classList.toggle('sist', id === r.fart); } }
    else if (fartNå() !== r.fart) klikk(r.fart);
  }
  // siktfeltet til karakteren regnes på nytt når han er framme (ikke underveis)
  function kar2sikt(kar) { if (kar) kar.siktSkitten = true; }

  // ---------- DØRA (runde 6: på telefon traff du veggen ved siden av døra, og det kom ingen «Gå inn») ----------
  // dørene i byggene som har interiør nå: [P, inngang]
  const dører = () => (window.Interior3d && Interior3d.aktivP ? Interior3d.aktivP().filter(P => P.inne && P.inne.inngang).map(P => [P, P.inne.inngang]) : []);
  let dørHjelp = null;
  // Nærmeste dør du kan gå inn gjennom (ute) eller ut gjennom (inne): { P, I, inn, d }
  function dørNå() {
    if (!r3() || !R3.fot || !kropp || fører || !window.Gaavalg) return null; const D = Gaavalg.REGLER.dør, x = kropp.x, y = kropp.y;
    const inne = window.Interior3d && Interior3d.inne ? Interior3d.inne(x, y) : null;
    if (inne && inne.inne && inne.inne.inngang) { const I = inne.inne.inngang; return { P: inne, I, inn: false, d: Math.hypot(I.x - x, I.y - y) }; }
    let best = null; for (const [P, I] of dører()) { const d = Math.hypot(I.x - x, I.y - y); if (d < D.nær && (!best || d < best.d)) best = { P, I, inn: true, d }; }
    return best;
  }
  function dørKnapp() {
    const q = dørNå(), vis = !!q && (q.inn || q.d < Gaavalg.REGLER.dør.ute || VW < 900) && !(window.MoblerSpill && MoblerSpill.hender && MoblerSpill.hender());
    if (vis) { const t = dørHjelp ? (dørHjelp.inn ? 'Går inn …' : 'Går ut …') : q.inn ? 'Gå inn' : 'Gå ut'; if (dørEl.textContent !== t) dørEl.textContent = t; dørEl.title = q.inn ? 'Gå inn gjennom døra' : 'Gå ut gjennom døra'; }
    dørEl.classList.toggle('på', vis);
  }
  dørEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); });
  dørEl.onclick = e => { e.preventDefault(); const q = dørNå(); if (!q || dørHjelp) return; const vei = Gaavalg.dørVei(q.I, q.inn), [a, b] = vei;
    // står du alt foran døra (eller inne nær den), gå rett gjennom
    const start = q.inn ? (Math.hypot(a[0] - kropp.x, a[1] - kropp.y) < .5 ? [b] : vei) : (q.d < 2.5 ? [b] : vei);
    let lengde = 0, px = kropp.x, py = kropp.y; for (const [x, y] of start) { lengde += Math.hypot(x - px, y - py); px = x; py = y; }
    dørHjelp = { mål: start, inn: q.inn, brukt: 0, til: Gaavalg.REGLER.dør.tid + lengde * Gaavalg.REGLER.dør.perMeter }; };
  // Én ramme med dørhjelpen: styrer mot neste punkt (gir { fram, side } eller null når den er ferdig)
  function dørSteg(f, dt) {
    const h = dørHjelp; if (!h || !kropp) return null; h.brukt += dt;
    if (spak && spak.dx !== undefined && Math.hypot(spak.dx, spak.dy) > 20 || ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(k => taster.has(k))) { dørHjelp = null; return null; }   // du styrer selv
    let [tx, ty] = h.mål[0];
    if (Math.hypot(tx - kropp.x, ty - kropp.y) < .3) { h.mål.shift(); if (!h.mål.length) { dørHjelp = null; return null; } [tx, ty] = h.mål[0]; }
    // står du fast for lenge (tiden i bevegelsen, så trege bilder ikke teller): sett deg rett på punktet bak døra
    if (h.brukt > h.til) { const [x, y] = h.mål[h.mål.length - 1]; kropp.x = x; kropp.y = y; kropp.vx = kropp.vy = 0; dørHjelp = null; return null; }
    const a = Gaavalg.kurs(kropp.x, kropp.y, tx, ty); let da = Math.atan2(Math.sin(a - f.a), Math.cos(a - f.a)); f.a += da * .25; f.pitch *= .9;
    return { fram: Math.cos(da) > .5 ? 1 : .2, side: 0 };
  }
  // Døra trekker deg mot midten når du går gjennom den (åpningen er 1,1 m, kroppen 0,6 m – før måtte du treffe innen 13 cm)
  function dørTrekk(f, fram, side, dt) {
    if (!window.Gaavalg || (!fram && !side)) return; const a = f.a;
    let dx = -Math.sin(a) * fram + Math.cos(a) * side, dy = Math.cos(a) * fram + Math.sin(a) * side; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    for (const [, I] of dører()) { const m = Gaavalg.dørTrekk(I, kropp.x, kropp.y, dx, dy, dt); if (!m) continue;
      const nx = kropp.x + I.ux * m, ny = kropp.y + I.uy * m;
      if (typeof hindring3d !== 'function' || !hindring3d(nx, ny)) { kropp.x = nx; kropp.y = ny; }
      return; }
  }

  // ---------- KORT SOM VENTER (runde 6: hendelseskortet midt i førsteperson stoppet styringen til du svarte) ----------
  // Mens du går (eller reiser) får kortene i køen (spill/samfunn-visning.js: Kortkø) ikke komme opp av seg selv. Et lite varsel øverst
  // sier at et kort venter: trykk på det eller Enter (PC) for å se det nå; når du slutter å gå, kommer det som vanlig.
  let slipp = false;
  const kortVenter = () => !!(window.Kortkø && Kortkø.venter && Kortkø.venter().length && !Kortkø.åpent());
  function kortKø() {
    const K = window.Kortkø; if (!K || K.gåVent) return; K.gåVent = true;
    const ta = K.ta, nå = K.nå;
    // (i testene – webdriver – bare med Gange.test = true, så de andre vaktene ser kortene som før)
    K.ta = function (id, haster, vis) { if (!slipp && ((r3() && R3.fot) || reise) && (!navigator.webdriver || window.Gange.test === true)) return false; return ta.call(K, id, haster, vis); };
    K.nå = function () { slipp = true; try { return nå.call(K); } finally { slipp = false; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kortKø); else setTimeout(kortKø, 0);
  // et kort som står oppe når du begynner å gå, går tilbake i køen (det venter på deg)
  function kortTilbake() {
    const K = window.Kortkø; if (!K || !K.åpent || (navigator.webdriver && window.Gange.test !== true)) return; const id = K.åpent(); if (id !== 'hendelse' && id !== 'samfunnkort') return;
    const e = document.getElementById(id); if (!e) return; e.classList.remove('på'); K.ferdig(id); K.be(id, null, { først: true });
  }
  function kortVarsel() {
    const vis = !!(r3() && R3.fot) && kortVenter() && !document.body.classList.contains('foto');
    if (vis) { const q = Kortkø.venter(), t = (q.length > 1 ? q.length + ' kort venter' : 'Et kort venter') + (q[0].tittel ? ': ' + q[0].tittel : '');
      const full = t + ' · ' + (VW < 900 ? 'trykk her' : 'Enter eller trykk her'); if (kortEl.dataset.t !== full) { kortEl.dataset.t = full; kortEl.replaceChildren(t + ' ', Object.assign(document.createElement('small'), { textContent: '· ' + (VW < 900 ? 'trykk her' : 'Enter eller trykk her') })); } }
    kortEl.classList.toggle('på', vis);
  }
  function visKort() { if (!window.Kortkø) return; if (document.pointerLockElement) document.exitPointerLock(); taster.clear(); spak = se = null; Kortkø.nå(); kortVarsel(); }
  kortEl.addEventListener('pointerdown', e => e.stopPropagation()); kortEl.onclick = visKort;

  // ---------- ESC (runde 6: Esc med sekken åpen kastet deg ut av førsteperson og opp i lufta) ----------
  // Esc lukker først det som er åpent (valget over, sekken, lutpanelet, karakterarket, menyer og paneler – de lukker seg selv på Esc),
  // et kort med valg går tilbake i køen, og først når ingenting er åpent, slipper Esc musa – og Esc igjen flyr opp.
  const ÅPNE = ['sekk', 'lutpanel', 'karakterark', 'degmeny', 'evpanel', 'hjelp', 'lagmeny', 'stridpanel', 'tropppanel', 'krigpanel', 'region', 'sjopanel', 'verdenpanel', 'forklaring', 'folkmeny', 'krig', 'kontrollrom'];
  const synligEl = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
  const noeÅpent = () => ÅPNE.some(id => synligEl(document.getElementById(id))) || !!(window.LutSpill && LutSpill.erÅpen && LutSpill.erÅpen());
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (valgÅpen() && !reise) { lukkValg(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      // (i et kamera i kameravakta går Esc ut av kameraet – spill/kameravakt-visning.js)
      if (!r3() || !R3.fot || document.body.classList.contains('ikamera')) return;
      const K = window.Kortkø, kort = K && K.åpent ? K.åpent() : null;
      if (kort === 'hendelse' || kort === 'samfunnkort') { kortTilbake(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      // noe er åpent: det lukker seg selv på Esc (sekken, panelene) – ikke gå ut av førsteperson
      if (noeÅpent() || kort) return;
      if (!document.pointerLockElement) stopp();
      return;
    }
    if (e.key === 'Enter' && r3() && R3.fot && !e.repeat && kortVenter() && !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) { visKort(); e.preventDefault(); return; }
    if (e.key === 'Enter' && valgÅpen() && !reise) { const b = valgEl.querySelector('button'); if (b) { b.click(); e.preventDefault(); } }
  }, true);

  // Vannet i 3D-utsnittet (vannmasken fra bygg3d), lest én gang per utsnitt
  function vannVed(u) {
    // isen bærer (spill/verden-visning.js): da stopper ikke vannet deg
    if (!u.vann || window.VERDEN_IS) return () => false;
    if (!u.vannData) { try { const W = u.vann.width; u.vannData = { W, d: u.vann.getContext('2d').getImageData(0, 0, W, W).data }; } catch (e) { u.vannData = { W: 0 }; } }
    const { W, d } = u.vannData; if (!W) return () => false;
    return (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * W), j = Math.floor((u.S - y) / (2 * u.S) * W); return i >= 0 && j >= 0 && i < W && j < W && d[(j * W + i) * 4] > 128; };
  }
  // Kameraet i øyehøyde; flytter deg etter tastene/styrespaken (kalles hver ramme fra kamera3d).
  // (dtFast: vakta kjører rammer med fast steg i sekunder, uten å vente på bildene)
  function kamera(R, dtFast) {
    const b = R.bane, f = R.fot, c = R.cam, u = R.ut, nå = performance.now(), dt = dtFast > 0 ? Math.min(.1, dtFast) : Math.max(0, Math.min(.1, (nå - sist) / 1000));
    // (runde 8) hvor lang tid bildene tar nå (snitt i ms, uten taket på 0,1 s) – se snuRask
    if (!(dtFast > 0) && nå - sist < 20000) rammeMs = rammeMs * .8 + (nå - sist) * .2; sist = nå;
    if (!kropp) kropp = Bevegelse.ny(b.x, b.y, hoyde3d(u.cx + b.x, u.cy + b.y) - u.h0);
    // nytt utsnitt: kroppen står i utsnittets egne meter og må flyttes med (ellers hoppet du flere hundre meter når utsnittet byttet)
    if (kroppU && kroppU !== u) { kropp.x += kroppU.cx - u.cx; kropp.y += kroppU.cy - u.cy; kropp.z += (kroppU.h0 - u.h0) * R.EX; } kroppU = u;
    let fram = 0, side = 0, løp = taster.has('shift');
    if (taster.has('w') || taster.has('arrowup')) fram++; if (taster.has('s') || taster.has('arrowdown')) fram--;
    if (taster.has('d') || taster.has('arrowright')) side++; if (taster.has('a') || taster.has('arrowleft')) side--;
    if (spak && spak.dx !== undefined) { const l = Math.min(1, Math.hypot(spak.dx, spak.dy) / 55); if (l > .12) { fram = -spak.dy / 55; side = spak.dx / 55; løp = l > .9; } }
    // «Gå inn» / «Gå ut»: dørhjelpen styrer til du er gjennom døra (eller styrer selv)
    if (dørHjelp && !fører) { const h = dørSteg(f, dt); if (h) { fram = h.fram; side = h.side; løp = false; } }
    // KJØRING (spill/kjor.js): sitter du i en bil eller et helikopter, tar føreren over styringen og kameraet
    if (fører && fører(R, { fram, side, løp, opp: taster.has(' ') || hoppHoldt, ned: taster.has('c') || taster.has('control') || hukHoldt, dt, mobil: !!(spak && spak.dx !== undefined) })) { hoppVent = false; return; }
    // utsnittets kant: hold deg innenfor (et nytt utsnitt bygges når du går langt)
    kropp.x = Math.max(-u.S * .97, Math.min(u.S * .97, kropp.x)); kropp.y = Math.max(-u.S * .97, Math.min(u.S * .97, kropp.y));
    // brede elver (u.iElv fra bekker-visning.js) stopper deg som annet vann – bekkene vasser du over
    // vegbanen og brudekkene (Liv3d.dekke) går du oppå når de ligger høyst 1,6 m over føttene dine (ellers går du under brua)
    const vann = vannVed(u), dekke = (x, y) => { const d = window.Liv3d && Liv3d.dekke ? Liv3d.dekke(u, x, y) : null; return d !== null && d - kropp.z < 1.6 ? d : null; };
    // inne i et bygg (spill/interior3d.js) står du på gulvet, og foran døra går en trapp opp til det
    const terr = (x, y) => (hoyde3d(u.cx + x, u.cy + y) - u.h0) * R.EX, gulv = (x, y) => window.Interior3d ? Interior3d.høyde(x, y, terr) : null;
    const verden = { høyde: (x, y) => { const g = gulv(x, y); if (g !== null) return g; const t = terr(x, y), d = dekke(x, y); return d !== null && d > t ? d : t; },
      trapp: (x, y) => !!window.Interior3d && Interior3d.påTrapp(x, y),
      hindring: (x, y) => typeof hindring3d === 'function' && hindring3d(x, y), vann: (x, y) => gulv(x, y) === null && (vann(x, y) || !!(u.iElv && u.iElv(x, y))) && dekke(x, y) === null };
    // skader (spill/eventyr-visning.js): brukket bein gir lavere fart og verken løp eller hopp
    // og tung last (spill/lut-visning.js): tregere, og svært tungt = ingen løping
    const EV = window.EventyrSpill, LS = window.LutSpill, skadd = (EV && EV.fart ? EV.fart() : 1) * (LS && LS.fart ? LS.fart() : 1);
    if (ligger && hoppVent) settLigg(false);
    dørTrekk(f, fram, side, dt);
    kropp.landet = 0;
    const k = Bevegelse.steg(kropp, { fram, side, retning: f.a, løp, hopp: hoppVent, huk: taster.has('c') || taster.has('control') || mobilHuk, ligg: ligger, faktor: skadd, ikkeLøp: !!(EV && EV.kanLøpe && !EV.kanLøpe()) || !!(LS && LS.kanLøpe && !LS.kanLøpe()) }, dt, verden);
    // et fall (farten du landet med) meldes til skadereglene
    if (kropp.landet > 0 && EV && EV.fall) EV.fall(kropp.landet);
    hoppVent = false;
    b.x = kropp.x; b.y = kropp.y;
    // karakteren din står der du går (så neste «Gå» starter her, og kartet viser deg der du er)
    if (vedKar && !fører && typeof ENHETER !== 'undefined' && ENHETER.includes(vedKar)) { vedKar.x = u.cx + kropp.x; vedKar.y = u.cy + kropp.y; }
    c.position.set(k.kx, k.ky, k.kz); c.up.set(0, 0, 1);
    c.lookAt(k.kx - Math.sin(f.a) * Math.cos(f.pitch), k.ky + Math.cos(f.a) * Math.cos(f.pitch), k.kz + Math.sin(f.pitch));
    // litt større synsfelt når du løper
    fov += ((kropp.løper && kropp.fart > Bevegelse.REGLER.gå * 1.5 ? 74 : 68) - fov) * Math.min(1, dt * 6);
    R.scene.fog.near = 120; R.scene.fog.far = u.S * .95; c.fov = fov; c.aspect = VW / VH; c.near = .2; c.far = u.S * 4 + 3000; c.updateProjectionMatrix();
    b.yaw = f.a;
  }
  // Pekerne i 3D mens du går: styrespak (nede til venstre på smale skjermer) eller se rundt. Gir true når hendelsen er brukt.
  // RASK SNUING (runde 8, kritikken: «å snu seg med musa frøs bildet i minutter»): med programvare-grafikk tar hvert bilde i førsteperson
  // flere sekunder, og hver bevegelse med musa ventet på et nytt bilde. Er bildene trege, tegnes 3D i halv oppløsning (R3.målPr, som
  // ytelse.js også bruker) mens du snur deg, og full igjen litt etter at du har sluttet. Ikke mens ytelsen måles.
  let rammeMs = 16, snuT = 0;
  function snuRask() {
    const S = window.Gaavalg && Gaavalg.REGLER.snu; if (!S || !r3() || R3.måler || rammeMs < S.treg) return;
    if (!R3.snuPr) { R3.snuPr = true; R3.målPr = S.pr; }
    clearTimeout(snuT); snuT = setTimeout(() => { if (r3() && R3.snuPr) { R3.snuPr = false; R3.målPr = undefined; } }, S.hold);
  }
  function peker(e) {
    if (!r3() || !R3.fot) return false;
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, låst = document.pointerLockElement === e.target;
    if (e.type === 'pointerdown') {
      // PC: klikk låser musa, så du ser rundt bare ved å bevege den
      // (runde 8: får nettleseren ikke låst musa – eller før låsen kommer –, ser du rundt ved å dra med knappen nede, som på telefon)
      if (VW >= 900 && e.pointerType === 'mouse' && !låst && e.target.requestPointerLock) { try { const p = e.target.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) { /* nettleseren sa nei */ } }
      if (!låst) { try { e.target.setPointerCapture(e.pointerId); } catch (_) { /* pekeren er borte */ } }
      // (runde 8, kritikken: hele nedre venstre firedel var styrespak, så et drag midt på skjermen flyttet deg i stedet for å snu deg –
      // nå bare rundt spaken og helt nede til venstre; se Gaavalg.erSpak)
      const G = window.Gaavalg, erSpak = G ? G.erSpak(x, y, VW, VH) : x < VW * .45 && y > VH * .5;
      if (VW < 900 && erSpak && !spak) spak = { id: e.pointerId, x0: x, y0: y, dx: 0, dy: 0 }; else if (!låst) se = { id: e.pointerId, x, y, x0: x, y0: y, a0: R3.fot.a, berøring: e.pointerType !== 'mouse' }; }
    else if (e.type === 'pointermove') {
      if (låst) { R3.fot.a -= e.movementX * .0025; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - e.movementY * .0025)); if (e.movementX || e.movementY) snuRask(); }
      else if (spak && spak.id === e.pointerId) { spak.dx = Math.max(-60, Math.min(60, x - spak.x0)); spak.dy = Math.max(-60, Math.min(60, y - spak.y0)); }
      else if (se && se.id === e.pointerId) { const k = window.Gaavalg ? Gaavalg.REGLER.berøring.følsom : .005; R3.fot.a -= (x - se.x) * k; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - (y - se.y) * k)); se.x = x; se.y = y; se.flyttet = true; snuRask(); } }
    else { if (spak && spak.id === e.pointerId) spak = null; if (se && se.id === e.pointerId) se = null; }
    return true;
  }
  const BRUKT = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', 'c', 'control', 'z'];
  window.addEventListener('keydown', e => { if (!r3() || !R3.fot) return; const k = e.key.toLowerCase();
    // (Esc: se lytteren over, som kjører først og lukker det som er åpent før den går ut av førsteperson)
    if (k === 'escape') return;
    // hoppet huskes til neste ramme, så et kort trykk ikke blir borte når bildet henger litt
    if (k === ' ' && !e.repeat) hoppVent = true;
    // Z legger deg ned og reiser deg igjen; C (huk) reiser deg også
    if (k === 'z' && !e.repeat && !fører) settLigg(!ligger);
    if ((k === 'c' || k === 'control') && ligger) settLigg(false);
    if (BRUKT.includes(k)) { taster.add(k); e.preventDefault(); } });
  window.addEventListener('keyup', e => taster.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => taster.clear());
  // stedet «Reis hit» går til (midt i bildet, der kameraet ser) får et merke mens valget står oppe
  KROKER.tegn3d.push(g => {
    if (!valgÅpen() || (r3() && R3.fot)) return; const x = VW / 2, y = VH / 2;
    g.save(); g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(28,23,15,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.stroke();
    g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x, y - 34); g.stroke(); g.font = '600 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = reise ? 'Dit du går' : 'Hit', w = g.measureText(t).width + 14; g.fillRect(x - w / 2, y - 50, w, 18); g.strokeRect(x - w / 2, y - 50, w, 18); g.fillStyle = '#f0e2b0'; g.fillText(t, x, y - 41); g.restore();
  });
  // styrespaken, siktet midt i bildet og utholdenheten tegnes i 3D-overlegget
  KROKER.tegn3d.push(g => {
    if (!r3() || !R3.fot || !kropp) return;
    g.save(); g.globalAlpha = .6; g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.5; const cx = VW / 2, cy = VH / 2;
    g.beginPath(); g.moveTo(cx - 6, cy); g.lineTo(cx + 6, cy); g.moveTo(cx, cy - 6); g.lineTo(cx, cy + 6); g.stroke();
    if (kropp.utholdenhet < .999) { const w = 120, x = cx - w / 2, y = VH - (VW < 900 ? 140 : 52); g.globalAlpha = .7; g.fillStyle = 'rgba(20,16,10,.6)'; g.fillRect(x - 1, y - 1, w + 2, 7);
      g.fillStyle = kropp.sliten ? '#e0604a' : '#e7dcc3'; g.fillRect(x, y, w * kropp.utholdenhet, 5); }
    if (VW < 900) { const sx = spak ? spak.x0 : 90, sy = spak ? spak.y0 : VH - 120; g.globalAlpha = .55; g.lineWidth = 2;
      g.beginPath(); g.arc(sx, sy, 55, 0, 6.283); g.stroke(); g.fillStyle = '#e7dcc3'; g.beginPath(); g.arc(sx + (spak ? spak.dx : 0), sy + (spak ? spak.dy : 0), 22, 0, 6.283); g.fill(); }
    // (runde 8) mens du drar for å se rundt med fingeren: en ring der fingeren er, piler til sidene og kursen, så du ser at draget virker
    if (se && se.berøring) { const x = se.x, y = se.y, kurs = ((-R3.fot.a * 180 / Math.PI) % 360 + 360) % 360; g.globalAlpha = .75; g.lineWidth = 2; g.strokeStyle = '#f0d79a';
      g.beginPath(); g.arc(x, y, 30, 0, 6.283); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 38, y - 7); g.lineTo(x + s * 47, y); g.lineTo(x + s * 38, y + 7); g.stroke(); }
      g.font = '600 15px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; const t = String(Math.round(kurs) % 360).padStart(3, '0') + '°', w = g.measureText(t).width + 14;
      g.fillStyle = 'rgba(28,23,15,.85)'; g.fillRect(x - w / 2, y - 62, w, 22); g.fillStyle = '#f0e2b0'; g.fillText(t, x, y - 51); }
    // (runde 8) pila mot nærmeste inngang: «Inngang 14 m» med en pil som peker dit (opp = rett fram), under siktet
    const q = pekerNå && kropp && R3.fot ? Gaavalg.pekerMot(pekerNå.I, kropp.x, kropp.y, R3.fot.a) : null; if (q && q.vis && !fører && !dørEl.classList.contains('på') && !document.body.classList.contains('foto')) {
      const cx2 = VW / 2, cy2 = VH / 2 + (VW < 900 ? 54 : 48), t = Gaavalg.pekerTekst(q); g.globalAlpha = .92; g.font = '600 14px "Cormorant Garamond",serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      const w = g.measureText(t).width + 44, x0 = cx2 - w / 2; g.fillStyle = 'rgba(28,23,15,.86)'; g.strokeStyle = '#c9b26a'; g.lineWidth = 1; g.fillRect(x0, cy2 - 12, w, 24); g.strokeRect(x0 + .5, cy2 - 11.5, w - 1, 23);
      g.fillStyle = '#f0e2b0'; g.fillText(t, x0 + 10, cy2 + .5);
      g.save(); g.translate(x0 + w - 17, cy2); g.rotate(q.rel); g.fillStyle = '#f0d79a'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6.5, 3); g.lineTo(2.2, 3); g.lineTo(2.2, 9); g.lineTo(-2.2, 9); g.lineTo(-2.2, 3); g.lineTo(-6.5, 3); g.closePath(); g.fill(); g.restore(); }
    g.restore();
  });
  // ---------- «GÅ INN I HUSET» FRA KARTET (runde 8, kritikken: husene lå 500–600 m fra leiren, og det fantes ingen rask vei inn) ----------
  // Trykk på et bygg i kartet (eller i 3D): panelet sier at bygget har en innside og har knappen «Gå inn i huset». Du reiser dit som med
  // «Reis hit» (spilltiden går så lenge turen tar), 3D bygges rundt huset, og du settes foran døra og går inn av deg selv.
  let innVent = null;
  const visBygg0 = typeof visByggVed === 'function' ? visByggVed : null;
  if (visBygg0) window.visByggVed = async function (X, Y) { const ok = await visBygg0(X, Y); if (ok) { try { await innKnapp(X, Y); } catch (e) { console.warn('gå inn:', e); } } return ok; };
  async function innKnapp(X, Y) {
    const H = document.getElementById('handl'); if (!H || typeof finnBygg !== 'function') return; const b = await finnBygg(X, Y); if (!b || !b.o || !b.P) return;
    const kar = karakter(), G = window.Gaavalg, P = b.P, i = b.o.e && b.o.e.i; if (!G) return;
    let mx = 0, my = 0; for (const [x, y] of P) { mx += x; my += y; } mx /= P.length; my /= P.length;
    // (lappen og knappen ligger i #handl, som tømmes når panelet brukes til noe annet – et lag, et kjøretøy)
    const lapp = document.createElement('div'); lapp.className = 'gaainn'; lapp.style.cssText = 'flex:1 0 100%;margin:0;color:#d8ccb0;font-size:13.5px';
    if (!kar) { lapp.textContent = 'Bygget har en innside. Du trenger en karakter for å gå inn (Nytt spill).'; H.prepend(lapp); return; }
    // runde bygg (tank, fyr – 4πA/O² over 0,85 som rund() i index.html) har ingen innside
    let A = 0, O = 0; for (let k = 0, j = P.length - 1; k < P.length; j = k++) { A += P[j][0] * P[k][1] - P[k][0] * P[j][1]; O += Math.hypot(P[k][0] - P[j][0], P[k][1] - P[j][1]); }
    if (O > 0 && 4 * Math.PI * Math.abs(A / 2) / (O * O) > .85) { lapp.textContent = 'Runde bygg (tank, fyr) har ingen innside.'; H.prepend(lapp); return; }
    const d = Math.hypot(mx - kar.x, my - kar.y), v = G.valg(d);
    lapp.textContent = 'Bygget har en innside – du kan gå inn og lete.'; H.prepend(lapp);
    if (kar.ombord) { const s = document.createElement('small'); s.textContent = ' (Gå av kjøretøyet først.)'; lapp.append(s); return; }
    if (v.type === 'forLangt') { const s = document.createElement('small'); s.textContent = ` Det er ${(d / 1000).toFixed(1).replace('.', ',')} km dit – for langt å gå i ett strekk.`; lapp.append(s); return; }
    const kn2 = document.createElement('button'); kn2.id = 'gaainnknapp'; kn2.type = 'button';
    kn2.textContent = d < G.REGLER.inn.nær ? 'Gå inn i huset' : `Gå inn i huset (${G.tidTekst(v.min)} til fots)`;
    kn2.title = 'Du går dit, og spilltiden går så lenge turen tar. Så settes du ved døra og går inn.';
    kn2.onclick = () => gåInn({ i, P, mx, my });
    lapp.after(kn2);
  }
  // Reis til huset (i kartets meter: P omrisset, mx/my midten, i byggets nummer) og gå inn
  function gåInn(h) {
    const kar = karakter(), G = window.Gaavalg; if (!kar || !G || reise) return;
    if (typeof valgt !== 'undefined') valgt = null; const lukk = document.getElementById('lukk'); if (lukk && document.getElementById('panel').classList.contains('på')) lukk.click();
    if (r3() && R3.fot) stopp();
    const d = Math.hypot(h.mx - kar.x, h.my - kar.y), [tx, ty] = G.utenfor(h.P, kar.x, kar.y, G.REGLER.inn.ute);
    const framme = () => framme3d(h);
    if (d < G.REGLER.inn.nær) { framme(); return; }
    reis(kar, tx, ty, G.reiseMin(Math.hypot(tx - kar.x, ty - kar.y)), framme, 'Du går til huset …');
  }
  // Framme ved huset: 3D rundt huset (bygges om det trengs), så settes du foran døra
  async function framme3d(h) {
    if (typeof på3d === 'undefined') return;
    if (!på3d) {
      // 3D åpnes med kartet midt på huset i en målestokk som gir det samme utsnittet gangen bruker (avstand 1000 m), så det ikke bygges to ganger
      kam.x = h.mx; kam.y = h.my; kam.m = GÅ_AVST / (.6 * Math.max(VW, VH)); skitten = true;
      const p = document.createElement('p'); p.textContent = 'Bygger 3D rundt huset …'; valgEl.replaceChildren(p); valgEl.classList.add('på');
      await slå3d(true); lukkValg();
      if (!på3d || !r3() || !R3.ut) return;
    }
    klarGå(h.mx, h.my, () => vedDøra(h), 'Henter kartet rundt huset …');
  }
  // Huset i 3D-utsnittet (samme nummer, ellers det nærmeste med dør), og du settes foran døra med blikket mot den
  function vedDøra(h) {
    const u = R3.ut, kar = karakter(), G = window.Gaavalg; if (!u || !kar) return;
    const x = h.mx - u.cx, y = h.my - u.cy; let P = null, bd = 40; const sett = new Set();
    for (let a = Math.floor((x - 40) / 20); a <= Math.floor((x + 40) / 20); a++) for (let c = Math.floor((y - 40) / 20); c <= Math.floor((y + 40) / 20); c++)
      for (const o of (R3.hindre && R3.hindre.get(a + ',' + c)) || []) { const Q = o.P; if (!Q || sett.has(Q) || !Q.dør || !Q.bygg) continue; sett.add(Q);
        if (h.i != null && Q.bygg.i === h.i) { P = Q; bd = -1; break; } let qx = 0, qy = 0; for (const [px, py] of Q) { qx += px; qy += py; } const dq = Math.hypot(qx / Q.length - x, qy / Q.length - y); if (dq < bd) { bd = dq; P = Q; } }
    if (!P) { kar.x = h.mx; kar.y = h.my; R3.bane.x = x; R3.bane.y = y; start(); logg('Fant ikke døra til huset i 3D – gå rundt huset og se etter «Inngang».'); return; }
    const I = inngangFor(P), f = G.REGLER.inn.foran, fx = I.x + I.nx * f, fy = I.y + I.ny * f;
    kar.x = u.cx + fx; kar.y = u.cy + fy; kar.sti = null; R3.bane.x = fx; R3.bane.y = fy;
    start(); if (!R3.fot) return;
    const k = kropp; if (k) R3.fot.a = G.kurs(k.x, k.y, I.x, I.y); R3.fot.pitch = -.05;
    innVent = { P, t0: performance.now() };
    logg('Du står ved døra og går inn …');
  }
  // venter på at interiøret er bygget (interior3d.js lager det for det nærmeste bygget), så går dørhjelpen inn for deg
  function innSteg() {
    const v = innVent; if (!v) return; if (!r3() || !R3.fot || !kropp) { innVent = null; return; }
    // interiøret er laget: du settes rett innenfor døra med blikket inn i huset (med programvare-grafikk tok det over et minutt å gå de
    // tre metrene gjennom døra med dørhjelpen); er plassen innenfor sperret, går dørhjelpen inn som før
    if (v.P.inne && v.P.inne.inngang) { const I = v.P.inne.inngang, inn = I.inn || Gaavalg.dørVei(I, true)[1];
      if (!(typeof hindring3d === 'function' && hindring3d(inn[0], inn[1]))) { innVent = null; kropp.x = inn[0]; kropp.y = inn[1]; kropp.vx = kropp.vy = 0; R3.bane.x = inn[0]; R3.bane.y = inn[1];
        R3.fot.a = Gaavalg.kurs(I.x, I.y, inn[0], inn[1]); R3.fot.pitch = -.05; logg('Du er inne. Let gjennom huset (E), eller gå ut gjennom døra bak deg.'); return; }
      const q = dørNå(); if (q && q.inn && q.P === v.P && !dørHjelp) { innVent = null; dørEl.onclick(new Event('click')); return; } }
    if (v.P.utenInne || performance.now() - v.t0 > Gaavalg.REGLER.inn.vent * 1000) { innVent = null; logg(v.P.utenInne ? 'Dette bygget har ingen innside du kan gå inn i.' : 'Døra er der «Inngang»-merket står – gå mot den, eller trykk «Gå inn».'); }
  }
  // ---------- PILA MOT INNGANGEN (runde 8, kritikken: «fant ikke Gå inn ved låven etter Reis hit») ----------
  // Står du ute nær et bygg, peker en pil under siktet mot den nærmeste døra: «Inngang 14 m ↗» (og «rundt huset» når døra er på
  // den andre siden). Byggene med dør (P.dør fra hus3d) har innside; leirens egne bygg også. Oppdateres fire ganger i sekundet.
  let pekerNå = null;
  function inngangFor(P) {
    if (P.inne && P.inne.inngang && P.inne.inngang.nx !== undefined) return P.inne.inngang;
    if (!P.gåInng || P.gåInng.d !== P.dør) P.gåInng = { d: P.dør, I: Gaavalg.inngang(P, P.dør) };
    return P.gåInng.I;
  }
  // nærmeste bygg med dør innen maks meter (rutenettet på 20 m i R3.hindre): { P, I, d }
  function nærmesteInngang(x, y, maks) {
    const R = R3; if (!R || !R.hindre) return null; let best = null, bd = maks; const sett = new Set();
    for (let a = Math.floor((x - maks) / 20); a <= Math.floor((x + maks) / 20); a++) for (let c = Math.floor((y - maks) / 20); c <= Math.floor((y + maks) / 20); c++)
      for (const o of R.hindre.get(a + ',' + c) || []) { const P = o.P; if (!P || sett.has(P) || !P.dør || !P.bygg || P.utenInne) continue; sett.add(P);
        const I = inngangFor(P), d = Math.hypot(I.x - x, I.y - y); if (d < bd) { bd = d; best = { P, I, d }; } }
    return best;
  }
  function pekerSteg() {
    pekerNå = null; if (!r3() || !R3.fot || !kropp || fører || !window.Gaavalg || reise) return;
    if (window.Interior3d && Interior3d.inne && Interior3d.inne(kropp.x, kropp.y)) return;
    pekerNå = nærmesteInngang(kropp.x, kropp.y, Gaavalg.REGLER.peker.maks);
    if (etterReise && performance.now() - etterReise > 10000) etterReise = 0;
    if (etterReise && pekerNå && pekerNå.d < 40) { etterReise = 0; logg(`Nærmeste inngang er ${Math.round(pekerNå.d)} m unna – følg pila under siktet. Nær døra kommer «Gå inn».`); }
  }
  // Flytt deg til et annet sted i utsnittet mens du går (x, y i utsnittets meter): kroppen lages på nytt der
  function flytt(x, y, finnLedig) { if (!r3() || !R3.fot || !R3.ut) return false; const b = R3.bane; b.x = x; b.y = y; if (finnLedig) ledig(R3.ut, b); kropp = null; kroppU = null; return true; }
  // (runde 8) gåInn(h) – reis til huset og gå inn; venter() – kartet rundt deg bygges før du går; inngangPil() – pila mot nærmeste inngang
  // ({ d, rel, vender, vis, tekst } eller null); klarGå(X, Y, ferdig) – bygg utsnittet for gange først når det trengs
  window.Gange = { vedKarakter: () => vedKar, start, stopp, kamera, startValg, reis, valgÅpen, lukkValg, reiser: () => reise, gåInn, klarGå, venter: () => !!venterUt, innVenter: () => !!innVent,
    inngangPil: () => { const n = pekerNå; if (!n || !kropp || !r3() || !R3.fot) return null; const q = Gaavalg.pekerMot(n.I, kropp.x, kropp.y, R3.fot.a); return { ...q, tekst: Gaavalg.pekerTekst(q) }; }, oppdaterPil: pekerSteg, dørNå, dørHjelp: () => dørHjelp, kortVenter, visKort, noeÅpent, oppdaterKnapper: () => { dørKnapp(); kortVarsel(); }, peker, kropp: () => kropp, åpenRetning, vannVed, flytt, ligg: settLigg,
    // stillingen din: 'stå', 'huk' eller 'ligg'
    stilling: () => (kropp && kropp.ligg ? 'ligg' : kropp && kropp.huk ? 'huk' : 'stå'),
    // fører(R, inn) tar over rammen når den svarer true (spill/kjor.js); knappene nede til høyre får navnene [huk, hopp]
    settFører: (f, navn) => { fører = f || null; kb.textContent = navn ? navn[0] : 'Huk'; hb.textContent = navn ? navn[1] : 'Hopp'; if (f) { mobilHuk = false; ligger = false; kb.classList.remove('på'); } } };
})();
