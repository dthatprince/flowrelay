// client-dashboard.js - Client Dashboard with Approval Status

document.addEventListener('DOMContentLoaded', async function() {
    // Require client auth
    const user = await auth.requireAuth();
    if (!user || user.role !== 'client') {
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    displayUserInfo(user);
    
    // Check account approval status
    const isApproved = auth.checkApprovalStatus(user);
    
    if (!isApproved) {
        // Account pending/rejected/suspended
        disableOfferCreation();
        showLimitedView();
    } else {
        // Account approved - show full functionality
        enableOfferCreation();
    }
    
    // Load offers (can view even if pending)
    await loadMyOffers();
});

function displayUserInfo(user) {
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <div class="user-info-card">
                <p><strong>Company:</strong> ${user.company_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Account Status:</strong> ${auth.displayAccountStatusBadge(user.account_status, user.approval_notes)}</p>
            </div>
        `;
    }
    
    // Also display in account status section if exists
    const statusEl = document.getElementById('account-status');
    if (statusEl) {
        statusEl.innerHTML = auth.displayAccountStatusBadge(user.account_status, user.approval_notes);
    }
}

function disableOfferCreation() {
    const createBtn = document.getElementById('create-offer-btn');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.style.cursor = 'not-allowed';
        createBtn.title = 'Account must be approved by admin to create offers';
        createBtn.classList.add('disabled');
    }
    
    // Disable create offer form if visible
    const createForm = document.getElementById('create-offer-form');
    if (createForm) {
        const inputs = createForm.querySelectorAll('input, textarea, select, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

function enableOfferCreation() {
    const createBtn = document.getElementById('create-offer-btn');
    if (createBtn) {
        createBtn.disabled = false;
        createBtn.style.cursor = 'pointer';
        createBtn.title = 'Create a new delivery offer';
        createBtn.classList.remove('disabled');
    }
}

function showLimitedView() {
    const user = auth.getUserData();
    const message = document.getElementById('approval-status-message');
    
    if (!message) {
        const div = document.createElement('div');
        div.id = 'approval-status-message';
        div.className = 'alert alert-warning approval-banner';
        
        if (user.account_status === 'pending') {
            div.innerHTML = `
                <div class="container">
                    <i class="fas fa-clock"></i>
                    <strong>Account Pending Approval</strong><br>
                    Your account is awaiting admin approval. You can view your offers below, but creating new offers is disabled until approval.
                </div>
            `;
        } else if (user.account_status === 'rejected') {
            div.innerHTML = `
                <div class="container">
                    <i class="fas fa-times-circle"></i>
                    <strong>Account Not Approved</strong><br>
                    Your account was not approved. Please contact support for more information.
                    ${user.approval_notes ? `<br><small>Reason: ${user.approval_notes}</small>` : ''}
                </div>
            `;
        } else if (user.account_status === 'suspended') {
            div.innerHTML = `
                <div class="container">
                    <i class="fas fa-ban"></i>
                    <strong>Account Suspended</strong><br>
                    Your account has been suspended. Please contact support for assistance.
                    ${user.approval_notes ? `<br><small>Reason: ${user.approval_notes}</small>` : ''}
                </div>
            `;
        }
        
        document.body.insertBefore(div, document.body.firstChild);
    }
}

async function loadMyOffers() {
    const offersContainer = document.getElementById('my-offers-container');
    if (!offersContainer) return;
    
    try {
        const offers = await auth.apiRequest('/offers/my');
        displayOffers(offers);
    } catch (error) {
        console.error('Error loading offers:', error);
        offersContainer.innerHTML = `
            <div class="alert alert-danger">
                Failed to load offers. Please try again later.
            </div>
        `;
    }
}

function displayOffers(offers) {
    const container = document.getElementById('my-offers-container');
    if (!container) return;
    
    if (offers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No offers yet. Create your first delivery offer!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="offers-grid">';
    
    offers.forEach(offer => {
        const statusBadge = getOfferStatusBadge(offer.status);
        const canEdit = offer.status === 'pending';
        
        html += `
            <div class="offer-card">
                <div class="offer-header">
                    <h6>${offer.description}</h6>
                    ${statusBadge}
                </div>
                <div class="offer-details">
                    <p><i class="fas fa-map-marker-alt text-primary"></i> <strong>Pickup:</strong> ${offer.pickup_address}</p>
                    <p><i class="fas fa-map-marker-alt text-success"></i> <strong>Dropoff:</strong> ${offer.dropoff_address}</p>
                    <p><i class="fas fa-calendar"></i> <strong>Date:</strong> ${offer.pickup_date} at ${offer.pickup_time}</p>
                    <p><i class="fas fa-user"></i> <strong>Representative:</strong> ${offer.company_representative}</p>
                    <p><i class="fas fa-phone"></i> <strong>Emergency:</strong> ${offer.emergency_phone}</p>
                    ${offer.additional_service ? `<p><i class="fas fa-info-circle"></i> <strong>Additional:</strong> ${offer.additional_service}</p>` : ''}
                    
                    ${offer.driver_first_name ? `
                        <div class="driver-info mt-3">
                            <h6 class="text-muted">Driver Information</h6>
                            <p><i class="fas fa-user-tie"></i> ${offer.driver_first_name}</p>
                            <p><i class="fas fa-phone"></i> ${offer.driver_phone}</p>
                            <p><i class="fas fa-car"></i> ${offer.vehicle_make} ${offer.vehicle_model} (${offer.vehicle_color})</p>
                            <p><i class="fas fa-id-card"></i> Plate: ${offer.vehicle_plate}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="offer-actions">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-primary" onclick="editOffer(${offer.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="viewOfferDetails(${offer.id})">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getOfferStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-warning">⏳ Pending</span>',
        'matched': '<span class="badge badge-info">🤝 Matched</span>',
        'in_progress': '<span class="badge badge-primary">🚚 In Progress</span>',
        'completed': '<span class="badge badge-success">✅ Completed</span>',
        'cancelled': '<span class="badge badge-danger">❌ Cancelled</span>'
    };
    return badges[status] || badges['pending'];
}

// Handle create offer button
document.getElementById('create-offer-btn')?.addEventListener('click', function() {
    const user = auth.getUserData();
    
    if (user.account_status !== 'approved') {
        alert('Your account must be approved by an administrator before you can create offers.');
        return;
    }
    
    showCreateOfferModal();
});

function showCreateOfferModal() {
    // Show your existing create offer modal/form
    const modal = document.getElementById('create-offer-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function createOffer(offerData) {
    try {
        const newOffer = await auth.apiRequest('/offers', {
            method: 'POST',
            body: JSON.stringify(offerData)
        });
        
        alert('Offer created successfully!');
        await loadMyOffers();
        hideCreateOfferModal();
        
    } catch (error) {
        if (error.message.includes('pending') || error.message.includes('approved')) {
            alert('Your account must be approved before creating offers.');
        } else {
            alert('Failed to create offer: ' + error.message);
        }
    }
}

async function editOffer(offerId) {
    const user = auth.getUserData();
    
    if (user.account_status !== 'approved') {
        alert('Your account must be approved to edit offers.');
        return;
    }
    
    // Your existing edit offer logic
    console.log('Edit offer:', offerId);
}

function viewOfferDetails(offerId) {
    // Your existing view details logic
    console.log('View offer details:', offerId);
}

function hideCreateOfferModal() {
    const modal = document.getElementById('create-offer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Export functions if needed
window.clientDashboard = {
    loadMyOffers,
    createOffer,
    editOffer,
    viewOfferDetails
};