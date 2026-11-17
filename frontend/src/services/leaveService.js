import api from "./api";

export const leaveService = {
  async getMyLeaveRequests() {
    const response = await api.get("/leave-requests/me");
    return response.data;
  },

  async getAllLeaveRequests(params = {}) {
    const response = await api.get("/leave-requests", { params });
    return response.data;
  },

  async createLeaveRequest(data) {
    const response = await api.post("/leave-requests", data);
    return response.data;
  },

  async approveLeaveRequest(id) {
    const response = await api.patch(`/leave-requests/${id}/approve`);
    return response.data;
  },

  async rejectLeaveRequest(id, reason) {
    const response = await api.patch(`/leave-requests/${id}/reject`, { reason });
    return response.data;
  },

  async getMyLeaveBalance(year) {
    const response = await api.get("/leave-balances/me", { params: { year } });
    return response.data;
  },

  async getUserLeaveBalance(userId, year) {
    const response = await api.get(`/leave-balances/${userId}`, { params: { year } });
    return response.data;
  },

  async getLeaveCalendar(params = {}) {
    const response = await api.get("/leave-requests/calendar", { params });
    return response.data;
  },
};
