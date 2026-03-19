import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener negocio
export async function GET() {
  try {
    let negocio = await db.negocio.findFirst()
    if (!negocio) {
      negocio = await db.negocio.create({
        data: {
          id: 'NEG001',
          nombre: 'Mi Negocio',
          puntosPorVisita: 1,
          puntosParaPremio: 10,
          premioDescripcion: 'Premio Sorpresa',
        }
      })
    }
    return NextResponse.json(negocio)
  } catch (error) {
    console.error('Error al obtener negocio:', error)
    return NextResponse.json({ error: 'Error al obtener negocio' }, { status: 500 })
  }
}

// PUT - Actualizar negocio
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    
    const negocio = await db.negocio.update({
      where: { id: 'NEG001' },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        logo: data.logo,
        telefono: data.telefono,
        email: data.email,
        direccion: data.direccion,
        whatsapp: data.whatsapp,
        puntosPorVisita: data.puntosPorVisita,
        puntosParaPremio: data.puntosParaPremio,
        premioDescripcion: data.premioDescripcion,
        callmebotApikey: data.callmebotApikey,
        callmebotPhone: data.callmebotPhone,
        telegramBotToken: data.telegramBotToken,
        telegramChatId: data.telegramChatId,
      }
    })
    
    return NextResponse.json(negocio)
  } catch (error) {
    console.error('Error al actualizar negocio:', error)
    return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 })
  }
}
