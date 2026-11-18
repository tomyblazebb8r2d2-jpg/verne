// Simulacro Verne tipo examen UNAM (licenciatura): figuras en SVG, examen de 3 horas y resultados con gráficas.
// Todo ocurre en el navegador; el avance se guarda en este dispositivo (localStorage) y nada se envía a un servidor.
// El banco llega codificado en window.SIM_DATOS (lo genera construir.mjs, fuera del repo público).

(() => {
  const C = { pet: "#20495B", tinta: "#1B3B48", menta: "#8DE0BC", mentaO: "#2E9C78", mentaC: "#C8EEDD", suave: "#4E6E7C",
    linea: "#C3CBCE", caja: "#DFE4E6", papel: "#F4F5F5", rojo: "#C45A4A", azul: "#7FB3D5", arena: "#E9D8A6" };
  const F = `font-family="Nunito, sans-serif"`;
  const T = (x, y, txt, o = {}) =>
    `<text x="${x}" y="${y}" ${F} font-size="${o.s || 14}" font-weight="${o.w || 700}" fill="${o.c || C.tinta}" text-anchor="${o.a || "middle"}"${o.i ? ' font-style="italic"' : ""}${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ""}>${txt}</text>`;
  const svg = (w, h, cuerpo, etiqueta, clase = "grafica") =>
    `<svg viewBox="0 0 ${w} ${h}" width="${w}" role="img" aria-label="${etiqueta}" class="${clase}">${cuerpo}</svg>`;
  const flecha = (x1, y1, x2, y2, color = C.pet, g = 3) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 11;
    const p1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)], p2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2 - 6 * Math.cos(a)}" y2="${y2 - 6 * Math.sin(a)}" stroke="${color}" stroke-width="${g}" stroke-linecap="round"/>` +
      `<polygon points="${x2},${y2} ${p1.join(",")} ${p2.join(",")}" fill="${color}"/>`;
  };
  // Arco en grados "de matemáticas" (antihorario, 0° = derecha).
  const arco = (cx, cy, r, a1, a2) => {
    const P = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
    const [x1, y1] = P(a1), [x2, y2] = P(a2);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 0 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${C.mentaO}" stroke-width="2.5"/>`;
  };

  // Plano cartesiano con cuadrícula; `dibujo(X, Y)` devuelve el contenido usando las funciones de escala.
  function plano(xmin, xmax, ymin, ymax, ancho, alto, dibujo, etiqueta) {
    const m = 30, X = (x) => m + ((x - xmin) / (xmax - xmin)) * (ancho - 2 * m), Y = (y) => alto - m - ((y - ymin) / (ymax - ymin)) * (alto - 2 * m);
    let s = "";
    for (let x = Math.ceil(xmin); x <= xmax; x++) s += `<line x1="${X(x)}" x2="${X(x)}" y1="${Y(ymin)}" y2="${Y(ymax)}" stroke="${C.caja}"/>`;
    for (let y = Math.ceil(ymin); y <= ymax; y++) s += `<line x1="${X(xmin)}" x2="${X(xmax)}" y1="${Y(y)}" y2="${Y(y)}" stroke="${C.caja}"/>`;
    s += `<line x1="${X(xmin)}" x2="${X(xmax)}" y1="${Y(0)}" y2="${Y(0)}" stroke="${C.tinta}" stroke-width="1.6"/>`;
    s += `<line x1="${X(0)}" x2="${X(0)}" y1="${Y(ymin)}" y2="${Y(ymax)}" stroke="${C.tinta}" stroke-width="1.6"/>`;
    for (let x = Math.ceil(xmin); x <= xmax; x++) if (x) s += T(X(x), Y(0) + 15, x, { s: 11, w: 600, c: C.suave });
    for (let y = Math.ceil(ymin); y <= ymax; y++) if (y) s += T(X(0) - 7, Y(y) + 4, y, { s: 11, w: 600, c: C.suave, a: "end" });
    s += T(X(xmax) + 12, Y(0) + 4, "x", { i: 1 }) + T(X(0), Y(ymax) - 10, "y", { i: 1 });
    s += dibujo(X, Y);
    return svg(ancho + 14, alto, `<g transform="translate(0 6)">${s}</g>`, etiqueta);
  }
  const curva = (X, Y, f, a, b, color = C.pet) => {
    let d = "";
    for (let i = 0; i <= 120; i++) { const x = a + ((b - a) * i) / 120; d += `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`; }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-linejoin="round"/>`;
  };
  const punto = (X, Y, x, y, txt, dx = 8, dy = -8) =>
    `<circle cx="${X(x)}" cy="${Y(y)}" r="5" fill="${C.mentaO}"/>` + (txt ? T(X(x) + dx, Y(y) + dy, txt, { s: 13, w: 800, a: "start" }) : "");

  const FIG = {
    parabola: (a, b, c) => plano(-1, 7, -2, 9, 380, 330, (X, Y) =>
      curva(X, Y, (x) => a * x * x + b * x + c, 0.1, 5.9) + punto(X, Y, 2, 0) + punto(X, Y, 4, 0), "Parábola que corta al eje x en dos puntos"),
    recta: (m, b) => plano(-2, 4, -3, 7, 330, 330, (X, Y) =>
      curva(X, Y, (x) => m * x + b, -1, 4) + punto(X, Y, 0, b) + punto(X, Y, 2, m * 2 + b, `(2, ${m * 2 + b})`), "Recta en el plano cartesiano"),
    elipse: (a, b) => plano(-6, 6, -4, 4, 420, 290, (X, Y) =>
      `<ellipse cx="${X(0)}" cy="${Y(0)}" rx="${X(a) - X(0)}" ry="${Y(0) - Y(b)}" fill="${C.menta}" fill-opacity="0.25" stroke="${C.pet}" stroke-width="3.2"/>`, "Elipse horizontal centrada en el origen"),
    cubica: () => plano(-3, 3, -3, 3, 330, 330, (X, Y) => curva(X, Y, (x) => x ** 3 - 3 * x, -2.1, 2.1), "Gráfica de una función cúbica"),

    paralelas(g) {
      const P2 = [150, 210], s = Math.sin((g * Math.PI) / 180), c = Math.cos((g * Math.PI) / 180), t = 130 / s;
      const P1 = [P2[0] + t * c, P2[1] - 130];
      let q = "";
      for (const y of [80, 210]) q += `<line x1="30" x2="410" y1="${y}" y2="${y}" stroke="${C.tinta}" stroke-width="2.5"/>`;
      q += `<line x1="${P2[0] - 70 * c}" y1="${P2[1] + 70 * s}" x2="${P1[0] + 70 * c}" y2="${P1[1] - 70 * s}" stroke="${C.pet}" stroke-width="3"/>`;
      q += arco(P1[0], P1[1], 34, 0, g) + T(P1[0] + 52, P1[1] - 12, `${g}°`, { s: 16, w: 900, a: "start" });
      q += arco(P2[0], P2[1], 30, g, 180) + T(P2[0] - 36, P2[1] - 26, "x", { s: 20, w: 900, i: 1 });
      return svg(440, 290, q, "Dos rectas paralelas cortadas por una transversal");
    },
    cuadroCirculo(l) {
      const x = 70, y = 20, L = 220, r = L / 2;
      const q = `<path d="M${x} ${y}h${L}v${L}h${-L}z M${x + L} ${y + r}a${r} ${r} 0 1 0 ${-L} 0a${r} ${r} 0 1 0 ${L} 0z" fill="${C.menta}" fill-rule="evenodd" stroke="${C.pet}" stroke-width="3"/>` +
        `<line x1="${x}" x2="${x + L}" y1="${y + L + 18}" y2="${y + L + 18}" stroke="${C.suave}" stroke-width="1.5"/>` + T(x + r, y + L + 38, `${l} cm`, { s: 15, w: 800 });
      return svg(360, 290, q, "Círculo inscrito en un cuadrado; están sombreadas las esquinas");
    },
    trianguloTrig() {
      const A = [50, 220], B = [295, 220], Cc = [295, 79];
      let q = `<polygon points="${A} ${B} ${Cc}" fill="${C.menta}" fill-opacity="0.35" stroke="${C.pet}" stroke-width="3" stroke-linejoin="round"/>`;
      q += `<polyline points="${B[0] - 18},${B[1]} ${B[0] - 18},${B[1] - 18} ${B[0]},${B[1] - 18}" fill="none" stroke="${C.pet}" stroke-width="2"/>`;
      q += arco(A[0], A[1], 46, 0, 30) + T(A[0] + 62, A[1] - 10, "30°", { s: 15, w: 900, a: "start" });
      q += T((A[0] + Cc[0]) / 2 - 16, (A[1] + Cc[1]) / 2 - 12, "10 cm", { s: 16, w: 900 });
      q += T(B[0] + 16, (B[1] + Cc[1]) / 2 + 6, "a", { s: 20, w: 900, i: 1, a: "start" });
      return svg(350, 250, q, "Triángulo rectángulo con hipotenusa de 10 cm y un ángulo de 30 grados");
    },
    velocidad() {
      const x0 = 56, y0 = 230, ex = 40, ey = 8;
      let q = "";
      for (let t = 0; t <= 8; t++) q += `<line x1="${x0 + t * ex}" x2="${x0 + t * ex}" y1="${y0}" y2="${y0 - 25 * ey}" stroke="${C.caja}"/>` + T(x0 + t * ex, y0 + 18, t, { s: 12, w: 600 });
      for (let v = 0; v <= 25; v += 5) q += `<line x1="${x0}" x2="${x0 + 8 * ex}" y1="${y0 - v * ey}" y2="${y0 - v * ey}" stroke="${C.caja}"/>` + T(x0 - 8, y0 - v * ey + 4, v, { s: 12, w: 600, a: "end" });
      q += `<polygon points="${x0},${y0} ${x0 + 4 * ex},${y0 - 20 * ey} ${x0 + 8 * ex},${y0 - 20 * ey} ${x0 + 8 * ex},${y0}" fill="${C.menta}" fill-opacity="0.3"/>`;
      q += `<polyline points="${x0},${y0} ${x0 + 4 * ex},${y0 - 20 * ey} ${x0 + 8 * ex},${y0 - 20 * ey}" fill="none" stroke="${C.pet}" stroke-width="3.5" stroke-linejoin="round"/>`;
      q += `<line x1="${x0}" x2="${x0 + 8 * ex + 8}" y1="${y0}" y2="${y0}" stroke="${C.tinta}" stroke-width="1.6"/><line x1="${x0}" x2="${x0}" y1="${y0}" y2="${y0 - 25 * ey - 8}" stroke="${C.tinta}" stroke-width="1.6"/>`;
      q += T(x0 + 4 * ex, y0 + 40, "tiempo (s)", { s: 13 }) + T(18, y0 - 12.5 * ey, "velocidad (m/s)", { s: 13, r: -90 });
      return svg(410, 285, q, "Gráfica de velocidad contra tiempo: sube de 0 a 20 m/s en 4 s y se mantiene hasta 8 s");
    },
    fuerzas() {
      let q = `<line x1="20" x2="460" y1="170" y2="170" stroke="${C.suave}" stroke-width="2"/>`;
      for (let x = 30; x < 460; x += 22) q += `<line x1="${x}" x2="${x - 10}" y1="170" y2="182" stroke="${C.linea}" stroke-width="1.5"/>`;
      q += `<rect x="190" y="90" width="100" height="80" rx="8" fill="${C.menta}" stroke="${C.pet}" stroke-width="3"/>` + T(240, 137, "4 kg", { s: 18, w: 900 });
      q += flecha(290, 130, 440, 130) + T(390, 116, "30 N", { s: 16, w: 900 });
      q += flecha(190, 130, 110, 130, C.rojo) + T(140, 116, "10 N", { s: 16, w: 900, c: C.rojo });
      return svg(480, 200, q, "Bloque de 4 kg con una fuerza de 30 N a la derecha y 10 N a la izquierda");
    },
    circuito() {
      const zig = (x, y, horizontal) => {
        let d = `M${x} ${y}`;
        for (let i = 0; i < 6; i++) d += horizontal ? `l7 ${i % 2 ? 10 : -10}l7 ${i % 2 ? -10 : 10}` : `l${i % 2 ? 10 : -10} 7l${i % 2 ? -10 : 10} 7`;
        return `<path d="${d}" fill="none" stroke="${C.pet}" stroke-width="3" stroke-linejoin="round"/>`;
      };
      let q = `<path d="M70 40 H180 M264 40 H330 V110 M330 194 V250 H70 V160 M70 140 V40" fill="none" stroke="${C.tinta}" stroke-width="3"/>`;
      q += zig(180, 40, true) + T(222, 26, "4 Ω", { s: 16, w: 900 });
      q += zig(330, 110, false) + T(352, 158, "6 Ω", { s: 16, w: 900, a: "start" });
      q += `<line x1="48" x2="92" y1="140" y2="140" stroke="${C.tinta}" stroke-width="4"/><line x1="58" x2="82" y1="160" y2="160" stroke="${C.tinta}" stroke-width="7"/>`;
      q += T(30, 155, "20 V", { s: 16, w: 900, a: "end" }) + T(102, 138, "+", { s: 16, w: 900 });
      return svg(420, 280, `<g transform="translate(30 0)">${q}</g>`, "Circuito con batería de 20 V y resistencias de 4 y 6 ohms en serie");
    },
    tablaPeriodica() {
      const filas = [["1 H", "", "", "", "", "", "", "2 He"], ["3 Li", "4 Be", "5 B", "6 C", "7 N", "8 O", "9 F", "10 Ne"],
        ["11 Na", "12 Mg", "13 Al", "14 Si", "15 P", "16 S", "17 Cl", "18 Ar"]];
      const g = ["1", "2", "13", "14", "15", "16", "17", "18"], w = 58, h = 58, x0 = 40, y0 = 36;
      let q = g.map((n, i) => T(x0 + i * w + w / 2, y0 - 10, n, { s: 11, w: 700, c: C.suave })).join("");
      filas.forEach((f, r) => {
        q += T(x0 - 14, y0 + r * h + h / 2 + 5, r + 1, { s: 11, w: 700, c: C.suave });
        f.forEach((cel, i) => {
          if (!cel) return;
          const [z, s] = cel.split(" "), x = x0 + i * w, y = y0 + r * h, metal = ["H", "He"].includes(s) ? C.papel : (i < 2 || s === "Al") ? C.caja : C.mentaC;
          q += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="6" fill="${metal}" stroke="${C.pet}" stroke-width="1.5"/>`;
          q += T(x + 9, y + 17, z, { s: 10, w: 700, a: "start", c: C.suave }) + T(x + w / 2, y + 42, s, { s: 20, w: 900 });
        });
      });
      return svg(520, 220, q, "Fragmento de la tabla periódica: periodos 1 a 3");
    },
    escalaPH() {
      let q = `<defs><linearGradient id="gph"><stop offset="0" stop-color="#D9534F"/><stop offset="0.3" stop-color="#F0AD4E"/><stop offset="0.5" stop-color="#8DE0BC"/><stop offset="0.75" stop-color="#5B9BD5"/><stop offset="1" stop-color="#5E4FA2"/></linearGradient></defs>`;
      q += `<rect x="30" y="30" width="420" height="34" rx="8" fill="url(#gph)"/>`;
      for (let i = 0; i <= 14; i++) q += T(30 + i * 30, 84, i, { s: 13 });
      q += T(90, 110, "ácido", { s: 14, w: 800 }) + T(240, 110, "neutro", { s: 14, w: 800 }) + T(390, 110, "básico", { s: 14, w: 800 });
      return svg(480, 125, q, "Escala de pH del 0 al 14");
    },
    celula() {
      let q = `<rect x="40" y="20" width="380" height="250" rx="26" fill="${C.arena}" stroke="${C.pet}" stroke-width="7"/>`;
      q += `<rect x="52" y="32" width="356" height="226" rx="18" fill="#F7F3E6" stroke="${C.suave}" stroke-width="2"/>`;
      q += `<rect x="190" y="60" width="190" height="170" rx="40" fill="#D6EAF5" stroke="${C.azul}" stroke-width="2"/>`;
      q += `<circle cx="120" cy="100" r="38" fill="#D8CDE9" stroke="#7D6AA6" stroke-width="2.5"/><circle cx="128" cy="96" r="12" fill="#7D6AA6"/>`;
      for (const [x, y, r] of [[100, 200, 15], [150, 225, 0], [80, 160, -20]])
        q += `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="24" ry="12" fill="#6DBE6D" stroke="#2F7A3A" stroke-width="2"/><path d="M${x - 15} ${y - 3}h30M${x - 15} ${y + 3}h30" stroke="#2F7A3A" stroke-width="1.5"/></g>`;
      const et = (n, x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.tinta}" stroke-width="1.5"/><circle cx="${x2}" cy="${y2}" r="13" fill="${C.pet}"/>` + T(x2, y2 + 5, n, { s: 14, w: 900, c: "#fff" });
      q += et(1, 128, 96, 30, 70) + et(2, 150, 225, 210, 305 - 8) + et(3, 300, 150, 455, 150) + et(4, 420, 40, 455, 40);
      return svg(480, 310, q, "Esquema de una célula vegetal con cuatro estructuras numeradas");
    },
    punnett() {
      const x0 = 110, y0 = 60, c = 80;
      let q = T(x0 + c, 26, "Gametos de la planta 1", { s: 12, c: C.suave }) + T(30, y0 + c, "Planta 2", { s: 12, c: C.suave, r: -90 });
      ["A", "a"].forEach((g, i) => { q += T(x0 + i * c + c / 2, y0 - 10, g, { s: 22, w: 900 }) + T(x0 - 18, y0 + i * c + c / 2 + 8, g, { s: 22, w: 900 }); });
      const cel = [["AA", "Aa"], ["Aa", "aa"]];
      cel.forEach((f, r) => f.forEach((v, i) => {
        q += `<rect x="${x0 + i * c}" y="${y0 + r * c}" width="${c}" height="${c}" fill="${v === "aa" ? "#fff" : C.mentaC}" stroke="${C.pet}" stroke-width="2.5"/>`;
        q += T(x0 + i * c + c / 2, y0 + r * c + c / 2 + 8, v, { s: 22, w: 900 });
      }));
      return svg(300, 240, q, "Cuadro de Punnett de Aa por Aa");
    },
    cadena() {
      const seres = ["Pasto", "Saltamontes", "Rana", "Serpiente", "Águila"], w = 112, gap = 30;
      let q = "";
      seres.forEach((s, i) => {
        const x = 10 + i * (w + gap);
        q += `<rect x="${x}" y="30" width="${w}" height="56" rx="14" fill="${C.papel}" stroke="${C.pet}" stroke-width="2.5"/>` + T(x + w / 2, 64, s, { s: 15, w: 800 });
        if (i < seres.length - 1) q += flecha(x + w + 3, 58, x + w + gap - 3, 58, C.pet, 2.5);
      });
      q += T(352, 112, "La flecha indica «es comido por» (hacia dónde va la energía)", { s: 12, w: 600, c: C.suave });
      return svg(704, 124, q, "Cadena alimenticia: pasto, saltamontes, rana, serpiente, águila");
    },
    lineaTiempo() {
      const X = (a) => 30 + ((a - 1400) / 600) * 600;
      let q = `<line x1="20" x2="650" y1="80" y2="80" stroke="${C.pet}" stroke-width="4" stroke-linecap="round"/>`;
      for (let a = 1400; a <= 2000; a += 100) q += `<line x1="${X(a)}" x2="${X(a)}" y1="72" y2="88" stroke="${C.pet}" stroke-width="2"/>` + T(X(a), 112, a, { s: 12, w: 600, c: C.suave });
      [["A", 1453], ["B", 1789], ["C", 1914], ["D", 1989]].forEach(([l, a]) => {
        q += `<circle cx="${X(a)}" cy="80" r="9" fill="${l === "B" ? C.mentaO : C.menta}" stroke="${C.pet}" stroke-width="2"/>`;
        q += T(X(a), 40, l, { s: 20, w: 900 }) + T(X(a), 60, a, { s: 12, w: 800 });
      });
      return svg(680, 125, q, "Línea del tiempo de 1400 a 2000 con los puntos A 1453, B 1789, C 1914 y D 1989");
    },
    capas() {
      const cx = 170, cy = 170;
      let q = "";
      [[150, "#B5835A", "Corteza"], [140, "#E07B39", "Manto"], [80, "#F2B134", "Núcleo externo"], [42, "#F7DC6F", "Núcleo interno"]].forEach(([r, col], i) => {
        q += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" stroke="${C.tinta}" stroke-width="1.5"/>`;
      });
      const et = (txt, x1, y1, y2) => `<line x1="${x1}" y1="${y1}" x2="345" y2="${y2}" stroke="${C.tinta}" stroke-width="1.5"/>` + T(352, y2 + 5, txt, { s: 15, w: 800, a: "start" });
      q += et("Corteza", 272, 68, 40) + et("Manto", 270, 110, 110) + et("Núcleo externo", 235, 170, 180) + et("Núcleo interno", 185, 190, 250);
      return svg(500, 340, q, "Capas internas de la Tierra");
    },
    climograma() {
      const pp = [8, 6, 10, 22, 55, 140, 165, 160, 130, 50, 12, 7], tt = [13, 15, 17, 19, 19, 18, 17, 17, 17, 16, 15, 13];
      const m = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], x0 = 56, y0 = 230, w = 32, alto = 190;
      let q = "";
      for (let v = 0; v <= 200; v += 50) { const y = y0 - (v / 200) * alto; q += `<line x1="${x0}" x2="${x0 + 12 * w}" y1="${y}" y2="${y}" stroke="${C.caja}"/>` + T(x0 - 8, y + 4, v, { s: 11, w: 600, a: "end", c: C.azul }) + T(x0 + 12 * w + 8, y + 4, v / 5, { s: 11, w: 600, a: "start", c: C.rojo }); }
      pp.forEach((p, i) => { const h = (p / 200) * alto; q += `<rect x="${x0 + i * w + 5}" y="${y0 - h}" width="${w - 10}" height="${h}" rx="3" fill="${C.azul}"/>` + T(x0 + i * w + w / 2, y0 + 16, m[i], { s: 12 }); });
      q += `<polyline points="${tt.map((t, i) => `${x0 + i * w + w / 2},${(y0 - (t / 40) * alto).toFixed(1)}`).join(" ")}" fill="none" stroke="${C.rojo}" stroke-width="3"/>`;
      tt.forEach((t, i) => { q += `<circle cx="${x0 + i * w + w / 2}" cy="${(y0 - (t / 40) * alto).toFixed(1)}" r="3.5" fill="${C.rojo}"/>`; });
      q += T(16, y0 - alto / 2, "precipitación (mm)", { s: 12, r: -90, c: C.azul }) + T(x0 + 12 * w + 44, y0 - alto / 2, "temperatura (°C)", { s: 12, r: 90, c: C.rojo });
      return svg(510, 260, q, "Climograma: lluvias altas de junio a septiembre y temperatura entre 13 y 19 grados");
    },
    piramide() {
      const g = ["80+", "70–79", "60–69", "50–59", "40–49", "30–39", "20–29", "10–19", "0–9"], v = [1, 2, 3, 5, 7, 9, 11, 13, 15];
      const cx = 220, h = 24, y0 = 20, k = 11;
      let q = "";
      g.forEach((et, i) => {
        const y = y0 + i * h, a = v[i] * k;
        q += `<rect x="${cx - 32 - a}" y="${y}" width="${a}" height="${h - 4}" rx="3" fill="${C.pet}"/><rect x="${cx + 32}" y="${y}" width="${a}" height="${h - 4}" rx="3" fill="${C.menta}"/>`;
        q += T(cx, y + 15, et, { s: 11, w: 700 });
      });
      q += T(cx - 110, y0 + 9 * h + 22, "Hombres", { s: 13, w: 800 }) + T(cx + 110, y0 + 9 * h + 22, "Mujeres", { s: 13, w: 800 });
      return svg(440, 265, q, "Pirámide de población con base ancha y cima angosta");
    },
  };

  // ------------------------------------------------------------------- gráficas de resultados
  const RG = {
    dona(pct) {
      const r = 70, L = 2 * Math.PI * r;
      return svg(180, 180, `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${C.caja}" stroke-width="22"/>` +
        `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${C.mentaO}" stroke-width="22" stroke-linecap="round" stroke-dasharray="${(L * pct) / 100} ${L}" transform="rotate(-90 90 90)"/>` +
        T(90, 98, `${pct} %`, { s: 30, w: 900 }) + T(90, 120, "de aciertos", { s: 12, w: 700, c: C.suave }), `Dona: ${pct} por ciento de aciertos`, "grafica dona");
    },
    radar(datos) {
      const n = datos.length, cx = 230, cy = 190, R = 130, ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
      const P = (i, f) => [cx + R * f * Math.cos(ang(i)), cy + R * f * Math.sin(ang(i))];
      let q = "";
      for (const f of [0.25, 0.5, 0.75, 1]) q += `<polygon points="${datos.map((_, i) => P(i, f).map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${C.linea}"/>`;
      datos.forEach(([et], i) => {
        const [x, y] = P(i, 1), [lx, ly] = P(i, 1.2);
        q += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${C.linea}"/>`;
        q += T(lx, ly + 4, et, { s: 12, w: 800, a: Math.abs(lx - cx) < 10 ? "middle" : lx > cx ? "start" : "end" });
      });
      q += `<polygon points="${datos.map(([, p], i) => P(i, Math.max(p, 2) / 100).map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${C.menta}" fill-opacity="0.5" stroke="${C.mentaO}" stroke-width="3" stroke-linejoin="round"/>`;
      datos.forEach(([, p], i) => { const [x, y] = P(i, Math.max(p, 2) / 100); q += `<circle cx="${x}" cy="${y}" r="4" fill="${C.pet}"/>`; });
      return svg(460, 380, q, "Gráfica de radar del porcentaje de aciertos por materia");
    },
    barrasH(datos, sufijo, max) {
      const h = 34, x0 = 150, ancho = 260;
      let q = "";
      datos.forEach(([et, v, txt, color], i) => {
        const y = 10 + i * h, w = Math.max(2, (v / max) * ancho);
        q += T(x0 - 10, y + 17, et, { s: 13, w: 800, a: "end" });
        q += `<rect x="${x0}" y="${y + 4}" width="${ancho}" height="18" rx="9" fill="${C.caja}"/><rect x="${x0}" y="${y + 4}" width="${w}" height="18" rx="9" fill="${color || C.pet}"/>`;
        q += T(x0 + ancho + 8, y + 18, txt ?? `${v}${sufijo}`, { s: 13, w: 800, a: "start", c: C.suave });
      });
      return svg(480, 20 + datos.length * h, q, "Gráfica de barras por materia");
    },
  };

  // ------------------------------------------------------------------- examen
  const DURACION = 3 * 60 * 60 * 1000;
  const CLAVE = "verne-simulacro-unam-a2-v1";
  const TEL = "525584091167";
  const AREA = new Set(["Matemáticas", "Física", "Química", "Biología"]);
  const CORTO = { "Matemáticas": "Mate", "Física": "Física", "Química": "Química", "Biología": "Bio", "Español": "Español", "Literatura": "Lit.",
    "Historia Universal": "H. Univ.", "Historia de México": "H. Méx.", "Geografía": "Geo" };
  const $ = (s) => document.querySelector(s);
  const LETRAS = ["A", "B", "C", "D"];
  const barajar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const reloj = (ms) => { ms = Math.max(0, ms); const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000); return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; };
  const minutos = (ms) => Math.round(ms / 60000);
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")} min`;
  let B, TX, E, marca = Date.now();

  function decodifica() {
    const llave = new TextEncoder().encode("verne·a2·2027"), crudo = atob(window.SIM_DATOS), bytes = new Uint8Array(crudo.length);
    for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i) ^ llave[i % llave.length];
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  const materias = () => [...new Set(B.map((p) => p.as))];
  const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(E));
  const usado = () => E.usado + (E.fin || $("#examen").hidden ? 0 : Date.now() - marca);
  const figura = (p) => (p.fig ? `<div class="figura">${FIG[p.fig[0]](...p.fig.slice(1))}</div>` : "");

  function acumula() { // suma el tiempo transcurrido a la pregunta actual y al total
    if (!E || E.fin || $("#examen").hidden) { marca = Date.now(); return; }
    const d = Date.now() - marca;
    marca = Date.now();
    E.usado += d;
    E.tq[E.actual] = (E.tq[E.actual] || 0) + d;
  }

  function nuevo(nombre) {
    E = { nombre, opciones: B.map((p) => barajar(p.op.map((_, i) => i))), resp: {}, tq: {}, actual: 0, usado: 0, inicio: Date.now(), fin: null };
    guardar();
  }

  function pantalla(id) {
    for (const s of ["#inicio", "#examen", "#resultado"]) $(s).hidden = s !== id;
    marca = Date.now();
    window.scrollTo({ top: 0 });
  }

  function pintar() {
    const k = E.actual, p = B[k], lista = materias(), sec = lista.indexOf(p.as) + 1;
    $("#num").textContent = `Pregunta ${k + 1} de ${B.length}`;
    $("#asig").textContent = p.as;
    $("#seccion").textContent = `Sección ${sec} de ${lista.length}`;
    const n = Object.keys(E.resp).length;
    $("#barra").style.width = `${(100 * n) / B.length}%`;
    $("#contestadas").textContent = `${n} de ${B.length} contestadas`;
    const texto = $("#texto");
    texto.hidden = !p.t;
    if (p.t) texto.querySelector("div").innerHTML = TX[p.t];
    $("#pregunta").innerHTML = p.q + figura(p);
    const ops = $("#opciones");
    ops.innerHTML = "";
    E.opciones[k].forEach((oi, pos) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opcion";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(E.resp[k] === oi));
      b.innerHTML = `<span class="opcion__letra">${LETRAS[pos]}</span><span class="opcion__texto">${p.op[oi]}</span>`;
      b.addEventListener("click", () => { E.resp[k] = oi; acumula(); guardar(); pintar(); });
      ops.appendChild(b);
    });
    $("#anterior").disabled = k === 0;
    $("#siguiente").textContent = k === B.length - 1 ? "Terminar" : "Siguiente";
    pintarMapa();
  }

  function pintarMapa() {
    const m = $("#mapa-rejilla");
    m.innerHTML = "";
    for (const as of materias()) {
      const g = document.createElement("div");
      g.className = "mapa__grupo";
      const idx = B.map((p, i) => [p, i]).filter(([p]) => p.as === as).map(([, i]) => i);
      const hechas = idx.filter((i) => i in E.resp).length;
      g.innerHTML = `<p class="mapa__titulo">${as} <span>${hechas}/${idx.length}</span></p>`;
      const r = document.createElement("div");
      r.className = "mapa__nums";
      for (const i of idx) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = i + 1;
        b.className = "mapa__n" + (i in E.resp ? " is-hecha" : "") + (i === E.actual ? " is-actual" : "");
        b.setAttribute("aria-label", `Pregunta ${i + 1}${i in E.resp ? ", contestada" : ""}`);
        b.addEventListener("click", () => { acumula(); E.actual = i; guardar(); pintar(); $("#mapa").open = false; window.scrollTo({ top: 0 }); });
        r.appendChild(b);
      }
      g.appendChild(r);
      m.appendChild(g);
    }
  }

  function terminar(forzado = false) {
    acumula();
    const faltan = B.length - Object.keys(E.resp).length;
    if (!forzado && faltan > 0 && !confirm(`Te faltan ${faltan} preguntas. Las que dejes en blanco cuentan como incorrectas. ¿Quieres terminar de todos modos?`)) return;
    E.fin = Date.now();
    guardar();
    resultados();
  }

  function resultados() {
    const porAs = {}, tiempo = {}, reforzar = {}, malas = [];
    let aciertos = 0;
    B.forEach((p, k) => {
      const ok = E.resp[k] === 0;
      aciertos += ok;
      (porAs[p.as] ??= [0, 0]); porAs[p.as][0] += ok; porAs[p.as][1]++;
      tiempo[p.as] = (tiempo[p.as] || 0) + (E.tq[k] || 0);
      if (!ok) { (reforzar[p.as] ??= new Set()).add(p.tema); malas.push(k + 1); }
    });
    const pct = Math.round((100 * aciertos) / B.length);
    const pctAs = Object.entries(porAs).map(([n, [a, t]]) => [n, Math.round((100 * a) / t), a, t]);
    const area = pctAs.filter(([n]) => AREA.has(n)).reduce((s, [, , a, t]) => [s[0] + a, s[1] + t], [0, 0]);
    $("#r-nombre").textContent = E.nombre;
    $("#r-total").textContent = `${aciertos}`;
    $("#r-de").textContent = `de ${B.length} aciertos`;
    $("#r-pct").textContent = `Tiempo usado: ${minutos(E.usado)} de 180 min · Materias del Área 2 (Mate, Física, Química y Bio): ${area[0]}/${area[1]}`;
    $("#r-dona").innerHTML = RG.dona(pct);
    $("#r-barras").innerHTML = RG.barrasH(pctAs.map(([n, p, a, t]) => [n, p, `${a}/${t}`, AREA.has(n) ? C.pet : C.mentaO]), " %", 100);
    $("#r-radar").innerHTML = RG.radar(pctAs.map(([n, p]) => [CORTO[n], p]));
    const tmax = Math.max(1, ...Object.values(tiempo));
    $("#r-tiempo").innerHTML = RG.barrasH(Object.entries(tiempo).map(([n, ms]) => [n, ms, mmss(ms), C.suave]), "", tmax);
    const temas = Object.entries(reforzar).sort((a, b) => b[1].size - a[1].size);
    $("#r-temas").innerHTML = temas.length
      ? temas.map(([as, s]) => `<li><strong>${as}:</strong> ${[...s].join(", ")}</li>`).join("")
      : "<li>¡Sin errores! Excelente preparación.</li>";
    $("#r-revision").innerHTML = B.map((p, k) => {
      const r = E.resp[k], ok = r === 0;
      const tuya = r === undefined ? "<em>Sin contestar</em>" : p.op[r];
      return `<li class="${ok ? "bien" : "mal"}"><p class="rev__as">${k + 1} · ${p.as} · ${p.tema}</p><div class="rev__q">${p.q}${figura(p)}</div>
        <p><strong>Tu respuesta:</strong> ${tuya}</p>${ok ? "" : `<p><strong>Correcta:</strong> ${p.op[0]}</p>`}
        <p class="rev__ex">${p.ex}</p></li>`;
    }).join("");
    const lineas = [`Hola, terminé el Simulacro Verne tipo UNAM (Área 2).`, `Nombre: ${E.nombre}`,
      `Resultado: ${aciertos}/${B.length} (${pct} %) en ${minutos(E.usado)} min`, ``, `Por materia:`,
      ...pctAs.map(([n, , a, t]) => `• ${n}: ${a}/${t}`), ``, `Preguntas incorrectas o sin contestar: ${malas.join(", ") || "ninguna"}`];
    $("#r-whatsapp").href = `https://wa.me/${TEL}?text=${encodeURIComponent(lineas.join("\n"))}`;
    pantalla("#resultado");
  }

  function tic() {
    if (!E || E.fin || $("#examen").hidden) return;
    const resta = DURACION - usado();
    $("#tiempo").textContent = reloj(resta);
    $("#reloj").classList.toggle("is-poco", resta < 15 * 60000);
    if (resta <= 0) { alert("Se acabaron las 3 horas. Vamos a calificar tu simulacro."); terminar(true); }
  }

  function inicioInfo() {
    const cuenta = {};
    for (const p of B) cuenta[p.as] = (cuenta[p.as] || 0) + 1;
    $("#i-distribucion").innerHTML = RG.barrasH(Object.entries(cuenta).map(([n, v]) => [n, v, `${v}`, AREA.has(n) ? C.pet : C.mentaO]), "", 24);
  }

  document.addEventListener("DOMContentLoaded", () => {
    ({ banco: B, textos: TX } = decodifica());
    inicioInfo();
    try { E = JSON.parse(localStorage.getItem(CLAVE)); } catch { E = null; }
    if (E && (!E.opciones || E.opciones.length !== B.length)) E = null;
    if (E && !E.fin) { $("#continuar").hidden = false; $("#continuar-nombre").textContent = E.nombre; $("#continuar-tiempo").textContent = reloj(DURACION - E.usado); }
    $("#form-inicio").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const nombre = $("#nombre").value.trim();
      if (!nombre) { $("#nombre").focus(); return; }
      if (E && !E.fin && !confirm("Ya tienes un simulacro empezado. Si empiezas uno nuevo, se borra tu avance. ¿Continuar?")) return;
      nuevo(nombre);
      pantalla("#examen");
      pintar();
    });
    $("#btn-continuar").addEventListener("click", () => { pantalla("#examen"); pintar(); });
    const ir = (d) => { acumula(); E.actual += d; guardar(); pintar(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    $("#anterior").addEventListener("click", () => { if (E.actual > 0) ir(-1); });
    $("#siguiente").addEventListener("click", () => { if (E.actual < B.length - 1) ir(1); else terminar(); });
    $("#btn-terminar").addEventListener("click", () => terminar());
    $("#otra-vez").addEventListener("click", () => {
      if (!confirm("Se borrará este resultado de este dispositivo. ¿Seguro?")) return;
      localStorage.removeItem(CLAVE); E = null; $("#continuar").hidden = true; pantalla("#inicio");
    });
    $("#imprimir").addEventListener("click", () => { document.querySelector(".revision").open = true; window.print(); });
    document.addEventListener("keydown", (ev) => {
      if ($("#examen").hidden || ["INPUT", "TEXTAREA"].includes(ev.target.tagName)) return;
      const i = "abcd".indexOf(ev.key.toLowerCase());
      if (i >= 0) $("#opciones").children[i]?.click();
      if (ev.key === "ArrowRight") $("#siguiente").click();
      if (ev.key === "ArrowLeft") $("#anterior").click();
    });
    const pausa = () => { if (E && !E.fin) { acumula(); guardar(); } };
    window.addEventListener("pagehide", pausa);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pausa(); else marca = Date.now(); });
    setInterval(() => { tic(); }, 1000);
    setInterval(() => { if (E && !E.fin && !$("#examen").hidden) { acumula(); guardar(); } }, 15000);
    if (E && E.fin) resultados();
  });
})();
