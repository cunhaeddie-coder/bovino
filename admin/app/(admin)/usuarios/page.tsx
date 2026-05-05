"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Usuario, Paginated } from "@/lib/types";

const BADGE: Record<string, string> = {
  comprador: "bg-blue-100 text-blue-700",
  produtor:  "bg-green-100 text-green-700",
  ambos:     "bg-yellow-100 text-yellow-700",
};

type Plano = { id: number; slug: string; nome: string; tipo: string; preco: number };

function SimularPlanoModal({
  usuario,
  planos,
  onClose,
  onDone,
}: {
  usuario: Usuario;
  planos: Plano[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const usuarioPlanos = planos.filter((p) => {
    if (usuario.tipo === "comprador") return p.tipo === "comprador";
    if (usuario.tipo === "vendedor" || usuario.tipo === "produtor") return p.tipo === "produtor";
    return p.tipo !== "anunciante";
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/usuarios/${usuario.id}/simular-plano`, { plano_slug: slug });
      setSuccess(data.message);
      setTimeout(() => { onDone(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao ativar plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Simular plano (teste)</h2>
            <p className="text-xs text-slate-400">{usuario.nome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-light">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            Ativa o plano diretamente sem pagamento real. Válido por 1 ano.
          </div>

          <div className="space-y-2">
            {usuarioPlanos.map((p) => (
              <label key={p.slug} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${slug === p.slug ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" name="plano" value={p.slug} checked={slug === p.slug}
                  onChange={() => setSlug(p.slug)} className="accent-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{p.nome}</p>
                  <p className="text-xs text-slate-400 capitalize">{p.tipo}</p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}/mês
                </span>
              </label>
            ))}
            {usuarioPlanos.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum plano disponível para este tipo de usuário.</p>
            )}
          </div>

          {error   && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">{success}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !slug}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50">
              {saving ? "Ativando..." : "Ativar plano"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [data, setData]     = useState<Paginated<Usuario> | null>(null);
  const [busca, setBusca]   = useState("");
  const [tipo, setTipo]     = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [simularUsuario, setSimularUsuario] = useState<Usuario | null>(null);

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

  useEffect(() => {
    // Fetch plans from public API (no admin prefix needed)
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/planos`)
      .then(r => r.json())
      .then((grupos: Record<string, Plano[]>) => {
        const todos = Object.values(grupos).flat();
        setPlanos(todos);
      })
      .catch(() => {});
  }, []);

  async function acao(endpoint: string, metodo: "post" | "delete", id: number) {
    await api[metodo](`/usuarios/${id}${endpoint}`);
    carregar(page);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Usuários</h1>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          {data?.total ?? "—"} cadastrados
        </span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, e-mail ou celular..."
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-72 bg-white"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os tipos</option>
          <option value="comprador">Comprador</option>
          <option value="produtor">Produtor</option>
          <option value="ambos">Ambos</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Nome</th>
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
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum usuário encontrado.</td></tr>
              ) : data?.data.map((u) => {
                const inativo   = !!u.deleted_at;
                const bloqueado = u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date();
                const planoNome = u.assinatura_ativa?.plano?.nome;
                return (
                  <tr key={u.id} className={`border-t border-slate-50 hover:bg-slate-50 transition ${inativo ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-slate-800">{u.nome}</p>
                      <p className="text-xs text-slate-400">{u.email ?? u.celular}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[u.tipo] ?? "bg-slate-100 text-slate-600"}`}>
                        {u.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {planoNome ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          ⭐ {planoNome}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Free</span>
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
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        {/* Test tool */}
                        {!inativo && (
                          <button
                            onClick={() => setSimularUsuario(u)}
                            className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold border border-amber-200 transition"
                          >
                            Simular plano
                          </button>
                        )}
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
            <span className="text-slate-400 text-xs">{data.total} usuários · pág. {data.current_page}/{data.last_page}</span>
            <div className="flex gap-2">
              <button onClick={() => carregar(page - 1)} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">← Anterior</button>
              <button onClick={() => carregar(page + 1)} disabled={page === data.last_page}
                className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 text-xs">Próxima →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal simular plano */}
      {simularUsuario && (
        <SimularPlanoModal
          usuario={simularUsuario}
          planos={planos}
          onClose={() => setSimularUsuario(null)}
          onDone={() => carregar(page)}
        />
      )}
    </div>
  );
}
