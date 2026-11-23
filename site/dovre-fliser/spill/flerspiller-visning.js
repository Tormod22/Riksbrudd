/* Flerspiller i nettleseren (M2a, 22. nov – docs/plan-flerspiller.md). Reglene: spill/flerspiller.js. Tjeneren: tjener/riksbrudd-tjener.js.
 * window.NETT: rolle (null | 'vert' | 'gjest'), id, kode, spillere, gjest (true når denne nettleseren er gjest), fangOrdre(s, X, Y, stille).
 * index.html: sim() regner bare klokka når NETT.gjest, ordre() spør NETT.fangOrdre først. lagring.js lagrer ikke verden når NETT.gjest.
 * GJESTER I VERTENS LEIR (R18-D, 23. nov): verten sender leirens tilstand ({ t: 'leir' }: Leir.tilJSON med folket, kassa, leirens
 * plass, selskapets navn og flagg, bonus, tillatelsen og kvitteringer for gjestenes kommandoer) når noe er endret, høyst hvert 1,5 s.
 * Gjesten viser den som et speil (LeirSpill.speil, FolkSpill.speil, OppstartSpill.tilstand/betal/gi/bonus pakket inn) og sender
 * leirkommandoene gjennom kommandolaget (kommando-visning.js kjører dem på speilet først). Verten velger hva gjestene kan («bare
 * se» / «bygge og folk» / «alt», per verden i «riksbrudd-nett».tillat) og logger hvem som gjorde hva. En gjest lagrer aldri noe
 * under «riksbrudd-…» (utenom «riksbrudd-nett») – heller ikke etter «Koble fra», før siden er lastet på nytt.
 * Ingenting skjer før spilleren trykker «Spill sammen» i ☰ eller åpner en invitasjonslenke (#spill=…&kode=…).
 */
