export class userModalUI {
    constructor(callbacks) {
        this.modal = document.getElementById('user-modal');
        this.singleForm = document.getElementById('single-user-form');
        this.csvForm = document.getElementById('csv-user-form');
        this.modalTitle = document.getElementById('modal-title');
        this.tabContainer = document.querySelector('.modal-tabs');
        this.dropArea = document.getElementById('csv-drop-area');
        this.fileInput = document.getElementById('csv-file-input');
        this.selectedFileName = document.getElementById('selected-file-name');
        this.uploadBtn = document.getElementById('btn-upload-csv');
        this.department1Select = this.singleForm?.elements['department1'];
        this.department2Select = this.singleForm?.elements['department2'];
        this.department3Select = this.singleForm?.elements['department3'];
        this.departmentIdInput = this.singleForm?.elements['department_id'];
        this.dropAreaDefaultNodes = this.dropArea
            ? Array.from(this.dropArea.children).filter((el) => el.id !== 'selected-file-name')
            : [];

        this.callbacks = callbacks;
        this.selectedCsvFile = null;
        this.departments = [];

        this._initTabs();
        this._initDragAndDrop();
        this._initDepartmentDropdowns();
        this._initFormSubmits();
        this._initCloseHandler();
    }

    open(mode = 'create', userData = null) {
        const passwordInput = this.singleForm?.elements['password'];

        if (mode === 'create') {
            this.modalTitle.textContent = '新規ユーザー登録';
            this.singleForm.reset();
            if (passwordInput) {
                passwordInput.required = true;
            }
            this._initializeDepartmentFields();
            this.csvForm.reset();
            this._resetCsvArea();
            this.tabContainer.hidden = false;
            this._switchTab('tab-single');
        } else if (mode === 'edit') {
            this.modalTitle.textContent = 'ユーザー編集';
            if (passwordInput) {
                passwordInput.required = false;
                passwordInput.value = '';
            }
            this.tabContainer.hidden = true;
            this._switchTab('tab-single');
            this._fillFormData(userData);
        }
        this.modal.hidden = false;
    }

    setDepartments(departments = []) {
        this.departments = Array.isArray(departments) ? departments : [];
        this._initializeDepartmentFields();
    }

    close() {
        this.modal.hidden = true;
    }


