"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

type FazendaItem = {
  id: number;
  nome: string;
  municipio: string | null;
  estado: string | null;
  logo_url: string | null;
  ativo: boolean;
};

export function FazendaSwitcher() {
  const { activeFazendaId, setActiveFazendaId } = useAuthStore();
  const router = useRouter();

  const [fazendas, setFazendas]   = useState<FazendaItem[]>([]);
  const [carregou, setCarregou]   = useState(false);
  const [open, setOpen]           = useState(false);
  const [criando, setCriando]     = useState(false);
  const [novoForm, setNovoForm]   = useState({ nome: "", estado: "", municipio: "" });
  const [salvando, setSalvando]   = useState(false);

  useEffect(() => {
    api.get("/fazendas/minhas").then(r => {
      const lista: FazendaItem[] = r.data ?? [];
      setFazendas(lista);
      if (!activeFazendaId && lista.length > 0) {
        setActiveFazendaId(lista[0].id);
      }
    }).catch(() => {}).finally(() => setCarregou(true));
  }, []);

  const ativa = fazendas.find(f => f.id === activeFazendaId) ?? fazendas[0];

  function selecionar(id: number) {
    setActiveFazendaId(id);
    setOpen(false);
    router.refresh();
  }

  async function criarFazenda(e: React.FormEvent) {
    e.preventDefault();
    if (!novoForm.nome.trim() || !novoForm.estado || !novoForm.municipio.trim()) return;
    setSalvando(true);
    try {
      const { data } = await api.post("/fazenda", novoForm);
      setFazendas(prev => [...prev, data]);
      selecionar(data.id);
      setCriando(false);
      setNovoForm({ nome: "", estado: "", municipio: "" });
    } catch {
    } finally {
      setSalvando(false);
    }
  }

  // Mostra skeleton enquanto carrega, depois sempre renderiza
  if (!carregou) return (
    <div className="px-3 mb-2">
      <div className="w-full h-10 bg-green-800/40 rounded-xl animate-pulse" />
    </div>
  );

  // Sem fazendas: abre direto o form de criação
  if (fazendas.length === 0) return (
    <div className="px-3 mb-2">
      {!criando ? (
        <button onClick={() => setCriando(true)}
          className="w-full flex items-center gap-2 bg-green-800/40 hover:bg-green-800/60 rounded-xl px-3 py-2 transition-colors text-green-200 text-xs font-medium">
          <Plus size={14} /> Cadastrar fazenda
        </button>
      ) : (
        <form onSubmit={criarFazenda} className="bg-green-800/40 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-green-200">Nova fazenda</p>
          <input autoFocus required value={novoForm.nome} onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome da fazenda *" className="w-full border border-green-600 bg-green-900/40 text-white placeholder-green-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" />
          <div className="grid grid-cols-2 gap-1.5">
            <input required value={novoForm.municipio} onChange={e => setNovoForm(f => ({ ...f, municipio: e.target.value }))}
              placeholder="Município *" className="border border-green-600 bg-green-900/40 text-white placeholder-green-400 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400" />
            <select required value={novoForm.estado} onChange={e => setNovoForm(f => ({ ...f, estado: e.target.value }))}
              className="border border-green-600 bg-green-900/40 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-400">
              <option value="">UF *</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <button type="submit" disabled={salvando} className="w-full py-1.5 text-xs text-white bg-green-600 rounded-lg disabled:opacity-50">
            {salvando ? "Criando..." : "Criar fazenda"}
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 bg-green-800/40 hover:bg-green-800/60 rounded-xl px-3 py-2 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(ativa?.nome ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-xs font-semibold truncate">{ativa?.nome ?? "Selecione"}</p>
          {ativa?.municipio && (
            <p className="text-green-300 text-[10px] truncate">{ativa.municipio}{ativa.estado ? `/${ativa.estado}` : ""}</p>
          )}
        </div>
        <ChevronDown size={14} className={`text-green-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
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
                {f.id === activeFazendaId && <span className="text-green-600 text-xs">✓</span>}
              </button>
            ))}

            <div className="border-t border-gray-100">
              {!criando ? (
                <button
                  onClick={() => setCriando(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-green-700 hover:bg-green-50 text-sm font-medium"
                >
                  <Plus size={14} /> Nova fazenda
                </button>
              ) : (
                <form onSubmit={criarFazenda} className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Nova fazenda</p>
                  <input
                    autoFocus required
                    value={novoForm.nome}
                    onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome da fazenda *"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      required
                      value={novoForm.municipio}
                      onChange={e => setNovoForm(f => ({ ...f, municipio: e.target.value }))}
                      placeholder="Município *"
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <select
                      required
                      value={novoForm.estado}
                      onChange={e => setNovoForm(f => ({ ...f, estado: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                    >
                      <option value="">UF *</option>
                      {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setCriando(false)}
                      className="flex-1 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">
                      Cancelar
                    </button>
                    <button type="submit" disabled={salvando}
                      className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded-lg disabled:opacity-50">
                      {salvando ? "Criando..." : "Criar"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
