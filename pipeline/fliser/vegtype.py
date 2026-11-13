"""Vegtypen til en veglenke fra NVDB (veglenkesekvenser/segmentert), felles for 03_veg_bygg.py (Dovre) og blokk.py (hele Norge).

NVDB gir gang- og sykkelveger, fortau og gangfelt samme vegkategori som vegen de hører til (E6 har «EV6 … Gang- og sykkelveg»).
Uten et merke tegnes de som brede bilveger med midtlinje ved siden av – og oppå – den ekte vegen. Egenskapene i flisene:
  g = 1  for gående og syklende (trafikantgruppe G eller en av typene i GAAENDE)
  t = 1  kanalisert veg (svingefelt og trafikkøyer i kryss), 2 rampe, 3 rundkjøring, 4 ferje
Vanlige veger får ingen av dem (ingen ekstra byte i flisene)."""
GAAENDE = {'Gang- og sykkelveg', 'Sykkelveg', 'Gangveg', 'Fortau', 'Gangfelt', 'Trapp', 'Gågate', 'Gatetun'}
TYPER = {'Kanalisert veg': 1, 'Rampe': 2, 'Rundkjøring': 3, 'Bilferje': 4, 'Passasjerferje': 4}


def vegtype(o):
    """o: ett objekt fra NVDB. Gir {} for vanlig veg, ellers {'g': 1} og/eller {'t': n}."""
    ref = o.get('vegsystemreferanse') or {}
    gruppe = next((ref[d].get('trafikantgruppe') for d in ('strekning', 'kryssystem', 'sideanlegg') if isinstance(ref.get(d), dict) and ref[d].get('trafikantgruppe')), None)
    tv = o.get('typeVeg'); ut = {}
    if gruppe == 'G' or tv in GAAENDE: ut['g'] = 1
    if tv in TYPER: ut['t'] = TYPER[tv]
    return ut


if __name__ == '__main__':
    assert vegtype({'typeVeg': 'Enkel bilveg', 'vegsystemreferanse': {'strekning': {'trafikantgruppe': 'K'}}}) == {}
    assert vegtype({'typeVeg': 'Gang- og sykkelveg', 'vegsystemreferanse': {'strekning': {'trafikantgruppe': 'G'}}}) == {'g': 1}
    assert vegtype({'typeVeg': 'Enkel bilveg', 'vegsystemreferanse': {'strekning': {'trafikantgruppe': 'G'}}}) == {'g': 1}
    assert vegtype({'typeVeg': 'Fortau'}) == {'g': 1}
    assert vegtype({'typeVeg': 'Rundkjøring', 'vegsystemreferanse': {'kryssystem': {'trafikantgruppe': 'K'}}}) == {'t': 3}
    assert vegtype({'typeVeg': 'Kanalisert veg'}) == {'t': 1} and vegtype({'typeVeg': 'Rampe'}) == {'t': 2} and vegtype({'typeVeg': 'Bilferje'}) == {'t': 4}
    assert vegtype({}) == {}
    print('vegtype: ok')
