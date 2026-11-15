// Verne · agenda · panel de administrador (fase 1: sin Google Calendar).
import { api, modo, TABLAS } from './datos.js';
import * as L from './logica.js';

const E = {};                       // estado: una lista por tabla
let vista = 'semana';
let semana = L.lunesDe(L.hoy());
let alumnoAbierto = null;
let periodo = { desde: L.hoy().slice(0, 8) + '01', hasta: L.hoy() };

const $ = (s) => document.querySelector(s);
const H0 = 7, H1 = 22, PX = 46;     // horario visible y alto de una hora

// ───────────── Utilidades de pantalla ─────────────
function h(etiqueta, attrs = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat(Infinity)) if (hijo != null && hijo !== false) el.append(hijo);
  return el;
}

let relojAviso;
function avisa(texto, error = false) {
  const a = $('#aviso');
  a.textContent = texto; a.className = error ? 'error' : ''; a.hidden = false;
  clearTimeout(relojAviso);
  relojAviso = setTimeout(() => { a.hidden = true; }, error ? 7000 : 3000);
}

/** Envuelve una acción: muestra el error en vez de fallar en silencio y vuelve a pintar. */
const accion = (fn) => async (...args) => {
  try { await fn(...args); } catch (e) { console.error(e); avisa(e.message || 'Algo salió mal', true); }
  pinta();
};

const fechaLarga = (iso) => L.aFecha(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fechaCorta = (iso) => L.aFecha(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const por = (tabla, id) => E[tabla].find((f) => f.id === id);
const nombre = (tabla, id) => por(tabla, id)?.nombre || '—';
const ordena = (lista, f) => [...lista].sort((a, b) => String(f(a)).localeCompare(String(f(b)), 'es'));
const profesActivos = () => ordena(E.profes.filter((p) => p.activo), (p) => p.nombre);
const opsProfes = () => [['', 'Sin asignar'], ...profesActivos().map((p) => [p.id, p.nombre])];
const opsAlumnos = () => ordena(E.alumnos.filter((a) => a.activo), (a) => a.nombre).map((a) => [a.id, a.nombre]);

// ───────────── Cambios de datos (red + estado local) ─────────────
async function creaVarias(tabla, filas) {
  if (!filas.length) return [];
  const nuevas = await api.crea(tabla, filas);
  E[tabla].push(...nuevas);
  return nuevas;
}
const crea = async (tabla, fila) => (await creaVarias(tabla, [fila]))[0];
async function cambia(tabla, id, cambios) {
  await api.cambia(tabla, id, cambios);
  Object.assign(por(tabla, id), cambios);
}
async function borra(tabla, id) {
  await api.borra(tabla, id);
  E[tabla] = E[tabla].filter((f) => f.id !== id);
}
const anota = (accionHecha, detalle) => crea('auditoria', { accion: accionHecha, detalle });

// ───────────── Google Calendar ─────────────
const G = { listo: false, configurado: false, conectado: false, correo: null, calendario: null, error: null };
async function cargaGoogle() {
  try { Object.assign(G, { error: null }, await api.funcion('gcal', { accion: 'estado' })); } catch (e) { G.conectado = false; G.error = e.message; }
  G.listo = true;
}
/** Manda a Google el estado actual de una clase suelta. Si Google falla, la app ya guardó: solo avisa. */
async function sincroniza(c) {
  if (!G.conectado || c.serie_id) return null;
  try {
    const r = await api.funcion('gcal', { accion: 'sincronizar_clase', clase_id: c.id });
    if ('evento' in r) Object.assign(c, { google_event_id: r.evento, meet: r.meet });
    return r;
  } catch (e) {
    avisa(`Guardado en la app, pero Google Calendar falló: ${e.message}`, true);
    return { accion: 'error' };
  }
}
const textoGoogle = (r, base) => (!r || r.accion === 'error' ? null
  : `${base} · Google Calendar ${G.calendario === 'prueba' ? '(calendario de prueba) ' : ''}actualizado`);
const avisaCon = (r, base) => { if (!r) avisa(base); else if (r.accion !== 'error') avisa(textoGoogle(r, base)); };

// ───────────── Diálogos ─────────────
function abre(contenido) {
  const d = $('#dlg');
  d.replaceChildren(contenido);
  if (!d.open) d.showModal();
  return d;
}
const cierra = () => $('#dlg').close();

/** Formulario genérico. Devuelve los valores o null si se canceló. */
function formulario(titulo, campos, valores = {}, textoBoton = 'Guardar') {
  return new Promise((listo) => {
    const entradas = {};
    const filas = campos.map((c) => {
      const v = valores[c.n];
      let ent;
      if (c.t === 'select') {
        ent = h('select', { required: c.req }, c.ops.map(([val, txt]) => h('option', { value: val }, txt)));
        ent.value = v ?? '';
      } else if (c.t === 'area') ent = h('textarea', { rows: 3 }, v ?? '');
      else if (c.t === 'check') ent = h('input', { type: 'checkbox', checked: !!v });
      else ent = h('input', { type: c.t || 'text', value: v ?? '', required: c.req, step: c.t === 'number' ? 'any' : c.t === 'time' ? 1800 : null });
      entradas[c.n] = ent;
      return c.t === 'check'
        ? h('label', { class: 'casilla' }, ent, c.e)
        : h('label', {}, c.e, ent, c.ayuda && h('small', {}, c.ayuda));
    });
    const f = h('form', { method: 'dialog' }, h('h2', {}, titulo), filas,
      h('div', { class: 'botones' },
        h('button', { type: 'button', onclick: () => { cierra(); listo(null); } }, 'Cancelar'),
        h('button', { class: 'principal' }, textoBoton)));
    f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const r = {};
      for (const c of campos) {
        const ent = entradas[c.n];
        if (c.t === 'check') r[c.n] = ent.checked;
        else if (c.t === 'number') r[c.n] = ent.value === '' ? null : Number(ent.value);
        else r[c.n] = ent.value.trim() === '' ? null : ent.value.trim();
      }
      cierra(); listo(r);
    });
    abre(f).oncancel = () => listo(null);
  });
}

/** Pregunta de sí o no. */
function pregunta(titulo, texto, si = 'Sí', no = 'No') {
  return new Promise((listo) => {
    const fin = (v) => { cierra(); listo(v); };
    abre(h('div', { class: 'cuerpo' }, h('h2', {}, titulo), h('p', {}, texto),
      h('div', { class: 'botones' },
        h('button', { onclick: () => fin(false) }, no),
        h('button', { class: 'principal', onclick: () => fin(true) }, si)))).oncancel = () => listo(false);
  });
}

// ───────────── Series: generar clases ─────────────
async function extiendeSeries() {
  const horizonte = L.sumaDias(L.hoy(), 7 * L.SEMANAS_ADELANTE);
  for (const s of E.series) {
    const nuevas = L.clasesFaltantes(s,
      E.serie_pausas.filter((p) => p.serie_id === s.id),
      E.suplencias.filter((x) => x.serie_id === s.id),
      E.clases.filter((c) => c.serie_id === s.id), horizonte);
    await creaVarias('clases', nuevas);
  }
}
const programadasDesde = (serieId, desde, hasta) =>
  E.clases.filter((c) => c.serie_id === serieId && c.estado === 'programada' && c.fecha >= desde && (!hasta || c.fecha <= hasta));

