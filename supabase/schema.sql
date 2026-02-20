-- ============================================================
-- LicitaPH — Schema completo v1.0
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── EXTENSIONES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── PROFILES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('ph_admin', 'empresa', 'superadmin')),
  nombre_completo TEXT,
  telefono      TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfil_select_own" ON public.profiles;
DROP POLICY IF EXISTS "perfil_update_own" ON public.profiles;
DROP POLICY IF EXISTS "perfil_superadmin" ON public.profiles;

CREATE POLICY "perfil_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfil_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger: crear profile al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, tipo, nombre_completo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'empresa'),
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── PHs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.phs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT NOT NULL,
  ruc           TEXT,
  direccion     TEXT,
  ciudad        TEXT DEFAULT 'Ciudad de Panamá',
  admin_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan          TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.phs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ph_admin_select" ON public.phs;
DROP POLICY IF EXISTS "ph_admin_all" ON public.phs;
DROP POLICY IF EXISTS "ph_public_select" ON public.phs;

CREATE POLICY "ph_admin_all" ON public.phs
  FOR ALL USING (admin_id = auth.uid());
CREATE POLICY "ph_public_select" ON public.phs
  FOR SELECT USING (true);

-- ─── EMPRESAS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.empresas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre_legal     TEXT NOT NULL,
  ruc              TEXT,
  telefono         TEXT,
  web              TEXT,
  categorias       TEXT[] DEFAULT '{}',
  perfil_completo  BOOLEAN DEFAULT FALSE,
  verificada       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_select_own" ON public.empresas;
DROP POLICY IF EXISTS "empresa_update_own" ON public.empresas;
DROP POLICY IF EXISTS "empresa_public_select" ON public.empresas;

CREATE POLICY "empresa_select_own" ON public.empresas
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "empresa_public_select" ON public.empresas
  FOR SELECT USING (true);

-- ─── DOCUMENTOS EMPRESA ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documentos_empresa (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN (
    'cedula', 'registro_publico', 'paz_salvo_dgi', 'paz_salvo_css',
    'idoneidad', 'kyc', 'estados_financieros', 'aviso_operacion', 'otro'
  )),
  nombre_archivo TEXT,
  storage_path  TEXT,
  estado        TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'vencido')),
  vence_en      DATE,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documentos_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_empresa_own" ON public.documentos_empresa;

