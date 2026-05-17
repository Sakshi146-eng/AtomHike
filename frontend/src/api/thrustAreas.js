import api from "./axiosInstance";

export const listThrustAreas    = ()          => api.get("/thrust-areas");
export const createThrustArea   = (data)      => api.post("/thrust-areas", data);
export const updateThrustArea   = (id, data)  => api.put(`/thrust-areas/${id}`, data);
export const deactivateThrustArea = (id)      => api.delete(`/thrust-areas/${id}`);
