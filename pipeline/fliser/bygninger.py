"""Byggomriss for hele Norge fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL) -> hus.pmtiles.

Hvert bygg får omriss (polygon i EPSG:25833), høyde h (meter) og type t:
  0 bolig (hus), 1 garasje/uthus, 2 næring/kontor/hotell, 3 offentlig (sykehus, rådhus …), 4 landbruk, 5 annet/ukjent,
  6 industri, 7 butikk/handel, 8 kirke/kapell, 9 skole/barnehage, 10 leilighetsbygg, 11 hytte, 12 lager, 13 sykehus, 14 flyplass,
  15 sykehjem/omsorgsbolig, 16 legevakt/legesenter (21. nov)
Utseende (21. nov, når OSM har det): r takform, l etasjer, tf/vf takfarge/veggfarge (0xRRGGBB + 1), m materiale – se utseende().
  (10. nov: finere typer; bygg merket bare building=yes får typen fra amenity/shop/aeroway/office/craft på samme omriss)
Høyde: OSM `height`, ellers `building:levels` × 3 m + 1 m (tak), ellers anslag etter type (se HØYDE).
Fliser: z12 (forenklet, bygg over 30 m²) og z13 (alle). Et bygg legges i alle fliser omrisset berører (med margin),
så visningen kan tegne det helt selv om det krysser en flisgrense. Egenskapen i = byggets nummer (for 3D, uten dubletter).

Kjeder (11. nov, brukeren: «en Kiwi blir en grønn butikk som heter Pære»): k = kjedens nummer (KJEDER) fra brand/name på bygget,
eller fra et butikkpunkt (node med shop/amenity) som ligger inne i bygget. Spillet viser en oppdiktet parodi (BUTIKKER i index.html).
Anlegg (lag «anlegg», bare z13): a = 1 fotballbane, 2 tennis, 3 annen ballbane, 4 løpebane, 5 lekeplass, 6 parkeringsplass,
7 rullebane (linjen gjort til flate med bredden, r = banenummer som «01/19»), 8 taksebane, 9 oppstillingsplass (apron).
Punkter (lag «punkt», bare z13): p = 1 bensinstasjon (amenity=fuel, node eller midten av området), k = kjede.
Industritype (28. nov, ut8-industri, brukeren: «korrekt innredning» per industri): ind = nummeret i IND (1 tømmer/sagbruk … 14 kjemi/plast),
fra merkene på bygget (industrial/craft/man_made/power/amenity/navnet), ellers fra et punkt inne i bygget (node med industrial/craft …),
ellers fra det minste industriområdet bygget står i (landuse=industrial/quarry/port/harbour + industrial=*, man_made=works + product,
power=plant/substation, amenity=recycling …). Skrives bare når den er kjent. Bygg merket bare building=yes (t 5) inne i et
industriområde blir t 6 (industri) eller 12 (lager i havn/depot) når de er minst 60 m².

Bruk: python3 bygninger.py INN.osm.pbf UTMAPPE [PUNKT.osm.pbf]     -> UTMAPPE/hus-0.pmtiles + manifest.json
"""
import os, sys, json, gzip, time, hashlib, numpy as np
import osmium
from pyproj import Transformer
from shapely.geometry import Polygon, Point, box
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
    # (21. nov, runde 15: helsebygg) 15 sykehjem/omsorgsbolig, 16 legevakt/legesenter/helsehus
    **dict.fromkeys(['nursing_home'], 15),
    **dict.fromkeys(['clinic'], 16),
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
    if am == 'hospital': return 13
    h = helse_type(tags)
    if h: return h
    if am == 'place_of_worship': return 8
    if am in ('school', 'kindergarten', 'college', 'university'): return 9
    if tags.get('shop') or am in ('marketplace', 'fuel', 'restaurant', 'cafe', 'fast_food', 'pharmacy', 'bank'): return 7
    if tags.get('office') or tags.get('tourism') in ('hotel', 'motel', 'hostel'): return 2
    if tags.get('craft') or tags.get('industrial') or tags.get('man_made') == 'works': return 6
    if am in ('townhall', 'fire_station', 'police', 'library', 'community_centre', 'courthouse'): return 3
    return None

