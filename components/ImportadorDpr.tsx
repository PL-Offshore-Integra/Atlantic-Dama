"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { etiquetaProyecto, fmtFecha2, type Proyecto } from "@/lib/dpr";
import {
  analizarDprExcel,
  importarDprExcel,
  type Analisis,
  type ResultadoImport,
} from "@/app/(app)/dpr/importar/actions";

type Fila = Analisis & {
  file: File;
  numeroFinal: number | null;
  fechaFinal: string;
  nota: string;
  existe: boolean;
  bloqueado: string;
};

/**
 * Decide numero y fecha de cada archivo. Las celdas mandan; si chocan con otro
 * archivo del lote o con un DPR ya cargado y el nombre del archivo trae otro
 * numero/fecha que no choca, se usa el del nombre (pasa cuando en la planilla
 * se copio el dia anterior y no se actualizo el numero o la fecha).
 */
function resolver(an: (Analisis & { file: File })[], existentes: { numero: number; fecha: string }[]): Fila[] {
  const exN = new Set(existentes.map((e) => e.numero));
  const exF = new Set(existentes.map((e) => e.fecha));
  const exPar = new Set(existentes.map((e) => `${e.numero}|${e.fecha}`));
  const cuenta = (vals: (string | number | null)[]) => {
    const m = new Map<string | number, number>();
    for (const v of vals) if (v !== null && v !== "") m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const filas: Fila[] = an.map((a) => ({
    ...a,
    numeroFinal: a.numero ?? a.numeroArchivo,
    fechaFinal: a.fecha || a.fechaArchivo,
    nota: "",
    existe: false,
    bloqueado: "",
  }));
  // iterativo: corregir un archivo puede destrabar a otro (ej. dos dias seguidos sin actualizar)
  for (let vuelta = 0; vuelta < filas.length; vuelta++) {
    let cambio = false;
    for (const f of filas) {
      if (f.nota || f.numeroArchivo === null) continue;
      if (f.numeroArchivo === f.numero && f.fechaArchivo === f.fecha) continue;
      const otros = filas.filter((x) => x !== f);
      const chocaCon = (n: number | null, fe: string) =>
        otros.some((x) => (n !== null && x.numeroFinal === n) || (!!fe && x.fechaFinal === fe)) ||
        (n !== null && exN.has(n) && !exPar.has(`${n}|${fe}`)) ||
        (!!fe && exF.has(fe) && !exPar.has(`${n}|${fe}`));
      if (chocaCon(f.numeroFinal, f.fechaFinal) && !chocaCon(f.numeroArchivo, f.fechaArchivo)) {
        f.nota = `En la planilla dice DPR ${f.numero ?? "?"} del ${fmtFecha2(f.fecha)}; se usa el nombre del archivo.`;
        f.numeroFinal = f.numeroArchivo;
        f.fechaFinal = f.fechaArchivo;
        cambio = true;
      }
    }
    if (!cambio) break;
  }

  // duplicados que quedan despues de corregir, y choques con lo ya cargado
  const n2 = cuenta(filas.map((f) => f.numeroFinal));
  const f2 = cuenta(filas.map((f) => f.fechaFinal));
  for (const f of filas) {
    if (f.error) f.bloqueado = f.error;
    else if (!f.numeroFinal || !f.fechaFinal) f.bloqueado = "Sin numero o fecha.";
    else if ((n2.get(f.numeroFinal) ?? 0) > 1) f.bloqueado = `Numero ${f.numeroFinal} repetido en el lote.`;
    else if ((f2.get(f.fechaFinal) ?? 0) > 1) f.bloqueado = `Fecha ${fmtFecha2(f.fechaFinal)} repetida en el lote.`;
    else if (exPar.has(`${f.numeroFinal}|${f.fechaFinal}`)) f.existe = true;
    else if (exN.has(f.numeroFinal) || exF.has(f.fechaFinal))
      f.bloqueado = "Choca con un DPR ya cargado (mismo numero o misma fecha, pero no ambos).";
  }
  return filas.sort((x, y) => (x.fechaFinal || "9").localeCompare(y.fechaFinal || "9"));
}

export default function ImportadorDpr({
  proyectos,
  existentes,
}: {
  proyectos: Proyecto[];
  existentes: { numero: number; fecha: string }[];
}) {
  const [analisis, setAnalisis] = useState<(Analisis & { file: File })[]>([]);
  const [leyendo, setLeyendo] = useState<{ hechos: number; total: number } | null>(null);
  const [proyectoId, setProyectoId] = useState(proyectos.find((p) => p.estado === "en_curso")?.id ?? "");
  const [sobrescribir, setSobrescribir] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoImport[]>([]);

  const filas = useMemo(() => resolver(analisis, existentes), [analisis, existentes]);
  const aImportar = filas.filter((f) => !f.bloqueado && (!f.existe || sobrescribir));

  async function elegir(files: FileList | null) {
    if (!files?.length) return;
    const lista = [...files].filter((f) => /\.xlsx$/i.test(f.name));
    setResultados([]);
    setAnalisis([]);
    setLeyendo({ hechos: 0, total: lista.length });
    const out: (Analisis & { file: File })[] = [];
    for (const file of lista) {
      const fd = new FormData();
      fd.set("archivo", file);
      out.push({ ...(await analizarDprExcel(fd)), file });
      setLeyendo({ hechos: out.length, total: lista.length });
    }
    setAnalisis(out);
    setLeyendo(null);
  }

  async function importar() {
    setImportando(true);
    const res: ResultadoImport[] = [];
    for (const f of aImportar) {
      const fd = new FormData();
      fd.set("archivo", f.file);
      fd.set("numero", String(f.numeroFinal));
      fd.set("fecha", f.fechaFinal);
      fd.set("proyecto_id", proyectoId);
      fd.set("sobrescribir", sobrescribir ? "1" : "0");
      res.push(await importarDprExcel(fd));
      setResultados([...res]);
    }
    setImportando(false);
  }

  const cuenta = (e: ResultadoImport["estado"]) => resultados.filter((r) => r.estado === e).length;

  return (
    <div>
      <div className="card">
        <div className="card-title">1 · Elegí los Excel (AD-DAILY REPORT nnn-ddmmaa.xlsx)</div>
        <div className="form-grid g3">
          <div className="fg">
            <label htmlFor="imp-archivos">Archivos</label>
            <input
              id="imp-archivos"
              type="file"
              multiple
              accept=".xlsx"
              onChange={(e) => elegir(e.target.files)}
              disabled={importando}
              style={{ paddingTop: 6 }}
            />
          </div>
          <div className="fg">
            <label htmlFor="imp-proyecto">Proyecto</label>
            <select id="imp-proyecto" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {etiquetaProyecto(p)}
                </option>
              ))}
            </select>
          </div>
          <label className="dpr-check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)} />
            Reemplazar los DPR que ya estan cargados
          </label>
        </div>
        <p className="dpr-hint">
          Se puede elegir una carpeta entera de una vez (Ctrl+A en el selector). Nada se guarda hasta apretar
          Importar.
        </p>
        {leyendo && (
          <p className="dpr-hint">
            Leyendo {leyendo.hechos} de {leyendo.total}…
          </p>
        )}
      </div>

      {filas.length > 0 && (
        <div className="card table-wrap">
          <div className="card-title">
            2 · Vista previa ({filas.length} archivos · {aImportar.length} para importar)
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={importando || aImportar.length === 0}
              onClick={importar}
            >
              {importando ? `Importando ${resultados.length} de ${aImportar.length}…` : `Importar ${aImportar.length}`}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>DPR</th>
                <th>Fecha</th>
                <th>Ubicacion</th>
                <th>A bordo</th>
                <th>EHSQ</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const r = resultados.find((x) => x.archivo === f.archivo);
                return (
                  <tr key={f.archivo}>
                    <td style={{ fontSize: 12 }}>{f.archivo}</td>
                    <td className="text-mono">{f.numeroFinal ?? "—"}</td>
                    <td className="text-mono">{fmtFecha2(f.fechaFinal)}</td>
                    <td>{f.ubicacion}</td>
                    <td className="text-mono">{f.aBordo}</td>
                    <td className="text-mono">{f.eventos}</td>
                    <td style={{ fontSize: 13 }}>
                      {r ? (
                        <span className={`badge ${r.estado === "error" ? "b-red" : r.estado === "omitido" ? "b-gray" : "b-green"}`}>
                          {r.estado}
                        </span>
                      ) : f.bloqueado ? (
                        <span className="badge b-red">No se importa</span>
                      ) : f.existe ? (
                        <span className="badge b-gray">{sobrescribir ? "Se reemplaza" : "Ya cargado"}</span>
                      ) : (
                        <span className="badge b-blue">Nuevo</span>
                      )}{" "}
                      {[f.bloqueado, f.nota, r?.mensaje, ...(r ? [] : f.avisos)].filter(Boolean).join(" ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {resultados.length > 0 && !importando && (
        <div className="info-box accent">
          Listo: {cuenta("creado")} creados, {cuenta("actualizado")} reemplazados, {cuenta("omitido")} omitidos,{" "}
          {cuenta("error")} con error. <Link href="/dpr">Ver el listado</Link> ·{" "}
          <Link href="/dpr/dashboard">Ver el dashboard</Link>
        </div>
      )}
    </div>
  );
}
