import api from "./axiosInstance";

export const getMyGoals       = (cycleId) => api.get("/goals",              { params: cycleId ? { cycle_id: cycleId } : {} });
export const getTeamGoals     = (cycleId) => api.get("/goals/team",         { params: cycleId ? { cycle_id: cycleId } : {} });
export const getAllGoals       = (cycleId) => api.get("/goals/admin/all",    { params: cycleId ? { cycle_id: cycleId } : {} });
export const getGoalDetail    = (id)      => api.get(`/goals/${id}`);
export const createGoal       = (data)    => api.post("/goals", data);
export const updateGoal       = (id, data)=> api.put(`/goals/${id}`, data);
export const deleteGoal       = (id)      => api.delete(`/goals/${id}`);
export const submitGoals      = ()        => api.post("/goals/submit");
export const approveGoal      = (id)      => api.post(`/goals/${id}/approve`);
export const rejectGoal       = (id, reason) => api.post(`/goals/${id}/reject`, { reason });
export const managerEditGoal  = (id, data)   => api.put(`/goals/${id}/manager-edit`, data);
export const unlockGoal       = (id)         => api.post(`/goals/${id}/unlock`);
export const shareGoal        = (data)        => api.post("/goals/share", data);
export const getSharedCopies  = (masterId)    => api.get(`/goals/shared/${masterId}`);

