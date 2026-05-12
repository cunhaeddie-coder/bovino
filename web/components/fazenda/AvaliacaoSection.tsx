"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Negociacao } from "@/lib/types";

type Props = {
  vendedorUserId: number;
  avaliacoesIniciais: {
    id: number;
    nota: number;
    comentario: string | null;
    resposta_vendedor: string | null;
    created_at: string;
    comprador: { nome: string };
  }[];
};

type Avaliacao = Props["avaliacoesIniciais"][number];

function Estrelas({ nota, interactive = false, onChange }: {
  nota: number;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={interactive ? 28 : 16}
          className={`transition-colors ${
            i <= (interactive ? hovered || nota : Math.round(nota))
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          } ${interactive ? "cursor-pointer" : ""}`}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(i)}
        />
      ))}
    </span>
  );
}

export default function AvaliacaoSection({ vendedorUserId, avaliacoesIniciais }: Props) {
  const { user } = useAuthStore();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(avaliacoesIniciais);
  const [pendentes, setPendentes] = useState<Negociacao[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [negociacaoId, setNegociacaoId] = useState<number | null>(null);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!user) return;
    api.get<Negociacao[]>("/avaliacoes/pendentes")
      .then(({ data }) => {
        const paraEsteVendedor = data.filter(
          n => n.vendedor?.id === vendedorUserId
        );
        setPendentes(paraEsteVendedor);
        if (paraEsteVendedor.length > 0) {
          setNegociacaoId(paraEsteVendedor[0].id);
        }
      })
      .catch(() => {});
  }, [user, vendedorUserId]);

  async function enviar() {
    if (!negociacaoId || nota < 1) return;
    setSending(true);
    setErro("");
    try {
      const { data } = await api.post<Avaliacao>("/avaliacoes", {
        negociacao_id: negociacaoId,
        nota,
        comentario: comentario.trim() || undefined,
      });
      setAvaliacoes(prev => [data, ...prev]);
      setPendentes(prev => prev.filter(n => n.id !== negociacaoId));
      setShowModal(false);
      setNota(5);
      setComentario("");
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? "Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  }

  const ehVendedor = user?.id === vendedorUserId;

  return (
    <div className="space-y-4">
      {/* Botão de avaliar — só aparece para compradores com negociação concluída */}
      {!ehVendedor && pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Você comprou desta fazenda!</p>
            <p className="text-xs text-amber-700">Compartilhe sua experiência com outros compradores.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Avaliar
          </button>
        </div>
      )}

      {/* Lista de avaliações */}
      {avaliacoes.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">Ainda sem avaliações</p>
      ) : (
        <div className="space-y-4">
          {avaliacoes.map(av => (
            <div key={av.id} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800">{av.comprador.nome}</p>
                <Estrelas nota={av.nota} />
              </div>
              {av.comentario && (
                <p className="text-sm text-gray-600">{av.comentario}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(av.created_at).toLocaleDateString("pt-BR")}
              </p>
              {av.resposta_vendedor && (
                <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-green-700 mb-0.5">Resposta do produtor</p>
                  <p className="text-xs text-green-800">{av.resposta_vendedor}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de avaliação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Avaliar fazenda</h2>
            <p className="text-sm text-gray-500 mb-5">Sua avaliação é baseada em uma compra verificada na plataforma.</p>

            {pendentes.length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Negociação</label>
                <select
                  value={negociacaoId ?? ""}
                  onChange={e => setNegociacaoId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {pendentes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.anuncio?.titulo ?? `Negociação #${n.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Nota</label>
              <Estrelas nota={nota} interactive onChange={setNota} />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Comentário <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Como foi a negociação? O gado chegou como descrito?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {erro && <p className="text-sm text-red-500 mb-3">{erro}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={sending || nota < 1}
                className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition"
              >
                {sending ? "Enviando..." : "Publicar avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
