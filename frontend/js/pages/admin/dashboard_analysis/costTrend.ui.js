let costChart = null;

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

export const renderCostTrendChart = (trendData) => {
    const canvas = document.getElementById('costChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = (trendData?.labels || []).map(toJpDateLabel);
    const costAmounts = trendData?.costAmounts || [];

    if (costChart) {
        costChart.destroy();
        costChart = null;
    }

    costChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'コスト (USD)',
                    data: costAmounts,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.14)',
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `$${Number(value || 0).toFixed(5)}`
                    },
                    title: {
                        display: true,
                        text: 'コスト (USD)'
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
                        label: (ctx) => `コスト: $${Number(ctx?.parsed?.y || 0).toFixed(5)}`
                    }
                }
            }
        }
    });
};
