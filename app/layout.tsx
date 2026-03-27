import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Informare",
  description: "Telegram-first personal knowledge stock system."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
