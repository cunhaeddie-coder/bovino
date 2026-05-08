"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Banner, Paginated } from "@/lib/types";

type AnuncianteOpt = { id: number; empresa: string };

const POSICAO_LABEL: Record<string, string> = {
  home:  "Home",
  feed:  "Feed",
  busca: "Busca",
};

const POSICAO_DESC: Record<string, string> = {
  home:  "Aparece na página inicial para todos os visitantes",
  feed:  "Aparece entre os anúncios de gado",
  busca: "Aparece nos resultados de busca",
};

const ABRANGENCIA_LABEL: Record<string, string> = {
  nacional:  "Nacional",
  estadual:  "Estadual",
  municipal: "Municipal",
};

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

function AbrangenciaBadge({ banner }: { banner: Banner }) {
  const cores: Record<string, string> = {
    nacional:  "bg-blue-100 text-blue-700",
    estadual:  "bg-amber-100 text-amber-700",
    municipal: "bg-purple-100 text-purple-700",
  };
  const extra =
    banner.abrangencia === "estadual" && banner.estados?.length
      ? ` · ${banner.estados.join(", ")}`
      : banner.abrangencia === "municipal" && banner.municipios?.length
      ? ` · ${banner.municipios.slice(0, 2).join(", ")}${banner.municipios.length > 2 ? "…" : ""}`
      : "";
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cores[banner.abrangencia]}`}>
      {ABRANGENCIA_LABEL[banner.abrangencia]}{extra}
    </span>
  );
}

// Seletor de municípios: escolhe UF → carrega lista via IBGE → seleciona múltiplos
function MunicipioSelector({
  municipiosSel,
  onChange,
}: {
  municipiosSel: string[];
  onChange: (m: string[]) => void;
}) {
  const [ufSel, setUfSel]         = useState("");
  const [lista, setLista]         = useState<string[]>([]);
  const [busca, setBusca]         = useState("");
  const [carregando, setCarregando] = useState(false);

  async function carregarMunicipios(uf: string) {
    if (!uf) { setLista([]); return; }
    setCarregando(true);
    try {
      const res = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`
      );
      const json = await res.json();
      setLista(json.map((m: { nome: string }) => m.nome));
    } finally {
      setCarregando(false);
    }
  }

  function toggleMunicipio(nome: string) {
    onChange(
      municipiosSel.includes(nome)
        ? municipiosSel.filter((m) => m !== nome)
        : [...municipiosSel, nome]
    );
  }

  const filtrados = lista.filter((m) =>
    m.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Escolha do estado */}
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Estado</label>
        <select
          value={ufSel}
          onChange={(e) => { setUfSel(e.target.value); setBusca(""); carregarMunicipios(e.target.value); }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Selecione o estado...</option>
          {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>

      {/* Selecionados */}
      {municipiosSel.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {municipiosSel.map((m) => (
            <span key={m} className="flex items-center gap-1 bg-purple-100 text-purple-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {m}
              <button type="button" onClick={() => toggleMunicipio(m)} className="hover:text-purple-900 leading-none">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Lista de municípios */}
      {ufSel && (
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">
            Municípios de {ufSel} ({municipiosSel.length} selecionados)
          </label>
          <input
            type="text"
            placeholder="Buscar cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm mb-1"
          />
          {carregando ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-44">
              {filtrados.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMunicipio(m)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition ${
                    municipiosSel.includes(m)
                      ? "bg-purple-50 text-purple-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {municipiosSel.includes(m) ? "✓ " : ""}{m}
                </button>
              ))}
              {filtrados.length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-400 text-center">Nenhuma cidade encontrada</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BannersPage() {
  const [data, setData]           = useState<Paginated<Banner> | null>(null);
  const [anunciantes, setAn]      = useState<AnuncianteOpt[]>([]);
  const [filtroPos, setFiltroPos] = useState("");
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(false);
  const [editando, setEditando]   = useState<Banner | null>(null);

  const [form, setForm] = useState({
    anunciante_id: "",
    imagem_url:    "",
    link_url:      "",
    posicao:       "home",
    abrangencia:   "nacional",
    estadosSel:    [] as string[],
    municipiosSel: [] as string[],
    ativo:         true,
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
    setForm({ anunciante_id: "", imagem_url: "", link_url: "", posicao: "home", abrangencia: "nacional", estadosSel: [], municipiosSel: [], ativo: true });
    setModal(true);
  }

  function abrirEditar(b: Banner) {
    setEditando(b);
    setForm({
      anunciante_id: String(b.anunciante_id),
      imagem_url:    b.imagem_url,
      link_url:      b.link_url ?? "",
      posicao:       b.posicao,
      abrangencia:   b.abrangencia,
      estadosSel:    b.estados ?? [],
      municipiosSel: b.municipios ?? [],
      ativo:         b.ativo,
    });
    setModal(true);
  }

  function toggleEstado(uf: string) {
    setForm((f) => ({
      ...f,
      estadosSel: f.estadosSel.includes(uf)
        ? f.estadosSel.filter((e) => e !== uf)
        : [...f.estadosSel, uf],
    }));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      anunciante_id: Number(form.anunciante_id),
      imagem_url:    form.imagem_url,
      link_url:      form.link_url || null,
      posicao:       form.posicao,
      abrangencia:   form.abrangencia,
      estados:       form.abrangencia === "estadual"  ? form.estadosSel    : null,
      municipios:    form.abrangencia === "municipal" ? form.municipiosSel : null,
      ativo:         form.ativo,
    };

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

      {/* Cards de posição */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(POSICAO_LABEL).map(([pos, label]) => {
          const count = data?.data.filter((b) => b.posicao === pos && b.ativo).length ?? 0;
          return (
            <div key={pos}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition ${filtroPos === pos ? "border-green-400 ring-1 ring-green-300" : "border-slate-200 hover:border-slate-300"}`}
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
                <th className="px-3 py-3 text-left">Abrangência</th>
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
                  <td className="px-3 py-3">
                    <AbrangenciaBadge banner={b} />
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
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-sm">Nenhum banner cadastrado.</td></tr>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-extrabold text-slate-800">{editando ? "Editar banner" : "Novo banner"}</h2>

            <form onSubmit={handleSalvar} className="space-y-4">
              {/* Anunciante */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Anunciante</label>
                <select required value={form.anunciante_id} onChange={(e) => setForm({ ...form, anunciante_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {anunciantes.map((a) => <option key={a.id} value={a.id}>{a.empresa}</option>)}
                </select>
              </div>

              {/* Imagem */}
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

              {/* Link */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Link de destino (opcional)</label>
                <input type="url" value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://site-do-anunciante.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>

              {/* Posição */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Posição no marketplace</label>
                <select value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {Object.entries(POSICAO_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l} — {POSICAO_DESC[v]}</option>
                  ))}
                </select>
              </div>

              {/* Abrangência */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Abrangência</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["nacional", "estadual", "municipal"] as const).map((ab) => (
                    <button key={ab} type="button"
                      onClick={() => setForm({ ...form, abrangencia: ab, estadosSel: [], municipiosSel: [] })}
                      className={`py-2 rounded-lg border text-xs font-semibold transition ${form.abrangencia === ab ? "bg-green-50 border-green-400 text-green-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                      {ab === "nacional" ? "Nacional" : ab === "estadual" ? "Estadual" : "Municipal"}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {form.abrangencia === "nacional"  && "Aparece para todos os usuários do Brasil"}
                  {form.abrangencia === "estadual"  && "Aparece apenas nos estados selecionados abaixo"}
                  {form.abrangencia === "municipal" && "Aparece apenas nas cidades selecionadas abaixo"}
                </p>
              </div>

              {/* Seleção de estados */}
              {form.abrangencia === "estadual" && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-2">
                    Estados ({form.estadosSel.length} selecionados)
                  </label>
                  <div className="grid grid-cols-9 gap-1">
                    {ESTADOS_BR.map((uf) => (
                      <button key={uf} type="button"
                        onClick={() => toggleEstado(uf)}
                        className={`py-1 rounded text-[11px] font-bold transition ${form.estadosSel.includes(uf) ? "bg-green-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        {uf}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Seleção de municípios */}
              {form.abrangencia === "municipal" && (
                <MunicipioSelector
                  municipiosSel={form.municipiosSel}
                  onChange={(m) => setForm((f) => ({ ...f, municipiosSel: m }))}
                />
              )}

              {/* Publicar */}
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
