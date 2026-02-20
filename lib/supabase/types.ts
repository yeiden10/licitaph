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

export interface EmpresaKYC {
  id?: string;
  empresa_id?: string;
  // Datos de la empresa
  ruc: string | null;
  ano_inicio_operaciones: number | null;
  descripcion: string | null;
  sitio_web: string | null;
  actividades_economicas: string[];
  categorias_servicio: string[];
  // Representante legal
  representante_nombre: string | null;
  representante_cedula: string | null;
  representante_tipo_id: string | null;
  representante_nacionalidad: string | null;
  representante_email: string | null;
  representante_telefono: string | null;
  // Contacto principal
  contacto_nombre: string | null;
  contacto_cargo: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  // Contacto contable
  contable_nombre: string | null;
  contable_email: string | null;
  contable_telefono: string | null;
  // Contacto general
  emails_empresa: string[];
  telefonos_empresa: string[];
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  // Información financiera
  num_empleados: number | null;
  facturacion_anual_promedio: number | null;
  referencias_bancarias: Record<string, unknown>[] | null;
  // Seguros y fianzas
  tiene_seguro_responsabilidad: boolean;
  tiene_fianza_cumplimiento: boolean;
  porcentaje_fianza_ofrecido: number | null;
  // Referencias comerciales
  referencias_comerciales: Record<string, unknown>[] | null;
  // Estado
  completado: boolean;
  porcentaje_completado: number;
  creado_en?: string;
  actualizado_en?: string;
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
  // Campos extendidos
  fotos: string[] | null;
  fechas_inspeccion: string[] | null;
  lugar_inspeccion: string | null;
  precio_referencia: number | null;
  precio_referencia_visible: boolean;
  condiciones_especiales: string | null;
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
  // Campos extendidos
  modalidad_pago: string | null;
  detalle_pago: string | null;
  acepta_condiciones: boolean;
  acepta_inspeccion: boolean;
  acepta_penalidades: boolean;
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
export type EstadoFirmaContrato = "pendiente" | "empresa_acepto" | "vigente";

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
  // Campos extendidos
  modalidad_pago: string | null;
  detalle_pago: string | null;
  penalidad_porcentaje: number | null;
  condiciones_especiales: string | null;
  estado_firma: EstadoFirmaContrato;
  empresa_acepto_at: string | null;
  // Joins
  empresa?: Empresa;
  licitacion?: Licitacion;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  enlace: string | null;
  creado_en: string;
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
  { id: "cedula",                label: "Cédula del representante legal",    requerido: true,  desc: "Cédula panameña vigente" },
  { id: "registro_publico",      label: "Certificado de Registro Público",   requerido: true,  desc: "Emitido en los últimos 3 meses" },
  { id: "paz_salvo_dgi",         label: "Paz y Salvo DGI",                   requerido: true,  desc: "Dirección General de Ingresos" },
  { id: "paz_salvo_css",         label: "Paz y Salvo CSS",                   requerido: true,  desc: "Caja de Seguro Social al día" },
  { id: "idoneidad",             label: "Idoneidad profesional",             requerido: true,  desc: "Según tipo de servicio ofrecido" },
  { id: "kyc",                   label: "Formulario KYC",                    requerido: true,  desc: "Conozca a su cliente" },
  { id: "aviso_operacion",       label: "Aviso de operación",                requerido: true,  desc: "Municipio de Panamá vigente" },
  { id: "estados_financieros",   label: "Estados financieros",               requerido: false, desc: "Últimos 2 años (contratos >$50K)" },
  { id: "poliza_seguro",         label: "Póliza de seguro de responsabilidad civil", requerido: true,  desc: "Vigente con cobertura mínima" },
  { id: "fianza_cumplimiento",   label: "Fianza de cumplimiento",            requerido: true,  desc: "Mínimo 50% del valor anual" },
  { id: "cv_equipo",             label: "CV del equipo de trabajo",          requerido: true,  desc: "Personal que participará en el servicio" },
  { id: "referencias_comerciales", label: "Cartas de referencias comerciales", requerido: true, desc: "Mínimo 3 referencias verificables" },
  { id: "referencias_bancarias", label: "Referencias bancarias",             requerido: false, desc: "Mínimo 1 referencia bancaria" },
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]["id"];

