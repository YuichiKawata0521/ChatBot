import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js';
import {
    formatDateTime,
    parseDateAtStartOfDay,
    parseDateAtEndOfDay,
    getLevelBadgeHTML,
    escapeCsvCell,
    formatFileTimestamp,
    resolveUserName,
    formatContextForCsv
} from './logHelpers.js';

const state = {
    allLogs: [],
    filteredLogs: [],
    currentPage: 1,
    itemPerPage: 50
};

const DEFAULT_FILTERS = {
    dateFrom: '',
    dateTo: '',
    level: 'important',
    keyword: ''
};

const dom = {
    tableBody: document.getElementById('log-table-body'),
    form: document.getElementById('log-filter-form'),
    searchBtn: document.getElementById('search-btn'),
    clearBtn: document.getElementById('clear-btn'),
    exportBtn: document.getElementById('export-btn'),
    filterDateFrom: document.getElementById('filter-date-from'),
    filterDateTo: document.getElementById('filter-date-to'),
    filterLevel: document.getElementById('filter-level'),
    filterKeyword: document.getElementById('filter-keyword'),
    pagination: document.getElementById('pagination-container'),
    
    // Modal Elements
    modal: document.getElementById('log-modal'),
    modalId: document.getElementById('modal-log-id'),
    modalDate: document.getElementById('modal-date'),
    modalLevel: document.getElementById('modal-level'),
    modalUser: document.getElementById('modal-user'),
    modalMessage: document.getElementById('modal-message'),
    modalContext: document.getElementById('modal-context'),
    closeBtns: [document.getElementById('modal-close-icon'), document.getElementById('modal-close-btn')]
};

function initEvents() {
    dom.searchBtn?.addEventListener('click', applyFilters);
    dom.clearBtn?.addEventListener('click', resetFilters);
    dom.exportBtn?.addEventListener('click', exportFilteredLogsToCsv);
    dom.filterDateFrom?.addEventListener('change', applyFilters);
    dom.filterDateTo?.addEventListener('change', applyFilters);
    dom.filterLevel?.addEventListener('change', applyFilters);
    dom.filterKeyword?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters();
        }
    });

    dom.closeBtns.filter(Boolean).forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    dom.modal?.addEventListener('click', (e) => {
        if (e.target === dom.modal) closeModal();
    });
}

function resetFilters() {
    dom.filterDateFrom.value = DEFAULT_FILTERS.dateFrom;
    dom.filterDateTo.value = DEFAULT_FILTERS.dateTo;
    dom.filterLevel.value = DEFAULT_FILTERS.level;
    dom.filterKeyword.value = DEFAULT_FILTERS.keyword;
    applyFilters();
}

async function fetchLogs() {
    try {
        const response = await ApiClient.get('/logs/');
        const payload = response?.data ?? response;
        state.allLogs = Array.isArray(payload) ? payload : (payload?.data ?? []);

        applyFilters();
    } catch (error) {
        console.error(error);
        showToast('ログ情報の取得に失敗しました');
    }
}

function applyFilters() {
    const fromDate = parseDateAtStartOfDay(dom.filterDateFrom?.value || '');
    const toDate = parseDateAtEndOfDay(dom.filterDateTo?.value || '');
    const level = (dom.filterLevel?.value || '').toLowerCase();
    const keyword = (dom.filterKeyword?.value || '').toLowerCase();

    state.filteredLogs = state.allLogs.filter(log => {
        const logDate = new Date(log.created_at);
        if (Number.isNaN(logDate.getTime())) return false;
        const logLevel = (log.level || '').toLowerCase();

        if (fromDate && logDate < fromDate) return false;
        if (toDate && logDate > toDate) return false;

        if (level === 'important' && !['warn', 'error'].includes(logLevel)) return false;
        else if (level && level !== 'important' && logLevel !== level) return false;

        if (keyword) {
            const message = (log.message || '').toLowerCase();
            const contextStr = log.context ? JSON.stringify(log.context).toLowerCase() : '';
            const userName = (resolveUserName(log) || '').toLowerCase();
            const userId = log.user_id ? log.user_id.toString().toLowerCase() : '';
            const isMatch = (
                message.includes(keyword) ||
                userName.includes(keyword) ||
                userId.includes(keyword) ||
                contextStr.includes(keyword)
            );
            if (!isMatch) return false;
        }
        return true;
    });
    state.currentPage = 1;
    renderTable();
}

function resolveModuleName(log) {
    const raw = log?.context?.module_name;
    if (!raw) return '-';
    const normalized = String(raw).replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || '-';
}

