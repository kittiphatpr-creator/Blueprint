import api from "./api";

export const authService = {
  async login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  async loginWithGoogle(credential) {
    const response = await api.post("/auth/google", { credential });
    return response.data;
  },

  async registerWithGoogle(data) {
    const response = await api.post("/auth/register-google", data);
    return response.data;
  },

  async getDepartments() {
    const response = await api.get("/auth/departments");
    return response.data;
  },

  async getMe() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put("/auth/profile", data);
    return response.data;
  },

  async uploadAvatar(data) {
    const isFormData = data instanceof FormData;
    const response = await api.post("/auth/avatar", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async sendResetOtp(email) {
    const response = await api.post("/auth/forgot-password/send-otp", { email });
    return response.data;
  },

  async verifyByEmployeeCode(email, employee_code) {
    const response = await api.post("/auth/forgot-password/verify-code", { email, employee_code });
    return response.data;
  },

  async verifyResetOtp(email, otp) {
    const response = await api.post("/auth/forgot-password/verify-otp", { email, otp });
    return response.data;
  },

  async resetPasswordWithOtp(data) {
    const response = await api.post("/auth/forgot-password/reset", data);
    return response.data;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  },
};
