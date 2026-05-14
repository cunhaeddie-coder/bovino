"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

type Tipo = "tomador" | "cedente";
type Status = "ativo" | "encerrado" | "suspenso";

type Arrendamento = {
  id: number;
  tipo: Tipo;
  nome_propriedade: string;
  contraparte_nome: string;
  contato: string | null;
  estado: string | null;
  municipio: string | null;
  area_hectares: number | null;
  valor_mensal: number;
  tipo_pagamento: string;
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string | null;
  status: Status;
  observacoes: string | null;
};

type Resumo = {
  total_pagar_mes: number;
  total_receber_mes: number;
  area_ocupada: number;
  area_cedida: number;
  vencendo_30dias: number;
  vencidos: number;
};

const STATUS_COR: Record<Status, string> = {
  ativo:     "bg-green-100 text-green-700",
  suspenso:  "bg-yellow-100 text-yellow-700",
  encerrado: "bg-gray-100 text-gray-500",
};

const PAGAMENTO_LABEL: Record<string, string> = {
  mensal:     "Mensal",
  semestral:  "Semestral",
  anual:      "Anual",
  por_cabeca: "Por cabeça",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const UF = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#arr-abas",
    popover: {
      title: "🏡 Dois lados do arrendamento",
      description: "'Terras que ocupo': você paga para usar a terra de outro produtor. 'Terras que cedo': você recebe para permitir que outro use a sua terra.",
      side: "bottom",
    },
  },
  {
    element: "#arr-kpis",
    popover: {
      title: "📊 Resumo financeiro",
      description: "Veja em tempo real quanto você paga e recebe por mês em arrendamentos, a área total ocupada e cedida, e alertas de contratos vencendo.",
      side: "bottom",
    },
  },
  {
    element: "#btn-novo-arr",
    popover: {
      title: "➕ Novo arrendamento",
      description: "Cadastre um novo contrato de arrendamento. Informe o tipo (tomador ou cedente), propriedade, valor, datas e quantas parcelas gerar no financeiro.",
      side: "bottom",
    },
  },
  {
    element: "#lista-arrendamentos",
    popover: {
      title: "📋 Seus contratos",
      description: "Cada card mostra a propriedade, proprietário/inquilino, área, valor mensal, vencimento do contrato e status. Contratos vencendo em 30 dias ficam destacados.",
      side: "top",
    },
  },
];

