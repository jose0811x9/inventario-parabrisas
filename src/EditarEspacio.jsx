import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function EditarEspacio({ espacio, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    codigo_espacio: espacio.codigo_espacio,
    tipo_permitido: espacio.tipo_permitido,
    capacidad_maxima: espacio.capacidad_maxima,
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function manejarEnvio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase
      .from('espacios')
      .update({
        codigo_espacio: form.codigo_espacio.trim().toUpperCase(),
        tipo_permitido: form.tipo_permitido,
        capacidad_maxima: Number(form.capacidad_maxima),
      })
      .eq('id', espacio.id)

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: error.code === '23505' ? 'Ya existe un espacio con ese código.' : 'No se pudo guardar: ' + error.message,
      })
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
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20 }}>Editar espacio</h2>
          <button type="button" className="btn-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <form className="form-agregar" onSubmit={manejarEnvio}>
          <div className="form-grid">
            <label>
              Código de espacio
              <input
                value={form.codigo_espacio}
                onChange={(e) => setForm({ ...form, codigo_espacio: e.target.value })}
              />
            </label>
            <label>
              Tipo permitido
              <select
                value={form.tipo_permitido}
                onChange={(e) => setForm({ ...form, tipo_permitido: e.target.value })}
              >
                <option value="parabrisas">Parabrisas</option>
                <option value="ventana">Ventana</option>
                <option value="ventolera">Ventolera</option>
                <option value="lateral">Lateral</option>
              </select>
            </label>
            <label>
              Capacidad máxima
              <input
                type="number"
                min="1"
                value={form.capacidad_maxima}
                onChange={(e) => setForm({ ...form, capacidad_maxima: e.target.value })}
              />
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