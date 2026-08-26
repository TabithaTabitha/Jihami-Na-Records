
const UI = {

    toast(message, type = 'info', duration = 4000) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = { success: 'check-circle-fill', danger: 'exclamation-triangle-fill', warning: 'exclamation-circle-fill', info: 'info-circle-fill' };
        const toast = document.createElement('div');
        toast.className = `app-toast toast-${type}`;
        toast.innerHTML = `<i class="bi bi-${icons[type] || icons.info}"></i><span>${this.escapeHtml(message)}</span><button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close"><i class="bi bi-x"></i></button>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    },


    confirm(title, message, onConfirm, type = 'danger') {
        const id = 'confirmModal' + Date.now();
        const html = `
        <div class="modal fade" id="${id}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content">
                    <div class="modal-header"><h6 class="modal-title">${this.escapeHtml(title)}</h6><button class="btn-close" data-bs-dismiss="modal"></button></div>
                    <div class="modal-body"><p class="mb-0">${this.escapeHtml(message)}</p></div>
                    <div class="modal-footer">
                        <button class="btn btn-sm btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button class="btn btn-sm btn-${type}" id="${id}Confirm">Confirm</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        const modal = new bootstrap.Modal(document.getElementById(id));
        document.getElementById(id + 'Confirm').onclick = () => { modal.hide(); onConfirm(); };
        document.getElementById(id).addEventListener('hidden.bs.modal', () => document.getElementById(id).remove());
        modal.show();
    },


    table(columns, rows, opts = {}) {
        const emptyMsg = opts.emptyMessage || 'No data found';
        if (!rows || rows.length === 0) {
            return `<div class="empty-state"><i class="bi bi-inbox"></i><h6>${this.escapeHtml(emptyMsg)}</h6></div>`;
        }
        let html = '<div class="table-responsive"><table class="table table-hover align-middle mb-0">';
        html += '<thead><tr>';
        columns.forEach(col => {
            html += `<th class="${col.class || ''}">${this.escapeHtml(col.label)}</th>`;
        });
        if (opts.actions) html += '<th class="text-end">Actions</th>';
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            const rowClass = opts.rowClass ? opts.rowClass(row) : '';
            html += `<tr${rowClass ? ` class="${rowClass}"` : ''}>`;
            columns.forEach(col => {
                const val = col.render ? col.render(row) : (row[col.key] ?? '--');
                html += `<td class="${col.class || ''}">${val}</td>`;
            });
            if (opts.actions) {
                html += `<td class="text-end">${opts.actions(row)}</td>`;
            }
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    },


    statCard(icon, label, value, colorClass = 'bg-primary-soft', change = '') {
        const accentMap = {
            'bg-primary-soft': '#4f46e5',
            'bg-success-soft': '#059669',
            'bg-danger-soft':  '#e11d48',
            'bg-warning-soft': '#f59e0b',
            'bg-info-soft':    '#0891b2',
        };
        const accent = accentMap[colorClass] || '#4f46e5';
        return `
        <div class="stat-card" style="--card-accent:${accent}">
            <div class="metric-top">
                <span class="metric-label">${this.escapeHtml(label)}</span>
                <div class="metric-icon ${colorClass}"><i class="bi bi-${icon}"></i></div>
            </div>
            <div class="metric-value">${this.escapeHtml(String(value))}</div>
            ${change ? `<span class="stat-card-change">${change}</span>` : ''}
        </div>`;
    },


    card(title, body, headerRight = '') {
        return `
        <div class="dashboard-card">
            <div class="card-header-custom"><h5>${this.escapeHtml(title)}</h5>${headerRight}</div>
            <div class="card-body-custom">${body}</div>
        </div>`;
    },

    // ─── Page Card (icon + title + search + action in one card header) ──
    pageCard(opts, bodyHtml) {
        const { icon = '', color = '#2563eb', title = '', subtitle = '', count = null, filterHtml = '', actionHtml = '' } = opts;
        const countBadge = count !== null ? `<span class="count-chip">${count}</span>` : '';
        return `
        <div class="dashboard-card" style="margin-bottom:0">
            <div class="page-card-header">
                <div class="page-card-title-group">
                    <div class="page-card-icon" style="background:${color}1a;color:${color}">
                        <i class="bi bi-${icon}"></i>
                    </div>
                    <div>
                        <div class="page-card-title">${this.escapeHtml(title)} ${countBadge}</div>
                        ${subtitle ? `<div class="page-card-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
                    </div>
                </div>
                <div class="page-card-controls">
                    ${filterHtml}
                    ${actionHtml}
                </div>
            </div>
            <div class="card-body-custom">${bodyHtml}</div>
        </div>`;
    },

    // ─── Loading Spinner ────────────────────────────────────────────────
    loader() {
        return '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="text-muted mt-2 mb-0">Loading...</p></div>';
    },

    // ─── Badge ──────────────────────────────────────────────────────────
    badge(text, type = 'primary') {
        return `<span class="badge bg-${type}-subtle text-${type}">${this.escapeHtml(text)}</span>`;
    },

    statusBadge(status) {
        const map = {
            'paid': 'success', 'completed': 'success', 'active': 'success', 'available': 'success',
            'pending': 'warning', 'in_progress': 'warning', 'reserved': 'warning',
            'overdue': 'danger', 'cancelled': 'danger', 'suspended': 'danger',
            'draft': 'secondary', 'occupied': 'info',
        };
        return this.badge(status, map[status] || 'secondary');
    },

    // ─── Currency Formatter ─────────────────────────────────────────────
    money(amount, currency = 'KES') {
        const n = parseFloat(amount) || 0;
        const formatted = n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return currency ? `${currency} ${formatted}` : formatted;
    },

    // ─── Date Formatter ─────────────────────────────────────────────────
    formatDate(dateStr) {
        if (!dateStr) return '--';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '--';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    // ─── Escape HTML ────────────────────────────────────────────────────
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ─── Page Toolbar ───────────────────────────────────────────────────
    toolbar(leftHtml, rightHtml) {
        return `<div class="page-toolbar">${leftHtml || ''}${rightHtml || ''}</div>`;
    },

    // ─── Search Input ───────────────────────────────────────────────────
    searchInput(placeholder, onSearch) {
        const id = 'search' + Date.now();
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                let timer;
                el.addEventListener('input', () => {
                    clearTimeout(timer);
                    timer = setTimeout(() => onSearch(el.value.trim()), 300);
                });
            }
        }, 0);
        return `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="${id}" class="form-control form-control-sm" placeholder="${placeholder}"></div>`;
    },

    // ─── Pagination ─────────────────────────────────────────────────────
    pagination(currentPage, totalPages, onChange) {
        if (totalPages <= 1) return '';
        const id = 'pag' + Date.now();
        let html = `<nav class="d-flex justify-content-center mt-3"><ul class="pagination pagination-sm mb-0" id="${id}">`;
        html += `<li class="page-item ${currentPage <= 1 ? 'disabled' : ''}"><a class="page-link" data-page="${currentPage - 1}">‹</a></li>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" data-page="${i}">${i}</a></li>`;
        }
        html += `<li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}"><a class="page-link" data-page="${currentPage + 1}">›</a></li>`;
        html += '</ul></nav>';
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', e => {
                const p = e.target.closest('[data-page]');
                if (p && !p.parentElement.classList.contains('disabled') && !p.parentElement.classList.contains('active')) {
                    onChange(parseInt(p.dataset.page));
                }
            });
        }, 0);
        return html;
    },

    // ─── Form Helpers ───────────────────────────────────────────────────
    formGroup(label, inputHtml, id) {
        return `<div class="mb-3"><label for="${id}" class="form-label">${this.escapeHtml(label)}</label>${inputHtml}</div>`;
    },

    input(id, type = 'text', placeholder = '', value = '', attrs = '') {
        return `<input type="${type}" class="form-control" id="${id}" placeholder="${this.escapeHtml(placeholder)}" value="${this.escapeHtml(String(value))}" ${attrs}>`;
    },

    select(id, options, selected = '', attrs = '') {
        let html = `<select class="form-select" id="${id}" ${attrs}>`;
        options.forEach(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            html += `<option value="${this.escapeHtml(String(val))}" ${String(val) === String(selected) ? 'selected' : ''}>${this.escapeHtml(lbl)}</option>`;
        });
        html += '</select>';
        return html;
    },

    textarea(id, placeholder = '', value = '', rows = 3) {
        return `<textarea class="form-control" id="${id}" rows="${rows}" placeholder="${this.escapeHtml(placeholder)}">${this.escapeHtml(value)}</textarea>`;
    },
};
