"""Arma index.html a partir de plantilla.html: incrusta el logo (assets/*.svg), los íconos y los enlaces.

Uso:  python3 generar.py      (después de editar textos en plantilla.html)
Si cambia el logo original, primero: .venv/bin/python construir_logo.py (desde el motor de videos).
"""
from pathlib import Path
from urllib.parse import quote
import re

AQUI = Path(__file__).resolve().parent
URL = "https://tomyblazebb8r2d2-jpg.github.io/verne"
TEL = "525584091167"
WA = f"https://wa.me/{TEL}?text=" + quote("Hola, quiero informes del Curso de Ingreso a Prepa 2027")
WA_ASESORIA = f"https://wa.me/{TEL}?text=" + quote("Hola, quiero informes de las clases de regularización 1 a 1")

ICONOS = {
    "cal": '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M8 13h2M12 13h2M8 16.5h2M12 16.5h2"/>',
    "reloj": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "crono": '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.5h5M12 2.5V6"/>',
    "pantalla": '<rect x="3" y="4.5" width="18" height="12" rx="1.8"/><path d="M9 20.5h6M12 16.5v4"/>',
    "persona": '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c.6-4 3.4-6.2 7-6.2s6.4 2.2 7 6.2"/>',
    "check": '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16.2 9.4"/>',
    "porque": '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9v.6"/><path d="M12 17.2h.01"/>',
    "ritmo": '<path d="M3 17c3 0 3-8 6-8s3 6 6 6 3-4 6-4"/><circle cx="21" cy="11" r="0.6"/>',
    "lapiz": '<path d="M4 20l1.2-4.4L15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.4 18.8z"/><path d="M13.8 7l3.2 3.2M4 20h7"/>',
    "ig": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.2 6.8h.01"/>',
}
WA_SVG = ('<svg viewBox="0 0 24 24" aria-hidden="true" class="ico wa"><path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.3 20.7l4.5-1.2A8.7 8.7 0 1 0 12 3.2z"/>'
          '<path class="wa-fono" d="M9.1 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.5.9 1.6 2 2.6 2.5.3.2.4.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.4.4 0 .6-.3 1.4-.9 1.7-.6.4-1.9.6-3.6-.2-1.9-.9-3.3-2.6-3.9-3.7-.6-1-.6-2-.3-2.6z"/></svg>')


def icono(nombre: str) -> str:
    if nombre == "wa":
        return WA_SVG
    return f'<svg viewBox="0 0 24 24" aria-hidden="true" class="ico">{ICONOS[nombre]}</svg>'


html = (AQUI / "plantilla.html").read_text(encoding="utf-8")
logo_h = (AQUI / "assets/logo-horizontal.svg").read_text()
logo_h = re.sub(r'<svg xmlns="[^"]+" ', '<svg class="logo-h" aria-hidden="true" focusable="false" ', logo_h, count=1)
logo_h = logo_h.replace(' fill="#2F4047"', "", 1)
html = html.replace("{{LOGO_H}}", logo_h)
html = html.replace("{{LOGO_ANIM}}", (AQUI / "assets/logo-animado.svg").read_text())
html = re.sub(r"\{\{I:(\w+)\}\}", lambda m: icono(m.group(1)), html)
html = html.replace("{{WA_ASESORIA}}", WA_ASESORIA).replace("{{WA}}", WA).replace("{{URL}}", URL)
assert "{{" not in html, re.findall(r"\{\{[^}]+\}\}", html)
(AQUI / "index.html").write_text(html, encoding="utf-8")
print("index.html:", len(html), "bytes")
