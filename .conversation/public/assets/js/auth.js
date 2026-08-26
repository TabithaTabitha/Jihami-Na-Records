/**
 * Jihami Na Records - Authentication Module
 * Uses the shared API constants from api.js.
 */

// ─── Token Management ───────────────────────────────────────────────────────

const TokenManager = {
    setToken(token) {
        sessionStorage.setItem('jihami_token', token);
    },

    getToken() {
        return sessionStorage.getItem('jihami_token');
    },

    removeToken() {
        sessionStorage.removeItem('jihami_token');
        sessionStorage.removeItem('jihami_user');
    },

    decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            return payload;
        } catch {
            return null;
        }
    },

    isTokenValid() {
        const token = this.getToken();
        if (!token) return false;
        const payload = this.decodeToken(token);
        if (!payload || !payload.exp) return false;
        return (payload.exp * 1000) > Date.now();
    },

    getUserFromToken() {
        const token = this.getToken();
        if (!token) return null;
        const payload = this.decodeToken(token);
        if (!payload) return null;
        return {
            userId: payload.user_id,
            businessId: payload.business_id,
            name: payload.name,
            grantLevel: payload.grant_level,
            role: payload.role,
        };
    },

    setUser(user) {
        sessionStorage.setItem('jihami_user', JSON.stringify(user));
    },

    getUser() {
        const stored = sessionStorage.getItem('jihami_user');
        if (stored) return JSON.parse(stored);
        return this.getUserFromToken();
    },
};

// ─── UI Helpers ─────────────────────────────────────────────────────────────

function showAlert(elementId, message, type = 'danger') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.classList.remove('d-none');
    if (type === 'success') {
        setTimeout(() => el.classList.add('d-none'), 5000);
    }
}

function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('d-none');
}

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    if (loading) {
        btn.disabled = true;
        if (text) text.classList.add('d-none');
        if (loader) loader.classList.remove('d-none');
    } else {
        btn.disabled = false;
        if (text) text.classList.remove('d-none');
        if (loader) loader.classList.add('d-none');
    }
}

// ─── AJAX Helper ────────────────────────────────────────────────────────────

function ajaxPost(url, data) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            try {
                const json = JSON.parse(xhr.responseText);
                resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, data: json });
            } catch (e) {
                resolve({ status: xhr.status, ok: false, data: { message: xhr.statusText || 'Request failed' } });
            }
        };
        xhr.onerror = function () {
            reject(new Error('Network error'));
        };
        xhr.send(JSON.stringify(data));
    });
}

// ─── Password Toggle ────────────────────────────────────────────────────────

document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
        const input = this.closest('.input-group').querySelector('input');
        const icon = this.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    });
});

// ─── Password Strength ──────────────────────────────────────────────────────

const strengthBar = document.getElementById('strengthBar');
const regPassword = document.getElementById('regPassword');
if (regPassword && strengthBar) {
    regPassword.addEventListener('input', function () {
        const val = this.value;
        let strength = 0;
        if (val.length >= 6) strength++;
        if (val.length >= 10) strength++;
        if (/[A-Z]/.test(val)) strength++;
        if (/[0-9]/.test(val)) strength++;
        if (/[^A-Za-z0-9]/.test(val)) strength++;

        const pct = (strength / 5) * 100;
        strengthBar.style.width = pct + '%';
        strengthBar.className = 'strength-bar';
        if (strength <= 1) strengthBar.classList.add('weak');
        else if (strength <= 3) strengthBar.classList.add('medium');
        else strengthBar.classList.add('strong');
    });
}

// ─── Registration Type Toggle ───────────────────────────────────────────────

let registrationType = 'personal';
document.querySelectorAll('.reg-type-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.reg-type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        registrationType = this.dataset.type;
        const businessFields = document.getElementById('businessFields');
        if (businessFields) {
            businessFields.classList.toggle('d-none', registrationType !== 'business');
        }
    });
});

