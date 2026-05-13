"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Servico = {
  id: number; nome: string; descricao: string | null;
  valor: number; percentual_tecnico: number; duracao_horas: number;
  modalidade: "online" | "presencial" | "hibrido"; ativo: boolean; ordem: number;
};

const MODAL_LABEL = { online: "Online", presencial: "Presencial", hibrido: "Híbrido" };
const MODAL_COLOR = { online: "bg-blue-100 text-blue-700", presencial: "bg-green-100 text-green-700", hibrido: "bg-purple-100 text-purple-700" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const EMPTY = { nome: "", descricao: "", valor: "", percentual_tecnico: "40", duracao_horas: "2", modalidade: "online" as const, ordem: "0" };

function ServicoModal({ inicial, onClose, onSaved }: {
  inicial: Servico | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState(inicial ? {
    nome: inicial.nome, descricao: inicial.descricao ?? "",
    valor: String(inicial.valor), percentual_tecnico: String(inicial.percentual_tecnico),
    duracao_horas: String(inicial.duracao_horas), modalidade: inicial.modalidade, ordem: String(inicial.ordem),
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const valorCliente = Number(form.valor) || 0;
  const valorTecnico = +(valorCliente * (Number(form.percentual_tecnico) / 100)).toFixed(2);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, valor: Number(form.valor), percentual_tecnico: Number(form.percentual_tecnico), duracao_horas: Number(form.duracao_horas), ordem: Number(form.ordem) };
      if (inicial) await api.put(`/atendimento/servicos/${inicial.id}`, payload);
      else         await api.post("/atendimento/servicos", payload);
      onSaved(); onClose();
    } catch (err: any) { setError(err.response?.data?.message ?? "Erro."); }
    finally { setSaving(false); }
  }

  const f = (label: string, key: keyof typeof form, type = "text", opts?: object) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" {...opts} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-bold text-slate-800">{inicial ? "Editar serviço" : "Novo serviço"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {f("Nome *", "nome", "text", { required: true, placeholder: "Implantação Básica" })}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {f("Valor ao cliente (R$) *", "valor", "number", { required: true, min: 0, step: "0.01" })}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">% do técnico</label>
              <div className="relative">
                <input type="number" min={0} max={100} step={1} value={form.percentual_tecnico}
                  onChange={e => setForm(p => ({ ...p, percentual_tecnico: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
              </div>
              {valorTecnico > 0 && (
                <p className="text-[10px] text-green-600 mt-0.5">Técnico recebe: {fmt(valorTecnico)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {f("Duração (horas)", "duracao_horas", "number", { min: 0, step: "0.5" })}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Modalidade</label>
              <select value={form.modalidade} onChange={e => setForm(p => ({ ...p, modalidade: e.target.value as any }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="online">Online</option>
                <option value="presencial">Presencial</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [modal, setModal]       = useState<Servico | null | "novo">(null);

  async function carregar() {
    const { data } = await api.get("/atendimento/servicos");
    setServicos(data);
  }

  useEffect(() => { carregar(); }, []);

  async function toggleAtivo(s: Servico) {
    await api.put(`/atendimento/servicos/${s.id}`, { ativo: !s.ativo });
    carregar();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Catálogo de Serviços</h1>
          <p className="text-xs text-slate-400 mt-0.5">Implantação, treinamento e suporte oferecidos aos clientes</p>
        </div>
        <button onClick={() => setModal("novo")} className="text-sm bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition">
          + Novo serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {servicos.map(s => (
          <div key={s.id} className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 ${s.ativo ? "border-slate-100" : "border-slate-200 opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-800 text-sm">{s.nome}</p>
                {s.descricao && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{s.descricao}</p>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${MODAL_COLOR[s.modalidade]}`}>
                {MODAL_LABEL[s.modalidade]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-xl py-2">
                <p className="text-xs text-slate-400">Cliente</p>
                <p className="text-sm font-bold text-slate-800">{fmt(s.valor)}</p>
              </div>
              <div className="bg-green-50 rounded-xl py-2">
                <p className="text-xs text-green-600">Técnico</p>
                <p className="text-sm font-bold text-green-700">{s.percentual_tecnico}%</p>
                <p className="text-[10px] text-green-500">{fmt(+(s.valor * s.percentual_tecnico / 100).toFixed(2))}</p>
              </div>
              <div className="bg-slate-50 rounded-xl py-2">
                <p className="text-xs text-slate-400">Duração</p>
                <p className="text-sm font-bold text-slate-800">{s.duracao_horas}h</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(s)} className="flex-1 text-xs border border-slate-200 rounded-lg py-1.5 text-slate-600 hover:bg-slate-50 font-semibold transition">
                Editar
              </button>
              <button onClick={() => toggleAtivo(s)} className={`flex-1 text-xs rounded-lg py-1.5 font-semibold transition ${s.ativo ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"}`}>
                {s.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ServicoModal
          inicial={modal === "novo" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}
