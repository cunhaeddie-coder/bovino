"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

type FazendaItem = {
  id: number; nome: string;
  municipio: string | null; estado: string | null;
  logo_url: string | null; ativo: boolean;
};

const FORM_VAZIO = { nome: "", estado: "", municipio: "" };

export function FazendaSwitcher() {
  const { activeFazendaId, setActiveFazendaId, user } = useAuthStore();
  const isElite = (user as any)?.assinatura_ativa?.plano_slug === 'produtor-elite'
               || (user as any)?.plano === 'produtor-elite';

  const [fazendas, setFazendas]     = useState<FazendaItem[]>([]);
  const [carregou, setCarregou]     = useState(false);
  const [open, setOpen]             = useState(false);
  const [criando, setCriando]       = useState(false);
  const [form, setForm]             = useState({ ...FORM_VAZIO });
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");

  // Carrega lista de fazendas do usuário
  useEffect(() => {
    api.get("/fazendas/minhas")
      .then(r => {
        const lista: FazendaItem[] = r.data ?? [];
        setFazendas(lista);
        if (!activeFazendaId && lista.length > 0) setActiveFazendaId(lista[0].id);
      })
      .catch(() => {})
      .finally(() => setCarregou(true));
  }, []);

  // Busca municípios do IBGE quando estado muda
  useEffect(() => {
    if (!form.estado) { setMunicipios([]); return; }
    setForm(f => ({ ...f, municipio: "" }));
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios?orderBy=nome`)
      .then(r => r.json())
      .then((d: { nome: string }[]) => setMunicipios(d.map(m => m.nome)))
      .catch(() => setMunicipios([]));
  }, [form.estado]);

  // Alterna fazenda ativa — recarrega a página para atualizar todos os dados
  function selecionar(id: number) {
    if (id === activeFazendaId) { setOpen(false); return; }
    setActiveFazendaId(id);
    setOpen(false);
    window.location.reload();
  }

  function abrirCriacao() {
    setErro("");
    setForm({ ...FORM_VAZIO });
    setCriando(true);
  }

  async function criarFazenda(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const { data } = await api.post("/fazenda", form);
      const nova: FazendaItem = data;
      setFazendas(prev => [...prev, nova]);
      setActiveFazendaId(nova.id);
      setCriando(false);
      setForm({ ...FORM_VAZIO });
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? "Erro ao criar fazenda. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const ativa = fazendas.find(f => f.id === activeFazendaId) ?? fazendas[0];

  const formJSX = (dark = false) => {
    const base = dark
      ? "border border-green-600 bg-green-900/40 text-white placeholder-green-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400"
      : "border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
    const sel = base + " disabled:opacity-50";

    return (
      <form onSubmit={criarFazenda} className={`space-y-2 ${dark ? "bg-green-800/40 rounded-xl p-3" : "p-3"}`}>
        {dark && <p className="text-xs font-semibold text-green-200">Nova fazenda</p>}
        {!dark && <p className="text-xs font-semibold text-gray-500">Nova fazenda</p>}

        {erro && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-2 py-1">{erro}</p>}

        <input
          autoFocus required
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome da fazenda *"
          className={`w-full ${base}`}
        />
        <div className="grid grid-cols-2 gap-1.5">
          {/* UF primeiro para habilitar o município */}
          <select
            required
            value={form.estado}
            onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
            className={sel}
          >
            <option value="">UF *</option>
            {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          <select
            required
            value={form.municipio}
            onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
            disabled={!form.estado || municipios.length === 0}
            className={sel}
          >
            <option value="">
              {!form.estado ? "Selecione UF" : municipios.length === 0 ? "Carregando..." : "Município *"}
            </option>
            {municipios.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => { setCriando(false); setErro(""); }}
            className={`flex-1 py-1.5 text-xs rounded-lg border ${dark ? "border-green-600 text-green-200" : "border-gray-200 text-gray-500"}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded-lg disabled:opacity-50"
          >
            {salvando ? "Criando..." : "Criar fazenda"}
          </button>
        </div>
      </form>
    );
  };

  // Skeleton enquanto carrega
  if (!carregou) return (
    <div className="px-3 mb-2">
      <div className="w-full h-10 bg-green-800/40 rounded-xl animate-pulse" />
    </div>
  );

  // Sem fazenda cadastrada ainda (primeira fazenda — qualquer plano premium pode criar)
  if (fazendas.length === 0) return (
    <div className="px-3 mb-2">
      {!criando
        ? <button onClick={abrirCriacao}
            className="w-full flex items-center gap-2 bg-green-800/40 hover:bg-green-800/60 rounded-xl px-3 py-2 text-green-200 text-xs font-medium">
            <Plus size={14} /> Cadastrar fazenda
          </button>
        : formJSX(true)
      }
    </div>
  );
  // Nota: qualquer plano premium pode criar a PRIMEIRA fazenda
  // Apenas Elite pode criar fazendas adicionais

  return (
    <div className="relative px-3 mb-2">
      {/* Botão principal — sempre clicável */}
      <button
        onClick={() => { setOpen(v => !v); if (criando) setCriando(false); }}
        className="w-full flex items-center gap-2 bg-green-800/40 hover:bg-green-800/60 rounded-xl px-3 py-2 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(ativa?.nome ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-xs font-semibold truncate">{ativa?.nome ?? "Selecione"}</p>
          {ativa?.municipio && (
            <p className="text-green-300 text-[10px] truncate">
              {ativa.municipio}{ativa.estado ? `/${ativa.estado}` : ""}
            </p>
          )}
        </div>
        <ChevronDown size={14} className={`text-green-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCriando(false); }} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">

            {/* Lista de fazendas */}
            {fazendas.map(f => (
              <button
                key={f.id}
                onClick={() => selecionar(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${f.id === activeFazendaId ? "bg-green-50" : ""}`}
              >
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                  {f.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.nome}</p>
                  {f.municipio && <p className="text-[10px] text-gray-400">{f.municipio}{f.estado ? `/${f.estado}` : ""}</p>}
                </div>
                {f.id === activeFazendaId && <span className="text-green-600 text-xs font-bold">✓</span>}
              </button>
            ))}

            {/* Criar nova fazenda — apenas Elite */}
            <div className="border-t border-gray-100">
              {isElite ? (
                !criando
                  ? <button onClick={abrirCriacao}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-green-700 hover:bg-green-50 text-sm font-medium">
                      <Plus size={14} /> Nova fazenda
                    </button>
                  : formJSX(false)
              ) : (
                <div className="px-3 py-2.5 flex items-center gap-2">
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Elite</span>
                  <span className="text-xs text-gray-400">Múltiplas fazendas</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
