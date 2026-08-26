/**
 * Jihami - Reports Page
 * Date-range filtered transaction reports. Matches Flutter ReportsScreen.
 */

const ReportsPage = {
    async render(container) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];

        container.innerHTML = `
            <div class="page-toolbar">
                <div style="display:flex;align-items:center;gap:0.6rem">
                    <div style="width:38px;height:38px;border-radius:10px;background:rgba(37,99,235,0.1);color:#2563eb;display:flex;align-items:center;justify-content:center;font-size:1.1rem"><i class="bi bi-bar-chart-line"></i></div>
                    <div>
                        <div style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0">Reports</div>
                        <div style="font-size:0.7rem;color:#94a3b8">Financial summaries by date range</div>
                    </div>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <input type="date" id="reportStart" class="form-control form-control-sm" style="border-radius:9px" value="${startOfMonth}">
                    <span class="text-muted" style="font-size:0.8rem">to</span>
                    <input type="date" id="reportEnd" class="form-control form-control-sm" style="border-radius:9px" value="${today}">
                    <button class="btn btn-primary btn-sm" onclick="ReportsPage.fetchReport()"><i class="bi bi-search"></i> Generate</button>
                </div>
            </div>
            <div id="reportContent">${UI.loader()}</div>
        `;

        this.fetchReport();
    },

    async fetchReport() {
        const startDate = document.getElementById('reportStart')?.value;
        const endDate = document.getElementById('reportEnd')?.value;
        const content = document.getElementById('reportContent');
        if (!content || !startDate || !endDate) return;

        content.innerHTML = UI.loader();

        try {
            const res = await HttpService.get(API.reports.transactions(startDate, endDate));
            const data = res.ok ? (res.data.data || res.data) : null;

            if (!data) {
                content.innerHTML = '<div class="alert alert-warning">No report data available for this period.</div>';
                return;
            }

            const transactions = data.transactions || data || [];
            const txList = Array.isArray(transactions) ? transactions : [];

            // Calculate summary
            const income = txList.filter(t => t.isIncome || t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const expenses = txList.filter(t => !t.isIncome && t.type !== 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const profit = income - expenses;

            // Group by category
            const byCategory = {};
            txList.forEach(t => {
                const cat = t.category || 'Uncategorized';
                if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0, count: 0 };
                byCategory[cat].count++;
                if (t.isIncome || t.type === 'income') byCategory[cat].income += parseFloat(t.amount) || 0;
                else byCategory[cat].expense += parseFloat(t.amount) || 0;
            });

            // Group by employee
            const byEmployee = {};
            txList.forEach(t => {
                const emp = t.employee_name || t.employeeName || 'Unknown';
                if (!byEmployee[emp]) byEmployee[emp] = { total: 0, count: 0 };
                byEmployee[emp].count++;
                byEmployee[emp].total += parseFloat(t.amount) || 0;
            });

            content.innerHTML = `
                <div class="stats-grid mb-3" style="grid-template-columns:repeat(4,1fr)">
                    <div class="kpi-card kpi-income"><div class="kpi-card-body"><div class="kpi-icon-wrap"><i class="bi bi-arrow-up-circle"></i></div><div class="kpi-data"><span class="kpi-label">Total Income</span><span class="kpi-value">${UI.money(income)}</span><span class="kpi-sub">${txList.filter(t=>t.isIncome||t.type==='income').length} entries</span></div></div></div>
                    <div class="kpi-card kpi-expense"><div class="kpi-card-body"><div class="kpi-icon-wrap"><i class="bi bi-arrow-down-circle"></i></div><div class="kpi-data"><span class="kpi-label">Total Expenses</span><span class="kpi-value">${UI.money(expenses)}</span><span class="kpi-sub">${txList.filter(t=>!t.isIncome&&t.type!=='income').length} entries</span></div></div></div>
                    <div class="kpi-card ${profit >= 0 ? 'kpi-revenue' : 'kpi-expense'}"><div class="kpi-card-body"><div class="kpi-icon-wrap"><i class="bi bi-graph-up-arrow"></i></div><div class="kpi-data"><span class="kpi-label">Net Profit</span><span class="kpi-value">${UI.money(profit)}</span><span class="kpi-sub">${profit >= 0 ? 'Surplus' : 'Deficit'} period</span></div></div></div>
                    <div class="kpi-card kpi-count"><div class="kpi-card-body"><div class="kpi-icon-wrap"><i class="bi bi-receipt"></i></div><div class="kpi-data"><span class="kpi-label">Transactions</span><span class="kpi-value">${txList.length}</span><span class="kpi-sub">in selected range</span></div></div></div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        ${UI.card('By Category', UI.table([
                            { key: 'category', label: 'Category' },
                            { key: 'count', label: 'Count', class: 'text-center' },
                            { key: 'income', label: 'Income', class: 'text-end', render: r => `<span class="text-success">${UI.money(r.income)}</span>` },
                            { key: 'expense', label: 'Expense', class: 'text-end', render: r => `<span class="text-danger">${UI.money(r.expense)}</span>` },
                        ], Object.entries(byCategory).map(([cat, v]) => ({ category: cat, ...v })), { emptyMessage: 'No data' }))}
                    </div>
                    <div class="col-md-6">
                        ${UI.card('By Employee', UI.table([
                            { key: 'employee', label: 'Employee' },
                            { key: 'count', label: 'Transactions', class: 'text-center' },
                            { key: 'total', label: 'Total', class: 'text-end', render: r => `<strong>${UI.money(r.total)}</strong>` },
                        ], Object.entries(byEmployee).map(([emp, v]) => ({ employee: emp, ...v })), { emptyMessage: 'No data' }))}
                    </div>
                </div>
                <div class="mt-3">
                    ${UI.card('All Transactions', UI.table([
                        { key: 'date', label: 'Date', render: r => UI.formatDate(r.transaction_date || r.date || r.createdAt) },
                        { key: 'type', label: 'Type', render: r => (r.isIncome || r.type === 'income') ? UI.badge('Income', 'success') : UI.badge('Expense', 'danger') },
                        { key: 'category', label: 'Category', render: r => UI.escapeHtml(r.category || '--') },
                        { key: 'description', label: 'Description', render: r => UI.escapeHtml((r.description || '').substring(0, 50)) },
                        { key: 'employee', label: 'Employee', render: r => UI.escapeHtml(r.employee_name || r.employeeName || '--') },
                        { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong class="${(r.isIncome || r.type === 'income') ? 'text-success' : 'text-danger'}">${UI.money(r.amount)}</strong>` },
                    ], txList, { emptyMessage: 'No transactions in this period' }))}
                </div>
            `;
        } catch (err) {
            content.innerHTML = '<div class="alert alert-danger">Failed to generate report. Please try again.</div>';
        }
    },
};
