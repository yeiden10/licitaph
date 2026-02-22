import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface EvaluacionRequest {
  messages: ChatMessage[];
  licitacion_titulo: string;
  licitacion_descripcion?: string;
  licitacion_categoria?: string;
  licitacion_condiciones?: string; // clausulas de alcance generadas en el wizard
}

// Sistema de evaluación: Claude interroga a la empresa para extraer info real
// NO ayuda a redactar — extrae hechos concretos que el PH verá estructurados
const SYSTEM_EVALUACION = `Eres un evaluador profesional de empresas para licitaciones de Propiedades Horizontales en Panamá. Tu rol es INTERROGAR a la empresa postulante para obtener información concreta y verificable que el administrador del PH usará para tomar su decisión.

OBJETIVO: Extraer hechos reales, no redactar textos bonitos. El administrador necesita datos concretos para comparar empresas.

REGLAS:
1. Haz UNA sola pregunta a la vez. Sé directo y específico.
2. Si la empresa da respuestas vagas ("tenemos mucha experiencia"), presiona con preguntas de seguimiento para obtener datos concretos (números, nombres, fechas).
3. Después de 4-5 preguntas (o antes si ya tienes suficientes datos), genera el resumen estructurado.
4. NO uses lenguaje elogioso. Sé neutral y objetivo.
5. Si la empresa no sabe o no responde algo, anótalo como "No especificado".
6. Si hay CLÁUSULAS DE ALCANCE en el pliego, DEBES preguntar explícitamente si su precio incluye esos elementos. Compara sus respuestas con las cláusulas y reporta contradicciones.

PREGUNTAS PRIORITARIAS (elige las más relevantes para el servicio):
- "¿Cuántos años llevan operando y cuántas propiedades horizontales atienden actualmente?" (número exacto)
- "¿Cuánto personal asignarían específicamente a este edificio y cuáles serían sus horarios?"
- "¿Pueden dar el nombre y teléfono de un administrador de PH al que hayan prestado este servicio en los últimos 12 meses?"
- "¿Qué pasaría si un empleado suyo falla o causa un daño en el edificio? ¿Tienen seguro y de cuánto?"
- "¿Cuál es su tiempo de respuesta garantizado ante una emergencia o reclamo?"
- (Si aplica) "¿Tienen las certificaciones o licencias requeridas para este servicio? ¿Cuáles?"
- (Si hay cláusulas de alcance) Preguntar directamente: "El pliego indica que [cláusula]. ¿Confirman que su precio mensual incluye esto?"

CUANDO TENGAS SUFICIENTE INFORMACIÓN (4-5 respuestas), responde SOLO con este JSON:
{
  "listo": true,
  "resumen_estructurado": "EVALUACIÓN TÉCNICA\\n\\n[EMPRESA: resumen objetivo de lo que dijeron, con datos concretos mencionados]\\n\\nEXPERIENCIA: [años, cantidad de PHs, referencias mencionadas]\\n\\nCAPACIDAD OPERATIVA: [personal asignado, horarios, equipos]\\n\\nGARANTÍAS Y SEGUROS: [lo que mencionaron]\\n\\nTIEMPO DE RESPUESTA: [lo comprometido]\\n\\nOBSERVACIONES: [respuestas vagas, datos no confirmados, aspectos a verificar]\\n\\nALERTAS DE ALCANCE: [si la empresa dijo que algo NO está incluido pero el pliego lo exige, listarlo aquí como ⚠️ ALERTA]",
  "datos_clave": {
    "anos_experiencia": 0,
    "phs_actuales": 0,
    "tiene_seguro": true,
    "tiempo_respuesta": "",
    "referencia_verificable": true
  },
  "alertas_alcance": ["Lista de alertas si la empresa contradijo cláusulas del pliego. Ej: '⚠️ La empresa indicó que los uniformes NO están incluidos en su precio, pero el pliego lo exige.'"],
  "mensaje_final": "Cuestionario completado. Tus respuestas han sido registradas para evaluación del administrador."
}`;

