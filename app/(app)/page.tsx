import Link from "next/link";

export default function Home() {
  return (
    <div className="stats">
      <Link href="/dpr/dashboard" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Reportes</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          Dashboard DPR
        </div>
      </Link>
      <Link href="/dpr" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Reportes</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          DPR diario
        </div>
      </Link>
      <Link href="/inventario/maquinas" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Inventario</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          Maquinas
        </div>
      </Link>
      <Link href="/inventario/towing-gear" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Inventario</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          Towing Gear
        </div>
      </Link>
      <Link href="/inventario/cubierta" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Inventario</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          Cubierta
        </div>
      </Link>
      <Link href="/catalogos" className="stat" style={{ cursor: "pointer" }}>
        <div className="stat-label">Catalogos</div>
        <div className="stat-value" style={{ fontSize: 18 }}>
          Ubicaciones y motivos
        </div>
      </Link>
    </div>
  );
}
