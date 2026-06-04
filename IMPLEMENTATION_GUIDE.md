# Implementation Guide - Remaining Phases

## Completed So Far (Phases 1-3)

### Phase 1 ✅
- Project structure initialized (client + server)
- TailwindCSS + Vite setup
- Root package.json with concurrently
- Environment files (.env templates)
- Documentation (README.md)

### Phase 2 ✅
- Complete Prisma schema with 18 models
- All relationships defined (one-to-many, many-to-one)
- Enums for all statuses, types, and roles
- Seed file for initial data (plants, departments, users, etc.)

### Phase 3 ✅
- Express app foundation with CORS and middleware
- Authentication middleware (JWT verification)
- RBAC middleware (role-based access control)
- Auth controller (login, register, logout, refresh token)
- Auth routes with validation
- ID generation utilities (asset, transfer, challan IDs)
- Email utility with Nodemailer integration
- Login history tracking

---

## How to Continue - Pattern to Follow

### General Backend Pattern

All backend features follow this pattern:

```
1. Create Model in Prisma Schema ✅ (already done)
2. Create Routes → src/routes/{feature}.js
3. Create Controller → src/controllers/{feature}Controller.js
4. Create Service (if complex) → src/services/{feature}Service.js
5. Add Routes to app.js
6. Test with curl or Postman
```

### Example: Implementing User Management (Phase 3 continuation)

**Step 1: Create User Controller** (`src/controllers/userController.js`)
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where: { ...where, deletedAt: null },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        plant: { select: { name: true } },
        department: { select: { name: true } },
        createdAt: true,
      },
    });

    const total = await prisma.user.count({ where: { ...where, deletedAt: null } });

    res.json({
      status: 'success',
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, departmentId, plantId } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { name, role, isActive, departmentId, plantId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        entityType: 'User',
        entityId: id,
        action: 'UPDATE',
        userId: req.user.id,
        changes: JSON.stringify({ name, role, isActive }),
      },
    });

    res.json({ status: 'success', user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Export all...
```

**Step 2: Create Routes** (`src/routes/users.js`)
```javascript
const express = require('express');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/', authMiddleware, rbacMiddleware('ADMIN'), userController.getUsers);
router.post('/', authMiddleware, rbacMiddleware('ADMIN'), userController.createUser);
router.put('/:id', authMiddleware, rbacMiddleware('ADMIN'), userController.updateUser);
router.delete('/:id', authMiddleware, rbacMiddleware('ADMIN'), userController.deleteUser);

module.exports = router;
```

**Step 3: Add to app.js**
```javascript
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
```

---

## Phase-by-Phase Implementation Checklist

### Phase 4: Master Data CRUD
**Master Data entities:** Plants, Departments, Locations, Categories, Statuses, Vendors, Custodians, ApprovalChains

**File structure:**
- `src/controllers/masterController.js` - All CRUD operations
- `src/routes/masters.js` - All master routes
- `src/services/masterService.js` - Audit logging logic

**Key endpoints:**
```
GET    /api/masters/:type              (list, with filters)
POST   /api/masters/:type              (create)
PUT    /api/masters/:id                (update with audit)
DELETE /api/masters/:id                (soft delete)
```

**Audit logging pattern:**
```javascript
// On every update/delete, log:
await prisma.auditLog.create({
  data: {
    entityType: 'Plant',
    entityId: id,
    action: 'UPDATE',
    userId: req.user.id,
    changes: JSON.stringify(oldVsNewValues),
  },
});
```

### Phase 5: Asset Registry
**Key files:**
- `src/controllers/assetController.js`
- `src/routes/assets.js`
- `src/services/assetService.js` - Asset history, depreciation
- `src/middleware/upload.js` - Multer config

**Key features:**
1. **Auto-generate asset_id:** Use `generateAssetId(prisma)` from `idGenerator.js`
2. **Track history:** On every update, create `assetHistory` entry
3. **File uploads:** Multer middleware for documents
4. **Bulk import:** Parse Excel → validate → create multiple
5. **Depreciation:** Compute book value using SLM/WDV formulas

**Depreciation formula:**
```javascript
// SLM (Straight Line Method)
const annualDepreciation = (purchaseCost - salvageValue) / usefulLifeYears;
const currentBookValue = purchaseCost - (annualDepreciation * yearsElapsed);

// WDV (Written Down Value)
const depreciationRate = (1 - (salvageValue / purchaseCost) ^ (1 / usefulLifeYears));
const currentBookValue = purchaseCost * (1 - depreciationRate) ^ yearsElapsed;
```

### Phase 6: Transfer & Approval
**Key files:**
- `src/controllers/transferController.js`
- `src/routes/transfers.js`
- `src/services/transferService.js` - Approval logic, emails
- `src/services/approvalService.js` - Multi-level approval chain

**Approval workflow:**
```
1. Initiate transfer → Create Transfer record
2. Determine approval levels from ApprovalChain table
3. Send email to L1 approver with approval link
4. Approver clicks link → verify JWT token → approve/reject
5. If approved and L2 required → send to L2
6. On full approval → update asset location, generate challan
```

**Email template usage:**
```javascript
const { emailTemplates, sendEmail } = require('../utils/email');
const template = emailTemplates.transferApprovalRequest(...args);
await sendEmail({ to: approverEmail, ...template });
```

### Phase 7: Cron Jobs & Notifications
**Key files:**
- `src/jobs/dailyAlerts.js` - Node-cron scheduler
- `src/controllers/notificationController.js`
- `src/routes/notifications.js`

**Cron job pattern:**
```javascript
const cron = require('node-cron');

// Every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  // Check warranties expiring in 60 days
  // Create notifications
  // Send emails
});
```

### Phase 8-14: Frontend & Additional Services

These phases follow similar patterns using React components + API calls.

---

## Database Setup (Critical Step!)

Before testing:

```bash
# 1. Create PostgreSQL database
createdb industrial_assets

