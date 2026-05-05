"use client";

import { useState, useEffect } from "react";

let cache: Record<string, string[]> | null = null;
let promise: Promise<Record<string, string[]>> | null = null;

function loadCidades(): Promise<Record<string, string[]>> {
  if (cache) return Promise.resolve(cache);
  if (promise) return promise;
  promise = fetch("/data/cidades.json")
    .then((r) => r.json())
    .then((data) => { cache = data; return data; });
  return promise;
}

export function useCidades(uf: string | null | undefined) {
  const [cidades, setCidades] = useState<string[]>([]);

  useEffect(() => {
    if (!uf) { setCidades([]); return; }
    loadCidades().then((data) => setCidades(data[uf] ?? []));
  }, [uf]);

  return cidades;
}
