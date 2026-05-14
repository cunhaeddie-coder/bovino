"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrustBadges } from "@/components/marketplace/TrustBadges";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type KycStatus = {
  kyc_status: string;
  status_receita: string;
  status_ie: string;
  status_ibama: string;
  status_selfie: string;
  nome_receita: string | null;
  motivo_reprovacao: string | null;
  aprovado_em: string | null;
  badges: Record<string, boolean>;
};

const STATUS_INFO: Record<string, { icon: string; label: string; cor: string }> = {
  nao_iniciado:   { icon: "⬜", label: "Não iniciado",    cor: "text-gray-400" },
  pendente:       { icon: "⏳", label: "Aguardando",       cor: "text-gray-500" },
  validando:      { icon: "🔄", label: "Verificando...",   cor: "text-blue-600" },
  aprovado:       { icon: "✅", label: "Aprovado",         cor: "text-green-600" },
  reprovado:      { icon: "❌", label: "Reprovado",        cor: "text-red-600" },
  revisao_manual: { icon: "👁️", label: "Em revisão",       cor: "text-amber-600" },
};

const CHECK_INFO: Record<string, { label: string; desc: string }> = {
  receita: { label: "CPF/CNPJ — Receita Federal", desc: "Valida situação cadastral na Receita Federal" },
  ie:      { label: "Inscrição Estadual — SINTEGRA", desc: "Confirma IE ativa e autorizada a emitir GTA" },
  ibama:   { label: "Conformidade Ambiental — IBAMA", desc: "Consulta lista de áreas embargadas" },
  selfie:  { label: "Identidade — Selfie + Documento", desc: "Validação biométrica (disponível em breve)" },
};

