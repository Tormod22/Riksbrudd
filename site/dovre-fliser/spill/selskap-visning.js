'use strict';
/* Riksbrudd – SELSKAPET DITT (W1, 22. nov, R16-D; docs/plan-wardogs.md). Reglene ligger i spill/selskap.js (window.Selskap).
 * Panelet «Selskapet»: navnet og merket fra oppstarten, ryktet (pålitelig, hardhendt, billig) som målere, prisprofilen,
 * kontraktene (ledige og aktive: frist, betaling, krav – Ta, Avslå, Lever, Avbryt) og de to andre selskapene.
 * Åpnes fra kommandolinja nederst (window.KOMMANDO_TILLEGG), fra ☰ («Selskapet», gruppen Oversikt i spill/meny.js) og fra fanen Mål
 * i Leir-menyen. Kontraktene bruker det som finnes i spillet: tettstedene og bruene i INFRA, egne lag (ENHETER), kjøretøy (KJORETOY),
 * leiren (OppstartSpill) og pengene (OppstartSpill.gi / betal). Lagres per leir i localStorage «riksbrudd-selskap» – ikke hos en gjest
 * i flerspiller (window.NETT.gjest). I TESTENE (navigator.webdriver) skjer ingenting av seg selv (nye tilbud hver morgen, de andre
 * selskapene tar tilbud): SelskapSpill.test = true slår det på. Å åpne panelet uten tilbud gir likevel de første tilbudene.
 * Alle tall og tekster her er Claudes forslag.
 */
