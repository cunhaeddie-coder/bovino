"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

type Servico   = { id: number; nome: string; valor: number; percentual_tecnico: number; modalidade: string };
type Tecnico   = { id: number; nome: string; papel: string; tipo_contrato: string };
type Cliente   = { id: number; nome: string; celular: string };
type Ordem = {
  id: number; status: string; data_hora: string | null; link_reuniao: string | null;
  observacoes: string | null; valor_cliente: number; valor_tecnico: number;
  pago_cliente: boolean; pago_tecnico: boolean; gateway: string | null;
  servico_nome: string; modalidade: string;
  cliente_nome: string; cliente_celular: string;
  tecnico_nome: string | null; created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente:     { label: "Aguardando aceite", color: "bg-yellow-100 text-yellow-700" },
  aceita:       { label: "Aceita",            color: "bg-blue-100 text-blue-700" },
  agendada:     { label: "Agendada",          color: "bg-indigo-100 text-indigo-700" },
  em_andamento: { label: "Em andamento",      color: "bg-orange-100 text-orange-700" },
  concluida:    { label: "Concluída",         color: "bg-green-100 text-green-700" },
  recusada:     { label: "Recusada",          color: "bg-red-100 text-red-600" },
  cancelada:    { label: "Cancelada",         color: "bg-slate-100 text-slate-500" },
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function NovaOrdemModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [busca, setBusca]       = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ servico_id: "", tecnico_id: "", data_hora: "", link_reuniao: "", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/atendimento/servicos"),
      api.get("/atendimento/tecnicos"),
    ]).then(([sRes, tRes]) => {
      setServicos(sRes.data.filter((s: Servico & { ativo: boolean }) => s.ativo));
      setTecnicos(tRes.data);
    });
  }, []);

  useEffect(() => {
    if (busca.length < 2) { setClientes([]); return; }
    const t = setTimeout(() => {
      api.get(`/usuarios?busca=${encodeURIComponent(busca)}&page=1`)
        .then(({ data }) => setClientes(data.data?.slice(0, 5) ?? []));
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const servicoSel = servicos.find(s => String(s.id) === form.servico_id);
  const tecnicoSel = tecnicos.find(t => String(t.id) === form.tecnico_id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteSel) { setError("Selecione um cliente."); return; }
    setSaving(true); setError("");
    try {
      const { data } = await api.post("/atendimento/ordens", { ...form, cliente_id: clienteSel.id, servico_id: Number(form.servico_id), tecnico_id: form.tecnico_id ? Number(form.tecnico_id) : null });
      // Gera mensagem WhatsApp
      if (form.data_hora && tecnicoSel) {
        const dt = new Date(form.data_hora);
        const msg = `Olá ${clienteSel.nome}! 👋\n\nSeu atendimento *${servicoSel?.nome}* está confirmado:\n\n📅 Data: ${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n💻 Modalidade: ${servicoSel?.modalidade === "online" ? "Online" : servicoSel?.modalidade === "presencial" ? "Presencial" : "Híbrido"}${form.link_reuniao ? `\n🔗 Link: ${form.link_reuniao}` : ""}\n👤 Técnico: ${tecnicoSel.nome}\n\nQualquer dúvida, responda aqui! 🐄 Bovino`;
        setWhatsapp(msg);
      } else {
        onDone(); onClose();
      }
    } catch (err: any) { setError(err.response?.data?.message ?? "Erro."); }
    finally { setSaving(false); }
  }

  function copiar() {
    if (!whatsapp) return;
    navigator.clipboard?.writeText(whatsapp);
    setCopiado(true); setTimeout(() => setCopiado(false), 2500);
  }

  if (whatsapp) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Ordem criada! ✅</h2>
        <p className="text-xs text-slate-500">Envie a mensagem abaixo para o cliente via WhatsApp:</p>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-900 whitespace-pre-line font-mono">{whatsapp}</div>
        <button onClick={copiar} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 font-semibold">
          {copiado ? "✓ Copiado!" : "📋 Copiar mensagem"}
        </button>
        <button onClick={() => { onDone(); onClose(); }} className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
          Fechar
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-bold text-slate-800">Nova ordem de atendimento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente *</label>
            {clienteSel ? (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-green-800 flex-1">{clienteSel.nome}</span>
                <button type="button" onClick={() => setClienteSel(null)} className="text-[10px] text-green-600 hover:text-green-800">Trocar</button>
              </div>
            ) : (
              <>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                {clientes.length > 0 && (
                  <div className="border border-slate-200 rounded-xl mt-1 overflow-hidden">
                    {clientes.map(c => (
                      <button key={c.id} type="button" onClick={() => { setClienteSel(c); setBusca(""); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left border-b border-slate-100 last:border-0">
                        <span className="text-sm font-medium text-slate-800">{c.nome}</span>
                        <span className="text-xs text-slate-400 ml-auto">{c.celular}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Serviço *</label>
            <select required value={form.servico_id} onChange={e => setForm(p => ({ ...p, servico_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Selecione...</option>
              {servicos.map(s => (
                <option key={s.id} value={s.id}>{s.nome} — {fmt(s.valor)}</option>
              ))}
            </select>
            {servicoSel && tecnicoSel?.tipo_contrato === "freelancer" && (
              <p className="text-[10px] text-orange-600 mt-0.5">
                Comissão freelancer: {fmt(+(servicoSel.valor * servicoSel.percentual_tecnico / 100).toFixed(2))} ({servicoSel.percentual_tecnico}%)
              </p>
            )}
            {servicoSel && tecnicoSel && tecnicoSel.tipo_contrato !== "freelancer" && (
              <p className="text-[10px] text-slate-400 mt-0.5">Funcionário — sem comissão por ordem</p>
            )}
          </div>

          {/* Técnico */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Técnico responsável</label>
            <select value={form.tecnico_id} onChange={e => setForm(p => ({ ...p, tecnico_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">A definir</option>
              {tecnicos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.tipo_contrato === "freelancer" ? "Freelancer" : t.papel})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Data e hora</label>
              <input type="datetime-local" value={form.data_hora} onChange={e => setForm(p => ({ ...p, data_hora: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Link (Meet/Zoom)</label>
              <input type="url" value={form.link_reuniao} onChange={e => setForm(p => ({ ...p, link_reuniao: e.target.value }))}
                placeholder="https://meet.google.com/..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Criando..." : "Criar ordem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConcluirModal({ ordem, onClose, onDone }: { ordem: Ordem; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ descricao: "", duracao_real: "", avaliacao_cliente: "5", proximos_passos: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    await api.post(`/atendimento/ordens/${ordem.id}/concluir`, {
      ...form, duracao_real: form.duracao_real ? Number(form.duracao_real) : null, avaliacao_cliente: Number(form.avaliacao_cliente),
    });
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Registrar conclusão — #{ordem.id}</h2>
        <p className="text-xs text-slate-500">{ordem.cliente_nome} · {ordem.servico_nome}</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">O que foi feito *</label>
            <textarea required value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={4} placeholder="Descreva o atendimento realizado..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Duração real (h)</label>
              <input type="number" step="0.5" min="0" value={form.duracao_real} onChange={e => setForm(p => ({ ...p, duracao_real: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Avaliação do cliente</label>
              <select value={form.avaliacao_cliente} onChange={e => setForm(p => ({ ...p, avaliacao_cliente: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{"⭐".repeat(n)} {n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Próximos passos</label>
            <textarea value={form.proximos_passos} onChange={e => setForm(p => ({ ...p, proximos_passos: e.target.value }))}
              rows={2} placeholder="Combine os próximos passos com o cliente..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Concluir atendimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdensPage() {
  const { admin }   = useAdmin();
  const isTecnico   = admin && ["ti", "treinamento", "tecnico"].includes(admin.papel);
  const [ordens, setOrdens]     = useState<Ordem[]>([]);
  const [filtro, setFiltro]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [novaModal, setNovaModal] = useState(false);
  const [concluirOrdem, setConcluirOrdem] = useState<Ordem | null>(null);

  async function carregar() {
    setLoading(true);
    const params = filtro ? `?status=${filtro}` : "";
    const { data } = await api.get(`/atendimento/ordens${params}`);
    setOrdens(data.data ?? data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtro]);

  async function acao(endpoint: string, id: number) {
    await api.post(`/atendimento/ordens/${id}/${endpoint}`);
    carregar();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Ordens de Atendimento</h1>
          <p className="text-xs text-slate-400 mt-0.5">{isTecnico ? "Seus atendimentos" : "Todos os atendimentos"}</p>
        </div>
        {!isTecnico && (
          <button onClick={() => setNovaModal(true)} className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition">
            + Nova ordem
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {["", "pendente", "aceita", "agendada", "em_andamento", "concluida", "recusada"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filtro === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {s === "" ? "Todas" : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">OA</th>
                <th className="text-left px-3 py-3">Cliente</th>
                <th className="text-left px-3 py-3">Serviço</th>
                {!isTecnico && <th className="text-left px-3 py-3">Técnico</th>}
                <th className="text-left px-3 py-3">Data/Hora</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-3 py-3">Valores</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : ordens.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhuma ordem encontrada.</td></tr>
              ) : ordens.map(o => (
                <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">#{String(o.id).padStart(4, "0")}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800 text-xs">{o.cliente_nome}</p>
                    <p className="text-[10px] text-slate-400">{o.cliente_celular}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-medium text-slate-700">{o.servico_nome}</p>
                    {o.link_reuniao && (
                      <a href={o.link_reuniao} target="_blank" className="text-[10px] text-blue-500 hover:underline">🔗 Link</a>
                    )}
                  </td>
                  {!isTecnico && (
                    <td className="px-3 py-3 text-xs text-slate-600">{o.tecnico_nome ?? <span className="text-slate-300">—</span>}</td>
                  )}
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {o.data_hora ? new Date(o.data_hora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[o.status]?.color ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_CONFIG[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="text-xs font-bold text-slate-800">{fmt(o.valor_cliente)}</p>
                    {o.valor_tecnico > 0
                      ? <p className="text-[10px] text-orange-600">{fmt(o.valor_tecnico)} freelancer</p>
                      : <p className="text-[10px] text-slate-400">funcionário</p>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1 items-end">
                      {o.status === "pendente" && isTecnico && (
                        <>
                          <button onClick={() => acao("aceitar", o.id)} className="text-[11px] px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200">Aceitar</button>
                          <button onClick={() => acao("recusar", o.id)} className="text-[11px] px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-200">Recusar</button>
                        </>
                      )}
                      {o.status === "aceita" && isTecnico && (
                        <button onClick={() => acao("iniciar", o.id)} className="text-[11px] px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold border border-orange-200">Iniciar</button>
                      )}
                      {o.status === "em_andamento" && (
                        <button onClick={() => setConcluirOrdem(o)} className="text-[11px] px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold border border-green-200">Concluir</button>
                      )}
                      {o.status === "concluida" && !isTecnico && (
                        <>
                          {!o.pago_cliente && <button onClick={() => acao("pago-cliente", o.id)} className="text-[10px] text-blue-600 hover:underline">Marcar pago ✓</button>}
                          {!o.pago_tecnico && o.valor_tecnico > 0 && <button onClick={() => acao("pago-tecnico", o.id)} className="text-[10px] text-orange-600 hover:underline">Pagar freelancer ✓</button>}
                        </>
                      )}
                      {o.status === "concluida" && (
                        <div className="flex gap-1">
                          {o.pago_cliente && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded font-bold">Cliente ✓</span>}
                          {o.pago_tecnico && o.valor_tecnico > 0 && <span className="text-[9px] bg-orange-50 text-orange-600 px-1 rounded font-bold">Freelancer ✓</span>}
                        </div>
                      )}
                      {!isTecnico && !["concluida", "cancelada", "recusada"].includes(o.status) && (
                        <button onClick={() => acao("cancelar", o.id)} className="text-[10px] text-slate-400 hover:text-red-500 hover:underline">Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {novaModal && <NovaOrdemModal onClose={() => setNovaModal(false)} onDone={carregar} />}
      {concluirOrdem && <ConcluirModal ordem={concluirOrdem} onClose={() => setConcluirOrdem(null)} onDone={carregar} />}
    </div>
  );
}
