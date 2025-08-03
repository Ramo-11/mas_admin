const { log } = require('winston');
const Event = require('../models/Event')
const { logger } = require("./logger")

// Slug generator utility
class SlugGenerator {
    static generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    static async generateUniqueSlug(title, excludeId = null) {
        let attempts = 0;
        const maxAttempts = 100;
        let baseSlug = this.generateSlug(title);

        while (attempts < maxAttempts) {
            let slug = attempts === 0 ? baseSlug : `${baseSlug}-${attempts}`;
            
            const query = excludeId 
                ? { slug: slug, _id: { $ne: excludeId } }
                : { slug: slug };
            
            const existingEvent = await Event.findOne(query);
            
            if (!existingEvent) {
                return slug;
            }
            
            attempts++;
        }
        
        // Fallback to timestamp-based slug
        const timestamp = Date.now();
        return `${baseSlug}-${timestamp}`;
    }
}

const getAdminDashboard = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('speakers', 'name title organization')
            .sort({ eventDate: -1 })

        // Calculate stats
        const stats = {
            total: events.length,
            published: events.filter(e => e.status === 'published').length,
            upcoming: events.filter(e => e.status === 'published' && new Date(e.eventDate) > new Date()).length,
            draft: events.filter(e => e.status === 'draft').length,
            cancelled: events.filter(e => e.status === 'cancelled').length,
            completed: events.filter(e => e.status === 'completed').length
        }

        res.render('admin/events/index', { events, stats })
    } catch (error) {
        logger.error(`Error getting admin dashboard: ${error.message}`)
        res.status(500).send("Server Error")
    }
}

const getEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            category = '',
            status = '',
            eventType = '',
            featured = '',
            sortBy = 'eventDate',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = { isArchived: { $ne: true } };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        if (category) filter.category = category;
        if (status) filter.status = status;
        if (eventType) filter.eventType = eventType;
        if (featured) filter.featured = featured === 'true';

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [events, totalCount] = await Promise.all([
            Event.find(filter)
                .populate('speakers', 'name title organization photo')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Event.countDocuments(filter)
        ]);

        logger.info(`Fetched events dates: ${events.map(e => e.eventDate).join(', ')}`);

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        return res.status(200).json({
            events,
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        logger.error(`Error getting events: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving events" })
    }
}

const getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('speakers', 'name title organization bio photo socialLinks')
            .populate('parentEvent', 'title slug')
            .populate('childEvents', 'title slug eventDate');

        if (!event) {
            return res.status(404).json({ message: "Event not found" })
        }

        return res.status(200).json({ event })
    } catch (error) {
        logger.error(`Error getting event by ID: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving event" })
    }
}

const getEventBySlug = async (req, res) => {
    try {
        const event = await Event.findOne({ slug: req.params.slug })
            .populate('speakers', 'name title organization bio photo socialLinks')
            .populate('parentEvent', 'title slug')
            .populate('childEvents', 'title slug eventDate');

        if (!event) {
            return res.status(404).json({ message: "Event not found" })
        }

        // Increment view count
        await Event.findByIdAndUpdate(event._id, { 
            $inc: { 'analytics.views': 1 } 
        });

        return res.status(200).json({ event })
    } catch (error) {
        logger.error(`Error getting event by slug: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving event" })
    }
}

function createDateInTimezone(dateString, timezone = 'America/Indiana/Indianapolis') {
    const date = new Date(dateString + 'T12:00:00');
    return date;
}

const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            shortDescription,
            category,
            eventType,
            status,
            eventDate,
            startTime,
            endTime,
            timezone,
            location,
            registration,
            speakers,
            media,
            tags,
            featured,
            recurring,
            socialMedia,
            customFields,
            isPublic
        } = req.body;

        if (!title || !description || !eventDate) {
            return res.status(400).json({ 
                message: "Title, description, and event date are required" 
            });
        }

        const eventTimezone = timezone || 'America/Indiana/Indianapolis';

        if (startTime && endTime) {
            const start = new Date(`${eventDate}T${startTime}`);
            const end = new Date(`${eventDate}T${endTime}`);
            if (end <= start) {
                return res.status(400).json({ 
                    message: "End time must be after start time" 
                });
            }
        }

        const slug = await SlugGenerator.generateUniqueSlug(title);

        const processedTags = tags ? 
            (Array.isArray(tags) ? tags : tags.split(','))
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0) : [];

        const newEvent = new Event({
            title,
            slug,
            description,
            shortDescription,
            category: category || 'community-service',
            eventType: eventType || 'in-person',
            status: status || 'draft',
            eventDate: createDateInTimezone(eventDate, eventTimezone),
            startTime,
            endTime,
            timezone: eventTimezone,
            location: location || {},
            registration: registration || { isRequired: false },
            speakers: speakers || [],
            media: media || {},
            tags: processedTags,
            featured: featured || false,
            recurring: recurring || { isRecurring: false },
            socialMedia: socialMedia || {},
            customFields: customFields || [],
            isPublic: isPublic !== undefined ? isPublic : true,
            analytics: { views: 0, shares: 0 }
        });

        await newEvent.save();

        logger.info(`Event created successfully: ${newEvent.title}`)
        return res.status(201).json({ 
            message: "Event created successfully", 
            event: newEvent 
        });
    } catch (error) {
        logger.error(`Error creating event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to create event. Error: ${error.message}` 
        });
    }
}

const updateEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            shortDescription,
            category,
            eventType,
            status,
            eventDate,
            startTime,
            endTime,
            timezone,
            location,
            registration,
            speakers,
            media,
            tags,
            featured,
            recurring,
            socialMedia,
            customFields,
            isPublic
        } = req.body;

        const existingEvent = await Event.findById(req.params.id);
        if (!existingEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        let slug = existingEvent.slug;
        if (title && title !== existingEvent.title) {
            slug = await SlugGenerator.generateUniqueSlug(title, req.params.id);
        }

        const eventTimezone = timezone || existingEvent.timezone || 'America/Indiana/Indianapolis';

        if (eventDate && startTime && endTime) {
            const start = new Date(`${eventDate}T${startTime}`);
            const end = new Date(`${eventDate}T${endTime}`);
            if (end <= start) {
                return res.status(400).json({ 
                    message: "End time must be after start time" 
                });
            }
        }

        const processedTags = tags ? 
            (Array.isArray(tags) ? tags : tags.split(','))
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0) : existingEvent.tags;

        logger.debug(`existingEvent.recurring: ${existingEvent.recurringe}`);
        let recurringData = existingEvent.recurring || { isRecurring: false };
        if (recurring !== undefined) {
            logger.debug(`recurring provided: ${JSON.stringify(recurring)}`);
            if (typeof recurring === 'object' && recurring !== null) {
                recurringData = {
                    isRecurring: Boolean(recurring.isRecurring),
                    frequency: recurring.isRecurring ? (recurring.frequency || 'weekly') : undefined,
                    interval: recurring.interval || 1,
                    endDate: recurring.endDate || null,
                    daysOfWeek: recurring.daysOfWeek || [],
                    monthlyType: recurring.monthlyType || 'date'
                };
                if (!recurringData.isRecurring) {
                    delete recurringData.frequency;
                }
            } else {
                recurringData = { isRecurring: false };
            }
        }

        logger.debug(`Final recurring data: ${JSON.stringify(recurringData)}`);

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        updateData.slug = slug;
        if (description !== undefined) updateData.description = description;
        if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
        if (category !== undefined) updateData.category = category;
        if (eventType !== undefined) updateData.eventType = eventType;
        if (status !== undefined) updateData.status = status;
        if (eventDate !== undefined) updateData.eventDate = createDateInTimezone(eventDate, eventTimezone);
        if (startTime !== undefined) updateData.startTime = startTime;
        if (endTime !== undefined) updateData.endTime = endTime;
        if (timezone !== undefined) updateData.timezone = timezone;
        if (location !== undefined) updateData.location = location;
        if (registration !== undefined) updateData.registration = registration;
        if (speakers !== undefined) updateData.speakers = speakers;
        if (media !== undefined) updateData.media = media;
        if (tags !== undefined) updateData.tags = processedTags;
        if (featured !== undefined) updateData.featured = featured;
        if (recurring !== undefined) updateData.recurring = recurringData;
        if (socialMedia !== undefined) updateData.socialMedia = socialMedia;
        if (customFields !== undefined) updateData.customFields = customFields;
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('speakers', 'name title organization');

        logger.info(`Event updated successfully: ${updatedEvent.title}`)
        return res.status(200).json({ 
            message: "Event updated successfully", 
            event: updatedEvent 
        });
    } catch (error) {
        logger.error(`Error updating event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to update event. Error: ${error.message}` 
        });
    }
}

const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Soft delete - mark as archived instead of hard delete
        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'archived',
                isArchived: true,
                isPublic: false 
            },
            { new: true }
        );

        logger.info(`Event archived successfully: ${updatedEvent.title}`)
        return res.status(200).json({ message: "Event archived successfully" });
    } catch (error) {
        logger.error(`Error archiving event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to archive event. Error: ${error.message}` 
        });
    }
}

const permanentDeleteEvent = async (req, res) => {
    try {
        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        logger.info(`Event permanently deleted: ${deletedEvent.title}`)
        return res.status(200).json({ message: "Event permanently deleted" });
    } catch (error) {
        logger.error(`Error permanently deleting event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to delete event. Error: ${error.message}` 
        });
    }
}

const restoreEvent = async (req, res) => {
    try {
        const restoredEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { 
                status: 'draft',
                isArchived: false,
                isPublic: true 
            },
            { new: true }
        );

        if (!restoredEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        logger.info(`Event restored successfully: ${restoredEvent.title}`)
        return res.status(200).json({ 
            message: "Event restored successfully",
            event: restoredEvent 
        });
    } catch (error) {
        logger.error(`Error restoring event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to restore event. Error: ${error.message}` 
        });
    }
}

const getUpcomingEvents = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const upcomingEvents = await Event.findUpcoming(parseInt(limit))
            .populate('speakers', 'name title organization');

        return res.status(200).json({ events: upcomingEvents });
    } catch (error) {
        logger.error(`Error getting upcoming events: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving upcoming events" });
    }
}

const getFeaturedEvents = async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const featuredEvents = await Event.findFeatured(parseInt(limit))
            .populate('speakers', 'name title organization');

        return res.status(200).json({ events: featuredEvents });
    } catch (error) {
        logger.error(`Error getting featured events: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving featured events" });
    }
}

const getEventsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 10 } = req.query;
        
        const events = await Event.findByCategory(category, parseInt(limit))
            .populate('speakers', 'name title organization');

        return res.status(200).json({ events });
    } catch (error) {
        logger.error(`Error getting events by category: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving events by category" });
    }
}

const toggleEventStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const validStatuses = ['draft', 'published', 'cancelled', 'completed', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        logger.info(`Event status updated: ${updatedEvent.title} -> ${status}`)
        return res.status(200).json({ 
            message: "Event status updated successfully",
            event: updatedEvent 
        });
    } catch (error) {
        logger.error(`Error updating event status: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to update event status. Error: ${error.message}` 
        });
    }
}

