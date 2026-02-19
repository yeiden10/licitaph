"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LICITACIONES = [
  { id: "LIC-001", servicio: "Seguridad 24/7", estado: "activa", publicada: "15 Feb 2026", cierre: "25 Feb 2026", propuestas: 4, presupuesto: "$3,000 - $4,500/mes", urgente: true },
  { id: "LIC-002", servicio: "Limpieza y mantenimiento", estado: "activa", publicada: "10 Feb 2026", cierre: "28 Feb 2026", propuestas: 2, presupuesto: "$1,800 - $2,500/mes", urgente: false },
  { id: "LIC-003", servicio: "Mantenimiento HVAC", estado: "borrador", publicada: "—", cierre: "—", propuestas: 0, presupuesto: "$2,200 - $3,000/mes", urgente: false },
  { id: "LIC-004", servicio: "Jardinería y áreas verdes", estado: "adjudicada", publicada: "1 Feb 2026", cierre: "15 Feb 2026", propuestas: 5, presupuesto: "$800 - $1,200/mes", urgente: false },
];

const PROPUESTAS = [
  { id: "P-001", lic: "LIC-001", empresa: "SecuroPanamá S.A.", monto: "$3,200/mes", puntaje: 92, experiencia: "8 años", documentos: true, recomendada: true, detalle: "Guardias certificados MINSEG, supervisión 24/7, cámaras incluidas. Respuesta a incidentes en <5 min." },
  { id: "P-002", lic: "LIC-001", empresa: "ProGuard Panama", monto: "$3,500/mes", puntaje: 84, experiencia: "5 años", documentos: true, recomendada: false, detalle: "Guardias certificados, rondas cada 2 horas, sistema de reporte digital." },
  { id: "P-003", lic: "LIC-001", empresa: "Vigilancia Total Corp", monto: "$2,950/mes", puntaje: 71, experiencia: "3 años", documentos: false, recomendada: false, detalle: "Precio competitivo, pero documentación de idoneidad MINSEG pendiente de renovación." },
  { id: "P-004", lic: "LIC-001", empresa: "SafeZone Internacional", monto: "$4,100/mes", puntaje: 68, experiencia: "12 años", documentos: true, recomendada: false, detalle: "Mucha experiencia pero precio elevado vs. mercado. No justifica premium dado el alcance del contrato." },
  { id: "P-005", lic: "LIC-002", empresa: "CleanPro Panama", monto: "$2,100/mes", puntaje: 88, experiencia: "6 años", documentos: true, recomendada: true, detalle: "Equipo de 4 personas, productos eco-certificados, servicio diario 6am-2pm." },
  { id: "P-006", lic: "LIC-002", empresa: "Limpieza Express S.A.", monto: "$1,950/mes", puntaje: 76, experiencia: "4 años", documentos: true, recomendada: false, detalle: "Precio bajo pero solo 3 personas en equipo. Puede afectar calidad en áreas comunes grandes." },
];

const CONTRATOS = [
  { id: "C-001", empresa: "CleanPro Panama", servicio: "Limpieza y mantenimiento", monto: "$2,100/mes", inicio: "1 Mar 2026", fin: "28 Feb 2027", estado: "activo", diasRestantes: 375 },
  { id: "C-002", empresa: "GreenScape Panamá", servicio: "Jardinería y áreas verdes", monto: "$950/mes", inicio: "1 Ene 2026", fin: "31 Dic 2026", estado: "activo", diasRestantes: 316 },
  { id: "C-003", empresa: "TechElevators S.A.", servicio: "Mantenimiento ascensores", monto: "$1,200/mes", inicio: "1 Feb 2025", fin: "31 Ene 2026", estado: "vencido", diasRestantes: -18 },
];

const SERVICIOS_IA = ["Seguridad 24/7", "Limpieza y mantenimiento", "Mantenimiento HVAC", "Jardinería y áreas verdes", "Control de plagas", "Mantenimiento ascensores", "Pintura y reparaciones", "Electricidad y plomería"];

type Tab = "dashboard" | "licitaciones" | "propuestas" | "contratos" | "reporte" | "nueva";

