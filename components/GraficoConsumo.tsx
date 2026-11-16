"use client";

import { useState } from "react";

export interface PuntoConsumo {
  fecha: string; // YYYY-MM-DD (jornada)
  valor: number | null;
}

const fmt = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dia = (f: string) => `${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}`;

/** Barras del consumo diario de MGO (una serie, un solo eje). Hover = tooltip. */
export default function GraficoConsumo({ puntos }: { puntos: PuntoConsumo[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (puntos.length === 0) return <div className="empty-state">Sin consumos cargados en el periodo.</div>;

  const W = 760;
  const H = 220;
  const m = { t: 12, r: 8, b: 26, l: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(0.5, ...puntos.map((p) => p.valor ?? 0));
  const paso = max > 4 ? 1 : 0.5;
  const tope = Math.ceil(max / paso) * paso;
  const ticks = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso).filter(
    (_, i, a) => a.length <= 7 || i % 2 === 0
  );
  const slot = iw / puntos.length;
  const bw = Math.max(2, Math.min(18, slot - 2));
  const y = (v: number) => m.t + ih - (v / tope) * ih;
  const cadaN = Math.ceil(puntos.length / 12);
  const h = hover !== null ? puntos[hover] : null;

  return (
    <div className="viz" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Consumo diario de MGO por jornada, en m3">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="viz-grid" />
            <text x={m.l - 6} y={y(t) + 3} textAnchor="end" className="viz-tick">
              {t.toLocaleString("es-AR")}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const x = m.l + i * slot + (slot - bw) / 2;
          const v = p.valor ?? 0;
          const top = y(v);
          const alto = m.t + ih - top;
          const r = Math.min(4, bw / 2, alto);
          return (
            <g key={p.fecha}>
              {v > 0 && (
                <path
                  className={`viz-bar ${hover === i ? "on" : ""}`}
                  d={`M${x},${m.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${m.t + ih} Z`}
                />
              )}
              {i % cadaN === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="viz-tick">
                  {dia(p.fecha)}
                </text>
              )}
              <rect
                x={m.l + i * slot}
                y={m.t}
                width={slot}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
        <line x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} className="viz-axis" />
      </svg>
      {h && hover !== null && (
        <div
          className="viz-tip"
          style={{ left: `${((m.l + hover * slot + slot / 2) / W) * 100}%`, top: 0 }}
        >
          <div className="viz-tip-t">Jornada {dia(h.fecha)}</div>
          <div>{h.valor === null ? "Sin dato" : `${fmt(h.valor)} m³`}</div>
        </div>
      )}
    </div>
  );
}
