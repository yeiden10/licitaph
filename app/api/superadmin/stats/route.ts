import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/superadmin/stats — métricas globales de la plataforma
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [
    { count: totalEmpresas },
    { count: empresasVerificadas },
    { count: empresasPendientes },
    { count: totalPH },
    { count: totalLicitaciones },
    { count: licitacionesActivas },
    { count: totalContratos },
    { count: contratosActivos },
    { count: totalPropuestas },
  ] = await Promise.all([
    supabase.from("empresas").select("*", { count: "exact", head: true }),
    supabase.from("empresas").select("*", { count: "exact", head: true }).eq("estado_verificacion", "verificada"),
    supabase.from("empresas").select("*", { count: "exact", head: true }).eq("estado_verificacion", "pendiente"),
    supabase.from("propiedades_horizontales").select("*", { count: "exact", head: true }),
    supabase.from("licitaciones").select("*", { count: "exact", head: true }),
    supabase.from("licitaciones").select("*", { count: "exact", head: true }).eq("estado", "activa"),
    supabase.from("contratos").select("*", { count: "exact", head: true }),
    supabase.from("contratos").select("*", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("propuestas").select("*", { count: "exact", head: true }),
  ]);

  // Valor total de contratos activos
  const { data: valorData } = await supabase
    .from("contratos")
    .select("valor_anual")
    .eq("estado", "activo");

  const valorTotalAnual = (valorData || []).reduce((sum, c) => sum + (c.valor_anual || 0), 0);

  return NextResponse.json({
    empresas: { total: totalEmpresas || 0, verificadas: empresasVerificadas || 0, pendientes: empresasPendientes || 0 },
    ph: { total: totalPH || 0 },
    licitaciones: { total: totalLicitaciones || 0, activas: licitacionesActivas || 0 },
    contratos: { total: totalContratos || 0, activos: contratosActivos || 0, valor_anual: valorTotalAnual },
    propuestas: { total: totalPropuestas || 0 },
  });
}
