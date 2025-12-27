const API_BASE = '/api/admin';
const AUTH_API = '/api/auth';
const MANUAL_RECHARGE_API = '/api/manual-recharge';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('adminToken');
}

// Set auth header for requests
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
    };
}

// Check authentication
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        window.location.href = '/';
    }
}

// Navigation
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeBtn = document.getElementById('closeBtn');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const pageTitle = document.querySelector('.page-title');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Load admin info
    loadAdminInfo();

    initNavigation();
    loadDashboard();
    setupEventListeners();
});

// Load admin information
async function loadAdminInfo() {
    try {
        const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
        document.getElementById('adminName').textContent = adminData.full_name || adminData.username || 'Administrator';

        // Show CEO approval and admin management links if CEO
        if (adminData.role === 'ceo') {
            document.getElementById('ceoApprovalLink').style.display = 'block';
            document.getElementById('adminManagementLink').style.display = 'block';
        } else {
            // Hide Financial Numbers for non-CEO
            const manageNumbersLink = document.querySelector('.nav-link[data-page="manage-numbers"]');
            if (manageNumbersLink) {
                manageNumbersLink.parentElement.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading admin info:', error);
    }
}

// Navigation Functions
function initNavigation() {
    // Check if screen is large enough for sidebar to be always visible
    if (window.innerWidth >= 768) {
        sidebar.classList.add('active');
    }
}

function setupEventListeners() {
    // Menu toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768) {
            if (!sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            switchPage(page);
            if (window.innerWidth < 768) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', () => {
            clearTimeout(usersSearchTimeout);
            usersSearchTimeout = setTimeout(() => {
                currentUsersPage = 1;
                loadUsers();
            }, 500);
        });
    }

    // Payment filter
    const paymentFilter = document.getElementById('paymentFilter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', () => {
            currentPaymentsPage = 1;
            loadPayments();
        });
    }

    // Withdrawal filter
    const withdrawalFilter = document.getElementById('withdrawalFilter');
    if (withdrawalFilter) {
        withdrawalFilter.addEventListener('change', () => {
            currentWithdrawalsPage = 1;
            loadWithdrawals();
        });
    }

    // Withdrawal form
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', handleWithdrawalUpdate);
    }

    // Add Number form
    const addNumberForm = document.getElementById('addNumberFormMain');
    if (addNumberForm) {
        addNumberForm.addEventListener('submit', handleAddNumber);
    }
}

