'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  email: string
  puntos: number
  totalVisitas: number
  codigoQR: string
}

export default function PanelPublico() {
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [identificador, setIdentificador] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    cargarNegocio()
  }, [])

  const cargarNegocio = async () => {
    try {
      const res = await fetch('/api/publico')
      const data = await res.json()
      setNegocio(data.negocio)
    } catch (error) {
      console.error('Error al cargar negocio:', error)
    } finally {
      setLoading(false)
    }
  }

  const buscarCliente = async () => {
    if (!identificador.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa tu email registrado' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/clientes?buscar=${encodeURIComponent(identificador.trim())}`)
      const data = await res.json()

      if (data.length > 0) {
        const c = data[0]
        setCliente(c)
        setMensaje({ tipo: 'exito', texto: `¡Hola ${c.nombre}!` })
      } else {
        setMensaje({ tipo: 'error', texto: 'No se encontró tu cuenta. Solicita tu registro en el negocio.' })
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al buscar tu cuenta' })
    } finally {
      setLoading(false)
    }
  }

  const whatsappLink = negocio?.whatsapp
    ? `https://wa.me/${negocio.whatsapp.replace(/\D/g, '')}`
    : null

  if (loading && !negocio) {
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
            {negocio?.logo ? (
              <img
                src={negocio.logo}
                alt={negocio.nombre}
                className="w-20 h-20 mx-auto mb-3 object-contain rounded-full bg-white p-1 shadow-lg"
              />
            ) : (
              <div className="text-5xl mb-2">🏪</div>
            )}
            <h1 className="text-2xl font-bold mb-1">
              {negocio?.nombre || 'FideliQR'}
            </h1>
            {negocio?.descripcion && (
              <p className="text-emerald-100 text-sm">{negocio.descripcion}</p>
            )}
          </div>

          <CardContent className="p-4 bg-white">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {negocio?.telefono && (
                <a href={`tel:${negocio.telefono}`} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100">
                  <span>📞</span>
                  <span className="truncate">{negocio.telefono}</span>
                </a>
              )}
              {negocio?.email && (
                <a href={`mailto:${negocio.email}`} className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100">
                  <span>📧</span>
                  <span className="truncate">{negocio.email}</span>
                </a>
              )}
              {negocio?.direccion && (
                <div className="col-span-2 flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-gray-700">
                  <span>📍</span>
                  <span className="text-xs">{negocio.direccion}</span>
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
              {negocio?.premioDescripcion || 'Premio Sorpresa'}
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-emerald-600 font-bold text-lg">{negocio?.puntosPorVisita || 1}</span>
                <span className="text-gray-500 ml-1">punto(s)/visita</span>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow">
                <span className="text-purple-600 font-bold text-lg">{negocio?.puntosParaPremio || 10}</span>
                <span className="text-gray-500 ml-1">para canjear</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buscar mi cuenta */}
        {!cliente && (
          <Card className="mb-4 shadow-xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">
                Consulta tus puntos
              </h2>
              <p className="text-sm text-gray-500 text-center mb-4">
                Ingresa tu email para ver tu progreso
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

        {/* Info del cliente */}
        {cliente && (
          <Card className="mb-4 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
              <p className="text-lg opacity-90 mb-1">¡Hola!</p>
              <h2 className="text-2xl font-bold mb-4">{cliente.nombre}</h2>

              <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
                <div className="text-6xl font-bold">{cliente.puntos}</div>
                <p className="text-lg opacity-90">
                  {cliente.puntos === 1 ? 'punto acumulado' : 'puntos acumulados'}
                </p>
              </div>
            </div>

            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
                🎁 Tu código QR
              </h3>

              <div className="flex justify-center mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/cliente/${cliente.codigoQR}` : '')}`}
                  alt="Tu QR"
                  className="border-4 border-gray-200 rounded-lg"
                />
              </div>

              <p className="text-sm text-gray-500 text-center">
                Código: <span className="font-mono font-bold text-emerald-600">{cliente.codigoQR}</span>
              </p>

              <div className="bg-emerald-50 p-4 rounded-lg mt-4">
                <p className="text-emerald-700 font-medium text-center">
                  Muestra este QR en tu próxima visita para acumular puntos
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setCliente(null)
                  setIdentificador('')
                  setMensaje(null)
                }}
                className="w-full mt-4"
              >
                👤 Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card className="mb-4 shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
              📱 ¿Cómo funciona?
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-medium text-blue-700">Regístrate en el negocio</p>
                  <p className="text-sm text-blue-600">Te damos tu código QR personal</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-medium text-green-700">Muestra tu QR</p>
                  <p className="text-sm text-green-600">En cada visita, presenta tu código</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-medium text-purple-700">Acumula puntos</p>
                  <p className="text-sm text-purple-600">El negocio escanea y suma puntos</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <span className="text-2xl">4️⃣</span>
                <div>
                  <p className="font-medium text-amber-700">¡Canjea tu premio!</p>
                  <p className="text-sm text-amber-600">Al llegar a la meta, recibe tu premio</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
