"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

type Plano = {
  id: number; slug: string; nome: string; tipo: string;
  preco: number; preco_anual: number | null; max_cabecas: number | null;
  recursos: string[];
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const ELITE_FAIXAS = [
  { slug: "produtor-elite-500",   label: "até 500 cab.",    preco: 280, preco_anual: 3080 },
  { slug: "produtor-elite-1000",  label: "até 1.000 cab.",  preco: 330, preco_anual: 3630 },
  { slug: "produtor-elite-5000",  label: "até 5.000 cab.",  preco: 420, preco_anual: 4620 },
  { slug: "produtor-elite-10000", label: "até 10.000 cab.", preco: 550, preco_anual: 6050 },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

const FAIXAS_CALC = [
  { max: 300,   faixaIdx: 0, plano: "premium", label: "até 300 cab.",    preco: 150, preco_anual: 1650 },
  { max: 500,   faixaIdx: 0, plano: "elite",   label: "até 500 cab.",    preco: 280, preco_anual: 3080 },
  { max: 1000,  faixaIdx: 1, plano: "elite",   label: "até 1.000 cab.",  preco: 330, preco_anual: 3630 },
  { max: 5000,  faixaIdx: 2, plano: "elite",   label: "até 5.000 cab.",  preco: 420, preco_anual: 4620 },
  { max: 10000, faixaIdx: 3, plano: "elite",   label: "até 10.000 cab.", preco: 550, preco_anual: 6050 },
];

function CalculadoraRebanho({ onFaixaChange, onPeriodoChange, periodo }: {
  onFaixaChange: (i: number) => void;
  onPeriodoChange: (p: "mensal" | "anual") => void;
  periodo: "mensal" | "anual";
}) {
  const [cabecas, setCabecas] = useState(100);
  const [inputVal, setInputVal] = useState("100");

  const faixa = FAIXAS_CALC.find(f => cabecas <= f.max) ?? FAIXAS_CALC[FAIXAS_CALC.length - 1];
  const precoMensal = periodo === "anual" ? faixa.preco_anual / 12 : faixa.preco;
  const custoPorAnimal = (precoMensal / Math.max(cabecas, 1)).toFixed(2).replace(".", ",");

  function handleChange(val: number) {
    setCabecas(val);
    setInputVal(String(val));
    if (faixa.plano === "elite") onFaixaChange(faixa.faixaIdx);
  }

  return (
    <div className="bg-white rounded-3xl border border-green-200 shadow-md p-6 space-y-5">
      <div className="text-center">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Calculadora de Rebanho</p>
        <h2 className="text-2xl font-extrabold text-gray-900">Quantos animais você tem?</h2>
      </div>

      {/* Slider + input numérico */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-gray-400">
          <span>1</span><span>2.500</span><span>5.000</span><span>10.000</span>
        </div>
        <input
          type="range" min={1} max={10000} step={50} value={cabecas}
          onChange={e => handleChange(Number(e.target.value))}
          className="w-full accent-green-600 cursor-pointer"
        />
        <div className="flex items-center justify-center gap-3">
          <input
            type="number" min={1} max={99999} value={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1) {
                const clamped = Math.min(v, 99999);
                setCabecas(clamped);
                const novaFaixa = FAIXAS_CALC.find(f => clamped <= f.max) ?? FAIXAS_CALC[FAIXAS_CALC.length - 1];
                if (novaFaixa.plano === "elite") onFaixaChange(novaFaixa.faixaIdx);
              }
            }}
            onBlur={() => {
              const v = parseInt(inputVal, 10);
              const final = isNaN(v) || v < 1 ? 1 : Math.min(v, 99999);
              setCabecas(final);
              setInputVal(String(final));
              const novaFaixa = FAIXAS_CALC.find(f => final <= f.max) ?? FAIXAS_CALC[FAIXAS_CALC.length - 1];
              if (novaFaixa.plano === "elite") onFaixaChange(novaFaixa.faixaIdx);
            }}
            className="w-28 text-center text-3xl font-extrabold text-green-700 border-2 border-green-200 rounded-xl px-2 py-1 focus:outline-none focus:border-green-500 bg-green-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-gray-500 text-sm">cabeças</span>
        </div>
      </div>

      {/* Resultado */}
      <div className={`rounded-2xl p-4 text-center ${faixa.plano === "elite" ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
        <p className="text-xs font-semibold text-gray-500 mb-1">Plano recomendado</p>
        <p className={`text-2xl font-extrabold mb-0.5 ${faixa.plano === "elite" ? "text-amber-700" : "text-green-700"}`}>
          {faixa.plano === "elite" ? "Elite" : "Premium"} — {faixa.label}
        </p>
        <p className={`text-3xl font-extrabold ${faixa.plano === "elite" ? "text-amber-600" : "text-green-600"}`}>
          {fmt(Math.round(precoMensal))}<span className="text-base text-gray-400 font-normal">/mês</span>
        </p>
        {periodo === "anual" && (
          <p className="text-xs text-green-600 font-semibold mt-0.5">{fmt(faixa.preco_anual)}/ano · 1 mês grátis</p>
        )}
        <p className="text-xs text-gray-500 mt-1">≈ R$ {custoPorAnimal} por animal/mês</p>
      </div>

      <button
        onClick={() => {
          if (faixa.plano === "elite") onFaixaChange(faixa.faixaIdx);
          document.getElementById("planos-cards")?.scrollIntoView({ behavior: "smooth" });
        }}
        className={`w-full py-3 rounded-2xl font-bold text-sm transition ${faixa.plano === "elite" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-green-700 hover:bg-green-800 text-white"}`}
      >
        Ver detalhes do plano →
      </button>
    </div>
  );
}

export default function PlanosPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [periodo, setPeriodo] = useState<"mensal" | "anual">("mensal");
  const [eliteFaixa, setEliteFaixa] = useState(0);
  const [premiumPlano, setPremiumPlano] = useState<Plano | null>(null);
  const [recursos, setRecursos] = useState<{ premium: string[]; elite: string[] }>({ premium: [], elite: [] });

  useEffect(() => {
    fetch(`${API}/planos`)
      .then(r => r.json())
      .then((grupos: Record<string, Plano[]>) => {
        const produtores = grupos["produtor"] ?? [];
        const premium = produtores.find(p => p.slug === "produtor-premium");
        const elite   = produtores.find(p => p.slug === "produtor-elite-500");
        if (premium) setPremiumPlano(premium);
        setRecursos({
          premium: premium?.recursos ?? [],
          elite:   elite?.recursos ?? [],
        });
      })
      .catch(() => {});
  }, []);

  const faixaSel   = ELITE_FAIXAS[eliteFaixa];
  const elitePreco = periodo === "anual" ? faixaSel.preco_anual : faixaSel.preco;
  const premPreco  = periodo === "anual" && premiumPlano?.preco_anual ? premiumPlano.preco_anual : (premiumPlano?.preco ?? 150);
  const premMensal = periodo === "anual" ? Math.round((premPreco / 11)) : premPreco;
  const eliteMensal= periodo === "anual" ? Math.round((elitePreco / 11)) : elitePreco;

  function assinar(slug: string) {
    if (!user) { router.push(`/login?next=/planos/checkout?plano=${slug}&periodo=${periodo}`); return; }
    router.push(`/planos/checkout?plano=${slug}&periodo=${periodo}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Escolha seu plano</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Venda, compre e gerencie seu rebanho no maior marketplace de gado do Brasil.
        </p>

        {/* Toggle mensal/anual */}
        <div className="mt-8 inline-flex rounded-2xl bg-white/10 p-1 gap-1">
          {(["mensal", "anual"] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition ${periodo === p ? "bg-white text-green-800" : "text-white/80 hover:text-white"}`}>
              {p === "mensal" ? "Mensal" : "Anual — 1 mês grátis"}
            </button>
          ))}
        </div>
        {periodo === "anual" && (
          <p className="text-green-200 text-xs mt-2">Pague 11 meses e use por 12</p>
        )}
      </section>

      {/* Calculadora de Rebanho */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <CalculadoraRebanho onFaixaChange={setEliteFaixa} onPeriodoChange={setPeriodo} periodo={periodo} />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-16" id="planos-cards">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Card Premium */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star size={20} className="text-green-600" />
                <h2 className="text-xl font-extrabold text-gray-900">Premium</h2>
              </div>
              <p className="text-xs text-gray-500 mb-5">Até 300 cabeças de gado</p>

              <div className="mb-6">
                {periodo === "anual" ? (
                  <>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">{fmt(premMensal)}</span>
                      <span className="text-gray-400 text-sm mb-1">/mês</span>
                    </div>
                    <p className="text-sm text-green-600 font-semibold mt-0.5">{fmt(premPreco)}/ano — economize {fmt(premiumPlano?.preco ? premiumPlano.preco * 12 - premPreco : 150)}</p>
                  </>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{fmt(premPreco)}</span>
                    <span className="text-gray-400 text-sm mb-1">/mês</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {recursos.premium.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-8 pb-8">
              <button onClick={() => assinar("produtor-premium")}
                className="w-full py-3.5 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-bold text-sm transition">
                Assinar Premium
              </button>
            </div>
          </div>

          {/* Card Elite */}
          <div className="bg-white rounded-3xl border-2 border-amber-400 shadow-xl overflow-hidden flex flex-col relative">
            <div className="bg-amber-400 text-amber-900 text-xs font-extrabold text-center py-1.5 tracking-widest uppercase">
              Mais completo
            </div>
            <div className="p-8 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={20} className="text-amber-500" />
                <h2 className="text-xl font-extrabold text-gray-900">Elite</h2>
              </div>

              {/* Seletor de faixa */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tamanho do rebanho</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ELITE_FAIXAS.map((f, i) => (
                    <button key={f.slug} onClick={() => setEliteFaixa(i)}
                      className={`text-xs px-2 py-2 rounded-xl border font-semibold transition ${eliteFaixa === i ? "border-amber-400 bg-amber-50 text-amber-800" : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  Acima de 10.000 cabeças?{" "}
                  <Link href="/anunciante/interesse" className="text-amber-600 font-semibold hover:underline">Fale conosco</Link>
                </p>
              </div>

              <div className="mb-6">
                {periodo === "anual" ? (
                  <>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-gray-900">{fmt(eliteMensal)}</span>
                      <span className="text-gray-400 text-sm mb-1">/mês</span>
                    </div>
                    <p className="text-sm text-amber-600 font-semibold mt-0.5">{fmt(elitePreco)}/ano — economize {fmt(faixaSel.preco * 12 - elitePreco)}</p>
                  </>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{fmt(elitePreco)}</span>
                    <span className="text-gray-400 text-sm mb-1">/mês</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {recursos.elite.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-8 pb-8">
              <button onClick={() => assinar(faixaSel.slug)}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition">
                Assinar Elite
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 text-center text-sm text-gray-400">
          Empresa do agro?{" "}
          <Link href="/anunciante/interesse" className="text-green-700 font-semibold hover:underline">
            Anuncie sua marca para produtores rurais →
          </Link>
        </div>
      </div>
    </main>
  );
}
