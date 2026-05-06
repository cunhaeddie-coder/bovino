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
  // Para FormData o browser deve definir o Content-Type com boundary automaticamente
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const token = localStorage.getItem("bovino_token");

      // Tenta refresh automático antes de deslogar
      if (token && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(
            "/api/v1/auth/refresh",
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          localStorage.setItem("bovino_token", data.token);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api(error.config);
        } catch {
          localStorage.removeItem("bovino_token");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("bovino_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
