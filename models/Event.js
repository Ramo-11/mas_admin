const mongoose = require('mongoose');

// Define the Event schema
const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        shortDescription: {
            type: String,
            trim: true,
            maxlength: 300,
        },
        category: {
            type: String,
            required: true,
            enum: [
                'community-service',
                'educational',
                'religious',
                'cultural',
                'youth',
                'interfaith',
                'fundraising',
                'health-wellness',
                'social',
                'workshop',
                'conference',
                'meeting',
                'other',
            ],
            default: 'community-service',
        },
        eventType: {
            type: String,
            required: true,
            enum: ['in-person', 'virtual', 'hybrid'],
            default: 'in-person',
        },
        status: {
            type: String,
            required: true,
            enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
            default: 'draft',
        },
        eventDate: {
            type: Date,
            required: true,
        },
        startTime: {
            type: String,
        },
        endTime: {
            type: String,
        },
        timezone: {
            type: String,
            default: 'America/Indiana/Indianapolis',
        },
        location: {
            venue: {
                type: String,
                trim: true,
            },
            address: {
                street: String,
                city: String,
                state: String,
                zipCode: String,
                country: {
                    type: String,
                    default: 'USA',
                },
            },
            coordinates: {
                latitude: Number,
                longitude: Number,
            },
            virtualLink: String,
            additionalInfo: String,
        },
        speakers: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                bio: String,
                title: String,
                organization: String,
                photo: String,
                socialLinks: {
                    linkedin: String,
                    twitter: String,
                    website: String,
                },
            },
        ],
        media: {
            featuredImage: {
                url: String,
                alt: String,
                caption: String,
            },
            gallery: [
                {
                    url: String,
                    alt: String,
                    caption: String,
                    type: {
                        type: String,
                        enum: ['image', 'video'],
                        default: 'image',
                    },
                },
            ],
            videos: [
                {
                    title: String,
                    url: String,
                    platform: {
                        type: String,
                        enum: ['youtube', 'vimeo', 'facebook', 'instagram', 'other'],
                        default: 'youtube',
                    },
                    embedId: String,
                    thumbnail: String,
                    duration: String,
                },
            ],
        },
        registration: {
            isRequired: {
                type: Boolean,
                default: false,
            },
            maxAttendees: {
                type: Number,
                min: 0,
            },
            currentAttendees: {
                type: Number,
                default: 0,
                min: 0,
            },
            registrationDeadline: Date,
            fee: {
                amount: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
                currency: {
                    type: String,
                    default: 'USD',
                },
            },
            // Enhanced fields schema for dynamic form builder
            fields: [
                {
                    name: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    type: {
                        type: String,
                        enum: [
                            'text',
                            'textarea',
                            'email',
                            'phone',
                            'number',
                            'select',
                            'checkbox',
                            'radio',
                            'date',
                        ],
                        default: 'text',
                    },
                    required: {
                        type: Boolean,
                        default: false,
                    },
                    placeholder: {
                        type: String,
                        trim: true,
                    },
                    helpText: {
                        type: String,
                        trim: true,
                    },
                    options: [String], // For select, radio, checkbox fields
                    validation: {
                        minLength: Number,
                        maxLength: Number,
                        min: Number,
                        max: Number,
                        pattern: String,
                    },
                    order: {
                        type: Number,
                        default: 0,
                    },
                },
            ],
            isOpen: {
                type: Boolean,
                default: true,
            },
            waitlistEnabled: {
                type: Boolean,
                default: false,
            },
            confirmationMessage: {
                type: String,
                trim: true,
                default:
                    'Thank you for registering! You will receive a confirmation email shortly.',
            },
        },
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],
        featured: {
            type: Boolean,
            default: false,
        },
        recurring: {
            isRecurring: {
                type: Boolean,
                default: false,
            },
            frequency: {
                type: String,
                enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom'],
            },
            interval: {
                type: Number,
                default: 1,
                min: 1,
            },
            startDate: Date,
            endDate: Date,
            daysOfWeek: [Number], // 0 = Sunday, 1 = Monday, etc.
            monthlyType: {
                type: String,
                enum: ['date', 'day'], // same date each month vs same day (e.g., 2nd Tuesday)
            },
            customDates: [String], // Array of date strings for custom frequency
        },
        parentEvent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
        },
        childEvents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Event',
            },
        ],
        analytics: {
            views: {
                type: Number,
                default: 0,
            },
            shares: {
                type: Number,
                default: 0,
            },
        },
        customFields: [
            {
                name: String,
                value: mongoose.Schema.Types.Mixed,
                type: String,
            },
        ],
        isPublic: {
            type: Boolean,
            default: true,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for better query performance
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ featured: 1, eventDate: 1 });
eventSchema.index({ 'location.coordinates': '2dsphere' });
eventSchema.index({ tags: 1 });

