"use client";

import { useMemo, useState } from "react";
import {
  DRILLS,
  GUARDIAS,
  OPERACIONES,
  SAFETY_CARDS_FILAS,
  aBordo,
  fmtNum,
  jornadaDe,
  fmtFecha2,
  mgoCargaFin,
  mgoFin,
  parseNum,
  totalHoras,
  type DprGuardia,
  type Persona,
} from "@/lib/dpr";
import type { DprFormState } from "@/lib/dpr-form";

type CampoTexto = {
  [K in keyof DprFormState]: DprFormState[K] extends string ? K : never;
}[keyof DprFormState];

export default function DprForm({
  action,
  inicial,
  personas,
  avisoPrecarga,
}: {
  action: (formData: FormData) => void;
  inicial: DprFormState;
  personas: Persona[];
  avisoPrecarga?: string;
}) {
  const [s, setS] = useState<DprFormState>(inicial);
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
  const bordo = useMemo(() => aBordo(personas, s.fecha), [personas, s.fecha]);
  const pobCalc = bordo.tripulantes.length + bordo.pasajeros.length;

  const toggle = (campo: "operaciones" | "drills", key: string) =>
    setS((p) => ({
      ...p,
      [campo]: p[campo].includes(key) ? p[campo].filter((k) => k !== key) : [...p[campo], key],
    }));

  const setGuardia = (i: number, patch: Partial<DprGuardia>) =>
    setS((p) => ({ ...p, guardias: p.guardias.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));

  const setEvento = (i: number, e: number, patch: Partial<{ hora: string; texto: string }>) =>
    setGuardia(i, {
      eventos: s.guardias[i].eventos.map((ev, k) => (k === e ? { ...ev, ...patch } : ev)),
    });

  const input = (k: CampoTexto, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="fg">
      <label htmlFor={`f-${k}`}>{label}</label>
      <input id={`f-${k}`} value={s[k]} onChange={(e) => set(k, e.target.value)} {...props} />
    </div>
  );
  const num = (k: CampoTexto, label: string) => input(k, label, { inputMode: "decimal" });

  return (
    <form action={action} className="dpr-form">
      <input type="hidden" name="payload" value={JSON.stringify(s)} />

      {avisoPrecarga && <div className="info-box accent mb16">{avisoPrecarga}</div>}

      <div className="card">
        <div className="card-title">Cabecera</div>
        <div className="form-grid g4">
          {input("numero", "Daily number", { inputMode: "numeric", required: true })}
          {input("fecha", "Fecha", { type: "date", required: true })}
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
          A bordo segun Tripulacion y pasajeros para el {fmtFecha2(s.fecha)}: {bordo.tripulantes.length}{" "}
          tripulantes + {bordo.pasajeros.length} pasajeros = {pobCalc}.{" "}
          {(parseNum(s.pob) !== pobCalc || parseNum(s.pasajeros) !== bordo.pasajeros.length) && (
            <>
              <span className="dpr-warn">No coincide con lo cargado.</span>{" "}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setS((p) => ({ ...p, pob: String(pobCalc), pasajeros: String(bordo.pasajeros.length) }))
                }
              >
                Usar {pobCalc} / {bordo.pasajeros.length}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="card">
        <div className="card-title">Operaciones y eventos del dia</div>
        <div className="dpr-checks">
          <div>
            <div className="dpr-sub">Operations</div>
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
          <div>
            <div className="dpr-sub">Drills / reportes</div>
            {DRILLS.map((d) => (
              <label key={d.key} className="dpr-check">
                <input type="checkbox" checked={s.drills.includes(d.key)} onChange={() => toggle("drills", d.key)} />
                {d.label}
              </label>
            ))}
          </div>
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
                    onChange={(x) => setEvento(i, e, { hora: x.target.value })}
                  />
                  <input
                    aria-label="Evento"
                    value={ev.texto}
                    onChange={(x) => setEvento(i, e, { texto: x.target.value })}
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
        <div className="card-title">
          Consumo y motores de la jornada {fmtFecha2(jornadaDe(s.fecha))}
        </div>
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

      <div className="card">
        <div className="card-title">Condiciones 24:00 UTC y descarga en puerto</div>
        <div className="form-grid g5">
          {input("tiempo", "Weather")}
          {input("estado_mar", "Sea condition")}
          {input("viento", "Wind")}
          {input("visibilidad", "Visibility")}
          {input("mar_fondo", "Swell")}
        </div>
        <div className="form-grid g4">
          {num("descarga_sludge", "Sludge a descargar")}
          {num("descarga_basura", "Garbage")}
          {num("descarga_pesca", "Fishing debris (m3)")}
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

      <div className="flex-between" style={{ justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary">
          Guardar DPR
        </button>
      </div>
    </form>
  );
}
