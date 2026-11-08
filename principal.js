// Electrones del logo: giran sobre las órbitas ORIGINALES (elipses ajustadas al logo vectorizado).
// Respeta "reducir movimiento" y se pausa cuando el logo no está en pantalla.
(() => {
  const svg = document.querySelector(".logo-animado");
  if (!svg) return;
  const { centro, orbitas } = JSON.parse(svg.dataset.orbitas);
  const [cx, cy] = centro;
  const electrones = [...svg.querySelectorAll(".electron")].map((el) => ({
    el,
    o: orbitas[Number(el.dataset.orbita)],
    t0: Number(el.dataset.t),
  }));
  const VUELTA_S = 9; // segundos por vuelta
  const INICIO_S = 2.2; // coincide con la aparición de los electrones en estilos.css

  const colocar = (tSeg) => {
    for (const { el, o, t0 } of electrones) {
      const t = ((t0 + (360 * tSeg) / VUELTA_S) * Math.PI) / 180;
      const a = (o.angulo * Math.PI) / 180;
      const x = o.rx * Math.cos(t);
      const y = o.ry * Math.sin(t);
      el.setAttribute("cx", (cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(2));
      el.setAttribute("cy", (cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(2));
    }
  };
  colocar(0);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let visible = true;
  let previo = null;
  let reloj = 0;
  let giro = 0;
  let velocidad = 0;
  let objetivo = 1;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(svg);
  // Al pasar el cursor (o tocar) el logo, los electrones aceleran; al salir vuelven a su ritmo.
  const zona = svg.closest(".portada__marca") || svg;
  zona.addEventListener("pointerenter", () => { objetivo = 4; });
  zona.addEventListener("pointerleave", () => { objetivo = 1; });
  zona.addEventListener("pointerdown", () => { objetivo = 4; setTimeout(() => { objetivo = 1; }, 1600); });
  const cuadro = (ms) => {
    const dt = previo === null ? 0 : Math.min(0.05, (ms - previo) / 1000);
    previo = ms;
    if (visible && !document.hidden) {
      reloj += dt;
      // Arranque suave cuando aparecen; después la velocidad sigue al objetivo con inercia.
      const meta = reloj < INICIO_S ? 0 : objetivo;
      velocidad += (meta - velocidad) * Math.min(1, dt * 2.5);
      giro += velocidad * dt;
      colocar(giro);
    }
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
})();
