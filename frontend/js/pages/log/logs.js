import { ApiClient } from '../../common/apiClient.js';
import { showToast } from '../../common/toast.js';

const state = {
    allLogs: [],
    filteredLogs: [],
    currentPage: 1,
    itemPerPage: 50
};

const dom = {
    tableBody: document.getElementById('log-table-body'),
    form: document.getElementById('log-filter-form'),
    searchBtn: document.getElementById('search-btn'),
    filterDateFrom: document.getElementById('filter-date-from'),
    filterDateTo: document.getElementById('filter-date-to'),
    filterType: document.getElementById('filter-type'),
    filterLevel: document.getElementById('filter-level'),
    filterKeyword: document.getElementById('filter-keyword'),
    pagination: document.getElementById('pagination-container'),
    
    // Modal Elements
    modal: document.getElementById('log-modal'),
    modalId: document.getElementById('modal-log-id'),
    modalDate: document.getElementById('modal-date'),
    modalLevel: document.getElementById('modal-level'),
    modalType: document.getElementById('modal-type'),
    modalUser: document.getElementById('modal-user'),
    modalMessage: document.getElementById('modal-message'),
    modalContext: document.getElementById('modal-context'),
    closeBtns: [document.getElementById('modal-close-icon'), document.getElementById('modal-close-btn')]
};

function initEvents() {
    dom.searchBtn.addEventListener('click', applyFilters);
    dom.filterKeyword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters();
        }
    });

    dom.closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    dom.modal.addEventListener('click', (e) => {
        if (e.target === dom.modal) closeModal();
    });
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
    const fromData = dom.filterDateFrom.value ? new Date(dom.filterDateFrom.value) : null;
    const toDate = dom.filterDateTo.value ? new Date(dom.filterDateTo.value) : null;
    const type = dom.filterType.value.toLowerCase();
    const level = dom.filterLevel.value.toLowerCase();
    const keyword = dom.filterKeyword.value.toLowerCase();

    state.filteredLogs = state.allLogs.filter(log => {
        const logDate = new Date(log.created_at);
        const logLevel = log.level.toLowerCase();

        if (fromData && logDate < fromData) return false;
        if (toDate && logDate > toDate) return false;

        if (type && !(log.service?.toLowerCase().includes(type) || log.event_type?.toLowerCase().includes(type))) return false;

        if (level === 'important' && !['warn', 'error'].includes(logLevel)) return false;
        else if (level && level !== 'important' && logLevel !== level) return false;

        if (keyword) {
            const contextStr = log.context ? JSON.stringify(log.context).toLowerCase() : '';
            const isMatch = (
                log.message.toLowerCase().includes(keyword) ||
                (log.user_id && log.user_id.toString().includes(keyword)) ||
                contextStr.includes(keyword)
            );
            if (!isMatch) return false;
        }
        return true;
    });
    state.currentPage = 1;
    renderTable();
}

function renderTable() {
    dom.tableBody.innerHTML = '';
    const startIdx = (state.currentPage - 1) * state.itemPerPage;
    const endIdx = startIdx + state.itemPerPage;
    const logsToShow = state.filteredLogs.slice(startIdx, endIdx);

    if (logsToShow.length === 0) {
        dom.tableBody.innerHTML = `
        <tr><td colspan="7" class="text-center" style="padding: 20px;">条件に一致するログが見つかりません</td></tr>
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

        // 3. 種別
        const tdType = document.createElement('td');
        tdType.textContent = log.event_type || log.service || '-';

        // 4. モジュール
        const tdModule = document.createElement('td');
        const moduleName = log.context?.module_name || '-';
        tdModule.textContent = moduleName;

        // 5. メッセージ
        const tdMessage = document.createElement('td');
        tdMessage.className = 'text-truncate';
        tdMessage.textContent = log.message;

        // 6. ユーザー
        const tdUser = document.createElement('td');
        tdUser.textContent = log.user_id || 'system';

        // 7. アイコン
        const tdIcon = document.createElement('td');
        tdIcon.className = 'text-center';
        tdIcon.innerHTML = '<i class="fa-solid fa-chevron-right" style="color:#ccc;"></i>';

        tr.append(tdDate, tdLevel, tdType, tdModule, tdMessage, tdUser, tdIcon);
        fragment.appendChild(tr);
    });

    dom.tableBody.appendChild(fragment);
    renderPagination();
}

// レベルに応じたバッジのHTMLを生成
function getLevelBadgeHTML(level) {
    const lower = level.toLowerCase();
    let badgeClass = 'badge-info';
    if (lower === 'error') badgeClass = 'badge-error';
    if (lower === 'warn') badgeClass = 'badge-warn';
    return `<span class="badge ${badgeClass}">${level.toUpperCase()}</span>`;
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
    dom.modalType.textContent = `${log.service || '-'} / ${log.event_type || '-'}`;
    dom.modalUser.textContent = log.user_id || 'system';
    dom.modalMessage.textContent = log.message;
    
    // JSONを見やすくフォーマットして表示
    dom.modalContext.innerHTML = log.context ? JSON.stringify(log.context, null, 2) : 'No context data';

    dom.modal.style.display = 'flex';
}

function closeModal() {
    dom.modal.style.display = 'none';
}

// --- Utilities ---
function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}


document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    fetchLogs();
})