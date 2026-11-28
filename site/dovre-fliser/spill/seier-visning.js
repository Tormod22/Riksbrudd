'use strict';
/* Riksbrudd – TRE VEIER TIL SEIER i spillet (28. nov; docs/plan-selskap-okonomi.md 14.6). Reglene: spill/seier.js. window.SeierSpill.
 *  - Hvert annet sekund regnes fremdriften for alle tre sidene på alle tre veiene: MAKT fra krigskartets stilling (StrategiSpill.område()
 *    + Strategi.stilling – samme tall som Krig), PENGER fra kassa, byggene, lageret og kjøretøyene (rivalene: et anslag), GJENOPPBYGGING
 *    fra strømmen (GarnisonSpill.strømFor), INFRA_TILSTAND (sprengte bruer/dammer, sabotert kraftverk) og lojaliteten (RegionSpill).
 *  - Visningen: «Tre veier til seier» i Selskapet → Oversikt (SeierSpill.oversiktHtml, kalles fra spill/selskapspanel.js), en linje under
 *    hver side i krigskartet (KRIG_TILLEGG.side), og AVSLUTNINGEN: et rolig avisutklipp i #krigkort (samme kort som krigskartet brukte, så
 *    pausen og de andre kortene oppfører seg som før) med hvilken vei, en tekst i avisstil, tall for hele spillet og «Spill videre» /
 *    «Nytt spill» (vant du med makt, også «Større region» og «Sterkere motstander» som før). Taper du, kommer samme kort med «Spill videre».
 *  - Seieren huskes per leir i localStorage «riksbrudd-seier» (hvem, hvilken vei, når, valget), sammen med hvem som har holdt hvert
 *    tettsted siden når, og tellerne for falne og lag slått ut (fra nå av – de telles ikke bakover).
 *  - I TESTENE (navigator.webdriver) kommer avslutningen ikke av seg selv: SeierSpill.test = true slår det på. SeierSpill.vis(vei, side)
 *    viser den når som helst.
 * Tekstene og tallene er Claudes forslag.
 */
