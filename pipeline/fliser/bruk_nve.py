"""Tar i bruk en ferdig bygget versjon av NVE-dataene for hele Norge (bekker/elver og kraftledninger, pipeline/fliser/nve.py):
setter NVE_TAG i site/dovre-fliser/spill/nvebiter.js. Sjekker først at releasen finnes og har manifest.json med begge lagene.
Bruk: python3 bruk_nve.py kart-nve-<hash>   (kjør versjon.py etterpå, så nettleseren henter den nye nvebiter.js)"""
import os, re, sys, json, urllib.request
tag = sys.argv[1]; assert re.fullmatch(r'kart-nve-[0-9a-f]{12}', tag), tag
m = json.load(urllib.request.urlopen(f'https://github.com/Tormod22/Riksbrudd/releases/download/{tag}/manifest.json', timeout=60))
assert m.get('versjon') == tag, m.get('versjon')
assert m.get('bekker') and m.get('kraft'), 'manifestet mangler bekker eller kraft'
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'spill', 'nvebiter.js')
s = open(p, encoding='utf-8').read(); s, n = re.subn(r"const NVE_TAG = '[^']*';", f"const NVE_TAG = '{tag}';", s); assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(tag, 'tatt i bruk:', json.dumps(m['statistikk'], ensure_ascii=False), {k: round(v / 1e6, 1) for k, v in m['byte'].items()}, 'MB')
