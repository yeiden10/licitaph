import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/licitaciones — lista licitaciones del PH autenticado (o todas si empresa)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tipo = user.user_metadata?.tipo_usuario;
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");

  if (tipo === "ph_admin") {
    // Buscar el PH del admin
    const { data: ph } = await supabase
      .from("propiedades_horizontales")
      .select("id")
      .eq("admin_id", user.id)
      .single();

    if (!ph) return NextResponse.json({ error: "PH no encontrado" }, { status: 404 });

    let query = supabase
      .from("licitaciones")
      .select(`
        *,
        propiedades_horizontales (nombre, ciudad),
        propuestas (count)
      `)
      .eq("ph_id", ph.id)
      .order("creado_en", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (tipo === "empresa") {
    // Empresas ven licitaciones activas
    let query = supabase
      .from("licitaciones")
      .select(`
        *,
        propiedades_horizontales (nombre, ciudad),
        propuestas (count)
      `)
      .in("estado", ["activa"])
      .order("fecha_cierre", { ascending: true });

    const categoria = searchParams.get("categoria");
    if (categoria && categoria !== "todos") query = query.eq("categoria", categoria);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Tipo de usuario no válido" }, { status: 403 });
}

// POST /api/licitaciones — crear nueva licitación
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.tipo_usuario !== "ph_admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { titulo, categoria, descripcion, presupuesto_minimo, presupuesto_maximo,
          fecha_cierre, urgente, requisitos, duracion_contrato_meses,
          precio_referencia, precio_referencia_visible,
          fechas_inspeccion, lugar_inspeccion, condiciones_especiales } = body;

  // Buscar el PH del admin
  const { data: ph } = await supabase
    .from("propiedades_horizontales")
    .select("id, nombre")
    .eq("admin_id", user.id)
    .single();

  if (!ph) return NextResponse.json({ error: "No tienes un PH registrado" }, { status: 404 });

  // Generar slug único
  const base = `${titulo}-${ph.nombre}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 40);
  const slug = `${base}-${Date.now().toString(36)}`;

  // Crear licitación
  const { data: licitacion, error: licError } = await supabase
    .from("licitaciones")
    .insert({
      ph_id: ph.id,
      titulo,
      categoria,
      descripcion,
      presupuesto_minimo: presupuesto_minimo || null,
      presupuesto_maximo: presupuesto_maximo || null,
      fecha_cierre: fecha_cierre || null,
      duracion_contrato_meses: duracion_contrato_meses || 12,
      urgente: urgente || false,
      url_slug: slug,
      estado: body.publicar ? "activa" : "borrador",
      fecha_publicacion: body.publicar ? new Date().toISOString() : null,
      creado_por: user.id,
      // Campos de inspección y precio de referencia
      precio_referencia: precio_referencia || null,
      precio_referencia_visible: precio_referencia_visible || false,
      fechas_inspeccion: fechas_inspeccion || null,
      lugar_inspeccion: lugar_inspeccion || null,
      condiciones_especiales: condiciones_especiales || null,
    })
    .select()
    .single();

  if (licError) return NextResponse.json({ error: licError.message }, { status: 500 });

  // Crear requisitos del pliego
  if (requisitos && requisitos.length > 0) {
    const reqData = requisitos.map((r: any, i: number) => ({
      licitacion_id: licitacion.id,
      numero: i + 1,
      orden: i + 1,
      titulo: r.titulo,
      descripcion: r.descripcion,
      subsanable: r.subsanable || false,
      obligatorio: r.obligatorio !== false,
      tipo_respuesta: r.tipo_respuesta || "documento",
      nivel_importancia: r.obligatorio !== false ? "obligatorio" : "opcional",
    }));

    const { error: reqError } = await supabase
      .from("requisitos_licitacion")
      .insert(reqData);

    if (reqError) console.error("Error creando requisitos:", reqError.message);
  }

  // Notificar empresas si se publica (en background)
  if (body.publicar) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ licitacion_id: licitacion.id }),
      }).catch(() => {}); // No bloquear si falla
    } catch {}
  }

  return NextResponse.json({ success: true, licitacion, slug, id: licitacion.id });
}
