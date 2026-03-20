import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Verificar si ya existe un usuario
    const existe = await db.usuario.findFirst()

    if (existe) {
      return NextResponse.json({
        success: true,
        message: 'El sistema ya está instalado',
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

    // Crear configuración
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
      message: 'Sistema instalado correctamente',
      credentials: {
        email: 'admin@fideliqr.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Error en instalación:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al instalar: ' + (error instanceof Error ? error.message : 'Error desconocido')
    })
  }
}
