/**
 * Jihami Na Records - API Constants
 * All endpoints mirrored from the Flutter mobile app (url_constants.dart + services).
 * Base URL: https://jihami.co.ke
 */

// Using relative URLs so the Vite dev proxy can forward requests to
// https://jihami.co.ke server-side (avoids browser CORS blocks).
const API_BASE_URL = '';

const API = {

    // ─── Authentication ─────────────────────────────────────────────────────
    auth: {
        login:                  `${API_BASE_URL}/login`,
        signup:                 `${API_BASE_URL}/signup`,
        registerBusiness:       `${API_BASE_URL}/auth/register-business`,
        authenticate:           `${API_BASE_URL}/authenticate`,
        forgotPassword:         `${API_BASE_URL}/user/reset-password`,
        validateResetPassword:  `${API_BASE_URL}/auth/validate-reset-password`,
    },

    // ─── User Profile ───────────────────────────────────────────────────────
    user: {
        profile:            `${API_BASE_URL}/user/profile`,
        update:             `${API_BASE_URL}/user/update`,
        delete:             `${API_BASE_URL}/user/delete`,
        suspend:            `${API_BASE_URL}/user/suspend`,
        activate:           `${API_BASE_URL}/user/activate`,
        resetPassword:      `${API_BASE_URL}/user/reset-password`,
        changePassword:     `${API_BASE_URL}/user/change-password`,
        changeEmail:        `${API_BASE_URL}/user/change-email`,
        changePhone:        `${API_BASE_URL}/user/change-phone`,
    },

    // ─── Business ───────────────────────────────────────────────────────────
    business: {
        profile:            `${API_BASE_URL}/api/business/profile`,
        uploadLogo:         `${API_BASE_URL}/api/business/upload-logo`,
        logo:               `${API_BASE_URL}/api/business/logo`,
    },

    // ─── Transactions ───────────────────────────────────────────────────────
    transactions: {
        list:               `${API_BASE_URL}/transactions`,
        create:             `${API_BASE_URL}/transactions`,
        get:                (id) => `${API_BASE_URL}/transactions/${id}`,
        update:             (id) => `${API_BASE_URL}/transactions/${id}`,
        delete:             (id) => `${API_BASE_URL}/transactions/${id}`,
        uploads:            `${API_BASE_URL}/uploads`,
    },

    // ─── Categories ─────────────────────────────────────────────────────────
    categories: {
        list:               `${API_BASE_URL}/categories`,
        create:             `${API_BASE_URL}/categories`,
        update:             (id) => `${API_BASE_URL}/categories/${id}`,
        delete:             (id) => `${API_BASE_URL}/categories/${id}`,
    },

    // ─── Employees ──────────────────────────────────────────────────────────
    employees: {
        list:               `${API_BASE_URL}/hr/employees`,
        register:           `${API_BASE_URL}/hr/employee/register`,
        get:                (id) => `${API_BASE_URL}/hr/employees?id=${id}`,
        action:             (id, action) => `${API_BASE_URL}/hr/employees?id=${id}&action=${action}`,
    },

    // ─── Reports ────────────────────────────────────────────────────────────
    reports: {
        transactions:       (startDate, endDate) => `${API_BASE_URL}/reports/transactions?startDate=${startDate}&endDate=${endDate}`,
    },

    // ─── Wcol: Invoices ─────────────────────────────────────────────────────
    wcolInvoices: {
        list:        (filters = {}) => {
            const p = new URLSearchParams();
            if (filters.customer_id) p.set('customer_id', filters.customer_id);
            if (filters.status)      p.set('status',      filters.status);
            if (filters.cycle_type)  p.set('cycle_type',  filters.cycle_type);
            if (filters.start_date)  p.set('start_date',  filters.start_date);
            if (filters.end_date)    p.set('end_date',    filters.end_date);
            if (filters.page)        p.set('page',        filters.page);
            if (filters.limit)       p.set('limit',       filters.limit);
            const qs = p.toString();
            return `${API_BASE_URL}/api/wasteCol/invoices${qs ? '?' + qs : ''}`;
        },
        get:         (id)    => `${API_BASE_URL}/api/wasteCol/invoices/${id}`,
        update:      (id)    => `${API_BASE_URL}/api/wasteCol/invoices/${id}`,
        status:              `${API_BASE_URL}/api/wasteCol/invoices/status`,
        upcoming:            `${API_BASE_URL}/api/wasteCol/invoices/upcoming`,
        sync:                `${API_BASE_URL}/api/wasteCol/invoices/sync`,
        checkOverdue:        `${API_BASE_URL}/api/wasteCol/invoices/check-overdue`,
    },

    // ─── Wcol: Payments ─────────────────────────────────────────────────────
    wcolPayments: {
        list:   (filters = {}) => {
            const p = new URLSearchParams();
            if (filters.customer_id)    p.set('customer_id',    filters.customer_id);
            if (filters.payment_method) p.set('payment_method', filters.payment_method);
            if (filters.start_date)     p.set('start_date',     filters.start_date);
            if (filters.end_date)       p.set('end_date',       filters.end_date);
            const qs = p.toString();
            return `${API_BASE_URL}/api/wasteCol/payments${qs ? '?' + qs : ''}`;
        },
        get:    (id) => `${API_BASE_URL}/api/wasteCol/payments/${id}`,
        create: `${API_BASE_URL}/api/wasteCol/payments`,
        update: (id) => `${API_BASE_URL}/api/wasteCol/payments/${id}`,
        delete: (id) => `${API_BASE_URL}/api/wasteCol/payments/${id}`,
    },

    // ─── Wcol: Cycles (collection plans) ────────────────────────────────────
    wcolCycles: {
        list: `${API_BASE_URL}/api/wasteCol/collections/cycles`,
    },

    // ─── Wcol: Collections ──────────────────────────────────────────────────
    wcolCollections: {
        list:   (month, year, customerId, status) => {
            const p = new URLSearchParams({ month, year });
            if (customerId) p.set('customer_id', customerId);
            if (status)     p.set('status', status);
            return `${API_BASE_URL}/api/wasteCol/collections?${p.toString()}`;
        },
        create: `${API_BASE_URL}/api/wasteCol/collections`,
        get:    (id) => `${API_BASE_URL}/api/wasteCol/collections/${id}`,
        update: (id) => `${API_BASE_URL}/api/wasteCol/collections/${id}`,
        delete: (id) => `${API_BASE_URL}/api/wasteCol/collections/${id}`,
    },

    // ─── Wcol: Waste Collection Customers ───────────────────────────────────
    wcolCustomers: {
        list:               `${API_BASE_URL}/api/wasteCol/customers`,
        create:             `${API_BASE_URL}/api/wasteCol/customers`,
        get:                (id) => `${API_BASE_URL}/api/wasteCol/customers/${id}`,
        update:             (id) => `${API_BASE_URL}/api/wasteCol/customers/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/wasteCol/customers/${id}`,
        search:             (q, status, type) => {
            const p = new URLSearchParams();
            if (q)      p.set('search', q);
            if (status) p.set('status', status);
            if (type)   p.set('customer_type', type);
            return `${API_BASE_URL}/api/wasteCol/customers?${p.toString()}`;
        },
    },

    // ─── POS: Customers ─────────────────────────────────────────────────────
    customers: {
        list:               `${API_BASE_URL}/api/pos/customers`,
        create:             `${API_BASE_URL}/api/pos/customers`,
        get:                (id) => `${API_BASE_URL}/api/pos/customers/${id}`,
        update:             (id) => `${API_BASE_URL}/api/pos/customers/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/pos/customers/${id}`,
        search:             (query) => `${API_BASE_URL}/api/pos/customers?search=${encodeURIComponent(query)}`,
        credit:             (id) => `${API_BASE_URL}/api/customers/${id}/credit`,
        statement:          (customerId, month, year) => `${API_BASE_URL}/api/payments/statement/${customerId}?month=${month}&year=${year}`,
    },

    // ─── POS: Items ─────────────────────────────────────────────────────────
    items: {
        list:               `${API_BASE_URL}/api/pos/items`,
        create:             `${API_BASE_URL}/api/pos/items`,
        get:                (id) => `${API_BASE_URL}/api/pos/items/${id}`,
        update:             (id) => `${API_BASE_URL}/api/pos/items/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/pos/items/${id}`,
        search:             (query) => `${API_BASE_URL}/api/pos/items?search=${encodeURIComponent(query)}`,
    },

    // ─── POS: Invoices ──────────────────────────────────────────────────────
    invoices: {
        list:               `${API_BASE_URL}/api/pos/invoices`,
        create:             `${API_BASE_URL}/api/pos/invoices`,
        get:                (id) => `${API_BASE_URL}/api/pos/invoices/${id}`,
        update:             (id) => `${API_BASE_URL}/api/pos/invoices/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/pos/invoices/${id}`,
        byCustomer:         (customerId) => `${API_BASE_URL}/api/pos/invoices?customer_id=${customerId}`,
        search:             (query) => `${API_BASE_URL}/api/pos/invoices?search=${encodeURIComponent(query)}`,
        dailyPayments:      (date) => `${API_BASE_URL}/api/invoices/payments/daily?date=${encodeURIComponent(date)}`,
    },

    // ─── POS: Quotations ────────────────────────────────────────────────────
    quotations: {
        list:               `${API_BASE_URL}/api/pos/invoices/quotations`,
        get:                (id) => `${API_BASE_URL}/api/pos/invoices/quotations/${id}`,
    },

    // ─── POS: Credit Notes ──────────────────────────────────────────────────
    creditNotes: {
        list:               (page = 1, limit = 20) => `${API_BASE_URL}/api/pos/invoices/creditnote?page=${page}&limit=${limit}`,
        create:             `${API_BASE_URL}/api/pos/invoices/creditnote`,
        get:                (id) => `${API_BASE_URL}/api/pos/invoices/creditnote/${id}`,
        update:             (id) => `${API_BASE_URL}/api/pos/invoices/creditnote/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/pos/invoices/creditnote/${id}`,
        byInvoice:          (invoiceId) => `${API_BASE_URL}/api/pos/invoices/creditnote?invoice_id=${invoiceId}`,
    },

    // ─── POS: Payments ──────────────────────────────────────────────────────
    payments: {
        list:               `${API_BASE_URL}/api/payments`,
        create:             `${API_BASE_URL}/api/payments`,
        get:                (id) => `${API_BASE_URL}/api/payments/${id}`,
        getByRef:           (refCode) => `${API_BASE_URL}/api/payments/ref/${refCode}`,
        update:             (id) => `${API_BASE_URL}/api/payments/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/payments/${id}`,
    },

    // ─── Procurement: Suppliers ──────────────────────────────────────────────
    suppliers: {
        list:               `${API_BASE_URL}/api/suppliers`,
        create:             `${API_BASE_URL}/api/suppliers`,
        get:                (id) => `${API_BASE_URL}/api/suppliers/${id}`,
        update:             (id) => `${API_BASE_URL}/api/suppliers/${id}`,
        delete:             (id) => `${API_BASE_URL}/api/suppliers/${id}`,
    },

    // ─── Inventory: Stock Receipts ────────────────────────────────────────────
    stockReceipts: {
        list:               `${API_BASE_URL}/api/stocks/receipts`,
        get:                (id) => `${API_BASE_URL}/api/stocks/receipts/${id}`,
        receive:            `${API_BASE_URL}/api/stocks/receive`,
    },

    stockTake: {
        report: (month) => `${API_BASE_URL}/api/stocktake?month=${encodeURIComponent(month)}`,
    },

    // ─── Currencies ─────────────────────────────────────────────────────────
    currencies: {
        list:               `${API_BASE_URL}/api/invoices/currencies`,
    },

    // ─── Subscription & M-Pesa ──────────────────────────────────────────────
    subscription: {
        plans:              `${API_BASE_URL}/plans`,
        initiatePayment:    `${API_BASE_URL}/subscription/stk`,
        paymentCallback:    `${API_BASE_URL}/api/mpesa/confirm`,
        status:             `${API_BASE_URL}/subscription/status`,
        history:            `${API_BASE_URL}/subscription/stk/history`,
        cancel:             `${API_BASE_URL}/subscription/stk/cancel`,
    },

    // ─── Hotel: Tables ──────────────────────────────────────────────────────
    hotel: {
        tables: {
            list:           `${API_BASE_URL}/api/hotel/tables`,
            create:         `${API_BASE_URL}/api/hotel/tables`,
            get:            (id) => `${API_BASE_URL}/api/hotel/tables/${id}`,
            update:         (id) => `${API_BASE_URL}/api/hotel/tables/${id}`,
            delete:         (id) => `${API_BASE_URL}/api/hotel/tables/${id}`,
            search:         (query) => `${API_BASE_URL}/api/hotel/tables?search=${encodeURIComponent(query)}`,
            orders:         (tableId) => `${API_BASE_URL}/api/hotel/tables/${tableId}/orders`,
        },

        // ─── Hotel: Items ───────────────────────────────────────────────
        items: {
            list:           `${API_BASE_URL}/api/hotel/items`,
        },

        // ─── Hotel: Orders ──────────────────────────────────────────────
        orders: {
            list:           `${API_BASE_URL}/api/hotel/orders`,
            create:         `${API_BASE_URL}/api/hotel/orders`,
            get:            (id) => `${API_BASE_URL}/api/hotel/orders/${id}`,
            update:         (id) => `${API_BASE_URL}/api/hotel/orders/${id}`,
            delete:         (id) => `${API_BASE_URL}/api/hotel/orders/${id}`,
            items:          (orderId) => `${API_BASE_URL}/api/hotel/orders/${orderId}/order-items`,
            lineItems:      (orderId) => `${API_BASE_URL}/api/hotel/orders/${orderId}/line-items`,
            generateBill:   (orderId) => `${API_BASE_URL}/api/hotel/orders/${orderId}/bill`,
            clearBill:      (billNo) => `${API_BASE_URL}/api/hotel/orders/${billNo}/clear`,
        },

        // ─── Hotel: Order Items ─────────────────────────────────────────
        orderItems: {
            base:           `${API_BASE_URL}/api/hotel/orders/items`,
            update:         (id) => `${API_BASE_URL}/api/hotel/orders/items/${id}`,
            delete:         (id) => `${API_BASE_URL}/api/hotel/orders/items/${id}`,
        },

        // ─── Hotel: Print Queue ─────────────────────────────────────────
        print: {
            pending:        `${API_BASE_URL}/api/hotel/print/pending`,
            acknowledge:    `${API_BASE_URL}/api/hotel/print/acknowledge`,
        },

        // ─── Hotel: Sales ───────────────────────────────────────────────
        sales: {
            dailySummary:       `${API_BASE_URL}/api/hotel/sales/daily-summary`,
            dailySummaryDate:   (date) => `${API_BASE_URL}/api/hotel/sales/daily-summary?date=${date}`,
            itemsForRange:      (startDate, endDate) => `${API_BASE_URL}/api/hotel/sales/items?start_date=${startDate}&end_date=${endDate}`,
        },
    },

    // ─── Posts / Social (defined but unused in mobile app) ──────────────────
    posts: {
        list:               `${API_BASE_URL}/posts`,
        create:             `${API_BASE_URL}/posts/create`,
        delete:             `${API_BASE_URL}/posts/delete`,
        like:               `${API_BASE_URL}/posts/like`,
        comment:            `${API_BASE_URL}/posts/comment`,
    },

    // ─── WebSocket ──────────────────────────────────────────────────────────
    websocket: {
        transactionUpdates: `wss://jihami.co.ke/transaction-updates`,
    },
};
