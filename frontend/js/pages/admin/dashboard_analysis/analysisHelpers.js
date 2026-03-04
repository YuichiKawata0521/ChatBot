export const toYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const toTokyoYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(date);
};

export const normalizeToYmd = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const plainYmd = text.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (plainYmd) return plainYmd[1];

    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
        const isoDate = new Date(text);
        const isoYmd = toTokyoYmd(isoDate);
        if (isoYmd) return isoYmd;
    }

    const ymdWithSlash = text.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
    if (ymdWithSlash) {
        const [, y, m, d] = ymdWithSlash;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const mdyWithSlash = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (mdyWithSlash) {
        const [, m, d, y] = mdyWithSlash;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
        return toTokyoYmd(date);
    }

    return '';
};

export const getPeriodRange = (period) => {
    const now = new Date();

    if (period === 'current') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end, label: `${toYmd(start)} 〜 ${toYmd(end)}` };
    }

    if (period === 'previous') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end, label: `${toYmd(start)} 〜 ${toYmd(end)}` };
    }

    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(end.getDate() - 29);
    return { start, end, label: `${toYmd(start)} 〜 ${toYmd(end)}` };
};

export const setSelectOptions = (selectElement, values, defaultLabel) => {
    if (!selectElement) return;

    selectElement.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultLabel;
    selectElement.appendChild(defaultOption);

    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    });
};

export const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

export const formatNumber = (value) => Number(value || 0).toLocaleString('ja-JP');
export const formatUsd = (value) => `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5
})}`;

export const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const formatJpDateTime = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
        return text;
    }

    const parts = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(date);

    const getPart = (type) => parts.find((part) => part.type === type)?.value || '0';

    return `${getPart('year')}年${getPart('month')}月${getPart('day')}日${getPart('hour')}時${getPart('minute')}分${getPart('second')}秒`;
};

export const buildDepartmentUsageRowsHtml = (items = []) => {
    if (!items.length) {
        return `
            <tr>
                <td colspan="5" style="padding:12px; color:#7f8c8d;">対象データがありません</td>
            </tr>
        `;
    }

    return items.map((item, index) => {
        const rateText = `${Number(item?.usageRate || 0).toFixed(1)}%`;
        const depLabel = item?.departmentName || '未設定';
        const costText = formatUsd(item?.estimatedCostUsd || 0);
        return `
            <tr
                class="analysis-department-usage-row"
                data-index="${index}"
                style="border-bottom:1px solid #eee; cursor:pointer;"
                title="クリックで所属社員一覧を表示"
            >
                <td style="padding:12px; color:#1f6feb;">${escapeHtml(depLabel)}</td>
                <td style="padding:12px;">${escapeHtml(formatNumber(item?.activeUserCount || 0))}</td>
                <td style="padding:12px;">${escapeHtml(formatNumber(item?.messageCount || 0))}</td>
                <td style="padding:12px;">${escapeHtml(rateText)}</td>
                <td style="padding:12px;">${escapeHtml(costText)}</td>
            </tr>
        `;
    }).join('');
};

