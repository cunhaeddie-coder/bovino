const getBase = () =>
  process.env.INTERNAL_API_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.bovino.agr.br"
    : "http://localhost:8000");

export async function serverFetch<T>(
  path: string,
  options?: RequestInit & { revalidate?: number }
): Promise<T> {
  const { revalidate = 60, ...rest } = options ?? {};
  const res = await fetch(`${getBase()}/api/v1${path}`, {
    ...rest,
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}
