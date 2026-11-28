'use strict';
/* Riksbrudd – TRE VEIER TIL SEIER (28. nov; docs/plan-selskap-okonomi.md kapittel 14.6 og spørsmål 21 i kapittel 18).
 * Før skjedde det lite når du vant: krigskartet ga et kort ved 60 % av folket. Planen foreslår tre veier, og at spillet kan fortsette
 * etterpå (brukerens svar på spørsmål 21 er ikke kommet – forslaget i planen brukes: tre veier, og «Spill videre»):
 *  - MAKT: 60 % av folket i området er dine. Dette er krigskartets regel (spill/strategi.js: Strategi.stilling og REGLER.seier) –
 *    her regnes den ikke på nytt, bare leses av stillingen.
 *  - PENGER: selskapet er verdt mer enn målet, og mer enn hver av rivalene. I denne fasen er verdien = kassa + byggene (det de kostet,
 *    ganget med hvor hele de er) + lageret (materialer og diesel til innkjøpspris) + kjøretøyene. Rivalene har ingen regnskap: verdien
 *    deres anslås av kassa (spill/eskalering.js), tettstedene og lagene de har. NÅR GRÅBØRSEN KOMMER (fase Ø7), BYTTES DETTE UT MED
 *    BØRSVERDIEN (aksjekursen × aksjene), og «ingen rival kan kjøpe deg opp» blir et krav.
 *  - GJENOPPBYGGING: i hvert tettsted du holder i området (minst tre): strøm (et helt kraftverk innen 40 km, spill/garnison.js), ingen
 *    sprengte bruer, dammer eller sabotert kraftverk innen 15 km som ikke er reparert (INFRA_TILSTAND, spill/odeleggelse.js), ingen sult
 *    (lojaliteten minst 55, spill/region.js, og leiren har mat), og tettstedet er holdt i minst to døgn. Tettstedene som er bygd opp, må til
 *    sammen ha minst 30 % av folket i området. Rivalene har ingen lojalitet i spillet: for dem gjelder strøm, bruer og to døgn.
 * Rivalene (Ravnsund = rød, Mosevakt = grønn) kan vinne på alle tre.
 * Reglene er uten DOM (test: pipeline/fliser/test_seier.js). Node: require('./seier'); nettleser: globalThis.Seier.
 * Visningen (målerne, avslutningen, huskingen per leir) står i spill/seier-visning.js (window.SeierSpill).
 */
