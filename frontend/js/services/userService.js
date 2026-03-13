import { ApiClient } from "../common/apiClient";

export class userService {
    async getUsers(params = {}) {
        const response = await ApiClient.get('/users/', params);
        if (Array.isArray(response)) return response;
        return response?.data ?? [];
    }

    async getDepartments() {
        const response = await ApiClient.get('/users/departments');
        return response?.data?.departments ?? [];
    }

    async createUser(userData) {
        return await ApiClient.post('/users/', userData)
    }

    async updateUser(userId, userData) {
        return await ApiClient.put(`/users/${userId}`, userData);
    }

    async deleteUser(userId, mode = 'soft') {
        const normalizedMode = mode === 'hard' ? 'hard' : 'soft';
        return ApiClient.delete(`/users/${userId}?mode=${normalizedMode}`);
    }

    async restoreUser(userId) {
        return await ApiClient.post(`/users/${userId}/restore`, {});
    }

    async resetPassword(userId) {
        return await ApiClient.post(`/users/${userId}/reset-password`, {});
    }

    async uploadCsv(file) {
        const formData = new FormData();
        formData.append('file', file);
        return ApiClient.post('/users/csv', formData);
    }
}