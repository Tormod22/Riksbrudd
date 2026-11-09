// Sjekker Dovre-flisvisningen i Chromium: ingen feil, riktige høyder, og hvor mye som lastes ned.
// Bruk (fra repo-roten): node pipeline/fliser/sjekk.js     (starter testserveren selv)
const { spawn } = require('child_process'), path = require('path');
const { chromium } = require('playwright');
const srv = spawn('python3', [path.join(__dirname, 'server.py'), path.join(__dirname, '../../site')], { stdio: 'ignore' });
const VISNINGER = [ // navn, sentrum (EPSG:25833), meter per punkt, forventet høyde (min, maks)
  ['Dombås 2 m', 193200, 6896300, 1.2, 600, 700],
  ['helt nær', 193600, 6895800, 0.3, 650, 760],
  ['fjell 8 m', 215000, 6915000, 6, 950, 1150],
  ['Snøhetta', 203188, 6922980, 8, 2200, 2290],
];
const fs = require('fs');
// Infrastrukturen (INFRA_TAG i index.html) hentes fra GitHub-releasen én gang til en lokal mappe (eller INFRA_DIR).
const INFRA = (() => { const m = fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/index.html'), 'utf8').match(/const INFRA_TAG = '([^']*)';/);
  if (!m || !m[1]) return null; const dir = process.env.INFRA_DIR || path.join(require('os').tmpdir(), m[1]);
  for (const f of ['manifest.json', 'infra.json']) if (!fs.existsSync(path.join(dir, f))) { fs.mkdirSync(dir, { recursive: true });
    require('child_process').execFileSync('curl', ['-fsSL', '-o', path.join(dir, f), `https://github.com/Tormod22/Riksbrudd/releases/download/${m[1]}/${f}`]); }
  return { tag: m[1], dir }; })();
// Vegnettet (S1/S2): VEGNETT_TAG i spill/kjoretoy-visning.js, hentes én gang til en lokal mappe (eller VEGNETT_DIR).
const VEGNETT = (() => { const m = fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/kjoretoy-visning.js'), 'utf8').match(/const VEGNETT_TAG = '([^']*)';/);
  if (!m) return null; const dir = process.env.VEGNETT_DIR || path.join(require('os').tmpdir(), m[1]);
  for (const f of ['manifest.json', 'vegnett.bin.gz']) if (!fs.existsSync(path.join(dir, f))) { fs.mkdirSync(dir, { recursive: true });
    require('child_process').execFileSync('curl', ['-fsSL', '-o', path.join(dir, f), `https://github.com/Tormod22/Riksbrudd/releases/download/${m[1]}/${f}`]); }
  return { tag: m[1], dir }; })();
(async () => {
  await new Promise(r => setTimeout(r, 800)); let feil = 0;
  { // versjonsmerket på terreng.js må stemme med innholdet (ellers kan nettleseren bruke en gammel kopi)
    const fs = require('fs'), D = path.join(__dirname, '../../site/dovre-fliser');
    const h = require('crypto').createHash('sha256').update(fs.readFileSync(path.join(D, 'terreng.js'))).digest('hex').slice(0, 10);
    const k = require('crypto').createHash('sha256'); for (const f of ['hoyde', 'kart', 'terreng', 'vektor']) k.update(fs.readFileSync(path.join(D, 'data', f + '.pmtiles')));
    const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8'), tag = 'kart-' + k.digest('hex').slice(0, 12);
    const spill = [...html.matchAll(/\/dovre-fliser\/(spill\/[a-z0-9_-]+\.js)\?v=([0-9a-f]+)/g)]
      .every(([, f, v]) => require('crypto').createHash('sha256').update(fs.readFileSync(path.join(D, f))).digest('hex').slice(0, 10) === v);
    const ok = html.includes('terreng.js?v=' + h) && html.includes(`const KART_TAG_DOVRE = '${tag}';`) && spill; if (!ok) feil++;
    console.log(`${ok ? 'ok  ' : 'FEIL'} versjonsmerker (terreng.js, spill/*.js og ${tag})` + (ok ? '' : ' – kjør python3 pipeline/fliser/versjon.py'));
  }
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });   // WebGL for 3D uten skjermkort
  // «eldre iPhone»: uten OffscreenCanvas og createImageBitmap, så reserveveien (<img>) testes – som i Safari før 16.4.
  for (const [w, h, navn, gammel] of [[1400, 900, 'PC'], [390, 844, 'mobil'], [390, 844, 'eldre iPhone', true]]) {
    const kt = await b.newContext({ viewport: { width: w, height: h } });
    if (gammel) await kt.addInitScript(() => { delete window.OffscreenCanvas; window.createImageBitmap = () => Promise.reject(new Error('ikke støttet')); });
    await kt.route(/^https?:\/\/(?!localhost)/, r => r.abort());   // ingen andre nettsider: spillet skal virke selv om en CDN er blokkert (brukeren fikk svart side 8. nov)
    if (INFRA) await kt.route(new RegExp('/api/kart/' + INFRA.tag + '/([a-z.-]+)/(\\d+)/(\\d+)$'), r => {
      const [, fil, fra, len] = r.request().url().match(/\/([a-z.-]+)\/(\d+)\/(\d+)$/), b = fs.readFileSync(path.join(INFRA.dir, fil));
      r.fulfill({ status: 200, contentType: fil.endsWith('.json') ? 'application/json' : 'application/octet-stream', body: b.subarray(+fra, +fra + +len) }); });
    if (VEGNETT) await kt.route(new RegExp('/api/kart/' + VEGNETT.tag + '/([a-z.-]+)/(\\d+)/(\\d+)$'), r => {
      const [, fil, fra, len] = r.request().url().match(/\/([a-z.-]+)\/(\d+)\/(\d+)$/);
      if (!fs.existsSync(path.join(VEGNETT.dir, fil))) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ status: 200, body: fs.readFileSync(path.join(VEGNETT.dir, fil)).subarray(+fra, +fra + +len) }); });
    const pg = await kt.newPage(); const err = [];
    pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => m.type() === 'error' && !(m.text().includes('net::ERR_FAILED') && !m.location().url.startsWith('http://localhost')) && !(m.location().url || '').includes('/api/kart/') && err.push(m.text()));   // /api finnes ikke lokalt (reserven testes under)   // forespørsler testen selv blokkerer, teller ikke
    await pg.goto('http://localhost:8765/dovre-fliser/'); await pg.waitForTimeout(3000);
    for (const [v, x, y, m, lo, hi] of VISNINGER) {
      await pg.evaluate(([x, y, m]) => { kam.x = x; kam.y = y; kam.m = m; skitten = true; peker = null; }, [x, y, m]);
      await pg.waitForFunction(() => VENTER.size === 0 && FERDIG.size > 0, null, { timeout: 20000 }); await pg.waitForTimeout(400);
      const s = await pg.evaluate(() => ({ h: hoydeVed(kam.x, kam.y), kb: Math.round(STAT.byte / 1024), req: STAT.req, z: niva() }));
      const ok = s.h != null && s.h >= lo && s.h <= hi; if (!ok) feil++;
      console.log(`${ok ? 'ok  ' : 'FEIL'} ${navn} ${v}: ${s.h == null ? '–' : Math.round(s.h)} moh. (venter ${lo}–${hi}), z${s.z}, totalt ${s.kb} KB i ${s.req} hentinger`);
    }
    const kilde = await pg.evaluate(() => STAT.kilde); const kOk = kilde === 'Vercel'; if (!kOk) feil++;
    console.log(`${kOk ? 'ok  ' : 'FEIL'} ${navn} reserve: uten /api brukes filene på serveren (kilde: ${kilde})`);
    // Spillet på flisene: alle lag får siktfelt, 1. lag får rute og går, patruljen går sin runde.
    await pg.waitForFunction(() => ENHETER.every(s => s.sikt), null, { timeout: 30000 });
    const sikt = await pg.evaluate(() => ENHETER.map(s => [s.navn, Math.round(s.siktVidde), s.her && Terreng.KLASSE[s.her.k]]));
    const siktOk = sikt.every(([, r]) => r >= 500 && r <= 12800); if (!siktOk) feil++;
    console.log(`${siktOk ? 'ok  ' : 'FEIL'} ${navn} siktfelt: ` + sikt.map(([n, r, k]) => `${n} ${r} m (${k})`).join(', '));
    await pg.evaluate(() => { ordre(ENHETER[0], 201500, 6900500); });
    await pg.waitForFunction(() => ENHETER[0].sti, null, { timeout: 20000 });
    const r = await pg.evaluate(() => ({ t: ENHETER[0].timerIgjen, n: ENHETER[0].sti.length, x: ENHETER[0].x, y: ENHETER[0].y }));
    await pg.evaluate(() => { tempo = 3600; }); await pg.waitForTimeout(2500);   // 1× er sanntid: 3600× = 1 spilltime per sekund
    const e2 = await pg.evaluate(() => ({ x: ENHETER[0].x, y: ENHETER[0].y, p: !!ENHETER[3].sti }));
    const flytt = Math.hypot(e2.x - r.x, e2.y - r.y), ruteOk = r.t > 1 && r.t < 3 && flytt > 500 && e2.p; if (!ruteOk) feil++;
    console.log(`${ruteOk ? 'ok  ' : 'FEIL'} ${navn} marsj: rute ${r.n} punkter, ${r.t.toFixed(2)} t (venter 1–3), gikk ${Math.round(flytt)} m på 2,5 s ved 3600×, patruljen ${e2.p ? 'går' : 'står'}`);
    // Tåke: fienden er skjult når ingen av våre ser den. Kamp på åpent fjell: patruljen blir slått ut.
    const tåke = await pg.evaluate(() => { const f = ENHETER[3]; f.x = 203000; f.y = 6918600; f.sti = null; f.siktSkitten = true; f.roligTil = 1e9; return !synlig(f); });
    await pg.evaluate(() => { tempo = 0; const f = ENHETER[3]; [[0, -400, 50], [1, -450, -120]].forEach(([i, dx, dy]) => { const s = ENHETER[i]; s.x = f.x + dx; s.y = f.y + dy; s.sti = null; s.siktSkitten = true; }); });
    await pg.waitForFunction(() => [0, 1, 3].every(i => ENHETER[i].siktVed && Math.hypot(ENHETER[i].x - ENHETER[i].siktVed[0], ENHETER[i].y - ENHETER[i].siktVed[1]) < 1 && !ENHETER[i].siktJobb), null, { timeout: 20000 });
    const settNå = await pg.evaluate(() => synlig(ENHETER[3]));
    await pg.evaluate(() => { for (let i = 0; i < 12 * 60 * 10; i++) sim(.1); });   // 12 spilltimer
    const k = await pg.evaluate(() => ENHETER.map(s => Terreng.uteAvKamp(s.menn)));
    const kampOk = tåke && settNå && k[3] >= 6; if (!kampOk) feil++;   // 6 = Terreng.UTE_AV_KAMP
    console.log(`${kampOk ? 'ok  ' : 'FEIL'} ${navn} tåke og kamp: skjult på avstand ${tåke ? 'ja' : 'NEI'}, sett på 400 m ${settNå ? 'ja' : 'NEI'}, ute av kamp: ${k.join('/')} (patruljen sist)`);
    if (INFRA) { // infrastruktur (fase A): lastes, tegnes og kan trykkes på
      await pg.waitForFunction(() => INFRA, null, { timeout: 30000 }); await pg.evaluate(() => { window.kamFør = { ...kam }; });
      const n = await pg.evaluate(() => Object.fromEntries(Object.entries(INFRA).map(([k, v]) => [k, v.length])));
      const dom = await pg.evaluate(() => { const t = INFRA.tettsted.find(o => o.e.navn === 'Dombås'); if (!t) return null;
        if (window.KJORETOY) for (const k of KJORETOY) k.x += 1e5;   // kolonnen står i Dombås og ville tatt trykket (kjøretøy går foran kartobjekter)
        kam.x = (t.bb[0] + t.bb[2]) / 2; kam.y = (t.bb[1] + t.bb[3]) / 2; kam.m = 20; skitten = true; tegn(); trykkPå(VW / 2, VH / 2);
        const svar = { folk: t.e.folk, panel: document.getElementById('pnavn').textContent }; if (window.KJORETOY) for (const k of KJORETOY) k.x -= 1e5; return svar; });
      const bru = await pg.evaluate(() => { const b = INFRA.bru.filter(o => o.deler[0].length >= 4).sort((a, c) => (c.e.lengde || 0) - (a.e.lengde || 0))[0]; const a = b.deler[0];
        kam.x = (a[0] + a[2]) / 2; kam.y = (a[1] + a[3]) / 2; kam.m = 2; skitten = true; tegn(); trykkPå(VW / 2, VH / 2); return [b.e.navn, b.e.lengde, document.getElementById('pnavn').textContent]; });
      const iok = n.bru > 20 && n.kraft > 0 && n.dam > 0 &&   // Dovre-utsnittet har ingen vegtunneler
         dom && dom.folk > 500 && dom.panel === 'Dombås' && (bru[0] || 'Bru uten navn') === bru[2]; if (!iok) feil++;
      console.log(`${iok ? 'ok  ' : 'FEIL'} ${navn} infrastruktur: ${JSON.stringify(n)}; Dombås ${dom && dom.folk} innb. (panel «${dom && dom.panel}»), lengste bru «${bru[0]}» ${bru[1]} m (panel «${bru[2]}»)`);
      // 3D: bruene bygges som egne 3D-objekter, og trykk på en bru i 3D gir panelet
      await pg.evaluate(() => { const b = INFRA.bru.find(o => o.e.navn === 'Jora bru') || INFRA.bru[0], a = b.deler[0]; kam.x = a[0]; kam.y = a[1]; kam.m = 1; window.testBru = b; });
      await pg.click('#v3d'); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 60000 });
      await pg.evaluate(() => { Object.assign(R3.bane, { x: window.testBru.deler[0][0] - R3.ut.cx, y: window.testBru.deler[0][1] - R3.ut.cy, avst: 500, pitch: .9 }); tegn3d(); });
      const b3 = await pg.evaluate(() => { const b = window.testBru, a = b.deler[0], k = (a.length >> 2) << 1, q = brupunkt3(b, a[k], a[k + 1]), o = q && finnInfra3d(q[0], q[1]);
        return { n: R3.ut.bru ? R3.ut.bru.antall : 0, mesh: !!R3.bruMesh, treff: o ? o.e.navn : null, navn: b.e.navn }; });
      await pg.click('#v3d');
      const b3ok = b3.n > 0 && b3.mesh && b3.treff === b3.navn; if (!b3ok) feil++;
      console.log(`${b3ok ? 'ok  ' : 'FEIL'} ${navn} infrastruktur i 3D: ${b3.n} bruer som 3D-objekter, trykk på «${b3.navn}» gir «${b3.treff}»`);
      await pg.evaluate(() => { valgt = null; visPanel(); Object.assign(kam, window.kamFør); skitten = true; });   // tilbake til Snøhetta for 3D-testen
    }
    if (VEGNETT) { // S2: kolonnen velges med et trykk, får ordre «Kjør til» Otta, følger E6 og er framme i riktig tid
      const før = await pg.evaluate(() => ({ ...kam }));
      await pg.evaluate(() => { tempo = 0; const k = KJORETOY[0]; kam.x = k.x; kam.y = k.y; kam.m = 1.2; skitten = true; tegn(); });
      const [sx, sy] = await pg.evaluate(() => { const k = KJORETOY[0]; return [(k.x - kam.x) / kam.m + VW / 2, -(k.y - kam.y) / kam.m + VH / 2]; });
      await pg.mouse.click(sx, sy);
      const valgtNavn = await pg.evaluate(() => document.getElementById('pnavn').textContent);
      await pg.click('#handl button');
      await pg.evaluate(() => { kam.x = 212021; kam.y = 6860888 + 120 * 30; kam.m = 30; skitten = true; tegn(); });
      const [ox, oy] = await pg.evaluate(() => [(212021 - kam.x) / kam.m + VW / 2, -(6860888 - kam.y) / kam.m + VH / 2]);
      await pg.mouse.click(ox, oy);
      await pg.waitForFunction(() => KJORETOY[0].sti, null, { timeout: 120000 });
      const k2 = await pg.evaluate(() => { const k = KJORETOY[0], s = Kjoretoy.status(k); let e6 = 0, alt = 0;
        for (const e of Kjoretoy.lenkerIgjen(k)) { const l = VEGNETT.lenke(e); alt += l.lengde; if (l.vegkategori === 'E' && l.vegnummer === 6) e6 += l.lengde; }
        let n = 0; while (k.sti && n < 2000) { sim(.1); n++; }
        return { plan: s.sekunder, e6: e6 / alt, km: alt / 1000, framme: k.framme, kjørt: n * 6, nær: Math.hypot(k.x - 212021, k.y - 6860888) }; });
      const kok = valgtNavn === '1. lastebilkolonne' && k2.framme && k2.e6 > .9 && Math.abs(k2.kjørt - k2.plan) <= 7 && k2.nær < 300; if (!kok) feil++;
      console.log(`${kok ? 'ok  ' : 'FEIL'} ${navn} kjøretøy: «${valgtNavn}» Dombås–Otta ${k2.km.toFixed(1)} km, ${(100 * k2.e6).toFixed(0)} % på E6, plan ${(k2.plan / 60).toFixed(0)} min, framme etter ${(k2.kjørt / 60).toFixed(0)} spillminutter`);
      await pg.evaluate(f => { Object.assign(kam, f); tempo = 1; valgt = null; visPanel(); skitten = true; }, før);
    }
    // 3D: bygges av flisene, viser riktig høyde, og en ordre kan gis
    await pg.click('#v3d'); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 60000 });
    const d3 = await pg.evaluate(() => ({ h: Math.round(hoyde3d(203188, 6922980)), n: R3.ut.N }));
    await pg.click('#v3d');
    const d3ok = Math.abs(d3.h - 2287) < 40; if (!d3ok) feil++;
    console.log(`${d3ok ? 'ok  ' : 'FEIL'} ${navn} 3D: Snøhetta ${d3.h} moh. i 3D-terrenget (${d3.n}×${d3.n} punkter)`);
    if (err.length) { feil++; console.log('FEIL i nettleseren:', err.slice(0, 5)); }
    await kt.close();
  }
  await b.close(); srv.kill();
  console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
