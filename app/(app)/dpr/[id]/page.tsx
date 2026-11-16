import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DprForm from "@/components/DprForm";
import ConfirmarSubmit from "@/components/ConfirmarSubmit";
import type { Dpr } from "@/lib/dpr";
import { stateDesdeDpr } from "@/lib/dpr-form";
import { anteriorA, eventosDe, proyectosDelBuque, shipmentDe, tripulacionDe } from "@/lib/dpr-datos";
import { eliminarDpr, guardarDpr } from "../actions";

export default async function EditarDprPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: dpr } = await supabase.from("dpr").select("*").eq("id", id).maybeSingle();
  if (!dpr) notFound();
  const d = dpr as Dpr;
  const [tripulacion, eventos, shipment, ant, proyectos] = await Promise.all([
    tripulacionDe(supabase, id),
    eventosDe(supabase, d.fecha),
    shipmentDe(supabase, id),
    anteriorA(supabase, d.fecha),
    proyectosDelBuque(supabase),
  ]);

  return (
    <div>
      <div className="flex-between mb16">
        <span className="tag">DPR {d.numero}</span>
        <div className="flex-gap">
          <Link href={`/dpr/${id}/imprimir`} className="btn btn-primary btn-sm" target="_blank">
            Ver / imprimir
          </Link>
          <form action={eliminarDpr.bind(null, id)}>
            <ConfirmarSubmit mensaje={`¿Eliminar el DPR ${d.numero}? No se puede deshacer.`}>
              Eliminar
            </ConfirmarSubmit>
          </form>
        </div>
      </div>
      <DprForm
        key={d.updated_at}
        action={guardarDpr.bind(null, id)}
        proyectos={proyectos}
        ribDisponibleAnterior={ant.anterior?.rib_comb_disponible ?? null}
        inicial={stateDesdeDpr(d, tripulacion, eventos, shipment)}
        tripulacionAnterior={ant.tripulacion}
        numeroAnterior={ant.anterior?.numero ?? null}
      />
    </div>
  );
}
