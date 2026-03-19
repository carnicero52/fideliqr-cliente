'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { theme, setTheme } = useTheme()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        window.location.href = '/admin'
      } else {
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-slate-800 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-xl relative">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="absolute top-3 right-3 text-white/70 hover:text-white text-lg"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="text-5xl mb-3">🎯</div>
          <CardTitle className="text-2xl font-bold">FideliQR Admin</CardTitle>
          <p className="text-emerald-100 text-sm mt-2">Panel de Administración</p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@fideliqr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-lg"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-lg"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-center text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full text-lg py-6"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : '🚀 Ingresar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm">
              ← Volver al panel público
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
