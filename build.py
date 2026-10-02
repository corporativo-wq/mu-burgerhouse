#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera muburgers.mx a partir de contenido.json (fuente única de verdad) + src/ (diseño).
Uso:  python3 build.py        (requiere: pip install jinja2 pillow)
      python3 build.py --preview   además escribe preview/*.html con todo incrustado (para artefactos de Claude)
Salida en la raíz del repo (lo que publica GitHub Pages): index.html, menu.html, mu-10.html, mu-40.html,
mu-nichupte.html, 404.html, en/…, assets/, img/, robots.txt, sitemap.xml, CNAME, favicon, og.jpg.
"""
import json, re, os, sys, hashlib, datetime, base64, shutil
from urllib.parse import quote
from jinja2 import Environment, BaseLoader, TemplateNotFound
from markupsafe import Markup
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
os.chdir(ROOT)
PREVIEW = "--preview" in sys.argv
C = json.load(open("contenido.json", encoding="utf-8"))
S, M, SEO, TX = C["sitio"], C["marca"], C["seo"], C["textos"]
D = S["dominio"].rstrip("/")
HOST = D.split("//")[1]
SUC = C["sucursales"]
R = C["redes"]
CT = C.get("contacto") or {}

# ------------------------------------------------------------------ colores
# Hex con los que está escrito el diseño en src/css. Se sustituyen por los de contenido.json.
DEFAULT_HEX = {"ink": "#0a0a0a", "paper": "#f2f0eb", "paper_2": "#e6e3dc", "amber": "#d8792a", "amber_deep": "#a8521a"}
COL = M["colores"]
def recolor(txt):
    for k, dflt in DEFAULT_HEX.items():
        new = COL.get(k, dflt)
        if new.lower() != dflt.lower():
            txt = re.sub(re.escape(dflt), new, txt, flags=re.I)
    return txt

# ------------------------------------------------------------------ precios
P = C["precios"]; FACT = 1 + (P.get("ajuste_pct") or 0) / 100; RND = P.get("redondeo") or 1
def adj(p):
    if p is None or FACT == 1: return p
    return int(RND * round(p * FACT / RND))
def walk_prices(o):
    if isinstance(o, dict):
        for k, v in list(o.items()):
            if k == "p" and isinstance(v, (int, float)): o[k] = adj(v)
            elif k == "variantes" and isinstance(v, dict): o[k] = {kk: adj(vv) for kk, vv in v.items()}
            else: walk_prices(v)
    elif isinstance(o, list):
        for v in o: walk_prices(v)
walk_prices(C["menu"])
MENU = C["menu"]
ALL_ITEMS = [i for s in MENU["secciones"] for i in s["items"]]
BY_ID = {i["id"]: i for i in ALL_ITEMS}
SEC_OF = {i["id"]: s for s in MENU["secciones"] for i in s["items"]}
DESTACADOS = [BY_ID[i] for i in C.get("destacados", []) if i in BY_ID]
VITRINA = [BY_ID[i] for i in C.get("vitrina", []) if i in BY_ID]
TOTAL = len(ALL_ITEMS)

# ------------------------------------------------------------------ horario
DIAS = [("lun", 1, "Lunes", "Monday"), ("mar", 2, "Martes", "Tuesday"), ("mie", 3, "Miércoles", "Wednesday"),
        ("jue", 4, "Jueves", "Thursday"), ("vie", 5, "Viernes", "Friday"), ("sab", 6, "Sábado", "Saturday"),
        ("dom", 0, "Domingo", "Sunday")]
EN_DAY = {k: en for k, n, es, en in DIAS}
ES_ABR = {"lun": "Lun", "mar": "Mar", "mie": "Mié", "jue": "Jue", "vie": "Vie", "sab": "Sáb", "dom": "Dom"}
EN_ABR = {"lun": "Mon", "mar": "Tue", "mie": "Wed", "jue": "Thu", "vie": "Fri", "sab": "Sat", "dom": "Sun"}
def hours_meta(br):
    H = br["horario"]; groups = {}
    for k, n, es, en in DIAS:
        if H.get(k): groups.setdefault(tuple(H[k]), []).append(k)
    closed = [k for k, n, es, en in DIAS if not H.get(k)]
    def rng(keys, abr):
        # días consecutivos → "Mar–Mié", si no → "Mar, Jue"
        idx = [i for i, (k, *_r) in enumerate(DIAS) if k in keys]
        if len(idx) > 1 and idx == list(range(idx[0], idx[-1] + 1)): return f"{abr[keys[0]]}–{abr[keys[-1]]}"
        return ", ".join(abr[k] for k in keys)
    res = {"es": " · ".join([f"{rng(ks, ES_ABR)} {h[0]}–{h[1]}" for h, ks in groups.items()] + ([rng(closed, ES_ABR) + " cerrado"] if closed else [])),
           "en": " · ".join([f"{rng(ks, EN_ABR)} {h[0]}–{h[1]}" for h, ks in groups.items()] + (["Closed " + rng(closed, EN_ABR)] if closed else []))}
    opening = [{"@type": "OpeningHoursSpecification", "dayOfWeek": [EN_DAY[k] for k in ks], "opens": h[0], "closes": h[1]} for h, ks in groups.items()]
    return res, opening
for br in SUC:
    br["horario_resumen"], br["_opening"] = hours_meta(br)
    a = br["direccion"]
    br["dir_txt"] = f'{a["calle"]}, {a["colonia"]}, {a["cp"]} {a["ciudad"]}, Q.R.'
    br["maps_embed"] = "https://www.google.com/maps?q=" + quote(f'{br["nombre_largo"]}, {a["calle"]}, {a["colonia"]}, {a["cp"]} {a["ciudad"]}') + "&z=17&output=embed"
    if not br.get("whatsapp") and CT.get("whatsapp"): br["whatsapp"] = CT["whatsapp"]
    br.setdefault("whatsapp_texto", CT.get("whatsapp_texto") or "Hola")

# ------------------------------------------------------------------ JSON-LD
def sameas(): return [v for v in R.values() if v]
ORG = {"@type": "Organization", "@id": D + "/#org", "name": S["nombre"], "url": D + "/", "logo": D + "/favicon.png",
       "foundingDate": str(S["fundacion"]) if S.get("fundacion") else None, "sameAs": sameas()}
ORG = {k: v for k, v in ORG.items() if v is not None}
SITE = {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": S["nombre"], "inLanguage": [S["idioma"], "en"], "publisher": {"@id": D + "/#org"}}
def REST(br, lg="es"):
    a = br["direccion"]
    r = {"@type": "Restaurant", "@id": D + "/#" + br["slug"], "name": br["nombre_largo"], "url": D + ("/en" if lg == "en" else "") + "/" + br["slug"],
         "image": D + SEO["og_imagen"], "logo": D + "/favicon.png", "priceRange": "$$",
         "servesCuisine": ["Hamburguesas", "Burgers", "American"],
         "address": {"@type": "PostalAddress", "streetAddress": f'{a["calle"]}, {a["colonia"]}', "addressLocality": a["ciudad"],
                     "addressRegion": a["estado"], "postalCode": a["cp"], "addressCountry": a["pais"]},
         "geo": {"@type": "GeoCoordinates", "latitude": br["geo"]["lat"], "longitude": br["geo"]["lng"]},
         "hasMap": br["maps_url"], "openingHoursSpecification": br["_opening"],
         "menu": D + "/menu", "hasMenu": {"@id": D + "/menu#menu"},
         "sameAs": sameas(), "brand": {"@id": D + "/#org"}, "parentOrganization": {"@id": D + "/#org"}}
    if br.get("telefono"): r["telephone"] = br["telefono"]
    if br.get("reservas") is not None: r["acceptsReservations"] = bool(br["reservas"])
    return r
def item_ld(i, lg):
    o = {"@type": "MenuItem", "name": i["n"][lg]}
    if i.get("d"): o["description"] = i["d"][lg]
    if i.get("variantes"):
        o["offers"] = [{"@type": "Offer", "name": k, "price": str(v), "priceCurrency": P["moneda"]} for k, v in i["variantes"].items()]
    elif i.get("p") is not None:
        o["offers"] = {"@type": "Offer", "price": str(i["p"]), "priceCurrency": P["moneda"]}
    return o
def MENU_LD(lg):
    u = D + ("/en" if lg == "en" else "") + "/menu"
    return {"@type": "Menu", "@id": u + "#menu", "name": (f'Menú {S["nombre"]}' if lg == "es" else f'{S["nombre"]} menu'), "url": u,
            "inLanguage": "es-MX" if lg == "es" else "en",
            "hasMenuSection": [{"@type": "MenuSection", "name": s["tab"][lg], "hasMenuItem": [item_ld(i, lg) for i in s["items"]]} for s in MENU["secciones"]]}
def crumbs(*pairs):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(pairs)]}
def FAQ_LD(lg):
    if not C["faq"]: return None
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": f["q"][lg], "acceptedAnswer": {"@type": "Answer", "text": f["a"][lg]}} for f in C["faq"]]}
def ld(*nodes):
    return Markup(json.dumps({"@context": "https://schema.org", "@graph": [n for n in nodes if n]}, ensure_ascii=False).replace("</", "<\\/"))

# ------------------------------------------------------------------ imágenes
os.makedirs("img", exist_ok=True); os.makedirs("assets", exist_ok=True)
for f in os.listdir(f"{SRC}/img"):
    if f.endswith((".webp", ".png", ".svg")): shutil.copy(f"{SRC}/img/{f}", f"img/{f}")
hero_src = Image.open(f"{SRC}/img/{BY_ID['deseo']['recorte']}.webp").convert("RGBA")
hero_src.resize((800, int(hero_src.height * 800 / hero_src.width)), Image.LANCZOS).save("img/hero.webp", quality=84, method=6)
hero_src.save("img/hero-2x.webp", quality=82, method=6)
HERO_H = int(hero_src.height * 800 / hero_src.width)
for f in ("favicon.png", "apple-touch-icon.png"):
    shutil.copy(f"{SRC}/img/{f}", f)
# OG: la Deseo sobre fondo negro con el logo
og = Image.new("RGB", (1200, 630), tuple(int(COL["ink"].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)))
b = hero_src.resize((620, int(hero_src.height * 620 / hero_src.width)), Image.LANCZOS)
og.paste(b, (560, (630 - b.height) // 2), b)
lg_png = Image.open(f"{SRC}/img/logo-paper.png").convert("RGBA"); lg_png = lg_png.resize((260, int(lg_png.height * 260 / lg_png.width)), Image.LANCZOS)
og.paste(lg_png, (80, 90), lg_png)
og.save("og.jpg", quality=84, optimize=True)
_svg = open(f"{SRC}/img/logo.svg", encoding="utf-8").read()
_vb = re.search(r'viewBox="([^"]+)"', _svg).group(1)
LOGO_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="mulogo" viewBox="%s">%s</symbol></svg>' % (_vb, re.search(r"<g .*?</g>", _svg, re.S).group(0))
LOGO_SVG = '<svg viewBox="%s" role="img" aria-label="Mu"><use href="#mulogo"/></svg>' % _vb

# ------------------------------------------------------------------ CSS / JS
def mincss(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S); s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s*([{};:,>])\s*", r"\1", s); return s.replace(";}", "}").strip()
def minjs(s):
    return "\n".join(l.strip() for l in s.splitlines() if l.strip() and not l.strip().startswith("/*") and not l.strip().startswith("//"))
os.makedirs("assets/fonts", exist_ok=True)
FONTS = [("Archivo", "archivo-latin-standard-normal.woff2", "font-weight:100 900;font-stretch:62% 125%", "woff2-variations"),
         ("JetBrains Mono", "jetbrains-mono-latin-400-normal.woff2", "font-weight:400", "woff2"),
         ("JetBrains Mono", "jetbrains-mono-latin-500-normal.woff2", "font-weight:500", "woff2")]
for _, fn, _, _ in FONTS: assert os.path.exists(f"assets/fonts/{fn}"), fn
def font_css(inline=False):
    out = ""
    for fam, fn, w, fmt in FONTS:
        src = ("data:font/woff2;base64," + base64.b64encode(open(f"assets/fonts/{fn}", "rb").read()).decode()) if inline else f"/assets/fonts/{fn}"
        out += f'@font-face{{font-family:"{fam}";font-style:normal;{w};font-display:swap;src:url({src}) format("{fmt}")}}'
    return out
css_base = recolor(mincss(open(f"{SRC}/css/base.css").read()))
css_pages = {p: recolor(mincss(open(f"{SRC}/css/{p}.css").read())) for p in ("inicio", "menu", "sucursal")}
js_site = recolor(minjs(open(f"{SRC}/site.js").read())).replace("__GA4_ID__", S.get("ga4_id") or "")
js_pages = {"inicio": minjs(open(f"{SRC}/inicio.js").read()) + "\n" + minjs(open(f"{SRC}/game.js").read()),
            "menu": minjs(open(f"{SRC}/menu.js").read())}
open("assets/site.css", "w").write(font_css() + css_base)
for p, c in css_pages.items(): open(f"assets/{p}.css", "w").write(c)
open("assets/site.js", "w").write(js_site)
for p, j in js_pages.items(): open(f"assets/{p}.js", "w").write(j)
V = hashlib.md5((css_base + "".join(css_pages.values()) + js_site + "".join(js_pages.values())).encode()).hexdigest()[:8]

# ------------------------------------------------------------------ plantillas
BI = re.compile(r"\{BI:([^|}]*)\|([^}]*)\}")
def bi_pass(t, lg): return BI.sub(lambda m: m.group(1) if lg == "es" else m.group(2), t)
class Loader(BaseLoader):
    def __init__(self, lg): self.lg = lg
    def get_source(self, env, name):
        p = os.path.join(SRC, "tpl", name)
        if not os.path.exists(p): raise TemplateNotFound(name)
        return bi_pass(open(p, encoding="utf-8").read(), self.lg), p, lambda: True
def make_env(lg):
    env = Environment(loader=Loader(lg), autoescape=True, trim_blocks=False)
    env.filters["t"] = lambda o: (o.get(lg) if isinstance(o, dict) else o) or ""
    env.filters["digits"] = lambda s: re.sub(r"\D", "", s or "")
    env.filters["tel"] = lambda s: "+" + re.sub(r"\D", "", s or "") if s else ""
    env.filters["urlencode"] = lambda s: quote(s or "")
    env.filters["fmt"] = lambda s, br: (s or "").format(nombre=br["nombre"], nombre_largo=br["nombre_largo"], ciudad=br["ciudad"])
    return env

def img_url(name, inline):
    if inline:
        return "data:image/webp;base64," + base64.b64encode(open(f"img/{name}.webp", "rb").read()).decode()
    return f"/img/{name}.webp"

def build(inline=False, outdir=".", links=None):
    """inline=True: todo incrustado (CSS, JS, fuentes, fotos) para previsualizar como artefacto."""
    sizes = {}
    for lg in ("es", "en"):
        env = make_env(lg); L = "" if lg == "es" else "/en"
        T = lambda o: o[lg] if isinstance(o, dict) else o
        HOME, MEN = ("Inicio", "Menú") if lg == "es" else ("Home", "Menu")
        G = dict(S=S, SEO=SEO, M=M, R=R, CT=CT, SUC=SUC, MENU=MENU, TX=TX, FAQ=C["faq"], DIAS=DIAS, CARNES=C["carnes"],
                 DESTACADOS=DESTACADOS, VITRINA=VITRINA, TOTAL=TOTAL, V=V, LANG=lg, L=L, LOGO=Markup(LOGO_SVG), LOGO_DEFS=Markup(LOGO_DEFS), HERO_H=HERO_H,
                 TAGS={"new": {"es": "Nuevo", "en": "New"}}, INLINE=inline,
                 CSS_SITE=Markup(font_css(True) + css_base) if inline else None,
                 CSS_PAGES={k: Markup(v) for k, v in css_pages.items()}, JS_SITE=Markup(js_site), JS_PAGES={k: Markup(v) for k, v in js_pages.items()},
                 img=lambda n: img_url(n, inline), hero=lambda: (img_url("hero", inline), img_url("hero-2x", inline)),
                 LINKS=links or {})
        PAGES = [
            ("index.html", "inicio.html", "/", dict(id="inicio", title=T(SEO["inicio"]["title"]), description=T(SEO["inicio"]["description"]), og_type="website",
                ld=ld(ORG, SITE, *[REST(b, lg) for b in SUC]) if lg == "es" else ld(*[REST(b, lg) for b in SUC]))),
            ("menu.html", "menu.html", "/menu", dict(id="menu", title=T(SEO["menu"]["title"]), description=T(SEO["menu"]["description"]),
                ld=ld(MENU_LD(lg), crumbs((HOME, D + L + "/"), (MEN, D + L + "/menu"))))),
        ]
        for br in SUC:
            PAGES.append((br["slug"] + ".html", "sucursal.html", "/" + br["slug"],
                dict(id="sucursal", br=br, title=env.filters["fmt"](T(SEO["sucursal"]["title"]), br), description=env.filters["fmt"](T(SEO["sucursal"]["description"]), br), og_type="restaurant",
                     ld=ld(REST(br, lg), crumbs((HOME, D + L + "/"), (br["nombre"], D + L + "/" + br["slug"])), FAQ_LD(lg)))))
        if lg == "es":
            PAGES.append(("404.html", "404.html", "/404", dict(id="404", title=f'Página no encontrada · {S["nombre"]}', description="Esta página no existe.", robots="noindex,follow", ld=None)))
        for out, tpl, path, page in PAGES:
            page["url"] = D + L + path
            alt = {"es": path, "en": ("/en" + path) if path != "/" else "/en/"}
            outp = os.path.join(outdir, out if lg == "es" else "en/" + out)
            if inline: outp = os.path.join(outdir, f"{lg}-{out}")
            os.makedirs(os.path.dirname(outp) or ".", exist_ok=True)
            htmltxt = env.get_template(tpl).render(page=page, ALT=alt, **G)
            if not inline: htmltxt = re.sub(r"\n\s*\n", "\n", htmltxt)
            else:
                # vista previa como artefacto: sin esqueleto propio y con los enlaces internos apuntando a los artefactos
                head = re.search(r"<head>(.*?)</head>", htmltxt, re.S).group(1)
                keep = "".join(re.findall(r"<title>.*?</title>|<meta name=\"description\"[^>]*>|<style>.*?</style>", head, re.S))
                htmltxt = keep + "\n" + re.sub(r"^.*?<body[^>]*>", "", htmltxt, flags=re.S).replace("</body>", "").replace("</html>", "")
                def swap(mm):
                    u = mm.group(1); key = {"/": "home", "/menu": "menu"}.get(u.split("#")[0], u.split("#")[0].strip("/").replace("-", "_"))
                    tgt = (links or {}).get(key)
                    if u.startswith("/en"): tgt = (links or {}).get("en_" + (key.replace("en/", "") or "home"))
                    return 'href="%s"' % ((tgt + ("#" + u.split("#")[1] if "#" in u else "")) if tgt else "#")
                htmltxt = re.sub(r'href="(/[^"]*)"', swap, htmltxt)
            open(outp, "w", encoding="utf-8").write(recolor(htmltxt)); sizes[outp] = len(htmltxt.encode())
    return sizes

sizes = build()
today = datetime.date.today().isoformat()
urls = [("/", "weekly", "1.0"), ("/menu", "weekly", "0.9")] + [("/" + b["slug"], "monthly", "0.8") for b in SUC]
rows = []
for u, c, p in urls:
    en = "/en/" if u == "/" else "/en" + u
    al = (f'<xhtml:link rel="alternate" hreflang="es-MX" href="{D}{u}"/><xhtml:link rel="alternate" hreflang="en" href="{D}{en}"/>'
          f'<xhtml:link rel="alternate" hreflang="x-default" href="{D}{u}"/>')
    rows.append(f"<url><loc>{D}{u}</loc><lastmod>{today}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority>{al}</url>")
    rows.append(f"<url><loc>{D}{en}</loc><lastmod>{today}</lastmod><changefreq>{c}</changefreq><priority>{p}</priority>{al}</url>")
open("sitemap.xml", "w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(rows) + "\n</urlset>\n")
open("robots.txt", "w").write(f"User-agent: *\nAllow: /\nSitemap: {D}/sitemap.xml\n")
open("CNAME", "w").write(HOST + "\n")
open(".nojekyll", "w").write("")
for k, v in sizes.items(): print(f"{k:28s} {v/1024:6.1f} KB")
for k in ["assets/site.css", "assets/inicio.css", "assets/menu.css", "assets/site.js", "assets/inicio.js", "img/hero.webp", "img/hero-2x.webp", "og.jpg"]:
    print(f"{k:28s} {os.path.getsize(k)/1024:6.1f} KB")

if PREVIEW:
    links = json.loads(os.environ.get("PREVIEW_LINKS", "{}"))
    os.makedirs("preview", exist_ok=True)
    ps = build(inline=True, outdir="preview", links=links)
    for k, v in ps.items(): print(f"{k:28s} {v/1024:6.1f} KB")
