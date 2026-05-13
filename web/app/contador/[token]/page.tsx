"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bovino.agr.br/v1";

type Info = { nome_fazenda: string; tem_pin: boolean; expira_em: string | null };
type Dados = {
  nome_fazenda: string; mes: string;
  receitas_mes: number; despesas_mes: number; saldo_mes: number;
  lancamentos: { id: number; tipo: string; categoria: string; valor: number; data: string; descricao: string | null }[];
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtFull = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CAT_LABEL: Record<string, string> = {
  venda_gado: "Venda de gado", venda_leite: "Venda de leite",
  arrendamento: "Arrendamento", outros_receita: "Outras receitas",
  alimentacao: "Ração / Alimentação", sanidade: "Vacinas / Sanidade",
  funcionarios: "Funcionários", combustivel: "Combustível",
  manutencao: "Manutenção", pastagem: "Pastagem / Terra",
  impostos: "Impostos / Taxas", outros_despesa: "Outras despesas",
};

function sessaoKey(token: string) { return `contador_sessao_${token}`; }

function getSessao(token: string): string | null {
  try {
    const raw = localStorage.getItem(sessaoKey(token));
    if (!raw) return null;
    const { sessaoToken, expira } = JSON.parse(raw);
    if (Date.now() > expira) { localStorage.removeItem(sessaoKey(token)); return null; }
    return sessaoToken;
  } catch { return null; }
}

function setSessao(token: string, sessaoToken: string) {
  localStorage.setItem(sessaoKey(token), JSON.stringify({
    sessaoToken,
    expira: Date.now() + 23 * 60 * 60 * 1000,
  }));
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesPtBR(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[Number(m) - 1]} de ${y}`;
}

export default function ContadorPage() {
  const { token } = useParams<{ token: string }>();

  const [fase, setFase] = useState<"carregando" | "pin" | "dados" | "erro">("carregando");
  const [info, setInfo]   = useState<Info | null>(null);
  const [erro, setErro]   = useState("");
  const [pin, setPin]     = useState("");
  const [pinErro, setPinErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  const [mes, setMes]     = useState(mesAtual());
  const [dados, setDados] = useState<Dados | null>(null);
  const [exportando, setExportando] = useState(false);
  const [sessaoToken, setSessaoTokenState] = useState<string | null>(null);

  // Carrega info do link
  useEffect(() => {
    fetch(`${API}/contador/${token}`)
      .then(async r => {
        if (!r.ok) { setErro(r.status === 410 ? "Este link expirou." : "Link inválido ou revogado."); setFase("erro"); return; }
        const data: Info = await r.json();
        setInfo(data);
        // Verifica se já tem sessão salva
        const sessao = getSessao(token);
        if (!data.tem_pin || sessao) {
          setSessaoTokenState(sessao);
          setFase("dados");
        } else {
          setFase("pin");
        }
      })
      .catch(() => { setErro("Não foi possível carregar o link."); setFase("erro"); });
  }, [token]);

  // Carrega dados quando entra na fase "dados"
  useEffect(() => {
    if (fase !== "dados") return;
    carregarDados();
  }, [fase, mes]);

  async function carregarDados() {
    setDados(null);
    const headers: Record<string, string> = {};
    const s = sessaoToken ?? getSessao(token);
    if (s) headers["X-Contador-Sessao"] = s;

    const r = await fetch(`${API}/contador/${token}/dados?mes=${mes}`, { headers });
    if (r.status === 401) { setFase("pin"); return; }
    if (!r.ok) return;
    setDados(await r.json());
  }

  async function verificarPin(e: React.FormEvent) {
    e.preventDefault();
    setVerificando(true); setPinErro("");
    try {
      const r = await fetch(`${API}/contador/${token}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await r.json();
      if (!r.ok) { setPinErro(data.message ?? "PIN incorreto."); return; }
      setSessao(token, data.sessao_token);
      setSessaoTokenState(data.sessao_token);
      setFase("dados");
    } finally { setVerificando(false); }
  }

  async function exportar() {
    setExportando(true);
    try {
      const headers: Record<string, string> = {};
      const s = sessaoToken ?? getSessao(token);
      if (s) headers["X-Contador-Sessao"] = s;
      const r = await fetch(`${API}/contador/${token}/exportar?mes=${mes}`, { headers });
      if (!r.ok) return;
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `lancamentos-${mes}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExportando(false); }
  }

  // ── Tela de erro ─────────────────────────────────────────────────────────────
  if (fase === "erro") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center max-w-sm w-full">
        <p className="text-3xl mb-4">🔒</p>
        <h1 className="font-bold text-slate-800 mb-2">Link indisponível</h1>
        <p className="text-sm text-slate-400">{erro}</p>
      </div>
    </div>
  );

  // ── Carregando ────────────────────────────────────────────────────────────────
  if (fase === "carregando") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Tela de PIN ───────────────────────────────────────────────────────────────
  if (fase === "pin") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm">
        <div className="p-8 text-center border-b border-slate-100">
          <p className="text-3xl mb-3">🐄</p>
          <h1 className="font-extrabold text-slate-800 text-lg">Bovino</h1>
          <p className="text-sm text-slate-500 mt-1">Dados de <span className="font-semibold">{info?.nome_fazenda}</span></p>
        </div>
        <form onSubmit={verificarPin} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 text-center">Código de acesso</label>
            <input
              type="password" inputMode="numeric" required
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
              maxLength={6} placeholder="· · · ·"
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
              autoFocus
            />
          </div>
          {pinErro && <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg px-3 py-2">{pinErro}</p>}
          <button type="submit" disabled={verificando || pin.length < 4}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm disabled:opacity-50 transition">
            {verificando ? "Verificando..." : "Entrar"}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-300 pb-5">Acesso somente leitura</p>
      </div>
    </div>
  );

  // ── Dados do contador ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐄</span>
            <div>
              <p className="text-xs font-bold text-slate-800">{dados?.nome_fazenda ?? info?.nome_fazenda}</p>
              <p className="text-[10px] text-slate-400">Acesso somente leitura</p>
            </div>
          </div>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-[10px] text-green-600 font-semibold">Receitas</p>
            <p className="text-base font-extrabold text-green-700 mt-1">{fmt(dados?.receitas_mes ?? 0)}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-[10px] text-red-500 font-semibold">Despesas</p>
            <p className="text-base font-extrabold text-red-600 mt-1">{fmt(dados?.despesas_mes ?? 0)}</p>
          </div>
          <div className={`border rounded-2xl p-4 ${(dados?.saldo_mes ?? 0) >= 0 ? "bg-slate-50 border-slate-100" : "bg-orange-50 border-orange-100"}`}>
            <p className="text-[10px] text-slate-500 font-semibold">Saldo</p>
            <p className={`text-base font-extrabold mt-1 ${(dados?.saldo_mes ?? 0) >= 0 ? "text-slate-800" : "text-orange-600"}`}>
              {fmt(dados?.saldo_mes ?? 0)}
            </p>
          </div>
        </div>

        {/* Período + exportar */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">{dados ? mesPtBR(mes) : "..."}</h2>
          <button onClick={exportar} disabled={exportando || !dados}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold disabled:opacity-50">
            {exportando ? "Gerando..." : "⬇ Exportar CSV"}
          </button>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {!dados ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dados.lancamentos.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12">Nenhum lançamento neste período.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {dados.lancamentos.map(l => (
                <div key={l.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${l.tipo === "receita" ? "bg-green-500" : "bg-red-400"}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{CAT_LABEL[l.categoria] ?? l.categoria}</p>
                      {l.descricao && <p className="text-[10px] text-slate-400">{l.descricao}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className={`text-xs font-bold ${l.tipo === "receita" ? "text-green-600" : "text-red-500"}`}>
                      {l.tipo === "receita" ? "+" : "−"} {fmtFull(l.valor)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-300 pb-4">
          Acesso fornecido por {info?.nome_fazenda} via Bovino · Somente leitura
        </p>
      </div>
    </div>
  );
}