function switchPage(pageName) {
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });

    // Update active page
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageName) {
            page.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'User Management',
        payments: 'Payment Management',
        withdrawals: 'Withdrawal Management',
        tasks: 'Task Management',
        'invitation-codes': 'Invitation Codes',
        reports: 'Financial Reports',
        approvals: 'Pending Approvals',
        'manual-recharges': 'Manual Recharges',
        'manage-numbers': 'Financial Numbers',
        'admin-management': 'Admin Management',
        profile: 'Profile Settings',
        settings: 'Settings'
    };

    // Check permission for CEO-only pages
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    if (['approvals', 'admin-management', 'manage-numbers'].includes(pageName) && adminData.role !== 'ceo') {
        alert('Access denied. CEO privileges required.');
        switchPage('dashboard');
        return;
    }

    pageTitle.textContent = titles[pageName] || 'Admin Portal';

    // Load page data
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'users':
            loadUsers();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'withdrawals':
            loadWithdrawals();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'approvals':
            loadPendingApprovals();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'manual-recharges':
            loadManualRecharges();
            break;
        case 'manage-numbers':
            loadRotatingNumbers();
            break;
        case 'admin-management':
            loadAdminUsers();
            break;
        case 'settings':
            updateSettings();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (!result.success && result.message?.includes('token')) {
            logout();
            return;
        }

        if (result.success) {
            const data = result.data;

            // Update stats
            document.getElementById('totalUsers').textContent = data.users.total;
            document.getElementById('activeUsers').textContent = `${data.users.active} Active`;
            document.getElementById('totalPayments').textContent = data.payments.total;
            document.getElementById('paymentAmount').textContent = `KES ${formatNumber(data.payments.totalAmount)}`;
            document.getElementById('totalWithdrawals').textContent = data.withdrawals.total;
            document.getElementById('withdrawalAmount').textContent = `KES ${formatNumber(data.withdrawals.totalAmount)}`;
            document.getElementById('totalTasks').textContent = data.tasks.total;
            document.getElementById('totalWallet').textContent = `KES ${formatNumber(data.wallet.totalBalance)}`;
            document.getElementById('totalEarnings').textContent = `KES ${formatNumber(data.earnings.total)}`;

            // Update pending actions
            document.getElementById('pendingPayments').textContent = `${data.payments.pending} payments awaiting confirmation`;
            document.getElementById('pendingWithdrawals').textContent = `${data.withdrawals.pending} withdrawal requests`;

            // Update recent users
            const recentUsersTable = document.getElementById('recentUsersTable');
            if (data.recentUsers.length === 0) {
                recentUsersTable.innerHTML = '<tr><td colspan="4" class="loading">No recent users</td></tr>';
            } else {
                recentUsersTable.innerHTML = data.recentUsers.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.phone}</td>
                        <td>${formatDate(user.created_at)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Users
let currentUsersPage = 1;
let usersSearchTimeout;

async function loadUsers(page = 1) {
    try {
        const search = document.getElementById('userSearch')?.value || '';
        const response = await fetch(`${API_BASE}/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const usersTable = document.getElementById('usersTable');
            if (result.data.length === 0) {
                usersTable.innerHTML = '<tr><td colspan="8" class="loading">No users found</td></tr>';
            } else {
                usersTable.innerHTML = result.data.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.phone}</td>
                        <td>${user.email || '-'}</td>
                        <td>KES ${formatNumber(user.wallet_balance)}</td>
                        <td>KES ${formatNumber(user.total_earnings)}</td>
                        <td>${user.level}</td>
                        <td>
                            <button class="btn-action btn-view" onclick="viewUser(${user.id})">View</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Update pagination
            currentUsersPage = page;
            updatePagination('usersPagination', result.pagination, loadUsers);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function viewUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const user = result.data.user;
            const modalContent = document.getElementById('userModalContent');
            modalContent.innerHTML = `
                <div class="info-item">
                    <label>Name:</label>
                    <span>${user.name}</span>
                </div>
                <div class="info-item">
                    <label>Phone:</label>
                    <span>${user.phone}</span>
                </div>
                <div class="info-item">
                    <label>Email:</label>
                    <span>${user.email || '-'}</span>
                </div>
                <div class="info-item">
                    <label>Wallet Balance:</label>
                    <span>KES ${formatNumber(user.wallet_balance)}</span>
                </div>
                <div class="info-item">
                    <label>Total Earnings:</label>
                    <span>KES ${formatNumber(user.total_earnings)}</span>
                </div>
                <div class="info-item">
                    <label>Level:</label>
                    <span>${user.level}</span>
                </div>
                <div class="info-item">
                    <label>Joined:</label>
                    <span>${formatDate(user.created_at)}</span>
                </div>
                <div class="info-item">
                    <label>Last Login:</label>
                    <span>${user.last_login ? formatDate(user.last_login) : 'Never'}</span>
                </div>
                <h3 style="margin-top: 20px; margin-bottom: 10px;">Payments (${result.data.payments.length})</h3>
                <div class="table-container" style="max-height: 200px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.data.payments.map(p => `
                                <tr>
                                    <td>KES ${formatNumber(p.amount)}</td>
                                    <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                                    <td>${formatDate(p.created_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            document.getElementById('userModal').classList.add('active');
            return user;
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        return null;
    }
}

// Payments
let currentPaymentsPage = 1;

async function loadPayments(page = 1) {
    try {
        const status = document.getElementById('paymentFilter')?.value || '';
        const response = await fetch(`${API_BASE}/payments?page=${page}&limit=20&status=${status}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const paymentsTable = document.getElementById('paymentsTable');
            if (result.data.length === 0) {
                paymentsTable.innerHTML = '<tr><td colspan="7" class="loading">No payments found</td></tr>';
            } else {
                paymentsTable.innerHTML = result.data.map(payment => `
                    <tr>
                        <td>${payment.id}</td>
                        <td>${payment.user_name || '-'}</td>
                        <td>${payment.phone_number}</td>
                        <td>KES ${formatNumber(payment.amount)}</td>
                        <td>${payment.payment_type}</td>
                        <td><span class="status-badge status-${payment.status}">${payment.status}</span></td>
                        <td>${formatDate(payment.created_at)}</td>
                    </tr>
                `).join('');
            }

            currentPaymentsPage = page;
            updatePagination('paymentsPagination', result.pagination, loadPayments);
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Withdrawals
let currentWithdrawalsPage = 1;

async function loadWithdrawals(page = 1) {
    try {
        const status = document.getElementById('withdrawalFilter')?.value || '';
        const response = await fetch(`${API_BASE}/withdrawals?page=${page}&limit=20&status=${status}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const withdrawalsTable = document.getElementById('withdrawalsTable');
            if (result.data.length === 0) {
                withdrawalsTable.innerHTML = '<tr><td colspan="8" class="loading">No withdrawals found</td></tr>';
            } else {
                withdrawalsTable.innerHTML = result.data.map(withdrawal => `
                    <tr>
                        <td>${withdrawal.id}</td>
                        <td>${withdrawal.user_name || '-'}</td>
                        <td>KES ${formatNumber(withdrawal.amount)}</td>
                        <td>${withdrawal.bank_name}</td>
                        <td>${withdrawal.account_number}</td>
                        <td><span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span></td>
                        <td>${formatDate(withdrawal.request_date)}</td>
                        <td>
                            <button class="btn-action btn-update" onclick="openWithdrawalModal(${withdrawal.id}, '${withdrawal.status}')">Update</button>
                        </td>
                    </tr>
                `).join('');
            }

            currentWithdrawalsPage = page;
            updatePagination('withdrawalsPagination', result.pagination, loadWithdrawals);
        }
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

function openWithdrawalModal(id, currentStatus) {
    document.getElementById('withdrawalId').value = id;
    document.getElementById('withdrawalStatus').value = currentStatus;
    document.getElementById('withdrawalNotes').value = '';
    document.getElementById('withdrawalModal').classList.add('active');
}

async function handleWithdrawalUpdate(e) {
    e.preventDefault();

    const id = document.getElementById('withdrawalId').value;
    const status = document.getElementById('withdrawalStatus').value;
    const notes = document.getElementById('withdrawalNotes').value;

    try {
        const response = await fetch(`${API_BASE}/withdrawals/${id}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status, notes })
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById('withdrawalModal').classList.remove('active');
            loadWithdrawals(currentWithdrawalsPage);
            alert('Withdrawal status updated successfully');
        } else {
            alert('Failed to update withdrawal status');
        }
    } catch (error) {
        console.error('Error updating withdrawal:', error);
        alert('Error updating withdrawal status');
    }
}

// Tasks
let currentTasksPage = 1;

async function loadTasks(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/tasks?page=${page}&limit=20`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const tasksTable = document.getElementById('tasksTable');
            if (result.data.length === 0) {
                tasksTable.innerHTML = '<tr><td colspan="6" class="loading">No tasks found</td></tr>';
            } else {
                tasksTable.innerHTML = result.data.map(task => `
                    <tr>
                        <td>${task.id}</td>
                        <td>${task.user_name || '-'}</td>
                        <td>${task.task_name}</td>
                        <td>${task.is_correct ? '✓' : '✗'}</td>
                        <td>KES ${formatNumber(task.reward_amount)}</td>
                        <td>${formatDate(task.completed_at)}</td>
                    </tr>
                `).join('');
            }

            currentTasksPage = page;
            updatePagination('tasksPagination', result.pagination, loadTasks);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Settings
function updateSettings() {
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
}

// Utility Functions
function formatNumber(num) {
    return new Intl.NumberFormat('en-KE').format(num);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updatePagination(elementId, pagination, loadFunction) {
    const paginationEl = document.getElementById(elementId);
    if (!paginationEl) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = pagination.page === 1;
    prevBtn.onclick = () => loadFunction(pagination.page - 1);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = pagination.page === pagination.totalPages;
    nextBtn.onclick = () => loadFunction(pagination.page + 1);

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;

    paginationEl.innerHTML = '';
    paginationEl.appendChild(prevBtn);
    paginationEl.appendChild(pageInfo);
    paginationEl.appendChild(nextBtn);
}

// User Management Actions
async function openEditUserModal(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const user = result.data.user;

            document.getElementById('editUserId').value = userId;
            document.getElementById('editUserName').value = user.name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phone || '';
            document.getElementById('editUserWallet').value = user.wallet_balance || 0;
            document.getElementById('editUserEarnings').value = user.total_earnings || 0;
            document.getElementById('editUserLevel').value = user.level || 0;

            document.getElementById('userEditModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading user for edit:', error);
        alert('Error loading user data');
    }
}

function openWalletAdjustModal(userId) {
    document.getElementById('walletUserId').value = userId;
    document.getElementById('walletAdjustAmount').value = '';
    document.getElementById('walletAdjustDescription').value = '';
    document.getElementById('walletAdjustModal').classList.add('active');
}

function openPasswordResetModal(userId) {
    document.getElementById('passwordResetUserId').value = userId;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordResetModal').classList.add('active');
}

async function deleteUserConfirm(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            alert('User deleted successfully');
            loadUsers(currentUsersPage);
        } else {
            alert('Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
    }
}

// Payment Management
function openCreatePaymentModal() {
    document.getElementById('paymentUserId').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentType').value = 'recharge';
    document.getElementById('paymentPhone').value = '';
    document.getElementById('paymentDescription').value = '';
    document.getElementById('createPaymentModal').classList.add('active');
}

function openPaymentStatusModal(paymentId, currentStatus) {
    document.getElementById('paymentStatusId').value = paymentId;
    document.getElementById('paymentStatusSelect').value = currentStatus;
    document.getElementById('paymentStatusModal').classList.add('active');
}

async function deletePaymentConfirm(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/payments/${paymentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            alert('Payment deleted successfully');
            loadPayments(currentPaymentsPage);
        } else {
            alert('Failed to delete payment');
        }
    } catch (error) {
        console.error('Error deleting payment:', error);
        alert('Error deleting payment');
    }
}

// Invitation Codes
async function loadInvitationCodes() {
    try {
        const response = await fetch(`${API_BASE}/invitation-codes`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const codesTable = document.getElementById('invitationCodesTable');
            if (result.data.length === 0) {
                codesTable.innerHTML = '<tr><td colspan="8" class="loading">No invitation codes found</td></tr>';
            } else {
                codesTable.innerHTML = result.data.map(code => `
                    <tr>
                        <td>${code.id}</td>
                        <td>${code.code}</td>
                        <td>${code.creator_name || '-'}</td>
                        <td>${code.used_by_name || '-'}</td>
                        <td><span class="status-badge ${code.is_active ? 'status-success' : 'status-failed'}">${code.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>${formatDate(code.created_at)}</td>
                        <td>${code.used_at ? formatDate(code.used_at) : '-'}</td>
                        <td>
                            <button class="btn-action btn-update" onclick="toggleInvitationCode(${code.id}, ${!code.is_active})">${code.is_active ? 'Deactivate' : 'Activate'}</button>
                            <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="deleteInvitationCodeConfirm(${code.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading invitation codes:', error);
    }
}

function openCreateInvitationCodeModal() {
    document.getElementById('invitationCode').value = '';
    document.getElementById('invitationCreatedBy').value = '';
    document.getElementById('createInvitationCodeModal').classList.add('active');
}

async function toggleInvitationCode(id, isActive) {
    try {
        const response = await fetch(`${API_BASE}/invitation-codes/${id}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_active: isActive })
        });

        const result = await response.json();

        if (result.success) {
            loadInvitationCodes();
        } else {
            alert('Failed to update invitation code status');
        }
    } catch (error) {
        console.error('Error updating invitation code:', error);
        alert('Error updating invitation code');
    }
}

async function deleteInvitationCodeConfirm(id) {
    if (!confirm('Are you sure you want to delete this invitation code?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/invitation-codes/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (result.success) {
            alert('Invitation code deleted successfully');
            loadInvitationCodes();
        } else {
            alert('Failed to delete invitation code');
        }
    } catch (error) {
        console.error('Error deleting invitation code:', error);
        alert('Error deleting invitation code');
    }
}

// Reports
async function loadFinancialReport() {
    try {
        const [financialResponse, systemResponse] = await Promise.all([
            fetch(`${API_BASE}/reports/financial`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/reports/system`, { headers: getAuthHeaders() })
        ]);

        const financialResult = await financialResponse.json();
        const systemResult = await systemResponse.json();

        if (financialResult.success) {
            const data = financialResult.data;
            const summaryDiv = document.getElementById('financialSummary');
            summaryDiv.innerHTML = `
                <div class="info-item">
                    <label>Total Revenue:</label>
                    <span>KES ${formatNumber(data.revenue)}</span>
                </div>
                <div class="info-item">
                    <label>Total Withdrawals:</label>
                    <span>KES ${formatNumber(data.withdrawals)}</span>
                </div>
                <div class="info-item">
                    <label>Net Profit:</label>
                    <span>KES ${formatNumber(data.netProfit)}</span>
                </div>
                <div class="info-item">
                    <label>Total Wallet Balance:</label>
                    <span>KES ${formatNumber(data.totalWalletBalance)}</span>
                </div>
                <div class="info-item">
                    <label>Total Earnings:</label>
                    <span>KES ${formatNumber(data.totalEarnings)}</span>
                </div>
                <h3 style="margin-top: 20px;">Payments by Type</h3>
                <div class="table-container" style="margin-top: 10px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Count</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.paymentsByType.map(p => `
                                <tr>
                                    <td>${p.payment_type}</td>
                                    <td>${p.count}</td>
                                    <td>KES ${formatNumber(p.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        if (systemResult.success) {
            const data = systemResult.data;
            const statsDiv = document.getElementById('systemStats');
            statsDiv.innerHTML = `
                <h3>Recent Activity (Last 24 Hours)</h3>
                <div class="info-item">
                    <label>New Payments:</label>
                    <span>${data.recentActivity.payments}</span>
                </div>
                <div class="info-item">
                    <label>New Users:</label>
                    <span>${data.recentActivity.users}</span>
                </div>
                <div class="info-item">
                    <label>Completed Tasks:</label>
                    <span>${data.recentActivity.tasks}</span>
                </div>
                <h3 style="margin-top: 20px;">Database Statistics</h3>
                <div class="table-container" style="margin-top: 10px;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Table</th>
                                <th>Rows</th>
                                <th>Size (MB)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.tableStats.map(t => `
                                <tr>
                                    <td>${t.table_name}</td>
                                    <td>${formatNumber(t.table_rows)}</td>
                                    <td>${t.size_mb}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Update switchPage to handle new pages
const originalSwitchPage = switchPage;
switchPage = function (pageName) {
    originalSwitchPage(pageName);

    if (pageName === 'invitation-codes') {
        loadInvitationCodes();
    } else if (pageName === 'reports') {
        loadFinancialReport();
    }
};

// Form handlers
document.addEventListener('DOMContentLoaded', () => {
    // User Edit Form
    const userEditForm = document.getElementById('userEditForm');
    if (userEditForm) {
        userEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('editUserId').value;
            const name = document.getElementById('editUserName').value;
            const email = document.getElementById('editUserEmail').value;
            const phone = document.getElementById('editUserPhone').value;
            const wallet = document.getElementById('editUserWallet').value;
            const earnings = document.getElementById('editUserEarnings').value;
            const level = document.getElementById('editUserLevel').value;

            try {
                // Update details
                await fetch(`${API_BASE}/users/${userId}/details`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ name, email, phone })
                });

                // Update wallet, earnings, level
                await fetch(`${API_BASE}/users/${userId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        wallet_balance: wallet,
                        total_earnings: earnings,
                        level: level
                    })
                });

                document.getElementById('userEditModal').classList.remove('active');
                loadUsers(currentUsersPage);
                alert('User updated successfully');
            } catch (error) {
                console.error('Error updating user:', error);
                alert('Error updating user');
            }
        });
    }

    // Wallet Adjust Form
    const walletAdjustForm = document.getElementById('walletAdjustForm');
    if (walletAdjustForm) {
        walletAdjustForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('walletUserId').value;
            const amount = document.getElementById('walletAdjustAmount').value;
            const type = document.getElementById('walletAdjustType').value;
            const description = document.getElementById('walletAdjustDescription').value;

            try {
                const response = await fetch(`${API_BASE}/users/${userId}/wallet/adjust`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ amount, type, description })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('walletAdjustModal').classList.remove('active');
                    loadUsers(currentUsersPage);
                    alert('Wallet adjusted successfully');
                } else {
                    alert(result.message || 'Failed to adjust wallet');
                }
            } catch (error) {
                console.error('Error adjusting wallet:', error);
                alert('Error adjusting wallet');
            }
        });
    }

    // Password Reset Form
    const passwordResetForm = document.getElementById('passwordResetForm');
    if (passwordResetForm) {
        passwordResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = document.getElementById('passwordResetUserId').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/users/${userId}/password/reset`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ newPassword })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('passwordResetModal').classList.remove('active');
                    alert('Password reset successfully');
                } else {
                    alert(result.message || 'Failed to reset password');
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                alert('Error resetting password');
            }
        });
    }

    // Create Payment Form
    const createPaymentForm = document.getElementById('createPaymentForm');
    if (createPaymentForm) {
        createPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user_id = document.getElementById('paymentUserId').value;
            const amount = document.getElementById('paymentAmount').value;
            const payment_type = document.getElementById('paymentType').value;
            const phone_number = document.getElementById('paymentPhone').value;
            const description = document.getElementById('paymentDescription').value;

            try {
                const response = await fetch(`${API_BASE}/payments`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ user_id, amount, payment_type, phone_number, description })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('createPaymentModal').classList.remove('active');
                    loadPayments(currentPaymentsPage);
                    alert('Payment created successfully');
                } else {
                    alert(result.message || 'Failed to create payment');
                }
            } catch (error) {
                console.error('Error creating payment:', error);
                alert('Error creating payment');
            }
        });
    }

    // Payment Status Form
    const paymentStatusForm = document.getElementById('paymentStatusForm');
    if (paymentStatusForm) {
        paymentStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('paymentStatusId').value;
            const status = document.getElementById('paymentStatusSelect').value;

            try {
                const response = await fetch(`${API_BASE}/payments/${id}/status`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ status })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('paymentStatusModal').classList.remove('active');
                    loadPayments(currentPaymentsPage);
                    alert('Payment status updated successfully');
                } else {
                    alert(result.message || 'Failed to update payment status');
                }
            } catch (error) {
                console.error('Error updating payment status:', error);
                alert('Error updating payment status');
            }
        });
    }

    // Create Invitation Code Form
    const createInvitationCodeForm = document.getElementById('createInvitationCodeForm');
    if (createInvitationCodeForm) {
        createInvitationCodeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('invitationCode').value;
            const created_by = document.getElementById('invitationCreatedBy').value || null;

            try {
                const response = await fetch(`${API_BASE}/invitation-codes`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ code, created_by })
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('createInvitationCodeModal').classList.remove('active');
                    loadInvitationCodes();
                    alert('Invitation code created successfully');
                } else {
                    alert(result.message || 'Failed to create invitation code');
                }
            } catch (error) {
                console.error('Error creating invitation code:', error);
                alert('Error creating invitation code');
            }
        });
    }
});

