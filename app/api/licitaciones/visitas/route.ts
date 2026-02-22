import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/licitaciones/visitas — registrar visita a una licitación
// GET  /api/licitaciones/visitas?licitacion_id=xxx — obtener conteo de visitas (solo PH admin)
export async function POST(request: NextRequest) {
  const { licitacion_id } = await request.json();
  if (!licitacion_id) {
    return NextResponse.json({ error: "licitacion_id requerido" }, { status: 400 });
  }

  const supabase = await createClient();

  // Incrementar contador en la licitación directamente
  // Usamos RPC para incremento atómico
  const { error } = await supabase.rpc("incrementar_visitas", {
    p_licitacion_id: licitacion_id,
  });

  if (error) {
    // Si la función RPC no existe aún, usamos un fallback silencioso
    // (no bloqueamos la carga de la página por esto)
    console.warn("visitas RPC no disponible:", error.message);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const licitacion_id = searchParams.get("licitacion_id");

  if (!licitacion_id) {
    return NextResponse.json({ error: "licitacion_id requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("licitaciones")
    .select("id, visitas")
    .eq("id", licitacion_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ visitas: 0 });
  }

  return NextResponse.json({ visitas: (data as { id: string; visitas: number }).visitas ?? 0 });
}
