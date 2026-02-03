// admin-approvals.js - Admin Dashboard for User and Driver Approvals

let currentTab = 'users';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Check admin auth
    const admin = await auth.requireAdmin();
    if (!admin) return;
    
    // Display admin info
    displayAdminInfo(admin);
    
    // Load initial data
    await loadPendingUsers();
    
    // Setup tab switching
    setupTabs();
    
    // Setup refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', refreshCurrentTab);
});

function displayAdminInfo(admin) {
    const adminInfoEl = document.getElementById('admin-info');
    if (adminInfoEl) {
        adminInfoEl.innerHTML = `
            <p><strong>Logged in as:</strong> ${admin.email}</p>
            <p><strong>Role:</strong> ${admin.role}</p>
        `;
    }
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
}

async function switchTab(tab) {
    currentTab = tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.tab === tab);
    });
    
    // Load data for the tab
    if (tab === 'users') {
        await loadPendingUsers();
    } else if (tab === 'drivers') {
        await loadPendingDrivers();
    } else if (tab === 'all-users') {
        await loadAllUsers();
    } else if (tab === 'all-drivers') {
        await loadAllDrivers();
    }
}

async function refreshCurrentTab() {
    await switchTab(currentTab);
}

// ========== USER APPROVALS ==========

async function loadPendingUsers() {
    showLoading('pending-users-list');
    try {
        const users = await auth.apiRequest('/admin/users/pending');
        displayPendingUsers(users);
    } catch (error) {
        showError('pending-users-list', 'Failed to load pending users');
        console.error(error);
    }
}

function displayPendingUsers(users) {
    const container = document.getElementById('pending-users-list');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>✅ No pending user approvals</p></div>';
        return;
    }
    
    let html = '<div class="approval-list">';
    
    users.forEach(user => {
        html += `
            <div class="approval-card">
                <div class="approval-header">
                    <h3>${user.email}</h3>
                    <span class="badge badge-${user.role === 'client' ? 'primary' : 'info'}">
                        ${user.role.toUpperCase()}
                    </span>
                </div>
                <div class="approval-details">
                    <p><strong>Company:</strong> ${user.company_name || 'N/A'}</p>
                    <p><strong>Representative:</strong> ${user.company_representative || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${user.phone_number || 'N/A'}</p>
                    <p><strong>Address:</strong> ${user.address || 'N/A'}</p>
                    <p><strong>Email Verified:</strong> ${user.is_verified === 'true' ? '✅' : '❌'}</p>
                    <p><strong>Registered:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div class="approval-actions">
                    <button class="btn btn-success" onclick="approveUser(${user.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger" onclick="rejectUser(${user.id})">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    <button class="btn btn-secondary" onclick="suspendUser(${user.id})">
                        <i class="fas fa-ban"></i> Suspend
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function approveUser(userId) {
    const notes = prompt('Add approval notes (optional):');
    
    if (notes === null) return; // Cancelled
    
    const confirmApprove = confirm('Are you sure you want to approve this user account?');
    if (!confirmApprove) return;
    
    try {
        await auth.apiRequest(`/admin/users/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'approved',
                notes: notes || null
            })
        });
        
        showToast('User approved successfully', 'success');
        await loadPendingUsers();
    } catch (error) {
        showToast('Failed to approve user: ' + error.message, 'error');
        console.error(error);
    }
}

async function rejectUser(userId) {
    const notes = prompt('Add rejection reason (optional but recommended):');
    
    if (notes === null) return; // Cancelled
    
    const confirmReject = confirm('Are you sure you want to reject this user account?');
    if (!confirmReject) return;
    
    try {
        await auth.apiRequest(`/admin/users/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                notes: notes || null
            })
        });
        
        showToast('User rejected', 'success');
        await loadPendingUsers();
    } catch (error) {
        showToast('Failed to reject user: ' + error.message, 'error');
        console.error(error);
    }
}

async function suspendUser(userId) {
    const notes = prompt('Add suspension reason (required):');
    
    if (!notes) {
        alert('Suspension reason is required');
        return;
    }
    
    const confirmSuspend = confirm('Are you sure you want to suspend this user account?');
    if (!confirmSuspend) return;
    
    try {
        await auth.apiRequest(`/admin/users/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'suspended',
                notes: notes
            })
        });
        
        showToast('User suspended', 'success');
        await loadPendingUsers();
    } catch (error) {
        showToast('Failed to suspend user: ' + error.message, 'error');
        console.error(error);
    }
}

// ========== DRIVER APPROVALS ==========

async function loadPendingDrivers() {
    showLoading('pending-drivers-list');
    try {
        const drivers = await auth.apiRequest('/admin/drivers/pending');
        displayPendingDrivers(drivers);
    } catch (error) {
        showError('pending-drivers-list', 'Failed to load pending drivers');
        console.error(error);
    }
}