// Store user data when viewing
const originalViewUser = viewUser;
viewUser = async function (userId) {
    const result = await originalViewUser(userId);
    if (result) {
        sessionStorage.setItem('currentUser', JSON.stringify(result));
    }
    return result;
};

// Update users table to include action buttons
const originalLoadUsers = loadUsers;
loadUsers = async function (page = 1) {
    await originalLoadUsers(page);

    // Update table to include action buttons
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        const rows = usersTable.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const userId = cells[0].textContent;
                if (userId && !isNaN(userId)) {
                    const actionsCell = cells[cells.length - 1];
                    if (actionsCell && !actionsCell.innerHTML.includes('Edit')) {
                        actionsCell.innerHTML = `
                            <button class="btn-action btn-view" onclick="viewUser(${userId})">View</button>
                            <button class="btn-action btn-update" onclick="openEditUserModal(${userId})">Edit</button>
                            <button class="btn-action" style="background: var(--primary-color); color: white;" onclick="openWalletAdjustModal(${userId})">Wallet</button>
                            <button class="btn-action" style="background: var(--warning-color); color: white;" onclick="openPasswordResetModal(${userId})">Reset Pwd</button>
                            <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="deleteUserConfirm(${userId})">Delete</button>
                        `;
                    }
                }
            }
        });
    }
};

