/* Riksbrudd – FORSVAR AV LEIREN: regler uten DOM (Node: require('./forsvar'); nettleser: globalThis.Forsvar).
 * (17. nov, brukeren: «vi trenger et bedre system for kriging og angrep – hvordan skal jeg forsvare leiren fra et angrep på en god måte».)
 * Angrepene fantes, men du fikk bare én linje i loggen, og måtte selv flytte lag for lag. Her er reglene for det som manglet:
 *  BEREDSKAP: hvor godt leiren er forberedt (0–100) mot neste bølge, punkt for punkt, med råd om hva som hjelper mest.
 *  STILLINGER: hvor lagene skal stå når angrepet kommer – bak sandsekkvollene som vender mot fienden, ellers i en bue på den siden.
 *  LEIRVAKTA: folkene du har satt på «vakt», tar opp våpen og blir et eget lag mens angrepet varer.
 *  ANKOMST: hvor lenge det er til fienden er framme. RAPPORT: hva angrepet kostet begge sider.
 * Tallene er Claudes forslag.
 */
(function (rot) {
  'use strict';
  const R = { nær: 400, radius: 75, mellom: 34, sektor: 1.25, fart: 1.3, hent: 3000, vakt: { min: 2, maks: 12 }, vekt: { lag: 35, tårn: 15, sekker: 15, varsling: 15, vakt: 10, ammo: 10 } };
  const RETN = ['øst', 'nordøst', 'nord', 'nordvest', 'vest', 'sørvest', 'sør', 'sørøst'];
  const retning = v => RETN[((Math.round(v / (Math.PI / 4)) % 8) + 8) % 8];
  // Beredskapen. t: { lag (egne lag innen 400 m), tårn (bemannede), sekker, varsling (m), vakter (folk på vakt), ammo (0–1, snitt), bølge (antall lag som ventes) }
  function beredskap(t) { const V = R.vekt, p = [], legg = (id, navn, del, tekst, råd) => p.push({ id, navn, poeng: Math.round(V[id] * Math.max(0, Math.min(1, del))), av: V[id], ok: del >= 1, tekst, råd: del >= 1 ? '' : råd });
    const bølge = Math.max(1, t.bølge || 1);
    legg('lag', 'Lag i leiren', (t.lag || 0) / bølge, `${t.lag || 0} lag mot ${bølge} ventet`, t.lag ? 'Hold like mange lag hjemme som bølgen har.' : 'Ingen lag i leiren: hold minst ett lag hjemme.');
    legg('tårn', 'Bemannet vakttårn', t.tårn ? 1 : 0, t.tårn ? `${t.tårn} tårn med vakt` : 'ingen', 'Bygg et vakttårn og sett noen på «vakt»: lagene ser og treffer bedre nær tårnet.');
    legg('sekker', 'Sandsekkvoller', (t.sekker || 0) / 2, `${t.sekker || 0} voller`, 'Bygg sandsekkvoller på den siden fienden kommer fra: lag bak dem tar bare 60 % av treffene.');
    legg('varsling', 'Varsling', (t.varsling || 0) / 600, t.varsling ? `vaktene ser ${Math.round(t.varsling)} m` : 'ingen vakter', 'Folk på «vakt» (helst med vakttårn) og kameramaster oppdager fienden tidligere.');
    legg('vakt', 'Leirvakt', (t.vakter || 0) / 4, `${t.vakter || 0} på vakt`, 'Sett minst fire på «vakt»: de tar opp våpen som et eget lag når leiren angripes.');
    legg('ammo', 'Ammunisjon', (t.ammo === undefined ? 1 : t.ammo) / .5, `${Math.round((t.ammo === undefined ? 1 : t.ammo) * 100)} %`, 'Lagene mangler ammunisjon: la dem stå ved basen, eller forsyn dem fra en lastebil.');
    const sum = p.reduce((s, q) => s + q.poeng, 0); return { sum, ord: sum >= 80 ? 'godt forberedt' : sum >= 55 ? 'brukbart' : sum >= 30 ? 'svakt' : 'forsvarsløst', punkter: p, råd: p.filter(q => !q.ok).sort((a, b) => (b.av - b.poeng) - (a.av - a.poeng)).map(q => q.råd) }; }
  // Stillingene: n plasser. v = retningen (radianer) fra leiren mot fienden. sekker: [{ x, y }]. Voller som vender mot fienden tas først.
  function stillinger(leir, v, n, sekker = []) { const ut = [], vinkel = p => { let d = Math.atan2(p.y - leir.y, p.x - leir.x) - v; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
    for (const s of sekker.filter(s => vinkel(s) <= R.sektor && Math.hypot(s.x - leir.x, s.y - leir.y) <= 200).sort((a, b) => vinkel(a) - vinkel(b))) { if (ut.length >= n) break;
      // rett bak vollen sett fra fienden (10 m nærmere leiren)
      const a = Math.atan2(s.y - leir.y, s.x - leir.x), d = Math.max(0, Math.hypot(s.x - leir.x, s.y - leir.y) - 8); ut.push({ x: leir.x + Math.cos(a) * d, y: leir.y + Math.sin(a) * d, voll: true }); }
    const igjen = n - ut.length, steg = R.mellom / R.radius; for (let i = 0; i < igjen; i++) { const k = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * steg + (igjen % 2 ? 0 : steg / 2), a = v + k; ut.push({ x: leir.x + Math.cos(a) * R.radius, y: leir.y + Math.sin(a) * R.radius, voll: false }); }
    return ut; }
  // Fordeler lagene på stillingene: plassene tas i rekkefølge (vollene står først), og hver plass får det nærmeste ledige laget.
  function fordel(lag, plasser) { const ledig = lag.slice(), ut = []; for (const p of plasser) { if (!ledig.length) break; let b = 0, bd = Infinity; ledig.forEach((s, i) => { const d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; b = i; } }); ut.push({ lag: ledig.splice(b, 1)[0], plass: p, meter: bd }); } return ut; }
  const ankomst = (meter, fart = R.fart) => Math.max(0, meter / fart / 60);   // minutter
  const vaktStørrelse = vakter => (vakter >= R.vakt.min ? Math.min(R.vakt.maks, vakter) : 0);
  // Rapporten etter angrepet. før/etter: { fiender, egne (friske), bygg (snitt hp · antall) }
  function rapport(t) { const d = []; d.push(t.fienderUte >= t.fiender ? `alle ${t.fiender} røverlag er slått ut` : `${t.fienderUte} av ${t.fiender} røverlag slått ut`);
    d.push(t.falne || t.sårede ? `vi har ${t.falne ? t.falne + ' falne' : ''}${t.falne && t.sårede ? ' og ' : ''}${t.sårede ? t.sårede + ' sårede' : ''}` : 'ingen tap hos oss'); if (t.bygg > 0) d.push(`${t.bygg} bygg ble skadet`);
    return d.join(', ') + '.'; }
  // ---------- (runde 4, 18. nov) MOT RØVERNE I LEIREN og REPARASJON ----------
  // Kjøring 4: røverne sto et døgn inne i leiren og ødela bygg etter bygg mens lagene ble stående i stillingene sine, og byggene ble
  // aldri reparert. Tallene er Claudes forslag:
  //  mot.inne: røvere nærmere leirens midte enn dette er «inne i leiren»; mot.avstand: lagene går hit (meter fra røverne, på sin egen
  //  side); mot.ny: målet må ha flyttet seg så langt før et lag på vei får ny ordre; mot.nær: et lag som står innen avstand + nær, blir stående. rep.under: byggelagene reparerer bygg under denne helsen
  //  av seg selv; rep.reserve: så mye blir alltid igjen i kassa; rep.varsel: bygg under denne helsen teller som skadet i varselet.
  // (kjøring 5: på 50 m sto lagene i skogen uten å se røverne midt i leiren og løsnet ikke et skudd – nå 25 m)
  R.mot = { inne: 150, avstand: 25, ny: 40, nær: 30 };
  R.rep = { under: .95, reserve: 3e5, varsel: .98 };
  // Hvem går mot hvem: hvert lag mot den nærmeste røveren inne i leiren, og stiller seg mot.avstand m fra den på sin egen side.
  // lag: [{ x, y }], røvere: [{ x, y }] (bare de inne i leiren), leir: { x, y }. Gir [{ lag, fi, mål: { x, y } }].
  function motHerjere(lag, røvere, leir) { const ut = []; if (!røvere.length) return ut;
    for (const s of lag) { let fi = null, d = Infinity; for (const e of røvere) { const q = Math.hypot(e.x - s.x, e.y - s.y); if (q < d) { d = q; fi = e; } }
      // står laget oppå røveren (eller i midten), kommer det fra leirens midte
      const fra = d > 1 ? s : leir, a = Math.hypot(fra.x - fi.x, fra.y - fi.y) > 1 ? Math.atan2(fra.y - fi.y, fra.x - fi.x) : 0, r = Math.min(R.mot.avstand, d);
      ut.push({ lag: s, fi, mål: { x: fi.x + Math.cos(a) * r, y: fi.y + Math.sin(a) * r }, meter: d }); }
    return ut; }
  // Hvilke bygg byggelagene reparerer nå: de mest skadde først, så mange som det er ledige byggelag, og bare så langt pengene rekker
  // (reserve igjen). bygg: [{ id, hp, pris, opptatt }]. Gir en liste med id-er.
  function velgReparasjon(bygg, ledige, penger) { const ut = []; let igjen = (penger || 0) - R.rep.reserve;
    for (const b of bygg.filter(q => !q.opptatt && q.hp < R.rep.under && q.hp > 0 && q.pris >= 0).sort((a, c) => a.hp - c.hp)) { if (ut.length >= ledige) break; if (b.pris > igjen) continue; igjen -= b.pris; ut.push(b.id); }
    return ut; }
  // varselet etter et angrep: «3 bygg er skadet» (hp under rep.varsel), og hva det koster å reparere alle
  function skadet(bygg) { const s = bygg.filter(q => q.hp > 0 && q.hp < R.rep.varsel); return { n: s.length, pris: s.reduce((t, q) => t + (q.opptatt ? 0 : q.pris || 0), 0), tekst: s.length === 1 ? 'Ett bygg er skadet' : `${s.length} bygg er skadet` }; }
  const api = { R, retning, beredskap, stillinger, fordel, ankomst, vaktStørrelse, rapport, motHerjere, velgReparasjon, skadet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Forsvar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
