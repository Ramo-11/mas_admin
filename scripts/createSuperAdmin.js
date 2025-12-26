#!/usr/bin/env node

/**
 * Create Super Admin Script
 *
 * Usage:
 *   node scripts/createSuperAdmin.js <email> <password> <name>
 *
 * Example:
 *   node scripts/createSuperAdmin.js admin@example.com mypassword123 "Admin User"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createSuperAdmin() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.error('\n❌ Error: Missing required arguments\n');
        console.log('Usage: node scripts/createSuperAdmin.js <email> <password> <name>\n');
        console.log('Example:');
        console.log('  node scripts/createSuperAdmin.js admin@example.com mypassword123 "Admin User"\n');
        process.exit(1);
    }

    const [email, password, ...nameParts] = args;
    const name = nameParts.join(' ');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.error('\n❌ Error: Invalid email format\n');
        process.exit(1);
    }

    // Validate password length
    if (password.length < 6) {
        console.error('\n❌ Error: Password must be at least 6 characters\n');
        process.exit(1);
    }

    // Connect to database
    const isProd = process.env.NODE_ENV === 'production';
    const baseUri = isProd ? process.env.MONGODB_URI_PROD : process.env.MONGODB_URI_DEV;
    const dbName = isProd ? process.env.DB_NAME_PROD : process.env.DB_NAME_DEV;
    const mongoUrl = `${baseUri}${baseUri.includes('?') ? '&' : '?'}dbName=${dbName}`;

    try {
        console.log('\n🔗 Connecting to database...');
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to database\n');

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            console.error(`❌ Error: A user with email "${email}" already exists\n`);
            await mongoose.disconnect();
            process.exit(1);
        }

        // Create super admin user
        console.log('👤 Creating super admin user...');
        const user = new User({
            email: email.toLowerCase(),
            password,
            name,
            role: 'super_admin',
            isActive: true,
        });

        await user.save();

        console.log('\n✅ Super admin created successfully!\n');
        console.log('─────────────────────────────────');
        console.log(`  Email:    ${user.email}`);
        console.log(`  Name:     ${user.name}`);
        console.log(`  Role:     Super Admin`);
        console.log('─────────────────────────────────\n');
        console.log('You can now log in at /login\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
        await mongoose.disconnect();
        process.exit(1);
    }
}

createSuperAdmin();
