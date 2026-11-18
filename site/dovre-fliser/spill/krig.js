/* Riksbrudd – KRIG (nattarbeidet 18. nov): regler uten DOM (Node: require('./krig'); nettleser: globalThis.Krig).
 * Flanke og rygg, dekning bak hus, sårede som bæres, fanger og overgivelse, fiendens førere og væremåte, røvernes varianter,
 * etterretning, natt og nattsikt, røyk/lys/støy, bakhold på veg, beleiring, våpenhvile, bygdevern og helikopterfrakt.
 * Visningen ligger i spill/krig-visning.js. ALLE TALLENE ER CLAUDES FORSLAG (brukeren har ikke bestemt dem).
 */
(function (rot) {
  'use strict';
  // Claudes forslag – samlet på ett sted
  const REGLER = {
    // retningen laget vender: innenfor «front» grader fra nesa er det forfra, over «rygg» er det bakfra, ellers i flanken.
    // snu: grader per spillminutt et lag som står stille, snur seg mot den som skyter. nedgravd: så mye av overtaket som er igjen.
    flanke: { front: 60, rygg: 120, flankeF: 1.25, ryggF: 1.5, nedgravd: .5, snu: 12 },
    // et lag som står stille i tettbebyggelse (terrengklasse 7), har hus å gjemme seg bak
    hus: { klasse: 7, tar: .7, nær: 14 },
    // sårede bæres: farten synker per såret (ned til «minst»); ved leiren blir én frisk per «leir» minutter, med sykestue per «sykestue»
    sårede: { per: .06, minst: .6, sykestue: 30, leir: 180, avstand: 300 },
    // overgivelse: knust = så mange ute av kamp, og en fiende innen «nær» meter; omringet = fiender på to sider (minst «vinkel»
    // grader mellom dem) innen «omringet» meter, og styrkeforholdet under «forhold». Seige førere tåler «seig» ute av kamp.
    overgi: { knust: 6, nær: 300, omringet: 600, vinkel: 120, forhold: .5, seig: 8, fangeFart: .9, avstandLeir: 300 },
    // etterretning: avhør tar «avhør» minutter og gjelder i «varer»; radiomasten fanger opp en melding hvert «hver» minutt med
    // «sjanse» per lag innen «rekkevidde», og stedet er «feil» meter unøyaktig; det egne lag ser, huskes i «sett» minutter.
    etterretning: { avhør: 60, varer: 240, hver: 30, sjanse: .35, rekkevidde: 15000, feil: 500, sett: 180, radioVarer: 90 },
    // natt: fra «kveld» til «morgen» ser alle «sikt» ganger så langt (glir over «skumring» timer). Nattsikt (utstyr) opphever det.
    natt: { kveld: 22, morgen: 4.5, skumring: 1.5, sikt: .45, nattsiktPris: 400000 },
    // røyk skjuler (færre treff på den som står i røyken, og dårligere ild ut av den), lysrakett opphever natta rundt seg,
    // støy trekker fiendens lag som hører den, til stedet. «antall» av hver per lag; fylles opp ved leiren.
    røyk: { radius: 120, varer: 15, tar: .4, ild: .5, antall: 2 }, lys: { radius: 800, varer: 10, antall: 2 },
    støy: { kast: 1500, hører: 3000, varer: 30, antall: 2 },
    // bakhold på veg: et lag som ligger stille i bakhold, stopper fiendens kjøretøy innen «avstand» meter; de som sitter på, tar
    // en ildrunde med «ild» ganger så mange treff, og kjøretøyet tas når ingen forsvarer det.
    bakhold: { avstand: 200, ild: 2 },
    // beleiring: egne lag på to sider (minst «vinkel» grader) innen «ring» meter fra tettstedet. Etter «svekket» minutter skyter
    // garnisonen dårligere («ild») og får ikke ammunisjon; etter «girSeg» minutter gir den seg. Uten strøm (et sprengt kraftverk
    // innen «kraft» meter) går tiden «utenStrøm» ganger så fort.
    beleiring: { ring: 1500, vinkel: 100, svekket: 360, girSeg: 720, utenStrøm: 1.5, ild: .7, kraft: 10000 },
    // våpenhvile: prisen i kroner, hvor lenge (spillminutter), prisen øker for hver avtale og dobles etter et brudd
    fred: { pris: 5e6, varer: 1440, økning: 1.5, brudd: 2 },
    // bygdevern i tettsteder ingen eier: én mann per «perFolk» innbyggere (mellom «minst» og «høyst»), treffsjanse per mann og
    // runde; en avtale koster «kr» per innbygger (mellom «krMinst» og «krHøyst»). Å knuse vernet koster «moral» i leiren.
    vern: { perFolk: 150, minst: 3, høyst: 14, treff: .04, motTreff: .06, kr: 2000, krMinst: 5e5, krHøyst: 8e6, moral: 5 },
    // helikopterfrakt: fart i km/t, lengste tur i meter, pris per tur i kroner
    heli: { fart: 200, radius: 60000, pris: 50000, plasser: 12 },
    // drone i kameravakta: varsler om samme lag høyst hvert «varsel» minutt
    drone: { varsel: 20 },
    // røverne: sabotørene må stå «sabotasje» meter fra bygget, skaden de gjør, og hvor langt unna de er borte
    røvere: { sabotasje: 60, skade: .6, flukt: 2000, venterHøyst: 480 },
  };
  const RAD = Math.PI / 180;
  // minste vinkel mellom to retninger (0–π)
  const vinkel = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; };

  // ---------- flanke og rygg ----------
  // b vender mot «retning» og blir skutt på fra (ax, ay). Gir { f, hva }.
  function flanke(retning, bx, by, ax, ay, nedgravd) {
    const R = REGLER.flanke, v = vinkel(retning || 0, Math.atan2(ay - by, ax - bx)) / RAD;
    let f = 1, hva = 'front'; if (v > R.rygg) { f = R.ryggF; hva = 'rygg'; } else if (v > R.front) { f = R.flankeF; hva = 'flanke'; }
    if (nedgravd && f > 1) f = 1 + (f - 1) * R.nedgravd;
    return { f, hva };
  }
  // laget snur seg mot «mål» (radianer) i «minutter»
  function snu(retning, mål, minutter) {
    const maks = REGLER.flanke.snu * RAD * minutter; let d = (mål - retning) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d) <= maks ? mål : retning + Math.sign(d) * maks;
  }
  // ---------- dekning bak hus ----------
  // vedHus: laget står i eller inntil et ekte bygg (husomrissene, når de er lastet)
  const husVern = (klasse, marsj, vedHus) => (!marsj && (klasse === REGLER.hus.klasse || vedHus) ? REGLER.hus.tar : 1);
  // punktene som sjekkes mot husomrissene: midten og en ring rundt laget
  const husPunkter = (x, y) => { const r = REGLER.hus.nær, ut = [[x, y]]; for (let i = 0; i < 8; i++) ut.push([x + Math.cos(i * Math.PI / 4) * r, y + Math.sin(i * Math.PI / 4) * r]); return ut; };
  // ---------- sårede ----------
  const sårede = menn => (menn || []).filter(m => m.hp > 0 && m.hp < 1).length;
  const sårFart = menn => Math.max(REGLER.sårede.minst, 1 - REGLER.sårede.per * sårede(menn));
  // stell ved leiren: akk = minutter spart opp. Gir { friske: [navn], akk }.
  function stell(menn, minutter, sykestue, akk) {
    const per = sykestue ? REGLER.sårede.sykestue : REGLER.sårede.leir, friske = []; akk = (akk || 0) + minutter;
    if (!sårede(menn)) return { friske, akk: 0 };
    while (akk >= per) { const m = (menn || []).find(q => q.hp > 0 && q.hp < 1); if (!m) { akk = 0; break; } m.hp = 1; friske.push(m.navn); akk -= per; }
    return { friske, akk };
  }
  // ---------- overgivelse ----------
  // fiender: [{ x, y }] innen rekkevidde. Omringet = to av dem står i hver sin retning (minst «vinkel» grader fra hverandre).
  function omringet(lag, fiender) {
    const R = REGLER.overgi, nær = (fiender || []).filter(f => Math.hypot(f.x - lag.x, f.y - lag.y) <= R.omringet).map(f => Math.atan2(f.y - lag.y, f.x - lag.x));
    for (let i = 0; i < nær.length; i++) for (let j = i + 1; j < nær.length; j++) if (vinkel(nær[i], nær[j]) / RAD >= R.vinkel) return true;
    return false;
  }
  // o: { ute, nær (meter til nærmeste fiende, null = ingen), omringet, forhold (egen styrke / fiendens), seig }. Gir grunnen eller null.
  function girSeg(o) {
    const R = REGLER.overgi, knust = o.seig ? R.seig : R.knust;
    if (o.ute >= knust && o.nær !== null && o.nær !== undefined && o.nær <= R.nær) return 'laget er knust, og fienden står like ved';
    if (o.omringet && o.forhold < R.forhold && o.ute >= 2) return 'laget er omringet og underlegent';
    return null;
  }
  // Egne lag (stridsvalget «overgi» = ja): knust OG omringet av fiender. o: { ute, omringet }.
  const egetGirSeg = o => o.ute >= REGLER.overgi.knust && !!o.omringet;
  // ---------- fiendens førere ----------
  // ild: faktor på lagets ild; tar: faktor på treffene det tar. Væremåten følger førerens navn (samme navn gir samme væremåte).
  const VÆREMÅTER = {
    pågående: { navn: 'pågående', tekst: 'går rett på – skyter mer, men tar flere treff, og angriper også når det er jevnt', ild: 1.1, tar: 1.1, overtak: .85 },
    forsiktig: { navn: 'forsiktig', tekst: 'holder seg i dekning – vanskeligere å treffe, og angriper bare med klart overtak', ild: .95, tar: .88, overtak: 1.25 },
    slu: { navn: 'slu', tekst: 'går rundt og tar deg i flanken – flankeangrepene hans er verre', ild: 1, tar: 1, flanke: 1.2 },
    seig: { navn: 'seig', tekst: 'gir seg ikke før laget er nesten borte', ild: 1, tar: 1, seig: true },
  };
  const VM = Object.keys(VÆREMÅTER);
  const hash = t => { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const væremåte = navn => VÆREMÅTER[VM[hash(navn) % VM.length]];
  // ---------- røverne varierer ----------
  const SABOTASJE_FRA = { bølge: 4, dag: 4 };
  // bølge 1 er alltid et vanlig angrep; siden går det på rundgang, men om natta kommer de alltid rett på (i mørket).
  const VARIANTER = {
    rett: { navn: 'rett på', tekst: '' }, to: { navn: 'fra to kanter', tekst: 'Røverne kommer fra to kanter!' },
    natt: { navn: 'venter på mørket', tekst: 'Røverne er sett i terrenget, men de venter – de kommer trolig når det blir mørkt.' },
    sabotasje: { navn: 'sabotasje', tekst: 'Noen av røverne er ute etter å ødelegge i leiren, ikke å slåss.' },
  };
  // antall: hvor mange røverlag bølgen har – «fra to kanter» krever minst to (ellers sabotasje).
  // dag: spilldøgnet fra 0 (balansen 18. nov, Claudes forslag): med dag kommer sabotørene tidligst i bølge 4 og fra dag 5
  // (SABOTASJE_FRA) – i gjennomspillingen veltet en sabotør i bølge 3 hele leiren på dag 4. Uten dag som før.
  function røverVariant(bølge, time, antall, dag) {
    if (bølge <= 1) return 'rett'; const natta = natt(time) > .5; let r = ['to', 'sabotasje', 'natt', 'rett'][(bølge - 2) % 4];
    if (r === 'to' && antall !== undefined && antall < 2) r = 'sabotasje';
    if (r === 'sabotasje' && dag !== undefined && (bølge < SABOTASJE_FRA.bølge || dag < SABOTASJE_FRA.dag)) r = 'rett';
    return r === 'natt' && natta ? 'rett' : r;
  }
  // ---------- natt ----------
  // time: klokka 0–24. Gir mørket 0 (dag) – 1 (natt), med glidende overgang.
  function natt(time) {
    const R = REGLER.natt, t = ((time % 24) + 24) % 24, s = R.skumring;
    if (t >= R.kveld || t <= R.morgen - s) return 1;
    if (t > R.kveld - s) return (t - (R.kveld - s)) / s;
    if (t < R.morgen) return (R.morgen - t) / s;
    return 0;
  }
  // faktoren på siktvidden: nattsikt eller lys rundt laget opphever natta
  const nattSikt = (time, harNattsikt, iLys) => (harNattsikt || iLys ? 1 : 1 - (1 - REGLER.natt.sikt) * natt(time));
  const klokkeTime = tid => (6 + tid / 60) % 24;
  // ---------- røyk ----------
  // skyer: [{ x, y, til }]. Faktoren når a skyter på b.
  function røykFaktor(a, b, skyer, tid) {
    const R = REGLER.røyk; let f = 1;
    for (const q of skyer || []) { if (q.til <= tid) continue; if (Math.hypot(b.x - q.x, b.y - q.y) <= R.radius) f = Math.min(f, R.tar); else if (Math.hypot(a.x - q.x, a.y - q.y) <= R.radius) f = Math.min(f, R.ild); }
    return f;
  }
  const iLys = (s, lys, tid) => (lys || []).some(q => q.til > tid && Math.hypot(s.x - q.x, s.y - q.y) <= REGLER.lys.radius);
  // ---------- beleiring ----------
  // by: { x, y }, lag: egne lag [{ x, y }]. Beleiret = lag på to sider innen ringen.
  function beleiret(by, lag) {
    const R = REGLER.beleiring, v = (lag || []).filter(s => Math.hypot(s.x - by.x, s.y - by.y) <= R.ring).map(s => Math.atan2(s.y - by.y, s.x - by.x));
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (vinkel(v[i], v[j]) / RAD >= R.vinkel) return true;
    return false;
  }
  const beleiringSteg = (min, minutter, utenStrøm) => min + minutter * (utenStrøm ? REGLER.beleiring.utenStrøm : 1);
  const beleiringNå = min => (min >= REGLER.beleiring.girSeg ? 'girSeg' : min >= REGLER.beleiring.svekket ? 'svekket' : min > 0 ? 'holder' : null);
  // ---------- våpenhvile ----------
  const fredPris = (antall, brudd) => Math.round(REGLER.fred.pris * Math.pow(REGLER.fred.økning, antall || 0) * Math.pow(REGLER.fred.brudd, brudd || 0) / 1e5) * 1e5;
  // ---------- bygdevern ----------
  const vernMenn = folk => Math.max(REGLER.vern.minst, Math.min(REGLER.vern.høyst, Math.round((folk || 0) / REGLER.vern.perFolk)));
  const vernPris = folk => Math.max(REGLER.vern.krMinst, Math.min(REGLER.vern.krHøyst, Math.round((folk || 0) * REGLER.vern.kr / 1e5) * 1e5));
  // én runde mellom vernet (n mann) og laget (friske = antall kampklare). Gir { motLaget, motVernet }.
  function vernRunde(n, friske, rng) {
    const R = REGLER.vern; let a = 0, b = 0; for (let i = 0; i < n; i++) if (rng() < R.treff) a++; for (let i = 0; i < friske; i++) if (rng() < R.motTreff) b++;
    return { motLaget: a, motVernet: Math.min(n, b) };
  }
  // ---------- helikopter ----------
  // minutter for en strekning i meter
  const heliMin = d => d / 1000 / REGLER.heli.fart * 60;
  // ---------- etterretning ----------
  // E: liste med meldinger { navn, side, x, y, t, kilde, hva }. Samme lag oppdateres. Gir meldingen.
  function meld(E, o) {
    let m = E.find(q => q.navn === o.navn); if (!m) { m = { navn: o.navn }; E.push(m); }
    Object.assign(m, { side: o.side, x: Math.round(o.x), y: Math.round(o.y), t: o.t, kilde: o.kilde, hva: o.hva || m.hva || '', til: o.t + (o.varer || REGLER.etterretning.sett) });
    return m;
  }
  const rydd = (E, tid) => { for (let i = E.length - 1; i >= 0; i--) if (E[i].til <= tid) E.splice(i, 1); return E; };
  // radiomasten: fanger opp et lag innen rekkevidden med en viss sjanse. Gir stedet (unøyaktig) eller null.
  function oppfang(lag, leir, rng) {
    const R = REGLER.etterretning; if (Math.hypot(lag.x - leir.x, lag.y - leir.y) > R.rekkevidde || rng() >= R.sjanse) return null;
    const v = rng() * 2 * Math.PI, r = R.feil * rng(); return { x: lag.x + Math.cos(v) * r, y: lag.y + Math.sin(v) * r };
  }
  const alder = min => (min < 1 ? 'nå' : min < 60 ? `${Math.round(min)} min siden` : `${Math.round(min / 60)} t siden`);

  const api = { REGLER, vinkel, flanke, snu, husVern, husPunkter, egetGirSeg, sårede, sårFart, stell, omringet, girSeg, VÆREMÅTER, væremåte, VARIANTER, røverVariant, SABOTASJE_FRA, natt, nattSikt, klokkeTime,
    røykFaktor, iLys, beleiret, beleiringSteg, beleiringNå, fredPris, vernMenn, vernPris, vernRunde, heliMin, meld, rydd, oppfang, alder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Krig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
