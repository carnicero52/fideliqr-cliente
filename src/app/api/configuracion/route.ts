import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener configuración
export async function GET() {
  try {
    let config = await db.configuracion.findFirst()
    if (!config) {
      config = await db.configuracion.create({
        data: {
          id: 'CONFIG001',
          nombreSistema: 'FideliQR',
          tiempoMinimoEntreVisitas: 300,
          maxVisitasDiarias: 10,
        }
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const config = await db.configuracion.update({
      where: { id: 'CONFIG001' },
      data: {
        tiempoMinimoEntreVisitas: data.tiempoMinimoEntreVisitas,
        maxVisitasDiarias: data.maxVisitasDiarias,
      }
    })
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
