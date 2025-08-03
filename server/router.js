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

// Import Cloudinary handler
const { 
    upload, 
    handleImageUpload, 
    handleMultipleImageUpload, 
    handleImageDeletion, 
    handleMulterError 
} = require("./cloudinaryHandler")

const Event = require("../models/Event")

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
route.get("/api/events/:id", getEventById)
route.get("/api/events/slug/:slug", getEventBySlug)

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

// *********** DELETE requests **********
route.delete("/api/events/:id", deleteEvent)
route.delete("/api/events/:id/permanent", permanentDeleteEvent)
route.delete("/api/upload/image/:publicId", handleImageDeletion)

// Error handling middleware (should be last)
route.use(handleMulterError)

module.exports = route