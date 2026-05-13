"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAdmin } from "@/lib/admin-context";

type Evento = {
  id: number; status: string; data_hora: string; link_reuniao: string | null;
  servico_nome: string; modalidade: string;
  cliente_nome: string; cliente_celular: string; tecnico_nome: string | null;
};
type Tecnico = { id: number; nome: string };

const STATUS_COLOR: Record<string, string> = {
  pendente:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  aceita:       "bg-blue-100 text-blue-800 border-blue-200",
  agendada:     "bg-indigo-100 text-indigo-800 border-indigo-200",
  em_andamento: "bg-orange-100 text-orange-800 border-orange-200",
  concluida:    "bg-green-100 text-green-800 border-green-200",
  recusada:     "bg-red-100 text-red-800 border-red-200",
  cancelada:    "bg-slate-100 text-slate-500 border-slate-200",
};

export default function AgendaPage() {
  const { admin }  = useAdmin();
  const isTecnico  = admin && ["ti", "treinamento", "tecnico"].includes(admin.papel);
  const hoje       = new Date();
  const [ano, setAno]     = useState(hoje.getFullYear());
  const [mes, setMes]     = useState(hoje.getMonth());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [filtroTec, setFiltroTec] = useState("");
  const [diaSel, setDiaSel] = useState<number | null>(null);

  const mesStr = `${ano}-${String(mes + 1).padStart(2, "0")}`;

  useEffect(() => {
    const params = new URLSearchParams({ mes: mesStr });
    if (filtroTec) params.set("tecnico_id", filtroTec);
    api.get(`/atendimento/agenda?${params}`).then(({ data }) => setEventos(data));
  }, [mesStr, filtroTec]);

  useEffect(() => {
    if (!isTecnico) api.get("/atendimento/tecnicos").then(({ data }) => setTecnicos(data));
  }, []);

  function navMes(delta: number) {
    let m = mes + delta, a = ano;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMes(m); setAno(a); setDiaSel(null);
  }

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();
  const semanas     = Math.ceil((primeiroDia + diasNoMes) / 7);
  const dias        = Array.from({ length: semanas * 7 }, (_, i) => {
    const d = i - primeiroDia + 1;
    return d > 0 && d <= diasNoMes ? d : null;
  });

  const eventosDoDia = (dia: number) =>
    eventos.filter(e => new Date(e.data_hora).getDate() === dia);

  const eventosSel = diaSel ? eventosDoDia(diaSel) : [];

  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Agenda</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isTecnico ? "Seus atendimentos agendados" : "Calendário geral de atendimentos"}
          </p>
        </div>
        {!isTecnico && tecnicos.length > 0 && (
          <select value={filtroTec} onChange={e => setFiltroTec(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">Todos os técnicos</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header do mês */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base font-bold text-slate-800">
            {MESES[mes]} {ano}
          </h2>
          <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Grade dias da semana */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-slate-400 uppercase py-2">{d}</div>
          ))}
        </div>

        {/* Células */}
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            if (!dia) return <div key={i} className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/30" />;
            const evs    = eventosDoDia(dia);
            const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
            const isSel  = dia === diaSel;
            return (
              <div key={i} onClick={() => setDiaSel(dia === diaSel ? null : dia)}
                className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition ${isSel ? "bg-green-50" : "hover:bg-slate-50"}`}>
                <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isHoje ? "bg-green-600 text-white" : "text-slate-600"}`}>
                  {dia}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 2).map(e => (
                    <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded border truncate font-semibold ${STATUS_COLOR[e.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {new Date(e.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} {e.cliente_nome.split(" ")[0]}
                    </div>
                  ))}
                  {evs.length > 2 && <div className="text-[9px] text-slate-400 pl-1">+{evs.length - 2} mais</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhe do dia selecionado */}
      {diaSel && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">
            {diaSel} de {MESES[mes]} de {ano}
            <span className="ml-2 text-xs font-normal text-slate-400">{eventosSel.length} atendimento(s)</span>
          </h3>
          {eventosSel.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum atendimento neste dia.</p>
          ) : (
            <div className="space-y-3">
              {eventosSel.map(e => (
                <div key={e.id} className={`rounded-xl border p-4 ${STATUS_COLOR[e.status] ?? "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{e.servico_nome}</p>
                      <p className="text-xs">👤 {e.cliente_nome} · {e.cliente_celular}</p>
                      {e.tecnico_nome && <p className="text-xs">🛠 {e.tecnico_nome}</p>}
                      {e.link_reuniao && (
                        <a href={e.link_reuniao} target="_blank" className="text-xs underline flex items-center gap-1">🔗 {e.link_reuniao}</a>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold">
                        {new Date(e.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-[10px] capitalize">{e.modalidade}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
        {[
          ["agendada", "Agendada"],
          ["em_andamento", "Em andamento"],
          ["concluida", "Concluída"],
          ["pendente", "Aguardando aceite"],
        ].map(([key, label]) => (
          <span key={key} className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${STATUS_COLOR[key]}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
