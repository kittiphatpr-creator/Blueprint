import api from "./api";

export const announcementService = {
  async getAnnouncements() {
    const response = await api.get("/announcements");
    return response.data;
  },

  async createAnnouncement(data) {
    const isFormData = data instanceof FormData;
    const response = await api.post("/announcements", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },

  async updateAnnouncement(id, data) {
    const isFormData = data instanceof FormData;
    const response = await api.put(`/announcements/${id}`, data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },

  async deleteAnnouncement(id) {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
  },
};
