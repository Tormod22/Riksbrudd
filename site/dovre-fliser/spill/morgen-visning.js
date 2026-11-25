/* Riksbrudd – MORGENMØTET, visningen (runde 8, 20. nov natt, pakke «morgen»; reglene i spill/morgen.js).
 * Hver morgen kl. 06 (ny dag, samme regel som dagboka og døgnoppgjøret, fra dag 2) kommer kortet #morgenkort: øverst dagbokas rapport,
 * døgnoppgjøret og hvordan gårsdagens valg gikk, så 2–3 valg for dagen (Morgen.dagensValg) og «Ingen endring i dag». Noen dager
 * (Morgen.erStorDag) kommer en større beslutning som steg 2 på samme kort. Valgene virker på ekte tilstand:
 *  - folk som sendes ut (jakt, speidertur, leie ut, tankbilen til fots) er borte til neste morgen (p.borte = BORTE, arbeider ikke);
 *  - dobbel vakt flytter to til «vakt» til neste morgen (tårnene bemannes, vaktene ser lenger) og lagene ved leiren treffer bedre
 *    (KROKER.ild); neste dag er folk slitne;
 *  - fridag, ekstra skift og halve rasjoner virker til neste morgen gjennom SamfunnSpill.valg (tempo, moral, mat i FolkRegler.steg);
 *  - kjøp mat (FolkRegler.kjøpMat – markedets hyller), selg tre (Leir.selgMateriale), røverposten (SpilletSpill.ta), nye folk
 *    (FolkRegler.nyPerson), tankbilen (et lite oppdrag i kartet, KROKER.sim/tegn), beskyttelse (neste bølge senere: SpilletSpill.T()).
 * Kortet går gjennom kortkøen (window.Kortkø, spill/samfunn-visning.js) og pausereglene (Skjermlag: pause mens det står oppe, skjult under
 * angrep). Lagres per leir i «riksbrudd-morgen». I testene (navigator.webdriver) skjer ingenting av seg selv: MorgenSpill.test = true
 * slår det på (vakta pipeline/fliser/vakter/morgen.js). window.MorgenSpill.
 */