(function (rot) {
  // ALLE TALLENE HER ER CLAUDES FORSLAG (spillverdier, ikke brukerens fasit)
  const REGLER = {
    SIDER: ['blå', 'rød', 'grønn'],
    VEIER: [
      { id: 'makt', navn: 'Makt', kort: 'du styrer regionen', mål: '60 % av folket i området er dine' },
      { id: 'penger', navn: 'Penger', kort: 'du eier regionen', mål: 'selskapet er verdt mest – og minst 250 mill. kr' },
      { id: 'gjenoppbygging', navn: 'Gjenoppbygging', kort: 'du har bygget landet opp igjen', mål: 'strøm, hele bruer og ingen sult i tettstedene du holder' },
    ],
    // MAKT: andel og minste antall tettsteder hentes fra Strategi.REGLER (seier .6, minSeier 3, tidligst 3 døgn); dette er reserven
    makt: { seier: .6, minSeier: 3, tidligst: 3 * 1440 },
    penger: {
      mål: 250e6,            // kr: selskapet må være verdt minst så mye (startkassa er 40 mill.)
      tidligst: 3 * 1440,    // spillminutter: ingen vinner før det har gått tre døgn (som krigen)
      // kjøretøyene i kroner (i spillet kjøpes de for olje eller kommer med oppdrag – dette er bare til verdien)
      kjøretøy: { lastebil: 1.5e6, speiderbil: .8e6, stridsvogn: 7e6, rakettartilleri: 8e6, radar: 4e6, annet: 2e6 },
      // rivalenes anslåtte verdi: grunnverdi (hovedkvarteret) + kr per innbygger i tettstedene de holder + kr per lag + kassa
      rival: { grunn: 15e6, perInnbygger: 800, perLag: 2.5e6 },
      // (ut5-bors) med Gråbørsen: ingen rival kan eie så mange % av deg når du vinner på penger
      trygg: 30,
    },
    gjenoppbygging: {
      minByer: 3,            // du må holde minst så mange tettsteder i området
      andel: .3,             // tettstedene som er bygd opp, har til sammen minst så stor del av folket i området
      radius: 15000,         // m: en sprengt bru / dam / sabotert kraftverk så nær et tettsted teller mot det (som Region.REGLER.bygg.radius)
      loj: 55,               // lojalitet (0–100) under dette = folk sulter eller er misfornøyde
      holdtDøgn: 2,          // et tettsted må være holdt så lenge før det teller (det tar tid å bygge opp)
      tidligst: 5 * 1440,    // ingen vinner før dag 6
      lag: ['bru', 'dam', 'kraft'],   // det som må være helt (INFRA_TILSTAND)
    },
    // fremdriften slipper «nådd» igjen under dette (da kan avslutningen komme på nytt senere)
    glemUnder: .85,
  };
  const tall = v => (Number.isFinite(+v) ? +v : 0);
  const klem = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const prosent = v => Math.round(klem(v) * 100);
  const vei = id => REGLER.VEIER.find(v => v.id === id) || null;

  // ---------- MAKT ----------
  // st = Strategi.stilling(...) ({ byer, folk, sider: { side: { andel } } }), SR = Strategi.REGLER (seier, minSeier, tidligst)
  // Gir { fremdrift 0–1, nådd, andel, mangler }
  function makt(st, side, tid, SR) {
    const R = { ...REGLER.makt, ...(SR || {}) }, m = st && st.sider && st.sider[side];
    const andel = m ? tall(m.andel) : 0, byer = st ? tall(st.byer) : 0, forTidlig = Number.isFinite(tid) && tid < tall(R.tidligst);
    const nådd = byer >= R.minSeier && andel >= R.seier && !forTidlig;
    const mangler = [];
    if (byer < R.minSeier) mangler.push(`Området har bare ${byer} ${byer === 1 ? 'tettsted' : 'tettsteder'} (minst ${R.minSeier})`);
    if (andel < R.seier) mangler.push(`${prosent(andel)} % av folket – trenger ${prosent(R.seier)} %`);
    if (forTidlig) mangler.push(`Avgjøres tidligst dag ${Math.floor(R.tidligst / 1440) + 1}`);
    return { fremdrift: nådd ? 1 : Math.min(.99, klem(R.seier > 0 ? andel / R.seier : 0)), nådd, andel, mangler };
  }

  // ---------- PENGER ----------
  // byggene: [{ type, pris?, hp?, ferdig }] (bare ferdige teller), BYGG = Leir.BYGG (grunnprisen når bygget ikke har sin egen pris)
  function byggVerdi(bygg, BYGG) {
    let v = 0; for (const b of bygg || []) { if (!b || b.ferdig === false) continue; const p = Number.isFinite(b.pris) ? b.pris : BYGG && BYGG[b.type] && Number.isFinite(BYGG[b.type].pris) ? BYGG[b.type].pris : 0;
      v += p * klem(Number.isFinite(b.hp) ? b.hp : 1); } return Math.round(v); }
  // lageret { tre, betong, stål } med MATERIALER fra leir.js ({ tre: { pris } …}), og diesel (liter) til literpris
  function lagerVerdi(lager, MATERIALER, diesel, literPris) {
    let v = 0; for (const [k, n] of Object.entries(lager || {})) if (MATERIALER && MATERIALER[k] && Number.isFinite(n)) v += Math.max(0, n) * tall(MATERIALER[k].pris);
    return Math.round(v + Math.max(0, tall(diesel)) * tall(literPris)); }
  // kjøretøyene [{ type, antall }]
  function kjøretøyVerdi(liste, R = REGLER.penger) {
    let v = 0; for (const k of liste || []) { if (!k) continue; v += (R.kjøretøy[k.type] !== undefined ? R.kjøretøy[k.type] : R.kjøretøy.annet) * Math.max(1, tall(k.antall) || 1); } return Math.round(v); }
  // din verdi: { kassa, bygg, lager, kjøretøy } (kroner) -> { sum, deler }
  function verdi(d) { const deler = { kassa: Math.max(0, tall(d && d.kassa)), bygg: tall(d && d.bygg), lager: tall(d && d.lager), kjøretøy: tall(d && d.kjøretøy) };
    return { sum: deler.kassa + deler.bygg + deler.lager + deler.kjøretøy, deler }; }
  // rivalens anslåtte verdi: { kasse, folk (innbyggere i tettstedene de holder), lag, kjøretøy (kroner) }
  function rivalVerdi(d, R = REGLER.penger) { const r = R.rival, deler = { kassa: Math.max(0, tall(d && d.kasse)), grunn: r.grunn, tettsteder: tall(d && d.folk) * r.perInnbygger, lag: tall(d && d.lag) * r.perLag, kjøretøy: tall(d && d.kjøretøy) };
    return { sum: deler.kassa + deler.grunn + deler.tettsteder + deler.lag + deler.kjøretøy, deler, anslag: true }; }
  // verdier: { blå: tall, rød: tall, grønn: tall }. Gir { fremdrift, nådd, verdi, foran, størst, mangler }
  // (ut5-bors, Ø7) o = Gråbørsen (spill/bors.js Bors.seierInn): { oppkjøpt: { side: rival som eier over 50 % }, rivalAndel: { side: største
  //   rivals andel i % } }. Kjøpt opp = du kan ikke vinne, og rivalen som kjøpte, har vunnet. En rival med minst R.trygg % må ut før du vinner.
  function penger(verdier, side, tid, R = REGLER.penger, o = {}) {
    R = R || REGLER.penger; o = o || {};
    const opp = o.oppkjøpt || {}, kjøpte = Object.entries(opp).find(([, r]) => r === side);
    if (opp[side]) return { fremdrift: 0, nådd: false, verdi: tall(verdier && verdier[side]), foran: false, størst: opp[side], mangler: [`Selskapet er kjøpt opp av ${opp[side]}`], oppkjøpt: opp[side] };
    if (kjøpte && !(Number.isFinite(tid) && tid < tall(R.tidligst))) return { fremdrift: 1, nådd: true, verdi: tall(verdier && verdier[side]), foran: true, størst: side, mangler: [], oppkjøp: kjøpte[0] };
    const v = tall(verdier && verdier[side]), andre = Object.entries(verdier || {}).filter(([s]) => s !== side).map(([s, x]) => [s, tall(x)]);
    const størst = andre.reduce((m, q) => (q[1] > m[1] ? q : m), [null, -Infinity]), foran = v > størst[1];
    const forTidlig = Number.isFinite(tid) && tid < tall(R.tidligst), nådd = v >= R.mål && foran && !forTidlig;
    const mangler = [];
    if (v < R.mål) mangler.push(`Verdt ${mill(v)} – målet er ${mill(R.mål)}`);
    if (!foran && størst[0]) mangler.push(`${størst[0]} er verdt mer (${mill(størst[1])})`);
    if (forTidlig) mangler.push(`Avgjøres tidligst dag ${Math.floor(R.tidligst / 1440) + 1}`);
    const ra = tall(o.rivalAndel && o.rivalAndel[side]), utrygg = ra >= tall(R.trygg, 30);
    if (utrygg) mangler.push(`En rival eier ${Math.round(ra)} % av selskapet – kjøp tilbake så ingen eier ${tall(R.trygg, 30)} % eller mer`);
    const ok = nådd && !utrygg;
    return { fremdrift: ok ? 1 : Math.min(.99, klem(v / R.mål)), nådd: ok, verdi: v, foran, størst: størst[0], mangler, børs: !!o.børs };
  }
  const mill = v => { const m = tall(v) / 1e6; return (m >= 100 ? String(Math.round(m)) : String(Math.round(m * 10) / 10).replace('.', ',')) + ' mill. kr'; };

  // ---------- GJENOPPBYGGING ----------
  // byer: tettstedene i området [{ id, navn, folk, eier, strøm (true/false), ødelagt (antall uten reparasjon innen radius), loj (tall | null),
  //   holdtFra (spillminutt da eieren tok det, eller null) }]. o: { tid, sult (true når leiren til siden er tom for mat) }
  // Gir { fremdrift, nådd, holdt, ok, andel, mangler, byer: [{ id, navn, ok, hvorfor: [] }] }
  function gjenoppbygging(byer, side, o = {}, R = REGLER.gjenoppbygging) {
    const tid = tall(o.tid), alle = byer || [], total = alle.reduce((s, b) => s + tall(b.folk), 0);
    const mine = alle.filter(b => b.eier === side), ut = [];
    let okFolk = 0, nOk = 0, delSum = 0, delFolkSum = 0;
    for (const b of mine) {
      const hvorfor = [];
      if (b.strøm === false) hvorfor.push('uten strøm');
      if (tall(b.ødelagt) > 0) hvorfor.push(b.ødelagt === 1 ? 'en bru/et kraftverk i nærheten er ødelagt' : `${b.ødelagt} bruer/kraftverk i nærheten er ødelagt`);
      if (b.loj !== null && b.loj !== undefined && tall(b.loj) < R.loj) hvorfor.push(`lojalitet ${Math.round(tall(b.loj))} (minst ${R.loj})`);
      const holdt = Number.isFinite(b.holdtFra) ? tid - b.holdtFra : 0;
      if (holdt < R.holdtDøgn * 1440) hvorfor.push(`holdt i ${Math.max(0, Math.round(holdt / 144) / 10).toString().replace('.', ',')} av ${R.holdtDøgn} døgn`);
      const ok = !hvorfor.length; if (ok) { nOk++; okFolk += tall(b.folk); }
      // delvis: hvor mye av kravene tettstedet oppfyller (strøm, bruer, lojalitet, tid), så måleren går jevnt og ikke står på 0 i to døgn
      //  – et tettsted dere nettopp har tatt, teller halvt til det har vært holdt i holdtDøgn
      const del = ok ? 1 : ((b.strøm === false ? 0 : 1) + (tall(b.ødelagt) > 0 ? 0 : 1) + (b.loj === null || b.loj === undefined ? 1 : klem(tall(b.loj) / R.loj))) / 3 * (.5 + .5 * klem(holdt / (R.holdtDøgn * 1440)));
      delSum += del; delFolkSum += del * tall(b.folk);
      ut.push({ id: b.id, navn: b.navn, folk: tall(b.folk), ok, del, hvorfor });
    }
    const andel = total ? okFolk / total : 0, forTidlig = tid < tall(R.tidligst);
    const delBy = klem(delSum / Math.max(R.minByer, mine.length)), delFolk = klem(R.andel > 0 && total ? delFolkSum / total / R.andel : 0);
    const nådd = mine.length >= R.minByer && nOk === mine.length && andel >= R.andel && !o.sult && !forTidlig;
    const mangler = [];
    if (mine.length < R.minByer) mangler.push(`Hold minst ${R.minByer} tettsteder (nå ${mine.length})`);
    for (const b of ut) if (!b.ok) mangler.push(`${b.navn}: ${b.hvorfor.join(', ')}`);
    if (andel < R.andel) mangler.push(`Tettstedene som er bygd opp, har ${prosent(andel)} % av folket – trenger ${prosent(R.andel)} %`);
    if (o.sult) mangler.push('Leiren er tom for mat');
    if (forTidlig) mangler.push(`Avgjøres tidligst dag ${Math.floor(R.tidligst / 1440) + 1}`);
    let fremdrift = Math.min(delBy, delFolk); if (o.sult) fremdrift *= .5;
    return { fremdrift: nådd ? 1 : Math.min(.99, klem(fremdrift)), nådd, holdt: mine.length, ok: nOk, andel, mangler, byer: ut };
  }
  // ødelagte ting innen radius fra (x, y): liste = [{ x, y, lag, tilstand }] (tilstand 'hel' teller ikke)
  function ødelagtNær(x, y, liste, R = REGLER.gjenoppbygging) {
    let n = 0; for (const q of liste || []) if (q && q.tilstand !== 'hel' && R.lag.includes(q.lag) && Math.hypot(q.x - x, q.y - y) <= R.radius) n++; return n; }
  // Holdt siden: H = { id: { eier, fra } }. eiere = [[id, eier]] slik det er nå. Gir H (endret: ny eier = ny «fra»; ingen eier = slettet)
  function holdt(H, eiere, tid) {
    H = H || {}; const sett = new Set();
    for (const [id, e] of eiere || []) { const k = String(id); sett.add(k); if (!e) { delete H[k]; continue; } if (!H[k] || H[k].eier !== e) H[k] = { eier: e, fra: tall(tid) }; }
    return H; }

  // ---------- alle tre for alle sidene ----------
  // inn: { tid, st, SR, verdier, byer (som gjenoppbygging, uten eier-filter), sult: { side: bool } }
  // Gir { blå: { makt, penger, gjenoppbygging }, rød: …, grønn: … }
  function alle(inn) {
    const ut = {}; for (const s of REGLER.SIDER) ut[s] = {
      makt: makt(inn.st, s, inn.tid, inn.SR),
      penger: penger(inn.verdier || {}, s, inn.tid, REGLER.penger, inn.børs),
      gjenoppbygging: gjenoppbygging(inn.byer || [], s, { tid: inn.tid, sult: !!(inn.sult && inn.sult[s]) }),
    };
    return ut;
  }
  // de veiene som er nådd: [{ side, vei }] – din side først, så makt, penger, gjenoppbygging
  function nådd(A) { const ut = []; for (const s of REGLER.SIDER) for (const v of REGLER.VEIER) if (A && A[s] && A[s][v.id] && A[s][v.id].nådd) ut.push({ side: s, vei: v.id }); return ut; }

  // ---------- huskingen (ren JSON, per leir) ----------
  const ny = leir => ({ v: 1, leir: leir || '', holdt: {}, seire: [], aktiv: {}, falne: 0, lagUt: 0, maksBy: 0, sjekketGml: false });
  function fraJSON(d, leir) {
    if (!d || typeof d !== 'object' || d.leir !== leir) return ny(leir);
    const S = ny(leir);
    if (d.holdt && typeof d.holdt === 'object') for (const [k, h] of Object.entries(d.holdt)) if (h && typeof h.eier === 'string' && Number.isFinite(h.fra)) S.holdt[k] = { eier: h.eier, fra: h.fra };
    if (Array.isArray(d.seire)) S.seire = d.seire.filter(q => q && REGLER.SIDER.includes(q.side) && vei(q.vei)).slice(-20).map(q => ({ side: q.side, vei: q.vei, tid: tall(q.tid), valg: q.valg || null }));
    if (d.aktiv && typeof d.aktiv === 'object') for (const [k, v] of Object.entries(d.aktiv)) if (v) S.aktiv[k] = true;
    S.sjekketGml = !!d.sjekketGml;
    S.falne = Math.max(0, tall(d.falne)); S.lagUt = Math.max(0, tall(d.lagUt)); S.maksBy = Math.max(0, tall(d.maksBy));
    return S;
  }
  // en ny avslutning? S.aktiv['side:vei'] = vist og ikke glemt. A = alle(...). Gir lista med nye (og glemmer de som har falt under glemUnder)
  function nye(S, A, R = REGLER) {
    const ut = [];
    for (const s of R.SIDER) for (const v of R.VEIER) { const k = s + ':' + v.id, q = A && A[s] && A[s][v.id]; if (!q) continue;
      if (q.nådd && !S.aktiv[k]) ut.push({ side: s, vei: v.id });
      else if (!q.nådd && S.aktiv[k] && q.fremdrift < R.glemUnder) delete S.aktiv[k]; }
    // din seier først
    return ut.sort((a, b) => (a.side === 'blå' ? 0 : 1) - (b.side === 'blå' ? 0 : 1));
  }
  // spilleren har sett avslutningen (valg: 'videre' | 'nytt' | …): huskes
  function husk(S, side, veiId, tid, valg) { S.aktiv[side + ':' + veiId] = true; S.seire.push({ side, vei: veiId, tid: tall(tid), valg: valg || null }); if (S.seire.length > 20) S.seire.splice(0, S.seire.length - 20); return S; }
  const vunnet = (S, side, veiId) => (S.seire || []).filter(q => q.side === side && (!veiId || q.vei === veiId));

  // ---------- avisa ----------
  // navn: { blå, rød, grønn } (fraksjonsnavnene), tall: { andel, verdi, byer, dag }
  function avis(veiId, side, navn, t = {}) {
    const N = s => (navn && navn[s]) || s, du = side === 'blå', hvem = N(side), dag = t.dag ? `Dag ${t.dag}` : '';
    const andre = REGLER.SIDER.filter(s => s !== side).map(N).join(' og ');
    const T = {
      makt: du ? [`${hvem} styrer regionen`, `Med ${prosent(t.andel)} % av folket bak seg har ${hvem} samlet regionen. ${andre} har trukket seg tilbake, og vegsperringene står ubemannet for første gang på lenge.`]
        : [`${hvem} har tatt makten`, `${hvem} holder nå ${prosent(t.andel)} % av folket i regionen. Folk har sett flaggene gå opp i by etter by. Men det finnes fortsatt dem som husker hvem som holdt ord.`],
      penger: du ? [`${hvem} eier regionen`, `Selskapet er verdt ${mill(t.verdi)} – mer enn noen rival. Det er kontraktene og byggene til ${hvem} som holder hjulene i gang nå.`]
        : t.oppkjøp ? [`${hvem} har kjøpt opp ${N('blå')}`, `På Gråbørsen eier ${hvem} nå over halvparten av ${N('blå')}. De nye eierne bestemmer hvem som leder, hvilke kontrakter som tas – og hvem som får gå.`]
        : [`${hvem} kjøper opp regionen`, `${hvem} er ${t.børs ? 'verdt' : 'anslått til'} ${mill(t.verdi)}, og pengene deres styrer hvem som får mat og diesel. Konkurrentene må finne nye kunder.`],
      gjenoppbygging: du ? ['Lyset er tilbake', `Strømmen går, bruene står, og ingen sulter i de ${t.byer || 'tre'} tettstedene ${hvem} holder. Etter kollapsen er dette det første stedet i landet som er bygget opp igjen.`]
        : [`${hvem} gjenreiser regionen`, `I tettstedene ${hvem} holder, går strømmen igjen og bruene er reparert. Folk flytter dit, og det er deres orden de forteller om.`],
    }[veiId] || ['Krigen er avgjort', ''];
    return { overskrift: T[0], ingress: T[1], dato: dag, du };
  }

  const Seier = { REGLER, vei, makt, penger, gjenoppbygging, byggVerdi, lagerVerdi, kjøretøyVerdi, verdi, rivalVerdi, ødelagtNær, holdt, alle, nådd, ny, fraJSON, nye, husk, vunnet, avis, mill, prosent };
  if (typeof module !== 'undefined' && module.exports) { module.exports = Seier; return; }
  rot.Seier = Seier;
})(typeof globalThis !== 'undefined' ? globalThis : this);
