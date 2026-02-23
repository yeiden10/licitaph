import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

// Lazy init — evita error de build cuando RESEND_API_KEY no está configurado
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}
const FROM = "LicitaPH <notificaciones@licitaph.com>";

// POST /api/email/notify — enviar notificaciones por email
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { tipo, licitacion_id, propuesta_id } = body;

  switch (tipo) {

    case "licitacion_publicada": {
      // Notificar a todas las empresas de la categoría
      const { data: licitacion } = await supabase
        .from("licitaciones")
        .select("*, propiedades_horizontales(nombre)")
        .eq("id", licitacion_id)
        .single();

      if (!licitacion) return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });

      const { data: empresas } = await supabase
        .from("empresas")
        .select("id, nombre, email")
        .contains("categorias", [licitacion.categoria])
        .eq("activo", true);

      if (!empresas?.length) return NextResponse.json({ success: true, enviados: 0 });

      const emails = empresas
        .filter(e => !!e.email)
        .map(e => ({
          from: FROM,
          to: e.email!,
          subject: `Nueva licitación: ${licitacion.titulo}`,
          html: emailLicitacionPublicada(licitacion, e.nombre),
        }));

      // Enviar en batch (máx 100 por batch en Resend)
      const results = await Promise.allSettled(emails.map(e => getResend().emails.send(e)));
      const enviados = results.filter(r => r.status === "fulfilled").length;

      return NextResponse.json({ success: true, enviados });
    }

    case "propuesta_ganadora": {
      // Notificar al ganador
      const { data: propuesta } = await supabase
        .from("propuestas")
        .select("*, empresas(nombre, email), licitaciones(titulo, propiedades_horizontales(nombre))")
        .eq("id", propuesta_id)
        .single();

      if (!propuesta?.empresas?.email) return NextResponse.json({ success: false, error: "Sin email" });

      await getResend().emails.send({
        from: FROM,
        to: propuesta.empresas.email,
        subject: `Felicitaciones — Ganaste la licitación de ${propuesta.licitaciones?.propiedades_horizontales?.nombre}`,
        html: emailGanador(propuesta),
      });

      // Notificar a los no seleccionados
      const { data: noSeleccionadas } = await supabase
        .from("propuestas")
        .select("*, empresas(nombre, email)")
        .eq("licitacion_id", propuesta.licitacion_id)
        .eq("estado", "no_seleccionada");

      if (noSeleccionadas?.length) {
        await Promise.allSettled(noSeleccionadas
          .filter(p => p.empresas?.email)
          .map(p => getResend().emails.send({
            from: FROM,
            to: p.empresas!.email!,
            subject: `Resultado de licitación: ${propuesta.licitaciones?.titulo}`,
            html: emailNoSeleccionado(p, propuesta.licitaciones?.titulo || ""),
          }))
        );
      }

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Tipo de notificación no válido" }, { status: 400 });
  }
}

// ─── TEMPLATES ────────────────────────────────────────────────

function emailLicitacionPublicada(licitacion: any, empresa_nombre: string) {
  const ph = licitacion.propiedades_horizontales?.nombre || "Un PH";
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/licitacion/${licitacion.url_slug}`;
  const cierre = licitacion.fecha_cierre
    ? new Date(licitacion.fecha_cierre).toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" })
    : "Sin fecha definida";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Inter,sans-serif;background:#07090F;color:#F0F4FF;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:28px;">
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;">
        <span style="color:#C9A84C;">Licita</span><span style="color:#F0F4FF;">PH</span>
      </span>
    </div>
    <div style="background:#0D1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">
        Nueva licitación disponible
      </div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;margin:0 0 8px;color:#F0F4FF;line-height:1.3;">
        ${licitacion.titulo}
      </h1>
      <p style="color:#8896AA;font-size:14px;margin:0 0 24px;">
        ${ph} está buscando empresas de <strong style="color:#F0F4FF;">${licitacion.categoria}</strong>
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;">
          <div style="font-size:10px;color:#3D4A5C;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Presupuesto</div>
          <div style="font-size:14px;font-weight:600;color:#C9A84C;">
            ${licitacion.presupuesto_minimo ? `$${Number(licitacion.presupuesto_minimo).toLocaleString()} - $${Number(licitacion.presupuesto_maximo || licitacion.presupuesto_minimo).toLocaleString()}/mes` : "A convenir"}
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;">
          <div style="font-size:10px;color:#3D4A5C;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Cierre</div>
          <div style="font-size:14px;font-weight:600;color:#F0F4FF;">${cierre}</div>
        </div>
      </div>
      <a href="${url}" style="display:block;text-align:center;background:#C9A84C;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver licitación y aplicar →
      </a>
    </div>
    <p style="text-align:center;font-size:12px;color:#3D4A5C;margin-top:24px;">
      Recibes este email porque tienes una empresa registrada en LicitaPH en la categoría ${licitacion.categoria}.<br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/empresa" style="color:#4A9EFF;">Gestionar notificaciones</a>
    </p>
  </div>
</body>
</html>`;
}

