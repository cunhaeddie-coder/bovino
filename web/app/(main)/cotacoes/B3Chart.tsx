"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { B3Ponto } from "./page";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtData = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-blue-300">{fmtBRL(payload[0].value)} /@</p>
    </div>
  );
}

export default function B3Chart({ dados }: { dados: B3Ponto[] }) {
  const precos = dados.map(d => d.preco_arroba);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const pad = (max - min) * 0.08 || 5;

  const data = dados.map(d => ({
    data: fmtData(d.referencia_em),
    preco: d.preco_arroba,
  }));

  // Show fewer X-axis ticks when there are many points
  const tickInterval = data.length > 60 ? Math.floor(data.length / 8)
    : data.length > 20 ? Math.floor(data.length / 6)
    : 0;

  return (
    <div className="px-2 pb-2">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="b3grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="data"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(v)
            }
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="preco"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#b3grad)"
            dot={data.length <= 10 ? { r: 3, fill: "#2563eb", strokeWidth: 0 } : false}
            activeDot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
