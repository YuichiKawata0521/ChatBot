let activeUserChart = null;

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

export const renderActiveUserTrendChart = (trendData) => {
    const canvas = document.getElementById('activeUserChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = (trendData?.labels || []).map(toJpDateLabel);
    const activeUserCounts = trendData?.activeUserCounts || [];

    if (activeUserChart) {
        activeUserChart.destroy();
        activeUserChart = null;
    }

    activeUserChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'アクティブユーザー数',
                    data: activeUserCounts,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.12)',
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
                        precision: 0,
                        callback: (value) => Number.isInteger(value) ? value : ''
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
                }
            }
        }
    });
};