// Categorías de servicios (25 categorías)
export const CATEGORIAS_SERVICIO = [
  // Administración y gestión
  { value: "administracion",    label: "Administración de PH",          grupo: "Admin y gestión" },
  { value: "auditoria",         label: "Auditoría y contabilidad",       grupo: "Admin y gestión" },
  { value: "legal",             label: "Servicios legales",              grupo: "Admin y gestión" },
  { value: "seguros",           label: "Seguros y fianzas",              grupo: "Admin y gestión" },
  // Seguridad
  { value: "seguridad",         label: "Seguridad 24/7",                 grupo: "Seguridad" },
  { value: "control_acceso",    label: "Control de acceso",              grupo: "Seguridad" },
  { value: "cctv",              label: "CCTV y videovigilancia",         grupo: "Seguridad" },
  // Mantenimiento
  { value: "limpieza",          label: "Limpieza y aseo",                grupo: "Mantenimiento" },
  { value: "mantenimiento",     label: "Mantenimiento general",          grupo: "Mantenimiento" },
  { value: "pintura",           label: "Pintura y acabados",             grupo: "Mantenimiento" },
  { value: "remodelacion",      label: "Remodelación y construcción",    grupo: "Mantenimiento" },
  { value: "reparaciones",      label: "Reparaciones menores",           grupo: "Mantenimiento" },
  // Sistemas
  { value: "hvac",              label: "HVAC / Aire acondicionado",      grupo: "Sistemas" },
  { value: "ascensores",        label: "Ascensores y montacargas",       grupo: "Sistemas" },
  { value: "electricidad",      label: "Electricidad",                   grupo: "Sistemas" },
  { value: "plomeria",          label: "Plomería y sanitarios",          grupo: "Sistemas" },
  { value: "sistemas_pluviales",label: "Sistemas pluviales",             grupo: "Sistemas" },
  { value: "filtraciones",      label: "Filtraciones e impermeabilización", grupo: "Sistemas" },
  { value: "generadores",       label: "Generadores y UPS",              grupo: "Sistemas" },
  // Áreas externas
  { value: "areas_verdes",      label: "Áreas verdes y jardinería",      grupo: "Áreas externas" },
  { value: "piscina",           label: "Mantenimiento de piscina",       grupo: "Áreas externas" },
  { value: "fumigacion",        label: "Fumigación y control de plagas", grupo: "Áreas externas" },
  // Tecnología
  { value: "telecomunicaciones",label: "Telecomunicaciones e internet",  grupo: "Tecnología" },
  { value: "domotica",          label: "Domótica y automatización",      grupo: "Tecnología" },
  // Otros
  { value: "otros",             label: "Otros servicios",                grupo: "Otros" },
] as const;

// Requisitos estándar recomendados (15 base)
export interface RequisitoEstandar {
  titulo: string;
  descripcion: string;
  subsanable: boolean;
  obligatorio: boolean;
  tipo_respuesta: "documento" | "texto" | "numero" | "seleccion";
  recomendado: boolean;
}

export const REQUISITOS_ESTANDAR: RequisitoEstandar[] = [
  {
    titulo: "Registro Público vigente",
    descripcion: "Certificado de existencia y representación legal emitido en los últimos 3 meses por el Registro Público de Panamá.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Aviso de operación vigente",
    descripcion: "Aviso de operación comercial vigente emitido por el municipio correspondiente.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Paz y Salvo CSS",
    descripcion: "Paz y Salvo de la Caja de Seguro Social vigente, emitido en los últimos 3 meses.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Paz y Salvo DGI",
    descripcion: "Paz y Salvo de la Dirección General de Ingresos vigente, emitido en los últimos 3 meses.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Cédula o pasaporte del representante legal",
    descripcion: "Documento de identidad vigente (cédula panameña o pasaporte) del representante legal de la empresa.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Estados financieros últimos 2 años",
    descripcion: "Estados financieros auditados o declaraciones de renta de los últimos 2 años fiscales.",
    subsanable: true,
    obligatorio: false,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Referencias bancarias (mín. 1)",
    descripcion: "Carta de referencia bancaria de al menos una institución financiera reconocida.",
    subsanable: true,
    obligatorio: false,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Carta de referencias comerciales (mín. 3)",
    descripcion: "Mínimo 3 cartas de referencia de clientes o empresas con las que haya trabajado en los últimos 3 años.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "CV del equipo que participará en el servicio",
    descripcion: "Hoja de vida del personal clave (supervisores, técnicos) que ejecutará el contrato.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Certificados de idoneidad del personal",
    descripcion: "Certificados de idoneidad o licencias profesionales del personal técnico asignado al servicio.",
    subsanable: true,
    obligatorio: false,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Experiencia comprobable en servicios similares (mín. 3 años)",
    descripcion: "Demostración de al menos 3 años de experiencia en servicios del mismo tipo, con referencias verificables.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "texto",
    recomendado: true,
  },
  {
    titulo: "Póliza de seguro de responsabilidad civil vigente",
    descripcion: "Póliza vigente de responsabilidad civil que cubra daños a terceros durante la prestación del servicio.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Fianza de cumplimiento (mín. 50% del valor anual)",
    descripcion: "Fianza de cumplimiento equivalente a al menos el 50% del valor anual del contrato, emitida por aseguradora reconocida.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Carta de compromiso de inspección previa al inicio",
    descripcion: "Carta firmada por el representante legal comprometiendo a la empresa a realizar una inspección previa antes de iniciar el servicio.",
    subsanable: false,
    obligatorio: true,
    tipo_respuesta: "documento",
    recomendado: true,
  },
  {
    titulo: "Descripción detallada de la metodología de trabajo",
    descripcion: "Documento que explique en detalle cómo se ejecutará el servicio: frecuencia, personal asignado, herramientas, procedimientos y métricas de calidad.",
    subsanable: true,
    obligatorio: true,
    tipo_respuesta: "texto",
    recomendado: true,
  },
];

