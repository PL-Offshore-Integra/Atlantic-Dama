import ExcelJS from "exceljs";
import { DRILLS, GUARDIAS, jornadaDe, parseNum, type Tripulante } from "@/lib/dpr";

// Lector de la planilla "AD-DAILY REPORT nnn-ddmmaa.xlsx" (hojas DR, AD - EHSQ
// Event, CREW AND PAX LIST y Shipment). Devuelve el mismo payload que arma el
// formulario del DPR, para guardarlo con persistirDpr().

type Celda = ExcelJS.CellValue;

function plano(v: Celda): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return plano((v as ExcelJS.CellFormulaValue).result as Celda);
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text);
    if ("error" in v) return null;
  }
  return v;
}

const str = (v: unknown) => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};
const fecha = (v: unknown) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : "");
const numTxt = (v: unknown) => {
  if (v instanceof Date) return "";
  let n = parseNum(v);
  // "8,5 kns", "111 nm", "0 mn": se toma el numero del principio
  if (n === null && typeof v === "string") {
    const m = v.trim().match(/^-?\d+(?:[.,]\d+)?/);
    if (m) n = parseNum(m[0]);
  }
  return n === null ? "" : String(n);
};
/** horas "0730" o 730 -> "0730" */
const hora = (v: unknown) => {
  const s = str(v);
  return /^\d{1,4}$/.test(s) ? s.padStart(4, "0") : s;
};

// Filas de la hoja DR donde arranca cada guardia (la ultima termina en la 58)
const FILAS_GUARDIA = [18, 27, 33, 40, 45, 51];
const FIN_BITACORA = 58;
const DRILL_FILA = 1; // G1..G14
const OPS: { key: string; celdas: string[] }[] = [
  { key: "fw_supply", celdas: ["C11"] },
  { key: "mgo_bunkering", celdas: ["E11", "F11"] },
  { key: "workboat", celdas: ["C12"] },
  { key: "ts_dip", celdas: ["E12", "F12"] },
  { key: "towing", celdas: ["C13"] },
  { key: "sts", celdas: ["E13", "F13"] },
];

const clave = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

export interface DprLeido {
  archivo: string;
  numero: number | null;
  fecha: string;
  /** numero y fecha segun el nombre del archivo ("... 106-151126.xlsx") */
  numeroArchivo: number | null;
  fechaArchivo: string;
  payload: Record<string, unknown>;
  avisos: string[];
}

export function numeroFechaDeArchivo(nombre: string) {
  const m = nombre.match(/(\d+)\s*-\s*(\d{2})(\d{2})(\d{2})\b/);
  if (!m) return { numero: null, fecha: "" };
  return { numero: Number(m[1]), fecha: `20${m[4]}-${m[3]}-${m[2]}` };
}

