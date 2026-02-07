// driver-dashboard.js
// Driver Dashboard with Profile Status and Approval Handling

let driverProfile = null;
let driverStatus = {
  hasProfile: false,
  profileStatus: 'none', // none, pending, approved, rejected, suspended
  canAcceptOffers: false
};

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!auth.isAuthenticated() || auth.getUser().role !== 'driver') {
    window.location.href = '../index.html';
    return;
  }

  await loadDashboard();
});

/* ================== MAIN DASHBOARD LOADER ================== */

async function loadDashboard() {
  try {
    // Step 1: Check if driver profile exists
    await checkDriverProfile();

    // Step 2: Show appropriate alerts based on status
    showStatusAlerts();

    // Step 3: Load data based on profile status
    if (driverStatus.hasProfile) {
      await loadDriverData();
    } else {
      showNoProfileState();
    }

    // Step 4: Setup quick actions based on status
    setupQuickActions();

  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard', 'error');
  }
}

/* ================== PROFILE STATUS CHECK ================== */

async function checkDriverProfile() {
  try {
    driverProfile = await api.getDriverProfile();
    driverStatus.hasProfile = true;
    driverStatus.profileStatus = driverProfile.driver_status || 'pending';
    
    // Only approved drivers can accept offers
    driverStatus.canAcceptOffers = (driverStatus.profileStatus === 'approved');
    
    updateDriverInfo(driverProfile);
  } catch (error) {
    // Profile doesn't exist
    driverStatus.hasProfile = false;
    driverStatus.profileStatus = 'none';
    driverStatus.canAcceptOffers = false;
  }
}

/* ================== STATUS ALERTS ================== */

function showStatusAlerts() {
  const alertsContainer = document.getElementById('alertsContainer');
  alertsContainer.innerHTML = '';

  if (!driverStatus.hasProfile) {
    // No profile created yet
    alertsContainer.innerHTML = `
      <div class="alert alert-warning alert-dismissible fade show" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Profile Required!</strong> Please create your driver profile to start your journey with us.
        <a href="profile.html" class="alert-link ms-2">Create Profile Now</a>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  } else if (driverStatus.profileStatus === 'pending') {
    // Profile pending approval
    alertsContainer.innerHTML = `
      <div class="alert alert-info alert-dismissible fade show" role="alert">
        <i class="fas fa-clock me-2"></i>
        <strong>Pending Approval</strong> Your driver profile is under review by our admin team. 
        You'll be able to accept offers once approved.
        ${driverProfile.driver_approval_notes ? `<br><small>Note: ${driverProfile.driver_approval_notes}</small>` : ''}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  } else if (driverStatus.profileStatus === 'rejected') {
    // Profile rejected
    alertsContainer.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <i class="fas fa-times-circle me-2"></i>
        <strong>Profile Rejected</strong> Unfortunately, your driver profile was not approved.
        ${driverProfile.driver_approval_notes ? `<br><strong>Reason:</strong> ${driverProfile.driver_approval_notes}` : ''}
        <br>Please contact support for more information or update your profile.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  } else if (driverStatus.profileStatus === 'suspended') {
    // Profile suspended
    alertsContainer.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <i class="fas fa-ban me-2"></i>
        <strong>Account Suspended</strong> Your driver profile has been suspended.
        ${driverProfile.driver_approval_notes ? `<br><strong>Reason:</strong> ${driverProfile.driver_approval_notes}` : ''}
        <br>Please contact support for assistance.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  } else if (driverStatus.profileStatus === 'approved') {
    // Approved - show welcome message only once
    const welcomeShown = sessionStorage.getItem('welcomeShown');
    if (!welcomeShown) {
      alertsContainer.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="fas fa-check-circle me-2"></i>
          <strong>Welcome!</strong> Your driver profile is approved. You can now accept delivery offers!
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;
      sessionStorage.setItem('welcomeShown', 'true');
    }
  }
}

/* ================== LOAD DRIVER DATA ================== */

async function loadDriverData() {
  try {
    // Only approved drivers can see statistics and active offers
    if (driverStatus.canAcceptOffers) {
      const stats = await api.getDriverStatistics();
      updateStatistics(stats);

      const activeOffers = await api.getDriverActiveOffers();
      displayActiveDeliveries(activeOffers);

      // Show status toggle for approved drivers
      document.getElementById('statusToggleContainer').style.display = 'block';
      setupStatusToggle();
    } else {
      // Show limited data for pending/rejected/suspended drivers
      showLimitedStatistics();
      showLimitedDeliveries();
    }
  } catch (error) {
    console.error('Error loading driver data:', error);
    showToast('Failed to load driver data', 'error');
  }
}

