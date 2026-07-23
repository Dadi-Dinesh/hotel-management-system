import axios from "axios";

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:4000/api";
  }
  return "https://hotel-management-system-k5zr.onrender.com/api";
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle expired tokens and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response && error.message === "Network Error") {
      console.warn("API Connection Error: Backend server unreachable at", API_BASE);
    }
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        // Only redirect if on protected routes
        if (path.startsWith("/captain") || path.startsWith("/admin")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = path.startsWith("/admin")
            ? "/admin/login"
            : "/captain/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
