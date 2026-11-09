'use strict';
// S3 i kartet: oljeøkonomien (spill/okonomi.js) med terminalene fra infrastrukturlaget og en base ved Dombås.
// Kolonner med oppdrag («Hent olje …») kjøres herfra; kjoretoy-visning.js hopper over dem. Koblet på med KROKER.
(function () {
  // De norske olje- og gassterminalene på land (Sokkeldirektoratet, INFRA.olje type 3). Utenlandske og dubletter er utelatt.
  const NAVN = ['KÅRSTØ', 'STURE', 'MONGSTAD', 'KOLLSNES', 'TJELDBERGODDEN', 'SLAGENTANGEN', 'MELKØYA', 'NYHAMNA'];
  const TERMINALER = [], BASER = [Okonomi.base({ navn: 'Hovedbase Dombås', x: 192960, y: 6896180 })];
  let valgtBase = null, hentModus = null, sistPanel = 0, nyeKolonner = 0, nyeLag = 0;
  window.OLJE = { TERMINALER, BASER };
  const pen = n => n.charAt(0) + n.slice(1).toLowerCase();
  KLAR.then(async () => { for (let i = 0; i < 400 && !INFRA; i++) await new Promise(r => setTimeout(r, 250));   // INFRA: infrastrukturlaget (index.html)
    if (!INFRA || !INFRA.olje) return;
    for (const o of INFRA.olje) if (o.e.type === 3 && NAVN.includes(o.e.navn) && !TERMINALER.some(t => t.navn === pen(o.e.navn)))
      TERMINALER.push(Okonomi.terminal({ id: o.e.id, navn: pen(o.e.navn), x: o.deler[0][0], y: o.deler[0][1], beholdning: 500 }));
    skitten = true; });

  // Teller øverst: oljen på basen
  const stat = document.createElement('div'); stat.innerHTML = '<b id="sOlje">0</b> <span>t olje</span>'; stat.title = 'Olje på Hovedbase Dombås';
  document.querySelector('.stats').appendChild(stat);
  const visTeller = () => { document.getElementById('sOlje').textContent = Math.floor(BASER[0].beholdning).toLocaleString('nb-NO'); };

  // ---------- simulering ----------
  KROKER.sim.push(dt => {
    const sek = dt * 3600 / TIME;
    for (const { base: b, type } of Okonomi.tikk(TERMINALER, BASER, sek)) ferdig(b, type);
    for (const k of KJORETOY) if (k.oppdrag) {
      for (const h of Okonomi.steg(k, window.VEGNETT, sek, Kjoretoy)) {
        if (h.hva === 'lastet') logg(`${k.navn} har lastet ${Math.round(h.tonn)} t olje på ${k.oppdrag ? k.oppdrag.terminal.navn : 'terminalen'}.`);
        if (h.hva === 'levert') logg(`${k.navn} leverte ${Math.round(h.tonn)} t olje til ${BASER[0].navn}.`);
        if (h.hva === 'feil') logg(k.navn + ': ' + h.melding);
      }
      skitten = true;
    }
    visTeller();
    if (performance.now() - sistPanel > 1000) { sistPanel = performance.now();
      if (valgtBase) visBase(valgtBase); else { const k = window.valgtKjoretoy && valgtKjoretoy(); if (k && k.oppdrag) visKjoretoy(k); } }
  });
  function ferdig(b, type) {
    const dx = 40 + 30 * (b.bygget % 4), dy = -60 - 30 * Math.floor((b.bygget % 12) / 4);
    if (type === 'lag') { const navn = `${++nyeLag}. nye lag`; ENHETER.push(nyttLag(navn, b.x + dx, b.y + dy, 'blå')); logg(`${b.navn}: ${navn} er klart.`); }
    else { const navn = type === 'lastebil' ? `Lastebil ${++nyeKolonner}` : `Speiderbil ${++nyeKolonner + 1}`;
      KJORETOY.push(Kjoretoy.ny({ navn, type, antall: 1, x: b.x + dx, y: b.y + dy, retning: -1.2 })); logg(`${b.navn}: ${navn} er klar.`); }
    if (valgtBase === b) visBase(b); skitten = true;
  }

  // ---------- panel for kolonnene: «Hent olje …» ----------
  KJ_TEKST.push(k => Okonomi.tekst(k));
  KJ_PANEL.push((k, H) => {
    if (!Okonomi.kapasitet(k)) return;
    if (k.oppdrag) H.appendChild(knapp('Avbryt oppdraget', false, () => { Okonomi.avbryt(k, Kjoretoy); logg(k.navn + ' avbryter oljeoppdraget.'); visKjoretoy(k); skitten = true; }));
    else H.appendChild(knapp(hentModus === k ? 'Velg terminal på kartet …' : 'Hent olje …', hentModus === k, () => {
      hentModus = hentModus === k ? null : k; if (hentModus) { lastVegnett(); logg('Trykk på en oljeterminal (eller nær en). Kolonnen kjører i skytteltrafikk til ' + BASER[0].navn + '.'); } visKjoretoy(k); }));
  });
  async function startHenting(k, t) {
    try { const g = await lastVegnett(), r = Okonomi.hentOlje(k, g, t, BASER[0], Kjoretoy);
      if (r.feil) logg(k.navn + ': ' + r.feil);
      else logg(`${k.navn} kjører til ${t.navn} etter olje: ${nf.format(r.meter / 1000)} km, ca. ${r.sekunder < 3600 ? Math.round(r.sekunder / 60) + ' min' : nf.format(r.sekunder / 3600) + ' t'}.`);
    } catch (e) { /* meldt i loggen av lastVegnett */ } finally { visKjoretoy(k); skitten = true; }
  }

  // ---------- trykk: terminal (når «Hent olje …» er på) og basen; før kjøretøyenes egen håndtering ----------
  KROKER.trykk.unshift((X, Y) => {
    if (hentModus) { const k = hentModus; hentModus = null; let best = null, bd = Infinity;
      for (const t of TERMINALER) { const d = Math.hypot(t.x - X, t.y - Y); if (d < bd) { bd = d; best = t; } }
      if (best) startHenting(k, best); else logg('Terminalene er ikke lastet ennå.'); return true; }
    for (const b of BASER) if (Math.hypot(b.x - X, b.y - Y) / kam.m < 22) { valgt = null; modus = null; if (window.slippKjoretoy) slippKjoretoy(); valgtBase = b; visBase(b); skitten = true; return true; }
    if (valgtBase) { valgtBase = null; skitten = true; }
    return false;
  });
  function visBase(b) {
    const P = document.getElementById('panel'), R = Okonomi.REGLER;
    document.getElementById('pnavn').textContent = b.navn;
    document.getElementById('psub').textContent = `${Math.floor(b.beholdning).toLocaleString('nb-NO')} t olje` + (b.kø.length ? ` · bygger ${b.kø.length}` : '');
    const H = document.getElementById('handl'); H.innerHTML = '';
    for (const type of ['lastebil', 'speiderbil', 'lag']) {
      const kn = knapp(`${R.navn[type]} (${R.pris[type]} t)`, false, () => { const r = Okonomi.bygg(b, type); logg(r.feil ? b.navn + ': ' + r.feil : `${b.navn}: bygger ${R.navn[type].toLowerCase()} (${Math.round(R.byggetid[type] / 3600 * 10) / 10} t).`); visBase(b); visTeller(); });
      if (b.beholdning < R.pris[type]) { kn.disabled = true; kn.style.opacity = '.5'; kn.title = 'For lite olje'; } H.appendChild(kn);
    }
    const M = document.getElementById('menn'); M.innerHTML = '';
    b.kø.forEach((j, i) => { const d = document.createElement('div'); d.textContent = `${i + 1}. ${R.navn[j.type]}: ${i === 0 ? Math.round(100 * (1 - j.igjen / j.total)) + ' % ferdig' : 'venter'}`; M.appendChild(d); });
    document.getElementById('hint').textContent = b.beholdning < R.pris.lag ? 'Basen trenger olje. Velg lastebilkolonnen, trykk «Hent olje …» og så en oljeterminal.' : 'Olje brukes til å bygge nye enheter. Nye enheter stiller opp ved basen.';
    P.classList.add('på');
  }
  window.visBase = visBase;

  // ---------- tegning: basen og terminalenes lager ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (valgtBase && !document.getElementById('panel').classList.contains('på')) valgtBase = null;
    visTeller();
    const m = kam.m, S = (X, Y) => [(X - vx0) / m, (vy1 - Y) / m];
    for (const b of BASER) { const [x, y] = S(b.x, b.y); if (x < -60 || y < -60 || x > VW + 60 || y > VH + 60) continue; baseSymbol(g, b, x, y, b === valgtBase); }
    if (m < 400) for (const t of TERMINALER) { const [x, y] = S(t.x, t.y); if (x < -80 || y < -40 || x > VW + 80 || y > VH + 40) continue;
      g.font = 'italic 12px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
      const tx = Math.floor(t.beholdning).toLocaleString('nb-NO') + ' t olje'; g.strokeText(tx, x, y + 20); g.fillStyle = '#f0d79a'; g.fillText(tx, x, y + 20);
      if (hentModus) { g.strokeStyle = '#f0d79a'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 14, 0, 6.283); g.stroke(); } }
  });
  KROKER.tegn3d.push((g, proj) => { for (const b of BASER) { const q = proj(b.x, b.y); if (q) baseSymbol(g, b, q[0], q[1] - 20, b === valgtBase); } });
  // Basesymbol: rektangel med flaggstang og vimpel, oljelageret under.
  function baseSymbol(g, b, x, y, valgtNå) {
    const r = 12; g.fillStyle = '#3b5878'; g.strokeStyle = valgtNå ? '#f0d79a' : '#e7dcc3'; g.lineWidth = valgtNå ? 2.5 : 1.4;
    g.beginPath(); g.rect(x - r, y - r * .75, 2 * r, 1.5 * r); g.fill(); g.stroke();
    g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - r * .45, y + r * .5); g.lineTo(x - r * .45, y - r * .5); g.stroke();
    g.fillStyle = '#e7dcc3'; g.beginPath(); g.moveTo(x - r * .45, y - r * .5); g.lineTo(x + r * .5, y - r * .25); g.lineTo(x - r * .45, y); g.closePath(); g.fill();
    g.font = '600 13px "Cormorant Garamond",serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)';
    g.strokeText(b.navn, x, y - r - 6); g.fillStyle = '#e7dcc3'; g.fillText(b.navn, x, y - r - 6);
    const tx = Math.floor(b.beholdning).toLocaleString('nb-NO') + ' t olje' + (b.kø.length ? ' · bygger' : '');
    g.font = 'italic 12px "Cormorant Garamond",serif'; g.strokeText(tx, x, y + r + 14); g.fillStyle = '#f0d79a'; g.fillText(tx, x, y + r + 14);
  }
})();
