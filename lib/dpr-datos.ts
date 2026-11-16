import type { createClient } from "@/lib/supabase/server";
import {
  eventoDesdeFila,
  shipmentDesdeFila,
  tripulanteDesdeFila,
  type Dpr,
  type EventoHse,
  type Proyecto,
  type Shipment,
  type Tripulante,
} from "@/lib/dpr";

type Supa = Awaited<ReturnType<typeof createClient>>;

export async function tripulacionDe(supabase: Supa, dprId: string): Promise<Tripulante[]> {
  const { data } = await supabase
    .from("dpr_tripulacion")
    .select("*")
    .eq("dpr_id", dprId)
    .order("tipo", { ascending: false }) // tripulante antes que pasajero
    .order("orden");
  return (data ?? []).map(tripulanteDesdeFila);
}

export async function eventosDe(supabase: Supa, desde: string, hasta = desde): Promise<(EventoHse & { fecha: string })[]> {
  const { data } = await supabase
    .from("ehsq_eventos")
    .select("*")
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha")
    .order("orden");
  return (data ?? []).map((r) => ({ ...eventoDesdeFila(r), fecha: String(r.fecha) }));
}

export async function shipmentDe(supabase: Supa, dprId: string): Promise<Shipment[]> {
  const { data } = await supabase.from("dpr_shipment").select("*").eq("dpr_id", dprId).order("orden");
  return (data ?? []).map(shipmentDesdeFila);
}

/** Listas de a bordo de muchos DPR. La API devuelve hasta 1000 filas por pedido,
 *  asi que se trae por paginas (un proyecto largo tiene miles de filas). */
export async function tripulacionDeVarios(supabase: Supa, dprIds: string[]) {
  const filas: Record<string, unknown>[] = [];
  for (let i = 0; i < dprIds.length; i += 40) {
    const lote = dprIds.slice(i, i + 40);
    for (let desde = 0; ; desde += 1000) {
      const { data, error } = await supabase
        .from("dpr_tripulacion")
        .select("*")
        .in("dpr_id", lote)
        .order("dpr_id")
        .order("tipo", { ascending: false })
        .order("orden")
        .range(desde, desde + 999);
      if (error) throw new Error(error.message);
      filas.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
  }
  return { data: filas };
}

/** Proyectos del buque (modulo Comercial), primero los en curso y los mas nuevos. */
export async function proyectosDelBuque(supabase: Supa): Promise<Proyecto[]> {
  const { data } = await supabase
    .from("proyectos")
    .select("id, nro_proyecto, nombre, compania, estado")
    .order("fecha_inicio_estimada", { ascending: false, nullsFirst: false });
  const lista = (data ?? []) as Proyecto[];
  return [...lista.filter((p) => p.estado === "en_curso"), ...lista.filter((p) => p.estado !== "en_curso")];
}

/** DPR inmediatamente anterior (por fecha) y su lista de a bordo. */
export async function anteriorA(supabase: Supa, fecha: string | null) {
  let q = supabase.from("dpr").select("*").order("fecha", { ascending: false }).limit(1);
  if (fecha) q = q.lt("fecha", fecha);
  const { data } = await q.maybeSingle();
  if (!data) return { anterior: null as Dpr | null, tripulacion: null as Tripulante[] | null };
  const anterior = data as Dpr;
  return { anterior, tripulacion: await tripulacionDe(supabase, anterior.id) };
}
