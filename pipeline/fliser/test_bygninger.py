"""Test for kjedene og anleggene i bygninger.py: python3 pipeline/fliser/test_bygninger.py"""
import os, sys, json; sys.path.insert(0, os.path.dirname(__file__))
from bygninger import kjede, anlegg_type, bygg_type, utseende, farge, lag_fliser
feil = 0
for navn, ventet in [('KIWI Dombås', 1), ('Sparebank 1 SMN', 0), ('Coop Extra Lesja', 3), ('Coop Marked Dovre', 32), ('REMA 1000', 2),
                     ('Bunnpris Otta', 10), ('Circle K Dombås', 12), ("McDonald's", 28), ('Joker Hjerkinn', 9), ('Vitusapotek', 18), ('Kiwiklubben', 0)]:
    k = kjede({'name': navn}); ok = k == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{navn} -> {k}')
for tags, ventet in [({'leisure': 'pitch', 'sport': 'soccer'}, 1), ({'leisure': 'pitch', 'sport': 'tennis'}, 2), ({'leisure': 'track'}, 4),
                     ({'amenity': 'parking'}, 6), ({'amenity': 'parking', 'parking': 'underground'}, 0)]:
    a = anlegg_type(tags); ok = a == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{tags} -> {a}')
# (21. nov, runde 15) helsebygg og utseende fra OSM
for b, tags, ventet in [('yes', {'amenity': 'nursing_home'}, 15), ('residential', {'amenity': 'nursing_home'}, 15), ('nursing_home', {}, 15),
                        ('yes', {'amenity': 'social_facility', 'social_facility': 'nursing_home'}, 15), ('yes', {'amenity': 'social_facility', 'social_facility': 'food_bank'}, 5),
                        ('yes', {'amenity': 'clinic'}, 16), ('commercial', {'amenity': 'doctors'}, 16), ('hospital', {'amenity': 'clinic'}, 13),
                        ('yes', {'amenity': 'hospital'}, 13), ('house', {}, 0), ('garage', {'amenity': 'clinic'}, 1), ('yes', {}, 5), ('church', {}, 8)]:
    t = bygg_type(b, tags); ok = t == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'building={b} {tags} -> {t}')
for tags, ventet in [({'roof:shape': 'gabled', 'building:levels': '2', 'roof:colour': 'red', 'building:colour': '#fff'}, {'r': 2, 'l': 2, 'tf': 0x9a3a2c + 1, 'vf': 0xffffff + 1}),
                     ({'roof:shape': 'hipped', 'building:material': 'brick'}, {'r': 3, 'm': 2}), ({'roof:colour': 'blåaktig'}, {}), ({}, {}),
                     ({'building:levels': '3;4', 'roof:shape': 'Flat'}, {'r': 1})]:
    e = utseende(tags); ok = e == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'{tags} -> {e}')
ok = farge('#abc') == 0xaabbcc + 1 and farge('dark grey') == 0x555555 + 1 and farge('#12345') == 0; feil += not ok; print(('ok   ' if ok else 'FEIL ') + 'farge()')
# feltene havner i flisa (og bygg uten merker får ingen ekstra felt)
import numpy as np, gzip, mapbox_vector_tile
from felles import X0, Y0, span
sp = span(13); x0, y0 = X0 + 100 * sp + 100, Y0 - 100 * sp - 300
R = [np.array([[x0, y0], [x0 + 10, y0], [x0 + 10, y0 + 8], [x0, y0 + 8], [x0, y0]], float), np.array([[x0 + 30, y0], [x0 + 40, y0], [x0 + 40, y0 + 8], [x0 + 30, y0 + 8], [x0 + 30, y0]], float)]
fl = lag_fliser(R, [7, 8], [0, 15], [0, 0], u=[{'r': 2, 'vf': 0xf2f0ea + 1}, {}])
d = mapbox_vector_tile.decode(gzip.decompress(fl[(13, 100, 100)]), default_options={'y_coord_down': True})
pr = sorted([f['properties'] for f in d['hus']['features']], key=lambda p: p['i'])
ok = pr[0].get('r') == 2 and pr[0].get('vf') == 0xf2f0ea + 1 and 'r' not in pr[1] and pr[1]['t'] == 15; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'flisa: {pr}')

