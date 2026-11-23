#!/usr/bin/env node
// Riksbrudd-tjeneren: kjøres av verten på sin egen PC (se docs/plan-flerspiller.md kapittel 4).
// Bare Node sine innebygde moduler – ingen npm install. HTTP + WebSocket (RFC 6455, skrevet her).
// Bruk: node riksbrudd-tjener.js [--port 8787] [--mappe <dir>] [--tunnel]
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

// ---------- Innstillinger ----------

function argVerdi(navn) {
  const i = process.argv.indexOf(navn);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
const PORT = parseInt(argVerdi('--port') || process.env.PORT || '8787', 10);
const MAPPE = path.resolve(argVerdi('--mappe') || path.join(__dirname, 'verdener'));
const MED_TUNNEL = process.argv.includes('--tunnel');
const SPILL_ADRESSE = 'https://riksbrudd.vercel.app/norge';

const MAKS_MELDING = 4 * 1024 * 1024;
const MAKS_SPILLERE = 5;
const LAGRE_HVERT_MS = 30 * 1000;
const PING_HVERT_MS = 20 * 1000;
const TIDSAVBRUDD_MS = 60 * 1000;
const KODETEGN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_TEGN = 'abcdefghijkmnpqrstuvwxyz23456789';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

fs.mkdirSync(MAPPE, { recursive: true });

function tilfeldig(tegn, n) {
  const b = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += tegn[b[i] % tegn.length];
  return s;
}

// ---------- Verdener og lagring ----------

const verdener = new Map(); // kode -> verden

function filFor(kode) { return path.join(MAPPE, kode + '.json'); }
function gyldigKode(kode) { return typeof kode === 'string' && /^[A-Z0-9]{4,12}$/.test(kode); }
function normKode(kode) { return typeof kode === 'string' ? kode.trim().toUpperCase() : ''; }

function nyVerden(kode) {
  return { kode, vert: null, gjester: new Set(), tilstand: null, leir: null, endret: false, sistLagret: 0 };
}

// Leser en verden fra fila (dovent: først når en vert ber om koden).
function lesVerden(kode) {
  for (const fil of [filFor(kode), path.join(MAPPE, kode + '.bak.json')]) {
    try {
      const o = JSON.parse(fs.readFileSync(fil, 'utf8'));
      const v = nyVerden(kode);
      if (o && o.data !== undefined) {
        v.tilstand = { data: o.data, tid: o.tid === undefined ? null : o.tid, lagretKl: o.lagretKl || new Date().toISOString() };
      }
      return v;
    } catch (e) { /* prøv neste */ }
  }
  return null;
}

function finnVerden(kode) {
  if (verdener.has(kode)) return verdener.get(kode);
  if (!gyldigKode(kode)) return null;
  const v = lesVerden(kode);
  if (v) verdener.set(kode, v);
  return v;
}

function lagre(v) {
  if (!v.tilstand) return;
  const fil = filFor(v.kode);
  const tmp = fil + '.' + process.pid + '.tmp';
  const innhold = JSON.stringify({ kode: v.kode, lagretKl: v.tilstand.lagretKl, tid: v.tilstand.tid, data: v.tilstand.data });
  try {
    fs.writeFileSync(tmp, innhold);
    if (fs.existsSync(fil)) fs.copyFileSync(fil, path.join(MAPPE, v.kode + '.bak.json'));
    fs.renameSync(tmp, fil);
    v.endret = false;
    v.sistLagret = Date.now();
  } catch (e) {
    console.log('Klarte ikke å lagre verden ' + v.kode + ': ' + e.message);
    try { fs.unlinkSync(tmp); } catch (e2) { /* ingenting */ }
  }
}

function lagreAlle() { for (const v of verdener.values()) if (v.endret) lagre(v); }

setInterval(() => {
  const nå = Date.now();
  for (const v of verdener.values()) if (v.endret && nå - v.sistLagret >= LAGRE_HVERT_MS) lagre(v);
}, 2000).unref();

function spillere(v) {
  const l = [];
  if (v.vert) l.push({ id: v.vert.id, navn: v.vert.navn, rolle: 'vert' });
  for (const g of v.gjester) l.push({ id: g.id, navn: g.navn, rolle: 'gjest' });
  return l;
}
function alle(v) { return (v.vert ? [v.vert] : []).concat([...v.gjester]); }
function tilAlle(v, o) { const t = JSON.stringify(o); for (const k of alle(v)) k.sendTekst(t); }
function tilGjester(v, o) { const t = JSON.stringify(o); for (const k of v.gjester) k.sendTekst(t); }

// ---------- WebSocket-forbindelse ----------

class Forbindelse {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.biter = null; // fragmenterte meldinger
    this.lukket = false;
    this.sistSvar = Date.now();
    this.verden = null;
    this.id = null; this.navn = ''; this.rolle = null;
    socket.setNoDelay(true);
    socket.on('data', (d) => this.data(d));
    socket.on('close', () => this.ferdig());
    socket.on('error', () => this.ferdig());
  }

  data(d) {
    this.sistSvar = Date.now();
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (!this.lukket) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const maskert = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let pos = 2;
      if (len === 126) {
        if (b.length < 4) return;
        len = b.readUInt16BE(2); pos = 4;
      } else if (len === 127) {
        if (b.length < 10) return;
        const hi = b.readUInt32BE(2);
        if (hi !== 0) return this.avbryt(1009);
        len = b.readUInt32BE(6); pos = 10;
      }
      if (len > MAKS_MELDING) return this.avbryt(1009);
      // Rammer fra klienten skal være maskert (RFC 6455 5.1).
      if (!maskert) return this.avbryt(1002);
      if (b.length < pos + 4 + len) return;
      const maske = b.subarray(pos, pos + 4);
      pos += 4;
      const innhold = Buffer.from(b.subarray(pos, pos + len));
      for (let i = 0; i < len; i++) innhold[i] ^= maske[i & 3];
      this.buf = b.subarray(pos + len);
      this.ramme(fin, op, innhold);
    }
  }

  ramme(fin, op, innhold) {
    if (op === 0x8) { this.send(0x8, innhold.subarray(0, 2)); this.lukk(); return; }
    if (op === 0x9) { this.send(0xA, innhold); return; }
    if (op === 0xA) return;
    if (op === 0x1 || op === 0x2) {
      if (fin) { if (op === 0x1) this.melding(innhold.toString('utf8')); return; }
      this.biter = { op, deler: [innhold], len: innhold.length };
      return;
    }
    if (op === 0x0 && this.biter) {
      this.biter.deler.push(innhold);
      this.biter.len += innhold.length;
      if (this.biter.len > MAKS_MELDING) return this.avbryt(1009);
      if (fin) {
        const hel = Buffer.concat(this.biter.deler);
        const tekst = this.biter.op === 0x1;
        this.biter = null;
        if (tekst) this.melding(hel.toString('utf8'));
      }
      return;
    }
    this.avbryt(1002);
  }

  send(op, innhold) {
    if (this.lukket || this.socket.destroyed) return;
    const len = innhold.length;
    let hode;
    if (len < 126) { hode = Buffer.alloc(2); hode[1] = len; }
    else if (len < 65536) { hode = Buffer.alloc(4); hode[1] = 126; hode.writeUInt16BE(len, 2); }
    else { hode = Buffer.alloc(10); hode[1] = 127; hode.writeUInt32BE(Math.floor(len / 4294967296), 2); hode.writeUInt32BE(len >>> 0, 6); }
    hode[0] = 0x80 | op;
    this.socket.write(Buffer.concat([hode, innhold]));
  }
  sendTekst(t) { this.send(0x1, Buffer.from(t, 'utf8')); }
  sendJSON(o) { this.sendTekst(JSON.stringify(o)); }

  avbryt(kode) {
    const b = Buffer.alloc(2); b.writeUInt16BE(kode, 0);
    this.send(0x8, b);
    this.lukk();
  }
  lukk() {
    if (this.lukket) return;
    this.socket.end();
    this.lukket = true;
    setTimeout(() => this.socket.destroy(), 1000).unref();
    this.ferdig();
  }
  feil(tekst, lukk) {
    this.sendJSON({ t: 'feil', tekst });
    if (lukk) { const b = Buffer.alloc(2); b.writeUInt16BE(1000, 0); this.send(0x8, b); this.lukk(); }
  }

  melding(tekst) {
    let m;
    try { m = JSON.parse(tekst); } catch (e) { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    try { håndter(this, m); } catch (e) { console.log('Feil i melding (' + m.t + '): ' + e.message); }
  }

  ferdig() {
    this.lukket = true;
    const v = this.verden;
    if (!v) return;
    this.verden = null;
    if (v.vert === this) {
      v.vert = null;
      if (v.endret) lagre(v);
      tilGjester(v, { t: 'vertBorte' });
      console.log('Verten (' + this.navn + ') forlot verden ' + v.kode + '.');
    } else {
      v.gjester.delete(this);
      console.log(this.navn + ' forlot verden ' + v.kode + '.');
    }
    tilAlle(v, { t: 'spillere', spillere: spillere(v) });
  }
}