// Requisitos sugeridos por categoría de servicio
export const REQUISITOS_POR_SERVICIO: Record<string, Array<{titulo: string; descripcion: string; subsanable: boolean; obligatorio: boolean; tipo_respuesta?: "documento" | "texto" | "numero" | "seleccion"}>> = {
  seguridad: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia y representación legal, emitido en los últimos 3 meses", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia MINSEG", descripcion: "Licencia vigente del Ministerio de Seguridad Pública para operar empresa de seguridad privada", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación de guardias", descripcion: "Certificados de entrenamiento MINSEG de al menos el 80% del personal asignado", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Protocolo de emergencias", descripcion: "Documento de procedimientos ante emergencias y tiempo de respuesta garantizado", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Póliza de seguro de responsabilidad civil vigente", descripcion: "Póliza vigente con cobertura mínima de $100,000", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Carta de referencias comerciales (mín. 3)", descripcion: "Mínimo 2 cartas de recomendación de contratos anteriores con propiedades horizontales", subsanable: true, obligatorio: false, tipo_respuesta: "documento" },
  ],
  control_acceso: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia o habilitación para sistemas de acceso", descripcion: "Habilitación para instalación y mantenimiento de sistemas de control de acceso", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Plan de implementación y soporte del sistema de control de acceso", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  cctv: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación técnica en sistemas CCTV", descripcion: "Certificaciones de los técnicos en marcas y sistemas que instalará", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Propuesta técnica con diagrama de instalación, equipos a utilizar y plan de mantenimiento", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  limpieza: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia y representación legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Aviso de operación vigente", descripcion: "Aviso de operación del Municipio de Panamá vigente", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Permiso MINSA", descripcion: "Permiso de operación del Ministerio de Salud para empresa de limpieza", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Fichas técnicas de productos", descripcion: "Hojas de datos de seguridad (MSDS) de todos los productos químicos utilizados", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Protocolo de bioseguridad, uso de EPP y manejo de desechos", subsanable: true, obligatorio: false, tipo_respuesta: "texto" },
  ],
  mantenimiento: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Experiencia comprobable en servicios similares (mín. 3 años)", descripcion: "Contratos previos de mantenimiento en propiedades similares", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Plan de mantenimiento preventivo y correctivo", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  pintura: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Carta de referencias comerciales (mín. 3)", descripcion: "Referencias de proyectos de pintura en propiedades residenciales o comerciales", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Especificación de materiales, marcas y procesos de preparación de superficies", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  remodelacion: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia del MICI o idoneidad de ingeniería/arquitectura", descripcion: "Idoneidad vigente del profesional responsable de la obra", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Póliza de seguro de responsabilidad civil vigente", descripcion: "Póliza de responsabilidad civil para obras de construcción", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Cronograma de obra, materiales y alcance de los trabajos", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  reparaciones: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Alcance de reparaciones, tiempos de respuesta y garantías ofrecidas", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  hvac: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia ACODECO", descripcion: "Licencia de empresa de refrigeración y aires acondicionados", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación técnica de refrigerantes", descripcion: "Personal certificado para manejo de refrigerantes según EPA 608", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Plan de mantenimiento preventivo con garantía mínima de 90 días en piezas instaladas", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  ascensores: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia MICI para mantenimiento de ascensores", descripcion: "Habilitación del Ministerio de Comercio e Industrias para mantenimiento de ascensores", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación técnica de mecánicos", descripcion: "Técnicos certificados por fabricante o asociación reconocida", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Cronograma mensual y anual de inspecciones preventivas", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  electricidad: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Idoneidad eléctrica del personal técnico", descripcion: "Licencia de electricista idóneo emitida por el MICI para el personal que ejecutará los trabajos", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Póliza de seguro de responsabilidad civil vigente", descripcion: "Póliza vigente que cubra trabajos eléctricos", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Protocolo de seguridad eléctrica y alcance de los servicios", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  plomeria: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Idoneidad en plomería o fontanería", descripcion: "Certificación del personal técnico en sistemas sanitarios y de agua potable", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Alcance de servicios, tiempos de respuesta para emergencias y garantías", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  sistemas_pluviales: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Experiencia comprobable en servicios similares (mín. 3 años)", descripcion: "Experiencia en mantenimiento y limpieza de sistemas pluviales en edificios", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Protocolo de limpieza, inspección y mantenimiento de sistemas pluviales", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  filtraciones: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Experiencia comprobable en servicios similares (mín. 3 años)", descripcion: "Proyectos anteriores de impermeabilización y corrección de filtraciones con referencias", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Diagnóstico, materiales a utilizar y garantía ofrecida sobre los trabajos", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  generadores: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación técnica en generadores y UPS", descripcion: "Personal certificado por fabricante o entidad reconocida para mantenimiento de generadores", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Plan de mantenimiento preventivo, pruebas periódicas y tiempos de respuesta ante fallas", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  areas_verdes: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificación fitosanitaria MIDA", descripcion: "Habilitación del MIDA para aplicación de pesticidas y herbicidas", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Fichas técnicas de productos", descripcion: "Inventario de todos los productos fitosanitarios con sus fichas técnicas (MSDS)", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Plan de mantenimiento de áreas verdes, frecuencia y personal asignado", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  piscina: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Permiso MINSA para mantenimiento de piscinas", descripcion: "Habilitación sanitaria para mantenimiento de piscinas colectivas", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificados de idoneidad del personal", descripcion: "Personal certificado en tratamiento de aguas y mantenimiento de piscinas", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Protocolo de tratamiento de aguas, productos utilizados y frecuencia de mantenimiento", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  fumigacion: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia MINSA para fumigación", descripcion: "Licencia sanitaria vigente del Ministerio de Salud para empresa de control de vectores", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Fichas técnicas de productos", descripcion: "MSDS de todos los plaguicidas y productos químicos a utilizar", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Protocolo de aplicación, frecuencia, productos y medidas de seguridad para residentes", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  telecomunicaciones: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia ASEP para telecomunicaciones", descripcion: "Habilitación de la Autoridad de los Servicios Públicos para operar servicios de telecomunicaciones", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Propuesta técnica con equipos, velocidades garantizadas, SLA y plan de soporte", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  domotica: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Certificaciones técnicas del personal", descripcion: "Certificaciones en sistemas de automatización y domótica de los técnicos asignados", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Propuesta técnica con sistemas a instalar, integración y plan de soporte y garantía", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  administracion: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Idoneidad del administrador de PH", descripcion: "Licencia o acreditación del administrador de propiedades horizontales", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Experiencia comprobable en servicios similares (mín. 3 años)", descripcion: "Contratos previos de administración de PH con referencias", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Propuesta de gestión: reportes, reuniones, manejo de fondos y cobros", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  auditoria: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Idoneidad del contador público autorizado (CPA)", descripcion: "Licencia de CPA del profesional que firmará los estados financieros", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Carta de referencias comerciales (mín. 3)", descripcion: "Referencias de clientes con trabajos de auditoría previos", subsanable: true, obligatorio: true, tipo_respuesta: "documento" },
  ],
  legal: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Idoneidad de abogado(s) asignado(s)", descripcion: "Licencia de idoneidad del abogado o firma que atenderá el contrato", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Alcance de servicios legales ofrecidos, tiempos de respuesta y honorarios", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  seguros: [
    { titulo: "Paz y Salvo CSS", descripcion: "CSS al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "DGI al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Licencia SSRP para corredora de seguros", descripcion: "Licencia vigente de la Superintendencia de Seguros y Reaseguros de Panamá", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Propuesta de coberturas, aseguradoras representadas y proceso de reclamaciones", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
  default: [
    { titulo: "Paz y Salvo CSS", descripcion: "Caja de Seguro Social al día, emitido en los últimos 3 meses", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Paz y Salvo DGI", descripcion: "Dirección General de Ingresos al día", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Registro Público vigente", descripcion: "Certificado de existencia y representación legal", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Aviso de operación vigente", descripcion: "Aviso de operación del Municipio de Panamá vigente", subsanable: false, obligatorio: true, tipo_respuesta: "documento" },
    { titulo: "Carta de referencias comerciales (mín. 3)", descripcion: "Mínimo 1 referencia de trabajo previo verificable", subsanable: true, obligatorio: false, tipo_respuesta: "documento" },
    { titulo: "Descripción detallada de la metodología de trabajo", descripcion: "Descripción del servicio, personal asignado y métricas de calidad", subsanable: true, obligatorio: true, tipo_respuesta: "texto" },
  ],
};
