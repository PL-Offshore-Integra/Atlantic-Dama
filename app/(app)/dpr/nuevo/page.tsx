import { createClient } from "@/lib/supabase/server";
import DprForm from "@/components/DprForm";
import { fmtFecha2, type Dpr, type Persona } from "@/lib/dpr";
import { stateNuevo } from "@/lib/dpr-form";
import { guardarDpr } from "../actions";

export default async function NuevoDprPage() {
  const supabase = await createClient();
  const [{ data: ultimo }, { data: personas }] = await Promise.all([
    supabase.from("dpr").select("*").order("fecha", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("dpr_personas").select("*").order("orden"),
  ]);
  const u = (ultimo ?? null) as Dpr | null;

  return (
    <DprForm
      action={guardarDpr.bind(null, null)}
      inicial={stateNuevo(u, (personas ?? []) as Persona[])}
      personas={(personas ?? []) as Persona[]}
      avisoPrecarga={
        u
          ? `Precargado a partir del DPR ${u.numero} (${fmtFecha2(u.fecha)}): datos del contrato, ROB de arranque y tripulacion a bordo. Revisá y completá lo del dia.`
          : undefined
      }
    />
  );
}
