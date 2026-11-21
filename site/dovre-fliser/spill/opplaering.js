'use strict';
/* Riksbrudd – OPPLÆRING I SPILLET (18. nov, nattarbeid «ui»). Den første timen: fem små oppgaver, én om gangen, i en liten rute
 * nederst – og en ring som peker på knappen eller stedet oppgaven gjelder. Ruta kan hoppes over (ett steg) og slås av (alt).
 * Reglene øverst er uten DOM (Opplaering.neste/ferdig/fra/til – test_opplaering.js); visningen nederst (window.OpplaeringSpill).
 * Stegene leser et øyeblikksbilde av spillet, som målene i maal.js: de er ferdige når tingen faktisk er gjort, ikke når du trykker.
 * Lagres per leir («riksbrudd-opplaering»); «slått av» gjelder alle spill («riksbrudd-opplaering-av»).
 * I testene (navigator.webdriver) vises ingenting før OpplaeringSpill.test = true.
 */
(function (rot) {
  // Stegene og rekkefølgen er Claudes forslag (oppdraget ga eksemplene).
  const STEG = [
    { id: 'leir', tittel: 'Åpne Leir', tekst: 'Alt i leiren styres herfra: bygg, lager, plan og mål. Trykk på Leir.', mål: 'leir', ferdig: b => b.leirÅpnet },
    { id: 'brakke', tittel: 'Bygg en brakke', tekst: 'Folkene trenger senger. I fanen Bygg: velg Brakke, trykk på et flatt sted ved leiren, og bekreft.', mål: 'brakke', ferdig: b => b.brakker > 0 },
    { id: 'bygg2', tittel: 'Sett to på bygg', tekst: 'Åpne Folk og se at minst to står på Bygg (bruk + hvis det mangler). To personer er ett byggelag – uten dem blir ingenting bygget.', mål: 'folk', ferdig: b => b.folkÅpnet && b.påBygg >= 2,
      krav: b => `På Bygg: ${b.påBygg || 0} av 2` + (b.folkÅpnet ? '' : ' · åpne Folk') },
    { id: 'tropp', tittel: 'Lag en tropp', tekst: 'Åpne Tropper, velg noen av folkene og gi troppen et navn. Tropper kan du sende ut i kartet.', mål: 'tropper', ferdig: b => b.tropper > 0 },
    { id: 'gaa', tittel: 'Gå i 3D', tekst: 'Trykk 3D for å se landet ovenfra, og så Gå for å gå rundt i leiren selv.', mål: '3d', ferdig: b => b.går },
    // (balansen runde 4, 18. nov) det gjennomspillingen viste at en ny spiller trenger for å klare den første uka: to tropper, mat,
    // forsvar når alarmen går, og reparasjon etter angrep. Rekkefølgen og «før dag 4» er Claudes forslag.
    // (runde 8, kritiker C og D) «Ha to tropper før dag 4» fikk nye spillere til å gjøre alle folkene til soldater (brakka ble aldri
    // bygget). Nå holder det med en liten tropp til ELLER to på Vakt i Folk (Leirvakta forsvarer leiren når røverne kommer), og teksten
    // sier hva det koster i arbeidskraft og hvordan du får flere folk. kort = teksten på telefon (tre linjer).
    { id: 'tropp2', tittel: 'Mer forsvar før dag 4', tekst: 'Røverbølgene vokser. Lag en liten tropp til (2–4) eller sett to på Vakt i Folk. Hver soldat er en arbeider mindre: la minst to stå på Bygg. Flere folk: Rekrutter i Folk.',
      kort: 'En liten tropp til (2–4) eller to på Vakt i Folk. La minst to stå på Bygg – flere folk: Rekrutter i Folk.', mål: 'tropper', ferdig: b => b.tropper >= 2 || b.påVakt >= 2,
      // RUNDE 13 (kritiker H: steget sto i tre døgn uten at det gikk fram hva som manglet): kravet står konkret, og «eller» betyr eller –
      // to på Vakt holder alene (før krevde det også en tropp, uten at teksten sa det)
      krav: b => `Nå: ${b.påVakt || 0} på Vakt (trenger 2) – eller ${b.tropper || 0} ${b.tropper === 1 ? 'tropp' : 'tropper'} (trenger 2)`,
      kravKort: b => `${b.påVakt || 0}/2 på vakt` },
    { id: 'mat', tittel: 'Ha mat til tre døgn', tekst: 'Hver person spiser én rasjon per døgn. Kjøp mat i Folk, send et lag på jakt eller fiske, så en åker – eller bygg et drivhus.', mål: 'folk', ferdig: b => b.matDøgn >= 3,
      krav: b => `Mat nå: ${String(Math.floor((b.matDøgn || 0) * 10) / 10).replace('.', ',')} døgn av 3` },
    { id: 'forsvar', tittel: 'Sett lagene i forsvar', tekst: 'Når røverne kommer, står det et rødt banner øverst: trykk «Forsvar leiren». Øv gjerne nå: Leir → Bygg → rull ned til Forsvar → «Øv».', mål: 'forsvar', ferdig: b => b.forsvarSatt },
    // (runde 8, kritiker D: steget sto oppe under angrepet selv om leiren ikke hadde ferdige bygg) vises bare når noe er skadet;
    // et angrep som er over uten skade, gjør steget ferdig uten at det har vært vist
    { id: 'reparer', tittel: 'Reparer byggene etter et angrep', tekst: 'Etter et angrep er byggene skadet. Trykk «Reparer alle» i banneret, eller velg et bygg og Reparer. Ledige byggelag reparerer også av seg selv.', mål: 'reparer', ferdig: b => b.angrep && b.skadet === 0, vises: b => b.skadet > 0 },
  ];
  // stegene som kom i runde 4: en opplæring som alt var ferdig og lukket (lagret uten v), får dem ikke på nytt
  const NYE = ['tropp2', 'mat', 'forsvar', 'reparer'];
  const tom = () => ({ gjort: [], hoppet: [], slutt: false });
  const fra = t => { let o = null; try { o = typeof t === 'string' ? JSON.parse(t) : t; } catch (e) { o = null; } const T = tom(); if (!o || typeof o !== 'object') return T;
    const ok = a => (Array.isArray(a) ? a.filter(x => STEG.some(s => s.id === x)) : []); T.gjort = ok(o.gjort); T.hoppet = ok(o.hoppet); T.slutt = !!o.slutt; T.leir = typeof o.leir === 'string' ? o.leir : undefined;
    if (T.slutt && !(o.v >= 2)) for (const id of NYE) if (!T.gjort.includes(id) && !T.hoppet.includes(id)) T.hoppet.push(id);
    return T; };
  const til = T => JSON.stringify({ v: 2, leir: T.leir, gjort: T.gjort, hoppet: T.hoppet, slutt: T.slutt });
  const tatt = (T, id) => T.gjort.includes(id) || T.hoppet.includes(id);
  // første steg som verken er gjort eller hoppet over
  const neste = T => STEG.find(s => !tatt(T, s.id)) || null;
  // går gjennom bildet: steget som står for tur (og de etter, så lenge de også er gjort) merkes som gjort. Svarer id-ene som ble ferdige.
  function oppdater(T, bilde) { const nye = []; for (;;) { const s = neste(T); if (!s) break; let f = false; try { f = !!s.ferdig(bilde); } catch (e) { f = false; } if (!f) break; T.gjort.push(s.id); nye.push(s.id); } return nye; }
  const hopp = T => { const s = neste(T); if (s) T.hoppet.push(s.id); return s ? s.id : null; };
  const ferdig = T => !neste(T);
  const nr = T => { const s = neste(T); return s ? STEG.indexOf(s) + 1 : STEG.length; };
  // skal steget vises nå? (et steg uten vises-regel vises alltid)
  const vises = (s, bilde) => { if (!s || !s.vises) return !!s; try { return !!s.vises(bilde || {}); } catch (e) { return true; } };
  // (runde 8, kritiker C: steg 6 dekket kartet i tre spilldøgn) Claudes forslag: et steg som står ugjort LENGE.ms ekte tid eller
  // LENGE.min spillminutter (det som kommer først), legges sammen til én linje av seg selv. + henter det fram igjen for en ny periode.
  const LENGE = { ms: 120000, min: 180 };
  const lenge = (fra, nå) => !!fra && (nå.ms - fra.ms > LENGE.ms || nå.tid - fra.tid > LENGE.min);
  // (runde 13) kravet for steget akkurat nå («På Bygg: 1 av 2»), eller '' når steget ikke har noe tall
  const krav = (s, bilde, kort) => { const f = s && (kort && s.kravKort ? s.kravKort : s.krav); if (!f || !bilde) return ''; try { return String(f(bilde) || ''); } catch (e) { return ''; } };
  const Opplaering = { STEG, LENGE, tom, fra, til, neste, oppdater, hopp, ferdig, nr, vises, lenge, krav };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Opplaering; return; }
  rot.Opplaering = Opplaering;

  // ---------------- visningen ----------------
  const $ = id => document.getElementById(id), NØKKEL = 'riksbrudd-opplaering', AV = 'riksbrudd-opplaering-av';
  const les = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, skriv = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sperret */ } };
  let sisteBilde = null, T = tom(), av = les(AV) === '1', sett = { leir: false, folk: false, forsvar: false }, sistSteg = null;
  // (runde 6) Claudes forslag: et gjort steg står med ✓ i VIS_GJORT ms før neste vises; «ferdig»-ruta lukker seg selv etter FERDIG_LUKK ms
  const VIS_GJORT = 3500, FERDIG_LUKK = 12000; let gjortKø = [], gjortTil = 0, ferdigFra = 0, sammen = les('riksbrudd-opplaering-sammen') === '1';
  // (runde 8) foldetNå = ruta står som én linje nå: valget ditt (sammen, huskes), «Senere» (utsatt = stegets id), steget har stått
  // ugjort lenge (Opplaering.lenge – stegFra), eller leiren angripes. + under et angrep holder ruta oppe til angrepet er over (oppeAngrep).
  let foldetNå = sammen, utsatt = null, stegFra = null, oppeAngrep = false, rulletTil = false, menyFra = 0;
  const spilltid = () => (typeof tid !== 'undefined' && isFinite(tid) ? tid : 0);
  const angrepNå = () => { if (API.angrepTest !== undefined) return !!API.angrepTest; try { const T0 = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null; return !!(T0 && T0.aktiv) || synlig($('alarm')); } catch (e) { return false; } };
  const css = document.createElement('style');
  css.textContent = `#opplaering{ position:fixed; left:50%; transform:translateX(-50%); bottom:calc(98px + env(safe-area-inset-bottom,0px)); z-index:7; display:none; box-sizing:border-box; width:min(490px, calc(100vw - 16px)); padding:9px 12px 10px 46px; background:linear-gradient(180deg,rgba(42,33,20,.97),rgba(23,18,10,.97)); border:1px solid #c9b26a; box-shadow:0 0 0 1px #0d0a06, 0 10px 28px rgba(0,0,0,.6); border-radius:5px; color:var(--ink,#e7dcc3); font-size:14px; line-height:1.35; }
#opplaering.på{ display:block; animation:oppinn .3s ease-out; } @keyframes oppinn{ from{ opacity:0; transform:translate(-50%, 12px); } }
#opplaering .nr{ position:absolute; left:10px; top:10px; width:27px; height:27px; line-height:26px; border-radius:50%; border:1px solid #c9b26a; text-align:center; font-family:"IM Fell English",serif; font-size:15px; color:#f0dc9a; }
#opplaering small{ display:block; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:#a89970; } #opplaering b{ display:block; font-family:"IM Fell English",serif; font-weight:400; font-size:18px; color:#f0dc9a; margin:0 0 2px; }
#opplaering .rad{ display:flex; gap:6px; justify-content:flex-end; margin-top:7px; } #opplaering .rad button{ height:28px; padding:0 10px; background:#241c10; border:1px solid #5a4a2a; color:var(--ink-dim,#a69b82); font:inherit; font-size:12.5px; cursor:pointer; }
#opplaering .rad button:hover{ color:var(--ink,#e7dcc3); border-color:#c9b26a; } #opplaering .prikker{ position:absolute; left:12px; bottom:12px; display:flex; gap:4px; } #opplaering .prikker i{ width:6px; height:6px; border-radius:50%; background:#4a3d24; } #opplaering .prikker i.g{ background:#c9b26a; } #opplaering .prikker i.n{ background:#fff3c8; box-shadow:0 0 5px #f0dc9a; }
#opplaering .krav{ display:block; margin-top:4px; font-size:12.5px; color:#f0dc9a; } body #opplaering.sammen .krav, body #opplaering.liten .krav{ display:none; }
#opplaering.ok b::after{ content:' ✓'; color:#a8d47a; }
#oppring{ position:fixed; z-index:28; display:none; pointer-events:none; border:2px solid #f0dc9a; border-radius:8px; box-shadow:0 0 0 3px rgba(240,220,154,.25), 0 0 16px rgba(240,220,154,.7); animation:oppring 1.3s ease-in-out infinite; }
#oppring.på{ display:block; } @keyframes oppring{ 50%{ box-shadow:0 0 0 8px rgba(240,220,154,.08), 0 0 22px rgba(240,220,154,.9); transform:scale(1.06); } }
body.kort #opplaering{ left:calc(8px + env(safe-area-inset-left,0px)); right:calc(52px + env(safe-area-inset-right,0px)); width:auto; max-width:440px; transform:none; animation:none; bottom:calc(64px + env(safe-area-inset-bottom,0px)); font-size:13px; padding:7px 10px 8px 42px; } body.kort #opplaering b{ font-size:16px; } body.kort #opplaering .nr{ left:8px; top:8px; }
#opplaering.liten{ right:calc(8px + env(safe-area-inset-right,0px)) !important; bottom:calc(var(--oppbunn, 5px) + env(safe-area-inset-bottom,0px)) !important; top:auto !important; padding:5px 10px 5px 38px; pointer-events:none; opacity:.96; } #opplaering.liten .t, #opplaering.liten .rad, #opplaering.liten small, #opplaering.liten .prikker{ display:none; }
#opplaering.liten .nr{ left:7px; top:4px; width:22px; height:22px; line-height:21px; font-size:13px; } #opplaering.liten b{ font-size:15px; margin:0; }
body.kort.gaar #opplaering{ bottom:auto; top:calc(var(--topp,44px) + 64px); } body.foto #opplaering, body.foto #oppring, body.bygger2d.kort #opplaering{ display:none !important; }
/* PC: mens et bygg plasseres ligger byggebanneret nederst – opplæringen flyttes opp så de ikke dekker hverandre */
body.bygger2d:not(.kort) #opplaering{ bottom:auto; top:calc(var(--topp,44px) + 22px); }
/* RUNDE 6 (kritikerne): på telefon tok ruta den nederste tredjedelen (ca. 200 px) – nå to–tre linjer tekst og små knapper på én rad,
   og den kan legges sammen til én linje (–/+ oppe til høyre, huskes); et steg som blir gjort, står med ✓ en liten stund før neste */
#oppfold{ position:absolute; right:6px; top:5px; width:24px; height:22px; padding:0; background:none; border:1px solid #5a4a2a; border-radius:3px; color:#c9b26a; font:inherit; font-size:15px; line-height:18px; cursor:pointer; }
#opplaering:has(#oppfold) small{ padding-right:26px; } body #opplaering.sammen{ padding-top:5px; padding-bottom:5px; } body #opplaering.sammen .t, body #opplaering.sammen .rad, body #opplaering.sammen .prikker, body #opplaering.sammen small{ display:none; }
#opplaering.sammen .nr{ top:4px; width:22px; height:22px; line-height:21px; font-size:13px; } #opplaering.sammen b{ font-size:15px; margin:0; padding-right:28px; } #opplaering.sammen #oppfold{ top:4px; }
#opplaering.gjort{ border-color:#8fc46a; } #opplaering.gjort .nr{ border-color:#8fc46a; color:#bfe39e; } #opplaering.gjort small{ color:#9fd08a; }
body.kort #opplaering .t{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; }
body.kort #opplaering .rad{ flex-wrap:nowrap; justify-content:flex-start; gap:5px; margin-top:5px; } body.kort #opplaering .rad button{ height:30px; min-height:30px; padding:0 9px; font-size:12.5px; }
body.kort #opplaering .prikker{ display:none; } body.kort #opplaering{ padding-bottom:7px; }
/* (runde 6) bunnmenyen står nå også med en meny åpen (skjermlag.js): den sammenlagte linja står over den */
body.mkomalltid.mkom{ --oppbunn:64px; }
/* (runde 8) på telefon vant «body.kort #opplaering .t» over .liten og .sammen, så teksten sto likevel (ruta dekket lista og «Opprett» i «Lag ny tropp») */
html body #opplaering.liten .t, html body #opplaering.liten .rad, html body #opplaering.liten small, html body #opplaering.liten .prikker, html body #opplaering.liten #oppfold,
html body #opplaering.sammen .t, html body #opplaering.sammen .rad, html body #opplaering.sammen small, html body #opplaering.sammen .prikker{ display:none; }
/* (runde 8) menyen får plass under linja nederst: innholdet kan rulles opp over den */
body.kort.oppliten :is(#leirmeny, #folkmeny, #tropppanel, #krig, #karakterark, #sekk){ padding-bottom:46px; scroll-padding-bottom:46px; }
/* (runde 10) på telefon er ruta ugjennomsiktig – kildeteksten, målestokken og kompassrosa skinte gjennom */
body.kort #opplaering{ background:linear-gradient(180deg,#2a2114,#17120a); } body.kort #opplaering.liten{ opacity:1; }
/* RUNDE 12: liggende telefon – lagt sammen er ruta en smal brikke (nummer, tittel, +) nede til venstre over bunnmenyen; hele brikka kan trykkes */
body.kort.tlfligg #opplaering.sammen:not(.liten){ right:auto; width:max-content; max-width:min(380px, calc(100vw - 130px)); cursor:pointer; pointer-events:auto; }
body.kort.tlfligg #opplaering.sammen:not(.liten) b{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
@media (prefers-reduced-motion:reduce){ #opplaering.på, #oppring{ animation:none; } }`;
  document.head.appendChild(css);
  const boks = document.createElement('div'); boks.id = 'opplaering'; boks.setAttribute('role', 'status'); const ring = document.createElement('div'); ring.id = 'oppring'; document.body.append(boks, ring);
  // RUNDE 12: liggende telefon – trykk hvor som helst på den smale brikka åpner steget (som +)
  boks.addEventListener('click', e => { if (!boks.classList.contains('sammen') || boks.classList.contains('liten') || (e.target.closest && e.target.closest('button'))) return; const f = document.getElementById('oppfold'); if (f && document.body.classList.contains('tlfligg')) f.click(); });
  const leirNøkkel = () => { const S = rot.OppstartSpill && OppstartSpill.tilstand && OppstartSpill.tilstand(); return S && S.leir ? Math.round(S.leir.x) + ',' + Math.round(S.leir.y) : null; };
  function last() { const k = leirNøkkel(), o = fra(les(NØKKEL)); T = k && o.leir === k ? o : tom(); T.leir = k || undefined; sett = { leir: false, folk: false, forsvar: false }; }
  const lagre = () => { if (T.leir) skriv(NØKKEL, til(T)); };
  const synlig = e => !!e && e.getClientRects().length > 0;
  const kn = k => { const a = document.querySelector('#kommando [data-k="' + k + '"]'), b = document.querySelector('#mkom [data-k="' + k + '"]'); return synlig(a) ? a : synlig(b) ? b : null; };
  function bilde() { const L = rot.LeirSpill && LeirSpill.tilstand && LeirSpill.tilstand(), F = rot.FolkSpill && FolkSpill.tilstand && FolkSpill.tilstand();
    if ($('leirmeny') && $('leirmeny').classList.contains('på')) sett.leir = true; if ($('folkmeny') && $('folkmeny').classList.contains('på')) sett.folk = true;
    return { leirÅpnet: sett.leir, brakker: L ? L.bygg.filter(b => b.type === 'brakke').length : 0, folkÅpnet: sett.folk, påBygg: F && F.personer ? F.personer.filter(p => p.oppgave === 'bygg').length : 0,
      tropper: typeof ENHETER !== 'undefined' ? ENHETER.filter(s => s.fraFolk && levende(s)).length : 0, påVakt: F && F.personer ? F.personer.filter(p => p.oppgave === 'vakt').length : 0, går: typeof R3 !== 'undefined' && !!(R3 && R3.fot) && typeof på3d !== 'undefined' && på3d,
      ...bilde4(L, F) }; }
  // (runde 4) mat, forsvar og reparasjon: matDøgn (mat per person), forsvarSatt (forsvaret – eller en øvelse – har vært satt),
  // angrep (minst én bølge er over) og skadet (bygg under 98 % som ikke repareres)
  function bilde4(L, F) { if (rot.ForsvarSpill && ForsvarSpill.erSatt && ForsvarSpill.erSatt()) sett.forsvar = true; const T0 = rot.SpilletSpill && SpilletSpill.klar && SpilletSpill.klar() ? SpilletSpill.T() : null;
    return { matDøgn: F && F.personer && F.personer.length ? F.mat / F.personer.length : 99, forsvarSatt: sett.forsvar, angrep: !!(T0 && T0.bølge >= 1 && !T0.aktiv),
      skadet: L ? L.bygg.filter(b => b.igjen <= 0 && b.hp > 0 && b.hp < .98 && !b.arbeid).length : 0 }; }
  // hva ringen skal stå rundt for steget: knappen i kommandolinja, eller neste ting inne i menyen når den alt er åpen
  function pekPå(s) { if (!s) return null; const lm = $('leirmeny'), åpen = lm && lm.classList.contains('på');
    if (s.mål === 'leir') return kn('leir') || $('leirknapp');
    if (s.mål === 'brakke') { if ($('byggvalg') && synlig($('byggvalg'))) return null; if (åpen) { const fane = [...lm.querySelectorAll('.faner button, [data-fane-knapp]')].find(b => /^Bygg/.test(b.textContent.trim())); const rad = lm.querySelector('.bygg[data-type="brakke"]'); return synlig(rad) ? rad : synlig(fane) ? fane : null; } return kn('leir') || $('leirknapp'); }
    if (s.mål === 'folk') { const fm = $('folkmeny'); if (fm && fm.classList.contains('på')) return null; return kn('folk') || $('folkknapp'); }
    if (s.mål === 'tropper') { const tp = $('tropppanel'); if (tp && tp.classList.contains('på')) return null; return kn('tropper') || $('nytropp'); }
    if (s.mål === '3d') return typeof på3d !== 'undefined' && på3d ? $('gaaknapp') : $('v3d');
    // (runde 8: gjennomspillingen fant ikke «Øv» – delen Forsvar står langt nede og kan være lagt sammen) ringen står rundt overskriften
    // når knappen ikke synes, og menyen rulles én gang (per åpning) så Forsvar kommer til syne
    // (paneler.js setter menyen øverst like etter at den åpnes – derfor rulles den først når den har vært åpen et knapt sekund)
    if (s.mål === 'forsvar') { if (synlig($('forsvarknapp'))) return $('forsvarknapp'); if (!åpen) { rulletTil = false; menyFra = 0; return kn('leir') || $('leirknapp'); }
      if (!menyFra) menyFra = performance.now(); const ov = $('forsvarov'), h = [...lm.querySelectorAll('h3')].find(q => /^Forsvar/.test(q.textContent.trim())), m = synlig(ov) ? ov : synlig(h) ? h : null;
      const hva = m === ov ? 'øv' : 'overskrift'; if (m && rulletTil !== hva && performance.now() - menyFra > 900) { rulletTil = hva; try { m.scrollIntoView({ block: 'center' }); } catch (e) { /* eldre nettleser */ } }
      if (m) return m; const fb = [...lm.querySelectorAll('.faner button, [data-fane-knapp]')].find(b => /^Bygg/.test(b.textContent.trim())); return synlig(fb) ? fb : null; }
    if (s.mål === 'reparer') return synlig($('reparerknapp')) ? $('reparerknapp') : null;
    return null; }
  function tegn(s, okTekst, gjort) { const kort = document.body.classList.contains('kort'), n = gjort ? STEG.indexOf(gjort) + 1 : Opplaering.nr(T), kv = !gjort && !okTekst ? Opplaering.krav(s, sisteBilde) : '', sig = (gjort ? 'gjort:' + gjort.id : s ? s.id : 'slutt') + '|' + (okTekst || '') + '|' + kort + '|' + foldetNå + '|' + kv; if (sig === sistSteg) return; sistSteg = sig; boks.textContent = '';
    boks.classList.toggle('gjort', !!gjort); boks.classList.toggle('sammen', foldetNå);
    if (gjort) { const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x !== undefined) e.textContent = x; return e; };
      boks.append(el('div', 'nr', '✓'), el('small', '', `Opplæring · ${n} av ${STEG.length} · gjort`), el('b', '', '✓ ' + gjort.tittel), el('span', 't', gjortKø.length > 1 ? 'Gjort. Neste steg er også gjort – se under.' : 'Gjort! Neste steg kommer om et øyeblikk.'));
      const rad = el('div', 'rad'), v = el('button', '', 'Neste ›'); v.id = 'oppneste'; v.onclick = () => { gjortTil = 1; kjør(); }; rad.appendChild(v); boks.appendChild(rad); fold(); return; }
    const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x !== undefined) e.textContent = x; return e; };
    boks.classList.toggle('ok', !!okTekst); boks.append(el('div', 'nr', okTekst ? '✓' : String(n)), el('small', '', `Opplæring · ${okTekst ? 'ferdig' : n + ' av ' + STEG.length}`), el('b', '', okTekst ? okTekst : s.tittel + (kv && foldetNå ? ' · ' + Opplaering.krav(s, sisteBilde, true) : '')));
    boks.appendChild(el('span', 't', okTekst ? 'Bra. Videre går det etter målene: åpne Leir og velg fanen Mål.' : kort && s.kort ? s.kort : s.tekst));
    // (runde 13) kravet med tallene akkurat nå
    if (kv) { const k = el('span', 'krav', kv); k.id = 'oppkrav'; boks.appendChild(k); }
    const rad = el('div', 'rad'); if (!okTekst) { const h = el('button', '', 'Hopp over'); h.id = 'opphopp'; h.onclick = () => { Opplaering.hopp(T); lagre(); gjortKø = []; gjortTil = 0; kjør(); }; rad.appendChild(h);
      // (runde 8, kritiker C) «Senere»: legg dette steget sammen til én linje nå (+ henter det fram igjen)
      const u = el('button', '', 'Senere'); u.id = 'oppsenere'; u.title = 'Legg steget sammen til én linje – trykk + for å se det igjen'; u.onclick = () => { utsatt = s.id; sistSteg = null; kjør(); }; rad.appendChild(u); }
    const a = el('button', '', okTekst ? 'Lukk' : kort ? 'Slå av' : 'Slå av opplæringen'); a.id = 'oppav'; a.onclick = () => (okTekst ? (T.slutt = true, lagre(), kjør()) : slå(false)); rad.appendChild(a);
    // hjelpen («Slik spiller du») åpnes ikke av seg selv mens opplæringen går (hjelp.js første()) – den ligger bak denne knappen
    if (typeof window.visHjelp === 'function') { const h = el('button', 'hjelp', kort ? 'Hjelp' : 'Les mer i hjelpen'); h.id = 'opphjelp'; h.onclick = () => window.visHjelp(true); rad.appendChild(h); }
    boks.appendChild(rad);
    const p = el('div', 'prikker'); STEG.forEach(x => p.appendChild(el('i', tatt(T, x.id) ? 'g' : s && x.id === s.id ? 'n' : ''))); boks.appendChild(p); fold(); }
  // –/+ oppe til høyre: legg ruta sammen til én linje (huskes for alle spill)
  function fold() { const f = document.createElement('button'); f.id = 'oppfold'; f.textContent = foldetNå ? '+' : '–'; f.setAttribute('aria-label', foldetNå ? 'Vis hele opplæringen' : 'Legg sammen opplæringen'); f.title = f.getAttribute('aria-label');
    // lagt sammen av seg selv (Senere, lenge, angrep): + viser det igjen nå uten å endre valget ditt; ellers bytter + / – valget (huskes)
    f.onclick = e => { e.stopPropagation(); const nå0 = Opplaering.neste(T);
      if (liggTlf() && !sammen) { åpnetLigg = foldetNå ? (nå0 ? nå0.id : 'slutt') : null; if (foldetNå) { utsatt = null; stegFra = { id: stegFra && stegFra.id, ms: performance.now(), tid: spilltid() }; oppeAngrep = angrepNå(); } sistSteg = null; kjør(); return; }
      if (foldetNå && !sammen) { utsatt = null; stegFra = { id: stegFra && stegFra.id, ms: performance.now(), tid: spilltid() }; oppeAngrep = angrepNå(); }
      else { sammen = !sammen; skriv('riksbrudd-opplaering-sammen', sammen ? '1' : null); if (!sammen) { utsatt = null; oppeAngrep = angrepNå(); if (stegFra) stegFra = { id: stegFra.id, ms: performance.now(), tid: spilltid() }; } }
      sistSteg = null; kjør(); }; boks.appendChild(f); }
  function slå(på) { av = !på; skriv(AV, av ? '1' : null); if (på && Opplaering.ferdig(T)) { T = tom(); T.leir = leirNøkkel() || undefined; lagre(); } if (!på && typeof logg === 'function') logg('Opplæringen er slått av. Du finner den igjen i Leir-menyen under Mål.'); sistSteg = null; kjør(); }
  // (runde 8, kritiker D: på telefon la lagpanelet seg over opplæringen, og opplæringen over lista og «Opprett» i «Lag ny tropp»)
  // MENYER = store paneler der ruta står som én linje nederst (og panelet får plass under linja: body.oppliten); DEKKER = paneler der
  // ruta viker helt på telefon – også mens «✓ Gjort» vises.
  const MENYER = ['leirmeny', 'folkmeny', 'tropppanel', 'krig', 'karakterark', 'sekk'], DEKKER = ['panel', 'stridpanel', 'byggvalg', 'ressursvalg'];
  function skjul() { boks.classList.remove('på'); ring.classList.remove('på'); document.body.classList.remove('oppliten'); }
  // RUNDE 10 (20. nov, brukerens iPhone liggende): opplæringslinja, hogstfelt-lappen og bunnmenyen lå oppå hverandre nederst. Nå står
  // bare én ting nederst: med en meny åpen på liggende telefon står linja øverst ved siden av menyen (body.oppved), og menyen går helt ned
  // til bunnmenyen. Er det ikke plass ved siden av (tropppanelet er bredt), viker linja. Lappene for hogst/riving og bygging (DEKKER) har
  // forrang nederst. VED_MIN (Claudes forslag): så bred må plassen ved siden av menyen være.
  const VED_MIN = 200;
  // RUNDE 12 (21. nov, kritiker E – liggende telefon): ruta tok ca. 27 % av høyden. Liggende står den som én tynn linje (nummer og tittel)
  // til du trykker + (da vises hele steget til det er gjort eller du trykker –). åpnetLigg = steget du har åpnet. Gjelder bare liggende telefon.
  let åpnetLigg = null;
  const liggTlf = () => document.body.classList.contains('kort') && window.innerWidth > window.innerHeight * 1.2;
  function kjør() { kjørInn(); try { ved(); } catch (e) { /* neste runde */ } }
  function ved() { const b = document.body, W = window.innerWidth, ligg = b.classList.contains('kort') && W > window.innerHeight * 1.2, på = boks.classList.contains('på') && boks.classList.contains('liten');
    const meny = på && ligg ? MENYER.map($).find(e => synlig(e) && e.classList.contains('på')) || MENYER.map($).find(e => synlig(e)) : null;
    const nullstill = () => { if (!b.classList.contains('oppved')) return; for (const k of ['left', 'right', 'top', 'bottom', 'max-width', 'width']) boks.style.removeProperty(k); b.classList.remove('oppved'); };
    if (!meny) { nullstill(); return; }
    const r = meny.getBoundingClientRect(), t = document.querySelector('.top'), topp = Math.round((t ? t.getBoundingClientRect().bottom : 44) + 6), høyre = r.left < W / 2, plass = høyre ? W - r.right - 16 : r.left - 16;
    if (plass < VED_MIN) { nullstill(); skjul(); return; }
    const sett = (k, v) => boks.style.setProperty(k, v, 'important');
    sett('top', topp + 'px'); sett('bottom', 'auto'); sett('width', 'auto'); sett('max-width', Math.min(440, plass) + 'px');
    if (høyre) { sett('left', Math.round(r.right + 8) + 'px'); sett('right', 'auto'); } else { sett('left', 'auto'); sett('right', Math.round(W - r.left + 8) + 'px'); }
    b.classList.add('oppved'); b.classList.remove('oppliten'); }
  function kjørInn() {
    const klar = !!leirNøkkel() && (!navigator.webdriver || API.test === true) && !av, st = $('oppstart'), start = st && st.classList.contains('på'), kort = ($('hendelse') && synlig($('hendelse'))) || ($('hjelp') && synlig($('hjelp'))) || (document.body.classList.contains('kort') && ['morgenkort', 'samfunnkort', 'personkort'].some(id => $(id) && $(id).classList.contains('på') && synlig($(id))));
    if (!klar || start || kort) { skjul(); return; }
    if (T.leir !== leirNøkkel()) last();
    const bl = bilde(), nye = Opplaering.oppdater(T, bl); sisteBilde = bl; if (nye.length) { lagre(); gjortKø.push(...nye); }
    // (runde 6) over «Mer»-raden når den er åpen (den la seg oppå ruta)
    { const km = [$('kommer'), $('mkommer')].find(e => e && e.classList.contains('på') && synlig(e)), b = km ? Math.round(window.innerHeight - km.getBoundingClientRect().top + 8) + 'px' : ''; if (boks.style.bottom !== b) boks.style.bottom = b; }
    const tlf = document.body.classList.contains('kort'), meny = MENYER.some(id => synlig($(id))), dekker = tlf && !meny && DEKKER.some(id => synlig($(id))), angrep = angrepNå();
    if (!angrep) oppeAngrep = false;
    // RUNDE 12: under et angrep på liggende telefon viker ruta helt (banneret, stoppkortet og varslene trenger plassen) – til du åpner den med +
    if (angrep && !oppeAngrep && liggTlf() && !åpnetLigg) { skjul(); return; }
    // på telefon med en meny åpen: én linje nederst, og menyen får plass under den (body.oppliten); med lagpanelet o.l. åpent viker ruta helt
    const liten = (på) => { boks.classList.toggle('liten', på); document.body.classList.toggle('oppliten', på); };
    // (runde 6) et steg som nettopp ble gjort, står med ✓ en stund (før hoppet det videre før man rakk å lese, og et steg som alt var gjort,
    // ble aldri vist – «Hopp over» på steg 6 så ut til å gå rett til steg 8)
    // (runde 13, kritiker G: «4 av 9 Lag en tropp» sto igjen etter at troppen var laget – lagpanelet dekket ruta og ✓ gikk ut før den ble sett)
    // mens et panel dekker, telles ✓-tiden ikke ned, men innholdet er alt byttet til ✓
    if (gjortKø.length && dekker && !document.body.classList.contains('gaar')) { const g = STEG.find(x => x.id === gjortKø[0]); if (g) tegn(null, null, g); gjortTil = 0; skjul(); return; }
    if (gjortKø.length) { const nå = performance.now(); if (!gjortTil) gjortTil = nå + VIS_GJORT;
      if (nå >= gjortTil) { gjortKø.shift(); gjortTil = gjortKø.length ? nå + VIS_GJORT : 0; }
      if (gjortKø.length && !document.body.classList.contains('gaar')) { const g = STEG.find(x => x.id === gjortKø[0]); if (g) { if (dekker) { skjul(); return; }
        foldetNå = sammen || (angrep && !oppeAngrep) || (liggTlf() && !åpnetLigg); tegn(null, null, g); boks.classList.add('på'); ring.classList.remove('på'); liten(tlf && meny); return; } } }
    const s = Opplaering.neste(T);
    if (!s) { if (T.slutt) { skjul(); return; }
      // «Opplæringen er ferdig» lukker seg selv etter en stund (den ble stående under «Mer»)
      if (!ferdigFra) ferdigFra = performance.now(); if (performance.now() - ferdigFra > FERDIG_LUKK) { T.slutt = true; lagre(); skjul(); return; }
      foldetNå = sammen; tegn(null, 'Opplæringen er ferdig'); boks.classList.add('på'); ring.classList.remove('på'); liten(tlf && meny); return; }
    ferdigFra = 0;
    // mens du går (eller sitter i et kjøretøy) er menyene borte: da venter opplæringen til du er tilbake
    if (document.body.classList.contains('gaar') || document.body.classList.contains('ikontrollrom') || document.body.classList.contains('ikamera')) { skjul(); return; }
    // (runde 8) et steg med en vises-regel (reparasjon: bare når noe er skadet) venter usynlig
    if (!Opplaering.vises(s, bl)) { skjul(); return; }
    if (dekker) { skjul(); return; }
    // (runde 8) hvor lenge steget har stått: ugjort lenge, «Senere» eller et angrep legger ruta sammen til én linje
    const nå = { ms: performance.now(), tid: spilltid() }; if (!stegFra || stegFra.id !== s.id) { stegFra = { id: s.id, ms: nå.ms, tid: nå.tid }; if (utsatt !== s.id) utsatt = null; }
    if (åpnetLigg && åpnetLigg !== s.id) åpnetLigg = null;
    const lengeNå = Opplaering.lenge(stegFra, nå);
    foldetNå = sammen || utsatt === s.id || lengeNå || (angrep && !oppeAngrep) || (liggTlf() && åpnetLigg !== s.id);
    tegn(s); boks.classList.add('på'); liten(tlf && meny);
    const m = pekPå(s), inni = e => { const p = e && e.closest && e.closest('#leirmeny, #folkmeny, #tropppanel'); if (!p) return true; const a = e.getBoundingClientRect(), b = p.getBoundingClientRect(); return a.bottom > b.top + 4 && a.top < b.bottom - 4; };
    // (runde 8) ringen tegnes ikke rundt noe som er rullet ut av menyen (den sto over bunnmenyen)
    // RUNDE 12: ringen lyste rundt Tropper i flere spilldøgn mens steget var lagt sammen – den står ikke når steget er utsatt, har stått lenge
    // eller du har lagt opplæringen sammen selv (den korte linja liggende viser den fortsatt)
    if (m && synlig(m) && inni(m) && !sammen && utsatt !== s.id && !lengeNå) { const r = m.getBoundingClientRect(); ring.style.left = r.left - 4 + 'px'; ring.style.top = r.top - 4 + 'px'; ring.style.width = r.width + 8 + 'px'; ring.style.height = r.height + 8 + 'px'; ring.classList.add('på'); } else ring.classList.remove('på'); }
  // (runde 13) et steg sjekkes straks etter et trykk (troppen er laget, noen er satt på Vakt …), ikke bare hvert 0,4 s
  document.addEventListener('click', () => setTimeout(kjør, 60));
  setInterval(kjør, 400); window.addEventListener('riksbrudd-spill', () => { last(); setTimeout(kjør, 600); }); window.addEventListener('resize', kjør);
  // Leir-menyen, fanen Mål: slå opplæringen av og på, eller ta den en gang til
  (rot.LEIR_MENY = rot.LEIR_MENY || []).push((hode, { el, knapp }) => { hode.appendChild(el('h3', { 'data-fane': 'mål' }, 'Opplæring'));
    const ferdig = Opplaering.ferdig(T), tekst = av ? 'Opplæringen er slått av.' : ferdig ? 'Opplæringen er ferdig.' : `Steg ${Opplaering.nr(T)} av ${STEG.length}: ${Opplaering.neste(T).tittel}.`;
    hode.appendChild(el('div', { klasse: 'rad' }, el('span', {}, tekst), knapp(av ? 'Slå på' : ferdig ? 'Ta den en gang til' : 'Slå av', () => { if (av) slå(true); else if (ferdig) { T = tom(); T.leir = leirNøkkel() || undefined; lagre(); sistSteg = null; kjør(); } else slå(false); }))); });
  const API = { test: false, angrepTest: undefined, foldet: () => foldetNå, tilstand: () => T, av: () => av, slå, kjør, last, bilde, gjort: () => gjortKø.slice(), sammen: () => sammen, VIS_GJORT, vises: () => boks.classList.contains('på'), ring: () => ring.classList.contains('på'), hopp: () => { const id = Opplaering.hopp(T); lagre(); kjør(); return id; },
    nullstill: () => { T = tom(); T.leir = leirNøkkel() || undefined; skriv(NØKKEL, null); sistSteg = null; gjortKø = []; gjortTil = 0; kjør(); },
    // (runde 8, for vakten) gå rett til steget id: stegene foran regnes som gjort, uten «✓ Gjort»-køen; lagres ikke
    tilSteg: id => { const i = STEG.findIndex(q => q.id === id); if (i < 0) return false; T.gjort = STEG.slice(0, i).map(q => q.id); T.hoppet = []; T.slutt = false; gjortKø = []; gjortTil = 0; utsatt = null; stegFra = null; sistSteg = null; kjør(); return true; } };
  rot.OpplaeringSpill = API;
  // (balansen 18. nov) steget «Gå i 3D»: Gå setter deg ved karakteren din i leiren (Gange starter ved det valgte laget). Før startet du
  // der kameraet så, ofte et stykke fra leiren. Lytter i fangstfasen, så valget er gjort før gange.js får trykket.
  document.addEventListener('click', e => { const k = e.target && e.target.closest && e.target.closest('#gaaknapp'); if (!k || av || !T) return;
    const s = Opplaering.neste(T); if (!s || s.id !== 'gaa' || (typeof R3 !== 'undefined' && R3 && R3.fot)) return;
    const meg = typeof ENHETER !== 'undefined' ? ENHETER.find(q => q.karakter && q.side === 'blå') : null;
    if (meg && typeof valgt !== 'undefined' && valgt !== meg) valgt = meg; }, true);
})(typeof globalThis !== 'undefined' ? globalThis : this);
