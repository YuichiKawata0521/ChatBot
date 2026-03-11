let ragQualityChart = null;

const toJpDateLabel = (rawDate) => {
    if (!rawDate) return '';

    const date = typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? new Date(`${rawDate}T00:00:00+09:00`)
        : new Date(rawDate);

    if (Number.isNaN(date.getTime())) return String(rawDate);

    return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
};

const toPercent = (value) => Number(value || 0) * 100;

const safeNumber = (value) => Number(value || 0);

const buildHoverInfo = ({ index, rawLabels, labels, hitRates, accuracyRates, ragResponseCounts, hitResponseCounts, ratedResponseCounts, goodResponseCounts }) => {
    const total = safeNumber(ragResponseCounts[index]);
    const hit = safeNumber(hitResponseCounts[index]);
    const rated = safeNumber(ratedResponseCounts[index]);
    const good = safeNumber(goodResponseCounts[index]);
    const bad = Math.max(0, rated - good);

    return {
        index,
        targetDate: rawLabels[index],
        displayDate: labels[index] || rawLabels[index],
        hitRate: Number(hitRates[index] || 0),
        accuracyRate: Number(accuracyRates[index] || 0),
        total,
        hit,
        rated,
        good,
        bad
    };
};

export const renderRagQualityTrendChart = (trendData, options = {}) => {
    const canvas = document.getElementById('ragAccuracyChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = (trendData?.labels || []).map(toJpDateLabel);
    const rawLabels = trendData?.labels || [];
    const hitRates = (trendData?.hitRates || []).map(toPercent);
    const accuracyRates = (trendData?.accuracyRates || []).map(toPercent);
    const ragResponseCounts = trendData?.ragResponseCounts || [];
    const hitResponseCounts = trendData?.hitResponseCounts || [];
    const ratedResponseCounts = trendData?.ratedResponseCounts || [];
    const goodResponseCounts = trendData?.goodResponseCounts || [];

    if (ragQualityChart) {
        ragQualityChart.destroy();
        ragQualityChart = null;
    }

    ragQualityChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'RAGヒット率',
                    data: hitRates,
                    borderColor: '#8e44ad',
                    backgroundColor: 'rgba(142, 68, 173, 0.14)',
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 3,
                    fill: false
                },
                {
                    label: '回答精度',
                    data: accuracyRates,
                    borderColor: '#16a085',
                    backgroundColor: 'rgba(22, 160, 133, 0.14)',
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (_event, elements) => {
                if (!elements || elements.length === 0) return;
                const index = elements[0].index;
                const targetDate = rawLabels[index];
                if (!targetDate || typeof options.onPointClick !== 'function') return;
                options.onPointClick({
                    index,
                    targetDate,
                    displayDate: labels[index] || targetDate
                });
            },
            onHover: (_event, elements) => {
                const hasElement = Boolean(elements && elements.length > 0);
                canvas.style.cursor = hasElement ? 'pointer' : 'default';

                if (typeof options.onPointHover !== 'function') return;
                if (!hasElement) {
                    options.onPointHover(null);
                    return;
                }

                const index = elements[0].index;
                const hoverInfo = buildHoverInfo({
                    index,
                    rawLabels,
                    labels,
                    hitRates,
                    accuracyRates,
                    ragResponseCounts,
                    hitResponseCounts,
                    ratedResponseCounts,
                    goodResponseCounts
                });
                options.onPointHover(hoverInfo);
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 110,
                    ticks: {
                        callback: (value) => {
                            const numeric = Number(value || 0);
                            if (numeric >= 110) return '';
                            return `${numeric.toFixed(0)}%`;
                        }
                    },
                    title: {
                        display: true,
                        text: '割合 (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${Number(ctx?.parsed?.y || 0).toFixed(1)}%`,
                        afterBody: (items) => {
                            const idx = items?.[0]?.dataIndex ?? 0;
                            const total = safeNumber(ragResponseCounts[idx]);
                            const hit = safeNumber(hitResponseCounts[idx]);

                            return [
                                '【RAG利用内訳】',
                                `・総質問数: ${total}`,
                                `・0.7超ヒット数: ${hit}`
                            ];
                        },
                        footer: (items) => {
                            if (!items || items.length === 0) return '';
                            return 'クリックして詳細を確認';
                        }
                    }
                }
            }
        }
    });
};
