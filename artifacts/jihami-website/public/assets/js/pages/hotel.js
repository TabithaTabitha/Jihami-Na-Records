/**
 * Jihami - Hotel Module Page
 * Tables, Orders, Order Items, Billing, Sales Dashboard, Print Queue.
 * Matches Flutter HotelTablesScreen, OrderScreen, BillScreen, SalesDashboard.
 */

const HotelPage = {
    tables: [],
    menuItems: [],
    orders: [],

    async render(container) {
        container.innerHTML = UI.loader();
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const view = params.get('view');

        if (view === 'order') return this.renderOrder(container, params.get('tableId'));
        if (view === 'bill') return this.renderBill(container, params.get('orderId'));
        if (view === 'sales') return this.renderSales(container);
        if (view === 'print') return this.renderPrintQueue(container);

        try {
            const res = await HttpService.get(API.hotel.tables.list);
            this.tables = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.tables)) this.tables = [];
            this.renderTables(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load hotel tables.</div>';
        }
    },

    renderTables(container) {
        const toolbar = `
            <div class="page-toolbar">
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-secondary active" onclick="Router.navigate('#/hotel')"><i class="bi bi-grid"></i> Tables</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel?view=sales')"><i class="bi bi-graph-up"></i> Sales</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel?view=print')"><i class="bi bi-printer"></i> Print Queue</button>
                </div>
                <button class="btn btn-primary btn-sm" onclick="HotelPage.showAddTableModal()"><i class="bi bi-plus-lg"></i> Add Table</button>
            </div>`;

        const tableGrid = `<div class="hotel-table-grid">
            ${this.tables.map(t => {
                const hasOrders = t.activeOrders || t.active_orders || t.hasActiveOrder;
                const statusClass = hasOrders ? 'occupied' : 'available';
                return `
                    <div class="hotel-table-card ${statusClass}" onclick="Router.navigate('#/hotel?view=order&tableId=${t.id}')">
                        <div class="hotel-table-icon"><i class="bi bi-${t.type === 'booth' ? 'circle-square' : 'border-all'}"></i></div>
                        <div class="hotel-table-name">${UI.escapeHtml(t.name || t.table_name || 'Table ' + t.id)}</div>
                        <div class="hotel-table-status">${hasOrders ? 'Occupied' : 'Available'}</div>
                        ${t.capacity ? `<small class="text-muted">${t.capacity} seats</small>` : ''}
                    </div>`;
            }).join('')}
            ${this.tables.length === 0 ? '<p class="text-muted text-center w-100">No tables configured. Add your first table!</p>' : ''}
        </div>`;

        container.innerHTML = toolbar + UI.card('Hotel Tables', tableGrid);
    },

    showAddTableModal(editData = null) {
        const isEdit = !!editData;
        const modal = `
            <div class="modal fade show" id="tableModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">${isEdit ? 'Edit' : 'Add'} Table</h5>
                            <button type="button" class="btn-close" onclick="document.getElementById('tableModal').remove()"></button></div>
                        <form id="tableForm">
                            <div class="modal-body">
                                ${UI.formGroup('Table Name', UI.input('tableName', 'text', 'e.g. Table 1', editData?.name || editData?.table_name || '', 'required'), 'tableName')}
                                ${UI.formGroup('Capacity', UI.input('tableCapacity', 'number', '4', editData?.capacity || '', 'min="1"'), 'tableCapacity')}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('tableModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
        document.getElementById('tableModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modal);

        document.getElementById('tableForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('tableName').value,
                capacity: parseInt(document.getElementById('tableCapacity').value) || 4,
            };
            try {
                const res = isEdit
                    ? await HttpService.put(API.hotel.tables.update(editData.id), payload)
                    : await HttpService.post(API.hotel.tables.create, payload);
                document.getElementById('tableModal')?.remove();
                if (res.ok) {
                    UI.toast(isEdit ? 'Table updated!' : 'Table created!', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || 'Failed to save table', 'danger');
                }
            } catch (err) { UI.toast('Network error', 'danger'); }
        });
    },

    async renderOrder(container, tableId) {
        container.innerHTML = UI.loader();
        try {
            const [tableRes, menuRes, ordersRes] = await Promise.allSettled([
                HttpService.get(API.hotel.tables.get(tableId)),
                HttpService.get(API.hotel.items.list),
                HttpService.get(API.hotel.tables.orders(tableId)),
            ]);
            const table = tableRes.status === 'fulfilled' && tableRes.value.ok ? (tableRes.value.data.data || tableRes.value.data) : null;
            this.menuItems = menuRes.status === 'fulfilled' && menuRes.value.ok ? (menuRes.value.data.data || menuRes.value.data || []) : [];
            const orders = ordersRes.status === 'fulfilled' && ordersRes.value.ok ? (ordersRes.value.data.data || ordersRes.value.data || []) : [];

            const tableName = table?.name || table?.table_name || `Table ${tableId}`;
            const menuByCategory = {};
            (Array.isArray(this.menuItems) ? this.menuItems : []).forEach(item => {
                const cat = item.category || 'Other';
                if (!menuByCategory[cat]) menuByCategory[cat] = [];
                menuByCategory[cat].push(item);
            });

            const menuHtml = Object.entries(menuByCategory).map(([cat, items]) => `
                <h6 class="mt-3 mb-2 text-muted">${UI.escapeHtml(cat)}</h6>
                <div class="row g-2">
                    ${items.map(item => `
                        <div class="col-6 col-md-4 col-lg-3">
                            <div class="menu-item-card p-2 border rounded text-center" onclick="HotelPage.addToOrder(${tableId}, ${item.id}, '${UI.escapeHtml(item.name)}', ${item.unit_price || item.unitPrice || 0})" style="cursor:pointer">
                                <div class="fw-bold small">${UI.escapeHtml(item.name)}</div>
                                <div class="text-success small">${UI.money(item.unit_price || item.unitPrice)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('');

            const activeOrder = orders.find(o => o.status === 'active' || o.status === 'pending');
            const orderId = activeOrder?.id;

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel')"><i class="bi bi-arrow-left"></i> Back</button>
                    <div class="d-flex gap-2 align-items-center">
                        <h6 class="mb-0">${UI.escapeHtml(tableName)}</h6>
                        ${orderId ? `<button class="btn btn-sm btn-success" onclick="Router.navigate('#/hotel?view=bill&orderId=${orderId}')"><i class="bi bi-receipt"></i> Generate Bill</button>` : ''}
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-7">
                        ${UI.card('Menu', menuHtml || '<p class="text-muted">No menu items found</p>')}
                    </div>
                    <div class="col-md-5">
                        ${UI.card('Current Order', `<div id="orderItems">${activeOrder
                            ? this._renderOrderItems(activeOrder.items || activeOrder.orderItems || [])
                            : '<p class="text-muted">No active order. Tap a menu item to start.</p>'
                        }</div>`)}
                    </div>
                </div>
            `;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load table details.</div>';
        }
    },

    _renderOrderItems(items) {
        if (!items || !items.length) return '<p class="text-muted">No items in this order yet.</p>';
        const total = items.reduce((s, i) => s + (parseFloat(i.amount) || (i.quantity * (i.unit_price || i.unitPrice || 0))), 0);
        return `
            <div class="list-group list-group-flush mb-3">
                ${items.map(i => `
                    <div class="list-group-item d-flex justify-content-between align-items-center px-0">
                        <div>
                            <strong>${UI.escapeHtml(i.item_name || i.itemName || i.name || '')}</strong>
                            <small class="text-muted d-block">${i.quantity}x @ ${UI.money(i.unit_price || i.unitPrice)}</small>
                            ${i.special_instructions ? `<small class="text-info">${UI.escapeHtml(i.special_instructions)}</small>` : ''}
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <strong>${UI.money(i.amount || (i.quantity * (i.unit_price || i.unitPrice || 0)))}</strong>
                            <button class="btn btn-sm btn-outline-danger" onclick="HotelPage.removeOrderItem(${i.id})"><i class="bi bi-x"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="fs-5 text-end"><strong>Total: ${UI.money(total)}</strong></div>
        `;
    },

    async addToOrder(tableId, itemId, itemName, unitPrice) {
        // Create order if none exists, then add item
        try {
            // First check for active orders for this table
            const ordersRes = await HttpService.get(API.hotel.tables.orders(tableId));
            let orders = ordersRes.ok ? (ordersRes.data.data || ordersRes.data || []) : [];
            let activeOrder = (Array.isArray(orders) ? orders : []).find(o => o.status === 'active' || o.status === 'pending');

            if (!activeOrder) {
                const createRes = await HttpService.post(API.hotel.orders.create, { table_id: tableId, status: 'active' });
                if (!createRes.ok) return UI.toast('Failed to create order', 'danger');
                activeOrder = createRes.data.data || createRes.data;
            }

            // Add item to order
            const addRes = await HttpService.post(API.hotel.orders.items(activeOrder.id), {
                item_id: itemId,
                quantity: 1,
                unit_price: unitPrice,
                amount: unitPrice,
                special_instructions: '',
            });

            if (addRes.ok) {
                UI.toast(`Added ${itemName}`, 'success');
                // Refresh the order view
                this.renderOrder(document.getElementById('pageContent'), tableId);
            } else {
                UI.toast(addRes.data.message || 'Failed to add item', 'danger');
            }
        } catch (err) {
            UI.toast('Network error', 'danger');
        }
    },

    async removeOrderItem(itemId) {
        try {
            const res = await HttpService.del(API.hotel.orderItems.delete(itemId));
            if (res.ok) {
                UI.toast('Item removed', 'success');
                // Refresh current view
                const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
                this.renderOrder(document.getElementById('pageContent'), params.get('tableId'));
            } else {
                UI.toast(res.data.message || 'Failed to remove', 'danger');
            }
        } catch (err) { UI.toast('Network error', 'danger'); }
    },

    async renderBill(container, orderId) {
        container.innerHTML = UI.loader();
        try {
            const billRes = await HttpService.get(API.hotel.orders.generateBill(orderId));
            const bill = billRes.ok ? (billRes.data.data || billRes.data) : null;
            if (!bill) return container.innerHTML = '<div class="alert alert-danger">Failed to generate bill.</div>';

            const items = bill.items || bill.orderItems || bill.line_items || [];
            const total = bill.total || bill.totalAmount || items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

            container.innerHTML = `
                <div class="page-toolbar">
                    <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel')"><i class="bi bi-arrow-left"></i> Back</button>
                    <h6 class="mb-0">Bill #${UI.escapeHtml(bill.billNo || bill.bill_no || orderId.toString())}</h6>
                </div>
                <div class="row g-3">
                    <div class="col-md-7">
                        ${UI.card('Bill Details', UI.table([
                            { key: 'item', label: 'Item', render: r => UI.escapeHtml(r.item_name || r.itemName || r.name || '--') },
                            { key: 'qty', label: 'Qty', class: 'text-center', render: r => r.quantity },
                            { key: 'price', label: 'Price', class: 'text-end', render: r => UI.money(r.unit_price || r.unitPrice || 0) },
                            { key: 'amount', label: 'Amount', class: 'text-end', render: r => `<strong>${UI.money(r.amount || 0)}</strong>` },
                        ], items, { emptyMessage: 'No items' }) + `
                            <div class="mt-3 p-3 bg-light rounded text-end fs-5"><strong>Total: ${UI.money(total)}</strong></div>
                        `)}
                    </div>
                    <div class="col-md-5">
                        ${UI.card('Clear Bill', `
                            <form id="clearBillForm">
                                <h6>Payment Split</h6>
                                <div class="mb-3">
                                    ${UI.formGroup('M-Pesa', `
                                        <div class="row g-2">
                                            <div class="col-6"><input type="text" class="form-control form-control-sm" id="mpesaRef" placeholder="Ref code"></div>
                                            <div class="col-6"><input type="number" class="form-control form-control-sm" id="mpesaAmt" placeholder="Amount" min="0" step="0.01"></div>
                                        </div>
                                    `, 'mpesa')}
                                </div>
                                <div class="mb-3">
                                    ${UI.formGroup('PDQ / Card', `
                                        <div class="row g-2">
                                            <div class="col-6"><input type="text" class="form-control form-control-sm" id="pdqRef" placeholder="Ref code"></div>
                                            <div class="col-6"><input type="number" class="form-control form-control-sm" id="pdqAmt" placeholder="Amount" min="0" step="0.01"></div>
                                        </div>
                                    `, 'pdq')}
                                </div>
                                <div class="mb-3">
                                    ${UI.formGroup('Cash', `
                                        <div class="row g-2">
                                            <div class="col-6"><input type="text" class="form-control form-control-sm" id="cashRef" placeholder="Ref (opt)"></div>
                                            <div class="col-6"><input type="number" class="form-control form-control-sm" id="cashAmt" placeholder="Amount" min="0" step="0.01"></div>
                                        </div>
                                    `, 'cash')}
                                </div>
                                <button type="submit" class="btn btn-success w-100"><i class="bi bi-check-circle"></i> Clear Bill</button>
                            </form>
                        `)}
                    </div>
                </div>
            `;

            document.getElementById('clearBillForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const billNo = bill.billNo || bill.bill_no || orderId;
                const payload = {
                    mpesa: [],
                    pdq: [],
                    cash: { amount: 0, ref: '' },
                };
                const mpesaAmt = parseFloat(document.getElementById('mpesaAmt').value) || 0;
                const mpesaRef = document.getElementById('mpesaRef').value;
                if (mpesaAmt > 0) payload.mpesa.push({ ref: mpesaRef, amount: mpesaAmt });

                const pdqAmt = parseFloat(document.getElementById('pdqAmt').value) || 0;
                const pdqRef = document.getElementById('pdqRef').value;
                if (pdqAmt > 0) payload.pdq.push({ ref: pdqRef, amount: pdqAmt });

                payload.cash.amount = parseFloat(document.getElementById('cashAmt').value) || 0;
                payload.cash.ref = document.getElementById('cashRef').value;

                try {
                    const res = await HttpService.post(API.hotel.orders.clearBill(billNo), payload);
                    if (res.ok) {
                        UI.toast('Bill cleared!', 'success');
                        Router.navigate('#/hotel');
                    } else {
                        UI.toast(res.data.message || 'Failed to clear bill', 'danger');
                    }
                } catch (err) { UI.toast('Network error', 'danger'); }
            });
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load bill.</div>';
        }
    },

    async renderSales(container) {
        container.innerHTML = UI.loader();
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await HttpService.get(API.hotel.sales.dailySummaryDate(today));
            const sales = res.ok ? (res.data.data || res.data) : {};

            container.innerHTML = `
                <div class="page-toolbar">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel')"><i class="bi bi-grid"></i> Tables</button>
                        <button class="btn btn-sm btn-outline-secondary active"><i class="bi bi-graph-up"></i> Sales</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel?view=print')"><i class="bi bi-printer"></i> Print Queue</button>
                    </div>
                    <input type="date" id="salesDate" class="form-control form-control-sm" style="width:auto" value="${today}">
                </div>
                <div class="stats-grid mb-3">
                    ${UI.statCard('cash-coin', 'Total Sales', UI.money(sales.totalSales || sales.total_sales || 0), 'bg-success-soft')}
                    ${UI.statCard('receipt', 'Orders', sales.totalOrders || sales.total_orders || 0, 'bg-primary-soft')}
                    ${UI.statCard('phone', 'M-Pesa', UI.money(sales.mpesa || sales.mpesaTotal || 0), 'bg-info-soft')}
                    ${UI.statCard('wallet2', 'Cash', UI.money(sales.cash || sales.cashTotal || 0), 'bg-warning-soft')}
                </div>
                ${UI.card('Sales Items', UI.table([
                    { key: 'name', label: 'Item', render: r => UI.escapeHtml(r.name || r.item_name || '--') },
                    { key: 'quantity', label: 'Qty Sold', class: 'text-center' },
                    { key: 'revenue', label: 'Revenue', class: 'text-end', render: r => `<strong>${UI.money(r.revenue || r.total || 0)}</strong>` },
                ], sales.items || sales.salesItems || [], { emptyMessage: 'No sales data for this date' }))}
            `;

            document.getElementById('salesDate')?.addEventListener('change', async (e) => {
                try {
                    const dateRes = await HttpService.get(API.hotel.sales.dailySummaryDate(e.target.value));
                    if (dateRes.ok) {
                        const s = dateRes.data.data || dateRes.data || {};
                        const grid = container.querySelector('.stats-grid');
                        if (grid) {
                            grid.innerHTML = `
                                ${UI.statCard('cash-coin', 'Total Sales', UI.money(s.totalSales || s.total_sales || 0), 'bg-success-soft')}
                                ${UI.statCard('receipt', 'Orders', s.totalOrders || s.total_orders || 0, 'bg-primary-soft')}
                                ${UI.statCard('phone', 'M-Pesa', UI.money(s.mpesa || s.mpesaTotal || 0), 'bg-info-soft')}
                                ${UI.statCard('wallet2', 'Cash', UI.money(s.cash || s.cashTotal || 0), 'bg-warning-soft')}
                            `;
                        }
                    }
                } catch (_) {}
            });
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load sales data.</div>';
        }
    },

    async renderPrintQueue(container) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.hotel.print.pending);
            const pending = res.ok ? (res.data.data || res.data || []) : [];

            container.innerHTML = `
                <div class="page-toolbar">
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel')"><i class="bi bi-grid"></i> Tables</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="Router.navigate('#/hotel?view=sales')"><i class="bi bi-graph-up"></i> Sales</button>
                        <button class="btn btn-sm btn-outline-secondary active"><i class="bi bi-printer"></i> Print Queue</button>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="HotelPage.renderPrintQueue(document.getElementById('pageContent'))"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
                </div>
                ${UI.card('Pending Print Jobs', UI.table([
                    { key: 'id', label: '#', render: r => `<strong>#${r.id}</strong>` },
                    { key: 'type', label: 'Type', render: r => UI.badge(r.type || 'order', 'primary') },
                    { key: 'table', label: 'Table', render: r => UI.escapeHtml(r.table_name || r.tableName || '--') },
                    { key: 'created', label: 'Created', render: r => UI.formatDateTime(r.createdAt || r.created_at) },
                ], Array.isArray(pending) ? pending : [], {
                    emptyMessage: 'No pending print jobs',
                    actions: row => `<button class="btn btn-sm btn-success" onclick="HotelPage.acknowledgePrint(${row.id})"><i class="bi bi-check"></i> Done</button>`
                }))}
            `;
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load print queue.</div>';
        }
    },

    async acknowledgePrint(id) {
        try {
            const res = await HttpService.post(API.hotel.print.acknowledge, { id: id });
            if (res.ok) {
                UI.toast('Print job acknowledged', 'success');
                this.renderPrintQueue(document.getElementById('pageContent'));
            } else {
                UI.toast(res.data.message || 'Failed', 'danger');
            }
        } catch (err) { UI.toast('Network error', 'danger'); }
    },
};