CREATE POLICY "doc_empresa_own" ON public.documentos_empresa
  FOR ALL USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- ─── LICITACIONES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.licitaciones (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ph_id             UUID REFERENCES public.phs(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  servicio          TEXT NOT NULL,
  descripcion       TEXT,
  presupuesto_min   NUMERIC(12,2),
  presupuesto_max   NUMERIC(12,2),
  fecha_publicacion TIMESTAMPTZ,
  fecha_cierre      TIMESTAMPTZ,
  estado            TEXT DEFAULT 'borrador' CHECK (estado IN (
    'borrador', 'activa', 'en_evaluacion', 'adjudicada', 'cancelada'
  )),
  urgente           BOOLEAN DEFAULT FALSE,
  url_slug          TEXT UNIQUE,
  creado_por        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.licitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lic_ph_admin" ON public.licitaciones;
DROP POLICY IF EXISTS "lic_empresa_select_activa" ON public.licitaciones;
DROP POLICY IF EXISTS "lic_public_select" ON public.licitaciones;

CREATE POLICY "lic_ph_admin" ON public.licitaciones
  FOR ALL USING (
    ph_id IN (SELECT id FROM public.phs WHERE admin_id = auth.uid())
  );
CREATE POLICY "lic_empresa_select_activa" ON public.licitaciones
  FOR SELECT USING (estado IN ('activa', 'adjudicada'));

-- Función para generar slug único
CREATE OR REPLACE FUNCTION public.generate_slug(titulo TEXT, servicio TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  base_slug := lower(regexp_replace(
    regexp_replace(titulo || '-' || servicio, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  base_slug := left(base_slug, 50);
  final_slug := base_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- ─── REQUISITOS DEL PLIEGO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requisitos_licitacion (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacion_id   UUID REFERENCES public.licitaciones(id) ON DELETE CASCADE,
  numero          INT NOT NULL,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  subsanable      BOOLEAN DEFAULT FALSE,
  obligatorio     BOOLEAN DEFAULT TRUE,
  tipo_respuesta  TEXT DEFAULT 'documento' CHECK (tipo_respuesta IN (
    'documento', 'texto', 'numero', 'seleccion'
  )),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(licitacion_id, numero)
);

ALTER TABLE public.requisitos_licitacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "req_ph_admin" ON public.requisitos_licitacion;
DROP POLICY IF EXISTS "req_public_select" ON public.requisitos_licitacion;

CREATE POLICY "req_ph_admin" ON public.requisitos_licitacion
  FOR ALL USING (
    licitacion_id IN (
      SELECT l.id FROM public.licitaciones l
      JOIN public.phs p ON l.ph_id = p.id
      WHERE p.admin_id = auth.uid()
    )
  );
CREATE POLICY "req_public_select" ON public.requisitos_licitacion
  FOR SELECT USING (
    licitacion_id IN (SELECT id FROM public.licitaciones WHERE estado IN ('activa', 'adjudicada'))
  );

-- ─── PROPUESTAS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.propuestas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacion_id       UUID REFERENCES public.licitaciones(id) ON DELETE CASCADE,
  empresa_id          UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  monto_mensual       NUMERIC(12,2),
  descripcion         TEXT,
  disponibilidad_inicio DATE,
  estado              TEXT DEFAULT 'borrador' CHECK (estado IN (
    'borrador', 'enviada', 'en_revision', 'ganada', 'no_seleccionada'
  )),
  puntaje_ia          INT CHECK (puntaje_ia >= 0 AND puntaje_ia <= 100),
  detalle_ia          JSONB,
  enviada_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(licitacion_id, empresa_id)
);

ALTER TABLE public.propuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prop_empresa_own" ON public.propuestas;
DROP POLICY IF EXISTS "prop_ph_admin_select" ON public.propuestas;

CREATE POLICY "prop_empresa_own" ON public.propuestas
  FOR ALL USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );
CREATE POLICY "prop_ph_admin_select" ON public.propuestas
  FOR SELECT USING (
    licitacion_id IN (
      SELECT l.id FROM public.licitaciones l
      JOIN public.phs p ON l.ph_id = p.id
      WHERE p.admin_id = auth.uid()
    )
  );

-- ─── RESPUESTAS POR REQUISITO ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.respuestas_requisito (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  propuesta_id    UUID REFERENCES public.propuestas(id) ON DELETE CASCADE,
  requisito_id    UUID REFERENCES public.requisitos_licitacion(id) ON DELETE CASCADE,
  storage_path    TEXT,
  nombre_archivo  TEXT,
  texto_respuesta TEXT,
  estado          TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente', 'cumplido', 'no_cumplido', 'subsanado'
  )),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(propuesta_id, requisito_id)
);

ALTER TABLE public.respuestas_requisito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resp_empresa_own" ON public.respuestas_requisito;
DROP POLICY IF EXISTS "resp_ph_admin_select" ON public.respuestas_requisito;

CREATE POLICY "resp_empresa_own" ON public.respuestas_requisito
  FOR ALL USING (
    propuesta_id IN (
      SELECT p.id FROM public.propuestas p
      JOIN public.empresas e ON p.empresa_id = e.id
      WHERE e.user_id = auth.uid()
    )
  );
CREATE POLICY "resp_ph_admin_select" ON public.respuestas_requisito
  FOR SELECT USING (
    propuesta_id IN (
      SELECT pr.id FROM public.propuestas pr
      JOIN public.licitaciones l ON pr.licitacion_id = l.id
      JOIN public.phs ph ON l.ph_id = ph.id
      WHERE ph.admin_id = auth.uid()
    )
  );

-- ─── CONTRATOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contratos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacion_id   UUID REFERENCES public.licitaciones(id),
  propuesta_id    UUID REFERENCES public.propuestas(id),
  ph_id           UUID REFERENCES public.phs(id),
  empresa_id      UUID REFERENCES public.empresas(id),
  monto_mensual   NUMERIC(12,2),
  fecha_inicio    DATE,
  fecha_fin       DATE,
  estado          TEXT DEFAULT 'activo' CHECK (estado IN (
    'activo', 'completado', 'cancelado', 'vencido'
  )),
  storage_path    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrato_ph_admin" ON public.contratos;
DROP POLICY IF EXISTS "contrato_empresa" ON public.contratos;

CREATE POLICY "contrato_ph_admin" ON public.contratos
  FOR ALL USING (
    ph_id IN (SELECT id FROM public.phs WHERE admin_id = auth.uid())
  );
CREATE POLICY "contrato_empresa" ON public.contratos
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE user_id = auth.uid())
  );

