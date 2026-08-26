import { useState } from 'react'
import { supabase } from './supabaseClient'

const PREFIJOS_TIPO = { parabrisas: 'PB', ventana: 'VE', ventolera: 'VO', lateral: 'LA' }
const PREFIJOS_POSICION = { delantero: 'DEL', posterior: 'POS', ambos: 'AMB', no_aplica: 'XX' }
const PREFIJOS_VEHICULO = { auto: 'AUT', camion: 'CAM' }

// Opciones de posición permitidas según el tipo de vidrio
const POSICIONES_POR_TIPO = {
  parabrisas: ['delantero', 'posterior'],
  ventana: ['delantero'],
  ventolera: ['delantero', 'posterior', 'ambos'],
  lateral: ['no_aplica'],
}

function siglasMarcaModelo(marca, modelo) {
  const limpiar = (txt) => txt.trim().toUpperCase().slice(0, 3).padEnd(3, 'X')
  return `${limpiar(marca)}-${limpiar(modelo)}`
}

export default function AgregarVidrio({ espacios, onGuardado }) {
  const [form, setForm] = useState({
    tipo: 'parabrisas',
    posicion: 'delantero',
    lado: 'no_aplica',
    tipo_vehiculo: 'auto',
    marca: '',
    modelo: '',
    cantidad: 1,
    precio: '',
    proveedor: '',
    espacio_id: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const espaciosDelTipo = espacios.filter((e) => e.tipo_permitido === form.tipo)
  const necesitaLado = form.tipo === 'ventana' || form.tipo === 'ventolera' || form.tipo === 'lateral'

  function actualizar(campo, valor) {
    setForm((prev) => {
      const nuevo = { ...prev, [campo]: valor }
      // Si cambia el tipo, reseteamos posición a la primera válida y el espacio elegido
      if (campo === 'tipo') {
        nuevo.posicion = POSICIONES_POR_TIPO[valor][0]
        nuevo.lado = valor === 'parabrisas' ? 'no_aplica' : prev.lado === 'no_aplica' ? 'izquierdo' : prev.lado
        nuevo.espacio_id = ''
      }
      return nuevo
    })
  }

  async function generarCodigo() {
    const prefijo = [
      PREFIJOS_TIPO[form.tipo],
      PREFIJOS_POSICION[form.posicion],
      PREFIJOS_VEHICULO[form.tipo_vehiculo],
      siglasMarcaModelo(form.marca, form.modelo),
    ].join('-')

    const { count } = await supabase
      .from('vidrios')
      .select('*', { count: 'exact', head: true })
      .like('codigo_unico', `${prefijo}-%`)

    const siguiente = String((count || 0) + 1).padStart(4, '0')
    return `${prefijo}-${siguiente}`
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    if (!form.marca || !form.modelo || !form.espacio_id) {
      setMensaje({ tipo: 'error', texto: 'Completa marca, modelo y espacio antes de guardar.' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    const codigo_unico = await generarCodigo()

    const { error } = await supabase.from('vidrios').insert({
      codigo_unico,
      tipo: form.tipo,
      posicion: form.posicion,
      lado: necesitaLado ? form.lado : 'no_aplica',
      tipo_vehiculo: form.tipo_vehiculo,
      marca: form.marca,
      modelo: form.modelo,
      cantidad: Number(form.cantidad),
      precio: form.precio ? Number(form.precio) : null,
      proveedor: form.proveedor || null,
      espacio_id: Number(form.espacio_id),
    })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar. ' + error.message })
    } else {
      setMensaje({ tipo: 'exito', texto: `Vidrio guardado con código ${codigo_unico}` })
      setForm((prev) => ({ ...prev, marca: '', modelo: '', cantidad: 1, precio: '', proveedor: '' }))
      onGuardado()
    }
    setGuardando(false)
  }

  return (
    <form className="form-agregar" onSubmit={manejarEnvio}>
      <div className="form-grid">
        <label>
          Tipo de vidrio
          <select value={form.tipo} onChange={(e) => actualizar('tipo', e.target.value)}>
            <option value="parabrisas">Parabrisas</option>
            <option value="ventana">Ventana</option>
            <option value="ventolera">Ventolera</option>
            <option value="lateral">Lateral</option>
          </select>
        </label>

        <label>
          Posición
          <select value={form.posicion} onChange={(e) => actualizar('posicion', e.target.value)}>
            {POSICIONES_POR_TIPO[form.tipo].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        {necesitaLado && (
          <label>
            Lado
            <select value={form.lado} onChange={(e) => actualizar('lado', e.target.value)}>
              <option value="izquierdo">Izquierdo</option>
              <option value="derecho">Derecho</option>
            </select>
          </label>
        )}

        <label>
          Tipo de vehículo
          <select value={form.tipo_vehiculo} onChange={(e) => actualizar('tipo_vehiculo', e.target.value)}>
            <option value="auto">Auto</option>
            <option value="camion">Camión</option>
          </select>
        </label>

        <label>
          Marca
          <input value={form.marca} onChange={(e) => actualizar('marca', e.target.value)} placeholder="Toyota" />
        </label>

        <label>
          Modelo
          <input value={form.modelo} onChange={(e) => actualizar('modelo', e.target.value)} placeholder="Corolla" />
        </label>

        <label>
          Cantidad
          <input type="number" min="0" value={form.cantidad} onChange={(e) => actualizar('cantidad', e.target.value)} />
        </label>

        <label>
          Precio (opcional)
          <input type="number" min="0" step="0.01" value={form.precio} onChange={(e) => actualizar('precio', e.target.value)} />
        </label>

        <label>
          Proveedor (opcional)
          <input value={form.proveedor} onChange={(e) => actualizar('proveedor', e.target.value)} />
        </label>

        <label>
          Espacio de bodega
          <select value={form.espacio_id} onChange={(e) => actualizar('espacio_id', e.target.value)}>
            <option value="">Selecciona un espacio</option>
            {espaciosDelTipo.map((esp) => (
              <option key={esp.id} value={esp.id}>{esp.codigo_espacio}</option>
            ))}
          </select>
          {espaciosDelTipo.length === 0 && (
            <span className="ayuda-txt">No hay espacios creados para este tipo todavía.</span>
          )}
        </label>
      </div>

      {mensaje && <p className={`estado-msg ${mensaje.tipo === 'error' ? 'estado-error' : 'estado-exito'}`}>{mensaje.texto}</p>}

      <button type="submit" className="btn-primario" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar vidrio'}
      </button>
    </form>
  )
}