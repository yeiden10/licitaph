import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PropuestaChatRequest {
  messages: ChatMessage[];
  // Contexto de la licitación para que Claude sepa qué generar
  licitacion_titulo: string;
  licitacion_descripcion?: string;
  licitacion_categoria?: string;
  // Cuando Claude termina, devuelve la propuesta generada
  generar?: boolean;
}

const SYSTEM_CHAT = `Eres un asesor experto en licitaciones para Propiedades Horizontales en Panamá. Tu rol es ayudar a empresas proveedoras a redactar propuestas técnicas profesionales y ganadoras.

MISIÓN: Hacer 3-4 preguntas específicas para entender la fortaleza de la empresa, luego generar un texto de propuesta técnica profesional.

REGLAS:
1. Haz UNA sola pregunta a la vez. Máximo 2 oraciones.
2. Sé directo y amigable. Habla de "tú" a la empresa.
3. Después de 3-4 respuestas, genera la propuesta automáticamente.
4. La propuesta debe ser específica, con datos concretos del servicio, NO genérica.

PREGUNTAS SUGERIDAS (en orden):
1. "¿Cuántos años llevan prestando este servicio y cuántos edificios/propiedades horizontales atienden actualmente?"
2. "¿Qué los diferencia de otras empresas del ramo? (Ej: personal certificado, tiempo de respuesta, equipos propios, garantías)"
3. "¿Tienen algún caso de éxito o referencia relevante en este tipo de servicio?"
4. (Opcional si hace falta): "¿Qué incluye exactamente su servicio? ¿Qué herramientas, personal o protocolos específicos utilizan?"

CUANDO TENGAS SUFICIENTE INFORMACIÓN (después de 3-4 respuestas), responde SOLO con este JSON:
{
  "listo": true,
  "propuesta_tecnica": "Texto profesional de 3-5 párrafos, específico, con los datos del servicio, metodología, experiencia y diferenciadores mencionados por la empresa. Listo para copiar y pegar en la licitación.",
  "mensaje_final": "Mensaje amigable animando a la empresa a revisar y personalizar el texto si lo desea"
}

Si aún necesitas más información, responde con texto normal haciendo la siguiente pregunta.`;

export async function POST(request: NextRequest) {
  const body: PropuestaChatRequest = await request.json();
  const { messages, licitacion_titulo, licitacion_descripcion, licitacion_categoria, generar } = body;

  if (!process.env.ANTHROPIC_API_KEY) {
    // Fallback sin API key
    if (generar || messages.length >= 4) {
      return NextResponse.json({
        tipo: "propuesta",
        propuesta_tecnica: generarPropuestaFallback(licitacion_categoria || "otros", licitacion_titulo),
        mensaje: "Propuesta generada. Revísala y personalízala con tus datos específicos antes de enviar.",
      });
    }
    return NextResponse.json({
      tipo: "texto",
      mensaje: "¿Cuántos años llevan prestando este servicio y cuántos edificios atienden actualmente?",
    });
  }

  // Guard: sin mensajes de usuario, devolver primera pregunta
  if (messages.length === 0 || !messages.some(m => m.role === "user")) {
    return NextResponse.json({
      tipo: "texto",
      mensaje: `Para ayudarte a redactar una propuesta técnica ganadora para "${licitacion_titulo}", te haré unas preguntas rápidas. ¿Cuántos años llevan prestando este servicio y cuántos edificios o propiedades horizontales atienden actualmente?`,
    });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Contexto de licitación al inicio del sistema
    const systemWithContext = `${SYSTEM_CHAT}

CONTEXTO DE LA LICITACIÓN:
- Título: ${licitacion_titulo}
- Categoría: ${licitacion_categoria || "no especificada"}
- Descripción: ${licitacion_descripcion || "no especificada"}

Adapta tus preguntas y la propuesta generada a este tipo específico de servicio.`;

    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemWithContext,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const rawText = (res.content[0] as { type: string; text: string }).text.trim();

    // Intentar parsear como JSON (propuesta lista)
    try {
      const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.listo && parsed.propuesta_tecnica) {
        return NextResponse.json({
          tipo: "propuesta",
          propuesta_tecnica: parsed.propuesta_tecnica,
          mensaje: parsed.mensaje_final || "¡Propuesta lista! Revísala y ajusta lo que necesites.",
        });
      }
    } catch {
      // No es JSON, respuesta de texto normal
    }

    return NextResponse.json({
      tipo: "texto",
      mensaje: rawText,
    });
  } catch (err) {
    console.error("Error en propuesta-tecnica:", err);
    return NextResponse.json({ error: "Error al conectar con IA" }, { status: 500 });
  }
}

function generarPropuestaFallback(categoria: string, titulo: string): string {
  const templates: Record<string, string> = {
    seguridad: `Nuestra empresa cuenta con más de 10 años de experiencia en servicios de seguridad para propiedades horizontales en Panamá. Actualmente prestamos servicio a más de 15 edificios residenciales en la ciudad, con un equipo de agentes certificados ante el SENIAP y entrenados en protocolos de emergencia.

Nuestra metodología incluye supervisión 24/7, rondas periódicas documentadas, y un sistema de reporte digital en tiempo real al administrador. Cada agente cuenta con equipos de comunicación, uniforme identificado y capacitación continua. El tiempo de respuesta ante incidentes es de máximo 5 minutos dentro del edificio.

Garantizamos sustitución inmediata del personal en caso de ausencia, sin costo adicional. Contamos con seguro de responsabilidad civil vigente por B/. 500,000 y fianza de cumplimiento disponible. Nuestras referencias incluyen edificios de más de 200 unidades en áreas premium de Ciudad de Panamá.`,

    limpieza: `Con más de 8 años especializados en limpieza de propiedades horizontales, mantenemos actualmente contratos con 20+ edificios residenciales en Panamá. Nuestro equipo está conformado por operarios uniformados, capacitados en técnicas de limpieza profesional y con exámenes de salud al día.

Utilizamos exclusivamente productos certificados y biodegradables, con registro sanitario del MINSA. Nuestra metodología incluye limpieza diaria de áreas comunes, limpieza profunda mensual programada, y un sistema de bitácora digital que el administrador puede consultar en tiempo real.

Ofrecemos sustitución del personal en menos de 2 horas ante cualquier ausencia. El supervisor de área visita el edificio al menos dos veces por semana para garantizar los estándares de calidad. Todos los incidentes de daño a propiedades están cubiertos por nuestro seguro de responsabilidad civil.`,
  };

  const base = templates[categoria] || `Contamos con amplia experiencia en la prestación de servicios de ${titulo} para propiedades horizontales en Panamá. Nuestro equipo está compuesto por profesionales certificados con más de 5 años de experiencia en el sector.

Nuestra metodología de trabajo está basada en estándares internacionales, adaptados a la realidad panameña. Ofrecemos respuesta rápida ante emergencias, supervisión continua y reportes periódicos al administrador. Todos nuestros servicios están respaldados por póliza de seguro de responsabilidad civil vigente.

Nos diferenciamos por nuestra capacidad de respuesta, el profesionalismo de nuestro equipo y nuestro compromiso con la satisfacción del cliente. Tenemos referencias verificables de propiedades horizontales de diferentes tamaños en Ciudad de Panamá y áreas metropolitanas.`;

  return base;
}
