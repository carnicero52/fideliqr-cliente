'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'

// Types
interface Cliente {
  id: string
  codigoQR: string
  telefono: string
  nombre: string
  email: string | null
  puntos: number
  totalVisitas: number
  premiosCanjeados: number
  activo: boolean
  notas: string | null
  qrEnviado: boolean
  createdAt: string
  _count?: { visitas: number; canjes: number; cobranzas: number }
}

interface Visita {
  id: string
  clienteId: string
  puntosGanados: number
  createdAt: string
  cliente: { nombre: string; telefono: string; codigoQR: string }
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

type Tab = 'dashboard' | 'escanear' | 'clientes' | 'visitas' | 'cobranzas' | 'marketing' | 'configuracion' | 'usuarios'

export default function AdminPanel() {
  // Theme
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)
  
  // State
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [[mmarketingItems, setMarketingItems] = useState<Marketing[]>([])
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [[mmensajeTexto, setMensajeTexto] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  // Scanner inline
  const [codigoManual, setCodigoManual] = useState('')
  const [scannerActivo, setScannerActivo] = useState(false)
  const [scannerCargando, setScannerCargando] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Funciones del escáner
  const iniciarScanner = async () => {
    setScannerCargando(true)
    setScannerError(null)
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-inline')
      scannerRef.current = html5QrCode

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setScannerError('No se encontró cámara')
        setScannerCargando(false)
        return
      }

      const backCamera = cameras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('rear')
      )

      await html5QrCode.start(
        backCamera?.id || cameras[0].id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          let code = text
          if (text.includes('/cliente/')) {
            code = text.split('/cliente/')[1].split(/[?#/]/)[0]
          }
          if (navigator.vibrate) navigator.vibrate(200)
          registrarVisita(code.toUpperCase())
        },
        () => {}
      )
      setScannerActivo(true)
      setScannerCargando(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de cámara'
      setScannerError(msg)
      setScannerCargando(false)
    }
  }

  const detenerScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (e) {
        console.error(e)
      }
    }
    setScannerActivo(false)
  }

  // Form states
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', email: '', telefono: '', notas: '', enviarQR: true })
  const [nuevaCobranza, setNuevaCobranza] = useState({ clienteId: '', concepto: '', monto: '', fechaVencimiento: '', enviarNotificacion: false })
  const [nuevoMarketing, setNuevoMarketing] = useState({ tipo: 'promocion', titulo: '', mensaje: '', destinatarios: 'todos', fechaProgramada: '', repetir: '' })

  const [nuevoUsuario, setNuevoUsuario] = useState({ email: '', password: '', nombre: '', rol: 'admin' })
  const [editandoCliente, setEditandoCliente] = useState<Cliente | null>(null)
  const [editandoNegocio, setEditandoNegocio] = useState<Negocio | null>(null)
  const [editandoPremios, setEditandoPremios] = useState<Negocio | null>(null)
  const [editandoConfig, setEditandoConfig] = useState<Configuracion | null>(null)
  const [editandoNotificaciones, setEditandoNotificaciones] = useState<Negocio | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteQRSeleccionado, setClienteQRSeleccionado] = useState<Cliente | null>(null)

  // Hydration fix for theme
  useEffect(() => {
    setIsMounted(true)
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
      const [estRes, cliRes, negRes, cfgRes] = await Promise.all([
        fetch('/api/estadisticas'),
        fetch('/api/clientes'),
        fetch('/api/negocio'),
        fetch('/api/configuracion')
      ])
      
      const [est, cli, neg, cfg] = await Promise.all([
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
    try {
      const res = await fetch('/api/marketing')
      const data = await res.json()
      setMarketingItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error cargando marketing:', error)
      setMarketingItems([])
    }
  }
  // Cambiar tab
  const cambiarTab = (nuevoTab: Tab) => {
    setTab(nuevoTab)
    setMensajeTexto(null)
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

  // Registrar visita por código QR (escaneado por el negocio)
  const registrarVisita = async (codigoQR: string) => {
    if (!codigoQR.trim()) return

    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoQR: codigoQR.trim().toUpperCase(),
          escaneadoPor: usuarioActual?.id
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setMensajeTexto({
          tipo: 'exito',
          texto: `✅ ${data.cliente.nombre}: +${data.puntosGanados} puntos. Total: ${data.cliente.puntos}`
        })
        setCodigoManual('')
        cargarDatos()
      } else if (data.tiempoRestante) {
        setMensajeTexto({
          tipo: 'error',
          texto: `⏳ Espera ${data.tiempoRestante} segundos (${data.cliente?.nombre})`
        })
      } else {
        setMensajeTexto({ tipo: 'error', texto: data.error || 'Error al registrar visita' })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error de conexión' })
    }
  }

  // Reenviar QR al cliente
  const reenviarQR = async (clienteId: string) => {
    try {
      const res = await fetch('/api/clientes/reenviar-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId })
      })
      if (res.ok) {
        setMensajeTexto({ tipo: 'exito', texto: 'QR reenviado por email' })
        cargarDatos()
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al reenviar QR' })
    }
  }

  // Crear cliente
  const crearCliente = async () => {
    if (!nuevoCliente.nombre || !nuevoCliente.email) {
      setMensajeTexto({ tipo: 'error', texto: 'Nombre y email son obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente)
      })
      if (res.ok) {
        setMensajeTexto({ tipo: 'exito', texto: 'Cliente creado exitosamente' })
        setNuevoCliente({ telefono: '', nombre: '', email: '', notas: '', enviarQR: true })
        cargarDatos()
      } else {
        const data = await res.json()
        setMensajeTexto({ tipo: 'error', texto: data.error || 'Error al crear cliente' })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error de conexión' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Cliente actualizado' })
        setEditandoCliente(null)
        cargarDatos()
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al actualizar' })
    }
  }

  // Eliminar cliente
  const eliminarCliente = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return
    try {
      await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
      setMensajeTexto({ tipo: 'exito', texto: 'Cliente eliminado' })
      cargarDatos()
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al eliminar' })
    }
  }

  // Crear cobranza
  const crearCobranza = async () => {
    if (!nuevaCobranza.clienteId || !nuevaCobranza.monto || !nuevaCobranza.concepto) {
      setMensajeTexto({ tipo: 'error', texto: 'Completa todos los campos obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/cobranzas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevaCobranza, monto: parseFloat(nuevaCobranza.monto) })
      })
      if (res.ok) {
        setMensajeTexto({ tipo: 'exito', texto: 'Cobranza creada' + (nuevaCobranza.enviarNotificacion ? ' y notificación enviada' : '') })
        setNuevaCobranza({ clienteId: '', concepto: '', monto: '', fechaVencimiento: '', enviarNotificacion: false })
        cargarCobranzas()
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al crear cobranza' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Recordatorio enviado por email' })
      } else {
        setMensajeTexto({ tipo: 'error', texto: data.error || 'Error al enviar recordatorio' })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al enviar recordatorio' })
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
      setMensajeTexto({ tipo: 'exito', texto: 'Cobranza marcada como pagada' })
      cargarCobranzas()
      cargarDatos()
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al actualizar' })
    }
  }

  // Crear campaña
  const crearCampana = async () => {
    if (!nuevoMarketing.titulo || !nuevoMarketing.mensaje) {
      setMensajeTexto({ tipo: 'error', texto: 'Título y mensajeTexto son obligatorios' })
      return
    }
    try {
      const esProgramado = nuevoMarketing.fechaProgramada && new Date(nuevoMarketing.fechaProgramada) > new Date()
      setMensajeTexto({ tipo: 'exito', texto: esProgramado ? 'Programando campaña...' : 'Enviando campaña...' })
      const res = await fetch('/api/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMarketing)
      })
      const data = await res.json()
      if (res.ok) {
        if (data.programado) {
          setMensajeTexto({ tipo: 'exito', texto: `Campaña programada para ${new Date(nuevoMarketing.fechaProgramada).toLocaleString('es-ES')}` })
        } else {
          setMensajeTexto({ tipo: 'exito', texto: `Campaña enviada a ${data.enviados} clientes` + (data.errores > 0 ? ` (${data.errores} errores)` : '') })
        }
        setNuevoMarketing({ tipo: 'promocion', titulo: '', mensaje: '', destinatarios: 'todos', fechaProgramada: '', repetir: '' })
        cargarMarketing()
      } else {
        setMensajeTexto({ tipo: 'error', texto: data.error || 'Error al crear campaña' })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al crear campaña' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Configuración guardada' })
        setNegocio(editandoNegocio)
        setEditandoNegocio(null)
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al guardar' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Configuración guardada' })
        setConfiguracion(editandoConfig)
        setEditandoConfig(null)
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al guardar configuración' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Notificaciones guardadas' })
        setNegocio(editandoNotificaciones)
        setEditandoNotificaciones(null)
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al guardar notificaciones' })
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
        setMensajeTexto({ tipo: 'exito', texto: 'Información guardada' })
        setNegocio(editandoNegocio)
        setEditandoNegocio(null)
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al guardar' })
    }
  }

  // Crear usuario
  const crearUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password || !nuevoUsuario.nombre) {
      setMensajeTexto({ tipo: 'error', texto: 'Todos los campos son obligatorios' })
      return
    }
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoUsuario)
      })
      if (res.ok) {
        setMensajeTexto({ tipo: 'exito', texto: 'Usuario creado exitosamente' })
        setNuevoUsuario({ email: '', password: '', nombre: '', rol: 'admin' })
        cargarUsuarios()
      } else {
        const data = await res.json()
        setMensajeTexto({ tipo: 'error', texto: data.error || 'Error al crear usuario' })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al crear usuario' })
    }
  }

  // Eliminar usuario
  const eliminarUsuario = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await fetch(`/api/usuarios?id=${id}`, { method: 'DELETE' })
      setMensajeTexto({ tipo: 'exito', texto: 'Usuario eliminado' })
      cargarUsuarios()
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al eliminar usuario' })
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
      setMensajeTexto({ tipo: 'error', texto: 'Error al agregar puntos' })
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
        setMensajeTexto({ tipo: 'exito', texto: `Premio canjeado. Puntos restantes: ${data.puntosRestantes}` })
        cargarDatos()
      } else {
        setMensajeTexto({ tipo: 'error', texto: data.error })
      }
    } catch {
      setMensajeTexto({ tipo: 'error', texto: 'Error al canjear' })
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Verificando autenticación...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-muted-foreground">Cargando panel...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                {isMounted && resolvedTheme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
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
      <nav className="bg-card border-b shadow-sm sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'escanear', label: '📷 Escanear QR' },
              { id: 'clientes', label: '👥 Clientes' },
              { id: 'visitas', label: '📋 Visitas' },
              { id: 'cobranzas', label: '💰 Cobranzas' },
              { id: 'marketing', label: '📣 Marketing' },
              { id: 'configuracion', label: '⚙️ Config' },
              ...(usuarioActual?.rol === 'superadmin' ? [{ id: 'usuarios', label: '👤 Usuarios' }] : [])
            ].map(t => (
              <button
                key={t.id}
                onClick={() => cambiarTab(t.id as Tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
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
            mensajeTexto.tipo === 'exito' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
          }`}>
            {mensajeTexto.texto}
          </div>
        )}

        {/* Dashboard */}
        {tab === 'dashboard' && estadisticas && (
          <div className="space-y-6">
            {/* HEADER DEL NEGOCIO */}
            <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {negocio?.logo ? (
                    <img
                      src={negocio.logo}
                      alt="Logo"
                      className="w-16 h-16 rounded-xl object-cover bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
                      🏪
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold">{negocio?.nombre || 'Mi Negocio'}</h1>
                    {negocio?.descripcion && (
                      <p className="text-white/80 text-sm">{negocio.descripcion}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ENCABEZADO */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">📊 Panel de Control</h2>
              <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                    <div className="text-sm text-muted-foreground">Cupones en circulación</div>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{estadisticas.premiosCanjeados}</div>
                    <div className="text-sm text-muted-foreground">Premios canjeados</div>
                  </div>
                  <div className="p-4 bg-pink-50 dark:bg-pink-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{estadisticas.premiosMes}</div>
                    <div className="text-sm text-muted-foreground">Canjeados este mes</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{negocio?.puntosParaPremio || 10}</div>
                    <div className="text-sm text-muted-foreground">Cupones por premio</div>
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
                    <div className="text-xs text-muted-foreground mb-1">Pendientes</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">${estadisticas.montoPendiente.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{estadisticas.cobranzasPendientes} cobranzas</div>
                    {estadisticas.cobranzasVencidas > 0 && (
                      <div className="text-xs text-red-500 dark:text-red-400 mt-1">⚠️ {estadisticas.cobranzasVencidas} vencidas (${estadisticas.montoVencido.toFixed(2)})</div>
                    )}
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Pagadas</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">${estadisticas.montoPagado.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{estadisticas.cobranzasPagadas} cobranzas</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Total Gestión</div>
                    <div className="text-2xl font-bold text-foreground">${(estadisticas.montoPendiente + estadisticas.montoPagado).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{estadisticas.cobranzasPendientes + estadisticas.cobranzasPagadas} registros</div>
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
                    <div className="text-sm text-muted-foreground">Campañas enviadas</div>
                  </div>
                  <div className="p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{estadisticas.emailsEnviados}</div>
                    <div className="text-sm text-muted-foreground">Emails de marketing</div>
                  </div>
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{estadisticas.notificacionesEnviadas}</div>
                    <div className="text-sm text-muted-foreground">Notificaciones totales</div>
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
                    <p className="text-muted-foreground text-center py-4">No hay compras registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {estadisticas.ultimasVisitas.map((v) => (
                        <div key={v.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{v.cliente?.nombre || 'Cliente'}</div>
                            <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString('es-ES')}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">+{v.puntosGanados}</div>
                            <div className="text-xs text-muted-foreground">cupón</div>
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
                    <p className="text-muted-foreground text-center py-4">No hay clientes registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {estadisticas.topClientes.map((c, i) => (
                        <div key={c.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-medium">{c.nombre}</div>
                              <div className="text-xs text-muted-foreground">{c.totalVisitas} compras</div>
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

        {/* Escanear QR */}
        {tab === 'escanear' && (
          <div className="max-w-lg mx-auto space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-center">📷 Escanear QR del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg text-center">
                  <p className="text-emerald-700 dark:text-emerald-300">
                    Escanea el código QR personal del cliente para registrar su visita
                  </p>
                </div>

                {/* Escáner de cámara inline */}
                {scannerError && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center text-sm">
                    {scannerError}
                  </div>
                )}

                <div
                  id="qr-reader-inline"
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    minHeight: scannerActivo ? '300px' : '0',
                    margin: '0 auto'
                  }}
                />

                {scannerCargando && (
                  <div className="text-center py-6 text-muted-foreground">
                    📷 Iniciando cámara...
                  </div>
                )}

                {!scannerActivo && !scannerCargando && (
                  <button
                    onClick={iniciarScanner}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition"
                  >
                    📷 Abrir Escáner QR
                  </button>
                )}

                {scannerActivo && (
                  <button
                    onClick={detenerScanner}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition"
                  >
                    ⏹️ Cerrar Escáner
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">⌨️ Ingreso Manual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 text-center">
                  Si el QR no se puede escanear, ingresa el código manualmente:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
                    placeholder="Ej: ABC12345"
                    className="text-center text-xl font-mono"
                    maxLength={8}
                  />
                  <Button onClick={() => registrarVisita(codigoManual)} size="lg" className="px-6">
                    ✓ Registrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👥 Clientes Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {clientes.slice(0, 10).map(c => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center p-2 bg-muted rounded cursor-pointer hover:bg-accent"
                      onClick={() => registrarVisita(c.codigoQR)}
                    >
                      <div>
                        <span className="font-medium">{c.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">{c.codigoQR}</span>
                      </div>
                      <span className="text-emerald-600 font-bold">{c.puntos} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                <div className="flex items-center gap-4 mt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={nuevoCliente.enviarQR}
                      onChange={(e) => setNuevoCliente({...nuevoCliente, enviarQR: e.target.checked})}
                      className="w-4 h-4"
                    />
                    Enviar QR por email
                  </label>
                  <Button onClick={crearCliente}>Crear Cliente</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">👥 Clientes Registrados ({clientes.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="🔍 Buscar por nombre, email o código QR..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {clientes
                    .filter(c => {
                      if (!busquedaCliente) return true
                      const termino = busquedaCliente.toLowerCase()
                      return c.nombre.toLowerCase().includes(termino) ||
                             c.email?.toLowerCase().includes(termino) ||
                             c.codigoQR?.toLowerCase().includes(termino)
                    })
                    .map((c) => (
                    <div key={c.id} className="p-4 bg-muted rounded-lg">
                      {editandoCliente?.id === c.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={editandoCliente.nombre || ''} onChange={(e) => setEditandoCliente({...editandoCliente, nombre: e.target.value})} />
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
                            <div className="text-sm text-muted-foreground">{c.email}</div>
                            <div className="text-xs text-emerald-600 font-mono mt-1">QR: {c.codigoQR} {c.qrEnviado ? '✅' : '⚠️'}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-emerald-600">{c.puntos} pts</div>
                          </div>
                        </div>
                      )}
                      {editandoCliente?.id !== c.id && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => registrarVisita(c.codigoQR)}>🛒 Compra</Button>
                          <Button size="sm" variant="outline" onClick={() => setClienteQRSeleccionado(c)}>📱 QR</Button>
                          {!c.qrEnviado && (
                            <Button size="sm" variant="outline" onClick={() => reenviarQR(c.id)}>📧 Enviar QR</Button>
                          )}
                          {c.puntos >= (negocio?.puntosParaPremio || 10) && (
                            <Button size="sm" onClick={() => canjearPremio(c.id)}>🎁 Canjear</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditandoCliente(c)}>✏️</Button>
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
                    <div key={u.id} className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{u.nombre}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                        <div className="text-xs text-muted-foreground">Rol: {u.rol === 'superadmin' ? '⭐ Super Admin' : 'Admin'}</div>
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
                    <div className="flex flex-col items-center gap-4 p-4 bg-muted rounded-lg">
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
                        <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-card">
                          <span className="text-muted-foreground text-sm text-center">Sin logo</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              setMensajeTexto({ tipo: 'error', texto: 'La imagen debe ser menor a 5MB' })
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
                      <p className="text-xs text-muted-foreground">PNG, JPG o SVG. Máximo 5MB</p>
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
                          <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
                            <span className="text-muted-foreground text-xs text-center">Sin logo</span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">Logo</span>
                      </div>
                      
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Nombre</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{negocio.nombre}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Descripción</p>
                          <p className="text-lg text-gray-700 dark:text-gray-300">{negocio.descripcion || 'Sin descripción'}</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Teléfono</p>
                          <p className="text-lg text-blue-700 dark:text-blue-400">{negocio.telefono || 'No configurado'}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-lg text-purple-700 dark:text-purple-400">{negocio.email || 'No configurado'}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Dirección</p>
                          <p className="text-lg text-gray-700 dark:text-gray-300">{negocio.direccion || 'No configurada'}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
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
                            setMensajeTexto({ tipo: 'exito', texto: 'Premios guardados' })
                            setNegocio(editandoPremios)
                            setEditandoPremios(null)
                          }
                        } catch {
                          setMensajeTexto({ tipo: 'error', texto: 'Error al guardar' })
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
                        <div className="text-sm text-muted-foreground">Cupones por compra</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-purple-600">{negocio.puntosParaPremio}</div>
                        <div className="text-sm text-muted-foreground">Cupones para premio</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg text-center">
                        <div className="text-xl font-bold text-amber-600">{negocio.premioDescripcion || 'Premio'}</div>
                        <div className="text-sm text-muted-foreground">Premio</div>
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
                        <p className="text-xs text-muted-foreground mt-1">Ej: 300 = 5 minutos</p>
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
                        <div className="text-sm text-muted-foreground">Tiempo mínimo entre compras</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-blue-600">{configuracion.maxVisitasDiarias}</div>
                        <div className="text-sm text-muted-foreground">Máximo compras diarias</div>
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
                      <p className="text-xs text-muted-foreground mt-2">Obtén tu API en: callmebot.com</p>
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
                      <p className="text-xs text-muted-foreground mt-2">Habla con @BotFather en Telegram para crear un bot</p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-700 mb-2">📧 Email del Negocio</h4>
                      <div>
                        <Label className="text-xs">Email para recibir notificaciones</Label>
                        <Input type="email" value={editandoNotificaciones.email || ''} onChange={(e) => setEditandoNotificaciones({...editandoNotificaciones, email: e.target.value})} placeholder="tu-negocio@gmail.com" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Recibirás notificaciones cuando los clientes marquen compras</p>
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
                        <div className="text-sm text-muted-foreground">WhatsApp</div>
                        <div className="text-xs text-muted-foreground">{negocio.callmebotPhone || 'No configurado'}</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center ${negocio.telegramBotToken ? 'bg-blue-50' : 'bg-gray-100'}`}>
                        <div className="text-2xl">{negocio.telegramBotToken ? '✅' : '❌'}</div>
                        <div className="text-sm text-muted-foreground">Telegram</div>
                        <div className="text-xs text-muted-foreground">{negocio.telegramChatId || 'No configurado'}</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center ${negocio.email ? 'bg-purple-50' : 'bg-gray-100'}`}>
                        <div className="text-2xl">{negocio.email ? '✅' : '❌'}</div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <div className="text-xs text-muted-foreground">{negocio.email || 'No configurado'}</div>
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
                  <p className="text-muted-foreground text-center py-4">No hay visitas</p>
                ) : (
                  visitas.map((v) => (
                    <div key={v.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <span className="font-medium">{v.cliente.nombre}</span>
                        <span className="text-muted-foreground text-sm ml-2">{v.cliente.telefono}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-bold">+{v.puntosGanados}</span>
                        <span className="text-muted-foreground text-xs block">{new Date(v.createdAt).toLocaleString()}</span>
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
                    <p className="text-muted-foreground text-center py-4">No hay cobranzas</p>
                  ) : (
                    cobranzas.map((c) => (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium">{c.cliente.nombre}</div>
                          <div className="text-sm text-muted-foreground">{c.concepto}</div>
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
            <Card>
              <CardHeader><CardTitle className="text-lg">📣 Nueva Campaña</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <select className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" value={nuevoMarketing.tipo} onChange={(e) => setNuevoMarketing({...nuevoMarketing, tipo: e.target.value})}>
                      <option value="promocion">📢 Promoción</option>
                      <option value="recordatorio">🔔 Recordatorio</option>
                      <option value="oferta">🏷️ Oferta Especial</option>
                    </select>
                  </div>
                  <div>
                    <Label>Destinatarios</Label>
                    <select className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" value={nuevoMarketing.destinatarios} onChange={(e) => setNuevoMarketing({...nuevoMarketing, destinatarios: e.target.value})}>
                      <option value="todos">👥 Todos los clientes</option>
                      <option value="inactivos">😴 Clientes inactivos</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Título</Label>
                    <Input value={nuevoMarketing.titulo} onChange={(e) => setNuevoMarketing({...nuevoMarketing, titulo: e.target.value})} placeholder="Ej: ¡Oferta especial de fin de semana!" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Mensaje</Label>
                    <textarea className="w-full h-24 px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800" value={nuevoMarketing.mensaje} onChange={(e) => setNuevoMarketing({...nuevoMarketing, mensaje: e.target.value})} placeholder="Escribe tu mensajeTexto aquí..." />
                  </div>

                  {/* Sección de Programación */}
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

            {/* Resumen de Campañas */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketingItems.filter(m => m.estado === 'programado').length}</div>
                  <div className="text-sm opacity-90">Programadas</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketingItems.filter(m => m.estado === 'enviado').length}</div>
                  <div className="text-sm opacity-90">Enviadas</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">{marketingItems.reduce((sum, m) => sum + (m.enviados || 0), 0)}</div>
                  <div className="text-sm opacity-90">Total Emails</div>
                </CardContent>
              </Card>
            </div>

            {/* Campañas Programadas */}
            {marketingItems.filter(m => m.estado === 'programado').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    📅 Campañas Programadas
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                      {marketingItems.filter(m => m.estado === 'programado').length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {marketingItems.filter(m => m.estado === 'programado').map((m) => (
                      <div key={m.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-blue-800 dark:text-blue-300">{m.titulo}</span>
                            <div className="text-sm text-gray-500 mt-1">
                              📅 {m.fechaProgramada ? new Date(m.fechaProgramada).toLocaleString('es-ES') : 'Sin fecha'}
                            </div>
                            {m.repetir && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                🔁 Se repite: {m.repetir}
                              </div>
                            )}
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
                                  if (res.ok) {
                                    setMensajeTexto({ tipo: 'exito', texto: 'Campaña enviada' })
                                    cargarMarketing()
                                  }
                                } catch {
                                  setMensajeTexto({ tipo: 'error', texto: 'Error al enviar' })
                                }
                              }}
                            >
                              📤 Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!confirm('¿Cancelar esta campaña?')) return
                                try {
                                  const res = await fetch('/api/marketing', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: m.id, accion: 'cancelar' })
                                  })
                                  if (res.ok) {
                                    setMensajeTexto({ tipo: 'exito', texto: 'Campaña cancelada' })
                                    cargarMarketing()
                                  }
                                } catch {
                                  setMensajeTexto({ tipo: 'error', texto: 'Error al cancelar' })
                                }
                              }}
                            >
                              ❌
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

            {/* Historial de Campañas */}
            <Card>
              <CardHeader><CardTitle className="text-lg">📋 Historial de Campañas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {marketingItems.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-gray-500">No hay campañas creadas</p>
                    </div>
                  ) : (
                   marketingItems.map((m) => (
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
                            </div>
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
      </main>

      {/* Modal de QR del Cliente */}
      {clienteQRSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setClienteQRSeleccionado(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">{clienteQRSeleccionado.nombre}</h3>
              <p className="text-sm text-muted-foreground mb-4">{clienteQRSeleccionado.email}</p>

              <div className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeSVG
                  id="qr-cliente"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/cliente/${clienteQRSeleccionado.codigoQR}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg mb-4">
                <span className="font-mono text-lg font-bold text-emerald-600">{clienteQRSeleccionado.codigoQR}</span>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => {
                    const svg = document.getElementById('qr-cliente')
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg)
                      const canvas = document.createElement('canvas')
                      const ctx = canvas.getContext('2d')
                      const img = new Image()
                      img.onload = () => {
                        canvas.width = img.width
                        canvas.height = img.height
                        ctx?.fillRect(0, 0, canvas.width, canvas.height)
                        ctx?.drawImage(img, 0, 0)
                        const a = document.createElement('a')
                        a.download = `qr-${clienteQRSeleccionado.codigoQR}.png`
                        a.href = canvas.toDataURL('image/png')
                        a.click()
                      }
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  📥 Descargar PNG
                </Button>
                <Button variant="outline" onClick={() => setClienteQRSeleccionado(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-card border-t py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-muted-foreground text-sm">
          FideliQR-cliente - Sistema de Fidelización | Panel de Administración
        </div>
      </footer>
    </div>
  )
}
// v2.2
// Forzar deploy Fri Mar 20 04:58:06 UTC 2026
// Build fix: Fri Mar 20 15:34:13 UTC 2026
// Deploy fix: 1774020962
// Force deploy: Fri Mar 20 22:18:48 UTC 2026
