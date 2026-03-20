'use client'

import { useState } from 'react'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const setupSystem = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/setup', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setResult({ error: 'Error de conexión' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h1 className="text-2xl font-bold mb-2">Configurar Sistema</h1>
        <p className="text-gray-600 mb-6">
          Esto creará el usuario administrador y la configuración inicial
        </p>

        <button
          onClick={setupSystem}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg disabled:opacity-50"
        >
          {loading ? 'Configurando...' : '⚙️ Configurar Sistema'}
        </button>

        {result && (
          <div className={`mt-6 p-4 rounded-lg text-left ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
            {result.success ? (
              <div>
                <p className="font-bold text-green-700 mb-2">✅ ¡Sistema configurado!</p>
                <p className="text-sm">Email: <strong>admin@fideliqr.com</strong></p>
                <p className="text-sm">Contraseña: <strong>admin123</strong></p>
                <a href="/login" className="block mt-4 text-center bg-emerald-500 text-white py-2 rounded-lg font-medium no-underline">
                  Ir a Login
                </a>
              </div>
            ) : (
              <p className="text-red-700">{result.error || JSON.stringify(result)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
