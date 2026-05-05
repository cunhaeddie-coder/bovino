import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL: `${BASE}/admin`,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bovino_admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bovino_admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
