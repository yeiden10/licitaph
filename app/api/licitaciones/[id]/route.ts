import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/licitaciones/[id] — detalle de una licitación con requisitos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: licitacion, error } = await supabase
    .from("licitaciones")
    .select(`
      *,
      propiedades_horizontales (id, nombre, ciudad, descripcion),
      requisitos_licitacion (*)
    `)
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Ordenar requisitos
  if (licitacion.requisitos_licitacion) {
    licitacion.requisitos_licitacion.sort((a: any, b: any) =>
      (a.numero || a.orden || 0) - (b.numero || b.orden || 0)
    );
  }

  return NextResponse.json(licitacion);
}

// PATCH /api/licitaciones/[id] — actualizar estado
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

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.estado) updates.estado = body.estado;
  if (body.urgente !== undefined) updates.urgente = body.urgente;
  if (body.publicar) {
    updates.estado = "activa";
    updates.fecha_publicacion = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("licitaciones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, licitacion: data });
}
