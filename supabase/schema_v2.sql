-- ============================================================
-- LicitaPH — Schema v2: Migración aditiva CORREGIDA
-- Basada en columnas reales detectadas vía API REST
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ─── EXTENSIONES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── AMPLIAR TABLA: licitaciones ────────────────────────────
-- Agrega columnas que no existen aún
ALTER TABLE public.licitaciones
  ADD COLUMN IF NOT EXISTS urgente BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS url_slug TEXT UNIQUE;

-- Generar slugs para licitaciones existentes que no lo tengan
UPDATE public.licitaciones
SET url_slug = lower(regexp_replace(
  regexp_replace(titulo, '[^a-zA-Z0-9\s]', '', 'g'),
  '\s+', '-', 'g'
)) || '-' || substr(id::text, 1, 8)
WHERE url_slug IS NULL;

-- ─── AMPLIAR TABLA: requisitos_licitacion ───────────────────
-- La tabla real solo tiene: id, licitacion_id, descripcion, nivel_importancia, orden
-- Agregamos las columnas que necesitamos
ALTER TABLE public.requisitos_licitacion
  ADD COLUMN IF NOT EXISTS titulo TEXT,
  ADD COLUMN IF NOT EXISTS subsanable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS obligatorio BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tipo_respuesta TEXT DEFAULT 'documento' CHECK (tipo_respuesta IN ('documento', 'texto', 'numero', 'seleccion')),
  ADD COLUMN IF NOT EXISTS numero INT;

-- Poblar numero desde orden si existe
UPDATE public.requisitos_licitacion
SET numero = orden WHERE numero IS NULL AND orden IS NOT NULL;

-- Poblar titulo desde descripcion si existe
UPDATE public.requisitos_licitacion
SET titulo = LEFT(descripcion, 100) WHERE titulo IS NULL;

-- ─── AMPLIAR TABLA: propuestas ──────────────────────────────
-- La tabla real tiene: id, licitacion_id, empresa_id, precio_anual, descripcion,
--   propuesta_tecnica, puntaje_ia, analisis_ia, requisitos_cumplidos, estado, creado_en, actualizado_en
ALTER TABLE public.propuestas
  ADD COLUMN IF NOT EXISTS disponibilidad_inicio DATE,
  ADD COLUMN IF NOT EXISTS enviada_at TIMESTAMPTZ;

-- Sincronizar enviada_at con creado_en para propuestas existentes enviadas
UPDATE public.propuestas
SET enviada_at = creado_en
WHERE enviada_at IS NULL AND estado IN ('enviada', 'en_revision', 'ganada', 'no_seleccionada');

-- ─── AMPLIAR TABLA: contratos ────────────────────────────────
-- La tabla real tiene: id, licitacion_id, ph_id, empresa_id, valor_anual,
--   fecha_inicio, fecha_fin, estado, alerta_dias, notas, creado_en
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS propuesta_id UUID REFERENCES public.propuestas(id),
  ADD COLUMN IF NOT EXISTS monto_mensual NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Calcular monto_mensual desde valor_anual existente
UPDATE public.contratos
SET monto_mensual = valor_anual / 12
WHERE monto_mensual IS NULL AND valor_anual IS NOT NULL;

-- ─── NUEVA TABLA: respuestas_requisito ──────────────────────
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
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
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
      WHERE e.usuario_id = auth.uid()
    )
  );
CREATE POLICY "resp_ph_admin_select" ON public.respuestas_requisito
  FOR SELECT USING (
    propuesta_id IN (
      SELECT pr.id FROM public.propuestas pr
      JOIN public.licitaciones l ON pr.licitacion_id = l.id
      JOIN public.propiedades_horizontales ph ON l.ph_id = ph.id
      WHERE ph.admin_id = auth.uid()
    )
  );

-- ─── RLS: notificaciones ─────────────────────────────────────
-- La tabla YA EXISTE con columnas: id, usuario_id, titulo, mensaje, tipo, leida, enlace, creado_en
-- Solo habilitamos RLS y creamos policies
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_own" ON public.notificaciones;
CREATE POLICY "notif_own" ON public.notificaciones
  FOR ALL USING (usuario_id = auth.uid());

-- ─── TRIGGER: crear perfiles automáticamente ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email, tipo_usuario)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'empresa')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── TRIGGER: auto-crear empresa o PH al registrarse ─────────
CREATE OR REPLACE FUNCTION public.handle_empresa_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_usuario = 'empresa' THEN
    INSERT INTO public.empresas (usuario_id, nombre, email)
    VALUES (NEW.id, NEW.nombre_completo, NEW.email)
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.tipo_usuario = 'ph_admin' THEN
    INSERT INTO public.propiedades_horizontales (admin_id, nombre)
    VALUES (NEW.id, NEW.nombre_completo)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_perfil_created ON public.perfiles;
CREATE TRIGGER on_perfil_created
  AFTER INSERT ON public.perfiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_empresa_profile();

-- ─── RLS: perfiles ────────────────────────────────────────────
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_insert" ON public.perfiles;

CREATE POLICY "perfiles_select_own" ON public.perfiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfiles_update_own" ON public.perfiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "perfiles_insert" ON public.perfiles
  FOR INSERT WITH CHECK (true);

-- ─── RLS: propiedades_horizontales ────────────────────────────
ALTER TABLE public.propiedades_horizontales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ph_admin_all" ON public.propiedades_horizontales;
DROP POLICY IF EXISTS "ph_public_select" ON public.propiedades_horizontales;

CREATE POLICY "ph_admin_all" ON public.propiedades_horizontales
  FOR ALL USING (admin_id = auth.uid());
