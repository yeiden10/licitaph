import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — public, no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("preguntas_licitacion")
    .select("*")
    .eq("licitacion_id", id)
    .eq("visible", true)
    .order("creado_en", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST — any authenticated user can ask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  // Allow anonymous questions too (just store without user_id)

  const body = await request.json();
  const { pregunta, nombre_empresa } = body;

  if (!pregunta || pregunta.trim().length < 10) {
    return NextResponse.json({ error: "La pregunta debe tener al menos 10 caracteres" }, { status: 400 });
  }

  // Verify licitación exists and is active
  const { data: lic } = await supabase
    .from("licitaciones")
    .select("id, titulo, ph_id, estado, propiedades_horizontales(admin_id)")
    .eq("id", id)
    .single();

  if (!lic) return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });
  if (!["activa", "en_evaluacion"].includes(lic.estado)) {
    return NextResponse.json({ error: "Esta licitación no está aceptando preguntas" }, { status: 400 });
  }

  const { data: preguntaData, error } = await supabase
    .from("preguntas_licitacion")
    .insert({
      licitacion_id: id,
      pregunta: pregunta.trim(),
      nombre_empresa: nombre_empresa?.trim() || null,
      usuario_id: user?.id || null,
      visible: false, // Admin must approve
      creado_en: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify PH admin
  const adminId = (lic as any).propiedades_horizontales?.admin_id;
  if (adminId) {
    await supabase.from("notificaciones").insert({
      usuario_id: adminId,
      tipo: "nueva_pregunta",
      titulo: "Nueva pregunta en licitación",
      mensaje: `Una empresa preguntó sobre "${lic.titulo}"`,
      enlace: "/ph",
    });
  }

  return NextResponse.json({ success: true, pregunta: preguntaData });
}
