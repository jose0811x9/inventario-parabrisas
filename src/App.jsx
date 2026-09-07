import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import AgregarVidrio from './AgregarVidrio'
import Espacios from './Espacios'
import EditarVidrio from './EditarVidrio'
import Login from './Login'
import './App.css'
import * as XLSX from 'xlsx'
import { registrarMovimiento } from './movimientos'

const TIPOS = ['parabrisas', 'ventana', 'ventolera', 'lateral']

function App() {
  const UMBRAL_STOCK_BAJO = 2
  const [sesion, setSesion] = useState(undefined) // undefined = cargando, null = sin sesión
  const [perfil, setPerfil] = useState(null)
  const [vista, setVista] = useState('buscar')
  const [vidrios, setVidrios] = useState([])
  const [espacios, setEspacios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [vidrioEditando, setVidrioEditando] = useState(null)
  const [movimientos, setMovimientos] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSesion(nuevaSesion)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (sesion) {
      cargarPerfil()
      cargarDatos()
    }
  }, [sesion])

  async function cargarPerfil() {
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('*')
      .eq('id', sesion.user.id)
      .single()
    setPerfil(data)
  }

  async function cargarDatos() {
    const { data: dataMovs } = await supabase
      .from('movimientos')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100)
    setMovimientos(dataMovs || [])
    setCargando(true)
    setError(null)

    const { data: dataVidrios, error: errorVidrios } = await supabase
      .from('vidrios')
      .select('*, espacios(codigo_espacio)')
      .order('created_at', { ascending: false })

    const { data: dataEspacios, error: errorEspacios } = await supabase
      .from('espacios')
      .select('*')

    if (errorVidrios || errorEspacios) {
      setError('No se pudo cargar el inventario. Revisa tu conexión con Supabase.')
      console.error(errorVidrios || errorEspacios)
    } else {
      setVidrios(dataVidrios)
      setEspacios(dataEspacios)
    }
    setCargando(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  async function eliminarVidrio(v) {
    if (!confirm(`¿Eliminar el vidrio ${v.codigo_unico}?`)) return
    const { error } = await supabase.from('vidrios').delete().eq('id', v.id)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
    } else {
      await registrarMovimiento({
        codigo_vidrio: v.codigo_unico,
        accion: 'eliminar',
        detalle: `Vidrio eliminado (tenía ${v.cantidad} unidades)`,
        cantidad_cambio: -v.cantidad,
      })
      cargarDatos()
    }
  }
    function exportarExcel() {
      const filas = vidriosFiltrados.map((v) => ({
        'Código': v.codigo_unico,
        'Tipo': v.tipo,
        'Posición': v.posicion,
        'Lado': v.lado,
        'Vehículo': v.tipo_vehiculo,
        'Marca': v.marca,
        'Modelo': v.modelo,
        'Cantidad': v.cantidad,
        'Precio': v.precio ?? '',
        'Proveedor': v.proveedor ?? '',
        'Espacio': v.espacios?.codigo_espacio ?? '',
    }))

      const hoja = XLSX.utils.json_to_sheet(filas)
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Inventario')

      const fecha = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(libro, `inventario-parabrisas-victor-${fecha}.xlsx`)
    }

    const vidriosFiltrados = vidrios.filter((v) => {
    const coincideTipo = filtroTipo === 'todos' || v.tipo === filtroTipo
    const texto = busqueda.toLowerCase()
    const coincideBusqueda =
      v.codigo_unico.toLowerCase().includes(texto) ||
      v.marca.toLowerCase().includes(texto) ||
      v.modelo.toLowerCase().includes(texto)
    return coincideTipo && coincideBusqueda
  })

  const vidriosBajos = vidrios
    .filter((v) => v.cantidad <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => a.cantidad - b.cantidad)

  if (sesion === undefined) {
    return <div className="estado-msg" style={{ paddingTop: 60 }}>Cargando...</div>
  }

  if (!sesion) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">PV</span>
          <div>
            <h1>Parabrisas Víctor</h1>
            <p className="brand-sub">Control de inventario de bodega</p>
          </div>
          <div className="usuario-info">
            <span className="usuario-email">{sesion.user.email}</span>
            <span className="rol-badge">{perfil?.rol || '...'}</span>
            <button className="btn-salir" onClick={cerrarSesion}>Salir</button>
          </div>
        </div>
        <nav className="tabs">
          <button className={`tab ${vista === 'buscar' ? 'tab-activo' : ''}`} onClick={() => setVista('buscar')}>
            Buscar inventario
          </button>
          <button className={`tab ${vista === 'agregar' ? 'tab-activo' : ''}`} onClick={() => setVista('agregar')}>
            Agregar vidrio
          </button>
          <button className={`tab ${vista === 'espacios' ? 'tab-activo' : ''}`} onClick={() => setVista('espacios')}>
            Espacios
          </button>
          <button className={`tab ${vista === 'alertas' ? 'tab-activo' : ''}`} onClick={() => setVista('alertas')}>
            Alertas
            {vidriosBajos.length > 0 && <span className="alerta-badge">{vidriosBajos.length}</span>}
          </button>
          <button className={`tab ${vista === 'historial' ? 'tab-activo' : ''}`} onClick={() => setVista('historial')}>
            Historial
          </button>
        </nav>
      </header>

      <main className="app-main">
        {vista === 'buscar' && (
          <section className="panel">
            <div className="panel-head">
              <h2>Buscar en inventario</h2>
              <div className="panel-head-acciones">
                <span className="count-chip">{vidriosFiltrados.length} resultados</span>
                <button className="btn-icono" onClick={exportarExcel}>Exportar a Excel</button>
              </div>
            </div>

            <div className="controls">
              <input
                className="search-input"
                type="text"
                placeholder="Buscar por código, marca o modelo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <div className="tipo-filtros">
                <button className={`chip ${filtroTipo === 'todos' ? 'chip-active' : ''}`} onClick={() => setFiltroTipo('todos')}>
                  Todos
                </button>
                {TIPOS.map((t) => (
                  <button key={t} className={`chip ${filtroTipo === t ? 'chip-active' : ''}`} onClick={() => setFiltroTipo(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {cargando && <p className="estado-msg">Cargando inventario...</p>}
            {error && <p className="estado-msg estado-error">{error}</p>}

            {!cargando && !error && (
              <div className="tabla-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th><th>Tipo</th><th>Posición</th><th>Vehículo</th>
                      <th>Marca / Modelo</th><th>Cantidad</th><th>Precio</th><th>Espacio</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vidriosFiltrados.map((v) => (
                      <tr key={v.id}>
                        <td><span className="codigo-tag">{v.codigo_unico}</span></td>
                        <td><span className={`tipo-badge tipo-${v.tipo}`}>{v.tipo}</span></td>
                        <td>{v.posicion} {v.lado !== 'no_aplica' ? `· ${v.lado}` : ''}</td>
                        <td>{v.tipo_vehiculo}</td>
                        <td>{v.marca} {v.modelo}</td>
                        <td className={v.cantidad === 0 ? 'cantidad-cero' : ''}>{v.cantidad}</td>
                        <td>{v.precio != null ? `$${Number(v.precio).toFixed(2)}` : '—'}</td>
                        <td>{v.espacios?.codigo_espacio || '—'}</td>
                        <td className="col-acciones">
                          <button className="btn-icono" onClick={() => setVidrioEditando(v)}>Editar</button>
                          {perfil?.rol === 'admin' && (
                            <button className="btn-icono btn-eliminar" onClick={() => eliminarVidrio(v)}>Eliminar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {vidriosFiltrados.length === 0 && (
                      <tr><td colSpan="9" className="sin-resultados">No hay vidrios que coincidan con la búsqueda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {vista === 'agregar' && (
          <section className="panel">
            <div className="panel-head"><h2>Agregar nuevo vidrio</h2></div>
            <AgregarVidrio espacios={espacios} onGuardado={cargarDatos} />
          </section>
        )}

        {vista === 'espacios' && (
          <section className="panel">
            <div className="panel-head"><h2>Espacios de bodega</h2></div>
                        <Espacios espacios={espacios} vidrios={vidrios} onGuardado={cargarDatos} esAdmin={perfil?.rol === 'admin'} />
          </section>
        )}
        {vista === 'alertas' && (
          <section className="panel">
            <div className="panel-head">
              <h2>Alertas de stock bajo</h2>
              <span className="count-chip">{vidriosBajos.length} vidrios</span>
            </div>

            {vidriosBajos.length === 0 && (
              <p className="estado-msg">Ningún vidrio está en stock bajo por ahora. 👍</p>
            )}

            {vidriosBajos.length > 0 && (
              <div className="tabla-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th><th>Tipo</th><th>Marca / Modelo</th><th>Cantidad</th><th>Espacio</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vidriosBajos.map((v) => (
                      <tr key={v.id}>
                        <td><span className="codigo-tag">{v.codigo_unico}</span></td>
                        <td><span className={`tipo-badge tipo-${v.tipo}`}>{v.tipo}</span></td>
                        <td>{v.marca} {v.modelo}</td>
                        <td className={v.cantidad === 0 ? 'cantidad-cero' : 'cantidad-baja'}>{v.cantidad}</td>
                        <td>{v.espacios?.codigo_espacio || '—'}</td>
                        <td className="col-acciones">
                          <button className="btn-icono" onClick={() => setVidrioEditando(v)}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
                {vista === 'historial' && (
          <section className="panel">
            <div className="panel-head">
              <h2>Historial de movimientos</h2>
              <span className="count-chip">Últimos {movimientos.length}</span>
            </div>

            {movimientos.length === 0 && (
              <p className="estado-msg">Todavía no hay movimientos registrados.</p>
            )}

            {movimientos.length > 0 && (
              <div className="tabla-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Usuario</th><th>Acción</th><th>Código</th><th>Detalle</th><th>Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.creado_en).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td>{m.usuario_email}</td>
                        <td><span className={`tipo-badge accion-${m.accion}`}>{m.accion}</span></td>
                        <td><span className="codigo-tag">{m.codigo_vidrio}</span></td>
                        <td>{m.detalle}</td>
                        <td className={m.cantidad_cambio < 0 ? 'cantidad-cero' : 'cantidad-positiva'}>
                          {m.cantidad_cambio > 0 ? `+${m.cantidad_cambio}` : m.cantidad_cambio}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {vidrioEditando && (
        <EditarVidrio
          vidrio={vidrioEditando}
          espacios={espacios}
          onCerrar={() => setVidrioEditando(null)}
          onGuardado={cargarDatos}
        />
      )}
    </div>
  )
}

export default App
