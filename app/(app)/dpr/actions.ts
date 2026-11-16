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

export async function guardarDpr(id: string | null, formData: FormData) {
  const payload = formData.get("payload");
  if (typeof payload !== "string") throw new Error("Formulario vacio.");
  const fila = filaDesdePayload(JSON.parse(payload));

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
  } else {
    const { data, error } = await supabase.from("dpr").insert(fila).select("id").single();
    if (error) throw new Error(traducirError(error.message));
    dprId = data.id;
    await guardarJornada(supabase, data.id, fila);
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

// ── tripulacion y pasajeros ──

function filaPersona(formData: FormData) {
  const s = (k: string) => texto(formData.get(k));
  const tipo = s("tipo") === "pasajero" ? "pasajero" : "tripulante";
  return {
    tipo,
    orden: parseNum(formData.get("orden")) ?? 0,
    cargo: s("cargo"),
    nombre: s("nombre") ?? "",
    apellido: s("apellido"),
    nacionalidad: s("nacionalidad"),
    pasaporte: s("pasaporte"),
    pasaporte_vence: s("pasaporte_vence"),
    fecha_nacimiento: s("fecha_nacimiento"),
    fecha_embarque: s("fecha_embarque"),
    fecha_desembarque: s("fecha_desembarque"),
  };
}

export async function guardarPersona(id: string | null, formData: FormData) {
  const fila = filaPersona(formData);
  if (!fila.nombre) throw new Error("Falta el nombre.");
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("dpr_personas").update(fila).eq("id", id)
    : await supabase.from("dpr_personas").insert(fila);
  if (error) throw new Error(error.message);
  revalidatePath("/dpr/tripulacion");
  redirect("/dpr/tripulacion");
}

export async function eliminarPersona(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("dpr_personas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dpr/tripulacion");
  redirect("/dpr/tripulacion");
}
