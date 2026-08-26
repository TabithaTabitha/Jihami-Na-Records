/**
 * Jihami - Categories Page
 * CRUD for transaction categories. Matches Flutter CategoryManagementScreen.
 */

const CategoriesPage = {
    categories: [],

    async render(container) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.categories.list);
            this.categories = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.categories)) this.categories = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load categories.</div>';
        }
    },

    renderList(container) {
        const tableHtml = UI.table([
            { key: 'name', label: 'Name', render: r => `<strong>${UI.escapeHtml(r.name || '')}</strong>` },
            { key: 'description', label: 'Description', render: r => UI.escapeHtml(r.description || '--') },
            { key: 'type', label: 'Type', render: r => r.type === 'income' ? UI.badge('Income', 'success') : UI.badge('Expense', 'danger') },
        ], this.categories, {
            emptyMessage: 'No categories found. Add your first category!',
            actions: row => `
                <button class="btn btn-sm btn-outline-primary me-1" onclick="CategoriesPage.showEditModal(${row.id})"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="CategoriesPage.deleteCategory(${row.id})"><i class="bi bi-trash"></i></button>`
        });

        container.innerHTML = UI.pageCard({
            icon: 'tag', color: '#f97316',
            title: 'Categories', subtitle: 'Transaction classification labels',
            count: this.categories.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="catSearch" class="form-control form-control-sm" placeholder="Search categories..."></div>`,
            actionHtml: `<button class="btn btn-primary btn-sm" onclick="CategoriesPage.showAddModal()"><i class="bi bi-plus-lg"></i> Add Category</button>`,
        }, tableHtml);

        document.getElementById('catSearch')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = this.categories.filter(c => (c.name || '').toLowerCase().includes(query));
            const tbody = container.querySelector('.card-body-custom');
            if (tbody) {
                tbody.innerHTML = UI.table([
                    { key: 'name', label: 'Name', render: r => `<strong>${UI.escapeHtml(r.name || '')}</strong>` },
                    { key: 'description', label: 'Description', render: r => UI.escapeHtml(r.description || '--') },
                    { key: 'type', label: 'Type', render: r => r.type === 'income' ? UI.badge('Income', 'success') : UI.badge('Expense', 'danger') },
                ], filtered, {
                    emptyMessage: 'No categories match your search',
                    actions: row => `
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="CategoriesPage.showEditModal(${row.id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="CategoriesPage.deleteCategory(${row.id})"><i class="bi bi-trash"></i></button>`
                });
            }
        });
    },

    showAddModal() {
        this._showModal('Add Category', null);
    },

    showEditModal(id) {
        const cat = this.categories.find(c => c.id === id);
        if (cat) this._showModal('Edit Category', cat);
    },

    _showModal(title, editData) {
        const isEdit = !!editData;
        const modalHtml = `
            <div class="modal fade show" id="catModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" onclick="document.getElementById('catModal').remove()"></button>
                        </div>
                        <form id="catForm">
                            <div class="modal-body">
                                ${UI.formGroup('Category Name', UI.input('catName', 'text', 'e.g. Food & Beverages', editData?.name || '', 'required'), 'catName')}
                                ${UI.formGroup('Description', UI.textarea('catDesc', 'Optional description...', editData?.description || '', 2), 'catDesc')}
                                ${UI.formGroup('Type', UI.select('catType', [
                                    { value: 'income', label: 'Income' },
                                    { value: 'expense', label: 'Expense' },
                                ], editData?.type || 'expense'), 'catType')}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('catModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        // Remove existing modal if any
        document.getElementById('catModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('catForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('catName').value,
                description: document.getElementById('catDesc').value,
                type: document.getElementById('catType').value,
            };
            try {
                const res = isEdit
                    ? await HttpService.put(API.categories.update(editData.id), payload)
                    : await HttpService.post(API.categories.create, payload);
                document.getElementById('catModal')?.remove();
                if (res.ok) {
                    UI.toast(isEdit ? 'Category updated!' : 'Category created!', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || 'Failed to save category', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    deleteCategory(id) {
        UI.confirm('Delete Category', 'Are you sure? Transactions using this category won\'t be affected.', async () => {
            try {
                const res = await HttpService.del(API.categories.delete(id));
                if (res.ok) {
                    UI.toast('Category deleted', 'success');
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
