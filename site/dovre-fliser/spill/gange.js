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
  setInterval(() => { knapp.hidden = !(typeof på3d !== 'undefined' && på3d); if (knapp.hidden && r3() && R3.fot) stopp(); if (knapp.hidden && valgÅpen() && !reise) lukkValg(); venteSteg(); dørKnapp(); kortVarsel(); }, 250);
  knapp.onclick = () => (r3() && R3.fot ? stopp() : valgÅpen() ? lukkValg() : startValg());
  // knappene for hopp og huk på smale skjermer
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
#dorknapp.på{ display:block; } body.kort #dorknapp{ bottom:calc(282px + env(safe-area-inset-bottom,0px)); font-size:15px; }
#gaakort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 78px); z-index:12; display:none; max-width:min(420px,88vw); padding:5px 14px; background:rgba(28,23,15,.9);
  border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:14px; cursor:pointer; text-align:center; }
#gaakort.på{ display:block; } #gaakort small{ color:#b9ab8a; } body.foto #gaavalg, body.foto #dorknapp, body.foto #gaakort{ display:none !important; }`;
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
  function lukkValg() { if (reise) return; valgEl.classList.remove('på'); valgEl.replaceChildren(); venterKart = null; }
  function kn(tekst, liten, fn, hoved) { const b = document.createElement('button'); b.type = 'button'; if (hoved) b.className = 'hoved'; b.append(tekst); if (liten) { const sm = document.createElement('small'); sm.textContent = liten; b.append(sm); } b.onclick = fn; return b; }
  function startValg() {
    if (!r3() || !R3.ut) return; const G = window.Gaavalg, kar = karakter(), b = R3.bane, u = R3.ut;
    // et valgt lag: ved siden av laget som før; uten karakter (eller uten reglene): der kameraet ser
    if (!G || !kar || kar.ombord || (valgt && !valgt.karakter && iUt(valgt))) { start(); return; }
    const X = u.cx + b.x, Y = u.cy + b.y, d = Math.hypot(X - kar.x, Y - kar.y), v = G.valg(d);
    if (v.type === 'her') { start(); return; }
    const h = document.createElement('h3'), p = document.createElement('p'); h.textContent = 'Hvor vil du gå?';
    p.textContent = `Kameraet ser på et sted ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m'} fra deg.` + (v.type === 'forLangt' ? ' Det er for langt å gå i ett strekk – gå i etapper, eller send et lag med en ordre.' : '');
    const valg = [];
    if (v.type === 'spør') valg.push(kn(`Reis hit (${G.tidTekst(v.min)} til fots)`, 'Du går dit, og spilltiden går så lenge turen tar.', () => reis(kar, X, Y, v.min), true));
    valg.push(kn('Gå her, der du står', 'Start ved karakteren din' + (iUt(kar) ? '.' : ' (kameraet flyr dit først).'), () => gåHer(kar), v.type !== 'spør'));
    valg.push(kn('Avbryt', '', lukkValg));
    valgEl.replaceChildren(h, p, ...valg); valgEl.classList.add('på');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  // Gå der karakteren står: ligger han utenfor utsnittet, flyr kameraet dit, og du starter når kartet rundt ham er bygget
  function gåHer(kar) {
    if (iUt(kar)) { lukkValg(); start(); return; }
    const b = R3.bane, u = R3.ut; b.x = kar.x - u.cx; b.y = kar.y - u.cy; b.avst = Math.min(b.avst, 1200);
    const p = document.createElement('p'); p.textContent = 'Henter kartet rundt deg …'; valgEl.replaceChildren(p, kn('Avbryt', '', lukkValg)); venterKart = kar;
  }
  function venteSteg() {
    if (!venterKart || !r3()) return; const kar = venterKart;
    if (!R3.bygger && iUt(kar)) { lukkValg(); start(); }
  }
  // Fartsknappen som er valgt nå (sp0 = pause)
  const fartNå = () => { const b = document.querySelector('.knapper [id^=sp].på, [id^=sp].på'); return b ? b.id : (typeof tempo !== 'undefined' && tempo === 0 ? 'sp0' : 'sp1'); };
  const klikk = id => { const e = document.getElementById(id); if (e) e.click(); };
  // Reisen: karakteren går i rett linje (omvegen er regnet inn i tiden) mens spillet spoles; framme starter du der
  function reis(kar, X, Y, min) {
    const G = window.Gaavalg, u = R3.ut, t = { x: X - u.cx, y: Y - u.cy }; ledig(u, t);
    const fart = fartNå(), før = typeof fartFør !== 'undefined' ? fartFør : 'sp1';
    reise = { kar, fra: [kar.x, kar.y], til: [u.cx + t.x, u.cy + t.y], t0: tid, min, fart, før, start: performance.now() };
    kar.sti = null;
    const h = document.createElement('h3'), p = document.createElement('p'), gang = document.createElement('div'), i = document.createElement('i');
    h.textContent = 'Du går dit …'; p.textContent = `0 av ${min} min`; gang.className = 'gang'; gang.append(i); valgEl.replaceChildren(h, gang, p); reise.p = p; reise.i = i;
    klikk('sp4'); reise.tempo = typeof tempo !== 'undefined' ? tempo : G.REGLER.spol;
    reiseSteg();
  }
  function reiseSteg() {
    if (!reise) return; const r = reise, G = window.Gaavalg, kar = r.kar;
    const k = Math.max(0, Math.min(1, (tid - r.t0) / r.min));
    if (typeof levende === 'function' && !levende(kar)) { slutt(false, 'Reisen stoppet.'); return; }
    kar.sti = null; kar.x = r.fra[0] + (r.til[0] - r.fra[0]) * k; kar.y = r.fra[1] + (r.til[1] - r.fra[1]) * k; kar.siktSkitten = true; skitten = true;
    r.p.textContent = `${Math.round(k * r.min)} av ${r.min} min`; r.i.style.width = Math.round(k * 100) + '%';
    // noe skjedde (spolingen ble senket av spillet: fienden i sikte, alarm …): stopp der du er kommet
    if (tempo !== r.tempo && tempo !== 0) { slutt(true, 'Reisen stoppet underveis – noe skjedde (se meldingene). Du går videre selv herfra.'); return; }
    if (k >= 1 && performance.now() - r.start > G.REGLER.minVis * 1000) { slutt(true, null); return; }
    requestAnimationFrame(reiseSteg);
  }
  function slutt(gå, melding) {
    const r = reise; reise = null; if (!r) return;
    // farten tilbake slik den var (også pausen)
    if (r.fart === 'sp0') { klikk(r.før); klikk('sp0'); } else if (fartNå() !== r.fart) klikk(r.fart);
    lukkValg(); if (melding) logg(melding);
    if (gå && r3() && R3.ut && typeof på3d !== 'undefined' && på3d) { const u = R3.ut; R3.bane.x = r.kar.x - u.cx; R3.bane.y = r.kar.y - u.cy; start(); }
  }

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
    K.ta = function (id, haster, vis) { if (!slipp && ((r3() && R3.fot) || reise)) return false; return ta.call(K, id, haster, vis); };
    K.nå = function () { slipp = true; try { return nå.call(K); } finally { slipp = false; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kortKø); else setTimeout(kortKø, 0);
  // et kort som står oppe når du begynner å gå, går tilbake i køen (det venter på deg)
  function kortTilbake() {
    const K = window.Kortkø; if (!K || !K.åpent) return; const id = K.åpent(); if (id !== 'hendelse' && id !== 'samfunnkort') return;
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
      if (!r3() || !R3.fot) return;
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
  function kamera(R) {
    const b = R.bane, f = R.fot, c = R.cam, u = R.ut, nå = performance.now(), dt = Math.max(0, Math.min(.1, (nå - sist) / 1000)); sist = nå;
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
  function peker(e) {
    if (!r3() || !R3.fot) return false;
    const r = e.target.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, låst = document.pointerLockElement === e.target;
    if (e.type === 'pointerdown') {
      // PC: klikk låser musa, så du ser rundt bare ved å bevege den
      if (VW >= 900 && e.pointerType === 'mouse' && !låst && e.target.requestPointerLock) { try { e.target.requestPointerLock(); } catch (_) { /* nettleseren sa nei */ } return true; }
      if (!låst) e.target.setPointerCapture(e.pointerId);
      if (VW < 900 && x < VW * .45 && y > VH * .5 && !spak) spak = { id: e.pointerId, x0: x, y0: y, dx: 0, dy: 0 }; else se = { id: e.pointerId, x, y }; }
    else if (e.type === 'pointermove') {
      if (låst) { R3.fot.a -= e.movementX * .0025; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - e.movementY * .0025)); }
      else if (spak && spak.id === e.pointerId) { spak.dx = Math.max(-60, Math.min(60, x - spak.x0)); spak.dy = Math.max(-60, Math.min(60, y - spak.y0)); }
      else if (se && se.id === e.pointerId) { R3.fot.a -= (x - se.x) * .005; R3.fot.pitch = Math.max(-1.3, Math.min(1.3, R3.fot.pitch - (y - se.y) * .005)); se.x = x; se.y = y; } }
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
    g.restore();
  });
  // Flytt deg til et annet sted i utsnittet mens du går (x, y i utsnittets meter): kroppen lages på nytt der
  function flytt(x, y, finnLedig) { if (!r3() || !R3.fot || !R3.ut) return false; const b = R3.bane; b.x = x; b.y = y; if (finnLedig) ledig(R3.ut, b); kropp = null; kroppU = null; return true; }
  window.Gange = { vedKarakter: () => vedKar, start, stopp, kamera, startValg, reis, valgÅpen, lukkValg, reiser: () => reise, dørNå, dørHjelp: () => dørHjelp, kortVenter, visKort, noeÅpent, peker, kropp: () => kropp, åpenRetning, vannVed, flytt, ligg: settLigg,
    // stillingen din: 'stå', 'huk' eller 'ligg'
    stilling: () => (kropp && kropp.ligg ? 'ligg' : kropp && kropp.huk ? 'huk' : 'stå'),
    // fører(R, inn) tar over rammen når den svarer true (spill/kjor.js); knappene nede til høyre får navnene [huk, hopp]
    settFører: (f, navn) => { fører = f || null; kb.textContent = navn ? navn[0] : 'Huk'; hb.textContent = navn ? navn[1] : 'Hopp'; if (f) { mobilHuk = false; ligger = false; kb.classList.remove('på'); } } };
})();
