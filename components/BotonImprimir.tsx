"use client";

export default function BotonImprimir() {
  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
      Imprimir / PDF
    </button>
  );
}
