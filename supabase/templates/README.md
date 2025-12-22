# Plantillas de Email para Supabase Auth

Este directorio contiene las plantillas HTML personalizadas para los emails de autenticacion de Supabase.

## Configuracion en Supabase Dashboard

### 1. Configurar SMTP Custom (Resend)

1. Ve a **Supabase Dashboard** → Tu proyecto → **Authentication** → **Configuration** → **SMTP Settings**
2. Activa **Enable Custom SMTP**
3. Configura los siguientes valores:

| Campo | Valor |
|-------|-------|
| Sender email | `noreply@zuclubit.com` |
| Sender name | `Ventazo CRM` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Minimum interval | `60` |
| User | `resend` |
| Password | `re_XXXXXXX...` (tu API key de Resend) |

> **Nota:** El email del remitente debe ser de un dominio verificado en Resend.

### 2. Personalizar Plantillas de Email

1. Ve a **Authentication** → **Email Templates**
2. Para cada tipo de email, copia el contenido HTML de los archivos de este directorio

#### Plantillas disponibles:

| Archivo | Tipo de Email | Subject Recomendado |
|---------|---------------|---------------------|
| `confirm-signup.html` | Confirm signup | `Confirma tu cuenta - Ventazo CRM` |
| `reset-password.html` | Reset password | `Restablecer contrasena - Ventazo CRM` |
| `magic-link.html` | Magic Link | `Tu enlace de acceso - Ventazo CRM` |
| `change-email.html` | Change Email Address | `Confirmar cambio de email - Ventazo CRM` |

### 3. Variables disponibles en las plantillas

Supabase inyecta automaticamente estas variables en las plantillas:

| Variable | Descripcion |
|----------|-------------|
| `{{ .ConfirmationURL }}` | URL de confirmacion/accion |
| `{{ .Email }}` | Email del usuario |
| `{{ .SiteURL }}` | URL del sitio configurado |
| `{{ .Token }}` | Token de verificacion (OTP) |
| `{{ .TokenHash }}` | Hash del token |
| `{{ .RedirectTo }}` | URL de redireccion |

### 4. Probar la configuracion

1. Registra un nuevo usuario en https://crm.zuclubit.com/register
2. Verifica que el email llegue con el diseno personalizado
3. Prueba que el enlace de confirmacion funcione correctamente

## Verificar dominio en Resend

Para que los emails no lleguen a spam, verifica tu dominio en Resend:

1. Ve a [Resend Dashboard](https://resend.com/domains)
2. Agrega tu dominio (`zuclubit.com`)
3. Configura los registros DNS (SPF, DKIM, DMARC)
4. Espera la verificacion

## Notas importantes

- Los emails de autenticacion son enviados por **Supabase Auth**, no por tu backend
- Tu backend con `ResendProvider` se usa para otros emails (notificaciones, invitaciones, etc.)
- Las plantillas usan el color primario de Ventazo: `#0d9488` (teal)
- Todas las plantillas son responsive y funcionan en clientes de email antiguos
