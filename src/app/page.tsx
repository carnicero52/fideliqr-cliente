'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Negocio {
  nombre: string
  descripcion: string | null
  logo: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  whatsapp: string | null
  puntosPorVisita: number
  puntosParaPremio: number
  premioDescripcion: string | null
}

interface Cliente {
  id: string
  nombre: string
  email: string | null
  puntos: number
  totalVisitas: number
}

interface Progreso {
  puntosActuales: number
  puntosParaPremio: number
  puntosFaltantes: number
  porcentaje: number
  premiosDisponibles: number
}

interface DatosPublicos {
  negocio: Negocio
  cliente: Cliente | null
  progreso: Progreso | null
}

export default function PanelPublico() {
  const [datos, setDatos] = useState<DatosPublicos | null>(null)
  const [clienteId, setClienteId] = useState<string>('')
  const [identificador, setIdentificador] = useState('')
  const [loading, setLoading] = useState(true)
  const [registrando, setRegistrando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null)

  const cargarDatos = useCallback(async () => {
    try {
      const url = clienteId ? `/api/publico?clienteId=${clienteId}` : '/api/publico'
      const res = await fetch(url)
      const data = await res.json()
      setDatos(data)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(() => {
      if (clienteId) cargarDatos()
    }, 10000)
    return () => clearInterval(interval)
  }, [clienteId, cargarDatos])

  useEffect(() => {
    if (tiempoRestante && tiempoRestante > 0) {
      const timer = setTimeout(() => setTiempoRestante(tiempoRestante - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [tiempoRestante])

  const buscarCliente = async () => {
    if (!identificador.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa tu email registrado' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clientes')
      const clientes = await res.json()
      
      const termino = identificador.trim().toLowerCase()
      const cliente = clientes.find((c: { email: string | null; telefono: string }) => {
        return c.email?.toLowerCase() === termino || c.telefono === identificador.trim()
      })
      
      if (cliente) {
        setClienteId(cliente.id)
        setMensaje({ tipo: 'exito', texto: `¡Hola ${cliente.nombre}!` })
      } else {
        setMensaje({ tipo: 'error', texto: 'No se encontró tu cuenta. Solicita tu registro.' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al buscar tu cuenta' })
    } finally {
      setLoading(false)
    }
  }

  const marcarCompra = async () => {
    if (!clienteId) return

    setRegistrando(true)
    try {
      const res = await fetch('/api/publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clienteId,
          dispositivoId: navigator.userAgent.slice(0, 50)
        })
      })

      const data = await res.json()

      if (data.success) {
        setMensaje({ 
          tipo: 'exito', 
          texto: `¡Compra registrada! +${data.puntosGanados} cupón. Total: ${data.puntosTotales}` 
        })
        cargarDatos()
      } else if (data.tiempoRestante) {
        setTiempoRestante(data.tiempoRestante)
        setMensaje({ tipo: 'error', texto: `Espera ${data.tiempoRestante} segundos` })
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al registrar' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al registrar compra' })
    } finally {
      setRegistrando(false)
    }
  }

  // Formatear WhatsApp
  const whatsappLink = datos?.negocio?.whatsapp 
    ? `https://wa.me/${datos.negocio.whatsapp.replace(/\D/g, '')}` 
    : null

  if (loading && !datos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 to-teal-500 p-4 pb-8">
      <div className="max-w-md mx-auto">
        
        {/* Header del Negocio */}
        <Card className="mb-4 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            {/* Logo del negocio */}
            {datos?.negocio?.logo ? (
              <img 
                src={datos.negocio.logo} 
                alt={datos.negocio.nombre}
                className="w-20 h-20 mx-auto mb-3 object-contain rounded-full bg-white p-1 shadow-lg"
              />
            ) : (
              <div className="text-5xl mb-2">🏪</div>
            )}
            <h1 className="text-2xl font-bold mb-1">
              {datos?.negocio?.nombre || 'FideliQR'}
            </h1>
            {datos?.negocio?.descripcion && (
              <p className="text-emerald-100 text-sm">{datos.negocio.descripcion}</p>
            )}
          </div>
          
          {/* Info del negocio */}
          <CardContent className="p-4 bg-white">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {datos?.negocio?.telefono && (
                <a href={`tel:${datos.negocio.telefono}`} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100">
                  <span>📞</span>
                  <span className="truncate">{datos.negocio.telefono}</span>
                </a>
              )}
              {datos?.negocio?.email && (
                <a href={`mailto:${datos.negocio.email}`} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100">
                  <span>📧</span>
                  <span className="truncate">{datos.negocio.email}</span>
                </a>
              )}
              {datos?.negocio?.direccion && (
                <div className="col-span-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-gray-700">
                  <span>📍</span>
                  <span className="text-xs">{datos.negocio.direccion}</span>
                </div>
              )}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center justify-center gap-2 p-3 bg-green-500 rounded-lg text-white hover:bg-green-600 font-medium">
                  <span>💬</span>
                  <span>Contactar por WhatsApp</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card del Premio */}
        <Card className="mb-4 shadow-xl border-2 border-amber-300 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-4 text-white text-center">
            <div className="text-3xl mb-1">🎁</div>
            <h2 className="text-lg font-bold">¡Premio del Mes!</h2>
          </div>
          <CardContent className="p-4 text-center bg-amber-50">
            <p className="text-xl font-bold text-amber-700 mb-2">
              {datos?.negocio?.premioDescripcion || 'Premio Sorpresa'}
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-emerald-600 font-bold text-lg">{datos?.negocio?.puntosPorVisita || 1}</span>
                <span className="text-gray-500 ml-1">cupón/compra</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-purple-600 font-bold text-lg">{datos?.negocio?.puntosParaPremio || 10}</span>
                <span className="text-gray-500 ml-1">para canjear</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!clienteId && (
          <Card className="mb-4 shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">
                Identifícate para continuar
              </h2>
              <p className="text-sm text-gray-500 text-center mb-4">
                Ingresa tu email registrado
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="identificador">Email</Label>
                  <Input
                    id="identificador"
                    type="text"
                    placeholder="correo@email.com"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
                    className="text-center text-lg"
                  />
                </div>
                
                <Button onClick={buscarCliente} className="w-full" size="lg">
                  🔍 Buscar mi cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {clienteId && datos?.cliente && datos?.progreso && (
          <>
            <Card className="mb-4 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
                <p className="text-lg opacity-90 mb-1">¡Hola!</p>
                <h2 className="text-2xl font-bold mb-4">{datos.cliente.nombre}</h2>
                
                <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
                  <div className="text-6xl font-bold">{datos.cliente.puntos}</div>
                  <p className="text-lg opacity-90">
                    {datos.cliente.puntos === 1 ? 'cupón acumulado' : 'cupones acumulados'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="mb-4 shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
                  🎁 Progreso hacia tu premio
                </h3>
                
                <div className="mb-3 text-center">
                  <p className="text-sm text-gray-500 mb-2">
                    Premio: <span className="font-bold text-amber-600">{datos.negocio?.premioDescripcion || 'Premio'}</span>
                  </p>
                </div>
                
                <div className="relative mb-4">
                  <div className="h-10 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 rounded-full flex items-center justify-center"
                      style={{ width: `${Math.max(datos.progreso.porcentaje, 10)}%` }}
                    >
                      <span className="text-white text-sm font-bold drop-shadow">
                        {datos.progreso.porcentaje}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200">
                    <div className="text-3xl font-bold text-emerald-600">{datos.progreso.puntosActuales}</div>
                    <div className="text-xs text-gray-500">Tienes</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200">
                    <div className="text-3xl font-bold text-amber-600">{datos.progreso.puntosFaltantes}</div>
                    <div className="text-xs text-gray-500">Te faltan</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">{datos.progreso.puntosParaPremio}</div>
                    <div className="text-xs text-gray-500">Meta</div>
                  </div>
                </div>

                {datos.progreso.premiosDisponibles > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl text-center border-2 border-amber-300 shadow">
                    <span className="text-3xl">🎉</span>
                    <p className="text-xl font-bold text-amber-700 mt-2">
                      ¡Tienes {datos.progreso.premiosDisponibles} premio(s) listo(s)!
                    </p>
                    <p className="text-sm text-amber-600 mt-1">Muestra esto al encargado para canjear</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4 shadow-xl border-4 border-emerald-400">
              <CardContent className="p-6">
                <Button
                  onClick={marcarCompra}
                  disabled={registrando || (tiempoRestante !== null && tiempoRestante > 0)}
                  className="w-full text-xl py-8 font-bold"
                  size="lg"
                >
                  {registrando ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> Registrando...
                    </span>
                  ) : tiempoRestante && tiempoRestante > 0 ? (
                    `⏳ Espera ${tiempoRestante}s`
                  ) : (
                    '🛒 MARCAR MI COMPRA'
                  )}
                </Button>
                <p className="text-center text-gray-500 text-sm mt-3">
                  Al marcar sumas {datos.negocio?.puntosPorVisita || 1} cupón
                </p>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              onClick={() => {
                setClienteId('')
                setIdentificador('')
                setDatos(null)
                setMensaje(null)
              }}
              className="w-full mb-4 bg-white/90"
            >
              👤 Cambiar usuario
            </Button>
          </>
        )}

        {mensaje && (
          <div className={`p-4 rounded-xl mb-4 text-center font-medium shadow-lg ${
            mensaje.tipo === 'exito' 
              ? 'bg-green-100 text-green-700 border-2 border-green-300' 
              : 'bg-red-100 text-red-700 border-2 border-red-300'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="text-center mt-6">
          <a href="/login" className="text-white/60 hover:text-white text-xs underline">
            Panel de Administración
          </a>
        </div>
      </div>
    </div>
  )
}