# Helsebygg (21. nov, runde 15, brukeren: «eldrehjem er vanlige bygg – sykehjem, legevakter, sykehus»):
# 15 = sykehjem/omsorgsbolig (amenity=nursing_home, social_facility=nursing_home/assisted_living/group_home),
# 16 = legevakt, legesenter, tannlege, helsehus (amenity=clinic/doctors/dentist, healthcare=*).
# De er ofte merket building=residential/apartments/commercial med amenity på samme omriss, så amenity vinner over de vanlige typene.
HELSE_OVER = {'yes', 'residential', 'apartments', 'commercial', 'public', 'civic', 'office', 'dormitory', 'government', 'house', 'detached'}
def helse_type(tags):
    am, sf, hc = tags.get('amenity'), tags.get('social_facility'), tags.get('healthcare')
    if am == 'nursing_home' or (am == 'social_facility' and sf in (None, 'nursing_home', 'assisted_living', 'group_home')) or hc == 'nursing_home': return 15
    if am in ('clinic', 'doctors', 'dentist') or hc in ('clinic', 'doctor', 'centre', 'dentist', 'physiotherapist'): return 16
    return None
def bygg_type(b, tags):
    """Vår type for et bygg: building=* (TYPE), helsebygg fra amenity også på vanlige boligtyper, ellers andre merker når building=yes."""
    t = TYPE.get(b)
    if b in HELSE_OVER and t != 13:
        h = helse_type(tags)
        if h: return h
    if t is None and b == 'yes': t = type_fra_merker(tags)
    return t if t is not None else 5

# Tak, etasjer, farger og materiale (21. nov, runde 15, «bygg fra virkeligheten»): det OSM vet om utseendet, når det er merket.
# r = takform (roof:shape), l = etasjer (building:levels), tf/vf = takfarge/veggfarge som 0xRRGGBB + 1 (roof:colour, building:colour),
# m = veggmateriale (building:material). Mangler merket, skrives ingenting (fila blir ikke større for bygg uten merker).
TAKFORM = {'flat': 1, 'gabled': 2, 'hipped': 3, 'half-hipped': 4, 'pyramidal': 5, 'mansard': 6, 'gambrel': 7, 'skillion': 8,
           'dome': 9, 'onion': 9, 'round': 10, 'saltbox': 2, 'side_hipped': 4, 'cross_gabled': 2}
MATERIALE = {'wood': 1, 'timber_framing': 1, 'brick': 2, 'stone': 3, 'sandstone': 3, 'granite': 3, 'plaster': 4, 'stucco': 4,
             'concrete': 5, 'glass': 6, 'metal': 7, 'metal_plates': 7, 'steel': 7, 'cement_block': 5}
FARGENAVN = {'white': 0xf2f0ea, 'black': 0x2b2b2b, 'grey': 0x8a8a88, 'gray': 0x8a8a88, 'darkgrey': 0x555555, 'darkgray': 0x555555,
             'lightgrey': 0xc8c8c4, 'lightgray': 0xc8c8c4, 'red': 0x9a3a2c, 'darkred': 0x6e2a22, 'brown': 0x6b4a34, 'maroon': 0x6e2a22,
             'yellow': 0xd8bb64, 'beige': 0xd9ccaf, 'orange': 0xc0673a, 'green': 0x5a7048, 'darkgreen': 0x3f5236, 'blue': 0x55708a,
             'silver': 0xb8bcbe, 'tan': 0xc8ae86, 'cream': 0xeee4cc, 'pink': 0xd4a6a0, 'terracotta': 0xb0573a}
def farge(v):
    """OSM-farge (#rgb, #rrggbb eller navn) -> 0xRRGGBB + 1 (0 = ukjent)."""
    if not v: return 0
    v = str(v).strip().lower().split(';')[0]
    if v.startswith('#'):
        h = v[1:]
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        try: return int(h, 16) + 1 if len(h) == 6 else 0
        except ValueError: return 0
    n = FARGENAVN.get(v.replace(' ', '').replace('_', ''))
    return n + 1 if n is not None else 0
