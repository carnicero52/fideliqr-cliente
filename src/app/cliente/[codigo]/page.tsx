'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'

interface Cliente {
  id: string
  nombre: string
  email: string
  puntos: number
  totalVisitas: number
  codigoQR: string
}

interface Negocio {
  nombre: string
  descripcion: string | null
  logo: string | null
  puntosPorVisita: number
  puntosParaPremio: number
  premioDescripcion: string | null
}

export default function ClienteQRPage() {
  const params = useParams()
  const codigo = params.codigo as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [codigo])

  const cargarDatos = async () => {
    try {
      // Cargar negocio
      const negocioRes = await fetch('/api/publico')
      const negocioData = await negocioRes.json()
      setNegocio(negocioData.negocio)

      // Buscar cliente por código QR
      const clienteRes = await fetch(`/api/clientes?buscar=${codigo}`)
      const clientes = await clienteRes.json()

      if (clientes.length > 0) {
        setCliente(clientes[0])
      } else {
        setError('Código QR no válido')
      }
    } catch (err) {
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-red-600">{error}</h1>
          <p className="text-gray-500 mt-2">Contacta al negocio para obtener tu código QR</p>
        </Card>
      </div>
    )
  }

  const puntosFaltantes = (negocio?.puntosParaPremio || 10) - (cliente?.puntos || 0)
  const porcentaje = Math.min(100, Math.round((cliente?.puntos || 0) / (negocio?.puntosParaPremio || 10) * 100))

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 to-teal-500 p-4 pb-8">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <Card className="mb-4 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
            {negocio?.logo ? (
              <img
                src={negocio.logo}
                alt={negocio.nombre}
                className="w-16 h-16 mx-auto mb-2 object-contain rounded-full bg-white p-1"
              />
            ) : (
              <div className="text-4xl mb-2">🏪</div>
            )}
            <h1 className="text-xl font-bold">{negocio?.nombre}</h1>
          </div>
        </Card>

        {/* Cliente */}
        <Card className="mb-4 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white text-center">
            <p className="text-lg opacity-90 mb-1">¡Hola!</p>
            <h2 className="text-2xl font-bold mb-4">{cliente?.nombre}</h2>

            <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
              <div className="text-6xl font-bold">{cliente?.puntos}</div>
              <p className="text-lg opacity-90">
                {cliente?.puntos === 1 ? 'punto acumulado' : 'puntos acumulados'}
              </p>
            </div>
          </div>
        </Card>

        {/* QR del cliente */}
        <Card className="mb-4 shadow-xl">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              🎯 Tu código QR
            </h3>

            <div className="flex justify-center mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                alt="Tu QR"
                className="border-4 border-emerald-400 rounded-lg"
              />
            </div>

            <p className="text-sm text-gray-500">
              Código: <span className="font-mono font-bold">{cliente?.codigoQR}</span>
            </p>

            <div className="bg-emerald-50 p-4 rounded-lg mt-4">
              <p className="text-emerald-700 font-medium">
                Muestra este QR al encargado para acumular puntos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progreso */}
        <Card className="mb-4 shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-700">
              🎁 Progreso hacia tu premio
            </h3>

            <p className="text-center text-sm text-gray-500 mb-3">
              Premio: <span className="font-bold text-amber-600">{negocio?.premioDescripcion || 'Premio'}</span>
            </p>

            <div className="relative mb-4">
              <div className="h-10 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 rounded-full flex items-center justify-center"
                  style={{ width: `${Math.max(porcentaje, 10)}%` }}
                >
                  <span className="text-white text-sm font-bold drop-shadow">
                    {porcentaje}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200">
                <div className="text-3xl font-bold text-emerald-600">{cliente?.puntos || 0}</div>
                <div className="text-xs text-gray-500">Tienes</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border-2 border-amber-200">
                <div className="text-3xl font-bold text-amber-600">{Math.max(0, puntosFaltantes)}</div>
                <div className="text-xs text-gray-500">Te faltan</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                <div className="text-3xl font-bold text-purple-600">{negocio?.puntosParaPremio || 10}</div>
                <div className="text-xs text-gray-500">Meta</div>
              </div>
            </div>

            {(cliente?.puntos || 0) >= (negocio?.puntosParaPremio || 10) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl text-center border-2 border-amber-300 shadow">
                <span className="text-3xl">🎉</span>
                <p className="text-xl font-bold text-amber-700 mt-2">
                  ¡Tienes premios listos para canjear!
                </p>
                <p className="text-sm text-amber-600 mt-1">Muestra tu QR al encargado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-white/60 text-xs">
          <p>{negocio?.nombre} • FideliQR Cliente</p>
        </div>
      </div>
    </div>
  )
}
