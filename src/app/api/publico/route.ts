import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notificarCompraDueno, notificarCompraCliente } from '@/lib/email'

// GET - Obtener datos públicos del negocio
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    
    const negocio = await db.negocio.findFirst({
      select: {
        nombre: true,
        descripcion: true,
        logo: true,
        telefono: true,
        email: true,
        direccion: true,
        whatsapp: true,
        puntosPorVisita: true,
        puntosParaPremio: true,
        premioDescripcion: true,
      }
    })
    
    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no configurado' }, { status: 404 })
    }
    
    const response = {
      negocio,
      cliente: null,
      progreso: null
    }
    
    if (clienteId) {
      const cliente = await db.cliente.findUnique({
        where: { id: clienteId, activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          puntos: true,
          totalVisitas: true,
        }
      })
      
      if (cliente) {
        const puntosFaltantes = Math.max(0, negocio.puntosParaPremio - cliente.puntos)
        const porcentaje = Math.min(100, (cliente.puntos / negocio.puntosParaPremio) * 100)
        
        return NextResponse.json({
          negocio,
          cliente,
          progreso: {
            puntosActuales: cliente.puntos,
            puntosParaPremio: negocio.puntosParaPremio,
            puntosFaltantes,
            porcentaje: Math.round(porcentaje),
            premiosDisponibles: Math.floor(cliente.puntos / negocio.puntosParaPremio)
          }
        })
      }
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error al obtener datos públicos:', error)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}

// POST - Registrar visita desde el panel público
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const config = await db.configuracion.findFirst()
    const tiempoMinimo = config?.tiempoMinimoEntreVisitas || 300
    const maxVisitasDiarias = config?.maxVisitasDiarias || 10
    
    // Verificar tiempo mínimo entre visitas
    const ultimaVisita = await db.visita.findFirst({
      where: { clienteId: data.clienteId },
      orderBy: { createdAt: 'desc' }
    })
    
    if (ultimaVisita) {
      const tiempoTranscurrido = (Date.now() - ultimaVisita.createdAt.getTime()) / 1000
      if (tiempoTranscurrido < tiempoMinimo) {
        return NextResponse.json({
          success: false,
          error: 'Debes esperar más tiempo entre visitas',
          tiempoRestante: Math.ceil(tiempoMinimo - tiempoTranscurrido)
        }, { status: 429 })
      }
    }
    
    // Verificar límite diario
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    const visitasHoy = await db.visita.count({
      where: {
        clienteId: data.clienteId,
        createdAt: { gte: hoy }
      }
    })
    
    if (visitasHoy >= maxVisitasDiarias) {
      return NextResponse.json({
        success: false,
        error: 'Has alcanzado el límite de visitas diarias'
      }, { status: 429 })
    }
    
    // Obtener negocio y puntos
    const negocio = await db.negocio.findFirst()
    const puntosGanados = negocio?.puntosPorVisita || 1
    
    // Obtener cliente antes de actualizar
    const clienteAntes = await db.cliente.findUnique({
      where: { id: data.clienteId }
    })
    
    // Crear visita
    await db.visita.create({
      data: {
        clienteId: data.clienteId,
        puntosGanados,
      }
    })
    
    // Actualizar cliente
    const cliente = await db.cliente.update({
      where: { id: data.clienteId },
      data: {
        puntos: { increment: puntosGanados },
        totalVisitas: { increment: 1 }
      }
    })
    
    // 📧 Enviar notificaciones por email (en background)
    if (clienteAntes && negocio) {
      notificarCompraDueno({
        clienteNombre: cliente.nombre,
        clienteEmail: cliente.email || '',
        puntosGanados,
        puntosTotales: cliente.puntos,
      }).catch(console.error)
      
      if (cliente.email && config?.notificarCliente) {
        notificarCompraCliente({
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          puntosGanados,
          puntosTotales: cliente.puntos,
          puntosParaPremio: negocio.puntosParaPremio,
          premioDescripcion: negocio.premioDescripcion || 'Premio',
          negocioNombre: negocio.nombre,
        }).catch(console.error)
      }
    }
    
    return NextResponse.json({
      success: true,
      puntosGanados,
      puntosTotales: cliente.puntos
    })
  } catch (error) {
    console.error('Error al registrar visita:', error)
    return NextResponse.json({ error: 'Error al registrar visita' }, { status: 500 })
  }
}
