// driver-dashboard.js - Driver Dashboard with Approval Status

document.addEventListener('DOMContentLoaded', async function() {
    // Require driver auth
    const driver = await auth.requireAuth();
    if (!driver || driver.role !== 'driver') {
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    displayUserInfo(driver);
    
    // Check if driver has a profile
    await checkDriverProfile(driver);
    
    // Load driver data if approved
    if (driver.account_status === 'approved') {
        await loadDriverData();
    }
});

function displayUserInfo(user) {
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.innerHTML = `
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Account Status:</strong> ${auth.displayAccountStatusBadge(user.account_status, user.approval_notes)}</p>
        `;
    }
}

async function checkDriverProfile(user) {
    const profileSection = document.getElementById('driver-profile-section');
    const actionsSection = document.getElementById('driver-actions-section');
    
    try {
        const profile = await auth.apiRequest('/driver/profile');
        
        // Check for profile approval status
        if (profile.driver_status === 'pending') {
            showProfilePendingMessage();
            displayDriverProfile(profile, true);
            if (actionsSection) actionsSection.style.display = 'none';
        } else if (profile.driver_status === 'approved') {
            hideApprovalMessages();
            displayDriverProfile(profile, false);
            if (actionsSection) actionsSection.style.display = 'block';
        } else if (profile.driver_status === 'rejected') {
            showProfileRejectedMessage(profile.driver_approval_notes);
            displayDriverProfile(profile, true);
            if (actionsSection) actionsSection.style.display = 'none';
        } else if (profile.driver_status === 'suspended') {
            showProfileSuspendedMessage(profile.driver_approval_notes);
            displayDriverProfile(profile, true);
            if (actionsSection) actionsSection.style.display = 'none';
        }
        
    } catch (error) {
        if (error.message.includes('not found')) {
            // No profile yet - show create profile form
            showCreateProfileForm();
            if (actionsSection) actionsSection.style.display = 'none';
        } else {
            console.error('Error loading profile:', error);
        }
    }
}

function showProfilePendingMessage() {
    const message = `
        <div class="alert alert-warning" style="margin: 20px 0;">
            <i class="fas fa-clock"></i>
            <strong>Driver Profile Pending Approval</strong><br>
            Your driver profile is under review by our admin team. You will be notified once approved.
            You can view your profile details below, but cannot accept deliveries until approved.
        </div>
    `;
    showApprovalMessage(message);
}

function showProfileRejectedMessage(notes) {
    const message = `
        <div class="alert alert-danger" style="margin: 20px 0;">
            <i class="fas fa-times-circle"></i>
            <strong>Driver Profile Rejected</strong><br>
            Your driver profile was not approved.
            ${notes ? `<br><strong>Reason:</strong> ${notes}` : ''}
            <br>Please contact support for more information.
        </div>
    `;
    showApprovalMessage(message);
}

function showProfileSuspendedMessage(notes) {
    const message = `
        <div class="alert alert-danger" style="margin: 20px 0;">
            <i class="fas fa-ban"></i>
            <strong>Driver Profile Suspended</strong><br>
            Your driver profile has been temporarily suspended.
            ${notes ? `<br><strong>Reason:</strong> ${notes}` : ''}
            <br>Please contact support for assistance.
        </div>
    `;
    showApprovalMessage(message);
}

function showAccountPendingMessage() {
    const message = `
        <div class="alert alert-warning" style="margin: 20px 0;">
            <i class="fas fa-clock"></i>
            <strong>Account Pending Approval</strong><br>
            Your account is awaiting admin approval. Some features are restricted until your account is approved.
        </div>
    `;
    showApprovalMessage(message);
}

function showApprovalMessage(html) {
    const container = document.getElementById('approval-message-container');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
    } else {
        // Create container if doesn't exist
        const div = document.createElement('div');
        div.id = 'approval-message-container';
        div.innerHTML = html;
        document.querySelector('.container-fluid')?.prepend(div);
    }
}

function hideApprovalMessages() {
    const container = document.getElementById('approval-message-container');
    if (container) {
        container.style.display = 'none';
    }
}

