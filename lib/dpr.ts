// Modulo DPR (Daily Progress Report). Definiciones fijas del formulario de la
// planilla "AD-DAILY REPORT" (hoja DR) y los calculos que antes hacia el Excel.

export const OPERACIONES = [
  { key: "fw_supply", label: "FWSupply" },
  { key: "mgo_bunkering", label: "MGO Bunkering" },
  { key: "workboat", label: "Workboat" },
  { key: "ts_dip", label: "TS Dip" },
  { key: "towing", label: "Towing" },
  { key: "sts", label: "Alongside - STS" },
] as const;

export const DRILLS = [
  { key: "fire", label: "Fire Drill" },
  { key: "abandon", label: "Abandon Ship Drill" },
  { key: "sopep", label: "SOPEP Drill" },
  { key: "recovery", label: "Recovery man out of the water drill" },
  { key: "enclosed", label: "Enclosed space drill" },
  { key: "mob", label: "MOB Drill" },
  { key: "fire_pump", label: "Emergency Fire Pump" },
  { key: "blackout", label: "Blackout drill / Emergency Steering" },
  { key: "accident", label: "Accident / Incident / Near Miss Report" },
  { key: "injury", label: "Injury / Illness Report / First Aid Drill" },
  { key: "safety_meeting", label: "Safety Meeting" },
  { key: "toolbox", label: "Toolbox Meetings" },
  { key: "external_insp", label: "External inspections" },
  { key: "crew_training", label: "Crew Training" },
] as const;

// Guardias de 4 h (huso UTC-3). "filas" es la cantidad de renglones que ocupa
// cada guardia en la hoja impresa (incluido el renglon del relevo), igual que
// en el Excel; si una guardia tiene mas eventos, el bloque crece.
export const GUARDIAS = [
  { utc: "0600-1000", lt: "0900-1300", relevo: "Bridge watch handover to C/O", filas: 9 },
  { utc: "1000-1400", lt: "1300-1700", relevo: "Bridge watch handover to 2/O", filas: 6 },
  { utc: "1400-1800", lt: "1700-2100", relevo: "Bridge watch handover to C/O", filas: 7 },
  { utc: "1800-2200", lt: "2100-0100", relevo: "Bridge watch handover to Master", filas: 5 },
  { utc: "2200-0200", lt: "0100-0500", relevo: "Bridge watch handover to 2/O", filas: 6 },
  { utc: "0200-0600", lt: "0500-0900", relevo: "Bridge watch handover to C/O", filas: 8 },
] as const;

export const SAFETY_CARDS_FILAS = 3;

export interface DprEvento {
  hora: string;
  texto: string;
}

export interface DprGuardia {
  relevo: string;
  lat: string;
  lon: string;
  eventos: DprEvento[];
}

export interface Proyecto {
  id: string;
  nro_proyecto: string | null;
  nombre: string;
  compania: string | null;
  estado: string | null;
}

export function etiquetaProyecto(p: Pick<Proyecto, "nro_proyecto" | "nombre"> | null | undefined) {
  if (!p) return "";
  return [p.nro_proyecto, p.nombre].filter(Boolean).join(" · ");
}

export interface Dpr {
  id: string;
  numero: number;
  proyecto_id: string | null;
  fecha: string; // YYYY-MM-DD
  huso: string;
  buque: string;
  operador: string | null;
  fletador: string | null;
  mother_vessel: string | null;
  ubicacion: string | null;
  pais: string | null;
  lat: string | null;
  lon: string | null;
  pob: number | null;
  pasajeros: number | null;
  operaciones: string[];
  drills: string[];
  eta_proximo: string | null;
  guardias: DprGuardia[];
  velocidad_media: number | null;
  distancia: number | null;
  safety_cards: string[];
  tiempo: string | null;
  estado_mar: string | null;
  viento: string | null;
  visibilidad: string | null;
  mar_fondo: string | null;
  mgo_inicio: number | null;
  mgo_consumo: number | null;
  mgo_bunkered: number | null;
  mgo_entregado: number | null;
  mgo_carga_inicio: number | null;
  mgo_carga_cargado: number | null;
  mgo_carga_entregado: number | null;
  aceite_l: number | null;
  agua_dulce: number | null;
  sludge_tk: number | null;
  limite_critico: number | null;
  descarga_sludge: number | null;
  descarga_basura: number | null;
  descarga_pesca: number | null;
  horas_0: number | null;
  horas_1: number | null;
  horas_2: number | null;
  usuario_email: string | null;
  created_at: string;
  updated_at: string;
}

export type DprInput = Omit<Dpr, "id" | "usuario_email" | "created_at" | "updated_at">;

