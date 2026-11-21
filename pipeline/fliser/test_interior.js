// Interiør: romplan, døråpninger, møbler og kollisjon (site/dovre-fliser/spill/interior.js)
const I = require('../../site/dovre-fliser/spill/interior.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const rekt = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const dør = (P, k, f, w) => { const a = P[k], b = P[(k + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L, w }; };
// alle rom kan nås fra inngangen: flom i et rutenett på 0,25 m der blokkert() er falsk
function nås(pl) {
  const [x0, y0, x1, y1] = pl.bb, s = .2, W = Math.ceil((x1 - x0) / s) + 2, H = Math.ceil((y1 - y0) / s) + 2, sett = new Uint8Array(W * H), kø = [];
  const fri = (i, j) => { const x = x0 + (i - .5) * s, y = y0 + (j - .5) * s; return I.inni(pl.P, x, y) && !I.blokkert(pl, x, y); };
  const i0 = Math.round((pl.inngang.inn[0] - x0) / s + .5), j0 = Math.round((pl.inngang.inn[1] - y0) / s + .5); kø.push([i0, j0]); sett[j0 * W + i0] = 1;
  while (kø.length) { const [i, j] = kø.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const p = i + a, q = j + b; if (p < 0 || q < 0 || p >= W || q >= H || sett[q * W + p] || !fri(p, q)) continue; sett[q * W + p] = 1; kø.push([p, q]); } }
  // hvert rom som ligger inne i omrisset: midten (eller et punkt nær den) er nådd
  let rom = 0, nådd = 0;
  for (const r of pl.rom) { if (r.andel < .5) continue; rom++; const a = pl.akse; let fant = false;
    for (let k = 0; k < 400 && !fant; k++) { const u = r.u0 + (r.u1 - r.u0) * ((k % 20) + .5) / 20, v = r.v0 + (r.v1 - r.v0) * (Math.floor(k / 20) + .5) / 20, x = u * a.ux + v * a.vx, y = u * a.uy + v * a.vy;
      const i = Math.round((x - x0) / s + .5), j = Math.round((y - y0) / s + .5); if (i >= 0 && j >= 0 && i < W && j < H && sett[j * W + i]) fant = true; }
    if (fant) nådd++; }
  return { rom, nådd };
}
// enebolig 10 × 8 m
{ const P = rekt(10, 8), pl = I.plan(P, { i: 42, kl: 'hus', h: 6, dør: dør(P, 0, .5, 1) }), n = nås(pl), roller = pl.rom.map(r => r.rolle);
  ok(pl.rom.length >= 4 && pl.rom.length <= 9, 'hus 80 m²: ' + pl.rom.length + ' rom (' + roller.join(', ') + ')');
  ok(roller.includes('stue') && roller.includes('kjøkken') && roller.includes('soverom') && roller.includes('bad'), 'hus: stue, kjøkken, soverom og bad');
  ok(n.rom === n.nådd, 'hus: alle ' + n.rom + ' rom kan nås fra inngangen (' + n.nådd + ')');
  ok(pl.møbler.some(m => m.type === 'sofa') && pl.møbler.some(m => /seng/.test(m.type)) && pl.møbler.some(m => m.type === 'kjøkkenbenk') && pl.møbler.some(m => m.type === 'toalett'), 'hus: sofa, seng, kjøkkenbenk og toalett (' + pl.møbler.length + ' møbler)');
  ok(pl.møbler.every(m => I.inni(P, m.x, m.y)), 'hus: alle møblene står inne');
  // inngangen: fri rett i døra, vegg ved siden av
  ok(!I.blokkert(pl, 5, 0) && !I.blokkert(pl, 5, -.5) && !I.blokkert(pl, 5, .6) && I.blokkert(pl, 7.5, 0) && I.blokkert(pl, 0, 4) && !I.blokkert(pl, -1, 4), 'hus: døra er åpen, ytterveggene sperrer, ute er fritt');
  const pl2 = I.plan(P, { i: 42, kl: 'hus', h: 6, dør: dør(P, 0, .5, 1) }); ok(JSON.stringify(pl2.møbler) === JSON.stringify(pl.møbler) && JSON.stringify(pl2.vegger) === JSON.stringify(pl.vegger), 'samme bygg gir samme plan');
  pl.gulv = 100.3; ok(I.høyde(pl, 5, 4, () => 100) === 100.3 && Math.abs(I.høyde(pl, 5, -.75, () => 100) - 100.15) < 1e-9 && I.høyde(pl, 5, -3, () => 100) === null && I.høyde(pl, 9, -.75, () => 100) === null, 'gulvet inne, trapp foran døra, terreng ellers');
}
// mange bygg av alle slag og former: alle rom nås, ingen møbler i vegger eller døråpninger
{ const former = { rekt: (w, h) => rekt(w, h), L: (w, h) => [[0, 0], [w, 0], [w, h * .5], [w * .5, h * .5], [w * .5, h], [0, h]], skjev: (w, h) => [[0, 0], [w, 1.5], [w - 1, h + 1], [-1, h - .5]] };
  let bygg = 0, unådd = 0, iVegg = 0, iDør = 0, møbler = 0, uten = 0; const tomme = [];
  for (const kl of Object.keys(I.KLASSE)) for (const [fn, f] of Object.entries(former)) for (let k = 0; k < 12; k++) {
    const stor = /industri|lager|hangar|terminal|skole|sykehus|kirke/.test(kl), w = (stor ? 16 : 5) + (k * 3.7) % (stor ? 40 : 12), h = (stor ? 12 : 4) + (k * 2.3) % (stor ? 22 : 8), P0 = f(w, h), v = k * .37;
    const P = P0.map(([x, y]) => [x * Math.cos(v) - y * Math.sin(v) + 50, x * Math.sin(v) + y * Math.cos(v) - 20]);
    const pl = I.plan(P, { i: 1000 + bygg * 17, kl, h: 4 + k, dør: dør(P, 0, .38, kl === 'uthus' ? 2.6 : 1.2) }), n = nås(pl); bygg++; if (n.rom !== n.nådd) { unådd++; if (process.env.VIS) { const m = pl.møbler; pl.møbler = []; const n2 = nås(pl); pl.møbler = m; console.log('  ', kl, fn, w.toFixed(1), h.toFixed(1), 'rom', n.rom, 'nådd', n.nådd, 'uten møbler nådd', n2.nådd); } }
    møbler += pl.møbler.length; if (!pl.møbler.length) { uten++; tomme.push(kl + '/' + fn + ' ' + w.toFixed(0) + '×' + h.toFixed(0)); }
    for (const m of pl.møbler) { const c = Math.cos(m.a), s = Math.sin(m.a);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = m.x + a * m.b / 2 * .9 * c - b * m.d / 2 * .9 * s, y = m.y + a * m.b / 2 * .9 * s + b * m.d / 2 * .9 * c;
        if (!I.inni(P, x, y) || pl.vegger.some(g => I.avstSeg(x, y, g.ax, g.ay, g.bx, g.by) < .02)) { iVegg++; break; } }
      if (m.sperrer && pl.dører.some(d => Math.hypot(d[0] - m.x, d[1] - m.y) < .35)) iDør++; }
    if (I.blokkert(pl, pl.inngang.inn[0], pl.inngang.inn[1])) iDør++;
  }
  ok(unådd === 0, bygg + ' bygg av ' + Object.keys(I.KLASSE).length + ' slag og tre former: alle rom kan nås (' + unådd + ' bygg med rom som ikke nås)');
  ok(iVegg === 0, 'ingen møbler gjennom vegger eller utenfor (' + iVegg + ')');
  ok(iDør === 0, 'ingen møbler i døråpningene eller rett innenfor inngangen (' + iDør + ')');
  ok(uten <= bygg * .05, møbler + ' møbler i alt; ' + uten + ' bygg uten møbler ' + tomme.slice(0, 6).join(', '));
}

