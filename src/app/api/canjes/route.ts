import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Canjear premio
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const cliente = await db.cliente.findUnique({
      where: { id: data.clienteId }
    })
    
    if (!cliente) {
      return NextResponse.json({ success: false, error: 'Cliente no encontrado' }, { status: 404 })
    }
    
    const negocio = await db.negocio.findFirst()
    const puntosParaPremio = negocio?.puntosParaPremio || 10
    
    if (cliente.puntos < puntosParaPremio) {
      return NextResponse.json({ 
        success: false, 
        error: `Necesitas ${puntosParaPremio} puntos para canjear. Tienes ${cliente.puntos}` 
      })
    }
    
    // Crear canje
    await db.canje.create({
      data: {
        clienteId: data.clienteId,
        puntosUsados: puntosParaPremio,
        descripcion: negocio?.premioDescripcion || 'Premio canjeado'
      }
    })
    
    // Actualizar cliente
    const clienteActualizado = await db.cliente.update({
      where: { id: data.clienteId },
      data: {
        puntos: { decrement: puntosParaPremio },
        premiosCanjeados: { increment: 1 }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      puntosRestantes: clienteActualizado.puntos 
    })
  } catch (error) {
    console.error('Error al canjear:', error)
    return NextResponse.json({ error: 'Error al canjear premio' }, { status: 500 })
  }
}
