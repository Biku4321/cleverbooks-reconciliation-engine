import axios from "axios";

const api = axios.create({ baseURL: "https://cleverbooks-backend.onrender.com/api" });

export const uploadSettlements = (formData) => api.post("/settlements/upload", formData);
export const getSettlements    = (status)   => api.get("/settlements", { params: { status } });
export const getSettlement     = (id)       => api.get(`/settlements/${id}`);
export const triggerReconcile  = ()         => api.post("/settlements/reconcile");
export const getJobs           = ()         => api.get("/jobs");
export const getNotifications  = (status)   => api.get("/notifications", { params: { status } });