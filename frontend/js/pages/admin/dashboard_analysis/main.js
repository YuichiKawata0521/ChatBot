import { ApiClient } from '../../../common/apiClient.js';
import { dashboardAnalysisService } from '../../../services/dashboardAnalysisService.js';
import { renderActiveUserTrendChart } from './activeUserTrend.ui.js';
import { renderCostTrendChart } from './costTrend.ui.js';
import { renderRagQualityTrendChart } from './ragQualityTrend.ui.js';
import { renderDepartmentUsageChart } from './departmentUsage.ui.js';
import {
    toYmd,
    normalizeToYmd,
    getPeriodRange,
    setSelectOptions,
    uniqueValues,
    formatNumber,
    buildDepartmentUsageRowsHtml,
    aggregateDepartmentUsageItems,
    buildDetailRowsHtml,
    buildMemberRowsHtml,
    buildRatingRowsHtml,
    formatJpDateTime
} from './analysisHelpers.js';

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
    ratingGoodTbody: document.getElementById('analysis-rating-good-tbody'),
    ratingBadTbody: document.getElementById('analysis-rating-bad-tbody'),
    ratingGoodViewAllButton: document.getElementById('analysis-rating-good-view-all'),
    ratingBadViewAllButton: document.getElementById('analysis-rating-bad-view-all'),
    applyButton: document.getElementById('analysis-btn-apply'),
    clearButton: document.getElementById('analysis-btn-clear'),
    departmentUsageTbody: document.getElementById('analysis-department-usage-tbody')
};

let departments = [];
const service = new dashboardAnalysisService();
let departmentUsageItems = [];
let departmentUsageBaseItems = [];
let ratingGoodItems = [];
let ratingBadItems = [];
let ratingListItems = [];

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

const ratingListModalDom = {
    overlay: document.getElementById('analysis-rating-list-modal'),
    closeButton: document.getElementById('analysis-rating-list-close'),
    title: document.getElementById('analysis-rating-list-title'),
    summary: document.getElementById('analysis-rating-list-summary'),
    tableBody: document.getElementById('analysis-rating-list-tbody')
};

const messageDetailModalDom = {
    overlay: document.getElementById('analysis-message-detail-modal'),
    closeButton: document.getElementById('analysis-message-detail-close'),
    title: document.getElementById('analysis-message-detail-title'),
    meta: document.getElementById('analysis-message-detail-meta'),
    question: document.getElementById('analysis-message-detail-question'),
    answer: document.getElementById('analysis-message-detail-answer')
};


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

const bindRatingRowEvents = (tableBody, items) => {
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('.analysis-rating-row');
    rows.forEach((row) => {
        row.addEventListener('click', () => {
            const index = Number(row.getAttribute('data-index') || -1);
            const item = items[index];
            if (!item) return;
            openMessageDetailModal(item);
        });
    });
};

const renderRatingRecentTables = () => {
    if (dom.ratingGoodTbody) {
        dom.ratingGoodTbody.innerHTML = buildRatingRowsHtml(ratingGoodItems, {
            emptyMessage: 'good のデータがありません'
        });
        bindRatingRowEvents(dom.ratingGoodTbody, ratingGoodItems);
    }

    if (dom.ratingBadTbody) {
        dom.ratingBadTbody.innerHTML = buildRatingRowsHtml(ratingBadItems, {
            emptyMessage: 'bad のデータがありません'
        });
        bindRatingRowEvents(dom.ratingBadTbody, ratingBadItems);
    }
};

const loadRatingRecent = async () => {
    try {
        const data = await service.getRatingRecent(getFilterState());
        ratingGoodItems = data?.goodItems || [];
        ratingBadItems = data?.badItems || [];
    } catch (error) {
        console.error('レーティング直近データの取得に失敗しました', error);
        ratingGoodItems = [];
        ratingBadItems = [];
    }

    renderRatingRecentTables();
};

