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
        this.dropAreaDefaultNodes = this.dropArea
            ? Array.from(this.dropArea.children).filter((el) => el.id !== 'selected-file-name')
            : [];

        this.callbacks = callbacks;
        this.selectedCsvFile = null;

        this._initTabs();
        this._initDragAndDrop();
        this._initFormSubmits();
        this._initCloseHandler();
    }

    open(mode = 'create', userData = null) {
        if (mode === 'create') {
            this.modalTitle.textContent = '新規ユーザー登録';
            this.singleForm.reset();
            this.csvForm.reset();
            this._resetCsvArea();
            this.tabContainer.style.display = 'flex';
            this._switchTab('tab-single');
        } else if (mode === 'edit') {
            this.modalTitle.textContent = 'ユーザー編集';
            this.tabContainer.style.display = 'none';
            this._switchTab('tab-single');
            this._fillFormData(userData);
        }
        this.modal.style.display = 'flex';
    }

    close() {
        this.modal.style.display = 'none';
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
            content.style.display = 'none';
            content.classList.remove('active');
        });
        this.modal?.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.target === tabId);
        });

        const target = this.modal?.querySelector(`#${tabId}`);
        if (!target) return;
        target.style.display = 'block';
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
                <i class="fa-solid fa-file-csv fa-3x" style="color:#2ecc71;"></i>
                <div style="margin-top:10px; word-break:break-all;">${file.name}</div>
            `;
            this.selectedFileName.style.display = 'flex';
            this.selectedFileName.style.flexDirection = 'column';
            this.selectedFileName.style.alignItems = 'center';
            this.selectedFileName.style.justifyContent = 'center';
            this.selectedFileName.style.textAlign = 'center';
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
            this.selectedFileName.style.display = '';
            this.selectedFileName.style.flexDirection = '';
            this.selectedFileName.style.alignItems = '';
            this.selectedFileName.style.justifyContent = '';
            this.selectedFileName.style.textAlign = '';
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
            node.style.display = isVisible ? '' : 'none';
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
                });
                return;
            }

            btn.addEventListener('click', () => this.close());
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
    }
}