// ───────────── Vista: semana ─────────────
function pintaSemana() {
  const dias = [0, 1, 2, 3, 4, 5, 6].map((i) => L.sumaDias(semana, i));
  const visibles = E.clases.filter((c) => c.fecha >= dias[0] && c.fecha <= dias[6] && c.estado !== 'recorrida');
  const chocan = L.choques(visibles);
  const pares = L.paresChoque(visibles);
  const nums = L.numeros(E.clases);

  const columna = (dia) => {
    const lista = visibles.filter((c) => c.fecha === dia).sort((a, b) => a.hora.localeCompare(b.hora));
    const fines = [];                                   // fin (minutos) de cada carril
    const carril = new Map();
    for (const c of lista) {
      const ini = L.aMinutos(c.hora), fin = ini + c.duracion_h * 60;
      let k = fines.findIndex((f) => f <= ini);
      if (k < 0) k = fines.length;
      fines[k] = fin; carril.set(c.id, k);
    }
    const n = Math.max(1, fines.length);
    return h('div', {
      class: 'dia', style: `height:${(H1 - H0) * PX}px`,
      onclick: (ev) => {
        if (ev.target !== ev.currentTarget) return;
        const hora = Math.min(H1 - 1, H0 + Math.floor(ev.offsetY / PX));
        nuevaClase(dia, L.aHora(hora * 60));
      },
    }, lista.map((c) => {
      const p = por('profes', c.profe_id);
      const k = carril.get(c.id);
      const clases = ['clase', c.estado, !p && 'sin-profe', chocan.has(c.id) && 'choque'].filter(Boolean).join(' ');
      const estilo = `top:${(L.aMinutos(c.hora) / 60 - H0) * PX + 1}px;height:${c.duracion_h * PX - 2}px;` +
        `left:calc(${(100 / n) * k}% + 2px);width:calc(${100 / n}% - 4px);${p?.color ? `--c:${p.color}` : ''}`;
      const num = nums.get(c.id);
      return h('button', { class: clases, style: estilo, title: chocan.has(c.id) ? 'Choque de horario' : null, onclick: () => fichaClase(c) },
        h('b', {}, nombre('alumnos', c.alumno_id)),
        `${c.hora} · ${p ? p.nombre : 'Sin asesor'}`, num ? ` · #${num}` : '',
        c.estado === 'dada' ? ' · dada' : '');
    }));
  };

  return h('div', {},
    h('div', { class: 'encabezado' },
      h('h1', {}, `Semana del ${fechaCorta(dias[0])} al ${fechaCorta(dias[6])}`),
      h('button', { onclick: () => { semana = L.sumaDias(semana, -7); pinta(); } }, '← Anterior'),
      h('button', { onclick: () => { semana = L.lunesDe(L.hoy()); pinta(); } }, 'Hoy'),
      h('button', { onclick: () => { semana = L.sumaDias(semana, 7); pinta(); } }, 'Siguiente →'),
      h('button', { class: 'principal', onclick: () => nuevaClase(L.hoy(), '17:00') }, 'Nueva clase')),
    h('div', { class: 'leyenda' },
      profesActivos().map((p) => h('span', {}, h('span', { class: 'punto', style: `background:${p.color || '#8a959a'}` }), p.nombre)),
      h('span', {}, h('span', { class: 'punto', style: 'background:#fff;border:2px dashed #8a959a' }), 'Sin asesor'),
      chocan.size ? h('span', { class: 'etiqueta mal' }, `${chocan.size} clases con choque`) : null),
    h('div', { class: 'semana-env' }, h('div', { class: 'semana' },
      h('div', { class: 'cab' }),
      dias.map((d) => h('div', { class: d === L.hoy() ? 'cab hoy' : 'cab' }, L.DIAS[L.diaSemana(d)], h('small', {}, fechaCorta(d)))),
      h('div', { class: 'horas', style: `height:${(H1 - H0) * PX}px` },
        Array.from({ length: H1 - H0 - 1 }, (_, i) => h('span', { style: `top:${(i + 1) * PX}px` }, `${H0 + i + 1}:00`))),
      dias.map(columna))),
    pares.length ? h('section', {},
      h('h2', {}, `Choques de horario esta semana (${pares.length})`),
      h('p', { class: 'nota' }, 'Es solo un aviso: la app no bloquea nada. Se quita al cambiar el asesor o la hora de una de las dos clases.'),
      h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, pares.map(([a, b, motivo]) => h('tr', {},
        h('td', {}, `${L.DIAS[L.diaSemana(a.fecha)]} ${fechaCorta(a.fecha)}`),
        h('td', {}, h('b', {}, nombre('alumnos', a.alumno_id)), ` ${a.hora}–${L.finDe(a)}`, ' y ', h('b', {}, nombre('alumnos', b.alumno_id)), ` ${b.hora}–${L.finDe(b)}`),
        h('td', {}, motivo === 'asesor' ? `Mismo asesor: ${nombre('profes', a.profe_id)}` : 'Mismo alumno en dos clases'),
        h('td', { class: 'acciones' },
          h('button', { class: 'chico', onclick: () => fichaClase(a) }, `Abrir ${nombre('alumnos', a.alumno_id)}`),
          h('button', { class: 'chico', onclick: () => fichaClase(b) }, `Abrir ${nombre('alumnos', b.alumno_id)}`)))))))) : null);
}

const camposClase = () => [
  { n: 'alumno_id', e: 'Alumno', t: 'select', ops: [['', 'Elige…'], ...opsAlumnos()], req: true },
  { n: 'profe_id', e: 'Asesor', t: 'select', ops: opsProfes() },
  { n: 'fecha', e: 'Fecha', t: 'date', req: true },
  { n: 'hora', e: 'Hora de inicio', t: 'time', req: true },
  { n: 'duracion_h', e: 'Duración', t: 'select', ops: [['1', '1 hora'], ['2', '2 horas']], req: true },
  { n: 'nota', e: 'Nota', t: 'area' },
];

const nuevaClase = accion(async (fecha, hora) => {
  const v = await formulario('Nueva clase', camposClase(), { fecha, hora, duracion_h: '1' }, 'Crear clase');
  if (!v) return;
  const c = await crea('clases', { ...v, duracion_h: Number(v.duracion_h), estado: 'programada' });
  await anota('Clase creada', { alumno: nombre('alumnos', c.alumno_id), fecha: c.fecha, hora: c.hora });
  avisaCon(await sincroniza(c), 'Clase creada');
});

