'use strict';
// Regler for kysten i 3D (uten DOM og uten THREE, så de kan testes i Node: pipeline/fliser/test_kyst.js). Visningen er spill/kyst3d.js.
// Plasserer småbåter, flytebrygger, naust og bøyer langs sjøen. Alt står fast: rutenett i kartets meter (ikke utsnittets) og hash per rute,
// så samme sted får de samme tingene hver gang. Sjø = vann i kartet OG terreng under 1 moh. (innsjøer får ingen båter her).
(function (rot) {
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; };
  const frø = (X, Y, k) => hash((Math.imul(Math.round(X), 73856093) ^ Math.imul(Math.round(Y), 19349663) ^ Math.imul(k + 1, 83492791)) | 0);
  const RETN = []; for (let i = 0; i < 16; i++) RETN.push([Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  const TAK = { pc: { båter: 260, brygger: 40, naust: 60, bøyer: 40 }, mobil: { båter: 90, brygger: 15, naust: 25, bøyer: 15 } };
  const TYPER = ['snekke', 'sjark', 'motorbåt'], FARGER = [[.93, .93, .9], [.93, .93, .9], [.72, .14, .12], [.16, .26, .5], [.93, .93, .9], [.2, .42, .36]];

  // v = { S, cx, cy, sjø(x, y), moh(x, y), by(x, y), hinder(x, y), mobil } – x, y relativt til utsnittets midte
  // (18. nov, hakk: i Bergen tok plasser() 110–150 ms i ett strekk. plasserG er samme regel som generator – yield for hver rad i
  // rutenettene og for hvert 64. kystpunkt –, så spill/kyst3d.js kan ta pust innimellom; plasser() gjør alt i ett og gir det samme.)
  function plasser(v) { const it = plasserG(v); let r; while (!(r = it.next()).done); return r.value; }
  function* plasserG(v) {
    const T = TAK[v.mobil ? 'mobil' : 'pc'], S = v.S, ut = { båter: [], brygger: [], naust: [], bøyer: [] };
    const land = (x, y) => !v.sjø(x, y), hind = (x, y) => v.hinder ? v.hinder(x, y) : false, by = (x, y) => v.by ? v.by(x, y) : false;
    const inne = (x, y, m) => Math.abs(x) < S - m && Math.abs(y) < S - m;
    const fri = (liste, x, y, d) => liste.every(o => (o.x - x) ** 2 + (o.y - y) ** 2 > d * d);
    // første sjøpunkt langs (nx, ny) fra (x, y), opptil maks meter
    const tilSjø = (x, y, nx, ny, maks) => { for (let t = 0; t <= maks; t += 1) if (v.sjø(x + nx * t, y + ny * t)) return t; return null; };
    // kystpunkter: landruter (12 m) med sjø innen 10 m; retningen ut mot sjøen = snittet av sjøretningene
    const st = 12, kyst = [];
    for (let Y = Math.ceil((v.cy - S) / st) * st; Y < v.cy + S; Y += st) { yield; for (let X = Math.ceil((v.cx - S) / st) * st; X < v.cx + S; X += st) {
      const x = X - v.cx, y = Y - v.cy; if (!inne(x, y, 40) || !land(x, y)) continue;
      let sx = 0, sy = 0, n = 0; for (const [dx, dy] of RETN) if (v.sjø(x + dx * 10, y + dy * 10)) { sx += dx; sy += dy; n++; }
      if (!n || n > 12) continue; const l = Math.hypot(sx, sy); if (l < .5) continue;
      kyst.push({ x, y, X, Y, nx: sx / l, ny: sy / l, d: x * x + y * y });
    } }
    kyst.sort((a, b) => a.d - b.d);
    let nk = 0;
    for (const k of kyst) {
      if ((++nk & 63) === 0) yield;
      const h = frø(k.X, k.Y, 0), h2 = frø(k.X, k.Y, 1), h3 = frø(k.X, k.Y, 2), iBy = by(k.x, k.y), a = Math.atan2(k.ny, k.nx);
      const t0 = tilSjø(k.x, k.y, k.nx, k.ny, 14); if (t0 === null) continue;
      const sx = k.x + k.nx * t0, sy = k.y + k.ny * t0;
      if (iBy && h < .22 && ut.brygger.length < T.brygger && fri(ut.brygger, sx, sy, 40)) {
        // flytebrygge: 14–30 m rett ut, hele lengden og 5 m til hver side må være sjø
        const L = 14 + Math.floor(h2 * 17); let ok = true;
        for (let t = 2; t <= L + 4 && ok; t += 2) for (const o of [-5, 0, 5]) if (!v.sjø(sx + k.nx * t - k.ny * o, sy + k.ny * t + k.nx * o)) { ok = false; break; }
        if (!ok) continue;
        const b = { x: sx, y: sy, a, L, B: 2.4 }; ut.brygger.push(b);
        // båtene ligger fortøyd langs begge sider, med baugen ut
        for (let s = 5; s < L - 1; s += 6.5) for (const side of [-1, 1]) {
          if (ut.båter.length >= T.båter || frø(k.X + s, k.Y + side, 3) < .3) continue;
          const bt = båt(k.X * 7 + s * 13 + side, false), o = side * (b.B / 2 + .7 + bt.B / 2);
          bt.x = sx + k.nx * s - k.ny * o; bt.y = sy + k.ny * s + k.nx * o; bt.a = a; ut.båter.push(bt);
        }
        continue;
      }
      if (iBy && h < .38 && ut.båter.length < T.båter) {
        // båt fortøyd langs kaia (parallelt med land), 2–3 m ut
        const bt = båt(k.X * 31 + k.Y, false), d = t0 + 1 + bt.B / 2; const x = k.x + k.nx * d, y = k.y + k.ny * d;
        if (!v.sjø(x, y) || !v.sjø(x + k.nx * 4, y + k.ny * 4) || !fri(ut.båter, x, y, 8) || !fri(ut.brygger, x, y, 25)) continue;
        bt.x = x; bt.y = y; bt.a = a + Math.PI / 2 * (h3 < .5 ? 1 : -1); ut.båter.push(bt); continue;
      }
      if (!iBy && h < .06 && ut.naust.length < T.naust && fri(ut.naust, k.x, k.y, 70)) {
        // naust på land med gavlen (porten) mot sjøen; lavt, slakt og ikke i hus eller på veg
        const L = 7 + h2 * 4, B = 4.5 + h3 * 1.5, d = t0 - L / 2 - .4, x = k.x + k.nx * d, y = k.y + k.ny * d;
        const hj = [[-L / 2, -B / 2], [L / 2, -B / 2], [L / 2, B / 2], [-L / 2, B / 2], [0, 0]].map(([p, q]) => [x + k.nx * p - k.ny * q, y + k.ny * p + k.nx * q]);
        // baksiden og midten på land (fronten kan stå i vannkanten), ingenting i hus eller på veg
        if (![hj[0], hj[3], hj[4]].every(([p, q]) => land(p, q)) || hj.some(([p, q]) => hind(p, q))) continue;
        const hs = hj.map(([p, q]) => v.moh(p, q)); if (Math.max(...hs) > 7 || Math.max(...hs) - Math.min(...hs) > 2.5) continue;
        const n = { x, y, a, L, B, farge: h3 < .55 ? 0 : h3 < .85 ? 1 : 2 }; ut.naust.push(n);
        // av og til en snekke rett utenfor
        if (h2 < .5 && ut.båter.length < T.båter) { const bt = båt(k.X + k.Y * 3, false, 'snekke'); bt.x = sx + k.nx * 3; bt.y = sy + k.ny * 3; bt.a = a; if (v.sjø(bt.x, bt.y)) ut.båter.push(bt); }
      }
    }
    // båter ute på sjøen (ingen land innen 40 m) og bøyer (land innen 25–90 m, ikke nærmere enn 20 m)
    // Småbåtene holder seg nær kysten (feilretting 12. nov: 48 snekker og sjarker lå spredt 110 km til havs ved Troll A): det må være land
    // innen LAND_NÆR meter – land inne i utsnittet; utenfor utsnittet vet vi ikke hva som er land.
    const LAND_NÆR = 800, kystNær = (x, y) => { for (let r = 100; r <= LAND_NÆR; r += 100) for (const [dx, dy] of RETN) { const p = x + dx * r, q = y + dy * r; if (inne(p, q, 0) && land(p, q)) return true; } return false; };
    for (const [st2, k0] of [[150, 7], [90, 8]]) for (let Y = Math.ceil((v.cy - S) / st2) * st2; Y < v.cy + S; Y += st2) { yield; for (let X = Math.ceil((v.cx - S) / st2) * st2; X < v.cx + S; X += st2) {
      const x0 = X - v.cx, y0 = Y - v.cy, h = frø(X, Y, k0); if (h > (k0 === 7 ? .16 : .3)) continue;
      const x = x0 + (frø(X, Y, 11) - .5) * st2 * .6, y = y0 + (frø(X, Y, 12) - .5) * st2 * .6; if (!inne(x, y, 60) || !v.sjø(x, y)) continue;
      const nærLand = r => RETN.some(([dx, dy]) => land(x + dx * r, y + dy * r));
      if (k0 === 7) { if (ut.båter.length >= T.båter || nærLand(20) || nærLand(40) || !kystNær(x, y)) continue; const bt = båt(X + Y, true); bt.x = x; bt.y = y; bt.a = frø(X, Y, 13) * 6.283; ut.båter.push(bt); }
      else { if (ut.bøyer.length >= T.bøyer || nærLand(20) || !(nærLand(45) || nærLand(90))) continue; ut.bøyer.push({ x, y, type: Math.floor(frø(X, Y, 14) * 3) }); }
    } }
    return ut;
  }
  // en båt: type, lengde, bredde, farge på skroget, styrehus; fri = ute på sjøen (gynger mer)
  function båt(n, fri, type) {
    const h = hash(n | 0), h2 = hash((n | 0) + 977), t = type || TYPER[h < .45 ? 0 : h < .75 ? 1 : 2];
    const L = t === 'snekke' ? 5 + h2 * 2 : t === 'sjark' ? 8 + h2 * 4 : 6 + h2 * 3;
    return { type: t, L, B: L * (t === 'motorbåt' ? .36 : .34), farge: FARGER[Math.floor(hash((n | 0) + 3331) * FARGER.length)], fri, fase: h2 * 6.283 };
  }
  // ---------- KAIER LANGS SJØEN (runde 15, 21. nov kveld) ----------
  // Brukeren: «langs kysten er det ofte sementert langs en kai – hvordan ser dette ut i spillet kontra virkeligheten?». Før var stranda
  // ved Skagenkaien i Stavanger en grønn skråning ned i vannet med båter langs. Nå får kysten nær kaiene i kaidataene (spill/kaier.js,
  // OpenStreetMap: kai/brygge, småbåthavn, havn) en ekte kai: loddrett front ned i sjøen, flatt dekke, gul kant, pullerter, fendere,
  // stiger og lykter. Småbåthavner får steinsetting (molo) i stedet for betong. Bare der dataene sier det – ikke over alt langs kysten.
  // Alle tallene er Claudes forslag (målt grovt mot bilder fra Skagenkaien/Strandkaien, Bryggen i Bergen og Skudeneshavn).
  const KAI = {
    rute: 12,                      // kystpunktene ligger i et rutenett på 12 m (som båtene over)
    bit: 16,                       // én kaibit er 16 m lang langs kysten (overlapper naboen, så det ikke blir hull på skrå)
    dybde: 10,                     // dekket går 10 m inn på land fra fronten (kyst3d.js stopper det før en veg eller et hus) …
    dybdeBy: 30,                   // … og i et tettsted inntil 30 m – byhavnene er brolagt helt bort til gata (Skagenkaien, Bryggen)
    front: 4.5,                    // fronten går 4,5 m ned fra dekket (under vannflaten)
    høyde: [1.3, 2.6],             // dekket ligger 1,3–2,6 moh. (Skagenkaien ca. 1,5–2 m over vannet)
    bratt: 3.5,                    // stiger terrenget mer enn 3,5 m over dekket rett bak fronten, er det berg – ingen kai der
    // hvor langt fra et kaipunkt kysten blir kai: kai/brygge 35 m + halve lengden (45–170 m), havn 60 m + 0,4 × lengden (90–230 m),
    // småbåthavn (steinsetting) 50 m + 0,4 × lengden (60–150 m); i et tettsted 1,35 ganger lenger (byhavnene er sammenhengende)
    radius: { kai: [35, .5, 45, 170], havn: [60, .4, 90, 230], marina: [50, .4, 60, 150] }, by: 1.35,
    // BYHAVN: i et tettsted er hele havnefronten kai der en gate går langs sjøen (Skagenkaien i Stavanger mangler som kai i OpenStreetMap,
    // men har gata 5–25 m fra vannet). Gjelder kyst innen 450 m fra et kaipunkt i tettstedet og med veg innen 25 m inn på land.
    byRadius: 450, gate: 25,
    // utstyr per kaibit: pullert 55 %, to fendere (ikke på trefront), stige 22 %, lykt 30 %
    pullert: .55, stige: .22, lykt: .3,
    // fronten: betong (de fleste), stein (eldre kaimur, som Skudeneshavn) eller trefront (som Skagenkaien); store havner alltid betong
    stil: { stein: .22, tre: .14 },
    tak: { pc: { biter: 900, stein: 1400 }, mobil: { biter: 320, stein: 500 } }
  };
  const radius = (t, l, iBy) => { const r = KAI.radius[t === 2 ? 'marina' : t === 3 ? 'havn' : 'kai'], v = Math.max(r[2], Math.min(r[3], r[0] + r[1] * (l || 0))); return iBy ? v * KAI.by : v; };
  // v som i plasser + v.kaier = [{ x, y, t, l }] relativt til utsnittets midte; v.ferje(x, y) = nær en ferjekai (egen modell i infra3d.js).
  // Svar: { biter: [{ x, y, a, z, stil, X, Y, pullert, stige, lykt }], stein: [{ x, y, z, s, r }] } – x, y er fronten (vannkanten), a = retningen
  // ut mot sjøen, z = dekket (moh.). plasserKaiG er generatoren (yield innimellom), plasserKai gjør alt i ett.
  function plasserKai(v) { const it = plasserKaiG(v); let r; while (!(r = it.next()).done); return r.value; }
  function* plasserKaiG(v) {
    const T = KAI.tak[v.mobil ? 'mobil' : 'pc'], S = v.S, st = KAI.rute, ut = { biter: [], stein: [] };
    if (!v.kaier || !v.kaier.length) return ut;
    const by = (x, y) => v.by ? v.by(x, y) : false, ferje = (x, y) => v.ferje ? v.ferje(x, y) : false;
    const inne = (x, y, m) => Math.abs(x) < S - m && Math.abs(y) < S - m;
    // kystruter nær kaipunktene: hver rute får den «sterkeste» kaien (betong slår steinsetting)
    const ruter = new Map();
    // når to kaipunkter dekker samme rute: kaiens egen radius (betong) slår steinsetting, som slår byhavn
    const rang = c => (c.gate ? 1 : c.stein ? 2 : 3);
    for (const k of v.kaier) {
      if (k.t === 4 && ferje(k.x, k.y)) continue;
      const iBy = by(k.x, k.y), r = radius(k.t, k.l, iBy), stein = k.t === 2, rr = iBy && !stein && v.gate ? Math.max(r, KAI.byRadius) : r;
      const X0 = Math.ceil((k.x + v.cx - rr) / st) * st, Y0 = Math.ceil((k.y + v.cy - rr) / st) * st;
      for (let Y = Y0; Y <= k.y + v.cy + rr; Y += st) for (let X = X0; X <= k.x + v.cx + rr; X += st) {
        const x = X - v.cx, y = Y - v.cy, d2 = (x - k.x) ** 2 + (y - k.y) ** 2; if (d2 > rr * rr || !inne(x, y, 30)) continue;
        // utenfor kaiens egen radius: bare byhavn (gate langs sjøen, sjekkes for kystpunktene under)
        const gate = d2 > r * r;
        const nøkkel = X + ',' + Y, f = ruter.get(nøkkel); if (f && rang(f) >= rang({ stein, gate })) continue;
        // stilen følger kaipunktet (samme kai = samme front); store havner er betong
        const h = frø(k.x + v.cx, k.y + v.cy, 21), stil = stein ? 'stein' : (k.t === 3 && k.l >= 150) || k.t === 4 ? 'betong' : h < KAI.stil.stein ? 'mur' : h < KAI.stil.stein + KAI.stil.tre ? 'tre' : 'betong';
        ruter.set(nøkkel, { X, Y, x, y, stein, stil: gate ? 'betong' : stil, gate });
      }
      yield;
    }
    // kystpunkt: land med sjø innen 10 m i 1–12 av 16 retninger; normalen peker ut mot sjøen
    const kyst = new Map(); let n0 = 0;
    for (const [nøkkel, c] of ruter) {
      if ((++n0 & 127) === 0) yield;
      if (v.sjø(c.x, c.y) || ferje(c.x, c.y)) continue;
      let sx = 0, sy = 0, n = 0; for (const [dx, dy] of RETN) if (v.sjø(c.x + dx * 10, c.y + dy * 10)) { sx += dx; sy += dy; n++; }
      if (!n || n > 12) continue; const l = Math.hypot(sx, sy); if (l < .5) continue;
      const nx = sx / l, ny = sy / l; let t0 = null; for (let t = 0; t <= 14; t += 1) if (v.sjø(c.x + nx * t, c.y + ny * t)) { t0 = t; break; }
      if (t0 === null) continue;
      if (c.gate && !(by(c.x, c.y) && v.gate(c.x, c.y, nx, ny))) continue;
      // åpent vann foran fronten (ikke ei lita grøft eller en bekk): 4 og 9 m ut
      if (!v.sjø(c.x + nx * (t0 + 4), c.y + ny * (t0 + 4)) || !v.sjø(c.x + nx * (t0 + 9), c.y + ny * (t0 + 9))) continue;
      kyst.set(nøkkel, Object.assign(c, { nx, ny, fx: c.x + nx * t0, fy: c.y + ny * t0 }));
    }
    // jevn ut: normalen og fronten som snittet av naboene (8 ruter rundt), så bitene står på linje og ikke i trapp
    const liste = [];
    for (const c of kyst.values()) {
      let nx = 0, ny = 0; const nab = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = kyst.get((c.X + dx * st) + ',' + (c.Y + dy * st)); if (o && o.stein === c.stein) { nx += o.nx; ny += o.ny; nab.push(o); } }
      const l = Math.hypot(nx, ny); if (l < .3) continue; nx /= l; ny /= l;
      let t = 0; for (const o of nab) t += (o.fx - c.x) * nx + (o.fy - c.y) * ny; t /= nab.length;
      liste.push({ c, nx, ny, fx: c.x + nx * t, fy: c.y + ny * t, d: c.x * c.x + c.y * c.y });
    }
    liste.sort((a, b) => a.d - b.d);
    let n1 = 0;
    for (const p of liste) {
      if ((++n1 & 63) === 0) yield;
      const { c, nx, ny, fx, fy } = p, a = Math.atan2(ny, nx);
      if (c.stein) {
        // steinsetting: 4 steiner fra 1,5 m oppe på land til 3 m ut i sjøen, lavere jo lenger ut
        for (let i = 0; i < 4 && ut.stein.length < T.stein; i++) { const h = frø(c.X, c.Y, 30 + i), h2 = frø(c.X, c.Y, 40 + i), l = -1.5 + i * 1.5 + (h - .5), b = (h2 - .5) * st;
          const x = fx + nx * l - ny * b, y = fy + ny * l + nx * b; ut.stein.push({ x, y, z: Math.max(-.9, 1 - l * .55), s: .9 + frø(c.X, c.Y, 50 + i) * .8, r: h2 * 6.283 }); }
        continue;
      }
      if (ut.biter.length >= T.biter) continue;
      // dekket: det høyeste av terrenget 2, 5 og 8 m inn (så dekket ligger over bakken), innenfor 1,3–2,6 moh.
      const hs = [2, 5, 8].map(d => v.moh(fx - nx * d, fy - ny * d)), hmaks = Math.max(...hs);
      if (hmaks > KAI.høyde[1] + KAI.bratt) continue;
      const z = Math.max(KAI.høyde[0], Math.min(KAI.høyde[1], hmaks));
      const h = frø(c.X, c.Y, 60);
      ut.biter.push({ x: fx, y: fy, a, z, stil: c.stil, X: c.X, Y: c.Y, by: by(fx, fy), pullert: h < KAI.pullert, stige: frø(c.X, c.Y, 61) < KAI.stige, lykt: frø(c.X, c.Y, 62) < KAI.lykt });
    }
    // dekkhøyden jevnes ut med naboene (ingen trinn på 0,5 m mellom to biter)
    for (const b of ut.biter) { let s = 0, n = 0; for (const o of ut.biter) if (Math.abs(o.x - b.x) < 20 && Math.abs(o.y - b.y) < 20) { s += o.z; n++; } b.zj = s / n; }
    for (const b of ut.biter) b.z = Math.round(b.zj * 20) / 20, delete b.zj;
    return ut;
  }
  // Ligger punktet (x, y) på et kaidekke? (båter, naust og brygger skal ikke stå oppå kaia; terrenget heves under dekket)
  function påKai(biter, x, y, kant = 0) { for (const b of biter) { const dx = x - b.x, dy = y - b.y; if (dx * dx + dy * dy > 1600) continue;
    const c = Math.cos(b.a), s = Math.sin(b.a), l = dx * c + dy * s, q = -dx * s + dy * c; if (l <= kant && l >= -(b.d || KAI.dybde) - kant && Math.abs(q) <= KAI.bit / 2 + kant) return b; } return null; }

  const API = { plasser, plasserG, båt, frø, TAK, KAI, plasserKai, plasserKaiG, påKai, radius };
  if (typeof module !== 'undefined') module.exports = API; else rot.Kyst = API;
})(typeof window !== 'undefined' ? window : globalThis);