// ─── Login Form ─────────────────────────────────────────────────────────────

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    // Redirect if already logged in
    if (TokenManager.isTokenValid()) {
        window.location.href = 'dashboard.html';
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert('loginAlert');

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showAlert('loginAlert', 'Please fill in all fields.');
            return;
        }

        setLoading('loginBtn', true);

        try {
            const result = await ajaxPost(API.auth.login, { email, password });

            if (result.ok && result.data.code === 101 && result.data.token) {
                TokenManager.setToken(result.data.token);
                const user = TokenManager.getUserFromToken();
                if (user) TokenManager.setUser(user);
                showAlert('loginAlert', 'Login successful! Redirecting...', 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
            } else {
                showAlert('loginAlert', result.data.message || 'Invalid email or password.');
            }
        } catch (err) {
            showAlert('loginAlert', 'Network error. Please check your connection and try again.');
        } finally {
            setLoading('loginBtn', false);
        }
    });
}

// ─── Register Form ──────────────────────────────────────────────────────────

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    // Redirect if already logged in
    if (TokenManager.isTokenValid()) {
        window.location.href = 'dashboard.html';
    }

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert('registerAlert');

        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            showAlert('registerAlert', 'Please fill in all required fields.');
            return;
        }
        if (password !== confirmPassword) {
            showAlert('registerAlert', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            showAlert('registerAlert', 'Password must be at least 6 characters.');
            return;
        }
        if (!agreeTerms) {
            showAlert('registerAlert', 'You must agree to the Terms of Service and Privacy Policy.');
            return;
        }

        setLoading('registerBtn', true);

        try {
            let url, body;

            if (registrationType === 'business') {
                const businessName = document.getElementById('businessName').value.trim();
                const businessAddress = document.getElementById('businessAddress').value.trim();
                const kraPin = document.getElementById('kraPin').value.trim();
                const isRestaurant = document.getElementById('isRestaurant').checked;

                if (!businessName || !businessAddress) {
                    showAlert('registerAlert', 'Please fill in business name and address.');
                    setLoading('registerBtn', false);
                    return;
                }

                url = API.auth.registerBusiness;
                body = {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone_number: phoneNumber,
                    password: password,
                    business_name: businessName,
                    business_address: businessAddress,
                    kra_pin: kraPin,
                    is_restaurant: isRestaurant,
                };
            } else {
                url = API.auth.signup;
                body = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    phoneNumber: phoneNumber,
                    password: password,
                };
            }

            const result = await ajaxPost(url, body);

            if (result.status === 201 || (result.data.code === 101) || result.data.success) {
                showAlert('registerAlert', 
                    result.data.message || 'Account created successfully! Please check your email to verify, then login.', 
                    'success'
                );
                registerForm.reset();
                setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            } else {
                showAlert('registerAlert', result.data.message || 'Registration failed. Please try again.');
            }
        } catch (err) {
            showAlert('registerAlert', 'Network error. Please check your connection and try again.');
        } finally {
            setLoading('registerBtn', false);
        }
    });
}

// ─── Forgot Password ────────────────────────────────────────────────────────

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert('resetAlert');

        const email = document.getElementById('resetEmail').value.trim();
        if (!email) {
            showAlert('resetAlert', 'Please enter your email address.');
            return;
        }

        setLoading('resetBtn', true);

        try {
            const result = await ajaxPost(API.auth.forgotPassword, { email });

            if (result.ok) {
                showAlert('resetAlert', result.data.message || 'Password reset link sent to your email.', 'success');
                forgotPasswordForm.reset();
            } else {
                showAlert('resetAlert', result.data.message || 'Failed to send reset link. Please try again.');
            }
        } catch (err) {
            showAlert('resetAlert', 'Network error. Please try again.');
        } finally {
            setLoading('resetBtn', false);
        }
    });
}

// ─── Auth Guard ─────────────────────────────────────────────────────────────

function requireAuth() {
    if (!TokenManager.isTokenValid()) {
        TokenManager.removeToken();
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ─── Logout ─────────────────────────────────────────────────────────────────

function logout() {
    TokenManager.removeToken();
    window.location.href = 'login.html';
}

document.querySelectorAll('#logoutBtn, #logoutDropdown').forEach(el => {
    if (el) el.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
    });
});
