"""Jernbane (Norge og nabolandene) og hovedveger i nabolandene fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)
-> utveg.pmtiles (MVT, z5–z11) i flisnettet. Norges veger kommer ellers fra NVDB (vektor-laget, fra z8); for z5–z7 tas
Norges hovedveger herfra, så kartet har veger også når man zoomer ut.

Lag:
  veg   k: 'E' motorveg/stamveg (motorway, trunk), 'R' primary, 'F' secondary, 'K' tertiary  (samme klasser og farger som NVDB)
        n: 1 = i Norge (visningen bruker NVDB der fra z8, og hopper over disse)
  bane  t: 0 normalspor, 1 smalspor; u: 1 = i tunnel (tegnes svakt i 2D, ikke i 3D)
Hvilke vegklasser på hvilket nivå: se KLASSER. Linjene klippes til flisen (med litt margin) og forenkles etter nivået.

Bruk: python3 utveg.py INN.osm.pbf UTMAPPE   (INN: allerede filtrert med osmium tags-filter, se .github/workflows/utveg.yml)
"""
import os, sys, json, gzip, time, hashlib
import numpy as np
import osmium
from pyproj import Transformer
from shapely.geometry import LineString, box, shape
from shapely.ops import unary_union, transform  # noqa (transform: pyproj-omregning av omrisset)
from shapely.prepared import prep
from shapely import simplify as forenkle
import mapbox_vector_tile
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from felles import CRS, X0, Y0, span, res

T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)

VEG = {'motorway': 'E', 'trunk': 'E', 'primary': 'R', 'secondary': 'F', 'tertiary': 'K'}
KLASSER = {5: 'E', 6: 'ER', 7: 'ER', 8: 'ERF', 9: 'ERFK', 10: 'ERFK', 11: 'ERFK'}   # vegklasser per nivå
LENKER_FRA = 9      # av- og påkjøringer (…_link) fra z9
ZMIN, ZMAX = 5, 11


class Samler(osmium.SimpleHandler):
    def __init__(s):
        super().__init__(); s.tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True); s.linjer = []   # (type, klasse, lenke, koord)
    def way(s, w):
        t = w.tags; hw = t.get('highway'); rw = t.get('railway')
        if rw in ('rail', 'narrow_gauge'):
            if t.get('service') in ('yard', 'siding', 'spur', 'crossover') or t.get('usage') in ('industrial', 'military', 'test'): return
            # klassen: 1 = smalspor, + 2 når sporet går i tunnel (feiljakten 12. nov: spor i tunnel ble tegnet oppå fjellet)
            typ, kl, lenke = 'bane', (1 if rw == 'narrow_gauge' else 0) + (2 if t.get('tunnel') not in (None, 'no') else 0), False
        elif hw:
            base = hw[:-5] if hw.endswith('_link') else hw
            if base not in VEG: return
            typ, kl, lenke = 'veg', VEG[base], hw.endswith('_link')
        else: return
        try: lon = [n.lon for n in w.nodes]; lat = [n.lat for n in w.nodes]
        except osmium.InvalidLocationError: return
        if len(lon) < 2: return
        xs, ys = s.tr.transform(lon, lat)
        s.linjer.append((typ, kl, lenke, np.column_stack([xs, ys])))


def norge():
    """Norges omriss (1986-kommunene, som blokker.py) – bare til å merke norske veger (n = 1)."""
    g = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data', 'norge', 'kommuner1986_s.geojson')))
    tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
    return prep(transform(tr.transform, unary_union([shape(f['geometry']).buffer(0) for f in g['features']])).buffer(300))


