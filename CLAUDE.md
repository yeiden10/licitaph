# LicitaPH — Sistema de Agentes para Claude

## Qué es este proyecto

Plataforma de licitaciones para Propiedades Horizontales (PHs) en Panamá.
Permite a administradores publicar licitaciones y recibir propuestas de empresas verificadas.

**URL producción:** https://licitaph.vercel.app
**Supabase:** https://iamwobdseodeaacjavql.supabase.co
**Repo:** https://github.com/yeiden10/licitaph

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | **CSS-in-JS inline ÚNICAMENTE** — NUNCA usar Tailwind ni CSS modules |
| Backend | Next.js API Routes |
| DB | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth (JWT, cookies via @supabase/ssr) |
| Storage | Supabase Storage |
| Email | Resend (`re_V2RAC3qn_Pf82tFgGtunFyEWrS2xsNefB`) |
| Deploy | Vercel |

---

## Design tokens (SIEMPRE usar estos colores)

```typescript
const C = {
  bg:      "#07090F",   // fondo principal
  bgCard:  "#0D1117",   // tarjetas
  bgPanel: "#111827",   // paneles internos
  border:  "#1F2937",   // bordes
  gold:    "#C9A84C",   // acento principal (PH admin)
  goldDim: "#2D2310",   // fondo gold suave
  blue:    "#4A9EFF",   // acento empresa
  green:   "#4ADE80",   // éxito / contratos
  red:     "#F87171",   // error / urgente
  text:    "#F0F4FF",   // texto principal
  muted:   "#6B7280",   // texto secundario
  sub:     "#9CA3AF",   // labels, captions
};
```

---

## Estructura de archivos

```
app/
  page.tsx                          — Landing + auth (login/registro)
  ph/
    page.tsx                        — Dashboard PH admin
    nueva-licitacion/page.tsx       — Wizard 3 pasos crear licitación
  empresa/
    page.tsx                        — Dashboard empresa
  licitacion/[slug]/page.tsx        — Portal público (sin auth)
  api/
    licitaciones/route.ts           — GET/POST licitaciones
    licitaciones/[id]/route.ts      — GET/PATCH licitación
    licitaciones/[id]/adjudicar/    — POST adjudicar ganador
    propuestas/route.ts             — GET/POST propuestas
    documentos/upload/route.ts      — POST subir archivo
    email/notify/route.ts           — POST enviar emails

lib/supabase/
  client.ts     — createBrowserClient (@supabase/ssr)
  server.ts     — createServerClient con cookies
  types.ts      — Interfaces TypeScript + constantes

proxy.ts        — Auth guard (ph_admin→/ph, empresa→/empresa)
supabase/
  schema_v2.sql — Migración aditiva ejecutada en Supabase
```

---

## Tablas Supabase (columnas exactas)

### perfiles
`id, nombre_completo, email, telefono, tipo_usuario, avatar_url, creado_en`

### propiedades_horizontales
`id, nombre, direccion, ciudad, provincia, ruc, telefono, email_contacto, descripcion, total_unidades, logo_url, admin_id, activo, creado_en`

### empresas
`id, usuario_id, nombre, ruc, representante_legal, email, telefono, direccion, sitio_web, descripcion, anios_experiencia, logo_url, categorias, estado_verificacion, calificacion_promedio, total_contratos_ganados, activo, creado_en`

### licitaciones
`id, ph_id, titulo, descripcion, categoria, presupuesto_minimo, presupuesto_maximo, duracion_contrato_meses, fecha_publicacion, fecha_cierre, fecha_adjudicacion, estado, urgente, url_slug, minimo_propuestas, empresa_ganadora_id, creado_por, creado_en`
- estado: `borrador | activa | en_evaluacion | adjudicada | cancelada`

### propuestas
`id, licitacion_id, empresa_id, precio_anual, descripcion, propuesta_tecnica, puntaje_ia, analisis_ia, requisitos_cumplidos, disponibilidad_inicio, estado, enviada_at, creado_en`
- estado: `borrador | enviada | en_revision | ganada | no_seleccionada`