(function (rot) {
  'use strict';
  // Felles tilfeldighet (M0 punkt 4, R16-E): alt som bestemmer hva som skjer, trekker fra verdens strøm (spill/tilfeldig.js),
  // så verden kan lagres og regnes likt på flere maskiner.
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const M = rot.Morgen; if (!M || typeof document === 'undefined' || typeof KROKER === 'undefined') return;
  const R = M.REGLER, api = { test: false }, auto = () => !navigator.webdriver || api.test === true;
  const NØKKEL = 'riksbrudd-morgen', BORTE = 1e12, dag = t => Math.floor(t / 1440) + 1;
  const O = () => rot.OppstartSpill && OppstartSpill.tilstand(), L = () => rot.LeirSpill && LeirSpill.tilstand(), F = () => rot.FolkSpill && FolkSpill.tilstand();
  const LB = () => rot.Leir, FR = () => rot.FolkRegler, kr = M.kr;
  let S = null, leirId = '', klar = false;
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: S })); } catch (e) { /* fullt eller sperret */ } };
  const lagreLeir = () => { if (rot.LeirSpill && LeirSpill.lagre) LeirSpill.lagre(); if (rot.LeirSpill && LeirSpill.visMeny) { try { LeirSpill.visMeny(); } catch (e) { /* menyen er lukket */ } } };
  const el = (tag, eg = {}, ...barn) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(eg)) { if (k === 'klasse') e.className = v; else e.setAttribute(k, v); } e.append(...barn.filter(b => b !== null && b !== undefined && b !== false)); return e; };
  const meter = d => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m');

  // ---------- det som står på i leiren (til Morgen.dagensValg / storBeslutning) ----------
  function trussel() { const SS = rot.SpilletSpill; if (!SS || !SS.klar || !SS.klar() || !SS.T) return { timer: null, bølge: 0 }; const T = SS.T(); if (!T) return { timer: null, bølge: 0 };
    if (T.aktiv) return { timer: 0, bølge: T.bølge || 0 }; return { timer: Number.isFinite(T.nesteSpill) ? Math.max(0, (T.nesteSpill - tid) / 60) : null, bølge: T.bølge || 0 }; }
  function nærmesteSted(helt) { const s = O(); if (!s || !s.leir || typeof INFRA === 'undefined' || !INFRA || !INFRA.tettsted) return null; let best = null, bd = Infinity;
    for (const t of INFRA.tettsted) { const bb = t.bb; if (!bb) continue; const x = (bb[0] + bb[2]) / 2, y = (bb[1] + bb[3]) / 2, d = Math.hypot(x - s.leir.x, y - s.leir.y); if (d < bd && t.e && t.e.navn) { bd = d; best = { navn: t.e.navn, id: t.e.id, x, y }; } } return helt ? best : best && best.navn; }
  // RUNDE 14: hvem som holder et tettsted (null = ingen / oss), med eieform «Ravnsunds»
  function eierAv(id) { if (!rot.TETTSTEDER || !rot.Garnison || id === undefined) return null; const e = Garnison.tilstand(TETTSTEDER, id).eier; return e && e !== 'blå' ? e : null; }
  const eieform = side => { const F = rot.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[side]; return F ? F.eieform || F.navn + 's' : 'fiendens'; };
  const sidenavn = side => { const F = rot.Fraksjoner && Fraksjoner.FRAKSJONER && Fraksjoner.FRAKSJONER[side]; return F ? F.navn : 'fienden'; };
  // RUNDE 14: røverne – samme tid og tekst som varselbrikken (ForsvarSpill.neste), eller angrepet som pågår
  function raidNå() { const FS = rot.ForsvarSpill, SS = rot.SpilletSpill; if (!FS) return null; const Tt = SS && SS.T ? SS.T() : null, satt = !!(FS.erSatt && FS.erSatt());
    if (Tt && Tt.aktiv) return { aktiv: true, min: 0, nedtelling: 'nå', satt, tekst: 'Røverne angriper leiren nå' + (satt ? ' – lagene står i stilling.' : ' – sett lagene i stilling!') };
    const n = FS.neste ? FS.neste() : null; if (!n || !(n.min <= R.raid.linje)) return null;
    return { aktiv: false, min: n.min, nedtelling: n.nedtelling, satt, tekst: n.tekst + '.' + (satt ? ' Lagene står i stilling.' : '') }; }
  // RUNDE 14: egne friske soldater (uten deg selv og Leirvakta) og egne tettsteder – for krisehjelpen
  const soldater = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && !e.leirvakt && !e.raid && Array.isArray(e.menn)).reduce((a, e) => a + e.menn.filter(m => m.hp >= 1).length, 0);
  const egneByer = () => { let n = 0; if (rot.TETTSTEDER) for (const v of TETTSTEDER.values()) if (v && v.eier === 'blå') n++; return n; };
  function situasjon() {
    const s = O(), l = L(), f = F(), Fr = FR(), Lb = LB(); if (!s || !l || !f || !Fr || !Lb) return null;
    let B = null; try { B = Fr.behov(f, l, FolkSpill.valg ? FolkSpill.valg() : {}); } catch (e) { B = null; }
    const arb = f.personer.filter(Fr.arbeidsfør), T = trussel(), SS = rot.SpilletSpill;
    const post = SS && SS.O && SS.O() ? SS.O().liste.find(o => o.type === 'post' && !o.tatt) : null;
    const st = nærmesteSted(true), sold = soldater(), by = egneByer();
    return { dag: dag(tid), folk: f.personer.length, arbeidsføre: arb.length, frie: arb.filter(p => p.oppgave === 'fri').length, mat: f.mat, matDøgn: B ? B.dager : (f.personer.length ? f.mat / f.personer.length : Infinity),
      moral: f.moral, penger: s.penger, matPris: Fr.R.matPris, trePris: Math.round(Lb.MATERIALER.tre.pris * Lb.REGLER.salg), dieselPris: Lb.DRIVSTOFF.prisPerLiter, lager: { tre: l.lager.tre || 0 },
      diesel: l.drivstoff || 0, dieselPlass: Lb.kapasitet ? Lb.kapasitet(l) : 0, røverTimer: T.timer, bølge: T.bølge, post: post ? { id: post.id, gir: post.gir.penger || 0, meter: post.meter, retning: post.retning } : null,
      sted: st ? st.navn : null, stedEier: st && eierAv(st.id) ? eieform(eierAv(st.id)) : null, stedXY: st ? [st.x, st.y] : null, årstid: (rot.VAER && VAER.årstid) || 'sommer',
      raid: raidNå(), tapt: { byer: (S && S.taptBy || []).slice(), lag: (S && S.taptLag || []).slice() }, soldater: sold, egneByer: by,
      kriseKan: by === 0 && sold < R.krise.soldater && !(S && Number.isFinite(S.kriseSist) && dag(tid) - S.kriseSist < R.krise.pause) };
  }

  // ---------- virkningene som varer til neste morgen (tempo, moral, mat) – gjennom SamfunnSpill.valg ----------
  const virkning = () => { const v = { tempo: 1, moral: 0, mat: 1 }; for (const e of (S && S.effekter) || []) { v.tempo *= e.tempo || 1; v.moral += e.moral || 0; v.mat *= e.mat || 1; } return v; };
  function koblValg() { const SA = rot.SamfunnSpill; if (!SA || !SA.valg || SA.valg.morgen) return;
    const før = SA.valg;
    const ny = g => { const v = før(g), m = virkning(); if (m.tempo === 1 && !m.moral && m.mat === 1) return v;
      return { ...v, tempoFaktor: (v.tempoFaktor > 0 ? v.tempoFaktor : 1) * m.tempo, moralTillegg: (v.moralTillegg || 0) + m.moral, matFaktor: (v.matFaktor > 0 ? v.matFaktor : 1) * m.mat }; };
    ny.morgen = true; SA.valg = ny; }
  // dobbel vakt: lagene innen REGLER.vakt.radius fra leiren treffer bedre til neste morgen
  const vaktNå = () => !!(S && S.planer && S.planer.some(p => p.id === 'vakt'));
  KROKER.ild.push(a => { if (!klar || a.side !== 'blå' || !vaktNå()) return 1; const s = O(); return s && s.leir && Math.hypot(a.x - s.leir.x, a.y - s.leir.y) <= R.vakt.radius ? R.vakt.ild : 1; });

  // ---------- folk som går ut / kommer hjem ----------
  function sendUt(id, ferd, ekstra = {}) { const f = F(); if (!f) return null; const ider = M.velgFolk(f.personer, R.borte, ferd); if (ider.length < R.borte) return null;
    const folk = ider.map(i => f.personer.find(p => p.id === i)); for (const p of folk) { p.borte = BORTE; p.morgen = id; }
    const plan = { id, folk: ider, navn: folk.map(p => p.navn), ...ekstra }; S.planer.push(plan); return plan; }
  const fornavn = n => n.split(' ')[0], og = a => (a.length > 1 ? a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1] : a[0] || '');
  // gårsdagens planer: gir tekstene til rapporten
  function hjem() {
    const ut = [], f = F(), l = L(), Lb = LB(), T = trussel();
    for (const p of S.planer || []) {
      const folk = f ? p.folk.map(i => f.personer.find(q => q.id === i)).filter(Boolean) : [];
      if (p.id === 'vakt') { for (const q of folk) if (p.tidl && p.tidl[q.id]) q.oppgave = p.tidl[q.id];
        S.effekter.push({ kilde: 'sliten', tempo: R.vakt.slitenTempo, moral: R.vakt.slitenMoral });
        ut.push(`Dobbel vakt i natt: ${og(folk.map(q => fornavn(q.navn)))} går tilbake til arbeidet sitt. Folk er slitne i dag.`); continue; }
      if (p.id === 'post') { const SS = rot.SpilletSpill, o = SS && SS.O && SS.O() ? SS.O().liste.find(q => q.id === p.oppdrag) : null;
        ut.push(o ? `Røverposten står fortsatt (frist om ${Math.max(1, Math.round((o.frist - tid) / 60))} t). Send en tropp dit.` : 'Røverposten er ikke lenger i lista (tatt eller utløpt).'); if (o) S.planer2.push(p); continue; }
      if (p.id === 'vern') { ut.push(T.bølge > p.bølge ? 'Røverne holdt ikke avtalen – de angrep likevel.' : 'Røverne holdt avtalen: ingen angrep i natt.'); continue; }
      if (p.id === 'nabo') { let B = null; try { B = l && f ? FR().behov(f, l, FolkSpill.valg ? FolkSpill.valg() : {}) : null; } catch (e) { B = null; }
        ut.push(`De nye fra nabogården har funnet seg til rette.` + (B && B.utenSeng ? ` Leiren har senger til ${Math.max(0, B.senger)} av ${B.n + B.avh} – bygg brakker, ellers faller moralen.` : '')); continue; }
      if (!['jakt', 'leie', 'speid', 'tankbil', 'øv'].includes(p.id)) continue;
      if (p.id === 'speid' && p.fiende && p.xy) { const fi = ENHETER.filter(e => e.side !== 'blå' && !e.raid && levende(e) && Math.hypot(e.x - p.xy[0], e.y - p.xy[1]) < 2500), mn = fi.reduce((a, e) => a + e.menn.filter(m => m.hp >= 1).length, 0);
        p.fiendeTekst = fi.length ? `I ${p.sted} telte de ${fi.length} fiendtlige lag (ca. ${mn} mann).` : `De så ingen fiendtlige lag i ${p.sted} – byen kan være lett å ta tilbake.`; }
      const u = M.utfall({ ...p, folk }, { årstid: (rot.VAER && VAER.årstid) || 'sommer', røverTimer: T.timer }, tilfV);
      for (const q of folk) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
      if (f && u.mat) f.mat += u.mat; if (u.penger) OppstartSpill.gi(u.penger);
      if (l && Lb) { if (u.tre) Lb.leggInn(l, 'tre', u.tre); if (u.stål) Lb.leggInn(l, 'stål', u.stål);
        if (u.diesel) { const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), d = Math.min(u.diesel, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d; if (d < u.diesel) u.tekst += ` Bare ${d} l fikk plass i tanken.`; } }
      if (u.erf) for (const q of folk) q.erf = Math.round(((q.erf || 0) + u.erf) * 10) / 10;
      for (const n of u.skadet) { const q = folk.find(x => x.navn === n); if (q) q.helse = Math.max(.15, q.helse - u.helse); }
      for (const n of u.borte) { const q = folk.find(x => x.navn === n); if (q && f) f.personer.splice(f.personer.indexOf(q), 1); }
      ut.push(u.tekst);
    }
    // folk som av en eller annen grunn fortsatt er merket borte fra morgenmøtet (planen mangler), kommer hjem
    if (f) for (const q of f.personer) if (q.morgen && !S.planer2.some(p => p.folk && p.folk.includes(q.id))) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
    return ut;
  }

  // ---------- valgene ----------
  function brukDag(v) { const f = F(), l = L(), Lb = LB(); let t = '';
    if (v.id === 'jakt') { const p = sendUt('jakt', 'hogst'); t = p ? `${og(p.navn.map(fornavn))} går på jakt og fiske. De er tilbake i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'speid') { const p = sendUt('speid', 'frakt', { sted: v.sted || null, fiende: v.fiende || null, xy: v.fiende ? (nærmesteSted(true) ? [nærmesteSted(true).x, nærmesteSted(true).y] : null) : null }); t = p ? `${og(p.navn.map(fornavn))} drar på speidertur. De melder fra i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'øv') { const p = sendUt('øv', 'vakt'); t = p ? `${og(p.navn.map(fornavn))} har våpenøvelse i dag.` : 'Det var ingen ledige til øvelsen.'; }
    else if (v.id === 'leie') { const p = sendUt('leie', 'vakt'); t = p ? `${og(p.navn.map(fornavn))} holder vakt for en nabogård i dag. Betalingen kommer i morgen.` : 'Det var ingen ledige å sende.'; }
    else if (v.id === 'kjøp') { const r = FR().kjøpMat(f, R.kjøp, OppstartSpill.betal, rot.OverlevSpill && OverlevSpill.matFaktor ? OverlevSpill.matFaktor() : 1); t = r.feil ? r.feil : `Kjøpte ${r.rasjoner} rasjoner for ${kr(r.pris)}.`; }
    else if (v.id === 'rasjon') { S.effekter.push({ kilde: 'rasjon', mat: R.rasjon.mat, moral: R.rasjon.moral }); t = 'Halve rasjoner i dag. Folk murrer, men maten rekker lenger.'; }
    else if (v.id === 'fri') { S.effekter.push({ kilde: 'fri', tempo: R.fri.tempo, moral: R.fri.moral }); t = 'Fridag i leiren: arbeidet går sakte i dag, men folk henter seg inn.'; }
    else if (v.id === 'skift') { S.effekter.push({ kilde: 'skift', tempo: R.skift.tempo, moral: R.skift.moral }); t = 'Ekstra skift i dag: alt arbeid går raskere, men folk blir slitne.'; }
    // RUNDE 13: svartebørsen betaler med en gang (utenom markedets kjøpere – det er derfor den betaler bedre)
    else if (v.id === 'svart') { if (v.vare === 'tre') { const m = Math.min(v.mengde, Math.floor(l.lager.tre || 0)); if (m < 1) t = 'Dere har ikke tre å selge lenger.'; else { const p = Math.round(v.pris * m / v.mengde); l.lager.tre -= m; OppstartSpill.gi(p); t = `Solgte ${m} m³ tre på svartebørsen for ${kr(p)}.`; } }
      else { const m = Math.min(v.mengde, Math.floor(l.drivstoff || 0)); if (m < 1) t = 'Dere har ikke diesel å selge lenger.'; else { const p = Math.round(v.pris * m / v.mengde); l.drivstoff -= m; OppstartSpill.gi(p); t = `Solgte ${m} l diesel på svartebørsen for ${kr(p)}.`; } } }
    else if (v.id === 'selg') { const r = Lb.selgMateriale(l, 'tre', v.mengde, OppstartSpill.gi); t = r.feil ? r.feil : `Solgte ${String(r.mengde).replace('.', ',')} m³ tre for ${kr(r.pris)}.`; }
    else if (v.id === 'post') { const SS = rot.SpilletSpill; if (SS && SS.ta && SS.ta(v.oppdrag)) { S.planer.push({ id: 'post', folk: [], oppdrag: v.oppdrag }); t = 'Røverposten er merket i kartet. Send en tropp dit – det er farlig, men godt betalt.'; } else t = 'Oppdraget er ikke ledig lenger.'; }
    // RUNDE 14: forsvaret, og flere soldater etter tap
    else if (v.id === 'forsvar') { const FS = rot.ForsvarSpill; const r = FS && FS.sett ? FS.sett(false) : { feil: 'Forsvaret finnes ikke.' };
      t = r.feil ? r.feil : r.lag || r.vakt ? `Forsvar: ${r.lag} lag går i stilling` + (r.vakt ? `, og Leirvakta (${r.vakt}) tar opp våpen` : '') + '.' : 'Ingen lag er nær leiren. Sett folk på «vakt» i Folk – de blir Leirvakta – eller kjøp leiesoldater.'; }
    else if (v.id === 'krise' || v.id === 'leiesold') { const T = R.tap, n = v.id === 'krise' ? R.krise.menn : T.leie.menn, o = O();
      if (v.id === 'leiesold' && !OppstartSpill.betal(T.leie.pris)) t = `Ikke nok penger (${kr(T.leie.pris)}).`;
      else if (!o || !o.leir || typeof nyttLag !== 'function') t = 'Ingen leir å komme til.';
      else { const a = tilfV() * 6.283, navn = (v.id === 'krise' ? 'Frivillige' : 'Leiesoldater') + ' ' + (ENHETER.filter(e => e.side === 'blå' && e.navn && e.navn.startsWith(v.id === 'krise' ? 'Frivillige' : 'Leiesoldater')).length + 1);
        const e = nyttLag(navn, o.leir.x + Math.cos(a) * 30, o.leir.y + Math.sin(a) * 30, 'blå'); e.menn = e.menn.slice(0, n); e.leder = 0;
        if (v.id === 'krise' && rot.Strid && Strid.bevæpn) { try { Strid.bevæpn(e.menn, 'lett'); e.strid = { ...(e.strid || {}), bev: 'lett' }; } catch (x) { /* bevæpningen finnes ikke */ } }
        ENHETER.push(e); skitten = true; if (v.id === 'krise') S.kriseSist = dag(tid);
        t = v.id === 'krise' ? `${navn} (${e.menn.length} mann) har kommet til leiren. Velg laget i kartet for å gi det ordre.` : `${navn} (${e.menn.length} mann) står i leiren. Kassa gikk ned med ${kr(T.leie.pris)}.`; } }
    else if (v.id === 'vaktlag') { const TS = rot.TropperSpill; const ider = M.velgFolk(f.personer, R.tap.vaktlag, 'vakt');
      if (!TS || !TS.opprett || ider.length < 2) t = 'Det var ikke nok ledige til et vaktlag.';
      else { const r = TS.opprett(ider, 'Vaktlag ' + (ENHETER.filter(e => e.side === 'blå' && /^Vaktlag/.test(e.navn || '')).length + 1), 'standard', null); t = r && r.feil ? r.feil : `${r && r.lag ? r.lag.navn : 'Vaktlaget'} er laget av ${ider.length} fra leiren.`; skitten = true; } }
    else if (v.id === 'rekrutt') { const T = R.tap.rekrutt, Fr = FR(); if (!OppstartSpill.betal(T.pris)) t = `Ikke nok penger (${kr(T.pris)}).`;
      else { const nye = []; for (let i = 0; i < T.folk; i++) { const r = Fr.rng(f.frø); const p = Fr.nyPerson(f, r, 'fri'); f.frø = Math.floor(r() * 4294967296); nye.push(p.navn); }
        t = `${og(nye)} fra nabogården er med nå (på «fri»). Lag en tropp av dem i Leir → Tropper.`; } }
    else if (v.id === 'vakt') { const ider = M.velgFolk(f.personer.filter(p => p.oppgave !== 'vakt'), R.vakt.ekstra, 'vakt'), tidl = {};
      for (const i of ider) { const p = f.personer.find(q => q.id === i); tidl[i] = p.oppgave; p.oppgave = 'vakt'; }
      S.planer.push({ id: 'vakt', folk: ider, tidl }); t = ider.length ? `Dobbel vakt i natt: ${og(ider.map(i => fornavn(f.personer.find(q => q.id === i).navn)))} går på vakt til i morgen tidlig.` : 'Det var ingen ledige til vakta.'; }
    return t; }
  async function påLand(x, y) { try { const v = await lagVindu([x - 64, y - 64, x + 64, y + 64], false), [i, j] = Terreng.rute(v, x, y), k = v.K[j * v.w + i]; return k !== 3 && k !== 255 && k !== undefined; } catch (e) { return false; } }
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'], retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  async function plasserTankbil() { const s = O(); if (!s || !s.leir) return null; const T = R.tankbil;
    for (let k = 0; k < 12; k++) { const v = tilfV() * 6.2832, d = T.avst[0] + tilfV() * (T.avst[1] - T.avst[0]), x = Math.round(s.leir.x + Math.cos(v) * d), y = Math.round(s.leir.y + Math.sin(v) * d);
      if (await påLand(x, y)) return { x, y, meter: Math.round(d), retning: retning(Math.cos(v), Math.sin(v)), diesel: Math.round((T.diesel[0] + tilfV() * (T.diesel[1] - T.diesel[0])) / 10) * 10, frist: tid + T.frist, fare: tilfV() < T.røvere, røvere: false }; }
    return null; }
  function brukStor(st, v) { const f = F(), l = L(), Lb = LB(), Fr = FR(); let t = '';
    if (st.id === 'nabo') { const n = v.id === 'alle' ? R.nabo.folk : v.id === 'to' ? 2 : 0;
      if (!n) { f.moral = Math.max(0, f.moral + R.nabo.avvistMoral); t = 'Dere avviste folket fra nabogården. De gikk videre.'; }
      else { const nye = []; for (let i = 0; i < n; i++) { const r = Fr.rng(f.frø); const p = Fr.nyPerson(f, r, 'fri'); f.frø = Math.floor(r() * 4294967296); nye.push(p.navn); }
        const mat = v.id === 'alle' ? R.nabo.mat : Math.round(R.nabo.mat / 2); f.mat += mat; S.planer.push({ id: 'nabo', folk: [] });
        t = `${og(nye)} fra nabogården er med i gjengen nå (på «fri» – sett dem i arbeid i Folk). De hadde med ${mat} rasjoner.`; } }
    else if (st.id === 'tankbil') { if (v.id === 'lag') { t = 'Leter etter tankbilen …'; plasserTankbil().then(b => { if (!b) { logg('Fant ikke noe trygt sted for tankbilen – den er borte.'); return; } S.tankbil = b; lagre(); skitten = true;
          logg(`Tankbilen står ${meter(b.meter)} mot ${b.retning} for leiren (merket i kartet). Kom dit med en tropp innen to døgn og ta dieselen.`); }); }
      else if (v.id === 'fots') { const p = sendUt('tankbil', 'frakt'); t = p ? `${og(p.navn.map(fornavn))} går til fots mot tankbilen med kanner. De er tilbake i morgen tidlig.` : 'Det var ingen ledige å sende.'; }
      else t = 'Dere lar tankbilen stå.'; }
    else if (st.id === 'vern') { if (v.id === 'betal') { const SS = rot.SpilletSpill, T = SS && SS.T ? SS.T() : null;
        if (!T || T.aktiv) t = 'Røverne angriper alt – det er for sent å forhandle.';
        else if (!OppstartSpill.betal(v.pris)) t = `Ikke nok penger (${kr(v.pris)}).`;
        else { utsett(T); S.vernTil = T.nesteSpill; S.planer.push({ id: 'vern', folk: [], bølge: T.bølge || 0 }); t = `Dere betalte røverne ${kr(v.pris)}. Neste angrep kommer et døgn senere enn ventet.`; } }
      else { f.moral = Math.min(100, f.moral + R.vern.nektMoral); t = 'Dere nektet å betale røverne. Folk er stolte av det.'; } }
    else if (st.id === 'karavane') { if (v.id === 'kjøp') { if (!OppstartSpill.betal(v.pris)) t = `Ikke nok penger (${kr(v.pris)}).`;
        else { const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), ønsket = v.diesel === undefined ? R.karavane.diesel : v.diesel, d = Math.min(ønsket, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d; f.mat += R.karavane.mat;
          t = `Kjøpte ${R.karavane.mat} rasjoner${d ? ` og ${d} l diesel` : ''} av karavanen for ${kr(v.pris)}.` + (d < ønsket ? ` ${ønsket - d} l fikk ikke plass i tanken.` : ''); } }
      else if (v.id === 'selg') { const m = v.mengde || R.karavane.tre; if ((l.lager.tre || 0) < m) t = 'Dere har ikke nok tre lenger.'; else { l.lager.tre -= m; OppstartSpill.gi(v.pris); t = `Solgte ${m} m³ tre til karavanen for ${kr(v.pris)}.`; } }
      else t = 'Ingen handel i dag. Karavanen drar videre.'; }
    // RUNDE 13: handelsmannen – en avtale med tidsfrist: han kommer kl. 14 i dag (handelSteg i KROKER.sim)
    else if (st.id === 'handel') { if (v.id === 'nei') t = 'Dere handler ikke med handelsmannen. Han kjører forbi.';
      else { S.handel = { kl: (dag(tid) - 1) * 1440 + R.handel.timer * 60, vare: v.id, mengde: v.mengde, pris: v.pris };
        t = v.id === 'tre' ? `Avtalt: handelsmannen henter ${v.mengde} m³ tre kl. ${String(6 + R.handel.timer).padStart(2, '0')} og betaler ${kr(v.pris)}. La treet ligge på lageret til da.`
          : `Avtalt: handelsmannen henter ${v.mengde} l diesel kl. ${String(6 + R.handel.timer).padStart(2, '0')} og betaler ${kr(v.pris)}. La dieselen stå på tanken til da.`; } }
    return t; }
  // handelsmannen kommer: han tar det som er avtalt, eller det som er igjen (og betaler for det)
  function handelSteg() { const h = S && S.handel; if (!klar || !h || tid < h.kl) return; const l = L(); if (!l) return; S.handel = null;
    const har = h.vare === 'tre' ? Math.floor(l.lager.tre || 0) : Math.floor(l.drivstoff || 0), m = Math.min(h.mengde, har), enh = h.vare === 'tre' ? ' m³ tre' : ' l diesel';
    let t; if (m < 1) t = `Handelsmannen kom kl. ${String(6 + R.handel.timer).padStart(2, '0')}, men dere hadde ikke ${h.vare === 'tre' ? 'treet' : 'dieselen'} lenger. Han dro tomhendt.`;
    else { const p = Math.round(h.pris * m / h.mengde / 1e4) * 1e4; if (h.vare === 'tre') l.lager.tre -= m; else l.drivstoff -= m; OppstartSpill.gi(p);
      t = `Handelsmannen kom og kjøpte ${m}${enh} for ${kr(p)}.` + (m < h.mengde ? ` Avtalen var ${h.mengde}${enh} – resten var brukt.` : ''); }
    logg(t); if (rot.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(t); lagre(); lagreLeir(); }
  KROKER.sim.push(handelSteg);
  // beskyttelsen: neste bølge et døgn senere (og like lenge i ekte tid – bølgene kommer også etter ekte minutter med spilling)
  function utsett(T) { T.nesteSpill = (Number.isFinite(T.nesteSpill) ? T.nesteSpill : tid) + R.vern.utsett; if (Number.isFinite(T.nesteEkte)) T.nesteEkte += R.vern.utsettEkte * 60; }

  // ---------- kortet ----------
  const css = document.createElement('style');
  css.textContent = `#morgenkort{ position:fixed; left:50%; transform:translateX(-50%); top:14%; z-index:13; display:none; width:min(500px,92vw); max-height:calc(86vh - 70px); overflow-y:auto; box-sizing:border-box; padding:14px 16px;
  background-color:#1c170f; background-image:linear-gradient(var(--panel,#1c170f), var(--panel,#1c170f)); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); box-shadow:0 8px 30px rgba(0,0,0,.6); overscroll-behavior:contain; }
#morgenkort.på{ display:block; } body.angrepvent #morgenkort.på{ display:none; }
#morgenkort h3{ margin:0 0 6px; font-size:17px; color:#f0d79a; } #morgenkort h3 small{ font-weight:400; color:var(--ink-dim,#a99); font-size:13px; }
#morgenkort .mrapport{ font-size:13px; line-height:1.4; color:var(--ink-dim,#b5a888); border-left:2px solid #4a4030; padding:2px 0 2px 8px; margin:0 0 8px; }
#morgenkort .mrapport p{ margin:0 0 3px; } #morgenkort .mrapport .igaar{ color:#d9e6c2; } #morgenkort .mrapport .mtapt, #morgenkort .msum span.mtapt{ color:#ffb49a; }
body.kort #morgenkort .mraid{ margin:0 0 5px; padding:4px 8px; font-size:13.5px; }
#morgenkort .mraid{ margin:0 0 8px; padding:6px 9px; background:#2a120d; border:1px solid #e0714f; color:#ffd2c0; font-weight:600; font-size:14px; line-height:1.35; }
#morgenkort .msp{ margin:6px 0 4px; font-weight:600; }
#morgenkort button{ display:block; width:100%; margin-top:6px; min-height:44px; background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); font:inherit; cursor:pointer; text-align:left; padding:6px 12px; }
#morgenkort button:hover{ border-color:#c9b26a; } #morgenkort button b{ display:block; font-weight:600; } #morgenkort button small{ display:block; color:var(--ink-dim,#b5a888); font-size:12.5px; line-height:1.3; margin-top:2px; }
#morgenkort button.mingen{ min-height:38px; text-align:center; background:none; color:var(--ink-dim,#b5a888); }
#morgenkort .mstor{ border:1px solid #8a6a2a; background:rgba(80,60,20,.25); padding:8px 10px; margin:8px 0 2px; }
#morgenkort .mstor p{ margin:0 0 4px; line-height:1.35; }
#morgenkort button[data-tast]{ position:relative; padding-right:34px; } body:not(.kort) #morgenkort button[data-tast]::after{ content:attr(data-tast); position:absolute; right:10px; top:8px; min-width:18px; height:18px; line-height:18px; text-align:center; font-size:12px; border:1px solid #6a5a3a; border-radius:3px; color:var(--ink-dim,#b5a888); }
body.kort #morgenkort button[data-tast]{ padding-right:10px; }
body.kort #morgenkort{ top:calc(var(--topp,44px) + 6px); max-height:calc(100vh - var(--topp,44px) - 76px - env(safe-area-inset-bottom,0px)); padding:10px 12px; }
body.kort #morgenkort .mrapport{ font-size:12.5px; } body.kort:has(#morgenkort.på) #logg{ visibility:hidden; } body.kort #morgenkort button{ min-height:42px; padding:5px 10px; }
/* RUNDE 13 (kritiker G, liggende telefon: bare første valg syntes): rapporten foldes sammen til én linje når kortet ellers blir for høyt
   («Vis hele døgnet ›»), og på små skjermer står valgene i to kolonner med følgene på høyst to linjer */
#morgenkort .msum{ display:none; margin:0 0 6px; font-size:13px; line-height:1.35; color:var(--ink-dim,#b5a888); border-left:2px solid #4a4030; padding:1px 0 1px 8px; }
#morgenkort .msum span{ display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } #morgenkort .msum span.igaar{ color:#d9e6c2; }
#morgenkort.foldet .msum{ display:flex; align-items:center; gap:8px; } #morgenkort.foldet .msum span{ flex:1 1 auto; min-width:0; } #morgenkort.foldet .mrapport.mdogn{ display:none; }
#morgenkort button.mfold{ display:inline-block; width:auto; min-height:28px; margin:0; padding:2px 8px; flex:none; text-align:center; font-size:12.5px; background:none; border-color:#6a5a3a; color:#f0d79a; }
#morgenkort .mfoldav{ margin:-4px 0 6px; } #morgenkort .mfoldav button.mfold{ min-height:26px; }
body.kort #morgenkort{ width:min(760px,94vw); } body.kort #morgenkort .mvalg{ display:grid; grid-template-columns:1fr 1fr; gap:6px; } body.kort #morgenkort .mvalg button{ margin-top:0; }
body.kort #morgenkort .mvalg button small{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
body.kort #morgenkort .mvalg button.mingen{ min-height:34px; } body.kort #morgenkort .mvalg button.mingen:nth-child(odd){ grid-column:1 / -1; }
body.kort #morgenkort h3{ font-size:15.5px; margin-bottom:4px; } body.kort #morgenkort .mstor{ padding:6px 10px; margin:6px 0; } body.kort #morgenkort .mstor p{ font-size:13.5px; margin:0; } body.kort #morgenkort .msp{ margin:4px 0 4px; }`;
  document.head.appendChild(css);
  const kort = el('div', { id: 'morgenkort', role: 'dialog', 'aria-label': 'Morgenmøtet' }); document.body.appendChild(kort);
  let vistNøkkel = '';
  const knappEl = (t, s, f, klasse) => { const b = el('button', { type: 'button', ...(klasse ? { klasse } : {}) }, el('b', {}, t), s ? el('small', {}, s) : null); if (klasse) b.className = klasse; b.onclick = f; return b; };
  function lukk() { const var_ = kort.classList.contains('på'); kort.classList.remove('på'); vistNøkkel = ''; if (rot.Kortkø && Kortkø.ferdig) Kortkø.ferdig('morgenkort'); if (var_) etterSvar(); }
  // RUNDE 13 (kritiker G: ⏭ spolte 06:00 → 06:33 mens møtet ventet på svar): mens kortet står oppe, stoppes ⏭ og fartsknappene før de virker
  // (før fanget pausereglene det opp først etter et øyeblikk, og ⏭ så ikke møtet som et kort). Farten du trykket, gjelder når du har svart.
  let ønsketFart = null;
  const FARTKNAPPER = ['nesteh', 'sp1', 'sp2', 'sp3', 'sp4'];
  document.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest(FARTKNAPPER.map(id => '#' + id).join(',')) : null;
    if (!b || !auto() || !kort.classList.contains('på') || !kort.getClientRects().length) return;
    e.preventDefault(); e.stopImmediatePropagation(); ønsketFart = b.id;
    const m = document.getElementById('kortpause'); if (m) { m.classList.remove('blink'); void m.offsetWidth; m.classList.add('blink'); }
    if (typeof tempo !== 'undefined' && tempo > 0) { const p = document.getElementById('sp0'); if (p) p.click(); } }, true);
  function etterSvar() { const id = ønsketFart; ønsketFart = null; if (!id || !auto()) return;
    // pausereglene (skjermlag.js) starter farten fra før kortet; den du trykket mens kortet sto, tar over litt etter
    setTimeout(() => { if (kort.classList.contains('på')) return; const b = document.getElementById(id); if (b) b.click(); }, 250); }
  function vis() {
    const K = S && S.kort; if (!K || K.ferdig) { lukk(); return; }
    // én kortkø for alle kortene med valg: står et annet kort oppe, venter morgenmøtet (det haster: dagen er i gang)
    if (rot.Kortkø && Kortkø.ta && !Kortkø.ta('morgenkort', true, vis)) { kort.classList.remove('på'); vistNøkkel = ''; Kortkø.be('morgenkort', vis, { tittel: 'Morgenmøtet' }); return; }
    const nøkkel = JSON.stringify([K.dag, K.steg, K.valgt]); if (nøkkel === vistNøkkel && kort.classList.contains('på')) return; vistNøkkel = nøkkel;
    kort.replaceChildren(el('h3', {}, 'Morgenmøtet ', el('small', {}, `· dag ${K.dag}`)));
    // RUNDE 14 (kritiker I): røverne står i første linje – med samme tid som varselet – og «Forsvar leiren nå» er første valg
    const rd = raidNå(); if (rd) kort.append(el('div', { klasse: 'mraid', id: 'morgenraid' }, '⚠ ' + rd.tekst));
    if (rd && !rd.satt && (rd.aktiv || rd.min <= R.raid.forsvar) && K.steg === 0 && !K.valg.some(v => v.id === 'forsvar'))
      K.valg.unshift({ id: 'forsvar', t: 'Forsvar leiren nå', følge: `Alle lag innen 3 km går i stilling mot røverne og graver seg ned. Folk på vakt blir Leirvakta. ${rd.aktiv ? 'Røverne angriper nå.' : 'Røverne kommer om ' + rd.nedtelling + '.'}` });
    // RUNDE 13: hele døgnet (.mdogn) og én linje (.msum) med det viktigste: tapene, ellers det første «I går», ellers første linje
    const rap = K.steg === 0 ? (K.rapport || []) : [];
    if (rap.length) { const sum = rap.find(r => /^Tapt siden/.test(r)) || rap.find(r => /^Tap i lagene/.test(r)) || rap.find(r => /^I går/.test(r)) || rap[0], b = knappEl('Vis hele døgnet ›', '', () => fold(false), 'mfold');
      b.querySelector('b').style.display = 'inline'; kort.append(el('div', { klasse: 'msum' }, el('span', { klasse: /^Tapt siden/.test(sum) ? 'mtapt' : /^I går/.test(sum) ? 'igaar' : '' }, sum), b));
      kort.append(el('div', { klasse: 'mrapport mdogn' }, ...rap.map(r => el('p', { klasse: /^Tapt siden/.test(r) ? 'mtapt' : /^I går|^Tap i lagene/.test(r) ? 'igaar' : '' }, r)))); }
    const valg = el('div', { klasse: 'mvalg' });
    if (K.steg === 0) {
      kort.append(el('div', { klasse: 'msp' }, K.valg.length ? 'Hva gjør dere i dag?' : 'Ingenting som haster i dag.'));
      // RUNDE 14: på små skjermer (liggende telefon) står høyst tre valg, så «Ingen endring i dag» får den fjerde ruta uten rulling
      const vis3 = document.body.classList.contains('kort') ? 3 : K.valg.length;
      K.valg.slice(0, vis3).forEach((v, i) => { const b = knappEl(v.t, v.følge, () => velg(i)); b.setAttribute('data-tast', String(i + 1)); valg.append(b); });
      valg.append(knappEl(K.valg.length ? 'Ingen endring i dag' : 'Videre', '', () => velg(-1), 'mingen'));
    } else {
      const st = K.stor; if (K.valgt) kort.append(el('div', { klasse: 'mrapport' }, el('p', { klasse: 'igaar' }, 'I dag: ' + K.valgt)));
      kort.append(el('div', { klasse: 'mstor' }, el('h3', {}, 'Viktig beslutning: ' + st.tittel), el('p', {}, st.tekst)));
      st.valg.forEach((v, i) => { const b = knappEl(v.t, v.følge, () => velgStor(i)); b.setAttribute('data-tast', String(i + 1)); valg.append(b); });
    }
    kort.append(valg);
    kort.classList.remove('foldet'); kort.classList.add('på'); kort.scrollTop = 0;
    // foldes bare når kortet ellers må rulles (PC med god plass: alt står som før); er kortet skjult nå (angrep), sjekkes det når det synes
    foldSjekk = rap.length > 0; sjekkFold();
  }
  let foldSjekk = false;
  function sjekkFold() { if (!foldSjekk || !kort.classList.contains('på') || !kort.getClientRects().length || kort.clientHeight < 20) return; foldSjekk = false;
    if (!kort.classList.contains('foldet') && kort.scrollHeight > kort.clientHeight + 2) fold(true); }
  rot.addEventListener('resize', () => { if (kort.classList.contains('på') && kort.querySelector('.msum')) { foldSjekk = true; if (!kort.classList.contains('foldet')) setTimeout(sjekkFold, 50); } });
  function fold(på) { kort.classList.toggle('foldet', på); const av = kort.querySelector('.mfoldav'); if (av) av.remove();
    if (!på) { const b = knappEl('‹ Vis mindre', '', () => fold(true), 'mfold'); b.querySelector('b').style.display = 'inline'; const d = kort.querySelector('.mdogn'); if (d) d.after(el('div', { klasse: 'mfoldav' }, b)); }
    kort.scrollTop = 0; }
  function velg(i) { const K = S.kort; if (!K || K.steg !== 0) return; const v = i >= 0 ? K.valg[i] : null; let t = '';
    if (v) { t = brukDag(v); logg('Morgenmøtet: ' + t); } else t = 'Ingen endring i dag.';
    S.sistValg = v ? v.id : 'ingen'; K.valgt = t;
    if (K.stor) K.steg = 1; else K.ferdig = true;
    lagre(); lagreLeir(); vis(); }
  function velgStor(i) { const K = S.kort; if (!K || K.steg !== 1) return; const v = K.stor.valg[i]; const t = brukStor(K.stor, v); logg(K.stor.tittel + ': ' + t);
    S.storSist = K.dag; S.storId = K.stor.id; (S.storHist = S.storHist || {})[K.stor.id] = K.dag; K.ferdig = true; lagre(); lagreLeir(); vis(); }

  // PC: tastene 1–3 velger på kortet (fanges før hurtigtastene, så «3» ikke slår på 3D mens kortet står oppe; ikke mens du går eller skriver)
  rot.addEventListener('keydown', e => { if (!kort.classList.contains('på') || !kort.getClientRects().length || e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target, skriver = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); if (skriver || (typeof R3 !== 'undefined' && R3 && R3.fot)) return;
    const b = kort.querySelector(`button[data-tast="${e.key}"]`); if (!b) return; e.preventDefault(); e.stopImmediatePropagation(); b.click(); }, true);

  // ---------- ny morgen ----------
  function snapOppgjør() { try { return rot.OppgjorSpill && OppgjorSpill.bilde ? OppgjorSpill.bilde() : null; } catch (e) { return null; } }
  // morgen(tving, o): gårsdagens planer kommer hjem og gir rapporten; så et nytt kort (o.stor = id tvinger en stor beslutning – vakta)
  // RUNDE 13 (kritiker H): aldri samme dag to ganger og aldri bakover (Morgen.nyDag) – klokka kan stå litt før møtet etter en omlasting
  function morgen(tving, o = {}) {
    if (!klar || !S) return null; const d = dag(tid); if (!tving && !M.nyDag(d, S.dag)) return null;
    S.planer2 = []; S.effekter = [];
    const igår = hjem(); S.planer = S.planer2; delete S.planer2; S.dag = Number.isFinite(S.dag) ? Math.max(S.dag, d) : d;
    // tapene i lagene siden forrige morgen (tapSteg), med navn
    const tap = M.tapTekst(S.tap || []); S.tap = [];
    // RUNDE 14: tapte tettsteder og tropper står i rapporten; valgene som gir soldater, ser på dem (situasjon), så de nullstilles etter kortet
    const tb = (S.taptBy || []).map(b => b.navn + (b.eier ? ` (nå ${eieform(b.eier)})` : '')), tl = S.taptLag || [];
    const taptTekst = tb.length || tl.length ? 'Tapt siden i går: ' + [tb.length ? (tb.length > 1 ? 'tettstedene ' : 'tettstedet ') + og(tb) : '', tl.length ? og(tl) + ' er slått ut' : ''].filter(Boolean).join('. ') + '. Se valgene under for flere soldater.' : null;
    // et kort som aldri ble besvart (spilleren lukket ikke), regnes som «ingen endring»
    if (S.kort && !S.kort.ferdig) { S.kort.ferdig = true; lukk(); }
    // dagbokas rapport for i dag (før gårsdagens utfall skrives inn i dagboka)
    const db = rot.DagbokSpill && DagbokSpill.siste ? DagbokSpill.siste() : null;
    for (const t of igår) { logg('Morgenmøtet: ' + t); if (rot.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(t); }
    const nå = snapOppgjør(); let oppgjør = null; try { if (S.oppFør && nå && rot.Oppgjor) { const r = Oppgjor.tekst(S.oppFør, nå); oppgjør = r ? r.tekst : null; } } catch (e) { oppgjør = null; } S.oppFør = nå;
    if (!(auto() || tving)) { lagre(); return { igår }; }
    const s = situasjon(); if (!s || !s.folk) { lagre(); return { igår }; }
    const rapport = [];
    // døgnoppgjøret ser ikke alltid tapene ute (det sa «Et rolig døgn» samme døgn som en falt): da tas «rolig» bort, og tapene står med navn
    // og tallene på sårede/falne står ikke to ganger (navnene står i linja over)
    if ((tap || taptTekst) && oppgjør) oppgjør = oppgjør.replace(/^Siste døgn: Et rolig døgn\.\s*/, '').replace(/(\d+ (ny såret|nye sårede)(, \d+ falt)?|\d+ falt)\.\s*/, '').replace(/^Siste døgn:\s*$/, '').trim() || null;
    if (taptTekst) rapport.push(taptTekst); if (db) rapport.push(db); if (tap) rapport.push(tap); if (oppgjør) rapport.push(oppgjør); for (const t of igår) rapport.push('I går: ' + t);
    S.storHist = S.storHist || {};
    let stor = null; if (o.stor || M.erStorDag(d, S.storSist)) { stor = M.storBeslutning(s, tilfV, S.storId, S.storHist); if (o.stor) { for (let k = 0; k < 60 && (!stor || stor.id !== o.stor); k++) stor = M.storBeslutning(s, tilfV, null); if (stor && stor.id !== o.stor) stor = null; } }
    S.kort = { dag: d, rapport, valg: M.dagensValg(s, tilfV).map(v => ({ ...v, vekt: undefined })), stor, steg: 0, valgt: '', ferdig: false };
    S.taptBy = []; S.taptLag = [];
    lagre(); vistNøkkel = ''; vis(); return { igår, kort: S.kort };
  }
  KROKER.sim.push(() => { if (klar && S && M.nyDag(dag(tid), S.dag)) morgen(false); });

  // ---------- RUNDE 13: tap i lagene (kritiker H: «Et rolig døgn» samme døgn som en fra Vaktlaget falt og lagføreren ble såret) ----------
  // Hver halve sekund: hvem i egne lag (også leirvakta) som har falt (hp til 0) eller blitt såret (fra frisk til under 1) siden sist. Lista
  // begynner først TAP_VENT ms etter start, så det lagrede spillet (lagring.js setter helsa tilbake) ikke regnes som nye tap. Claudes tall.
  const TAP_VENT = 4000; let tapKart = null, tapSist = 0, tapFra = 0, lagKart = null, byKart = null;
  function tapSteg(tving) { const nå = performance.now(); if (!klar || !S || (!tving && (nå < tapFra || nå - tapSist < 500))) return; tapSist = nå;
    const kart = new Map(); let ny = false;
    for (const e of ENHETER) { if (e.side !== 'blå' || e.karakter || !Array.isArray(e.menn)) continue;
      e.menn.forEach((m, i) => { if (!m || !m.navn) return; const k = e.navn + '|' + m.navn; kart.set(k, m.hp); const før = tapKart ? tapKart.get(k) : undefined; if (før === undefined) return;
        const hva = før > 0 && m.hp <= 0 ? 'falt' : før >= 1 && m.hp > 0 && m.hp < 1 ? 'såret' : null;
        if (hva) { (S.tap = S.tap || []).push({ navn: m.navn, lag: e.leirvakt ? 'Leirvakta' : e.navn, hva, fører: (e.leder || 0) === i && e.menn.length > 1 }); ny = true; } }); }
    // RUNDE 14: tapte tropper (alle slått ut eller falt, mens laget fortsatt er i lista) og tapte tettsteder siden forrige morgen
    const lagNå = new Map(); for (const e of ENHETER) if (e.side === 'blå' && !e.karakter && !e.leirvakt && !e.raid && Array.isArray(e.menn) && e.menn.length)
      lagNå.set(e.navn, levende(e) && !(rot.Terreng && Terreng.slattUt && Terreng.slattUt(e.menn)));
    if (lagKart) for (const [n, lev] of lagNå) if (!lev && lagKart.get(n) === true) { (S.taptLag = S.taptLag || []).push(n); ny = true; }
    lagKart = lagNå;
    const byNå = new Map(); if (rot.TETTSTEDER) for (const [id, v] of TETTSTEDER) if (v) byNå.set(id, v.eier || null);
    if (byKart) for (const [id, før] of byKart) { const nå2 = byNå.has(id) ? byNå.get(id) : null; if (før === 'blå' && nå2 !== 'blå') { const t = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted ? INFRA.tettsted.find(q => q.e && q.e.id === id) : null;
      (S.taptBy = S.taptBy || []).push({ navn: t && t.e.navn ? t.e.navn : 'et tettsted', eier: nå2 || null }); ny = true; } }
    byKart = byNå;
    tapKart = kart; if (ny) { if (S.tap && S.tap.length > 60) S.tap.splice(0, S.tap.length - 60); lagre(); } }
  KROKER.sim.push(() => tapSteg(false));

  // ---------- tankbilen: et lite oppdrag i kartet ----------
  const blåNær = (x, y, r) => ENHETER.some(e => e.side === 'blå' && !e.raid && levende(e) && Math.hypot(e.x - x, e.y - y) <= r);
  const røvereVed = b => ENHETER.filter(e => e.tankbil && levende(e) && !(rot.Terreng && Terreng.slattUt && Terreng.slattUt(e.menn)));
  function bortRøvere() { for (let i = ENHETER.length - 1; i >= 0; i--) if (ENHETER[i].tankbil) ENHETER.splice(i, 1); skitten = true; }
  KROKER.sim.push(() => { const b = S && S.tankbil; if (!klar || !b) return;
    if (tid > b.frist) { logg('Tankbilen er borte – noen andre kom først.'); hjemFraTankbil(b); S.tankbil = null; bortRøvere(); lagre(); return; }
    if (b.fare && !b.røvere && blåNær(b.x, b.y, 450) && typeof nyttLag === 'function') { const e = nyttLag('Røvere ved tankbilen', b.x + 110, b.y - 80, 'rød'); e.tankbil = true; if (e.menn.length > R.tankbil.røverMenn) { e.menn = e.menn.slice(0, R.tankbil.røverMenn); e.leder = 0; }
      ENHETER.push(e); b.røvere = true; lagre(); logg('Røvere ved tankbilen! De vil ha dieselen selv.'); skitten = true; }
    if (blåNær(b.x, b.y, 60) && !røvereVed(b).some(e => Math.hypot(e.x - b.x, e.y - b.y) < 250)) { const l = L(), Lb = LB(); if (!l || !Lb) return;
      const plass = Math.max(0, (Lb.kapasitet ? Lb.kapasitet(l) : 0) - (l.drivstoff || 0)), d = Math.min(b.diesel, Math.floor(plass)); l.drivstoff = (l.drivstoff || 0) + d;
      logg(`Tankbilen er tømt: ${d} l diesel er fraktet til leiren.` + (d < b.diesel ? ` ${b.diesel - d} l fikk ikke plass i tanken.` : '')); if (rot.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Hentet ${d} l diesel fra den forlatte tankbilen.`);
      hjemFraTankbil(b); S.tankbil = null; bortRøvere(); lagre(); lagreLeir(); } });
  KROKER.tegn.push((g, vx0, vy1) => { const b = S && S.tankbil; if (!klar || !b || kam.m > 60) return; const x = (b.x - vx0) / kam.m, y = (vy1 - b.y) / kam.m; if (x < -40 || y < -40 || x > VW + 40 || y > VH + 40) return;
    g.save(); g.fillStyle = 'rgba(22,18,12,.85)'; g.strokeStyle = '#f0b04a'; g.lineWidth = 1.8; g.fillRect(x - 11, y - 6, 22, 12); g.strokeRect(x - 11, y - 6, 22, 12); g.beginPath(); g.arc(x - 6, y + 7, 2.6, 0, 6.283); g.arc(x + 6, y + 7, 2.6, 0, 6.283); g.fillStyle = '#f0b04a'; g.fill();
    g.font = '600 13px "Cormorant Garamond", serif'; g.textAlign = 'center'; const t = 'Tankbil (diesel)', ty = rot.Etikett ? Etikett.tekst(g, t, x, y + 24, 1) : y + 24; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(t, x, ty); g.fillStyle = '#f6d28a'; g.fillText(t, x, ty); g.restore(); });
  KROKER.tegn3d.push((g, proj3) => { const b = S && S.tankbil; if (!klar || !b) return; const p = proj3(b.x, b.y); if (!p) return; g.save(); g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; const t = '◆ Tankbil (diesel)';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, p[0], p[1] - 14); g.fillStyle = '#f6d28a'; g.fillText(t, p[0], p[1] - 14); g.restore(); });
  // RUNDE 13: handelsmannen – en brikke med tiden som er igjen, og en linje i Leir → Mål
  const timerIgjen = t => { const m = Math.max(0, Math.round(t - tid)); return m >= 60 ? `${Math.floor(m / 60)} t ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`; };
  function handelLinje() { const h = S.handel; return `Handelsmannen kommer kl. ${String(6 + R.handel.timer).padStart(2, '0')} (om ${timerIgjen(h.kl)}) og henter ${h.mengde} ${h.vare === 'tre' ? 'm³ tre' : 'l diesel'} for ${kr(h.pris)} – ${h.vare === 'tre' ? 'la treet ligge på lageret' : 'la dieselen stå på tanken'}.`; }
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => { const h = S && S.handel; if (!klar || !h) return [];
    return [{ i: 'penger', k: '', t: `Handelsmann kl. ${String(6 + R.handel.timer).padStart(2, '0')}`, s: `henter ${h.mengde} ${h.vare === 'tre' ? 'm³ tre' : 'l diesel'} · om ${timerIgjen(h.kl)}`, f: () => logg(handelLinje()) }]; });
  (rot.VARSEL_TILLEGG = rot.VARSEL_TILLEGG || []).push(() => { const b = S && S.tankbil; if (!klar || !b) return [];
    // (runde 13, pakke «krig», kritiker H: banneret sto som «Send Vaktlaget» også etter at laget var sendt) laget som er sendt, står i banneret
    const på = sendtLag(b); if (på) return [{ i: 'tank', k: '', t: 'Tankbil med diesel', s: påVeiTekst(på, b), f: () => { if (rot.kartTil && !(typeof på3d !== 'undefined' && på3d)) kartTil(b.x, b.y, 4); }, knapp: null }];
    const lag = nesteLag(b); return [{ i: 'tank', k: '', t: 'Tankbil med diesel', s: `${meter(b.meter)} mot ${b.retning} · ${Math.max(1, Math.round((b.frist - tid) / 60))} t igjen`, f: () => { if (rot.kartTil && !(typeof på3d !== 'undefined' && på3d)) kartTil(b.x, b.y, 4); else logg(`Tankbilen står ${meter(b.meter)} mot ${b.retning} for leiren.`); },
      knapp: lag ? { t: `Send ${lag.navn}`, f: () => sendLag(b) } : null }]; });
  // det nærmeste egne laget som kan sendes (ikke deg selv, leirvakta, et lag om bord eller i forsvarsstilling), høyst 30 km unna
  function nesteLag(b) { let best = null, bd = 30000; for (const e of ENHETER) { if (e.side !== 'blå' || e.karakter || e.leirvakt || e.raid || e.ombord || e.forsvar || !levende(e)) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y); if (d < bd) { bd = d; best = e; } } return best; }
  // (runde 13, pakke «krig», kritiker H) samme radiovarsel som i Krig (StrategiSpill.sendTil: med terrenget, og «leiren står uten vakt»),
  // banneret sier «Vaktlaget på vei (1,8 t)», og laget går hjem av seg selv når oppdraget er ferdig (ordren er gitt på forhånd – trenger ikke radio)
  function sendLag(b) { const e = nesteLag(b); if (!e) return logg('Ingen lag kan sendes til tankbilen nå.'); if (typeof ordre !== 'function') return;
    const gå = lag => { if (!S || S.tankbil !== b) return; ordre(lag, b.x, b.y); b.sendt = { navn: lag.navn, t: tid }; lagre(); logg(`${lag.navn} er sendt mot tankbilen (${meter(Math.hypot(lag.x - b.x, lag.y - b.y))}). De går hjem igjen når dieselen er hentet.`); skitten = true; };
    if (rot.StrategiSpill && StrategiSpill.sendTil) StrategiSpill.sendTil(e, { x: b.x, y: b.y, navn: 'tankbilen' }, gå); else gå(e); }
  const sendtLag = b => (b && b.sendt ? ENHETER.find(e => e.side === 'blå' && e.navn === b.sendt.navn && levende(e)) || null : null);
  function påVeiTekst(e, b) { const d = Math.hypot(e.x - b.x, e.y - b.y); if (d <= 80) return `${e.navn} er framme`; if (e.planlegger) return `${e.navn} planlegger ruta`;
    if (e.sti) { const t = Math.max(0, e.timerIgjen || 0); return `${e.navn} på vei (${t < 1 ? Math.max(1, Math.round(t * 60)) + ' min' : String(Math.round(t * 10) / 10).replace('.', ',') + ' t'})`; }
    return `${e.navn} står ${meter(d)} fra tankbilen`; }
  function hjemFraTankbil(b) { const e = sendtLag(b), o = rot.OppstartSpill && OppstartSpill.tilstand(); if (!e || !o || !o.leir || typeof ordre !== 'function') return;
    const v = tilfV() * 6.283; ordre(e, o.leir.x + Math.cos(v) * 30, o.leir.y + Math.sin(v) * 30, true); logg(`${e.navn} går hjem til leiren.`); }

  // ---------- Leir-menyen (fanen Mål): det morgenmøtet bestemte for i dag ----------
  const PLANTEKST = { øv: 'på våpenøvelse', jakt: 'på jakt og fiske', speid: 'på speidertur', leie: 'leid ut som vakter', tankbil: 'til fots mot tankbilen', vakt: 'på dobbel vakt' };
  const EFFTEKST = { fri: 'fridag', skift: 'ekstra skift', rasjon: 'halve rasjoner', sliten: 'slitne etter dobbel vakt' };
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el: e, knapp }) => { if (!klar || !S) return; const linjer = [], f = F();
    for (const p of S.planer || []) if (PLANTEKST[p.id]) { const n = f ? p.folk.map(i => f.personer.find(q => q.id === i)).filter(Boolean).map(q => fornavn(q.navn)) : []; linjer.push(`${og(n) || 'To'} ${PLANTEKST[p.id]} – tilbake i morgen kl. 06.`); }
    const v = virkning(), ef = (S.effekter || []).map(x => EFFTEKST[x.kilde]).filter(Boolean);
    if (ef.length) linjer.push(`I dag: ${ef.join(', ')} (arbeid ×${String(Math.round(v.tempo * 100) / 100).replace('.', ',')}, moral ${v.moral >= 0 ? '+' : ''}${v.moral}${v.mat !== 1 ? ', mat ×' + String(v.mat).replace('.', ',') : ''}).`);
    if (S.handel) linjer.push(handelLinje());
    if (S.tankbil) linjer.push(`Tankbilen venter ${meter(S.tankbil.meter)} mot ${S.tankbil.retning} (${Math.max(1, Math.round((S.tankbil.frist - tid) / 60))} t igjen).`);
    const åpent = S.kort && !S.kort.ferdig; if (!linjer.length && !åpent) return;
    hode.append(e('h3', { 'data-fane': 'mål' }, 'Morgenmøtet')); for (const t of linjer) hode.append(e('div', { klasse: 'dagbok' }, t));
    if (åpent) hode.append(knapp('Vis dagens morgenmøte', () => { vistNøkkel = ''; if (rot.Kortkø && Kortkø.åpent() && Kortkø.åpent() !== 'morgenkort') return logg('Svar på kortet som står oppe først.'); vis(); }, { id: 'morgenvis' })); });

  // ---------- start ----------
  function start() { const s = O(); if (!s || !s.leir) return; leirId = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    let d = null; try { const o = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); d = o && o.leir === leirId ? o.d : null; } catch (e) { d = null; }
    S = d && Number.isFinite(d.dag) ? d : { dag: dag(tid), planer: [], effekter: [], kort: null, storSist: null, storId: null, tankbil: null };
    S.planer = S.planer || []; S.effekter = S.effekter || [];
    // folk som er ute for morgenmøtet, er fortsatt ute etter en omlasting (FolkSpill har lagret p.borte); de uten plan kommer hjem
    const f = F(); if (f) for (const q of f.personer) if (q.morgen && !S.planer.some(p => p.folk && p.folk.includes(q.id))) { if (q.borte === BORTE) delete q.borte; delete q.morgen; }
    // beskyttelsen gjelder etter en omlasting (spillet-visning.js regner neste bølge på nytt ved start)
    const T = rot.SpilletSpill && SpilletSpill.T ? SpilletSpill.T() : null; if (T && S.vernTil && !T.aktiv && Number.isFinite(T.nesteSpill) && T.nesteSpill < S.vernTil) T.nesteSpill = S.vernTil;
    if (!S.oppFør) S.oppFør = snapOppgjør();
    tapKart = null; lagKart = null; byKart = null; tapFra = performance.now() + TAP_VENT;
    klar = true; koblValg(); lagre(); vistNøkkel = ''; if (S.kort && !S.kort.ferdig && auto()) vis(); }
  // kortet følger pausereglene (Skjermlag lastes etter denne fila): pause mens det står oppe, skjult under angrep
  function koblSkjermlag() { const Sk = rot.Skjermlag; if (!Sk || !Sk.KORT) return false; if (!Sk.KORT.includes('morgenkort')) Sk.KORT.push('morgenkort'); if (Sk.VENTER && !Sk.VENTER.includes('morgenkort')) Sk.VENTER.push('morgenkort'); return true; }
  rot.addEventListener('riksbrudd-spill', () => setTimeout(() => { start(); koblSkjermlag(); }, 0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(koblSkjermlag, 0)); else setTimeout(koblSkjermlag, 0);
  // et kort som venter (et annet kort sto oppe), kommer fram straks plassen er ledig; SamfunnSpill kan komme etter oss
  setInterval(() => { if (!klar || !S) return; koblValg(); sjekkFold(); const K = S.kort;
    if (K && !K.ferdig && auto() && !kort.classList.contains('på') && rot.Kortkø && !Kortkø.åpent()) vis();
    // et kort med hastverk fra en annen modul (forræderen) har kommet oppå: morgenmøtet viker og venter
    if (kort.classList.contains('på') && rot.Kortkø) { const a = ['hendelse', 'samfunnkort', 'formkort', 'krigkort'].find(id => { const e = document.getElementById(id); return e && e.classList.contains('på'); });
      if (a) { kort.classList.remove('på'); vistNøkkel = ''; Kortkø.ferdig('morgenkort'); Kortkø.be('morgenkort', vis, { tittel: 'Morgenmøtet', først: true }); } } }, 1000);
  Object.assign(api, { start, morgen, situasjon, vis, velg, velgStor, lukk, tilstand: () => S, virkning, vaktNå, koblSkjermlag, åpen: () => kort.classList.contains('på'),
    tapSteg, handelSteg, fold, foldet: () => kort.classList.contains('foldet'), fartVenter: () => ønsketFart, glemFart: () => { ønsketFart = null; } });
  rot.MorgenSpill = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
