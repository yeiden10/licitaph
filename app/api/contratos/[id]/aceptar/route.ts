import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

const FROM = "LicitaPH <notificaciones@licitaph.com>";

// POST /api/contratos/[id]/aceptar — empresa acepta el contrato
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contrato_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Obtener empresa del usuario
  const { data: empresa, error: empError } = await supabase
    .from("empresas")
    .select("id, nombre, email")
    .eq("usuario_id", user.id)
    .single();

  if (empError || !empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  // Obtener contrato con joins necesarios
  const { data: contrato, error: contError } = await supabase
    .from("contratos")
    .select(`
      *,
      licitaciones (titulo, propiedades_horizontales (id, nombre, email_contacto, admin_id))
    `)
    .eq("id", contrato_id)
    .eq("empresa_id", empresa.id)
    .single();

  if (contError || !contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  // Verificar que el contrato está pendiente de aceptación
  // Nota: estado_firma puede ser null (sin firma requerida) o "pendiente" (esperando empresa)
  // Solo bloqueamos si ya fue procesado: "empresa_acepto", "rechazado", etc.
  if (contrato.estado_firma !== null && contrato.estado_firma !== "pendiente") {
    return NextResponse.json(
      { error: "El contrato ya fue procesado anteriormente" },
      { status: 400 }
    );
  }

  // Actualizar contrato: empresa acepta
  const { error: updateError } = await supabase
    .from("contratos")
    .update({
      estado_firma: "empresa_acepto",
      empresa_acepto_at: new Date().toISOString(),
    })
    .eq("id", contrato_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const tituloLicitacion = contrato.licitaciones?.titulo ?? "la licitación";
  const ph = contrato.licitaciones?.propiedades_horizontales;
  const phNombre = ph?.nombre ?? "el PH";
  const phAdminId = ph?.admin_id;
  const phEmail = ph?.email_contacto;

  // Crear notificación para el PH admin
  if (phAdminId) {
    await supabase
      .from("notificaciones")
      .insert({
        usuario_id: phAdminId,
        tipo: "contrato_aceptado",
        titulo: "Contrato aceptado por la empresa",
        mensaje: `${empresa.nombre} ha aceptado el contrato para "${tituloLicitacion}". El contrato está ahora vigente.`,
        enlace: "/ph",
      })
      .then(() => {});
  }

  // Enviar emails de confirmación (sin bloquear respuesta si fallan)
  try {
    const resend = getResend();
    const emailPromises: Promise<unknown>[] = [];

    // Email al PH admin
    if (phEmail) {
      emailPromises.push(
        resend.emails.send({
          from: FROM,
          to: phEmail,
          subject: `Contrato aceptado — ${tituloLicitacion}`,
          html: emailPhAdminContratoAceptado({ tituloLicitacion, empresa_nombre: empresa.nombre, phNombre }),
        })
      );
    }

    // Email a la empresa
    if (empresa.email) {
      emailPromises.push(
        resend.emails.send({
          from: FROM,
          to: empresa.email,
          subject: `Has aceptado el contrato — ${tituloLicitacion}`,
          html: emailEmpresaContratoAceptado({ tituloLicitacion, empresa_nombre: empresa.nombre, phNombre }),
        })
      );
    }

    await Promise.allSettled(emailPromises);
  } catch (err) {
    // Error de email no debe fallar la operación principal
    console.error("Error enviando emails de aceptación:", err);
  }

  return NextResponse.json({
    success: true,
    message: "Contrato aceptado correctamente",
  });
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

function emailPhAdminContratoAceptado({
  tituloLicitacion,
  empresa_nombre,
  phNombre,
}: {
  tituloLicitacion: string;
  empresa_nombre: string;
  phNombre: string;
}) {
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
      <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#4ADE80;margin-bottom:16px;">
        Contrato aceptado
      </div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;margin:0 0 12px;color:#F0F4FF;">
        ${empresa_nombre} aceptó el contrato
      </h1>
      <p style="color:#8896AA;font-size:14px;line-height:1.7;margin:0 0 24px;">
        La empresa <strong style="color:#F0F4FF;">${empresa_nombre}</strong> ha aceptado formalmente el contrato
        para la licitación <strong style="color:#F0F4FF;">${tituloLicitacion}</strong> de <strong style="color:#F0F4FF;">${phNombre}</strong>.
        El contrato está ahora vigente.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/ph" style="display:block;text-align:center;background:#C9A84C;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver contrato en mi panel
      </a>
    </div>
  </div>
</body>
</html>`;
}

function emailEmpresaContratoAceptado({
  tituloLicitacion,
  empresa_nombre,
  phNombre,
}: {
  tituloLicitacion: string;
  empresa_nombre: string;
  phNombre: string;
}) {
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
      <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#4ADE80;margin-bottom:16px;">
        Confirmacion de aceptacion
      </div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;margin:0 0 12px;color:#F0F4FF;">
        Has aceptado el contrato
      </h1>
      <p style="color:#8896AA;font-size:14px;line-height:1.7;margin:0 0 24px;">
        <strong style="color:#F0F4FF;">${empresa_nombre}</strong> ha aceptado formalmente el contrato
        para <strong style="color:#F0F4FF;">${tituloLicitacion}</strong> con <strong style="color:#F0F4FF;">${phNombre}</strong>.
        El contrato está vigente. Puedes ver los detalles completos desde tu panel.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/empresa" style="display:block;text-align:center;background:#4ADE80;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver mi contrato
      </a>
    </div>
  </div>
</body>
</html>`;
}
