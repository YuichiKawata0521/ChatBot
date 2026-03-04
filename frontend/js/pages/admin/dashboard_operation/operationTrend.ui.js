let operationTrendChart = null;

const toJpDateLabel = (rawDate) => {
    if (!rawDate) return '';

    const date = (() => {
        if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return new Date(`${rawDate}T00:00:00+09:00`);
        }
        return new Date(rawDate);
    })();

    if (Number.isNaN(date.getTime())) {
        return String(rawDate);
    }

    return new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
};

export const renderOperationTrendChart = (trendData) => {
    const canvas = document.getElementById('operationTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = (trendData?.labels || []).map(toJpDateLabel);
    const messageCounts = trendData?.messageCounts || [];
    const activeUserCounts = trendData?.activeUserCounts || [];

    if (operationTrendChart) {
        operationTrendChart.destroy();
        operationTrendChart = null;
    }

    operationTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'メッセージ数',
                    data: messageCounts,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.12)',
                    borderWidth: 2,
                    tension: 0.25,
                    yAxisID: 'yMessage',
                    pointRadius: 3
                },
                {
                    label: 'アクティブユーザー数',
                    type: 'bar',
                    data: activeUserCounts,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(46, 204, 113, 0.45)',
                    borderWidth: 1,
                    yAxisID: 'yUser',
                    barPercentage: 0.7,
                    categoryPercentage: 0.8,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                yMessage: {
                    type: 'linear',
                    position: 'left',
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        callback: (value) => Number.isInteger(value) ? value : ''
                    },
                    title: {
                        display: true,
                        text: 'メッセージ数'
                    }
                },
                yUser: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        callback: (value) => Number.isInteger(value) ? value : ''
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: 'アクティブユーザー数'
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
                        title: (items) => {
                            const idx = items?.[0]?.dataIndex ?? 0;
                            return labels[idx] || '';
                        }
                    }
                }
            }
        }
    });
};