export default function ArrendamentosPage() {
  const [aba, setAba]                   = useState<Tipo>("tomador");
  const [tomadores, setTomadores]       = useState<Arrendamento[]>([]);
  const [cedentes, setCedentes]         = useState<Arrendamento[]>([]);
  const [resumo, setResumo]             = useState<Resumo | null>(null);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editando, setEditando]         = useState<Arrendamento | null>(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.get("/gestao/arrendamentos");
      setTomadores(data.tomador);
      setCedentes(data.cedente);
      setResumo(data.resumo);
    } catch {}
    setLoading(false);
  }

  async function excluir(id: number) {
    if (!confirm("Remover este arrendamento?")) return;
    await api.delete(`/gestao/arrendamentos/${id}`);
    carregar();
  }

  const lista = aba === "tomador" ? tomadores : cedentes;

  const diasParaVencer = (dataFim: string | null) => {
    if (!dataFim) return null;
    return Math.ceil((new Date(dataFim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏡 Arrendamentos</h1>
          <p className="text-gray-500 text-sm">Terras que você ocupa e terras que você cede</p>
        </div>
        <button id="btn-novo-arr" onClick={() => { setEditando(null); setShowForm(true); }}
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Novo arrendamento
        </button>
      </div>

      {/* KPIs */}
      {resumo && (
        <div id="arr-kpis" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
            <p className="text-xl mb-1">💸</p>
            <p className="text-base md:text-xl font-bold text-red-600">{fmt(resumo.total_pagar_mes)}</p>
            <p className="text-xs text-gray-400">Pagando/mês</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
            <p className="text-xl mb-1">💚</p>
            <p className="text-base md:text-xl font-bold text-green-700">{fmt(resumo.total_receber_mes)}</p>
            <p className="text-xs text-gray-400">Recebendo/mês</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
            <p className="text-xl mb-1">🌿</p>
            <p className="text-base md:text-xl font-bold text-gray-900">
              {(resumo.area_ocupada + resumo.area_cedida).toLocaleString("pt-BR")} ha
            </p>
            <p className="text-xs text-gray-400">{resumo.area_ocupada.toLocaleString("pt-BR")} ha ocupados · {resumo.area_cedida.toLocaleString("pt-BR")} ha cedidos</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-3 md:p-5 ${resumo.vencendo_30dias > 0 || resumo.vencidos > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
            <p className="text-xl mb-1">⏰</p>
            <p className={`text-base md:text-xl font-bold ${resumo.vencidos > 0 ? "text-red-600" : resumo.vencendo_30dias > 0 ? "text-yellow-600" : "text-gray-900"}`}>
              {resumo.vencidos > 0 ? resumo.vencidos : resumo.vencendo_30dias}
            </p>
            <p className="text-xs text-gray-400">{resumo.vencidos > 0 ? "Contrato(s) vencido(s)" : "Vencendo em 30 dias"}</p>
          </div>
        </div>
      )}

      {/* Resultado financeiro */}
      {resumo && (resumo.total_receber_mes > 0 || resumo.total_pagar_mes > 0) && (
        <div className={`rounded-2xl p-4 text-sm font-semibold flex items-center justify-between ${
          resumo.total_receber_mes >= resumo.total_pagar_mes
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          <span>Saldo líquido de arrendamentos:</span>
          <span className="text-lg font-bold">
            {fmt(resumo.total_receber_mes - resumo.total_pagar_mes)}/mês
          </span>
        </div>
      )}

      {/* Abas */}
      <div id="arr-abas" className="flex gap-2 border-b border-gray-200">
        {([
          { key: "tomador", label: "🏠 Terras que ocupo", count: tomadores.length },
          { key: "cedente", label: "💼 Terras que cedo",  count: cedentes.length },
        ] as const).map(({ key, label, count }) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2 text-sm font-medium transition flex items-center gap-1.5 ${
              aba === key ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"
            }`}>
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${aba === key ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <p className="text-5xl mb-3">{aba === "tomador" ? "🏠" : "💼"}</p>
          <h3 className="font-semibold text-gray-700">
            {aba === "tomador" ? "Nenhuma terra arrendada" : "Nenhuma terra cedida"}
          </h3>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {aba === "tomador"
              ? "Cadastre as propriedades que você usa de terceiros"
              : "Cadastre as propriedades que você aluga para terceiros"}
          </p>
          <button onClick={() => { setEditando(null); setShowForm(true); }}
            className="bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-green-800">
            + Novo arrendamento
          </button>
        </div>
      ) : (
        <div id="lista-arrendamentos" className="grid md:grid-cols-2 gap-4">
          {lista.map(arr => {
            const dias = diasParaVencer(arr.data_fim);
            const vencendo = dias !== null && dias >= 0 && dias <= 30;
            const vencido  = dias !== null && dias < 0;
            return (
              <div key={arr.id} className={`bg-white rounded-2xl border shadow-sm p-3 md:p-5 space-y-3 ${vencido ? "border-red-300" : vencendo ? "border-yellow-300" : "border-gray-100"}`}>

                {/* Topo */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{arr.nome_propriedade}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {aba === "tomador" ? "Proprietário: " : "Inquilino: "}
                      <span className="font-medium text-gray-700">{arr.contraparte_nome}</span>
                      {arr.contato && <span className="text-gray-400"> · {arr.contato}</span>}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COR[arr.status]}`}>
                    {arr.status}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  {arr.municipio && (
                    <div>
                      <span className="text-gray-400">Localização</span>
                      <p className="font-medium">{arr.municipio}/{arr.estado}</p>
                    </div>
                  )}
                  {arr.area_hectares && (
                    <div>
                      <span className="text-gray-400">Área</span>
                      <p className="font-medium">{arr.area_hectares.toLocaleString("pt-BR")} ha</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Valor</span>
                    <p className={`font-bold text-base ${aba === "tomador" ? "text-red-600" : "text-green-700"}`}>
                      {fmt(arr.valor_mensal)}/mês
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Pagamento</span>
                    <p className="font-medium">{PAGAMENTO_LABEL[arr.tipo_pagamento]} · dia {arr.dia_vencimento}</p>
                  </div>
                </div>

                {/* Datas do contrato */}
                <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-gray-400">Início: </span>
                    <span className="font-medium">{new Date(arr.data_inicio).toLocaleDateString("pt-BR")}</span>
                    {arr.data_fim && (
                      <>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className={`font-medium ${vencido ? "text-red-600" : vencendo ? "text-yellow-600" : "text-gray-700"}`}>
                          {new Date(arr.data_fim).toLocaleDateString("pt-BR")}
                          {vencido && " ⚠️ Vencido"}
                          {vencendo && !vencido && ` ⏰ ${dias}d`}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditando(arr); setShowForm(true); }}
                      className="text-xs text-green-700 border border-green-200 px-3 py-1 rounded-full hover:bg-green-50">
                      Editar
                    </button>
                    <button onClick={() => excluir(arr.id)}
                      className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50">
                      Excluir
                    </button>
                  </div>
                </div>

                {arr.observacoes && (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 italic">"{arr.observacoes}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <ArrendamentoModal
          inicial={editando}
          tipoInicial={editando?.tipo ?? aba}
          onClose={() => setShowForm(false)}
          onDone={carregar}
        />
      )}

      <TourButton tourKey="gestao-arrendamentos" steps={TOUR_STEPS} />
    </div>
  );
}

function ArrendamentoModal({
  inicial, tipoInicial, onClose, onDone,
}: {
  inicial: Arrendamento | null;
  tipoInicial: Tipo;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    tipo:             inicial?.tipo ?? tipoInicial,
    nome_propriedade: inicial?.nome_propriedade ?? "",
    contraparte_nome: inicial?.contraparte_nome ?? "",
    contato:          inicial?.contato ?? "",
    estado:           inicial?.estado ?? "",
    municipio:        inicial?.municipio ?? "",
    area_hectares:    inicial?.area_hectares?.toString() ?? "",
    valor_mensal:     inicial?.valor_mensal?.toString() ?? "",
    tipo_pagamento:   inicial?.tipo_pagamento ?? "mensal",
    dia_vencimento:   inicial?.dia_vencimento?.toString() ?? "10",
    data_inicio:      inicial?.data_inicio?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    data_fim:         inicial?.data_fim?.slice(0, 10) ?? "",
    status:           inicial?.status ?? "ativo",
    observacoes:      inicial?.observacoes ?? "",
    gerar_parcelas:   "12",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const isEdicao = !!inicial;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        area_hectares:  form.area_hectares  ? parseFloat(form.area_hectares)  : null,
        valor_mensal:   parseFloat(form.valor_mensal),
        dia_vencimento: parseInt(form.dia_vencimento),
        data_fim:       form.data_fim || null,
        contato:        form.contato || null,
        estado:         form.estado || null,
        municipio:      form.municipio || null,
        observacoes:    form.observacoes || null,
        gerar_parcelas: !isEdicao && form.status === "ativo" ? parseInt(form.gerar_parcelas) : undefined,
      };
      if (isEdicao) {
        await api.put(`/gestao/arrendamentos/${inicial.id}`, payload);
      } else {
        await api.post("/gestao/arrendamentos", payload);
      }
      onDone();
      onClose();
    } catch (err: any) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : (err.response?.data?.message ?? "Erro ao salvar."));
    } finally {
      setSaving(false);
    }
  }

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const contraparteLabel = form.tipo === "tomador" ? "Nome do proprietário *" : "Nome do inquilino *";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900">{isEdicao ? "Editar arrendamento" : "Novo arrendamento"}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl hover:text-gray-600">×</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">

          {/* Tipo */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Tipo de arrendamento *</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "tomador", label: "🏠 Terras que ocupo", desc: "Você paga o aluguel" },
                { value: "cedente", label: "💼 Terras que cedo",  desc: "Você recebe o aluguel" },
              ] as const).map(op => (
                <button key={op.value} type="button" onClick={() => set("tipo", op.value)}
                  className={`p-3 rounded-xl border-2 text-left transition ${form.tipo === op.value ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <p className="font-semibold text-sm text-gray-900">{op.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{op.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Propriedade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Nome da propriedade *</label>
              <input required value={form.nome_propriedade} onChange={e => set("nome_propriedade", e.target.value)}
                placeholder="Ex: Fazenda Boa Vista"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">{contraparteLabel}</label>
              <input required value={form.contraparte_nome} onChange={e => set("contraparte_nome", e.target.value)}
                placeholder="Nome completo"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Contato (telefone/e-mail)</label>
              <input value={form.contato} onChange={e => set("contato", e.target.value)}
                placeholder="(65) 99999-9999"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Localização */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Estado</label>
              <select value={form.estado} onChange={e => set("estado", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                <option value="">UF</option>
                {UF.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Município</label>
              <input value={form.municipio} onChange={e => set("municipio", e.target.value)}
                placeholder="Cidade"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Área e valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Área (hectares)</label>
              <input type="number" step="0.01" min="0" value={form.area_hectares} onChange={e => set("area_hectares", e.target.value)}
                placeholder="250"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Valor mensal (R$) *</label>
              <input required type="number" step="0.01" min="0" value={form.valor_mensal} onChange={e => set("valor_mensal", e.target.value)}
                placeholder="2000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo de pagamento *</label>
              <select value={form.tipo_pagamento} onChange={e => set("tipo_pagamento", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                {Object.entries(PAGAMENTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Dia do vencimento *</label>
              <input required type="number" min="1" max="28" value={form.dia_vencimento} onChange={e => set("dia_vencimento", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data de início *</label>
              <input required type="date" value={form.data_inicio} onChange={e => set("data_inicio", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data de término</label>
              <input type="date" value={form.data_fim} onChange={e => set("data_fim", e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Status *</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>

          {/* Gerar parcelas — apenas no cadastro */}
          {!isEdicao && form.status === "ativo" && (
            <div className={`rounded-xl p-4 border ${form.tipo === "tomador" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                {form.tipo === "tomador" ? "📤 Gerar contas a pagar" : "📥 Gerar contas a receber"}
              </label>
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="24" value={form.gerar_parcelas} onChange={e => set("gerar_parcelas", e.target.value)}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <span className="text-sm text-gray-600">
                  parcelas de <strong>{form.valor_mensal ? fmt(parseFloat(form.valor_mensal) || 0) : "R$0"}</strong> cada
                  → geradas automaticamente no módulo Financeiro
                </span>
              </div>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => set("observacoes", e.target.value)}
              rows={2} placeholder="Condições especiais, cláusulas importantes..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-green-700 text-white font-semibold py-3 rounded-xl text-sm hover:bg-green-800 disabled:opacity-60">
              {saving ? "Salvando..." : isEdicao ? "Salvar alterações" : "Criar arrendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