### requisitos_licitacion
`id, licitacion_id, titulo, descripcion, nivel_importancia, orden, numero, subsanable, obligatorio, tipo_respuesta`

### respuestas_requisito
`id, propuesta_id, requisito_id, storage_path, nombre_archivo, texto_respuesta, estado, creado_en`

### contratos
`id, licitacion_id, propuesta_id, ph_id, empresa_id, valor_anual, monto_mensual, fecha_inicio, fecha_fin, estado, alerta_dias, notas, storage_path, creado_en`

### documentos
`id, nombre, url, tipo, entidad_tipo, entidad_id, subido_por, creado_en`

### notificaciones
`id, usuario_id, titulo, mensaje, tipo, leida, enlace, creado_en`

---

## Reglas críticas

1. **CSS:** SIEMPRE inline styles. NUNCA Tailwind, clases CSS, o CSS modules.
2. **Supabase cliente:** Usar `@/lib/supabase/client` (no `@supabase/supabase-js` directo).
3. **Supabase servidor:** Usar `@/lib/supabase/server` en API routes y Server Components.
4. **Columnas:** Respetar nombres exactos de columnas (ej: `usuario_id`, no `user_id`; `creado_en`, no `created_at`).
5. **Auth:** El `tipo_usuario` viene de `user.user_metadata?.tipo_usuario`.
6. **Notificaciones:** Usar `usuario_id` y `enlace` (no `user_id` ni `metadata`).
7. **Build:** Siempre verificar con `npm run build` antes de hacer push.

---

## Sistema de Agentes

### Flujo de trabajo estándar

```
Usuario → Orquestador (Claude)
              │
              ├── [Analyst]    Lee código, entiende estado actual
              ├── [Architect]  Propone diseño, identifica impacto en DB
              ├── [Backend]    Implementa API routes, queries Supabase
              ├── [Frontend]   Implementa UI, componentes, CSS-in-JS
              └── [QA]         Ejecuta build, detecta bugs, verifica tipos
```

### Cuándo usar cada agente

| Agente | Cuándo |
|--------|--------|
| **Analyst** | Antes de cambiar código — entender qué existe |
| **Architect** | Nuevas features — diseñar DB, endpoints, componentes |
| **Backend** | API routes, lógica Supabase, validaciones |
| **Frontend** | UI, modales, formularios, CSS-in-JS |
| **QA** | Después de todo cambio — `npm run build`, edge cases |

### Protocolo por tarea

**Tarea pequeña** (fix de bug, ajuste visual):
→ Analyst + Frontend/Backend en paralelo → QA

**Tarea mediana** (nueva pantalla, nuevo endpoint):
→ Analyst → Architect → Backend + Frontend en paralelo → QA

**Tarea grande** (nuevo módulo, cambio de schema):
→ Analyst → Architect (incluye SQL) → Backend → Frontend → QA → Deploy

---

## Features pendientes (prioridad)

1. **Panel superadmin** — verificar empresas, moderar licitaciones
2. **Vista copropietario** — transparencia read-only
3. **AI scoring real** — reemplazar calcularPuntajeIA() con Claude API
4. **Reviews** — calificaciones post-contrato entre PH y empresa
5. **Mobile responsive** — breakpoints en todas las páginas
6. **Búsqueda y filtros** — full-text search en licitaciones
7. **Generación de contrato PDF** — template automático al adjudicar
8. **Verificación de documentos** — flujo KYC con aprobación manual

---

## Comandos útiles

```bash
npm run dev      # desarrollo local (localhost:3000)
npm run build    # verificar antes de push
git push         # Vercel auto-deploya en ~1 min
```

## Variables de entorno (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://iamwobdseodeaacjavql.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
RESEND_API_KEY=re_V2RAC3qn_Pf82tFgGtunFyEWrS2xsNefB
NEXT_PUBLIC_APP_URL=https://licitaph.vercel.app
```
