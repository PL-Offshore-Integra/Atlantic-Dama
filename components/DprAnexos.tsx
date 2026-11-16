import { fmtFecha2, nombreCompleto, type Dpr, type EventoHse, type Shipment, type Tripulante } from "@/lib/dpr";

// Hojas que acompañan a la DR en la planilla: CREW AND PAX LIST,
// AD - EHSQ Event y Shipment.

function Encabezado({ dpr, titulo }: { dpr: Dpr; titulo: string }) {
  return (
    <div className="anx-head">
      <div className="anx-titulo">{titulo}</div>
      <div className="anx-meta">
        {dpr.buque} · DPR {dpr.numero} · {fmtFecha2(dpr.fecha)}
      </div>
    </div>
  );
}

export function HojaTripulacion({
  dpr,
  tripulacion,
  subieron,
  bajaron,
  numeroAnterior,
}: {
  dpr: Dpr;
  tripulacion: Tripulante[];
  subieron: Tripulante[];
  bajaron: Tripulante[];
  numeroAnterior: number | null;
}) {
  const crew = tripulacion.filter((p) => p.tipo === "tripulante");
  const pax = tripulacion.filter((p) => p.tipo === "pasajero");
  return (
    <div className="hoja anx">
      <Encabezado dpr={dpr} titulo="CREW AND PAX LIST" />
      <div className="anx-sub">CREW LIST</div>
      <table className="anx-t">
        <thead>
          <tr>
            <th>#</th>
            <th>NAME</th>
            <th>RANK</th>
            <th>NATIONALITY</th>
            <th>PASSPORT NUMBER</th>
            <th>DATE SIGNED ON</th>
          </tr>
        </thead>
        <tbody>
          {crew.map((p, i) => (
            <tr key={i}>
              <td className="cen">{i + 1}</td>
              <td>{nombreCompleto(p)}</td>
              <td>{p.cargo}</td>
              <td>{p.nacionalidad}</td>
              <td>{p.pasaporte}</td>
              <td className="cen">{fmtFecha2(p.fecha_embarque)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="anx-sub">PASSENGERS LIST</div>
      <table className="anx-t">
        <thead>
          <tr>
            <th>#</th>
            <th>Position</th>
            <th>First Name</th>
            <th>Surname</th>
            <th>Nationality</th>
            <th>Passport No</th>
            <th>Passport Expiry</th>
            <th>Date of Birth</th>
          </tr>
        </thead>
        <tbody>
          {pax.length === 0 && (
            <tr>
              <td colSpan={8} className="cen">
                No passengers on board
              </td>
            </tr>
          )}
          {pax.map((p, i) => (
            <tr key={i}>
              <td className="cen">{i + 1}</td>
              <td>{p.cargo}</td>
              <td>{p.nombre}</td>
              <td>{p.apellido}</td>
              <td>{p.nacionalidad}</td>
              <td>{p.pasaporte}</td>
              <td className="cen">{fmtFecha2(p.pasaporte_vence)}</td>
              <td className="cen">{fmtFecha2(p.fecha_nacimiento)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="anx-sub">
        CREW CHANGE {numeroAnterior ? `(vs. DPR ${numeroAnterior})` : ""} · P.O.B. {tripulacion.length}
      </div>
      <table className="anx-t">
        <tbody>
          <tr>
            <th style={{ width: 140 }}>Signed on</th>
            <td>
              {subieron.length === 0
                ? "—"
                : subieron.map((p) => `${p.cargo ? `${p.cargo}: ` : ""}${nombreCompleto(p)}`).join(" · ")}
            </td>
          </tr>
          <tr>
            <th>Signed off</th>
            <td>
              {bajaron.length === 0
                ? "—"
                : bajaron.map((p) => `${p.cargo ? `${p.cargo}: ` : ""}${nombreCompleto(p)}`).join(" · ")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function HojaEhsq({ dpr, eventos }: { dpr: Dpr; eventos: (EventoHse & { fecha: string })[] }) {
  return (
    <div className="hoja anx">
      <Encabezado dpr={dpr} titulo={`${dpr.buque} - EHSQ Events Record`} />
      <table className="anx-t">
        <thead>
          <tr>
            <th>EHSQ Event</th>
            <th>Task</th>
            <th>Personnel Involved</th>
            <th>Location</th>
            <th>Date</th>
            <th>Start time (LMT)</th>
            <th>End Time</th>
          </tr>
        </thead>
        <tbody>
          {eventos.length === 0 && (
            <tr>
              <td colSpan={7} className="cen">
                No events recorded
              </td>
            </tr>
          )}
          {eventos.map((e, i) => (
            <tr key={i} className={e.fecha === dpr.fecha ? "anx-hoy" : undefined}>
              <td>{e.tipo}</td>
              <td>{e.tarea}</td>
              <td className="cen">{e.personas}</td>
              <td>{e.lugar}</td>
              <td className="cen">{fmtFecha2(e.fecha)}</td>
              <td className="cen">{e.hora_inicio}</td>
              <td className="cen">{e.hora_fin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HojaShipment({ dpr, shipment }: { dpr: Dpr; shipment: Shipment[] }) {
  return (
    <div className="hoja anx">
      <Encabezado dpr={dpr} titulo="SHIPMENT" />
      <table className="anx-t">
        <thead>
          <tr>
            <th>B/L or AWB No.</th>
            <th>PO Number</th>
            <th>No. of Boxes, pallet, etc</th>
            <th>Weight</th>
            <th>AGENT Comment</th>
          </tr>
        </thead>
        <tbody>
          {shipment.map((s, i) => (
            <tr key={i}>
              <td>{s.bl_awb}</td>
              <td>{s.po}</td>
              <td>{s.bultos}</td>
              <td>{s.peso}</td>
              <td>{s.comentario}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
