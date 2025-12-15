class EventManager {
    constructor() {
        this.currentEditId = null;
        this.events = [];
        this.speakerCount = 0;
        this.uploadedImages = [];
        this.featuredImage = null;
        this.registrationFields = [];
        this.customDates = [];
        this.acknowledgments = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEvents();
        this.initAccordions();
        this.initEventTypeSelector();
        this.initFrequencySelector();
        this.initDaySelector();
        this.initStatusSelector();
        this.initRegistrationToggle();
        this.initImageUploads();
        this.initCharCounters();
        this.initFieldModal();
        this.initCustomDates();
        this.initWaiverSection();
        this.renderRegistrationFields(); // Initialize empty state
    }

    // ========================================
    // Accordion
    // ========================================
    initAccordions() {
        document.querySelectorAll('.accordion-header').forEach((header) => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section.classList.toggle('open');
            });
        });
    }

    // ========================================
    // Event Type Selector (Single vs Recurring)
    // ========================================
    initEventTypeSelector() {
        const cards = document.querySelectorAll('.event-type-card');
        const singleSchedule = document.getElementById('single-event-schedule');
        const recurringSchedule = document.getElementById('recurring-event-schedule');

        cards.forEach((card) => {
            card.addEventListener('click', () => {
                cards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');

                const type = card.dataset.type;
                if (type === 'single') {
                    singleSchedule.style.display = 'block';
                    recurringSchedule.style.display = 'none';
                    document.getElementById('eventDate').required = true;
                } else {
                    singleSchedule.style.display = 'none';
                    recurringSchedule.style.display = 'block';
                    document.getElementById('eventDate').required = false;
                }
            });
        });
    }

    // ========================================
    // Frequency Selector
    // ========================================
    initFrequencySelector() {
        const pills = document.querySelectorAll('#frequency-selector .pill');
        const daysGroup = document.getElementById('days-of-week-group');
        const monthlyGroup = document.getElementById('monthly-type-group');
        const customDatesGroup = document.getElementById('custom-dates-group');
        const dateRangeGroup = document.getElementById('recurring-date-range-group');

        pills.forEach((pill) => {
            pill.addEventListener('click', () => {
                pills.forEach((p) => p.classList.remove('selected'));
                pill.classList.add('selected');

                const freq = pill.querySelector('input').value;

                // Show/hide days of week based on frequency
                if (freq === 'daily' || freq === 'custom') {
                    daysGroup.style.display = 'none';
                } else {
                    daysGroup.style.display = 'block';
                }

                // Show monthly options only for monthly
                if (freq === 'monthly') {
                    monthlyGroup.style.display = 'block';
                } else {
                    monthlyGroup.style.display = 'none';
                }

                // Show custom dates picker only for custom
                if (freq === 'custom') {
                    customDatesGroup.style.display = 'block';
                    if (dateRangeGroup) dateRangeGroup.style.display = 'none';
                } else {
                    customDatesGroup.style.display = 'none';
                    if (dateRangeGroup) dateRangeGroup.style.display = 'flex';
                }
            });
        });
    }

    // ========================================
    // Day Selector
    // ========================================
    initDaySelector() {
        const dayPills = document.querySelectorAll('.day-pill');
        dayPills.forEach((pill) => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                pill.classList.toggle('selected');
                const checkbox = pill.querySelector('input');
                checkbox.checked = pill.classList.contains('selected');
            });
        });
    }

    // ========================================
    // Custom Dates
    // ========================================
    initCustomDates() {
        const addBtn = document.getElementById('add-custom-date');
        const input = document.getElementById('customDateInput');

        if (addBtn && input) {
            addBtn.addEventListener('click', () => {
                if (input.value) {
                    this.addCustomDate(input.value);
                    input.value = '';
                }
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (input.value) {
                        this.addCustomDate(input.value);
                        input.value = '';
                    }
                }
            });
        }

        // Delegation for remove buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.custom-date-remove')) {
                const chip = e.target.closest('.custom-date-chip');
                const date = chip.dataset.date;
                this.removeCustomDate(date);
            }
        });
    }

    addCustomDate(dateStr) {
        if (this.customDates.includes(dateStr)) {
            this.showNotification('This date is already added', 'warning');
            return;
        }
        this.customDates.push(dateStr);
        this.customDates.sort();
        this.renderCustomDates();
    }

    removeCustomDate(dateStr) {
        this.customDates = this.customDates.filter(d => d !== dateStr);
        this.renderCustomDates();
    }

    renderCustomDates() {
        const container = document.getElementById('custom-dates-list');
        if (!container) return;

        container.innerHTML = this.customDates.map(dateStr => {
            const formatted = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            return `
                <div class="custom-date-chip" data-date="${dateStr}">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatted}</span>
                    <button type="button" class="custom-date-remove" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    // ========================================
    // Status Selector
    // ========================================
    initStatusSelector() {
        const statusCards = document.querySelectorAll('.status-card');
        statusCards.forEach((card) => {
            card.addEventListener('click', () => {
                statusCards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    // ========================================
    // Registration Toggle
    // ========================================
    initRegistrationToggle() {
        const toggle = document.getElementById('isRegistrationRequired');
        const details = document.getElementById('registration-details');

        toggle.addEventListener('change', () => {
            details.style.display = toggle.checked ? 'block' : 'none';
        });
    }

    // ========================================
    // Character Counters
    // ========================================
    initCharCounters() {
        const shortDesc = document.getElementById('shortDescription');
        const shortCount = document.getElementById('shortDescCount');
        const desc = document.getElementById('description');
        const descCount = document.getElementById('descCount');

        if (shortDesc && shortCount) {
            shortDesc.addEventListener('input', () => {
                shortCount.textContent = shortDesc.value.length;
            });
        }
        if (desc && descCount) {
            desc.addEventListener('input', () => {
                descCount.textContent = desc.value.length;
            });
        }
    }

    // ========================================
    // Field Modal (Registration Fields)
    // ========================================
    initFieldModal() {
        const addBtn = document.getElementById('add-registration-field');
        const modal = document.getElementById('field-modal');
        const closeBtn = document.getElementById('close-field-modal');
        const cancelBtn = document.getElementById('cancel-field-btn');
        const saveBtn = document.getElementById('save-field-btn');
        const typeCards = modal.querySelectorAll('.field-type-card');
        const optionsGroup = document.getElementById('fieldOptionsGroup');

        this.editingFieldIndex = null; // Track if we're editing an existing field

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.editingFieldIndex = null;
                this.resetFieldModal();
                document.getElementById('field-modal-title').textContent = 'Add Field';
                document.getElementById('save-field-btn').innerHTML = '<i class="fas fa-plus"></i> Add Field';
                modal.classList.add('show');
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('show'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });

        // Field type selection
        typeCards.forEach((card) => {
            card.addEventListener('click', () => {
                typeCards.forEach((c) => c.classList.remove('selected'));
                card.classList.add('selected');

                const type = card.querySelector('input').value;
                const needsOptions = ['select', 'radio', 'checkbox'].includes(type);
                optionsGroup.style.display = needsOptions ? 'block' : 'none';
            });
        });

        // Save field
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveRegistrationField();
            });
        }

        // Remove field delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-field-btn')) {
                const btn = e.target.closest('.remove-field-btn');
                const index = parseInt(btn.dataset.index);
                this.registrationFields.splice(index, 1);
                this.renderRegistrationFields();
                this.showNotification('Field removed', 'success');
            }

            // Edit field delegation
            if (e.target.closest('.edit-field-btn')) {
                const btn = e.target.closest('.edit-field-btn');
                const index = parseInt(btn.dataset.index);
                this.editField(index);
            }
        });

        // Quick add buttons
        document.querySelectorAll('.quick-add-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('added')) return;
                const fieldType = btn.dataset.field;
                this.addQuickField(fieldType);
            });
        });
    }

    addQuickField(fieldType) {
        const quickFields = {
            fullName: { name: 'Full Name', type: 'text', placeholder: 'Enter your full name', required: true },
            email: { name: 'Email', type: 'email', placeholder: 'Enter your email address', required: true },
            phone: { name: 'Phone', type: 'text', placeholder: 'Enter your phone number', required: false },
        };

        const field = quickFields[fieldType];
        if (!field) return;

        // Check if already added
        const exists = this.registrationFields.some(
            (f) => f.name.toLowerCase() === field.name.toLowerCase()
        );
        if (exists) {
            this.showNotification(`${field.name} field already exists`, 'warning');
            return;
        }

        this.registrationFields.push({ ...field, options: [] });
        this.renderRegistrationFields();
        this.showNotification(`${field.name} field added`, 'success');
    }

    resetFieldModal() {
        const fieldModal = document.getElementById('field-modal');
        document.getElementById('newFieldLabel').value = '';
        document.getElementById('newFieldPlaceholder').value = '';
        document.getElementById('newFieldOptions').value = '';
        document.getElementById('newFieldRequired').checked = false;
        document.getElementById('fieldOptionsGroup').style.display = 'none';

        const typeCards = fieldModal.querySelectorAll('.field-type-card');
        typeCards.forEach((c, i) => {
            c.classList.toggle('selected', i === 0);
            c.querySelector('input').checked = i === 0;
        });
    }

    editField(index) {
        const field = this.registrationFields[index];
        if (!field) return;

        this.editingFieldIndex = index;

        // Populate the modal with field data
        document.getElementById('newFieldLabel').value = field.name || '';
        document.getElementById('newFieldPlaceholder').value = field.placeholder || '';
        document.getElementById('newFieldRequired').checked = field.required || false;

        // Set field type
        const fieldModal = document.getElementById('field-modal');
        const typeCards = fieldModal.querySelectorAll('.field-type-card');
        typeCards.forEach((card) => {
            const input = card.querySelector('input');
            const isSelected = input.value === field.type;
            card.classList.toggle('selected', isSelected);
            input.checked = isSelected;
        });

        // Show options if needed
        const needsOptions = ['select', 'radio', 'checkbox'].includes(field.type);
        document.getElementById('fieldOptionsGroup').style.display = needsOptions ? 'block' : 'none';
        document.getElementById('newFieldOptions').value = (field.options || []).join('\n');

        // Update modal title and button
        document.getElementById('field-modal-title').textContent = 'Edit Field';
        document.getElementById('save-field-btn').innerHTML = '<i class="fas fa-save"></i> Save Changes';

        fieldModal.classList.add('show');
    }

    saveRegistrationField() {
        const fieldModal = document.getElementById('field-modal');
        const label = document.getElementById('newFieldLabel').value.trim();
        const typeInput = fieldModal.querySelector('input[name="newFieldType"]:checked');
        const type = typeInput ? typeInput.value : 'text';
        const placeholder = document.getElementById('newFieldPlaceholder').value.trim();
        const required = document.getElementById('newFieldRequired').checked;
        const optionsText = document.getElementById('newFieldOptions').value.trim();

        if (!label) {
            this.showNotification('Please enter a field label', 'error');
            return;
        }

        if (['select', 'radio', 'checkbox'].includes(type) && !optionsText) {
            this.showNotification('Please enter options for this field type', 'error');
            return;
        }

        // Check for duplicate field names (only when adding, not editing)
        if (this.editingFieldIndex === null) {
            const exists = this.registrationFields.some(
                (f) => f.name.toLowerCase() === label.toLowerCase()
            );
            if (exists) {
                this.showNotification(`A field named "${label}" already exists`, 'error');
                return;
            }
        }

        const field = {
            name: label,
            type: type,
            placeholder: placeholder,
            required: required,
            options: optionsText
                ? optionsText
                      .split('\n')
                      .map((o) => o.trim())
                      .filter((o) => o)
                : [],
        };

        if (this.editingFieldIndex !== null) {
            // Update existing field
            this.registrationFields[this.editingFieldIndex] = field;
            this.showNotification('Field updated successfully', 'success');
        } else {
            // Add new field
            this.registrationFields.push(field);
            this.showNotification('Field added successfully', 'success');
        }

        this.editingFieldIndex = null;
        this.renderRegistrationFields();
        document.getElementById('field-modal').classList.remove('show');
    }

    renderRegistrationFields() {
        const container = document.getElementById('registration-fields-container');
        const emptyMessage = document.getElementById('empty-fields-message');
        container.innerHTML = '';

        const typeIcons = {
            text: 'fa-font',
            textarea: 'fa-align-left',
            select: 'fa-caret-square-down',
            radio: 'fa-dot-circle',
            checkbox: 'fa-check-square',
            number: 'fa-hashtag',
            email: 'fa-at',
            date: 'fa-calendar',
        };

        const typeLabels = {
            text: 'Text',
            textarea: 'Long Text',
            select: 'Dropdown',
            radio: 'Single Choice',
            checkbox: 'Multi Choice',
            number: 'Number',
            email: 'Email',
            date: 'Date',
        };

        this.registrationFields.forEach((field, index) => {
            const item = document.createElement('div');
            item.className = 'custom-field-item';
            item.dataset.index = index;
            item.draggable = true;
            item.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="custom-field-info">
                    <i class="fas ${typeIcons[field.type] || 'fa-font'}"></i>
                    <strong>${this.escapeHtml(field.name)}</strong>
                    <span class="field-type-badge">${typeLabels[field.type] || field.type}</span>
                    ${field.required ? '<span class="req-badge">*</span>' : ''}
                </div>
                <div class="field-actions">
                    <button type="button" class="edit-field-btn" title="Edit field" data-index="${index}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button type="button" class="remove-field-btn" title="Remove field" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

        // Initialize drag and drop
        this.initFieldDragDrop();

        // Update empty message visibility
        if (emptyMessage) {
            emptyMessage.classList.toggle('hidden', this.registrationFields.length > 0);
        }

        // Update quick-add button states
        this.updateQuickAddButtons();
    }

    initFieldDragDrop() {
        const container = document.getElementById('registration-fields-container');
        const items = container.querySelectorAll('.custom-field-item');

        items.forEach((item) => {
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.index);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                container.querySelectorAll('.custom-field-item').forEach((i) => i.classList.remove('drag-over'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = container.querySelector('.dragging');
                if (dragging && dragging !== item) {
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(item.dataset.index);

                if (fromIndex !== toIndex) {
                    const [movedField] = this.registrationFields.splice(fromIndex, 1);
                    this.registrationFields.splice(toIndex, 0, movedField);
                    this.renderRegistrationFields();
                }
            });
        });
    }

    updateQuickAddButtons() {
        const quickFieldNames = {
            fullName: 'Full Name',
            email: 'Email',
            phone: 'Phone',
        };

        document.querySelectorAll('.quick-add-btn').forEach((btn) => {
            const fieldType = btn.dataset.field;
            const fieldName = quickFieldNames[fieldType];
            const exists = this.registrationFields.some(
                (f) => f.name.toLowerCase() === fieldName.toLowerCase()
            );
            btn.classList.toggle('added', exists);
            if (exists) {
                btn.innerHTML = `<i class="fas fa-check"></i> ${fieldName}`;
            } else {
                const icons = { fullName: 'fa-user', email: 'fa-envelope', phone: 'fa-phone' };
                btn.innerHTML = `<i class="fas ${icons[fieldType]}"></i> ${fieldName}`;
            }
        });
    }

    // ========================================
    // Waiver/Consent Section
    // ========================================
    initWaiverSection() {
        const waiverToggle = document.getElementById('waiverEnabled');
        const waiverDetails = document.getElementById('waiver-details');
        const signatureToggle = document.getElementById('signatureRequired');
        const signatureOptions = document.getElementById('signature-options');
        const addAckBtn = document.getElementById('add-acknowledgment');

        // Waiver toggle
        if (waiverToggle && waiverDetails) {
            waiverToggle.addEventListener('change', () => {
                waiverDetails.style.display = waiverToggle.checked ? 'block' : 'none';
            });
        }

        // Signature toggle
        if (signatureToggle && signatureOptions) {
            signatureToggle.addEventListener('change', () => {
                signatureOptions.style.display = signatureToggle.checked ? 'block' : 'none';
            });
        }

        // Add acknowledgment button
        if (addAckBtn) {
            addAckBtn.addEventListener('click', () => {
                this.addAcknowledgment();
            });
        }

        // Signature type selector
        const signatureTypePills = document.querySelectorAll('.signature-type-selector .pill');
        signatureTypePills.forEach(pill => {
            pill.addEventListener('click', () => {
                signatureTypePills.forEach(p => p.classList.remove('selected'));
                pill.classList.add('selected');
            });
        });

        // Remove acknowledgment delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-ack-btn')) {
                const item = e.target.closest('.acknowledgment-item');
                const index = parseInt(item.dataset.index);
                this.acknowledgments.splice(index, 1);
                this.renderAcknowledgments();
            }
        });
    }

    addAcknowledgment(data = {}) {
        this.acknowledgments.push({
            text: data.text || '',
            required: data.required !== false,
        });
        this.renderAcknowledgments();

        // Focus the new textarea
        setTimeout(() => {
            const textareas = document.querySelectorAll('.acknowledgment-item .ack-text');
            if (textareas.length > 0) {
                textareas[textareas.length - 1].focus();
            }
        }, 50);
    }

    renderAcknowledgments() {
        const container = document.getElementById('acknowledgments-container');
        if (!container) return;

        container.innerHTML = this.acknowledgments.map((ack, index) => `
            <div class="acknowledgment-item" data-index="${index}">
                <div class="drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="ack-content">
                    <textarea
                        class="ack-text"
                        placeholder="Enter acknowledgment text (e.g., I understand that submitting this form does not guarantee acceptance...)"
                        data-index="${index}"
                    >${this.escapeHtml(ack.text)}</textarea>
                    <div class="ack-options">
                        <label class="ack-required">
                            <input type="checkbox" ${ack.required ? 'checked' : ''} data-index="${index}" class="ack-required-checkbox" />
                            Required
                        </label>
                    </div>
                </div>
                <button type="button" class="remove-ack-btn" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        // Bind text change events
        container.querySelectorAll('.ack-text').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.acknowledgments[index].text = e.target.value;
            });
        });

        // Bind required checkbox events
        container.querySelectorAll('.ack-required-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.acknowledgments[index].required = e.target.checked;
            });
        });
    }

    // ========================================
    // Image Uploads
    // ========================================
    initImageUploads() {
        // Featured image
        const featuredZone = document.getElementById('featuredDropzone');
        const featuredInput = document.getElementById('featuredImageInput');

        if (featuredZone && featuredInput) {
            featuredZone.addEventListener('click', () => featuredInput.click());
            featuredZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                featuredZone.classList.add('dragover');
            });
            featuredZone.addEventListener('dragleave', () =>
                featuredZone.classList.remove('dragover')
            );
            featuredZone.addEventListener('drop', (e) => {
                e.preventDefault();
                featuredZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) this.uploadFeaturedImage(file);
            });
            featuredInput.addEventListener('change', (e) => {
                if (e.target.files[0]) this.uploadFeaturedImage(e.target.files[0]);
            });
        }

        // Gallery images
        const galleryZone = document.getElementById('imageDropzone');
        const galleryInput = document.getElementById('imageUpload');

        if (galleryZone && galleryInput) {
            galleryZone.addEventListener('click', () => galleryInput.click());
            galleryZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                galleryZone.classList.add('dragover');
            });
            galleryZone.addEventListener('dragleave', () =>
                galleryZone.classList.remove('dragover')
            );
            galleryZone.addEventListener('drop', (e) => {
                e.preventDefault();
                galleryZone.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/')
                );
                if (files.length) this.uploadGalleryImages(files);
            });
            galleryInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length) this.uploadGalleryImages(files);
            });
        }
    }

    async uploadFeaturedImage(file) {
        try {
            const url = await this.uploadToCloudinary(file);
            this.featuredImage = { url, alt: file.name };
            this.renderFeaturedImage();
        } catch (err) {
            this.showNotification('Failed to upload image', 'error');
        }
    }

    renderFeaturedImage() {
        const preview = document.getElementById('featuredImagePreview');
        const zone = document.getElementById('featuredDropzone');

        if (this.featuredImage && this.featuredImage.url) {
            preview.innerHTML = `
                <div class="image-preview-item">
                    <img src="${this.featuredImage.url}" alt="${
                this.featuredImage.alt || ''
            }" onerror="this.closest('.image-preview-item').innerHTML='<div style=\\'padding:1rem;color:#ef4444;font-size:0.75rem;\\'>Image missing - click X to remove</div><button type=\\'button\\' class=\\'image-preview-remove\\' onclick=\\'eventManager.removeFeaturedImage()\\'><i class=\\'fas fa-times\\'></i></button>'">
                    <button type="button" class="image-preview-remove" onclick="eventManager.removeFeaturedImage()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            preview.classList.add('show');
            zone.style.display = 'none';
        } else {
            preview.innerHTML = '';
            preview.classList.remove('show');
            zone.style.display = 'block';
        }
    }

    removeFeaturedImage() {
        this.featuredImage = null;
        this.renderFeaturedImage();
    }

    async uploadGalleryImages(files) {
        const progress = document.getElementById('uploadProgress');
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');

        progress.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            fill.style.width = `${((i + 1) / files.length) * 100}%`;
            text.textContent = `Uploading ${i + 1} of ${files.length}...`;

            try {
                const url = await this.uploadToCloudinary(files[i]);
                this.uploadedImages.push({ url, alt: files[i].name });
            } catch (err) {
                this.showNotification(`Failed to upload ${files[i].name}`, 'error');
            }
        }

        progress.style.display = 'none';
        this.renderGalleryImages();
        document.getElementById('imageUpload').value = '';
    }

    renderGalleryImages() {
        const container = document.getElementById('imagePreviewContainer');
        container.innerHTML = this.uploadedImages
            .map(
                (img, i) => `
            <div class="image-preview-item" data-index="${i}">
                <img src="${img.url}" alt="${
                    img.alt || ''
                }" onerror="this.closest('.image-preview-item').innerHTML='<div style=\\'padding:0.5rem;color:#ef4444;font-size:0.65rem;text-align:center;\\'>Missing</div><button type=\\'button\\' class=\\'image-preview-remove\\' onclick=\\'eventManager.removeGalleryImage(${i})\\'><i class=\\'fas fa-times\\'></i></button>'">
                <button type="button" class="image-preview-remove" onclick="eventManager.removeGalleryImage(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `
            )
            .join('');
    }

    removeGalleryImage(index) {
        this.uploadedImages.splice(index, 1);
        this.renderGalleryImages();
    }

    async uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/upload/image', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return data.url;
    }

    // ========================================
    // Event Binding
    // ========================================
    bindEvents() {
        document
            .getElementById('create-event-btn')
            .addEventListener('click', () => this.openModal('create'));
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-btn').addEventListener('click', () => this.closeModal());
        document.getElementById('event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });
        document.getElementById('event-modal').addEventListener('click', (e) => {
            if (e.target.id === 'event-modal') this.closeModal();
        });

        document.getElementById('search').addEventListener('input', () => this.filterEvents());
        document
            .getElementById('filter-category')
            .addEventListener('change', () => this.filterEvents());
        document
            .getElementById('filter-status')
            .addEventListener('change', () => this.filterEvents());

        document.getElementById('add-speaker').addEventListener('click', () => this.addSpeaker());

        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit'))
                this.editEvent(e.target.closest('.btn-edit').dataset.id);
            if (e.target.closest('.btn-duplicate'))
                this.duplicateEvent(e.target.closest('.btn-duplicate').dataset.id);
            if (e.target.closest('.btn-delete'))
                this.deleteEvent(e.target.closest('.btn-delete').dataset.id);
            if (e.target.closest('.remove-speaker')) e.target.closest('.speaker-item').remove();
        });
    }

    // ========================================
    // Speakers
    // ========================================
    addSpeaker(data = {}) {
        const container = document.getElementById('speakers-container');
        const item = document.createElement('div');
        item.className = 'speaker-item';
        item.innerHTML = `
            <div class="speaker-header">
                <strong>Speaker ${container.children.length + 1}</strong>
                <button type="button" class="remove-speaker"><i class="fas fa-times"></i></button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="speaker-name-${this.speakerCount}" value="${
            data.name || ''
        }" placeholder="Full name">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" name="speaker-title-${this.speakerCount}" value="${
            data.title || ''
        }" placeholder="Job title">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Organization</label>
                    <input type="text" name="speaker-organization-${this.speakerCount}" value="${
            data.organization || ''
        }">
                </div>
                <div class="form-group">
                    <label>Photo URL</label>
                    <input type="url" name="speaker-photo-${this.speakerCount}" value="${
            data.photo || ''
        }">
                </div>
            </div>
            <div class="form-group">
                <label>Bio</label>
                <textarea name="speaker-bio-${this.speakerCount}" rows="2">${
            data.bio || ''
        }</textarea>
            </div>
        `;
        container.appendChild(item);
        this.speakerCount++;
    }

    // ========================================
    // CRUD Operations
    // ========================================
    async loadEvents() {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            this.events = data.events || [];
            this.renderEvents();
            this.updateStats();
        } catch (err) {
            this.showNotification('Failed to load events', 'error');
        }
    }

    async saveEvent() {
        const eventData = this.collectFormData();
        if (!this.validateForm(eventData)) return;

        try {
            const url = this.currentEditId ? `/api/events/${this.currentEditId}` : '/api/events';
            const method = this.currentEditId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
            });

            if (res.ok) {
                this.showNotification(
                    this.currentEditId ? 'Event updated!' : 'Event created!',
                    'success'
                );
                this.closeModal();
                this.loadEvents();
            } else {
                const err = await res.json();
                this.showNotification(err.message || 'Failed to save', 'error');
            }
        } catch (err) {
            this.showNotification('Failed to save event', 'error');
        }
    }

    async editEvent(id) {
        try {
            const res = await fetch(`/api/events/${id}`);
            const data = await res.json();
            if (res.ok) {
                this.populateForm(data.event);
                this.openModal('edit');
                this.currentEditId = id;
            } else {
                this.showNotification(`Failed to load event: ${data.message || res.status}`, 'error');
            }
        } catch (err) {
            console.error('Edit event error:', err);
            this.showNotification(`Failed to load event: ${err.message}`, 'error');
        }
    }

    async duplicateEvent(id) {
        if (!confirm('Duplicate this event?')) return;
        try {
            const res = await fetch(`/api/events/${id}/duplicate`, { method: 'POST' });
            if (res.ok) {
                this.showNotification('Event duplicated!', 'success');
                this.loadEvents();
            }
        } catch (err) {
            this.showNotification('Failed to duplicate', 'error');
        }
    }

    async deleteEvent(id) {
        if (!confirm('Delete this event?')) return;
        try {
            const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                this.showNotification('Event deleted!', 'success');
                this.loadEvents();
            }
        } catch (err) {
            this.showNotification('Failed to delete', 'error');
        }
    }

    // ========================================
    // Modal
    // ========================================
    openModal(mode) {
        const modal = document.getElementById('event-modal');
        document.getElementById('modal-title').textContent =
            mode === 'create' ? 'Create Event' : 'Edit Event';
        document.getElementById('save-btn').innerHTML =
            mode === 'create'
                ? '<i class="fas fa-save"></i> Create Event'
                : '<i class="fas fa-save"></i> Update Event';

        if (mode === 'create') {
            this.resetForm();
            this.currentEditId = null;
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        document.getElementById('event-modal').classList.remove('show');
        document.body.style.overflow = '';
        this.currentEditId = null;
    }

    // ========================================
    // Form Handling
    // ========================================
    resetForm() {
        document.getElementById('event-form').reset();

        // Reset event type selector
        document
            .querySelectorAll('.event-type-card')
            .forEach((c, i) => c.classList.toggle('selected', i === 0));
        document.getElementById('single-event-schedule').style.display = 'block';
        document.getElementById('recurring-event-schedule').style.display = 'none';

        // Reset frequency
        document
            .querySelectorAll('#frequency-selector .pill')
            .forEach((p, i) => p.classList.toggle('selected', i === 0));
        document.getElementById('days-of-week-group').style.display = 'block';
        document.getElementById('monthly-type-group').style.display = 'none';
        document.getElementById('custom-dates-group').style.display = 'none';
        const dateRangeGroup = document.getElementById('recurring-date-range-group');
        if (dateRangeGroup) dateRangeGroup.style.display = 'flex';

        // Reset custom dates
        this.customDates = [];
        this.renderCustomDates();

        // Reset day pills
        document.querySelectorAll('.day-pill').forEach((p) => {
            p.classList.remove('selected');
            p.querySelector('input').checked = false;
        });

        // Reset status
        document
            .querySelectorAll('.status-card')
            .forEach((c, i) => c.classList.toggle('selected', i === 0));

        // Reset registration
        document.getElementById('registration-details').style.display = 'none';
        document.getElementById('isRegistrationRequired').checked = false;
        document.getElementById('maxAttendees').value = '';
        document.getElementById('registrationFee').value = '';
        document.getElementById('waitlistEnabled').checked = false;
        document.getElementById('registrationDeadline').value = '';
        this.registrationFields = [];
        this.renderRegistrationFields();

        // Close registration accordion
        const registrationAccordion = document.getElementById('registration-details')?.closest('.accordion-section');
        if (registrationAccordion) {
            registrationAccordion.classList.remove('open');
        }

        // Reset waiver
        document.getElementById('waiver-details').style.display = 'none';
        document.getElementById('waiverEnabled').checked = false;
        document.getElementById('signatureRequired').checked = false;
        document.getElementById('signature-options').style.display = 'none';
        document.getElementById('waiverTitle').value = 'Terms & Acknowledgments';
        document.getElementById('waiverDescription').value = '';
        document.getElementById('signatureLegalText').value = '';
        document.querySelectorAll('.signature-type-selector .pill').forEach((p, i) => {
            p.classList.toggle('selected', i === 0);
        });
        this.acknowledgments = [];
        this.renderAcknowledgments();

        // Reset images
        this.featuredImage = null;
        this.uploadedImages = [];
        this.renderFeaturedImage();
        this.renderGalleryImages();

        // Reset speakers
        document.getElementById('speakers-container').innerHTML = '';
        this.speakerCount = 0;

        // Reset char counts
        document.getElementById('shortDescCount').textContent = '0';
        document.getElementById('descCount').textContent = '0';

        // Set defaults
        document.getElementById('isPublic').checked = true;
    }

    populateForm(event) {
        // Basic info
        document.getElementById('title').value = event.title || '';
        document.getElementById('shortDescription').value = event.shortDescription || '';
        document.getElementById('description').value = event.description || '';
        document.getElementById('category').value = event.category || 'community-service';
        document.getElementById('eventType').value = event.eventType || 'in-person';
        document.getElementById('tags').value = event.tags ? event.tags.join(', ') : '';

        // Update char counts
        document.getElementById('shortDescCount').textContent = (
            event.shortDescription || ''
        ).length;
        document.getElementById('descCount').textContent = (event.description || '').length;

        // Schedule type
        const isRecurring = event.recurring && event.recurring.isRecurring;
        document.querySelectorAll('.event-type-card').forEach((c) => {
            c.classList.toggle(
                'selected',
                c.dataset.type === (isRecurring ? 'recurring' : 'single')
            );
        });
        document.getElementById('single-event-schedule').style.display = isRecurring
            ? 'none'
            : 'block';
        document.getElementById('recurring-event-schedule').style.display = isRecurring
            ? 'block'
            : 'none';

        if (isRecurring) {
            // Recurring settings
            const freq = event.recurring.frequency || 'weekly';
            document.querySelectorAll('#frequency-selector .pill').forEach((p) => {
                p.classList.toggle('selected', p.querySelector('input').value === freq);
            });

            // Show/hide appropriate groups based on frequency
            const daysGroup = document.getElementById('days-of-week-group');
            const monthlyGroup = document.getElementById('monthly-type-group');
            const customDatesGroup = document.getElementById('custom-dates-group');
            const dateRangeGroup = document.getElementById('recurring-date-range-group');

            if (freq === 'custom') {
                daysGroup.style.display = 'none';
                customDatesGroup.style.display = 'block';
                if (dateRangeGroup) dateRangeGroup.style.display = 'none';
                // Load custom dates
                this.customDates = event.recurring.customDates || [];
                this.renderCustomDates();
            } else {
                customDatesGroup.style.display = 'none';
                if (dateRangeGroup) dateRangeGroup.style.display = 'flex';
                daysGroup.style.display = freq === 'daily' ? 'none' : 'block';
                this.customDates = [];
                this.renderCustomDates();
            }

            monthlyGroup.style.display = freq === 'monthly' ? 'block' : 'none';

            // Days of week
            const days = event.recurring.daysOfWeek || [];
            document.querySelectorAll('.day-pill').forEach((p) => {
                const val = parseInt(p.querySelector('input').value);
                p.classList.toggle('selected', days.includes(val));
                p.querySelector('input').checked = days.includes(val);
            });

            if (event.recurring.startDate) {
                document.getElementById('recurringStartDate').value = new Date(
                    event.recurring.startDate
                )
                    .toISOString()
                    .split('T')[0];
            }
            if (event.recurring.endDate) {
                document.getElementById('recurringEndDate').value = new Date(
                    event.recurring.endDate
                )
                    .toISOString()
                    .split('T')[0];
            }
            document.getElementById('recurringStartTime').value = event.startTime || '';
            document.getElementById('recurringEndTime').value = event.endTime || '';
        } else {
            if (event.eventDate) {
                document.getElementById('eventDate').value = new Date(event.eventDate)
                    .toISOString()
                    .split('T')[0];
            }
            document.getElementById('startTime').value = event.startTime || '';
            document.getElementById('endTime').value = event.endTime || '';
        }

        document.getElementById('timezone').value =
            event.timezone || 'America/Indiana/Indianapolis';

        // Location
        if (event.location) {
            document.getElementById('venue').value = event.location.venue || '';
            document.getElementById('street').value = event.location.address?.street || '';
            document.getElementById('city').value = event.location.address?.city || '';
            document.getElementById('state').value = event.location.address?.state || '';
            document.getElementById('zipCode').value = event.location.address?.zipCode || '';
            document.getElementById('virtualLink').value = event.location.virtualLink || '';
        }

        // Registration
        if (event.registration) {
            document.getElementById('isRegistrationRequired').checked =
                event.registration.isRequired;
            document.getElementById('registration-details').style.display = event.registration
                .isRequired
                ? 'block'
                : 'none';

            // Expand the registration accordion if registration is required
            if (event.registration.isRequired) {
                const registrationAccordion = document.getElementById('registration-details')?.closest('.accordion-section');
                if (registrationAccordion) {
                    registrationAccordion.classList.add('open');
                }
            }

            document.getElementById('maxAttendees').value = event.registration.maxAttendees || '';
            document.getElementById('registrationFee').value = event.registration.fee?.amount || '';
            document.getElementById('waitlistEnabled').checked =
                event.registration.waitlistEnabled || false;

            if (event.registration.registrationDeadline) {
                document.getElementById('registrationDeadline').value = new Date(
                    event.registration.registrationDeadline
                )
                    .toISOString()
                    .split('T')[0];
            }

            this.registrationFields = event.registration.fields || [];
            this.renderRegistrationFields();

            // Waiver/Consent
            if (event.registration.waiver) {
                const waiver = event.registration.waiver;
                document.getElementById('waiverEnabled').checked = waiver.enabled || false;
                document.getElementById('waiver-details').style.display = waiver.enabled ? 'block' : 'none';

                // Expand waiver section if waiver is enabled
                if (waiver.enabled) {
                    const waiverSection = document.getElementById('waiver-details')?.closest('.waiver-section');
                    if (waiverSection) {
                        waiverSection.classList.add('open');
                    }
                }
                document.getElementById('waiverTitle').value = waiver.title || 'Terms & Acknowledgments';
                document.getElementById('waiverDescription').value = waiver.description || '';

                // Acknowledgments
                this.acknowledgments = (waiver.acknowledgments || []).map(a => ({
                    text: a.text || '',
                    required: a.required !== false,
                }));
                this.renderAcknowledgments();

                // Signature
                if (waiver.signature) {
                    document.getElementById('signatureRequired').checked = waiver.signature.required || false;
                    document.getElementById('signature-options').style.display = waiver.signature.required ? 'block' : 'none';
                    document.getElementById('signatureLegalText').value = waiver.signature.legalText || '';

                    // Set signature type pill
                    const sigType = waiver.signature.type || 'both';
                    document.querySelectorAll('.signature-type-selector .pill').forEach(p => {
                        const isSelected = p.querySelector('input').value === sigType;
                        p.classList.toggle('selected', isSelected);
                        p.querySelector('input').checked = isSelected;
                    });
                }
            } else {
                this.acknowledgments = [];
                this.renderAcknowledgments();
            }
        }

        // Media
        this.featuredImage = null;
        this.uploadedImages = [];
        if (event.media) {
            if (event.media.featuredImage && event.media.featuredImage.url) {
                this.featuredImage = event.media.featuredImage;
            }
            if (Array.isArray(event.media.gallery)) {
                this.uploadedImages = event.media.gallery.filter(img => img && img.url);
            }
            if (event.media.videos && event.media.videos[0]) {
                document.getElementById('videoUrl').value = event.media.videos[0].url || '';
                document.getElementById('videoTitle').value = event.media.videos[0].title || '';
            }
        }
        this.renderFeaturedImage();
        this.renderGalleryImages();

        // Speakers
        document.getElementById('speakers-container').innerHTML = '';
        this.speakerCount = 0;
        (event.speakers || []).forEach((s) => this.addSpeaker(s));

        // Settings
        const validStatuses = ['draft', 'published', 'cancelled', 'completed'];
        const status = validStatuses.includes(event.status) ? event.status : 'draft';
        document.querySelectorAll('.status-card').forEach((c) => {
            c.classList.toggle('selected', c.querySelector('input').value === status);
        });
        const statusInput = document.querySelector(`input[name="status"][value="${status}"]`);
        if (statusInput) statusInput.checked = true;

        document.getElementById('featured').checked = event.featured || false;
        document.getElementById('isPublic').checked = event.isPublic !== false;
    }

    collectFormData() {
        const form = document.getElementById('event-form');
        const formData = new FormData(form);

        const isRecurring =
            document.querySelector('.event-type-card.selected').dataset.type === 'recurring';

        // Speakers
        const speakers = [];
        document.querySelectorAll('.speaker-item').forEach((item, i) => {
            const name = item.querySelector(`input[name^="speaker-name"]`).value.trim();
            if (name) {
                speakers.push({
                    name,
                    title: item.querySelector(`input[name^="speaker-title"]`).value || '',
                    organization:
                        item.querySelector(`input[name^="speaker-organization"]`).value || '',
                    photo: item.querySelector(`input[name^="speaker-photo"]`).value || '',
                    bio: item.querySelector(`textarea[name^="speaker-bio"]`).value || '',
                });
            }
        });

        // Location
        const location = {
            venue: formData.get('venue') || '',
            address: {
                street: formData.get('street') || '',
                city: formData.get('city') || '',
                state: formData.get('state') || '',
                zipCode: formData.get('zipCode') || '',
                country: 'USA',
            },
            virtualLink: formData.get('virtualLink') || '',
        };

        // Media
        const media = {
            featuredImage: this.featuredImage,
            gallery: this.uploadedImages,
            videos: [],
        };
        if (formData.get('videoUrl')) {
            media.videos.push({
                url: formData.get('videoUrl'),
                title: formData.get('videoTitle') || '',
            });
        }

        // Registration
        const registration = {
            isRequired: formData.has('isRegistrationRequired'),
            maxAttendees: formData.get('maxAttendees')
                ? parseInt(formData.get('maxAttendees'))
                : null,
            fee: { amount: parseFloat(formData.get('registrationFee')) || 0, currency: 'USD' },
            registrationDeadline: formData.get('registrationDeadline') || null,
            waitlistEnabled: formData.has('waitlistEnabled'),
            fields: this.registrationFields,
            isOpen: true,
            // Waiver/Consent
            waiver: {
                enabled: formData.has('waiverEnabled'),
                title: formData.get('waiverTitle') || 'Terms & Acknowledgments',
                description: formData.get('waiverDescription') || '',
                acknowledgments: this.acknowledgments.filter(a => a.text.trim()).map((a, i) => ({
                    text: a.text,
                    required: a.required,
                    order: i,
                })),
                signature: {
                    required: formData.has('signatureRequired'),
                    type: document.querySelector('.signature-type-selector .pill.selected input')?.value || 'both',
                    legalText: formData.get('signatureLegalText') || 'By signing below, I acknowledge that I have read and agree to all the terms and conditions above.',
                },
            },
        };

        // Tags
        const tagsStr = formData.get('tags') || '';
        const tags = tagsStr
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t);

        // Recurring
        let recurring = { isRecurring: false };
        let eventDate = formData.get('eventDate');
        let startTime = formData.get('startTime');
        let endTime = formData.get('endTime');

        if (isRecurring) {
            const frequency = document.querySelector('#frequency-selector .pill.selected input').value;
            const daysOfWeek = [];
            document.querySelectorAll('.day-pill.selected input').forEach((inp) => {
                daysOfWeek.push(parseInt(inp.value));
            });

            recurring = {
                isRecurring: true,
                frequency,
                daysOfWeek,
                startDate: formData.get('recurringStartDate'),
                endDate: formData.get('recurringEndDate') || null,
                monthlyType: formData.get('monthlyType') || 'date',
                customDates: frequency === 'custom' ? this.customDates : [],
            };

            if (frequency === 'custom' && this.customDates.length > 0) {
                eventDate = this.customDates[0];
            } else {
                eventDate = formData.get('recurringStartDate');
            }
            startTime = formData.get('recurringStartTime');
            endTime = formData.get('recurringEndTime');
        }

        return {
            title: formData.get('title'),
            shortDescription: formData.get('shortDescription') || '',
            description: formData.get('description'),
            category: formData.get('category'),
            eventType: formData.get('eventType'),
            status: formData.get('status'),
            eventDate,
            startTime,
            endTime,
            timezone:
                formData.get('timezone') ||
                formData.get('timezoneRecurring') ||
                'America/Indiana/Indianapolis',
            location,
            speakers,
            media,
            registration,
            tags,
            featured: formData.has('featured'),
            isPublic: formData.has('isPublic'),
            recurring,
        };
    }

    validateForm(data) {
        if (!data.title?.trim()) {
            this.showNotification('Title is required', 'error');
            return false;
        }
        if (!data.description?.trim()) {
            this.showNotification('Description is required', 'error');
            return false;
        }
        if (!data.eventDate) {
            this.showNotification('Date is required', 'error');
            return false;
        }
        if (data.recurring.isRecurring) {
            if (data.recurring.frequency === 'custom') {
                if (!data.recurring.customDates || data.recurring.customDates.length === 0) {
                    this.showNotification('Please add at least one date', 'error');
                    return false;
                }
            } else if (
                data.recurring.daysOfWeek.length === 0 &&
                data.recurring.frequency !== 'daily'
            ) {
                this.showNotification('Please select at least one day', 'error');
                return false;
            }
        }
        return true;
    }

    // ========================================
    // Render & Filter
    // ========================================
    renderEvents() {
        const tbody = document.getElementById('events-table');

        if (!this.events.length) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="empty-state">
                    <div class="empty-content">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No events found</h3>
                        <p>Create your first event to get started</p>
                    </div>
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = this.events
            .map((e) => {
                const date = new Date(e.eventDate).toLocaleDateString();
                const cat = e.category
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                const status = e.status.charAt(0).toUpperCase() + e.status.slice(1);
                const type = e.eventType
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join('-');
                const desc = e.shortDescription || e.description?.substring(0, 60) + '...' || '';

                return `
                <tr data-id="${e._id}">
                    <td>
                        <div class="event-info">
                            <strong>${this.escapeHtml(e.title)}</strong>
                            ${
                                e.featured
                                    ? '<i class="fas fa-star featured" title="Featured"></i>'
                                    : ''
                            }
                            ${
                                e.recurring?.isRecurring
                                    ? '<i class="fas fa-sync-alt recurring-badge" title="Recurring"></i>'
                                    : ''
                            }
                            ${
                                e.registration?.isRequired
                                    ? '<span class="registration-badge" title="Registration Required"><i class="fas fa-clipboard-check"></i> REG</span>'
                                    : ''
                            }
                            <div class="event-desc">${this.escapeHtml(desc)}</div>
                        </div>
                    </td>
                    <td><span class="badge category-${e.category}">${cat}</span></td>
                    <td><span class="badge status-${e.status}">${status}</span></td>
                    <td><div class="date-time">${date}<div class="time">${
                    e.startTime || ''
                }</div></div></td>
                    <td><span class="badge type-${e.eventType}">${type}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-edit" data-id="${
                                e._id
                            }" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-duplicate" data-id="${
                                e._id
                            }" title="Duplicate"><i class="fas fa-copy"></i></button>
                            <button class="btn btn-sm btn-delete" data-id="${
                                e._id
                            }" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            })
            .join('');
    }

    filterEvents() {
        const search = document.getElementById('search').value.toLowerCase();
        const category = document.getElementById('filter-category').value;
        const status = document.getElementById('filter-status').value;

        document.querySelectorAll('#events-table tr[data-id]').forEach((row) => {
            const event = this.events.find((e) => e._id === row.dataset.id);
            if (!event) return;

            let show = true;
            if (search && !`${event.title} ${event.description}`.toLowerCase().includes(search))
                show = false;
            if (category && event.category !== category) show = false;
            if (status && event.status !== status) show = false;

            row.style.display = show ? '' : 'none';
        });
    }

    updateStats() {
        const stats = {
            total: this.events.length,
            published: this.events.filter((e) => e.status === 'published').length,
            upcoming: this.events.filter(
                (e) => e.status === 'published' && new Date(e.eventDate) > new Date()
            ).length,
            draft: this.events.filter((e) => e.status === 'draft').length,
        };

        document.querySelectorAll('.stat-number').forEach((el, i) => {
            el.textContent = [stats.total, stats.published, stats.upcoming, stats.draft][i] || 0;
        });
    }

    // ========================================
    // Utilities
    // ========================================
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
    window.eventManager = new EventManager();
});