// ---------- RUNDE 15 (21. nov): takhøyde, rekkefølgen av rom, flere innganger, stil og riktig innhold per type ----------
// prøvebyggene: alle klasser fra kartet, fire former, mange størrelser og dører på alle sider
const KART = Object.keys(I.KLASSE).filter(k => !I.KLASSE[k].leir);
const former2 = { rekt: (w, h) => rekt(w, h), L: (w, h) => [[0, 0], [w, 0], [w, h * .5], [w * .5, h * .5], [w * .5, h], [0, h]], skjev: (w, h) => [[0, 0], [w, 1.5], [w - 1, h + 1], [-1, h - .5]], T: (w, h) => [[0, 0], [w, 0], [w, h * .45], [w * .65, h * .45], [w * .65, h], [w * .35, h], [w * .35, h * .45], [0, h * .45]] };
const prøvebygg = []; let nr = 0;
for (const kl of KART) for (const [fn, f] of Object.entries(former2)) for (let k = 0; k < 10; k++) {
  const stor = /industri|lager|hangar|terminal|skole|sykehus|kirke|butikk|låve/.test(kl), w = (stor ? 12 : 6) + (k * 4.3) % (stor ? 45 : 14), h = (stor ? 9 : 5) + (k * 2.9) % (stor ? 26 : 8), v = k * .53 + .2;
  const P = f(w, h).map(([x, y]) => [x * Math.cos(v) - y * Math.sin(v) + 300, x * Math.sin(v) + y * Math.cos(v) + 120]);
  const kant = k % P.length, dd = dør(P, kant, .3 + (k % 3) * .2, kl === 'uthus' ? 2.6 : 1.2);
  let pl; try { pl = I.plan(P, { i: 5000 + nr * 31, kl, h: 4 + (k * 1.7) % 14, dør: dd, tett: (k * 7) % 40 }); } catch (e) { pl = null; console.log('  krasj', kl, fn, w, h, e.message); }
  nr++; if (pl) prøvebygg.push({ kl, fn, w, h, pl });
}
ok(prøvebygg.length === nr, nr + ' prøvebygg (' + KART.length + ' klasser × 4 former × 10 størrelser) – ingen krasjer');
{ let unådd = 0, iDør = 0, iInngang = 0; const feilL = [];
  for (const { kl, fn, w, h, pl } of prøvebygg) { const n = nås(pl); if (n.rom !== n.nådd) { unådd++; feilL.push(kl + '/' + fn + ' ' + w.toFixed(0) + '×' + h.toFixed(0)); }
    for (const m of pl.møbler) if (m.sperrer && (pl.dører.some(d => Math.hypot(d[0] - m.x, d[1] - m.y) < .35))) iDør++;
    for (const i of pl.innganger) if (I.blokkert(pl, i.inn[0], i.inn[1])) iInngang++; }
  ok(unådd === 0, 'alle rom kan nås fra hovedinngangen (' + unådd + ' bygg med rom som ikke nås ' + feilL.slice(0, 5).join(', ') + ')');
  ok(iDør === 0 && iInngang === 0, 'ingen møbler i døråpningene (' + iDør + ') og ingen inngang er sperret innenfor (' + iInngang + ')');
}
// soverom og bad ligger aldri rett ved ytterdøra, og har dør til gang, korridor eller stue (TILGANG)
{ const romVed = (pl, x, y) => { const a = pl.akse, u = x * a.ux + y * a.uy, v = x * a.vx + y * a.vy; return pl.rom.find(r => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1); };
  let vedDør = 0, utenTilgang = 0, sov = 0, korr = 0, bolig = 0; const ved = [];
  for (const { kl, fn, pl } of prøvebygg) { if (pl.form === 'korridor') korr++;
    for (const i of pl.innganger) { const r = romVed(pl, i.inn[0], i.inn[1]); if (r && I.ALDRI_VED_DØR[r.rolle]) { vedDør++; ved.push(kl + '/' + fn + ' ' + i.type + ' -> ' + r.rolle); } }
    const N = new Map(pl.naboer); for (const [k, L] of pl.naboer) { const r = pl.rom[k], T = I.TILGANG[r.rolle]; if (!T || r.andel < .5) continue; sov++; if (!L.some(o => T.includes(pl.rom[o].rolle))) utenTilgang++; }
    if (/^(hus|leil)$/.test(kl) && pl.rom.filter(r => r.andel > .3).length >= 3) { bolig++; const r = romVed(pl, pl.inngang.inn[0], pl.inngang.inn[1]); if (!r || !/gang|vindfang|stue|allrom/.test(r.rolle)) ved.push('bolig ' + fn + ' døra inn i ' + (r && r.rolle)); } }
  ok(vedDør === 0, 'ingen ytterdør går rett inn i soverom, bad, beboerrom eller sykerom (' + vedDør + ') ' + ved.slice(0, 4).join('; '));
  ok(utenTilgang === 0, sov + ' soverom/bad/beboerrom/sykerom: alle har dør til gang, korridor eller stue (' + utenTilgang + ' uten)');
  ok(ved.length === 0, bolig + ' boliger med minst tre rom: døra går inn i gang, vindfang eller stue');
  ok(korr > prøvebygg.length * .2, korr + ' av ' + prøvebygg.length + ' prøvebygg bruker korridorplanen (resten haller eller den gamle delingen)');
}
// takhøyden: innenfor grensene for alle klasser, saltak og flatt tak, alle stiler
{ let utenfor = 0; const L = [];
  for (const kl of KART) { const T = I.TYPER[kl]; for (const stilTak of [0, .5, 1]) for (const saltak of [false, true]) for (const vegg of [undefined, 1.8, 2.3, 2.6, 2.9, 3.4, 4.2, 6, 11, 30]) {
    const t = I.takhøyde(T.tak, { vegg, saltak, stilTak, h: 9 }), rom = vegg === undefined ? Infinity : vegg - (saltak ? .06 : .35);
    let gale = t < I.TAK_MIN || (rom >= I.TAK_MIN && t > rom + 1e-9);
    if (Array.isArray(T.tak) && rom >= T.tak[1]) gale = gale || t < T.tak[0] - 1e-9 || t > T.tak[1] + .35 + 1e-9;
    if (T.tak === 'full' && rom !== Infinity && rom >= I.TAK_MIN) gale = gale || Math.abs(t - Math.min(14, rom)) > .011;
    if (gale) { utenfor++; L.push(kl + ' vegg ' + vegg + (saltak ? ' saltak' : '') + ' = ' + t); } } }
  ok(utenfor === 0, 'takhøyden: aldri under 2,2 m, aldri over veggtoppen, innenfor spennet per klasse, full høyde i haller (' + utenfor + ') ' + L.slice(0, 4).join('; '));
  const r = kl => I.TYPER[kl].tak; ok(r('hus')[0] >= 2.4 && r('hus')[1] <= 2.7 && r('butikk')[0] >= 3 && r('butikk')[1] <= 4 && r('kontor')[0] >= 3 && r('kontor')[1] <= 4 && ['låve', 'kirke', 'industri', 'lager', 'hangar'].every(k => r(k) === 'full'), 'tabellen: bolig 2,4–2,7, butikk og kontor 3–4 m, full høyde i låve, kirke, industri, lager og hangar');
  // saltak: himlingen rett under veggtoppen når veggen er innenfor spennet
  ok(I.takhøyde([2.4, 2.7], { vegg: 2.8, saltak: true, stilTak: 0 }) === 2.74 && I.takhøyde([2.4, 2.7], { vegg: 2.3, saltak: true }) === 2.24 && I.takhøyde([2.4, 2.7], { vegg: 1.5, saltak: true }) === 2.2, 'saltak: himlingen rett under veggtoppen (2,8 m vegg gir 2,74), aldri under 2,2');
  ok(Math.abs(I.takhøyde('full', { vegg: 9, saltak: false }) - 8.65) < 1e-9 && I.takhøyde('full', { vegg: 40 }) === 14, 'full høyde: opp til taket (flatt tak 0,35 m konstruksjon), høyst 14 m');
}
// store bygg har minst to innganger (hovedinngang + bakdør/vareinngang/nødutgang); butikkene har vareinngang
{ let store = 0, enInngang = 0, butikk = 0, vare = 0; const L = [];
  for (const { kl, fn, w, h, pl } of prøvebygg) { if (pl.areal < 150 || kl === 'uthus' || kl === 'hytte') continue; store++; if (pl.innganger.length < 2) { enInngang++; L.push(kl + '/' + fn + ' ' + w.toFixed(0) + '×' + h.toFixed(0)); }
    if (kl === 'butikk') { butikk++; if (pl.innganger.some(i => i.type === 'vare')) vare++; } }
  ok(enInngang <= store * .03, store + ' store bygg (over 150 m²): ' + (store - enInngang) + ' har minst to innganger (' + enInngang + ' har én: ' + L.slice(0, 4).join(', ') + ')');
  ok(vare >= butikk * .9, butikk + ' butikker: ' + vare + ' har vareinngang');
}
// stilen: alle tre finnes, fast per bygg, byggeåret går foran
{ const P = rekt(12, 9), d = dør(P, 0, .5, 1.1), telle = { eldre: 0, nyere: 0, moderne: 0 };
  for (let i = 0; i < 300; i++) telle[I.plan(P, { i, kl: 'hus', h: 6, dør: d }).stil]++;
  ok(telle.eldre > 30 && telle.nyere > 30 && telle.moderne > 20, 'stilene per bygg: ' + JSON.stringify(telle));
  ok(I.plan(P, { i: 7, kl: 'hus', h: 6, dør: d, år: 1930 }).stil === 'eldre' && I.plan(P, { i: 7, kl: 'hus', h: 6, dør: d, år: 1985 }).stil === 'nyere' && I.plan(P, { i: 7, kl: 'hus', h: 6, dør: d, år: 2015 }).stil === 'moderne', 'byggeåret bestemmer stilen når det finnes (1930 eldre, 1985 nyere, 2015 moderne)');
  // eldre: flere vegger (mindre åpne) enn moderne i samme hus
  let vE = 0, vM = 0; for (let i = 0; i < 40; i++) { vE += I.plan(P, { i, kl: 'hus', h: 6, dør: d, år: 1930 }).vegger.length; vM += I.plan(P, { i, kl: 'hus', h: 6, dør: d, år: 2015 }).vegger.length; }
  ok(vE > vM, 'eldre hus har flere vegger enn moderne (' + vE + ' mot ' + vM + ' i 40 hus)');
}
// riktig innhold per type
{ const typer = (kl, info, P = rekt(30, 18)) => { const pl = I.plan(P, Object.assign({ i: 77, kl, h: 8, dør: dør(P, 0, .5, 1.4) }, info)); return { pl, t: new Set(pl.møbler.map(m => m.type)), r: new Set(pl.rom.map(r => r.rolle)) }; };
  { const { pl, t, r } = typer('butikk', {}); const i = pl.inngang, kasser = pl.møbler.filter(m => m.type === 'kasse');
    const avstFront = m => (m.x - i.x) * -i.nx + (m.y - i.y) * -i.ny, reoler = pl.møbler.filter(m => m.type === 'reol');
    ok(t.has('reol') && t.has('kasse') && t.has('kjøledisk') && t.has('fruktdisk') && r.has('lager'), 'butikk: reoler, kasser, kjøledisk, frukt og grønt og lager bak (' + [...t].join(', ') + ')');
    ok(kasser.length >= 1 && kasser.every(m => avstFront(m) < 4) && reoler.length >= 6 && reoler.every(m => avstFront(m) > 4), 'butikk: kassene ved utgangen (' + kasser.map(m => avstFront(m).toFixed(1)).join(', ') + ' m inn), ' + reoler.length + ' reoler innenfor');
    // reolene i rader: mange deler samme linje på tvers av fronten
    const linjer = new Map(); for (const m of reoler) { const k = Math.round(((m.x - i.x) * i.ux + (m.y - i.y) * i.uy) * 2); linjer.set(k, (linjer.get(k) || 0) + 1); }
    ok([...linjer.values()].filter(n => n >= 2).length >= 3, 'butikk: reolene står i rader (' + [...linjer.values()].join(', ') + ')'); }
  { const { t, r } = typer('låve', {}, rekt(28, 14)); ok(t.has('båsrekke') && t.has('fôrvogn') && (r.has('melkerom') || t.has('melketank')), 'fjøs: båsrekker (gjødselkanal og fôrbrett), fôrvogn og melkerom/melketank (' + [...r].join(', ') + ')'); }
  { const P = rekt(28, 14), d = dør(P, 3, .5, 1.4), pl = I.plan(P, { i: 77, kl: 'låve', h: 8, dør: d }); ok(pl.rom.some(r => r.rolle === 'melkerom') && pl.rom.some(r => r.rolle === 'fjøs'), 'fjøs med døra i gavlen: inn i melkerommet, så fjøset'); }
  const ind = navn => typer('industri', { navn });
  { const a = ind('Moelven sagbruk'), b = ind('Mek. verksted'), c = ind('Olje og gass');
    ok(a.pl.variant === 'tre' && a.t.has('sagbenk') && a.t.has('plankestabel') && a.r.has('tørkeloft'), 'treindustri (navnet «sagbruk»): sagbenk, plank og tørkeloft');
    ok(b.pl.variant === 'metall' && b.t.has('traverskran') && b.t.has('sveisebås') && b.t.has('maskin') && b.t.has('stålplater'), 'metall og stål: maskinhall, traverskran, sveisebås, stålplater');
    ok(c.pl.variant === 'olje' && c.t.has('tank') && c.t.has('rørgate') && c.t.has('ventil') && c.r.has('kontrollrom_olje'), 'olje og gass: tanker, rør, ventiler og kontrollrom');
    const v = new Set(); for (let i = 0; i < 60; i++) v.add(I.plan(rekt(30, 18), { i, kl: 'industri', h: 9, dør: dør(rekt(30, 18), 0, .5, 1.4) }).variant); ok(v.size === 3, 'industri uten navn: alle tre variantene etter hash (' + [...v].join(', ') + ')'); }
  { const s = typer('sykehus', { am: 'nursing_home' }, rekt(40, 14)); ok(s.pl.variant === 'sykehjem' && s.r.has('beboerrom') && s.r.has('dagligstue') && s.r.has('vaktrom') && s.r.has('kjøkken') && s.r.has('korridor') && s.t.has('beboerbad') && s.t.has('sykeseng'), 'sykehjem: korridor med beboerrom (seng og bad), dagligstue, vaktrom og kjøkken (' + [...s.r].join(', ') + ')'); }
  { const s = typer('sykehus', { am: 'clinic' }, rekt(24, 12)); ok(s.pl.variant === 'legevakt' && s.r.has('venterom') && s.r.has('behandlingsrom') && s.t.has('skranke') && s.t.has('undersøkelsesbenk'), 'legevakt: venterom med skranke, behandlingsrom (' + [...s.r].join(', ') + ')'); }
  { const s = typer('sykehus', { am: 'hospital' }, rekt(60, 20)); ok(s.pl.variant === 'sykehus' && s.r.has('sykerom') && s.r.has('vaktrom'), 'sykehus: sykerom og vaktrom'); }
  { const s = typer('skole', {}, rekt(40, 18)); ok(s.r.has('klasserom') && s.r.has('korridor') && s.t.has('tavle') && s.t.has('skolepult'), 'skole: korridor og klasserom med tavle og pulter (' + [...s.r].join(', ') + ')'); }
  { const s = typer('kontor', {}, rekt(30, 14)); ok(s.r.has('resepsjon') && s.r.has('kontor') && s.r.has('møterom') && s.t.has('pult'), 'kontor: resepsjon, kontorer og møterom (' + [...s.r].join(', ') + ')'); }
  { const s = typer('kirke', {}, rekt(26, 12)); ok(s.t.has('alter') && s.t.has('kirkebenk') && s.r.has('sakristi'), 'kirke: alter, benkerader og sakristi'); }
  { const s = typer('hytte', {}, rekt(8, 6)); ok(s.t.has('ovn') && (s.r.has('allrom') || s.r.has('stue')), 'hytte: allrom/stue med vedovn'); }
}
console.log(feil ? feil + ' FEIL' : 'alle interiørtestene ok'); process.exit(feil ? 1 : 0);
