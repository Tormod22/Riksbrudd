/* Riksbrudd – OVERLEVELSE (16. nov, brukeren etter «Project Zomboid er også en inspirasjon»: «utarbeid 3 og en versjon av 4 og 5»).
 * Inspirasjon, ikke kopi. Reglene øverst uten DOM (Overlev, testes i pipeline/fliser/test_overlev.js), visningen nederst (OverlevSpill).
 *  (3) FERDIGHETER som vokser med bruk: skyting (treffer oftere), styrke (bærer mer), utholdenhet (løper lenger), leting (leter fortere).
 *  (4) TILFLUKTSSTEDER: et hus du står i, kan sikres med planker (tre fra leirens lager). Der tar du nesten ikke skade og kan hvile.
 *  (5) FORFALLET: strømnettet gir leiren litt strøm de første døgnene og dør så; vannverket svikter senere – da trenger leiren en brønn.
 * Alle tall er Claudes forslag. I de automatiske testene skjer forfallet ikke av seg selv (OverlevSpill.test = true slår det på).
 */
(function (rot) {
  'use strict';
  // felles tilfeldighet (spill/tilfeldig.js, M0 i docs/plan-flerspiller.md): samme frø gir samme svar på alle maskiner
  const TILFELDIG = (typeof globalThis !== 'undefined' && globalThis.Tilfeldig) || (typeof require === 'function' ? require('./tilfeldig') : null);
  const tilf = TILFELDIG ? TILFELDIG.verden : Math.random;
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---------- (3) ferdigheter ----------
  const FERDIGHETER = {
    skyting: { navn: 'Skyting', gir: n => `treffer ${n * 4} % oftere`, tekst: 'Vokser når du skyter mot fiender' },
    styrke: { navn: 'Styrke', gir: n => `bærer ${n * 2} kg mer`, tekst: 'Vokser når du går med tung sekk' },
    utholdenhet: { navn: 'Utholdenhet', gir: n => `løper ${n * 8} % lenger`, tekst: 'Vokser når du løper' },
    leting: { navn: 'Leting', gir: n => `leter ${n * 6} % fortere`, tekst: 'Vokser når du leter gjennom hus' },
  };
  // (18. nov) FERDIGHETENE ÅPNER NOE NYTT ved nivå 3 og 6 (ikke bare prosenter). Virkningene ligger i spill/eventyr-visning.js. Claudes forslag.
  const ÅPNER = {
    skyting: [[3, 'stødig', 'Stødig hånd', 'du treffer 20 % oftere når du ligger eller står på huk'], [6, 'hodeskudd', 'Hodeskudd', 'hvert sjuende treff gjør dobbel skade']],
    styrke: [[3, 'seig', 'Seig', 'fall skader deg sjeldnere, og et brukket bein gror dobbelt så fort'], [6, 'pakkesel', 'Pakkesel', 'du bærer 10 kg ekstra']],
    utholdenhet: [[3, 'lett', 'Lett til beins', 'du blir ikke ekstra tørst av å løpe'], [6, 'stilleløp', 'Stille løp', 'fienden hører deg dårligere når du løper']],
    leting: [[3, 'øye', 'Trent øye', 'du ser hva et hus trolig inneholder før du leter'], [6, 'finner', 'Finner alt', 'du finner dobbelt så mange deler til håndverk']],
  };
  const MAKS_NIVÅ = 10, kreves = n => Math.round(40 * Math.pow(n, 1.5));   // poeng for å nå nivå n fra nivå n − 1
  const Ferdigheter = {
    LISTE: FERDIGHETER, MAKS_NIVÅ, kreves, ÅPNER,
    // har du åpnet evnen (id fra ÅPNER)?
    har(F, evne) { for (const [f, L] of Object.entries(ÅPNER)) for (const [n, id] of L) if (id === evne) return Ferdigheter.nivå(F[f]).n >= n; return false; },
    // det som åpnes akkurat på nivå n: [id, navn, tekst] eller null
    åpnes(f, n) { const q = (ÅPNER[f] || []).find(l => l[0] === n); return q ? q.slice(1) : null; },
    ny: () => ({ skyting: 0, styrke: 0, utholdenhet: 0, leting: 0 }),
    // nivået (0–10) og hvor langt du er mot det neste (0–1) fra poengene
    nivå(xp) { let n = 0, igjen = xp || 0; while (n < MAKS_NIVÅ && igjen >= kreves(n + 1)) { igjen -= kreves(n + 1); n++; } return { n, andel: n >= MAKS_NIVÅ ? 1 : igjen / kreves(n + 1) }; },
    // legg til poeng: gir det nye nivået når du gikk opp, ellers 0
    øk(F, id, p) { if (!FERDIGHETER[id] || !(p > 0)) return 0; const før = Ferdigheter.nivå(F[id]).n; F[id] = (F[id] || 0) + p; const nå = Ferdigheter.nivå(F[id]).n; return nå > før ? nå : 0; },
    // virkningene: faktor for treffsjanse, ekstra kg, faktor for løpetid, faktor for letetid
    treff: F => 1 + .04 * Ferdigheter.nivå(F.skyting).n, kg: F => 2 * Ferdigheter.nivå(F.styrke).n + (Ferdigheter.nivå(F.styrke).n >= 6 ? 10 : 0), løp: F => 1 + .08 * Ferdigheter.nivå(F.utholdenhet).n, letetid: F => 1 - .06 * Ferdigheter.nivå(F.leting).n,
  };
  // ---------- (4) tilfluktssteder ----------
  const Tilflukt = { TRE: 3, MAKS: 6, DEKNING: .08, HVILE: 60, HVILE_VENT: 90,
    // kan huset sikres? gir null eller en grunn
    kan(T, id, tre) { if (T.some(q => q.i === id)) return 'Huset er alt sikret.'; if (T.length >= Tilflukt.MAKS) return `Du har alt ${Tilflukt.MAKS} tilfluktssteder. Gi opp ett først.`; if (tre < Tilflukt.TRE) return `Du trenger ${Tilflukt.TRE} m³ tre på lageret i leiren til planker.`; return null; },
    nærmeste(T, x, y) { let b = null, bd = Infinity; for (const q of T) { const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; b = q; } } return b ? { ...b, meter: bd } : null; },
  };
  // ---------- (5) forfallet ----------
  const Forfall = { NETT_KW: 5, MORAL_UTEN_VANN: -15,
    // når strømnettet og vannet svikter: i spilldøgn og i ekte minutter med spilling (det som kommer først, gjelder)
    ny: (tid, r1 = .5, r2 = .5) => ({ strøm: { spill: tid + (3 + r1 * 2) * 1440, ekte: (30 + r1 * 12) * 60, nede: false, varslet: false }, vann: { spill: tid + (6 + r2 * 3) * 1440, ekte: (55 + r2 * 20) * 60, nede: false, varslet: false } }),
    // ett steg: gir hendelsene som skal meldes ('strøm-varsel', 'strøm-nede', 'vann-varsel', 'vann-nede')
    steg(S, tid, ekte) { return Forfall.trinn(S, ['strøm', 'vann'], tid, ekte); },
    trinn(S, nøkler, tid, ekte) { const ut = []; for (const k of nøkler) { const q = S[k]; if (!q || q.nede) continue; const igjenSpill = q.spill - tid, igjenEkte = q.ekte - ekte;
        if (igjenSpill <= 0 || igjenEkte <= 0) { q.nede = true; ut.push(k + '-nede'); } else if (!q.varslet && (igjenSpill <= 1440 || igjenEkte <= 480)) { q.varslet = true; ut.push(k + '-varsel'); } } return ut; },
    // FLERE TRINN (18. nov, Claudes forslag): mobilnettet, butikkene og vegene. [døgn fra, døgn spenn, ekte minutter fra, spenn]
    // mobil: uten egen radiomast faller moralen; butikk: kjøpt mat koster det dobbelte; veg: folk på «frakt» går 20 % saktere.
    MER: { mobil: [4, 2, 40, 14], butikk: [8, 3, 75, 20], veg: [12, 4, 105, 25] }, MORAL_UTEN_MOBIL: -5, MAT_DYRERE: 2, FRAKT_TREGERE: .8,
    nyMer(tid, ekte = 0, r = () => .5) { const ut = {}; for (const [k, [d0, d1, m0, m1]] of Object.entries(Forfall.MER)) { const v = r(); ut[k] = { spill: tid + (d0 + v * d1) * 1440, ekte: ekte + (m0 + v * m1) * 60, nede: false, varslet: false }; } return ut; },
    stegMer: (S, tid, ekte) => (S && S.mer ? Forfall.trinn(S.mer, Object.keys(Forfall.MER), tid, ekte) : []),
    nedeMer: (S, k) => !!(S && S.mer && S.mer[k] && S.mer[k].nede),
    moralMer: (S, radiomaster) => (Forfall.nedeMer(S, 'mobil') && !radiomaster ? Forfall.MORAL_UTEN_MOBIL : 0),
    nettKW: S => (S && !S.strøm.nede ? Forfall.NETT_KW : 0),
    // moralen i leiren: uten vann fra vannverket og uten brønn faller den
    moral: (S, brønner) => (S && S.vann.nede && !brønner ? Forfall.MORAL_UTEN_VANN : 0),
    igjen(q, tid, ekte) { if (q.nede) return 'nede'; const d = (q.spill - tid) / 1440, m = (q.ekte - ekte) / 60; return d * 1440 < m ? `ca. ${Math.max(1, Math.round(d))} døgn til` : `ca. ${Math.max(1, Math.round(m))} min spilling til`; },
  };
  const api = { Ferdigheter, Tilflukt, Forfall };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  rot.Overlev = api;

  // ---------- visningen ----------
  const LB = rot.Leir, r3 = () => (typeof R3 !== 'undefined' ? R3 : null), S0 = () => rot.OppstartSpill && OppstartSpill.tilstand(), L = () => rot.LeirSpill && LeirSpill.tilstand();
  const ut = { test: false }, auto = () => !navigator.webdriver || ut.test;
  let leirId = '', klar = false, F = Ferdigheter.ny(), T = [], D = null, ekte = 0, hvilTil = 0, sistPos = null;
  const les = n => { try { const d = JSON.parse(localStorage.getItem(n) || 'null'); return d && d.leir === leirId ? d.d : null; } catch (e) { return null; } };
  const skriv = (n, d) => { try { localStorage.setItem(n, JSON.stringify({ leir: leirId, d })); } catch (e) { /* fullt eller sperret */ } };
  const lagre = () => { skriv('riksbrudd-ferdigheter', F); skriv('riksbrudd-tilflukt', T); if (D) skriv('riksbrudd-forfall', { ...D, ekteBrukt: ekte }); };
  // BRØNNEN: et nytt bygg i leiren (vann når vannverket har sviktet)
  if (LB && !LB.BYGG.brønn) LB.BYGG.brønn = { navn: 'Brønn', pris: 1.5e6, tid: 1.5, kw: 0, modell: 'brønn', fot: [-1.5, 1.5, -1.5, 1.5], mat: { betong: 3, tre: 2 }, tekst: 'Vann til leiren når vannverket svikter' };
  // virkningene skrives inn der de andre delene leser dem
  function bruk() { if (rot.Utstyr) Utstyr.ekstraVekt = Ferdigheter.kg(F); if (rot.Bevegelse && Bevegelse.REGLER) { if (!bruk.løp0) bruk.løp0 = Bevegelse.REGLER.løpTid; Bevegelse.REGLER.løpTid = bruk.løp0 * Ferdigheter.løp(F); } }
  function øk(id, p) { if (!klar) return; const n = Ferdigheter.øk(F, id, p); if (n) { bruk(); logg(`${FERDIGHETER[id].navn} er nå på nivå ${n}: du ${FERDIGHETER[id].gir(n)}.`); { const å = Ferdigheter.åpnes(id, n); if (å) logg(`NY EVNE – ${å[1]}: ${å[2]}.`); } if (rot.UtstyrSpill) UtstyrSpill.vis(); } }
  function start() { const s = S0(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y); F = { ...Ferdigheter.ny(), ...(les('riksbrudd-ferdigheter') || {}) }; T = (les('riksbrudd-tilflukt') || []).filter(q => q && typeof q.x === 'number');
    const d = les('riksbrudd-forfall'); D = d && d.strøm && d.vann ? d : Forfall.ny(tid, tilf(), tilf()); ekte = d && d.ekteBrukt ? d.ekteBrukt : 0; if (!D.mer) D.mer = Forfall.nyMer(tid, ekte, tilf);
    if (rot.FolkRegler) FolkRegler.oppgaveF = o => (o === 'frakt' && auto() && Forfall.nedeMer(D, 'veg') ? Forfall.FRAKT_TREGERE : 1); if (LB) LB.nettKW = () => (auto() ? Forfall.nettKW(D) : 0); klar = true; bruk(); }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  const master = () => { const l = L(); return l && LB ? l.bygg.filter(b => b.type === 'radiomast' && LB.virker(b)).length : 0; };
  const MER_TEKST = {
    'mobil-varsel': () => 'Mobilen mister dekning stadig oftere. Mobilnettet holder ikke lenge – en radiomast i leiren gir folk nytt utenfra.',
    'mobil-nede': () => (master() ? 'Mobilnettet er dødt. Radiomasten er nå leirens eneste kontakt med verden.' : 'Mobilnettet er dødt. Folk får ikke lenger kontakt med sine – moralen faller til dere bygger en radiomast.'),
    'butikk-varsel': () => 'Hyllene i butikkene er snart tomme. Kjøp mat nå – snart koster den det dobbelte.',
    'butikk-nede': () => 'Butikkene er tømt. Maten må kjøpes av omreisende handelsfolk til dobbel pris – drivhus lønner seg.',
    'veg-varsel': () => 'Ingen brøyter eller rydder vegene lenger. Snart gror småvegene igjen.',
    'veg-nede': () => 'Småvegene gror igjen og er fulle av vindfall: folk på «frakt» går saktere.',
  };
  const brønner = () => { const l = L(); return l && LB ? l.bygg.filter(b => b.type === 'brønn' && LB.ferdig(b)).length + (rot.LeirvirkningSpill && LeirvirkningSpill.leiren().vann ? 1 : 0) : 0; };   // (R18-B) vannrenseanlegget gir også vann
  // hvert sekund: forfallet, og ferdighetene som vokser av å gå og løpe
  setInterval(() => { if (!klar || !S0() || !S0().leir) return; if (tempo > 0 && !document.hidden) ekte++;
    if (auto() && tempo > 0 && D) for (const h of Forfall.steg(D, tid, ekte)) { const t = { 'strøm-varsel': 'Strømmen i området flimrer. Strømnettet holder ikke lenge til – sørg for aggregat eller solceller.', 'strøm-nede': 'Strømnettet er nede for godt. Leiren har bare sin egen strøm nå.',
        'vann-varsel': 'Vanntrykket faller. Vannverket svikter snart – bygg en brønn i leiren.', 'vann-nede': brønner() ? 'Vannverket har sviktet. Brønnen holder leiren med vann.' : 'Vannverket har sviktet, og leiren har ingen brønn. Folk må bære vann – moralen faller til dere bygger en.' }[h]; logg(t); lagre(); if (rot.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); }
    if (auto() && tempo > 0 && D) for (const h of Forfall.stegMer(D, tid, ekte)) { logg(MER_TEKST[h] ? MER_TEKST[h]() : h); lagre(); if (rot.LeirSpill && LeirSpill.visMeny) LeirSpill.visMeny(); }
    const Q = r3(), kr = rot.Gange && Gange.kropp && Gange.kropp(); if (!Q || !Q.fot || !Q.ut || !kr || (rot.KjorSpill && KjorSpill.fører())) { sistPos = null; return; }
    const p = { x: Q.ut.cx + kr.x, y: Q.ut.cy + kr.y }, d = sistPos ? Math.hypot(p.x - sistPos.x, p.y - sistPos.y) : 0; sistPos = p; if (d < .3 || d > 12) return;
    if (kr.løper) øk('utholdenhet', d / 12); if (rot.Utstyr && rot.UtstyrSpill && UtstyrSpill.klar() && Utstyr.vekt(UtstyrSpill.tilstand()) > Utstyr.MAKS_VEKT * .5) øk('styrke', d / 15); }, 1000);
  setInterval(() => { if (klar) lagre(); }, 15000);

  // ----- tilfluktssteder -----
  const her = () => { const Q = r3(); if (!Q || !Q.fot || !rot.Interior3d) return null; const P = Interior3d.inne(Q.bane.x, Q.bane.y); return P && P.bygg && !P.leir ? P : null; };
  const iTilflukt = () => { const P = her(); return !!P && T.some(q => q.i === P.bygg.i); };
  function sikre() { const P = her(), l = L(), Q = r3(); if (!P || !l) return false; const g = Tilflukt.kan(T, P.bygg.i, (l.lager && l.lager.tre) || 0); if (g) { logg(g); return false; }
    l.lager.tre = Math.round((l.lager.tre - Tilflukt.TRE) * 10) / 10; let mx = 0, my = 0; for (const q of P) { mx += q[0]; my += q[1]; } T.push({ i: P.bygg.i, x: Math.round(Q.ut.cx + mx / P.length), y: Math.round(Q.ut.cy + my / P.length), kl: P.bygg.kl });
    lagre(); if (rot.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); logg('Huset er sikret med planker for dører og vinduer. Her er du trygg, og du kan hvile.'); skitten = true; return true; }
  function hvil() { if (!iTilflukt()) return false; const nå = performance.now(); if (nå < hvilTil) { logg(`Du har nettopp hvilt. Vent ${Math.ceil((hvilTil - nå) / 1000)} s.`); return false; } const K = rot.SpilletSpill && SpilletSpill.K && SpilletSpill.K(); if (K) K.hp = Math.min(100, K.hp + Tilflukt.HVILE); hvilTil = nå + Tilflukt.HVILE_VENT * 1000; logg(`Du hviler i tilfluktsstedet${K ? `: helsa er ${Math.round(K.hp)} %` : ''}.`); return true; }
  function giOpp(i) { const n = T.length; T = T.filter(q => q.i !== i); if (T.length < n) { lagre(); skitten = true; logg('Tilfluktsstedet er gitt opp.'); return true; } return false; }
  const css = document.createElement('style');
  css.textContent = `#sikreknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(150px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:190px; min-height:40px; padding:5px 16px; background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:15px; cursor:pointer; } #sikreknapp.på{ display:block; } body.kort #sikreknapp{ bottom:calc(278px + env(safe-area-inset-bottom,0px)); font-size:14px; }
#sekk .ferd{ padding:4px 0; border-bottom:1px solid #2e281e; } #sekk .ferd small{ display:block; color:var(--ink-dim,#a99); } #sekk .ferd .strek{ height:5px; background:#2e281e; margin-top:3px; } #sekk .ferd .strek i{ display:block; height:100%; background:#9fc46a; }`;
  document.head.appendChild(css);
  const knapp = document.createElement('button'); knapp.id = 'sikreknapp'; knapp.type = 'button'; document.body.appendChild(knapp);
  knapp.addEventListener('click', e => { e.preventDefault(); if (iTilflukt()) hvil(); else sikre(); });
  setInterval(() => { const P = klar ? her() : null, t = !P ? '' : iTilflukt() ? 'Hvil her' : `Sikre huset (${Tilflukt.TRE} m³ tre)`; knapp.classList.toggle('på', !!t); if (t && knapp.textContent !== t) knapp.textContent = t; }, 400);
  // kartet: et husmerke på tilfluktsstedene; i 3D navnet når du er nær
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar || !T.length || kam.m > 30) return; g.save();
    for (const q of T) { const x = (q.x - vx0) / kam.m, y = (vy1 - q.y) / kam.m; if (x < -20 || y < -20 || x > VW + 20 || y > VH + 20) continue; g.fillStyle = 'rgba(22,18,12,.85)'; g.strokeStyle = '#9fc46a'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 8, y - 2); g.lineTo(x + 6, y - 2); g.lineTo(x + 6, y + 6); g.lineTo(x - 6, y + 6); g.lineTo(x - 6, y - 2); g.lineTo(x - 8, y - 2); g.closePath(); g.fill(); g.stroke();
      if (kam.m < 4) { g.font = '11px sans-serif'; g.textAlign = 'center'; const t = 'Tilfluktssted', ty = rot.Etikett ? Etikett.tekst(g, t, x, y + 19, 1) : y + 19; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#cfe6b8'; g.fillText(t, x, ty); } }
    g.restore(); });
  KROKER.tegn3d.push((g, proj3) => { if (!klar || !T.length) return; const Q = r3(); if (!Q || !Q.ut || !Q.fot) return; g.save(); g.font = 'bold 12px sans-serif'; g.textAlign = 'center';
    for (const q of T) { const d = Math.hypot(q.x - Q.ut.cx - Q.bane.x, q.y - Q.ut.cy - Q.bane.y); if (d > 400 || d < 6) continue; const p = proj3(q.x, q.y); if (!p) continue; const t = `⌂ Tilfluktssted ${Math.round(d / 10) * 10} m`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 26); g.fillStyle = '#cfe6b8'; g.fillText(t, p[0], p[1] - 26); }
    g.restore(); });
  // ferdighetene vises i sekken (utstyr.js spør OverlevSpill.fyllSekk), forfallet i Leir-menyen
  function fyllSekk(p, el) { p.append(el('h3', {}, 'Ferdigheter')); for (const [id, D2] of Object.entries(FERDIGHETER)) { const n = Ferdigheter.nivå(F[id]); p.append(el('div', { klasse: 'ferd' }, el('b', {}, `${D2.navn} ${n.n}`), el('small', {}, n.n ? `Du ${D2.gir(n.n)}. ${D2.tekst}.` : D2.tekst + '.'), el('small', {}, (ÅPNER[id] || []).map(([nv, , navn, tekst]) => (n.n >= nv ? `✓ ${navn}: ${tekst}.` : `Nivå ${nv}: ${navn}.`)).join(' ')), el('div', { klasse: 'strek' }, el('i', { style: `width:${Math.round(n.andel * 100)}%` })))); } }
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e }) => { if (!klar || !D) return; const b = brønner();
    const M = D.mer || {}, mt = (k, navn, følge) => (M[k] ? `${navn}: ${M[k].nede ? følge : Forfall.igjen(M[k], tid, ekte)}` : '');
    hode.append(e('h3', { 'data-fane': 'bygg' }, 'Strømnett og vannverk'), e('small', {}, `Strømnettet: ${D.strøm.nede ? 'nede – leiren har bare egen strøm' : `gir ${Forfall.NETT_KW} kW, ${Forfall.igjen(D.strøm, tid, ekte)}`}. Vannverket: ${D.vann.nede ? (b ? 'nede – brønnen gir vann' : 'nede – bygg en brønn (moralen faller)') : `virker, ${Forfall.igjen(D.vann, tid, ekte)}${b ? ' (dere har brønn)' : ''}`}.`),
      e('small', { id: 'forfall-mer', style: 'display:block;margin-top:3px' }, [mt('mobil', 'Mobilnettet', master() ? 'dødt – radiomasten holder kontakten' : 'dødt – bygg en radiomast (moralen faller)'), mt('butikk', 'Butikkene', 'tømt – kjøpt mat koster det dobbelte'), mt('veg', 'Småvegene', 'grodd igjen – frakt går saktere')].filter(Boolean).join('. ') + '.')); });
  Object.assign(ut, { start, øk, har: evne => klar && Ferdigheter.har(F, evne), her, sikre, hvil, giOpp, iTilflukt, fyllSekk, lagre, F: () => F, T: () => T, D: () => D, klar: () => klar, treff: () => (klar ? Ferdigheter.treff(F) : 1), letetid: () => (klar ? Ferdigheter.letetid(F) : 1),
    moralTillegg: () => (klar && auto() ? Forfall.moral(D, brønner()) + Forfall.moralMer(D, master()) : 0), brønner, master,
    matFaktor: () => (klar && auto() && Forfall.nedeMer(D, 'butikk') ? Forfall.MAT_DYRERE : 1), stegMer: () => (D ? Forfall.stegMer(D, tid, ekte) : []), steg: () => (D ? Forfall.steg(D, tid, ekte) : []) });
  rot.OverlevSpill = ut;
})(typeof window !== 'undefined' ? window : globalThis);
