'use client'

// QRScanner v3.0 - Escáner de código QR para FideliQR Cliente
// Actualizado para producción
import { useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (codigo: string) => void
  onError?: (error: string) => void
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null)

  const startScanning = async () => {
    setLoading(true)
    setError(null)

    try {
      const qrCode = new Html5Qrcode('qr-scanner')
      setHtml5QrCode(qrCode)
      
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setError('No se encontró cámara')
        setLoading(false)
        return
      }

      const backCamera = cameras.find(c => 
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('rear')
      )

      await qrCode.start(
        backCamera?.id || cameras[0].id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          // Extraer código
          let code = text
          if (text.includes('/cliente/')) {
            code = text.split('/cliente/')[1].split(/[?#/]/)[0]
          }
          
          // Vibrar
          if (navigator.vibrate) navigator.vibrate(200)
          
          // Callback
          onScan(code.toUpperCase())
        },
        () => {}
      )

      setScanning(true)
      setLoading(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de cámara'
      setError(msg)
      onError?.(msg)
      setLoading(false)
    }
  }

  const stopScanning = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop()
      } catch (e) {
        console.error(e)
      }
    }
    setScanning(false)
  }

  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center text-sm">
          {error}
        </div>
      )}

      {/* Contenedor con dimensiones fijas */}
      <div 
        id="qr-scanner" 
        style={{ 
          width: '100%', 
          maxWidth: '400px',
          minHeight: scanning ? '300px' : '0',
          margin: '0 auto'
        }}
      />

      {loading && (
        <div className="text-center py-6 text-gray-500">
          📷 Iniciando cámara...
        </div>
      )}

      {!scanning && !loading && (
        <button
          onClick={startScanning}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition"
        >
          📷 Abrir Escáner QR
        </button>
      )}

      {scanning && (
        <button
          onClick={stopScanning}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition"
        >
          ⏹️ Cerrar Escáner
        </button>
      )}
    </div>
  )
}
