import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "9K Systems — managed IT, run by one operator",
  description:
    "The $997 AI Readiness Audit, done-for-you managed IT retainers, and the MSP platform other one-person MSPs run on. One accountable operator, end to end.",
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
          {/* Vercel Web Analytics (no npm dep). Enable Analytics on the Vercel
              project so /_vercel/insights/* is served and data shows up. */}
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        </body>
      </html>
    </ClerkProvider>
  );
}
