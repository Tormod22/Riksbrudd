// Test av tjener/riksbrudd-tjener.js: starter tjeneren som barneprosess og prøver hele protokollen.
// Krever Node 22 (global WebSocket). Kjør: node pipeline/fliser/test_tjener.js
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');

const SKRIPT = path.join(__dirname, '..', '..', 'tjener', 'riksbrudd-tjener.js');
const prosesser = [];
let mappe;

function ledigPort() {
  return new Promise((ok, feil) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); });
    s.on('error', feil);
  });
}

function startTjener(port) {
  return new Promise((ok, feil) => {
    const p = spawn(process.execPath, [SKRIPT, '--port', String(port), '--mappe', mappe], { stdio: ['ignore', 'pipe', 'pipe'] });
    prosesser.push(p);
    let ut = '';
    const t = setTimeout(() => feil(new Error('tjeneren startet ikke: ' + ut)), 5000);
    p.stdout.on('data', (d) => { ut += d; if (/kjører på port/.test(ut)) { clearTimeout(t); ok(p); } });
    p.stderr.on('data', (d) => { ut += d; process.stderr.write('[tjener] ' + d); });
    p.on('exit', (k) => { p.ferdig = true; p.kode = k; });
  });
}

function stoppTjener(p) {
  return new Promise((ok) => { if (p.ferdig) return ok(); p.on('exit', () => ok()); p.kill('SIGINT'); });
}

const vent = (ms) => new Promise((r) => setTimeout(r, ms));

class Klient {
  constructor(url) {
    this.meldinger = [];
    this.ventere = [];
    this.lukket = false;
    this.ws = new WebSocket(url);
    this.åpen = new Promise((ok, feil) => { this.ws.onopen = ok; this.ws.onerror = () => feil(new Error('kunne ikke koble til')); });
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      this.meldinger.push(m);
      this.sjekk();
    };
    this.ws.onclose = () => { this.lukket = true; this.sjekk(); };
  }
  sjekk() {
    for (const v of this.ventere.slice()) {
      const i = this.meldinger.findIndex(v.pred);
      if (i >= 0) { const m = this.meldinger.splice(i, 1)[0]; this.ventere.splice(this.ventere.indexOf(v), 1); clearTimeout(v.t); v.ok(m); }
      else if (v.lukk && this.lukket) { this.ventere.splice(this.ventere.indexOf(v), 1); clearTimeout(v.t); v.ok(null); }
    }
  }
  vent(pred, navn, ms = 3000) {
    if (typeof pred === 'string') { const t = pred; pred = (m) => m.t === t; }
    return new Promise((ok, feil) => {
      const v = { pred, ok, t: setTimeout(() => feil(new Error('ventet forgjeves på ' + navn + '; fikk ' + JSON.stringify(this.meldinger).slice(0, 300))), ms) };
      this.ventere.push(v);
      this.sjekk();
    });
  }
  venterLukket(ms = 3000) {
    return new Promise((ok, feil) => {
      if (this.lukket) return ok();
      const t = setTimeout(() => feil(new Error('ble ikke lukket')), ms);
      const før = this.ws.onclose;
      this.ws.onclose = () => { før(); clearTimeout(t); ok(); };
    });
  }
  ingen(pred, ms = 300) {
    if (typeof pred === 'string') { const t = pred; pred = (m) => m.t === t; }
    return vent(ms).then(() => { if (this.meldinger.some(pred)) throw new Error('uventet melding: ' + JSON.stringify(this.meldinger.find(pred))); });
  }
  send(o) { this.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); }
  lukk() { this.ws.close(); return this.venterLukket(); }
}

function påstå(b, tekst) { if (!b) throw new Error('feilet: ' + tekst); }

async function koble(url, hei) {
  const k = new Klient(url);
  await k.åpen;
  k.send(Object.assign({ t: 'hei' }, hei));
  return k;
}

