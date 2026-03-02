import { ApiClient } from "../common/apiClient";

export class userService {
    async getUsers(params = {}) {
        return await ApiClient.get('/users/', params);
    }

    async createUser(userData) {
        return await ApiClient.post('/users/', userData)
    }

    async deleteUser(userId) {
        return ApiClient.delete(`/users/${userId}`);
    }

    async uploadCsv(file) {
        const formData = new FormData();
        formData.append('file', file);
        return ApiClient.post('/users/csv', formData);
    }
}