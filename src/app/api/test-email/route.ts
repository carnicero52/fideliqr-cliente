import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function GET() {
  try {
    // Mostrar variables (sin mostrar la contraseña completa)
    const config = {
      SMTP_HOST: process.env.SMTP_HOST || 'NO CONFIGURADO',
      SMTP_PORT: process.env.SMTP_PORT || 'NO CONFIGURADO',
      SMTP_USER: process.env.SMTP_USER || 'NO CONFIGURADO',
      SMTP_PASS: process.env.SMTP_PASS ? `***${process.env.SMTP_PASS.length} chars***` : 'NO CONFIGURADO',
      SMTP_FROM: process.env.SMTP_FROM || 'NO CONFIGURADO',
    }

    // Verificar conexión con detalles del error
    let conexionError: string | null = null
    let conexionOk = false

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      conexionError = 'Faltan SMTP_USER o SMTP_PASS'
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
        
        await transporter.verify()
        conexionOk = true
      } catch (error: unknown) {
        conexionError = error instanceof Error ? error.message : String(error)
      }
    }

    // Intentar enviar un email de prueba
    let envioResultado: { success: boolean; mensaje?: string; error?: string } | null = null
    if (conexionOk && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"FideliQR" <${process.env.SMTP_USER}>`,
          to: process.env.SMTP_USER,
          subject: '🧪 Prueba de FideliQR',
          html: '<h1>Prueba exitosa</h1><p>El sistema de emails funciona correctamente.</p>',
        })
        envioResultado = { success: true, mensaje: 'Email enviado correctamente' }
      } catch (error: unknown) {
        envioResultado = { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }

    return NextResponse.json({
      configuracion: config,
      conexionOk,
      conexionError,
      envioPrueba: envioResultado,
      mensaje: conexionOk 
        ? '✅ Configuración correcta' 
        : `❌ Error de conexión: ${conexionError}`
    })
  } catch (error) {
    return NextResponse.json({ 
      error: String(error),
      mensaje: 'Error al verificar configuración'
    }, { status: 500 })
  }
}
