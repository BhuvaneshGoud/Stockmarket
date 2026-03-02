import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

const isLikelyJwt = (value) =>
  typeof value === "string" &&
  value !== "undefined" &&
  value !== "null" &&
  value.split(".").length === 3;

const normalizeToken = (value) => {
  if (typeof value !== "string") return null;
  const token = value.trim().replace(/^"+|"+$/g, "");
  return token || null;
};

api.interceptors.request.use(
  (config) => {
    const directToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const userToken = (() => {
      try {
        return savedUser ? JSON.parse(savedUser)?.token : null;
      } catch {
        return null;
      }
    })();
    const token = normalizeToken(
      isLikelyJwt(directToken) ? directToken : userToken
    );

    if (isLikelyJwt(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
};

export const stocksAPI = {
  getAll: () => api.get("/stocks"),
  getBySymbol: (symbol) => api.get(`/stocks/${symbol}`),
  search: (q) => api.get(`/stocks/search?q=${encodeURIComponent(q)}`),
};

export const marketAPI = {
  getIntraday: (symbol) => api.get(`/market/${symbol}`),
  getDelivery: (symbol) => api.get(`/market/${symbol}/delivery`),
};

export const portfolioAPI = {
  getPortfolio: () => api.get("/portfolio"),
  getSummary: () => api.get("/portfolio/value"),
  getTransactions: () => api.get("/portfolio/transactions"),
  buyStock: (data) => api.post("/portfolio/buy", data),
  sellStock: (data) => api.post("/portfolio/sell", data),
};

export const walletAPI = {
  getBalance: () => api.get("/wallet"),
  addMoney: (data) => api.post("/wallet/add", data),
};

export default api;
