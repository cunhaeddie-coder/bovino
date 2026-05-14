"use client";

type Badges = {
  receita?: boolean;
  ie?: boolean;
  ibama?: boolean;
  selfie?: boolean;
  esg?: boolean;
};

type Props = {
  badges: Badges;
  negociacoes?: number;
  avaliacao?: number;
  size?: "sm" | "md";
  layout?: "row" | "column";
};

export function TrustBadges({ badges, negociacoes, avaliacao, size = "md", layout = "row" }: Props) {
  const sm = size === "sm";

  const items = [
    badges.receita && {
      icon: "✓", label: "CPF/CNPJ verificado",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    badges.ie && {
      icon: "✓", label: "IE ativa (GTA)",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    badges.ibama && {
      icon: "✓", label: "Sem embargo IBAMA",
      color: "bg-green-100 text-green-700 border-green-200",
    },
    badges.esg && {
      icon: "🌿", label: "Conformidade ESG",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
  ].filter(Boolean) as { icon: string; label: string; color: string }[];

  const cls = layout === "row"
    ? "flex flex-wrap gap-1.5"
    : "flex flex-col gap-1";

  return (
    <div className={cls}>
      {items.map(({ icon, label, color }) => (
        <span key={label} className={`inline-flex items-center gap-1 border rounded-full font-semibold ${color} ${sm ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}>
          <span>{icon}</span>
          <span>{label}</span>
        </span>
      ))}

      {(negociacoes ?? 0) > 0 && (
        <span className={`inline-flex items-center gap-1 border rounded-full font-semibold bg-blue-50 text-blue-700 border-blue-200 ${sm ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}>
          🤝 {negociacoes} {negociacoes === 1 ? "negócio" : "negócios"}
        </span>
      )}

      {avaliacao && avaliacao > 0 && (
        <span className={`inline-flex items-center gap-1 border rounded-full font-semibold bg-amber-50 text-amber-700 border-amber-200 ${sm ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"}`}>
          ⭐ {avaliacao.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// Badge único de status geral do vendedor
export function VerificadoBadge({ aprovado, size = "sm" }: { aprovado: boolean; size?: "sm" | "md" }) {
  const sm = size === "sm";
  if (!aprovado) return null;
  return (
    <span className={`inline-flex items-center gap-1 bg-green-600 text-white rounded-full font-bold ${sm ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1"}`}>
      ✓ Vendedor verificado
    </span>
  );
}
