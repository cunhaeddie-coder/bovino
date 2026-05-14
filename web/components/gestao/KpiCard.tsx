import { fmt, fmtC } from "@/lib/fmt";

type KpiCardProps = {
  icon: string;
  label: string;
  /** Número para formatação automática responsiva */
  value?: number | string | null;
  /** Texto livre (quando não é moeda — ex: contagens, pesos) */
  text?: string;
  color?: string;
  /** Se true, formata como moeda com versão compacta no mobile */
  moeda?: boolean;
};

export function KpiCard({ icon, label, value, text, color = "text-gray-800", moeda = false }: KpiCardProps) {
  const n = Number(value ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
      <p className="text-lg md:text-xl mb-1">{icon}</p>
      <p className={`font-bold text-base md:text-xl ${color}`}>
        {text ?? (moeda
          ? <>
              <span className="md:hidden">{fmtC(n)}</span>
              <span className="hidden md:inline">{fmt(n)}</span>
            </>
          : value)}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

/** Grade responsiva para KPIs — 2 colunas no mobile, N no desktop */
export function KpiGrid({ children, cols = 4, id }: { children: React.ReactNode; cols?: 2 | 3 | 4; id?: string }) {
  const colClass = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];
  return (
    <div id={id} className={`grid grid-cols-2 ${colClass} gap-3 md:gap-4`}>
      {children}
    </div>
  );
}
