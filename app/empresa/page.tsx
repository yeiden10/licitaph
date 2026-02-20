"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_DOCUMENTO } from "@/lib/supabase/types";
import type { Empresa, Documento, Propuesta, Contrato } from "@/lib/supabase/types";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#07090F",
  bgCard:    "#0D1117",
  bgPanel:   "#111827",
  border:    "#1F2937",
  borderHov: "#374151",
  blue:      "#4A9EFF",
  blueDim:   "#1D3557",
  gold:      "#C9A84C",
  goldDim:   "#2D2310",
  green:     "#4ADE80",
  greenDim:  "#052E16",
  red:       "#F87171",
  redDim:    "#2D0A0A",
  text:      "#F0F4FF",
  muted:     "#6B7280",
  sub:       "#9CA3AF",
};

type Tab = "dashboard" | "licitaciones" | "propuestas" | "contratos" | "documentos";

interface LicitacionConPH {
  id: string;
  titulo: string;
  categoria: string;
  descripcion: string | null;
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  fecha_cierre: string | null;
  estado: string;
  urgente: boolean;
  url_slug: string | null;
  propiedades_horizontales?: { nombre: string; ciudad: string | null } | null;
  propuestas?: Array<{ count: number }>;
}

interface PropuestaConLic extends Propuesta {
  licitaciones?: {
    titulo: string;
    categoria: string;
    propiedades_horizontales?: { nombre: string; ciudad: string | null } | null;
  } | null;
}

interface ContratoConEmpresa extends Contrato {
  empresas?: { nombre: string } | null;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, tipo, onClose }: { msg: string; tipo: "ok" | "err" | "info"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = tipo === "ok" ? C.green : tipo === "err" ? C.red : C.blue;
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: C.bgCard, border: `1px solid ${bg}`, borderLeft: `4px solid ${bg}`,
      borderRadius: 10, padding: "14px 20px", maxWidth: 360, display: "flex",
      alignItems: "flex-start", gap: 12, boxShadow: `0 8px 32px rgba(0,0,0,.6)`,
      animation: "slideIn .25s ease",
    }}>
      <span style={{ color: bg, fontSize: 18, marginTop: 1 }}>
        {tipo === "ok" ? "✓" : tipo === "err" ? "✕" : "ℹ"}
      </span>
      <p style={{ color: C.text, fontSize: 14, margin: 0, flex: 1 }}>{msg}</p>
      <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg }}>
      <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

