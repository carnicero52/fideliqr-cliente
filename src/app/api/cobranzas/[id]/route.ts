import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT - Actualizar cobranza
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const cobranza = await db.cobranza.update({
      where: { id },
      data: {
        estado: data.estado,
        fechaPago: data.estado === 'pagado' ? new Date() : null
      }
    })
    
    return NextResponse.json(cobranza)
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cobranza' }, { status: 500 })
  }
}