const openMessageDetailModal = (item = {}) => {
    if (!messageDetailModalDom.overlay) return;

    if (messageDetailModalDom.title) {
        const ratingText = String(item?.rating || '').toLowerCase();
        messageDetailModalDom.title.textContent = `質問/回答 詳細 (${ratingText || '-'})`;
    }

    if (messageDetailModalDom.meta) {
        const createdAt = formatJpDateTime(item?.createdAt || '') || '-';
        const userName = item?.userName || '-';
        messageDetailModalDom.meta.textContent = `${createdAt} / ${userName}`;
    }

    if (messageDetailModalDom.question) {
        messageDetailModalDom.question.textContent = item?.question || '-';
    }

    if (messageDetailModalDom.answer) {
        messageDetailModalDom.answer.textContent = item?.answer || '-';
    }

    messageDetailModalDom.overlay.style.display = 'flex';
};

const closeMessageDetailModal = () => {
    if (messageDetailModalDom.overlay) {
        messageDetailModalDom.overlay.style.display = 'none';
    }
};

const openRatingListModal = async (rating) => {
    if (!ratingListModalDom.overlay || !ratingListModalDom.tableBody) return;

    const ratingLabel = String(rating || '').toLowerCase();
    ratingListModalDom.overlay.style.display = 'flex';

    if (ratingListModalDom.title) {
        ratingListModalDom.title.textContent = `${ratingLabel} レーティング一覧`;
    }
    if (ratingListModalDom.summary) {
        ratingListModalDom.summary.textContent = '読み込み中...';
    }
    ratingListModalDom.tableBody.innerHTML = `
        <tr>
            <td colspan="4" style="padding:12px; color:#7f8c8d;">読み込み中...</td>
        </tr>
    `;

    try {
        const data = await service.getRatingList(ratingLabel, getFilterState());
        ratingListItems = data?.items || [];

        ratingListModalDom.tableBody.innerHTML = buildRatingRowsHtml(ratingListItems, {
            emptyMessage: `${ratingLabel} の対象データがありません`,
            questionLength: 50,
            answerLength: 58
        });
        bindRatingRowEvents(ratingListModalDom.tableBody, ratingListItems);

        if (ratingListModalDom.summary) {
            ratingListModalDom.summary.textContent = `件数: ${formatNumber(ratingListItems.length)}`;
        }
    } catch (error) {
        console.error('レーティング一覧の取得に失敗しました', error);
        if (ratingListModalDom.summary) {
            ratingListModalDom.summary.textContent = 'データ取得に失敗しました';
        }
        ratingListModalDom.tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding:12px; color:#e74c3c;">取得に失敗しました</td>
            </tr>
        `;
    }
};

const closeRatingListModal = () => {
    if (ratingListModalDom.overlay) {
        ratingListModalDom.overlay.style.display = 'none';
    }
};


const renderDepartmentUsageView = () => {
    departmentUsageItems = aggregateDepartmentUsageItems(departmentUsageBaseItems, {
        dep1: dom.departmentDep1Select?.value || '',
        dep2: dom.departmentDep2Select?.value || '',
        dep3: dom.departmentDep3Select?.value || ''
    });

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
    await Promise.all([
        loadActiveUserTrend(),
        loadRagQualityTrend(),
        loadCostTrend(),
        loadDepartmentUsage(),
        loadRatingRecent()
    ]);
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

    dom.ratingGoodViewAllButton?.addEventListener('click', async () => {
        await openRatingListModal('good');
    });

    dom.ratingBadViewAllButton?.addEventListener('click', async () => {
        await openRatingListModal('bad');
    });

    ratingListModalDom.closeButton?.addEventListener('click', closeRatingListModal);
    ratingListModalDom.overlay?.addEventListener('click', (event) => {
        if (event.target === ratingListModalDom.overlay) {
            closeRatingListModal();
        }
    });

    messageDetailModalDom.closeButton?.addEventListener('click', closeMessageDetailModal);
    messageDetailModalDom.overlay?.addEventListener('click', (event) => {
        if (event.target === messageDetailModalDom.overlay) {
            closeMessageDetailModal();
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