function fichaClase(c) {
  const alumno = por('alumnos', c.alumno_id);
  const cargo = E.movimientos.find((m) => m.clase_id === c.id && m.tipo === 'clase');
  const pago = E.movimientos.find((m) => m.clase_id === c.id && m.tipo === 'pago');
  const recargo = E.movimientos.find((m) => m.clase_id === c.id && m.tipo === 'recargo');
  const num = L.numeros(E.clases).get(c.id);
  const monto = L.montoClase(c, alumno);
  const hacer = (fn) => accion(async () => { cierra(); await fn(); });

  const editar = hacer(async () => {
    const v = await formulario('Mover o editar clase', camposClase().slice(1), { ...c, profe_id: c.profe_id || '', duracion_h: String(c.duracion_h) });
    if (!v) return;
    const antes = { fecha: c.fecha, hora: c.hora, asesor: nombre('profes', c.profe_id) };
    await cambia('clases', c.id, { ...v, duracion_h: Number(v.duracion_h) });
    if (cargo && monto != null) await cambia('movimientos', cargo.id, { monto: L.montoClase(c, alumno), fecha: c.fecha });
    await anota('Clase editada', { alumno: alumno.nombre, antes, despues: { fecha: c.fecha, hora: c.hora, asesor: nombre('profes', c.profe_id) } });
    avisaCon(await sincroniza(c), 'Clase actualizada');
  });

  const marcarDada = hacer(async () => {
    if (!c.profe_id) throw new Error('Asigna un asesor antes de marcarla como dada.');
    if (monto == null) throw new Error(`Falta la tarifa por hora de ${alumno.nombre}. Captúrala en Alumnos.`);
    await crea('movimientos', { alumno_id: c.alumno_id, tipo: 'clase', monto, clase_id: c.id, fecha: c.fecha });
    await cambia('clases', c.id, { estado: 'dada' });
    await anota('Clase dada', { alumno: alumno.nombre, fecha: c.fecha, monto });
    avisa(`Clase dada · cargo de ${L.pesos(monto)}`);
  });

  const quitarDada = hacer(async () => {
    if (cargo) await borra('movimientos', cargo.id);
    await cambia('clases', c.id, { estado: 'programada' });
    await anota('Clase desmarcada como dada', { alumno: alumno.nombre, fecha: c.fecha });
  });

  const marcarPagada = hacer(async () => {
    const v = await formulario('Registrar pago de esta clase', [
      { n: 'monto', e: 'Monto', t: 'number', req: true },
      { n: 'fecha', e: 'Fecha del pago', t: 'date', req: true },
      { n: 'forma_pago', e: 'Forma de pago', t: 'select', ops: [['', '—'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['otro', 'Otro']] },
    ], { monto: monto ?? '', fecha: L.hoy() }, 'Registrar pago');
    if (!v) return;
    await crea('movimientos', { alumno_id: c.alumno_id, tipo: 'pago', clase_id: c.id, ...v });
    await anota('Pago de clase', { alumno: alumno.nombre, fecha_clase: c.fecha, monto: v.monto });
    avisa('Pago registrado');
  });

  const quitarPago = hacer(async () => {
    if (!(await pregunta('Quitar pago', `Se quitará el pago de ${L.pesos(pago.monto)} registrado para esta clase.`, 'Quitar pago', 'Dejarlo'))) return;
    await borra('movimientos', pago.id);
    await anota('Pago de clase quitado', { alumno: alumno.nombre, fecha_clase: c.fecha, monto: pago.monto });
  });

  const cancelar = hacer(async () => {
    const v = await formulario('Cancelar clase', [
      { n: 'cancelo', e: '¿Quién cancela?', t: 'select', ops: [['cliente', 'El cliente'], ['verne', 'Verne (asesor no puede u otro motivo)']], req: true },
      { n: 'nota', e: 'Motivo', t: 'area' },
    ], { cancelo: 'cliente', nota: c.nota }, 'Cancelar clase');
    if (!v) return;
    let conRecargo = false;
    if (L.proponeRecargo(c, alumno, v.cancelo)) {
      conRecargo = await pregunta('Recargo por cancelación tardía',
        `Faltan menos de 24 horas para la clase. La regla es un recargo de ${L.pesos(L.RECARGO)}. Tú decides si se cobra a ${alumno.nombre}.`,
        `Aplicar ${L.pesos(L.RECARGO)}`, 'No cobrar');
    }
    await cambia('clases', c.id, { estado: 'cancelada', ...v });
    if (conRecargo) await crea('movimientos', { alumno_id: c.alumno_id, tipo: 'recargo', monto: L.RECARGO, clase_id: c.id, fecha: L.hoy(), nota: 'Cancelación con menos de 24 h' });
    await anota('Clase cancelada', { alumno: alumno.nombre, fecha: c.fecha, cancelo: v.cancelo, recargo: conRecargo });
    avisaCon(await sincroniza(c), conRecargo ? 'Clase cancelada con recargo' : 'Clase cancelada');
  });

  const reactivar = hacer(async () => {
    if (recargo) await borra('movimientos', recargo.id);
    await cambia('clases', c.id, { estado: 'programada', cancelo: null });
    await anota('Clase reactivada', { alumno: alumno.nombre, fecha: c.fecha });
    avisaCon(await sincroniza(c), 'Clase reactivada');
  });

  const enviarAGoogle = hacer(async () => {
    const r = await sincroniza(c);
    if (r && r.accion !== 'error') await anota('Clase enviada a Google Calendar', { alumno: alumno.nombre, fecha: c.fecha, calendario: G.calendario });
    avisaCon(r, 'Clase enviada');
  });
  const enGoogle = G.conectado && !c.serie_id && c.estado !== 'cancelada';

  const estados = { programada: 'Programada', dada: 'Dada', cancelada: 'Cancelada', recorrida: 'Recorrida' };
  abre(h('div', { class: 'cuerpo' },
    h('h2', {}, alumno.nombre),
    h('dl', { class: 'datos' },
      h('dt', {}, 'Cuándo'), h('dd', {}, `${fechaLarga(c.fecha)}, ${c.hora}–${L.finDe(c)}`),
      h('dt', {}, 'Asesor'), h('dd', {}, c.profe_id ? nombre('profes', c.profe_id) : h('span', { class: 'etiqueta falta' }, 'Sin asignar')),
      h('dt', {}, 'Clase'), h('dd', {}, num ? `#${num} de su serie` : c.serie_id ? '—' : 'Suelta (sin serie)'),
      h('dt', {}, 'Estado'), h('dd', {}, estados[c.estado], c.cancelo ? ` (canceló ${c.cancelo === 'cliente' ? 'el cliente' : 'Verne'})` : ''),
      h('dt', {}, 'Importe'), h('dd', {}, monto == null ? h('span', { class: 'etiqueta falta' }, 'Falta tarifa del alumno') : L.pesos(monto),
        pago ? h('span', { class: 'etiqueta ok', style: 'margin-left:.5rem' }, `Pagada ${L.pesos(pago.monto)}`) : null,
        recargo ? h('span', { class: 'etiqueta mal', style: 'margin-left:.5rem' }, `Recargo ${L.pesos(recargo.monto)}`) : null),
      c.meet ? [h('dt', {}, 'Meet'), h('dd', {}, h('a', { href: c.meet, target: '_blank', rel: 'noopener' }, c.meet.replace('https://', '')))] : null,
      enGoogle ? [h('dt', {}, 'Google'), h('dd', {}, c.google_event_id
        ? h('span', { class: 'etiqueta ok' }, G.calendario === 'prueba' ? 'En el calendario de prueba' : 'En tu Google Calendar')
        : h('span', { class: 'etiqueta falta' }, 'Aún no está en Google Calendar'))] : null,
      c.nota ? [h('dt', {}, 'Nota'), h('dd', {}, c.nota)] : null),
    h('div', { class: 'botones' },
      c.estado === 'programada' && h('button', { onclick: editar }, 'Mover o editar'),
      c.estado === 'programada' && h('button', { class: 'principal', onclick: marcarDada }, 'Marcar dada'),
      c.estado === 'dada' && h('button', { onclick: quitarDada }, 'Quitar «dada»'),
      c.estado !== 'cancelada' && !pago && h('button', { onclick: marcarPagada }, 'Marcar pagada'),
      pago && h('button', { onclick: quitarPago }, 'Quitar pago'),
      c.estado === 'programada' && h('button', { class: 'peligro', onclick: cancelar }, 'Cancelar clase'),
      c.estado === 'cancelada' && h('button', { onclick: reactivar }, 'Reactivar'),
      enGoogle && h('button', { onclick: enviarAGoogle }, c.google_event_id ? 'Reenviar a Google' : 'Enviar a Google'),
      h('button', { onclick: cierra }, 'Cerrar'))));
}

// ───────────── Vista: alumnos ─────────────
const NIVELES = { basico: ['Primaria a prepa', 180], universidad: ['Universidad', 200] };
const camposAlumno = [
  { n: 'nombre', e: 'Nombre del alumno', req: true },
  { n: 'nivel', e: 'Nivel', t: 'select', ops: [['', 'Sin definir'], ['basico', 'Primaria a prepa ($180/h)'], ['universidad', 'Universidad ($200/h)']] },
  { n: 'tarifa_hora', e: 'Tarifa por hora', t: 'number', ayuda: 'Si la dejas vacía y eliges nivel, se pone el precio publicado.' },
  { n: 'correo', e: 'Correo del alumno', t: 'email' },
  { n: 'saldo_inicial', e: 'Saldo inicial', t: 'number', ayuda: 'Lo que debía al arrancar la app. Negativo si tenía saldo a favor.' },
  { n: 'fecha_arranque', e: 'Fecha de arranque del saldo', t: 'date' },
  { n: 'exento_recargo', e: 'Exento del recargo por cancelación tardía', t: 'check' },
  { n: 'activo', e: 'Alumno activo', t: 'check' },
  { n: 'notas', e: 'Notas', t: 'area' },
];

const editaAlumno = accion(async (a) => {
  const v = await formulario(a ? 'Editar alumno' : 'Nuevo alumno', camposAlumno, a || { activo: true, saldo_inicial: 0 });
  if (!v) return;
  if (v.tarifa_hora == null && v.nivel) v.tarifa_hora = NIVELES[v.nivel][1];
  v.saldo_inicial = v.saldo_inicial ?? 0;
  if (a) await cambia('alumnos', a.id, v); else alumnoAbierto = (await crea('alumnos', v)).id;
  await anota(a ? 'Alumno editado' : 'Alumno creado', { alumno: v.nombre });
  avisa('Alumno guardado');
});

function etiquetaSaldo(s) {
  if (s > 0) return h('span', { class: 'debe' }, `Debe ${L.pesos(s)}`);
  if (s < 0) return h('span', { class: 'favor' }, `A favor ${L.pesos(-s)}`);
  return 'Al corriente';
}

function pintaAlumnos() {
  const lista = ordena(E.alumnos, (a) => (a.activo ? '0' : '1') + a.nombre);
  const asesores = (a) => [...new Set([
    ...E.series.filter((s) => s.alumno_id === a.id && s.estado !== 'terminada').map((s) => s.profe_id),
    ...E.clases.filter((c) => c.alumno_id === a.id && !c.serie_id && c.estado === 'programada').map((c) => c.profe_id),
  ].map((id) => (id ? nombre('profes', id) : 'Sin asignar')))].join(', ');
  return h('div', {},
    h('div', { class: 'encabezado' }, h('h1', {}, 'Alumnos'), h('button', { class: 'principal', onclick: () => editaAlumno(null) }, 'Nuevo alumno')),
    h('div', { class: 'tabla-env' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Alumno', 'Nivel', 'Tarifa', 'Asesor', 'Saldo', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, lista.map((a) => h('tr', { class: `clic${a.activo ? '' : ' inactivo'}`, onclick: () => { alumnoAbierto = a.id; pinta(); } },
        h('td', {}, h('b', {}, a.nombre), a.exento_recargo ? h('span', { class: 'etiqueta', style: 'margin-left:.5rem' }, 'Exento de recargo') : null, a.activo ? null : ' (inactivo)'),
        h('td', {}, a.nivel ? NIVELES[a.nivel][0] : h('span', { class: 'etiqueta falta' }, 'Falta')),
        h('td', {}, a.tarifa_hora == null ? h('span', { class: 'etiqueta falta' }, 'Falta') : `${L.pesos(a.tarifa_hora)}/h`),
        h('td', {}, asesores(a) || '—'),
        h('td', {}, etiquetaSaldo(L.saldo(a, E.movimientos))),
        h('td', { class: 'acciones' }, h('button', { class: 'chico', onclick: (ev) => { ev.stopPropagation(); editaAlumno(a); } }, 'Editar'))))))),
    alumnoAbierto && por('alumnos', alumnoAbierto) ? fichaAlumno(por('alumnos', alumnoAbierto)) : h('p', { class: 'vacio' }, 'Elige un alumno para ver sus contactos, clases y cuenta.'));
}

