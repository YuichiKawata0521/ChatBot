const rankingState = {
    allRows: []
};

const buildCardRowsHtml = (rows) => {
    if (!rows.length) {
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;" colspan="3">データがありません</td>
            </tr>
        `;
    }

    return rows
        .map((row) => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${row.rank}</td>
                <td style="padding: 8px;">${row.departmentName}</td>
                <td style="padding: 8px; text-align: right;">${row.messageCount}</td>
            </tr>
        `)
        .join('');
};

const buildModalRowsHtml = (rows) => {
    if (!rows.length) {
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;" colspan="5">データがありません</td>
            </tr>
        `;
    }

    return rows
        .map((row) => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${row.rank}</td>
                <td style="padding: 8px;">${row.dep1Name || ''}</td>
                <td style="padding: 8px;">${row.dep2Name || ''}</td>
                <td style="padding: 8px;">${row.dep3Name || ''}</td>
                <td style="padding: 8px; text-align: right;">${row.messageCount}</td>
            </tr>
        `)
        .join('');
};

const populateSelect = (selectElement, values, placeholder, selectedValue = '') => {
    if (!selectElement) return;

    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        if (value === selectedValue) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
};

const getFilterElements = () => ({
    dep1Select: document.getElementById('department-modal-filter-dep1'),
    dep2Select: document.getElementById('department-modal-filter-dep2'),
    dep3Select: document.getElementById('department-modal-filter-dep3'),
    clearButton: document.getElementById('btn-clear-department-modal-filter'),
    modalTbody: document.getElementById('department-ranking-modal-table')
});

const updateCascadeFilters = () => {
    const { dep1Select, dep2Select, dep3Select } = getFilterElements();
    if (!dep1Select || !dep2Select || !dep3Select) return;

    const selectedDep1 = dep1Select.value || '';
    const selectedDep2 = dep2Select.value || '';
    const selectedDep3 = dep3Select.value || '';

    const dep1Values = [...new Set(rankingState.allRows.map((row) => row.dep1Name).filter(Boolean))];
    populateSelect(dep1Select, dep1Values, '部署1: すべて', selectedDep1);

    const dep2Values = [...new Set(
        rankingState.allRows
            .filter((row) => !dep1Select.value || row.dep1Name === dep1Select.value)
            .map((row) => row.dep2Name)
            .filter(Boolean)
    )];
    populateSelect(dep2Select, dep2Values, '部署2: すべて', selectedDep2);

    const dep3Values = [...new Set(
        rankingState.allRows
            .filter((row) => (!dep1Select.value || row.dep1Name === dep1Select.value)
                && (!dep2Select.value || row.dep2Name === dep2Select.value))
            .map((row) => row.dep3Name)
            .filter(Boolean)
    )];
    populateSelect(dep3Select, dep3Values, '部署3: すべて', selectedDep3);
};

const applyModalFilter = () => {
    const { dep1Select, dep2Select, dep3Select, modalTbody } = getFilterElements();
    if (!dep1Select || !dep2Select || !dep3Select || !modalTbody) return;

    const filteredRows = rankingState.allRows.filter((row) => {
        if (dep1Select.value && row.dep1Name !== dep1Select.value) return false;
        if (dep2Select.value && row.dep2Name !== dep2Select.value) return false;
        if (dep3Select.value && row.dep3Name !== dep3Select.value) return false;
        return true;
    });

    modalTbody.innerHTML = buildModalRowsHtml(filteredRows);
};

const setupDepartmentRankingModal = (() => {
    let initialized = false;

    return () => {
        if (initialized) return;

        const modal = document.getElementById('department-ranking-modal');
        const openBtn = document.getElementById('btn-view-all-departments');
        const closeBtn = document.getElementById('btn-close-department-modal');
        const { dep1Select, dep2Select, dep3Select, clearButton } = getFilterElements();
        if (!modal || !openBtn || !closeBtn || !dep1Select || !dep2Select || !dep3Select || !clearButton) return;

        openBtn.addEventListener('click', () => {
            updateCascadeFilters();
            applyModalFilter();
            modal.style.display = 'flex';
        });

        const closeModal = () => {
            modal.style.display = 'none';
        };

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        dep1Select.addEventListener('change', () => {
            updateCascadeFilters();
            applyModalFilter();
        });

        dep2Select.addEventListener('change', () => {
            updateCascadeFilters();
            applyModalFilter();
        });

        dep3Select.addEventListener('change', () => {
            applyModalFilter();
        });

        clearButton.addEventListener('click', () => {
            dep1Select.value = '';
            dep2Select.value = '';
            const { dep3Select } = getFilterElements();
            if (dep3Select) {
                dep3Select.value = '';
            }
            updateCascadeFilters();
            applyModalFilter();
        });

        initialized = true;
    };
})();

export const renderLowUsageDepartmentRanking = (rankingData) => {
    setupDepartmentRankingModal();

    const cardTbody = document.getElementById('department-ranking-table');
    const modalTbody = document.getElementById('department-ranking-modal-table');
    if (!cardTbody || !modalTbody) return;

    const topRows = rankingData?.ranking || [];
    const allRows = rankingData?.allRanking || topRows;
    rankingState.allRows = allRows;

    cardTbody.innerHTML = buildCardRowsHtml(topRows);
    updateCascadeFilters();
    modalTbody.innerHTML = buildModalRowsHtml(allRows);
};