function renderTable() {
    dom.tableBody.innerHTML = '';
    const startIdx = (state.currentPage - 1) * state.itemPerPage;
    const endIdx = startIdx + state.itemPerPage;
    const logsToShow = state.filteredLogs.slice(startIdx, endIdx);

    if (logsToShow.length === 0) {
        dom.tableBody.innerHTML = `
        <tr><td colspan="6" class="text-center" style="padding: 20px;">条件に一致するログが見つかりません</td></tr>
        `;
        renderPagination();
        return;
    }

    const fragment = document.createDocumentFragment();

    logsToShow.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = 'log-row';
        
        // 元のCSSに合わせた背景色
        if (log.level === 'error') tr.classList.add('row-error');
        if (log.level === 'warn') tr.classList.add('row-warn');

        // クリックでモーダルを開く
        tr.addEventListener('click', () => openModal(log));

        // 1. 日時
        const tdDate = document.createElement('td');
        tdDate.className = 'font-mono';
        tdDate.textContent = formatDateTime(log.created_at);

        // 2. レベル
        const tdLevel = document.createElement('td');
        tdLevel.innerHTML = getLevelBadgeHTML(log.level);

        // 3. モジュール
        const tdModule = document.createElement('td');
        const moduleName = resolveModuleName(log);
        tdModule.textContent = moduleName;

        // 4. メッセージ
        const tdMessage = document.createElement('td');
        tdMessage.className = 'text-truncate';
        tdMessage.textContent = log.message;

        // 5. ユーザー
        const tdUser = document.createElement('td');
        tdUser.textContent = resolveUserName(log);

        // 6. アイコン
        const tdIcon = document.createElement('td');
        tdIcon.className = 'text-center';
        tdIcon.innerHTML = '<i class="fa-solid fa-chevron-right" style="color:#ccc;"></i>';

        tr.append(tdDate, tdLevel, tdModule, tdMessage, tdUser, tdIcon);
        fragment.appendChild(tr);
    });

    dom.tableBody.appendChild(fragment);
    renderPagination();
}

// --- Pagination ---
function renderPagination() {
    dom.pagination.innerHTML = '';
    const totalPages = Math.ceil(state.filteredLogs.length / state.itemPerPage);
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&laquo;';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.onclick = () => { state.currentPage--; renderTable(); };
    dom.pagination.appendChild(prevBtn);

    // Page Numbers (簡易実装: 最大5ページ分表示など調整可能)
    for (let i = 1; i <= totalPages; i++) {
        // 現在のページの前後2ページのみ表示するなどのロジックを入れるとより綺麗になります
        if (i === 1 || i === totalPages || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === state.currentPage) pageBtn.classList.add('active');
            pageBtn.onclick = () => { state.currentPage = i; renderTable(); };
            dom.pagination.appendChild(pageBtn);
        } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
            const dots = document.createElement('button');
            dots.textContent = '...';
            dots.disabled = true;
            dom.pagination.appendChild(dots);
        }
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&raquo;';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.onclick = () => { state.currentPage++; renderTable(); };
    dom.pagination.appendChild(nextBtn);
}

// --- Modal Interactions ---
function openModal(log) {
    dom.modalId.textContent = `#LOG-${log.id || '---'}`;
    dom.modalDate.textContent = formatDateTime(log.created_at);
    dom.modalLevel.innerHTML = getLevelBadgeHTML(log.level);
    dom.modalUser.textContent = resolveUserName(log);
    dom.modalMessage.textContent = log.message;
    
    // JSONを見やすくフォーマットして表示
    dom.modalContext.innerHTML = log.context ? JSON.stringify(log.context, null, 2) : 'No context data';

    dom.modal.style.display = 'flex';
}

function closeModal() {
    dom.modal.style.display = 'none';
}

function exportFilteredLogsToCsv() {
    if (!state.filteredLogs.length) {
        showToast('エクスポート対象のログがありません');
        return;
    }

    const exportCurrentPageOnly = window.confirm('現在表示中のページのみCSV出力しますか？\n「キャンセル」でフィルタ結果すべてを出力します。');
    const targetLogs = exportCurrentPageOnly
        ? getCurrentPageLogs()
        : state.filteredLogs;

    if (!targetLogs.length) {
        showToast('現在ページにエクスポート対象のログがありません');
        return;
    }

    const headers = ['日時', 'レベル', 'モジュール', 'メッセージ', 'ユーザー', 'コンテキスト詳細'];
    const rows = targetLogs.map((log) => {
        return [
            formatDateTime(log.created_at),
            (log.level || '').toUpperCase(),
            resolveModuleName(log),
            log.message || '',
            resolveUserName(log),
            formatContextForCsv(log.context)
        ];
    });

    const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `system_logs_${formatFileTimestamp(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(exportCurrentPageOnly ? '現在ページのCSVエクスポートが完了しました' : '全件CSVエクスポートが完了しました', 'success');
}

function getCurrentPageLogs() {
    const startIdx = (state.currentPage - 1) * state.itemPerPage;
    const endIdx = startIdx + state.itemPerPage;
    return state.filteredLogs.slice(startIdx, endIdx);
}


document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    fetchLogs();
})