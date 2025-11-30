// Authentication Manager
class AuthManager {
    constructor() {
        this.tokenKey = 'access_token';
        this.userKey = 'current_user';
    }

    // Store token in localStorage
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    // Get token from localStorage
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    // Remove token
    removeToken() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    // Store user data
    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    // Get user data
    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    }

    // Check if user is admin
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    // Check if user is client
    isClient() {
        const user = this.getUser();
        return user && user.role === 'client';
    }

    // Login handler
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            
            // Store token
            this.setToken(response.access_token);
            
            // Get and store user data
            const user = await api.getCurrentUser();
            this.setUser(user);
            
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Logout handler
    logout() {
        this.removeToken();
        window.location.href = '/index.html';
    }

    // Redirect based on role
    redirectToDashboard() {
        const user = this.getUser();
        
        if (!user) {
            window.location.href = '/index.html';
            return;
        }

        if (user.role === 'admin') {
            window.location.href = './admin/dashboard.html';
        } else if (user.role === 'client') {
            window.location.href = './client/dashboard.html';
        }
    }

    // Protect page - require authentication
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    }

    // Protect admin pages
    requireAdmin() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isAdmin()) {
            showToast('Access denied. Admin only.', 'error');
            this.redirectToDashboard();
            return false;
        }
        
        return true;
    }

    // Protect client pages
    requireClient() {
        if (!this.requireAuth()) {
            return false;
        }
        
        if (!this.isClient()) {
            showToast('Access denied. Client only.', 'error');
            this.redirectToDashboard();
            return false;
        }
        
        return true;
    }

    // Initialize user display in navbar
    initUserDisplay() {
        const user = this.getUser();
        if (!user) return;

        // Update user name displays
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = user.email;
        });

        // Update role displays
        const userRoleElements = document.querySelectorAll('.user-role');
        userRoleElements.forEach(el => {
            el.textContent = user.role.toUpperCase();
        });
    }
}

// Create global auth instance
const auth = new AuthManager();

// Add logout functionality to all logout buttons
document.addEventListener('DOMContentLoaded', () => {
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    });

    // Initialize user display
    auth.initUserDisplay();
});