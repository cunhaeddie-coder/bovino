"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Plano } from "@/lib/types";

export default function PlanoCardAction({
  plano,
  destaque,
}: {
  plano: Plano;
  destaque?: boolean;
}) {
  const { token } = useAuthStore();
  const router = useRouter();

  function handleAssinar() {
    if (plano.tipo === "anunciante") {
      router.push("/anunciante/cadastro");
      return;
    }

    if (!token) {
      router.push(`/login?next=/planos/checkout?plano=${plano.slug}`);
      return;
    }

    router.push(`/planos/checkout?plano=${plano.slug}`);
  }

  const btnBase = `w-full mt-8 py-3 rounded-full font-bold text-sm transition`;
  const btnStyle = destaque
    ? `${btnBase} bg-green-600 hover:bg-green-700 text-white`
    : `${btnBase} bg-gray-100 hover:bg-gray-200 text-gray-900`;

  return (
    <button onClick={handleAssinar} className={btnStyle}>
      {plano.tipo === "anunciante" ? "Cadastrar empresa" : "Assinar agora"}
    </button>
  );
}
