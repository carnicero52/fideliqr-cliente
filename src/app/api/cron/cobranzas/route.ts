import { NextRequest, NextResponse } from 'next/server'
import { enviarRecordatorioCobranzasVencidas } from '@/lib/email'
import { db } from '@/lib/db'

// Token de seguridad para verificar que es un cron job legítimo
const CRON_SECRET = process.env.CRON_SECRET || 'fideliqr-cron-secret-2024'

// GET - Verificar cobranzas vencidas y enviar recordatorios
// Este endpoint debe ser llamado por cron-job.org diariamente
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const urlSecret = request.nextUrl.searchParams.get('secret')
    
    const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret
    
    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const resultados = {
      cobranzasVencidas: 0,
      recordatoriosEnviados: 0,
      marcadasComoVencidas: 0,
      errores: [] as string[]
    }

    // 1. Contar cobranzas vencidas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const cobranzasVencidas = await db.cobranza.count({
      where: {
        estado: 'pendiente',
        fechaVencimiento: {
          lt: hoy
        }
      }
    })

    resultados.cobranzasVencidas = cobranzasVencidas

    // 2. Enviar recordatorios por email
    try {
      resultados.recordatoriosEnviados = await enviarRecordatorioCobranzasVencidas()
    } catch (error) {
      resultados.errores.push(`Error enviando recordatorios: ${error}`)
    }

    // 3. Marcar cobranzas muy vencidas como "vencido" (más de 30 días)
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)

    const muyVencidas = await db.cobranza.updateMany({
      where: {
        estado: 'pendiente',
        fechaVencimiento: {
          lt: hace30Dias
        }
      },
      data: {
        estado: 'vencido'
      }
    })

    resultados.marcadasComoVencidas = muyVencidas.count

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      fecha: new Date().toISOString(),
      duracion: `${duration}ms`,
      ...resultados
    })

  } catch (error) {
    console.error('Error en cron de cobranzas:', error)
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      fecha: new Date().toISOString()
    }, { status: 500 })
  }
}
