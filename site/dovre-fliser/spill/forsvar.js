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
  const api = { R, retning, beredskap, stillinger, fordel, ankomst, vaktStørrelse, rapport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Forsvar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