CREATE POLICY "ph_public_select" ON public.propiedades_horizontales
  FOR SELECT USING (true);

-- ─── RLS: licitaciones ────────────────────────────────────────
ALTER TABLE public.licitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lic_ph_admin" ON public.licitaciones;
DROP POLICY IF EXISTS "lic_empresa_select_activa" ON public.licitaciones;

CREATE POLICY "lic_ph_admin" ON public.licitaciones
  FOR ALL USING (
    ph_id IN (SELECT id FROM public.propiedades_horizontales WHERE admin_id = auth.uid())
  );
CREATE POLICY "lic_empresa_select_activa" ON public.licitaciones
  FOR SELECT USING (estado IN ('activa', 'adjudicada'));

-- ─── RLS: propuestas ─────────────────────────────────────────
ALTER TABLE public.propuestas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prop_empresa_own" ON public.propuestas;
DROP POLICY IF EXISTS "prop_ph_admin_select" ON public.propuestas;

CREATE POLICY "prop_empresa_own" ON public.propuestas
  FOR ALL USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE usuario_id = auth.uid())
  );
CREATE POLICY "prop_ph_admin_select" ON public.propuestas
  FOR SELECT USING (
    licitacion_id IN (
      SELECT l.id FROM public.licitaciones l
      JOIN public.propiedades_horizontales ph ON l.ph_id = ph.id
      WHERE ph.admin_id = auth.uid()
    )
  );

-- ─── RLS: empresas ────────────────────────────────────────────
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa_select_own" ON public.empresas;
DROP POLICY IF EXISTS "empresa_public_select" ON public.empresas;

CREATE POLICY "empresa_select_own" ON public.empresas
  FOR ALL USING (usuario_id = auth.uid());
CREATE POLICY "empresa_public_select" ON public.empresas
  FOR SELECT USING (true);

-- ─── RLS: documentos ─────────────────────────────────────────
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_own" ON public.documentos;
DROP POLICY IF EXISTS "doc_ph_select" ON public.documentos;

CREATE POLICY "doc_own" ON public.documentos
  FOR ALL USING (subido_por = auth.uid());
CREATE POLICY "doc_ph_select" ON public.documentos
  FOR SELECT USING (true);

-- ─── RLS: requisitos_licitacion ──────────────────────────────
ALTER TABLE public.requisitos_licitacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "req_ph_admin" ON public.requisitos_licitacion;
DROP POLICY IF EXISTS "req_public_select" ON public.requisitos_licitacion;

CREATE POLICY "req_ph_admin" ON public.requisitos_licitacion
  FOR ALL USING (
    licitacion_id IN (
      SELECT l.id FROM public.licitaciones l
      JOIN public.propiedades_horizontales ph ON l.ph_id = ph.id
      WHERE ph.admin_id = auth.uid()
    )
  );
CREATE POLICY "req_public_select" ON public.requisitos_licitacion
  FOR SELECT USING (
    licitacion_id IN (
      SELECT id FROM public.licitaciones WHERE estado IN ('activa', 'adjudicada')
    )
  );

-- ─── RLS: contratos ──────────────────────────────────────────
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contrato_ph_admin" ON public.contratos;
DROP POLICY IF EXISTS "contrato_empresa" ON public.contratos;

CREATE POLICY "contrato_ph_admin" ON public.contratos
  FOR ALL USING (
    ph_id IN (SELECT id FROM public.propiedades_horizontales WHERE admin_id = auth.uid())
  );
CREATE POLICY "contrato_empresa" ON public.contratos
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE usuario_id = auth.uid())
  );

-- ─── VISTA: licitaciones públicas ─────────────────────────────
CREATE OR REPLACE VIEW public.licitaciones_publicas AS
SELECT
  l.id,
  l.titulo,
  l.categoria,
  l.descripcion,
  l.presupuesto_minimo,
  l.presupuesto_maximo,
  l.fecha_publicacion,
  l.fecha_cierre,
  l.estado,
  l.urgente,
  l.url_slug,
  ph.nombre AS ph_nombre,
  ph.ciudad AS ph_ciudad,
  (SELECT COUNT(*) FROM public.propuestas pr
   WHERE pr.licitacion_id = l.id AND pr.estado != 'borrador') AS total_propuestas
FROM public.licitaciones l
JOIN public.propiedades_horizontales ph ON l.ph_id = ph.id
WHERE l.estado IN ('activa', 'adjudicada');

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_licitaciones_ph ON public.licitaciones(ph_id);
CREATE INDEX IF NOT EXISTS idx_licitaciones_estado ON public.licitaciones(estado);
CREATE INDEX IF NOT EXISTS idx_licitaciones_slug ON public.licitaciones(url_slug);
CREATE INDEX IF NOT EXISTS idx_propuestas_lic ON public.propuestas(licitacion_id);
CREATE INDEX IF NOT EXISTS idx_propuestas_emp ON public.propuestas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_ph ON public.contratos(ph_id);
CREATE INDEX IF NOT EXISTS idx_contratos_emp ON public.contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_usuario ON public.notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_req_lic ON public.requisitos_licitacion(licitacion_id);

-- ─── FIN SCHEMA V2 CORREGIDO ──────────────────────────────────
-- Columnas reales confirmadas vía API REST antes de migrar
-- notificaciones: usa usuario_id, enlace, creado_en (no user_id/metadata/created_at)
-- propuestas: usa precio_anual (no monto_mensual), creado_en
-- contratos: usa valor_anual (no precio_anual), creado_en
-- empresas: usa usuario_id (no user_id)
