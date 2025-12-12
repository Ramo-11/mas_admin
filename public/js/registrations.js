class RegistrationManager {
    constructor() {
        this.registrations = [];
        this.selectedIds = new Set();
        this.currentPage = 1;
        this.totalPages = 1;
        this.limit = 20;
        this.currentRegistration = null;
        this.filters = {
            search: '',
            event: '',
            status: '',
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRegistrations();
    }

    bindEvents() {
        // Search and filters
        const searchInput = document.getElementById('search');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = searchInput.value;
                this.currentPage = 1;
                this.loadRegistrations();
            }, 300);
        });

        document.getElementById('filter-event').addEventListener('change', (e) => {
            this.filters.event = e.target.value;
            this.currentPage = 1;
            this.loadRegistrations();
        });

        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.currentPage = 1;
            this.loadRegistrations();
        });

        // Select all checkbox
        document.getElementById('select-all').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Bulk actions
        document.getElementById('bulk-confirm-btn').addEventListener('click', () => {
            this.bulkUpdateStatus('confirmed');
        });

        document.getElementById('bulk-cancel-btn').addEventListener('click', () => {
            this.bulkUpdateStatus('cancelled');
        });

        document.getElementById('clear-selection-btn').addEventListener('click', () => {
            this.clearSelection();
        });

        // Export
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportRegistrations();
        });

        // Modal
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('close-modal-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('registration-modal').addEventListener('click', (e) => {
            if (e.target.id === 'registration-modal') this.closeModal();
        });
        document.getElementById('save-registration-btn').addEventListener('click', () => {
            this.saveRegistration();
        });

        // Confirm modal
        document.getElementById('close-confirm-modal').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('cancel-confirm-btn').addEventListener('click', () => this.closeConfirmModal());

        // Delegation for table actions
        document.addEventListener('click', (e) => {
            // View button
            if (e.target.closest('.btn-view')) {
                const id = e.target.closest('.btn-view').dataset.id;
                this.viewRegistration(id);
            }

            // Quick status change
            if (e.target.closest('.btn-confirm')) {
                const id = e.target.closest('.btn-confirm').dataset.id;
                this.quickStatusChange(id, 'confirmed');
            }

            if (e.target.closest('.btn-cancel')) {
                const id = e.target.closest('.btn-cancel').dataset.id;
                this.confirmAction('Cancel this registration?', () => {
                    this.quickStatusChange(id, 'cancelled');
                });
            }

            // Permanent delete
            if (e.target.closest('.btn-delete-permanent')) {
                const id = e.target.closest('.btn-delete-permanent').dataset.id;
                this.confirmAction('Permanently delete this registration? This action cannot be undone.', () => {
                    this.permanentDelete(id);
                });
            }

            // Status dropdown
            if (e.target.closest('.status-dropdown-btn')) {
                const btn = e.target.closest('.status-dropdown-btn');
                const dropdown = e.target.closest('.status-dropdown');
                const menu = dropdown.querySelector('.status-dropdown-menu');

                // Close other open menus
                document.querySelectorAll('.status-dropdown-menu.show').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });

                // Toggle this menu
                if (menu.classList.contains('show')) {
                    menu.classList.remove('show');
                } else {
                    // Position the menu using fixed positioning
                    const rect = btn.getBoundingClientRect();
                    menu.style.top = (rect.bottom + 4) + 'px';
                    menu.style.left = rect.left + 'px';
                    menu.classList.add('show');
                }
                e.stopPropagation();
            }

            if (e.target.closest('.status-dropdown-item')) {
                const item = e.target.closest('.status-dropdown-item');
                const id = item.dataset.id;
                const status = item.dataset.status;
                this.quickStatusChange(id, status);
                item.closest('.status-dropdown-menu').classList.remove('show');
            }

            // Row checkbox
            if (e.target.closest('.row-checkbox')) {
                const checkbox = e.target.closest('.row-checkbox');
                const id = checkbox.dataset.id;
                if (checkbox.checked) {
                    this.selectedIds.add(id);
                } else {
                    this.selectedIds.delete(id);
                }
                this.updateBulkActionsUI();
            }

            // Pagination
            if (e.target.closest('.page-btn')) {
                const btn = e.target.closest('.page-btn');
                if (btn.dataset.page) {
                    this.currentPage = parseInt(btn.dataset.page);
                    this.loadRegistrations();
                }
            }

            // Close dropdowns when clicking outside
            if (!e.target.closest('.status-dropdown')) {
                document.querySelectorAll('.status-dropdown-menu.show').forEach(m => {
                    m.classList.remove('show');
                });
            }
        });

        // Status selector in modal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.status-option')) {
                const option = e.target.closest('.status-option');
                document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                option.querySelector('input').checked = true;
            }
        });
    }

    async loadRegistrations() {
        const tbody = document.getElementById('registrations-table');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </td>
            </tr>
        `;

        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                search: this.filters.search,
                status: this.filters.status,
                event: this.filters.event,
            });

            const res = await fetch(`/api/registrations?${params}`);
            const data = await res.json();

            this.registrations = data.registrations || [];
            this.totalPages = data.totalPages || 1;

            this.renderRegistrations();
            this.renderPagination(data);
            this.updateSelectAllState();
        } catch (err) {
            console.error('Failed to load registrations:', err);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <h3>Failed to load registrations</h3>
                            <p>Please try refreshing the page</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // Helper to safely get registration data as a plain object
    getRegData(registrationData) {
        if (!registrationData) return {};
        // If it's already a plain object, return it
        if (typeof registrationData === 'object' && !Array.isArray(registrationData)) {
            // Check if it's a Map-like structure from Mongoose or already plain object
            if (registrationData instanceof Map) {
                return Object.fromEntries(registrationData);
            }
            return registrationData;
        }
        return {};
    }

    renderRegistrations() {
        const tbody = document.getElementById('registrations-table');

        if (!this.registrations.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>No registrations found</h3>
                            <p>Registrations will appear here when people sign up for events</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.registrations.map(reg => {
            const regData = this.getRegData(reg.registrationData);
            const name = regData.fullName || regData.name || regData.firstName || '';
            const phone = regData.phone || regData.phoneNumber || '';
            const eventDate = reg.event?.eventDate
                ? new Date(reg.event.eventDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                })
                : '';
            const registeredDate = new Date(reg.registeredAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const registeredTime = new Date(reg.registeredAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            const statusIcon = {
                confirmed: 'fa-check-circle',
                pending: 'fa-clock',
                waitlisted: 'fa-hourglass-half',
                cancelled: 'fa-times-circle'
            };

            return `
                <tr data-id="${reg._id}">
                    <td class="checkbox-col">
                        <label class="checkbox-container">
                            <input type="checkbox" class="row-checkbox" data-id="${reg._id}" ${this.selectedIds.has(reg._id) ? 'checked' : ''} />
                            <span class="checkmark"></span>
                        </label>
                    </td>
                    <td>
                        <div class="registrant-info">
                            <span class="email">${this.escapeHtml(reg.email)}</span>
                            ${name ? `<span class="name">${this.escapeHtml(name)}</span>` : ''}
                            ${phone ? `<span class="phone"><i class="fas fa-phone"></i> ${this.escapeHtml(phone)}</span>` : ''}
                        </div>
                    </td>
                    <td>
                        ${reg.event ? `
                            <a href="/?event=${reg.event._id}" class="event-link">${this.escapeHtml(reg.event.title)}</a>
                            <div class="event-date">${eventDate}</div>
                        ` : '<span class="text-muted">Event deleted</span>'}
                    </td>
                    <td>
                        <div class="status-dropdown">
                            <span class="badge status-${reg.status}">
                                <i class="fas ${statusIcon[reg.status] || 'fa-question'}"></i>
                                ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                            </span>
                            <button class="status-dropdown-btn" title="Change status">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="status-dropdown-menu">
                                <div class="status-dropdown-item confirmed" data-id="${reg._id}" data-status="confirmed">
                                    <i class="fas fa-check-circle"></i> Confirmed
                                </div>
                                <div class="status-dropdown-item pending" data-id="${reg._id}" data-status="pending">
                                    <i class="fas fa-clock"></i> Pending
                                </div>
                                <div class="status-dropdown-item waitlisted" data-id="${reg._id}" data-status="waitlisted">
                                    <i class="fas fa-hourglass-half"></i> Waitlisted
                                </div>
                                <div class="status-dropdown-item cancelled" data-id="${reg._id}" data-status="cancelled">
                                    <i class="fas fa-times-circle"></i> Cancelled
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="date-time">
                            ${registeredDate}
                            <div class="time">${registeredTime}</div>
                        </div>
                    </td>
                    <td>
                        <span class="confirmation-number">${reg.confirmationNumber}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-view" data-id="${reg._id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${reg.status !== 'confirmed' ? `
                                <button class="btn btn-sm btn-confirm" data-id="${reg._id}" title="Confirm">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            ${reg.status !== 'cancelled' ? `
                                <button class="btn btn-sm btn-cancel" data-id="${reg._id}" title="Cancel">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-delete-permanent" data-id="${reg._id}" title="Delete Permanently">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderPagination(data) {
        const pagination = document.getElementById('pagination');

        if (data.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `
            <button class="page-btn" data-page="${data.currentPage - 1}" ${!data.hasPrevPage ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const maxVisible = 5;
        let start = Math.max(1, data.currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(data.totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (start > 2) html += `<span class="page-info">...</span>`;
        }

        for (let i = start; i <= end; i++) {
            html += `
                <button class="page-btn ${i === data.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (end < data.totalPages) {
            if (end < data.totalPages - 1) html += `<span class="page-info">...</span>`;
            html += `<button class="page-btn" data-page="${data.totalPages}">${data.totalPages}</button>`;
        }

        // Next button
        html += `
            <button class="page-btn" data-page="${data.currentPage + 1}" ${!data.hasNextPage ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        // Page info
        html += `<span class="page-info">${data.totalCount} total</span>`;

        pagination.innerHTML = html;
    }

    toggleSelectAll(checked) {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = checked;
            const id = cb.dataset.id;
            if (checked) {
                this.selectedIds.add(id);
            } else {
                this.selectedIds.delete(id);
            }
        });
        this.updateBulkActionsUI();
    }

    updateSelectAllState() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.row-checkbox');

        if (checkboxes.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            return;
        }

        const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;

        if (checkedCount === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (checkedCount === checkboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }

    updateBulkActionsUI() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');

        if (this.selectedIds.size > 0) {
            bulkActions.style.display = 'flex';
            selectedCount.textContent = this.selectedIds.size;
        } else {
            bulkActions.style.display = 'none';
        }

        this.updateSelectAllState();
    }

    clearSelection() {
        this.selectedIds.clear();
        document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('select-all').checked = false;
        this.updateBulkActionsUI();
    }

    async bulkUpdateStatus(status) {
        if (this.selectedIds.size === 0) return;

        const ids = Array.from(this.selectedIds);

        try {
            const res = await fetch('/api/registrations/bulk-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, status }),
            });

            if (res.ok) {
                const data = await res.json();
                this.showNotification(`${data.modifiedCount} registrations updated`, 'success');
                this.clearSelection();
                this.loadRegistrations();
                this.updateStats();
            } else {
                throw new Error('Update failed');
            }
        } catch (err) {
            this.showNotification('Failed to update registrations', 'error');
        }
    }

    async quickStatusChange(id, status) {
        try {
            const res = await fetch(`/api/registrations/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                this.showNotification('Status updated', 'success');
                this.loadRegistrations();
                this.updateStats();
            } else {
                throw new Error('Update failed');
            }
        } catch (err) {
            this.showNotification('Failed to update status', 'error');
        }
    }

    async permanentDelete(id) {
        try {
            const res = await fetch(`/api/registrations/${id}/permanent`, {
                method: 'DELETE',
            });

            if (res.ok) {
                this.showNotification('Registration permanently deleted', 'success');
                this.loadRegistrations();
                this.updateStats();
            } else {
                const data = await res.json();
                throw new Error(data.message || 'Delete failed');
            }
        } catch (err) {
            this.showNotification(err.message || 'Failed to delete registration', 'error');
        }
    }

    async viewRegistration(id) {
        try {
            console.log('Fetching registration with ID:', id);
            const res = await fetch(`/api/registrations/${id}`);
            const data = await res.json();
            console.log('Response:', res.status, data);

            if (res.ok) {
                this.currentRegistration = data.registration;
                this.renderRegistrationModal(data.registration);
                this.openModal();
            } else {
                this.showNotification(data.message || 'Failed to load registration', 'error');
            }
        } catch (err) {
            console.error('Error fetching registration:', err);
            this.showNotification('Failed to load registration', 'error');
        }
    }

    renderRegistrationModal(reg) {
        const regData = this.getRegData(reg.registrationData);
        const eventDate = reg.event?.eventDate
            ? new Date(reg.event.eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : 'N/A';
        const registeredAt = new Date(reg.registeredAt).toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

        document.getElementById('modal-title').textContent = 'Registration Details';
        document.getElementById('save-registration-btn').style.display = 'inline-flex';

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="registration-detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-user"></i> Registrant Information
                </div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Email</span>
                        <span class="detail-value email">${this.escapeHtml(reg.email)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Confirmation Number</span>
                        <span class="detail-value confirmation">${reg.confirmationNumber}</span>
                    </div>
                </div>
            </div>

            <div class="registration-detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-calendar-alt"></i> Event Details
                </div>
                <div class="detail-grid">
                    <div class="detail-item full-width">
                        <span class="detail-label">Event</span>
                        <span class="detail-value">${reg.event ? this.escapeHtml(reg.event.title) : 'Event deleted'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Event Date</span>
                        <span class="detail-value">${eventDate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Registered At</span>
                        <span class="detail-value">${registeredAt}</span>
                    </div>
                </div>
            </div>

            <div class="registration-detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-clipboard-check"></i> Status
                </div>
                <div class="status-selector">
                    <label class="status-option confirmed ${reg.status === 'confirmed' ? 'selected' : ''}">
                        <input type="radio" name="status" value="confirmed" ${reg.status === 'confirmed' ? 'checked' : ''} />
                        <i class="fas fa-check-circle"></i>
                        Confirmed
                    </label>
                    <label class="status-option pending ${reg.status === 'pending' ? 'selected' : ''}">
                        <input type="radio" name="status" value="pending" ${reg.status === 'pending' ? 'checked' : ''} />
                        <i class="fas fa-clock"></i>
                        Pending
                    </label>
                    <label class="status-option waitlisted ${reg.status === 'waitlisted' ? 'selected' : ''}">
                        <input type="radio" name="status" value="waitlisted" ${reg.status === 'waitlisted' ? 'checked' : ''} />
                        <i class="fas fa-hourglass-half"></i>
                        Waitlisted
                    </label>
                    <label class="status-option cancelled ${reg.status === 'cancelled' ? 'selected' : ''}">
                        <input type="radio" name="status" value="cancelled" ${reg.status === 'cancelled' ? 'checked' : ''} />
                        <i class="fas fa-times-circle"></i>
                        Cancelled
                    </label>
                </div>
            </div>

            ${Object.keys(regData).length > 0 ? `
                <div class="registration-detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-list-alt"></i> Registration Data
                    </div>
                    <div class="registration-data-list">
                        ${Object.entries(regData).map(([key, value]) => `
                            <div class="registration-data-item">
                                <span class="field-name">${this.formatFieldName(key)}</span>
                                <span class="field-value">${this.formatFieldValue(value)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${this.renderWaiverSection(reg)}

            <div class="registration-detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-sticky-note"></i> Admin Notes
                </div>
                <textarea class="notes-textarea" id="registration-notes" placeholder="Add notes about this registration...">${reg.notes || ''}</textarea>
            </div>

            ${reg.metadata && (reg.metadata.ipAddress || reg.metadata.userAgent) ? `
                <div class="registration-detail-section">
                    <div class="detail-section-title">
                        <i class="fas fa-info-circle"></i> Metadata
                    </div>
                    <div class="detail-grid">
                        ${reg.metadata.ipAddress ? `
                            <div class="detail-item">
                                <span class="detail-label">IP Address</span>
                                <span class="detail-value">${this.escapeHtml(reg.metadata.ipAddress)}</span>
                            </div>
                        ` : ''}
                        ${reg.metadata.referrer ? `
                            <div class="detail-item full-width">
                                <span class="detail-label">Referrer</span>
                                <span class="detail-value">${this.escapeHtml(reg.metadata.referrer)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    async saveRegistration() {
        if (!this.currentRegistration) return;

        const status = document.querySelector('input[name="status"]:checked')?.value;
        const notes = document.getElementById('registration-notes')?.value;

        try {
            const res = await fetch(`/api/registrations/${this.currentRegistration._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, notes }),
            });

            if (res.ok) {
                this.showNotification('Registration updated', 'success');
                this.closeModal();
                this.loadRegistrations();
                this.updateStats();
            } else {
                throw new Error('Update failed');
            }
        } catch (err) {
            this.showNotification('Failed to save changes', 'error');
        }
    }

    async updateStats() {
        try {
            const res = await fetch('/api/registrations/stats');
            const stats = await res.json();

            const statNumbers = document.querySelectorAll('.stat-number');
            if (statNumbers.length >= 4) {
                statNumbers[0].textContent = stats.totalRegistrations || 0;
                statNumbers[1].textContent = stats.confirmed || 0;
                statNumbers[2].textContent = stats.pending || 0;
                statNumbers[3].textContent = stats.waitlisted || 0;
            }
        } catch (err) {
            console.error('Failed to update stats:', err);
        }
    }

    exportRegistrations() {
        const params = new URLSearchParams({
            format: 'csv',
            ...(this.filters.event && { eventId: this.filters.event }),
        });

        window.location.href = `/api/registrations/export?${params}`;
    }

    openModal() {
        document.getElementById('registration-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('registration-modal').classList.remove('show');
        document.body.style.overflow = '';
        this.currentRegistration = null;
    }

    confirmAction(message, onConfirm) {
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.add('show');

        const proceedBtn = document.getElementById('proceed-confirm-btn');
        const newProceedBtn = proceedBtn.cloneNode(true);
        proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);

        newProceedBtn.addEventListener('click', () => {
            this.closeConfirmModal();
            onConfirm();
        });
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('show');
    }

    formatFieldName(name) {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
            .trim();
    }

    formatFieldValue(value) {
        if (value === null || value === undefined) return '';

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(v => this.escapeHtml(String(v))).join(', ');
        }

        // Handle objects
        if (typeof value === 'object') {
            // Check if it looks like a signature object
            if (value.type && value.value) {
                if (value.type === 'draw') {
                    return `<img src="${value.value}" alt="Signature" class="signature-preview" />`;
                } else {
                    return `<span class="typed-signature">${this.escapeHtml(value.value)}</span>`;
                }
            }
            // Generic object - try to display nicely
            try {
                const entries = Object.entries(value);
                if (entries.length === 0) return '';
                return entries.map(([k, v]) => `${this.formatFieldName(k)}: ${this.escapeHtml(String(v))}`).join(', ');
            } catch {
                return this.escapeHtml(String(value));
            }
        }

        // Handle booleans
        if (typeof value === 'boolean') {
            return value ? '<i class="fas fa-check text-success"></i> Yes' : '<i class="fas fa-times text-muted"></i> No';
        }

        return this.escapeHtml(String(value));
    }

    renderWaiverSection(reg) {
        if (!reg.waiver || !reg.waiver.acknowledged) {
            return '';
        }

        const waiver = reg.waiver;
        let html = `
            <div class="registration-detail-section">
                <div class="detail-section-title">
                    <i class="fas fa-file-signature"></i> Waiver & Consent
                </div>
        `;

        // Acknowledgments
        if (waiver.acknowledgments && waiver.acknowledgments.length > 0) {
            html += `
                <div class="waiver-acknowledgments">
                    <div class="detail-label" style="margin-bottom: 0.5rem;">Acknowledgments</div>
                    ${waiver.acknowledgments.map(ack => `
                        <div class="waiver-ack-item ${ack.accepted ? 'accepted' : 'not-accepted'}">
                            <i class="fas ${ack.accepted ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${this.escapeHtml(ack.text)}</span>
                            ${ack.acceptedAt ? `<small class="ack-date">${new Date(ack.acceptedAt).toLocaleString()}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Signature
        if (waiver.signature && waiver.signature.value) {
            const sig = waiver.signature;
            html += `
                <div class="waiver-signature">
                    <div class="detail-label" style="margin-bottom: 0.5rem;">Signature</div>
                    <div class="signature-display">
                        ${sig.type === 'draw'
                            ? `<img src="${sig.value}" alt="Signature" class="signature-image" />`
                            : `<div class="typed-signature-display">${this.escapeHtml(sig.value)}</div>`
                        }
                    </div>
                    <div class="signature-meta">
                        ${sig.signedAt ? `<span><i class="fas fa-clock"></i> Signed: ${new Date(sig.signedAt).toLocaleString()}</span>` : ''}
                        ${sig.ipAddress ? `<span><i class="fas fa-globe"></i> IP: ${this.escapeHtml(sig.ipAddress)}</span>` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const colors = {
            error: '#ef4444',
            success: '#10b981',
            info: '#0f4f9f',
            warning: '#f59e0b',
        };
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed; top: 1.5rem; right: 1.5rem;
            background: ${colors[type]}; color: white;
            padding: 0.875rem 1.25rem; border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 2000; transform: translateX(120%);
            transition: transform 0.3s ease;
            font-size: 0.875rem; font-weight: 500; max-width: 320px;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);

        setTimeout(() => (notif.style.transform = 'translateX(0)'), 50);
        setTimeout(() => {
            notif.style.transform = 'translateX(120%)';
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.registrationManager = new RegistrationManager();
});
