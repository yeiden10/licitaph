import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/licitaciones/[id]/adjudicar — adjudicar licitación a propuesta ganadora
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: licitacion_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { propuesta_id } = await request.json();
  if (!propuesta_id) return NextResponse.json({ error: "propuesta_id requerido" }, { status: 400 });

  // Obtener propuesta
  const { data: propuesta, error: propError } = await supabase
    .from("propuestas")
    .select("*, empresas(id, usuario_id)")
    .eq("id", propuesta_id)
    .eq("licitacion_id", licitacion_id)
    .single();

  if (propError || !propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });
  }

  // Obtener licitación y PH
  const { data: licitacion } = await supabase
    .from("licitaciones")
    .select("*, propiedades_horizontales(id)")
    .eq("id", licitacion_id)
    .single();

  if (!licitacion) return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });

  // 1. Marcar propuesta ganadora
  await supabase.from("propuestas").update({ estado: "ganada" }).eq("id", propuesta_id);

  // 2. Marcar demás propuestas como no seleccionadas
  await supabase.from("propuestas")
    .update({ estado: "no_seleccionada" })
    .eq("licitacion_id", licitacion_id)
    .neq("id", propuesta_id)
    .in("estado", ["enviada", "en_revision", "borrador"]);

  // 3. Actualizar licitación como adjudicada
  await supabase.from("licitaciones").update({
    estado: "adjudicada",
    empresa_ganadora_id: propuesta.empresa_id,
    fecha_adjudicacion: new Date().toISOString(),
  }).eq("id", licitacion_id);

  // 4. Crear contrato
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() + 7); // Inicio en 1 semana
  const fechaFin = new Date(fechaInicio);
  fechaFin.setMonth(fechaFin.getMonth() + (licitacion.duracion_contrato_meses || 12));

  const { data: contrato, error: contError } = await supabase
    .from("contratos")
    .insert({
      licitacion_id,
      propuesta_id,
      ph_id: licitacion.propiedades_horizontales.id,
      empresa_id: propuesta.empresa_id,
      valor_anual: propuesta.precio_anual,
      monto_mensual: propuesta.precio_anual ? propuesta.precio_anual / 12 : null,
      fecha_inicio: fechaInicio.toISOString().split("T")[0],
      fecha_fin: fechaFin.toISOString().split("T")[0],
      estado: "activo",
    })
    .select()
    .single();

  if (contError) {
    console.error("Error creando contrato:", contError.message);
  }

  // 5. Notificaciones (sin bloquear)
  // Notificar empresa ganadora
  if (propuesta.empresas?.usuario_id) {
    await supabase.from("notificaciones").insert({
      usuario_id: propuesta.empresas.usuario_id,
      tipo: "adjudicacion_ganada",
      titulo: "🎉 ¡Ganaste la licitación!",
      mensaje: `Tu propuesta para "${licitacion.titulo}" fue seleccionada. Se ha generado el contrato.`,
      enlace: `/empresa`,
    }).then(() => {});
  }

  // Notificar PH admin
  await supabase.from("notificaciones").insert({
    usuario_id: user.id,
    tipo: "adjudicacion_completada",
    titulo: "✅ Adjudicación confirmada",
    mensaje: `La licitación "${licitacion.titulo}" ha sido adjudicada. El contrato está activo.`,
    enlace: `/ph`,
  }).then(() => {});

  return NextResponse.json({
    success: true,
    contrato_id: contrato?.id,
    message: "Licitación adjudicada exitosamente",
  });
}
