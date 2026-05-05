"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Resumo = {
  total_buscas_hoje: number;
  total_buscas_mes: number;
  total_transacoes: number;
  transacoes_confirmadas: number;
  alertas_ativos: number;
  top_racas: { raca: string; buscas: number }[];
  top_estados: { estado: string; buscas: number }[];
};

type BuscaLog = {
  id: number;
  raca: string | null;
  estado: string | null;
  municipio: string | null;
  peso_min: number | null;
  peso_max: number | null;
  created_at: string;
  user?: { id: number; nome: string } | null;
};

type Transacao = {
  id: number;
  raca: string;
  estado: string;
  qtd_cabecas: number;
  valor_por_arroba: number | null;
  valor_total: number;
  confirmada_comprador: boolean;
  confirmada_vendedor: boolean;
  created_at: string;
  comprador: { nome: string };
  vendedor: { nome: string };
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold mt-1 text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

type Tab = "resumo" | "buscas" | "transacoes" | "alertas";

export default function IntelligenciaPage() {
  const [tab, setTab] = useState<Tab>("resumo");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [buscas, setBuscas] = useState<Paginated<BuscaLog> | null>(null);
  const [transacoes, setTransacoes] = useState<Paginated<Transacao> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/inteligencia/resumo").then(r => setResumo(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "buscas") api.get("/inteligencia/buscas").then(r => setBuscas(r.data));
    if (tab === "transacoes") api.get("/inteligencia/transacoes").then(r => setTransacoes(r.data));
  }, [tab]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "buscas", label: "Buscas" },
    { key: "transacoes", label: "Transações" },
    { key: "alertas", label: "Alertas ativos" },
  ];

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-extrabold text-slate-900">🧠 Inteligência de Mercado</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <>
          {loading ? (
            <p className="text-slate-400 py-10 text-center">Carregando...</p>
          ) : resumo && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard label="Buscas hoje" value={resumo.total_buscas_hoje.toLocaleString("pt-BR")} />
                <KpiCard label="Buscas no mês" value={resumo.total_buscas_mes.toLocaleString("pt-BR")} />
                <KpiCard label="Transações total" value={resumo.total_transacoes} />
                <KpiCard label="Confirmadas" value={resumo.transacoes_confirmadas} sub="por ambas as partes" />
                <KpiCard label="Alertas ativos" value={resumo.alertas_ativos} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <h2 className="text-sm font-bold text-slate-700 mb-4">Top raças buscadas (30 dias)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={resumo.top_racas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="raca" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="buscas" name="Buscas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <h2 className="text-sm font-bold text-slate-700 mb-4">Top estados (30 dias)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={resumo.top_estados} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="estado" type="category" tick={{ fontSize: 11 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="buscas" name="Buscas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "buscas" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-3 py-3">Usuário</th>
                  <th className="text-left px-3 py-3">Raça</th>
                  <th className="text-left px-3 py-3">Estado</th>
                  <th className="text-left px-3 py-3">Peso (kg)</th>
                </tr>
              </thead>
              <tbody>
                {!buscas ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
                ) : buscas.data.map(b => (
                  <tr key={b.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-xs text-slate-400">{new Date(b.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b.user?.nome ?? <span className="text-slate-300">Anônimo</span>}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{b.raca ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{b.estado ?? "—"} {b.municipio && `· ${b.municipio}`}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {b.peso_min || b.peso_max ? `${b.peso_min ?? 0} – ${b.peso_max ?? "∞"} kg` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "transacoes" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-3 py-3">Comprador</th>
                  <th className="text-left px-3 py-3">Vendedor</th>
                  <th className="text-left px-3 py-3">Raça / Estado</th>
                  <th className="text-right px-3 py-3">Cabeças</th>
                  <th className="text-right px-3 py-3">Valor total</th>
                  <th className="text-left px-3 py-3">Confirmação</th>
                </tr>
              </thead>
              <tbody>
                {!transacoes ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
                ) : transacoes.data.map(t => (
                  <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2.5 text-slate-700">{t.comprador.nome}</td>
                    <td className="px-3 py-2.5 text-slate-700">{t.vendedor.nome}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{t.raca} · {t.estado}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">{t.qtd_cabecas}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-700">{BRL(t.valor_total)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${t.confirmada_comprador ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>C</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${t.confirmada_vendedor ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>V</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "alertas" && (
        <AlertasTab />
      )}
    </div>
  );
}

function AlertasTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get("/inteligencia/alertas").then(r => setData(r.data));
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 font-semibold border-b border-slate-100">
              <th className="text-left px-5 py-3">Usuário</th>
              <th className="text-left px-3 py-3">Raça</th>
              <th className="text-left px-3 py-3">Estados</th>
              <th className="text-left px-3 py-3">Peso</th>
              <th className="text-left px-3 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400">Carregando...</td></tr>
            ) : data.data.map((a: any) => (
              <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-2.5">
                  <p className="font-medium text-slate-800">{a.user?.nome}</p>
                  <p className="text-xs text-slate-400">{a.user?.email}</p>
                </td>
                <td className="px-3 py-2.5 text-slate-700">{a.raca ?? <span className="text-slate-300">Todas</span>}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{a.estados?.join(", ") ?? "Todos"}</td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {a.peso_min || a.peso_max ? `${a.peso_min ?? 0}–${a.peso_max ?? "∞"} kg` : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
