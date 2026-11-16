import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FiltroProyecto from "@/components/FiltroProyecto";
import { fmtFecha2, fmtNum, mgoFin, type Dpr } from "@/lib/dpr";
import { proyectosDelBuque } from "@/lib/dpr-datos";

export default async function DprListaPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const { proyecto = "" } = await searchParams;
  const supabase = await createClient();

  let q = supabase.from("dpr").select("*").order("fecha", { ascending: false }).limit(500);
  if (proyecto === "sin") q = q.is("proyecto_id", null);
  else if (proyecto) q = q.eq("proyecto_id", proyecto);
  const [{ data }, proyectos] = await Promise.all([q, proyectosDelBuque(supabase)]);
  const dprs = (data ?? []) as Dpr[];
  const porId = new Map(proyectos.map((p) => [p.id, p]));

  return (
    <div>
      <div className="flex-between mb16">
        <div className="flex-gap">
          <FiltroProyecto proyectos={proyectos} valor={proyecto} />
          <span className="tag">{dprs.length} reportes</span>
        </div>
        <Link href="/dpr/nuevo" className="btn btn-primary">
          Nuevo DPR
        </Link>
      </div>
      <div className="card table-wrap">
        {dprs.length === 0 ? (
          <div className="empty-state">
            {proyecto ? "No hay reportes de ese proyecto." : "Todavia no hay reportes cargados."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Ubicacion</th>
                <th>POB</th>
                <th>MGO cons.</th>
                <th>MGO cierre</th>
                <th>Cargado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dprs.map((d) => {
                const p = d.proyecto_id ? porId.get(d.proyecto_id) : undefined;
                return (
                  <tr key={d.id}>
                    <td className="text-mono">
                      <Link href={`/dpr/${d.id}`}>{d.numero}</Link>
                    </td>
                    <td className="text-mono">{fmtFecha2(d.fecha)}</td>
                    <td>
                      {p ? (
                        <>
                          <span className="text-mono">{p.nro_proyecto}</span>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            {p.nombre}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">Sin proyecto</span>
                      )}
                    </td>
                    <td>{d.ubicacion}</td>
                    <td className="text-mono">{d.pob}</td>
                    <td className="text-mono">{fmtNum(d.mgo_consumo)}</td>
                    <td className="text-mono">{fmtNum(mgoFin(d))}</td>
                    <td className="text-muted">{d.usuario_email}</td>
                    <td>
                      <div className="flex-gap" style={{ justifyContent: "flex-end" }}>
                        <Link href={`/dpr/${d.id}`} className="btn btn-ghost btn-sm">
                          Editar
                        </Link>
                        <Link href={`/dpr/${d.id}/imprimir`} className="btn btn-ghost btn-sm" target="_blank">
                          Imprimir
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
