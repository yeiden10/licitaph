"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DOCUMENTOS_REQUERIDOS = [
  { id: "cedula", label: "Cédula del representante legal", required: true, desc: "Cédula panameña vigente" },
  { id: "registro_publico", label: "Certificado de Registro Público", required: true, desc: "Emitido en los últimos 3 meses" },
  { id: "paz_salvo_dgi", label: "Paz y Salvo DGI", required: true, desc: "Dirección General de Ingresos" },
  { id: "paz_salvo_css", label: "Paz y Salvo CSS", required: true, desc: "Caja de Seguro Social al día" },
  { id: "idoneidad", label: "Idoneidad profesional", required: true, desc: "Según tipo de servicio ofrecido" },
  { id: "kyc", label: "Formulario KYC", required: true, desc: "Conozca a su cliente — completado en plataforma" },
  { id: "estados_financieros", label: "Estados financieros", required: false, desc: "Últimos 2 años — requerido para contratos >$50K" },
  { id: "aviso_operacion", label: "Aviso de operación", required: true, desc: "Municipio de Panamá vigente" },
];

const LICITACIONES_MOCK = [
  { id: "LIC-001", ph: "PH Costa del Este", servicio: "Seguridad 24/7", presupuesto: "$3,000 - $4,500/mes", cierre: "25 Feb 2026", propuestas: 4, categoria: "seguridad", urgente: true },
  { id: "LIC-002", ph: "PH Punta Pacífica", servicio: "Limpieza y mantenimiento", presupuesto: "$1,800 - $2,500/mes", cierre: "28 Feb 2026", propuestas: 2, categoria: "limpieza", urgente: false },
  { id: "LIC-003", ph: "PH San Francisco", servicio: "Mantenimiento HVAC", presupuesto: "$2,200 - $3,000/mes", cierre: "5 Mar 2026", propuestas: 1, categoria: "hvac", urgente: false },
  { id: "LIC-004", ph: "PH Bella Vista", servicio: "Jardinería y áreas verdes", presupuesto: "$800 - $1,200/mes", cierre: "8 Mar 2026", propuestas: 3, categoria: "jardineria", urgente: false },
  { id: "LIC-005", ph: "PH Obarrio", servicio: "Control de plagas", presupuesto: "$400 - $700/mes", cierre: "10 Mar 2026", propuestas: 0, categoria: "otros", urgente: false },
];

const PROPUESTAS_MOCK = [
  { id: "PROP-001", licitacion: "LIC-008", ph: "PH Marbella", servicio: "Seguridad 24/7", monto: "$3,200/mes", enviada: "10 Feb 2026", estado: "en_revision", puntaje: null },
  { id: "PROP-002", licitacion: "LIC-007", ph: "PH Transistmica", servicio: "Limpieza", monto: "$2,100/mes", enviada: "5 Feb 2026", estado: "ganada", puntaje: 92 },
  { id: "PROP-003", licitacion: "LIC-006", ph: "PH Betania", servicio: "Jardinería", monto: "$950/mes", enviada: "28 Ene 2026", estado: "no_seleccionada", puntaje: 71 },
];

const CONTRATOS_MOCK = [
  { id: "CONT-001", ph: "PH Transistmica", servicio: "Limpieza y mantenimiento", monto: "$2,100/mes", inicio: "1 Mar 2026", fin: "28 Feb 2027", estado: "activo" },
  { id: "CONT-002", ph: "PH El Dorado", servicio: "Seguridad 24/7", monto: "$3,500/mes", inicio: "1 Ene 2025", fin: "31 Dic 2025", estado: "completado" },
];

type Tab = "dashboard" | "licitaciones" | "propuestas" | "contratos" | "documentos";

