// Test av nettfeil i kartflisene (site/dovre-fliser/kartflis.js): tidsgrense på hentinger, reserven når kartlageret ikke svarer,
// og at et kartlag kommer tilbake etter et nettbrudd (pmtiles husker ellers den mislykkede hentingen for alltid).
// Uten nett: fetch byttes ut og leser Dovre-filene i site/dovre-fliser/data. Bruk: node pipeline/fliser/test_nett.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = path.join(__dirname, '..', '..', 'site', 'dovre-fliser');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// modus: 'ok' (filene leses), 'brudd' (som uten nett), 'heng' (svarer aldri – bare avbrudd stopper den)
let modus = 'ok', lager = 'ok'; const kall = [];
const svar = (data, status) => ({ ok: status === 200 || status === 206, status, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), json: async () => JSON.parse(Buffer.from(data).toString()) });
const falskFetch = (url, valg = {}) => new Promise((ja, nei) => {
  kall.push(url); const api = url.startsWith('/api/kart/'), m = api ? lager : modus;
  if (valg.signal) valg.signal.addEventListener('abort', () => { const e = new Error('avbrutt'); e.name = 'AbortError'; nei(e); });
  if (m === 'heng') return;
  if (m === 'brudd') return nei(new TypeError('Failed to fetch'));
  let fil, fra, til;
  if (api) { const d = url.split('/'); fil = d[4]; fra = +d[5]; til = fra + +d[6] - 1; }
  else { fil = url.split('/').pop(); const r = /bytes=(\d+)-(\d+)/.exec(valg.headers.Range); fra = +r[1]; til = +r[2]; }
  const f = path.join(D, 'data', fil); if (!fs.existsSync(f)) return ja(svar(Buffer.from('{}'), 404));
  const fd = fs.openSync(f, 'r'), buf = Buffer.alloc(til - fra + 1), n = fs.readSync(fd, buf, 0, buf.length, fra); fs.closeSync(fd); ja(svar(buf.subarray(0, n), 206));
});
const ctx = vm.createContext({ console: { error() {}, log: console.log }, fetch: falskFetch, AbortController, setTimeout, clearTimeout, TextDecoder, Uint8Array, DataView, Promise, Math, Error, TypeError,
  DecompressionStream: globalThis.DecompressionStream, Response: globalThis.Response, Blob: globalThis.Blob, ReadableStream: globalThis.ReadableStream });
ctx.globalThis = ctx; ctx.self = ctx; ctx.window = undefined;
vm.runInContext(fs.readFileSync(path.join(D, 'lib', 'pmtiles-4.3.0.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(D, 'kartflis.js'), 'utf8') + '\n;globalThis.T = { KF, Kilde, hentMedFrist, hentFlis, RÅ, G, span };', ctx);
const T = ctx.T, KF = T.KF;

(async () => {
  // 1) tidsgrense
  modus = 'heng'; let t0 = Date.now(), e1 = null;
  try { await T.hentMedFrist('/dovre-fliser/data/manifest.json', 150, 'json', { headers: { Range: 'bytes=0-10' } }); } catch (e) { e1 = e; }
  ok(e1 && /tidsgrense/.test(e1.message) && Date.now() - t0 < 1500, 'en henting som ikke svarer, gir «tidsgrense» etter fristen (' + (e1 && e1.message) + ')');
  modus = 'ok';
  const s = await T.hentMedFrist('/dovre-fliser/data/manifest.json', 2000, 'json', { headers: { Range: 'bytes=0-99999' } });
  ok(s.r.ok && s.data && s.data.filer, 'en henting som svarer, gir dataene');
  { const a = new AbortController(); let e2 = null; modus = 'heng'; const p = T.hentMedFrist('/x/y', 5000, 'json', { signal: a.signal }).catch(e => { e2 = e; }); a.abort(); await p; modus = 'ok';
    ok(e2 && e2.name === 'AbortError', 'avbrytes hentingen utenfra, er det fortsatt et avbrudd (ikke en tidsgrense)'); }

  // 2) kartlageret (/api/kart) svarer ikke: Dovre-filene brukes som reserve; lag med egen release (tag) gir feil
  const kilder = []; KF.vedBytes = (n, k) => kilder.push(k); KF.release = Promise.resolve(true); KF.kartTag = 'kart-test';
  const frist = vm.runInContext('FRIST_FLIS', ctx); ok(frist >= 10000 && frist <= 60000, 'fristen for kartfliser er ' + frist / 1000 + ' s');
  lager = 'brudd';
  const b = await new T.Kilde('vektor.pmtiles').getBytes(0, 127);
  ok(b.data.byteLength === 127 && kilder.pop() === 'Vercel', 'kartlageret nede: biten hentes fra Dovre-filene (reserve)');
  let e3 = null; try { await new T.Kilde('hus.pmtiles', 'kart-hus-test').getBytes(0, 127); } catch (e) { e3 = e; }
  ok(e3, 'et lag med egen release har ingen reserve: feilen meldes (' + (e3 && e3.message) + ')');
  lager = 'ok';

  // 3) nettbrudd og tilbake: flisen kommer når nettet er tilbake (det mislykkede oppslaget i pmtiles tas ut)
  KF.release = Promise.resolve(false); const meldt = []; KF.vedFeil = e => meldt.push(e.message);
  const ny = () => { KF.lagfiler = { vektor: [{ fil: 'vektor.pmtiles', zmin: 0, zmax: 99, x6: null, pm: new ctx.pmtiles.PMTiles(new T.Kilde('vektor.pmtiles')) }] }; };
  ny(); const z = 13, x = Math.floor((193300 - T.G.x0) / T.span(z)), y = Math.floor((T.G.y0 - 6896300) / T.span(z));
  modus = 'brudd'; const før = KF.feil, t1 = await T.hentFlis('vektor', z, x, y);
  ok(t1 === null && KF.feil === før + 1 && meldt.length === 1, 'uten nett: flisen mangler, feilen telles (KF.feil) og meldes (' + meldt[0] + ')');
  await new Promise(r => setTimeout(r, 20));   // oppryddingen skjer når den mislykkede hentingen er ferdig avvist
  modus = 'ok'; const t2 = await T.hentFlis('vektor', z, x, y);
  ok(t2 && Object.keys(t2).length > 0, 'nettet tilbake: samme flis hentes på nytt og kommer (' + (t2 ? Object.keys(t2).join(', ') : 'ingenting') + ')');
  ok(KF.feil === før + 1, 'ingen nye feil etter at nettet kom tilbake');
  // uten oppryddingen (rensLager) blir laget borte til siden lastes på nytt – sjekk at testen ville oppdaget det
  { ny(); T.RÅ.clear(); const rens = ctx.rensLager; vm.runInContext('var _rens = rensLager; rensLager = () => {};', ctx);
    modus = 'brudd'; await T.hentFlis('vektor', z, x, y); await new Promise(r => setTimeout(r, 20)); modus = 'ok'; const t3 = await T.hentFlis('vektor', z, x, y);
    vm.runInContext('rensLager = _rens;', ctx);
    ok(t3 === null, 'selvtest: uten oppryddingen kommer flisen ikke tilbake (det var feilen 12. nov)'); }
  console.log(feil ? feil + ' FEIL' : 'alle nett-testene ok'); process.exit(feil ? 1 : 0);
})();
