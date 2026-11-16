import {
  aBordo,
  guardiasVacias,
  hoyISO,
  mgoCargaFin,
  mgoFin,
  normalizarGuardias,
  sumarDias,
  type Dpr,
  type DprGuardia,
  type Persona,
} from "@/lib/dpr";

// Estado del formulario de DPR: los numeros se editan como texto (admiten coma
// decimal) y se convierten recien al guardar (ver actions.ts).
export interface DprFormState {
  numero: string;
  fecha: string;
  huso: string;
  buque: string;
  operador: string;
  fletador: string;
  mother_vessel: string;
  ubicacion: string;
  pais: string;
  lat: string;
  lon: string;
  pob: string;
  pasajeros: string;
  operaciones: string[];
  drills: string[];
  eta_proximo: string;
  guardias: DprGuardia[];
  velocidad_media: string;
  distancia: string;
  safety_cards: string[];
  tiempo: string;
  estado_mar: string;
  viento: string;
  visibilidad: string;
  mar_fondo: string;
  mgo_inicio: string;
  mgo_consumo: string;
  mgo_bunkered: string;
  mgo_entregado: string;
  mgo_carga_inicio: string;
  mgo_carga_cargado: string;
  mgo_carga_entregado: string;
  aceite_l: string;
  agua_dulce: string;
  sludge_tk: string;
  limite_critico: string;
  descarga_sludge: string;
  descarga_basura: string;
  descarga_pesca: string;
  horas_0: string;
  horas_1: string;
  horas_2: string;
}

const t = (v: string | null | undefined) => v ?? "";
const nn = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(v).replace(".", ",");

export function stateDesdeDpr(d: Dpr): DprFormState {
  return {
    numero: String(d.numero),
    fecha: d.fecha,
    huso: d.huso,
    buque: d.buque,
    operador: t(d.operador),
    fletador: t(d.fletador),
    mother_vessel: t(d.mother_vessel),
    ubicacion: t(d.ubicacion),
    pais: t(d.pais),
    lat: t(d.lat),
    lon: t(d.lon),
    pob: nn(d.pob),
    pasajeros: nn(d.pasajeros),
    operaciones: d.operaciones ?? [],
    drills: d.drills ?? [],
    eta_proximo: t(d.eta_proximo),
    guardias: normalizarGuardias(d.guardias),
    velocidad_media: nn(d.velocidad_media),
    distancia: nn(d.distancia),
    safety_cards: d.safety_cards ?? [],
    tiempo: t(d.tiempo),
    estado_mar: t(d.estado_mar),
    viento: t(d.viento),
    visibilidad: t(d.visibilidad),
    mar_fondo: t(d.mar_fondo),
    mgo_inicio: nn(d.mgo_inicio),
    mgo_consumo: nn(d.mgo_consumo),
    mgo_bunkered: nn(d.mgo_bunkered),
    mgo_entregado: nn(d.mgo_entregado),
    mgo_carga_inicio: nn(d.mgo_carga_inicio),
    mgo_carga_cargado: nn(d.mgo_carga_cargado),
    mgo_carga_entregado: nn(d.mgo_carga_entregado),
    aceite_l: nn(d.aceite_l),
    agua_dulce: nn(d.agua_dulce),
    sludge_tk: nn(d.sludge_tk),
    limite_critico: nn(d.limite_critico),
    descarga_sludge: nn(d.descarga_sludge),
    descarga_basura: nn(d.descarga_basura),
    descarga_pesca: nn(d.descarga_pesca),
    horas_0: nn(d.horas_0),
    horas_1: nn(d.horas_1),
    horas_2: nn(d.horas_2),
  };
}

/** DPR nuevo precargado con el anterior: numero y fecha siguientes, datos fijos
 *  del contrato, ROB de arranque = cierre del dia anterior, POB segun quienes
 *  estan a bordo. Lo del dia (bitacora, consumo, condiciones) arranca vacio. */
export function stateNuevo(ultimo: Dpr | null, personas: Persona[]): DprFormState {
  const fecha = ultimo ? sumarDias(ultimo.fecha, 1) : hoyISO();
  const bordo = aBordo(personas, fecha);
  return {
    numero: ultimo ? String(ultimo.numero + 1) : "",
    fecha,
    huso: ultimo?.huso ?? "UTC-3",
    buque: ultimo?.buque ?? "Atlantic Dama",
    operador: t(ultimo?.operador ?? "Parana Logistica SA"),
    fletador: t(ultimo?.fletador),
    mother_vessel: t(ultimo?.mother_vessel ?? "N/A"),
    ubicacion: t(ultimo?.ubicacion),
    pais: t(ultimo?.pais ?? "Argentina"),
    lat: "",
    lon: "",
    pob: String(bordo.tripulantes.length + bordo.pasajeros.length),
    pasajeros: String(bordo.pasajeros.length),
    operaciones: [],
    drills: [],
    eta_proximo: t(ultimo?.eta_proximo),
    guardias: guardiasVacias(),
    velocidad_media: "",
    distancia: "",
    safety_cards: [],
    tiempo: "",
    estado_mar: "",
    viento: "",
    visibilidad: "",
    mar_fondo: "",
    mgo_inicio: ultimo ? nn(mgoFin(ultimo)) : "",
    mgo_consumo: "",
    mgo_bunkered: "",
    mgo_entregado: "",
    mgo_carga_inicio: ultimo ? nn(mgoCargaFin(ultimo)) : "",
    mgo_carga_cargado: "",
    mgo_carga_entregado: "",
    aceite_l: nn(ultimo?.aceite_l),
    agua_dulce: nn(ultimo?.agua_dulce),
    sludge_tk: nn(ultimo?.sludge_tk),
    limite_critico: nn(ultimo?.limite_critico),
    descarga_sludge: "",
    descarga_basura: "",
    descarga_pesca: "",
    horas_0: "",
    horas_1: "",
    horas_2: "",
  };
}