/* ================== UPDATE DRIVER INFO ================== */

function updateDriverInfo(profile) {
  document.getElementById('driverName').textContent = `${profile.first_name} ${profile.last_name}`;
  document.getElementById('vehicleInfo').textContent = `${profile.vehicle_color} ${profile.vehicle_make} ${profile.vehicle_model}`;
  document.getElementById('vehiclePlate').textContent = profile.vehicle_plate;
  
  // Profile status badge
  const profileStatusBadge = document.getElementById('profileStatus');
  const statusConfig = {
    'pending': { class: 'warning', text: 'Pending Approval' },
    'approved': { class: 'success', text: 'Approved' },
    'rejected': { class: 'danger', text: 'Rejected' },
    'suspended': { class: 'danger', text: 'Suspended' }
  };
  const config = statusConfig[profile.driver_status] || statusConfig['pending'];
  profileStatusBadge.className = `badge badge-sm bg-gradient-${config.class}`;
  profileStatusBadge.textContent = config.text;
  
  // Availability status badge (only for approved drivers)
  const statusBadge = document.getElementById('driverStatus');
  if (profile.driver_status === 'approved') {
    const availabilityConfig = {
      'available': { class: 'success', text: 'Available' },
      'busy': { class: 'warning', text: 'Busy' },
      'offline': { class: 'secondary', text: 'Offline' }
    };
    const avConfig = availabilityConfig[profile.status] || availabilityConfig['offline'];
    statusBadge.className = `badge badge-sm bg-gradient-${avConfig.class}`;
    statusBadge.textContent = avConfig.text;
  } else {
    statusBadge.className = 'badge badge-sm bg-gradient-secondary';
    statusBadge.textContent = 'Inactive';
  }
}

/* ================== UPDATE STATISTICS ================== */

function updateStatistics(stats) {
  document.getElementById('totalDeliveries').textContent = stats.driver_info.total_deliveries || 0;
  document.getElementById('activeDeliveries').textContent = (stats.statistics.in_progress + stats.statistics.matched) || 0;
  document.getElementById('completedDeliveries').textContent = stats.statistics.completed || 0;
  document.getElementById('driverRating').textContent = stats.driver_info.rating || '5.0';
}

function showLimitedStatistics() {
  document.getElementById('totalDeliveries').textContent = '-';
  document.getElementById('activeDeliveries').textContent = '-';
  document.getElementById('completedDeliveries').textContent = '-';
  document.getElementById('driverRating').textContent = '-';
}

/* ================== DISPLAY DELIVERIES ================== */

function displayActiveDeliveries(offers) {
  const tbody = document.getElementById('activeDeliveriesTable');
  
  if (!offers || offers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No active deliveries</td></tr>';
    return;
  }

  tbody.innerHTML = offers.map(offer => `
    <tr>
      <td>
        <p class="text-xs font-weight-bold mb-0">#${offer.id}</p>
        <p class="text-xs text-secondary mb-0">${truncate(offer.description, 30)}</p>
      </td>
      <td>
        <p class="text-xs font-weight-bold mb-0">From: ${truncate(offer.pickup_address, 25)}</p>
        <p class="text-xs text-secondary mb-0">To: ${truncate(offer.dropoff_address, 25)}</p>
        <p class="text-xs text-secondary mb-0">Mileage: ${offer.total_mileage} miles</p>
      </td>
      <td class="align-middle text-center">
        <p class="text-xs font-weight-bold mb-0">${offer.pickup_date}</p>
        <p class="text-xs text-secondary mb-0">${offer.pickup_time}</p>
      </td>
      <td class="align-middle text-center">
        <span class="badge badge-sm bg-gradient-${getStatusBadge(offer.status)}">${getStatusDisplay(offer.status)}</span>
      </td>
      <td class="align-middle">
        <a href="my-deliveries.html?id=${offer.id}" class="btn btn-link text-primary mb-0">
          <i class="fas fa-eye text-xs"></i>
        </a>
      </td>
    </tr>
  `).join('');
}

