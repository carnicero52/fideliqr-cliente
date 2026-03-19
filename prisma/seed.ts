import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear negocio por defecto
  const negocio = await prisma.negocio.upsert({
    where: { id: 'NEG001' },
    update: {},
    create: {
      id: 'NEG001',
      nombre: 'Mi Negocio',
      puntosPorVisita: 1,
      puntosParaPremio: 10,
      premioDescripcion: 'Premio Sorpresa',
      callmebotApikey: '4020302',
      callmebotPhone: '584249388632',
    }
  })
  console.log('✅ Negocio creado/actualizado')

  // Crear configuración por defecto
  const config = await prisma.configuracion.upsert({
    where: { id: 'CONFIG001' },
    update: {},
    create: {
      id: 'CONFIG001',
    nombreSistema: 'FideliQR',
    tiempoMinimoEntreVisitas: 300,
    maxVisitasDiarias: 10,
    notificarDueno: true,
    notificarCliente: true,
    autoActualizar: true,
    intervaloActualizacion: 10,
  },
  })
  console.log('✅ Configuración creada/actualizada')

  // Crear usuario superadmin por defecto
  const existingAdmin = await prisma.usuario.findFirst({
    where: { email: 'admin@fideliqr.com' }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    await prisma.usuario.create({
      data: {
        email: 'admin@fideliqr.com',
        password: hashedPassword,
        nombre: 'Administrador',
        rol: 'superadmin',
      }
    })
    console.log('✅ Usuario superadmin creado')
    console.log('📧 Email: admin@fideliqr.com')
    console.log('🔑 Contraseña: admin123')
  } else {
    console.log('ℹ️  Usuario superadmin ya existe')
  }

  console.log('🎉 Seed completado')
}

main()
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
