"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Alerta = {
  id: number;
  raca: string | null;
  estados: string[] | null;
  categoria: string | null;
  sexo: string | null;
  peso_min: number | null;
  peso_max: number | null;
  ativo: boolean;
};

const ESTADOS_BR: Record<string, string> = {
  AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",
  DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",
  MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",PA:"Pará",
  PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte",RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",
  SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins",
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ raca: "", estados: [] as string[], categoria: "", sexo: "", peso_min: "", peso_max: "" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    api.get("/alertas-demanda").then(r => setAlertas(r.data)).catch(() => {});
  }

  useEffect(() => { carregar(); }, []);

  function toggleEstado(uf: string) {
    setForm(f => ({
      ...f,
      estados: f.estados.includes(uf) ? f.estados.filter(e => e !== uf) : [...f.estados, uf],
    }));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/alertas-demanda", {
        raca: form.raca || null,
        estados: form.estados.length ? form.estados : null,
        categoria: form.categoria || null,
        sexo: form.sexo || null,
        peso_min: form.peso_min ? Number(form.peso_min) : null,
        peso_max: form.peso_max ? Number(form.peso_max) : null,
      });
      setShowForm(false);
      setForm({ raca: "", estados: [], categoria: "", sexo: "", peso_min: "", peso_max: "" });
      carregar();
    } finally { setSalvando(false); }
  }

  async function toggleAtivo(id: number, ativo: boolean) {
    await api.put(`/alertas-demanda/${id}`, { ativo: !ativo });
    carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este alerta?")) return;
    await api.delete(`/alertas-demanda/${id}`);
    carregar();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🔔 Alertas de demanda</h1>
          <p className="text-gray-500 text-sm">Notificações quando compradores buscam seu perfil de animal</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-800 transition">
          + Criar alerta
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Novo alerta de demanda</h2>
            <form onSubmit={salvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Raça</label>
                  <input value={form.raca} onChange={e => setForm(f => ({...f, raca: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: Nelore (deixe vazio = todas)" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Sexo</label>
                  <select value={form.sexo} onChange={e => setForm(f => ({...f, sexo: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">Qualquer</option>
                    <option value="macho">Macho</option>
                    <option value="femea">Fêmea</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Peso mín. (kg)</label>
                  <input type="number" value={form.peso_min} onChange={e => setForm(f => ({...f, peso_min: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Peso máx. (kg)</label>
                  <input type="number" value={form.peso_max} onChange={e => setForm(f => ({...f, peso_max: e.target.value}))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="600" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">Estados de interesse (deixe vazio = todos)</label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                  {Object.entries(ESTADOS_BR).map(([uf, nome]) => (
                    <button key={uf} type="button" onClick={() => toggleEstado(uf)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${form.estados.includes(uf) ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {uf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-full text-sm">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 bg-green-700 text-white font-semibold py-2.5 rounded-full text-sm disabled:opacity-60">
                  {salvando ? "Salvando..." : "Criar alerta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {alertas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-500 font-medium">Nenhum alerta configurado</p>
          <p className="text-gray-400 text-sm mt-1">Crie um alerta para ser avisado quando compradores buscarem seu perfil</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 transition ${a.ativo ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  {a.raca && <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.raca}</span>}
                  {a.sexo && <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{a.sexo}</span>}
                  {(a.peso_min || a.peso_max) && (
                    <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {a.peso_min ?? 0}–{a.peso_max ?? "∞"} kg
                    </span>
                  )}
                  {a.estados && a.estados.map(uf => (
                    <span key={uf} className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{uf}</span>
                  ))}
                  {!a.raca && !a.sexo && !a.peso_min && !a.peso_max && !a.estados?.length && (
                    <span className="text-xs text-gray-400">Qualquer animal em qualquer estado</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleAtivo(a.id, a.ativo)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${a.ativo ? "bg-green-500" : "bg-gray-200"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${a.ativo ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <button onClick={() => excluir(a.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
