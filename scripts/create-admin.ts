import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Verificando usuario admin...')

  const existe = await prisma.usuario.findUnique({
    where: { email: 'admin@fideliqr.com' }
  })

  if (existe) {
    console.log('✅ Usuario admin ya existe')
    return
  }

  console.log('Creando usuario admin...')
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.usuario.create({
    data: {
      email: 'admin@fideliqr.com',
      password: hashedPassword,
      nombre: 'Administrador',
      rol: 'superadmin',
      activo: true
    }
  })

  console.log('✅ Usuario admin creado!')
  console.log('📧 Email: admin@fideliqr.com')
  console.log('🔑 Password: admin123')

  // Crear negocio si no existe
  const negocioExiste = await prisma.negocio.findFirst()
  if (!negocioExiste) {
    await prisma.negocio.create({
      data: {
        nombre: 'Mi Negocio',
        puntosPorVisita: 1,
        puntosParaPremio: 10,
        premioDescripcion: 'Premio Sorpresa'
      }
    })
    console.log('✅ Negocio por defecto creado')
  }

  // Crear configuración si no existe
  const configExiste = await prisma.configuracion.findFirst()
  if (!configExiste) {
    await prisma.configuracion.create({
      data: {
        nombreSistema: 'FideliQR',
        tiempoMinimoEntreVisitas: 300,
        maxVisitasDiarias: 10
      }
    })
    console.log('✅ Configuración por defecto creada')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