function fichaAlumno(a) {
  const enlaces = E.alumno_contacto.filter((x) => x.alumno_id === a.id);
  const movs = E.movimientos.filter((m) => m.alumno_id === a.id).sort((x, y) => y.fecha.localeCompare(x.fecha));
  const conceptos = { clase: 'Clase', recargo: 'Recargo', curso: 'Curso', paquete: 'Paquete', ajuste: 'Ajuste', pago: 'Pago' };

  const nuevoContacto = accion(async () => {
    const v = await formulario(`Contacto de ${a.nombre}`, [
      { n: 'nombre', e: 'Nombre', req: true }, { n: 'relacion', e: 'Relación (mamá, papá, el mismo alumno…)' },
      { n: 'whatsapp', e: 'WhatsApp', t: 'tel' }, { n: 'correo', e: 'Correo', t: 'email' },
      { n: 'responsable_pago', e: 'Es responsable de pago', t: 'check' },
      { n: 'invitar', e: 'Invitarlo a las clases (Google Calendar)', t: 'check' },
    ], { responsable_pago: true, invitar: true });
    if (!v) return;
    const { responsable_pago, invitar, ...datos } = v;
    const c = await crea('contactos', datos);
    await crea('alumno_contacto', { alumno_id: a.id, contacto_id: c.id, responsable_pago, invitar });
    await anota('Contacto agregado', { alumno: a.nombre, contacto: datos.nombre });
  });

  const quitaContacto = accion(async (x) => {
    const c = por('contactos', x.contacto_id);
    if (!(await pregunta('Quitar contacto', `Se quitará a ${c.nombre} de los contactos de ${a.nombre}.`, 'Quitar', 'Dejarlo'))) return;
    await borra('alumno_contacto', x.id);
    if (!E.alumno_contacto.some((y) => y.contacto_id === c.id)) await borra('contactos', c.id);
    await anota('Contacto quitado', { alumno: a.nombre, contacto: c.nombre });
  });

  const nuevoMovimiento = (tipo) => accion(async () => {
    const esPago = tipo === 'pago';
    const v = await formulario(esPago ? `Registrar pago de ${a.nombre}` : `Ajuste a la cuenta de ${a.nombre}`, [
      { n: 'monto', e: esPago ? 'Monto pagado' : 'Monto del cargo', t: 'number', req: true, ayuda: esPago ? null : 'Suma a lo que debe. Para descontar, registra un pago.' },
      { n: 'fecha', e: 'Fecha', t: 'date', req: true },
      esPago && { n: 'forma_pago', e: 'Forma de pago', t: 'select', ops: [['', '—'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['otro', 'Otro']] },
      { n: 'nota', e: 'Nota' },
    ].filter(Boolean), { fecha: L.hoy() });
    if (!v) return;
    if (v.monto < 0) throw new Error('El monto debe ser positivo.');
    await crea('movimientos', { alumno_id: a.id, tipo, ...v });
    await anota(esPago ? 'Pago registrado' : 'Ajuste registrado', { alumno: a.nombre, monto: v.monto });
    avisa('Guardado');
  })();

  const quitaMovimiento = accion(async (m) => {
    if (!(await pregunta('Quitar movimiento', `Se quitará ${conceptos[m.tipo].toLowerCase()} de ${L.pesos(m.monto)} del ${fechaCorta(m.fecha)}.`, 'Quitar', 'Dejarlo'))) return;
    await borra('movimientos', m.id);
    await anota('Movimiento quitado', { alumno: a.nombre, tipo: m.tipo, monto: m.monto });
  });

  // Asesor de cada serie y de cada clase suelta, directo desde la ficha del alumno.
  const selectorProfe = (valor, alCambiar) => {
    const ops = opsProfes();
    if (valor && !ops.some(([v]) => v === valor)) ops.push([valor, `${nombre('profes', valor)} (baja)`]);
    const s = h('select', { 'aria-label': 'Asesor', onchange: (ev) => alCambiar(ev.target.value || null) }, ops.map(([v, t]) => h('option', { value: v }, t)));
    s.value = valor || '';
    return s;
  };
  const asignaSerie = accion(async (s, profeId) => {
    // Primera asignación: aplica a todas las clases pendientes. Cambio posterior: de hoy en adelante.
    const afectadas = programadasDesde(s.id, s.profe_id ? L.hoy() : '0000-01-01');
    if (profeId && s.profe_id) await crea('suplencias', { serie_id: s.id, profe_id: profeId, profe_anterior_id: s.profe_id, tipo: 'indefinida', desde: L.hoy() });
    for (const c of afectadas) await cambia('clases', c.id, { profe_id: profeId });
    await cambia('series', s.id, { profe_id: profeId });
    await anota('Asesor de serie asignado', { serie: textoSerie(s), asesor: nombre('profes', profeId), clases: afectadas.length });
    avisa(`${L.describeSerie(s)}: ${profeId ? nombre('profes', profeId) : 'sin asesor'}`);
  });
  const asignaClase = accion(async (c, profeId) => {
    await cambia('clases', c.id, { profe_id: profeId });
    await sincroniza(c);
    await anota('Asesor de clase asignado', { alumno: a.nombre, fecha: c.fecha, asesor: nombre('profes', profeId) });
    avisa(`Clase del ${fechaCorta(c.fecha)}: ${profeId ? nombre('profes', profeId) : 'sin asesor'}`);
  });
  const susSeries = E.series.filter((s) => s.alumno_id === a.id && s.estado !== 'terminada');
  const susSueltas = E.clases.filter((c) => c.alumno_id === a.id && !c.serie_id && c.estado === 'programada').sort((x, y) => (x.fecha + x.hora).localeCompare(y.fecha + y.hora));

  return h('section', {},
    h('div', { class: 'encabezado', style: 'margin-top:1.5rem' }, h('h1', {}, a.nombre), etiquetaSaldo(L.saldo(a, E.movimientos))),
    h('h2', { style: 'margin-top:0' }, 'Asesor de sus clases'),
    susSeries.length || susSueltas.length ? h('div', { class: 'tabla-env', style: 'margin-bottom:1.25rem' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Clase'), h('th', {}, 'Cuándo'), h('th', {}, 'Asesor'))),
      h('tbody', {},
        susSeries.map((s) => h('tr', {},
          h('td', {}, h('b', {}, 'Serie'), s.estado === 'pausada' ? ' (en pausa)' : ''),
          h('td', {}, L.describeSerie(s)),
          h('td', {}, selectorProfe(s.profe_id, (id) => asignaSerie(s, id))))),
        susSueltas.map((c) => h('tr', {},
          h('td', {}, 'Clase suelta'),
          h('td', {}, `${fechaLarga(c.fecha)}, ${c.hora}–${L.finDe(c)}`),
          h('td', {}, selectorProfe(c.profe_id, (id) => asignaClase(c, id)))))))) : h('p', { class: 'vacio' }, 'No tiene series ni clases sueltas programadas.'),
    h('div', { class: 'dos' },
      h('div', {},
        h('h2', { style: 'margin-top:0' }, 'Contactos'),
        enlaces.length ? h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, enlaces.map((x) => {
          const c = por('contactos', x.contacto_id);
          return h('tr', {},
            h('td', {}, h('b', {}, c.nombre), c.relacion ? ` · ${c.relacion}` : '', h('br'), [c.whatsapp, c.correo].filter(Boolean).join(' · ') || 'Sin datos'),
            h('td', {}, x.responsable_pago ? h('span', { class: 'etiqueta ok' }, 'Paga') : null),
            h('td', { class: 'acciones' }, h('button', { class: 'chico peligro', onclick: () => quitaContacto(x) }, 'Quitar')));
        })))) : h('p', { class: 'vacio' }, 'Sin contactos todavía.'),
        h('div', { class: 'botones' }, h('button', { onclick: nuevoContacto }, 'Agregar contacto')),
        a.notas ? [h('h2', {}, 'Notas'), h('p', {}, a.notas)] : null),
      h('div', {},
        h('h2', { style: 'margin-top:0' }, 'Cuenta'),
        h('div', { class: 'tabla-env' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Concepto'), h('th', { class: 'num' }, 'Cargo'), h('th', { class: 'num' }, 'Pago'), h('th', {}))),
          h('tbody', {},
            movs.map((m) => h('tr', {},
              h('td', {}, fechaCorta(m.fecha)),
              h('td', {}, conceptos[m.tipo], m.nota ? ` · ${m.nota}` : '', m.forma_pago ? ` · ${m.forma_pago}` : ''),
              h('td', { class: 'num' }, m.tipo === 'pago' ? '' : L.pesos(m.monto)),
              h('td', { class: 'num' }, m.tipo === 'pago' ? L.pesos(m.monto) : ''),
              h('td', { class: 'acciones' }, !m.clase_id && h('button', { class: 'chico peligro', onclick: () => quitaMovimiento(m) }, 'Quitar')))),
            h('tr', {}, h('td', {}, a.fecha_arranque ? fechaCorta(a.fecha_arranque) : '—'), h('td', {}, 'Saldo inicial'),
              h('td', { class: 'num' }, Number(a.saldo_inicial) > 0 ? L.pesos(a.saldo_inicial) : ''),
              h('td', { class: 'num' }, Number(a.saldo_inicial) < 0 ? L.pesos(-a.saldo_inicial) : ''), h('td', {}))))),
        h('div', { class: 'botones' },
          h('button', { onclick: () => nuevoMovimiento('ajuste') }, 'Ajuste'),
          h('button', { class: 'principal', onclick: () => nuevoMovimiento('pago') }, 'Registrar pago')))));
}

