"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { DashboardStats } from "@/lib/types";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type CrescimentoItem = { dia: string; total: number };
type CrescimentoDados = {
  usuarios: CrescimentoItem[];
  receita: CrescimentoItem[];
  assinaturas: CrescimentoItem[];
};
type PlanoStat = { plano: string; tipo: string; total: number; receita: number };

const TIPO_CORES: Record<string, string> = {
  comprador: "#3b82f6",
  produtor:  "#22c55e",
  ambos:     "#f59e0b",
};
const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function KpiCard({ label, value, sub, cor }: { label: string; value: string | number; sub?: string; cor?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 ${cor ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cresc, setCresc] = useState<CrescimentoDados | null>(null);
  const [planos, setPlanos] = useState<PlanoStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/stats/dashboard"),
      api.get("/stats/crescimento"),
      api.get("/stats/assinaturas-plano"),
    ]).then(([s, c, p]) => {
      setStats(s.data);
      setCresc(c.data);
      setPlanos(p.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return null;

  const { usuarios, anuncios, financeiro, anunciantes, gestao } = stats as any;

  const variacao = financeiro.variacao_receita;
  const variacaoLabel = variacao === null ? null
    : variacao >= 0 ? `▲ ${variacao}% vs mês anterior`
    : `▼ ${Math.abs(variacao)}% vs mês anterior`;
  const variacaoCor = variacao !== null && variacao >= 0 ? "text-green-600" : "text-red-500";

  // Dados para gráfico de tipos de usuário
  const tipoData = Object.entries(usuarios.por_tipo).map(([tipo, total]) => ({
    name: tipo.charAt(0).toUpperCase() + tipo.slice(1),
    value: total as number,
  }));

  // Mescla dados de crescimento por data
  const crescData = (() => {
    if (!cresc) return [];
    const map: Record<string, { dia: string; usuarios: number; assinaturas: number }> = {};
    for (const u of cresc.usuarios) {
      map[u.dia] = { dia: u.dia.slice(5), usuarios: u.total, assinaturas: 0 };
    }
    for (const a of cresc.assinaturas) {
      if (map[a.dia]) map[a.dia].assinaturas = a.total;
      else map[a.dia] = { dia: a.dia.slice(5), usuarios: 0, assinaturas: a.total };
    }
    return Object.values(map).sort((a, b) => a.dia.localeCompare(b.dia));
  })();

  const receitaData = cresc?.receita.map((r) => ({
    dia: r.dia.slice(5),
    receita: Number(r.total),
  })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-400">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Usuários cadastrados" value={usuarios.total.toLocaleString("pt-BR")} sub={`+${usuarios.novos_hoje} hoje · +${usuarios.novos_mes} no mês`} />
        <KpiCard label="MRR" value={fmt(financeiro.mrr)} sub={variacaoLabel ?? undefined} cor="text-green-700" />
        <KpiCard label="Receita do mês" value={fmt(financeiro.receita_mes)} cor="text-green-700" />
        <KpiCard label="Assinaturas ativas" value={financeiro.assinaturas_ativas} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Anúncios ativos" value={anuncios.ativos.toLocaleString("pt-BR")} sub={`${anuncios.total.toLocaleString("pt-BR")} total`} />
        <KpiCard label="Anunciantes" value={anunciantes.total} sub={`${anunciantes.ativos} ativos`} />
        <KpiCard label="Novos este mês" value={usuarios.novos_mes} sub="usuários" />
        <KpiCard label="Usuários ativos" value={usuarios.ativos.toLocaleString("pt-BR")} sub={`de ${usuarios.total.toLocaleString("pt-BR")}`} />
      </div>

      {gestao && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="🌾 Fazendas ativas" value={gestao.fazendas} />
          <KpiCard label="🐄 Animais no rebanho" value={gestao.animais_rebanho.toLocaleString("pt-BR")} />
          <KpiCard label="📅 Visitas pendentes" value={gestao.visitas_pendentes} cor={gestao.visitas_pendentes > 0 ? "text-yellow-600" : undefined} />
          <KpiCard label="🔍 Buscas hoje" value={gestao.buscas_hoje.toLocaleString("pt-BR")} />
        </div>
      )}

      {/* Gráficos linha 1 */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Crescimento de usuários */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Crescimento — últimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={crescData}>
              <defs>
                <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="usuarios" name="Usuários" stroke="#22c55e" fill="url(#gu)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="assinaturas" name="Assinaturas" stroke="#3b82f6" fill="url(#ga)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tipos de usuário */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Usuários por tipo</h2>
          {tipoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={tipoData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {tipoData.map((entry, i) => (
                    <Cell key={i} fill={TIPO_CORES[entry.name.toLowerCase()] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center mt-10">Sem dados</p>
          )}
        </div>
      </div>

      {/* Gráficos linha 2 */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Receita diária */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Receita diária — últimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={receitaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v) => (typeof v === "number" ? fmt(v) : v)} />
              <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Assinaturas por plano */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Assinaturas por plano</h2>
          {planos.length > 0 ? (
            <div className="space-y-2.5 mt-2">
              {planos.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate">{p.plano}</span>
                      <span className="text-slate-500 shrink-0 ml-2">{p.total} · {fmt(p.receita)}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((p.total / planos.reduce((acc, x) => acc + x.total, 0)) * 100)}%`,
                          background: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center mt-10">Nenhuma assinatura ativa</p>
          )}
        </div>
      </div>
    </div>
  );
}
