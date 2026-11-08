"""Lager PMTiles-fliser for Dovre-piloten fra arbeid/ (01_hent.py) og data/dovre (veger, bygg).

Lag (én .pmtiles per lag, alle i flisnettet i felles.py):
  hoyde   – høyde, 258 x 258 px (1 px kant til naboene), tapsfri WebP. h = (R*256 + G) / p - 1000 meter, p = 10 på z12–13
            og 2 ellers (presisjon()), 0 = ingen data.
            z6–z11 fra 8 m-modellen for hele området, z12–z13 fra 2 m-modellen rundt Dombås.
  terreng – arealklasse per 32 m (0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 255 ingen data), tapsfri WebP (R-kanalen).
  kart    – stil 1-fargelagt bakke uten skygge (klientene legger på skygge fra høyden), WebP (ikke AVIF: eldre iOS). z5–z9.
  vektor  – MVT (gzip): lag «veg» (k = E/R/F/K/P/S, alle fra z10) z8–z13 og «bygg» (t = bygningstype) z11–z13.
Klienten bruker nærmeste forelderflis når en flis mangler («overzoom»).
Bruk: python3 02_fliser.py   -> site/dovre-fliser/data/*.pmtiles + manifest.json
Veger og bygg leses fra data/fliser/ (03_veg_bygg.py).
"""
import os, io, json, gzip, numpy as np
from PIL import Image
import pillow_avif  # noqa: F401 (AVIF i Pillow)
from pyproj import Transformer
from shapely.geometry import LineString, Point, box
from shapely import clip_by_rect, STRtree
import mapbox_vector_tile
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from felles import CRS, X0, Y0, TILE, DOVRE, DOMBAS, res, span, tiles_for, tile_bounds

HER = os.path.dirname(os.path.abspath(__file__)); ROT = os.path.join(HER, '..', '..')
ARB = os.path.join(HER, 'arbeid'); UT = os.path.join(ROT, 'site', 'dovre-fliser', 'data'); os.makedirs(UT, exist_ok=True)
STAT = {}


