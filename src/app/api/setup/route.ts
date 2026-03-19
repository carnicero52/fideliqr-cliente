import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST - Crear usuario inicial (solo si no existe ningún usuario)
export async function POST() {
  try {
    // Verificar si ya existe algún usuario
    const usuariosExistentes = await db.usuario.count()

    if (usuariosExistentes > 0) {
      return NextResponse.json({
        error: 'Ya existen usuarios. Usa el login normal.',
        usuarios: usuariosExistentes
      }, { status: 400 })
    }

    // Crear usuario superadmin inicial
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

    // Crear negocio por defecto
    await db.negocio.create({
      data: {
        id: 'NEG001',
        nombre: 'Mi Negocio',
        descripcion: 'Sistema de Fidelización',
        puntosPorVisita: 1,
        puntosParaPremio: 10,
        premioDescripcion: 'Premio Sorpresa'
      }
    })

    // Crear configuración por defecto
    await db.configuracion.create({
      data: {
        id: 'CONFIG001',
        nombreSistema: 'FideliQR',
        tiempoMinimoEntreVisitas: 300,
        maxVisitasDiarias: 10,
        notificarDueno: true,
        notificarCliente: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Sistema configurado correctamente',
      credenciales: {
        email: 'admin@fideliqr.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Error en setup:', error)
    return NextResponse.json({ error: 'Error al configurar' }, { status: 500 })
  }
}

// GET - Verificar estado del sistema
export async function GET() {
  try {
    const usuarios = await db.usuario.count()
    const negocio = await db.negocio.count()

    return NextResponse.json({
      listo: usuarios > 0,
      usuarios,
      negocioConfigurado: negocio > 0
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error de conexión a base de datos' }, { status: 500 })
  }
}
