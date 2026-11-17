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
// Bekker og kraftledninger for hele Norge (NVE_TAG i spill/nvebiter.js, pipeline/fliser/nve.py): hentes én gang til en lokal mappe (eller NVE_DIR)
const NVE = (() => { const m = fs.readFileSync(path.join(__dirname, '../../site/dovre-fliser/spill/nvebiter.js'), 'utf8').match(/const NVE_TAG = '(kart-nve-[0-9a-f]{12})';/);
  if (!m) return null; const dir = process.env.NVE_DIR || path.join(require('os').tmpdir(), m[1]);
  for (const f of ['manifest.json', 'kraft.json', 'bekker.json']) if (!fs.existsSync(path.join(dir, f))) { fs.mkdirSync(dir, { recursive: true });
    require('child_process').execFileSync('curl', ['-fsSL', '-o', path.join(dir, f), `https://github.com/Tormod22/Riksbrudd/releases/download/${m[1]}/${f}`]); }
  return { tag: m[1], dir }; })();
(async () => {
  await new Promise(r => setTimeout(r, 800)); let feil = 0;
  { // syntaks i alle skriptfilene (en kommentar som slukte resten av en linje stoppet hele kartet 9. nov)
    const D = path.join(__dirname, '../../site/dovre-fliser'), filer = ['kartflis.js', 'kartflis-arbeider.js', 'terreng.js', ...fs.readdirSync(path.join(D, 'spill')).filter(f => f.endsWith('.js')).map(f => 'spill/' + f)];
    const dårlige = filer.filter(f => { try { require('child_process').execFileSync(process.execPath, ['--check', path.join(D, f)], { stdio: 'pipe' }); return false; } catch (e) { return true; } });
    { const html = fs.readFileSync(path.join(D, 'index.html'), 'utf8'), blokker = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]), tmp = path.join(require('os').tmpdir(), 'riksbrudd-hoved.js');
      fs.writeFileSync(tmp, blokker.sort((a, b) => b.length - a.length)[0]); filer.push('index.html (hovedskriptet)');
      try { require('child_process').execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { dårlige.push('index.html (hovedskriptet)'); } }   // en kommentar kan sluke resten av en linje
    // kode inne i en kommentar (en //-kommentar midt på en linje har slukt kode tre ganger 10. nov – gyldig syntaks, men koden kjøres ikke)
    for (const f of [...filer.filter(f => !f.startsWith('index.html')), 'index.html']) fs.readFileSync(path.join(D, f), 'utf8').split('\n').forEach((l, n) => {
      const i = l.search(/(^|[^:'"`\\])\/\/ /); if (i < 0) return; const k = l.slice(i);
      if (/\b\w+(\.\w+)+\([^)]*\)\s*;|\b\w+(\.\w+)+\s*=\s*[^=>\s]/.test(k)) dårlige.push(`${f}:${n + 1} (kode i kommentar: ${k.trim().slice(0, 60)})`); });
    if (dårlige.length) feil++; console.log(`${dårlige.length ? 'FEIL' : 'ok  '} syntaks i ${filer.length} skriptfiler` + (dårlige.length ? ': ' + dårlige.join(', ') : ''));
  }
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
  // de tre profilene kjører samtidig (hver i sin fane), så hele sjekken tar omtrent like lang tid som én profil
  // SJEKK_PROFIL=PC (eller mobil / «eldre iPhone») kjører bare den ene, for en rask runde underveis
  const PROFILER = [[1400, 900, 'PC'], [390, 844, 'mobil'], [390, 844, 'eldre iPhone', true]].filter(p => !process.env.SJEKK_PROFIL || p[2] === process.env.SJEKK_PROFIL);
  await Promise.all(PROFILER.map(async ([w, h, navn, gammel]) => {
    const kt = await b.newContext({ viewport: { width: w, height: h } });
    if (gammel) await kt.addInitScript(() => { delete window.OffscreenCanvas; window.createImageBitmap = () => Promise.reject(new Error('ikke støttet')); });
    await kt.route(/^https?:\/\/(?!localhost)/, r => r.abort());   // ingen andre nettsider: spillet skal virke selv om en CDN er blokkert (brukeren fikk svart side 8. nov)
    if (INFRA) await kt.route(new RegExp('/api/kart/' + INFRA.tag + '/([a-z.-]+)/(\\d+)/(\\d+)$'), r => {
      const [, fil, fra, len] = r.request().url().match(/\/([a-z.-]+)\/(\d+)\/(\d+)$/), b = fs.readFileSync(path.join(INFRA.dir, fil));
      r.fulfill({ status: 200, contentType: fil.endsWith('.json') ? 'application/json' : 'application/octet-stream', body: b.subarray(+fra, +fra + +len) }); });
    if (NVE) await kt.route(new RegExp('/api/kart/' + NVE.tag + '/([a-z.-]+)/(\\d+)/(\\d+)$'), r => {
      const [, fil, fra, len] = r.request().url().match(/\/([a-z.-]+)\/(\d+)\/(\d+)$/);
      r.fulfill({ status: 200, contentType: 'application/json', body: (NVE[fil] = NVE[fil] || fs.readFileSync(path.join(NVE.dir, fil))).subarray(+fra, +fra + +len) }); });
    if (VEGNETT) await kt.route(new RegExp('/api/kart/' + VEGNETT.tag + '/([a-z.-]+)/(\\d+)/(\\d+)$'), r => {
      const [, fil, fra, len] = r.request().url().match(/\/([a-z.-]+)\/(\d+)\/(\d+)$/);
      if (!fs.existsSync(path.join(VEGNETT.dir, fil))) return r.fulfill({ status: 404, body: '' });
      r.fulfill({ status: 200, body: fs.readFileSync(path.join(VEGNETT.dir, fil)).subarray(+fra, +fra + +len) }); });
    const pg = await kt.newPage(); const err = [];
    pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => m.type() === 'error' && !(m.text().includes('net::ERR_FAILED') && !m.location().url.startsWith('http://localhost')) && !(m.location().url || '').includes('/api/kart/') && err.push(m.text()));   // /api finnes ikke lokalt (reserven testes under)   // forespørsler testen selv blokkerer, teller ikke
    await pg.goto(`http://localhost:${process.env.PORT || 8765}/dovre-fliser/`); await pg.waitForTimeout(3000);
    await pg.evaluate(() => { if (window.AI) AI.på = false; if (window.VaerSpill) { Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.oppdater(); } if (window.KVAL) KVAL.bytt('høy'); });   // klart vær i testene (sikten ellers tilfeldig)   // motstanderne (S8) står stille under de andre testene; S8 testes for seg
    for (const [v, x, y, m, lo, hi] of VISNINGER) {
      await pg.evaluate(([x, y, m]) => { kam.x = x; kam.y = y; kam.m = m; skitten = true; peker = null; }, [x, y, m]);
      await pg.waitForFunction(() => VENTER.size === 0 && FERDIG.size > 0, null, { timeout: 20000 }); await pg.waitForTimeout(400);
      // (under full last kan flisene for det nye stedet ennå ikke være bestilt når køen leses tom: vent også på selve høyden, høyst 20 s)
      await pg.waitForFunction(() => VENTER.size === 0 && hoydeVed(kam.x, kam.y) != null, null, { timeout: 20000 }).catch(() => {});
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
        if (window.OLJE) for (const b of OLJE.BASER) b.x += 1e5;     // det samme gjelder basen
        kam.x = (t.bb[0] + t.bb[2]) / 2; kam.y = (t.bb[1] + t.bb[3]) / 2; kam.m = 20; skitten = true; tegn(); trykkPå(VW / 2, VH / 2);
        const svar = { folk: t.e.folk, panel: document.getElementById('pnavn').textContent }; if (window.KJORETOY) for (const k of KJORETOY) k.x -= 1e5; if (window.OLJE) for (const b of OLJE.BASER) b.x -= 1e5; return svar; });
      const bru = await pg.evaluate(() => { const b = INFRA.bru.filter(o => o.deler[0].length >= 4).sort((a, c) => (c.e.lengde || 0) - (a.e.lengde || 0))[0]; const a = b.deler[0];
        kam.x = (a[0] + a[2]) / 2; kam.y = (a[1] + a[3]) / 2; kam.m = 2; skitten = true; tegn(); trykkPå(VW / 2, VH / 2); return [b.e.navn, b.e.lengde, document.getElementById('pnavn').textContent]; });
      const iok = n.bru > 20 && n.kraft > 0 && n.dam > 0 &&   // Dovre-utsnittet har ingen vegtunneler
         dom && dom.folk > 500 && dom.panel === 'Dombås' && (bru[0] || 'Bru uten navn') === bru[2]; if (!iok) feil++;
      console.log(`${iok ? 'ok  ' : 'FEIL'} ${navn} infrastruktur: ${JSON.stringify(n)}; Dombås ${dom && dom.folk} innb. (panel «${dom && dom.panel}»), lengste bru «${bru[0]}» ${bru[1]} m (panel «${bru[2]}»)`);
      // 3D: bruene bygges som egne 3D-objekter, og trykk på en bru i 3D gir panelet
      await pg.evaluate(() => { const b = INFRA.bru.find(o => o.e.navn === 'Jora bru') || INFRA.bru[0], a = b.deler[0]; kam.x = a[0]; kam.y = a[1]; kam.m = 1; window.testBru = b; });
      await pg.click('#v3d'); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 60000 });
      await pg.evaluate(() => { Object.assign(R3.bane, { x: window.testBru.deler[0][0] - R3.ut.cx, y: window.testBru.deler[0][1] - R3.ut.cy, avst: 500, pitch: .9 }); tegn3d(); });
      const b3 = await pg.evaluate(() => { const b = window.testBru, [bx, by] = infraPunkt3(b), q = brupunkt3(b, bx, by), o = q && finnInfra3d(q[0], q[1]);
        return { n: R3.ut.bru ? R3.ut.bru.antall : 0, mesh: !!R3.bruMesh || !!(R3.infra3d && R3.infra3d.length), treff: o ? o.e.navn : null, navn: b.e.navn }; });
      // vegetasjon (spill/vegetasjon3d.js): minst tre treslag i scenen ved Jora (elv, skog, myr), og ingen trær, blomster, bregner eller siv
      // i vannet (vannmasken) eller på vegen; kameraet ned til bakken (avst 80) så plantene rundt kameraet lages
      await pg.evaluate(() => { R3.bane.avst = 80; R3.bane.pitch = .3; R3.lodVed = null; tegn3d(); tegn3d(); });
      const veg = await pg.evaluate(() => { const V3 = window.Vegetasjon3d, u = R3.ut; if (!V3) return null; const ut = V3.utvalg(4000), feil = [];
        // blomster, bregner og siv skal heller ikke stå på fortauet (nøyaktig vegbredde), i jernbanesporet eller inntil hus (V3.fri, 12. nov)
        for (const [x, y, art] of ut) if (V3.iVann(x, y) || (u.påVeg && u.påVeg(x, y)) || (V3.fri && ['blomst', 'bregne', 'siv'].includes(art) && !V3.fri(x, y))) feil.push([Math.round(x), Math.round(y), art]);
        return { slag: V3.treslag(), antall: V3.antall(), n: ut.length, planter: ut.filter(q => ['blomst', 'bregne', 'siv'].includes(q[2])).length, feil: feil.slice(0, 5), nFeil: feil.length }; });
      const vegOk = veg && veg.slag.length >= 3 && veg.nFeil === 0 && veg.n > 100; if (!vegOk) feil++;
      console.log(`${vegOk ? 'ok  ' : 'FEIL'} ${navn} vegetasjon i 3D: treslag ${veg && veg.slag.join(', ')}; ${veg && veg.n} sjekket (${veg && veg.planter} planter), ${veg && veg.nFeil} i vann eller på veg ${veg && veg.nFeil ? JSON.stringify(veg.feil) : ''}`);
      // VAKT (12. nov, Nidelva): der kartet alt har elva som vannflate (vannmasken), tegnes ikke bekkebåndet oppå – ingen punkter i
      // båndet ligger tydelig ute i vannet (vann i punktet og 2 m til hver side).
      const bvann = await pg.evaluate(() => { const u = R3.ut, S = window.BEKKER_STAT || {}, vd = u.vannData, r = { bånd: (u.bekk || []).length, kutt: S.iVann, iVann: 0, n: 0, maske: !!(vd && vd.W) };
        if (!r.maske) return r;
        const v = (x, y) => { const i = Math.floor((x + u.S) / (2 * u.S) * vd.W), j = Math.floor((u.S - y) / (2 * u.S) * vd.W); return i >= 0 && j >= 0 && i < vd.W && j < vd.W && vd.d[(j * vd.W + i) * 4] > 127; };
        for (const b of u.bekk || []) for (const p of b.P3) { r.n++; if (v(p[0], p[1]) && v(p[0] + 2, p[1]) && v(p[0] - 2, p[1]) && v(p[0], p[1] + 2) && v(p[0], p[1] - 2)) r.iVann++; }
        return r; });
      const bvannOk = bvann.maske && bvann.n > 20 && bvann.iVann === 0; if (!bvannOk) feil++;   // ved Jora er ingen linjer kuttet (elva er ikke vannflate i kartet her): regelen selv testes i test_bekker.js
      console.log(`${bvannOk ? 'ok  ' : 'FEIL'} ${navn} bekker og vannflater: ${bvann.bånd} vannbånd ved Jora bru (${bvann.n} punkt), ${bvann.iVann} ute i kartets vannflate, ${bvann.kutt} linjer kuttet mot vannet`);
      // VAKT (bruer i 3D, spill/infra3d.js): modellene finnes i scenen, søylene og landkarene står på bakken (bunnen ikke over terrenget og
      // ikke mer enn 2,5 m ned i det), dekket ligger over terrenget langs hele brua, vegene er løftet opp på dekket, og en sprengt bru har gap
      const bv = await pg.evaluate(async () => {
        const sjekk = () => { const u = R3.ut, ms = u.bruer3d || [], z = (x, y) => (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R3.EX;
          const søyler = ms.flatMap(m => m.søyler), svever = søyler.filter(s => s.bunn > z(s.x, s.y) + .05), dype = søyler.filter(s => !s.landkar && s.bunn < z(s.x, s.y) - 2.5);
          const mesh = (R3.infra3d || []).find(m => m.name === 'infra3d'), tri = mesh && R3.scene.children.includes(mesh) ? mesh.geometry.attributes.position.count / 3 : 0;
          return { ms, u, bruer: ms.length, søyler: søyler.filter(s => !s.landkar).length, landkar: søyler.filter(s => s.landkar).length, svever: svever.length, dype: dype.length, tri,
            under: ms.filter(m => m.D.some(d => d.z < z(d.x, d.y) + (d.s > 6 && d.s < m.L - 6 ? .5 : .05))).map(m => m.navn), typer: [...new Set(ms.map(m => m.sort))].join('/'), løftet: ms.reduce((a, m) => a + (m.løftet || 0), 0),
            // 13. nov: nødbruer der en veg krysser elva uten bru i dataene, «Jora bru» flyttet til vegen sin, du går oppå dekket (Liv3d.dekke)
            // og den brede elva ved siden av brua stopper deg (u.iElv)
            nød: ms.filter(m => m.nød).length, feilLinje: ms.filter(m => m.feilLinje).map(m => m.navn),
            lange: ms.filter(m => m.L > 15).length, påDekke: ms.filter(m => { if (m.L <= 15) return false; const c = m.D[m.D.length >> 1], d = Liv3d.dekke(u, c.x, c.y); return d !== null && d - c.g > .8; }).length,
            elv: !!u.iElv && ms.some(m => { const c = m.D[m.D.length >> 1], r = m.W / 2 + 6; return u.iElv(c.x + c.nx * r, c.y + c.ny * r) || u.iElv(c.x - c.nx * r, c.y - c.ny * r); }) }; };
        const a = sjekk(), m0 = a.ms.find(m => m.navn === window.testBru.e.navn && m.veg) || a.ms.find(m => m.veg) || a.ms[0];
        if (!m0) return { a, gap: null };
        // sprengt: modellene lages på nytt for utsnittet (uten å bygge 3D om igjen) med brua i INFRA_TILSTAND
        INFRA_TILSTAND.set('bru:' + m0.id, { tilstand: 'sprengt' }); const b = await Infra3d.modeller(R3.ut, true);
        const m1 = b.bruer.find(m => m.id === m0.id), G = Bruer.GAP;
        // ingen veg på dekkhøyde inne i gapet (bilene kjører ikke ut i lufta)
        const iGap = m1 ? (b.veger || []).flatMap(v => v.P).filter(p => { const q = Bruer.projiser(m1.P2, p[0], p[1]); return q.d < m1.W / 2 && q.s > m1.L * G[0] && q.s < m1.L * G[1] && p[2] > m1.zPå(q.s) - 1; }).length : -1;
        INFRA_TILSTAND.delete('bru:' + m0.id); const c = await Infra3d.modeller(R3.ut, true);
        const strip = x => { delete x.ms; delete x.u; return x; };
        return { a: strip(a), navn: m0.navn, gap: m1 ? { stykker: m1.stykker.length, sprengt: m1.sprengt, iGap } : null, etter: !c.bruer.find(m => m.id === m0.id).sprengt };
      });
      const bvok = bv.a.bruer > 0 && bv.a.tri > 1000 && bv.a.søyler > 0 && bv.a.landkar >= 2 * bv.a.bruer && !bv.a.svever && !bv.a.dype && !bv.a.under.length && bv.a.løftet > 0 &&
        bv.gap && bv.gap.sprengt && bv.gap.stykker === 2 && bv.gap.iGap === 0 && bv.etter && bv.a.nød >= 1 && !bv.a.feilLinje.includes(bv.navn) && bv.a.påDekke === bv.a.lange && bv.a.elv; if (!bvok) feil++;
      console.log(`${bvok ? 'ok  ' : 'FEIL'} ${navn} bruer i 3D: ${bv.a.bruer} modeller (${bv.a.typer}, ${bv.a.tri} trekanter), ${bv.a.søyler} søyler og ${bv.a.landkar} landkar – ${bv.a.svever} svever, ${bv.a.dype} for dype; `
        + `dekket under terrenget: ${bv.a.under.join(', ') || 'ingen'}; ${bv.a.løftet} vegpunkter løftet opp på dekket; sprengt «${bv.navn}»: ${bv.gap ? bv.gap.stykker + ' stykker, ' + bv.gap.iGap + ' vegpunkter i gapet' : 'ingen'}, hel igjen etterpå: ${bv.etter}; `
        + `${bv.a.nød} nødbruer, vegbruer uten veg: ${bv.a.feilLinje.join(', ') || 'ingen'}, du går oppå dekket på ${bv.a.påDekke} av ${bv.a.lange}, elva stopper deg: ${bv.a.elv}`);
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
      // S3: tom base -> «Hent olje …» -> trykk ved Nyhamna -> oljen kjøres til basen -> en lastebil kan bygges
      if (INFRA) {
        await pg.waitForFunction(() => OLJE.TERMINALER.length >= 6, null, { timeout: 30000 });
        const b0 = await pg.evaluate(() => { const b = OLJE.BASER[0]; kam.x = b.x; kam.y = b.y; kam.m = 2; skitten = true; tegn(); return [VW / 2, VH / 2]; });
        await pg.mouse.click(b0[0], b0[1]);
        const tom = await pg.evaluate(() => ({ panel: document.getElementById('pnavn').textContent, låst: [...document.querySelectorAll('#handl button')].every(b => b.disabled) }));
        await pg.evaluate(() => velgKjoretoy(KJORETOY[0]));
        await pg.locator('#handl button', { hasText: 'Hent olje' }).click();
        const ny = await pg.evaluate(() => { const t = OLJE.TERMINALER.find(t => t.navn === 'Nyhamna'); kam.x = t.x; kam.y = t.y + 40 * 60; kam.m = 60; skitten = true; tegn(); return [VW / 2, VH / 2 + 40]; });
        await pg.mouse.click(ny[0], ny[1]);
        await pg.waitForFunction(() => KJORETOY[0].oppdrag && KJORETOY[0].sti, null, { timeout: 120000 });
        const s3 = await pg.evaluate(() => { const b = OLJE.BASER[0]; let n = 0; while (b.beholdning < 100 && n < 30000) { sim(.1); n++; }
          const timer = n * 6 / 3600, før = KJORETOY.length; const r = Okonomi.bygg(b, 'lastebil'); for (let i = 0; i < 1300; i++) sim(.1);
          return { terminal: KJORETOY[0].oppdrag && KJORETOY[0].oppdrag.terminal.navn, olje: Math.round(b.beholdning), timer, bygget: !!r.ok, nye: KJORETOY.length - før }; });
        const s3ok = tom.panel === 'Hovedbase Dombås' && tom.låst && s3.terminal === 'Nyhamna' && s3.bygget && s3.nye === 1; if (!s3ok) feil++;
        console.log(`${s3ok ? 'ok  ' : 'FEIL'} ${navn} oljeøkonomi: tom base (knapper låst: ${tom.låst}), henter fra ${s3.terminal}, første last etter ${s3.timer.toFixed(1)} spilltimer, bygget lastebil: ${s3.bygget}, nye kjøretøy: ${s3.nye}`);
        await pg.evaluate(() => { Okonomi.avbryt(KJORETOY[0], Kjoretoy); });
        // S4: 1. lag tomt for ammunisjon -> «Forsyn …» med kolonnen -> trykk på laget -> fullt igjen; kjøringen har brukt drivstoff
        const s4før = await pg.evaluate(() => { const l = ENHETER[0], k = KJORETOY[0]; l.ammo = 0; k.x = OLJE.BASER[0].x; k.y = OLJE.BASER[0].y; k.sti = null;
          velgKjoretoy(k); return { drivstoff: Forsyning.drivstoff(k), olje: OLJE.BASER[0].beholdning }; });
        await pg.locator('#handl button', { hasText: 'Forsyn' }).click();
        const lp = await pg.evaluate(() => { const l = ENHETER[0]; l.x = 193400; l.y = 6896000; kam.x = l.x; kam.y = l.y; kam.m = 2; skitten = true; tegn(); return [VW / 2, VH / 2]; });
        await pg.mouse.click(lp[0], lp[1]);
        await pg.waitForFunction(() => KJORETOY[0].oppdrag && KJORETOY[0].oppdrag.type === 'forsyning', null, { timeout: 60000 });
        const s4 = await pg.evaluate(() => { let n = 0; while (KJORETOY[0].oppdrag && n < 3000) { sim(.1); n++; } const lag = ENHETER[0];
          return { ammo: Forsyning.ammo(lag), skyt: Forsyning.skyt({ ammo: 0 }), tekst: KROKER.lagTekst.map(h => h(lag)).join() }; });
        const s4ok = s4.ammo === 1 && s4.skyt === 0 && s4før.drivstoff < 1 && /ammunisjon/.test(s4.tekst); if (!s4ok) feil++;
        console.log(`${s4ok ? 'ok  ' : 'FEIL'} ${navn} forsyning: kolonnens drivstoff etter kjøringen ${Math.round(100 * s4før.drivstoff)} %, laget fra 0 til ${Math.round(100 * s4.ammo)} % ammunisjon, tomt lag skyter ikke («${s4.tekst}»)`);
        // S5: ingeniørlaget sprenger en E6-bru på ruten Dombås–Otta (knapp + trykk), kolonnen som er underveis kjører om; så reparasjon fra infrastrukturpanelet
        await pg.evaluate(() => { Okonomi.avbryt(KJORETOY[0], Kjoretoy); KJORETOY[0].oppdrag = null; });
        const s5a = await pg.evaluate(() => { const k = KJORETOY[0]; k.x = 193233; k.y = 6896398; k.sti = null;
          const p = Kjoretoy.planlegg(k, VEGNETT, [212021, 6860888]); let bru = null, lenke = -1;
          for (const e of Kjoretoy.lenkerIgjen(k)) { for (const [t, id] of VEGNETT.infraPåLenke(e)) if (t === 60 && !bru) { bru = INFRA.bru.find(o => o.e.id === id) || null; lenke = e; } if (bru) break; }
          window._s5sti = k.sti; k.sti = null; if (!bru) return null;
          const s = ENHETER.find(s => s.ingeniør), a = bru.deler[0]; s.x = a[0] + 60; s.y = a[1] + 60; s.sti = null; valgt = s; visPanel();
          kam.x = a[0]; kam.m = 1; kam.y = a[1] - .2 * VH * kam.m; skitten = true; tegn(); window._s5 = bru;   // brua øverst på skjermen (panelet dekker nedre del på mobil)
          return { meter: p.meter, id: bru.e.id, lenke, xy: [VW / 2, VH * .3] }; });
        if (!s5a) { feil++; console.log(`FEIL ${navn} ødeleggelse: fant ingen bru på ruten`); }
        else {
          await pg.locator('#handl button', { hasText: 'Spreng / sperr' }).click();
          await pg.mouse.click(s5a.xy[0], s5a.xy[1]);
          const s5b = await pg.evaluate(async () => { const bru = window._s5, s = ENHETER.find(s => s.ingeniør), mens = Odeleggelse.tilstand(INFRA_TILSTAND, 'bru', bru.e.id);
            const arbeid = INGENIØRARBEID.has(s); let n = 0; while (INGENIØRARBEID.size && n < 2000) { sim(.1); n++; }
            await new Promise(r => setTimeout(r, 50));
            const k = KJORETOY[0]; k.sti = window._s5sti; k.x = 193233; k.y = 6896398; S5.endring(); await new Promise(r => setTimeout(r, 50));
            const omkjørt = !!k.sti && !Kjoretoy.lenkerIgjen(k).some(e => VEGNETT._sperretAv.has(e)); Kjoretoy.stopp(k);
            kam.x = (bru.bb[0] + bru.bb[2]) / 2; kam.y = (bru.bb[1] + bru.bb[3]) / 2; skitten = true; tegn();
            const q = Kjoretoy.planlegg(KJORETOY[0], VEGNETT, [212021, 6860888]); Kjoretoy.stopp(KJORETOY[0]);
            return { mens, arbeid, min: n * 6 / 60, t: Odeleggelse.tilstand(INFRA_TILSTAND, 'bru', bru.e.id), sperret: VEGNETT._sperretAv.size, omkjørt, meter: q.feil ? null : q.meter, tekst: document.getElementById('logg').textContent }; });
          await pg.evaluate(() => { valgt = null; visPanel(); visInfo(window._s5); });
          const info = await pg.evaluate(() => document.getElementById('psub').textContent);
          if (!await pg.locator('#handl button', { hasText: 'Reparer med' }).count()) { feil++; console.log(`FEIL ${navn} ødeleggelse: ingen «Reparer med» i panelet «${info}»`, JSON.stringify(s5b), await pg.evaluate(() => [...INFRA_TILSTAND.keys()].join())); }
          else await pg.locator('#handl button', { hasText: 'Reparer med' }).click();
          const s5c = await pg.evaluate(async () => { const bru = window._s5; let n = 0; while (INGENIØRARBEID.size && n < 6000) { sim(.1); n++; }
            await new Promise(r => setTimeout(r, 50)); const q = Kjoretoy.planlegg(KJORETOY[0], VEGNETT, [212021, 6860888]); Kjoretoy.stopp(KJORETOY[0]);
            return { t: Odeleggelse.tilstand(INFRA_TILSTAND, 'bru', bru.e.id), timer: n * 6 / 3600, sperret: VEGNETT._sperretAv.size, meter: q.meter }; });
          const s5ok = s5b.arbeid && s5b.t === 'sprengt' && s5b.sperret > 0 && s5b.omkjørt && (s5b.meter === null || s5b.meter > s5a.meter) && /SPRENGT/.test(info)
            && s5c.t === 'hel' && s5c.sperret === 0 && Math.abs(s5c.meter - s5a.meter) < 1; if (!s5ok) feil++;
          console.log(`${s5ok ? 'ok  ' : 'FEIL'} ${navn} ødeleggelse: NVDB-bru ${s5a.id} sprengt etter ${s5b.min.toFixed(0)} spillminutter, ${s5b.sperret} lenke(r) sperret, kolonnen underveis kjørte om: ${s5b.omkjørt}, `
            + `${s5b.meter === null ? 'ingen veg' : 'omkjøring ' + ((s5b.meter - s5a.meter) / 1000).toFixed(1) + ' km'}; panelet: «${info}»; reparert etter ${s5c.timer.toFixed(1)} t: ${s5c.t}, ruten som før: ${Math.abs(s5c.meter - s5a.meter) < 1}`);
        // S6: drone over patruljen (fienden synes), rakettartilleri mot den (knapp + trykk), stridsvogna skyter, radarbil bygges og ser bevegelse
        const s6a = await pg.evaluate(() => { tempo = 0; const f = ENHETER[3], b = OLJE.BASER[0]; f.x = 213280; f.y = 6908986; f.sti = null; f.roligTil = 1e9; f.siktSkitten = true;
          for (const s of ENHETER) if (s.side === 'blå') { s.x = b.x + 300; s.y = b.y; s.sti = null; s.siktSkitten = true; }
          for (const k of KJORETOY) k.sti = null; b.beholdning = 400; return { skjult: !synlig(f) }; });
        await pg.waitForFunction(() => ENHETER.every(s => !s.siktJobb && !s.siktSkitten), null, { timeout: 30000 });
        const b6 = await pg.evaluate(() => { const b = OLJE.BASER[0]; valgt = null; visPanel(); kam.x = b.x; kam.y = b.y; kam.m = 2; skitten = true; tegn(); return [VW / 2, VH / 2]; });
        await pg.mouse.click(b6[0], b6[1]); await pg.locator('#handl button', { hasText: 'Send drone' }).click();
        const fxy = await pg.evaluate(() => { const f = ENHETER[3]; kam.x = f.x; kam.m = 20; kam.y = f.y - .2 * VH * kam.m; skitten = true; tegn(); return [VW / 2, VH * .3]; });
        await pg.mouse.click(fxy[0], fxy[1]);
        const s6b = await pg.evaluate(() => { const f = ENHETER[3]; let n = 0; while (DRONER.length && DRONER[0].fase === 'flyr' && n < 3000) { sim(.1); n++; }
          const k = KJORETOY.find(k => k.type === 'rakettartilleri'); k.x = f.x - 10000; k.y = f.y; k.sti = null; k.lader = 0; velgKjoretoy(k);
          return { droner: DRONER.length, min: n * 6 / 60, sett: synlig(f), obs: S6.observert(f.x, f.y) }; });
        await pg.locator('#handl button', { hasText: 'Ild' }).click();
        await pg.evaluate(() => { const f = ENHETER[3]; kam.x = f.x; kam.m = 20; kam.y = f.y - .2 * VH * kam.m; skitten = true; tegn(); });
        await pg.mouse.click(fxy[0], fxy[1]);
        const s6c = await pg.evaluate(() => { const f = ENHETER[3], før = f.menn.filter(m => m.hp < 1).length, salver = SALVER.length, k = KJORETOY.find(k => k.type === 'rakettartilleri');
          const nedslag = SALVER[0] ? Math.hypot(SALVER[0].x - f.x, SALVER[0].y - f.y) : null; let n = 0; while (SALVER.length && n < 100) { sim(.1); n++; } const lader = k.lader > 0;
          const artTreff = f.menn.filter(m => m.hp < 1).length - før; f.menn.forEach(m => { m.hp = 1; }); f.slattUtMeldt = false; f.sti = null; f.roligTil = 1e9;
          const sv = KJORETOY.find(k => k.type === 'stridsvogn'); sv.x = f.x - 600; sv.y = f.y; sv.sti = null;
          for (let i = 0; i < 600; i++) sim(.1);   // 60 spillminutter = 12 kamprunder
          const svTreff = f.menn.filter(m => m.hp < 1).length;
          const b = OLJE.BASER[0], antall = KJORETOY.length, r = Okonomi.bygg(b, 'radar'); for (let i = 0; i < 1300; i++) sim(.1);
          const radar = KJORETOY.find(k => k.type === 'radar'); DRONER.length = 0; sv.x -= 5e4; let radarSer = false;   // stridsvogna ser også (1,2 km)
          if (radar) { radar.x = f.x - 8000; radar.y = f.y; radar.sti = null; for (let i = 0; i < 120; i++) sim(.1); radarSer = KROKER.ser.some(h => h({ x: f.x, y: f.y, sti: [[0, 0]], her: { k: 2 } })) && !KROKER.ser.some(h => h({ x: f.x, y: f.y, sti: null, her: { k: 2 } })); }
          return { salver, nedslag, lader, artTreff, svTreff, radar: radar && radar.navn, bygget: !!r.ok, radarSer, nye: KJORETOY.length - antall }; });
        const s6ok = s6a.skjult && s6b.droner === 1 && s6b.sett && s6b.obs && s6c.salver === 1 && s6c.nedslag < 400 && s6c.lader && s6c.svTreff > 0 && s6c.bygget && s6c.radar === 'Radarbil 1' && s6c.radarSer; if (!s6ok) { feil++; console.log(JSON.stringify({ s6a, s6b, s6c })); }
        console.log(`${s6ok ? 'ok  ' : 'FEIL'} ${navn} flere enheter: patruljen skjult før dronen: ${s6a.skjult}, drone over etter ${s6b.min.toFixed(0)} min (sett: ${s6b.sett}); salve ${s6c.nedslag === null ? '–' : Math.round(s6c.nedslag) + ' m'} fra målet, ${s6c.artTreff} treff; `
          + `stridsvogn ${s6c.svTreff} treff på 12 runder; ${s6c.radar || 'ingen radar'} bygget, ser bevegelse (ikke ro): ${s6c.radarSer}`);
        // S7: 1. lag tar Dombås (30 min), blir garnison og forsterkes, tettstedet gir olje; sabotert kraftverk = uten strøm
        const s7 = await pg.evaluate(() => { const by = INFRA.tettsted.find(t => t.e.navn === 'Dombås'); if (!by) return null; let p = null;
          for (let j = 1; j < 20 && !p; j++) for (let i = 1; i < 20 && !p; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 20, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 20; if (Garnison.inni(by, x, y)) p = [x, y]; }
          const f = ENHETER[3]; f.x = 213280; f.y = 6908986; f.sti = null; DRONER.length = 0;
          for (const s of ENHETER) if (s.side === 'blå') { s.x += 4e4; s.sti = null; }
          const l = ENHETER[0]; [l.x, l.y] = p; l.menn.forEach(m => { m.hp = 1; }); l.sti = null;
          for (let i = 0; i < 380; i++) sim(.1);
          const eier = Garnison.tilstand(TETTSTEDER, by.e.id).eier, tekst = KROKER.lagTekst.map(h => h(l)).filter(Boolean).join(' · ');
          l.menn[4].hp = .5; l.menn[6].hp = 0; const b = OLJE.BASER[0], olje0 = b.beholdning, navn6 = l.menn[6].navn;
          for (let i = 0; i < 1800; i++) sim(.1);
          const friske = l.menn.every(m => m.hp === 1), olje = b.beholdning - olje0, ny = l.menn[6].navn !== navn6;
          valgt = null; visPanel(); visInfo(by); const info = document.getElementById('psub').textContent + ' | ' + document.getElementById('hint').textContent;
          for (const k of INFRA.kraft) INFRA_TILSTAND.set('kraft:' + k.e.id, { tilstand: 'sprengt' }); visInfo(by); const uten = document.getElementById('hint').textContent;
          INFRA_TILSTAND.forEach((v, k) => { if (k.startsWith('kraft:')) INFRA_TILSTAND.delete(k); });
          let sab = null; if (INFRA.kraft[0]) { visInfo(INFRA.kraft[0]); sab = [...document.querySelectorAll('#handl button')].map(b => b.textContent).join(); }
          for (const s of ENHETER) if (s.side === 'blå' && s !== l) s.x -= 4e4;
          return { eier, tekst, friske, ny, olje, info, uten: /Uten strøm/.test(uten), sab, kraft: INFRA.kraft.length }; });
        const s7ok = s7 && s7.eier === 'blå' && /garnison i Dombås/.test(s7.tekst) && s7.friske && s7.ny && s7.olje > 2 && /ditt/.test(s7.info) && (!s7.kraft || (s7.uten && /Saboter med/.test(s7.sab))); if (!s7ok) feil++;
        console.log(`${s7ok ? 'ok  ' : 'FEIL'} ${navn} tettsteder: ${s7 ? `Dombås ${s7.eier === 'blå' ? 'tatt' : 'IKKE tatt'} («${s7.tekst}»), forsterket (såret frisk, falt erstattet: ${s7.friske && s7.ny}), ${s7.olje.toFixed(1)} t olje på 3 t; uten strøm når kraftverkene er sabotert: ${s7.uten}; kraftverkpanelet: «${s7.sab}»` : 'fant ikke Dombås'}`);
        // S8: motstanderne (AI) marsjerer mot Dombås og tar det når ingen av våre er der
        const s8 = await pg.evaluate(async () => { const by = INFRA.tettsted.find(t => t.e.navn === 'Dombås'); TETTSTEDER.clear(); tempo = 0;
          const blå = ENHETER.filter(s => s.side === 'blå'); for (const s of blå) { s.x += 4e4; s.sti = null; }
          const ai = ENHETER.filter(s => s.ai); AI.på = true; for (const s of ai) s.ai.neste = 0;
          for (let i = 0; i < 30; i++) { sim(.1); await new Promise(r => setTimeout(r, 20)); }
          for (let n = 0; n < 200 && ai.some(s => s.planlegger); n++) await new Promise(r => setTimeout(r, 100));
          const plan = ai.map(s => s.ai.tekst), stier = ai.filter(s => s.sti).length;
          let i = 0; for (; i < 12000 && !Garnison.tilstand(TETTSTEDER, by.e.id).eier; i++) { sim(.1); if (i % 300 === 0) await new Promise(r => setTimeout(r, 30)); }
          const eier = Garnison.tilstand(TETTSTEDER, by.e.id).eier; AI.på = false;
          for (const s of blå) s.x -= 4e4; for (const s of ai) s.sti = null;
          return { plan, stier, n: ai.length, eier, timer: i * 6 / 3600, farge: sidefarge('grønn', 'farge'), meny: [...document.querySelectorAll('#lagmeny button')].some(b => b.textContent === 'Motstandere') }; });
        const s8ok = s8.n === 4 && s8.stier === 4 && s8.plan.every(t => /Dombås/.test(t)) && (s8.eier === 'rød' || s8.eier === 'grønn') && s8.farge === '#3f6b3a' && s8.meny; if (!s8ok) feil++;
        console.log(`${s8ok ? 'ok  ' : 'FEIL'} ${navn} motstandere: ${s8.n} AI-lag, ${s8.stier} på marsj («${s8.plan[0]}»), Dombås tatt av ${s8.eier || 'ingen'} etter ${s8.timer.toFixed(1)} spilltimer; «Motstandere» i menyen: ${s8.meny}`);
        // S6 del 2: fienden skyter mot kjøretøy den ser (lastebilkolonnen tar skade), og AI-en trekker seg unna en stridsvogn
        const kjS = await pg.evaluate(async () => { const f = ENHETER[3], k = KJORETOY.find(k => k.navn === '1. lastebilkolonne'), b = OLJE.BASER[0];
          k.x = b.x; k.y = b.y; k.sti = null; k.oppdrag = null; k.skade = 0; const antall = k.antall;
          f.x = k.x + 100; f.y = k.y; f.sti = null; f.roligTil = 1e9; f.menn.forEach(m => { m.hp = 1; }); f.ammo = 1; f.slattUtMeldt = false; f.siktSkitten = true;
          for (const s of ENHETER) if (s.side === 'blå') s.x += 4e4; for (const v of KJORETOY) if (v !== k && Math.hypot(v.x - k.x, v.y - k.y) < 3000) v.x += 4e4;
          for (let n = 0; n < 200 && (f.siktSkitten || f.siktJobb); n++) await new Promise(r => setTimeout(r, 100));
          const serK = ser(f, k.x, k.y); for (let i = 0; i < 1500 && KJORETOY.includes(k); i++) sim(.1);
          const res = { ser: serK, skade: k.skade, før: antall, etter: KJORETOY.includes(k) ? k.antall : 0, logg: document.getElementById('logg').textContent };
          if (!KJORETOY.includes(k)) KJORETOY.unshift(k); k.antall = antall; k.skade = 0;
          const ai = ENHETER.find(s => s.ai), sv = KJORETOY.find(v => v.type === 'stridsvogn'), lag = { ...ai };
          const v = Fraksjoner.velg(ai, { side: ai.side, byer: [], fiender: [{ x: ai.x + 500, y: ai.y, navn: sv.navn, styrke: Enheter.REGLER.styrke.stridsvogn }], venner: [], hjem: [0, 0], ammo: 1 });
          for (const s of ENHETER) if (s.side === 'blå') s.x -= 4e4; for (const v2 of KJORETOY) if (v2.x > 2e5 + 4e4) v2.x -= 4e4;
          return { ...res, aiValg: v.hva }; });
        const kjok = kjS.ser && (kjS.skade > 0 || kjS.etter < kjS.før) && /under ild/.test(kjS.logg) && kjS.aiValg === 'trekk'; if (!kjok) { feil++; console.log(JSON.stringify(kjS)); }
        console.log(`${kjok ? 'ok  ' : 'FEIL'} ${navn} kjøretøy i kamp: patruljen ser kolonnen: ${kjS.ser}, etter 30 kamprunder ${kjS.etter} av ${kjS.før} lastebiler igjen (skade ${Math.round(100 * kjS.skade)} %); AI-laget mot stridsvogn: ${kjS.aiValg}`);
        // S5 del 2: «Grav ned» (knapp) gir vern, ingeniørene legger miner (knapp), patruljen går på en mine
        const lag2 = await pg.evaluate(() => { const l = ENHETER[1], b = OLJE.BASER[0]; l.x = b.x + 600; l.y = b.y + 300; l.sti = null; l.nedgravd = false; l.graver = null; valgt = l; visPanel(); return true; });
        await pg.locator('#handl button', { hasText: 'Grav ned' }).click();
        await pg.evaluate(() => { const s = ENHETER.find(s => s.ingeniør), l = ENHETER[1]; s.x = l.x + 2000; s.y = l.y; s.sti = null; valgt = s; visPanel(); });
        await pg.locator('#handl button', { hasText: 'Legg miner' }).click();
        const fa = await pg.evaluate(async () => { const l = ENHETER[1], s = ENHETER.find(s => s.ingeniør), f = ENHETER[3];
          for (let i = 0; i < 700; i++) sim(.1);
          const nedgravd = l.nedgravd, tekst = KROKER.lagTekst.map(h => h(l)).filter(Boolean).join(' · '), vern = Feltarbeid.vern(l), felt = MINEFELT.length;
          f.x = s.x; f.y = s.y; f.sti = null; f.menn.forEach(m => { m.hp = 1; }); f.slattUtMeldt = false; f.roligTil = 1e9; const sj = Feltarbeid.REGLER.mine.sjanse; Feltarbeid.REGLER.mine.sjanse = 1;
          await ordre(f, f.x + 1200, f.y, true); let n = 0; while (f.sti && n < 400 && f.menn.every(m => m.hp === 1)) { sim(.1); n++; }
          Feltarbeid.REGLER.mine.sjanse = sj; const treff = f.menn.filter(m => m.hp < 1).length; f.sti = null; MINEFELT.length = 0;
          return { nedgravd, tekst, vern, felt, treff, logg: document.getElementById('logg').textContent.slice(0, 300) }; });
        const faok = fa.nedgravd && /nedgravd/.test(fa.tekst) && fa.vern === .5 && fa.felt === 1 && fa.treff > 0; if (!faok) { feil++; console.log(JSON.stringify(fa)); }
        console.log(`${faok ? 'ok  ' : 'FEIL'} ${navn} feltarbeid: 2. lag nedgravd (${fa.tekst}), vern ×${fa.vern}; minefelt lagt: ${fa.felt}, patruljen gikk på en mine: ${fa.treff} treff`);
        // S5 del 3: ingeniørene sprenger en dam -> flom nedover dalen, et lag i flomfeltet får tap, vannet trekker seg tilbake etter 12 t
        const fl = await pg.evaluate(async () => { const dam = INFRA.dam.slice().sort((a, b) => (b.e.navn ? 1 : 0) - (a.e.navn ? 1 : 0))[0]; if (!dam) return null;
          const s = ENHETER.find(s => s.ingeniør), a = dam.deler[0]; s.x = a[0] + 40; s.y = a[1] + 40; s.sti = null; s.menn.forEach(m => { m.hp = 1; });
          S5.start(s, dam, 'ødelegg'); let n = 0; while (INGENIØRARBEID.size && n < 2000) { sim(.1); n++; }
          for (let k = 0; k < 300 && !FLOMMER.length; k++) await new Promise(r => setTimeout(r, 100));
          const felt = FLOMMER[0]; if (!felt) return { dam: dam.e.navn, timer: n * 6 / 3600, flom: false };
          let p = null; for (let q = 0; q < felt.maske.length && !p; q++) if (felt.maske[q]) { const i = q % felt.w, j = (q - i) / felt.w; p = [felt.x0 + (i + .5) * felt.r, felt.y0 - (j + .5) * felt.r]; }
          const f = ENHETER[3]; [f.x, f.y] = p; f.sti = null; f.menn.forEach(m => { m.hp = 1; }); await FLOM.rammer(felt); const tap = f.menn.filter(m => m.hp < 1).length;
          kam.x = felt.x0 + felt.w * felt.r / 2; kam.y = felt.y0 - felt.h * felt.r / 2; kam.m = 20; skitten = true; tegn();
          const km = felt.km; for (let k = 0; k < 7400 && FLOMMER.length; k++) sim(.1); const borte = !FLOMMER.length;
          f.menn.forEach(m => { m.hp = 1; }); f.slattUtMeldt = false;
          return { dam: dam.e.navn, timer: n * 6 / 3600, flom: true, km, tap, borte, tilstand: Odeleggelse.tilstand(INFRA_TILSTAND, 'dam', dam.e.id) }; });
        const flok = fl && fl.flom && fl.km > 1 && fl.tap > 0 && fl.borte && fl.tilstand === 'sprengt'; if (!flok) { feil++; console.log(JSON.stringify(fl)); }
        console.log(`${flok ? 'ok  ' : 'FEIL'} ${navn} dam og flom: «${fl && fl.dam}» sprengt etter ${fl && fl.timer.toFixed(1)} t, flommen går ${fl && fl.km} km, patruljen i flomfeltet: ${fl && fl.tap} ute, vannet borte etter 12 t: ${fl && fl.borte}`);
        // vegkrater: «Spreng vegen her» midt på E6-ruten Dombås–Otta, kolonnen må kjøre om (eller får ingen veg); «Reparer …» + trykk på krateret
        const kr = await pg.evaluate(() => { const k = KJORETOY.find(k => k.type === 'lastebil'); k.x = 193233; k.y = 6896398; k.sti = null; k.oppdrag = null;
          const p = Kjoretoy.planlegg(k, VEGNETT, [212021, 6860888]), L = Kjoretoy.lenkerIgjen(k), e = L.find((e, i) => i > L.length / 3 && !VEGNETT.lenke(e).ferje && !VEGNETT.infraPåLenke(e).length);
          Kjoretoy.stopp(k); const P = VEGNETT.linje(e), [X, Y] = P[Math.floor(P.length / 2)], s = ENHETER.find(s => s.ingeniør); s.x = X + 20; s.y = Y; s.sti = null; s.menn.forEach(m => { m.hp = 1; });
          valgt = s; visPanel(); return { meter: p.meter, e, X, Y }; });
        await pg.locator('#handl button', { hasText: 'Spreng vegen her' }).click();
        await pg.waitForFunction(() => INGENIØRARBEID.size > 0, null, { timeout: 20000 });
        const kr2 = await pg.evaluate(async () => { let n = 0; while (INGENIØRARBEID.size && n < 2000) { sim(.1); n++; } await new Promise(r => setTimeout(r, 50));
          const k = KJORETOY.find(k => k.type === 'lastebil'); k.x = 193233; k.y = 6896398; const q = Kjoretoy.planlegg(k, VEGNETT, [212021, 6860888]); Kjoretoy.stopp(k);
          const s = ENHETER.find(s => s.ingeniør); valgt = s; visPanel(); return { min: n * 6 / 60, sperret: VEGNETT._sperretAv.size, meter: q.feil ? null : q.meter, xy: null }; });
        await pg.locator('#handl button', { hasText: 'Reparer' }).first().click();
        const kxy = await pg.evaluate(({ X, Y }) => { kam.x = X; kam.m = 1; kam.y = Y - .2 * VH; skitten = true; tegn(); return [VW / 2, VH * .3]; }, kr);
        await pg.mouse.click(kxy[0], kxy[1]);
        const kr3 = await pg.evaluate(async e => { const før = INGENIØRARBEID.size; let n = 0; while (INGENIØRARBEID.size && n < 3000) { sim(.1); n++; } await new Promise(r => setTimeout(r, 50));
          // verkstedet: en skadet lastebil i et eget tettsted blir reparert
          const by = INFRA.tettsted.find(t => t.e.navn === 'Dombås'); TETTSTEDER.set(by.e.id, { eier: 'blå', inntar: null }); let p = null;
          for (let j = 1; j < 20 && !p; j++) for (let i = 1; i < 20 && !p; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 20, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 20; if (Garnison.inni(by, x, y)) p = [x, y]; }
          const k = KJORETOY.find(k => k.type === 'lastebil'); [k.x, k.y] = p; k.sti = null; k.skade = .5; for (let i = 0; i < 3200; i++) sim(.1);
          return { reparasjon: før, tilstand: Odeleggelse.tilstand(INFRA_TILSTAND, 'veg', e), timer: n * 6 / 3600, skade: k.skade }; }, kr.e);
        const krok = kr2.sperret > 0 && (kr2.meter === null || kr2.meter > kr.meter) && kr3.reparasjon === 1 && kr3.tilstand === 'hel' && kr3.skade === 0; if (!krok) { feil++; console.log(JSON.stringify({ kr, kr2, kr3 })); }
        console.log(`${krok ? 'ok  ' : 'FEIL'} ${navn} vegkrater og verksted: E6 sprengt etter ${kr2.min.toFixed(0)} min, ${kr2.meter === null ? 'ingen veg' : 'omkjøring ' + ((kr2.meter - kr.meter) / 1000).toFixed(1) + ' km'}, reparert etter ${kr3.timer.toFixed(1)} t; lastebil i Dombås reparert: ${kr3.skade === 0}`);
        // «Slik spiller du»: ?-knappen åpner veiledningen, × lukker den (vises ikke av seg selv i testene)
        const hj0 = await pg.evaluate(() => document.getElementById('hjelp').classList.contains('på'));
        await pg.click('#hjelpknapp'); const hj = await pg.evaluate(() => ({ på: document.getElementById('hjelp').classList.contains('på'), deler: document.querySelectorAll('#hjelp h3').length }));
        await pg.click('#hjelp .lukk'); const hj2 = await pg.evaluate(() => document.getElementById('hjelp').classList.contains('på'));
        const hjok = !hj0 && hj.på && hj.deler >= 10 && !hj2; if (!hjok) feil++;
        console.log(`${hjok ? 'ok  ' : 'FEIL'} ${navn} hjelp: åpnes med ?, ${hj.deler} avsnitt, lukkes med ×`);
        // vær og årstid (spill/vaer.js): tåke korter inn sikten til laget, vinter gir snø helt ned; tilbake til klart sommervær
        const vr = await pg.evaluate(async () => { const s = ENHETER.find(e => e.side === 'blå' && levende(e)), r0 = s.siktR || null;
          const vent = async () => { s.siktSkitten = true; await new Promise(r => setTimeout(r, 50)); for (let i = 0; i < 200 && (s.siktJobb || s.siktSkitten); i++) await new Promise(r => setTimeout(r, 50)); return s.sikt ? s.sikt.mw * s.sikt.mh : 0; };
          const klar = await vent(); Vaer.låsVær(VaerSpill.S, 'tåke'); VaerSpill.oppdater(); const tåke = await vent();
          Vaer.settÅrstid(VaerSpill.S, 'vinter', tid); VaerSpill.oppdater(); const vinter = { grense: VAER.snøgrense, tekst: document.getElementById('sVaer').textContent, u: VAER_U.uSnoGrense.value };
          Vaer.settÅrstid(VaerSpill.S, 'sommer', tid); Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.oppdater(); await vent();
          return { klar, tåke, vinter }; });
        const vok = vr.tåke > 0 && vr.tåke < vr.klar * .5 && vr.vinter.grense < 0 && vr.vinter.u === vr.vinter.grense; if (!vok) { feil++; console.log(JSON.stringify(vr)); }
        console.log(`${vok ? 'ok  ' : 'FEIL'} ${navn} vær: siktfeltet i tåke ${vr.tåke} ruter mot ${vr.klar} i klart vær; vinter: snø fra ${vr.vinter.grense} moh. («${vr.vinter.tekst}»)`);
        // K1 oppstart: startskjermen, leir i Dombås avvises (tettsted), leir på land utenfor godtas, 100 mill. kr, lagret, fraksjonen tar over
        const k1 = await pg.evaluate(async () => {
          localStorage.removeItem(OppstartSpill.NØKKEL); OppstartSpill.nytt();
          const på = document.getElementById('oppstart').classList.contains('på'), u = OppstartSpill.utkast();
          u.karakter.navn = 'Kari Test'; u.karakter.bakgrunn = 'politi'; u.fraksjon.navn = 'Dovrefolket'; u.fraksjon.flagg.bokstaver = 'DF';
          OppstartSpill.vis(3); [...document.querySelectorAll('#oppstart button')].find(b => /kartet/.test(b.textContent)).click();
          const by = INFRA.tettsted.find(t => t.e.navn === 'Dombås'); let pb = null;
          for (let j = 1; j < 20 && !pb; j++) for (let i = 1; i < 20 && !pb; i++) { const x = by.bb[0] + (by.bb[2] - by.bb[0]) * i / 20, y = by.bb[1] + (by.bb[3] - by.bb[1]) * j / 20; if (Garnison.inni(by, x, y)) pb = [x, y]; }
          const iBy = await OppstartSpill.prøvLeir(pb[0], pb[1]), ute = await OppstartSpill.prøvLeir(196400, 6898900);
          OppstartSpill.bekreft(); await new Promise(r => setTimeout(r, 100));
          const S = OppstartSpill.tilstand(), lagret = Oppstart.fraJSON(localStorage.getItem(OppstartSpill.NØKKEL)), lag = ENHETER.find(e => e.side === 'blå');
          const r = { på, iBy, ute, ferdig: !!(S && S.ferdig), penger: document.getElementById('sPenger').textContent, lagret: !!(lagret && lagret.ferdig && lagret.fraksjon.navn === 'Dovrefolket'),
            fraksjon: Fraksjoner.FRAKSJONER.blå.navn, base: Math.round(Math.hypot(OLJE.BASER[0].x - 196400, OLJE.BASER[0].y - 6898900)), lag: Math.round(Math.hypot(lag.x - 196400, lag.y - 6898900)),
            skjult: !document.getElementById('oppstart').classList.contains('på'), sikt: KROKER.sikt.reduce((v, f) => v * f(lag), 1) };
          // K2 leiren: kontrollrom og aggregat ved leiren, pengene trekkes, byggetid, strøm med drivstoff, lagret
          const LX = 196400, LY = 6898900, k2 = [];
          LeirSpill.rutenett(true); for (const m of ['tre', 'betong', 'stål']) Leir.kjøpMateriale(LeirSpill.tilstand(), m, 60, OppstartSpill.betal);
          for (const [t, dx] of [['kontrollrom', 40], ['aggregat', -25], ['drivstofftank', -50]]) { LeirSpill.startPlassering(t); LeirSpill.trykk(LX + dx, LY + 10); await LeirSpill.prøv(); k2.push(LeirSpill.plassering().feil || 'ok'); LeirSpill.bekreft(); }
          LeirSpill.startPlassering('brakke'); LeirSpill.trykk(LX + 40, LY + 10); await LeirSpill.prøv(); const opptatt = LeirSpill.plassering().feil; document.querySelector('#byggvalg button:last-child').click();
          const L = LeirSpill.tilstand(); r.k2 = { k2, opptatt, penger: OppstartSpill.tilstand().penger, bygg: L.bygg.length };
          for (const b of L.bygg) b.igjen = 0; sim(.1); for (let i = 0; i < 12; i++) sim(.1);
          r.k2.ferdig = L.bygg.every(b => b.igjen === 0); const kj = Leir.kjøpDrivstoff(L, 100, OppstartSpill.betal); sim(.1); const st = LeirSpill.siste();
          r.k2.strøm = [st.prod, st.behov, st.mangler.size]; r.k2.drivstoff = kj.liter; LeirSpill.lagre(); r.k2.lagret = (Leir.fraJSON(localStorage.getItem('riksbrudd-k2')) || { bygg: [] }).bygg.length;
          // bedre byggesystem: byggpanelet, oppgradering, riving, lukket gjerde med port festet, FPS-telleren
          const agg = L.bygg.find(b => b.type === 'aggregat'); LeirSpill.trykk(agg.x, agg.y); r.k2.panel = [...document.querySelectorAll('#byggvalg button')].map(b => b.textContent.split(' ')[0]).join(',');
          const opp = Leir.oppgrader(L, agg.id, OppstartSpill.betal); for (let i = 0; i < 12; i++) sim(.1); for (const b of L.bygg) if (b.arbeid) b.arbeid.igjen = .01; sim(.1); r.k2.nivå = agg.nivå;
          const p0 = OppstartSpill.tilstand().penger, tank = L.bygg.find(b => b.type === 'drivstofftank'), rv = Leir.riv(L, tank.id); OppstartSpill.gi(rv.penger); r.k2.riv = OppstartSpill.tilstand().penger - p0;
          LeirSpill.startPlassering('gjerde'); for (const [x, y] of [[-60, -60], [80, -60], [80, 60], [-60, 60]]) LeirSpill.trykk(LX + x, LY + y); LeirSpill.plassering().lukket = true; await LeirSpill.prøv();
          r.k2.gjerde = LeirSpill.plassering().feil || 'ok'; LeirSpill.bekreft();
          LeirSpill.startPlassering('port'); LeirSpill.trykk(LX + 10, LY - 56); await LeirSpill.prøv(); r.k2.port = !!LeirSpill.plassering().festet; LeirSpill.avbryt();
          // planlegging (12. nov): to skisser i planen (gratis), den andre legger seg inntil den første, angre/gjør om, mal, bygg hele planen
          { const pen0 = OppstartSpill.tilstand().penger; LeirSpill.planModus(true); LeirSpill.inntil(true); LeirSpill.rutenett(false);
            LeirSpill.startPlassering('lagertelt', null, { plan: true }); LeirSpill.trykk(LX - 40, LY + 70); await LeirSpill.prøv(); LeirSpill.bekreft();
            const a = L.plan[L.plan.length - 1]; LeirSpill.startPlassering('lagertelt', null, { plan: true, ret: a.ret }); LeirSpill.trykk(a.x + 9.8, a.y + .6); await LeirSpill.prøv();
            const pl = LeirSpill.plassering(), linjer = (pl.linjer || []).length; LeirSpill.bekreft(); const b2 = L.plan[L.plan.length - 1];
            const gap = Math.round((Math.hypot(b2.x - a.x, b2.y - a.y) - 8.6) * 10) / 10, n2 = L.plan.length;
            LeirSpill.angre(); const n1 = L.plan.length; LeirSpill.gjørOm(); const n3 = L.plan.length;
            const nm = LeirSpill.lagreMal('Test'), mal = LeirSpill.maler()[nm - 1]; LeirSpill.startMal(nm - 1); LeirSpill.trykk(LX + 400, LY + 400); await LeirSpill.prøv(); const malOk = !LeirSpill.plassering().feil; LeirSpill.avbryt();
            const gratis = OppstartSpill.tilstand().penger === pen0, før = L.bygg.length, nb = LeirSpill.byggFraPlan(null, true);
            r.k2.plan = { gap, linjer, n: [n1, n2, n3], gratis, bygget: nb, tom: L.plan.length === 0, flere: L.bygg.length - før, malBygg: mal && mal.bygg.length, malOk };
            LeirSpill.planModus(false); LeirSpill.rutenett(true); try { localStorage.removeItem('riksbrudd-maler'); } catch (e) { /* privat */ } }
          // VAKT byggevisning i 2D (spill/byggevisning.js, brukeren 16. nov): når du begynner å bygge langt ute, går kameraet inn på leiren,
          // siden får klassen bygger2d, en skisse utenfor bildet hentes inn i det frie feltet, og alt slås av når du avbryter.
          if (window.BYGGEVISNING) { const bv = {}, vent = ms => new Promise(q => setTimeout(q, ms)), k0 = { x: kam.x, y: kam.y, m: kam.m }, SL = OppstartSpill.tilstand().leir;
            LeirSpill.avbryt(); await vent(400); BYGGEVISNING.test = true; kam.x = SL.x; kam.y = SL.y; kam.m = 3; LeirSpill.startPlassering('brakke'); for (let q = 0; q < 40 && (kam.m > .61 || BYGGEVISNING.anim()); q++) await vent(200);
            bv.på = BYGGEVISNING.på(); bv.klasse = document.body.classList.contains('bygger2d'); bv.m = kam.m; bv.iBildet = Math.abs(kam.x - SL.x) < VW * kam.m / 2 && Math.abs(kam.y - SL.y) < VH * kam.m / 2;
            // med mus følger skissen pekeren til første trykk; etter trykket står den
            { const cv = document.getElementById('c'), rr = cv.getBoundingClientRect(), flytt = (dx, dy) => cv.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: rr.left + VW / 2 + dx, clientY: rr.top + VH / 2 + dy, buttons: 0, bubbles: true }));
              flytt(40, -30); await vent(400); const q = LeirSpill.plassering(); bv.svever = q.svever === true && Math.abs(q.rx - (kam.x + 40 * kam.m)) < 1e-6 && Math.abs(q.ry - (kam.y + 30 * kam.m)) < 1e-6;
              LeirSpill.trykk(SL.x + 30, SL.y + 20); await LeirSpill.prøv(); await vent(150); flytt(-60, 50); await vent(300); bv.fast = q.svever === false && q.rx === SL.x + 30;
              // piltasten dytter skissen ett rutesteg
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); await vent(250); bv.dyttet = Math.abs(q.rx - (SL.x + 32.5)) < 1e-6; }
            kam.x += VW * kam.m; skitten = true; await vent(900);
            const pp = LeirSpill.plassering(), F = BYGGEVISNING.fri(), px = (pp.x - (kam.x - VW * kam.m / 2)) / kam.m, py = ((kam.y + VH * kam.m / 2) - pp.y) / kam.m; bv.synlig = px >= F.x0 && px <= F.x1 && py >= F.y0 && py <= F.y1;
            LeirSpill.avbryt(); await vent(400); bv.av = !BYGGEVISNING.på() && !document.body.classList.contains('bygger2d');
            // Q på et valgt bygg plukker det opp: ny skisse av samme type og retning
            { const b0 = LeirSpill.tilstand().bygg.find(b => !Leir.BYGG[b.type].linje && !Leir.BYGG[b.type].del); if (b0) { LeirSpill.velg(b0.id); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true })); const q2 = LeirSpill.plassering(); bv.plukk = !!q2 && q2.type === b0.type && q2.ret === (b0.ret || 0); LeirSpill.avbryt(); await vent(300); if (window.lukkPanel) lukkPanel(); } else bv.plukk = true; }
            BYGGEVISNING.test = false; Object.assign(kam, k0); skitten = true; r.k2.bv = bv; }
          // VAKT grusveg og delegering (brukeren 16. nov): en veg legges punkt for punkt og blir et bygg med punkter; når den er ferdig,
          // er den «egen veg» (bilen kjører fort der); «Bygg dette først» flytter en jobb fremst i køen.
          { const vg = {}, SL = OppstartSpill.tilstand().leir, Lv = LeirSpill.tilstand(), før = Lv.bygg.length; LeirSpill.avbryt(); LeirSpill.startPlassering('veg');
            vg.banner = document.getElementById('byggvalg').textContent; LeirSpill.trykk(SL.x + 60, SL.y + 80); LeirSpill.trykk(SL.x + 140, SL.y + 80); LeirSpill.trykk(SL.x + 140, SL.y + 150); await LeirSpill.prøv();
            const pv = LeirSpill.plassering(); vg.feil = pv && pv.feil; await LeirSpill.bekreft(); const veg = Lv.bygg.find(b => b.type === 'veg'); vg.bygget = Lv.bygg.length === før + 1 && !!veg && veg.punkter.length === 3;
            if (veg) { vg.uferdig = !LeirSpill.påEgenVeg(SL.x + 100, SL.y + 80); const ig = veg.igjen; veg.igjen = 0; vg.ferdig = LeirSpill.påEgenVeg(SL.x + 100, SL.y + 81) && !LeirSpill.påEgenVeg(SL.x + 100, SL.y + 90); veg.igjen = ig;
              const J = Leir.jobber(Lv); vg.sist = J.length > 1 ? J[J.length - 1].b.id : null; if (vg.sist !== null) { Leir.prioriter(Lv, vg.sist); vg.først = Leir.jobber(Lv)[0].b.id === vg.sist; } else vg.først = true;
              Lv.bygg.splice(Lv.bygg.indexOf(veg), 1); }
            LeirSpill.avbryt(); r.k2.vg = vg; }
          // VAKT byggesett (12. nov): åpnes fra Leir-menyen, en hytte (16 deler) som jobber for byggelagene, rad med vegger, tak i lufta avvises,
          // ferdig hytte = rom med dør og senger (Leir.plasser), riving gir penger tilbake, verktøylinja passer på skjermen
          { const lk = document.getElementById('leirknapp'); lk.click(); const knappBs = document.getElementById('bs-apne'); if (knappBs) knappBs.click();
            const bs = { åpen: document.getElementById('byggesett').classList.contains('på') }, BSs = Byggesett, s0 = Leir.plasser(L), j0 = Leir.jobber(L).length;
            BSs.velg({ fane: 'hus', hus: 'hytte', rot: 0 }); BSs.trykk(LX - 12, LY - 36); await BSs.oppdater(); bs.hytte = BSs.forslag().filter(q => !q.feil).length; bs.bygget = BSs.bekreft(true);
            bs.jobber = Leir.jobber(L).length - j0;
            BSs.velg({ fane: 'tak', tak: 'bs_tak_flatt' }); BSs.trykk(LX - 30, LY - 45); await BSs.oppdater(); bs.lufttak = (BSs.forslag()[0] || {}).feil || 'ok';
            BSs.velg({ fane: 'vegg', stoff: 'betong', variant: 'hel', nivå: 'auto' }); BSs.trykk(LX - 28.9, LY - 45); BSs.trykk(LX - 21.5, LY - 45); await BSs.oppdater(); bs.rad = BSs.forslag().filter(q => !q.feil).length; BSs.bekreft(true);
            for (const b of L.bygg) b.igjen = 0; sim(.1); const rom = BSs.rom(); bs.rom = rom.length; bs.senger = Leir.plasser(L) - s0; bs.dør = rom[0] && rom[0].dører;
            BSs.velg({ fane: 'riv' }); BSs.trykk(LX - 27.6, LY - 45.5); await BSs.oppdater(); const p0 = OppstartSpill.tilstand().penger; bs.revet = BSs.riv(); bs.tilbake = OppstartSpill.tilstand().penger - p0;
            const rb = document.getElementById('byggesett').getBoundingClientRect(); bs.passer = rb.left >= 0 && rb.right <= VW + 1 && rb.bottom <= VH + 1 && rb.height < VH * .5;
            BSs.lukk(); bs.lukket = !document.getElementById('byggesett').classList.contains('på'); r.k2.bs = bs; }
          await new Promise(r => setTimeout(r, 1200)); r.k2.fps = +document.getElementById('sFps').textContent > 0;
          // menyen kan blas i: plassen holdes når den tegnes på nytt (brukeren 11. nov: «lar meg ikke bla ned»)
          const meny = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); lk.click(); meny.scrollTop = 250; const før = meny.scrollTop; lk.click(); lk.click();
          r.k2.bla = før > 100 && Math.abs(meny.scrollTop - før) < 2; lk.click();
          // FOLK (12. nov): ti personer, byggelagene fra folk på «bygg», panelet fra Leir-menyen med − / + per oppgave, vakttårn gir sikt
          { const fo = { antall: Folk.liste().length, bygg: Folk.arbeidere('bygg'), lag: Leir.byggelag(L), lagret: !!(Leir.fraJSON(localStorage.getItem('riksbrudd-k2')) || {}).folk };
            lk.click(); const fk = document.getElementById('folkknapp'); if (fk) fk.click(); const fm = document.getElementById('folkmeny');
            fo.åpen = fm.classList.contains('på') && !meny.classList.contains('på'); fo.rader = fm.querySelectorAll('.opp').length;
            const v0 = Folk.arbeidere('vakt'); fm.querySelector('button.pluss[data-o="vakt"]').click(); fo.pluss = Folk.arbeidere('vakt') - v0;
            fm.querySelector('button.minus[data-o="vakt"]').click(); fo.minus = Folk.arbeidere('vakt') - v0;
            const F = FolkSpill.tilstand(), byggere = F.personer.filter(p => p.oppgave === 'bygg'); byggere.forEach(p => { p.oppgave = 'fri'; }); fo.ingenLag = Leir.byggelag(L); byggere.forEach(p => { p.oppgave = 'bygg'; });
            const rb = fm.getBoundingClientRect(); fo.innenfor = rb.left >= 0 && rb.right <= innerWidth + 1 && rb.bottom <= innerHeight + 1 && rb.height > 100;
            fo.mangler = fm.querySelectorAll('.mangler').length;
            // vakttårn med vakt: et eget lag ved tårnet ser 25 % lenger; uten vakt ingen forskjell
            const s = ENHETER.find(e => e.side === 'blå' && !e.karakter), sx = s.x, sy = s.y; s.x = LX - 90; s.y = LY - 90; const k0 = KROKER.sikt.reduce((v, f) => v * f(s), 1);
            const vt = { id: 99999, type: 'vakttårn', x: LX - 100, y: LY - 100, ret: 0, igjen: 0, totalt: 60, hp: 1, nivå: 1, arbeid: null, mat: {}, pris: 5e6 }; L.bygg.push(vt);
            sim(.1); await new Promise(r => setTimeout(r, 1100)); sim(.1); fo.sikt = Math.round(KROKER.sikt.reduce((v, f) => v * f(s), 1) / k0 * 100) / 100;
            L.bygg = L.bygg.filter(b => b !== vt); s.x = sx; s.y = sy; await new Promise(r => setTimeout(r, 1100)); sim(.1);
            fo.kjøkken = !!(Leir.BYGG.kjøkken && window.MODELLER && MODELLER.kjøkken);
            FolkSpill.åpne(false); r.folk = fo; }
          // VAKT feilretting 12. nov (mekanikk): sengene i det egenbygde rommet telles én gang for folket, malen har ikke med delene i
          // byggesettet og avvises i et vann (et tjern nordøst for Dombås), gjerdet tvers over vannet avvises, og en tom gjeng kan rekruttere
          { const fx = {}, F = FolkSpill.tilstand(), VX = 200368, VY = 6901360;
            fx.rom = Byggesett.senger(); fx.senger = FolkRegler.behov(F, L, FolkSpill.valg()).senger - Leir.plasser(L);
            const nm = LeirSpill.lagreMal('Vakt'), mal = LeirSpill.maler()[nm - 1]; fx.malDeler = mal.bygg.filter(b => Leir.BYGG[b.type].del).length; fx.malBygg = mal.bygg.length;
            LeirSpill.startMal(nm - 1); LeirSpill.trykk(VX, VY); await LeirSpill.prøv(); const pm = LeirSpill.plassering(); fx.malVann = pm.feil; fx.malRøde = (pm.deler || []).filter(b => /vann/.test(b.feil || '')).length; LeirSpill.avbryt();
            try { localStorage.removeItem('riksbrudd-maler'); } catch (e) { /* privat */ }
            LeirSpill.startPlassering('gjerde'); LeirSpill.trykk(VX - 160, VY - 20); LeirSpill.trykk(VX + 260, VY + 40); await LeirSpill.prøv(); fx.gjerde = LeirSpill.plassering().feil; LeirSpill.avbryt();
            const alle = F.personer; F.personer = []; const m0 = F.moral; F.moral = 5; fx.tom = FolkRegler.kanRekruttere(F, L, FolkSpill.valg()); F.personer = alle; F.moral = m0; fx.full = FolkRegler.kanRekruttere({ ...F, moral: 5 }, L, FolkSpill.valg());
            r.fiks = fx; }
          // materialer fra verden (spill/ressurser*.js): hogst nær leiren gir tre i lageret og huskes, et (oppdiktet) hus rives og huskes,
          // panelet viser utbytte og kjøpspris, menyen har delen, og lagringen leses igjen
          { const RS = RessursSpill, Rr = RS.tilstand(), leir = { x: LX, y: LY }; L.lager.tre = 0; L.lager.betong = 0;
            // med Folk-delen gjøres arbeidet bare av folk på oppgaven: sett én ledig person på hogst og én på riving
            const ledige = window.FolkSpill ? FolkSpill.tilstand().personer.filter(p => p.oppgave === 'fri') : [];
            if (ledige[0] && !Folk.arbeidere('riving')) ledige[0].oppgave = 'riving'; if (ledige[1] && !Folk.arbeidere('hogst')) ledige[1].oppgave = 'hogst';
            RS.startVelg('hogst'); RS.trykk(LX - 32, LY - 4); await RS.prøv(); const v = RS.velg(), bt = document.getElementById('ressursvalg').textContent;
            const panel = !v.feil && /Start hogst/.test(bt) && /kjøpe like mye/.test(bt) && v.ut.mat.tre > 0; RS.start();
            const hj = Rr.jobber.find(j => j.type === 'hogst'), P = [[LX + 300, LY + 300], [LX + 312, LY + 300], [LX + 312, LY + 310], [LX + 300, LY + 310]], rj = Ressurser.startRiving(Rr, { i: 999001, P, t: 6, h: 6 }, leir).jobb;
            for (const j of [hj, rj]) if (j) { j.gjort = j.arbeid - .001; j.haug = { ...j.mat }; } if (rj) rj.avst = 100; for (let i = 0; i < 3; i++) sim(1);
            lk.click(); const del = !!document.querySelector('#leirmeny .ressurs #r-hogst'); lk.click(); RS.lagre();
            const lest = Ressurser.fraJSON(localStorage.getItem('riksbrudd-ressurser'));
            r.res = { panel, tre: Math.round(L.lager.tre * 10) / 10, betong: Math.round(L.lager.betong * 10) / 10, hogd: Rr.hogd.length, hogdHer: Ressurser.erHogd(Rr, LX - 32, LY - 4, .99),
              revet: HUS_BORT.has(999001), jobber: Rr.jobber.length, del, lagret: !!(lest && lest.hogd.length === 1 && lest.revet.length === 1) };
            RS.sett(Ressurser.ny()); }
          // K3 kontrollrommet: gå inn, lag uten radiokontakt vises ikke der de er, lag med kontakt melder seg, ute bare «sist meldt»
          const KS = KontrollromSpill, deg = KS.deg(), krom = L.bygg.find(b => b.type === 'kontrollrom'), blå = ENHETER.filter(e => e.side === 'blå' && !e.karakter);
          deg.x = krom.x; deg.y = krom.y; const inn = KS.gåInn(), mInne = KS.modus();
          const A = blå[0], B = blå[1]; A.x = LX + 6000; A.y = LY; A.sti = null; B.x = LX + 1000; B.y = LY; B.sti = null;
          await KS.sjekkKontakt(A); await KS.sjekkKontakt(B);
          const skjul = s => KROKER.skjul.some(f => f(s)), r3 = { inn, mInne, aKontakt: KS.info(A).kontakt, bKontakt: KS.info(B).kontakt, aSkjult: skjul(A), bSkjult: skjul(B) };
          KS.info(B).før = { marsj: true, ute: 0 }; KS.rapport(B, tid + 100); r3.melding = (KS.radiolog().slice(0, 5).find(m => /Framme/.test(m.tekst)) || KS.radiolog()[0] || {}).tekst;
          // VAKT (feilretting 12. nov): rutinemeldingen «Alt rolig» står i radiolista, men ikke i loggen på kartet
          KS.info(B).sist = {}; KS.info(B).før = { marsj: false, ute: B.menn.filter(q => q.hp < 1).length }; KS.rapport(B, tid + 5000);
          r3.rutine = KS.radiolog()[0] && KS.radiolog()[0].tekst === Kontrollrom.RUTINE; r3.rutineILogg = loggLinjer.some(t => /Alt rolig/.test(t));
          r3.skjerm = document.getElementById('kontrollrom').classList.contains('på');
          r3.ordreA = KROKER.kanOrdre.every(f => f(A)); KS.gåUt(); r3.mUte = KS.modus(); r3.bSkjultUte = skjul(B);
          // VAKT brukerens valg 12. nov (regler, se CLAUDE.md «BRUKERENS VALG»): (1) utposter er lov, men byggelaget må reise dit – reisetiden
          // står i banneret før du bekrefter, i menyen og byggpanelet, og laget melder seg framme; (2) radiomastens nivå gir feltradioene
          // 15, 25 og 40 km (8 km uten), og panelene sier det; (3) en byggeplass ødelegges av en fiende og gir de ubrukte materialene tilbake;
          // (4) leirens diesel og kjøretøyenes olje er forklart i Leir-menyen, basepanelet, kjøretøypanelet og hjelpen
          { const rg = {}, nyLogg = re => loggLinjer.some(t => re.test(t)), tekst = id => document.getElementById(id).textContent;
            // utpost ca. 5 km nord for leiren: første sted der en container kan stå
            LeirSpill.rutenett(false); LeirSpill.inntil(false); L.lager.stål = Math.max(L.lager.stål || 0, 5); let sted = null;
            for (let i = 0; i < 14 && !sted; i++) { LeirSpill.startPlassering('container'); LeirSpill.trykk(LX + i * 90, LY + 5000 + i * 40); await LeirSpill.prøv(); const p = LeirSpill.plassering(); if (p && !p.feil) sted = p; else LeirSpill.avbryt(); }
            if (sted) {
              rg.banner = /Utpost \d+(,\d)? km fra leiren: byggelaget reiser \d+ min/.test(tekst('byggvalg')); const n0 = L.bygg.length; LeirSpill.bekreft(); const ub = L.bygg[L.bygg.length - 1];
              rg.bestilt = L.bygg.length === n0 + 1 && ub.type === 'container'; rg.reise = Math.round(ub.reise || 0); rg.venta = Math.round(Leir.reise(L, ub.x, ub.y).full);
              rg.logg = nyLogg(/Container bestilt: .* \+ \d+ min reise \(\d+(,\d)? km fra leiren\)/);
              sim(.1); lk.click(); rg.meny = /Container bygges – byggelaget er på vei/.test(tekst('leirmeny')); lk.click();
              LeirSpill.velg(ub.id); rg.panel = /byggelaget er på vei/.test(tekst('byggvalg')) && /utpost \d/.test(tekst('byggvalg')); LeirSpill.velg(null);
              rg.påVei = ub.igjen === ub.totalt && ub.reise > 0 && ub.reise < Leir.reise(L, ub.x, ub.y).full;
              ub.reise = .05; sim(.1); rg.framme = !(ub.reise > 0) && ub.igjen === ub.totalt && nyLogg(/Byggelaget er framme ved container/);
              // en fiende ved byggeplassen: den ødelegges, og de 2 t stål som ikke var brukt, kommer tilbake
              const fi = nyttLag('Vaktfiende', ub.x + 30, ub.y, 'rød'), stål0 = L.lager.stål; ENHETER.push(fi); ub.hp = .0001; sim(.1); ENHETER.splice(ENHETER.indexOf(fi), 1);
              rg.ødelagt = !L.bygg.includes(ub) && nyLogg(/Byggeplassen for container er ødelagt av Vaktfiende! Materialene som ikke var brukt, er tilbake på lageret: 2 t stål/); rg.stål = Math.round((L.lager.stål - stål0) * 10) / 10; }
            LeirSpill.rutenett(true); LeirSpill.inntil(true);
            // radiomasten (lagt rett inn, med strøm fra aggregatet): rekkevidden for et lag med feltradio per nivå
            L.drivstoff = Math.max(L.drivstoff, 150); rg.hvorfor = KS.hvorfor(A); A.radio = 'felt'; sim(.1); await KS.sjekkKontakt(A); rg.uten = KS.info(A).rekkevidde;
            const mast = { id: 99998, type: 'radiomast', x: LX - 70, y: LY + 30, ret: 0, igjen: 0, totalt: 120, hp: 1, nivå: 1, arbeid: null, mat: {}, pris: 2e6 }; L.bygg.push(mast); rg.nivå = [];
            for (const n of [1, 2, 3]) { mast.nivå = n; sim(.1); await KS.sjekkKontakt(A); rg.nivå.push(KS.info(A).rekkevidde); }
            mast.nivå = 2; sim(.1); await KS.sjekkKontakt(A); valgt = A; visPanel(); rg.lagTekst = tekst('psub'); valgt = null; visPanel(); rg.status = KS.radioStatus();
            LeirSpill.velg(mast.id); rg.mastPanel = tekst('byggvalg'); LeirSpill.velg(null);
            L.bygg = L.bygg.filter(b => b !== mast); A.radio = undefined; sim(.1);
            // de to slagene drivstoff
            lk.click(); const dt = document.getElementById('dieseltekst'), kd = document.getElementById('kjopdiesel');
            rg.diesel = !!dt && /olje \(tonn\) på basen/.test(dt.textContent) && !!kd && /diesel/.test(kd.textContent) && /Diesel til leiren/.test(tekst('leirmeny')); lk.click();
            visBase(OLJE.BASER[0]); rg.base = /Leirens diesel/.test(tekst('hint')) && /Olje \(tonn\)/.test(tekst('hint'));
            velgKjoretoy(KJORETOY[0]); rg.kj = /olje \(tonn\) fra basen/.test(tekst('hint')) && /Leirens diesel/.test(tekst('hint')); slippKjoretoy(); if (window.lukkPanel) lukkPanel();
            const overskrifter = [...document.querySelectorAll('#hjelp h3')].map(h => h.textContent); rg.hjelp = ['Diesel og olje', 'Utposter'].every(t => overskrifter.includes(t));
            r.regler = rg; }
          KS.av(); r3.avNøytral = !skjul(A) && KROKER.innsyn.every(f => f(A)); r.k3 = r3;
          // VAKT (feilretting 12. nov): verden lagres og leses inn igjen – klokka, laget (plass og helse) og kolonnen (plass)
          { const s = ENHETER.find(e => e.side === 'blå' && !e.karakter && !e.ai), k = KJORETOY.find(q => q.side === 'blå'), t0 = tid, x0 = s.x, hp0 = s.menn[1].hp, kx = k.x;
            s.menn[1].hp = .5; const lagret = LagringSpill.lagre(); tid = 0; s.x = x0 + 5000; s.menn[1].hp = 1; k.x = kx + 5000; const lest = LagringSpill.les();
            r.lagring = { lagret, lest, tid: Math.abs(tid - t0) < 1e-6, lag: Math.abs(s.x - x0) < .1 && s.menn[1].hp === .5, kj: Math.abs(k.x - kx) < .1 }; s.menn[1].hp = hp0; tid = t0; }
          localStorage.removeItem(OppstartSpill.NØKKEL); localStorage.removeItem('riksbrudd-k2'); localStorage.removeItem('riksbrudd-k3'); localStorage.removeItem('riksbrudd-ressurser'); localStorage.removeItem('riksbrudd-verden'); return r; });
        const k1ok = k1.på && /tettsted/.test(k1.iBy || '') && k1.ute === null && k1.ferdig && k1.penger.replace(/\s/g, ' ') === '100 mill. kr' && k1.lagret && k1.fraksjon === 'Dovrefolket' && k1.base === 0 && k1.lag < 600 && k1.skjult && Math.abs(k1.sikt - 1.15) < 1e-9;
        if (!k1ok) { feil++; console.log(JSON.stringify(k1)); }
        const k2 = k1.k2 || {}, k2ok = k2.k2 && k2.k2.every(v => v === 'ok') && /kontrollrom/.test(k2.opptatt || '') && k2.penger === 100e6 - 6.6e6 - 15e6 - 8e6 - 3e6 && k2.bygg === 3 && k2.ferdig
          && k2.drivstoff === 100 && k2.strøm[1] === 8 && k2.strøm[0] === 8 && k2.strøm[2] === 0 && k2.lagret === 3
          && /Oppgrader/.test(k2.panel) && /Riv/.test(k2.panel) && /Flytt/.test(k2.panel) && k2.nivå === 2 && k2.riv === .9e6 && k2.gjerde === 'ok' && k2.port && k2.fps && k2.bla;
        if (!k2ok) { feil++; console.log(JSON.stringify(k2)); }
        const rs = k1.res || {}, rsok = rs.panel && rs.tre > 0 && rs.betong > 0 && rs.hogd === 1 && rs.hogdHer && rs.revet && rs.jobber === 0 && rs.del && rs.lagret; if (!rsok) feil++;
        console.log(`${rsok ? 'ok  ' : 'FEIL'} ${navn} materialer fra verden: panelet viser utbytte og kjøpspris ${rs.panel}, hogst og riving ga ${rs.tre} m³ tre og ${rs.betong} m³ betong, hogd felt huskes ${rs.hogdHer}, revet hus borte ${rs.revet}, menyen har delen ${rs.del}, lagret ${rs.lagret}`);
        { const bv = k2.bv || {}, bvok = bv.på && bv.klasse && bv.m <= .61 && bv.iBildet && bv.svever && bv.fast && bv.dyttet && bv.plukk && bv.synlig && bv.av; if (!bvok) { feil++; console.log(JSON.stringify(bv)); }
          console.log(`${bvok ? 'ok  ' : 'FEIL'} ${navn} byggevisning i 2D: kameraet gikk inn til ${(bv.m || 0).toFixed(2)} m per punkt med leiren i bildet, skissen fulgte musa til trykket og sto så fast, piltasten dyttet den, Q plukket opp et bygg, skissen ble hentet inn i det frie feltet, av igjen etter avbryt`); }
        { const vg = k2.vg || {}, vgok = /vegen/.test(vg.banner || '') && !vg.feil && vg.bygget && vg.uferdig && vg.ferdig && vg.først; if (!vgok) { feil++; console.log(JSON.stringify(vg)); }
          console.log(`${vgok ? 'ok  ' : 'FEIL'} ${navn} grusveg og delegering: vegen ble lagt med tre punkter, teller som veg først når den er ferdig, og «Bygg dette først» flytter jobben fremst`); }
        const kp = k2.plan || {}, kpok = kp.gap === 2 && kp.linjer > 0 && kp.n && kp.n.join() === [kp.n[0], kp.n[0] + 1, kp.n[0] + 1].join() && kp.gratis && kp.bygget === kp.n[2] && kp.tom && kp.flere === kp.bygget && kp.malBygg > 2 && kp.malOk; if (!kpok) feil++;
        const bs = k2.bs || {}, bsok = bs.åpen && bs.hytte === 16 && bs.bygget === 16 && bs.jobber === 16 && /vegger/.test(bs.lufttak || '') && bs.rad === 3 && bs.rom === 1 && bs.dør === 1 && bs.senger === 2
          && bs.revet === 1 && bs.tilbake > 0 && bs.passer && bs.lukket; if (!bsok) { feil++; console.log(JSON.stringify(bs)); }
        console.log(`${bsok ? 'ok  ' : 'FEIL'} ${navn} byggesett: åpnes fra Leir-menyen, hytte ${bs.bygget} deler som ${bs.jobber} jobber, tak i lufta avvist, rad med ${bs.rad} vegger, ferdig hytte = ${bs.rom} rom med dør og ${bs.senger} senger, revet vegg ga ${bs.tilbake} kr`);
        console.log(`${kpok ? 'ok  ' : 'FEIL'} ${navn} planlegging: skisser gratis, den andre ${kp.gap} m inntil (${kp.linjer} hjelpelinjer), angre/gjør om ${kp.n && kp.n.join('→')}, mal med ${kp.malBygg} bygg kan settes inn, «Bygg hele planen» bygde ${kp.bygget}`);
        const fo = k1.folk || {}, fook = fo.antall === 10 && fo.bygg === 4 && fo.lag === 2 && fo.lagret && fo.åpen && fo.rader === 9 && fo.pluss === 1 && fo.minus === 0 && fo.ingenLag === 0 && fo.innenfor && fo.sikt === 1.25 && fo.kjøkken;
        if (!fook) { feil++; console.log(JSON.stringify(fo)); }
        console.log(`${fook ? 'ok  ' : 'FEIL'} ${navn} folk: ${fo.antall} personer, ${fo.bygg} på bygg = ${fo.lag} byggelag (0 uten byggere), lagret i leiren, panelet fra Leir-menyen (${fo.rader} oppgaver, + og − virker, innenfor skjermen, ${fo.mangler} ting mangler), bemannet vakttårn gir sikt ×${fo.sikt}, kjøkken finnes`);
        const fx = k1.fiks || {}, lg = k1.lagring || {}, fxok = fx.rom > 0 && fx.senger === 0 && fx.malDeler === 0 && fx.malBygg > 2 && fx.malVann && fx.malRøde > 0 && /vann/.test(fx.gjerde || '') && fx.tom === null && /seng|Moralen/.test(fx.full || '')
          && lg.lagret && lg.lest && lg.tid && lg.lag && lg.kj;
        if (!fxok) { feil++; console.log(JSON.stringify(fx), JSON.stringify(lg)); }
        console.log(`${fxok ? 'ok  ' : 'FEIL'} ${navn} feilretting (mekanikk): ${fx.rom} senger i egenbygd rom telt én gang, mal uten byggesettdeler (${fx.malBygg} bygg) avvist i vann («${fx.malVann}»), gjerde over vann avvist («${fx.gjerde}»), tom gjeng kan rekruttere; klokka, lag og kolonne lagres og leses inn`);
        const rg = k1.regler || {}, rgok = rg.banner && rg.bestilt && rg.reise > 20 && rg.reise === rg.venta && rg.logg && rg.meny && rg.panel && rg.påVei && rg.framme && rg.ødelagt && rg.stål === 2
          && rg.uten === 8000 && (rg.nivå || []).join() === '15000,25000,40000' && /feltradio 25 km/.test(rg.lagTekst || '') && /nivå 2 – feltradio 25 km, håndradio 3 km/.test(rg.status || '')
          && /Feltradioene når 25 km/.test(rg.mastPanel || '') && /nivå 3: 40 km/.test(rg.mastPanel || '') && /håndradioen når 3 km/.test(rg.hvorfor || '') && rg.diesel && rg.base && rg.kj && rg.hjelp;
        if (!rgok) { feil++; console.log(JSON.stringify(rg)); }
        console.log(`${rgok ? 'ok  ' : 'FEIL'} ${navn} brukerens valg (regler): utpost ${rg.venta} min reise i banneret, menyen og byggpanelet, laget kom fram; byggeplassen ødelagt av en fiende ga ${rg.stål} t stål tilbake; feltradio ${(rg.nivå || []).map(v => v / 1000).join('/')} km med mast nivå 1/2/3 (${rg.uten / 1000} km uten) og «${rg.status}»; diesel og olje forklart i Leir-menyen ${rg.diesel}, basen ${rg.base}, kjøretøyet ${rg.kj} og hjelpen ${rg.hjelp}`);
        const k3 = k1.k3 || {}, k3ok = k3.inn && k3.mInne === 'kontrollrom' && !k3.aKontakt && k3.bKontakt && k3.aSkjult && !k3.bSkjult && /Framme/.test(k3.melding || '')
          && k3.skjerm && k3.ordreA === false && k3.mUte === 'ute' && k3.bSkjultUte && k3.avNøytral && k3.rutine && !k3.rutineILogg;
        if (!k3ok) { feil++; console.log(JSON.stringify(k3)); }
        console.log(`${k3ok ? 'ok  ' : 'FEIL'} ${navn} kontrollrommet (K3): gikk inn, lag 6 km unna uten kontakt skjult, lag 1 km unna med kontakt vist, melding «${k3.melding}», ordre uten kontakt stoppet, ute bare «sist meldt»`);
        console.log(`${k2ok ? 'ok  ' : 'FEIL'} ${navn} leiren (K2): materialer kjøpt, kontrollrom, aggregat og tank bygget (${k2.penger / 1e6} mill. kr igjen), opptatt plass avvist, strøm ${k2.strøm && k2.strøm[0]}/${k2.strøm && k2.strøm[1]} kW, lagret; byggpanel (${k2.panel}), aggregat nivå ${k2.nivå}, revet tank ga ${k2.riv / 1e6} mill., lukket gjerde, port festet i gjerdet, FPS-teller, menyen kan blas i`);
        console.log(`${k1ok ? 'ok  ' : 'FEIL'} ${navn} oppstart (K1): startskjerm, «${k1.iBy}», leir på land godtatt, ${k1.penger}, lagret, ${k1.fraksjon} tar over (base flyttet, lagene ${k1.lag} m unna), politi-bonus sikt ×${k1.sikt}`);
        }
      }
      await pg.evaluate(f => { Object.assign(kam, f); tempo = 1; valgt = null; visPanel(); skitten = true; }, før);
    }
    // VAKT grensesnitt (feiljakten 12. nov, ui-telefon): hjelpen åpner ikke oppå startskjermen; leirvalget går foran et kjøretøy som står der
    // du trykker; ☰ holder seg innenfor skjermen (rulles); Leir-menyen tegnes ikke på nytt mens en knapp holdes nede, men oppdateres etterpå;
    // Leir-menyen lukker panelet nede til venstre; byggbanneret ligger ikke midt over bygget på telefon; kontrollrommet dekker ikke
    // zoomknappene; navnene ved leiren ligger ikke oppå hverandre; «Riksrådet»/«Hovedbase Dombås» er borte fra tekstene
    { const ui = await pg.evaluate(async () => {
        if (!OppstartSpill.tilstand() || !window.LeirSpill || !LeirSpill.tilstand()) return null;
        const vent = ms => new Promise(r => setTimeout(r, ms)), el = id => document.getElementById(id), på = id => el(id).classList.contains('på'), r = {}, kam0 = { ...kam }, tempo0 = tempo;
        const fri = id => { const b = el(id), q = b.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return e === b || b.contains(e); };
        valgt = null; visPanel(); tempo = 1;
        // hjelpen og startskjermen
        localStorage.removeItem('riksbrudd-hjelp'); OppstartSpill.nytt(); r.hjelpOver = Hjelp.første() || på('hjelp');
        // leirvalget: trykk der et kjøretøy står
        OppstartSpill.vis(3); [...document.querySelectorAll('#oppstart button')].find(b => /kartet/.test(b.textContent)).click();
        const k = KJORETOY.find(q => q.side === 'blå'); kam.x = k.x; kam.y = k.y; trykkPå(VW / 2, VH / 2); await vent(600);
        r.leirvalg = !på('panel') && !/^Trykk på kartet/.test(el('leirvalg').textContent);
        [...document.querySelectorAll('#leirvalg button')].find(b => /Tilbake/.test(b.textContent)).click(); r.steg2Topp = document.querySelector('#oppstart .ark').scrollTop === 0;
        el('oppstart').classList.remove('på'); r.hjelpEtter = Hjelp.første() && på('hjelp'); visHjelp(false); Object.assign(kam, kam0);
        // ☰
        el('meny').click(); const m = el('lagmeny'), mr = m.getBoundingClientRect(); r.meny = mr.bottom <= innerHeight + 1 && (m.scrollHeight <= m.clientHeight + 1 || getComputedStyle(m).overflowY === 'auto');
        r.filter = !el('filterknapp').classList.contains('av'); el('meny').click();
        // Leir-menyen: lukker panelet, står i ro mens en knapp holdes nede, oppdateres når den slippes
        valgt = ENHETER.find(e => e.side === 'blå' && levende(e)); visPanel(); const panelFør = på('panel'); el('leirknapp').click(); r.lukker = panelFør && !på('panel');
        const L = LeirSpill.tilstand(), kn = el('planmodus'), tre = () => document.querySelector('#leirmeny .mat span').textContent;
        const l0 = tre(); kn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); L.lager.tre += 1; await vent(1400); r.holdt = kn.isConnected && tre() === l0;
        window.dispatchEvent(new PointerEvent('pointerup')); await vent(1400); r.oppdatert = tre() !== l0; L.lager.tre -= 1;
        r.strøm = !/brukt av/.test(document.querySelector('#leirmeny .status').textContent); el('leirknapp').click();
        // byggbanneret under plassering
        const S = OppstartSpill.tilstand().leir; LeirSpill.startPlassering('solcelle'); LeirSpill.trykk(S.x + 300, S.y + 300); await vent(400);
        const br = el('byggvalg').getBoundingClientRect(); r.banner = !(br.left < VW / 2 && br.right > VW / 2 && br.top < VH / 2 && br.bottom > VH / 2) && br.bottom <= innerHeight && br.left >= 0 && br.right <= innerWidth; LeirSpill.avbryt();
        // kontrollrommet
        const KS = KontrollromSpill, deg = KS.deg(), krom = L.bygg.find(b => b.type === 'kontrollrom' && b.igjen === 0);
        if (krom && deg) { KS.av(false); const d0 = [deg.x, deg.y]; deg.x = krom.x; deg.y = krom.y; KS.gåInn(); await vent(50);
          r.zoom = ['zi', 'zo', 'dombas', 'hele'].every(fri); const t = document.querySelector('#kontrollrom .topp'); r.topp = t.getBoundingClientRect().height < 60 && t.getBoundingClientRect().right <= innerWidth;
          KS.gåUt(); [deg.x, deg.y] = d0; KS.av(); } else r.zoom = r.topp = 'ingen kontrollrom';
        // navnene ved leiren, sett langt ute
        kam.x = S.x; kam.y = S.y; kam.m = 30; skitten = true; await new Promise(q => requestAnimationFrame(() => requestAnimationFrame(q))); await vent(60);
        r.navn = [Etikett.antall(), Etikett.overlapp()];
        // tekstene
        r.tekst = !/Riksrådet|Hovedbase/.test(el('logg').textContent + el('hjelp').textContent) && /600×/.test(el('hjelp').textContent) && el('sHvor').previousElementSibling.textContent === 'du er';
        const xs = id => el(id).getBoundingClientRect().left; r.kassa = !document.body.classList.contains('kort') || xs('sPenger') < xs('sH');
        localStorage.removeItem('riksbrudd-k3'); localStorage.removeItem('riksbrudd-k2');
        Object.assign(kam, kam0); tempo = tempo0; valgt = null; visPanel(); skitten = true; return r; });
      const uiok = ui && !ui.hjelpOver && ui.hjelpEtter && ui.leirvalg && ui.steg2Topp && ui.meny && ui.filter && ui.lukker && ui.holdt && ui.oppdatert && ui.strøm && ui.banner && ui.zoom === true && ui.topp === true
        && ui.navn[0] >= 3 && ui.navn[1] === 0 && ui.tekst && ui.kassa;
      if (ui && !uiok) { feil++; console.log(JSON.stringify(ui)); }
      console.log(ui ? `${uiok ? 'ok  ' : 'FEIL'} ${navn} grensesnitt: hjelpen venter på startskjermen, leirvalget går foran kjøretøy, ☰ innenfor skjermen, Leir-menyen står i ro mens en knapp holdes (${ui.holdt}) og oppdateres etterpå (${ui.oppdatert}), byggbanneret ikke midt på, zoomknappene fri i kontrollrommet, ${ui.navn[0]} navn uten overlapp` : `     ${navn} grensesnitt: hoppet over (ingen leir uten infrastrukturdata)`); }
    // 3D: bygges av flisene, viser riktig høyde, og en ordre kan gis
    await pg.click('#v3d'); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 60000 });
    await pg.waitForFunction(() => R3.renderer.info.render.frame > 2, null, { timeout: 30000 }).catch(() => {});   // 3D må faktisk tegnes (en kommentar slukte render-kallet 10. nov)
    // VAKT ytelse (12. nov): 3D tegnes med høyst 1,5 (PC) / 1,25 (mobil) i pikseltetthet, og i pause uten bevegelse hoppes rammer over
    const yt = await pg.evaluate(() => { const t0 = tempo; tempo = 0; sistAktiv = 0; trengerTegning3d(performance.now() + 2000); const a = trengerTegning3d(performance.now() + 2010); tempo = 1; const b = trengerTegning3d(performance.now() + 2020); tempo = t0;
      return { pr: R3.pr, maks: VW < 900 ? 1.25 : 1.5, hopper: !a, tegnerIgjen: b }; });
    const ytok = yt.pr > 0 && yt.pr <= yt.maks && yt.hopper && yt.tegnerIgjen; if (!ytok) feil++;
    console.log(`${ytok ? 'ok  ' : 'FEIL'} ${navn} ytelse: pikseltetthet ${yt.pr} (høyst ${yt.maks}), pause uten bevegelse hopper over rammer: ${yt.hopper}, tegner igjen når tida går: ${yt.tegnerIgjen}`);
    // fjernterrenget rundt utsnittet (spill/fjern3d.js): ringen finnes i scenen (horisonten var avklipte vegger 12. nov)
    await pg.waitForFunction(() => window.Fjern3d && Fjern3d.sjekk(), null, { timeout: 30000 }).catch(() => {});
    const fj = await pg.evaluate(() => Fjern3d.sjekk()), fjok = !!(fj && fj.iScene && fj.trekanter > 1000); if (!fjok) feil++;
    console.log(`${fjok ? 'ok  ' : 'FEIL'} ${navn} fjernterreng: ${fj ? `${fj.trekanter} trekanter ut til ${Math.round(fj.R2 / 1000)} km` : 'mangler'}`);
    // VAKT byggesett i 3D (12. nov): en brakke av deler i utsnittet står i scenen (samlede nett), ingen del svever eller mangler støtte,
    // rommet finnes, veggene stopper deg når du går (døra er åpen), og det tegnes uten GL-feil; delene rives etterpå
    const bs3 = await pg.evaluate(async () => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !window.Byggesett || !L.byggesett) return null;
      const u = R3.ut, gl = R3.renderer.getContext(), BR = ByggesettRegler, før = new Set(L.bygg.map(b => b.id)); for (const m of ['tre', 'betong', 'stål']) Leir.kjøpMateriale(L, m, 60, OppstartSpill.betal);
      Byggesett.åpne(); Byggesett.velg({ fane: 'hus', hus: 'brakke', rot: 0 }); let n = 0;
      for (let k = 0; k < 40 && !n; k++) { Byggesett.trykk(u.cx + 60 + (k % 8) * 45, u.cy - 400 + Math.floor(k / 8) * 60); await Byggesett.oppdater(); const F = Byggesett.forslag(); if (F.length && F.every(q => !q.feil)) n = Byggesett.bekreft(true); }
      for (const b of L.bygg) if (!før.has(b.id)) b.igjen = 0; Byggesett.lag3d(); gl.getError();
      await new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const sj = Byggesett.sjekk(), nye = Byggesett.deler().filter(d => !før.has(d.id)), o = Byggesett.opphav(), lok = d => { const m = BR.midt(o, d); return [m.x - u.cx, m.y - u.cy]; };
      const hel = nye.find(d => BR.DELER[d.type].v === 'hel' && d.n === 0), dør = nye.find(d => BR.DELER[d.type].v === 'dør');
      const r = { n, ...sj, glFeil: gl.getError(), vegg: !!hel && hindring3d(...lok(hel)), dør: !!dør && !hindring3d(...lok(dør)), rom: Byggesett.rom().filter(q => q.celler.length === 12).length };
      for (const d of nye) Leir.riv(L, d.id); Byggesett.lag3d(); Byggesett.lukk(); r.etter = Byggesett.sjekk().deler; return r; });
    const bs3ok = !!(bs3 && bs3.n === 4 * 3 * 2 + 14 && bs3.iScene >= 3 && bs3.trekanter > 1000 && bs3.svever === 0 && bs3.ustøttet === 0 && bs3.rom === 1 && bs3.vegg && bs3.dør && bs3.glFeil === 0);
    if (!bs3ok) { feil++; console.log(JSON.stringify(bs3)); }
    console.log(`${bs3ok ? 'ok  ' : 'FEIL'} ${navn} byggesett i 3D: brakke av ${bs3 && bs3.n} deler i ${bs3 && bs3.iScene} samlede nett (${bs3 && bs3.trekanter} trekanter), ${bs3 && bs3.svever} svever, ${bs3 && bs3.ustøttet} uten støtte, rommet funnet, veggen stopper deg og døra er åpen`);
    // VAKT bølger, vind og tåke (spill/vind3d.js, 12. nov): i storm har bakkeshaderen bølger med skum, trærne svaier mer, statuslinja viser
    // vinden og det tegnes uten GL-feil; i tåke blir himmelen grå. Klart vær igjen etterpå.
    const vi = await pg.evaluate(async () => { const gl = R3.renderer.getContext(); gl.getError(); const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Vaer.låsVær(VaerSpill.S, 'storm'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(3); await new Promise(r => setTimeout(r, 1200)); await vent(2);
      // (15. nov: bølgene er bare med i bakkens program når utsnittet har vann – prøv skyggeleggeren på en egen flate)
      const prøv = Vind3d.prøvShader ? Vind3d.prøvShader(R3) : true, st = Vind3d.sjekk(), k = Vind3d.U().uVindK.value;
      Vaer.låsVær(VaerSpill.S, 'tåke'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(3); const tå = Vind3d.VIND.grå || 0;
      Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(2); return { ...st, prøv, k, tå, glFeil: gl.getError() }; });
    const viok = vi.bølger && vi.prøv && vi.amp > .8 && vi.skum > 0 && vi.k > 2 && /m\/s/.test(vi.status) && vi.tå > .5 && vi.glFeil === 0; if (!viok) feil++;
    console.log(`${viok ? 'ok  ' : 'FEIL'} ${navn} bølger, vind og tåke: storm ${vi.fart.toFixed(1)} m/s, bølger ${vi.bølger} (skyggeleggeren kompilerer: ${vi.prøv}; høyde ×${vi.amp.toFixed(2)}, skum ${vi.skum.toFixed(2)}), trær ×${vi.k.toFixed(2)}, status «${vi.status}», tåke grå himmel ${vi.tå.toFixed(2)}, GL-feil ${vi.glFeil}`);
    // VAKT billigere terreng (15. nov, brukeren: «begynn med punkt 1»): terrengnettet er delt i ruter med vann og ruter med bare land, og bare
    // vannrutene tegnes med bølger og glans (delBakken/bakkeVariant/bakkeNå i index.html). Kunstig vann i det nordvestre hjørnet av
    // vannmasken (feilen lagt inn med vilje – uten den har Dombås-utsnittet én gruppe): to grupper, ruta midt i vannet ligger i vanngruppen og
    // ruta på land i landgruppen, begge programmene kompilerer og tegnes uten GL-feil, tørt land har ikke lys per punkt, våt bakke har det.
    // Tilbake til det ekte utsnittet etterpå. Grafikkortets navn er lest (spill/kvalitet.js).
    const bt = await pg.evaluate(async () => { const gl = R3.renderer.getContext(); gl.getError(); const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const u = R3.ut, geo = R3.mesh.geometry, r = {}; await vent(2);
      const beskriv = () => [].concat(R3.mesh.material).map(m => ({ land: !!m.userData.land, matt: !!m.userData.utenGlans }));
      r.før = { del: R3.bakkeDel, grupper: geo.groups.length, mat: beskriv() };
      const D0 = u.vannData, hv0 = u.harVann, W = D0 && D0.W ? D0.W : 256, d = new Uint8ClampedArray(W * W * 4);
      for (let j = 0; j < W / 2; j++) for (let i = 0; i < W / 2; i++) d[(j * W + i) * 4] = 255;
      u.vannData = { W, d }; u.harVann = true; R3.bakkeDel = delBakken(geo, u); R3.bakkeSett = null; await vent(3);
      r.med = { del: R3.bakkeDel, grupper: geo.groups.length, mat: beskriv(), liste: Array.isArray(R3.mesh.material), alle: geo.index.count };
      const ray = new THREE.Raycaster(), gruppe = (x, y) => { ray.set(new THREE.Vector3(x, y, 9000), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObject(R3.mesh)[0]; return h && h.face ? h.face.materialIndex : -1; };
      r.iVann = gruppe(-u.S * .5, u.S * .5); r.påLand = gruppe(u.S * .5, -u.S * .5);
      r.prog = [].concat(R3.mesh.material).map(m => { const p = R3.renderer.properties.get(m), pr = p && (p.currentProgram || p.program); return !!pr && !(pr.diagnostics && pr.diagnostics.runnable === false); });
      VaerSpill.S.våt = 1; VaerSpill.oppdater(); VaerSpill.straks(); await vent(3); r.våt = beskriv(); VaerSpill.S.våt = 0; VaerSpill.oppdater(); VaerSpill.straks(); await vent(2);
      u.vannData = D0; u.harVann = hv0; R3.bakkeDel = delBakken(geo, u); R3.bakkeSett = null; await vent(3);
      r.etter = { del: R3.bakkeDel, grupper: geo.groups.length, mat: beskriv() }; r.glFeil = gl.getError();
      r.kort = KVAL.kort; r.tittel = (document.getElementById('vis-grafikk') || {}).title || ''; return r; });
    const btok = !!(bt.før.del && bt.med.del) && bt.med.grupper === 2 && bt.med.liste && bt.med.del.vann > bt.før.del.vann && bt.med.del.land > 0 && bt.med.del.land + bt.med.del.vann === bt.med.alle
      && bt.med.del.vann > .2 * bt.med.alle && bt.med.del.vann < .45 * bt.med.alle && bt.iVann === 1 && bt.påLand === 0 && bt.med.mat.length === 2 && bt.med.mat[0].land && bt.med.mat[0].matt && !bt.med.mat[1].land && !bt.med.mat[1].matt
      && bt.prog.length === 2 && bt.prog.every(Boolean) && bt.våt[0].land && !bt.våt[0].matt && bt.etter.grupper === bt.før.grupper && bt.etter.del.vann === bt.før.del.vann && bt.glFeil === 0
      && typeof bt.kort === 'string' && bt.kort.length > 0 && /Grafikkort/.test(bt.tittel);
    if (!btok) { feil++; console.log(JSON.stringify(bt)); }
    console.log(`${btok ? 'ok  ' : 'FEIL'} ${navn} billigere terreng: uten vann ${bt.før.grupper} grupper; kunstig vann gir ${bt.med.grupper} grupper (${bt.med.del && Math.round(100 * bt.med.del.vann / bt.med.alle)} % vannruter), vann i gruppe ${bt.iVann}, land i gruppe ${bt.påLand}, tørt land uten lys per punkt, vått land med, GL-feil ${bt.glFeil}; grafikkort «${bt.kort}»`);
    // VAKT tåkebildet (15. nov): tåka og siktfeltene ligger i et eget, lite bilde (R3.tåkeC) som bakken legger oppå kartet – kartbildet i
    // bakken (R3.tex, utsnittets eget bilde) sendes ikke til grafikkortet på nytt når sikten endrer seg (versjonen står stille mens
    // tåkebildets versjon øker). Med tåka på er bildet dekket (alfa ca. 82 av 255 der ingen ser), med tåka av er det tomt.
    const tb = await pg.evaluate(async () => { const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const t0 = VIS.taake, s0 = VIS.sikt, alfa = () => { const c = R3.tåkeC, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let maks = 0, sum = 0; for (let q = 3; q < d.length; q += 4 * 97) { if (d[q] > maks) maks = d[q]; sum += d[q]; } return { maks, snitt: sum / (d.length / (4 * 97)) }; };
      VIS.taake = true; VIS.sikt = false; await vent(3); const kart0 = R3.tex.version, tåke0 = R3.tåkeTex.version, bakt0 = R3.bakt, på = alfa();
      siktVersjon++; await vent(3); const kart1 = R3.tex.version, tåke1 = R3.tåkeTex.version, bakt1 = R3.bakt;
      VIS.taake = false; await vent(3); const av = alfa();
      VIS.taake = t0; VIS.sikt = s0; await vent(3);
      return { på, av, kartSendt: kart1 - kart0, tåkeSendt: tåke1 - tåke0, bakt: bakt1 - bakt0, eget: R3.tex.image === R3.ut.base, størrelse: R3.tåkeC.width, uniform: TAAKE_U.taakeKart.value === R3.tåkeTex, gl: R3.renderer.getContext().getError() }; });
    const tbok = tb.eget && tb.uniform && tb.størrelse === 1024 && tb.kartSendt === 0 && tb.tåkeSendt >= 1 && tb.bakt >= 1 && tb.på.maks >= 70 && tb.på.maks <= 95 && tb.på.snitt > 5 && tb.av.maks === 0 && tb.gl === 0;
    if (!tbok) { feil++; console.log(JSON.stringify(tb)); }
    console.log(`${tbok ? 'ok  ' : 'FEIL'} ${navn} tåkebildet: eget bilde på ${tb.størrelse} punkter; sikten endret: kartbildet sendt ${tb.kartSendt} ganger, tåkebildet ${tb.tåkeSendt}; tåke på alfa ${tb.på.maks} (snitt ${tb.på.snitt.toFixed(0)}), tåke av ${tb.av.maks}`);
    // VAKT utseende 15. nov: (1) tussmørke – sommernatta (sola 6° under horisonten) har mer himmellys enn vinternatta, som ikke er
    // mørkere enn 0,5; (2) «Gå» starter med blikket mot åpent lende: Gange.åpenRetning snur bort fra en hindring rett foran (prøvd med en
    // kunstig vegg i R3.hindre – uten veggen beholdes kursen, det er feilen lagt inn med vilje); (3) snøen ligger også i bratte lier:
    // skyggeleggeren har den nye grensen, og fjernterrenget bruker den samme.
    const us = await pg.evaluate(async () => { const t0 = tid, S = VaerSpill.S, å0 = S.årstid, lys = (årstid, time) => { Vaer.settÅrstid(S, årstid, tid); VaerSpill.straks(); tid = ((time - 6 + 24) % 24) * 60; R3.lysTid = null; lys3d(); return R3.himmelLys.intensity; };
      const sommernatt = lys('sommer', .5), vinternatt = lys('vinter', .5), sommerdag = lys('sommer', 13);
      Vaer.settÅrstid(S, å0, t0); VaerSpill.straks(); tid = t0; R3.lysTid = null; lys3d();
      // en kunstig vegg 3 m rett foran (mot nord fra midten av utsnittet): hindring3d slår til der
      const ekte = window.hindring3d, x0 = 12345, y0 = -2345; let uten, med;
      window.hindring3d = () => false; uten = Gange.åpenRetning(x0, y0, 0);
      window.hindring3d = (x, y) => Math.abs(x - x0) < 4 && y > y0 + 2.5 && y < y0 + 4; med = Gange.åpenRetning(x0, y0, 0);
      window.hindring3d = ekte;
      const frag = [].concat(R3.mesh.material).map(m => { const p = R3.renderer.properties.get(m), pr = p && (p.currentProgram || p.program); return pr ? R3.renderer.getContext().getShaderSource(pr.fragmentShader) || '' : ''; }).join('');
      return { sommernatt, vinternatt, sommerdag, uten, med, snø: /smoothstep\(0\.36, 0\.62, opp/.test(frag), vissen: /snoH \* gronn/.test(frag) }; });
    const usok = us.sommernatt > us.vinternatt + .08 && us.vinternatt >= .5 && us.sommerdag > us.sommernatt + .1 && us.uten === 0 && Math.abs(us.med) > .3 && us.snø && us.vissen;
    if (!usok) { feil++; console.log(JSON.stringify(us)); }
    console.log(`${usok ? 'ok  ' : 'FEIL'} ${navn} utseende 15. nov: himmellys sommernatt ${us.sommernatt.toFixed(2)}, vinternatt ${us.vinternatt.toFixed(2)}, sommerdag ${us.sommerdag.toFixed(2)}; «Gå» snur ${(Math.abs(us.med) * 57.3).toFixed(0)}° bort fra en vegg rett foran (uten vegg ${us.uten}); snø i bratte lier ${us.snø}`);
    // VAKT lang marsj (15. nov, brukeren: 3D sto på 50 % fordi patruljen fikk marsjordre 350 km til Dovre og kartet for hele strekket
    // fylte hentekøen): en ordre over MARSJ_MAKS bestiller ingen fliser, og en patrulje langt unna går runden der den står.
    const lm = await pg.evaluate(async () => { const fi = ENHETER[3], før = { x: fi.x, y: fi.y, b: fi.patruljeBase, sti: fi.sti }, n0 = RÅ.size, v0 = Object.values(FLIS_VENTER).reduce((a, c) => a + c, 0);
      fi.x -= 180000; fi.y -= 250000; fi.patruljeBase = null; const m = patruljeMål(fi, 1), nær = Math.hypot(m[0] - fi.x, m[1] - fi.y);
      await ordre(fi, før.x, før.y, true); const ut = { nær, nye: RÅ.size - n0, venter: Object.values(FLIS_VENTER).reduce((a, c) => a + c, 0) - v0, planlegger: !!fi.planlegger, hjemme: null };
      fi.x = før.x; fi.y = før.y; fi.patruljeBase = null; const h = patruljeMål(fi, 1); ut.hjemme = h[0] === PATRULJE[1][0] && h[1] === PATRULJE[1][1]; fi.patruljeBase = før.b; fi.sti = før.sti; return ut; });
    const lmok = lm.nær < 8000 && lm.nye === 0 && lm.venter <= 0 && !lm.planlegger && lm.hjemme;
    if (!lmok) { feil++; console.log(JSON.stringify(lm)); }
    console.log(`${lmok ? 'ok  ' : 'FEIL'} ${navn} lang marsj: ordre over taket bestiller ${lm.nye} fliser, patruljen langt unna går ${Math.round(lm.nær)} m, hjemme som før`);
    // VAKT fremdriftskortet (15. nov, brukeren på iPhone: svart skjerm mens 3D bygges): 3D av og på – mens det første utsnittet bygges,
    // står kartet (3D-lerretet skjult) med kortet «Bygger 3D … %» som øker; når det er klart, vises 3D, kortet er borte og loggen sier
    // hvor lang tid det tok. Steinmønsteret i bakken (detaljTekstur) er laget.
    const fd = await pg.evaluate(async () => { const b0 = { ...R3.bane }; slå3d(false); await new Promise(r => setTimeout(r, 300)); const p = slå3d(true); const sett = [];
      while (R3.ut && !R3.bygger) await new Promise(r => setTimeout(r, 5));
      const t0 = performance.now(); while (!(R3.ut && !R3.bygger) && performance.now() - t0 < 120000) { const k = document.getElementById('bygg3d');
        if (k && k.classList.contains('på')) sett.push({ p: parseInt(k.querySelector('.pst').textContent), tid: k.querySelector('.tid').textContent, c3: document.getElementById('c3').hidden, kart: cv.style.visibility }); await new Promise(r => setTimeout(r, 40)); }
      await p; await new Promise(r => setTimeout(r, 300)); R3.bane = { ...R3.bane, ...b0 };
      const frist = 'avvist';   // (fristen på bildelesing er tatt ut)
      return { tid: sett.some(x => /^· \d+ s$/.test(x.tid)), frist, venter: R3.venterPå, n: sett.length, første: sett[0], siste: sett[sett.length - 1], økende: sett.every((x, i) => !i || x.p >= sett[i - 1].p), alleSkjult: sett.every(x => x.c3 && x.kart === ''),
        etter: { kort: document.getElementById('bygg3d').classList.contains('på'), c3: document.getElementById('c3').hidden, kart: cv.style.visibility }, logg: loggLinjer.find(l => /^3D klart på/.test(l)) || '', detalj: !!DETALJ }; });
    const fdok = fd.n >= 3 && fd.økende && fd.alleSkjult && fd.siste.p > fd.første.p && !fd.etter.kort && fd.etter.c3 === false && fd.etter.kart === 'hidden' && /3D klart på \d+,\d s/.test(fd.logg) && fd.detalj && fd.tid && fd.frist === 'avvist' && fd.venter === '';
    if (!fdok) { feil++; console.log(JSON.stringify(fd)); }
    console.log(`${fdok ? 'ok  ' : 'FEIL'} ${navn} fremdriftskortet: ${fd.n} avlesninger fra ${fd.første && fd.første.p} % til ${fd.siste && fd.siste.p} %, kartet synlig og 3D skjult underveis, så 3D vist og kortet borte; «${fd.logg}»`);
    // VAKT måling av ytelse (spill/ytelse.js, 15. nov): knappen «Mål ytelse» finnes i ☰; en kort måling gir tabellen med hele bildet, halv
    // oppløsning (halvparten så mange punkter i bredden mens den måles) og en rad for bakken med trekanter; alt i scenen er satt tilbake
    // etterpå (ingen ting igjen på et skjult lag – det er feilen vakten skal finne), oppløsningen er som før, og boksen kan lukkes.
    const ytm = await pg.evaluate(async () => { const c = R3.renderer.domElement, før = { pr: R3.pr, bredde: c.width }; let halvBredde = 0;
      const følg = setInterval(() => { if (R3.målPr) halvBredde = c.width; }, 30);
      const r = await Ytelse.mål({ rammer: 2, vent: 1, kilder: 2 }); clearInterval(følg);
      await new Promise(q => requestAnimationFrame(() => requestAnimationFrame(q)));
      let skjult = 0, kilder = 0; R3.scene.traverse(o => { if (o.layers.mask !== 1) skjult++; if (o.userData && o.userData.kilde && o.userData.kilde !== 'index') kilder++; });
      const boks = document.getElementById('ytelse'), åpen = !!boks && boks.classList.contains('på'); document.getElementById('ytelseLukk').click();
      return { rader: r ? r.rader.map(x => ({ navn: x.navn, ms: x.ms, tri: x.tri, del: x.del })) : [], tekst: r ? r.tekst : '', skjult, kilder, måler: !!R3.måler, målPr: R3.målPr || 0, før, etter: { pr: R3.pr, bredde: c.width }, halvBredde,
        åpen, lukket: !boks.classList.contains('på'), knapp: (document.getElementById('vis-ytelse') || {}).textContent || '' }; });
    const ytmBakke = ytm.rader.find(x => x.del === 'bakke'), ytmok = ytm.rader.length >= 5 && ytm.rader[0].navn === 'Hele bildet' && ytm.rader[0].ms > 0 && ytm.rader[0].tri > 1000 && ytm.rader[1].navn === 'Med halv oppløsning'
      && !!ytmBakke && ytmBakke.tri > 1000 && /Grafikkort: /.test(ytm.tekst) && /ms\/bilde/.test(ytm.tekst) && ytm.skjult === 0 && ytm.kilder > 0 && !ytm.måler && !ytm.målPr && ytm.etter.pr === ytm.før.pr && ytm.etter.bredde === ytm.før.bredde
      && ytm.halvBredde > 0 && ytm.halvBredde < .7 * ytm.før.bredde && ytm.åpen && ytm.lukket && ytm.knapp === 'Mål ytelse';
    if (!ytmok) { feil++; console.log(JSON.stringify(ytm)); }

    console.log(`${ytmok ? 'ok  ' : 'FEIL'} ${navn} måling av ytelse: ${ytm.rader.length} målinger (hele bildet ${ytm.rader[0] ? Math.round(ytm.rader[0].ms) : '?'} ms, bakken ${ytmBakke ? ytmBakke.tri : '?'} trekanter), halv oppløsning ${ytm.halvBredde} av ${ytm.før.bredde} punkter i bredden, ${ytm.skjult} ting igjen på skjult lag, ${ytm.kilder} ting merket med kilde, boksen åpnet og lukket`);
    // «Mål hakk» (15. nov): pausene mellom bildene over en kort stund; rapporten har overskrift og antall bilder, og alt er som før etterpå
    const hk = await pg.evaluate(async () => { const r = await Ytelse.målHakk({ sek: 1.5, stille: true }); return { bilder: r ? r.bilder : 0, pauser: r ? r.pauser.length : -1, tekst: r ? r.tekst : '', måler: !!R3.måler, knapp: (document.getElementById('vis-hakk') || {}).textContent || '' }; });
    const hkok = hk.bilder >= 1 && hk.pauser >= 0 && /MÅLING AV HAKK/.test(hk.tekst) && /Bilder: /.test(hk.tekst) && !hk.måler && hk.knapp === 'Mål hakk';
    if (!hkok) { feil++; console.log(JSON.stringify(hk)); }
    console.log(`${hkok ? 'ok  ' : 'FEIL'} ${navn} måling av hakk: ${hk.bilder} bilder, ${hk.pauser} pauser over 50 ms, knappen «${hk.knapp}»`);
    // VAKT grafikk (spill/kvalitet.js, 12. nov, brukeren: «spillet går alt for hakkete»): «Lav» gir lavere pikseltetthet, kortere detaljavstand for
    // trærne og ingen gress/blomster; tilbake til auto etterpå
    const kv = await pg.evaluate(async () => { const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      KVAL.bytt('lav'); await vent(3); const lav = { pr: R3.pr, nivå: KVAL.nivå, tre: KVAL.p.tre, gress: !!(R3.gressMesh && R3.gressMesh.visible) };
      KVAL.bytt('auto'); await vent(2); const ut = { lav, auto: KVAL.valg, knapp: (document.getElementById('vis-grafikk') || {}).textContent || '' };
      // resten av testene kjører med høy grafikk (automatikken kan ellers gå ned et nivå underveis, og da måler ikke vaktene det samme hver gang)
      KVAL.bytt('høy'); await vent(1); return ut; });
    const kvok = kv.lav.nivå === 'lav' && kv.lav.pr <= .75 && kv.lav.tre < .5 && !kv.lav.gress && kv.auto === 'auto' && /Grafikk/.test(kv.knapp); if (!kvok) feil++;
    console.log(`${kvok ? 'ok  ' : 'FEIL'} ${navn} grafikk: lav gir pikseltetthet ${kv.lav.pr}, trær ×${kv.lav.tre}, gress ${kv.lav.gress}; knapp «${kv.knapp}»`);
    // VAKT fremmede skript (14. nov): et skript fra et annet nettsted som ikke lar seg laste (satt inn av en nettleserutvidelse), gir ingen
    // «Noe gikk galt»-melding; kommer det så gjentatte feil ved henting av kartdata, nevner meldingen nettstedet
    const fs2 = await pg.evaluate(async () => { skjulMelding(); const sk = document.createElement('script'); sk.src = 'https://fremmed.invalid/vendor.min.js'; document.head.appendChild(sk);
      await new Promise(r => { sk.onerror = r; setTimeout(r, 4000); }); await new Promise(r => setTimeout(r, 200));
      const stille = document.getElementById('feil').style.display !== 'block', husket = FREMMEDE.has('fremmed.invalid');
      for (let i = 0; i < 3; i++) visFeil(new Error('Failed to fetch (test)')); const tekst = document.getElementById('feilTekst').textContent;
      sk.remove(); FREMMEDE.clear(); skjulMelding(); return { stille, husket, nevnt: /fremmed\.invalid/.test(tekst) && /privat vindu/.test(tekst) }; });
    const fsok = fs2.stille && fs2.husket && fs2.nevnt; if (!fsok) feil++;
    console.log(`${fsok ? 'ok  ' : 'FEIL'} ${navn} fremmede skript: ingen feilmelding for skriptet (${fs2.stille}), nettstedet husket (${fs2.husket}) og nevnt når kartdata ikke kommer (${fs2.nevnt})`);
    // VAKT kompakt skjerm (spill/kompakt.js, 12. nov, brukeren: «Dette er ikke god nok UI» om iPhone på tvers): på mobil én rad status,
    // kildeteksten på én linje og fartsknappene som én knapp; på PC som før
    const ko = await pg.evaluate(() => { const k = Kompakt.sjekk(), h = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
      const synlige = ['sp1', 'sp2', 'sp3', 'sp4'].filter(id => { const e = document.getElementById(id); return e && e.offsetParent !== null; }).length;
      return { kort: k.kort, stats: h('.stats'), kilde: h('#kilde'), fart: synlige, mobil: VW < 900 }; });
    // VAKT ikoner (spill/ikoner.js, brukeren 17. nov: «har spillet gode ikoner?»): statuslinja har ikon på klokka og kassa, alle byggene
    // har et ikon som finnes, og ikonet tegnes (masken er satt) uten at teksten endres.
    const ik = await pg.evaluate(() => { if (!window.Ikoner) return { uten: true }; Ikoner.merk(); const d = document.getElementById('sDag').closest('.stats > div'), ut = { klokke: d.dataset.ikon === 'klokke', tekst: /\d/.test(document.getElementById('sDag').textContent) };
      ut.bygg = Object.keys(Leir.BYGG).filter(t => !Leir.BYGG[t].del && !(Ikoner.BYGG[t] && Ikoner.har(Ikoner.BYGG[t]))).join(); ut.maske = /url\(/.test(getComputedStyle(d, '::before').webkitMaskImage || getComputedStyle(d, '::before').maskImage || ''); ut.antall = Ikoner.navn().length; return ut; });
    const ikok = !ik.uten && ik.klokke && ik.tekst && ik.bygg === '' && ik.maske && ik.antall >= 35;
    if (!ikok) { feil++; console.log(JSON.stringify(ik)); }
    console.log(`${ikok ? 'ok  ' : 'FEIL'} ${navn} ikoner: ${ik.antall} ikoner, statuslinja og alle byggene har sitt, teksten står som før`);
    // VAKT samlet utseende (spill/tema.js, brukeren 17. nov: «ennå ikke bra nok UI»): på telefon viser loggen bare siste melding til du
    // trykker på den, og statuslinja har ikon i stedet for ord; overskriftene i Leir-menyen har ikke lenger forstavelser som «Byggelag:».
    const tm = await pg.evaluate(async () => { if (!window.Tema) return { uten: true }; const kort = document.body.classList.contains('kort'), L = document.getElementById('logg'), syn = () => [...L.children].filter(d => d.offsetParent !== null).length, ut = { kort };
      logg('Prøve en'); logg('Prøve to'); await new Promise(r => setTimeout(r, 60)); ut.en = syn(); if (kort) { L.click(); await new Promise(r => setTimeout(r, 60)); ut.flere = syn(); L.click(); }
      const ord = [...document.querySelectorAll('.stats > div > span:not([id])')].filter(e => e.offsetParent !== null).length; ut.ord = ord;
      const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (m && lk && !lk.hidden) { if (!m.classList.contains('på')) lk.click(); await new Promise(r => setTimeout(r, 200)); ut.h3 = [...m.querySelectorAll('h3')].map(h => h.textContent).filter(t => /^(Byggelag|Materialer|Mål): \S/.test(t) && !/^Byggelag: \d/.test(t)).join(); lk.click(); } else ut.h3 = '';
      return ut; });
    const tmok = !tm.uten && tm.h3 === '' && (tm.kort ? tm.en === 1 && tm.flere >= 2 && tm.ord === 0 : tm.en >= 2 && tm.ord > 0);
    if (!tmok) { feil++; console.log(JSON.stringify(tm)); }
    console.log(`${tmok ? 'ok  ' : 'FEIL'} ${navn} samlet utseende: ${tm.kort ? `loggen viser ${tm.en} melding og ${tm.flere} når du trykker, statuslinja uten ord` : `loggen viser ${tm.en} meldinger, statuslinja med ord`}, rene overskrifter i Leir-menyen`);
    // VAKT pause (brukeren 16. nov: pausen kunne ikke oppheves på telefon): pause skjuler ikke farten du hadde, viser ▶,
    // og både pauseknappen og fartsknappen starter spillet igjen i samme fart.
    const pa = await pg.evaluate(() => { const t0 = tempo, sp = id => document.getElementById(id), syn = () => ['sp1', 'sp2', 'sp3', 'sp4'].filter(id => sp(id).offsetParent !== null);
      sp('sp2').click(); const ut = { fart: tempo }; sp('sp0').click(); ut.pause = tempo; ut.tegn = sp('sp0').textContent; ut.synlig = syn().join();
      sp('sp0').click(); ut.videre = tempo; sp('sp0').click(); sp('sp2').click(); ut.knapp = tempo; ut.tegn2 = sp('sp0').textContent;
      sp(t0 === 0 ? 'sp0' : t0 === 10 ? 'sp2' : t0 === 60 ? 'sp3' : t0 === 600 ? 'sp4' : 'sp1').click(); if (t0 !== 0 && tempo === 0) sp('sp0').click(); return ut; });
    const paok = pa.fart === 10 && pa.pause === 0 && pa.tegn === '▶' && /sp2/.test(pa.synlig) && pa.videre === 10 && pa.knapp === 10 && pa.tegn2 === '❚❚';
    if (!paok) { feil++; console.log(JSON.stringify(pa)); }
    console.log(`${paok ? 'ok  ' : 'FEIL'} ${navn} pause: i pause vises ▶ og farten du hadde (${pa.synlig}); pauseknappen og fartsknappen starter igjen i 10×`);
    const kook = ko.mobil ? (ko.kort && ko.stats > 0 && ko.stats < 34 && ko.kilde < 22 && ko.fart === 1) : (!ko.kort && ko.fart === 4); if (!kook) feil++;
    console.log(`${kook ? 'ok  ' : 'FEIL'} ${navn} kompakt skjerm: ${ko.kort ? 'kompakt' : 'vanlig'}, statuslinja ${ko.stats} px, kildeteksten ${ko.kilde} px, ${ko.fart} fartsknapp(er) synlig`);
    // VAKT lyd (spill/lyd.js, 12. nov): lydmotoren starter (8 kanaler) og regner ut nivåer i 3D uten feil; ☰ har «Lyd»
    const ly = await pg.evaluate(async () => { Lyd.start(); await new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const s = Lyd.sjekk(); return { ...s, knapp: !!document.getElementById('vis-lyd') }; });
    const lyok = ly.startet && ly.kanaler >= 8 && ly.nivå && ly.nivå.vind > 0 && ly.knapp; if (!lyok) feil++;
    console.log(`${lyok ? 'ok  ' : 'FEIL'} ${navn} lyd: ${ly.kanaler} kanaler (${ly.tilstand}), vind ${ly.nivå && ly.nivå.vind != null ? ly.nivå.vind.toFixed(2) : '–'}, fugler ${ly.nivå && ly.nivå.fugler != null ? ly.nivå.fugler.toFixed(2) : '–'}, ☰-knapp ${ly.knapp}`);
    // VAKT ferjer og kjølvann (spill/ferje3d.js): Dovre har ingen ferjekai, så ingen ferjer; et kunstig kjølvann (en båt som kjører 120 m)
    // tegnes i scenen uten GL-feil og forsvinner igjen. Reglene (rutefart, venting, snu) testes i test_ferje.js.
    const fe = await pg.evaluate(async () => { const gl = R3.renderer.getContext(); gl.getError(); const vent = async n => { for (let i = 0; i < n; i++) { tegn3d(); await new Promise(r => setTimeout(r, 90)); } };
      if (!window.Ferje3d || !window.Kjølvann || !window.Ferje) return { mangler: true };
      // sporet lever 10 min (tregt i swiftshader); et nytt utsnitt (sett3d) tømmer sporene: vent til byggingen er ferdig, og prøv igjen om det skjedde underveis
      let n = 0;
      for (let forsøk = 0; forsøk < 4 && n <= 20; forsøk++) { while (R3.bygger) await new Promise(r => setTimeout(r, 200));
        const s = Kjølvann.nyttSpor(4, 600), nå = Kjølvann.nå(), z = (hoyde3d(R3.ut.cx, R3.ut.cy) - R3.ut.h0) * R3.EX + .3;
        for (let i = 0; i <= 40; i++) Kjølvann.flytt(s, i * 3, 0, z, 4, nå - 6 + i * .15);
        await vent(4); n = Kjølvann.antall(); }
      const iScene = !!(Ferje3d.KV.mesh && Ferje3d.KV.mesh.parent), glFeil = gl.getError();
      Ferje3d.KV.spor = []; await vent(3); return { ...Ferje3d.sjekk(), n, iScene, glFeil, etter: Kjølvann.antall() }; });
    const feok = !fe.mangler && fe.ferjer === 0 && fe.n > 20 && fe.iScene && fe.glFeil === 0 && fe.etter === 0; if (!feok) feil++;
    console.log(`${feok ? 'ok  ' : 'FEIL'} ${navn} ferjer og kjølvann: ${fe.mangler ? 'modulene mangler' : `${fe.ferjer} ferjer (ingen kai på Dovre), kjølvann ${fe.n} firkanter i scenen ${fe.iScene}, borte etterpå ${fe.etter === 0}, GL-feil ${fe.glFeil}`}`);
    const d3 = await pg.evaluate(() => ({ h: Math.round(hoyde3d(203188, 6922980)), n: R3.ut.N, bilder: R3.renderer.info.render.frame, trekanter: R3.renderer.info.render.triangles }));
    // filtre i 3D (spill/filtre.js): hvert filter tegner uten GL-feil, bildet er ikke svart, tellerne gjelder fortsatt scenen; tilbake til «Ingen»
    const fil = await pg.evaluate(() => { const gl = R3.renderer.getContext(), ut = []; gl.getError();
      for (const { id } of Filtre.liste) { Filtre.velg(id); tegn3d(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, p = new Uint8Array(4); let sum = 0, ulike = new Set();
        for (let i = 1; i < 8; i++) for (let j = 1; j < 8; j++) { gl.readPixels(Math.floor(W * i / 8), Math.floor(H * j / 8), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); sum += p[0] + p[1] + p[2]; ulike.add(p[0] + ',' + p[1] + ',' + p[2]); }
        ut.push({ id, lys: Math.round(sum / 49 / 3), ulike: ulike.size, glFeil: gl.getError(), trekanter: R3.renderer.info.render.triangles }); }
      Filtre.velg('ingen'); return { ut, dybde: Filtre.harDybde() }; });
    const filok = fil.ut.length === 11 && fil.ut.every(f => f.lys > 8 && f.ulike > 3 && f.glFeil === 0 && f.trekanter > 1000); if (!filok) { feil++; console.log(JSON.stringify(fil)); }
    console.log(`${filok ? 'ok  ' : 'FEIL'} ${navn} filtre i 3D: ${fil.ut.map(f => f.id + ' ' + f.lys).join(', ')} (lysstyrke 0–255), dybdetekstur: ${fil.dybde}`);
    // førsteperson: «Gå», hold W et sekund, kameraet står i øyehøyde og har flyttet seg; Esc flyr opp igjen
    await pg.click('#gaaknapp'); const f0 = await pg.evaluate(() => ({ på: !!R3.fot, x: R3.bane.x, y: R3.bane.y, iHus: hindring3d(R3.bane.x, R3.bane.y) }));
    // hold W til du har gått et stykke (myk start: på trege maskiner tar det flere rammer), høyst 8 s
    await pg.keyboard.down('w'); await pg.waitForFunction(f0 => Math.hypot(R3.bane.x - f0.x, R3.bane.y - f0.y) > .6, f0, { timeout: 8000 }).catch(() => {}); await pg.keyboard.up('w');
    const f1 = await pg.evaluate(() => { const c = R3.cam.position, u = R3.ut; return { x: R3.bane.x, y: R3.bane.y, over: c.z - (hoyde3d(u.cx + c.x, u.cy + c.y) - u.h0) * R3.EX }; });
    const kol = await pg.evaluate(() => { const P = R3.ut.hus && R3.ut.hus.omriss && R3.ut.hus.omriss[0]; if (!P) return null; const x = P.reduce((a, p) => a + p[0], 0) / P.length, y = P.reduce((a, p) => a + p[1], 0) / P.length; return { inne: hindring3d(x, y), ute: hindring3d(x + 500, y + 500) }; });
    if (kol && (!kol.inne || kol.ute)) { feil++; console.log(`FEIL ${navn} kollisjon: inne i hus ${kol.inne}, ute ${kol.ute}`); }
    // bedre bevegelse: hopp med mellomrom, løp med Shift (spill/bevegelse.js)
    await pg.keyboard.press(' '); const hopp = await pg.waitForFunction(() => { const k = Gange.kropp(); return k && !k.bakke && k.vz < 3; }, null, { timeout: 8000, polling: 'raf' }).then(() => true).catch(() => false);
    await pg.waitForFunction(() => Gange.kropp().bakke, null, { timeout: 8000 }).catch(() => {});
    await pg.keyboard.down('Shift'); await pg.keyboard.down('w'); const løp = await pg.waitForFunction(() => Gange.kropp().løper && Gange.kropp().fart > 2.5, null, { timeout: 8000, polling: 'raf' }).then(() => true).catch(() => false);
    await pg.keyboard.up('w'); await pg.keyboard.up('Shift');
    await pg.keyboard.press('Escape'); const f2 = await pg.evaluate(() => !!R3.fot);
    const gå = Math.hypot(f1.x - f0.x, f1.y - f0.y), fok = f0.på && !f0.iHus && gå > .3 && Math.abs(f1.over - 1.7) < .3 && !f2 && hopp && løp; if (!fok) feil++;
    console.log(`${fok ? 'ok  ' : 'FEIL'} ${navn} gå selv: gikk ${gå.toFixed(1)} m med W, øyehøyde ${f1.over.toFixed(2)} m, hopp: ${hopp}, løp: ${løp}, Esc flyr opp: ${!f2}, startet i hus: ${f0.iHus}`);
    // VAKT: navn bak en ås skjules (bakÅs): et punkt 60 m under terrenget 500 m unna er skjult, et punkt 300 m over er ikke det
    const ås = await pg.evaluate(() => { const c = R3.cam.position, u = R3.ut, z0 = c.z, x = c.x + 500, y = c.y, b = (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R3.EX;
      // kameraet settes et øyeblikk 20 m over bakken (som når du går), så settes det tilbake
      c.z = (hoyde3d(c.x + u.cx, c.y + u.cy) - u.h0) * R3.EX + 20;
      const r = { under: bakÅs(new THREE.Vector3(x, y, b - 60)), over: bakÅs(new THREE.Vector3(x, y, Math.max(b, c.z) + 300)) }; c.z = z0; return r; });
    if (!ås.under || ås.over) { feil++; console.log(`FEIL ${navn} navn bak ås: under ${ås.under}, over ${ås.over}`); }
    // VAKT mot rare ting i 3D (10. nov): et utsnitt i Dombås, ingen steiner/busker/trær/biler/lykter inne i hus, ingenting svever eller er begravd
    const rart = await pg.evaluate(async () => { while (R3.bygger) await new Promise(r => setTimeout(r, 100)); const u = await bygg3d(193300, 6896300, 900); window.KRAFT_SJEKK = window.Kraft3d ? Kraft3d.sjekk(u) : null; window.HUS_SJEKK = u.hus && u.hus.stat; window.GATE_TRI = window.Gate3d ? Gate3d.trekanter(u) : null;
      // VAKT veger i 3D (spill/veg.js, 13. nov): gang- og sykkelvegene er skilt ut, bilvegene ligger ikke oppå hverandre (utenom kryssene),
      // ingen gatelys står i en vegbane, og veger som krysser en elv uten bru i dataene har fått en nødbru
      window.VEG_SJEKK = (() => { if (!window.Veg || !u.veger) return null;
        const ru = Veg.rute(u.veger), kr = Veg.finnKryss(u.veger); let n = 0, dobbel = 0, iBane = 0;
        u.veger.forEach((v, li) => { if (!Veg.vanlig(v) || !'ERFK'.includes(v.k)) return; const L = Veg.lengde(v.P); let d = 0;
          for (let i = 1; i < v.P.length; i++) { d += Math.hypot(v.P[i][0] - v.P[i - 1][0], v.P[i][1] - v.P[i - 1][1]); if (d < 15 || d > L - 15 || kr.nær(v.P[i][0], v.P[i][1], 12)) continue;
            n++; if (ru.klaring(v.P[i][0], v.P[i][1], li) < v.w - .5) dobbel++; } });
        if (u.lys) for (let q = 0; q < u.lys.length; q += 4) if (ru.klaring(u.lys[q], u.lys[q + 1], -1) < -.3) iBane++;
        // rundkjøringen i Dombås (14. nov): funnet, ringen er merket (t = 3), og ingen lykter står inne i ringen
        const rk = (u.rundt || [])[0]; let iRing = 0; if (rk && u.lys) for (let q = 0; q < u.lys.length; q += 4) if (Math.hypot(u.lys[q] - rk.x, u.lys[q + 1] - rk.y) < rk.r + rk.w) iRing++;
        return { vegtype: !!u.vegtype, bil: u.veger.length, gang: (u.gangveger || []).length, punkter: n, dobbel, lykterIBanen: iBane, nødbruer: (u.bruer3d || []).filter(m => m.nød).length,
          rundkjøringer: (u.rundt || []).length, ringbiter: u.veger.filter(v => v.t === 3).length, lykterIRingen: iRing }; })();
      let tb = 0; if (u.påBane && u.trær) for (const k in u.trær) for (let q = 0; q < u.trær[k].length; q += 5) if (u.påBane(u.trær[k][q], u.trær[k][q + 1])) tb++;
      let gj = 0; if (u.påBane && u.gard) for (const B of u.gard.biter) for (let q = 0; q < B.length; q += 6) if (u.påBane(B[q], B[q + 1])) gj++;
      window.BANE_SJEKK = { lag: !!(LAGFILER && LAGFILER.utveg), n: (u.baner || []).length, el: (u.baner || []).filter(b => b.el).length, trær: tb, gjerder: gj }; return Vakt3d.sjekk(u); });
    // VAKT materialer fra verden i 3D (spill/ressurser-visning.js): et hogstfelt (40 m) legges der skogen i Dombås-utsnittet over er tettest; etter
    // krok3d har feltet ingen trær, men stubber, og skog rundt; et revet hus (HUS_BORT) er borte fra hus3d, og ruinen lages
    const rs3 = await pg.evaluate(async () => { const u = RessursSpill.sisteU(193300, 6896300), ut = { inne: 0, rundt: 0 }; if (!u || !u.trær) return ut;
      const alle = []; for (const k in u.trær) for (let q = 0; q < u.trær[k].length; q += 5) alle.push([u.trær[k][q], u.trær[k][q + 1]]);
      let p = null, best = 0; for (let n = 0; n < alle.length; n += Math.max(1, Math.floor(alle.length / 400))) { const [x, y] = alle[n]; let c = 0; for (const [a, b] of alle) if (Math.abs(a - x) < 40 && Math.abs(b - y) < 40) c++; if (c > best) { best = c; p = [x + u.cx, y + u.cy]; } }
      const R0 = Ressurser.ny(); R0.hogd.push({ x: p[0], y: p[1], r: 40 }); RessursSpill.sett(R0); await RessursSpill.krok3d(u, {}); ut.stubber = u.stubber.length / 3;
      for (const k in u.trær) for (let q = 0; q < u.trær[k].length; q += 5) { const d = Math.hypot(u.trær[k][q] + u.cx - p[0], u.trær[k][q + 1] + u.cy - p[1]); if (d < 31) ut.inne++; else if (d > 44 && d < 80) ut.rundt++; }
      // hus3d med to oppdiktede hus i flisen midt i utsnittet; det ene er revet
      const z = 13, sp = span(z), fx = Math.floor((u.cx - G.x0) / sp), fy = Math.floor((G.y0 - u.cy) / sp), k = 4096 / sp, lx = (u.cx - (G.x0 + fx * sp)) * k, ly = ((G.y0 - fy * sp) - u.cy) * k;
      const hus = n => ({ e: { i: 998000 + n, t: 0, h: 6 }, deler: [[[lx + n * 30 * k, ly], [lx + (n * 30 + 12) * k, ly], [lx + (n * 30 + 12) * k, ly + 10 * k], [lx + n * 30 * k, ly + 10 * k], [lx + n * 30 * k, ly]]] });
      const ekte = window.hentFlis, R = RessursSpill.tilstand(); R.revet.push({ i: 998001, P: [[u.cx + 30, u.cy], [u.cx + 42, u.cy], [u.cx + 42, u.cy - 10], [u.cx + 30, u.cy - 10]], gruppe: 'betong' }); RessursSpill.sett(R);
      window.hentFlis = (lag, zz, x, y) => lag === 'hus' ? Promise.resolve(zz === z && x === fx && y === fy ? { hus: { obj: [hus(0), hus(1)] } } : null) : ekte(lag, zz, x, y);
      try { const h = await hus3d(u); ut.hus = h ? h.omriss.length : -1; } finally { window.hentFlis = ekte; }
      ut.ruin = RessursSpill.ruinTrekanter(u); RessursSpill.sett(Ressurser.ny()); return ut; });
    const rs3ok = rs3.inne === 0 && rs3.rundt > 0 && rs3.stubber > 0 && rs3.hus === 1 && rs3.ruin > 50; if (!rs3ok) feil++;
    console.log(`${rs3ok ? 'ok  ' : 'FEIL'} ${navn} hogst og riving i 3D: trær i det hogde feltet ${rs3.inne}, rundt ${rs3.rundt}, stubber ${rs3.stubber}; hus igjen av to (ett revet) ${rs3.hus}, ruin ${rs3.ruin} trekanter`);
    // VAKT jernbane i 3D (spill/bane3d.js): Dovrebanen/Raumabanen finnes i Dombås-utsnittet (når utveg-flisene er lastet), er elektrisk og har ingen trær eller gjerder på sporet
    const vs = await pg.evaluate(() => window.VEG_SJEKK), vok = vs && vs.vegtype && vs.gang > 0 && vs.punkter > 200 && vs.dobbel <= vs.punkter * .02 && vs.lykterIBanen === 0 && vs.rundkjøringer >= 1 && vs.ringbiter >= 3 && vs.lykterIRingen === 0; if (!vok) feil++;
    console.log(`${vok ? 'ok  ' : 'FEIL'} ${navn} veger i 3D: ${JSON.stringify(vs)}`);
    const bs = await pg.evaluate(() => window.BANE_SJEKK), bok = bs && (!bs.lag || (bs.n > 0 && bs.el > 0 && bs.trær === 0 && bs.gjerder === 0)); if (!bok) feil++;
    console.log(`${bok ? 'ok  ' : 'FEIL'} ${navn} jernbane i 3D: ${JSON.stringify(bs)}`);
    const sum = o => Object.values(o).reduce((a, b) => a + b, 0), rok = rart.antall.stein > 0 && sum(rart.iHus) <= 2 && sum(rart.svever) <= 2; if (!rok) feil++;
    console.log(`${rok ? 'ok  ' : 'FEIL'} ${navn} 3D uten rare ting: antall ${JSON.stringify(rart.antall)}, i hus ${JSON.stringify(rart.iHus)}, svever/begravd ${JSON.stringify(rart.svever)}${rok ? '' : ' ' + JSON.stringify(rart.eksempel)}`);
    // VAKT kulturlandskapet (spill/gard3d.js): Dombås-utsnittet har gjerder og rundballer på innmarka (i hus/svever telles over)
    const gard = ['rundball', 'gjerde', 'skigard', 'steingjerde'].map(k => rart.antall[k] || 0), gok = gard[0] > 0 && gard[1] + gard[2] + gard[3] > 20; if (!gok) feil++;
    console.log(`${gok ? 'ok  ' : 'FEIL'} ${navn} kulturlandskap: rundballer ${gard[0]}, gjerdebiter ${gard.slice(1).join('/')}`);
    // VAKT gatemøbler (spill/gate3d.js): Dombås sentrum har benker, søppelkasser og minst ett busskur; ingen gatemøbler i hus eller svevende,
    // og modellene i utsnittet holder seg under 60 000 trekanter
    const gs = ['benk', 'søppel', 'sykkel', 'skur', 'skilt', 'postkasse'], gtri = await pg.evaluate(() => window.GATE_TRI);
    const gfeil = gs.reduce((a, k) => a + (rart.iHus[k] || 0) + (rart.svever[k] || 0), 0), gmok = (rart.antall.benk || 0) > 0 && (rart.antall['søppel'] || 0) > 0 && (rart.antall.skur || 0) >= 1 && gfeil === 0 && gtri > 0 && gtri < 60000;
    if (!gmok) feil++;
    console.log(`${gmok ? 'ok  ' : 'FEIL'} ${navn} gatemøbler: ${gs.map(k => k + ' ' + (rart.antall[k] || 0)).join(', ')}; i hus/svever ${gfeil}; trekanter ${Math.round(gtri)}${gmok ? '' : ' ' + JSON.stringify(rart.eksempel)}`);
    // VAKT byhus (spill/byhus.js, hus3d): Dombås-utsnittet har bygg, alle har tak, minst fem ulike fasader (minst én fra Byhus), noen valm/mansard,
    // og alle Byhus-teksturene har vindusglass som natt3d.js kan tenne (blåere enn rødt)
    // Uten byggomrissene (testserveren har ikke releasen) lages et oppdiktet sentrum med 64 bygg av ulike typer i flisen midt i utsnittet.
    const hs = await pg.evaluate(async () => { let s = window.HUS_SJEKK; const glass = {};
      if (!s && R3.ut) { const u = R3.ut, z = 13, sp = span(z), fx = Math.floor((u.cx - G.x0) / sp), fy = Math.floor((G.y0 - u.cy) / sp), k = 4096 / sp, obj = [];
        const lx = (u.cx - (G.x0 + fx * sp)) * k, ly = ((G.y0 - fy * sp) - u.cy) * k, T = [[10, 18], [2, 14], [7, 12], [0, 6], [10, 22], [5, 20], [3, 15], [2, 40]];
        for (let j = 0; j < 8; j++) for (let q = 0; q < 8; q++) { const n = j * 8 + q, [t, h] = T[n % 8], x0 = lx + (q - 4) * 26 * k, y0 = ly + (j - 4) * 26 * k, w = (14 + (n % 3) * 4) * k, d = (11 + (n % 2) * 5) * k;
          const R = n % 5 === 4 ? [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d / 2], [x0 + w / 2, y0 + d / 2], [x0 + w / 2, y0 + d], [x0, y0 + d], [x0, y0]] : [[x0, y0], [x0 + w, y0], [x0 + w, y0 + d], [x0, y0 + d], [x0, y0]];
          obj.push({ e: { i: 900000 + n * 7919, t, h }, deler: [R] }); }
        const ekte = window.hentFlis; window.hentFlis = (lag, zz, x, y) => lag === 'hus' ? Promise.resolve(zz === z && x === fx && y === fy ? { hus: { obj } } : null) : ekte(lag, zz, x, y);
        try { const r = await hus3d(u); s = r && r.stat; } finally { window.hentFlis = ekte; } }

      for (const n of Byhus.FASADER) { const c = Byhus.tekstur(n).image, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for (let q = 0; q < d.length; q += 4) if (d[q + 2] - d[q] > 10 && d[q] < 158) k++; glass[n] = Math.round(k / (d.length / 4) * 100); }
      return { s, glass }; });
    const hfas = hs.s ? Object.keys(hs.s.fasader) : [], hok = hs.s && hs.s.bygg >= 50 && (hs.s.tak.valm || 0) + (hs.s.tak.mansard || 0) > 0 && hs.s.utenTak === 0 && hfas.length >= 5 && hfas.some(n => ['murgard', 'tegl', 'funkis', 'plate'].includes(n)) && Object.values(hs.glass).every(v => v >= 3);
    if (!hok) feil++;
    console.log(`${hok ? 'ok  ' : 'FEIL'} ${navn} byhus: ${hs.s && hs.s.bygg} bygg, uten tak ${hs.s && hs.s.utenTak}, fasader ${JSON.stringify(hs.s && hs.s.fasader)}, tak ${JSON.stringify(hs.s && hs.s.tak)}, glass i teksturene (%) ${JSON.stringify(hs.glass)}`);
    // VAKT ☰-menyen (spill/meny.js, brukeren 16. nov: «forbedre menyene»): knappene står i grupper med overskrift, av/på-knappene er
    // brytere som virker, valgene har samme tekst som før («Navn: verdi»), og menyen lukkes med Esc.
    const mny = await pg.evaluate(async () => { const m = document.getElementById('lagmeny'), åpner = document.getElementById('meny'); if (!m.classList.contains('på')) åpner.click();
      const alle = [...m.querySelectorAll('button')].filter(b => !b.closest('.mtopp')), sk = [...m.querySelectorAll('section button.bryter')].find(b => b.textContent === 'Skygge'), før = VIS.skygge;
      sk.click(); const av = sk.classList.contains('av') && VIS.skygge === !før; sk.click();
      const ut = { grupper: m.querySelectorAll('section h3').length, løse: alle.filter(b => !b.closest('section') && !b.classList.contains('fare')).length, brytere: m.querySelectorAll('button.bryter').length,
        valg: [...m.querySelectorAll('button.valg')].map(b => b.textContent), bryter: av && VIS.skygge === før, bredde: m.getBoundingClientRect().right <= innerWidth + 1 };
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); ut.lukket = !m.classList.contains('på'); return ut; });
    const mnyok = mny.grupper >= 4 && mny.løse === 0 && mny.brytere >= 10 && mny.valg.length >= 3 && mny.valg.every(t => /^[^:]+: .+/.test(t)) && mny.bryter && mny.bredde && mny.lukket;
    if (!mnyok) { feil++; console.log(JSON.stringify(mny)); }
    console.log(`${mnyok ? 'ok  ' : 'FEIL'} ${navn} ☰-menyen: ${mny.grupper} grupper, ${mny.brytere} brytere, ${mny.valg.length} valg («${mny.valg[0]}»), bryteren virker, Esc lukker`);
    // VAKT hurtigtaster (spill/taster.js): M åpner og lukker ☰, H hjelpen, P pause og tilbake – ikke mens du skriver i et felt
    const tst = await pg.evaluate(async () => { const tast = (k, mål) => (mål || window).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })), på = id => document.getElementById(id).classList.contains('på');
      const ut = {}, t0 = tempo; if (på('lagmeny')) document.getElementById('meny').click();
      tast('m'); ut.åpen = på('lagmeny'); tast('m'); ut.lukket = !på('lagmeny');
      tast('h'); ut.hjelp = på('hjelp'); tast('h'); ut.hjelpLukket = !på('hjelp');
      tempo = 1; document.getElementById('sp1').click(); const tFør = tempo; tast('p'); ut.pause = tempo === 0; tast('p'); ut.igjen = tempo === tFør && tFør > 0;
      const felt = document.createElement('input'); document.body.appendChild(felt); felt.focus(); tast('m', felt); ut.felt = !på('lagmeny'); felt.remove();
      ut.tittel = /tast M/.test(document.getElementById('meny').title); tempo = t0; return ut; });
    const tstok = tst.åpen && tst.lukket && tst.hjelp && tst.hjelpLukket && tst.pause && tst.igjen && tst.felt && tst.tittel;
    if (!tstok) { feil++; console.log(JSON.stringify(tst)); }
    console.log(`${tstok ? 'ok  ' : 'FEIL'} ${navn} hurtigtaster: M åpner og lukker innstillingene, H hjelpen, P pause og videre, ikke i tekstfelt, tasten står i hjelpeteksten`);
    // VAKT Leir-menyen og målene (leir-visning.js, spill/maal.js; brukeren 16. nov): status som fliser, fanene Bygg/Lager/Plan/Mål
    // viser bare sitt eget, «Neste mål» står over fanene, og et mål som nås, hakes av og huskes.
    const leirm = await pg.evaluate(async () => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L) return { uten: true };
      const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (!m.classList.contains('på')) lk.click();
      MaalSpill.start(); MaalSpill.nullstill(); LeirSpill.fane('bygg'); const synlig = sel => [...m.querySelectorAll(sel)].filter(e => e.offsetParent !== null).length;
      const ut = { fliser: m.querySelectorAll('.status .flis').length, faner: [...m.querySelectorAll('.faner button')].map(b => b.textContent), bygg: synlig('.liste .bygg'), matIBygg: synlig('.mat span') };
      ut.over = !!m.querySelector('.nestemaal') && !!(m.querySelector('.nestemaal').compareDocumentPosition(m.querySelector('.faner')) & Node.DOCUMENT_POSITION_FOLLOWING);
      LeirSpill.fane('lager'); ut.lager = { bygg: synlig('.liste .bygg'), mat: synlig('.mat span'), diesel: synlig('#kjopdiesel') };
      LeirSpill.fane('mål'); ut.mål = { kap: synlig('.maalkap'), mål: synlig('.maal'), bygg: synlig('.liste .bygg') };
      // et mål nås: 25 m³ tre på lageret
      const tre = L.lager.tre; L.lager.tre = 25; const nye = MaalSpill.sjekk(true); L.lager.tre = tre; LeirSpill.fane('mål'); ut.nye = nye.join(); ut.haket = synlig('.maal.ok'); ut.kort = MaalSpill.kort();
      ut.husket = JSON.parse(localStorage.getItem('riksbrudd-maal')).ferdige.join(); MaalSpill.nullstill();
      // DAGBOKA (spill/dagbok.js): når et døgn er gått, kommer morgenrapporten i loggen og nederst i fanen Mål
      const t0 = tid; DagbokSpill.start(); DagbokSpill.tilstand().dag = Dagbok.dag(tid); tid = t0 + 1440; sim(.001); tid = t0; LeirSpill.fane('mål');
      ut.dagbok = { logg: loggLinjer.find(l => /Dag \d+: \d+ person/.test(l)) || '', iMeny: synlig('.dagbok') }; DagbokSpill.tilstand().dag = Dagbok.dag(tid);
      LeirSpill.fane('bygg'); lk.click(); return ut; });
    const leirmok = !leirm.uten && leirm.fliser === 4 && leirm.faner.length === 4 && /^Mål/.test(leirm.faner[3]) && leirm.bygg > 5 && leirm.matIBygg === 0 && leirm.over && leirm.lager.bygg === 0 && leirm.lager.mat >= 3 && leirm.lager.diesel === 1
      && leirm.mål.kap === 4 && leirm.mål.mål === 14 && leirm.mål.bygg === 0 && leirm.nye.split(',').includes('lager') && leirm.haket === leirm.nye.split(',').length && leirm.kort === leirm.haket + '/14' && leirm.husket === leirm.nye && !!leirm.dagbok.logg && leirm.dagbok.iMeny >= 1;
    if (!leirmok) { feil++; console.log(JSON.stringify(leirm)); }
    console.log(`${leirmok ? 'ok  ' : 'FEIL'} ${navn} Leir-menyen og målene: fanene ${(leirm.faner || []).join(' | ')}, hver viser sitt, «Neste mål» over fanene, et nådd mål hakes av og huskes; dagboka: «${(leirm.dagbok || {}).logg || ''}»`);
    // VAKT interiør (spill/interior.js, interior3d.js; brukeren 15. nov: «Alle bygg skal ha interiør, og en skal kunne gå inn i dem»):
    // et prøvehus (10 × 8 m, dør midt på sørveggen) legges i utsnittet. Når du går, får det interiør med flere rom og møbler; du kan
    // gå inn gjennom døra og står da på gulvet, ytterveggen stopper deg ved siden av døra, og alt ryddes bort når du flyr opp.
    const inn = await pg.evaluate(async () => { while (R3.bygger) await new Promise(r => setTimeout(r, 100)); const u = R3.ut, R = R3, gl = R.renderer.getContext();
      const x0 = 40, y0 = 60, P = [[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8]]; P.bygg = { i: 4242, t: 0, h: 6, kl: 'hus' };
      P.dør = { x: x0 + 5, y: y0, ux: 1, uy: 0, w: 1, hh: 2.1, z0: (hoyde3d(u.cx + x0 + 5, u.cy + y0 + 4, u) - u.h0) * R.EX };
      const husFør = u.hus, o = { P }, nøkler = []; if (!u.hus) u.hus = { omriss: [] };
      for (let a = Math.floor(x0 / 20); a <= Math.floor((x0 + 10) / 20); a++) for (let c = Math.floor(y0 / 20); c <= Math.floor((y0 + 8) / 20); c++) { const k = a + ',' + c; if (!R.hindre.has(k)) R.hindre.set(k, []); R.hindre.get(k).push(o); nøkler.push(k); }
      const g0 = R.renderer.info.memory.geometries, ut = { utenGå: (Interior3d.oppdater(true), Interior3d.antall()) };
      Gange.start(); const sett = (x, y, a) => { R.bane.x = x; R.bane.y = y; const k = Gange.kropp(); k.x = x; k.y = y; k.vx = k.vy = 0; k.z = (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX; R.fot.a = a; R.fot.pitch = 0; };
      sett(x0 + 5, y0 - 5, 0); for (let i = 0; i < 12; i++) Interior3d.oppdater(true);
      const pl = P.inne; ut.plan = !!pl; if (pl) { ut.rom = pl.rom.length; ut.møbler = pl.møbler.length; ut.gulv = pl.gulv; if (window.LeteSpill) { const lt = LeteSpill.lett(), hadde = lt.has(P.bygg.i); lt.delete(P.bygg.i); Interior3d.oppdater(true); ut.kasse = Interior3d.funn(P) === true; lt.set(P.bygg.i, null); Interior3d.oppdater(true); ut.kasseBorte = Interior3d.funn(P) === false; if (!hadde) lt.delete(P.bygg.i); Interior3d.oppdater(true); } else ut.kasse = ut.kasseBorte = true; ut.trekanter = Interior3d.sjekk().find(q => q.rom === pl.rom.length).trekanter;
        ut.vegg = hindring3d(x0 + 8, y0) && hindring3d(x0, y0 + 4) && !hindring3d(x0 + 5, y0) && !hindring3d(x0 + 5, y0 + .7);
        // gå inn (W holdes, tiden spoles) – og gå mot veggen ved siden av døra
        const ekte = performance.now.bind(performance); let t = ekte(); performance.now = () => (t += 25);
        try { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); for (let i = 0; i < 400; i++) Gange.kamera(R); const k = Gange.kropp(); ut.inne = !!Interior3d.inne(k.x, k.y); ut.påGulv = Math.abs(k.z - pl.gulv) < .02; ut.y = k.y - y0;
          sett(x0 + 8, y0 - 4, 0); for (let i = 0; i < 400; i++) Gange.kamera(R); ut.stoppet = Gange.kropp().y < y0; }
        finally { performance.now = ekte; window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })); } }
      // LETING (spill/leting.js): inne i prøvehuset kommer knappen; etter letingen er huset gjennomsøkt, funnet ligger i leiren og
      // knappen er borte. (Bare når et spill er startet, så det finnes en leir å legge funnet i.)
      if (pl && window.LeirSpill && LeirSpill.tilstand()) { const Ll = LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), kn = document.getElementById('letknapp');
        LeteSpill.start(); LeteSpill.nullstill(); sett(x0 + 5, y0 + 3, 0); for (let i = 0; i < 3; i++) KROKER.ramme3d.forEach(f => f(R));
        const før = { mat: F ? F.mat : 0, tre: Ll.lager.tre || 0, d: Ll.drivstoff || 0 }, venter = Leting.funn('hus', 80, 4242);
        ut.let = { knapp: kn.classList.contains('på'), tekst: kn.textContent }; kn.click(); KROKER.ramme3d.forEach(f => f(R)); ut.let.leter = /Leter/.test(kn.textContent);
        LeteSpill.spol(); KROKER.ramme3d.forEach(f => f(R)); KROKER.ramme3d.forEach(f => f(R));
        ut.let.antall = LeteSpill.antall(); ut.let.borte = !kn.classList.contains('på'); ut.let.mat = (F ? F.mat : 0) - før.mat; ut.let.venter = venter; ut.let.logg = loggLinjer.find(l => /^Du fant|^Huset var tomt/.test(l)) || '';
        LeteSpill.nullstill(); }
      R.renderer.render(R.scene, R.cam); ut.gl = gl.getError();
      Gange.stopp(); Interior3d.oppdater(true); ut.etter = Interior3d.antall(); ut.ryddet = !P.inne; ut.geo = R.renderer.info.memory.geometries - g0;
      for (const k of nøkler) { const L = R.hindre.get(k), i = L.indexOf(o); if (i >= 0) L.splice(i, 1); } u.hus = husFør; return ut; });
    const innok = inn.utenGå === 0 && inn.plan && inn.rom >= 4 && inn.møbler >= 8 && inn.vegg && inn.inne && inn.påGulv && inn.y > 1 && inn.stoppet && inn.gl === 0 && inn.etter === 0 && inn.ryddet && inn.geo === 0 && inn.trekanter < 9000 && inn.kasse && inn.kasseBorte;
    const letok = !inn.let || (inn.let.knapp && /Let gjennom huset/.test(inn.let.tekst) && inn.let.leter && inn.let.antall === 1 && inn.let.borte && !!inn.let.logg && Math.abs(inn.let.mat - inn.let.venter.mat) < 1e-6);
    if (!letok) { feil++; console.log(JSON.stringify(inn.let)); }
    console.log(`${letok ? 'ok  ' : 'FEIL'} ${navn} leting i hus: ${inn.let ? `knappen kom inne i huset, letingen ga «${inn.let.logg}», huset er gjennomsøkt og knappen borte` : 'ikke prøvd (ingen leir i testen)'}`);
    if (!innok) { feil++; console.log(JSON.stringify(inn)); }
    console.log(`${innok ? 'ok  ' : 'FEIL'} ${navn} interiør: prøvehuset fikk ${inn.rom} rom og ${inn.møbler} møbler (${inn.trekanter} trekanter), du går inn gjennom døra og står på gulvet, veggen stopper deg, ryddet bort etterpå`);
    // VAKT interiør i leirens bygg (interior3d.js LEIRBYGG; 16. nov: «alle bygg» gjelder også leiren): en ferdig brakke ved kameraet
    // blir registrert, veggen stopper deg, den får køyesenger når du går nær, du står på gulvet inne, og «Let» tilbys ikke der.
    const lb = await pg.evaluate(async () => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L) return { uten: true }; while (R3.bygger) await new Promise(r => setTimeout(r, 100));
      const u = R3.ut, R = R3, ny = { id: L.neste++, type: 'brakke', x: u.cx + 120, y: u.cy - 90, ret: .5, igjen: 0, totalt: 60, pris: 0, mat: {}, nivå: 1, hp: 1, nr: L.nesteJobb++, arbeid: null }; L.bygg.push(ny);
      Gange.start(); const sett = (x, y, a) => { R.bane.x = x; R.bane.y = y; const k = Gange.kropp(); k.x = x; k.y = y; k.vx = k.vy = 0; k.z = (hoyde3d(u.cx + x, u.cy + y, u) - u.h0) * R.EX; R.fot.a = a; R.fot.pitch = 0; };
      Interior3d.oppdater(true); const e = Interior3d.egne().find(q => q.P.bygg.i === 9000000 + ny.id), ut = { registrert: !!e };
      if (e) { const P = e.P, D = P.dør, nx = D.uy, ny2 = -D.ux; sett(D.x + nx * 5, D.y + ny2 * 5, Math.atan2(nx, -ny2)); for (let i = 0; i < 12; i++) Interior3d.oppdater(true);
        ut.plan = !!P.inne; if (P.inne) { ut.senger = P.inne.møbler.filter(m => m.type === 'køyeseng').length; const I = P.inne.inngang; ut.vegg = hindring3d((P[0][0] + P[3][0]) / 2, (P[0][1] + P[3][1]) / 2) && !hindring3d(I.x, I.y);
          sett(I.inn[0] - I.nx, I.inn[1] - I.ny, 0); KROKER.ramme3d.forEach(f => f(R)); ut.inne = Interior3d.inne(R.bane.x, R.bane.y) === P; ut.gulv = !!P.inne && P.inne.gulv >= P.gulvFast - 1e-6 && P.inne.gulv <= P.veggTopp - 1.95 && Math.abs(Interior3d.høyde(R.bane.x, R.bane.y, () => 0) - P.inne.gulv) < 1e-6;
          ut.let = document.getElementById('letknapp').classList.contains('på'); ut.lapp = document.getElementById('innelapp').textContent; ut.gress = Interior3d.iLeirbygg(I.inn[0], I.inn[1]); } }
      Gange.stopp(); L.bygg.splice(L.bygg.indexOf(ny), 1); Interior3d.oppdater(true); ut.borte = !Interior3d.egne().some(q => q.P.bygg.i === 9000000 + ny.id); return ut; });
    const lbok = !lb.uten && lb.registrert && lb.plan && lb.senger >= 4 && lb.vegg && lb.inne && lb.gulv && !lb.let && (lb.lapp === 'Brakka' || /^Du fant|^Huset var/.test(lb.lapp)) && lb.gress && lb.borte;
    if (!lbok) { feil++; console.log(JSON.stringify(lb)); }
    console.log(`${lbok ? 'ok  ' : 'FEIL'} ${navn} interiør i leirens bygg: brakka er registrert, veggen stopper deg, ${lb.senger} køyesenger inne, du står på gulvet, ingen leting der, borte når bygget fjernes`);
    // VAKT kjørbare biler og helikopter (spill/kjor.js, brukeren 16. nov): feltbilen og helikopteret står fritt ved leiren, knappen
    // kommer når du går bort til dem, F setter deg inn, bilen kjører og bremser, helikopteret letter og lander, og plassen lagres.
    const kj = await pg.evaluate(async () => { if (!window.KjorSpill || !KjorSpill.liste().length) return { uten: true }; while (R3.bygger) await new Promise(r => setTimeout(r, 100));
      const R = R3, u = R.ut, K = KjorSpill.liste(), ut = {}, tast = (k, ned) => window.dispatchEvent(new KeyboardEvent(ned ? 'keydown' : 'keyup', { key: k }));
      for (const k of K) { k.X = u.cx + (k.type === 'bil' ? 60 : 90); k.Y = u.cy - 200; k.ny = true; k.alt = null; } Gange.start(); KROKER.ramme3d.forEach(f => f(R));
      ut.fritt = K.every(k => !hindring3d(k.X - u.cx, k.Y - u.cy)); const sett = (x, y) => { R.bane.x = x; R.bane.y = y; const kr = Gange.kropp(); kr.x = x; kr.y = y; kr.vx = kr.vy = 0; };
      const ekte = performance.now.bind(performance); let t = ekte(); const kjør = (taster, n) => { performance.now = () => (t += 33); try { for (const k of taster) tast(k, true); for (let i = 0; i < n; i++) { Gange.kamera(R); KROKER.ramme3d.forEach(f => f(R)); } for (const k of taster) tast(k, false); } finally { performance.now = ekte; } };
      const b = K[0], h = K[1]; sett(b.X - u.cx - 3, b.Y - u.cy); KROKER.ramme3d.forEach(f => f(R)); ut.knapp = document.getElementById('kjorknapp').textContent; tast('f', true); ut.iBil = KjorSpill.fører() === b;
      const x0 = b.X, y0 = b.Y; kjør(['w'], 90); ut.kjørte = Math.hypot(b.X - x0, b.Y - y0); ut.fart = b.v; kjør([' '], 90); ut.stoppet = Math.abs(b.v) < .5; tast('f', true); ut.ute = !KjorSpill.fører() && !!R.fot;
      sett(h.X - u.cx + 3, h.Y - u.cy); KROKER.ramme3d.forEach(f => f(R)); tast('f', true); ut.iHeli = KjorSpill.fører() === h; kjør([' '], 150); ut.over = h.over; tast('f', true); ut.måLande = KjorSpill.fører() === h;
      kjør(['c'], 400); ut.landet = h.over < .3; tast('f', true); ut.ute2 = !KjorSpill.fører(); ut.lagret = (JSON.parse(localStorage.getItem('riksbrudd-kjor') || '{}').k || []).length;
      // egne kjøretøy (speiderbilen i KJORETOY) kan også kjøres: plassen skrives tilbake til kjøretøyet
      { const kj = (window.KJORETOY || []).find(q => q.side === 'blå' && q.antall === 1 && !q.sti && !q.oppdrag); if (kj) { const gx = kj.x, gy = kj.y, gr = kj.retning; kj.x = u.cx + 30; kj.y = u.cy - 260; kj.retning = Math.PI / 2; sett(kj.x - u.cx - 3, kj.y - u.cy); KROKER.ramme3d.forEach(f => f(R));
          ut.egenKnapp = document.getElementById('kjorknapp').textContent; tast('f', true); ut.iEgen = !!KjorSpill.fører() && KjorSpill.fører().kj === kj; const y0e = kj.y; kjør(['w'], 80); ut.egenKjørte = kj.y - y0e; kjør([' '], 90); tast('f', true); ut.egenUte = !KjorSpill.fører(); kj.x = gx; kj.y = gy; kj.retning = gr; } else ut.egenKnapp = null; }
      Gange.stopp(); return ut; });
    const kjok = !kj.uten && kj.fritt && /feltbilen/.test(kj.knapp) && kj.iBil && kj.kjørte > 15 && kj.fart <= 27.01 && kj.stoppet && kj.ute && kj.iHeli && kj.over > 10 && kj.måLande && kj.landet && kj.ute2 && kj.lagret === 2 && (kj.egenKnapp === null || (kj.egenKnapp.includes('Sett deg inn i') && kj.iEgen && kj.egenKjørte > 10 && kj.egenUte));
    if (!kjok) { feil++; console.log(JSON.stringify(kj)); }
    console.log(`${kjok ? 'ok  ' : 'FEIL'} ${navn} kjørbare biler og helikopter: bilen kjørte ${(kj.kjørte || 0).toFixed(0)} m og stoppet, helikopteret steg til ${(kj.over || 0).toFixed(0)} m, landet, og du må lande før du går ut; eget kjøretøy («${kj.egenKnapp || 'ingen'}») kjørte ${(kj.egenKjørte || 0).toFixed(0)} m`);
    // VAKT detaljerte kjøretøy og soldater (spill/kjoretoy3d.js, brukeren 17. nov: «gjør alt mer detaljert»): hver kjøretøytype har
    // sin egen modell (ikke tre klosser), kjøretøyene i utsnittet tegnes med den, og soldatfiguren har mer enn kropp og bein.
    const det = await pg.evaluate(() => { const R = R3, u = R.ut, ut = { typer: {}, tegnet: 0, soldat: 0 }; if (!window.Kjoretoy3d) return { uten: true };
      for (const t of Object.keys(Kjoretoy.TYPER)) ut.typer[t] = Kjoretoy3d.trekanter(t);
      const k = Kjoretoy.ny({ navn: 'Vakt', type: 'stridsvogn', antall: 2, x: u.cx + 40, y: u.cy - 300 }); KJORETOY.push(k); kjøretøy3d(); soldater3d(); ut.tegnet = R.kjMesh.stridsvogn ? R.kjMesh.stridsvogn.count : 0; KJORETOY.splice(KJORETOY.indexOf(k), 1); kjøretøy3d();
      ut.etter = R.kjMesh.stridsvogn.count; ut.soldat = (R.solMesh || []).reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0); return ut; });
    const detok = !det.uten && Object.keys(det.typer).length >= 5 && Object.values(det.typer).every(n => n > 400 && n < 6000) && det.tegnet >= 2 && det.etter === det.tegnet - 2 && det.soldat > 400;
    if (!detok) { feil++; console.log(JSON.stringify(det)); }
    console.log(`${detok ? 'ok  ' : 'FEIL'} ${navn} detaljerte kjøretøy og soldater: ${Object.entries(det.typer || {}).map(([t, n]) => t + ' ' + n).join(', ')} trekanter, soldaten ${Math.round(det.soldat || 0)}`);
    // VAKT krigskartet (spill/strategi.js, brukeren 17. nov: «få frem strategielementet mye bedre»): med fire prøvetettsteder rundt
    // leiren gir krigskartet stilling, neste trekk og fronter, panelet åpner og zoomer ut, «Send» gir et lag ordre, og alt ryddes bort.
    const krig = await pg.evaluate(async () => { if (!window.StrategiSpill || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return { uten: true };
      const blå = ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e)), L = (window.OppstartSpill && OppstartSpill.tilstand() && OppstartSpill.tilstand().leir) || (window.OLJE && OLJE.BASER[0]) || blå[0], ut = {};
      const lag = (id, dx, dy, folk) => { const x = L.x + dx, y = L.y + dy, r = 300; return { lag: 'tettsted', e: { id, navn: 'Prøve ' + id, folk }, bb: [x - r, y - r, x + r, y + r], deler: [[x - r, y - r, x + r, y - r, x + r, y + r, x - r, y + r]] }; };
      const ny = [lag('vk1', 2000, 0, 4000), lag('vk2', 9000, 0, 3000), lag('vk3', 0, 12000, 2000), lag('vk4', -14000, 0, 1000)]; INFRA.tettsted.push(...ny);
      TETTSTEDER.set('vk1', { eier: 'blå', inntar: null }); TETTSTEDER.set('vk2', { eier: 'rød', inntar: null });
      const var3d = på3d; let mÅpen = 0;
      try { const T = StrategiSpill.bilde(); ut.byer = T.byer.filter(b => /^vk/.test(b.id)).length; ut.fronter = T.fronter.filter(f => /^vk/.test(f.a.id) && /^vk/.test(f.b.id)).length; ut.trekk = T.trekk.filter(t => /^vk/.test(t.by.id)).map(t => t.by.id);
        ut.andel = T.st.sider.blå.andel; StrategiSpill.åpne(); ut.åpen = document.getElementById('krig').classList.contains('på') && document.body.classList.contains('krig'); ut.zoom = kam.m > 20; mÅpen = kam.m; ut.i2d = !på3d;
        ut.stolper = document.querySelectorAll('#krig .side .stolpe').length; ut.rader = document.querySelectorAll('#krig [data-trekk]').length; ut.velg = StrategiSpill.velg('vk3'); ut.sendKnapp = !!document.querySelector('#krig .by [data-send="vk3"]');
        const g = document.createElement('canvas').getContext('2d'); let tegnFeil = ''; try { StrategiSpill.tegn(g, kam.x - 1000, kam.y + 1000); } catch (e) { tegnFeil = e.message; } ut.tegnFeil = tegnFeil;
        const s = blå.find(q => !q.sti), før = s && s.sti; ut.sendt = s ? StrategiSpill.send(T.byer.find(b => b.id === 'vk3'), s) : null; await new Promise(r => setTimeout(r, 2500)); ut.marsjerer = s ? !!s.sti : null; if (s) { s.sti = før || null; s.siktSkitten = true; }
        StrategiSpill.lukk(); ut.lukket = !document.getElementById('krig').classList.contains('på') && kam.m < mÅpen; ut.status = document.getElementById('sKrig').textContent;
      } finally { for (const b of ny) { INFRA.tettsted.splice(INFRA.tettsted.indexOf(b), 1); TETTSTEDER.delete(b.e.id); } StrategiSpill.takt();
        // krigskartet går til 2D: sett 3D på igjen for vaktene som kommer etter
        if (var3d) { await slå3d(true); const t0 = performance.now(); while ((!R3 || !R3.ut || R3.bygger) && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 200)); } }
      return ut; });
    const krigok = !krig.uten && krig.byer === 4 && krig.fronter >= 1 && krig.trekk.length === 3 && krig.andel > 0 && krig.åpen && krig.zoom && krig.i2d && krig.stolper === 3 && krig.rader >= 3 && krig.velg && krig.sendKnapp && !krig.tegnFeil && krig.sendt === true && krig.marsjerer === true && krig.lukket;
    if (!krigok) { feil++; console.log(JSON.stringify(krig)); }
    console.log(`${krigok ? 'ok  ' : 'FEIL'} ${navn} krigskartet: ${krig.byer} prøvetettsteder, ${krig.fronter} front, neste trekk ${(krig.trekk || []).join(', ')}, panelet åpner og lukker, laget fikk ordre: ${krig.marsjerer}`);
    // VAKT siktfelt hele tiden og kameraer (brukeren 17. nov: «det vises bare hva de ser når jeg trykker på dem»): egne lag med kontakt
    // lyser uten å være valgt, et lag uten kontakt (KROKER.skjul) lyser ikke, og en kameramast med strøm åpner tåka og ser fiender.
    const sl = await pg.evaluate(() => { if (!window.KameraSpill || typeof siktLyser !== 'function') return { uten: true }; const ut = {}, blå = ENHETER.find(e => e.side === 'blå' && !e.karakter && levende(e)), før = valgt; valgt = null;
      ut.lyser = siktLyser(blå); const sperre = s => s === blå; KROKER.skjul.push(sperre); ut.utenKontakt = siktLyser(blå); KROKER.skjul.splice(KROKER.skjul.indexOf(sperre), 1); valgt = før;
      const L = window.LeirSpill && LeirSpill.tilstand(); if (!L) return Object.assign(ut, { utenLeir: true });
      const b = { id: L.neste++, type: 'kameramast', x: blå.x + 5000, y: blå.y + 5000, ret: 0, igjen: 0, totalt: 1, pris: 0, mat: {}, nivå: 1, hp: 1 }; L.bygg.push(b);
      const fi = nyttLag('Vaktfiende', b.x + 200, b.y, 'rød'), langt = nyttLag('Vaktfiende 2', b.x + 900, b.y, 'rød'); ENHETER.push(fi, langt);
      try { const K = KameraSpill.kameraer(); ut.kamera = K.length; ut.r = K[0] && K[0].r; ut.ser = synlig(fi); ut.serIkke = synlig(langt); ut.kroker = KROKER.siktlys.length;
        const g = document.createElement('canvas').getContext('2d'); let f = ''; try { for (const q of KROKER.siktlys) q(g, b.x - 500, b.y + 500, 10); for (const q of KROKER.tåke) if (q.fritt) q(g, b.x - 500, b.y + 500, 10); } catch (e) { f = e.message; } ut.tegnFeil = f;
        b.av = true; ut.avslått = KameraSpill.kameraer().length; }
      finally { L.bygg.splice(L.bygg.indexOf(b), 1); ENHETER.splice(ENHETER.indexOf(fi), 1); ENHETER.splice(ENHETER.indexOf(langt), 1); KameraSpill.kameraer(); }
      return ut; });
    const slok = !sl.uten && sl.lyser === true && sl.utenKontakt === false && (sl.utenLeir || (sl.kamera === 1 && sl.r === 300 && sl.ser === true && sl.serIkke === false && sl.kroker >= 1 && !sl.tegnFeil && sl.avslått === 0));
    if (!slok) { feil++; console.log(JSON.stringify(sl)); }
    console.log(`${slok ? 'ok  ' : 'FEIL'} ${navn} siktfelt hele tiden og kameraer: lag med kontakt lyser ${sl.lyser}, uten kontakt ${sl.utenKontakt}, kamera ${sl.kamera} (${sl.r} m) ser fiende ${sl.ser}, ikke 900 m unna ${sl.serIkke === false}`);
    // VAKT lageroversikten (spill/lager-visning.js, brukeren 17. nov: «lettere å ha oversikt over om man har diesel, andre materialer og
    // hvor mye en kan ha»): statuslinja viser «har/plass» for diesel og materialene, tom diesel med aggregat er rød, fullt lager gult,
    // og fanen Lager har oversikten med en stolpe per ting.
    const lg = await pg.evaluate(async () => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!window.LagerSpill || !L) return { uten: true }; const ut = {}, før = { d: L.drivstoff, lager: { ...L.lager } }, nye = [];
      for (const t of ['aggregat', 'drivstofftank']) { const b = { id: L.neste++, type: t, x: L.midt ? L.midt.x + 3000 : 3000, y: 3000, ret: 0, igjen: 0, totalt: 1, pris: 0, mat: {}, nivå: 1, hp: 1 }; L.bygg.push(b); nye.push(b); }
      try { L.drivstoff = 0; L.lager.tre = 5; L.lager.betong = Leir.lagerplass(L); LeirSpill.oppdater3d && 0; const s0 = LeirSpill.siste(); ut.aggInst = s0 && s0.aggInst; await new Promise(r => setTimeout(r, 1300)); LagerSpill.oppdater();
        const S = LagerSpill.stilling(), finn = id => S.find(t => t.id === id); ut.diesel = finn('diesel').tilstand; ut.plass = finn('diesel').plass; ut.betong = finn('betong').tilstand; ut.tre = finn('tre').tilstand;
        ut.tekst = document.getElementById('sDiesel').textContent; ut.rød = document.getElementById('sDiesel').parentNode.classList.contains('tomt'); ut.treTekst = document.getElementById('sTre').textContent; ut.gul = document.getElementById('sBetong').parentNode.classList.contains('fullt');
        const m = document.getElementById('leirmeny'); if (!m.classList.contains('på')) document.getElementById('leirknapp').click(); LeirSpill.fane('lager'); await new Promise(r => setTimeout(r, 300));
        ut.rader = m.querySelectorAll('.oversikt .ting').length; ut.radRød = !!m.querySelector('.oversikt .ting.tomt[data-ting="diesel"]'); ut.synlig = !!m.querySelector('.oversikt') && !m.querySelector('.oversikt').hidden;
        L.drivstoff = 100; LagerSpill.oppdater(); ut.etter = document.getElementById('sDiesel').parentNode.classList.contains('tomt'); document.getElementById('leirknapp').click(); }
      finally { for (const b of nye) L.bygg.splice(L.bygg.indexOf(b), 1); L.drivstoff = før.d; L.lager = før.lager; LagerSpill.oppdater(); }
      return ut; });
    const lgok = !lg.uten && lg.diesel === 'tomt' && lg.plass > 0 && lg.betong === 'fullt' && lg.tre === '' && /^0\//.test(lg.tekst) && lg.rød && /^5\//.test(lg.treTekst) && lg.gul && lg.rader >= 4 && lg.radRød && lg.synlig && lg.etter === false;
    if (!lgok) { feil++; console.log(JSON.stringify(lg)); }
    console.log(`${lgok ? 'ok  ' : 'FEIL'} ${navn} lageroversikten: statuslinja «${lg.tekst}» (rød ${lg.rød}), tre «${lg.treTekst}», fullt betonglager gult ${lg.gul}, ${lg.rader} stolper i fanen Lager`);
    // VAKT radiomastens rekkevidde (brukeren 17. nov: «når en trykker på radiomasten, bør det gå an å se rekkevidden visuelt»):
    // en mast uten strøm gir 8 km, knappen «Vis rekkevidden» zoomer ut så hele sirkelen får plass, og samme knapp går tilbake.
    const rm = await pg.evaluate(() => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !window.BYGGEVISNING || !BYGGEVISNING.visRekkevidde) return { uten: true };
      const b = { id: L.neste++, type: 'radiomast', x: kam.x, y: kam.y, ret: 0, igjen: 0, totalt: 1, pris: 0, mat: {}, nivå: 2, hp: 1 }, ut = {}, m0 = kam.m, x0 = kam.x, y0 = kam.y; L.bygg.push(b);
      try { ut.r = BYGGEVISNING.radioRekkevidde(b); b.av = true; ut.av = BYGGEVISNING.radioRekkevidde(b); delete b.av; ut.inn = BYGGEVISNING.visRekkevidde(b); ut.passer = ut.r / kam.m < Math.min(VW, VH) / 2; ut.zoom = BYGGEVISNING.radioZoom();
        ut.ut = BYGGEVISNING.visRekkevidde(b); ut.tilbake = kam.m === m0 && kam.x === x0 && kam.y === y0; } finally { L.bygg.splice(L.bygg.indexOf(b), 1); }
      return ut; });
    const rmok = !rm.uten && (rm.r === 25000 || rm.r === 8000) && rm.av === 8000 && rm.inn === true && rm.passer && rm.zoom && rm.ut === false && rm.tilbake;
    if (!rmok) { feil++; console.log(JSON.stringify(rm)); }
    console.log(`${rmok ? 'ok  ' : 'FEIL'} ${navn} radiomastens rekkevidde: ${rm.r / 1000} km (avslått ${rm.av / 1000} km), «Vis rekkevidden» får plass til sirkelen: ${rm.passer}, tilbake: ${rm.tilbake}`);
    // VAKT karakteren din (spill/karakter.js, brukeren 17. nov: «gjøre spillerens egen karakter mer detaljert»): figuren i 3D er din egen
    // (ikke en soldat), «Utenfra» flytter kameraet bak deg og skjuler våpenet i hånda, behovene går ut over treffet, og karakterarket viser dem.
    const kar = await pg.evaluate(async () => { if (!window.KarakterSpill || !KarakterSpill.klar()) return { uten: true }; while (R3.bygger) await new Promise(r => setTimeout(r, 100)); const R = R3, ut = {}, vent = ms => new Promise(r => setTimeout(r, ms));
      const var3 = KarakterSpill.tredje(), gikk = !!R.fot; if (!gikk) Gange.start(); KarakterSpill.settTredje(false); kamera3d(); KROKER.ramme3d.forEach(f => f(R)); const F = KarakterSpill.figur(); ut.figur = !!F; ut.ledd = !!(F && F.b && F.b[0].legg && F.a && F.a[0].under && F.hode); ut.trekanter = 0; if (F) F.g.traverse(m => { if (m.geometry) ut.trekanter += m.geometry.attributes.position.count / 3; });
      ut.første = F && !F.g.visible && !window.TREDJE; const øye = R.cam.position.clone();
      KarakterSpill.settTredje(true); kamera3d(); KROKER.ramme3d.forEach(f => f(R)); ut.tredje = F && F.g.visible && window.TREDJE === true; ut.bak = R.cam.position.distanceTo(øye); const k = Gange.kropp(); ut.vedDeg = F ? Math.hypot(F.g.position.x - k.x, F.g.position.y - k.y) : -1;
      const T = KarakterSpill.T(), før = { ...T.behov }; ut.treff0 = KarakterSpill.treff(); T.behov.tørst = 5; ut.treff1 = KarakterSpill.treff(); ut.varsel = KarakterSpill.varsler().map(v => v.id).join(',');
      KarakterSpill.åpne(); await vent(100); ut.målere = document.querySelectorAll('#karakterark .m').length; ut.rød = !!document.querySelector('#karakterark .m.lite, #karakterark .m.tomt'); ut.portrett = !!document.querySelector('#karakterark .hode img'); KarakterSpill.lukk();
      Object.assign(T.behov, før); KarakterSpill.settTredje(var3); if (!gikk) Gange.stopp(); KROKER.ramme3d.forEach(f => f(R)); return ut; });
    const karok = !kar.uten && kar.figur && kar.trekanter > 2500 && kar.trekanter < 12000 && kar.ledd && kar.første && kar.tredje && kar.bak > 1 && kar.vedDeg < .5 && kar.treff0 === 1 && kar.treff1 < 1 && kar.varsel === 'tørst' && kar.målere >= 4 && kar.rød && kar.portrett;
    if (!karok) { feil++; console.log(JSON.stringify(kar)); }
    console.log(`${karok ? 'ok  ' : 'FEIL'} ${navn} karakteren din: egen figur (${Math.round(kar.trekanter || 0)} trekanter), tredjeperson flytter kameraet ${(kar.bak || 0).toFixed(1)} m bak, tørst gir treff ×${(kar.treff1 || 0).toFixed(2)}, arket har ${kar.målere} målere`);
    // VAKT stridsregler (spill/strid.js, brukeren 17. nov: reaksjon i møte med fienden, høyde, hvem som oppdager hvem, våpen på begge
    // sider): høyde og oppdagelse går inn i ildfaktoren, «hold ilden» gir 0, bevæpningen bytter våpnene og koster penger, fienden har
    // sin egen bevæpning, styrkeforholdet regnes ut, og et underlegent lag under ild får ordre om å trekke seg (StridSpill.test).
    const str = await pg.evaluate(async () => { if (!window.StridSpill || !window.Strid) return { uten: true }; const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms)), s = ENHETER.find(e => e.side === 'blå' && !e.karakter && levende(e) && !e.sti);
      const fi = nyttLag('Røvere 9.9', s.x + 300, s.y, 'rød'); fi.raid = 9; ENHETER.push(fi); const serFi = e => e === fi; KROKER.ser.push(serFi); const før = { strid: s.strid && { ...s.strid }, her: s.her, menn: s.menn.map(m => ({ ...m })), penger: OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : null, beskutt: s.beskuttTid, sist: s.stridSist };
      try { s.strid = null; delete s.bevSatt; StridSpill.SETT.clear(); s.her = { k: 5, h: 500 }; fi.her = { k: 5, h: 500 }; ut.jevn = StridSpill.faktor(s, fi, 300); s.her = { k: 5, h: 560 }; ut.høy = StridSpill.faktor(s, fi, 300); ut.lav = StridSpill.faktor(fi, s, 300);
        StridSpill.SETT.set(s.navn + '>' + fi.navn, tid); ut.bakhold = StridSpill.faktor(s, fi, 300) / ut.høy; StridSpill.SETT.clear(); ut.bevFi = StridSpill.regel(fi).bev; ut.våpenFi = fi.menn.filter(m => m.våpen).length;
        StridSpill.sett(s, Strid.HOLDNING.bakhold.regel); ut.holdIld = StridSpill.faktor(s, fi, 300); ut.nær = StridSpill.faktor(s, fi, 150) > 0; StridSpill.sett(s, Strid.HOLDNING.balansert.regel);
        const p0 = OppstartSpill.tilstand() ? OppstartSpill.tilstand().penger : 0; StridSpill.velgBev(s, 'nærstrid'); ut.bev = s.strid.bev; ut.maskinpistoler = s.menn.filter(m => m.våpen === 'maskinpistol').length; ut.betalt = OppstartSpill.tilstand() ? p0 - OppstartSpill.tilstand().penger : 200000;
        const v = StridSpill.vurdering(s); ut.forhold = v ? v.forhold : null; ut.motFi = !!v && v.fi === fi; valgt = s; visPanel(); ut.knapp = [...document.querySelectorAll('#handl button')].some(b => b.textContent === 'Stridsregler'); StridSpill.åpne(s); await vent(50);
        ut.holdninger = document.querySelectorAll('#stridpanel [data-holdning]').length; ut.valg = document.querySelectorAll('#stridpanel select').length; ut.bevRader = document.querySelectorAll('#stridpanel [data-bev]').length; ut.nå = /Styrkeforhold/.test(document.getElementById('stridpanel').textContent); StridSpill.lukk();
        // underlegent lag under ild: seks av tolv ute, fienden uskadd -> laget trekker seg når reglene får virke
        s.menn.slice(0, 5).forEach(m => { m.hp = 0; }); s.beskuttTid = tid; delete s.stridSist; StridSpill.test = true; const t0 = tid, tp = tempo; tempo = 60; for (let i = 0; i < 60 && s.stridSist === undefined; i++) await vent(100); tempo = tp; StridSpill.test = false; ut.trakk = s.stridSist !== undefined; for (let i = 0; i < 40 && s.planlegger; i++) await vent(100); ut.marsj = !!s.sti || !!s.planlegger; }
      finally { StridSpill.test = false; KROKER.ser.splice(KROKER.ser.indexOf(serFi), 1); ENHETER.splice(ENHETER.indexOf(fi), 1); s.sti = null; s.menn = før.menn; s.her = før.her; s.strid = før.strid; delete s.bevSatt; s.beskuttTid = før.beskutt; s.stridSist = før.sist; StridSpill.SETT.clear(); if (før.penger !== null) OppstartSpill.tilstand().penger = før.penger; s.siktSkitten = true; valgt = null; if (window.lukkPanel) lukkPanel(); }
      return ut; });
    const strok = !str.uten && str.jevn === 1 && str.høy * 1.2 > 1.3 && str.lav < .9 && Math.abs(str.bakhold - 1.6) < 1e-9 && str.bevFi === 'lett' && str.våpenFi === 12 && str.holdIld === 0 && str.nær && str.bev === 'nærstrid' && str.maskinpistoler >= 7 && str.betalt === 200000 && str.motFi && str.forhold > 0 && str.knapp && str.holdninger === 4 && str.valg === 4 && str.bevRader === 4 && str.nå && str.trakk;
    if (!strok) { feil++; console.log(JSON.stringify(str)); }
    console.log(`${strok ? 'ok  ' : 'FEIL'} ${navn} stridsregler: 60 m høyere ×${((str.høy || 0) * 1.2).toFixed(2)} med Terrengs del (nedenfra ×${(str.lav || 0).toFixed(2)}), bakhold ×${(str.bakhold || 0).toFixed(2)}, hold ilden ${str.holdIld}, fienden «${str.bevFi}», nærstrid ${str.maskinpistoler} maskinpistoler, underlegent lag trakk seg: ${str.trakk}`);
    // VAKT knapperaden (spill/knapper.js, brukeren 17. nov: «utfør nummer 5»): Gå, Leir, Krig og Deg har ikon, Sekk og Utenfra er samlet
    // under Deg (menyen kommer bare når du går), og raden får plass på én linje.
    const knp = await pg.evaluate(async () => { if (!window.Knapper) return { uten: true }; while (R3.bygger) await new Promise(r => setTimeout(r, 100)); const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id); Knapper.merk();
      ut.ikon = ['gaaknapp', 'leirknapp', 'karakterknapp'].every(id => $(id) && $(id).dataset.kn && getComputedStyle($(id), '::before').maskImage !== 'none'); ut.skjult = ['sekkknapp', 'tredjeknapp'].every(id => !$(id) || getComputedStyle($(id)).display === 'none');
      const gikk = !!R3.fot; if (!gikk) Gange.start(); await vent(700); $('karakterknapp').click(); await vent(50); ut.meny = Knapper.åpen(); ut.rader = document.querySelectorAll('#degmeny button').length; ut.ark0 = KarakterSpill.erÅpen();
      const sk = [...document.querySelectorAll('#degmeny button')].find(b => /Sekken/.test(b.textContent)); if (sk) sk.click(); await vent(50); ut.sekk = UtstyrSpill.erÅpen(); ut.lukket = !Knapper.åpen(); UtstyrSpill.åpne(false);
      const K = [...document.querySelectorAll('.knapper button')].filter(b => b.offsetParent), y = K.map(b => Math.round(b.getBoundingClientRect().top)); ut.enRad = Math.max(...y) - Math.min(...y) < 6; ut.antall = K.length; if (!gikk) Gange.stopp(); return ut; });
    const knpok = !knp.uten && knp.ikon && knp.skjult && knp.meny && knp.rader === 3 && !knp.ark0 && knp.sekk && knp.lukket && knp.enRad;
    if (!knpok) { feil++; console.log(JSON.stringify(knp)); }
    console.log(`${knpok ? 'ok  ' : 'FEIL'} ${navn} knapperaden: ikoner ${knp.ikon}, Sekk og Utenfra samlet under Deg (${knp.rader} valg), ${knp.antall} knapper på én rad: ${knp.enRad}`);
    // VAKT forsvar av leiren (spill/forsvar.js, brukeren 17. nov: «hvordan skal jeg forsvare leiren fra et angrep på en god måte»):
    // beredskapen regnes, alarmen kommer når røvere er på vei, «Forsvar leiren» gir lagene stillinger og regelen «kjemp», folk på
    // vakt blir Leirvakta, og når angrepet er over, er reglene tilbake og Leirvakta borte.
    const fsv = await pg.evaluate(async () => { if (!window.ForsvarSpill || !window.SpilletSpill || !SpilletSpill.klar()) return { uten: true }; const ut = {}, vent = ms => new Promise(r => setTimeout(r, ms)), S = OppstartSpill.tilstand().leir, T = SpilletSpill.T(), F = FolkSpill.tilstand();
      const før = { aktiv: T.aktiv, opp: F.personer.map(p => p.oppgave), pos: ENHETER.filter(e => e.side === 'blå').map(e => [e, e.x, e.y, e.sti]), strid: ENHETER.filter(e => e.side === 'blå' && !e.karakter).map(e => [e, e.strid ? { ...e.strid } : null]) }, antall = ENHETER.length;
      const B = ForsvarSpill.beredskap(); ut.sum = B.sum; ut.punkter = B.punkter.length; F.personer.slice(0, 4).forEach(p => { p.oppgave = 'vakt'; p.helse = 1; }); await vent(1200);
      const lag = ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e)); lag.forEach((e, i) => { e.x = S.x + 200 + i * 30; e.y = S.y - 150; e.sti = null; });
      const rv = nyttLag('Røvere 8.1', S.x + 1200, S.y, 'rød'); rv.raid = 8; ENHETER.push(rv); T.aktiv = 8; const ser = e => e === rv; KROKER.ser.push(ser);
      try { ForsvarSpill.vis(); const al = document.getElementById('alarm'); ut.alarm = al.classList.contains('på') && /Angrep/.test(al.textContent) && /unna/.test(al.textContent); ut.knapp = !!document.getElementById('forsvarknapp');
        const r = ForsvarSpill.sett(false); ut.lag = r.lag; ut.vakt = r.vakt; ut.satt = ForsvarSpill.erSatt(); ut.regel = lag.every(e => e.strid && e.strid.underlegen === 'kjemp' && e.forsvar); ut.motØst = lag.every(e => e.forsvar.x > S.x); ut.vaktLag = ENHETER.some(e => e.leirvakt);
        ut.opphevKnapp = (ForsvarSpill.vis(), !!document.getElementById('opphevknapp')); const m = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (!m.classList.contains('på')) lk.click(); LeirSpill.fane('bygg'); await vent(200); ut.meny = document.querySelectorAll('#leirmeny .forsvar .p').length; lk.click();
        for (let i = 0; i < 40 && lag.some(e => e.planlegger); i++) await vent(100); ForsvarSpill.opphev(true); ut.etter = !ForsvarSpill.erSatt() && !ENHETER.some(e => e.leirvakt) && lag.every(e => !e.forsvar && !e.stridFør); ut.rapport = /Etter angrepet/.test(loggLinjer[0] || ''); }
      finally { KROKER.ser.splice(KROKER.ser.indexOf(ser), 1); const i = ENHETER.indexOf(rv); if (i >= 0) ENHETER.splice(i, 1); T.aktiv = før.aktiv; F.personer.forEach((p, k) => { p.oppgave = før.opp[k]; }); for (const [e, x, y, sti] of før.pos) { e.x = x; e.y = y; e.sti = null; e.siktSkitten = true; delete e.graver; } for (const [e, st] of før.strid) { e.strid = st; delete e.bevSatt; } if (ForsvarSpill.erSatt()) ForsvarSpill.opphev(false); ForsvarSpill.vis(); }
      ut.ryddet = ENHETER.length === antall; return ut; });
    const fsvok = !fsv.uten && fsv.punkter === 6 && fsv.sum >= 0 && fsv.alarm && fsv.knapp && fsv.lag >= 1 && fsv.vakt === 4 && fsv.satt && fsv.regel && fsv.motØst && fsv.vaktLag && fsv.opphevKnapp && fsv.meny === 6 && fsv.etter && fsv.rapport && fsv.ryddet;
    if (!fsvok) { feil++; console.log(JSON.stringify(fsv)); }
    console.log(`${fsvok ? 'ok  ' : 'FEIL'} ${navn} forsvar av leiren: beredskap ${fsv.sum} av 100, alarm ${fsv.alarm}, ${fsv.lag} lag i stilling mot fienden, Leirvakta ${fsv.vakt} mann, alt tilbake etterpå: ${fsv.etter}`);
    // VAKT angrep, marked, oppdrag, kamp, hendelser og venner (spill/spillet.js, brukeren 16. nov: «lag alle 7»): hver del gjør sitt
    // når den slås på (i testene skjer ingenting av seg selv), og tilstanden settes tilbake etterpå.
    const sp = await pg.evaluate(async () => { const SS = window.SpilletSpill; if (!SS || !SS.klar()) return { uten: true }; while (R3.bygger) await new Promise(r => setTimeout(r, 100));
      const ut = {}, vent = ms => new Promise(q => setTimeout(q, ms)), S = OppstartSpill.tilstand(), leir = S.leir, p0 = S.penger, t0 = tempo, F = FolkSpill.tilstand(), mor0 = F.moral, mat0 = F.mat, n0 = F.personer.length, tre0 = Leir.MATERIALER.tre.pris, salg0 = Leir.REGLER.salg, diesel0 = Leir.DRIVSTOFF.prisPerLiter, matpris0 = FolkRegler.R.matPris;
      ut.stille = !SS.T().aktiv && SS.O().liste.length === 0 && !SS.H().åpen && Leir.REGLER.salg === .5; SS.test = true; tempo = 1;
      SS.markedNå(); ut.marked = Leir.REGLER.salg === .8 && Leir.MATERIALER.tre.pris % 100 === 0 && SS.M().dag >= 1;
      await SS.fyllOppdrag(); await vent(1200); ut.oppdrag = SS.O().liste.length; const o = SS.O().liste[0];
      if (o) { SS.ta(o.id); ut.post = o.type !== 'post' || ENHETER.some(e => e.post === o.id); const lag = ENHETER.find(e => e.side === 'blå' && levende(e)), x0 = lag.x, y0 = lag.y, pf = S.penger; if (o.type === 'post') ENHETER.filter(q => q.post === o.id).forEach(e => e.menn.forEach(m => { m.hp = 0; })); else { lag.x = o.x + 10; lag.y = o.y; } SS.oppdragSteg(); lag.x = x0; lag.y = y0; ut.fullført = SS.O().gjort >= 1 && S.penger > pf && !ENHETER.some(e => e.post === o.id); }
      ut.angrep = await SS.angrep(); await vent(300); const rø = ENHETER.filter(e => e.raid); ut.røvere = rø.length; ut.unna = rø.every(e => Math.hypot(e.x - leir.x, e.y - leir.y) > 1300); const pa = S.penger; rø.forEach(e => e.menn.forEach(m => { m.hp = 0; })); SS.angrepSteg(); ut.seier = S.penger > pa && !SS.T().aktiv && !ENHETER.some(e => e.raid);
      ut.hendelse = SS.hendelse(); const kn = [...document.querySelectorAll('#hendelse button')]; ut.valg = kn.length; const kb = kn.find(b => !b.disabled); if (kb) kb.click(); ut.lukket = !SS.H().åpen && !document.getElementById('hendelse').classList.contains('på');
      const u = SS.minLenke(), v0 = SS.V().length, d = SS.leggTilVenn(u); ut.venn = !!d && SS.V().length === v0 + 1 && /#venn=[A-Za-z0-9_-]+$/.test(u); SS.V().splice(0, 1); try { localStorage.removeItem('riksbrudd-venner'); } catch (e) { /* ok */ }
      // kamp: en røver 50 m rett fram blir truffet, bom når du sikter et annet sted, og du tar skade når de er nær
      Gange.start(); await vent(300); const U = R3.ut, a = R3.fot.a, fx = -Math.sin(a), fy = Math.cos(a), e = nyttLag('Røvere vakt', U.cx + R3.bane.x + fx * 50, U.cy + R3.bane.y + fy * 50, 'rød'); ENHETER.push(e); const K = SS.K();
      R3.fot.a = a + 1.3; let l0 = e.menn.reduce((s, m) => s + m.hp, 0); for (let i = 0; i < 8; i++) { K.sist = 0; SS.skyt(); } ut.bom = e.menn.reduce((s, m) => s + m.hp, 0) === l0; R3.fot.a = a; K.mag = 30; K.lader = 0; for (let i = 0; i < 25; i++) { K.sist = 0; SS.skyt(); } ut.treff = e.menn.reduce((s, m) => s + m.hp, 0) < l0; ut.mag = K.mag;
      e.menn.forEach(m => { m.hp = 1; }); const hp0 = K.hp; SS.kampSteg(); ut.skade = K.hp < hp0;
      // SEKKEN (spill/utstyr.js): gevær framme, tast 2 tar fram pistolen, hagla kjøpes og treffer med flere hagl, førstehjelp gir helse, vekta telles
      { const US = window.UtstyrSpill, I = US.tilstand(), tast = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); ut.våpen0 = US.aktivt().def.navn; tast('2'); ut.våpen1 = US.aktivt().def.navn; K.lader = 0; K.sist = 0; const pm = K.mag; SS.skyt(); ut.pistol = K.mag === pm - 1;
        const kr0 = S.penger; US.kjøp('hagle'); ut.kjøpt = I.våpen.length === 3 && S.penger === kr0 - Utstyr.VÅPEN.hagle.pris; US.kjøp('ahagl'); US.velg(2); e.menn.forEach(m => { m.hp = 1; }); e.x = U.cx + R3.bane.x + fx * 20; e.y = U.cy + R3.bane.y + fy * 20; K.lader = 0; K.sist = 0; const h0 = e.menn.reduce((q, m) => q + m.hp, 0); SS.skyt(); ut.hagle = h0 - e.menn.reduce((q, m) => q + m.hp, 0) > .9;
        tast('i'); const pn = document.getElementById('sekk'); ut.sekk = pn.classList.contains('på') && pn.querySelectorAll('.rad').length >= 5 && /kg/.test(pn.textContent); K.hp = 40; US.helbred('forbinding'); ut.helse = K.hp === 85; tast('i'); ut.sekkLukket = !pn.classList.contains('på'); ut.vekt = Utstyr.vekt(I);
        ut.funn = typeof US.fantIHus('industri', 12345) === 'string';
        // OVERLEVELSE (spill/overlev.js): skytingen ga ferdighetspoeng, styrke gir større sekk, forfallet slår av strømnettet, og uten brønn faller moralen
        { const OS = window.OverlevSpill, f = OS.F(), d = OS.D(), ov = {}; ov.skyting = f.skyting > 0; const f0 = { ...f }, maks0 = Utstyr.maks(); OS.øk('styrke', 200); ov.styrke = Utstyr.maks() > maks0; tast('i'); ov.iSekk = /Ferdigheter/.test(pn.textContent) && pn.querySelectorAll('.ferd').length === 4; tast('i');
          ov.stilleNett = Leir.nettKW(LeirSpill.tilstand()) === 0 && OS.moralTillegg() === 0; OS.test = true; ov.nett = Leir.nettKW(LeirSpill.tilstand()) === 5; const d0 = JSON.stringify(d); d.strøm.spill = d.strøm.ekte = -1; d.vann.spill = d.vann.ekte = -1; const hn = OS.steg().join(); ov.nede = hn === 'strøm-nede,vann-nede' && Leir.nettKW(LeirSpill.tilstand()) === 0;
          ov.moral = OS.moralTillegg() === -15; const Lq = LeirSpill.tilstand(); Lq.bygg.push({ id: 987654, type: 'brønn', x: Lq.bygg[0] ? Lq.bygg[0].x + 300 : 0, y: 0, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1 }); ov.brønn = OS.moralTillegg() === 0 && !!Leir.BYGG.brønn; Lq.bygg.pop();
          // tilflukt: uten hus rundt deg skjer ingenting; reglene sier nei uten tre
          ov.ikkeHus = OS.sikre() === false && !OS.iTilflukt(); Object.assign(d, JSON.parse(d0)); Object.assign(f, f0); for (const k of Object.keys(f)) f[k] = 0; OS.øk('styrke', 0); Utstyr.ekstraVekt = 0; OS.test = false; for (const k of ['riksbrudd-ferdigheter', 'riksbrudd-tilflukt', 'riksbrudd-forfall']) try { localStorage.removeItem(k); } catch (e4) { /* ok */ } ut.ov = ov; }
        // SKJERMBILDET, MODELLENE OG STRØMMEN (narhud.js, folk3d.js, kjor.js, strom-visning.js; brukeren 16. nov): når du går, står helse og
        // våpen i hjørnene og våpenet er i hånda; helikoptermodellen har mange deler; strømoversikten har bryter per bygg.
        { const nh = {}, hud = document.getElementById('nhud'); KROKER.ramme3d.forEach(f => f(R3)); NarHud.tegnHud(); nh.hud = hud.classList.contains('på') && /Automatgevær|Pistol|Hagle/.test(hud.querySelector('.vapen').textContent) && hud.querySelector('.helse b').textContent === String(Math.round(K.hp));
          nh.felt = hud.querySelectorAll('.felt div').length === I.våpen.length; nh.hånd = !!NarHud.vm() && !!NarHud.vm().mesh && NarHud.vm().g.visible; nh.figurer = !!window.Folk3d;
          const hm = KjorSpill.liste().find(q => q.type === 'heli'); nh.heli = !!hm && !!hm.m && hm.m.children[0].geometry.attributes.position.count / 3 > 900 && hm.m.children.length === 3;
          const Lq = LeirSpill.tilstand(), nye = [['kontrollrom', 400], ['batteri', 430]].map(([type, dx], q) => ({ id: 880000 + q, type, x: Lq.bygg[0] ? Lq.bygg[0].x + dx : dx, y: 0, ret: 0, igjen: 0, totalt: 1, hp: 1, nivå: 1, nr: 880000 + q, arbeid: null, mat: {} })); Lq.bygg.push(...nye);
          const st = Leir.steg(Lq, 0.0001, 0); nh.regler = st.batKap === 40 && Leir.bryter(Lq, 880000) === true && Leir.steg(Lq, 0.0001, 0).mangler.has(880000) && Leir.bryter(Lq, 880000) === false;
          await vent(1300); const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (!lm.classList.contains('på')) lk.click(); LeirSpill.fane('bygg'); await vent(200); nh.oversikt = !!lm.querySelector('.strom') && lm.querySelectorAll('.strom [data-bryter]').length >= 1 && /Batteri/.test(lm.querySelector('.strom').textContent); lk.click();
          Lq.bygg.splice(Lq.bygg.length - 2, 2); Lq.batteri = 0; NarHud.tegnVarsler(); nh.varsler = !!document.getElementById('varsler'); ut.nh = nh; }
        Object.assign(I, Utstyr.ny()); try { localStorage.removeItem('riksbrudd-utstyr'); } catch (e3) { /* ok */ } US.vis(); }
      ENHETER.splice(ENHETER.indexOf(e), 1); K.hp = 100; Gange.stopp();
      // tilbake som før
      SS.test = false; tempo = t0; Leir.MATERIALER.tre.pris = tre0; Leir.REGLER.salg = salg0; Leir.DRIVSTOFF.prisPerLiter = diesel0; FolkRegler.R.matPris = matpris0; Leir.MATERIALER.betong.pris = 30000; Leir.MATERIALER.stål.pris = 60000; S.penger = p0; F.moral = mor0; F.mat = mat0; F.personer.length = Math.min(F.personer.length, n0);
      SS.O().liste.length = 0; SS.T().aktiv = 0; SS.T().nesteSpill = SS.T().nesteEkte = Infinity; SS.H().åpen = null; SS.H().nesteSpill = SS.H().nesteEkte = Infinity; for (const k of ['riksbrudd-trussel', 'riksbrudd-marked', 'riksbrudd-oppdrag', 'riksbrudd-hendelser']) try { localStorage.removeItem(k); } catch (e2) { /* ok */ }
      return ut; });
    const spok = !sp.uten && sp.stille && sp.marked && sp.oppdrag >= 1 && sp.post && sp.fullført && sp.angrep && sp.røvere >= 1 && sp.unna && sp.seier && sp.hendelse && sp.valg === 2 && sp.lukket && sp.venn && sp.bom && sp.treff && sp.mag < 30 && sp.skade && sp.våpen0 === 'Automatgevær' && sp.våpen1 === 'Pistol' && sp.pistol && sp.kjøpt && sp.hagle && sp.sekk && sp.helse && sp.sekkLukket && sp.vekt > 5 && sp.funn && !!sp.ov && Object.values(sp.ov).every(Boolean) && !!sp.nh && Object.values(sp.nh).every(Boolean);
    if (!spok) { feil++; console.log(JSON.stringify(sp)); }
    console.log(`${spok ? 'ok  ' : 'FEIL'} ${navn} angrep, marked, oppdrag, kamp, hendelser og venner: stille i testene, markedet flytter prisene, ${sp.oppdrag} oppdrag og ett fullført, ${sp.røvere} røverlag slått tilbake, en hendelse med to valg, vennelenke, treff og bom, skade når røverne er nær; sekken: ${sp.våpen0} og ${sp.våpen1}, hagle kjøpt og avfyrt, førstehjelp, ${sp.vekt} kg; overlevelse: ferdighetene vokser og står i sekken, strømnettet og vannet svikter, brønnen redder moralen; skjermbildet med helse, våpen og våpenet i hånda, detaljert helikopter, strømoversikt med brytere`);
    // VAKT det som ble igjen etter en leting: ligger i huset til lageret har plass, og hentes da uten ny leting.
    const rs = await pg.evaluate(() => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !window.LeteSpill || !LeteSpill.hent) return { uten: true };
      const lett = LeteSpill.lett(), i = 7654321, P = { bygg: { i } }, før = L.lager.tre || 0, ut = {}; lett.set(i, [0, 0, { tre: 2 }]);
      L.lager.tre = Leir.lagerplass(L); ut.fullt = !LeteSpill.plassTil(LeteSpill.restAv(P)); L.lager.tre = 0; ut.plass = LeteSpill.plassTil(LeteSpill.restAv(P));
      const r = LeteSpill.hent(P); ut.fikk = r && r.fikk.tre; ut.tomt = !LeteSpill.restAv(P); ut.lager = L.lager.tre; ut.husket = lett.has(i);
      L.lager.tre = før; lett.delete(i); return ut; });
    const rsok = !rs.uten && rs.fullt && rs.plass && rs.fikk === 2 && rs.tomt && rs.lager === 2 && rs.husket;
    if (!rsok) { feil++; console.log(JSON.stringify(rs)); }
    console.log(`${rsok ? 'ok  ' : 'FEIL'} ${navn} det som ble igjen: venter når lageret er fullt, hentes (${rs.fikk} m³ tre) når det er plass, og huset er tomt etterpå`);
    // VAKT drivhus (modellen har spanter tvers gjennom): plantebed inne, og modellen i scenen skjules bare mens du står inne i huset.
    const dh = await pg.evaluate(async () => { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L) return { uten: true };
      const u = R3.ut, R = R3, dr = { id: L.neste++, type: 'drivhus', x: u.cx + 150, y: u.cy - 60, ret: .2, igjen: 0, totalt: 60, pris: 0, mat: {}, nivå: 1, hp: 1, nr: L.nesteJobb++, arbeid: null }; L.bygg.push(dr);
      const dukke = new THREE.Object3D(); dukke.userData.id = dr.id; R.scene.add(dukke);
      Gange.start(); const sett = (x, y) => { R.bane.x = x; R.bane.y = y; const k = Gange.kropp(); k.x = x; k.y = y; k.vx = k.vy = 0; };
      Interior3d.oppdater(true); const e = Interior3d.egne().find(q => q.P.bygg.i === 9000000 + dr.id), ut = { registrert: !!e };
      if (e) { const P = e.P, D = P.dør; sett(D.x + D.uy * 5, D.y - D.ux * 5); for (let i = 0; i < 12; i++) Interior3d.oppdater(true); ut.plan = !!P.inne;
        if (P.inne) { ut.bed = P.inne.møbler.filter(m => m.type === 'plantebed').length; const I = P.inne.inngang; ut.uteFør = dukke.visible;
          sett(I.inn[0] - I.nx, I.inn[1] - I.ny); Interior3d.oppdater(true); ut.inne = Interior3d.inne(R.bane.x, R.bane.y) === P; ut.skjult = !dukke.visible;
          sett(I.x + I.nx * 4, I.y + I.ny * 4); Interior3d.oppdater(true); ut.uteEtter = dukke.visible; } }
      Gange.stopp(); R.scene.remove(dukke); L.bygg.splice(L.bygg.indexOf(dr), 1); Interior3d.oppdater(true); return ut; });
    const dhok = !dh.uten && dh.registrert && dh.plan && dh.bed >= 2 && dh.uteFør && dh.inne && dh.skjult && dh.uteEtter;
    if (!dhok) { feil++; console.log(JSON.stringify(dh)); }
    console.log(`${dhok ? 'ok  ' : 'FEIL'} ${navn} drivhus: ${dh.bed} plantebed inne, modellen skjult bare mens du står inne`);
    // VAKT dyr (spill/dyr3d.js): sauer på heia ved Dombås om sommeren, ingen sau om vinteren, rein ved Snøhetta også om vinteren,
    // ingen dyr i hus, vann eller svevende (Dombås sentrum og heia), og alle modellene kompilerer (shaderfeil = feil i nettleseren)
    const dy = await pg.evaluate(async () => { while (R3.bygger) await new Promise(r => setTimeout(r, 100));
      const tell = P => Object.fromEntries(Object.entries(P).map(([k, a]) => [k, a.length / 3])), feil = (s, felt) => Object.keys(s.dyr || {}).reduce((a, k) => a + (s[felt][k] || 0), 0);
      const hei = await bygg3d(201400, 6893300, 900), s = Vakt3d.sjekk(hei, 'sommer'), by = Vakt3d.sjekk(await bygg3d(193300, 6896300, 900), 'sommer');
      const fjell = await bygg3d(205000, 6921000, 900);
      return { sommer: s.dyr, vinter: tell(Dyr3d.punkter(hei, 'vinter')), fjellVinter: tell(Dyr3d.punkter(fjell, 'vinter')), by: by.dyr,
        iHus: feil(s, 'iHus') + feil(by, 'iHus'), svever: feil(s, 'svever') + feil(by, 'svever'), iVann: feil(s, 'iVann') + feil(by, 'iVann'), eks: s.eksempel.concat(by.eksempel), tri: Dyr3d.prøvShadere(R3) }; });
    const dok = dy.sommer && dy.sommer.sau > 0 && !dy.vinter.sau && dy.fjellVinter.rein > 0 && dy.iHus + dy.svever + dy.iVann <= 2 && Object.keys(dy.tri).length === 5; if (!dok) feil++;
    console.log(`${dok ? 'ok  ' : 'FEIL'} ${navn} dyr i 3D: heia om sommeren ${JSON.stringify(dy.sommer)}, om vinteren ${JSON.stringify(dy.vinter)}, Snøhetta om vinteren ${JSON.stringify(dy.fjellVinter)}, Dombås ${JSON.stringify(dy.by)}; i hus ${dy.iHus}, svever ${dy.svever}, i vann ${dy.iVann}; trekanter per dyr ${JSON.stringify(dy.tri)}${dok ? '' : ' ' + JSON.stringify(dy.eks)}`);
    // VAKT kraftledninger (spill/kraft3d.js): dataene lastes, mastene i utsnittet står på bakken (fot innen 0,5 m), ingen trær i ryddebeltet
    const kr = await pg.evaluate(() => window.KRAFT_SJEKK), krok = kr && kr.lastet && kr.linjer > 100 && kr.master > 5 && kr.spenn > 3 && kr.svever === 0 && kr.iBelte === 0 && kr.trær > 0; if (!krok) feil++;
    console.log(`${krok ? 'ok  ' : 'FEIL'} ${navn} kraftledninger: ${JSON.stringify(kr)}`);
    // kompass og minikart (spill/kompass.js): kameraet mot nord/øst gir N/Ø midt på båndet, også når du går; minikartet er tegnet; ☰ slår av og på
    const rammer = n => pg.evaluate(n => new Promise(r => { const f0 = R3.renderer.info.render.frame; const f = () => (R3.renderer.info.render.frame - f0 >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
    const retn = async (yaw, fot) => { await pg.evaluate(([yaw, fot]) => { if (fot) { if (!R3.fot) Gange.start(); R3.fot.a = yaw; R3.fot.pitch = 0; } else { if (R3.fot) Gange.stopp(); R3.bane.yaw = yaw; } }, [yaw, fot]); await rammer(2);
      return pg.evaluate(() => { const d = R3.cam.getWorldDirection(new THREE.Vector3()), l = Math.hypot(d.x, d.y) || 1, m = Kompass.midt(); return { tekst: m && m.tekst, øst: d.x / l, nord: d.y / l }; }); };
    const kN = await retn(0), kØ = await retn(-Math.PI / 2), kgØ = await retn(-Math.PI / 2, true), kgS = await retn(Math.PI, true); await retn(0);
    await new Promise(r => setTimeout(r, 400)); await rammer(2);
    const mini = await pg.evaluate(() => ({ synes: getComputedStyle(document.getElementById('minikart')).display !== 'none', bånd: getComputedStyle(Kompass.bånd).display !== 'none', fylt: Kompass.fylt() }));
    const vis = sel => pg.evaluate(s => getComputedStyle(document.querySelector(s)).display !== 'none', sel);
    // knappene trykkes i siden (pg.click venter på rammer, som er trege i 3D på tre profiler samtidig)
    const trykk = (...id) => pg.evaluate(id => id.forEach(i => document.getElementById(i).click()), id);
    await trykk('meny', 'vis-kompass', 'vis-minikart'); await new Promise(r => setTimeout(r, 450));
    const av = { bånd: await vis('#kompass'), mini: await vis('#minikart') };
    await trykk('vis-kompass', 'vis-minikart'); await new Promise(r => setTimeout(r, 450));
    const igjen = { bånd: await vis('#kompass'), mini: await vis('#minikart') }; await trykk('meny');
    const kok = kN.tekst === 'N' && kN.nord > .9 && kØ.tekst === 'Ø' && kØ.øst > .9 && kgØ.tekst === 'Ø' && kgØ.øst > .9 && kgS.tekst === 'S' && kgS.nord < -.9
      && mini.synes && mini.bånd && mini.fylt > .5 && !av.bånd && !av.mini && igjen.bånd && igjen.mini; if (!kok) feil++;
    console.log(`${kok ? 'ok  ' : 'FEIL'} ${navn} kompass: mot nord «${kN.tekst}», mot øst «${kØ.tekst}», går mot øst «${kgØ.tekst}», går mot sør «${kgS.tekst}»; minikart ${Math.round(mini.fylt * 100)} % tegnet; ☰ av: bånd ${!av.bånd}, minikart ${!av.mini}, på igjen: ${igjen.bånd && igjen.mini}`);
    // dag og natt (spill/natt3d.js): stjerner synlige en klar vinternatt og borte midt på dagen, månefasen 31. jan. 2023 (10 døgn etter
    // nymånen 21. jan.), værskiftet går jevnt over spilltiden (ingen hopp > 6 % per minutt), og ingen shaderfeil (fanges som feil i nettleseren)
    const nt = await pg.evaluate(async () => {
      const S = VaerSpill.S, t0 = tid, ramme = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      Vaer.settÅrstid(S, 'vinter', tid); Vaer.låsVær(S, 'klart'); tid = 17 * TIME; VaerSpill.straks(); R3.lysTid = null; await ramme(); await ramme();
      NATT.prøvShadere(R3);
      const H = NATT.himmel, natt = { stj: NATT.stjerner, synlig: !!(H && H.stjerner.visible && H.stjerner.parent), fase: NATT.måne && NATT.måne.fase, mørke: NATT.mørke, himmel: R3.himmelLys.intensity };
      tid = 7 * TIME; VaerSpill.straks(); R3.lysTid = null; await ramme(); await ramme();
      const dag = { stj: NATT.stjerner, synlig: H.stjerner.visible };
      Vaer.settÅrstid(S, 'sommer', tid); Vaer.låsVær(S, 'auto'); S.vær = 'klart'; S.til = tid; let maks = 0, før = null;
      for (let i = 0; i < 120; i++) { tid += 1; Vaer.steg(S, tid, () => .8); VaerSpill.oppdater(); const v = VAER.regel;
        if (før) for (const k of ['sikt', 'dis', 'sky', 'regn']) maks = Math.max(maks, Math.abs(v[k] - før[k])); før = { ...v }; }
      const slutt = { vær: S.vær, regn: VAER.regel.regn };
      Vaer.låsVær(S, 'klart'); tid = t0; VaerSpill.straks(); R3.lysTid = null; await ramme();
      return { natt, dag, maks, slutt }; });
    const ntok = nt.natt.synlig && nt.natt.stj > .5 && nt.natt.himmel >= .42 && !nt.dag.synlig && nt.dag.stj < .01 && Math.abs(nt.natt.fase - .342) < .02 && nt.maks < .06 && nt.slutt.vær === 'regn' && nt.slutt.regn === 1;
    if (!ntok) { feil++; console.log(JSON.stringify(nt)); }
    console.log(`${ntok ? 'ok  ' : 'FEIL'} ${navn} dag og natt: stjerner ${nt.natt.stj.toFixed(2)} en vinternatt (himmellys ${nt.natt.himmel.toFixed(2)}), ${nt.dag.stj.toFixed(2)} kl. 13; månefase ${nt.natt.fase && nt.natt.fase.toFixed(3)} 31. jan.; regnet kom med største endring ${nt.maks.toFixed(3)} per minutt`);
    // bekker (NVE Elvenett): lastet, vannbåndet i 3D i lia ovenfor Dombås ligger på terrenget (ikke svevende > 1 m eller begravd)
    const bk = await pg.evaluate(async () => {
      while (R3.bygger) await new Promise(r => setTimeout(r, 100));
      await nytt3dUtsnitt(193135, 6897627, 800); R3.bane = { x: 0, y: 0, avst: 250, pitch: .5, yaw: .6 };
      await new Promise(r => { let n = 0; const f = () => (++n > 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const m = R3.bekkMesh, S = window.BEKKER_STAT || {}, r = { linjer: S.linjer, bånd: S.bånd3d, tri: S.trekanter, kulvert: S.kulvert, kilde: BEKKER.STAT.kilde, kraftKilde: Kraft3d.lag.STAT.kilde, iScene: !!m && m.parent === R3.scene, min: 9, maks: -9, n: 0 };
      if (m) { const p = m.geometry.attributes.position, ray = new THREE.Raycaster();
        for (let k = 1; k < p.count; k += 3 * 7) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); ray.set(new THREE.Vector3(x, y, z + 100), new THREE.Vector3(0, 0, -1));
          const hit = ray.intersectObject(R3.mesh)[0]; if (!hit) continue; const d = z - hit.point.z; r.min = Math.min(r.min, d); r.maks = Math.max(r.maks, d); r.n++; } }
      return r; });
    const bkok = bk.linjer > 1000 && bk.bånd > 0 && (!NVE || (bk.kilde === 'release' && bk.kraftKilde === 'release')) && bk.iScene && bk.n > 20 && bk.maks < 1 && bk.min > -.3; if (!bkok) feil++;
    console.log(`${bkok ? 'ok  ' : 'FEIL'} ${navn} bekker 3D: ${bk.linjer} lastet, ${bk.bånd} vannbånd (${bk.tri} trekanter) ved Dombås (kilde ${bk.kilde}/${bk.kraftKilde}, ${bk.kulvert} kulvertkutt), høyde over terrenget ${bk.min.toFixed(2)}–${bk.maks.toFixed(2)} m (${bk.n} punkt)`);
    // VAKT bygging i biter (15. nov, brukeren fikk hakk når et nytt område lastet: hovedtråden sto 0,3–0,7 s i ett strekk). Et nytt
    // utsnitt bygges nå i små biter med pust mellom (pust/iStriper/kjørAsynk i index.html), og det tunge i selve byttet lages på
    // forhånd (forbered3d: terrengnettet, trærnes plass, husnettene, hindringene og vegene fra liv3d.js). Vakten: utsnittet på skjermen
    // er satt inn fra det forberedte; det ble tatt mange pust under en bygging; og samme utsnitt bygget UTEN forberedelsen (sett3d
    // lager alt selv) gir de samme tallene – terrengnett, trær, hus, veger og vegnett. (Uten forberedelsen er feilen lagt inn med
    // vilje: stemmer tallene ikke, har forberedelsen mistet eller lagt til noe.)
    const bib = await pg.evaluate(async () => { const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const stat = () => { const k = {}; R3.scene.traverse(o => { if (o.isMesh || o.isLine || o.isPoints) { const s = (o.userData && o.userData.kilde) || 'index'; k[s] = (k[s] || 0) + 1; } });
        return { terreng: R3.mesh.geometry.index.count, trær: (R3.treLOD || []).reduce((s, l) => s + l.n, 0), hus: (R3.husMesh || []).length, liv: k.liv3d || 0, veger: (R3.ut.veger || []).length, hindre: R3.hindre ? Object.keys(R3.hindre).length : -1 }; };
      // (utsnittet ved Dombås fra bekkevakten over: nært, med trær, hus og veger)
      const u0 = R3.ut, a = stat(), forberedt = R3.forberedt, p0 = pustAntall;
      const u2 = await bygg3d(u0.cx, u0.cy, u0.S), pust = pustAntall - p0, utenKlar = !u2.klar; sett3d(u2); await vent(3);
      const b = stat(), uten = R3.forberedt === false, gl = R3.renderer.getContext().getError();
      // og tilbake gjennom den vanlige vegen (med forberedelsen), så resten av testene står på et forberedt utsnitt
      await nytt3dUtsnitt(u0.cx, u0.cy, u0.S); await vent(3); const c = stat();
      return { a, b, c, forberedt, uten, utenKlar, pust, igjen: R3.forberedt, gl }; });
    const like = (x, y) => ['terreng', 'trær', 'hus', 'liv', 'veger', 'hindre'].every(k => x[k] === y[k]);
    const bibok = bib.forberedt === true && bib.uten && bib.utenKlar && bib.igjen === true && bib.pust > 10 && like(bib.a, bib.b) && like(bib.a, bib.c) && bib.a.terreng > 1000 && bib.a.trær > 0 && bib.a.liv > 0 && bib.gl === 0;
    if (!bibok) { feil++; console.log(JSON.stringify(bib)); }
    console.log(`${bibok ? 'ok  ' : 'FEIL'} ${navn} bygging i biter: ${bib.pust} pust under en bygging; forberedt og uforberedt bytte gir like utsnitt (terreng ${bib.a.terreng}, trær ${bib.a.trær}, hus ${bib.a.hus}, veger ${bib.a.veger}, vegnett ${bib.a.liv})`);
    // VAKT minne i 3D (12. nov): 3D slås av og på to ganger ved Dombås. Grafikkortet skal ikke ha flere geometrier eller teksturer etter
    // andre gang enn etter første (før: + 14 geometrier og + 1–2 teksturer per gang, terrengnettet og småtingene ble aldri frigjort),
    // instansnettene som tas ut av scenen skal være frigjort (dispose), det gamle utsnittet skal ikke huskes (fire gamle holdt flere
    // hundre MB), og vannmasken skal ha samme form i alle modulene ({ W, d } – med to former kunne man gå på vannet).
    const mn = await pg.evaluate(async () => {
      const ferdig = async () => { while (R3.bygger || !R3.ut) await new Promise(r => setTimeout(r, 100)); await new Promise(r => { let n = 0; const f = () => (++n > 3 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); };
      const borte = new WeakSet(), od = THREE.InstancedMesh.prototype.dispose; THREE.InstancedMesh.prototype.dispose = function () { borte.add(this); return od.call(this); };
      const les = () => ({ geo: R3.renderer.info.memory.geometries, tex: R3.renderer.info.memory.textures }), inst = () => { const l = []; R3.scene.traverse(o => { if (o.isInstancedMesh) l.push(o); }); return l; };
      const r = { m: [], glemt: 0, gammelt: false }; R3.bane.avst = 300;
      for (let i = 0; i < 2; i++) { const før = inst(), gml = R3.ut; await slå3d(false); await slå3d(true); await ferdig(); r.m.push(les());
        const nå = new Set(inst()); r.glemt += før.filter(o => !nå.has(o) && !borte.has(o)).length; if (RessursSpill.sisteU() === gml) r.gammelt = true; }
      THREE.InstancedMesh.prototype.dispose = od;
      const u = R3.ut; r.vann = !u.vannData || !!(u.vannData.d && u.vannData.W); r.S = Math.round(u.S); return r; });
    const mnok = mn.m[1].geo <= mn.m[0].geo && mn.m[1].tex <= mn.m[0].tex && mn.glemt === 0 && !mn.gammelt && mn.vann; if (!mnok) feil++;
    console.log(`${mnok ? 'ok  ' : 'FEIL'} ${navn} minne i 3D: 3D av og på to ganger (utsnitt ${mn.S} m) – geometrier ${mn.m[0].geo} -> ${mn.m[1].geo}, teksturer ${mn.m[0].tex} -> ${mn.m[1].tex}, ${mn.glemt} instansnett ikke frigjort${mn.gammelt ? ', det gamle utsnittet huskes fortsatt' : ''}${mn.vann ? '' : ', vannmasken har feil form'}`);
    await pg.click('#v3d');
    const bk2 = await pg.evaluate(async () => { Object.assign(kam, { x: 193135, y: 6897627, m: 4 }); skitten = true; await new Promise(r => setTimeout(r, 400)); return window.BEKKER_STAT.tegnet2d; });
    const bk2ok = bk2 > 0; if (!bk2ok) feil++;
    console.log(`${bk2ok ? 'ok  ' : 'FEIL'} ${navn} bekker 2D: ${bk2} bekker tegnet ved Dombås`);
    const d3ok =Math.abs(d3.h - 2287) < 40 && d3.bilder > 2 && d3.trekanter > 1000; if (!d3ok) feil++;
    console.log(`${d3ok ? 'ok  ' : 'FEIL'} ${navn} 3D: Snøhetta ${d3.h} moh. i 3D-terrenget (${d3.n}×${d3.n} punkter), ${d3.bilder} bilder tegnet, ${d3.trekanter} trekanter`);
    if (err.length) { feil++; console.log('FEIL i nettleseren:', err.slice(0, 5)); }
    await kt.close();
  }));
  await b.close(); srv.kill();
  console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
