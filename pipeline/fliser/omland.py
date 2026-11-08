"""Omlandet rundt Norge: Sverige, Finland, Danmark, Kola, Svalbard og havet, i samme stil 1 som Norge-kartet, men grovere.
Kartet skal gli over i dette uten synlig kant (visningen toner Norge-blokkene ut mot omlandet), og havet blir blått.

Kilder (åpne, ingen nøkler, via Microsoft Planetary Computer):
  høyde     Copernicus DEM GLO-90 (© DLR e.V. 2010–2014 og © Airbus 2014–2018, levert under COPERNICUS-programmet; fri bruk)
  arealtype ESA WorldCover 2021 (CC BY 4.0) – samme klasser og farger som Norge-kartet (fliskode.fra_worldcover/farge)

To nivåer:
  nær   z6–z8 (64 m) for blokkene i NÆR (Skandinavia, Finland, Kola, Danmark, Svalbard)
  fjern z0–z5 (512 m) for hele z0-flisen (Nordsjøen til Russland, Alpene til Nordpolen)
Lag: ohoyde (som hoyde: tapsfri WebP, 258 px med kant) og okart (WebP q80). Fliser som bare er hav, lagres ikke:
visningen tegner manglende omland som hav.

Bruk: python3 omland.py UTMAPPE [DEL ANTALL]   (DEL/ANTALL deler nær-blokkene mellom flere jobber; del 0 tar også fjern)
      python3 omland.py --samle UTMAPPE INNMAPPE...   -> UTMAPPE/omland.pmtiles + manifest.json (tag kart-omland-<hash>)
"""
import os, sys, json, time, hashlib, urllib.request, urllib.parse, threading
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from felles import CRS, X0, Y0, TILE, res, span, tile_bounds
from fliskode import Lerret, kod_hoyde, webp, fra_worldcover, farge, PAL, flisomraade

T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)

NÆR = tuple(int(v) for v in os.environ['OMLAND_NAER'].split(',')) if os.environ.get('OMLAND_NAER') else (0, 0, 29, 50)        # z6-blokker (x0, y0, x1, y1): X0 .. 1 766 km øst, 9 300 .. 5 958 km nord
FJERN_Z, NÆR_Z = 5, 8       # 512 m og 64 m
MARG = 256.0                # en piksel på z6, så skyggen ikke får sømmer mellom blokkene
STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search'


def hent(url, data=None, headers={}, forsok=8):
    for k in range(forsok):
        try: return urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=300).read()
        except Exception as e:
            if k == forsok - 1: raise
            vent = 3 * 2 ** k if k < 6 else 60
            logg('prøver igjen om', vent, 's:', str(e)[:120]); time.sleep(vent)

_tok, _lås = {}, threading.Lock()
def token(samling):
    """Planetary Computer: en SAS-nøkkel per samling (gratis, uten konto), fornyes hvert 30. minutt."""
    with _lås:
        t = _tok.get(samling)
        if not t or time.time() - t[1] > 1800:
            t = (json.loads(hent(f'https://planetarycomputer.microsoft.com/api/sas/v1/token/{samling}'))['token'], time.time()); _tok[samling] = t
        return t[0]

def søk(samling, b):
    from rasterio.warp import transform_bounds
    bb = list(transform_bounds(CRS, 'EPSG:4326', *b, densify_pts=21))
    q = {'collections': [samling], 'bbox': bb, 'limit': 200}
    f = json.loads(hent(STAC, json.dumps(q).encode(), {'Content-Type': 'application/json'}))['features']
    if samling == 'esa-worldcover': f = [x for x in f if '2021' in x['id']]
    return f

