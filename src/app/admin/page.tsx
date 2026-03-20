'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Generar QR usando API externa
const generarQRImage = (url: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`
}

// Types
interface Cliente {
  id: string
  telefono: string
  nombre: string
  email: string | null
  puntos: number
  totalVisitas: number
  premiosCanjeados: number
  activo: boolean
  notas: string | null
  createdAt: string
  _count?: { visitas: number; canjes: number; cobranzas: number }
}

interface Visita {
  id: string
  clienteId: string
  puntosGanados: number
  createdAt: string
  cliente: { nombre: string; telefono: string }
}

interface Cobranza {
  id: string
  clienteId: string
  concepto: string
  monto: number
  fechaVencimiento: string | null
  estado: string
  cliente: { nombre: string; telefono: string; email: string | null }
}

interface Marketing {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  destinatarios: string
  estado: string
  enviados: number
  errores: number
  fechaProgramada: string | null
  repetir: string | null
  fechaEnvio: string | null
  createdAt: string
}

interface Usuario {
  id: string
  email: string
  nombre: string
  rol: string
  activo?: boolean
  ultimoAcceso?: string | null
  createdAt?: string
}

interface Negocio {
  id: string
  nombre: string
  descripcion: string | null
  logo: string | null
  puntosPorVisita: number
  puntosParaPremio: number
  premioDescripcion: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  whatsapp: string | null
  callmebotApikey: string | null
  callmebotPhone: string | null
  telegramBotToken: string | null
  telegramChatId: string | null
}

interface Configuracion {
  id: string
  nombreSistema: string
  tiempoMinimoEntreVisitas: number
  maxVisitasDiarias: number
  notificarDueno: boolean
  notificarCliente: boolean
  autoActualizar: boolean
  intervaloActualizacion: number
  // Recordatorios automáticos
  recordatoriosAutomaticos?: boolean
  diasRecordatorio?: number
  diasRecordatorioVencido?: number
}

interface Estadisticas {
  // Clientes
  totalClientes: number
  clientesActivos: number
  clientesInactivos: number
  clientesNuevosMes: number
  // Visitas
  totalVisitas: number
  visitasHoy: number
  visitasSemana: number
  visitasMes: number
  ultimasVisitas: Visita[]
  // Puntos y Premios
  puntosTotales: number
  premiosCanjeados: number
  premiosMes: number
  topClientes: Cliente[]
  // Cobranzas
  cobranzasPendientes: number
  cobranzasPagadas: number
  cobranzasVencidas: number
  montoPendiente: number
  montoPagado: number
  montoVencido: number
  // Marketing
  campanasEnviadas: number
  emailsEnviados: number
  notificacionesEnviadas: number
}

type Tab = 'dashboard' | 'clientes' | 'visitas' | 'cobranzas' | 'marketing' | 'qr' | 'configuracion' | 'usuarios'

export default function AdminPanel() {
  // Theme
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [  mounted, setMounted] = useState(false)
  
  // State
  const [ tab, setTab] = useState<Tab>('dashboard')
  const [ loading, setLoading] = useState(true)
  const [ authChecked, setAuthChecked] = useState(false)
  const [ usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [ estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [ clientes, setClientes] = useState<Cliente[]>([])
  const [ visitas, setVisitas] = useState<Visita[]>([])
  const [ cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [  marketing, setMarketing] = useState<Marketing[]>([])
  const [ negocio, setNegocio] = useState<Negocio | null>(null)
  const [ configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [ usuarios, setUsuarios] = useState<Usuario[]>([])
  const [  mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  
  // Form states
  const [ nuevoCliente, setNuevoCliente] = useState({ nombre: '', email: '', telefono: '', notas: '' })
  const [ nuevaCobranza, setNuevaCobranza] = useState({ clienteId: '', concepto: '', monto: '', fechaVencimiento: '', enviarNotificacion: false })
  const [ nuevoMarketing, setNuevoMarketing] = useState({ tipo: 'promocion', titulo: '', mensaje: '', destinatarios: 'todos', fechaProgramada: '', repetir: '' })
  const [ nuevoUsuario, setNuevoUsuario] = useState({ email: '', password: '', nombre: '', rol: 'admin' })
  const [ editandoCliente, setEditandoCliente] = useState<Cliente | null>(null)
  const [ editandoNegocio, setEditandoNegocio] = useState<Negocio | null>(null)
  const [ editandoPremios, setEditandoPremios] = useState<Negocio | null>(null)
  const [ editandoConfig, setEditandoConfig] = useState<Configuracion | null>(null)
  const [ editandoNotificaciones, setEditandoNotificaciones] = useState<Negocio | null>(null)
  const [ logoFile, setLogoFile] = useState<File | null>(null)

  // Hydration fix for theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth')
        if (res.ok) {
          const data = await res.json()
          setUsuarioActual(data.usuario)
          setAuthChecked(true)
        } else {
          window.location.href = '/login'
        }
      } catch {
        window.location.href = '/login'
      }
    }
    checkAuth()
  }, [])

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    if (!usuarioActual) return
    setLoading(true)
    try {
      const [ estRes, cliRes, negRes, cfgRes] = await Promise.all([
        fetch('/api/estadisticas'),
        fetch('/api/clientes'),
        fetch('/api/negocio'),
        fetch('/api/configuracion')
      ])
      
      const [ est, cli, neg, cfg] = await Promise.all([
        estRes.json(),
        cliRes.json(),
        negRes.json(),
        cfgRes.json()
      ])
      
      setEstadisticas(est)
      setClientes(cli)
      setNegocio(neg)
      setConfiguracion(cfg)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }, [usuarioActual])

  useEffect(() => {
    if (authChecked && usuarioActual) {
      cargarDatos()
    }
  }, [authChecked, usuarioActual, cargarDatos])

  // Cargar usuarios
  const cargarUsuarios = async () => {
    const res = await fetch('/api/usuarios')
    if (res.ok) {
      const data = await res.json()
      setUsuarios(data)
    }
  }

  // Cargar visitas
  const cargarVisitas = async () => {
    const res = await fetch('/api/visitas')
    const data = await res.json()
    setVisitas(data)
  }

  // Cargar cobranzas
  const cargarCobranzas = async () => {
    const res = await fetch('/api/cobranzas')
    const data = await res.json()
    setCobranzas(data)
  }

  // Cargar marketing
  const cargarMarketing = async () => {
    const res = await fetch('/api/marketing')
    const data = await res.json()
    setMarketing(Array.isArray(data) ? data : [])
  }

  // Cambiar tab
  const cambiarTab = (nuevoTab: Tab) => {
    setTab(nuevoTab)
    setMensaje(null)
    if (nuevoTab === 'visitas') cargarVisitas()
    if (nuevoTab === 'cobranzas') cargarCobranzas()
    if (nuevoTab === 'marketing') cargarMarketing()
    if (nuevoTab === 'usuarios' && usuarioActual?.rol === 'superadmin') cargarUsuarios()
  }

  // Logout
  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  // Crear cliente
  const crearCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.email) {
      setMensaje({ tipo: 'error', texto: 'Nombre y email son obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Cliente creado exitosamente' })
        setNuevoCliente({ telefono: '', nombre: '', email: '', notas: '' })
        cargarDatos()
      } else {
        const data = await res.json()
        setMensaje({ tipo: 'error', texto: data.error || 'Error al crear cliente' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión' })
    }
  }

  // Actualizar cliente
  const actualizarCliente = async () => {
    if (!editandoCliente) return
    try {
      const res = await fetch(`/api/clientes/${editandoCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoCliente)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Cliente actualizado' })
        setEditandoCliente(null)
        cargarDatos()
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al actualizar' })
    }
  }

  // Eliminar cliente
  const eliminarCliente = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    try {
      await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      setMensaje({ tipo: 'exito', texto: 'Cliente eliminado' })
      cargarDatos()
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar' })
    }
  }

  // Crear cobranza
  const crearCobranza = async () => {
    if (!nuevaCobranza.clienteId || !nuevaCobranza.monto || !nuevaCobranza.concepto) {
      setMensaje({ tipo: 'error', texto: 'Completa todos los campos obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/cobranzas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevaCobranza, monto: parseFloat(nuevaCobranza.monto) })
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Cobranza creada' + (nuevaCobranza.enviarNotificacion ? ' y notificación enviada' : '') })
        setNuevaCobranza({ clienteId: '', concepto: '', monto: '', fechaVencimiento: '', enviarNotificacion: true })
        cargarCobranzas()
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al crear cobranza' })
    }
  }

  // Enviar recordatorio de cobranza
  const enviarRecordatorio = async (cobranzaId: string) => {
    try {
      const res = await fetch('/api/cobranzas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'enviar-recordatorio', cobranzaId })
      })
      const data = await res.json()
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Recordatorio enviado por email' })
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al enviar recordatorio' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al enviar recordatorio' })
    }
  }

  // Marcar cobranza pagada
  const marcarPagada = async (id: string) => {
    try {
      await fetch(`/api/cobranzas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'pagado' })
      })
      setMensaje({ tipo: 'exito', texto: 'Cobranza marcada como pagada' })
      cargarCobranzas()
      cargarDatos()
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al actualizar' })
    }
  }

  // Crear campaña
  const crearCampana = async () => {
    if (!nuevoMarketing.titulo || !nuevoMarketing.mensaje) {
      setMensaje({ tipo: 'error', texto: 'Título y mensaje son obligatorios' })
      return
    }
    try {
      setMensaje({ tipo: 'exito', texto: 'Enviando campaña...' })
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMarketing)
      })
      const data = await res.json()
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: `Campaña enviada a ${data.enviados} clientes` + (data.errores > 0 ? ` (${data.errores} errores)` : '') })
        setNuevoMarketing({ tipo: 'promocion', titulo: '', mensaje: '', destinatarios: 'todos', fechaProgramada: '', repetir: '' })
        cargarMarketing()
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al crear campaña' })
    }
  }

  // Guardar negocio
  const guardarNegocio = async () => {
    if (!editandoNegocio) return
    try {
      const res = await fetch('/api/negocio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoNegocio)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Configuración guardada' })
        setNegocio(editandoNegocio)
        setEditandoNegocio(null)
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar' })
    }
  }

  // Guardar configuración
  const guardarConfig = async () => {
    if (!editandoConfig) return
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoConfig)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Configuración guardada' })
        setConfiguracion(editandoConfig)
        setEditandoConfig(null)
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar configuración' })
    }
  }

  // Guardar notificaciones
  const guardarNotificaciones = async () => {
    if (!editandoNotificaciones) return
    try {
      const res = await fetch('/api/negocio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoNotificaciones)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Notificaciones guardadas' })
        setNegocio(editandoNotificaciones)
        setEditandoNotificaciones(null)
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar notificaciones' })
    }
  }

  // Guardar información del negocio
  const guardarInfoNegocio = async () => {
    if (!editandoNegocio) return
    try {
      const res = await fetch('/api/negocio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoNegocio)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Información guardada' })
        setNegocio(editandoNegocio)
        setEditandoNegocio(null)
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al guardar' })
    }
  }

  // Crear usuario
  const crearUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password || !nuevoUsuario.nombre) {
      setMensaje({ tipo: 'error', texto: 'Todos los campos son obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      })
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: 'Usuario creado exitosamente' })
        setNuevoUsuario({ email: '', password: '', nombre: '', rol: 'admin' })
        cargarUsuarios()
      } else {
        const data = await res.json()
        setMensaje({ tipo: 'error', texto: data.error || 'Error al crear usuario' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al crear usuario' })
    }
  }

  // Eliminar usuario
  const eliminarUsuario = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' })
      setMensaje({ tipo: 'exito', texto: 'Usuario eliminado' })
      cargarUsuarios()
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar usuario' })
    }
  }

  // Agregar puntos
  const agregarPuntos = async (clienteId: string, puntos: number) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId)
      if (!cliente) return
      await fetch(`/api/clientes/${clienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puntos: cliente.puntos + puntos })
      })
      cargarDatos()
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al agregar puntos' })
    }
  }

  // Marcar compra manual (para el dueño desde su celular)
  const marcarCompraManual = async (clienteId: string) => {
    try {
      const cliente = clientes.find(c => c.id === clienteId)
      if (!cliente) return
      
      const puntosGanados = negocio?.puntosPorVisita || 1
      
      // Registrar la visita y agregar puntos
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clienteId,
          puntosGanados,
          concepto: 'Compra registrada manualmente'
        })
      })
      
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: `✅ Compra registrada a ${cliente.nombre}. +${puntosGanados} cupón` })
        cargarDatos()
      } else {
        const data = await res.json()
        setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar compra' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al registrar compra' })
    }
  }

  // Canjear premio
  const canjearPremio = async (clienteId: string) => {
    try {
      const res = await fetch('/api/canjes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      })
      const data = await res.json()
      if (data.success) {
        setMensaje({ tipo: 'exito', texto: `Premio canjeado. Puntos restantes: ${data.puntosRestantes}` })
        cargarDatos()
      } else {
        setMensaje({ tipo: 'error', texto: data.error })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al canjear' })
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Verificando autenticación...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Cargando panel...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">🎯 FideliQR Admin</h1>
            <div className="flex items-center gap-4">
              {/* Toggle Tema */}
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="text-white/80 hover:text-white text-sm bg-white/20 px-3 py-1 rounded-lg flex items-center gap-2"
                title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {mounted && resolvedTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
              </button>
              <span className="text-sm opacity-90">
                {usuarioActual?.nombre} ({usuarioActual?.rol === 'superadmin' ? '⭐ Super Admin' : 'Admin'})
              </span>
              <button onClick={logout} className="text-white/80 hover:text-white text-sm bg-white/20 px-3 py-1 rounded-lg">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'clientes', label: '👥 Clientes' },
              { id: 'visitas', label: '📋 Visitas' },
              { id: 'cobranzas', label: '💰 Cobranzas' },
              { id: 'marketing', label: '📣 Marketing' },
              { id: 'qr', label: '📱 QR' },
              { id: 'configuracion', label: '⚙️ Config' },
              ...(usuarioActual?.rol === 'superadmin' ? [{ id: 'usuarios', label: '👤 Usuarios' }] : [])
            ].map(t => (
              <button
                key={t.id}
                onClick={() => cambiarTab(t.id as Tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {mensaje && (
          <div className={`mb-4 p-4 rounded-lg ${
            mensaje.tipo === 'exito' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Dashboard */}
        {tab === 'dashboard' && estadisticas && (
          <div className="space-y-6">
            {/* ENCABEZADO */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📊 Panel de Control</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
            {/* FILA 1: CLIENTES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{estadisticas.totalClientes}</div>
                  <div className="text-sm opacity-90">Total Clientes</div>
                  <div className="text-xs opacity-70 mt-1">+{estadisticas.clientesNuevosMes} este mes</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{estadisticas.clientesActivos}</div>
                  <div className="text-sm opacity-90">Clientes Activos</div>
                  <div className="text-xs opacity-70 mt-1">{estadisticas.clientesInactivos} inactivos</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{estadisticas.visitasHoy}</div>
                  <div className="text-sm opacity-90">Compras Hoy</div>
                  <div className="text-xs opacity-70 mt-1">{estadisticas.visitasSemana} esta semana</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{estadisticas.totalVisitas}</div>
                  <div className="text-sm opacity-90">Total Compras</div>
                  <div className="text-xs opacity-70 mt-1">{estadisticas.visitasMes} este mes</div>
                </CardContent>
              </Card>
            </div>

            {/* FILA 2: PUNTOS Y PREMIOS */}
            <Card>
              <CardHeader><CardTitle className="text-lg">🎁 Puntos y Premios</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{estadisticas.puntosTotales}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Cupones en circulación</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{estadisticas.premiosCanjeados}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Premios canjeados</div>
                  </div>
                  <div className="p-4 bg-pink-50 dark:bg-pink-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{estadisticas.premiosMes}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Canjeados este mes</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{negocio?.puntosParaPremio || 10}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Cupones por premio</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FILA 3: COBRANZAS */}
            <Card>
              <CardHeader><CardTitle className="text-lg">💰 Resumen de Cobranzas</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendientes</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">${estadisticas.montoPendiente.toFixed(2)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{estadisticas.cobranzasPendientes} cobranzas</div>
                    {estadisticas.cobranzasVencidas > 0 && (
                      <div className="text-xs text-red-500 dark:text-red-400 mt-1">⚠️ {estadisticas.cobranzasVencidas} vencidas (${estadisticas.montoVencido.toFixed(2)})</div>
                    )}
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pagadas</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">${estadisticas.montoPagado.toFixed(2)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{estadisticas.cobranzasPagadas} cobranzas</div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Gestión</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">${(estadisticas.montoPendiente + estadisticas.montoPagado).toFixed(2)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{estadisticas.cobranzasPendientes + estadisticas.cobranzasPagadas} registros</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FILA 4: MARKETING Y NOTIFICACIONES */}
            <Card>
              <CardHeader><CardTitle className="text-lg">📣 Marketing y Notificaciones</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{estadisticas.campanasEnviadas}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Campañas enviadas</div>
                  </div>
                  <div className="p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{estadisticas.emailsEnviados}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Emails de marketing</div>
                  </div>
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{estadisticas.notificacionesEnviadas}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Notificaciones totales</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FILA 5: ÚLTIMAS VISITAS Y TOP CLIENTES */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Últimas Compras */}
              <Card>
                <CardHeader><CardTitle className="text-lg">🛒 Últimas Compras</CardTitle></CardHeader>
                <CardContent>
                  {estadisticas.ultimasVisitas.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay compras registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {estadisticas.ultimasVisitas.map((v) => (
                        <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{v.cliente?.nombre || 'Cliente'}</div>
                            <div className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString('es-ES')}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">+{v.puntosGanados}</div>
                            <div className="text-xs text-gray-500">cupón</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Clientes */}
              <Card>
                <CardHeader><CardTitle className="text-lg">🏆 Top Clientes</CardTitle></CardHeader>
                <CardContent>
                  {estadisticas.topClientes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay clientes registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {estadisticas.topClientes.map((c, i) => (
                        <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-medium">{c.nombre}</div>
                              <div className="text-xs text-gray-500">{c.totalVisitas} compras</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600">{c.puntos} pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Clientes */}
        {tab === 'clientes' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">➕ Nuevo Cliente</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={nuevoCliente.nombre} onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={nuevoCliente.email} onChange={(e) => setNuevoCliente({...nuevoCliente, email: e.target.value})} placeholder="correo@email.com" />
                  </div>
                  <div>
                    <Label>Teléfono (opcional)</Label>
                    <Input value={nuevoCliente.telefono} onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} placeholder="04141234567" />
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Input value={nuevoCliente.notas} onChange={(e) => setNuevoCliente({...nuevoCliente, notas: e.target.value})} placeholder="Notas adicionales" />
                  </div>
                </div>
                <Button onClick={crearCliente} className="mt-4">Crear Cliente</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">👥 Clientes Registrados ({clientes.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {clientes.map((c) => (
                    <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                      {editandoCliente?.id === c.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={editandoCliente.nombre} onChange={(e) => setEditandoCliente({...editandoCliente, nombre: e.target.value})} />
                            <Input value={editandoCliente.email || ''} onChange={(e) => setEditandoCliente({...editandoCliente, email: e.target.value})} />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={actualizarCliente} size="sm">Guardar</Button>
                            <Button variant="outline" size="sm" onClick={() => setEditandoCliente(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{c.nombre}</div>
                            <div className="text-sm text-gray-500">{c.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-emerald-600">{c.puntos} pts</div>
                          </div>
                        </div>
                      )}
                      {editandoCliente?.id !== c.id && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => marcarCompraManual(c.id)}>🛒 Compra</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditandoCliente(c)}>✏️ Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => agregarPuntos(c.id, 1)}>+1</Button>
                          {c.puntos >= (negocio?.puntosParaPremio || 10) && (
                            <Button size="sm" onClick={() => canjearPremio(c.id)}>🎁 Canjear</Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => eliminarCliente(c.id)}>🗑️</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Usuarios - Solo superadmin */}
        {tab === 'usuarios' && usuarioActual?.rol === 'superadmin' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">➕ Nuevo Usuario Administrador</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} placeholder="Juan Admin" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} placeholder="admin@email.com" />
                  </div>
                  <div>
                    <Label>Contraseña *</Label>
                    <Input type="password" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <Label>Rol</Label>
                    <select className="w-full h-10 px-3 rounded-lg border-2 border-gray-200" value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>
                </div>
                <Button onClick={crearUsuario} className="mt-4">Crear Usuario</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">👤 Usuarios Administradores ({usuarios.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usuarios.map((u) => (
                    <div key={u.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{u.nombre}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                        <div className="text-xs text-gray-400">Rol: {u.rol === 'superadmin' ? '⭐ Super Admin' : 'Admin'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {u.id !== usuarioActual.id && (
                          <Button size="sm" variant="destructive" onClick={() => eliminarUsuario(u.id)}>🗑️</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR */}
        {tab === 'qr' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">📱 Código QR del Negocio</CardTitle></CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">Este es el código QR que tus clientes deben escanear para registrar sus compras.</p>
                <div className="bg-white p-8 rounded-xl shadow-lg inline-block mb-6">
                  <img src={generarQRImage(typeof window !== 'undefined' ? window.location.origin : '')} alt="QR" className="w-64 h-64 mx-auto" id="qr-image" />
                </div>
                <div className="space-y-3">
                  <Button onClick={() => {
                    const img = document.getElementById('qr-image') as HTMLImageElement
                    if (img) {
                      const link = document.createElement('a')
                      link.href = img.src
                      link.download = 'fideliqr-negocio.png'
                      link.click()
                    }
                  }} className="w-full md:w-auto">📥 Descargar QR</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuración */}
        {tab === 'configuracion' && negocio && configuracion && (
          <div className="space-y-6">
            {/* Información del Negocio */}
            <Card>
              <CardHeader><CardTitle className="text-lg">🏪 Información del Negocio</CardTitle></CardHeader>
              <CardContent>
                {editandoNegocio ? (
                  <div className="space-y-4">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <Label className="text-base font-semibold">Logo del Negocio</Label>
                      {editandoNegocio.logo ? (
                        <div className="relative">
                          <img 
                            src={editandoNegocio.logo} 
                            alt="Logo" 
                            className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 dark:border-slate-600 bg-white"
                          />
                          <button
                            onClick={() => setEditandoNegocio({...editandoNegocio, logo: null})}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-slate-500 rounded-lg flex items-center justify-center bg-white dark:bg-slate-800">
                          <span className="text-gray-400 text-sm text-center">Sin logo</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              setMensaje({ tipo: 'error', texto: 'La imagen debe ser menor a 5MB' })
                              return
                            }
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setEditandoNegocio({...editandoNegocio, logo: reader.result as string})
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="text-sm"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG o SVG. Máximo 5MB</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nombre del Negocio *</Label>
                        <Input value={editandoNegocio.nombre} onChange={(e) => setEditandoNegocio({...editandoNegocio, nombre: e.target.value})} placeholder="Mi Negocio" />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Input value={editandoNegocio.descripcion || ''} onChange={(e) => setEditandoNegocio({...editandoNegocio, descripcion: e.target.value})} placeholder="Descripción corta del negocio" />
                      </div>
                      <div>
                        <Label>Teléfono Público</Label>
                        <Input value={editandoNegocio.telefono || ''} onChange={(e) => setEditandoNegocio({...editandoNegocio, telefono: e.target.value})} placeholder="+58 414 1234567" />
                      </div>
                      <div>
                        <Label>Email Público</Label>
                        <Input type="email" value={editandoNegocio.email || ''} onChange={(e) => setEditandoNegocio({...editandoNegocio, email: e.target.value})} placeholder="contacto@minegocio.com" />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Dirección</Label>
                        <Input value={editandoNegocio.direccion || ''} onChange={(e) => setEditandoNegocio({...editandoNegocio, direccion: e.target.value})} placeholder="Dirección del negocio" />
                      </div>
                      <div>
                        <Label>WhatsApp (con código país)</Label>
                        <Input value={editandoNegocio.whatsapp || ''} onChange={(e) => setEditandoNegocio({...editandoNegocio, whatsapp: e.target.value})} placeholder="584141234567" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={guardarInfoNegocio}>💾 Guardar</Button>
                      <Button variant="outline" onClick={() => setEditandoNegocio(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Logo actual */}
                      <div className="flex flex-col items-center gap-2">
                        {negocio.logo ? (
                          <img 
                            src={negocio.logo} 
                            alt="Logo" 
                            className="w-24 h-24 object-contain rounded-lg border-2 border-gray-200 dark:border-slate-600 bg-white"
                          />
                        ) : (
                          <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-slate-500 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-700">
                            <span className="text-gray-400 text-xs text-center">Sin logo</span>
                          </div>
                        )}
                        <span className="text-xs text-gray-500">Logo</span>
                      </div>
                      
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{negocio.nombre}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descripción</p>
                          <p className="text-lg text-gray-700 dark:text-gray-300">{negocio.descripcion || 'Sin descripción'}</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                          <p className="text-lg text-blue-700 dark:text-blue-400">{negocio.telefono || 'No configurado'}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                          <p className="text-lg text-purple-700 dark:text-purple-400">{negocio.email || 'No configurado'}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Dirección</p>
                          <p className="text-lg text-gray-700 dark:text-gray-300">{negocio.direccion || 'No configurada'}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</p>
                          <p className="text-lg text-green-700 dark:text-green-400">{negocio.whatsapp || 'No configurado'}</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setEditandoNegocio(negocio)}>✏️ Editar Información</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">🎁 Configuración de Premios</CardTitle></CardHeader>
              <CardContent>
                {editandoPremios ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Cupones por Compra</Label>
                        <Input type="number" value={editandoPremios.puntosPorVisita} onChange={(e) => setEditandoPremios({...editandoPremios, puntosPorVisita: parseInt(e.target.value) || 1})} />
                      </div>
                      <div>
                        <Label>Cupones para Premio</Label>
                        <Input type="number" value={editandoPremios.puntosParaPremio} onChange={(e) => setEditandoPremios({...editandoPremios, puntosParaPremio: parseInt(e.target.value) || 10})} />
                      </div>
                    </div>
                    <div>
                      <Label>Descripción del Premio</Label>
                      <Input value={editandoPremios.premioDescripcion || ''} onChange={(e) => setEditandoPremios({...editandoPremios, premioDescripcion: e.target.value})} placeholder="Ej: Café gratis" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={async () => {
                        if (!editandoPremios) return
                        try {
                          const res = await fetch('/api/negocio', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(editandoPremios)
                          })
                          if (res.ok) {
                            setMensaje({ tipo: 'exito', texto: 'Premios guardados' })
                            setNegocio(editandoPremios)
                            setEditandoPremios(null)
                          }
                        } catch {
                          setMensaje({ tipo: 'error', texto: 'Error al guardar' })
                        }
                      }}>💾 Guardar</Button>
                      <Button variant="outline" onClick={() => setEditandoPremios(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-emerald-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-emerald-600">{negocio.puntosPorVisita}</div>
                        <div className="text-sm text-gray-500">Cupones por compra</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-purple-600">{negocio.puntosParaPremio}</div>
                        <div className="text-sm text-gray-500">Cupones para premio</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-amber-600">{negocio.premioDescripcion || 'Premio'}</div>
                        <div className="text-sm text-gray-500">Premio</div>
                      </div>
                    </div>
                    <Button onClick={() => setEditandoPremios(negocio)}>✏️ Editar Premios</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">🔒 Configuración de Seguridad</CardTitle></CardHeader>
              <CardContent>
                {editandoConfig ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Tiempo mínimo entre compras (segundos)</Label>
                        <Input type="number" value={editandoConfig.tiempoMinimoEntreVisitas} onChange={(e) => setEditandoConfig({...editandoConfig, tiempoMinimoEntreVisitas: parseInt(e.target.value) || 300})} />
                        <p className="text-xs text-gray-400 mt-1">Ej: 300 = 5 minutos</p>
                      </div>
                      <div>
                        <Label>Máximo de compras diarias por cliente</Label>
                        <Input type="number" value={editandoConfig.maxVisitasDiarias} onChange={(e) => setEditandoConfig({...editandoConfig, maxVisitasDiarias: parseInt(e.target.value) || 10})} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={guardarConfig}>💾 Guardar</Button>
                      <Button variant="outline" onClick={() => setEditandoConfig(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-red-600">{configuracion.tiempoMinimoEntreVisitas}s</div>
                        <div className="text-sm text-gray-500">Tiempo mínimo entre compras</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{configuracion.maxVisitasDiarias}</div>
                        <div className="text-sm text-gray-500">Máximo compras diarias</div>
                      </div>
                    </div>
                    <Button onClick={() => setEditandoConfig(configuracion)}>✏️ Editar Seguridad</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">📱 Notificaciones</CardTitle></CardHeader>
              <CardContent>
                {editandoNotificaciones ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-700 mb-2">📱 WhatsApp (CallMeBot)</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">API Key</Label>
                          <Input value={editandoNotificaciones.callmebotApikey || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, callmebotApikey: e.target.value})} placeholder="123456" />
                        </div>
                        <div>
                          <Label className="text-xs">Teléfono (con código país)</Label>
                          <Input value={editandoNotificaciones.callmebotPhone || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, callmebotPhone: e.target.value})} placeholder="584141234567" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Obtén tu API en: callmebot.com</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-700 mb-2">🤖 Telegram</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bot Token</Label>
                          <Input value={editandoNotificaciones.telegramBotToken || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, telegramBotToken: e.target.value})} placeholder="123456:ABC-DEF..." />
                        </div>
                        <div>
                          <Label className="text-xs">Chat ID</Label>
                          <Input value={editandoNotificaciones.telegramChatId || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, telegramChatId: e.target.value})} placeholder="-1001234567890" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Habla con @BotFather en Telegram para crear un bot</p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-700 mb-2">📧 Email del Negocio</h4>
                      <div>
                        <Label className="text-xs">Email para recibir notificaciones</Label>
                        <Input type="email" value={editandoNotificaciones.email || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, email: e.target.value})} placeholder="tu-negocio@gmail.com" />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Recibirás notificaciones cuando los clientes marquen compras</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={guardarNotificaciones}>💾 Guardar</Button>
                      <Button variant="outline" onClick={() => setEditandoNotificaciones(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg text-center ${negocio.callmebotApikey ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <div className="text-2xl">{negocio.callmebotApikey ? '✅' : '❌'}</div>
                        <div className="text-sm text-gray-500">WhatsApp</div>
                        <div className="text-xs text-gray-400">{negocio.callmebotPhone || 'No configurado'}</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center ${negocio.telegramBotToken ? 'bg-blue-50' : 'bg-gray-100'}`}>
                        <div className="text-2xl">{negocio.telegramBotToken ? '✅' : '❌'}</div>
                        <div className="text-sm text-gray-500">Telegram</div>
                        <div className="text-xs text-gray-400">{negocio.telegramChatId || 'No configurado'}</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center ${negocio.email ? 'bg-purple-50' : 'bg-gray-100'}`}>
                        <div className="text-2xl">{negocio.email ? '✅' : '❌'}</div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="text-xs text-gray-400">{negocio.email || 'No configurado'}</div>
                      </div>
                    </div>
                    <Button onClick={() => setEditandoNotificaciones(negocio)}>⚙️ Configurar Notificaciones</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Visitas */}
        {tab === 'visitas' && (
          <Card>
            <CardHeader><CardTitle className="text-lg">📋 Historial de Visitas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {visitas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay visitas</p>
                ) : (
                  visitas.map((v) => (
                    <div key={v.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">{v.cliente.nombre}</span>
                        <span className="text-gray-400 text-sm ml-2">{v.cliente.telefono}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold">+{v.puntosGanados}</span>
                        <span className="text-gray-400 text-xs block">{new Date(v.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cobranzas */}
        {tab === 'cobranzas' && (
          <div className="space-y-6">
            {/* Configuración de Recordatorios Automáticos */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  ⏰ Recordatorios Automáticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="recordatoriosAuto"
                      checked={configuracion?.recordatoriosAutomaticos ?? true}
                      onChange={async (e) => {
                        if (!configuracion) return
                        try {
                          const res = await fetch('/api/configuracion', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...configuracion,
                              recordatoriosAutomaticos: e.target.checked
                            })
                          })
                          if (res.ok) {
                            setMensaje({ tipo: 'exito', texto: 'Configuración actualizada' })
                            cargarDatos()
                          }
                        } catch {
                          setMensaje({ tipo: 'error', texto: 'Error al guardar' })
                        }
                      }}
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="recordatoriosAuto" className="cursor-pointer">
                      Activar recordatorios automáticos
                    </Label>
                  </div>
                  <div>
                    <Label className="text-sm">Días antes del vencimiento</Label>
                    <Input 
                      type="number" 
                      value={configuracion?.diasRecordatorio || 3}
                      onChange={async (e) => {
                        if (!configuracion) return
                        try {
                          const res = await fetch('/api/configuracion', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...configuracion,
                              diasRecordatorio: parseInt(e.target.value) || 3
                            })
                          })
                          if (res.ok) cargarDatos()
                        } catch {
                          console.error('Error')
                        }
                      }}
                      className="w-24"
                      min={1}
                      max={30}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enviar recordatorio X días antes</p>
                  </div>
                  <div>
                    <Label className="text-sm">Días después del vencimiento</Label>
                    <Input 
                      type="number" 
                      value={configuracion?.diasRecordatorioVencido || 7}
                      onChange={async (e) => {
                        if (!configuracion) return
                        try {
                          const res = await fetch('/api/configuracion', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              ...configuracion,
                              diasRecordatorioVencido: parseInt(e.target.value) || 7
                            })
                          })
                          if (res.ok) cargarDatos()
                        } catch {
                          console.error('Error')
                        }
                      }}
                      className="w-24"
                      min={1}
                      max={30}
                    />
                    <p className="text-xs text-gray-500 mt-1">Recordar cada X días si está vencido</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  💡 <strong>Configuración del Cron Job:</strong> Para activar los recordatorios automáticos, configura un cron job en <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">cron-job.org</code> que llame a:
                  <code className="block mt-2 bg-white dark:bg-slate-800 p-2 rounded text-xs">
                    GET /api/cron/cobranzas?secret=TU_SECRET
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">➕ Nueva Cobranza</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente</Label>
                    <select className="w-full h-10 px-3 rounded-lg border-2 border-gray-200" value={nuevaCobranza.clienteId} onChange={(e) => setNuevaCobranza({...nuevaCobranza, clienteId: e.target.value})}>
                      <option value="">Seleccionar...</option>
                      {clientes.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                    </select>
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input type="number" value={nuevaCobranza.monto} onChange={(e) => setNuevaCobranza({...nuevaCobranza, monto: e.target.value})} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Concepto</Label>
                    <Input value={nuevaCobranza.concepto} onChange={(e) => setNuevaCobranza({...nuevaCobranza, concepto: e.target.value})} placeholder="Concepto" />
                  </div>
                  <div>
                    <Label>Fecha Vencimiento</Label>
                    <Input type="date" value={nuevaCobranza.fechaVencimiento} onChange={(e) => setNuevaCobranza({...nuevaCobranza, fechaVencimiento: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <input 
                    type="checkbox" 
                    id="enviarNotificacion" 
                    checked={nuevaCobranza.enviarNotificacion} 
                    onChange={(e) => setNuevaCobranza({...nuevaCobranza, enviarNotificacion: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="enviarNotificacion" className="text-sm">📧 Enviar notificación por email al cliente</Label>
                </div>
                <Button onClick={crearCobranza} className="mt-4">Crear Cobranza</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">💰 Cobranzas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cobranzas.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay cobranzas</p>
                  ) : (
                    cobranzas.map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{c.cliente.nombre}</div>
                          <div className="text-sm text-gray-500">{c.concepto}</div>
                          <div className={`text-xs mt-1 px-2 py-0.5 rounded inline-block ${
                            c.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' : 
                            c.estado === 'pagado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {c.estado}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">${c.monto.toFixed(2)}</div>
                          <div className="flex gap-2 mt-2">
                            {c.estado === 'pendiente' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => enviarRecordatorio(c.id)}>📧</Button>
                                <Button size="sm" onClick={() => marcarPagada(c.id)}>✓ Pagado</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Marketing */}
        {tab === 'marketing' && (
          <div className="space-y-6">
            {/* Nueva Campaña */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📣 Nueva Campaña de Marketing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Campaña</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" 
                      value={nuevoMarketing.tipo} 
                      onChange={(e) => setNuevoMarketing({...nuevoMarketing, tipo: e.target.value})}
                    >
                      <option value="promocion">📢 Promoción</option>
                      <option value="recordatorio">🔔 Recordatorio</option>
                      <option value="oferta">🏷️ Oferta Especial</option>
                      <option value="bienvenida">👋 Bienvenida</option>
                      <option value="aniversario">🎂 Aniversario</option>
                    </select>
                  </div>
                  <div>
                    <Label>Destinatarios</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" 
                      value={nuevoMarketing.destinatarios} 
                      onChange={(e) => setNuevoMarketing({...nuevoMarketing, destinatarios: e.target.value})}
                    >
                      <option value="todos">👥 Todos los clientes</option>
                      <option value="inactivos">😴 Clientes inactivos</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Título del Mensaje</Label>
                    <Input 
                      value={nuevoMarketing.titulo} 
                      onChange={(e) => setNuevoMarketing({...nuevoMarketing, titulo: e.target.value})} 
                      placeholder="Ej: ¡Oferta especial de fin de semana!" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Mensaje</Label>
                    <textarea 
                      className="w-full h-32 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800 resize-none" 
                      value={nuevoMarketing.mensaje} 
                      onChange={(e) => setNuevoMarketing({...nuevoMarketing, mensaje: e.target.value})} 
                      placeholder="Escribe tu mensaje aquí. Puedes usar saltos de línea." 
                    />
                  </div>
                  
                  {/* Scheduling Section */}
                  <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                      📅 Programación de Envío
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Fecha y Hora de Envío</Label>
                        <Input 
                          type="datetime-local" 
                          value={nuevoMarketing.fechaProgramada} 
                          onChange={(e) => setNuevoMarketing({...nuevoMarketing, fechaProgramada: e.target.value})} 
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Deja vacío para enviar inmediatamente</p>
                      </div>
                      <div>
                        <Label className="text-sm">Repetir Automáticamente</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" 
                          value={nuevoMarketing.repetir || ''} 
                          onChange={(e) => setNuevoMarketing({...nuevoMarketing, repetir: e.target.value})}
                        >
                          <option value="">No repetir (envío único)</option>
                          <option value="diario">🔁 Diario</option>
                          <option value="semanal">📅 Semanal</option>
                          <option value="mensual">📆 Mensual</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button onClick={crearCampana} className="flex-1">
                    {nuevoMarketing.fechaProgramada ? '📅 Programar Campaña' : '📤 Enviar Ahora'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Campaigns Summary */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketing.filter(m => m.estado === 'programado').length}</div>
                  <div className="text-sm opacity-90">Programadas</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketing.filter(m => m.estado === 'enviado').length}</div>
                  <div className="text-sm opacity-90">Enviadas</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketing.reduce((sum, m) => sum + (m.enviados || 0), 0)}</div>
                  <div className="text-sm opacity-90">Total Emails Enviados</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Scheduled Campaigns */}
            {marketing.filter(m => m.estado === 'programado').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📅 Campañas Programadas
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                      {marketing.filter(m => m.estado === 'programado').length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {marketing.filter(m => m.estado === 'programado').map((m) => (
                      <div key={m.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-blue-800 dark:text-blue-300">{m.titulo}</span>
                            <div className="text-sm text-gray-500 mt-1">
                              📅 {m.fechaProgramada ? new Date(m.fechaProgramada).toLocaleString('es-ES', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Sin fecha'}
                            </div>
                            {m.repetir && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                🔁 Se repite: {m.repetir}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              Para: {m.destinatarios === 'todos' ? 'Todos los clientes' : 'Clientes inactivos'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/marketing', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: m.id, accion: 'enviar-ahora' })
                                  })
                                  const data = await res.json()
                                  if (res.ok) {
                                    setMensaje({ tipo: 'exito', texto: `Campaña enviada a ${data.enviados} clientes` })
                                    cargarMarketing()
                                  } else {
                                    setMensaje({ tipo: 'error', texto: data.error || 'Error al enviar' })
                                  }
                                } catch {
                                  setMensaje({ tipo: 'error', texto: 'Error al enviar campaña' })
                                }
                              }}
                            >
                              📤 Enviar Ahora
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                if (!confirm('¿Cancelar esta campaña programada?')) return
                                try {
                                  const res = await fetch('/api/marketing', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: m.id, accion: 'cancelar' })
                                  })
                                  const data = await res.json()
                                  if (res.ok) {
                                    setMensaje({ tipo: 'exito', texto: 'Campaña cancelada' })
                                    cargarMarketing()
                                  }
                                } catch {
                                  setMensaje({ tipo: 'error', texto: 'Error al cancelar' })
                                }
                              }}
                            >
                              ❌ Cancelar
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{m.mensaje}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Sent Campaigns History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  📋 Historial de Campañas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {marketing.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-gray-500">No hay campañas creadas</p>
                      <p className="text-sm text-gray-400 mt-1">Crea tu primera campaña arriba</p>
                    </div>
                  ) : (
                    marketing.map((m) => (
                      <div key={m.id} className={`p-4 rounded-lg border ${
                        m.estado === 'enviado' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                        m.estado === 'cancelado' ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60' :
                        m.estado === 'programado' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                        'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{m.titulo}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                m.estado === 'enviado' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' :
                                m.estado === 'cancelado' ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                                m.estado === 'programado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-300'
                              }`}>
                                {m.estado === 'enviado' ? '✅ Enviado' :
                                 m.estado === 'cancelado' ? '❌ Cancelado' :
                                 m.estado === 'programado' ? '📅 Programado' :
                                 '⏳ Pendiente'}
                              </span>
                              {m.repetir && m.estado === 'enviado' && (
                                <span className="text-xs text-purple-600 dark:text-purple-400">
                                  🔁 {m.repetir}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{m.mensaje}</p>
                            <div className="flex gap-4 text-xs text-gray-400 mt-2">
                              <span>👥 {m.destinatarios === 'todos' ? 'Todos' : 'Inactivos'}</span>
                              {m.estado === 'enviado' && (
                                <>
                                  <span className="text-green-600 dark:text-green-400">✉️ {m.enviados} enviados</span>
                                  {m.errores > 0 && (
                                    <span className="text-red-600 dark:text-red-400">⚠️ {m.errores} errores</span>
                                  )}
                                </>
                              )}
                              {m.fechaProgramada && m.estado === 'programado' && (
                                <span>📅 {new Date(m.fechaProgramada).toLocaleString('es-ES')}</span>
                              )}
                              <span>🕐 {new Date(m.createdAt).toLocaleDateString('es-ES')}</span>
                            </div>
                          </div>
                          {m.estado === 'programado' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={async () => {
                                if (!confirm('¿Eliminar esta campaña programada?')) return
                                try {
                                  const res = await fetch(`/api/marketing?id=${m.id}`, { method: 'DELETE' })
                                  if (res.ok) {
                                    setMensaje({ tipo: 'exito', texto: 'Campaña eliminada' })
                                    cargarMarketing()
                                  }
                                } catch {
                                  setMensaje({ tipo: 'error', texto: 'Error al eliminar' })
                                }
                              }}
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Cron Setup Info */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
              <CardContent className="p-4">
                <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                  ⚙️ Configuración de Envío Automático
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Para que las campañas programadas se envíen automáticamente, configura un cron job:
                </p>
                <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                  <div className="text-gray-500"># Cada 5 minutos</div>
                  <div>*/5 * * * * curl &quot;{typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com'}/api/cron/marketing?secret=TU_SECRET&quot;</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 El secreto por defecto es: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">fideliqr-cron-secret-2024</code>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-slate-800 border-t py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          FideliQR V1 - Sistema de Fidelización | Panel de Administración
        </div>
      </footer>
    </div>
  )
}
// Deploy fix: 1774020971
// Deploy: 1774024080
