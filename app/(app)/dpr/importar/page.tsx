import { createClient } from "@/lib/supabase/server";
import ImportadorDpr from "@/components/ImportadorDpr";
import { proyectosDelBuque } from "@/lib/dpr-datos";

export default async function ImportarDprPage() {
  const supabase = await createClient();
  const [proyectos, { data }] = await Promise.all([
    proyectosDelBuque(supabase),
    supabase.from("dpr").select("numero, fecha"),
  ]);
  return (
    <ImportadorDpr
      proyectos={proyectos}
      existentes={(data ?? []).map((d) => ({ numero: Number(d.numero), fecha: String(d.fecha) }))}
    />
  );
}
