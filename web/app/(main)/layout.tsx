import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { CotacaoStrip } from "@/components/home/CotacaoStrip";
import { AuthHydrator } from "@/components/layout/AuthHydrator";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHydrator />
      <Header />
      <CotacaoStrip />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
