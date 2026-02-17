 import { AppError } from "./AppError.js";
const BASE_URL = '/api/v1';

export class ApiClient {
    static async #getCsrfToken() {
        try {
            const response = await fetch(`${BASE_URL}/csrf-token`);
            if (!response.ok) throw new Error('Failed to fetch CSRF Token');
            const data = await response.json();
            return data.csrfToken;
        } catch (error) {
            console.error('CSRF Token fetch Error: ', error);
            return null;
        }
    }

    static async post(endpoint, body) {
        const csrfToken = await this.#getCsrfToken();
        const headers = {
            'Content-Type': 'application/json',
        };

        if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
        }
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: headers,
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new AppError(data.message || 'API Error occured', response.status);
            }
            return data;
        } catch (error) {
            console.error('API Call Error: ', error);
            throw error;
        }
    }

    static async get(endpoint) {
        const csrfToken = await this.#getCsrfToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
        }
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'GET',
                credentials: 'include',
                headers: headers
            });
            const data = await response.json();

            if (!response.ok) {
                throw new AppError(data.message || 'API Error occured', response.status);
            }
            return data;
        } catch (error) {
            console.error('API Call Error: ', error);
            throw error;
        }
    }
} 