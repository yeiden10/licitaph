"use client";
import { useEffect } from "react";

// Componente client-side que registra una visita silenciosamente al montar
export default function VisitaTracker({ licitacion_id }: { licitacion_id: string }) {
  useEffect(() => {
    // Registrar visita una vez, sin bloquear la UI
    fetch("/api/licitaciones/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licitacion_id }),
    }).catch(() => {
      // Silencioso: una visita no registrada no es crítica
    });
  }, [licitacion_id]);

  return null; // No renderiza nada visible
}