def les(samling, aktiv, b, r, resampling, dtype, fyll, oversikt, src_nodata=None):
    """Alle bildene i samlingen som dekker b, lagt i nettet b/r i EPSG:25833. oversikt: grovere nivå i COG-en (spart nedlasting)."""
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_origin
    W, H = round((b[2] - b[0]) / r), round((b[3] - b[1]) / r)
    ut = np.full((H, W), fyll, dtype); T = from_origin(b[0], b[3], r, r)
    for f in søk(samling, b):
        url = f['assets'][aktiv]['href'] + '?' + token(samling)
        for ov in ([oversikt, None] if oversikt is not None else [None]):
            try:
                with rasterio.open(url, **({'overview_level': ov} if ov is not None else {})) as src:
                    tmp = np.full((H, W), fyll, dtype)
                    reproject(rasterio.band(src, 1), tmp, dst_transform=T, dst_crs=CRS, src_nodata=src_nodata,
                              dst_nodata=fyll, resampling=getattr(Resampling, resampling))
                break
            except Exception as e:
                if ov is None: raise
        tom = np.isnan(ut) if dtype == np.float32 else (ut == fyll)
        ut = np.where(tom, tmp, ut)
    return ut

def rute(b, r):
    """Høyde (NaN = hav) og stil 1-farge for området b med oppløsning r meter."""
    ov_h = None if r < 200 else 1                      # GLO-90: full oppløsning nær, 4× grovere fjernt
    ov_k = 1 if r < 200 else 4                         # WorldCover 10 m: 40 m nær, 320 m fjernt
    h = les('cop-dem-glo-90', 'data', b, r, 'average', np.float32, np.nan, ov_h)
    wc = les('esa-worldcover', 'map', b, r, 'mode', np.uint8, 0, ov_k, 0)
    k = fra_worldcover(wc); del wc
    k[k == 255] = 3                                     # utenfor WorldCover: åpent hav
    k[(k == 3) & ~(h > 2)] = 3
    h[(k == 3) & ~(h > 2)] = np.nan                     # vann ved havnivå (og hav uten høyde) = hav, som i Norge-kartet
    k[(k != 3) & np.isnan(h)] = 3
    tex = farge(k, np.full(k.shape + (3,), np.nan, np.float32))
    return h, tex


def fliser_av(h, tex, b, z, zmin, innenfor):
    """Fra nivå z ned til zmin: høyde- og kartfliser innenfor flisområdet (funksjon av nivå)."""
    hf, kf = [], []
    Lh, Lt = Lerret.fra(h, b, z, np.nan), Lerret.fra(tex, b, z, 0)
    while Lh.z >= zmin:
        inn = innenfor(Lh.z)
        for x, y, t in Lh.fliser(kant=1, innenfor=inn):
            if not np.all(np.isnan(t[1:-1, 1:-1])): hf.append(((Lh.z, x, y), kod_hoyde(t, Lh.z)))
        vann = np.array(PAL[3], np.uint8)
        for x, y, t in Lt.fliser(innenfor=inn):
            if (t != vann).any(axis=2).any() and (t != 0).any(): kf.append(((Lt.z, x, y), webp(t)))
        if Lh.z == zmin: break
        Lh, Lt = Lh.ned('snitt'), Lt.ned('snitt')
    return hf, kf

def nær_blokk(bx, by):
    B = tile_bounds(6, bx, by); M = (B[0] - MARG, B[1] - MARG, B[2] + MARG, B[3] + MARG)
    try: h, tex = rute(M, res(NÆR_Z))
    except Exception as e: logg('blokk', bx, by, 'FEIL:', e); raise
    if np.all(np.isnan(h)): return [], []
    return fliser_av(h, tex, M, NÆR_Z, 6, lambda z: flisomraade(bx, by, z))

def fjern():
    """Hele z0-flisen på 512 m, i biter på 1024 × 1024 punkter (z3-fliser)."""
    r = res(FJERN_Z); n = 2 ** 3; Hs = np.full((n * 1024, n * 1024), np.nan, np.float32); Ts = np.zeros((n * 1024, n * 1024, 3), np.uint8)
    def bit(ij):
        i, j = ij; b = tile_bounds(3, i, j)
        h, t = rute(b, r); Hs[j * 1024:(j + 1) * 1024, i * 1024:(i + 1) * 1024] = h; Ts[j * 1024:(j + 1) * 1024, i * 1024:(i + 1) * 1024] = t
        logg('fjern', i, j, 'land', round(float((~np.isnan(h)).mean()), 3))
    with ThreadPoolExecutor(6) as ex: list(ex.map(bit, [(i, j) for j in range(n) for i in range(n)]))
    return fliser_av(Hs, Ts, tile_bounds(0, 0, 0), FJERN_Z, 0, lambda z: None)


