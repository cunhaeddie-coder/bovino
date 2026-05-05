"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { EstadoCidadeSelect } from "@/components/ui/EstadoCidadeSelect";

type Step = "dados" | "otp";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("dados");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState("");
  const [celularState, setCelularState] = useState("");
  const [senhaError, setSenhaError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState("");
  const numeroRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    celular: "",
    email: "",
    password: "",
    confirmar_senha: "",
    tipo: "comprador",
    // endereço
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    estado: "",
    // propriedade
    nome_propriedade: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "password" || field === "confirmar_senha") setSenhaError("");
  }

  function formatCep(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro ?? prev.endereco,
          bairro: data.bairro ?? prev.bairro,
          municipio: data.localidade ?? prev.municipio,
          estado: data.uf ?? prev.estado,
        }));
        numeroRef.current?.focus();
      }
    } catch {
      // sem conexão — ignora silenciosamente
    } finally {
      setCepLoading(false);
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmar_senha) {
      setSenhaError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/cadastro", {
        nome: form.nome,
        cpf: form.cpf.replace(/\D/g, ""),
        celular: form.celular.replace(/\D/g, ""),
        email: form.email || undefined,
        password: form.password,
        tipo: form.tipo,
        cep: form.cep || undefined,
        endereco: form.endereco || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
        bairro: form.bairro || undefined,
        municipio: form.municipio || undefined,
        estado: form.estado || undefined,
        nome_propriedade: form.nome_propriedade || undefined,
      });
      setCelularState(form.celular.replace(/\D/g, ""));
      setStep("otp");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/otp/verificar", { celular: celularState, codigo: otp, finalidade: "cadastro" });
      router.push("/login?cadastro=ok");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <Link href="/" className="text-2xl font-bold text-green-700 mb-8">🐄 Bovino</Link>
        <form onSubmit={handleVerificar} className="bg-white rounded-2xl shadow p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Verificar celular</h1>
          <p className="text-sm text-gray-500">Digite o código de 6 dígitos enviado via WhatsApp.</p>
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full bg-green-700 text-white rounded-lg py-2.5 font-semibold hover:bg-green-800 disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
      <Link href="/" className="text-2xl font-bold text-green-700 mb-8">🐄 Bovino</Link>

      <form onSubmit={handleCadastro} className="bg-white rounded-2xl shadow p-8 w-full max-w-lg space-y-4">
        <h1 className="text-xl font-bold">Criar conta</h1>

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        {/* — Dados pessoais — */}
        <SectionTitle>Dados pessoais</SectionTitle>

        <Field label="Nome completo">
          <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="João da Silva" required />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CPF">
            <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" required />
          </Field>
          <Field label="Celular (WhatsApp)">
            <Input type="tel" value={form.celular} onChange={(e) => set("celular", e.target.value)} placeholder="(65) 99999-9999" required />
          </Field>
        </div>

        <Field label="E-mail (opcional)">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="joao@email.com" />
        </Field>

        <Field label="Senha">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Mín. 8 caracteres, 1 número, 1 especial"
              className="pr-10"
              required
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </Field>

        <Field label="Confirmar senha">
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              value={form.confirmar_senha}
              onChange={(e) => set("confirmar_senha", e.target.value)}
              placeholder="Repita a senha"
              className={`pr-10 ${senhaError ? "border-red-400 bg-red-50" : ""}`}
              required
            />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirm((p) => !p)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {senhaError && <p className="text-red-500 text-xs mt-1">{senhaError}</p>}
        </Field>

        <Field label="Você é">
          <select value={form.tipo} onChange={(e) => set("tipo", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="comprador">Comprador</option>
            <option value="vendedor">Vendedor</option>
            <option value="ambos">Comprador e Vendedor</option>
          </select>
        </Field>

        {/* — Endereço — */}
        <SectionTitle>Endereço</SectionTitle>

        <Field label={cepLoading ? "CEP — buscando..." : "CEP"}>
          <Input
            value={form.cep}
            onChange={(e) => {
              const v = formatCep(e.target.value);
              set("cep", v);
              if (v.replace(/\D/g, "").length === 8) buscarCep(v);
            }}
            placeholder="00000-000"
            maxLength={9}
            disabled={cepLoading}
          />
        </Field>

        <EstadoCidadeSelect
          estado={form.estado}
          municipio={form.municipio}
          onEstadoChange={(uf) => set("estado", uf)}
          onMunicipioChange={(cidade) => set("municipio", cidade)}
          required
        />

        <Field label="Logradouro">
          <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, Avenida, Estrada..." />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Número">
            <input ref={numeroRef} value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </Field>
          <div className="col-span-2">
            <Field label="Complemento">
              <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, Sala, KM..." />
            </Field>
          </div>
        </div>

        <Field label="Bairro">
          <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} placeholder="Centro" />
        </Field>

        {/* — Propriedade — */}
        <SectionTitle>Propriedade rural</SectionTitle>

        <Field label="Nome do sítio / fazenda" hint="Opcional — aparece no seu perfil de vendedor">
          <Input
            value={form.nome_propriedade}
            onChange={(e) => set("nome_propriedade", e.target.value)}
            placeholder="Fazenda Santa Fé, Sítio Boa Esperança..."
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg py-3 font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors mt-2"
        >
          {loading ? "Cadastrando..." : "Criar conta"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/login" className="text-green-700 font-medium hover:underline">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
