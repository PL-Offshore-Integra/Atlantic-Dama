import {
  DRILLS,
  GUARDIAS,
  SAFETY_CARDS_FILAS,
  fmtFecha,
  fmtFecha2,
  fmtNum,
  fmtNumLibre,
  mgoCargaFin,
  mgoFin,
  normalizarGuardias,
  type Dpr,
  type FilaMes,
  type Tripulante,
} from "@/lib/dpr";

// Hoja DR del "AD-DAILY REPORT" (A4 vertical), celda por celda: 15 columnas
// A-O con los mismos anchos y las mismas combinaciones que la planilla.
const ANCHOS = [7.66, 8, 6.44, 16.11, 17.89, 14.33, 5, 8.55, 19.66, 10, 10.66, 4.89, 13, 5, 6.44];

type Celda = {
  t?: React.ReactNode;
  span?: number;
  rows?: number;
  c?: string; // clases: b (negrita) r (rojo) az (azul) cen der izq gris ama g (mas grande)
};

const X = (v: boolean) => (v ? "X" : "");

export default function DprHoja({
  dpr,
  tripulantes,
  mes,
  diasCombustible,
}: {
  dpr: Dpr;
  tripulantes: Tripulante[];
  mes: FilaMes[];
  diasCombustible: number | null;
}) {
  const ops = new Set(dpr.operaciones ?? []);
  const drills = new Set(dpr.drills ?? []);
  const guardias = normalizarGuardias(dpr.guardias);
  const fin = mgoFin(dpr);
  const cargaFin = mgoCargaFin(dpr);

  const filas: { h?: number; celdas: Celda[] }[] = [];
  const fila = (celdas: Celda[], h?: number) => filas.push({ celdas, h });

  // ── Cabecera (filas 1-15): datos del viaje a la izquierda, drills a la derecha ──
  const drill = (i: number): Celda[] => [
    { t: X(drills.has(DRILLS[i].key)), c: "cen b g marca" },
    { t: DRILLS[i].label, span: 8, c: "b" },
  ];
  fila([
    { t: "Daily number:", span: 2, c: "b" },
    { t: dpr.numero, span: 3, c: "cen b r g" },
    { t: "" },
    ...drill(0),
  ]);
  fila([
    { t: "Vessel:", span: 2, c: "b" },
    { t: dpr.buque, span: 2, c: "b az" },
    { t: "Date:", c: "b" },
    { t: fmtFecha2(dpr.fecha), c: "cen b r" },
    ...drill(1),
  ]);
  fila([
    { t: "Operator:", span: 2, c: "b" },
    { t: dpr.operador, span: 3, c: "b az" },
    { t: dpr.huso, c: "cen b ama" },
    ...drill(2),
  ]);
  fila([{ t: "Charterer:", span: 2, c: "b" }, { t: dpr.fletador, span: 4, c: "b az" }, ...drill(3)]);
  fila([{ t: "Mother vessel:", span: 2, c: "b" }, { t: dpr.mother_vessel, span: 4, c: "b az" }, ...drill(4)]);
  fila([
    { t: "Location:", span: 2, c: "b" },
    { t: dpr.ubicacion, span: 2, c: "b" },
    { t: "Country of operation:", c: "b" },
    { t: dpr.pais, c: "b" },
    ...drill(5),
  ]);
  fila([
    { t: "GPS Position:", span: 2, c: "b" },
    { t: "Lat:", c: "der b" },
    { t: dpr.lat, c: "cen b r" },
    { t: "Long:", c: "der b" },
    { t: dpr.lon, c: "b r" },
    ...drill(6),
  ]);
  fila([{ t: "Total P.O.B:", span: 2, c: "b" }, { t: dpr.pob, c: "cen b r g" }, { t: "", span: 3 }, ...drill(7)]);
  fila([
    { t: "No. passengers:", span: 2, c: "b" },
    { t: dpr.pasajeros, c: "cen b r g" },
    { t: "", span: 3 },
    ...drill(8),
  ]);
  fila([{ t: "Operations:", span: 6, c: "cen b" }, ...drill(9)]);
  const op = (izq: string, kIzq: string, der: string, kDer: string, h?: number) =>
    fila(
      [
        { t: izq, span: 2, c: "b" },
        { t: X(ops.has(kIzq)), c: "cen b r g gris" },
        { t: der, c: "b" },
        { t: X(ops.has(kDer)), span: 2, c: "cen b r g gris" },
        ...drill(OP_DRILL[izq]),
      ],
      h
    );
  const OP_DRILL: Record<string, number> = { FWSupply: 10, Workboat: 11, Towing: 12 };
  op("FWSupply", "fw_supply", "MGO Bunkering", "mgo_bunkering", 35.4);
  op("Workboat", "workboat", "TS Dip", "ts_dip", 34.8);
  op("Towing", "towing", "Alongside - STS", "sts");
  fila([{ t: "", span: 6 }, ...drill(13)]);
  fila([
    { t: "", span: 6 },
    { t: "" },
    { t: "ETA next portcall  /  project area      :", span: 2, c: "b" },
    { t: dpr.eta_proximo, span: 6, c: "cen b azul" },
  ]);

  // ── Encabezado de la bitacora (filas 16-17) ──
  fila(
    [
      {
        t: "Handover of the Navigational watches as per. (IMO. Regulations) & Parana Logistica SMS. Manual 07.01.01",
        span: 11,
        c: "cen b",
      },
      { t: "Engines in use", span: 4, c: "cen b" },
    ],
    11.4
  );
  fila(
    [
      { t: "Time UTC", c: "cen b ama" },
      { t: "Time LT", c: "cen ama" },
      { t: "Operations:", span: 7, c: "b" },
      { t: "" },
      { t: "M3 / MT", c: "cen b" },
      { t: "(hours per day)", span: 4, c: "cen b" },
    ],
    11.4
  );

  // ── Bitacora (izquierda) + tabla mensual (derecha), mismas filas ──
  const izquierda: Celda[][] = [];
  GUARDIAS.forEach((g, i) => {
    const gu = guardias[i];
    const bloque: Celda[][] = [
      [
        { t: g.utc, c: "cen b az" },
        { t: g.lt, c: "cen az" },
        { t: gu.relevo, span: 3, c: "izq" },
        { t: gu.lat, span: 2, c: "cen r" },
        { t: gu.lon, span: 2, c: "cen r" },
      ],
    ];
    for (const ev of gu.eventos) {
      bloque.push([{ t: "" }, { t: ev.hora, c: "cen" }, { t: ev.texto, span: 7 }]);
    }
    while (bloque.length < g.filas) bloque.push([{ t: "" }, { t: "" }, { t: "", span: 7 }]);
    izquierda.push(...bloque);
  });
  const derecha: Celda[][] = [
    [
      { t: "Daily Fuel Consumption", span: 2, c: "cen b" },
      { t: "0", c: "cen b" },
      { t: "1", c: "cen b" },
      { t: "2", c: "cen b" },
      { t: "24", c: "cen b" },
    ],
    ...mes.map((m) => [
      { t: m.dia, c: "cen b" },
      { t: fmtNum(m.consumo), c: "cen" },
      { t: m.h0, c: "cen" },
      { t: m.h1, c: "cen" },
      { t: m.h2, c: "cen" },
      { t: m.total, c: "cen" },
    ]),
  ];
  const nFilas = Math.max(izquierda.length, derecha.length);
  for (let i = 0; i < nFilas; i++) {
    fila(
      [
        ...(izquierda[i] ?? [{ t: "" }, { t: "" }, { t: "", span: 7 }]),
        ...(derecha[i] ?? [{ t: "", span: 6, c: "sin" }]),
      ],
      i === 0 ? 12 : 11.25
    );
  }

  // ── Velocidad, distancia y safety cards (filas 59-63) ──
  fila(
    [
      { t: "", span: 2 },
      { t: "Average daily speed:", span: 2, c: "b" },
      { t: fmtNum(dpr.velocidad_media, 1), c: "cen r" },
      { t: "Distance run last 24 hrs:", span: 3, c: "b" },
      { t: fmtNumLibre(dpr.distancia), c: "cen r" },
      { t: "", span: 6, c: "sin" },
    ],
    15
  );
  fila([{ t: "No.", span: 2, c: "cen b g" }, { t: "SAFETY CARDS", span: 7, c: "cen b g" }, { t: "", span: 6, c: "sin" }], 15);
  for (let i = 0; i < SAFETY_CARDS_FILAS; i++) {
    const txt = dpr.safety_cards?.[i] ?? "";
    fila(
      [{ t: txt ? i + 1 : "", span: 2, c: "cen" }, { t: txt, span: 7 }, { t: "", span: 6, c: "sin" }],
      i === 0 ? 20.25 : 15
    );
  }

  // ── Condiciones, ROB y tripulacion (filas 64-79) ──
  fila(
    [
      { t: "Conditions 24.00 UTC", span: 4, rows: 2, c: "cen b" },
      { t: "ROB:", span: 3, rows: 2, c: "cen b" },
      { t: "Crew:", span: 2, rows: 2, c: "cen b" },
      { t: "Date", c: "cen b" },
      { t: "Crew:", span: 3, rows: 2, c: "cen b" },
      { t: "Date", span: 2, c: "cen b" },
    ],
    13.5
  );
  fila([{ t: "on board", c: "cen b" }, { t: "on board", span: 2, c: "cen b" }], 14.25);

  const condiciones: [string, string | null][] = [
    ["Weather", dpr.tiempo],
    ["Sea Condition", dpr.estado_mar],
    ["Wind", dpr.viento],
    ["Visibility", dpr.visibilidad],
    ["Swell", dpr.mar_fondo],
  ];
  const rob: [string, string, string, string?][] = [
    ["MGO start of day", fmtNum(dpr.mgo_inicio), "m3/MT"],
    ["MGO cons. today:", fmtNum(dpr.mgo_consumo), "m3/MT"],
    ["MGO bunkered today:", fmtNum(dpr.mgo_bunkered), "m3/MT"],
    ["MGO delivered today:", fmtNum(dpr.mgo_entregado), "m3/MT"],
    ["MGO end of day", fmtNum(fin), "m3/MT"],
    ["MGO Cargo start of day", fmtNum(dpr.mgo_carga_inicio), "m³"],
    ["MGO Cargo load today", fmtNum(dpr.mgo_carga_cargado), "m³"],
    ["MGO Cargo deliver today", fmtNum(dpr.mgo_carga_entregado), "m³"],
    ["MGO Cargo end of day", fmtNum(cargaFin), "m³"],
    ["Lub. Oil:", fmtNumLibre(dpr.aceite_l), "Ltrs.", "der"],
    ["Fresh water:", fmtNumLibre(dpr.agua_dulce), "m3", "der"],
    ["Sludge DK tank:", fmtNumLibre(dpr.sludge_tk), "m³", "der b"],
  ];
  const col1 = tripulantes.slice(0, 14);
  const col2 = tripulantes.slice(14, 28);
  for (let i = 0; i < 14; i++) {
    const cond = condiciones[i];
    const r = rob[i];
    const p = col1[i];
    const q = col2[i];
    fila(
      [
        cond ? { t: cond[0], span: 2, c: "cen b" } : { t: "", span: 2 },
        cond ? { t: cond[1], span: 2, c: "cen r" } : { t: "", span: 2 },
        r ? { t: r[0], c: r[3] ?? "" } : { t: "" },
        r ? { t: r[1], c: "cen b r" } : { t: "" },
        r ? { t: r[2], c: "cen" } : { t: "" },
        { t: p ? `${p.cargo ?? ""}:` : "", c: "b" },
        { t: p?.nombre ?? "" },
        { t: fmtFecha(p?.fecha_embarque), c: "cen" },
        { t: q ? `${q.cargo ?? ""}: ${q.nombre}` : "", span: 3 },
        { t: fmtFecha(q?.fecha_embarque), span: 2, c: "cen" },
      ],
      11.4
    );
  }
  fila(
    [
      { t: "Duration in days of fuel remaining on board", span: 4, c: "b" },
      { t: ":", c: "der" },
      { t: fmtNum(diasCombustible, 1), c: "cen b r" },
      { t: "days", c: "cen" },
      { t: "", span: 8 },
    ],
    10.8
  );
  fila(
    [
      { t: "Critical limit of fuel M3 (MGO)", span: 4, c: "b" },
      { t: ":", c: "der" },
      { t: fmtNumLibre(dpr.limite_critico), c: "cen b r" },
      { t: "m3", c: "cen" },
      { t: "", span: 8 },
    ]
  );
  fila([{ t: "", span: 15, c: "sin" }]);
  fila(
    [
      { t: "To be discharged in port Sludge:", span: 4, c: "der b" },
      { t: fmtNumLibre(dpr.descarga_sludge), c: "cen r" },
      { t: "Garbage   =  ", c: "der b" },
      { t: fmtNumLibre(dpr.descarga_basura), c: "cen r" },
      { t: "Fishing debris : ", span: 6, c: "b" },
      { t: fmtNumLibre(dpr.descarga_pesca), c: "cen r" },
      { t: "m³", c: "cen" },
    ],
    10.8
  );

  return (
    <div className="hoja">
      <table className="dr">
        <colgroup>
          {ANCHOS.map((w, i) => (
            <col key={i} style={{ width: `${Math.round(w * 7.2)}px` }} />
          ))}
        </colgroup>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} style={f.h ? { height: `${f.h}pt` } : undefined}>
              {f.celdas.map((c, j) => (
                <td key={j} colSpan={c.span} rowSpan={c.rows} className={c.c}>
                  {c.t ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="dr-pie">
        <span>Safety Management System</span>
        <span>7.45c Rev 7 DR vessel on 2 engines + 4 hrs. watch</span>
        <span>Manual 7 - Safety forms</span>
      </div>
    </div>
  );
}
