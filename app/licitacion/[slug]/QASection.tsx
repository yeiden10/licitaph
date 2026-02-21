"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#07090F", bgCard: "#0D1117", bgPanel: "#111827", border: "#1F2937",
  gold: "#C9A84C", goldDim: "#2D2310", blue: "#4A9EFF", green: "#4ADE80",
  red: "#F87171", text: "#F0F4FF", muted: "#6B7280", sub: "#9CA3AF",
};

interface Pregunta {
  id: string;
  pregunta: string;
  respuesta: string | null;
  nombre_empresa: string | null;
  creado_en: string;
  respondida_en: string | null;
}

export default function QASection({ licitacionId }: { licitacionId: string }) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [nueva, setNueva] = useState("");
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/licitaciones/${licitacionId}/preguntas`)
      .then(r => r.json())
      .then(d => { setPreguntas(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [licitacionId]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva.trim().length < 10) { setErr("La pregunta debe tener al menos 10 caracteres."); return; }
    setEnviando(true);
    setErr("");
    try {
      const res = await fetch(`/api/licitaciones/${licitacionId}/preguntas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: nueva, nombre_empresa: nombreEmpresa }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Error al enviar"); return; }
      setEnviado(true);
      setNueva("");
      setNombreEmpresa("");
    } finally { setEnviando(false); }
  };

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <section style={{ marginTop: 48, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        Preguntas y respuestas
      </h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
        Las preguntas son revisadas y respondidas por el administrador del edificio. Las respuestas son públicas y visibles para todos los participantes.
      </p>

      {/* Existing Q&A */}
      {loading ? (
        <div style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Cargando preguntas...</div>
      ) : preguntas.length === 0 ? (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🙋</div>
          <div style={{ fontSize: 13, color: C.muted }}>Aún no hay preguntas. ¡Sé el primero en preguntar!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
          {preguntas.map((p, i) => (
            <div key={p.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              {/* Question */}
              <div style={{ padding: "14px 18px", borderBottom: p.respuesta ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(74,158,255,0.12)", border: `1px solid rgba(74,158,255,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.55, fontWeight: 500 }}>{p.pregunta}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {p.nombre_empresa ? `${p.nombre_empresa} · ` : ""}{formatFecha(p.creado_en)}
                    </div>
                  </div>
                </div>
              </div>
              {/* Answer */}
              {p.respuesta && (
                <div style={{ padding: "14px 18px", background: "rgba(201,168,76,0.03)", display: "flex", gap: 12 }}>
                  <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>🏢</div>
                  <div>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Respuesta del administrador</div>
                    <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{p.respuesta}</div>
                    {p.respondida_en && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{formatFecha(p.respondida_en)}</div>
                    )}
                  </div>
                </div>
              )}
              {!p.respuesta && (
                <div style={{ padding: "10px 18px", background: "rgba(107,114,128,0.05)" }}>
                  <span style={{ fontSize: 11, color: C.muted }}>Pendiente de respuesta</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ask a question form */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Hacer una pregunta</h3>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Todas las preguntas son anónimas para otros participantes. La respuesta será visible para todos.
        </p>

        {enviado ? (
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Pregunta enviada</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>El administrador la revisará y responderá públicamente.</div>
            </div>
            <button onClick={() => setEnviado(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>+</button>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>Nombre de tu empresa <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></span>
              <input
                type="text"
                value={nombreEmpresa}
                onChange={e => setNombreEmpresa(e.target.value)}
                placeholder="Tu empresa"
                style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>Tu pregunta <span style={{ color: C.red }}>*</span></span>
              <textarea
                value={nueva}
                onChange={e => setNueva(e.target.value)}
                rows={3}
                placeholder="¿Cuál es el área aproximada en m²? ¿Se incluye el sótano? ¿Hay acceso a agua durante el servicio?..."
                style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit" }}
              />
            </label>
            {err && <p style={{ color: C.red, fontSize: 12, margin: 0 }}>{err}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={enviando}
                style={{
                  background: C.blue, border: "none", color: "#fff",
                  borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600,
                  cursor: enviando ? "not-allowed" : "pointer", opacity: enviando ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {enviando ? "Enviando..." : "Enviar pregunta"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
