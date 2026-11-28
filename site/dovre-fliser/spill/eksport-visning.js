'use strict';
/* Riksbrudd – EKSPORT I SPILLET (fase Ø6, 28. nov; docs/plan-selskap-okonomi.md kapittel 11). Reglene: spill/eksport.js (window.Eksport).
 * Kobler eksportordrene til verden: havnene (leirens egen kai fra spill/kaier.js, tettsteder dere holder og havnebyer dere har avtale med –
 * SjoSpill.havner/havnFor og ByavtaleSpill), grensestasjonene (Eksport.GRENSER), lageret og lastebilene (VareSpill: ledigBil, ta, legg),
 * Gråfjell Frakt (tallene fra Vare.REGLER.frakt) og eurokreditten (kassa ved siden av kronene i statuslinja).
 * Delen «Eksport» står i Selskapet → Oversikt (spill/selskapspanel.js spør EksportSpill.oversiktHtml og sender knappene data-sp="ek-…" hit).
 * Handlingene går gjennom kommandolaget (kommandoene eksportTa, eksportSend, eksportAvslå, eksportAvbryt, eksportVeksle, eksportKjøp,
 * eksportGrensevakt). Lagres per leir i «riksbrudd-eksport».
 * I TESTENE (navigator.webdriver) kommer ingen ordre av seg selv: EksportSpill.test = true slår morgenen på (skipene og turene går som
 * vanlig – de er svar på det spilleren gjør). Alle tall og tekster er Claudes forslag.
 */
