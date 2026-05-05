"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Custo = {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  recorrencia: "mensal" | "anual" | "unico";
  data_vencimento: string | null;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

type Resumo = {
  mrca: number;
  total_anual: number;
  total_unico: number;
  por_categoria: Record<string, { total_mensal: number; count: number }>;
  vencimentos: (Custo & { data_vencimento: string })[];
};

const CATEGORIAS = ["hosting", "apis", "ferramentas", "marketing", "pessoal", "juridico", "outro"] as const;
type Categoria = typeof CATEGORIAS[number];

const CAT_LABEL: Record<Categoria, string> = {
  hosting:     "Hosting / Infra",
  apis:        "APIs externas",
  ferramentas: "Ferramentas",
  marketing:   "Marketing",
  pessoal:     "Pessoal",
  juridico:    "Jurídico",
  outro:       "Outro",
};

const CAT_COLOR: Record<Categoria, string> = {
  hosting:     "bg-blue-100 text-blue-700",
  apis:        "bg-purple-100 text-purple-700",
  ferramentas: "bg-cyan-100 text-cyan-700",
  marketing:   "bg-pink-100 text-pink-700",
  pessoal:     "bg-amber-100 text-amber-700",
  juridico:    "bg-red-100 text-red-600",
  outro:       "bg-slate-100 text-slate-600",
};

const REC_LABEL = { mensal: "Mensal", anual: "Anual", unico: "Único" };
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

type FormData = {
  descricao: string;
  categoria: Categoria;
  valor: string;
  recorrencia: "mensal" | "anual" | "unico";
  data_vencimento: string;
  observacao: string;
  ativo: boolean;
};

const emptyForm = (): FormData => ({
  descricao: "", categoria: "outro", valor: "", recorrencia: "mensal",
  data_vencimento: "", observacao: "", ativo: true,
});

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-light">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function CustosPage() {
  const [data, setData]       = useState<Paginated<Custo> | null>(null);
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [cat, setCat]         = useState("");
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Custo | null>(null);
  const [form, setForm]       = useState<FormData>(emptyForm());
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (cat) params.set("categoria", cat);
    const [list, res] = await Promise.all([
      api.get(`/custos?${params}`),
      api.get("/custos/resumo"),
    ]);
    setData(list.data);
    setResumo(res.data);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [cat]);

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setModal("create");
  }

  function openEdit(c: Custo) {
    setSelected(c);
    setForm({
      descricao: c.descricao,
      categoria: c.categoria as Categoria,
      valor: String(c.valor),
      recorrencia: c.recorrencia,
      data_vencimento: c.data_vencimento?.slice(0, 10) ?? "",
      observacao: c.observacao ?? "",
      ativo: c.ativo,
    });
    setError("");
    setModal("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        valor: parseFloat(form.valor),
        data_vencimento: form.data_vencimento || null,
        observacao: form.observacao || null,
      };
      if (modal === "create") {
        await api.post("/custos", payload);
      } else if (modal === "edit" && selected) {
        await api.put(`/custos/${selected.id}`, payload);
      }
      setModal(null);
      carregar(page);
    } catch (err: any) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : (err.response?.data?.message ?? "Erro ao salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: number) {
    if (!confirm("Remover este custo?")) return;
    await api.delete(`/custos/${id}`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Custos do SaaS</h1>
          <p className="text-xs text-slate-400 mt-0.5">Controle todos os custos operacionais da plataforma</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
        >
          + Novo custo
        </button>
      </div>

      {/* KPI Cards */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo mensal total</p>
            <p className="text-2xl font-extrabold mt-1 text-red-600">{BRL(resumo.mrca)}</p>
            <p className="text-xs text-slate-400 mt-1">MRC — recorrência mensal</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custo anual</p>
            <p className="text-2xl font-extrabold mt-1 text-orange-600">{BRL(resumo.total_anual)}</p>
            <p className="text-xs text-slate-400 mt-1">Contratos anuais ativos</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gastos únicos</p>
            <p className="text-2xl font-extrabold mt-1 text-slate-700">{BRL(resumo.total_unico)}</p>
            <p className="text-xs text-slate-400 mt-1">Licenças e aquisições</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vencimentos em 30d</p>
            <p className={`text-2xl font-extrabold mt-1 ${resumo.vencimentos.length > 0 ? "text-yellow-600" : "text-slate-700"}`}>
              {resumo.vencimentos.length}
            </p>
            <p className="text-xs text-slate-400 mt-1">pagamentos próximos</p>
          </div>
        </div>
      )}

      {/* Por categoria */}
      {resumo && Object.keys(resumo.por_categoria).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(resumo.por_categoria).map(([cat, info]) => (
            <div key={cat} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[cat as Categoria] ?? "bg-slate-100 text-slate-500"}`}>
                {CAT_LABEL[cat as Categoria] ?? cat}
              </span>
              <p className="text-lg font-extrabold text-slate-800 mt-2">{BRL(info.total_mensal)}<span className="text-xs font-normal text-slate-400">/mês</span></p>
              <p className="text-xs text-slate-400">{info.count} {info.count === 1 ? "item" : "itens"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vencimentos próximos */}
      {resumo && resumo.vencimentos.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-yellow-700 mb-2">Vencimentos nos próximos 30 dias</p>
          <div className="space-y-1.5">
            {resumo.vencimentos.map((v) => (
              <div key={v.id} className="flex items-center gap-3 text-xs">
                <span className={`px-1.5 py-0.5 rounded-full font-semibold ${CAT_COLOR[v.categoria as Categoria] ?? ""}`}>
                  {CAT_LABEL[v.categoria as Categoria] ?? v.categoria}
                </span>
                <span className="text-slate-700 font-medium">{v.descricao}</span>
                <span className="text-slate-500">{BRL(v.valor)}</span>
                <span className="ml-auto text-yellow-700 font-semibold">
                  {new Date(v.data_vencimento).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["", ...CATEGORIAS].map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${cat === c ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-green-400"}`}>
            {c === "" ? "Todos" : CAT_LABEL[c as Categoria]}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-3 py-3">Categoria</th>
                <th className="text-right px-3 py-3">Valor</th>
                <th className="text-left px-3 py-3">Recorrência</th>
                <th className="text-left px-3 py-3">Vencimento</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum custo cadastrado.</td></tr>
              ) : data?.data.map((c) => (
                <tr key={c.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{c.descricao}</p>
                    {c.observacao && <p className="text-xs text-slate-400 truncate max-w-xs">{c.observacao}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[c.categoria as Categoria] ?? "bg-slate-100 text-slate-500"}`}>
                      {CAT_LABEL[c.categoria as Categoria] ?? c.categoria}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{BRL(c.valor)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{REC_LABEL[c.recorrencia]}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {c.data_vencimento ? new Date(c.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(c)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition">
                        Editar
                      </button>
                      <button onClick={() => remover(c.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 font-medium transition">
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-400 text-xs">{data.total} registros · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === "create" ? "Novo custo" : `Editar: ${selected?.descricao}`} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ex: Servidor AWS EC2" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Recorrência</label>
                <select value={form.recorrencia} onChange={(e) => setForm({ ...form, recorrencia: e.target.value as any })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                  <option value="unico">Único</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Valor (R$)</label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="0,00" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Vencimento</label>
                <input type="date" value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Observação</label>
              <textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                placeholder="Detalhes adicionais..." />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="accent-green-600 w-4 h-4" />
              <span className="text-sm text-slate-700 font-medium">Custo ativo</span>
            </label>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60">
                {saving ? "Salvando…" : modal === "create" ? "Adicionar" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
