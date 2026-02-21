import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH — ph_admin answers a question and makes it visible
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pregunta_id: string }> }
) {
  const { id, pregunta_id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { respuesta, visible } = body;

  const updateData: Record<string, unknown> = {};
  if (respuesta !== undefined) updateData.respuesta = respuesta;
  if (visible !== undefined) updateData.visible = visible;
  if (respuesta) updateData.respondida_en = new Date().toISOString();

  const { data, error } = await supabase
    .from("preguntas_licitacion")
    .update(updateData)
    .eq("id", pregunta_id)
    .eq("licitacion_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, pregunta: data });
}
