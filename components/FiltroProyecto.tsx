"use client";

import { usePathname, useRouter } from "next/navigation";
import { etiquetaProyecto, type Proyecto } from "@/lib/dpr";

/** Filtro del listado de DPR por proyecto (se guarda en ?proyecto=). */
export default function FiltroProyecto({ proyectos, valor }: { proyectos: Proyecto[]; valor: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      className="filter-select"
      aria-label="Filtrar por proyecto"
      value={valor}
      onChange={(e) => router.push(e.target.value ? `${pathname}?proyecto=${e.target.value}` : pathname)}
      style={{ minWidth: 280 }}
    >
      <option value="">Todos los proyectos</option>
      {proyectos.map((p) => (
        <option key={p.id} value={p.id}>
          {etiquetaProyecto(p)}
        </option>
      ))}
      <option value="sin">Sin proyecto</option>
    </select>
  );
}
