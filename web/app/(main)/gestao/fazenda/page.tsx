"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Star, MessageSquare, Eye, EyeOff, Crown, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { getMe } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { api } from "@/lib/api";

const RACAS = [
  "Nelore", "Angus", "Gir", "Brahman", "Senepol", "Simmental",
  "Hereford", "Brangus", "Tabapuã", "Guzerá", "Caracu", "Pantaneiro",
  "Canchim", "Bonsmara", "Limousin", "Cruzamento Industrial",
];

function temPlanoFazenda(user: User | null): boolean {
  if (!user) return false;
  // Fonte primária: assinatura_ativa vem fresca do servidor a cada login
  const slug = user.assinatura_ativa?.plano_slug ?? "";
  if (slug.includes("premium") || slug.includes("elite")) return true;
  // Fallback: campo plano legado no localStorage
  return ["produtor-premium", "produtor-elite", "premium"].includes(user.plano ?? "");
}

type Fazenda = {
  id: number;
  slug: string;
  ativo: boolean;
  nome: string;
  descricao: string | null;
  estado: string;
  municipio: string;
  area_ha: number | null;
  gta_numero: string | null;
  sisbov_numero: string | null;
  website: string | null;
  whatsapp: string | null;
  anos_atividade: number | null;
  racas_principais: string[] | null;
  logo_url: string | null;
};

type AnuncioItem = {
  id: number;
  titulo: string;
  preco_unitario: number;
  exibir_na_fazenda: boolean;
  animal?: { raca: string; quantidade: number };
};

type Avaliacao = {
  id: number;
  nota: number;
  comentario: string | null;
  resposta_vendedor: string | null;
  created_at: string;
  comprador: { nome: string };
};

function Estrelas({ nota }: { nota: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} className={i <= nota ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
      ))}
    </span>
  );
}

function BannerUpgrade() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
      <Crown size={36} className="text-amber-500 mx-auto" />
      <h2 className="text-lg font-bold text-amber-900">Página de fazenda disponível no plano Premium</h2>
      <p className="text-sm text-amber-700 max-w-sm mx-auto">
        Com o Produtor Premium você cria uma página pública com seus anúncios, avaliações verificadas e link para compartilhar.
      </p>
      <Link
        href="/planos"
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
      >
        Ver planos <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}