export default function EmpresaPortal() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docsSubidos, setDocsSubidos] = useState<Record<string, boolean>>({
    cedula: true, registro_publico: true, paz_salvo_dgi: false,
    paz_salvo_css: true, idoneidad: false, kyc: true,
    estados_financieros: false, aviso_operacion: true,
  });
  const [showApply, setShowApply] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  const docsRequeridos = DOCUMENTOS_REQUERIDOS.filter(d => d.required);
  const docsCompletos = docsRequeridos.filter(d => docsSubidos[d.id]).length;
  const puedeListar = docsCompletos === docsRequeridos.length;
  const pct = Math.round((docsCompletos / docsRequeridos.length) * 100);

  const nombreEmpresa = user?.user_metadata?.nombre_completo || "Mi Empresa";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#C9A84C", fontFamily: "Inter, sans-serif", fontSize: 14 }}>Cargando...</div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#F0F4FF" }}>Acceso restringido</div>
      <div style={{ color: "#8896AA", fontSize: 14 }}>Debes iniciar sesión para acceder al portal</div>
      <a href="/" style={{ color: "#C9A84C", fontSize: 13, textDecoration: "none" }}>← Volver al inicio</a>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #07090F; --bg2: #0D1117; --bg3: #131920;
          --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
          --text: #F0F4FF; --text2: #8896AA; --text3: #3D4A5C;
          --gold: #C9A84C; --gold2: #E8C96A; --blue: #4A9EFF; --green: #4ADE80; --red: #F87171;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:0.2} }

        /* LAYOUT */
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; left: 0; z-index: 100; }
        .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); }
        .logo-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 800; }
        .logo-gold { color: var(--gold); }
        .logo-white { color: var(--text); }
        .logo-badge { font-size: 8px; background: var(--gold); color: var(--bg); padding: 2px 5px; border-radius: 3px; font-family: 'DM Mono', monospace; letter-spacing: 1px; vertical-align: middle; margin-left: 4px; }
        .sidebar-user { padding: 14px 16px; border-bottom: 1px solid var(--border); }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(74,158,255,0.15); border: 1px solid rgba(74,158,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--blue); font-family: 'Plus Jakarta Sans', sans-serif; }
        .user-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 10px; color: var(--text3); margin-top: 1px; }
        .sidebar-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: var(--text2); border: none; background: none; width: 100%; text-align: left; font-family: 'Inter', sans-serif; }
        .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.04); }
        .nav-item.active { color: var(--blue); background: rgba(74,158,255,0.08); }
        .nav-icon { font-size: 15px; width: 20px; text-align: center; }
        .nav-badge { margin-left: auto; background: var(--blue); color: var(--bg); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; font-family: 'DM Mono', monospace; }
        .nav-badge-warn { background: #F59E0B; }
        .sidebar-bottom { padding: 12px 10px; border-top: 1px solid var(--border); }

        /* DOCS PROGRESS */
        .docs-alert { margin: 12px 10px; padding: 10px 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; }
        .docs-alert-title { font-size: 11px; font-weight: 600; color: #F59E0B; margin-bottom: 6px; }
        .docs-progress-bar { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
        .docs-progress-fill { height: 100%; border-radius: 2px; background: #F59E0B; transition: width 0.4s; }
        .docs-alert-sub { font-size: 10px; color: var(--text3); }

        /* MAIN */
        .main { margin-left: 240px; flex: 1; padding: 32px; min-height: 100vh; }
        .page-header { margin-bottom: 28px; animation: fadeUp 0.4s ease both; }
        .page-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 4px; }
        .page-sub { font-size: 13px; color: var(--text2); }

        /* CARDS */
        .cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; animation: fadeUp 0.4s ease 0.05s both; }
        .card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
        .card-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .card-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .card-sub { font-size: 12px; color: var(--text2); }

        /* TABLE */
        .section-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; margin-bottom: 20px; animation: fadeUp 0.4s ease 0.1s both; }
        .section-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .section-head-title { font-size: 14px; font-weight: 600; color: var(--text); }
        .section-head-sub { font-size: 12px; color: var(--text3); margin-top: 2px; }
        .table { width: 100%; border-collapse: collapse; }
        .table th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .table td { padding: 13px 16px; font-size: 13px; color: var(--text2); border-bottom: 1px solid var(--border); vertical-align: middle; }
        .table tr:last-child td { border-bottom: none; }
        .table tr:hover td { background: rgba(255,255,255,0.02); }
        .td-main { color: var(--text) !important; font-weight: 500; }
        .td-mono { font-family: 'DM Mono', monospace; font-size: 12px !important; }

        /* BADGES */
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; }
        .badge-green { background: rgba(74,222,128,0.1); color: var(--green); border: 1px solid rgba(74,222,128,0.2); }
        .badge-blue { background: rgba(74,158,255,0.1); color: var(--blue); border: 1px solid rgba(74,158,255,0.2); }
        .badge-yellow { background: rgba(245,158,11,0.1); color: #F59E0B; border: 1px solid rgba(245,158,11,0.2); }
        .badge-red { background: rgba(248,113,113,0.1); color: var(--red); border: 1px solid rgba(248,113,113,0.2); }
        .badge-gray { background: rgba(255,255,255,0.05); color: var(--text3); border: 1px solid var(--border); }
        .badge-urgent { background: rgba(248,113,113,0.1); color: var(--red); border: 1px solid rgba(248,113,113,0.2); font-size: 9px; padding: 2px 6px; margin-left: 6px; }

        /* BUTTONS */
        .btn { padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; border: none; display: inline-flex; align-items: center; gap: 5px; }
        .btn-primary { background: var(--blue); color: #07090F; }
        .btn-primary:hover { background: #6DB3FF; transform: translateY(-1px); }
        .btn-gold { background: var(--gold); color: #07090F; }
        .btn-gold:hover { background: var(--gold2); }
        .btn-ghost { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
        .btn-ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
        .btn-disabled { background: rgba(255,255,255,0.05); color: var(--text3); cursor: not-allowed; }

        /* DOCS */
        .docs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 20px; }
        .doc-item { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: all 0.2s; }
        .doc-item:hover { border-color: var(--border2); }
        .doc-status { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .doc-status-ok { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); }
        .doc-status-missing { background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.15); }
        .doc-status-optional { background: rgba(255,255,255,0.04); border: 1px solid var(--border); }
        .doc-name { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
        .doc-desc { font-size: 11px; color: var(--text3); }
        .doc-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }

        /* FILTROS */
        .filtros { display: flex; gap: 6px; padding: 14px 20px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
        .filtro-btn { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; border: 1px solid var(--border); background: transparent; color: var(--text2); }
        .filtro-btn:hover { color: var(--text); border-color: var(--border2); }
        .filtro-btn.active { background: rgba(74,158,255,0.1); border-color: rgba(74,158,255,0.3); color: var(--blue); }

        /* MODAL APPLY */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 300; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: 18px; padding: 28px; width: 480px; max-width: 90vw; position: relative; }
        .modal::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--blue), transparent); border-radius: 18px 18px 0 0; }
        .modal-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700; margin-bottom: 6px; }
        .modal-sub { font-size: 13px; color: var(--text2); margin-bottom: 20px; line-height: 1.6; }
        .modal-field { margin-bottom: 14px; }
        .modal-field label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .modal-field input, .modal-field textarea, .modal-field select { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 8px; padding: 10px 13px; font-size: 13px; color: var(--text); font-family: 'Inter', sans-serif; outline: none; transition: all 0.15s; }
        .modal-field input:focus, .modal-field textarea:focus { border-color: var(--blue); background: rgba(74,158,255,0.03); }
        .modal-field textarea { resize: vertical; min-height: 80px; }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

        /* PUNTAJE */
        .score-ring { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 700; }
        .score-high { background: rgba(74,222,128,0.1); color: var(--green); border: 1px solid rgba(74,222,128,0.25); }
        .score-mid { background: rgba(245,158,11,0.1); color: #F59E0B; border: 1px solid rgba(245,158,11,0.25); }
        .score-low { background: rgba(248,113,113,0.1); color: var(--red); border: 1px solid rgba(248,113,113,0.25); }

        @media (max-width: 1024px) {
          .cards-grid { grid-template-columns: repeat(2, 1fr); }
          .docs-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main { margin-left: 0; padding: 20px 16px; }
        }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-text">
              <span className="logo-gold">Licita</span>
              <span className="logo-white">PH</span>
              <span className="logo-badge">BETA</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>Portal de empresa</div>
          </div>

          <div className="sidebar-user">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="user-avatar">{nombreEmpresa[0]?.toUpperCase()}</div>
              <div>
                <div className="user-name">{nombreEmpresa}</div>
                <div className="user-role">Empresa proveedora</div>
              </div>
            </div>
          </div>

          {!puedeListar && (
            <div className="docs-alert">
              <div className="docs-alert-title">⚠️ Documentos pendientes</div>
              <div className="docs-progress-bar">
                <div className="docs-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="docs-alert-sub">{docsCompletos}/{docsRequeridos.length} documentos listos para licitar</div>
            </div>
          )}

          <nav className="sidebar-nav">
            {[
              { key: "dashboard", icon: "⚡", label: "Dashboard" },
              { key: "licitaciones", icon: "📋", label: "Licitaciones", badge: LICITACIONES_MOCK.length },
              { key: "propuestas", icon: "📤", label: "Mis propuestas", badge: PROPUESTAS_MOCK.filter(p => p.estado === "en_revision").length },
              { key: "contratos", icon: "📄", label: "Mis contratos" },
              { key: "documentos", icon: "🗂️", label: "Mis documentos", badge: !puedeListar ? "!" : null, badgeWarn: true },
            ].map(item => (
              <button key={item.key} className={`nav-item ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key as Tab)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`nav-badge ${item.badgeWarn ? "nav-badge-warn" : ""}`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <button className="nav-item" onClick={() => { supabase.auth.signOut(); window.location.href = "/"; }}>
              <span className="nav-icon">↩️</span> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Bienvenido, {nombreEmpresa.split(" ")[0]} 👋</h1>
                <p className="page-sub">Resumen de tu actividad en LicitaPH</p>
              </div>

              {!puedeListar && (
                <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontSize: 24 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B", marginBottom: 3 }}>Completa tus documentos para poder aplicar a licitaciones</div>
                    <div style={{ fontSize: 12, color: "var(--text2)" }}>Te faltan {docsRequeridos.length - docsCompletos} documentos requeridos. Sin ellos, los PHs no podrán ver tus propuestas.</div>
                  </div>
                  <button className="btn btn-gold" onClick={() => setTab("documentos")}>Completar ahora →</button>
                </div>
              )}

              <div className="cards-grid">
                {[
                  { label: "Licitaciones activas", value: LICITACIONES_MOCK.length, sub: "Disponibles para aplicar", color: "var(--blue)" },
                  { label: "Propuestas enviadas", value: PROPUESTAS_MOCK.length, sub: `${PROPUESTAS_MOCK.filter(p => p.estado === "en_revision").length} en revisión`, color: "var(--gold)" },
                  { label: "Contratos activos", value: CONTRATOS_MOCK.filter(c => c.estado === "activo").length, sub: "En ejecución actualmente", color: "var(--green)" },
                  { label: "Tasa de éxito", value: "33%", sub: "1 de 3 propuestas ganadas", color: "#A78BFA" },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-value" style={{ color: c.color }}>{c.value}</div>
                    <div className="card-sub">{c.sub}</div>
                  </div>
                ))}
              </div>

              <div className="section-card">
                <div className="section-head">
                  <div>
                    <div className="section-head-title">Licitaciones recientes</div>
                    <div className="section-head-sub">Las más nuevas disponibles para tu empresa</div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => setTab("licitaciones")}>Ver todas →</button>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>PH</th><th>Servicio</th><th>Presupuesto</th><th>Cierre</th><th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LICITACIONES_MOCK.slice(0, 3).map(l => (
                      <tr key={l.id}>
                        <td className="td-main">{l.ph}{l.urgente && <span className="badge badge-urgent">URGENTE</span>}</td>
                        <td>{l.servicio}</td>
                        <td className="td-mono">{l.presupuesto}</td>
                        <td>{l.cierre}</td>
                        <td>
                          <button
                            className={`btn ${puedeListar ? "btn-primary" : "btn-disabled"}`}
                            onClick={() => puedeListar && setShowApply(l.id)}
                            disabled={!puedeListar}
                          >
                            {puedeListar ? "Aplicar" : "🔒 Docs pendientes"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="section-card">
                <div className="section-head">
                  <div className="section-head-title">Mis propuestas recientes</div>
                </div>
                <table className="table">
                  <thead>
                    <tr><th>PH</th><th>Servicio</th><th>Monto</th><th>Estado</th><th>Puntaje IA</th></tr>
                  </thead>
                  <tbody>
                    {PROPUESTAS_MOCK.map(p => (
                      <tr key={p.id}>
                        <td className="td-main">{p.ph}</td>
                        <td>{p.servicio}</td>
                        <td className="td-mono">{p.monto}</td>
                        <td>
                          {p.estado === "en_revision" && <span className="badge badge-yellow">En revisión</span>}
                          {p.estado === "ganada" && <span className="badge badge-green">✓ Ganada</span>}
                          {p.estado === "no_seleccionada" && <span className="badge badge-gray">No seleccionada</span>}
                        </td>
                        <td>
                          {p.puntaje ? (
                            <div className={`score-ring ${p.puntaje >= 80 ? "score-high" : p.puntaje >= 60 ? "score-mid" : "score-low"}`}>{p.puntaje}</div>
                          ) : <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── LICITACIONES ── */}
          {tab === "licitaciones" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Licitaciones activas</h1>
                <p className="page-sub">{LICITACIONES_MOCK.length} licitaciones disponibles en Panamá</p>
              </div>
              <div className="section-card">
                <div className="filtros">
                  {["todos", "seguridad", "limpieza", "hvac", "jardineria", "otros"].map(f => (
                    <button key={f} className={`filtro-btn ${filtro === f ? "active" : ""}`} onClick={() => setFiltro(f)}>
                      {f === "todos" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <table className="table">
                  <thead>
                    <tr><th>ID</th><th>PH</th><th>Servicio</th><th>Presupuesto</th><th>Cierre</th><th>Propuestas</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {LICITACIONES_MOCK.filter(l => filtro === "todos" || l.categoria === filtro).map(l => (
                      <tr key={l.id}>
                        <td className="td-mono" style={{ color: "var(--text3)" }}>{l.id}</td>
                        <td className="td-main">{l.ph}{l.urgente && <span className="badge badge-urgent">URGENTE</span>}</td>
                        <td>{l.servicio}</td>
                        <td className="td-mono">{l.presupuesto}</td>
                        <td style={{ color: l.urgente ? "var(--red)" : "var(--text2)" }}>{l.cierre}</td>
                        <td><span className="badge badge-blue">{l.propuestas} enviadas</span></td>
                        <td>
                          <button
                            className={`btn ${puedeListar ? "btn-primary" : "btn-disabled"}`}
                            onClick={() => puedeListar && setShowApply(l.id)}
                            disabled={!puedeListar}
                          >
                            {puedeListar ? "Aplicar →" : "🔒 Docs pendientes"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── PROPUESTAS ── */}
          {tab === "propuestas" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Mis propuestas</h1>
                <p className="page-sub">Estado de todas las propuestas que has enviado</p>
              </div>
              <div className="section-card">
                <table className="table">
                  <thead>
                    <tr><th>Licitación</th><th>PH</th><th>Servicio</th><th>Monto propuesto</th><th>Enviada</th><th>Estado</th><th>Puntaje IA</th></tr>
                  </thead>
                  <tbody>
                    {PROPUESTAS_MOCK.map(p => (
                      <tr key={p.id}>
                        <td className="td-mono" style={{ color: "var(--text3)" }}>{p.licitacion}</td>
                        <td className="td-main">{p.ph}</td>
                        <td>{p.servicio}</td>
                        <td className="td-mono">{p.monto}</td>
                        <td>{p.enviada}</td>
                        <td>
                          {p.estado === "en_revision" && <span className="badge badge-yellow">⏳ En revisión</span>}
                          {p.estado === "ganada" && <span className="badge badge-green">✓ Ganada</span>}
                          {p.estado === "no_seleccionada" && <span className="badge badge-gray">No seleccionada</span>}
                        </td>
                        <td>
                          {p.puntaje ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div className={`score-ring ${p.puntaje >= 80 ? "score-high" : p.puntaje >= 60 ? "score-mid" : "score-low"}`}>{p.puntaje}</div>
                              <span style={{ fontSize: 11, color: "var(--text3)" }}>/100</span>
                            </div>
                          ) : <span style={{ color: "var(--text3)", fontSize: 12 }}>Pendiente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: "rgba(74,158,255,0.05)", border: "1px solid rgba(74,158,255,0.15)", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
                💡 <strong style={{ color: "var(--text)" }}>¿Cómo mejoro mi puntaje?</strong> La IA evalúa precio competitivo (40%), documentación completa (30%), experiencia verificada (20%) y tiempo de respuesta (10%). Asegúrate de tener todos tus documentos actualizados.
              </div>
            </>
          )}

          {/* ── CONTRATOS ── */}
          {tab === "contratos" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Mis contratos</h1>
                <p className="page-sub">Historial de contratos adjudicados</p>
              </div>
              <div className="cards-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { label: "Contratos activos", value: CONTRATOS_MOCK.filter(c => c.estado === "activo").length, color: "var(--green)" },
                  { label: "Completados", value: CONTRATOS_MOCK.filter(c => c.estado === "completado").length, color: "var(--blue)" },
                  { label: "Valor total activo", value: "$2,100/mes", color: "var(--gold)" },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-value" style={{ color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="section-card">
                <table className="table">
                  <thead>
                    <tr><th>ID</th><th>PH</th><th>Servicio</th><th>Monto</th><th>Inicio</th><th>Vence</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {CONTRATOS_MOCK.map(c => (
                      <tr key={c.id}>
                        <td className="td-mono" style={{ color: "var(--text3)" }}>{c.id}</td>
                        <td className="td-main">{c.ph}</td>
                        <td>{c.servicio}</td>
                        <td className="td-mono">{c.monto}</td>
                        <td>{c.inicio}</td>
                        <td>{c.fin}</td>
                        <td>
                          {c.estado === "activo" && <span className="badge badge-green">● Activo</span>}
                          {c.estado === "completado" && <span className="badge badge-gray">✓ Completado</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── DOCUMENTOS ── */}
          {tab === "documentos" && (
            <>
              <div className="page-header">
                <h1 className="page-title">Mis documentos</h1>
                <p className="page-sub">Mantén tus documentos al día para poder aplicar a licitaciones</p>
              </div>

              <div style={{ background: puedeListar ? "rgba(74,222,128,0.05)" : "rgba(245,158,11,0.05)", border: `1px solid ${puedeListar ? "rgba(74,222,128,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: puedeListar ? "var(--green)" : "#F59E0B", marginBottom: 6 }}>
                    {puedeListar ? "✓ Perfil completo — puedes aplicar a licitaciones" : `${docsCompletos} de ${docsRequeridos.length} documentos requeridos cargados`}
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", maxWidth: 320 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: puedeListar ? "var(--green)" : "#F59E0B", borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Plus Jakarta Sans, sans-serif", color: puedeListar ? "var(--green)" : "#F59E0B" }}>{pct}%</div>
              </div>

              <div className="section-card">
                <div className="section-head">
                  <div>
                    <div className="section-head-title">Documentos requeridos para licitar</div>
                    <div className="section-head-sub">Todos obligatorios — sin excepción</div>
                  </div>
                </div>
                <div className="docs-grid">
                  {DOCUMENTOS_REQUERIDOS.map(doc => (
                    <div className="doc-item" key={doc.id}>
                      <div className={`doc-status ${docsSubidos[doc.id] ? "doc-status-ok" : doc.required ? "doc-status-missing" : "doc-status-optional"}`}>
                        {docsSubidos[doc.id] ? "✓" : doc.required ? "✗" : "—"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="doc-name">{doc.label}</div>
                        <div className="doc-desc">{doc.desc}</div>
                        {!doc.required && <div style={{ fontSize: 10, color: "var(--blue)", marginTop: 2 }}>Opcional</div>}
                      </div>
                      <div className="doc-actions">
                        {docsSubidos[doc.id] ? (
                          <>
                            <button className="btn btn-ghost" style={{ fontSize: 11 }}>Ver</button>
                            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setDocsSubidos(d => ({ ...d, [doc.id]: false }))}>Actualizar</button>
                          </>
                        ) : (
                          <button className="btn btn-primary" style={{ fontSize: 11 }} onClick={() => setDocsSubidos(d => ({ ...d, [doc.id]: true }))}>
                            + Subir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* MODAL APLICAR */}
      {showApply && (
        <div className="modal-overlay" onClick={() => setShowApply(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Aplicar a licitación</h2>
            <p className="modal-sub">
              {LICITACIONES_MOCK.find(l => l.id === showApply)?.ph} — {LICITACIONES_MOCK.find(l => l.id === showApply)?.servicio}
            </p>
            <div className="modal-field">
              <label>Monto mensual propuesto (USD)</label>
              <input type="text" placeholder="Ej: $3,200/mes" />
            </div>
            <div className="modal-field">
              <label>Descripción de tu propuesta</label>
              <textarea placeholder="Describe brevemente tu servicio, metodología y por qué eres el mejor candidato..." />
            </div>
            <div className="modal-field">
              <label>Disponibilidad de inicio</label>
              <input type="text" placeholder="Ej: Inmediata / 1 de marzo" />
            </div>
            <div style={{ background: "rgba(74,158,255,0.05)", border: "1px solid rgba(74,158,255,0.15)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
              ✓ Tus documentos verificados se adjuntan automáticamente a esta propuesta.
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowApply(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => { alert("¡Propuesta enviada! El PH recibirá una notificación."); setShowApply(null); }}>Enviar propuesta →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}