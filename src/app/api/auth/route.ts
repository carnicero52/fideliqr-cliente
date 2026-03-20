import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fideliqr-secret-key-2024'

// GET - Obtener usuario actual
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    const usuario = await db.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      }
    })

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 })
    }

    return NextResponse.json({ usuario })
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }
}

// POST - Login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // BUSCAR O CREAR USUARIO ADMIN POR DEFECTO
    let adminUser = await db.usuario.findUnique({
      where: { email: 'admin@fideliqr.com' }
    })

    if (!adminUser) {
      console.log('Creando usuario admin por defecto...')
      const hashedPassword = await bcrypt.hash('admin123', 10)

      try {
        adminUser = await db.usuario.create({
          data: {
            email: 'admin@fideliqr.com',
            password: hashedPassword,
            nombre: 'Administrador',
            rol: 'superadmin',
            activo: true
          }
        })
        console.log('Usuario admin creado:', adminUser.email)
      } catch (e) {
        console.log('Error creando admin (puede ya existir):', e)
      }
    }

    // Verificar credenciales del usuario que intenta loguearse
    const usuario = await db.usuario.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!usuario.activo) {
      return NextResponse.json({ error: 'Usuario inactivo' }, { status: 401 })
    }

    const passwordValid = await bcrypt.compare(password, usuario.password)

    if (!passwordValid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    // Actualizar último acceso
    await db.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() }
    })

    // Crear token
    const token = jwt.sign(
      { userId: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json({ error: 'Error al iniciar sesión: ' + (error instanceof Error ? error.message : 'Error desconocido') }, { status: 500 })
  }
}

// PUT - Crear nuevo usuario (solo superadmin)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { rol: string }

    if (decoded.rol !== 'superadmin') {
      return NextResponse.json({ error: 'No tienes permisos para crear usuarios' }, { status: 403 })
    }

    const { email, password, nombre, rol } = await request.json()

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const existente = await db.usuario.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existente) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const usuario = await db.usuario.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        nombre,
        rol: rol || 'admin'
      }
    })

    return NextResponse.json({
      success: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}

// DELETE - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('auth-token')
  return response
}
