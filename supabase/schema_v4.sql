-- ============================================================
-- LicitaPH — Schema v4: Módulo de Licitaciones v2
-- Ejecutar DESPUÉS de schema_v3.sql en Supabase SQL Editor
-- ============================================================

-- ─── AMPLIAR: licitaciones ────────────────────────────────────
ALTER TABLE public.licitaciones
  ADD COLUMN IF NOT EXISTS fotos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fechas_inspeccion TIMESTAMPTZ[],
  ADD COLUMN IF NOT EXISTS lugar_inspeccion TEXT,
  ADD COLUMN IF NOT EXISTS precio_referencia NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_referencia_visible BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS condiciones_especiales TEXT;

-- ─── AMPLIAR: propuestas ─────────────────────────────────────
ALTER TABLE public.propuestas
  ADD COLUMN IF NOT EXISTS modalidad_pago TEXT DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS detalle_pago TEXT,
  ADD COLUMN IF NOT EXISTS acepta_condiciones BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acepta_inspeccion BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS acepta_penalidades BOOLEAN DEFAULT FALSE;

-- ─── AMPLIAR: contratos ──────────────────────────────────────
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS modalidad_pago TEXT,
  ADD COLUMN IF NOT EXISTS detalle_pago TEXT,
  ADD COLUMN IF NOT EXISTS penalidad_porcentaje NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS condiciones_especiales TEXT,
  ADD COLUMN IF NOT EXISTS estado_firma TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS empresa_acepto_at TIMESTAMPTZ;

-- ─── NUEVA TABLA: empresa_kyc ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.empresa_kyc (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                  UUID UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,

  -- Datos generales de la empresa
  ruc                         TEXT,
  ano_inicio_operaciones      INT,
  descripcion                 TEXT,
  sitio_web                   TEXT,
  actividades_economicas      TEXT[],
  categorias_servicio         TEXT[],

  -- Representante legal
  representante_nombre        TEXT,
  representante_cedula        TEXT,
  representante_tipo_id       TEXT, -- 'cedula_nacional' | 'pasaporte' | 'cedula_extranjera'
  representante_nacionalidad  TEXT,
  representante_email         TEXT,
  representante_telefono      TEXT,

  -- Contacto operativo
  contacto_nombre             TEXT,
  contacto_cargo              TEXT,
  contacto_email              TEXT,
  contacto_telefono           TEXT,

  -- Contacto contable
  contable_nombre             TEXT,
  contable_email              TEXT,
  contable_telefono           TEXT,

  -- Comunicaciones de la empresa
  emails_empresa              TEXT[],
  telefonos_empresa           TEXT[],
  direccion                   TEXT,
  ciudad                      TEXT,
  provincia                   TEXT,

  -- Capacidad financiera
  num_empleados               INT,
  facturacion_anual_promedio  NUMERIC(14,2),
  referencias_bancarias       TEXT,

  -- Seguros y garantías
  tiene_seguro_responsabilidad BOOLEAN DEFAULT FALSE,
  tiene_fianza_cumplimiento    BOOLEAN DEFAULT FALSE,
  porcentaje_fianza_ofrecido   NUMERIC(5,2),

  -- Referencias comerciales
  referencias_comerciales     TEXT,

  -- Estado del KYC
  completado                  BOOLEAN DEFAULT FALSE,
  porcentaje_completado       INT DEFAULT 0,
  creado_en                   TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en              TIMESTAMPTZ DEFAULT NOW()
);

-- RLS empresa_kyc
ALTER TABLE public.empresa_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_empresa_own" ON public.empresa_kyc;
DROP POLICY IF EXISTS "kyc_ph_select" ON public.empresa_kyc;

CREATE POLICY "kyc_empresa_own" ON public.empresa_kyc
  FOR ALL USING (
    empresa_id IN (SELECT id FROM public.empresas WHERE usuario_id = auth.uid())
  );

CREATE POLICY "kyc_ph_select" ON public.empresa_kyc
  FOR SELECT USING (true);

-- ─── ÍNDICES nuevos ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_empresa_kyc_empresa ON public.empresa_kyc(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado_firma ON public.contratos(estado_firma);

-- ─── FIN SCHEMA V4 ────────────────────────────────────────────