const forbindelser = new Set();

setInterval(() => {
  const nå = Date.now();
  for (const k of forbindelser) {
    if (k.lukket) { forbindelser.delete(k); continue; }
    if (nå - k.sistSvar > TIDSAVBRUDD_MS) { k.socket.destroy(); k.ferdig(); forbindelser.delete(k); continue; }
    k.send(0x9, Buffer.alloc(0));
  }
}, PING_HVERT_MS).unref();

// ---------- Protokollen ----------

function håndter(k, m) {
  if (m.t === 'ping') { k.sendJSON({ t: 'pong' }); return; }
  if (!k.verden) { if (m.t === 'hei' && !k.rolle) hei(k, m); return; }
  const v = k.verden;
  switch (m.t) {
    case 'tilstand':
      if (v.vert !== k) return;
      v.tilstand = { data: m.data, tid: m.tid === undefined ? null : m.tid, lagretKl: new Date().toISOString() };
      v.endret = true;
      tilGjester(v, { t: 'tilstand', data: m.data });
      return;
    case 'leir':
      // vertens leir (R18-D): gjestene viser den i Leir-menyen, Folk og Tropper. Sendes bare når noe er endret; den siste huskes
      // (bare i minnet) så en gjest som kommer inn, får den straks.
      if (v.vert !== k) return;
      v.leir = m.data;
      tilGjester(v, { t: 'leir', data: m.data });
      return;
    case 'kommando':
      if (v.vert === k) return;
      if (!v.vert) { k.feil('Verten er ikke tilkoblet.', false); return; }
      v.vert.sendJSON({ t: 'kommando', fra: k.id, navn: k.navn, k: m.k });
      return;
    case 'svar': {
      if (v.vert !== k) return;
      const til = m.til;
      const ut = Object.assign({}, m);
      delete ut.til;
      const tekst = JSON.stringify(ut);
      for (const g of v.gjester) if (til === '*' || g.id === til) g.sendTekst(tekst);
      return;
    }
    case 'melding': {
      if (typeof m.tekst !== 'string') return;
      const tekst = m.tekst.slice(0, 300);
      if (!tekst.trim()) return;
      tilAlle(v, { t: 'melding', fra: k.id, navn: k.navn, tekst });
      return;
    }
    default: return;
  }
}

