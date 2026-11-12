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
    await pg.evaluate(() => { if (window.AI) AI.på = false; if (window.VaerSpill) { Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.oppdater(); } });   // klart vær i testene (sikten ellers tilfeldig)   // motstanderne (S8) står stille under de andre testene; S8 testes for seg
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
      const b3 = await pg.evaluate(() => { const b = window.testBru, a = b.deler[0], k = (a.length >> 2) << 1, q = brupunkt3(b, a[k], a[k + 1]), o = q && finnInfra3d(q[0], q[1]);
        return { n: R3.ut.bru ? R3.ut.bru.antall : 0, mesh: !!R3.bruMesh || !!(R3.infra3d && R3.infra3d.length), treff: o ? o.e.navn : null, navn: b.e.navn }; });
      // vegetasjon (spill/vegetasjon3d.js): minst tre treslag i scenen ved Jora (elv, skog, myr), og ingen trær, blomster, bregner eller siv
      // i vannet (vannmasken) eller på vegen; kameraet ned til bakken (avst 80) så plantene rundt kameraet lages
      await pg.evaluate(() => { R3.bane.avst = 80; R3.bane.pitch = .3; R3.lodVed = null; tegn3d(); tegn3d(); });
      const veg = await pg.evaluate(() => { const V3 = window.Vegetasjon3d, u = R3.ut; if (!V3) return null; const ut = V3.utvalg(4000), feil = [];
        for (const [x, y, art] of ut) if (V3.iVann(x, y) || (u.påVeg && u.påVeg(x, y))) feil.push([Math.round(x), Math.round(y), art]);
        return { slag: V3.treslag(), antall: V3.antall(), n: ut.length, planter: ut.filter(q => ['blomst', 'bregne', 'siv'].includes(q[2])).length, feil: feil.slice(0, 5), nFeil: feil.length }; });
      const vegOk = veg && veg.slag.length >= 3 && veg.nFeil === 0 && veg.n > 100; if (!vegOk) feil++;
      console.log(`${vegOk ? 'ok  ' : 'FEIL'} ${navn} vegetasjon i 3D: treslag ${veg && veg.slag.join(', ')}; ${veg && veg.n} sjekket (${veg && veg.planter} planter), ${veg && veg.nFeil} i vann eller på veg ${veg && veg.nFeil ? JSON.stringify(veg.feil) : ''}`);
      // VAKT (bruer i 3D, spill/infra3d.js): modellene finnes i scenen, søylene og landkarene står på bakken (bunnen ikke over terrenget og
      // ikke mer enn 2,5 m ned i det), dekket ligger over terrenget langs hele brua, vegene er løftet opp på dekket, og en sprengt bru har gap
      const bv = await pg.evaluate(async () => {
        const sjekk = () => { const u = R3.ut, ms = u.bruer3d || [], z = (x, y) => (hoyde3d(x + u.cx, y + u.cy) - u.h0) * R3.EX;
          const søyler = ms.flatMap(m => m.søyler), svever = søyler.filter(s => s.bunn > z(s.x, s.y) + .05), dype = søyler.filter(s => !s.landkar && s.bunn < z(s.x, s.y) - 2.5);
          const mesh = (R3.infra3d || []).find(m => m.name === 'infra3d'), tri = mesh && R3.scene.children.includes(mesh) ? mesh.geometry.attributes.position.count / 3 : 0;
          return { ms, u, bruer: ms.length, søyler: søyler.filter(s => !s.landkar).length, landkar: søyler.filter(s => s.landkar).length, svever: svever.length, dype: dype.length, tri,
            under: ms.filter(m => m.D.some(d => d.z < z(d.x, d.y) + (d.s > 6 && d.s < m.L - 6 ? .5 : .05))).map(m => m.navn), typer: [...new Set(ms.map(m => m.sort))].join('/'), løftet: ms.reduce((a, m) => a + (m.løftet || 0), 0) }; };
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
        bv.gap && bv.gap.sprengt && bv.gap.stykker === 2 && bv.gap.iGap === 0 && bv.etter; if (!bvok) feil++;
      console.log(`${bvok ? 'ok  ' : 'FEIL'} ${navn} bruer i 3D: ${bv.a.bruer} modeller (${bv.a.typer}, ${bv.a.tri} trekanter), ${bv.a.søyler} søyler og ${bv.a.landkar} landkar – ${bv.a.svever} svever, ${bv.a.dype} for dype; `
        + `dekket under terrenget: ${bv.a.under.join(', ') || 'ingen'}; ${bv.a.løftet} vegpunkter løftet opp på dekket; sprengt «${bv.navn}»: ${bv.gap ? bv.gap.stykker + ' stykker, ' + bv.gap.iGap + ' vegpunkter i gapet' : 'ingen'}, hel igjen etterpå: ${bv.etter}`);
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
      Vaer.låsVær(VaerSpill.S, 'storm'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(3); await new Promise(r => setTimeout(r, 1200)); await vent(2); const st = Vind3d.sjekk(), k = Vind3d.U().uVindK.value;
      Vaer.låsVær(VaerSpill.S, 'tåke'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(3); const tå = Vind3d.VIND.grå || 0;
      Vaer.låsVær(VaerSpill.S, 'klart'); VaerSpill.oppdater(); VaerSpill.straks(); await vent(2); return { ...st, k, tå, glFeil: gl.getError() }; });
    const viok = vi.bølger && vi.amp > .8 && vi.skum > 0 && vi.k > 2 && /m\/s/.test(vi.status) && vi.tå > .5 && vi.glFeil === 0; if (!viok) feil++;
    console.log(`${viok ? 'ok  ' : 'FEIL'} ${navn} bølger, vind og tåke: storm ${vi.fart.toFixed(1)} m/s, bølger ${vi.bølger} (høyde ×${vi.amp.toFixed(2)}, skum ${vi.skum.toFixed(2)}), trær ×${vi.k.toFixed(2)}, status «${vi.status}», tåke grå himmel ${vi.tå.toFixed(2)}, GL-feil ${vi.glFeil}`);
    // VAKT grafikk (spill/kvalitet.js, 12. nov, brukeren: «spillet går alt for hakkete»): «Lav» gir lavere pikseltetthet, kortere detaljavstand for
    // trærne og ingen gress/blomster; tilbake til auto etterpå
    const kv = await pg.evaluate(async () => { const vent = n => new Promise(r => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      KVAL.bytt('lav'); await vent(3); const lav = { pr: R3.pr, nivå: KVAL.nivå, tre: KVAL.p.tre, gress: !!(R3.gressMesh && R3.gressMesh.visible) };
      KVAL.bytt('auto'); await vent(2); return { lav, auto: KVAL.valg, knapp: (document.getElementById('vis-grafikk') || {}).textContent || '' }; });
    const kvok = kv.lav.nivå === 'lav' && kv.lav.pr <= .75 && kv.lav.tre < .5 && !kv.lav.gress && kv.auto === 'auto' && /Grafikk/.test(kv.knapp); if (!kvok) feil++;
    console.log(`${kvok ? 'ok  ' : 'FEIL'} ${navn} grafikk: lav gir pikseltetthet ${kv.lav.pr}, trær ×${kv.lav.tre}, gress ${kv.lav.gress}; knapp «${kv.knapp}»`);
    // VAKT kompakt skjerm (spill/kompakt.js, 12. nov, brukeren: «Dette er ikke god nok UI» om iPhone på tvers): på mobil én rad status,
    // kildeteksten på én linje og fartsknappene som én knapp; på PC som før
    const ko = await pg.evaluate(() => { const k = Kompakt.sjekk(), h = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : -1; };
      const synlige = ['sp1', 'sp2', 'sp3', 'sp4'].filter(id => { const e = document.getElementById(id); return e && e.offsetParent !== null; }).length;
      return { kort: k.kort, stats: h('.stats'), kilde: h('#kilde'), fart: synlige, mobil: VW < 900 }; });
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
      let tb = 0; if (u.påBane && u.trær) for (const k in u.trær) for (let q = 0; q < u.trær[k].length; q += 5) if (u.påBane(u.trær[k][q], u.trær[k][q + 1])) tb++;
      window.BANE_SJEKK = { lag: !!(LAGFILER && LAGFILER.utveg), n: (u.baner || []).length, el: (u.baner || []).filter(b => b.el).length, trær: tb }; return Vakt3d.sjekk(u); });
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
    // VAKT jernbane i 3D (spill/bane3d.js): Dovrebanen/Raumabanen finnes i Dombås-utsnittet (når utveg-flisene er lastet), er elektrisk og har ingen trær på sporet
    const bs = await pg.evaluate(() => window.BANE_SJEKK), bok = bs && (!bs.lag || (bs.n > 0 && bs.el > 0 && bs.trær === 0)); if (!bok) feil++;
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
