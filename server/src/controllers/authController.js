const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// Create JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Get client IP address
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    const ipAddress = getClientIp(req);

    if (!user) {
      // Don't log failed attempt for non-existent user (can't create foreign key)
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          success: false,
        },
      });

      return res.status(401).json({
        status: 'error',
        message: 'User account is inactive',
      });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.passwordHash);

    if (!passwordMatch) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          success: false,
        },
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // Log successful login
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        success: true,
      },
    });

    // Generate token
    const token = generateToken(user);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Register (Admin only)
const register = async (req, res) => {
  try {
    const { name, email, password, role, departmentId, plantId } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, password, and role are required',
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        departmentId,
        plantId,
        isActive: true,
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({
      status: 'success',
      message: 'Logout successful',
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or inactive',
      });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      status: 'success',
      message: 'Token refreshed',
      token,
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plantId: true,
        departmentId: true,
        isActive: true,
      },
    });

    res.json({
      status: 'success',
      user,
    });
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch current user',
    });
  }
};

module.exports = {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  generateToken,
};
