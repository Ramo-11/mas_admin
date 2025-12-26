class UserManager {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentUserId = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUsers();
    }

    bindEvents() {
        // Create user button
        const createBtn = document.getElementById('create-user-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openModal());
        }

        // Modal close buttons
        const closeModalBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-btn');
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Save user button
        document.getElementById('save-user-btn').addEventListener('click', () => this.saveUser());

        // Role change - toggle events and permissions sections
        document.getElementById('user-role').addEventListener('change', (e) => {
            const eventsGroup = document.getElementById('events-group');
            const permissionsGroup = document.getElementById('permissions-group');
            const isEventAdmin = e.target.value === 'event_admin';
            eventsGroup.style.display = isEventAdmin ? 'block' : 'none';
            permissionsGroup.style.display = isEventAdmin ? 'block' : 'none';
        });

        // Search and filters
        document.getElementById('search').addEventListener('input', () => this.filterUsers());
        document.getElementById('filter-role').addEventListener('change', () => this.filterUsers());
        document.getElementById('filter-status').addEventListener('change', () => this.filterUsers());

        // Confirmation modal
        document.getElementById('close-confirm-modal').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('cancel-confirm-btn').addEventListener('click', () => this.closeConfirmModal());

        // Close modals on outside click
        document.getElementById('user-modal').addEventListener('click', (e) => {
            if (e.target.id === 'user-modal') this.closeModal();
        });
        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') this.closeConfirmModal();
        });
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();

            if (response.ok) {
                this.users = data.users;
                this.filterUsers();
                this.updateStats();
            } else {
                this.showNotification(data.message || 'Failed to load users', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showNotification('Failed to load users', 'error');
        }
    }

    filterUsers() {
        const search = document.getElementById('search').value.toLowerCase();
        const roleFilter = document.getElementById('filter-role').value;
        const statusFilter = document.getElementById('filter-status').value;

        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(search) ||
                                  user.email.toLowerCase().includes(search);
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesStatus = !statusFilter ||
                                  (statusFilter === 'active' && user.isActive) ||
                                  (statusFilter === 'inactive' && !user.isActive);

            return matchesSearch && matchesRole && matchesStatus;
        });

        this.renderUsers();
    }

    updateStats() {
        const total = this.users.length;
        const superAdmins = this.users.filter(u => u.role === 'super_admin').length;
        const eventAdmins = this.users.filter(u => u.role === 'event_admin').length;
        const inactive = this.users.filter(u => !u.isActive).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-super').textContent = superAdmins;
        document.getElementById('stat-event').textContent = eventAdmins;
        document.getElementById('stat-inactive').textContent = inactive;
    }

    renderUsers() {
        const tbody = document.getElementById('users-table');

        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-users"></i>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredUsers.map(user => this.renderUserRow(user)).join('');

        // Bind action buttons
        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => this.editUser(btn.dataset.id));
        });
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => this.confirmDelete(btn.dataset.id));
        });
    }

    renderUserRow(user) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const eventsCount = user.assignedEvents ? user.assignedEvents.length : 0;
        const eventsText = user.role === 'super_admin'
            ? '<span class="events-count">All Events</span>'
            : eventsCount > 0
                ? `<span class="events-count">${eventsCount} event${eventsCount > 1 ? 's' : ''}</span>`
                : '<span class="events-count none">None assigned</span>';

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${initials}</div>
                        <span class="user-name">${this.escapeHtml(user.name)}</span>
                    </div>
                </td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role === 'super_admin' ? 'Super Admin' : 'Event Admin'}
                    </span>
                </td>
                <td>${eventsText}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit edit-btn" data-id="${user._id}" title="Edit user">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="action-btn delete delete-btn" data-id="${user._id}" title="Delete user">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    openModal(user = null) {
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('modal-title');
        const passwordHint = document.getElementById('password-hint');
        const passwordInput = document.getElementById('user-password');
        const eventsGroup = document.getElementById('events-group');
        const permissionsGroup = document.getElementById('permissions-group');
        const form = document.getElementById('user-form');

        if (!modal) {
            console.error('Modal element not found');
            return;
        }

        if (user) {
            if (title) title.textContent = 'Edit User';
            if (passwordHint) passwordHint.textContent = '(leave blank to keep current)';
            if (passwordInput) passwordInput.required = false;

            const userIdInput = document.getElementById('user-id');
            const userNameInput = document.getElementById('user-name');
            const userEmailInput = document.getElementById('user-email');
            const userRoleSelect = document.getElementById('user-role');
            const userActiveCheck = document.getElementById('user-active');
            const permDeleteEvents = document.getElementById('perm-delete-events');
            const permDeleteRegistrations = document.getElementById('perm-delete-registrations');

            if (userIdInput) userIdInput.value = user._id;
            if (userNameInput) userNameInput.value = user.name;
            if (userEmailInput) userEmailInput.value = user.email;
            if (passwordInput) passwordInput.value = '';
            if (userRoleSelect) userRoleSelect.value = user.role;
            if (userActiveCheck) userActiveCheck.checked = user.isActive;

            // Set permissions
            if (permDeleteEvents) permDeleteEvents.checked = user.permissions?.canDeleteEvents || false;
            if (permDeleteRegistrations) permDeleteRegistrations.checked = user.permissions?.canDeleteRegistrations || false;

            // Set assigned events
            const eventCheckboxes = document.querySelectorAll('input[name="assignedEvents"]');
            const assignedIds = user.assignedEvents ? user.assignedEvents.map(e => e._id || e) : [];
            eventCheckboxes.forEach(cb => {
                cb.checked = assignedIds.includes(cb.value);
            });

            const isEventAdmin = user.role === 'event_admin';
            if (eventsGroup) eventsGroup.style.display = isEventAdmin ? 'block' : 'none';
            if (permissionsGroup) permissionsGroup.style.display = isEventAdmin ? 'block' : 'none';
        } else {
            if (title) title.textContent = 'Add User';
            if (passwordHint) passwordHint.textContent = '(required)';
            if (passwordInput) passwordInput.required = true;
            if (form) form.reset();

            const userIdInput = document.getElementById('user-id');
            const userActiveCheck = document.getElementById('user-active');
            const permDeleteEvents = document.getElementById('perm-delete-events');
            const permDeleteRegistrations = document.getElementById('perm-delete-registrations');

            if (userIdInput) userIdInput.value = '';
            if (userActiveCheck) userActiveCheck.checked = true;
            if (permDeleteEvents) permDeleteEvents.checked = false;
            if (permDeleteRegistrations) permDeleteRegistrations.checked = false;
            if (eventsGroup) eventsGroup.style.display = 'block';
            if (permissionsGroup) permissionsGroup.style.display = 'block';
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('user-modal').classList.remove('active');
    }

    editUser(userId) {
        const user = this.users.find(u => u._id === userId);
        if (user) {
            this.openModal(user);
        }
    }

    async saveUser() {
        const userId = document.getElementById('user-id').value;
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const role = document.getElementById('user-role').value;
        const isActive = document.getElementById('user-active').checked;

        // Get assigned events
        const assignedEvents = Array.from(document.querySelectorAll('input[name="assignedEvents"]:checked'))
            .map(cb => cb.value);

        // Get permissions
        const canDeleteEvents = document.getElementById('perm-delete-events').checked;
        const canDeleteRegistrations = document.getElementById('perm-delete-registrations').checked;

        if (!name || !email) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        if (!userId && !password) {
            this.showNotification('Password is required for new users', 'error');
            return;
        }

        const userData = {
            name,
            email,
            role,
            isActive,
            assignedEvents: role === 'event_admin' ? assignedEvents : [],
            permissions: role === 'event_admin' ? {
                canDeleteEvents,
                canDeleteRegistrations,
            } : {
                canDeleteEvents: false,
                canDeleteRegistrations: false,
            },
        };

        if (password) {
            userData.password = password;
        }

        try {
            const url = userId ? `/api/users/${userId}` : '/api/users';
            const method = userId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(data.message || 'User saved successfully', 'success');
                this.closeModal();
                this.loadUsers();
            } else {
                this.showNotification(data.message || 'Failed to save user', 'error');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showNotification('Failed to save user', 'error');
        }
    }

    confirmDelete(userId) {
        this.currentUserId = userId;
        const user = this.users.find(u => u._id === userId);

        document.getElementById('confirm-message').textContent =
            `Are you sure you want to deactivate ${user.name}? They will no longer be able to log in.`;
        document.getElementById('confirm-modal').classList.add('active');

        document.getElementById('proceed-confirm-btn').onclick = () => this.deleteUser();
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('active');
        this.currentUserId = null;
    }

    async deleteUser() {
        if (!this.currentUserId) return;

        try {
            const response = await fetch(`/api/users/${this.currentUserId}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification(data.message || 'User deactivated', 'success');
                this.closeConfirmModal();
                this.loadUsers();
            } else {
                this.showNotification(data.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showNotification('Failed to delete user', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UserManager();
});
