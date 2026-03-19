import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarCampanaMarketing } from '@/lib/email'

// GET - Listar campañas
export async function GET() {
  try {
    const campanas = await db.marketing.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(campanas)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener campañas' }, { status: 500 })
  }
}

// POST - Crear y enviar campaña
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Crear campaña
    const campana = await db.marketing.create({
      data: {
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        destinatarios: data.destinatarios,
        estado: 'pendiente'
      }
    })
    
    // 📧 Enviar campaña por email
    const resultado = await enviarCampanaMarketing({
      campanaId: campana.id,
      titulo: data.titulo,
      mensaje: data.mensaje,
      destinatarios: data.destinatarios,
    })
    
    return NextResponse.json({ 
      success: true, 
      campana,
      enviados: resultado.enviados,
      errores: resultado.errores
    })
  } catch (error) {
    console.error('Error al crear campaña:', error)
    return NextResponse.json({ error: 'Error al crear campaña' }, { status: 500 })
  }
}
