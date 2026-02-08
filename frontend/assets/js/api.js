// API Configuration
const API_BASE_URL = 'https://flowrelay.onrender.com';

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


    // APPROVE USERS ENDPOINT
    async getPendingUsers() {
        return this.request('/admin/users/pending', { method: 'GET' });
    }
    async getPendingDrivers() {
        return this.request('/admin/drivers/pending', { method: 'GET' });
    }
    async approveUser(userId, approvalData) {
        return this.request(`/admin/users/${userId}/approve`, {
            method: 'PUT', body: JSON.stringify(approvalData)
        });
    }
    async approveDriver(driverId, approvalData) {
        return this.request(`/admin/drivers/${driverId}/approve`, {
            method: 'PUT', body: JSON.stringify(approvalData)
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

    // DRIVER PROFILE ENDPOINTS
    async createDriverProfile(profileData) {
        return this.request('/driver/profile', {
            method: 'POST',
            body: JSON.stringify(profileData),
        });
    }

    async getDriverProfile() {
        return this.request('/driver/profile', {
            method: 'GET',
        });
    }

    async updateDriverProfile(profileData) {
        return this.request('/driver/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
    }

    async updateDriverStatus(status) {
        return this.request(`/driver/status?status=${status}`, {
            method: 'PUT',
        });
    }

    // DRIVER OFFER ENDPOINTS
    async getDriverAvailableOffers() {
        return this.request('/driver/offers/available', {
            method: 'GET',
        });
    }

    async getDriverMyAssignments() {
        return this.request('/driver/offers/my-assignments', {
            method: 'GET',
        });
    }

    async getDriverActiveOffers() {
        return this.request('/driver/offers/active', {
            method: 'GET',
        });
    }

    async getDriverOfferDetails(offerId) {
        return this.request(`/driver/offers/${offerId}`, {
            method: 'GET',
        });
    }

    async acceptOffer(offerId) {
        return this.request(`/driver/offers/${offerId}/accept`, {
            method: 'POST',
        });
    }

    async updateOfferStatus(offerId, statusData) {
        return this.request(`/driver/offers/${offerId}/status`, {
            method: 'PUT',
            body: JSON.stringify(statusData),
        });
    }

    // DRIVER STATISTICS ENDPOINTS
    async getDriverStatistics() {
        return this.request('/driver/statistics', {
            method: 'GET',
        });
    }

    async getDriverHistory(limit = 50) {
        return this.request(`/driver/history?limit=${limit}`, {
            method: 'GET',
        });
    }

    // ADMIN DRIVER MANAGEMENT ENDPOINTS
    async getAllDrivers() {
        return this.request('/admin/drivers', {
            method: 'GET',
        });
    }

    async getAvailableDrivers() {
        return this.request('/admin/drivers/available', {
            method: 'GET',
        });
    }

    async getDriverByEmail(email) {
        return this.request(`/admin/drivers/by-email/${encodeURIComponent(email)}`, {
            method: 'GET',
        });
    }

    // Updated: Now changes approval status instead of operational status
    async adminUpdateDriverApprovalStatus(driverId, status) {
        return this.request(`/admin/drivers/${driverId}/status?status=${status}`, {
            method: 'PUT',
        });
    }

    async assignDriverById(offerId, driverId, status) {
        return this.request(`/admin/offers/${offerId}/assign-driver-by-id?driver_id=${driverId}&status=${status}`, {
            method: 'PUT',
        });
    }

    // ADMIN REPORTS ENDPOINTS
    async getTripsReport(startDate, endDate, status = 'all') {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (status) params.append('status', status);
        
        return this.request(`/admin/reports/trips?${params.toString()}`, {
            method: 'GET',
        });
    }
}

// Create global API instance
const api = new API();