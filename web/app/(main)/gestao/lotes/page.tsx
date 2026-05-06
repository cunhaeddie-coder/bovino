"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#btn-novo-lote",
    popover: {
      title: "🗂️ Criar lote",
      description: "Agrupe animais em lotes para facilitar o manejo e a venda. Defina nome, raça, categoria, quantidade, peso médio e preço por arroba.",
      side: "bottom",
    },
  },
  {
    element: "#filtros-lotes",
    popover: {
      title: "🔍 Filtrar por status",
      description: "Filtre os lotes por status: Disponível (à venda), Reservado (negociação em andamento), Vendido ou Interno (uso próprio).",
      side: "bottom",
    },
  },
  {
    element: "#grid-lotes",
    popover: {
      title: "📦 Seus lotes",
      description: "Cada card mostra o resumo do lote. Clique em '📢 Publicar como anúncio' para colocar o lote à venda no marketplace automaticamente.",
      side: "top",
    },
  },
];

type Lote = {
  id: number;
  nome: string;
  raca: string | null;
  categoria: string;
  qtd_cabecas: number;
  peso_medio: number | null;
  preco_arroba: number | null;
  status: "disponivel" | "reservado" | "vendido" | "interno";
  animais_count?: number;
};

type FormState = {
  nome: string;
  raca: string;
  categoria: string;
  qtd_cabecas: string;
  peso_medio: string;
  unidade_peso: "kg" | "arroba";
  preco_valor: string;
  unidade_preco: "arroba" | "kg";
  status: string;
};

const FORM_VAZIO: FormState = {
  nome: "", raca: "", categoria: "boi_gordo", qtd_cabecas: "",
  peso_medio: "", unidade_peso: "kg",
  preco_valor: "", unidade_preco: "arroba",
  status: "disponivel",
};

const ARROBA = 15; // 1 @ = 15 kg

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  disponivel: { label: "Disponível", cor: "bg-green-100 text-green-700" },
  reservado:  { label: "Reservado",  cor: "bg-yellow-100 text-yellow-700" },
  vendido:    { label: "Vendido",    cor: "bg-gray-100 text-gray-500" },
  interno:    { label: "Interno",    cor: "bg-blue-100 text-blue-700" },
};

const CATEGORIAS = ["bezerro","novilho","novilha","boi_gordo","vaca","touro","misto"];

function loteParaForm(lote: Lote): FormState {
  return {
    nome: lote.nome,
    raca: lote.raca ?? "",
    categoria: lote.categoria,
    qtd_cabecas: String(lote.qtd_cabecas),
    peso_medio: lote.peso_medio ? String(lote.peso_medio) : "",
    unidade_peso: "kg",
    preco_valor: lote.preco_arroba ? String(lote.preco_arroba) : "",
    unidade_preco: "arroba",
    status: lote.status,
  };
}

