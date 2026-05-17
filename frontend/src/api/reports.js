import api from "./axiosInstance";

export const getAchievementReport  = (cycleId) => api.get("/reports/achievement", { params: cycleId ? { cycle_id: cycleId } : {} });
export const exportAchievement     = (format = "csv") => api.get("/reports/achievement/export", { params: { format }, responseType: "blob" });
export const getCompletionReport   = (cycleId) => api.get("/reports/completion",   { params: cycleId ? { cycle_id: cycleId } : {} });
export const exportCompletion      = (format = "csv") => api.get("/reports/completion/export", { params: { format }, responseType: "blob" });
export const getAuditTrail         = (params)  => api.get("/reports/audit", { params });
export const exportAudit           = (format = "csv") => api.get("/reports/audit/export", { params: { format }, responseType: "blob" });
