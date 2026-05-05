"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Visita = {
  id: number;
  data_solicitada: string;
  hora_solicitada: string | null;
  data_confirmada: string | null;
  hora_confirmada: string | null;
  status: "pendente" | "confirmada" | "recusada" | "cancelada" | "realizada";
  mensagem: string | null;
  resposta: string | null;
  anuncio: { id: number; titulo: string; raca: string } | null;
  comprador: { id: number; nome: string };
  vendedor: { id: number; nome: string };
};

const STATUS_STYLE: Record<string, { label: string; cor: string }> = {
  pendente:   { label: "Aguardando resposta", cor: "bg-yellow-100 text-yellow-700" },
  confirmada: { label: "Confirmada",          cor: "bg-green-100 text-green-700" },
  recusada:   { label: "Recusada",            cor: "bg-red-100 text-red-500" },
  cancelada:  { label: "Cancelada",           cor: "bg-gray-100 text-gray-500" },
  realizada:  { label: "Realizada",           cor: "bg-blue-100 text-blue-700" },
};

export default function VisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [meId, setMeId] = useState<number | null>(null);
  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [resposta, setResposta] = useState({ status: "confirmada", resposta: "", data_confirmada: "", hora_confirmada: "" });

  useEffect(() => {
    api.get("/auth/me").then(r => setMeId(r.data.id)).catch(() => {});
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    api.get("/visitas").then(r => setVisitas(r.data.data ?? r.data)).finally(() => setLoading(false));
  }

  async function responder(id: number) {
    await api.put(`/visitas/${id}/responder`, resposta);
    setRespondendo(null);
    carregar();
  }

  async function cancelar(id: number) {
    if (!confirm("Cancelar esta visita?")) return;
    await api.put(`/visitas/${id}/cancelar`);
    carregar();
  }

  const visistasFiltradas = filtro ? visitas.filter(v => v.status === filtro) : visitas;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">📅 Visitas agendadas</h1>
        <p className="text-gray-500 text-sm">Solicitações de visita às suas propriedades e anúncios</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["", "pendente", "confirmada", "cancelada", "realizada"].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filtro === s ? "bg-green-700 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
            {s === "" ? "Todas" : STATUS_STYLE[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Modal de resposta */}
      {respondendo !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Responder visita</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Decisão</label>
                <select value={resposta.status} onChange={e => setResposta(r => ({...r, status: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="confirmada">Confirmar visita</option>
                  <option value="recusada">Recusar</option>
                </select>
              </div>
              {resposta.status === "confirmada" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Data confirmada *</label>
                    <input type="date" value={resposta.data_confirmada} onChange={e => setResposta(r => ({...r, data_confirmada: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Horário</label>
                    <input type="time" value={resposta.hora_confirmada} onChange={e => setResposta(r => ({...r, hora_confirmada: e.target.value}))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Mensagem (opcional)</label>
                <textarea value={resposta.resposta} onChange={e => setResposta(r => ({...r, resposta: e.target.value}))}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  placeholder="Ex: Pode vir por esse portão..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRespondendo(null)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
                <button onClick={() => responder(respondendo)}
                  className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800">
                  Enviar resposta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : visistasFiltradas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-500 font-medium">Nenhuma visita encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visistasFiltradas.map(v => {
            const sou_vendedor = meId === v.vendedor.id;
            const st = STATUS_STYLE[v.status];
            return (
              <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{v.anuncio?.titulo ?? "Anúncio removido"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {sou_vendedor ? `Solicitante: ${v.comprador.nome}` : `Vendedor: ${v.vendedor.nome}`}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.cor}`}>{st.label}</span>
                </div>

                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>📅 Solicitada para: <strong>{new Date(v.data_solicitada).toLocaleDateString("pt-BR")}</strong>
                    {v.hora_solicitada && ` às ${v.hora_solicitada.slice(0, 5)}`}</p>
                  {v.data_confirmada && (
                    <p>✅ Confirmada para: <strong>{new Date(v.data_confirmada).toLocaleDateString("pt-BR")}</strong>
                      {v.hora_confirmada && ` às ${v.hora_confirmada.slice(0, 5)}`}</p>
                  )}
                  {v.mensagem && <p className="text-gray-500 italic">"{v.mensagem}"</p>}
                  {v.resposta && <p className="text-gray-500">Resposta: {v.resposta}</p>}
                </div>

                {/* Ações */}
                <div className="flex gap-2 mt-3">
                  {sou_vendedor && v.status === "pendente" && (
                    <button onClick={() => {
                      setRespondendo(v.id);
                      setResposta({ status: "confirmada", resposta: "", data_confirmada: v.data_solicitada, hora_confirmada: v.hora_solicitada ?? "" });
                    }}
                      className="text-sm bg-green-700 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-green-800 transition">
                      Responder
                    </button>
                  )}
                  {["pendente", "confirmada"].includes(v.status) && (
                    <button onClick={() => cancelar(v.id)}
                      className="text-sm border border-gray-200 text-gray-600 font-semibold px-4 py-1.5 rounded-full hover:border-red-300 hover:text-red-500 transition">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
