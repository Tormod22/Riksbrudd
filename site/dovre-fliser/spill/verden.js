/* Riksbrudd – VERDEN SOM GJØR NOE (natt til 18. nov, pakke «verden», punktene 31–38 i ønskelista).
 * Regler uten DOM (Node: require('./verden'); nettleser: globalThis.Verden). Visningen: spill/verden-visning.js.
 *  31 vinter: snø bremser marsj og stenger fjellveger, is på vannene bærer etter lang kulde, kulde tærer på lag som står ute
 *  32 flom og ras etter mye regn (soner som stenger veger og stopper lag en tid)
 *  33 jakt: kjøtt per dyr, jaktlag i et område med vilt
 *  34 dyrking: så om våren, høst i én klump om høsten
 *  35 brann som sprer seg med vinden i tørt vær og slokner i regn
 *  36 funn i terrenget: vrak, depoter og forlatte leirer på faste steder (hash av kartkoordinatene)
 *  37 radiomeldinger: noen sanne, noen ikke
 *  38 tog: en strekning mellom to stasjonsbyer du holder gir en stor last med jevne mellomrom
 * ALLE TALL HER ER CLAUDES FORSLAG (ikke brukerens fasit). De står samlet i REGLER.
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  // Claudes forslag – alle tallene i pakka
  const REGLER = {
    // snø: marsjfart på snødekt mark og i snøvær (faktorer), storm i tillegg; fjellveger over «vegFjell» moh. stenger i snøvær
    snø: { marsj: .7, snøvær: .8, storm: .85, vegFjell: 900, brøyt: 6, sjekk: 10 },
    // (brøyt: timer etter at snøværet har gitt seg før fjellvegene er brøytet og åpne igjen; sjekk: spillminutter mellom hver gang
    //  kolonnenes ruter sjekkes mot stengte høye lenker)
    // temperaturen faller med høyden (grader per 100 m over dalen, 650 moh.)
    temp: { perHundre: .6, dal: 650 },
    // is: døgngrader med kulde før isen bærer folk til fots, mest is, hvor fort den tiner (per varmegrad-døgn), fart på isen (km/t)
    is: { bærer: 25, maks: 80, tiner: 4, fart: 2.5, båt: 10, sjø: 1 },
    // (båt: døgngrader før isen stenger båter på innsjøene; sjø: vann under så mange moh. er sjøen, som ikke fryser)
    // kulde: lag som står ute (ikke i leir eller tettsted) under «grense» grader tåler «timerFør» timer; så blir én mann såret (aldri drept) hver «timerPer» time; «læ» = innen så mange meter fra leiren står de ikke ute
    // ved: ekstra tre (m³ per døgn) i leiren per 10 grader under «vedFra»
    kulde: { grense: -8, timerFør: 12, timerPer: 8, vedFra: -8, ved: 1, læ: 500 },
    // regn: regnsummen (timer med fullt regn, tørker 0,2 per time uten regn, maks 30); flom mulig over «flom», ras over «ras»
    // sjanse per spilltime når terskelen er nådd; flomsonen varer «flomTimer», raset «rasTimer»; radius i meter; bratt = stigning (m per m)
    // etter: så mye synker regnsummen når det har gått en flom / et ras (trykket slipper); høyst én flom og ett ras om gangen;
    // i kuldegrader faller nedbøren som snø og teller ikke
    // vasser / rasFart: faktor på marsjfarten gjennom en flomsone / over et ras; ryddTimer: så lenge bruker et ingeniørlag på å rydde et ras
    regn: { tørker: .2, maks: 30, flom: 5, ras: 8, sjanse: .04, etter: { flom: 3, ras: 4 }, flomTimer: 12, rasTimer: 24, flomRadius: [150, 400], rasRadius: 90, bratt: .45, vasser: .25, rasFart: .5, ryddTimer: 3 },
    // tørke: døgn uten regn (maks 10; nedbør og våt bakke tar bort «vått» ganger så fort); brannfaren er 0 under «fra» og full ved «full»
    tørke: { maks: 10, fra: .5, full: 2, vått: 2 },
    // brann: rutenett (m), brenntid per rute (spillminutter), spredning per 10 min til en naborute i full tørke uten vind,
    // vind: hvor mye medvind øker spredningen per m/s, regn slokker (sjanse per 10 min i fullt regn), flest ruter som brenner samtidig,
    // treff: treff på et lag som står i brannen per 30 min; bygg: andel av byggets hp per 30 min;
    // lyn: sjanse per time for at lynet tenner når det er knusktørt og overskyet eller torden; skudd: sjanse per skuddveksling i knusktørt lende
    brann: { rute: 64, brenner: [50, 110], spred: .16, vind: .3, slokk: .5, maks: 350, treff: 1, bygg: .2, lyn: .015, skudd: .004 },
    // brennbarhet per terrengklasse (0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 7 tettbebyggelse)
    brennbar: [.05, 1, .55, 0, 0, .3, .1, .45],
    // jakt: rasjoner per felt dyr, jaktlag: timer per jakt, dyr per jakt (minst, flest), området hviler (timer), rute (m)
    kjøtt: { elg: 60, rein: 25, moskus: 70, sau: 10, ku: 80 },
    // (huskFelt: så mange dyr du har felt selv huskes per leir, så de ikke kommer tilbake når 3D-utsnittet bygges på nytt)
    jakt: { timer: 6, dyr: { elg: [0, 1], rein: [1, 3] }, hviler: 72, rute: 3000, rekkevidde: 250, bredde: 1.3, huskFelt: 600 },
    // (målPerPerson: én person på «fri» i leiren steller så mange mål; færre folk = kornet gror tilsvarende saktere)
    // åker: rasjoner per mål ved høsting, døgn til kornet er modent, såkorn (kr per mål), ny åker (kr og mål per rydding), mest
    åker: { perMål: 6, modning: 3, såkorn: 20000, rydd: 1e6, ryddMål: 20, maks: 200, nær: 500, målPerPerson: 40 },
    // funn: rutenett (m), sjanse per rute, oppdages innen (m), undersøkes innen (m)
    funn: { blokk: 2500, p: .3, ser: 300, tar: 80 },
    // radio: timer mellom meldingene, andelen sanne, flest i lista
    radio: { timer: [3, 6], sann: .65, liste: 8 },
    // tog: kr per km for å sette strekningen i stand, stål per 10 km, timer å sette i stand per 10 km, lengste strekning (km),
    // timer mellom togene og lasten hvert tog har med
    tog: { nærSpor: 1000, krPerKm: 150000, stålPer10: 2, timerPer10: 2, maksKm: 250, mellom: 24, last: { tre: 60, betong: 40, stål: 30, drivstoff: 3000, mat: 80 } },
    // årstidene går av seg selv (valgfritt): døgn per årstid
    årstid: { døgn: 8, rekke: ['sommer', 'høst', 'vinter', 'vår'] },
  };

  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = Math.imul(n, 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
  const hash3 = (a, b, k) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(k | 0, 83492791));

  function ny() {
    return { versjon: 1, frost: 0, regn: 0, tørke: 0, soner: [], nesteSone: 1, brann: nyBrann(), åker: { mål: 0, sådd: false, grodd: 0, år: 0 },
      jakt: { hviler: {}, lag: {}, felt: [] }, funn: { sett: {}, tatt: {} }, radio: { neste: 0, liste: [] }, tog: [], kulde: {}, auto: { på: false, start: 0, fra: 'sommer' } };
  }

  // ---------- 31 vinter ----------
  // Temperaturen i høyden moh når dalen har vær.temp
  const tempVed = (vær, moh) => vær.temp - REGLER.temp.perHundre * ((moh == null ? REGLER.temp.dal : moh) - REGLER.temp.dal) / 100;
  const snøPåBakken = (vær, moh) => moh != null && moh > vær.snøgrense;
  // Faktor på marsjfarten til fots (1 = som vanlig)
  function marsjFaktor(vær, moh) {
    let f = 1; if (snøPåBakken(vær, moh)) f *= REGLER.snø.marsj; if (vær.snø > .5) f *= REGLER.snø.snøvær; if (vær.vær === 'storm') f *= REGLER.snø.storm; return f;
  }
  // Er en veg i denne høyden stengt av snøvær?
  const vegStengt = (vær, moh) => vær.snø > .5 && moh >= REGLER.snø.vegFjell;
  // Snø stenger høye veglenker: gir høyden (moh.) som veglenker over er stengt, eller null. timerSiden = timer siden det sist snødde.
  // Det må snø (eller ha snødd for mindre enn «brøyt» timer siden); grensen er fjellgrensen eller snøgrensen, det som er høyest.
  function snøVegGrense(vær, timerSiden) {
    const S = REGLER.snø, snør = vær.snø > .5 || (timerSiden != null && timerSiden < S.brøyt);
    return snør && vær.snøgrense < S.vegFjell * 2 ? Math.max(S.vegFjell, Math.round(vær.snøgrense)) : null;
  }
  // Er lenken over grensen? høyder = [moh, ...] langs lenken (null = ukjent – da er den åpen)
  const lenkeStengt = (grense, høyder) => grense != null && høyder.some(h => h != null && h > grense);
  const isBærer = V => V.frost >= REGLER.is.bærer;
  // Islagt vann (pakka «sjo» kan bruke det for båter): ferskvann (vannflate over 1 moh., ikke sjøen) etter så mye kulde at isen har lagt seg.
  // moh = høyden på vannflaten, klasse = terrengklasse (3 = vann). Isen stenger båter før den bærer folk (REGLER.is.båt).
  const islagt = (V, moh, klasse) => klasse === 3 && moh != null && moh > REGLER.is.sjø && V.frost >= REGLER.is.båt;
  // Ekstra ved (m³ tre) leiren bruker på d døgn i kulda
  const vedEkstra = (temp, d) => Math.max(0, (REGLER.kulde.vedFra - temp) / 10) * REGLER.kulde.ved * d;
  // Et lag (id) har stått ute i «timer» timer ved temperaturen temp. Gir antall treff kulda gir nå (0 for det meste).
  function kuldeSteg(V, id, timer, temp, ute) {
    const K = REGLER.kulde, før = V.kulde[id] || 0;
    if (!ute || temp > K.grense) { if (før) { const n = Math.max(0, før - timer * 2); if (n) V.kulde[id] = n; else delete V.kulde[id]; } return 0; }
    const nå = før + timer; V.kulde[id] = nå;
    const treff = t => t <= K.timerFør ? 0 : Math.floor((t - K.timerFør) / K.timerPer);
    return treff(nå) - treff(før);
  }

  // Ett steg for været i verden: dtMin spillminutter. vær: { temp, regn (0–1), snø (0–1), våt, årstid }.
  function steg(V, dtMin, vær) {
    const d = dtMin / 1440, t = dtMin / 60, R = REGLER;
    if (vær.temp < 0) V.frost = Math.min(R.is.maks, V.frost - vær.temp * d); else V.frost = Math.max(0, V.frost - vær.temp * d * R.is.tiner);
    V.regn = klem(V.regn + (vær.regn > .1 && vær.temp > 0 ? vær.regn * t : -R.regn.tørker * t * (vær.temp < 0 ? 2 : 1)), 0, R.regn.maks);
    const vått = vær.regn > .1 || vær.snø > .1 || (vær.våt || 0) > .3;
    V.tørke = klem(V.tørke + (vått ? -d * R.tørke.vått : d), 0, R.tørke.maks);
    return V;
  }
  // Brannfaren 0–1 (tørke, ikke regn, ikke snø på bakken i dalen om vinteren)
  function brannfare(V, vær) {
    const T = REGLER.tørke; if (vær.årstid === 'vinter') return 0;
    return klem((V.tørke - T.fra) / (T.full - T.fra), 0, 1) * (1 - klem(vær.regn || 0, 0, 1)) * (1 - klem(vær.våt || 0, 0, 1));
  }
  const flomfare = V => klem((V.regn - REGLER.regn.flom * .5) / (REGLER.regn.flom * .5), 0, 1);
  const rasfare = V => klem((V.regn - REGLER.regn.ras * .5) / (REGLER.regn.ras * .5), 0, 1);
  // Hva kan skje denne timen? Gir 'flom', 'ras' eller null. rnd: tilfeldig tall 0–1.
  function trekkHendelse(V, timer, rnd) {
    const R = REGLER.regn, p = 1 - Math.pow(1 - R.sjanse, timer);
    const har = type => V.soner.some(s => s.type === type);
    if (V.regn >= R.ras && !har('ras') && rnd() < p) { V.regn -= R.etter.ras; return 'ras'; }
    if (V.regn >= R.flom && !har('flom') && rnd() < p) { V.regn -= R.etter.flom; return 'flom'; }
    return null;
  }
  // Det spilleren skal se: linjer med følgene av været og årstiden nå. o: { moh (leiren) }
  function forhold(V, vær, o = {}) {
    const ut = [], moh = o.moh == null ? REGLER.temp.dal : o.moh, f = marsjFaktor(vær, moh), fFjell = marsjFaktor(vær, 1200);
    const pst = x => Math.round((1 - x) * 100);
    if (f < 1) ut.push(`Snø: marsj −${pst(f)} % her`); else if (fFjell < 1) ut.push(`Snø i fjellet: marsj −${pst(fFjell)} % over ${Math.round(Math.max(0, vær.snøgrense))} moh.`);
    if (vær.snø > .5) ut.push(`Snøvær: vegene over ${REGLER.snø.vegFjell} moh. er stengt`);
    if (isBærer(V)) ut.push('Isen bærer: lag kan gå over vann'); else if (V.frost > 0) ut.push(`Is på vannene, bærer ikke ennå (${Math.round(V.frost / REGLER.is.bærer * 100)} %)`);
    if (vær.temp <= REGLER.kulde.grense) ut.push(`Kulde (${Math.round(vær.temp)} °C): lag som står ute lenge tar skade, leiren bruker mer ved`);
    const fl = flomfare(V), ra = rasfare(V), br = brannfare(V, vær);
    if (ra >= 1) ut.push('Mye regn: fare for ras og flom'); else if (fl >= 1) ut.push('Mye regn: fare for flom'); else if (fl > .3) ut.push('Elvene stiger');
    if (br >= 1) ut.push('Tørt: stor brannfare'); else if (br > .3) ut.push('Tørt: brannfare');
    if (!ut.length) ut.push('Gode forhold');
    return ut;
  }

  // ---------- 32 soner (flom, ras) ----------
  // En sone er en sirkel som stenger veger og stopper lag til tiden «til» (spillminutter).
  function nySone(V, type, x, y, r, t, navn) {
    const timer = type === 'ras' ? REGLER.regn.rasTimer : REGLER.regn.flomTimer;
    const s = { id: V.nesteSone++, type, x: Math.round(x), y: Math.round(y), r: Math.round(r), fra: t, til: t + timer * 60, navn: navn || null }; V.soner.push(s); return s;
  }
  const iSone = (V, x, y, type) => V.soner.find(s => (!type || s.type === type) && Math.hypot(s.x - x, s.y - y) <= s.r) || null;
  // Soner som er over: tas ut og gis tilbake
  function ryddSoner(V, t) { const ut = V.soner.filter(s => t >= s.til); if (ut.length) V.soner = V.soner.filter(s => t < s.til); return ut; }
  // Flomradius etter elvas orden (Strahler) og regnsummen
  function flomRadius(V, orden) { const [a, b] = REGLER.regn.flomRadius; return Math.round(klem(a + (b - a) * (klem(orden, 2, 7) - 2) / 5 * klem(V.regn / REGLER.regn.maks * 2, .4, 1), a, b)); }

  // ---------- 33 jakt ----------
  // Hvilket vilt finnes her? klasse = terrengklasse, moh = høyde. Gir 'rein', 'elg' eller null.
  function vilt(moh, klasse) {
    if (moh >= 1100 && [0, 2, 4, 6].includes(klasse)) return 'rein';
    if (moh < 1050 && klasse === 1) return 'elg';
    return null;
  }
  const jaktRute = (x, y) => Math.floor(x / REGLER.jakt.rute) + ',' + Math.floor(y / REGLER.jakt.rute);
  const jaktHviler = (V, x, y, t) => (V.jakt.hviler[jaktRute(x, y)] || 0) > t;
  // Utbyttet når et jaktlag er ferdig: { dyr, mat }. skyttere = friske i laget.
  function jaktUtbytte(V, art, skyttere, x, y, t, rnd) {
    const [a, b] = REGLER.jakt.dyr[art] || [0, 0], flest = Math.min(b, Math.max(a, Math.round(a + (b - a) * rnd() + (skyttere >= 4 ? .4 : 0))));
    const dyr = skyttere > 0 ? flest : 0; V.jakt.hviler[jaktRute(x, y)] = t + REGLER.jakt.hviler * 60;
    return { dyr, mat: dyr * (REGLER.kjøtt[art] || 0) };
  }
  // Skudd fra (x, y) i retningen (fx, fy): hvilket dyr treffes? flokker: [{ art, dyr: [{ x, y }] }]. Gir { F, i, avst } eller null.
  function sikt(flokker, x, y, fx, fy, rekkevidde = REGLER.jakt.rekkevidde) {
    let best = null;
    for (const F of flokker) for (let i = 0; i < F.dyr.length; i++) { const d = F.dyr[i], dx = d.x - x, dy = d.y - y, langs = dx * fx + dy * fy;
      if (langs < 1 || langs > rekkevidde) continue; const tvers = Math.abs(dx * fy - dy * fx);
      if (tvers > REGLER.jakt.bredde + langs * .012) continue; if (!best || langs < best.avst) best = { F, i, avst: langs }; }
    return best;
  }

  // ---------- 34 dyrking ----------
  function så(V, årstid) {
    const Å = V.åker; if (!Å.mål) return { feil: 'Dere har ingen åker ennå.' }; if (Å.sådd) return { feil: 'Åkeren er alt sådd.' };
    if (årstid !== 'vår') return { feil: 'Det sås om våren.' };
    Å.sådd = true; Å.grodd = 0; return { ok: true, pris: Å.mål * REGLER.åker.såkorn };
  }
  // Åkeren d døgn: gror vår og sommer, høstes i én klump om høsten når kornet er modent, fryser bort om vinteren.
  // Gir { mat } når det høstes, { tapt: true } når avlinga gikk tapt, ellers {}.
  function åkerSteg(V, d, årstid, arbeid = 1) {
    const Å = V.åker, R = REGLER.åker; if (!Å.sådd) return {};
    if (årstid === 'vår' || årstid === 'sommer') { Å.grodd += d * klem(arbeid, 0, 1); return {}; }
    if (årstid === 'høst') { Å.sådd = false; const andel = klem(Å.grodd / R.modning, 0, 1), mat = Math.round(Å.mål * R.perMål * andel); Å.grodd = 0; Å.år++; return { mat, andel }; }
    Å.sådd = false; Å.grodd = 0; return { tapt: true };
  }
  // Folk åkeren trenger, og siden (m) på den kvadratiske åkeren i kartet (1 mål = 1000 m²)
  const åkerBehov = mål => Math.ceil(mål / REGLER.åker.målPerPerson);
  const åkerSide = mål => Math.sqrt(Math.max(0, mål) * 1000);
  function ryddÅker(V, mål = REGLER.åker.ryddMål) { const Å = V.åker, R = REGLER.åker; if (Å.mål + mål > R.maks) return { feil: `Dere kan ikke drive mer enn ${R.maks} mål.` }; Å.mål += mål; return { ok: true, pris: R.rydd * mål / R.ryddMål }; }

  // ---------- 35 brann ----------
  // Brannen ligger i et rutenett (REGLER.brann.rute). celler: 'i,j' -> { til } brenner; brent: 'i,j' -> spillminutt det brant ut.
  function nyBrann() { return { celler: {}, brent: {} }; }
  const rute = (x, y) => [Math.floor(x / REGLER.brann.rute), Math.floor(y / REGLER.brann.rute)];
  const midt = (i, j) => [(i + .5) * REGLER.brann.rute, (j + .5) * REGLER.brann.rute];
  function tenn(B, x, y, t, rnd = Math.random) {
    const [i, j] = rute(x, y), k = i + ',' + j; if (B.celler[k] || B.brent[k]) return false;
    const [a, b] = REGLER.brann.brenner; B.celler[k] = { fra: t, til: t + a + (b - a) * rnd() }; return true;
  }
  const brenner = (B, x, y) => { const [i, j] = rute(x, y); return !!B.celler[i + ',' + j]; };
  const erBrent = (B, x, y) => { const [i, j] = rute(x, y); return !!B.brent[i + ',' + j]; };
  // Ett steg: dtMin spillminutter. vær: { regn, våt, vind: { fart, retning } }, fare: brannfaren 0–1 (brannfare()),
  // brennbar(x, y) -> 0–1 (0 = brenner ikke: vann, snø, utenfor). Gir { nye, ut } (antall ruter).
  function brannSteg(B, t, dtMin, vær, fare, brennbar, rnd = Math.random) {
    const R = REGLER.brann, nøkler = Object.keys(B.celler); let nye = 0, ut = 0;
    const vx = Math.cos(vær.vind ? vær.vind.retning : 0), vy = Math.sin(vær.vind ? vær.vind.retning : 0), vf = vær.vind ? vær.vind.fart : 0, steg10 = dtMin / 10;
    const slokk = 1 - Math.pow(1 - R.slokk * klem(vær.regn || 0, 0, 1), steg10);
    for (const k of nøkler) {
      const c = B.celler[k], [i, j] = k.split(',').map(Number);
      if (t >= c.til || rnd() < slokk) { delete B.celler[k]; B.brent[k] = Math.round(t); ut++; continue; }
      if (fare <= 0 || Object.keys(B.celler).length >= R.maks) continue;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const n = (i + di) + ',' + (j + dj); if (B.celler[n] || B.brent[n]) continue;
        const [x, y] = midt(i + di, j + dj), b = brennbar(x, y); if (!(b > 0)) continue;
        const l = Math.hypot(di, dj), medvind = (di * vx + dj * vy) / l, vind = Math.max(.15, 1 + R.vind * vf * medvind);
        const p = 1 - Math.pow(1 - klem(R.spred * b * fare * vind / l, 0, .95), steg10);
        if (rnd() < p) { const [a, bb] = R.brenner; B.celler[n] = { fra: t, til: t + a + (bb - a) * rnd() }; nye++; }
      }
    }
    return { nye, ut };
  }
  // Listene andre moduler leser (window.BRANNER / window.BRENT): [{ x, y, r }] med midten av ruta i kartmeter og halve rutebredden
  function brannListe(B) {
    const r = REGLER.brann.rute / 2, les = (o, f) => Object.keys(o).map(k => { const [i, j] = k.split(',').map(Number), [x, y] = midt(i, j); return f(x, y, o[k]); });
    return { brenner: les(B.celler, (x, y, c) => ({ x, y, r, fra: c.fra, til: c.til })), brent: les(B.brent, (x, y, t) => ({ x, y, r, t })) };
  }

  // ---------- 36 funn ----------
  const FUNN = {
    vrak: { navn: 'Bilvrak', tekst: 'Et utbrent kjøretøy i terrenget' },
    depot: { navn: 'Gjemt depot', tekst: 'Kasser under en presenning' },
    leir: { navn: 'Forlatt leir', tekst: 'Telt og bålplass – ingen her nå' },
    fly: { navn: 'Flyvrak', tekst: 'Et lite fly som har gått ned' },
  };
  // Funnet i rute (bx, by) – eller null. Samme sted hver gang (hash av ruta).
  function funnIBlokk(bx, by) {
    const R = REGLER.funn; if (hash3(bx, by, 1) >= R.p) return null;
    const typer = ['vrak', 'vrak', 'depot', 'depot', 'leir', 'leir', 'fly'], type = typer[Math.floor(hash3(bx, by, 2) * typer.length)];
    return { id: bx + ',' + by, type, navn: FUNN[type].navn, x: Math.round((bx + .15 + .7 * hash3(bx, by, 3)) * R.blokk), y: Math.round((by + .15 + .7 * hash3(bx, by, 4)) * R.blokk), frø: Math.floor(hash3(bx, by, 5) * 1e9) };
  }
  function funnNær(x, y, r) {
    const B = REGLER.funn.blokk, ut = [];
    for (let by = Math.floor((y - r) / B); by <= Math.floor((y + r) / B); by++) for (let bx = Math.floor((x - r) / B); bx <= Math.floor((x + r) / B); bx++) {
      const f = funnIBlokk(bx, by); if (f && Math.hypot(f.x - x, f.y - y) <= r) ut.push(f); }
    return ut;
  }
  // Hva ligger der? { tekst, gi: { tre, stål, betong, mat, drivstoff, kr }, hendelse: null | 'bakhold' | 'tomt' }
  function innhold(f) {
    const r = k => hash(f.frø + k * 7919), gi = {}, rund = (a, b, k) => Math.round(a + (b - a) * r(k));
    if (r(1) < .12) return { tekst: 'Noen har vært her før dere. Tomt.', gi, hendelse: 'tomt' };
    if (f.type === 'leir' && r(2) < .25) return { tekst: 'Det var en felle! Skudd fra skogkanten.', gi: { mat: rund(5, 15, 3) }, hendelse: 'bakhold' };
    if (f.type === 'vrak') { gi.stål = rund(3, 10, 4); gi.drivstoff = rund(0, 400, 5); }
    else if (f.type === 'depot') { gi.mat = rund(20, 60, 4); gi.drivstoff = rund(100, 800, 5); if (r(6) < .5) gi.kr = rund(2, 12, 7) * 1e5; }
    else if (f.type === 'leir') { gi.mat = rund(10, 40, 4); gi.tre = rund(5, 20, 5); }
    else { gi.stål = rund(5, 14, 4); gi.kr = rund(5, 30, 5) * 1e5; }
    const deler = Object.entries(gi).filter(([, v]) => v > 0).map(([k, v]) => k === 'kr' ? `${(v / 1e6).toFixed(1).replace('.', ',')} mill. kr` : k === 'drivstoff' ? `${v} l diesel` : k === 'mat' ? `${v} rasjoner` : `${v} ${k}`);
    return { tekst: deler.length ? 'Dere fant ' + deler.join(', ') + '.' : 'Ingenting å ta med.', gi, hendelse: null };
  }

  // ---------- 37 radio ----------
  const FALSKE = [
    s => `Ukjent sender: «Et stort depot ligger ubevoktet ved ${s}.»`,
    s => `Ukjent sender: «Fienden samler seg ved ${s} og angriper i natt.»`,
    s => `Nødrop: «Vi er omringet ved ${s} – send hjelp!»`,
    s => `Ukjent sender: «Brua ved ${s} er sprengt.»`,
    s => `Ukjent sender: «Det deles ut mat ved ${s} i morgen tidlig.»`,
    () => 'Ukjent sender: «Uvær på vei – hold dere inne det neste døgnet.»',
  ];
  // sanne: tekster som stemmer akkurat nå (visningen lager dem), steder: stedsnavn i regionen. Gir { tekst, sann }.
  function radioMelding(sanne, steder, rnd) {
    const sted = steder && steder.length ? steder[Math.floor(rnd() * steder.length)] : 'vegkrysset';
    if (sanne && sanne.length && rnd() < REGLER.radio.sann) return { tekst: sanne[Math.floor(rnd() * sanne.length)], sann: true };
    return { tekst: FALSKE[Math.floor(rnd() * FALSKE.length)](sted), sann: false };
  }
  function radioInn(V, m, t, rnd) {
    const [a, b] = REGLER.radio.timer; V.radio.liste.unshift({ t: Math.round(t), tekst: m.tekst, sann: m.sann }); V.radio.liste.length = Math.min(V.radio.liste.length, REGLER.radio.liste);
    V.radio.neste = t + (a + (b - a) * rnd()) * 60; return V.radio.liste[0];
  }

  // ---------- 38 tog ----------
  // RESERVE når jernbanedataene ikke er lastet (visningen ser ellers etter spor innen 1 km fra tettstedet).
  // Tettsteder med jernbanestasjon (Claudes liste etter hukommelsen: de viktigste stasjonsbyene på Dovrebanen, Raumabanen, Rørosbanen,
  // Bergensbanen, Sørlandsbanen, Jærbanen, Østfoldbanen, Vestfoldbanen, Nordlandsbanen, Ofotbanen m.fl.). Sammenlignes uten store bokstaver.
  const STASJONER = ['Oslo', 'Lillestrøm', 'Eidsvoll', 'Hamar', 'Brumunddal', 'Moelv', 'Lillehammer', 'Ringebu', 'Vinstra', 'Otta', 'Dovre', 'Dombås', 'Oppdal', 'Berkåk', 'Støren',
    'Melhus', 'Trondheim', 'Stjørdal', 'Stjørdalshalsen', 'Levanger', 'Verdal', 'Verdalsøra', 'Steinkjer', 'Grong', 'Mosjøen', 'Mo i Rana', 'Fauske', 'Bodø', 'Narvik', 'Lesja', 'Lesjaskog', 'Bjorli', 'Åndalsnes',
    'Elverum', 'Rena', 'Koppang', 'Alvdal', 'Tynset', 'Røros', 'Kongsvinger', 'Hønefoss', 'Gol', 'Ål', 'Geilo', 'Voss', 'Vossevangen', 'Dale', 'Arna', 'Bergen', 'Drammen', 'Hokksund', 'Kongsberg', 'Nordagutu',
    'Bø', 'Neslandsvatn', 'Vennesla', 'Kristiansand', 'Egersund', 'Bryne', 'Sandnes', 'Stavanger', 'Ski', 'Moss', 'Fredrikstad', 'Sarpsborg', 'Halden', 'Tønsberg', 'Sandefjord', 'Larvik', 'Porsgrunn', 'Skien',
    'Gjøvik', 'Raufoss', 'Notodden', 'Arendal', 'Flåm', 'Myrdal', 'Finse', 'Hell', 'Askim', 'Mysen', 'Jessheim', 'Asker', 'Sandvika'];
  const erStasjon = navn => !!navn && STASJONER.some(s => s.toLowerCase() === String(navn).toLowerCase().split('/')[0].trim());
  // Kan strekningen a–b settes i stand? a, b: { id, navn, x, y, eier }. Gir { feil } eller { km, pris, stål, timer }.
  function togPlan(a, b, side = 'blå') {
    const R = REGLER.tog; if (!a || !b || a.id === b.id) return { feil: 'Velg to forskjellige stasjoner.' };
    // s.stasjon: true/false når kartdataene har svart (spor nær tettstedet), ellers gjelder navnelista
    for (const s of [a, b]) { if (!(s.stasjon === true || (s.stasjon == null && erStasjon(s.navn)))) return { feil: `${s.navn} har ingen jernbanestasjon.` }; if (s.eier !== side) return { feil: `Dere holder ikke ${s.navn}.` }; }
    const km = Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 100) / 10; if (km > R.maksKm) return { feil: `For langt (${km} km, mest ${R.maksKm} km).` };
    return { km, pris: Math.round(km * R.krPerKm), stål: Math.ceil(km / 10 * R.stålPer10), timer: Math.max(1, Math.round(km / 10 * R.timerPer10)) };
  }
  function togStart(V, a, b, t, side) {
    const p = togPlan(a, b, side); if (p.feil) return p; if (V.tog.some(s => (s.a === a.id && s.b === b.id) || (s.a === b.id && s.b === a.id))) return { feil: 'Strekningen er alt i gang.' };
    const s = { a: a.id, b: b.id, navnA: a.navn, navnB: b.navn, km: p.km, klar: t + p.timer * 60, neste: t + p.timer * 60 + REGLER.tog.mellom * 60, meldt: false }; V.tog.push(s); return { ...p, s };
  }
  // Togene som kommer fram nå. eier(id) -> side. Gir [{ s, last }] (last = null når strekningen er brutt: dere holder ikke begge endene).
  function togSteg(V, t, eier, side = 'blå') {
    const ut = [];
    for (const s of V.tog) { if (t < s.klar) continue; if (!s.meldt) { s.meldt = true; ut.push({ s, åpnet: true }); }
      while (t >= s.neste) { s.neste += REGLER.tog.mellom * 60; const holder = eier(s.a) === side && eier(s.b) === side; ut.push({ s, last: holder ? { ...REGLER.tog.last } : null }); } }
    return ut;
  }

  // ---------- årstidene går av seg selv (valgfritt) ----------
  function årstidNå(V, t) { const A = V.auto, R = REGLER.årstid; if (!A.på) return null; const n = Math.floor((t - A.start) / (R.døgn * 1440)), i = R.rekke.indexOf(A.fra); return R.rekke[((i < 0 ? 0 : i) + Math.max(0, n)) % R.rekke.length]; }

  function fraJSON(d) { const V = ny(); if (!d || d.versjon !== 1) return V; for (const k of Object.keys(V)) if (d[k] != null) V[k] = typeof V[k] === 'object' && !Array.isArray(V[k]) ? { ...V[k], ...d[k] } : d[k]; if (!V.brann.celler) V.brann = nyBrann(); return V; }

  const api = { REGLER, FUNN, STASJONER, ny, fraJSON, hash, tempVed, snøPåBakken, marsjFaktor, vegStengt, snøVegGrense, lenkeStengt, islagt, isBærer, vedEkstra, kuldeSteg, steg, brannfare, flomfare, rasfare, trekkHendelse, forhold,
    nySone, iSone, ryddSoner, flomRadius, vilt, jaktRute, jaktHviler, jaktUtbytte, sikt, så, åkerSteg, ryddÅker, åkerBehov, åkerSide, nyBrann, rute, midt, tenn, brenner, erBrent, brannSteg, brannListe,
    funnIBlokk, funnNær, innhold, radioMelding, radioInn, erStasjon, togPlan, togStart, togSteg, årstidNå };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Verden = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