def utseende(tags):
    e = {}
    r = TAKFORM.get((tags.get('roof:shape') or '').strip().lower())
    if r: e['r'] = r
    l = tall(tags.get('building:levels'))
    if l and 0 < l < 200: e['l'] = int(round(l))
    for nøkkel, navn in (('roof:colour', 'tf'), ('building:colour', 'vf')):
        f = farge(tags.get(nøkkel))
        if f: e[navn] = f
    m = MATERIALE.get((tags.get('building:material') or '').strip().lower())
    if m: e['m'] = m
    return e

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


# ---------- INDUSTRITYPEN (28. nov, ut8-industri) ----------
# Nummeret må stemme med Industri.IND i site/dovre-fliser/spill/industri.js. Valgt etter maskinene spillet alt har (produksjon.js:
# sagbruk, steinbrudd/knuser, fiskemottak, mølle, raffineri, smie) og det OSM faktisk skiller på i Norge (sagbruk, fiskeforedling,
# steinbrudd, verft, kraft, lager). 0 = ukjent (spillet anslår da typen fra omgivelsene).
IND = {0: 'ukjent', 1: 'tømmer/sagbruk', 2: 'trevare/snekker', 3: 'olje', 4: 'gass', 5: 'stein/pukk/gruve', 6: 'fisk/sjømat',
       7: 'mat/meieri/slakteri', 8: 'metall/verksted/smie', 9: 'båt/verft', 10: 'kraft/energi', 11: 'lager/logistikk',
       12: 'gjenvinning/avfall', 13: 'bryggeri/drikke', 14: 'kjemi/plast'}
