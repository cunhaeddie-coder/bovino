"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Categoria = "funcionalidade" | "bug" | "usabilidade" | "desempenho" | "outro";
type Status    = "aberta" | "em_analise" | "aprovada" | "implementada" | "recusada";

interface Sugestao {
  id: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  status: Status;
  prioridade_admin: string | null;
  resposta_admin: string | null;
  respondida_em: string | null;
  created_at: string;
}

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "funcionalidade", label: "Nova funcionalidade" },
  { value: "bug",            label: "Problema / Bug" },
  { value: "usabilidade",    label: "Usabilidade" },
  { value: "desempenho",     label: "Desempenho" },
  { value: "outro",          label: "Outro" },
];

const STATUS_LABEL: Record<Status, string> = {
  aberta:       "Aberta",
  em_analise:   "Em análise",
  aprovada:     "Aprovada ✓",
  implementada: "Implementada 🚀",
  recusada:     "Recusada",
};

const STATUS_COLOR: Record<Status, string> = {
  aberta:       "bg-blue-50 text-blue-700",
  em_analise:   "bg-yellow-50 text-yellow-700",
  aprovada:     "bg-green-50 text-green-700",
  implementada: "bg-purple-50 text-purple-700",
  recusada:     "bg-red-50 text-red-700",
};

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

export default function SugestoesPage() {
  const [lista, setLista]       = useState<Sugestao[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [form, setForm]         = useState({ titulo: "", descricao: "", categoria: "funcionalidade" as Categoria });
  const [erro, setErro]         = useState("");
  const [sucesso, setSucesso]   = useState("");

  async function carregar() {
    try {
      const { data } = await api.get("/gestao/sugestoes");
      setLista(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim()) return;
    setSending(true);
    setErro("");
    setSucesso("");
    try {
      await api.post("/gestao/sugestoes", form);
      setSucesso("Sugestão enviada! Nossa equipe irá analisar em breve.");
      setForm({ titulo: "", descricao: "", categoria: "funcionalidade" });
      carregar();
    } catch {
      setErro("Erro ao enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  async function remover(id: number) {
    if (!confirm("Remover esta sugestão?")) return;
    await api.delete(`/gestao/sugestoes/${id}`);
    setLista((l) => l.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💡 Sugestões de Melhoria</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tem uma ideia para melhorar o sistema? Envie aqui — nossa equipe lê todas as sugestões.
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={enviar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Nova sugestão</h2>

        {erro    && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{erro}</p>}
        {sucesso && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{sucesso}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
            className={INPUT}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Resumo curto da sua sugestão"
            maxLength={120}
            required
            className={INPUT}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.titulo.length}/120</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-red-500">*</span></label>
          <textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva com detalhes o que poderia ser melhorado e como isso ajudaria no dia a dia..."
            rows={5}
            maxLength={2000}
            required
            className={INPUT + " resize-none"}
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{form.descricao.length}/2000</p>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-green-700 text-white rounded-lg py-2.5 font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors text-sm"
        >
          {sending ? "Enviando..." : "Enviar sugestão"}
        </button>
      </form>

      {/* Lista de sugestões */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Minhas sugestões ({lista.length})</h2>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
        ) : lista.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">💡</p>
            <p className="text-gray-500 text-sm">Você ainda não enviou nenhuma sugestão.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lista.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {CATEGORIAS.find((c) => c.value === s.categoria)?.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{s.titulo}</h3>
                    <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{s.descricao}</p>
                  </div>
                  {s.status === "aberta" && (
                    <button
                      onClick={() => remover(s.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                      title="Remover"
                    >
                      ×
                    </button>
                  )}
                </div>

                {s.resposta_admin && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-green-700 mb-1">Resposta da equipe Bovino:</p>
                    <p className="text-sm text-gray-600">{s.resposta_admin}</p>
                  </div>
                )}

                <p className="text-xs text-gray-300 mt-3">
                  Enviada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
