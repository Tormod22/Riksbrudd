'use strict';
/* Riksbrudd – LEIREN I 2D PÅ NÆR ZOOM (runde 7, 20. nov natt). Kritikken 19. nov: «På nær zoom (20 m) blir kartet uskarpt og flatt,
 * og leiren er bare grå bokser».
 *  - Leirens bygg tegnes som bygg sett ovenfra, i samme stil som husene i kartet (kartflis.js: lys fra nordvest, skygge mot sørøst,
 *    saltak med lys og mørk takflate og et lysere møne): blikktak med bølger på brakka, svart saltak og antenne på kontrollrommet,
 *    rødt kors på sykestua, presenning med barduner på lagerteltet, ribber på containeren, sylinder i oppsamlingskar på dieseltanken,
 *    panelrader på solcellene, glass over plantene i drivhuset, H i sirkelen på helikopterplassen, sandsekker i rekke, barduner på
 *    radiomasten, pyramidetak og bein på vakttårnet, bom og vaktbu på porten, osv. Fargene er de samme som modellene i 3D (modeller.js).
 *  - Tilstanden synes: i kø = stikker og snor; under bygging = utgravd grunn, grunnmur, reisverk, stillas, taket som legges fra den ene
 *    enden (etter framdriften) og materialer ved siden av; skadet = sot, hull i taket med sperrer og rusk; ødelagt = brent tomt med
 *    murrester; reparasjon/oppgradering = stillas. Valgt = gul kant, uten strøm/hardt skadet = rød kant, ellers en tynn kant i
 *    fraksjonens farge (så du ser hva som er ditt).
 *  - Om natta (KartLys) får byggene samme nattfarge som kartet, og bygg med strøm har varmt lys fra vinduene på bakken rundt seg.
 *  - Lagene på nær zoom er folk sett ovenfra (Leir2d.mann: skuldre i sidens farge, hjelm, sekk og gevær) i formasjonen (index.html
 *    tegnLag), folkene i leiren står der de arbeider (byggelaget rundt byggeplassen, vakta ved tårnet/porten, frakt ved lageret, fri
 *    rundt leirens midte; de som arbeider inne, synes ikke), og feltbilen og helikopteret tegnes som kjøretøy ovenfra.
 * Reglene øverst er uten DOM (stil, tilstand, tonet, figurR, folkPlass) og testes i pipeline/fliser/test_leir2d.js.
 * Leir2d.av = true gir de gamle boksene (brukes til å måle hva tegningen koster).
 */
