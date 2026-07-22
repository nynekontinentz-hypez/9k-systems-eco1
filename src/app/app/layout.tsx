import { auth } from "@clerk/nextjs/server";
import { TopNav } from "@/components/layout/top-nav";
import { isOperator } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-bg1">
      <TopNav showAudits={isOperator(userId)} />
      <main className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
