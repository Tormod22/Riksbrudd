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
body.kort #letknapp{ bottom:calc(226px + env(safe-area-inset-bottom,0px)); font-size:15px; min-width:180px; }
#inneknapper{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(96px + env(safe-area-inset-bottom,0px)); z-index:6; display:flex; flex-direction:column-reverse; align-items:center; gap:8px; pointer-events:none; }
#inneknapper > button{ pointer-events:auto; } #inneknapper > #sikreknapp{ order:2; } #inneknapper > #lutknapp{ order:3; } #inneknapper > #mobelknapp{ order:4; } #inneknapper > #dorknapp{ order:5; } #inneknapper > #letknapp, #inneknapper > #sikreknapp, #inneknapper > #lutknapp, #inneknapper > #mobelknapp, #inneknapper > #dorknapp{ position:relative; left:auto; right:auto; top:auto; bottom:auto; transform:none; margin:0; }
body.kort #inneknapper{ bottom:calc(226px + env(safe-area-inset-bottom,0px)); gap:6px; }
@media (max-height:560px){ body.kort #inneknapper{ top:calc(var(--topp,40px) + 50px); bottom:auto; flex-direction:row; flex-wrap:wrap; justify-content:center; width:min(560px,62vw); }
  body.kort #inneknapper > button{ min-width:0; min-height:38px; font-size:14px; padding:4px 12px; } }
#funnpanel{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 90px); z-index:8; display:none; width:min(440px,92vw); max-height:calc(100vh - var(--topp,58px) - 190px); overflow:auto; box-sizing:border-box; padding:10px 14px 12px;
  background:rgba(24,20,13,.96); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:15px; }
