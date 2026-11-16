"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CAMPOS_NUMERICOS,
  CAMPOS_TEXTO,
  DRILLS,
  OPERACIONES,
  SAFETY_CARDS_FILAS,
  jornadaDe,
  normalizarGuardias,
  parseNum,
} from "@/lib/dpr";

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Arma la fila de atlantic_dama.dpr a partir del JSON que manda el formulario. */
function filaDesdePayload(raw: Record<string, unknown>) {
  const numero = parseNum(raw.numero);
  const fecha = texto(raw.fecha);
  if (!numero || !Number.isInteger(numero)) throw new Error("Falta el numero de DPR.");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("Falta la fecha del DPR.");

  const fila: Record<string, unknown> = { numero, fecha };
  for (const k of CAMPOS_TEXTO) fila[k] = texto(raw[k]);
  for (const k of CAMPOS_NUMERICOS) fila[k] = parseNum(raw[k]);
  fila.proyecto_id = texto(raw.proyecto_id);
  fila.huso = fila.huso ?? "UTC-3";
  fila.buque = fila.buque ?? "Atlantic Dama";

  const opsValidas = new Set<string>(OPERACIONES.map((o) => o.key));
  const drillsValidos = new Set<string>(DRILLS.map((d) => d.key));
  fila.operaciones = (Array.isArray(raw.operaciones) ? raw.operaciones : []).filter((k) =>
    opsValidas.has(String(k))
  );
  fila.drills = (Array.isArray(raw.drills) ? raw.drills : []).filter((k) => drillsValidos.has(String(k)));
  fila.guardias = normalizarGuardias(raw.guardias);
  const cards = Array.isArray(raw.safety_cards) ? raw.safety_cards.map((c) => String(c ?? "")) : [];
  fila.safety_cards = cards.slice(0, SAFETY_CARDS_FILAS);
  return fila as Record<string, unknown> & { numero: number; fecha: string };
}

/** Escribe la jornada (fecha del DPR - 1) en la tabla de consumo diario. */
async function guardarJornada(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dprId: string,
  fila: Record<string, unknown> & { fecha: string },
  fechaAnterior?: string
) {
  if (fechaAnterior && fechaAnterior !== fila.fecha) {
    await supabase.from("dpr_consumo_diario").delete().eq("dpr_id", dprId);
  }
  const { error } = await supabase.from("dpr_consumo_diario").upsert(
    {
      fecha: jornadaDe(fila.fecha),
      consumo: fila.mgo_consumo ?? null,
      horas_0: fila.horas_0 ?? 0,
      horas_1: fila.horas_1 ?? 0,
      horas_2: fila.horas_2 ?? 0,
      dpr_id: dprId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fecha" }
  );
  if (error) throw new Error(error.message);
}

const txt = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const lista = (v: unknown) =>
  (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");

/** Reemplaza la lista de a bordo y el shipment del DPR, y los eventos EHSQ de su fecha. */
async function guardarListas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dprId: string,
  fecha: string,
  fechaAnterior: string | undefined,
  raw: Record<string, unknown>
) {
  const tripulacion = lista(raw.tripulacion)
    .filter((p) => txt(p.nombre))
    .map((p, i) => ({
      dpr_id: dprId,
      tipo: p.tipo === "pasajero" ? "pasajero" : "tripulante",
      orden: i + 1,
      cargo: txt(p.cargo),
      nombre: txt(p.nombre) as string,
      apellido: txt(p.apellido),
      nacionalidad: txt(p.nacionalidad),
      pasaporte: txt(p.pasaporte),
      pasaporte_vence: txt(p.pasaporte_vence),
      fecha_nacimiento: txt(p.fecha_nacimiento),
      fecha_embarque: txt(p.fecha_embarque),
    }));
  const eventos = lista(raw.eventos)
    .filter((e) => txt(e.tipo))
    .map((e, i) => ({
      fecha,
      tipo: txt(e.tipo) as string,
      tarea: txt(e.tarea),
      personas: parseNum(e.personas),
      lugar: txt(e.lugar),
      hora_inicio: txt(e.hora_inicio),
      hora_fin: txt(e.hora_fin),
      orden: i + 1,
    }));
  const shipment = lista(raw.shipment)
    .filter((x) => ["bl_awb", "po", "bultos", "peso", "comentario"].some((k) => txt(x[k])))
    .map((x, i) => ({
      dpr_id: dprId,
      orden: i + 1,
      bl_awb: txt(x.bl_awb),
      po: txt(x.po),
      bultos: txt(x.bultos),
      peso: txt(x.peso),
      comentario: txt(x.comentario),
    }));

  const chk = (r: { error: { message: string } | null }) => {
    if (r.error) throw new Error(r.error.message);
  };
  chk(await supabase.from("dpr_tripulacion").delete().eq("dpr_id", dprId));
  if (tripulacion.length) chk(await supabase.from("dpr_tripulacion").insert(tripulacion));
  chk(await supabase.from("dpr_shipment").delete().eq("dpr_id", dprId));
  if (shipment.length) chk(await supabase.from("dpr_shipment").insert(shipment));
  const fechas = [...new Set([fecha, fechaAnterior].filter((f): f is string => !!f))];
  chk(await supabase.from("ehsq_eventos").delete().in("fecha", fechas));
  if (eventos.length) chk(await supabase.from("ehsq_eventos").insert(eventos));
}

export async function guardarDpr(id: string | null, formData: FormData) {
  const payload = formData.get("payload");
  if (typeof payload !== "string") throw new Error("Formulario vacio.");
  const raw = JSON.parse(payload) as Record<string, unknown>;
  const fila = filaDesdePayload(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  fila.usuario_email = user?.email ?? null;

  let dprId = id;
  if (id) {
    const { data: previo } = await supabase.from("dpr").select("fecha").eq("id", id).single();
    const { error } = await supabase.from("dpr").update(fila).eq("id", id);
    if (error) throw new Error(traducirError(error.message));
    await guardarJornada(supabase, id, fila, previo?.fecha);
    await guardarListas(supabase, id, fila.fecha, previo?.fecha, raw);
  } else {
    const { data, error } = await supabase.from("dpr").insert(fila).select("id").single();
    if (error) throw new Error(traducirError(error.message));
    dprId = data.id;
    await guardarJornada(supabase, data.id, fila);
    await guardarListas(supabase, data.id, fila.fecha, undefined, raw);
  }

  revalidatePath("/dpr");
  redirect(`/dpr/${dprId}`);
}

export async function eliminarDpr(id: string) {
  const supabase = await createClient();
  await supabase.from("dpr_consumo_diario").delete().eq("dpr_id", id);
  const { error } = await supabase.from("dpr").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dpr");
  redirect("/dpr");
}

function traducirError(msg: string) {
  if (msg.includes("dpr_numero_key")) return "Ya existe un DPR con ese numero.";
  if (msg.includes("dpr_fecha_key")) return "Ya existe un DPR con esa fecha.";
  return msg;
}
