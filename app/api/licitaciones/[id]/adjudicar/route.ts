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

// POST /api/licitaciones/[id]/adjudicar — adjudicar licitación a propuesta ganadora
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: licitacion_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { propuesta_id, condiciones_contrato } = body;

  if (!propuesta_id) return NextResponse.json({ error: "propuesta_id requerido" }, { status: 400 });

  // Extraer condiciones del contrato con defaults seguros
  const {
    fecha_inicio,
    modalidad_pago,
    penalidad_porcentaje,
    condiciones_especiales,
    notas,
  } = (condiciones_contrato ?? {}) as {
    fecha_inicio?: string;
    modalidad_pago?: string;
    penalidad_porcentaje?: number;
    condiciones_especiales?: string;
    notas?: string;
  };

  // Obtener propuesta con empresa
  const { data: propuesta, error: propError } = await supabase
    .from("propuestas")
    .select("*, empresas(id, usuario_id, nombre, email)")
    .eq("id", propuesta_id)
    .eq("licitacion_id", licitacion_id)
    .single();

  if (propError || !propuesta) {
    return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });
  }

  // Obtener licitación y PH
  const { data: licitacion } = await supabase
    .from("licitaciones")
    .select("*, propiedades_horizontales(id, nombre, email_contacto)")
    .eq("id", licitacion_id)
    .single();

  if (!licitacion) return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });

  // Verificar que no esté ya adjudicada (evita doble adjudicación y race condition)
  if (licitacion.estado === "adjudicada") {
    return NextResponse.json({ error: "Esta licitación ya fue adjudicada anteriormente" }, { status: 400 });
  }

  // Verificar que el PH admin sea dueño de esta licitación
  const { data: phVerif } = await supabase
    .from("propiedades_horizontales")
    .select("id")
    .eq("admin_id", user.id)
    .single();
  if (!phVerif || phVerif.id !== licitacion.propiedades_horizontales?.id) {
    return NextResponse.json({ error: "No tienes permiso para adjudicar esta licitación" }, { status: 403 });
  }

  // Guardar si es primera adjudicación ANTES de actualizar
  const esPrimeraAdjudicacion = !licitacion.empresa_ganadora_id;

  // 1. Marcar propuesta ganadora
  await supabase.from("propuestas").update({ estado: "ganada" }).eq("id", propuesta_id);

  // 2. Marcar demás propuestas como no seleccionadas
  await supabase
    .from("propuestas")
    .update({ estado: "no_seleccionada" })
    .eq("licitacion_id", licitacion_id)
    .neq("id", propuesta_id)
    .in("estado", ["enviada", "en_revision", "borrador"]);

  // 3. Actualizar licitación como adjudicada
  await supabase
    .from("licitaciones")
    .update({
      estado: "adjudicada",
      empresa_ganadora_id: propuesta.empresa_id,
      fecha_adjudicacion: new Date().toISOString(),
    })
    .eq("id", licitacion_id);

  // 4. Calcular fechas de contrato
  const inicioFecha = fecha_inicio ? new Date(fecha_inicio) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Inicio en 1 semana por defecto
    return d;
  })();

  const finFecha = new Date(inicioFecha);
  finFecha.setMonth(finFecha.getMonth() + (licitacion.duracion_contrato_meses || 12));

  // 5. Crear contrato con estado_firma = 'pendiente' (empresa debe aceptar)
  const { data: contrato, error: contError } = await supabase
    .from("contratos")
    .insert({
      licitacion_id,
      propuesta_id,
      ph_id: licitacion.propiedades_horizontales.id,
      empresa_id: propuesta.empresa_id,
      valor_anual: propuesta.precio_anual,
      monto_mensual: propuesta.precio_anual ? propuesta.precio_anual / 12 : null,
      fecha_inicio: inicioFecha.toISOString().split("T")[0],
      fecha_fin: finFecha.toISOString().split("T")[0],
      estado: "activo",
      estado_firma: "pendiente",
      modalidad_pago: modalidad_pago ?? null,
      penalidad_porcentaje: penalidad_porcentaje ?? null,
      condiciones_especiales: condiciones_especiales ?? null,
      notas: notas ?? null,
    })
    .select()
    .single();

  if (contError) {
    console.error("Error creando contrato:", contError.message);
    // No detenemos la adjudicación, pero reportamos el error
  }

  // 5b. Incrementar total_contratos_ganados (solo si es la primera adjudicación)
  // esPrimeraAdjudicacion fue calculado ANTES del UPDATE para evitar race condition
  if (esPrimeraAdjudicacion) {
    const { data: empresaActual } = await supabase
      .from("empresas")
      .select("total_contratos_ganados")
      .eq("id", propuesta.empresa_id)
      .single();

    await supabase
      .from("empresas")
      .update({ total_contratos_ganados: (empresaActual?.total_contratos_ganados || 0) + 1 })
      .eq("id", propuesta.empresa_id);
  }

  // 6. Notificaciones en plataforma
  // Notificar empresa ganadora
  if (propuesta.empresas?.usuario_id) {
    await supabase
      .from("notificaciones")
      .insert({
        usuario_id: propuesta.empresas.usuario_id,
        tipo: "adjudicacion_ganada",
        titulo: "Ganaste la licitacion",
        mensaje: `Tu propuesta para "${licitacion.titulo}" fue seleccionada. Revisa las condiciones del contrato en tu dashboard.`,
        enlace: "/empresa",
      })
      .then(() => {});
  }

  // Notificar PH admin
  await supabase
    .from("notificaciones")
    .insert({
      usuario_id: user.id,
      tipo: "adjudicacion_completada",
      titulo: "Adjudicacion completada",
      mensaje: `La licitación "${licitacion.titulo}" ha sido adjudicada. La empresa recibirá el contrato para su aceptación.`,
      enlace: "/ph",
    })
    .then(() => {});

  // 7. Enviar emails vía Resend (sin bloquear la respuesta si fallan)
  try {
    const resend = getResend();
    const emailPromises: Promise<unknown>[] = [];

    const ph = licitacion.propiedades_horizontales;

    // Email a la empresa ganadora
    if (propuesta.empresas?.email) {
      emailPromises.push(
        resend.emails.send({
          from: FROM,
          to: propuesta.empresas.email,
          subject: `Ganaste la licitacion "${licitacion.titulo}"`,
          html: emailEmpresaGanadora({
            empresa_nombre: propuesta.empresas.nombre ?? "Tu empresa",
            titulo_licitacion: licitacion.titulo,
            ph_nombre: ph?.nombre ?? "el PH",
            monto_mensual: propuesta.precio_anual
              ? propuesta.precio_anual / 12
              : null,
          }),
        })
      );
    }

    // Email al PH admin
    if (ph?.email_contacto) {
      emailPromises.push(
        resend.emails.send({
          from: FROM,
          to: ph.email_contacto,
          subject: `Adjudicacion completada — ${licitacion.titulo}`,
          html: emailPhAdminAdjudicacion({
            titulo_licitacion: licitacion.titulo,
            empresa_nombre: propuesta.empresas?.nombre ?? "La empresa seleccionada",
            ph_nombre: ph?.nombre ?? "",
          }),
        })
      );
    }

    await Promise.allSettled(emailPromises);
  } catch (err) {
    // Email falla silenciosamente — operación principal ya fue exitosa
    console.error("Error enviando emails de adjudicación:", err);
  }

  return NextResponse.json({
    success: true,
    contrato_id: contrato?.id,
    message: "Licitación adjudicada exitosamente. La empresa debe aceptar el contrato.",
  });
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

