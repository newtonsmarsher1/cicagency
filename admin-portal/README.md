# Admin Portal - CIC Group

A comprehensive admin portal for managing the CIC Group system, users, payments, withdrawals, and tasks.

## Features

- 📊 **Dashboard**: Real-time statistics and overview of the entire system
- 👥 **User Management**: View and manage all users, their details, payments, and tasks
- 💳 **Payment Tracking**: Monitor all payment transactions with filtering options
- 💰 **Withdrawal Management**: Review and update withdrawal request statuses
- ✅ **Task Management**: Track all completed tasks across the system
- ⚙️ **Settings**: System information and configuration

## Installation

1. Navigate to the admin-portal directory:
```bash
cd admin-portal
```

2. Install dependencies:
```bash
npm install
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The admin portal will run on **http://localhost:2003**

## Usage

1. Open your browser and navigate to `http://localhost:2003`
2. Click the hamburger menu (three lines) in the top-left corner to open the navigation sidebar
3. Navigate between different sections:
   - **Dashboard**: Overview of system statistics
   - **Users**: Manage and view user accounts
   - **Payments**: Track all payment transactions
   - **Withdrawals**: Manage withdrawal requests
   - **Tasks**: View completed tasks
   - **Settings**: System information

## API Endpoints

### Dashboard
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

### Users
- `GET /api/admin/users` - Get all users (with pagination and search)
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user information

### Payments
- `GET /api/admin/payments` - Get all payments (with pagination and status filter)

### Withdrawals
- `GET /api/admin/withdrawals` - Get all withdrawals (with pagination and status filter)
- `PUT /api/admin/withdrawals/:id/status` - Update withdrawal status

### Tasks
- `GET /api/admin/tasks` - Get all tasks (with pagination)

## Features

### Responsive Design
- Mobile-friendly interface
- Sidebar navigation that can be toggled on mobile devices
- Hamburger menu for easy navigation

### Real-time Data
- All data is fetched from the main database
- Automatic updates when viewing different sections

### User Management
- Search users by name or phone number
- View detailed user information including:
  - Personal details
  - Wallet balance and earnings
  - Payment history
  - Task completion history
  - Withdrawal requests

### Payment Tracking
- Filter payments by status (pending, success, failed)
- View payment details including user information
- Track payment amounts and dates

### Withdrawal Management
- Filter withdrawals by status
- Update withdrawal status (pending, approved, rejected, completed)
- Add notes to withdrawal requests

## Database Connection

The admin portal uses the same database configuration as the main backend. Make sure your `.env` file in the project root contains:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cic
DB_USER=your_username
DB_PASSWORD=your_password
```

## Notes

- The admin portal runs on port **2003** (separate from the main application)
- All data is read from the main CIC database
- The portal provides read and update capabilities for system management
- No authentication is currently implemented (consider adding admin authentication for production use)




