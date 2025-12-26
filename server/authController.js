const User = require('../models/User');
const { logger } = require('./logger');

// Render login page
const getLoginPage = (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.render('login', {
        title: 'Login',
        error: null
    });
};

// Handle login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('login', {
                title: 'Login',
                error: 'Please provide email and password',
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            logger.warn(`Login attempt with non-existent email: ${email}`);
            return res.render('login', {
                title: 'Login',
                error: 'Invalid email or password',
            });
        }

        // Check if user is active
        if (!user.isActive) {
            logger.warn(`Login attempt by inactive user: ${email}`);
            return res.render('login', {
                title: 'Login',
                error: 'Your account has been deactivated. Please contact an administrator.',
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            logger.warn(`Failed login attempt for: ${email}`);
            return res.render('login', {
                title: 'Login',
                error: 'Invalid email or password',
            });
        }

        // Create session
        req.session.userId = user._id;
        req.session.userRole = user.role;
        req.session.userName = user.name;

        logger.info(`User logged in: ${email} (${user.role})`);
        res.redirect('/');
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.render('login', {
            title: 'Login',
            error: 'An error occurred. Please try again.',
        });
    }
};

// Handle logout
const logout = (req, res) => {
    const userName = req.session.userName;
    req.session.destroy((err) => {
        if (err) {
            logger.error(`Logout error: ${err.message}`);
        } else {
            logger.info(`User logged out: ${userName}`);
        }
        res.redirect('/login');
    });
};

// Get current user info (API)
const getCurrentUser = async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const user = await User.findById(req.session.userId)
            .select('-password')
            .populate('assignedEvents', 'title eventDate');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        logger.error(`Error getting current user: ${error.message}`);
        return res.status(500).json({ message: 'Error retrieving user data' });
    }
};

module.exports = {
    getLoginPage,
    login,
    logout,
    getCurrentUser,
};
