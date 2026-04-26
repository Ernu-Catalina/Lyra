import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                    "https://lyra-backend-production-98b7.up.railway.app";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;