// Verne · agenda · acceso a datos. Dos motores con la misma interfaz:
//   demo      → localStorage de este navegador (datos de ejemplo, para probar sin cuenta)
//   supabase  → API REST de Supabase con fetch (sin librerías de terceros)
import { CONFIG } from './config.js';
import { hoy, lunesDe, sumaDias } from './logica.js';

export const TABLAS = ['profes', 'alumnos', 'contactos', 'alumno_contacto', 'series', 'serie_pausas',
  'suplencias', 'clases', 'movimientos', 'pagos_profes', 'auditoria'];

// Con ?demo en la dirección se fuerza el modo demo (para probar sin tocar los datos reales).
const forzarDemo = new URLSearchParams(globalThis.location?.search || '').has('demo');
export const modo = !forzarDemo && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey ? 'supabase' : 'demo';
const uuid = () => crypto.randomUUID();
const conId = (f) => ({ id: uuid(), ...f });

// ───────────── Motor demo ─────────────
const CLAVE_DEMO = 'verne-agenda-demo';

function semillaDemo() {
  const lunes = lunesDe(hoy());
  const p1 = uuid(), p2 = uuid(), a1 = uuid(), a2 = uuid(), a3 = uuid();
  return {
    profes: [
      { id: p1, nombre: 'Asesor Uno', tarifa_hora: null, color: '#20495b', activo: true },
      { id: p2, nombre: 'Asesor Dos', tarifa_hora: 100, color: '#2e9c78', activo: true },
    ],
    alumnos: [
      { id: a1, nombre: 'Alumno Ejemplo A', nivel: 'basico', tarifa_hora: 180, exento_recargo: false, saldo_inicial: 0, activo: true },
      { id: a2, nombre: 'Alumno Ejemplo B', nivel: 'universidad', tarifa_hora: 200, exento_recargo: true, saldo_inicial: 360, activo: true },
      { id: a3, nombre: 'Alumno Ejemplo C', nivel: null, tarifa_hora: null, exento_recargo: false, saldo_inicial: 0, activo: true },
    ],
    series: [
      { id: uuid(), alumno_id: a1, profe_id: p1, intervalo: 1, ancla: lunes, hora: '18:00', duracion_h: 2, hasta: null, estado: 'activa' },
      { id: uuid(), alumno_id: a2, profe_id: p2, intervalo: 2, ancla: sumaDias(lunes, 4), hora: '18:00', duracion_h: 2, hasta: null, estado: 'activa' },
      { id: uuid(), alumno_id: a3, profe_id: null, intervalo: 1, ancla: sumaDias(lunes, 3), hora: '17:00', duracion_h: 1, hasta: null, estado: 'activa' },
    ],
  };
}

function leeDemo() {
  let d = JSON.parse(localStorage.getItem(CLAVE_DEMO) || 'null');
  if (d) return d;
  d = semillaDemo();
  for (const t of TABLAS) d[t] = d[t] || [];
  guardaDemo(d);
  return d;
}
const guardaDemo = (d) => localStorage.setItem(CLAVE_DEMO, JSON.stringify(d));

const demo = {
  async sesion() { return { correo: 'demo' }; },
  async entrar() { return { correo: 'demo' }; },
  async salir() {},
  async lista(tabla) { return leeDemo()[tabla]; },
  async crea(tabla, filas) {
    const d = leeDemo();
    const nuevas = filas.map((f) => ({ creado: new Date().toISOString(), ...conId(f) }));
    d[tabla].push(...nuevas); guardaDemo(d);
    return nuevas;
  },
  async cambia(tabla, id, cambios) {
    const d = leeDemo();
    const fila = d[tabla].find((f) => f.id === id);
    Object.assign(fila, cambios); guardaDemo(d);
    return { ...fila };
  },
  async borra(tabla, id) {
    const d = leeDemo();
    d[tabla] = d[tabla].filter((f) => f.id !== id); guardaDemo(d);
  },
  reinicia() { localStorage.removeItem(CLAVE_DEMO); },
  /** En modo demo no hay Google: se responde como «no disponible». */
  async funcion() { return { demo: true, configurado: false, conectado: false }; },
};

// ───────────── Motor Supabase ─────────────
const CLAVE_SESION = 'verne-agenda-sesion';
const URL_BASE = CONFIG.supabaseUrl.replace(/\/$/, '');

const leeSesion = () => JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
function guardaSesion(r) {
  const s = { access: r.access_token, refresh: r.refresh_token, expira: Date.now() + r.expires_in * 1000, correo: r.user?.email };
  localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
  return s;
}

async function auth(tipo, cuerpo) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=${tipo}`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.msg || 'No se pudo iniciar sesión');
  return guardaSesion(j);
}

async function token() {
  let s = leeSesion();
  if (!s) throw new Error('Sin sesión');
  if (s.expira - Date.now() < 60000) s = await auth('refresh_token', { refresh_token: s.refresh });
  return s.access;
}

async function rest(metodo, ruta, cuerpo, extra = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    method: metodo,
    headers: {
      apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json', Prefer: 'return=representation', ...extra,
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.message || `Error ${r.status} al guardar`);
  }
  return r.status === 204 ? [] : r.json();
}

const supabase = {
  async sesion() {
    const s = leeSesion();
    if (!s) return null;
    try { await token(); return { correo: s.correo }; } catch { localStorage.removeItem(CLAVE_SESION); return null; }
  },
  async entrar(correo, clave) { const s = await auth('password', { email: correo, password: clave }); return { correo: s.correo }; },
  async salir() { localStorage.removeItem(CLAVE_SESION); },
  async lista(tabla) {
    const todo = [];
    for (let desde = 0; ; desde += 1000) {
      const parte = await rest('GET', `${tabla}?select=*&order=id.asc&limit=1000&offset=${desde}`);
      todo.push(...parte);
      if (parte.length < 1000) return todo;
    }
  },
  async crea(tabla, filas) { return rest('POST', tabla, filas.map(conId)); },
  async cambia(tabla, id, cambios) { return (await rest('PATCH', `${tabla}?id=eq.${id}`, cambios))[0]; },
  async borra(tabla, id) { await rest('DELETE', `${tabla}?id=eq.${id}`); },
  /** Llama a una función del servidor (por ejemplo «gcal», la de Google Calendar). */
  async funcion(nombre, cuerpo) {
    const r = await fetch(`${URL_BASE}/functions/v1/${nombre}`, {
      method: 'POST',
      headers: { apikey: CONFIG.supabaseAnonKey, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404 && !j.error) throw new Error('La función de Google Calendar todavía no está instalada en Supabase.');
    if (!r.ok) throw new Error(j.error || j.message || `Error ${r.status}`);
    return j;
  },
};

export const api = modo === 'supabase' ? supabase : demo;
api.modo = modo;
