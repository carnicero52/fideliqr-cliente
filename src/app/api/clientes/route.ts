import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarQRCliente, enviarEmailBienvenida } from '@/lib/email'

// Generar código QR único de 8 caracteres
function generarCodigoQR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let codigo = ''
  for (let i = 0; i < 8; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buscar = searchParams.get('buscar')

    let where = {}
    if (buscar) {
      const buscarUpper = buscar.toUpperCase()
      const buscarLower = buscar.toLowerCase()
      where = {
        OR: [
          { email: { contains: buscarLower } },
          { email: { contains: buscar } },
          { email: { contains: buscarUpper } },
          { nombre: { contains: buscarLower } },
          { nombre: { contains: buscar } },
          { nombre: { contains: buscarUpper } },
          { telefono: { contains: buscar } },
          { codigoQR: { equals: buscarUpper } }
        ]
      }
    }

    const clientes = await db.cliente.findMany({
      where,
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
    const codigoQR = generarCodigoQR()

    const cliente = await db.cliente.create({
      data: {
        codigoQR,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        notas: data.notas || null,
      }
    })

    const negocio = await db.negocio.findFirst()

    // Enviar QR por email si se solicita
    if (data.enviarQR !== false && cliente.email && negocio) {
      try {
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
      } catch (emailError) {
        console.error('Error al enviar QR:', emailError)
      }
    }

    // Enviar email de bienvenida
    if (data.enviarBienvenida !== false && cliente.email && negocio) {
      enviarEmailBienvenida({
        clienteNombre: cliente.nombre,
        clienteEmail: cliente.email,
        negocioNombre: negocio.nombre,
        puntosPorVisita: negocio.puntosPorVisita,
        puntosParaPremio: negocio.puntosParaPremio,
        premioDescripcion: negocio.premioDescripcion || 'Premio',
      }).catch(console.error)
    }

    return NextResponse.json(cliente)
  } catch (error: unknown) {
    console.error('Error al crear cliente:', error)
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
