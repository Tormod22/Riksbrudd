/* Flerspiller, første trinn (22. nov, brukeren: «gjør alt etter en plan du lager» – se docs/plan-flerspiller.md, M2a).
 * Reglene her er uten DOM (Node: require('./flerspiller'); nettleser: globalThis.Flerspiller). Visningen ligger i flerspiller-visning.js.
 *
 * Slik virker M2a: tjenerprogrammet på vertens PC (tjener/riksbrudd-tjener.js) kobler spillerne sammen og lagrer verden. Vertens
 * nettleser regner verden som før (simuleringen er ikke skilt ut fra index.html ennå – det er M0), sender et øyeblikksbilde av det
 * gjestene får se to ganger i sekundet, og tar imot gjestenes kommandoer. Gjestene regner ikke selv; de viser bildet og sender ordre.
 * Samarbeid først (Claudes valg): alle spillerne er på samme side («blå»), og verten gir lag til gjestene (s.eier = gjestens id).
 */
(function (rot) {
  'use strict';
  const VERSJON = 1;
  const r1 = v => Math.round(v * 10) / 10, tall = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  const MAKS_STI = 300;          // punkter av ruta som sendes (resten av marsjen, tynnet)
  const MAKS_NAVN = 24, MAKS_BYGG = 400;

  // ---------- lenke og adresse ----------
  // Invitasjonslenken: <side>#spill=<wss-adresse>&kode=<KODE>
  function lesLenke(tekst) {
    const t = String(tekst || '').trim(); const i = t.indexOf('#'); const h = i >= 0 ? t.slice(i + 1) : t;
    const p = {}; for (const del of h.split('&')) { const j = del.indexOf('='); if (j > 0) p[del.slice(0, j)] = decodeURIComponent(del.slice(j + 1)); }
    const adr = rensAdresse(p.spill), kode = rensKode(p.kode);
    return adr && kode ? { adresse: adr, kode } : null;
  }
  // Vertslenken fra tjenerprogrammet: <side>#vert=<wss-adresse> (verten kobler seg til gjennom tunnelen)
  function lesVertLenke(tekst) {
    const t = String(tekst || ''); const m = /[#&]vert=([^&]+)/.exec(t); if (!m) return null;
    const adr = rensAdresse(decodeURIComponent(m[1])); return adr ? { adresse: adr } : null;
  }
  function lagLenke(side, adresse, kode) { return String(side).split('#')[0] + '#spill=' + encodeURIComponent(adresse) + '&kode=' + kode; }
  // http(s) -> ws(s); bare vertsnavn -> ws://navn:8787
  function rensAdresse(a) {
    let s = String(a || '').trim(); if (!s) return null;
    if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws');
    if (!/^wss?:\/\//i.test(s)) s = 'ws://' + s + (/:\d+$/.test(s) ? '' : ':8787');
    try { const u = new URL(s); return u.protocol + '//' + u.host; } catch (e) { return null; }
  }
  const rensKode = k => { const s = String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length === 6 ? s : null; };
  const statusAdresse = ws => String(ws).replace(/^ws/i, 'http') + '/status';
  // En side lastet over https kan bare snakke med wss – eller med ws på denne maskinen (localhost)
  function kanKoble(sideProtokoll, adresse) {
    if (sideProtokoll !== 'https:') return true;
    if (/^wss:/i.test(adresse)) return true;
    try { const h = new URL(adresse).hostname; return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'; } catch (e) { return false; }
  }
  const rensNavn = n => String(n || '').replace(/[<>&"]/g, '').trim().slice(0, MAKS_NAVN) || 'Spiller';

  // ---------- øyeblikksbildet ----------
  function tynnSti(s) {
    if (!s.sti || s.sti.length < 2) return null;
    const rest = s.sti.slice(Math.max(0, s.seg)); const n = rest.length, steg = Math.max(1, Math.ceil(n / MAKS_STI)), ut = [];
    for (let i = 0; i < n; i += steg) ut.push([Math.round(rest[i][0]), Math.round(rest[i][1])]);
    const siste = rest[n - 1]; const u = ut[ut.length - 1]; if (u[0] !== Math.round(siste[0]) || u[1] !== Math.round(siste[1])) ut.push([Math.round(siste[0]), Math.round(siste[1])]);
    return ut;
  }
  function pakkLag(s) {
    const d = { id: s.nid, navn: String(s.navn).replace(/ \(deg\)$/, ''), side: s.side || 'blå', x: r1(s.x), y: r1(s.y), r: +(+s.retning || 0).toFixed(2), l: s.leder || 0,
      m: s.menn.map(m => [m.navn, m.rolle, +(+m.hp).toFixed(2), +(+m.loy || 0).toFixed(2)]) };
    const sti = tynnSti(s); if (sti) { d.sti = sti; d.t = +(+s.timerIgjen || 0).toFixed(2); }
    if (s.eier) d.eier = s.eier; if (s.speider) d.speider = 1; if (s.ingeniør) d.ing = 1; if (s.nedgravd) d.ned = 1; if (s.karakter) d.kar = 1;
    if (s.ammo !== undefined) d.ammo = +(+s.ammo).toFixed(2); if (s.formasjon) d.form = s.formasjon;
    if (s.strid && typeof s.strid === 'object') d.strid = Object.assign({}, s.strid);
    return d;
  }
  function pakkKj(k) {
    return { navn: k.navn, type: k.type, side: k.side || 'blå', antall: k.antall, x: r1(k.x), y: r1(k.y), r: +(+k.retning || 0).toFixed(2) };
  }
  // ser(e): om verten ser laget (tåka gjelder gjestene også – samme side). Egne lag sendes alltid.
  function bilde(o) {
    const lag = o.lag.filter(s => s.side === 'blå' || o.ser(s)).map(pakkLag);
    const kj = (o.kj || []).filter(k => (k.side || 'blå') === 'blå' || o.ser(k)).map(pakkKj);
    const d = { v: VERSJON, tid: +(+o.tid).toFixed(3), tempo: o.tempo, lag, kj };
    if (o.vær) d.vær = o.vær; if (o.leir) d.leir = { x: r1(o.leir.x), y: r1(o.leir.y), navn: String(o.leir.navn || 'Vertens leir') };
    if (o.selskap) d.selskap = String(o.selskap);
    // vertens leirbygg (bare til tegning hos gjestene): type, sted, retning, ferdig; gjerder/veger som punkter. Høyst MAKS_BYGG.
    if (Array.isArray(o.bygg)) d.bygg = o.bygg.slice(0, MAKS_BYGG).map(b => { const q = { t: String(b.type), x: r1(b.x), y: r1(b.y), r: +(+b.ret || 0).toFixed(2), f: b.igjen > 0 ? 0 : 1 };
      if (Array.isArray(b.punkter)) q.p = b.punkter.slice(0, 60).map(([x, y]) => [Math.round(x), Math.round(y)]); return q; });
    // hvor spillerne er (kameraet, eller der de går i 3D): [{ id, navn, x, y, går }]
    if (Array.isArray(o.spillere)) d.sp = o.spillere.filter(p => Number.isFinite(+p.x) && Number.isFinite(+p.y)).map(p => ({ id: String(p.id), navn: rensNavn(p.navn), x: Math.round(p.x), y: Math.round(p.y), går: p.går ? 1 : 0 }));
    return d;
  }
  // Gjesten: lagene i bildet settes inn i lista (samme objekt når id-en finnes), resten tas ut. lag(id) lager et nytt lag.
  function brukBilde(d, liste, nytt) {
    if (!d || d.v !== VERSJON || !Array.isArray(d.lag)) return { ok: false };
    const finnes = new Map(); for (const s of liste) if (s.nid != null) finnes.set(s.nid, s);
    const ny = [];
    for (const q of d.lag) {
      let s = finnes.get(q.id); if (!s) { s = nytt(q); s.nid = q.id; }
      const flytt = Math.hypot(tall(q.x) - s.x, tall(q.y) - s.y);
      s.navn = String(q.navn); s.side = String(q.side || 'blå'); s.x = tall(q.x, s.x); s.y = tall(q.y, s.y); s.retning = tall(q.r, 0); s.leder = tall(q.l, 0);
      s.menn = (q.m || []).map((m, i) => Object.assign(s.menn[i] || {}, { navn: String(m[0]), rolle: String(m[1]), hp: tall(m[2], 1), loy: tall(m[3], .8) }));
      if (q.sti && q.sti.length > 1) { s.sti = q.sti; s.steg = q.sti.map(() => 1); s.seg = 0; s.prog = 0; s.timerIgjen = tall(q.t, 0); } else { s.sti = null; s.steg = null; }
      s.eier = q.eier || null; s.speider = !!q.speider; s.ingeniør = !!q.ing; s.nedgravd = !!q.ned; s.karakter = false; s.figur = !!q.kar;   // en annen spillers figur – aldri gjestens egen karakter (funn 2)
      if (q.ammo !== undefined) s.ammo = tall(q.ammo, 1); if (q.form) s.formasjon = q.form;
      if (q.strid && typeof q.strid === 'object') s.strid = Object.assign({}, q.strid);
      if (flytt > 60) s.siktSkitten = true;
      ny.push(s);
    }
    // lista byttes ut på stedet (ENHETER er en const i index.html)
    liste.length = 0; for (const s of ny) liste.push(s);
    return { ok: true, antall: ny.length };
  }

  // ---------- kommandoer fra gjestene ----------
  // Marsjordre og stopp i første trinn. Svaret: { ok, type, lag, x, y, feil }.
  function sjekkKommando(k, fra, lag) {
    if (!k || typeof k !== 'object') return { ok: false, feil: 'Ugyldig kommando.' };
    if (k.type === 'ordre') {
      const x = +k.x, y = +k.y; if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, feil: 'Ugyldig mål.' };
      const s = lag.find(q => q.nid === k.lag); if (!s) return { ok: false, feil: 'Fant ikke laget.' };
      if (s.side !== 'blå') return { ok: false, feil: 'Det er ikke vårt lag.' };
      if (s.eier !== fra) return { ok: false, feil: `${s.navn} styres av ${s.eier ? 'en annen spiller' : 'verten'}.` };
      return { ok: true, type: 'ordre', lag: s, x, y };
    }
    if (k.type === 'pos') {
      const x = +k.x, y = +k.y; if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, feil: 'Ugyldig sted.' };
      return { ok: true, type: 'pos', x, y, går: !!k.går };
    }
    if (k.type === 'stopp') {
      const s = lag.find(q => q.nid === k.lag); if (!s) return { ok: false, feil: 'Fant ikke laget.' };
      if (s.side !== 'blå' || s.eier !== fra) return { ok: false, feil: `${s.navn} styres ikke av deg.` };
      return { ok: true, type: 'stopp', lag: s };
    }
    return { ok: false, feil: 'Ukjent kommando.' };
  }
  // Neste eier når verten trykker «Gi til»: verten (null) -> gjest 1 -> gjest 2 -> … -> verten
  function nesteEier(nå, gjester) {
    const ider = [null].concat(gjester.map(g => g.id)); const i = ider.indexOf(nå == null ? null : nå);
    return ider[(i + 1) % ider.length];
  }
  // Tiden som skal regnes fram når verden har stått (tjeneren sier hvor lenge): spillminutter ved 1× (sanntid), høyst 7 døgn,
  // ingenting under 2 minutter.
  function framTid(borteSek) { const s = tall(borteSek, 0); if (s < 120) return 0; return Math.min(7 * 24 * 60, s / 60); }

  // Hjørnene til et bygg i kartets meter (fot = [x0, x1, y0, y1] rundt modellens origo, fronten mot +x, dreid med r)
  function hjørner(b, fot) {
    const c = Math.cos(b.r || 0), s = Math.sin(b.r || 0);
    return [[fot[0], fot[2]], [fot[1], fot[2]], [fot[1], fot[3]], [fot[0], fot[3]]].map(([x, y]) => [b.x + x * c - y * s, b.y + x * s + y * c]);
  }
  const F = { VERSJON, hjørner, lesLenke, lesVertLenke, lagLenke, rensAdresse, rensKode, statusAdresse, kanKoble, rensNavn, pakkLag, pakkKj, bilde, brukBilde,
    sjekkKommando, nesteEier, framTid, tynnSti };
  if (typeof module !== 'undefined' && module.exports) module.exports = F; else rot.Flerspiller = F;
})(typeof globalThis !== 'undefined' ? globalThis : this);
