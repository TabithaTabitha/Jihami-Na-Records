/**
 * Jihami - Transactions Page
 * List, Add, Edit, Delete transactions. Matches Flutter TransactionListScreen & AddTransactionScreen.
 */

const TransactionsPage = {
    transactions: [],
    categories: [],
    _submitting: false,

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');

        if (params.get('action') === 'add') return this.renderAddForm(container);

        try {
            const [txRes, catRes] = await Promise.allSettled([
                HttpService.get(API.transactions.list),
                HttpService.get(API.categories.list),
            ]);
            this.transactions = txRes.status === 'fulfilled' && txRes.value.ok ? (txRes.value.data.data || txRes.value.data || []) : [];
            this.categories = catRes.status === 'fulfilled' && catRes.value.ok ? (catRes.value.data.data || catRes.value.data || []) : [];
            if (!Array.isArray(this.transactions)) this.transactions = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load transactions.</div>';
        }
    },

    renderList(container) {
        const tableHtml = UI.table([
            { key: 'date', label: 'Date', render: r => UI.formatDate(r.transaction_date || r.date || r.createdAt) },
            { key: 'type', label: 'Type', render: r => (r.isIncome || r.type === 'income') ? UI.badge('Income', 'success') : UI.badge('Expense', 'danger') },
            { key: 'category', label: 'Category', render: r => UI.escapeHtml(r.category || '--') },
            { key: 'description', label: 'Description', render: r => UI.escapeHtml((r.description || '').substring(0, 50)) },
            { key: 'paymentMethod', label: 'Method', render: r => UI.escapeHtml(r.paymentMethod || r.payment_method || '--') },
            { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong class="${(r.isIncome || r.type === 'income') ? 'text-success' : 'text-danger'}">${UI.money(r.amount)}</strong>` },
        ], this.transactions, {
            emptyMessage: 'No transactions found',
            actions: row => `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="TransactionsPage.editTransaction(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="TransactionsPage.deleteTransaction(${row.id})"><i class="bi bi-trash"></i></button>`
        });

        container.innerHTML = UI.pageCard({
            icon: 'arrow-left-right', color: '#2563eb',
            title: 'Transactions', subtitle: 'All income and expense entries',
            count: this.transactions.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="txSearch" class="form-control form-control-sm" placeholder="Search..."></div>
                         <select id="txFilterType" class="form-select form-select-sm"><option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option></select>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="Router.navigate('#/transactions?action=add')"><i class="bi bi-plus-lg"></i> Add</button>`,
        }, tableHtml);

        document.getElementById('txSearch')?.addEventListener('input', () => this.filterList(container));
        document.getElementById('txFilterType')?.addEventListener('change', () => this.filterList(container));
    },

    filterList(container) {
        const query = (document.getElementById('txSearch')?.value || '').toLowerCase();
        const typeFilter = document.getElementById('txFilterType')?.value || '';
        const filtered = this.transactions.filter(t => {
            const matchesQuery = !query || (t.description || '').toLowerCase().includes(query) || (t.category || '').toLowerCase().includes(query);
            const isIncome = t.isIncome || t.type === 'income';
            const matchesType = !typeFilter || (typeFilter === 'income' ? isIncome : !isIncome);
            return matchesQuery && matchesType;
        });
        const tableContainer = container.querySelector('.card-body-custom');
        if (tableContainer) {
            tableContainer.innerHTML = UI.table([
                { key: 'date', label: 'Date', render: r => UI.formatDate(r.transaction_date || r.date || r.createdAt) },
                { key: 'type', label: 'Type', render: r => (r.isIncome || r.type === 'income') ? UI.badge('Income', 'success') : UI.badge('Expense', 'danger') },
                { key: 'category', label: 'Category', render: r => UI.escapeHtml(r.category || '--') },
                { key: 'description', label: 'Description', render: r => UI.escapeHtml((r.description || '').substring(0, 50)) },
                { key: 'paymentMethod', label: 'Method', render: r => UI.escapeHtml(r.paymentMethod || r.payment_method || '--') },
                { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong class="${(r.isIncome || r.type === 'income') ? 'text-success' : 'text-danger'}">${UI.money(r.amount)}</strong>` },
            ], filtered, {
                emptyMessage: 'No transactions match your search',
                actions: row => `
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="TransactionsPage.editTransaction(${row.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="TransactionsPage.deleteTransaction(${row.id})"><i class="bi bi-trash"></i></button>`
            });
        }
    },

    renderAddForm(container, editData = null) {
        const isEdit = !!editData;
        const title = isEdit ? 'Edit Transaction' : 'Add Transaction';
        const catOptions = this.categories.map(c => ({ value: c.name || c.id, label: c.name }));
        const user = TokenManager.getUser();

        container.innerHTML = `
            <div class="page-toolbar">
                <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/transactions')"><i class="bi bi-arrow-left"></i> Back</button>
                <h6 class="mb-0">${title}</h6>
            </div>
            ${UI.card(title, `
                <form id="txForm" class="row g-3">
                    <div class="col-md-6">
                        ${UI.formGroup('Type', `
                            <div class="btn-group w-100" role="group">
                                <input type="radio" class="btn-check" name="txType" id="txIncome" value="income" ${(!isEdit || editData?.type === 'income') ? 'checked' : ''}>
                                <label class="btn btn-outline-success" for="txIncome">Income</label>
                                <input type="radio" class="btn-check" name="txType" id="txExpense" value="expense" ${isEdit && editData?.type !== 'income' ? 'checked' : ''}>
                                <label class="btn btn-outline-danger" for="txExpense">Expense</label>
                            </div>
                        `, 'txType')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Amount (KES)', UI.input('txAmount', 'number', '0.00', editData?.amount || '', 'step="0.01" min="0" required'), 'txAmount')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Category', UI.select('txCategory', [{value:'', label:'Select category'}, ...catOptions], editData?.category || ''), 'txCategory')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Date', UI.input('txDate', 'date', '', editData?.transaction_date || new Date().toISOString().split('T')[0], 'required'), 'txDate')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Payment Method', UI.select('txMethod', [{value:'',label:'Select method'},{value:'cash',label:'Cash'},{value:'mpesa',label:'M-Pesa'},{value:'bank',label:'Bank Transfer'},{value:'card',label:'Card'},{value:'cheque',label:'Cheque'}], editData?.paymentMethod || ''), 'txMethod')}
                    </div>
                    <div class="col-md-6">
                        ${UI.formGroup('Reference Number', UI.input('txRef', 'text', 'Optional reference', editData?.referenceNumber || ''), 'txRef')}
                    </div>
                    <div class="col-12">
                        ${UI.formGroup('Description', UI.textarea('txDescription', 'Transaction description...', editData?.description || '', 3), 'txDescription')}
                    </div>
                    <div class="col-12">
                        ${UI.formGroup('Receipt Image', '<input type="file" class="form-control" id="txReceipt" accept="image/*" multiple>', 'txReceipt')}
                    </div>
                    <div class="col-12">
                        <button type="submit" class="btn btn-primary" id="txSubmitBtn"><i class="bi bi-check-lg"></i><span class="btn-text"> ${isEdit ? 'Update' : 'Save'} Transaction</span><span class="btn-loader d-none"><i class="bi bi-hourglass-split"></i> Processing...</span></button>
                    </div>
                </form>
            `)}
        `;

        document.getElementById('txForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this._submitting) return; // Prevent concurrent submissions
            
            this._submitting = true;
            const submitBtn = document.getElementById('txSubmitBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.classList.add('d-none');
            if (btnLoader) btnLoader.classList.remove('d-none');
            
            const formData = new FormData();
            formData.append('business_id', user?.businessId || '');
            formData.append('amount', document.getElementById('txAmount').value);
            formData.append('type', document.querySelector('input[name="txType"]:checked')?.value || 'income');
            formData.append('category', document.getElementById('txCategory').value);
            formData.append('description', document.getElementById('txDescription').value);
            formData.append('transaction_date', document.getElementById('txDate').value);
            formData.append('employee_name', user?.name || '');
            formData.append('payment_method', document.getElementById('txMethod').value);
            formData.append('reference_number', document.getElementById('txRef').value);

            const files = document.getElementById('txReceipt').files;
            for (let i = 0; i < files.length; i++) {
                formData.append('receipt_images', files[i]);
            }

            try {
                const result = isEdit
                    ? await HttpService.putMultipart(API.transactions.update(editData.id), formData)
                    : await HttpService.postMultipart(API.transactions.create, formData);
                if (result.ok) {
                    UI.toast(isEdit ? 'Transaction updated!' : 'Transaction added!', 'success');
                    Router.navigate('#/transactions');
                } else {
                    UI.toast(result.data.message || 'Failed to save transaction', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            } finally {
                this._submitting = false;
                const submitBtn = document.getElementById('txSubmitBtn');
                const btnText = submitBtn?.querySelector('.btn-text');
                const btnLoader = submitBtn?.querySelector('.btn-loader');
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.classList.remove('d-none');
                if (btnLoader) btnLoader.classList.add('d-none');
            }
        });
    },

    async editTransaction(id) {
        const container = document.getElementById('pageContent');
        container.innerHTML = UI.loader();
        try {
            // Load categories first if not already loaded
            if (!this.categories.length) {
                const catRes = await HttpService.get(API.categories.list);
                this.categories = catRes.ok ? (catRes.data.data || catRes.data || []) : [];
            }
            const res = await HttpService.get(API.transactions.get(id));
            if (res.ok) {
                this.renderAddForm(container, res.data.data || res.data);
            } else {
                UI.toast('Transaction not found', 'danger');
                Router.navigate('#/transactions');
            }
        } catch (err) {
            UI.toast('Failed to load transaction', 'danger');
        }
    },

    deleteTransaction(id) {
        UI.confirm('Delete Transaction', 'Are you sure you want to delete this transaction? This cannot be undone.', async () => {
            try {
                const res = await HttpService.del(API.transactions.delete(id));
                if (res.ok) {
                    UI.toast('Transaction deleted', 'success');
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