async function main() {
  if (typeof WebSocket !== 'function') throw new Error('Node mangler global WebSocket (krever Node 22)');
  mappe = fs.mkdtempSync(path.join(os.tmpdir(), 'riksbrudd-tjener-'));
  const port = await ledigPort();
  let tjener = await startTjener(port);
  const url = 'ws://127.0.0.1:' + port;

  // Ugyldig JSON og meldinger før hei krasjer ikke, ping svarer.
  const rar = new Klient(url);
  await rar.åpen;
  rar.send('dette er ikke json {');
  rar.send({ t: 'ukjent' });
  rar.send({ t: 'tilstand', data: { x: 1 } });
  rar.send({ t: 'ping' });
  await rar.vent('pong', 'pong');
  await rar.lukk();

  // Ny verden.
  const vert = await koble(url, { rolle: 'vert', navn: 'Kari', id: 'vert-1' });
  const vel = await vert.vent('velkommen', 'velkommen til vert');
  påstå(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(vel.kode), 'kode 6 tegn: ' + vel.kode);
  påstå(vel.id === 'vert-1' && vel.rolle === 'vert' && vel.lagret === null, 'velkommen for ny vert');
  påstå(vel.spillere.length === 1 && vel.spillere[0].navn === 'Kari', 'spillerlista med vert');
  const kode = vel.kode;
  vert.send('{ødelagt');
  vert.send({ t: 'hva' });

  // Feil kode avvises.
  const feilKode = await koble(url, { rolle: 'gjest', kode: 'ZZZZZZ', navn: 'Ola' });
  const f1 = await feilKode.vent('feil', 'feil for ukjent kode');
  påstå(/Fant ingen verden med koden ZZZZZZ/.test(f1.tekst), 'tekst for ukjent kode: ' + f1.tekst);
  await feilKode.venterLukket();

  // Andre vert på samme kode avvises.
  const vert2 = await koble(url, { rolle: 'vert', kode, navn: 'Inntrenger' });
  const f2 = await vert2.vent('feil', 'feil for andre vert');
  påstå(f2.tekst === 'Verden har alt en vert.', 'tekst for andre vert');
  await vert2.venterLukket();

  // Tilstand (liten) før gjesten kommer.
  vert.send({ t: 'tilstand', data: { runde: 1, navn: 'Ålesund' }, tid: 100 });
  await vent(100);

  // Gjest kobler til og får siste tilstand, uten id -> tjeneren lager en.
  const gjest = await koble(url, { rolle: 'gjest', kode: kode.toLowerCase(), navn: 'Ola' });
  const gv = await gjest.vent('velkommen', 'velkommen til gjest');
  påstå(typeof gv.id === 'string' && gv.id.length === 8 && gv.rolle === 'gjest' && gv.lagret === null, 'velkommen for gjest');
  const gt = await gjest.vent('tilstand', 'tilstand til gjest');
  påstå(gt.data.runde === 1 && gt.data.navn === 'Ålesund', 'gjest fikk siste tilstand');
  const sp = await vert.vent((m) => m.t === 'spillere' && m.spillere.length === 2, 'spillere med gjest');
  påstå(sp.spillere.some((p) => p.navn === 'Ola' && p.rolle === 'gjest' && p.id === gv.id), 'spillerlista har gjesten');

  // Gjest kan ikke sende tilstand.
  gjest.send({ t: 'tilstand', data: { juks: true } });
  await gjest.ingen((m) => m.t === 'tilstand' && m.data.juks);

  // Kommando gjest -> vert.
  gjest.send({ t: 'kommando', k: { ordre: 'flytt', lag: 3 } });
  const kom = await vert.vent('kommando', 'kommando');
  påstå(kom.fra === gv.id && kom.navn === 'Ola' && kom.k.ordre === 'flytt' && kom.k.lag === 3, 'kommando med fra/navn');

  // Svar vert -> én gjest og til alle.
  vert.send({ t: 'svar', til: gv.id, ok: true, tekst: 'Gjort' });
  const sv = await gjest.vent('svar', 'svar');
  påstå(sv.ok === true && sv.tekst === 'Gjort' && !('til' in sv), 'svar uten til');
  vert.send({ t: 'svar', til: '*', alle: 1 });
  const sv2 = await gjest.vent((m) => m.t === 'svar' && m.alle === 1, 'svar til alle');
  påstå(sv2, 'svar til *');

  // Melding til alle (kortet til 300 tegn).
  gjest.send({ t: 'melding', tekst: 'Hei alle! ' + 'x'.repeat(400) });
  const mv = await vert.vent('melding', 'melding til vert');
  const mg = await gjest.vent('melding', 'melding til gjest');
  påstå(mv.fra === gv.id && mv.navn === 'Ola' && mv.tekst.length === 300 && mg.tekst === mv.tekst, 'melding til alle');

  // Store meldinger: over 125 byte (16-bits lengde) og over 65535 byte (64-bits lengde), begge veier.
  const middels = { tekst: 'æøå'.repeat(60) };
  const stor = { tekst: 'Riksbrudd-'.repeat(8000), tall: Array.from({ length: 2000 }, (_, i) => i) };
  vert.send({ t: 'tilstand', data: middels, tid: 101 });
  const t2 = await gjest.vent((m) => m.t === 'tilstand' && m.data.tekst === middels.tekst, 'middels tilstand');
  påstå(t2, 'middels melding');
  vert.send({ t: 'tilstand', data: stor, tid: 102 });
  const t3 = await gjest.vent((m) => m.t === 'tilstand' && m.data.tall && m.data.tall.length === 2000, 'stor tilstand', 5000);
  påstå(t3.data.tekst === stor.tekst && t3.data.tall[1999] === 1999, 'stor melding kom riktig fram');
  påstå(JSON.stringify({ t: 'tilstand', data: stor }).length > 65535, 'stor melding er over 65535 byte');
  gjest.send({ t: 'kommando', k: { stor: stor.tekst } });
  const kStor = await vert.vent((m) => m.t === 'kommando' && m.k.stor, 'stor kommando', 5000);
  påstå(kStor.k.stor === stor.tekst, 'stor kommando fra gjest');

  // Full verden: vert + 4 gjester, den sjette avvises.
  const ekstra = [];
  for (let i = 0; i < 3; i++) {
    const g = await koble(url, { rolle: 'gjest', kode, navn: 'Gjest' + i, id: 'g' + i });
    await g.vent('velkommen', 'velkommen ekstra ' + i);
    ekstra.push(g);
  }
  await vert.vent((m) => m.t === 'spillere' && m.spillere.length === 5, 'fem spillere');
  const sjette = await koble(url, { rolle: 'gjest', kode, navn: 'Sjette' });
  const f3 = await sjette.vent('feil', 'feil for full verden');
  påstå(f3.tekst === 'Verden er full (5 spillere).', 'full verden');
  await sjette.venterLukket();
  for (const g of ekstra) await g.lukk();
  await vert.vent((m) => m.t === 'spillere' && m.spillere.length === 2, 'spillerlista etter at tre gikk');

  // Verten går: gjesten får vertBorte, fila lagres, kommando gir feil uten å lukke.
  vert.send({ t: 'tilstand', data: { runde: 7, by: 'Bryne' }, tid: 777 });
  await vent(100);
  await vert.lukk();
  await gjest.vent('vertBorte', 'vertBorte');
  await gjest.vent((m) => m.t === 'spillere' && m.spillere.length === 1, 'spillere uten vert');
  gjest.send({ t: 'kommando', k: { x: 1 } });
  const f4 = await gjest.vent('feil', 'feil når verten er borte');
  påstå(f4.tekst === 'Verten er ikke tilkoblet.', 'tekst når verten er borte');
  await vent(100);
  påstå(!gjest.lukket, 'gjesten er fortsatt tilkoblet');
  const fil = path.join(mappe, kode + '.json');
  påstå(fs.existsSync(fil), 'verden lagret til fil');
  const innhold = JSON.parse(fs.readFileSync(fil, 'utf8'));
  påstå(innhold.kode === kode && innhold.tid === 777 && innhold.data.by === 'Bryne' && !isNaN(Date.parse(innhold.lagretKl)), 'filinnhold');
  påstå(!fs.readdirSync(mappe).some((n) => n.endsWith('.tmp')), 'ingen halve filer');

  // Verten kommer tilbake: gjesten får vertTilbake, verten får lagret.
  await vent(1100);
  const vertIgjen = await koble(url, { rolle: 'vert', kode, navn: 'Kari', id: 'vert-1' });
  const vi = await vertIgjen.vent('velkommen', 'velkommen tilbake');
  påstå(vi.lagret && vi.lagret.data.by === 'Bryne' && vi.lagret.tid === 777 && vi.lagret.borteSek >= 1, 'lagret med data og borteSek: ' + JSON.stringify(vi.lagret));
  await gjest.vent('vertTilbake', 'vertTilbake');
  vertIgjen.send({ t: 'tilstand', data: { runde: 8 }, tid: 800 });
  await gjest.vent((m) => m.t === 'tilstand' && m.data.runde === 8, 'tilstand etter retur');

  // /status svarer JSON.
  const res = await fetch('http://127.0.0.1:' + port + '/status');
  påstå(res.headers.get('access-control-allow-origin') === '*', 'CORS på /status');
  const st = await res.json();
  const sv3 = st.verdener.find((v) => v.kode === kode);
  påstå(sv3 && sv3.harVert && sv3.spillere.length === 2 && sv3.tid === 800 && st.tunnel === null, '/status: ' + JSON.stringify(st));
  const side = await fetch('http://127.0.0.1:' + port + '/');
  påstå(side.status === 200 && (await side.text()).includes(kode), 'statussiden viser verden');
  påstå((await fetch('http://127.0.0.1:' + port + '/noe')).status === 404, '404 for ukjent sti');

  // Avslutning med Ctrl+C lagrer; en ny tjener leser fila dovent.
  await gjest.lukk();
  await vertIgjen.lukk();
  await stoppTjener(tjener);
  påstå(JSON.parse(fs.readFileSync(fil, 'utf8')).tid === 800, 'lagret ved avslutning');
  påstå(fs.existsSync(path.join(mappe, kode + '.bak.json')), 'forrige fil beholdt som .bak.json');
  tjener = await startTjener(port);
  const vert3 = await koble(url, { rolle: 'vert', kode, navn: 'Kari' });
  const v3 = await vert3.vent('velkommen', 'velkommen etter omstart');
  påstå(v3.lagret && v3.lagret.data.runde === 8 && v3.lagret.borteSek >= 0, 'lagret lest fra fil');
  // Vert med ukjent, gyldig kode lager den.
  const vert4 = await koble(url, { rolle: 'vert', kode: 'ABC234', navn: 'Ny' });
  const v4 = await vert4.vent('velkommen', 'velkommen ny kode');
  påstå(v4.kode === 'ABC234' && v4.lagret === null, 'vert lager verden med oppgitt kode');
  await vert3.lukk();
  await vert4.lukk();
  await stoppTjener(tjener);
}

main().then(() => {
  console.log('ok');
  fs.rmSync(mappe, { recursive: true, force: true });
  process.exit(0);
}).catch((e) => {
  console.log('FEIL: ' + (e && e.stack || e));
  for (const p of prosesser) if (!p.ferdig) p.kill('SIGKILL');
  process.exit(1);
});
