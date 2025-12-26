const User = require('../models/User');
const { logger } = require('./logger');
const { logActivity } = require('./activityLogController');

// Get all users
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .populate('assignedEvents', 'title eventDate')
            .sort({ createdAt: -1 });

        return res.status(200).json({ users });
    } catch (error) {
        logger.error(`Error getting users: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving users' });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id)
            .select('-password')
            .populate('assignedEvents', 'title eventDate');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        logger.error(`Error getting user by ID: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving user' });
    }
};

// Create new user
const createUser = async (req, res) => {
    try {
        const { email, password, name, role, assignedEvents, permissions } = req.body;

        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({
                message: 'Email, password, and name are required',
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                message: 'A user with this email already exists',
            });
        }

        // Create user
        const user = new User({
            email,
            password,
            name,
            role: role || 'event_admin',
            assignedEvents: assignedEvents || [],
            permissions: permissions || {
                canDeleteEvents: false,
                canDeleteRegistrations: false,
            },
        });

        await user.save();

        // Return user without password
        const userResponse = await User.findById(user._id)
            .select('-password')
            .populate('assignedEvents', 'title eventDate');

        // Log activity
        if (req.user) {
            await logActivity(
                req.user,
                'create',
                'user',
                userResponse._id,
                userResponse.name,
                `Created user: ${userResponse.name} (${userResponse.email})`,
                req.ip
            );
        }

        logger.info(`New user created: ${email} (${role || 'event_admin'})`);
        return res.status(201).json({
            message: 'User created successfully',
            user: userResponse,
        });
    } catch (error) {
        logger.error(`Error creating user: ${error.message}`);
        return res.status(500).json({ message: 'Error creating user' });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, name, role, assignedEvents, isActive, permissions } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if email is being changed and already exists
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    message: 'A user with this email already exists',
                });
            }
            user.email = email;
        }

        // Update fields
        if (name) user.name = name;
        if (role) user.role = role;
        if (assignedEvents !== undefined) user.assignedEvents = assignedEvents;
        if (isActive !== undefined) user.isActive = isActive;
        if (permissions !== undefined) user.permissions = permissions;
        if (password) user.password = password; // Will be hashed by pre-save hook

        await user.save();

        // Return updated user without password
        const userResponse = await User.findById(user._id)
            .select('-password')
            .populate('assignedEvents', 'title eventDate');

        // Log activity
        if (req.user) {
            await logActivity(
                req.user,
                'update',
                'user',
                userResponse._id,
                userResponse.name,
                `Updated user: ${userResponse.name} (${userResponse.email})`,
                req.ip
            );
        }

        logger.info(`User updated: ${user.email}`);
        return res.status(200).json({
            message: 'User updated successfully',
            user: userResponse,
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`);
        return res.status(500).json({ message: 'Error updating user' });
    }
};

// Delete user (soft delete - set isActive to false)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (req.session.userId === id) {
            return res.status(400).json({
                message: 'You cannot delete your own account',
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = false;
        await user.save();

        // Log activity
        if (req.user) {
            await logActivity(
                req.user,
                'delete',
                'user',
                user._id,
                user.name,
                `Deactivated user: ${user.name} (${user.email})`,
                req.ip
            );
        }

        logger.info(`User deactivated: ${user.email}`);
        return res.status(200).json({
            message: 'User deactivated successfully',
        });
    } catch (error) {
        logger.error(`Error deleting user: ${error.message}`);
        return res.status(500).json({ message: 'Error deleting user' });
    }
};

// Permanently delete user
const permanentDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (req.session.userId === id) {
            return res.status(400).json({
                message: 'You cannot delete your own account',
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userName = user.name;
        const userEmail = user.email;
        const userId = user._id;

        await User.findByIdAndDelete(id);

        // Log activity
        if (req.user) {
            await logActivity(
                req.user,
                'delete',
                'user',
                userId,
                userName,
                `Permanently deleted user: ${userName} (${userEmail})`,
                req.ip
            );
        }

        logger.info(`User permanently deleted: ${userEmail}`);
        return res.status(200).json({
            message: 'User permanently deleted',
        });
    } catch (error) {
        logger.error(`Error permanently deleting user: ${error.message}`);
        return res.status(500).json({ message: 'Error deleting user' });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    permanentDeleteUser,
};
