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
    legg('varsling', 'Varsling', (t.varsling || 0) / 600, t.varsling ? `vaktene ser ${Math.round(t.varsling)} m` : 'ingen vakter', 'Sett folk på «vakt» i et vakttårn: tårnet ser røverne 1,5 km unna (vaktene alene 400 m). Kameramaster ser også.');
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
  function rapport(t) { const d = []; d.push(t.fienderUte >= t.fiender ? (t.fiender === 1 ? 'røverlaget er slått ut' : `alle ${t.fiender} røverlag er slått ut`) : `${t.fienderUte} av ${t.fiender} røverlag slått ut`);
    d.push(t.falne || t.sårede ? `vi har ${t.falne ? t.falne + ' falne' : ''}${t.falne && t.sårede ? ' og ' : ''}${t.sårede ? t.sårede + ' sårede' : ''}` : 'ingen tap hos oss'); if (t.bygg > 0) d.push(`${t.bygg} bygg ble skadet`);
    return d.join(', ') + '.'; }
  // ---------- (runde 4, 18. nov) MOT RØVERNE I LEIREN og REPARASJON ----------
  // Kjøring 4: røverne sto et døgn inne i leiren og ødela bygg etter bygg mens lagene ble stående i stillingene sine, og byggene ble
  // aldri reparert. Tallene er Claudes forslag:
  //  mot.inne: røvere nærmere leirens midte enn dette er «inne i leiren»; mot.avstand: lagene går hit (meter fra røverne, på sin egen
  //  side); mot.ny: målet må ha flyttet seg så langt før et lag på vei får ny ordre; mot.nær: et lag som står innen avstand + nær, blir stående; mot.skyter: et lag som
  //  står stille og skyter, blir stående så lenge røveren er innenfor dette. rep.under: byggelagene reparerer bygg under denne helsen
  //  av seg selv; rep.reserve: så mye blir alltid igjen i kassa; rep.varsel: bygg under denne helsen teller som skadet i varselet.
  // (kjøring 5: på 50 m sto lagene i skogen uten å se røverne midt i leiren og løsnet ikke et skudd – nå 25 m)
  R.mot = { inne: 150, avstand: 25, ny: 40, nær: 30, skyter: 120 };
  R.rep = { under: .95, reserve: 3e5, varsel: .98 };
  // HJEM IGJEN (kjøring 6: lagene «trakk seg tilbake» 1,5 km etter stridsreglene sine, ble stående der i døgn, og var ikke hjemme
  // da neste bølge kom). Et lag som trakk seg tilbake av seg selv, går hjem når det har gått «vent» spillminutter, står mer enn «fra» m
  // fra leiren (og innenfor R.hent) og ingen fiende er nærmere enn «fiende» m. Claudes forslag.
  R.hjem = { vent: 30, fra: 400, fiende: 900 };
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
  // ---------- (runde 8, 20. nov natt: to nye kritikere) ÉN KILDE FOR ANGREPET ----------
  // Banneret, varselbrikka og kartet sa hver sitt («ikke sett ennå» mens kartet viste røverne i leiren for 2 min siden, «10,0 km» når de
  // var 720 m unna), og anslaget hoppet 70 → 231 → 15 min på en spilltime. Nå regner forsvar-visning.js ut én status (ForsvarSpill.status)
  // som alle tre bruker, og anslaget glattes (det teller ned, og et nytt rått anslag trekker det bare litt om gangen) og vises som et spenn
  // når ingen ser angriperne. Tallene er Claudes forslag:
  const STATUS = {
    sistSett: 45,      // spillminutter: så gammel en observasjon (kartet, radioen, etterretningen) kan være og fortsatt stå som «sist sett»
    glatt: 25,         // tidskonstant (spillminutter) når anslaget glattes og ingen ser angriperne
    usikker: .3,       // ± denne andelen i spennet («ca. 45–75 min») når ingen ser dem
    nårSomHelst: 5,    // minutter: under dette står «kan være framme når som helst» når ingen ser dem
    timer: 75,         // minutter: over dette står spennet i hele timer («ca. 1–2 timer»)
  };
  // glatt(før, rå, tid, sett): før = { v, t } (minutter igjen, spilltida da), rå = nytt anslag. Teller ned med tida; et nytt rått anslag
  // trekker det med andelen 1 − e^(−dt/glatt). Ser noen angriperne, gjelder det rå anslaget (avstanden er kjent).
  function glatt(før, rå, t, sett, R2 = STATUS) {
    if (rå === null || rå === undefined || !Number.isFinite(rå)) return før ? { v: Math.max(0, før.v - Math.max(0, t - før.t)), t } : null;
    if (!før || sett) return { v: Math.max(0, rå), t };
    const dt = Math.max(0, t - før.t), pred = Math.max(0, før.v - dt), k = 1 - Math.exp(-dt / R2.glatt);
    return { v: Math.max(0, pred + (rå - pred) * k), t };
  }
  // spenn(min): teksten for et usikkert anslag – null under nårSomHelst («kan være framme når som helst»), ellers «ca. 45–75 min» / «ca. 1–2 timer»
  function spenn(min, R2 = STATUS) { if (min === null || min === undefined || !Number.isFinite(min) || min <= R2.nårSomHelst) return null;
    const lo = min * (1 - R2.usikker), hi = min * (1 + R2.usikker);
    if (min >= R2.timer) { const a = Math.max(1, Math.floor(lo / 60)), b = Math.max(a + 1, Math.ceil(hi / 60)); return `ca. ${a}–${b} timer`; }
    const a = Math.max(5, Math.round(lo / 5) * 5), b = Math.max(a + 5, Math.round(hi / 5) * 5); return `ca. ${a}–${b} min`; }
  // ---------- (runde 8) RAPPORTEN ETTER HVER BØLGE OG HVERT ANGREP PÅ LEIREN ----------
  // PC-kritikeren: «bølge 2 fikk ingen melding om hvordan det gikk». u: { hvem ('Røverne' | navnet på motstanderen), nr (bølgen, røvere),
  //  utfall: 'slått' | 'unna' | 'herjet' | 'slapp' (røvere) | 'oppgitt' | 'ferdig' (en motstander), tok (tekst: det dere tok fra dem),
  //  tapte (tekst: det de tok fra dere), fiender, fienderUte (lag), falne, sårede, skadet, ødelagt (bygg) }. Gir { tittel, tekst, god }.
  // «A», «A og B», «A, B og C»
  const og = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' og ' + l[l.length - 1]);
  function sluttRapport(u) { const rø = u.hvem === 'Røverne', hva = rø ? `Bølge ${u.nr}` : `Angrepet fra ${u.hvem}`;
    const T = { slått: `${hva} er slått tilbake`, unna: rø ? `${hva} er slått tilbake – røverne trakk seg unna` : `${hva} er slått tilbake`, herjet: rø ? `${hva}: røverne herjet i leiren og dro med byttet` : `${hva}: de herjet i leiren`,
      slapp: `${hva}: sabotørene slapp unna`, oppgitt: `${hva} er slått tilbake – ${u.hvem} ga opp`, ferdig: `${u.hvem} trakk seg bort fra leiren etter angrepet` };
    const god = u.utfall === 'slått' || u.utfall === 'unna' || u.utfall === 'oppgitt', d = [];
    if (u.tok) d.push(`Dere tok ${u.tok}.`); if (u.tapte) d.push(`De tok ${u.tapte}.`);
    if (u.fiender > 0) d.push(rø ? (u.fienderUte >= u.fiender ? (u.fiender === 1 ? 'Røverlaget ble slått ut.' : `Alle ${u.fiender} røverlag ble slått ut.`) : u.fienderUte > 0 ? `${u.fienderUte} av ${u.fiender} røverlag ble slått ut.` : '')
      : (u.fienderUte > 0 ? `${u.fienderUte} av ${u.fiender} lag fra ${u.hvem} ble slått ut.` : ''));
    // (runde 12, kritiker E: «1 såret. 1 bygg skadet» uten navn) – med navnene når de finnes: u.falneNavn, u.sårNavn, u.skadetNavn, u.ødelagtNavn
    const f = u.falne || 0, s2 = u.sårede || 0, fN = u.falneNavn && u.falneNavn.length === f && f ? u.falneNavn : null, sN = u.sårNavn && u.sårNavn.length === s2 && s2 ? u.sårNavn : null;
    const fT = fN ? `${og(fN)} falt` : f ? f + ' falt' : '', sT = sN ? `${og(sN)} ble såret` : s2 ? s2 + ' såret' : '';
    d.push(f || s2 ? `Hos oss: ${fT}${f && s2 ? (fN || sN ? ', og ' : ' og ') : ''}${sT}.` : 'Ingen tap hos oss.');
    const b = []; if (u.skadet) b.push(u.skadetNavn && u.skadetNavn.length === u.skadet ? `${og(u.skadetNavn)} skadet` : `${u.skadet} bygg skadet`); if (u.ødelagt) b.push(u.ødelagtNavn && u.ødelagtNavn.length === u.ødelagt ? `${og(u.ødelagtNavn)} ødelagt` : `${u.ødelagt} ødelagt`);
    if (b.length) { const t = b.join(', '); d.push(t.charAt(0).toUpperCase() + t.slice(1) + '.'); }
    return { tittel: T[u.utfall] || `${hva} er over`, tekst: d.filter(Boolean).join(' '), god }; }
  // ---------- (runde 13, kritiker G og H) ANSLAGET SOM IKKE GÅR BAKLENGS ----------
  // G: «5–10 min» ble til «3–7 timer» på en halvtime spilltid (luftlinja sa minutter, ruta over fjellet sa timer, og glattingen dro
  // anslaget oppover). Nå: (1) ser ingen røverne, står det ingen minutter – bare når de trolig kommer («ikke sett – kommer trolig i natt»);
  // (2) ser noen dem, kan anslaget bare minke så lenge de ikke har snudd. monoton(før, rå, t, nytt): før = { v, t }, rå = nytt anslag i
  // minutter. nytt = true (første gang de er sett, eller de har snudd) gir rå anslaget; ellers det minste av fortsatt nedtelling og rå.
  function monoton(før, rå, t, nytt) {
    const ok = Number.isFinite(rå);
    if (!før) return ok ? { v: Math.max(0, rå), t } : null;
    const pred = Math.max(0, før.v - Math.max(0, t - før.t));
    if (!ok) return { v: pred, t };
    return { v: nytt ? Math.max(0, rå) : Math.min(pred, Math.max(0, rå)), t };
  }
  // Har de snudd? Avstanden til leiren nå mot den minste de har hatt: mer enn SNUDD meter lenger unna (eller de trekker seg/flykter).
  // Claudes forslag: 250 m.
  const SNUDD = 250;
  const harSnudd = (minNær, nær, trekker) => !!trekker || (Number.isFinite(minNær) && Number.isFinite(nær) && nær > minNær + SNUDD);
  // Klokka i spillet: tid = spillminutter fra dag 1 kl. 06:00. Gir { dag, time (0–23,99) }.
  const klokke = t => { const h = 6 + t / 60; return { dag: Math.floor(h / 24) + 1, time: ((h % 24) + 24) % 24 }; };
  const kl = h => String(Math.floor(((h % 24) + 24) % 24)).padStart(2, '0');
  // når(nå, ankomst): «i natt», «i kveld», «i dag», «i morgen tidlig» … for et tidspunkt i spillminutter (ingen minutter – ingen ser dem).
  // Natta (kl. 22–05) hører til dagen den begynte. Med klokkeslett i et spenn (usikkerheten er 30 %, minst én time): «i natt (ca. kl. 03–05)».
  function når(nå, ank) {
    if (!Number.isFinite(nå) || !Number.isFinite(ank)) return null;
    const igjen = Math.max(0, ank - nå); if (igjen <= 60) return 'trolig innen en time';
    const u = Math.max(60, igjen * .3), a = klokke(ank - u), b = klokke(ank + u), m = klokke(ank), n = klokke(nå);
    const natt = c => c.time >= 22 || c.time < 5, nattDag = c => (c.time < 5 ? c.dag - 1 : c.dag);
    // klokkeslettene bare når det er under 12 timer igjen (ellers blir spennet for vidt til å si noe)
    const spennTekst = igjen <= 720 ? ` (ca. kl. ${kl(a.time)}–${kl(Math.ceil(b.time) % 24)})` : '';
    let ord;
    if (natt(m)) { const d = nattDag(m) - (natt(n) ? nattDag(n) : n.dag); ord = d <= 0 ? 'i natt' : d === 1 ? (natt(n) ? 'neste natt' : 'i natt') : `om ca. ${Math.max(2, Math.round(igjen / 1440))} døgn`; }
    else { const del = m.time < 10 ? 'tidlig' : m.time < 17 ? '' : 'kveld', d = m.dag - n.dag;
      ord = d <= 0 ? (del === 'tidlig' ? 'i dag tidlig' : del === 'kveld' ? 'i kveld' : 'i dag') : d === 1 ? (del === 'tidlig' ? 'i morgen tidlig' : del === 'kveld' ? 'i morgen kveld' : 'i morgen') : `om ca. ${Math.max(2, Math.round(igjen / 1440))} døgn`; }
    return 'trolig ' + ord + spennTekst;
  }
  // nedtelling(min): «17 t 40 min», «45 min», «under 1 min»
  function nedtelling(min) { if (!Number.isFinite(min)) return ''; if (min < 1) return 'under 1 min'; const m = Math.round(min);
    if (m < 60) return m + ' min'; const t = Math.floor(m / 60), r = m - t * 60; return r ? `${t} t ${r} min` : `${t} t`; }
  const api = { R, retning, beredskap, stillinger, fordel, ankomst, vaktStørrelse, rapport, motHerjere, velgReparasjon, skadet, STATUS, glatt, spenn, sluttRapport,
    monoton, SNUDD, harSnudd, klokke, når, nedtelling };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else rot.Forsvar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