def fliser(linjer, n):
    ut = {}
    for z in range(ZMIN, ZMAX + 1):
        s, r, per = span(z), res(z), {}
        for i, (typ, kl, lenke, a) in enumerate(linjer):
            if typ == 'veg' and (kl not in KLASSER[z] or (lenke and z < LENKER_FRA) or (z >= 8 and n[i])): continue
            x0, y0 = a.min(axis=0); x1, y1 = a.max(axis=0)
            for tx in range(int((x0 - X0) // s), int((x1 - X0) // s) + 1):
                if tx < 0: continue
                for ty in range(int((Y0 - y1) // s), int((Y0 - y0) // s) + 1):
                    per.setdefault((tx, ty), []).append(i)
        logg(f'z{z}: {len(per)} fliser')
        for (tx, ty), liste in per.items():
            minx, maxy = X0 + tx * s, Y0 - ty * s; k = 4096 / s; m = s * 0.02
            ramme = box(minx - m, maxy - s - m, minx + s + m, maxy + m)
            lag = {'veg': [], 'bane': []}
            for i in liste:
                typ, kl, lenke, a = linjer[i]
                g = LineString(a)
                if not (a[:, 0].min() >= ramme.bounds[0] and a[:, 0].max() <= ramme.bounds[2] and a[:, 1].min() >= ramme.bounds[1] and a[:, 1].max() <= ramme.bounds[3]):
                    g = g.intersection(ramme)
                if g.is_empty: continue
                g = forenkle(g, r * 0.6)
                for d in (g.geoms if hasattr(g, 'geoms') else [g]):
                    if d.geom_type != 'LineString': continue
                    c = [(round((x - minx) * k), round((maxy - y) * k)) for x, y in d.coords]
                    c = [p for j, p in enumerate(c) if j == 0 or p != c[j - 1]]
                    if len(c) < 2: continue
                    e = {'k': kl, 'n': int(n[i])} if typ == 'veg' else ({'t': kl & 1, 'u': 1} if kl & 2 else {'t': kl})
                    lag[typ].append({'geometry': LineString(c), 'properties': e})
            lagliste = [{'name': nm, 'features': f} for nm, f in lag.items() if f]
            if lagliste:
                ut[(z, tx, ty)] = gzip.compress(mapbox_vector_tile.encode(lagliste, default_options={'y_coord_down': True, 'extents': 4096}), mtime=0)
    return ut


def main(inn, utmappe):
    os.makedirs(utmappe, exist_ok=True)
    s = Samler(); s.apply_file(inn, locations=True, idx='flex_mem'); linjer = s.linjer
    logg('linjer:', len(linjer), {t: sum(1 for l in linjer if l[0] == t) for t in ('veg', 'bane')})
    N = norge(); from shapely.geometry import Point
    # norsk veg: minst to av start, midt og slutt ligger i Norge (fjordene er ikke med i kommuneflatene)
    n = np.array([l[0] == 'veg' and sum(N.contains(Point(*l[3][j])) for j in (0, len(l[3]) // 2, -1)) >= 2 for l in linjer], bool)
    logg('norske veger:', int(n.sum()))
    fl = fliser(linjer, n)
    fil = os.path.join(utmappe, 'utveg.pmtiles'); l = sorted(fl.items(), key=lambda kv: zxy_to_tileid(*kv[0]))
    with open(fil, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in l: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP, 'min_zoom': ZMIN, 'max_zoom': ZMAX,
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0},
                   {'description': 'Jernbane og veger fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)', 'crs': CRS})
    b = os.path.getsize(fil); tag = 'kart-utveg-' + hashlib.sha256(open(fil, 'rb').read()).hexdigest()[:12]
    man = {'versjon': tag, 'kilde': '© OpenStreetMap-bidragsytere (ODbL)',
           'filer': {'utveg': [{'fil': 'utveg.pmtiles', 'zmin': ZMIN, 'zmax': ZMAX, 'x6': None, 'byte': b, 'fliser': len(l)}]},
           'statistikk': {'veger': int(sum(1 for x in linjer if x[0] == 'veg')), 'baner': int(sum(1 for x in linjer if x[0] == 'bane'))}}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    logg('ferdig:', len(l), 'fliser,', round(b / 1e6, 1), 'MB,', tag)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