#funnpanel.på{ display:block; } #funnpanel h3{ margin:0 28px 6px 0; font-size:18px; color:#f0e2b0; } #funnpanel h4{ margin:8px 0 2px; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); font-weight:600; }
#funnpanel ul{ margin:0; padding:0 0 0 2px; list-style:none; } #funnpanel li{ padding:2px 0; } #funnpanel li b{ color:#f0e2b0; } #funnpanel li small{ color:var(--ink-dim,#a99); } #funnpanel p{ margin:4px 0; }
#funnpanel .kn{ display:flex; gap:8px; margin-top:10px; } #funnpanel .kn button{ flex:1; min-height:40px; background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); font:inherit; font-size:15px; cursor:pointer; } #funnpanel .kn button.hoved{ border-color:#c9b26a; color:#f0e2b0; }
#funnpanel .x{ position:absolute; right:4px; top:2px; background:none; border:0; color:inherit; font-size:22px; min-width:36px; min-height:36px; cursor:pointer; }
#innehint{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 90px); z-index:7; display:none; width:min(460px,92vw); box-sizing:border-box; padding:8px 12px; background:rgba(24,20,13,.94); border:1px solid #8fa86a; color:var(--ink,#e7dcc3); font-size:14px; cursor:pointer; }
#innehint.på{ display:block; } #innehint b{ color:#e3efc9; } #innehint small{ display:block; color:var(--ink-dim,#a99); margin-top:3px; }
@media (max-height:560px){ body.kort #funnpanel{ top:calc(var(--topp,40px) + 4px); width:min(430px,60vw); max-height:calc(100vh - var(--topp,40px) - 16px); padding:6px 10px 8px; font-size:13px; } body.kort #funnpanel h3{ font-size:15px; margin-bottom:2px; }
  body.kort #funnpanel .kn{ margin-top:6px; } body.kort #funnpanel .kn button{ min-height:36px; font-size:14px; } body.kort #innehint{ top:auto; bottom:calc(8px + env(safe-area-inset-bottom,0px)); left:310px; right:130px; transform:none; width:auto; font-size:12.5px; padding:5px 10px; } }
body.bærermøbel #funnpanel, body.bærermøbel #innehint{ display:none; }
body:not(.kort) #innelapp{ bottom:auto; top:calc(var(--topp,58px) + 58px); }`;
  document.head.appendChild(css);
  const knapp = document.createElement('button'); knapp.id = 'letknapp'; knapp.type = 'button'; knapp.innerHTML = '<i></i><span></span>'; document.body.appendChild(knapp);
  // merkelappen under knappen: hva slags bygg du står i, og om det er gjennomsøkt
  const lapp = document.createElement('div'); lapp.id = 'innelapp'; document.body.appendChild(lapp);
  // (runde 12, kritiker E/F: «Let gjennom huset viste ingenting», «møbelflytting er umulig å oppdage») – knappene inne i et bygg
  // (let, sikre, åpne skapet, plukk opp, gå inn/ut) står samlet i #inneknapper: en kolonne midt nede på PC, en rad under kompasset på liggende
  // telefon (før lå «Åpne …» og «Plukk opp …» utenfor skjermen der). Resultatet av letingen står i #funnpanel til du lukker det.
  const rekke = document.createElement('div'); rekke.id = 'inneknapper'; document.body.appendChild(rekke);
  const funn = document.createElement('div'); funn.id = 'funnpanel'; funn.setAttribute('role', 'dialog'); funn.setAttribute('aria-label', 'Det du fant'); document.body.appendChild(funn);
  const hint = document.createElement('div'); hint.id = 'innehint'; hint.setAttribute('role', 'status'); document.body.appendChild(hint);
  function samle() { for (const id of ['letknapp', 'sikreknapp', 'lutknapp', 'mobelknapp', 'dorknapp']) { const e = document.getElementById(id); if (e && e.parentNode !== rekke) rekke.appendChild(e); } }
  samle(); document.addEventListener('DOMContentLoaded', samle); window.addEventListener('riksbrudd-spill', () => setTimeout(samle, 0));
  const NAVN = { hus: 'Bolig', hytte: 'Hytte', leil: 'Leilighetsbygg', kontor: 'Kontorbygg', skole: 'Skole', sykehus: 'Sykehus', butikk: 'Butikk', industri: 'Industribygg', lager: 'Lager', låve: 'Låve', uthus: 'Garasje eller uthus', kirke: 'Kirke', hangar: 'Hangar', terminal: 'Terminal', brakke: 'Brakka', kontrollrom: 'Kontrollrommet', storkjøkken: 'Kjøkkenet' };
  let funnTil = 0;
  const visFunn = t => { lapp.textContent = t; lapp.classList.add('på', 'funn'); funnTil = performance.now() + 5000; };
  const visLapp = P => { if (performance.now() < funnTil) return; lapp.classList.remove('funn'); if (!P || !P.bygg) { lapp.classList.remove('på'); return; } const t = P.leir ? ({ sykestue: 'Sykestua', verksted: 'Verkstedet', lagertelt: 'Lagerteltet', container: 'Containeren', drivhus: 'Drivhuset' }[P.leir] || NAVN[P.bygg.kl] || 'Leiren') : (NAVN[P.bygg.kl] || 'Bygg') + (klar ? (lett.has(P.bygg.i) ? (restAv(P) ? ' · noe ligger igjen' : ' · gjennomsøkt') : ' · ikke gjennomsøkt') : '') + (klar && P.inne && !bærbare(P) ? ' · ingen møbler du kan bære' : ''); if (lapp.textContent !== t) lapp.textContent = t; lapp.classList.add('på'); };
  // møbler i bygget du kan løfte (spill/mobler.js: nøkkel nk og ikke for tungt) – huskes på planen
  const bærbare = P => { const I = P.inne; if (I.bærbare === undefined) I.bærbare = window.Mobler ? (I.møbler || []).filter(m => m.nk && Mobler.kanBære(m, 0).ok).length : 1; return I.bærbare; };
  const tekst = t => { const s = knapp.querySelector('span'); if (s.textContent !== t) s.textContent = t; }, fyll = a => { knapp.querySelector('i').style.width = Math.round(a * 100) + '%'; };
  const arealAv = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  // ---------- RESULTATET (runde 12) ----------
  // Et panel som står til du lukker det eller går ut: hva som gikk til leiren (og hvor), hva som havnet i sekken, hva som ble
  // igjen, og «Se i skapene» – beholderne i huset (spill/lut-visning.js) åpner du derfra, uten å lete etter hvert skap.
  let funnFor = null;
  const DIT = { mat: 'leirens mat', tre: 'lageret', betong: 'lageret', stål: 'lageret', diesel: 'dieseltankene', penger: 'kassa' };
  const NAVN2 = { mat: n => (n === 1 ? 'rasjon' : 'rasjoner'), tre: () => 'm³ tre', betong: () => 'm³ betong', stål: () => 't stål', diesel: () => 'l diesel', penger: () => 'kr' };
  const tall2 = v => String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const lagEl = (t, tekst, kl) => { const e = document.createElement(t); if (kl) e.className = kl; if (tekst !== undefined) e.textContent = tekst; return e; };
  function lukkFunn() { funn.classList.remove('på'); funn.replaceChildren(); funnFor = null; }
  // d: { tittel, fikk, tomt, igjen, sekken: [tekst], person, hentet }
  function visResultat(P, d) {
    const navn = P.leir ? 'Bygget' : NAVN[P.bygg.kl] || 'Bygget', ny = [];
    const x = lagEl('button', '×', 'x'); x.type = 'button'; x.setAttribute('aria-label', 'Lukk'); x.onclick = lukkFunn; ny.push(x);
    ny.push(lagEl('h3', d.tittel || `${navn} er gjennomsøkt`));
    const leir = []; for (const m of ['mat', 'tre', 'betong', 'stål', 'diesel', 'penger']) { const n = d.fikk && d.fikk[m]; if (n > 0) { const li = lagEl('li'); li.append(lagEl('b', `${tall2(n)} ${NAVN2[m](n)}`), lagEl('small', ` → ${DIT[m]}`)); leir.push(li); } }
    if (d.tomt) ny.push(lagEl('p', d.tomt));
    if (leir.length) { ny.push(lagEl('h4', d.hentet ? 'Hentet til leiren' : 'Til leiren (ikke i sekken)')); const ul = lagEl('ul'); ul.append(...leir); ny.push(ul); }
    else if (!d.tomt && !d.hentet) ny.push(lagEl('p', 'Ingenting leiren kunne ta imot.'));
    if (d.sekken && d.sekken.length) { ny.push(lagEl('h4', 'I sekken din')); const ul = lagEl('ul'); for (const t of d.sekken) ul.append(lagEl('li', t)); ny.push(ul); }
    if (d.igjen) { ny.push(lagEl('h4', 'Ble igjen i huset')); ny.push(lagEl('p', d.igjen)); }
    if (d.person) { ny.push(lagEl('h4', 'Folk')); ny.push(lagEl('p', d.person)); }
    // skapene: hvor mange det ligger noe i
    const O = window.LutSpill && LutSpill.husOversikt ? LutSpill.husOversikt(P) : null, kn = lagEl('div', undefined, 'kn');
    if (O && O.antall) { ny.push(lagEl('h4', 'Skap, skuffer og hyller'));
      ny.push(lagEl('p', O.medTing ? `Det ligger ting i ${O.medTing} av ${O.antall} (${tall2(O.kg)} kg) – mat, våpen og utstyr tar du selv.` : `${O.antall} i alt, men de er tomme.`));
      if (O.medTing) { const b = lagEl('button', 'Se i skapene', 'hoved'); b.type = 'button'; b.onclick = () => { if (LutSpill.åpneHele()) lukkFunn(); }; kn.append(b); } }
    const lk = lagEl('button', 'Lukk'); lk.type = 'button'; lk.onclick = lukkFunn; kn.append(lk); ny.push(kn);
    funn.replaceChildren(...ny); funn.classList.add('på'); funnFor = P.bygg.i; lukkHint();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  funn.addEventListener('pointerdown', e => e.stopPropagation());
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
    const melding = Leting.tekst(fikk).replace(/^Du fant/, 'Du hentet') + (Object.keys(ny).length ? ' Noe ligger fortsatt igjen.' : ' Nå er huset tomt.'); logg(melding); visFunn(melding);
    visResultat(P, { tittel: 'Hentet det som lå igjen', fikk, hentet: true, igjen: Object.keys(ny).length ? 'Noe ligger fortsatt igjen – leiren har ikke plass til alt.' : '' }); return { fikk, rest: restAv(P) }; }
  function ferdig(P) {
    const R = r3(), u = R && R.ut; let mx = 0, my = 0; for (const p of P) { mx += p[0]; my += p[1]; }
    // (balansen 18. nov, Claudes forslag) det første huset du leter i, er aldri tomt: fire rasjoner og 20 000 kr når det ellers var tomt
    let f = Leting.funn(P.bygg.kl, arealAv(P), P.bygg.i); if (f.tomt && !lett.size && !navigator.webdriver) f = { ...f, tomt: false, mat: 4, penger: 20000 };
    const fikk = ta(f); lett.set(P.bygg.i, u ? [u.cx + mx / P.length, u.cy + my / P.length] : null); lagre();
    const mistet = ['tre', 'betong', 'stål', 'diesel'].filter(m => f[m] > 0 && fikk[m] < f[m] - 1e-6);
    { const p = lett.get(P.bygg.i), rest = {}; for (const m of mistet) rest[m] = Math.round((f[m] - (fikk[m] || 0)) * 10) / 10; if (p && mistet.length) { p[2] = rest; lagre(); } }
    const noe = fikk.mat || fikk.tre || fikk.betong || fikk.stål || fikk.diesel || fikk.penger;
    const res = { fikk, tomt: f.tomt ? Leting.tekst(f) : '', igjen: mistet.length ? igjen(f, fikk, mistet) + ' Det ligger der til dere har plass.' : '', sekken: [], person: '' };
    const melding = f.tomt ? Leting.tekst(f) : (noe ? Leting.tekst(fikk) : 'Du fant noe, men det var ikke plass til det i leiren.') + (mistet.length ? ' ' + igjen(f, fikk, mistet) + ' Det ligger der til dere har plass.' : '');
    // resultatet står midt på skjermen i fem sekunder (loggen er liten på telefon), og i loggen
    // våpen, ammunisjon og førstehjelp går i sekken din (spill/utstyr.js)
    // (18. nov kveld) med beholderne (spill/lut-visning.js) ligger våpen, ammunisjon, mat og utstyr i skapene og skuffene i stedet –
    // letingen gir det tunge (materialer, diesel, penger og mat i kartonger til leiren), og meldingen minner om skapene
    { const LS = window.LutSpill && LutSpill.klar && LutSpill.klar(), ekstra = !f.tomt && window.UtstyrSpill && !LS ? UtstyrSpill.fantIHus(P.bygg.kl, P.bygg.i) : '';
      const skap = LS && P.inne && window.Lut && Lut.beholdere(P.inne).length ? ' Skap og skuffer åpner du selv (E ved møbelet).' : '';
      if (ekstra) { logg(melding); logg(ekstra); visFunn(melding + ' ' + ekstra); } else { logg(melding); visFunn(melding + skap); }
      res.sekken = ekstra ? [ekstra] : []; }
    // en overlevende: blir med hvis leiren har en ledig seng (ellers blir vedkommende igjen)
    let person = null;
    if (f.person && window.FolkRegler && window.FolkSpill && FolkSpill.tilstand() && window.LeirSpill && LeirSpill.tilstand()) {
      const r = FolkRegler.rekrutter(FolkSpill.tilstand(), LeirSpill.tilstand(), () => true);
      if (r.person) { person = r.person; res.person = `Du møtte en overlevende: ${r.person.navn}${r.person.yrke ? ' (' + String(r.person.yrke).toLowerCase() + ')' : ''} blir med til leiren.`; logg(res.person); if (window.SamfunnSpill && SamfunnSpill.funnet) SamfunnSpill.funnet(r.person); if (LeirSpill.lagre) LeirSpill.lagre(); }
      else { res.person = 'Du møtte en overlevende, men leiren har ingen ledig seng – vedkommende ble igjen.'; logg(res.person); }
    }
    // deler til håndverk og kanskje en hund (spill/eventyr-visning.js)
    if (window.EventyrSpill && EventyrSpill.lettHus) { const t = EventyrSpill.lettHus(P.bygg.kl, P.bygg.i, f.tomt); if (t) { logg(t); visFunn(lapp.textContent + ' ' + t); res.sekken.push(t); } }
    visResultat(P, res);
    if (window.OverlevSpill) OverlevSpill.øk('leting', 14);
    if (window.MaalSpill) MaalSpill.sjekk(false);
    return { f, fikk, person };
  }
  // FØRSTE GANG INNE (runde 12): et kort hint om skapene og møblene (én gang i denne nettleseren, «riksbrudd-innehint»); lukkes ved
  // trykk, etter 20 s eller når du går ut. Ikke i testene (webdriver), med mindre LeteSpill.test er satt.
  const HINT = 'riksbrudd-innehint'; let hintTil = 0, hintFor = null;
  const hintVist = () => { try { return localStorage.getItem(HINT) === '1'; } catch (e) { return false; } };
  function visHint(P) { hint.replaceChildren(); const b = document.createElement('b'); b.textContent = 'Inne i huset. ';
    const sm = document.createElement('small'); sm.textContent = 'Trykk her for å lukke.';
    hint.append(b, '«Let gjennom huset» finner det leiren kan bruke. Står du ved et skap, kommer «Åpne …» – der ligger mat, våpen og utstyr. Ved et møbel kommer «Plukk opp …», og da kan du flytte det.', sm);
    hint.classList.add('på'); hintTil = performance.now() + 20000; hintFor = P.bygg.i; try { localStorage.setItem(HINT, '1'); } catch (e) { /* sperret */ } }
  const lukkHint = () => { hint.classList.remove('på'); hintFor = null; };
  hint.addEventListener('pointerdown', e => { e.stopPropagation(); lukkHint(); });
  function ramme(R) {
    const her = R.fot && window.Interior3d ? Interior3d.inne(R.bane.x, R.bane.y) : null; visLapp(her);
    if (funnFor !== null && !(her && her.bygg && her.bygg.i === funnFor)) lukkFunn();
    if (hintFor !== null && (performance.now() > hintTil || !(her && her.bygg && her.bygg.i === hintFor))) lukkHint();
    if (klar && her && her.bygg && her.inne && !her.leir && hintFor === null && (!navigator.webdriver || window.LeteSpill.test) && !hintVist()) visHint(her);
    const P = klar ? her : null;
    if (P && P.bygg && !P.leir && lett.has(P.bygg.i) && plassTil(restAv(P))) { jobb = null; knapp.classList.add('på'); tekst('Hent det som ligger igjen'); fyll(0); return; }
    if (!P || !P.bygg || P.leir || lett.has(P.bygg.i)) { if (jobb) jobb = null; knapp.classList.remove('på'); return; }
    knapp.classList.add('på');
    if (!jobb || jobb.P !== P) { if (jobb) jobb = null; tekst('Let gjennom huset' + (window.EventyrSpill && EventyrSpill.trolig ? EventyrSpill.trolig(P.bygg.kl, arealAv(P), P.bygg.i) : '')); fyll(0); return; }
    const a = (performance.now() - jobb.start) / (jobb.sek * 1000);
    if (a >= 1) { jobb = null; knapp.classList.remove('på'); ferdig(P); return; }
    tekst('Leter … ' + Math.ceil(jobb.sek * (1 - a)) + ' s'); fyll(a);
  }
  knapp.addEventListener('click', e => { e.preventDefault(); const R = r3(); if (!R || !R.fot || jobb) return; const P = Interior3d.inne(R.bane.x, R.bane.y); if (P && P.bygg && !P.leir && lett.has(P.bygg.i)) { if (plassTil(restAv(P))) hent(P); return; } if (!P || !P.bygg || P.leir) return;
    jobb = { P, start: performance.now(), sek: Leting.tid(arealAv(P)) * (window.OverlevSpill ? OverlevSpill.letetid() : 1) }; });
  // E på tastaturet gjør det samme som knappen
  // (står du ved et skap eller en annen beholder, åpner E den i stedet – spill/lut-visning.js)
  window.addEventListener('keydown', e => { if ((e.key === 'e' || e.key === 'E') && knapp.classList.contains('på') && !jobb && !(window.LutSpill && LutSpill.tarE && LutSpill.tarE())) knapp.click(); });
  KROKER.ramme3d.push(ramme);
  // 2D: et lite merke på husene du har lett gjennom (når kartet er nært nok til å se husene); gult + der noe ligger igjen
  KROKER.tegn.push((g, vx0, vy1) => { if (!klar || !lett.size || kam.m > 4) return; g.save(); g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const p of lett.values()) { if (!p) continue; const [x, y] = tilSkjerm(p[0], p[1], vx0, vy1); if (x < -10 || y < -10 || x > VW + 10 || y > VH + 10) continue;
      g.fillStyle = 'rgba(22,18,12,.78)'; g.beginPath(); g.arc(x, y, 7, 0, 6.283); g.fill(); const f = p[2] ? '#e0b24a' : '#9fc46a'; g.strokeStyle = f; g.lineWidth = 1; g.stroke(); g.fillStyle = f; g.fillText(p[2] ? '+' : '✓', x, y + .5); }
    g.restore(); });
  setInterval(() => { const R = r3(); if (!R || !R.fot || typeof på3d === 'undefined' || !på3d) { jobb = null; knapp.classList.remove('på'); if (performance.now() >= funnTil) lapp.classList.remove('på'); if (funnFor !== null) lukkFunn(); if (hintFor !== null) lukkHint(); } }, 500);
  function start() { const S = window.OppstartSpill && OppstartSpill.tilstand(); leirId = S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : 'x'; les(); klar = true; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  window.LeteSpill = { test: false, visResultat, lukkFunn, funnÅpent: () => funn.classList.contains('på'), lukkHint, start, ferdig, ta, hent, restAv, plassTil, antall: () => lett.size, lett: () => lett, jobb: () => jobb, nullstill: () => { lett = new Map(); lagre(); }, spol: () => { if (jobb) jobb.start -= 60000; } };
})();
