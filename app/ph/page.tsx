"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Licitacion, Propuesta, Contrato, PropiedadHorizontal } from "@/lib/supabase/types";

type Tab = "dashboard" | "licitaciones" | "propuestas" | "contratos" | "reporte";

// Default fecha_inicio: 7 days from today
function defaultFechaInicio() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

interface CondicionesContrato {
  fecha_inicio: string;
  modalidad_pago: string;
  detalle_pago: string;
  penalidad_porcentaje: number;
  condiciones_especiales: string;
  notas: string;
}

interface ModalEditarState {
  fechas: string[];
  fechaInput: string;
  lugar: string;
  condiciones: string;
}

export default function PHDashboard() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [ph, setPH] = useState<PropiedadHorizontal | null>(null);
  const [loading, setLoading] = useState(true);
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [licSeleccionada, setLicSeleccionada] = useState<string>("");
  const [showAdjudicar, setShowAdjudicar] = useState<string | null>(null);
  const [adjudicando, setAdjudicando] = useState(false);
  const [notif, setNotif] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  // Condiciones contrato state
  const [condicionesContrato, setCondicionesContrato] = useState<CondicionesContrato>({
    fecha_inicio: defaultFechaInicio(),
    modalidad_pago: "mensual",
    detalle_pago: "",
    penalidad_porcentaje: 10,
    condiciones_especiales: "",
    notas: "",
  });

  // Modal editar licitacion
  const [editandoLic, setEditandoLic] = useState<string | null>(null);
  const [modalEditar, setModalEditar] = useState<ModalEditarState>({
    fechas: [],
    fechaInput: "",
    lugar: "",
    condiciones: "",
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // ── Review state ───────────────────────────────────────────
  const [showReview, setShowReview] = useState<string | null>(null); // contrato_id
  const [reviewPuntaje, setReviewPuntaje] = useState(5);
  const [reviewComentario, setReviewComentario] = useState("");
  const [enviandoReview, setEnviandoReview] = useState(false);
  const [reviewsEnviadas, setReviewsEnviadas] = useState<Set<string>>(new Set());

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUser(user);

      // Cargar PH del admin — si no existe, créalo automáticamente
      let { data: ph } = await supabase
        .from("propiedades_horizontales")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (!ph) {
        const nombre = user.user_metadata?.nombre_completo || user.email?.split("@")[0] || "Mi PH";
        const { data: nuevo, error: insertErr } = await supabase
          .from("propiedades_horizontales")
          .insert({
            admin_id: user.id,
            nombre,
            ruc: "00-000-000",
            direccion: "",
            ciudad: "Ciudad de Panamá",
            provincia: "Panamá",
            telefono: "",
            email_contacto: user.email,
            total_unidades: 0,
            activo: true,
          })
          .select()
          .single();
        if (insertErr) console.error("Error creando PH:", insertErr.message);
        ph = nuevo;
      }
      setPH(ph);

      if (ph) {
        await Promise.all([
          cargarLicitaciones(ph.id),
          cargarContratos(ph.id),
        ]);
      }
      setLoading(false);
    })();
  }, []);

  const cargarLicitaciones = useCallback(async (ph_id: string) => {
    const { data } = await supabase
      .from("licitaciones")
      .select("*")
      .eq("ph_id", ph_id)
      .order("creado_en", { ascending: false });
    setLicitaciones(data || []);
    return data;
  }, []);

  const cargarPropuestas = useCallback(async (licitacion_id: string) => {
    const { data } = await supabase
      .from("propuestas")
      .select("*, empresas(id, nombre, anios_experiencia, categorias)")
      .eq("licitacion_id", licitacion_id)
      .neq("estado", "borrador")
      .order("puntaje_ia", { ascending: false });
    setPropuestas(data || []);
  }, []);

  const cargarContratos = useCallback(async (ph_id: string) => {
    const { data } = await supabase
      .from("contratos")
      .select("*, empresas(nombre), licitaciones(titulo, categoria)")
      .eq("ph_id", ph_id)
      .order("creado_en", { ascending: false });
    setContratos(data || []);
  }, []);

  useEffect(() => {
    if (licSeleccionada) cargarPropuestas(licSeleccionada);
  }, [licSeleccionada]);

  // Reset condiciones when opening modal
  const abrirModalAdjudicar = (propuestaId: string) => {
    setCondicionesContrato({
      fecha_inicio: defaultFechaInicio(),
      modalidad_pago: "mensual",
      detalle_pago: "",
      penalidad_porcentaje: 10,
      condiciones_especiales: "",
      notas: "",
    });
    setShowAdjudicar(propuestaId);
  };

  // ── Adjudicar ─────────────────────────────────────────────
  const adjudicar = async (propuesta_id: string, licitacion_id: string) => {
    setAdjudicando(true);
    try {
      const res = await fetch(`/api/licitaciones/${licitacion_id}/adjudicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propuesta_id,
          condiciones_contrato: condicionesContrato,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setNotif({ msg: "✅ ¡Adjudicación confirmada! El contrato está activo.", tipo: "ok" });
      setShowAdjudicar(null);

      // Recargar datos
      if (ph) {
        await Promise.all([cargarLicitaciones(ph.id), cargarContratos(ph.id)]);
        await cargarPropuestas(licitacion_id);
      }
    } catch (e: any) {
      setNotif({ msg: "❌ Error: " + e.message, tipo: "err" });
    } finally {
      setAdjudicando(false);
    }
  };

  // ── Publicar licitación ───────────────────────────────────
  const publicarLicitacion = async (id: string) => {
    const res = await fetch(`/api/licitaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicar: true }),
    });
    if (res.ok && ph) {
      await cargarLicitaciones(ph.id);
      setNotif({ msg: "✅ ¡Licitación publicada! Las empresas ya pueden aplicar.", tipo: "ok" });
    }
  };

  // ── Editar licitación activa ───────────────────────────────
  const abrirModalEditar = (l: Licitacion) => {
    setModalEditar({
      fechas: (l as any).fechas_inspeccion || [],
      fechaInput: "",
      lugar: (l as any).lugar_inspeccion || "",
      condiciones: (l as any).condiciones_especiales || "",
    });
    setEditandoLic(l.id);
  };

  const guardarEdicion = async () => {
    if (!editandoLic) return;
    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/licitaciones/${editandoLic}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechas_inspeccion: modalEditar.fechas,
          lugar_inspeccion: modalEditar.lugar,
          condiciones_especiales: modalEditar.condiciones,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setNotif({ msg: "✅ Licitación actualizada correctamente.", tipo: "ok" });
      setEditandoLic(null);
      if (ph) await cargarLicitaciones(ph.id);
    } catch (e: any) {
      setNotif({ msg: "❌ Error: " + e.message, tipo: "err" });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const agregarFechaInspeccion = () => {
    const f = modalEditar.fechaInput.trim();
    if (!f || modalEditar.fechas.includes(f)) return;
    setModalEditar(prev => ({ ...prev, fechas: [...prev.fechas, f], fechaInput: "" }));
  };

  const quitarFechaInspeccion = (f: string) => {
    setModalEditar(prev => ({ ...prev, fechas: prev.fechas.filter(x => x !== f) }));
  };

  // ── Helpers ───────────────────────────────────────────────
  const licsActivas = licitaciones.filter(l => l.estado === "activa");
  const totalPropuestas = licitaciones.reduce((s, l) => s + ((l as any).propuestas?.[0]?.count || 0), 0);
  const contratosActivos = contratos.filter(c => c.estado === "activo");
  const licsConPropuestas = licitaciones.filter(l => l.estado === "activa" || l.estado === "en_evaluacion");

  const diasRestantes = (fecha_fin: string | null) => {
    if (!fecha_fin) return null;
    const diff = Math.round((new Date(fecha_fin).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const formatFecha = (f: string | null) => {
    if (!f) return "—";
    return new Date(f).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatMonto = (n: number | null) => {
    if (!n) return "—";
    return "$" + Number(n).toLocaleString("es-PA", { maximumFractionDigits: 0 }) + "/mes";
  };

  const nombrePH = ph?.nombre || user?.user_metadata?.nombre_completo || "Mi PH";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#07090F", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", fontFamily: "Inter, sans-serif", fontSize: 14 }}>
      Cargando...
    </div>
  );

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
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        :root {
          --bg:#07090F; --bg2:#0D1117; --bg3:#131920;
          --border:rgba(255,255,255,0.07); --border2:rgba(255,255,255,0.12);
          --text:#F0F4FF; --text2:#8896AA; --text3:#3D4A5C;
          --gold:#C9A84C; --gold2:#E8C96A; --blue:#4A9EFF; --green:#4ADE80; --red:#F87171;
        }
        body { background:var(--bg); color:var(--text); font-family:'Inter',sans-serif; -webkit-font-smoothing:antialiased; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

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
        .sb-nav { flex:1; padding:12px 10px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
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
        .b-urgent { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); font-size:9px; padding:2px 6px; margin-left:6px; letter-spacing:0.5px; }
        .b-orange { background:rgba(249,115,22,0.1); color:#F97316; border:1px solid rgba(249,115,22,0.2); }

        /* BUTTONS */
        .btn { padding:7px 14px; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; border:none; display:inline-flex; align-items:center; gap:5px; }
        .btn-gold { background:var(--gold); color:#07090F; }
        .btn-gold:hover { background:var(--gold2); transform:translateY(-1px); }
        .btn-blue { background:var(--blue); color:#07090F; }
        .btn-blue:hover { background:#6DB3FF; }
        .btn-green { background:var(--green); color:#07090F; }
        .btn-ghost { background:transparent; border:1px solid var(--border2); color:var(--text2); }
        .btn-ghost:hover { color:var(--text); border-color:rgba(255,255,255,0.2); }
        .btn-red { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.2); }

        /* SCORE */
        .score { display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; font-family:'DM Mono',monospace; font-size:13px; font-weight:700; }
        .s-high { background:rgba(74,222,128,0.1); color:var(--green); border:1px solid rgba(74,222,128,0.25); }
        .s-mid { background:rgba(245,158,11,0.1); color:#F59E0B; border:1px solid rgba(245,158,11,0.25); }
        .s-low { background:rgba(248,113,113,0.1); color:var(--red); border:1px solid rgba(248,113,113,0.25); }

        /* PROPUESTAS */
        .prop-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; padding:20px; }
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

        /* LIC TABS */
        .lic-tabs { display:flex; gap:6px; padding:14px 20px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
        .lic-tab { padding:6px 14px; border-radius:7px; font-size:12px; font-weight:500; cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s; border:1px solid var(--border); background:transparent; color:var(--text2); display:flex; align-items:center; gap:6px; }
        .lic-tab:hover { color:var(--text); border-color:var(--border2); }
        .lic-tab.active { background:rgba(201,168,76,0.1); border-color:rgba(201,168,76,0.3); color:var(--gold); }
        .lic-tab-count { background:rgba(255,255,255,0.08); color:var(--text2); font-size:10px; padding:1px 5px; border-radius:4px; font-family:'DM Mono',monospace; }

        /* ALERTA */
        .alert-banner { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); border-radius:10px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; gap:14px; font-size:13px; }

        /* MODAL */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:300; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:20px; }
        .modal { background:var(--bg2); border:1px solid var(--border2); border-radius:18px; padding:28px; width:560px; max-width:100%; position:relative; max-height:90vh; overflow-y:auto; }
        .modal::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--gold),transparent); border-radius:18px 18px 0 0; }
        .modal-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:700; margin-bottom:6px; }
        .modal-sub { font-size:13px; color:var(--text2); margin-bottom:20px; line-height:1.6; }
        .modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:20px; }

        /* FORM INPUTS */
        .form-label { font-size:12px; color:var(--text2); margin-bottom:5px; display:block; font-weight:500; }
        .form-input { width:100%; background:#111827; border:1px solid rgba(255,255,255,0.1); border-radius:7px; padding:9px 12px; color:var(--text); font-size:13px; font-family:'Inter',sans-serif; outline:none; }
        .form-input:focus { border-color:rgba(201,168,76,0.4); }
        .form-select { width:100%; background:#111827; border:1px solid rgba(255,255,255,0.1); border-radius:7px; padding:9px 12px; color:var(--text); font-size:13px; font-family:'Inter',sans-serif; outline:none; cursor:pointer; appearance:none; }
        .form-textarea { width:100%; background:#111827; border:1px solid rgba(255,255,255,0.1); border-radius:7px; padding:9px 12px; color:var(--text); font-size:13px; font-family:'Inter',sans-serif; outline:none; resize:vertical; }
        .form-row { margin-bottom:14px; }

        /* NOTIF */
        .notif { position:fixed; top:20px; right:20px; z-index:500; max-width:380px; padding:14px 18px; border-radius:10px; font-size:13px; font-weight:500; animation:fadeUp 0.3s ease both; }
        .notif-ok { background:rgba(74,222,128,0.12); border:1px solid rgba(74,222,128,0.3); color:var(--green); }
        .notif-err { background:rgba(248,113,113,0.12); border:1px solid rgba(248,113,113,0.3); color:var(--red); }

        /* EMPTY STATE */
        .empty { padding:48px 20px; text-align:center; }
        .empty-icon { font-size:36px; margin-bottom:12px; }
        .empty-title { font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:700; color:var(--text); margin-bottom:6px; }
        .empty-sub { font-size:13px; color:var(--text3); line-height:1.6; }

        /* REPORTE */
        .rep-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; padding:20px; }
        .rep-stat { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:16px; text-align:center; }
        .rep-val { font-family:'Plus Jakarta Sans',sans-serif; font-size:26px; font-weight:800; line-height:1; margin-bottom:4px; }
        .rep-label { font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:1px; }

        /* SECTION DIVIDER */
        .modal-section { border-top:1px solid rgba(255,255,255,0.07); padding-top:18px; margin-top:18px; }
        .modal-section-title { font-size:14px; font-weight:700; color:var(--text); margin-bottom:3px; }
        .modal-section-sub { font-size:11px; color:var(--text3); margin-bottom:14px; }

        @media(max-width:1024px){ .cards{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:768px){ .sidebar{display:none} .main{margin-left:0;padding:16px} }
      `}</style>

      {notif && (
        <div className={`notif notif-${notif.tipo}`} onClick={() => setNotif(null)}>
          {notif.msg}
        </div>
      )}

      <div className="layout">
        {/* ─── SIDEBAR ─── */}
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
              { key: "licitaciones", icon: "📋", label: "Mis licitaciones", pill: licsActivas.length || null },
              { key: "propuestas", icon: "📥", label: "Propuestas" },
              { key: "contratos", icon: "📄", label: "Contratos", pill: contratos.filter(c => c.estado === "vencido").length || null, pillRed: true },
              { key: "reporte", icon: "📊", label: "Reporte" },
            ].map(item => (
              <button
                key={item.key}
                className={`nav-item ${tab === item.key ? "active" : ""}`}
                onClick={() => setTab(item.key as Tab)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.pill ? (
                  <span className={`nav-pill ${(item as any).pillRed ? "nav-pill-red" : ""}`}>{item.pill}</span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="sb-bottom">
            <a href="/ph/nueva-licitacion" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#07090F", background: "var(--gold)", textDecoration: "none", marginBottom: 6 }}>
              <span>➕</span> Nueva licitación
            </a>
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
                <p className="ph-sub">Gestión de contrataciones de tu PH</p>
              </div>

              {contratos.some(c => c.estado === "vencido") && (
                <div className="alert-banner">
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "var(--red)" }}>Contratos vencidos — acción requerida</strong>
                    <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 2 }}>
                      {contratos.filter(c => c.estado === "vencido").length} contrato(s) han vencido. Renova o publica una nueva licitación.
                    </div>
                  </div>
                  <button className="btn btn-red" onClick={() => setTab("contratos")}>Ver contratos</button>
                </div>
              )}

              <div className="cards">
                {[
                  { label: "Licitaciones activas", val: licsActivas.length, sub: "Recibiendo propuestas", color: "var(--gold)" },
                  { label: "Total propuestas", val: propuestas.length || "—", sub: "En licitaciones abiertas", color: "var(--blue)" },
                  { label: "Contratos activos", val: contratosActivos.length, sub: "En ejecución", color: "var(--green)" },
                  { label: "Licitaciones total", val: licitaciones.length, sub: "Historial completo", color: "#A78BFA" },
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
                    <div className="sec-sub">Abiertas para recibir propuestas</div>
                  </div>
                  <a href="/ph/nueva-licitacion" className="btn btn-gold" style={{ textDecoration: "none" }}>+ Nueva licitación</a>
                </div>
                {licsActivas.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">No hay licitaciones activas</div>
                    <div className="empty-sub">Publica tu primera licitación para recibir propuestas de empresas verificadas.</div>
                  </div>
                ) : (
                  <table className="tbl">
                    <thead><tr><th>Servicio</th><th>Presupuesto</th><th>Cierre</th><th>Acción</th></tr></thead>
                    <tbody>
                      {licsActivas.map(l => (
                        <tr key={l.id}>
                          <td className="td-main">
                            {l.titulo}
                            {l.urgente && <span className="badge b-urgent">URGENTE</span>}
                          </td>
                          <td className="td-mono">
                            {l.presupuesto_minimo ? `$${Number(l.presupuesto_minimo).toLocaleString()} - $${Number(l.presupuesto_maximo || l.presupuesto_minimo).toLocaleString()}/mes` : "—"}
                          </td>
                          <td style={{ color: l.urgente ? "var(--red)" : "var(--text2)" }}>{formatFecha(l.fecha_cierre)}</td>
                          <td>
                            <button className="btn btn-gold" onClick={() => {
                              setLicSeleccionada(l.id);
                              setTab("propuestas");
                            }}>Ver propuestas →</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {contratos.length > 0 && (
                <div className="sec">
                  <div className="sec-head">
                    <div className="sec-title">Contratos recientes</div>
                  </div>
                  <table className="tbl">
                    <thead><tr><th>Empresa</th><th>Servicio</th><th>Monto</th><th>Vence</th><th>Estado</th></tr></thead>
                    <tbody>
                      {contratos.slice(0, 3).map(c => {
                        const dias = diasRestantes(c.fecha_fin);
                        return (
                          <tr key={c.id}>
                            <td className="td-main">{(c as any).empresas?.nombre || "—"}</td>
                            <td>{(c as any).licitaciones?.titulo || (c as any).licitaciones?.categoria || "—"}</td>
                            <td className="td-mono">{formatMonto(c.monto_mensual)}</td>
                            <td>{formatFecha(c.fecha_fin)}</td>
                            <td>
                              {c.estado === "vencido" ? <span className="badge b-red">⚠ Vencido</span>
                                : dias !== null && dias < 90 ? <span className="badge b-yellow">Vence en {dias}d</span>
                                : <span className="badge b-green">● Activo</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── LICITACIONES ── */}
          {tab === "licitaciones" && (
            <>
              <div className="ph-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h1 className="ph-title">Mis licitaciones</h1>
                  <p className="ph-sub">Historial completo — {licitaciones.length} licitaciones</p>
                </div>
                <a href="/ph/nueva-licitacion" className="btn btn-gold" style={{ textDecoration: "none" }}>+ Nueva licitación</a>
              </div>
              <div className="sec">
                {licitaciones.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">Aún no tienes licitaciones</div>
                    <div className="empty-sub">Crea tu primera licitación para empezar a recibir propuestas.</div>
                  </div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr><th>Servicio</th><th>Estado</th><th>Publicada</th><th>Cierre</th><th>Acción</th></tr>
                    </thead>
                    <tbody>
                      {licitaciones.map(l => (
                        <tr key={l.id}>
                          <td className="td-main">
                            {l.titulo}
                            {l.urgente && <span className="badge b-urgent">URGENTE</span>}
                          </td>
                          <td>
                            {l.estado === "activa" && <span className="badge b-green">● Activa</span>}
                            {l.estado === "borrador" && <span className="badge b-gray">Borrador</span>}
                            {l.estado === "adjudicada" && <span className="badge b-gold">✓ Adjudicada</span>}
                            {l.estado === "en_evaluacion" && <span className="badge b-blue">En evaluación</span>}
                            {l.estado === "cancelada" && <span className="badge b-red">Cancelada</span>}
                          </td>
                          <td>{formatFecha(l.fecha_publicacion)}</td>
                          <td>{formatFecha(l.fecha_cierre)}</td>
                          <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(l.estado === "activa" || l.estado === "en_evaluacion") && (
                              <button className="btn btn-gold" onClick={() => { setLicSeleccionada(l.id); setTab("propuestas"); }}>
                                Ver propuestas
                              </button>
                            )}
                            {l.estado === "activa" && (
                              <button className="btn btn-ghost" onClick={() => abrirModalEditar(l)}>
                                ✏️ Editar
                              </button>
                            )}
                            {l.estado === "borrador" && (
                              <button className="btn btn-ghost" onClick={() => publicarLicitacion(l.id)}>
                                🚀 Publicar
                              </button>
                            )}
                            {l.estado === "adjudicada" && <span className="badge b-gold">✓ Completada</span>}
                            {l.url_slug && (
                              <a
                                href={`/licitacion/${l.url_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost"
                                style={{ textDecoration: "none", fontSize: 11 }}
                              >
                                🔗 Ver pública
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── PROPUESTAS / RANKING IA ── */}
          {tab === "propuestas" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Ranking de propuestas</h1>
                <p className="ph-sub">Evaluación objetiva — ordenadas por puntaje IA</p>
              </div>

              <div className="sec">
                {licsConPropuestas.length > 0 ? (
                  <div className="lic-tabs">
                    {licsConPropuestas.map(l => (
                      <button
                        key={l.id}
                        className={`lic-tab ${licSeleccionada === l.id ? "active" : ""}`}
                        onClick={() => setLicSeleccionada(l.id)}
                      >
                        {l.titulo}
                        <span className="lic-tab-count">
                          {l.fecha_cierre ? "cierre " + formatFecha(l.fecha_cierre) : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {!licSeleccionada ? (
                  <div className="empty">
                    <div className="empty-icon">📥</div>
                    <div className="empty-title">Selecciona una licitación</div>
                    <div className="empty-sub">Elige una licitación activa para ver las propuestas recibidas.</div>
                  </div>
                ) : propuestas.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">⏳</div>
                    <div className="empty-title">Sin propuestas aún</div>
                    <div className="empty-sub">Las empresas verificadas recibirán notificación y podrán aplicar.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "rgba(201,168,76,0.02)", fontSize: 12, color: "var(--text2)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>🤖</span>
                      La IA evalúa: <strong style={{ color: "var(--text)" }}>precio (40%)</strong> · <strong style={{ color: "var(--text)" }}>documentación (30%)</strong> · <strong style={{ color: "var(--text)" }}>experiencia (20%)</strong> · <strong style={{ color: "var(--text)" }}>respuesta (10%)</strong>
                    </div>
                    <div className="prop-grid">
                      {propuestas.map((p, i) => {
                        const esGanada = p.estado === "ganada";
                        const esNoSel = p.estado === "no_seleccionada";
                        const esRecomendada = i === 0 && p.puntaje_ia !== null && !esGanada && !esNoSel;
                        return (
                          <div key={p.id} className={`prop-card ${esRecomendada ? "recomendada" : ""}`}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div className={`score ${(p.puntaje_ia || 0) >= 75 ? "s-high" : (p.puntaje_ia || 0) >= 55 ? "s-mid" : "s-low"}`}>
                                {p.puntaje_ia ?? "—"}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text3)" }}>#{i + 1} en ranking</div>
                            </div>
                            <div className="prop-empresa">{(p as any).empresas?.nombre || "Empresa"}</div>
                            <div className="prop-monto">{formatMonto(p.monto_mensual || (p.precio_anual ? p.precio_anual / 12 : null))}</div>
                            <div className="prop-row">
                              <span className="prop-row-label">Experiencia</span>
                              <span className="prop-row-val">{(p as any).empresas?.anios_experiencia || "—"} años</span>
                            </div>
                            <div className="prop-row">
                              <span className="prop-row-label">Disponibilidad</span>
                              <span className="prop-row-val">{formatFecha(p.disponibilidad_inicio)}</span>
                            </div>
                            {p.descripcion && (
                              <div className="prop-detalle">{p.descripcion}</div>
                            )}
                            <div className="prop-actions">
                              {esGanada ? (
                                <span className="badge b-green">✓ Adjudicada</span>
                              ) : esNoSel ? (
                                <span className="badge b-gray">No seleccionada</span>
                              ) : (
                                <>
                                  <button
                                    className={`btn ${esRecomendada ? "btn-gold" : "btn-ghost"}`}
                                    onClick={() => abrirModalAdjudicar(p.id)}
                                  >
                                    {esRecomendada ? "⭐ Adjudicar" : "Adjudicar"}
                                  </button>
                                  <a
                                    href={`/licitacion/${licitaciones.find(l => l.id === licSeleccionada)?.url_slug || ""}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost"
                                    style={{ textDecoration: "none", fontSize: 11 }}
                                  >
                                    Ver pliego
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── CONTRATOS ── */}
          {tab === "contratos" && (
            <>
              <div className="ph-header">
                <h1 className="ph-title">Contratos</h1>
                <p className="ph-sub">Historial de contratos de tu PH</p>
              </div>

              {contratos.filter(c => c.estado === "vencido").map(c => (
                <div key={c.id} className="alert-banner">
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "var(--red)" }}>Contrato vencido</strong>
                    <div style={{ color: "var(--text2)", fontSize: 12, marginTop: 2 }}>
                      {(c as any).empresas?.nombre} — {(c as any).licitaciones?.titulo || (c as any).licitaciones?.categoria}. Vencido el {formatFecha(c.fecha_fin)}.
                    </div>
                  </div>
                  <a href="/ph/nueva-licitacion" className="btn btn-gold" style={{ textDecoration: "none" }}>+ Nueva licitación</a>
                </div>
              ))}

              <div className="cards" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
                {[
                  { label: "Activos", val: contratosActivos.length, color: "var(--green)" },
                  { label: "Completados", val: contratos.filter(c => c.estado === "completado").length, color: "var(--blue)" },
                  { label: "Vencidos sin renovar", val: contratos.filter(c => c.estado === "vencido").length, color: "var(--red)" },
                ].map(c => (
                  <div className="card" key={c.label}>
                    <div className="card-label">{c.label}</div>
                    <div className="card-val" style={{ color: c.color }}>{c.val}</div>
                  </div>
                ))}
              </div>

              <div className="sec">
                {contratos.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">📄</div>
                    <div className="empty-title">Sin contratos aún</div>
                    <div className="empty-sub">Los contratos aparecen aquí cuando adjudicas una licitación.</div>
                  </div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Empresa</th>
                        <th>Servicio</th>
                        <th>Monto/mes</th>
                        <th>Inicio</th>
                        <th>Vence</th>
                        <th>Firma empresa</th>
                        <th>Estado</th>
                        <th>Reseña</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratos.map(c => {
                        const dias = diasRestantes(c.fecha_fin);
                        const estadoFirma = (c as any).estado_firma;
                        const yaReseno = reviewsEnviadas.has(c.id);
                        return (
                          <tr key={c.id}>
                            <td className="td-main">{(c as any).empresas?.nombre || "—"}</td>
                            <td>{(c as any).licitaciones?.titulo || (c as any).licitaciones?.categoria || "—"}</td>
                            <td className="td-mono">{formatMonto(c.monto_mensual)}</td>
                            <td>{formatFecha(c.fecha_inicio)}</td>
                            <td style={{ color: c.estado === "vencido" ? "var(--red)" : "inherit" }}>{formatFecha(c.fecha_fin)}</td>
                            <td>
                              {estadoFirma === "pendiente" ? (
                                <span className="badge b-orange">⏳ Pendiente empresa</span>
                              ) : estadoFirma === "empresa_acepto" ? (
                                <span className="badge b-green">✅ Aceptado</span>
                              ) : (
                                <span className="badge b-gray">—</span>
                              )}
                            </td>
                            <td>
                              {c.estado === "vencido" ? <span className="badge b-red">⚠ Vencido</span>
                                : c.estado === "completado" ? <span className="badge b-gray">✓ Completado</span>
                                : dias !== null && dias < 90 ? <span className="badge b-yellow">Vence en {dias}d</span>
                                : <span className="badge b-green">● Activo</span>}
                            </td>
                            <td>
                              {(c.estado === "completado" || c.estado === "activo") && (
                                yaReseno ? (
                                  <span className="badge b-green">⭐ Enviada</span>
                                ) : (
                                  <button
                                    className="btn btn-ghost"
                                    style={{ padding: "4px 10px", fontSize: 12 }}
                                    onClick={() => { setShowReview(c.id); setReviewPuntaje(5); setReviewComentario(""); }}
                                  >
                                    ⭐ Reseñar
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── REPORTE ── */}
          {tab === "reporte" && (
            <>
              <div className="ph-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h1 className="ph-title">Reporte para copropietarios</h1>
                  <p className="ph-sub">Resumen de contrataciones — listo para asamblea</p>
                </div>
                <button className="btn btn-gold" onClick={() => window.print()}>⬇ Imprimir / PDF</button>
              </div>

              <div className="sec">
                <div className="sec-head"><div className="sec-title">Resumen ejecutivo</div></div>
                <div className="rep-grid">
                  {[
                    { val: licitaciones.length, label: "Licitaciones publicadas", color: "var(--gold)" },
                    { val: licitaciones.filter(l => l.estado === "adjudicada").length, label: "Contratos adjudicados", color: "var(--blue)" },
                    { val: contratosActivos.length, label: "Contratos activos", color: "var(--green)" },
                    { val: licitaciones.filter(l => l.estado !== "borrador").length, label: "Licitaciones transparentes", color: "var(--gold)" },
                    { val: "100%", label: "Documentado digitalmente", color: "var(--green)" },
                    { val: "0", label: "Contrataciones informales", color: "#A78BFA" },
                  ].map(s => (
                    <div className="rep-stat" key={s.label}>
                      <div className="rep-val" style={{ color: s.color }}>{s.val}</div>
                      <div className="rep-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {contratos.length > 0 && (
                <div className="sec">
                  <div className="sec-head"><div className="sec-title">Detalle de contratos activos</div></div>
                  <table className="tbl">
                    <thead><tr><th>Servicio</th><th>Empresa adjudicada</th><th>Monto mensual</th><th>Inicio</th><th>Vence</th></tr></thead>
                    <tbody>
                      {contratosActivos.map(c => (
                        <tr key={c.id}>
                          <td className="td-main">{(c as any).licitaciones?.titulo || (c as any).licitaciones?.categoria || "—"}</td>
                          <td>{(c as any).empresas?.nombre || "—"}</td>
                          <td className="td-mono">{formatMonto(c.monto_mensual)}</td>
                          <td>{formatFecha(c.fecha_inicio)}</td>
                          <td>{formatFecha(c.fecha_fin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 12, padding: "16px 20px", fontSize: 13, color: "var(--text2)", lineHeight: 1.7 }}>
                ✅ <strong style={{ color: "var(--text)" }}>Certificación de transparencia LicitaPH:</strong> Todas las contrataciones de este período fueron realizadas mediante proceso competitivo y documentado en la plataforma. Los expedientes están disponibles para consulta de cualquier copropietario.
              </div>
            </>
          )}

        </main>
      </div>

      {/* ── MODAL ADJUDICAR (ampliado) ── */}
      {showAdjudicar && (
        <div className="modal-bg" onClick={() => !adjudicando && setShowAdjudicar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Confirmar adjudicación</h2>

            {/* Sección 1: Resumen propuesta */}
            {(() => {
              const p = propuestas.find(x => x.id === showAdjudicar);
              return (
                <>
                  <p className="modal-sub">
                    Adjudicarás la licitación a <strong style={{ color: "var(--text)" }}>{(p as any)?.empresas?.nombre}</strong> por <strong style={{ color: "var(--gold)" }}>{formatMonto(p?.monto_mensual || (p?.precio_anual ? p.precio_anual / 12 : null))}</strong>.
                    {p?.puntaje_ia != null && (
                      <span style={{ marginLeft: 8, color: "var(--text3)", fontSize: 12 }}>Puntaje IA: <strong style={{ color: "var(--green)" }}>{p.puntaje_ia}</strong></span>
                    )}
                  </p>
                  <div style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>
                    📄 Esta acción notifica al ganador, marca las demás propuestas como no seleccionadas y genera el contrato automáticamente.
                  </div>
                </>
              );
            })()}

            {/* Sección 2: Condiciones del contrato */}
            <div className="modal-section">
              <div className="modal-section-title">Pactar condiciones del contrato</div>
              <div className="modal-section-sub">La empresa deberá revisar y aceptar estas condiciones en su dashboard</div>

              <div className="form-row">
                <label className="form-label">Fecha de inicio del contrato</label>
                <input
                  type="date"
                  className="form-input"
                  value={condicionesContrato.fecha_inicio}
                  onChange={e => setCondicionesContrato(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <label className="form-label">Modalidad de pago</label>
                <select
                  className="form-select"
                  value={condicionesContrato.modalidad_pago}
                  onChange={e => setCondicionesContrato(prev => ({ ...prev, modalidad_pago: e.target.value, detalle_pago: e.target.value !== "personalizado" ? "" : prev.detalle_pago }))}
                >
                  <option value="mensual">Mensual</option>
                  <option value="bimestral">Bimestral</option>
                  <option value="50/50">50/50 (inicio y mitad)</option>
                  <option value="70/30">70/30 (inicio/cierre)</option>
                  <option value="adelantado">Adelantado (pago completo al inicio)</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {condicionesContrato.modalidad_pago === "personalizado" && (
                <div className="form-row">
                  <label className="form-label">Detalle de modalidad de pago</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe la modalidad de pago personalizada..."
                    value={condicionesContrato.detalle_pago}
                    onChange={e => setCondicionesContrato(prev => ({ ...prev, detalle_pago: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-row">
                <label className="form-label">
                  Penalidad por incumplimiento — <strong style={{ color: "var(--gold)" }}>{condicionesContrato.penalidad_porcentaje}%</strong> del valor anual
                </label>
                <input
                  type="number"
                  className="form-input"
                  min={5}
                  max={50}
                  value={condicionesContrato.penalidad_porcentaje}
                  onChange={e => setCondicionesContrato(prev => ({ ...prev, penalidad_porcentaje: Math.min(50, Math.max(5, Number(e.target.value))) }))}
                />
              </div>

              <div className="form-row">
                <label className="form-label">Condiciones especiales <span style={{ color: "var(--text3)", fontWeight: 400 }}>(opcional)</span></label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Condiciones específicas del contrato, SLA, garantías..."
                  value={condicionesContrato.condiciones_especiales}
                  onChange={e => setCondicionesContrato(prev => ({ ...prev, condiciones_especiales: e.target.value }))}
                />
              </div>

              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  Notas internas <span style={{ color: "var(--text3)", fontWeight: 400 }}>(no visible para la empresa, opcional)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Notas privadas del administrador..."
                  value={condicionesContrato.notas}
                  onChange={e => setCondicionesContrato(prev => ({ ...prev, notas: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAdjudicar(null)} disabled={adjudicando}>Cancelar</button>
              <button
                className="btn btn-gold"
                disabled={adjudicando}
                onClick={() => {
                  const p = propuestas.find(x => x.id === showAdjudicar);
                  if (p) adjudicar(p.id, p.licitacion_id);
                }}
              >
                {adjudicando ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, border: "2px solid #07090F", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                    Procesando...
                  </span>
                ) : "✓ Confirmar adjudicación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR LICITACION ACTIVA ── */}
      {editandoLic && (
        <div className="modal-bg" onClick={() => !guardandoEdicion && setEditandoLic(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Editar licitación activa</h2>
            <p className="modal-sub">Puedes agregar fotos e inspecciones sin afectar el pliego</p>

            {/* Fechas de inspección */}
            <div className="form-row">
              <label className="form-label">Fechas de inspección</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={modalEditar.fechaInput}
                  onChange={e => setModalEditar(prev => ({ ...prev, fechaInput: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && agregarFechaInspeccion()}
                />
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={agregarFechaInspeccion}
                  style={{ whiteSpace: "nowrap" }}
                >
                  + Agregar
                </button>
              </div>
              {modalEditar.fechas.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {modalEditar.fechas.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 12px" }}>
                      <span style={{ fontSize: 13, color: "#F0F4FF" }}>
                        {new Date(f + "T12:00:00").toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarFechaInspeccion(f)}
                        style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {modalEditar.fechas.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>No hay fechas de inspección aún.</p>
              )}
            </div>

            <div className="form-row">
              <label className="form-label">Lugar de inspección</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Lobby del edificio Torre Mar, piso 1"
                value={modalEditar.lugar}
                onChange={e => setModalEditar(prev => ({ ...prev, lugar: e.target.value }))}
              />
            </div>

            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="form-label">Condiciones especiales</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Condiciones especiales del proceso de licitación..."
                value={modalEditar.condiciones}
                onChange={e => setModalEditar(prev => ({ ...prev, condiciones: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditandoLic(null)} disabled={guardandoEdicion}>
                Cancelar
              </button>
              <button className="btn btn-gold" disabled={guardandoEdicion} onClick={guardarEdicion}>
                {guardandoEdicion ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, border: "2px solid #07090F", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                    Guardando...
                  </span>
                ) : "💾 Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REVIEW ── */}
      {showReview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#0D1117", border: "1px solid #1F2937", borderRadius: 16, width: "100%", maxWidth: 460, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ color: "#C9A84C", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Reseña de contrato</p>
                <h3 style={{ color: "#F0F4FF", fontSize: 18, fontWeight: 700, margin: 0 }}>Califica el servicio prestado</h3>
              </div>
              <button onClick={() => setShowReview(null)} style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 22 }}>×</button>
            </div>

            {/* Estrellas */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 10px" }}>Puntaje general</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setReviewPuntaje(n)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 32, opacity: n <= reviewPuntaje ? 1 : 0.25, transition: "opacity .15s" }}
                  >
                    ⭐
                  </button>
                ))}
                <span style={{ color: "#F0F4FF", fontSize: 14, fontWeight: 700, alignSelf: "center", marginLeft: 4 }}>{reviewPuntaje}/5</span>
              </div>
            </div>

            {/* Comentario */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#9CA3AF", fontSize: 13, margin: "0 0 8px" }}>Comentario (opcional)</p>
              <textarea
                rows={4}
                value={reviewComentario}
                onChange={e => setReviewComentario(e.target.value)}
                placeholder="Describe la calidad del servicio, puntualidad, profesionalismo..."
                style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, padding: "10px 14px", color: "#F0F4FF", fontSize: 13, outline: "none", width: "100%", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={enviandoReview}
                onClick={async () => {
                  setEnviandoReview(true);
                  try {
                    const r = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ contrato_id: showReview, puntaje: reviewPuntaje, comentario: reviewComentario }),
                    });
                    if (!r.ok) { const j = await r.json(); throw new Error(j.error); }
                    setReviewsEnviadas(prev => new Set(prev).add(showReview!));
                    setNotif({ msg: "⭐ ¡Reseña enviada correctamente!", tipo: "ok" });
                    setShowReview(null);
                  } catch (e: any) {
                    setNotif({ msg: "❌ Error: " + e.message, tipo: "err" });
                  } finally {
                    setEnviandoReview(false);
                  }
                }}
                style={{ background: "#C9A84C", border: "none", color: "#07090F", borderRadius: 8, padding: "10px 24px", cursor: enviandoReview ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, flex: 1, opacity: enviandoReview ? 0.7 : 1 }}
              >
                {enviandoReview ? "Enviando..." : "⭐ Enviar reseña"}
              </button>
              <button onClick={() => setShowReview(null)} style={{ background: "#111827", border: "1px solid #1F2937", color: "#6B7280", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
