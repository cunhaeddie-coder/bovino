"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-lg space-y-1">
      <p className="text-gray-400 font-medium mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{fmtBRL(p.value)}</strong></p>
      ))}
      {payload.length === 2 && (
        <p className={`font-bold ${payload[0].value - payload[1].value >= 0 ? "text-green-400" : "text-red-400"}`}>
          Saldo: {fmtBRL(payload[0].value - payload[1].value)}
        </p>
      )}
    </div>
  );
}

export default function CaixaChart({ dados }: { dados: { mes: number; custos: number; receitas: number }[] }) {
  const data = dados.map(d => ({
    mes: MESES[d.mes - 1],
    Receitas: d.receitas,
    Custos: d.custos,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradCustos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={fmtBRL} width={72} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Area type="monotone" dataKey="Receitas" stroke="#16a34a" strokeWidth={2} fill="url(#gradReceitas)"
          dot={false} activeDot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }} />
        <Area type="monotone" dataKey="Custos" stroke="#dc2626" strokeWidth={2} fill="url(#gradCustos)"
          dot={false} activeDot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
