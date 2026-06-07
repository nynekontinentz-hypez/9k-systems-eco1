import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "9K Systems — one operator, every client",
  description:
    "The control plane for a one-person MSP: client portals, billing, gated deliverables, and a faceless video studio under one roof.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#8251ee",
          colorBackground: "hsl(240 5% 12%)",
          colorText: "#ffffff",
          colorInputBackground: "hsl(240 5% 14%)",
          colorInputText: "#ffffff",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full bg-neutral-bg1 text-text-primary">
          {children}
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
