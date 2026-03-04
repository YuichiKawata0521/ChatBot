import { ApiClient } from '../common/apiClient.js';

export class dashboardOperationService {
    async getKpiRawMetrics(scope = 'current') {
        const response = await ApiClient.get(`/dashboard/operation/kpi?scope=${encodeURIComponent(scope)}`);
        return response?.data ?? null;
    }

    async getOperationTrend(scope = 'current') {
        const response = await ApiClient.get(`/dashboard/operation/trend?scope=${encodeURIComponent(scope)}`);
        return response?.data ?? null;
    }

    async getOperationRagQuality(scope = 'current') {
        const response = await ApiClient.get(`/dashboard/operation/rag-quality?scope=${encodeURIComponent(scope)}`);
        return response?.data ?? null;
    }

    async getOperationCost(scope = 'current') {
        const response = await ApiClient.get(`/dashboard/operation/cost?scope=${encodeURIComponent(scope)}`);
        return response?.data ?? null;
    }

    async getLowUsageDepartmentRanking(scope = 'current') {
        const response = await ApiClient.get(`/dashboard/operation/low-usage-departments?scope=${encodeURIComponent(scope)}`);
        return response?.data ?? null;
    }
}
