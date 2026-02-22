import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/ai/precios-mercado?categoria=seguridad&unidades=80
// Devuelve rango de precios histórico de propuestas GANADORAS por categoría
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria") || "";
  const unidades  = Number(searchParams.get("unidades") || 0);

  const supabase = await createClient();

  // Buscar propuestas ganadoras de licitaciones de la misma categoría
  const { data: propuestasGanadoras } = await supabase
    .from("propuestas")
    .select(`
      precio_anual,
      licitaciones!inner (
        categoria,
        duracion_contrato_meses,
        estado,
        fecha_adjudicacion
      )
    `)
    .eq("estado", "ganada")
    .eq("licitaciones.categoria", categoria)
    .not("precio_anual", "is", null)
    .order("creado_en", { ascending: false })
    .limit(50);

  // Buscar propuestas ganadoras similares (misma categoría, cualquier estado)
  const { data: todasPropuestas } = await supabase
    .from("propuestas")
    .select(`
      precio_anual,
      licitaciones!inner (categoria)
    `)
    .eq("licitaciones.categoria", categoria)
    .eq("estado", "ganada")
    .not("precio_anual", "is", null)
    .limit(100);

  const precios = (todasPropuestas ?? [])
    .map((p: Record<string, unknown>) => Number(p.precio_anual))
    .filter(p => p > 0)
    .sort((a, b) => a - b);

  if (precios.length === 0) {
    // Sin historial — devolver rangos por defecto conocidos del mercado panameño
    return NextResponse.json({
      tiene_historial: false,
      total_contratos: 0,
      rango: getRangoMercadoPanama(categoria, unidades),
      mensaje: `Sin contratos históricos en LicitaPH para esta categoría aún. Rango estimado basado en mercado panameño.`,
    });
  }

  const min    = precios[0];
  const max    = precios[precios.length - 1];
  const mediana = precios[Math.floor(precios.length / 2)];
  const promedio = Math.round(precios.reduce((a, b) => a + b, 0) / precios.length);
  // Percentil 25 y 75
  const p25 = precios[Math.floor(precios.length * 0.25)];
  const p75 = precios[Math.floor(precios.length * 0.75)];

  return NextResponse.json({
    tiene_historial: true,
    total_contratos: precios.length,
    rango: {
      minimo: min,
      maximo: max,
      mediana,
      promedio,
      recomendado_min: p25,
      recomendado_max: p75,
    },
    mensaje: `Basado en ${precios.length} contrato${precios.length !== 1 ? "s" : ""} ganado${precios.length !== 1 ? "s" : ""} en LicitaPH para esta categoría.`,
  });
}

// Rangos del mercado panameño por categoría (cuando no hay historial)
function getRangoMercadoPanama(categoria: string, unidades: number): {
  minimo: number; maximo: number; mediana: number; promedio: number;
  recomendado_min: number; recomendado_max: number;
} {
  // Factor de escala según tamaño del edificio
  const factor = unidades > 150 ? 1.4 : unidades > 80 ? 1.0 : 0.7;

  const rangos: Record<string, [number, number]> = {
    seguridad:         [24000, 72000],
    limpieza:          [12000, 36000],
    hvac:              [8000,  24000],
    jardineria:        [4000,  14400],
    ascensores:        [6000,  18000],
    electricidad:      [6000,  20000],
    pintura:           [8000,  40000],
    plagas:            [2400,  7200],
    piscinas:          [4800,  14400],
    impermeabilizacion:[12000, 60000],
    portones:          [3600,  12000],
    cctv:              [6000,  24000],
    incendio:          [6000,  20000],
    generadores:       [8000,  24000],
    fumigacion:        [2400,  7200],
    conserje:          [14400, 36000],
    valet:             [18000, 48000],
    administracion:    [18000, 60000],
    tecnologia:        [6000,  24000],
    legal_contable:    [12000, 36000],
  };

  const [base_min, base_max] = rangos[categoria] ?? [6000, 30000];
  const min = Math.round(base_min * factor / 1000) * 1000;
  const max = Math.round(base_max * factor / 1000) * 1000;
  const mediana = Math.round((min + max) / 2 / 1000) * 1000;

  return {
    minimo: min,
    maximo: max,
    mediana,
    promedio: mediana,
    recomendado_min: Math.round(min * 1.1 / 1000) * 1000,
    recomendado_max: Math.round(max * 0.85 / 1000) * 1000,
  };
}