// ── Currency format ───────────────────────────────────────────────────────────
function usd(n: number | null) {
  if (!n) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function badgeEstado(estado: string) {
  const map: Record<string, { label: string; color: string }> = {
    enviada:       { label: "Enviada",        color: C.blue  },
    en_revision:   { label: "En revisión",    color: C.gold  },
    ganada:        { label: "Ganada",         color: C.green },
    no_seleccionada: { label: "No seleccionada", color: C.red },
    borrador:      { label: "Borrador",       color: C.muted },
    activa:        { label: "Activa",         color: C.green },
    en_evaluacion: { label: "En evaluación",  color: C.gold  },
    adjudicada:    { label: "Adjudicada",     color: C.blue  },
    cancelada:     { label: "Cancelada",      color: C.red   },
  };
  const s = map[estado] ?? { label: estado, color: C.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.color + "20", color: s.color,
      border: `1px solid ${s.color}40`,
      borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

// ── Apply-to-licitacion modal ─────────────────────────────────────────────────
function ModalPostular({
  lic, empresaId, onClose, onSuccess,
}: {
  lic: LicitacionConPH;
  empresaId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [precio, setPrecio] = useState("");
  const [desc, setDesc] = useState("");
  const [tecnica, setTecnica] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!precio) { setErr("El precio anual es requerido."); return; }
    setSending(true);
    setErr("");
    try {
      const r = await fetch("/api/propuestas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licitacion_id: lic.id,
          precio_anual: Number(precio),
          descripcion: desc,
          propuesta_tecnica: tecnica,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || "Error al enviar"); return; }
      onSuccess();
    } finally { setSending(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <p style={{ color: C.blue, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Postular a licitación</p>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: 0 }}>{lic.titulo}</h2>
            {lic.propiedades_horizontales && (
              <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>{lic.propiedades_horizontales.nombre} · {lic.propiedades_horizontales.ciudad}</p>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 24, lineHeight: 1 }}>×</button>
        </div>

        {lic.presupuesto_minimo && (
          <div style={{ background: C.blueDim, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", gap: 16 }}>
            <span style={{ color: C.muted, fontSize: 13 }}>Presupuesto referencial:</span>
            <span style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>{usd(lic.presupuesto_minimo)} – {usd(lic.presupuesto_maximo)} / año</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Precio anual ofertado (USD) <span style={{ color: C.red }}>*</span></span>
            <input
              type="number" min="0" step="100"
              value={precio} onChange={e => setPrecio(e.target.value)}
              placeholder="Ej: 36000"
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 15, outline: "none" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Descripción de la propuesta</span>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Describe brevemente tu oferta de valor..."
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "vertical" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ color: C.sub, fontSize: 13, fontWeight: 500 }}>Propuesta técnica</span>
            <textarea
              value={tecnica} onChange={e => setTecnica(e.target.value)} rows={4}
              placeholder="Detalla tu metodología, equipo, experiencia relevante..."
              style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "vertical" }}
            />
          </label>
          {err && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button type="submit" disabled={sending} style={{
              background: C.blue, border: "none", color: "#fff",
              borderRadius: 8, padding: "10px 24px", cursor: sending ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, opacity: sending ? 0.7 : 1,
            }}>
              {sending ? "Enviando..." : "Enviar propuesta →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmpresaDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [propuestas, setPropuestas] = useState<PropuestaConLic[]>([]);
  const [contratos, setContratos] = useState<ContratoConEmpresa[]>([]);
  const [licitaciones, setLicitaciones] = useState<LicitacionConPH[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [postularLic, setPostularLic] = useState<LicitacionConPH | null>(null);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; tipo: "ok" | "err" | "info" }>>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toast = useCallback((msg: string, tipo: "ok" | "err" | "info" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, tipo }]);
  }, []);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }

      let { data: emp } = await supabase
        .from("empresas")
        .select("*")
        .eq("usuario_id", user.id)
        .single();

      // Si no existe registro en empresas, créalo automáticamente
      if (!emp) {
        const nombre = user.user_metadata?.nombre_completo || user.email?.split("@")[0] || "Mi Empresa";
        const { data: nuevo, error: insertErr } = await supabase
          .from("empresas")
          .insert({
            usuario_id: user.id,
            nombre,
            ruc: "00-000-000",
            email: user.email,
            representante_legal: nombre,
            telefono: "",
            direccion: "",
            estado_verificacion: "pendiente",
            activo: true,
          })
          .select()
          .single();
        if (insertErr) console.error("Error creando empresa:", insertErr.message);
        emp = nuevo;
      }

      if (!emp) { window.location.href = "/"; return; }
      setEmpresa(emp);

      await Promise.all([
        cargarDocumentos(emp.id),
        cargarPropuestas(),
        cargarContratos(emp.id),
        cargarLicitaciones(),
      ]);

      setLoading(false);
    })();
  }, []);

  const cargarDocumentos = async (empresaId: string) => {
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .eq("entidad_id", empresaId)
      .eq("entidad_tipo", "empresa");
    setDocumentos(data || []);
  };

  const cargarPropuestas = async () => {
    const { data } = await supabase
      .from("propuestas")
      .select(`
        *,
        licitaciones (
          titulo, categoria,
          propiedades_horizontales (nombre, ciudad)
        )
      `)
      .order("creado_en", { ascending: false });
    setPropuestas((data || []) as PropuestaConLic[]);
  };

  const cargarContratos = async (empresaId: string) => {
    const { data } = await supabase
      .from("contratos")
      .select("*, empresas (nombre)")
      .eq("empresa_id", empresaId)
      .order("creado_en", { ascending: false });
    setContratos((data || []) as ContratoConEmpresa[]);
  };

  const cargarLicitaciones = async (categoria?: string) => {
    let url = "/api/licitaciones";
    if (categoria && categoria !== "todos") url += `?categoria=${categoria}`;
    const r = await fetch(url);
    if (r.ok) {
      const data = await r.json();
      setLicitaciones(data || []);
    }
  };

  // ── Document upload ─────────────────────────────────────────────────────────
  async function handleUpload(tipo: string, file: File) {
    if (!empresa) return;
    setUploadingTipo(tipo);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("tipo", tipo);
      fd.append("contexto", "empresa");
      fd.append("entidad_id", empresa.id);

      const r = await fetch("/api/documentos/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) { toast(data.error || "Error al subir", "err"); return; }
      toast("Documento subido exitosamente", "ok");
      await cargarDocumentos(empresa.id);
    } catch {
      toast("Error inesperado al subir", "err");
    } finally {
      setUploadingTipo(null);
    }
  }

  // ── Document completion ─────────────────────────────────────────────────────
  const docsSubidos = TIPOS_DOCUMENTO.filter(td =>
    documentos.some(d => d.tipo === td.id)
  ).length;
  const docsRequeridos = TIPOS_DOCUMENTO.filter(td => td.requerido).length;
  const docsRequeridosSubidos = TIPOS_DOCUMENTO.filter(td =>
    td.requerido && documentos.some(d => d.tipo === td.id)
  ).length;
  const docCompleto = docsRequeridosSubidos >= docsRequeridos;

  if (loading) return <Spinner />;

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const TABS: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "dashboard",    label: "Dashboard",    icon: "◈" },
    { id: "licitaciones", label: "Licitaciones",  icon: "📋" },
    { id: "propuestas",   label: "Propuestas",    icon: "📤" },
    { id: "contratos",    label: "Contratos",     icon: "📄" },
    { id: "documentos",   label: "Documentos",    icon: "🗂" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        input:focus, textarea:focus, select:focus { border-color: ${C.blue} !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.bg}; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      `}</style>

      {/* Toasts */}
      {toasts.map(t => (
        <Toast key={t.id} msg={t.msg} tipo={t.tipo} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />
      ))}

      {/* Postular modal */}
      {postularLic && empresa && (
        <ModalPostular
          lic={postularLic}
          empresaId={empresa.id}
          onClose={() => setPostularLic(null)}
          onSuccess={() => {
            setPostularLic(null);
            toast("¡Propuesta enviada exitosamente!", "ok");
            cargarPropuestas();
          }}
        />
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* ── Sidebar ── */}
        <aside style={{
          width: 260, background: C.bgCard, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed",
          top: 0, left: 0, height: "100vh", overflowY: "auto",
        }}>
          {/* Logo */}
          <div style={{ padding: "0 24px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.blue}, #2563EB)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>L</span>
              </div>
              <div>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0 }}>LicitaPH</p>
                <p style={{ color: C.blue, fontSize: 11, margin: 0, fontWeight: 500 }}>Portal Empresa</p>
              </div>
            </div>
          </div>

          {/* Empresa info */}
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>Empresa</p>
            <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>{empresa?.nombre}</p>
            <p style={{ color: C.sub, fontSize: 12, margin: 0 }}>{empresa?.email}</p>
            {empresa?.estado_verificacion && (
              <span style={{
                display: "inline-block", marginTop: 8,
                background: empresa.estado_verificacion === "verificada" ? C.green + "20" : C.gold + "20",
                color: empresa.estado_verificacion === "verificada" ? C.green : C.gold,
                border: `1px solid ${empresa.estado_verificacion === "verificada" ? C.green : C.gold}40`,
                borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
              }}>
                {empresa.estado_verificacion === "verificada" ? "✓ Verificada" : "Pendiente verificación"}
              </span>
            )}
          </div>

          {/* Doc progress */}
          {!docCompleto && (
            <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: C.goldDim }}>
              <p style={{ color: C.gold, fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
                Completa tu perfil
              </p>
              <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ background: C.gold, height: "100%", width: `${(docsRequeridosSubidos / docsRequeridos) * 100}%`, transition: "width .3s" }} />
              </div>
              <p style={{ color: C.sub, fontSize: 11, margin: "6px 0 0" }}>
                {docsRequeridosSubidos}/{docsRequeridos} documentos requeridos
              </p>
              <button
                onClick={() => setTab("documentos")}
                style={{ marginTop: 8, background: C.gold, border: "none", color: "#000", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", width: "100%" }}
              >
                Subir documentos →
              </button>
            </div>
          )}

          {/* Nav */}
          <nav style={{ padding: "12px 12px", flex: 1 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8, border: "none",
                  background: tab === t.id ? C.blue + "20" : "transparent",
                  color: tab === t.id ? C.blue : C.sub,
                  cursor: "pointer", fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
                  textAlign: "left", marginBottom: 2,
                  borderLeft: tab === t.id ? `3px solid ${C.blue}` : "3px solid transparent",
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                {t.label}
                {t.id === "documentos" && !docCompleto && (
                  <span style={{ marginLeft: "auto", background: C.gold, color: "#000", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    !
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 13 }}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main style={{ marginLeft: 260, flex: 1, padding: 32, minHeight: "100vh", background: C.bg }}>
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
                Bienvenido, {empresa?.nombre}
              </h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 32px" }}>
                Panel de control de tu empresa proveedora
              </p>

              {/* Stats cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
                {[
                  { label: "Propuestas enviadas", val: propuestas.filter(p => p.estado !== "borrador").length, color: C.blue },
                  { label: "Propuestas ganadas",  val: propuestas.filter(p => p.estado === "ganada").length,  color: C.green },
                  { label: "Contratos activos",   val: contratos.filter(c => c.estado === "activo").length,   color: C.gold },
                  { label: "Docs subidos",         val: `${docsSubidos}/8`,                                   color: docCompleto ? C.green : C.gold },
                ].map(s => (
                  <div key={s.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, borderTop: `3px solid ${s.color}` }}>
                    <p style={{ color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{s.label}</p>
                    <p style={{ color: s.color, fontSize: 32, fontWeight: 700, margin: 0 }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Recent propuestas */}
              <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: 0 }}>Propuestas recientes</h2>
                  <button onClick={() => setTab("propuestas")} style={{ background: "none", border: "none", color: C.blue, fontSize: 13, cursor: "pointer" }}>Ver todas →</button>
                </div>
                {propuestas.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <p style={{ fontSize: 36, marginBottom: 8 }}>📤</p>
                    <p style={{ color: C.sub, fontSize: 14 }}>Aún no has enviado propuestas.</p>
                    <button onClick={() => setTab("licitaciones")} style={{ marginTop: 12, background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                      Ver licitaciones disponibles →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {propuestas.slice(0, 5).map(p => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.bgPanel, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>
                            {p.licitaciones?.titulo ?? "Licitación"}
                          </p>
                          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
                            {p.licitaciones?.propiedades_horizontales?.nombre} · {new Date(p.creado_en).toLocaleDateString("es-PA")}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span style={{ color: C.blue, fontWeight: 600, fontSize: 14 }}>{usd(p.precio_anual)}/año</span>
                          {badgeEstado(p.estado)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LICITACIONES */}
          {tab === "licitaciones" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Licitaciones disponibles</h1>
                  <p style={{ color: C.sub, fontSize: 14, margin: 0 }}>Encuentra contratos para tu empresa</p>
                </div>
                <select
                  value={filtroCategoria}
                  onChange={e => { setFiltroCategoria(e.target.value); cargarLicitaciones(e.target.value); }}
                  style={{ background: C.bgCard, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}
                >
                  <option value="todos">Todas las categorías</option>
                  {["seguridad","limpieza","hvac","jardineria","ascensores","electricidad","pintura","plagas","otros"].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              {licitaciones.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📋</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No hay licitaciones disponibles</p>
                  <p style={{ color: C.sub, fontSize: 14 }}>Vuelve pronto o cambia el filtro de categoría</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {licitaciones.map(lic => {
                    const yaPostule = propuestas.some(p => p.licitacion_id === lic.id);
                    return (
                      <div key={lic.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            {lic.urgente && (
                              <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}40`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>URGENTE</span>
                            )}
                            <span style={{ background: C.blue + "15", color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                              {lic.categoria}
                            </span>
                          </div>
                          <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>{lic.titulo}</h3>
                          {lic.propiedades_horizontales && (
                            <p style={{ color: C.sub, fontSize: 13, margin: "0 0 10px" }}>
                              📍 {lic.propiedades_horizontales.nombre} · {lic.propiedades_horizontales.ciudad}
                            </p>
                          )}
                          {lic.descripcion && (
                            <p style={{ color: C.muted, fontSize: 14, margin: "0 0 12px", lineHeight: 1.6 }}>
                              {lic.descripcion.substring(0, 180)}{lic.descripcion.length > 180 ? "..." : ""}
                            </p>
                          )}
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                            {(lic.presupuesto_minimo || lic.presupuesto_maximo) && (
                              <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>
                                💰 {usd(lic.presupuesto_minimo)} – {usd(lic.presupuesto_maximo)} / año
                              </span>
                            )}
                            {lic.fecha_cierre && (
                              <span style={{ color: C.muted, fontSize: 13 }}>
                                🗓 Cierre: {new Date(lic.fecha_cierre).toLocaleDateString("es-PA")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", minWidth: 160 }}>
                          {yaPostule ? (
                            <span style={{ background: C.green + "20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
                              ✓ Propuesta enviada
                            </span>
                          ) : (
                            <button
                              onClick={() => setPostularLic(lic)}
                              style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}
                            >
                              Postular →
                            </button>
                          )}
                          {lic.url_slug && (
                            <a href={`/licitacion/${lic.url_slug}`} target="_blank" rel="noopener noreferrer" style={{ color: C.muted, fontSize: 12, textDecoration: "underline" }}>
                              Ver detalles
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROPUESTAS */}
          {tab === "propuestas" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Mis propuestas</h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Historial de todas tus postulaciones</p>

              {propuestas.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📤</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No has enviado propuestas aún</p>
                  <p style={{ color: C.sub, fontSize: 14, marginBottom: 20 }}>Encuentra licitaciones abiertas y postula a las que se ajusten a tu servicio</p>
                  <button onClick={() => setTab("licitaciones")} style={{ background: C.blue, border: "none", color: "#fff", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                    Ver licitaciones →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {propuestas.map(p => (
                    <div key={p.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                            {p.licitaciones?.titulo ?? "Licitación"}
                          </p>
                          <p style={{ color: C.sub, fontSize: 13, margin: "0 0 12px" }}>
                            {p.licitaciones?.propiedades_horizontales?.nombre} ·{" "}
                            {p.licitaciones?.propiedades_horizontales?.ciudad}
                          </p>
                        </div>
                        {badgeEstado(p.estado)}
                      </div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Precio ofertado</p>
                          <p style={{ color: C.blue, fontSize: 18, fontWeight: 700, margin: 0 }}>{usd(p.precio_anual)}/año</p>
                        </div>
                        {p.puntaje_ia !== null && (
                          <div>
                            <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Score IA</p>
                            <p style={{ color: (p.puntaje_ia ?? 0) > 70 ? C.green : C.gold, fontSize: 18, fontWeight: 700, margin: 0 }}>{p.puntaje_ia}/100</p>
                          </div>
                        )}
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Enviada</p>
                          <p style={{ color: C.sub, fontSize: 14, fontWeight: 500, margin: 0 }}>
                            {p.enviada_at ? new Date(p.enviada_at).toLocaleDateString("es-PA") : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTRATOS */}
          {tab === "contratos" && (
            <div>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Contratos</h1>
              <p style={{ color: C.sub, fontSize: 14, margin: "0 0 28px" }}>Contratos vigentes y pasados de tu empresa</p>

              {contratos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 0", background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 48, marginBottom: 12 }}>📄</p>
                  <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sin contratos activos</p>
                  <p style={{ color: C.sub, fontSize: 14 }}>Cuando ganes una licitación, el contrato aparecerá aquí</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {contratos.map(c => (
                    <div key={c.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                            Contrato #{c.id.slice(-6).toUpperCase()}
                          </p>
                          <p style={{ color: C.sub, fontSize: 13, margin: "0 0 12px" }}>
                            {c.fecha_inicio && `${new Date(c.fecha_inicio).toLocaleDateString("es-PA")} → `}
                            {c.fecha_fin && new Date(c.fecha_fin).toLocaleDateString("es-PA")}
                          </p>
                        </div>
                        {badgeEstado(c.estado)}
                      </div>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Valor anual</p>
                          <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(c.valor_anual)}</p>
                        </div>
                        <div>
                          <p style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>Mensual</p>
                          <p style={{ color: C.green, fontSize: 20, fontWeight: 700, margin: 0 }}>{usd(c.monto_mensual)}/mes</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTOS */}
          {tab === "documentos" && (
            <div>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Documentos de empresa</h1>
                <p style={{ color: C.sub, fontSize: 14, margin: "0 0 16px" }}>
                  Sube tus documentos para postular a licitaciones. Solo se permiten PDF, JPG y PNG (máx. 10MB).
                </p>
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: C.sub, fontSize: 13 }}>Progreso de documentación</span>
                      <span style={{ color: docCompleto ? C.green : C.gold, fontSize: 13, fontWeight: 700 }}>
                        {docsRequeridosSubidos}/{docsRequeridos} obligatorios · {docsSubidos}/8 total
                      </span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{
                        background: `linear-gradient(90deg, ${docCompleto ? C.green : C.gold}, ${docCompleto ? "#22C55E" : "#F59E0B"})`,
                        height: "100%", width: `${(docsRequeridosSubidos / docsRequeridos) * 100}%`,
                        transition: "width .4s ease",
                      }} />
                    </div>
                  </div>
                  {docCompleto && (
                    <span style={{ background: C.green + "20", color: C.green, border: `1px solid ${C.green}40`, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      ✓ Perfil completo
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TIPOS_DOCUMENTO.map(td => {
                  const doc = documentos.find(d => d.tipo === td.id);
                  const isUploading = uploadingTipo === td.id;
                  return (
                    <div
                      key={td.id}
                      style={{
                        background: C.bgCard,
                        border: `1px solid ${doc ? C.green + "50" : C.border}`,
                        borderRadius: 12, padding: "18px 22px",
                        display: "flex", alignItems: "center", gap: 16,
                        transition: "border-color .2s",
                      }}
                    >
                      {/* Status icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: doc ? C.green + "20" : C.bgPanel,
                        border: `2px solid ${doc ? C.green : C.border}`,
                      }}>
                        {doc ? (
                          <span style={{ color: C.green, fontSize: 20, fontWeight: 700 }}>✓</span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 18 }}>○</span>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{td.label}</p>
                          {td.requerido ? (
                            <span style={{ background: C.red + "20", color: C.red, border: `1px solid ${C.red}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>REQUERIDO</span>
                          ) : (
                            <span style={{ background: C.muted + "20", color: C.muted, border: `1px solid ${C.muted}30`, borderRadius: 4, padding: "1px 6px", fontSize: 10 }}>OPCIONAL</span>
                          )}
                        </div>
                        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{td.desc}</p>
                        {doc && (
                          <p style={{ color: C.green, fontSize: 12, margin: "4px 0 0" }}>
                            Subido el {new Date(doc.creado_en).toLocaleDateString("es-PA")}
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, marginLeft: 10, textDecoration: "underline" }}>Ver archivo</a>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Upload button */}
                      <div>
                        <input
                          ref={el => { fileInputRefs.current[td.id] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          style={{ display: "none" }}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (file) await handleUpload(td.id, file);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[td.id]?.click()}
                          disabled={isUploading}
                          style={{
                            background: doc ? C.bgPanel : C.blue,
                            border: `1px solid ${doc ? C.border : C.blue}`,
                            color: doc ? C.sub : "#fff",
                            borderRadius: 8, padding: "8px 16px",
                            cursor: isUploading ? "not-allowed" : "pointer",
                            fontSize: 13, fontWeight: 600,
                            opacity: isUploading ? 0.6 : 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isUploading ? "Subiendo..." : doc ? "Reemplazar" : "Subir archivo"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
