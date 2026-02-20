import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Calcular porcentaje de completitud del KYC
function calcularPorcentaje(kyc: Record<string, unknown>): number {
  const camposRequeridos = [
    "ruc",
    "ano_inicio_operaciones",
    "descripcion",
    "actividades_economicas",
    "categorias_servicio",
    "representante_nombre",
    "representante_cedula",
    "representante_tipo_id",
    "representante_nacionalidad",
    "representante_email",
    "representante_telefono",
    "contacto_nombre",
    "contacto_cargo",
    "contacto_email",
    "contacto_telefono",
    "emails_empresa",
    "telefonos_empresa",
    "direccion",
    "ciudad",
    "provincia",
    "num_empleados",
  ];

  const camposOpcionales = [
    "sitio_web",
    "contable_nombre",
    "contable_email",
    "contable_telefono",
    "facturacion_anual_promedio",
    "referencias_bancarias",
    "tiene_seguro_responsabilidad",
    "tiene_fianza_cumplimiento",
    "porcentaje_fianza_ofrecido",
    "referencias_comerciales",
  ];

  let completados = 0;
  const totalRequeridos = camposRequeridos.length;
  const totalOpcionales = camposOpcionales.length;
  const total = totalRequeridos + totalOpcionales;

  for (const campo of camposRequeridos) {
    const val = kyc[campo];
    if (val !== null && val !== undefined && val !== "") {
      if (Array.isArray(val) && val.length === 0) continue;
      completados++;
    }
  }

  for (const campo of camposOpcionales) {
    const val = kyc[campo];
    if (val !== null && val !== undefined && val !== "") {
      if (Array.isArray(val) && val.length === 0) continue;
      completados++;
    }
  }

  return Math.round((completados / total) * 100);
}

// GET /api/empresa/kyc — obtener KYC de la empresa del usuario autenticado
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Obtener empresa del usuario
  const { data: empresa, error: empError } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (empError || !empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  // Obtener KYC
  const { data: kyc, error } = await supabase
    .from("empresa_kyc")
    .select("*")
    .eq("empresa_id", empresa.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found (no KYC aún, no es error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kyc: kyc || null });
}

// PUT /api/empresa/kyc — crear o actualizar KYC con upsert
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.tipo_usuario !== "empresa") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Obtener empresa del usuario
  const { data: empresa, error: empError } = await supabase
    .from("empresas")
    .select("id")
    .eq("usuario_id", user.id)
    .single();

  if (empError || !empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }

  const body = await request.json();

  // Construir payload permitido (evitar campos no controlados)
  const payload: Record<string, unknown> = {
    empresa_id: empresa.id,
    // Datos de la empresa
    ruc: body.ruc ?? null,
    ano_inicio_operaciones: body.ano_inicio_operaciones ?? null,
    descripcion: body.descripcion ?? null,
    sitio_web: body.sitio_web ?? null,
    actividades_economicas: body.actividades_economicas ?? [],
    categorias_servicio: body.categorias_servicio ?? [],
    // Representante legal
    representante_nombre: body.representante_nombre ?? null,
    representante_cedula: body.representante_cedula ?? null,
    representante_tipo_id: body.representante_tipo_id ?? null,
    representante_nacionalidad: body.representante_nacionalidad ?? null,
    representante_email: body.representante_email ?? null,
    representante_telefono: body.representante_telefono ?? null,
    // Contacto principal
    contacto_nombre: body.contacto_nombre ?? null,
    contacto_cargo: body.contacto_cargo ?? null,
    contacto_email: body.contacto_email ?? null,
    contacto_telefono: body.contacto_telefono ?? null,
    // Contacto contable
    contable_nombre: body.contable_nombre ?? null,
    contable_email: body.contable_email ?? null,
    contable_telefono: body.contable_telefono ?? null,
    // Contacto general
    emails_empresa: body.emails_empresa ?? [],
    telefonos_empresa: body.telefonos_empresa ?? [],
    direccion: body.direccion ?? null,
    ciudad: body.ciudad ?? null,
    provincia: body.provincia ?? null,
    // Información financiera
    num_empleados: body.num_empleados ?? null,
    facturacion_anual_promedio: body.facturacion_anual_promedio ?? null,
    referencias_bancarias: body.referencias_bancarias ?? null,
    // Seguros y fianzas
    tiene_seguro_responsabilidad: body.tiene_seguro_responsabilidad ?? false,
    tiene_fianza_cumplimiento: body.tiene_fianza_cumplimiento ?? false,
    porcentaje_fianza_ofrecido: body.porcentaje_fianza_ofrecido ?? null,
    // Referencias comerciales
    referencias_comerciales: body.referencias_comerciales ?? null,
    // Estado calculado
    actualizado_en: new Date().toISOString(),
  };

  // Calcular porcentaje de completitud
  const porcentaje = calcularPorcentaje(payload);
  payload.porcentaje_completado = porcentaje;
  payload.completado = porcentaje >= 80;

  const { data: kyc, error } = await supabase
    .from("empresa_kyc")
    .upsert(payload, { onConflict: "empresa_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, kyc, porcentaje_completado: porcentaje });
}
