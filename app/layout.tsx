import type { Metadata } from "next";
import "./globals.css";
import "./session.css";

export const metadata: Metadata = {
  title: "Pulse — пространство команды",
  description:
    "Единая платформа для вовлечённости, развития и признания сотрудников.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
