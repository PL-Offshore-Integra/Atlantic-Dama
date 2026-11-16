"use client";

import { useState } from "react";
import {
  DRILLS,
  GUARDIAS,
  OPERACIONES,
  SAFETY_CARDS_FILAS,
  TIPOS_EHSQ,
  diffTripulacion,
  etiquetaProyecto,
  fmtFecha2,
  fmtNum,
  jornadaDe,
  mgoCargaFin,
  mgoFin,
  nombreCompleto,
  parseNum,
  totalHoras,
  type DprGuardia,
  type EventoHse,
  type Proyecto,
  type Shipment,
  type Tripulante,
} from "@/lib/dpr";
import type { DprFormState } from "@/lib/dpr-form";

type CampoTexto = {
  [K in keyof DprFormState]: DprFormState[K] extends string ? K : never;
}[keyof DprFormState];

type Pestana = "general" | "maquinas" | "rib" | "hse" | "tripulacion" | "shipment";

const TRIPULANTE_VACIO: Omit<Tripulante, "tipo" | "fecha_embarque"> = {
  cargo: "",
  nombre: "",
  apellido: "",
  nacionalidad: "",
  pasaporte: "",
  pasaporte_vence: "",
  fecha_nacimiento: "",
};

export default function DprForm({
  action,
  inicial,
  tripulacionAnterior,
  numeroAnterior,
  avisoPrecarga,
  proyectos,
  ribDisponibleAnterior,
}: {
  /** combustible disponible del RIB al cierre del DPR anterior (litros) */
  ribDisponibleAnterior: number | null;
  action: (formData: FormData) => void;
  inicial: DprFormState;
  /** proyectos comerciales del buque (modulo Comercial) */
  proyectos: Proyecto[];
  /** lista de a bordo del DPR anterior (null si no hay) para marcar quien subio/bajo */
  tripulacionAnterior: Tripulante[] | null;
  numeroAnterior: number | null;
  avisoPrecarga?: string;
}) {
  const [s, setS] = useState<DprFormState>(inicial);
  const [tab, setTab] = useState<Pestana>("general");
  const [aviso, setAviso] = useState<string | null>(null);
  const set = (k: CampoTexto, v: string) => setS((p) => ({ ...p, [k]: v }));

  const n = (k: CampoTexto) => parseNum(s[k]);
  const fin = mgoFin({
    mgo_inicio: n("mgo_inicio"),
    mgo_consumo: n("mgo_consumo"),
    mgo_bunkered: n("mgo_bunkered"),
    mgo_entregado: n("mgo_entregado"),
  });
  const cargaFin = mgoCargaFin({
    mgo_carga_inicio: n("mgo_carga_inicio"),
    mgo_carga_cargado: n("mgo_carga_cargado"),
    mgo_carga_entregado: n("mgo_carga_entregado"),
  });
  const horas = totalHoras({ horas_0: n("horas_0"), horas_1: n("horas_1"), horas_2: n("horas_2") });

  const tripulantes = s.tripulacion.filter((p) => p.tipo === "tripulante");
  const pasajeros = s.tripulacion.filter((p) => p.tipo === "pasajero");
  const pobLista = s.tripulacion.length;
  const pobDistinto = parseNum(s.pob) !== pobLista || parseNum(s.pasajeros) !== pasajeros.length;
  const diff = diffTripulacion(tripulacionAnterior, s.tripulacion);

  const toggle = (campo: "operaciones" | "drills", key: string) =>
    setS((p) => ({
      ...p,
      [campo]: p[campo].includes(key) ? p[campo].filter((k) => k !== key) : [...p[campo], key],
    }));

  const setGuardia = (i: number, patch: Partial<DprGuardia>) =>
    setS((p) => ({ ...p, guardias: p.guardias.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  const setEventoGuardia = (i: number, e: number, patch: Partial<{ hora: string; texto: string }>) =>
    setGuardia(i, { eventos: s.guardias[i].eventos.map((ev, k) => (k === e ? { ...ev, ...patch } : ev)) });

  // listas (tripulacion, eventos HSE, shipment): se editan por indice
  function setLista<K extends "tripulacion" | "eventos" | "shipment">(
    k: K,
    i: number,
    patch: Partial<DprFormState[K][number]>
  ) {
    setS((p) => ({ ...p, [k]: (p[k] as object[]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  }
  function quitar(k: "tripulacion" | "eventos" | "shipment", i: number) {
    setS((p) => ({ ...p, [k]: (p[k] as object[]).filter((_, j) => j !== i) }));
  }

  const input = (k: CampoTexto, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="fg">
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} value={s[k]} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );
  const num = (k: CampoTexto, label: string) => input(k, label, { inputMode: "decimal" });

  const PESTANAS: { key: Pestana; label: string }[] = [
    { key: "general", label: "Info general" },
    { key: "maquinas", label: "Info maquinas" },
    { key: "rib", label: "Info RIB" },
    { key: "hse", label: `Info HSE (${s.eventos.length})` },
    { key: "tripulacion", label: `Tripulacion (${pobLista})` },
    { key: "shipment", label: `Shipment (${s.shipment.length})` },
  ];

  const eventoDeTipo = (tipo: string) => s.eventos.some((e) => e.tipo.toLowerCase() === tipo.toLowerCase());

  // ── fila editable de tripulante / pasajero ──
  const filaTripulante = (p: Tripulante, idx: number) => {
    const i = s.tripulacion.indexOf(p);
    const nuevo = diff.subieron.includes(p);
    const pax = p.tipo === "pasajero";
    const cell = (k: keyof Tripulante, ph: string, type = "text") => (
      <td>
        <input
          type={type}
          aria-label={ph}
          placeholder={ph}
          value={p[k]}
          onChange={(e) => setLista("tripulacion", i, { [k]: e.target.value } as Partial<Tripulante>)}
        />
      </td>
    );
    return (
      <tr key={i} className={nuevo ? "dpr-sube" : undefined}>
        <td className="text-mono">{idx + 1}</td>
        {cell("cargo", pax ? "Position" : "Cargo")}
        {cell("nombre", pax ? "First name" : "Nombre y apellido")}
        {pax && cell("apellido", "Surname")}
        {cell("nacionalidad", "Nacionalidad")}
        {cell("pasaporte", "Pasaporte")}
        {pax && cell("pasaporte_vence", "Vence", "date")}
        {pax && cell("fecha_nacimiento", "Nacimiento", "date")}
        {cell("fecha_embarque", "Embarque", "date")}
        <td>
          {nuevo && <span className="badge b-green">Sube</span>}{" "}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitar("tripulacion", i)}>
            Baja
          </button>
        </td>
      </tr>
    );
  };

  const agregarPersona = (tipo: Tripulante["tipo"]) =>
    setS((p) => {
      const lista = [...p.tripulacion, { ...TRIPULANTE_VACIO, tipo, fecha_embarque: p.fecha }];
      // tripulantes primero, pasajeros despues
      lista.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "tripulante" ? -1 : 1));
      return { ...p, tripulacion: lista };
    });

  const tablaTripulacion = (tipo: Tripulante["tipo"], lista: Tripulante[]) => {
    const pax = tipo === "pasajero";
    return (
      <div className="card table-wrap dpr-tabla-edit">
        <div className="card-title">
          {pax ? "Passengers list" : "Crew list"} ({lista.length})
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => agregarPersona(tipo)}>
            + {pax ? "Pasajero" : "Tripulante"} que sube
          </button>
        </div>
        {lista.length === 0 ? (
          <div className="empty-state">Nadie a bordo.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{pax ? "Position" : "Cargo"}</th>
                <th>{pax ? "First name" : "Nombre"}</th>
                {pax && <th>Surname</th>}
                <th>Nacionalidad</th>
                <th>Pasaporte</th>
                {pax && <th>Vence</th>}
                {pax && <th>Nacimiento</th>}
                <th>Embarque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{lista.map(filaTripulante)}</tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <form
      action={action}
      className="dpr-form"
      onSubmit={(e) => {
        if (!s.numero.trim() || !s.fecha) {
          e.preventDefault();
          setTab("general");
          setAviso("Falta el numero o la fecha del DPR (pestaña Info general).");
        }
      }}
    >
      <input type="hidden" name="payload" value={JSON.stringify(s)} />

      {avisoPrecarga && <div className="info-box accent mb16">{avisoPrecarga}</div>}
      {aviso && <div className="info-box danger mb16">{aviso}</div>}

      <div className="tabs-row" role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={tab === p.key}
            className={`tab ${tab === p.key ? "active" : ""}`}
            onClick={() => setTab(p.key)}
            style={{ background: "none", border: 0, borderBottom: "2px solid transparent" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── 1. INFO GENERAL ─────────────────────────────────────────────── */}
      <div hidden={tab !== "general"}>
        <div className="card">
          <div className="card-title">Cabecera</div>
          <div className="form-grid g4">
            <div className="fg" style={{ gridColumn: "span 2" }}>
              <label htmlFor="f-proyecto_id">Proyecto</label>
              <select
                id="f-proyecto_id"
                value={s.proyecto_id}
                onChange={(e) => {
                  const p = proyectos.find((x) => x.id === e.target.value);
                  setS((x) => ({ ...x, proyecto_id: e.target.value, fletador: p?.compania ?? x.fletador }));
                }}
              >
                <option value="">Sin proyecto</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaProyecto(p)}
                    {p.estado && p.estado !== "en_curso" ? ` (${p.estado.replace("_", " ")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {input("numero", "Daily number", { inputMode: "numeric" })}
            {input("fecha", "Fecha", { type: "date" })}
            {input("huso", "Huso horario")}
            {input("buque", "Vessel")}
            {input("operador", "Operator")}
            {input("fletador", "Charterer")}
            {input("mother_vessel", "Mother vessel")}
            {input("eta_proximo", "ETA next portcall / project area")}
            {input("ubicacion", "Location")}
            {input("pais", "Country of operation")}
            {input("lat", "GPS Lat", { placeholder: "41º41,3 S" })}
            {input("lon", "GPS Long", { placeholder: "065º00,5 W" })}
            {num("pob", "Total P.O.B.")}
            {num("pasajeros", "No. passengers")}
          </div>
          <p className="dpr-hint">
            Segun la pestaña Tripulacion: {tripulantes.length} tripulantes + {pasajeros.length} pasajeros ={" "}
            {pobLista}.{" "}
            {pobDistinto && (
              <>
                <span className="dpr-warn">No coincide con lo cargado.</span>{" "}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setS((p) => ({ ...p, pob: String(pobLista), pasajeros: String(pasajeros.length) }))}
                >
                  Usar {pobLista} / {pasajeros.length}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="card">
          <div className="card-title">Operations</div>
          <div className="dpr-ops">
            {OPERACIONES.map((o) => (
              <label key={o.key} className="dpr-check">
                <input
                  type="checkbox"
                  checked={s.operaciones.includes(o.key)}
                  onChange={() => toggle("operaciones", o.key)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Bitacora de guardias (hora LT en los eventos)</div>
          {GUARDIAS.map((g, i) => {
            const gu = s.guardias[i];
            return (
              <div key={g.utc} className="dpr-guardia">
                <div className="dpr-guardia-head">
                  <span className="text-mono">
                    UTC {g.utc} · LT {g.lt}
                  </span>
                </div>
                <div className="form-grid g3">
                  <div className="fg">
                    <label>Relevo</label>
                    <input value={gu.relevo} onChange={(e) => setGuardia(i, { relevo: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label>Lat</label>
                    <input value={gu.lat} onChange={(e) => setGuardia(i, { lat: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label>Long</label>
                    <input value={gu.lon} onChange={(e) => setGuardia(i, { lon: e.target.value })} />
                  </div>
                </div>
                {gu.eventos.map((ev, e) => (
                  <div key={e} className="dpr-evento">
                    <input
                      aria-label="Hora LT"
                      className="dpr-hora"
                      placeholder="hhmm"
                      value={ev.hora}
                      onChange={(x) => setEventoGuardia(i, e, { hora: x.target.value })}
                    />
                    <input
                      aria-label="Evento"
                      value={ev.texto}
                      onChange={(x) => setEventoGuardia(i, e, { texto: x.target.value })}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setGuardia(i, { eventos: gu.eventos.filter((_, k) => k !== e) })}
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm mt8"
                  onClick={() => setGuardia(i, { eventos: [...gu.eventos, { hora: "", texto: "" }] })}
                >
                  + Evento
                </button>
              </div>
            );
          })}
          <div className="form-grid g4 mt16">
            {num("velocidad_media", "Average daily speed (kn)")}
            {num("distancia", "Distance run last 24 hrs (nm)")}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Conditions 24:00 UTC</div>
          <div className="form-grid g5">
            {input("tiempo", "Weather")}
            {input("estado_mar", "Sea condition")}
            {input("viento", "Wind")}
            {input("visibilidad", "Visibility")}
            {input("mar_fondo", "Swell")}
          </div>
        </div>
      </div>

      {/* ── 2. INFO MAQUINAS ────────────────────────────────────────────── */}
      <div hidden={tab !== "maquinas"}>
        <div className="card">
          <div className="card-title">Consumo y motores de la jornada {fmtFecha2(jornadaDe(s.fecha))}</div>
          <div className="form-grid g4">
            {num("mgo_consumo", "MGO cons. today (m3)")}
            {num("horas_0", "Horas con 0 motores")}
            {num("horas_1", "Horas con 1 motor")}
            {num("horas_2", "Horas con 2 motores")}
          </div>
          <p className="dpr-hint">
            Total de horas: <strong className="text-mono">{horas}</strong>
            {horas !== 24 && <span className="dpr-warn"> · debe sumar 24</span>}. Este renglon va a la tabla
            mensual del dia {Number(jornadaDe(s.fecha).slice(8, 10))}.
          </p>
        </div>

        <div className="card">
          <div className="card-title">ROB</div>
          <div className="form-grid g4">
            {num("mgo_inicio", "MGO start of day (m3)")}
            {num("mgo_bunkered", "MGO bunkered today")}
            {num("mgo_entregado", "MGO delivered today")}
            <div className="fg">
              <label>MGO end of day (calculado)</label>
              <input value={fmtNum(fin)} readOnly className="dpr-calc" />
            </div>
            {num("mgo_carga_inicio", "MGO cargo start of day")}
            {num("mgo_carga_cargado", "MGO cargo load today")}
            {num("mgo_carga_entregado", "MGO cargo deliver today")}
            <div className="fg">
              <label>MGO cargo end of day (calculado)</label>
              <input value={fmtNum(cargaFin)} readOnly className="dpr-calc" />
            </div>
            {num("aceite_l", "Lub. oil (L)")}
            {num("agua_dulce", "Fresh water (m3)")}
            {num("sludge_tk", "Sludge DK tank (m3)")}
            {num("limite_critico", "Critical limit of fuel (m3)")}
          </div>
          <p className="dpr-hint">MGO end of day = start − consumo + bunkered − delivered.</p>
        </div>
      </div>

      {/* ── INFO RIB ───────────────────────────────────────────────────── */}
      <div hidden={tab !== "rib"}>
        <div className="card">
          <div className="card-title">RIB (bote de rescate / trabajo) · jornada {fmtFecha2(s.fecha)}</div>
          <div className="form-grid g4">
            {num("rib_horas", "Horas de uso")}
            {num("rib_comb_usado", "Combustible utilizado (L)")}
            {num("rib_comb_disponible", "Combustible disponible (L)")}
          </div>
          {ribDisponibleAnterior !== null && (
            <p className="dpr-hint">
              Disponible en el DPR anterior: <strong className="text-mono">{fmtNum(ribDisponibleAnterior, 0)} L</strong>
              {n("rib_comb_usado") !== null && (
                <>
                  {" "}
                  − utilizado {fmtNum(n("rib_comb_usado"), 0)} L ={" "}
                  <strong className="text-mono">
                    {fmtNum(ribDisponibleAnterior - (n("rib_comb_usado") ?? 0), 0)} L
                  </strong>
                  {n("rib_comb_disponible") !== ribDisponibleAnterior - (n("rib_comb_usado") ?? 0) && (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          set(
                            "rib_comb_disponible",
                            String(ribDisponibleAnterior - (n("rib_comb_usado") ?? 0)).replace(".", ",")
                          )
                        }
                      >
                        Usar como disponible
                      </button>
                    </>
                  )}
                </>
              )}
              . Si se cargo combustible al RIB, el disponible es mayor: cargalo a mano.
            </p>
          )}
        </div>
      </div>

      {/* ── 3. INFO HSE ─────────────────────────────────────────────────── */}
      <div hidden={tab !== "hse"}>
        <div className="card table-wrap dpr-tabla-edit">
          <div className="card-title">
            EHSQ events del {fmtFecha2(s.fecha)}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setS((p) => ({
                  ...p,
                  eventos: [
                    ...p.eventos,
                    { tipo: "Toolbox", tarea: "", personas: "", lugar: "Deck", hora_inicio: "", hora_fin: "" },
                  ],
                }))
              }
            >
              + Evento
            </button>
          </div>
          {s.eventos.length === 0 ? (
            <div className="empty-state">Sin eventos cargados para este dia.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>EHSQ event</th>
                  <th>Task</th>
                  <th>Personnel</th>
                  <th>Location</th>
                  <th>Start (LT)</th>
                  <th>End</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {s.eventos.map((ev, i) => {
                  const campo = (k: keyof EventoHse, ph: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
                    <input
                      aria-label={ph}
                      placeholder={ph}
                      value={ev[k]}
                      onChange={(e) => setLista("eventos", i, { [k]: e.target.value } as Partial<EventoHse>)}
                      {...extra}
                    />
                  );
                  return (
                    <tr key={i}>
                      <td>
                        <select
                          aria-label="Tipo de evento"
                          value={ev.tipo}
                          onChange={(e) => setLista("eventos", i, { tipo: e.target.value })}
                        >
                          {[...TIPOS_EHSQ, ...(TIPOS_EHSQ.includes(ev.tipo as never) ? [] : [ev.tipo])].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{campo("tarea", "Task")}</td>
                      <td style={{ width: 90 }}>{campo("personas", "N°", { inputMode: "numeric" })}</td>
                      <td style={{ width: 110 }}>{campo("lugar", "Location")}</td>
                      <td style={{ width: 90 }}>{campo("hora_inicio", "hhmm")}</td>
                      <td style={{ width: 90 }}>{campo("hora_fin", "hhmm")}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitar("eventos", i)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="dpr-hint mt8">
            Si hay un Toolbox o un Safety meeting en el dia, la hoja DR marca la X correspondiente aunque no se tilde
            abajo.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Drills y reportes del dia</div>
          <div className="dpr-drills">
            {DRILLS.map((d) => {
              const auto =
                (d.key === "toolbox" && eventoDeTipo("Toolbox")) ||
                (d.key === "safety_meeting" && eventoDeTipo("Safety meeting"));
              return (
                <label key={d.key} className="dpr-check">
                  <input
                    type="checkbox"
                    checked={s.drills.includes(d.key) || auto}
                    disabled={auto}
                    onChange={() => toggle("drills", d.key)}
                  />
                  {d.label}
                  {auto && <span className="tag">por evento</span>}
                </label>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Safety cards</div>
          {Array.from({ length: SAFETY_CARDS_FILAS }, (_, i) => (
            <div key={i} className="fg mb8">
              <input
                aria-label={`Safety card ${i + 1}`}
                value={s.safety_cards[i] ?? ""}
                onChange={(e) =>
                  setS((p) => {
                    const c = [...p.safety_cards];
                    while (c.length < SAFETY_CARDS_FILAS) c.push("");
                    c[i] = e.target.value;
                    return { ...p, safety_cards: c };
                  })
                }
              />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">A descargar en puerto</div>
          <div className="form-grid g4">
            {num("descarga_sludge", "Sludge")}
            {num("descarga_basura", "Garbage")}
            {num("descarga_pesca", "Fishing debris (m3)")}
          </div>
        </div>
      </div>

      {/* ── 4. TRIPULACION ──────────────────────────────────────────────── */}
      <div hidden={tab !== "tripulacion"}>
        <div className="card">
          <div className="card-title">
            Movimientos respecto del {numeroAnterior ? `DPR ${numeroAnterior}` : "DPR anterior"}
          </div>
          {!tripulacionAnterior ? (
            <p className="text-muted">No hay un DPR anterior para comparar.</p>
          ) : diff.subieron.length === 0 && diff.bajaron.length === 0 ? (
            <p className="text-muted">Sin cambios: a bordo los mismos {pobLista} que el dia anterior.</p>
          ) : (
            <div className="dpr-movs">
              <div>
                <div className="dpr-sub">Subieron ({diff.subieron.length})</div>
                {diff.subieron.length === 0 && <p className="text-muted">Nadie.</p>}
                {diff.subieron.map((p, i) => (
                  <div key={i} className="dpr-mov">
                    <span className="badge b-green">Sube</span> {p.cargo && <strong>{p.cargo}</strong>}{" "}
                    {nombreCompleto(p) || <em>(sin nombre)</em>}
                  </div>
                ))}
              </div>
              <div>
                <div className="dpr-sub">Bajaron ({diff.bajaron.length})</div>
                {diff.bajaron.length === 0 && <p className="text-muted">Nadie.</p>}
                {diff.bajaron.map((p, i) => (
                  <div key={i} className="dpr-mov">
                    <span className="badge b-red">Baja</span> {p.cargo && <strong>{p.cargo}</strong>}{" "}
                    {nombreCompleto(p)}{" "}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setS((x) => {
                          const lista = [...x.tripulacion, p];
                          lista.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "tripulante" ? -1 : 1));
                          return { ...x, tripulacion: lista };
                        })
                      }
                    >
                      Deshacer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {tablaTripulacion("tripulante", tripulantes)}
        {tablaTripulacion("pasajero", pasajeros)}
      </div>

      {/* ── 5. SHIPMENT ─────────────────────────────────────────────────── */}
      <div hidden={tab !== "shipment"}>
        <div className="card table-wrap dpr-tabla-edit">
          <div className="card-title">
            Shipment
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setS((p) => ({
                  ...p,
                  shipment: [...p.shipment, { bl_awb: "", po: "", bultos: "", peso: "", comentario: "" }],
                }))
              }
            >
              + Envio
            </button>
          </div>
          {s.shipment.length === 0 ? (
            <div className="empty-state">Sin envios en este DPR.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>B/L or AWB No.</th>
                  <th>PO Number</th>
                  <th>No. of boxes, pallet, etc</th>
                  <th>Weight</th>
                  <th>Agent comment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {s.shipment.map((sh, i) => {
                  const campo = (k: keyof Shipment, ph: string) => (
                    <input
                      aria-label={ph}
                      placeholder={ph}
                      value={sh[k]}
                      onChange={(e) => setLista("shipment", i, { [k]: e.target.value } as Partial<Shipment>)}
                    />
                  );
                  return (
                    <tr key={i}>
                      <td>{campo("bl_awb", "B/L / AWB")}</td>
                      <td>{campo("po", "PO")}</td>
                      <td>{campo("bultos", "Bultos")}</td>
                      <td>{campo("peso", "Peso")}</td>
                      <td>{campo("comentario", "Comentario")}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitar("shipment", i)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex-between mt16">
        <span className="text-muted" style={{ fontSize: 13 }}>
          Se guardan las cinco pestañas juntas.
        </span>
        <button type="submit" className="btn btn-primary">
          Guardar DPR
        </button>
      </div>
    </form>
  );
}