// Virtual for event duration
eventSchema.virtual('duration').get(function () {
    if (this.eventDate && this.endTime && this.startTime) {
        const start = new Date(`${this.eventDate.toISOString().split('T')[0]}T${this.startTime}`);
        const end = new Date(`${this.eventDate.toISOString().split('T')[0]}T${this.endTime}`);
        return Math.abs(end - start) / (1000 * 60 * 60); // Duration in hours
    }
    return 0;
});

// Virtual for registration availability
eventSchema.virtual('isRegistrationOpen').get(function () {
    if (!this.registration.isRequired) return false;
    if (!this.registration.isOpen) return false;

    const now = new Date();
    if (this.registration.registrationDeadline && now > this.registration.registrationDeadline) {
        return false;
    }

    if (this.registration.maxAttendees) {
        const currentAttendees = this.registration.currentAttendees || 0;
        if (
            currentAttendees >= this.registration.maxAttendees &&
            !this.registration.waitlistEnabled
        ) {
            return false;
        }
    }

    return true;
});

// Virtual for spots remaining
eventSchema.virtual('spotsRemaining').get(function () {
    if (!this.registration.maxAttendees) return null; // Unlimited
    const currentAttendees = this.registration.currentAttendees || 0;
    return Math.max(0, this.registration.maxAttendees - currentAttendees);
});

// Virtual for waitlist status
eventSchema.virtual('isOnWaitlist').get(function () {
    if (!this.registration.maxAttendees || !this.registration.waitlistEnabled) return false;
    const currentAttendees = this.registration.currentAttendees || 0;
    return currentAttendees >= this.registration.maxAttendees;
});

// Virtual for event status based on dates
eventSchema.virtual('computedStatus').get(function () {
    const now = new Date();

    if (this.status === 'cancelled' || this.status === 'archived') {
        return this.status;
    }

    if (now < this.eventDate) {
        return 'upcoming';
    } else if (now >= this.eventDate) {
        return 'ongoing';
    } else {
        return 'completed';
    }
});

// Pre-save middleware to generate slug
eventSchema.pre('save', function (next) {
    if (this.isModified('title') || !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        // Add timestamp if slug might not be unique
        if (!this.isNew && this.isModified('title')) {
            this.slug += `-${Date.now()}`;
        }
    }

    // Auto-generate short description if not provided
    if (!this.shortDescription && this.description) {
        this.shortDescription =
            this.description.length > 297
                ? this.description.substring(0, 297) + '...'
                : this.description;
    }

    // Validate registration deadline
    if (
        this.registration.registrationDeadline &&
        this.registration.registrationDeadline > this.eventDate
    ) {
        const error = new Error('Registration deadline must be before event start date');
        return next(error);
    }

    // Order registration fields
    if (this.registration.fields && this.registration.fields.length > 0) {
        this.registration.fields = this.registration.fields.map((field, index) => ({
            ...(field.toObject ? field.toObject() : field),
            order: field.order || index,
        }));
    }

    next();
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function (limit = 10) {
    return this.find({
        eventDate: { $gte: new Date() },
        status: 'published',
        isPublic: true,
    })
        .sort({ eventDate: 1 })
        .limit(limit);
};

// Static method to find events by category
eventSchema.statics.findByCategory = function (category, limit = 10) {
    return this.find({
        category: category,
        status: 'published',
        isPublic: true,
    })
        .sort({ eventDate: -1 })
        .limit(limit);
};

// Static method to find featured events
eventSchema.statics.findFeatured = function (limit = 5) {
    return this.find({
        featured: true,
        status: 'published',
        isPublic: true,
        eventDate: { $gte: new Date() },
    })
        .sort({ eventDate: 1 })
        .limit(limit);
};

// Static method to find events with registration open
eventSchema.statics.findWithOpenRegistration = function (limit = 10) {
    const now = new Date();
    return this.find({
        status: 'published',
        isPublic: true,
        eventDate: { $gte: now },
        'registration.isRequired': true,
        'registration.isOpen': true,
        $or: [
            { 'registration.registrationDeadline': { $exists: false } },
            { 'registration.registrationDeadline': null },
            { 'registration.registrationDeadline': { $gte: now } },
        ],
    })
        .sort({ eventDate: 1 })
        .limit(limit);
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
