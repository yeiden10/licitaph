"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#07090F", bgCard: "#0D1117", bgPanel: "#111827",
  border: "#1F2937", gold: "#C9A84C", goldDim: "#2D2310",
  blue: "#4A9EFF", blueDim: "#1D3557",
  green: "#4ADE80", greenDim: "#052E16",
  red: "#F87171", redDim: "#2D0A0A",
  purple: "#A78BFA", purpleDim: "#2D1B69",
  text: "#F0F4FF", muted: "#6B7280", sub: "#9CA3AF",
};

type Tab = "dashboard" | "empresas" | "licitaciones" | "ph";

interface Stats {
  empresas: { total: number; verificadas: number; pendientes: number };
  ph: { total: number };
  licitaciones: { total: number; activas: number };
  contratos: { total: number; activos: number; valor_anual: number };
  propuestas: { total: number };
}

interface Empresa {
  id: string;
  nombre: string;
  email: string | null;
  ruc: string | null;
  representante_legal: string | null;
  estado_verificacion: string | null;
  categorias: string[];
  calificacion_promedio: number | null;
  total_contratos_ganados: number | null;
  activo: boolean;
  creado_en: string;
  empresa_kyc: {
    ruc: string | null;
    representante_nombre: string | null;
    representante_email: string | null;
    representante_cedula: string | null;
    num_empleados: number | null;
    facturacion_anual_promedio: number | null;
    tiene_seguro_responsabilidad: boolean;
    tiene_fianza_cumplimiento: boolean;
    referencias_comerciales: string | null;
    completado: boolean;
    porcentaje_completado: number;
    actualizado_en: string | null;
  } | null;
}

interface Licitacion {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  urgente: boolean;
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  fecha_cierre: string | null;
  creado_en: string;
  propiedades_horizontales: { nombre: string; ciudad: string; provincia: string } | null;
  propuestas: { count: number }[];
}

interface PH {
  id: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  total_unidades: number | null;
  email_contacto: string | null;
  activo: boolean;
  creado_en: string;
}

