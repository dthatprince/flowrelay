// Authentication Manager — tokens stored in memory only (XSS-safe)
class AuthManager {
    constructor() {
        this._token = null;   //  Never written to localStorage
        this._user = null;    //  Never written to localStorage
    }

    setToken(token) {
        this._token = token;
        api.setToken(token); // Keep api.js in sync
    }

    getToken() {
        return this._token;
    }

    removeToken() {
        this._token = null;
        this._user = null;
        api.clearToken();
    }

    setUser(user) {
        this._user = user;
    }

    getUser() {
        return this._user;
    }

    isAuthenticated() {
        return !!this._token;
    }

    isAdmin() {
        return this._user && this._user.role === 'admin';
    }

    isClient() {
        return this._user && this._user.role === 'client';
    }

    isDriver() {
        return this._user && this._user.role === 'driver';
    }

    async login(email, password) {
        try {
            const response = await api.login(email, password);
            this.setToken(response.access_token);
            const user = await api.getCurrentUser();
            this.setUser(user);
            return user;
        } catch (error) {
            if (error.message && error.message.includes('pending')) {
                const err = new Error('PENDING_APPROVAL');
                err.originalMessage = error.message;
                throw err;
            } else if (error.message && error.message.includes('rejected')) {
                const err = new Error('ACCOUNT_REJECTED');
                err.originalMessage = error.message;
                throw err;
            } else if (error.message && error.message.includes('suspended')) {
                const err = new Error('ACCOUNT_SUSPENDED');
                err.originalMessage = error.message;
                throw err;
            } else if (error.message && error.message.includes('verify')) {
                const err = new Error('EMAIL_NOT_VERIFIED');
                err.originalMessage = error.message;
                throw err;
            }
            throw error;
        }
    }

    //  Restores session on page load using HttpOnly refresh cookie.
    // Call this at the top of every protected page instead of requireAuth().
    // Returns the user object on success, or null if not authenticated.
    async restoreSession() {
        try {
            const data = await api.request('/auth/refresh', {
                method: 'POST',
                credentials: 'include', // sends the HttpOnly refresh cookie
                auth: false,
            });
            this.setToken(data.access_token);
            const user = await api.getCurrentUser();
            this.setUser(user);
            return user;
        } catch {
            return null;
        }
    }

    checkApprovalStatus(user) {
        if (!user) return false;
        return user.account_status === 'approved' ? 'approved' : user.account_status || 'pending';
    }

    displayAccountStatusBadge(status, notes = null) {
        const badges = {
            'pending': { class: 'warning', icon: 'clock', text: 'Pending Approval' },
            'approved': { class: 'success', icon: 'check-circle', text: 'Approved' },
            'rejected': { class: 'danger', icon: 'times-circle', text: 'Rejected' },
            'suspended': { class: 'danger', icon: 'ban', text: 'Suspended' }
        };

        const badge = badges[status] || badges['pending'];

        let html = `<span class="badge badge-sm bg-gradient-${badge.class}">
            <i class="fas fa-${badge.icon}"></i> ${badge.text}
        </span>`;

        if (notes) {
            html += `<small class="text-muted ms-2" title="${notes}">
                <i class="fas fa-info-circle"></i>
            </small>`;
        }

        return html;
    }

    showApprovalMessage(message, type = 'warning') {
        const container = document.getElementById('approval-message-container');
        if (!container) {
            const div = document.createElement('div');
            div.id = 'approval-message-container';
            div.className = `alert alert-${type}`;
            div.style.cssText = 'position: sticky; top: 0; z-index: 1000; margin-bottom: 20px;';
            div.innerHTML = `<div class="container-fluid">
                <i class="fas fa-${type === 'warning' ? 'clock' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>`;
            document.body.insertBefore(div, document.body.firstChild);
        }
    }

    async logout() {
        this.removeToken();
        //  Ask server to clear the HttpOnly refresh cookie
        try {
            await api.request('/auth/logout', {
                method: 'POST',
                credentials: 'include',
                auth: false,
            });
        } catch { /* ignore errors — we're logging out regardless */ }
        window.location.href = '../index.html';
    }

    redirectToDashboard() {
        const user = this.getUser();
        if (!user) {
            window.location.href = '/index.html';
            return;
        }
        if (user.role === 'admin') window.location.href = './admin/dashboard.html';
        else if (user.role === 'client') window.location.href = './client/dashboard.html';
        else if (user.role === 'driver') window.location.href = './driver/dashboard.html';
    }

    // Kept for backward compatibility — prefer restoreSession() on protected pages
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            showToast('Access denied. Admin only.', 'error');
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    requireClient() {
        if (!this.requireAuth()) return false;
        if (!this.isClient()) {
            showToast('Access denied. Client only.', 'error');
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    requireDriver() {
        if (!this.requireAuth()) return false;
        if (!this.isDriver()) {
            showToast('Access denied. Driver only.', 'error');
            this.redirectToDashboard();
            return false;
        }
        return true;
    }

    initUserDisplay() {
        const user = this.getUser();
        if (!user) return;
        document.querySelectorAll('.user-name').forEach(el => el.textContent = user.email);
        document.querySelectorAll('.user-role').forEach(el => el.textContent = user.role.toUpperCase());
        const accountStatusEl = document.getElementById('account-status');
        if (accountStatusEl && user.account_status) {
            accountStatusEl.innerHTML = this.displayAccountStatusBadge(user.account_status, user.approval_notes);
        }
    }
}

const auth = new AuthManager();

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    });
    auth.initUserDisplay();
});