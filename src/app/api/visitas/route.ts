import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notificarVisitaCliente, notificarVisitaDueno } from '@/lib/email'

// GET - Listar visitas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') || '50')

    const visitas = await db.visita.findMany({
      take: limite,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: {
          select: { nombre: true, email: true, codigoQR: true }
        }
      }
    })

    return NextResponse.json(visitas)
  } catch (error) {
    console.error('Error al obtener visitas:', error)
    return NextResponse.json({ error: 'Error al obtener visitas' }, { status: 500 })
  }
}

// POST - Registrar visita (escaneando QR del cliente)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { codigoQR, escaneadoPor, monto, concepto } = data

    // Buscar cliente por código QR
    const cliente = await db.cliente.findUnique({
      where: { codigoQR: codigoQR.toUpperCase() }
    })

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (!cliente.activo) {
      return NextResponse.json({ error: 'Cliente inactivo' }, { status: 400 })
    }

    // Obtener configuración del negocio
    const negocio = await db.negocio.findFirst()
    const config = await db.configuracion.findFirst()
    const puntosGanados = negocio?.puntosPorVisita || 1

    // Verificar tiempo mínimo entre visitas (evitar duplicados)
    const ultimaVisita = await db.visita.findFirst({
      where: { clienteId: cliente.id },
      orderBy: { createdAt: 'desc' }
    })

    const tiempoMinimo = config?.tiempoMinimoEntreVisitas || 300 // 5 minutos

    if (ultimaVisita) {
      const diferencia = (Date.now() - new Date(ultimaVisita.createdAt).getTime()) / 1000
      if (diferencia < tiempoMinimo) {
        return NextResponse.json({
          error: 'Visita muy reciente',
          tiempoRestante: Math.ceil(tiempoMinimo - diferencia),
          cliente: {
            nombre: cliente.nombre,
            puntos: cliente.puntos
          }
        }, { status: 429 })
      }
    }

    // Crear visita y actualizar puntos
    const visita = await db.visita.create({
      data: {
        clienteId: cliente.id,
        puntosGanados,
        monto: monto || null,
        concepto: concepto || null,
        escaneadoPor: escaneadoPor || null
      }
    })

    // Actualizar puntos y visitas del cliente
    const clienteActualizado = await db.cliente.update({
      where: { id: cliente.id },
      data: {
        puntos: { increment: puntosGanados },
        totalVisitas: { increment: 1 }
      }
    })

    // Enviar notificaciones
    if (config?.notificarCliente && cliente.email) {
      try {
        await notificarVisitaCliente({
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          puntosGanados,
          puntosTotales: clienteActualizado.puntos,
          puntosParaPremio: negocio?.puntosParaPremio || 10,
          premioDescripcion: negocio?.premioDescripcion || 'Premio',
          negocioNombre: negocio?.nombre || 'FideliQR'
        })
      } catch (emailError) {
        console.error('Error al notificar cliente:', emailError)
      }
    }

    // Notificar al dueño por WhatsApp y Telegram
    if (config?.notificarDueno) {
      try {
        await notificarVisitaDueno({
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          codigoQR: cliente.codigoQR,
          puntosGanados,
          puntosTotales: clienteActualizado.puntos
        })
      } catch (notifError) {
        console.error('Error al notificar dueño:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      visita,
      cliente: {
        id: clienteActualizado.id,
        nombre: clienteActualizado.nombre,
        puntos: clienteActualizado.puntos,
        totalVisitas: clienteActualizado.totalVisitas
      },
      puntosGanados
    })
  } catch (error) {
    console.error('Error al registrar visita:', error)
    return NextResponse.json({ error: 'Error al registrar visita' }, { status: 500 })
  }
}
