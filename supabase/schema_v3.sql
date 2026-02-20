-- ============================================================
-- LicitaPH — Schema v3: Fixes críticos de RLS y triggers
-- Ejecutar DESPUÉS de schema_v2.sql en Supabase SQL Editor
-- ============================================================

-- ─── FIX PREVIO: hacer ruc nullable en empresas y propiedades_horizontales ──
-- El campo ruc tiene NOT NULL pero no lo tenemos al registro inicial
ALTER TABLE public.empresas
  ALTER COLUMN ruc DROP NOT NULL;

ALTER TABLE public.propiedades_horizontales
  ALTER COLUMN ruc DROP NOT NULL;

-- También otros campos que pueden ser NOT NULL innecesariamente
ALTER TABLE public.empresas
  ALTER COLUMN representante_legal DROP NOT NULL,
  ALTER COLUMN telefono DROP NOT NULL,
  ALTER COLUMN direccion DROP NOT NULL;

ALTER TABLE public.propiedades_horizontales
  ALTER COLUMN direccion DROP NOT NULL,
  ALTER COLUMN provincia DROP NOT NULL,
  ALTER COLUMN telefono DROP NOT NULL;

-- ─── FIX: Trigger que crea empresa/PH al registrarse ─────────
-- Reemplaza el trigger del schema_v2
-- Crea directamente desde auth.users así funciona siempre

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  tipo TEXT;
  nombre_usuario TEXT;
BEGIN
  tipo := COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'empresa');
  nombre_usuario := COALESCE(NEW.raw_user_meta_data->>'nombre_completo', split_part(NEW.email, '@', 1));

  -- 1. Crear perfil
  INSERT INTO public.perfiles (id, nombre_completo, email, tipo_usuario)
  VALUES (NEW.id, nombre_usuario, NEW.email, tipo)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Crear empresa si es tipo empresa
  IF tipo = 'empresa' THEN
    INSERT INTO public.empresas (usuario_id, nombre, email, estado_verificacion, activo)
    VALUES (NEW.id, nombre_usuario, NEW.email, 'pendiente', true)
    ON CONFLICT (usuario_id) DO NOTHING;
  END IF;

  -- 3. Crear PH si es ph_admin
  IF tipo = 'ph_admin' THEN
    INSERT INTO public.propiedades_horizontales (admin_id, nombre, email_contacto, ciudad, activo)
    VALUES (NEW.id, nombre_usuario, NEW.email, 'Ciudad de Panamá', true)
    ON CONFLICT (admin_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear trigger limpio en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── FIX: Unique constraint para evitar duplicados ─────────────
ALTER TABLE public.empresas
  DROP CONSTRAINT IF EXISTS empresas_usuario_id_key;
ALTER TABLE public.empresas
  ADD CONSTRAINT empresas_usuario_id_key UNIQUE (usuario_id);

ALTER TABLE public.propiedades_horizontales
  DROP CONSTRAINT IF EXISTS ph_admin_id_key;
ALTER TABLE public.propiedades_horizontales
  ADD CONSTRAINT ph_admin_id_key UNIQUE (admin_id);

-- ─── FIX: Backfill — crear empresa/PH para usuarios existentes ──
DO $$
DECLARE
  u RECORD;
  tipo TEXT;
  nombre_usuario TEXT;
BEGIN
  FOR u IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
  LOOP
    tipo := COALESCE(u.raw_user_meta_data->>'tipo_usuario', 'empresa');
    nombre_usuario := COALESCE(u.raw_user_meta_data->>'nombre_completo', split_part(u.email, '@', 1));

    -- Crear perfil si no existe
    INSERT INTO public.perfiles (id, nombre_completo, email, tipo_usuario)
    VALUES (u.id, nombre_usuario, u.email, tipo)
    ON CONFLICT (id) DO NOTHING;

    -- Crear empresa si es empresa y no existe
    IF tipo = 'empresa' THEN
      INSERT INTO public.empresas (usuario_id, nombre, email, estado_verificacion, activo)
      VALUES (u.id, nombre_usuario, u.email, 'pendiente', true)
      ON CONFLICT (usuario_id) DO NOTHING;
    END IF;

    -- Crear PH si es ph_admin y no existe
    IF tipo = 'ph_admin' THEN
      INSERT INTO public.propiedades_horizontales (admin_id, nombre, email_contacto, ciudad, activo)
      VALUES (u.id, nombre_usuario, u.email, 'Ciudad de Panamá', true)
      ON CONFLICT (admin_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ─── FIN SCHEMA V3 ────────────────────────────────────────────
-- Ejecutar en: https://supabase.com/dashboard/project/iamwobdseodeaacjavql/sql/new
