"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type Animal = {
  id: number; brinco: string | null; nome: string | null; raca: string;
  sexo: "macho" | "femea"; categoria: string; status_leiteiro: "em_lactacao" | "seca" | null;
  data_nascimento: string | null; peso_atual: number | null; status: string; mae: string | null;
  pastagem?: { nome: string } | null;
};
type CatStat   = { categoria: string; total: number; peso_medio: number | null };
type Natimorto = { id: number; animal: Animal; data_evento: string; observacao: string | null; peso_bezerro: number | null };
type BaixoPeso = Animal & { benchmark: number };
type Dashboard = {
  total: number; machos: number; femeas: number; peso_medio: number;
  por_categoria: CatStat[]; por_idade: Record<string, number>;
  nascimentos_mes: number; mortes_mes: number; prenhas: number;
  alertas: { desmama: Animal[]; vaca_sem_cria: Animal[]; natimortos: Natimorto[]; baixo_peso: BaixoPeso[] };
};

const CATEGORIAS = ["bezerro","bezerra","novilho","novilha","touro","vaca","boi"];
const CAT_LABEL: Record<string,string> = { bezerro:"Bezerro",bezerra:"Bezerra",novilho:"Novilho",novilha:"Novilha",touro:"Touro",vaca:"Vaca",boi:"Boi" };
const CAT_COR:   Record<string,string> = { vaca:"bg-pink-400",novilha:"bg-pink-300",bezerra:"bg-pink-200",touro:"bg-blue-500",boi:"bg-blue-400",novilho:"bg-blue-300",bezerro:"bg-blue-200" };

function idadeTexto(d: string | null) {
  if (!d) return "—";
  const m = Math.floor((Date.now() - new Date(d).getTime()) / (1000*60*60*24*30.44));
  if (m < 12) return `${m}m`;
  const a = Math.floor(m/12), r = m%12;
  return r > 0 ? `${a}a ${r}m` : `${a}a`;
}

function Barra({ v, max, cor }: { v:number; max:number; cor:string }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${max>0?Math.max(4,Math.round(v/max*100)):0}%` }} />
    </div>
  );
}

function KPI({ label, valor, icon, cor="text-gray-900", small=false }:
  { label:string; valor:string|number; icon:string; cor?:string; small?:boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs">{icon} {label}</div>
      <p className={`font-extrabold ${cor} ${small?"text-xl":"text-2xl"}`}>{valor}</p>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-gray-100 rounded-2xl h-20 animate-pulse"/>)}</div>;
}

function Campo({ label, value, onChange, type="text", placeholder, required }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; required?:boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
    </div>
  );
}

function SecaoAlerta<T>({ titulo, subtitulo, icone, cor, itens, vazio, renderItem }:{
  titulo:string; subtitulo:string; icone:string; cor:string;
  itens:T[]; vazio:string; renderItem:(i:T)=>React.ReactNode;
}) {
  const bg: Record<string,string> = { amber:"border-amber-200 bg-amber-50", orange:"border-orange-200 bg-orange-50", red:"border-red-200 bg-red-50" };
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bg[cor]??"border-gray-200 bg-gray-50"}`}>
      <div>
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          {icone} {titulo}
          {itens.length>0 && <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border">{itens.length}</span>}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>
      </div>
      {itens.length===0
        ? <p className="text-xs text-gray-400 italic">{vazio}</p>
        : <div className="space-y-2">{itens.map(renderItem)}</div>
      }
    </div>
  );
}

const FORM_VAZIO = { brinco:"", nome:"", raca:"", sexo:"macho", categoria:"bezerro", status_leiteiro:"", data_nascimento:"", peso_atual:"", mae:"", pai:"", observacao:"" };

