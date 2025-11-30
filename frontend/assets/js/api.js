// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// API Class for handling all backend requests
class API {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get auth token from localStorage
    getToken() {
        return localStorage.getItem('access_token');
    }

    // Set auth headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    }

    // Generic request handler
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: options.headers || this.getHeaders(options.auth !== false),
            });

            // Handle different response types
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.detail || data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // AUTH ENDPOINTS
    async signup(userData) {
        return this.request('/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
            auth: false,
        });
    }

    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        return this.request('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            auth: false,
        });
    }

    async verifyEmail(token) {
        return this.request(`/verify-email?token=${token}`, {
            method: 'GET',
            auth: false,
        });
    }

    async getCurrentUser() {
        return this.request('/me', {
            method: 'GET',
        });
    }

    // CLIENT OFFER ENDPOINTS
    async createOffer(offerData) {
        return this.request('/offers', {
            method: 'POST',
            body: JSON.stringify(offerData),
        });
    }

    async getMyOffers() {
        return this.request('/offers/my', {
            method: 'GET',
        });
    }

    async getOffer(offerId) {
        return this.request(`/offers/${offerId}`, {
            method: 'GET',
        });
    }

    async updateOffer(offerId, offerData) {
        return this.request(`/offers/${offerId}`, {
            method: 'PUT',
            body: JSON.stringify(offerData),
        });
    }

    // ADMIN USER ENDPOINTS
    async getAllUsers() {
        return this.request('/admin/users', {
            method: 'GET',
        });
    }

    async updateUser(userId, userData) {
        return this.request(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(userId) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE',
        });
    }

    // ADMIN OFFER ENDPOINTS
    async getAllOffers() {
        return this.request('/admin/offers', {
            method: 'GET',
        });
    }

    async assignDriver(offerId, driverData) {
        return this.request(`/admin/offers/${offerId}/assign-driver`, {
            method: 'PUT',
            body: JSON.stringify(driverData),
        });
    }

    async adminUpdateOffer(offerId, offerData) {
        return this.request(`/admin/offers/${offerId}`, {
            method: 'PUT',
            body: JSON.stringify(offerData),
        });
    }
}

// Create global API instance
const api = new API();