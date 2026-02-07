// admin-approvals.js
// Approval Management for Users and Drivers

let currentTab = 'users';
let statistics = {
  pendingUsers: 0,
  pendingDrivers: 0,
  approved: 0,
  rejected: 0
};

document.addEventListener('DOMContentLoaded', async () => {
  // Require admin authentication
  if (!auth.requireAdmin()) return;

  // Setup event listeners
  setupTabs();
  setupRefreshButton();

  // Initial load
  await loadStatistics();
  await loadCurrentTab();
});

/* ================== TAB HANDLING ================== */

function setupTabs() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function setupRefreshButton() {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadStatistics();
      await loadCurrentTab();
      showToast('Data refreshed', 'success');
    });
  }
}

function switchTab(tab) {
  currentTab = tab;

  // Update button states
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update tab content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const activeContent = document.getElementById(tab);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Load tab data
  loadCurrentTab();
}

async function loadCurrentTab() {
  if (currentTab === 'users') {
    await loadPendingUsers();
  } else if (currentTab === 'drivers') {
    await loadPendingDrivers();
  }
}

/* ================== STATISTICS ================== */

async function loadStatistics() {
  try {
    // Load all data to calculate statistics
    const [allUsers, allDrivers] = await Promise.all([
      api.getAllUsers(),
      api.getAllDrivers()
    ]);

    // Calculate statistics
    statistics.pendingUsers = allUsers.filter(u => 
      u.account_status === 'pending' && u.is_verified === 'true'
    ).length;
    
    statistics.pendingDrivers = allDrivers.filter(d => 
      d.driver_status === 'pending'
    ).length;
    
    const approvedUsers = allUsers.filter(u => u.account_status === 'approved').length;
    const approvedDrivers = allDrivers.filter(d => d.driver_status === 'approved').length;
    statistics.approved = approvedUsers + approvedDrivers;
    
    const rejectedUsers = allUsers.filter(u => 
      u.account_status === 'rejected' || u.account_status === 'suspended'
    ).length;
    const rejectedDrivers = allDrivers.filter(d => 
      d.driver_status === 'rejected' || d.driver_status === 'suspended'
    ).length;
    statistics.rejected = rejectedUsers + rejectedDrivers;

    // Update UI
    updateStatisticsDisplay();
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

function updateStatisticsDisplay() {
  const pendingUsersEl = document.getElementById('pendingUsersCount');
  const pendingDriversEl = document.getElementById('pendingDriversCount');
  const approvedEl = document.getElementById('approvedCount');
  const rejectedEl = document.getElementById('rejectedCount');

  if (pendingUsersEl) pendingUsersEl.textContent = statistics.pendingUsers;
  if (pendingDriversEl) pendingDriversEl.textContent = statistics.pendingDrivers;
  if (approvedEl) approvedEl.textContent = statistics.approved;
  if (rejectedEl) rejectedEl.textContent = statistics.rejected;
}

/* ================== PENDING USERS ================== */

async function loadPendingUsers() {
  const container = document.getElementById('users');
  container.innerHTML = loadingState();

  try {
    const users = await api.getPendingUsers();

    if (!users || users.length === 0) {
      container.innerHTML = emptyState('No pending user approvals');
      return;
    }

    container.innerHTML = users.map(user => createUserCard(user)).join('');
  } catch (error) {
    console.error('Error loading pending users:', error);
    container.innerHTML = errorState('Failed to load pending users');
    showToast('Failed to load pending users', 'error');
  }
}

function createUserCard(user) {
  const verifiedBadge = user.is_verified === 'true' 
    ? '<span class="badge badge-sm bg-gradient-success"><i class="fas fa-check"></i> Verified</span>'
    : '<span class="badge badge-sm bg-gradient-warning"><i class="fas fa-clock"></i> Not Verified</span>';

  const roleBadge = user.role === 'client' 
    ? '<span class="badge badge-sm bg-gradient-primary">CLIENT</span>'
    : '<span class="badge badge-sm bg-gradient-info">DRIVER</span>';

  return `
    <div class="card mb-3">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-1">${user.email}</h6>
          <div class="d-flex gap-2">
            ${roleBadge}
            ${verifiedBadge}
          </div>
        </div>
      </div>
      <div class="card-body pt-3">
        <div class="row">
          <div class="col-md-6">
            <div class="info-row">
              <span class="info-label">Company:</span>
              <span class="info-value">${user.company_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Representative:</span>
              <span class="info-value">${user.company_representative || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${user.phone_number || 'N/A'}</span>
            </div>
          </div>
          <div class="col-md-6">
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${user.address || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Registered:</span>
              <span class="info-value">${formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>
        
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-sm bg-gradient-success" onclick="approveUser(${user.id})">
            <i class="fas fa-check me-1"></i> Approve
          </button>
          <button class="btn btn-sm bg-gradient-danger" onclick="rejectUser(${user.id})">
            <i class="fas fa-times me-1"></i> Reject
          </button>
          <button class="btn btn-sm btn-outline-warning" onclick="suspendUser(${user.id})">
            <i class="fas fa-ban me-1"></i> Suspend
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ================== PENDING DRIVERS ================== */

async function loadPendingDrivers() {
  const container = document.getElementById('drivers');
  container.innerHTML = loadingState();

  try {
    const drivers = await api.getPendingDrivers();

    if (!drivers || drivers.length === 0) {
      container.innerHTML = emptyState('No pending driver approvals');
      return;
    }

    container.innerHTML = drivers.map(driver => createDriverCard(driver)).join('');
  } catch (error) {
    console.error('Error loading pending drivers:', error);
    container.innerHTML = errorState('Failed to load pending drivers');
    showToast('Failed to load pending drivers', 'error');
  }
}

function createDriverCard(driver) {
  return `
    <div class="card mb-3">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <h6 class="mb-0">${driver.first_name} ${driver.last_name}</h6>
        <span class="badge bg-gradient-warning">PENDING</span>
      </div>
      <div class="card-body pt-3">
        <div class="row">
          <div class="col-md-6">
            <h6 class="text-uppercase text-xs text-muted mb-2">Personal Information</h6>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${driver.phone_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">License Number:</span>
              <span class="info-value">${driver.license_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">License Expiry:</span>
              <span class="info-value">${driver.license_expiry}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Insurance Number:</span>
              <span class="info-value">${driver.insurance_number}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Insurance Expiry:</span>
              <span class="info-value">${driver.insurance_expiry}</span>
            </div>
          </div>
          <div class="col-md-6">
            <h6 class="text-uppercase text-xs text-muted mb-2">Vehicle Information</h6>
            <div class="info-row">
              <span class="info-label">Make/Model:</span>
              <span class="info-value">${driver.vehicle_make} ${driver.vehicle_model}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Year:</span>
              <span class="info-value">${driver.vehicle_year}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Color:</span>
              <span class="info-value">${driver.vehicle_color}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Plate Number:</span>
              <span class="info-value">${driver.vehicle_plate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Registered:</span>
              <span class="info-value">${formatDate(driver.created_at)}</span>
            </div>
          </div>
        </div>
        
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-sm bg-gradient-success" onclick="approveDriver(${driver.id})">
            <i class="fas fa-check me-1"></i> Approve Driver
          </button>
          <button class="btn btn-sm bg-gradient-danger" onclick="rejectDriver(${driver.id})">
            <i class="fas fa-times me-1"></i> Reject Driver
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ================== USER APPROVAL ACTIONS ================== */

async function approveUser(userId) {
  const notes = prompt('Add approval notes (optional):');
  if (notes === null) return; // User cancelled

  if (!confirm('Are you sure you want to approve this user account?')) return;

  try {
    await api.approveUser(userId, {
      status: 'approved',
      notes: notes || null
    });

    showToast('User approved successfully!', 'success');
    await loadStatistics();
    await loadPendingUsers();
  } catch (error) {
    console.error('Error approving user:', error);
    showToast('Failed to approve user: ' + error.message, 'error');
  }
}

async function rejectUser(userId) {
  const notes = prompt('Add rejection reason (recommended):');
  if (notes === null) return; // User cancelled

  if (!confirm('Are you sure you want to reject this user account?')) return;

  try {
    await api.approveUser(userId, {
      status: 'rejected',
      notes: notes || null
    });

    showToast('User rejected', 'success');
    await loadStatistics();
    await loadPendingUsers();
  } catch (error) {
    console.error('Error rejecting user:', error);
    showToast('Failed to reject user: ' + error.message, 'error');
  }
}

async function suspendUser(userId) {
  const notes = prompt('Add suspension reason (required):');
  if (!notes || notes.trim() === '') {
    showToast('Suspension reason is required', 'error');
    return;
  }

  if (!confirm('Are you sure you want to suspend this user account?')) return;

  try {
    await api.approveUser(userId, {
      status: 'suspended',
      notes: notes
    });

    showToast('User suspended', 'success');
    await loadStatistics();
    await loadPendingUsers();
  } catch (error) {
    console.error('Error suspending user:', error);
    showToast('Failed to suspend user: ' + error.message, 'error');
  }
}

/* ================== DRIVER APPROVAL ACTIONS ================== */

async function approveDriver(driverId) {
  const notes = prompt('Add approval notes (e.g., "Documents verified"):');
  if (notes === null) return; // User cancelled

  if (!confirm('Are you sure you want to approve this driver profile?')) return;

  try {
    await api.approveDriver(driverId, {
      status: 'approved',
      notes: notes || null
    });

    showToast('Driver approved successfully!', 'success');
    await loadStatistics();
    await loadPendingDrivers();
  } catch (error) {
    console.error('Error approving driver:', error);
    showToast('Failed to approve driver: ' + error.message, 'error');
  }
}

async function rejectDriver(driverId) {
  const notes = prompt('Add rejection reason (e.g., "Invalid license"):');
  if (notes === null) return; // User cancelled

  if (!confirm('Are you sure you want to reject this driver profile?')) return;

  try {
    await api.approveDriver(driverId, {
      status: 'rejected',
      notes: notes || null
    });

    showToast('Driver rejected', 'success');
    await loadStatistics();
    await loadPendingDrivers();
  } catch (error) {
    console.error('Error rejecting driver:', error);
    showToast('Failed to reject driver: ' + error.message, 'error');
  }
}

/* ================== HELPER FUNCTIONS ================== */

function loadingState() {
  return `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-sm text-muted mt-2">Loading...</p>
    </div>
  `;
}

function emptyState(message) {
  return `
    <div class="card">
      <div class="card-body text-center py-5">
        <i class="fas fa-inbox text-muted" style="font-size: 3rem;"></i>
        <p class="text-sm text-secondary mt-3 mb-0">${message}</p>
      </div>
    </div>
  `;
}

function errorState(message) {
  return `
    <div class="card">
      <div class="card-body text-center py-5">
        <i class="fas fa-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
        <p class="text-sm text-danger mt-3 mb-0">${message}</p>
        <button class="btn btn-sm btn-outline-primary mt-3" onclick="loadCurrentTab()">
          <i class="fas fa-redo me-1"></i> Try Again
        </button>
      </div>
    </div>
  `;
}