export async function leerDprExcel(nombre: string, buffer: ArrayBuffer): Promise<DprLeido> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const dr = wb.getWorksheet("DR");
  if (!dr) throw new Error("No tiene la hoja DR: no parece un AD-DAILY REPORT.");
  const c = (ref: string) => plano(dr.getCell(ref).value);
  const s = (ref: string) => str(c(ref));
  const avisos: string[] = [];

  if (!/daily number/i.test(s("A1"))) avisos.push("La celda A1 no dice 'Daily number': revisar la plantilla.");

  const numero = parseNum(c("C1"));
  const f = fecha(c("F2"));
  const delArchivo = numeroFechaDeArchivo(nombre);

  // guardias: renglon del relevo + eventos con hora hasta la guardia siguiente
  const guardias = FILAS_GUARDIA.map((fila, i) => {
    const hastaFila = (FILAS_GUARDIA[i + 1] ?? FIN_BITACORA + 1) - 1;
    const eventos: { hora: string; texto: string }[] = [];
    for (let r = fila + 1; r <= hastaFila; r++) {
      const h = hora(c(`B${r}`));
      const t = s(`C${r}`);
      if (h || t) eventos.push({ hora: h, texto: t });
    }
    return {
      relevo: s(`C${fila}`) || GUARDIAS[i].relevo,
      lat: s(`F${fila}`),
      lon: s(`H${fila}`),
      eventos,
    };
  });

  // tabla mensual: horas de motores de la jornada (dia = fecha - 1)
  let h0 = "",
    h1 = "",
    h2 = "";
  if (f) {
    const dia = Number(jornadaDe(f).slice(8, 10));
    const r = 18 + dia;
    h0 = numTxt(c(`L${r}`));
    h1 = numTxt(c(`M${r}`));
    h2 = numTxt(c(`N${r}`));
  }

  // tripulacion: hoja DR (cargo, nombre, fecha) + CREW AND PAX LIST (nacionalidad, pasaporte, pasajeros)
  const lista = wb.getWorksheet("CREW AND PAX LIST");
  const fichas = new Map<string, { nac: string; pas: string }>();
  const pasajeros: Tripulante[] = [];
  if (lista) {
    const l = (ref: string) => str(plano(lista.getCell(ref).value));
    for (let r = 3; r <= 20; r++) {
      const nom = l(`B${r}`);
      if (nom) fichas.set(clave(nom), { nac: l(`D${r}`), pas: l(`E${r}`) });
    }
    for (let r = 23; r <= 60; r++) {
      const nom = l(`C${r}`);
      if (!nom) continue;
      pasajeros.push({
        tipo: "pasajero",
        cargo: l(`B${r}`),
        nombre: nom,
        apellido: l(`D${r}`),
        nacionalidad: l(`E${r}`),
        pasaporte: l(`F${r}`),
        pasaporte_vence: fecha(plano(lista.getCell(`G${r}`).value)),
        fecha_nacimiento: fecha(plano(lista.getCell(`H${r}`).value)),
        fecha_embarque: "",
      });
    }
  }
  const tripulantes: Tripulante[] = [];
  for (let r = 66; r <= 79; r++) {
    const add = (cargo: string, nombre: string, fe: unknown) => {
      if (!nombre) return;
      const fi = fichas.get(clave(nombre));
      tripulantes.push({
        tipo: "tripulante",
        cargo: cargo.replace(/:\s*$/, "").trim(),
        nombre,
        apellido: "",
        nacionalidad: fi?.nac ?? "",
        pasaporte: fi?.pas ?? "",
        pasaporte_vence: "",
        fecha_nacimiento: "",
        fecha_embarque: fecha(fe),
      });
    };
    add(s(`H${r}`), s(`I${r}`), c(`J${r}`));
    add("", s(`K${r}`), c(`N${r}`));
  }

  // eventos EHSQ de la fecha del DPR
  const eventos: Record<string, string>[] = [];
  const ehsq = wb.getWorksheet("AD - EHSQ Event");
  if (ehsq && f) {
    ehsq.eachRow((row, r) => {
      if (r < 6) return;
      const v = (col: number) => plano(row.getCell(col).value);
      if (fecha(v(5)) !== f || !str(v(1))) return;
      eventos.push({
        tipo: str(v(1)),
        tarea: str(v(2)),
        personas: numTxt(v(3)),
        lugar: str(v(4)),
        hora_inicio: hora(v(6)),
        hora_fin: hora(v(7)),
      });
    });
  }

  const shipment: Record<string, string>[] = [];
  const sh = wb.getWorksheet("Shipment");
  if (sh) {
    sh.eachRow((row, r) => {
      if (r < 2) return;
      const v = (col: number) => str(plano(row.getCell(col).value));
      const fila = { bl_awb: v(1), po: v(2), bultos: v(3), peso: v(4), comentario: v(5) };
      if (Object.values(fila).some(Boolean)) shipment.push(fila);
    });
  }

  const marcado = (ref: string) => s(ref) !== "";
  const payload: Record<string, unknown> = {
    numero: numero === null ? "" : String(numero),
    fecha: f,
    huso: s("F3") || "UTC-3",
    buque: s("C2") || "Atlantic Dama",
    operador: s("C3"),
    fletador: s("C4"),
    mother_vessel: s("C5"),
    ubicacion: s("C6"),
    pais: s("F6"),
    lat: s("D7"),
    lon: s("F7"),
    pob: numTxt(c("C8")),
    pasajeros: numTxt(c("C9")),
    operaciones: OPS.filter((o) => o.celdas.some(marcado)).map((o) => o.key),
    drills: DRILLS.filter((_, i) => marcado(`G${DRILL_FILA + i}`)).map((d) => d.key),
    eta_proximo: s("J15"),
    guardias,
    velocidad_media: numTxt(c("E59")),
    distancia: numTxt(c("I59")),
    safety_cards: [s("C61"), s("C62"), s("C63")],
    tiempo: s("C66"),
    estado_mar: s("C67"),
    viento: s("C68"),
    visibilidad: s("C69"),
    mar_fondo: s("C70"),
    mgo_inicio: numTxt(c("F66")),
    mgo_consumo: numTxt(c("F67")),
    mgo_bunkered: numTxt(c("F68")),
    mgo_entregado: numTxt(c("F69")),
    mgo_carga_inicio: numTxt(c("F71")),
    mgo_carga_cargado: numTxt(c("F72")),
    mgo_carga_entregado: numTxt(c("F73")),
    aceite_l: numTxt(c("F75")),
    agua_dulce: numTxt(c("F76")),
    sludge_tk: numTxt(c("F77")),
    limite_critico: numTxt(c("F81")),
    descarga_sludge: numTxt(c("E83")),
    descarga_basura: numTxt(c("G83")),
    descarga_pesca: numTxt(c("N83")),
    horas_0: h0,
    horas_1: h1,
    horas_2: h2,
    tripulacion: [...tripulantes, ...pasajeros],
    eventos,
    shipment,
  };

  if (!f) avisos.push("Sin fecha en F2.");
  if (numero === null) avisos.push("Sin numero en C1.");
  const totH = [h0, h1, h2].reduce((a, x) => a + (Number(x) || 0), 0);
  if (f && totH !== 24) avisos.push(`Horas de motores de la jornada suman ${totH}, no 24.`);

  return {
    archivo: nombre,
    numero,
    fecha: f,
    numeroArchivo: delArchivo.numero,
    fechaArchivo: delArchivo.fecha,
    payload,
    avisos,
  };
}
