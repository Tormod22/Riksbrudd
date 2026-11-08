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
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });   // WebGL for 3D uten skjermkort
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
    // Spillet på flisene: alle lag får siktfelt, 1. lag får rute og går, patruljen går sin runde.
    await pg.waitForFunction(() => ENHETER.every(s => s.sikt), null, { timeout: 30000 });
    const sikt = await pg.evaluate(() => ENHETER.map(s => [s.navn, Math.round(s.siktVidde), s.her && Terreng.KLASSE[s.her.k]]));
    const siktOk = sikt.every(([, r]) => r >= 500 && r <= 12800); if (!siktOk) feil++;
    console.log(`${siktOk ? 'ok  ' : 'FEIL'} ${navn} siktfelt: ` + sikt.map(([n, r, k]) => `${n} ${r} m (${k})`).join(', '));
    await pg.evaluate(() => { ordre(ENHETER[0], 201500, 6900500); });
    await pg.waitForFunction(() => ENHETER[0].sti, null, { timeout: 20000 });
    const r = await pg.evaluate(() => ({ t: ENHETER[0].timerIgjen, n: ENHETER[0].sti.length, x: ENHETER[0].x, y: ENHETER[0].y }));
    await pg.evaluate(() => { tempo = 60; }); await pg.waitForTimeout(2500);
    const e2 = await pg.evaluate(() => ({ x: ENHETER[0].x, y: ENHETER[0].y, p: !!ENHETER[3].sti }));
    const flytt = Math.hypot(e2.x - r.x, e2.y - r.y), ruteOk = r.t > 1 && r.t < 3 && flytt > 500 && e2.p; if (!ruteOk) feil++;
    console.log(`${ruteOk ? 'ok  ' : 'FEIL'} ${navn} marsj: rute ${r.n} punkter, ${r.t.toFixed(2)} t (venter 1–3), gikk ${Math.round(flytt)} m på 2,5 s ved 60×, patruljen ${e2.p ? 'går' : 'står'}`);
    // Tåke: fienden er skjult når ingen av våre ser den. Kamp på åpent fjell: patruljen blir slått ut.
    const tåke = await pg.evaluate(() => { const f = ENHETER[3]; f.x = 203000; f.y = 6918600; f.sti = null; f.siktSkitten = true; f.roligTil = 1e9; return !synlig(f); });
    await pg.evaluate(() => { tempo = 0; const f = ENHETER[3]; [[0, -400, 50], [1, -450, -120]].forEach(([i, dx, dy]) => { const s = ENHETER[i]; s.x = f.x + dx; s.y = f.y + dy; s.sti = null; s.siktSkitten = true; }); });
    await pg.waitForFunction(() => [0, 1, 3].every(i => ENHETER[i].siktVed && Math.hypot(ENHETER[i].x - ENHETER[i].siktVed[0], ENHETER[i].y - ENHETER[i].siktVed[1]) < 1 && !ENHETER[i].siktJobb), null, { timeout: 20000 });
    const settNå = await pg.evaluate(() => synlig(ENHETER[3]));
    await pg.evaluate(() => { for (let i = 0; i < 12 * 60 * 10; i++) sim(.1); });   // 12 spilltimer
    const k = await pg.evaluate(() => ENHETER.map(s => Terreng.uteAvKamp(s.menn)));
    const kampOk = tåke && settNå && k[3] >= 6;   // 6 = Terreng.UTE_AV_KAMP if (!kampOk) feil++;
    console.log(`${kampOk ? 'ok  ' : 'FEIL'} ${navn} tåke og kamp: skjult på avstand ${tåke ? 'ja' : 'NEI'}, sett på 400 m ${settNå ? 'ja' : 'NEI'}, ute av kamp: ${k.join('/')} (patruljen sist)`);
    // 3D: bygges av flisene, viser riktig høyde, og en ordre kan gis
    await pg.click('#v3d'); await pg.waitForFunction(() => R3 && R3.ut && !R3.bygger, null, { timeout: 60000 });
    const d3 = await pg.evaluate(() => ({ h: Math.round(hoyde3d(203188, 6922980)), n: R3.ut.N }));
    await pg.click('#v3d');
    const d3ok = Math.abs(d3.h - 2287) < 40; if (!d3ok) feil++;
    console.log(`${d3ok ? 'ok  ' : 'FEIL'} ${navn} 3D: Snøhetta ${d3.h} moh. i 3D-terrenget (${d3.n}×${d3.n} punkter)`);
    if (err.length) { feil++; console.log('FEIL i nettleseren:', err.slice(0, 5)); }
    await pg.close();
  }
  await b.close(); srv.kill();
  console.log(feil ? `${feil} feil` : 'Alt i orden'); process.exit(feil ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(1); });
