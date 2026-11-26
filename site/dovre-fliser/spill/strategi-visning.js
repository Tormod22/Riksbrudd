'use strict';
/* Riksbrudd – KRIGSKARTET (17. nov, brukeren: «vi må få frem strategielementet mye bedre»). Reglene: spill/strategi.js.
 * Knappen «Krig» (tast T) viser hele området krigen står om: tettstedene som merker i eierens farge med området de rår over,
 * frontene mellom sidene, lagene dine med ordrene sine – og et panel med STILLINGEN (hvor stor del av folket hver side holder,
 * og streken for seier), NESTE TREKK (de tre beste målene er også nummerert i kartet, med «Send» som gir nærmeste ledige lag ordre),
 * TRUSLENE mot det du holder, og LAGENE dine. Trykk på et tettsted i krigskartet for å se det og sende et lag dit.
 * Zoomet ut ser du fargene også utenom krigskartet. Statuslinja viser andelen din hele tiden. Seier ved 60 % – og taper du løpet,
 * får du vite det. window.StrategiSpill. I testene (navigator.webdriver) kommer ikke kortene av seg selv (StrategiSpill.test).
 */
(function () {
  const S = window.Strategi, G = window.Garnison; if (!S || !G) return;
  const NØKKEL = 'riksbrudd-strategi', auto = () => !navigator.webdriver || api.test;
  let åpen = false, valgtBy = null, førKam = null, byer = [], byNøkkel = '', sist = '', meldt = { leir: '', vunnet: false, tapt: false, fare: {} };
  // panelet skjult til en stripe (huskes i denne nettleseren; bare en bekvemmelighet)
  let inne = false; try { inne = localStorage.getItem('riksbrudd-krigpanel') === 'inn'; } catch (e) { inne = false; }
  const el = (t, a = {}, ...barn) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === 'klasse') e.className = v; else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v); } e.append(...barn); return e; };
  const knapp = (tekst, fn, a = {}) => { const b = el('button', a, tekst); b.onclick = fn; return b; };
  // TILLEGG (18. nov, runde 4 – pakke «sjø»/økonomi): andre moduler legger linjer i panelet uten å endre denne fila.
  // window.KRIG_TILLEGG = { by: [(tettsted, eier) => tekst | element], trekk: [(tettsted, eier) => …], side: [side => …] }
  // – by: boksen for det valgte tettstedet, trekk: radene i «Neste trekk», side: under hver side i stillingen. tettsted = INFRA-objektet.
  const KT = window.KRIG_TILLEGG = window.KRIG_TILLEGG || {}; for (const k of ['by', 'trekk', 'side']) KT[k] = KT[k] || [];
  const tillegg = (hvor, ...a) => { const ut = []; for (const f of KT[hvor]) { try { const r = f(...a); if (r) ut.push(typeof r === 'string' ? el('small', { klasse: 'tillegg' }, r) : r); } catch (e) { /* tillegget er valgfritt */ } } return ut; };
  const tall = v => Math.round(v).toLocaleString('nb-NO'), km = v => (v < 10 ? String(Math.round(v * 10) / 10).replace('.', ',') : String(Math.round(v))) + ' km';
  const fraksjon = side => (window.Fraksjoner && Fraksjoner.FRAKSJONER[side]) || { navn: side, eieform: side };
  const navn = side => (side === 'blå' ? 'Du' : fraksjon(side).navn);
  const leir = () => { const T = window.OppstartSpill && OppstartSpill.tilstand(); if (T && T.leir) return T.leir; const b = window.OLJE && OLJE.BASER[0]; if (b) return { x: b.x, y: b.y }; const s = ENHETER.find(e => e.side === 'blå'); return s ? { x: s.x, y: s.y } : null; };
  const eierAv = id => G.tilstand(TETTSTEDER, id).eier;
  const punkt = by => { let p = null; try { if (typeof navnP === 'function') p = navnP(by); } catch (e) { p = null; } return p && isFinite(p[0]) ? [p[0], p[1]] : [(by.bb[0] + by.bb[2]) / 2, (by.bb[1] + by.bb[3]) / 2]; };
  function område() { const L = leir(), alle = typeof INFRA !== 'undefined' && INFRA && INFRA.tettsted; if (!L || !alle) return [];
    const id = Math.round(L.x) + ',' + Math.round(L.y); if (meldt.leir !== id) les(id);
    const k = id + ',' + alle.length + (window.SPILLOMRÅDE ? 'o' : '') + ',' + (meldt.nivå || 0); if (k === byNøkkel) return byer; byNøkkel = k;
    byer = S.område(L, alle.map(by => { const [x, y] = punkt(by); return { id: by.e.id, navn: by.e.navn, x, y, folk: by.e.folk || 0, ref: by }; }).filter(b => !window.OMRÅDE_OK || OMRÅDE_OK(b.x, b.y)), regionRegler()); return byer; }
  // STØRRE REGION (natt 18. nov): hver seier du velger «større region» etter, ganger radien med 1,6 og krever seks tettsteder til (Claudes forslag, spill/scenario.js)
  function regionRegler() { const n = meldt.nivå || 0, SR = (window.Scenario && Scenario.REGLER) || { regionFaktor: 1.6, regionMinst: 6 }; return n ? { ...S.REGLER, radius: S.REGLER.radius * SR.regionFaktor ** n, minst: S.REGLER.minst + SR.regionMinst * n, maksRadius: S.REGLER.maksRadius * SR.regionFaktor ** n } : S.REGLER; }
  // (kritikerløkka r2) lag og fiender med ugyldig plass (NaN) er ikke med i krigsbildet
  const gyldig = e => Number.isFinite(e.x) && Number.isFinite(e.y);
  const egneLag = () => ENHETER.filter(e => e.side === 'blå' && !e.karakter && levende(e) && gyldig(e));
  const fiender = () => ENHETER.filter(e => e.side !== 'blå' && levende(e) && gyldig(e) && synlig(e)).map(e => ({ x: e.x, y: e.y, navn: e.navn, side: e.side, styrke: window.Fraksjoner ? Fraksjoner.styrke(e) : 8 }));
  const garnison = id => { const b = byer.find(q => q.id === id); return b ? G.lagI(b.ref, egneLag()).length : 0; };
  const iBy = s => byer.find(b => G.inni(b.ref, s.x, s.y));
  // lagene som kan sendes: uten ordre, og ikke eneste garnison i et eget tettsted (det skal holdes)
  // (runde 12) et lag om bord i et kjøretøy som kjører, er ikke ledig; kontakt = ordren når fram (radio, eller garnison i et tettsted)
  function ledige() { return egneLag().filter(s => !s.sti && !s.planlegger && !(s.ombord && (s.ombord.sti || s.ombord.oppdrag))).map(s => { const b = iBy(s); return { x: s.x, y: s.y, navn: s.navn, lag: s, kontakt: kontakt(s), holder: !!(b && eierAv(b.id) === 'blå' && G.lagI(b.ref, egneLag()).length === 1) }; }); }
  function bilde() { const B = område(); if (!B.length) return null; const st = S.stilling(B, eierAv), led = ledige(), fri = led.filter(l => !l.holder), fi = fiender();
    // (runde 12) forslagene bruker lag du har kontakt med; har du ingen, foreslås de andre (med grå knapp og forklaring)
    const medK = fri.filter(l => l.kontakt), kand = medK.length ? medK : fri.length ? fri : led;
    return { byer: B, st, ut: S.utfall(st, undefined, auto() && typeof tid === 'number' ? tid : undefined), trekk: S.trekk('blå', B, eierAv, kand, fi, undefined, { liste: meldt.tap || [], nå: typeof tid === 'number' ? tid : 0 }, b => (eierAv(b.id) === 'blå' ? 0 : kjentForsvar(b).mann)), trusler: S.trusler('blå', B, eierAv, garnison, fi), fronter: S.fronter(B, eierAv), fiender: fi, ledige: led }; }

  // ---------- radioen (runde 12, PC-kritiker F) ----------
  // «Vaktlaget ble sendt 8 km til Løkken uten advarsel, og etterpå når ingen ordre fram»: før et lag sendes ut av radiorekkevidden,
  // står en advarsel i panelet med valgene «Send likevel», «Gi feltradio og send» og «Send et lag med feltradio». Lag du ikke har
  // kontakt med nå, får grå knapper med forklaring. Kontrollrommet (spill/kontrollrom-visning.js) har reglene; uten det er alt som før.
  const KR = () => (window.KontrollromSpill && KontrollromSpill.på && KontrollromSpill.på() && KontrollromSpill.kanNå ? KontrollromSpill : null);
  const kontakt = s => { const k = KR(); return !k || k.kanNå(s); };
  const radioNavn = s => ((s.radio || 'hånd') === 'felt' ? 'feltradio' : 'håndradio');
  const kroner = v => (window.Oppstart && Oppstart.kroner ? Oppstart.kroner(v) : tall(v) + ' kr');

  // ---------- terrenget mellom leiren og målet (runde 13, kritiker H) ----------
  // «Spillet foreslo "Send Speidertropp 1 i stedet (feltradio)", men troppen mistet kontakten: terrenget kuttet feltradioen til 2,8 km.»
  // Før et lag sendes, regnes høydeprofilen fra leiren til målet ut på samme måte som kontrollrommet gjør for lagene (128 m-ruter,
  // jordkrumning, antenne 2 m ved laget og 4 m – eller radiomasten – ved leiren). Står terrenget i veien, rekker radioen bare
  // Kontrollrom.REGLER.terreng (35 %) så langt. Svaret huskes per sted (250 m-ruter) og radiomast.
  const TERRENG = new Map();
  const KRR = () => window.Kontrollrom;
  const terrengNøkkel = p => { const k = KR(); let m = 0; try { m = k && k.mast ? k.mast() : 0; } catch (e) { m = 0; } return Math.round(p.x / 250) + ',' + Math.round(p.y / 250) + ',' + (m || 0); };
  const høydeI = (v, x, y) => { const [i, j] = Terreng.rute(v, x, y); const h = v.H[Math.max(0, Math.min(v.h - 1, j)) * v.w + Math.max(0, Math.min(v.w - 1, i))]; return h === h ? h : 0; };
  // true = terrenget står i veien, false = fri linje, undefined = ikke sjekket ennå
  const terrengKjent = p => { const t = TERRENG.get(terrengNøkkel(p)); return t && !t.venter ? t.blokk : undefined; };
  function terrengSjekk(p) { const k = KR(), L = leir(), K = KRR(); if (!k || !L || !K || !K.blokkert || typeof lagVindu !== 'function' || !window.Terreng) return Promise.resolve(null);
    const n = terrengNøkkel(p), har = TERRENG.get(n); if (har) return har.venter || Promise.resolve(har.blokk);
    const d = Math.hypot(p.x - L.x, p.y - L.y); if (d <= 1200) { TERRENG.set(n, { blokk: false }); return Promise.resolve(false); }
    if (TERRENG.size > 300) TERRENG.clear();
    const venter = (async () => { let blokk = null;
      try { const v = await lagVindu([Math.min(p.x, L.x) - 300, Math.min(p.y, L.y) - 300, Math.max(p.x, L.x) + 300, Math.max(p.y, L.y) + 300], false, 7), N = 24, P = [];
        for (let i = 0; i <= N; i++) P.push(høydeI(v, p.x + (L.x - p.x) * i / N, p.y + (L.y - p.y) * i / N));
        let m = 0; try { m = k.mast ? k.mast() : 0; } catch (e) { m = 0; }
        blokk = K.blokkert(P, P[0] + K.REGLER.antenne, P[N] + (m ? K.REGLER.mastHøyde : 4), d); } catch (e) { blokk = null; }
      if (blokk === null) TERRENG.delete(n); else TERRENG.set(n, { blokk }); return blokk; })();
    TERRENG.set(n, { venter }); return venter; }
  // hvor langt et lags radio rekker ut til punktet p: { r (med terrenget), full (uten), terreng (true når terrenget kutter) }
  function rekkeviddeTil(s, p, radio) { const k = KR(), K = KRR(); const full = k.rekkevidde(s, radio), b = terrengKjent(p) === true;
    return { r: b ? full * ((K && K.REGLER.terreng) || .35) : full, full, terreng: b }; }
  // når ordrene ikke når laget ute ved målet: { d (meter fra leiren), r (rekkevidden med terrenget), full, terreng }, ellers null
  function utenforRadio(s, by) { const k = KR(), L = leir(); if (!k || !L || !k.rekkevidde) return null; const d = Math.hypot(by.x - L.x, by.y - L.y), R = rekkeviddeTil(s, by); return d > R.r ? { d, ...R } : null; }
  const radioTekst = (s, R) => `${radioNavn(s)} ${km(R.full / 1000)}` + (R.terreng ? `, men terrenget står i veien: ${km(R.r / 1000)}` : '');
  const hvorforIkke = s => { const k = KR(); let t = ''; try { t = k && k.hvorfor ? k.hvorfor(s) : ''; } catch (e) { t = ''; } return `Ingen radiokontakt med ${s.navn}` + (t ? ` (${t})` : '') + ' – ordren når ikke fram.'; };

  // ---------- forsvaret der laget skal (runde 13, kritiker G og H) ----------
  // G: «Speidertropp 1 (4 mann) ble sendt til Lærdalsøyri ("nøytralt", trenger 5 mann) uten advarsel – alle fire døde.» H: «bygdevernet i
  // Vikeså (7 mann) ville ikke slippe oss inn – avtalen kom først da laget var uten kontakt.» Nå sier «Neste trekk» hva stedet forsvares
  // med, og før laget går, står det i advarselen: for få mann, bygdevern (med avtalen som knapp), fiender som er sett der, speidere som
  // ville gått inn i kamp, og at leiren står uten vakt når det siste laget går.
  // Bygdevernet (spill/krig-visning.js): T.vern[id] = mann igjen (> 0), −1 = avtale, 0 = har gitt opp, mangler = ikke møtt ennå (da Krig.vernMenn).
  function vern(by) { const KS = window.KrigSpill, K = window.Krig; if (!KS || !KS.T || !K || !K.vernMenn || eierAv(by.id)) return null; let st; try { st = KS.T().vern[by.id]; } catch (e) { return null; }
    const pris = K.vernPris ? K.vernPris(by.folk) : 0; if (st === -1) return { mann: 0, avtale: true, pris }; if (st === 0) return { mann: 0, borte: true, pris };
    // (R1-løkka 26. nov) på oppdrag for bygdelaget/kommunen her: vernet slipper dere inn (spill/krig-visning.js vern)
    { const o = window.SelskapSpill && SelskapSpill.oppdragFor ? SelskapSpill.oppdragFor(by.id) : null; if (o) return { mann: 0, oppdrag: o.giver.navn, pris }; }
    return { mann: st > 0 ? st : K.vernMenn(by.folk), kjent: st > 0, pris }; }
  const vernTekst = v => (!v ? '' : v.oppdrag ? `bygdevernet slipper dere inn (oppdrag for ${v.oppdrag})` : v.avtale ? 'avtale med bygdevernet' : v.borte ? 'bygdevernet har gitt opp' : `bygdevernet: ${v.mann} mann`);
  // avtalen med bygdevernet før laget går inn (et vern dere ikke har møtt ennå, settes opp først – samme tall som når dere kommer)
  function avtale(by) { const KS = window.KrigSpill, K = window.Krig; if (!KS || !KS.vernAvtale || !KS.T) return false; const T = KS.T(); if (T.vern[by.id] === undefined && K && K.vernMenn) T.vern[by.id] = K.vernMenn(by.folk); return KS.vernAvtale(by.id); }
  // fiender som er sett i og rundt tettstedet (det kartet viser nå)
  const fienderVed = by => fiender().filter(f => Math.hypot(f.x - by.x, f.y - by.y) <= 2500);
  // speidertroppen (malen «Speidertropp» i Tropper): finner fienden uten å slåss
  const speider = s => !!s && (s.mal === 'speider' || /^speider/i.test(s.navn || ''));
  // Claudes forslag: lag innen 600 m fra leiren som står stille, regnes som vakt ved leiren
  const VAKT_NÆR = 600;
  // farene ved å sende lagListe til by; t = trekket fra Strategi.trekk (kan mangle). alvor ≥ 1 gir en advarsel før laget går.
  // ---------- (runde 14, kritiker I) KJENT FORSVAR OG FREDSTID ----------
  // «Vaktlaget sto et døgn 780 m fra tre fiendelag ved Rognan – ingen kamp, ingen melding.» Forsvaret i mann regnes av det dere vet:
  // fiendelag dere ser nå, der fiendelag sist ble sett (e.sett, høyst SETT_MAKS spillminutter gammelt), og – i en by fienden holder –
  // etterretningens anslag over garnisonen (lagene som står i byen, rundet til nærmeste 5). Claudes forslag: SETT_MAKS 1440 (ett døgn),
  // anslaget er et valg (fienden har holdt byen åpent siden starten, «Ravnsund holder til i …»).
  const SETT_MAKS = 1440;
  function kjentForsvar(by) { const e = eierAv(by.id), ref = by.ref, r = ref ? Math.max(2500, byRadius(by) + 600) : 2500; let sett = 0, lagSett = 0, anslag = 0, lagA = 0;
    for (const f of ENHETER) { if (f.side === 'blå' || !levende(f) || f.karakter) continue; const st = window.Fraksjoner ? Fraksjoner.styrke(f) : 8;
      const ser = (() => { try { return synlig(f); } catch (x) { return false; } })();
      const p = ser ? f : f.sett && Number.isFinite(f.sett.x) && tid - (f.sett.tid || 0) <= SETT_MAKS ? f.sett : null;
      if (p && Math.hypot(p.x - by.x, p.y - by.y) <= r) { sett += st; lagSett++; continue; }
      if (e && e !== 'blå' && f.side === e && ref && G.inni(ref, f.x, f.y)) { anslag += st; lagA++; } }
    const v = vern(by), vm = v && v.mann > 0 ? v.mann : 0, a = anslag ? Math.max(5, Math.round(anslag / 5) * 5) : 0;
    return { mann: Math.round(sett + a + vm), sett: Math.round(sett), lagSett, anslag: a, lagA, vern: vm, eier: e }; }
  function forsvarTekst(k) { const d = []; if (k.vern) d.push(`bygdevernet: ${k.vern} mann`); if (k.sett) d.push(`${k.lagSett === 1 ? '1 lag' : k.lagSett + ' lag'} sett (ca. ${k.sett} mann)`);
    if (k.anslag) d.push(`garnison ${k.lagA === 1 ? '1 lag' : k.lagA + ' lag'}, anslått ca. ${k.anslag} mann`); return d.join(' + '); }
  // fredstiden: motstanderne slåss ikke om tettsteder før den er over (spill/fraksjoner-visning.js, AI.regionFred)
  const fredSlutt = () => { if (!window.Fraksjoner || !Fraksjoner.fredDøgn || !window.AI || AI.på === false || (navigator.webdriver && !AI.test && !api.test)) return 0; const f = (window.SPILLREGLER && SPILLREGLER.faktor && SPILLREGLER.faktor.fiende) || 1; return Fraksjoner.fredDøgn(f) * 1440; };
  const fredTekst = () => { const s = fredSlutt(); return s && tid < s ? `fredstid til dag ${Math.floor(s / 1440) + 1}${typeof klokkeslett === 'function' ? ' kl. ' + klokkeslett(s) : ''} – ingen kamp om byen før det` : ''; };
  function farer(by, lagListe, t) { const ut = [], e = eierAv(by.id), kf = e === 'blå' ? { mann: 0 } : kjentForsvar(by), fred = e && e !== 'blå' ? fredTekst() : '';
    if (t && e !== 'blå' && (t.minst || kf.mann)) { const k = S.kravFor(t, lagListe, kf.mann); if (k.tekst) ut.push({ id: !k.nok ? 'forfå' : k.svak ? 'svak' : 'sakte', tekst: k.tekst + '.', alvor: k.nok && !k.svak && !kf.mann ? 0 : 2 }); }
    const v = vern(by); if (v && v.mann > 0) ut.push({ id: 'vern', tekst: `Bygdevernet i ${by.navn} (${v.mann} mann) slipper dere ikke inn – laget må slåss, eller dere gjør en avtale først (${kroner(v.pris)}).`, alvor: 2, vern: v });
    if (kf.sett || kf.anslag) ut.push({ id: 'fiende', tekst: `${by.navn} forsvares: ${forsvarTekst({ ...kf, vern: 0 })}.` + (fred ? ` Det er ${fred}.` : ''), alvor: 2 });
    else if (fred) ut.push({ id: 'fred', tekst: `Det er ${fred}.`, alvor: 1 });
    // (R1-løkka 26. nov, kritikken: «marsjen til Kvam gikk gjennom Otta, og laget havnet i kamp med bygdevernet uten varsel») ligger et
    // fiendtlig tettsted mellom laget og målet (rett linje – den ekte ruta prøver å gå utenom, spill/krig-visning.js), står det her,
    // med en avtale som valg når det er et bygdevern
    { const KS = window.KrigSpill, s0 = lagListe[0]; if (KS && KS.ruteGjennom && s0) { let gj = []; try { gj = KS.ruteGjennom([[s0.x, s0.y], [by.x, by.y]], [[s0.x, s0.y], [by.x, by.y]]); } catch (e) { gj = []; }
      for (const b of gj) { const K = window.Krig, vpris = K && K.vernPris ? K.vernPris(b.by.e.folk) : 0;
        ut.push({ id: 'rute', tekst: `Ruta kan gå gjennom ${b.navn} (${b.grunn}). Laget går utenom når det finnes en god omveg – ellers havner det i kamp der${b.mann ? ', eller gjør en avtale med bygdevernet først' : ''}.`, alvor: 1,
          gjennom: b.mann ? { id: b.by.e.id, folk: b.by.e.folk || 0, navn: b.navn, pris: vpris } : null }); } } }
    const sp = lagListe.filter(speider); if (sp.length && ut.some(f => f.id === 'vern' || f.id === 'fiende')) ut.push({ id: 'speider', tekst: `${sp.map(q => q.navn).join(' og ')} skal finne fienden uten å slåss. Med «Speid og meld» stopper ${sp.length > 1 ? 'de' : 'troppen'} før ${by.navn} og melder hva som står der.`, alvor: 1 });
    const L = leir(); if (L) { const hjemme = egneLag().filter(s => !s.leirvakt && !s.ai && !s.sti && Math.hypot(s.x - L.x, s.y - L.y) <= VAKT_NÆR);
      if (hjemme.length && hjemme.every(s => lagListe.includes(s))) ut.push({ id: 'leir', tekst: `Leiren står uten vakt: ${hjemme.map(s => s.navn).join(' og ')} er ${hjemme.length > 1 ? 'de siste lagene' : 'det siste laget'} ved leiren.`, alvor: 1 }); }
    return ut; }

  // ---------- speid og meld (runde 13) ----------
  // Speidere stopper før et forsvart tettsted (Claudes forslag: 400 m utenfor kanten) og melder bygdevernet og fiendene de ser.
  // Gjelder også ordre gitt i kartet: en speidertropp på marsj som er i ferd med å gå inn i et forsvart sted, stopper og melder.
  const SPEID = { utenfor: 400, framover: 450 };
  const byRadius = by => { const bb = by.ref && by.ref.bb; return bb ? Math.max(250, Math.min(1500, Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) * .3)) : 600; };
  function speidPunkt(s, by) { const d = Math.hypot(by.x - s.x, by.y - s.y), stopp = d - byRadius(by) - SPEID.utenfor; if (stopp < 80) return null; return { x: s.x + (by.x - s.x) * stopp / d, y: s.y + (by.y - s.y) * stopp / d }; }
  function speid(by, lagListe) { for (const s of lagListe) { if (!kanSendes(s)) continue; const p = speidPunkt(s, by); s.speid = { id: by.id, navn: by.navn, x: by.x, y: by.y, t: tid };
      if (p) { if (s.ombord && typeof window.kjørTil === 'function') { s.avstigning = { x: p.x, y: p.y, navn: 'utkanten av ' + by.navn, t: tid }; window.kjørTil(s.ombord, p.x, p.y); } else ordre(s, p.x, p.y, true); logg(`${s.navn} speider mot ${by.navn}: stopper ca. ${km(SPEID.utenfor / 1000 + byRadius(by) / 1000)} fra midten og melder hva som står der.`); }
      else { s.sti = null; meldSpeid(s); } }
    advarsel = null; valgtBy = by; vis(true); skitten = true; }
  function speidRapport(s, by) { const v = vern(by), fs = fiender().filter(f => Math.hypot(f.x - by.x, f.y - by.y) <= 3000), deler = [];
    if (v) deler.push(v.mann > 0 ? `bygdevernet har ${v.mann} mann` : vernTekst(v)); if (fs.length) deler.push(`${fs.length === 1 ? fs[0].navn : fs.length + ' fiendelag'} (ca. ${Math.round(fs.reduce((a, f) => a + (f.styrke || 0), 0))} mann)`);
    // (R2-løkka) ett tall: det inntaket krever og mer enn forsvaret (Strategi.anbefalt) – samme tall som i Krig og i loggen
    const anb = S.anbefalt(G.minstFor(by.folk || 0), (v && v.mann > 0 ? v.mann : 0) + Math.round(fs.reduce((a, f) => a + (f.styrke || 0), 0)));
    const råd = v && v.mann > 0 ? ` Gjør en avtale (${kroner(v.pris)}) i Krig, eller send minst ${anb} mann.` : fs.length ? ` Send minst ${anb} mann.` : ' Veien er fri.';
    return `${s.navn} ved ${by.navn}: ${deler.length ? deler.join(', ') : 'ingen forsvar å se'}.` + råd; }
  function meldSpeid(s) { const by = område().find(b => b.id === s.speid.id) || s.speid, t = speidRapport(s, by); if (kontakt(s)) { logg('📻 ' + t); delete s.speid; } else s.speid.venter = t; }
  let speidAkk = 0;
  KROKER.sim.push(dt => { speidAkk += dt; if (speidAkk < 1) return; speidAkk = 0;
    for (const s of ENHETER) { if (s.side !== 'blå' || !speider(s) || !levende(s)) continue;
      // meldingen som venter på radiokontakt
      if (s.speid && s.speid.venter) { if (kontakt(s)) { logg('📻 ' + s.speid.venter + ' (meldt da kontakten kom tilbake)'); delete s.speid; } continue; }
      if (s.speid && !s.sti && !s.planlegger && !(s.ombord && s.ombord.sti) && !s.avstigning) { meldSpeid(s); continue; }
      // ordre gitt i kartet: stopp før et forsvart tettsted
      if (s.sti && !s.speid && auto()) { const B = område(); let rest = SPEID.framover, x = s.x, y = s.y;
        for (let i = (s.seg || 0) + 1; i < s.sti.length && rest > 0; i++) { const q = s.sti[i], d = Math.hypot(q[0] - x, q[1] - y), f = Math.min(1, rest / Math.max(1, d)), px = x + (q[0] - x) * f, py = y + (q[1] - y) * f; rest -= d; x = q[0]; y = q[1];
          const by = B.find(b => b.id !== s.speidLikevel && Math.hypot(b.x - px, b.y - py) < 6000 && G.inni(b.ref, px, py) && !G.inni(b.ref, s.x, s.y)); if (!by) continue;
          const v = vern(by); if (!(v && v.mann > 0) && !fienderVed(by).length) continue;
          s.sti = null; s.kø = null; s.køSlutt = null; s.siktSkitten = true; s.speid = { id: by.id, navn: by.navn, x: by.x, y: by.y, t: tid }; logg(`${s.navn} stopper før ${by.navn} – speidere går ikke inn i et forsvart sted.`); meldSpeid(s); skitten = true; break; } } } });
  // ---------- (runde 14, kritiker I) FRAMME VED ET STED LAGET IKKE KAN TA ----------
  // «Vaktlaget sto et døgn 780 m fra tre fiendelag ved Rognan, uten kamp og uten forklaring» (fredstid). Står et eget lag stille ved et
  // tettsted det ikke holder (inne i det, eller innen FRAM.nær meter fra kanten) i FRAM.vent spillminutter uten at inntaket går, skrives
  // grunnen i loggen én gang, og ⏭ stopper (Flyt, «riksbrudd-hendelse»). Laget på stedet ser hva som står der, så alle fiendelag innen
  // FRAM.ser meter telles. Claudes forslag: nær 600 m, vent 20 min, ser 1500 m.
  const FRAM = { nær: 600, vent: 20, ser: 1500 };
  function hvorforIkkeTar(s, by) { const t = G.tilstand(TETTSTEDER, by.id), e = t.eier; if (e === 'blå') return null;
    if (t.inntar && t.inntar.side === 'blå' && !t.forFå) return null;
    const fi = ENHETER.filter(f => f.side !== 'blå' && levende(f) && !f.karakter && (Math.hypot(f.x - s.x, f.y - s.y) <= FRAM.ser || (by.ref && G.inni(by.ref, f.x, f.y))));
    const mann = Math.round(fi.reduce((a, f) => a + (window.Fraksjoner ? Fraksjoner.styrke(f) : 8), 0)), v = vern(by), fr = fredTekst(), har = Math.floor(window.Fraksjoner ? Fraksjoner.styrke(s) : 4);
    const sider = [...new Set(fi.map(f => f.side))].map(q => fraksjon(q).navn).join(' og ');
    if (fi.length) return `${s.navn} er ved ${by.navn}, men ${e && e !== 'blå' ? 'byen holdes av' : 'der står'} ${fi.length === 1 ? '1 lag' : fi.length + ' lag'} (${mann} mann${sider ? ', ' + sider : ''})` +
      (fr ? ` – ${fr}.` : mann >= har ? ` – laget (${har} mann) er for svakt til å ta byen. Send flere lag, eller trekk laget tilbake.` : ' – laget tar ikke byen før de er slått.');
    // (R2-løkka 26. nov, kritikken: «Vaktlaget er i Elverum, men er for få … 2. tropp er i Elverum, men er for få» – to meldinger, og ingen
    // sa hvor mange de var til sammen) alle egne lag ved stedet nevnes i én melding, med summen av mennene inne i tettstedet (de som teller
    // for inntaket), lagene som står utenfor kanten, og ett tall for hva som trengs (Strategi.anbefalt: inntaket og mer enn bygdevernet)
    const L = samletVed(by), anb = S.anbefalt(G.minstFor(by.folk), v && v.mann > 0 ? v.mann : 0);
    const utenfor = L.ute.length ? ` ${liste(L.ute)} står utenfor tettstedet og teller ikke – gi ${L.ute.length > 1 ? 'dem' : 'laget'} ordre inn til midten.` : '';
    if (v && v.mann > 0) return `${liste(L.alle)} ${L.alle.length > 1 ? 'er' : 'er'} ved ${by.navn}, men bygdevernet (${v.mann} mann) slipper ikke ${L.alle.length > 1 ? 'lagene' : 'laget'} inn. Gjør en avtale (${kroner(v.pris)}) i Krig, eller send minst ${anb} mann – dere har ${L.har} der.` + utenfor;
    if (t.forFå || (t.inntar === null && G.inni(by.ref, s.x, s.y) && !G.fart(L.har, by.folk))) return `${L.inne.length ? liste(L.inne) : s.navn} ${L.inne.length > 1 ? 'er' : 'er'} i ${by.navn}, men ${L.inne.length > 1 ? 'de er' : 'laget er'} for få til å ta det: ${L.inne.length > 1 ? 'til sammen ' : ''}${L.har} mann, og det trengs minst ${anb}.` + utenfor + ' Send flere lag.';
    if (!G.inni(by.ref, s.x, s.y)) return `${s.navn} står utenfor ${by.navn} og tar det ikke herfra – gi laget ordre inn til midten.`;
    return null; }
  // egne lag ved tettstedet (inne i det, eller innen FRAM.nær meter fra kanten) som står stille: { alle, inne, ute, har (mann inne) }
  function samletVed(by) { const alle = egneLag().filter(s => !s.sti && !s.ombord && by.ref && (G.inni(by.ref, s.x, s.y) || Math.hypot(by.x - s.x, by.y - s.y) <= byRadius(by) + FRAM.nær));
    const inne = alle.filter(s => G.inni(by.ref, s.x, s.y)); return { alle, inne, ute: alle.filter(s => !inne.includes(s)), har: Math.floor(G.mann(G.lagI(by.ref, egneLag()))) }; }
  const liste = L => (L.length <= 1 ? (L[0] ? L[0].navn : 'Laget') : L.slice(0, -1).map(q => q.navn).join(', ') + ' og ' + L[L.length - 1].navn);
  let framAkk = 0;
  KROKER.sim.push(dt => { framAkk += dt; if (framAkk < 1) return; framAkk = 0; if (!auto()) return; const B = område(); if (!B.length) return;
    for (const s of egneLag()) { if (s.sti || s.planlegger || s.ombord || s.leirvakt || s.speid) { if (s.sti) s.framVed = null; continue; }
      const by = B.find(b => b.ref && (G.inni(b.ref, s.x, s.y) || Math.hypot(b.x - s.x, b.y - s.y) <= byRadius(b) + FRAM.nær)); if (!by || eierAv(by.id) === 'blå') { s.framVed = null; continue; }
      const L = leir(); if (L && Math.hypot(s.x - L.x, s.y - L.y) < 400) continue;
      if (!s.framVed || s.framVed.id !== by.id) { s.framVed = { id: by.id, t: tid, meldt: false }; continue; }
      if (s.framVed.meldt || tid - s.framVed.t < FRAM.vent) continue;
      const g = hvorforIkkeTar(s, by); if (!g) continue; s.framVed.meldt = true; logg(g);
      // de andre lagene ved samme sted er nevnt i meldingen: de melder ikke det samme én gang til
      for (const q of samletVed(by).alle) if (q !== s) { if (!q.framVed || q.framVed.id !== by.id) q.framVed = { id: by.id, t: tid, meldt: true }; else q.framVed.meldt = true; }
      try { window.dispatchEvent(new CustomEvent('riksbrudd-hendelse', { detail: { type: 'annet', tekst: g.replace(/\.$/, ''), x: by.x, y: by.y } })); } catch (e) { /* uten flyt */ } } });
  KROKER.lagTekst.push(s => (s.framVed && s.framVed.meldt && !s.sti && eierAv(s.framVed.id) !== 'blå' ? 'venter ved ' + ((område().find(b => b.id === s.framVed.id) || {}).navn || 'tettstedet') + ' – tar det ikke (se loggen)' : null));
  KROKER.lagTekst.push(s => (s.speid && s.speid.venter ? 'har en speidermelding som venter på radiokontakt' : s.speid ? 'speider mot ' + s.speid.navn : null));

  let advarsel = null;
  // et lag om bord i et kjøretøy sendes med kjøretøyet (kritikken: «"Send" virker ikke når troppen sitter i et kjøretøy»)
  function kanSendes(s) { if (!s.ombord) return KROKER.kanOrdre.every(f => f(s));
    if (s.ombord.oppdrag) { logg(`${s.ombord.navn} er på et oppdrag – la ${s.navn} gå av først.`); return false; }
    if (!kontakt(s)) { logg(hvorforIkke(s)); return false; } return typeof window.kjørTil === 'function'; }
  function gi(s, by) {
    if (s.ombord && typeof window.kjørTil === 'function') { const k = s.ombord; s.avstigning = { x: by.x, y: by.y, navn: by.navn, t: tid }; window.kjørTil(k, by.x, by.y);
      logg(`${k.navn} kjører ${s.navn} mot ${by.navn}. Troppen går av når de er framme.`); return; }
    ordre(s, by.x, by.y); }
  // troppen går av når kjøretøyet er framme, og går inn til midten av tettstedet (ordren er gitt på forhånd – den trenger ikke radio)
  KROKER.sim.push(() => { for (const s of ENHETER) { const a = s.avstigning; if (!a) continue; const k = s.ombord;
    if (!k || !levende(s)) { delete s.avstigning; continue; } if (k.sti) { a.kjørt = true; continue; }
    if (!a.kjørt) { if (tid - a.t > 30) { delete s.avstigning; logg(`${k.navn} kom ikke av gårde mot ${a.navn} (finner ingen veg dit). ${s.navn} sitter fortsatt på.`); } continue; }
    delete s.avstigning; if (window.TropperSpill && TropperSpill.gåAv) TropperSpill.gåAv(s); else s.ombord = null;
    const inn = Math.hypot(s.x - a.x, s.y - a.y) > 60 && !(s.speid && /^utkanten/.test(a.navn)); if (inn) ordre(s, a.x, a.y, true); logg(`${s.navn} er framme ved ${a.navn}` + (inn ? ' og går inn i tettstedet.' : '.')); } });

  // ---------- ordre ----------
  // o.likevel = sendt etter advarselen; o.sjekket = terrenget er sjekket (eller kunne ikke sjekkes)
  function send(by, lag, o = {}) { const T = bilde(); if (!T) return false; const t = T.trekk.find(q => q.by.id === by.id);
    const s = lag || (t && t.lag && t.lag.lag); if (!s) { logg('Ingen ledige lag å sende. Lag som marsjerer, må komme fram først.'); return false; }
    // (runde 13) radioens rekkevidde med terrenget: sjekkes før advarselen (tar et øyeblikk første gang for et sted)
    if (auto() && !o.likevel && !o.sjekket && KR() && terrengKjent(by) === undefined) { advarsel = { by, lag, ute: [], farer: [], sjekker: true }; if (åpen) { sist = ''; vis(true); }
      terrengSjekk(by).then(() => { if (advarsel && advarsel.sjekker && advarsel.by === by) { advarsel = null; send(by, lag, { ...o, sjekket: true }); } }); rullTilVarsel(); return false; }
    // (19. nov, pakke «krig») store tettsteder trenger flere lag: send alle i t.flere, og si fra når det ikke er nok
    if (!lag && t && t.flere && t.flere.length > 1) { const sendt = t.flere.filter(q => q.lag && kanSendes(q.lag));
      if (auto() && !o.likevel) { const ute = sendt.filter(q => utenforRadio(q.lag, by)), fa = farer(by, sendt.map(q => q.lag), t);
        if (ute.length || fa.some(f => f.alvor >= 1)) { visAdvarsel(by, null, ute.map(q => q.lag), fa, sendt.map(q => q.lag)); return false; } }
      for (const q of sendt) gi(q.lag, by);
      logg(`${sendt.map(q => q.navn).join(', ')} sendes mot ${by.navn} (${S.kravTekst(t)}).`); advarsel = null; valgtBy = by; vis(true); skitten = true; return sendt.length > 0; }
    if (Math.hypot(s.x - by.x, s.y - by.y) > S.REGLER.marsj) { logg(`${by.navn} ligger over ${S.REGLER.marsj / 1000} km fra ${s.navn}. Ta et tettsted på vegen først.`); return false; }
    if (!kanSendes(s)) return false;
    if (auto() && !o.likevel) { const ute = utenforRadio(s, by) ? [s] : [], fa = farer(by, [s], t); if (ute.length || fa.some(f => f.alvor >= 1)) { visAdvarsel(by, s, ute, fa, [s]); return false; } }
    if (!lag && t && !t.nok) logg(`${by.navn} ${S.kravTekst(t)}. Laget kan ikke ta det alene – samle flere lag først.`);
    if (o.likevel && speider(s)) s.speidLikevel = by.id;
    gi(s, by); if (!s.ombord) logg(`${s.navn} sendes mot ${by.navn}` + (t && t.forsvar > 0 ? ' – tettstedet er forsvart.' : '.')); advarsel = null; valgtBy = by; vis(true); skitten = true; return true; }
  // (runde 14, kritiker I: «Send likevel» lå over toppen av panelet på 844 × 390) panelet rulles til toppen, så varselet alltid synes
  function visAdvarsel(by, lag, ute, fa, alle) { advarsel = { by, lag, ute, farer: fa || [], alle: alle || (lag ? [lag] : ute) }; valgtBy = by; if (inne) skjul(false); sist = ''; vis(true); rullTilVarsel(); skitten = true; }
  function rullTilVarsel() { panel.scrollTop = 0; const a = document.getElementById('krigadvarsel'); if (!a) return; const r = a.getBoundingClientRect(), p = panel.getBoundingClientRect();
    if (r.top < p.top || r.bottom > p.bottom) panel.scrollTop += r.top - p.top - 4;
    // står panelet selv delvis utenfor skjermen, flyttes det inn
    const p2 = panel.getBoundingClientRect(); if (p2.top < 0) panel.style.top = Math.round(Math.max(0, parseFloat(getComputedStyle(panel).top) || 0) - p2.top + 2) + 'px'; }
  // advarselsboksen øverst i panelet: radioen (med terrenget) og farene på stedet
  function advarselBoks(T) { const a = advarsel; if (!a) return null; const k = KR(), L = leir();
    if (a.sjekker) return el('div', { klasse: 'by advarsel', id: 'krigadvarsel', role: 'status' }, el('b', {}, `Sjekker radiodekningen mot ${a.by.navn} …`), el('div', {}, 'Terrenget mellom leiren og stedet regnes ut.'));
    const boks = el('div', { klasse: 'by advarsel', id: 'krigadvarsel', role: 'alert' }), flere = a.ute.length > 1, d = L ? Math.hypot(a.by.x - L.x, a.by.y - L.y) : 0;
    const send2 = () => { const A = advarsel; advarsel = null; send(A.by, A.lag, { likevel: true }); };
    if (a.ute.length && k && L) { const første = a.ute[0], R1 = rekkeviddeTil(første, a.by);
      boks.append(el('b', {}, `Utenfor radiorekkevidde – ${flere ? 'lagene' : 'laget'} kan ikke få nye ordre der ute (${radioTekst(første, R1)})`),
        el('div', {}, `${a.by.navn} ligger ${km(d / 1000)} fra leiren. ${a.ute.map(q => q.navn).join(' og ')} går dit og gjør ferdig ordren, men du kan ikke kalle ${flere ? 'dem' : 'laget'} tilbake eller sende ${flere ? 'dem' : 'det'} videre før det er kontakt igjen. Tar og holder ${flere ? 'de' : 'det'} tettstedet, melder ${flere ? 'de' : 'det'} seg over radioen der.`)); }
    else boks.append(el('b', {}, `Før ${a.alle.length > 1 ? 'lagene' : a.alle[0] ? a.alle[0].navn : 'laget'} går til ${a.by.navn}:`));
    // farene på stedet (for få, bygdevern, fiender, speidere, leiren uten vakt)
    for (const f of a.farer) boks.append(el('div', { klasse: 'fare' + (f.alvor >= 1 ? ' alvor' : ''), 'data-fare': f.id }, (f.alvor >= 1 ? '⚠ ' : '') + f.tekst));
    const kn2 = el('div', { klasse: 'kn' });
    const vf = a.farer.find(f => f.id === 'vern'), sp = a.alle.filter(speider), farlig = a.farer.some(f => f.id === 'vern' || f.id === 'fiende');
    if (sp.length && farlig) kn2.append(knapp('Speid og meld', () => speid(a.by, sp), { klasse: 'hoved', 'data-advarsel': 'speid', title: `Stopper før ${a.by.navn} og melder hva som står der` }));
    if (vf) kn2.append(knapp(`Gjør avtale (${kroner(vf.vern.pris)}) og send`, () => { if (!avtale(a.by)) return; send2(); }, { klasse: sp.length ? '' : 'hoved', 'data-advarsel': 'avtale' }));
    for (const f of a.farer) if (f.id === 'rute' && f.gjennom) { const g = f.gjennom; kn2.append(knapp(`Avtale med ${g.navn} (${kroner(g.pris)}) og send`, () => { if (!avtale(g)) return; send2(); }, { 'data-advarsel': 'avtale-rute' })); }
    kn2.append(knapp(a.ute.length || a.farer.some(f => f.alvor >= 1) ? 'Send likevel' : 'Send', send2, Object.assign({ 'data-advarsel': 'likevel' }, a.farer.some(f => f.id === 'svak' || f.id === 'forfå') ? { klasse: 'rød', title: 'Forsvaret er større enn laget' } : {})));
    if (a.ute.length && k && L) { const første = a.ute[0];
      // feltradio til dem som har håndradio, når feltradioen rekker (med terrenget)
      const hånd = a.ute.filter(q => (q.radio || 'hånd') !== 'felt'), feltR = rekkeviddeTil(første, a.by, 'felt'), pris = (window.Kontrollrom && Kontrollrom.RADIO.felt.pris) || 1e6;
      if (hånd.length && feltR.r >= d) kn2.append(knapp(`Gi feltradio (${kroner(pris * hånd.length)}) og send`, () => {
        if (!(window.OppstartSpill && OppstartSpill.betal(pris * hånd.length))) { logg('Ikke nok penger til feltradio.'); return; }
        for (const q of hånd) { if (k.girRadio) k.girRadio(q, 'felt'); else q.radio = 'felt'; } logg(`${hånd.map(q => q.navn).join(' og ')} har fått feltradio (når ${km(feltR.r / 1000)}).`); send2(); }, { klasse: 'hoved', 'data-advarsel': 'feltradio' }));
      // et annet ledig lag med feltradio som rekker – MED terrenget (runde 13); de som heller ikke når fram, nevnes med tallet
      const felt = T.ledige.filter(q => q.kontakt && !q.holder && !a.ute.includes(q.lag) && (q.lag.radio || 'hånd') === 'felt' && Math.hypot(q.x - a.by.x, q.y - a.by.y) <= S.REGLER.marsj)
        .sort((p, q) => Math.hypot(p.x - a.by.x, p.y - a.by.y) - Math.hypot(q.x - a.by.x, q.y - a.by.y));
      const andre = felt.find(q => rekkeviddeTil(q.lag, a.by).r >= d);
      if (andre) kn2.append(knapp(`Send ${andre.navn} i stedet (feltradio)`, () => { advarsel = null; send(a.by, andre.lag, { likevel: true }); }, { 'data-advarsel': 'annet' }));
      else for (const q of felt.slice(0, 2)) { const R2 = rekkeviddeTil(q.lag, a.by); boks.append(el('small', { klasse: 'tillegg', 'data-naarikke': q.navn }, `${q.navn} (feltradio) når heller ikke fram (${R2.terreng ? 'terreng: ' + km(R2.r / 1000) : km(R2.r / 1000)}).`)); }
      if (feltR.r < d) boks.append(el('small', { klasse: 'tillegg' }, feltR.terreng ? `Terrenget står i veien: selv feltradio rekker bare ${km(feltR.r / 1000)} hit. En høyere eller kraftigere radiomast (Leir → radiomast) hjelper, eller ta et tettsted på vegen – garnisonen der melder seg over radioen i tettstedet.` : `Selv feltradio når bare ${km(feltR.r / 1000)} nå – bygg ut radiomasten (Leir → radiomast) for å nå ${a.by.navn}.`)); }
    kn2.append(knapp('Avbryt', () => { advarsel = null; vis(true); visFlyt(); }, { 'data-advarsel': 'avbryt' }));
    boks.append(kn2); return boks; }

  // ---------- samme radiovarsel utenfor krigskartet (runde 13: tankbilen og andre oppdrag) ----------
  // sendTil(lag, mål { x, y, navn }, gå(lag)): sjekker radioen (med terrenget) og om leiren blir uten vakt. Er alt i orden, kalles gå(lag)
  // straks; ellers står varselet i en egen boks (#krigvarsel) med «Send likevel», «Gi feltradio og send», «Send ⟨lag⟩ i stedet» og
  // «Avbryt». Svarer true når laget gikk med en gang.
  let flyt = null; const flytBoks = el('div', { id: 'krigvarsel', role: 'alertdialog' });
  function sendTil(s, mål, gå, o = {}) { if (!s) return false; if (!auto() || !KR()) { gå(s); return true; }
    if (!o.sjekket && terrengKjent(mål) === undefined) { terrengSjekk(mål).then(() => sendTil(s, mål, gå, { sjekket: true })); return false; }
    const ute = utenforRadio(s, mål), fa = farer({ ...mål, id: '¤' + (mål.navn || ''), folk: 0 }, [s], null).filter(f => f.id === 'leir');
    if (!ute && !fa.length) { gå(s); return true; }
    flyt = { mål, s, gå, ute: !!ute, fa }; visFlyt(); return false; }
  function visFlyt() { if (!flyt) { flytBoks.classList.remove('på'); return; } const { mål, s, gå, ute, fa } = flyt, k = KR(), L = leir(); if (!k || !L) { flyt = null; return visFlyt(); }
    const d = Math.hypot(mål.x - L.x, mål.y - L.y), R1 = rekkeviddeTil(s, mål), lukk2 = () => { flyt = null; visFlyt(); }, kn3 = el('div', { klasse: 'kn' });
    const kids = [el('b', {}, ute ? `Utenfor radiorekkevidde – ${s.navn} kan ikke få nye ordre der ute (${radioTekst(s, R1)})` : `Før ${s.navn} går til ${mål.navn}:`)];
    if (ute) kids.push(el('div', {}, `${stor(mål.navn)} ligger ${km(d / 1000)} fra leiren. Laget gjør ferdig oppdraget og går hjem av seg selv, men du kan ikke gi det nye ordre før det er innen rekkevidde igjen.`));
    for (const f of fa) kids.push(el('div', { klasse: 'fare alvor', 'data-fare': f.id }, '⚠ ' + f.tekst));
    kn3.append(knapp('Send likevel', () => { lukk2(); gå(s); }, { 'data-advarsel': 'likevel' }));
    if (ute && (s.radio || 'hånd') !== 'felt') { const fR = rekkeviddeTil(s, mål, 'felt'), pris = (window.Kontrollrom && Kontrollrom.RADIO.felt.pris) || 1e6;
      if (fR.r >= d) kn3.append(knapp(`Gi feltradio (${kroner(pris)}) og send`, () => { if (!(window.OppstartSpill && OppstartSpill.betal(pris))) { logg('Ikke nok penger til feltradio.'); return; } if (k.girRadio) k.girRadio(s, 'felt'); else s.radio = 'felt'; logg(`${s.navn} har fått feltradio (når ${km(fR.r / 1000)}).`); lukk2(); gå(s); }, { klasse: 'hoved', 'data-advarsel': 'feltradio' })); }
    if (ute) { const felt = ledige().filter(q => q.lag !== s && q.kontakt && (q.lag.radio || 'hånd') === 'felt').sort((p, q) => Math.hypot(p.x - mål.x, p.y - mål.y) - Math.hypot(q.x - mål.x, q.y - mål.y)), andre = felt.find(q => rekkeviddeTil(q.lag, mål).r >= d);
      if (andre) kn3.append(knapp(`Send ${andre.navn} i stedet (feltradio)`, () => { lukk2(); gå(andre.lag); }, { 'data-advarsel': 'annet' }));
      else for (const q of felt.slice(0, 2)) { const R2 = rekkeviddeTil(q.lag, mål); kids.push(el('small', { klasse: 'tillegg', 'data-naarikke': q.navn }, `${q.navn} (feltradio) når heller ikke fram (${R2.terreng ? 'terreng: ' + km(R2.r / 1000) : km(R2.r / 1000)}).`)); } }
    kn3.append(knapp('Avbryt', lukk2, { 'data-advarsel': 'avbryt' })); kids.push(kn3); flytBoks.replaceChildren(...kids); flytBoks.classList.add('på'); }
  const stor = t => (t ? t[0].toUpperCase() + t.slice(1) : t);

  // ---------- panelet ----------
  const css = document.createElement('style');
  css.textContent = `#krig{ position:fixed; left:10px; top:calc(var(--topp,58px) + 56px); z-index:11; display:none; width:min(350px,94vw); max-height:calc(100vh - var(--topp,58px) - 130px); overflow:auto; padding:10px 12px 12px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); font-size:14px; }
#krig.på{ display:block; } #krig h2{ margin:0 26px 2px 0; font-size:19px; } #krig h3{ margin:12px 0 3px; font-size:12.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-dim,#a99); }
#krig .lukk{ position:absolute; right:6px; top:4px; background:none; border:0; color:inherit; font-size:22px; min-width:34px; min-height:34px; cursor:pointer; }
#krig .maal{ color:var(--ink-dim,#a99); font-size:13px; margin-bottom:6px; } #krig .maal b{ color:var(--ink,#e7dcc3); }
#krig .side{ margin:5px 0; } #krig .side .n{ display:flex; justify-content:space-between; gap:8px; font-size:13.5px; } #krig .side .n small{ color:var(--ink-dim,#a99); }
#krig .stolpe{ position:relative; height:11px; background:#2e281e; margin-top:2px; } #krig .stolpe i{ display:block; height:100%; } #krig .stolpe u{ position:absolute; top:-2px; bottom:-2px; width:2px; background:#e7dcc3; opacity:.8; }
#krig .rad{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:5px 0; border-bottom:1px solid #2e281e; } #krig .rad small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; } #krig .rad .nr{ display:inline-block; width:19px; height:19px; line-height:19px; margin-right:6px; border-radius:50%; background:#c9b26a; color:#1c170f; text-align:center; font-size:12.5px; font-weight:700; }
#krig .rad.fare b{ color:#e8a46a; } #krig .by{ border:1px solid #c9b26a; padding:7px 9px; margin:6px 0 2px; background:#221c12; } #krig .by .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:6px; }
#krig button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:34px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; } #krig button.hoved{ border-color:#c9b26a; } #krig button:disabled{ opacity:.45; }
#krig .advarsel{ border-color:#e0a050; background:#2a1d0e; } #krig .advarsel > b{ color:#ffcf8a; display:block; margin-bottom:3px; } #krig .advarsel .kn button[data-advarsel=likevel]{ border-color:#a0703a; }
#krig button.rød, #krig .advarsel .kn button.rød[data-advarsel]{ border-color:#d0583e; background:#3a1a12; color:#ffc0a8; }
#krig small.ingenkontakt{ display:block; color:#e8a46a; font-size:12.5px; } #krig .tips{ margin-top:10px; color:var(--ink-dim,#a99); font-size:12.5px; } #krig small.tillegg{ display:block; margin-top:3px; color:#d9c48a; font-size:12.5px; line-height:1.3; }
body.smal #krig, body.kort #krig{ left:0; right:0; top:auto; bottom:0; width:auto; max-height:44vh; border-width:1px 0 0; }
#krigkort{ position:fixed; inset:0; z-index:40; display:none; align-items:center; justify-content:center; background:rgba(10,8,5,.72); } #krigkort.på{ display:flex; }
#krigkort div{ width:min(430px,90vw); padding:18px 20px; background:var(--panel,#1c170f); border:1px solid #c9b26a; color:var(--ink,#e7dcc3); text-align:center; } #krigkort h2{ margin:0 0 8px; font-size:26px; } #krigkort p{ margin:0 0 14px; }
#krigkort > div{ max-height:90vh; overflow:auto; } #krigkort .valg{ width:auto; padding:0; border:0; background:none; margin:8px 0; } #krigkort .valg small{ display:block; margin-top:2px; color:var(--ink-dim,#a99); font-size:12.5px; } #krigkort .valg button{ min-width:210px; }
#krigkort button{ background:#2a2318; border:1px solid #c9b26a; color:inherit; min-height:40px; padding:4px 18px; font:inherit; cursor:pointer; }
#sKrigBoks{ cursor:pointer; }
/* TELEFON (19. nov, runde 5 – «krigskartet er trangt i liggende format», 844 × 390): panelet kan skjules til en stripe («Skjul»), er
   smalere og tettere liggende, og det valgte tettstedet står øverst. Kartet passes inn i den frie delen ved siden av panelet og knappene. */
#krig .hode{ display:flex; align-items:center; gap:8px; margin-right:30px; } #krig .hode h2{ flex:1; margin-right:0; } #krig .hode .skjul{ min-height:30px; padding:0 10px; font-size:13px; }
#krig .stripe{ display:none; }
#krig.inn > :not(.stripe):not(.lukk){ display:none; }
#krig.inn{ overflow:visible; padding:5px 46px 5px 10px; }
#krig.inn .stripe{ display:flex; align-items:center; flex-wrap:wrap; gap:4px 10px; font-size:14px; }
#krig .stripe .du{ color:var(--ink-dim,#a99); } #krig .stripe .du b{ color:var(--ink,#e7dcc3); } #krig .stripe .vb{ color:#f0c878; }
body.kort.tlfligg #krig.inn{ bottom:auto; width:auto; max-width:min(560px, 72vw); }
body.kort:not(.tlfligg) #krig.inn{ max-height:none; }
body.kort.tlfligg #krig:not(.inn){ width:min(330px, 40vw); padding:6px 10px 10px; }
body.kort #krig:not(.inn){ display:none; } body.kort #krig.på:not(.inn){ display:flex; flex-direction:column; }
body.kort #krig > *{ flex:none; } body.kort #krig > .by{ order:-1; margin-top:2px; } body.kort #krig > .hode{ order:-2; }
body.kort #krig h2{ font-size:17px; } body.kort #krig .maal{ font-size:12.5px; margin-bottom:3px; }
body.kort #krig .side{ margin:2px 0; } body.kort #krig .side .n{ font-size:13px; } body.kort #krig .stolpe{ height:7px; }
body.kort.tlfligg #krig:not(.inn) .side{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; } body.kort.tlfligg #krig .side .n{ flex:0 0 64%; } body.kort.tlfligg #krig .side .stolpe{ flex:1; margin-top:0; } body.kort.tlfligg #krig .side small.tillegg{ flex:0 0 100%; }
body.kort #krig .by .kn button{ min-height:30px; padding:0 9px; } body.kort #krig .by{ padding:6px 8px; }
#krig .advarsel .fare{ margin-top:3px; font-size:13px; line-height:1.3; } #krig .advarsel .fare.alvor{ color:#ffcf8a; } #krig .rad small.forsvar{ color:#e8b27a; } #krig .rad small.radio{ color:#e8a46a; }
#krig .scenby{ margin-top:5px; padding-top:5px; border-top:1px solid #4a3d22; } #krig .scenby .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:5px; }
#krig .scen{ border:1px solid #6d5b34; background:#221c12; padding:5px 8px; margin:4px 0 6px; font-size:13px; line-height:1.3; } #krig .scen b{ color:#f0c878; } #krig .scen small{ display:block; color:var(--ink-dim,#a99); font-size:12.5px; }
#krig .forkl{ display:grid; grid-template-columns:26px 1fr; gap:3px 6px; align-items:center; font-size:12.5px; color:var(--ink-dim,#a99); margin-top:4px; } #krig .forkl canvas{ width:24px; height:20px; }
#krigvarsel{ position:fixed; left:50%; top:calc(var(--topp,58px) + 64px); transform:translateX(-50%); z-index:36; display:none; width:min(440px,94vw); max-height:70vh; overflow:auto; padding:10px 12px; background:#2a1d0e; border:1px solid #e0a050; color:var(--ink,#e7dcc3); font-size:14px; box-shadow:0 6px 24px rgba(0,0,0,.5); }
#krigvarsel.på{ display:block; } #krigvarsel > b{ color:#ffcf8a; display:block; margin-bottom:4px; } #krigvarsel .kn{ display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; } #krigvarsel small{ display:block; margin-top:4px; color:#d9c48a; font-size:12.5px; } #krigvarsel .fare{ margin-top:4px; color:#ffcf8a; }
#krigvarsel button{ background:#2a2318; border:1px solid var(--rule,#4a4030); color:var(--ink,#e7dcc3); min-height:36px; padding:2px 10px; font:inherit; font-size:13px; cursor:pointer; } #krigvarsel button.hoved{ border-color:#c9b26a; }
/* (runde 13) liggende telefon: knappene i advarselen står rett under overskriften, så de synes uten å rulle */
body.kort #krigadvarsel{ display:flex; flex-direction:column; } body.kort #krigadvarsel > *{ order:2; } body.kort #krigadvarsel > b{ order:0; } body.kort #krigadvarsel > .kn{ order:1; margin:2px 0 4px; }
body.kort #krigadvarsel, body.kort #krigvarsel{ font-size:13px; line-height:1.3; } body.kort #krigvarsel{ top:calc(var(--topp,40px) + 8px); max-height:80vh; }
body.kort #krig h3{ margin:8px 0 2px; } body.kort #krig .rad{ padding:3px 0; } body.kort #krig small, body.kort #krig .tips, body.kort #krig small.tillegg{ font-size:12.5px; }`;
  document.head.appendChild(css);
  const panel = el('div', { id: 'krig', role: 'dialog', 'aria-label': 'Krigskartet' }); document.body.appendChild(panel);
  const kort = el('div', { id: 'krigkort', role: 'alertdialog' }); document.body.appendChild(kort); document.body.appendChild(flytBoks);
  const kn = knapp('Krig', () => (åpen ? lukk() : åpne()), { id: 'krigknapp', title: 'Krigskartet: hvem holder hva, fronter og neste trekk (T)', 'aria-pressed': 'false' }); kn.hidden = true;
  const rad = document.querySelector('.knapper'); if (rad) rad.insertBefore(kn, document.getElementById('meny'));
  const stat = el('div', { id: 'sKrigBoks', title: 'Din andel av folket i området. Trykk for krigskartet.' }, el('b', { id: 'sKrig' }, '–'), ' ', el('span', {}, 'kontroll')); stat.hidden = true; stat.onclick = () => åpne();
  const stats = document.querySelector('.stats'); if (stats) stats.appendChild(stat);

  function statusTekst(s) { const b = iBy(s); if (s.ombord) return (s.ombord.sti ? 'kjører i ' : 'om bord i ') + s.ombord.navn + (s.avstigning ? ' mot ' + s.avstigning.navn : ''); if (s.planlegger) return 'planlegger rute'; if (s.sti) { const m = s.sti[s.sti.length - 1], mål = byer.find(q => G.inni(q.ref, m[0], m[1])); return 'marsjerer' + (mål ? ' mot ' + mål.navn : ''); }
    if (b) { const t = G.tilstand(TETTSTEDER, b.id); return t.eier === 'blå' ? 'garnison i ' + b.navn : t.inntar && t.inntar.side === 'blå' ? `tar ${b.navn} (${Math.round(100 * t.inntar.sek / G.REGLER.innta)} %)` : 'i ' + b.navn; } return 'ledig'; }
  // ---------- (runde 13) tallene skal stemme, målet skal synes ----------
  // «Vaktlaget 4 av 4 mann» etter at én var falt og én såret (kritiker H): friske, sårede og falne hver for seg
  function mannTekst(s) { const n = s.menn.length, fr = s.menn.filter(m => m.hp >= 1).length, sår = s.menn.filter(m => m.hp > 0 && m.hp < 1).length, falt = n - fr - sår;
    return `${fr} friske av ${n}` + (sår ? `, ${sår} såret` : '') + (falt ? `, ${falt} falt` : ''); }
  const dagKl = t => `dag ${Math.floor(t / 1440) + 1} ${typeof klokkeslett === 'function' ? klokkeslett(t) : ''}`.trim();
  // uten kontakt: når laget sist meldte seg (det du vet), «· sist meldt dag 2 06:53»
  function sistMeldt(s) { const k = KR(); let I = null; try { I = k && k.info ? k.info(s) : null; } catch (e) { I = null; } return I && I.meldt && Number.isFinite(I.meldt.tid) ? ` · sist meldt ${dagKl(I.meldt.tid)}` : ''; }
  // scenariet (kritiker H: «Krig sier "hold 60 %" selv om scenariet er "Sju døgn"»): scenariets mål og nedtelling øverst, og om krigen teller
  const scenarioId = () => (window.SPILLREGLER && SPILLREGLER.scenario) || null;
  const scenarioTeller = () => { const id = scenarioId(); return !!id && id !== 'lyn'; };
  const KRIGEN_TELLER = {
    overlev: 'Krigen avgjør ikke scenariet: du vinner ved å holde leiren og folket i live. Tettsteder gir olje, folk og varer – men hvert lag som går ut, mangler hjemme.',
    hold: 'Krigen teller bare for det ene tettstedet scenariet gjelder. Prosenten under gjelder ikke scenariet.',
    tre: 'Tettstedene teller: hold tre samtidig. Prosenten under gjelder ikke scenariet.',
    lyn: 'Krigen ER målet: hold 60 % av folket i området.',
  };
  function scenarioBoks(T0) { let sc = null; try { sc = window.ScenarioSpill && ScenarioSpill.scenario ? ScenarioSpill.scenario() : null; } catch (e) { sc = null; } const id = scenarioId(); if (!sc || !id) return null;
    const T = T0 || bilde(), SC = window.Scenario && Scenario.SCENARIER && Scenario.SCENARIER[id], dager = SC ? SC.dager : 0, dag = Math.min(dager || 99, Math.floor((typeof tid === 'number' ? tid : 0) / 1440) + 1);
    const status = sc.status === 'vunnet' ? ' – klart!' : sc.status === 'tapt' ? ' – tapt' : dager ? ` – dag ${dag} av ${dager}` : '';
    if (/^Dag \d+ av \d+\. /.test(sc.tekst || '')) sc = { ...sc, tekst: sc.tekst.replace(/^Dag \d+ av \d+\. /, '') };
    const frist = sc.status === 'pågår' && sc.igjen > 0 && window.Scenario && Scenario.fristTekst ? ` (${Scenario.fristTekst(Math.round(sc.igjen / 10) * 10)})` : '';
    const boks = el('div', { klasse: 'scen', id: 'krigscenario' }, el('b', {}, `Scenario: ${sc.navn}${status}`), el('div', {}, (sc.tekst || '') + frist), el('small', {}, KRIGEN_TELLER[id] || ''));
    { const rad = scenarioBy(sc, T); if (rad) boks.append(rad); } return boks; }
  // (R2-løkka 26. nov, kritikken: «Scenariet sier "Ta Elverum", radioen sier "Gjør en avtale (8 mill. kr) i Krig", men Krig → Neste trekk viser
  // ikke Elverum») byen i «Hold byen» står øverst i Krig med forsvaret, hvor mange mann som trengs (ett tall, Strategi.anbefalt), hvor
  // mange dere har innen marsjavstand, og knappene «Send …» og «Gjør avtale» – det loggen og radioen henviser til, finnes her.
  function scenarioBy(sc, T) { if (!T || !sc || sc.status !== 'pågår' || sc.mål == null || scenarioId() !== 'hold') return null;
    const by = T.byer.find(b => String(b.id) === String(sc.mål)); if (!by) return null; const e = eierAv(by.id), L0 = leir();
    const rad = el('div', { klasse: 'scenby', 'data-scenby': by.id }, el('b', {}, by.navn), el('small', {}, ` ${tall(by.folk)} innb. · ${e === 'blå' ? 'ditt' : e ? fraksjon(e).eieform : 'nøytralt'}` + (L0 ? ` · ${km(Math.hypot(by.x - L0.x, by.y - L0.y) / 1000)} fra leiren` : '')));
    if (e === 'blå') { const g = garnison(by.id); rad.append(el('small', { klasse: 'tillegg' }, g ? `Garnison: ${g} lag. Hold byen.` : 'Ingen garnison – send et lag dit, ellers kan byen tas.')); return rad; }
    const t = T.trekk.find(q => q.by.id === by.id), v = vern(by), fl = forsvarLinje({ eier: e, by }), anb = t ? t.anbefalt : S.anbefalt(G.minstFor(by.folk), v && v.mann > 0 ? v.mann : 0);
    if (fl) rad.append(el('small', { klasse: 'tillegg', 'data-forsvar': by.id }, fl + '.'));
    { const her = G.lagI(by.ref, egneLag()), inne = Math.floor(G.mann(her)); rad.append(el('small', { klasse: 'tillegg', 'data-krav': by.id }, `Send minst ${anb} mann` + (t ? ` – dere har ${t.har} innen ${S.REGLER.marsj / 1000} km` : '') + (inne ? `, ${inne} er alt i byen (${her.map(q => q.navn).join(', ')})` : '') + '.')); }
    const k = el('div', { klasse: 'kn' });
    if (t) { const uk = t.lag && t.lag.kontakt === false, n = t.flere && t.flere.length > 1 ? t.flere.length : 0;
      k.append(knapp(!t.lag ? 'Ingen ledige lag' : n ? `Send ${n} lag` : `Send ${t.lag.navn}`, () => send(by), Object.assign({ klasse: forSvak(t) || t.sterk ? 'rød' : 'hoved', 'data-scensend': by.id }, t.lag && t.innen && !uk ? {} : { disabled: '' }, uk ? { title: hvorforIkke(t.lag.lag) } : {}))); }
    if (v && v.mann > 0) k.append(knapp(`Gjør avtale (${kroner(v.pris)})`, () => { if (avtale(by)) { sist = ''; vis(true); } }, { 'data-scenavtale': by.id, title: 'Bygdevernet slipper dere inn uten kamp' }));
    k.append(knapp('Vis', () => { valgtBy = by; kam.x = by.x; kam.y = by.y; vis(true); skitten = true; }));
    rad.append(k); return rad; }
  // hva tettstedet forsvares med (bygdevernet eller fiender dere har sett)
  // (runde 14) forsvaret i mann (kjentForsvar) og fredstiden; t.svak = forsvaret er minst like stort som lagene som ville gått
  function forsvarLinje(t) { const v = !t.eier ? vern(t.by) : null, deler = []; if (v && !(v.mann > 0)) deler.push(vernTekst(v)); const k = t.eier === 'blå' ? null : kjentForsvar(t.by);
    if (k && k.mann) deler.push(`ca. ${k.mann} mann (${forsvarTekst(k)})`); const fr = t.eier ? fredTekst() : ''; if (fr) deler.push(fr);
    return deler.length ? 'Forsvar: ' + deler.join(' · ') : ''; }
  const forSvak = t => { if (!t || t.eier === 'blå' || !t.lag) return false; const k = kjentForsvar(t.by); return k.mann > 0 && k.mann >= (t.flere && t.flere.length > 1 ? t.har : Math.floor(window.Fraksjoner && Fraksjoner.styrke && t.lag.lag ? Fraksjoner.styrke(t.lag.lag) : t.har)); };
  // laget i forslaget havner utenfor radioen (med terrenget, når det er regnet ut)
  function radioLinje(t) { if (!KR() || !t.lag || !t.lag.lag) return ''; const u = utenforRadio(t.lag.lag, t.by); return u ? `utenfor radioen for ${t.lag.navn} (${radioTekst(t.lag.lag, u)})` : ''; }
  // TEGNFORKLARING (kritiker H: «et rødt "?" uten forklaring»): små tegninger av merkene i krigskartet
  function forklaring() { const g0 = el('div', { klasse: 'forkl', id: 'krigforkl' }), MK = window.Merker;
    const rad = (tekst, tegn) => { const c = document.createElement('canvas'); c.width = 48; c.height = 40; const g = c.getContext('2d'); g.scale(2, 2); try { tegn(g); } catch (e) { /* bare tegningen mangler */ } g0.append(c, el('span', {}, tekst)); };
    const merke = (g, side, v) => { if (MK) MK.tegn(g, 12, 10, Object.assign({ forhold: MK.forhold(side), farge: sidefarge(side, 'farge'), r: 7 }, v)); };
    const meldt = g => { g.strokeStyle = sidefarge('rød', 'lys') || '#b5503d'; g.fillStyle = 'rgba(20,16,10,.7)'; g.lineWidth = 1.6; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(12, 2); g.lineTo(20, 10); g.lineTo(12, 18); g.lineTo(4, 10); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]); g.fillStyle = '#e7dcc3'; g.font = '11px serif'; g.textAlign = 'center'; g.fillText('?', 12, 14); };
    rad('Eget lag', g => merke(g, 'blå', { slag: 'lag' }));
    rad('Fiendelag dere ser nå (rød og grønn motstander)', g => merke(g, 'rød', { slag: 'lag' }));
    rad('«sist sett kl. …»: der fienden var sist noen av dine så den', g => merke(g, 'rød', { stiplet: true }));
    rad('«?»: fiende meldt over radio, av speidere eller etterretning – ikke sett nå. Nær nok viser kartet navn og hvor gammel meldingen er.', meldt);
    rad('Tettsted: ditt, fiendens, uten eier', g => { if (!MK) return; MK.tegn(g, 5, 10, { forhold: 'eget', slag: 'tettsted', farge: sidefarge('blå', 'farge'), r: 4 }); MK.tegn(g, 12, 10, { forhold: 'fiende', slag: 'tettsted', farge: sidefarge('rød', 'farge'), r: 4 }); MK.tegn(g, 19.5, 10, { forhold: 'nøytral', slag: 'tettsted', farge: 'rgba(52,45,34,.92)', r: 4 }); });
    rad('1–3: de beste forslagene i «Neste trekk»', g => { g.fillStyle = '#c9b26a'; g.beginPath(); g.arc(12, 10, 7, 0, 6.283); g.fill(); g.fillStyle = '#1c170f'; g.font = '700 10px serif'; g.textAlign = 'center'; g.fillText('1', 12, 13.5); });
    rad('Front: to sider møtes', g => { g.strokeStyle = 'rgba(240,200,120,.95)'; g.lineWidth = 1.6; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(1, 10); g.lineTo(23, 10); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(9, 6); g.lineTo(15, 14); g.moveTo(15, 6); g.lineTo(9, 14); g.stroke(); });
    rad('Flere egne lag på samme sted: ett merke med antallet', g => { if (MK) MK.tegn(g, 10, 10, { forhold: 'eget', slag: 'lag', farge: sidefarge('blå', 'farge'), r: 6 }); g.fillStyle = '#f0c878'; g.font = '700 10px serif'; g.fillText('3', 18, 8); });
    return g0; }
  function bygg(T) { const f = document.createDocumentFragment(), R = S.REGLER, st = T.st, L0 = leir();
    f.append(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk krigskartet' }), el('div', { klasse: 'hode' }, el('h2', {}, 'Krigskartet'), knapp('Skjul', () => skjul(true), { klasse: 'skjul', title: 'Skjul panelet så du ser hele kartet' })));
    // stripa når panelet er skjult: andelen din, og det valgte tettstedet med den viktigste knappen
    { const st0 = el('div', { klasse: 'stripe' }, el('b', {}, 'Krig'), el('span', { klasse: 'du' }, 'du har ', el('b', {}, S.prosent(st.sider.blå.andel) + ' %'), ` (seier ${S.prosent(R.seier)} %)`));
      if (valgtBy) { const b = valgtBy, e = eierAv(b.id), t = T.trekk.find(q => q.by.id === b.id);
        st0.append(el('span', { klasse: 'vb' }, b.navn), el('small', {}, e === 'blå' ? 'ditt' : e ? fraksjon(e).eieform : 'nøytralt'));
        if (e !== 'blå' && t && t.lag && t.innen && t.lag.kontakt !== false) st0.append(knapp(`Send ${t.lag.navn}`, () => send(b), { klasse: 'hoved' })); }
      st0.append(knapp('Vis mer', () => skjul(false), { title: 'Vis hele panelet' })); f.append(st0); }
    { const ab = advarselBoks(T); if (ab) f.append(ab); }
    { const sb = scenarioBoks(T); if (sb) f.append(sb); }
    f.append(el('div', { klasse: 'maal' }, scenarioTeller() ? 'Krigen: hold ' : 'Mål: hold ', el('b', {}, S.prosent(R.seier) + ' %'), ` av folket i ${st.byer === 1 ? 'det ene tettstedet' : `de ${st.byer} tettstedene`} i området (${Math.round(T.byer.radius / 1000)} km rundt leiren). Du har `, el('b', {}, S.prosent(st.sider.blå.andel) + ' %'), '.' + (T.ut.forTidlig ? ` Krigen avgjøres tidligst dag ${Math.floor(T.ut.fra / 1440) + 1}.` : '')));
    for (const side of ['blå', 'rød', 'grønn']) { const m = st.sider[side]; if (!m) continue;
      f.append(el('div', { klasse: 'side', 'data-side': side }, el('div', { klasse: 'n' }, el('b', {}, side === 'blå' ? fraksjon('blå').navn + ' (du)' : fraksjon(side).navn), el('small', {}, `${m.byer} tettsted${m.byer === 1 ? '' : 'er'} · ${S.prosent(m.andel)} %`)),
        el('div', { klasse: 'stolpe' }, el('i', { style: `width:${Math.min(100, m.andel * 100)}%; background:${sidefarge(side, 'lys')}` }), el('u', { style: `left:${R.seier * 100}%` })), ...tillegg('side', side))); }
    f.append(el('div', { klasse: 'side' }, el('div', { klasse: 'n' }, el('span', {}, 'Ingen (nøytralt)'), el('small', {}, `${st.nøytral.byer} tettsted${st.nøytral.byer === 1 ? '' : 'er'} · ${S.prosent(st.nøytral.andel)} %`))));
    // valgt tettsted
    if (valgtBy) { const b = valgtBy, e = eierAv(b.id), t = T.trekk.find(q => q.by.id === b.id), g = garnison(b.id), strøm = true, olje = G.rate(b.folk, G.REGLER.produksjon, strøm), fs = G.rate(b.folk, G.REGLER.forsterkning, strøm);
      const boks = el('div', { klasse: 'by' }, el('b', {}, b.navn), el('small', {}, ` ${tall(b.folk)} innbyggere · ${e === 'blå' ? 'ditt' : e ? fraksjon(e).eieform : 'nøytralt'}`),
        el('div', {}, e === 'blå' ? (g ? `Garnison: ${g} lag.` : 'Ingen garnison – et fiendtlig lag kan ta det.') : `Gir ${nf.format(Math.round(olje * 10) / 10)} t olje i timen og ${nf.format(Math.round(fs * 10) / 10)} mann i timen til garnisonen.` + (t && t.forsvar > 0 ? ' Fienden er sett her.' : '')));
      { const fl = e !== 'blå' ? forsvarLinje({ eier: e, by: b }) : ''; if (fl) boks.append(el('small', { klasse: 'tillegg', 'data-forsvar': b.id }, fl + '.')); }
      boks.append(...tillegg('by', b.ref, e));
      const k = el('div', { klasse: 'kn' });
      if (e !== 'blå' && t) { const uk = t.lag && t.lag.kontakt === false; k.append(knapp(t.lag ? `Send ${t.lag.navn} (${km(t.km)})` : 'Ingen ledige lag', () => send(b), Object.assign({ klasse: forSvak(t) ? 'rød' : 'hoved', 'data-send': b.id }, t.lag && t.innen && !uk ? {} : { disabled: '' }, uk ? { title: hvorforIkke(t.lag.lag) } : {})));
        if (uk) boks.append(el('small', { klasse: 'tillegg ingenkontakt' }, hvorforIkke(t.lag.lag))); }
      { const v = vern(b); if (v && v.mann > 0) k.append(knapp(`Avtale med bygdevernet (${kroner(v.pris)})`, () => { if (avtale(b)) { sist = ''; vis(true); } }, { 'data-avtale': b.id, title: 'De slipper dere inn uten kamp' })); }
      if (e === 'blå' && !g) { const l = T.ledige.filter(q => !q.holder).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0]; if (l) k.append(knapp(`Send ${l.navn} som garnison`, () => send(b, l.lag), { klasse: 'hoved' })); }
      k.append(knapp('Gå dit i kartet', () => { kam.x = b.x; kam.y = b.y; kam.m = Math.min(kam.m, 12); skitten = true; }), knapp('Fjern valget', () => { valgtBy = null; vis(true); skitten = true; }));
      boks.append(k); f.append(boks); }
    // neste trekk
    f.append(el('h3', {}, 'Neste trekk'));
    const topp = T.trekk.slice(0, 4); if (!topp.length) f.append(el('div', { klasse: 'tips' }, 'Du holder alle tettstedene i området.'));
    topp.forEach((t, i) => f.append(el('div', { klasse: 'rad', 'data-trekk': t.by.id }, el('div', {}, i < 3 ? el('span', { klasse: 'nr' }, String(i + 1)) : '', el('b', {}, t.by.navn),
      el('small', {}, `${t.eier ? fraksjon(t.eier).eieform : 'nøytralt'}${t.forsvar > 0 ? ', forsvart' : ''} · ${tall(t.by.folk)} innb.` + (L0 ? ` · ${km(Math.hypot(t.by.x - L0.x, t.by.y - L0.y) / 1000)} fra leiren` : '') + (S.kravTekst(t) ? ' · ' + S.kravTekst(t) : '') + (t.sterk ? ` · for sterkt for det dere har nå (send minst ${t.anbefalt} mann)` : '')),
      // (runde 13) hva stedet forsvares med, og om laget havner utenfor radioen (med terrenget) – før du trykker «Send»
      forsvarLinje(t) ? el('small', { klasse: 'forsvar', 'data-forsvar': t.by.id }, forsvarLinje(t)) : '',
      t.tapt ? el('small', { klasse: 'forsvar', 'data-tapt': t.by.id }, S.tapTekst(t, tid) + '.') : '',
      t.lag && t.lag.kontakt !== false && radioLinje(t) ? el('small', { klasse: 'radio' }, radioLinje(t)) : '',
      // (runde 12) laget du ikke har kontakt med: grå knapp «Ingen kontakt» med forklaringen (pek for hele teksten)
      t.lag && t.lag.kontakt === false ? el('small', { klasse: 'ingenkontakt' }, 'ingen radiokontakt med ' + t.lag.navn) : '',
      ...tillegg('trekk', t.by.ref, t.eier)),
      t.lag && t.lag.kontakt === false ? knapp('Ingen kontakt', () => logg(hvorforIkke(t.lag.lag)), { 'data-send': t.by.id, disabled: '', title: hvorforIkke(t.lag.lag) }) :
      knapp(t.lag && t.innen && t.nok === false ? `For få (${t.har} av ${t.minst})` : t.lag && t.innen ? (t.flere && t.flere.length > 1 ? `Send ${t.flere.length} lag` : 'Send') : t.lag ? 'For langt' : 'Ingen lag', () => send(t.by), Object.assign({ 'data-send': t.by.id }, t.lag && t.innen && t.nok !== false ? { klasse: forSvak(t) ? 'rød' : 'hoved', ...(forSvak(t) ? { title: 'Forsvaret er større enn laget' } : {}) } : { disabled: '' })))));
    // trusler
    if (T.trusler.length) { f.append(el('h3', {}, 'Trusler'));
      for (const t of T.trusler.slice(0, 4)) f.append(el('div', { klasse: 'rad fare' }, el('div', {}, el('b', {}, t.by.navn), el('small', {}, (t.fiende ? `${t.fiende.navn} ${km(t.km)} unna` : '') + (t.fiende && !t.garnison ? ' · ' : '') + (t.garnison ? '' : 'ingen garnison'))),
        knapp('Vis', () => { valgtBy = t.by; kam.x = t.by.x; kam.y = t.by.y; vis(true); skitten = true; }))); }
    // venner (spill/spillet-visning.js): leiren og stillingen de delte – ikke sanntid
    const venner = (window.SpilletSpill && SpilletSpill.venner ? SpilletSpill.venner() : []).filter(v => Math.hypot(v.x - L0.x, v.y - L0.y) < (T.byer.radius || R.radius) * 1.5);
    if (venner.length) { f.append(el('h3', {}, 'Venner i området'));
      for (const v of venner) f.append(el('div', { klasse: 'rad', 'data-venn': v.navn }, el('div', {}, el('b', {}, v.navn), el('small', {}, v.stilling ? `holdt ${v.stilling.byer.length} tettsteder og ${v.stilling.andel} % på dag ${v.stilling.dag} – slik det var da koden ble laget, ikke sanntid` : 'leiren står i kartet (ingen stilling i koden)')),
        knapp('Vis', () => { kam.x = v.x; kam.y = v.y; skitten = true; }))); }
    // lagene
    f.append(el('h3', {}, 'Lagene dine'));
    const lag = egneLag(); if (!lag.length) f.append(el('div', { klasse: 'tips' }, 'Du har ingen lag. Tettsteder du holder, og basen, gir nye.'));
    for (const s of lag) f.append(el('div', { klasse: 'rad', 'data-lag': s.navn }, el('div', {}, el('b', {}, s.navn), el('small', {}, `${mannTekst(s)} · ${statusTekst(s)}` + (kontakt(s) ? '' : ' · ingen radiokontakt' + sistMeldt(s)))),
      knapp('Velg', () => { valgt = s; kam.x = s.x; kam.y = s.y; visPanel(); skitten = true; })));
    f.append(el('h3', {}, 'Tegnforklaring'), forklaring());
    f.append(el('div', { klasse: 'tips' }, `Et lag som står ${G.REGLER.innta / 60} minutter i et lite tettsted uten fiender, tar det. Større steder trenger flere mann og lengre tid (se «trenger»). La et lag stå igjen som garnison. Fargene i kartet viser hvem som rår hvor; stiplede streker er fronter. Trykk på et tettsted for å sende et lag dit. En marsj tar timer – sett farten til 60× eller 600× mens lagene går.`));
    return f; }
  function vis(tving) { if (!åpen) return; const T = bilde(); if (!T) { panel.replaceChildren(knapp('×', lukk, { klasse: 'lukk', 'aria-label': 'Lukk krigskartet' }), el('h2', {}, 'Krigskartet'), el('div', { klasse: 'tips' }, 'Kartdataene for tettstedene er ikke lastet ennå. Prøv igjen om litt.')); sist = ''; return; }
    if (!tving && window.pekerNede && pekerNede(panel)) return;
    const ny = el('div'); ny.append(bygg(T)); if (!tving && ny.innerHTML === sist) return; sist = ny.innerHTML; const topp = panel.scrollTop; panel.replaceChildren(...ny.childNodes); panel.scrollTop = topp; }
  function åpne() { const L = leir(); if (!L) return; if (typeof på3d !== 'undefined' && på3d && typeof slå3d === 'function') slå3d(false);
    if (window.lukkPanel) lukkPanel(); åpen = true; panel.classList.add('på'); document.body.classList.add('krig'); kn.classList.add('på'); kn.setAttribute('aria-pressed', 'true');
    førKam = { x: kam.x, y: kam.y, m: kam.m }; const kl = document.body.classList;
    // liggende telefon (telefon.js, body.tlfligg): panelet er et sidepanel til venstre med full høyde, som på PC
    const ligg = kl.contains('kort') && innerWidth > innerHeight * 1.2, smal = !ligg && (kl.contains('smal') || kl.contains('kort'));
    kam.x = L.x; const rr = område().radius || S.REGLER.radius, pb = ligg ? Math.max(0, panel.getBoundingClientRect().right + 4) : smal ? 0 : Math.min(370, VW * .4);
    // hele området skal være synlig i det frie feltet: til høyre for panelet på PC og liggende telefon, over panelet på stående telefon
    const Bk = boks(), fw = smal ? Math.max(200, VW) : ligg ? Math.max(150, VW - pb - 10) : Math.max(200, VW - pb), fh = smal ? Math.max(200, VH * .5) : ligg ? Math.max(150, VH - 60) : Math.max(200, VH - 120);
    kam.m = Math.max(Bk.w / fw, Bk.h / fh) * 1.15; if (!(kam.m > 0)) kam.m = rr * 2.3 / Math.min(fw, fh);
    kam.x = Bk.x - pb / 2 * kam.m; kam.y = Bk.y - (smal ? VH * .2 * kam.m : ligg ? -22 * kam.m : -20 * kam.m); panel.classList.toggle('inn', inne); sist = ''; vis(true);
    if (kl.contains('kort')) passInn(); skitten = true; }
  // RUNDE 6 (kritikken: «krigskartet på telefon er et lite firkantet utsnitt i en stort sett svart sirkel på 45 km»): det som vises, er
  // området (sirkelen) – men bare den delen der det finnes kartdata (Dovre-piloten har bare et lite område), og alltid tettstedene
  // og leiren. boks() = { x, y, w, h } i kartets meter; kartet passes inn så boksen fyller den frie plassen.
  function boks() { const L = leir(); if (!L) return null; const B = område(), rr = B.radius || S.REGLER.radius;
    let x0 = L.x - rr, x1 = L.x + rr, y0 = L.y - rr, y1 = L.y + rr;
    const D = typeof NORGE_BLOKKER !== 'undefined' && !NORGE_BLOKKER && typeof OMRÅDE !== 'undefined' && Array.isArray(OMRÅDE) ? OMRÅDE : null;
    if (D) { x0 = Math.max(x0, D[0]); y0 = Math.max(y0, D[1]); x1 = Math.min(x1, D[2]); y1 = Math.min(y1, D[3]); if (x1 - x0 < 2000 || y1 - y0 < 2000) { x0 = L.x - rr; x1 = L.x + rr; y0 = L.y - rr; y1 = L.y + rr; } }
    for (const p of [L, ...B]) { x0 = Math.min(x0, p.x - 1500); x1 = Math.max(x1, p.x + 1500); y0 = Math.min(y0, p.y - 1500); y1 = Math.max(y1, p.y + 1500); }
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }; }
  // TELEFON (19. nov): hele området inn i den frie delen av skjermen – ved siden av eller over panelet, under statuslinja og knappene
  // øverst, og til venstre for knappesøyla (.ctl). Regnes etter at panelet er tegnet (stående er høyden avhengig av innholdet).
  function friDel() { const r = e => (e && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed') && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null), p = panel.getBoundingClientRect();
    let x0 = 0, x1 = VW, y0 = 0, y1 = VH; const ligg = document.body.classList.contains('tlfligg');
    for (const id of ['.stats', '.knapper']) { const b = r(document.querySelector(id)); if (b && b.width && b.top < VH * .3) y0 = Math.max(y0, b.bottom + 4); }
    const c = r(document.querySelector('.ctl')); if (c && c.width && c.left > VW * .6) x1 = Math.min(x1, c.left - 4);
    if (p.width) { if (ligg && p.left < VW * .3 && p.height > VH * .5) x0 = Math.max(x0, p.right + 4); else if (p.top > VH * .3) y1 = Math.min(y1, p.top - 4); else y0 = Math.max(y0, p.bottom + 4); }
    return { x0, x1, y0, y1 }; }
  function passInn() { const L = leir(); if (!L) return; const f = friDel(), w = Math.max(120, f.x1 - f.x0), h = Math.max(120, f.y1 - f.y0), Bk = boks();
    kam.m = Math.max(Bk.w / w, Bk.h / h) * 1.12; kam.x = Bk.x - ((f.x0 + f.x1) / 2 - VW / 2) * kam.m; kam.y = Bk.y + ((f.y0 + f.y1) / 2 - VH / 2) * kam.m; skitten = true; return f; }
  // Skjul/vis panelet (stripa). Kartet flyttes så området fortsatt står i den frie delen.
  function skjul(ja) { inne = !!ja; try { localStorage.setItem('riksbrudd-krigpanel', inne ? 'inn' : 'ut'); } catch (e) { /* uten lagring */ }
    panel.classList.toggle('inn', inne); sist = ''; vis(true); if (document.body.classList.contains('kort')) passInn(); else skitten = true; }
  let snuTid = 0; window.addEventListener('resize', () => { if (!åpen || !document.body.classList.contains('kort')) return; clearTimeout(snuTid); snuTid = setTimeout(() => { if (åpen) passInn(); }, 350); });
  function lukk() { if (!åpen) return; åpen = false; valgtBy = null; panel.style.top = ''; panel.style.bottom = ''; panel.classList.remove('på'); document.body.classList.remove('krig'); kn.classList.remove('på'); kn.setAttribute('aria-pressed', 'false');
    if (førKam) { kam.x = førKam.x; kam.y = førKam.y; kam.m = førKam.m; førKam = null; } skitten = true; }
  window.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return; const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && åpen) { lukk(); return; } if ((e.key === 't' || e.key === 'T') && !kn.hidden && !(typeof R3 !== 'undefined' && R3 && R3.fot)) { const st = document.getElementById('oppstart'); if (st && st.classList.contains('på')) return; kn.click(); } });

  // trykk i krigskartet: et tettsted velges (merket er lite, så treffet er romslig)
  KROKER.trykk.unshift((X, Y) => { if (!åpen) return false; let best = null, bd = Math.max(18 * kam.m, 300); for (const b of område()) { const d = Math.hypot(b.x - X, b.y - Y); if (d < bd) { bd = d; best = b; } }
    if (!best) return false; valgtBy = best; vis(true); skitten = true; return true; });

  // ---------- kartet ----------
  const KART_LØFT = 'rgba(140,128,100,.6)';
  const tegn = (g, vx0, vy1) => { const m = kam.m, ute = m >= 18; if (!åpen && !ute) return; const B = område(); if (!B.length) return;
    const sx = X => (X - vx0) / m, sy = Y => (vy1 - Y) / m, inn = (x, y, r) => x > -r && y > -r && x < VW + r && y < VH + r; g.save();
    // (runde 12, kritikk F: «krigskartet er så mørkt at bare stedsnavnene kan leses») kartet under løftes (lysere skygger, «screen»)
    // i stedet for å mørknes – merkene og områdene står fortsatt tydelig. Claudes forslag: fargen og styrken i KART_LØFT.
    if (åpen) { g.globalCompositeOperation = 'screen'; g.fillStyle = KART_LØFT; g.fillRect(0, 0, VW, VH); g.globalCompositeOperation = 'source-over'; }
    // området hver side rår over
    for (const b of B) { const e = eierAv(b.id); if (!e) continue; const x = sx(b.x), y = sy(b.y), r = S.rekkevidde(b.folk) / m; if (r < 4 || !inn(x, y, r)) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, r), c = sidefarge(e, 'lys'); g.globalAlpha = åpen ? .62 : .4; gr.addColorStop(0, c); gr.addColorStop(.7, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.globalAlpha = åpen ? .8 : .5; g.strokeStyle = sidefarge(e, 'sti'); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * .82, 0, 6.283); g.stroke(); }
    g.globalAlpha = 1;
    if (åpen) { const L = leir(); if (L) { g.strokeStyle = 'rgba(231,220,195,.55)'; g.lineWidth = 1.5; g.setLineDash([10, 8]); g.beginPath(); g.arc(sx(L.x), sy(L.y), (B.radius || S.REGLER.radius) / m, 0, 6.283); g.stroke(); g.setLineDash([]); } }
    // frontene
    for (const f of S.fronter(B, eierAv)) { const ax = sx(f.a.x), ay = sy(f.a.y), bx = sx(f.b.x), by = sy(f.b.y), mx = (ax + bx) / 2, my = (ay + by) / 2; if (!inn(mx, my, 400)) continue;
      g.strokeStyle = f.egen ? 'rgba(240,200,120,.95)' : 'rgba(231,220,195,.6)'; g.lineWidth = f.egen ? 2.5 : 1.5; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx - 5, my - 5); g.lineTo(mx + 5, my + 5); g.moveTo(mx + 5, my - 5); g.lineTo(mx - 5, my + 5); g.stroke(); }
    // egne lags ordre. (runde 13, kritiker H: «krigskartet nær leiren er rotete») lagene selv tegnes av kartet (index.html) – her tegnes
    // ikke et ekstra merke oppå dem lenger; lag som står samlet på skjermen (KLYNGE px), får i stedet ett tall ved siden av stabelen
    const KLYNGE = 26, egnePkt = [];
    if (åpen) for (const s of egneLag()) { if (KROKER.skjul.some(f => f(s))) continue; const x = sx(s.x), y = sy(s.y); egnePkt.push([x, y]);
      if (s.sti) { const e = s.sti[s.sti.length - 1]; g.strokeStyle = sidefarge('blå', 'sti'); g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x, y); g.lineTo(sx(e[0]), sy(e[1])); g.stroke(); g.setLineDash([]); } }
    // ved leiren står antallet alt i leirens navn («Har · 3 lag»), så der tegnes ikke et eget tall
    const Lk = leir(), lx = Lk ? sx(Lk.x) : -1e9, ly = Lk ? sy(Lk.y) : -1e9;
    if (åpen) { const brukt = new Set(); for (let i = 0; i < egnePkt.length; i++) { if (brukt.has(i)) continue; const [x, y] = egnePkt[i]; let n = 1; if (Math.hypot(x - lx, y - ly) < KLYNGE * 1.5) continue;
      for (let j = i + 1; j < egnePkt.length; j++) if (!brukt.has(j) && Math.hypot(egnePkt[j][0] - x, egnePkt[j][1] - y) < KLYNGE) { brukt.add(j); n++; }
      if (n > 1) { g.font = '700 12px "Times New Roman", Times, serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.9)'; g.strokeText(n + ' lag', x + 13, y - 9); g.fillStyle = '#f0c878'; g.fillText(n + ' lag', x + 13, y - 9);
        if (window.Etikett) Etikett.hinder(x + 12, y - 16, 34, 14); } } }
    // tettstedene som merker
    const T = åpen ? bilde() : null, topp = T ? T.trekk.slice(0, 3).map(t => t.by.id) : [], tallPkt = [];
    g.font = '600 13px "Cormorant Garamond", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'top';
    B.forEach((b, i) => { const e = eierAv(b.id); if (!åpen && !e) return; const x = sx(b.x), y = sy(b.y); if (!inn(x, y, 30)) return; const r = Math.max(4, Math.min(13, 3 + Math.sqrt(b.folk) / 14));
      // det felles merkesettet (spill/merker.js, 18. nov): ditt = rektangel, motstanderens = rute på spissen, uten eier = kvadrat
      if (window.Merker) Merker.tegn(g, x, y, { forhold: e ? Merker.forhold(e) : 'nøytral', slag: 'tettsted', farge: e ? sidefarge(e, 'farge') : 'rgba(52,45,34,.92)', r: r + 2 });
      else { g.fillStyle = e ? sidefarge(e, 'farge') : 'rgba(52,45,34,.92)'; g.strokeStyle = '#e7dcc3'; g.lineWidth = e ? 2 : 1.2; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.stroke(); }
      if (valgtBy && valgtBy.id === b.id) { g.strokeStyle = '#f0c878'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r + 5, 0, 6.283); g.stroke(); }
      // (runde 13) tallet legges i det hjørnet av merket som ligger lengst fra egne lag, leiren og de andre tallene (før: alltid oppe til høyre, oppå lagene)
      const nr = topp.indexOf(b.id); if (nr >= 0) { const hjørner = [[r + 5, -r - 5], [-r - 5, -r - 5], [r + 5, r + 5], [-r - 5, r + 5]], L1 = leir(), andre = egnePkt.concat(L1 ? [[sx(L1.x), sy(L1.y)]] : [], tallPkt);
        let bx = x + r + 5, by = y - r - 5, best = -1; for (const [dx, dy] of hjørner) { const px = x + dx, py = y + dy, fri = andre.reduce((m, q) => Math.min(m, Math.hypot(q[0] - px, q[1] - py)), 99); if (fri > best + 2) { best = fri; bx = px; by = py; } }
        tallPkt.push([bx, by]); g.fillStyle = '#c9b26a'; g.beginPath(); g.arc(bx, by, 8, 0, 6.283); g.fill(); g.fillStyle = '#1c170f'; g.font = '700 12px "Times New Roman", Times, "Liberation Serif", serif'; g.textAlign = 'center'; if (window.Etikett) Etikett.hinder(bx - 8, by - 8, 16, 16); g.textBaseline = 'middle'; g.fillText(String(nr + 1), bx, by + .5); g.font = '600 13px "Cormorant Garamond", Georgia, serif'; g.textBaseline = 'top'; }
      // RUNDE 6: navnene går gjennom Etikett (spill/etikett.js) – de tre beste målene og tettsteder med eier foran resten, alle foran
      // kjøretøy, bygg og kaier, og ingen navn ligger oppå hverandre eller oppå merkene
      if (åpen && (i < 14 || e || nr >= 0 || m < 40)) { const P = window.Etikett && Etikett.REGLER.prio, pr = P ? (nr >= 0 ? P.viktig : e ? P.by : P.egne) : 0;
        g.textBaseline = 'alphabetic'; const ty = window.Etikett ? Etikett.tekst(g, b.navn, x, y + r + 13, 1, pr) : y + r + 13;
        g.lineWidth = 3; g.strokeStyle = 'rgba(20,16,10,.85)'; g.strokeText(b.navn, x, ty); g.fillStyle = '#e7dcc3'; g.fillText(b.navn, x, ty); g.textBaseline = 'top'; } });
    // fiender du vet om
    if (åpen && T) for (const f of T.fiender) { const x = sx(f.x), y = sy(f.y); g.fillStyle = sidefarge(f.side, 'lys'); g.strokeStyle = '#e7dcc3'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill(); g.stroke(); }
    g.restore(); };
  KROKER.tegn.push(tegn);

  // ---------- jevnlig: statuslinja, panelet, seier og fare ----------
  function les(id) { try { const d = JSON.parse(localStorage.getItem(NØKKEL) || 'null'); meldt = d && d.leir === id ? d : { leir: id, vunnet: false, tapt: false, fare: {} }; } catch (e) { meldt = { leir: id, vunnet: false, tapt: false, fare: {} }; } }
  const lagre = () => { try { localStorage.setItem(NØKKEL, JSON.stringify(meldt)); } catch (e) { /* fullt eller sperret */ } };
  // valg = [[tekst, funksjon, forklaring] …]: knapper på kortet (seieren fører til noe: større region eller sterkere motstander)
  function visKort(tittel, tekst, valg) { const d = el('div', {}, el('h2', {}, tittel), el('p', {}, tekst)); if (valg && valg.length) { for (const [t, fn, forkl] of valg) { const b = knapp(t, () => { kort.classList.remove('på'); if (fn) fn(); }, { 'data-valg': t }); d.append(el('div', { klasse: 'valg' }, b, forkl ? el('small', {}, forkl) : '')); } } else d.append(knapp('Fortsett', () => kort.classList.remove('på'))); kort.replaceChildren(d); kort.classList.add('på'); if (typeof tempo !== 'undefined' && document.getElementById('sp0') && tempo > 0) document.getElementById('sp0').click(); }
  // (R1-løkka 26. nov) der egne lag blir slått ut (alle døde eller ingen friske igjen), huskes i meldt.tap per leir (høyst 12, ett døgn),
  // så «Neste trekk» ikke foreslår stedet på nytt med en gang (Strategi.REGLER.tap)
  const iLive = new Map();
  function sjekkTap() { if (!meldt || !meldt.leir) return; let endret = false; const R = S.REGLER.tap;
    for (const s of ENHETER) { if (s.side !== 'blå' || s.karakter || s.leirvakt || !Array.isArray(s.menn)) continue; const ute = !levende(s) || !s.menn.some(m => m.hp >= 1), før = iLive.get(s);
      iLive.set(s, !ute); if (før === true && ute) { (meldt.tap = meldt.tap || []).push({ x: Math.round(s.x), y: Math.round(s.y), tid: Math.round(tid), navn: s.navn }); endret = true; } }
    if (meldt.tap && meldt.tap.length) { const n = meldt.tap.length; meldt.tap = meldt.tap.filter(q => tid - q.tid <= R.tid && q.tid <= tid + 1).slice(-12); if (meldt.tap.length !== n) endret = true; }
    if (endret) { lagre(); sist = ''; } }
  setInterval(() => { try { sjekkTap(); } catch (e) { /* neste gang */ } }, 1000);
  function takt() { const T = bilde(); kn.hidden = stat.hidden = !T; if (!T) return; const L = leir(), id = Math.round(L.x) + ',' + Math.round(L.y); if (meldt.leir !== id) les(id);
    if (L && meldt.leir !== id) les(id);
    const a = T.st.sider.blå.andel; document.getElementById('sKrig').textContent = S.prosent(a) + ' %' + (T.ut.fare.length ? ' ⚠' : '');
    // (runde 13) radiodekningen med terrenget regnes ut på forhånd for forslagene og det valgte stedet, så «Neste trekk» og advarselen har den klar
    if (åpen && auto() && KR()) { let ny = 0; for (const p of [...T.trekk.slice(0, 4).map(t => t.by), ...(valgtBy ? [valgtBy] : [])]) if (terrengKjent(p) === undefined && ny++ < 2) terrengSjekk(p).then(() => { sist = ''; vis(false); }); }
    vis(false); if (!auto()) return; const R = S.REGLER;
    for (const s of T.ut.fare) if (!meldt.fare[s]) { meldt.fare[s] = true; lagre(); logg(`${fraksjon(s).navn} holder nå ${S.prosent(T.st.sider[s].andel)} % av folket i området – de vinner ved ${S.prosent(R.seier)} %. Åpne krigskartet (Krig).`); }
    for (const s of Object.keys(meldt.fare)) if (!T.ut.fare.includes(s) && T.st.sider[s] && T.st.sider[s].andel < R.fare - .05) { delete meldt.fare[s]; lagre(); }
    if (T.ut.vinner === 'blå' && !meldt.vunnet) { meldt.vunnet = true; meldt.seire = (meldt.seire || 0) + 1; lagre(); seierKort(a); }
    else if (T.ut.vinner && T.ut.vinner !== 'blå' && !meldt.tapt) { meldt.tapt = true; lagre(); visKort(`${fraksjon(T.ut.vinner).navn} har overtaket`, `De holder ${S.prosent(T.st.sider[T.ut.vinner].andel)} % av folket i området. Ta tettsteder tilbake for å snu krigen.`); }
    else if (T.ut.vinner !== 'blå' && meldt.vunnet && a < R.seier - .08) { meldt.vunnet = false; lagre(); } }
  // SEIEREN FØRER TIL NOE (natt 18. nov): fortsett som nå, ta en større region (flere tettsteder, seieren må vinnes på nytt), eller møt en
  // sterkere motstander (fienden treffer 25 % bedre per valg – ScenarioSpill.sterkere). Valgene huskes per leir.
  function størreRegion() { meldt.nivå = (meldt.nivå || 0) + 1; meldt.vunnet = false; meldt.fare = {}; lagre(); byNøkkel = ''; const B = område(); logg(`Krigen utvides: området er nå ${Math.round((B.radius || 0) / 1000)} km rundt leiren, med ${B.length} tettsteder.`); sist = ''; vis(true); skitten = true; return B.length; }
  function sterkere() { const n = window.ScenarioSpill && ScenarioSpill.sterkere ? ScenarioSpill.sterkere() : null; logg(n ? `Motstanderne har samlet seg: de treffer nå ${Math.round(n * 100)} % av det vanlige.` : 'Motstanderne samler seg.'); return n; }
  function seierKort(a) { const n = meldt.seire || 1; if (window.DagbokSpill && DagbokSpill.noter) DagbokSpill.noter(`Seier nr. ${n}: ${fraksjon('blå').navn} holder ${S.prosent(a)} % av folket i området.`);
    visKort('Området er ditt', `${fraksjon('blå').navn} holder ${S.prosent(a)} % av folket i området. Du har vunnet denne krigen. Hva nå?`, [
      ['Større region', størreRegion, 'Krigen utvides til flere tettsteder lenger unna. Du må vinne på nytt.'],
      ['Sterkere motstander', sterkere, 'Samme område, men fienden treffer bedre.'],
      ['Fortsett som nå', null, 'Spill videre uten endringer.'],
      ...(window.ScenarioSpill && ScenarioSpill.etterspill ? [['Se krigen på nytt', () => ScenarioSpill.etterspill(), 'Spol gjennom hvem som holdt hva.']] : [])]); }
  // (runde 14, kritiker I: den kompakte stripa lå oppå «⏭ Stoppet: …» og «Spol videre») står stoppkortet (#flytkort) der stripa ville
  // ligget, flyttes stripa ned under kortet; når kortet er borte, går den tilbake
  let flyttetNed = false;
  setInterval(() => { const fk = document.getElementById('flytkort'), oppe = åpen && inne && fk && fk.classList.contains('på') && fk.getClientRects().length;
    if (!oppe) { if (flyttetNed) { panel.style.top = ''; panel.style.bottom = ''; flyttetNed = false; } return; }
    const a = fk.getBoundingClientRect(); if (flyttetNed) { panel.style.top = ''; panel.style.bottom = ''; } const b = panel.getBoundingClientRect();
    if (a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom) { panel.style.top = Math.round(a.bottom + 6) + 'px'; panel.style.bottom = 'auto'; flyttetNed = true; } else if (flyttetNed) { panel.style.bottom = ''; flyttetNed = false; } }, 250);
  setInterval(takt, 2000); window.addEventListener('riksbrudd-spill', () => setTimeout(takt, 300));
  const api = { test: false, boks, skjul, skjult: () => inne, passInn, friDel, nivå: () => meldt.nivå || 0, seire: () => meldt.seire || 0, størreRegion, sterkere, seierKort, område, åpne, lukk, erÅpen: () => åpen, bilde, send, advarsel: () => advarsel, kontakt, utenforRadio, terrengSjekk, terrengKjent, settTerreng: (p, blokk) => { if (blokk === null) TERRENG.delete(terrengNøkkel(p)); else TERRENG.set(terrengNøkkel(p), { blokk: !!blokk }); }, rekkeviddeTil, farer, vern, kjentForsvar, sjekkTap, tap: () => (meldt.tap || []), fredSlutt, hvorforIkkeTar, speid, speider, sendTil, varsel: () => flyt, mannTekst, scenarioBoks, velg: id => { valgtBy = område().find(b => b.id === id) || null; vis(true); skitten = true; return !!valgtBy; }, takt, tegn };
  window.StrategiSpill = api;
})();