function emailGanador(propuesta: any) {
  const empresa = propuesta.empresas?.nombre || "Tu empresa";
  const licitacion = propuesta.licitaciones?.titulo || "la licitación";
  const ph = propuesta.licitaciones?.propiedades_horizontales?.nombre || "el PH";
  const monto = propuesta.precio_anual
    ? `$${(propuesta.precio_anual / 12).toLocaleString("es-PA", { maximumFractionDigits: 0 })}/mes`
    : "Según propuesta";

  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#07090F;color:#F0F4FF;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:28px;">
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;">
        <span style="color:#C9A84C;">Licita</span><span style="color:#F0F4FF;">PH</span>
      </span>
    </div>
    <div style="background:#0D1117;border:1px solid rgba(74,222,128,0.2);border-radius:16px;padding:32px;">
      <div style="text-align:center;margin-bottom:16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21l3.5-14L18 10.5z"/><line x1="9" y1="13" x2="6.5" y2="18"/><circle cx="16" cy="5" r="1" fill="#4ADE80" stroke="none"/><circle cx="20" cy="9" r="0.75" fill="#4ADE80" stroke="none"/><circle cx="19" cy="3" r="0.75" fill="#4ADE80" stroke="none"/><path d="M14.5 2l.5 2"/><path d="M21 6l-2 .5"/><path d="M20 12l-1.5-1"/></svg>
      </div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;text-align:center;margin:0 0 8px;color:#4ADE80;">
        ¡Felicitaciones, ${empresa}!
      </h1>
      <p style="text-align:center;color:#8896AA;font-size:14px;margin:0 0 24px;">
        Tu propuesta para <strong style="color:#F0F4FF;">${licitacion}</strong> fue seleccionada por <strong style="color:#F0F4FF;">${ph}</strong>.
      </p>
      <div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.15);border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;color:#3D4A5C;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Monto adjudicado</div>
        <div style="font-size:28px;font-weight:800;color:#4ADE80;font-family:'Plus Jakarta Sans',sans-serif;">${monto}</div>
      </div>
      <p style="color:#8896AA;font-size:13px;line-height:1.7;margin:0 0 20px;">
        Se ha generado el contrato automáticamente. Entra a tu portal para revisar los detalles, fecha de inicio y próximos pasos.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/empresa" style="display:block;text-align:center;background:#4ADE80;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver mi contrato →
      </a>
    </div>
  </div>
</body>
</html>`;
}

function emailNoSeleccionado(propuesta: any, titulo_licitacion: string) {
  const empresa = propuesta.empresas?.nombre || "Tu empresa";
  return `<!DOCTYPE html>
<html>
<body style="font-family:Inter,sans-serif;background:#07090F;color:#F0F4FF;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:28px;">
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;">
        <span style="color:#C9A84C;">Licita</span><span style="color:#F0F4FF;">PH</span>
      </span>
    </div>
    <div style="background:#0D1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;margin:0 0 12px;color:#F0F4FF;">
        Resultado de licitación
      </h2>
      <p style="color:#8896AA;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hola ${empresa}, la licitación <strong style="color:#F0F4FF;">${titulo_licitacion}</strong> ha sido adjudicada a otra empresa en esta ocasión.
      </p>
      <p style="color:#8896AA;font-size:13px;line-height:1.7;margin:0 0 20px;">
        Tu puntaje IA fue <strong style="color:#C9A84C;">${propuesta.puntaje_ia || "—"}/100</strong>. Puedes mejorar tu perfil completando más documentos y añadiendo experiencia verificada.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/empresa" style="display:block;text-align:center;background:#4A9EFF;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver nuevas licitaciones →
      </a>
    </div>
  </div>
</body>
</html>`;
}
