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
  // Andre moduler (S3 økonomi) kan legge knapper og linjer i panelet og ta over kjøringen for kolonner med oppdrag.
  window.KJ_PANEL = []; window.KJ_TEKST = [];   // (k, knapperad) => void  og  k => tekst eller null

  // ---------- vegnettet: hentes i biter gjennom mellomstasjonen, pakkes ut i nettleseren der den kan ----------
  function lastVegnett() {
    if (graf) return Promise.resolve(graf);
    if (lasting) return lasting;
    lasting = (async () => {
      const m = await (await fetch(`/api/kart/${VEGNETT_TAG}/manifest.json/0/1048576`)).json();
      const gz = typeof DecompressionStream !== 'undefined', fil = gz ? 'vegnett.bin.gz' : 'vegnett.bin', byte = gz ? m.gzip_byte : m.byte;
      logg(`Laster vegnettet for hele Norge (${Math.round(byte / 1048576)} MB) …`);
      const deler = [], kø = []; for (let fra = 0; fra < byte; fra += BIT) kø.push(fra);
      let ferdig = 0;
      await Promise.all(Array.from({ length: 4 }, async () => { for (let fra; (fra = kø.shift()) !== undefined;) {
        const r = await fetch(`/api/kart/${VEGNETT_TAG}/${fil}/${fra}/${Math.min(BIT, byte - fra)}`);
        if (!r.ok) throw new Error('Vegnettet: HTTP ' + r.status);
        deler[fra / BIT] = new Uint8Array(await r.arrayBuffer()); ferdig++; STAT.byte += deler[fra / BIT].byteLength; STAT.req++; tegnHud(); } }));
      let data = new Uint8Array(byte), p = 0; for (const d of deler) { data.set(d, p); p += d.byteLength; }
      if (gz) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      graf = Vegnett.les(data); window.VEGNETT = graf;
      logg(`Vegnettet er lastet: ${graf.antallLenker.toLocaleString('nb-NO')} vegstrekninger (NVDB, 1. juni 2023).`);
      return graf;
    })();
    lasting.catch(e => { lasting = null; logg('Fikk ikke lastet vegnettet: ' + e.message); });
    return lasting;
  }
  window.lastVegnett = lastVegnett;

  async function kjørTil(kj, X, Y) {
    try {
      const g = await lastVegnett(), r = Kjoretoy.planlegg(kj, g, [X, Y]);
      if (r.feil) { logg(kj.navn + ': ' + r.feil); return; }
      logg(`${kj.navn}: ${nf.format(r.meter / 1000)} km, ca. ${tidTekst(r.sekunder)}${r.ferjer ? ', ' + r.ferjer + ' ferje' + (r.ferjer > 1 ? 'r' : '') : ''}.`);
    } catch (e) { /* meldt i loggen */ } finally { if (valgtKj === kj) visKj(kj); skitten = true; }
  }
  window.kjørTil = kjørTil; window.visKjoretoy = k => visKj(k);
  const tidTekst = s => s < 3600 ? Math.max(1, Math.round(s / 60)) + ' min' : nf.format(s / 3600) + ' t';

  // ---------- simulering: tid i spillminutter (1 tid-enhet = 60 spillsekunder); 1× er sanntid ----------
  KROKER.sim.push(dt => {
    for (const k of KJ) if (k.sti && !k.oppdrag) { if (Kjoretoy.steg(k, dt * 3600 / TIME)) { logg(k.navn + ' er framme.'); if (valgtKj === k) visKj(k); } skitten = true; }
    if (valgtKj && performance.now() - sistPanel > 1000) { sistPanel = performance.now(); visKj(valgtKj); }   // panelet hvert sekund
  });

  // ---------- trykk: velg kolonne, eller velg mål når «Kjør til …» er på ----------
  KROKER.trykk.push((X, Y) => {
    if (modus === 'marsj' && valgt) return false;   // lagets marsjordre går foran
    if (valgtKj && kjørModus) { kjørModus = false; kjørTil(valgtKj, X, Y); visKj(valgtKj); return true; }
    let best = null, bd = 22;
    for (const k of KJ) for (let i = 0; i < k.antall; i++) {
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
    H.appendChild(knapp(kjørModus ? 'Velg mål på kartet …' : 'Kjør til …', kjørModus, () => { kjørModus = !kjørModus; if (kjørModus) lastVegnett(); visKj(k); }));
    if (k.sti && !k.oppdrag) H.appendChild(knapp('Stopp', false, () => { Kjoretoy.stopp(k); logg(k.navn + ' stopper.'); visKj(k); skitten = true; }));
    for (const f of window.KJ_PANEL) f(k, H);
    document.getElementById('menn').innerHTML = '';
    document.getElementById('hint').textContent = kjørModus ? 'Trykk der kolonnen skal kjøre. Den følger vegene (NVDB), også ferjer. Lastebilene holder seg helst på hovedvegen.'
      : graf ? 'Kolonnen kjører med vegens fartsgrense, høyst ' + T.maks + ' km/t. Ferje: 25 km/t og 15 min venting.' : 'Vegnettet lastes ned (25 MB) første gang et kjøretøy får en ordre.';
    P.classList.add('på');
  }

  // ---------- tegning i 2D: kjøretøy i målestokk når man er nær, ellers små kjøretøy og et symbol for kolonnen ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (valgtKj && !document.getElementById('panel').classList.contains('på')) { valgtKj = null; kjørModus = false; }   // panelet lukket
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m];
    for (const k of KJ) {
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
    g.fillStyle = blå ? '#3b5878' : '#8f3c2f'; g.strokeStyle = valgtNå ? '#f0d79a' : '#e7dcc3'; g.lineWidth = valgtNå ? 2.5 : 1.3;
    g.beginPath(); g.rect(x - r, y - r * .7, r * 2, r * 1.4); g.fill(); g.stroke();
    g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.2; g.beginPath();
    if (k.type === 'lastebil') { g.moveTo(x - r * .6, y - r * .1); g.lineTo(x + r * .6, y - r * .1); }
    else { g.moveTo(x - r, y + r * .7); g.lineTo(x + r, y - r * .7); }
    g.stroke(); for (const dx of [-.45, .45]) { g.beginPath(); g.arc(x + dx * r, y + r * .35, 2.1, 0, 6.283); g.stroke(); }
    if (k.antall > 1) { g.font = '600 11px "Cormorant Garamond",serif'; g.fillStyle = '#e7dcc3'; g.textAlign = 'center'; g.fillText(String(k.antall), x + r + 7, y - r * .4); }
    navn(g, k, x, y - 16);
  }
  function navn(g, k, x, y) {
    g.font = '600 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
    g.strokeText(k.navn, x, y); g.fillStyle = '#e7dcc3'; g.fillText(k.navn, x, y);
  }

  // ---------- 3D: symbolet over terrenget ----------
  KROKER.tegn3d.push((g, proj, mPer) => {
    for (const k of KJ) { const q = proj(k.x, k.y); if (!q) continue;
      if (mPer(k.x, k.y) < 1.5) for (let i = 0; i < k.antall; i++) { const p = Kjoretoy.posisjon(k, i * Kjoretoy.TYPER[k.type].avstand), s = proj(p.x, p.y);
        if (s) { g.fillStyle = '#4c5634'; g.strokeStyle = '#1a1710'; g.lineWidth = 1; g.beginPath(); g.arc(s[0], s[1], 4, 0, 6.283); g.fill(); g.stroke(); } }
      symbol(g, k, q[0], q[1] - 18, k === valgtKj); }
  });
})();
