"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Cotacao } from "@/lib/types";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Props = {
  anuncioId: number;
  precoUnitario: number;
  quantidade: number;
  aceitaNegociacao: boolean;
};

export function NegociarModal({ anuncioId, precoUnitario, quantidade, aceitaNegociacao }: Props) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [preco, setPreco] = useState(precoUnitario.toFixed(2).replace(".", ","));
  const [mensagem, setMensagem] = useState("");
  const [sending, setSending] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcPeso, setCalcPeso] = useState("");
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);

  useEffect(() => {
    if (showCalc && !cotacao) {
      api.get<{ boi_gordo: Cotacao | null }>("/cotacoes/ultima")
        .then(({ data }) => setCotacao(data.boi_gordo))
        .catch(() => {});
    }
  }, [showCalc, cotacao]);

  const precoNum = Number(preco.replace(",", "."));
  const arrobas = calcPeso ? (Number(calcPeso) * quantidade) / 15 : null;
  const totalArroba = arrobas && cotacao ? arrobas * cotacao.preco_arroba : null;
  const diff = precoNum && precoUnitario
    ? ((precoNum - precoUnitario) / precoUnitario) * 100
    : 0;

  function handleOpen() {
    if (!user) { router.push("/login"); return; }
    setOpen(true);
  }

  async function enviar() {
    if (!precoNum || sending) return;
    setSending(true);
    try {
      const { data } = await api.post<{ id: number }>("/negociacoes", {
        anuncio_id: anuncioId,
        preco_proposto: precoNum,
        mensagem_inicial: mensagem.trim() || undefined,
      });
      router.push(`/chat/${data.id}`);
    } catch {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="block w-full text-center bg-green-700 text-white rounded-xl py-3 font-semibold hover:bg-green-800 transition-colors"
      >
        {aceitaNegociacao ? "💬 Negociar / Contato" : "💬 Entrar em contato"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Fazer proposta</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            {/* Preço anunciado */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Preço anunciado</p>
              <p className="font-bold text-green-700 text-xl">
                {fmt(precoUnitario)}<span className="text-sm text-gray-400 font-normal">/cab</span>
              </p>
              {quantidade > 1 && (
                <p className="text-xs text-gray-400 mt-0.5">Lote de {quantidade} cab · Total {fmt(precoUnitario * quantidade)}</p>
              )}
            </div>

            {/* Calculadora arroba */}
            <button
              onClick={() => setShowCalc(v => !v)}
              className="w-full text-xs font-semibold text-green-700 border border-green-200 bg-green-50 rounded-xl py-2 hover:bg-green-100"
            >
              📊 {showCalc ? "Fechar calculadora" : "Calcular por arroba"}
            </button>

            {showCalc && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Peso médio (kg/cab)</label>
                    <input
                      type="number"
                      value={calcPeso}
                      onChange={e => setCalcPeso(e.target.value)}
                      placeholder="ex: 450"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Cotação @</label>
                    <p className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 bg-white text-gray-700">
                      {cotacao ? fmt(cotacao.preco_arroba) : "Carregando..."}
                    </p>
                  </div>
                </div>
                {arrobas && totalArroba && (
                  <div className="bg-white rounded-lg p-2.5 space-y-0.5">
                    <p className="text-xs text-gray-500">Arrobas totais: <strong>{arrobas.toFixed(1)} @</strong></p>
                    <p className="text-xs text-gray-500">Total estimado: <strong className="text-green-700">{fmt(totalArroba)}</strong></p>
                    <p className="text-xs text-gray-500">Por cabeça: <strong>{fmt(totalArroba / quantidade)}</strong></p>
                    <button
                      onClick={() => {
                        setPreco((totalArroba / quantidade).toFixed(2).replace(".", ","));
                        setShowCalc(false);
                      }}
                      className="w-full mt-1 text-xs font-semibold bg-green-700 text-white py-1.5 rounded-lg hover:bg-green-800"
                    >
                      Usar este valor
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Preço proposto */}
            <div>
              <label className="text-sm font-medium text-gray-700">Sua proposta (R$/cab)</label>
              <input
                type="text"
                inputMode="decimal"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-xl font-bold text-green-700 focus:outline-none focus:border-green-400"
              />
              {precoNum > 0 && (
                <div className="flex justify-between text-xs mt-1 px-1">
                  <span className={diff < 0 ? "text-orange-500" : diff > 0 ? "text-green-600" : "text-gray-400"}>
                    {diff === 0 ? "Igual ao anunciado" : diff < 0
                      ? `${Math.abs(diff).toFixed(1)}% abaixo do anunciado`
                      : `${diff.toFixed(1)}% acima do anunciado`}
                  </span>
                  {quantidade > 1 && (
                    <span className="text-gray-400">Total: {fmt(precoNum * quantidade)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Mensagem */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Mensagem <span className="text-gray-400 font-normal text-xs">(opcional)</span>
              </label>
              <textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                rows={3}
                placeholder="Ex: Tenho interesse no lote, posso retirar em 15 dias..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 text-sm resize-none focus:outline-none focus:border-green-400"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={sending || !precoNum}
                className="flex-1 bg-green-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 hover:bg-green-800"
              >
                {sending ? "Enviando..." : "Enviar proposta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
