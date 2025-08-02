const mongoose = require("mongoose");

// Define the Event schema
const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: 300
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
            'other'
        ],
        default: 'community-service'
    },
    eventType: {
        type: String,
        required: true,
        enum: ['in-person', 'virtual', 'hybrid'],
        default: 'in-person'
    },
    status: {
        type: String,
        required: true,
        enum: ['draft', 'published', 'cancelled', 'completed', 'archived'],
        default: 'draft'
    },
    eventDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
    },
    endTime: {
        type: String,
    },
    timezone: {
        type: String,
        default: 'America/Indiana/Indianapolis'
    },
    location: {
        venue: {
            type: String,
            trim: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: {
                type: String,
                default: 'USA'
            }
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        },
        virtualLink: String,
        additionalInfo: String
    },
    speakers: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        bio: String,
        title: String,
        organization: String,
        photo: String,
        socialLinks: {
            linkedin: String,
            twitter: String,
            website: String
        }
    }],
    media: {
        featuredImage: {
            url: String,
            alt: String,
            caption: String
        },
        gallery: [{
            url: String,
            alt: String,
            caption: String,
            type: {
                type: String,
                enum: ['image', 'video'],
                default: 'image'
            }
        }],
        videos: [{
            title: String,
            url: String,
            platform: {
                type: String,
                enum: ['youtube', 'vimeo', 'facebook', 'instagram', 'other'],
                default: 'youtube'
            },
            embedId: String,
            thumbnail: String,
            duration: String
        }]
    },
    registration: {
        isRequired: {
            type: Boolean,
            default: false
        },
        maxAttendees: {
            type: Number,
            min: 0
        },
        registrationDeadline: Date,
        fee: {
            amount: {
                type: Number,
                default: 0,
                min: 0
            },
            currency: {
                type: String,
                default: 'USD'
            }
        },
        fields: [{
            name: String,
            type: {
                type: String,
                enum: ['text', 'email', 'phone', 'select', 'checkbox', 'textarea'],
                default: 'text'
            },
            required: {
                type: Boolean,
                default: false
            },
            options: [String] // For select fields
        }],
        isOpen: {
            type: Boolean,
            default: true
        },
        waitlistEnabled: {
            type: Boolean,
            default: false
        }
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    featured: {
        type: Boolean,
        default: false
    },
    recurring: {
        isRecurring: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly']
        },
        interval: {
            type: Number,
            default: 1,
            min: 1
        },
        endRecurrence: Date,
        daysOfWeek: [Number], // 0 = Sunday, 1 = Monday, etc.
        monthlyType: {
            type: String,
            enum: ['date', 'day'] // same date each month vs same day (e.g., 2nd Tuesday)
        }
    },
    parentEvent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },
    childEvents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    }],
    analytics: {
        views: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        }
    },
    customFields: [{
        name: String,
        value: mongoose.Schema.Types.Mixed,
        type: String
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
eventSchema.index({ startDate: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });
eventSchema.index({ slug: 1 });
eventSchema.index({ featured: 1, startDate: 1 });
eventSchema.index({ 'location.coordinates': '2dsphere' });
eventSchema.index({ tags: 1 });

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
    if (this.startDate && this.endDate) {
        return Math.abs(this.endDate - this.startDate) / (1000 * 60 * 60); // Duration in hours
    }
    return 0;
});

// Virtual for registration availability
eventSchema.virtual('isRegistrationOpen').get(function() {
    if (!this.registration.isRequired) return false;
    if (!this.registration.isOpen) return false;
    
    const now = new Date();
    if (this.registration.registrationDeadline && now > this.registration.registrationDeadline) {
        return false;
    }
    
    if (this.registration.maxAttendees) {
        // Since we don't track current attendees, assume registration is open
        // This could be managed externally or through a separate registration system
        return true;
    }
    
    return true;
});

// Virtual for event status based on dates
eventSchema.virtual('computedStatus').get(function() {
    const now = new Date();
    
    if (this.status === 'cancelled' || this.status === 'archived') {
        return this.status;
    }
    
    if (now < this.startDate) {
        return 'upcoming';
    } else if (now >= this.startDate && now <= this.endDate) {
        return 'ongoing';
    } else {
        return 'completed';
    }
});

// Pre-save middleware to generate slug
eventSchema.pre('save', function(next) {
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
        this.shortDescription = this.description.length > 297 
            ? this.description.substring(0, 297) + '...'
            : this.description;
    }
    
    // Validate date logic
    if (this.endDate < this.startDate) {
        const error = new Error('End date must be after start date');
        return next(error);
    }
    
    // Validate registration deadline
    if (this.registration.registrationDeadline && this.registration.registrationDeadline > this.startDate) {
        const error = new Error('Registration deadline must be before event start date');
        return next(error);
    }
    
    next();
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(limit = 10) {
    return this.find({
        startDate: { $gte: new Date() },
        status: 'published',
        isPublic: true
    })
    .sort({ startDate: 1 })
    .limit(limit);
};

// Static method to find events by category
eventSchema.statics.findByCategory = function(category, limit = 10) {
    return this.find({
        category: category,
        status: 'published',
        isPublic: true
    })
    .sort({ startDate: -1 })
    .limit(limit);
};

// Static method to find featured events
eventSchema.statics.findFeatured = function(limit = 5) {
    return this.find({
        featured: true,
        status: 'published',
        isPublic: true,
        startDate: { $gte: new Date() }
    })
    .sort({ startDate: 1 })
    .limit(limit);
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;