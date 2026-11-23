// Flerspiller ende til ende (22. nov): tjeneren (tjener/riksbrudd-tjener.js) + to nettlesere (vert og gjest) på testserveren.
// Kjør: node pipeline/fliser/test_flerspiller_e2e.js   (bruker Playwright/Chromium; PORT og TJENER_PORT kan settes)
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'), fs = require('fs'), os = require('os');
const PORT = +(process.env.PORT || 8794), TP = +(process.env.TJENER_PORT || 8795);
const mappe = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-verdener-'));
const srv = spawn('python3', [path.join(__dirname, 'server.py'), path.join(__dirname, '../../site')], { stdio: 'ignore', env: Object.assign({}, process.env, { PORT: String(PORT) }) });
const tj = spawn('node', [path.join(__dirname, '../../tjener/riksbrudd-tjener.js'), '--port', String(TP), '--mappe', mappe], { stdio: 'ignore' });
let feil = 0; const sjekk = (ok, t) => { console.log((ok ? 'ok   ' : 'FEIL ') + t); if (!ok) feil++; };
const vent = ms => new Promise(r => setTimeout(r, ms));
async function til(pg, fn, arg, ms = 30000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await pg.evaluate(fn, arg)) return true; } catch (e) { /* siden lastes */ } await vent(200); } return false; }
(async () => {
  await vent(1200); const b = await chromium.launch(); const feilSide = [];
  const side = async navn => { const pg = await b.newPage({ viewport: { width: 1400, height: 900 } });
    pg.on('pageerror', e => feilSide.push(navn + ': ' + e.message)); await pg.goto(`http://localhost:${PORT}/dovre-fliser/`); await til(pg, () => typeof ENHETER !== 'undefined' && !!window.NETT && typeof logg === 'function'); return pg; };
  try {
    const A = await side('vert'), B = await side('gjest');
    await B.evaluate(() => localStorage.setItem('riksbrudd-verden', 'MERKE'));
    // R18-D: verten har en leir (et nytt spill med leir ved Dombås), så gjesten har noe å se og styre
    await A.evaluate(async () => { if (window.AI) AI.på = false; OppstartSpill.nytt(); const u = OppstartSpill.utkast(); u.karakter.navn = 'Ola'; u.fraksjon.navn = 'Olas vakt'; OppstartSpill.vis(3);
      const k = [...document.querySelectorAll('#oppstart button')].find(b => /kartet/.test(b.textContent)); if (k) k.click(); await OppstartSpill.prøvLeir(196400, 6898900); OppstartSpill.bekreft(); });
    sjekk(await til(A, () => !!(LeirSpill.tilstand() && FolkSpill.tilstand() && OppstartSpill.tilstand())), 'verten har en leir med folk');
    const adr = `ws://localhost:${TP}`;
    await A.evaluate(a => NETT.koble('vert', a, null, 'Ola'), adr);
    sjekk(await til(A, () => NETT.tilkoblet && /^[A-Z0-9]{6}$/.test(NETT.kode || '')), 'verten åpner en verden med kode');
    const kode = await A.evaluate(() => NETT.kode);
    // gjesten som en EKTE ny spiller uten eget spill: startskjermens gjemming av lag er på (spilltest R16, funn 1)
    await B.evaluate(() => { OppstartSpill.test = true; OppstartSpill.gjemStart(); });
    await B.evaluate(([a, k]) => NETT.koble('gjest', a, k, 'Kari'), [adr, kode]);
    sjekk(await til(B, () => NETT.tilkoblet && NETT.spillere.length === 2), 'gjesten kommer inn og ser to spillere');
    sjekk(await til(A, () => NETT.spillere.length === 2), 'verten ser gjesten');
    sjekk(await til(B, () => ENHETER.length > 0 && ENHETER.every(s => s.nid)), 'gjesten får lagene fra verten');
    // verten gir gjesten det første egne laget (som knappen «Styres av»)
    const gid = await B.evaluate(() => NETT.id);
    const lagNavn = await A.evaluate(g => { const s = ENHETER.find(q => q.side === 'blå' && !q.karakter); s.eier = g; NETT.sistBilde = 0; return s.navn; }, gid);
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return s && s.eier === NETT.id; }, lagNavn), 'gjesten ser at laget er hennes');
    await vent(1500);
    sjekk(await B.evaluate(n => { const s = ENHETER.find(q => q.navn === n); return !!(s && s.eier === NETT.id); }, lagNavn), 'laget blir værende hos gjesten (startskjermen gjemmer det ikke)');
    sjekk(await B.evaluate(() => !ENHETER.some(s => s.karakter) && !ENHETER.some(s => / \(deg\)$/.test(s.navn))), 'vertens figur er ikke gjestens karakter og heter ikke «(deg)»');
    // et lag gjesten ikke eier: ordren avvises lokalt
    const avvist = await B.evaluate(() => { const s = ENHETER.find(q => q.side === 'blå' && q.eier !== NETT.id); if (!s) return null; ordre(s, s.x + 200, s.y); return document.getElementById('logg').textContent.includes('styres av'); });
    sjekk(avvist !== false, 'ordre til et lag gjesten ikke har, avvises');
    // ordre fra gjesten -> verten planlegger ruta
    await B.evaluate(n => { const s = ENHETER.find(q => q.navn === n); valgt = s; visPanel(); ordre(s, s.x + 400, s.y + 300); }, lagNavn);
    sjekk(await til(A, n => { const s = ENHETER.find(q => q.navn === n); return !!(s && s.sti); }, lagNavn, 40000), 'vertens lag får ordren og en rute');
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return !!(s && s.sti && s.sti.length > 1); }, lagNavn), 'gjesten ser ruta');
    sjekk(await til(B, () => [...document.querySelectorAll('#handl button')].some(b => b.textContent === 'Stopp')), 'gjestens lagpanel oppdateres av seg selv (Stopp kommer)');
    sjekk(await B.evaluate(n => ENHETER.find(q => q.navn === n).menn.every(m => Number.isFinite(m.loy)), lagNavn) && !(await B.evaluate(() => document.getElementById('menn').textContent.includes('NaN'))), 'lojaliteten er med hos gjesten (ingen NaN)');
    // farten: verten setter 60×, gjesten følger; gjestens knapper gjør ingenting
    await A.evaluate(() => document.getElementById('sp3').click());
    sjekk(await til(B, () => tempo === 60), 'gjesten følger vertens fart');
    const x0 = await B.evaluate(n => ENHETER.find(q => q.navn === n).x, lagNavn);
    sjekk(await til(B, ([n, x]) => Math.abs(ENHETER.find(q => q.navn === n).x - x) > 20, [lagNavn, x0], 30000), 'laget flytter seg hos gjesten');
    await B.evaluate(() => document.getElementById('sp1').click()); await vent(700);
    sjekk(await B.evaluate(() => tempo === 60), 'gjesten kan ikke endre farten');
    // gjestens lagpanel: bare Marsjer/Stopp; Stopp stanser laget hos verten
    const knappene = await B.evaluate(n => { valgt = ENHETER.find(q => q.navn === n); visPanel(); return [...document.querySelectorAll('#handl button')].map(b => b.textContent); }, lagNavn);
    sjekk(knappene.includes('Marsjer') && knappene.includes('Stopp') && knappene.some(t => /^Formasjon:/.test(t)) && knappene.includes('Stridsregler'), 'gjestens lagpanel: ' + knappene.join(', '));
    await B.evaluate(() => [...document.querySelectorAll('#handl button')].find(b => b.textContent === 'Stopp').click());
    sjekk(await til(A, n => !ENHETER.find(q => q.navn === n).sti, lagNavn), 'Stopp fra gjesten stanser laget hos verten');
    // KOMMANDOLAGET (R16-A): formasjon fra gjestens knapp virker hos verten, og gjesten ser den nye formasjonen
    const formFør = await A.evaluate(n => ENHETER.find(q => q.navn === n).formasjon || 'kile', lagNavn);
    const formNy = await B.evaluate(n => { valgt = ENHETER.find(q => q.navn === n); visPanel(); const b = document.getElementById('formknapp'); if (!b) return null; b.click(); return Formasjon.neste(valgt.formasjon); }, lagNavn);
    sjekk(formNy && formNy !== formFør && await til(A, ([n, f]) => ENHETER.find(q => q.navn === n).formasjon === f, [lagNavn, formNy]), `formasjon fra gjesten virker hos verten (${formFør} -> ${formNy})`);
    sjekk(await til(B, ([n, f]) => ENHETER.find(q => q.navn === n).formasjon === f, [lagNavn, formNy]), 'gjesten ser den nye formasjonen');
    // stridsregler (holdning) fra gjesten
    await B.evaluate(n => KOMMANDO({ type: 'strid', lag: ENHETER.find(q => q.navn === n).nid, endring: Strid.HOLDNING.forsiktig.regel }), lagNavn);
    sjekk(await til(A, n => { const s = ENHETER.find(q => q.navn === n); return s.strid && s.strid.ild === 'besvar' && s.strid.underlegen === 'unngå'; }, lagNavn), 'stridsregler fra gjesten virker hos verten');
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return s.strid && s.strid.ild === 'besvar'; }, lagNavn), 'gjesten ser de nye stridsreglene');
    // grav ned fra gjesten (laget står): verten begynner å grave
    await B.evaluate(n => { valgt = ENHETER.find(q => q.navn === n); visPanel(); const b = [...document.querySelectorAll('#handl button')].find(x => x.textContent === 'Grav ned'); if (b) b.click(); }, lagNavn);
    sjekk(await til(A, n => { const s = ENHETER.find(q => q.navn === n); return s.graver != null || s.nedgravd; }, lagNavn), 'grav ned fra gjesten virker hos verten');
    // et lag gjesten ikke eier: verten avviser kommandoen også når den kommer over nettet
    const annet = await A.evaluate(() => { const s = ENHETER.find(q => q.side === 'blå' && !q.eier && !q.karakter); return s ? [s.nid, s.formasjon || 'kile'] : null; });
    if (annet) { await B.evaluate(id => NETT.send({ t: 'kommando', k: { type: 'formasjon', lag: id, id: 'spredt' } }), annet[0]); await vent(1200);
      sjekk(await A.evaluate(([id, f]) => (ENHETER.find(q => q.nid === id).formasjon || 'kile') === f, annet), 'verten avviser kommando til et lag gjesten ikke har'); }
    // ---------- R18-D: gjester styrer leiren ----------
    sjekk(await til(B, () => !!(NETT.leirData && LeirSpill.tilstand() && LeirSpill.erSpeil() && FolkSpill.tilstand())), 'gjesten får speilet av vertens leir');
    const vL = await A.evaluate(() => ({ bygg: LeirSpill.tilstand().bygg.length, folk: FolkSpill.tilstand().personer.length, penger: OppstartSpill.tilstand().penger, leir: OppstartSpill.tilstand().leir }));
    sjekk(await B.evaluate(v => LeirSpill.tilstand().bygg.length === v.bygg && FolkSpill.tilstand().personer.length === v.folk && OppstartSpill.tilstand().penger === v.penger && Math.abs(OppstartSpill.tilstand().leir.x - v.leir.x) < 1, vL),
      `gjesten ser samme bygg (${vL.bygg}), folk (${vL.folk}) og kasse som verten`);
    sjekk(await B.evaluate(() => !document.getElementById('leirknapp').hidden && /kr/.test(document.getElementById('sPenger').textContent)), 'Leir-knappen og vertens kasse vises hos gjesten');
    await B.evaluate(() => { const k = document.getElementById('leirknapp'); if (!k.classList.contains('på')) k.click(); });
    sjekk(await til(B, () => document.getElementById('leirmeny').classList.contains('på') && /Leiren/.test(document.getElementById('leirmeny').textContent)), 'gjesten åpner Leir-menyen med vertens leir');
    await B.evaluate(() => { const k = document.getElementById('leirknapp'); if (k.classList.contains('på')) k.click(); });
    // gjesten bygger en brakke i vertens leir på vanlig måte (plassering, sjekk mot kartet, bekreft)
    const kasseFør = vL.penger;
    const bygd = await B.evaluate(async v => { LeirSpill.startPlassering('brakke'); LeirSpill.trykk(v.leir.x + 40, v.leir.y + 10); await LeirSpill.prøv(); const f = LeirSpill.plassering() && LeirSpill.plassering().feil;
      // som en spiller: knappen i banneret (kjøper materialene som mangler, og bygger)
      const kn = [...document.querySelectorAll('#byggvalg button')].find(x => /Kjøp materialene og bygg/.test(x.textContent)); if (kn) kn.click(); else LeirSpill.bekreft();
      return { feil: f || null, lokalt: LeirSpill.tilstand().bygg.some(b => b.type === 'brakke'), logg: document.getElementById('logg').textContent.slice(-300) }; }, vL);
    sjekk(!bygd.feil && bygd.lokalt, 'gjesten bestiller en brakke (vises straks hos gjesten)' + (bygd.feil || !bygd.lokalt ? ': ' + (bygd.feil || bygd.logg) : ''));
    sjekk(await til(A, () => LeirSpill.tilstand().bygg.some(b => b.type === 'brakke')), 'verten ser brakka gjesten bestilte');
    sjekk(await til(A, () => /Kari bygger en brakke/.test(document.getElementById('logg').textContent)), 'vertens logg: «Kari bygger en brakke»');
    sjekk(await til(A, k => OppstartSpill.tilstand().penger < k, kasseFør), 'brakka er betalt av vertens kasse');
    sjekk(await til(B, () => LeirSpill.tilstand().bygg.filter(b => b.type === 'brakke').length === 1 && !NETT.ventLeir), 'gjesten har én brakke etter neste speil (ingen dobbel)');
    sjekk(await til(B, () => OppstartSpill.tilstand().penger === NETT.leirData.penger), 'gjestens kasse følger vertens');
    // gjesten setter en person på en oppgave
    const pers = await B.evaluate(() => { const p = FolkSpill.tilstand().personer.find(q => q.oppgave !== 'vakt'); const r = KOMMANDO({ type: 'folk', person: p.id, oppgave: 'vakt' }); return { id: p.id, navn: p.navn, ok: r.ok, lokalt: FolkSpill.tilstand().personer.find(q => q.id === p.id).oppgave }; });
    sjekk(pers.ok && pers.lokalt === 'vakt', `gjesten setter ${pers.navn} på vakt`);
    sjekk(await til(A, id => FolkSpill.tilstand().personer.find(q => q.id === id).oppgave === 'vakt', pers.id), 'verten ser at personen er satt på vakt');
    sjekk(await til(A, n => document.getElementById('logg').textContent.includes(`Kari setter ${n} på «vakt»`), pers.navn), 'vertens logg sier hvem som flyttet personen');
    // Folk-panelet hos gjesten viser vertens folk
    const folkTekst = await B.evaluate(() => { FolkSpill.åpne(true); const v = [...document.querySelectorAll('#folkmeny button')].find(b => /Vis folkene/.test(b.textContent)); if (v) v.click(); const t = document.getElementById('folkmeny').textContent; FolkSpill.åpne(false); return t; });
    const folkNavn = await A.evaluate(() => FolkSpill.tilstand().personer.map(p => p.navn));
    sjekk(folkNavn.slice(0, 3).every(n => folkTekst.includes(n)), 'Folk-panelet hos gjesten viser vertens folk' + (folkNavn.slice(0, 3).every(n => folkTekst.includes(n)) ? '' : ': ' + folkTekst.slice(0, 200)));
    // gjesten setter opp en tropp av vertens folk: verten lager laget, og gjesten styrer det
    const tr = await B.evaluate(() => { const P = FolkSpill.tilstand().personer.filter(p => p.oppgave !== 'vakt' && p.helse > .5).slice(0, 3).map(p => p.id); return { r: TropperSpill.opprett(P, 'Karis tropp', 'standard', null, {}), P }; });
    sjekk(tr.r && !tr.r.feil, 'gjesten sender «sett opp tropp» til verten' + (tr.r && tr.r.feil ? ': ' + tr.r.feil : ''));
    sjekk(await til(A, () => ENHETER.some(s => s.navn === 'Karis tropp')), 'verten setter opp troppen av vertens folk');
    sjekk(await til(A, () => { const s = ENHETER.find(q => q.navn === 'Karis tropp'); return !!(s && s.eier && s.eier === NETT.spillere.find(p => p.navn === 'Kari').id); }), 'troppen styres av gjesten som laget den');
    sjekk(await til(B, ids => { const s = ENHETER.find(q => q.navn === 'Karis tropp'); return !!(s && s.eier === NETT.id) && !FolkSpill.tilstand().personer.some(p => ids.includes(p.id)); }, tr.P), 'gjesten ser troppen som sin, og folkene er gått ut av leiren');
    // kjøp utenom kommandolaget (f.eks. i Sekk) blir ikke gratis hos gjesten
    sjekk(await B.evaluate(() => { const før = OppstartSpill.tilstand().penger; const ok = OppstartSpill.betal(1000); return !ok && OppstartSpill.tilstand().penger === før; }), 'gjesten kan ikke betale utenom kommandolaget (ingen gratis kjøp)');
    // «bare se»: verten strammer inn, gjestens bygg avvises med forståelig tekst
    await A.evaluate(() => NETT.settTillat('se'));
    sjekk(await til(B, () => NETT.leirData && NETT.leirData.tillat === 'se'), 'gjesten får vite at verten har satt «bare se»');
    const se = await B.evaluate(() => KOMMANDO({ type: 'bygg', bygg: { type: 'lagertelt', x: 0, y: 0, ret: 0 } }));
    sjekk(!se.ok && /bare se/.test(se.feil), 'med «bare se» avvises bygging hos gjesten: ' + se.feil);
    const antall = await A.evaluate(() => LeirSpill.tilstand().bygg.length);
    await B.evaluate(id => NETT.send({ t: 'kommando', k: { type: 'folk', person: id, oppgave: 'bygg', nr: 999 } }), pers.id); await vent(1200);
    sjekk(await A.evaluate(([id, n]) => FolkSpill.tilstand().personer.find(q => q.id === id).oppgave === 'vakt' && LeirSpill.tilstand().bygg.length === n, [pers.id, antall]), 'verten avviser leirkommandoer over nettet med «bare se»');
    // «bygge og folk»: riving er bare for verten
    await A.evaluate(() => NETT.settTillat('bygg'));
    sjekk(await til(B, () => NETT.leirData && NETT.leirData.tillat === 'bygg'), 'gjesten får «bygge og folk»');
    const riv = await B.evaluate(() => { const b = LeirSpill.tilstand().bygg[0]; return b ? KOMMANDO({ type: 'riv', bygg: b.id }) : { ok: false, feil: 'ingen bygg å rive' }; });
    sjekk(!riv.ok && /rive/.test(riv.feil), 'med «bygge og folk» kan gjesten ikke rive: ' + riv.feil);
    await A.evaluate(() => NETT.settTillat('alt'));
    // gjestens eget spill er ikke rørt av speilet (leiren, folket og kassa lagres ikke hos gjesten)
    sjekk(await B.evaluate(() => !localStorage.getItem('riksbrudd-k2') && !localStorage.getItem('riksbrudd-k1')), 'gjesten lagrer ikke vertens leir som sin egen');
    // hvor spillerne er: gjesten ser verten, verten ser gjesten (sendes hvert 2. s)
    sjekk(await til(B, () => (NETT.andre || []).some(p => p.navn === 'Ola')), 'gjesten ser hvor verten er');
    sjekk(await til(A, () => NETT.bildeNå().sp.some(p => p.navn === 'Kari')), 'verten ser hvor gjesten er');
    // meldinger
    await B.evaluate(() => NETT.send({ t: 'melding', tekst: 'Hei fra Kari' }));
    sjekk(await til(A, () => document.getElementById('logg').textContent.includes('Hei fra Kari')), 'melding kommer fram til verten');
    // gjestens eget lagrede spill røres ikke
    sjekk(await B.evaluate(() => localStorage.getItem('riksbrudd-verden') === 'MERKE'), 'gjestens eget spill skrives ikke over');
    // panelet og invitasjonslenken
    await A.evaluate(() => NETT.åpen(true)); await vent(300);
    sjekk(await A.evaluate(k => { const t = document.getElementById('nett').textContent; return t.includes(k) && !t.includes('#spill=') && t.includes('Ingen tunnel'); }, kode), 'verten ser koden, og uten tunnel ingen lenke (bare forklaring)');
    const C = await b.newPage(); C.on('pageerror', e => feilSide.push('lenke: ' + e.message));
    await C.goto(`http://localhost:${PORT}/dovre-fliser/#spill=${encodeURIComponent(adr)}&kode=${kode}`);
    sjekk(await til(C, () => document.getElementById('nett') && document.getElementById('nett').classList.contains('på') && /kode=/.test(document.getElementById('nlenke').value)), 'invitasjonslenken åpner «Bli med» med lenken fylt inn');
    if (process.env.BILDE) {   // skjermbilder av panelet: PC (1400 px) og telefon (390 px)
      await B.evaluate(() => NETT.åpen(true)); await vent(400);
      await A.screenshot({ path: process.env.BILDE + '-vert.png' }); await B.screenshot({ path: process.env.BILDE + '-gjest.png' });
      // R18-D: vertens leir hos begge – kartet nær leiren og Leir-menyen
      for (const [pg, n] of [[A, 'vert'], [B, 'gjest']]) { await pg.evaluate(() => { NETT.åpen(false); const S = OppstartSpill.tilstand(); kam.x = S.leir.x + 30; kam.y = S.leir.y; kam.m = .35; skitten = true;
        const k = document.getElementById('leirknapp'); if (!k.classList.contains('på')) k.click(); }); await vent(1500); await pg.screenshot({ path: process.env.BILDE + '-' + n + '-leir.png' }); }
      await B.evaluate(() => { const k = document.getElementById('leirknapp'); if (k.classList.contains('på')) k.click(); FolkSpill.åpne(true); }); await vent(800); await B.screenshot({ path: process.env.BILDE + '-gjest-folk.png' });
      await B.evaluate(() => FolkSpill.åpne(false));
      await B.setViewportSize({ width: 390, height: 844 }); await vent(800); await B.screenshot({ path: process.env.BILDE + '-gjest-mobil.png' });
      await B.evaluate(() => { NETT.åpen(false); const k = document.getElementById('leirknapp'); if (!k.classList.contains('på')) k.click(); }); await vent(900); await B.screenshot({ path: process.env.BILDE + '-gjest-mobil-leir.png' });
      await B.evaluate(() => { const k = document.getElementById('leirknapp'); if (k.classList.contains('på')) k.click(); }); await vent(500); await B.screenshot({ path: process.env.BILDE + '-gjest-mobil-kart.png' });
      await C.setViewportSize({ width: 390, height: 844 }); await vent(800); await C.screenshot({ path: process.env.BILDE + '-lenke-mobil.png' });
    }
    // vertslenken fra tjenerprogrammet: panelet åpnes med tjeneradressen fylt inn
    const V = await b.newPage(); V.on('pageerror', e => feilSide.push('vertslenke: ' + e.message));
    await V.goto(`http://localhost:${PORT}/dovre-fliser/#vert=${encodeURIComponent(adr)}`);
    sjekk(await til(V, a => document.getElementById('nett') && document.getElementById('nett').classList.contains('på') && document.getElementById('nadr').value === a, adr), 'vertslenken fyller inn tjeneren');
    // verten går: gjesten får beskjed
    await A.evaluate(() => NETT.koblFra(true));
    sjekk(await til(B, () => NETT.vertBorte === true), 'gjesten får vite at verten er borte');
    // verten kommer tilbake (som når siden lastes på nytt): gjesten skal få laget sitt igjen
    await A.evaluate(([a, k]) => NETT.koble('vert', a, k, 'Ola'), [adr, kode]);
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return NETT.vertBorte === false && !!(s && s.eier === NETT.id); }, lagNavn, 40000), 'gjesten har laget sitt igjen når verten kommer tilbake');
    await A.evaluate(() => NETT.koblFra(true));
    sjekk(fs.readdirSync(mappe).some(f => f === kode + '.json'), 'tjeneren har lagret verden på disk');
    sjekk(feilSide.length === 0, 'ingen feil i nettleserne' + (feilSide.length ? ': ' + feilSide.join(' | ') : ''));
  } catch (e) { sjekk(false, 'unntak: ' + e.message); }
  await b.close(); srv.kill(); tj.kill();
  console.log(feil ? feil + ' feil' : 'alt ok'); process.exit(feil ? 1 : 0);
})();
