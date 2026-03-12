import { userService } from "../../../services/userService.js";
import { userTableUI } from "./userTable.ui.js";
import { userModalUI } from "./userModal.ui.js";
import { showToast } from "../../../common/toast.js";
import { requireAuth } from "../../../common/authGuard.js";

document.addEventListener('DOMContentLoaded', async () => {
    if (!(await requireAuth())) {
        return;
    }

    const user_Service = new userService();
    let currentEditId = null;
    let usersCache = [];
    let filteredUsersCache = [];
    let departmentsCache = [];
    let currentPage = 1;
    const PAGE_SIZE = 50;

    const filterKeyword = document.getElementById('filter-keyword');
    const filterDepartment1 = document.getElementById('filter-department1');
    const filterDepartment2 = document.getElementById('filter-department2');
    const filterDepartment3 = document.getElementById('filter-department3');
    const filterRole = document.getElementById('filter-role');
    const filterStatus = document.getElementById('filter-status');
    const clearButton = document.getElementById('btn-user-clear');
    const paginationContainer = document.querySelector('.pagination');

    // テーブルUIの初期化
    const tableUI = new userTableUI({
        onEdit: async (userId) => {
            const user = usersCache.find((item) => String(item.id) === String(userId));
            if (!user) {
                showToast('編集対象のユーザー情報が見つかりません。', 'error');
                return;
            }

            const editUser = {
                employee_no: user.employee_no,
                username: user.username,
                email: user.email,
                department_id: user.department_id,
                role: user.role
            };
            currentEditId = userId;
            modalUI.open('edit', editUser);
        },
        onDelete: async (userId) => {
            if (confirm('このユーザーを削除（または無効化）してもよろしいですか？')) {
                try {
                    await user_Service.deleteUser(userId);
                    showToast('ユーザーを削除しました。', 'success');
                    await loadUsers(); // テーブル再描画
                } catch (error) {
                    showToast('削除に失敗しました。', 'error');
                }
            }
        }
    });

    // モーダルUIの初期化
    const modalUI = new userModalUI({
        onSaveSingle: async (userData) => {
            try {
                if (currentEditId) {
                    // 更新処理
                    await user_Service.updateUser(currentEditId, userData);
                    showToast('ユーザー情報を更新しました。', 'success');
                } else {
                    // 新規登録処理
                    await user_Service.createUser(userData);
                    showToast('ユーザーを登録しました。', 'success');
                }
                modalUI.close();
                loadUsers(); // テーブル再描画
            } catch (error) {
                console.error('新規登録エラー', error.message);
                showToast(error.message || '保存に失敗しました。', 'error');
            }
        },
        onSaveCsv: async (file) => {
            try {
                const result = await user_Service.uploadCsv(file);
                showToast(result?.message || `CSV (${file.name}) からユーザーを登録しました。`, 'success');
                modalUI.close();
                await Promise.all([loadUsers(), loadDepartments()]);
            } catch (error) {
                showToast(error.message || 'CSVアップロードに失敗しました。', 'error');
            }
        }
    });

    // 「新規ユーザー登録」ボタンのイベント
    document.getElementById('btn-create-user').addEventListener('click', () => {
        currentEditId = null;
        modalUI.open('create');
    });

    function uniqueValues(values) {
        return [...new Set((values || []).filter((value) => !!value))];
    }

    function renderSelectOptions(selectEl, values, firstLabel = '全部署') {
        if (!selectEl) return;
        selectEl.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = firstLabel;
        selectEl.appendChild(defaultOption);

        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectEl.appendChild(option);
        });
    }

    function renderDepartment1FilterOptions() {
        const dep1Options = uniqueValues(departmentsCache.map((row) => row.dep1_name));
        renderSelectOptions(filterDepartment1, dep1Options);
    }

    function renderDepartment2FilterOptions(selectedDep1 = '') {
        const dep2Options = uniqueValues(
            departmentsCache
                .filter((row) => (row.dep1_name || '') === (selectedDep1 || ''))
                .map((row) => row.dep2_name)
        );
        renderSelectOptions(filterDepartment2, dep2Options);
    }

    function renderDepartment3FilterOptions(selectedDep1 = '', selectedDep2 = '') {
        const dep3Options = uniqueValues(
            departmentsCache
                .filter((row) => (row.dep1_name || '') === (selectedDep1 || ''))
                .filter((row) => (row.dep2_name || '') === (selectedDep2 || ''))
                .map((row) => row.dep3_name)
        );
        renderSelectOptions(filterDepartment3, dep3Options);
    }

    function applyUserFilters() {
        const keyword = (filterKeyword?.value || '').trim().toLowerCase();
        const dep1 = filterDepartment1?.value || '';
        const dep2 = filterDepartment2?.value || '';
        const dep3 = filterDepartment3?.value || '';
        const role = filterRole?.value || '';
        const status = filterStatus?.value || '';

        filteredUsersCache = usersCache.filter((user) => {
            if (keyword) {
                const employeeNo = String(user.employee_no || '').toLowerCase();
                const username = String(user.username || '').toLowerCase();
                if (!employeeNo.includes(keyword) && !username.includes(keyword)) {
                    return false;
                }
            }

            if (dep1 && (user.dep1_name || '') !== dep1) return false;
            if (dep2 && (user.dep2_name || '') !== dep2) return false;
            if (dep3 && (user.dep3_name || '') !== dep3) return false;
            if (role && String(user.role || '') !== role) return false;

            const isActive = user.deleted_at == null;
            if (status === 'active' && !isActive) return false;
            if (status === 'inactive' && isActive) return false;

            return true;
        });

        currentPage = 1;
        renderCurrentPage();
    }

    function renderPagination(totalPages) {
        if (!paginationContainer) return;

        paginationContainer.innerHTML = '';

        const createButton = (label, page, { disabled = false, isActive = false } = {}) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.disabled = disabled;
            if (isActive) {
                button.classList.add('active');
            }
            if (!disabled) {
                button.dataset.page = String(page);
            }
            return button;
        };

        paginationContainer.appendChild(
            createButton('«', Math.max(1, currentPage - 1), { disabled: currentPage <= 1 })
        );

        for (let page = 1; page <= totalPages; page++) {
            paginationContainer.appendChild(
                createButton(String(page), page, { isActive: page === currentPage })
            );
        }

        paginationContainer.appendChild(
            createButton('»', Math.min(totalPages, currentPage + 1), { disabled: currentPage >= totalPages })
        );
    }

    function renderCurrentPage() {
        const totalUsers = filteredUsersCache.length;
        const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const pageItems = filteredUsersCache.slice(startIndex, endIndex);

        tableUI.render(pageItems);
        renderPagination(totalPages);
    }

    function setupFilterEvents() {
        if (filterDepartment1) {
            filterDepartment1.addEventListener('change', () => {
                renderDepartment2FilterOptions(filterDepartment1.value);
                renderDepartment3FilterOptions(filterDepartment1.value, '');
                applyUserFilters();
            });
        }

        if (filterDepartment2) {
            filterDepartment2.addEventListener('change', () => {
                renderDepartment3FilterOptions(filterDepartment1?.value || '', filterDepartment2.value);
                applyUserFilters();
            });
        }

        filterDepartment3?.addEventListener('change', applyUserFilters);
        filterRole?.addEventListener('change', applyUserFilters);
        filterStatus?.addEventListener('change', applyUserFilters);
        filterKeyword?.addEventListener('input', applyUserFilters);
        paginationContainer?.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-page]');
            if (!button) return;

            const nextPage = Number(button.dataset.page || '1');
            if (!Number.isFinite(nextPage)) return;

            currentPage = nextPage;
            renderCurrentPage();
        });

        clearButton?.addEventListener('click', () => {
            if (filterKeyword) filterKeyword.value = '';
            if (filterDepartment1) filterDepartment1.value = '';
            renderDepartment2FilterOptions('');
            renderDepartment3FilterOptions('', '');
            if (filterRole) filterRole.value = '';
            if (filterStatus) filterStatus.value = '';
            applyUserFilters();
        });
    }

    async function loadDepartments() {
        try {
            departmentsCache = await user_Service.getDepartments();
            modalUI.setDepartments(departmentsCache);
            renderDepartment1FilterOptions();
            renderDepartment2FilterOptions('');
            renderDepartment3FilterOptions('', '');
        } catch (error) {
            console.error('部署一覧取得に失敗しました', error.message);
            showToast('部署一覧の取得に失敗しました。', 'error');
        }
    }

    // 初期ロード関数（API実装後に有効化）
    async function loadUsers() {
        try {
            const users = await user_Service.getUsers();
            usersCache = Array.isArray(users) ? users : [];
            applyUserFilters();
        } catch (error) {
            console.error('ユーザー情報一覧取得に失敗しました', error.message);
            showToast('ユーザー一覧の取得に失敗しました。', 'error');
        }
    }
    setupFilterEvents();
    await Promise.all([loadUsers(), loadDepartments()]);
});