// Test av nettfeil i kartflisene (site/dovre-fliser/kartflis.js): tidsgrense på hentinger, reserven når kartlageret ikke svarer,
// og at et kartlag kommer tilbake etter et nettbrudd (pmtiles husker ellers den mislykkede hentingen for alltid).
// Uten nett: fetch byttes ut og leser Dovre-filene i site/dovre-fliser/data. Bruk: node pipeline/fliser/test_nett.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = path.join(__dirname, '..', '..', 'site', 'dovre-fliser');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };

// modus: 'ok' (filene leses), 'brudd' (som uten nett), 'heng' (svarer aldri – bare avbrudd stopper den)
let modus = 'ok', lager = 'ok', n502 = 0; const kall = [];
const svar = (data, status) => ({ ok: status === 200 || status === 206, status, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), json: async () => JSON.parse(Buffer.from(data).toString()) });
const falskFetch = (url, valg = {}) => new Promise((ja, nei) => {
  kall.push(url); const api = url.startsWith('/api/kart/'), m = api ? lager : modus;
  if (valg.signal) valg.signal.addEventListener('abort', () => { const e = new Error('avbrutt'); e.name = 'AbortError'; nei(e); });
  if (m === 'heng') return;
  if (m === 'sent') { modus = 'ok'; return setTimeout(() => setImmediate(() => falskFetch(url, valg).then(ja, nei)), 10); }   // svaret kommer som en egen oppgave etter klokkene
  if (m === 'brudd') return nei(new TypeError('Failed to fetch'));
  // 'f502': kartlageret svarer 502 hver gang; 'to502': 502 de to første gangene, så i orden
  if (m === 'f502') return ja(svar(Buffer.from('{}'), 502));
  if (m === 'to502') { if (++n502 <= 2) return ja(svar(Buffer.from('{}'), 502)); }
  let fil, fra, til;
  if (api) { const d = url.split('/'); fil = d[4]; fra = +d[5]; til = fra + +d[6] - 1; }
  else { fil = url.split('/').pop(); const r = /bytes=(\d+)-(\d+)/.exec(valg.headers.Range); fra = +r[1]; til = +r[2]; }
  const f = path.join(D, 'data', fil); if (!fs.existsSync(f)) return ja(svar(Buffer.from('{}'), 404));
  const fd = fs.openSync(f, 'r'), buf = Buffer.alloc(til - fra + 1), n = fs.readSync(fd, buf, 0, buf.length, fra); fs.closeSync(fd); ja(svar(buf.subarray(0, n), 206));
});
const ctx = vm.createContext({ console: { error() {}, log: console.log }, fetch: falskFetch, AbortController, setTimeout, clearTimeout, setImmediate, TextDecoder, Uint8Array, DataView, Promise, Math, Error, TypeError,
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

  // siden står stille i 3 s (et 3D-utsnitt settes inn) mens svaret alt er på veg: fristen på 2,5 s skal ikke regnes som ute
  { modus = 'sent'; let e4 = null, d4 = null; const p = T.hentMedFrist('/dovre-fliser/data/manifest.json', 2500, 'json', { headers: { Range: 'bytes=0-99999' } }).then(s => { d4 = s.data; }, e => { e4 = e; });
    const slutt = Date.now() + 3000; while (Date.now() < slutt) { /* opptatt */ } await p; modus = 'ok';
    ok(!e4 && d4 && d4.filer, 'siden står stille lenger enn fristen mens svaret er på veg: svaret leses likevel (' + (e4 ? e4.message : 'ok') + ')'); }

  // 2) kartlageret (/api/kart) svarer ikke: Dovre-filene brukes som reserve; lag med egen release (tag) gir feil
  const kilder = []; KF.vedBytes = (n, k) => kilder.push(k); KF.release = Promise.resolve(true); KF.kartTag = 'kart-test';
  const frist = vm.runInContext('FRIST_FLIS', ctx); ok(frist >= 10000 && frist <= 60000, 'fristen for kartfliser er ' + frist / 1000 + ' s');
  lager = 'brudd';
  const b = await new T.Kilde('vektor.pmtiles').getBytes(0, 127);
  ok(b.data.byteLength === 127 && kilder.pop() === 'Vercel', 'kartlageret nede: biten hentes fra Dovre-filene (reserve)');
  let e3 = null; try { await new T.Kilde('hus.pmtiles', 'kart-hus-test').getBytes(0, 127); } catch (e) { e3 = e; }
  ok(e3, 'et lag med egen release har ingen reserve: feilen meldes (' + (e3 && e3.message) + ')');
  // 14. nov: kartlageret svarer 502 to ganger og så i orden – biten kommer fra kartlageret etter nye forsøk
  lager = 'to502'; n502 = 0; kilder.length = 0;
  const b5 = await new T.Kilde('vektor.pmtiles').getBytes(0, 127);
  ok(b5.data.byteLength === 127 && kilder.pop() === 'GitHub' && n502 === 3, 'kartlageret svarer 502 to ganger: tredje forsøk gir biten (' + n502 + ' forsøk)');
  // hele Norge har ingen reservefil: feilen som meldes er den fra kartlageret, ikke «404» for reserven, og reserven prøves bare én gang
  lager = 'f502'; let e6 = null, e7 = null; const K6 = new T.Kilde('vektor-0.pmtiles');
  try { await K6.getBytes(0, 127); } catch (e) { e6 = e; }
  const førKall = kall.length; try { await K6.getBytes(0, 127); } catch (e) { e7 = e; }
  const reserve = kall.slice(førKall).filter(u => !u.startsWith('/api/kart/')).length;
  ok(e6 && /kartlageret svarte 502/.test(e6.message) && !/404/.test(e6.message), 'uten reservefil meldes feilen fra kartlageret (' + (e6 && e6.message) + ')');
  ok(e7 && /kartlageret svarte 502/.test(e7.message) && reserve === 0, 'reservefila som ikke finnes, prøves ikke igjen (' + reserve + ' hentinger)');
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
