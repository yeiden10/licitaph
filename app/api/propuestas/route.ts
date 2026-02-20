import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/propuestas?licitacion_id=xxx — propuestas de una licitación (PH) o las de la empresa
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const licitacion_id = searchParams.get("licitacion_id");
  const tipo = user.user_metadata?.tipo_usuario;

  if (tipo === "ph_admin" && licitacion_id) {
    const { data, error } = await supabase
      .from("propuestas")
      .select(`
        *,
        empresas (id, nombre, anios_experiencia, calificacion_promedio, categorias),
        respuestas_requisito (*)
      `)
      .eq("licitacion_id", licitacion_id)
      .neq("estado", "borrador")
      .order("puntaje_ia", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (tipo === "empresa") {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", user.id)
      .single();

    if (!empresa) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
      .from("propuestas")
      .select(`
        *,
        licitaciones (titulo, categoria, propiedades_horizontales (nombre, ciudad))
      `)
      .eq("empresa_id", empresa.id)
      .order("creado_en", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
}

// POST /api/propuestas — enviar propuesta a una licitación
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "empresa") {
    return NextResponse.json({ error: "Solo empresas pueden enviar propuestas" }, { status: 401 });
  }

  const body = await request.json();
  const { licitacion_id, precio_anual, descripcion, propuesta_tecnica, disponibilidad_inicio } = body;

  // Verificar empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  // Verificar que la licitación existe y está activa
  const { data: licitacion } = await supabase
    .from("licitaciones")
    .select("id, titulo, ph_id, estado")
    .eq("id", licitacion_id)
    .single();

  if (!licitacion || licitacion.estado !== "activa") {
    return NextResponse.json({ error: "Licitación no disponible" }, { status: 400 });
  }

  // Calcular puntaje IA simple
  // En producción esto sería un endpoint de IA más sofisticado
  const puntaje_ia = calcularPuntajeIA({
    precio_anual,
    empresa,
    tiene_descripcion: !!descripcion && descripcion.length > 50,
  });

  // Upsert propuesta (borrador → enviada)
  const { data: propuesta, error } = await supabase
    .from("propuestas")
    .upsert({
      licitacion_id,
      empresa_id: empresa.id,
      precio_anual: precio_anual || null,
      descripcion,
      propuesta_tecnica,
      disponibilidad_inicio: disponibilidad_inicio || null,
      estado: "enviada",
      puntaje_ia,
      analisis_ia: {
        precio: Math.min(40, Math.round(40 * (1 - (precio_anual || 0) / 100000))),
        documentacion: 25,
        experiencia: 20,
        respuesta: 10,
        total: puntaje_ia,
      },
      enviada_at: new Date().toISOString(),
    }, { onConflict: "licitacion_id,empresa_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al PH admin
  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("admin_id")
    .eq("id", licitacion.ph_id)
    .single();

  if (ph?.admin_id) {
    await supabase.from("notificaciones").insert({
      usuario_id: ph.admin_id,
      tipo: "propuesta_recibida",
      titulo: "📥 Nueva propuesta recibida",
      mensaje: `Una empresa envió una propuesta para "${licitacion.titulo}"`,
      enlace: `/ph`,
    }).then(() => {});
  }

  return NextResponse.json({ success: true, propuesta });
}

function calcularPuntajeIA({ precio_anual, empresa, tiene_descripcion }: {
  precio_anual: number;
  empresa: any;
  tiene_descripcion: boolean;
}) {
  let score = 0;
  // Precio (40 pts) — fórmula simple, en prod comparar contra otras propuestas
  if (precio_anual > 0) score += 30;
  // Descripción técnica (20 pts)
  if (tiene_descripcion) score += 20;
  // Experiencia (20 pts)
  const anios = empresa.anios_experiencia || 0;
  score += Math.min(20, anios * 3);
  // Base de documentación (20 pts) — se recalculará con docs reales
  score += 20;
  return Math.min(100, Math.round(score));
}
