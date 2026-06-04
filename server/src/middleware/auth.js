const jwt = require('jsonwebtoken');

// Verify JWT from HttpOnly cookie
const authMiddleware = (req, res, next) => {
  try {
    // Try to get token from Authorization header first (for testing)
    let token = req.headers.authorization?.replace('Bearer ', '');

    // Then try HttpOnly cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
      error: err.message,
    });
  }
};

module.exports = authMiddleware;