export default function KycPage() {
  const [status, setStatus]   = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]       = useState("");

  const [form, setForm] = useState({
    cpf_cnpj: "", tipo_documento: "cpf",
    inscricao_estadual: "", car_numero: "", estado_propriedade: "",
  });

  useEffect(() => {
    api.get("/kyc").then(r => setStatus(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Formata CPF ou CNPJ enquanto digita
  function formatDoc(raw: string, tipo: string) {
    const n = raw.replace(/\D/g, "");
    if (tipo === "cnpj") {
      return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5").slice(0, 18);
    }
    return n.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4").slice(0, 14);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setErro("");
    try {
      const r = await api.post("/kyc", form);
      setStatus(prev => prev ? { ...prev, ...r.data } : r.data);
      // Recarrega status completo
      const full = await api.get("/kyc");
      setStatus(full.data);
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao enviar dados.");
    } finally {
      setSalvando(false);
    }
  }

  const kycInfo = status ? (STATUS_INFO[status.kyc_status] ?? STATUS_INFO.pendente) : null;
  const aprovado = status?.kyc_status === "aprovado";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verificação de Vendedor</h1>
        <p className="text-gray-500 text-sm mt-1">
          Venda com segurança e ganhe o selo de vendedor verificado no marketplace
        </p>
      </div>

      {/* Status atual */}
      {!loading && status && status.kyc_status !== "nao_iniciado" && (
        <div className={`rounded-2xl border p-5 ${aprovado ? "bg-green-50 border-green-200" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{kycInfo?.icon}</span>
            <div>
              <p className={`font-bold ${kycInfo?.cor}`}>{kycInfo?.label}</p>
              {status.nome_receita && <p className="text-xs text-gray-500">{status.nome_receita}</p>}
            </div>
          </div>

          {/* Badges conquistados */}
          {aprovado && (
            <div className="mb-4">
              <TrustBadges badges={status.badges} />
            </div>
          )}

          {/* Checklist de verificações */}
          <div className="space-y-2">
            {(["receita","ie","ibama","selfie"] as const).map(chave => {
              const s = status[`status_${chave}` as keyof KycStatus] as string;
              const ok   = s === "ok";
              const fail = s === "invalido" || s === "inativo" || s === "reprovado" || s === "embargado";
              const pend = s === "nao_verificado";
              return (
                <div key={chave} className="flex items-start gap-3">
                  <span className={`text-sm mt-0.5 ${ok ? "text-green-600" : fail ? "text-red-500" : "text-gray-300"}`}>
                    {ok ? "✓" : fail ? "✕" : "○"}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${ok ? "text-gray-800" : fail ? "text-red-700" : "text-gray-400"}`}>
                      {CHECK_INFO[chave].label}
                    </p>
                    <p className="text-xs text-gray-400">{CHECK_INFO[chave].desc}</p>
                  </div>
                  {pend && <span className="ml-auto text-[10px] text-gray-400 shrink-0">pendente</span>}
                </div>
              );
            })}
          </div>

          {status.motivo_reprovacao && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs text-red-700 font-medium">⚠️ {status.motivo_reprovacao}</p>
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      {(!aprovado) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-4">
            {status?.kyc_status === "nao_iniciado" ? "Iniciar verificação" : "Atualizar dados"}
          </h2>

          {erro && <p className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2 mb-4">{erro}</p>}

          <form onSubmit={enviar} className="space-y-4">
            {/* Tipo de documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de documento *</label>
              <div className="grid grid-cols-2 gap-3">
                {(["cpf","cnpj"] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo_documento: t, cpf_cnpj: "" }))}
                    className={`py-2.5 rounded-xl border font-semibold text-sm transition ${form.tipo_documento === t ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600"}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* CPF / CNPJ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.tipo_documento === "cnpj" ? "CNPJ *" : "CPF *"}
              </label>
              <input
                required
                value={form.cpf_cnpj}
                onChange={e => setForm(f => ({ ...f, cpf_cnpj: formatDoc(e.target.value, f.tipo_documento) }))}
                placeholder={form.tipo_documento === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            {/* Dados da propriedade */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dados da propriedade</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estado (UF)</label>
                    <select
                      value={form.estado_propriedade}
                      onChange={e => setForm(f => ({ ...f, estado_propriedade: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                      <option value="">Selecione</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Inscrição Estadual (IE)</label>
                    <input
                      value={form.inscricao_estadual}
                      onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value.replace(/\D/g,"") }))}
                      placeholder="Apenas números"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CAR — Cadastro Ambiental Rural
                    <span className="text-gray-400 font-normal ml-1">(opcional — necessário para selo ESG)</span>
                  </label>
                  <input
                    value={form.car_numero}
                    onChange={e => setForm(f => ({ ...f, car_numero: e.target.value }))}
                    placeholder="Ex: MT-5100102-XXXX.XXXX.XXXX"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
              {salvando ? "Verificando..." : "Verificar e solicitar aprovação"}
            </button>
          </form>

          {/* O que acontece */}
          <div className="mt-5 bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-gray-600">O que verificamos automaticamente:</p>
            {[
              ["✓", "CPF/CNPJ na Receita Federal", "Gratuito e instantâneo"],
              ["✓", "Inscrição Estadual no SINTEGRA", "Autorização para emitir GTA"],
              ["✓", "Lista de embargos IBAMA", "Conformidade ambiental"],
              ["📸", "Selfie + documento", "Disponível em breve (integração bancária)"],
            ].map(([icon, label, desc]) => (
              <div key={label} className="flex gap-2 text-xs">
                <span className="text-green-600 font-bold shrink-0">{icon}</span>
                <span className="text-gray-700 font-medium">{label}</span>
                <span className="text-gray-400">— {desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aprovado — o que ganha */}
      {aprovado && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-bold text-green-800 mb-3">🎉 Benefícios desbloqueados</p>
          <ul className="space-y-1.5 text-sm text-green-700">
            <li>✓ Selo "Vendedor Verificado" nos seus anúncios</li>
            <li>✓ Maior confiança para compradores e frigoríficos</li>
            <li>✓ Acesso ao sistema de pagamento seguro (em breve)</li>
            {status.badges.esg && <li>🌿 Conformidade ESG — atrai compradores corporativos</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
