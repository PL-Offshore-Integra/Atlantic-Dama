import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ConfirmarSubmit from "@/components/ConfirmarSubmit";
import { aBordo, fmtFecha2, hoyISO, type Persona } from "@/lib/dpr";
import { eliminarPersona, guardarPersona } from "../actions";

export default async function TripulacionPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; nuevo?: string }>;
}) {
  const { editar, nuevo } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("dpr_personas").select("*").order("orden");
  const personas = (data ?? []) as Persona[];
  const hoy = hoyISO();
  const bordo = aBordo(personas, hoy);
  const idsABordo = new Set([...bordo.tripulantes, ...bordo.pasajeros].map((p) => p.id));
  const v = editar ? personas.find((p) => p.id === editar) : undefined;
  const mostrarForm = Boolean(v) || nuevo === "tripulante" || nuevo === "pasajero";
  const tipoNuevo = nuevo === "pasajero" ? "pasajero" : "tripulante";

  const grupo = (tipo: Persona["tipo"], titulo: string) => {
    const lista = personas.filter((p) => p.tipo === tipo);
    return (
      <div className="card table-wrap">
        <div className="card-title">
          {titulo}
          <Link href={`/dpr/tripulacion?nuevo=${tipo}`} className="btn btn-ghost btn-sm">
            Agregar
          </Link>
        </div>
        {lista.length === 0 ? (
          <div className="empty-state">Sin cargar.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{tipo === "tripulante" ? "Cargo (DPR)" : "Position"}</th>
                <th>Nombre</th>
                <th>Nacionalidad</th>
                <th>Pasaporte</th>
                <th>Embarque</th>
                <th>Desembarque</th>
                <th>Hoy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="text-mono">{p.orden}</td>
                  <td>{p.cargo}</td>
                  <td>{[p.nombre, p.apellido].filter(Boolean).join(" ")}</td>
                  <td>{p.nacionalidad}</td>
                  <td className="text-mono">{p.pasaporte}</td>
                  <td className="text-mono">{fmtFecha2(p.fecha_embarque)}</td>
                  <td className="text-mono">{fmtFecha2(p.fecha_desembarque)}</td>
                  <td>
                    <span className={`badge ${idsABordo.has(p.id) ? "b-green" : "b-gray"}`}>
                      {idsABordo.has(p.id) ? "A bordo" : "Fuera"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dpr/tripulacion?editar=${p.id}`} className="btn btn-ghost btn-sm">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="info-box accent mb16">
        Hoy ({fmtFecha2(hoy)}) hay a bordo {bordo.tripulantes.length} tripulantes y {bordo.pasajeros.length}{" "}
        pasajeros. Cada DPR lista a quienes estaban a bordo en su fecha. En un relevo, cargá la fecha de
        desembarque del que baja y agregá al que sube con su fecha de embarque, sin borrar al anterior, asi
        los DPR viejos siguen saliendo bien.
      </div>

      {mostrarForm && (
        <form action={guardarPersona.bind(null, v?.id ?? null)} className="card" style={{ maxWidth: 960 }}>
          <div className="card-title">{v ? "Editar persona" : "Agregar persona"}</div>
          <div className="form-grid g4">
            <div className="fg">
              <label>Tipo</label>
              <select name="tipo" defaultValue={v?.tipo ?? tipoNuevo}>
                <option value="tripulante">Tripulante</option>
                <option value="pasajero">Pasajero</option>
              </select>
            </div>
            <div className="fg">
              <label>Orden en el DPR</label>
              <input name="orden" inputMode="numeric" defaultValue={v?.orden ?? ""} />
            </div>
            <div className="fg">
              <label>Cargo / position</label>
              <input name="cargo" defaultValue={v?.cargo ?? ""} placeholder="Captain, Ch.Mate, AB..." />
            </div>
            <div className="fg">
              <label>Nombre</label>
              <input name="nombre" defaultValue={v?.nombre ?? ""} required />
            </div>
            <div className="fg">
              <label>Apellido (pasajeros)</label>
              <input name="apellido" defaultValue={v?.apellido ?? ""} />
            </div>
            <div className="fg">
              <label>Nacionalidad</label>
              <input name="nacionalidad" defaultValue={v?.nacionalidad ?? ""} />
            </div>
            <div className="fg">
              <label>Pasaporte</label>
              <input name="pasaporte" defaultValue={v?.pasaporte ?? ""} />
            </div>
            <div className="fg">
              <label>Vence pasaporte</label>
              <input type="date" name="pasaporte_vence" defaultValue={v?.pasaporte_vence ?? ""} />
            </div>
            <div className="fg">
              <label>Fecha de nacimiento</label>
              <input type="date" name="fecha_nacimiento" defaultValue={v?.fecha_nacimiento ?? ""} />
            </div>
            <div className="fg">
              <label>Embarque</label>
              <input type="date" name="fecha_embarque" defaultValue={v?.fecha_embarque ?? ""} />
            </div>
            <div className="fg">
              <label>Desembarque</label>
              <input type="date" name="fecha_desembarque" defaultValue={v?.fecha_desembarque ?? ""} />
            </div>
          </div>
          <div className="flex-between">
            <Link href="/dpr/tripulacion" className="btn btn-ghost">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      )}
      {v && (
        <form action={eliminarPersona.bind(null, v.id)} className="mb16">
          <ConfirmarSubmit
            mensaje={`¿Eliminar a ${v.nombre}? Desaparece tambien de los DPR ya cargados. Para un relevo usá la fecha de desembarque.`}
          >
            Eliminar persona
          </ConfirmarSubmit>
        </form>
      )}

      {grupo("tripulante", "Tripulacion")}
      {grupo("pasajero", "Pasajeros")}
    </div>
  );
}
