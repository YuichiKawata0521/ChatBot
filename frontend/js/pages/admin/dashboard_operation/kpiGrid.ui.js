const applyTrend = (element, trend) => {
    if (!element || !trend) return;
    element.classList.remove('trend-up', 'trend-down');
    element.classList.add(trend.className);
    element.textContent = trend.text;
};

const formatJstDateTime = (iso) => {
    const date = iso ? new Date(iso) : new Date();
    return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date).replace(/\//g, '/');
};

export const renderKpiGrid = (displayData) => {
    const monthLabelEl = document.getElementById('kpi-month-label');
    const lastUpdatedEl = document.getElementById('kpi-last-updated');
    const dauValueEl = document.getElementById('kpi-dau');
    const ragValueEl = document.getElementById('kpi-rag-rate');
    const retentionValueEl = document.getElementById('kpi-retention');
    const errorValueEl = document.getElementById('kpi-error-rate');

    const dauTrendEl = document.getElementById('kpi-dau-trend');
    const ragTrendEl = document.getElementById('kpi-rag-rate-trend');
    const retentionTrendEl = document.getElementById('kpi-retention-trend');
    const errorTrendEl = document.getElementById('kpi-error-rate-trend');
    const trendElements = [dauTrendEl, ragTrendEl, retentionTrendEl, errorTrendEl].filter(Boolean);

    if (monthLabelEl) {
        monthLabelEl.textContent = `対象月: ${displayData.monthLabel || '--'}`;
    }

    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `最終更新: ${formatJstDateTime(displayData.lastUpdated)}`;
    }

    if (dauValueEl) dauValueEl.textContent = displayData.dau.value;
    if (ragValueEl) ragValueEl.textContent = displayData.ragUsageRate.value;
    if (retentionValueEl) retentionValueEl.textContent = displayData.retention.value;
    if (errorValueEl) errorValueEl.textContent = displayData.errorRate.value;

    if (!displayData.showTrend) {
        trendElements.forEach((element) => {
            element.hidden = true;
            element.textContent = '';
            element.classList.remove('trend-up', 'trend-down');
        });
        return;
    }

    trendElements.forEach((element) => {
        element.hidden = false;
    });

    applyTrend(dauTrendEl, displayData.dau.trend);
    applyTrend(ragTrendEl, displayData.ragUsageRate.trend);
    applyTrend(retentionTrendEl, displayData.retention.trend);
    applyTrend(errorTrendEl, displayData.errorRate.trend);
};
