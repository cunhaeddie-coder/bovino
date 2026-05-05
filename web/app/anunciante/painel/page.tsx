"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { Anunciante, Assinatura, Banner } from "@/lib/types";

const anuncianteApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

anuncianteApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("bovino_anunciante_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type Stats = {
  total_banners: number;
  banners_ativos: number;
  total_impressoes: number;
  total_cliques: number;
  ctr: number;
  por_banner: Array<{
    id: number;
    titulo: string;
    posicao: string;
    impressoes: number;
    cliques: number;
    ctr: number;
  }>;
};

type Me = Anunciante & {
  assinatura_ativa?: Assinatura & { plano?: { nome: string; preco: number } };
  banners?: Banner[];
};

const POSICOES = [
  { value: "home", label: "Homepage (posição principal)" },
  { value: "feed", label: "Feed de anúncios" },
  { value: "busca", label: "Página de busca" },
];

export default function AnunciantePainelPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "banners" | "plano" | "perfil">("dashboard");

  const [novoBanner, setNovoBanner] = useState({
    titulo: "",
    imagem_url: "",
    link_url: "",
    posicao: "feed",
    estado: "",
    inicia_em: "",
    expira_em: "",
  });
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("bovino_anunciante_token");
    if (!token) {
      router.push("/anunciante/login");
      return;
    }
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [meRes, statsRes, bannersRes] = await Promise.all([
        anuncianteApi.get("/anunciante/me"),
        anuncianteApi.get("/anunciante/estatisticas"),
        anuncianteApi.get("/anunciante/banners"),
      ]);
      setMe(meRes.data);
      setStats(statsRes.data);
      setBanners(bannersRes.data);
    } catch {
      router.push("/anunciante/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleCriarBanner(e: React.FormEvent) {
    e.preventDefault();
    setBannerLoading(true);
    setBannerError("");
    setBannerSuccess("");
    try {
      const { data } = await anuncianteApi.post("/anunciante/banners", novoBanner);
      setBanners((prev) => [data, ...prev]);
      setBannerSuccess("Banner criado com sucesso!");
      setNovoBanner({ titulo: "", imagem_url: "", link_url: "", posicao: "feed", estado: "", inicia_em: "", expira_em: "" });
      await carregarDados();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setBannerError(err.response?.data?.message ?? "Erro ao criar banner.");
    } finally {
      setBannerLoading(false);
    }
  }

  async function handleExcluirBanner(id: number) {
    if (!confirm("Remover este banner?")) return;
    try {
      await anuncianteApi.delete(`/anunciante/banners/${id}`);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch {}
  }

  async function handleToggleAtivo(banner: Banner) {
    try {
      const { data } = await anuncianteApi.put(`/anunciante/banners/${banner.id}`, {
        ativo: !banner.ativo,
      });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? data : b)));
    } catch {}
  }

  async function handleLogout() {
    await anuncianteApi.post("/anunciante/logout").catch(() => {});
    localStorage.removeItem("bovino_anunciante_token");
    router.push("/anunciante/login");
  }

  function handleAssinar() {
    router.push("/planos");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const assinatura = me?.assinatura_ativa;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-2xl font-extrabold text-green-700">Bovino</Link>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600 text-sm font-medium">Painel do Anunciante</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden md:block">{me?.empresa}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-600 transition"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 gap-1">
          {(
            [
              { key: "dashboard", label: "Dashboard" },
              { key: "banners", label: "Meus banners" },
              { key: "plano", label: "Plano & pagamento" },
              { key: "perfil", label: "Perfil da empresa" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === item.key
                  ? "bg-green-50 text-green-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden w-full fixed bottom-0 left-0 bg-white border-t flex z-10">
          {(
            [
              { key: "dashboard", label: "Dashboard" },
              { key: "banners", label: "Banners" },
              { key: "plano", label: "Plano" },
              { key: "perfil", label: "Perfil" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex-1 py-3 text-xs font-medium transition ${
                tab === item.key ? "text-green-700 border-t-2 border-green-500" : "text-gray-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">

          {/* Dashboard */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Olá, {me?.responsavel?.split(" ")[0]}!</h2>

              {!assinatura && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-yellow-800">Nenhum plano ativo</p>
                    <p className="text-yellow-700 text-sm mt-0.5">Assine um plano para publicar banners.</p>
                  </div>
                  <button
                    onClick={handleAssinar}
                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-5 py-2 rounded-full text-sm transition shrink-0"
                  >
                    Ver planos
                  </button>
                </div>
              )}

              {assinatura && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Plano ativo</p>
                    <p className="text-lg font-bold text-green-800 mt-0.5">{assinatura.plano?.nome}</p>
                    {assinatura.expira_em && (
                      <p className="text-xs text-green-600 mt-1">
                        Válido até {new Date(assinatura.expira_em).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">ATIVO</span>
                </div>
              )}

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Banners ativos", value: stats.banners_ativos },
                    { label: "Impressões totais", value: stats.total_impressoes.toLocaleString("pt-BR") },
                    { label: "Cliques totais", value: stats.total_cliques.toLocaleString("pt-BR") },
                    { label: "CTR médio", value: `${stats.ctr}%` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Por banner */}
              {stats && stats.por_banner.length > 0 && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold text-gray-900 text-sm">Desempenho por banner</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
                          <th className="text-left px-5 py-3">Banner</th>
                          <th className="text-left px-3 py-3">Posição</th>
                          <th className="text-right px-3 py-3">Impressões</th>
                          <th className="text-right px-3 py-3">Cliques</th>
                          <th className="text-right px-5 py-3">CTR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.por_banner.map((b) => (
                          <tr key={b.id} className="border-t hover:bg-gray-50">
                            <td className="px-5 py-3 font-medium text-gray-800">{b.titulo}</td>
                            <td className="px-3 py-3 text-gray-500 capitalize">{b.posicao}</td>
                            <td className="px-3 py-3 text-right text-gray-700">{b.impressoes.toLocaleString("pt-BR")}</td>
                            <td className="px-3 py-3 text-right text-gray-700">{b.cliques.toLocaleString("pt-BR")}</td>
                            <td className="px-5 py-3 text-right font-semibold text-green-600">{b.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Banners */}
          {tab === "banners" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Meus banners</h2>

              {/* Criar novo */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Publicar novo banner</h3>

                {bannerError && (
                  <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{bannerError}</div>
                )}
                {bannerSuccess && (
                  <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">{bannerSuccess}</div>
                )}

                <form onSubmit={handleCriarBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Título do banner *</label>
                    <input
                      required
                      value={novoBanner.titulo}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, titulo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Ex: Vacinas para bovinos — 20% off"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">URL da imagem *</label>
                    <input
                      required
                      type="url"
                      value={novoBanner.imagem_url}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, imagem_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://cdn.empresa.com/banner.jpg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">URL de destino *</label>
                    <input
                      required
                      type="url"
                      value={novoBanner.link_url}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, link_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://www.empresa.com/oferta"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Posição *</label>
                    <select
                      value={novoBanner.posicao}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, posicao: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      {POSICOES.map((pos) => (
                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Estado (opcional)</label>
                    <select
                      value={novoBanner.estado}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, estado: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    >
                      <option value="">Nacional (todos)</option>
                      {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map(
                        (uf) => <option key={uf} value={uf}>{uf}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Início</label>
                    <input
                      type="date"
                      value={novoBanner.inicia_em}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, inicia_em: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Encerramento</label>
                    <input
                      type="date"
                      value={novoBanner.expira_em}
                      onChange={(e) => setNovoBanner((p) => ({ ...p, expira_em: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={bannerLoading || !assinatura}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition disabled:opacity-60"
                    >
                      {bannerLoading ? "Publicando..." : "Publicar banner"}
                    </button>
                    {!assinatura && (
                      <span className="ml-3 text-xs text-gray-500">É necessário ter um plano ativo.</span>
                    )}
                  </div>
                </form>
              </div>

              {/* Lista */}
              {banners.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Nenhum banner publicado ainda.</div>
              ) : (
                <div className="space-y-3">
                  {banners.map((b) => (
                    <div key={b.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                      {b.imagem_url && (
                        <img
                          src={b.imagem_url}
                          alt={b.titulo}
                          className="w-24 h-14 object-cover rounded-lg border shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{b.titulo}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {b.posicao}{b.estado ? ` · ${b.estado}` : " · Nacional"}
                        </p>
                        <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                          <span>{b.impressoes.toLocaleString("pt-BR")} impressões</span>
                          <span>{b.cliques.toLocaleString("pt-BR")} cliques</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleAtivo(b)}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition ${
                            b.ativo
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {b.ativo ? "Ativo" : "Pausado"}
                        </button>
                        <button
                          onClick={() => handleExcluirBanner(b.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plano */}
          {tab === "plano" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Plano & pagamento</h2>

              {assinatura ? (
                <div className="bg-white rounded-xl border p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Plano atual</p>
                      <p className="text-xl font-bold text-gray-900 mt-1">{assinatura.plano?.nome}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 font-bold text-sm px-4 py-1.5 rounded-full">ATIVO</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Valor</p>
                      <p className="font-semibold text-gray-900">
                        {(assinatura.plano?.preco ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                      </p>
                    </div>
                    {assinatura.inicia_em && (
                      <div>
                        <p className="text-xs text-gray-500">Início</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(assinatura.inicia_em).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                    {assinatura.expira_em && (
                      <div>
                        <p className="text-xs text-gray-500">Próxima renovação</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(assinatura.expira_em).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={handleAssinar}
                      className="text-sm text-green-600 hover:underline font-medium"
                    >
                      Mudar de plano →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-8 text-center">
                  <p className="text-gray-600 mb-4">Nenhum plano ativo. Escolha um plano para começar a anunciar.</p>
                  <button
                    onClick={handleAssinar}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-full transition"
                  >
                    Ver planos disponíveis
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Perfil */}
          {tab === "perfil" && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Perfil da empresa</h2>
              <div className="bg-white rounded-xl border p-6 space-y-3 text-sm">
                <Row label="Empresa" value={me?.empresa} />
                <Row label="CNPJ" value={me?.cnpj} />
                <Row label="Responsável" value={me?.responsavel} />
                <Row label="E-mail" value={me?.email} />
                <Row label="Celular" value={me?.celular} />
                <Row label="Site" value={me?.site ?? "—"} />
                <Row label="Estado" value={me?.estado ?? "Nacional"} />
                <Row label="Descrição" value={me?.descricao ?? "—"} />
              </div>
              <p className="text-xs text-gray-400">Para atualizar os dados da empresa, entre em contato com o suporte.</p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? "—"}</span>
    </div>
  );
}
