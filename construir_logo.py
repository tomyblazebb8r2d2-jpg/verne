"""Genera los SVG del sitio a partir del logo ORIGINAL vectorizado (marca/verne/original).

Todas las piezas (emblema, letras, STUDY CLUB) comparten el sistema de coordenadas del original 1024×1024,
así que basta reutilizar su path con la transformación base. Salida en assets/:
  - logo-animado.svg (fragmento para incrustar: estrella+órbitas sin electrones, órbitas menta, electrones, letras)
  - logo-horizontal.svg (emblema a la izquierda, VERNE / STUDY CLUB a la derecha) para la cabecera
  - favicon.svg (emblema)
Uso: .venv/bin/python proyectos/sitio-verne/construir_logo.py
"""
import json, math, re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ORIG = RAIZ / "marca/verne/original"
SAL = Path(__file__).resolve().parent / "assets"
BASE_T = "scale(0.25) translate(0 4096) scale(0.1 -0.1)"
ORB = json.loads((ORIG / "orbitas.json").read_text())
PZ = json.loads((ORIG / "piezas.json").read_text())["piezas"]


def path_d(nombre):
    s = (ORIG / f"{nombre}.svg").read_text()
    return " ".join(re.findall(r'\sd="([^"]+)"', s)).replace("\n", " ")


def pieza(nombre, clase="", extra=""):
    return f'<path class="{clase}" {extra} transform="{BASE_T}" d="{path_d(nombre)}"/>'


cx, cy = ORB["centro"]
# --- logo vertical animado (viewBox recortado al logo) ---
letras = "".join(f'<g class="letra" style="--i:{i}">{pieza(f"letra-{i}")}</g>' for i in range(1, 6))
orbitas = "".join(
    f'<ellipse class="orbita" cx="{cx}" cy="{cy}" rx="{o["rx"]}" ry="{o["ry"]}" '
    f'transform="rotate({o["angulo"]} {cx} {cy})" pathLength="1" style="--i:{i}"/>'
    for i, o in enumerate(ORB["orbitas"]))
electrones = "".join(
    f'<circle class="electron" r="{ORB["radioElectron"]}" data-orbita="{e["orbita"]}" data-t="{e["t"]}"/>'
    for e in ORB["electrones"])
datos = json.dumps({"centro": ORB["centro"], "orbitas": ORB["orbitas"]})
vb = "255 150 512 692"
animado = (f'<svg class="logo-animado" viewBox="{vb}" role="img" aria-label="Verne Study Club" '
           f'data-orbitas=\'{datos}\'>'
           f'<g class="emblema">{pieza("emblema-sin-electrones")}{orbitas}{electrones}</g>'
           f'<g class="letras">{letras}</g><g class="lema">{pieza("study-club")}</g></svg>')
(SAL / "logo-animado.svg").write_text(animado)

# --- logo horizontal estático ---
e = PZ["emblema"]; l1 = PZ["letra-1"]; sc = PZ["study-club"]
esc = 0.62   # emblema más chico, a la izquierda; texto a la derecha centrado verticalmente
alto_txt = (sc["y"] + sc["alto"]) - l1["y"]
dx_txt = e["x"] + e["ancho"] * esc + 40 - l1["x"]
dy_txt = e["y"] + e["alto"] * esc / 2 - (l1["y"] + alto_txt / 2)
txt = "".join(pieza(f"letra-{i}") for i in range(1, 6)) + pieza("study-club")
ancho_total = e["ancho"] * esc + 40 + (sc["x"] + sc["ancho"] - l1["x"]) + 10
horiz = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{e["x"] - 4} {e["y"] - 4} {ancho_total + 8} {e["alto"] * esc + 8}" fill="#2F4047">'
         f'<g transform="translate({e["x"]} {e["y"]}) scale({esc}) translate({-e["x"]} {-e["y"]})">{pieza("emblema")}</g>'
         f'<g transform="translate({dx_txt} {dy_txt})">{txt}</g></svg>')
(SAL / "logo-horizontal.svg").write_text(horiz)

fav = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{e["x"] - 6} {e["y"] - 6} {e["ancho"] + 12} {e["alto"] + 12}">'
       f'<path fill="#20495B" transform="{BASE_T}" d="{path_d("emblema")}"/></svg>')
(SAL / "favicon.svg").write_text(fav)
print("ok", len(animado), len(horiz), len(fav))