function hei(k, m) {
  const rolle = m.rolle === 'vert' ? 'vert' : m.rolle === 'gjest' ? 'gjest' : null;
  if (!rolle) return;
  k.id = typeof m.id === 'string' && m.id.trim() ? m.id.trim().slice(0, 64) : tilfeldig(ID_TEGN, 8);
  k.navn = (typeof m.navn === 'string' && m.navn.trim() ? m.navn.trim() : 'Spiller').slice(0, 40);
  const kode = normKode(m.kode);
  let v;
  if (rolle === 'vert') {
    if (kode) {
      if (!gyldigKode(kode)) { k.feil('Ugyldig kode.', true); return; }
      v = finnVerden(kode);
      if (!v) { v = nyVerden(kode); verdener.set(kode, v); }
    } else {
      let ny;
      do { ny = tilfeldig(KODETEGN, 6); } while (verdener.has(ny) || fs.existsSync(filFor(ny)));
      v = nyVerden(ny);
      verdener.set(ny, v);
    }
    if (v.vert) { k.feil('Verden har alt en vert.', true); return; }
    if (v.gjester.size + 1 > MAKS_SPILLERE) { k.feil('Verden er full (5 spillere).', true); return; }
    v.vert = k;
  } else {
    v = kode ? verdener.get(kode) : null;
    if (!v || !v.vert) { k.feil('Fant ingen verden med koden ' + (kode || '(tom)') + ' (er verten på?)', true); return; }
    if (spillere(v).length >= MAKS_SPILLERE) { k.feil('Verden er full (5 spillere).', true); return; }
    v.gjester.add(k);
  }
  k.rolle = rolle;
  k.verden = v;
  let lagret = null;
  if (rolle === 'vert' && v.tilstand) {
    const borteSek = Math.max(0, (Date.now() - Date.parse(v.tilstand.lagretKl)) / 1000);
    lagret = { data: v.tilstand.data, tid: v.tilstand.tid, lagretKl: v.tilstand.lagretKl, borteSek };
  }
  k.sendJSON({ t: 'velkommen', id: k.id, kode: v.kode, rolle, spillere: spillere(v), lagret });
  if (rolle === 'gjest' && v.tilstand) k.sendJSON({ t: 'tilstand', data: v.tilstand.data });
  if (rolle === 'gjest' && v.leir) k.sendJSON({ t: 'leir', data: v.leir });
  if (rolle === 'vert') {
    if (v.gjester.size) tilGjester(v, { t: 'vertTilbake' });
    console.log('');
    console.log('Verden ' + v.kode + ' er åpen (vert: ' + k.navn + ').');
    console.log('  Kode: ' + v.kode);
    skrivInvitasjon(v.kode);
  } else {
    console.log(k.navn + ' koblet til verden ' + v.kode + '.');
  }
  tilAlle(v, { t: 'spillere', spillere: spillere(v) });
}

