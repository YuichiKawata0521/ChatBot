import { dashboardOperationService } from '../../../services/dashboardOperationService.js';
import { calculateOperationKpiSummary } from './kpiMetrics.util.js';
import { formatOperationKpiDisplay } from './kpiFormat.util.js';
import { renderKpiGrid } from './kpiGrid.ui.js';
import { renderOperationTrendChart } from './operationTrend.ui.js';
import { renderLowUsageDepartmentRanking } from './departmentRanking.ui.js';
import { renderRagQualityMetrics } from './ragQuality.ui.js';
import { renderOperationCost } from './cost.ui.js';
import { requireAuth } from '../../../common/authGuard.js';

function jumpToAnalysis() {
    const btn = document.getElementById('analysis-link');
    btn.addEventListener('click', () => {
        window.open('/dashboard_analysis', '_blank')
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) {
        return;
    }

    jumpToAnalysis();
    const service = new dashboardOperationService();
    const monthScopeSelect = document.getElementById('kpi-month-scope');

    const loadKpi = async () => {
        const scope = monthScopeSelect?.value || 'current';

        try {
            const [rawMetrics, trendData, rankingData, ragQualityData, costData] = await Promise.all([
                service.getKpiRawMetrics(scope),
                service.getOperationTrend(scope),
                service.getLowUsageDepartmentRanking(scope),
                service.getOperationRagQuality(scope),
                service.getOperationCost(scope)
            ]);

            const summary = calculateOperationKpiSummary(rawMetrics);
            const displayData = formatOperationKpiDisplay(summary);
            renderKpiGrid(displayData);
            renderOperationTrendChart(trendData);
            renderLowUsageDepartmentRanking(rankingData);
            renderRagQualityMetrics(ragQualityData);
            renderOperationCost(costData);
        } catch (error) {
            console.error('運用KPIの描画に失敗しました', error);
        }
    };

    monthScopeSelect?.addEventListener('change', loadKpi);

    try {
        await loadKpi();
    } catch (error) {
        console.error('運用KPIの初期ロードに失敗しました', error);
    }
});
