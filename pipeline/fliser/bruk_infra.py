"""Tar i bruk en ferdig bygget versjon av infrastrukturlaget: setter INFRA_TAG i site/dovre-fliser/index.html.
Sjekker først at releasen finnes og har manifest.json. Bruk: python3 bruk_infra.py kart-infra-<år>-<hash>"""
import os, re, sys, json, urllib.request
tag = sys.argv[1]; assert re.fullmatch(r'kart-infra-\d{4}-[0-9a-f]{12}', tag), tag
m = json.load(urllib.request.urlopen(f'https://github.com/Tormod22/Riksbrudd/releases/download/{tag}/manifest.json', timeout=60))
assert m.get('versjon') == tag, m.get('versjon')
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser', 'index.html')
s = open(p, encoding='utf-8').read(); s, n = re.subn(r"const INFRA_TAG = '[^']*';", f"const INFRA_TAG = '{tag}';", s); assert n == 1
open(p, 'w', encoding='utf-8').write(s)
print(tag, 'tatt i bruk:', m['statistikk'], round(m['filer']['infra'][0]['byte'] / 1e6, 1), 'MB')
