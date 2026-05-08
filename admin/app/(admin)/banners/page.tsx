"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Banner, Paginated } from "@/lib/types";

type AnuncianteOpt = { id: number; empresa: string };

const POSICAO_LABEL: Record<string, string> = {
  home:  "🏠 Home",
  feed:  "📋 Feed",
  busca: "🔍 Busca",
};

const POSICAO_DESC: Record<string, string> = {
  home:  "Aparece na página inicial para todos os visitantes",
  feed:  "Aparece entre os anúncios de gado",
  busca: "Aparece nos resultados de busca",
};

export default function BannersPage() {
  const [data, setData]         = useState<Paginated<Banner> | null>(null);
  const [anunciantes, setAn]    = useState<AnuncianteOpt[]>([]);
  const [filtroPos, setFiltroPos] = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState<Banner | null>(null);

  const [form, setForm] = useState({
    anunciante_id: "",
    imagem_url: "",
    link_url: "",
    posicao: "home",
    ativo: true,
  });

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (filtroPos) params.set("posicao", filtroPos);
    const { data: res } = await api.get(`/banners?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => {
    carregar(1);
    api.get("/banners/anunciantes").then(({ data: res }) => setAn(res));
  }, [filtroPos]);

  function abrirNovo() {
    setEditando(null);
    setForm({ anunciante_id: "", imagem_url: "", link_url: "", posicao: "home", ativo: true });
    setModal(true);
  }

  function abrirEditar(b: Banner) {
    setEditando(b);
    setForm({
      anunciante_id: String(b.anunciante_id),
      imagem_url: b.imagem_url,
      link_url: b.link_url ?? "",
      posicao: b.posicao,
      ativo: b.ativo,
    });
    setModal(true);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, anunciante_id: Number(form.anunciante_id) };
    if (editando) {
      await api.put(`/banners/${editando.id}`, payload);
    } else {
      await api.post("/banners", payload);
    }
    setModal(false);
    carregar(page);
  }

  async function toggleAtivo(id: number) {
    await api.post(`/banners/${id}/toggle-ativo`);
    carregar(page);
  }

  async function deletar(id: number) {
    if (!confirm("Remover este banner?")) return;
    await api.delete(`/banners/${id}`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Banners B2B</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os anúncios pagos exibidos no marketplace</p>
        </div>
        <button
          onClick={abrirNovo}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition"
        >
          + Novo banner
        </button>
      </div>

      {/* Posições */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(POSICAO_LABEL).map(([pos, label]) => {
          const count = data?.data.filter((b) => b.posicao === pos && b.ativo).length ?? 0;
          return (
            <div key={pos} className={`bg-white rounded-2xl border p-4 cursor-pointer transition ${filtroPos === pos ? "border-green-400 ring-1 ring-green-300" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setFiltroPos(filtroPos === pos ? "" : pos)}>
              <p className="font-bold text-slate-700 text-sm">{label}</p>
              <p className="text-xs text-slate-400 mt-1">{POSICAO_DESC[pos]}</p>
              <p className="text-2xl font-extrabold text-green-600 mt-2">{count}</p>
              <p className="text-[11px] text-slate-400">ativos</p>
            </div>
          );
        })}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-600">
            {filtroPos ? `Filtrando: ${POSICAO_LABEL[filtroPos]}` : "Todos os banners"}
          </p>
          {filtroPos && (
            <button onClick={() => setFiltroPos("")} className="text-xs text-slate-400 hover:text-slate-600">
              Limpar filtro ×
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-5 py-3 text-left">Prévia</th>
                <th className="px-3 py-3 text-left">Anunciante</th>
                <th className="px-3 py-3 text-left">Posição</th>
                <th className="px-3 py-3 text-right">Impressões</th>
                <th className="px-3 py-3 text-right">Cliques</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data?.data.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <img src={b.imagem_url} alt="banner" className="h-10 w-20 object-cover rounded-lg border border-slate-200" />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-700">{b.anunciante?.empresa ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {POSICAO_LABEL[b.posicao]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-500">{b.impressoes.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{b.cliques.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => toggleAtivo(b.id)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.ativo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {b.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right space-x-3">
                    {b.link_url && (
                      <a href={b.link_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">Link</a>
                    )}
                    <button onClick={() => abrirEditar(b)} className="text-xs text-amber-600 hover:underline">Editar</button>
                    <button onClick={() => deletar(b.id)} className="text-xs text-red-500 hover:underline">Remover</button>
                  </td>
                </tr>
              ))}
              {!data?.data.length && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">Nenhum banner cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">{data.total} banners · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1} className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page} className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-800">{editando ? "Editar banner" : "Novo banner"}</h2>

            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Anunciante</label>
                <select required value={form.anunciante_id} onChange={(e) => setForm({ ...form, anunciante_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {anunciantes.map((a) => <option key={a.id} value={a.id}>{a.empresa}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">URL da imagem</label>
                <input required type="url" value={form.imagem_url}
                  onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
                  placeholder="https://... (Canva, Drive, etc.)"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                {form.imagem_url && (
                  <img src={form.imagem_url} alt="preview" className="mt-2 h-16 object-cover rounded-lg border border-slate-200 w-full" />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Link de destino (opcional)</label>
                <input type="url" value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://site-do-anunciante.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Posição no marketplace</label>
                <select value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(POSICAO_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l} — {POSICAO_DESC[v]}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="rounded" />
                <label htmlFor="ativo" className="text-sm text-slate-600">Publicar imediatamente</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold">
                  {editando ? "Salvar" : "Publicar banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
