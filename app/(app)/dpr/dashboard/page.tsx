import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import GraficoConsumo from "@/components/GraficoConsumo";
import FiltroDashboard from "@/components/FiltroDashboard";
import {
  DRILLS,
  OPERACIONES,
  diasCombustible,
  diffTripulacion,
  etiquetaProyecto,
  fmtFecha2,
  fmtNum,
  jornadaDe,
  mgoFin,
  nombreCompleto,
  sumarDias,
  tripulanteDesdeFila,
  type ConsumoDiario,
  type Dpr,
  type Tripulante,
} from "@/lib/dpr";
import { eventosDe, proyectosDelBuque, tripulacionDeVarios } from "@/lib/dpr-datos";

const n0 = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? "—" : fmtNum(v, d));

function Stat({ label, valor, sub }: { label: string; valor: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="dash-valor">{valor}</div>
      {sub && <div className="dash-sub">{sub}</div>}
    </div>
  );
}

export default async function DashboardDprPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; dpr?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const proyectos = await proyectosDelBuque(supabase);
  const proyectoId = sp.proyecto ?? proyectos.find((p) => p.estado === "en_curso")?.id ?? proyectos[0]?.id ?? "";
  const proyecto = proyectos.find((p) => p.id === proyectoId) ?? null;

  const { data: dprsData } = await supabase
    .from("dpr")
    .select("*")
    .eq("proyecto_id", proyectoId || "00000000-0000-0000-0000-000000000000")
    .order("fecha");
  const dprs = (dprsData ?? []) as Dpr[];
  const dia = dprs.find((d) => d.id === sp.dpr) ?? dprs[dprs.length - 1] ?? null;

  if (!proyecto) {
    return <div className="empty-state">No hay proyectos del buque cargados en Comercial.</div>;
  }

  // Periodo del proyecto: desde el primer DPR (o el inicio estimado) hasta el ultimo DPR
  const { data: pr } = await supabase
    .from("proyectos")
    .select("fecha_inicio_estimada")
    .eq("id", proyecto.id)
    .maybeSingle();
  const inicioEst = pr?.fecha_inicio_estimada ? String(pr.fecha_inicio_estimada).slice(0, 10) : null;
  const desde = dprs[0]?.fecha ?? inicioEst ?? "";
  const hasta = dprs[dprs.length - 1]?.fecha ?? desde;

  const ids = dprs.map((d) => d.id);
  const [{ data: consumosData }, eventos, { data: tripData }] = await Promise.all([
    desde
      ? supabase
          .from("dpr_consumo_diario")
          .select("*")
          // 6 jornadas antes del inicio: para el promedio de la ultima semana del primer dia
          .gte("fecha", sumarDias(jornadaDe(desde), -6))
          .lte("fecha", jornadaDe(hasta))
          .order("fecha")
      : Promise.resolve({ data: [] }),
    desde ? eventosDe(supabase, desde, hasta) : Promise.resolve([]),
    tripulacionDeVarios(supabase, ids),
  ]);
  const consumosTodos = (consumosData ?? []) as ConsumoDiario[];
  const consumos = desde ? consumosTodos.filter((c) => c.fecha >= jornadaDe(desde)) : [];
  const tripPorDpr = new Map<string, Tripulante[]>();
  for (const r of (tripData ?? []) as Record<string, unknown>[]) {
    const k = String(r.dpr_id);
    if (!tripPorDpr.has(k)) tripPorDpr.set(k, []);
    tripPorDpr.get(k)!.push(tripulanteDesdeFila(r));
  }

  // ── totales del proyecto ──
  const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
  const mgoTotal = consumos.reduce((a, c) => a + num(c.consumo), 0);
  const jornadasConDato = consumos.filter((c) => c.consumo !== null).length;
  const h0 = consumos.reduce((a, c) => a + num(c.horas_0), 0);
  const h1 = consumos.reduce((a, c) => a + num(c.horas_1), 0);
  const h2 = consumos.reduce((a, c) => a + num(c.horas_2), 0);
  const hTot = h0 + h1 + h2;
  const distancia = dprs.reduce((a, d) => a + num(d.distancia), 0);
  const ribHoras = dprs.reduce((a, d) => a + num(d.rib_horas), 0);
  const ribComb = dprs.reduce((a, d) => a + num(d.rib_comb_usado), 0);
  let subidas = 0;
  let bajadas = 0;
  for (let i = 1; i < dprs.length; i++) {
    const a = tripPorDpr.get(dprs[i - 1].id);
    const b = tripPorDpr.get(dprs[i].id);
    if (!a?.length || !b?.length) continue;
    const df = diffTripulacion(a, b);
    subidas += df.subieron.length;
    bajadas += df.bajaron.length;
  }
  const porTipo = new Map<string, number>();
  for (const e of eventos) porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
  const drillsCount = new Map<string, number>();
  for (const d of dprs) for (const k of d.drills ?? []) drillsCount.set(k, (drillsCount.get(k) ?? 0) + 1);

  // serie diaria de consumo: todas las jornadas del periodo, con hueco si falta el dato
  const puntos: { fecha: string; valor: number | null }[] = [];
  if (desde) {
    const porFecha = new Map(consumos.map((c) => [c.fecha, c.consumo === null ? null : Number(c.consumo)]));
    for (let f = jornadaDe(desde); f <= jornadaDe(hasta); f = sumarDias(f, 1)) {
      puntos.push({ fecha: f, valor: porFecha.get(f) ?? null });
    }
  }

  // ── el dia ──
  const tripDia = dia ? tripPorDpr.get(dia.id) ?? [] : [];
  const idx = dia ? dprs.findIndex((d) => d.id === dia.id) : -1;
  const previo = idx > 0 ? dprs[idx - 1] : null;
  const movDia = dia && previo ? diffTripulacion(tripPorDpr.get(previo.id) ?? null, tripDia) : null;
  const eventosDia = dia ? eventos.filter((e) => e.fecha === dia.fecha) : [];
  const jornadaDia = dia ? consumos.find((c) => c.fecha === jornadaDe(dia.fecha)) : undefined;
  const ultimos7 = dia
    ? consumosTodos.filter((c) => c.fecha <= jornadaDe(dia.fecha) && c.fecha >= sumarDias(jornadaDe(dia.fecha), -6)).map((c) => (c.consumo === null ? null : Number(c.consumo)))
    : [];
  const finDia = dia ? mgoFin(dia) : null;
  const diasComb = diasCombustible(finDia, ultimos7);
  const etiquetas = (keys: string[] | undefined, lista: readonly { key: string; label: string }[]) =>
    (keys ?? []).map((k) => lista.find((x) => x.key === k)?.label ?? k);

  return (
    <div className="dash">
      <div className="flex-between mb16">
        <FiltroDashboard
          proyectos={proyectos}
          proyectoId={proyecto.id}
          dprs={dprs.map((d) => ({ id: d.id, etiqueta: `DPR ${d.numero} · ${fmtFecha2(d.fecha)}` }))}
          dprId={dia?.id ?? ""}
        />
        {dia && (
          <div className="flex-gap">
            <Link href={`/dpr/${dia.id}`} className="btn btn-ghost btn-sm">
              Editar DPR {dia.numero}
            </Link>
            <Link href={`/dpr/${dia.id}/imprimir`} className="btn btn-ghost btn-sm" target="_blank">
              Imprimir
            </Link>
          </div>
        )}
      </div>

      {/* ══ RESUMEN DEL DIA ══ */}
      <h2 className="dash-h2">
        Resumen del dia {dia ? `· DPR ${dia.numero} · ${fmtFecha2(dia.fecha)}` : ""}
      </h2>
      {!dia ? (
        <div className="card empty-state">Este proyecto todavia no tiene DPR cargados.</div>
      ) : (
        <>
          <div className="stats">
            <Stat
              label="Posicion"
              valor={<span style={{ fontSize: 18 }}>{dia.ubicacion || "—"}</span>}
              sub={[dia.lat, dia.lon].filter(Boolean).join(" · ") || "Sin GPS"}
            />
            <Stat
              label="P.O.B."
              valor={tripDia.length || dia.pob || "—"}
              sub={`${tripDia.filter((p) => p.tipo === "tripulante").length} tripulantes · ${tripDia.filter((p) => p.tipo === "pasajero").length} pasajeros`}
            />
            <Stat label="MGO consumido (jornada)" valor={`${n0(dia.mgo_consumo, 2)} m³`} sub={`Jornada ${fmtFecha2(jornadaDe(dia.fecha))}`} />
            <Stat
              label="MGO a bordo (cierre)"
              valor={`${n0(finDia, 2)} m³`}
              sub={diasComb !== null ? `≈ ${fmtNum(diasComb, 0)} dias al consumo de la ultima semana` : undefined}
            />
            <Stat
              label="Motores (horas)"
              valor={jornadaDia ? `${n0(Number(jornadaDia.horas_2))} h con 2` : "—"}
              sub={jornadaDia ? `${n0(Number(jornadaDia.horas_0))} h sin motores · ${n0(Number(jornadaDia.horas_1))} h con 1` : undefined}
            />
            <Stat
              label="RIB"
              valor={dia.rib_horas !== null ? `${n0(dia.rib_horas, 1)} h` : "—"}
              sub={`Usado ${n0(dia.rib_comb_usado)} L · disponible ${n0(dia.rib_comb_disponible)} L`}
            />
            <Stat
              label="Navegacion"
              valor={dia.distancia !== null ? `${n0(dia.distancia, 0)} nm` : "—"}
              sub={dia.velocidad_media !== null ? `Velocidad media ${n0(dia.velocidad_media, 1)} kn` : undefined}
            />
          </div>

          <div className="dash-grid">
            <div className="card">
              <div className="card-title">Tripulacion · cambios vs DPR {previo?.numero ?? "anterior"}</div>
              {!movDia ? (
                <p className="text-muted">Sin DPR anterior en el proyecto.</p>
              ) : movDia.subieron.length + movDia.bajaron.length === 0 ? (
                <p className="text-muted">Sin cambios.</p>
              ) : (
                <>
                  {movDia.subieron.map((p, i) => (
                    <div key={`s${i}`} className="dpr-mov">
                      <span className="badge b-green">Sube</span> <strong>{p.cargo}</strong> {nombreCompleto(p)}
                    </div>
                  ))}
                  {movDia.bajaron.map((p, i) => (
                    <div key={`b${i}`} className="dpr-mov">
                      <span className="badge b-red">Baja</span> <strong>{p.cargo}</strong> {nombreCompleto(p)}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="card">
              <div className="card-title">HSE del dia</div>
              {eventosDia.length === 0 && (dia.drills ?? []).length === 0 ? (
                <p className="text-muted">Sin eventos ni drills.</p>
              ) : (
                <>
                  {eventosDia.map((e, i) => (
                    <div key={i} className="dpr-mov">
                      <span className="tag">{e.tipo}</span> {e.tarea}
                      <span className="text-muted">
                        {e.personas ? ` · ${e.personas} pers.` : ""}
                        {e.hora_inicio ? ` · ${e.hora_inicio}` : ""}
                      </span>
                    </div>
                  ))}
                  {etiquetas(dia.drills, DRILLS).map((l) => (
                    <div key={l} className="dpr-mov">
                      <span className="tag">Drill</span> {l}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="card">
              <div className="card-title">Operaciones y condiciones</div>
              <p>{etiquetas(dia.operaciones, OPERACIONES).join(" · ") || <span className="text-muted">Sin operaciones marcadas</span>}</p>
              <p className="text-muted mt8">
                Tiempo {dia.tiempo || "—"} · Mar {dia.estado_mar || "—"} · Viento {dia.viento || "—"} · Mar de fondo{" "}
                {dia.mar_fondo || "—"}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ══ PROYECTO ══ */}
      <h2 className="dash-h2">
        Proyecto · {etiquetaProyecto(proyecto)}
        {desde && (
          <span className="dash-h2-sub">
            {" "}
            {fmtFecha2(desde)} a {fmtFecha2(hasta)}
          </span>
        )}
      </h2>
      <div className="stats">
        <Stat label="DPR cargados" valor={dprs.length} sub={proyecto.compania ?? undefined} />
        <Stat
          label="MGO consumido"
          valor={`${fmtNum(mgoTotal, 1)} m³`}
          sub={jornadasConDato ? `${fmtNum(mgoTotal / jornadasConDato, 2)} m³/dia en ${jornadasConDato} jornada${jornadasConDato === 1 ? "" : "s"}` : "Sin datos"}
        />
        <Stat label="Distancia navegada" valor={`${fmtNum(distancia, 0)} nm`} />
        <Stat label="RIB" valor={`${fmtNum(ribHoras, 1)} h`} sub={`${fmtNum(ribComb, 0)} L de combustible`} />
        <Stat label="Eventos HSE" valor={eventos.length} sub={[...porTipo].map(([t, c]) => `${t} ${c}`).join(" · ") || undefined} />
        <Stat label="Cambios de tripulacion" valor={subidas + bajadas} sub={`${subidas} subieron · ${bajadas} bajaron`} />
      </div>

      <div className="card">
        <div className="card-title">Consumo diario de MGO (m³ por jornada)</div>
        <GraficoConsumo puntos={puntos} />
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-title">Horas segun motores en uso</div>
          {hTot === 0 ? (
            <p className="text-muted">Sin datos.</p>
          ) : (
            <>
              <div className="seg" role="img" aria-label={`Sin motores ${h0} h, 1 motor ${h1} h, 2 motores ${h2} h`}>
                {[
                  { k: "s1", v: h0 },
                  { k: "s2", v: h1 },
                  { k: "s3", v: h2 },
                ]
                  .filter((x) => x.v > 0)
                  .map((x) => (
                    <div key={x.k} className={`seg-part ${x.k}`} style={{ flexGrow: x.v }}>
                      {x.v / hTot >= 0.08 ? `${Math.round((x.v / hTot) * 100)}%` : ""}
                    </div>
                  ))}
              </div>
              <div className="seg-ley">
                <span>
                  <i className="s1" /> Sin motores {fmtNum(h0, 0)} h
                </span>
                <span>
                  <i className="s2" /> 1 motor {fmtNum(h1, 0)} h
                </span>
                <span>
                  <i className="s3" /> 2 motores {fmtNum(h2, 0)} h
                </span>
              </div>
            </>
          )}
        </div>
        <div className="card">
          <div className="card-title">Drills realizados</div>
          {drillsCount.size === 0 ? (
            <p className="text-muted">Ninguno marcado en los DPR.</p>
          ) : (
            <table>
              <tbody>
                {DRILLS.filter((d) => drillsCount.has(d.key)).map((d) => (
                  <tr key={d.key}>
                    <td>{d.label}</td>
                    <td className="text-mono" style={{ textAlign: "right" }}>
                      {drillsCount.get(d.key)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