function badgeVerificacion(estado: string | null) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    verificada: { label: "Verificada", bg: "#052E16", color: "#4ADE80" },
    pendiente: { label: "Pendiente", bg: "#2D2310", color: "#C9A84C" },
    rechazada: { label: "Rechazada", bg: "#2D0A0A", color: "#F87171" },
  };
  const s = map[estado || "pendiente"] || map.pendiente;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function badgeEstado(estado: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    activa: { label: "Activa", bg: "#052E16", color: "#4ADE80" },
    borrador: { label: "Borrador", bg: "#1F2937", color: "#9CA3AF" },
    en_evaluacion: { label: "En evaluación", bg: "#1D3557", color: "#4A9EFF" },
    adjudicada: { label: "Adjudicada", bg: "#2D2310", color: "#C9A84C" },
    cancelada: { label: "Cancelada", bg: "#2D0A0A", color: "#F87171" },
  };
  const s = map[estado] || { label: estado, bg: "#1F2937", color: "#9CA3AF" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
      <p style={{ color: C.sub, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>{label}</p>
      <p style={{ color: color || C.text, fontSize: 28, fontWeight: 800, margin: "0 0 4px", fontFamily: "DM Mono, monospace" }}>{value}</p>
      {sub && <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{sub}</p>}
    </div>
  );
}

export default function SuperadminDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [phs, setPHs] = useState<PH[]>([]);
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroLic, setFiltroLic] = useState<string>("todas");
  const [empresaDetalle, setEmpresaDetalle] = useState<Empresa | null>(null);
  const [verificando, setVerificando] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState<string | null>(null);
  const [notif, setNotif] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  // ── Documentos ───────────────────────────────────────────────
  interface DocRow { id: string; nombre: string; tipo: string; url: string; estado: string | null; motivo_rechazo: string | null; creado_en: string; revisado_en: string | null; }
  const [docsEmpresa, setDocsEmpresa] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [revisandoDoc, setRevisandoDoc] = useState<string | null>(null);
  const [showMotivoDoc, setShowMotivoDoc] = useState<string | null>(null);
  const [motivoDoc, setMotivoDoc] = useState("");

  const TIPOS_LABEL: Record<string, string> = {
    cedula: "Cédula del representante", registro_publico: "Registro Público",
    paz_salvo_dgi: "Paz y Salvo DGI", paz_salvo_css: "Paz y Salvo CSS",
    idoneidad: "Idoneidad profesional", kyc: "Formulario KYC",
    aviso_operacion: "Aviso de operación", estados_financieros: "Estados financieros",
    poliza_seguro: "Póliza de seguro RC", fianza_cumplimiento: "Fianza de cumplimiento",
    cv_equipo: "CV del equipo", referencias_comerciales: "Referencias comerciales",
    referencias_bancarias: "Referencias bancarias",
  };
  const TIPOS_REQUERIDOS = ["cedula","registro_publico","paz_salvo_dgi","paz_salvo_css","idoneidad","aviso_operacion","poliza_seguro","fianza_cumplimiento","cv_equipo","referencias_comerciales"];

  const cargarDocs = async (empresa_id: string) => {
    setLoadingDocs(true);
    const r = await fetch(`/api/superadmin/empresas/${empresa_id}/documentos`);
    if (r.ok) setDocsEmpresa(await r.json());
    setLoadingDocs(false);
  };

  const revisarDoc = async (empresa_id: string, documento_id: string, estado: "aprobado" | "rechazado", motivo?: string) => {
    setRevisandoDoc(documento_id);
    try {
      const r = await fetch(`/api/superadmin/empresas/${empresa_id}/documentos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento_id, estado, motivo_rechazo: motivo }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      notify(estado === "aprobado" ? "✅ Documento aprobado" : "❌ Documento rechazado", "ok");
      setShowMotivoDoc(null); setMotivoDoc("");
      await cargarDocs(empresa_id);
    } catch (e: any) {
      notify("Error: " + e.message, "err");
    } finally {
      setRevisandoDoc(null);
    }
  };

  const notify = (msg: string, tipo: "ok" | "err" = "ok") => {
    setNotif({ msg, tipo });
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.user_metadata?.tipo_usuario !== "superadmin") {
        window.location.href = "/";
        return;
      }
      setUser(user);
      await cargarStats();
      setLoading(false);
    })();
  }, []);

  const cargarStats = async () => {
    const r = await fetch("/api/superadmin/stats");
    if (r.ok) setStats(await r.json());
  };

  const cargarEmpresas = useCallback(async (estado?: string) => {
    const url = estado && estado !== "todas" ? `/api/superadmin/empresas?estado=${estado}` : "/api/superadmin/empresas";
    const r = await fetch(url);
    if (r.ok) setEmpresas(await r.json());
  }, []);

  const cargarLicitaciones = useCallback(async (estado?: string) => {
    const url = estado && estado !== "todas" ? `/api/superadmin/licitaciones?estado=${estado}` : "/api/superadmin/licitaciones";
    const r = await fetch(url);
    if (r.ok) setLicitaciones(await r.json());
  }, []);

  const cargarPHs = useCallback(async () => {
    const { data } = await supabase.from("propiedades_horizontales").select("*").order("creado_en", { ascending: false });
    setPHs(data || []);
  }, []);

  useEffect(() => {
    if (tab === "empresas") cargarEmpresas(filtroEmpresa);
  }, [tab, filtroEmpresa]);

  useEffect(() => {
    if (tab === "licitaciones") cargarLicitaciones(filtroLic);
  }, [tab, filtroLic]);

  useEffect(() => {
    if (tab === "ph") cargarPHs();
  }, [tab]);

  const verificarEmpresa = async (id: string, estado: "verificada" | "rechazada", motivo?: string) => {
    setVerificando(id);
    try {
      const r = await fetch(`/api/superadmin/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado_verificacion: estado, motivo_rechazo: motivo }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      notify(estado === "verificada" ? "✅ Empresa verificada y notificada." : "❌ Empresa rechazada y notificada.", "ok");
      setShowRechazo(null);
      setMotivoRechazo("");
      setEmpresaDetalle(null);
      await cargarEmpresas(filtroEmpresa);
      await cargarStats();
    } catch (e: any) {
      notify("Error: " + e.message, "err");
    } finally {
      setVerificando(null);
    }
  };

  const formatFecha = (f: string) => new Date(f).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
  const usd = (n: number) => "$" + n.toLocaleString("es-PA", { maximumFractionDigits: 0 });

  const inputStyle: React.CSSProperties = {
    background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 14px", color: C.text, fontSize: 13, outline: "none",
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", color: C.purple, fontFamily: "Inter, sans-serif", fontSize: 14 }}>
      Cargando panel superadmin...
    </div>
  );

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "empresas", label: "Empresas", icon: "🏢" },
    { id: "licitaciones", label: "Licitaciones", icon: "📋" },
    { id: "ph", label: "Propiedades H.", icon: "🏛️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Inter, sans-serif", display: "flex" }}>
      {/* Notif */}
      {notif && (
        <div onClick={() => setNotif(null)} style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: notif.tipo === "ok" ? "#052E16" : "#2D0A0A",
          border: `1px solid ${notif.tipo === "ok" ? C.green : C.red}`,
          color: notif.tipo === "ok" ? C.green : C.red,
          padding: "14px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          cursor: "pointer", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,.5)",
        }}>
          {notif.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, background: C.bgCard, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky",
        top: 0, height: "100vh", flexShrink: 0,
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleDim, border: `1px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <div>
              <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>LicitaPH</p>
              <p style={{ color: C.purple, fontSize: 10, fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Superadmin</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === item.id ? C.purpleDim : "transparent",
                color: tab === item.id ? C.purple : C.muted,
                fontSize: 13, fontWeight: tab === item.id ? 600 : 400,
                textAlign: "left", width: "100%",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: 11, margin: "0 0 8px" }}>{user?.email}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, width: "100%" }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 36px", overflow: "auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && stats && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Panel de control</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Vista general de la plataforma LicitaPH</p>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              <StatCard label="Empresas registradas" value={stats.empresas.total} sub={`${stats.empresas.verificadas} verificadas · ${stats.empresas.pendientes} pendientes`} color={C.blue} />
              <StatCard label="PHs activas" value={stats.ph.total} color={C.gold} />
              <StatCard label="Licitaciones" value={stats.licitaciones.total} sub={`${stats.licitaciones.activas} activas ahora`} color={C.green} />
              <StatCard label="Valor contratos activos" value={usd(stats.contratos.valor_anual)} sub={`${stats.contratos.activos} contratos activos`} color={C.purple} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total propuestas" value={stats.propuestas.total} />
              <StatCard label="Total contratos" value={stats.contratos.total} />
              <StatCard label="Empresas pendientes" value={stats.empresas.pendientes} color={stats.empresas.pendientes > 0 ? C.gold : C.green} sub={stats.empresas.pendientes > 0 ? "Requieren revisión" : "Todo al día"} />
            </div>

            {/* Acciones rápidas */}
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Acciones rápidas</h2>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { setTab("empresas"); setFiltroEmpresa("pendiente"); }}
                  style={{ background: C.goldDim, border: `1px solid ${C.gold}`, color: C.gold, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  Ver empresas pendientes ({stats.empresas.pendientes})
                </button>
                <button
                  onClick={() => setTab("licitaciones")}
                  style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.text, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                >
                  Ver todas las licitaciones
                </button>
                <button
                  onClick={() => setTab("ph")}
                  style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.text, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                >
                  Ver propiedades horizontales
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EMPRESAS ── */}
        {tab === "empresas" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Empresas</h1>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{empresas.length} empresa{empresas.length !== 1 ? "s" : ""}</p>
              </div>
              <select
                value={filtroEmpresa}
                onChange={e => setFiltroEmpresa(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="verificada">Verificadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {empresas.length === 0 && (
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.muted, fontSize: 14 }}>
                  No hay empresas en este filtro
                </div>
              )}
              {empresas.map(emp => (
                <div key={emp.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{emp.nombre}</p>
                        {badgeVerificacion(emp.estado_verificacion)}
                        {emp.empresa_kyc && (
                          <span style={{ background: emp.empresa_kyc.completado ? "#052E16" : "#2D2310", color: emp.empresa_kyc.completado ? C.green : C.gold, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                            KYC {emp.empresa_kyc.porcentaje_completado}%
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {emp.email && <span style={{ color: C.sub, fontSize: 12 }}>✉ {emp.email}</span>}
                        {emp.empresa_kyc?.representante_nombre && <span style={{ color: C.sub, fontSize: 12 }}>👤 {emp.empresa_kyc.representante_nombre}</span>}
                        {emp.empresa_kyc?.num_empleados && <span style={{ color: C.sub, fontSize: 12 }}>👥 {emp.empresa_kyc.num_empleados} empleados</span>}
                        <span style={{ color: C.sub, fontSize: 12 }}>📅 {formatFecha(emp.creado_en)}</span>
                      </div>
                      {emp.categorias?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {emp.categorias.slice(0, 4).map(cat => (
                            <span key={cat} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>{cat}</span>
                          ))}
                          {emp.categorias.length > 4 && <span style={{ color: C.muted, fontSize: 11 }}>+{emp.categorias.length - 4} más</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => { setEmpresaDetalle(emp); setDocsEmpresa([]); cargarDocs(emp.id); }}
                        style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.text, padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}
                      >
                        Ver detalle
                      </button>
                      {emp.estado_verificacion !== "verificada" && (
                        <button
                          onClick={() => verificarEmpresa(emp.id, "verificada")}
                          disabled={verificando === emp.id}
                          style={{ background: "#052E16", border: `1px solid ${C.green}`, color: C.green, padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, opacity: verificando === emp.id ? 0.6 : 1 }}
                        >
                          ✓ Verificar
                        </button>
                      )}
                      {emp.estado_verificacion !== "rechazada" && (
                        <button
                          onClick={() => setShowRechazo(emp.id)}
                          style={{ background: "#2D0A0A", border: `1px solid ${C.red}`, color: C.red, padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}
                        >
                          ✗ Rechazar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LICITACIONES ── */}
        {tab === "licitaciones" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Licitaciones</h1>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{licitaciones.length} licitaciones</p>
              </div>
              <select value={filtroLic} onChange={e => setFiltroLic(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="todas">Todas</option>
                <option value="activa">Activas</option>
                <option value="borrador">Borrador</option>
                <option value="en_evaluacion">En evaluación</option>
                <option value="adjudicada">Adjudicadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Licitación", "PH", "Categoría", "Estado", "Propuestas", "Cierre", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", color: C.sub, fontSize: 11, fontWeight: 600, textAlign: "left", textTransform: "uppercase", letterSpacing: .5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {licitaciones.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 14 }}>No hay licitaciones</td></tr>
                  )}
                  {licitaciones.map(lic => (
                    <tr key={lic.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{lic.titulo}</p>
                        {lic.urgente && <span style={{ background: "#2D0A0A", color: C.red, padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>URGENTE</span>}
                      </td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{lic.propiedades_horizontales?.nombre || "—"}</td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{lic.categoria}</td>
                      <td style={{ padding: "14px 16px" }}>{badgeEstado(lic.estado)}</td>
                      <td style={{ padding: "14px 16px", color: C.text, fontSize: 13, textAlign: "center" }}>{lic.propuestas?.[0]?.count || 0}</td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{lic.fecha_cierre ? formatFecha(lic.fecha_cierre) : "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <a
                          href={`/licitacion/${lic.id}`}
                          target="_blank"
                          style={{ color: C.blue, fontSize: 12, textDecoration: "none" }}
                        >
                          Ver →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PROPIEDADES HORIZONTALES ── */}
        {tab === "ph" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Propiedades Horizontales</h1>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>{phs.length} PHs registradas</p>
            </div>

            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Nombre", "Ciudad", "Provincia", "Unidades", "Email", "Estado", "Registro"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", color: C.sub, fontSize: 11, fontWeight: 600, textAlign: "left", textTransform: "uppercase", letterSpacing: .5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phs.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 14 }}>No hay PHs registradas</td></tr>
                  )}
                  {phs.map(ph => (
                    <tr key={ph.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "14px 16px", color: C.text, fontSize: 13, fontWeight: 600 }}>{ph.nombre}</td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{ph.ciudad || "—"}</td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{ph.provincia || "—"}</td>
                      <td style={{ padding: "14px 16px", color: C.text, fontSize: 13 }}>{ph.total_unidades || "—"}</td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{ph.email_contacto || "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ background: ph.activo ? "#052E16" : "#2D0A0A", color: ph.activo ? C.green : C.red, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {ph.activo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: C.sub, fontSize: 12 }}>{formatFecha(ph.creado_en)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Detalle empresa */}
      {empresaDetalle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ padding: "24px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{empresaDetalle.nombre}</h2>
                  {badgeVerificacion(empresaDetalle.estado_verificacion)}
                </div>
                <p style={{ color: C.muted, fontSize: 12, margin: "4px 0 0" }}>Detalle completo de la empresa</p>
              </div>
              <button onClick={() => setEmpresaDetalle(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Info básica */}
              <div>
                <p style={{ color: C.purple, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Información de la empresa</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["Email", empresaDetalle.email],
                    ["RUC empresa", empresaDetalle.empresa_kyc?.ruc || empresaDetalle.ruc],
                    ["Representante", empresaDetalle.empresa_kyc?.representante_nombre || empresaDetalle.representante_legal],
                    ["Email rep.", empresaDetalle.empresa_kyc?.representante_email],
                    ["Cédula rep.", empresaDetalle.empresa_kyc?.representante_cedula],
                    ["Empleados", empresaDetalle.empresa_kyc?.num_empleados],
                    ["Facturación anual", empresaDetalle.empresa_kyc?.facturacion_anual_promedio ? usd(empresaDetalle.empresa_kyc.facturacion_anual_promedio) : null],
                    ["Contratos ganados", empresaDetalle.total_contratos_ganados || 0],
                  ].map(([label, val]) => val != null && (
                    <div key={String(label)} style={{ background: C.bgPanel, borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ color: C.sub, fontSize: 11, margin: "0 0 2px" }}>{label}</p>
                      <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* KYC */}
              {empresaDetalle.empresa_kyc && (
                <div>
                  <p style={{ color: C.purple, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>Estado KYC</p>
                  <div style={{ background: C.bgPanel, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ color: C.sub, fontSize: 12 }}>Completitud</span>
                      <span style={{ color: empresaDetalle.empresa_kyc.completado ? C.green : C.gold, fontSize: 12, fontWeight: 700 }}>{empresaDetalle.empresa_kyc.porcentaje_completado}%</span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ background: empresaDetalle.empresa_kyc.completado ? C.green : C.gold, height: "100%", width: `${empresaDetalle.empresa_kyc.porcentaje_completado}%`, transition: "width .4s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <span style={{ background: empresaDetalle.empresa_kyc.tiene_seguro_responsabilidad ? "#052E16" : "#2D0A0A", color: empresaDetalle.empresa_kyc.tiene_seguro_responsabilidad ? C.green : C.red, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {empresaDetalle.empresa_kyc.tiene_seguro_responsabilidad ? "✓" : "✗"} Seguro RC
                      </span>
                      <span style={{ background: empresaDetalle.empresa_kyc.tiene_fianza_cumplimiento ? "#052E16" : "#2D0A0A", color: empresaDetalle.empresa_kyc.tiene_fianza_cumplimiento ? C.green : C.red, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {empresaDetalle.empresa_kyc.tiene_fianza_cumplimiento ? "✓" : "✗"} Fianza
                      </span>
                    </div>
                    {empresaDetalle.empresa_kyc.referencias_comerciales && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ color: C.sub, fontSize: 11, margin: "0 0 4px" }}>Referencias comerciales</p>
                        <p style={{ color: C.text, fontSize: 12, margin: 0, whiteSpace: "pre-line" }}>{empresaDetalle.empresa_kyc.referencias_comerciales}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Categorías */}
              {empresaDetalle.categorias?.length > 0 && (
                <div>
                  <p style={{ color: C.purple, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>Categorías de servicio</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {empresaDetalle.categorias.map(cat => (
                      <span key={cat} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.sub, padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>{cat}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentos */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ color: C.purple, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Documentos KYC</p>
                  {loadingDocs && <span style={{ color: C.muted, fontSize: 12 }}>Cargando...</span>}
                </div>

                {!loadingDocs && docsEmpresa.length === 0 && (
                  <div style={{ background: C.bgPanel, borderRadius: 8, padding: "16px", textAlign: "center" }}>
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No hay documentos subidos aún</p>
                  </div>
                )}

                {/* Documentos subidos */}
                {docsEmpresa.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {docsEmpresa.map(doc => {
                      const estadoDoc = doc.estado || "pendiente";
                      const estadoColor = estadoDoc === "aprobado" ? C.green : estadoDoc === "rechazado" ? C.red : C.gold;
                      const estadoBg = estadoDoc === "aprobado" ? "#052E16" : estadoDoc === "rechazado" ? "#2D0A0A" : "#2D2310";
                      return (
                        <div key={doc.id} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {TIPOS_LABEL[doc.tipo] || doc.tipo}
                            </p>
                            <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>{new Date(doc.creado_en).toLocaleDateString("es-PA")}</p>
                            {doc.motivo_rechazo && <p style={{ color: C.red, fontSize: 11, margin: "4px 0 0", fontStyle: "italic" }}>Motivo: {doc.motivo_rechazo}</p>}
                          </div>
                          <span style={{ background: estadoBg, color: estadoColor, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {estadoDoc === "aprobado" ? "✓ Aprobado" : estadoDoc === "rechazado" ? "✗ Rechazado" : "⏳ Pendiente"}
                          </span>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>Ver →</a>
                          {estadoDoc !== "aprobado" && (
                            <button
                              onClick={() => revisarDoc(empresaDetalle.id, doc.id, "aprobado")}
                              disabled={revisandoDoc === doc.id}
                              style={{ background: "#052E16", border: `1px solid ${C.green}`, color: C.green, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                            >✓</button>
                          )}
                          {estadoDoc !== "rechazado" && (
                            <button
                              onClick={() => { setShowMotivoDoc(doc.id); setMotivoDoc(""); }}
                              style={{ background: "#2D0A0A", border: `1px solid ${C.red}`, color: C.red, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
                            >✗</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Documentos faltantes */}
                {!loadingDocs && (() => {
                  const tiposSubidos = new Set(docsEmpresa.map(d => d.tipo));
                  const faltantes = TIPOS_REQUERIDOS.filter(t => !tiposSubidos.has(t));
                  if (faltantes.length === 0) return null;
                  return (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ color: C.red, fontSize: 11, fontWeight: 600, margin: "0 0 6px" }}>Documentos faltantes ({faltantes.length}):</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {faltantes.map(t => (
                          <span key={t} style={{ background: "#2D0A0A", color: C.red, border: `1px solid ${C.red}30`, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600 }}>
                            {TIPOS_LABEL[t] || t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Modal motivo rechazo doc */}
                {showMotivoDoc && (
                  <div style={{ marginTop: 12, background: "#2D0A0A", border: `1px solid ${C.red}30`, borderRadius: 8, padding: 14 }}>
                    <p style={{ color: C.red, fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>Motivo del rechazo (opcional)</p>
                    <textarea
                      rows={2}
                      value={motivoDoc}
                      onChange={e => setMotivoDoc(e.target.value)}
                      placeholder="Ej: El documento está vencido, firma faltante..."
                      style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 12, width: "100%", resize: "vertical", outline: "none" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        onClick={() => revisarDoc(empresaDetalle.id, showMotivoDoc, "rechazado", motivoDoc)}
                        disabled={revisandoDoc !== null}
                        style={{ background: "#2D0A0A", border: `1px solid ${C.red}`, color: C.red, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      >Confirmar rechazo</button>
                      <button onClick={() => setShowMotivoDoc(null)} style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                {empresaDetalle.estado_verificacion !== "verificada" && (
                  <button
                    onClick={() => { verificarEmpresa(empresaDetalle.id, "verificada"); }}
                    disabled={verificando === empresaDetalle.id}
                    style={{ background: "#052E16", border: `1px solid ${C.green}`, color: C.green, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1, opacity: verificando ? 0.6 : 1 }}
                  >
                    ✓ Verificar empresa
                  </button>
                )}
                {empresaDetalle.estado_verificacion !== "rechazada" && (
                  <button
                    onClick={() => { setEmpresaDetalle(null); setShowRechazo(empresaDetalle.id); }}
                    style={{ background: "#2D0A0A", border: `1px solid ${C.red}`, color: C.red, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1 }}
                  >
                    ✗ Rechazar
                  </button>
                )}
                <button
                  onClick={() => setEmpresaDetalle(null)}
                  style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Motivo rechazo */}
      {showRechazo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, width: "100%", maxWidth: 480, padding: 28 }}>
            <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Rechazar empresa</h3>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>Indica el motivo del rechazo. Se enviará por email a la empresa.</p>
            <textarea
              rows={4}
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Ej: Documentos de RUC incompletos. Por favor actualizar certificado de paz y salvo de DGI..."
              style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => verificarEmpresa(showRechazo, "rechazada", motivoRechazo)}
                disabled={verificando !== null}
                style={{ background: "#2D0A0A", border: `1px solid ${C.red}`, color: C.red, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1, opacity: verificando ? 0.6 : 1 }}
              >
                Confirmar rechazo
              </button>
              <button
                onClick={() => { setShowRechazo(null); setMotivoRechazo(""); }}
                style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
