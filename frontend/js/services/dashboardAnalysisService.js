import { ApiClient } from '../common/apiClient.js';

export class dashboardAnalysisService {
    _toQuery(filters = {}) {
        const params = new URLSearchParams();

        const appendIf = (key, value) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                params.set(key, String(value));
            }
        };

        appendIf('period', filters.period);
        appendIf('fromDate', filters.fromDate);
        appendIf('toDate', filters.toDate);
        appendIf('dep1Name', filters.dep1Name);
        appendIf('dep2Name', filters.dep2Name);
        appendIf('dep3Name', filters.dep3Name);

        return params.toString();
    }

    async getActiveUserTrend(filters = {}) {
        const query = this._toQuery(filters);
        const endpoint = `/dashboard/analysis/active-user-trend${query ? `?${query}` : ''}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getCostTrend(filters = {}) {
        const query = this._toQuery(filters);
        const endpoint = `/dashboard/analysis/cost-trend${query ? `?${query}` : ''}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getRagQualityTrend(filters = {}) {
        const query = this._toQuery(filters);
        const endpoint = `/dashboard/analysis/rag-quality-trend${query ? `?${query}` : ''}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getRagQualityDetails(targetDate, filters = {}) {
        const params = new URLSearchParams();

        const appendIf = (key, value) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                params.set(key, String(value));
            }
        };

        appendIf('targetDate', targetDate);
        appendIf('period', filters.period);
        appendIf('fromDate', filters.fromDate);
        appendIf('toDate', filters.toDate);

        appendIf('dep1Name', filters.dep1Name);
        appendIf('dep2Name', filters.dep2Name);
        appendIf('dep3Name', filters.dep3Name);

        const endpoint = `/dashboard/analysis/rag-quality-details?${params.toString()}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getDepartmentUsage(filters = {}) {
        const query = this._toQuery(filters);
        const endpoint = `/dashboard/analysis/department-usage${query ? `?${query}` : ''}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getDepartmentMembers(department = {}, filters = {}) {
        const params = new URLSearchParams();

        const appendIf = (key, value) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                params.set(key, String(value));
            }
        };

        appendIf('period', filters.period);
        appendIf('fromDate', filters.fromDate);
        appendIf('toDate', filters.toDate);

        appendIf('dep1Name', department.dep1Name);
        appendIf('dep2Name', department.dep2Name);
        appendIf('dep3Name', department.dep3Name);

        const endpoint = `/dashboard/analysis/department-members?${params.toString()}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getRatingRecent(filters = {}) {
        const query = this._toQuery(filters);
        const endpoint = `/dashboard/analysis/rating-recent${query ? `?${query}` : ''}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }

    async getRatingList(rating, filters = {}) {
        const params = new URLSearchParams();
        params.set('rating', String(rating || ''));

        const appendIf = (key, value) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                params.set(key, String(value));
            }
        };

        appendIf('period', filters.period);
        appendIf('fromDate', filters.fromDate);
        appendIf('toDate', filters.toDate);
        appendIf('dep1Name', filters.dep1Name);
        appendIf('dep2Name', filters.dep2Name);
        appendIf('dep3Name', filters.dep3Name);

        const endpoint = `/dashboard/analysis/rating-list?${params.toString()}`;
        const response = await ApiClient.get(endpoint);
        return response?.data ?? null;
    }
}
