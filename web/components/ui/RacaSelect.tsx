"use client";

import { RACAS_GRUPOS } from "@/lib/racas";

const SELECT_CLASS =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-green-500 bg-white " +
  "disabled:bg-gray-50 disabled:text-gray-400";

interface Props {
  value: string;
  onChange: (raca: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function RacaSelect({
  value,
  onChange,
  placeholder = "Selecione a raça",
  required = false,
  className,
}: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? SELECT_CLASS}
      required={required}
    >
      <option value="">{placeholder}</option>
      {RACAS_GRUPOS.map((grupo) => (
        <optgroup key={grupo.aptidao} label={`── ${grupo.aptidao} ──`}>
          {grupo.racas.map((raca) => (
            <option key={raca} value={raca}>
              {raca}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
