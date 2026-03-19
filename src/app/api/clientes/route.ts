import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarEmailBienvenida } from '@/lib/email'

// GET - Listar clientes
export async function GET() {
  try {
    const clientes = await db.cliente.findMany({
      include: {
        _count: {
          select: { visitas: true, canjes: true, cobranzas: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(clientes)
  } catch (error) {
    console.error('Error al obtener clientes:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// POST - Crear cliente
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const cliente = await db.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || '',
        notas: data.notas,
      }
    })
    
    // 📧 Enviar email de bienvenida
    if (cliente.email && data.enviarBienvenida !== false) {
      const negocio = await db.negocio.findFirst()
      
      if (negocio) {
        enviarEmailBienvenida({
          clienteNombre: cliente.nombre,
          clienteEmail: cliente.email,
          negocioNombre: negocio.nombre,
          puntosPorVisita: negocio.puntosPorVisita,
          puntosParaPremio: negocio.puntosParaPremio,
          premioDescripcion: negocio.premioDescripcion || 'Premio',
        }).catch(console.error)
      }
    }
    
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Error al crear cliente:', error)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
