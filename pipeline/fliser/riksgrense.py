"""Riksgrensa mot Sverige, Finland og Russland som én linje, til site/dovre-fliser/data/riksgrense.json.

Kilde: Kartverket, Administrative enheter (WFS, CC BY 4.0), objekttypen Grense med avgrensningstype
«Riksgrense» (landegrensa, 2567 km) og «AvtaltAvgrensningslinje» (fortsettelsen i sjøen: Iddefjorden–Skagerrak i sør og
Varangerfjorden i nord). Bitene lenkes sammen til én linje fra sør til nord (Norge ligger til venstre), forenkles
(Douglas–Peucker, 15 m) og skrives som heltall i meter (EPSG:25833), delta-kodet.

Brukes av spill/riksgrense.js: leiren kan ikke legges utenfor Norge, og Norge-kartet tones over i omlandet ved grensa
(feiljakten 12. nov: leir i Sverige, rette sømmer i kartet på svensk side).

Bruk: python3 pipeline/fliser/riksgrense.py            (henter fra Kartverket)
      python3 pipeline/fliser/riksgrense.py a.xml b.xml (leser lagrede svar: Riksgrense og AvtaltAvgrensningslinje)"""
import json, math, os, re, sys, urllib.parse, urllib.request

HER = os.path.dirname(os.path.abspath(__file__))
UT = os.path.join(HER, '..', '..', 'site', 'dovre-fliser', 'data', 'riksgrense.json')
WFS = 'https://wfs.geonorge.no/skwms1/wfs.administrative_enheter'
NS = 'https://skjema.geonorge.no/SOSI/produktspesifikasjon/AdmEnheter/20240101'
TOLERANSE = 15.0   # meter

def hent(avgrensningstype):
    filt = (f'<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:app="{NS}"><fes:PropertyIsEqualTo>'
            f'<fes:ValueReference>app:avgrensningstype</fes:ValueReference><fes:Literal>{avgrensningstype}</fes:Literal>'
            '</fes:PropertyIsEqualTo></fes:Filter>')
    q = urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'typeNames': 'app:Grense',
                                'srsName': 'urn:ogc:def:crs:EPSG::25833', 'filter': filt})
    with urllib.request.urlopen(WFS + '?' + q, timeout=120) as r: return r.read().decode('utf-8')

def biter(xml):
    ut = []
    for m in re.finditer(r'<gml:posList>([^<]*)</gml:posList>', xml):
        t = [float(v) for v in m.group(1).split()]
        b = [(t[i], t[i + 1]) for i in range(0, len(t), 2)]
        if len(b) >= 2 and b[0] != b[-1] or len(b) > 2: ut.append(b)
    return ut

def lenk(bt):
    """Lenker bitene ende mot ende til den lengste sammenhengende linjen."""
    nøkkel = lambda p: (round(p[0], 1), round(p[1], 1))
    ender = {}
    for i, b in enumerate(bt):
        for e in (0, -1): ender.setdefault(nøkkel(b[e]), []).append((i, e))
    brukt, kjeder = set(), []
    for i in range(len(bt)):
        if i in brukt: continue
        brukt.add(i); k = list(bt[i])
        for retning in (1, -1):
            while True:
                p = k[-1] if retning == 1 else k[0]
                neste = [(j, e) for j, e in ender.get(nøkkel(p), []) if j not in brukt]
                if not neste: break
                j, e = neste[0]; brukt.add(j); b = bt[j] if e == 0 else bt[j][::-1]
                if retning == 1: k.extend(b[1:])
                else: k = b[::-1][:-1] + k
        kjeder.append(k)
    return max(kjeder, key=lambda k: sum(math.dist(k[i], k[i + 1]) for i in range(len(k) - 1)))

def forenkle(P, tol):
    """Douglas–Peucker uten rekursjon."""
    behold = [False] * len(P); behold[0] = behold[-1] = True; stabel = [(0, len(P) - 1)]
    while stabel:
        a, b = stabel.pop()
        if b - a < 2: continue
        ax, ay = P[a]; bx, by = P[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1.0
        best, bi = 0.0, -1
        for i in range(a + 1, b):
            d = abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / L if L > 1 else math.dist(P[i], P[a])
            if d > best: best, bi = d, i
        if best > tol: behold[bi] = True; stabel.append((a, bi)); stabel.append((bi, b))
    return [p for p, k in zip(P, behold) if k]

def lag(xml_land, xml_sjø):
    land = lenk(biter(xml_land))
    if land[0][1] > land[-1][1]: land.reverse()   # fra sør til nord
    sjø = biter(xml_sjø); nær = lambda p, q: math.dist(p, q) < 5
    # sjøbitene som henger på hver ende av landegrensa
    def hale(ende):
        igjen, k = list(sjø), [ende]
        while True:
            for b in igjen:
                if nær(b[0], k[-1]): k.extend(b[1:]); igjen.remove(b); break
                if nær(b[-1], k[-1]): k.extend(b[::-1][1:]); igjen.remove(b); break
            else: return k[1:]
    sør, nord = hale(land[0]), hale(land[-1])
    linje = sør[::-1] + land + nord
    i0, i1 = len(sør), len(sør) + len(land) - 1
    # forenkles i tre deler, så endene på landegrensa står
    deler = [forenkle(linje[:i0 + 1], TOLERANSE), forenkle(linje[i0:i1 + 1], TOLERANSE), forenkle(linje[i1:], TOLERANSE)]
    P = deler[0] + deler[1][1:] + deler[2][1:]
    land_fra, land_til = len(deler[0]) - 1, len(deler[0]) + len(deler[1]) - 2
    km = lambda Q: round(sum(math.dist(Q[i], Q[i + 1]) for i in range(len(Q) - 1)) / 1000)
    x0, y0 = round(P[0][0]), round(P[0][1]); d = []; fx, fy = x0, y0
    for x, y in P[1:]:
        rx, ry = round(x), round(y); d += [rx - fx, ry - fy]; fx, fy = rx, ry
    return {'kilde': 'Kartverket, Administrative enheter (CC BY 4.0): Riksgrense og avtalt avgrensningslinje i sjøen',
            'crs': 'EPSG:25833', 'toleranse_m': TOLERANSE, 'km': km(P), 'land_km': km(P[land_fra:land_til + 1]),
            'land': [land_fra, land_til], 'x0': x0, 'y0': y0, 'linje': d}

if __name__ == '__main__':
    if len(sys.argv) >= 3: a, b = (open(f, encoding='utf-8').read() for f in sys.argv[1:3])
    else: a, b = hent('Riksgrense'), hent('AvtaltAvgrensningslinje')
    d = lag(a, b)
    json.dump(d, open(UT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f"{len(d['linje']) // 2 + 1} punkter, {d['km']} km (land {d['land_km']} km), {os.path.getsize(UT) // 1000} KB -> {os.path.relpath(UT)}")
