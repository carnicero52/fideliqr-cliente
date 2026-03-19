import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarQRCliente } from '@/lib/email'

// POST - Reenviar QR por email
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { clienteId } = data

    const cliente = await db.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (!cliente.email) {
      return NextResponse.json({ error: 'Cliente sin email' }, { status: 400 })
    }

    const negocio = await db.negocio.findFirst()

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no configurado' }, { status: 400 })
    }

    await enviarQRCliente({
      email: cliente.email,
      nombre: cliente.nombre,
      codigoQR: cliente.codigoQR,
      negocioNombre: negocio.nombre
    })

    await db.cliente.update({
      where: { id: cliente.id },
      data: {
        qrEnviado: true,
        fechaEnvioQR: new Date()
      }
    })

    return NextResponse.json({ success: true, mensaje: 'QR reenviado correctamente' })
  } catch (error) {
    console.error('Error al reenviar QR:', error)
    return NextResponse.json({ error: 'Error al reenviar QR' }, { status: 500 })
  }
}
