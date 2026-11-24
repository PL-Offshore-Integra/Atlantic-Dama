"use client";

import { useState } from "react";

export interface PuntoPob {
  fecha: string; // YYYY-MM-DD (fecha del DPR)
  propios: number | null; // dotacion PL Offshore (tripulantes)
  cliente: number | null; // gente del cliente viviendo a bordo (pasajeros)
}

const dia = (f: string) => `${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}`;

/** Barras apiladas de personas a bordo por dia: PL Offshore abajo, cliente arriba. Hover = tooltip. */
export default function GraficoPob({ puntos }: { puntos: PuntoPob[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (puntos.every((p) => p.propios === null)) return <div className="empty-state">Sin tripulacion cargada en el periodo.</div>;

  const W = 760;
  const H = 220;
  const m = { t: 12, r: 8, b: 26, l: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const max = Math.max(5, ...puntos.map((p) => (p.propios ?? 0) + (p.cliente ?? 0)));
  const paso = max > 40 ? 10 : 5;
  const tope = Math.ceil(max / paso) * paso;
  const ticks = Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso).filter(
    (_, i, a) => a.length <= 7 || i % 2 === 0
  );
  const slot = iw / puntos.length;
  const bw = Math.max(2, Math.min(18, slot - 2));
  const y = (v: number) => m.t + ih - (v / tope) * ih;
  const base = m.t + ih;
  const cadaN = Math.ceil(puntos.length / 12);
  const h = hover !== null ? puntos[hover] : null;

  // rectangulo con las esquinas de arriba redondeadas (r = 0 -> recto)
  const barra = (x: number, top: number, bottom: number, r: number) =>
    `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${bottom} Z`;

  return (
    <div className="viz" style={{ position: "relative" }}>
      <div className="seg-ley mb8">
        <span>
          <i className="s1" /> PL Offshore
        </span>
        <span>
          <i className="s2" /> Cliente
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Personas a bordo por dia: PL Offshore y cliente">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="viz-grid" />
            <text x={m.l - 6} y={y(t) + 3} textAnchor="end" className="viz-tick">
              {t}
            </text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const x = m.l + i * slot + (slot - bw) / 2;
          const a = p.propios ?? 0;
          const b = p.cliente ?? 0;
          const topA = y(a);
          const topB = y(a + b);
          const rA = b > 0 ? 0 : Math.min(4, bw / 2, base - topA);
          const rB = Math.min(4, bw / 2, topA - topB);
          const on = hover === i ? "on" : "";
          return (
            <g key={p.fecha}>
              {a > 0 && <path className={`viz-pob s1 ${on}`} d={barra(x, topA, base, rA)} />}
              {b > 0 && <path className={`viz-pob s2 ${on}`} d={barra(x, topB, topA - (a > 0 ? 1 : 0), rB)} />}
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
        <line x1={m.l} x2={W - m.r} y1={base} y2={base} className="viz-axis" />
      </svg>
      {h && hover !== null && (
        <div className="viz-tip" style={{ left: `${((m.l + hover * slot + slot / 2) / W) * 100}%`, top: 0 }}>
          <div className="viz-tip-t">{dia(h.fecha)}</div>
          {h.propios === null ? (
            <div>Sin DPR</div>
          ) : (
            <>
              <div>PL Offshore: {h.propios}</div>
              <div>Cliente: {h.cliente ?? 0}</div>
              <div>
                <strong>Total: {h.propios + (h.cliente ?? 0)}</strong>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
