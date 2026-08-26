/**
 * Jihami - Stock Receipts Page
 * Inventory stock receiving and receipt tracking.
 */

const StockReceiptsPage = {
    receipts: [],
    suppliers: [],
    items: [],
    lineItems: [],
    _submitting: false,  // Prevent double submission

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'receive') return this.renderReceiveForm(container);

        const receiptId = params.get('id');
        if (receiptId) return this.renderDetail(container, receiptId);

        try {
            const res = await HttpService.get(API.stockReceipts.list);
            this.receipts = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.receipts)) this.receipts = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load stock receipts.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'inboxes', color: '#14b8a6',
            title: 'Stock Receiving', subtitle: 'Goods receipts and received stock',
            count: this.receipts.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="receiptSearch" class="form-control form-control-sm" placeholder="Search receipts..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/stock-receipts?action=receive')"><i class="bi bi-plus-lg"></i> Receive Stock</button>`,
        }, this._buildTable(this.receipts));

        document.getElementById('receiptSearch')?.addEventListener('input', () => this._filter(container));
    },

    _filter(container) {
        const q = (document.getElementById('receiptSearch')?.value || '').toLowerCase();
        const filtered = this.receipts.filter(r => {
            return !q || [r.invoice_number, r.supplier_name, r.supplier_email, String(r.total_amount)].some(field => String(field || '').toLowerCase().includes(q));
        });
        const body = container.querySelector('.card-body-custom');
        if (body) body.innerHTML = this._buildTable(filtered);
    },

    _buildTable(data) {
        return UI.table([
            { key: 'id', label: 'Receipt #', render: r => `<strong>#${r.id}</strong>` },
            { key: 'invoice_number', label: 'Invoice #', render: r => UI.escapeHtml(r.invoice_number || '--') },
            { key: 'supplier_name', label: 'Supplier', render: r => UI.escapeHtml(r.supplier_name || '--') },
            { key: 'total_amount', label: 'Total', class: 'text-end', render: r => `<strong>${UI.money(r.total_amount || 0)}</strong>` },
            { key: 'created_at', label: 'Date', render: r => UI.formatDateTime(r.created_at || r.createdAt) },
        ], data, {
            emptyMessage: 'No stock receipts found',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1" onclick="StockReceiptsPage.viewReceipt(${row.id})"><i class="bi bi-eye"></i></button>`
        });
    },

    viewReceipt(id) {
        Router.navigate(`#/stock-receipts?id=${id}`);
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.stockReceipts.get(id));
            if (!res.ok) {
                UI.toast('Receipt not found', 'danger');
                return Router.navigate('#/stock-receipts');
            }
            const receipt = res.data.data || res.data;
            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/stock-receipts')"><i class="bi bi-arrow-left"></i> Back</button>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        ${UI.card('Receipt Details', `
                            <div class="mb-2"><strong>Receipt #:</strong> ${UI.escapeHtml(String(receipt.id))}</div>
                            <div class="mb-2"><strong>Invoice #:</strong> ${UI.escapeHtml(receipt.invoice_number || '--')}</div>
                            <div class="mb-2"><strong>Supplier:</strong> ${UI.escapeHtml(receipt.supplier_name || '--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(receipt.supplier_email || '--')}</div>
                            <div class="mb-2"><strong>Phone:</strong> ${UI.escapeHtml(receipt.supplier_phone || '--')}</div>
                            <div class="mb-2"><strong>Total:</strong> ${UI.money(receipt.total_amount || 0)}</div>
                            <div class="mb-2"><strong>Date:</strong> ${UI.formatDateTime(receipt.created_at || receipt.createdAt)}</div>
                        `)}
                    </div>
                    <div class="col-md-8">
                        ${UI.card('Received Items', this._buildReceiptItemsTable(receipt.items || []))}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load receipt.</div>';
        }
    },

    _buildReceiptItemsTable(items) {
        return UI.table([
            { key: 'item_name', label: 'Item', render: r => UI.escapeHtml(r.item_name || r.itemName || '--') },
            { key: 'quantity', label: 'Qty', class: 'text-center', render: r => r.quantity || 0 },
            { key: 'cost_price', label: 'Cost', class: 'text-end', render: r => UI.money(r.cost_price || r.costPrice || 0) },
            { key: 'total', label: 'Line Total', class: 'text-end', render: r => UI.money((parseFloat(r.quantity) || 0) * (parseFloat(r.cost_price || r.costPrice || 0) || 0)) },
        ], items, { emptyMessage: 'No items found in this receipt' });
    },

    async renderReceiveForm(container) {
        container.innerHTML = UI.loader();
        this.lineItems = [];

        try {
            const [supplierRes, itemRes] = await Promise.allSettled([
                HttpService.get(API.suppliers.list),
                HttpService.get(API.items.list),
            ]);
            this.suppliers = supplierRes.status === 'fulfilled' && supplierRes.value.ok ? (supplierRes.value.data.data || supplierRes.value.data || []) : [];
            this.items = itemRes.status === 'fulfilled' && itemRes.value.ok ? (itemRes.value.data.data || itemRes.value.data || []) : [];
        } catch (_) {}

        const supplierOptions = [{ value: '', label: 'Select supplier' }, ...(Array.isArray(this.suppliers) ? this.suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.email || s.phone || ''})` })) : [])];
        const itemOptions = [{ value: '', label: 'Select item' }, ...(Array.isArray(this.items) ? this.items.map(i => ({ value: i.id, label: `${i.name || i.item_name || 'Item'} (${UI.money(i.unit_price || i.unitPrice || 0)})` })) : [])];

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/stock-receipts')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">Receive Stock</h6>
            </div>
            ${UI.card('Goods Receipt', `
                <form id="receiptForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Supplier', UI.select('receiptSupplier', supplierOptions, ''), 'receiptSupplier')}</div>
                    <div class="col-md-6">${UI.formGroup('Invoice Number', UI.input('receiptInvoice', 'text', 'INV-2024-001', ''), 'receiptInvoice')}</div>
                    <div class="col-12">
                        <div class="row g-2 align-items-end">
                            <div class="col-md-5">${UI.formGroup('Item', UI.select('receiptItem', itemOptions, ''), 'receiptItem')}</div>
                            <div class="col-md-2">${UI.formGroup('Qty', UI.input('receiptQty', 'number', '1', '1', 'min="1"'), 'receiptQty')}</div>
                            <div class="col-md-2">${UI.formGroup('Cost', UI.input('receiptCost', 'number', '0.00', '0.00', 'min="0" step="0.01"'), 'receiptCost')}</div>
                            <div class="col-md-2"><button type="button" class="btn btn-success w-100" onclick="StockReceiptsPage.addLineItem()"><i class="bi bi-plus"></i> Add</button></div>
                        </div>
                    </div>
                    <div class="col-12" id="receiptItemsTable"></div>
                    <div class="col-12 text-end"><button type="submit" class="btn btn-primary" id="submitReceiptBtn"><i class="bi bi-save"></i><span class="btn-text"> Submit Receipt</span><span class="btn-loader d-none"><i class="bi bi-hourglass-split"></i> Processing...</span></button></div>
                </form>
            `)}
        `;

        document.getElementById('receiptItem')?.addEventListener('change', (e) => {
            const item = this.items.find(i => String(i.id) === e.target.value);
            if (item) {
                document.getElementById('receiptCost').value = item.cost_price || item.unit_price || item.costPrice || item.unitPrice || 0;
            }
        });

        // Remove old listeners and attach new one (prevent duplicate submissions)
        const form = document.getElementById('receiptForm');
        if (form) {
            // Clone and replace to remove all old event listeners
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            // Attach fresh submit handler
            newForm?.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (StockReceiptsPage._submitting) return; // Prevent double submission
                await this.submitReceipt();
            }, { once: true }); // Only trigger once
        }
    },

    addLineItem() {
        const itemId = document.getElementById('receiptItem').value;
        const item = this.items.find(i => String(i.id) === itemId);
        const quantity = parseInt(document.getElementById('receiptQty').value) || 0;
        const costPrice = parseFloat(document.getElementById('receiptCost').value) || 0;
        if (!item) return UI.toast('Select an item first', 'warning');
        if (!quantity) return UI.toast('Enter quantity', 'warning');

        this.lineItems.push({
            item_id: item.id,
            quantity,
            cost_price: costPrice,
            item_name: item.name || item.item_name || '--',
        });
        this.renderLineItems();
    },

    renderLineItems() {
        const table = UI.table([
            { key: 'item_name', label: 'Item', render: r => UI.escapeHtml(r.item_name) },
            { key: 'quantity', label: 'Qty', class: 'text-center' },
            { key: 'cost_price', label: 'Cost', class: 'text-end', render: r => UI.money(r.cost_price) },
            { key: 'total', label: 'Total', class: 'text-end', render: r => UI.money((r.quantity || 0) * (r.cost_price || 0)) },
        ], this.lineItems, {
            emptyMessage: 'Add items to receive stock',
            actions: (row, idx) => `<button class="btn btn-sm btn-outline-danger" onclick="StockReceiptsPage.removeLineItem(${idx})"><i class="bi bi-x"></i></button>`
        });
        const tableContainer = document.getElementById('receiptItemsTable');
        if (tableContainer) tableContainer.innerHTML = table;
    },

    removeLineItem(index) {
        this.lineItems.splice(index, 1);
        this.renderLineItems();
    },

    async submitReceipt() {
        if (this._submitting) return; // Prevent concurrent submissions
        if (!this.lineItems.length) return UI.toast('Add at least one line item', 'warning');
        const supplierId = document.getElementById('receiptSupplier').value;
        const invoiceNumber = document.getElementById('receiptInvoice').value.trim();
        if (!supplierId) return UI.toast('Select a supplier', 'warning');
        if (!invoiceNumber) return UI.toast('Enter invoice number', 'warning');

        this._submitting = true; // Set flag to prevent double submission
        const submitBtn = document.getElementById('submitReceiptBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoader = submitBtn?.querySelector('.btn-loader');
        if (submitBtn) submitBtn.disabled = true;
        if (btnText) btnText.classList.add('d-none');
        if (btnLoader) btnLoader.classList.remove('d-none');

        const payload = {
            supplier_id: supplierId,
            invoice_number: invoiceNumber,
            items: this.lineItems.map(li => ({ item_id: li.item_id, quantity: li.quantity, cost_price: li.cost_price })),
        };

        console.log('Submitting stock receipt payload:', payload);

        try {
            const res = await HttpService.post(API.stockReceipts.receive, payload);
            if (res.ok) {
                UI.toast('Stock received successfully', 'success');
                Router.navigate('#/stock-receipts');
            } else {
                UI.toast(res.data.message || 'Failed to receive stock', 'danger');
            }
        } catch (err) {
            UI.toast('Network error', 'danger');
        } finally {
            this._submitting = false; // Reset flag
            const submitBtn = document.getElementById('submitReceiptBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');
            if (submitBtn) submitBtn.disabled = !this.lineItems.length;
            if (btnText) btnText.classList.remove('d-none');
            if (btnLoader) btnLoader.classList.add('d-none');
        }
    },
};
