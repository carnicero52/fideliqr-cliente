# 🎯 FideliQR-cliente

Sistema de Fidelización de Clientes con código QR - Panel Público y Administrativo

## ✨ Características

### Panel Público (`/`)
- **Identificación de cliente** - Búsqueda por email
- **Visualización de puntos** - Cupones acumulados y progreso
- **Marcar compras** - Botón para registrar visitas
- **Progreso visual** - Barra de progreso hacia el premio
- **Premios disponibles** - Indicador de premios listos para canjear

### Panel de Administración (`/admin`)
- **Dashboard** - Estadísticas en tiempo real
- **Gestión de Clientes** - CRUD completo con puntos y visitas
- **Historial de Visitas** - Registro de todas las compras
- **Cobranzas** - Seguimiento de pagos pendientes
- **Marketing** - Campañas promocionales
- **Código QR** - QR del negocio descargable
- **Configuración**:
  - Premios (cupones por compra, cupones para premio, descripción)
  - Seguridad (tiempo entre compras, máximo diario)
- **Usuarios** - Gestión de administradores (solo superadmin)

### Sistema de Autenticación
- Login con email/contraseña
- Roles: admin y superadmin
- Sesiones seguras con JWT

## 🚀 Despliegue en Vercel + Neon

### Paso 1: Crear base de datos en Neon

1. Ve a [neon.tech](https://neon.tech) y crea una cuenta gratuita
2. Crea un nuevo proyecto llamado "fideliqr"
3. Copia las cadenas de conexión:
   - `DATABASE_URL` (connection pooling)
   - `DIRECT_URL` (direct connection)

### Paso 2: Subir a GitHub

```bash
# Inicializar repositorio
git init
git add .
git commit -m "Initial commit - FideliQR-cliente"

# Crear repositorio en GitHub y subir
git remote add origin https://github.com/TU_USUARIO/fideliqr-cliente.git
git push -u origin main
```

### Paso 3: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) y conecta tu cuenta de GitHub
2. Importa el repositorio `fideliqr-cliente`
3. Configura las variables de entorno:

```
DATABASE_URL=postgresql://usuario:password@ep-xxx.neon.tech/fideliqr?sslmode=require
DIRECT_URL=postgresql://usuario:password@ep-xxx.neon.tech/fideliqr?sslmode=require
JWT_SECRET=tu-jwt-secret-seguro
```

4. ¡Despliega! Vercel ejecutará automáticamente:
   - `prisma generate`
   - `next build`
   - Poblado inicial de datos

### Paso 4: Poblar base de datos (Primera vez)

Después del primer despliegue, ejecuta el seed:

```bash
# Usando Vercel CLI
vercel env pull .env.local
npx prisma db push
npx tsx prisma/seed.ts
```

O desde el dashboard de Vercel → Settings → Environment Variables → ejecutar comando.

## 🛠️ Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/TU_USUARIO/fideliqr-cliente.git
cd fideliqr-cliente

# Instalar dependencias
bun install

# Configurar base de datos (usar .env.local con tus credenciales de Neon)
bun run db:push
bun run db:seed

# Iniciar servidor de desarrollo
bun run dev
```

## 🔐 Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| Email | `admin@fideliqr.com` |
| Contraseña | `admin123` |
| Rol | superadmin |

⚠️ **Importante**: Cambia estas credenciales después del primer inicio de sesión.

## 📱 Tecnologías

| Categoría | Tecnología |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 4 |
| UI | shadcn/ui |
| Base de datos | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | JWT + bcryptjs |
| Iconos | Lucide React |

## 📁 Estructura del Proyecto

```
fideliqr-cliente/
├── prisma/
│   ├── schema.prisma      # Schema PostgreSQL
│   └── seed.ts            # Datos iniciales
├── src/
│   ├── app/
│   │   ├── page.tsx       # Panel público
│   │   ├── login/         # Página de login
│   │   ├── admin/         # Panel administrativo
│   │   └── api/           # API Routes
│   │       ├── auth/      # Autenticación
│   │       ├── clientes/  # CRUD clientes
│   │       ├── visitas/   # Registro visitas
│   │       ├── cobranzas/ # Cobranzas
│   │       ├── marketing/ # Campañas
│   │       ├── canjes/    # Canje de premios
│   │       ├── negocio/   # Config negocio
│   │       ├── configuracion/ # Config sistema
│   │       ├── estadisticas/  # Stats
│   │       ├── usuarios/  # Gestión usuarios
│   │       └── publico/   # API pública
│   ├── components/
│   │   └── ui/            # shadcn/ui components
│   └── lib/
│       ├── db.ts          # Prisma client
│       └── utils.ts       # Utilidades
├── .env.example           # Variables de entorno ejemplo
├── vercel.json            # Config Vercel
└── package.json
```

## 🌐 Variables de Entorno

```env
# Base de datos Neon (PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# JWT Secret
JWT_SECRET="tu-secret-seguro"

# App URL (opcional)
NEXT_PUBLIC_APP_URL="https://tu-app.vercel.app"
```

## 📊 Modelo de Datos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Negocio   │     │   Usuario   │     │   Cliente   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ nombre      │     │ email       │     │ nombre      │
│ puntosPorVisita│  │ password    │     │ email       │
│ puntosParaPremio│ │ rol         │     │ puntos      │
│ premioDescripcion│ │ activo      │     │ visitas     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
             ┌──────────┐              ┌──────────┐              ┌──────────┐
             │  Visita  │              │  Canje   │              │ Cobranza │
             ├──────────┤              ├──────────┤              ├──────────┤
             │ puntos   │              │ puntos   │              │ monto    │
             │ fecha    │              │ estado   │              │ estado   │
             └──────────┘              └──────────┘              └──────────┘
```

## 🔮 Próximas Versiones

### V2 - Multi-cuenta
- Múltiples negocios independientes
- Subdominios o slugs personalizados
- Planes: gratis, básico, premium

### V3 - App Móvil
- App nativa para iOS/Android
- Notificaciones push
- Geolocalización

---

## 📝 Licencia

MIT

---

**Desarrollado con ❤️ para pequeños negocios**
