import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/reviews?contrato_id=xxx  — obtener reseñas de un contrato
// GET /api/reviews?destinatario_id=xxx — obtener reseñas de un destinatario
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contrato_id = searchParams.get("contrato_id");
  const destinatario_id = searchParams.get("destinatario_id");

  let query = supabase.from("reviews").select("*").order("creado_en", { ascending: false });

  if (contrato_id) query = query.eq("contrato_id", contrato_id);
  if (destinatario_id) query = query.eq("destinatario_id", destinatario_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST /api/reviews — crear o actualizar reseña
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = user.user_metadata?.tipo_usuario as string;
  if (tipo !== "ph_admin" && tipo !== "empresa") {
    return NextResponse.json({ error: "Tipo de usuario no válido" }, { status: 403 });
  }

  const body = await request.json();
  const { contrato_id, puntaje, comentario } = body;

  if (!contrato_id || !puntaje) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (puntaje < 1 || puntaje > 5) {
    return NextResponse.json({ error: "El puntaje debe ser entre 1 y 5" }, { status: 400 });
  }

  // Verificar que el contrato existe y el usuario tiene acceso
  const { data: contrato, error: cErr } = await supabase
    .from("contratos")
    .select("id, ph_id, empresa_id, propiedades_horizontales:ph_id(id, admin_id), empresas:empresa_id(id, usuario_id)")
    .eq("id", contrato_id)
    .single();

  if (cErr || !contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  // Determinar autor y destinatario según tipo de usuario
  let autor_tipo: "ph" | "empresa";
  let destinatario_id: string;
  let destinatario_tipo: "ph" | "empresa";

  if (tipo === "ph_admin") {
    // PH admin reseña a la empresa
    const ph = contrato.propiedades_horizontales as any;
    if (!ph || ph.admin_id !== user.id) {
      return NextResponse.json({ error: "No tienes acceso a este contrato" }, { status: 403 });
    }
    autor_tipo = "ph";
    destinatario_id = contrato.empresa_id;
    destinatario_tipo = "empresa";
  } else {
    // Empresa reseña al PH
    const empresa = contrato.empresas as any;
    if (!empresa || empresa.usuario_id !== user.id) {
      return NextResponse.json({ error: "No tienes acceso a este contrato" }, { status: 403 });
    }
    autor_tipo = "empresa";
    destinatario_id = contrato.ph_id;
    destinatario_tipo = "ph";
  }

  // Upsert (una sola reseña por contrato+autor_tipo)
  const { data: review, error: rErr } = await supabase
    .from("reviews")
    .upsert({
      contrato_id,
      autor_id: user.id,
      autor_tipo,
      destinatario_id,
      destinatario_tipo,
      puntaje,
      comentario: comentario || null,
    }, { onConflict: "contrato_id,autor_tipo" })
    .select()
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  // Actualizar calificacion_promedio en empresas si el destinatario es empresa
  if (destinatario_tipo === "empresa") {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("puntaje")
      .eq("destinatario_id", destinatario_id)
      .eq("destinatario_tipo", "empresa");

    if (reviews && reviews.length > 0) {
      const promedio = reviews.reduce((s, r) => s + r.puntaje, 0) / reviews.length;
      await supabase
        .from("empresas")
        .update({ calificacion_promedio: Math.round(promedio * 10) / 10 })
        .eq("id", destinatario_id);
    }
  }

  return NextResponse.json({ success: true, review });
}
