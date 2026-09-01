import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlantic Dama | PL Offshore",
  description: "Gestion del buque Atlantic Dama",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-instance="pl-offshore">
      <body>{children}</body>
    </html>
  );
}
