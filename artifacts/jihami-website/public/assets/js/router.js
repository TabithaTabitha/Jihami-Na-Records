/**
 * Jihami Na Records - SPA Router
 * Hash-based routing for single-page dashboard.
 */

const Router = {
    routes: {},
    currentPage: null,

    /** Register a route handler */
    register(path, handler) {
        this.routes[path] = handler;
    },

    /** Initialize router, listen for hash changes */
    init() {
        window.addEventListener('hashchange', () => this.resolve());
        this.resolve();
    },

    /** Resolve current hash to a route */
    resolve() {
        const fullHash = window.location.hash.slice(1) || '/overview';
        // Separate path from query string
        const [hashPath] = fullHash.split('?');
        const path = hashPath || '/overview';

        // Find matching route: try exact match first, then first segment
        let matchedRoute = null;
        let matchedPage = path;

        if (this.routes[path]) {
            matchedRoute = this.routes[path];
            matchedPage = path;
        } else {
            // Try matching first segment (e.g. /credit-notes from /credit-notes?id=1)
            const segments = path.split('/').filter(Boolean);
            const basePath = '/' + segments[0];
            if (this.routes[basePath]) {
                matchedRoute = this.routes[basePath];
                matchedPage = basePath;
            }
        }

        // Update sidebar active state
        const pageName = matchedPage.slice(1); // remove leading /
        document.querySelectorAll('.nav-item[data-page]').forEach(el => {
            el.classList.toggle('active', el.dataset.page === pageName);
        });

        // Update page title
        const titles = {
            '/overview': 'Dashboard Overview',
            '/transactions': 'Transactions',
            '/invoices': 'Invoices',
            '/quotations': 'Quotations',
            '/customers': 'Customers',
            '/items': 'Inventory',
            '/stock-receipts': 'Stock Receiving',
            '/suppliers': 'Suppliers',
            '/payments': 'Payments',
            '/employees': 'Employees',
            '/reports': 'Reports',
            '/categories': 'Categories',
            '/credit-notes': 'Credit Notes',
            '/hotel': 'Hotel Management',
            '/wcol-customers':   'Wcol Customers',
            '/wcol-collections': 'Wcol Collections',
            '/wcol-payments':    'Wcol Payments',
            '/settings': 'Settings',
            '/profile': 'Profile',
        };

        const pageTitle = document.querySelector('.page-title');
        if (pageTitle && titles[matchedPage]) {
            pageTitle.textContent = titles[matchedPage];
        }

        if (matchedRoute) {
            this.currentPage = matchedPage;
            const contentArea = document.getElementById('pageContent');
            if (contentArea) {
                matchedRoute(contentArea);
            }
        }
    },

    /** Navigate programmatically */
    navigate(path) {
        window.location.hash = path;
    },
};
