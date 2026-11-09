"""Byggomriss for hele Norge fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL) -> hus.pmtiles.

Hvert bygg får omriss (polygon i EPSG:25833), høyde h (meter) og type t:
  0 bolig (hus), 1 garasje/uthus, 2 næring/kontor/hotell, 3 offentlig (sykehus, rådhus …), 4 landbruk, 5 annet/ukjent,
  6 industri, 7 butikk/handel, 8 kirke/kapell, 9 skole/barnehage, 10 leilighetsbygg, 11 hytte, 12 lager, 13 sykehus, 14 flyplass
  (10. nov: finere typer; bygg merket bare building=yes får typen fra amenity/shop/aeroway/office/craft på samme omriss)
Høyde: OSM `height`, ellers `building:levels` × 3 m + 1 m (tak), ellers anslag etter type (se HØYDE).
Fliser: z12 (forenklet, bygg over 30 m²) og z13 (alle). Et bygg legges i alle fliser omrisset berører (med margin),
så visningen kan tegne det helt selv om det krysser en flisgrense. Egenskapen i = byggets nummer (for 3D, uten dubletter).

Kjeder (11. nov, brukeren: «en Kiwi blir en grønn butikk som heter Pære»): k = kjedens nummer (KJEDER) fra brand/name på bygget,
eller fra et butikkpunkt (node med shop/amenity) som ligger inne i bygget. Spillet viser en oppdiktet parodi (BUTIKKER i index.html).
Anlegg (lag «anlegg», bare z13): a = 1 fotballbane, 2 tennis, 3 annen ballbane, 4 løpebane, 5 lekeplass, 6 parkeringsplass,
7 rullebane (linjen gjort til flate med bredden, r = banenummer som «01/19»), 8 taksebane, 9 oppstillingsplass (apron).

Bruk: python3 bygninger.py INN.osm.pbf UTMAPPE [PUNKT.osm.pbf]     -> UTMAPPE/hus-0.pmtiles + manifest.json
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
    **dict.fromkeys(['house', 'detached', 'semidetached_house', 'residential', 'bungalow', 'farm', 'houseboat'], 0),
    **dict.fromkeys(['garage', 'garages', 'shed', 'carport', 'roof', 'boathouse', 'container', 'service', 'toilets', 'storage_tank', 'transformer_tower'], 1),
    **dict.fromkeys(['commercial', 'office', 'hotel', 'parking', 'train_station', 'transportation'], 2),
    **dict.fromkeys(['public', 'civic', 'government', 'fire_station', 'sports_hall', 'stadium', 'museum', 'prison', 'military', 'bunker'], 3),
    **dict.fromkeys(['industrial', 'manufacture'], 6),
    **dict.fromkeys(['warehouse', 'storage'], 12),
    **dict.fromkeys(['hospital'], 13),
    **dict.fromkeys(['hangar', 'terminal'], 14),
    **dict.fromkeys(['retail', 'supermarket', 'kiosk'], 7),
    **dict.fromkeys(['church', 'chapel', 'cathedral'], 8),
    **dict.fromkeys(['school', 'kindergarten', 'university', 'college'], 9),
    **dict.fromkeys(['apartments', 'dormitory', 'terrace'], 10),
    **dict.fromkeys(['cabin', 'hut'], 11),
    **dict.fromkeys(['barn', 'farm_auxiliary', 'cowshed', 'stable', 'greenhouse', 'silo', 'sty'], 4),
}
HØYDE = {'house': 7, 'detached': 7, 'semidetached_house': 7, 'terrace': 8, 'apartments': 15, 'residential': 9, 'dormitory': 12,
         'cabin': 5, 'hut': 4, 'farm': 8, 'bungalow': 5, 'garage': 3, 'garages': 3, 'shed': 2.5, 'carport': 2.5, 'boathouse': 4,
         'commercial': 12, 'office': 18, 'retail': 8, 'industrial': 10, 'warehouse': 9, 'supermarket': 7, 'hotel': 20, 'hospital': 20,
         'school': 10, 'kindergarten': 5, 'university': 18, 'church': 15, 'chapel': 8, 'cathedral': 30, 'barn': 9, 'farm_auxiliary': 6,
         'greenhouse': 4, 'silo': 15, 'stadium': 15, 'parking': 10}

# Når building=yes: typen fra andre merker på samme omriss
def type_fra_merker(tags):
    am, ae = tags.get('amenity'), tags.get('aeroway')
    if ae in ('terminal', 'hangar', 'aerodrome'): return 14
    if am in ('hospital', 'clinic'): return 13
    if am == 'place_of_worship': return 8
    if am in ('school', 'kindergarten', 'college', 'university'): return 9
    if tags.get('shop') or am in ('marketplace', 'fuel', 'restaurant', 'cafe', 'fast_food', 'pharmacy', 'bank'): return 7
    if tags.get('office') or tags.get('tourism') in ('hotel', 'motel', 'hostel'): return 2
    if tags.get('craft') or tags.get('industrial') or tags.get('man_made') == 'works': return 6
    if am in ('townhall', 'fire_station', 'police', 'library', 'community_centre', 'courthouse'): return 3
    return None

# Kjedene (nummeret må stemme med BUTIKKER i site/dovre-fliser/index.html). Første treff vinner (Coop Extra før Coop).
KJEDER = [(1, 'kiwi'), (2, 'rema'), (3, 'extra'), (4, 'prix'), (5, 'mega'), (6, 'obs'), (7, 'meny'), (8, 'spar'), (9, 'joker'),
          (10, 'bunnpris'), (11, 'europris'), (12, 'circle k'), (13, 'esso'), (14, 'shell'), (15, 'uno-x'), (16, 'vinmonopolet'),
          (17, 'apotek 1'), (18, 'vitusapotek'), (19, 'boots'), (20, 'xxl'), (21, 'elkjøp'), (22, 'power'), (23, 'clas ohlson'),
          (24, 'biltema'), (25, 'jernia'), (26, 'narvesen'), (27, '7-eleven'), (28, "mcdonald"), (29, 'burger king'), (30, 'max burger'),
          (31, 'peppes'), (32, 'coop'), (33, 'normal'), (34, 'jysk'), (36, 'nille'), (37, 'mix'), (38, 'yx'), (39, 'st1')]
def kjede(tags):
    tekst = ' '.join(str(tags.get(k) or '') for k in ('brand', 'name', 'operator')).lower()
    if not tekst.strip(): return 0
    for n, ord_ in KJEDER:
        if KJEDE_RE[n].search(tekst): return n
    return 0
import re
KJEDE_RE = {n: re.compile(r'(^|[^a-zæøå0-9])' + re.escape(o) + r'($|[^a-zæøå])') for n, o in KJEDER}   # helt ord: «Sparebank» er ikke Spar

ANLEGG = {'soccer': 1, 'football': 1, 'tennis': 2, 'basketball': 3, 'multi': 3, 'handball': 3, 'volleyball': 3, 'beachvolleyball': 3}
def anlegg_type(tags):
    l = tags.get('leisure')
    if l == 'pitch': return ANLEGG.get((tags.get('sport') or '').split(';')[0], 3)
    if l == 'track': return 4
    if l == 'playground': return 5
    if tags.get('amenity') == 'parking' and tags.get('parking', 'surface') == 'surface': return 6
    if tags.get('aeroway') == 'apron': return 9
    return 0


def tall(s):
    try: return float(str(s).replace(',', '.').split()[0].rstrip('m'))
    except Exception: return None


class Samler(osmium.SimpleHandler):
    def __init__(s):
        super().__init__(); s.tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
        s.ringer, s.h, s.t, s.k = [], [], [], []
        s.anlegg, s.anlegg_t, s.anlegg_r = [], [], []   # ringer, type og banenummer
        s.punkt = []                    # butikkpunkter: (x, y, kjede)
        s.punkter = True                # False: hopp over nodene (byggfila har millioner av noder uten merker)
    def node(s, n):
        if not s.punkter or not (n.tags.get('shop') or n.tags.get('amenity')): return
        k = kjede(n.tags)
        if k: x, y = s.tr.transform(n.location.lon, n.location.lat); s.punkt.append((x, y, k))
    def way(s, w):
        # rullebaner og taksebaner er linjer: gjøres til flater med bredden (width, ellers 45 m / 18 m)
        ae = w.tags.get('aeroway')
        if ae not in ('runway', 'taxiway') or w.tags.get('area') == 'yes': return
        try:
            from shapely.geometry import LineString
            ll = [(n.lon, n.lat) for n in w.nodes]
            if len(ll) < 2: return
            xs, ys = s.tr.transform([p[0] for p in ll], [p[1] for p in ll])
            b = tall(w.tags.get('width')) or (45.0 if ae == 'runway' else 18.0)
            f = LineString(list(zip(xs, ys))).buffer(min(max(b, 10), 80) / 2, cap_style=2, join_style=2)
            if f.is_empty or f.geom_type != 'Polygon': return
            s.anlegg.append(np.asarray(f.exterior.coords, dtype=np.float64)); s.anlegg_t.append(7 if ae == 'runway' else 8)
            s.anlegg_r.append((w.tags.get('ref') or '')[:12] if ae == 'runway' else '')
        except Exception: pass
    def area(s, a):
        b = a.tags.get('building')
        if not b or b == 'no':
            at = anlegg_type(a.tags)
            if at:
                try:
                    for ytre in a.outer_rings():
                        xs, ys = s.tr.transform([n.lon for n in ytre], [n.lat for n in ytre])
                        if len(xs) >= 4: s.anlegg.append(np.column_stack([xs, ys]).astype(np.float64)); s.anlegg_t.append(at); s.anlegg_r.append('')
                except Exception: pass
            return
        try:
            for ytre in a.outer_rings():
                xs, ys = s.tr.transform([n.lon for n in ytre], [n.lat for n in ytre])
                if len(xs) < 4: continue
                h = tall(a.tags.get('height'))
                if h is None:
                    l = tall(a.tags.get('building:levels'))
                    h = l * 3 + 1 if l else HØYDE.get(b, 6)
                s.ringer.append(np.column_stack([xs, ys]).astype(np.float64)); s.h.append(round(min(max(h, 2), 300), 1)); t = TYPE.get(b); t = t if t is not None else (type_fra_merker(a.tags) if b == 'yes' else None); s.t.append(t if t is not None else 5); s.k.append(kjede(a.tags))
        except Exception: pass


def koble_punkter(ringer, k, punkt):
    """Butikkpunktene (shop/amenity-noder med kjede) gir kjeden til bygget de står i."""
    from shapely.geometry import Point
    C = 200.0; rut = {}
    for i, r in enumerate(ringer):
        x0, y0 = r.min(axis=0); x1, y1 = r.max(axis=0)
        for cx in range(int(x0 // C), int(x1 // C) + 1):
            for cy in range(int(y0 // C), int(y1 // C) + 1): rut.setdefault((cx, cy), []).append(i)
    poly, n = {}, 0
    for x, y, kj in punkt:
        for i in rut.get((int(x // C), int(y // C)), []):
            if k[i]: continue
            r = ringer[i]
            if not (r[:, 0].min() <= x <= r[:, 0].max() and r[:, 1].min() <= y <= r[:, 1].max()): continue
            p = poly.get(i) or poly.setdefault(i, Polygon(r))
            if p.is_valid and p.contains(Point(x, y)): k[i] = kj; n += 1; break
    return n


def lag_fliser(ringer, h, t, k=None, anlegg=(), anlegg_t=(), anlegg_r=()):
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
        anl = {}
        if z == 13:
            for i, r in enumerate(anlegg):
                x0, y0 = r.min(axis=0); x1, y1 = r.max(axis=0)
                for tx in range(int((x0 - X0) // s), int((x1 - X0) // s) + 1):
                    for ty in range(int((Y0 - y1) // s), int((Y0 - y0) // s) + 1): anl.setdefault((tx, ty), []).append(i)
                        
        logg(f'z{z}: {len(per)} fliser, {len(anl)} med anlegg')
        for (tx, ty) in sorted(set(per) | set(anl)):
            liste = per.get((tx, ty), [])
            minx, maxy = X0 + tx * s, Y0 - ty * s; k4 = 4096 / s
            f = []
            for i in liste:
                r = ringer[i]
                if tol: r = np.asarray(forenkle(Polygon(r), tol).exterior.coords) if len(r) > 5 else r
                c = [(round((x - minx) * k4), round((maxy - y) * k4)) for x, y in r]
                c = [p for n, p in enumerate(c) if n == 0 or p != c[n - 1]]
                if len(c) >= 4:
                    e = {'h': h[i], 't': t[i], 'i': i}
                    if k and k[i]: e['k'] = k[i]
                    f.append({'geometry': Polygon(c), 'properties': e})
            lag = [{'name': 'hus', 'features': f}] if f else []
            if z == 13 and (tx, ty) in anl:
                fa = []
                for i in anl[(tx, ty)]:
                    c = [(round((x - minx) * k4), round((maxy - y) * k4)) for x, y in anlegg[i]]
                    c = [p for n, p in enumerate(c) if n == 0 or p != c[n - 1]]
                    if len(c) >= 4:
                        e = {'a': anlegg_t[i]}
                        if anlegg_r and anlegg_r[i]: e['r'] = anlegg_r[i]
                        fa.append({'geometry': Polygon(c), 'properties': e})
                if fa: lag.append({'name': 'anlegg', 'features': fa})
            if lag:
                ut[(z, tx, ty)] = gzip.compress(mapbox_vector_tile.encode(lag,
                                                default_options={'y_coord_down': True, 'extents': 4096}), mtime=0)
    return ut


def main(inn, utmappe, punktfil=None):
    os.makedirs(utmappe, exist_ok=True)
    s = Samler()
    if punktfil: s.apply_file(punktfil); s.punkter = False   # butikkpunktene for seg (liten fil), så ikke alle nodene går gjennom Python
    s.apply_file(inn, locations=True, idx='flex_mem'); logg('bygg lest:', len(s.ringer), 'anlegg:', len(s.anlegg), 'butikkpunkter:', len(s.punkt))
    n = koble_punkter(s.ringer, s.k, s.punkt); logg('kjede fra punkt:', n, 'kjedebygg i alt:', sum(1 for v in s.k if v))
    fl = lag_fliser(s.ringer, s.h, s.t, s.k, s.anlegg, s.anlegg_t, s.anlegg_r)
    fil = os.path.join(utmappe, 'hus-0.pmtiles'); l = sorted(fl.items(), key=lambda kv: zxy_to_tileid(*kv[0]))
    with open(fil, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in l: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP, 'min_zoom': 12, 'max_zoom': 13,
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0},
                   {'description': 'Byggomriss fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)', 'crs': CRS})
    b = os.path.getsize(fil); tag = 'kart-hus-' + hashlib.sha256(open(fil, 'rb').read()).hexdigest()[:12]
    man = {'versjon': tag, 'kilde': '© OpenStreetMap-bidragsytere (ODbL)', 'filer': {'hus': [{'fil': 'hus-0.pmtiles', 'zmin': 12, 'zmax': 13, 'x6': None, 'byte': b, 'fliser': len(l)}]},
           'statistikk': {'bygg': len(s.ringer), 'kjedebygg': sum(1 for v in s.k if v), 'anlegg': len(s.anlegg), 'med_hoyde_eller_etasjer': None}}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    logg('ferdig:', len(l), 'fliser,', round(b / 1e6, 1), 'MB,', tag)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
