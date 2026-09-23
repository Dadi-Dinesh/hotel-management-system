import axios from "axios";
import { notifyNetworkError } from "./pwa/networkEvents";

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
    // Platform Owners only: which restaurant the RestaurantSwitcher has selected.
    // Restaurant-scoped staff ignore this — the server always trusts their own
    // account's restaurantId over any client-supplied header.
    const selectedRestaurantId = localStorage.getItem("selectedRestaurantId");
    if (selectedRestaurantId) {
      config.headers["X-Restaurant-Id"] = selectedRestaurantId;
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
      notifyNetworkError();
    }
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        // Only redirect if on protected routes
        if (path.startsWith("/captain") || path.startsWith("/admin") || path.startsWith("/kitchen")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          if (path.startsWith("/admin")) {
            window.location.href = "/admin/login";
          } else if (path.startsWith("/kitchen")) {
            window.location.href = "/kitchen/login";
          } else {
            window.location.href = "/captain/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
