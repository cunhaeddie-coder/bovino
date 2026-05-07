"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#func-kpis",
    popover: {
      title: "👷 Resumo da equipe",
      description: "Veja quantos funcionários estão ativos, o total da folha de pagamento mensal e quantas tarefas estão pendentes.",
      side: "bottom",
    },
  },
  {
    element: "#func-abas",
    popover: {
      title: "📑 Módulos da equipe",
      description: "Funcionários: CLT, PJ e temporários · Prestadores: veterinários, mecânicos, etc. com valor por hora/diária · Tarefas: gestão por prioridade e prazo.",
      side: "bottom",
    },
  },
  {
    popover: {
      title: "✅ Gerenciar tarefas",
      description: "Na aba Tarefas, crie tarefas com prioridade (urgente, alta, média, baixa), atribua responsável e prazo. Clique em '✓ Concluir' quando finalizar.",
    },
  },
];

type Funcionario = {
  id: number; nome: string; cargo: string; tipo_contrato: string;
  salario: number | null; telefone: string | null; data_admissao: string;
  ativo: boolean; papel: string | null; user_id: number | null;
};
type Prestador   = { id: number; nome: string; especialidade: string; telefone: string | null; valor_hora: number | null; valor_diaria: number | null; ativo: boolean };
type Tarefa      = {
  id: number; titulo: string; tipo: string; prioridade: string; status: string;
  data_prevista: string | null; responsavel: { nome: string } | null; lote: { nome: string } | null;
};

const PAPEL_LABEL: Record<string, string> = {
  vaqueiro: "Vaqueiro", veterinario: "Veterinário",
  gerente: "Gerente", outro: "Outro",
};
const PAPEL_COR: Record<string, string> = {
  vaqueiro: "bg-amber-100 text-amber-700",
  veterinario: "bg-blue-100 text-blue-700",
  gerente: "bg-purple-100 text-purple-700",
  outro: "bg-gray-100 text-gray-500",
};