export async function POST(request: NextRequest) {
  const body: EvaluacionRequest = await request.json();
  const { messages, licitacion_titulo, licitacion_descripcion, licitacion_categoria, licitacion_condiciones } = body;

  // Sin mensajes de usuario: primera pregunta
  if (messages.length === 0 || !messages.some(m => m.role === "user")) {
    return NextResponse.json({
      tipo: "pregunta",
      mensaje: `Para completar tu postulación a "${licitacion_titulo}", necesito hacerte algunas preguntas para que el administrador del edificio pueda evaluar tu propuesta. Empecemos: ¿Cuántos años llevan operando como empresa y cuántas propiedades horizontales atienden actualmente?`,
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback sin API key: preguntas fijas
    const preguntasFallback = [
      "¿Cuánto personal asignarían específicamente a este edificio y en qué horarios?",
      "¿Pueden proporcionar el nombre y teléfono de un administrador de PH al que hayan prestado este servicio recientemente?",
      "¿Tienen seguro de responsabilidad civil? ¿De cuánto es la cobertura?",
      "¿Cuál es su tiempo de respuesta garantizado ante emergencias?",
    ];
    const preguntaIdx = Math.floor(messages.filter(m => m.role === "assistant").length);

    if (preguntaIdx >= preguntasFallback.length) {
      // Compilar resumen con las respuestas dadas
      const respuestasTexto = messages
        .filter(m => m.role === "user")
        .map((m, i) => `P${i + 1}: ${m.content}`)
        .join("\n");
      return NextResponse.json({
        tipo: "completado",
        resumen_estructurado: `EVALUACIÓN TÉCNICA\n\n${respuestasTexto}\n\nOBSERVACIONES: Información proporcionada por la empresa. Verificar antes de adjudicar.`,
        datos_clave: { anos_experiencia: 0, phs_actuales: 0, tiene_seguro: false, tiempo_respuesta: "", referencia_verificable: false },
        mensaje: "Cuestionario completado. Tus respuestas han sido registradas.",
      });
    }

    return NextResponse.json({
      tipo: "pregunta",
      mensaje: preguntasFallback[preguntaIdx],
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Extract anti-additional clauses from condiciones if present
    const clausulasAlcance = licitacion_condiciones
      ? licitacion_condiciones.split("\n").filter(l => l.trim().startsWith("•")).map(l => l.replace("•", "").trim())
      : [];

    const systemConContexto = `${SYSTEM_EVALUACION}

LICITACIÓN EN EVALUACIÓN:
- Título: ${licitacion_titulo}
- Categoría: ${licitacion_categoria || "general"}
- Descripción: ${licitacion_descripcion || "no especificada"}
${clausulasAlcance.length > 0 ? `\nCLÁUSULAS DE ALCANCE DEL PLIEGO (lo que el PH exige que esté incluido en el precio):\n${clausulasAlcance.map(c => `  - ${c}`).join("\n")}\n\nIMPORTANTE: Debes preguntar explícitamente si la empresa confirma que su precio incluye estos elementos. Si dicen que NO, regístralo como ⚠️ ALERTA en alertas_alcance.` : ""}

Adapta las preguntas a este tipo específico de servicio.`;

    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemConContexto,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const rawText = (res.content[0] as { type: string; text: string }).text.trim();

    // Intentar parsear como JSON (evaluación completada)
    try {
      const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.listo && parsed.resumen_estructurado) {
        return NextResponse.json({
          tipo: "completado",
          resumen_estructurado: parsed.resumen_estructurado,
          datos_clave: parsed.datos_clave || {},
          alertas_alcance: parsed.alertas_alcance || [],
          mensaje: parsed.mensaje_final || "Cuestionario completado.",
        });
      }
    } catch {
      // No es JSON — pregunta normal
    }

    return NextResponse.json({
      tipo: "pregunta",
      mensaje: rawText,
    });
  } catch (err) {
    console.error("Error en evaluacion empresa:", err);
    return NextResponse.json({ error: "Error al conectar con IA" }, { status: 500 });
  }
}
