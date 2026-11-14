// Test av mellomstasjonen for kartfliser (site/api/kart.js): nye forsøk når GitHub svarer 429/5xx, feil lagres ikke i hurtigbufferen.
// Uten nett: fetch byttes ut. Bruk: node pipeline/fliser/test_kartlager.js
const handler = require('../../site/api/kart.js');
let feil = 0; const ok = (b, t) => { console.log((b ? 'ok   ' : 'FEIL ') + t); if (!b) feil++; };
const svar = () => { const r = { hoder: {}, kode: 0, kropp: null, setHeader(k, v) { r.hoder[k] = v; }, status(k) { r.kode = k; return r; }, json(o) { r.kropp = o; return r; }, send(d) { r.kropp = d; return r; }, end() { return r; } }; return r; };
const spør = (q) => ({ method: 'GET', query: Object.assign({ tag: 'kart-norge-2023-382cb2836015', fil: 'vektor-0.pmtiles', fra: '100', lengde: '50' }, q) });
const gh = (status, n = 50) => ({ status, arrayBuffer: async () => new Uint8Array(n).fill(7).buffer });
const stille = console.warn; let advarsler = 0; console.warn = () => { advarsler++; };
(async () => {
  let kall = 0;
  // 429 to ganger, så 206: biten kommer, med lang hurtiglagring
  global.fetch = async () => (++kall <= 2 ? gh(429) : gh(206));
  let r = svar(); await handler(spør(), r);
  ok(r.kode === 200 && r.kropp.length === 50 && kall === 3 && /immutable/.test(r.hoder['Cache-Control']), 'GitHub svarer 429 to ganger: tredje forsøk gir biten (' + kall + ' forsøk, status ' + r.kode + ')');
  // 429 hver gang: tre forsøk, så 429 uten hurtiglagring, og en linje i loggen
  kall = 0; advarsler = 0; global.fetch = async () => { kall++; return gh(429); };
  r = svar(); await handler(spør(), r);
  ok(r.kode === 429 && kall === 3 && r.hoder['Cache-Control'] === 'no-store' && advarsler === 1 && /429/.test(r.kropp.feil), 'GitHub svarer 429 hver gang: tre forsøk, svaret lagres ikke (' + r.kode + ', «' + r.kropp.feil + '»)');
  // ingen kontakt med GitHub: 502
  kall = 0; global.fetch = async () => { kall++; throw new Error('ECONNRESET'); };
  r = svar(); await handler(spør(), r);
  ok(r.kode === 502 && kall === 3 && r.hoder['Cache-Control'] === 'no-store', 'ingen kontakt med GitHub: 502 etter tre forsøk');
  // fila finnes ikke: 404 med en gang
  kall = 0; global.fetch = async () => { kall++; return gh(404); };
  r = svar(); await handler(spør(), r);
  ok(r.kode === 404 && kall === 1, 'fila finnes ikke: 404 uten nye forsøk');
  // ugyldig forespørsel: ingen henting
  kall = 0; r = svar(); await handler(spør({ tag: 'noe-annet' }), r);
  ok(r.kode === 400 && kall === 0, 'ugyldig merke: 400 uten å spørre GitHub');
  console.warn = stille; console.log(feil ? feil + ' FEIL' : 'alle testene for kartlageret er ok'); process.exit(feil ? 1 : 0);
})();
