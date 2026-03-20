'use client'

import { useState } from 'react'

export default function InstallPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const instalar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/install', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: 'Error de conexión' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Instalar FideliQR</h1>
        <p className="text-gray-500 mb-6">
          Esto creará el usuario administrador y configuración inicial
        </p>

        <button
          onClick={instalar}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition disabled:opacity-50"
        >
          {loading ? 'Instalando...' : 'Instalar Sistema'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-xl ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {result.success ? (
              <div>
                <p className="font-bold text-lg mb-2">✅ ¡Instalación exitosa!</p>
                <p className="text-sm">Email: <strong>admin@fideliqr.com</strong></p>
                <p className="text-sm">Contraseña: <strong>admin123</strong></p>
                <a href="/login" className="inline-block mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium">
                  Ir a Login
                </a>
              </div>
            ) : (
              <p>{result.error || JSON.stringify(result)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
