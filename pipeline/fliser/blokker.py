"""Lister blokkene (z6-fliser, 65,5 × 65,5 km) som dekker Norge, for byggingen i GitHub Actions.
Fastlandet: blokker som berører en 1986-kommune (data/norge/kommuner1986_s.geojson) med 2 km margin.
Svalbard: blokker innenfor Svalbards omriss (grov ramme; land avgjøres av høydedataene).
Bruk: python3 blokker.py [fastland|svalbard|alle]  -> JSON-liste [[x, y], ...]"""
import json, os, sys
from shapely.geometry import shape, box
from shapely.ops import unary_union, transform
from pyproj import Transformer
from felles import CRS, span, tiles_for, tile_bounds

HER = os.path.dirname(os.path.abspath(__file__))
Z = 6

def fastland():
    g = json.load(open(os.path.join(HER, '..', '..', 'data', 'norge', 'kommuner1986_s.geojson')))
    tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
    norge = transform(tr.transform, unary_union([shape(f['geometry']).buffer(0) for f in g['features']])).buffer(2000)
    return sorted((x, y) for x, y in tiles_for(norge.bounds, Z) if norge.intersects(box(*tile_bounds(Z, x, y))))

def svalbard():
    tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
    hjørner = [tr.transform(lo, la) for lo in (10.0, 34.0) for la in (76.3, 80.9)] + [tr.transform(22, la) for la in (76.3, 80.9)]
    xs, ys = [p[0] for p in hjørner], [p[1] for p in hjørner]
    return sorted(tiles_for((min(xs), min(ys), max(xs), max(ys)), Z))

if __name__ == '__main__':
    hva = sys.argv[1] if len(sys.argv) > 1 else 'fastland'
    b = fastland() if hva == 'fastland' else svalbard() if hva == 'svalbard' else fastland() + svalbard()
    print(json.dumps([list(t) for t in b]))
    print(len(b), 'blokker', file=sys.stderr)
