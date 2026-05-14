"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

type Step = 0 | 1 | 2 | 3;

export function OnboardingModal() {
  const { user, setAuth, token } = useAuthStore();
  const router = useRouter();

  const [step, setStep]     = useState<Step>(0);
  const [visible, setVisible] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [fazenda, setFazenda] = useState({
    nome_propriedade: "",
    estado: "",
    municipio: "",
  });

  useEffect(() => {
    if (!user || user.papel === "vaqueiro") return;
    const etapa = (user as any).onboarding_etapa ?? 0;
    if (etapa < 3) {
      setStep(etapa as Step);
      setFazenda({
        nome_propriedade: (user as any).nome_propriedade ?? "",
        estado: (user as any).estado ?? "",
        municipio: (user as any).municipio ?? "",
      });
      setVisible(true);
    }
  }, [user?.id]);

  if (!visible) return null;

  async function avancar(etapa: number, payload?: object) {
    // Avança a UI imediatamente, salva no servidor em segundo plano
    if (etapa >= 3) {
      setVisible(false);
    } else {
      setStep(etapa as Step);
    }
    try {
      setSalvando(true);
      await api.post("/onboarding/avancar", { etapa, ...payload });
      if (token && user) {
        const { data: me } = await api.get("/auth/me");
        setAuth(me, token);
      }
    } catch {
    } finally {
      setSalvando(false);
    }
  }

  async function pular() {
    setVisible(false);
    try { await api.post("/onboarding/pular"); } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Barra de progresso */}
        {step < 3 && (
          <div className="flex gap-1.5 p-4 pb-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Etapa 0: Boas-vindas ─────────────────────────────────── */}
        {step === 0 && (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🐄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bem-vindo ao Bovino{user?.nome ? `, ${user.nome.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Seu sistema completo de gestão pecuária e marketplace de gado.
            </p>
            <div className="space-y-3 text-left mb-8">
              {[
                ["🐄", "Gestão do rebanho", "Cadastre animais, saúde, pesagens e reprodução"],
                ["🛒", "Marketplace", "Compre e venda gado com produtores de todo o Brasil"],
                ["📊", "Inteligência", "Cotações, relatórios e análises do seu negócio"],
              ].map(([icon, titulo, desc]) => (
                <div key={titulo} className="flex gap-3 items-start">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{titulo}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => avancar(1)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Vamos começar →
            </button>
            <button onClick={pular} className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full">
              Pular configuração
            </button>
          </div>
        )}

        {/* ── Etapa 1: Sua propriedade ─────────────────────────────── */}
        {step === 1 && (
          <div className="p-8">
            <div className="text-4xl mb-3 text-center">🏡</div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Sua propriedade</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Essas informações ajudam a personalizar sua experiência.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da propriedade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fazenda Santa Maria"
                  value={fazenda.nome_propriedade}
                  onChange={(e) => setFazenda((f) => ({ ...f, nome_propriedade: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={fazenda.estado}
                    onChange={(e) => setFazenda((f) => ({ ...f, estado: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">UF</option>
                    {ESTADOS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Município</label>
                  <input
                    type="text"
                    placeholder="Sua cidade"
                    value={fazenda.municipio}
                    onChange={(e) => setFazenda((f) => ({ ...f, municipio: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => avancar(2, fazenda)}
              disabled={salvando}
              className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {salvando ? "Salvando..." : "Salvar e continuar →"}
            </button>
            <button onClick={() => avancar(2)} className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full">
              Pular por agora
            </button>
          </div>
        )}

        {/* ── Etapa 2: Explore ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-8">
            <div className="text-4xl mb-3 text-center">🚀</div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Tudo pronto!</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Explore os recursos disponíveis para você.
            </p>
            <div className="space-y-3 mb-6">
              {[
                { icon: "🐄", label: "Gestão do Rebanho", href: "/gestao/animais",  desc: "Cadastre e gerencie seus animais" },
                { icon: "🛒", label: "Marketplace",       href: "/busca",           desc: "Compre e venda gado online" },
                { icon: "📊", label: "Relatórios",        href: "/gestao/relatorios", desc: "Inventário e análise do rebanho" },
                { icon: "🛟", label: "Suporte",           href: "/gestao/suporte",  desc: "Fale com nossa equipe" },
              ].map(({ icon, label, href, desc }) => (
                <button
                  key={label}
                  onClick={() => { avancar(3); router.push(href); }}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl transition-all text-left"
                >
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{label}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                  <span className="ml-auto text-gray-400 text-sm">→</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => avancar(3)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ir para o painel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
