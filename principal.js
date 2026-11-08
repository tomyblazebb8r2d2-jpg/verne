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
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(svg);
  const cuadro = (ms) => {
    if (previo !== null && visible && !document.hidden) reloj += (ms - previo) / 1000;
    previo = ms;
    // Arranque suave: aceleran desde cero en el primer segundo tras aparecer.
    const dt = Math.max(0, reloj - INICIO_S);
    const giro = dt < 1 ? (dt * dt) / 2 : dt - 0.5;
    colocar(giro);
    requestAnimationFrame(cuadro);
  };
  requestAnimationFrame(cuadro);
})();