export const TIPOS_EHSQ = ["Toolbox", "Safety meeting", "Inspection", "Observ. Card", "Hot work", "Improve"] as const;

/** Tripulante o pasajero a bordo, en la lista de un DPR. */
export interface Tripulante {
  tipo: "tripulante" | "pasajero";
  cargo: string;
  nombre: string;
  apellido: string;
  nacionalidad: string;
  pasaporte: string;
  pasaporte_vence: string;
  fecha_nacimiento: string;
  fecha_embarque: string;
}

export interface EventoHse {
  tipo: string;
  tarea: string;
  personas: string;
  lugar: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Shipment {
  bl_awb: string;
  po: string;
  bultos: string;
  peso: string;
  comentario: string;
}

export interface ConsumoDiario {
  fecha: string;
  consumo: number | null;
  horas_0: number;
  horas_1: number;
  horas_2: number;
  dpr_id: string | null;
}

// ── fechas (siempre como texto YYYY-MM-DD, sin husos horarios de por medio) ──

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function hoyISO(): string {
  // fecha local de Argentina (UTC-3)
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
}

/** El DPR del dia D cubre las 24 h que terminan a las 0900 LT de D: la jornada
 *  de consumo y horas de motores es D - 1 (asi lo lleva la planilla: el DPR 106
 *  del 15/11 informa el consumo en el renglon del dia 14). */
export function jornadaDe(fechaDpr: string): string {
  return sumarDias(fechaDpr, -1);
}

export function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

export function fmtFecha2(fecha: string | null | undefined): string {
  if (!fecha) return "";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

// ── numeros ──

export function parseNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const r2 = (n: number) => Math.round(n * 1000) / 1000;

/** Formato argentino con decimales fijos ("70,45"); vacio si no hay valor. */
export function fmtNum(n: number | null | undefined, decimales = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Sin decimales forzados: 8390, 212, 7,7. */
export function fmtNumLibre(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3, useGrouping: false });
}

// ── calculos ──

/** MGO al cierre = inicio − consumo + bunkered − entregado. (La planilla no
 *  restaba lo entregado a otro buque; se corrigio con el OK de Federico.) */
export function mgoFin(d: Pick<DprInput, "mgo_inicio" | "mgo_consumo" | "mgo_bunkered" | "mgo_entregado">) {
  if (d.mgo_inicio === null) return null;
  return r2((d.mgo_inicio ?? 0) - (d.mgo_consumo ?? 0) + (d.mgo_bunkered ?? 0) - (d.mgo_entregado ?? 0));
}

/** MGO de carga al cierre = inicio + cargado − entregado (vacio si no hay carga). */
export function mgoCargaFin(
  d: Pick<DprInput, "mgo_carga_inicio" | "mgo_carga_cargado" | "mgo_carga_entregado">
) {
  if (d.mgo_carga_inicio === null && d.mgo_carga_cargado === null && d.mgo_carga_entregado === null) {
    return null;
  }
  return r2((d.mgo_carga_inicio ?? 0) + (d.mgo_carga_cargado ?? 0) - (d.mgo_carga_entregado ?? 0));
}

export function totalHoras(d: Pick<DprInput, "horas_0" | "horas_1" | "horas_2">) {
  return (d.horas_0 ?? 0) + (d.horas_1 ?? 0) + (d.horas_2 ?? 0);
}

/** Dias de combustible restante = MGO al cierre / consumo diario promedio de
 *  las ultimas jornadas con consumo (hasta 7). */
export function diasCombustible(fin: number | null, consumos: (number | null)[]): number | null {
  if (fin === null) return null;
  const validos = consumos.filter((c): c is number => c !== null && c > 0).slice(-7);
  if (validos.length === 0) return null;
  const prom = validos.reduce((a, b) => a + b, 0) / validos.length;
  return Math.round((fin / prom) * 10) / 10;
}

export interface FilaMes {
  dia: number;
  consumo: number | null;
  h0: number;
  h1: number;
  h2: number;
  total: number;
}

/** Tabla mensual de la hoja DR: dias 1-31 del mes de la jornada del DPR. */
export function tablaMensual(fechaDpr: string, consumos: ConsumoDiario[]): FilaMes[] {
  const jornada = jornadaDe(fechaDpr);
  const mes = jornada.slice(0, 7);
  const porDia = new Map<number, ConsumoDiario>();
  for (const c of consumos) {
    if (c.fecha.slice(0, 7) === mes && c.fecha <= jornada) porDia.set(Number(c.fecha.slice(8, 10)), c);
  }
  return Array.from({ length: 31 }, (_, i) => {
    const c = porDia.get(i + 1);
    const h0 = Number(c?.horas_0 ?? 0);
    const h1 = Number(c?.horas_1 ?? 0);
    const h2 = Number(c?.horas_2 ?? 0);
    return {
      dia: i + 1,
      consumo: c?.consumo === null || c?.consumo === undefined ? null : Number(c.consumo),
      h0,
      h1,
      h2,
      total: h0 + h1 + h2,
    };
  });
}

const claveTripulante = (p: Pick<Tripulante, "nombre" | "apellido">) =>
  `${p.nombre} ${p.apellido ?? ""}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

/** Diferencia de la lista de a bordo contra la del DPR anterior. */
export function diffTripulacion(anterior: Tripulante[] | null, actual: Tripulante[]) {
  if (!anterior) return { subieron: [] as Tripulante[], bajaron: [] as Tripulante[] };
  const antes = new Set(anterior.map(claveTripulante));
  const ahora = new Set(actual.map(claveTripulante));
  return {
    subieron: actual.filter((p) => p.nombre.trim() && !antes.has(claveTripulante(p))),
    bajaron: anterior.filter((p) => !ahora.has(claveTripulante(p))),
  };
}

export function nombreCompleto(p: Pick<Tripulante, "nombre" | "apellido">) {
  return [p.nombre, p.apellido].filter((x) => x && x.trim()).join(" ");
}

/** Normaliza filas leidas de la base (null -> "") para el formulario y la hoja. */
export function tripulanteDesdeFila(r: Record<string, unknown>): Tripulante {
  const t = (k: string) => (r[k] === null || r[k] === undefined ? "" : String(r[k]));
  return {
    tipo: r.tipo === "pasajero" ? "pasajero" : "tripulante",
    cargo: t("cargo"),
    nombre: t("nombre"),
    apellido: t("apellido"),
    nacionalidad: t("nacionalidad"),
    pasaporte: t("pasaporte"),
    pasaporte_vence: t("pasaporte_vence"),
    fecha_nacimiento: t("fecha_nacimiento"),
    fecha_embarque: t("fecha_embarque"),
  };
}

export function eventoDesdeFila(r: Record<string, unknown>): EventoHse {
  const t = (k: string) => (r[k] === null || r[k] === undefined ? "" : String(r[k]));
  return {
    tipo: t("tipo"),
    tarea: t("tarea"),
    personas: t("personas"),
    lugar: t("lugar"),
    hora_inicio: t("hora_inicio"),
    hora_fin: t("hora_fin"),
  };
}

export function shipmentDesdeFila(r: Record<string, unknown>): Shipment {
  const t = (k: string) => (r[k] === null || r[k] === undefined ? "" : String(r[k]));
  return { bl_awb: t("bl_awb"), po: t("po"), bultos: t("bultos"), peso: t("peso"), comentario: t("comentario") };
}

export function guardiasVacias(): DprGuardia[] {
  return GUARDIAS.map((g) => ({ relevo: g.relevo, lat: "", lon: "", eventos: [] }));
}

/** Normaliza el jsonb de guardias (siempre 6, con eventos como arreglo). */
export function normalizarGuardias(raw: unknown): DprGuardia[] {
  const arr = Array.isArray(raw) ? raw : [];
  return GUARDIAS.map((g, i) => {
    const r = (arr[i] ?? {}) as Partial<DprGuardia>;
    return {
      relevo: typeof r.relevo === "string" ? r.relevo : g.relevo,
      lat: typeof r.lat === "string" ? r.lat : "",
      lon: typeof r.lon === "string" ? r.lon : "",
      eventos: Array.isArray(r.eventos)
        ? r.eventos
            .map((e) => ({ hora: String(e?.hora ?? "").trim(), texto: String(e?.texto ?? "") }))
            .filter((e) => e.hora !== "" || e.texto.trim() !== "")
        : [],
    };
  });
}

export const CAMPOS_NUMERICOS = [
  "pob",
  "pasajeros",
  "velocidad_media",
  "distancia",
  "mgo_inicio",
  "mgo_consumo",
  "mgo_bunkered",
  "mgo_entregado",
  "mgo_carga_inicio",
  "mgo_carga_cargado",
  "mgo_carga_entregado",
  "aceite_l",
  "agua_dulce",
  "sludge_tk",
  "limite_critico",
  "descarga_sludge",
  "descarga_basura",
  "descarga_pesca",
  "horas_0",
  "horas_1",
  "horas_2",
] as const;

export const CAMPOS_TEXTO = [
  "huso",
  "buque",
  "operador",
  "fletador",
  "mother_vessel",
  "ubicacion",
  "pais",
  "lat",
  "lon",
  "eta_proximo",
  "tiempo",
  "estado_mar",
  "viento",
  "visibilidad",
  "mar_fondo",
] as const;
