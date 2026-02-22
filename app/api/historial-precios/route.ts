import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/historial-precios?categoria=pintura
// Returns adjudicated proposals grouped for price history analysis
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria") || null;

  const { data, error } = await supabase
    .from("propuestas")
    .select(`
      id,
      precio_anual,
      enviada_at,
      licitaciones (
        id, titulo, categoria, duracion_contrato_meses,
        fecha_adjudicacion,
        propiedades_horizontales (ciudad, provincia)
      )
    `)
    .eq("estado", "ganada")
    .not("precio_anual", "is", null)
    .order("enviada_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = (data || []) as any[];

  // Filter by category if specified
  if (categoria && categoria !== "todos") {
    rows = rows.filter(r => r.licitaciones?.categoria === categoria);
  }

  // Remove rows without price or licitacion
  rows = rows.filter(r => r.precio_anual && r.licitaciones);

  // Build stats by category
  const byCategoria: Record<string, {
    categoria: string;
    total: number;
    promedio: number;
    minimo: number;
    maximo: number;
    mediana: number;
    datos: { fecha: string; precio: number; ciudad: string; titulo: string }[];
  }> = {};

  for (const row of rows) {
    const cat = row.licitaciones.categoria;
    const precio = Number(row.precio_anual);
    const fecha = row.licitaciones.fecha_adjudicacion || row.enviada_at;
    const ciudad = row.licitaciones.propiedades_horizontales?.ciudad || "Panamá";
    const titulo = row.licitaciones.titulo || cat;

    if (!byCategoria[cat]) {
      byCategoria[cat] = { categoria: cat, total: 0, promedio: 0, minimo: Infinity, maximo: 0, mediana: 0, datos: [] };
    }
    byCategoria[cat].datos.push({ fecha, precio, ciudad, titulo });
    if (precio < byCategoria[cat].minimo) byCategoria[cat].minimo = precio;
    if (precio > byCategoria[cat].maximo) byCategoria[cat].maximo = precio;
  }

  // Calculate stats
  for (const cat of Object.keys(byCategoria)) {
    const precios = byCategoria[cat].datos.map(d => d.precio).sort((a, b) => a - b);
    byCategoria[cat].total = precios.length;
    byCategoria[cat].promedio = Math.round(precios.reduce((s, p) => s + p, 0) / precios.length);
    const mid = Math.floor(precios.length / 2);
    byCategoria[cat].mediana = precios.length % 2 !== 0
      ? precios[mid]
      : Math.round((precios[mid - 1] + precios[mid]) / 2);
    if (byCategoria[cat].minimo === Infinity) byCategoria[cat].minimo = 0;
  }

  const categorias = Object.values(byCategoria).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    categorias,
    total_adjudicaciones: rows.length,
  });
}
