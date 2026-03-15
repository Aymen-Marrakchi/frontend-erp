import axios from "axios";

const fallbackBaseURL = "http://127.0.0.1:5000/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || fallbackBaseURL,
});

api.interceptors.request.use((config) => {
  const rawUser = localStorage.getItem("user");
  if (rawUser) {
    try {
      const token = JSON.parse(rawUser).token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem("user");
    }
  }
  return config;
});

export default api;