// ───────────── Vista: series ─────────────
const camposHorario = (conProfe) => [
  { n: 'ancla', e: 'Primera clase con este horario', t: 'date', req: true, ayuda: 'Su día de la semana será el día fijo de la serie.' },
  { n: 'hora', e: 'Hora de inicio', t: 'time', req: true },
  { n: 'duracion_h', e: 'Duración', t: 'select', ops: [['1', '1 hora'], ['2', '2 horas']], req: true },
  { n: 'intervalo', e: 'Frecuencia', t: 'select', ops: [['1', 'Cada semana'], ['2', 'Cada 2 semanas']], req: true },
  conProfe && { n: 'profe_id', e: 'Asesor', t: 'select', ops: opsProfes() },
].filter(Boolean);
const numerosSerie = (v) => ({ ...v, duracion_h: Number(v.duracion_h), intervalo: Number(v.intervalo) });
const textoSerie = (s) => `${nombre('alumnos', s.alumno_id)} · ${L.describeSerie(s)}`;

const nuevaSerie = accion(async () => {
  const v = await formulario('Nueva serie', [
    { n: 'alumno_id', e: 'Alumno', t: 'select', ops: [['', 'Elige…'], ...opsAlumnos()], req: true },
    ...camposHorario(true),
    { n: 'hasta', e: 'Hasta (opcional)', t: 'date', ayuda: 'Vacío = sin fecha final.' },
    { n: 'materia', e: 'Materia o tema' },
  ], { ancla: L.hoy(), hora: '17:00', duracion_h: '1', intervalo: '1' }, 'Crear serie');
  if (!v) return;
  const s = await crea('series', { ...numerosSerie(v), estado: 'activa' });
  await extiendeSeries();
  await anota('Serie creada', { serie: textoSerie(s) });
  avisa('Serie creada con sus clases');
});

const editaSerie = accion(async (s) => {
  const v = await formulario('Editar serie', [
    { n: 'hasta', e: 'Hasta (opcional)', t: 'date' }, { n: 'materia', e: 'Materia o tema' },
  ], s);
  if (!v) return;
  const sobran = v.hasta ? programadasDesde(s.id, L.sumaDias(v.hasta, 1)) : [];
  if (sobran.length && !(await pregunta('Acortar serie', `Se quitarán ${sobran.length} clases programadas después del ${fechaCorta(v.hasta)}.`, 'Quitar y guardar', 'No guardar'))) return;
  for (const c of sobran) await borra('clases', c.id);
  await cambia('series', s.id, v);
  await extiendeSeries();
  await anota('Serie editada', { serie: textoSerie(s), hasta: v.hasta });
});

const cambiaAsesor = accion(async (s) => {
  const v = await formulario(`Cambio de asesor · ${nombre('alumnos', s.alumno_id)}`, [
    { n: 'tipo', e: 'Tipo de cambio', t: 'select', ops: [['indefinida', 'Indefinido (nuevo asesor titular)'], ['temporal', 'Suplente temporal (unas fechas)']], req: true },
    { n: 'profe_id', e: 'Asesor', t: 'select', ops: opsProfes().slice(1), req: true },
    { n: 'desde', e: 'Desde', t: 'date', req: true },
    { n: 'hasta', e: 'Hasta (solo suplente temporal)', t: 'date' },
    { n: 'nota', e: 'Motivo' },
  ], { tipo: 'indefinida', desde: L.hoy() }, 'Aplicar');
  if (!v) return;
  if (v.tipo === 'temporal' && (!v.hasta || v.hasta < v.desde)) throw new Error('Para un suplente temporal indica la fecha «hasta».');
  if (v.tipo === 'indefinida') v.hasta = null;
  await crea('suplencias', { serie_id: s.id, profe_anterior_id: s.profe_id, ...v });
  const afectadas = programadasDesde(s.id, v.desde, v.hasta);
  for (const c of afectadas) await cambia('clases', c.id, { profe_id: v.profe_id });
  if (v.tipo === 'indefinida') await cambia('series', s.id, { profe_id: v.profe_id });
  await extiendeSeries();
  await anota(v.tipo === 'indefinida' ? 'Cambio de asesor titular' : 'Suplente temporal', { serie: textoSerie(s), asesor: nombre('profes', v.profe_id), desde: v.desde, hasta: v.hasta, clases: afectadas.length });
  avisa(`Clases que pasaron a ${nombre('profes', v.profe_id)}: ${afectadas.length}`);
});