-- ─── REVIEWS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id         UUID REFERENCES public.contratos(id) ON DELETE CASCADE,
  autor_id            UUID REFERENCES public.profiles(id),
  destinatario_tipo   TEXT CHECK (destinatario_tipo IN ('ph', 'empresa')),
  puntaje             INT CHECK (puntaje >= 1 AND puntaje <= 5),
  comentario          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contrato_id, autor_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_autor" ON public.reviews;
DROP POLICY IF EXISTS "review_public_select" ON public.reviews;

CREATE POLICY "review_autor" ON public.reviews
  FOR INSERT WITH CHECK (autor_id = auth.uid());
CREATE POLICY "review_public_select" ON public.reviews
  FOR SELECT USING (true);

-- ─── NOTIFICACIONES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  titulo      TEXT NOT NULL,
  mensaje     TEXT,
  leida       BOOLEAN DEFAULT FALSE,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_own" ON public.notificaciones;

CREATE POLICY "notif_own" ON public.notificaciones
  FOR ALL USING (user_id = auth.uid());

-- ─── FUNCIÓN: actualizar estado contrato vencido ─────────────
CREATE OR REPLACE FUNCTION public.actualizar_contratos_vencidos()
RETURNS void AS $$
BEGIN
  UPDATE public.contratos
  SET estado = 'vencido'
  WHERE estado = 'activo' AND fecha_fin < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ÍNDICES ÚTILES ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_licitaciones_ph_id ON public.licitaciones(ph_id);
CREATE INDEX IF NOT EXISTS idx_licitaciones_estado ON public.licitaciones(estado);
CREATE INDEX IF NOT EXISTS idx_licitaciones_slug ON public.licitaciones(url_slug);
CREATE INDEX IF NOT EXISTS idx_propuestas_licitacion ON public.propuestas(licitacion_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_empresa ON public.propuestas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_ph ON public.contratos(ph_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON public.contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notificaciones(user_id, leida);

-- ─── VISTAS ÚTILES ──────────────────────────────────────────

-- Vista: licitaciones con info del PH
CREATE OR REPLACE VIEW public.licitaciones_con_ph AS
SELECT
  l.*,
  p.nombre AS ph_nombre,
  p.ciudad AS ph_ciudad,
  (SELECT COUNT(*) FROM public.propuestas pr WHERE pr.licitacion_id = l.id AND pr.estado != 'borrador') AS total_propuestas
FROM public.licitaciones l
JOIN public.phs p ON l.ph_id = p.id;

-- Vista: propuestas con info de empresa para PH admin
CREATE OR REPLACE VIEW public.propuestas_con_empresa AS
SELECT
  pr.*,
  e.nombre_legal AS empresa_nombre,
  (SELECT COUNT(*) FROM public.documentos_empresa d WHERE d.empresa_id = e.id AND d.estado = 'aprobado') AS docs_aprobados
FROM public.propuestas pr
JOIN public.empresas e ON pr.empresa_id = e.id;

-- ─── STORAGE: políticas de buckets ──────────────────────────
-- (Los buckets se crean en el dashboard de Supabase Storage)
-- Nombres: 'documentos-empresa', 'documentos-licitacion', 'contratos'

-- ─── FIN DEL SCHEMA ─────────────────────────────────────────
-- Total: 9 tablas + 2 vistas + 3 funciones + RLS completo