function UnitToggle({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold shrink-0">
      {options.map(op => (
        <button key={op.value} type="button" onClick={() => onChange(op.value)}
          className={`px-2.5 py-1.5 transition ${value === op.value ? "bg-green-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
          {op.label}
        </button>
      ))}
    </div>
  );
}

export default function LotesPage() {
  const router = useRouter();
  const [lotes, setLotes]               = useState<Lote[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editando, setEditando]         = useState<Lote | null>(null);
  const [form, setForm]                 = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando]         = useState(false);
  const [confirmarPublicar, setConfirmarPublicar] = useState<Lote | null>(null);

  async function carregar() {
    setLoading(true);
    const params = filtroStatus ? `?status=${filtroStatus}` : "";
    api.get(`/gestao/lotes${params}`).then(r => setLotes(r.data)).finally(() => setLoading(false));
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setShowForm(true);
  }

  function abrirEditar(lote: Lote) {
    setEditando(lote);
    setForm(loteParaForm(lote));
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function calcularPayload() {
    const precoVal = form.preco_valor ? Number(form.preco_valor) : null;
    const pesoVal  = form.peso_medio  ? Number(form.peso_medio)  : null;

    // Sempre armazena preço em @/arroba
    const preco_arroba = precoVal === null ? null
      : form.unidade_preco === "kg" ? precoVal * ARROBA
      : precoVal;

    // Sempre armazena peso em kg
    const peso_medio = pesoVal === null ? null
      : form.unidade_peso === "arroba" ? pesoVal * ARROBA
      : pesoVal;

    return {
      nome:         form.nome,
      raca:         form.raca || null,
      categoria:    form.categoria,
      qtd_cabecas:  Number(form.qtd_cabecas),
      peso_medio,
      preco_arroba,
      status:       form.status,
    };
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = calcularPayload();
      if (editando) {
        await api.put(`/gestao/lotes/${editando.id}`, payload);
      } else {
        await api.post("/gestao/lotes", payload);
      }
      fecharForm();
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  function publicar(lote: Lote) {
    const params = new URLSearchParams({
      raca:       lote.raca       ?? "",
      quantidade: String(lote.qtd_cabecas),
      lote_id:    String(lote.id),
      categoria:  lote.categoria  ?? "",
    });
    if (lote.peso_medio)   params.set("peso_medio",   String(lote.peso_medio));
    if (lote.preco_arroba) params.set("preco_arroba", String(lote.preco_arroba));
    router.push(`/anuncios/novo?${params}`);
  }

  const precoLabel = form.unidade_preco === "arroba" ? "Preço/@" : "Preço/kg";
  const pesoLabel  = form.unidade_peso  === "kg"     ? "Peso médio (kg)" : "Peso médio (@)";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🗂️ Lotes</h1>
        <button id="btn-novo-lote" onClick={abrirNovo}
          className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Novo lote
        </button>
      </div>

      {/* Filtros */}
      <div id="filtros-lotes" className="flex gap-2 flex-wrap">
        {["", "disponivel", "reservado", "vendido", "interno"].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filtroStatus === s ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
            {s === "" ? "Todos" : STATUS_LABEL[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editando ? "Editar lote" : "Novo lote"}
              </h2>
              <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6">
              <form onSubmit={salvar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">

                  {/* Nome */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do lote *</label>
                    <input required value={form.nome} onChange={e => set("nome", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Lote Boi Gordo Março" />
                  </div>

                  {/* Raça */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Raça</label>
                    <input value={form.raca} onChange={e => set("raca", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Nelore" />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                    <select required value={form.categoria} onChange={e => set("categoria", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                    </select>
                  </div>

                  {/* Qtd cabeças */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Qtd. cabeças *</label>
                    <input required type="number" min="1" value={form.qtd_cabecas} onChange={e => set("qtd_cabecas", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="50" />
                  </div>

                  {/* Peso médio com unidade */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600">{pesoLabel}</label>
                      <UnitToggle value={form.unidade_peso}
                        options={[{ value: "kg", label: "kg" }, { value: "arroba", label: "@" }]}
                        onChange={v => set("unidade_peso", v)} />
                    </div>
                    <input type="number" step="0.1" min="0" value={form.peso_medio} onChange={e => set("peso_medio", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder={form.unidade_peso === "kg" ? "450" : "30"} />
                    {form.peso_medio && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ≈ {form.unidade_peso === "kg"
                          ? `${(Number(form.peso_medio) / ARROBA).toFixed(1)} @`
                          : `${(Number(form.peso_medio) * ARROBA).toFixed(0)} kg`}
                      </p>
                    )}
                  </div>

                  {/* Preço com unidade */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600">{precoLabel}</label>
                      <UnitToggle value={form.unidade_preco}
                        options={[{ value: "arroba", label: "@" }, { value: "kg", label: "kg" }]}
                        onChange={v => set("unidade_preco", v)} />
                    </div>
                    <input type="number" step="0.01" min="0" value={form.preco_valor} onChange={e => set("preco_valor", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      placeholder={form.unidade_preco === "arroba" ? "320" : "21.33"} />
                    {form.preco_valor && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ≈ {form.unidade_preco === "arroba"
                          ? `R$ ${(Number(form.preco_valor) / ARROBA).toFixed(2)}/kg`
                          : `R$ ${(Number(form.preco_valor) * ARROBA).toFixed(2)}/@`}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
                    <select value={form.status} onChange={e => set("status", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="disponivel">Disponível</option>
                      <option value="reservado">Reservado</option>
                      <option value="interno">Interno</option>
                      {editando && <option value="vendido">Vendido</option>}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={fecharForm}
                    className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando}
                    className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800 disabled:opacity-60">
                    {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar lote"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : lotes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-gray-500 font-medium">Nenhum lote cadastrado</p>
          <button onClick={abrirNovo} className="mt-4 text-green-700 text-sm font-semibold hover:underline">
            Criar o primeiro lote →
          </button>
        </div>
      ) : (
        <div id="grid-lotes" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotes.map(lote => {
            const st = STATUS_LABEL[lote.status];
            return (
              <div key={lote.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 leading-tight">{lote.nome}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.cor}`}>{st.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-gray-400">Raça:</span> <span className="font-medium">{lote.raca || "—"}</span></div>
                  <div><span className="text-gray-400">Categoria:</span> <span className="font-medium capitalize">{lote.categoria.replace("_"," ")}</span></div>
                  <div><span className="text-gray-400">Cabeças:</span> <span className="font-bold text-green-700">{lote.qtd_cabecas}</span></div>
                  {lote.peso_medio && (
                    <div>
                      <span className="text-gray-400">Peso médio:</span>{" "}
                      <span className="font-medium">{lote.peso_medio} kg</span>
                      <span className="text-gray-400 text-xs ml-1">({(lote.peso_medio / ARROBA).toFixed(1)} @)</span>
                    </div>
                  )}
                  {lote.preco_arroba && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Preço:</span>{" "}
                      <span className="font-bold text-green-700">R$ {lote.preco_arroba.toFixed(2)}/@</span>
                      <span className="text-gray-400 text-xs ml-1">(R$ {(lote.preco_arroba / ARROBA).toFixed(2)}/kg)</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => abrirEditar(lote)}
                    className="flex-1 border border-gray-200 text-gray-600 text-xs font-semibold py-2 rounded-full hover:bg-gray-50 transition">
                    ✏️ Editar
                  </button>
                  {lote.status === "disponivel" && (
                    <button onClick={() => setConfirmarPublicar(lote)}
                      className="flex-1 border border-green-700 text-green-700 text-xs font-semibold py-2 rounded-full hover:bg-green-50 transition">
                      📢 Publicar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmação publicar */}
      {confirmarPublicar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-2">📢</p>
              <h3 className="font-bold text-gray-900 text-lg">Publicar como anúncio?</h3>
              <p className="text-sm text-gray-500 mt-1">
                O lote <strong>{confirmarPublicar.nome}</strong> será publicado no marketplace para compradores de todo o Brasil.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
              <p><span className="text-gray-400">Raça:</span> {confirmarPublicar.raca || "—"}</p>
              <p><span className="text-gray-400">Cabeças:</span> {confirmarPublicar.qtd_cabecas}</p>
              {confirmarPublicar.peso_medio && (
                <p><span className="text-gray-400">Peso médio:</span> {confirmarPublicar.peso_medio} kg ({(confirmarPublicar.peso_medio / ARROBA).toFixed(1)} @)</p>
              )}
              {confirmarPublicar.preco_arroba && (
                <p><span className="text-gray-400">Preço:</span> R$ {confirmarPublicar.preco_arroba.toFixed(2)}/@ (R$ {(confirmarPublicar.preco_arroba / ARROBA).toFixed(2)}/kg)</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setConfirmarPublicar(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => publicar(confirmarPublicar)}
                className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800">
                📢 Confirmar publicação
              </button>
            </div>
          </div>
        </div>
      )}

      <TourButton tourKey="gestao-lotes" steps={TOUR_STEPS} />
    </div>
  );
}