// Update payments table to include action buttons
const originalLoadPayments = loadPayments;
loadPayments = async function (page = 1) {
    await originalLoadPayments(page);

    // Update table to include action buttons
    const paymentsTable = document.getElementById('paymentsTable');
    if (paymentsTable) {
        const rows = paymentsTable.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const paymentId = cells[0].textContent;
                if (paymentId && !isNaN(paymentId)) {
                    const statusCell = cells[5];
                    const status = statusCell ? statusCell.textContent.trim().toLowerCase() : '';
                    const actionsCell = cells[cells.length - 1];
                    if (actionsCell && !actionsCell.innerHTML.includes('Update')) {
                        actionsCell.innerHTML = `
                            <button class="btn-action btn-update" onclick="openPaymentStatusModal(${paymentId}, '${status}')">Update</button>
                            <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="deletePaymentConfirm(${paymentId})">Delete</button>
                        `;
                    }
                }
            }
        });
    }
};

// Make functions available globally
window.viewUser = viewUser;
window.openWithdrawalModal = openWithdrawalModal;
window.openEditUserModal = openEditUserModal;
window.openWalletAdjustModal = openWalletAdjustModal;
window.openPasswordResetModal = openPasswordResetModal;
window.deleteUserConfirm = deleteUserConfirm;
window.openCreatePaymentModal = openCreatePaymentModal;
window.openPaymentStatusModal = openPaymentStatusModal;
window.deletePaymentConfirm = deletePaymentConfirm;
window.loadInvitationCodes = loadInvitationCodes;
window.openCreateInvitationCodeModal = openCreateInvitationCodeModal;
window.toggleInvitationCode = toggleInvitationCode;
window.deleteInvitationCodeConfirm = deleteInvitationCodeConfirm;
window.loadFinancialReport = loadFinancialReport;
window.logout = logout;

