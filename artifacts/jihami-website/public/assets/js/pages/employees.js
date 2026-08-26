/**
 * Jihami - Employees Page
 * List, Register, Suspend/Activate. Matches Flutter EmployeeListScreen.
 */

const EmployeesPage = {
    employees: [],

    async render(container) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.employees.list);
            this.employees = res.ok ? (res.data.data || res.data || []) : [];
            if (!Array.isArray(this.employees)) this.employees = [];
            this.renderList(container);
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load employees.</div>';
        }
    },

    renderList(container) {
        const user = TokenManager.getUser();
        const isAdmin = user && (user.grantLevel === 1 || user.grantLevel === '1');

        const tableHtml = UI.table([
            { key: 'name', label: 'Name', render: r => `<strong>${UI.escapeHtml((r.firstName || '') + ' ' + (r.lastName || ''))}</strong>` },
            { key: 'email', label: 'Email', render: r => UI.escapeHtml(r.email || '--') },
            { key: 'phone', label: 'Phone', render: r => UI.escapeHtml(r.phoneNumber || r.phone || '--') },
            { key: 'role', label: 'Role', render: r => UI.badge(r.role || 'Employee', 'primary') },
            { key: 'status', label: 'Status', render: r => r.suspended ? UI.badge('Suspended', 'danger') : UI.badge('Active', 'success') },
        ], this.employees, {
            emptyMessage: 'No employees found',
            actions: isAdmin ? (row => `
                <button class="btn btn-sm btn-outline-${row.suspended ? 'success' : 'warning'}" onclick="EmployeesPage.toggleSuspend(${row.id}, ${!!row.suspended})">
                    <i class="bi bi-${row.suspended ? 'check-circle' : 'pause-circle'}"></i> ${row.suspended ? 'Activate' : 'Suspend'}
                </button>`) : null
        });

        container.innerHTML = UI.pageCard({
            icon: 'person-badge', color: '#6366f1',
            title: 'Employees', subtitle: 'Team members and access roles',
            count: this.employees.length,
            filterHtml: `<div class="toolbar-search"><i class="bi bi-search"></i><input type="text" id="empSearch" class="form-control form-control-sm" placeholder="Search employees..."></div>`,
            actionHtml: isAdmin ? `<button class="btn btn-primary btn-sm" onclick="EmployeesPage.showRegisterModal()"><i class="bi bi-person-plus"></i> Register Employee</button>` : '',
        }, tableHtml);

        document.getElementById('empSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = this.employees.filter(emp => {
                const name = ((emp.firstName || '') + ' ' + (emp.lastName || '')).toLowerCase();
                return name.includes(q) || (emp.email || '').toLowerCase().includes(q);
            });
            const body = container.querySelector('.card-body-custom');
            if (body) {
                body.innerHTML = UI.table([
                    { key: 'name', label: 'Name', render: r => `<strong>${UI.escapeHtml((r.firstName || '') + ' ' + (r.lastName || ''))}</strong>` },
                    { key: 'email', label: 'Email', render: r => UI.escapeHtml(r.email || '--') },
                    { key: 'phone', label: 'Phone', render: r => UI.escapeHtml(r.phoneNumber || r.phone || '--') },
                    { key: 'role', label: 'Role', render: r => UI.badge(r.role || 'Employee', 'primary') },
                    { key: 'status', label: 'Status', render: r => r.suspended ? UI.badge('Suspended', 'danger') : UI.badge('Active', 'success') },
                ], filtered, { emptyMessage: 'No employees match your search' });
            }
        });
    },

    showRegisterModal() {
        const modalHtml = `
            <div class="modal fade show" id="empModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">Register Employee</h5>
                            <button type="button" class="btn-close" onclick="document.getElementById('empModal').remove()"></button>
                        </div>
                        <form id="empForm">
                            <div class="modal-body">
                                <div class="row g-3">
                                    <div class="col-6">${UI.formGroup('First Name', UI.input('empFirst', 'text', 'First name', '', 'required'), 'empFirst')}</div>
                                    <div class="col-6">${UI.formGroup('Last Name', UI.input('empLast', 'text', 'Last name', '', 'required'), 'empLast')}</div>
                                    <div class="col-12">${UI.formGroup('Email', UI.input('empEmail', 'email', 'employee@example.com', '', 'required'), 'empEmail')}</div>
                                    <div class="col-12">${UI.formGroup('Phone Number', UI.input('empPhone', 'tel', '+254...', ''), 'empPhone')}</div>
                                    <div class="col-12">${UI.formGroup('Password', UI.input('empPassword', 'password', 'Temporary password', '', 'required minlength="6"'), 'empPassword')}</div>
                                    <div class="col-12">${UI.formGroup('Role', UI.select('empRole', [
                                        { value: 'employee', label: 'Employee' },
                                        { value: 'manager', label: 'Manager' },
                                    ], 'employee'), 'empRole')}</div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('empModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        document.getElementById('empModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('empForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                firstName: document.getElementById('empFirst').value,
                lastName: document.getElementById('empLast').value,
                email: document.getElementById('empEmail').value,
                phoneNumber: document.getElementById('empPhone').value,
                password: document.getElementById('empPassword').value,
                role: document.getElementById('empRole').value,
            };
            try {
                const res = await HttpService.post(API.employees.register, payload);
                document.getElementById('empModal')?.remove();
                if (res.ok) {
                    UI.toast('Employee registered!', 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || 'Failed to register employee', 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },

    async toggleSuspend(id, isSuspended) {
        const action = isSuspended ? 'activate' : 'suspend';
        UI.confirm(`${isSuspended ? 'Activate' : 'Suspend'} Employee`, `Are you sure you want to ${action} this employee?`, async () => {
            try {
                const endpoint = isSuspended ? API.employees.action(id, 'activate') : API.employees.action(id, 'suspend');
                const res = await HttpService.put(endpoint, {});
                if (res.ok) {
                    UI.toast(`Employee ${action}d successfully`, 'success');
                    this.render(document.getElementById('pageContent'));
                } else {
                    UI.toast(res.data.message || `Failed to ${action} employee`, 'danger');
                }
            } catch (err) {
                UI.toast('Network error', 'danger');
            }
        });
    },
};
