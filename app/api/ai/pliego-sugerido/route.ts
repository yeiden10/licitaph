import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const { categoria, titulo, descripcion, presupuesto_maximo } = await request.json();

  if (!categoria) {
    return NextResponse.json({ error: "categoria requerida" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(fallbackSugerencias(categoria), { status: 200 });
  }

  // Determinar escala según presupuesto para orientar la IA
  let escalaStr = "";
  if (presupuesto_maximo && presupuesto_maximo > 0) {
    if (presupuesto_maximo < 2000) {
      escalaStr = `\n\nIMPORTANTE — ESCALA DEL CONTRATO: Este es un contrato PEQUEÑO (B/. ${presupuesto_maximo.toLocaleString()}/año). Las especificaciones, garantías y personal requerido deben ser PROPORCIONALES a este tamaño. NO pidas requisitos de grandes empresas ni garantías excesivas. Adapta todo a una empresa pequeña o mediana que puede atender este trabajo.`;
    } else if (presupuesto_maximo < 10000) {
      escalaStr = `\n\nIMPORTANTE — ESCALA DEL CONTRATO: Contrato de tamaño mediano (B/. ${presupuesto_maximo.toLocaleString()}/año). Las especificaciones deben ser profesionales pero proporcionales.`;
    } else {
      escalaStr = `\n\nIMPORTANTE — ESCALA DEL CONTRATO: Contrato de tamaño grande (B/. ${presupuesto_maximo.toLocaleString()}/año). Aplican especificaciones completas y garantías robustas.`;
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Eres un experto en administración de propiedades horizontales en Panamá con 20 años de experiencia elaborando pliegos de cargos profesionales.

El administrador de un edificio de apartamentos en Panamá necesita crear un pliego de cargos para contratar el servicio de: **${titulo || categoria}**

Descripción adicional: ${descripcion || "No especificada"}${escalaStr}

Genera un pliego de cargos técnico en español panameño con las siguientes secciones. Responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto adicional):

{
  "descripcion_tecnica": "Descripción técnica detallada del servicio que se requiere, incluyendo alcance, especificaciones mínimas de calidad, estándares aplicables. 3-5 oraciones.",
  "especificaciones_tecnicas": [
    "Especificación técnica específica 1 (ej: materiales, marcas recomendadas, normas técnicas)",
    "Especificación técnica específica 2",
    "Especificación técnica específica 3",
    "Especificación técnica específica 4",
    "Especificación técnica específica 5"
  ],
  "frecuencia_servicio": "Descripción de la frecuencia e intensidad del servicio (ej: visitas semanales, mantenimiento preventivo mensual, etc.)",
  "garantias_requeridas": "Garantías mínimas que debe ofrecer el proveedor (materiales, mano de obra, equipos, tiempo de respuesta ante emergencias)",
  "personal_requerido": "Perfiles del personal que debe proveer la empresa (cantidad, calificaciones, idoneidades requeridas por ley panameña si aplica)",
  "penalidades_especificas": "Penalidades específicas por incumplimientos típicos de este tipo de servicio (respuesta tardía, calidad deficiente, etc.)",
  "requisitos_adicionales": [
    "Requisito adicional específico 1 para este tipo de servicio",
    "Requisito adicional específico 2",
    "Requisito adicional específico 3"
  ]
}

IMPORTANTE:
- Las recomendaciones deben ser específicas para el mercado panameño
- Menciona marcas, normas o estándares reconocidos en Panamá cuando aplique
- El lenguaje debe ser formal y apropiado para un contrato legal
- Para servicios como pintura: recomendar marcas (Glidden, Sur, Sherwin-Williams), capas mínimas, garantía mínima 2 años
- Para HVAC: mencionar normas ASHRAE, refrigerantes autorizados en Panamá
- Para ascensores: mencionar AOTC, certificaciones requeridas
- Para impermeabilización: tipo de membrana, garantía mínima 5 años contra filtraciones
- Para piscinas: parámetros de pH, cloro residual, frecuencia de mantenimiento`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      sugerencias: result,
    });
  } catch (err) {
    console.error("Error generando pliego:", err);
    return NextResponse.json(fallbackSugerencias(categoria), { status: 200 });
  }
}

function fallbackSugerencias(categoria: string) {
  const defaults: Record<string, object> = {
    pintura: {
      descripcion_tecnica: "Servicio de pintura integral de fachadas, áreas comunes y zonas designadas del edificio. Se requiere uso de pintura de primera calidad con resistencia a la intemperie y garantía mínima de 2 años.",
      especificaciones_tecnicas: [
        "Pintura acrílica de exterior marca Glidden, Sur o Sherwin-Williams, acabado satinado",
        "Mínimo 2 capas de pintura sobre imprimante sellador apropiado",
        "Preparación de superficie: raspado, masillado y lijado previo",
        "Garantía mínima 2 años contra descascaramiento, ampollamiento y decoloración",
        "El contratista debe proveer colores de muestra aprobados por la junta directiva",
      ],
      frecuencia_servicio: "Contrato de servicio único con garantía de mantenimiento incluida. Visita de inspección a los 6 y 12 meses.",
      garantias_requeridas: "Garantía de 2 años sobre mano de obra y materiales. Respuesta en 48 horas ante defectos cubiertos.",
      personal_requerido: "Mínimo 4 pintores con experiencia comprobable, supervisor de obra presente en todo momento.",
      penalidades_especificas: "5% del valor del contrato por cada semana de retraso injustificado. 100% de rehacer el trabajo si no cumple especificaciones.",
      requisitos_adicionales: [
        "Certificado de calidad del fabricante de la pintura",
        "Fotos del proceso (antes, durante, después)",
        "Hoja de seguridad (MSDS) de todos los productos utilizados",
      ],
    },
    limpieza: {
      descripcion_tecnica: "Servicio de limpieza general de áreas comunes incluyendo lobby, pasillos, escaleras, sótano y áreas exteriores. Frecuencia diaria con supervisión y control de calidad.",
      especificaciones_tecnicas: [
        "Personal uniformado con equipos de protección personal (EPP)",
        "Uso de productos de limpieza biodegradables certificados",
        "Equipos de limpieza profesional (mopas húmedas, aspiradoras industriales, máquinas de piso)",
        "Bitácora de limpieza diaria firmada por supervisor",
        "Servicio de limpieza profunda mensual incluido en el precio",
      ],
      frecuencia_servicio: "Limpieza diaria de lunes a sábado, mínimo 4 horas por visita. Limpieza profunda el primer sábado de cada mes.",
      garantias_requeridas: "Sustitución del personal en caso de ausencia injustificada en máximo 2 horas. Seguro de fidelidad del personal incluido.",
      personal_requerido: "Mínimo 2 operarios por turno, con supervisor de área. Todos con CSS al día y antecedentes penales.",
      penalidades_especificas: "B/. 50 por ausencia no notificada. B/. 100 por daño a bienes del edificio causado por el personal.",
      requisitos_adicionales: [
        "Lista completa del personal con cédulas",
        "Uniformes con logo de la empresa",
        "Registro sanitario de productos de limpieza",
      ],
    },
  };

  const cat = categoria.toLowerCase();
  const def = (defaults[cat] as object | undefined) || {
    descripcion_tecnica: `Servicio profesional de ${categoria} para propiedad horizontal. Se requiere empresa con experiencia mínima de 3 años en edificios residenciales.`,
    especificaciones_tecnicas: [
      "Personal certificado y con experiencia comprobable",
      "Equipos y materiales de primera calidad",
      "Cumplimiento de normas de seguridad ocupacional",
      "Seguro de responsabilidad civil vigente",
      "Disponibilidad para emergencias 24/7",
    ],
    frecuencia_servicio: "Según necesidad del servicio, con visitas programadas y servicio de emergencia incluido.",
    garantias_requeridas: "Garantía mínima de 1 año sobre trabajos realizados. Respuesta ante emergencias en máximo 4 horas.",
    personal_requerido: "Personal con experiencia mínima de 2 años, idoneidades vigentes según ley panameña.",
    penalidades_especificas: "10% del valor mensual por incumplimiento de SLA. Reemplazo del personal previa solicitud del administrador.",
    requisitos_adicionales: [
      "Protocolo de trabajo y metodología detallada",
      "Referencias de al menos 3 propiedades horizontales atendidas",
      "Póliza de seguro de responsabilidad civil con cobertura mínima de B/. 100,000",
    ],
  };

  return { success: true, sugerencias: def };
}