# 2. Update server/.env with your PostgreSQL credentials
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/industrial_assets"

# 3. Run migrations
cd server
npx prisma migrate dev --name init

# 4. Seed initial data
npx prisma db seed

# 5. View database (optional)
npx prisma studio
```

---

## Testing Auth Endpoints

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@industrialassets.com",
    "password": "Admin@123"
  }'

# Response should include token
# Use this token for subsequent requests:
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Architecture (Phases 8-13)

### App Structure
```
src/
├── components/
│   ├── Sidebar.jsx
│   ├── Navbar.jsx
│   ├── ProtectedRoute.jsx
│   ├── Loading.jsx
│   ├── EmptyState.jsx
│   └── ...
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── AssetsPage.jsx
│   ├── TransfersPage.jsx
│   └── ...
├── contexts/
│   ├── AuthContext.jsx
│   └── ThemeContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useFetch.js
│   └── useMasters.js
├── services/
│   ├── api.js (Axios instance)
│   ├── authService.js
│   ├── assetService.js
│   └── ...
├── lib/
│   ├── excelUtils.js (import/export)
│   ├── dateUtils.js
│   ├── formatters.js
│   └── ...
├── styles/
│   └── globals.css (Tailwind)
├── App.jsx
└── main.jsx
```

### Auth Context Pattern
```javascript
// contexts/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    // Call /api/auth/me
  }, []);

  const login = async (email, password) => {
    // Call /api/auth/login
    // Store token in HttpOnly cookie (set by server)
    // Set user state
  };

  const logout = async () => {
    // Call /api/auth/logout
    // Clear user state
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Protected Route Pattern
```javascript
// components/ProtectedRoute.jsx
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (requiredRoles.length && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

### API Service Pattern
```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true, // Include cookies
});

export default api;

// usage:
// const response = await api.get('/assets');
// const response = await api.post('/assets', data);
```

---

## Deployment Checklist

- [ ] PostgreSQL database set up on server
- [ ] Environment variables configured
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Build frontend: `npm run build --prefix client`
- [ ] Build server: `npm start --prefix server`
- [ ] Reverse proxy (nginx/Apache) configured
- [ ] HTTPS enabled
- [ ] Email service configured and tested
- [ ] File storage backup strategy
- [ ] Monitoring/logging configured
- [ ] Database backups automated

---

## Next Immediate Steps

1. **Set up PostgreSQL locally**
2. **Run migrations:** `cd server && npx prisma migrate dev --name init`
3. **Run seed:** `npx prisma db seed`
4. **Test backend:** `npm run dev` (in server) and test auth endpoints
5. **Start frontend:** `npm run dev` (in client)
6. **Implement remaining phases** following patterns shown above

---

## Quick Reference: API Structure

All API responses follow this format:
```json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": { /* response data */ },
  "error": { /* error details in development */ }
}
```

All errors include:
- `401` - Unauthorized (no/invalid token)
- `403` - Forbidden (insufficient permissions)
- `400` - Bad request (validation error)
- `500` - Server error

All protected routes require:
- Bearer token in `Authorization` header OR
- Token in `token` cookie (HttpOnly)

---

## Support Files Already Created

✅ Prisma Schema (`server/prisma/schema.prisma`) - Complete database model
✅ Seed Data (`server/prisma/seed.js`) - Initial data for testing
✅ Auth Controller (`server/src/controllers/authController.js`) - Login/Register
✅ Auth Routes (`server/src/routes/auth.js`) - Auth endpoints
✅ Middleware (`server/src/middleware/auth.js`, `rbac.js`) - Auth & RBAC
✅ Utilities (`server/src/utils/email.js`, `idGenerator.js`) - Helpers
✅ Express App (`server/src/app.js`) - Server setup
✅ README (`README.md`) - Complete setup guide

---

**Your system is ready for continued development!** 🚀