function showLimitedDeliveries() {
  const tbody = document.getElementById('activeDeliveriesTable');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        <i class="fas fa-lock text-muted mb-2" style="font-size: 2rem;"></i>
        <p class="text-sm text-muted">Available after profile approval</p>
      </td>
    </tr>
  `;
}

/* ================== NO PROFILE STATE ================== */

function showNoProfileState() {
  showLimitedStatistics();
  
  const tbody = document.getElementById('activeDeliveriesTable');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4">
        <i class="fas fa-user-plus text-muted mb-2" style="font-size: 2rem;"></i>
        <p class="text-sm text-muted">Create your driver profile to get started</p>
        <a href="profile.html" class="btn btn-sm btn-primary mt-2">Create Profile</a>
      </td>
    </tr>
  `;

  // Hide driver info
  document.getElementById('driverName').textContent = '-';
  document.getElementById('vehicleInfo').textContent = '-';
  document.getElementById('vehiclePlate').textContent = '-';
  document.getElementById('profileStatus').textContent = 'Not Created';
  document.getElementById('profileStatus').className = 'badge badge-sm bg-gradient-secondary';
  document.getElementById('driverStatus').textContent = '-';
}

/* ================== QUICK ACTIONS ================== */

function setupQuickActions() {
  const container = document.getElementById('quickActionsContainer');
  
  if (!driverStatus.hasProfile) {
    // No profile - only show create profile action
    container.innerHTML = `
      <a href="profile.html" class="btn btn-primary">
        <i class="fas fa-user-plus me-2"></i>Create Driver Profile
      </a>
    `;
  } else if (driverStatus.profileStatus === 'pending') {
    // Pending approval
    container.innerHTML = `
      <a href="profile.html" class="btn btn-info">
        <i class="fas fa-user me-2"></i>View Profile
      </a>
      <button class="btn btn-outline-secondary" disabled>
        <i class="fas fa-search me-2"></i>Browse Offers (Pending Approval)
      </button>
    `;
  } else if (driverStatus.profileStatus === 'rejected' || driverStatus.profileStatus === 'suspended') {
    // Rejected or Suspended
    container.innerHTML = `
      <a href="profile.html" class="btn btn-warning">
        <i class="fas fa-user-edit me-2"></i>Update Profile
      </a>
      <button class="btn btn-outline-secondary" disabled>
        <i class="fas fa-search me-2"></i>Browse Offers (Unavailable)
      </button>
    `;
  } else if (driverStatus.profileStatus === 'approved') {
    // Approved - full access
    container.innerHTML = `
      <a href="available-offers.html" class="btn btn-primary">
        <i class="fas fa-search me-2"></i>Browse Available Offers
      </a>
      <a href="my-deliveries.html" class="btn btn-info">
        <i class="fas fa-truck me-2"></i>My Deliveries
      </a>
      <a href="profile.html" class="btn btn-secondary">
        <i class="fas fa-user me-2"></i>Update Profile
      </a>
      <a href="history.html" class="btn btn-outline-secondary">
        <i class="fas fa-history me-2"></i>View History
      </a>
    `;
  }
}

/* ================== STATUS TOGGLE (Only for Approved Drivers) ================== */

function setupStatusToggle() {
  const toggle = document.getElementById('statusToggle');
  const label = document.getElementById('statusLabel');

  if (!driverProfile || driverProfile.driver_status !== 'approved') {
    return; // Only approved drivers can toggle status
  }

  // Set initial state
  if (driverProfile.status === 'available') {
    toggle.checked = true;
    label.textContent = 'Available';
    label.className = 'form-check-label text-success';
  } else if (driverProfile.status === 'busy') {
    toggle.checked = true;
    toggle.disabled = true;
    label.textContent = 'Busy';
    label.className = 'form-check-label text-warning';
  } else {
    toggle.checked = false;
    label.textContent = 'Offline';
    label.className = 'form-check-label text-secondary';
  }

  // Handle toggle change
  toggle.addEventListener('change', async (e) => {
    const newStatus = e.target.checked ? 'available' : 'offline';
    
    try {
      await api.updateDriverStatus(newStatus);
      
      if (newStatus === 'available') {
        label.textContent = 'Available';
        label.className = 'form-check-label text-success';
        showToast('Status updated to Available', 'success');
      } else {
        label.textContent = 'Offline';
        label.className = 'form-check-label text-secondary';
        showToast('Status updated to Offline', 'success');
      }

      // Update status badge
      const statusBadge = document.getElementById('driverStatus');
      statusBadge.textContent = newStatus === 'available' ? 'Available' : 'Offline';
      statusBadge.className = `badge badge-sm bg-gradient-${newStatus === 'available' ? 'success' : 'secondary'}`;

    } catch (error) {
      e.target.checked = !e.target.checked;
      showToast('Failed to update status', 'error');
    }
  });
}