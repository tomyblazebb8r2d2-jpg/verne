// Verne · agenda · reglas puras (sin red ni pantalla). Fechas 'AAAA-MM-DD' y horas 'HH:MM', hora de México.

export const RECARGO = 100;
export const SEMANAS_ADELANTE = 8;
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ── Fechas ──
export const aFecha = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d, 12); };
export const aIso = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
export const hoy = () => aIso(new Date());
export const sumaDias = (iso, n) => { const f = aFecha(iso); f.setDate(f.getDate() + n); return aIso(f); };
export const diaSemana = (iso) => aFecha(iso).getDay();
export const lunesDe = (iso) => sumaDias(iso, -((diaSemana(iso) + 6) % 7));
export const aMinutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
export const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const finDe = (clase) => aHora(aMinutos(clase.hora) + clase.duracion_h * 60);
export const inicioDe = (clase) => { const f = aFecha(clase.fecha); const m = aMinutos(clase.hora); f.setHours(Math.floor(m / 60), m % 60, 0, 0); return f; };

export function describeSerie(s) {
  return `${DIAS[diaSemana(s.ancla)]} ${s.hora}–${aHora(aMinutos(s.hora) + s.duracion_h * 60)} · ${s.intervalo === 2 ? 'cada 2 semanas' : 'cada semana'}`;
}

// ── Series ──
const enPausa = (fecha, pausas) => pausas.some((p) => fecha >= p.desde && (!p.hasta || fecha <= p.hasta));

/** Fechas de la serie entre `desde` y `hasta` (inclusive), sin las que caen en una pausa. */
export function ocurrencias(serie, pausas, desde, hasta) {
  const tope = serie.hasta && serie.hasta < hasta ? serie.hasta : hasta;
  const paso = 7 * serie.intervalo;
  const fechas = [];
  for (let f = serie.ancla; f <= tope; f = sumaDias(f, paso)) {
    if (f >= desde && !enPausa(f, pausas)) fechas.push(f);
  }
  return fechas;
}

/** Clases que faltan por crear para una serie, hasta `horizonte`. No repite las que ya existen. */
export function clasesFaltantes(serie, pausas, suplencias, clasesDeLaSerie, horizonte) {
  if (serie.estado !== 'activa') return [];
  const ya = new Set(clasesDeLaSerie.map((c) => c.fecha_serie));
  return ocurrencias(serie, pausas, serie.ancla, horizonte)
    .filter((f) => !ya.has(f))
    .map((f) => {
      const sup = suplencias.find((s) => s.tipo === 'temporal' && f >= s.desde && f <= s.hasta);
      return {
        alumno_id: serie.alumno_id, serie_id: serie.id, fecha_serie: f, fecha: f, hora: serie.hora,
        duracion_h: serie.duracion_h, profe_id: sup ? sup.profe_id : serie.profe_id, estado: 'programada',
      };
    });
}

/** Número consecutivo de cada clase dentro de su serie. Canceladas y recorridas no cuentan. */
export function numeros(clases) {
  const porSerie = new Map();
  for (const c of clases) {
    if (!c.serie_id || (c.estado !== 'programada' && c.estado !== 'dada')) continue;
    if (!porSerie.has(c.serie_id)) porSerie.set(c.serie_id, []);
    porSerie.get(c.serie_id).push(c);
  }
  const n = new Map();
  for (const lista of porSerie.values()) {
    lista.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    lista.forEach((c, i) => n.set(c.id, i + 1));
  }
  return n;
}

/** Clases programadas de la serie que caen en la pausa: se recorren (no se cobran ni se pierden). */
export function clasesARecorrer(clasesDeLaSerie, desde, hasta) {
  return clasesDeLaSerie.filter((c) => c.estado === 'programada' && c.fecha >= desde && (!hasta || c.fecha <= hasta));
}

/** Nueva fecha final de la serie después de recorrer `n` clases. */
export const hastaRecorrido = (serie, n) => (serie.hasta ? sumaDias(serie.hasta, n * 7 * serie.intervalo) : null);

// ── Choques ──
const activa = (c) => c.estado === 'programada' || c.estado === 'dada';
export const seEmpalman = (a, b) =>
  a.fecha === b.fecha && aMinutos(a.hora) < aMinutos(finDe(b)) && aMinutos(b.hora) < aMinutos(finDe(a));

