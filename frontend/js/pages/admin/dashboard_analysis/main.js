import { ApiClient } from '../../../common/apiClient.js';
import { dashboardAnalysisService } from '../../../services/dashboardAnalysisService.js';
import { renderActiveUserTrendChart } from './activeUserTrend.ui.js';
import { renderCostTrendChart } from './costTrend.ui.js';
import { renderRagQualityTrendChart } from './ragQualityTrend.ui.js';
import { renderDepartmentUsageChart } from './departmentUsage.ui.js';

const dom = {
    periodSelect: document.getElementById('analysis-filter-period'),
    periodLabel: document.getElementById('analysis-period-label'),
    customRange: document.getElementById('analysis-custom-range'),
    customStart: document.getElementById('analysis-custom-start'),
    customEnd: document.getElementById('analysis-custom-end'),
    dep1Select: document.getElementById('analysis-filter-dep1'),
    dep2Select: document.getElementById('analysis-filter-dep2'),
    dep3Select: document.getElementById('analysis-filter-dep3'),
    departmentDep1Select: document.getElementById('analysis-department-filter-dep1'),
    departmentDep2Select: document.getElementById('analysis-department-filter-dep2'),
    departmentDep3Select: document.getElementById('analysis-department-filter-dep3'),
    departmentFilterClearButton: document.getElementById('analysis-department-filter-clear'),
    applyButton: document.getElementById('analysis-btn-apply'),
    clearButton: document.getElementById('analysis-btn-clear'),
    departmentUsageTbody: document.getElementById('analysis-department-usage-tbody')
};

let departments = [];
const service = new dashboardAnalysisService();
let departmentUsageItems = [];
let departmentUsageBaseItems = [];

const modalDom = {
    overlay: document.getElementById('analysis-rag-detail-modal'),
    closeButton: document.getElementById('analysis-rag-detail-close'),
    title: document.getElementById('analysis-rag-detail-title'),
    summary: document.getElementById('analysis-rag-detail-summary'),
    tableBody: document.getElementById('analysis-rag-detail-tbody')
};

const memberModalDom = {
    overlay: document.getElementById('analysis-department-member-modal'),
    closeButton: document.getElementById('analysis-department-member-close'),
    title: document.getElementById('analysis-department-member-title'),
    summary: document.getElementById('analysis-department-member-summary'),
    tableBody: document.getElementById('analysis-department-member-tbody')
};

const toYmd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const toTokyoYmd = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo'
    }).format(date);
};