# OSM-verdier (industrial=*, craft=*, product=*, content=*) -> type. Ukjente verdier prøves mot ORD under.
IND_VERDI = {
    **dict.fromkeys(['sawmill', 'timber', 'wood', 'lumber', 'lumber_yard', 'logging', 'wood_processing', 'pulp', 'paper', 'paper_mill', 'pellets'], 1),
    **dict.fromkeys(['furniture', 'carpentry', 'carpenter', 'joiner', 'joinery', 'woodworking', 'cabinet_maker', 'window_construction', 'parquet_layer', 'cooper', 'prefab_houses'], 2),
    **dict.fromkeys(['oil', 'refinery', 'petroleum', 'fuel', 'oil_terminal', 'oil_depot', 'tank_farm', 'diesel', 'petrol', 'oil_and_gas'], 3),
    **dict.fromkeys(['gas', 'lng', 'natural_gas', 'gas_terminal', 'lpg', 'propane'], 4),
    **dict.fromkeys(['quarry', 'mine', 'mining', 'gravel', 'aggregate', 'sand', 'cement', 'concrete', 'asphalt', 'stone', 'stonemason', 'rock', 'crushed_stone', 'minerals', 'concrete_plant'], 5),
    **dict.fromkeys(['fish_processing', 'fishery', 'seafood', 'fish', 'aquaculture', 'fish_farm', 'fish_farming', 'salmon', 'fish_factory', 'shrimp'], 6),
    **dict.fromkeys(['food', 'food_industry', 'food_processing', 'slaughterhouse', 'abattoir', 'dairy', 'bakery', 'meat', 'mill', 'grain', 'flour', 'butcher', 'cheese', 'confectionery', 'cannery', 'grain_silo'], 7),
    **dict.fromkeys(['metal', 'steel', 'metal_processing', 'metal_construction', 'mechanical', 'machine_shop', 'smelter', 'smelting', 'aluminium', 'aluminum', 'foundry', 'welding', 'welder',
                     'engineering', 'blacksmith', 'metalworker', 'machinery', 'ferroalloy', 'ironworks'], 8),
    **dict.fromkeys(['shipyard', 'boatyard', 'ship_building', 'shipbuilding', 'boatbuilder', 'boat_building', 'dry_dock', 'slipway'], 9),
    **dict.fromkeys(['power', 'power_plant', 'electricity', 'heating_station', 'district_heating', 'plant', 'substation', 'generator', 'hydro'], 10),
    **dict.fromkeys(['warehouse', 'logistics', 'depot', 'distribution', 'port', 'storage', 'terminal', 'container_terminal', 'bus_depot', 'harbour', 'freight', 'transport'], 11),
    **dict.fromkeys(['scrap_yard', 'scrapyard', 'scrap', 'recycling', 'waste', 'waste_handling', 'waste_transfer_station', 'wastewater', 'wastewater_plant', 'landfill', 'sewage', 'incinerator'], 12),
    **dict.fromkeys(['brewery', 'distillery', 'winery', 'beverages', 'beverage', 'drinks', 'cider', 'bottling'], 13),
    **dict.fromkeys(['chemical', 'chemicals', 'plastic', 'plastics', 'pharmaceutical', 'paint', 'fertilizer', 'fertiliser', 'rubber', 'chemistry', 'explosives'], 14),
}
# Ord i navnet (norsk og engelsk) – bare når merkene ellers sier at det er industri (se industri_type). Første treff vinner.
IND_ORD = [(9, r'verft|båtbyggeri|skipsbyggeri|slipp(en)?\b|shipyard|boatyard'), (6, r'fisk|sjømat|fryseri|seafood|laks|sild|reker|trandamp|filet|hermetikk'),
           (1, r'sagbruk|\bsag\b|trelast|sawmill|tømmer|høvleri'), (2, r'snekker|møbel|trevare|ferdighus|treindustri|joinery'),
           (13, r'bryggeri|brenneri|brewery|mikrobryggeri'), (7, r'meieri|slakteri|bakeri|mølle|kjøtt|\bmat\b|næringsmiddel|tine\b|nortura|dairy'),
           (3, r'olje|raffineri|petro|oljeterminal|tankanlegg'), (4, r'\bgass\b|gassterminal|\blng\b'),
           (5, r'pukk|steinbrudd|\bgrus|sement|betong|gruve|\bstein|quarry|knuseverk'), (14, r'kjemi|plast|maling|gjødsel|yara\b'),
           (12, r'gjenvinning|skrap|avfall|renovasjon|renseanlegg|recycling'), (10, r'kraftstasjon|kraftverk|transformator|trafo|energi|fjernvarme'),
           (8, r'\bmek\b|mekanisk|verksted|\bstål|metall|sveis|smie|aluminium|støperi'), (11, r'lager|logistikk|terminal|transport|spedisjon')]
IND_ORD_RE = [(n, re.compile(o)) for n, o in IND_ORD]
def ind_verdi(v):
    """En OSM-verdi (kan være «oil;gas») -> industritype (0 = ukjent)."""
    for d in str(v or '').strip().lower().replace(' ', '_').split(';'):
        if d in IND_VERDI: return IND_VERDI[d]
    return 0
def ind_navn(n):
    n = str(n or '').lower()
    if not n.strip(): return 0
    for t, r in IND_ORD_RE:
        if r.search(n): return t
    return 0
