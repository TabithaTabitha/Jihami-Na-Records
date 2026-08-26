/**
 * Jihami Na Records - Wcol Invoices Page
 * Waste collection invoice automation & management.
 * Backend: /api/wasteCol/invoices
 * Statuses: Draft, Sent, Paid, Partial, Overdue, Cancelled
 */

const WcolInvoicesPage = {
    invoices:   [],
    pagination: { page: 1, limit: 50, total: 0, totalPages: 1 },
    metadata:   { total_amount: 0, total_paid: 0, total_balance: 0 },
    _status:    null,

    async render(container) {
        container.innerHTML = UI.loader();
        const params     = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const invoiceId  = params.get('id');
        if (invoiceId) return this.renderDetail(container, invoiceId);

        await Promise.all([
            this._loadList(container, {}),
        ]);
    },

    // ─── List ───────────────────────────────────────────────────────────────

    async _loadList(container, filters) {
        container.innerHTML = UI.loader();
        try {
            const [listRes, statusRes] = await Promise.all([
                HttpService.get(API.wcolInvoices.list(filters)),
                HttpService.get(API.wcolInvoices.status),
            ]);

            this.invoices   = listRes.ok  ? (listRes.data.data  || [])        : [];
            if (!Array.isArray(this.invoices)) this.invoices = [];
            this.pagination = listRes.ok  ? (listRes.data.pagination || this.pagination) : this.pagination;
            this.metadata   = listRes.ok  ? (listRes.data.metadata   || this.metadata)   : this.metadata;
            this._status    = statusRes.ok ? (statusRes.data.data     || null)            : null;

            this._renderList(container, filters);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load invoices.</div>';
        }
    },

    _renderList(container, activeFilters = {}) {
        const s = this._status || {};

        // ── Stats ────────────────────────────────────────────────────────────
        const totalAmt   = parseFloat(this.metadata.total_amount  || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
        const totalPaid  = parseFloat(this.metadata.total_paid    || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
        const totalBal   = parseFloat(this.metadata.total_balance || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });
        const pct        = s.generated_percentage != null ? s.generated_percentage : '--';
        const lastGen    = s.last_generation ? UI.formatDate(s.last_generation) : 'Never';

        const statsHtml = `
            <div class="stats-grid" style="margin-bottom:1.5rem;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));">
                <div class="stat-card" style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-file-earmark-text"></i></div>
                    <div class="stat-value">${this.pagination.total}</div>
                    <div class="stat-label">Total Invoices</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-currency-exchange"></i></div>
                    <div class="stat-value">KES ${totalAmt}</div>
                    <div class="stat-label">Total Billed</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#0ea5e9 0%,#38bdf8 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-check2-circle"></i></div>
                    <div class="stat-value">KES ${totalPaid}</div>
                    <div class="stat-label">Total Paid</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-hourglass-split"></i></div>
                    <div class="stat-value">KES ${totalBal}</div>
                    <div class="stat-label">Outstanding</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-graph-up"></i></div>
                    <div class="stat-value">${pct}%</div>
                    <div class="stat-label">Generated This Month</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#374151 0%,#6b7280 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-clock-history"></i></div>
                    <div class="stat-value" style="font-size:0.95rem;">${lastGen}</div>
                    <div class="stat-label">Last Generation</div>
                </div>
            </div>`;

        // ── Filters ──────────────────────────────────────────────────────────
        const now      = new Date();
        const defStart = activeFilters.start_date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        const defEnd   = activeFilters.end_date   || new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];

        const filterHtml = `
            <div class="d-flex gap-2 flex-wrap align-items-center">
                <div class="toolbar-search">
                    <i class="bi bi-search"></i>
                    <input type="text" id="wcolInvSearch" class="form-control form-control-sm"
                           placeholder="Customer name / invoice no..." value="${UI.escapeHtml(activeFilters._search || '')}">
                </div>
                <select id="wcolInvStatus" class="form-select form-select-sm" style="width:140px;">
                    <option value="">All Statuses</option>
                    ${['Draft','Sent','Paid','Partial','Overdue','Cancelled'].map(s =>
                        `<option value="${s}" ${activeFilters.status === s ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                </select>
                <select id="wcolInvCycle" class="form-select form-select-sm" style="width:130px;">
                    <option value="">All Cycles</option>
                    <option value="weekly"  ${activeFilters.cycle_type === 'weekly'  ? 'selected' : ''}>Weekly</option>
                    <option value="monthly" ${activeFilters.cycle_type === 'monthly' ? 'selected' : ''}>Monthly</option>
                </select>
                <input type="date" id="wcolInvStart" class="form-control form-control-sm" style="width:145px;" value="${defStart}">
                <span style="font-size:.85rem;color:#6b7280;">to</span>
                <input type="date" id="wcolInvEnd"   class="form-control form-control-sm" style="width:145px;" value="${defEnd}">
                <button class="btn btn-sm btn-outline-primary" id="wcolInvApply">
                    <i class="bi bi-funnel"></i> Apply
                </button>
            </div>`;

        // ── Table ────────────────────────────────────────────────────────────
        const tableHtml = UI.table([
            { key: 'invoice_number', label: 'Invoice #',  render: r => `<a href="#/wcol-invoices?id=${r.id}" class="fw-bold text-decoration-none font-monospace">${UI.escapeHtml(r.invoice_number || '--')}</a>` },
            { key: 'invoice_date',   label: 'Date',       render: r => UI.formatDate(r.invoice_date) },
            { key: 'due_date',       label: 'Due',        render: r => UI.formatDate(r.due_date) },
            { key: 'full_name',      label: 'Client',     render: r => UI.escapeHtml(r.full_name || '--') },
            { key: 'cycle_name',     label: 'Cycle',      render: r => r.cycle_name ? `<span class="badge bg-info text-dark">${UI.escapeHtml(r.cycle_name)}</span>` : '--' },
            { key: 'total_amount',   label: 'Total',      render: r => `<strong>KES ${parseFloat(r.total_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</strong>` },
            { key: 'paid_amount',    label: 'Paid',       render: r => `KES ${parseFloat(r.paid_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}` },
            { key: 'status',         label: 'Status',     render: r => this._statusBadge(r.status) },
        ], this.invoices, {
            emptyMessage: 'No invoices found. Use "Generate Invoices" to create them.',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1" onclick="Router.navigate('#/wcol-invoices?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary"   onclick="WcolInvoicesPage.showEdit(${row.id})"><i class="bi bi-pencil"></i></button>`,
        });

        // ── Action buttons ───────────────────────────────────────────────────
        const actionHtml = `
            <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-success" id="wcolInvGenerate">
                    <i class="bi bi-lightning-charge"></i> Generate Invoices
                </button>
                <button class="btn btn-sm btn-outline-warning" id="wcolInvOverdue">
                    <i class="bi bi-exclamation-triangle"></i> Check Overdue
                </button>
                <button class="btn btn-sm btn-outline-secondary" id="wcolInvUpcoming">
                    <i class="bi bi-calendar-event"></i> Upcoming
                </button>
            </div>`;

        container.innerHTML = statsHtml + UI.pageCard({
            icon: 'file-earmark-text', color: '#4f46e5',
            title: 'Wcol Invoices', subtitle: 'Waste collection invoice automation',
            count: this.pagination.total,
            filterHtml,
            actionHtml,
        }, tableHtml);

        // ── Filter handler ────────────────────────────────────────────────────
        document.getElementById('wcolInvApply')?.addEventListener('click', () => {
            this._loadList(container, {
                status:      document.getElementById('wcolInvStatus')?.value || undefined,
                cycle_type:  document.getElementById('wcolInvCycle')?.value  || undefined,
                start_date:  document.getElementById('wcolInvStart')?.value  || undefined,
                end_date:    document.getElementById('wcolInvEnd')?.value    || undefined,
                _search:     document.getElementById('wcolInvSearch')?.value.trim() || undefined,
            });
        });

        // ── Generate invoices ─────────────────────────────────────────────────
        document.getElementById('wcolInvGenerate')?.addEventListener('click', async () => {
            const btn = document.getElementById('wcolInvGenerate');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generating…';
            try {
                const res = await HttpService.post(API.wcolInvoices.sync, {});
                if (res.ok) {
                    const d = res.data?.data || {};
                    UI.toast(`Generated ${d.invoices_created ?? 0} invoice(s)`, 'success');
                    await this._loadList(container, {});
                } else {
                    UI.toast(res.data?.message || 'Generation failed', 'danger');
                }
            } catch (_) {
                UI.toast('Network error', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-lightning-charge"></i> Generate Invoices';
            }
        });

        // ── Check overdue ─────────────────────────────────────────────────────
        document.getElementById('wcolInvOverdue')?.addEventListener('click', async () => {
            const btn = document.getElementById('wcolInvOverdue');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Checking…';
            try {
                const res = await HttpService.post(API.wcolInvoices.checkOverdue, {});
                if (res.ok) {
                    const count = res.data?.data?.updated_count ?? 0;
                    UI.toast(`${count} invoice(s) marked as overdue`, count > 0 ? 'warning' : 'success');
                    await this._loadList(container, {});
                } else {
                    UI.toast(res.data?.message || 'Failed to check overdue', 'danger');
                }
            } catch (_) { UI.toast('Network error', 'danger'); }
            finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Check Overdue'; }
        });

        // ── Upcoming invoices ─────────────────────────────────────────────────
        document.getElementById('wcolInvUpcoming')?.addEventListener('click', () => {
            this._showUpcomingModal();
        });
    },

    // ─── Upcoming Modal ─────────────────────────────────────────────────────

    async _showUpcomingModal() {
        const modalId = 'wcolUpcomingModal';
        document.getElementById(modalId)?.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-calendar-event text-primary me-2"></i>Upcoming Invoices (Next 7 Days)</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="upcomingBody">${UI.loader()}</div>
                    </div>
                </div>
            </div>`);

        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        try {
            const res  = await HttpService.get(API.wcolInvoices.upcoming);
            const rows = res.ok ? (res.data?.data || []) : [];
            const meta = res.ok ? (res.data?.metadata || {}) : {};

            const estTotal = parseFloat(meta.estimated_total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });

            const bodyHtml = rows.length === 0
                ? '<p class="text-muted text-center py-3">No invoices due in the next 7 days.</p>'
                : `
                    <div class="alert alert-info py-2 mb-3">
                        <strong>${meta.total || rows.length}</strong> invoice(s) due — estimated total:
                        <strong>KES ${estTotal}</strong>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Code</th><th>Client</th><th>Cycle</th>
                                    <th>Next Invoice Date</th><th class="text-end">Est. Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(r => `
                                    <tr>
                                        <td><span class="badge bg-secondary">${UI.escapeHtml(r.customer_code||'--')}</span></td>
                                        <td>${UI.escapeHtml(r.full_name||'--')}</td>
                                        <td><span class="badge bg-info text-dark">${UI.escapeHtml(r.cycle_name||'--')}</span></td>
                                        <td>${UI.formatDate(r.next_invoice_date)}</td>
                                        <td class="text-end fw-bold">KES ${parseFloat(r.estimated_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>`;

            document.getElementById('upcomingBody').innerHTML = bodyHtml;
        } catch (_) {
            document.getElementById('upcomingBody').innerHTML = '<div class="alert alert-danger">Failed to load upcoming invoices.</div>';
        }
    },

    // ─── Detail View ─────────────────────────────────────────────────────────

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolInvoices.get(id));
            const inv = res.ok ? (res.data.data || res.data) : null;
            if (!inv) {
                UI.toast('Invoice not found', 'danger');
                return Router.navigate('#/wcol-invoices');
            }

            const balance = parseFloat(inv.total_amount||0) - parseFloat(inv.paid_amount||0);

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-invoices')">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                    <div class="d-flex gap-2">
                        ${this._statusBadge(inv.status)}
                        <button class="btn btn-sm btn-outline-primary" onclick="WcolInvoicesPage.showEdit(${inv.id})">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-md-5">
                        ${UI.card('Client Info', `
                            <div class="mb-2"><strong>Code:</strong> <span class="badge bg-secondary">${UI.escapeHtml(inv.customer_code||'--')}</span></div>
                            <div class="mb-2"><strong>Name:</strong> ${UI.escapeHtml(inv.full_name||'--')}</div>
                            <div class="mb-2"><strong>Phone:</strong> ${UI.escapeHtml(inv.phone||'--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(inv.email||'--')}</div>
                            ${inv.address ? `<div class="mb-2"><strong>Address:</strong> ${UI.escapeHtml(inv.address)}</div>` : ''}
                        `)}
                    </div>
                    <div class="col-md-7">
                        ${UI.card('Invoice Details', `
                            <div class="mb-2"><strong>Invoice #:</strong> <span class="font-monospace fw-bold">${UI.escapeHtml(inv.invoice_number||'--')}</span></div>
                            <div class="mb-2"><strong>Cycle:</strong> <span class="badge bg-info text-dark">${UI.escapeHtml(inv.cycle_name||'--')}</span></div>
                            <div class="mb-2"><strong>Period:</strong> ${UI.formatDate(inv.period_start)} → ${UI.formatDate(inv.period_end)}</div>
                            <div class="mb-2"><strong>Invoice Date:</strong> ${UI.formatDate(inv.invoice_date)}</div>
                            <div class="mb-2"><strong>Due Date:</strong> ${UI.formatDate(inv.due_date)}</div>
                            <hr>
                            <div class="mb-2"><strong>Subtotal:</strong> KES ${parseFloat(inv.subtotal||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</div>
                            <div class="mb-2"><strong>Tax:</strong> KES ${parseFloat(inv.tax||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</div>
                            <div class="mb-2 fs-6"><strong>Total:</strong> <span class="text-success fw-bold">KES ${parseFloat(inv.total_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</span></div>
                            <div class="mb-2"><strong>Paid:</strong> KES ${parseFloat(inv.paid_amount||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</div>
                            <div class="mb-2"><strong>Balance:</strong> <span class="${balance > 0 ? 'text-danger' : 'text-success'} fw-bold">KES ${balance.toLocaleString('en-KE',{minimumFractionDigits:2})}</span></div>
                            ${inv.notes ? `<div class="mt-2 text-muted small"><i class="bi bi-chat-left-text me-1"></i>${UI.escapeHtml(inv.notes)}</div>` : ''}
                        `)}
                    </div>

                    ${Array.isArray(inv.items) && inv.items.length ? `
                    <div class="col-12">
                        ${UI.card('Line Items', `
                            <div class="table-responsive">
                                <table class="table table-sm mb-0">
                                    <thead class="table-light">
                                        <tr><th>Description</th><th class="text-center">Qty</th><th class="text-end">Unit Price</th><th class="text-end">Total</th></tr>
                                    </thead>
                                    <tbody>
                                        ${inv.items.map(item => `
                                            <tr>
                                                <td>${UI.escapeHtml(item.description||'')}</td>
                                                <td class="text-center">${item.quantity}</td>
                                                <td class="text-end">KES ${parseFloat(item.unit_price||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
                                                <td class="text-end fw-bold">KES ${parseFloat(item.total_price||0).toLocaleString('en-KE',{minimumFractionDigits:2})}</td>
                                            </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `)}
                    </div>` : ''}
                </div>`;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load invoice details.</div>';
        }
    },

    // ─── Edit Modal ──────────────────────────────────────────────────────────

    showEdit(id) {
        const inv = this.invoices.find(i => i.id === id);
        if (!inv) { UI.toast('Load the invoice detail first', 'warning'); return; }

        const modalId = 'wcolInvEditModal';
        document.getElementById(modalId)?.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Edit Invoice <span class="font-monospace text-muted">${UI.escapeHtml(inv.invoice_number||'')}</span></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="wcolInvEditForm" class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label fw-semibold">Status</label>
                                    ${UI.select('editInvStatus', [
                                        {value:'Draft',value2:'Draft'},{value:'Sent'},{value:'Paid'},{value:'Partial'},{value:'Overdue'},{value:'Cancelled'}
                                    ].map(o=>({value:o.value,label:o.value})), inv.status||'')}
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-semibold">Due Date</label>
                                    <input type="date" id="editInvDue" class="form-control"
                                           value="${inv.due_date ? inv.due_date.split('T')[0] : ''}">
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-semibold">Notes</label>
                                    <textarea id="editInvNotes" class="form-control" rows="3"
                                              placeholder="Optional notes…">${UI.escapeHtml(inv.notes||'')}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button class="btn btn-primary" id="wcolInvEditSave">
                                <i class="bi bi-check-lg"></i> Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>`);

        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();

        document.getElementById('wcolInvEditSave').addEventListener('click', async () => {
            const btn     = document.getElementById('wcolInvEditSave');
            btn.disabled  = true;
            const payload = {
                status:   document.getElementById('editInvStatus').value || undefined,
                due_date: document.getElementById('editInvDue').value    || undefined,
                notes:    document.getElementById('editInvNotes').value.trim() || undefined,
            };
            Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

            try {
                const res = await HttpService.put(API.wcolInvoices.update(id), payload);
                if (res.ok) {
                    UI.toast('Invoice updated!', 'success');
                    modal.hide();
                    await this._loadList(document.getElementById('pageContent'), {});
                } else {
                    UI.toast(res.data?.message || 'Update failed', 'danger');
                    btn.disabled = false;
                }
            } catch (_) {
                UI.toast('Network error', 'danger');
                btn.disabled = false;
            }
        });
    },

    // ─── Helpers ─────────────────────────────────────────────────────────────

    _statusBadge(status) {
        const map = {
            'Draft':     'bg-secondary',
            'Sent':      'bg-primary',
            'Paid':      'bg-success',
            'Partial':   'bg-info text-dark',
            'Overdue':   'bg-danger',
            'Cancelled': 'bg-dark',
        };
        const cls = map[status] || 'bg-secondary';
        return status ? `<span class="badge ${cls}">${UI.escapeHtml(status)}</span>` : '--';
    },
};

Router.register('/wcol-invoices', (container) => WcolInvoicesPage.render(container));
