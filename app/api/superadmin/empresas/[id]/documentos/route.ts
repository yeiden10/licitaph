import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/superadmin/empresas/[id]/documentos
// Lista todos los documentos de una empresa
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: empresa_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("entidad_id", empresa_id)
    .eq("entidad_tipo", "empresa")
    .order("creado_en", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// PATCH /api/superadmin/empresas/[id]/documentos
// Aprobar o rechazar un documento específico
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: empresa_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { documento_id, estado, motivo_rechazo } = body;

  if (!documento_id || !estado) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!["aprobado", "rechazado", "pendiente"].includes(estado)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  // Verificar que el documento pertenece a la empresa
  const { data: doc } = await supabase
    .from("documentos")
    .select("id, entidad_id, tipo, subido_por")
    .eq("id", documento_id)
    .eq("entidad_id", empresa_id)
    .single();

  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const { data: updated, error } = await supabase
    .from("documentos")
    .update({
      estado,
      motivo_rechazo: motivo_rechazo || null,
      revisado_por: user.id,
      revisado_en: new Date().toISOString(),
    })
    .eq("id", documento_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar a la empresa si el documento fue rechazado
  if (estado === "rechazado" && doc.subido_por) {
    try {
      await supabase.from("notificaciones").insert({
        usuario_id: doc.subido_por,
        titulo: "Documento rechazado",
        mensaje: `Tu documento fue rechazado${motivo_rechazo ? `: ${motivo_rechazo}` : ". Por favor súbelo nuevamente."}`,
        tipo: "alerta",
        enlace: "/empresa",
        leida: false,
      });
    } catch { /* no bloquear */ }
  }

  if (estado === "aprobado" && doc.subido_por) {
    try {
      await supabase.from("notificaciones").insert({
        usuario_id: doc.subido_por,
        titulo: "Documento aprobado ✓",
        mensaje: "Uno de tus documentos fue aprobado por el equipo de LicitaPH.",
        tipo: "sistema",
        enlace: "/empresa",
        leida: false,
      });
    } catch { /* no bloquear */ }
  }

  return NextResponse.json({ success: true, documento: updated });
}