export const aggregateDepartmentUsageItems = (baseItems = [], selected = {}) => {
    const selectedDep1 = selected.dep1 || '';
    const selectedDep2 = selected.dep2 || '';
    const selectedDep3 = selected.dep3 || '';

    const filtered = baseItems.filter((item) => {
        if (selectedDep1 && item.dep1Name !== selectedDep1) return false;
        if (selectedDep2 && item.dep2Name !== selectedDep2) return false;
        if (selectedDep3 && item.dep3Name !== selectedDep3) return false;
        return true;
    });

    let groupLevel = 'dep1';
    if (selectedDep3) {
        groupLevel = 'single';
    } else if (selectedDep2) {
        groupLevel = 'dep3';
    } else if (selectedDep1) {
        groupLevel = 'dep2';
    }

    const groups = new Map();
    filtered.forEach((item) => {
        const dep1Name = String(item.dep1Name || '').trim();
        const dep2Name = String(item.dep2Name || '').trim();
        const dep3Name = String(item.dep3Name || '').trim();

        let key = '';
        let label = '';
        let queryDep1 = '';
        let queryDep2 = '';
        let queryDep3 = '';

        if (groupLevel === 'single') {
            key = `${dep1Name}|${dep2Name}|${dep3Name}`;
            label = [dep1Name, dep2Name, dep3Name].filter(Boolean).join(' / ') || '未設定';
            queryDep1 = selectedDep1 || dep1Name;
            queryDep2 = selectedDep2 || dep2Name;
            queryDep3 = selectedDep3 || dep3Name;
        } else if (groupLevel === 'dep3') {
            key = `${dep1Name}|${dep2Name}|${dep3Name || '__empty__'}`;
            label = dep3Name || '未設定';
            queryDep1 = selectedDep1 || dep1Name;
            queryDep2 = selectedDep2 || dep2Name;
            queryDep3 = dep3Name;
        } else if (groupLevel === 'dep2') {
            key = `${dep1Name}|${dep2Name || '__empty__'}`;
            label = dep2Name || '未設定';
            queryDep1 = selectedDep1 || dep1Name;
            queryDep2 = dep2Name;
            queryDep3 = '';
        } else {
            key = dep1Name || '__empty__';
            label = dep1Name || '未設定';
            queryDep1 = dep1Name;
            queryDep2 = '';
            queryDep3 = '';
        }

        if (!groups.has(key)) {
            groups.set(key, {
                departmentName: label,
                dep1Name: queryDep1,
                dep2Name: queryDep2,
                dep3Name: queryDep3,
                messageCount: 0,
                activeUserCount: 0,
                estimatedCostUsd: 0
            });
        }

        const bucket = groups.get(key);
        bucket.messageCount += Number(item.messageCount || 0);
        bucket.activeUserCount += Number(item.activeUserCount || 0);
        bucket.estimatedCostUsd += Number(item.estimatedCostUsd || 0);
    });

    const aggregated = Array.from(groups.values());

    const totalMessages = aggregated.reduce((sum, row) => sum + Number(row.messageCount || 0), 0);

    return aggregated
        .map((item) => ({
            ...item,
            usageRate: totalMessages > 0 ? Number(((item.messageCount / totalMessages) * 100).toFixed(2)) : 0,
            estimatedCostUsd: Number((item.estimatedCostUsd || 0).toFixed(5))
        }))
        .sort((a, b) => Number(b.messageCount || 0) - Number(a.messageCount || 0));
};

export const buildDetailRowsHtml = (items = []) => {
    if (!items.length) {
        return `
            <tr>
                <td colspan="6" style="padding:12px; color:#7f8c8d;">対象データがありません</td>
            </tr>
        `;
    }

    return items.map((item) => {
        const scoreText = Number(item?.maxRelevanceScore || 0).toFixed(3);
        const hitText = item?.hasHit ? 'hit' : '-';
        const ratingText = item?.rating || '-';
        const createdAtText = formatJpDateTime(item?.createdAt || '');
        return `
            <tr style="border-bottom:1px solid #eee; vertical-align: top;">
                <td style="padding:10px; white-space:nowrap;">${escapeHtml(createdAtText)}</td>
                <td style="padding:10px; min-width:220px;">${escapeHtml(item?.question || '')}</td>
                <td style="padding:10px; min-width:260px;">${escapeHtml(item?.answer || '')}</td>
                <td style="padding:10px; text-align:center;">${escapeHtml(hitText)}</td>
                <td style="padding:10px; text-align:right;">${escapeHtml(scoreText)}</td>
                <td style="padding:10px; text-align:center;">${escapeHtml(ratingText)}</td>
            </tr>
        `;
    }).join('');
};

export const buildMemberRowsHtml = (items = []) => {
    if (!items.length) {
        return `
            <tr>
                <td colspan="7" style="padding:12px; color:#7f8c8d;">対象データがありません</td>
            </tr>
        `;
    }

    return items.map((item) => {
        const ragRateText = `${Number(item?.ragUsageRate || 0).toFixed(1)}%`;
        const lastMessageAt = item?.lastMessageAt ? formatJpDateTime(item.lastMessageAt) : '-';
        return `
            <tr style="border-bottom:1px solid #eee; vertical-align: top;">
                <td style="padding:10px; white-space:nowrap;">${escapeHtml(item?.employeeNo || '-')}</td>
                <td style="padding:10px; white-space:nowrap;">${escapeHtml(item?.userName || '-')}</td>
                <td style="padding:10px; min-width:240px;">${escapeHtml(item?.email || '-')}</td>
                <td style="padding:10px; text-align:right;">${escapeHtml(formatNumber(item?.messageCount || 0))}</td>
                <td style="padding:10px; text-align:right;">${escapeHtml(formatNumber(item?.ragMessageCount || 0))}</td>
                <td style="padding:10px; text-align:right;">${escapeHtml(ragRateText)}</td>
                <td style="padding:10px; white-space:nowrap;">${escapeHtml(lastMessageAt)}</td>
            </tr>
        `;
    }).join('');
};