    _initTabs() {
        const tabBtns = this.modal?.querySelectorAll('.tab-btn') || [];
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this._switchTab(e.currentTarget.dataset.target);
            });
        });
    }

    _switchTab(tabId) {
        this.modal?.querySelectorAll('.tab-content').forEach(content => {
            content.hidden = true;
            content.classList.remove('active');
        });
        this.modal?.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.target === tabId);
        });

        const target = this.modal?.querySelector(`#${tabId}`);
        if (!target) return;
        target.hidden = false;
        setTimeout(() => target.classList.add('active'), 10);
    }

    _initDragAndDrop() {
        if (!this.dropArea || !this.fileInput) return;

        // デフォルトの挙動をキャンセル
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, () => this.dropArea.classList.add('dragover'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropArea.addEventListener(eventName, () => this.dropArea.classList.remove('dragover'), false);
        });

        this.dropArea.addEventListener('drop', (e) => {
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            this.fileInput.files = dataTransfer.files;

            this._updateCsvPreview(file);
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0] || null;
            this._updateCsvPreview(file);
        });
    }

    _initDepartmentDropdowns() {
        if (!this.department1Select || !this.department2Select || !this.department3Select) return;

        this.department1Select.addEventListener('change', () => {
            this._renderDepartment2Options(this.department1Select.value);
            this._renderDepartment3Options(this.department1Select.value, this.department2Select.value);
            this._syncDepartmentId();
        });

        this.department2Select.addEventListener('change', () => {
            this._renderDepartment3Options(this.department1Select.value, this.department2Select.value);
            this._syncDepartmentId();
        });

        this.department3Select.addEventListener('change', () => {
            this._syncDepartmentId();
        });
    }

    _initializeDepartmentFields() {
        if (!this.department1Select || !this.department2Select || !this.department3Select) return;

        this._renderDepartment1Options();
        this._renderDepartment2Options('');
        this._renderDepartment3Options('', '');
        this._syncDepartmentId();
    }

    _renderDepartment1Options(selectedValue = '') {
        const options = this._uniqueValues(
            this.departments.map((row) => row.dep1_name)
        );
        this._renderSelect(this.department1Select, options, selectedValue);
    }

    _renderDepartment2Options(dep1Name, selectedValue = '') {
        const options = this._uniqueValues(
            this.departments
                .filter((row) => (row.dep1_name || '') === (dep1Name || ''))
                .map((row) => row.dep2_name)
        );
        this._renderSelect(this.department2Select, options, selectedValue);
    }

    _renderDepartment3Options(dep1Name, dep2Name, selectedValue = '') {
        const options = this._uniqueValues(
            this.departments
                .filter((row) => (row.dep1_name || '') === (dep1Name || ''))
                .filter((row) => (row.dep2_name || '') === (dep2Name || ''))
                .map((row) => row.dep3_name)
        );
        this._renderSelect(this.department3Select, options, selectedValue);
    }

    _renderSelect(selectEl, values, selectedValue = '') {
        if (!selectEl) return;

        selectEl.innerHTML = '<option value="">選択してください</option>';
        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectEl.appendChild(option);
        });
        selectEl.value = selectedValue && values.includes(selectedValue) ? selectedValue : '';
    }

    _uniqueValues(values) {
        return [...new Set((values || []).filter((value) => !!value))];
    }

    _syncDepartmentId() {
        if (!this.departmentIdInput) return;

        const dep1Name = this.department1Select?.value || '';
        const dep2Name = this.department2Select?.value || '';
        const dep3Name = this.department3Select?.value || '';

        const exactMatch = this.departments.find((row) =>
            (row.dep1_name || '') === dep1Name &&
            (row.dep2_name || '') === dep2Name &&
            (row.dep3_name || '') === dep3Name
        );
        if (exactMatch) {
            this.departmentIdInput.value = String(exactMatch.id);
            return;
        }

        if (dep2Name && !dep3Name) {
            const dep2LevelMatch = this.departments.find((row) =>
                (row.dep1_name || '') === dep1Name &&
                (row.dep2_name || '') === dep2Name &&
                !row.dep3_name
            );
            this.departmentIdInput.value = dep2LevelMatch ? String(dep2LevelMatch.id) : '';
            return;
        }

        if (dep1Name && !dep2Name) {
            const dep1LevelMatch = this.departments.find((row) =>
                (row.dep1_name || '') === dep1Name &&
                !row.dep2_name &&
                !row.dep3_name
            );
            this.departmentIdInput.value = dep1LevelMatch ? String(dep1LevelMatch.id) : '';
            return;
        }

        this.departmentIdInput.value = '';
    }

    _selectDepartmentById(departmentId) {
        const target = this.departments.find((row) => String(row.id) === String(departmentId));
        if (!target) {
            this._initializeDepartmentFields();
            return;
        }

        this._renderDepartment1Options(target.dep1_name || '');
        this._renderDepartment2Options(target.dep1_name || '', target.dep2_name || '');
        this._renderDepartment3Options(target.dep1_name || '', target.dep2_name || '', target.dep3_name || '');
        this._syncDepartmentId();
    }

    _updateCsvPreview(file) {
        if (!file) {
            this._resetCsvArea();
            return;
        }

        const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
        if (!isCsv) {
            alert('CSVファイルを選択してください');
            this._resetCsvArea();
            return;
        }

        this.selectedCsvFile = file;
        this._setDropAreaDefaultVisible(false);
        if (this.selectedFileName) {
            this.selectedFileName.innerHTML = `
                <i class="fa-solid fa-file-csv fa-3x csv-preview-icon"></i>
                <div class="csv-preview-file-name">${file.name}</div>
            `;
            this.selectedFileName.classList.add('selected-file-preview');
        }
        if (this.uploadBtn) {
            this.uploadBtn.disabled = false;
        }
    }

    _resetCsvArea() {
        this.selectedCsvFile = null;
        this._setDropAreaDefaultVisible(true);
        if (this.selectedFileName) {
            this.selectedFileName.innerHTML = '';
            this.selectedFileName.textContent = '';
            this.selectedFileName.classList.remove('selected-file-preview');
        }
        if (this.fileInput) {
            this.fileInput.value = '';
        }
        if (this.uploadBtn) {
            this.uploadBtn.disabled = true;
        }
    }

    _setDropAreaDefaultVisible(isVisible) {
        this.dropAreaDefaultNodes.forEach((node) => {
            node.hidden = !isVisible;
        });
    }

    _initFormSubmits() {
        this.singleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(this.singleForm);
            const data = Object.fromEntries(formData.entries());
            await this.callbacks.onSaveSingle(data);
        });

        this.csvForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.selectedCsvFile) {
                await this.callbacks.onSaveCsv(this.selectedCsvFile);
            }
        });
    }

    _initCloseHandler() {
        this.modal?.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
            const isCsvCancelButton = btn.classList.contains('close-modal-btn') && !!btn.closest('#csv-user-form');

            if (isCsvCancelButton) {
                btn.addEventListener('click', () => {
                    this._resetCsvArea();
                    this.close();
                });
                return;
            }

            btn.addEventListener('click', () => this.close());
        });

        this.modal?.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.close();
            }
        });
    }

    _fillFormData(userData) {
        if (!userData) return;

        for (const [key, value] of Object.entries(userData)) {
            const input = this.singleForm.elements[key];
            if (input) {
                input.value = value;
            }
        }

        if (this.singleForm.elements['password']) {
            this.singleForm.elements['password'].value = '';
        }

        this._selectDepartmentById(userData.department_id);
    }
}