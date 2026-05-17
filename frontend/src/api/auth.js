import api from "./axiosInstance";

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const refreshToken = (refresh_token) =>
  api.post("/auth/refresh", { refresh_token });

export const getMe = () => api.get("/auth/me");
