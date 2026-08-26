/**
 * Jihami - Invoices Page
 * CRUD for invoices with line items. Matches Flutter InvoiceListScreen & CreateInvoiceScreen.
 */

const InvoicesPage = {
    invoices: [],
    customers: [],
    items: [],
    currencies: [],
    lineItems: [],
    _submitting: false,  // Prevent double submission

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'create') return this.renderCreateForm(container);
        const viewId = params.get('id');
        if (viewId) return this.renderDetail(container, viewId);

        try {
            const res = await HttpService.get(API.invoices.list);
            this.invoices = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.invoices)) this.invoices = [];
            console.log('Invoices loaded:', this.invoices);
            console.log('First invoice structure:', this.invoices[0]);
            
            // If invoices don't have customer details, fetch customers and link them
            if (this.invoices.length > 0 && !this.invoices[0].customer?.name && !this.invoices[0].customerName) {
                console.log('Fetching customer details to link with invoices...');
                try {
                    const custRes = await HttpService.get(API.customers.list);
                    const customers = custRes.ok ? (custRes.data.data || custRes.data || []) : [];
                    const custMap = {};
                    customers.forEach(c => { custMap[c.id] = c.name; });
                    
                    // Link customer names to invoices
                    this.invoices = this.invoices.map(inv => ({
                        ...inv,
                        customerName: inv.customerName || inv.customer_name || custMap[inv.customer_id] || custMap[inv.customerId] || '--'
                    }));
                    console.log('Invoices with customer names:', this.invoices);
                } catch (custErr) {
                    console.warn('Could not fetch customer details:', custErr);
                }
            }
            
            this.renderList(container);
        } catch (err) {
            console.error('Invoices fetch error:', err);
            container.innerHTML = '<div class="alert alert-danger">Failed to load invoices.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'receipt-cutoff', color: '#f59e0b',
            title: 'Invoices', subtitle: 'Issued invoices and billing',
            count: this.invoices.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="invSearch" class="form-control form-control-sm" placeholder="Search invoices..."></div>
                         <select id="invStatusFilter" class="form-select form-select-sm"><option value="">All Status</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="partial">Partial</option></select>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/invoices?action=create')"><i class="bi bi-plus-lg"></i> New Invoice</button>`,
        }, this._buildTable(this.invoices));

        document.getElementById('invSearch')?.addEventListener('input', () => this._filter(container));
        document.getElementById('invStatusFilter')?.addEventListener('change', () => this._filter(container));
    },

    _filter(container) {
        const q = (document.getElementById('invSearch')?.value || '').toLowerCase();
        const status = document.getElementById('invStatusFilter')?.value || '';
        const filtered = this.invoices.filter(inv => {
            const matchQ = !q || (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.customer?.name || inv.customerName || '').toLowerCase().includes(q);
            const matchS = !status || (inv.status || '').toLowerCase() === status;
            return matchQ && matchS;
        });
        const body = container.querySelector('.card-body-custom');
        if (body) body.innerHTML = this._buildTable(filtered);
    },

    _buildTable(data) {
        return UI.table([
            { key: 'invoiceNumber', label: 'Invoice #', render: r => `<a href="#/invoices?id=${r.id}" class="fw-bold text-decoration-none">${UI.escapeHtml(r.invoiceNumber || r.invoice_number || '--')}</a>` },
            { key: 'customer', label: 'Customer', render: r => {
                const customerName = r.customer?.name || r.customerName || r.customer_name || r.customerDetails?.name || (typeof r.customer === 'string' ? r.customer : '--');
                return UI.escapeHtml(customerName);
            }},
            { key: 'date', label: 'Date', render: r => {
                const dateStr = r.createdAt || r.created_at || r.date || r.invoiceDate || r.invoice_date || '--';
                return dateStr === '--' ? '--' : UI.formatDateTime(dateStr);
            }},
            { key: 'currency', label: 'Currency', render: r => {
                const currencyCode = r.currency?.code || r.currency_code || r.currency?.symbol || r.currency_symbol || 'KES';
                return UI.escapeHtml(currencyCode);
            }},

            { key: 'totalAmount', label: 'Amount', class: 'text-end', render: r => `<strong>${UI.money(r.totalAmount || r.total_amount || r.total || 0)}</strong>` },
        ], data, {
            emptyMessage: 'No invoices found',
            actions: row => `
                <button class="btn btn-sm btn-outline-info me-1" onclick="Router.navigate('#/invoices?id=${row.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="InvoicesPage.deleteInvoice(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderDetail(container, id) {
        container.innerHTML = UI.loader();
        try {
            console.log('Fetching invoice detail for ID:', id);
            const res = await HttpService.get(API.invoices.get(id));
            console.log('Invoice detail response:', res);
            if (!res.ok) { 
                console.error('Invoice not found - response not ok');
                UI.toast('Invoice not found', 'danger'); 
                return Router.navigate('#/invoices'); 
            }
            // Extract invoice from nested structure: res.data.invoice or res.data.data.invoice or res.data
            const inv = res.data.invoice || res.data.data?.invoice || res.data.data || res.data;
            console.log('Invoice data:', inv);
            const items = inv.items || inv.lineItems || [];
            console.log('Line items:', items);
            if (items.length > 0) console.log('First item structure:', items[0]);

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/invoices')"><i class="bi bi-arrow-left"></i> Back</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary no-print" onclick="InvoicesPage.printInvoice('A4')"><i class="bi bi-printer"></i> Print A4</button>
                        <button class="btn btn-sm btn-outline-secondary no-print" onclick="InvoicesPage.printInvoice('receipt')"><i class="bi bi-receipt"></i> Print Receipt</button>
                        ${UI.statusBadge(inv.status || 'unpaid')}
                    </div>
                </div>
                <div class="invoice-print-wrapper">
                    <div class="invoice-screen-layout">
                        <div class="row g-3">
                            <div class="col-md-4">
                                ${UI.card('Invoice Details', `
                                    <div class="mb-2"><strong>Invoice #:</strong> ${UI.escapeHtml(inv.invoiceNumber || inv.invoice_number || '')}</div>
                                    <div class="mb-2"><strong>Date:</strong> ${UI.formatDateTime(inv.createdAt || inv.created_at || inv.date)}</div>
                                    <div class="mb-2"><strong>Customer:</strong> ${UI.escapeHtml(inv.customer?.name || inv.customerName || inv.customer_name || '--')}</div>
                                    <div class="mb-2"><strong>Status:</strong> ${UI.statusBadge(inv.status || 'unpaid')}</div>
                                    <div class="mb-2"><strong>Notes:</strong> ${UI.escapeHtml(inv.notes || '--')}</div>
                                    <hr>
                                    <div class="mb-2"><strong>Subtotal:</strong> ${UI.money(inv.subtotal || inv.subTotal || inv.sub_total || 0)}</div>
                                    <div class="mb-2"><strong>Tax:</strong> ${UI.money(inv.totalTax || inv.total_tax || 0)}</div>
                                    <div class="mb-2 fs-5"><strong>Total: ${UI.money(inv.totalAmount || inv.total_amount || inv.total || 0)}</strong></div>
                                `)}
                            </div>
                            <div class="col-md-8">
                                ${UI.card('Line Items', UI.table([
                                    { key: 'item', label: 'Item', render: r => {
                                        let itemName = '--';
                                        if (typeof r.item === 'string') itemName = r.item;
                                        else if (r.item?.name) itemName = r.item.name;
                                        else if (r.itemName) itemName = r.itemName;
                                        else if (r.name) itemName = r.name;
                                        return UI.escapeHtml(itemName);
                                    }},
                                    { key: 'quantity', label: 'Qty', class: 'text-center', render: r => r.quantity || 0 },
                                    { key: 'unitPrice', label: 'Unit Price', class: 'text-end', render: r => UI.money(r.unitPrice || r.unit_price || 0) },
                                    { key: 'taxRate', label: 'Tax %', class: 'text-center', render: r => `${r.taxRate || r.tax_rate || 0}%` },
                                    { key: 'total', label: 'Total', class: 'text-end', render: r => `<strong>${UI.money(r.totalPrice || r.total_price || r.totalWithTax || 0)}</strong>` },
                                ], items, { emptyMessage: 'No line items' }))}
                            </div>
                        </div>
                    </div>
                    <div class="invoice-receipt-layout d-none">
                        ${this._buildReceiptLayout(inv, items)}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load invoice detail:', err);
            container.innerHTML = '<div class="alert alert-danger">Failed to load invoice: ' + (err.message || 'Unknown error') + '</div>';
        }
    },

    _buildReceiptLayout(inv, items) {
        // Extract business details from token
        const token = TokenManager.getToken();
        const tokenPayload = token ? TokenManager.decodeToken(token) : {};
        const businessName = UI.escapeHtml(tokenPayload.business_name || tokenPayload.businessName || 'Jihami Records');
        const businessEmail = UI.escapeHtml(tokenPayload.email || tokenPayload.business_email || '');
        const businessPhone = UI.escapeHtml(tokenPayload.phone || tokenPayload.business_phone || '');
        const servedBy = UI.escapeHtml(tokenPayload.name || 'N/A');

        const invoiceNumber = UI.escapeHtml(inv.invoiceNumber || inv.invoice_number || '--');
        const date = UI.formatDateTime(inv.createdAt || inv.created_at || inv.date || '');
        const customerName = UI.escapeHtml(inv.customer?.name || inv.customerName || inv.customer_name || '--');
        const subtotal = inv.subtotal || inv.subTotal || inv.sub_total || 0;
        const totalTax = inv.totalTax || inv.total_tax || 0;
        const total = inv.totalAmount || inv.total_amount || inv.total || 0;

        const itemRows = (items || []).map(item => {
            let name = '--';
            if (typeof item.item === 'string') name = item.item;
            else if (item.item?.name) name = item.item.name;
            else if (item.itemName) name = item.itemName;
            else if (item.name) name = item.name;
            const quantity = item.quantity || item.qty || 0;
            const unitPrice = item.unitPrice || item.unit_price || item.price || item.rate || 0;
            const lineTotal = UI.money(item.totalWithTax || item.total || item.total_price || item.totalPrice || (quantity * unitPrice), '');
            return `
                <tr class="receipt-item-row">
                    <td class="receipt-item-name">${UI.escapeHtml(name)}</td>
                    <td class="receipt-item-qty text-end">${quantity}</td>
                    <td class="receipt-item-price text-end">${UI.money(unitPrice, '')}</td>
                    <td class="receipt-item-total text-end">${lineTotal}</td>
                </tr>`;
        });

        return `
            <div class="receipt-business-header">
                <div class="receipt-business-name">${businessName.toUpperCase()}</div>
                ${businessEmail ? `<div class="receipt-business-contact">${businessEmail}</div>` : ''}
                ${businessPhone ? `<div class="receipt-business-contact">${businessPhone}</div>` : ''}
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-title">Sales Receipt</div>
            <div class="receipt-meta">
                <div>INV: ${invoiceNumber}</div>
                <div>${date}</div>
            </div>
            <div class="receipt-customer">
                <div>Customer: ${customerName}</div>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-items">
                <table class="receipt-table">
                    <thead>
                        <tr class="receipt-items-header">
                            <th class="text-start">Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows.join('')}
                    </tbody>
                </table>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-summary">
                <div class="receipt-line"><span>Subtotal</span><span>${UI.money(subtotal)}</span></div>
                <div class="receipt-line"><span>Tax</span><span>${UI.money(totalTax)}</span></div>
                <div class="receipt-line total"><span>Total</span><span>${UI.money(total)}</span></div>
            </div>
            <div class="receipt-divider">--------------------------------</div>
            <div class="receipt-footer">
                <div>Thank you for your business</div>
                <div class="receipt-footer-note">......end of fiscal receipt......</div>
                <div class="receipt-served-by">Served by: ${servedBy}</div>
            </div>`;
    },

    printInvoice(format) {
        const existing = document.getElementById('invoice-print-mode-style');
        if (existing) existing.remove();

        const wrapper = document.querySelector('.invoice-print-wrapper');
        if (format === 'receipt' && wrapper) wrapper.classList.add('receipt-print-mode');

        const pageSize = format === 'receipt' ? '58mm auto' : 'A4 portrait';
        const margin = format === 'receipt' ? '4mm' : '12mm';
        const receiptStyle = format === 'receipt' ? `
                font-family: 'Courier New', Courier, monospace !important;
                font-size: 11pt !important;
                letter-spacing: 0.05em !important;
                line-height: 1.4 !important;
                .invoice-print-wrapper .row { display: block !important; }
                .invoice-print-wrapper .col-md-4,
                .invoice-print-wrapper .col-md-8 { width: 100% !important; margin: 0 !important; }
                .invoice-print-wrapper .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin-bottom: 0.5rem !important; }
                .invoice-print-wrapper .card-body { padding: 0 !important; }
                .invoice-print-wrapper .card-title { display: none !important; }
                .invoice-print-wrapper .g-3 { gap: 0 !important; }
                .invoice-print-wrapper table { font-size: 10pt !important; }
                .invoice-print-wrapper table th,
                .invoice-print-wrapper table td { padding: 2pt 4pt !important; }
                .invoice-print-wrapper.receipt-print-mode .invoice-receipt-layout { display: block !important; }
                .invoice-print-wrapper.receipt-print-mode .invoice-screen-layout { display: none !important; }
            ` : '';
        const style = document.createElement('style');
        style.id = 'invoice-print-mode-style';
        style.textContent = `
            @media print {
                @page { size: ${pageSize}; margin: ${margin}; }
                body { margin: 0 !important; padding: 0 !important; }
                body * { visibility: hidden !important; }
                .invoice-print-wrapper, .invoice-print-wrapper * { visibility: visible !important; }
                .invoice-print-wrapper { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    background: #fff; 
                    padding: ${format === 'receipt' ? '2mm' : '1rem'}; 
                    color: #000; 
                    text-align: left !important;
                    margin: 0 !important;
                }
                .invoice-print-wrapper .no-print { display: none !important; }
                .invoice-print-wrapper a, .invoice-print-wrapper button { text-decoration: none; }
                ${receiptStyle}
            }
        `;
        document.head.appendChild(style);

        const cleanup = () => {
            style.remove();
            if (wrapper) wrapper.classList.remove('receipt-print-mode');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
    },

    async renderCreateForm(container) {
        container.innerHTML = UI.loader();
        this.lineItems = [];

        try {
            const [custRes, itemRes, curRes] = await Promise.allSettled([
                HttpService.get(API.customers.list),
                HttpService.get(API.items.list),
                HttpService.get(API.currencies.list),
            ]);
            this.customers = custRes.status === 'fulfilled' && custRes.value.ok ? (custRes.value.data.data || custRes.value.data || []) : [];
            this.items = itemRes.status === 'fulfilled' && itemRes.value.ok ? (itemRes.value.data.data || itemRes.value.data || []) : [];
            this.currencies = curRes.status === 'fulfilled' && curRes.value.ok ? (curRes.value.data.data || curRes.value.data || []) : [];
        } catch (_) {}

        const custOpts = (Array.isArray(this.customers) ? this.customers : []).map(c => ({ value: c.id, label: c.name }));
        const curOpts = (Array.isArray(this.currencies) ? this.currencies : []).map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }));
        const itemOpts = (Array.isArray(this.items) ? this.items : []).map(i => ({ value: i.id, label: `${i.name} (${UI.money(i.unit_price || i.unitPrice)})` }));

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/invoices')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">Create Invoice</h6>
            </div>
            ${UI.card('Invoice Details', `
                <form id="invForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Customer', UI.select('invCustomer', [{value:'', label:'Select customer'}, ...custOpts], ''), 'invCustomer')}</div>
                    <div class="col-md-3">${UI.formGroup('Currency', UI.select('invCurrency', [{value:'', label:'Default (KES)'}, ...curOpts], ''), 'invCurrency')}</div>
                    <div class="col-md-3">${UI.formGroup('Category', UI.input('invCategory', 'text', 'Category', ''), 'invCategory')}</div>
                    <div class="col-12">${UI.formGroup('Notes', UI.textarea('invNotes', 'Invoice notes...', '', 2), 'invNotes')}</div>
                </form>
            `)}
            ${UI.card('Line Items', `
                <div class="row g-2 mb-3 align-items-end">
                    <div class="col-md-4">${UI.formGroup('Item', UI.select('lineItem', [{value:'', label:'Select item'}, ...itemOpts], ''), 'lineItem')}</div>
                    <div class="col-md-2">${UI.formGroup('Qty', UI.input('lineQty', 'number', '1', '1', 'min="1"'), 'lineQty')}</div>
                    <div class="col-md-2">${UI.formGroup('Price', UI.input('linePrice', 'number', '0', '', 'min="0" step="0.01"'), 'linePrice')}</div>
                    <div class="col-md-2">${UI.formGroup('Tax %', UI.input('lineTax', 'number', '16', '16', 'min="0" max="100"'), 'lineTax')}</div>
                    <div class="col-md-2"><button type="button" class="btn btn-success w-100" onclick="InvoicesPage.addLineItem()"><i class="bi bi-plus"></i> Add</button></div>
                </div>
                <div id="lineItemsTable"></div>
                <div class="mt-3 p-3 bg-light rounded">
                    <div class="row">
                        <div class="col text-end"><strong>Subtotal: <span id="invSubtotal">0.00</span></strong></div>
                        <div class="col text-end"><strong>Tax: <span id="invTax">0.00</span></strong></div>
                        <div class="col text-end fs-5"><strong>Total: <span id="invTotal">0.00</span></strong></div>
                    </div>
                </div>
            `)}
            ${UI.card('Payment Methods', `
                <div class="row g-2">
                    <div class="col-6"><strong>Method</strong></div>
                    <div class="col-6"><strong>Amount</strong></div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">1. Mpesa</div>
                    <div class="col-6">${UI.input('paymentMpesa', 'number', '0.00', '0.00', 'min="0" step="0.01"')}</div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">2. Cash</div>
                    <div class="col-6">${UI.input('paymentCash', 'number', '0.00', '0.00', 'min="0" step="0.01"')}</div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">3. PDQ/Card</div>
                    <div class="col-6">${UI.input('paymentPdq', 'number', '0.00', '0.00', 'min="0" step="0.01"')}</div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">4. Complimentary</div>
                    <div class="col-6">${UI.input('paymentComplimentary', 'number', '0.00', '0.00', 'min="0" step="0.01"')}</div>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-6">5. On Account</div>
                    <div class="col-6">${UI.input('paymentOnAccount', 'number', '0.00', '0.00', 'min="0" step="0.01"')}</div>
                </div>
                <div class="row g-2 mt-3">
                    <div class="col-6"><strong>Total Paid:</strong></div>
                    <div class="col-6"><strong><span id="paymentTotal">0.00</span></strong></div>
                </div>
                <div class="mt-3">
                    <button id="submitBtn" class="btn btn-primary" onclick="InvoicesPage.submitInvoice()" disabled><i class="bi bi-check-lg"></i><span class="btn-text"> Create Invoice</span><span class="btn-loader d-none"><i class="bi bi-hourglass-split"></i> Processing...</span></button>
                </div>
            `)}
        `;

        // Auto-fill price on item select
        document.getElementById('lineItem')?.addEventListener('change', (e) => {
            const item = this.items.find(i => String(i.id) === e.target.value);
            if (item) {
                document.getElementById('linePrice').value = item.unit_price || item.unitPrice || 0;
                document.getElementById('lineTax').value = item.tax_rate || item.taxRate || 16;
            }
        });

        // Payment validation listeners
        ['paymentMpesa', 'paymentCash', 'paymentPdq', 'paymentComplimentary', 'paymentOnAccount'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this._validatePayments());
        });
    },

    _validatePayments() {
        const mpesa = parseFloat(document.getElementById('paymentMpesa').value) || 0;
        const cash = parseFloat(document.getElementById('paymentCash').value) || 0;
        const pdq = parseFloat(document.getElementById('paymentPdq').value) || 0;
        const complimentary = parseFloat(document.getElementById('paymentComplimentary').value) || 0;
        const onAccount = parseFloat(document.getElementById('paymentOnAccount').value) || 0;

        const totalPaid = mpesa + cash + pdq + complimentary + onAccount;
        const invoiceTotal = parseFloat(document.getElementById('invTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0;

        document.getElementById('paymentTotal').textContent = UI.money(totalPaid);
        document.getElementById('submitBtn').disabled = Math.abs(totalPaid - invoiceTotal) > 0.01;
    },

    addLineItem() {
        const itemId = document.getElementById('lineItem').value;
        const item = this.items.find(i => String(i.id) === itemId);
        const qty = parseInt(document.getElementById('lineQty').value) || 1;
        const price = parseFloat(document.getElementById('linePrice').value) || 0;
        const taxRate = parseFloat(document.getElementById('lineTax').value) || 0;

        if (!item) return UI.toast('Select an item first', 'warning');

        const totalPrice = qty * price;
        const taxAmount = totalPrice * (taxRate / 100);
        const totalWithTax = totalPrice + taxAmount;

        this.lineItems.push({
            item: item.name,
            itemId: item.id,
            quantity: qty,
            unitPrice: price,
            taxRate: taxRate,
            totalPrice: totalPrice,
            taxAmount: taxAmount,
            totalWithTax: totalWithTax,
        });

        this._refreshLineItems();
        // Reset inputs
        document.getElementById('lineItem').value = '';
        document.getElementById('lineQty').value = '1';
        document.getElementById('linePrice').value = '';
        document.getElementById('lineTax').value = '16';
    },

    removeLineItem(index) {
        this.lineItems.splice(index, 1);
        this._refreshLineItems();
    },

    _refreshLineItems() {
        const tbody = document.getElementById('lineItemsTable');
        if (!tbody) return;

        tbody.innerHTML = UI.table([
            { key: 'item', label: 'Item', render: r => UI.escapeHtml(r.item) },
            { key: 'quantity', label: 'Qty', class: 'text-center' },
            { key: 'unitPrice', label: 'Unit Price', class: 'text-end', render: r => UI.money(r.unitPrice) },
            { key: 'taxRate', label: 'Tax %', class: 'text-center', render: r => `${r.taxRate}%` },
            { key: 'totalWithTax', label: 'Total', class: 'text-end', render: r => `<strong>${UI.money(r.totalWithTax)}</strong>` },
        ], this.lineItems, {
            emptyMessage: 'Add line items above',
            actions: (row, i) => `<button class="btn btn-sm btn-outline-danger" onclick="InvoicesPage.removeLineItem(${i})"><i class="bi bi-x"></i></button>`
        });

        const subtotal = this.lineItems.reduce((s, li) => s + li.totalPrice, 0);
        const tax = this.lineItems.reduce((s, li) => s + li.taxAmount, 0);
        const total = subtotal + tax;

        document.getElementById('invSubtotal').textContent = UI.money(subtotal);
        document.getElementById('invTax').textContent = UI.money(tax);
        document.getElementById('invTotal').textContent = UI.money(total);

        this._validatePayments();
    },

    async submitInvoice() {
        if (this._submitting) return; // Prevent concurrent submissions
        if (!this.lineItems.length) return UI.toast('Add at least one line item', 'warning');

        const customerId = document.getElementById('invCustomer').value;
        const customer = this.customers.find(c => String(c.id) === customerId);
        const subtotal = this.lineItems.reduce((s, li) => s + li.totalPrice, 0);
        const totalTax = this.lineItems.reduce((s, li) => s + li.taxAmount, 0);
        const totalAmount = subtotal + totalTax;

        if (!customer) return UI.toast('Select a customer before creating the invoice', 'warning');

        this._submitting = true; // Set flag to prevent double submission
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn?.querySelector('.btn-text');
        const btnLoader = submitBtn?.querySelector('.btn-loader');
        if (submitBtn) submitBtn.disabled = true;
        if (btnText) btnText.classList.add('d-none');
        if (btnLoader) btnLoader.classList.remove('d-none');

        // Get today's local date in YYYY-MM-DD format
        const today = new Date();
        const invoiceDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        
        const invoicePayload = {
            customer_id: customer.id,
            items: this.lineItems.map(li => ({
                item_id: li.itemId,
                quantity: li.quantity,
                unit_price: li.unitPrice,
                tax_rate: li.taxRate,
                total_price: li.totalPrice,
                tax_amount: li.taxAmount,
                total_with_tax: li.totalWithTax,
            })),
            subtotal: subtotal,
            total_tax: totalTax,
            total_amount: totalAmount,
            notes: document.getElementById('invNotes').value,
            currency_id: document.getElementById('invCurrency').value || null,
            type: 0, // 0 = invoice, 1 = quotation
            etr: document.getElementById('invEtr')?.value || '',
            invoice_date: invoiceDate, // Today's local date
            payments: {
                mpesa: parseFloat(document.getElementById('paymentMpesa').value) || 0,
                cash: parseFloat(document.getElementById('paymentCash').value) || 0,
                pdq: parseFloat(document.getElementById('paymentPdq').value) || 0,
                complimentary: parseFloat(document.getElementById('paymentComplimentary').value) || 0,
                on_account: parseFloat(document.getElementById('paymentOnAccount').value) || 0,
            },
        };

        console.log('Invoice payload:', invoicePayload);

        try {
            const res = await HttpService.post(API.invoices.create, invoicePayload);
            if (res.ok) {
                // Create a corresponding income transaction for the invoice
                const mpesaAmount = invoicePayload.payments.mpesa || 0;
                const cashAmount = invoicePayload.payments.cash || 0;
                const pdqAmount = invoicePayload.payments.pdq || 0;
                const complimentaryAmount = invoicePayload.payments.complimentary || 0;
                const onAccountAmount = invoicePayload.payments.on_account || 0;
                const totalPaid = mpesaAmount + cashAmount + pdqAmount + complimentaryAmount + onAccountAmount;

                // Create transaction entry for income from the invoice
                const transactionPayload = {
                    business_id: TokenManager.getUser()?.businessId || '',
                    amount: totalAmount,
                    type: 'income',
                    category: 'Sales',
                    description: `Invoice from ${customer.name}`,
                    transaction_date: new Date().toISOString().split('T')[0],
                    employee_name: TokenManager.getUser()?.name || '',
                    payment_method: totalPaid > 0 ? (
                        mpesaAmount > 0 ? 'mpesa' :
                        cashAmount > 0 ? 'cash' :
                        pdqAmount > 0 ? 'card' :
                        complimentaryAmount > 0 ? 'complimentary' : 'on_account'
                    ) : 'on_account',
                    reference_number: res.data?.data?.invoice_number || res.data?.invoice_number || '',
                    isIncome: true,
                };

                console.log('Creating transaction:', transactionPayload);

                try {
                    await HttpService.post(API.transactions.create, transactionPayload);
                    console.log('Transaction created for invoice');
                } catch (txErr) {
                    console.warn('Could not create transaction for invoice:', txErr);
                    // Don't fail the whole operation if transaction creation fails
                }

                UI.toast('Invoice created!', 'success');
                Router.navigate('#/invoices');
            } else {
                UI.toast(res.data.message || 'Failed to create invoice', 'danger');
            }
        } catch (err) {
            UI.toast('Network error', 'danger');
        } finally {
            this._submitting = false; // Reset flag
            const submitBtn = document.getElementById('submitBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');
            if (submitBtn) submitBtn.disabled = this.lineItems.length === 0;
            if (btnText) btnText.classList.remove('d-none');
            if (btnLoader) btnLoader.classList.add('d-none');
        }
    },

    deleteInvoice(id) {
        UI.confirm('Delete Invoice', 'Are you sure? This cannot be undone.', async () => {
            try {
                const res = await HttpService.del(API.invoices.delete(id));
                if (res.ok) {
                    UI.toast('Invoice deleted', 'success');
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
