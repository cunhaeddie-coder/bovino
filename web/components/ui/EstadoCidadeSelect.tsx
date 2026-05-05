"use client";

import { ESTADOS_UF, ESTADOS_NOME } from "@/lib/estados";
import { useCidades } from "@/hooks/useCidades";

const SELECT_CLASS =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-green-500 bg-white " +
  "disabled:bg-gray-50 disabled:text-gray-400";

interface Props {
  estado: string;
  municipio: string;
  onEstadoChange: (uf: string) => void;
  onMunicipioChange: (cidade: string) => void;
  /** Layout padrão: dois campos em linha. false = empilhados */
  inline?: boolean;
  required?: boolean;
}

export function EstadoCidadeSelect({
  estado,
  municipio,
  onEstadoChange,
  onMunicipioChange,
  inline = true,
  required = false,
}: Props) {
  const cidades = useCidades(estado);

  function handleEstado(uf: string) {
    onEstadoChange(uf);
    onMunicipioChange(""); // limpa cidade ao trocar estado
  }

  const wrapper = inline
    ? "grid grid-cols-2 gap-3"
    : "flex flex-col gap-3";

  return (
    <div className={wrapper}>
      {/* Estado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          value={estado}
          onChange={(e) => handleEstado(e.target.value)}
          className={SELECT_CLASS}
          required={required}
        >
          <option value="">Selecione</option>
          {ESTADOS_UF.map((uf) => (
            <option key={uf} value={uf}>
              {uf} — {ESTADOS_NOME[uf]}
            </option>
          ))}
        </select>
      </div>

      {/* Município */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Município{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {cidades.length > 0 ? (
          <select
            value={municipio}
            onChange={(e) => onMunicipioChange(e.target.value)}
            className={SELECT_CLASS}
            required={required}
          >
            <option value="">Selecione a cidade</option>
            {cidades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={municipio}
            onChange={(e) => onMunicipioChange(e.target.value)}
            placeholder={estado ? "Carregando..." : "Selecione o estado primeiro"}
            className={SELECT_CLASS}
            disabled={!estado}
            required={required}
          />
        )}
      </div>
    </div>
  );
}