def industri_type(tags, bygg=None):
    """Industritypen fra merkene på ett objekt (bygg, punkt eller område). bygg = building=* når det er et bygg.
    Rekkefølgen: industrial=*, craft=*, man_made, power, amenity, landuse/havn, og til sist navnet (bare i industri-sammenheng)."""
    g = lambda k: (tags.get(k) or '').strip().lower()
    for k in ('industrial', 'craft'):
        t = ind_verdi(g(k))
        if t: return t
    mm = g('man_made')
    if mm == 'works':
        t = ind_verdi(g('product')) or ind_navn(tags.get('name'))
        if t: return t
    if mm == 'storage_tank': return {'gas': 4, 'lng': 4, 'water': 0, 'sewage': 12, 'manure': 0}.get(g('content'), 3 if g('content') in ('oil', 'fuel', 'diesel', 'petrol', '') else ind_verdi(g('content')))
    if mm == 'silo': return 7 if g('content') in ('', 'grain', 'wheat', 'barley', 'oats', 'flour', 'fodder') else ind_verdi(g('content')) or 7
    if mm in ('wastewater_plant', 'water_works'): return 12 if mm == 'wastewater_plant' else 0
    if mm in ('mineshaft', 'adit'): return 5
    if g('power') in ('plant', 'substation', 'generator') and g('generator:source') != 'solar': return 10
    if g('amenity') in ('recycling', 'waste_transfer_station') and g('recycling_type') != 'container': return 12
    lu = g('landuse')
    if lu == 'quarry': return 5
    if g('seamark:harbour:category') == 'fishing' or g('harbour:category') == 'fishing': return 6
    if lu in ('port', 'harbour', 'depot'): return 11
    if lu == 'landfill': return 12
    # navnet: bare når bygget/området er industri (building=industrial/warehouse … eller landuse=industrial / man_made=works)
    if (bygg in ('industrial', 'manufacture', 'warehouse', 'storage', 'yes', 'shed', 'hangar', 'service') and (tags.get('name') and (bygg != 'yes' or g('landuse') == 'industrial' or tags.get('industrial') or mm == 'works'))) \
            or (bygg is None and (lu == 'industrial' or mm == 'works')):
        return ind_navn(tags.get('name'))
    return 0
# Områder som gjør bygg til industri (t 5 -> 6) selv uten kjent type
def er_industriområde(tags):
    lu = (tags.get('landuse') or '').lower()
    return lu in ('industrial', 'quarry', 'port', 'harbour', 'depot', 'landfill') or bool(tags.get('industrial')) or tags.get('man_made') == 'works' \
        or tags.get('power') in ('plant', 'substation') or tags.get('amenity') in ('recycling', 'waste_transfer_station') or tags.get('man_made') == 'wastewater_plant'
# byggtypene som kan få typen fra området de står i (ikke boliger, butikker, skoler …)
IND_FRA_OMRÅDE = {1, 2, 5, 6, 12}
IND_MIN_AREAL = 60.0

def tall(s):
    try: return float(str(s).replace(',', '.').split()[0].rstrip('m'))
    except Exception: return None


class Samler(osmium.SimpleHandler):
    def __init__(s):
        super().__init__(); s.tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True)
        s.ringer, s.h, s.t, s.k, s.u = [], [], [], [], []
        s.ind = []                      # industritypen fra byggets egne merker (0 = ukjent)
        s.indpunkt = []                 # punkter med industritype: (x, y, ind)
        s.område = []                   # industriområder: (ring, ind, areal)
        s.anlegg, s.anlegg_t, s.anlegg_r = [], [], []   # ringer, type og banenummer
        s.punkt = []                    # butikkpunkter: (x, y, kjede)
        s.fuel = []                     # bensinstasjoner: (x, y, kjede)
        s.punkter = True                # False: hopp over nodene (byggfila har millioner av noder uten merker)
    def node(s, n):
        if not s.punkter: return
        if n.tags.get('industrial') or n.tags.get('craft') or n.tags.get('man_made') or n.tags.get('power'):
            t = industri_type(n.tags, 'yes')
            if t: x, y = s.tr.transform(n.location.lon, n.location.lat); s.indpunkt.append((x, y, t))
        if not (n.tags.get('shop') or n.tags.get('amenity')): return
        k = kjede(n.tags)
        if k or n.tags.get('amenity') == 'fuel': x, y = s.tr.transform(n.location.lon, n.location.lat)
        if k: s.punkt.append((x, y, k))
        if n.tags.get('amenity') == 'fuel': s.fuel.append((x, y, k))
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
        if (not b or b == 'no') and a.tags.get('amenity') == 'fuel':
            try:
                for ytre in a.outer_rings():
                    xs, ys = s.tr.transform([n.lon for n in ytre], [n.lat for n in ytre]); s.fuel.append((float(np.mean(xs)), float(np.mean(ys)), kjede(a.tags))); break
            except Exception: pass
            return
        if (not b or b == 'no') and er_industriområde(a.tags):
            try:
                for ytre in a.outer_rings():
                    xs, ys = s.tr.transform([n.lon for n in ytre], [n.lat for n in ytre])
                    if len(xs) >= 4:
                        r = np.column_stack([xs, ys]).astype(np.float64)
                        ar = abs(float(np.dot(r[:-1, 0], r[1:, 1]) - np.dot(r[1:, 0], r[:-1, 1]))) / 2
                        s.område.append((r, industri_type(a.tags), ar))
            except Exception: pass
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
                s.ringer.append(np.column_stack([xs, ys]).astype(np.float64)); s.h.append(round(min(max(h, 2), 300), 1)); t = bygg_type(b, a.tags); s.t.append(t if t is not None else 5); s.k.append(kjede(a.tags)); s.u.append(utseende(a.tags)); s.ind.append(industri_type(a.tags, b))
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


