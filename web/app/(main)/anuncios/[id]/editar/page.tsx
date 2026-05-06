"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { EstadoCidadeSelect } from "@/components/ui/EstadoCidadeSelect";
import { RacaSelect } from "@/components/ui/RacaSelect";
import type { Anuncio, Midia } from "@/lib/types";

const ARROBA = 15;

type Form = {
  titulo: string;
  descricao: string;
  raca: string;
  sexo: string;
  quantidade: string;
  idade_meses: string;
  peso_estimado: string;
  estado: string;
  municipio: string;
  propriedade: string;
  preco_unitario: string;
  aceita_negociacao: boolean;
  expira_em: string;
};

export default function EditarAnuncioPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [fetching, setFetching]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [uploadStep, setUploadStep] = useState("");
  const [success, setSuccess]     = useState(false);

  const [form, setForm] = useState<Form>({
    titulo: "", descricao: "", raca: "", sexo: "macho",
    quantidade: "1", idade_meses: "", peso_estimado: "",
    estado: "", municipio: "", propriedade: "",
    preco_unitario: "", aceita_negociacao: true, expira_em: "",
  });

  // Mídias existentes
  const [midias, setMidias]         = useState<Midia[]>([]);
  const [deletando, setDeletando]   = useState<number[]>([]);

  // Novas mídias a adicionar
  const [newFiles, setNewFiles]       = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [uploading, setUploading]     = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function set(field: keyof Form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Carrega o anúncio
  useEffect(() => {
    if (!user) { router.replace("/login"); return; }

    api.get<Anuncio>(`/anuncios/${id}`)
      .then(({ data }) => {
        if (data.user_id !== user.id) {
          router.replace(`/anuncios/${id}`);
          return;
        }
        setMidias(data.midias ?? []);
        setForm({
          titulo:            data.titulo,
          descricao:         data.descricao ?? "",
          raca:              data.animal.raca,
          sexo:              data.animal.sexo,
          quantidade:        String(data.animal.quantidade),
          idade_meses:       data.animal.idade_meses ? String(data.animal.idade_meses) : "",
          peso_estimado:     data.animal.peso_estimado ? String(data.animal.peso_estimado) : "",
          estado:            data.animal.estado,
          municipio:         data.animal.municipio,
          propriedade:       data.animal.propriedade ?? "",
          preco_unitario:    String(data.preco_unitario),
          aceita_negociacao: data.aceita_negociacao,
          expira_em:         data.expira_em ? data.expira_em.split("T")[0] : "",
        });
      })
      .catch(() => router.replace("/anuncios/meus"))
      .finally(() => setFetching(false));
  }, [user, id]);

  // ── Novas mídias ─────────────────────────────────────────────────────────

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const added = Array.from(picked);
    setNewFiles(prev => [...prev, ...added]);
    added.forEach(f => {
      setPreviews(f.type.startsWith("image/") ? URL.createObjectURL(f) : "video");
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function setPreviews(url: string) {
    setNewPreviews(prev => [...prev, url]);
  }

  function removeNew(index: number) {
    const url = newPreviews[index];
    if (url && url !== "video") URL.revokeObjectURL(url);
    setNewFiles(p => p.filter((_, i) => i !== index));
    setNewPreviews(p => p.filter((_, i) => i !== index));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  // ── Upload imediato de arquivo individual ────────────────────────────────

  async function uploadArquivo(index: number) {
    setUploading(prev => [...prev, index]);
    try {
      const fd = new FormData();
      fd.append("arquivo", newFiles[index]);
      fd.append("ordem", String(midias.length));
      const { data: nova } = await api.post(`/anuncios/${id}/midias`, fd);
      setMidias(prev => [...prev, nova]);
      removeNew(index);
    } catch {
      setError("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploading(prev => prev.filter(i => i !== index));
    }
  }

  // ── Deletar mídia existente ───────────────────────────────────────────────

  async function deletarMidia(midiaId: number) {
    setDeletando(prev => [...prev, midiaId]);
    try {
      await api.delete(`/midias/${midiaId}`);
      setMidias(prev => prev.filter(m => m.id !== midiaId));
    } catch {
      // silencia — mantém na lista
    } finally {
      setDeletando(prev => prev.filter(i => i !== midiaId));
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.raca)      { setError("Selecione a raça."); return; }
    if (!form.estado)    { setError("Selecione o estado."); return; }
    if (!form.municipio) { setError("Informe o município."); return; }

    setLoading(true);
    try {
      const payload = {
        titulo:            form.titulo,
        descricao:         form.descricao || null,
        raca:              form.raca,
        sexo:              form.sexo,
        quantidade:        parseInt(form.quantidade),
        idade_meses:       form.idade_meses ? parseInt(form.idade_meses) : null,
        peso_estimado:     form.peso_estimado ? parseFloat(form.peso_estimado) : null,
        estado:            form.estado,
        municipio:         form.municipio,
        propriedade:       form.propriedade || null,
        preco_unitario:    parseFloat(form.preco_unitario.replace(",", ".")),
        aceita_negociacao: form.aceita_negociacao,
        expira_em:         form.expira_em || null,
      };

      const { data } = await api.put(`/anuncios/${id}`, payload);
      setMidias(data.midias ?? midias);

      // Upload de novas mídias
      for (let i = 0; i < newFiles.length; i++) {
        setUploadStep(`Enviando mídia ${i + 1} de ${newFiles.length}...`);
        try {
          const fd = new FormData();
          fd.append("arquivo", newFiles[i]);
          fd.append("ordem", String((data.midias?.length ?? midias.length) + i));
          const { data: nova } = await api.post(`/anuncios/${id}/midias`, fd);
          setMidias(prev => [...prev, nova]);
        } catch {
          // continua
        }
      }

      setNewFiles([]);
      setNewPreviews([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat()[0]);
      } else {
        setError(err.response?.data?.message ?? "Erro ao salvar.");
      }
    } finally {
      setLoading(false);
      setUploadStep("");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalLote =
    form.preco_unitario && form.quantidade
      ? (parseFloat(form.preco_unitario.replace(",", ".")) * parseInt(form.quantidade || "1"))
          .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/anuncios/${id}`}
          className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Editar anúncio</h1>
          <p className="text-gray-500 text-sm mt-0.5">As alterações são aplicadas imediatamente.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Anúncio atualizado com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Informações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Informações do anúncio</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Título *</label>
            <input required value={form.titulo} onChange={e => set("titulo", e.target.value)}
              maxLength={255}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => set("descricao", e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </div>

        {/* Animal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Dados do animal</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Raça *</label>
              <RacaSelect value={form.raca} onChange={r => set("raca", r)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sexo *</label>
              <select value={form.sexo} onChange={e => set("sexo", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
                <option value="misto">Misto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Quantidade *</label>
              <input required type="number" min="1" value={form.quantidade}
                onChange={e => set("quantidade", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Idade (meses)</label>
              <input type="number" min="1" value={form.idade_meses}
                onChange={e => set("idade_meses", e.target.value)} placeholder="Ex: 24"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Peso médio (kg)</label>
              <input type="number" min="0" step="0.1" value={form.peso_estimado}
                onChange={e => set("peso_estimado", e.target.value)} placeholder="Ex: 450"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Localização</h2>
          <EstadoCidadeSelect
            estado={form.estado} municipio={form.municipio}
            onEstadoChange={uf => set("estado", uf)}
            onMunicipioChange={cidade => set("municipio", cidade)} required />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da propriedade</label>
            <input value={form.propriedade} onChange={e => set("propriedade", e.target.value)}
              placeholder="Ex: Fazenda Boa Esperança"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Mídias existentes */}
        {midias.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm">Fotos e vídeos publicados</h2>
            <div className="grid grid-cols-3 gap-2">
              {midias.map(m => (
                <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
                  {m.tipo === "foto" ? (
                    <Image src={m.url} alt="" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                      </svg>
                      <span className="text-xs mt-1">Vídeo</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => deletarMidia(m.id)}
                    disabled={deletando.includes(m.id)}
                    className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-opacity opacity-0 group-hover:opacity-100 hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletando.includes(m.id) ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar novas mídias */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">
            Adicionar fotos / vídeos{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </h2>

          {/* Fotos novas — grid */}
          {newFiles.some((_, i) => newPreviews[i] !== "video") && (
            <div className="grid grid-cols-3 gap-2">
              {newFiles.map((f, i) => newPreviews[i] !== "video" && (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newPreviews[i]} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNew(i)}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Vídeos novos — lista com botão de envio imediato */}
          {newFiles.some((_, i) => newPreviews[i] === "video") && (
            <div className="space-y-2">
              {newFiles.map((f, i) => newPreviews[i] === "video" && (
                <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => uploadArquivo(i)}
                    disabled={uploading.includes(i)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 shrink-0 flex items-center gap-1.5"
                  >
                    {uploading.includes(i) ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Enviar vídeo
                      </>
                    )}
                  </button>
                  <button type="button" onClick={() => removeNew(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <label
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
            <svg className="w-9 h-9 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">Arraste ou clique para adicionar</span>
            <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, MP4, MOV — até 50 MB</span>
            <input ref={inputRef} type="file" multiple
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              onChange={e => addFiles(e.target.files)}
              className="hidden" />
          </label>
        </div>

        {/* Preço */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Preço e condições</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Preço por cabeça (R$) *</label>
              <input required value={form.preco_unitario}
                onChange={e => set("preco_unitario", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Validade do anúncio</label>
              <input type="date" value={form.expira_em} onChange={e => set("expira_em", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          {totalLote && (
            <div className="bg-green-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-green-700">Valor total do lote</span>
              <span className="text-lg font-extrabold text-green-800">{totalLote}</span>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => set("aceita_negociacao", !form.aceita_negociacao)}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.aceita_negociacao ? "bg-green-500" : "bg-gray-300"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.aceita_negociacao ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-700">Aceita negociação / proposta</span>
          </label>
        </div>

        <div className="flex gap-3">
          <Link href={`/anuncios/${id}`}
            className="flex-1 text-center border border-gray-200 text-gray-600 py-3.5 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-60 text-sm">
            {loading ? (uploadStep || "Salvando...") : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
