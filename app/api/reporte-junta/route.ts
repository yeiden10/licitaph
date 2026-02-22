import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/reporte-junta — generates printer-friendly HTML report for PH admin
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("*")
    .eq("admin_id", user.id)
    .single();

  if (!ph) return NextResponse.json({ error: "PH no encontrada" }, { status: 404 });

  const [{ data: licitaciones }, { data: contratos }] = await Promise.all([
    supabase.from("licitaciones").select("*").eq("ph_id", ph.id).order("creado_en", { ascending: false }),
    supabase.from("contratos").select("*, empresas(nombre), licitaciones(titulo, categoria)").eq("ph_id", ph.id).order("creado_en", { ascending: false }),
  ]);

  const lics = licitaciones || [];
  const cnts = contratos || [];

  const totalGastado = cnts.reduce((s: number, c: any) => s + (c.monto_mensual || 0) * 12, 0);
  const contratosActivos = cnts.filter((c: any) => c.estado === "activo");
  const fechaReporte = new Date().toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reporte Ejecutivo — ${ph.nombre}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; line-height: 1.6; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 48px; }
  .header { border-bottom: 3px solid #C9A84C; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; }
  .logo-gold { color: #C9A84C; }
  .logo-dark { color: #1a1a2e; }
  .header-meta { text-align: right; }
  .ph-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; color: #1a1a2e; }
  .report-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 6px; color: #1a1a2e; }
  .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 32px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
  .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
  .kpi-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .kpi-val { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; font-weight: 800; line-height: 1; }
  .kpi-gold { color: #C9A84C; }
  .kpi-green { color: #16a34a; }
  .kpi-blue { color: #2563eb; }
  .section { margin-bottom: 36px; }
  .section-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f4f6; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 11px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-flex; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-gold { background: #fef3c7; color: #92400e; }
  .badge-gray { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
  .highlight-row td { background: #fffbeb; }
  .cert-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; font-size: 13px; color: #166534; line-height: 1.7; margin-top: 24px; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px 24px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:13px;color:#1d4ed8;font-weight:500">📄 Reporte listo — abre el menú de impresión para guardar como PDF</span>
    <button onclick="window.print()" style="background:#1d4ed8;color:#fff;border:none;border-radius:6px;padding:8px 18px;font-size:12px;font-weight:600;cursor:pointer;">🖨️ Imprimir / Guardar PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="logo"><span class="logo-gold">Licita</span><span class="logo-dark">PH</span></div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Plataforma de licitaciones para Propiedades Horizontales</div>
    </div>
    <div class="header-meta">
      <div class="ph-name">${ph.nombre}</div>
      <div class="report-date">Reporte al ${fechaReporte}</div>
      <div style="font-size:11px;color:#9ca3af">${ph.ciudad || ""}, Panamá</div>
    </div>
  </div>

  <div class="title">Reporte Ejecutivo de Contrataciones</div>
  <div class="subtitle">Resumen de licitaciones, contratos y eficiencia de gasto — para presentación a la Junta Directiva</div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Licitaciones totales</div>
      <div class="kpi-val kpi-blue">${lics.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Contratos activos</div>
      <div class="kpi-val kpi-green">${contratosActivos.length}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Gasto anual estimado</div>
      <div class="kpi-val kpi-gold">$${totalGastado.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Adjudicaciones</div>
      <div class="kpi-val kpi-blue">${lics.filter((l: any) => l.estado === "adjudicada").length}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📄 Contratos activos</div>
    ${contratosActivos.length === 0
      ? '<p style="color:#9ca3af;font-size:13px">Sin contratos activos en este período.</p>'
      : `<table>
      <thead><tr><th>Empresa</th><th>Servicio</th><th>Monto mensual</th><th>Vencimiento</th><th>Estado</th></tr></thead>
      <tbody>
        ${contratosActivos.map((c: any) => `<tr>
          <td style="font-weight:600">${(c as any).empresas?.nombre || "—"}</td>
          <td>${(c as any).licitaciones?.titulo || (c as any).licitaciones?.categoria || "—"}</td>
          <td style="font-weight:600;color:#C9A84C">$${Number(c.monto_mensual || 0).toLocaleString()}/mes</td>
          <td>${c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
          <td><span class="badge badge-green">● Activo</span></td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <div class="section">
    <div class="section-title">📋 Historial de licitaciones</div>
    ${lics.length === 0
      ? '<p style="color:#9ca3af;font-size:13px">Sin licitaciones publicadas.</p>'
      : `<table>
      <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha cierre</th></tr></thead>
      <tbody>
        ${lics.slice(0, 20).map((l: any) => `<tr ${l.estado === "adjudicada" ? 'class="highlight-row"' : ""}>
          <td style="font-weight:500">${l.titulo}</td>
          <td>${l.categoria}</td>
          <td><span class="badge ${l.estado === "activa" ? "badge-green" : l.estado === "adjudicada" ? "badge-gold" : "badge-gray"}">${l.estado}</span></td>
          <td>${l.fecha_cierre ? new Date(l.fecha_cierre).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>`}
  </div>

  <div class="cert-box">
    ✅ <strong>Certificación de transparencia LicitaPH:</strong> Todas las contrataciones de este período fueron realizadas mediante proceso competitivo y documentado en la plataforma LicitaPH. Los expedientes digitales están disponibles para consulta de cualquier copropietario autorizado.
  </div>

  <div class="footer">
    <div>Generado por LicitaPH — licitaph.vercel.app</div>
    <div>Documento confidencial — uso interno Junta Directiva</div>
    <div>${fechaReporte}</div>
  </div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
