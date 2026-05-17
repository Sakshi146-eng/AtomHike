import api from "./axiosInstance";

export const createCycle        = (data)          => api.post("/cycles", data);
export const listCycles         = ()              => api.get("/cycles");
export const getActiveCycle     = ()              => api.get("/cycles/active");
export const activateCycle      = (id)            => api.post(`/cycles/${id}/activate`);
export const updateCycle        = (id, data)      => api.put(`/cycles/${id}`, data);
export const addQuarterWindow   = (id, data)      => api.post(`/cycles/${id}/quarters`, data);
export const getQuarterWindows  = (id)            => api.get(`/cycles/${id}/quarters`);
export const toggleWindow       = (windowId, isActive) => api.patch(`/cycles/quarters/${windowId}/toggle`, null, { params: { is_active: isActive } });
