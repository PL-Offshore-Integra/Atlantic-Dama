import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DprForm from "@/components/DprForm";
import ConfirmarSubmit from "@/components/ConfirmarSubmit";
import type { Dpr, Persona } from "@/lib/dpr";
import { stateDesdeDpr } from "@/lib/dpr-form";
import { eliminarDpr, guardarDpr } from "../actions";

export default async function EditarDprPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: dpr }, { data: personas }] = await Promise.all([
    supabase.from("dpr").select("*").eq("id", id).maybeSingle(),
    supabase.from("dpr_personas").select("*").order("orden"),
  ]);
  if (!dpr) notFound();
  const d = dpr as Dpr;

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
        inicial={stateDesdeDpr(d)}
        personas={(personas ?? []) as Persona[]}
      />
    </div>
  );
}