function displayDriverProfile(profile, readonly = false) {
    const profileContainer = document.getElementById('driver-profile-container');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6>Driver Profile ${auth.displayAccountStatusBadge(profile.driver_status, profile.driver_approval_notes)}</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-uppercase text-muted mb-3">Personal Information</h6>
                        <p><strong>Name:</strong> ${profile.first_name} ${profile.last_name}</p>
                        <p><strong>Phone:</strong> ${profile.phone_number}</p>
                        <p><strong>License #:</strong> ${profile.license_number}</p>
                        <p><strong>License Expiry:</strong> ${profile.license_expiry}</p>
                        <p><strong>Insurance #:</strong> ${profile.insurance_number}</p>
                        <p><strong>Insurance Expiry:</strong> ${profile.insurance_expiry}</p>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-uppercase text-muted mb-3">Vehicle Information</h6>
                        <p><strong>Make/Model:</strong> ${profile.vehicle_make} ${profile.vehicle_model}</p>
                        <p><strong>Year:</strong> ${profile.vehicle_year}</p>
                        <p><strong>Color:</strong> ${profile.vehicle_color}</p>
                        <p><strong>Plate:</strong> ${profile.vehicle_plate}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${profile.status === 'available' ? 'success' : profile.status === 'busy' ? 'warning' : 'secondary'}">${profile.status}</span></p>
                        <p><strong>Total Deliveries:</strong> ${profile.total_deliveries}</p>
                        <p><strong>Rating:</strong> ⭐ ${profile.rating}</p>
                    </div>
                </div>
                ${!readonly && profile.driver_status === 'approved' ? `
                    <div class="mt-3">
                        <button class="btn btn-primary" onclick="showEditProfileModal()">
                            <i class="fas fa-edit"></i> Edit Profile
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function showCreateProfileForm() {
    const profileContainer = document.getElementById('driver-profile-container');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h6>Create Driver Profile</h6>
                <p class="text-sm">Complete your driver profile to start accepting deliveries</p>
            </div>
            <div class="card-body">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Your profile will be reviewed by an administrator before you can start accepting deliveries.
                </div>
                <form id="createProfileForm">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-uppercase text-muted mb-3">Personal Information</h6>
                            <div class="form-group">
                                <label>First Name *</label>
                                <input type="text" class="form-control" name="first_name" required>
                            </div>
                            <div class="form-group">
                                <label>Last Name *</label>
                                <input type="text" class="form-control" name="last_name" required>
                            </div>
                            <div class="form-group">
                                <label>Phone Number *</label>
                                <input type="tel" class="form-control" name="phone_number" required>
                            </div>
                            <div class="form-group">
                                <label>License Number *</label>
                                <input type="text" class="form-control" name="license_number" required>
                            </div>
                            <div class="form-group">
                                <label>License Expiry Date *</label>
                                <input type="date" class="form-control" name="license_expiry" required>
                            </div>
                            <div class="form-group">
                                <label>Insurance Number *</label>
                                <input type="text" class="form-control" name="insurance_number" required>
                            </div>
                            <div class="form-group">
                                <label>Insurance Expiry Date *</label>
                                <input type="date" class="form-control" name="insurance_expiry" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-uppercase text-muted mb-3">Vehicle Information</h6>
                            <div class="form-group">
                                <label>Vehicle Make *</label>
                                <input type="text" class="form-control" name="vehicle_make" placeholder="e.g., Toyota" required>
                            </div>
                            <div class="form-group">
                                <label>Vehicle Model *</label>
                                <input type="text" class="form-control" name="vehicle_model" placeholder="e.g., Camry" required>
                            </div>
                            <div class="form-group">
                                <label>Vehicle Year *</label>
                                <input type="number" class="form-control" name="vehicle_year" min="1990" max="2026" required>
                            </div>
                            <div class="form-group">
                                <label>Vehicle Color *</label>
                                <input type="text" class="form-control" name="vehicle_color" placeholder="e.g., Silver" required>
                            </div>
                            <div class="form-group">
                                <label>License Plate *</label>
                                <input type="text" class="form-control" name="vehicle_plate" placeholder="e.g., ABC123" required>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Handle form submission
    document.getElementById('createProfileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = Object.fromEntries(formData.entries());
        
        try {
            const profile = await auth.apiRequest('/driver/profile', {
                method: 'POST',
                body: JSON.stringify(profileData)
            });
            
            alert('Profile created successfully! Your profile is now pending admin approval.');
            location.reload();
            
        } catch (error) {
            alert('Failed to create profile: ' + error.message);
        }
    });
}

async function loadDriverData() {
    // Load available offers
    try {
        const offers = await auth.apiRequest('/driver/offers/available');
        displayAvailableOffers(offers);
    } catch (error) {
        console.error('Error loading offers:', error);
    }
    
    // Load active deliveries
    try {
        const activeOffers = await auth.apiRequest('/driver/offers/active');
        displayActiveDeliveries(activeOffers);
    } catch (error) {
        console.error('Error loading active deliveries:', error);
    }
    
    // Load statistics
    try {
        const stats = await auth.apiRequest('/driver/statistics');
        displayStatistics(stats);
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function displayAvailableOffers(offers) {
    const container = document.getElementById('available-offers-container');
    if (!container) return;
    
    if (offers.length === 0) {
        container.innerHTML = '<p class="text-muted">No available offers at the moment</p>';
        return;
    }
    
    let html = '<div class="row">';
    offers.forEach(offer => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6>${offer.description}</h6>
                        <p class="text-sm"><strong>Pickup:</strong> ${offer.pickup_address}</p>
                        <p class="text-sm"><strong>Dropoff:</strong> ${offer.dropoff_address}</p>
                        <p class="text-sm"><strong>Date/Time:</strong> ${offer.pickup_date} at ${offer.pickup_time}</p>
                        <button class="btn btn-sm btn-success" onclick="acceptOffer(${offer.id})">
                            <i class="fas fa-check"></i> Accept
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function displayActiveDeliveries(offers) {
    const container = document.getElementById('active-deliveries-container');
    if (!container) return;
    
    if (offers.length === 0) {
        container.innerHTML = '<p class="text-muted">No active deliveries</p>';
        return;
    }
    
    // Implementation for active deliveries
    // Similar to available offers but with different actions
}

function displayStatistics(stats) {
    const container = document.getElementById('statistics-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>${stats.statistics.total_assigned}</h3>
                        <p class="text-muted mb-0">Total Assigned</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>${stats.statistics.completed}</h3>
                        <p class="text-muted mb-0">Completed</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>${stats.statistics.in_progress}</h3>
                        <p class="text-muted mb-0">In Progress</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>${stats.driver_info.rating}</h3>
                        <p class="text-muted mb-0">Rating</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function acceptOffer(offerId) {
    if (!confirm('Accept this delivery offer?')) return;
    
    try {
        await auth.apiRequest(`/driver/offers/${offerId}/accept`, {
            method: 'POST'
        });
        
        alert('Offer accepted successfully!');
        location.reload();
    } catch (error) {
        if (error.message.includes('pending') || error.message.includes('approved')) {
            alert('You cannot accept offers until your driver profile is approved by an administrator.');
        } else {
            alert('Failed to accept offer: ' + error.message);
        }
    }
}