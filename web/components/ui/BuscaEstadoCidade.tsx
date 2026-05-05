"use client";

import { useState } from "react";
import { ESTADOS_UF } from "@/lib/estados";
import { useCidades } from "@/hooks/useCidades";

const SEL = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

interface Props {
  defaultEstado?: string;
  defaultMunicipio?: string;
}

export function BuscaEstadoCidade({ defaultEstado = "", defaultMunicipio = "" }: Props) {
  const [uf, setUf] = useState(defaultEstado);
  const cidades = useCidades(uf);

  return (
    <>
      <select
        name="estado"
        value={uf}
        onChange={(e) => setUf(e.target.value)}
        className={SEL}
      >
        <option value="">Estado</option>
        {ESTADOS_UF.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>

      {cidades.length > 0 ? (
        <select name="municipio" defaultValue={defaultMunicipio} className={SEL}>
          <option value="">Cidade</option>
          {cidades.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      ) : (
        <input
          name="municipio"
          type="text"
          defaultValue={defaultMunicipio}
          placeholder={uf ? "Qualquer cidade" : "Cidade"}
          className={SEL}
        />
      )}
    </>
  );
}
