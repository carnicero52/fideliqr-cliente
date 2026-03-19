import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener estadísticas completas
export async function GET() {
  try {
    // === CLIENTES ===
    const totalClientes = await db.cliente.count()
    const clientesActivos = await db.cliente.count({ where: { activo: true } })
    
    // Clientes nuevos este mes
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    const clientesNuevosMes = await db.cliente.count({
      where: { createdAt: { gte: inicioMes } }
    })
    
    // === VISITAS/COMPRAS ===
    const totalVisitas = await db.visita.count()
    
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const visitasHoy = await db.visita.count({
      where: { createdAt: { gte: hoy } }
    })
    
    // Visitas esta semana
    const inicioSemana = new Date()
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
    inicioSemana.setHours(0, 0, 0, 0)
    const visitasSemana = await db.visita.count({
      where: { createdAt: { gte: inicioSemana } }
    })
    
    // Visitas este mes
    const visitasMes = await db.visita.count({
      where: { createdAt: { gte: inicioMes } }
    })
    
    // Últimas visitas
    const ultimasVisitas = await db.visita.findMany({
      include: { cliente: { select: { nombre: true, telefono: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    // === PUNTOS Y PREMIOS ===
    const puntosTotales = await db.cliente.aggregate({
      _sum: { puntos: true }
    })
    
    const premiosCanjeados = await db.canje.count()
    
    const premiosMes = await db.canje.count({
      where: { createdAt: { gte: inicioMes } }
    })
    
    // Top clientes por puntos
    const topClientes = await db.cliente.findMany({
      orderBy: { puntos: 'desc' },
      take: 5,
      select: { id: true, nombre: true, email: true, puntos: true, totalVisitas: true }
    })
    
    // === COBRANZAS ===
    const cobranzasPendientes = await db.cobranza.count({
      where: { estado: 'pendiente' }
    })
    
    const cobranzasPagadas = await db.cobranza.count({
      where: { estado: 'pagado' }
    })
    
    const cobranzasVencidas = await db.cobranza.count({
      where: { 
        estado: 'pendiente',
        fechaVencimiento: { lt: hoy }
      }
    })
    
    const montoPendiente = await db.cobranza.aggregate({
      where: { estado: 'pendiente' },
      _sum: { monto: true }
    })
    
    const montoPagado = await db.cobranza.aggregate({
      where: { estado: 'pagado' },
      _sum: { monto: true }
    })
    
    const montoVencido = await db.cobranza.aggregate({
      where: { 
        estado: 'pendiente',
        fechaVencimiento: { lt: hoy }
      },
      _sum: { monto: true }
    })
    
    // === MARKETING ===
    const campanasEnviadas = await db.marketing.count({
      where: { estado: 'enviado' }
    })
    
    const emailsEnviados = await db.marketing.aggregate({
      _sum: { enviados: true }
    })
    
    const notificacionesEnviadas = await db.notificacion.count({
      where: { estado: 'enviado' }
    })
    
    return NextResponse.json({
      // Clientes
      totalClientes,
      clientesActivos,
      clientesInactivos: totalClientes - clientesActivos,
      clientesNuevosMes,
      
      // Visitas
      totalVisitas,
      visitasHoy,
      visitasSemana,
      visitasMes,
      ultimasVisitas,
      
      // Puntos y Premios
      puntosTotales: puntosTotales._sum.puntos || 0,
      premiosCanjeados,
      premiosMes,
      topClientes,
      
      // Cobranzas
      cobranzasPendientes,
      cobranzasPagadas,
      cobranzasVencidas,
      montoPendiente: montoPendiente._sum.monto || 0,
      montoPagado: montoPagado._sum.monto || 0,
      montoVencido: montoVencido._sum.monto || 0,
      
      // Marketing
      campanasEnviadas,
      emailsEnviados: emailsEnviados._sum.enviados || 0,
      notificacionesEnviadas,
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
