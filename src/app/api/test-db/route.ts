import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Verificar conexión
    const usuariosCount = await db.usuario.count()
    const negocioCount = await db.negocio.count()

    return NextResponse.json({
      status: 'ok',
      database: 'conectado',
      usuarios: usuariosCount,
      negocios: negocioCount
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export async function POST() {
  try {
    // Verificar si ya existe el admin
    const existe = await db.usuario.findUnique({
      where: { email: 'admin@fideliqr.com' }
    })

    if (existe) {
      return NextResponse.json({
        status: 'ok',
        message: 'El usuario admin ya existe',
        credentials: {
          email: 'admin@fideliqr.com',
          password: 'admin123'
        }
      })
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const usuario = await db.usuario.create({
      data: {
        email: 'admin@fideliqr.com',
        password: hashedPassword,
        nombre: 'Administrador',
        rol: 'superadmin',
        activo: true
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Usuario admin creado exitosamente',
      credentials: {
        email: 'admin@fideliqr.com',
        password: 'admin123'
      },
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