// Pending Approvals (CEO Only)
async function loadPendingApprovals() {
    try {
        const response = await fetch(`${AUTH_API}/pending-approvals`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const table = document.getElementById('pendingApprovalsTable');
            if (result.data.length === 0) {
                table.innerHTML = '<tr><td colspan="7" class="loading">No pending approvals</td></tr>';
            } else {
                table.innerHTML = result.data.map(admin => `
                    <tr>
                        <td>${admin.id}</td>
                        <td>${admin.full_name}</td>
                        <td>${admin.username}</td>
                        <td>${admin.email}</td>
                        <td>${admin.role}</td>
                        <td>${formatDate(admin.created_at)}</td>
                        <td>
                            <button class="btn-action btn-view" onclick="approveAdmin(${admin.id}, 'approve')">Approve</button>
                            <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="approveAdmin(${admin.id}, 'reject')">Reject</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

async function approveAdmin(id, action) {
    if (!confirm(`Are you sure you want to ${action} this admin?`)) {
        return;
    }

    try {
        const response = await fetch(`${AUTH_API}/approve/${id}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ action })
        });

        const result = await response.json();

        if (result.success) {
            alert(`Admin ${action}d successfully`);
            loadPendingApprovals();
        } else {
            alert(result.message || 'Failed to process approval');
        }
    } catch (error) {
        console.error('Error approving admin:', error);
        alert('Error processing approval');
    }
}

