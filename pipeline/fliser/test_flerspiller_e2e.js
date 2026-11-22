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
    const adr = `ws://localhost:${TP}`;
    await A.evaluate(a => NETT.koble('vert', a, null, 'Ola'), adr);
    sjekk(await til(A, () => NETT.tilkoblet && /^[A-Z0-9]{6}$/.test(NETT.kode || '')), 'verten åpner en verden med kode');
    const kode = await A.evaluate(() => NETT.kode);
    await B.evaluate(([a, k]) => NETT.koble('gjest', a, k, 'Kari'), [adr, kode]);
    sjekk(await til(B, () => NETT.tilkoblet && NETT.spillere.length === 2), 'gjesten kommer inn og ser to spillere');
    sjekk(await til(A, () => NETT.spillere.length === 2), 'verten ser gjesten');
    sjekk(await til(B, () => ENHETER.length > 0 && ENHETER.every(s => s.nid)), 'gjesten får lagene fra verten');
    // verten gir gjesten det første egne laget (som knappen «Styres av»)
    const gid = await B.evaluate(() => NETT.id);
    const lagNavn = await A.evaluate(g => { const s = ENHETER.find(q => q.side === 'blå' && !q.karakter); s.eier = g; NETT.sistBilde = 0; return s.navn; }, gid);
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return s && s.eier === NETT.id; }, lagNavn), 'gjesten ser at laget er hennes');
    // et lag gjesten ikke eier: ordren avvises lokalt
    const avvist = await B.evaluate(() => { const s = ENHETER.find(q => q.side === 'blå' && q.eier !== NETT.id); if (!s) return null; ordre(s, s.x + 200, s.y); return document.getElementById('logg').textContent.includes('styres av'); });
    sjekk(avvist !== false, 'ordre til et lag gjesten ikke har, avvises');
    // ordre fra gjesten -> verten planlegger ruta
    await B.evaluate(n => { const s = ENHETER.find(q => q.navn === n); ordre(s, s.x + 400, s.y + 300); }, lagNavn);
    sjekk(await til(A, n => { const s = ENHETER.find(q => q.navn === n); return !!(s && s.sti); }, lagNavn, 40000), 'vertens lag får ordren og en rute');
    sjekk(await til(B, n => { const s = ENHETER.find(q => q.navn === n); return !!(s && s.sti && s.sti.length > 1); }, lagNavn), 'gjesten ser ruta');
    // farten: verten setter 60×, gjesten følger; gjestens knapper gjør ingenting
    await A.evaluate(() => document.getElementById('sp3').click());
    sjekk(await til(B, () => tempo === 60), 'gjesten følger vertens fart');
    const x0 = await B.evaluate(n => ENHETER.find(q => q.navn === n).x, lagNavn);
    sjekk(await til(B, ([n, x]) => Math.abs(ENHETER.find(q => q.navn === n).x - x) > 20, [lagNavn, x0], 30000), 'laget flytter seg hos gjesten');
    await B.evaluate(() => document.getElementById('sp1').click()); await vent(700);
    sjekk(await B.evaluate(() => tempo === 60), 'gjesten kan ikke endre farten');
    // gjestens lagpanel: bare Marsjer/Stopp; Stopp stanser laget hos verten
    const knappene = await B.evaluate(n => { valgt = ENHETER.find(q => q.navn === n); visPanel(); return [...document.querySelectorAll('#handl button')].map(b => b.textContent); }, lagNavn);
    sjekk(knappene.includes('Marsjer') && knappene.includes('Stopp') && knappene.length === 2, 'gjestens lagpanel: ' + knappene.join(', '));
    await B.evaluate(() => [...document.querySelectorAll('#handl button')].find(b => b.textContent === 'Stopp').click());
    sjekk(await til(A, n => !ENHETER.find(q => q.navn === n).sti, lagNavn), 'Stopp fra gjesten stanser laget hos verten');
    // meldinger
    await B.evaluate(() => NETT.send({ t: 'melding', tekst: 'Hei fra Kari' }));
    sjekk(await til(A, () => document.getElementById('logg').textContent.includes('Hei fra Kari')), 'melding kommer fram til verten');
    // gjestens eget lagrede spill røres ikke
    sjekk(await B.evaluate(() => localStorage.getItem('riksbrudd-verden') === 'MERKE'), 'gjestens eget spill skrives ikke over');
    // panelet og invitasjonslenken
    await A.evaluate(() => NETT.åpen(true)); await vent(300);
    sjekk(await A.evaluate(k => { const t = document.getElementById('nett').textContent; return t.includes(k) && t.includes('#spill='); }, kode), 'verten ser koden og lenken');
    const C = await b.newPage(); C.on('pageerror', e => feilSide.push('lenke: ' + e.message));
    await C.goto(`http://localhost:${PORT}/dovre-fliser/#spill=${encodeURIComponent(adr)}&kode=${kode}`);
    sjekk(await til(C, () => document.getElementById('nett') && document.getElementById('nett').classList.contains('på') && /kode=/.test(document.getElementById('nlenke').value)), 'invitasjonslenken åpner «Bli med» med lenken fylt inn');
    if (process.env.BILDE) {   // skjermbilder av panelet: PC (1400 px) og telefon (390 px)
      await B.evaluate(() => NETT.åpen(true)); await vent(400);
      await A.screenshot({ path: process.env.BILDE + '-vert.png' }); await B.screenshot({ path: process.env.BILDE + '-gjest.png' });
      await B.setViewportSize({ width: 390, height: 844 }); await vent(800); await B.screenshot({ path: process.env.BILDE + '-gjest-mobil.png' });
      await C.setViewportSize({ width: 390, height: 844 }); await vent(800); await C.screenshot({ path: process.env.BILDE + '-lenke-mobil.png' });
    }
    // verten går: gjesten får beskjed
    await A.evaluate(() => NETT.koblFra(true));
    sjekk(await til(B, () => NETT.vertBorte === true), 'gjesten får vite at verten er borte');
    sjekk(fs.readdirSync(mappe).some(f => f === kode + '.json'), 'tjeneren har lagret verden på disk');
    sjekk(feilSide.length === 0, 'ingen feil i nettleserne' + (feilSide.length ? ': ' + feilSide.join(' | ') : ''));
  } catch (e) { sjekk(false, 'unntak: ' + e.message); }
  await b.close(); srv.kill(); tj.kill();
  console.log(feil ? feil + ' feil' : 'alt ok'); process.exit(feil ? 1 : 0);
})();
