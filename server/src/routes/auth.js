const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

const router = express.Router();

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  authController.login
);

// Register (Admin only)
router.post(
  '/register',
  authMiddleware,
  rbacMiddleware('ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').isIn(['ADMIN', 'MANAGER', 'CUSTODIAN', 'AUDITOR', 'VIEWER']),
  ],
  authController.register
);

// Logout
router.post('/logout', authMiddleware, authController.logout);

// Refresh token
router.post('/refresh', authMiddleware, authController.refreshToken);

// Get current user
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
