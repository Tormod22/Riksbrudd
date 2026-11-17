"""Kaier, brygger og havner i hele Norge fra OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL) -> kaier.json + manifest.json,
release kart-kaier-<hash>. (17. nov, brukeren: «kan vi få med alle plasser hvor det er kaier, da det senere kan være et strategisk
område å plassere leiren».) Tas i bruk med pipeline/fliser/bruk_kaier.py.

Typer (t):  1 kai eller brygge (man_made=pier/quay), 2 småbåthavn (leisure=marina), 3 havn (harbour=yes, landuse=harbour/port,
            industrial=port, seamark:type=harbour), 4 ferjeterminal (amenity=ferry_terminal).
Det som ligger tett (RUTE = 120 m) slås sammen til ett sted: høyeste type vinner, lengdene av kaiene legges sammen, navnet tas
fra den som har et. Steder som bare har småbrygger under MIN_LENGDE = 15 m til sammen, tas ikke med (private badebrygger).

Formatet (lite, én henting): { n, navn: [...], d: [x, y, t, l, navn] flatt, sortert på x; x og y er forskjellen fra forrige sted
(meter i EPSG:25833), l = samlet kailengde i meter, navn = plass i navnelista + 1 (0 = uten navn) }.

Bruk: python3 kaier.py INN.osm.pbf UTMAPPE   (INN: filtrert med osmium tags-filter, se .github/workflows/kaier.yml)
"""
import os, sys, json, math, time, hashlib

RUTE, MIN_LENGDE = 120, 15
T0 = time.time()
def logg(*a): print(f'[{time.time() - T0:6.0f} s]', *a, flush=True)


def type_fra_merker(t):
    """OSM-merkene -> typen 1–4, eller 0 når objektet ikke er en kai/havn."""
    g = t.get if hasattr(t, 'get') else (lambda k, d=None: d)
    if g('amenity') == 'ferry_terminal': return 4
    if g('harbour') == 'yes' or g('landuse') in ('harbour', 'port') or g('industrial') == 'port' or g('seamark:type') == 'harbour': return 3
    if g('leisure') == 'marina': return 2
    if g('man_made') in ('pier', 'quay'): return 1
    return 0


def lengde(xs, ys):
    """Lengden av en kai: linja som den er; et lukket omriss (flate) regnes som halve omkretsen."""
    n = len(xs)
    if n < 2: return 0.0
    L = sum(math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]) for i in range(n - 1))
    return L / 2 if n > 3 and xs[0] == xs[-1] and ys[0] == ys[-1] else L


def klynger(ting, rute=RUTE, minst=MIN_LENGDE):
    """ting: [(x, y, t, l, navn)] -> steder [(x, y, t, l, navn)]: alt i samme rute på `rute` meter (og naboruter som henger
    sammen med den via samme rute-nøkkel) slås sammen. Enkelt og fast: ruta bestemmer, ikke rekkefølgen."""
    ruter = {}
    for x, y, t, l, navn in ting:
        ruter.setdefault((int(x // rute), int(y // rute)), []).append((x, y, t, l, navn))
    ut = []
    for k in sorted(ruter):
        G = ruter[k]; tmax = max(g[2] for g in G); L = sum(g[3] for g in G if g[2] == 1)
        if tmax == 1 and L < minst: continue
        # stedet står ved den lengste kaien av høyeste type (ikke i snittet, som kan ligge på land eller midt i sundet)
        best = max((g for g in G if g[2] == tmax), key=lambda g: g[3])
        navn = next((g[4] for g in sorted(G, key=lambda g: (-g[2], -g[3])) if g[4]), '')
        ut.append((int(round(best[0])), int(round(best[1])), tmax, int(round(L)), navn))
    return ut


def kode(steder):
    """Steder -> ordboka som lagres (delta-kodet, sortert på x)."""
    S = sorted(steder); navn = []; plass = {}; d = []; fx = fy = 0
    for x, y, t, l, n in S:
        i = 0
        if n:
            if n not in plass: plass[n] = len(navn) + 1; navn.append(n)
            i = plass[n]
        d += [x - fx, y - fy, t, l, i]; fx, fy = x, y
    return {'n': len(S), 'navn': navn, 'd': d}


def dekod(o):
    """Motsatt av kode() (brukes i testen; spill/kaier.js gjør det samme i nettleseren)."""
    ut = []; x = y = 0; d = o['d']
    for i in range(0, len(d), 5):
        x += d[i]; y += d[i + 1]; ut.append((x, y, d[i + 2], d[i + 3], o['navn'][d[i + 4] - 1] if d[i + 4] else ''))
    return ut


def les(inn):
    import osmium
    from pyproj import Transformer
    from felles import CRS

    class Samler(osmium.SimpleHandler):
        def __init__(s):
            super().__init__(); s.tr = Transformer.from_crs('EPSG:4326', CRS, always_xy=True); s.ting = []
        def node(s, n):
            t = type_fra_merker(n.tags)
            if not t or not n.location.valid(): return
            x, y = s.tr.transform(n.location.lon, n.location.lat); s.ting.append((x, y, t, 0.0, n.tags.get('name', '')))
        def way(s, w):
            t = type_fra_merker(w.tags)
            if not t: return
            P = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
            if len(P) < 2: return
            xs, ys = s.tr.transform([p[0] for p in P], [p[1] for p in P])
            L = lengde(list(xs), list(ys)) if t == 1 else 0.0
            # ytterste ende av en brygge er den som teller (der båten legger til): bruk midtpunktet for flater, enden for linjer
            lukket = len(P) > 3 and P[0] == P[-1]
            x, y = (sum(xs) / len(xs), sum(ys) / len(ys)) if lukket or t != 1 else (xs[-1], ys[-1])
            s.ting.append((float(x), float(y), t, L, w.tags.get('name', '')))
    s = Samler(); s.apply_file(inn, locations=True, idx='flex_mem'); return s.ting


def main(inn, utmappe):
    os.makedirs(utmappe, exist_ok=True)
    ting = les(inn); logg('lest:', len(ting), 'kaier og havner')
    S = klynger(ting); logg('steder:', len(S), {t: sum(1 for q in S if q[2] == t) for t in (1, 2, 3, 4)})
    o = kode(S); tekst = json.dumps(o, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    tag = 'kart-kaier-' + hashlib.sha256(tekst).hexdigest()[:12]
    open(os.path.join(utmappe, 'kaier.json'), 'wb').write(tekst)
    man = {'versjon': tag, 'kilde': 'OpenStreetMap (© OpenStreetMap-bidragsytere, ODbL)', 'filer': {'kaier': [{'fil': 'kaier.json', 'byte': len(tekst)}]},
           'statistikk': {'steder': len(S), 'kai': sum(1 for q in S if q[2] == 1), 'smabathavn': sum(1 for q in S if q[2] == 2), 'havn': sum(1 for q in S if q[2] == 3),
                          'ferjeterminal': sum(1 for q in S if q[2] == 4), 'med_navn': len(o['navn']), 'km_kai': round(sum(q[3] for q in S) / 1000)}}
    json.dump(man, open(os.path.join(utmappe, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(utmappe, 'tag.txt'), 'w').write(tag); logg(tag, len(tekst) // 1000, 'KB', man['statistikk'])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
