import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    console.log('Iniciando configuración del sistema...')

    // Verificar conexión
    await db.$queryRaw`SELECT 1`
    console.log('✅ Conexión a BD OK')

    // Verificar si ya existe el admin
    const existe = await db.usuario.findUnique({
      where: { email: 'admin@fideliqr.com' }
    })

    if (existe) {
      return NextResponse.json({
        success: true,
        message: 'El sistema ya estaba configurado',
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
    console.log('✅ Usuario admin creado')

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
      console.log('✅ Negocio creado')
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
      console.log('✅ Configuración creada')
    }

    return NextResponse.json({
      success: true,
      message: 'Sistema configurado correctamente',
      credentials: {
        email: 'admin@fideliqr.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    console.error('Error en setup:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
