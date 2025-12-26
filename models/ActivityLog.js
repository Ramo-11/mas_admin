const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        userName: {
            type: String,
            required: true,
        },
        userEmail: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: ['create', 'update', 'delete', 'login', 'logout'],
            required: true,
        },
        resourceType: {
            type: String,
            enum: ['event', 'registration', 'user'],
            required: true,
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        resourceName: {
            type: String,
            required: false,
        },
        details: {
            type: String,
            required: false,
        },
        ipAddress: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
