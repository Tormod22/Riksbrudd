/* Riksbrudd – VARER MED PLASS (28. nov, fase G4 i docs/plan-selskap-okonomi.md, kapittel 13.2 «Varer som tar fysisk plass»).
 * Regler uten DOM (Node: require('./varelager'); nettleser: globalThis.Varelager). Visningen: spill/varelager-visning.js.
 *
 * Lageret er ikke bare et tall lenger: hver vare ligger i ENHETER med plass – en tømmerhaug (2 m³), en pall planker, en pall
 * sementsekker, en bunt stål, en storsekk flis, en pall ved, et fat diesel (200 l) – på PLASSER i leiren: i lagerbyggene (lagertelt,
 * container, egne rom fra byggesettet), ved dieseltanken og ute på lagerplassen. Tallene i L.lager (og L.drivstoff for diesel) er
 * fortsatt fasiten som resten av spillet leser og skriver: avstem() legger til eller tar bort enheter så SUMMEN AV ENHETENE ALLTID ER
 * LIK TALLET. Leir.leggInn/uttak/kjøp/salg melder fra med en gang (Leir.varer, satt av koble()), og visningen avstemmer også hvert
 * sekund (for moduler som skriver L.lager direkte).
 *
 *  - Kapasiteten følger leir.js: hvert lagerbygg tar effekt(b).lager av HVER vare (som lagerplassen i dag), egne rom
 *    Leir.lagerplass.ekstra, tankene sin diesel. Ute er det ingen grense (det som ikke får plass inne, ligger ute).
 *  - SONER: et lagerbygg kan merkes for én vare («bare planker»); da legges bare den der. Ellers tar det alt.
 *  - Nye enheter legges der det er best: bygg merket for varen, så andre lagerbygg, så egne rom, så tanken (diesel), så ute.
 *    Det som tas ut, tas UTE FØRST (det som ligger inne er best tatt vare på), reserverte enheter sist.
 *  - RYDDING: rydd() flytter enheter fra ute (eller fra et bygg med feil sone) inn der det er plass – REGLER.ryddPerTime enheter i
 *    timen (folkene bærer dem; bærerne som egne figurer er F3 senere).
 *  - RESERVERING (for bærerne i F3): reserver(V, id, hvem) / slipp / hent (enheten bæres: teller fortsatt i summen) / lever (legges på
 *    en ny plass) / bruk (tas ut av lageret). En enhet kan bare reserveres av én. Forsvinner den (stjålet, brent, brukt opp), får den
 *    som skulle hente den, beskjed (V.beskjeder, beskjeder(V, hvem)), og finnNy() gir en annen enhet av samme vare.
 *  - UTE OG INNE: det som ligger ute, slites i regn (slitasje(): planker, flis, ved, betong, litt tømmer og stål), og RØVERE kan bare
 *    stjele det som ligger ute (ute() gir mengdene; visningen gir dem til Trussel.bytte). En BRANN i et lagerbygg eller på lagerplassen
 *    tar det som kan brenne der (brann()).
 *  - GAMLE SPILL: uten lagrede enheter fordeler avstem() det som står i L.lager på plassene første gang (omgjøringen).
 *
 * Tilstanden V = { versjon, neste, e: [enhet], soner: { byggId: vare }, ute: { x, y } | null, beskjeder: [], tapt: { grunn: { vare: m } } }
 * Enhet u = { id, v: vare, m: mengde, p: plass-id ('ute' | 'rom' | 'b<id>' | 'bæres'), i: rute på plassen, r: reservert av | null }
 */
