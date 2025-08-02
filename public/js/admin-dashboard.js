class EventManager {
    constructor() {
        this.currentEditId = null;
        this.events = [];
        this.speakerCount = 1;
        this.uploadedImages = [];
        this.featuredImage = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEvents();
        this.initializeSpeakers();
        this.initializeRegistrationToggle();
        this.initializeImageUpload();
        this.initializeFeaturedImageUpload();
    }

    initializeFeaturedImageUpload() {
        const dropzone = document.getElementById('featuredDropzone');
        const fileInput = document.getElementById('featuredImageInput');
        const button = dropzone.querySelector('.btn');
        const preview = document.getElementById('featuredImagePreview');

        // Drag and drop events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                this.handleFeaturedImageFile(files[0]); // Only take the first file
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFeaturedImageFile(file);
            }
        });

        // Button click to open file dialog
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // Dropzone click (but not on button)
        dropzone.addEventListener('click', (e) => {
            if (e.target === dropzone || e.target === dropzone.querySelector('i') || e.target === dropzone.querySelector('p')) {
                fileInput.click();
            }
        });
    }

    async handleFeaturedImageFile(file) {
        try {
            const imageUrl = await this.uploadImageToCloudinary(file);
            this.featuredImage = {
                url: imageUrl,
                alt: file.name
            };
            this.displayFeaturedImagePreview();
        } catch (error) {
            console.error('Error uploading featured image:', error);
            this.showNotification(`Failed to upload ${file.name}`, 'error');
        }
        
        // Reset file input
        document.getElementById('featuredImageInput').value = '';
    }

    displayFeaturedImagePreview() {
        const preview = document.getElementById('featuredImagePreview');
        const uploadArea = document.getElementById('featuredDropzone');
        
        if (this.featuredImage) {
            preview.innerHTML = `
                <div class="featured-preview-item">
                    <img src="${this.featuredImage.url}" alt="${this.featuredImage.alt}" loading="lazy">
                    <button type="button" class="featured-preview-remove" onclick="eventManager.removeFeaturedImage()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="featured-preview-info">
                        <small>Event Flyer</small>
                    </div>
                </div>
            `;
            preview.classList.add('show');
            uploadArea.style.display = 'none';
        } else {
            preview.classList.remove('show');
            uploadArea.style.display = 'block';
        }
    }

    removeFeaturedImage() {
        this.featuredImage = null;
        this.displayFeaturedImagePreview();
    }

    initializeImageUpload() {
        const dropzone = document.getElementById('imageDropzone');
        const fileInput = document.getElementById('imageUpload');
        const button = dropzone.querySelector('.btn');

        // Drag and drop events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
            if (files.length > 0) {
                this.handleImageFiles(files);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.handleImageFiles(files);
            }
        });

        // Button click to open file dialog
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // Dropzone click (but not on button)
        dropzone.addEventListener('click', (e) => {
            if (e.target === dropzone || e.target === dropzone.querySelector('i') || e.target === dropzone.querySelector('p')) {
                fileInput.click();
            }
        });
    }

    async handleImageFiles(files) {
        if (files.length === 0) return;

        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progressContainer.style.display = 'block';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Update progress
            const progress = ((i + 1) / files.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Uploading ${i + 1} of ${files.length}...`;

            try {
                const imageUrl = await this.uploadImageToCloudinary(file);
                this.uploadedImages.push({
                    url: imageUrl,
                    alt: file.name,
                    caption: ''
                });
                this.refreshImagePreviews();
            } catch (error) {
                console.error('Error uploading image:', error);
                this.showNotification(`Failed to upload ${file.name}`, 'error');
            }
        }

        progressContainer.style.display = 'none';
        fileInput.value = ''; // Reset file input
    }

    async uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;
    }

    refreshImagePreviews() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        previewContainer.innerHTML = '';
        
        this.uploadedImages.forEach((image, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
                <img src="${image.url}" alt="${image.alt}" loading="lazy">
                <button type="button" class="image-preview-remove" onclick="eventManager.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);
        });
    }

    removeImage(index) {
        this.uploadedImages.splice(index, 1);
        this.refreshImagePreviews();
    }

    bindEvents() {
        // Create event button
        document.getElementById('create-event-btn').addEventListener('click', () => {
            this.openModal('create');
        });

        // Close modal
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // Form submit
        document.getElementById('event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Search and filters
        document.getElementById('search').addEventListener('input', () => {
            this.filterEvents();
        });

        document.getElementById('filter-category').addEventListener('change', () => {
            this.filterEvents();
        });

        document.getElementById('filter-status').addEventListener('change', () => {
            this.filterEvents();
        });

        // Modal click outside to close
        document.getElementById('event-modal').addEventListener('click', (e) => {
            if (e.target.id === 'event-modal') {
                this.closeModal();
            }
        });

        // Table action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit')) {
                const id = e.target.closest('.btn-edit').dataset.id;
                this.editEvent(id);
            }
            
            if (e.target.closest('.btn-duplicate')) {
                const id = e.target.closest('.btn-duplicate').dataset.id;
                this.duplicateEvent(id);
            }
            
            if (e.target.closest('.btn-delete')) {
                const id = e.target.closest('.btn-delete').dataset.id;
                this.deleteEvent(id);
            }
        });

        // Add speaker button
        document.getElementById('add-speaker').addEventListener('click', () => {
            this.addSpeaker();
        });
    }

    initializeSpeakers() {
        // Remove speaker functionality
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-speaker')) {
                e.target.closest('.speaker-item').remove();
            }
        });
    }

    initializeRegistrationToggle() {
        const registrationCheckbox = document.getElementById('isRegistrationRequired');
        const registrationDetails = document.getElementById('registration-details');

        registrationCheckbox.addEventListener('change', () => {
            registrationDetails.style.display = registrationCheckbox.checked ? 'block' : 'none';
        });
    }

    addSpeaker() {
        const container = document.getElementById('speakers-container');
        const speakerItem = document.createElement('div');
        speakerItem.className = 'speaker-item';
        speakerItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Speaker Name</label>
                    <input type="text" name="speaker-name-${this.speakerCount}" placeholder="Full name">
                </div>
                
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="speaker-title-${this.speakerCount}" placeholder="Job title or role">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label>Organization</label>
                    <input type="text" name="speaker-organization-${this.speakerCount}" placeholder="Company or organization">
                </div>
                
                <div class="form-group">
                    <label>Photo URL</label>
                    <input type="url" name="speaker-photo-${this.speakerCount}" placeholder="https://example.com/photo.jpg">
                </div>
            </div>
            
            <div class="form-group">
                <label>Bio</label>
                <textarea name="speaker-bio-${this.speakerCount}" rows="2" placeholder="Brief biography"></textarea>
            </div>
            
            <button type="button" class="btn btn-delete btn-sm remove-speaker">
                <i class="fas fa-trash"></i> Remove Speaker
            </button>
        `;
        
        container.appendChild(speakerItem);
        this.speakerCount++;
    }

    async loadEvents() {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();
            this.events = data.events || [];
            this.renderEvents();
            this.updateStats();
        } catch (error) {
            console.error('Error loading events:', error);
            this.showNotification('Failed to load events', 'error');
        }
    }

    async saveEvent() {
        const eventData = this.formDataToObject();

        if (!this.validateForm(eventData)) {
            return;
        }

        try {
            const url = this.currentEditId ? `/api/events/${this.currentEditId}` : '/api/events';
            const method = this.currentEditId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });

            if (response.ok) {
                this.showNotification(
                    this.currentEditId ? 'Event updated successfully!' : 'Event created successfully!',
                    'success'
                );
                this.closeModal();
                this.loadEvents();
            } else {
                const error = await response.json();
                this.showNotification('Error: ' + (error.message || 'Failed to save event'), 'error');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showNotification('Failed to save event', 'error');
        }
    }

    async editEvent(id) {
        try {
            const response = await fetch(`/api/events/${id}`);
            const data = await response.json();
            
            if (response.ok) {
                this.populateForm(data.event);
                this.openModal('edit');
                this.currentEditId = id;
            } else {
                this.showNotification('Failed to load event details', 'error');
            }
        } catch (error) {
            console.error('Error loading event:', error);
            this.showNotification('Failed to load event details', 'error');
        }
    }

    async duplicateEvent(id) {
        if (confirm('Are you sure you want to duplicate this event?')) {
            try {
                const response = await fetch(`/api/events/${id}/duplicate`, {
                    method: 'POST'
                });

                if (response.ok) {
                    this.showNotification('Event duplicated successfully!', 'success');
                    this.loadEvents();
                } else {
                    this.showNotification('Failed to duplicate event', 'error');
                }
            } catch (error) {
                console.error('Error duplicating event:', error);
                this.showNotification('Failed to duplicate event', 'error');
            }
        }
    }

    async deleteEvent(id) {
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                const response = await fetch(`/api/events/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.showNotification('Event deleted successfully!', 'success');
                    this.loadEvents();
                } else {
                    this.showNotification('Failed to delete event', 'error');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
                this.showNotification('Failed to delete event', 'error');
            }
        }
    }

    openModal(mode) {
        const modal = document.getElementById('event-modal');
        const title = document.getElementById('modal-title');
        const saveBtn = document.getElementById('save-btn');

        if (mode === 'create') {
            title.textContent = 'Create Event';
            saveBtn.textContent = 'Create Event';
            this.resetForm();
            this.currentEditId = null;
        } else {
            title.textContent = 'Edit Event';
            saveBtn.textContent = 'Update Event';
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('event-modal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.resetForm();
        this.currentEditId = null;
    }

    resetForm() {
        document.getElementById('event-form').reset();
        
        // Reset featured image
        this.featuredImage = null;
        this.displayFeaturedImagePreview();
        
        // Reset uploaded images
        this.uploadedImages = [];
        document.getElementById('imagePreviewContainer').innerHTML = '';
        document.getElementById('uploadProgress').style.display = 'none';

        // Reset speakers to one empty speaker
        const speakersContainer = document.getElementById('speakers-container');
        speakersContainer.innerHTML = `
            <div class="speaker-item">
                <div class="form-row">
                    <div class="form-group">
                        <label>Speaker Name</label>
                        <input type="text" name="speaker-name-0" placeholder="Full name">
                    </div>
                    
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="speaker-title-0" placeholder="Job title or role">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Organization</label>
                        <input type="text" name="speaker-organization-0" placeholder="Company or organization">
                    </div>
                    
                    <div class="form-group">
                        <label>Photo URL</label>
                        <input type="url" name="speaker-photo-0" placeholder="https://example.com/photo.jpg">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Bio</label>
                    <textarea name="speaker-bio-0" rows="2" placeholder="Brief biography"></textarea>
                </div>
            </div>
        `;
        
        this.speakerCount = 1;
        
        // Hide registration details
        document.getElementById('registration-details').style.display = 'none';
        
        // Set default values
        document.getElementById('category').value = 'community-service';
        document.getElementById('eventType').value = 'in-person';
        document.getElementById('status').value = 'draft';
        document.getElementById('timezone').value = 'America/Indiana/Indianapolis';
        document.getElementById('isPublic').checked = true;
    }

    populateForm(event) {
        // Basic information
        document.getElementById('title').value = event.title || '';
        document.getElementById('shortDescription').value = event.shortDescription || '';
        document.getElementById('description').value = event.description || '';
        document.getElementById('category').value = event.category || 'community-service';
        document.getElementById('eventType').value = event.eventType || 'in-person';
        document.getElementById('tags').value = event.tags ? event.tags.join(', ') : '';
        
        // Date & Time
        if (event.eventDate) {
            const eventDate = new Date(event.eventDate);
            document.getElementById('eventDate').value = eventDate.toISOString().split('T')[0];
        }
        
        document.getElementById('startTime').value = event.startTime || '';
        document.getElementById('endTime').value = event.endTime || '';
        document.getElementById('timezone').value = event.timezone || 'America/Indiana/Indianapolis';
        
        // Location
        if (event.location) {
            document.getElementById('venue').value = event.location.venue || '';
            if (event.location.address) {
                document.getElementById('street').value = event.location.address.street || '';
                document.getElementById('city').value = event.location.address.city || '';
                document.getElementById('state').value = event.location.address.state || '';
                document.getElementById('zipCode').value = event.location.address.zipCode || '';
            }
            document.getElementById('virtualLink').value = event.location.virtualLink || '';
        }
        
        // Load existing featured image
        if (event.media && event.media.featuredImage && event.media.featuredImage.url) {
            this.featuredImage = {
                url: event.media.featuredImage.url,
                alt: event.media.featuredImage.alt || 'Event flyer'
            };
            this.displayFeaturedImagePreview();
        }
        
        // Load existing images
        if (event.media && event.media.gallery) {
            this.uploadedImages = event.media.gallery.map(img => ({
                url: img.url || img,
                alt: img.alt || '',
                caption: img.caption || ''
            }));
            this.refreshImagePreviews();
        }
        
        // Videos
        if (event.media && event.media.videos && event.media.videos[0]) {
            document.getElementById('videoUrl').value = event.media.videos[0].url || '';
            document.getElementById('videoTitle').value = event.media.videos[0].title || '';
        }
        
        // Registration
        if (event.registration) {
            document.getElementById('isRegistrationRequired').checked = event.registration.isRequired || false;
            document.getElementById('registration-details').style.display = 
                event.registration.isRequired ? 'block' : 'none';
            
            document.getElementById('maxAttendees').value = event.registration.maxAttendees || '';
            document.getElementById('registrationFee').value = event.registration.fee?.amount || '';
            
            if (event.registration.registrationDeadline) {
                const deadline = new Date(event.registration.registrationDeadline);
                document.getElementById('registrationDeadline').value = deadline.toISOString().split('T')[0];
            }
        }
        
        // Settings
        document.getElementById('status').value = event.status || 'draft';
        document.getElementById('featured').checked = event.featured || false;
        document.getElementById('isPublic').checked = event.isPublic !== undefined ? event.isPublic : true;
        document.getElementById('isRecurring').checked = event.recurring?.isRecurring || false;
        
        // Speakers
        this.populateSpeakers(event.speakers || []);
    }

    populateSpeakers(speakers) {
        const container = document.getElementById('speakers-container');
        container.innerHTML = '';
        
        if (speakers.length === 0) {
            speakers = [{}]; // Add one empty speaker
        }
        
        speakers.forEach((speaker, index) => {
            const speakerItem = document.createElement('div');
            speakerItem.className = 'speaker-item';
            speakerItem.innerHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Speaker Name</label>
                        <input type="text" name="speaker-name-${index}" placeholder="Full name" value="${speaker.name || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="speaker-title-${index}" placeholder="Job title or role" value="${speaker.title || ''}">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Organization</label>
                        <input type="text" name="speaker-organization-${index}" placeholder="Company or organization" value="${speaker.organization || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Photo URL</label>
                        <input type="url" name="speaker-photo-${index}" placeholder="https://example.com/photo.jpg" value="${speaker.photo || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Bio</label>
                    <textarea name="speaker-bio-${index}" rows="2" placeholder="Brief biography">${speaker.bio || ''}</textarea>
                </div>
                
                ${index > 0 ? '<button type="button" class="btn btn-delete btn-sm remove-speaker"><i class="fas fa-trash"></i> Remove Speaker</button>' : ''}
            `;
            
            container.appendChild(speakerItem);
        });
        
        this.speakerCount = speakers.length;
    }

    formDataToObject() {
        const form = document.getElementById('event-form');
        const formData = new FormData(form);
        
        // Build speakers array
        const speakers = [];
        for (let i = 0; i < this.speakerCount; i++) {
            const name = formData.get(`speaker-name-${i}`);
            if (name && name.trim()) {
                speakers.push({
                    name: name.trim(),
                    title: formData.get(`speaker-title-${i}`) || '',
                    organization: formData.get(`speaker-organization-${i}`) || '',
                    photo: formData.get(`speaker-photo-${i}`) || '',
                    bio: formData.get(`speaker-bio-${i}`) || ''
                });
            }
        }

        // Build location object
        const location = {
            venue: formData.get('venue') || '',
            address: {
                street: formData.get('street') || '',
                city: formData.get('city') || '',
                state: formData.get('state') || '',
                zipCode: formData.get('zipCode') || '',
                country: 'USA'
            },
            virtualLink: formData.get('virtualLink') || ''
        };

        // Build media object with featured image and gallery
        const media = {
            featuredImage: this.featuredImage || null,
            gallery: this.uploadedImages || [],
            videos: []
        };

        if (formData.get('videoUrl')) {
            media.videos.push({
                title: formData.get('videoTitle') || '',
                url: formData.get('videoUrl'),
                platform: this.getVideoPlatform(formData.get('videoUrl'))
            });
        }

        // Build registration object
        const registration = {
            isRequired: formData.has('isRegistrationRequired'),
            maxAttendees: formData.get('maxAttendees') ? parseInt(formData.get('maxAttendees')) : null,
            fee: {
                amount: formData.get('registrationFee') ? parseFloat(formData.get('registrationFee')) : 0,
                currency: 'USD'
            },
            fields: [],
            isOpen: true,
            waitlistEnabled: false
        };

        if (formData.get('registrationDeadline')) {
            registration.registrationDeadline = formData.get('registrationDeadline');
        }

        // Process tags
        const tagsInput = formData.get('tags') || '';
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : [];

        const data = {
            title: formData.get('title'),
            shortDescription: formData.get('shortDescription') || '',
            description: formData.get('description'),
            category: formData.get('category'),
            eventType: formData.get('eventType'),
            status: formData.get('status'),
            eventDate: formData.get('eventDate'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            timezone: formData.get('timezone'),
            location: location,
            speakers: speakers,
            media: media,
            registration: registration,
            tags: tags,
            featured: formData.has('featured'),
            isPublic: formData.has('isPublic'),
            recurring: {
                isRecurring: formData.has('isRecurring'),
                frequency: formData.has('isRecurring') ? 'weekly' : undefined,
                interval: 1
            }
        };

        return data;
    }

    getVideoPlatform(url) {
        if (!url) return 'other';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('facebook.com')) return 'facebook';
        if (url.includes('instagram.com')) return 'instagram';
        return 'other';
    }

    validateForm(data) {
        if (!data.title || !data.title.trim()) {
            this.showNotification('Event title is required', 'error');
            return false;
        }
        
        if (!data.description || !data.description.trim()) {
            this.showNotification('Event description is required', 'error');
            return false;
        }

        if (!data.eventDate) {
            this.showNotification('Event date is required', 'error');
            return false;
        }
        
        return true;
    }

    renderEvents() {
        const tbody = document.getElementById('events-table');
        
        // Clear existing rows
        tbody.innerHTML = '';

        if (this.events.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-content">
                            <i class="fas fa-calendar-times"></i>
                            <h3>No events found</h3>
                            <p>Create your first event to get started</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        this.events.forEach(event => {
            const row = this.createEventRow(event);
            tbody.appendChild(row);
        });
    }

    createEventRow(event) {
        const row = document.createElement('tr');
        row.dataset.id = event._id;

        const eventDate = new Date(event.eventDate).toLocaleDateString();
        const categoryFormatted = this.formatCategory(event.category);
        const statusFormatted = event.status.charAt(0).toUpperCase() + event.status.slice(1);
        const typeFormatted = event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
        const description = event.shortDescription || 
            (event.description ? event.description.substring(0, 60) + '...' : '');

        row.innerHTML = `
            <td>
                <div class="event-info">
                    <strong>${this.escapeHtml(event.title)}</strong>
                    ${event.featured ? '<i class="fas fa-star featured"></i>' : ''}
                    <div class="event-desc">${this.escapeHtml(description)}</div>
                </div>
            </td>
            <td>
                <span class="badge category-${event.category}">
                    ${categoryFormatted}
                </span>
            </td>
            <td>
                <span class="badge status-${event.status}">
                    ${statusFormatted}
                </span>
            </td>
            <td>
                <div class="date-time">
                    ${eventDate}
                    <div class="time">${event.startTime || ''}</div>
                </div>
            </td>
            <td>
                <span class="badge type-${event.eventType}">
                    ${typeFormatted}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" data-id="${event._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-duplicate" data-id="${event._id}">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" data-id="${event._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    filterEvents() {
        const search = document.getElementById('search').value.toLowerCase();
        const category = document.getElementById('filter-category').value;
        const status = document.getElementById('filter-status').value;

        const rows = document.querySelectorAll('#events-table tr[data-id]');
        
        rows.forEach(row => {
            const eventId = row.dataset.id;
            const event = this.events.find(e => e._id === eventId);
            
            if (!event) return;

            let show = true;

            // Search filter
            if (search) {
                const searchText = `${event.title} ${event.description} ${event.shortDescription || ''}`.toLowerCase();
                if (!searchText.includes(search)) {
                    show = false;
                }
            }

            // Category filter
            if (category && event.category !== category) {
                show = false;
            }

            // Status filter
            if (status && event.status !== status) {
                show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }

    updateStats() {
        const stats = {
            total: this.events.length,
            published: this.events.filter(e => e.status === 'published').length,
            upcoming: this.events.filter(e => 
                e.status === 'published' && new Date(e.eventDate) > new Date()
            ).length,
            draft: this.events.filter(e => e.status === 'draft').length
        };

        // Update stat numbers in DOM
        const statElements = document.querySelectorAll('.stat-number');
        if (statElements[0]) statElements[0].textContent = stats.total;
        if (statElements[1]) statElements[1].textContent = stats.published;
        if (statElements[2]) statElements[2].textContent = stats.upcoming;
        if (statElements[3]) statElements[3].textContent = stats.draft;
    }

    formatCategory(category) {
        return category.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const colors = {
            'error': '#ef4444',
            'success': '#58ba46',
            'info': '#0f4f9f',
            'warning': '#f59e0b'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${colors[type]};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 350px;
            font-size: 0.875rem;
            font-weight: 600;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.eventManager = new EventManager();
});