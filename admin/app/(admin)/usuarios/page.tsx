"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Usuario, Paginated } from "@/lib/types";

const BADGE: Record<string, string> = {
  comprador: "bg-blue-100 text-blue-700",
  produtor:  "bg-green-100 text-green-700",
  ambos:     "bg-yellow-100 text-yellow-700",
};

type Plano = { id: number; slug: string; nome: string; tipo: string; preco: number; preco_anual: number | null; max_cabecas: number | null };
const PIX_CNPJ = "12.407.190/0001-45";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function CadastrarClienteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", celular: "", email: "", tipo: "ambos", estado: "", municipio: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post("/usuarios", form);
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao cadastrar.");
    } finally { setSaving(false); }
  }

  const field = (label: string, key: keyof typeof form, type = "text", opts?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" {...opts} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">Cadastrar novo cliente</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {field("Nome completo *", "nome", "text", { required: true, placeholder: "João da Silva" })}
          {field("Celular (WhatsApp) *", "celular", "tel", { required: true, placeholder: "65 99999-0000" })}
          {field("E-mail", "email", "email", { placeholder: "opcional" })}
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
            {field("Estado", "estado", "text", { maxLength: 2, placeholder: "MT", className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase" })}
            {field("Município", "municipio", "text", { placeholder: "Rondonópolis" })}
          </div>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            O cliente fará login via OTP (código enviado ao celular). Nenhuma senha é criada.
          </p>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50">
              {saving ? "Cadastrando..." : "Cadastrar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssinaturaManualModal({ usuario, planos, onClose, onDone }: {
  usuario: Usuario; planos: Plano[]; onClose: () => void; onDone: () => void;
}) {
  const [slug, setSlug]       = useState("");
  const [periodo, setPeriodo] = useState<"mensal" | "anual">("mensal");
  const [step, setStep]       = useState<"form" | "pix">("form");
  const [pixData, setPixData] = useState<{ assinatura_id: number; valor: number; pix: { chave: string; nome: string; valor: string } } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError]     = useState("");
  const [copiado, setCopiado] = useState(false);

  const produtorPlanos = planos.filter(p => p.tipo === "produtor");
  const planoSel = produtorPlanos.find(p => p.slug === slug);
  const valorSel = planoSel ? (periodo === "anual" && planoSel.preco_anual ? planoSel.preco_anual : planoSel.preco) : 0;

  async function criarAssinatura() {
    if (!slug) return;
    setSaving(true); setError("");
    try {
      const { data } = await api.post("/assinaturas/manual", { usuario_id: usuario.id, plano_slug: slug, periodo });
      setPixData(data);
      setStep("pix");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao criar assinatura.");
    } finally { setSaving(false); }
  }

  async function confirmarPix() {
    if (!pixData) return;
    setConfirmando(true);
    try {
      await api.post(`/assinaturas/${pixData.assinatura_id}/confirmar-pix`);
      onDone(); onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao confirmar.");
    } finally { setConfirmando(false); }
  }

  function copiar(txt: string) {
    navigator.clipboard?.writeText(txt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Assinatura manual — PIX</h2>
            <p className="text-xs text-slate-400">{usuario.nome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        {step === "form" ? (
          <div className="p-6 space-y-4">
            {/* Toggle mensal/anual */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
              {(["mensal", "anual"] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`flex-1 py-2 transition ${periodo === p ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                  {p === "mensal" ? "Mensal" : "Anual (1 mês grátis)"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {produtorPlanos.map(p => {
                const val = periodo === "anual" && p.preco_anual ? p.preco_anual : p.preco;
                const label = p.max_cabecas ? `até ${p.max_cabecas.toLocaleString("pt-BR")} cab.` : "";
                return (
                  <label key={p.slug} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${slug === p.slug ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" name="plano_manual" value={p.slug} checked={slug === p.slug}
                      onChange={() => setSlug(p.slug)} className="accent-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{p.nome} {label && <span className="text-xs font-normal text-slate-400">— {label}</span>}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{fmt(val)}{periodo === "mensal" ? "/mês" : "/ano"}</span>
                  </label>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition">
                Cancelar
              </button>
              <button onClick={criarAssinatura} disabled={saving || !slug}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {saving ? "Gerando PIX..." : "Gerar dados PIX"}
              </button>
            </div>
          </div>
        ) : pixData ? (
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">💠</p>
              <p className="text-sm font-bold text-green-800">Dados para pagamento PIX</p>
              <p className="text-xs text-green-600 mt-0.5">Envie para o cliente via WhatsApp</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-xs">Chave PIX (CNPJ)</span>
                <span className="font-bold text-slate-800">{PIX_CNPJ}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-slate-500 text-xs">Favorecido</span>
                <span className="font-bold text-slate-800 text-xs">{pixData.pix.nome}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-amber-600 text-xs font-semibold">Valor</span>
                <span className="font-extrabold text-amber-800">R$ {pixData.pix.valor}</span>
              </div>
            </div>

            <button onClick={() => copiar(`PIX: ${PIX_CNPJ}\nFavorecido: ${pixData.pix.nome}\nValor: R$ ${pixData.pix.valor}\nCliente: ${usuario.nome}`)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 font-semibold transition">
              {copiado ? "✓ Copiado!" : "Copiar para WhatsApp"}
            </button>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={confirmarPix} disabled={confirmando}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition disabled:opacity-50">
              {confirmando ? "Confirmando..." : "✅ Confirmar recebimento do PIX"}
            </button>
            <p className="text-[10px] text-slate-400 text-center">Clique somente após o pagamento ser confirmado na sua conta.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  const [simularUsuario, setSimularUsuario]         = useState<Usuario | null>(null);
  const [cadastrarModal, setCadastrarModal]         = useState(false);
  const [assinaturaManualU, setAssinaturaManualU]   = useState<Usuario | null>(null);

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
                          <>
                            <button onClick={() => setAssinaturaManualU(u)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200 transition">
                              PIX
                            </button>
                            <button onClick={() => setSimularUsuario(u)}
                              className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold border border-amber-200 transition">
                              Simular
                            </button>
                          </>
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

      {simularUsuario && (
        <SimularPlanoModal usuario={simularUsuario} planos={planos}
          onClose={() => setSimularUsuario(null)} onDone={() => carregar(page)} />
      )}
      {cadastrarModal && (
        <CadastrarClienteModal onClose={() => setCadastrarModal(false)} onDone={() => carregar(1)} />
      )}
      {assinaturaManualU && (
        <AssinaturaManualModal usuario={assinaturaManualU} planos={planos}
          onClose={() => setAssinaturaManualU(null)} onDone={() => carregar(page)} />
      )}
    </div>
  );
}