def koble_industri(ringer, t, ind, indpunkt=(), område=()):
    """Industritypen til byggene som ikke har den selv: først et punkt inne i bygget, så det minste industriområdet midten står i.
    Bygg merket bare building=yes (t 5) i et industriområde blir t 6 eller 12 (lager). Endrer t og ind. Gir (fra punkt, fra område, ny type)."""
    from shapely import contains_xy
    C = 200.0; rut = {}
    for i, r in enumerate(ringer):
        x0, y0 = r.min(axis=0); x1, y1 = r.max(axis=0)
        for cx in range(int(x0 // C), int(x1 // C) + 1):
            for cy in range(int(y0 // C), int(y1 // C) + 1): rut.setdefault((cx, cy), []).append(i)
    n_p = n_o = n_t = 0; poly = {}
    for x, y, v in indpunkt:
        for i in rut.get((int(x // C), int(y // C)), []):
            if ind[i]: continue
            r = ringer[i]
            if not (r[:, 0].min() <= x <= r[:, 0].max() and r[:, 1].min() <= y <= r[:, 1].max()): continue
            p = poly.get(i) or poly.setdefault(i, Polygon(r))
            if p.is_valid and p.contains(Point(x, y)): ind[i] = v; n_p += 1; break
    if not område: return n_p, 0, 0
    # midtpunktet og arealet til hvert bygg (rammens midte holder: byggene er små mot områdene)
    mid = np.array([(r[:, 0].mean(), r[:, 1].mean()) for r in ringer]) if ringer else np.zeros((0, 2))
    areal = [abs(float(np.dot(r[:-1, 0], r[1:, 1]) - np.dot(r[1:, 0], r[:-1, 1]))) / 2 for r in ringer]
    best = {}   # bygg -> (områdets areal, ind)
    inne = set()
    for ring, v, ar in område:
        x0, y0 = ring.min(axis=0); x1, y1 = ring.max(axis=0)
        kand = set()
        for cx in range(int(x0 // C), int(x1 // C) + 1):
            for cy in range(int(y0 // C), int(y1 // C) + 1): kand.update(rut.get((cx, cy), ()))
        kand = [i for i in kand if t[i] in IND_FRA_OMRÅDE and x0 <= mid[i, 0] <= x1 and y0 <= mid[i, 1] <= y1]
        if not kand: continue
        try: pg = Polygon(ring)
        except Exception: continue
        if not pg.is_valid: pg = pg.buffer(0)
        ja = contains_xy(pg, mid[kand, 0], mid[kand, 1])
        for i, j in zip(kand, ja):
            if not j: continue
            inne.add(i)
            if v and (i not in best or ar < best[i][0]): best[i] = (ar, v)
    for i, (ar, v) in best.items():
        if not ind[i]: ind[i] = v; n_o += 1
    for i in inne:
        if t[i] == 5 and areal[i] >= IND_MIN_AREAL: t[i] = 12 if ind[i] == 11 else 6; n_t += 1
    return n_p, n_o, n_t


def lag_fliser(ringer, h, t, k=None, anlegg=(), anlegg_t=(), anlegg_r=(), fuel=(), u=None, ind=None):
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
        anl, pkt = {}, {}
        if z == 13:
            for j, (x, y, kj) in enumerate(fuel): pkt.setdefault((int((x - X0) // s), int((Y0 - y) // s)), []).append(j)
            for i, r in enumerate(anlegg):
                x0, y0 = r.min(axis=0); x1, y1 = r.max(axis=0)
                for tx in range(int((x0 - X0) // s), int((x1 - X0) // s) + 1):
                    for ty in range(int((Y0 - y1) // s), int((Y0 - y0) // s) + 1): anl.setdefault((tx, ty), []).append(i)
                        
        logg(f'z{z}: {len(per)} fliser, {len(anl)} med anlegg')
        for (tx, ty) in sorted(set(per) | set(anl) | set(pkt)):
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
                    if u and u[i]: e.update(u[i])
                    if ind and ind[i]: e['ind'] = ind[i]
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
            if z == 13 and (tx, ty) in pkt:
                fp = []
                for j in pkt[(tx, ty)]:
                    x, y, kj = fuel[j]; e = {'p': 1}
                    if kj: e['k'] = kj
                    fp.append({'geometry': Point(round((x - minx) * k4), round((maxy - y) * k4)), 'properties': e})
                lag.append({'name': 'punkt', 'features': fp})
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
    n_egne = sum(1 for v in s.ind if v); n_p, n_o, n_t = koble_industri(s.ringer, s.t, s.ind, s.indpunkt, s.område)
    logg('industritype: egne merker', n_egne, 'fra punkt', n_p, 'fra område', n_o, '(områder:', len(s.område), ') ny type industri/lager', n_t)
    # samme stasjon kan være både punkt og område: én per 40 m
    fuel = []
    for x, y, kj in s.fuel:
        nær = next((i for i, (a, b, _) in enumerate(fuel) if abs(a - x) < 40 and abs(b - y) < 40), None)
        if nær is None: fuel.append((x, y, kj))
        elif kj and not fuel[nær][2]: fuel[nær] = (fuel[nær][0], fuel[nær][1], kj)
    logg('bensinstasjoner:', len(fuel))
    fl = lag_fliser(s.ringer, s.h, s.t, s.k, s.anlegg, s.anlegg_t, s.anlegg_r, fuel, s.u, s.ind)
    fil = os.path.join(utmappe, 'hus-0.pmtiles'); l = sorted(fl.items(), key=lambda kv: zxy_to_tileid(*kv[0]))
    with open(fil, 'wb') as f:
        w = Writer(f)
        for (z, x, y), d in l: w.write_tile(zxy_to_tileid(z, x, y), d)
        w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP, 'min_zoom': 12, 'max_zoom': 13,
                    'min_lon_e7': 0, 'min_lat_e7': 0, 'max_lon_e7': 0, 'max_lat_e7': 0, 'center_zoom': 0, 'center_lon_e7': 0, 'center_lat_e7': 0},
                   {'description': 'Byggomriss fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)', 'crs': CRS})
    b = os.path.getsize(fil); tag = 'kart-hus-' + hashlib.sha256(open(fil, 'rb').read()).hexdigest()[:12]
    man = {'versjon': tag, 'kilde': '© OpenStreetMap-bidragsytere (ODbL)', 'filer': {'hus': [{'fil': 'hus-0.pmtiles', 'zmin': 12, 'zmax': 13, 'x6': None, 'byte': b, 'fliser': len(l)}]},
           'statistikk': {'bensinstasjoner': len(fuel), 'bygg': len(s.ringer), 'kjedebygg': sum(1 for v in s.k if v), 'anlegg': len(s.anlegg), 'med_hoyde_eller_etasjer': None, 'med_takform': sum(1 for e in s.u if 'r' in e), 'med_etasjer': sum(1 for e in s.u if 'l' in e), 'med_farge': sum(1 for e in s.u if 'tf' in e or 'vf' in e), 'helse': sum(1 for v in s.t if v in (15, 16)),
                          'industritype': {IND[n]: sum(1 for v in s.ind if v == n) for n in IND if n}, 'industriområder': len(s.område)}}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag)
    logg('ferdig:', len(l), 'fliser,', round(b / 1e6, 1), 'MB,', tag)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