// Profile Management
async function loadProfile() {
    try {
        const response = await fetch(`${AUTH_API}/profile`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            document.getElementById('profileFullName').value = data.full_name || '';
            document.getElementById('profileEmail').value = data.email || '';
            document.getElementById('profileUsername').value = data.username || '';
            document.getElementById('profileRole').textContent = data.role.toUpperCase();
            document.getElementById('profileStatus').textContent = data.status.charAt(0).toUpperCase() + data.status.slice(1);
            document.getElementById('profileLastLogin').textContent = data.last_login ? formatDate(data.last_login) : 'Never';
            document.getElementById('profileCreatedAt').textContent = formatDate(data.created_at);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Profile form handlers
document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const full_name = document.getElementById('profileFullName').value;
            const email = document.getElementById('profileEmail').value;

            try {
                const response = await fetch(`${AUTH_API}/profile`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ full_name, email })
                });

                const result = await response.json();

                if (result.success) {
                    alert('Profile updated successfully');
                    loadProfile();
                    loadAdminInfo(); // Refresh admin info
                } else {
                    alert(result.message || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile');
            }
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPasswordProfile').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }

            try {
                const response = await fetch(`${AUTH_API}/profile`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('Password changed successfully');
                    changePasswordForm.reset();
                } else {
                    alert(result.message || 'Failed to change password');
                }
            } catch (error) {
                console.error('Error changing password:', error);
                alert('Error changing password');
            }
        });
    }
});