(function () {
  const E = window.Eksport; if (!E || typeof KROKER === 'undefined') return;
  const R = E.REGLER, NØKKEL = 'riksbrudd-eksport', ID = 'blå';
  const tilfV = (typeof Tilfeldig !== 'undefined' && Tilfeldig.verden) || Math.random;
  const api = { test: false, ekstra: [] }, auto = () => !navigator.webdriver || api.test === true;
  let S = E.ny(), leirId = '', klar = false;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kr = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : Math.round(v).toLocaleString('nb-NO') + ' kr');
  const nf = v => String(Math.round(v * 10) / 10).replace('.', ',');
  const km = d => (d < 1000 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(d < 10000 ? 1 : 0).replace('.', ',') + ' km');
  const tidT = min => (min < 60 ? Math.max(1, Math.round(min)) + ' min' : min < 2880 ? nf(min / 60) + ' t' : nf(min / 1440) + ' døgn');
  const Sp = () => (window.OppstartSpill && OppstartSpill.tilstand ? OppstartSpill.tilstand() : null);
  const leir = () => { const s = Sp(); return s && s.leir ? s.leir : null; };
  const VS = () => window.VareSpill;
  const infl = () => { try { const M = window.SpilletSpill && SpilletSpill.M ? SpilletSpill.M() : null; return M && M.infl > 0 ? M.infl : 1; } catch (e) { return 1; } };
  const VN = v => (R.VARER[v] || { navn: v }).navn;
  const KJ = () => (typeof KJORETOY !== 'undefined' ? KJORETOY : []);

  // ---------- lagring per leir ----------
  function lagre() { if (!klar || !leirId) return; try { localStorage.setItem(NØKKEL, JSON.stringify({ leir: leirId, d: E.tilJSON(S) })); } catch (e) { /* fullt eller sperret */ } }
  function start() { const L = leir(); if (!L) return false; const id = Math.round(L.x) + ',' + Math.round(L.y); if (klar && id === leirId) return true;
    let d = null; try { d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); } catch (e) { d = null; }
    S = d && d.leir === id ? E.fraJSON(d.d) : E.ny(); leirId = id; klar = true; if (S.dag < 0) S.dag = Math.floor(tid / 1440); visEuro(); return true; }

  // ---------- havnene og grensestasjonene ----------
  const infra = () => (typeof INFRA !== 'undefined' && INFRA ? INFRA : null);
  function byMedId(id) { const I = infra(); return I && I.tettsted ? I.tettsted.find(b => b.e && String(b.e.id) === String(id)) || null : null; }
  // [{ slag: 'havn', id, navn, x, y, størrelse, avtale, d, hvorfor }] – nærmest først. Bare kaier som skipene kan legge til ved, innen havnMaks.
  function havner() {
    const L = leir(), ut = [], sett = new Set(); if (!L) return ut; const SJ = window.SjoSpill, K = window.KaierSpill ? KaierSpill.data() : null;
    const legg = (h) => { const n = h.kai >= 0 ? 'k' + h.kai : 'p' + Math.round(h.x) + ',' + Math.round(h.y); if (sett.has(n)) { const f = ut.find(q => q.n === n); if (f && h.avtale && !f.avtale) Object.assign(f, { avtale: true, hvorfor: h.hvorfor }); return; }
      const d = Math.hypot(h.x - L.x, h.y - L.y); if (d > R.havnMaks || !E.skipTar(h.størrelse)) return; sett.add(n); ut.push({ ...h, slag: 'havn', n, d }); };
    // tettsteder dere holder (sjøpakka sin havn i byen) og havnebyer dere har avtale med
    try { if (SJ && SJ.havner) for (const h of SJ.havner()) { const q = SJ.kaiInfo(h.kai); if (q) legg({ id: 'by' + h.id, navn: h.navn, x: q.x, y: q.y, kai: h.kai, størrelse: q.størrelse, avtale: true, hvorfor: 'dere holder byen' }); } } catch (e) { /* uten sjø */ }
    try { const BA = window.ByavtaleSpill && ByavtaleSpill.tilstand ? ByavtaleSpill.tilstand() : null;
      if (BA && BA.byer && SJ && SJ.havnFor) for (const [id, b] of Object.entries(BA.byer)) { if (!b || !b.avtale || b.avtale.oppsagt) continue; const by = byMedId(id); if (!by) continue; const i = SJ.havnFor(by), q = i >= 0 ? SJ.kaiInfo(i) : null;
        if (q) legg({ id: 'by' + id, navn: by.e.navn, x: q.x, y: q.y, kai: i, størrelse: q.størrelse, avtale: true, hvorfor: 'avtale med byen' }); } } catch (e) { /* uten byavtaler */ }
    // leirens egen kai (innen 3 km): ingen avtale med noen by – større sjanse for pirater
    try { if (K && window.Kaier) { const f = Kaier.nær(K, L.x, L.y, window.Sjo ? Sjo.REGLER.leirKai : 3000); if (f) legg({ id: 'kai' + f.i, navn: Kaier.navn(K, f.i) || 'Leirens kai', x: K.x[f.i], y: K.y[f.i], kai: f.i, størrelse: Kaier.størrelse(K.t[f.i], K.l[f.i]), avtale: false, hvorfor: 'leirens egen kai' }); } } catch (e) { /* uten kaier */ }
    for (const h of api.ekstra) legg({ kai: -1, ...h });
    return ut.sort((a, b) => a.d - b.d);
  }
  const grenser = () => { const L = leir(); return L ? E.grenserNær(L.x, L.y).map(g => ({ ...g, slag: 'grense' })) : []; };
  // utgangen ordren bruker nå (lagret på ordren; finnes havna fortsatt, oppdateres avtalen)
  function utFor(k, liste) { if (k.vei === 'grense') return liste.grense.find(g => g.id === (k.ut && k.ut.id)) || null; return liste.havn.find(h => h.id === (k.ut && k.ut.id)) || null; }
  const utganger = () => ({ havn: havner(), grense: grenser() });
  const trinnNr = () => { try { return window.TrinnSpill && TrinnSpill.regn ? TrinnSpill.regn().nr : 1; } catch (e) { return 1; } };
  function åpenNå(U = utganger()) { return E.åpen({ trinn: trinnNr(), havner: U.havn.length, grenser: U.grense.filter(g => g.d <= R.grense.nær).length }); }
  // de beste utgangene for en ordre: havnene som tar lasten (avtale først), eller de to nærmeste grensestasjonene
  function valgFor(k, U = utganger()) { if (k.vei === 'grense') return U.grense.slice(0, 2);
    return U.havn.filter(h => !E.utFeil(k, h)).sort((a, b) => (b.avtale - a.avtale) || (a.d - b.d)).slice(0, 2); }

  // ---------- morgenen og steget ----------
  function morgen(tving) {
    if (!start() || (!tving && !auto())) return []; const U = utganger(), stor = Math.max(0, ...U.havn.map(h => E.skipTar(h.størrelse)));
    const vei = U.havn.length && U.grense.length ? null : U.havn.length ? 'sjø' : U.grense.length ? 'grense' : null;
    const nye = E.morgen(S, tid, { åpen: tving || åpenNå(U), vei, størst: stor || R.havn.stor, rand: tilfV });
    if (tving && !nye.length && S.tilbud.length < R.maksTilbud) { const k = E.lagOrdre(S, tid, { rand: tilfV, vei, størst: stor || R.havn.stor }); S.tilbud.push(k); nye.push(k); }
    for (const k of nye) logg(`Eksportordre: ${k.tittel}. Se Selskap → Oversikt → Eksport.`);
    if (nye.length) lagre(); return nye;
  }
  function finnBil(t) { return KJ().find(q => q.navn === t.bil && q.side === ID && q.antall >= 1) || null; }
  // lasten på vegen: framme ved havna/grensa, eller borte
  function turSteg() {
    let endret = false;
    for (const k of S.aktive) { if (!k.ut) continue; for (const t of k.turer.slice()) {
      const framme = () => { k.turer = k.turer.filter(q => q !== t); endret = true;
        if (k.vei === 'sjø') { E.iHavn(k, t.mengde); logg(`${t.bil || R.frakt.firma} har levert ${E.mengdeTekst(k.vare, t.mengde)} ${VN(k.vare)} på kaia i ${k.ut.navn}.`); }
        else { const r = E.overGrensa(S, k, t.mengde, !!t.smugling, tilfV);
          logg(r.beslag ? `Tollen ved ${k.ut.navn} beslagla ${E.mengdeTekst(k.vare, r.beslag)} ${VN(k.vare)} – smuglingen ble oppdaget. Ryktet ute faller.` : `${t.bil || R.frakt.firma} kom over grensa ved ${k.ut.navn} med ${E.mengdeTekst(k.vare, r.levert)} ${VN(k.vare)}${t.smugling ? ' (smuglet)' : ''}.`); } };
      if (t.frakt) { if (tid < t.ankommer) continue; if (t.tapt) { k.turer = k.turer.filter(q => q !== t); endret = true; const erst = Math.round(t.verdi * R.frakt.erstatning / 1000) * 1000; if (window.OppstartSpill && erst > 0) OppstartSpill.gi(erst);
          logg(`${R.frakt.firma} mistet lasten (${E.mengdeTekst(k.vare, t.mengde)} ${VN(k.vare)}) på vegen til ${k.ut.navn}. De erstatter ${kr(erst)}.`); continue; } framme(); continue; }
      const o = finnBil(t); if (!o) { k.turer = k.turer.filter(q => q !== t); endret = true; logg(`${t.bil} er borte – ${E.mengdeTekst(k.vare, t.mengde)} ${VN(k.vare)} gikk tapt på vegen til ${k.ut.navn}.`); continue; }
      if (Math.hypot(o.x - k.ut.x, o.y - k.ut.y) <= R.nær.fram) { o.vare = null; framme(); const L = leir(); if (L && auto() && window.kjørTil) { try { const p = kjørTil(o, L.x, L.y); if (p && p.catch) p.catch(() => {}); } catch (e) { /* blir stående */ } } }
    } }
    return endret;
  }
  function steg() {
    if (!start()) return; let endret = turSteg(); const U = utganger();
    for (const h of E.steg(S, tid, { rand: tilfV, avtale: k => { const u = utFor(k, U); return u ? !!u.avtale : !!(k.ut && k.ut.avtale); } })) {
      endret = true; const k = h.k;
      if (h.type === 'skipBestilt') logg(`Alt ligger på kaia i ${k.ut.navn}. Fraktskipet ${k.skip.navn} kommer om ca. ${tidT(k.skip.ankommer - tid)}.`);
      else if (h.type === 'skipKom') logg(`${k.skip.navn} har lagt til i ${k.ut.navn} og laster ${VN(k.vare)} til ${k.kjøper.by}.`);
      else if (h.type === 'levert') { logg(`Eksport levert: ${k.tittel}. ${k.kjøper.navn} betalte ${E.ekTekst(h.ek)}.`); visEuro(); }
      else if (h.type === 'tapt') logg(`${k.skip.navn} ble tatt av pirater på vei til ${k.kjøper.by} – lasten er tapt.${k.ut && !k.ut.avtale ? ' Med avtale med en havneby er det tryggere.' : ''}`);
      else if (h.type === 'utløpt') { const g = h.tilbake > 0 && VS() ? VS().legg(k.vare, h.tilbake) : 0; logg(`Eksportordren fra ${k.kjøper.navn} gikk ut på tid.${g > 0 ? ` ${E.mengdeTekst(k.vare, g)} ${VN(k.vare)} er kjørt tilbake til lageret.` : ''} Ryktet ute faller.`); }
    }
    const d = Math.floor(tid / 1440); if (d !== S.dag) { S.dag = d; endret = true; morgen(false); }
    if (endret) { lagre(); skitten = true; }
  }

  // ---------- handlingene ----------
  function kjøretid(km) { const F = R.frakt; return Math.round((F.fast + km * F.omveg / F.kmt) * 10) / 10; }
  function taOrdre(id, utId) {
    if (!start()) return { feil: 'Ingen leir.' }; const k = S.tilbud.find(q => q.id === id); if (!k) return { feil: 'Fant ikke ordren.' };
    const U = utganger(), ut = k.vei === 'grense' ? U.grense.find(g => g.id === utId) || U.grense[0] : (U.havn.find(h => h.id === utId) || valgFor(k, U)[0]);
    const r = E.ta(S, id, ut ? { slag: ut.slag, id: ut.id, navn: ut.navn, x: Math.round(ut.x), y: Math.round(ut.y), størrelse: ut.størrelse, avtale: !!ut.avtale } : null, tid);
    if (r.feil) return r; lagre(); skitten = true;
    return { ok: true, tekst: `Eksportordren er tatt: ${k.tittel}. Varene skal ${k.vei === 'sjø' ? 'til kaia i ' + r.k.ut.navn : 'over grensa ved ' + r.k.ut.navn} innen ${k.døgn} døgn.` };
  }
  function underveis(k) { return k.turer.reduce((s, t) => s + t.mengde, 0); }
  const igjen = k => Math.max(0, k.mengde - (k.vei === 'sjø' ? k.iHavn : k.levert) - underveis(k));
  // hvordan: 'bil' | 'frakt'; smugling (grense): uten avtale med Grensevakta
  function send(id, hvordan, smugling) {
    if (!start()) return { feil: 'Ingen leir.' }; const k = S.aktive.find(q => q.id === id); if (!k) return { feil: 'Fant ikke ordren.' }; const V = VS(), L = leir();
    if (!V || !V.har || !V.ta) return { feil: 'Lageret er ikke klart.' }; if (!k.ut) return { feil: 'Ordren har ingen havn eller grensestasjon.' };
    const rest = igjen(k), har = V.har(k.vare); if (rest <= .01) return { feil: k.vei === 'sjø' ? 'Resten er alt på kaia eller på vegen.' : 'Resten er alt på vegen.' };
    if (har <= .01) return { feil: `Lageret har ingen ${VN(k.vare)}.` };
    const grense = k.vei === 'grense', pris = E.turPris(infl());
    if (grense && !smugling && !S.grensevakt) return { feil: `Inngå avtale med ${R.grense.firma} først – eller smugle (gratis, men tollen kan ta lasten).` };
    if (grense && smugling && hvordan === 'frakt') return { feil: `${R.frakt.firma} smugler ikke.` };
    const dist = Math.hypot(k.ut.x - L.x, k.ut.y - L.y);
    if (hvordan === 'frakt') {
      const m = Math.round(Math.min(rest, har) * 10) / 10, verdi = Math.round(m * k.prisEk * E.kurs(infl())), fp = Math.round(verdi * R.frakt.andel / 1000) * 1000 + (grense ? pris : 0), timer = kjøretid(dist / 1000);
      if (tid + timer * 60 > k.frist) return { feil: `${R.frakt.firma} rekker ikke fristen (de trenger ca. ${nf(timer)} t).` };
      if (!(window.OppstartSpill && OppstartSpill.betal(fp))) return { feil: `Ikke nok penger til ${R.frakt.firma} (${kr(fp)}).` };
      V.ta(k.vare, m); k.turer.push({ frakt: true, mengde: m, ankommer: Math.round(tid + timer * 60), tapt: tilfV() < R.frakt.tap, verdi, pris: fp }); lagre(); skitten = true;
      return { ok: true, tekst: `${R.frakt.firma} henter ${E.mengdeTekst(k.vare, m)} ${VN(k.vare)} og kjører ${grense ? 'over grensa ved' : 'til kaia i'} ${k.ut.navn} – ca. ${nf(timer)} t, ${kr(fp)}.` };
    }
    const b = V.ledigBil ? V.ledigBil() : { feil: 'Ingen lastebil.' }; if (b.feil) return { feil: b.feil }; const o = b.bil;
    const kap = (window.Vare ? Vare.kapasitet(o) : 12) / ((R.VARER[k.vare] || {}).plass || 1), m = Math.round(Math.min(kap, rest, har) * 10) / 10; if (!(m > 0)) return { feil: 'Ingenting å laste.' };
    if (grense && !smugling && !(window.OppstartSpill && OppstartSpill.betal(pris))) return { feil: `Ikke nok penger til turen med ${R.grense.firma} (${kr(pris)}).` };
    V.ta(k.vare, m); o.vare = k.id; k.turer.push({ bil: o.navn, mengde: m, smugling: !!(grense && smugling) });
    // finner ikke bilen vegen dit (vegkartet mangler, for langt på telefon, utenfor spillkartet): lasten settes tilbake – Gråfjell kan ta den
    const angre = f => { const t = k.turer.find(q => q.bil === o.navn && !q.frakt); if (!t || o.sti) return; k.turer = k.turer.filter(q => q !== t); o.vare = null; V.legg(k.vare, t.mengde);
      logg(`${o.navn} finner ikke vegen til ${k.ut.navn}${f ? ' (' + f + ')' : ''}. Lasten er satt tilbake på lageret – prøv «La ${R.frakt.firma} ta det».`); lagre(); skitten = true; };
    try { if (window.kjørTil) { const p = kjørTil(o, k.ut.x, k.ut.y); if (p && p.then) p.then(r => { if (r && r.feil) angre(r.feil); }, () => angre('')); } } catch (e) { /* spilleren kan kjøre selv */ }
    lagre(); skitten = true;
    return { ok: true, tekst: `${o.navn} har lastet ${E.mengdeTekst(k.vare, m)} ${VN(k.vare)} og kjører ${grense ? (smugling ? 'mot grensa (smugling)' : `mot grensa – ${R.grense.firma} tar ${kr(pris)}`) : 'til kaia i ' + k.ut.navn} (${km(dist)} i luftlinje).` };
  }
  function avslå(id) { const n = S.tilbud.length; S.tilbud = S.tilbud.filter(k => k.id !== id); if (S.tilbud.length === n) return { feil: 'Fant ikke ordren.' }; lagre(); return { ok: true, tekst: 'Ordren er avslått.' }; }
  function avbryt(id) { const k = S.aktive.find(q => q.id === id); if (k && k.turer.length) return { feil: 'En last er på vegen – vent til den er framme.' };
    const r = E.avbryt(S, id); if (r.feil) return r; const g = r.tilbake > 0 && VS() ? VS().legg(r.k.vare, r.tilbake) : 0; lagre(); skitten = true;
    return { ok: true, tekst: `Eksportordren fra ${r.k.kjøper.navn} er avbrutt.${g > 0 ? ` ${E.mengdeTekst(r.k.vare, g)} ${VN(r.k.vare)} er kjørt tilbake til lageret.` : ''} Ryktet ute faller.` }; }
  function veksle(ek) { if (!start()) return { feil: 'Ingen leir.' }; const r = E.veksle(S, ek === 'alt' ? S.ek : +ek, infl()); if (r.feil) return r; if (window.OppstartSpill) OppstartSpill.gi(r.kr); lagre(); visEuro();
    return { ok: true, tekst: `Vekslet ${E.ekTekst(r.ek)} til ${kr(r.kr)} (kurs ${kr(E.kurs(infl()))}, gebyr ${Math.round(R.gebyr * 100)} %).` }; }
  // det dere kjøper ute: virkningen i spillet (lag, sekken, helikopteret)
  function heli() { try { const L = window.KjorSpill && KjorSpill.liste ? KjorSpill.liste() : null; return L ? L.find(q => q.type === 'heli') || null : null; } catch (e) { return null; } }
  function brukHelideler() { const h = heli(); if (!h || !(S.lager.helideler > 0) || !(h.hp < .995)) return { feil: !(S.lager.helideler > 0) ? 'Dere har ingen helikopterdeler.' : 'Helikopteret er helt.' };
    S.lager.helideler--; h.hp = 1; try { KjorSpill.lagre(); } catch (e) { /* */ } lagre(); return { ok: true, tekst: 'Helikopteret er reparert med de utenlandske delene.' }; }
  function kjøp(id) {
    if (!start()) return { feil: 'Ingen leir.' }; if (id === 'radio' && !lagUtenRadio().length) return { feil: 'Alle egne lag har alt feltradio.' };
    const r = E.kjøpUte(S, id); if (r.feil) return r; let t = `Kjøpt ute: ${r.ting.navn}.`;
    if (id === 'radio') { const L = lagUtenRadio(); for (const s of L) { if (window.KontrollromSpill && KontrollromSpill.girRadio) KontrollromSpill.girRadio(s, 'felt'); else s.radio = 'felt'; } t += ` ${L.map(s => s.navn).join(', ')} har fått feltradio.`; }
    else if (id === 'ammo') { if (window.UtstyrSpill && UtstyrSpill.leggTil) { UtstyrSpill.leggTil('a556', 300); UtstyrSpill.leggTil('a762', 60); t += ' Ammunisjonen ligger i sekken.'; } else t += ' Ammunisjonen ligger klar.'; }
    else if (id === 'helideler') { const h = heli(); if (h && h.hp < .995) { const b = brukHelideler(); if (b.ok) t += ' ' + b.tekst; } else t += ' Delene ligger på lager til helikopteret trenger dem.'; }
    lagre(); visEuro(); skitten = true; return { ok: true, tekst: t };
  }
  const lagUtenRadio = () => (typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s.side === ID && typeof levende === 'function' && levende(s) && !s.karakter && !s.leirvakt && s.radio !== 'felt') : []);
  function grensevakt(på) { if (!start()) return { feil: 'Ingen leir.' }; S.grensevakt = på !== false; lagre();
    return { ok: true, tekst: S.grensevakt ? `Avtale med ${R.grense.firma} (${R.grense.fulltNavn}): hver tur over grensa koster ${kr(E.turPris(infl()))}, og tollen slipper lasten gjennom.` : `Avtalen med ${R.grense.firma} er sagt opp.` }; }

  // ---------- kommandolaget ----------
  function registrer() {
    if (!window.Kommando || registrer.ferdig) return; registrer.ferdig = true; const K = Kommando, feil = r => (r.feil ? { feil: r.feil } : r);
    K.registrer('eksportTa', { leir: true, utfør: k => feil(taOrdre(k.id, k.ut)), beskriv: () => 'tar en eksportordre' });
    K.registrer('eksportSend', { leir: true, sjekk: k => (['bil', 'frakt'].includes(k.hvordan) ? null : 'Ugyldig valg.'), utfør: k => feil(send(k.id, k.hvordan, !!k.smugling)), beskriv: k => (k.smugling ? 'smugler en last over grensa' : 'sender en eksportlast') });
    K.registrer('eksportAvslå', { leir: true, utfør: k => feil(avslå(k.id)), beskriv: () => 'avslår en eksportordre' });
    K.registrer('eksportAvbryt', { leir: true, utfør: k => feil(avbryt(k.id)), beskriv: () => 'avbryter en eksportordre' });
    K.registrer('eksportVeksle', { leir: true, utfør: k => feil(veksle(k.ek)), beskriv: () => 'veksler eurokreditt' });
    K.registrer('eksportKjøp', { leir: true, sjekk: k => (R.BUTIKK[k.id] || k.id === 'brukHeli' ? null : 'Ukjent vare.'), utfør: k => feil(k.id === 'brukHeli' ? brukHelideler() : kjøp(k.id)), beskriv: () => 'kjøper noe ute' });
    K.registrer('eksportGrensevakt', { leir: true, utfør: k => feil(grensevakt(k.på !== false)), beskriv: () => 'avtale med Grensevakta' });
  }
  function kommando(type, data) { registrer(); const r = window.KOMMANDO ? KOMMANDO({ type, ...data, stille: true }) : null;
    const svar = r || { feil: 'Kommandolaget er ikke klart.' }, t = svar.feil || (svar.svar && svar.svar.tekst) || svar.tekst; if (t) logg(t); skitten = true; return svar; }

  // ---------- statuslinja: eurokreditten ved siden av kronene ----------
  let euro = null;
  function visEuro() { const st = document.querySelector('.stats'); if (!st) return;
    if (!euro) { euro = document.createElement('div'); euro.className = 'viktig'; euro.dataset.s = 'sEuro'; euro.innerHTML = '<b id="sEuro">0</b> <span>eurokreditt</span>'; euro.hidden = true; euro.title = 'Eurokreditt – utenlandske penger fra eksport. Taper seg ikke med inflasjonen. Veksles i Selskap → Oversikt → Eksport.';
      const p = document.getElementById('sPenger'), f = p && p.parentNode && p.parentNode.parentNode === st ? p.parentNode : null; if (f && f.nextSibling) st.insertBefore(euro, f.nextSibling); else st.appendChild(euro);
      euro.addEventListener('click', () => åpne()); }
    const ek = klar ? Math.floor(S.ek) : 0, t = ek.toLocaleString('nb-NO').replace(/\s/g, ' ') + ' EK'; euro.hidden = !(klar && S.ek >= 1); const b = euro.querySelector('b'); if (b.textContent !== t) b.textContent = t; }
  function åpne() { if (window.SelskapetSpill && SelskapetSpill.vis) SelskapetSpill.vis(true, 'oversikt'); setTimeout(() => { const h = document.getElementById('eksport'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start' }); }, 60); }

  // ---------- delen «Eksport» i Selskap → Oversikt ----------
  const css = document.createElement('style');
  css.textContent = `#selskapet .eks{ border:1px solid #4a4030; border-radius:4px; padding:7px 9px; margin:6px 0 10px; background:rgba(20,22,24,.35); }
#selskapet .eks .ekrad{ display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; margin:3px 0; } #selskapet .eks .ekrad b{ color:#e8d39a; }
#selskapet .eks small{ color:#a89970; } #selskapet .eks .ord{ border-top:1px solid #3a3326; padding:6px 0 4px; margin-top:6px; } #selskapet .eks .ord p{ margin:3px 0; font-size:13px; color:#c8bfa9; }
#selskapet .eks .ord .st{ color:#cfe0a8; font-size:13px; } #selskapet .eks .ord.tapt .st, #selskapet .eks .fare{ color:#e7a593; }
#selskapet .eks button{ min-height:32px; margin:2px 4px 2px 0; } #selskapet .eks .fram{ height:6px; background:#2a2f35; border-radius:3px; overflow:hidden; margin:4px 0; } #selskapet .eks .fram i{ display:block; height:100%; background:#c8963e; }`;
  document.head.appendChild(css);
  const kn = (tekst, sp, a = {}) => `<button type="button" data-sp="ek-${sp}"${Object.entries(a).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')}>${esc(tekst)}</button>`;
  function oversiktHtml() {
    if (!start()) return ''; const U = utganger(), åpen = åpenNå(U), ik = infl(), L = leir();
    let h = '<h3 id="eksport">Eksport</h3><div class="eks">';
    h += `<div class="ekrad"><b>${esc(E.ekTekst(S.ek))}</b><small>= ca. ${esc(kr(E.iKroner(S, ik)))} i dag · kurs ${esc(kr(E.kurs(ik)))} per eurokreditt (stiger med inflasjonen) · ryktet ute ${Math.round(S.rykte)}</small></div>`;
    if (S.ek >= 1) h += `<div class="ekrad">${kn('Veksle 10', 'veksle', { ek: 10 })}${kn('Veksle alt', 'veksle', { ek: 'alt' })}<small>Gebyr ${Math.round(R.gebyr * 100)} %. Eurokreditt taper seg ikke – kronene gjør.</small></div>`;
    // havnene og grensa
    const hv = U.havn.slice(0, 3).map(q => `${q.navn} (${q.størrelse}${q.avtale ? ', ' + q.hvorfor : ', uten avtale'}, ${km(q.d)})`).join(' · ');
    const gr = U.grense.slice(0, 2).map(g => `${g.navn} (${g.veg}, ${km(g.d)})`).join(' · ');
    h += `<p><small>Havner som tar skip: ${esc(hv || 'ingen innen ' + km(R.havnMaks) + ' – leirens kai må være middels eller stor, eller hold/få avtale med en havneby')}.<br>Grensestasjoner: ${esc(gr || 'ingen innen ' + km(R.grense.maks))}.</small></p>`;
    if (U.grense.length) h += `<div class="ekrad"><small>${esc(R.grense.firma)} (${esc(R.grense.fulltNavn)}): ${S.grensevakt ? `avtale – ${esc(kr(E.turPris(ik)))} per tur` : 'ingen avtale – lastene over grensa blir smugling'}</small>${S.grensevakt ? kn('Si opp avtalen', 'gv', { på: 0 }) : kn('Inngå avtale', 'gv', { på: 1 })}</div>`;
    if (!åpen && !S.tilbud.length && !S.aktive.length) h += `<p class="rolig">Eksportordrene kommer når selskapet når trinn ${R.trinn}, eller når dere har en havn som tar skip eller en grensestasjon innen ${km(R.grense.nær)} fra leiren.</p>`;
    // tilbudene
    for (const k of S.tilbud) { const valg = valgFor(k, U);
      h += `<div class="ord" data-ordre="${esc(k.id)}"><b>${esc(k.tittel)}</b><p>${esc(E.krav(k, ik))}</p><p><small>Tilbudet står i ${esc(tidT(Math.max(0, k.utløper - tid)))} til.</small></p>`
        + (valg.length ? valg.map(u => kn(`Ta – ${k.vei === 'sjø' ? 'via' : 'over grensa ved'} ${u.navn}`, 'ta', { id: k.id, ut: u.id })).join('') : `<p class="fare">${esc(k.vei === 'sjø' ? 'Ingen havn som tar lasten.' : 'Ingen grensestasjon innen rekkevidde.')}</p>`)
        + kn('Avslå', 'avslå', { id: k.id }) + '</div>'; }
    // de aktive
    for (const k of S.aktive) { const gjort = (k.vei === 'sjø' ? k.iHavn : k.levert) / k.mengde, rest = igjen(k), V = VS(), lager = V && V.har ? V.har(k.vare) : 0;
      h += `<div class="ord aktiv" data-ordre="${esc(k.id)}"><b>${esc(k.tittel)}</b><div class="fram"><i style="width:${Math.round(Math.min(1, gjort) * 100)}%"></i></div><p class="st">${esc(E.status(k, tid))}</p>`
        + `<p><small>${esc(E.ekTekst(k.betaling))} · frist om ${esc(tidT(Math.max(0, k.frist - tid)))} · lageret har ${esc(E.mengdeTekst(k.vare, lager))}${underveis(k) ? ` · ${esc(E.mengdeTekst(k.vare, underveis(k)))} på vegen` : ''}${L && k.ut ? ` · ${esc(km(Math.hypot(k.ut.x - L.x, k.ut.y - L.y)))} fra leiren` : ''}</small></p>`;
      if (rest > .01 && !(k.skip)) { if (k.vei === 'sjø') h += kn('Send lastebil', 'send', { id: k.id, v: 'bil' }) + kn(`La ${R.frakt.firma} ta det`, 'send', { id: k.id, v: 'frakt' });
        else h += (S.grensevakt ? kn(`Send lastebil (${kr(E.turPris(ik))})`, 'send', { id: k.id, v: 'bil' }) + kn(`La ${R.frakt.firma} ta det`, 'send', { id: k.id, v: 'frakt' }) : '') + kn(`Smugle (${Math.round(R.grense.beslag * 100)} % fare for beslag)`, 'send', { id: k.id, v: 'bil', smugling: 1 }); }
      h += kn('Vis i kartet', 'vis', { id: k.id }) + (k.skip && k.skip.ved ? '' : kn('Avbryt', 'avbryt', { id: k.id })) + '</div>'; }
    // det som bare finnes ute
    h += '<div class="ord"><b>Bare ute (betales i eurokreditt)</b>';
    for (const [id, T] of Object.entries(R.BUTIKK)) h += `<div class="ekrad"><span>${esc(T.navn)} – ${T.ek} EK</span><small>${esc(T.tekst)}</small>${kn('Kjøp', 'kjøp', { id })}</div>`;
    const hl = heli(); if (S.lager.helideler > 0) h += `<div class="ekrad"><small>Helikopterdeler på lager: ${S.lager.helideler}.</small>${hl && hl.hp < .995 ? kn('Reparer helikopteret', 'kjøp', { id: 'brukHeli' }) : ''}</div>`;
    h += '</div>';
    if (S.ferdige.length) h += `<p><small>Siste: ${S.ferdige.slice(0, 3).map(k => `${esc(k.kjøper.by)} ${esc(E.mengdeTekst(k.vare, k.mengde))} ${esc(VN(k.vare))} – ${{ levert: 'levert', tapt: 'tatt av pirater', utløpt: 'gikk ut', avbrutt: 'avbrutt' }[k.status] || esc(k.status)}`).join(' · ')}</small></p>`;
    return h + '</div>';
  }
  // knappene fra selskapspanel.js (data-sp="ek-…"). Svarer true når panelet bør tegnes på nytt
  function trykk(b) { const s = b.dataset.sp.slice(3), d = b.dataset;
    if (s === 'ta') kommando('eksportTa', { id: d.id, ut: d.ut });
    else if (s === 'avslå') kommando('eksportAvslå', { id: d.id });
    else if (s === 'avbryt') kommando('eksportAvbryt', { id: d.id });
    else if (s === 'send') kommando('eksportSend', { id: d.id, hvordan: d.v, smugling: d.smugling === '1' });
    else if (s === 'veksle') kommando('eksportVeksle', { ek: d.ek });
    else if (s === 'kjøp') kommando('eksportKjøp', { id: d.id });
    else if (s === 'gv') kommando('eksportGrensevakt', { på: d.på === '1' });
    else if (s === 'vis') { const k = S.aktive.find(q => q.id === d.id); if (k && k.ut) { if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false); kam.x = k.ut.x; kam.y = k.ut.y; if (kam.m < 20) kam.m = 25; skitten = true; if (window.SelskapetSpill) SelskapetSpill.vis(false); } }
    else return false; return true; }

  // ---------- kartet: veien til havna/grensa, og ut mot kjøperen ----------
  KROKER.tegn.push((g, vx0, vy1) => {
    if (!klar || !S.aktive.length) return; const m = kam.m, P = (x, y) => [(x - vx0) / m, (vy1 - y) / m], L = leir();
    g.save();
    for (const k of S.aktive) { if (!k.ut) continue; const [ux, uy] = P(k.ut.x, k.ut.y);
      if (L && igjen(k) + underveis(k) > .01) { const [lx, ly] = P(L.x, L.y); g.setLineDash([7, 6]); for (const [f, w] of [['rgba(18,20,23,.6)', 4.5], ['rgba(222,170,80,.9)', 2.5]]) { g.strokeStyle = f; g.lineWidth = w; g.beginPath(); g.moveTo(lx, ly); g.lineTo(ux, uy); g.stroke(); } g.setLineDash([]); }
      // ut mot havet / over grensa: en pil mot kjøperens by (høyst ca. 25 km lang i kartet, minst 60 punkter på skjermen)
      const dx = k.kjøper.x - k.ut.x, dy = k.kjøper.y - k.ut.y, d = Math.hypot(dx, dy) || 1, len = Math.max(60 * m, Math.min(25000, d)), ex = k.ut.x + dx / d * len, ey = k.ut.y + dy / d * len, [px, py] = P(ex, ey);
      g.strokeStyle = k.vei === 'sjø' ? 'rgba(120,170,210,.8)' : 'rgba(210,190,120,.8)'; g.lineWidth = 2.5; g.setLineDash(k.vei === 'sjø' ? [10, 6] : [4, 4]); g.beginPath(); g.moveTo(ux, uy); g.lineTo(px, py); g.stroke(); g.setLineDash([]);
      const a = Math.atan2(py - uy, px - ux); g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 10 * Math.cos(a - .45), py - 10 * Math.sin(a - .45)); g.lineTo(px - 10 * Math.cos(a + .45), py - 10 * Math.sin(a + .45)); g.closePath(); g.fill();
      g.font = '12px "Cormorant Garamond", serif'; g.fillStyle = '#e8dcb8'; g.fillText(`${k.kjøper.by} ↗`, px + 6, py - 4);
      // skipet ved kaia, eller merket for grensestasjonen
      if (k.skip && k.skip.ved) { g.fillStyle = '#d8e2ea'; g.strokeStyle = '#121417'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ux - 11, uy - 4); g.lineTo(ux + 11, uy - 4); g.lineTo(ux + 7, uy + 4); g.lineTo(ux - 8, uy + 4); g.closePath(); g.fill(); g.stroke(); g.fillRect(ux - 3, uy - 10, 6, 6); }
      else { g.strokeStyle = '#c8963e'; g.lineWidth = 2; g.beginPath(); g.arc(ux, uy, 6, 0, Math.PI * 2); g.stroke(); }
      for (const t of k.turer) { const o = t.bil ? finnBil(t) : null; if (!o) continue; const [x, y] = P(o.x, o.y); g.fillStyle = t.smugling ? '#b0443a' : '#7fa7c8'; g.strokeStyle = '#121417'; g.lineWidth = 1.5; g.fillRect(x - 4, y - 14, 8, 6); g.strokeRect(x - 4, y - 14, 8, 6); }
    }
    g.restore();
  });

  // ---------- takten ----------
  let sist = 0;
  KROKER.sim.push(() => { if (performance.now() - sist < 500) return; sist = performance.now(); try { steg(); visEuro(); } catch (e) { /* neste gang */ } });
  window.addEventListener('riksbrudd-spill', () => { klar = false; start(); visEuro(); });

  Object.assign(api, { tilstand: () => S, start, lagre, havner, grenser, utganger, åpenNå, valgFor, morgen, steg, turSteg, ta: taOrdre, send, avslå, avbryt, veksle, kjøp, brukHelideler, grensevakt,
    oversiktHtml, trykk, åpne, visEuro, kommando, infl, nullstill: () => { S = E.ny(); lagre(); visEuro(); } });
  window.EksportSpill = api;
})();
