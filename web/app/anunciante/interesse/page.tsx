"use client";

import { useState } from "react";
import Link from "next/link";

const SEGMENTOS = [
  "Veterinária / Saúde animal",
  "Nutrição e suplementação animal",
  "Máquinas e equipamentos agrícolas",
  "Genética e reprodução",
  "Cooperativa / Associação",
  "Indústria frigorífica",
  "Insumos e defensivos",
  "Financiamento e crédito rural",
  "Transporte e logística",
  "Outro",
];

const ALCANCES = [
  { value: "regional", label: "Regional (até 2 estados)" },
  { value: "nacional", label: "Nacional (todos os estados)" },
  { value: "indeciso", label: "Ainda não sei" },
];

export default function AnuncianteInteressePage() {
  const [form, setForm] = useState({
    empresa: "",
    responsavel: "",
    celular: "",
    email: "",
    segmento: "",
    alcance: "",
    mensagem: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simula envio — em produção integraria com e-mail/CRM
    await new Promise((r) => setTimeout(r, 1000));
    setEnviado(true);
    setLoading(false);
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-6 py-4">
          <Link href="/" className="text-2xl font-extrabold text-green-700">Bovino</Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              🤝
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Recebemos seu contato!</h1>
            <p className="text-gray-500 mb-2">
              Nossa equipe comercial vai analisar sua solicitação e entrar em contato em até <strong>1 dia útil</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Enquanto isso, fique à vontade para explorar a plataforma.
            </p>
            <Link href="/" className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-full transition">
              Voltar ao início
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-2xl font-extrabold text-green-700">Bovino</Link>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-sm">Anuncie para o agro</span>
      </header>

      <main className="flex-1 px-4 py-12">
        <div className="max-w-2xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-10">
            <span className="inline-block bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
              Empresas do agro
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Leve sua marca a milhares de produtores
            </h1>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto text-sm leading-relaxed">
              Preencha o formulário abaixo e nosso time comercial prepara uma proposta personalizada com o alcance e o formato ideal para sua empresa.
            </p>
          </div>

          {/* Destaques */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: "📍", titulo: "Segmentação geográfica", desc: "Regional ou nacional" },
              { icon: "📊", titulo: "Relatórios detalhados", desc: "Impressões e cliques em tempo real" },
              { icon: "🤝", titulo: "Gerente dedicado", desc: "Suporte comercial exclusivo" },
            ].map((item) => (
              <div key={item.titulo} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs font-bold text-gray-800">{item.titulo}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Dados para contato</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da empresa *</label>
                  <input
                    required value={form.empresa}
                    onChange={(e) => set("empresa", e.target.value)}
                    placeholder="Agropecuária Ltda"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Responsável *</label>
                  <input
                    required value={form.responsavel}
                    onChange={(e) => set("responsavel", e.target.value)}
                    placeholder="João da Silva"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Celular / WhatsApp *</label>
                  <input
                    required value={form.celular}
                    onChange={(e) => set("celular", e.target.value)}
                    placeholder="(11) 91234-5678"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail corporativo *</label>
                  <input
                    required type="email" value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Segmento *</label>
                  <select
                    required value={form.segmento}
                    onChange={(e) => set("segmento", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Selecione</option>
                    {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Alcance desejado *</label>
                  <select
                    required value={form.alcance}
                    onChange={(e) => set("alcance", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Selecione</option>
                    {ALCANCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mensagem (opcional)</label>
                  <textarea
                    value={form.mensagem}
                    onChange={(e) => set("mensagem", e.target.value)}
                    rows={3}
                    placeholder="Conte um pouco sobre o que sua empresa oferece e o objetivo da campanha..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-extrabold py-4 rounded-full transition disabled:opacity-60 text-base mt-2"
              >
                {loading ? "Enviando..." : "Solicitar proposta comercial →"}
              </button>

              <p className="text-center text-xs text-gray-400">
                Retornamos em até 1 dia útil por WhatsApp ou e-mail.
              </p>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
