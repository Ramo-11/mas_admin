const express = require("express")
const route = express.Router()
require("dotenv").config()

const {
    getEvents,
    getEventStats,
    getUpcomingEvents,
    getFeaturedEvents,
    getEventsByCategory,
    getEventById,
    getEventBySlug,
    createEvent,
    updateEvent,
    toggleEventStatus,
    restoreEvent,
    deleteEvent,
    permanentDeleteEvent,
    duplicateEvent
} = require("./eventController")

const {
    getRegistrations,
    getRegistrationById,
    getRegistrationsByEvent,
    updateRegistrationStatus,
    updateRegistration,
    deleteRegistration,
    permanentDeleteRegistration,
    getRegistrationStats,
    bulkUpdateStatus,
    exportRegistrations,
} = require("./registrationController")

const {
    getLoginPage,
    login,
    logout,
    getCurrentUser,
} = require("./authController")

const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    permanentDeleteUser,
} = require("./userController")

const {
    getActivityLogs,
    getActivityStats,
} = require("./activityLogController")

const {
    requireAuth,
    requireSuperAdmin,
    loadUser,
    getEventFilter,
} = require("./authMiddleware")

// Import Cloudinary handler
const {
    upload,
    handleImageUpload,
    handleMultipleImageUpload,
    handleImageDeletion,
    handleMulterError
} = require("./cloudinaryHandler")

const Event = require("../models/Event")
const Registration = require("../models/Registration")
const User = require("../models/User")

// *********** Authentication Routes (No auth required) **********
route.get("/login", getLoginPage)
route.post("/login", login)
route.get("/logout", logout)

// Apply loadUser middleware to all subsequent routes
route.use(loadUser)

// *********** Protected Routes **********

// Dashboard - main route
route.get("/", requireAuth, async (req, res) => {
    try {
        // Build event filter based on user access
        const eventFilter = { isArchived: { $ne: true } };

        // If event admin, only show assigned events
        if (req.user.role === 'event_admin') {
            eventFilter._id = { $in: req.user.assignedEvents };
        }

        // Fetch events
        const events = await Event.find(eventFilter)
            .populate('speakers', 'name title organization')
            .sort({ eventDate: -1 });

        // Calculate stats
        const stats = {
            total: events.length,
            published: events.filter(e => e.status === 'published').length,
            upcoming: events.filter(e => e.status === 'published' && new Date(e.eventDate) > new Date()).length,
            draft: events.filter(e => e.status === 'draft').length
        };

        res.render("index", { events, stats, user: req.user });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render("index", {
            events: [],
            stats: { total: 0, published: 0, upcoming: 0, draft: 0 },
            user: req.user
        });
    }
});

// Registrations page
route.get("/registrations", requireAuth, async (req, res) => {
    try {
        // Build event filter based on user access
        const eventFilter = { isArchived: { $ne: true } };
        let registrationFilter = {};

        if (req.user.role === 'event_admin') {
            eventFilter._id = { $in: req.user.assignedEvents };
            registrationFilter.event = { $in: req.user.assignedEvents };
        }

        // Fetch stats (filtered by user access)
        const [totalRegistrations, confirmed, pending, waitlisted] = await Promise.all([
            Registration.countDocuments(registrationFilter),
            Registration.countDocuments({ ...registrationFilter, status: 'confirmed' }),
            Registration.countDocuments({ ...registrationFilter, status: 'pending' }),
            Registration.countDocuments({ ...registrationFilter, status: 'waitlisted' }),
        ]);

        // Fetch events for filter dropdown (only accessible events)
        const events = await Event.find(eventFilter)
            .select('title eventDate')
            .sort({ eventDate: -1 });

        const stats = {
            total: totalRegistrations,
            confirmed,
            pending,
            waitlisted,
        };

        res.render("registrations", { stats, events, user: req.user });
    } catch (error) {
        console.error('Error loading registrations page:', error);
        res.render("registrations", {
            stats: { total: 0, confirmed: 0, pending: 0, waitlisted: 0 },
            events: [],
            user: req.user
        });
    }
});

