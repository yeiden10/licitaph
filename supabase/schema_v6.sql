-- ============================================================
-- LicitaPH — Schema v6: Verificación de documentos KYC
-- Ejecutar DESPUÉS de schema_v5.sql en Supabase SQL Editor
-- ============================================================

-- ─── AMPLIAR: documentos — agregar estado de verificación ────
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT,
  ADD COLUMN IF NOT EXISTS revisado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS revisado_en TIMESTAMPTZ;

-- ─── RLS: superadmin puede leer todos los documentos ─────────
-- (asumimos que la tabla documentos ya tiene RLS habilitado)
DROP POLICY IF EXISTS "docs_superadmin_all" ON public.documentos;
CREATE POLICY "docs_superadmin_all" ON public.documentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_user_meta_data->>'tipo_usuario') = 'superadmin'
    )
  );

-- ─── ÍNDICES nuevos ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documentos_entidad ON public.documentos(entidad_id, entidad_tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON public.documentos(estado);

-- ─── FIN SCHEMA V6 ───────────────────────────────────────────
