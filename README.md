# Industrial Asset Management System

A modern, full-stack Industrial Asset Management System built with React, Node.js, Express, PostgreSQL, and Prisma ORM.

## Features

- **Asset Registry**: Manage industrial assets with comprehensive tracking
- **Transfer Management**: Multi-level approval workflows for asset transfers
- **User Management**: Role-based access control (Admin, Manager, Custodian, Auditor, Viewer)
- **Maintenance Tracking**: Schedule and log asset maintenance
- **Depreciation Calculations**: SLM and WDV depreciation methods
- **QR/Barcode Generation**: Auto-generate QR codes and barcodes for assets
- **Excel Import/Export**: Bulk asset operations with Excel templates
- **Audit Logging**: Comprehensive audit trail of all changes
- **Notifications**: In-app and email notifications for key events
- **Dashboard**: Real-time KPIs and insights

## Tech Stack

### Frontend
- React 19 + Vite
- TailwindCSS + shadcn/ui
- React Router v7
- React Hook Form + Zod
- Recharts for visualizations
- Axios for API communication

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Nodemailer for emails
- Node-cron for scheduled jobs

## Prerequisites

- Node.js 16+ and npm 8+
- PostgreSQL 12+
- Git

## Installation & Setup

### 1. Clone & Install Dependencies

```bash
cd My_Assets
npm install

# Install client dependencies
npm run --prefix client install

# Install server dependencies
npm run --prefix server install
```

### 2. Database Setup

**Create PostgreSQL database:**
```bash
createdb industrial_assets
```

**Setup environment variables:**

Create `/server/.env` file:
```bash
cp server/.env.example server/.env
# Edit server/.env with your PostgreSQL connection and SMTP details
```

Create `/client/.env.local` file:
```bash
cp client/.env.example client/.env.local
```

### 3. Initialize Prisma & Database

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

This will create all tables and seed initial data (admin user, plants, departments, etc.).

### 4. Run Development Servers

From the root directory:
```bash
npm run dev
```

Or run separately:
```bash
npm run client    # Frontend on http://localhost:5173
npm run server    # Backend on http://localhost:3000
```

## Default Login Credentials

After seeding, use these credentials to login:
- **Email**: admin@industrialassets.com
- **Password**: Admin@123

## Project Structure

```
My_Assets/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── contexts/         # Auth & theme context
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   └── lib/              # Utilities & helpers
│   └── public/
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── middleware/       # Auth, RBAC, error handling
│   │   ├── routes/           # API endpoints
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── jobs/             # Cron jobs
│   │   ├── utils/            # Helpers
│   │   ├── app.js            # Express setup
│   │   └── server.js         # Entry point
│   └── uploads/              # File storage
│
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email & password
- `POST /api/auth/logout` - Logout (invalidate token)
- `POST /api/auth/refresh` - Refresh JWT token

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

### Master Data (Manager+)
- `GET /api/masters/:type` - List (plants, departments, locations, etc.)
- `POST /api/masters/:type` - Create
- `PUT /api/masters/:id` - Update
- `DELETE /api/masters/:id` - Delete (soft)

### Assets (Custodian+)
- `GET /api/assets` - List with filters
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `GET /api/assets/:id` - Asset detail
- `POST /api/assets/bulk-import` - Bulk import from Excel
- `GET /api/assets/export` - Export to Excel

### Transfers
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Initiate transfer
- `POST /api/transfers/:id/approve` - Approve transfer
- `POST /api/transfers/:id/reject` - Reject transfer
- `POST /api/transfers/:id/return` - Record return

## Environment Variables

### Server (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., "7d")
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email configuration
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development, production)
- `CLIENT_URL` - Frontend URL

### Client (.env.local)
- `VITE_API_URL` - Backend API base URL

## Development

### Code Style
- ESLint for linting
- Prettier for formatting

```bash
npm run lint
npm run format
```

### Database Migrations

Create new migration:
```bash
cd server
npx prisma migrate dev --name description_of_change
```

View database:
```bash
npx prisma studio
```

## Testing

### Login Flow
1. Navigate to http://localhost:5173
2. Login with credentials above
3. You'll be redirected to dashboard
4. Explore the sidebar for different sections

### Asset Creation
1. Go to Assets → Add Asset
2. Fill in asset details
3. Submit to create asset with auto-generated asset_id

### Transfer Workflow
1. Go to Transfers → New Transfer
2. Select asset(s) and transfer type
3. Submit to initiate transfer
4. Check email for approval request (or check notifications)
5. Approve/reject as approver

## Deployment

### Build for Production
```bash
npm run build
```

This builds both frontend and backend for production.

### Production Deployment Checklist
- [ ] Set up PostgreSQL database on production server
- [ ] Configure environment variables in .env files
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Build projects: `npm run build`
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Enable HTTPS
- [ ] Setup email service for notifications
- [ ] Configure file storage (S3 or equivalent)
- [ ] Setup monitoring and logging

## Troubleshooting

### Port Already in Use
If port 3000 or 5173 is already in use:
```bash
# Change in client/vite.config.js
# Change in server/.env or use NODE_ENV
```

### Database Connection Error
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in server/.env
3. Verify database `industrial_assets` exists
4. Check PostgreSQL user has proper permissions

### Email Not Sending
1. Verify SMTP credentials in server/.env
2. For Gmail: use App Password, not regular password
3. Check "Less secure app access" settings if using Gmail

### Prisma Issues
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (development only!)
npx prisma migrate reset
```

## Support & Contributing

For issues, feature requests, or contributions, please refer to the project documentation or create an issue on GitHub.

## License

MIT License - See LICENSE file for details
