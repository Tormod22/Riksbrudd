// VAKT «vindusstørrelse» (R17, funn 22 – brukeren på Windows: «Noe gikk galt … drawImage …» og svart kart etter at vinduet ble endret).
// Vinduet krympes til ingenting og tilbake flere ganger mens kartet tegnes (som når det minimeres eller dras), og i noen få
// vanlige størrelser. Kravet: ingen feil i siden, ingen «Noe gikk galt»-melding, tegneløkka går fortsatt (kartet tegnes på nytt
// etterpå), og drawImage med et tomt lerret kaster ikke (spill/trygtegn.js). Vindusstørrelsen settes tilbake.
module.exports = {
  navn: 'vindusstørrelse (krymp til 0 og tilbake uten feil)',
  kjør: async (pg) => {
    const feil = [], lytt = e => feil.push(String(e && e.message || e).slice(0, 200)); pg.on('pageerror', lytt);
    const før = pg.viewportSize(); const d = { feil: [] };
    try {
      d.tom = await pg.evaluate(() => { try { const c = document.createElement('canvas'); c.width = 0; c.height = 0; const g = document.createElement('canvas').getContext('2d'); g.drawImage(c, 0, 0);
        if (typeof OffscreenCanvas !== 'undefined') g.drawImage(new OffscreenCanvas(0, 5), 0, 0); return 'ok'; } catch (e) { return 'kastet: ' + e.message; } });
      if (d.tom !== 'ok') d.feil.push('drawImage med tomt lerret ' + d.tom);
      for (let r = 0; r < 6; r++) {
        await pg.evaluate(() => { const s = document.documentElement.style; s.width = '0px'; s.height = '0px'; document.body.style.display = 'none'; skitten = true; window.dispatchEvent(new Event('resize')); });
        await pg.waitForTimeout(150 + r * 60);
        await pg.evaluate(() => { const s = document.documentElement.style; s.width = ''; s.height = ''; document.body.style.display = ''; window.dispatchEvent(new Event('resize')); });
        await pg.waitForTimeout(120);
      }
      if (før) for (const [w, h] of [[320, 240], [1, 1], [Math.max(400, før.width >> 1), før.height], [før.width, 2]]) { await pg.setViewportSize({ width: w, height: h }); await pg.waitForTimeout(150); }
    } finally {
      await pg.evaluate(() => { const s = document.documentElement.style; s.width = ''; s.height = ''; document.body.style.display = ''; }).catch(() => {});
      if (før) await pg.setViewportSize(før).catch(() => {});
      await pg.evaluate(() => window.dispatchEvent(new Event('resize'))).catch(() => {});
      await pg.waitForTimeout(600);
    }
    // tegneløkka lever: et nytt bilde blir tegnet (2D: skitten nullstilles; 3D: rammetelleren øker)
    d.løkke = await pg.evaluate(async () => { const v = ms => new Promise(r => setTimeout(r, ms));
      if (typeof på3d !== 'undefined' && på3d && R3 && R3.renderer) { const a = R3.renderer.info.render.frame; sistAktiv = performance.now(); await v(800); return R3.renderer.info.render.frame > a || tempo === 0; }
      skitten = true; await v(500); return !skitten; });
    if (!d.løkke) d.feil.push('tegneløkka står etter at vinduet ble endret (kartet svart)');
    d.melding = await pg.evaluate(() => { const f = document.getElementById('feil'); return f && f.style.display === 'block' ? f.textContent.slice(0, 160) : ''; });
    if (/drawImage|OffscreenCanvas|Noe gikk galt/.test(d.melding)) { d.feil.push('melding: ' + d.melding); await pg.evaluate(() => typeof skjulMelding === 'function' && skjulMelding()); }
    pg.off('pageerror', lytt); if (feil.length) d.feil.push('feil i siden: ' + [...new Set(feil)].join(' | '));
    return { ok: !d.feil.length, tekst: d.feil.length ? d.feil.join('; ') : 'krympet til 0 og tilbake 6 ganger og i 4 størrelser: ingen feil, kartet tegnes', data: d };
  }
};
