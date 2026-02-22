import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

// GET /api/propuestas?licitacion_id=xxx — propuestas de una licitación (PH) o las de la empresa
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const licitacion_id = searchParams.get("licitacion_id");
  const tipo = user.user_metadata?.tipo_usuario;

  if (tipo === "ph_admin" && licitacion_id) {
    // SECURITY: verify fecha_cierre has passed before showing proposals
    const { data: lic, error: licErr } = await supabase
      .from("licitaciones")
      .select("id, fecha_cierre, estado, ph_id, propiedades_horizontales(admin_id)")
      .eq("id", licitacion_id)
      .single();

    if (licErr || !lic) return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });

    // Verify ownership
    const adminId = (lic as any).propiedades_horizontales?.admin_id;
    if (adminId !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // Block if licitación is still open (fecha_cierre in the future) and not in evaluation/adjudicada
    // Use end-of-day comparison: fecha_cierre "2025-02-22" = until 23:59:59 Panama time (UTC-5)
    const estaAbierta = (fechaCierre: string | null) => {
      if (!fechaCierre) return false;
      // If date-only string (YYYY-MM-DD), treat as end of that day in UTC-5 (Panama)
      const dateStr = fechaCierre.includes("T") ? fechaCierre : `${fechaCierre}T23:59:59-05:00`;
      return new Date(dateStr) > new Date();
    };
    const estadosAbiertos = ["activa"];
    if (estadosAbiertos.includes(lic.estado) && estaAbierta(lic.fecha_cierre)) {
      const fechaCierreISO = lic.fecha_cierre;
      return NextResponse.json({
        bloqueado: true,
        fecha_cierre: fechaCierreISO,
        mensaje: "Las propuestas no son visibles hasta que cierre el período de recepción",
      }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("propuestas")
      .select(`
        *,
        empresas (id, nombre, anios_experiencia, calificacion_promedio, categorias),
        respuestas_requisito (*)
      `)
      .eq("licitacion_id", licitacion_id)
      .neq("estado", "borrador")
      .order("puntaje_ia", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (tipo === "empresa") {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", user.id)
      .single();

    if (!empresa) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
      .from("propuestas")
      .select(`
        *,
        licitaciones (titulo, categoria, propiedades_horizontales (nombre, ciudad))
      `)
      .eq("empresa_id", empresa.id)
      .order("creado_en", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
}

// POST /api/propuestas — enviar propuesta a una licitación
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "empresa") {
    return NextResponse.json({ error: "Solo empresas pueden enviar propuestas" }, { status: 401 });
  }

  const body = await request.json();
  const {
    licitacion_id,
    precio_anual,
    descripcion,
    propuesta_tecnica,
    disponibilidad_inicio,
    modalidad_pago,
    detalle_pago,
    acepta_condiciones,
    acepta_inspeccion,
    acepta_penalidades,
  } = body;

  // Validaciones obligatorias
  if (!licitacion_id) {
    return NextResponse.json({ error: "licitacion_id es requerido" }, { status: 400 });
  }
  if (!precio_anual || isNaN(Number(precio_anual)) || Number(precio_anual) <= 0) {
    return NextResponse.json({ error: "El precio anual es requerido y debe ser un número positivo" }, { status: 400 });
  }
  if (acepta_condiciones !== true) {
    return NextResponse.json({ error: "Debe aceptar las condiciones generales" }, { status: 400 });
  }
  if (acepta_inspeccion !== true) {
    return NextResponse.json({ error: "Debe aceptar el compromiso de inspección previa" }, { status: 400 });
  }
  if (acepta_penalidades !== true) {
    return NextResponse.json({ error: "Debe aceptar las penalidades por incumplimiento" }, { status: 400 });
  }

  // Verificar empresa
  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nombre, anios_experiencia, descripcion, categorias, calificacion_promedio, total_contratos_ganados")
    .eq("usuario_id", user.id)
    .single();

  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  // Verificar que la licitación existe, está activa y no ha cerrado por fecha
  const { data: licitacion } = await supabase
    .from("licitaciones")
    .select("id, titulo, categoria, descripcion, ph_id, estado, fecha_cierre, presupuesto_minimo, presupuesto_maximo, duracion_contrato_meses")
    .eq("id", licitacion_id)
    .single();

  if (!licitacion || licitacion.estado !== "activa") {
    return NextResponse.json({ error: "Licitación no disponible" }, { status: 400 });
  }

  // Verificar que la fecha de cierre no haya pasado (end-of-day Panamá UTC-5)
  if (licitacion.fecha_cierre) {
    const cierreEndOfDay = new Date(
      licitacion.fecha_cierre.includes("T")
        ? licitacion.fecha_cierre
        : `${licitacion.fecha_cierre}T23:59:59-05:00`
    );
    if (cierreEndOfDay < new Date()) {
      return NextResponse.json({ error: "El período de recepción de propuestas ya cerró" }, { status: 400 });
    }
  }

  // Verificar que la empresa no haya enviado propuesta previamente
  // Usar maybeSingle() para no lanzar error cuando no hay filas (PGRST116)
  const { data: propuestaExistente } = await supabase
    .from("propuestas")
    .select("id, estado")
    .eq("licitacion_id", licitacion_id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();

  if (propuestaExistente) {
    return NextResponse.json({
      error: "Ya enviaste una propuesta para esta licitación. No se puede modificar una propuesta enviada.",
    }, { status: 409 });
  }

  // Contar documentos subidos por la empresa
  const { count: totalDocs } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .eq("entidad_tipo", "empresa")
    .eq("entidad_id", empresa.id);

  // Calcular puntaje con Claude AI (con fallback al scoring simple)
  const { puntaje_ia, analisis_ia } = await scoringConClaude({
    licitacion,
    empresa,
    precio_anual,
    descripcion,
    propuesta_tecnica,
    modalidad_pago,
    total_docs: totalDocs ?? 0,
  });

  // Insert propuesta nueva (sin upsert — ya verificamos que no existe)
  const { data: propuesta, error } = await supabase
    .from("propuestas")
    .insert({
      licitacion_id,
      empresa_id: empresa.id,
      precio_anual: precio_anual || null,
      descripcion,
      propuesta_tecnica,
      disponibilidad_inicio: disponibilidad_inicio || null,
      modalidad_pago: modalidad_pago || null,
      detalle_pago: detalle_pago || null,
      acepta_condiciones: acepta_condiciones === true,
      acepta_inspeccion: acepta_inspeccion === true,
      acepta_penalidades: acepta_penalidades === true,
      estado: "enviada",
      puntaje_ia,
      analisis_ia,
      enviada_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al PH admin
  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("admin_id")
    .eq("id", licitacion.ph_id)
    .single();

  if (ph?.admin_id) {
    await supabase
      .from("notificaciones")
      .insert({
        usuario_id: ph.admin_id,
        tipo: "propuesta_recibida",
        titulo: "Nueva propuesta recibida",
        mensaje: `Una empresa envió una propuesta para "${licitacion.titulo}"`,
        enlace: "/ph",
      })
      .then(() => {});
  }

  return NextResponse.json({ success: true, propuesta });
}

// ─── SCORING CON CLAUDE AI ────────────────────────────────────────────────────

async function scoringConClaude({
  licitacion,
  empresa,
  precio_anual,
  descripcion,
  propuesta_tecnica,
  modalidad_pago,
  total_docs,
}: {
  licitacion: {
    titulo: string;
    categoria: string;
    descripcion: string | null;
    presupuesto_minimo: number | null;
    presupuesto_maximo: number | null;
    duracion_contrato_meses: number | null;
  };
  empresa: {
    nombre: string;
    anios_experiencia: number | null;
    descripcion: string | null;
    categorias: string[] | null;
    calificacion_promedio: number | null;
    total_contratos_ganados: number | null;
  };
  precio_anual: number;
  descripcion: string;
  propuesta_tecnica: string;
  modalidad_pago: string;
  total_docs: number;
}): Promise<{ puntaje_ia: number; analisis_ia: Record<string, unknown> }> {

  // Fallback rápido si no hay API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackScoring({ precio_anual, empresa, descripcion, propuesta_tecnica, modalidad_pago, total_docs });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const presupuestoRef = licitacion.presupuesto_maximo
      ? `$${licitacion.presupuesto_maximo.toLocaleString()}`
      : licitacion.presupuesto_minimo
        ? `desde $${licitacion.presupuesto_minimo.toLocaleString()}`
        : "no especificado";

    const prompt = `Eres un evaluador experto de propuestas para licitaciones de propiedades horizontales en Panamá.

LICITACIÓN:
- Título: ${licitacion.titulo}
- Categoría: ${licitacion.categoria}
- Descripción: ${licitacion.descripcion ?? "No especificada"}
- Presupuesto referencia: ${presupuestoRef}
- Duración: ${licitacion.duracion_contrato_meses ?? 12} meses

EMPRESA PROPONENTE:
- Nombre: ${empresa.nombre}
- Años de experiencia: ${empresa.anios_experiencia ?? 0}
- Categorías de servicio: ${(empresa.categorias ?? []).join(", ") || "No especificadas"}
- Calificación promedio (plataforma): ${empresa.calificacion_promedio ?? "Sin calificación"}
- Contratos ganados previos: ${empresa.total_contratos_ganados ?? 0}
- Descripción empresa: ${empresa.descripcion ?? "No proporcionada"}
- Documentos subidos: ${total_docs}

PROPUESTA ENVIADA:
- Precio anual ofertado: $${precio_anual?.toLocaleString() ?? "No especificado"}
- Modalidad de pago: ${modalidad_pago ?? "No especificada"}
- Descripción de la propuesta: ${descripcion ?? "No proporcionada"}
- Propuesta técnica: ${propuesta_tecnica ?? "No proporcionada"}

INSTRUCCIONES:
Evalúa esta propuesta y devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "precio": <número 0-35, donde 35 es el mejor precio considerando el presupuesto de referencia>,
  "experiencia": <número 0-25, donde 25 es máxima experiencia comprobable>,
  "propuesta_tecnica": <número 0-25, donde 25 es propuesta técnica muy detallada y específica>,
  "documentacion": <número 0-10, donde 10 es documentación completa (${total_docs} docs subidos)>,
  "reputacion": <número 0-5, donde 5 es excelente reputación y historial>,
  "total": <suma de los anteriores, máximo 100>,
  "fortalezas": ["fortaleza 1", "fortaleza 2"],
  "debilidades": ["debilidad 1", "debilidad 2"],
  "recomendacion": "texto corto de 1-2 oraciones sobre esta propuesta"
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    // Extraer JSON (puede venir con markdown ```json ... ```)
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result = JSON.parse(jsonStr);

    // Validar y sanitizar
    const precio = Math.min(35, Math.max(0, Number(result.precio) || 0));
    const experiencia = Math.min(25, Math.max(0, Number(result.experiencia) || 0));
    const propuesta_pts = Math.min(25, Math.max(0, Number(result.propuesta_tecnica) || 0));
    const documentacion = Math.min(10, Math.max(0, Number(result.documentacion) || 0));
    const reputacion = Math.min(5, Math.max(0, Number(result.reputacion) || 0));
    const total = Math.min(100, Math.round(precio + experiencia + propuesta_pts + documentacion + reputacion));

    return {
      puntaje_ia: total,
      analisis_ia: {
        precio,
        experiencia,
        propuesta_tecnica: propuesta_pts,
        documentacion,
        reputacion,
        total,
        fortalezas: Array.isArray(result.fortalezas) ? result.fortalezas.slice(0, 3) : [],
        debilidades: Array.isArray(result.debilidades) ? result.debilidades.slice(0, 3) : [],
        recomendacion: typeof result.recomendacion === "string" ? result.recomendacion : "",
        modelo: "claude-haiku-4-5",
        evaluado_en: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("Error en scoring Claude:", err);
    // Si Claude falla, usar fallback
    return fallbackScoring({ precio_anual, empresa, descripcion, propuesta_tecnica, modalidad_pago, total_docs });
  }
}

function fallbackScoring({
  precio_anual,
  empresa,
  descripcion,
  propuesta_tecnica,
  modalidad_pago,
  total_docs,
}: {
  precio_anual: number;
  empresa: { anios_experiencia?: number | null };
  descripcion: string;
  propuesta_tecnica: string;
  modalidad_pago: string;
  total_docs: number;
}) {
  // Scoring de precio: proporcional al rango del presupuesto
  // Más bajo dentro del rango = más puntos (máx 35 si está debajo del mínimo, mín 5 si tiene precio)
  let precio = 0;
  if (precio_anual > 0) {
    // Sin contexto de presupuesto: asignar puntos por tener precio (base 20)
    // Con mejores descripciones sube
    precio = 20;
  }

  const propuesta_pts = (!!descripcion && descripcion.length > 50 ? 12 : 0) +
    (!!propuesta_tecnica && propuesta_tecnica.length > 100 ? 13 : 0);

  const experiencia = Math.min(25, (empresa.anios_experiencia || 0) * 4);
  const documentacion = Math.min(10, total_docs * 1.5);
  const reputacion = modalidad_pago ? 3 : 0;

  const total = Math.min(100, Math.round(precio + propuesta_pts + experiencia + documentacion + reputacion));

  return {
    puntaje_ia: total,
    analisis_ia: {
      precio,
      experiencia,
      propuesta_tecnica: propuesta_pts,
      documentacion,
      reputacion,
      total,
      fortalezas: [],
      debilidades: [],
      recomendacion: "",
      modelo: "fallback",
      evaluado_en: new Date().toISOString(),
    },
  };
}