(function (rot) {
  // Claudes forslag: alle tallene her
  const REGLER = {
    // detaljnivå etter meter per punkt: full detalj under «nær», tak med form under «middels», ellers flate farger
    nær: .35, middels: 1.2,
    // skygge som husene i kartflis.js: 0,45 punkter per meter høyde per meter-per-punkt, høyst 40 punkter
    skygge: .45, skyggeMaks: 40,
    // figurene: radius i punkter = 2 / √m, mellom 3,4 og 6,5 (før 3,4 eller 0,35 / m)
    figur: { k: 2, min: 3.4, maks: 6.5 },
    // folk i leiren og feltbil/helikopter som kjøretøy ovenfra under disse målestokkene
    folkUnder: .6, bilUnder: .7,
    // lys i vinduene når natta (KartLys) er sterkere enn dette
    vinduNatt: .15,
    // skade: sot under 0,95 helt, hull i taket under 0,6, rusk rundt under 0,35
    sot: .95, hull: .6, rusk: .35,
    // bølgeblikk og ribber tegnes bare når stripene står minst så mange punkter fra hverandre
    stripeMin: 3,
    // (runde 12, kritikk F/E: «brakka synes ikke på 1 km-målestokk, bare flagget»; «leiren ser nesten lik ut etter tre døgn») lenger ute
    // enn «fra» meter per punkt tegnes leiren som en liten klynge: byggene står som om kartet var tegnet med meter per punkt
    // fra + (m − fra) · vekst (avstandene i leiren og byggene forstørres), og hvert bygg er minst kort × lang punkter; over maks: ikke tegnet
    klynge: { fra: 1.6, vekst: .12, kort: 4, lang: 6.5, maks: 150 },
  };
  // klyngeM(m): meter per punkt leiren tegnes med når kartet har m (ren regel; = m helt nær, vokser sakte lenger ute)
  const klyngeM = (m, K = REGLER.klynge) => (m <= K.fra ? m : K.fra + (m - K.fra) * K.vekst);

  // byggtypene: form, takfarge, høyde (m), kroppen (taket) i modellens meter [x0, x1, y0, y1] (fronten/døra mot +x) og detaljer.
  // Fargene er fra modeller.js (F.blikk, F.svart, F.presenning …), så 2D og 3D stemmer.
  const STIL = {
    kontrollrom: { form: 'sal', tak: '#2f3133', h: 7, kropp: [-4.6, 4.6, -6.1, 6.1], pipe: [-1.6, 3.2], antenne: [1.8, -4.2], trapp: [4.6, 5.8, -1, 1], vinduer: 6 },
    brakke: { form: 'sal', tak: '#7b8083', h: 3.6, kropp: [-3.1, 3.1, -6.1, 6.1], bølge: true, pipe: [-1.4, 3], trapp: [3.1, 4.2, -.8, .8], vinduer: 4 },
    sykestue: { form: 'sal', tak: '#6a6e71', h: 4.6, kropp: [-3.6, 3.6, -5.6, 5.6], bølge: true, kors: true, trapp: [3.6, 7.3, -2.4, 2.4], plass: true, vinduer: 4 },
    kjøkken: { form: 'sal', tak: '#7a3a2c', h: 4.2, kropp: [-3.5, 3.5, -4.5, 4.5], pipe: [-1.2, 1.8], røyk: true, vinduer: 3 },
    verksted: { form: 'sal', tak: '#6b6f70', h: 6.5, kropp: [-6.1, 6.1, -7.1, 7.1], bølge: true, lysbånd: true, plass: [6.1, 12, -7.3, 7.3], porter: [-3.5, 3.5], vinduer: 4 },
    drivhus: { form: 'glass', tak: '#b9d2c8', h: 3, kropp: [-3, 3, -5, 5] },
    lagertelt: { form: 'telt', tak: '#59604a', h: 3.3, kropp: [-4, 4, -2.5, 2.5], plugger: 3.6 },
    container: { form: 'kasse', tak: '#7a3c24', h: 2.6, kropp: [-3, 3.05, -1.2, 1.2], ribber: true },
    batteri: { form: 'kasse', tak: '#4d5458', h: 2.4, kropp: [-2, 2, -1.2, 1.2], ribber: true, stripe: '#c9a227', luker: 3 },
    aggregat: { form: 'kasse', tak: '#5d6a40', h: 2.2, kropp: [-1.6, 1.6, -1, 1], rist: true, eksos: [-1, .55], stripe: '#c9a227' },
    drivstofftank: { form: 'tank', tak: '#9ba1a4', h: 3.2, kropp: [-2.2, 2.2, -4, 4], pumpe: [2.6, 3.7, -.6, .6] },
    solcelle: { form: 'panel', tak: '#22324a', h: 1.4, kropp: [-4, 4, -2, 2] },
    vakttårn: { form: 'tårn', tak: '#5b4a38', h: 9, kropp: [-1.15, 1.15, -1.15, 1.15], bein: 1.4 },
    kameramast: { form: 'mast', tak: '#5e6366', h: 6, kropp: [-.5, .5, -.5, .5] },
    radiomast: { form: 'mast', tak: '#9ba1a4', h: 22, kropp: [-1, 1, -1, 1], barduner: 7 },
    helikopterplass: { form: 'pad', tak: '#8f8d87', h: .15, kropp: [-10.9, 10.9, -10.9, 10.9], vindpose: [14, 8] },
    sandsekkvoll: { form: 'voll', tak: '#a8946f', h: 1, kropp: [-.3, .2, -4, 4] },
    port: { form: 'port', tak: '#565a5d', h: 3, kropp: [-1.7, 1.7, 1.1, 3.9] },
    brønn: { form: 'brønn', tak: '#8f8d87', h: 1.2, kropp: [-1.3, 1.3, -1.3, 1.3] },
    minnesmerke: { form: 'stein', tak: '#6c6b66', h: 1.4, kropp: [-1.6, 1.6, -1.6, 1.6] },
    åker: { form: 'åker', tak: '#5d5040', h: 0, kropp: null },
  };
  // formene som er hus (får grunnmur, reisverk og stillas når de bygges, og lys i vinduene om natta)
  const HUS = new Set(['sal', 'flat', 'telt', 'kasse', 'glass', 'tank', 'tårn', 'port']);
  const stil = (type, B) => { const S = STIL[type] || { form: 'flat', tak: '#6d6a63', h: 3.5 }, f = B && B.fot;
    return S.kropp || !f ? S : { ...S, kropp: f.slice() }; };
  // Tilstanden til et bygg: 'ødelagt' (hp 0), 'kø' (i kø eller laget er på vei), 'bygges' (framdrift p), 'reparer'/'oppgrader'/'flytt'
  // (arbeid på et ferdig bygg), 'skadet' (hp under 1) eller 'ferdig'. info: { aktiv } fra jobblista.
  function tilstand(b, info = {}) {
    if (b.hp !== undefined && b.hp <= 0) return { navn: 'ødelagt', p: 0 };
    if (b.igjen > 0) { const p = b.totalt ? Math.max(0, Math.min(1, 1 - b.igjen / b.totalt)) : 0;
      return { navn: info.aktiv === false || (b.reise > 0 && p === 0) ? 'kø' : 'bygges', p }; }
    if (b.arbeid && b.arbeid.hva) return { navn: b.arbeid.hva, p: b.arbeid.totalt ? Math.max(0, Math.min(1, 1 - b.arbeid.igjen / b.arbeid.totalt)) : 0 };
    if (b.hp !== undefined && b.hp < 1) return { navn: 'skadet', p: 1 };
    return { navn: 'ferdig', p: 1 };
  }
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  // nattfargen fra KartLys (T = { natt, farge, grå, mørk }) på en farge [r, g, b] – samme regning som lagene over kartet i kartlys.js
  function tonet(c, T) { if (!T) return c; let [r, g, b] = c;
    if (T.grå > 0) { const l = .299 * r + .587 * g + .114 * b; r += (l - r) * T.grå; g += (l - g) * T.grå; b += (l - b) * T.grå; }
    if (T.natt > 0) { const k = T.natt; r *= 1 - k + k * T.farge[0] / 255; g *= 1 - k + k * T.farge[1] / 255; b *= 1 - k + k * T.farge[2] / 255; }
    if (T.mørk > 0) { const k = T.mørk; r = r * (1 - k) + 20 * k; g = g * (1 - k) + 22 * k; b = b * (1 - k) + 26 * k; }
    return [Math.round(r), Math.round(g), Math.round(b)]; }
  const figurR = m => Math.max(REGLER.figur.min, Math.min(REGLER.figur.maks, REGLER.figur.k / Math.sqrt(Math.max(1e-3, m))));
  const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // FOLK I LEIREN: hvor person nr. i står i 2D (kartets meter) – null når personen er inne eller borte. Samme arbeidssteder som folk3d.js.
  const INNE = { overvåking: ['kontrollrom'], kjøkken: ['kjøkken'], stell: ['sykestue'], verksted: ['verksted'] };
  const UTE = { vakt: ['port', 'vakttårn'], frakt: ['lagertelt', 'container'] };
  function folkPlass(pers, i, bygg, leir, tid, BYGG) {
    if (!pers || !leir) return null; const fot = b => (BYGG && BYGG[b.type] && BYGG[b.type].fot) || [-3, 3, -3, 3];
    const ved = (b, u, v) => { const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0); return { x: b.x + u * c - v * s, y: b.y + u * s + v * c }; };
    const ferdige = t => bygg.filter(b => t.includes(b.type) && !(b.igjen > 0) && !(b.hp <= 0));
    if (pers.karantene) return null;
    if (INNE[pers.oppgave] && ferdige(INNE[pers.oppgave]).length) return null;
    const vandre = (x, y, r, fase) => { const a = tid / 9 + fase * 6.283; return { x: x + Math.cos(a) * r, y: y + Math.sin(a * .7) * r, a: a + 1.57 }; };
    if (pers.oppgave === 'bygg') { const u = bygg.filter(b => b.igjen > 0 || (b.arbeid && b.arbeid.hva !== 'flytt')).filter(b => !(b.reise > 0));
      if (u.length) { const b = u[i % u.length], [x0, x1, y0, y1] = fot(b), a = i * 2.39 + Math.sin(tid / 7 + i) * .25, rx = (x1 - x0) / 2 + 1.1, ry = (y1 - y0) / 2 + 1.1;
        const u0 = (x0 + x1) / 2 + Math.cos(a) * rx, v0 = (y0 + y1) / 2 + Math.sin(a) * ry, p = ved(b, u0, v0); return { x: p.x, y: p.y, a: Math.atan2(b.y - p.y, b.x - p.x), arbeid: true }; } }
    const ute = UTE[pers.oppgave] && ferdige(UTE[pers.oppgave]);
    if (ute && ute.length) { const b = ute[i % ute.length], f = fot(b), p = ved(b, f[1] + 1.2, ((i % 3) - 1) * 1.3);
      if (pers.oppgave === 'frakt') { const t = (Math.sin(tid / 6 + i) + 1) / 2; return { x: p.x + (leir.x - p.x) * t * .6, y: p.y + (leir.y - p.y) * t * .6, a: Math.atan2(leir.y - p.y, leir.x - p.x) + (Math.cos(tid / 6 + i) < 0 ? Math.PI : 0) }; }
      return { x: p.x, y: p.y, a: (b.ret || 0) + Math.sin(tid / 11 + i) * .8 }; }
    // hogst: i skogkanten et stykke unna; fri (og resten): rundt leirens midte
    if (pers.oppgave === 'hogst') { const a = hash(i, 17) * 6.283, r = 38 + hash(i, 5) * 10; return vandre(leir.x + Math.cos(a) * r, leir.y + Math.sin(a) * r, 1.5, hash(i, 3)); }
    const a = hash(i, 11) * 6.283, r = 7 + hash(i, 13) * 9; return vandre(leir.x + Math.cos(a) * r, leir.y + Math.sin(a) * r, 2.2, hash(i, 7));
  }
  const api = { REGLER, STIL, HUS, stil, tilstand, tonet, hex, figurR, folkPlass, hash, klyngeM, av: false };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---------- visningen ----------
  let T = null, M = 1, C = 1, S = 0, nivå = 2;
  // farge som css-tekst med nattfargen på; k gjør den lysere (> 1) eller mørkere (< 1)
  const farge = (h, k = 1, a = 1) => { let c = typeof h === 'string' ? hex(h) : h; if (k !== 1) c = c.map(v => Math.min(255, Math.round(v * k))); c = tonet(c, T); return a < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgb(${c[0]},${c[1]},${c[2]})`; };
  // hvor mye en flate med normalen (nu, nv) i modellen vender mot lyset (nordvest på skjermen): −1 … 1
  const lys = (nu, nv) => (-C * nu + S * nv + S * nu + C * nv) * Math.SQRT1_2;
  const lw = px => px * M;
  const rekt = (g, x0, x1, y0, y1) => { g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); };
  const sirkel = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 6.283); };
  const linje = (g, P) => { g.beginPath(); g.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) g.lineTo(P[i], P[i + 1]); };
  // tegner fn i byggets eget system (meter, fronten mot +x): skjermens x = (X − vx0) / m osv. (y snus)
  function iBygget(g, b, sx, sy, m, fn) { const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0); C = c; S = s; M = m;
    g.save(); nullstill(g); g.transform(c / m, -s / m, -s / m, -c / m, sx(b.x), sy(b.y)); try { fn(); } finally { g.restore(); } }
  // en tegnekrok før oss kan ha latt gjennomsiktighet, blandemodus eller stipling stå igjen på lerretet
  const nullstill = g => { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]); g.shadowColor = 'transparent'; g.shadowBlur = 0; };

  // ---------- takene ----------
  // saltak: mønet langs den lengste siden, lys og mørk takflate, bølgeblikk, pipe, antenne, kors og lysbånd
  function saltak(g, St, K, detalj, delvis) {
    const [x0, x1, y0, y1] = K, langsY = (y1 - y0) >= (x1 - x0), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const flater = langsY ? [[x0, mx, y0, y1, -1, 0], [mx, x1, y0, y1, 1, 0]] : [[x0, x1, y0, my, 0, -1], [x0, x1, my, y1, 0, 1]];
    for (const [a, b, c, d, nu, nv] of flater) { g.fillStyle = farge(St.tak, lys(nu, nv) > 0 ? 1.16 : .82); rekt(g, a, b, c, d); g.fill(); }
    if (St.bølge && detalj >= 2 && .5 / M >= REGLER.stripeMin) { g.strokeStyle = farge('#000000', 1, .13); g.lineWidth = lw(1); g.beginPath();
      if (langsY) for (let y = y0 + .5; y < y1; y += .5) { g.moveTo(x0, y); g.lineTo(x1, y); } else for (let x = x0 + .5; x < x1; x += .5) { g.moveTo(x, y0); g.lineTo(x, y1); } g.stroke(); }
    if (St.lysbånd && detalj >= 1) { g.fillStyle = farge('#c9d6d2', 1, .55); for (const k of [.3, .7]) { if (langsY) { const xa = k < .5 ? (x0 + mx) / 2 : (mx + x1) / 2; for (let y = y0 + 1.2; y < y1 - 1.5; y += 3) { rekt(g, xa - .5, xa + .5, y, y + 1.6); g.fill(); } } } }
    if (St.kors && detalj >= 1) { const r = Math.min(x1 - x0, y1 - y0) * .22; g.fillStyle = farge('#e4e1d8'); rekt(g, mx - r, mx + r, my - r, my + r); g.fill();
      g.fillStyle = farge('#b5191c'); rekt(g, mx - r * .75, mx + r * .75, my - r * .25, my + r * .25); g.fill(); rekt(g, mx - r * .25, mx + r * .25, my - r * .75, my + r * .75); g.fill(); }
    g.strokeStyle = farge(St.tak, 1.45); g.lineWidth = lw(detalj >= 1 ? 1.3 : 1); linje(g, langsY ? [mx, y0, mx, y1] : [x0, my, x1, my]); g.stroke();
    if (delvis) return;
    if (St.pipe && detalj >= 1) { const [px, py] = St.pipe; g.fillStyle = farge('#4a4b48'); rekt(g, px - .35, px + .35, py - .35, py + .35); g.fill(); g.fillStyle = farge('#151617'); sirkel(g, px, py, .2); g.fill(); }
    if (St.antenne && detalj >= 1) { const [ax, ay] = St.antenne; g.strokeStyle = farge('#c9cbc8'); g.lineWidth = lw(1.2); linje(g, [ax - 1, ay, ax + 1, ay]); g.stroke(); linje(g, [ax, ay - .8, ax, ay + .8]); g.stroke();
      g.fillStyle = farge('#d8d6cf'); sirkel(g, ax + 2.2, ay + 1.6, .55); g.fill(); g.strokeStyle = farge('#6c6b66'); g.lineWidth = lw(.8); g.stroke(); }
  }
  function flatt(g, St, K, detalj) { const [x0, x1, y0, y1] = K; g.fillStyle = farge(St.tak, 1.12); rekt(g, x0, x1, y0, y1); g.fill();
    if (detalj >= 1) { const i = Math.min(.4, (x1 - x0) * .12); g.fillStyle = farge(St.tak, .9); rekt(g, x0 + i, x1 - i, y0 + i, y1 - i); g.fill(); } }
  // de andre formene
  const FORM = {
    sal: saltak, flat: flatt,
    glass(g, St, K, detalj) { const [x0, x1, y0, y1] = K; g.fillStyle = farge('#4a3f30'); rekt(g, x0, x1, y0, y1); g.fill();
      // plantene under glasset: grønne rader
      if (detalj >= 1) { g.fillStyle = farge('#4f7a3a'); for (let x = x0 + .8; x < x1 - .4; x += 1.1) { rekt(g, x - .3, x + .3, y0 + .5, y1 - .5); g.fill(); } }
      for (const [a, b, nu] of [[x0, (x0 + x1) / 2, -1], [(x0 + x1) / 2, x1, 1]]) { g.fillStyle = farge(St.tak, lys(nu, 0) > 0 ? 1.12 : .92, .5); rekt(g, a, b, y0, y1); g.fill(); }
      g.strokeStyle = farge('#e8ecea', 1, .7); g.lineWidth = lw(detalj >= 2 ? 1 : .8); g.beginPath(); for (let y = y0; y <= y1 + .01; y += detalj >= 1 ? 1.25 : 2.5) { g.moveTo(x0, y); g.lineTo(x1, y); } g.moveTo((x0 + x1) / 2, y0); g.lineTo((x0 + x1) / 2, y1); g.stroke();
      g.strokeStyle = farge('#cfd6d2'); g.lineWidth = lw(1.2); rekt(g, x0, x1, y0, y1); g.stroke(); },
    telt(g, St, K, detalj) { const [x0, x1, y0, y1] = K, my = (y0 + y1) / 2;
      if (detalj >= 1 && St.plugger) { g.strokeStyle = farge('#d8cfae', 1, .7); g.lineWidth = lw(.8); g.beginPath();
        for (const x of [x0 + .5, (x0 + x1) / 2, x1 - .5]) for (const sy of [-1, 1]) { g.moveTo(x, sy > 0 ? y1 : y0); g.lineTo(x, sy * St.plugger + my); } g.stroke();
        g.fillStyle = farge('#3a3026'); for (const x of [x0 + .5, (x0 + x1) / 2, x1 - .5]) for (const sy of [-1, 1]) { sirkel(g, x, sy * St.plugger + my, .12); g.fill(); } }
      for (const [c, d, nv] of [[y0, my, -1], [my, y1, 1]]) { g.fillStyle = farge(St.tak, lys(0, nv) > 0 ? 1.18 : .8); rekt(g, x0, x1, c, d); g.fill(); }
      // buene i teltet og mønet
      if (detalj >= 1) { g.strokeStyle = farge(St.tak, .62); g.lineWidth = lw(1); g.beginPath(); for (let x = x0 + 2; x < x1 - .5; x += 2) { g.moveTo(x, y0); g.lineTo(x, y1); } g.stroke(); }
      g.strokeStyle = farge(St.tak, 1.45); g.lineWidth = lw(1.2); linje(g, [x0, my, x1, my]); g.stroke();
      // åpningen mot +x
      if (detalj >= 1) { g.fillStyle = farge('#1d1f1a'); rekt(g, x1 - .15, x1 + .1, my - .9, my + .9); g.fill(); } },
    kasse(g, St, K, detalj) { const [x0, x1, y0, y1] = K, langsX = (x1 - x0) >= (y1 - y0);
      g.fillStyle = farge(St.tak); rekt(g, x0, x1, y0, y1); g.fill();
      if (St.ribber && detalj >= 1 && .35 / M >= REGLER.stripeMin * .8) { g.strokeStyle = farge(St.tak, 1.3); g.lineWidth = lw(1); g.beginPath();
        if (langsX) for (let x = x0 + .35; x < x1; x += .35) { g.moveTo(x, y0 + .08); g.lineTo(x, y1 - .08); } else for (let y = y0 + .35; y < y1; y += .35) { g.moveTo(x0 + .08, y); g.lineTo(x1 - .08, y); } g.stroke(); }
      if (St.rist && detalj >= 1) { g.fillStyle = farge('#2a2c2e'); rekt(g, x1 - .7, x1 - .15, y0 + .2, y1 - .2); g.fill(); g.strokeStyle = farge('#6c6b66'); g.lineWidth = lw(.8); g.beginPath(); for (let y = y0 + .35; y < y1 - .2; y += .25) { g.moveTo(x1 - .65, y); g.lineTo(x1 - .2, y); } g.stroke(); }
      if (St.eksos && detalj >= 1) { const [ex, ey] = St.eksos; g.fillStyle = farge('#151617'); sirkel(g, ex, ey, .16); g.fill(); }
      if (St.luker && detalj >= 1) { g.strokeStyle = farge(St.tak, .65); g.lineWidth = lw(1); for (let k = 0; k < St.luker; k++) { const a = x0 + .3 + k * (x1 - x0 - .6) / St.luker; rekt(g, a + .1, a + (x1 - x0 - .6) / St.luker - .1, y0 + .3, y1 - .3); g.stroke(); } }
      if (St.stripe && detalj >= 1) { g.fillStyle = farge(St.stripe); rekt(g, x0, x0 + .25, y0, y1); g.fill(); }
      g.strokeStyle = farge(St.tak, .6); g.lineWidth = lw(1); rekt(g, x0, x1, y0, y1); g.stroke(); },
    tank(g, St, K, detalj) { const [x0, x1, y0, y1] = K;
      // oppsamlingskaret i betong og sylinderen som ligger langs y, lys på siden mot nordvest
      g.fillStyle = farge('#8f8d87'); rekt(g, x0, x1, y0, y1); g.fill(); g.fillStyle = farge('#6c6b66'); rekt(g, x0 + .3, x1 - .3, y0 + .3, y1 - .3); g.fill();
      const r = (x1 - x0) / 2 - .75, mx = (x0 + x1) / 2, ya = y0 + .7, yb = y1 - .7, lysSide = lys(1, 0) > 0 ? 1 : -1;
      const gr = g.createLinearGradient(mx - r * lysSide, 0, mx + r * lysSide, 0); gr.addColorStop(0, farge(St.tak, .62)); gr.addColorStop(.62, farge(St.tak, 1.08)); gr.addColorStop(.8, farge(St.tak, 1.3)); gr.addColorStop(1, farge(St.tak, .95));
      g.fillStyle = gr; g.beginPath(); g.moveTo(mx - r, ya); g.lineTo(mx - r, yb); g.arc(mx, yb, r, Math.PI, 0, true); g.lineTo(mx + r, ya); g.arc(mx, ya, r, 0, Math.PI, true); g.fill();
      if (detalj >= 1) { g.strokeStyle = farge('#5e6366'); g.lineWidth = lw(1); g.beginPath(); for (const y of [ya + 1.2, (ya + yb) / 2, yb - 1.2]) { g.moveTo(mx - r, y); g.lineTo(mx + r, y); } g.stroke();
        g.fillStyle = farge('#c9a227'); rekt(g, mx - .25, mx + .25, ya - .2, ya + 1); g.fill(); }
      if (St.pumpe && detalj >= 1) { const [a, b, c, d] = St.pumpe; g.fillStyle = farge('#7d2f25'); rekt(g, a, b, c, d); g.fill(); g.fillStyle = farge('#2a2c2e'); sirkel(g, (a + b) / 2, (c + d) / 2, .18); g.fill(); } },
    panel(g, St, K, detalj) { const [x0, x1, y0, y1] = K; g.fillStyle = farge('#9ba1a4'); rekt(g, x0, x1, y0, y1); g.fill();
      const nx = 5, ny = 2, w = (x1 - x0 - .3) / nx, h = (y1 - y0 - .3) / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const a = x0 + .15 + i * w, c = y0 + .15 + j * h; g.fillStyle = farge(St.tak, 1 + .08 * ((i + j) % 2)); rekt(g, a + .06, a + w - .06, c + .06, c + h - .06); g.fill();
        if (detalj >= 2) { g.strokeStyle = farge('#5f7896', 1, .55); g.lineWidth = lw(.6); g.beginPath(); for (let k = 1; k < 3; k++) { g.moveTo(a + k * w / 3, c + .06); g.lineTo(a + k * w / 3, c + h - .06); } g.moveTo(a + .06, c + h / 2); g.lineTo(a + w - .06, c + h / 2); g.stroke(); } }
      // et skjær av himmelen på glasset
      if (detalj >= 1) { g.strokeStyle = farge('#dfe8f2', 1, .3); g.lineWidth = lw(3); linje(g, [x0 + 1, y1 - .4, x0 + 2.6, y0 + .4]); g.stroke(); } },
    tårn(g, St, K, detalj) { const [x0, x1, y0, y1] = K, b = St.bein;
      if (detalj >= 1) { g.strokeStyle = farge('#4f4132'); g.lineWidth = lw(2); g.beginPath(); for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(u * b, v * b); g.lineTo(u * x1 * .9, v * y1 * .9); } g.stroke(); }
      g.fillStyle = farge('#6e5b45'); rekt(g, x0 - .25, x1 + .25, y0 - .25, y1 + .25); g.fill();
      // pyramidetaket: fire trekanter mot toppen, lys etter retningen
      const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], N = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      for (let i = 0; i < 4; i++) { const a = P[i], c = P[(i + 1) % 4]; g.fillStyle = farge(St.tak, .95 + .3 * lys(...N[i])); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(c[0], c[1]); g.lineTo(0, 0); g.closePath(); g.fill(); }
      if (detalj >= 1) { g.fillStyle = farge('#f1e6b8'); sirkel(g, x1 + .35, 0, .28); g.fill(); } },
    mast(g, St, K, detalj) {
      if (St.barduner) { const R = St.barduner; if (detalj >= 1) { g.strokeStyle = farge('#d8d6cf', 1, .55); g.lineWidth = lw(.8); g.beginPath(); for (let k = 0; k < 3; k++) { const a = 1.57 + k * 2.094; g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); } g.stroke();
          g.fillStyle = farge('#6c6b66'); for (let k = 0; k < 3; k++) { const a = 1.57 + k * 2.094; rekt(g, Math.cos(a) * R - .3, Math.cos(a) * R + .3, Math.sin(a) * R - .3, Math.sin(a) * R + .3); g.fill(); } }
        // fagverket sett ovenfra: en trekant med avstivning
        const r = .85, P = [0, 1, 2].map(k => [Math.cos(1.57 + k * 2.094) * r, Math.sin(1.57 + k * 2.094) * r]);
        g.fillStyle = farge('#3a3c3e', 1, .5); g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[1]); g.lineTo(...P[2]); g.closePath(); g.fill();
        g.strokeStyle = farge(St.tak, 1.1); g.lineWidth = lw(1.4); g.stroke(); g.lineWidth = lw(.8); g.beginPath(); for (const p of P) { g.moveTo(0, 0); g.lineTo(...p); } g.stroke();
        g.fillStyle = farge('#b3241f'); sirkel(g, 0, 0, .22); g.fill(); return; }
      g.fillStyle = farge('#8f8d87'); rekt(g, -.5, .5, -.5, .5); g.fill(); g.fillStyle = farge(St.tak); sirkel(g, 0, 0, .22); g.fill(); g.fillStyle = farge('#2a2c2e'); rekt(g, .1, .75, -.2, .2); g.fill();
      if (detalj >= 1) { g.fillStyle = farge('#22324a'); rekt(g, -.6, -.15, -.3, .3); g.fill(); } },
    pad(g, St, K, detalj) { const [x0, x1, y0, y1] = K; g.fillStyle = farge(St.tak); rekt(g, x0, x1, y0, y1); g.fill();
      if (detalj >= 1) { g.strokeStyle = farge('#6c6b66', 1, .6); g.lineWidth = lw(1); g.beginPath(); for (let x = x0 + 5.45; x < x1; x += 5.45) { g.moveTo(x, y0); g.lineTo(x, y1); } for (let y = y0 + 5.45; y < y1; y += 5.45) { g.moveTo(x0, y); g.lineTo(x1, y); } g.stroke(); }
      g.strokeStyle = farge('#d9b43a'); g.lineWidth = .5; sirkel(g, 0, 0, 8.5); g.stroke();
      g.fillStyle = farge('#ecebe4'); rekt(g, -3, -1.9, -3.6, 3.6); g.fill(); rekt(g, 1.9, 3, -3.6, 3.6); g.fill(); rekt(g, -1.9, 1.9, -.55, .55); g.fill();
      if (detalj >= 1) { g.fillStyle = farge('#e8d27a'); for (let k = 0; k < 12; k++) { const a = k * .5236; sirkel(g, Math.cos(a) * 10.2, Math.sin(a) * 10.2, .18); g.fill(); }
        if (St.vindpose) { const [wx, wy] = St.vindpose; g.fillStyle = farge('#5e6366'); sirkel(g, wx, wy, .15); g.fill(); g.fillStyle = farge('#cf5f1f'); g.beginPath(); g.moveTo(wx, wy - .35); g.lineTo(wx + 2, wy - .1); g.lineTo(wx, wy + .35); g.closePath(); g.fill(); } } },
    voll(g, St, K, detalj) { const [x0, x1, y0, y1] = K, w = x1 - x0;
      for (let rad = 0; rad < 2; rad++) for (let y = y0 + (rad ? .3 : 0); y < y1 - .1; y += .6) { g.fillStyle = farge(St.tak, rad ? 1.1 : .9); g.beginPath(); g.ellipse(x0 + w * (rad ? .68 : .32), y + .3, w * .38, .3, 0, 0, 6.283); g.fill();
        if (detalj >= 2) { g.strokeStyle = farge(St.tak, .6); g.lineWidth = lw(.7); g.stroke(); } } },
    port(g, St, K, detalj) { const [x0, x1, y0, y1] = K;
      // bommen over åpningen (rød og hvit), stolpene og vaktbua med flatt tak
      const ya = -6.6, yb = y0 - .1, n = 8; for (let k = 0; k < n; k++) { g.fillStyle = farge(k % 2 ? '#e4e1d8' : '#b3241f'); rekt(g, -.14, .14, ya + (yb - ya) * k / n, ya + (yb - ya) * (k + 1) / n); g.fill(); }
      g.fillStyle = farge('#4a4b48'); rekt(g, -.35, .35, -7.1, -6.4); g.fill(); rekt(g, -.35, .35, y0 - .5, y0 + .1); g.fill();
      flatt(g, St, K, detalj); if (detalj >= 1) { g.fillStyle = farge('#1f2b33'); rekt(g, x1 - .1, x1 + .05, y0 + .5, y1 - .5); g.fill(); } },
    brønn(g, St, K, detalj) { g.fillStyle = farge(St.tak); sirkel(g, 0, 0, 1.25); g.fill(); g.fillStyle = farge('#1d2830'); sirkel(g, 0, 0, .75); g.fill();
      if (detalj >= 1) { g.strokeStyle = farge('#6c6b66'); g.lineWidth = lw(.8); for (let k = 0; k < 10; k++) { const a = k * .628; linje(g, [Math.cos(a) * .78, Math.sin(a) * .78, Math.cos(a) * 1.24, Math.sin(a) * 1.24]); g.stroke(); } }
      g.fillStyle = farge('#6e5b45'); rekt(g, -1.5, 1.5, -.12, .12); g.fill(); },
    stein(g, St, K, detalj) { g.fillStyle = farge('#a59f90'); sirkel(g, 0, 0, 1.55); g.fill(); g.fillStyle = farge(St.tak); rekt(g, -.8, .8, -.35, .35); g.fill(); g.fillStyle = farge(St.tak, 1.3); rekt(g, -.8, .8, -.35, -.15); g.fill();
      if (detalj >= 1) { const F = ['#c9a227', '#b3241f', '#e4e1d8']; for (let k = 0; k < 6; k++) { g.fillStyle = farge(F[k % 3]); sirkel(g, Math.cos(k) * 1.1, Math.sin(k * 1.7) * 1.1, .12); g.fill(); } } },
    åker(g, St, K, detalj) { const [x0, x1, y0, y1] = K, langsX = (x1 - x0) >= (y1 - y0); g.fillStyle = farge(St.tak); rekt(g, x0, x1, y0, y1); g.fill();
      const steg = .8 / M >= REGLER.stripeMin ? .8 : Math.max(.8, 4 * M); g.strokeStyle = farge('#5c7a3a', 1, .85); g.lineWidth = Math.max(lw(1.2), steg * .35); g.beginPath();
      if (langsX) for (let y = y0 + steg / 2; y < y1; y += steg) { g.moveTo(x0 + .3, y); g.lineTo(x1 - .3, y); } else for (let x = x0 + steg / 2; x < x1; x += steg) { g.moveTo(x, y0 + .3); g.lineTo(x, y1 - .3); } g.stroke(); },
  };

  // ---------- skygge (under alle byggene: tegnes først) ----------
  function hull2d(P) { P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const k = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), H = [];
    for (const p of P) { while (H.length >= 2 && k(H[H.length - 2], H[H.length - 1], p) <= 0) H.pop(); H.push(p); }
    for (let i = P.length - 2, t = H.length + 1; i >= 0; i--) { const p = P[i]; while (H.length >= t && k(H[H.length - 2], H[H.length - 1], p) <= 0) H.pop(); H.push(p); }
    H.pop(); return H; }
  function skygge(g, b, sx, sy, m) { const B = rot.Leir && Leir.BYGG[b.type]; if (!B || B.linje || B.del) return; if (klyngePå(m)) return; const St = stil(b.type, B); if (!St.kropp || St.h < .5) return;
    const t = tilstand(b); if (t.navn === 'kø') return; const h = t.navn === 'ødelagt' ? .6 : t.navn === 'bygges' ? St.h * (.25 + .75 * t.p) : St.h, d = Math.min(REGLER.skyggeMaks, h * REGLER.skygge / m); if (d < .6) return;
    const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), [x0, x1, y0, y1] = St.kropp, til = (u, v) => [sx(b.x + u * c - v * s), sy(b.y + u * s + v * c)];
    g.save(); nullstill(g); g.fillStyle = 'rgba(6,5,3,.36)';
    if (St.form === 'mast') { const [a, e] = til(0, 0); g.strokeStyle = 'rgba(6,5,3,.32)'; g.lineWidth = Math.max(1.5, .5 / m); g.beginPath(); g.moveTo(a, e); g.lineTo(a + d, e + d); g.stroke(); g.restore(); return; }
    const P = [til(x0, y0), til(x1, y0), til(x1, y1), til(x0, y1)], H = hull2d([...P, ...P.map(([x, y]) => [x + d, y + d])]);
    g.beginPath(); g.moveTo(...H[0]); for (const q of H.slice(1)) g.lineTo(...q); g.closePath(); g.fill(); g.restore(); }

  // ---------- byggeplass, skade og ruiner ----------
  function byggeplass(g, St, K, t, detalj, b) { const [x0, x1, y0, y1] = K, p = t.p, hus = HUS.has(St.form);
    g.fillStyle = farge('#6b5a44', 1, .85); rekt(g, x0 - 1.2, x1 + 1.2, y0 - 1.2, y1 + 1.2); g.fill();
    if (t.navn === 'kø' || (p < .02 && hus)) { // stikker og snor
      g.strokeStyle = farge('#efe2b4', 1, .85); g.lineWidth = lw(1); g.setLineDash([lw(4), lw(3)]); rekt(g, x0, x1, y0, y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = farge('#d0a85a'); for (const [u, v] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) { rekt(g, u - .15, u + .15, v - .15, v + .15); g.fill(); } return; }
    if (!hus) { // ikke hus (voll, plass, mast, panel …): det som er ferdig, tegnes fra den ene enden
      g.save(); const langsY = (y1 - y0) >= (x1 - x0); if (langsY) rekt(g, x0 - 9, x1 + 9, y0 - 9, y0 + (y1 - y0) * p); else rekt(g, x0 - 9, x0 + (x1 - x0) * p, y0 - 9, y1 + 9); g.clip();
      (FORM[St.form] || flatt)(g, St, K, detalj); g.restore(); return; }
    // grunnmur med forskaling
    g.fillStyle = farge('#9a978f'); rekt(g, x0, x1, y0, y1); g.fill(); g.strokeStyle = farge('#8a7457'); g.lineWidth = lw(1.5); g.stroke();
    // reisverket (vegger og stendere) fra 25 %, taket legges fra den ene enden fra 45 %
    if (p > .25) { g.strokeStyle = farge('#a08a62'); g.lineWidth = Math.max(lw(1.5), .2); rekt(g, x0 + .1, x1 - .1, y0 + .1, y1 - .1); g.stroke();
      if (detalj >= 1) { g.fillStyle = farge('#8a7457'); for (let u = x0 + .1; u <= x1; u += 1.2) for (const v of [y0 + .1, y1 - .1]) { rekt(g, u - .08, u + .08, v - .08, v + .08); g.fill(); }
        for (let v = y0 + .1; v <= y1; v += 1.2) for (const u of [x0 + .1, x1 - .1]) { rekt(g, u - .08, u + .08, v - .08, v + .08); g.fill(); } } }
    const q = Math.max(0, Math.min(1, (p - .45) / .5)), langsY = (y1 - y0) >= (x1 - x0);
    if (p > .35) { g.strokeStyle = farge('#b39a6c'); g.lineWidth = Math.max(lw(1), .12); g.beginPath();
      if (langsY) for (let v = y0 + .3; v < y1; v += .9) { g.moveTo(x0, v); g.lineTo(x1, v); } else for (let u = x0 + .3; u < x1; u += .9) { g.moveTo(u, y0); g.lineTo(u, y1); } g.stroke(); }
    if (q > 0) { g.save(); if (langsY) rekt(g, x0 - 1, x1 + 1, y0 - 1, y0 + (y1 - y0) * q); else rekt(g, x0 - 1, x0 + (x1 - x0) * q, y0 - 1, y1 + 1); g.clip(); (FORM[St.form] || flatt)(g, St, K, detalj, true); g.restore(); }
    if (p > .08 && p < .97) stillas(g, K, detalj);
    // materialene ved siden av: plankestabel og en pall med sekker
    if (detalj >= 1 && p < .9) { const u = x0 - 2.3, v = y0 + 1; for (let k = 0; k < 4; k++) { g.fillStyle = farge('#b39a6c', 1 - k * .06); rekt(g, u, u + .9, v + k * .28, v + k * .28 + .24); g.fill(); }
      g.fillStyle = farge('#7f786b'); rekt(g, u - .1, u + 1, v + 1.5, v + 2.5); g.fill(); g.fillStyle = farge('#cfc6b0'); for (let k = 0; k < 4; k++) { rekt(g, u + (k % 2) * .48, u + (k % 2) * .48 + .4, v + 1.55 + Math.floor(k / 2) * .48, v + 1.55 + Math.floor(k / 2) * .48 + .4); g.fill(); } }
  }
  function stillas(g, K, detalj) { const [x0, x1, y0, y1] = K, a = .7, c = 1.5;
    g.strokeStyle = farge('#b8a074', 1, .9); g.lineWidth = .55; rekt(g, x0 - (a + c) / 2, x1 + (a + c) / 2, y0 - (a + c) / 2, y1 + (a + c) / 2); g.stroke();
    g.strokeStyle = farge('#a9b0b4'); g.lineWidth = Math.max(lw(1), .06); rekt(g, x0 - a, x1 + a, y0 - a, y1 + a); g.stroke(); rekt(g, x0 - c, x1 + c, y0 - c, y1 + c); g.stroke();
    if (detalj >= 1) { g.beginPath(); for (let u = x0 - c; u <= x1 + c; u += 2) for (const [v1, v2] of [[y0 - c, y0 - a], [y1 + a, y1 + c]]) { g.moveTo(u, v1); g.lineTo(u, v2); } for (let v = y0 - c; v <= y1 + c; v += 2) for (const [u1, u2] of [[x0 - c, x0 - a], [x1 + a, x1 + c]]) { g.moveTo(u1, v); g.lineTo(u2, v); } g.stroke(); } }
  function skade(g, St, K, hp, id, detalj) { const [x0, x1, y0, y1] = K, w = x1 - x0, h = y1 - y0, r0 = Math.min(w, h);
    const n = Math.ceil((1 - hp) * 6);
    for (let k = 0; k < n; k++) { const u = x0 + hash(id, k * 3 + 1) * w, v = y0 + hash(id, k * 3 + 2) * h, r = r0 * (.18 + .25 * hash(id, k * 3 + 3)), gr = g.createRadialGradient(u, v, 0, u, v, r);
      gr.addColorStop(0, 'rgba(14,11,8,.62)'); gr.addColorStop(1, 'rgba(14,11,8,0)'); g.fillStyle = gr; sirkel(g, u, v, r); g.fill(); }
    if (hp < REGLER.hull && St.form !== 'mast' && St.form !== 'pad') { const nh = hp < .3 ? 2 : 1;
      for (let k = 0; k < nh; k++) { const u = x0 + (.25 + .5 * hash(id, 40 + k)) * w, v = y0 + (.25 + .5 * hash(id, 50 + k)) * h, r = Math.max(.5, r0 * (.14 + .1 * hash(id, 60 + k)));
        g.beginPath(); for (let j = 0; j < 9; j++) { const a = j / 9 * 6.283, q = r * (.6 + .55 * hash(id * 9 + k, j)); j ? g.lineTo(u + Math.cos(a) * q, v + Math.sin(a) * q) : g.moveTo(u + Math.cos(a) * q, v + Math.sin(a) * q); } g.closePath();
        g.fillStyle = farge('#120f0c'); g.fill(); g.strokeStyle = farge('#3a2a1c'); g.lineWidth = Math.max(lw(1.5), .15); g.stroke();
        // sperrene synes gjennom hullet
        if (detalj >= 1) { g.save(); g.clip(); g.strokeStyle = farge('#6e5b45'); g.lineWidth = Math.max(lw(1.2), .14); g.beginPath(); const langsY = h >= w; for (let s = -2; s <= 2; s++) { if (langsY) { g.moveTo(x0, v + s * .9); g.lineTo(x1, v + s * .9); } else { g.moveTo(u + s * .9, y0); g.lineTo(u + s * .9, y1); } } g.stroke(); g.restore(); } } }
    if (hp < REGLER.rusk && detalj >= 1) rusk(g, K, id, 10); }
  function rusk(g, K, id, n) { const [x0, x1, y0, y1] = K, F = ['#4a4b48', '#6e5b45', '#2a2c2e', '#7f786b'];
    for (let k = 0; k < n; k++) { const s = hash(id, 100 + k), a = s * 6.283, kant = hash(id, 120 + k) < .5, u = kant ? (x0 + x1) / 2 + Math.cos(a) * ((x1 - x0) / 2 + .4 + hash(id, 140 + k) * 1.4) : x0 + hash(id, 160 + k) * (x1 - x0), v = kant ? (y0 + y1) / 2 + Math.sin(a) * ((y1 - y0) / 2 + .4 + hash(id, 180 + k) * 1.4) : y0 + hash(id, 200 + k) * (y1 - y0), r = .15 + hash(id, 220 + k) * .35;
      g.fillStyle = farge(F[k % 4]); g.beginPath(); g.moveTo(u - r, v); g.lineTo(u, v - r * .7); g.lineTo(u + r, v + r * .2); g.lineTo(u - r * .2, v + r * .8); g.closePath(); g.fill(); } }
  function ruin(g, St, K, id, detalj) { const [x0, x1, y0, y1] = K, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) * .7, gr = g.createRadialGradient(mx, my, 0, mx, my, R);
    gr.addColorStop(0, 'rgba(18,14,10,.85)'); gr.addColorStop(.7, 'rgba(26,20,14,.55)'); gr.addColorStop(1, 'rgba(26,20,14,0)'); g.fillStyle = gr; sirkel(g, mx, my, R); g.fill();
    if (!HUS.has(St.form)) { rusk(g, K, id, 8); return; }
    g.fillStyle = farge('#4a4844'); rekt(g, x0, x1, y0, y1); g.fill();
    // murrester langs deler av omrisset, forkullede bjelker og rusk
    const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; g.strokeStyle = farge('#7c7a74'); g.lineWidth = Math.max(lw(2), .3); g.beginPath();
    for (let i = 0; i < 4; i++) { const a = P[i], c = P[(i + 1) % 4], t0 = hash(id, 300 + i) * .5, t1 = t0 + .2 + hash(id, 310 + i) * .3; g.moveTo(a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0); g.lineTo(a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1); } g.stroke();
    if (detalj >= 1) { g.strokeStyle = farge('#1c1712'); g.lineWidth = Math.max(lw(1.5), .2); g.beginPath(); for (let k = 0; k < 4; k++) { const u = x0 + hash(id, 320 + k) * (x1 - x0), v = y0 + hash(id, 330 + k) * (y1 - y0), a = hash(id, 340 + k) * 3.14; g.moveTo(u - Math.cos(a) * 1.4, v - Math.sin(a) * 1.4); g.lineTo(u + Math.cos(a) * 1.4, v + Math.sin(a) * 1.4); } g.stroke(); }
    rusk(g, K, id, 14); }
  // lys fra vinduene om natta: varme flekker på bakken langs langveggene og ved døra
  function vinduslys(g, St, K, styrke) { const [x0, x1, y0, y1] = K, langsY = (y1 - y0) >= (x1 - x0), n = St.vinduer || 2, a = Math.min(.55, styrke);
    const flekk = (u, v, r) => { const gr = g.createRadialGradient(u, v, 0, u, v, r); gr.addColorStop(0, `rgba(255,206,120,${a})`); gr.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gr; sirkel(g, u, v, r); g.fill(); };
    for (let k = 0; k < n; k++) { const t = (k + .5) / n; if (langsY) { flekk(x0 - .3, y0 + (y1 - y0) * t, 2.2); flekk(x1 + .3, y0 + (y1 - y0) * t, 2.2); } else { flekk(x0 + (x1 - x0) * t, y0 - .3, 2.2); flekk(x0 + (x1 - x0) * t, y1 + .3, 2.2); } }
    flekk(x1 + .8, (y0 + y1) / 2, 3.2); }

  // ---------- ett bygg ----------
  // o: { sx, sy, m, skisse, ok, valgt, mangler (uten strøm), aktiv (i arbeid nå), fraksjon (farge) }
  function tegnBygg(g, b, o) { const B = rot.Leir && Leir.BYGG[b.type]; if (!B || B.linje) return false; const St = stil(b.type, B); if (!St.kropp) return false;
    const m = o.m, detalj = m < REGLER.nær ? 2 : m < REGLER.middels ? 1 : 0, t = o.skisse ? { navn: 'ferdig', p: 1 } : tilstand(b, { aktiv: o.aktiv }), K = St.kropp, id = (b.id || 0) + 7;
    iBygget(g, b, o.sx, o.sy, m, () => {
      // det som hører til bygget på bakken: trapp/forplass i betong
      if (detalj >= 1 && t.navn !== 'kø' && t.navn !== 'ødelagt') { const pl = St.plass === true ? St.trapp : St.plass; if (pl) { g.fillStyle = farge('#8f8d87', 1, o.skisse ? .5 : 1); rekt(g, pl[0], pl[1], pl[2], pl[3]); g.fill();
          if (St.porter) { g.fillStyle = farge('#2a2c2e', 1, .3); sirkel(g, (pl[0] + pl[1]) / 2, St.porter[0], 1.1); g.fill(); } }
        else if (St.trapp) { g.fillStyle = farge('#8f8d87', 1, o.skisse ? .5 : 1); rekt(g, ...St.trapp); g.fill(); } }
      // lys i vinduene bare i bygg med vinduer som virker og har strøm (ikke avslått)
      if (o.lys > 0 && St.vinduer && !o.mangler && !b.av && !o.skisse && (t.navn === 'ferdig' || t.navn === 'skadet' || t.navn === 'oppgrader' || t.navn === 'reparer')) vinduslys(g, St, K, o.lys);
      if (o.skisse) g.globalAlpha = .6;
      if (t.navn === 'ødelagt') ruin(g, St, K, id, detalj);
      else if (t.navn === 'kø' || t.navn === 'bygges') byggeplass(g, St, K, t, detalj, b);
      else { if (detalj === 0 && St.form !== 'mast' && St.form !== 'pad' && St.form !== 'åker') { g.fillStyle = farge(St.tak, St.form === 'glass' ? .8 : 1); rekt(g, ...K); g.fill(); if (St.form === 'sal' || St.form === 'telt') saltak(g, St, K, 0, true); }
        else (FORM[St.form] || flatt)(g, St, K, detalj);
        if (St.porter && detalj >= 1) { g.fillStyle = farge('#3a3c3e'); for (const v of St.porter) { rekt(g, K[1] - .15, K[1] + .1, v - 2.2, v + 2.2); g.fill(); } }
        if (St.røyk && detalj >= 1 && St.pipe && !o.skisse) { for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(200,198,190,${.22 - k * .06})`; sirkel(g, St.pipe[0] + .6 + k * .9, St.pipe[1] - .3 - k * .5, .45 + k * .3); g.fill(); } }
        if (t.navn === 'skadet' || (b.hp < 1 && b.hp > 0)) skade(g, St, K, b.hp, id, detalj);
        if (t.navn === 'reparer' || t.navn === 'oppgrader') stillas(g, K, detalj);
        if (t.navn === 'flytt') { g.strokeStyle = farge('#efe2b4', 1, .9); g.lineWidth = lw(1.2); g.setLineDash([lw(5), lw(4)]); rekt(g, K[0] - .8, K[1] + .8, K[2] - .8, K[3] + .8); g.stroke(); g.setLineDash([]); } }
      g.globalAlpha = 1;
      // skissen: grønn eller rød over omrisset
      if (o.skisse) { const H = B.fot; g.fillStyle = o.ok ? 'rgba(110,200,105,.38)' : 'rgba(224,96,74,.42)'; rekt(g, H[0], H[1], H[2], H[3]); g.fill(); g.strokeStyle = o.ok ? '#7fd17a' : '#e0604a'; g.lineWidth = lw(1.6); g.stroke(); return; }
      // kanten: valgt = gul, uten strøm eller hardt skadet = rød, ellers fraksjonens farge (tynn)
      if (St.form === 'mast' && !o.valgt) return;
      const rød = o.mangler || (b.hp < .5 && b.hp > 0);
      g.strokeStyle = o.valgt ? '#f0d79a' : rød ? '#e0604a' : (o.fraksjon || '#5b7ea8'); g.lineWidth = lw(o.valgt ? 2.5 : rød ? 1.6 : 1.1); g.globalAlpha = o.valgt || rød ? 1 : .8;
      const k = St.form === 'mast' ? 1.2 : t.navn === 'kø' || t.navn === 'bygges' ? 1.2 : 0; rekt(g, K[0] - k, K[1] + k, K[2] - k, K[3] + k); g.stroke(); g.globalAlpha = 1;
    });
    return true; }
  // HURTIGLAGER (ytelse): et bygg som ser likt ut som i forrige bilde (samme målestokk, tilstand, natt …), tegnes én gang på et eget
  // lite lerret og så bare limes inn – kartet tegnes på nytt mange ganger i sekundet når lagene går. Mens du zoomer (målestokken
  // endrer seg fra bilde til bilde), tegnes byggene rett på kartet. Lageret tømmes når målestokken endres.
  const LAGER = new Map(); let lagerM = 0, forrigeM = 0, tNøkkel = '';
  // KLYNGEN (runde 12): langt ute er leiren en liten klynge bygg rundt flagget i stedet for usynlige prikker. Ikke mens du bygger
  // (skissen står i ekte målestokk) – da tegnes alt som før.
  function klyngePå(m) { if (m < REGLER.klynge.fra || api.av) return false; if (rot.BYGGEVISNING && BYGGEVISNING.på && BYGGEVISNING.på()) return false;
    const p = rot.LeirSpill && LeirSpill.plassering && LeirSpill.plassering(); return !p; }
  const leirMidt = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return S && S.leir ? S.leir : null; };
  function klyngeBygg(g, b, o, St) { const K = REGLER.klynge, m = o.m; if (m > K.maks) return true; const L = leirMidt(); if (!L) return false;
    const me = klyngeM(m), cx = o.sx(L.x) + (b.x - L.x) / me, cy = o.sy(L.y) - (b.y - L.y) / me, t = tilstand(b, { aktiv: o.aktiv });
    if (cx < -30 || cy < -30 || cx > VW + 30 || cy > VH + 30) return true;
    const [x0, x1, y0, y1] = St.kropp; let a = (x1 - x0) / me, c = (y1 - y0) / me; const lang = a >= c;
    // minst kort × lang punkter (langs byggets lengste side)
    if (lang) { a = Math.max(a, K.lang); c = Math.max(c, K.kort); } else { a = Math.max(a, K.kort); c = Math.max(c, K.lang); }
    g.save(); nullstill(g); g.translate(cx, cy); g.rotate(-(b.ret || 0));
    if (St.form === 'mast') { g.fillStyle = farge('#2a2c2e'); sirkel(g, 0, 0, 2); g.fill(); g.restore(); if (rot.Etikett) Etikett.hinder(cx - 3, cy - 3, 6, 6); return true; }
    if (St.form === 'pad') { const r = Math.max(4, (x1 - x0) / me / 2); g.fillStyle = farge(St.tak, 1, .9); sirkel(g, 0, 0, r); g.fill(); g.strokeStyle = 'rgba(20,16,10,.8)'; g.lineWidth = 1; g.stroke(); g.restore();
      if (rot.Etikett) Etikett.hinder(cx - r, cy - r, 2 * r, 2 * r); return true; }
    const halv = [-a / 2, -c / 2, a, c], ferdig = t.navn !== 'kø' && t.navn !== 'bygges' && t.navn !== 'ødelagt';
    // skygge mot sørøst, taket i byggets farge, mørk kant; under bygging lysere med stiplet kant, ødelagt svart
    g.fillStyle = 'rgba(6,5,3,.45)'; g.fillRect(halv[0] + 1.2, halv[1] + 1.2, a, c);
    g.fillStyle = t.navn === 'ødelagt' ? farge('#2a2620') : farge(St.tak, ferdig ? 1.12 : 1.3, ferdig ? 1 : .55); g.fillRect(...halv);
    if (ferdig && (St.form === 'sal' || St.form === 'telt') && Math.min(a, c) >= 4) { g.strokeStyle = farge(St.tak, .7); g.lineWidth = 1; g.beginPath(); if (lang) { g.moveTo(-a / 2 + 1, 0); g.lineTo(a / 2 - 1, 0); } else { g.moveTo(0, -c / 2 + 1); g.lineTo(0, c / 2 - 1); } g.stroke(); }
    if (St.kors && ferdig) { g.fillStyle = '#c8322a'; g.fillRect(-1.5, -.5, 3, 1); g.fillRect(-.5, -1.5, 1, 3); }
    g.strokeStyle = o.valgt ? '#f0d79a' : o.mangler ? '#e0604a' : 'rgba(20,16,10,.9)'; g.lineWidth = o.valgt ? 2 : 1; if (!ferdig && t.navn !== 'ødelagt') g.setLineDash([2, 1.5]);
    g.strokeRect(...halv); g.setLineDash([]); g.restore();
    if (rot.Etikett) { const r = Math.max(a, c) / 2 + 1; Etikett.hinder(cx - r, cy - r, 2 * r, 2 * r); }
    return true; }
  function bygg(g, b, o) { const B = rot.Leir && Leir.BYGG[b.type]; if (!B || B.linje) return false; const St = stil(b.type, B); if (!St.kropp) return false;
    if (!o.skisse && klyngePå(o.m)) return klyngeBygg(g, b, o, St);
    const m = o.m; if (o.skisse || m >= REGLER.middels || m !== forrigeM || typeof document === 'undefined') return tegnBygg(g, b, o);
    if (m !== lagerM) { LAGER.clear(); lagerM = m; }
    const t = tilstand(b, { aktiv: o.aktiv }), k = [b.id, b.type, b.ret || 0, b.nivå || 1, t.navn, Math.round(t.p * 40), Math.round((b.hp === undefined ? 1 : b.hp) * 20), b.arbeid ? b.arbeid.hva : '',
      o.valgt ? 1 : 0, o.mangler ? 1 : 0, b.av ? 1 : 0, o.fraksjon, Math.round((o.lys || 0) * 40), tNøkkel].join('|');
    const D = typeof dpr === 'number' ? dpr : 1, cx = o.sx(b.x), cy = o.sy(b.y); let L = LAGER.get(b.id);
    if (!L || L.k !== k) {
      // utstrekningen: kroppen og fotavtrykket + 4 m (stillas, materialer, lys på bakken), radiomastens barduner, i skjermpunkter
      const f = B.fot || St.kropp, e = 4 + (St.barduner || 0), x0 = Math.min(f[0], St.kropp[0]) - e, x1 = Math.max(f[1], St.kropp[1], St.vindpose ? St.vindpose[0] + 3 : -1e9) + e, y0 = Math.min(f[2], St.kropp[2]) - e, y1 = Math.max(f[3], St.kropp[3]) + e;
      const c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([u, v]) => [(c * u - s * v) / m, (-s * u - c * v) / m]);
      const ax = Math.floor(Math.min(...P.map(q => q[0]))), ay = Math.floor(Math.min(...P.map(q => q[1]))), w = Math.ceil(Math.max(...P.map(q => q[0]))) - ax + 1, h = Math.ceil(Math.max(...P.map(q => q[1]))) - ay + 1;
      if (w * h * D * D > 4e6) return tegnBygg(g, b, o);
      const lerret = L && L.c.width >= w * D && L.c.height >= h * D && L.c.width <= w * D * 1.5 ? L.c : document.createElement('canvas'); lerret.width = Math.ceil(w * D); lerret.height = Math.ceil(h * D);
      const q = lerret.getContext('2d'); q.setTransform(D, 0, 0, D, -ax * D, -ay * D);
      tegnBygg(q, { ...b, x: 0, y: 0 }, { ...o, sx: X => X / m, sy: Y => -Y / m });
      L = { k, c: lerret, ax, ay, w, h }; LAGER.set(b.id, L); }
    const x = Math.round((cx + L.ax) * D) / D, y = Math.round((cy + L.ay) * D) / D;
    g.save(); nullstill(g); g.drawImage(L.c, x, y, L.c.width / D, L.c.height / D); g.restore(); return true; }
  // TRÅKK (leiren skal se brukt ut, ikke som bygg på urørt mark): en slitt plass rundt leirens midte (omtrent halvveis ut til byggene,
  // 8–26 m), slitt jord rundt hvert ferdige bygg og en sti fra døra (forsiden, +x) inn mot plassen når stien ikke går gjennom et annet bygg.
  // Fast form per leir (hash av byggets nummer), bare under «middels», i nattfargen.
  function tråkk(g, bygg, leir, sx, sy, m) { if (!leir || m >= REGLER.middels || !rot.Leir) return; g.save(); nullstill(g);
    const ferdige = bygg.filter(b => { const B = Leir.BYGG[b.type]; return B && !B.linje && !B.del && B.fot && !(b.igjen > 0) && !(b.hp <= 0); });
    const inni = (b, x, y) => { const f = Leir.BYGG[b.type].fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), dx = x - b.x, dy = y - b.y, u = dx * c + dy * s, v = -dx * s + dy * c; return u > f[0] - .5 && u < f[1] + .5 && v > f[2] - .5 && v < f[3] + .5; };
    let R = 0; for (const b of ferdige) { const d = Math.hypot(b.x - leir.x, b.y - leir.y); if (d < 120) R = Math.max(R, d); } R = Math.max(8, Math.min(26, R * .5));
    const jord = farge('#7a6a4e', 1, .3), jord2 = farge('#6f5f45', 1, .22), rx = sx(leir.x), ry = sy(leir.y);
    // plassen: en ujevn ring av punkter (fast per leir) fylt to ganger for myk kant
    for (const [k, f] of [[1.15, jord2], [.9, jord]]) { g.fillStyle = f; g.beginPath();
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = R * k * (.8 + .4 * hash(Math.round(leir.x) + i, Math.round(leir.y))) / m, x = rx + Math.cos(a) * r, y = ry + Math.sin(a) * r * .85; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.fill(); }
    const jord3 = farge('#6f5f45', 1, .14);
    for (const b of ferdige) { const f = Leir.BYGG[b.type].fot, c = Math.cos(b.ret || 0), s = Math.sin(b.ret || 0), w = (f[1] - f[0]) / 2 + 1.6, h = (f[3] - f[2]) / 2 + 1.6, mx = (f[0] + f[1]) / 2, my = (f[2] + f[3]) / 2;
      // småting (brønn, mast, minnesmerke) får ingen slitt flekk – den så ut som en glorie
      if ((f[1] - f[0]) * (f[3] - f[2]) >= 12) { g.fillStyle = jord3; g.beginPath(); g.ellipse(sx(b.x + mx * c - my * s), sy(b.y + mx * s + my * c), w / m, h / m, -(b.ret || 0), 0, 6.283); g.fill(); }
      // stien fra døra mot plassen
      const dx = b.x + (f[1] + .6) * c, dy = b.y + (f[1] + .6) * s, L = Math.hypot(leir.x - dx, leir.y - dy); if (L < R * .9 || L > 140) continue;
      const ex = leir.x + (dx - leir.x) * R * .8 / L, ey = leir.y + (dy - leir.y) * R * .8 / L;
      let fri = true; for (let k = 1; k < 8 && fri; k++) { const x = dx + (ex - dx) * k / 8, y = dy + (ey - dy) * k / 8; if (ferdige.some(q => inni(q, x, y))) fri = false; } if (!fri) continue;
      g.strokeStyle = jord; g.lineCap = 'round'; g.lineWidth = Math.max(2, 1.8 / m); g.beginPath(); g.moveTo(sx(dx), sy(dy)); g.lineTo(sx(ex), sy(ey)); g.stroke(); }
    g.restore(); }
  // GJERDET: skygge, nettingen og stolper hver 2,5 m (nær); under bygging stiplet og blekt; valgt = gult
  function gjerde(g, ledd, sx, sy, m, o = {}) { g.save(); nullstill(g); g.lineCap = 'round';
    const strek = (farge2, w, dx = 0, stipl) => { g.strokeStyle = farge2; g.lineWidth = w; g.setLineDash(stipl || []); g.beginPath(); for (const [a, c] of ledd) { g.moveTo(sx(a[0]) + dx, sy(a[1]) + dx); g.lineTo(sx(c[0]) + dx, sy(c[1]) + dx); } g.stroke(); };
    const w = Math.max(1.4, .12 / m);
    if (o.ferdig) strek('rgba(6,5,3,.35)', w + 1, Math.min(4, .9 / m));
    strek(o.valgt ? '#f0d79a' : o.ferdig ? farge('#cfc6b0') : 'rgba(207,198,176,.55)', w, 0, o.ferdig ? null : [6, 3]);
    if (o.ferdig && m < REGLER.middels) { const r = Math.max(1.6, .1 / m); g.fillStyle = farge('#4f4132');
      for (const [a, c] of ledd) { const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / 2.5));
        for (let i = 0; i <= n; i++) { const x = sx(a[0] + (c[0] - a[0]) * i / n), y = sy(a[1] + (c[1] - a[1]) * i / n); if (x < -5 || y < -5 || x > VW + 5 || y > VH + 5) continue; g.fillRect(x - r / 2, y - r / 2, r, r); } } }
    g.restore(); }
  // GRUSVEGEN: kant, grus, to hjulspor og lysere midtrygg (nær); under bygging stiplet som før
  function veg(g, P, sx, sy, m, o = {}) { if (!P || P.length < 2) return; g.save(); nullstill(g); g.lineJoin = g.lineCap = 'round';
    const strek = (farge2, bredde, stipl) => { g.strokeStyle = farge2; g.lineWidth = Math.max(1, bredde); g.setLineDash(stipl || []); g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.stroke(); };
    const B = o.bredde || 5, w = Math.max(2.5, B / m);
    strek(o.valgt ? '#f0d79a' : farge('#3c3224', 1, .9), w + 2);
    if (!o.ferdig) { strek('rgba(168,152,120,.45)', w, [8, 6]); g.restore(); return; }
    strek(farge('#a08f70'), w);
    if (m < REGLER.middels) { strek(farge('#86765a'), (B * .64) / m); strek(farge('#ab9b7c'), (B * .36) / m);
      if (m < REGLER.nær) strek(farge('#b8a988', 1, .6), (B * .12) / m); }
    g.restore(); }
  // én ramme: nattfargen og lyset i vinduene (kalles før byggene tegnes)
  function ramme() { forrigeM = api._m === undefined ? 0 : api._m; api._m = typeof kam !== 'undefined' ? kam.m : 0; return toneNå(); }
  function toneNå() { T = null; let natt = 0; try { if (rot.KartLys && !KartLys.av && (!navigator.webdriver || KartLys.test)) { T = KartLys.nå(); natt = T.natt; if (T.natt < .01 && T.grå < .01 && T.mørk < .01) T = null; } } catch (e) { T = null; }
    tNøkkel = T ? [T.natt, T.grå, T.mørk].map(v => Math.round(v * 100)).join(',') : '';
    return { lys: natt > REGLER.vinduNatt ? Math.min(1, (natt - REGLER.vinduNatt) / .3) * .55 : 0 }; }

  // ---------- figurene: folk sett ovenfra ----------
  // x, y på skjermen, r i punkter, v = retningen de ser (skjermens vinkel), o: { farge, leder, valgt, såret, sivil, hår, sekk, våpen }
  function mann(g, x, y, r, v, o = {}) {
    g.save(); nullstill(g); g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.ellipse(x + r * .4, y + r * .45, r * 1.05, r * .8, v, 0, 6.283); g.fill();
    g.translate(x, y); g.rotate(v);
    const kropp = o.leder ? '#f0d79a' : o.farge || '#5b7ea8';
    // på marsj: føttene stikker fram og tilbake under kroppen (fasen per mann)
    if (o.går && r >= 3.6) { const f = Math.sin(performance.now() / 160 + (o.fase || 0)) * r * .55; g.fillStyle = '#23211c';
      g.beginPath(); g.ellipse(f, -r * .42, r * .3, r * .2, 0, 0, 6.283); g.ellipse(-f, r * .42, r * .3, r * .2, 0, 0, 6.283); g.fill(); }
    if (o.sekk !== false && !o.sivil && r >= 4.5) { g.fillStyle = '#3a4030'; g.fillRect(-r * .95, -r * .5, r * .55, r); }
    g.beginPath(); g.ellipse(0, 0, r * .62, r * 1.1, 0, 0, 6.283);
    if (o.såret) { g.strokeStyle = kropp; g.lineWidth = 1.6; g.stroke(); }
    else { g.fillStyle = kropp; g.fill(); g.strokeStyle = o.valgt ? '#f0d79a' : 'rgba(26,23,16,.75)'; g.lineWidth = o.valgt ? 1.5 : r < 4.5 ? .7 : 1; g.stroke(); }
    // armene fram mot geværet, og geværet
    if (o.våpen !== false && !o.sivil && r >= 4.2) { g.strokeStyle = '#1e201b'; g.lineWidth = Math.max(1.1, r * .2); g.lineCap = 'round'; g.beginPath(); g.moveTo(r * .2, r * .62); g.lineTo(r * 1.45, r * .18); g.stroke();
      g.fillStyle = kropp; g.beginPath(); g.arc(r * .62, r * .5, r * .2, 0, 6.283); g.fill(); g.beginPath(); g.arc(r * .55, -r * .25, r * .18, 0, 6.283); g.fill(); }
    // hodet: hjelm (soldat) eller hår med ansiktet fram (sivil)
    if (o.sivil) { g.fillStyle = '#d6b08c'; g.beginPath(); g.arc(r * .1, 0, r * .46, 0, 6.283); g.fill(); g.fillStyle = o.hår || '#3a2c20'; g.beginPath(); g.arc(-r * .06, 0, r * .44, 0, 6.283); g.fill(); }
    else { g.fillStyle = '#4f5842'; g.beginPath(); g.arc(r * .05, 0, r * (r < 4.5 ? .36 : .42), 0, 6.283); g.fill(); g.strokeStyle = 'rgba(20,22,16,.8)'; g.lineWidth = .8; g.stroke(); }
    g.restore();
    // et lite lysskjær på hodet fra nordvest
    if (r >= 3.6) { g.fillStyle = 'rgba(255,255,240,.22)'; g.beginPath(); g.arc(x + Math.cos(v) * r * .05 - r * .17, y + Math.sin(v) * r * .05 - r * .17, r * .18, 0, 6.283); g.fill(); }
  }
  const JAKKER = ['#6f8a4f', '#a0603c', '#5577a3', '#b09a5a', '#9a4c48', '#7a7a84', '#c08a3a', '#3f7a66', '#8a7aa0'], HÅR = ['#382b1f', '#1a1412', '#9e8050', '#5c3319', '#4d3d2e'];
  // folkene i leiren (FolkSpill): der de arbeider, bare på nær zoom og ikke i 3D
  function tegnFolk(g, vx0, vy1) { const m = kam.m; if (api.av || m >= REGLER.folkUnder || (typeof på3d !== 'undefined' && på3d) || !rot.FolkSpill || !rot.LeirSpill || !rot.Leir) return;
    const F = FolkSpill.tilstand && FolkSpill.tilstand(), L = LeirSpill.tilstand(), S = rot.OppstartSpill && OppstartSpill.tilstand(); if (!F || !L || !S || !S.leir || !F.personer) return;
    const r = Math.max(3, figurR(m) * .85), t = typeof tid === 'number' ? tid : 0; g.save(); nullstill(g);
    F.personer.forEach((p, i) => { if (p.død || p.borte || p.helse <= 0) return; const q = folkPlass(p, i, L.bygg, S.leir, t, Leir.BYGG); if (!q) return;
      const x = (q.x - vx0) / m, y = (vy1 - q.y) / m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) return;
      api.mann(g, x, y, r, -q.a, { sivil: true, farge: JAKKER[i % JAKKER.length], hår: HÅR[(i * 3) % HÅR.length], går: p.oppgave === 'frakt', fase: i }); });
    g.restore(); }
  // tegn på nytt når folkene har flyttet seg (hvert halve spillminutt) og de synes
  let sistFolk = -1;
  if (typeof KROKER !== 'undefined') {
    KROKER.tegn.push(tegnFolk); KROKER.tegn[KROKER.tegn.length - 1].bygg = true; KROKER.tegn[KROKER.tegn.length - 1].over = true;
    // slitt jord og stier: først av tegnekrokene (under flagget, merkene, tåka og alt annet)
    KROKER.tegn.unshift((g, vx0, vy1) => { if (api.av || typeof kam === 'undefined' || kam.m >= REGLER.middels || !rot.LeirSpill || !rot.OppstartSpill) return; const L = LeirSpill.tilstand(), S = OppstartSpill.tilstand();
      if (!L || !S || !S.leir) return; toneNå(); tråkk(g, L.bygg, S.leir, X => (X - vx0) / kam.m, Y => (vy1 - Y) / kam.m, kam.m); });
    KROKER.sim.push(() => { if (api.av || typeof kam === 'undefined' || kam.m >= REGLER.folkUnder || (typeof på3d !== 'undefined' && på3d)) return; const k = Math.floor((typeof tid === 'number' ? tid : 0) * 2); if (k !== sistFolk) { sistFolk = k; skitten = true; } });
  }

  // ---------- feltbilen og helikopteret (spill/kjor.js) som kjøretøy ovenfra ----------
  function feltbil(g, x, y, v, L, B) { g.save(); g.translate(x, y); g.rotate(v);
    g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(-L / 2 + B * .25, -B / 2 + B * .3, L, B);
    g.fillStyle = farge('#56603a'); g.beginPath(); g.moveTo(-L / 2, -B / 2); g.lineTo(L / 2 - B * .2, -B / 2); g.quadraticCurveTo(L / 2, -B / 2, L / 2, -B * .3); g.lineTo(L / 2, B * .3); g.quadraticCurveTo(L / 2, B / 2, L / 2 - B * .2, B / 2); g.lineTo(-L / 2, B / 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,24,12,.85)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = farge('#1f2b33'); g.fillRect(L * .1, -B * .4, L * .12, B * .8);
    g.fillStyle = farge('#6a7448'); g.fillRect(-L * .22, -B * .4, L * .32, B * .8);
    g.fillStyle = farge('#3f4829'); g.fillRect(-L / 2 + 1, -B * .42, L * .26, B * .84);
    g.fillStyle = '#f1e6b8'; g.fillRect(L / 2 - 1.5, -B * .42, 1.2, B * .2); g.fillRect(L / 2 - 1.5, B * .22, 1.2, B * .2);
    g.restore(); }
  function helikopter(g, x, y, v, s, rotor) { g.save(); g.translate(x, y); g.rotate(v);
    g.fillStyle = 'rgba(0,0,0,.34)'; g.beginPath(); g.ellipse(s * .5, s * .5, s * 2.2, s * .8, 0, 0, 6.283); g.fill();
    // halebommen, halerotoren, kroppen med cockpit og hovedrotoren
    g.strokeStyle = farge('#4c5634'); g.lineWidth = Math.max(2, s * .32); g.lineCap = 'round'; g.beginPath(); g.moveTo(-s * .8, 0); g.lineTo(-s * 3.4, 0); g.stroke();
    g.strokeStyle = farge('#2a2c2e'); g.lineWidth = Math.max(1, s * .12); g.beginPath(); g.moveTo(-s * 3.3, -s * .55); g.lineTo(-s * 3.3, s * .55); g.stroke();
    g.fillStyle = farge('#56603a'); g.beginPath(); g.ellipse(0, 0, s * 1.5, s * .78, 0, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(20,24,12,.85)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = farge('#25323a'); g.beginPath(); g.ellipse(s * .85, 0, s * .58, s * .55, 0, 0, 6.283); g.fill();
    if (rotor > .5) { g.fillStyle = 'rgba(40,44,40,.18)'; g.beginPath(); g.arc(0, 0, s * 3.1, 0, 6.283); g.fill(); }
    else { g.strokeStyle = farge('#2a2c2e'); g.lineWidth = Math.max(1.2, s * .14); g.beginPath(); for (let k = 0; k < 4; k++) { const a = .4 + k * 1.571; g.moveTo(0, 0); g.lineTo(Math.cos(a) * s * 3.1, Math.sin(a) * s * 3.1); } g.stroke(); }
    g.fillStyle = farge('#3f4829'); g.beginPath(); g.arc(0, 0, s * .28, 0, 6.283); g.fill();
    g.restore(); }
  function tegnKjør(g, vx0, vy1) { const m = kam.m, K = rot.KjorSpill && KjorSpill.liste && KjorSpill.liste(); if (!K) return;
    g.save(); nullstill(g); ramme0();
    for (const k of K) { if (k.X === undefined) continue; const x = (k.X - vx0) / m, y = (vy1 - k.Y) / m; if (x < -60 || y < -60 || x > VW + 60 || y > VH + 60) continue;
      // kursen a som i gange.js: kjøretøyet ser mot (−sin a, cos a) i kartet, altså (−sin a, −cos a) på skjermen
      const v = Math.atan2(-Math.cos(k.a || 0), -Math.sin(k.a || 0));
      if (k.type === 'bil') feltbil(g, x, y, v, Math.max(18, 4.6 / m), Math.max(8.5, 2 / m)); else helikopter(g, x, y, v, Math.max(5, 1.6 / m), k.rotor || 0);
      if (rot.Etikett && Etikett.hinder) { const h = k.type === 'bil' ? Math.max(18, 4.6 / m) / 2 : Math.max(5, 1.6 / m) * 1.6; Etikett.hinder(x - h, y - h, 2 * h, 2 * h); }
      if (m < 1.2) { g.font = '600 13px "Cormorant Garamond", serif'; const t = k.type === 'bil' ? 'Feltbil' : 'Helikopter', ty = rot.Etikett ? Etikett.tekst(g, t, x, y + (k.type === 'bil' ? Math.max(14, 3 / m) : Math.max(16, 1.6 / m * 2.2)) + 6, 1) : y + 20;
        g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f2ead6'; g.fillText(t, x, ty); } }
    g.restore(); T = null; }
  // nattfargen for kjøretøyene (som byggene)
  function ramme0() { ramme(); }
  // Kjøretøyene i kjor.js tegnes som et rundt merke med B/H. På nær zoom bytter vi den tegnekroken ut med kjøretøyene ovenfra
  // (samme navn, samme plass); lenger ute er merket som før. Kroken finnes etter teksten den tegner (kjor.js lastes etter denne fila).
  window.addEventListener('load', () => { if (typeof KROKER === 'undefined') return; const i = KROKER.tegn.findIndex(f => !f.leir2d && /'B' : 'H'/.test(String(f))); if (i < 0) return;
    const gammel = KROKER.tegn[i], ny = (g, vx0, vy1) => (!api.av && kam.m < REGLER.bilUnder && !(typeof på3d !== 'undefined' && på3d) ? tegnKjør(g, vx0, vy1) : gammel(g, vx0, vy1));
    ny.leir2d = true; ny.bygg = gammel.bygg; ny.over = true; KROKER.tegn[i] = ny; api.kjørKrok = true; });

  Object.assign(api, { bygg, tegnBygg, gjerde, veg, tråkk, lager: () => LAGER.size, skygge, ramme, mann, tegnFolk, iBygget, slutt: () => { T = null; } });
  rot.Leir2d = api;
})(typeof window !== 'undefined' ? window : globalThis);
