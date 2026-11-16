"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { leerDprExcel } from "@/lib/dpr-excel";
import { persistirDpr } from "@/lib/dpr-guardar";

export interface Analisis {
  archivo: string;
  numero: number | null;
  fecha: string;
  numeroArchivo: number | null;
  fechaArchivo: string;
  ubicacion: string;
  aBordo: number;
  eventos: number;
  avisos: string[];
  error?: string;
}

function archivoDe(formData: FormData) {
  const f = formData.get("archivo");
  if (!(f instanceof File)) throw new Error("Falta el archivo.");
  if (f.size > 5 * 1024 * 1024) throw new Error("El archivo pesa mas de 5 MB.");
  return f;
}

/** Lee un Excel y devuelve lo necesario para la vista previa (no guarda nada). */
export async function analizarDprExcel(formData: FormData): Promise<Analisis> {
  const f = archivoDe(formData);
  try {
    const l = await leerDprExcel(f.name, await f.arrayBuffer());
    return {
      archivo: f.name,
      numero: l.numero,
      fecha: l.fecha,
      numeroArchivo: l.numeroArchivo,
      fechaArchivo: l.fechaArchivo,
      ubicacion: String(l.payload.ubicacion ?? ""),
      aBordo: (l.payload.tripulacion as unknown[]).length,
      eventos: (l.payload.eventos as unknown[]).length,
      avisos: l.avisos,
    };
  } catch (e) {
    return {
      archivo: f.name,
      numero: null,
      fecha: "",
      numeroArchivo: null,
      fechaArchivo: "",
      ubicacion: "",
      aBordo: 0,
      eventos: 0,
      avisos: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface ResultadoImport {
  archivo: string;
  estado: "creado" | "actualizado" | "omitido" | "error";
  mensaje: string;
}

/** Importa un Excel como DPR, con el numero y la fecha decididos en la vista previa. */
export async function importarDprExcel(formData: FormData): Promise<ResultadoImport> {
  const f = archivoDe(formData);
  const numero = Number(formData.get("numero"));
  const fecha = String(formData.get("fecha") ?? "");
  const proyectoId = String(formData.get("proyecto_id") ?? "");
  const sobrescribir = formData.get("sobrescribir") === "1";
  try {
    if (!Number.isInteger(numero) || numero <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error("Numero o fecha invalidos.");
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: existentes } = await supabase
      .from("dpr")
      .select("id, numero, fecha")
      .or(`numero.eq.${numero},fecha.eq.${fecha}`);
    const ex = existentes ?? [];
    if (ex.length > 1 || (ex.length === 1 && (ex[0].numero !== numero || ex[0].fecha !== fecha))) {
      const otro = ex.find((x) => x.numero !== numero || x.fecha !== fecha)!;
      return {
        archivo: f.name,
        estado: "error",
        mensaje: `Choca con el DPR ${otro.numero} del ${otro.fecha} ya cargado.`,
      };
    }
    if (ex.length === 1 && !sobrescribir) {
      return { archivo: f.name, estado: "omitido", mensaje: "Ya estaba cargado." };
    }
    const l = await leerDprExcel(f.name, await f.arrayBuffer());
    const payload: Record<string, unknown> = { ...l.payload, numero: String(numero), fecha, proyecto_id: proyectoId };
    // si la planilla no trae eventos EHSQ de esa fecha, no borrar los ya registrados
    if (Array.isArray(payload.eventos) && payload.eventos.length === 0) delete payload.eventos;
    await persistirDpr(supabase, ex[0]?.id ?? null, payload, user?.email ?? null);
    revalidatePath("/dpr");
    return {
      archivo: f.name,
      estado: ex.length ? "actualizado" : "creado",
      mensaje: l.avisos.join(" "),
    };
  } catch (e) {
    return { archivo: f.name, estado: "error", mensaje: e instanceof Error ? e.message : String(e) };
  }
}
