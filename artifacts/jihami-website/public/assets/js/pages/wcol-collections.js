/**
 * Jihami Na Records - Wcol Collections Page
 * Tracks waste collection runs: Completed / Missed / Skipped.
 * Backend: Wcol_Collections JOIN Wcol_Customers via /wcol/collections
 * List requires ?month=M&year=YYYY
 */

const WcolCollectionsPage = {
    collections: [],
    currentMonth: new Date().getMonth() + 1,
    currentYear:  new Date().getFullYear(),
    // cached customer list for the add/edit picker
    _customers: null,

    async render(container) {
        container.innerHTML = UI.loader();
        const params       = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const collectionId = params.get('id');

        if (collectionId) return this.renderDetail(container, collectionId);
        if (params.get('action') === 'add') return this.renderForm(container);

        await this._loadList(container, this.currentMonth, this.currentYear);
    },

    async _loadList(container, month, year) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolCollections.list(month, year));
            this.collections = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.collections)) this.collections = [];
            this.currentMonth = month;
            this.currentYear  = year;
            this._renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load collections.</div>';
        }
    },

    _renderList(container) {
        const total     = this.collections.length;
        const completed = this.collections.filter(c => c.status === 'Completed').length;
        const missed    = this.collections.filter(c => c.status === 'Missed').length;
        const skipped   = this.collections.filter(c => c.status === 'Skipped').length;

        // Month/year navigator
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const monthOptions = months.map((m, i) =>
            `<option value="${i+1}" ${i+1 === this.currentMonth ? 'selected' : ''}>${m}</option>`
        ).join('');

        const yearOptions = Array.from({ length: 6 }, (_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return `<option value="${y}" ${y === this.currentYear ? 'selected' : ''}>${y}</option>`;
        }).join('');

        const statsHtml = `
            <div class="stats-grid" style="margin-bottom:1.5rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));">
                <div class="stat-card" style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-truck"></i></div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total Runs</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-check-circle"></i></div>
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#e11d48 0%,#f43f5e 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-x-circle"></i></div>
                    <div class="stat-value">${missed}</div>
                    <div class="stat-label">Missed</div>
                </div>
                <div class="stat-card" style="background:linear-gradient(135deg,#f59e0b 0%,#f97316 100%);color:#fff;">
                    <div class="stat-icon"><i class="bi bi-skip-forward-circle"></i></div>
                    <div class="stat-value">${skipped}</div>
                    <div class="stat-label">Skipped</div>
                </div>
            </div>`;

        const filterHtml = `
            <div class="d-flex gap-2 flex-wrap align-items-center">
                <select id="wcolColMonth" class="form-select form-select-sm" style="width:140px;">${monthOptions}</select>
                <select id="wcolColYear"  class="form-select form-select-sm" style="width:100px;">${yearOptions}</select>
                <select id="wcolColStatus" class="form-select form-select-sm" style="width:140px;">
                    <option value="">All Status</option>
                    <option value="Completed">Completed</option>
                    <option value="Missed">Missed</option>
                    <option value="Skipped">Skipped</option>
                </select>
                <button class="btn btn-sm btn-outline-primary" id="wcolColApply">
                    <i class="bi bi-funnel"></i> Apply
                </button>
            </div>`;

        const tableHtml = UI.table([
            { key: 'collection_date', label: 'Date',      render: r => UI.formatDate(r.collection_date) },
            { key: 'customer_code',   label: 'Code',      render: r => `<span class="badge bg-secondary">${UI.escapeHtml(r.customer_code || '--')}</span>` },
            { key: 'full_name',       label: 'Client',    render: r => UI.escapeHtml(r.full_name || '--') },
            { key: 'customer_type',   label: 'Type',      render: r => UI.escapeHtml(r.customer_type || '--') },
            { key: 'collection_frequency', label: 'Frequency', render: r => UI.escapeHtml(r.collection_frequency || '--') },
            { key: 'collected_by',    label: 'Collector', render: r => UI.escapeHtml(r.collected_by || '--') },
            { key: 'vehicle_id',      label: 'Vehicle',   render: r => UI.escapeHtml(r.vehicle_id != null ? String(r.vehicle_id) : '--') },
            { key: 'status',          label: 'Status',    render: r => this._statusBadge(r.status) },
        ], this.collections, {
            emptyMessage: 'No collections recorded for this period.',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1"    onclick="Router.navigate('#/wcol-collections?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="WcolCollectionsPage.showEdit(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger"        onclick="WcolCollectionsPage.deleteCollection(${row.id})"><i class="bi bi-trash"></i></button>`,
        });

        container.innerHTML = statsHtml + UI.pageCard({
            icon: 'truck', color: '#4f46e5',
            title: 'Collections',
            subtitle: `${months[this.currentMonth - 1]} ${this.currentYear} — waste collection runs`,
            count: total,
            filterHtml,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/wcol-collections?action=add')"><i class="bi bi-plus-lg"></i> Log Collection</button>`,
        }, tableHtml);

        // Apply filter button
        document.getElementById('wcolColApply')?.addEventListener('click', async () => {
            const m      = parseInt(document.getElementById('wcolColMonth').value, 10);
            const y      = parseInt(document.getElementById('wcolColYear').value, 10);
            const status = document.getElementById('wcolColStatus').value;
            container.innerHTML = UI.loader();
            try {
                const res = await HttpService.get(API.wcolCollections.list(m, y, '', status));
                this.collections = res.ok ? (res.data.data || res.data || []) : [];
                if (!Array.isArray(this.collections)) this.collections = [];
                this.currentMonth = m;
                this.currentYear  = y;
                this._renderList(container);
            } catch (_) {
                container.innerHTML = '<div class="alert alert-danger">Failed to load collections.</div>';
            }
        });
    },

    _statusBadge(status) {
        const map = { Completed: 'bg-success', Missed: 'bg-danger', Skipped: 'bg-warning text-dark' };
        const cls = map[status] || 'bg-secondary';
        return status ? `<span class="badge ${cls}">${UI.escapeHtml(status)}</span>` : '--';
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.wcolCollections.get(id));
            const c   = res.ok ? (res.data.data || res.data) : null;
            if (!c) {
                UI.toast('Collection not found', 'danger');
                return Router.navigate('#/wcol-collections');
            }

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-collections')">
                        <i class="bi bi-arrow-left"></i> Back
                    </button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="WcolCollectionsPage.showEdit(${c.id})">
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
                            <div class="mb-2"><strong>Type:</strong> ${UI.escapeHtml(c.customer_type || '--')}</div>
                            <div class="mb-2"><strong>Frequency:</strong> ${UI.escapeHtml(c.collection_frequency || '--')}</div>
                        `)}
                    </div>
                    <div class="col-md-7">
                        ${UI.card('Collection Details', `
                            <div class="mb-2"><strong>Date:</strong> ${UI.formatDate(c.collection_date)}</div>
                            <div class="mb-2"><strong>Status:</strong> ${this._statusBadge(c.status)}</div>
                            <div class="mb-2"><strong>Collected By:</strong> ${UI.escapeHtml(c.collected_by || '--')}</div>
                            <div class="mb-2"><strong>Vehicle:</strong> ${UI.escapeHtml(c.vehicle_id != null ? String(c.vehicle_id) : '--')}</div>
                            <div class="mb-2"><strong>Schedule ID:</strong> ${UI.escapeHtml(c.schedule_id != null ? String(c.schedule_id) : '--')}</div>
                            <div class="mb-2"><strong>Notes:</strong> ${UI.escapeHtml(c.notes || '--')}</div>
                            <div class="mb-2"><strong>Recorded:</strong> ${UI.formatDate(c.created_at)}</div>
                        `)}
                    </div>
                </div>`;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load collection details.</div>';
        }
    },

    async renderForm(container, editData = null) {
        const isEdit = !!editData;
        const v      = editData || {};

        // Load customers for the dropdown if not cached
        if (!this._customers) {
            try {
                const res = await HttpService.get(API.wcolCustomers.list);
                this._customers = res.ok ? (res.data.data || res.data || []) : [];
                if (!Array.isArray(this._customers)) this._customers = [];
            } catch (_) {
                this._customers = [];
            }
        }

        const customerOptions = [{ value: '', label: '— Select client —' }].concat(
            this._customers.map(c => ({ value: c.id, label: `${c.customer_code} — ${c.full_name}` }))
        );

        // Default date to today
        const today = new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/wcol-collections')">
                    <i class="bi bi-arrow-left"></i> Back
                </button>
                <h6 class="mb-0">${isEdit ? 'Edit' : 'Log'} Collection</h6>
            </div>
            ${UI.card(isEdit ? 'Edit Collection' : 'Log New Collection', `
                <form id="wcolColForm" class="row g-3">
                    <div class="col-md-6">
                        ${UI.formGroup('Client *', UI.select('wcolColClient', customerOptions, v.customer_id || '', 'required'), 'wcolColClient')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Collection Date *', UI.input('wcolColDate', 'date', '', v.collection_date ? v.collection_date.split('T')[0] : today, 'required'), 'wcolColDate')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Status', UI.select('wcolColStatus',
                            [
                                { value: 'Completed', label: 'Completed' },
                                { value: 'Missed',    label: 'Missed' },
                                { value: 'Skipped',   label: 'Skipped' },
                            ], v.status || 'Completed'), 'wcolColStatus')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Collected By', UI.input('wcolColBy', 'text', 'Name or ID of collector', v.collected_by || ''), 'wcolColBy')}
                    </div>
                    <div class="col-md-4">
                        ${UI.formGroup('Vehicle ID', UI.input('wcolColVehicle', 'number', 'Optional vehicle ID', v.vehicle_id != null ? v.vehicle_id : ''), 'wcolColVehicle')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Schedule ID', UI.input('wcolColSchedule', 'number', 'Optional schedule ID', v.schedule_id != null ? v.schedule_id : ''), 'wcolColSchedule')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Notes', UI.input('wcolColNotes', 'text', 'Any remarks...', v.notes || ''), 'wcolColNotes')}
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-check-lg"></i> ${isEdit ? 'Update' : 'Save'} Collection
                        </button>
                    </div>
                </form>
            `)}`;

        document.getElementById('wcolColForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const vehicleRaw   = document.getElementById('wcolColVehicle').value.trim();
            const scheduleRaw  = document.getElementById('wcolColSchedule').value.trim();
            const customerId   = document.getElementById('wcolColClient').value;

            if (!customerId) {
                UI.toast('Please select a client', 'danger');
                return;
            }

            const payload = {
                customer_id:     parseInt(customerId, 10),
                collection_date: document.getElementById('wcolColDate').value,
                status:          document.getElementById('wcolColStatus').value,
                collected_by:    document.getElementById('wcolColBy').value.trim() || null,
                vehicle_id:      vehicleRaw  ? parseInt(vehicleRaw, 10)  : null,
                schedule_id:     scheduleRaw ? parseInt(scheduleRaw, 10) : null,
                notes:           document.getElementById('wcolColNotes').value.trim() || null,
            };

            try {
                const res = isEdit
                    ? await HttpService.put(API.wcolCollections.update(editData.id), payload)
                    : await HttpService.post(API.wcolCollections.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Collection updated!' : 'Collection logged!', 'success');
                    Router.navigate('#/wcol-collections');
                } else {
                    UI.toast(res.data.message || 'Failed to save collection', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    showEdit(id) {
        const c = this.collections.find(c => c.id === id);
        if (c) this.renderForm(document.getElementById('pageContent'), c);
    },

    deleteCollection(id) {
        UI.confirm('Delete Collection', 'Remove this collection record?', async () => {
            try {
                const res = await HttpService.del(API.wcolCollections.delete(id));
                if (res.ok) {
                    UI.toast('Collection deleted', 'success');
                    this._loadList(document.getElementById('pageContent'), this.currentMonth, this.currentYear);
                } else {
                    UI.toast(res.data.message || 'Failed to delete', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};

Router.register('/wcol-collections', (container) => WcolCollectionsPage.render(container));
