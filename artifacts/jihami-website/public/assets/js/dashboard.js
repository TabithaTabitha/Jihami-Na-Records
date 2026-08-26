/**
 * Jihami Na Records - Dashboard Module
 * Initializes SPA routing and sidebar interactions.
 */

document.addEventListener('DOMContentLoaded', function () {
    // Auth guard — redirect to login if not authenticated
    if (!requireAuth()) return;

    const user = TokenManager.getUser();
    initDashboardUI(user);
    initSidebar();
    initRouter();
});

// ─── Dashboard UI Init ──────────────────────────────────────────────────────

function initDashboardUI(user) {
    if (!user) return;

    const displayName = user.name || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (userAvatar) userAvatar.textContent = initial;
    if (userName) userName.textContent = displayName;

    // Time-based greeting
    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        const hour = new Date().getHours();
        const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        greetingEl.textContent = `${period}, ${displayName}!`;
    }

    // Hide hotel section if isResturant is false in token
    const token = TokenManager.getToken();
    const payload = TokenManager.decodeToken(token);
    if (payload && payload.isResturant === false) {
        const hotelSection = document.getElementById('hotelNavSection');
        if (hotelSection) hotelSection.style.display = 'none';
    }

    // Wiring logout in user dropdown
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('logoutDropdown')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

// ─── SPA Router ─────────────────────────────────────────────────────────────

function initRouter() {
    const page = (mod) => (container) => mod.render(container);

    Router.register('/overview',     page(OverviewPage));
    Router.register('/transactions', page(TransactionsPage));
    Router.register('/categories',   page(CategoriesPage));
    Router.register('/employees',    page(EmployeesPage));
    Router.register('/customers',    page(CustomersPage));
    Router.register('/items',        page(ItemsPage));
    Router.register('/stock-take',    page(StockTakePage));
    Router.register('/stock-receipts', page(StockReceiptsPage));
    Router.register('/suppliers',    page(SuppliersPage));
    Router.register('/invoices',     page(InvoicesPage));
    Router.register('/quotations',   page(QuotationsPage));
    Router.register('/credit-notes', page(CreditNotesPage));
    Router.register('/payments',     page(PaymentsPage));
    Router.register('/hotel',        page(HotelPage));
    Router.register('/reports',      page(ReportsPage));
    Router.register('/profile',      page(ProfilePage));

    Router.init();
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const close = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }

    if (toggle) toggle.addEventListener('click', openSidebar);
    if (close) close.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Nav items: let hash routing handle active state via Router
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function () {
            // Close sidebar on mobile after navigation
            closeSidebar();
        });
    });
}
