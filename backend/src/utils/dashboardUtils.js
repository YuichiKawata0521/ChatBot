export const safeNumber = (value) => Number(value || 0);
export const safeDivide = (numerator, denominator) => (denominator ? numerator / denominator : 0);
export const safeRate = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const formatYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const formatTokyoYmd = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value || '');
    }

    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(date);
};

export const isValidYmd = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

export const buildAnalysisDateRange = (query = {}) => {
    const now = new Date();
    const period = String(query.period || 'last30');

    if (period === 'custom' && isValidYmd(query.fromDate) && isValidYmd(query.toDate)) {
        return {
            period,
            fromDate: query.fromDate,
            toDate: query.toDate
        };
    }

    if (period === 'current') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { period, fromDate: formatYmd(start), toDate: formatYmd(end) };
    }

    if (period === 'previous') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { period, fromDate: formatYmd(start), toDate: formatYmd(end) };
    }

    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { period: 'last30', fromDate: formatYmd(start), toDate: formatYmd(end) };
};

export const buildDateContext = (scope = 'current') => {
    const now = new Date();
    const target = scope === 'previous'
        ? new Date(now.getFullYear(), now.getMonth(), 0)
        : now;

    const yesterday = new Date(target);
    yesterday.setDate(target.getDate() - 1);

    const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
    const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);

    return {
        scope,
        monthLabel: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`,
        todayDate: formatYmd(target),
        yesterdayDate: formatYmd(yesterday),
        monthStartDate: formatYmd(monthStart),
        monthEndDate: formatYmd(monthEnd)
    };
};

export const resolveRequestedScope = (query = {}) => (query?.scope === 'previous' ? 'previous' : 'current');

export const getDepartmentFilters = (query = {}) => ({
    dep1Name: String(query?.dep1Name || '').trim() || null,
    dep2Name: String(query?.dep2Name || '').trim() || null,
    dep3Name: String(query?.dep3Name || '').trim() || null
});
