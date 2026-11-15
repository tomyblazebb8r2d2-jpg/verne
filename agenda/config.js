// Conexión a Supabase. Mientras estén vacíos, el panel corre en MODO DEMO (datos de ejemplo
// guardados solo en este navegador). Estos dos valores son públicos por diseño: la protección
// real son las reglas por fila de la base de datos. Aquí NUNCA va la llave «service_role».
export const CONFIG = {
  supabaseUrl: 'https://psbrettrivlddxswydar.supabase.co',
  supabaseAnonKey: 'sb_publishable_umZwC3wXLlDGZeWuV_WHYA_LmwJjHlW',
};