(function (rot) {
  'use strict';
  // Alle tallene er Claudes forslag (28. nov).
  const REGLER = {
    // hvor stor én enhet er (i varens eget mål: m³, t eller liter), formen i kartet og navnet
    enhet: {
      tre: { str: 2, form: 'pall', navn: 'pall planker', flertall: 'paller planker' },
      betong: { str: 1, form: 'sekk', navn: 'pall sementsekker', flertall: 'paller sementsekker' },
      stål: { str: 1, form: 'bunt', navn: 'bunt stål', flertall: 'bunter stål' },
      tømmer: { str: 2, form: 'haug', navn: 'tømmerhaug', flertall: 'tømmerhauger' },
      flis: { str: 2, form: 'storsekk', navn: 'storsekk flis', flertall: 'storsekker flis' },
      ved: { str: 2, form: 'vedpall', navn: 'pall ved', flertall: 'paller ved' },
      diesel: { str: 200, form: 'fat', navn: 'fat diesel', flertall: 'fat diesel' },
    },
    // kasser på hylleplass (ammunisjon, deler) – formen finnes for senere (F3/B5); leiren har ingen slike varer i L.lager ennå
    hylle: { str: 1, form: 'kasse' },
    // slitasje ute: andel av mengden som går tapt per spilltime i fullt regn (regn 0–1); under regnFra ingenting
    slitasje: { tre: .004, tømmer: .001, flis: .006, ved: .005, betong: .003, stål: .0005 },
    regnFra: .15,
    // det som brenner (stål og betong tåler brannen)
    brenner: { tre: true, tømmer: true, flis: true, ved: true, diesel: true },
    // så mange enheter bærer folkene inn i timen (fra ute / feil sone til ledig plass inne)
    ryddPerTime: 12,
    // lagerplassen ute: avstand fra leirens midte; hver vare har sin blokk (rad etter rad nedover), dx/dy = avstand mellom enhetene,
    // rader = rader i blokken, h = blokkens høyde; er blokken full, fortsetter varen i en ny blokk til høyre (bredde + 1 m)
    ute: { avstand: 24, bredde: 18, blokk: {
      tre: { dx: 1.6, dy: 1.45, rader: 3, h: 4.8 }, betong: { dx: 1.6, dy: 1.45, rader: 3, h: 4.8 }, stål: { dx: 1.8, dy: 1.1, rader: 4, h: 4.8 },
      tømmer: { dx: 1.9, dy: 4.6, rader: 1, h: 5.2, ret: Math.PI / 2 }, flis: { dx: 1.5, dy: 1.45, rader: 3, h: 4.8 }, ved: { dx: 1.6, dy: 1.45, rader: 3, h: 4.8 },
      diesel: { dx: .85, dy: .85, rader: 2, h: 2.4 } } },
    // rutene inne i et bygg (m) og kanten innenfor veggene
    rute: 1.6, kant: .7,
    // så små rester regnes som ingenting
    eps: 1e-6,
  };
  const VARER = ['tre', 'betong', 'stål', 'tømmer', 'flis', 'ved', 'diesel'];
  const ny = () => ({ versjon: 1, neste: 1, e: [], soner: {}, ute: null, beskjeder: [], tapt: {} });
  const r6 = v => Math.round(v * 1e6) / 1e6;
  const total = (L, k) => (k === 'diesel' ? +(L.drivstoff || 0) : +((L.lager && L.lager[k]) || 0)) || 0;
  const settTotal = (L, k, v) => { v = Math.max(0, r6(v)); if (k === 'diesel') L.drivstoff = v; else L.lager[k] = v; };
  const sum = (V, k, f) => V.e.reduce((s, u) => s + (u.v === k && (!f || f(u)) ? u.m : 0), 0);

  // ---------- plassene ----------
  // Leir = leir.js-reglene (effekt, lagerplass, BYGG, DRIVSTOFF, ferdig). Gir [{ id, inne, tank, bygg, sone, cap(k), tar(k) }]
  function plasser(Leir, L, V) {
    const ut = [];
    for (const b of L.bygg || []) {
      const B = Leir.BYGG[b.type]; if (!B) continue;
      const e = Leir.effekt(b), lager = e.lager || 0;
      if (lager > 0) { const sone = V.soner[b.id] || null;
        ut.push({ id: 'b' + b.id, inne: true, bygg: b, sone, cap: k => (k === 'diesel' ? 0 : lager), tar: k => k !== 'diesel' && (!sone || sone === k) }); continue; }
      const ferdig = Leir.ferdig ? Leir.ferdig(b) : b.igjen <= 0;
      const liter = !ferdig ? 0 : b.type === 'drivstofftank' ? B.nivå.liter[(b.nivå || 1) - 1] : (b.type === 'aggregat' || (B.diesel && B.kw > 0)) ? (Leir.DRIVSTOFF.iAggregat || 0) : 0;
      if (liter > 0) ut.push({ id: 'b' + b.id, inne: false, tank: true, bygg: b, sone: null, cap: k => (k === 'diesel' ? liter : 0), tar: k => k === 'diesel' });
    }
    const ekstra = Leir.lagerplass && Leir.lagerplass.ekstra ? +Leir.lagerplass.ekstra(L) || 0 : 0;
    if (ekstra > 0) ut.push({ id: 'rom', inne: true, sone: null, cap: k => (k === 'diesel' ? 0 : ekstra), tar: k => k !== 'diesel' });
    ut.push({ id: 'ute', inne: false, sone: null, cap: () => Infinity, tar: () => true });
    return ut;
  }
  // rekkefølgen nye enheter legges i: merket for varen, andre lagerbygg, egne rom, tanken, ute
  const rang = (P, k) => (P.id === 'ute' ? 9 : P.tank ? 3 : P.id === 'rom' ? 2 : P.sone === k ? 0 : 1);
  const bestePlasser = (Ps, k) => Ps.filter(P => P.tar(k) && P.cap(k) > 0).sort((a, b) => rang(a, k) - rang(b, k) || (a.bygg && b.bygg ? a.bygg.id - b.bygg.id : 0));
  // rekkefølgen enheter tas ut i: ute først, så tanken, rom og bygg; reserverte og de som bæres sist; den minste først
  const uttaksRang = (u, Pm) => { const P = Pm.get(u.p); return (u.p === 'bæres' ? 40 : 0) + (u.r ? 20 : 0) + (u.p === 'ute' ? 0 : P && P.tank ? 1 : u.p === 'rom' ? 2 : 3); };
  // første ledige rute på en plass (ute: per vare, så hver vare får sine rader)
  function ledigRute(V, p, k) { const brukt = new Set(V.e.filter(u => u.p === p && (p !== 'ute' || u.v === k)).map(u => u.i)); let i = 0; while (brukt.has(i)) i++; return i; }

  // ---------- beskjeder og tap ----------
  function meld(V, u, grunn) { if (u.r) V.beskjeder.push({ hvem: u.r, id: u.id, vare: u.v, grunn }); if (V.beskjeder.length > 50) V.beskjeder.splice(0, V.beskjeder.length - 50); }
  function noterTap(V, grunn, k, m) { if (!(m > 0) || !grunn) return; const t = V.tapt[grunn] || (V.tapt[grunn] = {}); t[k] = r6((t[k] || 0) + m); }
  // tar mengde av varen k ut av enhetene (ikke av L.lager). filter: hvilke enheter som kan tas. Gir det som ble tatt.
  function taFraEnheter(V, Pm, k, mengde, grunn, filter) {
    let igjen = mengde; const kand = V.e.filter(u => u.v === k && (!filter || filter(u))).sort((a, b) => uttaksRang(a, Pm) - uttaksRang(b, Pm) || a.m - b.m || b.id - a.id);
    for (const u of kand) { if (igjen <= REGLER.eps) break; const t = Math.min(u.m, igjen); u.m = r6(u.m - t); igjen -= t;
      if (u.m <= REGLER.eps) { meld(V, u, grunn); u.m = 0; } }
    V.e = V.e.filter(u => u.m > REGLER.eps); const tatt = r6(mengde - Math.max(0, igjen)); noterTap(V, grunn === 'brukt' || grunn === 'solgt' ? null : grunn, k, tatt); return tatt;
  }
  // legger mengde av varen k i enheter på de beste plassene (fyller først halve enheter)
  function leggTilEnheter(V, Ps, k, mengde) {
    const str = REGLER.enhet[k].str; let igjen = mengde;
    for (const P of bestePlasser(Ps, k)) { if (igjen <= REGLER.eps) break;
      let ledig = P.cap(k) - sum(V, k, u => u.p === P.id);
      for (const u of V.e) { if (igjen <= REGLER.eps || ledig <= REGLER.eps) break; if (u.v !== k || u.p !== P.id || u.m >= str - REGLER.eps) continue;
        const t = Math.min(str - u.m, igjen, ledig); u.m = r6(u.m + t); igjen -= t; ledig -= t; }
      while (igjen > REGLER.eps && ledig > REGLER.eps) { const t = Math.min(str, igjen, ledig);
        V.e.push({ id: V.neste++, v: k, m: r6(t), p: P.id, i: ledigRute(V, P.id, k), r: null }); igjen -= t; ledig -= t; } }
    return r6(mengde - Math.max(0, igjen));
  }

  // ---------- avstemming: enhetene = tallene ----------
  // Gir { lagt: { vare: m }, tatt: { vare: m }, flyttet } – det som ble endret. o.grunn = hvorfor noe ble tatt (brukt, solgt, stjålet …),
  // o.vare = bare én vare.
  function avstem(Leir, L, V, o = {}) {
    if (!L || !V) return null; if (!L.lager) L.lager = {};
    const Ps = plasser(Leir, L, V), Pm = new Map(Ps.map(P => [P.id, P])), ut = { lagt: {}, tatt: {}, flyttet: 0 };
    for (const k of (o.vare && VARER.includes(o.vare) ? [o.vare] : VARER)) {
      // enheter på en plass som er borte (bygget revet, ødelagt, flyttes) eller ikke tar varen lenger: ut på lagerplassen
      for (const u of V.e) { if (u.v !== k || u.p === 'ute' || u.p === 'bæres') continue; const P = Pm.get(u.p);
        if (!P || !P.tar(k)) { u.p = 'ute'; u.i = ledigRute(V, 'ute', k); ut.flyttet++; } }
      // mer på en plass enn den tar (bygget er hardt skadet): det siste ut
      for (const P of Ps) { if (P.id === 'ute') continue; let over = sum(V, k, u => u.p === P.id) - P.cap(k); if (over <= REGLER.eps) continue;
        for (const u of V.e.filter(q => q.v === k && q.p === P.id).sort((a, b) => b.i - a.i)) { if (over <= REGLER.eps) break; u.p = 'ute'; u.i = ledigRute(V, 'ute', k); over -= u.m; ut.flyttet++; } }
      const d = total(L, k) - sum(V, k);
      if (d > REGLER.eps) ut.lagt[k] = leggTilEnheter(V, Ps, k, d);
      else if (d < -REGLER.eps) ut.tatt[k] = taFraEnheter(V, Pm, k, -d, o.grunn || 'brukt');
    }
    return ut;
  }
  // stemmer enhetene med tallene? (for testene og vakta) Gir [{ vare, enheter, tall }] for det som ikke stemmer
  function avvik(L, V) { const ut = []; for (const k of VARER) { const a = r6(sum(V, k)), b = r6(total(L, k)); if (Math.abs(a - b) > 1e-4) ut.push({ vare: k, enheter: a, tall: b }); } return ut; }

  // ---------- rydding: folkene bærer inn ----------
  // flytter høyst n enheter (ikke reserverte) fra ute eller fra et bygg med feil sone inn der det er plass. Gir antallet flyttet.
  function rydd(Leir, L, V, n) {
    const Ps = plasser(Leir, L, V), Pm = new Map(Ps.map(P => [P.id, P])); let flyttet = 0;
    const kand = V.e.filter(u => !u.r && u.p !== 'bæres' && (u.p === 'ute' || (Pm.get(u.p) && Pm.get(u.p).sone && Pm.get(u.p).sone !== u.v)));
    for (const u of kand) { if (flyttet >= n) break; const nå = Pm.get(u.p);
      const P = bestePlasser(Ps, u.v).find(P => P.id !== u.p && P.id !== 'ute' && rang(P, u.v) < (nå ? rang(nå, u.v) : 9) && P.cap(u.v) - sum(V, u.v, q => q.p === P.id) >= u.m - REGLER.eps);
      if (!P) continue; u.p = P.id; u.i = ledigRute(V, P.id, u.v); flyttet++; }
    return flyttet;
  }

  // ---------- reservering og henting (API-et bærerne i F3 bruker) ----------
  const finn = (V, id) => V.e.find(u => u.id === id) || null;
  // reserverer enheten for hvem. Gir { ok } eller { feil }
  function reserver(V, id, hvem) { const u = finn(V, id); if (!u) return { feil: 'Enheten finnes ikke lenger.' }; if (hvem == null || hvem === '') return { feil: 'Hvem henter?' };
    if (u.r && u.r !== hvem) return { feil: 'Enheten er alt reservert.' }; u.r = String(hvem); return { ok: true, enhet: u }; }
  function slipp(V, id, hvem) { const u = finn(V, id); if (!u || (u.r && hvem != null && u.r !== String(hvem))) return false; u.r = null; return true; }
  // henter enheten: den bæres (teller fortsatt i lageret). Bare den som har reservert den (eller ingen har det).
  function hent(V, id, hvem) { const u = finn(V, id); if (!u) return { feil: 'Enheten er borte.', borte: true };
    if (u.r && u.r !== String(hvem)) return { feil: 'Enheten er reservert av en annen.' }; if (u.p === 'bæres') return { feil: 'Enheten bæres alt.' };
    u.r = String(hvem); u.fra = u.p; u.p = 'bæres'; u.i = 0; return { ok: true, enhet: u }; }
  // legger en enhet som bæres, på en plass (plass-id). Er plassen full eller tar ikke varen: ute.
  function lever(Leir, L, V, id, plass) { const u = finn(V, id); if (!u || u.p !== 'bæres') return { feil: 'Enheten bæres ikke.' };
    const P = plasser(Leir, L, V).find(q => q.id === plass); const ok = P && P.tar(u.v) && P.cap(u.v) - sum(V, u.v, q => q.p === P.id) >= u.m - REGLER.eps;
    u.p = ok ? P.id : 'ute'; u.i = ledigRute(V, u.p, u.v); u.r = null; delete u.fra; return { ok: true, plass: u.p }; }
  // bruker enheten (eller en del av den): tas ut av lageret. Gir mengden som ble brukt.
  function bruk(L, V, id, mengde, grunn) { const u = finn(V, id); if (!u) return 0; const m = Math.min(u.m, mengde == null ? u.m : mengde); if (!(m > 0)) return 0;
    u.m = r6(u.m - m); settTotal(L, u.v, total(L, u.v) - m); if (u.m <= REGLER.eps) V.e = V.e.filter(q => q !== u); noterTap(V, grunn === 'brukt' || !grunn ? null : grunn, u.v, m); return m; }
  // beskjedene til hvem (og tar dem bort fra lista)
  function beskjeder(V, hvem) { const ut = V.beskjeder.filter(b => b.hvem === String(hvem)); V.beskjeder = V.beskjeder.filter(b => b.hvem !== String(hvem)); return ut; }
  // en annen ledig enhet av samme vare (nærmest punktet hvis pos-funksjonen gis)
  function finnNy(V, vare, hvem, pos, x, y) { const kand = V.e.filter(u => u.v === vare && !u.r && u.p !== 'bæres'); if (!kand.length) return null;
    if (!pos) return kand[0]; let best = null, bd = Infinity; for (const u of kand) { const q = pos(u); if (!q) continue; const d = Math.hypot(q.x - x, q.y - y); if (d < bd) { bd = d; best = u; } } return best || kand[0]; }

  // ---------- ute og inne, vær, tyveri og brann ----------
  // er enheten under tak? (ute på lagerplassen og ved tanken er ute)
  function inne(Leir, L, V, u, Pm) { if (u.p === 'ute' || u.p === 'bæres') return false; const P = (Pm || new Map(plasser(Leir, L, V).map(q => [q.id, q]))).get(u.p); return !!(P && P.inne); }
  // mengdene som ligger ute (det røverne kan ta) – { vare: m }; diesel er med (fatene står ute ved tanken)
  function ute(Leir, L, V) { const Pm = new Map(plasser(Leir, L, V).map(q => [q.id, q])), ut = {}; for (const u of V.e) if (!inne(Leir, L, V, u, Pm)) ut[u.v] = r6((ut[u.v] || 0) + u.m); return ut; }
  // tar det røverne stjal (mengder per vare, tatt fra det som ligger ute) ut av enhetene. trekk: også av L.lager (ellers gjør kalleren det).
  function stjel(Leir, L, V, mengder, trekk) { const Pm = new Map(plasser(Leir, L, V).map(q => [q.id, q])), ut = {};
    for (const [k, m] of Object.entries(mengder || {})) { if (!VARER.includes(k) || !(m > 0)) continue;
      const t = taFraEnheter(V, Pm, k, m, 'stjålet', u => !inne(Leir, L, V, u, Pm)); if (t > 0) { ut[k] = t; if (trekk) settTotal(L, k, total(L, k) - t); } }
    return ut; }
  // regn sliter det som ligger ute: regn 0–1, dt i spillminutter. Gir { vare: m } som gikk tapt (også trukket fra L.lager).
  function slitasje(Leir, L, V, regn, dt) { const ut = {}; if (!(regn > REGLER.regnFra) || !(dt > 0)) return ut; const Pm = new Map(plasser(Leir, L, V).map(q => [q.id, q]));
    for (const u of V.e) { const f = REGLER.slitasje[u.v]; if (!f || inne(Leir, L, V, u, Pm)) continue; const t = Math.min(u.m, u.m * f * regn * dt / 60); if (!(t > 0)) continue;
      u.m = r6(u.m - t); settTotal(L, u.v, total(L, u.v) - t); ut[u.v] = (ut[u.v] || 0) + t; if (u.m <= REGLER.eps) meld(V, u, 'slitt'); }
    V.e = V.e.filter(u => u.m > REGLER.eps); for (const [k, m] of Object.entries(ut)) noterTap(V, 'slitt', k, m); return ut; }
  // brann: brenner(x, y) sier om det brenner der, pos(u) gir enhetens plass i kartet. Det som kan brenne, går tapt (også av L.lager).
  // Gir { vare: m } og per plass { plass-id: { vare: m } }
  function brann(Leir, L, V, brenner, pos) { const ut = {}, per = {};
    for (const u of V.e) { if (!REGLER.brenner[u.v] || u.p === 'bæres') continue; const q = pos(u); if (!q || !brenner(q.x, q.y)) continue;
      settTotal(L, u.v, total(L, u.v) - u.m); ut[u.v] = r6((ut[u.v] || 0) + u.m); const p = per[u.p] || (per[u.p] = {}); p[u.v] = r6((p[u.v] || 0) + u.m); meld(V, u, 'brent'); noterTap(V, 'brent', u.v, u.m); u.m = 0; }
    V.e = V.e.filter(u => u.m > REGLER.eps); return { tapt: ut, per }; }

  // ---------- sone og plass i kartet ----------
  function settSone(Leir, L, V, byggId, vare) { const b = (L.bygg || []).find(q => q.id === byggId); if (!b) return { feil: 'Fant ikke bygget.' };
    if (!(Leir.effekt(b).lager > 0) && !(Leir.BYGG[b.type].nivå && Leir.BYGG[b.type].nivå.lager)) return { feil: 'Bygget er ikke et lager.' };
    if (vare && (!REGLER.enhet[vare] || vare === 'diesel')) return { feil: 'Ukjent vare.' };
    if (vare) V.soner[byggId] = vare; else delete V.soner[byggId]; return { ok: true }; }
  // rutens midte i kartet for en enhet. leir = { x, y } (leirens midte). Gir { x, y, ret, inne, plass } eller null (bæres)
  function punkt(Leir, L, V, u, leir) {
    if (u.p === 'bæres') return null;
    const U = REGLER.ute, uteP = V.ute || (leir ? { x: leir.x + U.avstand * .7, y: leir.y - U.avstand * .7 } : null);
    // egne rom fra byggesettet: plassen i rommet er ukjent her – tegnes ikke
    if (u.p === 'rom') return null;
    if (u.p === 'ute') { if (!uteP) return null; const Bl = U.blokk[u.v], perRad = Math.max(1, Math.floor(U.bredde / Bl.dx)), perBlokk = perRad * Bl.rader;
      let y = 0; for (const k of VARER) { if (k === u.v) break; y += U.blokk[k].h; }
      const j = u.i % perBlokk, kol = Math.floor(u.i / perBlokk);
      return { x: uteP.x + kol * (U.bredde + 1) + (j % perRad + .5) * Bl.dx, y: uteP.y - y - (Math.floor(j / perRad) + .5) * Bl.dy, ret: Bl.ret || 0, inne: false, plass: 'ute' }; }
    const id = +u.p.slice(1), b = (L.bygg || []).find(q => q.id === id); if (!b) return null; const B = Leir.BYGG[b.type]; if (!B || !B.fot) return { x: b.x, y: b.y, ret: b.ret || 0 };
    const [x0, x1, y0, y1] = B.fot, k = REGLER.kant, c = REGLER.rute, nx = Math.max(1, Math.floor((x1 - x0 - 2 * k) / c)), ny = Math.max(1, Math.floor((y1 - y0 - 2 * k) / c));
    const j = u.i % (nx * ny), lx = x0 + k + (j % nx + .5) * ((x1 - x0 - 2 * k) / nx), ly = y0 + k + (Math.floor(j / nx) + .5) * ((y1 - y0 - 2 * k) / ny);
    const cs = Math.cos(b.ret || 0), sn = Math.sin(b.ret || 0); return { x: b.x + lx * cs - ly * sn, y: b.y + lx * sn + ly * cs, ret: b.ret || 0, inne: true, plass: u.p, lag: Math.floor(u.i / (nx * ny)) };
  }

  // ---------- oversikt ----------
  // per plass: { id, navn-del, inne, sone, varer: { vare: { m, n } } }
  function oversikt(Leir, L, V) { const Ps = plasser(Leir, L, V), ut = Ps.map(P => ({ id: P.id, inne: P.inne, tank: !!P.tank, bygg: P.bygg || null, sone: P.sone, varer: {} }));
    const Om = new Map(ut.map(o => [o.id, o])); for (const u of V.e) { const o = Om.get(u.p); if (!o) continue; const w = o.varer[u.v] || (o.varer[u.v] = { m: 0, n: 0, r: 0 }); w.m = r6(w.m + u.m); w.n++; if (u.r) w.r++; } return ut; }
  const antallTekst = (k, n) => `${n} ${n === 1 ? REGLER.enhet[k].navn : REGLER.enhet[k].flertall}`;

  // ---------- lagring ----------
  function tilJSON(V) { return { versjon: 1, neste: V.neste, e: V.e.map(u => [u.id, u.v, u.m, u.p, u.i, u.r || 0, u.fra || 0]), soner: V.soner, ute: V.ute, tapt: V.tapt }; }
  function fraJSON(d) { const V = ny(); if (!d || typeof d !== 'object') return V; V.neste = Number.isInteger(d.neste) && d.neste > 0 ? d.neste : 1;
    if (Array.isArray(d.e)) for (const a of d.e) { if (!Array.isArray(a) || !VARER.includes(a[1]) || !(+a[2] > 0)) continue;
      const u = { id: +a[0] || V.neste, v: a[1], m: +a[2], p: typeof a[3] === 'string' ? a[3] : 'ute', i: Number.isInteger(a[4]) ? a[4] : 0, r: a[5] ? String(a[5]) : null };
      if (a[6]) u.fra = String(a[6]); V.e.push(u); V.neste = Math.max(V.neste, u.id + 1); }
    if (d.soner && typeof d.soner === 'object') for (const [k, v] of Object.entries(d.soner)) if (REGLER.enhet[v] && v !== 'diesel') V.soner[+k] = v;
    if (d.ute && Number.isFinite(d.ute.x) && Number.isFinite(d.ute.y)) V.ute = { x: d.ute.x, y: d.ute.y };
    if (d.tapt && typeof d.tapt === 'object') V.tapt = d.tapt; return V; }

  // kobler varelageret til leir.js: hver endring via Leir.leggInn/uttak/kjøp/salg/trekk avstemmes straks. hentV(L) gir V for leiren.
  function koble(Leir, hentV) { Leir.varer = (L, vare, grunn) => { const V = hentV(L); if (V) avstem(Leir, L, V, { vare, grunn }); }; }

  const api = { REGLER, VARER, ny, plasser, avstem, avvik, rydd, reserver, slipp, hent, lever, bruk, beskjeder, finnNy, finn, inne, ute, stjel, slitasje, brann,
    settSone, punkt, oversikt, antallTekst, sum, total, tilJSON, fraJSON, koble };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Varelager = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
