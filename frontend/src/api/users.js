import api from "./axiosInstance";

export const createUser     = (data)      => api.post("/users", data);
export const listUsers      = (role)      => api.get("/users", { params: role ? { role } : {} });
export const getUser        = (id)        => api.get(`/users/${id}`);
export const updateUser     = (id, data)  => api.put(`/users/${id}`, data);
export const deactivateUser = (id)        => api.delete(`/users/${id}`);
export const getTeam        = ()          => api.get("/users/team");