def bygg(ut, del_=0, antall=1):
    os.makedirs(ut, exist_ok=True)
    blokker = [(x, y) for y in range(NÆR[1], NÆR[3] + 1) for x in range(NÆR[0], NÆR[2] + 1)][del_::antall]
    hf, kf, lås = [], [], threading.Lock()
    def jobb(xy):
        a, b = nær_blokk(*xy)
        with lås: hf.extend(a); kf.extend(b)
        if a: logg('nær', xy, len(a), 'fliser')
    with ThreadPoolExecutor(8) as ex: list(ex.map(jobb, blokker))
    if del_ == 0 and os.environ.get('OMLAND_FJERN', '1') == '1':
        a, b = fjern(); hf += a; kf += b
    import pickle
    pickle.dump({'hoyde': hf, 'kart': kf}, open(os.path.join(ut, f'omland-{del_}.pkl'), 'wb'))
    logg('del', del_, 'ferdig:', len(hf), 'høydefliser,', len(kf), 'kartfliser')

def samle(ut, inn):
    """ohoyde.pmtiles og okart.pmtiles + manifest.json."""
    import pickle
    from pmtiles.writer import Writer
    from pmtiles.tile import zxy_to_tileid, TileType, Compression
    alle = {}
    for d in inn:
        for f in sorted(os.listdir(d)):
            if f.endswith('.pkl'):
                p = pickle.load(open(os.path.join(d, f), 'rb'))
                for lag in ('hoyde', 'kart'): alle.setdefault(lag, []).extend(p[lag])
    os.makedirs(ut, exist_ok=True); filer, stat = {}, {}
    for lag, fl in alle.items():
        fl.sort(key=lambda t: zxy_to_tileid(*t[0])); navn = f'o{lag}.pmtiles'
        with open(os.path.join(ut, navn), 'wb') as f:
            w = Writer(f)
            for (z, x, y), d in fl: w.write_tile(zxy_to_tileid(z, x, y), d)
            w.finalize({'tile_type': TileType.WEBP, 'tile_compression': Compression.NONE, 'min_zoom': 0, 'max_zoom': NÆR_Z,
                        'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0}, {})
        filer['o' + lag] = [{'fil': navn, 'zmin': 0, 'zmax': NÆR_Z, 'x6': None, 'byte': os.path.getsize(os.path.join(ut, navn)), 'fliser': len(fl)}]
        stat[lag] = len(fl)
    h = hashlib.sha256()
    for n in sorted(filer): h.update(open(os.path.join(ut, filer[n][0]['fil']), 'rb').read())
    tag = 'kart-omland-' + h.hexdigest()[:12]
    from blokker import fastland, svalbard
    man = {'versjon': tag, 'filer': filer, 'statistikk': stat,
           'norge_blokker': fastland(),   # visningen toner Norge-kartet ut mot kanten av disse blokkene
           'kilde': 'Høyde utenfor Norge: Copernicus DEM GLO-90 · Arealtype: ESA WorldCover 2021 (CC BY 4.0)'}
    json.dump(man, open(os.path.join(ut, 'manifest.json'), 'w'), ensure_ascii=False)
    open(os.path.join(ut, 'tag.txt'), 'w').write(tag)
    logg('samlet', tag, stat, {k: v[0]['byte'] // 1_000_000 for k, v in filer.items()}, 'MB')


if __name__ == '__main__':
    if sys.argv[1] == '--samle': samle(sys.argv[2], sys.argv[3:])
    else: bygg(sys.argv[1], *(int(a) for a in sys.argv[2:4]))