const normalizeToYmd = (value) => {
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

const getPeriodRange = (period) => {
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

const setSelectOptions = (selectElement, values, defaultLabel) => {
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

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const renderDep1Options = () => {
    const values = uniqueValues(departments.map((row) => row.dep1_name));
    setSelectOptions(dom.dep1Select, values, '全部署');
};

const renderDep2Options = (dep1 = '') => {
    const values = uniqueValues(
        departments
            .filter((row) => !dep1 || (row.dep1_name || '') === dep1)
            .map((row) => row.dep2_name)
    );
    setSelectOptions(dom.dep2Select, values, '全部署');
};

const renderDep3Options = (dep1 = '', dep2 = '') => {
    const values = uniqueValues(
        departments
            .filter((row) => !dep1 || (row.dep1_name || '') === dep1)
            .filter((row) => !dep2 || (row.dep2_name || '') === dep2)
            .map((row) => row.dep3_name)
    );
    setSelectOptions(dom.dep3Select, values, '全部署');
};

const renderDepartmentDep1Options = () => {
    const values = uniqueValues(departments.map((row) => row.dep1_name));
    setSelectOptions(dom.departmentDep1Select, values, '部署（本部）: 全部署');
};

const renderDepartmentDep2Options = (dep1 = '') => {
    const values = uniqueValues(
        departments
            .filter((row) => !dep1 || (row.dep1_name || '') === dep1)
            .map((row) => row.dep2_name)
    );
    setSelectOptions(dom.departmentDep2Select, values, '部署（部）: 全部署');
};

const renderDepartmentDep3Options = (dep1 = '', dep2 = '') => {
    const values = uniqueValues(
        departments
            .filter((row) => !dep1 || (row.dep1_name || '') === dep1)
            .filter((row) => !dep2 || (row.dep2_name || '') === dep2)
            .map((row) => row.dep3_name)
    );
    setSelectOptions(dom.departmentDep3Select, values, '部署（課）: 全部署');
};

const updateDepartmentFilterClearButtonVisibility = () => {
    if (!dom.departmentFilterClearButton) return;

    const isTopDepartmentFiltered = Boolean(
        (dom.dep1Select?.value || '') ||
        (dom.dep2Select?.value || '') ||
        (dom.dep3Select?.value || '')
    );

    dom.departmentFilterClearButton.style.display = isTopDepartmentFiltered ? 'none' : '';
};

const updatePeriodLabel = () => {
    if (!dom.periodLabel || !dom.periodSelect) return;

    const period = dom.periodSelect.value;
    const isCustom = period === 'custom';
    if (dom.customRange) {
        dom.customRange.style.display = isCustom ? '' : 'none';
    }

    if (isCustom) {
        const start = dom.customStart?.value || '--';
        const end = dom.customEnd?.value || '--';
        dom.periodLabel.textContent = `対象期間: ${start} 〜 ${end}`;
        return;
    }

    const { start, end, label } = getPeriodRange(period);
    if (dom.customStart) dom.customStart.value = toYmd(start);
    if (dom.customEnd) dom.customEnd.value = toYmd(end);
    dom.periodLabel.textContent = `対象期間: ${label}`;
};

const getFilterState = () => {
    const period = dom.periodSelect?.value || 'last30';

    return {
        period,
        fromDate: dom.customStart?.value || '',
        toDate: dom.customEnd?.value || '',
        dep1Name: dom.dep1Select?.value || '',
        dep2Name: dom.dep2Select?.value || '',
        dep3Name: dom.dep3Select?.value || ''
    };
};

const loadActiveUserTrend = async () => {
    try {
        const trendData = await service.getActiveUserTrend(getFilterState());
        renderActiveUserTrendChart(trendData);
    } catch (error) {
        console.error('アクティブユーザー推移の取得に失敗しました', error);
    }
};

const loadCostTrend = async () => {
    try {
        const trendData = await service.getCostTrend(getFilterState());
        renderCostTrendChart(trendData);
    } catch (error) {
        console.error('コスト推移の取得に失敗しました', error);
    }
};

const loadRagQualityTrend = async () => {
    try {
        const trendData = await service.getRagQualityTrend(getFilterState());
        renderRagQualityTrendChart(trendData, {
            onPointClick: async ({ targetDate, displayDate }) => {
                await openRagDetailModal(targetDate, displayDate);
            }
        });
    } catch (error) {
        console.error('RAG品質推移の取得に失敗しました', error);
    }
};

const formatNumber = (value) => Number(value || 0).toLocaleString('ja-JP');
const formatUsd = (value) => `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5
})}`;

const buildDepartmentUsageRowsHtml = (items = []) => {
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

const aggregateDepartmentUsageItems = (baseItems = []) => {
    const selectedDep1 = dom.departmentDep1Select?.value || '';
    const selectedDep2 = dom.departmentDep2Select?.value || '';
    const selectedDep3 = dom.departmentDep3Select?.value || '';

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

const renderDepartmentUsageView = () => {
    departmentUsageItems = aggregateDepartmentUsageItems(departmentUsageBaseItems);

    renderDepartmentUsageChart({ items: departmentUsageItems }, {
        onDepartmentClick: async (departmentItem) => {
            await openDepartmentMemberModal(departmentItem);
        }
    });

    if (dom.departmentUsageTbody) {
        dom.departmentUsageTbody.innerHTML = buildDepartmentUsageRowsHtml(departmentUsageItems);
        bindDepartmentRowEvents();
    }
};

const bindDepartmentRowEvents = () => {
    if (!dom.departmentUsageTbody) return;

    const rows = dom.departmentUsageTbody.querySelectorAll('.analysis-department-usage-row');
    rows.forEach((row) => {
        row.addEventListener('click', async () => {
            const index = Number(row.getAttribute('data-index') || -1);
            const item = departmentUsageItems[index];
            if (!item) return;
            await openDepartmentMemberModal(item);
        });
    });
};

const loadDepartmentUsage = async () => {
    try {
        const usageData = await service.getDepartmentUsage(getFilterState());
        departmentUsageBaseItems = usageData?.items || [];
        renderDepartmentUsageView();
    } catch (error) {
        console.error('部署別利用割合の取得に失敗しました', error);
        departmentUsageBaseItems = [];
        departmentUsageItems = [];
        if (dom.departmentUsageTbody) {
            dom.departmentUsageTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding:12px; color:#e74c3c;">取得に失敗しました</td>
                </tr>
            `;
        }
    }
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatJpDateTime = (value) => {
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

const buildDetailRowsHtml = (items = []) => {
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

const buildMemberRowsHtml = (items = []) => {
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

const openDepartmentMemberModal = async (departmentItem = {}) => {
    if (!memberModalDom.overlay || !memberModalDom.tableBody) return;

    const dep1Name = String(departmentItem?.dep1Name || '').trim();
    const dep2Name = String(departmentItem?.dep2Name || '').trim();
    const dep3Name = String(departmentItem?.dep3Name || '').trim();
    const departmentName = departmentItem?.departmentName || [dep1Name, dep2Name, dep3Name].filter(Boolean).join(' / ') || '未設定';

    memberModalDom.overlay.style.display = 'flex';
    if (memberModalDom.title) {
        memberModalDom.title.textContent = `所属社員一覧 (${departmentName})`;
    }
    if (memberModalDom.summary) {
        memberModalDom.summary.textContent = '読み込み中...';
    }
    memberModalDom.tableBody.innerHTML = `
        <tr>
            <td colspan="7" style="padding:12px; color:#7f8c8d;">読み込み中...</td>
        </tr>
    `;

    try {
        const data = await service.getDepartmentMembers(
            { dep1Name, dep2Name, dep3Name },
            getFilterState()
        );
        const items = data?.items || [];
        const totalMessages = items.reduce((sum, row) => sum + Number(row?.messageCount || 0), 0);
        const totalRagMessages = items.reduce((sum, row) => sum + Number(row?.ragMessageCount || 0), 0);

        memberModalDom.tableBody.innerHTML = buildMemberRowsHtml(items);
        if (memberModalDom.summary) {
            memberModalDom.summary.textContent = `社員数: ${formatNumber(items.length)} / 期間内メッセージ合計: ${formatNumber(totalMessages)} / RAG利用合計: ${formatNumber(totalRagMessages)}`;
        }
    } catch (error) {
        console.error('部署所属社員一覧の取得に失敗しました', error);
        if (memberModalDom.summary) {
            memberModalDom.summary.textContent = 'データ取得に失敗しました';
        }
        memberModalDom.tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="padding:12px; color:#e74c3c;">取得に失敗しました</td>
            </tr>
        `;
    }
};

const openRagDetailModal = async (targetDate, displayDate) => {
    if (!modalDom.overlay || !modalDom.tableBody) return;

    const normalizedTargetDate = normalizeToYmd(targetDate);
    const modalDisplayDate = displayDate || normalizedTargetDate || String(targetDate || '');

    modalDom.overlay.style.display = 'flex';
    if (modalDom.title) {
        modalDom.title.textContent = `RAG日別質問/回答一覧 (${modalDisplayDate})`;
    }
    if (modalDom.summary) {
        modalDom.summary.textContent = '読み込み中...';
    }
    modalDom.tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="padding:12px; color:#7f8c8d;">読み込み中...</td>
        </tr>
    `;

    if (!normalizedTargetDate) {
        if (modalDom.summary) {
            modalDom.summary.textContent = '日付形式が不正です';
        }
        modalDom.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="padding:12px; color:#e67e22;">対象日の形式を解釈できませんでした</td>
            </tr>
        `;
        return;
    }

    try {
        const details = await service.getRagQualityDetails(normalizedTargetDate, getFilterState());
        const items = details?.items || [];
        modalDom.tableBody.innerHTML = buildDetailRowsHtml(items);

        if (modalDom.summary) {
            const total = items.length;
            const hitCount = items.filter((row) => !!row.hasHit).length;
            const ratedCount = items.filter((row) => row.rating === 'good' || row.rating === 'bad').length;
            const goodCount = items.filter((row) => row.rating === 'good').length;
            const badCount = items.filter((row) => row.rating === 'bad').length;
            modalDom.summary.textContent = `総質問数: ${total} / 0.7超ヒット: ${hitCount} / レーティング済み: ${ratedCount} (good: ${goodCount}, bad: ${badCount})`;
        }
    } catch (error) {
        console.error('RAG日別詳細の取得に失敗しました', error);
        if (modalDom.summary) {
            modalDom.summary.textContent = 'データ取得に失敗しました';
        }
        modalDom.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="padding:12px; color:#e74c3c;">取得に失敗しました</td>
            </tr>
        `;
    }
};

const closeRagDetailModal = () => {
    if (modalDom.overlay) {
        modalDom.overlay.style.display = 'none';
    }
};

const closeDepartmentMemberModal = () => {
    if (memberModalDom.overlay) {
        memberModalDom.overlay.style.display = 'none';
    }
};

const loadCharts = async () => {
    await Promise.all([loadActiveUserTrend(), loadRagQualityTrend(), loadCostTrend(), loadDepartmentUsage()]);
};

const applyFiltersImmediately = async () => {
    updatePeriodLabel();
    await loadCharts();
};

const clearFilters = () => {
    if (dom.periodSelect) dom.periodSelect.value = 'last30';
    if (dom.dep1Select) dom.dep1Select.value = '';
    renderDep2Options('');
    renderDep3Options('', '');
    updatePeriodLabel();
};

const loadDepartments = async () => {
    try {
        const response = await ApiClient.get('/users/departments');
        departments = response?.data?.departments || [];
    } catch {
        departments = [];
    }

    renderDep1Options();
    renderDep2Options('');
    renderDep3Options('', '');

    renderDepartmentDep1Options();
    renderDepartmentDep2Options('');
    renderDepartmentDep3Options('', '');
};

const bindEvents = () => {
    dom.periodSelect?.addEventListener('change', async () => {
        await applyFiltersImmediately();
    });

    dom.customStart?.addEventListener('change', async () => {
        await applyFiltersImmediately();
    });

    dom.customEnd?.addEventListener('change', async () => {
        await applyFiltersImmediately();
    });

    dom.dep1Select?.addEventListener('change', async () => {
        renderDep2Options(dom.dep1Select.value);
        renderDep3Options(dom.dep1Select.value, '');
        updateDepartmentFilterClearButtonVisibility();
        await loadCharts();
    });

    dom.dep2Select?.addEventListener('change', async () => {
        renderDep3Options(dom.dep1Select?.value || '', dom.dep2Select.value);
        updateDepartmentFilterClearButtonVisibility();
        await loadCharts();
    });

    dom.dep3Select?.addEventListener('change', async () => {
        updateDepartmentFilterClearButtonVisibility();
        await loadCharts();
    });

    dom.departmentDep1Select?.addEventListener('change', () => {
        renderDepartmentDep2Options(dom.departmentDep1Select?.value || '');
        renderDepartmentDep3Options(dom.departmentDep1Select?.value || '', '');
        renderDepartmentUsageView();
    });

    dom.departmentDep2Select?.addEventListener('change', () => {
        renderDepartmentDep3Options(dom.departmentDep1Select?.value || '', dom.departmentDep2Select?.value || '');
        renderDepartmentUsageView();
    });

    dom.departmentDep3Select?.addEventListener('change', () => {
        renderDepartmentUsageView();
    });

    dom.departmentFilterClearButton?.addEventListener('click', () => {
        if (dom.departmentDep1Select) dom.departmentDep1Select.value = '';
        renderDepartmentDep2Options('');
        renderDepartmentDep3Options('', '');
        renderDepartmentUsageView();
    });

    dom.applyButton?.addEventListener('click', loadCharts);
    dom.clearButton?.addEventListener('click', async () => {
        clearFilters();
        updateDepartmentFilterClearButtonVisibility();
        await loadCharts();
    });

    modalDom.closeButton?.addEventListener('click', closeRagDetailModal);
    modalDom.overlay?.addEventListener('click', (event) => {
        if (event.target === modalDom.overlay) {
            closeRagDetailModal();
        }
    });

    memberModalDom.closeButton?.addEventListener('click', closeDepartmentMemberModal);
    memberModalDom.overlay?.addEventListener('click', (event) => {
        if (event.target === memberModalDom.overlay) {
            closeDepartmentMemberModal();
        }
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    updatePeriodLabel();
    updateDepartmentFilterClearButtonVisibility();
    await loadDepartments();
    await loadCharts();
});
