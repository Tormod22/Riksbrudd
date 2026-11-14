// Mellomstasjon for kartfliser: henter en bit (byteområde) av en PMTiles-fil fra en GitHub-release i dette (offentlige)
// repoet og gir den til nettleseren med CORS og lang hurtigbuffer i Vercels nett.
// Adresse: /api/kart/<release-tag>/<fil>/<fra>/<lengde>  (vercel.json skriver det om til ?tag=&fil=&fra=&lengde=)
// Byteområdet ligger i adressen, ikke i en Range-header, så hver bit kan lagres for seg i hurtigbufferen.
// Hvorfor: ingen nøkler trengs (Actions laster opp med GITHUB_TOKEN), og GitHub-filene kan være opptil 2 GB.
const REPO = 'Tormod22/Riksbrudd';
const FIL = /^[a-z0-9-]{1,40}\.(pmtiles|json|bin|bin\.gz)$/;   // f.eks. hoyde.pmtiles, hoyde-0.pmtiles, manifest.json, vegnett.bin.gz
const MAKS = 4 * 1024 * 1024;   // Vercel-funksjoner kan svare med maks 4,5 MB

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'ETag, Content-Length');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET'); return res.status(204).end(); }
  const { tag, fil } = req.query, fra = Number(req.query.fra), lengde = Number(req.query.lengde);
  if (!/^kart-(norge-(\d{4}-)?|hus-|omland-|utveg-|vegnett-|nve-|infra-(\d{4}-)?)?[0-9a-f]{6,40}$/.test(tag || '') || !FIL.test(fil || '') || !Number.isInteger(fra) || fra < 0 || !Number.isInteger(lengde) || lengde < 1 || lengde > MAKS)
    return res.status(400).json({ feil: 'ugyldig forespørsel' });
  const url = `https://github.com/${REPO}/releases/download/${tag}/${fil}`;
  // GitHub kan svare 429 eller 5xx, eller miste forbindelsen, i korte perioder (14. nov: brukeren fikk «får ikke hentet kartdata»):
  // opptil tre forsøk med en liten pause før vi gir opp. Feil lagres aldri i hurtigbufferen, og de skrives i loggen.
  let r = null, feil = '';
  for (let forsøk = 0; forsøk < 3; forsøk++) {
    try { r = await fetch(url, { headers: { Range: `bytes=${fra}-${fra + lengde - 1}` }, redirect: 'follow' }); feil = 'GitHub svarte ' + r.status; }
    catch (e) { r = null; feil = 'fikk ikke kontakt med GitHub'; }
    if (r && (r.status === 206 || r.status === 200 || r.status === 404)) break;
    if (forsøk < 2) await new Promise(ok => setTimeout(ok, 250 * 3 ** forsøk));
  }
  if (!r || (r.status !== 206 && r.status !== 200)) {
    console.warn('kart:', feil, tag, fil, fra, lengde);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(r && r.status === 404 ? 404 : r && r.status === 429 ? 429 : 502).json({ feil });
  }
  let data = Buffer.from(await r.arrayBuffer());
  if (r.status === 200) data = data.subarray(fra, fra + lengde);   // skulle GitHub sende hele fila
  res.setHeader('Content-Type', fil.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream');
  res.setHeader('ETag', '"' + tag + '"');                            // samme for alle biter av samme versjon (PMTiles sjekker dette)
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');   // tag-en endres når dataene endres
  return res.status(200).send(data);
};