// Manual Recharges
async function loadManualRecharges() {
    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/requests`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const table = document.getElementById('manualRechargesTable');
            if (!table) return;

            if (result.data.length === 0) {
                table.innerHTML = '<tr><td colspan="9" class="loading">No manual recharge requests found</td></tr>';
            } else {
                table.innerHTML = result.data.map(req => `
                    <tr>
                        <td>${req.id}</td>
                        <td>${req.user_name || '-'}</td>
                        <td>${req.user_phone || '-'}</td>
                        <td>KES ${formatNumber(req.amount)}</td>
                        <td><div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${req.mpesa_message}">${req.mpesa_message}</div></td>
                        <td><span class="status-badge status-${req.status}">${req.status}</span></td>
                        <td>${req.admin_notes || '-'}</td>
                        <td>${formatDate(req.created_at)}</td>
                        <td>
                            ${req.status === 'pending' ? `
                                <button class="btn-action btn-update" onclick="approveManualRecharge(${req.id}, ${req.amount})">Approve</button>
                                <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="rejectManualRecharge(${req.id})">Reject</button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading manual recharges:', error);
    }
}

async function approveManualRecharge(id, amount) {
    const notes = prompt(`Enter approval notes for recharge ID ${id} (Amount: KES ${amount}):`, 'Approved by admin');
    if (notes === null) return;

    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/approve/${id}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ admin_notes: notes })
        });
        const result = await response.json();
        if (result.success) {
            alert('Recharge approved successfully');
            loadManualRecharges();
        } else {
            alert(result.message || 'Failed to approve recharge');
        }
    } catch (error) {
        console.error('Error approving recharge:', error);
        alert('Error approving recharge');
    }
}

async function rejectManualRecharge(id) {
    const notes = prompt(`Enter rejection reason for recharge ID ${id}:`);
    if (notes === null) return;

    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/reject/${id}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ admin_notes: notes })
        });
        const result = await response.json();
        if (result.success) {
            alert('Recharge rejected');
            loadManualRecharges();
        } else {
            alert(result.message || 'Failed to reject recharge');
        }
    } catch (error) {
        console.error('Error rejecting recharge:', error);
        alert('Error rejecting recharge');
    }
}

// Rotating Numbers
async function loadRotatingNumbers() {
    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/numbers`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            const table = document.getElementById('rotatingNumbersTable');
            if (!table) return;

            if (result.data.length === 0) {
                table.innerHTML = '<tr><td colspan="4" class="loading">No rotating numbers found</td></tr>';
            } else {
                table.innerHTML = result.data.map(num => `
                    <tr>
                        <td>${num.phone_number}</td>
                        <td>${num.account_name}</td>
                        <td><span class="status-badge ${num.is_active ? 'status-success' : 'status-failed'}">${num.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <button class="btn-action btn-update" onclick="toggleNumber(${num.id}, ${num.is_active})">${num.is_active ? 'Deactivate' : 'Activate'}</button>
                            <button class="btn-action" style="background: var(--danger-color); color: white;" onclick="deleteNumber(${num.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading rotating numbers:', error);
    }
}

async function handleAddNumber(e) {
    e.preventDefault();
    const phone_number = document.getElementById('newPhoneNumber').value;
    const account_name = document.getElementById('newAccountName').value;

    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/numbers`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ phone_number, account_name })
        });
        const result = await response.json();
        if (result.success) {
            alert('Number added successfully');
            document.getElementById('addNumberFormMain').reset();
            loadRotatingNumbers();
        } else {
            alert(result.message || 'Failed to add number');
        }
    } catch (error) {
        console.error('Error adding number:', error);
        alert('Error adding number');
    }
}

