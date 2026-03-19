import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarRecordatorioCobranza } from '@/lib/email'

// GET - Listar cobranzas
export async function GET() {
  try {
    const cobranzas = await db.cobranza.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(cobranzas)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cobranzas' }, { status: 500 })
  }
}

// POST - Crear cobranza
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const cobranza = await db.cobranza.create({
      data: {
        clienteId: data.clienteId,
        concepto: data.concepto,
        monto: data.monto,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        notas: data.notas,
      },
      include: { cliente: true }
    })
    
    // 📧 Enviar email de recordatorio si el cliente tiene email
    if (cobranza.cliente.email && data.enviarNotificacion) {
      const negocio = await db.negocio.findFirst()
      
      await enviarRecordatorioCobranza({
        clienteNombre: cobranza.cliente.nombre,
        clienteEmail: cobranza.cliente.email,
        concepto: cobranza.concepto,
        monto: cobranza.monto,
        fechaVencimiento: cobranza.fechaVencimiento,
        negocioNombre: negocio?.nombre || 'FideliQR',
      })
    }
    
    return NextResponse.json(cobranza)
  } catch (error) {
    console.error('Error al crear cobranza:', error)
    return NextResponse.json({ error: 'Error al crear cobranza' }, { status: 500 })
  }
}

// POST - Enviar recordatorio de una cobranza específica
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    if (data.accion === 'enviar-recordatorio') {
      const cobranza = await db.cobranza.findUnique({
        where: { id: data.cobranzaId },
        include: { cliente: true }
      })
      
      if (!cobranza) {
        return NextResponse.json({ error: 'Cobranza no encontrada' }, { status: 404 })
      }
      
      if (!cobranza.cliente.email) {
        return NextResponse.json({ error: 'El cliente no tiene email registrado' }, { status: 400 })
      }
      
      const negocio = await db.negocio.findFirst()
      
      await enviarRecordatorioCobranza({
        clienteNombre: cobranza.cliente.nombre,
        clienteEmail: cobranza.cliente.email,
        concepto: cobranza.concepto,
        monto: cobranza.monto,
        fechaVencimiento: cobranza.fechaVencimiento,
        negocioNombre: negocio?.nombre || 'FideliQR',
      })
      
      return NextResponse.json({ success: true, mensaje: 'Recordatorio enviado' })
    }
    
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error al enviar recordatorio:', error)
    return NextResponse.json({ error: 'Error al enviar recordatorio' }, { status: 500 })
  }
}
