# Verne Study Club · sitio web

Sitio estático (HTML + CSS + JS, sin compilación) publicado con GitHub Pages:
https://tomyblazebb8r2d2-jpg.github.io/verne/

| Página | Plantilla (textos) | Generada |
|---|---|---|
| Inicio | `plantilla.html` | `index.html` |
| Curso de Ingreso a Prepa 2027 | `curso.plantilla.html` | `curso.html` |
| Diagnóstico UNAM–IPN (80 preguntas) | `diagnostico.plantilla.html` + `diagnostico-preguntas.js` + `diagnostico.js` | `diagnostico.html` |
| Diagnóstico de álgebra (prepa) | — | `diagnostico-algebra.html` |

Para cambiar textos: edita la plantilla y corre `python3 generar.py` (incrusta logo, íconos y enlaces de WhatsApp).
Las preguntas del diagnóstico están en `diagnostico-preguntas.js` (la respuesta correcta es siempre la primera opción;
el examen las revuelve).

- `estilos.css` / `diagnostico.css`: estilos (paleta de los flyers). `principal.js`: animación del logo.
- `assets/`: logo original vectorizado (animado y horizontal), avatar, favicon, imagen para redes (`og.png`).
- `fonts/`: Nunito (licencia SIL OFL, ver `fonts/OFL.txt`).
- `construir_logo.py`: regenera los SVG del logo desde `marca/verne/original` del motor de videos.
