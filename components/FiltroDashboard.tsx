"use client";

import { usePathname, useRouter } from "next/navigation";
import { etiquetaProyecto, type Proyecto } from "@/lib/dpr";

/** Proyecto y dia (DPR) del dashboard, en la URL (?proyecto=&dpr=). */
export default function FiltroDashboard({
  proyectos,
  proyectoId,
  dprs,
  dprId,
}: {
  proyectos: Proyecto[];
  proyectoId: string;
  dprs: { id: string; etiqueta: string }[];
  dprId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="flex-gap">
      <select
        className="filter-select"
        aria-label="Proyecto"
        value={proyectoId}
        onChange={(e) => router.push(`${pathname}?proyecto=${e.target.value}`)}
        style={{ minWidth: 280 }}
      >
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>
            {etiquetaProyecto(p)}
          </option>
        ))}
      </select>
      <select
        className="filter-select"
        aria-label="Dia"
        value={dprId}
        disabled={dprs.length === 0}
        onChange={(e) => router.push(`${pathname}?proyecto=${proyectoId}&dpr=${e.target.value}`)}
      >
        {dprs.length === 0 && <option value="">Sin DPR</option>}
        {[...dprs].reverse().map((d) => (
          <option key={d.id} value={d.id}>
            {d.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