(function () {
  const SK = window.Selskap; if (!SK || typeof KROKER === 'undefined') return;
  const api = { test: false }, auto = () => !navigator.webdriver || api.test;
  const ID = 'blå', NØKKEL = 'riksbrudd-selskap';
  // de andre selskapene (navnene er Claudes forslag, docs/plan-wardogs.md – besluttet av brukeren 21. nov at de skal hete noe nytt)
  const RIVALER = {
    rød: { navn: 'Ravnsund Sikkerhet', motto: 'Først fram.', farge: '#b0443a',
      omtale: 'Kystselskap med hurtigbåter og pansrede lastebiler. Raske og dyre, og de tar gjerne ryddejobbene for firmaene. Kommer de først, er kontrakten tapt.' },
    grønn: { navn: 'Mosevakt Feltoperasjoner', motto: 'Vi venter.', farge: '#5f8a45',
      omtale: 'Innlandsselskap med skarpskyttere og bakhold i skogen. Billige og tålmodige; bygdene liker dem, og de henter folk som ingen andre tør hente.' },
  };
  const Sp = () => window.OppstartSpill && OppstartSpill.tilstand();
  const kr = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const meter = d => (d >= 1000 ? (Math.round(d / 100) / 10).toString().replace('.', ',') + ' km' : Math.round(d) + ' m');
  const gjest = () => !!(window.NETT && NETT.gjest);
  let S = null, leirId = '', klar = false, åpen = false, sistHtml = '', sistTegn = 0, lagreTid = 0, melding = '';

  // ---------- lagring (per leir, ren JSON) ----------
  function lagre() { if (!S || gjest()) return; try { localStorage.setItem(NØKKEL, SK.tilJSON(S)); } catch (e) { /* fullt eller sperret */ } }
  function les(leir) { try { return SK.fraJSON(localStorage.getItem(NØKKEL) || 'null', leir); } catch (e) { return null; } }

  // ---------- navn og merker ----------
  const fraksjon = () => { const s = Sp(); return s && s.fraksjon ? s.fraksjon : null; };
  function egetNavn() { const f = fraksjon(); return (f && f.navn) || (window.Fraksjoner && Fraksjoner.FRAKSJONER.blå.navn) || 'Ditt selskap'; }
  const navnFor = side => (side === ID ? egetNavn() : RIVALER[side] ? RIVALER[side].navn : side);
  function settNavn() { if (!S) return; S.sider.blå.navn = egetNavn(); for (const s of Object.keys(RIVALER)) S.sider[s].navn = RIVALER[s].navn; }
  // Merket til ditt selskap: skjold i flaggets farger med bokstavene (eller forbokstavene i navnet) – tegnes som SVG her
  function egetMerke(px) {
    const f = fraksjon(), fl = f && f.flagg ? f.flagg : { farger: ['#3f6fb0', '#e9e4d6', '#121417'], symbolfarge: '#d9a441' };
    const hoved = window.Oppstart && Oppstart.hovedfarge ? Oppstart.hovedfarge(fl) : fl.farger[0];
    const bokst = ((fl.bokstaver || '').trim() || egetNavn().split(/\s+/).filter(Boolean).map(o => o[0]).join('').slice(0, 2) || 'DS').toUpperCase().slice(0, 3);
    const aks = fl.symbolfarge || '#d9a441';
    return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 L88 18 V48 C88 72 70 86 50 95 C30 86 12 72 12 48 V18 Z" fill="${esc(hoved)}" stroke="${esc(aks)}" stroke-width="4"/>`
      + `<path d="M50 16 L78 25 V48 C78 66 65 77 50 84 Z" fill="rgba(0,0,0,.18)"/><path d="M22 36 H78" stroke="${esc(aks)}" stroke-width="3" opacity=".8"/>`
      + `<text x="50" y="66" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="700" font-size="${bokst.length > 2 ? 24 : 30}" fill="#f3efe4" letter-spacing="1">${esc(bokst)}</text></svg>`;
  }
  // (R1-løkka, kritikken: «PRIVAT MILITÆRSELSKAP · BLÅ» med lilla flagg) fargen i overskriften er navnet på flaggets hovedfarge
  function fargeNavn(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return '';
    const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, maks = Math.max(r, g, b), min = Math.min(r, g, b), l = (maks + min) / 2, d = maks - min;
    if (d < .12) return l < .2 ? 'svart' : l > .8 ? 'hvit' : 'grå';
    let h = maks === r ? ((g - b) / d) % 6 : maks === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    if (l < .3 && h > 15 && h < 50) return 'brun';
    return h < 15 || h >= 345 ? 'rød' : h < 40 ? 'oransje' : h < 68 ? 'gul' : h < 160 ? 'grønn' : h < 195 ? 'blågrønn' : h < 255 ? 'blå' : h < 295 ? 'lilla' : 'rosa';
  }
  function fargeord() { const f = fraksjon(), fl = f && f.flagg; if (!fl || !fl.farger) return ''; return fargeNavn(window.Oppstart && Oppstart.hovedfarge ? Oppstart.hovedfarge(fl) : fl.farger[0]); }
  // Ravnsund: sittende ravn med tungt nebb over to streker (sundet). Mosevakt: gran i tre lag i et sikte.
  function rivalMerke(side, px) {
    const R = RIVALER[side], f = R.farge;
    if (side === 'rød') return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="${f}"/>`
      + `<path d="M30 62 C30 44 40 32 54 30 L70 26 L62 36 C68 42 70 52 66 62 L74 72 L56 68 L44 72 Z" fill="#121417"/><circle cx="58" cy="36" r="2.6" fill="${f}"/>`
      + `<path d="M24 78 H76 M32 86 H68" stroke="#121417" stroke-width="4" stroke-linecap="round"/></svg>`;
    return `<svg class="smerke" width="${px}" height="${px}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="${f}"/>`
      + `<circle cx="50" cy="50" r="34" fill="none" stroke="#121417" stroke-width="4" stroke-dasharray="44 9.4" transform="rotate(-23 50 50)"/>`
      + `<path d="M50 22 L62 40 H56 L66 54 H58 L70 70 H30 L42 54 H34 L44 40 H38 Z" fill="#121417"/><rect x="47" y="70" width="6" height="9" fill="#121417"/>`
      + `<path d="M50 8 V18 M50 82 V92 M8 50 H18 M82 50 H92" stroke="#121417" stroke-width="3"/></svg>`;
  }

  // ---------- stedene i kartet (tettsteder og bruer fra INFRA) ----------
  let STEDER = null, stederAntall = -1;
  function steder() {
    if (typeof INFRA === 'undefined' || !INFRA) return [];
    const n = (INFRA.tettsted || []).length + (INFRA.bru || []).length; if (STEDER && n === stederAntall) return STEDER;
    const ut = [], sett = new Set(), lov = (x, y) => typeof OMRÅDE_OK !== 'function' || OMRÅDE_OK(x, y);
    for (const o of INFRA.tettsted || []) { if (!o.e || !o.e.navn || !o.bb) continue; const p = typeof navnP === 'function' ? navnP(o) : null;
      const x = p ? p[0] : (o.bb[0] + o.bb[2]) / 2, y = p ? p[1] : (o.bb[1] + o.bb[3]) / 2; if (!lov(x, y)) continue; ut.push({ navn: o.e.navn, x, y, slag: 'tettsted', id: o.e.id, folk: o.e.folk || 0 }); }
    for (const o of INFRA.bru || []) { const nv = o.e && o.e.navn && String(o.e.navn).trim(); if (!nv || sett.has(nv) || !o.deler || !o.deler[0] || !o.deler[0].length) continue;
      const d = o.deler[0], m = d[Math.floor(d.length / 2)], x = o.midt3 ? o.midt3[0] : m[0], y = o.midt3 ? o.midt3[1] : m[1]; if (!lov(x, y)) continue;
      sett.add(nv); ut.push({ navn: /bru/i.test(nv) ? nv : nv + ' bru', x, y, slag: 'bru', id: o.e.id }); }
    STEDER = ut; stederAntall = n; return ut;
  }
  const dagNå = () => Math.floor((6 * 60 + tid) / 1440);
  // prisstigningen i markedet (spill/spillet.js) ganges inn i betalingen (R18-A: markedet følger kontraktene)
  const infl = () => { try { const M = window.SpilletSpill && SpilletSpill.M && SpilletSpill.M(); return M && M.infl > 0 ? M.infl : 1; } catch (e) { return 1; } };
  // (R1-løkka) stedene får eieren med (Garnison), så eskortene ikke går til/fra tettsteder de andre selskapene holder
  const medEier = L => L.map(q => { if (q.eier !== undefined || q.slag !== 'tettsted' || q.id == null || !window.Garnison || typeof TETTSTEDER === 'undefined') return q;
    try { return { ...q, eier: Garnison.tilstand(TETTSTEDER, q.id).eier || null }; } catch (e) { return q; } });
  function nyeTilbud(liste) { if (!S) return []; const n = SK.lagTilbud(S, ID, tid, medEier(liste || steder()), null, { infl: infl() }); lagre(); return n; }

  // ---------- det som legges ut i verden når en kontrakt tas ----------
  const egneLag = () => ENHETER.filter(s => s.side === ID && levende(s) && !s.karakter);
  const fiender = () => ENHETER.filter(s => s.side !== ID && levende(s));
  const bilFor = k => (k.bil ? KJORETOY.find(q => q.navn === k.bil && q.side === ID) : null);
  const sperreFor = k => ENHETER.find(s => s.kontrakt === k.id && s.sperre);
  function lagSperre(k) {
    const p = k.sperre || k.sted, s = nyttLag(`Vegsperre ved ${k.sted.navn}`, p.x, p.y, 'rød');
    // (Claudes forslag) seks mann ved sperra, lett bevæpnet
    s.menn.length = 6; s.sperre = true; s.kontrakt = k.id; s.ingenAI = true;
    try { if (window.Strid && Strid.bevæpn) Strid.bevæpn(s, 'lett'); } catch (e) { /* uten stridsregler */ }
    ENHETER.push(s); return s;
  }
  function lagBil(k) {
    if (!window.Kjoretoy) return null; let nr = 1; while (KJORETOY.some(q => q.navn === `${k.last === 'tankbil' ? 'Tankbil' : 'Lastebil'} ${k.id}${nr > 1 ? '-' + nr : ''}`)) nr++;
    const navn = `${k.last === 'tankbil' ? 'Tankbil' : 'Lastebil'} ${k.id}${nr > 1 ? '-' + nr : ''}`;
    try { const b = Kjoretoy.ny({ navn, type: 'lastebil', antall: 1, x: k.fra.x, y: k.fra.y, side: ID }); b.kontrakt = k.id; KJORETOY.push(b); k.bil = navn; return b; } catch (e) { return null; }
  }
  function rydd(k) {
    for (let i = ENHETER.length - 1; i >= 0; i--) if (ENHETER[i].kontrakt === k.id && (ENHETER[i].sperre || ENHETER[i].angrepslag)) ENHETER.splice(i, 1);
    const b = bilFor(k); if (b) { const i = KJORETOY.indexOf(b); if (i >= 0) KJORETOY.splice(i, 1); }
    skitten = true;
  }

  // ---------- er kravet oppfylt? ----------
  // gir { i, tapt, hentet, andel } til Selskap.steg (se reglene)
  function vurder(k) {
    const N = SK.REGLER.nær, s = Sp(), L = s && s.leir;
    if (k.type === 'eskorte') { const b = bilFor(k); if (!b || !(b.antall >= 1)) return { tapt: true };
      const hele = Math.hypot(k.sted.x - k.fra.x, k.sted.y - k.fra.y) || 1, igjen = Math.hypot(k.sted.x - b.x, k.sted.y - b.y);
      return { i: igjen <= N.fram, andel: Math.max(0, Math.min(1, 1 - igjen / hele)), igjen }; }
    if (k.type === 'hold') { const lag = egneLag().filter(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hold), fi = fiender().some(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hold);
      return { i: lag.length > 0 && !fi, lag: lag.length, fiender: fi }; }
    if (k.type === 'rydd') { const sp = sperreFor(k); return { i: !sp || !levende(sp) }; }
    // forsyning (den første kontrakten, R18-A): et eget lag henter forsyningene ved stedet og tar dem med hjem
    if (k.type === 'forsyning') { let bær = k.bærer ? ENHETER.find(q => q.navn === k.bærer && q.side === ID) : null;
      if (k.hentet && (!bær || !levende(bær))) return { tapt: true };
      // (R1-løkka, kritikken: «har lastet nødlageret (×22)») vurder kalles også av lappen og panelet: hentet settes her, så meldingen kommer én gang
      if (!k.hentet) { const her = egneLag().find(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= SK.REGLER.første.nær); if (her) { k.bærer = her.navn; k.hentet = true; lagre();
        logg(`${her.navn} har lastet nødlageret. Gi troppen ordre hjem til leiren – da betaler ${k.giver.navn}.`); return { hentet: true }; } return {}; }
      return { i: !!(L && bær && Math.hypot(bær.x - L.x, bær.y - L.y) <= N.leir), hentet: true }; }
    // hent: et eget lag henter personen ved stedet og tar vedkommende med hjem
    let bærer = k.bærer ? ENHETER.find(q => q.navn === k.bærer && q.side === ID) : null;
    if (k.hentet && (!bærer || !levende(bærer))) return { tapt: true };
    if (!k.hentet) { const her = egneLag().find(q => Math.hypot(q.x - k.sted.x, q.y - k.sted.y) <= N.hent); if (her) { k.bærer = her.navn; bærer = her; k.hentet = true; lagre();
      logg(`${her.navn} har med seg ${k.person}. Ta vedkommende med til leiren.`); return { hentet: true }; } return {}; }
    return { i: !!(L && bærer && Math.hypot(bærer.x - L.x, bærer.y - L.y) <= N.leir), hentet: true };
  }
  function klarTilLevering(k) { if (k.type === 'hold') return k.framdrift >= k.hold * 60; const v = vurder(k); return !!v.i; }

  // ---------- R18-A: DEN RØDE TRÅDEN ----------
  // det leiren har til kravene i Selskap.kanTa: friske i det største egne laget, og egne kjøretøy uten kontrakt
  // (R1-løkka) med k: også det kjente forsvaret ved stedet (forsvarVed), så kortet bruker samme vurdering som krigskartet
  function har(k) {
    let størsteLag = 0; for (const q of egneLag()) størsteLag = Math.max(størsteLag, q.menn.filter(m => m.hp >= 1).length);
    const kjøretøy = (window.KJORETOY || []).filter(q => q.side !== 'rød' && q.side !== 'grønn' && !q.kontrakt && q.antall >= 1).length;
    const h = { størsteLag, kjøretøy }; if (k) { const f = forsvarVed(k); if (f) { h.forsvar = f.mann; h.forsvarTekst = f.tekst; } }
    return h;
  }
  // Det kjente forsvaret ved kontraktens sted: StrategiSpill.kjentForsvar (fiender dere ser eller nylig så, anslått garnison og
  // bygdevernet) – uten bygdevernet når jobben er for bygda/kommunen der (de slipper dere inn). Gir { mann, tekst } eller null.
  function forsvarVed(k) {
    if (!k || !k.sted || k.type === 'forsyning') return null; const SP = window.StrategiSpill;
    try {
      if (k.sted.slag === 'tettsted' && k.sted.id != null && SP && SP.kjentForsvar) {
        let by = SP.område ? SP.område().find(b => b.id === k.sted.id) : null;
        if (!by && typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) { const o = INFRA.tettsted.find(q => q.e && q.e.id === k.sted.id); if (o) by = { id: o.e.id, navn: o.e.navn, x: k.sted.x, y: k.sted.y, folk: o.e.folk || 0, ref: o }; }
        if (!by) return null; const kf = SP.kjentForsvar(by), egen = k.giver && k.giver.slag !== 'firma' && k.giver.by === k.sted.id;
        const mann = Math.max(0, kf.mann - (egen ? kf.vern : 0)); if (!mann) return null; const d = [];
        if (kf.vern && !egen) d.push(`bygdevernet ${kf.vern}`); if (kf.sett) d.push(`fiender sett ca. ${kf.sett}`); if (kf.anslag) d.push(`garnison ca. ${kf.anslag}`);
        return { mann, tekst: d.join(' + ') }; }
      // bruer og andre steder: fiender dere ser innen 2,5 km
      let m = 0; for (const f of fiender()) { let ser = false; try { ser = synlig(f); } catch (e) { ser = false; } if (ser && Math.hypot(f.x - k.sted.x, f.y - k.sted.y) <= 2500) m += window.Fraksjoner ? Fraksjoner.styrke(f) : 8; }
      return m ? { mann: Math.round(m), tekst: 'fiender sett' } : null;
    } catch (e) { return null; }
  }
  const nivåNå = () => (S ? SK.nivå(S.sider[ID]) : SK.REGLER.NIVÅER[0]);
  // koblingene ved levering: tettsted dere holder (ekstra), nytt nivå, motangrep mot leiren (forsvaret), en ny person vil bli med (folk)
  function kobling(h) {
    const k = h.k;
    try { if (k.sted && k.sted.slag === 'tettsted' && k.sted.id != null && window.Garnison && typeof TETTSTEDER !== 'undefined' && Garnison.tilstand(TETTSTEDER, k.sted.id).eier === ID) {
      const ekstra = Math.round(k.betaling * SK.REGLER.egetSted / 10000) * 10000; if (ekstra > 0) { OppstartSpill.gi(ekstra); logg(`${k.sted.navn} er deres: folket la til ${kr(ekstra)} i dag (engangsbeløp)` + ((t => (t ? `. Deretter gir ${k.sted.navn} ${t} i skatt` : ''))(window.RegionSpill && RegionSpill.inntektTekst ? RegionSpill.inntektTekst(k.sted.id) : '')) + '.'); } } } catch (e) { /* krigskartet er ikke klart */ }
    if (h.nivåOpp) logg(`Nytt nivå for selskapet: ${h.nivåOpp.nr} «${h.nivåOpp.navn}». Større og bedre betalte kontrakter er låst opp.`);
    if (h.rekrutt && auto()) { try { const F = window.FolkSpill && FolkSpill.tilstand(), Lr = window.LeirSpill && LeirSpill.tilstand();
      if (F && Lr && window.FolkRegler) { const r = FolkRegler.rekrutter(F, Lr, () => true); if (!r.feil && r.person) logg(`${r.person.navn} (${r.person.yrke}) hørte om ${egetNavn()} og vil bli med – gratis.`); } } catch (e) { /* uten folk */ } }
    if (h.motangrep && auto() && window.SpilletSpill && SpilletSpill.angrep) {
      try { const T = SpilletSpill.T && SpilletSpill.T(); if (!(T && T.aktiv)) { logg(`Noen vil ha hevn for «${k.tittel}»: røvere er på vei mot leiren.`); SpilletSpill.angrep(); } } catch (e) { /* uten angrep */ } }
    if (k.første) { nyeTilbud(); logg('Nye kontrakter står i Selskapet. De større krever bedre rykte, kjøretøy eller sterkere lag.'); }
  }
  const førsteK = () => (S && S.tråd ? (S.tilbud.find(q => q.id === S.tråd.k) || S.sider[ID].aktive.find(q => q.id === S.tråd.k) || S.sider[ID].ferdige.find(q => q.id === S.tråd.k)) : null);
  // øyeblikksbildet til Selskap.oppdaterTråd
  function trådBilde() {
    const k = førsteK(), sd = S.sider[ID], Lr = window.LeirSpill && LeirSpill.tilstand();
    return { tatt: !!k && k.status !== 'tilbud', tropper: egneLag().filter(q => q.fraFolk).length, framme: !!(k && k.hentet), levert: !!(k && k.status === 'levert'),
      brutt: !!(k && (k.status === 'brutt' || k.status === 'tapt')) || (!k && !!S.tråd), bygg: Lr && Lr.bygg ? Lr.bygg.length : 0,
      nyKontrakt: sd.aktive.some(q => !q.første) || sd.ferdige.some(q => !q.første) };
  }
  function tråd() {
    if (!S || !S.tråd || S.tråd.slutt) return; const nye = SK.oppdaterTråd(S, trådBilde()); if (!nye.length) return; lagre();
    const st = SK.trådSteg(S), k = førsteK();
    // (R1-løkka) etter et brudd står det hva som skjedde (steget «neste» sier det, og brudd-meldingen i loggen) – ingen «fullført»
    if (st && k && !navigator.webdriver && !(S.tråd.brutt && st.id === 'neste')) logg(`Kontrakten: ${st.tekst(k, knappFor())}`);
    if (!st) logg(S.tråd.brutt ? 'Ny kontrakt tatt. Fra nå av er det Selskapet som gir dere arbeid – ryktet låser opp større kontrakter.'
      : 'Første kontrakt er fullført. Fra nå av er det Selskapet som gir dere arbeid – ryktet låser opp større kontrakter.');
  }
  // (R1-løkka, kritikken: «trykk «Marsjer»» når knappen heter «Kjør dit») navnet på knappen den nærmeste egne troppen har nå (index.html)
  function knappFor() { const t = egneLag().filter(q => q.fraFolk); const s = (typeof valgt !== 'undefined' && valgt && t.includes(valgt)) ? valgt : t[0]; return { knapp: s && s.ombord ? 'Kjør dit' : 'Marsjer' }; }
  const trådAktiv = () => !!(klar && S && S.tråd && !S.tråd.slutt && SK.trådSteg(S));
  // hva «Neste»-lappen sier: { tekst, pek, k } – tråden først, så den aktive kontrakten med kortest frist, så ledige tilbud
  function lapp() {
    if (!klar || !S) return null; const st = SK.trådSteg(S), fk = førsteK();
    if (st && fk) return { tekst: st.lapp(fk), pek: st.id === 'send' || st.id === 'hjem' ? 'kart' : st.pek, k: fk, steg: st.id, hjelp: st.tekst(fk, knappFor()) };
    const ak = S.sider[ID].aktive.slice().sort((a, b) => a.frist - b.frist)[0];
    if (ak) { const v = vurder(ak); return { tekst: SK.lappFor(ak, v, tid) + ' · ' + SK.fristTekst(ak, tid), pek: klarTilLevering(ak) ? 'selskap' : 'kart', k: ak, hjelp: SK.kravTekst(ak) }; }
    const n = S.tilbud.filter(q => SK.kanTa(q, har(), S.sider[ID]).ok).length;
    return { tekst: n ? `Velg en kontrakt i Selskapet (${n} ledig${n === 1 ? '' : 'e'})` : 'Ingen kontrakter nå – nye tilbud kommer i morgen tidlig', pek: 'selskap', k: null };
  }
  // trykk på lappen: gjør det som står (åpner panelet, Tropper, Leir – eller viser stedet og velger laget)
  function følgLapp() {
    const l = lapp(); if (!l) return;
    if (l.pek === 'selskap') { vis(true); return; }
    if (l.pek === 'tropper') { if (window.TropperSpill && TropperSpill.åpne) TropperSpill.åpne(); return; }
    if (l.pek === 'leir') { const b = document.getElementById('leirknapp'); if (b) b.click(); return; }
    const k = l.k; if (!k) return; let p = k.sted;
    if (k.type === 'rydd' && k.sperre) p = k.sperre; else if (k.type === 'eskorte' && bilFor(k)) p = bilFor(k);
    const bær = k.bærer ? ENHETER.find(q => q.navn === k.bærer && q.side === ID && levende(q)) : null;
    // tråden: velg troppen så «Marsjer» ligger klar
    const lag = bær || egneLag().filter(q => q.fraFolk).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || null;
    if ((k.hentet || l.steg === 'hjem') && Sp() && Sp().leir) p = Sp().leir;
    gåTil(p.x, p.y);
    if (lag) try { valgt = lag; if (typeof visPanel === 'function') visPanel(); } catch (e) { /* uten valg */ }
  }

  // ---------- hendelsene fra reglene: penger, logg, ting som ryddes ----------
  function hendelser(ut) {
    for (const h of ut) {
      const k = h.k;
      if (h.type === 'levert') { if (window.OppstartSpill) OppstartSpill.gi(h.kr); logg(`Kontrakt levert: ${k.tittel}. ${k.giver.navn} betalte ${kr(h.kr)}.`); rydd(k); kobling(h); levertØyeblikk(k, h.kr);
        try { window.dispatchEvent(new CustomEvent('riksbrudd-kontrakt', { detail: { type: 'levert', id: k.id, kr: h.kr } })); } catch (e) { /* gammel nettleser */ } }
      else if (h.type === 'brutt') { const bot = Math.min(h.kr || 0, (Sp() && Sp().penger) || 0); if (bot > 0) OppstartSpill.betal(bot);
        const grunn = SK.bruttTekst(k) || (h.grunn === 'frist' ? 'fristen gikk ut' : 'dere avbrøt den');
        // (R1-løkka, kritikken: tre motstridende meldinger etter et brudd) den første kontrakten: ingen bot, og nye tilbud straks
        if (k.første) { logg(h.grunn === 'avbrutt' ? `Dere ga opp den første kontrakten: ${k.tittel}. Det koster ingenting – ingen bot og ingen ripe i ryktet.` : `Kontrakt brutt (${grunn}): ${k.tittel}. Ingen bot for den første jobben, men ryktet fikk en ripe.`); rydd(k); const n = nyeTilbud();
          logg(n.length ? `${n.length} nye kontrakter står i Selskapet. Velg en dere har det som trengs til, og send et lag som er sterkt nok.` : 'Nye kontrakter kommer i morgen tidlig. Bygg opp leiren og troppene imens.'); }
        else { logg(`Kontrakt brutt (${grunn}): ${k.tittel}. Bot ${kr(bot)}.`); rydd(k); } }
      else if (h.type === 'rivalFørst') { logg(`${navnFor(h.rival)} kom først: ${k.tittel}. Kontrakten er tapt, men uten bot.`); rydd(k); }
      else if (h.type === 'angrep') { const b = bilFor(k); if (b) {
        // (R2-løkka 26. nov, kritikken: «bilen ble meldt angrepet, men kontrakten ble levert uten at noe skjedde – ordet eskorte betyr
        // ingenting») bakholdet ligger FORAN bilen langs ruta (Claudes forslag: 60 % av det som er igjen, høyst 900 m, 90 m til siden), seks
        // bevæpnede mann som venter i stilling og skyter på bilen når den kommer (enheter-visning.js: lag skyter på kjøretøy innen 600 m).
        // Et lag om bord eller i forkant kan slå dem ut; uten eskorte kan bilen gå tapt – og da er kontrakten brutt.
        const dx = k.sted.x - b.x, dy = k.sted.y - b.y, d = Math.hypot(dx, dy) || 1, fram = Math.min(900, d * .6), side = ((window.Tilfeldig ? Tilfeldig.verden() : .5) < .5 ? -1 : 1) * 90;
        const ax = b.x + dx / d * fram - dy / d * side, ay = b.y + dy / d * fram + dx / d * side, a = nyttLag(`${navnFor(h.rival)}, bakhold`, ax, ay, h.rival);
        a.menn.length = 6; a.angrepslag = true; a.kontrakt = k.id; a.ingenAI = true; a.født = tid; try { if (window.Strid && Strid.bevæpn) Strid.bevæpn(a, 'lett'); } catch (e) { /* uten stridsregler */ } ENHETER.push(a);
        logg(`${navnFor(h.rival)} ligger i bakhold ${meter(fram)} foran ${k.bil}! Send et lag for å rydde vegen, eller kjør en annen veg – uten eskorte kan bilen gå tapt.`); } }
      else if (h.type === 'rivalTok') { /* stille: står i oversikten */ }
    }
    if (ut.length) { lagre(); skitten = true; }
  }

  // ---------- LEVERINGSØYEBLIKKET (R2-løkka 26. nov, kritikken: «leveringen av den første kontrakten (1,5 mill.) skjer stille – bare
  // Neste-lappen skifter») ----------
  // Et lite kort øverst i kartet i ca. 14 sekunder (spillet går videre): hvem som betalte, hva det betyr, og hva neste steg er – med en
  // knapp rett dit. Den første kontrakten får hele forklaringen; senere kontrakter et kortere kort. Ikke i testene (auto()).
  const lcss = document.createElement('style');
  lcss.textContent = `#levertkort{ position:fixed; left:50%; transform:translateX(-50%); top:calc(var(--topp,58px) + 10px); z-index:19; width:min(420px, calc(100vw - 24px)); box-sizing:border-box;
  background:linear-gradient(180deg,#26301c,#161c10); border:1px solid #8fae5e; box-shadow:0 10px 26px rgba(0,0,0,.55); color:#e7dcc3; padding:9px 12px 10px; font-size:14px; line-height:1.4; }
#levertkort small{ display:block; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:#a9c27a; } #levertkort b{ font-family:'Cormorant Garamond', serif; font-size:19px; color:#f0e2b0; font-weight:600; }
#levertkort p{ margin:4px 0 0; } #levertkort .knapper{ display:flex; gap:6px; justify-content:flex-end; margin-top:7px; }
#levertkort button{ min-height:34px; padding:0 12px; background:#2a2318; border:1px solid #5a4a2a; color:#e7dcc3; font:inherit; font-size:13.5px; cursor:pointer; } #levertkort button.hoved{ border-color:#8fae5e; color:#dfeab8; }
body.kort #levertkort{ top:calc(var(--topp,44px) + 4px); font-size:13px; }`;
  document.head.appendChild(lcss);
  let levertTid = 0, levertVent = 0;
  // kort og møter som står oppe: da venter leveringskortet (høyst ett minutt), og det går bort hvis et av dem kommer (aldri to oppå hverandre)
  const annetKort = () => ['morgenkort', 'hendelse', 'samfunnkort', 'formkort', 'krigkort', 'loggvelkommen', 'angrepkort'].some(id => { const e = document.getElementById(id); return e && (e.classList.contains('på') || id === 'loggvelkommen') && e.getClientRects().length > 0; });
  function levertØyeblikk(k, beløp, forsøk = 0) {
    if (!auto() || !k) return; clearTimeout(levertVent);
    if (annetKort()) { if (forsøk < 60) levertVent = setTimeout(() => levertØyeblikk(k, beløp, forsøk + 1), 1000); return; }
    const s = Sp(), gml = document.getElementById('levertkort'); if (gml) gml.remove(); clearTimeout(levertTid);
    const b = document.createElement('div'); b.id = 'levertkort'; b.setAttribute('role', 'status');
    const kasse = s ? ` Kassa: ${kr(s.penger)}.` : '';
    const hva = k.første ? `Dette er selskapets første inntekt – og første rykte: «${egetNavn()}» holder ord. Pengene rekker til en brakke (flere senger) eller et vakttårn (ser røverne før de kommer).`
      : `Ryktet for å holde ord vokste. Husk de faste utgiftene: lønn og vedlikehold trekkes hver time.`;
    const neste = k.første ? 'Neste steg: åpne Leir og bygg noe for pengene. Etterpå venter nye kontrakter i Selskapet.' : 'Neste: en ny kontrakt i Selskapet, eller bygg ut leiren.';
    b.innerHTML = `<small>Kontrakt levert</small><b>${esc(k.giver.navn)} betalte ${esc(kr(beløp))}</b><p>${esc(hva)}${esc(kasse)}</p><p>${esc(neste)}</p>`
      + `<div class="knapper"><button type="button" class="hoved" data-l="neste">${k.første ? 'Åpne Leir' : 'Åpne Selskapet'}</button><button type="button" data-l="ok">OK</button></div>`;
    b.addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; b.remove(); clearTimeout(levertTid);
      if (t.dataset.l === 'neste') { if (k.første) { const lk = document.getElementById('leirknapp'); if (lk) lk.click(); if (window.LeirSpill && LeirSpill.fane) LeirSpill.fane('bygg'); } else vis(true); } });
    document.body.appendChild(b); const t0 = performance.now();
    const se = () => { if (!b.isConnected) return; if (annetKort() || performance.now() - t0 > 14000) { b.remove(); return; } levertTid = setTimeout(se, 500); }; levertTid = setTimeout(se, 500);
  }

  // ---------- steget (KROKER.sim, dt i spillminutter) ----------
  let akk = 0;
  function steg(dt) {
    if (!klar || !S || gjest()) return; akk += dt; if (akk < 1) return; const d = akk; akk = 0;
    // en sperre for en aktiv rydd-kontrakt som ikke finnes etter omlasting, settes ut igjen (fiendens lag lagres ikke)
    for (const k of S.sider[ID].aktive) { if (k.type === 'rydd' && !k.slått && !sperreFor(k)) { if (k.sperreSatt) k.slått = true; else { lagSperre(k); k.sperreSatt = true; } }
      if (k.type === 'eskorte' && !bilFor(k) && !k.bilSatt) { lagBil(k); k.bilSatt = true; } }
    // (R2-løkka, koordinatoren: rivalens angrepslag kunne bli stående i et tettsted og sperre det) et angreps-/bakholdslag forsvinner når
    // kontrakten ikke lenger er aktiv (levert, brutt, utløpt, avbrutt – også etter en omlasting), eller når det har stått i 6 spilltimer
    { const aktive = new Set(S.sider[ID].aktive.map(q => q.id)); let ut = false;
      for (let i = ENHETER.length - 1; i >= 0; i--) { const e = ENHETER[i]; if (!e.angrepslag) continue;
        if (!aktive.has(e.kontrakt) || (Number.isFinite(e.født) && tid - e.født > 360) || !Number.isFinite(e.født) && (e.født = tid, false)) { ENHETER.splice(i, 1); ut = true; } }
      if (ut) skitten = true; }
    const mål = {}; for (const k of S.sider[ID].aktive) mål[k.id] = vurder(k);
    hendelser(SK.steg(S, ID, tid, d, mål));
    const dag = dagNå();
    // (R18-A) mens den første kontrakten pågår, kom ingen nye tilbud – én ting om gangen. (kritikerløkka r3, Jonas: den første kontrakten
    // kunne ikke fullføres, og «Ingen tilbud nå» sto både dag 2 og dag 3.) NÅ: første dag er det bare den første kontrakten, men HVER ny
    // morgen kommer nye tilbud, også mens den første pågår.
    if (dag !== S.dag && auto()) { S.dag = dag; hendelser(SK.dagSteg(S, tid)); const n = nyeTilbud(); if (n.length) logg(`Selskapet: ${n.length} nye kontrakttilbud. Se «Selskapet».`); }
    tråd();
    // (r3) nødlageret som ikke er sjekket mot kartet (kartet var ikke lastet), prøves igjen hvert 15. sekund
    if (performance.now() - landSist > 15000) landLager();
    if (performance.now() - lagreTid > 20000) { lagreTid = performance.now(); lagre(); }
  }

  // ---------- handlingene ----------
  function ta(id) {
    if (!S) return { ok: false }; const r = SK.godta(S, ID, id, tid, null, har()); if (!r.ok) { melding = r.grunn; tegn(true); if (!åpen) logg(r.grunn); return r; }
    const k = r.k; if (k.type === 'rydd') { lagSperre(k); k.sperreSatt = true; } if (k.type === 'eskorte') { lagBil(k); k.bilSatt = true; }
    logg(`Kontrakt tatt: ${k.tittel}. Frist om ${k.timer} timer.`); melding = ''; lagre(); skitten = true; tegn(true); return r;
  }
  function avslå(id) { if (!S) return false; const n = S.tilbud.length; S.tilbud = S.tilbud.filter(k => k.id !== id); lagre(); tegn(true); return S.tilbud.length < n; }
  // lever(id, tving): leverer straks når kravet er oppfylt (tving: bare for prøver)
  function lever(id, tving) {
    if (!S) return null; const k = S.sider[ID].aktive.find(q => q.id === id); if (!k) return null;
    if (!tving && !klarTilLevering(k)) { melding = 'Kravet er ikke oppfylt ennå: ' + SK.kravTekst(k); tegn(true); return null; }
    const h = SK.lever(S, ID, k, tid); hendelser([h]); tegn(true); return h;
  }
  function avbryt(id) { if (!S) return null; const h = SK.avbryt(S, ID, id, tid); if (h) hendelser([h]); tegn(true); return h; }
  function pris(p) { if (S && SK.settPris(S, ID, p)) { lagre(); tegn(true); } }
  const gåTil = (x, y) => { if (typeof på3d !== 'undefined' && på3d) slå3d(false); kam.x = x; kam.y = y; if (kam.m > 20) kam.m = 10; skitten = true; };

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#selskap{ display:none; position:fixed; left:10px; top:calc(var(--topp,58px) + 6px); z-index:11; width:min(440px, calc(100vw - 20px)); max-height:calc(100% - var(--topp,58px) - 84px);
  overflow-y:auto; background:linear-gradient(180deg, #1d2125, #121417); color:#e9e4d6; border:1px solid #3a3f45; border-radius:10px; box-shadow:0 10px 30px rgba(0,0,0,.5); padding:12px 14px 14px; font-size:14px; }
#selskap.på{ display:block; } #selskap .lukk{ position:absolute; right:8px; top:8px; width:34px; height:30px; min-width:0; padding:0; font-size:18px; }
#selskap .hode{ display:flex; gap:12px; align-items:center; padding-right:36px; margin-bottom:8px; }
#selskap .hode h2{ margin:0; font-family:'Cormorant Garamond', serif; font-size:24px; line-height:1.05; font-weight:700; }
#selskap .kode{ font-family:ui-monospace, 'JetBrains Mono', Menlo, monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#d9a441; }
#selskap .motto{ font-family:'IM Fell English', serif; font-style:italic; color:#c8bfa9; font-size:14px; }
#selskap h3{ margin:12px 0 6px; font-size:11.5px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:#b48a3c; border-bottom:1px solid #2d3238; padding-bottom:3px; display:flex; justify-content:space-between; }
#selskap h3 small{ letter-spacing:.04em; text-transform:none; color:#8f8a7c; font-weight:400; }
#selskap .maal{ display:grid; grid-template-columns:86px 1fr 92px; gap:6px; align-items:center; margin:3px 0; }
#selskap .bar{ height:8px; border-radius:4px; background:#2a2f35; overflow:hidden; position:relative; } #selskap .bar i{ position:absolute; left:0; top:0; bottom:0; border-radius:4px; }
#selskap .maal span:last-child{ font-size:12.5px; color:#c8bfa9; text-align:right; }
#selskap .tall{ font-family:ui-monospace, 'JetBrains Mono', Menlo, monospace; font-variant-numeric:tabular-nums; }
#selskap button{ background:#1d2125; border:1px solid #454b52; color:#e9e4d6; border-radius:5px; cursor:pointer; } #selskap button:hover{ filter:brightness(1.2); }
#selskap .valg{ display:flex; gap:4px; margin:4px 0; } #selskap .valg button{ flex:1; min-width:0; } #selskap .valg button.på{ background:#3b3220; border-color:#d9a441; color:#f2d68a; }
#selskap .kort{ border:1px solid #31363c; border-left:3px solid #d9a441; border-radius:6px; padding:8px 10px; margin:6px 0; background:rgba(255,255,255,.025); }
#selskap .kort.aktiv{ border-left-color:#3f6fb0; } #selskap .kort.klar{ border-left-color:#7c9a4e; background:rgba(124,154,78,.08); }
#selskap .kort b{ font-family:'Cormorant Garamond', serif; font-size:17px; font-weight:700; display:block; line-height:1.15; }
#selskap .kort .fra{ font-size:12px; color:#8f8a7c; margin:1px 0 4px; } #selskap .kort p{ margin:3px 0; font-size:13px; line-height:1.35; color:#d8d1bf; }
#selskap .rad{ display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12.5px; color:#c8bfa9; margin:4px 0; } #selskap .rad .kr{ color:#f2d68a; } #selskap .rad .bot{ color:#e7a593; }
#selskap .knapper{ display:flex; gap:5px; margin-top:6px; flex-wrap:wrap; } #selskap .knapper button{ min-height:32px; padding:0 12px; }
#selskap button.hoved{ background:#3b3220; border-color:#d9a441; color:#f2d68a; } #selskap button.fare{ border-color:#8a4a3a; color:#e7b3a3; background:#2a1a16; }
#selskap .smerke{ flex:none; display:block; } #selskap .rival .smerke{ width:40px; height:40px; } #selskap .hode .smerke{ width:58px; height:58px; }
#selskap .rival{ display:flex; gap:10px; align-items:flex-start; margin:6px 0; } #selskap .rival b{ font-family:'Cormorant Garamond', serif; font-size:16px; }
#selskap .tom{ color:#8f8a7c; font-style:italic; font-size:13px; } #selskap .melding{ color:#f2c48a; font-size:13px; margin:6px 0; }
#selskap .fram{ height:5px; background:#2a2f35; border-radius:3px; overflow:hidden; margin:4px 0; } #selskap .fram i{ display:block; height:100%; background:#3f6fb0; }
body.kort #selskap{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(8px + env(safe-area-inset-right,0px)); width:auto; top:calc(var(--topp,44px) + 4px); bottom:calc(6px + env(safe-area-inset-bottom,0px)); max-height:none; }
#selskap .kort.låst{ opacity:.62; border-left-color:#5b5f66; } #selskap .kort.første{ border-left-color:#7c9a4e; } #selskap button[disabled]{ opacity:.5; cursor:not-allowed; }
#selskap .krav{ color:#e7a593; } #selskap .krav.ok{ color:#a9c27a; }
#selskap .nivaa{ font-size:13px; color:#d8d1bf; line-height:1.35; margin:2px 0 4px; } #selskap .nivaa b{ color:#f2d68a; }
#selskap .traad{ border:1px solid #6a5a2e; background:#2a2416; border-radius:6px; padding:7px 10px; margin:8px 0; } #selskap .traad small{ display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#b48a3c; }
#selskap .traad b{ font-family:'Cormorant Garamond', serif; font-size:18px; color:#f0e2b0; } #selskap .traad p{ margin:3px 0 0; font-size:13px; color:#d8d1bf; }
@media (max-width:420px){ #selskap .maal{ grid-template-columns:76px 1fr 80px; } #selskap .hode h2{ font-size:21px; } }`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.id = 'selskap'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Selskapet'); document.body.appendChild(panel);

  const FARGE = { pålitelig: '#7c9a4e', hardhendt: '#b0443a', billig: '#d9a441' }, NAVN = { pålitelig: 'Pålitelig', hardhendt: 'Hardhendt', billig: 'Billig' };
  const måler = (k, v) => `<div class="maal" data-rykte="${k}"><span>${NAVN[k]}</span><div class="bar" title="${Math.round(v)} av 100"><i style="width:${Math.round(v)}%;background:${FARGE[k]}"></i></div><span>${esc(SK.ord(k, v))}</span></div>`;
  const typeNavn = k => SK.REGLER.TYPER[k.type].navn;
  function avstand(k) { const s = Sp(); if (!s || !s.leir) return ''; return meter(Math.hypot(k.sted.x - s.leir.x, k.sted.y - s.leir.y)) + ' fra leiren'; }
  function tilbudKort(k) {
    const igjen = Math.max(0, k.utløper - tid), går = igjen >= 60 ? `${Math.round(igjen / 60)} t` : `${Math.round(igjen)} min`;
    // (R18-A) kravet: låst nivå gir en grå knapp; mangler leiren noe, står det rødt (knappen forklarer det når du trykker)
    const kt = SK.kanTa(k, har(k), S.sider[ID]), K = SK.kravFor(k), låst = K.nivå > nivåNå().nr, adv = kt.advarsel && kt.advarsel.length;
    const kravLinje = k.første ? `<div class="rad"><span class="krav ok">Din første kontrakt – vi viser deg hvert steg.</span></div>`
      : `<div class="rad"><span class="krav${kt.ok && !adv ? ' ok' : ''}"${adv ? ' data-svak="1"' : ''}>${kt.ok && adv ? '⚠ ' + esc(kt.advarsel.join('; ')) + ' – samme vurdering som i Krig. Send et sterkere lag.' : kt.ok ? '✓ Dere har det som trengs' : 'Krever ' + esc(kt.mangler.join(' og '))}${SK.kravKort(k) && kt.ok && !adv ? ' (' + esc(SK.kravKort(k)) + ')' : ''}</span></div>`;
    return `<div class="kort${låst ? ' låst' : ''}${k.første ? ' første' : ''}" data-kontrakt="${k.id}"><b>${låst ? '🔒 ' : ''}${esc(k.tittel)}</b><div class="fra">${esc(typeNavn(k))}${k.risiko === 'bakhold' ? ' · <span class="krav">⚠ meldt bakhold</span>' : k.risiko === 'rolig' ? ' · rolig rute' : ''} · ${esc(k.giver.navn)} · ${esc(avstand(k))}</div><p>${esc(SK.kravTekst(k))}</p>`
      + `<div class="rad"><span>Betaling <span class="kr tall">${kr(k.betaling)}</span></span><span>Bot ved brudd <span class="bot tall">${kr(k.bot)}</span></span><span>Frist <span class="tall">${k.timer} t</span> etter at dere tar den</span></div>`
      + (k.konkurrent ? `<div class="rad"><span>${esc(navnFor(k.konkurrent))} vil også ha den – vær raske.</span></div>` : '')
      + kravLinje + `<div class="rad"><span>Tilbudet står i ${går} til.</span></div><div class="knapper"><button class="hoved" data-s="ta" data-id="${k.id}"${låst ? ' disabled title="Låst til selskapet når nivå ' + K.nivå + '"' : ''}>Ta kontrakten</button><button data-s="avslå" data-id="${k.id}">Avslå</button><button data-s="vis" data-id="${k.id}">Vis i kartet</button></div></div>`;
  }
  function aktivKort(k) {
    const klarNå = klarTilLevering(k), v = vurder(k); let status = '', andel = 0;
    if (k.type === 'hold') { andel = k.framdrift / (k.hold * 60); status = `Holdt ${Math.floor(k.framdrift / 60)} t ${Math.round(k.framdrift % 60)} min av ${k.hold} t` + (v.fiender ? ' – fiender ved stedet, tida står' : v.lag ? ' – laget holder stedet' : ' – ingen lag der ennå'); }
    else if (k.type === 'eskorte') { andel = v.andel || 0; status = v.tapt ? 'Bilen er borte.' : `${esc(k.bil || 'Bilen')}: ${meter(v.igjen || 0)} igjen. Velg bilen i kartet og gi den ordre.`; }
    else if (k.type === 'rydd') { status = v.i ? 'Sperra er slått ut.' : 'Sperra står. Send et lag.'; andel = v.i ? 1 : 0; }
    // (R2-løkka, kritikken: «venter ved låven sørøst for leiren.» uten subjekt) den første kontrakten har ingen person – det er nødlageret som venter
    else if (k.type === 'forsyning') { status = k.hentet ? `${esc(k.bærer || 'Troppen')} bærer nødlageret – ta det med hjem til leiren.` : `Nødlageret venter i ${esc(k.sted.navn)}.`; andel = k.hentet ? (v.i ? 1 : .5) : 0; }
    else { status = k.hentet ? `${esc(k.bærer || 'Laget')} har ${esc(k.person)} med seg – til leiren.` : `${esc(k.person)} venter ved ${esc(k.sted.navn)}.`; andel = k.hentet ? (v.i ? 1 : .5) : 0; }
    return `<div class="kort aktiv${klarNå ? ' klar' : ''}" data-kontrakt="${k.id}"><b>${esc(k.tittel)}</b><div class="fra">${esc(typeNavn(k))} · ${esc(k.giver.navn)} · <span class="tall">${esc(SK.fristTekst(k, tid))}</span></div>`
      + `<p>${status}</p><div class="fram"><i style="width:${Math.round(Math.max(0, Math.min(1, andel)) * 100)}%"></i></div>`
      + `<div class="rad"><span>Betaling <span class="kr tall">${kr(k.betaling)}</span></span><span>Bot <span class="bot tall">${kr(k.bot)}</span></span></div>`
      // (kritikerløkka r3, Jonas: opplæringen sto fast på steg 3 av 6 i tre døgn) den første kontrakten kan gis opp uten bot og uten ripe i
      // ryktet – opplæringen går videre til «Neste kontrakt»
      + (k.første && !klarNå ? `<p class="tom">Kommer ikke troppen fram? Gi opp jobben – den første koster ingenting, og nye kontrakter står under.</p>` : '')
      + `<div class="knapper">${klarNå ? `<button class="hoved" data-s="lever" data-id="${k.id}">Lever</button>` : ''}<button data-s="vis" data-id="${k.id}">Vis i kartet</button><button class="fare" data-s="avbryt" data-id="${k.id}">${k.første ? 'Gi opp (ingen bot)' : 'Avbryt (bot)'}</button></div></div>`;
  }
  function html() {
    if (!S) return `<button class="lukk" data-s="lukk" aria-label="Lukk">×</button><p class="tom">Selskapet kommer når leiren er lagt.</p>`;
    const sd = S.sider[ID], r = sd.rykte, sum = sd.sum;
    let h = `<button class="lukk" data-s="lukk" aria-label="Lukk">×</button><div class="hode">${egetMerke(58)}<div><div class="kode">Privat militærselskap${fargeord() ? ' · ' + esc(fargeord()) : ''}</div><h2>${esc(egetNavn())}</h2><div class="motto">${esc(SK.rykteTekst(r))}</div></div></div>`;
    { const nv = nivåNå(), nn = SK.nesteNivå(sd);
      h += `<h3>Nivå ${nv.nr} · ${esc(nv.navn)} <small>betaling ×${String(nv.faktor).replace('.', ',')}</small></h3>`
        + (nn ? `<div class="nivaa" data-nivaa="${nn.nivå.nr}">Neste nivå: <b>${esc(nn.nivå.navn)}</b> (betaling ×${String(nn.nivå.faktor).replace('.', ',')}, lag på ${nn.nivå.menn}+ til de store holdejobbene). Mangler: ${esc(nn.mangler.join(' og '))}.</div>`
          : `<div class="nivaa">Øverste nivå – de beste kontraktene er deres.</div>`);
      const st = SK.trådSteg(S), fk = førsteK();
      if (st && fk) h += `<div class="traad"><small>Første kontrakt · steg ${S.tråd.gjort.length + 1} av ${SK.TRÅD.length}</small><b>${esc(st.tittel)}</b><p>${esc(st.tekst(fk))}</p></div>`; }
    h += `<h3>Rykte <small>styrer hvilke tilbud som kommer</small></h3>${måler('pålitelig', r.pålitelig)}${måler('hardhendt', r.hardhendt)}${måler('billig', r.billig)}`;
    h += `<h3>Pris <small>høy pris gir mer betaling, men færre bygder vil ha dere</small></h3><div class="valg">${Object.entries(SK.REGLER.pris).map(([id, p]) => `<button data-s="pris" data-id="${id}" class="${sd.pris === id ? 'på' : ''}">${p.navn} <span class="tall">×${String(p.faktor).replace('.', ',')}</span></button>`).join('')}</div>`;
    h += `<div class="rad"><span>Levert <span class="tall">${sum.levert}</span></span><span>Brutt <span class="tall">${sum.brutt}</span></span><span>Tjent <span class="kr tall">${kr(sum.tjent)}</span></span><span>Bøter <span class="bot tall">${kr(sum.bøter)}</span></span></div>`;
    if (melding) h += `<div class="melding">${esc(melding)}</div>`;
    h += `<h3>Aktive kontrakter <small>${sd.aktive.length} av ${SK.REGLER.maksAktive}</small></h3>` + (sd.aktive.length ? sd.aktive.map(aktivKort).join('') : `<p class="tom">Ingen ennå. Ta et tilbud under.</p>`);
    h += `<h3>Ledige tilbud <small>nye hver morgen</small></h3>` + (S.tilbud.length ? S.tilbud.map(tilbudKort).join('') : `<p class="tom">Ingen tilbud nå${steder().length ? '' : ' – kartet har ingen tettsteder eller bruer innen rekkevidde'}.</p>`);
    h += `<h3>De andre selskapene</h3>` + Object.keys(RIVALER).map(s => { const R = RIVALER[s], q = S.sider[s], fr = window.Fraksjoner && Fraksjoner.FRAKSJONER[s];
      const iKart = fr && fr.navn && fr.navn !== R.navn ? ` <span class="kode" style="letter-spacing:.04em">i kartet: ${esc(fr.navn)}</span>` : '';
      return `<div class="rival" data-rival="${s}">${rivalMerke(s, 40)}<div><b>${esc(R.navn)}</b>${iKart}<div class="motto">${esc(R.motto)}</div><p style="margin:2px 0;font-size:13px;color:#d8d1bf">${esc(R.omtale)}</p><div class="rad"><span>${esc(SK.rykteTekst(q.rykte).replace('dere er', 'de er'))}</span><span>Kontrakter <span class="tall">${q.sum.levert}</span></span></div></div></div>`; }).join('');
    const fer = sd.ferdige.slice(0, 3); if (fer.length) h += `<h3>Siste kontrakter</h3>` + fer.map(k => `<div class="rad"><span>${k.status === 'levert' ? '✓' : '✗'} ${esc(k.tittel)}</span><span class="${k.status === 'levert' ? 'kr' : 'bot'} tall">${k.status === 'levert' ? kr(k.betaling) : k.status === 'tapt' ? 'tapt' : '−' + kr(k.bot)}</span></div>`).join('');
    return h;
  }
  function tegn(tving) {
    if (!åpen) return; sistTegn = performance.now(); if (!tving && window.pekerNede && pekerNede(panel)) return;
    const h = html(); if (h === sistHtml && !tving) return; sistHtml = h; const rull = panel.scrollTop; panel.innerHTML = h; panel.scrollTop = rull;
  }
  panel.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; e.stopPropagation(); const id = b.dataset.id, s = b.dataset.s;
    // (R18-A) handlingene går gjennom kommandolaget (window.KOMMANDO, spill/kommando-visning.js); uten det kalles de rett
    const K = window.KOMMANDO, kom = (type, f) => (K ? K({ type, id, stille: true }) : f(id));
    if (s === 'lukk') vis(false); else if (s === 'ta') kom('kontraktTa', ta); else if (s === 'avslå') kom('kontraktAvslå', avslå); else if (s === 'lever') kom('kontraktLever', lever); else if (s === 'avbryt') kom('kontraktAvbryt', avbryt); else if (s === 'pris') kom('kontraktPris', pris);
    else if (s === 'vis') { const k = S && (S.tilbud.find(q => q.id === id) || S.sider[ID].aktive.find(q => q.id === id)); if (k) { const p = k.type === 'rydd' && k.sperre ? k.sperre : k.type === 'eskorte' && bilFor(k) ? bilFor(k) : k.sted; gåTil(p.x, p.y); } } });
  function vis(på) {
    åpen = på === undefined ? !åpen : !!på; panel.classList.toggle('på', åpen);
    if (åpen) { if (S && !S.tilbud.length && !S.sider[ID].aktive.length) { nyeTilbud(); if (S.dag < 0) S.dag = dagNå(); } if (window.lukkPanel) try { lukkPanel(); } catch (e) { /* */ }
      // (R18-A) Leir-menyen ligger på samme plass – lukk den, så panelene ikke står oppå hverandre
      { const lm = document.getElementById('leirmeny'), lk = document.getElementById('leirknapp'); if (lm && lk && lm.classList.contains('på')) lk.click(); }
      melding = ''; tegn(true); }
  }
  setInterval(() => { if (åpen && performance.now() - sistTegn > 900) tegn(false); }, 1000);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && åpen) vis(false); });

  // ---------- kartet: stedene i kontraktene ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!S || !klar) return; const m = kam.m, P = (x, y) => [(x - vx0) / m, (vy1 - y) / m];
    g.save(); g.font = '600 12px "Cormorant Garamond", serif'; g.textAlign = 'center';
    // (R18-A) den første kontrakten vises i kartet også før den er tatt, så spilleren ser hvor det bærer
    for (const k of [...S.sider[ID].aktive, ...S.tilbud.filter(q => q.første)]) {
      if (k.type === 'forsyning') { tegnLager(g, k, P); continue; }
      const [x, y] = P(k.sted.x, k.sted.y), r = k.type === 'hold' ? Math.max(8, SK.REGLER.nær.hold / m) : 9;
      g.strokeStyle = '#d9a441'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d9a441'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(18,20,23,.85)'; const t = `Kontrakt: ${typeNavn(k)}`, w = g.measureText(t).width + 10;
      // (løkka r1, kritiker Jonas: etiketten ble kuttet i kanten og lå under lagnavn) – plassen fra Etikett, og aldri utenfor skjermen
      const ty = window.Etikett && Etikett.tekst ? Etikett.tekst(g, t, x, y - r - 8, -1) : y - r - 8, tx = Math.max(w / 2 + 2, Math.min((typeof VW !== 'undefined' ? VW : 1e4) - w / 2 - 2, x));
      g.fillRect(tx - w / 2, ty - 12, w, 16); g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(t, tx, ty); g.fillStyle = '#f2d68a'; g.fillText(t, tx, ty);
      if (k.type === 'eskorte' && k.fra) { const [fx, fy] = P(k.fra.x, k.fra.y); g.strokeStyle = 'rgba(217,164,65,.6)'; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(fx, fy); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
      if (k.type === 'hent' && !k.hentet) { g.fillStyle = '#f2efe4'; g.beginPath(); g.arc(x + 12, y - 4, 3, 0, 7); g.fill(); g.fillRect(x + 10, y, 4, 8); }
      if (k.type === 'rydd' && k.sperre) { const [sx, sy] = P(k.sperre.x, k.sperre.y); g.strokeStyle = '#b0443a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx - 7, sy - 7); g.lineTo(sx + 7, sy + 7); g.moveTo(sx + 7, sy - 7); g.lineTo(sx - 7, sy + 7); g.stroke(); }
    }
    g.restore();
  });
  // (R1-løkka, kritikken: «vis nødlageret tydelig i kartet») nødlageret: en kasse med navn, en stiplet linje fra leiren og
  // avstanden; når troppen bærer det, står «Lever her» ved leiren
  function tegnLager(g, k, P) {
    const s = Sp(), L = s && s.leir, [x, y] = P(k.sted.x, k.sted.y), m = kam.m;
    if (L) { const [lx, ly] = P(L.x, L.y); g.strokeStyle = 'rgba(242,214,138,.75)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); g.setLineDash([]); }
    if (!k.hentet) {
      const r = Math.max(9, SK.REGLER.første.nær / m); g.strokeStyle = '#f2d68a'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.setLineDash([]);
      // kassa
      g.fillStyle = '#8a6a32'; g.fillRect(x - 8, y - 6, 16, 12); g.strokeStyle = '#f2d68a'; g.lineWidth = 1.5; g.strokeRect(x - 8, y - 6, 16, 12);
      g.beginPath(); g.moveTo(x - 8, y - 6); g.lineTo(x + 8, y + 6); g.moveTo(x + 8, y - 6); g.lineTo(x - 8, y + 6); g.stroke();
      const d = L ? Math.hypot(k.sted.x - L.x, k.sted.y - L.y) : 0, t = `Nødlageret${d ? ' · ' + meter(d) : ''}`;
      const w = g.measureText(t).width + 12, ty = y - r - 12;
      g.fillStyle = 'rgba(18,20,23,.88)'; g.fillRect(x - w / 2, ty - 12, w, 17); g.fillStyle = '#f2d68a'; g.fillText(t, x, ty + 1);
    } else if (L) { const [lx, ly] = P(L.x, L.y), t = 'Lever nødlageret her', w = g.measureText(t).width + 12;
      // (kritikerløkka r2, pakke skjerm: lappen lå oppå leirens navn) – meldes til navnene (Etikett), så leirens navn går utenom
      if (window.Etikett && Etikett.hinder) Etikett.hinder(lx - w / 2, ly + 14, w, 17);
      g.fillStyle = 'rgba(18,20,23,.88)'; g.fillRect(lx - w / 2, ly + 14, w, 17); g.fillStyle = '#a9c27a'; g.fillText(t, lx, ly + 27); }
  }
  KROKER.sim.push(dt => { try { steg(dt); } catch (e) { console.error('selskap', e); } });
  // sprengte bruer, kraftverk og dammer gjør selskapet mer hardhendt (spill/odeleggelse-visning.js kaller KROKER.ødelagt)
  if (KROKER.ødelagt) KROKER.ødelagt.push((o, hva) => { if (S && hva === 'ødelegg') { SK.hardhendt(S, ID, SK.REGLER.sprengt); lagre(); } });

  // ---------- inngangene ----------
  (window.KOMMANDO_TILLEGG = window.KOMMANDO_TILLEGG || []).push({ k: 'selskap', navn: 'Selskapet', tast: '', tittel: 'Selskapet: rykte, kontrakter og de andre selskapene',
    ikon: "<path d='M12 3l7 2.5V11c0 4.5-3 8-7 10-4-2-7-5.5-7-10V5.5z'/><path d='M9 12l2 2 4-4'/>",
    fins: () => klar && !!S, på: () => åpen, trykk: () => vis(),
    merke: () => { if (!S) return ''; const n = S.sider[ID].aktive.filter(klarTilLevering).length; return n || ''; } });
  const meny = document.getElementById('lagmeny');
  if (meny) { const b = document.createElement('button'); b.id = 'vis-selskap'; b.textContent = 'Selskapet'; b.onclick = () => { vis(true); const m = document.getElementById('lagmeny'); if (m) m.classList.remove('på'); }; meny.appendChild(b); }
  (window.LEIR_MENY = window.LEIR_MENY || []).push((hode, { el, knapp }) => { if (!S) return; const sd = S.sider[ID];
    hode.appendChild(el('h3', { 'data-fane': 'mål' }, 'Selskapet'));
    hode.appendChild(el('div', { klasse: 'igang' }, `${sd.aktive.length} aktive kontrakter, ${S.tilbud.length} ledige tilbud. ${SK.rykteTekst(sd.rykte)}`));
    hode.appendChild(knapp('Åpne «Selskapet»', () => vis(true), { id: 'selskapknapp' })); });

  // ---------- R18-A: «NESTE»-LAPPEN nederst (over kommandolinja på PC og bunnmenyen på telefon) ----------
  // Én linje som alltid sier hva den aktive kontrakten venter på. Trykk = gjør det (åpner panelet / Tropper / Leir, eller viser stedet).
  // Står bare når bunnmenyen står (ikke mens du går, bygger eller har et dekkende panel oppe), og legger seg over opplæringsruta.
  const lappCss = document.createElement('style');
  lappCss.textContent = `#nestelapp{ position:fixed; left:50%; transform:translateX(-50%); z-index:9; display:none; align-items:center; gap:8px; max-width:min(600px, calc(100vw - 24px));
  padding:5px 6px 5px 10px; background:linear-gradient(180deg,rgba(42,36,22,.96),rgba(24,20,12,.97)); border:1px solid #8a7440; border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.45);
  color:#f0e2b0; font-size:13.5px; cursor:pointer; -webkit-tap-highlight-color:transparent; }
#nestelapp.på{ display:flex; } #nestelapp small{ flex:none; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#b48a3c; }
#nestelapp b{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
#nestelapp span.gå{ flex:none; min-width:30px; height:28px; line-height:28px; text-align:center; border-radius:5px; background:#3b3220; border:1px solid #d9a441; color:#f2d68a; font-size:16px; }
#nestelapp:hover{ border-color:#d9a441; } body.kort #nestelapp{ font-size:12.5px; max-width:calc(100vw - 16px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px)); }
body.kort #nestelapp small{ display:none; }
.traadpek{ outline:2px solid #e8d48a !important; outline-offset:2px; animation:traadpek 1.4s ease-in-out infinite; }
@keyframes traadpek{ 50%{ outline-color:rgba(232,212,138,.25); } }`;
  document.head.appendChild(lappCss);
  const lappEl = document.createElement('div'); lappEl.id = 'nestelapp'; lappEl.setAttribute('role', 'button'); lappEl.setAttribute('aria-live', 'polite');
  lappEl.innerHTML = '<small>Neste</small><b></b><span class="gå" aria-hidden="true">›</span>'; document.body.appendChild(lappEl);
  // (løkka r1, pakke økonomi) spill/neste.js velger hva lappen viser (kontrakten, opplæringen, scenariet, målene) – trykket gjør det som står
  let vistLapp = null;
  lappEl.addEventListener('click', e => { e.stopPropagation(); const v = vistLapp, så = e.target && e.target.closest && e.target.closest('.saa');
    if (v && så && v.såTrykk) v.såTrykk(); else if (v && v.trykk) v.trykk(); else følgLapp(); });
  const synligEl = e => { if (!e) return false; const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.height > 0 && r.width > 0; };
  let pekt = null;
  function pekPå(l) {
    let m = null; const kn = k => { const a = document.querySelector(`#kommando [data-k="${k}"]`), b = document.querySelector(`#mkom [data-k="${k}"]`); return synligEl(a) ? a : synligEl(b) ? b : null; };
    if (l && l.steg && !document.getElementById('selskap').classList.contains('på')) {
      if (l.pek === 'selskap') m = kn('selskap') || kn('mer'); else if (l.pek === 'tropper') m = kn('tropper') || document.getElementById('nytropp'); else if (l.pek === 'leir') m = kn('leir') || document.getElementById('leirknapp'); }
    if (l && l.steg === 'ta' && document.getElementById('selskap').classList.contains('på')) m = panel.querySelector(`[data-s="ta"][data-id="${l.k.id}"]`);
    // send/hjem: «Marsjer» i lagpanelet når en egen tropp er valgt
    if (l && (l.steg === 'send' || l.steg === 'hjem')) { const p = document.getElementById('panel'); if (p && p.classList.contains('på') && typeof valgt !== 'undefined' && valgt && valgt.fraFolk) m = [...p.querySelectorAll('button')].find(b => /^(Marsjer|Kjør dit)/.test(b.textContent.trim())) || null; }
    if (m === pekt) return; if (pekt) pekt.classList.remove('traadpek'); pekt = m; if (m) m.classList.add('traadpek');
  }
  function plasserLapp() {
    const b = document.body, l0 = (auto() && !gjest()) ? lapp() : null;
    let l = l0; try { if (window.NesteSpill && NesteSpill.velg) l = NesteSpill.velg(l0); } catch (e) { l = l0; } vistLapp = l;
    const bar = [document.getElementById('kommando'), document.getElementById('mkom')].find(e => e && e.classList.contains('på') && synligEl(e));
    const vis = !!(l && bar && !b.classList.contains('gaar') && !b.classList.contains('foto'));
    lappEl.classList.toggle('på', vis); pekPå(vis || åpen ? l : null); if (!vis) return;
    const t = lappEl.querySelector('b'); if (t.textContent !== l.tekst) { t.textContent = l.tekst; lappEl.title = l.hjelp || l.tekst; }
    { const så = l.så || ''; let i = lappEl.querySelector('i.saa'); if (så && !i) { i = document.createElement('i'); i.className = 'saa'; t.after(i); } if (i && i.textContent !== så) { i.textContent = så; i.hidden = !så; } }
    let topp = bar.getBoundingClientRect().top; for (const id of ['opplaering', 'kommer', 'mkommer']) { const e = document.getElementById(id); if (e && e.classList.contains('på') && synligEl(e)) topp = Math.min(topp, e.getBoundingClientRect().top); }
    const bunn = Math.round(window.innerHeight - topp + 6) + 'px'; if (lappEl.style.bottom !== bunn) lappEl.style.bottom = bunn;
  }
  // tråden sjekkes også her (steget i KROKER.sim går bare hvert spillminutt – ett minutt ekte tid på 1×), så lappen svarer straks
  setInterval(() => { try { if (klar && !gjest() && !document.hidden) tråd(); plasserLapp(); } catch (e) { /* neste runde */ } }, 500);

  // ---------- R18-A: krigskartet viser kontraktene ved tettstedet ----------
  { const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; (KT.by = KT.by || []).push((by, eier) => {
    if (!S || !by || !by.e) return null; const navn = by.e.navn, id = by.e.id;
    const her = [...S.sider[ID].aktive, ...S.tilbud].filter(k => k.sted && (k.sted.id === id || k.sted.navn === navn)); if (!her.length) return null;
    const k = her[0], akt = k.status === 'aktiv';
    return `Kontrakt${akt ? '' : 'tilbud'} her: ${k.tittel} – ${kr(k.betaling)}${eier === ID ? ` (+${Math.round(SK.REGLER.egetSted * 100)} % når stedet er deres)` : ''}. Se «Selskapet».`; }); }

  // ---------- start ----------
  function start() {
    const s = Sp(); if (!s || !s.leir) return; const id = Math.round(s.leir.x) + ',' + Math.round(s.leir.y);
    if (klar && id === leirId) return; leirId = id;
    S = les(s.leir) || SK.ny(s.leir, {}); settNavn(); klar = true; sistHtml = '';
    // (R1-løkka) eldre lagrede spill: de andre selskapene som ikke har gjort noe ennå, får sitt eget startrykte
    for (const id of Object.keys(SK.REGLER.rykte.sider)) { const q = S.sider[id], st = SK.REGLER.rykte.start; if (q && !q.sum.levert && Object.keys(st).every(k => q.rykte[k] === st[k])) Object.assign(q.rykte, SK.REGLER.rykte.sider[id]); }
    // (R18-A) et nytt spill (selskapet har aldri hatt en kontrakt) får den første kontrakten med en gang
    if (S.nr === 0 && !S.tråd && auto()) førsteKontrakt(); else landLager();
    if (åpen) tegn(true);
  }
  // (R1-løkka 26. nov, kritikken: «den første kontrakten er en felle») nødlageret ligger i en låve F.avstand fra leiren – så nær at
  // radioen aldri mister kontakten (se REGLER.første) – i retning bygda som gir jobben, på land, i spillkartet og minst F.utenfor
  // meter utenfor alle tettsteder (der står bygdevernet). Retningene prøves fra bygdas retning og utover til begge sider.
  function lagerPlass(L) {
    const F = SK.REGLER.første, byer = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [], G = window.Garnison;
    const bygd = steder().filter(q => q.slag === 'tettsted').map(q => ({ q, d: Math.hypot(q.x - L.x, q.y - L.y) })).filter(o => o.d >= F.min && o.d <= F.maks).sort((a, b) => Math.abs(a.d - F.ønsket) - Math.abs(b.d - F.ønsket))[0];
    const v0 = bygd ? Math.atan2(bygd.q.y - L.y, bygd.q.x - L.x) : .3;
    const fri = (x, y) => { const hh = typeof hoydeVed === 'function' ? hoydeVed(x, y) : null; if (hh !== null && hh <= 1) return false;
      if (typeof OMRÅDE_OK === 'function' && !OMRÅDE_OK(x, y)) return false;
      if (G && G.avstand) for (const by of byer) { if (!by.bb || x < by.bb[0] - F.utenfor || x > by.bb[2] + F.utenfor || y < by.bb[1] - F.utenfor || y > by.bb[3] + F.utenfor) continue; if (G.avstand(by, x, y) < F.utenfor) return false; }
      return true; };
    for (const d of [F.avstand, F.avstand * .75, F.avstand * .55]) for (let i = 0; i < 16; i++) { const v = v0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, x = L.x + Math.cos(v) * d, y = L.y + Math.sin(v) * d;
      if (fri(x, y)) return { x: Math.round(x), y: Math.round(y) }; }
    return { x: Math.round(L.x + Math.cos(v0) * F.avstand * .55), y: Math.round(L.y + Math.sin(v0) * F.avstand * .55) };
  }
  // (kritikerløkka r2, 26. nov, Ingrid: «nødlageret lå midt i Glomma») lagerPlass over sjekker bare havet (høyde ≤ 1 moh.).
  // (kritikerløkka r3, 26. nov, Jonas: nødlageret lå midt i fjorden ved Nesvik – «Marsjer» ga «ingen rute dit», «Kjør dit» stoppet ved
  // fjæra.) Sjekken mot terrengklassen holdt ikke: den ble bare prøvd én gang (feilet hentingen av kartet, ble lageret liggende), og den
  // sjekket ikke om troppen kan GÅ dit. NÅ: ett vindu (lagVindu, 32 m-ruter – det samme ordre() bruker) rundt leiren; alle ruter man kan
  // gå til fra leiren, finnes med en flomfylling (Terreng.fart > 0, samme regel som ruta i ordre()). Lageret skal ligge på fast mark
  // (ikke vann/myr, med fast mark rundt – LAND.kant), som troppen kan nå, utenfor tettstedene (fri0), LAND.min–LAND.maks fra leiren
  // (helst F.avstand), helst nær en veg og i bygdas retning (tittelen). Den beste kandidaten må også ha en ekte rute
  // (Terreng.ruteTil) på høyst LAND.timer timer. Finnes ingen, prøves alle retninger (kandidatene er alle ruter rundt leiren), så et
  // punkt rett ved leiren (LAND.nød). Kartet er ikke lastet (leirens rute har ingen data): prøves igjen (steg). k.sted.land = 2 betyr
  // sjekket med ruta – gamle lagrede kontrakter (land 1 eller uten) sjekkes på nytt når de lastes, så lenge ingen har hentet lageret.
  // Tallene i LAND er Claudes forslag.
  const LAND = { kant: 2, veg: 160, vegStraff: 450, retningStraff: 600, min: 300, maks: 1050, timer: 1.5, nød: [220, 160, 110], prøv: 8 };
  let landJobb = null, landSist = 0;
  // flomfylling fra (si, sj): Uint8Array med 1 for ruter man kan gå til (8 naboer, som A* i Terreng.ruteTil)
  function nåbare(v, si, sj) {
    const N = v.w * v.h, ut = new Uint8Array(N), fram = q => Terreng.fart(v.K[q], v.V ? v.V[q] : 0) > 0;
    if (si < 0 || sj < 0 || si >= v.w || sj >= v.h) return ut; const kø = new Int32Array(N); let a = 0, b = 0; const s0 = sj * v.w + si; ut[s0] = 1; kø[b++] = s0;
    while (a < b) { const q = kø[a++], i = q % v.w, j = (q / v.w) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if ((!di && !dj) || x < 0 || y < 0 || x >= v.w || y >= v.h) continue; const m = y * v.w + x; if (ut[m] || !fram(m)) continue; ut[m] = 1; kø[b++] = m; } }
    return ut;
  }
  function landLager() { if (landJobb || !S || typeof lagVindu !== 'function' || typeof Terreng === 'undefined') return landJobb;
    const k = [...S.tilbud, ...S.sider[ID].aktive].find(q => q && q.første && q.sted && q.sted.slag === 'lager' && q.sted.land !== 2 && !q.hentet); if (!k) return null;
    landSist = performance.now();
    landJobb = (async () => { try {
      const L = S.leir || (Sp() || {}).leir; if (!L) return; const F = SK.REGLER.første, R = LAND.maks + 300;
      const v = await lagVindu([L.x - R, L.y - R, L.x + R, L.y + R], true); if (!v || !v.K || !v.w) return;
      const K = (i, j) => (i >= 0 && j >= 0 && i < v.w && j < v.h ? v.K[j * v.w + i] : 255), fast = (i, j) => { const c = K(i, j); return c !== 3 && c !== 255; };
      const ok = (i, j) => { if (K(i, j) === 6 || !fast(i, j)) return false; for (let a = -LAND.kant; a <= LAND.kant; a++) for (let b = -LAND.kant; b <= LAND.kant; b++) if (!fast(i + a, j + b)) return false; return true; };
      const vegNær = (i, j) => { const n = Math.ceil(LAND.veg / v.r); for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const q = j + b, p = i + a; if (p >= 0 && q >= 0 && p < v.w && q < v.h && v.V && v.V[q * v.w + p] > 0) return true; } return false; };
      // startruta: leirens rute, eller nærmeste rute man kan gå i innen ca. 100 m (leiren kan stå i en myr eller ved et vann)
      let [li, lj] = Terreng.rute(v, L.x, L.y); if (K(li, lj) === 255) return;
      if (!(Terreng.fart(K(li, lj), v.V ? v.V[lj * v.w + li] : 0) > 0)) { let bd = 1e9, bp = null; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const c = K(li + a, lj + b); if (c !== 255 && Terreng.fart(c, v.V ? v.V[(lj + b) * v.w + li + a] : 0) > 0 && a * a + b * b < bd) { bd = a * a + b * b; bp = [li + a, lj + b]; } } if (bp) [li, lj] = bp; }
      const nå = nåbare(v, li, lj), kan = (i, j) => i >= 0 && j >= 0 && i < v.w && j < v.h && nå[j * v.w + i] === 1;
      const x0 = k.sted.x, y0 = k.sted.y, [i0, j0] = Terreng.rute(v, x0, y0), ret0 = k.sted.retning || SK.retningOrd(x0 - L.x, y0 - L.y);
      const rute = (x, y) => { try { const r = Terreng.ruteTil(v, L.x, L.y, x, y); return r && r.timer <= LAND.timer ? r : null; } catch (e) { return null; } };
      let best = null;
      // står det alt på fast mark som troppen kan nå, nær en veg og med en kort rute, blir det stående
      const d0 = Math.hypot(x0 - L.x, y0 - L.y);
      if (ok(i0, j0) && kan(i0, j0) && vegNær(i0, j0) && d0 <= LAND.maks && fri0(x0, y0) && rute(x0, y0)) best = { x: x0, y: y0 };
      if (!best) { const kand = [];
        for (let j = 0; j < v.h; j++) for (let i = 0; i < v.w; i++) { if (!kan(i, j)) continue; const [x, y] = Terreng.senter(v, i, j), d = Math.hypot(x - L.x, y - L.y); if (d < LAND.min || d > LAND.maks || !ok(i, j)) continue;
          kand.push({ i, j, x, y, sk: Math.abs(d - F.avstand) + (vegNær(i, j) ? 0 : LAND.vegStraff) + (SK.retningOrd(x - L.x, y - L.y) === ret0 ? 0 : LAND.retningStraff) }); }
        kand.sort((a, b) => a.sk - b.sk); let n = 0;
        for (const c of kand) { if (!fri0(c.x, c.y)) continue; if (rute(c.x, c.y)) { best = c; break; } if (++n >= LAND.prøv * 4) break; } }
      // nødløsningen: et punkt rett ved leiren som troppen kan gå til (alle retninger)
      if (!best) for (const d of LAND.nød) { for (let q = 0; q < 16 && !best; q++) { const a = q * Math.PI / 8, x = L.x + Math.cos(a) * d, y = L.y + Math.sin(a) * d, [i, j] = Terreng.rute(v, x, y);
        if (kan(i, j) && fast(i, j) && rute(x, y)) best = { x, y }; } if (best) break; }
      if (!best) return;
      if (best.x !== x0 || best.y !== y0) { const dx = best.x - L.x, dy = best.y - L.y, ret = SK.retningOrd(dx, dy);
        k.sted.x = Math.round(best.x); k.sted.y = Math.round(best.y); k.sted.d = Math.round(Math.hypot(dx, dy));
        if (k.sted.retning && ret !== k.sted.retning) { k.sted.retning = ret; k.sted.navn = `låven ${ret} for leiren`; } k.tittel = SK.tittel(k); }
      k.sted.land = 2; lagre(); sistHtml = ''; if (åpen) tegn(true); skitten = true;
    } catch (e) { /* prøves igjen neste gang (steg) */ } finally { landJobb = null; } })();
    return landJobb; }
  // fri() fra lagerPlass (utenfor tettstedene og spillkartet) for et punkt
  function fri0(x, y) { const F = SK.REGLER.første, byer = (typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted) || [], G = window.Garnison;
    if (typeof OMRÅDE_OK === 'function' && !OMRÅDE_OK(x, y)) return false;
    if (G && G.avstand) for (const by of byer) { if (!by.bb || x < by.bb[0] - F.utenfor || x > by.bb[2] + F.utenfor || y < by.bb[1] - F.utenfor || y > by.bb[3] + F.utenfor) continue; if (G.avstand(by, x, y) < F.utenfor) return false; }
    return true; }
  // den første kontrakten: nødlageret (lagerPlass) for bygdelaget i nærmeste tettsted
  function førsteKontrakt(nullstill) {
    const s = Sp(); if (!s || !s.leir) return null; if (nullstill) { S = SK.ny(s.leir, {}); settNavn(); }
    const reserve = lagerPlass(s.leir);
    const k = SK.førsteKontrakt(S, ID, tid, steder(), reserve); if (!k) return null;
    if (S.dag < 0) S.dag = dagNå(); lagre(); skitten = true; landLager();
    if (!navigator.webdriver) setTimeout(() => logg(`${k.giver.navn} har en jobb til dere: ${k.tittel} (${kr(k.betaling)}). Trykk på lappen nederst.`), 1200);
    sistHtml = ''; if (åpen) tegn(true); return k;
  }
  // (R1-løkka, kritikken: «bygdevernet angriper folkene som ga oss jobben») er dere på oppdrag for bygda/kommunen i tettstedet byId?
  // Gir kontrakten (aktiv, fra bygdelaget eller kommunen der), ellers null. Bygdevernet (spill/krig-visning.js) og krigskartets
  // vurdering (spill/strategi-visning.js) bruker den.
  function oppdragFor(byId) { if (!S || byId == null) return null; return S.sider[ID].aktive.find(k => k.giver && k.giver.slag !== 'firma' && (k.giver.by === byId || (k.sted && k.sted.by === byId))) || null; }
  window.addEventListener('riksbrudd-spill', () => setTimeout(start, 0));
  Object.assign(api, { fargeord, levertØyeblikk, start, vis, erÅpen: () => åpen, tilstand: () => S, sett: d => { S = SK.fraJSON(d) || S; settNavn(); tegn(true); }, ta, avslå, lever, avbryt, pris, nyeTilbud, steder,
    vurder, klar: klarTilLevering, steg: dt => { akk = 0; steg(Math.max(1, dt)); }, lagre, NØKKEL,
    førsteKontrakt, lagerPlass, landLager, oppdragFor, forsvarVed, fred: byId => !!oppdragFor(byId), knappFor, fargeNavn, tråd: () => (S ? SK.trådSteg(S) : null), trådAktiv, oppdaterTråd: tråd, lapp, følgLapp, har, nivå: nivåNå,
    rett: { kontraktTa: ta, kontraktAvslå: avslå, kontraktLever: id => lever(id), kontraktAvbryt: avbryt, kontraktPris: pris }, RIVALER, merke: (side, px) => (side === ID ? egetMerke(px || 40) : rivalMerke(side, px || 40)) });
  window.SelskapSpill = api;
})();