const PRIORIDADE_COR: Record<string, string> = {
  urgente: "bg-red-100 text-red-700", alta: "bg-orange-100 text-orange-700",
  media: "bg-yellow-100 text-yellow-700", baixa: "bg-gray-100 text-gray-600",
};
const STATUS_COR: Record<string, string> = {
  pendente: "bg-blue-100 text-blue-700", em_andamento: "bg-yellow-100 text-yellow-700",
  concluida: "bg-green-100 text-green-700", cancelada: "bg-gray-100 text-gray-500",
};
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [prestadores, setPrestadores]   = useState<Prestador[]>([]);
  const [tarefas, setTarefas]           = useState<Tarefa[]>([]);
  const [aba, setAba]                   = useState<"funcionarios"|"prestadores"|"tarefas">("funcionarios");
  const [loading, setLoading]           = useState(true);
  const [showFun, setShowFun]           = useState(false);
  const [editandoFun, setEditandoFun]   = useState<Funcionario | null>(null);
  const [showPrest, setShowPrest]       = useState(false);
  const [showTarefa, setShowTarefa]     = useState(false);
  const [codigoModal, setCodigoModal]   = useState<{ nome: string; celular: string; codigo: string; aviso: string } | null>(null);

  async function ativarApp(f: Funcionario) {
    if (!confirm(`Ativar acesso ao app para ${f.nome}?\n\nUm código de 6 dígitos será gerado.\nVocê vai enviá-lo manualmente para: ${f.telefone}`)) return;
    try {
      const res = await api.post(`/gestao/funcionarios/${f.id}/ativar-app`);
      const data = res.data as {
        whatsapp_enviado: boolean;
        codigo_manual?: string;
        aviso?: string;
        celular: string;
      };
      if (data.whatsapp_enviado) {
        alert(`Código enviado via WhatsApp para ${data.celular}!\nO vaqueiro pode entrar no app agora.`);
      } else if (data.codigo_manual) {
        setCodigoModal({
          nome:   f.nome,
          celular: data.celular,
          codigo: data.codigo_manual,
          aviso:  data.aviso ?? "Passe este código ao vaqueiro.",
        });
      } else {
        alert("Acesso ativado.");
      }
      carregar();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? "Erro ao ativar.");
    }
  }

  async function reenviarCodigo(f: Funcionario) {
    try {
      const res = await api.post(`/gestao/funcionarios/${f.id}/reenviar-codigo`);
      const data = res.data as {
        whatsapp_enviado: boolean;
        codigo_manual?: string;
        aviso?: string;
        celular: string;
      };
      if (data.whatsapp_enviado) {
        alert(`Novo código enviado via WhatsApp para ${data.celular}!`);
      } else if (data.codigo_manual) {
        setCodigoModal({
          nome:    f.nome,
          celular: data.celular,
          codigo:  data.codigo_manual,
          aviso:   data.aviso ?? "Passe este código ao vaqueiro.",
        });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? "Erro ao gerar código.");
    }
  }

  async function carregar() {
    setLoading(true);
    try {
      const [funs, prests, tarefasData] = await Promise.all([
        api.get("/gestao/funcionarios").then(r => r.data).catch(() => []),
        api.get("/gestao/prestadores").then(r => r.data).catch(() => []),
        api.get("/gestao/tarefas").then(r => r.data).catch(() => []),
      ]);
      setFuncionarios(Array.isArray(funs) ? funs : (funs.data ?? []));
      setPrestadores(Array.isArray(prests) ? prests : (prests.data ?? []));
      setTarefas(Array.isArray(tarefasData) ? tarefasData : (tarefasData.data ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const totalFolha = funcionarios.filter(f => f.ativo).reduce((s, f) => s + (Number(f.salario) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe & Tarefas</h1>
          <p className="text-gray-500 text-sm">Funcionários, prestadores e gestão de tarefas</p>
        </div>
        <div className="flex gap-2">
          {aba === "funcionarios" && <button onClick={() => setShowFun(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Funcionário</button>}
          {aba === "prestadores"  && <button onClick={() => setShowPrest(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Prestador</button>}
          {aba === "tarefas"      && <button onClick={() => setShowTarefa(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800">+ Tarefa</button>}
        </div>
      </div>

      {/* KPIs */}
      <div id="func-kpis" className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xl mb-1">👷</p>
          <p className="text-xl font-bold text-gray-900">{funcionarios.filter(f=>f.ativo).length}</p>
          <p className="text-xs text-gray-400">Funcionários ativos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xl mb-1">💰</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalFolha)}</p>
          <p className="text-xs text-gray-400">Folha mensal</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xl mb-1">📋</p>
          <p className="text-xl font-bold text-gray-900">{tarefas.filter(t=>t.status==="pendente").length}</p>
          <p className="text-xs text-gray-400">Tarefas pendentes</p>
        </div>
      </div>

      {/* Abas */}
      <div id="func-abas" className="flex gap-2 border-b border-gray-200">
        {(["funcionarios","prestadores","tarefas"] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-medium transition ${aba === a ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"}`}>
            {a === "funcionarios" ? "👷 Funcionários" : a === "prestadores" ? "🔧 Prestadores" : "📋 Tarefas"}
          </button>
        ))}
      </div>

      {/* Funcionários */}
      {aba === "funcionarios" && (
        <div className="grid gap-3">
          {loading ? <p className="text-gray-400 text-sm text-center py-10">Carregando...</p>
          : funcionarios.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">Nenhum funcionário cadastrado</p>
          : funcionarios.map(f => (
            <div key={f.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${!f.ativo ? "opacity-50" : "border-gray-100"}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700 shrink-0">
                  {f.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{f.nome}</p>
                    {f.papel && f.papel !== "outro" && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PAPEL_COR[f.papel]}`}>
                        {PAPEL_LABEL[f.papel]}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${f.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {f.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{f.cargo} · {f.tipo_contrato.toUpperCase()}</p>
                  {f.telefone && <p className="text-xs text-gray-400">{f.telefone}</p>}
                  {f.salario && <p className="text-xs text-gray-500">{fmt(Number(f.salario))}/mês · desde {new Date(f.data_admissao).toLocaleDateString("pt-BR")}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  {f.user_id ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                        Com acesso ao app
                      </span>
                      <button
                        onClick={() => reenviarCodigo(f)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
                        title="Gerar novo código de acesso"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Reenviar código
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={!f.telefone}
                      onClick={() => ativarApp(f)}
                      className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title={!f.telefone ? "Cadastre o telefone primeiro" : "Ativar acesso ao app"}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                      Ativar no app
                    </button>
                  )}

                  {/* Editar / Desligar */}
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => setEditandoFun(f)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar funcionário"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    {f.ativo ? (
                      <button
                        onClick={async () => {
                          if (!confirm(`Desligar ${f.nome}?`)) return;
                          await api.post(`/gestao/funcionarios/${f.id}/desligar`);
                          carregar();
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Desligar funcionário"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          await api.put(`/gestao/funcionarios/${f.id}`, { ativo: true });
                          carregar();
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Reativar funcionário"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prestadores */}
      {aba === "prestadores" && (
        <div className="grid gap-3">
          {prestadores.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">Nenhum prestador cadastrado</p>
          : prestadores.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">{p.nome[0]}</div>
                <div>
                  <p className="font-semibold text-gray-800">{p.nome}</p>
                  <p className="text-xs text-gray-400">{p.especialidade}</p>
                  {p.telefone && <p className="text-xs text-gray-400">{p.telefone}</p>}
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                {p.valor_hora && <p className="text-xs">{fmt(p.valor_hora)}/hora</p>}
                {p.valor_diaria && <p className="text-xs">{fmt(p.valor_diaria)}/diária</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tarefas */}
      {aba === "tarefas" && (
        <div className="grid gap-3">
          {tarefas.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">Nenhuma tarefa criada</p>
          : tarefas.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PRIORIDADE_COR[t.prioridade]}`}>{t.prioridade}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[t.status]}`}>{t.status.replace("_"," ")}</span>
                </div>
                <p className="font-semibold text-gray-800">{t.titulo}</p>
                <p className="text-xs text-gray-400">
                  {t.responsavel?.nome ?? "Sem responsável"} · {t.tipo}
                  {t.data_prevista && ` · prazo: ${new Date(t.data_prevista).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              {t.status !== "concluida" && (
                <button onClick={async () => {
                  await api.put(`/gestao/tarefas/${t.id}`, { status: "concluida" });
                  carregar();
                }} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-semibold">
                  ✓ Concluir
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showFun      && <FuncionarioModal onClose={() => setShowFun(false)} onDone={carregar} />}
      {editandoFun  && <FuncionarioModal funcionario={editandoFun} onClose={() => setEditandoFun(null)} onDone={carregar} />}
      {showPrest    && <PrestadorModal  onClose={() => setShowPrest(false)} onDone={carregar} />}
      {showTarefa   && <TarefaModal funcionarios={funcionarios} prestadores={prestadores} onClose={() => setShowTarefa(false)} onDone={carregar} />}

      {codigoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
              <h2 className="font-bold text-amber-800">Código de acesso manual</h2>
              <p className="text-xs text-amber-600 mt-0.5">{codigoModal.aviso}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Funcionário</p>
                <p className="font-semibold text-gray-800">{codigoModal.nome}</p>
                <p className="text-xs text-gray-400">{codigoModal.celular}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Código de primeiro acesso</p>
                <p className="text-3xl font-mono font-bold tracking-[0.3em] text-white select-all">{codigoModal.codigo}</p>
                <p className="text-xs text-gray-500 mt-1">Válido por 10 minutos</p>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                Envie a mensagem abaixo pelo WhatsApp para <strong>{codigoModal.celular}</strong>.
                O link já leva direto ao acesso — o código é o backup.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const base  = typeof window !== "undefined" ? window.location.origin : "https://bovino.agr.br";
                    const link  = `${base}/login?c=${codigoModal.celular}`;
                    const texto = `🐄 *Bovino — App Vaqueiro*\n\n👆 Toque para entrar:\n${link}\n\n🔑 Código (1ª vez): *${codigoModal.codigo}*`;
                    navigator.clipboard?.writeText(texto);
                    alert("Mensagem copiada! Cole no WhatsApp.");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-green-200 bg-green-50 text-sm text-green-700 font-semibold hover:bg-green-100"
                >
                  Copiar msg WhatsApp
                </button>
                <button
                  onClick={() => setCodigoModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TourButton tourKey="gestao-funcionarios" steps={TOUR_STEPS} />
    </div>
  );
}

function FuncionarioModal({ onClose, onDone, funcionario }: {
  onClose: () => void; onDone: () => void; funcionario?: Funcionario;
}) {
  const editando = !!funcionario;
  const [form, setForm] = useState({
    nome:          funcionario?.nome ?? "",
    cargo:         funcionario?.cargo ?? "",
    tipo_contrato: funcionario?.tipo_contrato ?? "clt",
    papel:         funcionario?.papel ?? "outro",
    salario:       funcionario?.salario ? String(funcionario.salario) : "",
    telefone:      funcionario?.telefone ?? "",
    data_admissao: funcionario?.data_admissao ?? new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErro("");
    try {
      if (editando) {
        await api.put(`/gestao/funcionarios/${funcionario.id}`, { ...form, salario: form.salario || null });
      } else {
        await api.post("/gestao/funcionarios", { ...form, salario: form.salario || null });
      }
      onDone(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : (err.response?.data?.message ?? "Erro ao salvar funcionário.");
      setErro(msg);
    } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">{editando ? `Editar — ${funcionario.nome.split(" ")[0]}` : "Novo Funcionário"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{erro}</div>}
          {editando && funcionario.papel === "vaqueiro" && !funcionario.user_id && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl px-3 py-2">
              Após editar, clique em "Ativar no app" no card para enviar o acesso.
            </div>
          )}
          <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome completo"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <input required value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} placeholder="Cargo / função"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <select value={form.papel} onChange={e => setForm({...form, papel: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="vaqueiro">🤠 Vaqueiro</option>
              <option value="veterinario">🩺 Veterinário</option>
              <option value="gerente">👔 Gerente</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="clt">CLT</option><option value="pj">PJ</option>
              <option value="temporario">Temporário</option><option value="diarista">Diarista</option>
            </select>
            <input type="number" value={form.salario} onChange={e => setForm({...form, salario: e.target.value})} placeholder="Salário (R$)" step="0.01" min="0"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Celular / WhatsApp <span className="text-amber-600 font-semibold">(necessário para acesso ao app)</span>
            </label>
            <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})}
              placeholder="(xx) 9xxxx-xxxx"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Data de admissão</label>
            <input type="date" required value={form.data_admissao} onChange={e => setForm({...form, data_admissao: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          {form.papel === "vaqueiro" && form.telefone && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              Após salvar, clique em "Ativar no app" para enviar o código de acesso via WhatsApp.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrestadorModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", especialidade: "", telefone: "", valor_hora: "", valor_diaria: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/gestao/prestadores", { ...form, valor_hora: form.valor_hora || null, valor_diaria: form.valor_diaria || null });
      onDone(); onClose();
    } catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Novo Prestador de Serviço</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input required value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} placeholder="Especialidade (ex: veterinário, nutricionista)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-3 gap-3">
            <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="Telefone"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input type="number" value={form.valor_hora} onChange={e => setForm({...form, valor_hora: e.target.value})} placeholder="R$/hora" step="0.01"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input type="number" value={form.valor_diaria} onChange={e => setForm({...form, valor_diaria: e.target.value})} placeholder="R$/diária" step="0.01"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TarefaModal({ funcionarios, prestadores, onClose, onDone }: { funcionarios: Funcionario[]; prestadores: Prestador[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ titulo: "", tipo: "manejo", prioridade: "media", responsavel_type: "", responsavel_id: "", data_prevista: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/tarefas", form); onDone(); onClose(); }
    catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Nova Tarefa</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Título da tarefa"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              {["manejo","saude","pastagem","infraestrutura","nutricao","outros"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.prioridade} onChange={e => setForm({...form, prioridade: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="baixa">Baixa</option><option value="media">Média</option>
              <option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.responsavel_type} onChange={e => setForm({...form, responsavel_type: e.target.value, responsavel_id: ""})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Tipo responsável</option>
              <option value="funcionario">Funcionário</option>
              <option value="prestador">Prestador</option>
            </select>
            <select value={form.responsavel_id} onChange={e => setForm({...form, responsavel_id: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              disabled={!form.responsavel_type}>
              <option value="">Responsável</option>
              {form.responsavel_type === "funcionario" && funcionarios.filter(f=>f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              {form.responsavel_type === "prestador"   && prestadores.filter(p=>p.ativo).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Data prevista</label>
            <input type="date" value={form.data_prevista} onChange={e => setForm({...form, data_prevista: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Criar tarefa"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
