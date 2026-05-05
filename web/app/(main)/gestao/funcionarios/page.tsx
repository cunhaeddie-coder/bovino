"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Funcionario = { id: number; nome: string; cargo: string; tipo_contrato: string; salario: number | null; telefone: string | null; data_admissao: string; ativo: boolean };
type Prestador   = { id: number; nome: string; especialidade: string; telefone: string | null; valor_hora: number | null; valor_diaria: number | null; ativo: boolean };
type Tarefa      = {
  id: number; titulo: string; tipo: string; prioridade: string; status: string;
  data_prevista: string | null; responsavel: { nome: string } | null; lote: { nome: string } | null;
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
  const [showPrest, setShowPrest]       = useState(false);
  const [showTarefa, setShowTarefa]     = useState(false);

  async function carregar() {
    setLoading(true);
    const [funs, prests, tarefasData] = await Promise.all([
      api.get("/gestao/funcionarios").then(r => r.data),
      api.get("/gestao/prestadores").then(r => r.data),
      api.get("/gestao/tarefas").then(r => r.data),
    ]);
    setFuncionarios(funs); setPrestadores(prests); setTarefas(tarefasData);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const totalFolha = funcionarios.filter(f => f.ativo).reduce((s, f) => s + (f.salario ?? 0), 0);

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
      <div className="grid grid-cols-3 gap-4">
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
      <div className="flex gap-2 border-b border-gray-200">
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
            <div key={f.id} className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between ${!f.ativo ? "opacity-50" : "border-gray-100"}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
                  {f.nome[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{f.nome}</p>
                  <p className="text-xs text-gray-400">{f.cargo} · {f.tipo_contrato.toUpperCase()}</p>
                  {f.telefone && <p className="text-xs text-gray-400">{f.telefone}</p>}
                </div>
              </div>
              <div className="text-right">
                {f.salario && <p className="font-semibold text-gray-800">{fmt(f.salario)}/mês</p>}
                <p className="text-xs text-gray-400">desde {new Date(f.data_admissao).toLocaleDateString("pt-BR")}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${f.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {f.ativo ? "Ativo" : "Inativo"}
                </span>
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

      {showFun    && <FuncionarioModal onClose={() => setShowFun(false)} onDone={carregar} />}
      {showPrest  && <PrestadorModal  onClose={() => setShowPrest(false)} onDone={carregar} />}
      {showTarefa && <TarefaModal funcionarios={funcionarios} prestadores={prestadores} onClose={() => setShowTarefa(false)} onDone={carregar} />}
    </div>
  );
}

function FuncionarioModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nome: "", cargo: "", tipo_contrato: "clt", salario: "", telefone: "", data_admissao: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await api.post("/gestao/funcionarios", { ...form, salario: form.salario || null }); onDone(); onClose(); }
    catch { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-800">Novo Funcionário</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome completo"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-3">
            <input required value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} placeholder="Cargo / função"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="clt">CLT</option><option value="pj">PJ</option>
              <option value="temporario">Temporário</option><option value="diarista">Diarista</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.salario} onChange={e => setForm({...form, salario: e.target.value})} placeholder="Salário (R$)" step="0.01" min="0"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="Telefone"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Data de admissão</label>
            <input type="date" required value={form.data_admissao} onChange={e => setForm({...form, data_admissao: e.target.value})}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
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
