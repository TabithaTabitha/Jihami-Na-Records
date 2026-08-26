/**
 * Jihami - Items / Inventory Page
 * CRUD for items. Matches Flutter ItemListScreen & AddItemScreen.
 */

const ItemsPage = {
    items: [],
    categories: [],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'add') return await this.renderForm(container);

        try {
            const [itemRes, catRes] = await Promise.allSettled([
                HttpService.get(API.items.list),
                HttpService.get(API.categories.list),
            ]);
            this.items = itemRes.status === 'fulfilled' && itemRes.value.ok ? (itemRes.value.data.data || itemRes.value.data || []) : [];
            this.categories = catRes.status === 'fulfilled' && catRes.value.ok ? (catRes.value.data.data || catRes.value.data || []) : [];
            if (!Array.isArray(this.items)) this.items = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load items.</div>';
        }
    },

    renderList(container) {
        const catOptions = this.categories.map(c => `<option value="${UI.escapeHtml(c.category_name || c.id || '')}">${UI.escapeHtml(c.category_name || c.id || '')}</option>`).join('');
        container.innerHTML = UI.pageCard({
            icon: 'box-seam', color: '#8b5cf6',
            title: 'Items / Inventory', subtitle: 'Products and services catalogue',
            count: this.items.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="itemSearch" class="form-control form-control-sm" placeholder="Search items..."></div>
                         <select id="itemCatFilter" class="form-select form-select-sm"><option value="">All Categories</option>${catOptions}</select>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/items?action=add')"><i class="bi bi-plus-lg"></i> Add Item</button>`,
        }, this._buildTable(this.items));

        document.getElementById('itemSearch')?.addEventListener('input', () => this._filter(container));
        document.getElementById('itemCatFilter')?.addEventListener('change', () => this._filter(container));
    },

    _filter(container) {
        const q = (document.getElementById('itemSearch')?.value || '').toLowerCase();
        const cat = document.getElementById('itemCatFilter')?.value || '';
        const filtered = this.items.filter(item => {
            const matchQ = !q || (item.name || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
            const matchCat = !cat || item.category === cat;
            return matchQ && matchCat;
        });
        const body = container.querySelector('.card-body-custom');
        if (body) body.innerHTML = this._buildTable(filtered);
    },

    _buildTable(data) {
        return UI.table([
            { key: 'name', label: 'Item Name', render: r => `<strong>${UI.escapeHtml(r.name || '')}</strong>` },
            { key: 'category', label: 'Category', render: r => UI.escapeHtml(r.category || '--') },
            { key: 'quantity', label: 'Stock', class: 'text-center', render: r => {
                const qty = parseFloat(r.quantity) || 0;
                return qty <= 0 ? `<span class="text-danger fw-bold">${qty}</span>` : qty <= 5 ? `<span class="text-warning fw-bold">${qty}</span>` : `<span>${qty}</span>`;
            }},
            { key: 'unit_price', label: 'Unit Price', class: 'text-end', render: r => UI.money(r.unit_price || r.unitPrice) },
            { key: 'tax_rate', label: 'Tax %', class: 'text-center', render: r => `${r.tax_rate || r.taxRate || 0}%` },
        ], data, {
            emptyMessage: 'No items found. Add your first item!',
            actions: row => `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="ItemsPage.editItem(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="ItemsPage.deleteItem(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderForm(container, editData = null) {
        container.innerHTML = UI.loader();
        try {
            if (!this.categories.length) {
                console.log('Fetching categories...');
                const catRes = await HttpService.get(API.categories.list);
                console.log('Categories response:', catRes);
                this.categories = catRes.ok ? (catRes.data.data || catRes.data || []) : [];
                console.log('Loaded categories:', this.categories);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
            // Ignore, proceed with empty categories
        }

        const isEdit = !!editData;
        const title = isEdit ? 'Edit Item' : 'Add Item';
        const itemCategory = editData ? (editData.category || editData.type || 'product') : 'product';
        const catOptions = [
            { value: 'service', label: 'Service' },
            { value: 'product', label: 'Product' },
        ];

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/items')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">${title}</h6>
            </div>
            ${UI.card(title, `
                <form id="itemForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Item Name', UI.input('itemName', 'text', 'Item name', editData?.name || '', 'required'), 'itemName')}</div>
                    <div class="col-md-6">${UI.formGroup('Category', UI.select('itemCat', [{value:'', label:'Select category'}, ...catOptions], itemCategory), 'itemCat')}</div>
                    <div class="col-12">${UI.formGroup('Description', UI.textarea('itemDesc', 'Item description...', editData?.description || '', 2), 'itemDesc')}</div>
                    <div class="col-md-4">${UI.formGroup('Quantity', UI.input('itemQty', 'number', '0', editData?.quantity || '', 'min="0" step="1"'), 'itemQty')}</div>
                    <div class="col-md-4">${UI.formGroup('Unit Price (KES)', UI.input('itemPrice', 'number', '0.00', editData?.unit_price || editData?.unitPrice || '', 'min="0" step="0.01" required'), 'itemPrice')}</div>
                    <div class="col-md-4">${UI.formGroup('Tax Rate (%)', UI.input('itemTax', 'number', '16', editData?.tax_rate || editData?.taxRate || '16', 'min="0" max="100" step="0.01"'), 'itemTax')}</div>
                    <div class="col-md-6">
                        <div class="form-check form-switch mt-3">
                            <input class="form-check-input" type="checkbox" id="itemIsRestaurant" ${editData?.isrestaurant ? 'checked' : ''}>
                            <label class="form-check-label" for="itemIsRestaurant">Restaurant Item</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-check form-switch mt-3">
                            <input class="form-check-input" type="checkbox" id="itemIsBOM" ${editData?.isBOM ? 'checked' : ''}>
                            <label class="form-check-label" for="itemIsBOM">Bill of Materials (BOM)</label>
                        </div>
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> ${isEdit ? 'Update' : 'Save'} Item</button>
                    </div>
                </form>
            `)}
        `;

        document.getElementById('itemForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryValue = document.getElementById('itemCat').value;
            if (!['service', 'product'].includes(categoryValue)) {
                UI.toast('Category must be either service or product', 'warning');
                return;
            }

            const payload = {
                name: document.getElementById('itemName').value,
                description: document.getElementById('itemDesc').value,
                quantity: parseInt(document.getElementById('itemQty').value) || 0,
                unit_price: parseFloat(document.getElementById('itemPrice').value) || 0,
                tax_rate: parseFloat(document.getElementById('itemTax').value) || 0,
                category: categoryValue,
                isrestaurant: document.getElementById('itemIsRestaurant').checked,
                isBOM: document.getElementById('itemIsBOM').checked,
            };
            try {
                let res;
                if (isEdit) {
                    res = await HttpService.put(API.items.update(editData.id), payload);
                } else {
                    console.log('Posting item payload to /api/pos/items:', payload);
                    res = await HttpService.post(API.items.create, payload);
                }
                if (res.ok) {
                    UI.toast(isEdit ? 'Item updated!' : 'Item created!', 'success');
                    Router.navigate('#/items');
                } else {
                    UI.toast(res.data.message || 'Failed to save item', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    async editItem(id) {
        const container = document.getElementById('pageContent');
        container.innerHTML = UI.loader();
        try {
            if (!this.categories.length) {
                const catRes = await HttpService.get(API.categories.list);
                this.categories = catRes.ok ? (catRes.data.data || catRes.data || []) : [];
            }
            const res = await HttpService.get(API.items.get(id));
            if (res.ok) {
                this.renderForm(container, res.data.data || res.data);
            } else {
                UI.toast('Item not found', 'danger');
                Router.navigate('#/items');
            }
        } catch (err) {
            UI.toast('Failed to load item', 'danger');
        }
    },

    deleteItem(id) {
        UI.confirm('Delete Item', 'Are you sure you want to delete this item?', async () => {
            try {
                const res = await HttpService.del(API.items.delete(id));
                if (res.ok) {
                    UI.toast('Item deleted', 'success');
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
