/**
 * Jihami - Payments Page
 * CRUD, search by ref. Matches Flutter PaymentListScreen & AddPaymentScreen.
 */

const PaymentsPage = {
    payments: [],
    customers: [],
    currencies: [],
    _submitting: false,

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('action') === 'add') return this.renderForm(container);

        try {
            const res = await HttpService.get(API.payments.list);
            this.payments = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.payments)) this.payments = [];
            console.log('Payments loaded:', this.payments);
            if (this.payments.length > 0) console.log('First payment structure:', this.payments[0]);
            
            // If payments don't have customer details, fetch customers and link them
            if (this.payments.length > 0 && !this.payments[0].customer?.name && !this.payments[0].customerName) {
                console.log('Fetching customer details to link with payments...');
                try {
                    const custRes = await HttpService.get(API.customers.list);
                    const customers = custRes.ok ? (custRes.data.data || custRes.data || []) : [];
                    const custMap = {};
                    customers.forEach(c => { custMap[c.id] = c.name; });
                    
                    // Link customer names to payments
                    this.payments = this.payments.map(pay => ({
                        ...pay,
                        customerName: pay.customerName || pay.customer_name || custMap[pay.customer_id] || custMap[pay.customerId] || '--'
                    }));
                    console.log('Payments with customer names:', this.payments);
                } catch (custErr) {
                    console.warn('Could not fetch customer details:', custErr);
                }
            }
            
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load payments.</div>';
        }
    },

    renderList(container) {
        container.innerHTML = UI.pageCard({
            icon: 'cash-coin', color: '#14b8a6',
            title: 'Payments', subtitle: 'Recorded payment receipts',
            count: this.payments.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="paySearch" class="form-control form-control-sm" placeholder="Search ref or customer..."></div>
                         <select id="payMethodFilter" class="form-select form-select-sm"><option value="">All Methods</option><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option><option value="card">Card</option></select>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/payments?action=add')"><i class="bi bi-plus-lg"></i> Record Payment</button>`,
        }, this._buildTable(this.payments));

        document.getElementById('paySearch')?.addEventListener('input', () => this._filter(container));
        document.getElementById('payMethodFilter')?.addEventListener('change', () => this._filter(container));
    },

    _filter(container) {
        const q = (document.getElementById('paySearch')?.value || '').toLowerCase();
        const method = document.getElementById('payMethodFilter')?.value || '';
        const filtered = this.payments.filter(p => {
            const matchQ = !q || (p.ref_code || p.refCode || '').toLowerCase().includes(q) || (p.customer?.name || p.customerName || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
            const matchM = !method || (p.payment_method || p.paymentMethod || '').toLowerCase() === method;
            return matchQ && matchM;
        });
        const body = container.querySelector('.card-body-custom');
        if (body) body.innerHTML = this._buildTable(filtered);
    },

    _buildTable(data) {
        return UI.table([
            { key: 'date', label: 'Date', render: r => {
                const dateStr = r.payment_date || r.paymentDate || r.createdAt || r.created_at || '--';
                return dateStr === '--' ? '--' : UI.formatDateTime(dateStr);
            }},
            { key: 'customer', label: 'Customer', render: r => {
                const customerName = r.customer?.name || r.customerName || r.customer_name || r.customerDetails?.name || (typeof r.customer === 'string' ? r.customer : '--');
                return UI.escapeHtml(customerName);
            }},
            { key: 'method', label: 'Method', render: r => UI.badge(r.payment_method || r.paymentMethod || 'cash', 'secondary') },
            { key: 'ref_code', label: 'Reference', render: r => UI.escapeHtml(r.ref_code || r.refCode || '--') },
            { key: 'description', label: 'Description', render: r => UI.escapeHtml((r.description || '').substring(0, 40)) },
            { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong class="text-success">${UI.money(r.amount || 0)}</strong>` },
        ], data, {
            emptyMessage: 'No payments found',
            actions: row => `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="PaymentsPage.editPayment(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="PaymentsPage.deletePayment(${row.id})"><i class="bi bi-trash"></i></button>`
        });
    },

    async renderForm(container, editData = null) {
        const isEdit = !!editData;
        const title = isEdit ? 'Edit Payment' : 'Record Payment';

        // Load customers & currencies once
        if (!this.customers.length || !this.currencies.length) {
            container.innerHTML = UI.loader();
            const [custRes, curRes] = await Promise.allSettled([
                HttpService.get(API.customers.list),
                HttpService.get(API.currencies.list),
            ]);
            this.customers = custRes.status === 'fulfilled' && custRes.value.ok ? (custRes.value.data.data || custRes.value.data || []) : [];
            this.currencies = curRes.status === 'fulfilled' && curRes.value.ok ? (curRes.value.data.data || curRes.value.data || []) : [];
        }

        const custOpts = (Array.isArray(this.customers) ? this.customers : []).map(c => ({ value: c.id, label: c.name }));
        const curOpts = (Array.isArray(this.currencies) ? this.currencies : []).map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }));

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/payments')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">${title}</h6>
            </div>
            ${UI.card(title, `
                <form id="payForm" class="row g-3">
                    <div class="col-md-6">${UI.formGroup('Customer', UI.select('payCustomer', [{value:'', label:'Select customer'}, ...custOpts], editData?.customer_id || editData?.customerId || ''), 'payCustomer')}</div>
                    <div class="col-md-6">${UI.formGroup('Amount', UI.input('payAmount', 'number', '0.00', editData?.amount || '', 'min="0" step="0.01" required disabled'), 'payAmount')}</div>

                    <!-- Credit Information Display -->
                    <div class="col-12" id="creditInfo" style="display: none;">
                        <div class="credit-info-display">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Current Credit:</strong> <span id="currentCredit">--</span>
                                </div>
                                <div class="col-md-6">
                                    <strong>New Balance:</strong> <span id="newBalance">--</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">${UI.formGroup('Payment Date', UI.input('payDate', 'date', '', editData?.payment_date || new Date().toISOString().split('T')[0], 'required disabled'), 'payDate')}</div>
                    <div class="col-md-4">${UI.formGroup('Payment Method', UI.select('payMethod', [
                        {value:'cash',label:'Cash'},{value:'mpesa',label:'M-Pesa'},{value:'bank',label:'Bank Transfer'},{value:'card',label:'Card'},{value:'cheque',label:'Cheque'}
                    ], editData?.payment_method || editData?.paymentMethod || 'cash', 'disabled'), 'payMethod')}</div>
                    <div class="col-md-4">${UI.formGroup('Currency', UI.select('payCurrency', [{value:'', label:'Default (KES)'}, ...curOpts], editData?.currency_id || editData?.currencyId || '', 'disabled'), 'payCurrency')}</div>
                    <div class="col-md-6">${UI.formGroup('Reference Code', UI.input('payRef', 'text', 'e.g. MPESA ref', editData?.ref_code || editData?.refCode || '', 'disabled'), 'payRef')}</div>
                    <div class="col-md-6">${UI.formGroup('Invoice ID (optional)', UI.input('payInvoice', 'text', 'Invoice ID', editData?.invoice_id || editData?.invoiceId || '', 'disabled'), 'payInvoice')}</div>
                    <div class="col-12">${UI.formGroup('Description', UI.textarea('payDesc', 'Payment description...', editData?.description || '', 2, 'disabled'), 'payDesc')}</div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary" disabled id="paySubmitBtn"><i class="bi bi-check-lg"></i><span class="btn-text"> ${isEdit ? 'Update' : 'Save'} Payment</span><span class="btn-loader d-none"><i class="bi bi-hourglass-split"></i> Processing...</span></button>
                    </div>
                </form>
            `)}
        `;

        // Store current credit for calculations
        let currentCredit = 0;

        // Customer selection handler
        document.getElementById('payCustomer').addEventListener('change', async (e) => {
            const customerId = e.target.value;
            if (!customerId) {
                // Reset form when no customer selected
                this._toggleFormInputs(false);
                document.getElementById('creditInfo').style.display = 'none';
                currentCredit = 0;
                return;
            }

            try {
                const res = await HttpService.get(API.customers.credit(customerId));
                if (res.ok && res.data.data) {
                    const creditData = res.data.data;
                    currentCredit = parseFloat(creditData.total_credit) || 0;

                    // Display credit info
                    document.getElementById('currentCredit').textContent = UI.money(currentCredit);
                    document.getElementById('creditInfo').style.display = 'block';

                    // Enable form inputs
                    this._toggleFormInputs(true);

                    // Calculate initial balance
                    this._calculateNewBalance(currentCredit);
                } else {
                    UI.toast('Failed to load customer credit information', 'danger');
                }
            } catch (err) {
                console.error('Error fetching credit:', err);
                UI.toast('Network error loading credit information', 'danger');
            }
        });

        // Amount input handler for balance calculation
        document.getElementById('payAmount').addEventListener('input', () => {
            this._calculateNewBalance(currentCredit);
        });

        document.getElementById('payForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this._submitting) return; // Prevent concurrent submissions
            
            this._submitting = true;
            const submitBtn = document.getElementById('paySubmitBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.classList.add('d-none');
            if (btnLoader) btnLoader.classList.remove('d-none');
            
            const payload = {
                customer_id: document.getElementById('payCustomer').value || null,
                amount: parseFloat(document.getElementById('payAmount').value) || 0,
                payment_date: document.getElementById('payDate').value,
                payment_method: document.getElementById('payMethod').value,
                description: document.getElementById('payDesc').value,
                currency_id: document.getElementById('payCurrency').value || null,
                invoice_id: document.getElementById('payInvoice').value || null,
                ref_code: document.getElementById('payRef').value,
            };
            try {
                const res = isEdit
                    ? await HttpService.put(API.payments.update(editData.id), payload)
                    : await HttpService.post(API.payments.create, payload);
                if (res.ok) {
                    UI.toast(isEdit ? 'Payment updated!' : 'Payment recorded!', 'success');
                    Router.navigate('#/payments');
                } else {
                    UI.toast(res.data.message || 'Failed to save payment', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            } finally {
                this._submitting = false;
                const submitBtn = document.getElementById('paySubmitBtn');
                const btnText = submitBtn?.querySelector('.btn-text');
                const btnLoader = submitBtn?.querySelector('.btn-loader');
                if (submitBtn) submitBtn.disabled = !document.getElementById('payAmount')?.value;
                if (btnText) btnText.classList.remove('d-none');
                if (btnLoader) btnLoader.classList.add('d-none');
            }
        });
    },

    _toggleFormInputs(enabled) {
        const inputs = ['payAmount', 'payDate', 'payMethod', 'payCurrency', 'payRef', 'payInvoice', 'payDesc'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.disabled = !enabled;
            }
        });
        const submitBtn = document.querySelector('#payForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = !enabled;
        }
    },

    _calculateNewBalance(currentCredit) {
        const amountInput = document.getElementById('payAmount');
        const newBalanceElement = document.getElementById('newBalance');

        if (!amountInput || !newBalanceElement) return;

        const paymentAmount = parseFloat(amountInput.value) || 0;
        const newBalance = currentCredit - paymentAmount;

        newBalanceElement.textContent = UI.money(newBalance);

        // Color coding: green for positive (overpayment), red for negative (remaining credit)
        if (newBalance > 0) {
            newBalanceElement.style.color = '#10b981'; // green
        } else if (newBalance < 0) {
            newBalanceElement.style.color = '#ef4444'; // red
        } else {
            newBalanceElement.style.color = '#6b7280'; // gray for zero
        }
    },

    async editPayment(id) {
        const container = document.getElementById('pageContent');
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.payments.get(id));
            if (res.ok) {
                this.renderForm(container, res.data.data || res.data);
            } else {
                UI.toast('Payment not found', 'danger');
                Router.navigate('#/payments');
            }
        } catch (err) {
            UI.toast('Failed to load payment', 'danger');
        }
    },

    deletePayment(id) {
        UI.confirm('Delete Payment', 'Are you sure?', async () => {
            try {
                const res = await HttpService.del(API.payments.delete(id));
                if (res.ok) {
                    UI.toast('Payment deleted', 'success');
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
