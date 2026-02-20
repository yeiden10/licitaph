import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/superadmin/empresas — lista todas las empresas con KYC
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado"); // pendiente | verificada | rechazada

  let query = supabase
    .from("empresas")
    .select(`
      *,
      empresa_kyc (
        ruc, ano_inicio_operaciones, descripcion, categorias_servicio,
        representante_nombre, representante_email, representante_telefono,
        representante_cedula, representante_tipo_id,
        num_empleados, facturacion_anual_promedio,
        tiene_seguro_responsabilidad, tiene_fianza_cumplimiento,
        referencias_comerciales, referencias_bancarias,
        completado, porcentaje_completado, actualizado_en
      )
    `)
    .order("creado_en", { ascending: false });

  if (estado) query = query.eq("estado_verificacion", estado);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
