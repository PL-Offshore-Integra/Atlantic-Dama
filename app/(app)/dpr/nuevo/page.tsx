import { createClient } from "@/lib/supabase/server";
import DprForm from "@/components/DprForm";
import { fmtFecha2, hoyISO, sumarDias } from "@/lib/dpr";
import { stateNuevo } from "@/lib/dpr-form";
import { anteriorA, eventosDe, proyectosDelBuque } from "@/lib/dpr-datos";
import { guardarDpr } from "../actions";

export default async function NuevoDprPage() {
  const supabase = await createClient();
  const { anterior, tripulacion } = await anteriorA(supabase, null);
  const fecha = anterior ? sumarDias(anterior.fecha, 1) : hoyISO();
  const [eventos, proyectos] = await Promise.all([eventosDe(supabase, fecha), proyectosDelBuque(supabase)]);

  return (
    <DprForm
      action={guardarDpr.bind(null, null)}
      proyectos={proyectos}
      inicial={stateNuevo(anterior, tripulacion ?? [], eventos)}
      tripulacionAnterior={tripulacion}
      numeroAnterior={anterior?.numero ?? null}
      avisoPrecarga={
        anterior
          ? `Precargado a partir del DPR ${anterior.numero} (${fmtFecha2(anterior.fecha)}): datos del contrato, ROB de arranque y la misma tripulacion a bordo. En la pestaña Tripulacion marcá quien bajo y agregá quien subio.`
          : undefined
      }
    />
  );
}
