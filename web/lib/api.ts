import axios from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bovino_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bovino_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
