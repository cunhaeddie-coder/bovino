"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Usuario, Paginated } from "@/lib/types";

const TIPO_BADGE: Record<string, string> = {
  comprador: "bg-blue-100 text-blue-700",
  vendedor:  "bg-green-100 text-green-700",
  ambos:     "bg-yellow-100 text-yellow-700",
};

function CadastrarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", celular: "", email: "", tipo: "ambos", estado: "", municipio: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/usuarios", form);
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao cadastrar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Cadastrar novo cliente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          {[
            { label: "Nome completo *", key: "nome", type: "text", placeholder: "João da Silva", required: true },
            { label: "Celular (WhatsApp) *", key: "celular", type: "tel", placeholder: "65 99999-0000", required: true },
            { label: "E-mail", key: "email", type: "email", placeholder: "opcional" },
          ].map(({ label, key, type, placeholder, required }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
              <input type={type} required={required} placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo *</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="ambos">Comprador e Produtor</option>
              <option value="vendedor">Produtor</option>
              <option value="comprador">Comprador</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Estado", key: "estado", placeholder: "MT" },
              { label: "Município", key: "municipio", placeholder: "Rondonópolis" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <input value={(form as any)[key]} placeholder={placeholder}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            O cliente faz login via OTP (código SMS/WhatsApp). Nenhuma senha é criada.
          </p>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50">
              {saving ? "Cadastrando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [data, setData]           = useState<Paginated<Usuario> | null>(null);
  const [busca, setBusca]         = useState("");
  const [tipo, setTipo]           = useState("");
  const [status, setStatus]       = useState("");
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [cadastrarModal, setCadastrarModal] = useState(false);

  async function carregar(p = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (busca)  params.set("busca", busca);
    if (tipo)   params.set("tipo", tipo);
    if (status) params.set("status", status);
    const { data: res } = await api.get(`/usuarios?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1); }, [busca, tipo, status]);

  async function acao(endpoint: string, metodo: "post" | "delete", id: number) {
    await api[metodo](`/usuarios/${id}${endpoint}`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">Compradores e produtores cadastrados na plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {data?.total ?? "—"} cadastrados
          </span>
          <button onClick={() => setCadastrarModal(true)}
            className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
            + Cadastrar cliente
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou celular..."
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-72 bg-white" />
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os tipos</option>
          <option value="comprador">Comprador</option>
          <option value="vendedor">Produtor</option>
          <option value="ambos">Ambos</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Tipo</th>
                <th className="text-left px-3 py-3">Plano ativo</th>
                <th className="text-left px-3 py-3">Estado</th>
                <th className="text-right px-3 py-3">Anúncios</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Cadastro</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum cliente encontrado.</td></tr>
              ) : data?.data.map((u) => {
                const inativo   = !!u.deleted_at;
                const bloqueado = u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date();
                const planoNome = u.assinatura_ativa?.plano?.nome;
                return (
                  <tr key={u.id} className={`border-t border-slate-50 hover:bg-slate-50 transition ${inativo ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{u.nome}</p>
                      <p className="text-xs text-slate-400">{u.celular} {u.email ? `· ${u.email}` : ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_BADGE[u.tipo] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {planoNome ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⭐ {planoNome}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem plano</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">{u.estado ?? "—"}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{u.anuncios_count ?? 0}</td>
                    <td className="px-3 py-3">
                      {inativo ? (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Inativo</span>
                      ) : bloqueado ? (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Bloqueado</span>
                      ) : (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {inativo ? (
                          <button onClick={() => acao("/reativar", "post", u.id)}
                            className="text-xs text-green-600 hover:underline">Reativar</button>
                        ) : (
                          <>
                            {bloqueado ? (
                              <button onClick={() => acao("/desbloquear", "post", u.id)}
                                className="text-xs text-blue-600 hover:underline">Desbloquear</button>
                            ) : (
                              <button onClick={() => acao("/bloquear", "post", u.id)}
                                className="text-xs text-orange-500 hover:underline">Bloquear</button>
                            )}
                            <button onClick={() => acao("", "delete", u.id)}
                              className="text-xs text-red-500 hover:underline">Desativar</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.last_page > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-400 text-xs">{data.total} clientes · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {cadastrarModal && (
        <CadastrarModal onClose={() => setCadastrarModal(false)} onDone={() => carregar(1)} />
      )}
    </div>
  );
}
