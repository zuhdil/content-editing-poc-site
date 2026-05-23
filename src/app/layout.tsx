import Link from "next/link";
import type { ReactNode } from "react";
import { content } from "@/content/loader";

export const metadata = { title: "Content Editing POC" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
        <header style={{ marginBottom: "1.5rem" }}>
          <strong>{content.layout.nav.tagline}</strong>
        </header>
        <nav style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/features">Features</Link>
        </nav>
        {children}
        <footer style={{ marginTop: "3rem", borderTop: "1px solid #ccc", paddingTop: "1rem", fontSize: "0.875rem" }}>
          {content.layout.footer.copyright}
        </footer>
      </body>
    </html>
  );
}