function displayPendingDrivers(drivers) {
    const container = document.getElementById('pending-drivers-list');
    
    if (drivers.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>✅ No pending driver approvals</p></div>';
        return;
    }
    
    let html = '<div class="approval-list">';
    
    drivers.forEach(driver => {
        html += `
            <div class="approval-card driver-card">
                <div class="approval-header">
                    <h3>${driver.first_name} ${driver.last_name}</h3>
                    <span class="badge badge-warning">PENDING</span>
                </div>
                <div class="approval-details driver-details">
                    <div class="details-section">
                        <h4>Personal Information</h4>
                        <p><strong>Phone:</strong> ${driver.phone_number}</p>
                        <p><strong>License #:</strong> ${driver.license_number}</p>
                        <p><strong>License Expiry:</strong> ${driver.license_expiry}</p>
                        <p><strong>Insurance #:</strong> ${driver.insurance_number}</p>
                        <p><strong>Insurance Expiry:</strong> ${driver.insurance_expiry}</p>
                    </div>
                    <div class="details-section">
                        <h4>Vehicle Information</h4>
                        <p><strong>Make/Model:</strong> ${driver.vehicle_make} ${driver.vehicle_model}</p>
                        <p><strong>Year:</strong> ${driver.vehicle_year}</p>
                        <p><strong>Color:</strong> ${driver.vehicle_color}</p>
                        <p><strong>Plate:</strong> ${driver.vehicle_plate}</p>
                    </div>
                    <p><strong>Registered:</strong> ${new Date(driver.created_at).toLocaleDateString()}</p>
                </div>
                <div class="approval-actions">
                    <button class="btn btn-success" onclick="approveDriver(${driver.id})">
                        <i class="fas fa-check"></i> Approve Driver
                    </button>
                    <button class="btn btn-danger" onclick="rejectDriver(${driver.id})">
                        <i class="fas fa-times"></i> Reject Driver
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function approveDriver(driverId) {
    const notes = prompt('Add approval notes (optional - e.g., "Documents verified"):');
    
    if (notes === null) return; // Cancelled
    
    const confirmApprove = confirm('Are you sure you want to approve this driver profile?');
    if (!confirmApprove) return;
    
    try {
        await auth.apiRequest(`/admin/drivers/${driverId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'approved',
                notes: notes || null
            })
        });
        
        showToast('Driver approved successfully', 'success');
        await loadPendingDrivers();
    } catch (error) {
        showToast('Failed to approve driver: ' + error.message, 'error');
        console.error(error);
    }
}

async function rejectDriver(driverId) {
    const notes = prompt('Add rejection reason (e.g., "Invalid license"):');
    
    if (notes === null) return; // Cancelled
    
    const confirmReject = confirm('Are you sure you want to reject this driver profile?');
    if (!confirmReject) return;
    
    try {
        await auth.apiRequest(`/admin/drivers/${driverId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'rejected',
                notes: notes || null
            })
        });
        
        showToast('Driver rejected', 'success');
        await loadPendingDrivers();
    } catch (error) {
        showToast('Failed to reject driver: ' + error.message, 'error');
        console.error(error);
    }
}

// ========== ALL USERS VIEW ==========

async function loadAllUsers() {
    showLoading('all-users-list');
    try {
        const users = await auth.apiRequest('/admin/users');
        displayAllUsers(users);
    } catch (error) {
        showError('all-users-list', 'Failed to load users');
        console.error(error);
    }
}

function displayAllUsers(users) {
    const container = document.getElementById('all-users-list');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        const statusBadge = getStatusBadge(user.account_status);
        html += `
            <tr>
                <td>${user.email}</td>
                <td><span class="badge badge-${user.role === 'admin' ? 'danger' : user.role === 'client' ? 'primary' : 'info'}">${user.role}</span></td>
                <td>${user.company_name || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    ${user.role !== 'admin' && user.account_status !== 'approved' ? 
                        `<button class="btn btn-sm btn-success" onclick="quickApproveUser(${user.id})">Approve</button>` : ''}
                    ${user.role !== 'admin' && user.account_status === 'approved' ? 
                        `<button class="btn btn-sm btn-warning" onclick="suspendUser(${user.id})">Suspend</button>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function quickApproveUser(userId) {
    try {
        await auth.apiRequest(`/admin/users/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'approved',
                notes: 'Quick approval'
            })
        });
        
        showToast('User approved', 'success');
        await loadAllUsers();
    } catch (error) {
        showToast('Failed to approve: ' + error.message, 'error');
    }
}

// ========== ALL DRIVERS VIEW ==========

async function loadAllDrivers() {
    showLoading('all-drivers-list');
    try {
        const drivers = await auth.apiRequest('/admin/drivers');
        displayAllDrivers(drivers);
    } catch (error) {
        showError('all-drivers-list', 'Failed to load drivers');
        console.error(error);
    }
}

function displayAllDrivers(drivers) {
    const container = document.getElementById('all-drivers-list');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>License</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Deliveries</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    drivers.forEach(driver => {
        const statusBadge = getStatusBadge(driver.driver_status);
        html += `
            <tr>
                <td>${driver.first_name} ${driver.last_name}</td>
                <td>${driver.phone_number}</td>
                <td>${driver.license_number}</td>
                <td>${driver.vehicle_make} ${driver.vehicle_model} (${driver.vehicle_plate})</td>
                <td>${statusBadge}</td>
                <td>${driver.total_deliveries}</td>
                <td>
                    ${driver.driver_status !== 'approved' ? 
                        `<button class="btn btn-sm btn-success" onclick="quickApproveDriver(${driver.id})">Approve</button>` : ''}
                    ${driver.driver_status === 'approved' ? 
                        `<span class="text-muted">Active</span>` : ''}
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function quickApproveDriver(driverId) {
    try {
        await auth.apiRequest(`/admin/drivers/${driverId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'approved',
                notes: 'Quick approval'
            })
        });
        
        showToast('Driver approved', 'success');
        await loadAllDrivers();
    } catch (error) {
        showToast('Failed to approve: ' + error.message, 'error');
    }
}

// ========== UTILITY FUNCTIONS ==========

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-warning">⏳ Pending</span>',
        'approved': '<span class="badge badge-success">✅ Approved</span>',
        'rejected': '<span class="badge badge-danger">❌ Rejected</span>',
        'suspended': '<span class="badge badge-danger">⛔ Suspended</span>'
    };
    return badges[status] || badges['pending'];
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
    }
}

function showToast(message, type = 'info') {
    // You can use your existing toast/notification system
    // This is a simple implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}