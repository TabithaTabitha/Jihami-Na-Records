/**
 * Jihami - Overview / Dashboard Home Page
 * Dynamic period filter: data fetched once, all period changes are instant in-memory re-renders.
 */

const OverviewPage = {
    chart: null,

    // â”€â”€ Cached raw data (fetched once per page load) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _allTx:   [],
    _empArr:  [],
    _invArr:  [],
    _custArr: [],

    // â”€â”€ Period state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _period:      'month',   // week | month | last_month | q3 | h6 | year | all | custom
    _customStart: null,      // Date
    _customEnd:   null,      // Date

    // â”€â”€ Period definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _periods: [
        { id: 'week',       label: 'This Week'   },
        { id: 'month',      label: 'This Month'  },
        { id: 'last_month', label: 'Last Month'  },
        { id: 'q3',         label: '3 Months'    },
        { id: 'h6',         label: '6 Months'    },
        { id: 'year',       label: 'This Year'   },
        { id: 'all',        label: 'All Time'    },
        { id: 'custom',     label: 'Custom'      },
    ],

    // â”€â”€ Entry point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async render(container) {
        container.innerHTML = UI.loader();

        if (OverviewPage.chart) { OverviewPage.chart.destroy(); OverviewPage.chart = null; }

        try {
            const [txResult, empResult, invResult, custResult] = await Promise.allSettled([
                HttpService.get(API.transactions.list),
                HttpService.get(API.employees.list),
                HttpService.get(API.invoices.list),
                HttpService.get(API.customers.list),
            ]);

            const get = (r) => r.status === 'fulfilled' && r.value.ok
                ? (r.value.data.data || r.value.data || []) : [];

            OverviewPage._allTx   = Array.isArray(get(txResult))   ? get(txResult)   : [];
            OverviewPage._empArr  = Array.isArray(get(empResult))  ? get(empResult)  : [];
            OverviewPage._invArr  = Array.isArray(get(invResult))  ? get(invResult)  : [];
            OverviewPage._custArr = Array.isArray(get(custResult)) ? get(custResult) : [];

            OverviewPage._renderShell(container);
            OverviewPage._renderDailyPayments();
            OverviewPage._applyPeriod(OverviewPage._period);

        } catch (err) {
            container.innerHTML = `<div class="alert alert-danger m-3">
                Failed to load dashboard data.
                <button class="btn btn-sm btn-outline-danger ms-2"
                    onclick="OverviewPage.render(document.getElementById('pageContent'))">Retry</button>
            </div>`;
        }
    },

    // â”€â”€ Render the static page shell (runs once) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _renderShell(container) {
        const pillsHtml = OverviewPage._periods.map(p => `
            <button class="period-pill ${p.id === OverviewPage._period ? 'active' : ''}"
                    data-period="${p.id}"
                    onclick="OverviewPage._setPeriod('${p.id}')">
                ${p.id === 'custom' ? '<i class="bi bi-calendar-range"></i> ' : ''}${p.label}
            </button>`).join('');

        const today = new Date().toISOString().split('T')[0];

        container.innerHTML = `
            <!-- â”€â”€ Period Selector â”€â”€ -->
            <div class="period-bar" id="ovPeriodBar">
                <span class="period-bar-label"><i class="bi bi-calendar3"></i> Period:</span>
                ${pillsHtml}
                <span class="period-range-label" id="ovRangeLabel"></span>
            </div>
            <div class="period-custom-range" id="ovCustomRange">
                <label style="font-size:0.78rem;color:#555;white-space:nowrap">From</label>
                <input type="date" id="ovCustomStart" class="form-control">
                <label style="font-size:0.78rem;color:#555;white-space:nowrap">To</label>
                <input type="date" id="ovCustomEnd" class="form-control">
                <button class="btn btn-primary btn-sm" onclick="OverviewPage._applyCustom()">Apply</button>
            </div>

            <!-- â”€â”€ Stat cards (dynamic) â”€â”€ -->
            <div class="stats-grid" id="ovStats"></div>

            <!-- â”€â”€ Quick Actions bar â”€â”€ -->
            <div class="dashboard-card" style="margin-bottom:1rem">
                <div class="card-body-custom" style="padding:0.9rem 1.25rem">
                    <div class="quick-actions-bar">
                        <a href="#/transactions?action=add" class="quick-action-btn">
                            <div class="qa-btn-icon bg-primary-soft"><i class="bi bi-plus-circle"></i></div>
                            <span>Add Transaction</span>
                        </a>
                        <a href="#/invoices?action=create" class="quick-action-btn">
                            <div class="qa-btn-icon bg-success-soft"><i class="bi bi-receipt-cutoff"></i></div>
                            <span>New Invoice</span>
                        </a>
                        <a href="#/customers?action=add" class="quick-action-btn">
                            <div class="qa-btn-icon bg-warning-soft"><i class="bi bi-person-plus"></i></div>
                            <span>Add Customer</span>
                        </a>
                        <a href="#/items?action=add" class="quick-action-btn">
                            <div class="qa-btn-icon bg-info-soft"><i class="bi bi-box-seam"></i></div>
                            <span>Add Item</span>
                        </a>
                        <a href="#/reports" class="quick-action-btn">
                            <div class="qa-btn-icon bg-danger-soft"><i class="bi bi-bar-chart-line"></i></div>
                            <span>View Reports</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- â”€â”€ 2-column body â”€â”€ -->
            <div class="overview-body">
                <div class="overview-center">
                    <div class="dashboard-card" style="display:flex;flex-direction:column">
                        <div class="card-header-custom">
                            <h5>Revenue</h5>
                            <span id="ovChartLabel" style="font-size:0.75rem;color:#8b95a5"></span>
                        </div>
                        <div class="card-body-custom" style="height:300px;position:relative;overflow-x:auto;overflow-y:hidden;padding-bottom:.5rem">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="overview-right">
                        <div class="metrics-mini-grid" id="ovMetrics"></div>
                        <div class="dashboard-card" id="ovDailyPaymentsCard">
                            <div class="card-header-custom" style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;">
                                <h5 style="margin:0">Daily Breakdown</h5>
                                <input id="ovDailyPaymentDate" type="date" class="form-control form-control-sm" value="${today}" onchange="OverviewPage._renderDailyPayments()">
                            </div>
                            <div class="card-body-custom" id="ovDailyPayments">
                                <div class="text-center text-muted">Loading...</div>
                            </div>
                        </div>
                        <div class="dashboard-card dark-summary-card" id="ovSummaryCard">
                            <div class="card-body-custom" id="ovSummary"></div>
                        </div>
                        <div class="metric-card metric-card-dark" id="ovTxCard"></div>
                    </div>
            </div>

            <!-- â”€â”€ Recent Transactions â”€â”€ -->
            <div class="dashboard-card">
                <div class="card-header-custom">
                    <div style="display:flex;flex-direction:column;gap:0.15rem;min-width:0">
                        <h5 style="margin:0">Recent Transactions</h5>
                        <span id="ovRecentLabel" style="font-size:0.72rem;color:#8b95a5"></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;flex-shrink:0">
                        <div class="tx-summary-pills" id="ovRecentSummary"></div>
                        <a href="#/transactions" class="view-all-link">View All <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
                <div id="ovRecent"></div>
            </div>
        `;
    },

    async _renderDailyPayments() {
        const container = document.getElementById('ovDailyPayments');
        if (!container) return;

        const dateInput = document.getElementById('ovDailyPaymentDate');
        const selectedDate = dateInput?.value || new Date().toISOString().split('T')[0];
        if (dateInput) dateInput.value = selectedDate;

        container.innerHTML = `<div class="text-center text-muted">Loading breakdown for ${selectedDate}...</div>`;

        try {
            const res = await HttpService.get(API.invoices.dailyPayments(selectedDate));
            if (!res.ok || !res.data || !res.data.data) throw new Error('Invalid response');

            const data = res.data.data;
            const totals = data.totals || {};
            const totalAmount = parseFloat(data.total_amount) || 0;
            const displayDate = data.date || selectedDate;

            container.innerHTML = `
                <div class="daily-payments-meta">Payments for <strong>${displayDate}</strong></div>
                <div class="daily-payments-grid">
                    <div class="daily-payments-row"><span>Mpesa</span><strong>${UI.money(totals.mpesa || 0)}</strong></div>
                    <div class="daily-payments-row"><span>Cash</span><strong>${UI.money(totals.cash || 0)}</strong></div>
                    <div class="daily-payments-row"><span>PDQ</span><strong>${UI.money(totals.pdq || 0)}</strong></div>
                    <div class="daily-payments-row"><span>Complimentary</span><strong>${UI.money(totals.complimentary || 0)}</strong></div>
                    <div class="daily-payments-row"><span>On Account</span><strong>${UI.money(totals.on_account || 0)}</strong></div>
                    <div class="daily-payments-row"><span>Other</span><strong>${UI.money(totals.other || 0)}</strong></div>
                    <div class="daily-payments-total"><span>Total</span><strong>${UI.money(totalAmount)}</strong></div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<div class="text-danger">Unable to load today's payment totals.</div>`;
        }
    },

    // â”€â”€ Change period (called by pill buttons) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _setPeriod(p) {
        OverviewPage._period = p;

        // Toggle active pill
        document.querySelectorAll('.period-pill').forEach(el => {
            el.classList.toggle('active', el.dataset.period === p);
        });

        // Show/hide custom date range inputs
        const customRow = document.getElementById('ovCustomRange');
        if (customRow) customRow.classList.toggle('show', p === 'custom');

        if (p !== 'custom') OverviewPage._applyPeriod(p);
    },

    // â”€â”€ Apply custom date range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _applyCustom() {
        const s = document.getElementById('ovCustomStart')?.value;
        const e = document.getElementById('ovCustomEnd')?.value;
        if (!s || !e) { UI.toast('Please select both start and end dates.', 'warning'); return; }
        OverviewPage._customStart = new Date(s);
        OverviewPage._customEnd   = new Date(e);
        OverviewPage._customEnd.setHours(23, 59, 59, 999);
        OverviewPage._applyPeriod('custom');
    },

    // â”€â”€ Compute date range from period id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _getRange(period) {
        const now  = new Date();
        const y    = now.getFullYear();
        const m    = now.getMonth();

        switch (period) {
            case 'week': {
                const day   = now.getDay(); // 0=Sun
                const start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0,0,0,0);
                const end   = new Date(now); end.setHours(23,59,59,999);
                return { start, end, days: 7 };
            }
            case 'month': {
                return { start: new Date(y, m, 1), end: new Date(y, m+1, 0, 23,59,59,999), days: new Date(y, m+1, 0).getDate() };
            }
            case 'last_month': {
                const lm = m === 0 ? 11 : m - 1;
                const ly = m === 0 ? y - 1 : y;
                return { start: new Date(ly, lm, 1), end: new Date(ly, lm+1, 0, 23,59,59,999), days: new Date(ly, lm+1, 0).getDate() };
            }
            case 'q3':   return { start: new Date(y, m-2,  1, 0,0,0,0), end: new Date(now), days: 90  };
            case 'h6':   return { start: new Date(y, m-5,  1, 0,0,0,0), end: new Date(now), days: 180 };
            case 'year': return { start: new Date(y, 0,    1, 0,0,0,0), end: new Date(y, 11, 31, 23,59,59,999), days: 365 };
            case 'all':  return { start: new Date(2000, 0, 1),           end: new Date(now), days: null };
            case 'custom': {
                const s = OverviewPage._customStart || new Date(y, m, 1);
                const e = OverviewPage._customEnd   || new Date(now);
                const days = Math.ceil((e - s) / 86400000);
                return { start: s, end: e, days };
            }
        }
    },

    // â”€â”€ Normalize a transaction's date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _txDate(t) {
        const raw = t.date || t.transaction_date || t.created_at || t.createdAt;
        if (!raw) return null;
        const normalized = typeof raw === 'string' ? raw.replace(' ', 'T') : raw;
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? null : d;
    },

    // â”€â”€ Income / expense classifiers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _isIncome(t)  { return t.type === 'income'  || t.isIncome === true  || t.isIncome === 'true'; },
    _isExpense(t) {
        if (OverviewPage._isIncome(t)) return false;
        return t.type === 'expense' || t.isIncome === false || t.isIncome === 'false'
            || (t.type != null && t.type !== '');
    },

    // â”€â”€ Filter transactions to a range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _filter(txArr, range) {
        if (range.days === null) return txArr; // All time
        return txArr.filter(t => {
            const d = OverviewPage._txDate(t);
            return d && d >= range.start && d <= range.end;
        });
    },

    // â”€â”€ Main apply â€” update all dynamic sections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _applyPeriod(period) {
        const range    = OverviewPage._getRange(period);
        const filtered = OverviewPage._filter(OverviewPage._allTx, range);
        const empArr   = OverviewPage._empArr;
        const invArr   = OverviewPage._invArr;
        const custArr  = OverviewPage._custArr;

        const totalIncome  = filtered.filter(OverviewPage._isIncome) .reduce((s,t) => s+(parseFloat(t.amount)||0), 0);
        // ADD INVOICE INCOME: Include all invoices from the date range
        const filteredInvoices = OverviewPage._filter(OverviewPage._invArr, range);
        const invoiceIncome = filteredInvoices.reduce((s, inv) => s + (parseFloat(inv.total_amount || inv.totalAmount || 0)), 0);
        // Combine transaction and invoice income
        const totalIncome_combined = totalIncome + invoiceIncome;
        const totalExpense = filtered.filter(OverviewPage._isExpense).reduce((s,t) => s+(parseFloat(t.amount)||0), 0);
        const revenue      = totalIncome_combined - totalExpense;
        const overdueCount = invArr.filter(inv => inv.status === 'overdue').length;
        const incomeRatio  = (totalIncome_combined+totalExpense) > 0 ? Math.round(totalIncome_combined/(totalIncome_combined+totalExpense)*100) : 0;
        
        // Combine transactions and invoices for recent list
        const recentItems = [
            ...filtered.map(t => ({ ...t, _type: 'transaction' })),
            ...filteredInvoices.map(inv => ({
                ...inv,
                _type: 'invoice',
                amount: inv.total_amount || inv.totalAmount || 0,
                date: inv.invoice_date || inv.created_at || inv.date,
                transaction_date: inv.invoice_date || inv.created_at || inv.date,
            }))
        ];
        const recent = recentItems.slice().sort((a,b) => {
            const da = OverviewPage._txDate(a), db = OverviewPage._txDate(b);
            return (db||0) - (da||0);
        }).slice(0, 10);

        // â”€â”€ Range label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const fmt = (d) => d.toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' });
        const rangeText = range.days === null
            ? 'All time'
            : `${fmt(range.start)} â€“ ${fmt(range.end)}`;
        const el = (id) => document.getElementById(id);
        if (el('ovRangeLabel'))  el('ovRangeLabel').textContent  = rangeText;
        if (el('ovRecentLabel')) el('ovRecentLabel').textContent = `(${rangeText})`;
        if (el('ovChartLabel'))  el('ovChartLabel').textContent  = rangeText + ' â€” income vs expenses';

        // â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const statsEl = el('ovStats');
        if (statsEl) {
            statsEl.innerHTML = [
                UI.statCard('graph-up-arrow',  'Revenue',       UI.money(revenue),       'bg-primary-soft'),
                UI.statCard('cash-coin',        'Income',        UI.money(totalIncome_combined),   'bg-success-soft'),
                UI.statCard('arrow-down-circle','Expenses',      UI.money(totalExpense),  'bg-danger-soft'),
                UI.statCard('receipt',          'Transactions',  filtered.length,         'bg-warning-soft'),
            ].join('');
            statsEl.querySelectorAll('.stat-card').forEach(c => {
                c.classList.add('updating');
                c.addEventListener('animationend', () => c.classList.remove('updating'), { once: true });
            });
        }

        // â”€â”€ Mini metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const metricsEl = el('ovMetrics');
        if (metricsEl) metricsEl.innerHTML = `
            <div class="metric-card">
                <div class="metric-top">
                    <span class="metric-label">Customers</span>
                    <div class="metric-icon bg-primary-soft"><i class="bi bi-people"></i></div>
                </div>
                <div class="metric-value">${custArr.length}</div>
                <span class="metric-badge positive"><i class="bi bi-arrow-up-short"></i> Active</span>
            </div>
            <div class="metric-card">
                <div class="metric-top">
                    <span class="metric-label">Overdue</span>
                    <div class="metric-icon ${overdueCount > 0 ? 'bg-danger-soft' : 'bg-success-soft'}">
                        <i class="bi bi-receipt-cutoff"></i>
                    </div>
                </div>
                <div class="metric-value">${overdueCount}</div>
                <span class="metric-badge ${overdueCount > 0 ? 'negative' : 'positive'}">
                    <i class="bi bi-${overdueCount > 0 ? 'exclamation-circle' : 'check-circle'}"></i>
                    ${overdueCount > 0 ? 'Attention' : 'All clear'}
                </span>
            </div>`;

        // â”€â”€ Business Summary card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const summaryEl = el('ovSummary');
        if (summaryEl) summaryEl.innerHTML = `
            <div class="ds-title">Business Summary</div>
            <div class="ds-sub">${rangeText}</div>
            <div class="ds-progress-bar">
                <div class="ds-progress-fill" style="width:${incomeRatio}%"></div>
            </div>
            <div class="ds-progress-labels">
                <span class="ds-prog-label"><span class="dot dot-green"></span>Income ${incomeRatio}%</span>
                <span class="ds-prog-label"><span class="dot dot-red"></span>Expense ${100-incomeRatio}%</span>
            </div>
            <a href="#/reports" class="btn btn-light w-100"
               style="font-size:0.8rem;border-radius:10px;font-weight:600">View Reports</a>`;

        // â”€â”€ Transactions dark card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const txCardEl = el('ovTxCard');
        if (txCardEl) txCardEl.innerHTML = `
            <div class="metric-top">
                <span class="metric-label" style="color:#94a3b8">Employees</span>
                <div class="metric-icon" style="background:rgba(255,255,255,0.1);color:#fff">
                    <i class="bi bi-person-badge"></i>
                </div>
            </div>
            <div class="metric-value" style="color:#fff">${empArr.length}</div>
            <a href="#/employees" class="btn btn-sm w-100 mt-1"
               style="background:rgba(255,255,255,0.12);color:#e2e8f0;border:1px solid rgba(255,255,255,0.18);border-radius:10px;font-size:0.74rem">
                View All
            </a>`;

        // â”€â”€ Recent transactions list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // ── Recent transactions list + summary pills ────────────────────────
        const recentEl = el('ovRecent');
        if (recentEl) {
            recentEl.innerHTML = OverviewPage._recentList(recent);
            
            // Attach expense image click handlers to ALL expense rows
            const expenseRows = recentEl.querySelectorAll('[data-expense-id]');
            console.log('Expense rows found:', expenseRows.length);
            
            expenseRows.forEach(row => {
                const img = row.getAttribute('data-expense-image');
                const id = row.getAttribute('data-expense-id');
                console.log('Attaching click to expense:', id, '| Has image:', !!img);
                
                row.addEventListener('click', (e) => {
                    console.log('Clicked expense:', id, 'Image:', img);
                    OverviewPage._showExpenseImage(img, id);
                });
            });
        }

        const recentInc = recent.filter(OverviewPage._isIncome) .reduce((s,t) => s + (parseFloat(t.amount) || 0), 0);
        const recentExp = recent.filter(OverviewPage._isExpense).reduce((s,t) => s + (parseFloat(t.amount) || 0), 0);
        const recentSummaryEl = el('ovRecentSummary');
        if (recentSummaryEl) recentSummaryEl.innerHTML =
            `<span class="tx-summary-pill inc"><i class="bi bi-arrow-up-short"></i>${UI.money(recentInc)}</span>` +
            `<span class="tx-summary-pill exp"><i class="bi bi-arrow-down-short"></i>${UI.money(recentExp)}</span>`;

        // â”€â”€ Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const chartData = OverviewPage._buildChartData(filtered, range);
        if (OverviewPage.chart) { OverviewPage.chart.destroy(); OverviewPage.chart = null; }
        OverviewPage._drawChart(chartData);
    },

    // â”€â”€ Build chart data points bucketed by day / week / month â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _buildChartData(txArr, range) {
        const labels = [], income = [], expense = [];
        const end    = range.end;
        const days   = range.days;

        // For "All Time", start from the earliest transaction rather than year 2000
        let start = range.start;
        if (days === null && txArr.length > 0) {
            const earliest = txArr.reduce((min, t) => {
                const d = OverviewPage._txDate(t);
                return (d && (!min || d < min)) ? d : min;
            }, null);
            if (earliest) { start = new Date(earliest.getFullYear(), earliest.getMonth(), 1); }
        }

        // Choose bucket size: â‰¤31d = daily, â‰¤90d = weekly, else monthly
        // null/all-time => monthly; <=31d => daily; <=90d => weekly; else monthly
        const bucket = (days === null || days > 365) ? 'month' : days <= 31 ? 'day' : days <= 90 ? 'week' : 'month';

        // Build bucket keys (wStart stored as Date for accurate week-range matching)
        const buckets = {};
        const addBucket = (key, label, wStart) => { buckets[key] = { label, inc: 0, exp: 0, wStart: wStart || null }; };

        if (bucket === 'day') {
            const cur = new Date(start); cur.setHours(0,0,0,0);
            while (cur <= end) {
                const key = cur.toDateString();
                addBucket(key, cur.toLocaleDateString('en-KE', { month:'short', day:'numeric' }));
                cur.setDate(cur.getDate() + 1);
            }
        } else if (bucket === 'week') {
            const cur = new Date(start); cur.setHours(0,0,0,0);
            let wk = 1;
            while (cur <= end) {
                const key = 'W' + wk + '-' + cur.getFullYear();
                addBucket(key, cur.toLocaleDateString('en-KE', { month:'short', day:'numeric' }), new Date(cur));
                cur.setDate(cur.getDate() + 7); wk++;
            }
        } else {
            // monthly
            const cur = new Date(start.getFullYear(), start.getMonth(), 1);
            while (cur <= end) {
                const key = `${cur.getFullYear()}-${cur.getMonth()}`;
                addBucket(key, cur.toLocaleDateString('en-KE', { month:'short', year:'2-digit' }));
                cur.setMonth(cur.getMonth() + 1);
            }
        }

        // Assign transactions to buckets
        txArr.forEach(t => {
            const d = OverviewPage._txDate(t);
            if (!d) return;
            let key;
            if      (bucket === 'day')   key = d.toDateString();
            else if (bucket === 'week')  {
                // use stored Date objects to avoid parsing locale-formatted labels
                const keys = Object.keys(buckets);
                for (let i = 0; i < keys.length; i++) {
                    const wStart = buckets[keys[i]].wStart;
                    const wEnd   = i+1 < keys.length ? buckets[keys[i+1]].wStart : end;
                    if (d >= wStart && d < wEnd) { key = keys[i]; break; }
                }
            } else {
                key = `${d.getFullYear()}-${d.getMonth()}`;
            }
            if (key && buckets[key]) {
                if (OverviewPage._isIncome(t))  buckets[key].inc += parseFloat(t.amount) || 0;
                if (OverviewPage._isExpense(t)) buckets[key].exp += parseFloat(t.amount) || 0;
            }
        });

        // Only include buckets that have at least one transaction (skip empty gaps)
        Object.values(buckets).forEach(b => {
            if (b.inc === 0 && b.exp === 0) return;
            labels.push(b.label);
            income.push(b.inc);
            expense.push(b.exp);
        });

        return { labels, income, expense };
    },

    // â”€â”€ Draw / redraw chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _drawChart(data) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas || typeof Chart === 'undefined') return;

        // Make canvas wide enough for a comfortable bar width — scroll if needed
        const MIN_BAR_GROUP_PX = 48; // px per label group (2 bars + gap)
        const wrap = canvas.parentElement;
        const naturalWidth = wrap.clientWidth || 400;
        const neededWidth  = Math.max(naturalWidth, data.labels.length * MIN_BAR_GROUP_PX);
        canvas.style.width  = neededWidth + 'px';
        canvas.style.height = '280px';

        OverviewPage.chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: data.income,
                        backgroundColor: 'rgba(59,130,246,0.85)',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    },
                    {
                        label: 'Expenses',
                        data: data.expense,
                        backgroundColor: 'rgba(239,68,68,0.8)',
                        borderColor: '#dc2626',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, boxHeight: 12, borderRadius: 3, useBorderRadius: true, font: { size: 11 }, color: '#4b5563' }
                    },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: KES ${ctx.parsed.y.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, color: '#6b7280', maxRotation: 30, autoSkip: false }
                    },
                    y: {
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: {
                            font: { size: 10 }, color: '#6b7280',
                            callback: v => v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : v >= 1000 ? (v/1000).toFixed(0) + 'K' : v
                        }
                    }
                }
            }
        });
    },

    // â”€â”€ Recent transactions list rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _recentList(transactions) {
        const slideshow = `
            <div class="receipt-slideshow">
                <div class="receipt-slide"><img src="assets/images/onboarding_images/Receipt.gif" alt="Receipt"></div>
                <div class="receipt-slide"><img src="assets/images/home/carreciept.png" alt="Receipt"></div>
                <div class="receipt-slide"><img src="assets/images/onboarding_images/Audit.gif" alt="Audit"></div>
                <div class="receipt-slide"><img src="assets/images/home/report.png" alt="Report"></div>
                <div class="receipt-slideshow-overlay">
                    <div class="receipt-slideshow-eyebrow"><i class="bi bi-receipt"></i> &nbsp;Activity</div>
                    <div class="receipt-slideshow-title">Your recent<br>activity</div>
                    <div class="receipt-slideshow-sub">${transactions.length} item${transactions.length !== 1 ? 's' : ''} shown</div>
                    <div class="receipt-dots">
                        <div class="receipt-dot"></div>
                        <div class="receipt-dot"></div>
                        <div class="receipt-dot"></div>
                        <div class="receipt-dot"></div>
                    </div>
                </div>
            </div>`;

        if (!transactions.length) {
            return `<div class="recent-tx-wrap">${slideshow}
                <div class="recent-tx-list">
                    <div class="empty-state py-5">
                        <i class="bi bi-inbox"></i>
                        <h6>No transactions in this period</h6>
                        <p>Try selecting a wider time range above</p>
                    </div>
                </div>
            </div>`;
        }

        const catIcon = (cat) => {
            const c = (cat || '').toLowerCase();
            if (c.includes('food') || c.includes('restaurant') || c.includes('meal'))  return 'cup-hot';
            if (c.includes('salary') || c.includes('payroll') || c.includes('wage'))   return 'person-badge';
            if (c.includes('rent') || c.includes('utility') || c.includes('electric')) return 'house';
            if (c.includes('transport') || c.includes('fuel') || c.includes('travel')) return 'car-front';
            if (c.includes('sales') || c.includes('revenue') || c.includes('income'))  return 'graph-up-arrow';
            if (c.includes('stock') || c.includes('inventory') || c.includes('item'))  return 'box-seam';
            if (c.includes('invoice') || c.includes('payment'))                        return 'receipt-cutoff';
            if (c.includes('mpesa') || c.includes('mobile') || c.includes('phone'))    return 'phone';
            return null;
        };

        const rows = transactions.map(t => {
            const isInvoice = t._type === 'invoice';
            const isInc   = isInvoice || OverviewPage._isIncome(t);
            const d       = OverviewPage._txDate(t);
            const cat     = isInvoice ? 'Invoice' : (t.category || '');
            const icon    = isInvoice ? 'receipt-cutoff' : catIcon(cat);
            const initial = icon ? null : (cat || t.description || 'T').charAt(0).toUpperCase();
            const method  = isInvoice ? '' : (t.paymentMethod || t.payment_method || '');
            const ref     = isInvoice ? (t.invoice_number || t.invoiceNumber || '') : (t.referenceNumber || t.reference_number || '');
            const isExpense = !isInc;
            const dataId = isExpense ? `data-expense-id="${UI.escapeHtml(t.id || t.reference_number || '')}"` : '';
            const dataImg = isExpense && t.image ? `data-expense-image="${UI.escapeHtml(t.image)}"` : '';
            
            // Get description - show customer for invoices, description for transactions
            let description = '';
            if (isInvoice) {
                description = t.customer_name || t.customerName || t.customer?.name || 'Invoice';
            } else {
                description = t.description || cat || 'Transaction';
            }

            return `
            <div class="recent-tx-row ${isInc ? 'income-row' : 'expense-row'}" ${dataId} ${dataImg} style="${isExpense ? 'cursor: pointer;' : ''}">
                <div class="recent-tx-avatar ${isInc ? 'income-avatar' : 'expense-avatar'}">
                    ${icon ? `<i class="bi bi-${icon}"></i>` : `<span>${UI.escapeHtml(initial)}</span>`}
                </div>
                <div class="recent-tx-info">
                    <div class="recent-tx-name">${UI.escapeHtml(description)}</div>
                    <div class="recent-tx-meta">
                        ${cat    ? `<span class="recent-tx-cat">${UI.escapeHtml(cat)}</span>` : ''}
                        <span class="recent-tx-date"><i class="bi bi-calendar3" style="font-size:.65rem;opacity:.55"></i> ${d ? UI.formatDate(d.toISOString()) : '--'}</span>
                        ${method ? `<span class="recent-tx-method"><i class="bi bi-credit-card" style="font-size:.62rem"></i> ${UI.escapeHtml(method)}</span>` : ''}
                        ${ref    ? `<span class="recent-tx-method" title="Ref: ${UI.escapeHtml(ref)}">${UI.escapeHtml(ref.substring(0, 12))}${ref.length > 12 ? '\u2026' : ''}</span>` : ''}
                    </div>
                </div>
                <div class="recent-tx-right">
                    <span class="recent-tx-amount ${isInc ? 'income' : 'expense'}">${isInc ? '+' : '−'}${UI.money(t.amount)}</span>
                    <span class="recent-tx-badge ${isInc ? 'income-badge' : 'expense-badge'}">${isInvoice ? 'Invoice' : (isInc ? 'Income' : 'Expense')}</span>
                </div>
            </div>`;
        }).join('');

        return `<div class="recent-tx-wrap">${slideshow}<div class="recent-tx-list">${rows}</div></div>`;
    },

    // ─── Dynamic slideshow image for expenses ──────────────────────────────────────
    _showExpenseImage(imageUrl, expenseId) {
        console.log('_showExpenseImage called:', { imageUrl, expenseId });
        
        const slideshow = document.querySelector('.receipt-slideshow');
        if (!slideshow) {
            console.log('Slideshow not found');
            return;
        }
        
        const slides = slideshow.querySelectorAll('.receipt-slide');
        console.log('Slides found:', slides.length);
        if (slides.length === 0) return;
        
        if (imageUrl) {
            // Show the actual expense image
            slides[0].innerHTML = `<img src="${imageUrl}" alt="Expense Image" style="object-fit: contain; width: 100%; height: 100%;">`;
            console.log('Image set to first slide');
        } else {
            // Show placeholder if no image available
            slides[0].innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%); color: #666; font-size: 14px; text-align: center;">
                <div>
                    <i class="bi bi-file-image" style="font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.5;"></i>
                    <div>No image attached</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">Add receipt image to expense #${UI.escapeHtml(expenseId)}</div>
                </div>
            </div>`;
            console.log('Placeholder shown (no image)');
        }
        
        // Update overlay text
        const title = slideshow.querySelector('.receipt-slideshow-title');
        if (title) title.innerHTML = 'Expense<br>Receipt';
        
        const sub = slideshow.querySelector('.receipt-slideshow-sub');
        if (sub) sub.textContent = 'Click another expense to view';
    }
};

