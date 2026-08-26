/**
 * Jihami - Quotations Page
 * View quotations (type=1 invoices). Matches Flutter QuotationListScreen.
 */

const QuotationsPage = {
    quotations: [],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const viewId = params.get('id');
        if (viewId) return this.renderDetail(container, viewId);

        try {
            const res = await HttpService.get(API.quotations.list);
            this.quotations = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.quotations)) this.quotations = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load quotations.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'file-earmark-text', color: '#0d9488',
            title: 'Quotations', subtitle: 'Price quotes for customers',
            count: this.quotations.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="quotSearch" class="form-control form-control-sm" placeholder="Search quotations..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="QuotationsPage.createQuotation()"><i class="bi bi-plus-lg"></i> New Quotation</button>`,
        }, this._buildTable(this.quotations));

        document.getElementById('quotSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.quotations.filter(qt =>
                (qt.invoiceNumber || qt.quotationNumber || '').toLowerCase().includes(q) ||
                (qt.customer?.name || qt.customerName || '').toLowerCase().includes(q)
            );
            const body = container.querySelector('.card-body-custom');
            if (body) body.innerHTML = this._buildTable(filtered);
        });
    },

    _buildTable(data) {
        return UI.table([
            { key: 'number', label: 'Quotation #', render: r => `<a href="#/quotations?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.invoiceNumber || r.quotationNumber || '--')}</a>` },
            { key: 'customer', label: 'Customer', render: r => UI.escapeHtml(r.customer?.name || r.customerName || '--') },
            { key: 'date', label: 'Date', render: r => UI.formatDate(r.createdAt || r.date) },
            { key: 'totalAmount', label: 'Amount', class: 'text-end', render: r => `<strong>${UI.money(r.totalAmount || r.total_amount || 0)}</strong>` },
        ], data, {
            emptyMessage: 'No quotations found',
            actions: row => `<button class="btn btn-sm btn-outline-info" onclick="Router.navigate('#/quotations?id=${row.id}')"><i class="bi bi-eye"></i></button>`
        });
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.quotations.get(id));
            if (!res.ok) { UI.toast('Quotation not found', 'danger'); return Router.navigate('#/quotations'); }
            const qt = res.data.data || res.data;
            const items = qt.items || qt.lineItems || [];

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/quotations')"><i class="bi bi-arrow-left"></i> Back</button>
                    <button class="btn btn-sm btn-primary" onclick="QuotationsPage.convertToInvoice(${qt.id})"><i class="bi bi-arrow-repeat"></i> Convert to Invoice</button>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        ${UI.card('Quotation Details', `
                            <div class="mb-2"><strong>Quotation #:</strong> ${UI.escapeHtml(qt.invoiceNumber || qt.quotationNumber || '')}</div>
                            <div class="mb-2"><strong>Date:</strong> ${UI.formatDate(qt.createdAt || qt.date)}</div>
                            <div class="mb-2"><strong>Customer:</strong> ${UI.escapeHtml(qt.customer?.name || qt.customerName || '--')}</div>
                            <div class="mb-2"><strong>Notes:</strong> ${UI.escapeHtml(qt.notes || '--')}</div>
                            <hr>
                            <div class="mb-2"><strong>Subtotal:</strong> ${UI.money(qt.subtotal || qt.subTotal || 0)}</div>
                            <div class="mb-2"><strong>Tax:</strong> ${UI.money(qt.totalTax || qt.total_tax || 0)}</div>
                            <div class="mb-2 fs-5"><strong>Total: ${UI.money(qt.totalAmount || qt.total_amount || 0)}</strong></div>
                        `)}
                    </div>
                    <div class="col-md-8">
                        ${UI.card('Line Items', UI.table([
                            { key: 'item', label: 'Item', render: r => UI.escapeHtml(r.item || r.itemName || r.name || '--') },
                            { key: 'quantity', label: 'Qty', class: 'text-center' },
                            { key: 'unitPrice', label: 'Unit Price', class: 'text-end', render: r => UI.money(r.unitPrice || r.unit_price || 0) },
                            { key: 'taxRate', label: 'Tax %', class: 'text-center', render: r => `${r.taxRate || r.tax_rate || 0}%` },
                            { key: 'total', label: 'Total', class: 'text-end', render: r => `<strong>${UI.money(r.totalPrice || r.totalWithTax || 0)}</strong>` },
                        ], items, { emptyMessage: 'No line items' }))}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load quotation.</div>';
        }
    },

    // Create quotation = create invoice with type=1
    createQuotation() {
        // Reuse invoice form but with type=1; redirect to invoices create page with a flag
        Router.navigate('#/invoices?action=create&type=quotation');
    },

    async convertToInvoice(id) {
        UI.confirm('Convert to Invoice', 'This will create an invoice from this quotation. Continue?', async () => {
            try {
                const res = await HttpService.get(API.quotations.get(id));
                if (!res.ok) return UI.toast('Failed to load quotation', 'danger');
                const qt = res.data.data || res.data;
                // Create as invoice (type=0)
                const payload = { ...qt, type: 0 };
                delete payload.id;
                delete payload.createdAt;
                delete payload.updatedAt;
                const createRes = await HttpService.post(API.invoices.create, payload);
                if (createRes.ok) {
                    UI.toast('Invoice created from quotation!', 'success');
                    Router.navigate('#/invoices');
                } else {
                    UI.toast(createRes.data.message || 'Failed to convert', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};
