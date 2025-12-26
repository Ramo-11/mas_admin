const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ['super_admin', 'event_admin'],
            default: 'event_admin',
        },
        assignedEvents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Event',
            },
        ],
        permissions: {
            canDeleteEvents: {
                type: Boolean,
                default: false,
            },
            canDeleteRegistrations: {
                type: Boolean,
                default: false,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if user has access to an event
userSchema.methods.hasAccessToEvent = function (eventId) {
    if (this.role === 'super_admin') return true;
    return this.assignedEvents.some(
        (id) => id.toString() === eventId.toString()
    );
};

// Get accessible event IDs (returns null for super_admin meaning all events)
userSchema.methods.getAccessibleEventIds = function () {
    if (this.role === 'super_admin') return null;
    return this.assignedEvents.map((id) => id.toString());
};

// Check if user can delete events
userSchema.methods.canDeleteEvents = function () {
    if (this.role === 'super_admin') return true;
    return this.permissions?.canDeleteEvents === true;
};

// Check if user can delete registrations
userSchema.methods.canDeleteRegistrations = function () {
    if (this.role === 'super_admin') return true;
    return this.permissions?.canDeleteRegistrations === true;
};

// Static method to find active users
userSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
