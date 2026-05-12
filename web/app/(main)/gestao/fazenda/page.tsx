"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Star, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

const RACAS = [
  "Nelore", "Angus", "Gir", "Brahman", "Senepol", "Simmental",
  "Hereford", "Brangus", "Tabapuã", "Guzerá", "Caracu", "Pantaneiro",
  "Canchim", "Bonsmara", "Limousin", "Cruzamento Industrial",
];

type Fazenda = {
  id: number;
  slug: string;
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
        <Star key={i} size={14} className={i <= nota ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
      ))}
    </span>
  );
}

export default function GestaoFazendaPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [fazenda, setFazenda] = useState<Fazenda | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState("");

  const [form, setForm] = useState({
    nome: "", descricao: "", estado: "", municipio: "",
    area_ha: "", gta_numero: "", sisbov_numero: "",
    website: "", whatsapp: "", anos_atividade: "",
    logo_url: "",
  });
  const [racasSel, setRacasSel] = useState<string[]>([]);

  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [resposta, setResposta] = useState("");
  const [enviandoResposta, setEnviandoResposta] = useState(false);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }

    Promise.all([
      api.get<Fazenda | null>("/fazenda/minha"),
      api.get<{ data: Avaliacao[] } | Avaliacao[]>("/avaliacoes/recebidas").catch(() => ({ data: [] })),
    ]).then(([fazRes, avRes]) => {
      const f = fazRes.data;
      if (f) {
        setFazenda(f);
        setForm({
          nome:           f.nome ?? "",
          descricao:      f.descricao ?? "",
          estado:         f.estado ?? "",
          municipio:      f.municipio ?? "",
          area_ha:        f.area_ha != null ? String(f.area_ha) : "",
          gta_numero:     f.gta_numero ?? "",
          sisbov_numero:  f.sisbov_numero ?? "",
          website:        f.website ?? "",
          whatsapp:       f.whatsapp ?? "",
          anos_atividade: f.anos_atividade != null ? String(f.anos_atividade) : "",
          logo_url:       f.logo_url ?? "",
        });
        setRacasSel(f.racas_principais ?? []);
      }
      const avData = avRes.data;
      setAvaliacoes(Array.isArray(avData) ? avData : (avData as { data: Avaliacao[] }).data ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  function toggle(raca: string) {
    setRacasSel(prev =>
      prev.includes(raca) ? prev.filter(r => r !== raca) : [...prev, raca]
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErro("");
    setSaved(false);
    try {
      const payload = {
        ...form,
        area_ha:        form.area_ha ? Number(form.area_ha) : null,
        anos_atividade: form.anos_atividade ? Number(form.anos_atividade) : null,
        racas_principais: racasSel,
      };
      const method = fazenda ? "put" : "post";
      const { data } = await api[method]<Fazenda>("/fazenda", payload);
      setFazenda(data);
      setSaved(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function enviarResposta(avaliacaoId: number) {
    if (!resposta.trim()) return;
    setEnviandoResposta(true);
    try {
      await api.put(`/avaliacoes/${avaliacaoId}/responder`, { resposta_vendedor: resposta.trim() });
      setAvaliacoes(prev =>
        prev.map(av => av.id === avaliacaoId ? { ...av, resposta_vendedor: resposta.trim() } : av)
      );
      setRespondendo(null);
      setResposta("");
    } catch {
      // silencioso
    } finally {
      setEnviandoResposta(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Página da Fazenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure como compradores verão seu perfil</p>
        </div>
        {fazenda && (
          <a
            href={`/fazenda/${fazenda.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-green-700 font-semibold hover:underline"
          >
            Ver página pública <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Informações da fazenda</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da fazenda *</label>
            <input
              required value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Fazenda Santa Rita"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={3} maxLength={1000}
              placeholder="Fale sobre a sua fazenda, diferenciais, certificações..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado *</label>
            <input
              required maxLength={2} value={form.estado}
              onChange={e => setForm(p => ({ ...p, estado: e.target.value.toUpperCase() }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="MT"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Município *</label>
            <input
              required value={form.municipio}
              onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Rondonópolis"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Área (ha)</label>
            <input
              type="number" min="0" value={form.area_ha}
              onChange={e => setForm(p => ({ ...p, area_ha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Anos de atividade</label>
            <input
              type="number" min="0" value={form.anos_atividade}
              onChange={e => setForm(p => ({ ...p, anos_atividade: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Número GTA</label>
            <input
              value={form.gta_numero}
              onChange={e => setForm(p => ({ ...p, gta_numero: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="GTA-00000-0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Número SISBOV</label>
            <input
              value={form.sisbov_numero}
              onChange={e => setForm(p => ({ ...p, sisbov_numero: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="BR0000000000000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp</label>
            <input
              value={form.whatsapp}
              onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="5565999990000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Site</label>
            <input
              type="url" value={form.website}
              onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="https://fazendaminha.com.br"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">URL do logo</label>
            <input
              type="url" value={form.logo_url}
              onChange={e => setForm(p => ({ ...p, logo_url: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Raças */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Raças principais</label>
          <div className="flex flex-wrap gap-2">
            {RACAS.map(r => (
              <button
                type="button" key={r}
                onClick={() => toggle(r)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  racasSel.includes(r)
                    ? "bg-green-600 border-green-600 text-white"
                    : "border-gray-200 text-gray-600 hover:border-green-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="text-sm text-red-500">{erro}</p>}
        {saved && <p className="text-sm text-green-600 font-medium">Página atualizada com sucesso!</p>}

        <button
          type="submit" disabled={saving}
          className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
        >
          {saving ? "Salvando..." : fazenda ? "Salvar alterações" : "Criar página da fazenda"}
        </button>
      </form>

      {/* Avaliações recebidas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Avaliações recebidas</h2>

        {avaliacoes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhuma avaliação ainda</p>
        ) : (
          <div className="space-y-4">
            {avaliacoes.map(av => (
              <div key={av.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-800">{av.comprador.nome}</p>
                  <Estrelas nota={av.nota} />
                </div>
                {av.comentario && (
                  <p className="text-sm text-gray-600 mt-1">{av.comentario}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(av.created_at).toLocaleDateString("pt-BR")}
                </p>

                {av.resposta_vendedor ? (
                  <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-green-700 mb-0.5">Sua resposta</p>
                    <p className="text-xs text-green-800">{av.resposta_vendedor}</p>
                  </div>
                ) : respondendo === av.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={resposta}
                      onChange={e => setResposta(e.target.value)}
                      rows={2} maxLength={1000}
                      placeholder="Escreva sua resposta pública..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRespondendo(null); setResposta(""); }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => enviarResposta(av.id)}
                        disabled={enviandoResposta || !resposta.trim()}
                        className="text-xs bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition"
                      >
                        {enviandoResposta ? "Enviando..." : "Publicar resposta"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRespondendo(av.id); setResposta(""); }}
                    className="mt-2 flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                  >
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