# ---------- INDUSTRITYPEN (28. nov, ut8-industri) ----------
from bygninger import industri_type, ind_navn, IND
for tags, bygg, ventet in [({'industrial': 'sawmill'}, 'industrial', 1), ({'craft': 'boatbuilder'}, 'yes', 9), ({'craft': 'carpenter'}, None, 2),
                           ({'industrial': 'oil;gas'}, None, 3), ({'man_made': 'works', 'product': 'gravel'}, None, 5), ({'man_made': 'storage_tank', 'content': 'gas'}, None, 4),
                           ({'man_made': 'storage_tank', 'content': 'water'}, None, 0), ({'power': 'substation'}, None, 10), ({'power': 'generator', 'generator:source': 'solar'}, None, 0),
                           ({'landuse': 'quarry'}, None, 5), ({'landuse': 'harbour', 'seamark:harbour:category': 'fishing'}, None, 6), ({'landuse': 'port'}, None, 11),
                           ({'amenity': 'recycling', 'recycling_type': 'centre'}, None, 12), ({'amenity': 'recycling', 'recycling_type': 'container'}, None, 0),
                           ({'name': 'Nergård Fiskemottak'}, 'industrial', 6), ({'name': 'Fiskebutikken'}, 'yes', 0), ({'name': 'Dovre Sag'}, 'industrial', 1),
                           ({'landuse': 'industrial', 'name': 'Otta Mek. Verksted'}, None, 8), ({'industrial': 'brewery'}, None, 13), ({'industrial': 'factory'}, None, 0),
                           ({'industrial': 'slaughterhouse'}, None, 7), ({'industrial': 'chemical'}, None, 14), ({'industrial': 'scrap_yard'}, None, 12), ({}, 'industrial', 0)]:
    v = industri_type(tags, bygg); ok = v == ventet; feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'industri {bygg} {tags} -> {v} ({IND.get(v)})')

# Hele byggjobben på en liten syntetisk .osm (Geofabrik er stengt herfra; den ekte kjøringen skjer i GitHub Actions)
import tempfile
from pyproj import Transformer
from pmtiles.reader import Reader, MmapSource, all_tiles
import bygninger
tr = Transformer.from_crs(bygninger.CRS, 'EPSG:4326', always_xy=True)
X, Y = 195000.0, 6896000.0     # Dombås
noder, veier, nid, wid = [], [], [1], [1]
def node(x, y, tags=None):
    lon, lat = tr.transform(x, y); i = nid[0]; nid[0] += 1; noder.append((i, lon, lat, tags or {})); return i
def firkant(x0, y0, b, d, tags):
    ids = [node(x0, y0), node(x0 + b, y0), node(x0 + b, y0 + d), node(x0, y0 + d)]; ids.append(ids[0]); i = wid[0]; wid[0] += 1; veier.append((i, ids, tags)); return i
