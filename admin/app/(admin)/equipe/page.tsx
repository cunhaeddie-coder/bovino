"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAdmin, roleLabel, roleColor, AdminPapel } from "@/lib/admin-context";

type AdminMember = {
  id: number;
  nome: string;
  email: string;
  papel: AdminPapel;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
};

type Paginated<T> = { data: T[]; total: number; current_page: number; last_page: number };

const PAPEIS: AdminPapel[] = ["super", "operador", "ti", "vendas", "treinamento"];

const PAPEL_DESC: Record<AdminPapel, string> = {
  super:       "Acesso total ao sistema",
  operador:    "Acesso a todas as seções, exceto equipe",
  ti:          "Dashboard, usuários, anúncios, inteligência, fazendas",
  vendas:      "Dashboard, assinaturas, pagamentos, anunciantes",
  treinamento: "Dashboard, usuários, anúncios, avaliações (leitura)",
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-light">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type FormData = { nome: string; email: string; password: string; papel: AdminPapel };
const emptyForm = (): FormData => ({ nome: "", email: "", password: "", papel: "operador" });

export default function EquipePage() {
  const { admin } = useAdmin();
  const [data, setData] = useState<Paginated<AdminMember> | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function carregar() {
    setLoading(true);
    const { data: res } = await api.get("/equipe");
    setData(res);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function openCreate() {
    setForm(emptyForm());
    setError("");
    setModal("create");
  }

  function openEdit(m: AdminMember) {
    setSelected(m);
    setForm({ nome: m.nome, email: m.email, password: "", papel: m.papel });
    setError("");
    setModal("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Partial<FormData> = { nome: form.nome, email: form.email, papel: form.papel };
      if (form.password) payload.password = form.password;

      if (modal === "create") {
        await api.post("/equipe", { ...payload, password: form.password });
      } else if (modal === "edit" && selected) {
        await api.put(`/equipe/${selected.id}`, payload);
      }
      setModal(null);
      carregar();
    } catch (err: any) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(" ") : (err.response?.data?.message ?? "Erro ao salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(m: AdminMember) {
    if (!confirm(`${m.ativo ? "Desativar" : "Reativar"} ${m.nome}?`)) return;
    await api.post(`/equipe/${m.id}/toggle-ativo`);
    carregar();
  }

  if (admin?.papel !== "super") {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-400 text-sm">Acesso restrito a Super Admins.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Equipe Administrativa</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie usuários do painel e suas permissões</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
        >
          + Novo membro
        </button>
      </div>

      {/* Role reference cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {PAPEIS.map((p) => (
          <div key={p} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor(p)}`}>{roleLabel(p)}</span>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">{PAPEL_DESC[p]}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-[11px] text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Membro</th>
                <th className="text-left px-3 py-3">Papel</th>
                <th className="text-left px-3 py-3">Último acesso</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Adicionado em</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : data?.data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhum membro cadastrado.</td></tr>
              ) : data?.data.map((m) => (
                <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-slate-600 text-xs font-bold">
                          {m.nome.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{m.nome}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${roleColor(m.papel)}`}>
                      {roleLabel(m.papel)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {m.ultimo_acesso ? new Date(m.ultimo_acesso).toLocaleString("pt-BR") : "Nunca"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2 justify-end">
                      {m.id !== admin.id && (
                        <>
                          <button
                            onClick={() => openEdit(m)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => toggleAtivo(m)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${m.ativo ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-green-50 hover:bg-green-100 text-green-600"}`}
                          >
                            {m.ativo ? "Desativar" : "Reativar"}
                          </button>
                        </>
                      )}
                      {m.id === admin.id && (
                        <span className="text-xs text-slate-300">você</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <Modal
          title={modal === "create" ? "Adicionar membro" : `Editar: ${selected?.nome}`}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nome completo</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ex: João Silva"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="email@empresa.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Senha {modal === "edit" && <span className="text-slate-400 font-normal">(deixe em branco para manter)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Mínimo 8 caracteres"
                required={modal === "create"}
                minLength={8}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Papel / Permissão</label>
              <div className="space-y-2">
                {PAPEIS.map((p) => (
                  <label key={p} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${form.papel === p ? "border-green-400 bg-green-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input
                      type="radio"
                      name="papel"
                      value={p}
                      checked={form.papel === p}
                      onChange={() => setForm({ ...form, papel: p })}
                      className="mt-0.5 accent-green-600"
                    />
                    <div>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${roleColor(p)}`}>{roleLabel(p)}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{PAPEL_DESC[p]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition disabled:opacity-60"
              >
                {saving ? "Salvando…" : modal === "create" ? "Adicionar" : "Salvar alterações"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
