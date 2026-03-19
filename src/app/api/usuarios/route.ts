import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fideliqr-secret-key-2024'

// GET - Listar usuarios (solo superadmin)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { rol: string }
    
    if (decoded.rol !== 'superadmin') {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    
    const usuarios = await db.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        ultimoAcceso: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(usuarios)
  } catch {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// DELETE - Eliminar usuario (solo superadmin)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { rol: string, userId: string }
    
    if (decoded.rol !== 'superadmin') {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    
    // No permitir eliminarse a sí mismo
    if (id === decoded.userId) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }
    
    await db.usuario.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}

// PATCH - Actualizar usuario
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as { rol: string, userId: string }
    const data = await request.json()
    
    // Solo superadmin puede cambiar rol y activo
    if (data.rol !== undefined || data.activo !== undefined) {
      if (decoded.rol !== 'superadmin') {
        return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 })
      }
    }
    
    const updateData: { nombre?: string; password?: string; rol?: string; activo?: boolean } = {}
    
    if (data.nombre) updateData.nombre = data.nombre
    if (data.rol && decoded.rol === 'superadmin') updateData.rol = data.rol
    if (data.activo !== undefined && decoded.rol === 'superadmin') updateData.activo = data.activo
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10)
    }
    
    const usuario = await db.usuario.update({
      where: { id: data.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true
      }
    })
    
    return NextResponse.json(usuario)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}
