/**
 * Jihami - Subscription Page
 * View plans, initiate M-Pesa STK push. Matches Flutter SubscriptionScreen.
 */

const SubscriptionPage = {
    plans: [],

    async render(container) {
        container.innerHTML = UI.loader();
        try {
            const [plansRes, statusRes] = await Promise.allSettled([
                HttpService.get(API.subscription.plans),
                HttpService.get(API.subscription.status),
            ]);
            this.plans = plansRes.status === 'fulfilled' && plansRes.value.ok ? (plansRes.value.data.data || plansRes.value.data || []) : [];
            const status = statusRes.status === 'fulfilled' && statusRes.value.ok ? (statusRes.value.data.data || statusRes.value.data) : null;

            const currentPlan = status?.plan || status?.planName || 'Free';
            const expiry = status?.expiresAt || status?.expires_at;

            container.innerHTML = `
                <div class="page-toolbar">
                    <h6 class="mb-0"><i class="bi bi-credit-card"></i> Subscription</h6>
                </div>
                ${status ? `
                    <div class="alert alert-${status.active || status.isActive ? 'success' : 'warning'} mb-3">
                        <strong>Current Plan:</strong> ${UI.escapeHtml(currentPlan)} |
                        <strong>Status:</strong> ${status.active || status.isActive ? 'Active' : 'Expired'} 
                        ${expiry ? `| <strong>Expires:</strong> ${UI.formatDate(expiry)}` : ''}
                    </div>
                ` : ''}
                <div class="row g-3">
                    ${(Array.isArray(this.plans) ? this.plans : []).map(plan => `
                        <div class="col-md-4">
                            <div class="card h-100 ${plan.recommended ? 'border-primary' : ''}">
                                ${plan.recommended ? '<div class="card-header bg-primary text-white text-center fw-bold">Recommended</div>' : ''}
                                <div class="card-body text-center">
                                    <h5 class="card-title">${UI.escapeHtml(plan.name || plan.planName)}</h5>
                                    <div class="my-3">
                                        <span class="fs-2 fw-bold">${UI.money(plan.price || plan.amount || 0)}</span>
                                        <span class="text-muted">/ ${UI.escapeHtml(plan.duration || plan.period || 'month')}</span>
                                    </div>
                                    <ul class="list-unstyled text-start mb-4">
                                        ${(plan.features || []).map(f => `<li class="mb-1"><i class="bi bi-check-circle text-success"></i> ${UI.escapeHtml(f)}</li>`).join('')}
                                    </ul>
                                    <button class="btn btn-primary w-100" onclick="SubscriptionPage.subscribe(${JSON.stringify(plan.id).replace(/"/g, '&quot;')})">
                                        <i class="bi bi-phone"></i> Pay via M-Pesa
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${this.plans.length === 0 ? '<div class="col-12 text-center text-muted">No subscription plans available.</div>' : ''}
                </div>
                <div class="mt-4">
                    ${UI.card('Payment History', '<div id="payHistoryContent">' + UI.loader() + '</div>')}
                </div>
            `;

            // Load payment history
            this.loadHistory();
        } catch (err) {
            container.innerHTML = '<div class="alert alert-danger">Failed to load subscription info.</div>';
        }
    },

    async loadHistory() {
        const histContainer = document.getElementById('payHistoryContent');
        if (!histContainer) return;
        try {
            const res = await HttpService.get(API.subscription.history);
            const history = res.ok ? (res.data.data || res.data || []) : [];
            histContainer.innerHTML = UI.table([
                { key: 'date', label: 'Date', render: r => UI.formatDate(r.createdAt || r.date) },
                { key: 'plan', label: 'Plan', render: r => UI.escapeHtml(r.planName || r.plan || '--') },
                { key: 'amount', label: 'Amount', class: 'text-end', render: r => UI.money(r.amount || 0) },
                { key: 'ref', label: 'M-Pesa Ref', render: r => UI.escapeHtml(r.mpesaRef || r.ref || '--') },
                { key: 'status', label: 'Status', render: r => r.status === 'success' || r.status === 'completed' ? UI.badge('Paid', 'success') : UI.badge(r.status || 'Pending', 'warning') },
            ], Array.isArray(history) ? history : [], { emptyMessage: 'No payment history' });
        } catch (err) {
            histContainer.innerHTML = '<p class="text-muted">Failed to load history.</p>';
        }
    },

    subscribe(planId) {
        const modal = `
            <div class="modal fade show" id="stkModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title">M-Pesa Payment</h5>
                            <button type="button" class="btn-close" onclick="document.getElementById('stkModal').remove()"></button></div>
                        <form id="stkForm">
                            <div class="modal-body">
                                <div class="alert alert-info"><i class="bi bi-info-circle"></i> An STK push will be sent to your phone. Enter your M-Pesa PIN to complete the payment.</div>
                                ${UI.formGroup('M-Pesa Phone Number', UI.input('stkPhone', 'tel', '254XXXXXXXXX', '', 'required pattern="254[0-9]{9}" title="Format: 254XXXXXXXXX"'), 'stkPhone')}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" onclick="document.getElementById('stkModal').remove()">Cancel</button>
                                <button type="submit" class="btn btn-success" id="stkSubmitBtn"><i class="bi bi-phone"></i> Send STK Push</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;
        document.getElementById('stkModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modal);

        document.getElementById('stkForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('stkSubmitBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

            try {
                const res = await HttpService.post(API.subscription.initiatePayment, {
                    planId: planId,
                    phone: document.getElementById('stkPhone').value,
                });
                document.getElementById('stkModal')?.remove();
                if (res.ok) {
                    UI.toast('STK push sent! Check your phone to enter the M-Pesa PIN.', 'success');
                } else {
                    UI.toast(res.data.message || 'Failed to initiate payment', 'danger');
                }
            } catch (err) {
                document.getElementById('stkModal')?.remove();
                UI.toast('Network error', 'danger');
            }
        });
    },
};
