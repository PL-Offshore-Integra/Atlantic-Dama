import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtFecha2, fmtNum, mgoFin, type Dpr } from "@/lib/dpr";

export default async function DprListaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("dpr").select("*").order("fecha", { ascending: false }).limit(200);
  const dprs = (data ?? []) as Dpr[];

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">{dprs.length} reportes</span>
        <div className="flex-gap">
          <Link href="/dpr/tripulacion" className="btn btn-ghost">
            Tripulacion y pasajeros
          </Link>
          <Link href="/dpr/nuevo" className="btn btn-primary">
            Nuevo DPR
          </Link>
        </div>
      </div>
      <div className="card table-wrap">
        {dprs.length === 0 ? (
          <div className="empty-state">Todavia no hay reportes cargados.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha</th>
                <th>Ubicacion</th>
                <th>POB</th>
                <th>MGO cons.</th>
                <th>MGO cierre</th>
                <th>Cargado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dprs.map((d) => (
                <tr key={d.id}>
                  <td className="text-mono">
                    <Link href={`/dpr/${d.id}`}>{d.numero}</Link>
                  </td>
                  <td className="text-mono">{fmtFecha2(d.fecha)}</td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
