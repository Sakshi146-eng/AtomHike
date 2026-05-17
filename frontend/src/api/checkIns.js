import api from "./axiosInstance";

export const submitCheckIn        = (data)    => api.post("/checkins", data);
export const updateCheckIn        = (id, data)=> api.put(`/checkins/${id}`, data);
export const getGoalCheckIns      = (goalId)  => api.get(`/checkins/goal/${goalId}`);
export const getTeamQuarterStatus = (quarter) => api.get(`/checkins/team/${quarter}`);
export const addComment           = (id, content) => api.post(`/checkins/${id}/comment`, { content });
