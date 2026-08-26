/**
 * Jihami Na Records - HTTP Service
 * Wraps XMLHttpRequest with auth token injection, matching the Flutter AuthInterceptor.
 */

const HttpService = {
    /**
     * Generic AJAX request with auth.
     * @param {string} method - HTTP method
     * @param {string} url - Full URL
     * @param {object|null} body - JSON body (for POST/PUT/PATCH)
     * @param {object} opts - Options: {multipart: bool}
     * @returns {Promise<{status, ok, data}>}
     */
    request(method, url, body = null, opts = {}) {
        return new Promise((resolve, reject) => {
            const token = TokenManager.getToken();
            if (!token || !TokenManager.isTokenValid()) {
                TokenManager.removeToken();
                window.location.hash = '#/login';
                return reject(new Error('Authentication required'));
            }

            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);

            if (!opts.multipart) {
                xhr.setRequestHeader('Content-Type', 'application/json');
            }

            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;

                // Handle 403 subscription redirect
                if (xhr.status === 403) {
                    try {
                        const d = JSON.parse(xhr.responseText);
                        if (d.redirectToPayment) {
                            window.location.hash = '#/subscription';
                            return resolve({ status: 403, ok: false, data: d });
                        }
                    } catch (e) { /* ignore */ }
                }

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

            if (opts.multipart && body instanceof FormData) {
                xhr.send(body);
            } else if (body) {
                xhr.send(JSON.stringify(body));
            } else {
                xhr.send();
            }
        });
    },

    get(url)              { return this.request('GET', url); },
    post(url, body)       { return this.request('POST', url, body); },
    put(url, body)        { return this.request('PUT', url, body); },
    patch(url, body)      { return this.request('PATCH', url, body); },
    del(url)              { return this.request('DELETE', url); },

    /** Multipart POST for file uploads */
    postMultipart(url, formData) {
        return this.request('POST', url, formData, { multipart: true });
    },

    putMultipart(url, formData) {
        return this.request('PUT', url, formData, { multipart: true });
    },
};
