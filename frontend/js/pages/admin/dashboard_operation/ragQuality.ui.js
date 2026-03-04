const formatPercent = (value) => {
    const ratio = Number(value || 0);
    return `${(ratio * 100).toFixed(1)}%`;
};

const formatFixed = (value, digits = 2) => {
    return Number(value || 0).toFixed(digits);
};

export const renderRagQualityMetrics = (metrics) => {
    const ragHitRateEl = document.getElementById('rag-hit-rate');
    const ragAvgChunksEl = document.getElementById('rag-avg-chunks');
    if (!ragHitRateEl || !ragAvgChunksEl) return;

    ragHitRateEl.textContent = formatPercent(metrics?.hitRate);
    ragAvgChunksEl.textContent = formatFixed(metrics?.avgParentChunkCount, 2);
};
