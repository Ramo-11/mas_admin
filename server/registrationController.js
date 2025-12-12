const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { logger } = require('./logger');

const getRegistrations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            event = '',
            sortBy = 'registeredAt',
            sortOrder = 'desc',
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { confirmationNumber: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) filter.status = status;
        if (event) filter.event = event;

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [registrations, totalCount] = await Promise.all([
            Registration.find(filter)
                .populate('event', 'title eventDate slug category')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Registration.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        return res.status(200).json({
            registrations,
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        });
    } catch (error) {
        logger.error(`Error getting registrations: ${error.message} - Stack: ${error.stack}`);
        return res.status(500).json({ message: 'Error retrieving registrations' });
    }
};

const getRegistrationById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid registration ID format' });
        }

        const registration = await Registration.findById(id)
            .populate('event', 'title eventDate slug category registration');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        return res.status(200).json({ registration });
    } catch (error) {
        logger.error(`Error getting registration by ID: ${error.message} - Stack: ${error.stack}`);
        return res.status(500).json({ message: 'Error retrieving registration' });
    }
};

const getRegistrationsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const {
            page = 1,
            limit = 50,
            status = '',
            sortBy = 'registeredAt',
            sortOrder = 'desc',
        } = req.query;

        const filter = { event: eventId };
        if (status) filter.status = status;

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [registrations, totalCount, event] = await Promise.all([
            Registration.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Registration.countDocuments(filter),
            Event.findById(eventId).select('title eventDate registration'),
        ]);

        const totalPages = Math.ceil(totalCount / parseInt(limit));

        return res.status(200).json({
            registrations,
            event,
            currentPage: parseInt(page),
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        });
    } catch (error) {
        logger.error(`Error getting registrations by event: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving registrations' });
    }
};

const updateRegistrationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'waitlisted'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const registration = await Registration.findByIdAndUpdate(
            req.params.id,
            {
                status,
                isWaitlisted: status === 'waitlisted',
            },
            { new: true, runValidators: true }
        ).populate('event', 'title');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        logger.info(`Registration status updated: ${registration.confirmationNumber} -> ${status}`);
        return res.status(200).json({
            message: 'Registration status updated successfully',
            registration,
        });
    } catch (error) {
        logger.error(`Error updating registration status: ${error.message}`);
        return res.status(500).json({
            message: `Unable to update registration status. Error: ${error.message}`,
        });
    }
};

const updateRegistration = async (req, res) => {
    try {
        const { notes, registrationData, status } = req.body;

        const updateData = {};
        if (notes !== undefined) updateData.notes = notes;
        if (registrationData !== undefined) updateData.registrationData = registrationData;
        if (status !== undefined) {
            updateData.status = status;
            updateData.isWaitlisted = status === 'waitlisted';
        }

        const registration = await Registration.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('event', 'title');

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        logger.info(`Registration updated: ${registration.confirmationNumber}`);
        return res.status(200).json({
            message: 'Registration updated successfully',
            registration,
        });
    } catch (error) {
        logger.error(`Error updating registration: ${error.message}`);
        return res.status(500).json({
            message: `Unable to update registration. Error: ${error.message}`,
        });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Soft delete - mark as cancelled
        const updatedRegistration = await Registration.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        logger.info(`Registration cancelled: ${updatedRegistration.confirmationNumber}`);
        return res.status(200).json({ message: 'Registration cancelled successfully' });
    } catch (error) {
        logger.error(`Error cancelling registration: ${error.message}`);
        return res.status(500).json({
            message: `Unable to cancel registration. Error: ${error.message}`,
        });
    }
};

const permanentDeleteRegistration = async (req, res) => {
    try {
        const deletedRegistration = await Registration.findByIdAndDelete(req.params.id);
        if (!deletedRegistration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        logger.info(`Registration permanently deleted: ${deletedRegistration.confirmationNumber}`);
        return res.status(200).json({ message: 'Registration permanently deleted' });
    } catch (error) {
        logger.error(`Error permanently deleting registration: ${error.message}`);
        return res.status(500).json({
            message: `Unable to delete registration. Error: ${error.message}`,
        });
    }
};

const getRegistrationStats = async (req, res) => {
    try {
        const stats = await Registration.aggregate([
            {
                $group: {
                    _id: null,
                    totalRegistrations: { $sum: 1 },
                    confirmed: {
                        $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                    },
                    cancelled: {
                        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
                    },
                    waitlisted: {
                        $sum: { $cond: [{ $eq: ['$status', 'waitlisted'] }, 1, 0] },
                    },
                },
            },
        ]);

        const eventStats = await Registration.aggregate([
            { $match: { status: { $in: ['confirmed', 'pending'] } } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'event',
                },
            },
            { $unwind: '$event' },
            {
                $project: {
                    eventTitle: '$event.title',
                    eventDate: '$event.eventDate',
                    count: 1,
                },
            },
        ]);

        const result = stats[0] || {
            totalRegistrations: 0,
            confirmed: 0,
            pending: 0,
            cancelled: 0,
            waitlisted: 0,
        };

        return res.status(200).json({
            ...result,
            topEvents: eventStats,
        });
    } catch (error) {
        logger.error(`Error getting registration stats: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving registration statistics' });
    }
};

const bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'waitlisted'];

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Please provide registration IDs' });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const result = await Registration.updateMany(
            { _id: { $in: ids } },
            {
                status,
                isWaitlisted: status === 'waitlisted',
            }
        );

        logger.info(`Bulk status update: ${result.modifiedCount} registrations -> ${status}`);
        return res.status(200).json({
            message: `${result.modifiedCount} registrations updated successfully`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        logger.error(`Error bulk updating registrations: ${error.message}`);
        return res.status(500).json({
            message: `Unable to update registrations. Error: ${error.message}`,
        });
    }
};

const exportRegistrations = async (req, res) => {
    try {
        const { eventId, format = 'json', status } = req.query;

        const filter = {};
        if (eventId) filter.event = eventId;
        if (status) filter.status = status;

        const registrations = await Registration.find(filter)
            .populate('event', 'title eventDate category')
            .sort({ registeredAt: -1 });

        if (format === 'csv') {
            // Collect all unique field names from registration data
            const allFields = new Set();
            registrations.forEach(r => {
                if (r.registrationData) {
                    const data = r.registrationData instanceof Map
                        ? Object.fromEntries(r.registrationData)
                        : r.registrationData;
                    Object.keys(data).forEach(key => allFields.add(key));
                }
            });
            const dynamicFields = Array.from(allFields);

            // Build headers
            const headers = [
                'Confirmation #',
                'Email',
                'Status',
                'Event',
                'Event Date',
                'Category',
                'Registered At',
                'Waitlisted',
                ...dynamicFields.map(f => formatFieldName(f)),
                'Waiver Acknowledged',
                'Signature Type',
                'Signed At',
                'IP Address',
            ];

            // Build rows
            const rows = registrations.map(r => {
                const regData = r.registrationData instanceof Map
                    ? Object.fromEntries(r.registrationData)
                    : (r.registrationData || {});

                const eventDate = r.event?.eventDate
                    ? new Date(r.event.eventDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })
                    : '';

                const row = [
                    r.confirmationNumber,
                    r.email,
                    r.status,
                    r.event?.title || 'N/A',
                    eventDate,
                    r.event?.category || '',
                    new Date(r.registeredAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    }),
                    r.isWaitlisted ? 'Yes' : 'No',
                ];

                // Add dynamic fields
                dynamicFields.forEach(field => {
                    const value = regData[field];
                    row.push(formatCellValue(value));
                });

                // Add waiver info
                row.push(r.waiver?.acknowledged ? 'Yes' : 'No');
                row.push(r.waiver?.signature?.type || '');
                row.push(r.waiver?.signature?.signedAt
                    ? new Date(r.waiver.signature.signedAt).toLocaleString('en-US')
                    : '');
                row.push(r.waiver?.signature?.ipAddress || r.metadata?.ipAddress || '');

                return row;
            });

            // Generate CSV with BOM for Excel compatibility
            const BOM = '\uFEFF';
            const csvContent = [
                headers.join(','),
                ...rows.map(row =>
                    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
                )
            ].join('\n');

            const eventName = registrations[0]?.event?.title
                ? `-${registrations[0].event.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}`
                : '';
            const filename = `registrations${eventName}-${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(BOM + csvContent);
        }

        return res.status(200).json({ registrations });
    } catch (error) {
        logger.error(`Error exporting registrations: ${error.message}`);
        return res.status(500).json({ message: 'Error exporting registrations' });
    }
};

// Helper function to format field names for CSV headers
function formatFieldName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();
}

// Helper function to format cell values for CSV
function formatCellValue(value) {
    if (value === null || value === undefined) return '';

    if (Array.isArray(value)) {
        return value.join('; ');
    }

    if (typeof value === 'object') {
        // Skip signature data (base64 images)
        if (value.type === 'draw' && value.value?.startsWith('data:')) {
            return '[Signature Image]';
        }
        if (value.type === 'type' && value.value) {
            return value.value;
        }
        // For other objects, try to flatten
        try {
            return Object.entries(value)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ');
        } catch {
            return String(value);
        }
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return String(value);
}

module.exports = {
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
};
