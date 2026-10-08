import type { Metadata } from "next";
import "./globals.css";
import "./refinements.css";
import "./deck-motion.css";
import "./journey.css";
import "./maa-atmosphere.css";

export const metadata: Metadata = {
  title: "Chitraksh · A Night of Blessings",
  description:
    "Mata Ka Jagran & Chitraksh's second birthday. 17 October 2026 · Gurugram. An invitation from the Gupta family.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
