-- ============================================================
-- LicitaPH — Schema v5: Reviews post-contrato
-- Ejecutar DESPUÉS de schema_v4.sql en Supabase SQL Editor
-- ============================================================

-- ─── TABLA: reviews ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contrato_id       UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  autor_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_tipo        TEXT NOT NULL CHECK (autor_tipo IN ('ph', 'empresa')),
  destinatario_id   UUID NOT NULL,
  destinatario_tipo TEXT NOT NULL CHECK (destinatario_tipo IN ('ph', 'empresa')),
  puntaje           INT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario        TEXT,
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  -- Solo 1 reseña por contrato por parte de cada actor
  UNIQUE (contrato_id, autor_tipo)
);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_read_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;

-- Cualquier autenticado puede leer reseñas
CREATE POLICY "reviews_read_all" ON public.reviews
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo puedes insertar reseñas propias (tu autor_id = tu uid)
CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK (autor_id = auth.uid());

-- Solo puedes editar tus propias reseñas
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (autor_id = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS idx_reviews_contrato ON public.reviews(contrato_id);
CREATE INDEX IF NOT EXISTS idx_reviews_destinatario ON public.reviews(destinatario_id, destinatario_tipo);
CREATE INDEX IF NOT EXISTS idx_reviews_autor ON public.reviews(autor_id);

-- ─── FIN SCHEMA V5 ────────────────────────────────────────────
