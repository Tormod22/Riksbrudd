'use strict';
// S2 i kartet: kjøretøy (spill/kjoretoy.js) på vegnettet (spill/vegnett.js), koblet på med KROKER (docs/plan-funksjoner.md).
// Vegnettet (25 MB pakket) lastes først når et kjøretøy får en ordre, så kartet ikke blir tregere for alle.
(function () {
  const VEGNETT_TAG = 'kart-vegnett-5b8cd00e2e8e';   // release fra .github/workflows/vegnett.yml
  const BIT = 4 * 1024 * 1024;                        // mellomstasjonen (/api/kart) gir maks 4 MB per svar
  let graf = null, lasting = null, valgtKj = null, kjørModus = false, sistPanel = 0;
  // Startoppstilling ved Dombås (E6/rv. 15). Står de litt utenfor vegen, finner rutesøket nærmeste veg (innen 3 km).
  const KJ = [Kjoretoy.ny({ navn: '1. lastebilkolonne', type: 'lastebil', antall: 4, x: 193212, y: 6896374, retning: -1.2 }),
    Kjoretoy.ny({ navn: 'Speiderbil 1', type: 'speiderbil', antall: 1, x: 193520, y: 6896780, retning: -1.2 })];
  window.KJORETOY = KJ;
  // fiendens kjøretøy (spill/fraksjoner-visning.js) vises bare der du ser dem, som lagene deres
  const ses = k => k.side === 'blå' || (typeof synlig === 'function' && synlig(k));
  window.kjoretoySes = ses;
  // Andre moduler (S3 økonomi) kan legge knapper og linjer i panelet og ta over kjøringen for kolonner med oppdrag.
  window.KJ_PANEL = []; window.KJ_TEKST = [];   // (k, knapperad) => void  og  k => tekst eller null

  // ---------- vegnettet: hentes i biter gjennom mellomstasjonen, pakkes ut i nettleseren der den kan ----------
  function lastVegnett() {
    if (graf) return Promise.resolve(graf);
    if (lasting) return lasting;
    lasting = (async () => {
      const m = await (await fetch(`/api/kart/${VEGNETT_TAG}/manifest.json/0/1048576`)).json();
      const gz = typeof DecompressionStream !== 'undefined', fil = gz ? 'vegnett.bin.gz' : 'vegnett.bin', byte = gz ? m.gzip_byte : m.byte;
      const O = VEG_TLF.område();
      logg(O ? `Laster vegnettet (${Math.round(byte / 1048576)} MB) – bare vegene i ${O.navn || 'spillområdet'} beholdes …` : VEG_TLF.boks() ? `Laster vegnettet (${Math.round(byte / 1048576)} MB) – på telefon beholdes bare vegene rundt leiren …` : `Laster vegnettet for hele Norge (${Math.round(byte / 1048576)} MB) …`);
      const deler = [], kø = []; for (let fra = 0; fra < byte; fra += BIT) kø.push(fra);
      let ferdig = 0;
      await Promise.all(Array.from({ length: 4 }, async () => { for (let fra; (fra = kø.shift()) !== undefined;) {
        const r = await fetch(`/api/kart/${VEGNETT_TAG}/${fil}/${fra}/${Math.min(BIT, byte - fra)}`);
        if (!r.ok) throw new Error('Vegnettet: HTTP ' + r.status);
        deler[fra / BIT] = new Uint8Array(await r.arrayBuffer()); ferdig++; STAT.byte += deler[fra / BIT].byteLength; STAT.req++; tegnHud(); } }));
      // (19. nov) bitene pakkes ut rett fra en Blob – før ble de først kopiert sammen til én tabell (25 MB ekstra på toppen, viktig på telefon)
      let data;
      if (gz) { const blob = new Blob(deler); deler.length = 0; data = new Uint8Array(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
      else { data = new Uint8Array(byte); let p = 0; for (const d of deler) { data.set(d, p); p += d.byteLength; } deler.length = 0; }
      // på telefon bare vegene rundt leiren (VEG_TLF.boks): ca. 20 MB i minnet i stedet for ca. 210 MB for hele landet
      const boks = VEG_TLF.boks(); graf = Vegnett.les(data, boks ? { boks } : {}); data = null; window.VEGNETT = graf;
      logg(O ? `Vegnettet er lastet for ${O.navn || 'spillområdet'}: ${graf.antallLenker.toLocaleString('nb-NO')} vegstrekninger (NVDB, 1. juni 2023).` : boks ? `Vegnettet er lastet for området rundt leiren (${Math.round((boks[2] - boks[0]) / 1000)} × ${Math.round((boks[3] - boks[1]) / 1000)} km): ${graf.antallLenker.toLocaleString('nb-NO')} vegstrekninger (NVDB, 1. juni 2023).`
        : `Vegnettet er lastet: ${graf.antallLenker.toLocaleString('nb-NO')} vegstrekninger (NVDB, 1. juni 2023).`);
      return graf;
    })();
    lasting.catch(e => { lasting = null; logg('Fikk ikke lastet vegnettet: ' + e.message); });
    return lasting;
  }
  window.lastVegnett = lastVegnett;

  // ---------- vegnettet på telefon (19. nov) ----------
  // Fiendens lastebiler (spill/fraksjoner-visning.js) kjører bare når vegnettet er lastet, og der hentes det bare på PC (vinduet minst 900 px
  // bredt). Telefonen fikk det derfor aldri, og fienden gikk til fots. MÅLT (docs/natt/krig.md, runde 5): 25 MB nedlasting og ca. 210 MB i
  // minnet for hele landet (41 MB utpakket fil + tabellene). På telefon leses derfor bare et utsnitt rundt leiren (ca. 20 MB), og det
  // hentes først når et fiendelag har et mål over 3 km unna og lastebilen sin like ved – altså første gang fienden vil kjøre.
  // Ikke med datasparing, ikke på telefoner som sier de har under 3 GB minne (navigator.deviceMemory), og ikke i testene (VEG_TLF.test).
  // Sjekkes hvert 5. sekund (hver, ms); feiler hentingen, prøves det igjen om ti minutter (ventFeil).
  // Tallene er Claudes forslag.
  const VEG_TLF = { test: false, hver: 5000, grunn: null, bedt: false, sist: -1e9, ventFeil: 600000 };
  window.VEG_TLF = VEG_TLF;
  // Telefon: bare et utsnitt på 2 × UTSNITT_HALV rundt leiren (Vegnett.les med boks), utvidet så basene og den nærmeste oljeterminalen
  // er med (+ UTSNITT_KANT), så «Hent olje» virker. PC og testene (navigator.webdriver uten VEG_TLF.test): hele landet som før.
  // MÅLT (andel av hele landets 2,03 mill. lenker): ±150 km rundt Dovre 20 %, rundt Ryfylke 24 %, rundt Oslo 44 % (hele landet ca. 210 MB).
  // Tallene er Claudes forslag.
  const UTSNITT_HALV = 150000, UTSNITT_KANT = 20000;
  VEG_TLF.telefon = () => VEG_TLF.tvingTelefon || innerWidth < 900 || matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
  // (runde 13, kritikk H: «/rogaland laster vegnettet for hele Norge (24 MB) ved hver åpning») på et mindre spillkart (window.SPILLOMRÅDE,
  // spill/omraade.js) beholdes bare vegene i området (+ UTSNITT_KANT) – også på PC: spillet holder seg innenfor grensa. Fila er fortsatt
  // én for hele landet (24 MB nedlasting); bare minnet og meldingen blir mindre. Et vegnett per fylke krever en ny release (se docs/natt/kart.md).
  VEG_TLF.område = () => { const O = window.SPILLOMRÅDE; return O && O.bb && !(navigator.webdriver && !VEG_TLF.test) ? O : null; };
  VEG_TLF.boks = () => { const Ø = VEG_TLF.område(); if (!Ø && (!VEG_TLF.telefon() || (navigator.webdriver && !VEG_TLF.test))) return null; const S = window.OppstartSpill && OppstartSpill.tilstand(), L = S && S.leir;
    const [x, y] = L && Number.isFinite(L.x) ? [L.x, L.y] : [kam.x, kam.y], b = Ø ? [Ø.bb[0] - UTSNITT_KANT, Ø.bb[1] - UTSNITT_KANT, Ø.bb[2] + UTSNITT_KANT, Ø.bb[3] + UTSNITT_KANT]
      : [x - UTSNITT_HALV, y - UTSNITT_HALV, x + UTSNITT_HALV, y + UTSNITT_HALV];
    // på et mindre spillkart holder spillet seg innenfor grensa: basene og terminalene utenfor utvider ikke boksen
    if (Ø) return b;
    const O = window.OLJE || {}, ta = p => { if (!p || !Number.isFinite(p.x)) return; b[0] = Math.min(b[0], p.x - UTSNITT_KANT); b[1] = Math.min(b[1], p.y - UTSNITT_KANT); b[2] = Math.max(b[2], p.x + UTSNITT_KANT); b[3] = Math.max(b[3], p.y + UTSNITT_KANT); };
    for (const p of O.BASER || []) ta(p);
    ta((O.TERMINALER || []).slice().sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y))[0]);
    return b; };
  VEG_TLF.kan = () => {
    if (graf || lasting) return false;
    if (navigator.webdriver && !VEG_TLF.test) return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory < 3) return false;
    return VEG_TLF.telefon();   // på PC henter AI-en det selv
  };
  // Vil et fiendelag kjøre nå? (samme regel som AI-en: Fraksjoner.kjør – mål over bil.langt unna, lastebilen innen bil.nær)
  VEG_TLF.trenger = () => {
    if (!window.AI || !AI.på || !AI.biler || !window.Fraksjoner) return null; const B = Fraksjoner.REGLER.bil;
    for (const s of ENHETER) { if (!s.ai || !levende(s) || s.ombord || !s.ai.mål) continue; const k = AI.biler[s.side];
      if (!k || !KJ.includes(k) || k.sti || ENHETER.some(e => e.ombord === k)) continue;
      if (Math.hypot(s.ai.mål[0] - s.x, s.ai.mål[1] - s.y) > B.langt && Math.hypot(k.x - s.x, k.y - s.y) <= B.nær) return s; }
    return null;
  };
  // Når vegnettet er lastet: lag som går til fots mot et mål langt unna og har lastebilen ved seg, tenker på nytt (og kjører).
  VEG_TLF.etter = () => {
    if (!window.AI || !AI.biler || !window.Fraksjoner) return 0; const B = Fraksjoner.REGLER.bil; let n = 0;
    for (const s of ENHETER) { if (!s.ai || !levende(s) || s.ombord || !s.ai.mål || !s.sti) continue; const k = AI.biler[s.side];
      if (!k || k.sti || Math.hypot(s.ai.mål[0] - s.x, s.ai.mål[1] - s.y) <= B.langt || Math.hypot(k.x - s.x, k.y - s.y) > B.nær) continue;
      s.sti = null; s.siktSkitten = true; s.ai.mål = null; s.ai.neste = 0; n++; }
    return n;
  };
  VEG_TLF.sjekk = () => {
    const nå = performance.now(); if (nå - VEG_TLF.sist < VEG_TLF.hver || !VEG_TLF.kan()) return false; VEG_TLF.sist = nå;
    const s = VEG_TLF.trenger(); if (!s) return false;
    VEG_TLF.grunn = s.navn; VEG_TLF.bedt = true;
    lastVegnett().then(() => { VEG_TLF.etter(); skitten = true; }, () => { VEG_TLF.sist = performance.now() + VEG_TLF.ventFeil; });
    return true;
  };

  async function kjørTil(kj, X, Y) {
    // et mindre spillkart (/rogaland, spill/omraade.js): ingen kjøring ut av området
    if (window.OMRÅDE_OK && !OMRÅDE_OK(X, Y)) { logg(kj.navn + ': det ligger utenfor spillkartet.'); return; }
    try {
      const g = await lastVegnett();
      if (g.boks && !(X >= g.boks[0] && X <= g.boks[2] && Y >= g.boks[1] && Y <= g.boks[3])) { logg(`${kj.navn}: på telefon er bare vegene i området rundt leiren lastet (ca. ${Math.round(UTSNITT_HALV / 1000)} km hver veg) – velg et mål nærmere.`); return; }
      const r = Kjoretoy.planlegg(kj, g, [X, Y]);
      if (r.feil) { logg(kj.navn + ': ' + r.feil); return; }
      logg(`${kj.navn}: ${nf.format(r.meter / 1000)} km, ca. ${tidTekst(r.sekunder)}${r.ferjer ? ', ' + r.ferjer + ' ferje' + (r.ferjer > 1 ? 'r' : '') : ''}.`);
    } catch (e) { /* meldt i loggen */ } finally { if (valgtKj === kj) visKj(kj); skitten = true; }
  }
  window.kjørTil = kjørTil; window.visKjoretoy = k => visKj(k);
  const tidTekst = s => s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min' : nf.format(s / 3600) + ' t';

  // ---------- simulering: tid i spillminutter (1 tid-enhet = 60 spillsekunder); 1× er sanntid ----------
  KROKER.sim.push(dt => {
    VEG_TLF.sjekk();
    for (const k of KJ) if (k.sti && !k.oppdrag) { if (Kjoretoy.steg(k, dt * 3600 / TIME)) { if (k.side === 'blå') logg(k.navn + ' er framme.'); if (valgtKj === k) visKj(k); } skitten = true; }
    if (valgtKj && performance.now() - sistPanel > 1000 && !pekerNede(document.getElementById('panel'))) { sistPanel = performance.now(); visKj(valgtKj); }   // panelet hvert sekund
  });

  // ---------- trykk: velg kolonne, eller velg mål når «Kjør til …» er på ----------
  KROKER.trykk.push((X, Y) => {
    if (modus === 'marsj' && valgt) return false;   // lagets marsjordre går foran
    if (valgtKj && kjørModus) { kjørModus = false; if (valgtKj.side === 'blå') kjørTil(valgtKj, X, Y); visKj(valgtKj); return true; }
    let best = null, bd = 22;
    for (const k of KJ) if (ses(k)) for (let i = 0; i < k.antall; i++) {
      const p = Kjoretoy.posisjon(k, i * Kjoretoy.TYPER[k.type].avstand), d = Math.hypot(p.x - X, p.y - Y) / kam.m;
      if (d < bd) { bd = d; best = k; }
    }
    if (best) { velg(best); return true; }
    if (valgtKj) { valgtKj = null; kjørModus = false; skitten = true; }
    return false;
  });
  function velg(k) { valgt = null; modus = null; valgtKj = k; kjørModus = false; visKj(k); skitten = true; }
  window.velgKjoretoy = velg;
  window.valgtKjoretoy = () => valgtKj;
  window.slippKjoretoy = () => { valgtKj = null; kjørModus = false; skitten = true; };

  function visKj(k) {
    const P = document.getElementById('panel'), T = Kjoretoy.TYPER[k.type], s = Kjoretoy.status(k);
    document.getElementById('pnavn').textContent = k.navn;
    document.getElementById('psub').textContent = [k.antall + ' ' + (k.antall > 1 ? T.flertall : T.navn.toLowerCase()), 'toppfart ' + T.maks + ' km/t',
      s.tilstand === 'kjører' ? `kjører, ${nf.format(s.meter / 1000)} km og ca. ${tidTekst(s.sekunder)} igjen` :
      s.tilstand === 'venter på ferja' ? `venter på ferja (${tidTekst(s.ventIgjen)}), ${nf.format(s.meter / 1000)} km igjen` : s.tilstand,
      ...window.KJ_TEKST.map(f => f(k)).filter(Boolean)].join(' · ');
    const H = document.getElementById('handl'); H.innerHTML = '';
    if (k.side !== 'blå') { H.appendChild(knapp('Lukk', false, () => { valgtKj = null; kjørModus = false; if (window.lukkPanel) lukkPanel(); skitten = true; })); P.classList.add('på'); return; }
    H.appendChild(knapp(kjørModus ? 'Velg mål på kartet …' : 'Kjør til …', kjørModus, () => { kjørModus = !kjørModus; if (kjørModus) lastVegnett(); visKj(k); }));
    if (k.sti && !k.oppdrag) H.appendChild(knapp('Stopp', false, () => { Kjoretoy.stopp(k); logg(k.navn + ' stopper.'); visKj(k); skitten = true; }));
    for (const f of window.KJ_PANEL) f(k, H);
    document.getElementById('menn').innerHTML = '';
    // (to slags drivstoff, brukeren 12. nov: kjøretøyene går på olje fra basen, leirens diesel er noe annet – si det der drivstoffet står)
    const drivstoff = ' Drivstoffet er olje (tonn) fra basen: det fylles når kolonnen står ved basen, eller kjøres ut med «Forsyn …» fra en lastebil. Leirens diesel (liter, i Leir-menyen) kan ikke brukes på kjøretøy.';
    document.getElementById('hint').textContent = kjørModus ? 'Trykk der kolonnen skal kjøre. Den følger vegene (NVDB), også ferjer. Lastebilene holder seg helst på hovedvegen.'
      : (graf ? 'Kolonnen kjører med vegens fartsgrense, høyst ' + T.maks + ' km/t. Ferje: 25 km/t og 15 min venting.' : 'Vegnettet lastes ned (25 MB) første gang et kjøretøy får en ordre.') + drivstoff;
    P.classList.add('på');
  }

  // ---------- tegning i 2D: kjøretøy i målestokk når man er nær, ellers små kjøretøy og et symbol for kolonnen ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (valgtKj && !document.getElementById('panel').classList.contains('på')) { valgtKj = null; kjørModus = false; }   // panelet lukket
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m];
    for (const k of KJ) { if (!ses(k)) continue;
      const T = Kjoretoy.TYPER[k.type], [lx, ly] = S(k.x, k.y);
      if (k.sti && (k === valgtKj || m < 40)) tegnSti(g, k, S);
      if (lx < -300 || ly < -300 || lx > VW + 300 || ly > VH + 300) continue;
      if (m > 12) { symbol(g, k, lx, ly, k === valgtKj); continue; }
      for (let i = k.antall - 1; i >= 0; i--) { const p = Kjoretoy.posisjon(k, i * T.avstand), [x, y] = S(p.x, p.y); bil(g, k, x, y, -p.retning, Math.max(T.lengde / m, 9), Math.max(T.bredde / m, 4.2), k === valgtKj); }
      navn(g, k, lx, ly - Math.max(14, 9 / m));
    }
  });
  function tegnSti(g, k, S) {
    const t = k.sti; g.save(); g.strokeStyle = 'rgba(130,170,220,.9)'; g.lineWidth = 2; g.setLineDash([7, 5]); g.beginPath();
    const [x0, y0] = S(k.x, k.y); g.moveTo(x0, y0);
    const steg = Math.max(1, Math.floor((t.V.length - t.i) / 4000));   // lange ruter: tegn ikke hvert punkt når man er langt ute
    for (let i = t.i + 1; i <= t.V.length; i += steg) { const [x, y] = S(t.P[2 * i], t.P[2 * i + 1]); g.lineTo(x, y); }
    const n = t.V.length, [ex, ey] = S(t.P[2 * n], t.P[2 * n + 1]); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.beginPath(); g.arc(ex, ey, 6, 0, 6.283); g.stroke(); g.restore();
  }
  // Ett kjøretøy sett ovenfra: lastebil med førerhus og lasteplan, speiderbil kortere med tårn. Lys fra nordvest.
  function bil(g, k, x, y, v, L, B, valgtNå) {
    g.save(); g.translate(x, y); g.rotate(v);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-L / 2 + 1.5, -B / 2 + 1.5, L, B);
    if (k.type === 'lastebil') {
      g.fillStyle = '#4c5634'; g.fillRect(-L / 2, -B / 2, L * .72, B);                     // lasteplan med presenning
      g.fillStyle = '#5d6a40'; g.fillRect(L / 2 - L * .24, -B / 2, L * .24, B);           // førerhus foran
      g.strokeStyle = 'rgba(20,24,12,.8)'; g.lineWidth = 1; g.strokeRect(-L / 2, -B / 2, L, B);
      if (L > 14) { g.strokeStyle = 'rgba(200,210,160,.25)'; g.beginPath(); for (let i = 1; i < 4; i++) { const xx = -L / 2 + L * .72 * i / 4; g.moveTo(xx, -B / 2); g.lineTo(xx, B / 2); } g.stroke(); }
    } else if (k.type === 'stridsvogn') {   // belter, skrog, tårn og kanon framover (S6)
      g.fillStyle = '#2f3424'; g.fillRect(-L / 2, -B / 2, L, B * .22); g.fillRect(-L / 2, B / 2 - B * .22, L, B * .22);
      g.fillStyle = '#4f5a35'; g.fillRect(-L / 2 + L * .04, -B / 2 + B * .18, L * .92, B * .64); g.strokeStyle = 'rgba(20,24,12,.8)'; g.lineWidth = 1; g.strokeRect(-L / 2, -B / 2, L, B);
      g.fillStyle = '#3f4829'; g.beginPath(); g.ellipse(-L * .05, 0, L * .2, B * .3, 0, 0, 6.283); g.fill(); g.stroke();
      g.strokeStyle = '#2b311d'; g.lineWidth = Math.max(1.5, B * .12); g.beginPath(); g.moveTo(L * .12, 0); g.lineTo(L * .75, 0); g.stroke();
    } else if (k.type === 'rakettartilleri' || k.type === 'radar') {   // førerhus foran; rakettkasse med rør, eller radarantenne (S6)
      g.fillStyle = '#5d6a40'; g.fillRect(L / 2 - L * .22, -B / 2, L * .22, B);
      g.fillStyle = '#4c5634'; g.fillRect(-L / 2, -B / 2, L * .74, B); g.strokeStyle = 'rgba(20,24,12,.8)'; g.lineWidth = 1; g.strokeRect(-L / 2, -B / 2, L, B);
      if (k.type === 'rakettartilleri') { g.fillStyle = '#3a4228'; g.fillRect(-L / 2 + L * .06, -B * .38, L * .6, B * .76);
        if (L > 14) { g.fillStyle = 'rgba(15,15,10,.8)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(-L / 2 + L * (.14 + i * .18), -B * .2 + j * B * .4, B * .09, 0, 6.283); g.fill(); } } }
      else { g.strokeStyle = '#c9d3dc'; g.lineWidth = Math.max(1.2, B * .1); const a = (performance.now() / 600) % 6.283, rr = B * .45;
        g.beginPath(); g.moveTo(-L * .15 - Math.cos(a) * rr, -Math.sin(a) * rr); g.lineTo(-L * .15 + Math.cos(a) * rr, Math.sin(a) * rr); g.stroke(); }
    } else {
      g.fillStyle = '#56603a'; g.beginPath(); g.moveTo(-L / 2, -B / 2); g.lineTo(L / 2 - B * .4, -B / 2); g.lineTo(L / 2, 0); g.lineTo(L / 2 - B * .4, B / 2); g.lineTo(-L / 2, B / 2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(20,24,12,.8)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#3f4829'; g.beginPath(); g.arc(-L * .05, 0, B * .32, 0, 6.283); g.fill();
    }
    if (valgtNå) { g.strokeStyle = '#f0d79a'; g.lineWidth = 1.5; g.strokeRect(-L / 2 - 2, -B / 2 - 2, L + 4, B + 4); }
    g.restore();
  }
  // Kartsymbol for kolonnen (som lagsymbolet): rektangel med hjul under (hjulgående), lastebil med tverrstrek.
  function symbol(g, k, x, y, valgtNå) {
    const r = 11, blå = k.side === 'blå';
    // formen fra det felles merkesettet (spill/merker.js, 18. nov): eget = rektangel, fiende = rute på spissen; tegnet inni er typen
    // runde 4: hele merket (form, tegnet for typen og antallet) kommer fra merkesettet
    if (window.Merker) { Merker.tegn(g, x, y, { forhold: Merker.forhold(k.side || 'blå'), slag: 'kjøretøy', type: k.type, antall: k.antall, farge: blå ? '#3b5878' : typeof sidefarge === 'function' ? sidefarge(k.side, 'farge') : '#8f3c2f', valgt: valgtNå, r }); navn(g, k, x, y - 16); return; }
    { g.fillStyle = blå ? '#3b5878' : '#8f3c2f'; g.strokeStyle = valgtNå ? '#f0d79a' : '#e7dcc3'; g.lineWidth = valgtNå ? 2.5 : 1.3;
      g.beginPath(); g.rect(x - r, y - r * .7, r * 2, r * 1.4); g.fill(); g.stroke(); }
    g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.2; g.beginPath();
    if (k.type === 'lastebil') { g.moveTo(x - r * .6, y - r * .1); g.lineTo(x + r * .6, y - r * .1); }
    else if (k.type === 'stridsvogn') { g.ellipse(x, y, r * .7, r * .38, 0, 0, 6.283); }   // belter (S6)
    else if (k.type === 'rakettartilleri') { g.moveTo(x - r * .6, y + r * .35); g.lineTo(x, y - r * .45); g.lineTo(x + r * .6, y + r * .35); }
    else if (k.type === 'radar') { g.moveTo(x - r * .7, y + r * .1); g.lineTo(x - r * .3, y - r * .4); g.lineTo(x, y + r * .1); g.lineTo(x + r * .3, y - r * .4); g.lineTo(x + r * .7, y + r * .1); }
    else { g.moveTo(x - r, y + r * .7); g.lineTo(x + r, y - r * .7); }
    g.stroke(); if (k.type !== 'stridsvogn') for (const dx of [-.45, .45]) { g.beginPath(); g.arc(x + dx * r, y + r * .35, 2.1, 0, 6.283); g.stroke(); }
    if (k.antall > 1) { g.font = '600 11px "Cormorant Garamond",serif'; g.fillStyle = '#e7dcc3'; g.textAlign = 'center'; g.fillText(String(k.antall), x + r + 7, y - r * .4); }
    navn(g, k, x, y - 16);
  }
  function navn(g, k, x, y) {
    if (typeof navnSynlig === 'function' && !navnSynlig(k)) return;
    g.font = '600 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
    if (window.Etikett) y = Etikett.tekst(g, k.navn, x, y, -1);   // ikke oppå navnet til et annet kjøretøy eller lag
    g.strokeText(k.navn, x, y); g.fillStyle = '#e7dcc3'; g.fillText(k.navn, x, y);
  }

  // ---------- 3D: symbolet over terrenget ----------
  KROKER.tegn3d.push((g, proj, mPer) => {
    for (const k of KJ) { if (!ses(k)) continue; const q = proj(k.x, k.y); if (!q) continue;
      if (mPer(k.x, k.y) < 1.5) for (let i = 0; i < k.antall; i++) { const p = Kjoretoy.posisjon(k, i * Kjoretoy.TYPER[k.type].avstand), s = proj(p.x, p.y);
        if (s) { g.fillStyle = '#4c5634'; g.strokeStyle = '#1a1710'; g.lineWidth = 1; g.beginPath(); g.arc(s[0], s[1], 4, 0, 6.283); g.fill(); g.stroke(); } }
      symbol(g, k, q[0], q[1] - 18, k === valgtKj); }
  });
})();
