// Tipos TypeScript que mapean las tablas de Supabase exactas
export type TipoUsuario = "ph_admin" | "empresa" | "superadmin";

export interface Perfil {
  id: string;
  nombre_completo: string | null;
  email: string | null;
  telefono: string | null;
  tipo_usuario: TipoUsuario;
  avatar_url: string | null;
  creado_en: string;
}

export interface PropiedadHorizontal {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  ruc: string | null;
  telefono: string | null;
  email_contacto: string | null;
  descripcion: string | null;
  total_unidades: number | null;
  logo_url: string | null;
  admin_id: string;
  activo: boolean;
  creado_en: string;
}

export interface Empresa {
  id: string;
  usuario_id: string;
  nombre: string;
  ruc: string | null;
  representante_legal: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  sitio_web: string | null;
  descripcion: string | null;
  anios_experiencia: number | null;
  logo_url: string | null;
  categorias: string[];
  estado_verificacion: string | null;
  calificacion_promedio: number | null;
  total_contratos_ganados: number | null;
  activo: boolean;
  creado_en: string;
}

export interface Documento {
  id: string;
  nombre: string;
  url: string | null;
  tipo: string;
  entidad_tipo: string;
  entidad_id: string;
  subido_por: string;
  creado_en: string;
}

export type EstadoLicitacion = "borrador" | "activa" | "en_evaluacion" | "adjudicada" | "cancelada";

export interface Licitacion {
  id: string;
  ph_id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  servicio?: string; // columna generada = categoria
  presupuesto_minimo: number | null;
  presupuesto_maximo: number | null;
  duracion_contrato_meses: number | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
  fecha_adjudicacion: string | null;
  estado: EstadoLicitacion;
  urgente: boolean;
  url_slug: string | null;
  minimo_propuestas: number | null;
  empresa_ganadora_id: string | null;
  creado_por: string;
  creado_en: string;
  // Joins opcionales
  ph?: PropiedadHorizontal;
  total_propuestas?: number;
  ph_nombre?: string;
  ph_ciudad?: string;
}

export interface RequisitoLicitacion {
  id: string;
  licitacion_id: string;
  descripcion: string | null;
  titulo: string | null;
  nivel_importancia: string | null;
  orden: number | null;
  numero: number | null;
  subsanable: boolean;
  obligatorio: boolean;
  tipo_respuesta: "documento" | "texto" | "numero" | "seleccion";
}

export type EstadoPropuesta = "borrador" | "enviada" | "en_revision" | "ganada" | "no_seleccionada";

export interface Propuesta {
  id: string;
  licitacion_id: string;
  empresa_id: string;
  precio_anual: number | null;
  monto_mensual: number | null; // generada
  descripcion: string | null;
  propuesta_tecnica: string | null;
  puntaje_ia: number | null;
  analisis_ia: Record<string, unknown> | null;
  requisitos_cumplidos: string[] | null;
  disponibilidad_inicio: string | null;
  estado: EstadoPropuesta;
  enviada_at: string | null;
  creado_en: string;
  // Joins
  empresa?: Empresa;
  empresa_nombre?: string;
  docs_aprobados?: number;
}

export interface RespuestaRequisito {
  id: string;
  propuesta_id: string;
  requisito_id: string;
  storage_path: string | null;
  nombre_archivo: string | null;
  texto_respuesta: string | null;
  estado: "pendiente" | "cumplido" | "no_cumplido" | "subsanado";
  created_at: string;
}

export type EstadoContrato = "activo" | "completado" | "cancelado" | "vencido";

export interface Contrato {
  id: string;
  licitacion_id: string | null;
  propuesta_id: string | null;
  ph_id: string;
  empresa_id: string;
  valor_anual: number | null;
  monto_mensual: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: EstadoContrato;
  alerta_dias: number | null;
  notas: string | null;
  storage_path: string | null;
  creado_en: string;
  // Joins
  empresa?: Empresa;
  licitacion?: Licitacion;
}