(function () {
  const SE = window.Seier, ST = window.Strategi, G = window.Garnison; if (!SE || !ST || !G || typeof KROKER === 'undefined') return;
  const API = { test: false }, auto = () => !navigator.webdriver || API.test === true;
  const NØKKEL = 'riksbrudd-seier', $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const nå = () => (typeof tid === 'number' ? tid : 0);
  const fraksjon = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[side]) || null;
  const navn = side => { if (side === 'blå') { const s = Sp(); if (s && s.fraksjon && s.fraksjon.navn) return s.fraksjon.navn; } const f = fraksjon(side); return (f && f.navn) || ({ blå: 'Ditt selskap', rød: 'Ravnsund', grønn: 'Mosevakt' }[side] || side); };
  const alleNavn = () => ({ blå: navn('blå'), rød: navn('rød'), grønn: navn('grønn') });
  const farge = side => (typeof sidefarge === 'function' ? sidefarge(side, 'lys') : { blå: '#7aa6e0', rød: '#d86a5a', grønn: '#7fc07a' }[side]);
  const kr = v => (window.Leir && Leir.kroner ? Leir.kroner(v) : SE.mill(v));

  // ---------- huskingen per leir ----------
  let S = SE.ny('');
  const leirId = () => { const s = Sp(); return s && s.leir ? Math.round(s.leir.x) + ',' + Math.round(s.leir.y) : ''; };
  function les() { const id = leirId(); if (S.leir === id) return; let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; } S = SE.fraJSON(d, id); tellere = new Map(); }
  function lagre() { if (!S.leir || (window.NETT && NETT.gjest)) return; try { localStorage.setItem(NØKKEL, JSON.stringify(S)); } catch (e) { /* fullt eller sperret */ } }

  // ---------- det som trengs til reglene ----------
  const eierAv = id => G.tilstand(TETTSTEDER, id).eier;
  const OBJ = new Map(); let objN = -1;
  // de ødelagte tingene (bru, dam, kraftverk) med plass: [{ x, y, lag, tilstand }]
  function ødelagte() {
    const T = window.INFRA_TILSTAND; if (!T || !T.size || typeof INFRA === 'undefined' || !INFRA) return [];
    const n = SE.REGLER.gjenoppbygging.lag.reduce((s, l) => s + ((INFRA[l] || []).length), 0);
    if (n !== objN) { OBJ.clear(); objN = n; for (const l of SE.REGLER.gjenoppbygging.lag) for (const o of INFRA[l] || []) if (o && o.e && o.deler && o.deler[0]) OBJ.set(l + ':' + o.e.id, o); }
    const ut = []; for (const [k, v] of T) { const o = OBJ.get(k); if (!o || !v || v.tilstand === 'hel') continue; ut.push({ x: o.deler[0][0], y: o.deler[0][1], lag: k.split(':')[0], tilstand: v.tilstand }); }
    return ut; }
  function minVerdi() {
    const s = Sp(), L = window.LeirSpill && LeirSpill.tilstand ? LeirSpill.tilstand() : null, LB = window.Leir;
    const bygg = L && Array.isArray(L.bygg) && LB ? SE.byggVerdi(L.bygg.map(b => ({ type: b.type, pris: b.pris, hp: b.hp, ferdig: LB.ferdig ? LB.ferdig(b) : !(b.igjen > 0) })), LB.BYGG) : 0;
    const lager = L && LB ? SE.lagerVerdi(L.lager, LB.MATERIALER, L.drivstoff, LB.DRIVSTOFF && LB.DRIVSTOFF.prisPerLiter) : 0;
    const kj = SE.kjøretøyVerdi((window.KJORETOY || []).filter(k => k && (k.side || 'blå') === 'blå'));
    return SE.verdi({ kassa: s ? s.penger : 0, bygg, lager, kjøretøy: kj }); }
  function rivalVerdi(side) {
    let kasse = 0; try { const E = window.EskaleringSpill && EskaleringSpill.S ? EskaleringSpill.S() : null; kasse = E && E.øk && E.øk[side] ? E.øk[side].kr : 0; } catch (e) { kasse = 0; }
    let folk = 0; try { if (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) for (const by of INFRA.tettsted) if (eierAv(by.e.id) === side) folk += by.e.folk || 0; } catch (e) { folk = 0; }
    const lag = typeof ENHETER !== 'undefined' ? ENHETER.filter(e => e.side === side && (typeof levende !== 'function' || levende(e)) && !e.raid && !e.post).length : 0;
    const kj = SE.kjøretøyVerdi((window.KJORETOY || []).filter(k => k && k.side === side));
    return SE.rivalVerdi({ kasse, folk, lag, kjøretøy: kj }); }
  function sulter() { const F = window.FolkSpill && FolkSpill.tilstand ? FolkSpill.tilstand() : null; return !!(F && F.personer && F.personer.length && !(F.mat > 0)); }

  // ---------- øyeblikksbildet ----------
  let sist = null, sistNår = -1e9;
  function bilde(tving) {
    if (!tving && sist && performance.now() - sistNår < 1500) return sist;
    const s = Sp(); if (!s || !s.leir || !window.StrategiSpill || !StrategiSpill.område) return null; les();
    const B = StrategiSpill.område() || [];
    const st = ST.stilling(B, eierAv), t = nå();
    SE.holdt(S.holdt, B.map(b => [b.id, eierAv(b.id)]), t);
    const ød = ødelagte(), RG = window.RegionSpill && RegionSpill.tilstand ? RegionSpill.tilstand() : null;
    const byer = B.map(b => { const e = eierAv(b.id); let strøm = true; try { strøm = window.GarnisonSpill && b.ref ? GarnisonSpill.strømFor(b.ref) : true; } catch (x) { strøm = true; }
      const rb = e === 'blå' && RG && RG.byer ? RG.byer[b.id] : null;
      return { id: b.id, navn: b.navn, folk: b.folk, eier: e, strøm, ødelagt: SE.ødelagtNær(b.x, b.y, ød), loj: e === 'blå' ? (rb && Number.isFinite(rb.loj) ? rb.loj : window.Region && Region.REGLER ? Region.REGLER.lojStart : null) : null, holdtFra: S.holdt[String(b.id)] ? S.holdt[String(b.id)].fra : null }; });
    const mv = minVerdi(), rød = rivalVerdi('rød'), grønn = rivalVerdi('grønn');
    const A = SE.alle({ tid: t, st, SR: ST.REGLER, verdier: { blå: mv.sum, rød: rød.sum, grønn: grønn.sum }, byer, sult: { blå: sulter() } });
    sist = { A, st, byer, verdi: { blå: mv, rød, grønn }, tid: t }; sistNår = performance.now(); return sist;
  }

  // ---------- tellerne for hele spillet (falne, lag slått ut, flest tettsteder) ----------
  let tellere = new Map();
  function tell() {
    if (typeof ENHETER === 'undefined' || !S.leir) return false; let endret = false;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || s.leirvakt || !Array.isArray(s.menn)) continue;
      const døde = s.menn.filter(m => !(m.hp > 0)).length, ute = (typeof levende === 'function' && !levende(s)) || !s.menn.some(m => m.hp >= 1), før = tellere.get(s);
      if (før) { if (døde > før.døde) { S.falne += døde - før.døde; endret = true; } if (ute && !før.ute) { S.lagUt++; endret = true; } }
      tellere.set(s, { døde, ute }); }
    let n = 0; try { if (typeof TETTSTEDER !== 'undefined' && TETTSTEDER.forEach) TETTSTEDER.forEach(t => { if (t && t.eier === 'blå') n++; }); } catch (e) { n = 0; }
    if (n > S.maksBy) { S.maksBy = n; endret = true; }
    return endret; }
  function tallForSpillet() {
    const s = Sp(), SS = window.SelskapSpill, sd = SS && SS.tilstand && SS.tilstand() && SS.tilstand().sider ? SS.tilstand().sider.blå : null;
    let inn = null; try { const R = window.StatistikkSpill && StatistikkSpill.rader ? StatistikkSpill.rader() : []; if (R.length) inn = R.reduce((a, r) => a + (Number.isFinite(r.inn) ? r.inn : 0), 0); } catch (e) { inn = null; }
    let nåBy = 0; try { TETTSTEDER.forEach(t => { if (t && t.eier === 'blå') nåBy++; }); } catch (e) { nåBy = 0; }
    const B = bilde(true);
    return { dager: Math.floor(nå() / 1440) + 1, kontrakter: sd && sd.sum ? sd.sum.levert : 0, tettsteder: nåBy, flest: Math.max(S.maksBy, nåBy), kassa: s ? s.penger : 0,
      verdi: B ? B.verdi.blå.sum : 0, inn, falne: S.falne, lagUt: S.lagUt, folk: window.FolkSpill && FolkSpill.tilstand && FolkSpill.tilstand() ? FolkSpill.tilstand().personer.length : null }; }

  // ---------- stilen ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet .seier3{ margin:2px 0 4px; } #selskapet .sv{ padding:5px 0 7px; border-bottom:1px solid #3a3226; }
