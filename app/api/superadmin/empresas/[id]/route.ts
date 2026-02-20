import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurado");
  return new Resend(key);
}

const FROM = "LicitaPH <notificaciones@licitaph.com>";

// PATCH /api/superadmin/empresas/[id] — verificar o rechazar empresa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { estado_verificacion, motivo_rechazo } = body;

  if (!["verificada", "rechazada", "pendiente"].includes(estado_verificacion)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  // Actualizar estado en empresas
  const { data: empresa, error } = await supabase
    .from("empresas")
    .update({ estado_verificacion })
    .eq("id", id)
    .select("id, nombre, email, usuario_id")
    .single();

  if (error || !empresa) {
    return NextResponse.json({ error: error?.message || "Empresa no encontrada" }, { status: 500 });
  }

  // Notificación interna en la tabla notificaciones
  const titulo = estado_verificacion === "verificada"
    ? "✅ Tu empresa fue verificada"
    : "❌ Tu empresa no fue verificada";
  const mensaje = estado_verificacion === "verificada"
    ? "¡Felicidades! Tu empresa ha sido verificada y ahora puede postular a licitaciones."
    : `Tu empresa no fue aprobada. Motivo: ${motivo_rechazo || "Ver comunicación por email."}`;

  try {
    await supabase.from("notificaciones").insert({
      usuario_id: empresa.usuario_id,
      titulo,
      mensaje,
      tipo: estado_verificacion === "verificada" ? "sistema" : "alerta",
      enlace: "/empresa",
      leida: false,
    });
  } catch { /* no bloquear si falla */ }

  // Email al representante de la empresa
  try {
    const resend = getResend();
    const esVerificada = estado_verificacion === "verificada";
    await resend.emails.send({
      from: FROM,
      to: empresa.email || "",
      subject: esVerificada
        ? `✅ ${empresa.nombre} ha sido verificada en LicitaPH`
        : `Actualización sobre la verificación de ${empresa.nombre}`,
      html: esVerificada
        ? emailVerificada(empresa.nombre)
        : emailRechazada(empresa.nombre, motivo_rechazo || ""),
    });
  } catch (e) {
    console.error("Error enviando email:", e);
  }

  return NextResponse.json({ success: true, empresa });
}

function emailVerificada(nombre: string) {
  return `
  <div style="background:#07090F;padding:40px 20px;font-family:Inter,sans-serif;color:#F0F4FF;max-width:600px;margin:auto;border-radius:12px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:48px">✅</span>
      <h1 style="color:#4ADE80;font-size:24px;margin:16px 0 8px">¡Empresa verificada!</h1>
      <p style="color:#9CA3AF;font-size:14px;margin:0">LicitaPH</p>
    </div>
    <div style="background:#0D1117;border:1px solid #1F2937;border-radius:12px;padding:28px;margin-bottom:24px">
      <p style="font-size:16px;margin:0 0 16px">Hola <strong>${nombre}</strong>,</p>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 16px">
        Nos complace informarte que tu empresa ha sido <strong style="color:#4ADE80">verificada exitosamente</strong> en LicitaPH. 
        Ya puedes postular a licitaciones y presentar propuestas a propiedades horizontales.
      </p>
    </div>
    <div style="text-align:center">
      <a href="https://licitaph.vercel.app/empresa" style="background:#4ADE80;color:#07090F;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Ir a mi panel →
      </a>
    </div>
    <p style="text-align:center;color:#6B7280;font-size:12px;margin-top:24px">LicitaPH · Plataforma de Licitaciones para PHs en Panamá</p>
  </div>`;
}

function emailRechazada(nombre: string, motivo: string) {
  return `
  <div style="background:#07090F;padding:40px 20px;font-family:Inter,sans-serif;color:#F0F4FF;max-width:600px;margin:auto;border-radius:12px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:48px">⚠️</span>
      <h1 style="color:#F87171;font-size:24px;margin:16px 0 8px">Verificación no aprobada</h1>
      <p style="color:#9CA3AF;font-size:14px;margin:0">LicitaPH</p>
    </div>
    <div style="background:#0D1117;border:1px solid #1F2937;border-radius:12px;padding:28px;margin-bottom:24px">
      <p style="font-size:16px;margin:0 0 16px">Hola <strong>${nombre}</strong>,</p>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 16px">
        Hemos revisado la información de tu empresa y en este momento no podemos aprobar la verificación.
      </p>
      ${motivo ? `<div style="background:#2D0A0A;border:1px solid #F87171;border-radius:8px;padding:16px;margin-top:12px">
        <p style="color:#F87171;font-size:13px;font-weight:600;margin:0 0 6px">Motivo:</p>
        <p style="color:#F0F4FF;font-size:14px;margin:0">${motivo}</p>
      </div>` : ""}
      <p style="color:#9CA3AF;font-size:14px;margin:16px 0 0">
        Por favor actualiza tus documentos y contáctanos para una nueva revisión.
      </p>
    </div>
    <div style="text-align:center">
      <a href="https://licitaph.vercel.app/empresa" style="background:#F87171;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Actualizar documentos →
      </a>
    </div>
    <p style="text-align:center;color:#6B7280;font-size:12px;margin-top:24px">LicitaPH · Plataforma de Licitaciones para PHs en Panamá</p>
  </div>`;
}
