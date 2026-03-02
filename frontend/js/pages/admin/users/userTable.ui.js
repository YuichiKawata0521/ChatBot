export class userTableUI {
    constructor(callbacks) {
        this.tbody = document.querySelector('.data-table tbody');
        this.callbacks = callbacks;
        this._initEvents();
    }

    _initEvents() {
        if (!this.tbody) return;

        this.tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;

            const tr = btn.closest('tr');
            const userId = tr.dataset.id || 'dummy_id';

            if (btn.classList.contains('edit')) {
                this.callbacks.onEdit(userId);
            } else if (btn.classList.contains('delete')) {
                this.callbacks.onDelete(userId);
            }
        });
    }

    render(users) {
        
    }
}