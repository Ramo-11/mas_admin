const User = require('../models/User');
const { logger } = require('./logger');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        // Check if it's an API request
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login');
    }
    next();
};

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login');
    }

    if (req.session.userRole !== 'super_admin') {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
        }
        return res.redirect('/');
    }
    next();
};

// Middleware to load user data and attach to request
const loadUser = async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findById(req.session.userId)
                .select('-password')
                .populate('assignedEvents', 'title');

            if (user && user.isActive) {
                req.user = user;
                res.locals.user = user; // Make available to views
            } else {
                // User not found or inactive, clear session
                req.session.destroy();
                if (!req.path.startsWith('/api/')) {
                    return res.redirect('/login');
                }
            }
        } catch (error) {
            logger.error(`Error loading user: ${error.message}`);
        }
    }
    next();
};

// Helper function to get event filter based on user access
const getEventFilter = (user) => {
    if (!user) return { _id: { $in: [] } }; // No access
    if (user.role === 'super_admin') return {}; // All events
    return { _id: { $in: user.assignedEvents } }; // Only assigned events
};

// Helper function to check if user has access to specific event
const hasEventAccess = (user, eventId) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.assignedEvents.some(
        (id) => id.toString() === eventId.toString()
    );
};

module.exports = {
    requireAuth,
    requireSuperAdmin,
    loadUser,
    getEventFilter,
    hasEventAccess,
};
