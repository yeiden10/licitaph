-- ============================================================
-- LicitaPH — Schema v7: Copropietarios
-- Ejecutar DESPUÉS de schema_v6.sql en Supabase SQL Editor
-- ============================================================

-- ─── TABLA: copropietarios ────────────────────────────────────
-- Vincula copropietarios (usuarios auth) a una PH específica.
-- El ph_admin los agrega manualmente por email.
CREATE TABLE IF NOT EXISTS public.copropietarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ph_id         UUID NOT NULL REFERENCES public.propiedades_horizontales(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email         TEXT NOT NULL,                  -- email invitado (antes de que tenga cuenta)
  nombre        TEXT,                           -- nombre para mostrar
  unidad        TEXT,                           -- ej: "Apto 4B", "Torre 2 Piso 8"
  activo        BOOLEAN DEFAULT TRUE,
  agregado_por  UUID REFERENCES auth.users(id), -- ph_admin que lo agregó
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ph_id, email)
);

-- RLS copropietarios
ALTER TABLE public.copropietarios ENABLE ROW LEVEL SECURITY;

-- PH admin puede ver y gestionar los copropietarios de su PH
DROP POLICY IF EXISTS "coprop_ph_admin" ON public.copropietarios;
CREATE POLICY "coprop_ph_admin" ON public.copropietarios
  FOR ALL USING (
    ph_id IN (
      SELECT id FROM public.propiedades_horizontales
      WHERE admin_id = auth.uid()
    )
  );

-- Copropietario puede ver su propio registro
DROP POLICY IF EXISTS "coprop_self" ON public.copropietarios;
CREATE POLICY "coprop_self" ON public.copropietarios
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Superadmin puede ver todo
DROP POLICY IF EXISTS "coprop_superadmin" ON public.copropietarios;
CREATE POLICY "coprop_superadmin" ON public.copropietarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND (auth.users.raw_user_meta_data->>'tipo_usuario') = 'superadmin'
    )
  );

-- ─── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_copropietarios_ph ON public.copropietarios(ph_id);
CREATE INDEX IF NOT EXISTS idx_copropietarios_usuario ON public.copropietarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_copropietarios_email ON public.copropietarios(email);

-- ─── FIN SCHEMA V7 ────────────────────────────────────────────
