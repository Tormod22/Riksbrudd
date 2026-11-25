/* Riksbrudd – ESKALERINGEN: motstanderne blir farligere over tid (runde 7, 20. nov natt). Regler uten DOM
 * (Node: require('./eskalering'); nettleser: globalThis.Eskalering). Visningen og AI-koblingen: spill/eskalering-visning.js.
 * Etter fredstiden (Fraksjoner.fredDøgn) har hver motstander en kasse og folk som vokser med tettstedene den holder. Den kjøper nye lag
 * og kjøretøy, samler flere lag til større angrep mot ett mål (et stort tettsted, et tettsted en annen side holder – også dine – eller
 * leiren din), sender lag mot handelsrutene dine, og tar til slutt også storbyene. Tempoet følger vanskelighetsgraden.
 * Spilleren får etterretning når et angrep mot noe av hans samles, og tid til å forberede seg (REGLER.grad.*.varsel).
 * ALLE TALL ER CLAUDES FORSLAG (spillverdier, ikke fasit). Døgn = spilldøgn siden start (døgn 0 = dag 1).
 */
(function (rot) {
  'use strict';
  const REGLER = {
    // Per vanskelighetsgrad (Claudes forslag):
    //  tak: høyst så mange lag per motstander; kr: faktor på inntekten; leirFra: døgn før de angriper leiren med ekte tropper
    //  (døgn 7 = dag 8), leirHver: døgn mellom hvert leirangrep, leirLag: lag i et leirangrep; varsel: spillminutter fra
    //  etterretningen kommer til angrepet tidligst går; storbyFra: døgn før en storby (over REGLER.storby innbyggere) blir mål;
    //  blåFra: døgn før de samler en angrepsgruppe mot et tettsted du holder (de første døgnene etter freden går bare enkeltlag løs på dem);
    //  gruppeMaks: høyst så mange lag i én angrepsgruppe; rute: sjansen hver sjette time for at en motstander sender et lag mot
    //  en handelsrute eller oljekolonne du har; mot: faktor på styrken de krever før de angriper (lavere = dristigere)
    grad: {
      lett: { navn: 'Lett', blåFra: 6.5, tak: 9, kr: .7, leirFra: 10, leirHver: 4, leirLag: 2, varsel: 8 * 60, storbyFra: 14, gruppeMaks: 4, rute: .2, mot: 1.15 },
      vanlig: { navn: 'Vanlig', blåFra: 4.5, tak: 12, kr: 1, leirFra: 7, leirHver: 3, leirLag: 3, varsel: 6 * 60, storbyFra: 10, gruppeMaks: 6, rute: .35, mot: 1 },
      hard: { navn: 'Hard', blåFra: 3.5, tak: 15, kr: 1.4, leirFra: 5, leirHver: 2, leirLag: 4, varsel: 4 * 60, storbyFra: 7.5, gruppeMaks: 7, rute: .5, mot: .85 },
    },
    // Økonomien per døgn: grunnKr/grunnFolk fra hovedkvarteret, krPerTusen/folkPerTusen per 1000 innbyggere i tettstedene de holder
    // (skatt, mat, folk som slutter seg til). Lag koster penger og folk, kjøretøy bare penger. Kassa og folket har et tak.
    økonomi: { grunnKr: 1.6e6, krPerTusen: 1e5, grunnFolk: 10, folkPerTusen: 1, maksKr: 30e6, maksFolk: 120, startKr: 1e6, startFolk: 12 },
    pris: { lag: { kr: 2.5e6, folk: 12 }, lastebil: 1.5e6, stridsvogn: 7e6 },
    // én lastebil per «lastebilPer» lag; stridsvogn tidligst døgn «stridsvognFra» (etter vanskelighetsgraden: lett +2, hard −2), høyst
    // «stridsvognMaks»; motstanderen sparer til den når den har minst «vognEtter» lag
    kjøretøy: { lastebilPer: 4, lastebilMaks: 3, stridsvognFra: 7, stridsvognMaks: 1, vognEtter: 6 },
    storby: 50000,       // innbyggere: fra dette er tettstedet en storby (grad.storbyFra)
    lagPerBy: .5,        // taket for lag vokser med så mange lag per tettsted motstanderen holder (Eskalering.tak)
    ettLag: 12,          // mann: tettsteder som trenger mer enn dette (Garnison.minstFor), er store (som Fraksjoner.REGLER.ettLag)
    // Angrepsgruppene (planlegges hvert «hver» spillminutt): behov = minst (garnison.js) + margin × forsvarernes styrke; samlingen er over
    // når «samleAndel» av styrken står innen «samleR» m av samlingsstedet, eller etter «samleMaks» minutter; gruppa gir opp under
    // «oppgi» av behovet, eller etter «angrepMaks» minutter; samlingsstedet er et eget (eller nøytralt) tettsted innen «nær» m av målet;
    // mål lenger enn «rekkevidde» m fra lagene tas ikke; dine tettsteder veier «blåVekt», tettsteder de har mistet «taptVekt»;
    // rykte: m fra leiren – angrep motstanderne imellom nærmere enn dette, får du høre om (etterretning i loggen)
    // overvekt: gruppa tar med seg lag til den har så mange ganger behovet (når de finnes) – et angrep skal avgjøre, ikke bli stående;
    // blåPause: spillminutter en motstander venter med et nytt angrep på deg etter at et er slått tilbake (gjennomspillingen: tre angrep på
    // Vatne på to døgn, det andre seks timer etter det første);
    // blåOvervekt: mot tettstedene dine tar gruppa bare med seg til 1,2 × behovet – du skal kunne holde dem hvis du forsterker i tide;
    // storbyVekt: en storby som er lov, veier så mye mer (den avgjør krigen – gjennomspillingen på Hard: gruppene var opptatt med småsteder i to døgn);
    // småsted: innbyggere – garnisoner i egne tettsteder under dette (og uten fiender innen 5 km) kan tas med til et storbyangrep (spill/eskalering-visning.js)
    plan: { hver: 60, margin: 1.3, overvekt: 1.5, blåOvervekt: 1.2, blåPause: 1440, småsted: 15000, storbyVekt: 3, minBehov: 10, samleR: 1500, samleAndel: .75, samleMaks: 10 * 60, angrepMaks: 30 * 60, oppgi: .45, nær: 15000, minAvstand: 2500, rekkevidde: 35000, blåVekt: 1.6, taptVekt: 1.4, leirForsvar: 1500, rykte: 20000 },
    // handelsruter og oljekolonner: et lag går til et punkt på ruta minst «fraLeir» m fra leiren og blir der i «holdMaks» minutter
    rute: { hver: 6 * 60, avstand: 12000, fraLeir: 2500, holdMaks: 12 * 60 },
    // (runde 14, kritiker J: motangrepet kom 42 min etter «angrep tidligst om ca. 6 t» – lagene sto alt et par hundre meter fra byen og
    // gikk løs på garnisonen før gruppa var samlet). Claudes forslag: ved = meter – står et lag i gruppa så nær målet, står det «fienden er
    // ved byen nå»; fart = meter per spilltime for et lag til fots (anslaget = ventetida + veien fra samlingsstedet); vern = meter rundt
    // målet der ingen fra samme side går løs på dine før tidligst-tida (med mindre de blir beskutt – da er det din kamp)
    varsel: { ved: 1000, fart: 4000, vern: 3000 },
  };
  const avst = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // vanskelighetsgraden fra SPILLREGLER (spill/scenario.js): vanskelighet, ellers fiendens faktor
  function grad(sr) {
    const v = sr && sr.vanskelighet; if (v && REGLER.grad[v]) return { id: v, ...REGLER.grad[v] };
    const f = sr && sr.faktor && sr.faktor.fiende; const id = f > 0 && f <= .85 ? 'lett' : f >= 1.15 ? 'hard' : 'vanlig'; return { id, ...REGLER.grad[id] };
  }
  // inntekt per døgn for en motstander som holder tettsteder med «folk» innbyggere
  const inntekt = (folk, g = grad()) => { const Ø = REGLER.økonomi, t = Math.max(0, folk || 0) / 1000; return { kr: (Ø.grunnKr + Ø.krPerTusen * t) * (g.kr || 1), folk: (Ø.grunnFolk + Ø.folkPerTusen * t) * (g.kr || 1) }; };
  const nyØkonomi = () => ({ kr: REGLER.økonomi.startKr, folk: REGLER.økonomi.startFolk, kjøpt: { lag: 0, lastebil: 0, stridsvogn: 0 } });
  // legg til inntekten for «minutter» spillminutter
  function tjen(Ø, folk, minutter, g) { const i = inntekt(folk, g), d = Math.max(0, minutter || 0) / 1440;
    Ø.kr = Math.min(REGLER.økonomi.maksKr, Ø.kr + i.kr * d); Ø.folk = Math.min(REGLER.økonomi.maksFolk, Ø.folk + i.folk * d); return Ø; }
  // hva motstanderen kjøper nå: o = { lag, tak, lastebiler, stridsvogner, døgn, g }. Gir 'lag' | 'lastebil' | 'stridsvogn' | null.
  function kjøp(Ø, o) { const P = REGLER.pris, K = REGLER.kjøretøy, g = o.g || grad(), fra = K.stridsvognFra + (g.id === 'lett' ? 2 : g.id === 'hard' ? -2 : 0);
    // fra «stridsvognFra» sparer en motstander med minst «vognEtter» lag til en stridsvogn før den kjøper flere lag
    if (o.døgn >= fra && (o.stridsvogner || 0) < K.stridsvognMaks && o.lag >= K.vognEtter) return Ø.kr >= P.stridsvogn ? 'stridsvogn' : null;
    if (o.lag < o.tak) return Ø.kr >= P.lag.kr && Ø.folk >= P.lag.folk ? 'lag' : null;
    if ((o.lastebiler || 0) < Math.min(K.lastebilMaks, Math.ceil(o.lag / K.lastebilPer)) && Ø.kr >= P.lastebil) return 'lastebil';
    return null; }
  // betal for det som ble kjøpt
  function betal(Ø, hva) { const P = REGLER.pris; if (hva === 'lag') { Ø.kr -= P.lag.kr; Ø.folk -= P.lag.folk; } else if (P[hva]) Ø.kr -= P[hva]; Ø.kjøpt[hva] = (Ø.kjøpt[hva] || 0) + 1; return Ø; }
  // taket for antall lag etter fredstiden: grunntaket (Fraksjoner.lagTak) og ett lag til per døgn etter freden, høyst g.tak
  // (runde 7, gjennomspillingen: Ravnsund holdt 14 tettsteder med 12 lag – alle var garnison, og ingen kunne gå mot storbyen) – taket
  // vokser også med et halvt lag per tettsted de holder (byer)
  const tak = (grunn, døgnEtterFred, g = grad(), byer = 0) => { const b = Math.floor(Math.max(0, byer || 0) * REGLER.lagPerBy);
    return Math.max(grunn, Math.min(g.tak + b, grunn + Math.floor(Math.max(0, døgnEtterFred)) + b)); };
  // styrken et mål krever: by = { minst, forsvar } (forsvar = styrken til de andre sidenes lag i tettstedet)
  const behov = (by, g = grad()) => Math.max(REGLER.plan.minBehov, ((by.minst || 0) + REGLER.plan.margin * (by.forsvar || 0)) * (g.mot || 1));
  // er målet stort nok til en gruppe? Små nøytrale tettsteder tar lagene selv (Fraksjoner.velg)
  const gruppemål = by => (by.minst || 0) > REGLER.ettLag || !!by.eier || (by.forsvar || 0) > 0;
  // kan det bli et mål nå? (storbyer først fra g.storbyFra, store tettsteder fra storFra = døgnet småstedene ikke lenger kommer først)
  // (runde 7, gjennomspilling b: begge motstanderne gikk løs på spillerens to småsteder samtidig rett etter freden, og alle 25 soldatene falt
  // på et døgn) dine tettsteder blir gruppemål først fra g.blåFra, og bare når den andre motstanderen ikke alt angriper deg (blåOpptatt)
  const tillatt = (by, døgn, g, storFra, blåOpptatt) => (by.eier === 'blå' && (døgn < (g.blåFra || 0) || blåOpptatt) ? false
    : by.folk >= REGLER.storby ? døgn >= g.storbyFra : (by.minst || 0) > REGLER.ettLag ? døgn >= storFra : true);
  // Velg mål og lag for en ny angrepsgruppe.
  // o = { side, døgn, g, storFra, byer: [{ id, navn, x, y, folk, eier, minst, forsvar, tapt }], fri: [{ id, x, y, styrke }],
  //   leir: { x, y, forsvar } | null (bare når et leirangrep er lov nå), blåOpptatt: den andre motstanderen angriper noe av ditt nå }
  // Gir { mål: { id, navn, x, y, eier, leir }, behov, lag: [id …], styrke } eller null.
  function velgMål(o) {
    const P = REGLER.plan, g = o.g || grad(), fri = (o.fri || []).filter(f => f.styrke > 0); if (fri.length < 2) return null;
    const midt = { x: fri.reduce((a, f) => a + f.x, 0) / fri.length, y: fri.reduce((a, f) => a + f.y, 0) / fri.length }, sum = fri.reduce((a, f) => a + f.styrke, 0);
    const lagFor = (m, b) => { const L = fri.slice().sort((p, q) => avst(p, m) - avst(q, m)), ut = [], ov = m.eier === 'blå' ? P.blåOvervekt : P.overvekt; let s = 0;
      for (const f of L) { if (ut.length >= g.gruppeMaks) break; if (s >= b * ov && ut.length >= 2) break; ut.push(f); s += f.styrke; }
      return s >= b && ut.length >= 2 ? { lag: ut.map(f => f.id), styrke: s } : null; };
    const kand = [];
    if (o.leir && !o.blåOpptatt) { const b = Math.max(g.leirLag * P.minBehov, P.margin * (o.leir.forsvar || 0) * (g.mot || 1)); kand.push({ mål: { id: 'leir', navn: 'leiren din', x: o.leir.x, y: o.leir.y, eier: 'blå', leir: true }, behov: b, poeng: Infinity, antall: g.leirLag }); }
    for (const by of o.byer || []) {
      if (by.eier === o.side || !gruppemål(by) || !tillatt(by, o.døgn, g, o.storFra, o.blåOpptatt)) continue; const d = avst(by, midt); if (d > P.rekkevidde) continue;
      const b = behov(by, g); if (b > sum) continue;
      const vekt = Math.sqrt(Math.max(1, by.folk || 0)) * (by.eier === 'blå' ? P.blåVekt : 1) * (by.tapt ? P.taptVekt : 1) * (by.folk >= REGLER.storby ? P.storbyVekt : 1);
      kand.push({ mål: { id: by.id, navn: by.navn, x: by.x, y: by.y, eier: by.eier || null, leir: false }, behov: b, poeng: vekt / (d / 1000 + 4) });
    }
    kand.sort((a, b) => b.poeng - a.poeng);
    for (const k of kand) { const v = lagFor(k.mål, k.antall ? Math.max(k.behov, 0) : k.behov); if (!v) continue;
      // leirangrepet: minst leirLag lag, når det finnes så mange
      if (k.antall && v.lag.length < Math.min(k.antall, fri.length)) { const L = fri.slice().sort((p, q) => avst(p, k.mål) - avst(q, k.mål)).slice(0, Math.min(k.antall, g.gruppeMaks)); v.lag = L.map(f => f.id); v.styrke = L.reduce((a, f) => a + f.styrke, 0); if (v.styrke < k.behov) continue; }
      return { mål: k.mål, behov: k.behov, lag: v.lag, styrke: v.styrke }; }
    return null;
  }
  // Samlingsstedet: et eget tettsted (ellers et nøytralt) innen P.nær m av målet og minst P.minAvstand fra det, nærmest målet;
  // ellers det laget i gruppa som står nærmest målet. byer som i velgMål.
  function samlested(mål, byer, side, lag) {
    const P = REGLER.plan, ok = b => b.id !== mål.id && avst(b, mål) >= P.minAvstand && avst(b, mål) <= P.nær && !(b.forsvar > 0);
    const egne = (byer || []).filter(b => b.eier === side && ok(b)).sort((a, b) => avst(a, mål) - avst(b, mål));
    const nøytr = (byer || []).filter(b => !b.eier && ok(b)).sort((a, b) => avst(a, mål) - avst(b, mål));
    const b = egne[0] || nøytr[0]; if (b) return { x: b.x, y: b.y, navn: b.navn, id: b.id };
    const n = (lag || []).slice().sort((a, b) => avst(a, mål) - avst(b, mål))[0]; return n ? { x: n.x, y: n.y, navn: null, id: null } : { x: mål.x, y: mål.y, navn: null, id: null };
  }
  // Neste fase for en gruppe { fase: 'samler'|'angriper', start, angripFra, behov }.
  // o = { tid, nær (styrken innen samleR av samlingsstedet), styrke (hele gruppa), eid (målet er deres nå), borte (målet finnes ikke) }
  // Gir 'samler' | 'angriper' | 'ferdig' | 'oppgitt'.
  function fase(G, o) {
    const P = REGLER.plan; if (o.eid) return 'ferdig'; if (o.borte) return 'oppgitt';
    if (o.styrke < P.oppgi * G.behov) return 'oppgitt';
    if (G.fase === 'samler') { const samlet = o.nær >= P.samleAndel * o.styrke || o.tid - G.start >= P.samleMaks; return samlet && o.tid >= (G.angripFra || 0) ? 'angriper' : 'samler'; }
    if (o.tid - G.start > P.angrepMaks) return 'oppgitt';
    return G.fase;
  }
  // Et punkt på en rute (liste av { x, y }) for et lag som vil stenge den: midt mellom start og slutt (langs ruta), men minst
  // REGLER.rute.fraLeir m fra leiren. Gir { x, y } eller null.
  function rutePunkt(punkter, leir) {
    const P = (punkter || []).filter(p => p && isFinite(p.x) && isFinite(p.y)); if (P.length < 2) return null;
    let L = 0; const d = [0]; for (let i = 1; i < P.length; i++) { L += avst(P[i], P[i - 1]); d.push(L); }
    const ved = t => { for (let i = 1; i < P.length; i++) if (d[i] >= t) { const f = (t - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); return { x: P[i - 1].x + (P[i].x - P[i - 1].x) * f, y: P[i - 1].y + (P[i].y - P[i - 1].y) * f }; } return { x: P[P.length - 1].x, y: P[P.length - 1].y }; };
    for (const t of [.5, .4, .6, .3, .7, .2, .8, .1, .9]) { const p = ved(L * t); if (!leir || avst(p, leir) >= REGLER.rute.fraLeir) return p; }
    return null;
  }
  // tekst for tid i minutter: «ca. 6 t» / «ca. 40 min»
  const omTekst = min => (min >= 90 ? `ca. ${String(Math.round(min / 60 * 2) / 2).replace('.', ',')} t` : `ca. ${Math.max(5, Math.round(min / 5) * 5)} min`);
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  // Etterretningen spilleren får når en gruppe samles mot noe av hans. o = { fraksjon, antall, mann, sted: { navn, x, y }, mål, leir, om (minutter) }
  function varselTekst(o) {
    const ved = o.sted && o.sted.navn ? `ved ${o.sted.navn}` : 'i terrenget';
    const hvor = o.leir && o.sted ? `, ${String(Math.round(avst(o.sted, o.leir) / 100) / 10).replace('.', ',')} km ${retning(o.sted.x - o.leir.x, o.sted.y - o.leir.y)} for leiren` : '';
    const mot = o.mål.leir ? 'Målet er leiren din' : `Målet er trolig ${o.mål.navn}${o.mål.eier === 'blå' ? ' (ditt)' : ''}`;
    // o.nær: meter fra målet til nærmeste lag i gruppa – innen REGLER.varsel.ved står det at fienden er der nå
    const nå = Number.isFinite(o.nær) && o.nær <= REGLER.varsel.ved ? ` Fienden er ved ${o.mål.leir ? 'leiren' : 'byen'} nå (ca. ${Math.max(50, Math.round(o.nær / 50) * 50)} m unna), men venter på resten.` : '';
    return `Etterretning: ${o.fraksjon} samler ${o.antall} lag (ca. ${Math.round(o.mann)} mann) ${ved}${hvor}. ${mot}.${nå} Angrep tidligst om ${omTekst(o.om)}.`
      + (o.mål.leir ? ' Hold tropper hjemme og bemann vakttårnet.' : ' Send flere lag dit, grav ned garnisonen og sett stridsreglene til «kjemp» – ellers trekker den seg når den er underlegen.');
  }
  // Tidligste angrep i spillminutter fra nå: ventetida (angripFra − nå) + veien fra samlingsstedet til målet. o = { nå, angripFra, sted, mål }
  function tidligst(o) { const V = REGLER.varsel, vent = Math.max(0, (o.angripFra || 0) - (o.nå || 0)), vei = o.sted && o.mål ? avst(o.sted, o.mål) : 0;
    return vent + vei / V.fart * 60; }
  // Skal laget holde seg unna målet nå? G = gruppa (mål, tidligst, fase), lag = { x, y, beskutt }, v = valget til AI-en ({ hva, x, y, mål }).
  // Før tidligst-tida går ingen fra siden løs på noe innen REGLER.varsel.vern av målet, og ingen tar målet – med mindre laget er beskutt.
  function holdIgjen(G, lag, v, nå) {
    if (!G || !G.varslet || !(G.tidligst > nå) || lag.beskutt || !v) return false;
    // når gruppa alt går mot målet (fase «angriper»), får den gå – men ikke skyte innen vern-sonen før tida
    const hvaHold = G.fase === 'angriper' ? ['angrip'] : ['angrip', 'leir', 'ta'];
    if (G.fase !== 'angriper' && v.hva === 'ta' && v.mål === G.mål.id) return true;
    if (hvaHold.includes(v.hva) && Number.isFinite(v.x) && avst(v, G.mål) <= REGLER.varsel.vern) return true;
    return false; }
  const api = { REGLER, grad, tidligst, holdIgjen, inntekt, nyØkonomi, tjen, kjøp, betal, tak, behov, gruppemål, tillatt, velgMål, samlested, fase, rutePunkt, omTekst, retning, varselTekst };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Eskalering = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
