import { TopNav } from "@/components/layout/top-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-bg1">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