export interface Notificacion {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Review {
  id: string;
  contrato_id: string;
  autor_id: string;
  destinatario_tipo: "ph" | "empresa";
  puntaje: number;
  comentario: string | null;
  created_at: string;
}

// Tipos de documentos de empresa
export const TIPOS_DOCUMENTO = [
  { id: "cedula",             label: "Cédula del representante legal",    requerido: true,  desc: "Cédula panameña vigente" },
  { id: "registro_publico",   label: "Certificado de Registro Público",   requerido: true,  desc: "Emitido en los últimos 3 meses" },
  { id: "paz_salvo_dgi",      label: "Paz y Salvo DGI",                   requerido: true,  desc: "Dirección General de Ingresos" },
  { id: "paz_salvo_css",      label: "Paz y Salvo CSS",                   requerido: true,  desc: "Caja de Seguro Social al día" },
  { id: "idoneidad",          label: "Idoneidad profesional",             requerido: true,  desc: "Según tipo de servicio ofrecido" },
  { id: "kyc",                label: "Formulario KYC",                    requerido: true,  desc: "Conozca a su cliente" },
  { id: "aviso_operacion",    label: "Aviso de operación",                requerido: true,  desc: "Municipio de Panamá vigente" },
  { id: "estados_financieros",label: "Estados financieros",               requerido: false, desc: "Últimos 2 años (contratos >$50K)" },
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]["id"];

// Categorías de servicios
export const CATEGORIAS_SERVICIO = [
  { value: "seguridad",    label: "Seguridad 24/7" },
  { value: "limpieza",     label: "Limpieza y mantenimiento" },
  { value: "hvac",         label: "Mantenimiento HVAC" },
  { value: "jardineria",   label: "Jardinería y áreas verdes" },
  { value: "ascensores",   label: "Mantenimiento ascensores" },
  { value: "electricidad", label: "Electricidad y plomería" },
  { value: "pintura",      label: "Pintura y reparaciones" },
  { value: "plagas",       label: "Control de plagas" },
  { value: "otros",        label: "Otros servicios" },
] as const;

// Requisitos sugeridos por categoría de servicio
export const REQUISITOS_POR_SERVICIO: Record<string, Array<{titulo: string; descripcion: string; subsanable: boolean; obligatorio: boolean}>> = {
  seguridad: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia y representación legal, emitido en los últimos 3 meses", subsanable: false, obligatorio: true },
    { titulo: "Licencia MINSEG", descripcion: "Licencia vigente del Ministerio de Seguridad Pública para operar empresa de seguridad privada", subsanable: false, obligatorio: true },
    { titulo: "Certificación de guardias", descripcion: "Certificados de entrenamiento MINSEG de al menos el 80% del personal asignado", subsanable: true, obligatorio: true },
    { titulo: "Protocolo de emergencias", descripcion: "Documento de procedimientos ante emergencias y tiempo de respuesta garantizado", subsanable: true, obligatorio: true },
    { titulo: "Seguro de responsabilidad civil", descripcion: "Póliza vigente con cobertura mínima de $100,000", subsanable: true, obligatorio: true },
    { titulo: "Referencias de PHs anteriores", descripcion: "Mínimo 2 cartas de recomendación de contratos anteriores con propiedades horizontales", subsanable: true, obligatorio: false },
  ],
  limpieza: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia y representación legal", subsanable: false, obligatorio: true },
    { titulo: "Aviso de operación", descripcion: "Aviso de operación del Municipio de Panamá vigente", subsanable: false, obligatorio: true },
    { titulo: "Certificación MINSA", descripcion: "Permiso de operación del Ministerio de Salud para empresa de limpieza", subsanable: true, obligatorio: true },
    { titulo: "Fichas técnicas de productos", descripcion: "Hojas de datos de seguridad (MSDS) de todos los productos químicos utilizados", subsanable: true, obligatorio: true },
    { titulo: "Protocolo de bioseguridad", descripcion: "Procedimientos de uso de EPP y manejo de desechos", subsanable: true, obligatorio: false },
  ],
  hvac: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true },
    { titulo: "Licencia ACODECO", descripcion: "Licencia de empresa de refrigeración y aires acondicionados", subsanable: false, obligatorio: true },
    { titulo: "Certificación técnica de refrigerantes", descripcion: "Personal certificado para manejo de refrigerantes según EPA 608", subsanable: true, obligatorio: true },
    { titulo: "Garantía de equipos y piezas", descripcion: "Política de garantía mínima de 90 días en piezas instaladas", subsanable: true, obligatorio: true },
  ],
  jardineria: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true },
    { titulo: "Certificación fitosanitaria", descripcion: "Habilitación del MIDA para aplicación de pesticidas", subsanable: true, obligatorio: true },
    { titulo: "Lista de productos fitosanitarios", descripcion: "Inventario de todos los productos químicos utilizados con sus fichas técnicas", subsanable: true, obligatorio: true },
    { titulo: "Seguro de accidentes laborales", descripcion: "Póliza de accidentes para todo el personal", subsanable: true, obligatorio: true },
  ],
  ascensores: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true },
    { titulo: "Licencia de empresa instaladora/mantenedora", descripcion: "Habilitación del MICI para mantenimiento de ascensores", subsanable: false, obligatorio: true },
    { titulo: "Certificación técnica de mecánicos", descripcion: "Técnicos certificados por fabricante o asociación reconocida", subsanable: true, obligatorio: true },
    { titulo: "Plan de mantenimiento preventivo", descripcion: "Cronograma mensual y anual de inspecciones", subsanable: true, obligatorio: true },
  ],
  default: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true },
    { titulo: "Registro Público", descripcion: "Certificado de existencia y representación legal", subsanable: false, obligatorio: true },
    { titulo: "Aviso de operación", descripcion: "Aviso de operación del Municipio de Panamá vigente", subsanable: false, obligatorio: true },
    { titulo: "KYC completado", descripcion: "Formulario Conozca a su Cliente completado en plataforma", subsanable: false, obligatorio: true },
    { titulo: "Referencias de contratos anteriores", descripcion: "Mínimo 1 referencia de trabajo previo verificable", subsanable: true, obligatorio: false },
  ],
};