(function () {
  'use strict';
  const F = window.Flerspiller; if (!F) return;
  const NØKKEL = 'riksbrudd-nett', BILDE_MS = 500, BILDE_ALENE_MS = 5000, PING_MS = 15000;
  const les = () => { try { return JSON.parse(localStorage.getItem(NØKKEL) || '{}') || {}; } catch (e) { return {}; } };
  const skriv = o => { try { localStorage.setItem(NØKKEL, JSON.stringify(Object.assign(les(), o))); } catch (e) { /* privat vindu */ } };
  // Math.random med vilje (bare utseende): spiller-id-en i nettverket er ikke en del av verden.
  const lagId = () => { let id = les().id; if (!id) { id = Math.random().toString(36).slice(2, 10); skriv({ id }); } return id; };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const sikkerLogg = t => { try { logg(t); } catch (e) { /* før spillet er klart */ } };

  const N = { rolle: null, id: lagId(), kode: null, adresse: null, spillere: [], tilkoblet: false, ws: null, tunnel: null, sistBilde: 0, tellBilder: 0,
    get gjest() { return this.rolle === 'gjest'; }, vertBorte: false, framTil: null, ønsket: false, forsøk: 0 };
  window.NETT = N;
  const navnPå = id => { const p = N.spillere.find(q => q.id === id); return p ? p.navn : 'en annen spiller'; };
  const gjester = () => N.spillere.filter(p => p.rolle === 'gjest');

  // ---------- forbindelsen ----------
  function send(o) { if (N.ws && N.ws.readyState === 1) { N.ws.send(JSON.stringify(o)); return true; } return false; }
  function koble(rolle, adresse, kode, navn) {
    const adr = F.rensAdresse(adresse); if (!adr) { status('Ugyldig adresse.'); return; }
    if (!F.kanKoble(location.protocol, adr)) { status('Denne siden er lastet over https og kan bare koble til en wss-adresse (tunnelen) eller tjeneren på denne PC-en (localhost).'); return; }
    koblFra(true); N.rolle = rolle; N.adresse = adr; N.kode = kode || null; N.navn = F.rensNavn(navn); N.ønsket = true; N.tilkoblet = false;
    skriv(rolle === 'vert' ? { navn: N.navn, adresse: adr } : { navn: N.navn });
    åpne();
  }
  function åpne() {
    let ws; try { ws = new WebSocket(N.adresse); } catch (e) { status('Fikk ikke koblet til: ' + e.message); return; }
    N.ws = ws; status('Kobler til ' + N.adresse + ' …');
    ws.onopen = () => { N.forsøk = 0; if (N.opptatt && N.tilkoblet) N.opptatt = 0; send({ t: 'hei', rolle: N.rolle, kode: N.kode || undefined, navn: N.navn, id: N.id }); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } motta(m); };
    ws.onclose = () => {
      if (N.ws !== ws) return; const var_ = N.tilkoblet; N.tilkoblet = false; N.ws = null; vis();
      if (!N.ønsket) return;
      if (var_) sikkerLogg('Mistet forbindelsen med tjeneren. Prøver igjen …');
      const vent = N.opptatt ? 20 : Math.min(30, 2 ** Math.min(5, ++N.forsøk)); status(`Ingen forbindelse – prøver igjen om ${vent} s.`);
      clearTimeout(N.igjen); N.igjen = setTimeout(() => { if (N.ønsket && !N.ws) åpne(); }, vent * 1000);
    };
    ws.onerror = () => { /* onclose kommer etterpå */ };
  }
  function koblFra(stille) {
    N.ønsket = false; clearTimeout(N.igjen); const ws = N.ws; N.ws = null;
    if (ws) try { ws.close(); } catch (e) { /* ok */ }
    const varGjest = N.rolle === 'gjest';
    if (varGjest) { N.varGjest = true; slippSpeil(); }
    N.rolle = null; N.tilkoblet = false; N.spillere = []; N.vertBorte = false; N.sett = false; skriv({ vertNå: false });
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) if (s.eier) s.eier = null;
    document.body.classList.remove('nettgjest');
    if (!stille) { sikkerLogg('Koblet fra flerspilleren.'); if (varGjest) sikkerLogg('Last siden på nytt for å fortsette ditt eget spill.'); }
    vis();
  }
  function motta(m) {
    switch (m.t) {
      case 'velkommen': {
        N.tilkoblet = true; statusTekst = ''; N.opptatt = 0; N.id = m.id || N.id; N.kode = m.kode; N.spillere = m.spillere || []; skriv({ id: N.id });
        if (N.rolle === 'vert') { skriv({ kode: N.kode, adresse: N.adresse, vertNå: true }); hentTunnel(); sikkerLogg(`Verden ${N.kode} er åpen. Del invitasjonslenken under «Spill sammen».`);
          const fram = m.lagret ? F.framTid(m.lagret.borteSek) : 0; if (fram > 0) regnFram(fram); }
        else { sikkerLogg(`Du er med i verden ${N.kode}. Verten styrer tiden; du styrer lagene verten gir deg.`); lukkStart(); }
        break;
      }
      case 'spillere': {
        const før = new Set(N.spillere.map(p => p.id)), nå = m.spillere || [];
        for (const p of nå) if (!før.has(p.id) && p.id !== N.id) { sikkerLogg(`${p.navn} er med i verden.`); N.leirTvang = true; }
        for (const id of før) if (!nå.some(p => p.id === id) && id !== N.id) { sikkerLogg(`${navnPå(id)} gikk ut.`);
          // lagene til en som går, går tilbake til verten
          if (N.rolle === 'vert' && typeof ENHETER !== 'undefined') for (const s of ENHETER) if (s.eier === id) s.eier = null; }
        N.spillere = nå; break;
      }
      case 'tilstand': if (N.rolle === 'gjest') brukBilde(m.data); break;
      case 'leir': if (N.rolle === 'gjest') brukLeir(m.data); break;
      case 'kommando': if (N.rolle === 'vert') kommando(m); break;
      case 'svar': if (m.feil) sikkerLogg(m.feil); else if (m.tekst) sikkerLogg(m.tekst); break;
      case 'melding': sikkerLogg(`${m.navn || 'Spiller'}: «${m.tekst}»`); break;
      case 'vertBorte': N.vertBorte = true; sikkerLogg('Verten er borte. Verden står stille til verten kommer tilbake.'); break;
      case 'vertTilbake': N.vertBorte = false; sikkerLogg('Verten er tilbake.'); break;
      case 'feil': {
        // verden har fortsatt en vert: forrige forbindelse er ikke merket som død ennå (tjeneren venter opptil 60 s) – prøv igjen (funn 8)
        if (!N.tilkoblet && N.rolle === 'vert' && /alt en vert/i.test(m.tekst || '') && (N.opptatt = (N.opptatt || 0) + 1) <= 5) {
          status('Verden er fortsatt opptatt av forrige forbindelse – prøver igjen om 20 s …'); break; }
        status(m.tekst || 'Feil fra tjeneren.'); if (!(N.vertBorte && /ikke tilkoblet/i.test(m.tekst || ''))) sikkerLogg(m.tekst || 'Feil fra tjeneren.'); if (!N.tilkoblet) { N.ønsket = false; } break;
      }
      default: break;
    }
    vis();
  }
  // Tunneladressen står i tjenerens /status (tjeneren er på denne PC-en, så http://localhost er lov fra en https-side)
  async function hentTunnel() {
    try { const r = await fetch(F.statusAdresse(N.adresse), { cache: 'no-store' }); const j = await r.json(); N.tunnel = j.tunnel ? F.rensAdresse(j.tunnel) : null; } catch (e) { N.tunnel = null; }
    vis();
  }

  // ---------- verten ----------
  // Hvem som styrer hvilke lag, huskes per verden (lagets navn -> spillerens id), så det overlever at verten laster siden på nytt
  // eller at en gjest faller ut en stund (Windows-test 22. nov: gjesten mistet laget da verten lastet på nytt).
  const eiere = () => { const l = les(); return (l.eiere && N.kode && l.eiere[N.kode]) || {}; };
  function huskEier(s) { if (!N.kode) return; const l = les(), alle = l.eiere || {}, e = Object.assign({}, alle[N.kode] || {});
    if (s.eier) e[s.navn] = s.eier; else delete e[s.navn]; alle[N.kode] = e; skriv({ eiere: alle }); }
  function brukEiere() {
    if (N.rolle !== 'vert' || typeof ENHETER === 'undefined') return; const e = eiere(), med = new Set(N.spillere.map(p => p.id));
    let ny = false;
    for (const s of ENHETER) if (s.side === 'blå' && !s.karakter) {
      if (s.eier && !med.has(s.eier)) s.eier = null;                                   // spilleren er ikke med nå (huskes likevel)
      else if (s.eier && e[s.navn] !== s.eier) { e[s.navn] = s.eier; ny = true; }       // gitt bort på en annen måte: husk det
      else if (!s.eier && e[s.navn] && med.has(e[s.navn])) s.eier = e[s.navn];         // tilbake: verten lastet på nytt / gjesten kom igjen
    }
    if (ny && N.kode) { const l = les(), alle = l.eiere || {}; alle[N.kode] = e; skriv({ eiere: alle }); }
  }
  let nid = 0;
  // nid fra kommandolaget (spill/kommando.js) når det finnes, så knappene og bildet bruker de samme
  const merk = () => { if (typeof ENHETER === 'undefined') return; for (const s of ENHETER) if (s.nid == null) { if (window.Kommando) Kommando.nid(s, ENHETER); else s.nid = 'l' + (++nid); } };
  function bildeNå() {
    merk(); const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, fr = window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER.blå;
    return F.bilde({ lag: ENHETER, kj: window.KJORETOY || [], tid, tempo, ser: e => { try { return synlig(e); } catch (x) { return false; } },
      spillere: hvorAlle(),
      bygg: L && Array.isArray(L.bygg) ? L.bygg : null,
      vær: window.VaerSpill ? VaerSpill.S : null, leir: L && L.midt ? { x: L.midt.x, y: L.midt.y, navn: fr ? fr.navn : 'Vertens leir' } : null, selskap: fr ? fr.navn : null });
  }
  // hvor denne spilleren er: der hun går i 3D, ellers midt i kartet/kameraet
  function minPos() {
    try { if (typeof R3 !== 'undefined' && R3 && på3d && R3.ut && R3.bane) return { x: R3.ut.cx + R3.bane.x, y: R3.ut.cy + R3.bane.y, går: !!R3.fot }; } catch (e) { /* ok */ }
    return typeof kam !== 'undefined' ? { x: kam.x, y: kam.y, går: false } : null;
  }
  N.pos = new Map();
  function hvorAlle() {
    const ut = [], m = minPos(); if (m) ut.push({ id: N.id, navn: N.navn, x: m.x, y: m.y, går: m.går });
    const nå = Date.now(); for (const [id, p] of N.pos) if (nå - p.t < 15000 && N.spillere.some(q => q.id === id)) ut.push({ id, navn: navnPå(id), x: p.x, y: p.y, går: p.går });
    return ut;
  }
  function sendBilde() {
    if (N.rolle !== 'vert' || !N.tilkoblet) return; const nå = performance.now();
    if (nå - N.sistBilde < (gjester().length ? BILDE_MS : BILDE_ALENE_MS)) return;
    N.sistBilde = nå; brukEiere(); try { send({ t: 'tilstand', data: bildeNå(), tid }); N.tellBilder++; } catch (e) { console.warn('flerspiller: bildet', e); }
  }
  // KOMMANDOLAGET (R16-A): verten kjører gjestens kommando med Kommando.utfør og gjestens id (laget må ha s.eier === gjestens id).
  // Leirkommandoene (R18-D) slippes gjennom når verten har gitt lov (tillat(): «bare se», «bygge og folk» eller «alt»); kassa er
  // vertens. 'pos' og kommandoer uten kommandolag går som før (Flerspiller.sjekkKommando).
  const tillat = () => { const l = les(); return F.rensTillat(l.tillat && N.kode ? l.tillat[N.kode] : null); };
  function settTillat(v) { if (!N.kode) return; const l = les(), t = Object.assign({}, l.tillat || {}); t[N.kode] = F.rensTillat(v); skriv({ tillat: t });
    sikkerLogg(`Gjestene kan nå: ${F.TILLAT[t[N.kode]].navn.toLowerCase()} i leiren.`); N.leirTvang = true; vis(); }
  const ctxFra = fra => ({ lag: ENHETER, kjøretøy: window.KJORETOY || [], side: 'blå', spiller: fra, erVert: false, leirTillatt: type => F.leirLov(tillat(), type) });
  function utførFra(k, fra) {
    merk(); if (!window.Kommando) return { ok: false, feil: 'Ukjent kommando.' };
    // troppene (oppløs, nytt utstyr) er lagkommandoer, men hører til leiren: tillatelsen gjelder dem også
    if (F.BARE_HOS_VERTEN.includes(k.type) && !(Kommando.def(k.type) || {}).leir) { const f = F.leirLov(tillat(), k.type); if (f) return { ok: false, feil: f }; }
    return Kommando.utfør(k, ctxFra(fra));
  }
  // det loggen trenger om en leirkommando (slås opp før den kjøres – et revet bygg finnes ikke etterpå)
  function leirInfo(k) {
    const i = {}, L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, B = window.Leir ? Leir.BYGG : {};
    if (k.bygg && typeof k.bygg === 'object' && B[k.bygg.type]) { i.bygg = B[k.bygg.type].navn; i.ny = true; }
    else if (Number.isInteger(k.bygg) && L) { const b = L.bygg.find(q => q.id === k.bygg); if (b && B[b.type]) i.bygg = B[b.type].navn; }
    if (k.oppgave && window.FolkRegler && FolkRegler.OPPGAVE && FolkRegler.OPPGAVE[k.oppgave]) i.oppgave = `«${FolkRegler.OPPGAVE[k.oppgave].navn.toLowerCase()}»`;
    if (k.person != null && window.FolkSpill) { const Fo = FolkSpill.tilstand(), p = Fo && Fo.personer.find(q => q.id === k.person); if (p) i.person = p.navn; }
    if (k.lag != null) { const s = ENHETER.find(q => q.nid === k.lag); if (s) i.lag = s.navn; }
    return i;
  }
  // etter en leirkommando fra en gjest: lagre leiren, tegn den på nytt (2D, 3D, menyene) og send et nytt speil straks
  function etterLeir(k, r) {
    try { if (window.LeirSpill) { LeirSpill.lagre(); if (/^(bygg|byggPlan|riv|flytt|oppgrader|reparer)$/.test(k.type)) LeirSpill.oppdater3d(true); if (LeirSpill.visMeny) LeirSpill.visMeny(); } } catch (e) { /* ok */ }
    try { if (window.FolkSpill && FolkSpill.vis) FolkSpill.vis(); } catch (e) { /* ok */ }
    if (k.type === 'troppOpprett' && r && r.svar && r.svar.lag) { const s = r.svar.lag; s.eier = N.leirFra; merk(); huskEier(s); }
    skitten = true; N.leirTvang = true; N.sistBilde = 0;
  }
  N.kvitt = {};
  function kommando(m) {
    if (m.k && Number.isFinite(+m.k.nr)) { N.kvitt[m.fra] = Math.max(N.kvitt[m.fra] || 0, +m.k.nr); N.leirTvang = true; }
    if (m.k && m.k.type !== 'pos' && window.Kommando && Kommando.finnes(m.k.type)) {
      const def = Kommando.def(m.k.type) || {}, erLeir = !!def.leir || F.BARE_HOS_VERTEN.includes(m.k.type), info = erLeir ? leirInfo(m.k) : null;
      N.leirFra = m.fra; const r = utførFra(m.k, m.fra); if (!r.ok) { send({ t: 'svar', til: m.fra, feil: r.feil }); return; }
      const hvem = m.navn || navnPå(m.fra), b = erLeir ? F.leirTekst(m.k, info) : Kommando.beskriv(m.k, ctxFra(m.fra));
      if (b) sikkerLogg(`${hvem} ${b}.`);
      if (erLeir) etterLeir(m.k, r);
      const svar = typeof r.svar === 'string' ? r.svar : erLeir && b ? `Verten har fått det: du ${b}.` : 'Kommandoen er utført.';
      send({ t: 'svar', til: m.fra, tekst: svar }); N.sistBilde = 0; return;
    }
    merk(); const r = F.sjekkKommando(m.k, m.fra, ENHETER);
    if (!r.ok) { send({ t: 'svar', til: m.fra, feil: r.feil }); return; }
    if (r.type === 'pos') { N.pos.set(m.fra, { x: r.x, y: r.y, går: r.går, t: Date.now() }); return; }
    if (r.type === 'stopp') { const q = r.lag; q.sti = null; q.kø = null; q.køSlutt = null; q.køSiste = false; q.siktSkitten = true; skitten = true;
      sikkerLogg(`${m.navn || navnPå(m.fra)} stanser ${q.navn}.`); send({ t: 'svar', til: m.fra, tekst: `${q.navn} står.` }); N.sistBilde = 0; return; }
    ordre(r.lag, r.x, r.y); sikkerLogg(`${m.navn || navnPå(m.fra)} sender ${r.lag.navn} av gårde.`);
    send({ t: 'svar', til: m.fra, tekst: `${r.lag.navn}: ordren er mottatt.` });
  }
  // LEIREN TIL GJESTENE (R18-D): vertens leir (Leir.tilJSON med folket), kassa, leirens plass, selskapets navn og flagg, bonusen og
  // tillatelsen. Sendes bare når noe er endret (eller tvunget: ny gjest, en kommando, ny tillatelse), og høyst hvert 1,5 s.
  N.leirVer = 0; N.sistLeir = 0; N.sistLeirTekst = '';
  function leirBilde() {
    const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, S = window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null;
    if (!L || !S || !window.Leir) return null;
    let bonus = {}; try { bonus = OppstartSpill.bonus ? OppstartSpill.bonus() || {} : {}; } catch (e) { bonus = {}; }
    return { L: Leir.tilJSON(L), penger: S.penger, leir: S.leir, navn: S.fraksjon ? S.fraksjon.navn : '', flagg: S.fraksjon ? S.fraksjon.flagg : null, bonus, tillat: tillat(), kvitt: N.kvitt };
  }
  function sendLeir() {
    if (N.rolle !== 'vert' || !N.tilkoblet || !gjester().length) return; const nå = performance.now();
    if (!N.leirTvang && nå - N.sistLeir < F.REGLER_LEIR.ms) return;
    const o = leirBilde(); if (!o) return;
    const tekst = JSON.stringify(o); N.sistLeir = nå;
    if (tekst === N.sistLeirTekst && !N.leirTvang) return;
    N.leirTvang = false; N.sistLeirTekst = tekst; o.ver = ++N.leirVer;
    try { send({ t: 'leir', data: F.pakkLeir(o) }); } catch (e) { console.warn('flerspiller: leiren', e); }
  }
  // Tiden som har gått mens verden sto, regnes fram med 600× (som ⏭), så går farten tilbake til 1×
  function regnFram(min) {
    N.framTil = tid + min; const t = min >= 60 ? Math.round(min / 6) / 10 + ' t' : Math.round(min) + ' min';
    sikkerLogg(`Verden har stått i ${t}. Regner tiden fram …`);
    const b = document.getElementById('sp4'); if (b) b.click();
  }
  setInterval(() => {
    sendBilde(); sendLeir(); if (N.ventLeir) brukLeir(N.ventLeir);
    if (N.framTil != null && typeof tid !== 'undefined' && tid >= N.framTil) { N.framTil = null; const b = document.getElementById('sp1'); if (b) b.click(); sikkerLogg('Tiden er regnet fram.'); }
  }, 100);
  setInterval(() => { if (N.tilkoblet) send({ t: 'ping' }); }, PING_MS);
  setInterval(() => { if (N.gjest && N.tilkoblet && !N.vertBorte) { const p = minPos(); if (p) send({ t: 'kommando', k: { type: 'pos', x: Math.round(p.x), y: Math.round(p.y), går: p.går } }); } }, 2000);

  // ---------- gjesten ----------
  function brukBilde(d) {
    if (typeof ENHETER === 'undefined') return;
    const før = new Map(); for (const s of ENHETER) if (s.nid != null) før.set(s.nid, [s.x, s.y]);
    const r = F.brukBilde(d, ENHETER, q => nyttLag(q.navn, q.x, q.y, q.side, !!q.speider)); if (!r.ok) return;
    // glatt bevegelse: laget glir fra der det sto til det nye stedet i løpet av tiden til neste bilde (ikke ved store hopp)
    const t0 = performance.now();
    for (const s of ENHETER) { const p = før.get(s.nid); if (!p) continue; const dx = s.x - p[0], dy = s.y - p[1], d2 = Math.hypot(dx, dy);
      if (d2 > .05 && d2 < 400) { s.glatt = { fx: p[0], fy: p[1], tx: s.x, ty: s.y, t0 }; s.x = p[0]; s.y = p[1]; } else delete s.glatt; }
    if (Array.isArray(d.kj) && window.KJORETOY && window.Kjoretoy) {
      const før = new Map(KJORETOY.map(k => [k.navn, k])), ny = [];
      for (const q of d.kj) { let k = før.get(q.navn); if (!k) { try { k = Kjoretoy.ny({ navn: q.navn, type: q.type, antall: q.antall, x: q.x, y: q.y, retning: q.r }); } catch (e) { continue; } }
        k.x = q.x; k.y = q.y; k.retning = q.r; k.antall = q.antall; k.side = q.side; ny.push(k); }
      KJORETOY.length = 0; for (const k of ny) KJORETOY.push(k);
    }
    tid = d.tid; tempo = d.tempo; settFartKnapp(d.tempo); document.body.classList.add('nettgjest');
    const nå = performance.now();
    if (d.vær && window.VaerSpill && nå - (N.sistVær || 0) > 10000) { N.sistVær = nå; try { Object.assign(VaerSpill.S, d.vær); } catch (e) { /* ok */ } }
    // første bilde: kartet går til vertens leir (ellers står gjesten der hennes eget spill var)
    if (!N.sett && d.leir && typeof kam !== 'undefined') { N.sett = true; kam.x = d.leir.x; kam.y = d.leir.y; kam.m = Math.min(kam.m, 8); }
    N.andre = Array.isArray(d.sp) ? d.sp.filter(p => p.id !== N.id) : [];
    N.vertLeir = d.leir || null; N.vertBygg = Array.isArray(d.bygg) ? d.bygg : null; N.selskap = d.selskap || null; N.sistBilde = nå; N.tellBilder++;
    if (typeof valgt !== 'undefined' && valgt && !ENHETER.includes(valgt)) { valgt = null; try { visPanel(); } catch (e) { /* ok */ } }
    else if (typeof valgt !== 'undefined' && valgt && nå - (N.sistPanel || 0) > 1000) {
      const P0 = document.getElementById('panel'); if (!(window.pekerNede && P0 && pekerNede(P0))) { N.sistPanel = nå; try { visPanel(); } catch (e) { /* ok */ } } }
    skitten = true;
  }
  // ---------- gjesten i vertens leir (R18-D) ----------
  // Speilet: vertens leir (Leir.fraJSON), folket og kassa. LeirSpill.speil/FolkSpill.speil viser det i Leir-menyen, Folk, Tropper,
  // byggpanelet, 2D og 3D. OppstartSpill.tilstand/betal/gi/bonus svarer med vertens kasse og leir mens speilet står (gjestens eget
  // spill i minnet røres ikke). Leirkommandoene kjøres først på speilet (svaret straks), så hos verten (kommando-visning.js).
  N.sendtNr = 0; N.sendtKl = 0; N.speilS = null; N.leirData = null;
  N.nesteNr = () => { N.sendtNr++; N.sendtKl = Date.now(); return N.sendtNr; };
  N.speilet = () => N.gjest && !!N.speilS;
  N.bareHosVerten = type => F.BARE_HOS_VERTEN.includes(type);
  N.leirTillatt = type => (!N.leirData ? 'Vertens leir er ikke kommet fram ennå – vent litt (verten må ha lagt en leir).' : F.leirLov(N.leirData.tillat, type));
  let OS0 = null;
  function pakkInnOppstart() {
    const O = window.OppstartSpill; if (!O || OS0) return; OS0 = { tilstand: O.tilstand, betal: O.betal, gi: O.gi, bonus: O.bonus };
    O.tilstand = () => (N.speilet() ? N.speilS : OS0.tilstand());
    O.betal = b => { if (!N.speilet()) return OS0.betal(b); if (!(b >= 0) || N.speilS.penger < b) return false; N.speilS.penger -= b; visKasse(); return true; };
    O.gi = b => { if (!N.speilet()) return OS0.gi(b); if (b > 0) { N.speilS.penger += b; visKasse(); } };
    O.bonus = () => (N.speilet() ? (N.leirData && N.leirData.bonus) || {} : OS0.bonus ? OS0.bonus() : {});
  }
  function pakkUtOppstart() { const O = window.OppstartSpill; if (!O || !OS0) return; Object.assign(O, OS0); OS0 = null; }
  function visKasse() {
    const el = document.getElementById('sPenger'); if (!el || !N.speilS) return;
    el.textContent = window.Leir ? Leir.kroner(N.speilS.penger) : Math.round(N.speilS.penger) + ' kr'; if (el.parentElement) el.parentElement.hidden = false;
    el.title = 'Vertens kasse – felles for alle i verden';
  }
  function brukLeir(d) {
    if (!d || !window.Leir || !window.LeirSpill || !LeirSpill.speil) return;
    // verten har ikke kjørt gjestens siste kommando ennå: vent (ellers blinker det gamle tilbake)
    if (!F.brukLeirNå(d, N.id, N.sendtNr, N.sendtKl, Date.now())) { N.ventLeir = d; return; }
    N.ventLeir = null; if (N.leirData && N.speilS && N.leirData.ver === d.ver && N.leirData.L === d.L && N.leirData.penger === d.penger && N.leirData.tillat === d.tillat) return;
    const Ln = Leir.fraJSON(d.L); if (!Ln) return;
    const før = N.leirData; N.leirData = d; pakkInnOppstart();
    const egen = OS0 && OS0.tilstand ? OS0.tilstand() : null, std = window.Oppstart && Oppstart.standard ? Oppstart.standard() : { karakter: {}, fraksjon: { flagg: {} } };
    const base = egen || std;
    N.speilS = Object.assign(N.speilS || {}, base, { leir: d.leir || { x: Ln.midt ? Ln.midt.x : 0, y: Ln.midt ? Ln.midt.y : 0 }, penger: d.penger,
      fraksjon: Object.assign({}, base.fraksjon || {}, { navn: d.navn || 'Vertens leir', flagg: d.flagg || (base.fraksjon || {}).flagg }),
      karakter: Object.assign({}, base.karakter || {}, { navn: (base.karakter && base.karakter.navn) || N.navn }) });
    try { LeirSpill.speil(Ln); if (window.FolkSpill && FolkSpill.speil && Ln.folk) FolkSpill.speil(Ln.folk); } catch (e) { console.warn('flerspiller: speilet', e); }
    visKasse();
    if (!før) sikkerLogg(`Du ser leiren til ${d.navn || 'verten'}. ${F.TILLAT[d.tillat].tekst} Kassa er felles.`);
    else if (før.tillat !== d.tillat) sikkerLogg(`Verten har endret hva gjestene kan i leiren: ${F.TILLAT[d.tillat].navn.toLowerCase()}.`);
  }
  function slippSpeil() {
    if (!N.speilS && !N.leirData) return; N.speilS = null; N.leirData = null; N.ventLeir = null; pakkUtOppstart();
    try { if (window.LeirSpill && LeirSpill.speil) LeirSpill.speil(null); if (window.FolkSpill && FolkSpill.speil) FolkSpill.speil(null); } catch (e) { /* ok */ }
  }
  // En gjest skal aldri skrive over sitt eget lagrede spill: mens denne nettleseren er (eller har vært) gjest, lagres ingenting
  // under «riksbrudd-…» utenom flerspillerens egne innstillinger. Etter «Koble fra» lastes siden på nytt for å spille eget spill.
  (function vernLagring() {
    const P0 = window.Storage && Storage.prototype; if (!P0 || P0.setItem.rbNett) return;
    const sperret = k => (N.gjest || N.varGjest) && /^riksbrudd-/.test(String(k)) && !/^riksbrudd-nett(@|$)/.test(String(k));
    const set0 = P0.setItem, fjern0 = P0.removeItem;
    P0.setItem = function (k, v) { if (sperret(k)) return; return set0.call(this, k, v); }; P0.setItem.rbNett = true;
    P0.removeItem = function (k) { if (sperret(k)) return; return fjern0.call(this, k); };
  })();
  (function glid() {
    if (N.gjest && typeof ENHETER !== 'undefined') { const nå = performance.now(); let n = 0;
      for (const s of ENHETER) { const g = s.glatt; if (!g) continue; const k = Math.min(1, (nå - g.t0) / BILDE_MS); s.x = g.fx + (g.tx - g.fx) * k; s.y = g.fy + (g.ty - g.fy) * k; if (k >= 1) delete s.glatt; n++; }
      if (n) skitten = true; }
    requestAnimationFrame(glid);
  })();
  function settFartKnapp(v) {
    const id = { 0: 'sp0', 1: 'sp1', 10: 'sp2', 60: 'sp3', 600: 'sp4' }[v];
    for (const b of document.querySelectorAll('.knapper button[id^="sp"]')) b.classList.toggle('på', b.id === id);
  }
  N.fangOrdre = (s, X, Y, stille) => {
    if (!N.gjest) return false;
    if (!N.tilkoblet) { if (!stille) sikkerLogg('Ingen forbindelse med verten.'); return true; }
    if (s.side !== 'blå') return true;
    if (s.eier !== N.id) { if (!stille) sikkerLogg(`${s.navn} styres av ${s.eier ? navnPå(s.eier) : 'verten'}. Be verten gi deg laget.`); return true; }
    send({ t: 'kommando', k: { type: 'ordre', lag: s.nid, x: Math.round(X), y: Math.round(Y) } });
    if (!stille) sikkerLogg(`${s.navn}: ordren er sendt til verten …`); return true;
  };
  // lagpanelet hos gjesten (index.html visPanel): for egne lag marsj, stopp, grav ned, formasjon og stridsregler (alt går som
  // kommandoer til verten, window.KOMMANDO), ellers hvem som styrer laget
  N.lagPanel = (s, H) => {
    if (s.eier !== N.id) { const p = document.createElement('p'); p.style.margin = '4px 0'; p.textContent = `Styres av ${s.eier ? navnPå(s.eier) : 'verten'}.`; H.appendChild(p); return; }
    H.appendChild(knapp(modus === 'marsj' ? 'Velg mål på kartet …' : 'Marsjer', modus === 'marsj', () => { modus = modus === 'marsj' ? null : 'marsj'; visPanel(); skitten = true; }));
    const K = window.KOMMANDO;
    if (s.sti) H.appendChild(knapp('Stopp', false, () => (K ? K({ type: 'stopp', lag: s.nid }) : send({ t: 'kommando', k: { type: 'stopp', lag: s.nid } }))));
    if (!K) return;
    if (!s.sti && !s.nedgravd && !s.karakter && window.Feltarbeid) H.appendChild(knapp('Grav ned', false, () => K({ type: 'grav', lag: s.nid })));
    if (window.Formasjon && !s.karakter && !s.ombord) { const T = Formasjon.type(s.formasjon), b = knapp(`Formasjon: ${T.navn}`, false, () => K({ type: 'formasjon', lag: s.nid, id: Formasjon.neste(s.formasjon) })); b.id = 'formknapp'; b.title = T.tekst + ' Trykk for å bytte.'; H.appendChild(b); }
    if (window.StridSpill && StridSpill.åpne && !s.karakter) H.appendChild(knapp('Stridsregler', false, () => StridSpill.åpne(s)));
  };
  // Farten styres av verten: knappene og ⏭ gjør ingenting hos gjesten
  document.addEventListener('click', e => {
    if (!N.gjest) return; const b = e.target.closest && e.target.closest('#sp0,#sp1,#sp2,#sp3,#sp4,#nesteh'); if (!b) return;
    e.stopImmediatePropagation(); e.preventDefault(); sikkerLogg('Verten styrer farten i en delt verden.');
  }, true);
  function lukkStart() { try { if (window.OppstartSpill && OppstartSpill.lukk) OppstartSpill.lukk(); } catch (e) { /* ok */ } }

  // ---------- kroker i spillet ----------
  if (typeof KROKER !== 'undefined') {
    KROKER.lagTekst.push(s => (N.rolle && s.side === 'blå' && s.eier ? 'styres av ' + (s.eier === N.id ? 'deg' : navnPå(s.eier)) : null));
    KROKER.lagKnapper.push((s, H) => {
      if (N.rolle !== 'vert' || !N.tilkoblet || s.side !== 'blå' || s.karakter || !gjester().length) return;
      H.appendChild(knapp('Styres av: ' + (s.eier ? navnPå(s.eier) : 'deg'), !!s.eier, () => {
        s.eier = F.nesteEier(s.eier || null, gjester()); huskEier(s); sikkerLogg(`${s.navn} styres nå av ${s.eier ? navnPå(s.eier) : 'deg'}.`); N.sistBilde = 0; visPanel(); }));
    });
    // de andre spillerne: et merke med navnet der de er (i 2D og 3D)
  const andre = () => !N.tilkoblet ? [] : N.rolle === 'vert' ? hvorAlle().filter(p => p.id !== N.id) : (N.andre || []);
  KROKER.tegn.push((g, vx0, vy1) => {
    const L = andre(); if (!L.length) return; const m = kam.m; g.save(); g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'left';
    for (const p of L) { const x = (p.x - vx0) / m, y = (vy1 - p.y) / m;
      g.fillStyle = '#9fd0ff'; g.strokeStyle = '#0b0d10'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, p.går ? 5 : 7, 0, Math.PI * 2); g.fill(); g.stroke();
      if (!p.går) { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.strokeStyle = 'rgba(159,208,255,.6)'; g.stroke(); }
      g.lineWidth = 3; g.strokeStyle = 'rgba(11,13,16,.85)'; g.textAlign = 'center'; const t = p.navn + (p.går ? ' (til fots)' : ''), ty = window.Etikett ? Etikett.tekst(g, t, x, y - 16, -1, Etikett.REGLER.prio.egne) : y - 16; g.strokeText(t, x, ty); g.fillStyle = '#cfe7ff'; g.fillText(t, x, ty); }
    g.restore();
  });
  if (KROKER.tegn3d) KROKER.tegn3d.push((g, proj3) => {
    const L = andre(); if (!L.length) return; g.save(); g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'center';
    for (const p of L) { const q = proj3(p.x, p.y); if (!q) continue; const t = p.navn, w = g.measureText(t).width + 14;
      g.fillStyle = 'rgba(11,13,16,.8)'; g.fillRect(q[0] - w / 2, q[1] - 34, w, 20); g.fillStyle = '#cfe7ff'; g.fillText(t, q[0], q[1] - 20);
      g.beginPath(); g.moveTo(q[0], q[1] - 14); g.lineTo(q[0], q[1]); g.strokeStyle = '#9fd0ff'; g.lineWidth = 2; g.stroke(); }
    g.restore();
  });
  // gjesten ser vertens leirbygg i kartet (omriss; ferdige fylt, uferdige stiplet) når hun er nær nok – bare til speilet av
  // vertens leir er kommet (da tegner leir-visning.js byggene som hos verten)
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!N.gjest || !N.vertBygg || !window.Leir || kam.m > 6 || (window.LeirSpill && LeirSpill.erSpeil && LeirSpill.erSpeil())) return; const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m];
    g.save(); g.lineWidth = 1.5;
    for (const b of N.vertBygg) {
      const B = Leir.BYGG[b.t]; if (!B) continue; g.setLineDash(b.f ? [] : [5, 4]); g.strokeStyle = b.f ? '#f0d79a' : 'rgba(240,215,154,.7)';
      if (b.p && b.p.length > 1) { g.beginPath(); b.p.forEach(([x, y], i) => { const [sx, sy] = S(x, y); i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.lineWidth = B.veg ? Math.max(2, 5 / m) : 1.5; g.stroke(); g.lineWidth = 1.5; continue; }
      if (!B.fot) continue; const H = F.hjørner(b, B.fot).map(([x, y]) => S(x, y));
      g.beginPath(); H.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = b.f ? 'rgba(150,128,82,.9)' : 'rgba(150,128,82,.3)'; g.fill(); g.stroke();
      if (m < 1.2) { const [cx, cy] = S(b.x, b.y); g.setLineDash([]); g.font = '600 12px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillStyle = '#f0d79a'; g.fillText(B.navn || b.t, cx, cy + 4); }
    }
    g.restore();
  });
  // gjesten ser vertens leir som et merke i kartet
    KROKER.tegn.push((g, vx0, vy1) => {
      if (!N.gjest || !N.vertLeir) return; const m = kam.m, x = (N.vertLeir.x - vx0) / m, y = (vy1 - N.vertLeir.y) / m;
      g.save(); g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(22,18,12,.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 10, y + 7); g.lineTo(x - 10, y + 7); g.closePath(); g.fill(); g.stroke();
      g.font = '600 13px "Cormorant Garamond", serif'; g.fillStyle = '#f0d79a'; g.textAlign = 'center'; const ly = window.Etikett ? Etikett.tekst(g, N.vertLeir.navn, x, y + 22, 1, Etikett.REGLER.prio.leir) : y + 22; g.fillText(N.vertLeir.navn, x, ly); g.restore();
    });
  }

  // ---------- panelet «Spill sammen» ----------
  const css = document.createElement('style');
  css.textContent = `#nett{ position:fixed; z-index:40; box-sizing:border-box; right:12px; top:calc(var(--topp, 56px) + 8px); width:min(380px, calc(100vw - 24px)); max-height:calc(100vh - 120px); overflow:auto;
  background:var(--panel); border:1px solid var(--rule); color:var(--ink); padding:10px 12px 12px; display:none; font-size:14px; line-height:1.35; }
#nett.på{ display:block; } #nett h3{ margin:0 0 6px; font-size:12.5px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-dim); font-weight:600; }
#nett .topp{ display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; } #nett .topp b{ font-size:18px; }
#nett section{ margin:0 0 12px; } #nett p{ margin:0 0 6px; color:var(--ink-dim); } #nett label{ display:block; font-size:12px; color:var(--ink-dim); margin:4px 0 2px; }
#nett input{ width:100%; box-sizing:border-box; background:#0f0c08; color:var(--ink); border:1px solid var(--rule); padding:6px 8px; font:inherit; }
#nett .rad{ display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; } #nett button{ background:var(--panel); border:1px solid var(--rule); color:var(--ink); padding:6px 10px; cursor:pointer; font:inherit; font-weight:600; }
#nett button:hover{ color:var(--hover); } #nett .valg button.på{ border-color:var(--hover); color:var(--hover); background:#1d1810; } #nett .kode{ font-family:'JetBrains Mono', monospace; font-size:22px; letter-spacing:.2em; color:var(--hover); }
#nett .lenke{ font-family:'JetBrains Mono', monospace; font-size:11px; word-break:break-all; background:#0f0c08; border:1px solid var(--rule); padding:6px; }
body.nettgjest :is(#kommando,#kommer,#mkom,#mkommer) button[data-k="lagre"]{ display:none; }
#nett ul{ margin:0; padding-left:18px; } #nett .status{ color:var(--hover); min-height:1em; } #nett .advar{ color:#e0a060; }`;
  document.head.appendChild(css);
  const P = document.createElement('div'); P.id = 'nett'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Spill sammen'); document.body.appendChild(P);
  let statusTekst = '';
  function status(t) { statusTekst = t; const el = P.querySelector('.status'); if (el) el.textContent = t; }
  function åpen(på) { P.classList.toggle('på', på); if (på) vis(); }
  function lenke() {
    const adr = N.tunnel || (/^wss:/i.test(N.adresse || '') ? N.adresse : null); if (!adr || !N.kode) return null;   // ws://localhost virker aldri for en venn (funn 3)
    return F.lagLenke(location.origin + location.pathname, adr, N.kode);
  }
  function vis() {
    if (!P.classList.contains('på')) return;
    const l = les(), kar = (() => { try { const t = window.OppstartSpill && OppstartSpill.tilstand(); return t && t.karakter ? t.karakter.navn : ''; } catch (e) { return ''; } })(), navn = esc(N.navn || l.navn || kar || '');
    let h = `<div class="topp"><b>Spill sammen</b><button data-n="lukk" aria-label="Lukk">×</button></div>`;
    if (!N.rolle && N.lenkeInn) {
      h += `<section><h3>Bli med i en delt verden</h3><p>Du er invitert. Skriv navnet ditt og trykk «Bli med». Ditt eget spill røres ikke.</p>
        <label for="nnavn">Navnet ditt</label><input id="nnavn" value="${navn}" maxlength="24"><input id="nlenke" type="hidden" value="${esc(N.lenkeInn)}">
        <div class="rad"><button data-n="gjest">Bli med</button><button data-n="ikkelenke">Avbryt</button></div></section>`;
    } else if (!N.rolle) {
      h += `<section><h3>Vær vert</h3><p>Start tjeneren på PC-en din først: <a href="/tjener/riksbrudd-tjener.zip" download style="color:var(--hover)">last ned tjeneren</a>, pakk ut og dobbeltklikk <b>start-tjener.bat</b> (LESMEG.md forklarer alt). Tjeneren åpner spillet for deg med riktig adresse – trykk så knappen under.</p>
        <label for="nnavn">Navnet ditt</label><input id="nnavn" value="${navn}" maxlength="24">
        <label for="nadr">Tjeneren (tunneladressen fra det svarte vinduet, https://….trycloudflare.com – eller ws://localhost:8787)</label><input id="nadr" value="${esc(l.adresse || 'ws://localhost:8787')}">
        <div class="rad"><button data-n="vert">${l.kode ? 'Åpne verden ' + esc(l.kode) + ' igjen' : 'Åpne en ny verden'}</button>${l.kode ? '<button data-n="nyverden">Ny verden</button>' : ''}</div></section>
        <section><h3>Bli med</h3><p>Lim inn invitasjonslenken du har fått.</p><label for="nlenke">Invitasjonslenke</label><input id="nlenke" value="${esc(N.lenkeInn || '')}" placeholder="https://…#spill=wss://…&kode=…">
        <div class="rad"><button data-n="gjest">Bli med</button></div></section>`;
    } else {
      const roller = N.spillere.map(p => `<li>${esc(p.navn)}${p.rolle === 'vert' ? ' (vert)' : ''}${p.id === N.id ? ' – deg' : ''}</li>`).join('');
      h += `<section><h3>${N.rolle === 'vert' ? 'Du er vert' : 'Du er gjest'}</h3>${N.tilkoblet ? `<div class="kode">${esc(N.kode || '')}</div>` : ''}
        ${N.vertBorte ? '<p class="advar">Verten er borte – verden står stille.</p>' : ''}<ul>${roller}</ul></section>`;
      if (N.rolle === 'vert' && N.tilkoblet) {
        const ln = lenke();
        h += `<section><h3>Invitasjonslenke</h3>${ln ? `<div class="lenke">${esc(ln)}</div><div class="rad"><button data-n="kopier">Kopier lenken</button></div>` : ''}
          ${N.tunnel ? '<p>Lenken går gjennom tunnelen og virker hvor som helst, også på telefon.</p>' : '<p class="advar">Ingen tunnel, så det finnes ingen lenke vennene kan bruke: spillet ligger på en https-side, og da slipper nettleseren ikke en venn inn til PC-en din uten tunnelen. Legg cloudflared.exe ved siden av start-tjener.bat og start tjeneren på nytt (se LESMEG.md).</p>'}
          <p>Gi lag til gjestene: velg et lag og trykk «Styres av». Gjestene kan gi marsjordre, grave ned, bytte formasjon og stridsregler for lagene sine.</p></section>`;
        const tv = tillat();
        h += `<section><h3>Gjester kan i leiren</h3><div class="rad valg" role="group" aria-label="Hva gjestene kan i leiren">${Object.entries(F.TILLAT).map(([id, T]) => `<button data-n="tillat" data-v="${id}" class="${id === tv ? 'på' : ''}" aria-pressed="${id === tv}">${esc(T.navn)}</button>`).join('')}</div>
          <p>${esc(F.TILLAT[tv].tekst)} Kassa er din og felles: det gjestene kjøper, betales herfra. Loggen sier hvem som gjorde hva.</p></section>`;
      }
      if (N.rolle === 'gjest') { const d = N.leirData;
        h += `<section><p>Verten styrer tiden og hvem som har hvilke lag. Lagene dine står med «styres av deg» i panelet – velg et og trykk i kartet for å sende det.</p>
          <h3>Vertens leir</h3><p>${d ? `Leir-menyen, Folk og Tropper viser leiren til ${esc(d.navn || 'verten')}. Verten lar gjestene: <b>${esc(F.TILLAT[d.tillat].navn.toLowerCase())}</b> – ${esc(F.TILLAT[d.tillat].tekst.toLowerCase())} Kassa er felles.` : 'Vertens leir er ikke kommet fram ennå (verten må ha lagt en leir).'}</p></section>`; }
      h += `<section><h3>Melding til alle</h3><div class="rad"><input id="nmld" maxlength="300" placeholder="Skriv og trykk Enter"></div></section>
        <div class="rad"><button data-n="fra">Koble fra</button></div>`;
    }
    h += `<p class="status" aria-live="polite">${esc(statusTekst)}</p>`;
    // ikke tegn på nytt mens noen skriver
    const a = document.activeElement; if (a && P.contains(a) && a.tagName === 'INPUT') { const s = P.querySelector('.status'); if (s) s.textContent = statusTekst; return; }
    P.innerHTML = h;
  }
  P.addEventListener('click', e => {
    const b = e.target.closest('button[data-n]'); if (!b) return; const n = b.dataset.n, v = id => (P.querySelector('#' + id) || {}).value || '';
    if (n === 'lukk') åpen(false);
    else if (n === 'vert') koble('vert', v('nadr'), les().kode, v('nnavn'));
    else if (n === 'nyverden') { skriv({ kode: null }); koble('vert', v('nadr'), null, v('nnavn')); }
    else if (n === 'gjest') { const l = F.lesLenke(v('nlenke')); if (!l) { status('Fant ingen adresse og kode i lenken.'); return; } koble('gjest', l.adresse, l.kode, v('nnavn') || les().navn || 'Gjest'); }
    else if (n === 'kopier') { const ln = lenke(); if (ln && navigator.clipboard) navigator.clipboard.writeText(ln).then(() => status('Lenken er kopiert.'), () => status('Kunne ikke kopiere – merk teksten og kopier selv.')); }
    else if (n === 'fra') koblFra(false);
    else if (n === 'tillat') settTillat(b.dataset.v);
    else if (n === 'ikkelenke') { N.lenkeInn = null; vis(); }
  });
  P.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.id === 'nmld') { const t = e.target.value.trim().slice(0, 300); if (t && send({ t: 'melding', tekst: t })) e.target.value = ''; }
    if (e.key === 'Escape') åpen(false);
  });
  setInterval(() => { if (P.classList.contains('på') && N.rolle) vis(); }, 2000);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && P.classList.contains('på')) åpen(false); });
  if (typeof KROKER !== 'undefined') KROKER.trykk.unshift(() => { if (P.classList.contains('på') && innerWidth < 1200) åpen(false); return false; });

  // knappen i ☰ (meny.js legger den i gruppen «Spill sammen»)
  const meny = document.getElementById('lagmeny');
  if (meny) { const b = document.createElement('button'); b.id = 'vis-nett'; b.textContent = 'Spill sammen'; b.onclick = () => { åpen(!P.classList.contains('på')); }; meny.appendChild(b); }
  // invitasjonslenke i adressen: panelet åpnes med lenken fylt inn (spilleren skriver navnet og trykker «Bli med»)
  function fraAdressen() {
    const v = F.lesVertLenke(location.hash || '');
    if (v) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ }
      skriv({ adresse: v.adresse }); N.vertLenke = true; åpen(true);
      status('Tjeneren på PC-en din er funnet. Trykk «' + (les().kode ? 'Åpne verden ' + les().kode + ' igjen' : 'Åpne en ny verden') + '».'); return; }
    const l = F.lesLenke(location.hash || ''); if (!l) return;
    N.lenkeInn = location.href; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ }
    lukkStart(); åpen(true); status('Skriv navnet ditt og trykk «Bli med».');
  }
  // var denne nettleseren vert da siden ble lukket, åpnes verden igjen av seg selv (ikke i testene)
  function vertIgjen() { const l = les(); if (navigator.webdriver || N.rolle || !l.vertNå || !l.kode || !l.adresse || /#(spill|vert)=/.test(location.hash)) return;
    sikkerLogg(`Åpner verden ${l.kode} igjen …`); koble('vert', l.adresse, l.kode, l.navn || 'Vert'); }
  const start = () => { setTimeout(fraAdressen, 300); setTimeout(vertIgjen, 2500); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  N.åpen = åpen; N.koble = koble; N.koblFra = koblFra; N.send = send; N.bildeNå = bildeNå; N.utførFra = utførFra;
  N.tillat = tillat; N.settTillat = settTillat; N.leirBilde = leirBilde; N.brukLeir = brukLeir;
})();
