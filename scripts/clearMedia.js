const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const baseUri = isProd ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_DEV;
const dbName = isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV;

if (!baseUri) {
    console.error('Missing Mongo URI');
    process.exit(1);
}

process.env.MONGODB_URI = `${baseUri}${baseUri.includes('?') ? '&' : '?'}dbName=${dbName}`;
mongoose.connect(process.env.MONGODB_URI);

// Default structure matching schema
const DEFAULTS = {
    media: {
        featuredImage: { url: '', alt: '', caption: '' },
        gallery: [],
        videos: [],
    },
    registration: {
        isRequired: false,
        maxAttendees: null,
        currentAttendees: 0,
        registrationDeadline: null,
        fee: { amount: 0, currency: 'USD' },
        fields: [],
        isOpen: true,
        waitlistEnabled: false,
        confirmationMessage:
            'Thank you for registering! You will receive a confirmation email shortly.',
    },
    recurring: {
        isRecurring: false,
        frequency: null,
        interval: 1,
        startDate: null,
        endDate: null,
        daysOfWeek: [],
        monthlyType: 'date',
    },
    analytics: { views: 0, shares: 0 },
};

async function migrateEvents() {
    const events = await Event.find();

    for (const ev of events) {
        const update = {};

        // Add missing deeply nested fields safely
        // MEDIA
        if (!ev.media) update.media = DEFAULTS.media;
        else {
            update.media = {
                featuredImage: {
                    url: ev.media.featuredImage?.url || '',
                    alt: ev.media.featuredImage?.alt || '',
                    caption: ev.media.featuredImage?.caption || '',
                },
                gallery: ev.media.gallery || [],
                videos: ev.media.videos || [],
            };
        }

        // REGISTRATION
        update.registration = {
            isRequired: ev.registration?.isRequired ?? false,
            maxAttendees: ev.registration?.maxAttendees ?? null,
            currentAttendees: ev.registration?.currentAttendees ?? 0,
            registrationDeadline: ev.registration?.registrationDeadline ?? null,
            fee: {
                amount: ev.registration?.fee?.amount ?? 0,
                currency: ev.registration?.fee?.currency ?? 'USD',
            },
            fields: ev.registration?.fields ?? [],
            isOpen: ev.registration?.isOpen ?? true,
            waitlistEnabled: ev.registration?.waitlistEnabled ?? false,
            confirmationMessage:
                ev.registration?.confirmationMessage ?? DEFAULTS.registration.confirmationMessage,
        };

        // RECURRING
        update.recurring = {
            isRecurring: ev.recurring?.isRecurring ?? false,
            frequency: ev.recurring?.frequency ?? null,
            interval: ev.recurring?.interval ?? 1,
            startDate: ev.recurring?.startDate ?? null,
            endDate: ev.recurring?.endDate ?? null,
            daysOfWeek: ev.recurring?.daysOfWeek ?? [],
            monthlyType: ev.recurring?.monthlyType ?? 'date',
        };

        // ANALYTICS
        update.analytics = {
            views: ev.analytics?.views ?? 0,
            shares: ev.analytics?.shares ?? 0,
        };

        await Event.findByIdAndUpdate(ev._id, update);
    }

    console.log('Event migration complete.');
    process.exit();
}

migrateEvents();
