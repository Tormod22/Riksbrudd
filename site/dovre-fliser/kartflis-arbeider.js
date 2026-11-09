'use strict';
// Bakgrunnstråd for kartflisene: samme kode som siden (kartflis.js), men komponeringen blokkerer ikke draing og zooming.
// Siden sender 'init' (kartfilene) og så 'flis' (lag en flis) eller 'hent' (hent dataene på forhånd); svaret er et ImageBitmap.
importScripts('/dovre-fliser/lib/pmtiles-4.3.0.js', '/dovre-fliser/kartflis.js?v=ec7d45ecc1');
let byte = 0, req = 0, kilde = '';
KF.vedBytes = (n, k) => { byte += n; req++; if (k) kilde = k; };
setInterval(() => { if (req) { postMessage({ type: 'bytes', n: byte, req, kilde }); byte = 0; req = 0; } }, 300);   // telleren på siden
KF.vedFeil = e => postMessage({ type: 'feil', melding: e && e.message || String(e) });
let klar; KF.klar = new Promise(ok => { klar = ok; });
onmessage = async ({ data: m }) => {
  if (m.type === 'init') {
    KF.kartTag = m.kartTag; KF.release = Promise.resolve(m.release); KF.data = m.data; KF.vis = m.vis;
    KF.norgeBlokker = m.norgeBlokker ? new Set(m.norgeBlokker) : null; KF.lagfiler = {};
    for (const [n, l] of Object.entries(m.filer)) KF.lagfiler[n] = l.map(f => Object.assign({}, f, { pm: new pmtiles.PMTiles(new Kilde(f.fil, f.tag)) }));
    for (const l of Object.values(KF.lagfiler)) for (const f of l) f.pm.getHeader().catch(() => {});   // innholdsfortegnelsene med en gang
    klar(); return;
  }
  if (m.type === 'hent') { flisData(m.z, m.x, m.y, m.valg).catch(() => {}); return; }
  if (m.type === 'flis') {
    try {
      const t = await komponer(m.z, m.x, m.y, m.valg), bm = t.c.transferToImageBitmap();
      postMessage({ id: m.id, bm, E: t.E }, t.E ? [bm, t.E.buffer] : [bm]);
    } catch (e) { postMessage({ id: m.id, feil: e && e.message || String(e) }); }
  }
};
