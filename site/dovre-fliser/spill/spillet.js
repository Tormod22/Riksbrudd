/* Riksbrudd – REGLENE for det som gir spillet press og mål (16. nov, brukeren: «lag alle 7»): angrep på leiren (Trussel), marked
 * med priser som flytter seg (Marked), oppdrag (Oppdrag), kamp når du går selv (Kamp), hendelser i gjengen (Hendelser) og deling av
 * leiren med venner (Deling). Uten DOM; testes i pipeline/fliser/test_spillet.js. Visningene ligger i egne filer (…-visning.js).
 * Alle tall er Claudes forslag. Tid i spillminutter (1440 per døgn).
 */
(function (rot) {
  'use strict';
  const klem = (v, a, b) => Math.max(a, Math.min(b, v));
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = (dx, dy) => RETN[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];

  // ---------- TRUSSEL: røvere angriper leiren i bølger som vokser ----------
  const Trussel = {
    // antall lag i bølge nr (1, 1, 2, 2, 3 … høyst 6)
    lag: nr => klem(1 + Math.floor((nr - 1) / 2), 1, 6),
    // ventetiden til neste bølge: spillminutter og ekte minutter med spilling (det som kommer først, gjelder)
    vent: nr => ({ spill: klem(20 - nr, 10, 20) * 60, ekte: klem(26 - nr * 2, 12, 26) }),
    // hvor de kommer fra: 1,4–2,2 km unna i en tilfeldig retning
    start: (leir, r1, r2) => { const v = r1 * 6.2832, d = 1400 + r2 * 800; return { x: leir.x + Math.cos(v) * d, y: leir.y + Math.sin(v) * d, retning: retning(Math.cos(v), Math.sin(v)), meter: d }; },
    belønning: nr => 2e6 + 1e6 * nr,
    varsel: (nr, n, s) => `Varsel: ${n === 1 ? 'et røverlag' : n + ' røverlag'} er på vei mot leiren fra ${s.retning} (${(s.meter / 1000).toFixed(1).replace('.', ',')} km unna). Bølge ${nr}.`,
  };

  // ---------- MARKED: prisene flytter seg hver dag, og alt blir sakte dyrere ----------
  const VARER = ['tre', 'betong', 'stål', 'diesel', 'mat'];
  const Marked = {
    VARER, SALG: .8,
    ny: () => ({ f: { tre: 1, betong: 1, stål: 1, diesel: 1, mat: 1 }, før: { tre: 1, betong: 1, stål: 1, diesel: 1, mat: 1 }, infl: 1, dag: 0 }),
    // ett døgn: hver vare flytter seg opptil ±12 % og trekkes litt tilbake mot det vanlige; inflasjonen er 0,4 % per døgn
    steg(M, rng) { M.før = { ...M.f }; for (const v of VARER) M.f[v] = klem(M.f[v] * (1 + (rng() - .5) * .24) + (1 - M.f[v]) * .1, .55, 1.8); M.infl = Math.min(3, M.infl * 1.004); M.dag++; return M; },
    pris: (M, vare, grunnpris) => Math.max(100, Math.round(grunnpris * M.f[vare] * M.infl / 100) * 100),
    // endringen siden i går i prosent (med inflasjonen)
    endring: (M, vare) => Math.round((M.f[vare] * 1.004 / M.før[vare] - 1) * 100),
    tekst(M) { const d = VARER.map(v => [v, Marked.endring(M, v)]).filter(q => Math.abs(q[1]) >= 5).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
      return d.length ? 'Markedet: ' + d.map(([v, e]) => `${v} ${e > 0 ? 'opp' : 'ned'} ${Math.abs(e)} %`).join(', ') + '.' : 'Markedet: små endringer i dag.'; },
  };

  // ---------- OPPDRAG ----------
  const OPPDRAG = {
    hent: { navn: 'Hent forsyninger', tekst: 'Et forlatt lager. Kom deg dit – selv eller med et lag – og ta med det som ligger der.', avst: [700, 2600] },
    redd: { navn: 'Redd overlevende', tekst: 'Noen har sendt nødsignal. Hent dem. Med bil eller helikopter får du med flere.', avst: [900, 3200] },
    post: { navn: 'Ta en røverpost', tekst: 'Røvere har slått seg ned. Slå dem ut, så er området tryggere – og kassa deres er din.', avst: [1500, 3600] },
  };
  const Oppdrag = {
    TYPER: OPPDRAG,
    // et nytt oppdrag: type etter rekkefølgen, sted i en ring rundt leiren, belønning etter avstand
    lag(leir, nr, rng, tid) { const type = ['hent', 'redd', 'post'][Math.floor(rng() * 3)], T = OPPDRAG[type], v = rng() * 6.2832, d = T.avst[0] + rng() * (T.avst[1] - T.avst[0]);
      const o = { id: nr, type, x: Math.round(leir.x + Math.cos(v) * d), y: Math.round(leir.y + Math.sin(v) * d), meter: Math.round(d), retning: retning(Math.cos(v), Math.sin(v)), frist: tid + 3 * 1440, tatt: false };
      if (type === 'hent') o.gir = { penger: Math.round((4e5 + d * 300) / 1e5) * 1e5, mat: 4 + Math.floor(rng() * 8), tre: Math.floor(rng() * 6), stål: Math.round(rng() * 20) / 10 };
      if (type === 'redd') o.gir = { folk: 1 + Math.floor(rng() * 3), penger: 3e5 };
      if (type === 'post') { o.fiender = 1 + (rng() < .35 ? 1 : 0); o.gir = { penger: Math.round((1.5e6 + d * 500) * o.fiender / 1e5) * 1e5 }; }
      return o; },
    // framme: et av punktene (lag, deg selv) er innen 60 m
    framme: (o, punkter) => punkter.some(p => Math.hypot(p.x - o.x, p.y - o.y) <= 60),
    // hvor mange du får med fra et redningsoppdrag: 1 til fots eller med et lag, ellers så mange kjøretøyet har plass til
    medFolk: (o, plasser) => Math.min(o.gir.folk, Math.max(1, plasser || 1)),
    belønning(g) { const d = []; if (g.folk) d.push(g.folk === 1 ? 'én person' : g.folk + ' personer'); if (g.penger) d.push((g.penger / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + ' mill. kr'); if (g.mat) d.push(g.mat + ' rasjoner'); if (g.tre) d.push(g.tre + ' m³ tre'); if (g.stål) d.push(String(g.stål).replace('.', ',') + ' t stål'); return d.join(', '); },
    utløpt: (o, tid) => tid > o.frist,
  };

  // ---------- KAMP når du går selv ----------
  const Kamp = {
    VÅPEN: { magasin: 30, reserve: 120, takt: .14, lade: 2.2, rekkevidde: 350, skade: .6 },
    HELSE: { maks: 100, hvile: .35, fiendeRekkevidde: 220, skadePerMann: .35 },
    // treffer du? siktet må peke innen «bredden» av målet (3 m), og sjansen faller med avstanden
    sikter: (avst, vinkelFeil) => avst <= 350 && Math.abs(vinkelFeil) <= Math.atan2(3, Math.max(1, avst)) + .012,
    sjanse: avst => klem(1.1 - avst / 350, .15, .95),
    // skaden du tar per sekund fra fiender: [{ avst, menn }], mindre i kjøretøy og inne i hus
    skade(fiender, dekning) { let s = 0; for (const f of fiender) if (f.avst < Kamp.HELSE.fiendeRekkevidde) s += f.menn * Kamp.HELSE.skadePerMann * (1 - f.avst / Kamp.HELSE.fiendeRekkevidde); return s * (dekning === 'tilflukt' ? .08 : dekning === 'hus' ? .3 : dekning === 'kjøretøy' ? .45 : 1); },
  };

  // ---------- HENDELSER i gjengen: små valg som betyr noe ----------
  const HENDELSER = [
    { id: 'syk', tekst: n => `${n} har fått høy feber og hoster stygt.`, valg: [{ t: 'Gi medisiner (300 000 kr)', v: { penger: -3e5, moral: 3 } }, { t: 'La det gå over av seg selv', v: { helse: -.35, moral: -3 } }] },
    { id: 'krangel', tekst: n => `${n} og en annen har røket i tottene på hverandre om arbeidsfordelingen.`, valg: [{ t: 'Gi alle en fridag (mister et dagsverk)', v: { moral: 6, hvile: 1 } }, { t: 'Be dem skjerpe seg', v: { moral: -4 } }] },
    { id: 'vilDra', tekst: n => `${n} snakker om å dra sin vei.`, valg: [{ t: 'Betal en bonus (500 000 kr)', v: { penger: -5e5, moral: 2 } }, { t: 'La vedkommende gå', v: { folk: -1, moral: -2 } }], krav: f => f.folk > 4 },
    { id: 'vandrer', tekst: () => 'En sliten vandrer står ved porten og ber om å få bli.', valg: [{ t: 'Ta imot (trenger en ledig seng)', v: { folk: 1, moral: 2 } }, { t: 'Gi mat og send videre', v: { mat: -3, moral: 1 } }] },
    { id: 'funn', tekst: n => `${n} fant en nedgravd kasse bak leiren.`, valg: [{ t: 'Del med alle', v: { moral: 6 } }, { t: 'Legg det i kassa', v: { penger: 8e5, moral: -2 } }] },
    { id: 'tyveri', tekst: () => 'Noen har forsynt seg av matlageret i natt.', valg: [{ t: 'Sett ut nattevakt (folk blir slitne)', v: { moral: -2, mat: -2 } }, { t: 'La det passere', v: { mat: -6 } }], krav: f => f.mat > 8 },
    { id: 'fest', tekst: () => 'Folk vil feire at leiren står. Det koster litt mat.', valg: [{ t: 'Ja, la dem feire', v: { mat: -8, moral: 10 } }, { t: 'Ikke nå', v: { moral: -3 } }], krav: f => f.mat > 12 },
    { id: 'handel', tekst: () => 'En omreisende handelsmann tilbyr 20 rasjoner til god pris.', valg: [{ t: 'Kjøp (30 000 kr)', v: { penger: -3e4, mat: 20 } }, { t: 'Nei takk', v: {} }] },
  ];
  const Hendelser = {
    LISTE: HENDELSER,
    // velg en hendelse som passer nå (f: { folk, mat, penger }), aldri den samme to ganger på rad
    velg(rng, f, sist) { const mulige = HENDELSER.filter(h => h.id !== sist && (!h.krav || h.krav(f))); return mulige[Math.floor(rng() * mulige.length)] || null; },
    // kan valget tas? (penger og mat må finnes)
    kan: (v, f) => !(v.penger < 0 && f.penger < -v.penger) && !(v.mat < 0 && f.mat < -v.mat),
  };

  // ---------- DELING: leiren som en kort kode i en lenke ----------
  const b64 = { til: s => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    fra: s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); return typeof atob === 'function' ? decodeURIComponent(escape(atob(s))) : Buffer.from(s, 'base64').toString('utf8'); } };
  const Deling = {
    // koden: navn, farge, sted og byggene (type, plass i hele meter fra leiren, retning i grader); høyst 80 bygg
    // (natt 18. nov) stilling = { byer: [tettsted-id …], andel (prosent av folket i området), dag }: det vennen holder i krigen – valgfritt
    kode(navn, farge, leir, bygg, stilling) { const b = bygg.filter(q => q.x !== undefined).slice(0, 80).map(q => [q.type, Math.round(q.x - leir.x), Math.round(q.y - leir.y), Math.round((q.ret || 0) * 57.3)]);
      const d = { v: 1, n: String(navn).slice(0, 40), f: farge, x: Math.round(leir.x), y: Math.round(leir.y), b };
      if (stilling) d.s = { t: (stilling.byer || []).slice(0, 60).map(String), a: Math.max(0, Math.min(100, Math.round(stilling.andel || 0))), d: Math.max(1, Math.round(stilling.dag || 1)) };
      return b64.til(JSON.stringify(d)); },
    // les en kode: gir { navn, farge, x, y, bygg } eller null når den ikke er gyldig
    les(kode, kjente) { try { const d = JSON.parse(b64.fra(String(kode).trim())); if (!d || d.v !== 1 || typeof d.x !== 'number' || typeof d.y !== 'number' || !Array.isArray(d.b)) return null;
      const bygg = d.b.filter(q => Array.isArray(q) && (!kjente || kjente(q[0])) && q.slice(1).every(t => typeof t === 'number' && Math.abs(t) < 5000)).slice(0, 80).map(q => ({ type: q[0], x: d.x + q[1], y: d.y + q[2], ret: q[3] / 57.3 }));
      const st = d.s && typeof d.s === 'object' && Array.isArray(d.s.t) ? { byer: d.s.t.filter(t => typeof t === 'string' || typeof t === 'number').slice(0, 60).map(String), andel: Math.max(0, Math.min(100, Math.round(+d.s.a || 0))), dag: Math.max(1, Math.round(+d.s.d || 1)) } : null;
      return { navn: String(d.n || 'Venn').slice(0, 40), farge: /^#[0-9a-f]{6}$/i.test(d.f) ? d.f : '#8fc2ef', x: d.x, y: d.y, bygg, stilling: st }; } catch (e) { return null; } },
  };

  const api = { Trussel, Marked, Oppdrag, Kamp, Hendelser, Deling, retning };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else rot.Spillet = api;
})(typeof window !== 'undefined' ? window : globalThis);
