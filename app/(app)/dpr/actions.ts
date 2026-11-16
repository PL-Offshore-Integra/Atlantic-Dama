"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { persistirDpr } from "@/lib/dpr-guardar";

export async function guardarDpr(id: string | null, formData: FormData) {
  const payload = formData.get("payload");
  if (typeof payload !== "string") throw new Error("Formulario vacio.");
  const raw = JSON.parse(payload) as Record<string, unknown>;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const dprId = await persistirDpr(supabase, id, raw, user?.email ?? null);
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
