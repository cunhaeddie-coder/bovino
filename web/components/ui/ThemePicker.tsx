"use client";

import { useState } from "react";
import { useThemeStore, THEMES } from "@/lib/themeStore";

export function ThemePicker() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 left-4 z-50 md:bottom-6">
      {/* Popup */}
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[160px]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Paleta de cores
            </p>
            <div className="space-y-1">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors ${
                    theme === t.id ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  {t.flag ? (
                    <span className={`w-5 h-5 rounded-full text-sm flex items-center justify-center shrink-0 border-2 ${theme === t.id ? "border-gray-800" : "border-transparent"}`}>
                      🇧🇷
                    </span>
                  ) : (
                    <span
                      className="w-5 h-5 rounded-full border-2 shrink-0"
                      style={{
                        backgroundColor: t.cor,
                        borderColor: theme === t.id ? "#111" : "transparent",
                      }}
                    />
                  )}
                  <span className="text-sm text-gray-700 font-medium">{t.label}</span>
                  {theme === t.id && (
                    <svg className="w-3.5 h-3.5 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Botão flutuante */}
      {(() => {
        const t = THEMES.find((t) => t.id === theme);
        return (
          <button
            onClick={() => setOpen((v) => !v)}
            title="Mudar tema"
            className="w-10 h-10 rounded-full shadow-lg border-2 border-white flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: t?.cor }}
          >
            {t?.flag ? (
              <span className="text-lg leading-none">🇧🇷</span>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            )}
          </button>
        );
      })()}
    </div>
  );
}
