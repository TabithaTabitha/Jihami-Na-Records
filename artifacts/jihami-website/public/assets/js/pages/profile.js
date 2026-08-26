/**
 * Jihami - Profile & Settings Page
 * View/edit business profile. Matches Flutter ProfileScreen.
 */

const ProfilePage = {
    async render(container) {
        container.innerHTML = UI.loader();
        try {
            const res = await HttpService.get(API.business.profile);
            const profile = res.ok ? (res.data.data || res.data) : null;
            const user = TokenManager.getUser();

            container.innerHTML = `
                <div class="page-toolbar">
                    <h6 class="mb-0"><i class="bi bi-person-circle"></i> Profile & Settings</h6>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        ${UI.card('Account Info', `
                            <div class="text-center mb-3">
                                <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width:80px;height:80px;font-size:2rem">
                                    ${(user?.name || 'U')[0].toUpperCase()}
                                </div>
                            </div>
                            <div class="mb-2"><strong>Name:</strong> ${UI.escapeHtml(user?.name || '--')}</div>
                            <div class="mb-2"><strong>Email:</strong> ${UI.escapeHtml(user?.email || '--')}</div>
                            <div class="mb-2"><strong>Role:</strong> ${UI.badge(user?.role || 'User', 'primary')}</div>
                            <div class="mb-2"><strong>Grant Level:</strong> ${user?.grantLevel === 1 || user?.grantLevel === '1' ? 'Admin' : user?.grantLevel === 2 || user?.grantLevel === '2' ? 'Manager' : 'Employee'}</div>
                            <hr>
                            <button class="btn btn-outline-primary btn-sm w-100 mb-2" onclick="ProfilePage.showChangePasswordModal()"><i class="bi bi-key"></i> Change Password</button>
                            <button class="btn btn-outline-danger btn-sm w-100" onclick="logout()"><i class="bi bi-box-arrow-right"></i> Logout</button>
                        `)}
                    </div>
                    <div class="col-md-8">
                        ${UI.card('Business Profile', `
                            <form id="profileForm" class="row g-3">
                                <div class="col-md-6">${UI.formGroup('Business Name', UI.input('bizName', 'text', 'Business name', profile?.business_name || profile?.businessName || '', 'required'), 'bizName')}</div>
                                <div class="col-md-6">${UI.formGroup('Business Address', UI.input('bizAddress', 'text', 'Business address', profile?.business_address || profile?.businessAddress || ''), 'bizAddress')}</div>
                                <div class="col-md-6">${UI.formGroup('KRA PIN', UI.input('bizKra', 'text', 'KRA PIN', profile?.kra_pin || profile?.kraPin || ''), 'bizKra')}</div>
                                <div class="col-md-6">${UI.formGroup('Phone', UI.input('bizPhone', 'tel', 'Phone number', profile?.phone || profile?.phoneNumber || ''), 'bizPhone')}</div>
                                <div class="col-md-6">${UI.formGroup('Email', UI.input('bizEmail', 'email', 'Business email', profile?.email || ''), 'bizEmail')}</div>
                                <div class="col-md-6">${UI.formGroup('P.O. Box', UI.input('bizPO', 'text', 'P.O. Box', profile?.pobox || profile?.po_box || ''), 'bizPO')}</div>
                                <div class="col-md-6">
                                    <div class="form-check form-switch mt-3">
                                        <input class="form-check-input" type="checkbox" id="bizIsRestaurant" ${profile?.is_restaurant || profile?.isRestaurant ? 'checked' : ''}>
                                        <label class="form-check-label" for="bizIsRestaurant">Restaurant / Hotel Business</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    ${UI.formGroup('Business Logo', '<input type="file" class="form-control" id="bizLogo" accept="image/*">', 'bizLogo')}
                                </div>
                                <div class="col-12">
                                    <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg"></i> Save Changes</button>
                                </div>
                            </form>
                        `)}
                    </div>
                </div>
            `;

            document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = {
                    business_name: document.getElementById('bizName').value,
                    business_address: document.getElementById('bizAddress').value,
                    kra_pin: document.getElementById('bizKra').value,
                    phone: document.getElementById('bizPhone').value,
                    email: document.getElementById('bizEmail').value,
                    pobox: document.getElementById('bizPO').value,
                    is_restaurant: document.getElementById('bizIsRestaurant').checked,
                };
                try {
                    const saveRes = await HttpService.put(API.business.profile, payload);
                    if (saveRes.ok) {
                        UI.toast('Profile updated!', 'success');

                        // Upload logo if selected
                        const logoFile = document.getElementById('bizLogo').files[0];
                        if (logoFile) {
                            const formData = new FormData();
                            formData.append('logo', logoFile);
                            await HttpService.postMultipart(API.business.uploadLogo, formData);
                        }
                    } else {
                        UI.toast(saveRes.data.message || 'Failed to update profile', 'danger');
                    }
                } catch (err) { UI.toast('Network error', 'danger'); }
            });
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load profile.</div>';
        }
    },

    showChangePasswordModal() {
        const modal = `
            <div class="modal fade show" id="pwModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">Change Password</h5>
                            <button type="button" class="btn-close" onclick="document.getElementById('pwModal').remove()"></button></div>
                        <form id="pwForm">
                            <div class="modal-body">
                                ${UI.formGroup('Current Password', UI.input('pwCurrent', 'password', 'Current password', '', 'required'), 'pwCurrent')}
                                ${UI.formGroup('New Password', UI.input('pwNew', 'password', 'New password', '', 'required minlength="6"'), 'pwNew')}
                                ${UI.formGroup('Confirm Password', UI.input('pwConfirm', 'password', 'Confirm new password', '', 'required'), 'pwConfirm')}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('pwModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Change Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
        document.getElementById('pwModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modal);

        document.getElementById('pwForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPw = document.getElementById('pwNew').value;
            const confirm = document.getElementById('pwConfirm').value;
            if (newPw !== confirm) return UI.toast('Passwords do not match', 'warning');

            try {
                const res = await HttpService.post(API.user.changePassword, {
                    currentPassword: document.getElementById('pwCurrent').value,
                    newPassword: newPw,
                });
                document.getElementById('pwModal')?.remove();
                if (res.ok) {
                    UI.toast('Password changed!', 'success');
                } else {
                    UI.toast(res.data.message || 'Failed to change password', 'danger');
                }
            } catch (err) { UI.toast('Network error', 'danger'); }
        });
    },
};