// ---------- Adresser og invitasjon ----------

let tunnelAdresse = null;
let tunnelProsess = null;

function lokaleAdresser() {
  const ut = [];
  const nett = os.networkInterfaces();
  for (const navn of Object.keys(nett)) {
    for (const a of nett[navn] || []) {
      if ((a.family === 'IPv4' || a.family === 4) && !a.internal) ut.push(a.address);
    }
  }
  return ut;
}

function invitasjon(kode) {
  if (!tunnelAdresse) return null;
  const wss = tunnelAdresse.replace(/^https:/, 'wss:');
  return SPILL_ADRESSE + '#spill=' + encodeURIComponent(wss) + '&kode=' + kode;
}

// Vertslenken åpner spillet og kobler verten til tjeneren GJENNOM TUNNELEN. (22. nov, test på brukerens Windows-PC: nettleseren
// avviste ws://localhost fra den offentlige https-siden, mens tunneladressen virket.)
// Åpner en adresse i standard nettleser (bare med --nettleser, som start-tjener.bat bruker)
function åpneINettleser(url) {
  try {
    const { spawn: sp } = require('child_process');
    if (process.platform === 'win32') sp('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') sp('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else sp('xdg-open', [url], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
  } catch (e) { /* ikke viktig: lenken står i vinduet */ }
}
function vertslenke() {
  if (!tunnelAdresse) return null;
  return SPILL_ADRESSE + '#vert=' + encodeURIComponent(tunnelAdresse.replace(/^https:/, 'wss:'));
}
function skrivInvitasjon(kode) {
  const lenke = invitasjon(kode);
  if (lenke) {
    console.log('  Invitasjonslenke (send til vennene dine):');
    console.log('  ' + lenke);
  } else {
    console.log('  Ingen tunnel: vennene må være på samme nett og bruke');
    for (const ip of lokaleAdresser()) console.log('    ws://' + ip + ':' + PORT + '   (kode ' + kode + ')');
    console.log('  Det virker bare fra en side lastet over http. Start heller med tunnel (start-tjener.bat).');
  }
}

// ---------- HTTP ----------

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statusJSON() {
  const liste = [];
  for (const v of verdener.values()) {
    liste.push({ kode: v.kode, spillere: spillere(v), harVert: !!v.vert, tid: v.tilstand ? v.tilstand.tid : null });
  }
  return { verdener: liste, tunnel: tunnelAdresse };
}

function statusside() {
  const s = statusJSON();
  const adr = lokaleAdresser().map((ip) => '<li><code>http://' + esc(ip) + ':' + PORT + '</code> · <code>ws://' + esc(ip) + ':' + PORT + '</code></li>').join('');
  const vl = s.verdener.length ? s.verdener.map((v) => {
    const lenke = invitasjon(v.kode);
    return '<div class="kort"><h3>Verden ' + esc(v.kode) + (v.harVert ? '' : ' <span class="av">(verten er borte)</span>') + '</h3>' +
      '<p>' + (v.spillere.length ? v.spillere.map((p) => esc(p.navn) + ' <small>(' + esc(p.rolle) + ')</small>').join(', ') : 'Ingen tilkoblet') + '</p>' +
      (lenke ? '<p>Invitasjonslenke:<br><a href="' + esc(lenke) + '">' + esc(lenke) + '</a></p>' : '') + '</div>';
  }).join('') : '<p>Ingen verdener ennå. Åpne spillet og velg «Vær vert».</p>';
  return '<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta http-equiv="refresh" content="10"><title>Riksbrudd-tjeneren</title><style>' +
    'body{background:#14161a;color:#ddd6c6;font:16px/1.5 Georgia,serif;margin:0;padding:24px 16px;max-width:760px;margin:auto}' +
    'h1{font-weight:normal;letter-spacing:.05em;color:#e9c98a}h2{font-weight:normal;color:#c8b98f;border-bottom:1px solid #333;padding-bottom:4px}' +
    'code{background:#22252b;padding:1px 5px;border-radius:3px;word-break:break-all}a{color:#9fc3e6;word-break:break-all}' +
    '.kort{background:#1d2026;border:1px solid #30343c;border-radius:6px;padding:4px 14px;margin:10px 0}.av{color:#d08a6a;font-size:.8em}' +
    '</style></head><body><h1>Riksbrudd-tjeneren</h1><p>Kjører på port ' + PORT + '.</p>' +
    '<h2>Adresser</h2><ul>' + (tunnelAdresse ? '<li>Tunnel: <code>' + esc(tunnelAdresse) + '</code></li><li>Vertslenke (åpne den selv): <a href="' + esc(vertslenke()) + '" style="color:#f0d79a">' + esc(vertslenke()) + '</a></li>' : '<li>Ingen tunnel (vennene må være på samme nett).</li>') + adr + '</ul>' +
    '<h2>Verdener</h2>' + vl + '</body></html>';
}

const tjener = http.createServer((req, res) => {
  const sti = (req.url || '/').split('?')[0];
  // Spillet ligger på en offentlig https-side og spør tjeneren på denne PC-en (localhost). Chrome/Edge spør da om lov først
  // (Private Network Access / «lokalt nettverk»): svar ja på forespørselen før selve hentingen.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Private-Network': 'true', 'Access-Control-Max-Age': '600' });
    res.end();
    return;
  }
  if (req.method === 'GET' && sti === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Private-Network': 'true', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(statusJSON()));
    return;
  }
  if (req.method === 'GET' && sti === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(statusside());
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Fant ikke siden.');
});

tjener.on('upgrade', (req, socket) => {
  const nøkkel = req.headers['sec-websocket-key'];
  if (!nøkkel || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }
  const svar = crypto.createHash('sha1').update(nøkkel + WS_GUID).digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + svar + '\r\n\r\n');
  forbindelser.add(new Forbindelse(socket));
});

