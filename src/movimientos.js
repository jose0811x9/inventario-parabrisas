import { supabase } from './supabaseClient'

export async function registrarMovimiento({ codigo_vidrio, accion, detalle, cantidad_cambio }) {
  const { data: userData } = await supabase.auth.getUser()
  const usuario_email = userData?.user?.email ?? 'desconocido'

  await supabase.from('movimientos').insert({
    codigo_vidrio,
    accion,
    detalle,
    cantidad_cambio,
    usuario_email,
  })
}