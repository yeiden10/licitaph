"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg:      "#07090F",
  bgCard:  "#0D1117",
  bgPanel: "#111827",
  border:  "#1F2937",
  gold:    "#C9A84C",
  goldDim: "#2D2310",
  blue:    "#4A9EFF",
  green:   "#4ADE80",
  red:     "#F87171",
  text:    "#F0F4FF",
  muted:   "#6B7280",
  sub:     "#9CA3AF",
};

type Tab = "resumen" | "licitaciones" | "contratos";

interface PHData {
  id: string;
  nombre: string;
  ciudad: string;
  provincia: string;
  logo_url: string | null;
  total_unidades: number | null;
}

interface Licitacion {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  fecha_cierre: string | null;
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  urgente: boolean;
  creado_en: string;
  propuestas: { count: number }[];
}

interface Contrato {
  id: string;
  valor_anual: number | null;
  monto_mensual: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  estado_firma: string | null;
  licitaciones: { titulo: string; categoria: string } | null;
  empresas: { nombre: string; calificacion_promedio: number | null } | null;
}

// Mapa completo de categorías — sincronizado con el wizard de nueva-licitacion
const CATEGORIAS: Record<string, string> = {
  // Valores del wizard (CATEGORIAS_SERVICIO)
  seguridad:        "Seguridad 24/7",
  limpieza:         "Limpieza y mantenimiento",
  hvac:             "HVAC / Climatización",
  jardineria:       "Jardinería y áreas verdes",
  ascensores:       "Ascensores",
  electricidad:     "Electricidad y plomería",
  pintura:          "Pintura y reparaciones",
  plagas:           "Control de plagas",
  piscinas:         "Mantenimiento de piscinas",
  impermeabilizacion: "Impermeabilización y techos",
  portones:         "Portones y automatismos",
  cctv:             "CCTV y vigilancia",
  incendio:         "Sistemas contra incendios",
  generadores:      "Generadores y UPS",
  fumigacion:       "Fumigación y desinfección",
  mudanzas:         "Mudanzas y logística",
  valet:            "Valet parking",
  conserje:         "Conserjería y recepción",
  obras_civiles:    "Obras civiles y remodelaciones",
  tecnologia:       "Tecnología / IT y redes",
  gestion_residuos: "Gestión de residuos",
  energia_solar:    "Energía solar",
  administracion:   "Administración de propiedades",
  legal_contable:   "Servicios legales y contables",
  otros:            "Otros servicios",
  // Alias compatibles con licitaciones más antiguas
  mantenimiento:    "Mantenimiento General",
  plomeria:         "Plomería",
  areas_verdes:     "Jardinería",
  piscina:          "Piscina",
  auditoria:        "Auditoría",
  legal:            "Legal",
  seguros:          "Seguros",
  control_acceso:   "Control de Acceso",
  remodelacion:     "Remodelación",
  telecomunicaciones: "Telecomunicaciones",
  sistemas_pluviales: "Sistemas Pluviales",
  filtraciones:     "Impermeabilizante y Filtraciones",
  domotica:         "Domótica y Automatización",
  reparaciones:     "Reparaciones Menores",
};

