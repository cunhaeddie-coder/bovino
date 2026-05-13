"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Plano = { id: number; slug: string; nome: string; tipo: string; preco: number; preco_anual: number | null; max_cabecas: number | null };
type Assinatura = {
  id: number; status: string; valor: number; periodo: string; gateway: string | null;
  inicia_em: string | null; expira_em: string | null; created_at: string;
  plano?: { nome: string; slug: string };
  assinante?: { nome?: string; empresa?: string; email?: string; celular?: string };
};
type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

const STATUS_BADGE: Record<string, string> = {
  ativa:    "bg-green-100 text-green-700",
  pendente: "bg-yellow-100 text-yellow-700",
  cancelada:"bg-slate-100 text-slate-500",
  expirada: "bg-red-100 text-red-500",
};

const PIX_CNPJ = "12.407.190/0001-45";
const PIX_NOME = "BOVINO MARKETPLACE LTDA";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

// ── Modal nova assinatura (fluxo completo) ────────────────────────────────────
function NovaAssinaturaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  type Step = "cliente" | "plano" | "pix";
  const [step, setStep]             = useState<Step>("cliente");
  const [planos, setPlanos]         = useState<Plano[]>([]);
  const [busca, setBusca]           = useState("");
  const [clientes, setClientes]     = useState<{ id: number; nome: string; celular: string }[]>([]);
  const [buscando, setBuscando]     = useState(false);
  const [clienteSel, setClienteSel] = useState<{ id: number; nome: string } | null>(null);
  const [periodo, setPeriodo]       = useState<"mensal" | "anual">("mensal");
  const [planoSlug, setPlanoSlug]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [pixData, setPixData]       = useState<{ assinatura_id: number; valor: number; pix: { chave: string; nome: string; valor: string } } | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado]       = useState(false);
  const [error, setError]           = useState("");

  // Form novo cliente
  const [novoCliente, setNovoCliente] = useState({ nome: "", celular: "", tipo: "ambos" });
  const [cadastrando, setCadastrando] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"}/planos`)
      .then(r => r.json())
      .then((g: Record<string, Plano[]>) => setPlanos((g["produtor"] ?? []).filter(p => p.slug !== "produtor-elite")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (busca.length < 2) { setClientes([]); return; }
    setBuscando(true);
    const t = setTimeout(() => {
      api.get(`/usuarios?busca=${encodeURIComponent(busca)}&page=1`)
        .then(({ data }) => setClientes(data.data?.slice(0, 6) ?? []))
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  async function cadastrarESelecionar() {
    if (!novoCliente.nome || !novoCliente.celular) return;
    setCadastrando(true); setError("");
    try {
      const { data } = await api.post("/usuarios", novoCliente);
      setClienteSel({ id: data.usuario.id, nome: data.usuario.nome });
      setStep("plano");
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Erro ao cadastrar.");
    } finally { setCadastrando(false); }
  }

  async function criarAssinatura() {
    if (!clienteSel || !planoSlug) return;
    setSaving(true); setError("");
    try {
      const { data } = await api.post("/assinaturas/manual", {
        usuario_id: clienteSel.id, plano_slug: planoSlug, periodo,
      });
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

  function copiarPix() {
    if (!pixData) return;
    navigator.clipboard?.writeText(
      `*Dados para pagamento PIX — Bovino*\n\nChave PIX (CNPJ): ${PIX_CNPJ}\nFavorecido: ${PIX_NOME}\nValor: R$ ${pixData.pix.valor}\n\nCliente: ${clienteSel?.nome}`
    );
    setCopiado(true); setTimeout(() => setCopiado(false), 2500);
  }

  const planoSel   = planos.find(p => p.slug === planoSlug);
  const valorAtual = planoSel ? (periodo === "anual" && planoSel.preco_anual ? planoSel.preco_anual : planoSel.preco) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Nova assinatura</h2>
            <div className="flex items-center gap-2 mt-1">
              {(["cliente", "plano", "pix"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${step === s ? "bg-green-500" : (["cliente", "plano", "pix"].indexOf(step) > i ? "bg-green-300" : "bg-slate-200")}`} />
                  {i < 2 && <div className="w-4 h-px bg-slate-200" />}
                </div>
              ))}
              <span className="text-[10px] text-slate-400 ml-1 capitalize">{step === "cliente" ? "1. Cliente" : step === "plano" ? "2. Plano" : "3. PIX"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* STEP 1: Cliente */}
          {step === "cliente" && (
            <>
              <p className="text-xs font-semibold text-slate-600">Buscar cliente existente</p>
              <div className="relative">
                <input value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Nome, celular ou e-mail..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                {buscando && <span className="absolute right-3 top-2.5 text-xs text-slate-400">...</span>}
              </div>

              {clientes.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {clientes.map(c => (
                    <button key={c.id} onClick={() => { setClienteSel(c); setStep("plano"); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-green-50 text-left border-b border-slate-100 last:border-0 transition">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                        {c.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{c.nome}</p>
                        <p className="text-xs text-slate-400">{c.celular}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Ou cadastrar novo cliente</p>
                <div className="space-y-2">
                  <input value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome completo *"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <input value={novoCliente.celular} onChange={e => setNovoCliente(p => ({ ...p, celular: e.target.value }))}
                    placeholder="Celular (WhatsApp) *"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  <select value={novoCliente.tipo} onChange={e => setNovoCliente(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                    <option value="ambos">Comprador e Produtor</option>
                    <option value="vendedor">Produtor</option>
                    <option value="comprador">Comprador</option>
                  </select>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button onClick={cadastrarESelecionar} disabled={cadastrando || !novoCliente.nome || !novoCliente.celular}
                    className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 transition">
                    {cadastrando ? "Cadastrando..." : "Cadastrar e continuar"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Plano */}
          {step === "plano" && clienteSel && (
            <>
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <span className="text-green-600 text-sm">👤</span>
                <p className="text-sm font-semibold text-green-800">{clienteSel.nome}</p>
                <button onClick={() => { setClienteSel(null); setStep("cliente"); }}
                  className="ml-auto text-[10px] text-green-600 hover:text-green-800">Trocar</button>
              </div>

              <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
                {(["mensal", "anual"] as const).map(p => (
                  <button key={p} onClick={() => setPeriodo(p)}
                    className={`flex-1 py-2 transition ${periodo === p ? "bg-green-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>
                    {p === "mensal" ? "Mensal" : "Anual (1 mês grátis)"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {planos.map(p => {
                  const val = periodo === "anual" && p.preco_anual ? p.preco_anual : p.preco;
                  const label = p.max_cabecas ? `até ${p.max_cabecas.toLocaleString("pt-BR")} cab.` : "";
                  return (
                    <label key={p.slug} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${planoSlug === p.slug ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <input type="radio" name="plano_ass" value={p.slug} checked={planoSlug === p.slug}
                        onChange={() => setPlanoSlug(p.slug)} className="accent-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{p.nome} {label && <span className="text-xs font-normal text-slate-400">— {label}</span>}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{fmt(val)}{periodo === "mensal" ? "/mês" : "/ano"}</span>
                    </label>
                  );
                })}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button onClick={criarAssinatura} disabled={saving || !planoSlug}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition">
                {saving ? "Gerando PIX..." : `Gerar PIX — ${planoSlug ? fmt(valorAtual) : ""}`}
              </button>
            </>
          )}

          {/* STEP 3: PIX */}
          {step === "pix" && pixData && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">💠</p>
                <p className="text-sm font-bold text-green-800">Dados para pagamento PIX</p>
                <p className="text-xs text-green-600 mt-0.5">Compartilhe com o cliente via WhatsApp</p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Chave PIX (CNPJ)", value: PIX_CNPJ },
                  { label: "Favorecido", value: PIX_NOME },
                  { label: "Cliente", value: clienteSel?.nome ?? "" },
                  { label: "Plano", value: planos.find(p => p.slug === planoSlug)?.nome ?? "" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-500 text-xs">{label}</span>
                    <span className="font-semibold text-slate-800 text-xs">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
                  <span className="text-amber-600 text-xs font-semibold">Valor</span>
                  <span className="font-extrabold text-amber-800">R$ {pixData.pix.valor}</span>
                </div>
              </div>

              <button onClick={copiarPix}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 font-semibold transition">
                {copiado ? "✓ Copiado!" : "📋 Copiar para WhatsApp"}
              </button>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button onClick={confirmarPix} disabled={confirmando}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-50 transition">
                {confirmando ? "Confirmando..." : "✅ Confirmar recebimento do PIX"}
              </button>
              <p className="text-[10px] text-slate-400 text-center">Clique somente após o PIX aparecer na sua conta.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
type TabFiltro = "pix" | "ativas" | "todas";

export default function AssinaturasPage() {
  const [data, setData]             = useState<Paginated<Assinatura> | null>(null);
  const [tab, setTab]               = useState<TabFiltro>("pix");
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(false);
  const [novaModal, setNovaModal]   = useState(false);
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);

  async function carregar(p = 1, t = tab) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (t === "pix")    { params.set("status", "pendente"); params.set("gateway", "manual"); }
    if (t === "ativas") { params.set("status", "ativa"); }
    const { data: res } = await api.get(`/assinaturas?${params}`);
    setData(res);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { carregar(1, tab); }, [tab]);

  async function cancelar(id: number) {
    if (!confirm("Cancelar esta assinatura?")) return;
    await api.post(`/assinaturas/${id}/cancelar`);
    carregar(page);
  }

  async function ativar(id: number) {
    await api.post(`/assinaturas/${id}/ativar`);
    carregar(page);
  }

  async function confirmarPix(id: number) {
    setConfirmandoId(id);
    try {
      await api.post(`/assinaturas/${id}/confirmar-pix`);
      carregar(page);
    } finally { setConfirmandoId(null); }
  }

  const TABS: { key: TabFiltro; label: string; badge?: string }[] = [
    { key: "pix",    label: "Aguardando PIX",  badge: tab === "pix" ? String(data?.total ?? "") : undefined },
    { key: "ativas", label: "Ativas" },
    { key: "todas",  label: "Todas" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Assinaturas</h1>
          <p className="text-xs text-slate-400 mt-0.5">Contratos, pagamentos PIX e ativações manuais</p>
        </div>
        <button onClick={() => setNovaModal(true)}
          className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition">
          + Nova assinatura
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.key === "pix" && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
            {t.label}
            {t.badge && Number(t.badge) > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "pix" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
          <span>💠</span>
          Assinaturas pendentes de confirmação de PIX manual. Confirme após o pagamento aparecer na conta.
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Plano</th>
                <th className="text-left px-3 py-3">Período</th>
                <th className="text-right px-3 py-3">Valor</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Vencimento</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">
                  {tab === "pix" ? "Nenhum PIX aguardando confirmação." : "Nenhuma assinatura."}
                </td></tr>
              ) : data?.data.map((a) => (
                <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{a.assinante?.nome ?? a.assinante?.empresa ?? "—"}</p>
                    <p className="text-xs text-slate-400">{a.assinante?.email ?? a.assinante?.celular ?? ""}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-semibold text-slate-700">{a.plano?.nome ?? "—"}</p>
                    {a.gateway === "manual" && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">PIX manual</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs text-slate-600 capitalize">{a.periodo ?? "mensal"}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">
                    {a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-400 text-xs">
                    {a.expira_em ? new Date(a.expira_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      {a.status === "pendente" && a.gateway === "manual" && (
                        <button onClick={() => confirmarPix(a.id)} disabled={confirmandoId === a.id}
                          className="text-[11px] px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200 transition disabled:opacity-50">
                          {confirmandoId === a.id ? "..." : "Confirmar PIX"}
                        </button>
                      )}
                      {a.status !== "ativa" && a.gateway !== "manual" && (
                        <button onClick={() => ativar(a.id)} className="text-xs text-green-600 hover:underline">Ativar</button>
                      )}
                      {a.status === "ativa" && (
                        <button onClick={() => cancelar(a.id)} className="text-xs text-red-500 hover:underline">Cancelar</button>
                      )}
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

      {novaModal && <NovaAssinaturaModal onClose={() => setNovaModal(false)} onDone={() => carregar(1)} />}
    </div>
  );
}
