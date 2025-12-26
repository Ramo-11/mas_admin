const ActivityLog = require('../models/ActivityLog');
const { logger } = require('./logger');

// Log an activity
const logActivity = async (user, action, resourceType, resourceId, resourceName, details, ipAddress) => {
    try {
        const activityLog = new ActivityLog({
            user: user._id,
            userName: user.name,
            userEmail: user.email,
            action,
            resourceType,
            resourceId,
            resourceName,
            details,
            ipAddress,
        });

        await activityLog.save();
        logger.info(`Activity logged: ${user.email} ${action} ${resourceType} ${resourceName || resourceId}`);
    } catch (error) {
        logger.error(`Error logging activity: ${error.message}`);
    }
};

// Get all activity logs (for super admin only)
const getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            action = '',
            resourceType = '',
            userId = '',
            startDate = '',
            endDate = '',
        } = req.query;

        // Build filter object
        const filter = {};

        if (action) filter.action = action;
        if (resourceType) filter.resourceType = resourceType;
        if (userId) filter.user = userId;

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, totalCount] = await Promise.all([
            ActivityLog.find(filter)
                .populate('user', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ActivityLog.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        return res.status(200).json({
            logs,
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        });
    } catch (error) {
        logger.error(`Error getting activity logs: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving activity logs' });
    }
};

// Get activity stats
const getActivityStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, actionStats, resourceStats] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            ActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            ActivityLog.aggregate([
                { $group: { _id: '$resourceType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        return res.status(200).json({
            totalLogs,
            todayLogs,
            actionStats,
            resourceStats,
        });
    } catch (error) {
        logger.error(`Error getting activity stats: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving activity stats' });
    }
};

module.exports = {
    logActivity,
    getActivityLogs,
    getActivityStats,
};
