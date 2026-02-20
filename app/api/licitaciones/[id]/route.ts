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
    licitacion.requisitos_licitacion.sort((a: { numero?: number; orden?: number }, b: { numero?: number; orden?: number }) =>
      (a.numero || a.orden || 0) - (b.numero || b.orden || 0)
    );
  }

  return NextResponse.json(licitacion);
}

// PATCH /api/licitaciones/[id] — actualizar estado y campos extendidos
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

  // Campos de estado
  if (body.estado !== undefined) updates.estado = body.estado;
  if (body.urgente !== undefined) updates.urgente = body.urgente;
  if (body.publicar) {
    updates.estado = "activa";
    updates.fecha_publicacion = new Date().toISOString();
  }

  // Campos extendidos
  if (body.fechas_inspeccion !== undefined) updates.fechas_inspeccion = body.fechas_inspeccion;
  if (body.lugar_inspeccion !== undefined) updates.lugar_inspeccion = body.lugar_inspeccion;
  if (body.fotos !== undefined) updates.fotos = body.fotos;
  if (body.precio_referencia !== undefined) updates.precio_referencia = body.precio_referencia;
  if (body.precio_referencia_visible !== undefined) updates.precio_referencia_visible = body.precio_referencia_visible;
  if (body.condiciones_especiales !== undefined) updates.condiciones_especiales = body.condiciones_especiales;

  const { data, error } = await supabase
    .from("licitaciones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, licitacion: data });
}
