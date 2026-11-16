import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DprHoja from "@/components/DprHoja";
import BotonImprimir from "@/components/BotonImprimir";
import {
  aBordo,
  diasCombustible,
  jornadaDe,
  mgoFin,
  sumarDias,
  tablaMensual,
  type ConsumoDiario,
  type Dpr,
  type Persona,
} from "@/lib/dpr";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("dpr").select("numero, fecha").eq("id", id).maybeSingle();
  if (!data) return { title: "DPR" };
  const [y, m, d] = String(data.fecha).split("-");
  // mismo nombre que la planilla: "AD-DAILY REPORT 106-151126"
  return { title: `AD-DAILY REPORT ${data.numero}-${d}${m}${y.slice(2)}` };
}

export default async function ImprimirDprPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("dpr").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const dpr = data as Dpr;

  const jornada = jornadaDe(dpr.fecha);
  const desde = [`${jornada.slice(0, 7)}-01`, sumarDias(jornada, -6)].sort()[0];
  const [{ data: personas }, { data: consumos }] = await Promise.all([
    supabase.from("dpr_personas").select("*").order("orden"),
    supabase
      .from("dpr_consumo_diario")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", jornada)
      .order("fecha"),
  ]);
  const c = (consumos ?? []) as ConsumoDiario[];
  const ultimos7 = c.filter((x) => x.fecha >= sumarDias(jornada, -6)).map((x) => x.consumo);
  const { tripulantes } = aBordo((personas ?? []) as Persona[], dpr.fecha);

  return (
    <>
      <div className="print-bar">
        <Link href={`/dpr/${id}`} className="btn btn-ghost btn-sm">
          Volver a editar
        </Link>
        <BotonImprimir />
        <span className="hint">Para el PDF elegí &quot;Guardar como PDF&quot; en el dialogo de impresion.</span>
      </div>
      <DprHoja
        dpr={dpr}
        tripulantes={tripulantes}
        mes={tablaMensual(dpr.fecha, c)}
        diasCombustible={diasCombustible(mgoFin(dpr), ultimos7)}
      />
    </>
  );
}