async function toggleNumber(id, currentStatus) {
    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/numbers/${id}/toggle`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_active: !currentStatus })
        });
        const result = await response.json();
        if (result.success) {
            loadRotatingNumbers();
        }
    } catch (error) {
        console.error('Error toggling number:', error);
    }
}

async function deleteNumber(id) {
    if (!confirm('Are you sure you want to delete this number?')) return;
    try {
        const response = await fetch(`${MANUAL_RECHARGE_API}/numbers/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        if (result.success) {
            loadRotatingNumbers();
        }
    } catch (error) {
        console.error('Error deleting number:', error);
    }
}

window.approveAdmin = approveAdmin;
window.loadManualRecharges = loadManualRecharges;
window.approveManualRecharge = approveManualRecharge;
window.rejectManualRecharge = rejectManualRecharge;
window.loadRotatingNumbers = loadRotatingNumbers;
window.toggleNumber = toggleNumber;
window.deleteNumber = deleteNumber;

// Admin Management (CEO Only)
async function loadAdminUsers() {
    try {
        const table = document.getElementById('adminUsersTable');
        table.innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

        const response = await fetch(`${AUTH_API}/admins`, {
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (result.success) {
            if (result.data.length === 0) {
                table.innerHTML = '<tr><td colspan="8" class="no-data">No admin users found</td></tr>';
            } else {
                table.innerHTML = result.data.map(admin => `
                    <tr>
                        <td>${admin.id}</td>
                        <td>${admin.full_name}</td>
                        <td>${admin.username}</td>
                        <td>${admin.email}</td>
                        <td>${admin.role}</td>
                        <td><span class="status-badge status-${admin.status}">${admin.status}</span></td>
                        <td>${admin.last_login ? formatDate(admin.last_login) : 'Never'}</td>
                        <td>
                            ${admin.role !== 'ceo' ? `
                                <button class="btn-action btn-update" onclick="updateAdminStatus(${admin.id}, '${admin.status === 'suspended' ? 'approved' : 'suspended'}')">
                                    ${admin.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                                <button class="btn-action" onclick="openAdminPasswordResetModal(${admin.id})">Password</button>
                            ` : '-'}
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

async function updateAdminStatus(id, status) {
    if (!confirm(`Are you sure you want to ${status === 'suspended' ? 'suspend' : 'activate'} this admin?`)) return;

    try {
        const response = await fetch(`${AUTH_API}/admins/${id}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message);
            loadAdminUsers();
        } else {
            alert(result.message || 'Failed to update status');
        }
    } catch (error) {
        console.error('Error updating admin status:', error);
        alert('Internal server error');
    }
}

function openAdminPasswordResetModal(id) {
    document.getElementById('adminResetId').value = id;
    document.getElementById('adminNewPassword').value = '';
    document.getElementById('adminConfirmPassword').value = '';
    document.getElementById('adminPasswordResetModal').classList.add('active');
}

// Setup Admin Password Reset Form
const adminPasswordResetForm = document.getElementById('adminPasswordResetForm');
if (adminPasswordResetForm) {
    adminPasswordResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('adminResetId').value;
        const newPassword = document.getElementById('adminNewPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${AUTH_API}/admins/${id}/reset-password`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ newPassword })
            });
            const result = await response.json();

            if (result.success) {
                alert(result.message);
                document.getElementById('adminPasswordResetModal').classList.remove('active');
            } else {
                alert(result.message || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Error resetting admin password:', error);
            alert('Internal server error');
        }
    });
}

window.loadAdminUsers = loadAdminUsers;
window.updateAdminStatus = updateAdminStatus;
window.openAdminPasswordResetModal = openAdminPasswordResetModal;

