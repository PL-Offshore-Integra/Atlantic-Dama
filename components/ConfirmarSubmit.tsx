"use client";

/** Boton de submit que pide confirmacion antes de enviar el form. */
export default function ConfirmarSubmit({
  mensaje,
  children,
  className = "btn btn-danger btn-sm",
}: {
  mensaje: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
