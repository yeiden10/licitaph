import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Vercel Cron: runs every 30 minutes
// Config in vercel.json
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Find all active licitaciones whose fecha_cierre has passed
  const { data: vencidas, error } = await supabase
    .from("licitaciones")
    .select("id, titulo, ph_id, propiedades_horizontales(admin_id)")
    .eq("estado", "activa")
    .lt("fecha_cierre", new Date().toISOString())
    .not("fecha_cierre", "is", null);

  if (error) {
    console.error("Cron cerrar-licitaciones error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!vencidas || vencidas.length === 0) {
    return NextResponse.json({ procesadas: 0, message: "No hay licitaciones vencidas" });
  }

  let procesadas = 0;
  const errores: string[] = [];

  for (const lic of vencidas) {
    // Update estado to en_evaluacion
    const { error: updateErr } = await supabase
      .from("licitaciones")
      .update({ estado: "en_evaluacion" })
      .eq("id", lic.id);

    if (updateErr) {
      errores.push(`${lic.id}: ${updateErr.message}`);
      continue;
    }

    // Notify PH admin
    const adminId = (lic as any).propiedades_horizontales?.admin_id;
    if (adminId) {
      await supabase.from("notificaciones").insert({
        usuario_id: adminId,
        tipo: "licitacion_cerrada",
        titulo: "Período de recepción cerrado",
        mensaje: `La licitación "${lic.titulo}" cerró. Ya puedes evaluar las propuestas recibidas.`,
        enlace: "/ph",
      });
    }

    procesadas++;
  }

  console.log(`Cron cerrar-licitaciones: ${procesadas} procesadas, ${errores.length} errores`);

  return NextResponse.json({
    procesadas,
    errores: errores.length > 0 ? errores : undefined,
    timestamp: new Date().toISOString(),
  });
}