tjener.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log('Port ' + PORT + ' er i bruk. Kjører tjeneren alt? Prøv --port 8788.');
  else console.log('Tjenerfeil: ' + e.message);
  process.exit(1);
});

// ---------- Tunnel (cloudflared) ----------

function finnCloudflared() {
  for (const navn of ['cloudflared.exe', 'cloudflared']) {
    const p = path.join(__dirname, navn);
    if (fs.existsSync(p)) return p;
  }
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cloudflared'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  return null;
}

function startTunnel() {
  const exe = finnCloudflared();
  if (!exe) {
    console.log('');
    console.log('Fant ikke cloudflared – fortsetter uten tunnel.');
    console.log('  For at venner utenfor huset skal kunne bli med: last ned cloudflared fra Cloudflares side');
    console.log('  (søk «cloudflared download», velg Windows amd64 .exe), gi fila navnet cloudflared.exe og');
    console.log('  legg den i samme mappe som dette programmet. Start så på nytt.');
    return;
  }
  console.log('Starter tunnel med cloudflared …');
  tunnelProsess = spawn(exe, ['tunnel', '--url', 'http://localhost:' + PORT], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  const les = (d) => {
    const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !tunnelAdresse) {
      tunnelAdresse = m[0];
      console.log('');
      console.log('==========================================================');
      console.log(' Tunnelen er klar: ' + tunnelAdresse);
      console.log('==========================================================');
      const vl = vertslenke();
      console.log('');
      console.log(' DU SOM ER VERT: åpne denne lenken i nettleseren (den åpnes av seg selv nå):');
      console.log(' ' + vl);
      console.log(' Trykk så «Åpne en ny verden» (eller «Åpne verden … igjen»), og send invitasjonslenken til vennene.');
      console.log('');
      if (process.argv.includes('--nettleser')) åpneINettleser(vl);
      for (const v of verdener.values()) if (v.vert) { console.log('Verden ' + v.kode + ':'); skrivInvitasjon(v.kode); }
    }
  };
  tunnelProsess.stdout.on('data', les);
  tunnelProsess.stderr.on('data', les);
  tunnelProsess.on('exit', (kode) => {
    tunnelProsess = null;
    if (!avslutter) { console.log('Tunnelen stoppet (kode ' + kode + '). Vennene når deg ikke før tjeneren startes på nytt.'); tunnelAdresse = null; }
  });
  tunnelProsess.on('error', (e) => console.log('Klarte ikke å starte cloudflared: ' + e.message));
}

// ---------- Start og avslutning ----------

let avslutter = false;
function avslutt() {
  if (avslutter) return;
  avslutter = true;
  console.log('');
  console.log('Lagrer og avslutter …');
  for (const v of verdener.values()) if (v.endret) lagre(v);
  if (tunnelProsess) { try { tunnelProsess.kill(); } catch (e) { /* ingenting */ } }
  process.exit(0);
}
process.on('SIGINT', avslutt);
process.on('SIGTERM', avslutt);
process.on('SIGHUP', avslutt);
process.on('exit', () => { if (!avslutter) lagreAlle(); if (tunnelProsess) { try { tunnelProsess.kill(); } catch (e) { /* ingenting */ } } });

tjener.listen(PORT, '0.0.0.0', () => {
  console.log('Riksbrudd-tjeneren kjører på port ' + PORT);
  console.log('  Statusside: http://localhost:' + PORT + '/');
  for (const ip of lokaleAdresser()) console.log('  På nettet hjemme: http://' + ip + ':' + PORT + '/');
  console.log('  Verdener lagres i ' + MAPPE);
  console.log('  Trykk Ctrl+C for å lagre og avslutte.');
  if (MED_TUNNEL) startTunnel();
});