export default function CopropietarioPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [copropData, setCopropData] = useState<any>(null); // registro en copropietarios
  const [ph, setPH] = useState<PHData | null>(null);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [tab, setTab] = useState<Tab>("resumen");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString("es-PA", { minimumFractionDigits: 0 })}` : "—";
  const fmtFecha = (s: string | null | undefined) => {
    if (!s) return "—";
    return new Date(s + (s.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
  };

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = "/"; return; }
      setUser(u);

      const tipo = u.user_metadata?.tipo_usuario;
      if (tipo !== "copropietario" && tipo !== "superadmin") {
        window.location.href = tipo === "empresa" ? "/empresa" : tipo === "ph_admin" ? "/ph" : "/";
        return;
      }

      // Cargar registro del copropietario (vinculado por email o usuario_id)
      const { data: coprop } = await supabase
        .from("copropietarios")
        .select("*, propiedades_horizontales(id, nombre, ciudad, provincia, logo_url, total_unidades)")
        .or(`usuario_id.eq.${u.id},email.eq.${u.email}`)
        .eq("activo", true)
        .maybeSingle();

      if (!coprop) {
        setError("No estás registrado como copropietario en ninguna Propiedad Horizontal. Contacta al administrador de tu PH.");
        setLoading(false);
        return;
      }

      setCopropData(coprop);
      const phData = coprop.propiedades_horizontales as PHData;
      setPH(phData);

      // Cargar licitaciones del PH (activas + historial)
      const { data: lics } = await supabase
        .from("licitaciones")
        .select("*, propuestas(count)")
        .eq("ph_id", phData.id)
        .not("estado", "eq", "borrador")
        .order("creado_en", { ascending: false });

      setLicitaciones((lics ?? []) as Licitacion[]);

      // Cargar contratos del PH
      const { data: cnts } = await supabase
        .from("contratos")
        .select("*, licitaciones(titulo, categoria), empresas(nombre, calificacion_promedio)")
        .eq("ph_id", phData.id)
        .order("creado_en", { ascending: false });

      setContratos((cnts ?? []) as Contrato[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.muted, fontSize: 14 }}>Cargando...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏢</div>
        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: "0 0 12px" }}>No vinculado a un PH</h2>
        <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>{error}</p>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
          style={{ background: C.bgPanel, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 13 }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  const licsActivas = licitaciones.filter(l => l.estado === "activa");
  const licsHistorial = licitaciones.filter(l => l.estado !== "activa");
  const contratosActivos = contratos.filter(c => c.estado === "activo");
  const gastoAnual = contratosActivos.reduce((s, c) => s + (c.valor_anual ?? 0), 0);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "resumen", label: "Resumen", icon: "📊" },
    { id: "licitaciones", label: "Licitaciones", icon: "📋" },
    { id: "contratos", label: "Contratos", icon: "📄" },
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; color: ${C.text}; font-family: Inter, sans-serif; }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 220px; background: ${C.bgCard}; border-right: 1px solid ${C.border}; padding: 24px 0; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; }
        .logo { padding: 0 20px 24px; border-bottom: 1px solid ${C.border}; margin-bottom: 16px; }
        .logo-text { font-size: 20px; font-weight: 800; }
        .logo-ph { color: ${C.gold}; }
        .logo-badge { background: ${C.bgPanel}; border: 1px solid ${C.border}; border-radius: 4px; padding: "2px 6px"; font-size: 10px; color: ${C.muted}; margin-top: 4px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 20px; cursor: pointer; font-size: 13px; font-weight: 500; color: ${C.muted}; border-left: 2px solid transparent; transition: all 0.15s; }
        .nav-item:hover { background: ${C.bgPanel}; color: ${C.text}; }
        .nav-item.active { background: ${C.goldDim}; color: ${C.gold}; border-left-color: ${C.gold}; }
        .main { margin-left: 220px; flex: 1; padding: 32px; max-width: 1000px; }
        .ph-banner { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; display: flex; align-items: center; gap: 16px; }
        .ph-avatar { width: 48px; height: 48px; border-radius: 10px; background: ${C.goldDim}; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .ph-nombre { font-size: 18px; font-weight: 700; color: ${C.text}; }
        .ph-sub { font-size: 13px; color: ${C.muted}; margin-top: 2px; }
        .unidad-badge { background: ${C.goldDim}; border: 1px solid ${C.gold}40; color: ${C.gold}; border-radius: 6px; padding: 3px 10px; font-size: 12px; font-weight: 600; margin-left: auto; }
        .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .card { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 12px; padding: 20px; }
        .card-label { font-size: 11px; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .card-val { font-size: 24px; font-weight: 700; }
        .sec { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
        .sec-title { font-size: 15px; font-weight: 600; color: ${C.text}; margin-bottom: 16px; }
        .lic-row { padding: 14px 0; border-bottom: 1px solid ${C.border}; display: flex; align-items: flex-start; gap: 12px; }
        .lic-row:last-child { border-bottom: none; }
        .lic-icon { width: 36px; height: 36px; border-radius: 8px; background: ${C.bgPanel}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .lic-titulo { font-size: 14px; font-weight: 600; color: ${C.text}; }
        .lic-meta { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
        .badge { display: inline-block; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
        .b-green { background: #052E16; color: ${C.green}; }
        .b-gold { background: ${C.goldDim}; color: ${C.gold}; }
        .b-red { background: #3B0A0A; color: ${C.red}; }
        .b-blue { background: #0A1628; color: ${C.blue}; }
        .b-gray { background: ${C.bgPanel}; color: ${C.muted}; }
        .contrato-card { background: ${C.bgPanel}; border: 1px solid ${C.border}; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px; }
        .contrato-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .contrato-label { font-size: 12px; color: ${C.muted}; }
        .contrato-val { font-size: 13px; color: ${C.text}; font-weight: 500; }
        .empty { text-align: center; padding: 40px 20px; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .empty-sub { font-size: 13px; color: ${C.muted}; }
        .readonly-banner { background: rgba(74,158,255,0.05); border: 1px solid rgba(74,158,255,0.15); border-radius: 8px; padding: 10px 16px; margin-bottom: 24px; font-size: 12px; color: ${C.blue}; display: flex; align-items: center; gap: 8px; }
        @media (max-width: 1024px) {
          .cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main { margin-left: 0; padding: 16px; }
          .cards { grid-template-columns: repeat(2, 1fr); }
          .ph-banner { flex-wrap: wrap; }
          .unidad-badge { margin-left: 0; }
        }
        @media (max-width: 480px) {
          .cards { grid-template-columns: 1fr; }
          .main { padding: 12px; }
          .ph-banner { padding: 14px 16px; gap: 10px; }
        }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <nav className="sidebar">
          <div className="logo">
            <div className="logo-text">
              <span className="logo-ph">Licita</span>PH
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Vista Copropietario</div>
          </div>

          {tabs.map(t => (
            <div
              key={t.id}
              className={`nav-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
            </div>
          ))}

          <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </div>
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12, width: "100%" }}
            >
              Cerrar sesión
            </button>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          {/* Banner PH */}
          <div className="ph-banner">
            <div className="ph-avatar">
              {ph?.logo_url ? (
                <img src={ph.logo_url} alt={ph.nombre} style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover" }} />
              ) : "🏢"}
            </div>
            <div>
              <div className="ph-nombre">{ph?.nombre}</div>
              <div className="ph-sub">{ph?.ciudad}{ph?.provincia ? `, ${ph.provincia}` : ""}</div>
            </div>
            {copropData?.unidad && (
              <div className="unidad-badge">🏠 {copropData.unidad}</div>
            )}
          </div>

          {/* Banner read-only */}
          <div className="readonly-banner">
            <span>👁</span>
            Vista de transparencia — Solo lectura. Aquí puedes ver las licitaciones y contratos de tu propiedad horizontal.
          </div>

          {/* ── RESUMEN ─────────────────────────────────────────────── */}
          {tab === "resumen" && (
            <>
              <div className="cards">
                {[
                  { label: "Licitaciones activas", val: licsActivas.length, color: C.gold },
                  { label: "Contratos vigentes", val: contratosActivos.length, color: C.green },
                  { label: "Gasto anual total", val: fmt(gastoAnual), color: C.blue },
                  { label: "Contratos historial", val: licsHistorial.length, color: C.muted },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-val" style={{ color: c.color, fontSize: typeof c.val === "string" && c.val.length > 6 ? 18 : 24 }}>{c.val}</div>
                  </div>
                ))}
              </div>

              {/* Licitaciones activas */}
              <div className="sec">
                <div className="sec-title">📋 Licitaciones en curso</div>
                {licsActivas.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <div className="empty-sub">No hay licitaciones activas en este momento.</div>
                  </div>
                ) : (
                  licsActivas.map(l => (
                    <div className="lic-row" key={l.id}>
                      <div className="lic-icon">📋</div>
                      <div style={{ flex: 1 }}>
                        <div className="lic-titulo">{l.titulo}</div>
                        <div className="lic-meta">
                          {CATEGORIAS[l.categoria] ?? l.categoria}
                          {l.fecha_cierre && ` · Cierra ${fmtFecha(l.fecha_cierre)}`}
                          {` · ${(l.propuestas?.[0] as any)?.count ?? 0} propuestas`}
                        </div>
                      </div>
                      <span className={`badge ${l.urgente ? "b-red" : "b-gold"}`}>
                        {l.urgente ? "⚡ Urgente" : "● Activa"}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Contratos activos */}
              <div className="sec">
                <div className="sec-title">📄 Contratos vigentes</div>
                {contratosActivos.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📄</div>
                    <div className="empty-sub">No hay contratos activos.</div>
                  </div>
                ) : (
                  contratosActivos.map(c => (
                    <div className="lic-row" key={c.id}>
                      <div className="lic-icon">🤝</div>
                      <div style={{ flex: 1 }}>
                        <div className="lic-titulo">{c.empresas?.nombre ?? "Empresa"}</div>
                        <div className="lic-meta">
                          {c.licitaciones?.titulo ?? CATEGORIAS[c.licitaciones?.categoria ?? ""] ?? "Contrato"}
                          {c.monto_mensual && ` · ${fmt(c.monto_mensual)}/mes`}
                        </div>
                      </div>
                      <span className="badge b-green">● Activo</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── LICITACIONES ─────────────────────────────────────────── */}
          {tab === "licitaciones" && (
            <div className="sec">
              <div className="sec-title">📋 Todas las licitaciones de {ph?.nombre}</div>
              {licitaciones.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📋</div>
                  <div className="empty-sub">Aún no hay licitaciones registradas.</div>
                </div>
              ) : (
                licitaciones.map(l => {
                  const estadoBadge =
                    l.estado === "activa" ? { cls: "b-gold", label: "● Activa" } :
                    l.estado === "adjudicada" ? { cls: "b-green", label: "✓ Adjudicada" } :
                    l.estado === "en_evaluacion" ? { cls: "b-blue", label: "🔍 En evaluación" } :
                    l.estado === "cancelada" ? { cls: "b-red", label: "✗ Cancelada" } :
                    { cls: "b-gray", label: l.estado };
                  return (
                    <div className="lic-row" key={l.id}>
                      <div className="lic-icon">📋</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div className="lic-titulo">{l.titulo}</div>
                          {l.urgente && <span className="badge b-red">⚡ Urgente</span>}
                        </div>
                        <div className="lic-meta">
                          {CATEGORIAS[l.categoria] ?? l.categoria}
                          {l.presupuesto_maximo && ` · Hasta ${fmt(l.presupuesto_maximo)}`}
                          {l.fecha_cierre && ` · Cierre: ${fmtFecha(l.fecha_cierre)}`}
                          {` · ${(l.propuestas?.[0] as any)?.count ?? 0} propuestas recibidas`}
                        </div>
                      </div>
                      <span className={`badge ${estadoBadge.cls}`}>{estadoBadge.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── CONTRATOS ─────────────────────────────────────────────── */}
          {tab === "contratos" && (
            <div>
              <div className="sec">
                <div className="sec-title">📄 Contratos de {ph?.nombre}</div>
                {contratos.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📄</div>
                    <div className="empty-sub">No hay contratos registrados aún.</div>
                  </div>
                ) : (
                  contratos.map(c => {
                    const estadoBadge =
                      c.estado === "activo" ? { cls: "b-green", label: "● Activo" } :
                      c.estado === "completado" ? { cls: "b-gray", label: "✓ Completado" } :
                      c.estado === "vencido" ? { cls: "b-red", label: "⚠ Vencido" } :
                      { cls: "b-gray", label: c.estado };
                    return (
                      <div className="contrato-card" key={c.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15, color: C.text }}>{c.empresas?.nombre ?? "Empresa"}</div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                              {c.licitaciones?.titulo ?? CATEGORIAS[c.licitaciones?.categoria ?? ""] ?? "Contrato de servicios"}
                            </div>
                          </div>
                          <span className={`badge ${estadoBadge.cls}`}>{estadoBadge.label}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                          <div>
                            <div className="contrato-label">Monto mensual</div>
                            <div className="contrato-val">{fmt(c.monto_mensual)}</div>
                          </div>
                          <div>
                            <div className="contrato-label">Valor anual</div>
                            <div className="contrato-val">{fmt(c.valor_anual)}</div>
                          </div>
                          <div>
                            <div className="contrato-label">Período</div>
                            <div className="contrato-val">{fmtFecha(c.fecha_inicio)} – {fmtFecha(c.fecha_fin)}</div>
                          </div>
                        </div>
                        {c.empresas?.calificacion_promedio != null && (
                          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
                            Calificación empresa: <span style={{ color: C.gold }}>{"⭐".repeat(Math.round(c.empresas.calificacion_promedio))} {c.empresas.calificacion_promedio.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
