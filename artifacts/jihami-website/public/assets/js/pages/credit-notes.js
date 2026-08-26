/**
 * Jihami - Credit Notes Page
 * CRUD with reason codes. Matches Flutter CreditNoteListScreen & CreateCreditNoteScreen.
 */

const CreditNotesPage = {
    creditNotes: [],
    currentPage: 1,
    _submitting: false,

    REASON_CODES: [
        { value: '01', label: '01 - Incorrect Invoice Amount' },
        { value: '02', label: '02 - Damaged Goods' },
        { value: '03', label: '03 - Goods Returned' },
        { value: '04', label: '04 - Order Cancelled' },
        { value: '05', label: '05 - Service Not Rendered' },
        { value: '06', label: '06 - Duplicate Invoice' },
        { value: '07', label: '07 - Pricing Error' },
        { value: '08', label: '08 - Overcharged' },
        { value: '09', label: '09 - Customer Complaint' },
        { value: '10', label: '10 - Other' },
    ],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'create') return this.renderCreateForm(container);

        try {
            const res = await HttpService.get(API.creditNotes.list(this.currentPage));
            this.creditNotes = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.creditNotes)) this.creditNotes = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load credit notes.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'file-earmark-minus', color: '#ef4444',
            title: 'Credit Notes', subtitle: 'Invoice adjustments and refunds',
            count: this.creditNotes.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="cnSearch" class="form-control form-control-sm" placeholder="Search credit notes..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/credit-notes?action=create')"><i class="bi bi-plus-lg"></i> New Credit Note</button>`,
        }, this._buildTable(this.creditNotes));

        document.getElementById('cnSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.creditNotes.filter(cn =>
                (cn.invoice_number || cn.invoiceNumber || '').toLowerCase().includes(q) ||
                (cn.reason_code || '').includes(q)
            );
            const body = container.querySelector('.card-body-custom');
            if (body) body.innerHTML = this._buildTable(filtered);
        });
    },

    _buildTable(data) {
        return UI.table([
            { key: 'id', label: 'CN #', render: r => `<strong>#${r.id}</strong>` },
            { key: 'invoice_number', label: 'Invoice #', render: r => UI.escapeHtml(r.invoice_number || r.invoiceNumber || '--') },
            { key: 'type', label: 'Type', render: r => r.type === 'full' ? UI.badge('Full', 'primary') : UI.badge('Partial', 'warning') },
            { key: 'reason_code', label: 'Reason', render: r => {
                const code = r.reason_code || r.reasonCode || r.reason || '';
                const reasonLabel = this.REASON_CODES.find(rc => rc.value === code)?.label || code || '--';
                return UI.escapeHtml(reasonLabel);
            }},
            { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong class="text-danger">${UI.money(r.amount || 0)}</strong>` },
            { key: 'date', label: 'Date', render: r => {
                const dateStr = r.createdAt || r.created_at || r.creationDate || r.creation_date || r.date || '--';
                return dateStr === '--' ? '--' : UI.formatDateTime(dateStr);
            }},
        ], data, {
            emptyMessage: 'No credit notes found',
            actions: row => `
                <button class="btn btn-sm btn-outline-danger" onclick="CreditNotesPage.deleteCreditNote(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderCreateForm(container) {
        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/credit-notes')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">Create Credit Note</h6>
            </div>
            ${UI.card('Credit Note Details', `
                <form id="cnForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Invoice Number', UI.input('cnInvoice', 'text', 'INV-XXXX', '', 'required'), 'cnInvoice')}</div>
                    <div class="col-md-6">${UI.formGroup('Credit Note Type', UI.select('cnType', [
                        { value: 'full', label: 'Full Credit' },
                        { value: 'partial', label: 'Partial Credit' },
                    ], 'full'), 'cnType')}</div>
                    <div class="col-md-6">${UI.formGroup('Reason Code', UI.select('cnReason', CreditNotesPage.REASON_CODES, '01'), 'cnReason')}</div>
                    <div class="col-md-6">${UI.formGroup('Amount', UI.input('cnAmount', 'number', '0.00', '', 'min="0" step="0.01" required'), 'cnAmount')}</div>
                    <div class="col-12" id="cnLineItemsSection">
                        <h6>Line Items <small class="text-muted">(for partial credit)</small></h6>
                        <div id="cnLineItems"></div>
                        <button type="button" class="btn btn-sm btn-outline-secondary mt-2" onclick="CreditNotesPage.addLineItem()"><i class="bi bi-plus"></i> Add Line Item</button>
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary" id="cnSubmitBtn"><i class="bi bi-check-lg"></i><span class="btn-text"> Create Credit Note</span><span class="btn-loader d-none"><i class="bi bi-hourglass-split"></i> Processing...</span></button>
                    </div>
                </form>
            `)}
        `;

        // Toggle line items section based on type
        document.getElementById('cnType')?.addEventListener('change', (e) => {
            const section = document.getElementById('cnLineItemsSection');
            if (section) section.style.display = e.target.value === 'partial' ? 'block' : 'none';
        });

        document.getElementById('cnForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this._submitting) return; // Prevent concurrent submissions
            
            this._submitting = true;
            const submitBtn = document.getElementById('cnSubmitBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.classList.add('d-none');
            if (btnLoader) btnLoader.classList.remove('d-none');
            
            const lineItems = [];
            document.querySelectorAll('.cn-line-item').forEach(row => {
                lineItems.push({
                    item: row.querySelector('.cn-li-item')?.value || '',
                    quantity: parseInt(row.querySelector('.cn-li-qty')?.value) || 0,
                    amount: parseFloat(row.querySelector('.cn-li-amount')?.value) || 0,
                });
            });

            const payload = {
                invoice_number: document.getElementById('cnInvoice').value,
                type: document.getElementById('cnType').value,
                reason_code: document.getElementById('cnReason').value,
                amount: parseFloat(document.getElementById('cnAmount').value) || 0,
                line_items: lineItems.length ? lineItems : undefined,
            };

            try {
                const res = await HttpService.post(API.creditNotes.create, payload);
                if (res.ok) {
                    UI.toast('Credit note created!', 'success');
                    Router.navigate('#/credit-notes');
                } else {
                    UI.toast(res.data.message || 'Failed to create credit note', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            } finally {
                this._submitting = false;
                const submitBtn = document.getElementById('cnSubmitBtn');
                const btnText = submitBtn?.querySelector('.btn-text');
                const btnLoader = submitBtn?.querySelector('.btn-loader');
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.classList.remove('d-none');
                if (btnLoader) btnLoader.classList.add('d-none');
            }
        });
    },

    addLineItem() {
        const container = document.getElementById('cnLineItems');
        if (!container) return;
        const idx = container.children.length;
        const row = document.createElement('div');
        row.className = 'cn-line-item row g-2 mb-2 align-items-end';
        row.innerHTML = `
            <div class="col-md-5"><input type="text" class="form-control form-control-sm cn-li-item" placeholder="Item name"></div>
            <div class="col-md-2"><input type="number" class="form-control form-control-sm cn-li-qty" placeholder="Qty" min="1" value="1"></div>
            <div class="col-md-3"><input type="number" class="form-control form-control-sm cn-li-amount" placeholder="Amount" min="0" step="0.01"></div>
            <div class="col-md-2"><button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="this.closest('.cn-line-item').remove()"><i class="bi bi-x"></i></button></div>
        `;
        container.appendChild(row);
    },

    deleteCreditNote(id) {
        UI.confirm('Delete Credit Note', 'Are you sure?', async () => {
            try {
                const res = await HttpService.del(API.creditNotes.delete(id));
                if (res.ok) {
                    UI.toast('Credit note deleted', 'success');
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