#selskapet .sv .sv1{ display:flex; justify-content:space-between; align-items:baseline; gap:8px; font-size:14px; } #selskapet .sv .sv1 b{ font-weight:600; } #selskapet .sv .sv1 span{ font-variant-numeric:tabular-nums; color:#f0e2b0; }
#selskapet .sv .sv1 em{ font-style:normal; font-size:12px; color:#a9c27a; margin-left:6px; } #selskapet .sv .sv1 em.tapt{ color:#e7a593; }
#selskapet .sv .mlr{ position:relative; height:7px; margin:4px 0 3px; background:#17120a; border:1px solid #4a3d22; border-radius:2px; }
#selskapet .sv .mlr i{ position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg,#8a7440,#c9b26a); border-radius:1px; }
#selskapet .sv .mlr u{ position:absolute; top:-3px; bottom:-3px; width:3px; margin-left:-1px; border-radius:1px; text-decoration:none; }
#selskapet .sv small{ display:block; font-size:12.5px; color:#8f8a7c; line-height:1.3; } #selskapet .sv small.r{ color:#b9ab86; }
#krigkort.avslutning{ background:rgba(8,6,4,.8); }
#krigkort.avslutning div{ width:auto; padding:0; border:0; background:none; text-align:left; box-shadow:none; }
#krigkort.avslutning > div.avis{ width:min(520px,calc(100vw - 28px)); max-height:min(88vh,calc(100% - 24px)); overflow:auto; box-sizing:border-box; padding:16px 20px 16px;
  background:#ddd3bb linear-gradient(180deg,rgba(255,255,255,.18),rgba(0,0,0,.05)); color:#221c12; border:1px solid #8a7440; border-radius:2px; box-shadow:0 18px 44px rgba(0,0,0,.7); transform:rotate(-.4deg); }
