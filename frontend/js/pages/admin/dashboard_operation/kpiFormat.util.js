const percent = (ratio, digits = 1) => `${(Number(ratio || 0) * 100).toFixed(digits)}%`;

const formatSignedPercentDiff = (currentRatio, previousRatio, digits = 1) => {
    const current = Number(currentRatio || 0) * 100;
    const previous = Number(previousRatio || 0) * 100;
    const diff = current - previous;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(digits)}pt`;
};

const toTrend = ({ current, previous, upIsGood = true, label = 'vs yesterday' }) => {
    const diff = Number(current || 0) - Number(previous || 0);
    const isUp = diff >= 0;
    const trendClass = isUp === upIsGood ? 'trend-up' : 'trend-down';
    const arrow = isUp ? '▲' : '▼';
    const ratio = previous === 0 ? 0 : Math.abs((diff / previous) * 100);

    return {
        className: trendClass,
        text: `${arrow} ${ratio.toFixed(1)}% ${label}`
    };
};

export const formatOperationKpiDisplay = (kpiSummary) => {
    const scope = kpiSummary.raw?.scope || 'current';
    const showTrend = scope === 'current';

    const dauTrend = toTrend({
        current: kpiSummary.dau,
        previous: kpiSummary.previousDay.dau,
        upIsGood: true
    });

    const ragTrend = toTrend({
        current: kpiSummary.ragUsageRate,
        previous: kpiSummary.previousDay.ragUsageRate,
        upIsGood: true
    });

    const errorTrend = {
        className: (kpiSummary.errorRate <= kpiSummary.previousDay.errorRate) ? 'trend-up' : 'trend-down',
        text: `${kpiSummary.errorRate <= kpiSummary.previousDay.errorRate ? '▼' : '▲'} ${formatSignedPercentDiff(kpiSummary.errorRate, kpiSummary.previousDay.errorRate, 1).replace('+', '')} vs yesterday`
    };

    const retention7 = percent(kpiSummary.retention7dRate, 0);
    const retention30 = percent(kpiSummary.retention30dRate, 0);

    return {
        scope,
        showTrend,
        monthLabel: kpiSummary.raw?.monthLabel || '--',
        lastUpdated: kpiSummary.raw?.fetchedAt || new Date().toISOString(),
        dau: {
            value: String(kpiSummary.dau),
            trend: dauTrend
        },
        ragUsageRate: {
            value: percent(kpiSummary.ragUsageRate, 1),
            trend: ragTrend
        },
        retention: {
            value: `${retention7} / ${retention30}`,
            trend: {
                className: 'trend-up',
                text: `7日再利用: ${kpiSummary.raw?.retention?.reusedWithin7Days || 0}人 / 30日再利用: ${kpiSummary.raw?.retention?.reusedWithin30Days || 0}人`
            }
        },
        errorRate: {
            value: percent(kpiSummary.errorRate, 1),
            trend: errorTrend
        }
    };
};
