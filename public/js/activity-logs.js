class ActivityLogManager {
    constructor() {
        this.logs = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.limit = 50;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStats();
        this.loadLogs();
    }

    bindEvents() {
        // Filters
        document.getElementById('filter-action').addEventListener('change', () => this.loadLogs(1));
        document.getElementById('filter-resource').addEventListener('change', () => this.loadLogs(1));
        document.getElementById('filter-user').addEventListener('change', () => this.loadLogs(1));
        document.getElementById('filter-start-date').addEventListener('change', () => this.loadLogs(1));
        document.getElementById('filter-end-date').addEventListener('change', () => this.loadLogs(1));

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => this.loadLogs(this.currentPage - 1));
        document.getElementById('next-page').addEventListener('click', () => this.loadLogs(this.currentPage + 1));
    }

    async loadStats() {
        try {
            const response = await fetch('/api/activity-logs/stats');
            const data = await response.json();

            if (response.ok) {
                document.getElementById('stat-total').textContent = data.totalLogs || 0;
                document.getElementById('stat-today').textContent = data.todayLogs || 0;

                // Calculate action stats
                const createCount = data.actionStats?.find(s => s._id === 'create')?.count || 0;
                const deleteCount = data.actionStats?.find(s => s._id === 'delete')?.count || 0;

                document.getElementById('stat-create').textContent = createCount;
                document.getElementById('stat-delete').textContent = deleteCount;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadLogs(page = 1) {
        try {
            const action = document.getElementById('filter-action').value;
            const resourceType = document.getElementById('filter-resource').value;
            const userId = document.getElementById('filter-user').value;
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;

            const params = new URLSearchParams({
                page,
                limit: this.limit,
            });

            if (action) params.append('action', action);
            if (resourceType) params.append('resourceType', resourceType);
            if (userId) params.append('userId', userId);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/activity-logs?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.logs = data.logs;
                this.currentPage = data.currentPage;
                this.totalPages = data.totalPages;
                this.renderLogs();
                this.updatePagination();
            } else {
                this.showNotification(data.message || 'Failed to load activity logs', 'error');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showNotification('Failed to load activity logs', 'error');
        }
    }

    renderLogs() {
        const tbody = document.getElementById('activity-table');

        if (this.logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-history"></i>
                            <h3>No activity logs found</h3>
                            <p>Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.logs.map(log => this.renderLogRow(log)).join('');
    }

    renderLogRow(log) {
        const date = new Date(log.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });

        return `
            <tr>
                <td>
                    <div class="timestamp">
                        <span class="date">${formattedDate}</span>
                        <span class="time">${formattedTime}</span>
                    </div>
                </td>
                <td>
                    <div class="user-info-cell">
                        <span class="user-name">${this.escapeHtml(log.userName)}</span>
                        <span class="user-email">${this.escapeHtml(log.userEmail)}</span>
                    </div>
                </td>
                <td>
                    <span class="action-badge ${log.action}">${log.action}</span>
                </td>
                <td>
                    <span class="resource-badge ${log.resourceType}">${log.resourceType}</span>
                    ${log.resourceName ? `<span class="resource-name">${this.escapeHtml(log.resourceName)}</span>` : ''}
                </td>
                <td>
                    <span class="details-cell" title="${this.escapeHtml(log.details || '')}">${this.escapeHtml(log.details || '-')}</span>
                </td>
            </tr>
        `;
    }

    updatePagination() {
        document.getElementById('current-page').textContent = this.currentPage;
        document.getElementById('total-pages').textContent = this.totalPages;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    showNotification(message, type = 'info') {
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
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ActivityLogManager();
});
