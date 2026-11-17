"""
Parsiunčia Lietuvoje parduodamus produktus iš Open Food Facts ir įrašo
kompaktišką lentelę į public/foods-lt.json.

Duomenys: Open Food Facts, Open Database License (ODbL).
Paleidimas: python scripts/build_foods_lt.py
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'foods-lt.json'
URL = 'https://search.openfoodfacts.org/search'
FIELDS = 'code,product_name,product_name_lt,brands,nutriments,serving_quantity'
PAGE = 100


def fetch(page: int) -> dict:
    query = urllib.parse.urlencode({
        'q': 'countries_tags:"en:lithuania"',
        'page_size': PAGE,
        'page': page,
        'fields': FIELDS,
    })
    req = urllib.request.Request(f'{URL}?{query}', headers={'User-Agent': 'ForCoaches-build/1.0'})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.load(res)


def num(n: dict, key: str):
    v = n.get(f'{key}_100g')
    try:
        return round(float(v), 1) if v is not None else None
    except (TypeError, ValueError):
        return None


def main() -> None:
    rows, seen = [], set()
    first = fetch(1)
    pages = min(first.get('page_count') or 1, 200)
    for page in range(1, pages + 1):
        data = first if page == 1 else None
        for attempt in range(3):
            if data is not None:
                break
            try:
                data = fetch(page)
            except Exception as e:  # tinklo klaida, bandoma dar kartą
                print('retry', page, e)
                time.sleep(2)
        if not data:
            continue
        for hit in data.get('hits', []):
            code = hit.get('code')
            name = (hit.get('product_name_lt') or hit.get('product_name') or '').strip()
            n = hit.get('nutriments') or {}
            kcal, p, c, f = num(n, 'energy-kcal'), num(n, 'proteins'), num(n, 'carbohydrates'), num(n, 'fat')
            if not code or code in seen or len(name) < 2 or None in (kcal, p, c, f):
                continue
            if kcal <= 0 or kcal > 950 or p + c + f > 105:
                continue  # akivaizdžiai klaidingi įrašai
            seen.add(code)
            brands = hit.get('brands') or []
            brand = (brands[0] if isinstance(brands, list) and brands else str(brands or '')).strip()
            serving = hit.get('serving_quantity')
            try:
                serving = round(float(serving)) if serving else None
            except (TypeError, ValueError):
                serving = None
            rows.append([code, name[:80], brand[:40], round(kcal), p, c, f, serving if serving and 0 < serving < 2000 else None])
        if page % 10 == 0:
            print(page, '/', pages, len(rows))
        time.sleep(0.3)

    rows.sort(key=lambda r: r[1].lower())
    OUT.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
    print('saved', len(rows), OUT)


if __name__ == '__main__':
    main()
