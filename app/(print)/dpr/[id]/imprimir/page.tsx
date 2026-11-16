import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DprHoja from "@/components/DprHoja";
import { HojaEhsq, HojaShipment, HojaTripulacion } from "@/components/DprAnexos";
import BotonImprimir from "@/components/BotonImprimir";
import {
  diasCombustible,
  diffTripulacion,
  jornadaDe,
  mgoFin,
  sumarDias,
  tablaMensual,
  type ConsumoDiario,
  type Dpr,
} from "@/lib/dpr";
import { anteriorA, eventosDe, shipmentDe, tripulacionDe } from "@/lib/dpr-datos";

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
  const [{ data: consumos }, tripulacion, eventosMes, shipment, ant] = await Promise.all([
    supabase.from("dpr_consumo_diario").select("*").gte("fecha", desde).lte("fecha", jornada).order("fecha"),
    tripulacionDe(supabase, id),
    // registro EHSQ: del 1 del mes del DPR hasta su fecha
    eventosDe(supabase, `${dpr.fecha.slice(0, 7)}-01`, dpr.fecha),
    shipmentDe(supabase, id),
    anteriorA(supabase, dpr.fecha),
  ]);
  const c = (consumos ?? []) as ConsumoDiario[];
  const ultimos7 = c.filter((x) => x.fecha >= sumarDias(jornada, -6)).map((x) => x.consumo);

  // Toolbox / Safety meeting registrados en el dia marcan su X en la hoja DR
  const delDia = eventosMes.filter((e) => e.fecha === dpr.fecha).map((e) => e.tipo.toLowerCase());
  const drills = new Set(dpr.drills ?? []);
  if (delDia.includes("toolbox")) drills.add("toolbox");
  if (delDia.includes("safety meeting")) drills.add("safety_meeting");
  const { subieron, bajaron } = diffTripulacion(ant.tripulacion, tripulacion);

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
        dpr={{ ...dpr, drills: [...drills] }}
        tripulantes={tripulacion.filter((p) => p.tipo === "tripulante")}
        mes={tablaMensual(dpr.fecha, c)}
        diasCombustible={diasCombustible(mgoFin(dpr), ultimos7)}
      />
      <HojaTripulacion
        dpr={dpr}
        tripulacion={tripulacion}
        subieron={subieron}
        bajaron={bajaron}
        numeroAnterior={ant.anterior?.numero ?? null}
      />
      <HojaEhsq dpr={dpr} eventos={eventosMes} />
      {shipment.length > 0 && <HojaShipment dpr={dpr} shipment={shipment} />}
    </>
  );
}
