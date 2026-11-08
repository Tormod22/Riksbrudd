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
(async () => {
  await new Promise(r => setTimeout(r, 800)); let feil = 0;
  const b = await chromium.launch();
  for (const [w, h, navn] of [[1400, 900, 'PC'], [390, 844, 'mobil']]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); const err = [];
    pg.on('pageerror', e => err.push(e.message)); pg.on('console', m => m.type() === 'error' && err.push(m.text()));
    await pg.goto('http://localhost:8765/dovre-fliser/'); await pg.waitForTimeout(3000);
    for (const [v, x, y, m, lo, hi] of VISNINGER) {
      await pg.evaluate(([x, y, m]) => { kam.x = x; kam.y = y; kam.m = m; skitten = true; peker = null; }, [x, y, m]);
      await pg.waitForFunction(() => VENTER.size === 0 && FERDIG.size > 0, null, { timeout: 20000 }); await pg.waitForTimeout(400);
      const s = await pg.evaluate(() => ({ h: hoydeVed(kam.x, kam.y), kb: Math.round(STAT.byte / 1024), req: STAT.req, z: niva() }));
      const ok = s.h != null && s.h >= lo && s.h <= hi; if (!ok) feil++;
      console.log(`${ok ? 'ok  ' : 'FEIL'} ${navn} ${v}: ${s.h == null ? '–' : Math.round(s.h)} moh. (venter ${lo}–${hi}), z${s.z}, totalt ${s.kb} KB i ${s.req} hentinger`);
    }
    if (err.length) { feil++; console.log('FEIL i nettleseren:', err.slice(0, 5)); }
    await pg.close();
  }
  await b.close(); srv.kill();
  console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
