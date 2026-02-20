import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/superadmin/licitaciones — todas las licitaciones de la plataforma
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");

  let query = supabase
    .from("licitaciones")
    .select(`
      *,
      propiedades_horizontales (nombre, ciudad, provincia),
      propuestas (count)
    `)
    .order("creado_en", { ascending: false });

  if (estado && estado !== "todas") query = query.eq("estado", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
