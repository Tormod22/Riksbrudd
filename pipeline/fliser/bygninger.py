"""Byggomriss for hele Norge fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL) -> hus.pmtiles.

Hvert bygg får omriss (polygon i EPSG:25833), høyde h (meter) og type t:
  0 bolig, 1 garasje/uthus, 2 næring/kontor/industri, 3 offentlig (skole, kirke, sykehus), 4 landbruk, 5 annet/ukjent
Høyde: OSM `height`, ellers `building:levels` × 3 m + 1 m (tak), ellers anslag etter type (se HØYDE).
Fliser: z12 (forenklet, bygg over 30 m²) og z13 (alle). Et bygg legges i alle fliser omrisset berører (med margin),
så visningen kan tegne det helt selv om det krysser en flisgrense. Egenskapen i = byggets nummer (for 3D, uten dubletter).

Bruk: python3 bygninger.py INN.osm.pbf UTMAPPE      -> UTMAPPE/hus-0.pmtiles + manifest.json
"""
import os, sys, json, gzip, time, hashlib, numpy as np
import osmium
from pyproj import Transformer
from shapely.geometry import Polygon, box
from shapely import simplify as forenkle
import mapbox_vector_tile
from pmtiles.writer import Writer
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from felles import CRS, X0, Y0, TILE, span

T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)

TYPE = {  # OSM building=* -> vår type
    **dict.fromkeys(['house', 'detached', 'semidetached_house', 'terrace', 'apartments', 'residential', 'dormitory', 'bungalow', 'cabin', 'farm', 'hut', 'houseboat'], 0),
    **dict.fromkeys(['garage', 'garages', 'shed', 'carport', 'roof', 'boathouse', 'kiosk', 'container', 'service', 'toilets', 'storage_tank', 'transformer_tower'], 1),
    **dict.fromkeys(['commercial', 'office', 'retail', 'industrial', 'warehouse', 'supermarket', 'hotel', 'manufacture', 'parking', 'train_station', 'transportation', 'hangar'], 2),
    **dict.fromkeys(['school', 'kindergarten', 'university', 'college', 'hospital', 'church', 'chapel', 'cathedral', 'public', 'civic', 'government', 'fire_station', 'sports_hall', 'stadium', 'museum', 'prison', 'military', 'bunker'], 3),
    **dict.fromkeys(['barn', 'farm_auxiliary', 'cowshed', 'stable', 'greenhouse', 'silo', 'sty'], 4),
}
HØYDE = {'house': 7, 'detached': 7, 'semidetached_house': 7, 'terrace': 8, 'apartments': 15, 'residential': 9, 'dormitory': 12,
         'cabin': 5, 'hut': 4, 'farm': 8, 'bungalow': 5, 'garage': 3, 'garages': 3, 'shed': 2.5, 'carport': 2.5, 'boathouse': 4,
         'commercial': 12, 'office': 18, 'retail': 8, 'industrial': 10, 'warehouse': 9, 'supermarket': 7, 'hotel': 20, 'hospital': 20,
         'school': 10, 'kindergarten': 5, 'university': 18, 'church': 15, 'chapel': 8, 'cathedral': 30, 'barn': 9, 'farm_auxiliary': 6,
         'greenhouse': 4, 'silo': 15, 'stadium': 15, 'parking': 10}

def tall(s):
    try: return float(str(s).replace(',', '.').split()[0].rstrip('m'))
    except Exception: return None


class Samler(osmium.SimpleHandler):
    def __init__(s):
        super().__init__(); s.tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
        s.ringer, s.h, s.t = [], [], []
    def area(s, a):
        b = a.tags.get('building')
        if not b or b == 'no': return
        try:
            for ytre in a.outer_rings():
                xs, ys = s.tr.transform([n.lon for n in ytre], [n.lat for n in ytre])
                if len(xs) < 4: continue
                h = tall(a.tags.get('height'))
                if h is None:
                    l = tall(a.tags.get('building:levels'))
                    h = l * 3 + 1 if l else HØYDE.get(b, 6)
                s.ringer.append(np.column_stack([xs, ys]).astype(np.float64)); s.h.append(round(min(max(h, 2), 300), 1)); s.t.append(TYPE.get(b, 5))
        except Exception: pass


def lag_fliser(ringer, h, t):
    """Fordeler byggene på z12- og z13-fliser etter omrissets ramme (med margin) og koder MVT."""
    ut = {}
    for z, min_areal, tol in ((12, 30.0, 1.0), (13, 0.0, 0.0)):
        s = span(z); marg = 4.0; per = {}
        for i, r in enumerate(ringer):
            x0, y0 = r.min(axis=0); x1, y1 = r.max(axis=0)
            if min_areal and (x1 - x0) * (y1 - y0) < min_areal: continue
            for tx in range(int((x0 - marg - X0) // s), int((x1 + marg - X0) // s) + 1):
                for ty in range(int((Y0 - y1 - marg) // s), int((Y0 - y0 + marg) // s) + 1):
                    per.setdefault((tx, ty), []).append(i)
        logg(f'z{z}: {len(per)} fliser')
        for (tx, ty), liste in per.items():
            minx, maxy = X0 + tx * s, Y0 - ty * s; k = 4096 / s
            f = []
            for i in liste:
                r = ringer[i]
                if tol: r = np.asarray(forenkle(Polygon(r), tol).exterior.coords) if len(r) > 5 else r
                c = [(round((x - minx) * k), round((maxy - y) * k)) for x, y in r]
                c = [p for n, p in enumerate(c) if n == 0 or p != c[n - 1]]
                if len(c) >= 4:
                    f.append({'geometry': Polygon(c), 'properties': {'h': h[i], 't': t[i], 'i': i}})
            if f:
                ut[(z, tx, ty)] = gzip.compress(mapbox_vector_tile.encode([{'name': 'hus', 'features': f}],
                                                default_options={'y_coord_down': True, 'extents': 4096}), mtime=0)
    return ut


def main(inn, utmappe):
    os.makedirs(utmappe, exist_ok=True)
    s = Samler(); s.apply_file(inn, locations=True, idx='flex_mem'); logg('bygg lest:', len(s.ringer))
    fl = lag_fliser(s.ringer, s.h, s.t)
    fil = os.path.join(utmappe, 'hus-0.pmtiles'); l = sorted(fl.items(), key=lambda kv: zxy_to_tileid(*kv[0]))
    with open(fil, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in l: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP, 'min_zoom': 12, 'max_zoom': 13,
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0},
                   {'description': 'Byggomriss fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)', 'crs': CRS})
    b = os.path.getsize(fil); tag = 'kart-hus-' + hashlib.sha256(open(fil, 'rb').read()).hexdigest()[:12]
    man = {'versjon': tag, 'kilde': '© OpenStreetMap-bidragsytere (ODbL)', 'filer': {'hus': [{'fil': 'hus-0.pmtiles', 'zmin': 12, 'zmax': 13, 'x6': None, 'byte': b, 'fliser': len(l)}]},
           'statistikk': {'bygg': len(s.ringer), 'med_hoyde_eller_etasjer': None}}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    logg('ferdig:', len(l), 'fliser,', round(b / 1e6, 1), 'MB,', tag)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