export default function GestaoFazendaPage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  const [fazenda, setFazenda] = useState<Fazenda | null>(null);
  const [anuncios, setAnuncios] = useState<AnuncioItem[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState("");
  const [togglingAtivo, setTogglingAtivo] = useState(false);

  const [form, setForm] = useState({
    nome: "", descricao: "", estado: "", municipio: "",
    area_ha: "", gta_numero: "", sisbov_numero: "",
    website: "", whatsapp: "", anos_atividade: "", logo_url: "",
  });
  const [racasSel, setRacasSel] = useState<string[]>([]);

  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  const temPlano = temPlanoFazenda(user);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) { router.replace("/login"); return; }

    // Busca user fresco do servidor — evita decisão de plano com dado stale do localStorage
    getMe()
      .then((freshUser) => {
        setAuth(freshUser, token);
        if (!temPlanoFazenda(freshUser)) { setLoading(false); return; }

        return Promise.all([
          api.get<Fazenda | null>("/fazenda/minha"),
          api.get<AnuncioItem[]>("/anuncios/meus").catch(() => ({ data: [] })),
          api.get<Avaliacao[]>("/avaliacoes/recebidas").catch(() => ({ data: [] })),
        ]).then(([fazRes, anunciosRes, avRes]) => {
          const f = fazRes.data;
          if (f) {
            setFazenda(f);
            setForm({
              nome: f.nome ?? "", descricao: f.descricao ?? "",
              estado: f.estado ?? "", municipio: f.municipio ?? "",
              area_ha: f.area_ha != null ? String(f.area_ha) : "",
              gta_numero: f.gta_numero ?? "", sisbov_numero: f.sisbov_numero ?? "",
              website: f.website ?? "", whatsapp: f.whatsapp ?? "",
              anos_atividade: f.anos_atividade != null ? String(f.anos_atividade) : "",
              logo_url: f.logo_url ?? "",
            });
            setRacasSel(f.racas_principais ?? []);
          }
          const lista = Array.isArray(anunciosRes.data)
            ? anunciosRes.data
            : (anunciosRes.data as { data: AnuncioItem[] }).data ?? [];
          setAnuncios(lista);
          const avData = avRes.data;
          setAvaliacoes(Array.isArray(avData) ? avData : (avData as { data: Avaliacao[] }).data ?? []);
        });
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(raca: string) {
    setRacasSel(prev => prev.includes(raca) ? prev.filter(r => r !== raca) : [...prev, raca]);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErro(""); setSaved(false);
    try {
      const payload = {
        ...form,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        anos_atividade: form.anos_atividade ? Number(form.anos_atividade) : null,
        racas_principais: racasSel,
      };
      const method = fazenda ? "put" : "post";
      const { data } = await api[method]<Fazenda>("/fazenda", payload);
      setFazenda(data);
      setSaved(true);
    } catch (e: unknown) {
      setErro((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo() {
    if (!fazenda) return;
    setTogglingAtivo(true);
    try {
      const { data } = await api.put<Fazenda>("/fazenda", { ativo: !fazenda.ativo });
      setFazenda(data);
    } finally {
      setTogglingAtivo(false);
    }
  }

  async function toggleAnuncio(anuncioId: number) {
    try {
      const { data } = await api.post<{ exibir_na_fazenda: boolean }>(
        `/fazenda/anuncios/${anuncioId}/toggle`
      );
      setAnuncios(prev =>
        prev.map(a => a.id === anuncioId ? { ...a, exibir_na_fazenda: data.exibir_na_fazenda } : a)
      );
    } catch { /* silencioso */ }
  }

  async function enviarResposta(avaliacaoId: number) {
    if (!resposta.trim()) return;
    setEnviandoResposta(true);
    try {
      await api.put(`/avaliacoes/${avaliacaoId}/responder`, { resposta_vendedor: resposta.trim() });
      setAvaliacoes(prev =>
        prev.map(av => av.id === avaliacaoId ? { ...av, resposta_vendedor: resposta.trim() } : av)
      );
      setRespondendo(null); setResposta("");
    } finally {
      setEnviandoResposta(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  if (!temPlano) return <div className="max-w-lg mx-auto px-4 py-16"><BannerUpgrade /></div>;

  const anunciosExibidos = anuncios.filter(a => a.exibir_na_fazenda).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minha Fazenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure como compradores verão seu perfil</p>
        </div>
        {fazenda && (
          <a
            href={`/fazenda/${fazenda.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-green-700 font-semibold hover:underline shrink-0"
          >
            Ver página pública <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Toggle publicar */}
      {fazenda && (
        <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
          fazenda.ativo ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
        }`}>
          <div>
            <p className={`text-sm font-semibold ${fazenda.ativo ? "text-green-800" : "text-gray-700"}`}>
              {fazenda.ativo ? "Página publicada" : "Página pausada"}
            </p>
            <p className={`text-xs mt-0.5 ${fazenda.ativo ? "text-green-600" : "text-gray-500"}`}>
              {fazenda.ativo
                ? "Compradores podem encontrar sua fazenda"
                : "Sua página está oculta para compradores"}
            </p>
          </div>
          <button
            onClick={toggleAtivo}
            disabled={togglingAtivo}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition ${
              fazenda.ativo
                ? "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                : "bg-green-700 text-white hover:bg-green-800"
            }`}
          >
            {fazenda.ativo ? <EyeOff size={15} /> : <Eye size={15} />}
            {togglingAtivo ? "..." : fazenda.ativo ? "Pausar" : "Publicar"}
          </button>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Informações da fazenda</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da fazenda *</label>
            <input required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Fazenda Santa Rita" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={3} maxLength={1000} placeholder="Fale sobre sua fazenda, diferenciais, certificações..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado *</label>
            <input required maxLength={2} value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="MT" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Município *</label>
            <input required value={form.municipio} onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Rondonópolis" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Área (ha)</label>
            <input type="number" min="0" value={form.area_ha}
              onChange={e => setForm(p => ({ ...p, area_ha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Anos de atividade</label>
            <input type="number" min="0" value={form.anos_atividade}
              onChange={e => setForm(p => ({ ...p, anos_atividade: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="20" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Número GTA</label>
            <input value={form.gta_numero} onChange={e => setForm(p => ({ ...p, gta_numero: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="GTA-00000-0" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Número SISBOV</label>
            <input value={form.sisbov_numero} onChange={e => setForm(p => ({ ...p, sisbov_numero: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="BR0000000000000" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp</label>
            <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="5565999990000" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Site</label>
            <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="https://fazendaminha.com.br" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">URL do logo</label>
            <input type="url" value={form.logo_url} onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="https://..." />
          </div>
        </div>

        {/* Raças */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Raças principais</label>
          <div className="flex flex-wrap gap-2">
            {RACAS.map(r => (
              <button type="button" key={r} onClick={() => toggle(r)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  racasSel.includes(r)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-gray-200 text-gray-600 hover:border-green-400"
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-sm text-red-500">{erro}</p>}
        {saved && <p className="text-sm text-green-600 font-medium">Salvo com sucesso!</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm">
          {saving ? "Salvando..." : fazenda ? "Salvar alterações" : "Criar página da fazenda"}
        </button>
      </form>

      {/* Anúncios na página */}
      {fazenda && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Anúncios na página pública</h2>
              <p className="text-xs text-gray-500 mt-0.5">{anunciosExibidos} de {anuncios.length} visíveis — clique para ocultar</p>
            </div>
          </div>

          {anuncios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum anúncio ativo</p>
          ) : (
            <div className="space-y-2">
              {anuncios.map(a => (
                <div key={a.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition cursor-pointer ${
                    a.exibir_na_fazenda ? "border-green-200 bg-green-50" : "border-gray-100 bg-white hover:bg-gray-50"
                  }`}
                  onClick={() => toggleAnuncio(a.id)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-gray-500">
                      {a.animal?.raca} · {a.animal?.quantidade} cab. ·{" "}
                      R$ {a.preco_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`shrink-0 ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    a.exibir_na_fazenda ? "border-green-600 bg-green-600" : "border-gray-300"
                  }`}>
                    {a.exibir_na_fazenda && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Avaliações recebidas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Avaliações recebidas
          {avaliacoes.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">({avaliacoes.length})</span>
          )}
        </h2>

        {avaliacoes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma avaliação ainda</p>
        ) : (
          <div className="space-y-4">
            {avaliacoes.map(av => (
              <div key={av.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{av.comprador.nome}</p>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      Comprador verificado
                    </span>
                  </div>
                  <Estrelas nota={av.nota} />
                </div>
                {av.comentario && <p className="text-sm text-gray-600 mt-1">{av.comentario}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(av.created_at).toLocaleDateString("pt-BR")}</p>

                {av.resposta_vendedor ? (
                  <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-green-700 mb-0.5">Sua resposta</p>
                    <p className="text-xs text-green-800">{av.resposta_vendedor}</p>
                  </div>
                ) : respondendo === av.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea value={resposta} onChange={e => setResposta(e.target.value)}
                      rows={2} maxLength={1000} placeholder="Escreva sua resposta pública..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300" />
                    <div className="flex gap-2">
                      <button onClick={() => { setRespondendo(null); setResposta(""); }}
                        className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                      <button onClick={() => enviarResposta(av.id)}
                        disabled={enviandoResposta || !resposta.trim()}
                        className="text-xs bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition">
                        {enviandoResposta ? "Enviando..." : "Publicar resposta"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setRespondendo(av.id); setResposta(""); }}
                    className="mt-2 flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium">
                    <MessageSquare size={12} /> Responder
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
