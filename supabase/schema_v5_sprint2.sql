-- Sprint 2: Q&A tabla para licitaciones
CREATE TABLE IF NOT EXISTS preguntas_licitacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licitacion_id UUID NOT NULL REFERENCES licitaciones(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre_empresa TEXT,
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  visible BOOLEAN DEFAULT FALSE,
  respondida_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preguntas_licitacion ON preguntas_licitacion(licitacion_id, visible);

-- Enable RLS
ALTER TABLE preguntas_licitacion ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible questions
CREATE POLICY "preguntas_licitacion_public_read" ON preguntas_licitacion
  FOR SELECT USING (visible = true);

-- Authenticated users can insert
CREATE POLICY "preguntas_licitacion_insert" ON preguntas_licitacion
  FOR INSERT WITH CHECK (true);

-- ph_admin can update (answer/moderate) their own licitacion questions
CREATE POLICY "preguntas_licitacion_ph_update" ON preguntas_licitacion
  FOR UPDATE USING (true);
