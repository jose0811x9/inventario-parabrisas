import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Espacios({ espacios, vidrios, onGuardado }) {
  const [form, setForm] = useState({ codigo_espacio: '', tipo_permitido: 'parabrisas', capacidad_maxima: 10 })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  function ocupacion(espacioId) {
    return vidrios
      .filter((v) => v.espacio_id === espacioId)
      .reduce((total, v) => total + v.cantidad, 0)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    if (!form.codigo_espacio.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un código de espacio.' })
      return
    }
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase.from('espacios').insert({
      codigo_espacio: form.codigo_espacio.trim().toUpperCase(),
      tipo_permitido: form.tipo_permitido,
      capacidad_maxima: Number(form.capacidad_maxima),
    })

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: error.code === '23505' ? 'Ya existe un espacio con ese código.' : 'No se pudo guardar: ' + error.message,
      })
    } else {
      setMensaje({ tipo: 'exito', texto: `Espacio ${form.codigo_espacio.toUpperCase()} creado.` })
      setForm({ codigo_espacio: '', tipo_permitido: 'parabrisas', capacidad_maxima: 10 })
      onGuardado()
    }
    setGuardando(false)
  }

  async function eliminarEspacio(esp) {
    if (ocupacion(esp.id) > 0) {
      alert('No se puede eliminar: este espacio todavía tiene vidrios asignados.')
      return
    }
    if (!confirm(`¿Eliminar el espacio ${esp.codigo_espacio}?`)) return

    const { error } = await supabase.from('espacios').delete().eq('id', esp.id)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
    } else {
      onGuardado()
    }
  }

  return (
    <div className="espacios-wrap">
      <form className="form-agregar form-espacio" onSubmit={manejarEnvio}>
        <div className="form-grid">
          <label>
            Código de espacio
            <input
              value={form.codigo_espacio}
              onChange={(e) => setForm({ ...form, codigo_espacio: e.target.value })}
              placeholder="E-05"
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

        {mensaje && (
          <p className={`estado-msg ${mensaje.tipo === 'error' ? 'estado-error' : 'estado-exito'}`}>
            {mensaje.texto}
          </p>
        )}

        <button type="submit" className="btn-primario" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Crear espacio'}
        </button>
      </form>

      <div className="tabla-wrap espacios-tabla">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo permitido</th>
              <th>Ocupación</th>
              <th>Capacidad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {espacios.map((esp) => {
              const usado = ocupacion(esp.id)
              const lleno = usado >= esp.capacidad_maxima
              return (
                <tr key={esp.id}>
                  <td><span className="codigo-tag">{esp.codigo_espacio}</span></td>
                  <td><span className={`tipo-badge tipo-${esp.tipo_permitido}`}>{esp.tipo_permitido}</span></td>
                  <td className={lleno ? 'cantidad-cero' : ''}>{usado}</td>
                  <td>{esp.capacidad_maxima}</td>
                  <td>
                    <button className="btn-icono btn-eliminar" onClick={() => eliminarEspacio(esp)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
            {espacios.length === 0 && (
              <tr><td colSpan="5" className="sin-resultados">Todavía no hay espacios creados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
