// Diagnóstico Verne de ingreso a prepa: gráficas (SVG), examen con preguntas revueltas y resultados.
// Todo ocurre en el navegador; el avance se guarda en este dispositivo (localStorage) y nada se envía
// a ningún servidor. El alumno decide si manda su resultado por WhatsApp.

(() => {
  const C = { pet: "#20495B", tinta: "#1B3B48", menta: "#8DE0BC", mentaO: "#2E9C78", suave: "#4E6E7C", linea: "#C3CBCE", papel: "#F4F5F5" };
  const TXT = `font-family="Nunito, sans-serif" fill="${C.tinta}"`;
  const svg = (w, h, cuerpo, etiqueta) =>
    `<svg viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${etiqueta}" class="grafica">${cuerpo}</svg>`;

  window.GRAFICAS = {
    barras(datos, nombre) {
      const w = 440, h = 250, x0 = 46, y0 = 210, alto = 180, max = 25;
      const paso = (w - x0 - 20) / datos.length;
      let s = "";
      for (let v = 0; v <= max; v += 5) {
        const y = y0 - (v / max) * alto;
        s += `<line x1="${x0}" x2="${w - 10}" y1="${y}" y2="${y}" stroke="${C.linea}" stroke-width="1"/>`;
        s += `<text x="${x0 - 8}" y="${y + 4}" text-anchor="end" font-size="12" ${TXT}>${v}</text>`;
      }
      datos.forEach(([et, v], i) => {
        const bw = paso * 0.56, x = x0 + i * paso + (paso - bw) / 2, bh = (v / max) * alto;
        s += `<rect x="${x}" y="${y0 - bh}" width="${bw}" height="${bh}" rx="4" fill="${C.pet}"/>`;
        s += `<text x="${x + bw / 2}" y="${y0 - bh - 6}" text-anchor="middle" font-size="13" font-weight="800" ${TXT}>${v}</text>`;
        s += `<text x="${x + bw / 2}" y="${y0 + 18}" text-anchor="middle" font-size="13" ${TXT}>${et}</text>`;
      });
      s += `<line x1="${x0}" x2="${w - 10}" y1="${y0}" y2="${y0}" stroke="${C.tinta}" stroke-width="1.5"/>`;
      s += `<text x="12" y="${y0 - alto / 2}" font-size="12" ${TXT} transform="rotate(-90 12 ${y0 - alto / 2})" text-anchor="middle">${nombre}</text>`;
      return svg(w, h, s, `Gráfica de barras de ${nombre}`);
    },
    pastel(datos) {
      const w = 440, h = 220, cx = 110, cy = 110, r = 92;
      const colores = [C.pet, C.menta, C.suave, C.linea];
      let a = -Math.PI / 2, s = "";
      datos.forEach(([et, p], i) => {
        const b = a + (p / 100) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a), x2 = cx + r * Math.cos(b), y2 = cy + r * Math.sin(b);
        s += `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${p > 50 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colores[i]}" stroke="#fff" stroke-width="2"/>`;
        const ly = 50 + i * 36;
        s += `<rect x="240" y="${ly - 13}" width="18" height="18" rx="4" fill="${colores[i]}"/>`;
        s += `<text x="268" y="${ly + 1}" font-size="15" ${TXT}>${et}: <tspan font-weight="800">${p} %</tspan></text>`;
        a = b;
      });
      return svg(w, h, s, "Gráfica circular de deportes favoritos");
    },
    triangulo(a, b) {
      const w = 360, h = 230, x0 = 70, y0 = 190, esc = 17;
      const X = x0 + b * esc, Y = y0 - a * esc;
      let s = `<polygon points="${x0},${y0} ${X},${y0} ${x0},${Y}" fill="${C.menta}" fill-opacity="0.45" stroke="${C.pet}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<polyline points="${x0},${y0 - 16} ${x0 + 16},${y0 - 16} ${x0 + 16},${y0}" fill="none" stroke="${C.pet}" stroke-width="2"/>`;
      s += `<text x="${x0 - 12}" y="${(y0 + Y) / 2}" text-anchor="end" font-size="16" font-weight="800" ${TXT}>${a} cm</text>`;
      s += `<text x="${(x0 + X) / 2}" y="${y0 + 26}" text-anchor="middle" font-size="16" font-weight="800" ${TXT}>${b} cm</text>`;
      s += `<text x="${(x0 + X) / 2 + 14}" y="${(y0 + Y) / 2 - 6}" font-size="20" font-weight="900" ${TXT}>?</text>`;
      return svg(w, h, s, `Triángulo rectángulo con catetos de ${a} y ${b} cm`);
    },
    recta(m) {
      const w = 320, h = 300, x0 = 46, y0 = 260, ex = 50, ey = 18, xmax = 4, ymax = 12;
      let s = "";
      for (let x = 0; x <= xmax; x++) {
        s += `<line x1="${x0 + x * ex}" x2="${x0 + x * ex}" y1="${y0}" y2="${y0 - ymax * ey}" stroke="${C.linea}"/>`;
        s += `<text x="${x0 + x * ex}" y="${y0 + 18}" text-anchor="middle" font-size="12" ${TXT}>${x}</text>`;
      }
      for (let y = 0; y <= ymax; y += 2) {
        s += `<line x1="${x0}" x2="${x0 + xmax * ex}" y1="${y0 - y * ey}" y2="${y0 - y * ey}" stroke="${C.linea}"/>`;
        s += `<text x="${x0 - 8}" y="${y0 - y * ey + 4}" text-anchor="end" font-size="12" ${TXT}>${y}</text>`;
      }
      s += `<line x1="${x0}" y1="${y0}" x2="${x0 + 4 * ex}" y2="${y0 - 4 * m * ey}" stroke="${C.pet}" stroke-width="3.5"/>`;
      s += `<circle cx="${x0 + 2 * ex}" cy="${y0 - 6 * ey}" r="5" fill="${C.mentaO}"/>`;
      s += `<text x="${x0 + 2 * ex + 10}" y="${y0 - 6 * ey + 16}" font-size="14" font-weight="800" ${TXT}>(2, 6)</text>`;
      s += `<text x="${x0 + xmax * ex + 12}" y="${y0 + 4}" font-size="14" font-style="italic" ${TXT}>x</text>`;
      s += `<text x="${x0 - 4}" y="${y0 - ymax * ey - 10}" font-size="14" font-style="italic" ${TXT}>y</text>`;
      return svg(w, h, s, "Recta en el plano cartesiano que pasa por el origen y por el punto (2, 6)");
    },
    posicion(puntos, tmax, xmax) {
      const w = 380, h = 270, x0 = 56, y0 = 220, ex = 56, alto = 190;
      let s = "";
      for (let t = 0; t <= tmax; t++) {
        s += `<line x1="${x0 + t * ex}" x2="${x0 + t * ex}" y1="${y0}" y2="${y0 - alto}" stroke="${C.linea}"/>`;
        s += `<text x="${x0 + t * ex}" y="${y0 + 18}" text-anchor="middle" font-size="12" ${TXT}>${t}</text>`;
      }
      for (let x = 0; x <= xmax; x += 5) {
        const y = y0 - (x / xmax) * alto;
        s += `<line x1="${x0}" x2="${x0 + tmax * ex}" y1="${y}" y2="${y}" stroke="${C.linea}"/>`;
        s += `<text x="${x0 - 8}" y="${y + 4}" text-anchor="end" font-size="12" ${TXT}>${x}</text>`;
      }
      const pts = puntos.map(([t, x]) => `${x0 + t * ex},${(y0 - (x / xmax) * alto).toFixed(1)}`).join(" ");
      s += `<polyline points="${pts}" fill="none" stroke="${C.pet}" stroke-width="3.5" stroke-linejoin="round"/>`;
      s += `<text x="${x0 + tmax * ex / 2}" y="${y0 + 40}" text-anchor="middle" font-size="13" ${TXT}>tiempo (s)</text>`;
      s += `<text x="16" y="${y0 - alto / 2}" font-size="13" ${TXT} transform="rotate(-90 16 ${y0 - alto / 2})" text-anchor="middle">posición (m)</text>`;
      return svg(w, h + 14, s, "Gráfica de posición contra tiempo");
    },
    cuadro(pos, tam = 64) {
      const m = 14, c = { si: [m, m], sd: [tam - m, m], id: [tam - m, tam - m], ii: [m, tam - m], c: [tam / 2, tam / 2] }[pos];
      return `<svg viewBox="0 0 ${tam} ${tam}" width="${tam}" class="cuadro" aria-hidden="true"><rect x="2" y="2" width="${tam - 4}" height="${tam - 4}" rx="6" fill="#fff" stroke="${C.pet}" stroke-width="3"/><circle cx="${c[0]}" cy="${c[1]}" r="7" fill="${C.pet}"/></svg>`;
    },
    serieCuadros() {
      const q = `<svg viewBox="0 0 64 64" width="64" class="cuadro" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="6" fill="${C.menta}" fill-opacity="0.35" stroke="${C.pet}" stroke-width="3" stroke-dasharray="6 5"/><text x="32" y="43" text-anchor="middle" font-size="30" font-weight="900" ${TXT}>?</text></svg>`;
      return `<div class="serie">${this.cuadro("si")}${this.cuadro("sd")}${this.cuadro("id")}${q}</div>`;
    },
    cubo3() {
      // Cubo isométrico 3×3×3: cara superior, izquierda y derecha con su cuadrícula.
      const n = 3, u = 34, ox = 150, oy = 40;
      const P = (x, y, z) => [ox + (x - y) * u * 0.866, oy + (x + y) * u * 0.5 - z * u];
      const cara = (pts, fill) => `<polygon points="${pts.map((p) => p.join(",")).join(" ")}" fill="${fill}" stroke="${C.pet}" stroke-width="1.6" stroke-linejoin="round"/>`;
      let s = "";
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        s += cara([P(i, j, n), P(i + 1, j, n), P(i + 1, j + 1, n), P(i, j + 1, n)], "#fff");
        s += cara([P(i, n, n - j), P(i + 1, n, n - j), P(i + 1, n, n - j - 1), P(i, n, n - j - 1)], C.menta);
        s += cara([P(n, i, n - j), P(n, i + 1, n - j), P(n, i + 1, n - j - 1), P(n, i, n - j - 1)], "#cdeee0");
      }
      return svg(300, 250, `<g transform="translate(0 70)">${s}</g>`, "Cubo formado por 27 cubitos");
    },
  };

  // ------------------------------------------------------------------------------- examen
  const CLAVE = "verne-diagnostico-v1";
  const $ = (s) => document.querySelector(s);
  const barajar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const LETRAS = ["A", "B", "C", "D"];
  let B, E; // banco y estado

  const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(E));
  const minutos = (ms) => { const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000); return `${m}:${String(s).padStart(2, "0")}`; };
  const transcurrido = () => E.acumulado + (E.fin ? 0 : Date.now() - E.reanudo);

  function nuevo(nombre) {
    E = {
      nombre, orden: barajar(B.map((_, i) => i)),
      opciones: B.map((p) => barajar(p.op.map((_, i) => i))),
      resp: {}, actual: 0, acumulado: 0, reanudo: Date.now(), fin: null,
    };
    guardar();
  }

  function pantalla(id) {
    for (const s of ["#inicio", "#examen", "#resultado"]) $(s).hidden = s !== id;
    window.scrollTo({ top: 0 });
  }

  function pintar() {
    const k = E.orden[E.actual], p = B[k];
    $("#num").textContent = `Pregunta ${E.actual + 1} de ${B.length}`;
    $("#asig").textContent = p.as;
    const n = Object.keys(E.resp).length;
    $("#barra").style.width = `${(100 * n) / B.length}%`;
    $("#contestadas").textContent = `${n} de ${B.length} contestadas`;
    const texto = $("#texto");
    texto.hidden = !p.texto;
    if (p.texto) texto.querySelector("div").innerHTML = p.texto;
    $("#pregunta").innerHTML = typeof p.q === "function" ? p.q() : p.q;
    const ops = $("#opciones");
    ops.innerHTML = "";
    ops.classList.toggle("opciones--figuras", !!p.opSvg);
    E.opciones[k].forEach((oi, pos) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opcion";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(E.resp[k] === oi));
      b.innerHTML = `<span class="opcion__letra">${LETRAS[pos]}</span><span class="opcion__texto">${p.op[oi]}</span>`;
      b.addEventListener("click", () => { E.resp[k] = oi; guardar(); pintar(); });
      ops.appendChild(b);
    });
    $("#anterior").disabled = E.actual === 0;
    $("#siguiente").textContent = E.actual === B.length - 1 ? "Terminar" : "Siguiente";
    pintarMapa();
  }

  function pintarMapa() {
    const m = $("#mapa-rejilla");
    m.innerHTML = "";
    E.orden.forEach((k, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = i + 1;
      b.className = "mapa__n" + (k in E.resp ? " is-hecha" : "") + (i === E.actual ? " is-actual" : "");
      b.setAttribute("aria-label", `Pregunta ${i + 1}${k in E.resp ? ", contestada" : ""}`);
      b.addEventListener("click", () => { E.actual = i; guardar(); pintar(); $("#mapa").open = false; });
      m.appendChild(b);
    });
  }

  function terminar() {
    const faltan = B.length - Object.keys(E.resp).length;
    if (faltan > 0 && !confirm(`Te faltan ${faltan} preguntas. Las que dejes en blanco cuentan como no contestadas. ¿Quieres terminar de todos modos?`)) return;
    E.acumulado = transcurrido();
    E.fin = Date.now();
    guardar();
    resultados();
  }

  function resultados() {
    const porAs = {}, porCampo = {}, reforzar = {};
    let aciertos = 0;
    B.forEach((p, k) => {
      const ok = E.resp[k] === 0;
      aciertos += ok;
      const campo = window.CAMPOS[p.as];
      (porAs[p.as] ??= [0, 0]); porAs[p.as][0] += ok; porAs[p.as][1]++;
      (porCampo[campo] ??= [0, 0]); porCampo[campo][0] += ok; porCampo[campo][1]++;
      if (!ok) (reforzar[p.as] ??= new Set()).add(p.tema);
    });
    const pct = Math.round((100 * aciertos) / B.length);
    $("#r-nombre").textContent = E.nombre;
    $("#r-total").textContent = `${aciertos}`;
    $("#r-de").textContent = `de ${B.length}`;
    $("#r-pct").textContent = `${pct} % de aciertos · ${minutos(E.acumulado)} min`;
    const fila = (nombre, [a, t]) => {
      const p = Math.round((100 * a) / t);
      return `<li><span class="fila__nombre">${nombre}</span><span class="fila__barra"><span style="width:${p}%"></span></span><span class="fila__dato">${a}/${t}</span></li>`;
    };
    $("#r-campos").innerHTML = Object.entries(porCampo).map(([n, v]) => fila(n, v)).join("");
    $("#r-asignaturas").innerHTML = Object.entries(porAs).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([n, v]) => fila(n, v)).join("");
    const temas = Object.entries(reforzar);
    $("#r-temas").innerHTML = temas.length
      ? temas.map(([as, s]) => `<li><strong>${as}:</strong> ${[...s].join(", ")}</li>`).join("")
      : "<li>¡Sin errores! Vas muy bien preparado.</li>";
    $("#r-revision").innerHTML = E.orden.map((k, i) => {
      const p = B[k], r = E.resp[k], ok = r === 0;
      const tuya = r === undefined ? "<em>Sin contestar</em>" : p.op[r];
      return `<li class="${ok ? "bien" : "mal"}"><p class="rev__q"><span>${i + 1}.</span> ${typeof p.q === "function" ? p.q() : p.q}</p>
        <p><strong>Tu respuesta:</strong> ${tuya}</p>${ok ? "" : `<p><strong>Correcta:</strong> ${p.op[0]}</p>`}
        <p class="rev__ex">${p.ex}</p></li>`;
    }).join("");
    const lineas = [
      `Hola, hice el Diagnóstico Verne de ingreso a prepa.`,
      `Nombre: ${E.nombre}`,
      `Resultado: ${aciertos}/${B.length} (${pct} %) en ${minutos(E.acumulado)} min`,
      ``, `Por asignatura:`,
      ...Object.entries(porAs).map(([n, [a, t]]) => `• ${n}: ${a}/${t}`),
    ];
    const debiles = Object.entries(porAs).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).slice(0, 3).map(([n]) => n);
    lineas.push("", `Para reforzar: ${debiles.join(", ")}`);
    $("#r-whatsapp").href = `https://wa.me/525584091167?text=${encodeURIComponent(lineas.join("\n"))}`;
    pantalla("#resultado");
  }

  function reloj() {
    if (!E || E.fin || $("#examen").hidden) return;
    $("#tiempo").textContent = minutos(transcurrido());
  }

  document.addEventListener("DOMContentLoaded", () => {
    B = window.BANCO;
    try { E = JSON.parse(localStorage.getItem(CLAVE)); } catch { E = null; }
    if (E && (!E.orden || E.orden.length !== B.length)) E = null;
    if (E && !E.fin) {
      $("#continuar").hidden = false;
      $("#continuar-nombre").textContent = E.nombre;
    }
    $("#form-inicio").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const nombre = $("#nombre").value.trim();
      if (!nombre) { $("#nombre").focus(); return; }
      nuevo(nombre);
      pantalla("#examen");
      pintar();
    });
    $("#btn-continuar").addEventListener("click", () => { E.reanudo = Date.now(); guardar(); pantalla("#examen"); pintar(); });
    $("#anterior").addEventListener("click", () => { if (E.actual > 0) { E.actual--; guardar(); pintar(); } });
    $("#siguiente").addEventListener("click", () => {
      if (E.actual < B.length - 1) { E.actual++; guardar(); pintar(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else terminar();
    });
    $("#btn-terminar").addEventListener("click", terminar);
    $("#otra-vez").addEventListener("click", () => { localStorage.removeItem(CLAVE); E = null; $("#continuar").hidden = true; pantalla("#inicio"); });
    document.addEventListener("keydown", (ev) => {
      if ($("#examen").hidden || ev.target.tagName === "INPUT") return;
      const i = "abcd".indexOf(ev.key.toLowerCase());
      if (i >= 0) $("#opciones").children[i]?.click();
      if (ev.key === "ArrowRight") $("#siguiente").click();
      if (ev.key === "ArrowLeft") $("#anterior").click();
    });
    window.addEventListener("pagehide", () => { if (E && !E.fin) { E.acumulado = transcurrido(); E.reanudo = Date.now(); guardar(); } });
    setInterval(reloj, 1000);
    if (E && E.fin) resultados();
  });
})();
