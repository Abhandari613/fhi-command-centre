import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { BottomNav } from "@/components/layout/BottomNav";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuroraBackground />
      <main className="max-w-lg mx-auto px-4 pt-6 pb-32 min-h-screen relative z-10">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
