/**
 * Jihami Na Records - Wcol Payments Page
 * Waste collection payments received through the C2B M-Pesa feed.
 * Backend: GET /api/payments/c2b
 */

const WcolPaymentsPage = {
    payments:  [],
    metadata:  { total_records: 0, total_amount: 0 },
    // cached customer list for picker
    _customers: null,

    _formatTransactionTime(value) {
        const raw = String(value || '');
        if (!/^\d{14}$/.test(raw)) return null;
        const year = raw.slice(0, 4);
        const month = raw.slice(4, 6);
        const day = raw.slice(6, 8);
        const hours = raw.slice(8, 10);
        const minutes = raw.slice(10, 12);
        const seconds = raw.slice(12, 14);
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },

    _normalisePayment(payment) {
        return {
            ...payment,
            id: payment.transaction_id,
            payment_date: this._formatTransactionTime(payment.transaction_time),
            customer_code: payment.bill_ref_number,
            full_name: payment.first_name,
            amount_paid: payment.amount,
            payment_method: 'M-Pesa C2B',
            reference_no: payment.transaction_id,
        };
    },

    _filterPayments(payments, filters = {}) {
        const query = String(filters._search || '').toLowerCase();
        const start = filters.start_date || '';
        const end = filters.end_date || '';

        return payments.filter((payment) => {
            const searchable = [
                payment.transaction_id,
                payment.bill_ref_number,
                payment.first_name,
            ].filter(Boolean).join(' ').toLowerCase();
            const date = payment.payment_date ? payment.payment_date.slice(0, 10) : '';

            return (!query || searchable.includes(query))
                && (!start || !date || date >= start)
                && (!end || !date || date <= end);
        });
    },

    async render(container) {
        container.innerHTML = UI.loader();
        const params    = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const paymentId = params.get('id');

        if (paymentId)                       return this.renderDetail(container, paymentId);
        if (params.get('action') === 'add')  return this.renderForm(container);

        await this._loadList(container, {});
    },

    async _loadList(container, filters) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolPayments.list);
            const rows = res.ok ? (res.data.data || res.data || []) : [];
            const allPayments = Array.isArray(rows) ? rows.map(p => this._normalisePayment(p)) : [];
            this.payments = this._filterPayments(allPayments, filters);
            this.metadata = {
                total_records: this.payments.length,
                total_amount:  this.payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0),
            };
            this._renderList(container, filters);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load payments.</div>';
        }
    },

    _renderList(container, activeFilters = {}) {
        const total  = this.metadata.total_records || this.payments.length;
        const amount = parseFloat(this.metadata.total_amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 });

        const statsHtml = `
            <div class="stats-grid" style="margin-bottom:1.5rem;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));">
                <div class="stat-card" style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-cash-stack"></i></div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total Payments</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-currency-exchange"></i></div>
                    <div class="stat-value">KES ${amount}</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-phone"></i></div>
                    <div class="stat-value">M-Pesa</div>
                    <div class="stat-label">Payment Source</div>
                </div>
            </div>`;

        // Date defaults: current month
        const now   = new Date();
        const defStart = activeFilters.start_date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        const defEnd   = activeFilters.end_date   || new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];

        const filterHtml = `
            <div class="d-flex gap-2 flex-wrap align-items-center">
                <div class="toolbar-search">
                    <i class="bi bi-search"></i>
                    <input type="text" id="wcolPaySearch" class="form-control form-control-sm"
                           placeholder="Transaction, name, or bill ref..." value="${UI.escapeHtml(activeFilters._search || '')}">
                </div>
                <input type="date" id="wcolPayStart" class="form-control form-control-sm" style="width:145px;" value="${defStart}">
                <span style="font-size:.85rem;color:#6b7280;">to</span>
                <input type="date" id="wcolPayEnd"   class="form-control form-control-sm" style="width:145px;" value="${defEnd}">
                <button class="btn btn-sm btn-outline-primary" id="wcolPayApply">
                    <i class="bi bi-funnel"></i> Apply
                </button>
            </div>`;

        const tableHtml = UI.table([
            { key: 'transaction_time', label: 'Transaction Time', render: r => UI.formatDateTime(r.payment_date) },
            { key: 'transaction_id',   label: 'Transaction ID', render: r => `<span class="badge bg-secondary">${UI.escapeHtml(r.transaction_id || '--')}</span>` },
            { key: 'bill_ref_number',  label: 'Bill Ref', render: r => UI.escapeHtml(r.bill_ref_number || '--') },
            { key: 'first_name',       label: 'Payer', render: r => UI.escapeHtml(r.first_name || '--') },
            { key: 'amount_paid',    label: 'Amount',    render: r => `<strong>KES ${parseFloat(r.amount_paid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>` },
            { key: 'payment_method', label: 'Method',    render: r => this._methodBadge(r.payment_method) },
        ], this.payments, {
            emptyMessage: 'No C2B payments found for this period.',
        });

        container.innerHTML = statsHtml + UI.pageCard({
            icon: 'cash-stack', color: '#4f46e5',
            title: 'Wcol Payments', subtitle: 'M-Pesa C2B payments for waste collection',
            count: total,
            filterHtml,
            actionHtml: `<span class="text-muted small"><i class="bi bi-arrow-repeat"></i> Synced from C2B</span>`,
        }, tableHtml);

        document.getElementById('wcolPayApply')?.addEventListener('click', () => {
            const search = document.getElementById('wcolPaySearch')?.value.trim() || '';
            const start  = document.getElementById('wcolPayStart')?.value || '';
            const end    = document.getElementById('wcolPayEnd')?.value   || '';
            this._loadList(container, {
                start_date:     start  || undefined,
                end_date:       end    || undefined,
                _search:        search,
            });
        });
    },

    _methodBadge(method) {
        const map = {
            'M-Pesa':        'bg-success',
            'M-Pesa C2B':    'bg-success',
            'Cash':          'bg-primary',
            'Bank Transfer': 'bg-info text-dark',
            'Cheque':        'bg-warning text-dark',
            'Card':          'bg-secondary',
            'Other':         'bg-dark',
        };
        const cls = map[method] || 'bg-secondary';
        return method ? `<span class="badge ${cls}">${UI.escapeHtml(method)}</span>` : '--';
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolPayments.get(id));
            const p   = res.ok ? (res.data.data || res.data) : null;
            if (!p) {
                UI.toast('Payment not found', 'danger');
                return Router.navigate('#/wcol-payments');
            }

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-payments')">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                    <button class="btn btn-sm btn-outline-primary" onclick="WcolPaymentsPage.showEdit(${p.id})">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                </div>
                <div class="row g-3">
                    <div class="col-md-5">
                        ${UI.card('Client Info', `
                            <div class="mb-2"><strong>Code:</strong> <span class="badge bg-secondary">${UI.escapeHtml(p.customer_code || '--')}</span></div>
                            <div class="mb-2"><strong>Name:</strong> ${UI.escapeHtml(p.full_name || '--')}</div>
                            <div class="mb-2"><strong>Phone:</strong> ${UI.escapeHtml(p.phone || '--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(p.email || '--')}</div>
                        `)}
                    </div>
                    <div class="col-md-7">
                        ${UI.card('Payment Details', `
                            <div class="mb-2"><strong>Amount:</strong> <span class="fs-5 fw-bold text-success">KES ${parseFloat(p.amount_paid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
                            <div class="mb-2"><strong>Method:</strong> ${this._methodBadge(p.payment_method)}</div>
                            <div class="mb-2"><strong>Reference:</strong> ${UI.escapeHtml(p.reference_no || '--')}</div>
                            <div class="mb-2"><strong>Date:</strong> ${UI.formatDate(p.payment_date)}</div>
                            <div class="mb-2"><strong>Invoice:</strong> ${p.invoice_id != null ? `#${p.invoice_id}` : '--'}</div>
                        `)}
                    </div>
                </div>`;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load payment details.</div>';
        }
    },

    async renderForm(container, editData = null) {
        const isEdit = !!editData;
        const v      = editData || {};

        // Load customers for picker
        if (!this._customers) {
            try {
                const res = await HttpService.get(API.wcolCustomers.list);
                this._customers = res.ok ? (res.data.data || res.data || []) : [];
                if (!Array.isArray(this._customers)) this._customers = [];
            } catch (_) { this._customers = []; }
        }

        const customerOptions = [{ value: '', label: '— Select client —' }].concat(
            this._customers.map(c => ({ value: c.id, label: `${c.customer_code} — ${c.full_name}` }))
        );

        const today = new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-payments')">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
                <h6 class="mb-0">${isEdit ? 'Edit' : 'Record'} Payment</h6>
            </div>
            ${UI.card(isEdit ? 'Edit Payment' : 'Record New Payment', `
                <form id="wcolPayForm" class="row g-3">
                    ${!isEdit ? `
                    <div class="col-12">
                        ${UI.formGroup('Client *', UI.select('wcolPayClient', customerOptions, v.customer_id || '', 'required'), 'wcolPayClient')}
                    </div>` : `
                    <div class="col-12">
                        <div class="alert alert-info py-2 mb-0">
                            <i class="bi bi-person-circle me-1"></i>
                            <strong>${UI.escapeHtml(v.full_name || '')}</strong>
                            <span class="text-muted ms-2">${UI.escapeHtml(v.customer_code || '')}</span>
                        </div>
                    </div>`}
                    <div class="col-md-6">
                        ${UI.formGroup('Amount Paid (KES) *', UI.input('wcolPayAmount', 'number', '0.00', v.amount_paid || '', 'required min="0.01" step="0.01"'), 'wcolPayAmount')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Payment Method *', UI.select('wcolPayMethod',
                            [
                                { value: '',              label: '— Select method —' },
                                { value: 'Cash',          label: 'Cash' },
                                { value: 'M-Pesa',        label: 'M-Pesa' },
                                { value: 'Bank Transfer', label: 'Bank Transfer' },
                                { value: 'Cheque',        label: 'Cheque' },
                                { value: 'Card',          label: 'Card' },
                                { value: 'Other',         label: 'Other' },
                            ], v.payment_method || ''), 'wcolPayMethod')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Reference No', UI.input('wcolPayRef', 'text', 'e.g. MPESA-XXXXXX', v.reference_no || ''), 'wcolPayRef')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Payment Date', UI.input('wcolPayDate', 'date', '', v.payment_date ? v.payment_date.split('T')[0] : today), 'wcolPayDate')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Invoice ID', UI.input('wcolPayInvoice', 'number', 'Optional invoice ID', v.invoice_id != null ? v.invoice_id : ''), 'wcolPayInvoice')}
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg"></i> ${isEdit ? 'Update' : 'Save'} Payment
                        </button>
                    </div>
                </form>
            `)}`;

        document.getElementById('wcolPayForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const method = document.getElementById('wcolPayMethod').value;
            if (!method) { UI.toast('Please select a payment method', 'danger'); return; }

            const invoiceRaw = document.getElementById('wcolPayInvoice').value.trim();
            const payload = {
                amount_paid:     parseFloat(document.getElementById('wcolPayAmount').value),
                payment_method:  method,
                reference_no:    document.getElementById('wcolPayRef').value.trim()  || null,
                payment_date:    document.getElementById('wcolPayDate').value         || null,
                invoice_id:      invoiceRaw ? parseInt(invoiceRaw, 10) : null,
            };

            if (!isEdit) {
                const cid = document.getElementById('wcolPayClient')?.value;
                if (!cid) { UI.toast('Please select a client', 'danger'); return; }
                payload.customer_id = parseInt(cid, 10);
            }

            try {
                const res = isEdit
                    ? await HttpService.put(API.wcolPayments.update(editData.id), payload)
                    : await HttpService.post(API.wcolPayments.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Payment updated!' : 'Payment recorded!', 'success');
                    Router.navigate('#/wcol-payments');
                } else {
                    UI.toast(res.data.message || 'Failed to save payment', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    showEdit(id) {
        const p = this.payments.find(p => p.id === id);
        if (p) this.renderForm(document.getElementById('pageContent'), p);
    },

    deletePayment(id) {
        UI.confirm('Delete Payment', 'Are you sure you want to delete this payment? This cannot be undone.', async () => {
            try {
                const res = await HttpService.del(API.wcolPayments.delete(id));
                if (res.ok) {
                    UI.toast('Payment deleted', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data?.message || 'Failed to delete payment', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};

Router.register('/wcol-payments', (container) => WcolPaymentsPage.render(container));
