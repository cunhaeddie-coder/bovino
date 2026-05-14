import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { CotacaoStrip } from "@/components/home/CotacaoStrip";
import { AuthHydrator } from "@/components/layout/AuthHydrator";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { OnboardingModal } from "@/components/ui/OnboardingModal";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHydrator />
      <OnboardingModal />
      <Header />
      <CotacaoStrip />
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <ThemePicker />
    </>
  );
}
