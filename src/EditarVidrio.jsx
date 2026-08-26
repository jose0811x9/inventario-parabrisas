import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function EditarVidrio({ vidrio, espacios, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    cantidad: vidrio.cantidad,
    precio: vidrio.precio ?? '',
    proveedor: vidrio.proveedor ?? '',
    espacio_id: vidrio.espacio_id ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const espaciosDelTipo = espacios.filter((e) => e.tipo_permitido === vidrio.tipo)

  async function manejarEnvio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase
      .from('vidrios')
      .update({
        cantidad: Number(form.cantidad),
        precio: form.precio === '' ? null : Number(form.precio),
        proveedor: form.proveedor || null,
        espacio_id: form.espacio_id ? Number(form.espacio_id) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vidrio.id)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar: ' + error.message })
      setGuardando(false)
    } else {
      onGuardado()
      onCerrar()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="codigo-tag">{vidrio.codigo_unico}</span>
          </div>
          <button type="button" className="btn-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <p className="modal-sub">{vidrio.marca} {vidrio.modelo} · {vidrio.tipo}</p>

        <form className="form-agregar" onSubmit={manejarEnvio}>
          <div className="form-grid">
            <label>
              Cantidad
              <input
                type="number"
                min="0"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              />
            </label>
            <label>
              Precio
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
              />
            </label>
            <label>
              Proveedor
              <input
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              />
            </label>
            <label>
              Espacio de bodega
              <select
                value={form.espacio_id}
                onChange={(e) => setForm({ ...form, espacio_id: e.target.value })}
              >
                <option value="">Sin espacio asignado</option>
                {espaciosDelTipo.map((esp) => (
                  <option key={esp.id} value={esp.id}>{esp.codigo_espacio}</option>
                ))}
              </select>
            </label>
          </div>

          {mensaje && <p className="estado-msg estado-error">{mensaje.texto}</p>}

          <div className="modal-acciones">
            <button type="button" className="btn-icono" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
