import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Verificar conexión a base de datos
    await db.$queryRaw`SELECT 1`

    // Verificar si ya existe el admin
    const existe = await db.usuario.findUnique({
      where: { email: 'admin@fideliqr.com' }
    })

    if (existe) {
      return NextResponse.json({
        status: 'ok',
        message: 'El usuario ya existe',
        credentials: {
          email: 'admin@fideliqr.com',
          password: 'admin123'
        }
      })
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10)

    await db.usuario.create({
      data: {
        email: 'admin@fideliqr.com',
        password: hashedPassword,
        nombre: 'Administrador',
        rol: 'superadmin',
        activo: true
      }
    })

    // Crear negocio
    const negocioExiste = await db.negocio.findFirst()
    if (!negocioExiste) {
      await db.negocio.create({
        data: {
          nombre: 'Mi Negocio',
          puntosPorVisita: 1,
          puntosParaPremio: 10,
          premioDescripcion: 'Premio Sorpresa'
        }
      })
    }

    // Crear configuración
    const configExiste = await db.configuracion.findFirst()
    if (!configExiste) {
      await db.configuracion.create({
        data: {
          nombreSistema: 'FideliQR',
          tiempoMinimoEntreVisitas: 300,
          maxVisitasDiarias: 10
        }
      })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Sistema inicializado correctamente',
      credentials: {
        email: 'admin@fideliqr.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Error en init:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
