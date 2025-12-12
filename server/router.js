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

// *********** GET requests **********
// Updated main route to fetch data for the dashboard
route.get("/", async (req, res) => {
    try {
        // Fetch events
        const events = await Event.find({ isArchived: { $ne: true } })
            .populate('speakers', 'name title organization')
            .sort({ eventDate: -1 });

        // Calculate stats
        const stats = {
            total: events.length,
            published: events.filter(e => e.status === 'published').length,
            upcoming: events.filter(e => e.status === 'published' && new Date(e.eventDate) > new Date()).length,
            draft: events.filter(e => e.status === 'draft').length
        };

        res.render("index", { events, stats });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Render with empty data if there's an error
        res.render("index", { 
            events: [], 
            stats: { total: 0, published: 0, upcoming: 0, draft: 0 } 
        });
    }
});

route.get("/api/events", getEvents)
route.get("/api/events/stats", getEventStats)
route.get("/api/events/upcoming", getUpcomingEvents)
route.get("/api/events/featured", getFeaturedEvents)
route.get("/api/events/category/:category", getEventsByCategory)
route.get("/api/events/slug/:slug", getEventBySlug)
route.get("/api/events/:id", getEventById)

// Registrations page
route.get("/registrations", async (req, res) => {
    try {
        // Fetch stats
        const [totalRegistrations, confirmed, pending, waitlisted, cancelled] = await Promise.all([
            Registration.countDocuments(),
            Registration.countDocuments({ status: 'confirmed' }),
            Registration.countDocuments({ status: 'pending' }),
            Registration.countDocuments({ status: 'waitlisted' }),
            Registration.countDocuments({ status: 'cancelled' }),
        ]);

        // Fetch events for filter dropdown
        const events = await Event.find({ isArchived: { $ne: true } })
            .select('title eventDate')
            .sort({ eventDate: -1 });

        const stats = {
            total: totalRegistrations,
            confirmed,
            pending,
            waitlisted,
        };

        res.render("registrations", { stats, events });
    } catch (error) {
        console.error('Error loading registrations page:', error);
        res.render("registrations", {
            stats: { total: 0, confirmed: 0, pending: 0, waitlisted: 0 },
            events: []
        });
    }
});

// Registration API routes
route.get("/api/registrations", getRegistrations)
route.get("/api/registrations/stats", getRegistrationStats)
route.get("/api/registrations/export", exportRegistrations)
route.get("/api/registrations/event/:eventId", getRegistrationsByEvent)
route.get("/api/registrations/:id", getRegistrationById)

// *********** POST requests **********
route.post("/api/events", createEvent)
route.post("/api/events/:id/duplicate", duplicateEvent)

// Image upload routes
route.post('/api/upload/image', upload.single('image'), handleImageUpload)
route.post('/api/upload/images', upload.array('images', 10), handleMultipleImageUpload)

// *********** PUT requests **********
route.put("/api/events/:id", updateEvent)
route.put("/api/events/:id/status", toggleEventStatus)
route.put("/api/events/:id/restore", restoreEvent)

// Registration PUT routes
route.put("/api/registrations/bulk-status", bulkUpdateStatus)
route.put("/api/registrations/:id", updateRegistration)
route.put("/api/registrations/:id/status", updateRegistrationStatus)

// *********** DELETE requests **********
route.delete("/api/events/:id", deleteEvent)
route.delete("/api/events/:id/permanent", permanentDeleteEvent)
route.delete("/api/upload/image/:publicId", handleImageDeletion)

// Registration DELETE routes
route.delete("/api/registrations/:id", deleteRegistration)
route.delete("/api/registrations/:id/permanent", permanentDeleteRegistration)

// Error handling middleware (should be last)
route.use(handleMulterError)

module.exports = route