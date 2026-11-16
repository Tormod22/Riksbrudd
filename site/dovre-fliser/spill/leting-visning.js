'use strict';
// Leting i hus (reglene i spill/leting.js): når du går inne i et bygg som ikke er gjennomsøkt, kommer knappen «Let gjennom
// huset» nederst. Letingen tar noen sekunder mens du blir inne. Det du finner, går til leiren: mat til folket, materialer til
// lageret (så langt det er plass), diesel til tankene (så langt det er plass) og penger til kassa. Byggene du har lett i,
// huskes per leir (localStorage «riksbrudd-leting»). På smale skjermer står knappen over styrespaken (den lå delvis oppå den). Lastes etter interior3d.js, leir-visning.js og folk-visning.js.
(function () {
  // lett: byggets nummer -> [x, y] i kartet (til merket i 2D); eldre lagringer har bare numrene
  const NØKKEL = 'riksbrudd-leting'; let lett = new Map(), leirId = '', klar = false, jobb = null;
  const r3 = () => (typeof R3 !== 'undefined' ? R3 : null);
  const les = () => { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); lett = new Map((d && d.leir === leirId ? d.hus : []).map(h => Array.isArray(h) ? [h[0], h[3] ? [h[1], h[2], h[3]] : [h[1], h[2]]] : [h, null])); } catch (e) { lett = new Map(); } };
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, hus: [...lett].slice(-4000).map(([i, p]) => p ? (p[2] ? [i, Math.round(p[0]), Math.round(p[1]), p[2]] : [i, Math.round(p[0]), Math.round(p[1])]) : i) })); } catch (e) { /* fullt eller sperret */ } };
  const css = document.createElement('style');
  css.textContent = `#letknapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(96px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; min-width:210px; min-height:44px; padding:6px 18px;
  background:rgba(28,23,15,.92); border:1px solid #c9b26a; color:#f0e2b0; font:inherit; font-size:16px; cursor:pointer; overflow:hidden; }
#letknapp.på{ display:block; } #letknapp i{ position:absolute; left:0; top:0; bottom:0; width:0; background:rgba(201,178,106,.28); pointer-events:none; } #letknapp span{ position:relative; }
#innelapp{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(64px + env(safe-area-inset-bottom,0px)); z-index:6; display:none; padding:2px 12px; background:rgba(22,18,12,.78); color:var(--ink-dim); font-size:14px; white-space:nowrap; pointer-events:none; }
#innelapp.på{ display:block; } #innelapp.funn{ color:#f0e2b0; background:rgba(28,23,15,.94); border:1px solid #c9b26a; font-size:16px; padding:6px 16px; white-space:normal; max-width:min(520px, 86vw); text-align:center; } body.kort #innelapp{ bottom:calc(196px + env(safe-area-inset-bottom,0px)); font-size:13px; }
body.kort #letknapp{ bottom:calc(226px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:180px; }`;
  document.head.appendChild(css);
  const knapp = document.createElement('button'); knapp.id = 'letknapp'; knapp.type = 'button'; knapp.innerHTML = '<i></i><span></span>'; document.body.appendChild(knapp);
  // merkelappen under knappen: hva slags bygg du står i, og om det er gjennomsøkt
  const lapp = document.createElement('div'); lapp.id = 'innelapp'; document.body.appendChild(lapp);
  const NAVN = { hus: 'Bolig', hytte: 'Hytte', leil: 'Leilighetsbygg', kontor: 'Kontorbygg', skole: 'Skole', sykehus: 'Sykehus', butikk: 'Butikk', industri: 'Industribygg', lager: 'Lager', låve: 'Låve', uthus: 'Garasje eller uthus', kirke: 'Kirke', hangar: 'Hangar', terminal: 'Terminal', brakke: 'Brakka', kontrollrom: 'Kontrollrommet', storkjøkken: 'Kjøkkenet' };
  let funnTil = 0;
  const visFunn = t => { lapp.textContent = t; lapp.classList.add('på', 'funn'); funnTil = performance.now() + 5000; };
  const visLapp = P => { if (performance.now() < funnTil) return; lapp.classList.remove('funn'); if (!P || !P.bygg) { lapp.classList.remove('på'); return; } const t = P.leir ? ({ sykestue: 'Sykestua', verksted: 'Verkstedet', lagertelt: 'Lagerteltet', container: 'Containeren', drivhus: 'Drivhuset' }[P.leir] || NAVN[P.bygg.kl] || 'Leiren') : (NAVN[P.bygg.kl] || 'Bygg') + (klar ? (lett.has(P.bygg.i) ? (restAv(P) ? ' · noe ligger igjen' : ' · gjennomsøkt') : ' · ikke gjennomsøkt') : ''); if (lapp.textContent !== t) lapp.textContent = t; lapp.classList.add('på'); };
  const tekst = t => { const s = knapp.querySelector('span'); if (s.textContent !== t) s.textContent = t; }, fyll = a => { knapp.querySelector('i').style.width = Math.round(a * 100) + '%'; };
  const arealAv = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  // Det som ble funnet, legges til leiren. Gir det som faktisk kom med (lageret og tankene har tak).
  function ta(f) {
    const L = window.LeirSpill && LeirSpill.tilstand(), F = window.FolkSpill && FolkSpill.tilstand(), fikk = { mat: 0, tre: 0, betong: 0, stål: 0, diesel: 0, penger: 0, tomt: f.tomt }; if (!L || f.tomt) return fikk;
    if (f.mat && F) { F.mat += f.mat; fikk.mat = f.mat; }
    for (const m of ['tre', 'betong', 'stål']) if (f[m]) fikk[m] = Math.round(Leir.leggInn(L, m, f[m]) * 10) / 10;
    if (f.diesel) { const plass = Math.max(0, Leir.kapasitet(L) - (L.drivstoff || 0)), d = Math.min(plass, f.diesel); L.drivstoff = (L.drivstoff || 0) + d; fikk.diesel = Math.round(d); }
    if (f.penger && window.OppstartSpill) { OppstartSpill.gi(f.penger); fikk.penger = f.penger; }
    if (LeirSpill.lagre) LeirSpill.lagre();
    return fikk;
  }
  // Det som ikke fikk plass, sagt rett ut: hva som ble igjen, og hvorfor
  function igjen(f, fikk, mistet) { const L = window.LeirSpill && LeirSpill.tilstand(), tall = v => String(Math.round(v * 10) / 10).replace('.', ','), d = [];
    for (const m of mistet) { const rest = f[m] - (fikk[m] || 0); if (m === 'diesel') d.push(`${Math.round(rest)} l diesel ble igjen (${L && Leir.kapasitet(L) > 0 ? 'tankene er fulle' : 'dere har ingen dieseltank'})`);
      else d.push(`${tall(rest)} ${m === 'stål' ? 't' : 'm³'} ${m} ble igjen (lageret er fullt)`); }
    return d.length ? d.join(', ').replace(/^./, c => c.toUpperCase()) + '.' : ''; }
  // DET SOM BLE IGJEN: materialer og diesel som ikke fikk plass, ligger igjen i huset (tredje ledd i lett). Når leiren har fått
  // plass (dieseltank, lagertelt), kommer knappen «Hent det som ligger igjen» inne i huset – uten ny leting.
  const restAv = P => { const p = P && P.bygg && lett.get(P.bygg.i); return p && p[2] ? p[2] : null; };
  function plassTil(rest) { const L = window.LeirSpill && LeirSpill.tilstand(); if (!L || !rest) return false;
    if (rest.diesel > 0 && Leir.kapasitet(L) - (L.drivstoff || 0) >= 1) return true;
    for (const m of ['tre', 'betong', 'stål']) if (rest[m] > 0 && Leir.lagerplass(L) - ((L.lager && L.lager[m]) || 0) >= .1) return true; return false; }
  function hent(P) { const p = lett.get(P.bygg.i), rest = restAv(P); if (!rest) return null;
    const fikk = ta(rest), ny = {}; for (const m of ['tre', 'betong', 'stål', 'diesel']) { const r = (rest[m] || 0) - (fikk[m] || 0); if (r > (m === 'diesel' ? .5 : .05)) ny[m] = Math.round(r * 10) / 10; }
    if (Object.keys(ny).length) p[2] = ny; else p.length = 2; lagre();
    const melding = Leting.tekst(fikk).replace(/^Du fant/, 'Du hentet') + (Object.keys(ny).length ? ' Noe ligger fortsatt igjen.' : ' Nå er huset tomt.'); logg(melding); visFunn(melding); return { fikk, rest: restAv(P) }; }
  function ferdig(P) {
    const R = r3(), u = R && R.ut; let mx = 0, my = 0; for (const p of P) { mx += p[0]; my += p[1]; }
    const f = Leting.funn(P.bygg.kl, arealAv(P), P.bygg.i), fikk = ta(f); lett.set(P.bygg.i, u ? [u.cx + mx / P.length, u.cy + my / P.length] : null); lagre();
    const mistet = ['tre', 'betong', 'stål', 'diesel'].filter(m => f[m] > 0 && fikk[m] < f[m] - 1e-6);
    { const p = lett.get(P.bygg.i), rest = {}; for (const m of mistet) rest[m] = Math.round((f[m] - (fikk[m] || 0)) * 10) / 10; if (p && mistet.length) { p[2] = rest; lagre(); } }
    const noe = fikk.mat || fikk.tre || fikk.betong || fikk.stål || fikk.diesel || fikk.penger;
    const melding = f.tomt ? Leting.tekst(f) : (noe ? Leting.tekst(fikk) : 'Du fant noe, men det var ikke plass til det i leiren.') + (mistet.length ? ' ' + igjen(f, fikk, mistet) + ' Det ligger der til dere har plass.' : '');
    // resultatet står midt på skjermen i fem sekunder (loggen er liten på telefon), og i loggen
    logg(melding); visFunn(melding);
    // en overlevende: blir med hvis leiren har en ledig seng (ellers blir vedkommende igjen)
    let person = null;
    if (f.person && window.FolkRegler && window.FolkSpill && FolkSpill.tilstand() && window.LeirSpill && LeirSpill.tilstand()) {
      const r = FolkRegler.rekrutter(FolkSpill.tilstand(), LeirSpill.tilstand(), () => true);
      if (r.person) { person = r.person; logg(`Du møtte en overlevende: ${r.person.navn}${r.person.yrke ? ' (' + String(r.person.yrke).toLowerCase() + ')' : ''} blir med til leiren.`); if (LeirSpill.lagre) LeirSpill.lagre(); }
      else logg('Du møtte en overlevende, men leiren har ingen ledig seng – vedkommende ble igjen.');
    }
    if (window.MaalSpill) MaalSpill.sjekk(false);
    return { f, fikk, person };
  }
  function ramme(R) {
    const her = R.fot && window.Interior3d ? Interior3d.inne(R.bane.x, R.bane.y) : null; visLapp(her);
    const P = klar ? her : null;
    if (P && P.bygg && !P.leir && lett.has(P.bygg.i) && plassTil(restAv(P))) { jobb = null; knapp.classList.add('på'); tekst('Hent det som ligger igjen'); fyll(0); return; }
    if (!P || !P.bygg || P.leir || lett.has(P.bygg.i)) { if (jobb) jobb = null; knapp.classList.remove('på'); return; }
    knapp.classList.add('på');
    if (!jobb || jobb.P !== P) { if (jobb) jobb = null; tekst('Let gjennom huset'); fyll(0); return; }
    const a = (performance.now() - jobb.start) / (jobb.sek * 1000);
    if (a >= 1) { jobb = null; knapp.classList.remove('på'); ferdig(P); return; }
    tekst('Leter … ' + Math.ceil(jobb.sek * (1 - a)) + ' s'); fyll(a);
  }
  knapp.addEventListener('click', e => { e.preventDefault(); const R = r3(); if (!R || !R.fot || jobb) return; const P = Interior3d.inne(R.bane.x, R.bane.y); if (P && P.bygg && !P.leir && lett.has(P.bygg.i)) { if (plassTil(restAv(P))) hent(P); return; } if (!P || !P.bygg || P.leir) return;
    jobb = { P, start: performance.now(), sek: Leting.tid(arealAv(P)) }; });
  // E på tastaturet gjør det samme som knappen
  window.addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E') && knapp.classList.contains('på') && !jobb) knapp.click(); });
  KROKER.ramme3d.push(ramme);
  // 2D: et lite merke på husene du har lett gjennom (når kartet er nært nok til å se husene); gult + der noe ligger igjen
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar || !lett.size || kam.m > 4) return; g.save(); g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of lett.values()) { if (!p) continue; const [x, y] = tilSkjerm(p[0], p[1], vx0, vy1); if (x < -10 || y < -10 || x > VW + 10 || y > VH + 10) continue;
      g.fillStyle = 'rgba(22,18,12,.78)'; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill(); const f = p[2] ? '#e0b24a' : '#9fc46a'; g.strokeStyle = f; g.lineWidth = 1; g.stroke(); g.fillStyle = f; g.fillText(p[2] ? '+' : '✓', x, y + .5); }
    g.restore(); });
  setInterval(() => { const R = r3(); if (!R || !R.fot || typeof på3d === 'undefined' || !på3d) { jobb = null; knapp.classList.remove('på'); if (performance.now() >= funnTil) lapp.classList.remove('på'); } }, 500);
  function start() { const S = window.OppstartSpill && OppstartSpill.tilstand(); leirId = S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : 'x'; les(); klar = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  window.LeteSpill = { start, ferdig, ta, hent, restAv, plassTil, antall: () => lett.size, lett: () => lett, jobb: () => jobb, nullstill: () => { lett = new Map(); lagre(); }, spol: () => { if (jobb) jobb.start -= 60000; } };
})();
