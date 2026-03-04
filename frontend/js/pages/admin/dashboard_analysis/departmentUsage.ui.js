let departmentUsageChart = null;

const palette = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
    '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab'
];

const toPercentText = (value) => `${Number(value || 0).toFixed(1)}%`;

export const renderDepartmentUsageChart = (usageData, options = {}) => {
    const canvas = document.getElementById('deptPieChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const items = usageData?.items || [];
    const topItems = items.slice(0, 10);

    if (departmentUsageChart) {
        departmentUsageChart.destroy();
        departmentUsageChart = null;
    }

    if (!topItems.length) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    const labels = topItems.map((item) => item.departmentName || '未設定');
    const values = topItems.map((item) => Number(item.usageRate || 0));

    departmentUsageChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: topItems.map((_, index) => palette[index % palette.length]),
                    borderColor: '#ffffff',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const item = topItems[ctx.dataIndex] || {};
                            const rateText = toPercentText(item.usageRate);
                            return `${item.departmentName || '-'}: ${rateText} (${Number(item.messageCount || 0)}件)`;
                        }
                    }
                }
            },
            onClick: (_event, elements) => {
                if (!elements?.length || typeof options.onDepartmentClick !== 'function') return;
                const index = elements[0].index;
                const item = topItems[index];
                if (!item) return;
                options.onDepartmentClick(item);
            }
        }
    });
};