/** Cambia día, hora, frecuencia o asesor desde una fecha. También es la forma de reanudar una pausa abierta. */
const cambiaHorario = accion(async (s) => {
  const pausa = E.serie_pausas.find((p) => p.serie_id === s.id && !p.cerrada);
  const v = await formulario(pausa ? 'Reanudar serie' : 'Cambiar horario de la serie', camposHorario(true),
    { ancla: L.hoy(), hora: s.hora, duracion_h: String(s.duracion_h), intervalo: String(s.intervalo), profe_id: s.profe_id || '' },
    pausa ? 'Reanudar' : 'Cambiar horario');
  if (!v) return;
  const nuevo = numerosSerie(v);
  const viejas = programadasDesde(s.id, nuevo.ancla);
  if (viejas.length && !(await pregunta('Cambiar horario', `Las ${viejas.length} clases programadas desde el ${fechaCorta(nuevo.ancla)} se reemplazan por el horario nuevo. Las clases dadas no se tocan.`, 'Cambiar', 'No cambiar'))) return;
  for (const c of viejas) await borra('clases', c.id);
  if (pausa) {
    // Solo cuentan como recorridas las clases que de verdad cayeron en la pausa; las marcadas más allá
    // de la fecha de reanudación eran provisionales y se quitan para que la serie las vuelva a generar.
    const marcadas = E.clases.filter((c) => c.serie_id === s.id && c.estado === 'recorrida' && c.fecha >= pausa.desde);
    for (const c of marcadas.filter((x) => x.fecha >= nuevo.ancla)) await borra('clases', c.id);
    const recorridas = marcadas.filter((x) => x.fecha < nuevo.ancla).length;
    await cambia('serie_pausas', pausa.id, { hasta: L.sumaDias(nuevo.ancla, -1), cerrada: true, recorridas });
    nuevo.hasta = L.hastaRecorrido(s, recorridas);
    nuevo.estado = 'activa';
  }
  await cambia('series', s.id, nuevo);
  await extiendeSeries();
  await anota(pausa ? 'Serie reanudada' : 'Horario de serie cambiado', { serie: textoSerie(s), desde: nuevo.ancla });
  avisa(pausa ? 'Serie reanudada: la numeración continúa' : 'Horario cambiado');
});

const pausaSerie = accion(async (s) => {
  const v = await formulario(`Pausar · ${nombre('alumnos', s.alumno_id)}`, [
    { n: 'desde', e: 'Pausar desde', t: 'date', req: true },
    { n: 'hasta', e: 'Hasta (opcional)', t: 'date', ayuda: 'Con fecha: se retoma sola al día siguiente. Vacío: queda en pausa hasta que tú la reanudes.' },
  ], { desde: L.hoy() }, 'Pausar');
  if (!v) return;
  if (v.hasta && v.hasta < v.desde) throw new Error('La fecha «hasta» debe ser posterior a «desde».');
  const recorrer = L.clasesARecorrer(E.clases.filter((c) => c.serie_id === s.id), v.desde, v.hasta);
  for (const c of recorrer) await cambia('clases', c.id, { estado: 'recorrida' });
  await crea('serie_pausas', { serie_id: s.id, ...v, reanudar_auto: !!v.hasta, recorridas: recorrer.length, cerrada: !!v.hasta });
  if (v.hasta) await cambia('series', s.id, { hasta: L.hastaRecorrido(s, recorrer.length) });
  else await cambia('series', s.id, { estado: 'pausada' });
  await extiendeSeries();
  await anota('Serie pausada', { serie: textoSerie(s), desde: v.desde, hasta: v.hasta, recorridas: recorrer.length });
  avisa(`Serie pausada · clases que se recorren sin cobrarse: ${recorrer.length}`);
});

const terminaSerie = accion(async (s) => {
  const v = await formulario(`Terminar serie · ${nombre('alumnos', s.alumno_id)}`, [{ n: 'hasta', e: 'Última fecha con clase', t: 'date', req: true }], { hasta: L.hoy() }, 'Terminar serie');
  if (!v) return;
  const sobran = programadasDesde(s.id, L.sumaDias(v.hasta, 1));
  if (!(await pregunta('Terminar serie', `La serie termina el ${fechaCorta(v.hasta)}. Se quitan ${sobran.length} clases programadas posteriores. Las clases dadas y sus cuentas se conservan.`, 'Terminar', 'No terminar'))) return;
  for (const c of sobran) await borra('clases', c.id);
  await cambia('series', s.id, { hasta: v.hasta, estado: 'terminada' });
  await anota('Serie terminada', { serie: textoSerie(s), hasta: v.hasta });
});

function pintaSeries() {
  const orden = { activa: 0, pausada: 1, terminada: 2 };
  const lista = [...E.series].sort((a, b) => orden[a.estado] - orden[b.estado] || (L.diaSemana(a.ancla) + 6) % 7 - (L.diaSemana(b.ancla) + 6) % 7 || a.hora.localeCompare(b.hora));
  const estado = (s) => {
    const p = E.serie_pausas.find((x) => x.serie_id === s.id && x.hasta && x.hasta >= L.hoy() && x.desde <= L.hoy());
    if (s.estado === 'pausada') return h('span', { class: 'etiqueta falta' }, 'En pausa');
    if (s.estado === 'terminada') return h('span', { class: 'etiqueta' }, 'Terminada');
    return p ? h('span', { class: 'etiqueta falta' }, `En pausa hasta ${fechaCorta(p.hasta)}`) : h('span', { class: 'etiqueta ok' }, 'Activa');
  };
  return h('div', {},
    h('div', { class: 'encabezado' }, h('h1', {}, 'Series'), h('button', { class: 'principal', onclick: nuevaSerie }, 'Nueva serie')),
    lista.length ? h('div', { class: 'tabla-env' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Alumno', 'Horario', 'Asesor', 'Dadas', 'Hasta', 'Estado', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, lista.map((s) => h('tr', { class: s.estado === 'terminada' ? 'inactivo' : '' },
        h('td', {}, h('b', {}, nombre('alumnos', s.alumno_id)), s.materia ? ` · ${s.materia}` : ''),
        h('td', {}, L.describeSerie(s)),
        h('td', {}, s.profe_id ? nombre('profes', s.profe_id) : h('span', { class: 'etiqueta falta' }, 'Sin asignar')),
        h('td', { class: 'num' }, E.clases.filter((c) => c.serie_id === s.id && c.estado === 'dada').length),
        h('td', {}, s.hasta ? fechaCorta(s.hasta) : 'Sin fecha final'),
        h('td', {}, estado(s)),
        h('td', { class: 'acciones' }, s.estado === 'terminada' ? null : [
          h('button', { class: 'chico', onclick: () => cambiaAsesor(s) }, 'Asesor'),
          s.estado === 'pausada'
            ? h('button', { class: 'chico principal', onclick: () => cambiaHorario(s) }, 'Reanudar')
            : [h('button', { class: 'chico', onclick: () => cambiaHorario(s) }, 'Horario'), h('button', { class: 'chico', onclick: () => pausaSerie(s) }, 'Pausar')],
          h('button', { class: 'chico', onclick: () => editaSerie(s) }, 'Editar'),
          h('button', { class: 'chico peligro', onclick: () => terminaSerie(s) }, 'Terminar'),
        ])))))) : h('p', { class: 'vacio' }, 'Todavía no hay series.'));
}

