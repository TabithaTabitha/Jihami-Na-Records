/**
 * Jihami Na Records - Wcol Customers Page
 * Waste Collection client management. Separate from POS customers.
 * Backend: Wcol_Customers table via /wcol/customers
 */

const WcolCustomersPage = {
    customers: [],

    _balanceInfo(customer) {
        return customer?.balance_info || {};
    },

    _balanceAmount(value) {
        return `KES ${parseFloat(value || 0).toLocaleString('en-KE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    },

    _isBehind(customer) {
        const balance = this._balanceInfo(customer);
        const runningBalance = parseFloat(balance.running_balance || 0);
        const paymentStatus = String(balance.payment_status || '').toLowerCase();
        return runningBalance > 0 || ['pending', 'partial', 'overdue', 'unpaid', 'outstanding'].includes(paymentStatus);
    },

    _paymentStatusBadge(customer) {
        const balance = this._balanceInfo(customer);
        if (!Object.keys(balance).length) return '<span class="text-muted">No balance data</span>';

        const status = String(balance.payment_status || (this._isBehind(customer) ? 'Pending' : 'Paid'));
        const normalized = status.toLowerCase();
        const className = normalized === 'paid' || normalized === 'clear'
            ? 'bg-success'
            : this._isBehind(customer)
                ? 'bg-danger'
                : 'bg-secondary';

        return `<span class="badge ${className}">${UI.escapeHtml(status)}</span>`;
    },

    _filterByBalance(data, filter) {
        if (filter === 'behind') return data.filter(customer => this._isBehind(customer));
        if (filter === 'clear') return data.filter(customer => !this._isBehind(customer));
        return data;
    },

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const customerId = params.get('id');

        if (customerId) return this.renderDetail(container, customerId);
        if (params.get('action') === 'add') return this.renderForm(container);

        try {
            const res = await HttpService.get(API.wcolCustomers.list);
            this.customers = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.customers)) this.customers = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load Wcol customers.</div>';
        }
    },

    renderList(container) {
        const total     = this.customers.length;
        const active    = this.customers.filter(c => c.status === 'Active').length;
        const inactive  = this.customers.filter(c => c.status === 'Inactive').length;
        const behind    = this.customers.filter(c => this._isBehind(c)).length;
        const outstanding = this.customers.reduce((sum, customer) => {
            return sum + Math.max(0, parseFloat(this._balanceInfo(customer).running_balance || 0));
        }, 0);

        const statsHtml = `
            <div class="stats-grid" style="margin-bottom:1.5rem;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));">
                <div class="stat-card" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-recycle"></i></div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total Clients</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-check-circle"></i></div>
                    <div class="stat-value">${active}</div>
                    <div class="stat-label">Active</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-pause-circle"></i></div>
                    <div class="stat-value">${inactive}</div>
                    <div class="stat-label">Inactive</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#dc2626 0%,#ef4444 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-exclamation-triangle"></i></div>
                    <div class="stat-value">${behind}</div>
                    <div class="stat-label">Behind on Payments</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-wallet2"></i></div>
                    <div class="stat-value">${this._balanceAmount(outstanding)}</div>
                    <div class="stat-label">Outstanding Balance</div>
                </div>
            </div>`;

        const filterHtml = `
            <div class="d-flex gap-2 flex-wrap">
                <div class="toolbar-search">
                    <i class="bi bi-search"></i>
                    <input type="text" id="wcolSearch" class="form-control form-control-sm" placeholder="Search customers...">
                </div>
                <select id="wcolStatusFilter" class="form-select form-select-sm" style="width:130px;">
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <select id="wcolTypeFilter" class="form-select form-select-sm" style="width:150px;">
                    <option value="">All Types</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                </select>
                <select id="wcolBalanceFilter" class="form-select form-select-sm" style="width:170px;">
                    <option value="">All Payment Status</option>
                    <option value="behind">Behind on Payments</option>
                    <option value="clear">Paid / Clear</option>
                </select>
            </div>`;

        const tableHtml = UI.table([
            { key: 'customer_code', label: 'Code',      render: r => `<span class="badge bg-secondary">${UI.escapeHtml(r.customer_code || '--')}</span>` },
            { key: 'full_name',     label: 'Name',      render: r => `<a href="#/wcol-customers?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.full_name || '')}</a>` },
            { key: 'phone',         label: 'Phone',     render: r => UI.escapeHtml(r.phone || '--') },
            { key: 'customer_type', label: 'Type',      render: r => this._typeBadge(r.customer_type) },
            { key: 'waste_type',    label: 'Waste',     render: r => UI.escapeHtml(r.waste_type || '--') },
            { key: 'start_date',   label: 'Start Date', render: r => UI.formatDate(r.start_date) },
            { key: 'running_balance', label: 'Balance', render: r => {
                const amount = parseFloat(this._balanceInfo(r).running_balance || 0);
                return `<strong class="${amount > 0 ? 'text-danger' : 'text-success'}">${this._balanceAmount(amount)}</strong>`;
            } },
            { key: 'payment_status', label: 'Payment Status', render: r => this._paymentStatusBadge(r) },
            { key: 'status',        label: 'Status',    render: r => r.status === 'Active'
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>' },
        ], this.customers, {
            emptyMessage: 'No Wcol customers yet. Add your first client!',
            rowClass: row => this._isBehind(row) ? 'table-warning' : '',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1"    onclick="Router.navigate('#/wcol-customers?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="WcolCustomersPage.showEdit(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger"        onclick="WcolCustomersPage.deleteCustomer(${row.id})"><i class="bi bi-trash"></i></button>`,
        });

        container.innerHTML = statsHtml + UI.pageCard({
            icon: 'recycle', color: '#059669',
            title: 'Wcol Customers', subtitle: 'Waste collection client directory',
            count: total,
            filterHtml,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/wcol-customers?action=add')"><i class="bi bi-plus-lg"></i> Add Client</button>`,
        }, tableHtml);

        // Live filter controls
        const doFilter = async () => {
            const q      = document.getElementById('wcolSearch')?.value.trim() || '';
            const status = document.getElementById('wcolStatusFilter')?.value || '';
            const type   = document.getElementById('wcolTypeFilter')?.value || '';
            const balance = document.getElementById('wcolBalanceFilter')?.value || '';

            if (!q && !status && !type) {
                this._rebuildTable(container, this._filterByBalance(this.customers, balance));
                return;
            }
            try {
                const res = await HttpService.get(API.wcolCustomers.search(q, status, type));
                const data = res.ok ? (res.data.data || res.data || []) : [];
                this._rebuildTable(container, this._filterByBalance(Array.isArray(data) ? data : [], balance));
            } catch (_) { /* ignore */ }
        };

        document.getElementById('wcolSearch')?.addEventListener('input', doFilter);
        document.getElementById('wcolStatusFilter')?.addEventListener('change', doFilter);
        document.getElementById('wcolTypeFilter')?.addEventListener('change', doFilter);
        document.getElementById('wcolBalanceFilter')?.addEventListener('change', doFilter);
    },

    _typeBadge(type) {
        const map = { Residential: 'bg-primary', Commercial: 'bg-warning text-dark', Industrial: 'bg-danger' };
        const cls = map[type] || 'bg-secondary';
        return type ? `<span class="badge ${cls}">${UI.escapeHtml(type)}</span>` : '--';
    },

    _rebuildTable(container, data) {
        const body = container.querySelector('.card-body-custom');
        if (!body) return;
        body.innerHTML = UI.table([
            { key: 'customer_code', label: 'Code',      render: r => `<span class="badge bg-secondary">${UI.escapeHtml(r.customer_code || '--')}</span>` },
            { key: 'full_name',     label: 'Name',      render: r => `<a href="#/wcol-customers?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.full_name || '')}</a>` },
            { key: 'phone',         label: 'Phone',     render: r => UI.escapeHtml(r.phone || '--') },
            { key: 'customer_type', label: 'Type',      render: r => this._typeBadge(r.customer_type) },
            { key: 'waste_type',    label: 'Waste',     render: r => UI.escapeHtml(r.waste_type || '--') },
            { key: 'start_date',   label: 'Start Date', render: r => UI.formatDate(r.start_date) },
            { key: 'running_balance', label: 'Balance', render: r => {
                const amount = parseFloat(this._balanceInfo(r).running_balance || 0);
                return `<strong class="${amount > 0 ? 'text-danger' : 'text-success'}">${this._balanceAmount(amount)}</strong>`;
            } },
            { key: 'payment_status', label: 'Payment Status', render: r => this._paymentStatusBadge(r) },
            { key: 'status',        label: 'Status',    render: r => r.status === 'Active'
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-secondary">Inactive</span>' },
        ], data, {
            emptyMessage: 'No customers match your filters.',
            rowClass: row => this._isBehind(row) ? 'table-warning' : '',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1"    onclick="Router.navigate('#/wcol-customers?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="WcolCustomersPage.showEdit(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger"        onclick="WcolCustomersPage.deleteCustomer(${row.id})"><i class="bi bi-trash"></i></button>`,
        });
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolCustomers.get(id));
            const c   = res.ok ? (res.data.data || res.data) : null;
            if (!c) {
                UI.toast('Customer not found', 'danger');
                return Router.navigate('#/wcol-customers');
            }
            const balance = this._balanceInfo(c);
            const runningBalance = parseFloat(balance.running_balance || 0);

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-customers')">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="WcolCustomersPage.showEdit(${c.id})">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-5">
                        ${UI.card('Client Info', `
                            <div class="mb-2"><strong>Code:</strong> <span class="badge bg-secondary">${UI.escapeHtml(c.customer_code || '--')}</span></div>
                            <div class="mb-2"><strong>Name:</strong> ${UI.escapeHtml(c.full_name || '--')}</div>
                            <div class="mb-2"><strong>Phone:</strong> ${UI.escapeHtml(c.phone || '--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(c.email || '--')}</div>
                            <div class="mb-2"><strong>Address:</strong> ${UI.escapeHtml(c.address || '--')}</div>
                        `)}
                    </div>
                    <div class="col-md-7">
                        ${UI.card('Collection Details', `
                            <div class="mb-2"><strong>Type:</strong> ${this._typeBadge(c.customer_type)}</div>
                            <div class="mb-2"><strong>Waste Type:</strong> ${UI.escapeHtml(c.waste_type || '--')}</div>
                            <div class="mb-2"><strong>Start Date:</strong> ${UI.formatDate(c.start_date)}</div>
                            <div class="mb-2"><strong>Status:</strong> ${c.status === 'Active'
                                ? '<span class="badge bg-success">Active</span>'
                                : '<span class="badge bg-secondary">Inactive</span>'}</div>
                            <div class="mb-2"><strong>Plan ID:</strong> ${c.plan_id != null ? UI.escapeHtml(String(c.plan_id)) : '--'}</div>
                            <div class="mb-2"><strong>Created:</strong> ${UI.formatDate(c.created_at)}</div>
                        `)}
                    </div>
                </div>
                <div class="row g-3 mt-1">
                    <div class="col-12">
                        ${UI.card('Balance & Payment Status', `
                            <div class="row g-3">
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Total Due</div>
                                    <div class="fs-5 fw-semibold">${this._balanceAmount(balance.total_due)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Total Paid</div>
                                    <div class="fs-5 fw-semibold text-success">${this._balanceAmount(balance.total_paid)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Running Balance</div>
                                    <div class="fs-5 fw-semibold ${runningBalance > 0 ? 'text-danger' : 'text-success'}">${this._balanceAmount(runningBalance)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Payment Status</div>
                                    <div class="mt-1">${this._paymentStatusBadge(c)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Plan</div>
                                    <div class="fw-semibold">${UI.escapeHtml(balance.plan_name || '--')}</div>
                                    <div class="small text-muted">${this._balanceAmount(balance.plan_price)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Cycles Completed</div>
                                    <div class="fw-semibold">${balance.cycles_completed != null ? UI.escapeHtml(String(balance.cycles_completed)) : '--'}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Billing Window</div>
                                    <div class="fw-semibold">${UI.formatDate(balance.start_date)} – ${UI.formatDate(balance.end_date)}</div>
                                </div>
                                <div class="col-sm-6 col-lg-3">
                                    <div class="text-muted small">Reference Date</div>
                                    <div class="fw-semibold">${UI.formatDate(balance.reference_date)}</div>
                                </div>
                            </div>
                        `)}
                    </div>
                </div>`;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load customer details.</div>';
        }
    },

    async renderForm(container, editData = null) {
        const isEdit = !!editData;
        const v = editData || {};

        // Fetch cycles for the plan dropdown
        let cycleOptions = [{ value: '', label: '— No plan —' }];
        try {
            const res = await HttpService.get(API.wcolCycles.list);
            const cycles = res.ok ? (res.data.data || res.data || []) : [];
            if (Array.isArray(cycles)) {
                cycleOptions = cycleOptions.concat(
                    cycles.map(c => ({ value: String(c.id), label: c.name }))
                );
            }
        } catch (_) { /* show dropdown with no options on error */ }

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-customers')">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
                <h6 class="mb-0">${isEdit ? 'Edit' : 'Add'} Wcol Client</h6>
            </div>
            ${UI.card(isEdit ? 'Edit Client' : 'New Waste Collection Client', `
                <form id="wcolForm" class="row g-3">
                    ${isEdit ? `
                    <div class="col-md-4">
                        ${UI.formGroup('Client Code', UI.input('wcolCode', 'text', 'e.g. WC-001', v.customer_code || '', 'readonly'), 'wcolCode')}
                    </div>` : ''}
                    <div class="${isEdit ? 'col-md-8' : 'col-12'}">
                        ${UI.formGroup('Full Name *', UI.input('wcolName', 'text', 'Full name', v.full_name || '', 'required'), 'wcolName')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Phone *', UI.input('wcolPhone', 'tel', '+254...', v.phone || '', 'required'), 'wcolPhone')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Email *', UI.input('wcolEmail', 'email', 'client@example.com', v.email || '', 'required'), 'wcolEmail')}
                    </div>
                    <div class="col-12">
                        ${UI.formGroup('Address *', UI.input('wcolAddress', 'text', 'Physical address', v.address || '', 'required'), 'wcolAddress')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Client Type', UI.select('wcolType',
                            [
                                { value: 'Residential', label: 'Residential' },
                                { value: 'Commercial',  label: 'Commercial' },
                                { value: 'Industrial',  label: 'Industrial' },
                            ], v.customer_type || 'Residential', 'required'), 'wcolType')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Waste Type *', UI.input('wcolWaste', 'text', 'e.g. General, Recyclable', v.waste_type || '', 'required'), 'wcolWaste')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Start Date *', UI.input('wcolStartDate', 'date', '', v.start_date || '', 'required'), 'wcolStartDate')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Status', UI.select('wcolStatus',
                            [
                                { value: 'Active',   label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' },
                            ], v.status || 'Active', 'required'), 'wcolStatus')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Plan *', UI.select('wcolPlan', cycleOptions, v.plan_id != null ? String(v.plan_id) : '', 'required'), 'wcolPlan')}
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg"></i> ${isEdit ? 'Update' : 'Save'} Client
                        </button>
                    </div>
                </form>
            `)}`;

        document.getElementById('wcolForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const planRaw = document.getElementById('wcolPlan').value;
            if (!planRaw) {
                UI.toast('Please select a plan', 'danger');
                return;
            }

            const payload = {
                full_name:            document.getElementById('wcolName').value.trim(),
                phone:                document.getElementById('wcolPhone').value.trim(),
                email:                document.getElementById('wcolEmail').value.trim(),
                address:              document.getElementById('wcolAddress').value.trim(),
                customer_type:        document.getElementById('wcolType').value,
                waste_type:           document.getElementById('wcolWaste').value.trim(),
                start_date:           document.getElementById('wcolStartDate').value,
                status:               document.getElementById('wcolStatus').value,
                plan_id:              parseInt(planRaw, 10),
            };
            if (isEdit) {
                payload.customer_code = document.getElementById('wcolCode').value.trim();
            }
            try {
                const res = isEdit
                    ? await HttpService.put(API.wcolCustomers.update(editData.id), payload)
                    : await HttpService.post(API.wcolCustomers.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Client updated!' : 'Client created!', 'success');
                    Router.navigate('#/wcol-customers');
                } else {
                    UI.toast(res.data.message || 'Failed to save client', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    showEdit(id) {
        const c = this.customers.find(c => c.id === id);
        if (c) this.renderForm(document.getElementById('pageContent'), c);
    },

    deleteCustomer(id) {
        UI.confirm('Delete Client', 'Are you sure you want to remove this Wcol client?', async () => {
            try {
                const res = await HttpService.del(API.wcolCustomers.delete(id));
                if (res.ok) {
                    UI.toast('Client deleted', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || 'Failed to delete', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};

Router.register('/wcol-customers', (container) => WcolCustomersPage.render(container));
