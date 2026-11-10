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
          await new Promise(r => setTimeout(r, 1200)); r.k2.fps = +document.getElementById('sFps').textContent > 0;
          // menyen kan blas i: plassen holdes når den tegnes på nytt (brukeren 11. nov: «lar meg ikke bla ned»)
          const meny = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); lk.click(); meny.scrollTop = 250; const før = meny.scrollTop; lk.click(); lk.click();
          r.k2.bla = før > 100 && Math.abs(meny.scrollTop - før) < 2; lk.click();
          // K3 kontrollrommet: gå inn, lag uten radiokontakt vises ikke der de er, lag med kontakt melder seg, ute bare «sist meldt»
          const KS = KontrollromSpill, deg = KS.deg(), krom = L.bygg.find(b => b.type === 'kontrollrom'), blå = ENHETER.filter(e => e.side === 'blå' && !e.karakter);
          deg.x = krom.x; deg.y = krom.y; const inn = KS.gåInn(), mInne = KS.modus();
          const A = blå[0], B = blå[1]; A.x = LX + 6000; A.y = LY; A.sti = null; B.x = LX + 1000; B.y = LY; B.sti = null;
          await KS.sjekkKontakt(A); await KS.sjekkKontakt(B);
          const skjul = s => KROKER.skjul.some(f => f(s)), r3 = { inn, mInne, aKontakt: KS.info(A).kontakt, bKontakt: KS.info(B).kontakt, aSkjult: skjul(A), bSkjult: skjul(B) };
          KS.info(B).før = { marsj: true, ute: 0 }; KS.rapport(B, tid + 100); r3.melding = (KS.radiolog().slice(0, 5).find(m => /Framme/.test(m.tekst)) || KS.radiolog()[0] || {}).tekst;
          r3.skjerm = document.getElementById('kontrollrom').classList.contains('på');
          r3.ordreA = KROKER.kanOrdre.every(f => f(A)); KS.gåUt(); r3.mUte = KS.modus(); r3.bSkjultUte = skjul(B);
          KS.av(); r3.avNøytral = !skjul(A) && KROKER.innsyn.every(f => f(A)); r.k3 = r3;
          localStorage.removeItem(OppstartSpill.NØKKEL); localStorage.removeItem('riksbrudd-k2'); localStorage.removeItem('riksbrudd-k3'); return r; });
        const k1ok = k1.på && /tettsted/.test(k1.iBy || '') && k1.ute === null && k1.ferdig && k1.penger.replace(/\s/g, ' ') === '100 mill. kr' && k1.lagret && k1.fraksjon === 'Dovrefolket' && k1.base === 0 && k1.lag < 600 && k1.skjult && Math.abs(k1.sikt - 1.15) < 1e-9;
        if (!k1ok) { feil++; console.log(JSON.stringify(k1)); }
        const k2 = k1.k2 || {}, k2ok = k2.k2 && k2.k2.every(v => v === 'ok') && /kontrollrom/.test(k2.opptatt || '') && k2.penger === 100e6 - 6.6e6 - 15e6 - 8e6 - 3e6 && k2.bygg === 3 && k2.ferdig
          && k2.drivstoff === 100 && k2.strøm[1] === 8 && k2.strøm[0] === 8 && k2.strøm[2] === 0 && k2.lagret === 3
          && /Oppgrader/.test(k2.panel) && /Riv/.test(k2.panel) && /Flytt/.test(k2.panel) && k2.nivå === 2 && k2.riv === .9e6 && k2.gjerde === 'ok' && k2.port && k2.fps && k2.bla;
        if (!k2ok) { feil++; console.log(JSON.stringify(k2)); }
        const k3 = k1.k3 || {}, k3ok = k3.inn && k3.mInne === 'kontrollrom' && !k3.aKontakt && k3.bKontakt && k3.aSkjult && !k3.bSkjult && /Framme/.test(k3.melding || '')
          && k3.skjerm && k3.ordreA === false && k3.mUte === 'ute' && k3.bSkjultUte && k3.avNøytral;
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
    const d3 = await pg.evaluate(() => ({ h: Math.round(hoyde3d(203188, 6922980)), n: R3.ut.N, bilder: R3.renderer.info.render.frame, trekanter: R3.renderer.info.render.triangles }));
    // førsteperson: «Gå», hold W et sekund, kameraet står i øyehøyde og har flyttet seg; Esc flyr opp igjen
    await pg.click('#gaaknapp'); const f0 = await pg.evaluate(() => ({ på: !!R3.fot, x: R3.bane.x, y: R3.bane.y }));
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
    const gå = Math.hypot(f1.x - f0.x, f1.y - f0.y), fok = f0.på && gå > .3 && Math.abs(f1.over - 1.7) < .3 && !f2 && hopp && løp; if (!fok) feil++;
    console.log(`${fok ? 'ok  ' : 'FEIL'} ${navn} gå selv: gikk ${gå.toFixed(1)} m med W, øyehøyde ${f1.over.toFixed(2)} m, hopp: ${hopp}, løp: ${løp}, Esc flyr opp: ${!f2}`);
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
    await pg.click('#v3d');
    const d3ok = Math.abs(d3.h - 2287) < 40 && d3.bilder > 2 && d3.trekanter > 1000; if (!d3ok) feil++;
    console.log(`${d3ok ? 'ok  ' : 'FEIL'} ${navn} 3D: Snøhetta ${d3.h} moh. i 3D-terrenget (${d3.n}×${d3.n} punkter), ${d3.bilder} bilder tegnet, ${d3.trekanter} trekanter`);
    if (err.length) { feil++; console.log('FEIL i nettleseren:', err.slice(0, 5)); }
    await kt.close();
  }));
  await b.close(); srv.kill();
  console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
