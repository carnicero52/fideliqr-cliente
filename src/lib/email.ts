import nodemailer from 'nodemailer'
import { db } from './db'

// Configuración del transporter
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Verificar configuración
export async function verificarConfigEmail(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return false
  }
  try {
    const transporter = getTransporter()
    await transporter.verify()
    return true
  } catch {
    return false
  }
}

// Enviar email (exportado para uso en crons)
export async function enviarEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 Email no configurado - SMTP_USER y SMTP_PASS requeridos')
    return { success: false, error: 'Email no configurado' }
  }

  try {
    const transporter = getTransporter()
    const from = process.env.SMTP_FROM || `"FideliQR" <${process.env.SMTP_USER}>`

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    })

    // Guardar en historial
    await db.notificacion.create({
      data: {
        tipo: 'email',
        destinatario: to,
        asunto: subject,
        mensaje: text || html.replace(/<[^>]*>/g, ''),
        estado: 'enviado',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error al enviar email:', error)

    // Guardar error en historial
    await db.notificacion.create({
      data: {
        tipo: 'email',
        destinatario: to,
        asunto: subject,
        mensaje: text || html.replace(/<[^>]*>/g, ''),
        estado: 'error',
        error: String(error),
      },
    })

    return { success: false, error: String(error) }
  }
}

// ============================================
// NOTIFICACIONES DE COMPRAS
// ============================================

export async function notificarCompraDueno(data: {
  clienteNombre: string
  clienteEmail: string
  puntosGanados: number
  puntosTotales: number
}): Promise<void> {
  const negocio = await db.negocio.findFirst()
  if (!negocio?.email) return

  const subject = `🛒 Nueva compra - ${data.clienteNombre}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🛒 Nueva Compra Registrada</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p><strong>Cliente:</strong> ${data.clienteNombre}</p>
        <p><strong>Email:</strong> ${data.clienteEmail}</p>
        <p><strong>Cupones ganados:</strong> +${data.puntosGanados}</p>
        <p><strong>Total de cupones:</strong> ${data.puntosTotales}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Panel de administración: ${process.env.NEXT_PUBLIC_APP_URL || 'tu-app'}/admin
      </p>
    </div>
  `

  await enviarEmail({
    to: negocio.email,
    subject,
    html,
  })
}

export async function notificarCompraCliente(data: {
  clienteNombre: string
  clienteEmail: string
  puntosGanados: number
  puntosTotales: number
  puntosParaPremio: number
  premioDescripcion: string
  negocioNombre: string
}): Promise<void> {
  const premiosDisponibles = Math.floor(data.puntosTotales / data.puntosParaPremio)
  const progreso = (data.puntosTotales % data.puntosParaPremio) / data.puntosParaPremio * 100

  const subject = `🛒 ¡Gracias por tu compra en ${data.negocioNombre}!`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">¡Hola ${data.clienteNombre}! 👋</h2>
      <div style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 30px; border-radius: 15px; margin: 20px 0; text-align: center;">
        <h3>Tu compra fue registrada</h3>
        <p style="font-size: 48px; font-weight: bold; margin: 10px 0;">+${data.puntosGanados}</p>
        <p style="font-size: 18px;">cupón${data.puntosGanados > 1 ? 'es' : ''} acumulado${data.puntosGanados > 1 ? 's' : ''}</p>
      </div>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 10px;">
        <h4 style="margin: 0 0 15px 0;">📊 Tu progreso hacia el premio</h4>
        <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #059669, #0d9488); width: ${progreso}%; height: 100%;"></div>
        </div>
        <p style="text-align: center; margin-top: 10px;">
          <strong>${data.puntosTotales}</strong> de <strong>${data.puntosParaPremio}</strong> cupones
        </p>
        <p style="text-align: center; color: #6b7280;">
          🎁 Premio: ${data.premioDescripcion}
        </p>
      </div>

      ${premiosDisponibles > 0 ? `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="font-size: 24px; margin: 0;">🎉</p>
          <p style="font-size: 18px; font-weight: bold; color: #92400e; margin: 10px 0;">
            ¡Tienes ${premiosDisponibles} premio${premiosDisponibles > 1 ? 's' : ''} disponible${premiosDisponibles > 1 ? 's' : ''}!
          </p>
          <p style="color: #b45309;">Muestra este email para canjearlo${premiosDisponibles > 1 ? 's' : ''}</p>
        </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
        Gracias por tu preferencia 💚<br>
        <strong>${data.negocioNombre}</strong>
      </p>
    </div>
  `

  await enviarEmail({
    to: data.clienteEmail,
    subject,
    html,
  })
}

// ============================================
// MARKETING
// ============================================

export async function enviarCampanaMarketing(data: {
  campanaId: string
  titulo: string
  mensaje: string
  destinatarios: string // todos, inactivos
}): Promise<{ enviados: number; errores: number }> {
  // Obtener clientes según el filtro
  const where = data.destinatarios === 'inactivos'
    ? { activo: true, totalVisitas: 0 }
    : { activo: true }

  const clientes = await db.cliente.findMany({
    where,
    select: { email: true, nombre: true },
  })

  let enviados = 0
  let errores = 0

  const negocio = await db.negocio.findFirst()
  const nombreNegocio = negocio?.nombre || 'FideliQR'

  for (const cliente of clientes) {
    if (!cliente.email) continue

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">${data.titulo}</h2>
        <p style="font-size: 16px; line-height: 1.6;">${data.mensaje.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          <strong>${nombreNegocio}</strong><br>
          Este mensaje fue enviado a ${cliente.email}<br>
          porque eres parte de nuestro programa de fidelización.
        </p>
      </div>
    `

    const result = await enviarEmail({
      to: cliente.email,
      subject: `${data.titulo} - ${nombreNegocio}`,
      html,
    })

    if (result.success) {
      enviados++
    } else {
      errores++
    }

    // Pequeña pausa para no saturar
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Actualizar campaña
  await db.marketing.update({
    where: { id: data.campanaId },
    data: {
      estado: 'enviado',
      enviados,
      errores,
      fechaEnvio: new Date(),
    },
  })

  return { enviados, errores }
}

// ============================================
// COBRANZAS
// ============================================

export async function enviarRecordatorioCobranza(data: {
  clienteNombre: string
  clienteEmail: string
  concepto: string
  monto: number
  fechaVencimiento?: Date | null
  negocioNombre: string
}): Promise<void> {
  const fechaStr = data.fechaVencimiento
    ? ` antes del ${new Date(data.fechaVencimiento).toLocaleDateString('es-ES')}`
    : ''

  const subject = `💰 Recordatorio de pago - ${data.negocioNombre}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">💰 Recordatorio de Pago</h2>
      <p>Hola ${data.clienteNombre},</p>
      <p>Te recordamos que tienes un pago pendiente${fechaStr}.</p>
      
      <div style="background: #fef2f2; border: 2px solid #fca5a5; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p style="margin: 0; color: #6b7280;">Concepto:</p>
        <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">${data.concepto}</p>
        <p style="margin: 15px 0 0 0; color: #6b7280;">Monto:</p>
        <p style="font-size: 32px; font-weight: bold; color: #dc2626; margin: 5px 0;">$${data.monto.toFixed(2)}</p>
      </div>

      <p>Por favor, comunícate con nosotros para regularizar tu pago.</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        <strong>${data.negocioNombre}</strong><br>
        Este es un recordatorio automático de nuestro sistema de fidelización.
      </p>
    </div>
  `

  await enviarEmail({
    to: data.clienteEmail,
    subject,
    html,
  })
}

export async function enviarRecordatorioCobranzasVencidas(): Promise<number> {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Obtener cobranzas vencidas
  const cobranzas = await db.cobranza.findMany({
    where: {
      estado: 'pendiente',
      fechaVencimiento: { lt: hoy },
    },
    include: { cliente: true },
  })

  const negocio = await db.negocio.findFirst()
  const nombreNegocio = negocio?.nombre || 'FideliQR'

  let enviados = 0

  for (const cobranza of cobranzas) {
    if (!cobranza.cliente.email) continue

    await enviarRecordatorioCobranza({
      clienteNombre: cobranza.cliente.nombre,
      clienteEmail: cobranza.cliente.email,
      concepto: cobranza.concepto,
      monto: cobranza.monto,
      fechaVencimiento: cobranza.fechaVencimiento,
      negocioNombre: nombreNegocio,
    })

    enviados++
  }

  return enviados
}

// ============================================
// ENVIAR QR AL CLIENTE
// ============================================

export async function enviarQRCliente(data: {
  email: string
  nombre: string
  codigoQR: string
  negocioNombre: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tudominio.com'
  const qrUrl = `${baseUrl}/cliente/${data.codigoQR}`
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); border-radius: 10px;">
        <h1 style="color: white; margin: 0;">¡Bienvenido a ${data.negocioNombre}!</h1>
        <p style="color: #d1fae5; margin-top: 10px;">Tu tarjeta de fidelización digital</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; text-align: center;">
        <h2 style="color: #1f2937;">Hola ${data.nombre}!</h2>
        <p style="color: #6b7280;">Este es tu código QR personal para acumular puntos en cada visita.</p>

        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <img src="${qrImage}" alt="Tu código QR" style="width: 200px; height: 200px; margin: 0 auto;" />
          <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">Código: ${data.codigoQR}</p>
        </div>

        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #059669; margin: 0; font-weight: bold;">📱 Cómo usar tu QR:</p>
          <ol style="color: #047857; text-align: left; margin: 10px 0; padding-left: 20px;">
            <li>Guarda este email o captura tu QR</li>
            <li>En tu próxima visita, muestra tu QR</li>
            <li>El negocio lo escaneará para registrar tus puntos</li>
          </ol>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
          Este email fue enviado desde ${data.negocioNombre}
        </p>
      </div>
    </div>
  `

  return await enviarEmail({
    to: data.email,
    subject: `Tu código QR de ${data.negocioNombre}`,
    html,
  })
}

// ============================================
// NOTIFICACIONES DE VISITA (Nuevo modelo)
// ============================================

export async function notificarVisitaCliente(data: {
  clienteNombre: string
  clienteEmail: string
  puntosGanados: number
  puntosTotales: number
  puntosParaPremio: number
  premioDescripcion: string
  negocioNombre: string
}): Promise<void> {
  const premiosDisponibles = Math.floor(data.puntosTotales / data.puntosParaPremio)
  const progreso = (data.puntosTotales % data.puntosParaPremio) / data.puntosParaPremio * 100

  const subject = `🎫 ¡Gracias por tu visita a ${data.negocioNombre}!`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">¡Hola ${data.clienteNombre}! 👋</h2>
      <div style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 30px; border-radius: 15px; margin: 20px 0; text-align: center;">
        <h3>Tu visita fue registrada</h3>
        <p style="font-size: 48px; font-weight: bold; margin: 10px 0;">+${data.puntosGanados}</p>
        <p style="font-size: 18px;">punto${data.puntosGanados > 1 ? 's' : ''} acumulado${data.puntosGanados > 1 ? 's' : ''}</p>
      </div>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 10px;">
        <h4 style="margin: 0 0 15px 0;">📊 Tu progreso hacia el premio</h4>
        <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #059669, #0d9488); width: ${progreso}%; height: 100%;"></div>
        </div>
        <p style="text-align: center; margin-top: 10px;">
          <strong>${data.puntosTotales}</strong> de <strong>${data.puntosParaPremio}</strong> puntos
        </p>
        <p style="text-align: center; color: #6b7280;">
          🎁 Premio: ${data.premioDescripcion}
        </p>
      </div>

      ${premiosDisponibles > 0 ? `
        <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="font-size: 24px; margin: 0;">🎉</p>
          <p style="font-size: 18px; font-weight: bold; color: #92400e; margin: 10px 0;">
            ¡Tienes ${premiosDisponibles} premio${premiosDisponibles > 1 ? 's' : ''} disponible${premiosDisponibles > 1 ? 's' : ''}!
          </p>
        </div>
      ` : ''}

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
        Gracias por tu preferencia 💚<br>
        <strong>${data.negocioNombre}</strong>
      </p>
    </div>
  `

  await enviarEmail({
    to: data.clienteEmail,
    subject,
    html,
  })
}

export async function notificarVisitaDueno(data: {
  clienteNombre: string
  clienteEmail: string
  codigoQR: string
  puntosGanados: number
  puntosTotales: number
}): Promise<void> {
  const negocio = await db.negocio.findFirst()
  if (!negocio?.email) return

  const subject = `🎫 Nueva visita - ${data.clienteNombre}`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🎫 Nueva Visita Registrada</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <p><strong>Cliente:</strong> ${data.clienteNombre}</p>
        <p><strong>Email:</strong> ${data.clienteEmail}</p>
        <p><strong>Código QR:</strong> ${data.codigoQR}</p>
        <p><strong>Puntos ganados:</strong> +${data.puntosGanados}</p>
        <p><strong>Total puntos:</strong> ${data.puntosTotales}</p>
      </div>
    </div>
  `

  await enviarEmail({
    to: negocio.email,
    subject,
    html,
  })
}

// ============================================
// BIENVENIDA
// ============================================

export async function enviarEmailBienvenida(data: {
  clienteNombre: string
  clienteEmail: string
  negocioNombre: string
  puntosPorVisita: number
  puntosParaPremio: number
  premioDescripcion: string
}): Promise<void> {
  const subject = `🎉 ¡Bienvenido a ${data.negocioNombre}!`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 40px; border-radius: 15px 15px 0 0; text-align: center;">
        <h1 style="margin: 0;">🎉 ¡Bienvenido!</h1>
        <p style="font-size: 20px; margin: 10px 0 0 0;">${data.clienteNombre}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 15px 15px;">
        <h2 style="color: #059669; text-align: center;">Tu programa de fidelización</h2>
        
        <div style="display: flex; justify-content: space-around; text-align: center; margin: 30px 0;">
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 32px; color: #059669; margin: 0;">+${data.puntosPorVisita}</p>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">cupón por compra</p>
          </div>
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 32px; color: #7c3aed; margin: 0;">${data.puntosParaPremio}</p>
            <p style="color: #6b7280; font-size: 14px; margin: 5px 0 0 0;">para premio</p>
          </div>
        </div>

        <div style="background: #fef3c7; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #92400e;">🎁 Tu premio será:</p>
          <p style="font-size: 24px; font-weight: bold; color: #b45309; margin: 10px 0;">${data.premioDescripcion}</p>
        </div>

        <p style="text-align: center; color: #6b7280; margin-top: 30px;">
          ¡Empieza a acumular cupones en tu próxima visita!
        </p>
      </div>

      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
        Gracias por unirte 💚<br>
        <strong>${data.negocioNombre}</strong>
      </p>
    </div>
  `

  await enviarEmail({
    to: data.clienteEmail,
    subject,
    html,
  })
}