export default function PHDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [licSeleccionada, setLicSeleccionada] = useState("LIC-001");
  const [showAdjudicar, setShowAdjudicar] = useState<string | null>(null);
  const [adjudicada, setAdjudicada] = useState<string | null>(null);
  const [nuevaLic, setNuevaLic] = useState({ servicio: "", presupuesto: "", cierre: "", descripcion: "", requisitos: [] as string[] });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
  }, []);

  const nombrePH = user?.user_metadata?.nombre_completo || "PH Torre Pacífica";
  const propuestasLic = PROPUESTAS.filter(p => p.lic === licSeleccionada).sort((a, b) => b.puntaje - a.puntaje);

  if (loading) return <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", fontFamily: "Inter, sans-serif" }}>Cargando...</div>;

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "Inter, sans-serif" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0F4FF" }}>Acceso restringido</div>
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
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .layout { display:flex; min-height:100vh; }

        /* SIDEBAR */
        .sidebar { width:240px; background:var(--bg2); border-right:1px solid var(--border); display:flex; flex-direction:column; position:fixed; top:0; bottom:0; left:0; z-index:100; }
        .sb-logo { padding:20px 20px 14px; border-bottom:1px solid var(--border); }
        .sb-logo-text { font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:800; }
        .sb-logo-gold { color:var(--gold); }
        .sb-logo-white { color:var(--text); }
        .sb-badge { font-size:8px; background:var(--gold); color:var(--bg); padding:2px 5px; border-radius:3px; font-family:'DM Mono',monospace; letter-spacing:1px; vertical-align:middle; margin-left:4px; }
        .sb-sub { font-size:10px; color:var(--text3); margin-top:3px; }
        .sb-user { padding:14px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px; }
        .sb-avatar { width:32px; height:32px; border-radius:50%; background:rgba(201,168,76,0.15); border:1px solid rgba(201,168,76,0.3); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:var(--gold); font-family:'Plus Jakarta Sans',sans-serif; flex-shrink:0; }
        .sb-name { font-size:12px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sb-role { font-size:10px; color:var(--text3); margin-top:1px; }
        .sb-nav { flex:1; padding:12px 10px; display:flex; flex-direction:column; gap:2px; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s; color:var(--text2); border:none; background:none; width:100%; text-align:left; font-family:'Inter',sans-serif; }
        .nav-item:hover { color:var(--text); background:rgba(255,255,255,0.04); }
        .nav-item.active { color:var(--gold); background:rgba(201,168,76,0.08); }
        .nav-icon { font-size:15px; width:20px; text-align:center; }
        .nav-pill { margin-left:auto; background:var(--gold); color:var(--bg); font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px; font-family:'DM Mono',monospace; }
        .nav-pill-red { background:var(--red); }
        .sb-bottom { padding:12px 10px; border-top:1px solid var(--border); }

        /* MAIN */
        .main { margin-left:240px; flex:1; padding:32px; min-height:100vh; }
        .ph-header { margin-bottom:28px; animation:fadeUp 0.4s ease both; }
        .ph-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:22px; font-weight:800; letter-spacing:-0.4px; margin-bottom:4px; }
        .ph-sub { font-size:13px; color:var(--text2); }

        /* CARDS */
        .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; animation:fadeUp 0.4s ease 0.05s both; }
        .card { background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:20px; }
        .card-label { font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
        .card-val { font-family:'Plus Jakarta Sans',sans-serif; font-size:28px; font-weight:800; line-height:1; margin-bottom:4px; }
        .card-sub { font-size:12px; color:var(--text2); }

        /* SECTION */
        .sec { background:var(--bg2); border:1px solid var(--border); border-radius:14px; overflow:hidden; margin-bottom:18px; animation:fadeUp 0.4s ease 0.1s both; }
        .sec-head { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .sec-title { font-size:14px; font-weight:600; color:var(--text); }
        .sec-sub { font-size:12px; color:var(--text3); margin-top:2px; }

        /* TABLE */
        .tbl { width:100%; border-collapse:collapse; }
        .tbl th { padding:10px 16px; text-align:left; font-size:10px; font-weight:600; color:var(--text3); text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--border); }
        .tbl td { padding:13px 16px; font-size:13px; color:var(--text2); border-bottom:1px solid var(--border); vertical-align:middle; }
        .tbl tr:last-child td { border-bottom:none; }
        .tbl tr:hover td { background:rgba(255,255,255,0.015); }
        .td-main { color:var(--text) !important; font-weight:500; }
        .td-mono { font-family:'DM Mono',monospace; font-size:12px !important; }

        /* BADGES */
        .badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:5px; font-size:11px; font-weight:600; }
        .b-green { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.2); }
        .b-gold { background:rgba(201,168,76,0.1); color:var(--gold); border:1px solid rgba(201,168,76,0.2); }
        .b-blue { background:rgba(74,158,255,0.1); color:var(--blue); border:1px solid rgba(74,158,255,0.2); }
        .b-yellow { background:rgba(245,158,11,0.1); color:#F59E0B; border:1px solid rgba(245,158,11,0.2); }
        .b-red { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }
        .b-gray { background:rgba(255,255,255,0.05); color:var(--text3); border:1px solid var(--border); }
        .b-urgent { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); font-size:9px; padding:2px 6px; margin-left:6px; }

        /* BUTTONS */
        .btn { padding:7px 14px; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; border:none; display:inline-flex; align-items:center; gap:5px; }
        .btn-gold { background:var(--gold); color:#07090F; }
        .btn-gold:hover { background:var(--gold2); transform:translateY(-1px); }
        .btn-blue { background:var(--blue); color:#07090F; }
        .btn-blue:hover { background:#6DB3FF; }
        .btn-green { background:var(--green); color:#07090F; }
        .btn-green:hover { background:#6FEBB8; }
        .btn-ghost { background:transparent; border:1px solid var(--border2); color:var(--text2); }
        .btn-ghost:hover { color:var(--text); border-color:rgba(255,255,255,0.2); }
        .btn-red { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }

        /* SCORE */
        .score { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; font-family:'DM Mono',monospace; font-size:13px; font-weight:700; }
        .s-high { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.25); }
        .s-mid { background:rgba(245,158,11,0.1); color:#F59E0B; border:1px solid rgba(245,158,11,0.25); }
        .s-low { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.25); }

        /* PROPUESTAS COMPARACION */
        .prop-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:14px; padding:20px; }
        .prop-card { background:var(--bg3); border:1px solid var(--border); border-radius:12px; padding:18px; position:relative; transition:all 0.2s; }
        .prop-card:hover { border-color:var(--border2); transform:translateY(-2px); }
        .prop-card.recomendada { border-color:rgba(201,168,76,0.35); background:rgba(201,168,76,0.03); }
        .prop-card.recomendada::before { content:'⭐ IA RECOMIENDA'; position:absolute; top:-1px; left:50%; transform:translateX(-50%); background:var(--gold); color:var(--bg); font-size:9px; font-weight:700; padding:3px 10px; border-radius:0 0 6px 6px; letter-spacing:1px; font-family:'DM Mono',monospace; white-space:nowrap; }
        .prop-empresa { font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:700; margin-bottom:4px; margin-top:8px; }
        .prop-monto { font-family:'DM Mono',monospace; font-size:18px; font-weight:700; color:var(--gold); margin-bottom:12px; }
        .prop-row { display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px; }
        .prop-row-label { color:var(--text3); }
        .prop-row-val { color:var(--text); font-weight:500; }
        .prop-detalle { font-size:12px; color:var(--text2); line-height:1.65; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }
        .prop-actions { display:flex; gap:6px; margin-top:14px; }

        /* LIC SELECTOR */
        .lic-tabs { display:flex; gap:6px; padding:14px 20px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
        .lic-tab { padding:6px 14px; border-radius:7px; font-size:12px; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; border:1px solid var(--border); background:transparent; color:var(--text2); display:flex; align-items:center; gap:6px; }
        .lic-tab:hover { color:var(--text); border-color:var(--border2); }
        .lic-tab.active { background:rgba(201,168,76,0.1); border-color:rgba(201,168,76,0.3); color:var(--gold); }
        .lic-tab-count { background:rgba(255,255,255,0.1); color:var(--text2); font-size:10px; padding:1px 5px; border-radius:4px; font-family:'DM Mono',monospace; }

        /* NUEVA LIC FORM */
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:20px; }
        .field { margin-bottom:0; }
        .field label { display:block; font-size:11px; font-weight:600; color:var(--text3); text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; }
        .field input, .field select, .field textarea { width:100%; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:9px; padding:10px 13px; font-size:13px; color:var(--text); font-family:'Inter',sans-serif; outline:none; transition:all 0.15s; }
        .field input:focus, .field select:focus, .field textarea:focus { border-color:var(--gold); background:rgba(201,168,76,0.03); }
        .field textarea { resize:vertical; min-height:80px; }
        .field select option { background:var(--bg2); }
        .field-full { grid-column:1/-1; }
        .req-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
        .req-chip { padding:4px 10px; border-radius:5px; font-size:11px; font-weight:500; cursor:pointer; transition:all 0.15s; border:1px solid var(--border); background:transparent; color:var(--text2); font-family:'Inter',sans-serif; }
        .req-chip.on { background:rgba(201,168,76,0.1); border-color:rgba(201,168,76,0.3); color:var(--gold); }

        /* REPORTE */
        .reporte-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; padding:20px; }
        .rep-stat { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:16px; text-align:center; }
        .rep-val { font-family:'Plus Jakarta Sans',sans-serif; font-size:26px; font-weight:800; line-height:1; margin-bottom:4px; }
        .rep-label { font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; }
        .reporte-section { padding:0 20px 20px; }
        .rep-row { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border); font-size:13px; }
        .rep-row:last-child { border-bottom:none; }

        /* CONTRATOS ALERTA */
        .cont-alert { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); border-radius:10px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; gap:14px; font-size:13px; }

        /* MODAL */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:300; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
        .modal { background:var(--bg2); border:1px solid var(--border2); border-radius:18px; padding:28px; width:500px; max-width:90vw; position:relative; }
        .modal::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gold),transparent); border-radius:18px 18px 0 0; }
        .modal-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:700; margin-bottom:6px; }
        .modal-sub { font-size:13px; color:var(--text2); margin-bottom:20px; line-height:1.6; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }

        @media (max-width:1024px) { .cards { grid-template-columns:repeat(2,1fr); } }
        @media (max-width:768px) { .sidebar { display:none; } .main { margin-left:0; padding:16px; } .form-grid { grid-template-columns:1fr; } }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-text">
              <span className="sb-logo-gold">Licita</span>
              <span className="sb-logo-white">PH</span>
              <span className="sb-badge">BETA</span>
            </div>
            <div className="sb-sub">Panel de administrador</div>
          </div>
          <div className="sb-user">
            <div className="sb-avatar">{nombrePH[0]?.toUpperCase()}</div>
            <div>
              <div className="sb-name">{nombrePH}</div>
              <div className="sb-role">Administrador de PH</div>
            </div>
          </div>
          <nav className="sb-nav">
            {[
              { key: "dashboard", icon: "⚡", label: "Dashboard" },
              { key: "nueva", icon: "➕", label: "Nueva licitación" },
              { key: "licitaciones", icon: "📋", label: "Mis licitaciones", pill: LICITACIONES.filter(l => l.estado === "activa").length },
              { key: "propuestas", icon: "📥", label: "Propuestas", pill: PROPUESTAS.filter(p => p.lic === "LIC-001" || p.lic === "LIC-002").length },
              { key: "contratos", icon: "📄", label: "Contratos", pill: CONTRATOS.filter(c => c.estado === "vencido").length > 0 ? "!" : null, pillRed: true },
              { key: "reporte", icon: "📊", label: "Reporte copropietarios" },
            ].map(item => (
              <button key={item.key} className={`nav-item ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key as Tab)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.pill !== null && item.pill !== undefined && (
                  <span className={`nav-pill ${item.pillRed ? "nav-pill-red" : ""}`}>{item.pill}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sb-bottom">
            <button className="nav-item" onClick={() => { supabase.auth.signOut(); window.location.href = "/"; }}>
              <span className="nav-icon">↩️</span> Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="main">

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Bienvenido, {nombrePH} 👋</h1>
                <p className="ph-sub">Resumen de la gestión de contrataciones de tu PH</p>
              </div>

              {CONTRATOS.some(c => c.estado === "vencido") && (
                <div className="cont-alert">
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "var(--red)" }}>Contrato vencido — acción requerida</strong>
                    <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 2 }}>
                      El contrato de mantenimiento de ascensores con TechElevators S.A. venció hace 18 días.
                    </div>
                  </div>
                  <button className="btn btn-red" onClick={() => setTab("contratos")}>Ver contrato</button>
                </div>
              )}

              <div className="cards">
                {[
                  { label: "Licitaciones activas", val: LICITACIONES.filter(l => l.estado === "activa").length, sub: "Recibiendo propuestas", color: "var(--gold)" },
                  { label: "Propuestas recibidas", val: PROPUESTAS.length, sub: "En 2 licitaciones abiertas", color: "var(--blue)" },
                  { label: "Contratos activos", val: CONTRATOS.filter(c => c.estado === "activo").length, sub: "En ejecución actualmente", color: "var(--green)" },
                  { label: "Ahorro acumulado", val: "$8,760", sub: "vs. precios de mercado este año", color: "#A78BFA" },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-val" style={{ color: c.color }}>{c.val}</div>
                    <div className="card-sub">{c.sub}</div>
                  </div>
                ))}
              </div>

              <div className="sec">
                <div className="sec-head">
                  <div>
                    <div className="sec-title">Licitaciones activas</div>
                    <div className="sec-sub">Propuestas siendo recibidas ahora mismo</div>
                  </div>
                  <button className="btn btn-gold" onClick={() => setTab("nueva")}>+ Nueva licitación</button>
                </div>
                <table className="tbl">
                  <thead><tr><th>Servicio</th><th>Presupuesto</th><th>Cierre</th><th>Propuestas</th><th>Acción</th></tr></thead>
                  <tbody>
                    {LICITACIONES.filter(l => l.estado === "activa").map(l => (
                      <tr key={l.id}>
                        <td className="td-main">{l.servicio}{l.urgente && <span className="badge b-urgent">URGENTE</span>}</td>
                        <td className="td-mono">{l.presupuesto}</td>
                        <td style={{ color: l.urgente ? "var(--red)" : "var(--text2)" }}>{l.cierre}</td>
                        <td><span className="badge b-blue">{l.propuestas} recibidas</span></td>
                        <td>
                          <button className="btn btn-gold" onClick={() => { setLicSeleccionada(l.id); setTab("propuestas"); }}>
                            Ver propuestas →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sec">
                <div className="sec-head">
                  <div className="sec-title">Contratos próximos a vencer</div>
                </div>
                <table className="tbl">
                  <thead><tr><th>Empresa</th><th>Servicio</th><th>Monto</th><th>Vence</th><th>Estado</th></tr></thead>
                  <tbody>
                    {CONTRATOS.map(c => (
                      <tr key={c.id}>
                        <td className="td-main">{c.empresa}</td>
                        <td>{c.servicio}</td>
                        <td className="td-mono">{c.monto}</td>
                        <td>{c.fin}</td>
                        <td>
                          {c.estado === "activo" && c.diasRestantes < 90 ? <span className="badge b-yellow">Vence pronto</span> : null}
                          {c.estado === "activo" && c.diasRestantes >= 90 ? <span className="badge b-green">● Activo</span> : null}
                          {c.estado === "vencido" ? <span className="badge b-red">⚠ Vencido</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── NUEVA LICITACIÓN ── */}
          {tab === "nueva" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Nueva licitación</h1>
                <p className="ph-sub">La IA sugerirá los requisitos según el tipo de servicio</p>
              </div>
              <div className="sec">
                <div className="sec-head">
                  <div className="sec-title">Detalles de la licitación</div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>Tipo de servicio *</label>
                    <select value={nuevaLic.servicio} onChange={e => setNuevaLic(n => ({ ...n, servicio: e.target.value }))}>
                      <option value="">Seleccionar servicio...</option>
                      {SERVICIOS_IA.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Presupuesto estimado (USD/mes)</label>
                    <input type="text" placeholder="Ej: $2,000 - $3,500" value={nuevaLic.presupuesto} onChange={e => setNuevaLic(n => ({ ...n, presupuesto: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label>Fecha de cierre *</label>
                    <input type="date" value={nuevaLic.cierre} onChange={e => setNuevaLic(n => ({ ...n, cierre: e.target.value }))} />
                  </div>
                  <div className="field field-full">
                    <label>Descripción del servicio requerido</label>
                    <textarea placeholder="Describe en detalle qué necesitas — número de personas, horarios, áreas específicas, equipos requeridos..." value={nuevaLic.descripcion} onChange={e => setNuevaLic(n => ({ ...n, descripcion: e.target.value }))} />
                  </div>
                  {nuevaLic.servicio && (
                    <div className="field field-full">
                      <label>⚡ Requisitos sugeridos por IA para {nuevaLic.servicio}</label>
                      <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 10 }}>Selecciona los que aplicarán a esta licitación:</div>
                      <div className="req-chips">
                        {[
                          "Paz y Salvo CSS", "Paz y Salvo DGI", "Registro Público",
                          ...(nuevaLic.servicio.includes("Seguridad") ? ["Licencia MINSEG", "Certificación guardias", "Protocolo de emergencias", "Seguro de responsabilidad civil"] : []),
                          ...(nuevaLic.servicio.includes("Limpieza") ? ["Certificación MINSA", "Fichas técnicas productos", "Protocolo de bioseguridad"] : []),
                          ...(nuevaLic.servicio.includes("HVAC") ? ["Certificación técnica HVAC", "Licencia ACODECO", "Garantía de equipos"] : []),
                          ...(nuevaLic.servicio.includes("Jardinería") ? ["Certificación fitosanitaria", "Lista de productos usados", "Seguro de accidentes"] : []),
                          "Referencias de otros PHs", "Estados financieros", "KYC completado",
                        ].map(r => (
                          <button key={r} className={`req-chip ${nuevaLic.requisitos.includes(r) ? "on" : ""}`}
                            onClick={() => setNuevaLic(n => ({
                              ...n,
                              requisitos: n.requisitos.includes(r) ? n.requisitos.filter(x => x !== r) : [...n.requisitos, r]
                            }))}>
                            {nuevaLic.requisitos.includes(r) ? "✓ " : ""}{r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="field-full" style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "4px 0" }}>
                    <button className="btn btn-ghost" onClick={() => setTab("licitaciones")}>Cancelar</button>
                    <button className="btn btn-ghost">Guardar borrador</button>
                    <button className="btn btn-gold" onClick={() => { alert("¡Licitación publicada! Las empresas verificadas ya pueden ver y aplicar."); setTab("licitaciones"); }}>
                      🚀 Publicar licitación
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── LICITACIONES ── */}
          {tab === "licitaciones" && (
            <>
              <div className="ph-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h1 className="ph-title">Mis licitaciones</h1>
                  <p className="ph-sub">Historial completo de licitaciones de tu PH</p>
                </div>
                <button className="btn btn-gold" onClick={() => setTab("nueva")}>+ Nueva licitación</button>
              </div>
              <div className="sec">
                <table className="tbl">
                  <thead><tr><th>ID</th><th>Servicio</th><th>Estado</th><th>Publicada</th><th>Cierre</th><th>Propuestas</th><th>Acción</th></tr></thead>
                  <tbody>
                    {LICITACIONES.map(l => (
                      <tr key={l.id}>
                        <td className="td-mono" style={{ color: "var(--text3)" }}>{l.id}</td>
                        <td className="td-main">{l.servicio}</td>
                        <td>
                          {l.estado === "activa" && <span className="badge b-green">● Activa</span>}
                          {l.estado === "borrador" && <span className="badge b-gray">Borrador</span>}
                          {l.estado === "adjudicada" && <span className="badge b-gold">✓ Adjudicada</span>}
                        </td>
                        <td>{l.publicada}</td>
                        <td>{l.cierre}</td>
                        <td><span className="badge b-blue">{l.propuestas}</span></td>
                        <td style={{ display: "flex", gap: 6 }}>
                          {l.estado === "activa" && (
                            <button className="btn btn-gold" onClick={() => { setLicSeleccionada(l.id); setTab("propuestas"); }}>
                              Ver propuestas
                            </button>
                          )}
                          {l.estado === "borrador" && <button className="btn btn-ghost">Editar</button>}
                          {l.estado === "adjudicada" && <span className="badge b-gold">✓ Completada</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── PROPUESTAS / RANKING IA ── */}
          {tab === "propuestas" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Ranking de propuestas</h1>
                <p className="ph-sub">Evaluación objetiva de la IA — ordenadas de mayor a menor puntaje</p>
              </div>

              <div className="sec">
                <div className="lic-tabs">
                  {LICITACIONES.filter(l => l.propuestas > 0).map(l => (
                    <button key={l.id} className={`lic-tab ${licSeleccionada === l.id ? "active" : ""}`} onClick={() => setLicSeleccionada(l.id)}>
                      {l.servicio}
                      <span className="lic-tab-count">{l.propuestas}</span>
                    </button>
                  ))}
                </div>

                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "rgba(201,168,76,0.03)" }}>
                  <div style={{ fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🤖</span>
                    <span>La IA evalúa: <strong style={{ color: "var(--text)" }}>precio (40%)</strong> · <strong style={{ color: "var(--text)" }}>documentación (30%)</strong> · <strong style={{ color: "var(--text)" }}>experiencia (20%)</strong> · <strong style={{ color: "var(--text)" }}>tiempo respuesta (10%)</strong></span>
                  </div>
                </div>

                <div className="prop-grid">
                  {propuestasLic.map((p, i) => (
                    <div key={p.id} className={`prop-card ${p.recomendada ? "recomendada" : ""}`}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div className={`score ${p.puntaje >= 85 ? "s-high" : p.puntaje >= 70 ? "s-mid" : "s-low"}`}>{p.puntaje}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>#{i + 1} en ranking</div>
                      </div>
                      <div className="prop-empresa">{p.empresa}</div>
                      <div className="prop-monto">{p.monto}</div>
                      <div className="prop-row"><span className="prop-row-label">Experiencia</span><span className="prop-row-val">{p.experiencia}</span></div>
                      <div className="prop-row">
                        <span className="prop-row-label">Documentos</span>
                        <span className={`badge ${p.documentos ? "b-green" : "b-red"}`} style={{ fontSize: 10, padding: "2px 6px" }}>
                          {p.documentos ? "✓ Completos" : "⚠ Pendientes"}
                        </span>
                      </div>
                      <div className="prop-detalle">{p.detalle}</div>
                      <div className="prop-actions">
                        {!adjudicada ? (
                          <>
                            <button className={`btn ${p.recomendada ? "btn-gold" : "btn-ghost"}`} onClick={() => setShowAdjudicar(p.id)}>
                              {p.recomendada ? "⭐ Adjudicar" : "Adjudicar"}
                            </button>
                            <button className="btn btn-ghost">Ver detalles</button>
                          </>
                        ) : adjudicada === p.id ? (
                          <span className="badge b-green">✓ Adjudicada</span>
                        ) : (
                          <span className="badge b-gray">No seleccionada</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CONTRATOS ── */}
          {tab === "contratos" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Contratos activos</h1>
                <p className="ph-sub">Gestión y seguimiento de todos los contratos de tu PH</p>
              </div>

              {CONTRATOS.filter(c => c.estado === "vencido").map(c => (
                <div key={c.id} className="cont-alert">
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "var(--red)" }}>Contrato vencido hace {Math.abs(c.diasRestantes)} días</strong>
                    <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 2 }}>{c.empresa} — {c.servicio}. Debes renovar o publicar una nueva licitación inmediatamente.</div>
                  </div>
                  <button className="btn btn-gold" onClick={() => setTab("nueva")}>+ Nueva licitación</button>
                </div>
              ))}

              <div className="cards" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { label: "Contratos activos", val: CONTRATOS.filter(c => c.estado === "activo").length, color: "var(--green)" },
                  { label: "Valor mensual total", val: "$3,050", color: "var(--gold)" },
                  { label: "Vencen en 90 días", val: CONTRATOS.filter(c => c.estado === "activo" && c.diasRestantes < 90).length, color: "#F59E0B" },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-val" style={{ color: c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>

              <div className="sec">
                <table className="tbl">
                  <thead><tr><th>Empresa</th><th>Servicio</th><th>Monto/mes</th><th>Inicio</th><th>Vence</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>
                    {CONTRATOS.map(c => (
                      <tr key={c.id}>
                        <td className="td-main">{c.empresa}</td>
                        <td>{c.servicio}</td>
                        <td className="td-mono">{c.monto}</td>
                        <td>{c.inicio}</td>
                        <td style={{ color: c.estado === "vencido" ? "var(--red)" : "inherit" }}>{c.fin}</td>
                        <td>
                          {c.estado === "activo" && c.diasRestantes < 90 ? <span className="badge b-yellow">Vence en {c.diasRestantes}d</span> : null}
                          {c.estado === "activo" && c.diasRestantes >= 90 ? <span className="badge b-green">● Activo</span> : null}
                          {c.estado === "vencido" ? <span className="badge b-red">⚠ Vencido</span> : null}
                        </td>
                        <td>
                          {c.estado === "vencido" ? (
                            <button className="btn btn-gold" onClick={() => setTab("nueva")}>Renovar →</button>
                          ) : (
                            <button className="btn btn-ghost">Ver contrato</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── REPORTE COPROPIETARIOS ── */}
          {tab === "reporte" && (
            <>
              <div className="ph-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h1 className="ph-title">Reporte para copropietarios</h1>
                  <p className="ph-sub">Resumen de contrataciones y ahorros — listo para asamblea</p>
                </div>
                <button className="btn btn-gold" onClick={() => alert("Descargando reporte PDF...")}>⬇ Descargar PDF</button>
              </div>

              <div className="sec">
                <div className="sec-head"><div className="sec-title">Resumen ejecutivo — Febrero 2026</div></div>
                <div className="reporte-grid">
                  {[
                    { val: "3", label: "Licitaciones publicadas", color: "var(--gold)" },
                    { val: "11", label: "Propuestas recibidas", color: "var(--blue)" },
                    { val: "$8,760", label: "Ahorro documentado vs. mercado", color: "var(--green)" },
                    { val: "2", label: "Contratos adjudicados", color: "var(--gold)" },
                    { val: "100%", label: "Empresas verificadas contratadas", color: "var(--green)" },
                    { val: "0", label: "Contrataciones sin licitación", color: "#A78BFA" },
                  ].map(s => (
                    <div className="rep-stat" key={s.label}>
                      <div className="rep-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="rep-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sec">
                <div className="sec-head"><div className="sec-title">Detalle de contrataciones</div></div>
                <div className="reporte-section">
                  {[
                    { servicio: "Limpieza y mantenimiento", empresa: "CleanPro Panama", monto: "$2,100/mes", cotizaciones: 2, ahorro: "$400/mes vs. oferta más alta", metodo: "Licitación LIC-002" },
                    { servicio: "Jardinería y áreas verdes", empresa: "GreenScape Panamá", monto: "$950/mes", cotizaciones: 5, ahorro: "$250/mes vs. contrato anterior", metodo: "Licitación LIC-004" },
                  ].map(r => (
                    <div key={r.servicio} style={{ padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 3 }}>{r.servicio}</div>
                          <div style={{ fontSize: 13, color: "var(--text2)" }}>Adjudicado a: <strong style={{ color: "var(--text)" }}>{r.empresa}</strong></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>{r.monto}</div>
                          <div style={{ fontSize: 11, color: "var(--green)", marginTop: 3 }}>▼ {r.ahorro}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text3)" }}>
                        <span>📋 {r.cotizaciones} propuestas recibidas</span>
                        <span>✓ Proceso: {r.metodo}</span>
                        <span>✓ Documentos verificados</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
                ✅ <strong style={{ color: "var(--text)" }}>Certificación de transparencia LicitaPH:</strong> Todas las contrataciones de este período fueron realizadas mediante proceso competitivo documentado. Los expedientes completos están disponibles para consulta de cualquier copropietario en la plataforma.
              </div>
            </>
          )}

        </main>
      </div>

      {/* MODAL ADJUDICAR */}
      {showAdjudicar && (
        <div className="modal-bg" onClick={() => setShowAdjudicar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Confirmar adjudicación</h2>
            <p className="modal-sub">
              Vas a adjudicar esta licitación a <strong style={{ color: "var(--text)" }}>{PROPUESTAS.find(p => p.id === showAdjudicar)?.empresa}</strong> por <strong style={{ color: "var(--gold)" }}>{PROPUESTAS.find(p => p.id === showAdjudicar)?.monto}</strong>.
              <br /><br />
              Esta acción notificará al ganador y a las demás empresas. El expediente quedará registrado y disponible para los copropietarios.
            </p>
            <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--text2)" }}>
              📄 Se generará automáticamente el borrador de contrato para firma.
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAdjudicar(null)}>Cancelar</button>
              <button className="btn btn-gold" onClick={() => { setAdjudicada(showAdjudicar); setShowAdjudicar(null); alert("✅ ¡Adjudicación confirmada! El contrato está siendo generado."); }}>
                ✓ Confirmar adjudicación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}