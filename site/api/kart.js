// Mellomstasjon for kartfliser: henter en bit (byteområde) av en PMTiles-fil fra en GitHub-release i dette (offentlige)
// repoet og gir den til nettleseren med CORS og lang hurtigbuffer i Vercels nett.
// Adresse: /api/kart/<release-tag>/<lag>/<fra>/<lengde>  (vercel.json skriver det om til ?tag=&lag=&fra=&lengde=)
// Byteområdet ligger i adressen, ikke i en Range-header, så hver bit kan lagres for seg i hurtigbufferen.
// Hvorfor: ingen nøkler trengs (Actions laster opp med GITHUB_TOKEN), og GitHub-filene kan være opptil 2 GB.
const REPO = 'Tormod22/Riksbrudd';
const LAG = new Set(['hoyde', 'terreng', 'kart', 'vektor']);
const MAKS = 4 * 1024 * 1024;   // Vercel-funksjoner kan svare med maks 4,5 MB

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'ETag, Content-Length');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET'); return res.status(204).end(); }
  const { tag, lag } = req.query, fra = Number(req.query.fra), lengde = Number(req.query.lengde);
  if (!/^kart-[0-9a-f]{6,40}$/.test(tag || '') || !LAG.has(lag) || !Number.isInteger(fra) || fra < 0 || !Number.isInteger(lengde) || lengde < 1 || lengde > MAKS)
    return res.status(400).json({ feil: 'ugyldig forespørsel' });
  const url = `https://github.com/${REPO}/releases/download/${tag}/${lag}.pmtiles`;
  let r;
  try { r = await fetch(url, { headers: { Range: `bytes=${fra}-${fra + lengde - 1}` }, redirect: 'follow' }); }
  catch (e) { return res.status(502).json({ feil: 'fikk ikke kontakt med GitHub' }); }
  if (r.status !== 206 && r.status !== 200) return res.status(r.status === 404 ? 404 : 502).json({ feil: 'GitHub svarte ' + r.status });
  let data = Buffer.from(await r.arrayBuffer());
  if (r.status === 200) data = data.subarray(fra, fra + lengde);   // skulle GitHub sende hele fila
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('ETag', '"' + tag + '"');                            // samme for alle biter av samme versjon (PMTiles sjekker dette)
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');   // tag-en endres når dataene endres
  return res.status(200).send(data);
};