/** Pares de clases que chocan, con el motivo: [claseA, claseB, 'asesor' | 'alumno']. */
export function paresChoque(clases) {
  const pares = [];
  const porDia = new Map();
  for (const c of clases.filter(activa)) {
    if (!porDia.has(c.fecha)) porDia.set(c.fecha, []);
    porDia.get(c.fecha).push(c);
  }
  for (const fecha of [...porDia.keys()].sort()) {
    const lista = porDia.get(fecha).sort((a, b) => a.hora.localeCompare(b.hora));
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        if (!seEmpalman(a, b)) continue;
        if (a.alumno_id === b.alumno_id) pares.push([a, b, 'alumno']);
        else if (a.profe_id && a.profe_id === b.profe_id) pares.push([a, b, 'asesor']);
      }
    }
  }
  return pares;
}

/** Ids de clases que chocan: mismo asesor o mismo alumno a la misma hora. */
export function choques(clases) {
  const ids = new Set();
  const porDia = new Map();
  for (const c of clases.filter(activa)) {
    if (!porDia.has(c.fecha)) porDia.set(c.fecha, []);
    porDia.get(c.fecha).push(c);
  }
  for (const lista of porDia.values()) {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        const mismo = (a.profe_id && a.profe_id === b.profe_id) || a.alumno_id === b.alumno_id;
        if (mismo && seEmpalman(a, b)) { ids.add(a.id); ids.add(b.id); }
      }
    }
  }
  return ids;
}

// ── Cuentas ──
export const montoClase = (clase, alumno) => (alumno.tarifa_hora == null ? null : Number(alumno.tarifa_hora) * Number(clase.duracion_h));

/** Saldo del alumno: positivo = debe, negativo = a favor. */
export function saldo(alumno, movimientos) {
  let s = Number(alumno.saldo_inicial || 0);
  for (const m of movimientos) {
    if (m.alumno_id !== alumno.id) continue;
    s += m.tipo === 'pago' ? -Number(m.monto) : Number(m.monto);
  }
  return Math.round(s * 100) / 100;
}

/** Horas dadas por asesor entre dos fechas (cuentan para quien dio la clase). */
export function horasPorProfe(clases, desde, hasta) {
  const h = new Map();
  for (const c of clases) {
    if (c.estado !== 'dada' || !c.profe_id || c.fecha < desde || c.fecha > hasta) continue;
    h.set(c.profe_id, (h.get(c.profe_id) || 0) + Number(c.duracion_h));
  }
  return h;
}

/** ¿La app debe PROPONER el recargo? Solo si cancela el cliente con menos de 24 h y no es exento. */
export function proponeRecargo(clase, alumno, quienCancela, ahora = new Date()) {
  if (quienCancela !== 'cliente' || alumno.exento_recargo) return false;
  return inicioDe(clase).getTime() - ahora.getTime() < 24 * 3600 * 1000;
}

export const pesos = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);

// ── Validación de datos ──
const DOMINIOS_MAL = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.comm': 'gmail.com', 'gamil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com', 'icloud.con': 'icloud.com', 'iclud.com': 'icloud.com',
  'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahooo.com': 'yahoo.com',
};
/** Devuelve el problema de un correo, o null si se ve bien. Detecta dominios mal escritos comunes. */
export function revisaCorreo(correo) {
  const c = String(correo || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(c)) return 'El correo no tiene un formato válido (ejemplo: nombre@gmail.com).';
  const dominio = c.split('@')[1];
  if (DOMINIOS_MAL[dominio]) return `El correo termina en «${dominio}». ¿Quisiste escribir «${DOMINIOS_MAL[dominio]}»?`;
  return null;
}
/** Deja un teléfono de México en 10 dígitos. Acepta espacios, guiones, +52 y +52 1. */
export function limpiaTelefono(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('521')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('52')) d = d.slice(2);
  if (d.length !== 10) return { valor: null, error: 'El WhatsApp debe tener 10 dígitos (ejemplo: 222 123 4567).' };
  return { valor: d, error: null };
}
export const HORA_MIN = 7, HORA_MAX = 22;
/** Una clase debe caber en el horario que muestra el calendario (7:00 a 22:00). */
export function revisaHorario(hora, duracion) {
  if (!hora) return 'Falta la hora de inicio.';
  const ini = aMinutos(hora), fin = ini + Number(duracion) * 60;
  if (ini < HORA_MIN * 60 || fin > HORA_MAX * 60) return `La clase debe quedar entre las ${HORA_MIN}:00 y las ${HORA_MAX}:00. Revisa si es de la mañana o de la tarde.`;
  return null;
}

export const GRADOS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => `${n}.º de primaria`),
  ...[1, 2, 3].map((n) => `${n}.º de secundaria`),
  ...[1, 2, 3].map((n) => `${n}.º de preparatoria`),
  'Universidad', 'Otro',
];
/** Nivel de tarifa que corresponde a un grado: 'basico' (primaria a prepa), 'universidad' o null. */
export const nivelDeGrado = (grado) => (!grado || grado === 'Otro' ? null : grado === 'Universidad' ? 'universidad' : 'basico');
