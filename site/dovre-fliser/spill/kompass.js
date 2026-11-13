'use strict';
// Kompass og minikart (brukeren 10. nov: «bygg bedre UI med kompass og evt. minikart»), i stil 1 (80-talls operasjonsrom).
// I 3D (også når du går selv): kompassbånd øverst midt på med grader hvert 5°, N/NØ/Ø … og 015, 030 …, markør i midten og
// merker for valgt lag, leiren og nærmeste synlige fiende. Minikart nede til høyre (mobil: over knappene til høyre) som
// roterer med kameraet eller står nord-opp (knappen på kanten), med terrenget fra 3D-overflaten (R3.texC), egne lag,
// synlige fiender, kjøretøy, leiren og synsfeltet. Trykk på minikartet = 2D-kartet der. I 2D-kartet: en liten nordpil.
// «Kompass» og «Minikart» i ☰ slår dem av og på (huskes i nettleseren).
// Retning: kameraet i 3D ser mot (−sin yaw, cos yaw), og nord er +y i kartet, så kursen er −yaw (med klokka fra nord).
// Reglene øverst er uten DOM (test: node pipeline/fliser/test_kompass.js).
(function () {
  const RAD = 180 / Math.PI, NAVN8 = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
  const R = {
    // grader 0–360 med klokka fra nord
    norm: g => ((g % 360) + 360) % 360,
    kurs: yaw => R.norm(-yaw * RAD),
    // peiling fra (0, 0) til (dx, dy) i kartet (nord = +y, øst = +x)
    peiling: (dx, dy) => R.norm(Math.atan2(dx, dy) * RAD),
    // hvor mange grader b ligger til høyre for a (−180 til 180)
    forskjell: (a, b) => ((b - a) % 360 + 540) % 360 - 180,
    // navnet på nærmeste av de åtte retningene
    navn: g => NAVN8[Math.round(R.norm(g) / 45) % 8],
    // teksten på båndet ved g grader (g delelig med 15), ellers null
    etikett: g => { g = R.norm(Math.round(g)); if (g % 45 === 0) return NAVN8[g / 45]; return g % 15 === 0 ? String(g).padStart(3, '0') : null; },
    // en forskyvning i kartet (dx, dy meter) til minikartet: opp = kursen når kartet roterer, ellers nord
    tilSkjerm: (dx, dy, kurs, roter) => { const a = roter ? kurs / RAD : 0, c = Math.cos(a), s = Math.sin(a); return [dx * c - dy * s, -(dx * s + dy * c)]; },
    // Avstandstekstene ved merkene på båndet skal ikke ligge oppå hverandre (12. nov: «27 km» og «245 km» ble lest som «27 245 km»
    // når leiren og et lag lå i samme retning). merker: [{ x, w }] i viktighetsrekkefølge (x = merkets midte, w = tekstens bredde),
    // opptatt: [[fra, til]] som alt er tatt (tavla med kursen i midten). Svar per merke: { x, side } der teksten begynner (side 1:
    // til høyre for merket, venstrestilt) eller slutter (side −1: til venstre, høyrestilt), eller null når det ikke er plass.
    avstandsplass: (merker, opptatt = [], luft = 4, rom = 9) => {
      const tatt = opptatt.map(o => o.slice()), fri = (a, b) => !tatt.some(o => a < o[1] + luft && o[0] - luft < b);
      // andre merker står i vegen for teksten – unntatt de som ligger i samme klynge som merket selv (innen 12 px)
      const symbol = (i, a, b) => merker.some((m, j) => j !== i && Math.abs(m.x - merker[i].x) > 12 && a < m.x + 6 && m.x - 6 < b);
      return merker.map((m, i) => {
        for (const side of [1, -1]) { const a = side > 0 ? m.x + rom : m.x - rom - m.w, b = a + m.w;
          if (fri(a, b) && !symbol(i, a, b)) { tatt.push([a, b]); return { x: side > 0 ? a : b, side }; } }
        return null; });
    },
    // tilbake fra minikartet (piksler fra midten, y ned) til kartet
    fraSkjerm: (px, py, kurs, roter) => { const a = roter ? kurs / RAD : 0, c = Math.cos(a), s = Math.sin(a); return [px * c - py * s, -(px * s + py * c)]; },
    // hvor mye snø minikartet viser (0–1) når stedet ligger moh meter over havet og snøgrensen er sg: samme myke overgang som bakken i 3D
    snø: (moh, sg) => { const t = Math.max(0, Math.min(1, (moh - (sg - 70)) / 140)); return t * t * (3 - 2 * t); },
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = R; return; }

  const r3 = () => (typeof R3 !== 'undefined' && R3 && R3.ut ? R3 : null);   // R3 er en let i index.html
  const PAPIR = '#e7dcc3', DIM = '#a69b82', LINJE = '#5b5140', GULL = '#f0d79a', MØRK = 'rgba(20,16,10,.62)';
  const css = document.createElement('style');
  css.textContent = `#kompass{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 6px); z-index:3; pointer-events:none; display:none; }
#kompass.på{ display:block; }
#minikart{ position:fixed; right:64px; bottom:calc(34px + env(safe-area-inset-bottom,0px)); z-index:3; display:none; width:200px; height:200px; }
#minikart.på{ display:block; } #minikart canvas{ display:block; width:100%; height:100%; cursor:pointer; touch-action:none; }
#minikart button{ position:absolute; right:-2px; top:-2px; width:34px; height:34px; border-radius:50%; background:#2a2318; border:1px solid ${LINJE}; color:${PAPIR};
  font:600 13px "Cormorant Garamond",Georgia,serif; cursor:pointer; padding:0; }
#nordpil{ position:fixed; left:12px; bottom:calc(62px + env(safe-area-inset-bottom,0px)); width:52px; height:52px; pointer-events:none; display:none; filter:drop-shadow(0 1px 2px #000); }
#nordpil.på{ display:block; }
@media (max-width:700px){ #minikart{ right:10px; bottom:calc(240px + env(safe-area-inset-bottom,0px)); width:128px; height:128px; }
  #minikart button{ width:30px; height:30px; right:-6px; top:-6px; } body.kompass3d #logg{ top:calc(var(--topp,58px) + 56px); }
  #kilde{ font-size:10.5px; } #skala{ bottom:calc(60px + env(safe-area-inset-bottom,0px)); } #nordpil{ bottom:calc(84px + env(safe-area-inset-bottom,0px)); } }
body.kompass3d #logg{ text-shadow:0 0 3px #000, 0 1px 2px #000; }
body.minikart3d:not(.kort) #kilde{ right:280px; }`;
  document.head.appendChild(css);

  // ---------- elementene ----------
  const bånd = document.createElement('canvas'); bånd.id = 'kompass'; bånd.setAttribute('aria-hidden', 'true'); document.body.appendChild(bånd);
  const mk = document.createElement('div'); mk.id = 'minikart'; const mc = document.createElement('canvas'), rk = document.createElement('button');
  mc.setAttribute('aria-label', 'Minikart: trykk for å gå til kartet her'); mc.setAttribute('role', 'button');
  mk.append(mc, rk); document.body.appendChild(mk);
  const np = document.createElement('div'); np.id = 'nordpil'; np.setAttribute('aria-hidden', 'true');
  np.innerHTML = `<svg viewBox="-26 -26 52 52" width="52" height="52"><circle r="21" fill="${MØRK}" stroke="${LINJE}" stroke-width="1.5"/>
<circle r="16" fill="none" stroke="${DIM}" stroke-width=".6" stroke-dasharray="1.2 2.9"/>
<path d="M0-17 L4 0 L0 4 L-4 0Z" fill="${PAPIR}"/><path d="M0 17 L4 0 L0-4 L-4 0Z" fill="${DIM}" opacity=".55"/>
<path d="M-12 0 L0 3 L12 0 L0-3Z" fill="${DIM}" opacity=".45"/>
<text y="-20.5" text-anchor="middle" font-family="IM Fell English,serif" font-size="11" fill="${GULL}" stroke="#1a1710" stroke-width="2.4" paint-order="stroke">N</text></svg>`;
  document.body.appendChild(np);

  // ---------- av/på i ☰ ----------
  const på = { kompass: true, minikart: true }; let roter = true;
  try { på.kompass = localStorage.getItem('riksbrudd-kompass') !== 'av'; på.minikart = localStorage.getItem('riksbrudd-minikart') !== 'av'; roter = localStorage.getItem('riksbrudd-minikart-nord') !== '1'; } catch (e) { /* privat vindu */ }
  const lagre = (n, v) => { try { localStorage.setItem(n, v); } catch (e) { /* privat vindu */ } };
  const knapper = {};
  for (const [n, tekst] of [['kompass', 'Kompass'], ['minikart', 'Minikart']]) {
    const b = document.createElement('button'); b.id = 'vis-' + n; knapper[n] = b;
    const sett = () => { b.textContent = tekst; b.classList.toggle('av', !på[n]); b.setAttribute('aria-pressed', String(på[n])); synk(); };
    b.onclick = () => { på[n] = !på[n]; lagre('riksbrudd-' + n, på[n] ? 'på' : 'av'); sett(); };
    b.sett = sett; document.getElementById('lagmeny').appendChild(b);
  }
  const settRk = () => { rk.textContent = roter ? 'N↑' : '⟳'; rk.title = roter ? 'Kartet følger kameraet – trykk for nord opp' : 'Nord opp – trykk for å la kartet følge kameraet'; rk.setAttribute('aria-label', rk.title); };
  rk.onclick = e => { e.stopPropagation(); roter = !roter; lagre('riksbrudd-minikart-nord', roter ? '0' : '1'); settRk(); mini.sist = 0; };
  settRk();

  // hva som vises nå (3D, ikke i kontrollrommet)
  function synk() {
    const i3d = typeof på3d !== 'undefined' && på3d && !!r3(), kr = document.getElementById('kontrollrom'), iRom = !!(kr && kr.classList.contains('på'));
    bånd.classList.toggle('på', på.kompass && i3d && !iRom); mk.classList.toggle('på', på.minikart && i3d && !iRom);
    np.classList.toggle('på', på.kompass && !(typeof på3d !== 'undefined' && på3d) && !iRom);
    document.body.classList.toggle('kompass3d', på.kompass && i3d && !iRom); document.body.classList.toggle('minikart3d', på.minikart && i3d && !iRom);
  }
  for (const n in knapper) knapper[n].sett();
  setInterval(synk, 300);
  // statuslinja øverst kan bli høyere når knapper kommer til (f.eks. «Gå» i 3D): hold --topp riktig, så loggen og menyene ikke havner under den
  const topp = document.querySelector('.top');
  if (topp && window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--topp', topp.getBoundingClientRect().bottom + 'px')).observe(topp);

  // ---------- felles: kameraet, kursen og merkene ----------
  function kamera() {
    const R3_ = r3(); if (!R3_) return null;
    const u = R3_.ut, b = R3_.bane, c = R3_.cam, fot = !!R3_.fot, kurs = R.kurs(fot ? R3_.fot.a : b.yaw);
    const hfov = 2 * Math.atan(Math.tan((c.fov || 50) / 2 / RAD) * (VW / Math.max(1, VH))) * RAD;
    return { u, fot, kurs, hfov, kx: u.cx + c.position.x, ky: u.cy + c.position.y, mx: u.cx + b.x, my: u.cy + b.y, avst: b.avst };
  }
  function leiren() {
    const S = window.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand();
    if (S && S.leir) return { x: S.leir.x, y: S.leir.y, navn: 'Leiren' };
    const B = window.OLJE && OLJE.BASER && OLJE.BASER[0]; return B ? { x: B.x, y: B.y, navn: B.navn || 'Basen' } : null;
  }
  const egen = s => s.side === 'blå', ser = s => !VIS.taake || synlig(s);
  // de synlige fiendene regnes høyst to ganger i sekundet (synlig() spør alle egne lag)
  let fiender = [], fiendeTid = 0;
  function synligeFiender() {
    const nå = performance.now(); if (nå - fiendeTid < 500) return fiender; fiendeTid = nå;
    fiender = ENHETER.filter(s => !egen(s) && levende(s) && ser(s));
    const kj = (window.KJORETOY || []).filter(k => k.side !== 'blå' && (k.antall || 0) > 0 && ser(k)); fiender = fiender.concat(kj);
    return fiender;
  }
  function merker(k) {
    const m = [], L = leiren();
    if (L) m.push({ type: 'leir', x: L.x, y: L.y, navn: L.navn });
    if (valgt && typeof valgt.x === 'number') m.push({ type: 'valgt', x: valgt.x, y: valgt.y, side: valgt.side || 'blå', navn: valgt.navn });
    let best = null, bd = Infinity; for (const s of synligeFiender()) { const d = Math.hypot(s.x - k.kx, s.y - k.ky); if (d < bd && s !== valgt) { bd = d; best = s; } }
    if (best) m.push({ type: 'fiende', x: best.x, y: best.y, side: best.side, navn: best.navn });
    for (const e of m) { e.peiling = R.peiling(e.x - k.kx, e.y - k.ky); e.avstand = Math.hypot(e.x - k.kx, e.y - k.ky); }
    return m;
  }
  const km = d => (d >= 1000 ? (d / 1000).toFixed(d < 10000 ? 1 : 0).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');
  function merke(g, type, side, x, y, s) {
    g.beginPath();
    if (type === 'leir') { g.rect(x - s * .8, y - s * .8, s * 1.6, s * 1.6); g.fillStyle = PAPIR; }
    else if (type === 'valgt') { g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.fillStyle = sidefarge(side, 'lys'); }
    else { g.moveTo(x, y - s); g.lineTo(x + s, y + s * .8); g.lineTo(x - s, y + s * .8); g.closePath(); g.fillStyle = sidefarge(side, 'lys') || '#e0604a'; }
    g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#1a1710'; g.stroke();
    if (type === 'leir') { g.beginPath(); g.moveTo(x - s * .8, y + s * .8); g.lineTo(x, y - s * .2); g.lineTo(x + s * .8, y + s * .8); g.strokeStyle = '#1a1710'; g.stroke(); }
  }

  // ---------- kompassbåndet ----------
  const kb = { midt: null };
  function tegnBånd(k) {
    const W = Math.round(Math.min(440, VW - 24)), H = 50, d = Math.min(2, window.devicePixelRatio || 1), BH = 30;
    if (bånd.width !== W * d || bånd.height !== H * d) { bånd.width = W * d; bånd.height = H * d; bånd.style.width = W + 'px'; bånd.style.height = H + 'px'; }
    const g = bånd.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    const halv = Math.max(35, Math.min(60, k.hfov / 2)), ppg = W / 2 / halv;   // piksler per grad
    // båndet: mørkt med tynn ramme og myke ender
    const grad = g.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, 'rgba(20,16,10,0)'); grad.addColorStop(.08, MØRK); grad.addColorStop(.92, MØRK); grad.addColorStop(1, 'rgba(20,16,10,0)');
    g.fillStyle = grad; g.fillRect(0, 0, W, BH);
    g.strokeStyle = 'rgba(91,81,64,.9)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W * .06, .5); g.lineTo(W * .94, .5); g.moveTo(W * .06, BH - .5); g.lineTo(W * .94, BH - .5); g.stroke();
    g.save(); g.beginPath(); g.rect(W * .03, 0, W * .94, BH); g.clip();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (let gr = Math.floor((k.kurs - halv) / 5) * 5; gr <= k.kurs + halv; gr += 5) {
      const x = W / 2 + R.forskjell(k.kurs, gr) * ppg, n = R.norm(gr), lang = n % 45 === 0, mid = n % 15 === 0;
      const kant = Math.min(1, Math.min(x, W - x) / (W * .14)); g.globalAlpha = Math.max(0, kant);
      g.strokeStyle = lang ? PAPIR : DIM; g.lineWidth = lang ? 1.6 : 1; g.beginPath(); g.moveTo(x, BH); g.lineTo(x, BH - (lang ? 10 : mid ? 7 : 4)); g.stroke();
      const t = R.etikett(n); if (!t) continue;
      if (n % 90 === 0) { g.font = '17px "IM Fell English",Georgia,serif'; g.fillStyle = n === 0 ? GULL : PAPIR; }
      else if (lang) { g.font = '600 13px "Cormorant Garamond",Georgia,serif'; g.fillStyle = PAPIR; }
      else { g.font = '600 11.5px "Cormorant Garamond",Georgia,serif'; g.fillStyle = DIM; }
      g.fillText(t, x, 17);
    }
    g.globalAlpha = 1; g.restore();
    // merkene under båndet; utenfor båndet står de ved kanten med en pil
    g.font = '600 11px "Cormorant Garamond",Georgia,serif'; g.textBaseline = 'middle';
    // Avstanden står ved siden av merket; de nærmeste merkene får plass først, og en tekst som ikke får plass, sløyfes (R.avstandsplass).
    const ms = merker(k).map(e => { const f = R.forskjell(k.kurs, e.peiling), ute = Math.abs(f) > halv * .9; return { e, f, ute, x: ute ? (f < 0 ? W * .07 : W * .93) : W / 2 + f * ppg, t: km(e.avstand) }; });
    const inne = ms.filter(m => !m.ute).sort((a, b) => a.e.avstand - b.e.avstand); for (const m of inne) m.w = g.measureText(m.t).width;
    const plass = R.avstandsplass(inne, [[W / 2 - 24, W / 2 + 24]]); kb.tekster = [];
    for (const m of ms) { const y = BH + 8, i = inne.indexOf(m), p = i >= 0 ? plass[i] : null;
      if (m.ute) { g.fillStyle = PAPIR; g.textAlign = m.f < 0 ? 'left' : 'right'; g.fillText(m.f < 0 ? '◂' : '▸', m.f < 0 ? m.x + 8 : m.x - 8, y); }
      else if (p) { g.textAlign = p.side > 0 ? 'left' : 'right'; g.lineWidth = 3; g.strokeStyle = '#1a1710'; g.strokeText(m.t, p.x, y); g.fillStyle = PAPIR; g.fillText(m.t, p.x, y);
        kb.tekster.push(p.side > 0 ? [p.x, p.x + m.w] : [p.x - m.w, p.x]); }
    }
    for (const m of ms) merke(g, m.e.type, m.e.side, m.x, BH + 8, 5);
    // midten: strek og kursen i en liten tavle
    g.fillStyle = GULL; g.beginPath(); g.moveTo(W / 2 - 5, 0); g.lineTo(W / 2 + 5, 0); g.lineTo(W / 2, 6); g.closePath(); g.fill();
    g.strokeStyle = GULL; g.lineWidth = 1.4; g.beginPath(); g.moveTo(W / 2, 6); g.lineTo(W / 2, BH); g.stroke();
    const tekst = String(Math.round(k.kurs) % 360).padStart(3, '0') + '°';
    g.fillStyle = '#1a1710'; g.strokeStyle = LINJE; g.fillRect(W / 2 - 22, BH, 44, 17); g.strokeRect(W / 2 - 21.5, BH + .5, 43, 16);
    g.font = '600 13px "Cormorant Garamond",Georgia,serif'; g.fillStyle = PAPIR; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tekst, W / 2, BH + 9);
    kb.midt = { grader: k.kurs, tekst: R.navn(k.kurs), visning: tekst };
  }

  // ---------- minikartet ----------
  const mini = { sist: 0, nøkkel: '', r: 300 };
  function tegnMini(k, R3_) {
    const D = mk.clientWidth || 200, d = Math.min(2, window.devicePixelRatio || 1), nå = performance.now();
    // tegnes på nytt når kameraet har flyttet/snudd seg merkbart, ellers fire ganger i sekundet (lagene går)
    const r = k.fot ? 250 : Math.max(300, Math.min(k.u.S * .95, k.avst * 1.4)), cx = k.fot ? k.kx : k.mx, cy = k.fot ? k.ky : k.my;
    // snø i minikartet: over snøgrensen (hele vinteren) er bakken hvit i 3D, men kartbildet under er sommerkartet (12. nov: minikartet
    // var grønt og brunt midt på vinteren). Snøen legges oppå kartbildet når stedet midt i minikartet ligger over snøgrensen.
    const VR = window.VAER, sg = VR && VR.snøgrense != null ? VR.snøgrense : 1e9, snø = R.snø(hoyde3d(cx, cy), sg);
    const nk = [Math.round(cx / (r / 60)), Math.round(cy / (r / 60)), Math.round(k.kurs * 2), Math.round(r), roter, R3_.nøkkel, D, Math.round(snø * 10)].join('|');
    if (nk === mini.nøkkel && nå - mini.sist < 250) return; mini.nøkkel = nk; mini.sist = nå; mini.r = r; mini.cx = cx; mini.cy = cy; mini.kurs = k.kurs;
    if (mc.width !== D * d) { mc.width = mc.height = D * d; }
    const g = mc.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, D, D);
    const M = D / 2, RI = M - 5, ppm = RI / r, u = k.u, T = R3_.texC, TW = T.width, mpp = 2 * u.S / TW;
    const tilSk = (X, Y) => { const [px, py] = R.tilSkjerm(X - cx, Y - cy, k.kurs, roter); return [M + px * ppm, M + py * ppm]; };
    // terrenget: utsnittet av 3D-overflaten (samme kart, tåke og siktfelt), rotert
    g.save(); g.beginPath(); g.arc(M, M, RI, 0, 6.2832); g.clip(); g.fillStyle = '#1a1710'; g.fillRect(0, 0, D, D);
    if (TW && u.TW === TW) {
      g.save(); g.translate(M, M); if (roter) g.rotate(-k.kurs / RAD);
      const sx = (cx - (u.cx - u.S)) / mpp, sy = ((u.cy + u.S) - cy) / mpp, sr = r * 1.45 / mpp;
      g.globalAlpha = .92; g.drawImage(T, sx - sr, sy - sr, sr * 2, sr * 2, -r * 1.45 * ppm, -r * 1.45 * ppm, r * 2.9 * ppm, r * 2.9 * ppm); g.globalAlpha = 1;
      g.restore();
      if (snø > .05) {
        // fargene tas bort og det lyse blir hvitt: jorder og hei blir snø, veger og tak står igjen som grått, skogen som mørkere flekker.
        // Kan ikke nettleseren blandingen, legges et hvitt slør over i stedet.
        g.globalAlpha = snø; g.globalCompositeOperation = 'saturation';
        if (g.globalCompositeOperation === 'saturation') { g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, D, D); g.globalCompositeOperation = 'color-dodge'; }
        if (g.globalCompositeOperation === 'color-dodge') { g.fillStyle = 'rgb(150,152,158)'; g.fillRect(0, 0, D, D); }
        else { g.globalCompositeOperation = 'source-over'; g.globalAlpha = snø * .7; g.fillStyle = 'rgb(232,236,242)'; g.fillRect(0, 0, D, D); }
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      }
      mini.snø = snø;
    }
    // mørk kant, som på en gammel radarskjerm
    const vg = g.createRadialGradient(M, M, RI * .55, M, M, RI); vg.addColorStop(0, 'rgba(14,11,7,0)'); vg.addColorStop(1, 'rgba(14,11,7,.55)'); g.fillStyle = vg; g.fillRect(0, 0, D, D);
    // synsfeltet: en kjegle fra kameraet i kursens retning
    const [ax, ay] = tilSk(k.kx, k.ky), lengde = RI * 1.6;
    const v0 = R.tilSkjerm(Math.sin((k.kurs - k.hfov / 2) / RAD), Math.cos((k.kurs - k.hfov / 2) / RAD), k.kurs, roter), v1 = R.tilSkjerm(Math.sin((k.kurs + k.hfov / 2) / RAD), Math.cos((k.kurs + k.hfov / 2) / RAD), k.kurs, roter);
    const kg = g.createRadialGradient(ax, ay, 0, ax, ay, lengde); kg.addColorStop(0, 'rgba(240,215,154,.32)'); kg.addColorStop(1, 'rgba(240,215,154,0)');
    g.fillStyle = kg; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + v0[0] * lengde, ay + v0[1] * lengde); g.lineTo(ax + v1[0] * lengde, ay + v1[1] * lengde); g.closePath(); g.fill();
    // kjøretøy (egne alltid, fiendens når de synes), lagene, leiren, valgt lag
    const iKart = (X, Y) => Math.hypot(X - cx, Y - cy) < r * 1.05;
    for (const kj of window.KJORETOY || []) { if (!(kj.antall > 0) || !iKart(kj.x, kj.y) || (kj.side !== 'blå' && !ser(kj))) continue;
      const [x, y] = tilSk(kj.x, kj.y); g.fillStyle = sidefarge(kj.side, 'lys'); g.strokeStyle = '#1a1710'; g.lineWidth = 1; g.fillRect(x - 3.5, y - 2.5, 7, 5); g.strokeRect(x - 3.5, y - 2.5, 7, 5); }
    for (const s of ENHETER) { if (!levende(s) || !iKart(s.x, s.y) || (!egen(s) && !ser(s))) continue;
      const [x, y] = tilSk(s.x, s.y); g.beginPath(); g.arc(x, y, s === valgt ? 4.5 : 3.5, 0, 6.2832); g.fillStyle = sidefarge(s.side, 'lys'); g.fill();
      g.lineWidth = s === valgt ? 2 : 1; g.strokeStyle = s === valgt ? GULL : '#1a1710'; g.stroke(); }
    // merkene: leiren og valgt lag (ved kanten når de er utenfor)
    for (const e of merker(k)) { if (e.type === 'fiende') continue; let [x, y] = tilSk(e.x, e.y); const dd = Math.hypot(x - M, y - M);
      if (dd > RI - 8) { x = M + (x - M) / dd * (RI - 8); y = M + (y - M) / dd * (RI - 8); } if (e.type === 'leir') merke(g, 'leir', null, x, y, 4.5); }
    // deg selv / kameraet
    g.save(); g.translate(ax, ay); g.rotate(roter ? 0 : k.kurs / RAD); g.fillStyle = GULL; g.strokeStyle = '#1a1710'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2.5); g.lineTo(-5, 5); g.closePath(); g.fill(); g.stroke(); g.restore();
    g.restore();
    // ringen: grader hvert 30° og N
    g.lineWidth = 3; g.strokeStyle = '#2a2318'; g.beginPath(); g.arc(M, M, RI + 1.5, 0, 6.2832); g.stroke();
    g.lineWidth = 1; g.strokeStyle = LINJE; g.beginPath(); g.arc(M, M, RI + 3.5, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(M, M, RI - .2, 0, 6.2832); g.stroke();
    for (let gr = 0; gr < 360; gr += 30) { const [vx, vy] = R.tilSkjerm(Math.sin(gr / RAD), Math.cos(gr / RAD), k.kurs, roter);
      g.strokeStyle = gr === 0 ? GULL : DIM; g.lineWidth = gr % 90 ? 1 : 1.6; g.beginPath(); g.moveTo(M + vx * (RI - (gr % 90 ? 4 : 7)), M + vy * (RI - (gr % 90 ? 4 : 7))); g.lineTo(M + vx * RI, M + vy * RI); g.stroke(); }
    const [nx, ny] = R.tilSkjerm(0, 1, k.kurs, roter);
    g.font = (D < 150 ? '13px' : '15px') + ' "IM Fell English",Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = '#1a1710'; g.strokeText('N', M + nx * (RI - 13), M + ny * (RI - 13)); g.fillStyle = GULL; g.fillText('N', M + nx * (RI - 13), M + ny * (RI - 13));
    // målestokk: radien
    g.font = '600 11px "Cormorant Garamond",Georgia,serif'; g.fillStyle = PAPIR; g.lineWidth = 3; g.strokeStyle = '#1a1710';
    const st = 'r ' + km(r); g.strokeText(st, M, D - 16); g.fillText(st, M, D - 16);
  }
  // trykk på minikartet: til 2D-kartet der du trykket
  mc.addEventListener('click', async e => {
    if (!r3() || mini.cx === undefined) return; const b = mc.getBoundingClientRect(), D = b.width, RI = D / 2 - 5, px = e.clientX - b.left - D / 2, py = e.clientY - b.top - D / 2;
    if (Math.hypot(px, py) > RI) return;
    const [dx, dy] = R.fraSkjerm(px / (RI / mini.r), py / (RI / mini.r), mini.kurs, roter), X = mini.cx + dx, Y = mini.cy + dy, m = mini.r * 2.2 / Math.min(VW, VH);
    if (window.Gange && R3.fot) Gange.stopp(); await slå3d(false); kam.x = X; kam.y = Y; kam.m = Math.max(.1, Math.min(60, m)); skitten = true; synk();
  });

  KROKER.tegn3d.push(() => {
    const R3_ = r3(); if (!R3_) return; const k = kamera(); if (!k) return;
    if (bånd.classList.contains('på')) tegnBånd(k); else kb.midt = { grader: k.kurs, tekst: R.navn(k.kurs), visning: String(Math.round(k.kurs) % 360).padStart(3, '0') + '°' };
    if (mk.classList.contains('på')) tegnMini(k, R3_);
  });
  window.Kompass = Object.assign({}, R, {
    // det kompasset viser i midten nå ({ grader, tekst: 'N'|'NØ'…, visning: '047°' })
    midt: () => kb.midt,
    på: () => ({ kompass: på.kompass, minikart: på.minikart, roter }),
    minikart: mc, bånd, synk,
    // andelen av minikartet som er tegnet (ikke gjennomsiktig) – for testene
    fylt: () => { const g = mc.getContext('2d'), d = g.getImageData(0, 0, mc.width, mc.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n / (d.length / 16); },
  });
})();
