# Admin Portal - Setup and Start Instructions

## Prerequisites

1. **Node.js** (version 14 or higher) - [Download here](https://nodejs.org/)
2. **MySQL Server** (version 5.7 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
3. **Database**: The admin portal uses the same database as the main CIC Group application

## Installation Steps

### Step 1: Install Dependencies

Open a terminal/command prompt in the `admin-portal` directory and run:

```bash
cd admin-portal
npm install
```

This will install all required packages:
- express
- mysql2
- bcryptjs
- jsonwebtoken
- cookie-parser
- cors
- dotenv

### Step 2: Configure Database Connection

The admin portal uses the same database configuration as the main backend. Make sure your `.env` file in the project root (not in admin-portal folder) contains:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cic
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key_here
```

**Important**: The `.env` file should be in the root directory (`CIC GROUP/.env`), not in the `admin-portal` folder.

### Step 3: Start the Server

From the `admin-portal` directory, run:

```bash
# For development (with auto-restart on file changes)
npm run dev

# OR for production
npm start
```

The server will start on **port 2003**.

### Step 4: Access the Admin Portal

Open your web browser and navigate to:

```
http://localhost:2003
```

You will see the **Login Page** (this is now the index page).

## Default CEO Account

On first startup, a default CEO account is automatically created:

- **Username**: `ceo`
- **Password**: `CEO@2024`
- **Role**: CEO (can approve other admin registrations)

**⚠️ IMPORTANT**: Change this password immediately after first login!

## First Time Setup

1. **Login as CEO**:
   - Go to `http://localhost:2003`
   - Username: `ceo`
   - Password: `CEO@2024`

2. **Change CEO Password**:
   - Click on "Profile Settings" in the navigation
   - Scroll to "Change Password" section
   - Enter current password and set a new secure password

3. **Register Admin Assistants**:
   - Assistants can register at `http://localhost:2003/register`
   - They will be in "pending" status until approved

4. **Approve Admin Assistants** (CEO Only):
   - Navigate to "Pending Approvals" in the sidebar
   - Review pending registrations
   - Click "Approve" or "Reject" for each registration

## Database Tables Created

The admin portal automatically creates the following table on first run:

- **admin_users**: Stores admin account information
  - id, username, email, password, full_name
  - role (ceo, admin, assistant)
  - status (pending, approved, rejected, suspended)
  - approval tracking (approved_by, approved_at)
  - timestamps (created_at, updated_at, last_login)

## API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Admin login

### Protected Endpoints (Require Authentication)
- `GET /api/auth/profile` - Get admin profile
- `PUT /api/auth/profile` - Update admin profile
- `GET /api/admin/*` - All admin management endpoints

### CEO Only Endpoints
- `GET /api/auth/pending-approvals` - Get pending admin approvals
- `POST /api/auth/approve/:id` - Approve/reject admin registration
- `GET /api/auth/admins` - Get all admins

## Troubleshooting

### Database Connection Error

If you see "Database connection failed":
1. Check MySQL is running
2. Verify `.env` file has correct database credentials
3. Ensure database `cic` exists
4. Check user has proper permissions

### Port Already in Use

If port 2003 is already in use:
1. Stop the other application using port 2003
2. Or change the port in `admin-portal/server.js` (line 13)

### Cannot Login

1. Check if account is approved (only CEO can login initially)
2. Verify username and password are correct
3. Check browser console for errors
4. Ensure JWT_SECRET is set in `.env`

### Default CEO Account Not Created

If default CEO account doesn't exist:
1. Check database connection
2. Verify `admin_users` table was created
3. Manually create CEO account in database if needed

## Security Notes

1. **Change Default Password**: Immediately change the default CEO password
2. **JWT Secret**: Use a strong, random JWT_SECRET in production
3. **HTTPS**: Use HTTPS in production environment
4. **Database Security**: Use strong database passwords
5. **Environment Variables**: Never commit `.env` file to version control

## Development vs Production

### Development Mode
```bash
npm run dev
```
- Uses nodemon for auto-restart
- Better error messages
- Hot reload on file changes

### Production Mode
```bash
npm start
```
- Standard Node.js execution
- Better performance
- No auto-restart

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure database is accessible and tables are created
4. Check that port 2003 is not blocked by firewall

## Next Steps After Setup

1. ✅ Login as CEO
2. ✅ Change CEO password
3. ✅ Register admin assistants
4. ✅ Approve admin assistants
5. ✅ Start managing the system!

---

**Happy Admin Managing! 🚀**

