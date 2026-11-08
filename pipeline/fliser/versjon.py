"""Setter versjonsmerker i site/dovre-fliser/index.html, så nettleseren aldri bruker gamle filer:
- terreng.js?v=<hash av terreng.js> og spill/*.js?v=<hash>   (brukeren fikk «Terreng.frø is not a function» fra en gammel kopi 8. nov)
- KART_TAG = 'kart-<hash av kartfilene>' – samme navn som GitHub-releasen fra .github/workflows/kartdata.yml
Kjør etter hver endring i terreng.js eller kartfilene. sjekk.js feiler hvis merkene ikke stemmer."""
import hashlib, os, re
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'site', 'dovre-fliser')

def terreng_hash():
    return hashlib.sha256(open(os.path.join(D, 'terreng.js'), 'rb').read()).hexdigest()[:10]

def kart_tag():   # må regnes likt som i kartdata.yml: sha256 av filene etter hverandre i fast rekkefølge
    h = hashlib.sha256()
    for f in ('hoyde', 'kart', 'terreng', 'vektor'): h.update(open(os.path.join(D, 'data', f + '.pmtiles'), 'rb').read())
    return 'kart-' + h.hexdigest()[:12]

if __name__ == '__main__':
    p = os.path.join(D, 'index.html'); s = open(p, encoding='utf-8').read()
    s, n1 = re.subn(r'/dovre-fliser/terreng\.js(\?v=[0-9a-f]+)?"', f'/dovre-fliser/terreng.js?v={terreng_hash()}"', s)
    s, n2 = re.subn(r"const KART_TAG_DOVRE = '[^']*';", f"const KART_TAG_DOVRE = '{kart_tag()}';", s)
    for f in re.findall(r'/dovre-fliser/(spill/[a-z0-9_-]+\.js)\?v=', s):   # spillmodulene får også versjonsmerke
        h = hashlib.sha256(open(os.path.join(D, f), 'rb').read()).hexdigest()[:10]
        s = re.sub(r'/dovre-fliser/' + re.escape(f) + r'\?v=[0-9a-f]+"', f'/dovre-fliser/{f}?v={h}"', s)
    assert n1 == 1 and n2 == 1, (n1, n2)
    open(p, 'w', encoding='utf-8').write(s); print('terreng.js?v=' + terreng_hash(), kart_tag())
