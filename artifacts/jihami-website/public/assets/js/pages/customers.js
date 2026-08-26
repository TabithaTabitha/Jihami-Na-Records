/**
 * Jihami - Customers Page
 * CRUD, search, statements. Matches Flutter CustomerListScreen & CustomerDetailScreen.
 */

const CustomersPage = {
    customers: [],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const customerId = params.get('id');

        if (customerId) return this.renderDetail(container, customerId);
        if (params.get('action') === 'add') return this.renderForm(container);

        try {
            const res = await HttpService.get(API.customers.list);
            this.customers = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.customers)) this.customers = [];
            console.log('Customers loaded:', this.customers);
            if (this.customers.length > 0) console.log('First customer structure:', this.customers[0]);
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load customers.</div>';
        }
    },

    renderList(container) {
        // Sort customers: those with credit first (by credit amount descending), then others
        const sortedCustomers = [...this.customers].sort((a, b) => {
            if (a.hascredit == 1 && b.hascredit != 1) return -1;
            if (a.hascredit != 1 && b.hascredit == 1) return 1;
            return (parseFloat(b.total_credit) || 0) - (parseFloat(a.total_credit) || 0);
        });

        // Calculate credit stats
        const customersWithCredit = this.customers.filter(c => c.hascredit == 1).length;
        const totalCredit = this.customers.reduce((sum, c) => sum + (parseFloat(c.total_credit) || 0), 0);

        // Credit stats cards
        const creditStatsHtml = `
            <div class="stats-grid" style="margin-bottom: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                <div class="stat-card" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white;">
                    <div class="stat-icon"><i class="bi bi-exclamation-circle"></i></div>
                    <div class="stat-value">${customersWithCredit}</div>
                    <div class="stat-label">Customers with Credit</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white;">
                    <div class="stat-icon"><i class="bi bi-cash"></i></div>
                    <div class="stat-value">${UI.money(totalCredit)}</div>
                    <div class="stat-label">Total Credit Balance</div>
                </div>
            </div>
        `;

        const tableHtml = UI.table([
            { key: 'name', label: 'Name', render: r => `<a href="#/customers?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.name || '')}</a>` },
            { key: 'phone', label: 'Phone', render: r => UI.escapeHtml(r.phone || r.phone_number || r.phoneNumber || '--') },
            { key: 'email', label: 'Email', render: r => UI.escapeHtml(r.email || r.emailAddress || r.email_address || '--') },
            { key: 'tax_id', label: 'KRA PIN', render: r => UI.escapeHtml(r.tax_id || r.krapin || r.kra_pin || r.kraPin || '--') },
            { key: 'total_credit', label: 'Credit Balance', class: 'text-end', render: r => UI.money(parseFloat(r.total_credit) || 0) },
        ], sortedCustomers, {
            rowClass: row => row.hascredit == 1 ? 'table-danger' : '',
            emptyMessage: 'No customers found. Add your first customer!',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1" onclick="Router.navigate('#/customers?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="CustomersPage.showEditModal(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="CustomersPage.deleteCustomer(${row.id})"><i class="bi bi-trash"></i></button>`
        });

        container.innerHTML = creditStatsHtml + UI.pageCard({
            icon: 'people', color: '#10b981',
            title: 'Customers', subtitle: 'Your customer database',
            count: this.customers.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="custSearch" class="form-control form-control-sm" placeholder="Search customers..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/customers?action=add')"><i class="bi bi-plus-lg"></i> Add Customer</button>`,
        }, tableHtml);

        document.getElementById('custSearch')?.addEventListener('input', async (e) => {
            const q = e.target.value.trim();
            if (q.length >= 2) {
                try {
                    const res = await HttpService.get(API.customers.search(q));
                    const data = res.ok ? (res.data.data || res.data || []) : [];
                    this.rebuildTable(container, Array.isArray(data) ? data : []);
                } catch (_) { /* ignore */ }
            } else if (q.length === 0) {
                this.rebuildTable(container, this.customers);
            }
        });
    },

    rebuildTable(container, data) {
        const body = container.querySelector('.card-body-custom');
        if (!body) return;
        
        // Sort: customers with credit first (by credit amount descending), then others
        const sortedData = [...data].sort((a, b) => {
            if (a.hascredit == 1 && b.hascredit != 1) return -1;
            if (a.hascredit != 1 && b.hascredit == 1) return 1;
            return (parseFloat(b.total_credit) || 0) - (parseFloat(a.total_credit) || 0);
        });
        
        // Update stats for the filtered data
        const customersWithCredit = sortedData.filter(c => c.hascredit == 1).length;
        const totalCredit = sortedData.reduce((sum, c) => sum + (parseFloat(c.total_credit) || 0), 0);
        
        // Update stats cards
        const statsContainer = container.querySelector('.stats-grid');
        if (statsContainer) {
            const statValues = statsContainer.querySelectorAll('.stat-value');
            if (statValues[0]) statValues[0].textContent = customersWithCredit;
            if (statValues[1]) statValues[1].textContent = UI.money(totalCredit);
        }
        
        body.innerHTML = UI.table([
            { key: 'name', label: 'Name', render: r => `<a href="#/customers?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.name || '')}</a>` },
            { key: 'phone', label: 'Phone', render: r => UI.escapeHtml(r.phone || r.phone_number || r.phoneNumber || '--') },
            { key: 'email', label: 'Email', render: r => UI.escapeHtml(r.email || r.emailAddress || r.email_address || '--') },
            { key: 'tax_id', label: 'KRA PIN', render: r => UI.escapeHtml(r.tax_id || r.krapin || r.kra_pin || r.kraPin || '--') },
            { key: 'total_credit', label: 'Credit Balance', class: 'text-end', render: r => UI.money(parseFloat(r.total_credit) || 0) },
        ], sortedData, {
            rowClass: row => row.hascredit == 1 ? 'table-danger' : '',
            emptyMessage: 'No customers match your search',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1" onclick="Router.navigate('#/customers?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="CustomersPage.showEditModal(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="CustomersPage.deleteCustomer(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const now = new Date();
            const [custRes, stmtRes] = await Promise.allSettled([
                HttpService.get(API.customers.get(id)),
                HttpService.get(API.customers.statement(id, now.getMonth() + 1, now.getFullYear())),
            ]);
            const customer = custRes.status === 'fulfilled' && custRes.value.ok ? (custRes.value.data.data || custRes.value.data) : null;
            const statements = stmtRes.status === 'fulfilled' && stmtRes.value.ok ? (stmtRes.value.data.data || stmtRes.value.data || []) : [];

            if (!customer) {
                UI.toast('Customer not found', 'danger');
                return Router.navigate('#/customers');
            }

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/customers')"><i class="bi bi-arrow-left"></i> Back</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="CustomersPage.showEditModal(${customer.id})"><i class="bi bi-pencil"></i> Edit</button>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        ${UI.card('Customer Info', `
                            <div class="mb-2"><strong>Name:</strong> ${UI.escapeHtml(customer.name || '')}</div>
                            <div class="mb-2"><strong>Phone:</strong> ${UI.escapeHtml(customer.phone_number || customer.phoneNumber || '--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(customer.email || '--')}</div>
                            <div class="mb-2"><strong>KRA PIN:</strong> ${UI.escapeHtml(customer.krapin || '--')}</div>
                            <div class="mb-2"><strong>P.O. Box:</strong> ${UI.escapeHtml(customer.pobox || '--')}</div>
                        `)}
                    </div>
                    <div class="col-md-8">
                        ${UI.card('Statement', UI.table([
                            { key: 'date', label: 'Date', render: r => UI.formatDate(r.date || r.createdAt) },
                            { key: 'description', label: 'Description', render: r => UI.escapeHtml(r.description || r.type || '--') },
                            { key: 'debit', label: 'Debit', class: 'text-end', render: r => r.debit ? UI.money(r.debit) : '--' },
                            { key: 'credit', label: 'Credit', class: 'text-end', render: r => r.credit ? UI.money(r.credit) : '--' },
                            { key: 'balance', label: 'Balance', class: 'text-end', render: r => `<strong>${UI.money(r.balance || 0)}</strong>` },
                        ], Array.isArray(statements) ? statements : [], { emptyMessage: 'No statements found' }))}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load customer details.</div>';
        }
    },

    renderForm(container, editData = null) {
        const isEdit = !!editData;
        const title = isEdit ? 'Edit Customer' : 'Add Customer';

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/customers')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">${title}</h6>
            </div>
            ${UI.card(title, `
                <form id="custForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Name', UI.input('custName', 'text', 'Customer name', editData?.name || '', 'required'), 'custName')}</div>
                    <div class="col-md-6">${UI.formGroup('Phone Number', UI.input('custPhone', 'tel', '+254...', editData?.phone_number || editData?.phoneNumber || ''), 'custPhone')}</div>
                    <div class="col-md-6">${UI.formGroup('Email', UI.input('custEmail', 'email', 'customer@example.com', editData?.email || ''), 'custEmail')}</div>
                    <div class="col-md-6">${UI.formGroup('KRA PIN', UI.input('custKra', 'text', 'KRA PIN', editData?.krapin || ''), 'custKra')}</div>
                    <div class="col-md-6">${UI.formGroup('P.O. Box', UI.input('custPO', 'text', 'P.O. Box', editData?.pobox || ''), 'custPO')}</div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> ${isEdit ? 'Update' : 'Save'} Customer</button>
                    </div>
                </form>
            `)}
        `;

        document.getElementById('custForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('custName').value,
                phone_number: document.getElementById('custPhone').value,
                email: document.getElementById('custEmail').value,
                krapin: document.getElementById('custKra').value,
                pobox: document.getElementById('custPO').value,
            };
            try {
                const res = isEdit
                    ? await HttpService.put(API.customers.update(editData.id), payload)
                    : await HttpService.post(API.customers.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Customer updated!' : 'Customer created!', 'success');
                    Router.navigate('#/customers');
                } else {
                    UI.toast(res.data.message || 'Failed to save customer', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    showEditModal(id) {
        const cust = this.customers.find(c => c.id === id);
        if (cust) this.renderForm(document.getElementById('pageContent'), cust);
    },

    deleteCustomer(id) {
        UI.confirm('Delete Customer', 'Are you sure you want to delete this customer?', async () => {
            try {
                const res = await HttpService.del(API.customers.delete(id));
                if (res.ok) {
                    UI.toast('Customer deleted', 'success');
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