function emailEmpresaGanadora({
  empresa_nombre,
  titulo_licitacion,
  ph_nombre,
  monto_mensual,
}: {
  empresa_nombre: string;
  titulo_licitacion: string;
  ph_nombre: string;
  monto_mensual: number | null;
}) {
  const monto = monto_mensual
    ? `$${monto_mensual.toLocaleString("es-PA", { maximumFractionDigits: 0 })}/mes`
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
      <div style="font-size:32px;text-align:center;margin-bottom:16px;">Felicitaciones</div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;text-align:center;margin:0 0 8px;color:#4ADE80;">
        Ganaste la licitacion
      </h1>
      <p style="text-align:center;color:#8896AA;font-size:14px;margin:0 0 24px;">
        Tu propuesta para <strong style="color:#F0F4FF;">${titulo_licitacion}</strong> fue seleccionada por <strong style="color:#F0F4FF;">${ph_nombre}</strong>.
      </p>
      <div style="background:rgba(74,222,128,0.05);border:1px solid rgba(74,222,128,0.15);border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Monto adjudicado</div>
        <div style="font-size:28px;font-weight:800;color:#4ADE80;font-family:'Plus Jakarta Sans',sans-serif;">${monto}</div>
      </div>
      <p style="color:#8896AA;font-size:13px;line-height:1.7;margin:0 0 20px;">
        Se ha generado un contrato con las condiciones acordadas. Ingresa a tu portal, revisa los detalles y acepta el contrato para que entre en vigencia.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/empresa" style="display:block;text-align:center;background:#4ADE80;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Revisar y aceptar contrato
      </a>
    </div>
  </div>
</body>
</html>`;
}

function emailPhAdminAdjudicacion({
  titulo_licitacion,
  empresa_nombre,
  ph_nombre,
}: {
  titulo_licitacion: string;
  empresa_nombre: string;
  ph_nombre: string;
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
    <div style="background:#0D1117;border:1px solid rgba(201,168,76,0.2);border-radius:16px;padding:32px;">
      <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;margin-bottom:16px;">
        Adjudicacion completada
      </div>
      <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;margin:0 0 12px;color:#F0F4FF;">
        La licitacion fue adjudicada
      </h1>
      <p style="color:#8896AA;font-size:14px;line-height:1.7;margin:0 0 24px;">
        La licitacion <strong style="color:#F0F4FF;">${titulo_licitacion}</strong> de <strong style="color:#F0F4FF;">${ph_nombre}</strong>
        fue adjudicada a <strong style="color:#F0F4FF;">${empresa_nombre}</strong>.
        La empresa recibirá el contrato para su revision y aceptacion formal.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/ph" style="display:block;text-align:center;background:#C9A84C;color:#07090F;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;">
        Ver estado del contrato
      </a>
    </div>
  </div>
</body>
</html>`;
}
