/* Flerspiller i nettleseren (M2a, 22. nov – docs/plan-flerspiller.md). Reglene: spill/flerspiller.js. Tjeneren: tjener/riksbrudd-tjener.js.
 * window.NETT: rolle (null | 'vert' | 'gjest'), id, kode, spillere, gjest (true når denne nettleseren er gjest), fangOrdre(s, X, Y, stille).
 * index.html: sim() regner bare klokka når NETT.gjest, ordre() spør NETT.fangOrdre først. lagring.js lagrer ikke verden når NETT.gjest.
 * Ingenting skjer før spilleren trykker «Spill sammen» i ☰ eller åpner en invitasjonslenke (#spill=…&kode=…).
 */
(function () {
  'use strict';
  const F = window.Flerspiller; if (!F) return;
  const NØKKEL = 'riksbrudd-nett', BILDE_MS = 500, BILDE_ALENE_MS = 5000, PING_MS = 15000;
  const les = () => { try { return JSON.parse(localStorage.getItem(NØKKEL) || '{}') || {}; } catch (e) { return {}; } };
  const skriv = o => { try { localStorage.setItem(NØKKEL, JSON.stringify(Object.assign(les(), o))); } catch (e) { /* privat vindu */ } };
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
    ws.onopen = () => { N.forsøk = 0; send({ t: 'hei', rolle: N.rolle, kode: N.kode || undefined, navn: N.navn, id: N.id }); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } motta(m); };
    ws.onclose = () => {
      if (N.ws !== ws) return; const var_ = N.tilkoblet; N.tilkoblet = false; N.ws = null; vis();
      if (!N.ønsket) return;
      if (var_) sikkerLogg('Mistet forbindelsen med tjeneren. Prøver igjen …');
      const vent = Math.min(30, 2 ** Math.min(5, ++N.forsøk)); status(`Ingen forbindelse – prøver igjen om ${vent} s.`);
      clearTimeout(N.igjen); N.igjen = setTimeout(() => { if (N.ønsket && !N.ws) åpne(); }, vent * 1000);
    };
    ws.onerror = () => { /* onclose kommer etterpå */ };
  }
  function koblFra(stille) {
    N.ønsket = false; clearTimeout(N.igjen); const ws = N.ws; N.ws = null;
    if (ws) try { ws.close(); } catch (e) { /* ok */ }
    const varGjest = N.rolle === 'gjest';
    N.rolle = null; N.tilkoblet = false; N.spillere = []; N.vertBorte = false;
    if (typeof ENHETER !== 'undefined') for (const s of ENHETER) if (s.eier) s.eier = null;
    if (!stille) { sikkerLogg('Koblet fra flerspilleren.'); if (varGjest) sikkerLogg('Last siden på nytt for å fortsette ditt eget spill.'); }
    vis();
  }
  function motta(m) {
    switch (m.t) {
      case 'velkommen': {
        N.tilkoblet = true; statusTekst = ''; N.id = m.id || N.id; N.kode = m.kode; N.spillere = m.spillere || []; skriv({ id: N.id });
        if (N.rolle === 'vert') { skriv({ kode: N.kode, adresse: N.adresse }); hentTunnel(); sikkerLogg(`Verden ${N.kode} er åpen. Del invitasjonslenken under «Spill sammen».`);
          const fram = m.lagret ? F.framTid(m.lagret.borteSek) : 0; if (fram > 0) regnFram(fram); }
        else { sikkerLogg(`Du er med i verden ${N.kode}. Verten styrer tiden; du styrer lagene verten gir deg.`); lukkStart(); }
        break;
      }
      case 'spillere': {
        const før = new Set(N.spillere.map(p => p.id)), nå = m.spillere || [];
        for (const p of nå) if (!før.has(p.id) && p.id !== N.id) sikkerLogg(`${p.navn} er med i verden.`);
        for (const id of før) if (!nå.some(p => p.id === id) && id !== N.id) { sikkerLogg(`${navnPå(id)} gikk ut.`);
          // lagene til en som går, går tilbake til verten
          if (N.rolle === 'vert' && typeof ENHETER !== 'undefined') for (const s of ENHETER) if (s.eier === id) s.eier = null; }
        N.spillere = nå; break;
      }
      case 'tilstand': if (N.rolle === 'gjest') brukBilde(m.data); break;
      case 'kommando': if (N.rolle === 'vert') kommando(m); break;
      case 'svar': if (m.feil) sikkerLogg(m.feil); else if (m.tekst) sikkerLogg(m.tekst); break;
      case 'melding': sikkerLogg(`${m.navn || 'Spiller'}: «${m.tekst}»`); break;
      case 'vertBorte': N.vertBorte = true; sikkerLogg('Verten er borte. Verden står stille til verten kommer tilbake.'); break;
      case 'vertTilbake': N.vertBorte = false; sikkerLogg('Verten er tilbake.'); break;
      case 'feil': status(m.tekst || 'Feil fra tjeneren.'); sikkerLogg(m.tekst || 'Feil fra tjeneren.'); if (!N.tilkoblet) { N.ønsket = false; } break;
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
  let nid = 0;
  const merk = () => { if (typeof ENHETER === 'undefined') return; for (const s of ENHETER) if (s.nid == null) s.nid = 'l' + (++nid); };
  function bildeNå() {
    merk(); const L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, fr = window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER.blå;
    return F.bilde({ lag: ENHETER, kj: window.KJORETOY || [], tid, tempo, ser: e => { try { return synlig(e); } catch (x) { return false; } },
      vær: window.VaerSpill ? VaerSpill.S : null, leir: L && L.midt ? { x: L.midt.x, y: L.midt.y, navn: fr ? fr.navn : 'Vertens leir' } : null, selskap: fr ? fr.navn : null });
  }
  function sendBilde() {
    if (N.rolle !== 'vert' || !N.tilkoblet) return; const nå = performance.now();
    if (nå - N.sistBilde < (gjester().length ? BILDE_MS : BILDE_ALENE_MS)) return;
    N.sistBilde = nå; try { send({ t: 'tilstand', data: bildeNå(), tid }); N.tellBilder++; } catch (e) { console.warn('flerspiller: bildet', e); }
  }
  function kommando(m) {
    merk(); const r = F.sjekkKommando(m.k, m.fra, ENHETER);
    if (!r.ok) { send({ t: 'svar', til: m.fra, feil: r.feil }); return; }
    ordre(r.lag, r.x, r.y); sikkerLogg(`${m.navn || navnPå(m.fra)} sender ${r.lag.navn} av gårde.`);
    send({ t: 'svar', til: m.fra, tekst: `${r.lag.navn}: ordren er mottatt.` });
  }
  // Tiden som har gått mens verden sto, regnes fram med 600× (som ⏭), så går farten tilbake til 1×
  function regnFram(min) {
    N.framTil = tid + min; const t = min >= 60 ? Math.round(min / 6) / 10 + ' t' : Math.round(min) + ' min';
    sikkerLogg(`Verden har stått i ${t}. Regner tiden fram …`);
    const b = document.getElementById('sp4'); if (b) b.click();
  }
  setInterval(() => {
    sendBilde();
    if (N.framTil != null && typeof tid !== 'undefined' && tid >= N.framTil) { N.framTil = null; const b = document.getElementById('sp1'); if (b) b.click(); sikkerLogg('Tiden er regnet fram.'); }
  }, 100);
  setInterval(() => { if (N.tilkoblet) send({ t: 'ping' }); }, PING_MS);

  // ---------- gjesten ----------
  function brukBilde(d) {
    if (typeof ENHETER === 'undefined') return;
    const r = F.brukBilde(d, ENHETER, q => nyttLag(q.navn, q.x, q.y, q.side, !!q.speider)); if (!r.ok) return;
    if (Array.isArray(d.kj) && window.KJORETOY && window.Kjoretoy) {
      const før = new Map(KJORETOY.map(k => [k.navn, k])), ny = [];
      for (const q of d.kj) { let k = før.get(q.navn); if (!k) { try { k = Kjoretoy.ny({ navn: q.navn, type: q.type, antall: q.antall, x: q.x, y: q.y, retning: q.r }); } catch (e) { continue; } }
        k.x = q.x; k.y = q.y; k.retning = q.r; k.antall = q.antall; k.side = q.side; ny.push(k); }
      KJORETOY.length = 0; for (const k of ny) KJORETOY.push(k);
    }
    tid = d.tid; if (tempo !== d.tempo) { tempo = d.tempo; settFartKnapp(d.tempo); }
    const nå = performance.now();
    if (d.vær && window.VaerSpill && nå - (N.sistVær || 0) > 10000) { N.sistVær = nå; try { Object.assign(VaerSpill.S, d.vær); } catch (e) { /* ok */ } }
    N.vertLeir = d.leir || null; N.selskap = d.selskap || null; N.sistBilde = nå; N.tellBilder++;
    if (typeof valgt !== 'undefined' && valgt && !ENHETER.includes(valgt)) { valgt = null; try { visPanel(); } catch (e) { /* ok */ } }
    skitten = true;
  }
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
        s.eier = F.nesteEier(s.eier || null, gjester()); sikkerLogg(`${s.navn} styres nå av ${s.eier ? navnPå(s.eier) : 'deg'}.`); N.sistBilde = 0; visPanel(); }));
    });
    // gjesten ser vertens leir som et merke i kartet
    KROKER.tegn.push((g, vx0, vy1) => {
      if (!N.gjest || !N.vertLeir) return; const m = kam.m, x = (N.vertLeir.x - vx0) / m, y = (vy1 - N.vertLeir.y) / m;
      g.save(); g.strokeStyle = '#f0d79a'; g.fillStyle = 'rgba(22,18,12,.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 10, y + 7); g.lineTo(x - 10, y + 7); g.closePath(); g.fill(); g.stroke();
      g.font = '600 13px "Cormorant Garamond", serif'; g.fillStyle = '#f0d79a'; g.textAlign = 'center'; g.fillText(N.vertLeir.navn, x, y + 22); g.restore();
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
#nett button:hover{ color:var(--hover); } #nett .kode{ font-family:'JetBrains Mono', monospace; font-size:22px; letter-spacing:.2em; color:var(--hover); }
#nett .lenke{ font-family:'JetBrains Mono', monospace; font-size:11px; word-break:break-all; background:#0f0c08; border:1px solid var(--rule); padding:6px; }
#nett ul{ margin:0; padding-left:18px; } #nett .status{ color:var(--hover); min-height:1em; } #nett .advar{ color:#e0a060; }`;
  document.head.appendChild(css);
  const P = document.createElement('div'); P.id = 'nett'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', 'Spill sammen'); document.body.appendChild(P);
  let statusTekst = '';
  function status(t) { statusTekst = t; const el = P.querySelector('.status'); if (el) el.textContent = t; }
  function åpen(på) { P.classList.toggle('på', på); if (på) vis(); }
  function lenke() {
    const adr = N.tunnel || N.adresse; if (!adr || !N.kode) return null;
    return F.lagLenke(location.origin + location.pathname, adr, N.kode);
  }
  function vis() {
    if (!P.classList.contains('på')) return;
    const l = les(), navn = esc(N.navn || l.navn || '');
    let h = `<div class="topp"><b>Spill sammen</b><button data-n="lukk" aria-label="Lukk">×</button></div>`;
    if (!N.rolle) {
      h += `<section><h3>Vær vert</h3><p>Start tjeneren på PC-en din først (dobbeltklikk <b>tjener/start-tjener.bat</b>). Så åpner du verden her.</p>
        <label for="nnavn">Navnet ditt</label><input id="nnavn" value="${navn}" maxlength="24">
        <label for="nadr">Tjeneren</label><input id="nadr" value="${esc(l.adresse || 'ws://localhost:8787')}">
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
          ${N.tunnel ? '<p>Lenken går gjennom tunnelen og virker hvor som helst, også på telefon.</p>' : '<p class="advar">Ingen tunnel: lenken virker bare for maskiner på samme nett, og bare hvis spillet er lastet over http. Legg cloudflared ved siden av tjeneren for en lenke som virker overalt.</p>'}
          <p>Gi lag til gjestene: velg et lag og trykk «Styres av». Gjestene kan foreløpig gi marsjordre; resten styrer du.</p></section>`;
      }
      if (N.rolle === 'gjest') h += `<section><p>Verten styrer tiden og hvem som har hvilke lag. Lagene dine står med «styres av deg» i panelet – velg et og trykk i kartet for å sende det.</p></section>`;
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
  });
  P.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && e.target.id === 'nmld') { const t = e.target.value.trim().slice(0, 300); if (t && send({ t: 'melding', tekst: t })) e.target.value = ''; }
    if (e.key === 'Escape') åpen(false);
  });
  setInterval(() => { if (P.classList.contains('på') && N.rolle) vis(); }, 2000);

  // knappen i ☰ (meny.js legger den i gruppen «Spill sammen»)
  const meny = document.getElementById('lagmeny');
  if (meny) { const b = document.createElement('button'); b.id = 'vis-nett'; b.textContent = 'Spill sammen'; b.onclick = () => { åpen(!P.classList.contains('på')); }; meny.appendChild(b); }
  // invitasjonslenke i adressen: panelet åpnes med lenken fylt inn (spilleren skriver navnet og trykker «Bli med»)
  function fraAdressen() {
    const l = F.lesLenke(location.hash || ''); if (!l) return;
    N.lenkeInn = location.href; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ok */ }
    lukkStart(); åpen(true); status('Skriv navnet ditt og trykk «Bli med».');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(fraAdressen, 300)); else setTimeout(fraAdressen, 300);
  N.åpen = åpen; N.koble = koble; N.koblFra = koblFra; N.send = send; N.bildeNå = bildeNå;
})();
