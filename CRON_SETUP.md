# 🕐 Configuración de Cron Jobs

Este documento explica cómo configurar los recordatorios automáticos usando **cron-job.org** (gratuito).

---

## 📋 Endpoints Disponibles

| Endpoint | Función | Frecuencia Recomendada |
|----------|---------|------------------------|
| `/api/cron/cobranzas` | Recordatorios de pagos vencidos | Diario a las 9:00 AM |
| `/api/cron/marketing` | Enviar campañas programadas | Cada hora |

---

## 🔐 Variable de Entorno Requerida

Agrega esta variable en **Vercel**:

```
CRON_SECRET=tu-secreto-unico-y-seguro-2024
```

Genera un secreto único con: `openssl rand -hex 32`

---

## ⚙️ Configuración en cron-job.org

### Paso 1: Crear Cuenta Gratuita

1. Ve a [cron-job.org](https://cron-job.org)
2. Haz clic en **Sign up**
3. Completa el registro con tu email

### Paso 2: Crear Job para Cobranzas (Diario)

1. Haz clic en **Create cronjob**
2. Configura:

| Campo | Valor |
|-------|-------|
| **Title** | `FideliQR - Cobranzas` |
| **URL** | `https://fideliqr-full-v1.vercel.app/api/cron/cobranzas?secret=TU-SECRETO` |
| **Schedule** | `0 9 * * *` (cada día a las 9:00 AM UTC) |
| **Time zone** | Selecciona tu zona horaria |

3. Opcional: Agrega header de autorización:
   - Header name: `Authorization`
   - Header value: `Bearer TU-SECRETO`

4. Haz clic en **Create**

### Paso 3: Crear Job para Marketing (Cada hora)

1. Haz clic en **Create cronjob**
2. Configura:

| Campo | Valor |
|-------|-------|
| **Title** | `FideliQR - Marketing` |
| **URL** | `https://fideliqr-full-v1.vercel.app/api/cron/marketing?secret=TU-SECRETO` |
| **Schedule** | `0 * * * *` (cada hora) |
| **Time zone** | Selecciona tu zona horaria |

3. Haz clic en **Create**

---

## 📝 Formato de Schedule (Cron)

```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── día del mes (1 - 31)
│ │ │ ┌───────────── mes (1 - 12)
│ │ │ │ ┌───────────── día de la semana (0 - 6) (Domingo = 0)
│ │ │ │ │
* * * * *
```

### Ejemplos Comunes:

| Expresión | Significado |
|-----------|-------------|
| `0 9 * * *` | Todos los días a las 9:00 AM |
| `0 */6 * * *` | Cada 6 horas |
| `0 0 * * 0` | Cada domingo a medianoche |
| `0 18 * * 1-5` | Lunes a viernes a las 6:00 PM |

---

## ✅ Verificar Funcionamiento

### Prueba Manual

Puedes probar los endpoints directamente en el navegador o con curl:

```bash
# Probar cobranzas
curl "https://fideliqr-full-v1.vercel.app/api/cron/cobranzas?secret=TU-SECRETO"

# Probar marketing
curl "https://fideliqr-full-v1.vercel.app/api/cron/marketing?secret=TU-SECRETO"
```

### Ver Logs

En cron-job.org:
1. Ve a **Dashboard**
2. Haz clic en el nombre del job
3. Ve a la pestaña **Executions**
4. Verás el historial de ejecuciones y sus resultados

---

## 🔄 Alternativas Gratuitas

Si prefieres otras opciones:

| Servicio | Límite Gratis | Documentación |
|----------|---------------|---------------|
| [cron-job.org](https://cron-job.org) | Ilimitado | Este documento |
| [UptimeRobot](https://uptimerobot.com) | 50 monitors, cada 5 min | [Docs](https://uptimerobot.com/api/) |
| [EasyCron](https://easycron.com) | 1 job gratis | [Docs](https://easycron.com/document) |
| [GitHub Actions](https://github.com/features/actions) | 2000 min/mes | Requiere repo GitHub |

---

## ⚠️ Seguridad

- **NUNCA** compartas tu `CRON_SECRET`
- Cambia el secreto periódicamente
- Usa HTTPS (siempre obligatorio en Vercel)
- Revisa los logs regularmente

---

## 📊 Respuesta Esperada

Cuando el cron se ejecuta correctamente, recibirás una respuesta como:

```json
{
  "success": true,
  "fecha": "2024-01-15T09:00:00.000Z",
  "duracion": "1523ms",
  "cobranzasVencidas": 5,
  "recordatoriosEnviados": 4,
  "marcadasComoVencidas": 1,
  "detalles": [
    "Se encontraron 5 cobranzas vencidas",
    "✅ Recordatorio enviado a Juan Pérez - Cuota enero",
    "..."
  ]
}
```
