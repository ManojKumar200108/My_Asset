# Quick Start Guide

## 🚀 Get the System Running in 5 Minutes

### Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 16+ and npm 8+
- Git

### Step 1: Clone & Install Dependencies

```bash
cd My_Assets

# Install root dependencies
npm install

# Install client dependencies
npm --prefix client install

# Install server dependencies  
npm --prefix server install
```

### Step 2: Database Setup

**Windows (Command Prompt or PowerShell):**
```bash
createdb industrial_assets
```

**macOS/Linux (Terminal):**
```bash
createdb industrial_assets
```

### Step 3: Configure Environment

Edit `/server/.env` with your PostgreSQL credentials:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/industrial_assets"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
```

### Step 4: Initialize Database

```bash
cd server

# Run migrations
npx prisma migrate dev --name init

# Seed initial data (plants, users, etc.)
npx prisma db seed

# (Optional) View database
npx prisma studio
```

### Step 5: Start Development Servers

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
npm run client    # Frontend on http://localhost:5173
npm run server    # Backend on http://localhost:3000
```

### Step 6: Login

Navigate to **http://localhost:5173** and login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@industrialassets.com | Admin@123 |
| Manager | manager@industrialassets.com | Manager@123 |
| Custodian | custodian@industrialassets.com | Custodian@123 |
| Auditor | auditor@industrialassets.com | Auditor@123 |

---

## 📁 Project Structure

```
My_Assets/
├── client/                 # React frontend
│   ├── src/
│   │   ├── contexts/      # AuthContext
│   │   ├── components/    # Sidebar, LoginPage, etc.
│   │   ├── pages/         # Dashboard, Assets, etc.
│   │   ├── App.jsx        # Main routing
│   │   └── main.jsx       # Entry point
│   └── package.json
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── app.js         # Express app
│   │   ├── server.js      # Server entry
│   │   ├── controllers/   # Auth, Assets, etc.
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, RBAC
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Email, ID generators
│   │   └── jobs/          # Cron jobs
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.js        # Initial data
│   └── package.json
│
├── README.md              # Full documentation
├── IMPLEMENTATION_GUIDE.md # How to continue building
└── package.json           # Root scripts
```

---

## 🔌 API Endpoints (Currently Available)

### Authentication
```
POST   /api/auth/login          # Login
POST   /api/auth/register       # Create user (Admin only)
POST   /api/auth/logout         # Logout
POST   /api/auth/refresh        # Refresh token
GET    /api/auth/me             # Get current user
```

**Login Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@industrialassets.com",
    "password": "Admin@123"
  }'
```

---

## 🛠️ What's Next?

The foundation is built! Continue implementation:

1. **Phase 4**: Master Data CRUD (Plants, Departments, Categories)
2. **Phase 5**: Asset Management (Create, Read, Update, Delete)
3. **Phase 6**: Transfer Workflow (Approval system)
4. **Phase 7**: Notifications & Alerts (Cron jobs)
5. **Phases 8-14**: Remaining frontend & backend features

See `IMPLEMENTATION_GUIDE.md` for detailed patterns and examples.

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in server/.env or client/vite.config.js
# Or kill the process using the port
```

### Database Connection Error
```
Error: P1000: Authentication failed...
```
- Check PostgreSQL is running
- Verify credentials in `/server/.env`
- Ensure database exists: `createdb industrial_assets`

### Cannot Find Module
```bash
# Reinstall dependencies
npm install --prefix client
npm install --prefix server
```

### Prisma Issues
```bash
# Regenerate Prisma client
cd server
npx prisma generate

# Reset database (development only!)
npx prisma migrate reset
```

---

## 📚 Documentation

- **README.md** - Full project documentation
- **IMPLEMENTATION_GUIDE.md** - Patterns for continuing development
- **Prisma Schema** - Database design at `/server/prisma/schema.prisma`
- **Code Comments** - Inline documentation in all key files

---

## 🎯 Demo Workflow

1. **Login** as Admin → Dashboard
2. **Navigate** to Settings → Create a Plant, Department, Location
3. **Go to** Assets → Create an Asset (auto-generates ID)
4. **Initiate** a Transfer (approval workflow demo)
5. **View** Login History → See all auth events
6. **Explore** the system with different user roles

---

## ✅ Completed Features

✅ User authentication with JWT
✅ Role-based access control (RBAC)
✅ Complete database schema (18 models)
✅ Login history tracking
✅ Initial data seeding
✅ Email integration (Nodemailer)
✅ React + React Router setup
✅ TailwindCSS styling
✅ API foundation with middleware

---

## 🚀 Ready to Build!

Your system is ready for development. Refer to `IMPLEMENTATION_GUIDE.md` for:
- Backend patterns (controllers, services, routes)
- Frontend patterns (hooks, components, pages)
- API design guidelines
- RBAC matrix
- Email templates

**Happy coding!** 🎉

---

## 📧 Support

For issues or questions:
1. Check the implementation guide
2. Review code comments
3. Check Prisma documentation: https://www.prisma.io/docs
4. Check React documentation: https://react.dev
