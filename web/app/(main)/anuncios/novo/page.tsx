"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { EstadoCidadeSelect } from "@/components/ui/EstadoCidadeSelect";
import { RacaSelect } from "@/components/ui/RacaSelect";

const ARROBA = 15;

function NovoAnuncioForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuthStore();

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    raca: "",
    sexo: "macho",
    quantidade: "1",
    idade_meses: "",
    peso_estimado: "",
    estado: "",
    municipio: "",
    propriedade: "",
    preco_unitario: "",
    aceita_negociacao: true,
    expira_em: "",
  });
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [uploadStep, setUploadStep]   = useState("");

  // Mídia
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user]);

  // Pré-preenche com dados do lote da gestão
  useEffect(() => {
    const raca        = params.get("raca");
    const quantidade  = params.get("quantidade");
    const pesoMedio   = params.get("peso_medio");
    const precoArr    = params.get("preco_arroba");
    const estado      = params.get("estado");
    const municipio   = params.get("municipio");
    const propriedade = params.get("propriedade");

    if (!raca && !quantidade) return;

    setForm(f => {
      const updates: Partial<typeof f> = {};

      if (raca)        updates.raca        = raca;
      if (quantidade)  updates.quantidade  = quantidade;
      if (estado)      updates.estado      = estado;
      if (municipio)   updates.municipio   = municipio;
      if (propriedade) updates.propriedade = propriedade;
      if (pesoMedio)   updates.peso_estimado = pesoMedio;

      if (precoArr && pesoMedio) {
        const arrobas = parseFloat(pesoMedio) / ARROBA;
        updates.preco_unitario = (parseFloat(precoArr) * arrobas).toFixed(2);
      }

      if (raca && quantidade) {
        updates.titulo = `${quantidade} ${raca} — ${estado || ""}`.trim();
      }

      return { ...f, ...updates };
    });
  }, []);

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // ─── Mídia ────────────────────────────────────────────────────────────────

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    const added = Array.from(picked);
    setFiles(prev => [...prev, ...added]);
    added.forEach(f => {
      if (f.type.startsWith("image/")) {
        setPreviews(prev => [...prev, URL.createObjectURL(f)]);
      } else {
        setPreviews(prev => [...prev, "video"]);
      }
    });
    // reset input so o mesmo arquivo pode ser adicionado novamente
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    const url = previews[index];
    if (url && url !== "video") URL.revokeObjectURL(url);
    setFiles(p => p.filter((_, i) => i !== index));
    setPreviews(p => p.filter((_, i) => i !== index));
  }

  // Drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

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
        lote_gestao_id:    params.get("lote_id") ? parseInt(params.get("lote_id")!) : null,
      };

      const { data } = await api.post("/anuncios", payload);
      const anuncioId = data.id;

      // Upload de mídias (best-effort — não bloqueia navegação se falhar)
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          setUploadStep(`Enviando mídia ${i + 1} de ${files.length}...`);
          try {
            const fd = new FormData();
            fd.append("arquivo", files[i]);
            fd.append("ordem", String(i));
            await api.post(`/anuncios/${anuncioId}/midias`, fd);
          } catch {
            // continua mesmo se uma mídia falhar
          }
        }
      }

      router.push(`/anuncios/${anuncioId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (err.response?.data?.errors) {
        setError(Object.values(err.response.data.errors).flat()[0]);
      } else {
        setError(err.response?.data?.message ?? "Erro ao publicar anúncio.");
      }
    } finally {
      setLoading(false);
      setUploadStep("");
    }
  }

  if (!user) return null;

  const totalLote =
    form.preco_unitario && form.quantidade
      ? (parseFloat(form.preco_unitario.replace(",", ".")) * parseInt(form.quantidade || "1"))
          .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  const vemDoLote = !!params.get("lote_id");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Publicar anúncio</h1>
        <p className="text-gray-500 text-sm mt-1">
          {vemDoLote
            ? "Dados pré-preenchidos com o lote da gestão. Revise e publique."
            : "Preencha os dados do lote que deseja vender."}
        </p>
      </div>

      {vemDoLote && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 text-sm text-green-700">
          Dados importados do lote da gestão — revise antes de publicar.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Informações */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Informações do anúncio</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Título *</label>
            <input required value={form.titulo} onChange={e => set("titulo", e.target.value)}
              maxLength={255} placeholder="Ex: 50 bois Nelore para engorda — MT"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
            <textarea value={form.descricao} onChange={e => set("descricao", e.target.value)}
              rows={3} placeholder="Descreva o estado dos animais, condições de saúde, vacinas, etc."
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

        {/* Fotos e Vídeos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">
            Fotos e vídeos{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </h2>

          {/* Grid de previews */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
                  {previews[i] !== "video" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[i]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-2">
                      <svg className="w-8 h-8 mb-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                      </svg>
                      <span className="text-xs text-center truncate w-full px-1">{f.name}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => removeFile(i)}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-opacity opacity-0 group-hover:opacity-100">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Zona de drop */}
          <label
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-7 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
            <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700">
              {files.length > 0 ? "Adicionar mais fotos / vídeos" : "Adicionar fotos ou vídeos"}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              Arraste ou clique — JPG, PNG, WEBP, MP4, MOV — até 50 MB por arquivo
            </span>
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
                onChange={e => set("preco_unitario", e.target.value)} placeholder="Ex: 3500"
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

        <button type="submit" disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl transition disabled:opacity-60 text-base">
          {loading ? (uploadStep || "Publicando...") : "Publicar anúncio"}
        </button>
      </form>
    </div>
  );
}

export default function NovoAnuncioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <NovoAnuncioForm />
    </Suspense>
  );
}