def esc(v): return str(v).replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')
def skriv(fil, nod, vei):
    with open(fil, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<osm version="0.6" generator="test">\n')
        for i, lon, lat, tg in nod:
            f.write(f'<node id="{i}" version="1" lat="{lat:.8f}" lon="{lon:.8f}">' + ''.join(f'<tag k="{esc(k)}" v="{esc(v)}"/>' for k, v in tg.items()) + '</node>\n')
        for i, ids, tg in vei:
            f.write(f'<way id="{i}" version="1">' + ''.join(f'<nd ref="{n}"/>' for n in ids) + ''.join(f'<tag k="{esc(k)}" v="{esc(v)}"/>' for k, v in tg.items()) + '</way>\n')
        f.write('</osm>\n')
PRØVE = [  # (navn, x, y, b, d, merker, ventet t, ventet ind)
    ('sagbruk på bygget', 0, 0, 30, 20, {'building': 'industrial', 'industrial': 'sawmill'}, 6, 1),
    ('båtbygger (craft)', 100, 0, 20, 15, {'building': 'yes', 'craft': 'boatbuilder'}, 6, 9),
    ('yes i fiskeforedling', 1010, 1010, 25, 20, {'building': 'yes'}, 6, 6),
    ('lager i havna', 2010, 10, 40, 20, {'building': 'warehouse'}, 12, 11),
    ('lite skur i industriområde', 3010, 10, 5, 5, {'building': 'yes'}, 5, 0),
    ('yes i industriområde uten type', 3030, 10, 12, 10, {'building': 'yes'}, 6, 0),
    ('punkt i bygget (pukkverk)', 4000, 0, 30, 30, {'building': 'industrial'}, 6, 5),
    ('bolig i oljeområde', 5010, 10, 10, 8, {'building': 'house'}, 0, 0),
    ('bryggeri inne i lagerområde', 6050, 50, 20, 20, {'building': 'yes'}, 6, 13),
    ('fiskemottak i navnet', 7000, 0, 20, 20, {'building': 'industrial', 'name': 'Nergård Fiskemottak'}, 6, 6),
    ('trafo i transformatorstasjon', 8010, 10, 6, 6, {'building': 'transformer_tower'}, 1, 10),
]
for navn, dx, dy, b, d, tg, *_ in PRØVE: firkant(X + dx, Y + dy, b, d, tg)
# områdene (uten building): fiskeforedling, havn, industri uten type, oljeterminal, et stort lagerområde med et bryggeri inni, trafostasjon
firkant(X + 1000, Y + 1000, 60, 60, {'landuse': 'industrial', 'industrial': 'fish_processing'})
firkant(X + 2000, Y, 100, 60, {'landuse': 'port'})
firkant(X + 3000, Y, 80, 80, {'landuse': 'industrial'})
firkant(X + 5000, Y, 50, 50, {'landuse': 'industrial', 'industrial': 'oil'})
firkant(X + 6000, Y, 200, 200, {'landuse': 'industrial', 'industrial': 'warehouse'})
firkant(X + 6040, Y + 40, 40, 40, {'industrial': 'brewery'})
firkant(X + 8000, Y, 30, 30, {'power': 'substation'})
punkter = []
nid_p = [900000]
lon, lat = tr.transform(X + 4015, Y + 15); punkter.append((900001, lon, lat, {'man_made': 'works', 'product': 'gravel', 'name': 'Pukkverket'}))
lon, lat = tr.transform(X + 9000, Y); punkter.append((900002, lon, lat, {'shop': 'supermarket', 'name': 'KIWI Dombås'}))
with tempfile.TemporaryDirectory() as tmp:
    inn, pf, ut = os.path.join(tmp, 'bygg.osm'), os.path.join(tmp, 'punkt.osm'), os.path.join(tmp, 'ut')
    skriv(inn, noder, veier); skriv(pf, punkter, [])
    bygninger.main(inn, ut, pf)
    funnet = {}
    with open(os.path.join(ut, 'hus-0.pmtiles'), 'rb') as f:
        for (z, x, y), d in all_tiles(MmapSource(f)):
            if z != 13: continue
            dek = mapbox_vector_tile.decode(gzip.decompress(d), default_options={'y_coord_down': True})
            for ft in dek.get('hus', {}).get('features', []): funnet[ft['properties']['i']] = ft['properties']
    man = json.load(open(os.path.join(ut, 'manifest.json')))
import json
for i, (navn, dx, dy, b, d, tg, vt, vi) in enumerate(PRØVE):
    e = funnet.get(i, {}); ok = e.get('t') == vt and e.get('ind', 0) == vi; feil += not ok
    print(('ok   ' if ok else 'FEIL ') + f'byggjobben: {navn} -> t {e.get("t")}, ind {e.get("ind", 0)} (ventet t {vt}, ind {vi})')
ok = all('ind' not in e for e in funnet.values() if not e.get('ind')) and man['statistikk']['industritype'].get('fisk/sjømat') == 2 and man['statistikk']['industriområder'] == 7
feil += not ok; print(('ok   ' if ok else 'FEIL ') + f'manifestet: {man["statistikk"]["industritype"]}, områder {man["statistikk"]["industriområder"]}')

sys.exit(1 if feil else 0)
