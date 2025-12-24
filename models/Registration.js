const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
            index: true,
        },
        registrationData: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
            default: 'confirmed',
        },
        email: {
            type: String,
            required: false,
            trim: true,
            lowercase: true,
            index: true,
        },
        confirmationNumber: {
            type: String,
            unique: true,
        },
        registeredAt: {
            type: Date,
            default: Date.now,
        },
        isWaitlisted: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
            trim: true,
        },
        // Waiver/Consent data
        waiver: {
            acknowledged: {
                type: Boolean,
                default: false,
            },
            acknowledgments: [
                {
                    text: String,
                    accepted: Boolean,
                    acceptedAt: Date,
                },
            ],
            signature: {
                type: {
                    type: String,
                    enum: ['draw', 'type'],
                },
                value: String, // Base64 image for draw, or typed name for type
                signedAt: Date,
                ipAddress: String,
            },
        },
        metadata: {
            userAgent: String,
            ipAddress: String,
            referrer: String,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes - only enforce uniqueness when email is present
registrationSchema.index(
    { event: 1, email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: 'string', $ne: '' } } }
);
registrationSchema.index({ status: 1, event: 1 });

// Generate confirmation number before saving
registrationSchema.pre('save', function (next) {
    if (!this.confirmationNumber) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.confirmationNumber = `REG-${timestamp}-${random}`;
    }
    next();
});

// Static method to check if email is already registered for an event
registrationSchema.statics.isAlreadyRegistered = async function (eventId, email) {
    const existing = await this.findOne({
        event: eventId,
        email: email.toLowerCase(),
        status: { $ne: 'cancelled' },
    });
    return !!existing;
};

// Static method to get registration count for an event
registrationSchema.statics.getEventRegistrationCount = async function (eventId) {
    return await this.countDocuments({
        event: eventId,
        status: { $in: ['confirmed', 'pending'] },
    });
};

// Static method to get waitlist count for an event
registrationSchema.statics.getWaitlistCount = async function (eventId) {
    return await this.countDocuments({
        event: eventId,
        isWaitlisted: true,
        status: { $ne: 'cancelled' },
    });
};

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
