/**
 * Jihami - Stock Take Page
 * Displays opening stock and sales breakdown by day for a selected month.
 */

const StockTakePage = {
    stockData: null,
    invoices: [],
    month: '',

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        this.month = params.get('month') || this._currentMonth();
        await this.loadStockData(container);
    },

    async loadStockData(container) {
        container.innerHTML = UI.loader();
        try {
            const stockRes = await HttpService.get(API.stockTake.report(this.month));
            if (!stockRes.ok) throw new Error(stockRes.data?.message || 'Failed to load stock take');
            this.stockData = stockRes.data?.data || { month: this.month, items: [] };
            console.log('Stock Take - Stock items:', this.stockData?.items);
            container.innerHTML = this.renderPage();
            this.attachHandlers(container);
        } catch (err) {
            console.error('Stock take load error:', err);
            container.innerHTML = `<div class="alert alert-danger">Failed to load stock take for ${UI.escapeHtml(this.month)}.</div>`;
        }
    },

    attachHandlers(container) {
        const monthInput = container.querySelector('#stockTakeMonth');
        const refreshButton = container.querySelector('#stockTakeRefresh');

        monthInput?.addEventListener('change', (event) => {
            this.month = event.target.value;
            Router.navigate(`#/stock-take?month=${encodeURIComponent(this.month)}`);
        });

        refreshButton?.addEventListener('click', async () => {
            this.month = monthInput?.value || this._currentMonth();
            await this.loadStockData(container);
        });
    },

    renderPage() {
        const monthLabel = this.stockData?.month || this.month;
        const items = Array.isArray(this.stockData?.items) ? this.stockData.items : [];
        const headers = this._buildDayHeaders(this.stockData?.month_start, this.stockData?.month_end);
        const rows = items.map(item => this._buildRow(item, headers));

        return UI.pageCard({
            icon: 'clipboard-data', color: '#0ea5e9',
            title: 'Stock Take', subtitle: `Opening stock for ${UI.escapeHtml(monthLabel)}`,
            count: rows.length,
            filterHtml: `
                <div class="toolbar-search">
                    <label class="form-label mb-1">Month</label>
                    <input id="stockTakeMonth" type="month" class="form-control form-control-sm" value="${UI.escapeHtml(this.month)}" />
                </div>
            `,
            actionHtml: `<button class="btn btn-primary btn-sm" id="stockTakeRefresh"><i class="bi bi-arrow-clockwise"></i> Refresh</button>`,
        }, this._buildTable(rows, headers));
    },

    _buildDayHeaders(monthStart, monthEnd) {
        const days = [];
        try {
            const start = new Date(monthStart || `${this.month}-01`);
            const end = new Date(monthEnd || `${this.month}-01`);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return [];
            }
            const current = new Date(start);
            while (current <= end) {
                days.push(current.getDate());
                current.setDate(current.getDate() + 1);
            }
        } catch (err) {
            return [];
        }
        return days;
    },

    _buildRow(item, days) {
        const row = {
            name: item.name || '--',
            opening_stock: item.opening_stock || item.beginning_stock || 0,
            total_additions: item.total_additions || item.totalAdditions || item.additions || 0,
            quantity_added: item.quantity_added || item.quantityAdded || 0,
            closing_stock: item.closing_stock || item.closingStock || item.current_quantity || item.currentQuantity || 0,
        };

        const dailySales = Array.isArray(item.daily_sales) ? item.daily_sales : item.dailySales || [];
        const salesMap = dailySales.reduce((map, sale) => {
            const saleDate = sale.date || sale.sale_date || sale.saleDate;
            if (!saleDate) return map;

            const parsed = new Date(saleDate);
            if (isNaN(parsed.getTime())) return map;

            // Use local date day from the sale date
            const day = parsed.getDate();
            const qty = sale.quantity_sold || sale.quantitySold || sale.qty || 0;
            if (qty > 0) {
                map[`day_${day}`] = (map[`day_${day}`] || 0) + qty;
            }
            return map;
        }, {});

        days.forEach(day => {
            row[`day_${day}`] = salesMap[`day_${day}`] || '';
        });

        return row;
    },

    _buildTable(rows, days) {
        const columns = [
            { key: 'name', label: 'Item', render: r => `<strong>${UI.escapeHtml(r.name)}</strong>` },
            { key: 'opening_stock', label: 'OS', class: 'text-end', render: r => UI.escapeHtml(String(r.opening_stock)) },
            { key: 'total_additions', label: 'Add', class: 'text-end', render: r => UI.escapeHtml(String(r.total_additions)) },
            { key: 'quantity_added', label: 'Qty Added', class: 'text-end', render: r => UI.escapeHtml(String(r.quantity_added)) },
            ...days.map(day => ({ key: `day_${day}`, label: String(day), class: 'text-center', render: r => UI.escapeHtml(String(r[`day_${day}`] || '')) })),
            { key: 'closing_stock', label: 'Closing', class: 'text-end', render: r => UI.escapeHtml(String(r.closing_stock)) },
        ];

        return UI.table(columns, rows, { emptyMessage: 'No stock take records found for this month.' });
    },

    _currentMonth() {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return month;
    },
};