// Users page (super admin only)
route.get("/users", requireSuperAdmin, async (req, res) => {
    try {
        // Fetch all events for assignment dropdown
        const events = await Event.find({ isArchived: { $ne: true } })
            .select('title eventDate')
            .sort({ eventDate: -1 });

        res.render("users", { events, user: req.user });
    } catch (error) {
        console.error('Error loading users page:', error);
        res.render("users", { events: [], user: req.user });
    }
});

// Activity Logs page (super admin only)
route.get("/activity-logs", requireSuperAdmin, async (req, res) => {
    try {
        // Fetch all users for filter dropdown
        const users = await User.find({ isActive: true })
            .select('name email')
            .sort({ name: 1 });

        res.render("activity-logs", { users, user: req.user });
    } catch (error) {
        console.error('Error loading activity logs page:', error);
        res.render("activity-logs", { users: [], user: req.user });
    }
});

// *********** API Routes **********

// Events API (protected)
route.get("/api/events", requireAuth, getEvents)
route.get("/api/events/stats", requireAuth, getEventStats)
route.get("/api/events/upcoming", requireAuth, getUpcomingEvents)
route.get("/api/events/featured", requireAuth, getFeaturedEvents)
route.get("/api/events/category/:category", requireAuth, getEventsByCategory)
route.get("/api/events/slug/:slug", requireAuth, getEventBySlug)
route.get("/api/events/:id", requireAuth, getEventById)

// Registration API routes (protected)
route.get("/api/registrations", requireAuth, getRegistrations)
route.get("/api/registrations/stats", requireAuth, getRegistrationStats)
route.get("/api/registrations/export", requireAuth, exportRegistrations)
route.get("/api/registrations/event/:eventId", requireAuth, getRegistrationsByEvent)
route.get("/api/registrations/:id", requireAuth, getRegistrationById)

// User API routes (super admin only)
route.get("/api/users", requireSuperAdmin, getUsers)
route.get("/api/users/:id", requireSuperAdmin, getUserById)
route.post("/api/users", requireSuperAdmin, createUser)
route.put("/api/users/:id", requireSuperAdmin, updateUser)
route.delete("/api/users/:id", requireSuperAdmin, deleteUser)
route.delete("/api/users/:id/permanent", requireSuperAdmin, permanentDeleteUser)

// Activity Log API routes (super admin only)
route.get("/api/activity-logs", requireSuperAdmin, getActivityLogs)
route.get("/api/activity-logs/stats", requireSuperAdmin, getActivityStats)

// Current user API
route.get("/api/me", requireAuth, getCurrentUser)

// *********** POST requests (protected) **********
route.post("/api/events", requireAuth, createEvent)
route.post("/api/events/:id/duplicate", requireAuth, duplicateEvent)

// Image upload routes (protected)
route.post('/api/upload/image', requireAuth, upload.single('image'), handleImageUpload)
route.post('/api/upload/images', requireAuth, upload.array('images', 10), handleMultipleImageUpload)

// *********** PUT requests (protected) **********
route.put("/api/events/:id", requireAuth, updateEvent)
route.put("/api/events/:id/status", requireAuth, toggleEventStatus)
route.put("/api/events/:id/restore", requireAuth, restoreEvent)

// Registration PUT routes (protected)
route.put("/api/registrations/bulk-status", requireAuth, bulkUpdateStatus)
route.put("/api/registrations/:id", requireAuth, updateRegistration)
route.put("/api/registrations/:id/status", requireAuth, updateRegistrationStatus)

// *********** DELETE requests (protected) **********
route.delete("/api/events/:id", requireAuth, deleteEvent)
route.delete("/api/events/:id/permanent", requireAuth, permanentDeleteEvent)
route.delete("/api/upload/image/:publicId", requireAuth, handleImageDeletion)

// Registration DELETE routes (protected)
route.delete("/api/registrations/:id", requireAuth, deleteRegistration)
route.delete("/api/registrations/:id/permanent", requireAuth, permanentDeleteRegistration)

// Error handling middleware (should be last)
route.use(handleMulterError)

module.exports = route