# ---------- lerret: et rutenett-justert bilde over alle fliser som dekker et område ----------
class Lerret:
    def __init__(self, a, tx0, ty0, z): self.a, self.tx0, self.ty0, self.z = a, tx0, ty0, z

    @staticmethod
    def fra(src, bounds, z, fyll):
        t = tiles_for(bounds, z); tx0 = min(x for x, _ in t); ty0 = min(y for _, y in t)
        nx = max(x for x, _ in t) - tx0 + 1; ny = max(y for _, y in t) - ty0 + 1
        a = np.full((ny * TILE, nx * TILE) + src.shape[2:], fyll, src.dtype)
        r = res(z); ox = round((bounds[0] - (X0 + tx0 * span(z))) / r); oy = round(((Y0 - ty0 * span(z)) - bounds[3]) / r)
        a[oy:oy + src.shape[0], ox:ox + src.shape[1]] = src
        return Lerret(a, tx0, ty0, z)

    def ned(self, mate):
        """Halv oppløsning (ett nivå ned). mate: 'snitt' (NaN-sikkert), 'naermest'."""
        tx0, ty0 = self.tx0 // 2, self.ty0 // 2
        px, py = (self.tx0 - 2 * tx0) * TILE, (self.ty0 - 2 * ty0) * TILE
        h, w = self.a.shape[:2]; H = -(-(py + h) // (2 * TILE)) * 2 * TILE; W = -(-(px + w) // (2 * TILE)) * 2 * TILE
        fyll = np.nan if self.a.dtype.kind == 'f' else (255 if self.a.dtype == np.uint8 and self.a.ndim == 2 else 0)
        b = np.full((H, W) + self.a.shape[2:], fyll, self.a.dtype); b[py:py + h, px:px + w] = self.a
        if mate == 'naermest': c = b[0::2, 0::2]
        else:
            r = b.reshape(H // 2, 2, W // 2, 2, *self.a.shape[2:])
            if self.a.dtype.kind == 'f':
                with np.errstate(all='ignore'): c = np.nanmean(r, axis=(1, 3)).astype(self.a.dtype)
            else: c = r.mean(axis=(1, 3)).round().astype(self.a.dtype)
        return Lerret(c, tx0, ty0, self.z - 1)

    def fliser(self, kant=0):
        a = np.pad(self.a, [(kant, kant), (kant, kant)] + [(0, 0)] * (self.a.ndim - 2), mode='edge') if kant else self.a
        for j in range(self.a.shape[0] // TILE):
            for i in range(self.a.shape[1] // TILE):
                yield self.tx0 + i, self.ty0 + j, a[j * TILE:j * TILE + TILE + 2 * kant, i * TILE:i * TILE + TILE + 2 * kant]


# ---------- koding ----------
def webp_tapsfri(rgb): b = io.BytesIO(); Image.fromarray(rgb).save(b, 'WEBP', lossless=True, quality=50, method=4); return b.getvalue()
def avif(rgb, q=45): b = io.BytesIO(); Image.fromarray(rgb).save(b, 'AVIF', quality=q, speed=4); return b.getvalue()
def webp(rgb, q=80): b = io.BytesIO(); Image.fromarray(rgb).save(b, 'WEBP', quality=q, method=4); return b.getvalue()   # virker også på eldre iPhone (AVIF gjør ikke det)

def presisjon(z): return 10 if z >= 12 else 2   # enheter per meter: 0,1 m på z12–13, 0,5 m ellers (målt: ser likt ut, 24 % mindre; samme i visningen)

def kod_hoyde(h, z):
    v = np.where(np.isnan(h), 0, np.clip(np.round((h + 1000) * presisjon(z)), 1, 65535)).astype(np.uint32)
    return webp_tapsfri(np.dstack([(v >> 8), (v & 255), np.zeros_like(v)]).astype(np.uint8))


# ---------- skriving ----------
def skriv(navn, fliser, ttype, komp, beskrivelse):
    fliser = sorted(fliser, key=lambda t: zxy_to_tileid(*t[0]))
    sti = os.path.join(UT, navn + '.pmtiles')
    tr = Transformer.from_crs(CRS, 'EPSG:4326', always_xy=True)
    lo0, la0 = tr.transform(DOVRE[0], DOVRE[1]); lo1, la1 = tr.transform(DOVRE[2], DOVRE[3])
    zs = [z for (z, _, _), _ in fliser]
    with open(sti, 'wb') as f:
        w = Writer(f)
        for (z, x, y), data in fliser: w.write_tile(zxy_to_tileid(z, x, y), data)
        w.finalize({'tile_type': ttype, 'tile_compression': komp, 'min_zoom': min(zs), 'max_zoom': max(zs),
                    'min_lon_e7': int(lo0 * 1e7), 'min_lat_e7': int(la0 * 1e7), 'max_lon_e7': int(lo1 * 1e7), 'max_lat_e7': int(la1 * 1e7),
                    'center_zoom': 9, 'center_lon_e7': int((lo0 + lo1) / 2 * 1e7), 'center_lat_e7': int((la0 + la1) / 2 * 1e7)},
                   {'name': navn, 'description': beskrivelse, 'crs': CRS, 'rutenett': {'x0': X0, 'y0': Y0, 'res0': 16384, 'tile': TILE}})
    per = {}
    for (z, _, _), d in fliser: per.setdefault(z, [0, 0]); per[z][0] += 1; per[z][1] += len(d)
    STAT[navn] = {'byte': os.path.getsize(sti), 'fliser': len(fliser), 'per_niva': {z: {'fliser': n, 'snitt_kb': round(b / n / 1024, 1)} for z, (n, b) in sorted(per.items())}}
    print(navn, round(os.path.getsize(sti) / 1e6, 2), 'MB', len(fliser), 'fliser', flush=True)


# ---------- høyde ----------
def lag_hoyde():
    ut = []
    h8 = np.load(os.path.join(ARB, 'hoyde_8m.npy')); L = Lerret.fra(h8, DOVRE, 11, np.nan); STAT['hoyde_8m'] = [float(np.nanmin(h8)), float(np.nanmax(h8))]
    l9 = None
    while L.z >= 6:
        for x, y, t in L.fliser(kant=1):
            if not np.all(np.isnan(t[1:-1, 1:-1])): ut.append(((L.z, x, y), kod_hoyde(t, L.z)))
        if L.z == 9: l9 = L
        L = L.ned('snitt')
    h2 = np.load(os.path.join(ARB, 'hoyde_2m.npy')); L = Lerret.fra(h2, DOMBAS, 13, np.nan)
    while L.z >= 12:
        for x, y, t in L.fliser(kant=1):
            if not np.isnan(t[1:-1, 1:-1]).any(): ut.append(((L.z, x, y), kod_hoyde(t, L.z)))  # bare hele fliser, ellers brukes z11
        L = L.ned('snitt')
    skriv('hoyde', ut, TileType.WEBP, Compression.NONE, 'Kartverket DTM (CC BY 4.0). h = (R*256+G)/p - 1000 m, p = 10 på z12-13, 2 ellers, 0 = ingen data. 258 px med 1 px kant.')
    return l9


# ---------- terreng + kart fra Landsat ----------
PAL = {0: (128, 116, 96), 1: (64, 82, 48), 2: (136, 128, 86), 3: (22, 30, 38), 4: (222, 220, 208), 5: (150, 142, 88), 6: (108, 104, 70)}

def lag_terreng_og_kart(hoyde9):
    d = np.load(os.path.join(ARB, 'landsat.npz'))
    sc = lambda a: np.clip(a * 0.0000275 - 0.2, 0, 1)
    raw = {k: Lerret.fra(d[k], DOVRE, 9, 0.0).a for k in ['red', 'green', 'blue', 'nir08', 'swir16']}
    R, G, B, N, S = [sc(raw[k]) for k in ['red', 'green', 'blue', 'nir08', 'swir16']]
    finnes = raw['red'] > 0
    dem = hoyde9.a.copy(); dem[np.isnan(dem)] = 0
    assert dem.shape == R.shape, (dem.shape, R.shape)
    ndvi = (N - R) / (N + R + 1e-6); ndwi = (G - N) / (G + N + 1e-6); ndsi = (G - S) / (G + S + 1e-6)
    cls = np.zeros(R.shape, np.uint8)                       # samme terskler som pipeline/dovre/03_classify.py
    cls[ndvi > 0.15] = 2
    cls[(ndvi > 0.5) & (dem < 1050)] = 1                     # skoggrense ~1050 m på Dovre
    cls[(ndvi > 0.55) & (dem < 800) & (S > 0.14)] = 5
    cls[(ndvi > 0.3) & (ndvi < 0.5) & (dem > 800) & (S < 0.1) & (N < 0.2)] = 6
    cls[(ndsi > 0.4) & (G > 0.25)] = 4
    cls[(ndwi > 0.1) & (N < 0.12)] = 3
    cls[~finnes] = 255
    tex = np.zeros(R.shape + (3,), np.float32)
    for k, c in PAL.items(): tex[cls == k] = c
    rgb = np.dstack([R, G, B]); p2, p98 = np.percentile(rgb[finnes], [2, 98]); rgb = np.clip((rgb - p2) / (p98 - p2), 0, 1)
    lum = rgb.mean(axis=2, keepdims=True); tex = tex * (0.75 + 0.5 * lum); tex[cls == 3] = PAL[3]
    tex[~finnes] = (26, 23, 16)
    tex = np.clip(tex, 0, 255).astype(np.uint8)
    STAT['klasser'] = {int(k): int(v) for k, v in zip(*np.unique(cls, return_counts=True))}

    ut = []; L = Lerret(cls, *(hoyde9.tx0, hoyde9.ty0, 9))
    while L.z >= 6:
        for x, y, t in L.fliser():
            if (t != 255).any(): ut.append(((L.z, x, y), webp_tapsfri(np.dstack([t, t, t]))))
        L = L.ned('naermest')
    skriv('terreng', ut, TileType.WEBP, Compression.NONE, 'Arealklasse fra Landsat 5 13.08.1987 (USGS) + høyde. R-kanalen: 0 snaufjell, 1 skog, 2 hei, 3 vann, 4 snø, 5 dyrket, 6 myr, 255 ingen data.')

    ut = []; L = Lerret(tex, hoyde9.tx0, hoyde9.ty0, 9)
    while L.z >= 5:
        for x, y, t in L.fliser():
            if (t != (26, 23, 16)).any(): ut.append(((L.z, x, y), webp(t)))
        L = L.ned('snitt')
    skriv('kart', ut, TileType.WEBP, Compression.NONE, 'Stil 1-farget bakke fra Landsat 5 13.08.1987 (USGS), uten skygge.')


# ---------- vektor ----------
def lag_vektor():
    # data/fliser/ fra 03_veg_bygg.py, allerede i EPSG:25833 og for hele området
    veger = json.load(open(os.path.join(ROT, 'data', 'fliser', 'veger.json')))
    linjer, kat = [], []
    for v in veger:
        if len(v['p']) >= 2: linjer.append(LineString(v['p'])); kat.append(v['c'])
    IKKE_BYGD = {'IG', 'RA', 'GR', 'BR', 'BF'}   # bare tillatelse, eller revet/brent/flyttet
    bygg = [b for b in json.load(open(os.path.join(ROT, 'data', 'fliser', 'bygg.json'))) if b[3] not in IKKE_BYGD]
    punkt = [Point(b[0], b[1]) for b in bygg]
    STAT['veg_bygg'] = {'veglenker': len(linjer), 'bygg': len(bygg)}
    tl, tp = STRtree(linjer), STRtree(punkt)
    VIS = {8: 'ERF', 9: 'ERFK'}  # fra z10 er alle veger med (marsjrutene trenger småvegene; visningen skjuler dem til z11)
    ut = []
    for z in range(8, 14):
        s = span(z); buf = s * 8 / TILE
        for x, y in tiles_for(DOVRE, z):
            minx, miny, maxx, maxy = tile_bounds(z, x, y)
            q = lambda X, Y: (round((X - minx) / s * 4096), round((maxy - Y) / s * 4096))
            lag = []
            vf = []
            for i in tl.query(box(minx - buf, miny - buf, maxx + buf, maxy + buf)):
                if kat[i] not in VIS.get(z, 'ERFKPS'): continue
                g = clip_by_rect(linjer[i], minx - buf, miny - buf, maxx + buf, maxy + buf)
                if g.is_empty: continue
                if z < 13: g = g.simplify(res(z) * 0.5)
                for part in getattr(g, 'geoms', [g]):
                    if part.geom_type != 'LineString' or len(part.coords) < 2: continue
                    c = [q(X, Y) for X, Y in part.coords]
                    c = [p for k, p in enumerate(c) if k == 0 or p != c[k - 1]]
                    if len(c) >= 2: vf.append({'geometry': LineString(c), 'properties': {'k': kat[i]}})
            if vf: lag.append({'name': 'veg', 'features': vf})
            if z >= 11:
                bf = []
                for i in tp.query(box(minx, miny, maxx, maxy)):
                    p = punkt[i]
                    if minx <= p.x < maxx and miny <= p.y < maxy:
                        bf.append({'geometry': Point(*q(p.x, p.y)), 'properties': {'t': int(bygg[i][2])}})
                if bf: lag.append({'name': 'bygg', 'features': bf})
            if lag:
                ut.append(((z, x, y), gzip.compress(mapbox_vector_tile.encode(lag, default_options={'y_coord_down': True, 'extents': 4096}), mtime=0)))
    skriv('vektor', ut, TileType.MVT, Compression.GZIP, 'Veger: NVDB (Statens vegvesen, NLOD). Bygg: matrikkelen (Kartverket, CC BY 4.0).')


if __name__ == '__main__':
    h9 = lag_hoyde()
    lag_terreng_og_kart(h9)
    lag_vektor()
    man = {'rutenett': {'crs': CRS, 'x0': X0, 'y0': Y0, 'res0': 16384, 'tile': TILE},
           'omrade': DOVRE, 'kjerne_2m': DOMBAS,
           'lag': {'hoyde': {'fil': 'hoyde.pmtiles', 'z': [6, 13], 'kant': 1, 'presisjon': {'z12+': 10, 'ellers': 2}},
                   'terreng': {'fil': 'terreng.pmtiles', 'z': [6, 9]},
                   'kart': {'fil': 'kart.pmtiles', 'z': [5, 9]},
                   'vektor': {'fil': 'vektor.pmtiles', 'z': [8, 13]}},
           'statistikk': STAT}
    json.dump(man, open(os.path.join(UT, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(STAT, ensure_ascii=False)[:2000])
