import axios from "axios";

const api = axios.create({
  baseURL: "https://lyra-backend-production-98b7.up.railway.app/api",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;