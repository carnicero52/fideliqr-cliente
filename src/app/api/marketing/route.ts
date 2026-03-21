import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarCampanaMarketing } from '@/lib/email'

// GET - Listar campañas
export async function GET() {
  try {
    const campanas = await db.marketing.findMany({
      orderBy: [
        { estado: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    return NextResponse.json(campanas)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener campañas' }, { status: 500 })
  }
}

// POST - Crear y enviar campaña (ahora o programada)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Determinar si es envío inmediato o programado
    const esProgramado = data.fechaProgramada && new Date(data.fechaProgramada) > new Date()

    // Crear campaña
    const campana = await db.marketing.create({
      data: {
        tipo: data.tipo,
        titulo: data.titulo,
        mensaje: data.mensaje,
        destinatarios: data.destinatarios,
        estado: esProgramado ? 'programado' : 'pendiente',
        fechaProgramada: data.fechaProgramada ? new Date(data.fechaProgramada) : null,
        repetir: data.repetir || null,
      }
    })

    // Si no está programado, enviar inmediatamente
    if (!esProgramado) {
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
        errores: resultado.errores,
        mensaje: 'Campaña enviada inmediatamente'
      })
    }

    return NextResponse.json({
      success: true,
      campana,
      mensaje: `Campaña programada para ${new Date(data.fechaProgramada).toLocaleString('es-ES')}`,
      programado: true
    })
  } catch (error) {
    console.error('Error al crear campaña:', error)
    return NextResponse.json({ error: 'Error al crear campaña' }, { status: 500 })
  }
}

// PUT - Actualizar campaña (cancelar o enviar ahora)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()

    // Buscar la campaña
    const campanaExistente = await db.marketing.findUnique({
      where: { id: data.id }
    })

    if (!campanaExistente) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    // Si es cancelación
    if (data.accion === 'cancelar') {
      if (campanaExistente.estado !== 'programado') {
        return NextResponse.json({ error: 'Solo se pueden cancelar campañas programadas' }, { status: 400 })
      }

      const campana = await db.marketing.update({
        where: { id: data.id },
        data: { estado: 'cancelado' }
      })

      return NextResponse.json({
        success: true,
        campana,
        mensaje: 'Campaña cancelada correctamente'
      })
    }

    // Si es envío inmediato de campaña programada
    if (data.accion === 'enviar-ahora') {
      if (campanaExistente.estado !== 'programado') {
        return NextResponse.json({ error: 'Solo se pueden enviar campañas programadas' }, { status: 400 })
      }

      const resultado = await enviarCampanaMarketing({
        campanaId: campanaExistente.id,
        titulo: campanaExistente.titulo,
        mensaje: campanaExistente.mensaje,
        destinatarios: campanaExistente.destinatarios,
      })

      return NextResponse.json({
        success: true,
        enviados: resultado.enviados,
        errores: resultado.errores,
        mensaje: 'Campaña enviada inmediatamente'
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error al actualizar campaña:', error)
    return NextResponse.json({ error: 'Error al actualizar campaña' }, { status: 500 })
  }
}


// DELETE - Eliminar campaña o limpiar historial
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const accion = searchParams.get('accion')

    // Limpiar historial de campañas enviadas
    if (accion === 'limpiar-historial') {
      const resultado = await db.marketing.deleteMany({
        where: {
          estado: 'enviado'
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        eliminadas: resultado.count,
        mensaje: `Se eliminaron ${resultado.count} campañas enviadas`
      })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const campana = await db.marketing.findUnique({
      where: { id }
    })

    if (!campana) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    }

    await db.marketing.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      mensaje: 'Campaña eliminada correctamente'
    })
  } catch (error) {
    console.error('Error al eliminar campaña:', error)
    return NextResponse.json({ error: 'Error al eliminar campaña' }, { status: 500 })
  }
}
