/**
 * Jihami - Suppliers Page
 * Procurement suppliers list and CRUD.
 */

const SuppliersPage = {
    suppliers: [],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'add') return this.renderForm(container);

        try {
            const res = await HttpService.get(API.suppliers.list);
            this.suppliers = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.suppliers)) this.suppliers = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load suppliers.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'truck', color: '#0ea5e9',
            title: 'Suppliers', subtitle: 'Procurement partner directory',
            count: this.suppliers.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="supplierSearch" class="form-control form-control-sm" placeholder="Search suppliers..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/suppliers?action=add')"><i class="bi bi-plus-lg"></i> Add Supplier</button>`,
        }, this._buildTable(this.suppliers));

        document.getElementById('supplierSearch')?.addEventListener('input', () => this._filter(container));
    },

    _filter(container) {
        const q = (document.getElementById('supplierSearch')?.value || '').toLowerCase();
        const filtered = this.suppliers.filter(supplier => {
            return !q || [supplier.name, supplier.email, supplier.phone, supplier.tax_id, supplier.address]
                .some(field => String(field || '').toLowerCase().includes(q));
        });
        const body = container.querySelector('.card-body-custom');
        if (body) body.innerHTML = this._buildTable(filtered);
    },

    _buildTable(data) {
        return UI.table([
            { key: 'name', label: 'Name', render: r => `<strong>${UI.escapeHtml(r.name || '--')}</strong>` },
            { key: 'phone', label: 'Phone', render: r => UI.escapeHtml(r.phone || '--') },
            { key: 'email', label: 'Email', render: r => UI.escapeHtml(r.email || '--') },
            { key: 'tax_id', label: 'Tax ID', render: r => UI.escapeHtml(r.tax_id || r.taxId || '--') },
            { key: 'address', label: 'Address', render: r => UI.escapeHtml(r.address || '--') },
            { key: 'created_at', label: 'Created', render: r => UI.formatDateTime(r.created_at || r.createdAt) },
        ], data, {
            emptyMessage: 'No suppliers found. Add your first supplier!',
            actions: row => `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="SuppliersPage.editSupplier(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="SuppliersPage.deleteSupplier(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderForm(container, editData = null) {
        container.innerHTML = UI.loader();
        const isEdit = !!editData;
        const title = isEdit ? 'Edit Supplier' : 'Add Supplier';

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/suppliers')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">${title}</h6>
            </div>
            ${UI.card(title, `
                <form id="supplierForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Name', UI.input('supplierName', 'text', 'Supplier name', editData?.name || '', 'required'), 'supplierName')}</div>
                    <div class="col-md-6">${UI.formGroup('Phone', UI.input('supplierPhone', 'text', '+2547....', editData?.phone || '', ''), 'supplierPhone')}</div>
                    <div class="col-md-6">${UI.formGroup('Email', UI.input('supplierEmail', 'email', 'email@example.com', editData?.email || '', ''), 'supplierEmail')}</div>
                    <div class="col-md-6">${UI.formGroup('Tax ID', UI.input('supplierTaxId', 'text', 'Tax ID', editData?.tax_id || editData?.taxId || '', ''), 'supplierTaxId')}</div>
                    <div class="col-12">${UI.formGroup('Address', UI.textarea('supplierAddress', 'Supplier address', editData?.address || '', 3), 'supplierAddress')}</div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> ${isEdit ? 'Update Supplier' : 'Save Supplier'}</button>
                    </div>
                </form>
            `)}
        `;

        document.getElementById('supplierForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('supplierName').value,
                phone: document.getElementById('supplierPhone').value,
                email: document.getElementById('supplierEmail').value,
                tax_id: document.getElementById('supplierTaxId').value,
                address: document.getElementById('supplierAddress').value,
            };

            try {
                const res = isEdit
                    ? await HttpService.put(API.suppliers.update(editData.id), payload)
                    : await HttpService.post(API.suppliers.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Supplier updated!' : 'Supplier created!', 'success');
                    Router.navigate('#/suppliers');
                } else {
                    UI.toast(res.data.message || 'Failed to save supplier', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    async editSupplier(id) {
        const container = document.getElementById('pageContent');
        if (!container) return;
        container.innerHTML = UI.loader();

        try {
            const res = await HttpService.get(API.suppliers.get(id));
            if (res.ok) {
                this.renderForm(container, res.data.data || res.data);
            } else {
                UI.toast('Supplier not found', 'danger');
                Router.navigate('#/suppliers');
            }
        } catch (err) {
            UI.toast('Failed to load supplier', 'danger');
        }
    },

    deleteSupplier(id) {
        UI.confirm('Delete Supplier', 'Are you sure you want to delete this supplier?', async () => {
            try {
                const res = await HttpService.del(API.suppliers.delete(id));
                if (res.ok) {
                    UI.toast('Supplier deleted', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || 'Failed to delete supplier', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};
