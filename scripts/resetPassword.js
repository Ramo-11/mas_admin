#!/usr/bin/env node

/**
 * Reset User Password Script
 *
 * Usage:
 *   node scripts/resetPassword.js <email> <new_password>
 *
 * Example:
 *   node scripts/resetPassword.js admin@example.com newpassword123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function resetPassword() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('\n❌ Error: Missing required arguments\n');
        console.log('Usage: node scripts/resetPassword.js <email> <new_password>\n');
        console.log('Example:');
        console.log('  node scripts/resetPassword.js admin@example.com newpassword123\n');
        process.exit(1);
    }

    const [email, ...passwordParts] = args;
    const password = passwordParts.join(' ');

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

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.error(`❌ Error: No user found with email "${email}"\n`);
            await mongoose.disconnect();
            process.exit(1);
        }

        // Update password
        console.log(`👤 Resetting password for: ${user.email}`);
        user.password = password;
        await user.save();

        console.log('\n✅ Password reset successfully!\n');
        console.log('─────────────────────────────────');
        console.log(`  Email:    ${user.email}`);
        console.log(`  Name:     ${user.name}`);
        console.log('─────────────────────────────────\n');
        console.log('You can now log in with the new password.\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
        await mongoose.disconnect();
        process.exit(1);
    }
}

resetPassword();
