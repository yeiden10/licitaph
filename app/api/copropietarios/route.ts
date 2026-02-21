import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/copropietarios — lista copropietarios del PH del admin autenticado
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = user.user_metadata?.tipo_usuario;

  if (tipo === "ph_admin") {
    const { data: ph } = await supabase
      .from("propiedades_horizontales")
      .select("id")
      .eq("admin_id", user.id)
      .single();

    if (!ph) return NextResponse.json({ error: "PH no encontrado" }, { status: 404 });

    const { data, error } = await supabase
      .from("copropietarios")
      .select("*")
      .eq("ph_id", ph.id)
      .order("creado_en", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Copropietario ve los PHs donde está registrado
  if (tipo === "copropietario") {
    const { data, error } = await supabase
      .from("copropietarios")
      .select("*, propiedades_horizontales(id, nombre, ciudad, logo_url)")
      .eq("usuario_id", user.id)
      .eq("activo", true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "No autorizado" }, { status: 403 });
}

// POST /api/copropietarios — agregar copropietario (solo ph_admin)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "Solo el administrador del PH puede agregar copropietarios" }, { status: 401 });
  }

  const { email, nombre, unidad } = await request.json();

  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("id")
    .eq("admin_id", user.id)
    .single();

  if (!ph) return NextResponse.json({ error: "PH no encontrado" }, { status: 404 });

  // Buscar si ya existe un usuario con ese email en auth
  // (Solo podemos buscar en perfiles para evitar exponer auth.users directamente)
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  const { data, error } = await supabase
    .from("copropietarios")
    .upsert(
      {
        ph_id: ph.id,
        email: email.toLowerCase().trim(),
        nombre: nombre?.trim() || null,
        unidad: unidad?.trim() || null,
        usuario_id: perfil?.id || null,
        activo: true,
        agregado_por: user.id,
      },
      { onConflict: "ph_id,email" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, copropietario: data });
}