#krigkort.avslutning .topp{ display:flex; justify-content:space-between; gap:10px; align-items:baseline; border-bottom:3px double #3a3022; padding-bottom:5px; margin-bottom:8px; }
#krigkort.avslutning .topp b{ font-family:"IM Fell English",Georgia,serif; font-weight:400; font-size:24px; letter-spacing:.06em; color:#16110a; } #krigkort.avslutning .topp span{ font-size:12px; color:#5a4e3a; }
#krigkort.avslutning .vei{ display:block; font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:#6a4f1f; margin:2px 0 4px; } #krigkort.avslutning .vei.tap{ color:#8a2e22; }
#krigkort.avslutning h2{ margin:0 0 6px; font-family:"IM Fell English",Georgia,serif; font-weight:400; font-size:30px; line-height:1.08; color:#16110a; }
#krigkort.avslutning p{ margin:0 0 10px; font-family:"Cormorant Garamond",Georgia,serif; font-size:17px; line-height:1.38; color:#2a2318; }
#krigkort.avslutning p.dag{ font-size:15px; font-style:italic; color:#4a3f2c; border-left:2px solid #a8966a; padding-left:9px; }
#krigkort.avslutning ul{ list-style:none; margin:4px 0 12px; padding:8px 0 0; border-top:1px solid #a8966a; display:grid; grid-template-columns:1fr 1fr; gap:3px 18px; }
#krigkort.avslutning li{ display:flex; justify-content:space-between; gap:8px; font-size:13.5px; border-bottom:1px dotted #b8a77e; padding:2px 0; } #krigkort.avslutning li span{ color:#5a4e3a; } #krigkort.avslutning li b{ font-variant-numeric:tabular-nums; font-weight:600; }
#krigkort.avslutning .knapper{ display:flex; flex-wrap:wrap; justify-content:flex-start; gap:8px; margin-top:4px; }
#krigkort.avslutning .knapper button{ min-height:40px; padding:4px 16px; background:#2a2318; color:#efe3c2; border:1px solid #2a2318; border-radius:2px; font:inherit; font-size:14.5px; cursor:pointer; min-width:0; }
#krigkort.avslutning .knapper button.hoved{ background:#3d311c; border-color:#c9b26a; } #krigkort.avslutning .knapper button.lett{ background:transparent; color:#2a2318; border-color:#6a5a3a; }
#krigkort.avslutning .knapper small{ flex-basis:100%; font-size:12.5px; color:#5a4e3a; margin-top:-2px; }
body.kort #krigkort.avslutning > div.avis{ padding:12px 14px; transform:none; } body.kort #krigkort.avslutning h2{ font-size:25px; } body.kort #krigkort.avslutning p{ font-size:16px; }
body.kort #krigkort.avslutning ul{ grid-template-columns:1fr; }`;
  document.head.appendChild(css);

  // ---------- «Tre veier til seier» (Selskapet → Oversikt) ----------
  const pst = v => SE.prosent(v) + ' %';
  function oversiktHtml() {
    const B = bilde(); if (!B) return '';
    let h = '<h3>Tre veier til seier</h3><div class="seier3">';
    for (const v of SE.REGLER.VEIER) {
      const d = B.A.blå[v.id], vunnet = SE.vunnet(S, 'blå', v.id).slice(-1)[0], tapt = ['rød', 'grønn'].map(s => SE.vunnet(S, s, v.id).slice(-1)[0]).filter(Boolean)[0];
      const merke = vunnet ? `<em>✓ vunnet dag ${Math.floor(vunnet.tid / 1440) + 1}</em>` : tapt ? `<em class="tapt">${esc(navn(tapt.side))} vant</em>` : '';
      const riv = ['rød', 'grønn'].map(s => `<u style="left:${Math.min(100, SE.prosent(B.A[s][v.id].fremdrift))}%;background:${farge(s)}" title="${esc(navn(s))}"></u>`).join('');
      const mål = v.mål.charAt(0).toUpperCase() + v.mål.slice(1), neste = d.nådd ? 'Nådd – ' + v.kort + '.' : d.mangler[0] ? d.mangler[0] + '.' : mål + '.';
      h += `<div class="sv" data-vei="${v.id}" title="${esc(mål)}"><div class="sv1"><b>${esc(v.navn)}${merke}</b><span>${pst(d.fremdrift)}</span></div><div class="mlr"><i style="width:${SE.prosent(d.fremdrift)}%"></i>${riv}</div>`
        + `<small>${esc(neste)}</small><small class="r">${esc(navn('rød'))} ${pst(B.A.rød[v.id].fremdrift)} · ${esc(navn('grønn'))} ${pst(B.A.grønn[v.id].fremdrift)}</small></div>`;
    }
    return h + '</div>';
  }
  // en linje under hver side i krigskartet (stillingen)
  (window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}).side = window.KRIG_TILLEGG.side || [];
  window.KRIG_TILLEGG.side.push(side => { const B = sist; if (!B || !B.A[side]) return ''; return `Andre veier til seier: penger ${pst(B.A[side].penger.fremdrift)}, gjenoppbygging ${pst(B.A[side].gjenoppbygging.fremdrift)}`; });

  // ---------- AVSLUTNINGEN ----------
  let åpen = null, pauset = false;
  function vis(veiId, side = 'blå') {
    const V = SE.vei(veiId); if (!V) return null; const kort = $('krigkort'); if (!kort) return null; les();
    const B = bilde(true), d = B && B.A[side] ? B.A[side][veiId] : null, du = side === 'blå', T = tallForSpillet();
    const a = SE.avis(veiId, side, alleNavn(), { andel: d && d.andel !== undefined ? d.andel : B && B.st && B.st.sider[side] ? B.st.sider[side].andel : 0, verdi: d && d.verdi !== undefined ? d.verdi : B ? B.verdi[side].sum : 0, byer: d && d.holdt, dag: T.dager });
    const kl = typeof klokkeslett === 'function' ? ' · kl. ' + klokkeslett(nå()) : '';
    const linje = (n, v) => `<li><span>${esc(n)}</span><b>${esc(v)}</b></li>`;
    let dagbok = ''; try { const D = window.DagbokSpill && DagbokSpill.tilstand ? DagbokSpill.tilstand() : null, l = D && D.liste ? D.liste.find(x => /^(.*! )?Dag \d+:/.test(x)) : null; if (l) dagbok = l; } catch (e) { dagbok = ''; }
    const kunMakt = du && veiId === 'makt' && window.StrategiSpill && StrategiSpill.størreRegion;
    kort.innerHTML = `<div class="avis" role="document"><div class="topp"><b>Regionsavisa</b><span>${esc(a.dato + kl)}</span></div>`
      + `<small class="vei${du ? '' : ' tap'}">${du ? 'Seier' : 'Tap'} · ${esc(V.navn)} – ${du ? esc(V.kort) : esc(navn(side)) + ' vant'}</small>`
      + `<h2>${esc(a.overskrift)}</h2><p>${esc(a.ingress)}</p>`
      + (dagbok ? `<p class="dag">Fra dagboka: ${esc(dagbok)}</p>` : '')
      + '<ul>' + linje('Dager', String(T.dager)) + linje('Kontrakter levert', String(T.kontrakter)) + linje('Tettsteder nå', String(T.tettsteder)) + linje('Flest på en gang', String(T.flest))
      + linje('Kassa', kr(T.kassa)) + linje('Selskapets verdi', kr(T.verdi)) + (T.inn !== null ? linje('Penger inn i alt', kr(T.inn)) : '') + (T.folk !== null ? linje('Folk i leiren', String(T.folk)) : '')
      + linje('Falne', String(T.falne)) + linje('Lag slått ut', String(T.lagUt)) + '</ul>'
      + `<div class="knapper"><button type="button" class="hoved" data-valg="videre">Spill videre</button>`
      + (kunMakt ? '<button type="button" data-valg="region">Større region</button><button type="button" data-valg="sterkere">Sterkere motstander</button>' : '')
      + `<button type="button" class="lett" data-valg="nytt">Nytt spill</button>`
      + `<small>${du ? 'Spill videre i samme verden – seieren huskes.' + (kunMakt ? ' Større region: krigen utvides og må vinnes på nytt. Sterkere motstander: fienden treffer bedre.' : '') : 'Spill videre og prøv å ta det tilbake – du kan fortsatt vinne på en av de andre veiene.'}</small></div></div>`;
    kort.classList.add('på', 'avslutning'); åpen = { vei: veiId, side };
    pauset = false; if (typeof tempo !== 'undefined' && tempo > 0 && $('sp0')) { $('sp0').click(); pauset = true; }
    return kort;
  }
  function lukk(valg) {
    const kort = $('krigkort'); if (!åpen) return false; const { vei, side } = åpen; åpen = null;
    les(); SE.husk(S, side, vei, nå(), valg || 'videre'); lagre();
    if (kort) { kort.classList.remove('på', 'avslutning'); kort.innerHTML = ''; }
    if (pauset && typeof tempo !== 'undefined' && tempo === 0 && $('sp0')) $('sp0').click(); pauset = false;
    if (valg === 'region' && window.StrategiSpill) StrategiSpill.størreRegion();
    else if (valg === 'sterkere' && window.StrategiSpill) StrategiSpill.sterkere();
    else if (valg === 'nytt') { const b = [...document.querySelectorAll('#lagmeny button')].find(q => q.textContent.trim() === 'Nytt spill'); if (b) b.click(); }
    return true;
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#krigkort.avslutning [data-valg]'); if (!b) return; e.stopPropagation(); lukk(b.dataset.valg); }, true);
  // når en vei nås: kortet, en linje i loggen og i dagboka. Venter mens et annet kort står oppe.
  const annetOppe = () => ['krigkort', 'hendelse', 'samfunnkort', 'formkort', 'oppstart'].some(id => { const e = $(id); return e && e.classList.contains('på'); });
  function meld(q) {
    const V = SE.vei(q.vei), du = q.side === 'blå';
    const tekst = du ? `Seier – ${V.navn.toLowerCase()}: ${V.kort}. Spillet fortsetter hvis du vil.` : `${navn(q.side)} har vunnet på ${V.navn.toLowerCase()}. Du kan fortsatt snu det.`;
    if (typeof logg === 'function') logg(tekst);
    try { if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(tekst); } catch (e) { /* uten dagbok */ }
    vis(q.vei, q.side);
  }
  function takt() {
    const s = Sp(); if (!s || !s.leir) return; les();
    // kortet ble tatt bort utenom knappene (et annet kort, en vakt): avslutningen regnes som sett
    { const k = $('krigkort'); if (åpen && (!k || !k.classList.contains('på') || !k.classList.contains('avslutning'))) { const q = åpen; åpen = null; pauset = false; if (k) k.classList.remove('avslutning'); SE.husk(S, q.side, q.vei, nå(), 'lukket'); lagre(); } }
    const endret = tell(), B = bilde(true); if (!B) { if (endret) lagre(); return; }
    // fremdrift som har falt, glemmes (S.aktiv), så samme seier kan meldes igjen senere
    // et lagret spill som alt hadde fått krigskartets seierkort, får ikke avslutningen for makt på nytt
    if (!S.sjekketGml) { S.sjekketGml = true; if (B.A.blå.makt.nådd && window.StrategiSpill && StrategiSpill.seire && StrategiSpill.seire() > 0) S.aktiv['blå:makt'] = true; }
    const nye = SE.nye(S, B.A);
    if (!auto()) { if (endret) lagre(); return; }
    if (nye.length && !åpen && !annetOppe()) meld(nye[0]); else if (endret) lagre();
  }
  setInterval(() => { try { takt(); } catch (e) { /* neste gang */ } }, 2000);
  window.addEventListener('riksbrudd-spill', () => setTimeout(() => { S.leir = '\u0000'; les(); sist = null; }, 200));

  Object.assign(API, { bilde: () => bilde(true), oversiktHtml, vis, lukk, erÅpen: () => !!åpen, takt, tilstand: () => (les(), S), lesPåNytt: () => { S.leir = '\u0000'; les(); }, NØKKEL, tall: tallForSpillet, minVerdi, rivalVerdi });
  window.SeierSpill = API;
})();
