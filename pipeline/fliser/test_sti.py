"""Test av stiene i utveg.py (R19-5): reglene for hvilke stier som tas med, merkede ruter fra relasjoner, tettstedsmasken
og at laget «sti» kommer i z11-flisene (og ikke lenger ute). Kjør: python3 pipeline/fliser/test_sti.py"""
import os, sys, gzip, json, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utveg as U
import mapbox_vector_tile
from pyproj import Transformer
from felles import CRS, X0, Y0, span

feil = 0
def sjekk(navn, ok, info=''):
    global feil
    print(('ok   ' if ok else 'FEIL ') + navn + (('  ' + str(info)) if info else ''))
    if not ok: feil += 1

E = U.sti_egenskaper
sjekk('sti tas med', E({'highway': 'path'}) == {'t': 0, 'm': 0, 's': 0, 'v': 0})
sjekk('fortau tas ikke med', E({'highway': 'footway', 'footway': 'sidewalk'}) is None)
sjekk('gangfelt tas ikke med', E({'highway': 'footway', 'footway': 'crossing'}) is None)
sjekk('asfaltert gangveg tas ikke med', E({'highway': 'footway', 'surface': 'asphalt'}) is None)
sjekk('opplyst lysløype tas ikke med', E({'highway': 'path', 'lit': 'yes'}) is None)
sjekk('fast traktorveg (grade1) tas ikke med', E({'highway': 'track', 'tracktype': 'grade1'}) is None)
sjekk('traktorveg grade4 er t = 1', E({'highway': 'track', 'tracktype': 'grade4'})['t'] == 1)
sjekk('vanlig veg er ikke sti', E({'highway': 'tertiary'}) is None)
sjekk('sti i tunnel tas ikke med', E({'highway': 'path', 'tunnel': 'yes'}) is None)
e = E({'highway': 'path', 'sac_scale': 'demanding_mountain_hiking', 'trail_visibility': 'intermediate', 'osmc:symbol': 'red:white:red_T'})
sjekk('sac_scale, synlighet og osmc:symbol', e == {'t': 0, 'm': 1, 's': 3, 'v': 2}, e)
sjekk('DNT som operatør gir merket', E({'highway': 'path', 'operator': 'DNT Oslo og Omegn'})['m'] == 1)
sjekk('turistforening gir merket', E({'highway': 'path', 'operator': 'Stavanger Turistforening'})['m'] == 1)
sjekk('route=hiking er merket rute', U.merket_rute({'type': 'route', 'route': 'hiking'}))
sjekk('foreslått rute er ikke merket', not U.merket_rute({'route': 'hiking', 'state': 'proposed'}))
sjekk('bussrute er ikke tur-rute', not U.merket_rute({'route': 'bus'}))

# tettstedsmasken: en firkant 0–1000 med et hull 400–600 (delta-kodet som infra.py)
def d(r):
    ut, px, py = [], 0, 0
    for i, (x, y) in enumerate(r): ut += [x, y] if i == 0 else [x - px, y - py]; px, py = x, y
    return ut
infra = {'lag': {'tettsted': [[1, 'Prøveby', 900, [d([(0, 0), (1000, 0), (1000, 1000), (0, 1000), (0, 0)]), d([(400, 400), (600, 400), (600, 600), (400, 600), (400, 400)])]]]}}
inne = U.tettsted_maske(infra)
sjekk('inne i tettstedet', inne(100, 100))
sjekk('i hullet er ikke inne', not inne(500, 500))
sjekk('utenfor er ikke inne', not inne(2000, 100))

# en liten OSM-fil: to stier i Dovrefjell (én i en merket rute), et fortau, og en sti inne i «tettstedet»
tr = Transformer.from_crs(CRS, 'EPSG:4326', always_xy=True)
def ll(x, y): return tr.transform(x, y)
x0, y0 = 205000.0, 6920000.0
punkter = {1: (x0, y0), 2: (x0 + 300, y0 + 120), 3: (x0 + 700, y0 + 150), 4: (x0 + 50, y0 - 300), 5: (x0 + 400, y0 - 320),
           6: (x0 - 200, y0 + 400), 7: (x0 - 100, y0 + 500)}
osm = ['<?xml version="1.0" encoding="UTF-8"?>', '<osm version="0.6" generator="test">']
for i, (x, y) in punkter.items():
    lo, la = ll(x, y); osm.append(f'<node id="{i}" version="1" lat="{la:.8f}" lon="{lo:.8f}"/>')
def way(i, nd, tags):
    osm.append(f'<way id="{i}" version="1">' + ''.join(f'<nd ref="{n}"/>' for n in nd) + ''.join(f'<tag k="{k}" v="{v}"/>' for k, v in tags.items()) + '</way>')
way(10, [1, 2, 3], {'highway': 'path', 'sac_scale': 'mountain_hiking'})
way(11, [4, 5], {'highway': 'path'})
way(12, [6, 7], {'highway': 'footway', 'footway': 'sidewalk'})
osm.append('<relation id="20" version="1"><member type="way" ref="10" role=""/><tag k="type" v="route"/><tag k="route" v="hiking"/><tag k="operator" v="DNT"/></relation>')
osm.append('</osm>')
mappe = tempfile.mkdtemp(); fil = os.path.join(mappe, 'p.osm'); open(fil, 'w').write('\n'.join(osm))
s = U.Samler(); s.apply_file(fil, locations=True); n = s.merk()
stier = [l for l in s.linjer if l[0] == 'sti']
sjekk('to stier lest (fortauet hoppet over)', len(stier) == 2, len(stier))
sjekk('stien i ruta er merket fra relasjonen', n == 1 and sorted(l[1]['m'] for l in stier) == [0, 1])
# tettsted rundt sti 11 (den andre) -> den tas bort
infra2 = {'lag': {'tettsted': [[2, 'Bygd', 500, [d([(x0 - 10, y0 - 400), (x0 + 500, y0 - 400), (x0 + 500, y0 - 200), (x0 - 10, y0 - 200), (x0 - 10, y0 - 400)])]]]}}
igjen = U.bort_i_tettsted(s.linjer, U.tettsted_maske(infra2))
sjekk('stien i tettstedet tas bort', len([l for l in igjen if l[0] == 'sti']) == 1)
import numpy as np
fl = U.fliser(igjen, np.zeros(len(igjen), bool))
z = 11; sp = span(z); tx, ty = int((x0 - X0) // sp), int((Y0 - y0) // sp)
sjekk('ingen stier før z11', not any(k[0] < 11 for k in fl), sorted(set(k[0] for k in fl)))
t = mapbox_vector_tile.decode(gzip.decompress(fl[(z, tx, ty)]), default_options={'y_coord_down': True})
f = t.get('sti', {}).get('features', [])
sjekk('z11-flisen har laget sti', len(f) == 1, len(f))
if f:
    p = f[0]['properties']; sjekk('egenskapene følger med', p == {'t': 0, 'm': 1, 's': 2, 'v': 0}, p)
    sjekk('stien er ikke forenklet bort (3 punkt)', len(f[0]['geometry']['coordinates']) == 3, f[0]['geometry']['coordinates'])
print('test_sti:', 'FEIL' if feil else 'alt ok', f'({feil} feil)')
sys.exit(1 if feil else 0)
