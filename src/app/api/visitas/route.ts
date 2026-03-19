import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar visitas
export async function GET() {
  try {
    const visitas = await db.visita.findMany({
      include: { cliente: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return NextResponse.json(visitas)
  } catch (error) {
    console.error('Error al obtener visitas:', error)
    return NextResponse.json({ error: 'Error al obtener visitas' }, { status: 500 })
  }
}