// ───────────── Vista: asesores ─────────────
const editaProfe = accion(async (p) => {
  const v = await formulario(p ? 'Editar asesor' : 'Nuevo asesor', [
    { n: 'nombre', e: 'Nombre', req: true }, { n: 'correo', e: 'Correo', t: 'email' },
    { n: 'materias', e: 'Materias y niveles' },
    { n: 'tarifa_hora', e: 'Pago por hora', t: 'number', ayuda: 'Lo que Verne le paga por hora dada. Vacío si no aplica.' },
    { n: 'color', e: 'Color en el calendario', t: 'color' },
    { n: 'activo', e: 'Activo (desmarca para darlo de baja)', t: 'check' },
  ], p || { activo: true, color: '#4e6e7c' });
  if (!v) return;
  if (p) await cambia('profes', p.id, v); else await crea('profes', v);
  await anota(p ? 'Asesor editado' : 'Asesor creado', { asesor: v.nombre, activo: v.activo });
  avisa('Asesor guardado');
});

function pintaAsesores() {
  const mes = L.hoy().slice(0, 8) + '01';
  const horas = L.horasPorProfe(E.clases, mes, L.hoy());
  const lista = ordena(E.profes, (p) => (p.activo ? '0' : '1') + p.nombre);
  return h('div', {},
    h('div', { class: 'encabezado' }, h('h1', {}, 'Asesores'), h('button', { class: 'principal', onclick: () => editaProfe(null) }, 'Nuevo asesor')),
    h('div', { class: 'tabla-env' }, h('table', {},
      h('thead', {}, h('tr', {}, ['Asesor', 'Materias y niveles', 'Pago por hora', 'Series activas', 'Horas dadas este mes', ''].map((t) => h('th', {}, t)))),
      h('tbody', {}, lista.map((p) => h('tr', { class: p.activo ? '' : 'inactivo' },
        h('td', {}, h('span', { class: 'punto', style: `background:${p.color || '#8a959a'}` }), h('b', {}, p.nombre), p.activo ? '' : ' (baja)', p.correo ? [h('br'), p.correo] : null),
        h('td', {}, p.materias || '—'),
        h('td', {}, p.tarifa_hora == null ? '—' : `${L.pesos(p.tarifa_hora)}/h`),
        h('td', { class: 'num' }, E.series.filter((s) => s.profe_id === p.id && s.estado === 'activa').length),
        h('td', { class: 'num' }, horas.get(p.id) || 0),
        h('td', { class: 'acciones' }, h('button', { class: 'chico', onclick: () => editaProfe(p) }, 'Editar'))))))));
}

// ───────────── Vista: cuentas ─────────────
function pintaCuentas() {
  const saldos = E.alumnos.map((a) => [a, L.saldo(a, E.movimientos)]).filter(([, s]) => s !== 0).sort((x, y) => y[1] - x[1]);
  const porCobrar = saldos.reduce((t, [, s]) => t + Math.max(0, s), 0);
  const pendientes = E.clases.filter((c) => c.estado === 'programada' && c.fecha < L.hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const horas = L.horasPorProfe(E.clases, periodo.desde, periodo.hasta);

  const pagaProfe = accion(async (p, hrs, debe) => {
    const v = await formulario(`Registrar pago a ${p.nombre}`, [
      { n: 'monto', e: 'Monto pagado', t: 'number', req: true }, { n: 'fecha_pago', e: 'Fecha del pago', t: 'date', req: true }, { n: 'nota', e: 'Nota' },
    ], { monto: debe, fecha_pago: L.hoy() }, 'Registrar pago');
    if (!v) return;
    await crea('pagos_profes', { profe_id: p.id, desde: periodo.desde, hasta: periodo.hasta, horas: hrs, ...v });
    await anota('Pago a asesor', { asesor: p.nombre, monto: v.monto, periodo });
    avisa('Pago registrado');
  });

  const campoFecha = (clave, texto) => h('label', {}, texto, h('input', { type: 'date', value: periodo[clave], onchange: (ev) => { if (ev.target.value) { periodo[clave] = ev.target.value; pinta(); } } }));

  return h('div', {},
    h('div', { class: 'encabezado' }, h('h1', {}, 'Cuentas'), h('span', { class: 'etiqueta' }, `Por cobrar: ${L.pesos(porCobrar)}`)),
    h('div', { class: 'dos' },
      h('div', {},
        h('h2', { style: 'margin-top:0' }, 'Saldos de alumnos'),
        saldos.length ? h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, saldos.map(([a, s]) =>
          h('tr', { class: 'clic', onclick: () => { alumnoAbierto = a.id; vista = 'alumnos'; pinta(); } }, h('td', {}, h('b', {}, a.nombre)), h('td', { class: 'num' }, etiquetaSaldo(s))))))) : h('p', { class: 'vacio' }, 'Todos al corriente.')),
      h('div', {},
        h('h2', { style: 'margin-top:0' }, `Clases pasadas sin marcar (${pendientes.length})`),
        pendientes.length ? h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, pendientes.map((c) => h('tr', { class: 'clic', onclick: () => fichaClase(c) },
          h('td', {}, fechaCorta(c.fecha), ` · ${c.hora}`), h('td', {}, h('b', {}, nombre('alumnos', c.alumno_id))), h('td', {}, nombre('profes', c.profe_id))))))) : h('p', { class: 'vacio' }, 'Nada pendiente de marcar.'))),
    h('h2', {}, 'Horas y pago a asesores'),
    h('div', { class: 'fila', style: 'margin-bottom:.75rem' }, campoFecha('desde', 'Desde'), campoFecha('hasta', 'Hasta')),
    h('div', { class: 'tabla-env' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Asesor'), h('th', { class: 'num' }, 'Horas dadas'), h('th', { class: 'num' }, 'Pago por hora'), h('th', { class: 'num' }, 'Le corresponde'), h('th', { class: 'num' }, 'Pagado en el periodo'), h('th', {}))),
      h('tbody', {}, ordena(E.profes, (p) => p.nombre).map((p) => {
        const hrs = horas.get(p.id) || 0;
        const toca = p.tarifa_hora == null ? null : hrs * Number(p.tarifa_hora);
        const pagado = E.pagos_profes.filter((x) => x.profe_id === p.id && x.fecha_pago >= periodo.desde && x.fecha_pago <= periodo.hasta).reduce((t, x) => t + Number(x.monto), 0);
        return h('tr', {}, h('td', {}, h('b', {}, p.nombre)), h('td', { class: 'num' }, hrs), h('td', { class: 'num' }, p.tarifa_hora == null ? '—' : L.pesos(p.tarifa_hora)),
          h('td', { class: 'num' }, L.pesos(toca)), h('td', { class: 'num' }, L.pesos(pagado)),
          h('td', { class: 'acciones' }, toca != null && h('button', { class: 'chico', onclick: () => pagaProfe(p, hrs, Math.max(0, toca - pagado)) }, 'Registrar pago')));
      })))));
}

// ───────────── Vista: bitácora ─────────────
function pintaBitacora() {
  const lista = [...E.auditoria].sort((a, b) => String(b.creado).localeCompare(String(a.creado))).slice(0, 200);
  const texto = (d) => Object.entries(d || {}).map(([k, v]) => `${k}: ${v && typeof v === 'object' ? Object.values(v).join(' → ') : v}`).join(' · ');
  return h('div', {},
    h('div', { class: 'encabezado' }, h('h1', {}, 'Bitácora')),
    lista.length ? h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, lista.map((r) => h('tr', {},
      h('td', { style: 'white-space:nowrap' }, new Date(r.creado).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })),
      h('td', {}, h('b', {}, r.accion)), h('td', {}, texto(r.detalle))))))) : h('p', { class: 'vacio' }, 'Aún no hay cambios registrados.'));
}