const duplicateEvent = async (req, res) => {
    try {
        const originalEvent = await Event.findById(req.params.id);
        if (!originalEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Create duplicate with modified title and slug
        const duplicateTitle = `${originalEvent.title} (Copy)`;
        const slug = await SlugGenerator.generateUniqueSlug(duplicateTitle);

        const duplicateEvent = new Event({
            ...originalEvent.toObject(),
            _id: undefined,
            title: duplicateTitle,
            slug,
            status: 'draft',
            featured: false,
            analytics: { views: 0, shares: 0 },
            createdAt: undefined,
            updatedAt: undefined
        });

        await duplicateEvent.save();

        logger.info(`Event duplicated successfully: ${duplicateEvent.title}`)
        return res.status(201).json({ 
            message: "Event duplicated successfully",
            event: duplicateEvent 
        });
    } catch (error) {
        logger.error(`Error duplicating event: ${error.message}`)
        return res.status(500).json({ 
            message: `Unable to duplicate event. Error: ${error.message}` 
        });
    }
}

const getEventStats = async (req, res) => {
    try {
        const stats = await Event.aggregate([
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    publishedEvents: {
                        $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                    },
                    draftEvents: {
                        $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                    },
                    upcomingEvents: {
                        $sum: { 
                            $cond: [
                                { 
                                    $and: [
                                        { $eq: ['$status', 'published'] },
                                        { $gte: ['$eventDate', new Date()] }
                                    ]
                                }, 
                                1, 
                                0
                            ]
                        }
                    },
                    totalViews: { $sum: '$analytics.views' },
                    totalShares: { $sum: '$analytics.shares' }
                }
            }
        ]);

        const categoryStats = await Event.aggregate([
            { $match: { status: 'published' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const result = stats[0] || {
            totalEvents: 0,
            publishedEvents: 0,
            draftEvents: 0,
            upcomingEvents: 0,
            totalViews: 0,
            totalShares: 0
        };

        return res.status(200).json({
            ...result,
            categoryBreakdown: categoryStats
        });
    } catch (error) {
        logger.error(`Error getting event stats: ${error.message}`)
        return res.status(500).json({ message: "Error retrieving event statistics" });
    }
}

module.exports = {
    getAdminDashboard,
    getEvents,
    getEventById,
    getEventBySlug,
    createEvent,
    updateEvent,
    deleteEvent,
    permanentDeleteEvent,
    restoreEvent,
    getUpcomingEvents,
    getFeaturedEvents,
    getEventsByCategory,
    toggleEventStatus,
    duplicateEvent,
    getEventStats
}