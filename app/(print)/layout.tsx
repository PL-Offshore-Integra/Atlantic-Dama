import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import "./dpr-hoja.css";

// Vistas para imprimir: sin barra ni menu lateral, pero con sesion obligatoria.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="print-body">{children}</div>;
}
