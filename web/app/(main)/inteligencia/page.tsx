"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getMe, type User } from "@/lib/auth";

type CotacaoRealizada = {
  raca: string;
  estado: string;
  media_arroba: number;
  negociacoes: number;
  cabecas: number;
};

type DemandaRegiao = {
  estado: string;
  raca: string;
  buscas: number;
};

type MatchLote = {
  lote: { id: number; nome: string; raca: string; qtd_cabecas: number; categoria: string };
  buscas: number;
};

type OfertaRegiao = {
  estado: string;
  raca: string;
  anuncios: number;
  cabecas: number;
};

type Oportunidade = {
  id: number;
  titulo: string;
  preco_unitario: number;
  raca: string;
  estado: string;
  municipio: string;
  quantidade: number;
  peso_estimado: number;
  created_at: string;
};

const ESTADOS_BR: Record<string, string> = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará",
  DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão",
  MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará",
  PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul",
  SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins",
};

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function IntelligenciaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [cotacoes, setCotacoes] = useState<CotacaoRealizada[]>([]);
  const [demanda, setDemanda] = useState<DemandaRegiao[]>([]);
  const [matches, setMatches] = useState<MatchLote[]>([]);
  const [oferta, setOferta] = useState<OfertaRegiao[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRaca, setFiltroRaca] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const isComprador = user?.tipo === "comprador";

  async function carregar(u: User | null) {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroRaca) params.set("raca", filtroRaca);
    if (filtroEstado) params.set("estado", filtroEstado);
    const qs = params.toString();

    const tipo = u?.tipo ?? user?.tipo;

    if (tipo === "comprador") {
      await Promise.all([
        api.get(`/inteligencia/cotacoes?${qs}`).then(r => setCotacoes(r.data)).catch(() => {}),
        api.get(`/inteligencia/oferta-regioes?${qs}`).then(r => setOferta(r.data)).catch(() => {}),
        api.get(`/inteligencia/oportunidades?${qs}`).then(r => setOportunidades(r.data)).catch(() => {}),
      ]);
    } else {
      await Promise.all([
        api.get(`/inteligencia/cotacoes?${qs}`).then(r => setCotacoes(r.data)).catch(() => {}),
        api.get(`/inteligencia/demanda?${qs}`).then(r => setDemanda(r.data)).catch(() => {}),
        api.get("/inteligencia/match-lotes").then(r => setMatches(r.data)).catch(() => {}),
      ]);
    }
    setLoading(false);
  }

  useEffect(() => {
    getMe().then(u => { setUser(u); carregar(u); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) carregar(user);
  }, [filtroRaca, filtroEstado]);

  const racas = [...new Set([
    ...cotacoes.map(c => c.raca),
    ...demanda.map(d => d.raca),
    ...oferta.map(o => o.raca),
  ])].filter(Boolean);

  if (isComprador) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Inteligência de Mercado</h1>
          <p className="text-gray-500 text-sm mt-0.5">Onde comprar, a que preço, e as melhores oportunidades do momento</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <input value={filtroRaca} onChange={e => setFiltroRaca(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" placeholder="Filtrar por raça" list="racas-list" />
          <datalist id="racas-list">{racas.map(r => <option key={r} value={r} />)}</datalist>

          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">Todos os estados</option>
            {Object.entries(ESTADOS_BR).map(([uf, nome]) => (
              <option key={uf} value={uf}>{nome}</option>
            ))}
          </select>

          {(filtroRaca || filtroEstado) && (
            <button onClick={() => { setFiltroRaca(""); setFiltroEstado(""); }} className="text-sm text-gray-500 hover:text-red-500">
              Limpar filtros ×
            </button>
          )}
        </div>

        {/* Oportunidades */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-bold text-amber-800 mb-1">🔥 Oportunidades com negociação aberta</h2>
          <p className="text-xs text-amber-600 mb-4">Anúncios com menor preço que aceitam proposta</p>

          {loading ? (
            <p className="text-amber-700 text-sm text-center py-6">Carregando...</p>
          ) : oportunidades.length === 0 ? (
            <p className="text-sm text-amber-700 text-center py-6">Nenhum anúncio com negociação disponível agora</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {oportunidades.map(op => (
                <Link key={op.id} href={`/anuncios/${op.id}`}
                  className="bg-white rounded-xl border border-amber-100 p-3 hover:border-amber-300 transition block">
                  <p className="font-semibold text-gray-800 text-sm truncate">{op.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{op.raca} · {ESTADOS_BR[op.estado] ?? op.estado}</p>
                  {op.municipio && <p className="text-xs text-gray-400">{op.municipio}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-green-700 font-bold">{BRL(op.preco_unitario)}<span className="text-xs text-gray-400 font-normal">/cab</span></span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{op.quantidade} cab</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/busca" className="text-sm text-amber-700 font-semibold hover:underline">
              Ver todos os anúncios →
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Onde tem oferta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-1">🗺️ Onde tem oferta</h2>
            <p className="text-xs text-gray-400 mb-4">Regiões com mais animais disponíveis para venda agora</p>

            {loading ? (
              <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
            ) : oferta.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Ainda sem dados de oferta</p>
                <p className="text-gray-300 text-xs mt-1">Aparece conforme anúncios são publicados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {oferta.slice(0, 10).map((o, i) => {
                  const max = oferta[0]?.anuncios ?? 1;
                  const pct = (o.anuncios / max) * 100;
                  return (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">{ESTADOS_BR[o.estado] ?? o.estado} — {o.raca}</span>
                        <span className="text-xs text-gray-500 font-semibold">{o.anuncios} anúncios · {o.cabecas} cab</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preços de mercado */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-1">💰 Preços pagos por raça/estado</h2>
            <p className="text-xs text-gray-400 mb-4">Média das transações confirmadas nos últimos 30 dias</p>

            {loading ? (
              <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
            ) : cotacoes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Ainda sem dados de transações</p>
                <p className="text-gray-300 text-xs mt-1">Dados gerados conforme negociações são confirmadas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cotacoes.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{c.raca}</p>
                      <p className="text-xs text-gray-400">{ESTADOS_BR[c.estado] ?? c.estado} · {c.negociacoes} negociação(ões)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">{BRL(c.media_arroba)}<span className="text-xs text-gray-400">/@</span></p>
                      <p className="text-xs text-gray-400">{c.cabecas} cab.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VISÃO PRODUTOR ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Inteligência de Mercado</h1>
        <p className="text-gray-500 text-sm mt-0.5">Cotações realizadas, demanda por região e alertas para seus lotes</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input value={filtroRaca} onChange={e => setFiltroRaca(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" placeholder="Filtrar por raça" list="racas-list" />
        <datalist id="racas-list">{racas.map(r => <option key={r} value={r} />)}</datalist>

        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
          <option value="">Todos os estados</option>
          {Object.entries(ESTADOS_BR).map(([uf, nome]) => (
            <option key={uf} value={uf}>{nome}</option>
          ))}
        </select>

        {(filtroRaca || filtroEstado) && (
          <button onClick={() => { setFiltroRaca(""); setFiltroEstado(""); }} className="text-sm text-gray-500 hover:text-red-500">
            Limpar filtros ×
          </button>
        )}
      </div>

      {/* Match com lotes do produtor */}
      {matches.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h2 className="font-bold text-green-800 mb-3">🎯 Compradores buscando seus lotes esta semana</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map(m => (
              <div key={m.lote.id} className="bg-white rounded-xl border border-green-100 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{m.lote.nome}</p>
                  <p className="text-xs text-gray-400">{m.lote.raca} · {m.lote.qtd_cabecas} cab.</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                  {m.buscas} buscas
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cotações realizadas */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1">💰 Preços pagos por raça/estado</h2>
          <p className="text-xs text-gray-400 mb-4">Média das transações confirmadas nos últimos 30 dias</p>

          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
          ) : cotacoes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Ainda sem dados de transações</p>
              <p className="text-gray-300 text-xs mt-1">Os dados aparecem à medida que negociações são confirmadas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cotacoes.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.raca}</p>
                    <p className="text-xs text-gray-400">{ESTADOS_BR[c.estado] ?? c.estado} · {c.negociacoes} negociação(ões)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">{BRL(c.media_arroba)}<span className="text-xs text-gray-400">/@</span></p>
                    <p className="text-xs text-gray-400">{c.cabecas} cab.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demanda por região */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1">🗺️ Onde estão os compradores</h2>
          <p className="text-xs text-gray-400 mb-4">Buscas realizadas por raça e estado nos últimos 30 dias</p>

          {loading ? (
            <p className="text-gray-400 text-sm text-center py-8">Carregando...</p>
          ) : demanda.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Ainda sem dados de demanda</p>
              <p className="text-gray-300 text-xs mt-1">Dados gerados automaticamente com as buscas na plataforma</p>
            </div>
          ) : (
            <div className="space-y-2">
              {demanda.slice(0, 10).map((d, i) => {
                const max = demanda[0]?.buscas ?? 1;
                const pct = (d.buscas / max) * 100;
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800">{ESTADOS_BR[d.estado] ?? d.estado} — {d.raca}</span>
                      <span className="text-xs text-gray-500 font-semibold">{d.buscas} buscas</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertas de demanda do usuário */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">🔔 Meus alertas de demanda</h2>
            <p className="text-xs text-gray-400 mt-0.5">Receba uma notificação quando um comprador buscar seu perfil de animal</p>
          </div>
          <Link href="/inteligencia/alertas" className="text-sm text-green-700 font-semibold hover:underline">
            Gerenciar →
          </Link>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">Configure alertas para saber quando compradores buscam raça, peso e região do seu rebanho.</p>
          <Link href="/inteligencia/alertas"
            className="mt-3 inline-block border border-green-700 text-green-700 text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-50 transition">
            + Criar alerta
          </Link>
        </div>
      </div>
    </div>
  );
}