// ───────────── Vista: Google Calendar ─────────────
const conectaGoogle = accion(async () => {
  const { url } = await api.funcion('gcal', { accion: 'conectar' });
  location.href = url;
});
const cambiaCalendario = (tipo) => accion(async () => {
  if (tipo === 'principal' && !(await pregunta('Usar tu calendario real',
    'Desde ahora, cada clase suelta que crees, muevas o canceles en la app cambiará tu Google Calendar real, y Google enviará invitaciones y avisos por correo a los invitados. Las clases que ya existen no se tocan.',
    'Sí, usar mi calendario real', 'Seguir en pruebas'))) return;
  Object.assign(G, await api.funcion('gcal', { accion: 'usar_calendario', tipo }));
  await anota('Calendario de Google cambiado', { calendario: tipo });
  avisa(tipo === 'principal' ? 'La app ya escribe en tu calendario real' : 'La app volvió al calendario de prueba');
})();
const desconectaGoogle = accion(async () => {
  if (!(await pregunta('Desconectar Google Calendar', 'La app dejará de crear y cambiar eventos. Los eventos que ya existen en tu calendario se quedan como están.', 'Desconectar', 'No'))) return;
  Object.assign(G, await api.funcion('gcal', { accion: 'desconectar' }));
  await anota('Google Calendar desconectado', {});
});

function pintaGoogle() {
  const sueltas = E.clases.filter((c) => !c.serie_id && c.estado === 'programada' && c.fecha >= L.hoy());
  const pendientes = sueltas.filter((c) => !c.google_event_id);
  let cuerpo;
  if (api.modo === 'demo' || G.demo) {
    cuerpo = h('p', { class: 'vacio' }, 'En modo demo no hay conexión con Google Calendar.');
  } else if (G.error) {
    cuerpo = h('div', { class: 'tarjeta' }, h('p', {}, h('span', { class: 'etiqueta falta' }, 'Sin instalar'), ' ', G.error),
      h('p', { class: 'nota', style: 'margin-top:.6rem' }, 'Falta instalar en Supabase la función «gcal». Los pasos están en la guía de la fase 2.'));
  } else if (!G.conectado) {
    cuerpo = h('div', { class: 'tarjeta' },
      h('p', {}, h('span', { class: 'etiqueta falta' }, 'Sin conectar'), G.configurado ? ' La función está lista. Falta que autorices tu cuenta de Google.' : ' Faltan las llaves de Google en los secretos de la función.'),
      h('p', { class: 'nota', style: 'margin-top:.6rem' }, 'Al conectar, la app empieza en un calendario de prueba aparte («Verne - pruebas de la app»). Tu calendario real no se toca hasta que tú lo actives.'),
      h('div', { class: 'botones' }, G.configurado && h('button', { class: 'principal', onclick: conectaGoogle }, 'Conectar Google Calendar')));
  } else {
    const real = G.calendario === 'principal';
    cuerpo = h('div', {},
      h('div', { class: 'tarjeta' },
        h('dl', { class: 'datos' },
          h('dt', {}, 'Cuenta'), h('dd', {}, G.correo || '—', ' ', h('span', { class: 'etiqueta ok' }, 'Conectada')),
          h('dt', {}, 'Escribe en'), h('dd', {}, real ? h('span', { class: 'etiqueta mal' }, 'Tu calendario real') : h('span', { class: 'etiqueta falta' }, 'Calendario de prueba'),
            real ? ' Los invitados reciben correos de Google.' : ' Búscalo en Google Calendar como «Verne - pruebas de la app».'),
          h('dt', {}, 'Alcance'), h('dd', {}, 'Por ahora solo clases sueltas. Las series semanales se conectan en el siguiente paso.')),
        h('div', { class: 'botones' },
          real ? h('button', { onclick: () => cambiaCalendario('prueba') }, 'Volver al calendario de prueba')
            : h('button', { onclick: () => cambiaCalendario('principal') }, 'Usar mi calendario real'),
          h('button', { class: 'peligro', onclick: desconectaGoogle }, 'Desconectar'))),
      h('h2', {}, `Clases sueltas próximas (${sueltas.length})`),
      sueltas.length ? h('div', { class: 'tabla-env' }, h('table', {}, h('tbody', {}, sueltas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).map((c) => h('tr', { class: 'clic', onclick: () => fichaClase(c) },
        h('td', {}, `${fechaLarga(c.fecha)}, ${c.hora}`), h('td', {}, h('b', {}, nombre('alumnos', c.alumno_id))),
        h('td', {}, c.google_event_id ? h('span', { class: 'etiqueta ok' }, 'En Google') : h('span', { class: 'etiqueta falta' }, 'Sin enviar'))))))) : h('p', { class: 'vacio' }, 'No hay clases sueltas próximas.'),
      pendientes.length ? h('p', { class: 'nota', style: 'margin-top:.6rem' }, 'Abre una clase «Sin enviar» y usa «Enviar a Google». Las clases que crees o muevas desde ahora se envían solas.') : null);
  }
  return h('div', {}, h('div', { class: 'encabezado' }, h('h1', {}, 'Google Calendar')), cuerpo);
}

// ───────────── Marco general ─────────────
const VISTAS = { semana: ['Semana', pintaSemana], alumnos: ['Alumnos', pintaAlumnos], series: ['Series', pintaSeries], asesores: ['Asesores', pintaAsesores], cuentas: ['Cuentas', pintaCuentas], google: ['Google', pintaGoogle], bitacora: ['Bitácora', pintaBitacora] };

function pinta() {
  $('#pestanas').replaceChildren(...Object.entries(VISTAS).map(([k, [texto]]) =>
    h('button', { 'aria-current': k === vista ? 'page' : null, onclick: () => { vista = k; pinta(); } }, texto)));
  $('#vista').replaceChildren(VISTAS[vista][1]());
}

async function carga() {
  $('#vista').replaceChildren(h('p', { class: 'cargando' }, 'Cargando datos…'));
  const listas = await Promise.all(TABLAS.map((t) => api.lista(t)));
  TABLAS.forEach((t, i) => { E[t] = listas[i]; });
  await extiendeSeries();
  await cargaGoogle();
  const vuelta = new URLSearchParams(location.search).get('google');
  if (vuelta) {
    vista = 'google';
    history.replaceState(null, '', location.pathname);
    const textos = { ok: 'Google Calendar conectado (calendario de prueba)', vencido: 'La autorización caducó. Intenta conectar otra vez.', cancelado: 'No se autorizó la cuenta de Google.', error: 'Google no entregó el permiso. Intenta conectar otra vez.' };
    avisa(textos[vuelta] || 'No se pudo conectar Google Calendar.', vuelta !== 'ok');
  }
  pinta();
}

function pantallaEntrada() {
  const correo = h('input', { type: 'email', required: true, autocomplete: 'username' });
  const clave = h('input', { type: 'password', required: true, autocomplete: 'current-password' });
  const f = h('form', {}, h('h1', {}, 'Agenda Verne'), h('label', {}, 'Correo', correo), h('label', {}, 'Contraseña', clave), h('button', { class: 'principal' }, 'Entrar'));
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try { await api.entrar(correo.value, clave.value); await arranca(); } catch (e) { avisa(e.message, true); }
  });
  $('#pestanas').replaceChildren();
  $('#vista').replaceChildren(h('div', { class: 'tarjeta entrada' }, f));
}

async function arranca() {
  const s = await api.sesion();
  if (!s) return pantallaEntrada();
  if (modo === 'demo') {
    const d = $('#demo');
    d.hidden = false;
    d.replaceChildren('Modo demo: datos de ejemplo guardados solo en este navegador. ',
      h('button', { class: 'chico', onclick: async () => { if (await pregunta('Reiniciar demo', 'Se borran los datos de ejemplo de este navegador y se cargan de nuevo.', 'Reiniciar', 'No')) { api.reinicia(); location.reload(); } } }, 'Reiniciar demo'));
  } else {
    $('#cuenta').replaceChildren(s.correo || '', h('button', { class: 'chico', onclick: async () => { await api.salir(); location.reload(); } }, 'Salir'));
  }
  try { await carga(); } catch (e) { console.error(e); $('#vista').replaceChildren(h('p', { class: 'vacio' }, `No se pudieron cargar los datos: ${e.message}`)); }
}

arranca();
