import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/documentos/upload — subir documento a Supabase Storage
// Soporta: documentos de empresa y documentos de requisito de pliego
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tipo = formData.get("tipo") as string; // tipo de doc empresa
  const contexto = formData.get("contexto") as string; // "empresa" | "requisito"
  const entidad_id = formData.get("entidad_id") as string; // empresa_id o propuesta_id
  const requisito_id = formData.get("requisito_id") as string | null;

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  // Validar tamaño (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 });
  }

  // Validar tipo de archivo
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Solo se permiten PDF, JPG y PNG" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const timestamp = Date.now();

  let bucket: string;
  let storagePath: string;

  if (contexto === "empresa") {
    // Documentos corporativos de empresa
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", user.id)
      .single();

    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    bucket = "documentos-empresa";
    storagePath = `${empresa.id}/${tipo}/${timestamp}.${ext}`;
  } else if (contexto === "requisito") {
    // Documento adjunto a un requisito de pliego
    bucket = "documentos-licitacion";
    storagePath = `${entidad_id}/${requisito_id}/${timestamp}.${ext}`;
  } else {
    return NextResponse.json({ error: "Contexto inválido" }, { status: 400 });
  }

  // Subir a Storage
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
  }

  // Obtener URL pública (solo para documentos de empresa)
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  // Registrar en tabla documentos (para documentos de empresa)
  if (contexto === "empresa") {
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", user.id)
      .single();

    if (empresa) {
      await supabase.from("documentos").upsert({
        nombre: file.name,
        url: urlData.publicUrl,
        tipo: tipo,
        entidad_tipo: "empresa",
        entidad_id: empresa.id,
        subido_por: user.id,
      }, { onConflict: "entidad_id,tipo" }).then(() => {});
    }
  }

  // Registrar en respuestas_requisito (para documentos de pliego)
  if (contexto === "requisito" && requisito_id) {
    await supabase.from("respuestas_requisito").upsert({
      propuesta_id: entidad_id,
      requisito_id,
      storage_path: storagePath,
      nombre_archivo: file.name,
      estado: "cumplido",
    }, { onConflict: "propuesta_id,requisito_id" }).then(() => {});
  }

  return NextResponse.json({
    success: true,
    path: storagePath,
    url: urlData.publicUrl,
    bucket,
  });
}

// GET /api/documentos/upload?empresa_id=xxx — obtener URL firmada para descargar
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket") || "documentos-empresa";
  const path = searchParams.get("path");

  if (!path) return NextResponse.json({ error: "path requerido" }, { status: 400 });

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hora

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
