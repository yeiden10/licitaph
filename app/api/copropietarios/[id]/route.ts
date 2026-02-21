import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/copropietarios/[id] — editar (nombre, unidad, activo)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Verificar que el copropietario pertenece al PH del admin
  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("id")
    .eq("admin_id", user.id)
    .single();

  if (!ph) return NextResponse.json({ error: "PH no encontrado" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if ("nombre" in body) updates.nombre = body.nombre;
  if ("unidad" in body) updates.unidad = body.unidad;
  if ("activo" in body) updates.activo = body.activo;

  const { data, error } = await supabase
    .from("copropietarios")
    .update(updates)
    .eq("id", id)
    .eq("ph_id", ph.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, copropietario: data });
}

// DELETE /api/copropietarios/[id] — eliminar copropietario
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("id")
    .eq("admin_id", user.id)
    .single();

  if (!ph) return NextResponse.json({ error: "PH no encontrado" }, { status: 404 });

  const { error } = await supabase
    .from("copropietarios")
    .delete()
    .eq("id", id)
    .eq("ph_id", ph.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
