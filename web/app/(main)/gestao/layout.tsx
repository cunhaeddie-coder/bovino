"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { GestaoSidebar, NAV_GESTOR } from "@/components/gestao/GestaoSidebar";

const LABEL_MAP = Object.fromEntries(NAV_GESTOR.map((n) => [n.href, n.label]));

function currentLabel(pathname: string): string {
  if (pathname === "/gestao") return "Dashboard";
  const match = Object.entries(LABEL_MAP).find(
    ([k]) => k !== "/gestao" && pathname.startsWith(k)
  );
  return match?.[1] ?? "Gestão";
}

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer]       = useState(false);

  // Restaura estado do sidebar do localStorage
  useEffect(() => {
    if (localStorage.getItem("gestao_sidebar_collapsed") === "true") {
      setCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("gestao_sidebar_collapsed", String(next));
  }

  // Fecha drawer ao navegar
  useEffect(() => { setDrawer(false); }, [pathname]);

  // Swipe para fechar o drawer
  const touchX = useRef(0);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.targetTouches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current - e.changedTouches[0].clientX > 50) setDrawer(false);
  }

  const sectionLabel = currentLabel(pathname);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── MOBILE ── */}

      {/* Barra superior com hambúrguer */}
      <div className="lg:hidden sticky top-14 z-20 bg-white border-b border-gray-200 h-11 flex items-center gap-3 px-4">
        <button
          onClick={() => setDrawer(true)}
          className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-700">{sectionLabel}</span>
      </div>

      {/* Overlay + Drawer */}
      {drawer && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
            onClick={() => setDrawer(false)}
          />
          <div
            className="lg:hidden fixed left-0 top-0 bottom-0 z-[70] w-[78%] max-w-xs shadow-2xl"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <GestaoSidebar mode="drawer" onClose={() => setDrawer(false)} />
          </div>
        </>
      )}

      {/* Conteúdo mobile */}
      <div className="lg:hidden px-4 py-5">
        {children}
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex">

        {/* Sidebar retrátil */}
        <aside
          className={`sticky top-14 h-[calc(100vh-56px)] shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
            collapsed ? "w-[64px]" : "w-[220px]"
          }`}
        >
          <GestaoSidebar
            mode="sidebar"
            collapsed={collapsed}
            onToggle={toggleCollapsed}
          />
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 py-6 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