export default function AnimaisPage() {
  const [aba, setAba] = useState<"dashboard"|"rebanho"|"alertas">("dashboard");
  const [dash, setDash]         = useState<Dashboard|null>(null);
  const [animais, setAnimais]   = useState<Animal[]>([]);
  const [loadDash, setLoadDash] = useState(true);
  const [loadList, setLoadList] = useState(false);
  const [filtro, setFiltro]     = useState({
    categoria:"", sexo:"", status:"ativo",
    raca:"", brinco:"", faixa_etaria:"", peso_min:"", peso_max:"", status_leiteiro:"",
  });
  const [showForm, setShowForm]   = useState(false);
  const [showGrupo, setShowGrupo] = useState(false);
  const [editando, setEditando]   = useState<Animal|null>(null);
  const [form, setForm]         = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");
  const [totalResultados, setTotalResultados] = useState<number|null>(null);

  const carregarDash = useCallback(() => {
    setLoadDash(true);
    api.get("/gestao/rebanho/dashboard").then(r=>setDash(r.data)).catch(()=>{}).finally(()=>setLoadDash(false));
  }, []);

  const carregarLista = useCallback(() => {
    setLoadList(true);
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filtro).filter(([,v])=>v)));
    api.get(`/gestao/rebanho?${p}`)
      .then(r => { setAnimais(r.data.data??r.data); setTotalResultados(r.data.total??null); })
      .finally(()=>setLoadList(false));
  }, [filtro]);

  useEffect(() => { carregarDash(); }, [carregarDash]);
  useEffect(() => { if (aba==="rebanho"||aba==="alertas") carregarLista(); }, [aba, filtro, carregarLista]);

  function abrirEdicao(a: Animal) {
    setEditando(a);
    setForm({
      brinco: a.brinco??"", nome: a.nome??"", raca: a.raca, sexo: a.sexo,
      categoria: a.categoria, status_leiteiro: a.status_leiteiro ?? "",
      data_nascimento: a.data_nascimento??"",
      peso_atual: a.peso_atual ? String(a.peso_atual) : "",
      mae: a.mae??"", pai: "", observacao: "",
    });
    setErro("");
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false); setEditando(null); setForm(FORM_VAZIO); setErro("");
  }

  function limparFiltros() {
    setFiltro({ categoria:"", sexo:"", status:"ativo", raca:"", brinco:"", faixa_etaria:"", peso_min:"", peso_max:"", status_leiteiro:"" });
  }

  const filtrosAtivos = Object.entries(filtro).filter(([k,v]) => v && !(k==="status" && v==="ativo")).length;

  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(""); setSalvando(true);
    try {
      if (editando) {
        await api.put(`/gestao/rebanho/${editando.id}`, form);
      } else {
        await api.post("/gestao/rebanho", form);
      }
      fecharForm();
      carregarDash(); carregarLista();
    } catch { setErro("Erro ao salvar. Verifique os dados."); }
    finally { setSalvando(false); }
  }

  const totalAlertas = dash
    ? dash.alertas.desmama.length + dash.alertas.vaca_sem_cria.length + dash.alertas.natimortos.length + dash.alertas.baixo_peso.length
    : 0;
  const maxCat   = dash ? Math.max(...dash.por_categoria.map(c=>c.total), 1) : 1;
  const maxIdade = dash ? Math.max(...Object.values(dash.por_idade), 1) : 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-base md:text-xl font-bold text-gray-900">Rebanho</h1>
        <div className="flex gap-2">
          <button onClick={()=>setShowGrupo(true)}
            className="bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-amber-700 transition">
            + Adicionar grupo
          </button>
          <button onClick={()=>setShowForm(true)}
            className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
            + Animal individual
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([ ["dashboard","Visão geral"], ["rebanho","Rebanho"], ["alertas", totalAlertas>0?`Alertas (${totalAlertas})`:"Alertas"] ] as const).map(([id,label])=>(
          <button key={id} onClick={()=>setAba(id)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${aba===id?"bg-white text-gray-900 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ──────────────────────────────────────────────────────── */}
      {aba==="dashboard" && (loadDash ? <Skeleton/> : dash ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="Total ativos" valor={dash.total} icon="🐄"/>
            <KPI label="Machos" valor={dash.machos} icon="♂" cor="text-blue-600"/>
            <KPI label="Fêmeas" valor={dash.femeas} icon="♀" cor="text-pink-500"/>
            <KPI label="Peso médio" valor={dash.peso_medio>0?`${dash.peso_medio} kg`:"—"} icon="⚖️"/>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPI label="Nascimentos/mês" valor={dash.nascimentos_mes} icon="🐣" cor="text-green-600" small/>
            <KPI label="Mortes/mês" valor={dash.mortes_mes} icon="💀" cor={dash.mortes_mes>0?"text-red-500":"text-gray-400"} small/>
            <KPI label="Prenhas (90d)" valor={dash.prenhas} icon="🤰" cor="text-purple-500" small/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Por categoria */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">Por categoria</h3>
              {dash.por_categoria.length===0
                ? <p className="text-xs text-gray-400 text-center py-4">Nenhum dado</p>
                : dash.por_categoria.map(c=>(
                  <div key={c.categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{CAT_LABEL[c.categoria]??c.categoria}</span>
                      <span className="text-gray-400">{c.total} cab{c.peso_medio?` · ${c.peso_medio}kg`:""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Barra v={c.total} max={maxCat} cor={CAT_COR[c.categoria]??"bg-gray-300"}/>
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Por faixa etária */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">Por faixa etária</h3>
              {([
                ["ate_6m","Até 6 meses","bg-yellow-300"],
                ["6_12m","6 – 12 meses","bg-yellow-400"],
                ["12_24m","12 – 24 meses","bg-orange-400"],
                ["acima_24m","Acima de 2 anos","bg-green-500"],
                ["sem_data","Sem data nasc.","bg-gray-300"],
              ] as const).map(([key,label,cor])=>(
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-400">{dash.por_idade[key]??0}</span>
                  </div>
                  <Barra v={dash.por_idade[key]??0} max={maxIdade} cor={cor}/>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo de alertas */}
          {totalAlertas>0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-800">⚠️ {totalAlertas} alerta{totalAlertas!==1?"s":""} requerem atenção</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {dash.alertas.desmama.length>0 && (
                  <button onClick={()=>setAba("alertas")} className="bg-white rounded-xl p-3 text-left border border-amber-200 hover:border-amber-400 transition-colors">
                    <p className="text-lg font-bold text-amber-700">{dash.alertas.desmama.length}</p>
                    <p className="text-xs text-amber-600">Para desmama</p>
                  </button>
                )}
                {dash.alertas.vaca_sem_cria.length>0 && (
                  <button onClick={()=>setAba("alertas")} className="bg-white rounded-xl p-3 text-left border border-amber-200 hover:border-amber-400 transition-colors">
                    <p className="text-lg font-bold text-amber-700">{dash.alertas.vaca_sem_cria.length}</p>
                    <p className="text-xs text-amber-600">Vacas sem cria</p>
                  </button>
                )}
                {dash.alertas.natimortos.length>0 && (
                  <button onClick={()=>setAba("alertas")} className="bg-white rounded-xl p-3 text-left border border-red-200 hover:border-red-400 transition-colors">
                    <p className="text-lg font-bold text-red-600">{dash.alertas.natimortos.length}</p>
                    <p className="text-xs text-red-500">Natimortos (30d)</p>
                  </button>
                )}
                {dash.alertas.baixo_peso.length>0 && (
                  <button onClick={()=>setAba("alertas")} className="bg-white rounded-xl p-3 text-left border border-amber-200 hover:border-amber-400 transition-colors">
                    <p className="text-lg font-bold text-amber-700">{dash.alertas.baixo_peso.length}</p>
                    <p className="text-xs text-amber-600">Baixo peso</p>
                  </button>
                )}
              </div>
            </div>
          ) : dash.total>0 ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-700">Rebanho sem alertas</p>
                <p className="text-xs text-green-600">Nenhuma situação crítica identificada.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null)}

      {/* ── REBANHO ────────────────────────────────────────────────────────── */}
      {aba==="rebanho" && (
        <div className="space-y-3">
          {/* Filtros avançados */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pesquisar</span>
              {filtrosAtivos > 0 && (
                <button onClick={limparFiltros} className="text-xs text-red-500 hover:underline">
                  Limpar filtros ({filtrosAtivos})
                </button>
              )}
            </div>

            {/* Linha 1: busca rápida */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <input value={filtro.brinco} onChange={e=>setFiltro(f=>({...f,brinco:e.target.value}))}
                placeholder="Brinco" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <input value={filtro.raca} onChange={e=>setFiltro(f=>({...f,raca:e.target.value}))}
                placeholder="Raça (ex: Nelore)" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              <select value={filtro.categoria} onChange={e=>setFiltro(f=>({...f,categoria:e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Todas categorias</option>
                {CATEGORIAS.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}
              </select>
            </div>

            {/* Linha 2: filtros adicionais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={filtro.sexo} onChange={e=>setFiltro(f=>({...f,sexo:e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Ambos sexos</option>
                <option value="macho">Machos</option>
                <option value="femea">Fêmeas</option>
              </select>
              <select value={filtro.faixa_etaria} onChange={e=>setFiltro(f=>({...f,faixa_etaria:e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Qualquer idade</option>
                <option value="ate_6m">Até 6 meses</option>
                <option value="6_12m">6 – 12 meses</option>
                <option value="12_24m">12 – 24 meses</option>
                <option value="acima_24m">Acima de 2 anos</option>
              </select>
              <div className="flex gap-1">
                <input type="number" value={filtro.peso_min} onChange={e=>setFiltro(f=>({...f,peso_min:e.target.value}))}
                  placeholder="Peso mín" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                <input type="number" value={filtro.peso_max} onChange={e=>setFiltro(f=>({...f,peso_max:e.target.value}))}
                  placeholder="Máx" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
              </div>
              <select value={filtro.status} onChange={e=>setFiltro(f=>({...f,status:e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="ativo">Ativos</option>
                <option value="vendido">Vendidos</option>
                <option value="morto">Mortos</option>
                <option value="transferido">Transferidos</option>
                <option value="">Todos status</option>
              </select>
              <select value={filtro.status_leiteiro} onChange={e=>setFiltro(f=>({...f,status_leiteiro:e.target.value}))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">🐄 Todas as vacas</option>
                <option value="em_lactacao">🥛 Em lactação</option>
                <option value="seca">💤 Em descanso</option>
              </select>
            </div>

            {totalResultados !== null && (
              <p className="text-xs text-gray-400">{totalResultados} animal{totalResultados!==1?"is":""} encontrado{totalResultados!==1?"s":""}</p>
            )}
          </div>
          {loadList ? <Skeleton/> : animais.length===0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-4xl mb-2">🐄</p>
              <p className="text-gray-500">Nenhum animal encontrado</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Brinco / Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Raça</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Categoria</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Idade</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Peso</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Pastagem</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-500 w-10"/>
                    </tr>
                  </thead>
                  <tbody>
                    {animais.map(a=>(
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{a.brinco||"—"}</p>
                          {a.nome && <p className="text-xs text-gray-400">{a.nome}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.raca}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.sexo==="femea"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>
                              {CAT_LABEL[a.categoria]??a.categoria}
                            </span>
                            {a.status_leiteiro === "em_lactacao" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">🥛 Ativa</span>
                            )}
                            {a.status_leiteiro === "seca" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">💤 Seca</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{idadeTexto(a.data_nascimento)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {a.peso_atual ? (
                            <span className="text-gray-700 text-sm">{a.peso_atual} kg</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{a.pastagem?.nome??"—"}</td>
                        <td className="px-3 py-3">
                          <button onClick={()=>abrirEdicao(a)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALERTAS ────────────────────────────────────────────────────────── */}
      {aba==="alertas" && (
        <div className="space-y-5">
          {!dash ? <Skeleton/> : <>
            <SecaoAlerta titulo="Prontos para desmama" subtitulo="Bezerros/bezeras de 6 a 8 meses — momento ideal para separação"
              icone="🍼" cor="amber" itens={dash.alertas.desmama}
              vazio="Nenhum bezerro na faixa de desmama no momento."
              renderItem={(a:Animal)=>(
                <div key={a.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-100">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm">{a.sexo==="femea"?"♀":"♂"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.brinco??"Sem brinco"}{a.nome?` — ${a.nome}`:""}</p>
                    <p className="text-xs text-gray-500">{a.raca} · {idadeTexto(a.data_nascimento)} · {a.peso_atual?`${a.peso_atual} kg`:"sem peso"}{a.mae?` · Mãe: ${a.mae}`:""}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg shrink-0">Desmamar</span>
                </div>
              )}
            />

            <SecaoAlerta titulo="Vacas sem cria no último ano" subtitulo="Vacas ativas sem parto registrado nos últimos 12 meses"
              icone="🐄" cor="orange" itens={dash.alertas.vaca_sem_cria}
              vazio="Todas as vacas tiveram cria no último ano."
              renderItem={(a:Animal)=>(
                <div key={a.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-orange-100">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm">♀</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.brinco??"Sem brinco"}{a.nome?` — ${a.nome}`:""}</p>
                    <p className="text-xs text-gray-500">{a.raca} · {idadeTexto(a.data_nascimento)} · {a.peso_atual?`${a.peso_atual} kg`:"sem peso"}</p>
                  </div>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg shrink-0">Avaliar</span>
                </div>
              )}
            />

            <SecaoAlerta titulo="Natimortos recentes" subtitulo="Partos com óbito registrados nos últimos 30 dias"
              icone="💔" cor="red" itens={dash.alertas.natimortos}
              vazio="Nenhum natimorto registrado nos últimos 30 dias."
              renderItem={(n:Natimorto)=>(
                <div key={n.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-100">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm">💔</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Mãe: {n.animal?.brinco??"—"}{n.animal?.nome?` (${n.animal.nome})`:""}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(n.data_evento).toLocaleDateString("pt-BR")}
                      {n.peso_bezerro?` · Peso: ${n.peso_bezerro} kg`:""}
                      {n.observacao?` · ${n.observacao}`:""}
                    </p>
                  </div>
                </div>
              )}
            />

            <SecaoAlerta titulo="Baixo peso para a categoria" subtitulo="Animais abaixo do peso mínimo esperado para a faixa"
              icone="⚖️" cor="amber" itens={dash.alertas.baixo_peso}
              vazio="Nenhum animal com peso abaixo do esperado."
              renderItem={(a:BaixoPeso)=>(
                <div key={a.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-100">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm">{a.sexo==="femea"?"♀":"♂"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{a.brinco??"Sem brinco"}{a.nome?` — ${a.nome}`:""} <span className="text-xs font-normal text-gray-400">({CAT_LABEL[a.categoria]})</span></p>
                    <p className="text-xs text-gray-500">{a.raca} · {idadeTexto(a.data_nascimento)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-500">{a.peso_atual} kg</p>
                    <p className="text-xs text-gray-400">mín. {a.benchmark} kg</p>
                  </div>
                </div>
              )}
            />

            {totalAlertas===0 && (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-2">✅</p>
                <p className="text-gray-600 font-semibold">Nenhum alerta no momento</p>
                <p className="text-gray-400 text-sm mt-1">O rebanho está dentro dos parâmetros normais.</p>
              </div>
            )}
          </>}
        </div>
      )}

      {/* ── Modal: cadastro ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {editando ? `Editar — ${editando.brinco ?? editando.nome ?? "Animal"}` : "Novo animal"}
                </h2>
                <button onClick={fecharForm} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{erro}</p>}
              <form onSubmit={salvar} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Brinco" value={form.brinco} onChange={v=>setForm(f=>({...f,brinco:v}))} placeholder="A001"/>
                  <Campo label="Nome" value={form.nome} onChange={v=>setForm(f=>({...f,nome:v}))} placeholder="Opcional"/>
                  <Campo label="Raça *" value={form.raca} onChange={v=>setForm(f=>({...f,raca:v}))} placeholder="Nelore" required/>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Sexo *</label>
                    <select required value={form.sexo} onChange={e=>setForm(f=>({...f,sexo:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="macho">Macho</option>
                      <option value="femea">Fêmea</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                    <select required value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      {CATEGORIAS.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                    </select>
                  </div>
                  <Campo label="Peso atual (kg)" value={form.peso_atual} onChange={v=>setForm(f=>({...f,peso_atual:v}))} type="number" placeholder="280"/>
                  {form.categoria === "vaca" && (
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Status leiteiro</label>
                      <select value={form.status_leiteiro} onChange={e=>setForm(f=>({...f,status_leiteiro:e.target.value}))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option value="">Vaca de corte (não leiteira)</option>
                        <option value="em_lactacao">🥛 Em lactação — dando leite</option>
                        <option value="seca">💤 Em descanso — período seco</option>
                      </select>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Data de nascimento</label>
                    <input type="date" value={form.data_nascimento} onChange={e=>setForm(f=>({...f,data_nascimento:e.target.value}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
                  </div>
                  <Campo label="Brinco da mãe" value={form.mae} onChange={v=>setForm(f=>({...f,mae:v}))} placeholder="F001"/>
                  <Campo label="Brinco do pai" value={form.pai} onChange={v=>setForm(f=>({...f,pai:v}))} placeholder="T002"/>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Observação</label>
                    <textarea value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} rows={2} placeholder="Observações gerais..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"/>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={fecharForm} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={salvando} className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800 disabled:opacity-60">
                    {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Cadastrar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showGrupo && (
        <GrupoModal
          onClose={() => setShowGrupo(false)}
          onDone={() => { setShowGrupo(false); carregarDash(); carregarLista(); }}
        />
      )}
    </div>
  );
}

function GrupoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const SEX_CAT: Record<string, "macho"|"femea"> = {
    bezerro:"macho", novilho:"macho", boi:"macho", touro:"macho",
    bezerra:"femea", novilha:"femea", vaca:"femea",
  };

  const [form, setForm] = useState({
    quantidade: "1", categoria: "vaca", raca: "",
    peso_medio: "", data_nascimento: "",
    prefixo_brinco: "", brinco_inicial: "1",
    observacao: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]         = useState("");
  const [sucesso, setSucesso]   = useState("");

  const qtd = parseInt(form.quantidade) || 0;

  const preview = form.prefixo_brinco && qtd > 0
    ? `${form.prefixo_brinco}${String(parseInt(form.brinco_inicial)||1).padStart(3,"0")} → ${form.prefixo_brinco}${String((parseInt(form.brinco_inicial)||1) + qtd - 1).padStart(3,"0")}`
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (qtd < 1) return;
    setSalvando(true); setErro("");
    try {
      const payload = {
        quantidade:     qtd,
        categoria:      form.categoria,
        sexo:           SEX_CAT[form.categoria] ?? "macho",
        raca:           form.raca,
        peso_medio:     form.peso_medio || undefined,
        data_nascimento:form.data_nascimento || undefined,
        prefixo_brinco: form.prefixo_brinco || undefined,
        brinco_inicial: form.prefixo_brinco ? parseInt(form.brinco_inicial)||1 : undefined,
        observacao:     form.observacao || undefined,
      };
      const { data } = await api.post("/gestao/rebanho/grupo", payload);
      setSucesso(data.message);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErro(msg ?? "Erro ao cadastrar grupo.");
      setSalvando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center space-y-4">
          <p className="text-5xl">🐄</p>
          <p className="font-bold text-gray-800 text-lg">{sucesso}</p>
          <p className="text-xs text-gray-400">Todos os animais foram adicionados ao rebanho com status ativo.</p>
          <button onClick={onDone} className="w-full bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-green-800">
            Ver rebanho
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Adicionar grupo</h2>
              <p className="text-xs text-gray-400">Cadastre vários animais de uma vez (ex: compra de lote)</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{erro}</p>}

          <form onSubmit={submit} className="space-y-4">
            {/* Quantidade + Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Quantidade *</label>
                <input type="number" min="1" max="500" required
                  value={form.quantidade} onChange={e=>setForm(f=>({...f,quantidade:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-center text-lg font-bold" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Categoria *</label>
                <select required value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {CATEGORIAS.map(c=><option key={c} value={c}>{CAT_LABEL[c]}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">Sexo: {SEX_CAT[form.categoria]==="femea"?"Fêmea ♀":"Macho ♂"}</p>
              </div>
            </div>

            {/* Raça + Peso */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Raça *</label>
                <input required value={form.raca} onChange={e=>setForm(f=>({...f,raca:e.target.value}))}
                  placeholder="Nelore, Angus..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Peso médio (kg)</label>
                <input type="number" value={form.peso_medio} onChange={e=>setForm(f=>({...f,peso_medio:e.target.value}))}
                  placeholder="Ex: 280" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>

            {/* Data nascimento */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Data de nascimento (aprox.)</label>
              <input type="date" value={form.data_nascimento} onChange={e=>setForm(f=>({...f,data_nascimento:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Brincos automáticos */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Numeração dos brincos (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Prefixo</label>
                  <input value={form.prefixo_brinco} onChange={e=>setForm(f=>({...f,prefixo_brinco:e.target.value.toUpperCase()}))}
                    placeholder="Ex: V, B, T..." maxLength={5}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Número inicial</label>
                  <input type="number" min="0" value={form.brinco_inicial} onChange={e=>setForm(f=>({...f,brinco_inicial:e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono" />
                </div>
              </div>
              {preview && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 font-mono">
                  Brincos: <strong>{preview}</strong> ({qtd} animais)
                </p>
              )}
              {!form.prefixo_brinco && (
                <p className="text-xs text-gray-400">Sem prefixo — brincos ficarão em branco para preencher depois.</p>
              )}
            </div>

            {/* Observação */}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Observação (ex: origem, nota fiscal)</label>
              <input value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))}
                placeholder="Ex: Compra 15/05/2026 — Fazenda São João" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            {/* Resumo */}
            {qtd > 0 && form.raca && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Cadastrar <strong>{qtd} {CAT_LABEL[form.categoria]}{qtd>1?"s":""}</strong> · {form.raca}
                {form.peso_medio ? ` · ${form.peso_medio}kg` : ""}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={salvando || qtd < 1 || !form.raca}
                className="flex-1 bg-amber-600 text-white font-semibold py-2.5 rounded-full text-sm hover:bg-amber-700 disabled:opacity-60">
                {salvando ? "Cadastrando..." : `🐄 Cadastrar ${qtd > 1 ? `${qtd} animais` : "1 animal"}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
