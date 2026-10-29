#!/usr/bin/env python3
"""Fuente única (Estándar SEO GMBH 2.0, OF 8): Google Sheet "01 — BUSINESS TRUTH / Menu & Prices" → contenido.json.

Lee la hoja publicada como CSV (una fila por platillo) y actualiza SOLO los precios y descripciones de los
platillos ya existentes en contenido.json (por `id`). No inventa platillos nuevos: si la hoja trae un id que no
existe, lo reporta y termina con error para que una persona lo revise en el Pull Request.

Columnas esperadas en la hoja (encabezados exactos):
  id | nombre_es | nombre_en | precio | precio_smash | precio_doble | precio_wagyu | precio_angus | descripcion_es | descripcion_en | activo
  - `precio` para platillos de un solo precio; `precio_*` para los que tienen variantes (solo las columnas que apliquen).
  - `activo` = "no" quita el platillo del menú (se conserva en la hoja).

Uso:  python3 tools/sheet_to_contenido.py --csv-url "$SHEET_CSV_URL"   (o --csv archivo.csv)
"""
import argparse, csv, io, json, sys, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("--csv-url"); ap.add_argument("--csv"); ap.add_argument("--contenido", default="contenido.json")
a = ap.parse_args()
raw = open(a.csv, encoding="utf-8").read() if a.csv else urllib.request.urlopen(a.csv_url, timeout=30).read().decode("utf-8")
rows = list(csv.DictReader(io.StringIO(raw)))
C = json.load(open(a.contenido, encoding="utf-8"))
by_id = {i["id"]: (s, i) for s in C["menu"]["secciones"] for i in s["items"]}
cambios, desconocidos = [], []
def num(v):
    v = (v or "").strip().replace("$", "").replace(",", "")
    return int(float(v)) if v else None
for r in rows:
    rid = (r.get("id") or "").strip()
    if not rid: continue
    if rid not in by_id: desconocidos.append(rid); continue
    sec, it = by_id[rid]
    if (r.get("activo") or "sí").strip().lower() in ("no", "0", "false"):
        sec["items"] = [x for x in sec["items"] if x["id"] != rid]; cambios.append(f"{rid}: retirado"); continue
    var = {k.split("_", 1)[1]: num(r[k]) for k in r if k.startswith("precio_") and num(r.get(k)) is not None}
    if var:
        if it.get("variantes") != var: cambios.append(f"{rid}: variantes {it.get('variantes')} → {var}"); it["variantes"] = var
    elif num(r.get("precio")) is not None and it.get("p") != num(r["precio"]):
        cambios.append(f"{rid}: precio {it.get('p')} → {num(r['precio'])}"); it["p"] = num(r["precio"])
    for lg in ("es", "en"):
        d = (r.get(f"descripcion_{lg}") or "").strip()
        if d and (it.get("d") or {}).get(lg) != d:
            it.setdefault("d", {})[lg] = d; cambios.append(f"{rid}: descripción {lg}")
        n = (r.get(f"nombre_{lg}") or "").strip()
        if n and it["n"][lg] != n: it["n"][lg] = n; cambios.append(f"{rid}: nombre {lg}")
if desconocidos:
    print("IDs en la hoja que no existen en contenido.json (alta manual):", ", ".join(desconocidos), file=sys.stderr); sys.exit(2)
json.dump(C, open(a.contenido, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\n".join(cambios) if cambios else "Sin cambios")
