import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener cliente por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cliente = await db.cliente.findUnique({
      where: { id }
    })
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Error al obtener cliente:', error)
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  }
}

// PUT - Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const clienteExistente = await db.cliente.findUnique({ where: { id } })
    if (!clienteExistente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }
    
    const cliente = await db.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre ?? clienteExistente.nombre,
        email: data.email ?? clienteExistente.email,
        telefono: data.telefono ?? clienteExistente.telefono,
        puntos: data.puntos ?? clienteExistente.puntos,
        notas: data.notas ?? clienteExistente.notas,
      }
    })
    
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Error al actualizar cliente:', error)
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}

// DELETE - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cliente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar cliente:', error)
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
